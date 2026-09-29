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
import { procurementRows } from "./procurement-state.js";

export async function procurementTransaction(
  client: PrismaClient,
  command: WorkflowCommand,
  actor: AuthenticatedUser,
  execute: (transaction: PrismaClient) => Promise<unknown>,
  audit: (writer: AuditWriter, result: unknown) => Promise<void>,
): Promise<{ result: unknown } | null> {
  let sourceId: string | undefined;
  let targetId: string | undefined;
  let warehouseId: string | undefined;
  if (command.resource === "purchase") sourceId = command.entityId;
  else if (command.resource === "purchase-payment") sourceId = command.parentId;
  else if (command.resource === "inspection") {
    if (command.action === "create") {
      if (command.payload.sourceType !== "purchase") return null;
      sourceId = String(command.payload.purchaseOrderId);
    } else {
      if (!command.entityId) throw new NotFoundError("缺少质检单标识");
      const target = await client.inspection_orders.findUnique({ where: { id: command.entityId } });
      if (!target || target.source_type !== "purchase") return null;
      sourceId = target.purchase_order_id!;
      targetId = target.id;
    }
  } else if (command.resource === "inbound") {
    if (command.action === "create-purchase") {
      sourceId = String(command.payload.purchaseOrderId);
      warehouseId = String(command.payload.warehouseId);
    } else if (command.action === "create-production") return null;
    else {
      if (!command.entityId) throw new NotFoundError("缺少入库单标识");
      const target = await client.inbound_orders.findUnique({ where: { id: command.entityId } });
      if (!target || target.source_document_type !== "purchase_order") return null;
      sourceId = target.source_document_id!;
      targetId = target.id;
      warehouseId =
        typeof command.payload.warehouseId === "string"
          ? command.payload.warehouseId
          : target.warehouse_id;
    }
  } else return null;
  if (command.resource === "purchase-payment" || command.resource === "inspection")
    throw new ConflictError("采购付款及独立采购质检已停止写入，历史记录仅供查询。");
  if (command.resource === "inbound" && command.action !== "create-purchase")
    throw new ConflictError("采购入库已合并为一次确认保存，历史入库单仅供查询。");
  return client.$transaction(
    async (tx) => {
      if (sourceId) {
        await tx.$queryRawUnsafe(
          "SELECT id FROM purchase_orders WHERE id = $1::uuid FOR UPDATE",
          sourceId,
        );
        const [source] = await procurementRows(tx as PrismaClient, { id: sourceId });
        if (
          !source ||
          !(
            actor.dataScopes.includes("all") ||
            (actor.dataScopes.includes("self_created") && source.created_by === actor.userId)
          )
        )
          throw new NotFoundError("采购来源不存在或不可访问");
        if (source.legacyReviewRequired)
          throw new ConflictError("历史数据待复核，当前订单只允许查看。");
      }
      if (targetId) {
        const table = command.resource === "inspection" ? "inspection_orders" : "inbound_orders";
        await tx.$queryRawUnsafe(
          `SELECT id FROM ${table} WHERE id = $1::uuid FOR UPDATE`,
          targetId,
        );
      }
      if (
        warehouseId &&
        !actor.dataScopes.includes("all") &&
        !actor.warehouseScopes?.some(
          (scope) =>
            scope.targetId === warehouseId && ["operate", "manage"].includes(scope.accessLevel),
        )
      )
        throw new ForbiddenError("没有目标仓库操作范围");
      // Existing helpers may request nested transactions; they must stay on this connection.
      const adapter = new Proxy(tx, {
        get(target, property) {
          if (property === "$transaction")
            return (work: (transaction: unknown) => unknown) => work(adapter);
          return Reflect.get(target, property);
        },
      });
      const result = await execute(adapter as PrismaClient);
      await audit(new PrismaAuditWriter(tx), result);
      return { result };
    },
    { timeout: 15000 },
  );
}
