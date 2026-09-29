import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  type AuthenticatedUser,
  type AuditWriter,
  type WorkflowCommand,
} from "@violin-erp/api";
import type { PrismaClient } from "../generated/prisma/client.js";
import { PrismaAuditWriter } from "../audit/prisma-audit-writer.js";
import { productionRows } from "./production-state.js";

export async function productionTransaction(
  client: PrismaClient,
  command: WorkflowCommand,
  actor: AuthenticatedUser,
  execute: (tx: PrismaClient) => Promise<unknown>,
  audit: (writer: AuditWriter, result: unknown) => Promise<void>,
) {
  if (command.resource === "production-progress" || command.resource === "production-completion")
    throw new ConflictError("生产进度和完工流程已停止写入，历史记录保留查询。");
  if (command.resource === "inspection")
    throw new ConflictError("独立质检已停止写入，请在入库记录是否质检。");
  let sourceId: string | undefined;
  let warehouseId: string | undefined;
  if (command.resource === "production") sourceId = command.entityId;
  else if (command.resource === "inbound" && command.action === "create-production") {
    sourceId = String(command.payload.productionOrderId);
    warehouseId = String(command.payload.warehouseId);
  } else if (command.resource === "inbound" && command.entityId) {
    const target = await client.inbound_orders.findUnique({ where: { id: command.entityId } });
    if (target?.source_document_type === "production_order")
      throw new ConflictError("成品入库一次保存完成，历史单据只读。");
    return null;
  } else return null;
  return client.$transaction(
    async (tx) => {
      if (sourceId) {
        await tx.$queryRawUnsafe(
          "SELECT id FROM production_orders WHERE id = $1::uuid FOR UPDATE",
          sourceId,
        );
        const [order] = await productionRows(tx as PrismaClient, { id: sourceId });
        if (
          !order ||
          !(
            actor.dataScopes.includes("all") ||
            (actor.dataScopes.includes("self_created") && order.created_by === actor.userId)
          )
        )
          throw new NotFoundError("生产来源不存在或不可访问");
        if (order.legacyReviewRequired) throw new ConflictError("历史数据待复核，只允许查看。");
        if (command.resource === "production" && command.action !== "cancel")
          throw new ConflictError("生产订单保存后直接生产中，不再执行中间审核或修改动作。");
        if (
          command.action === "cancel" &&
          order.production_order_items.some((i) => i.inbound_quantity.gt(0))
        )
          throw new ConflictError("已有入库记录，不能取消生产订单。");
      }
      if (
        warehouseId &&
        !actor.dataScopes.includes("all") &&
        !actor.warehouseScopes?.some(
          (s) => s.targetId === warehouseId && ["operate", "manage"].includes(s.accessLevel),
        )
      )
        throw new ForbiddenError("没有目标仓库操作范围");
      const result = await execute(tx as PrismaClient);
      await audit(new PrismaAuditWriter(tx), result);
      return { result };
    },
    { timeout: 15000 },
  );
}
