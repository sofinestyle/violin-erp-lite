import {
  assertPurchaseDeleteState,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  type WorkflowRepository,
} from "@violin-erp/api";
import { PrismaAuditWriter } from "../audit/prisma-audit-writer.js";
import { Prisma, type PrismaClient } from "../generated/prisma/client.js";

const referenced = () => new ConflictError("该采购订单已产生后续业务记录，无法删除。");

export function purchaseDelete(
  client: PrismaClient,
): NonNullable<WorkflowRepository["deletePurchase"]> {
  return async (id, actor, audit) => {
    if (!actor.permissionCodes.includes("purchase.order.cancel")) throw new ForbiddenError();
    try {
      return await client.$transaction(async (tx) => {
        await tx.$queryRaw(
          Prisma.sql`SELECT id FROM purchase_orders WHERE id = ${id}::uuid FOR UPDATE`,
        );
        const order = await tx.purchase_orders.findUnique({
          where: { id },
          include: { purchase_order_items: true },
        });
        if (
          !order ||
          (!actor.dataScopes.includes("all") &&
            !(actor.dataScopes.includes("self_created") && order.created_by === actor.userId))
        ) {
          throw new NotFoundError();
        }
        assertPurchaseDeleteState(
          { ...order, documentNo: order.document_no },
          actor.roleCodes.includes("administrator"),
        );
        const itemIds = order.purchase_order_items.map((item) => item.id);
        const sources = { source_document_id: id };
        const counts = await Promise.all([
          tx.purchase_payments.count({ where: { purchase_order_id: id } }),
          tx.purchase_returns.count({ where: { purchase_order_id: id } }),
          tx.purchase_return_items.count({ where: { purchase_order_item_id: { in: itemIds } } }),
          tx.inspection_orders.count({ where: { purchase_order_id: id } }),
          tx.inbound_orders.count({ where: sources }),
          tx.inventory_transactions.count({
            where: { OR: [sources, { source_document_item_id: { in: itemIds } }] },
          }),
          tx.damage_reports.count({ where: sources }),
          tx.attachment_links.count({
            where: { OR: [{ object_id: id }, { object_item_id: { in: itemIds } }] },
          }),
          tx.approval_records.count({ where: { object_id: id } }),
        ]);
        const executed = order.purchase_order_items.some((item) =>
          [
            item.received_quantity,
            item.inspected_quantity,
            item.qualified_quantity,
            item.inbound_quantity,
            item.returned_quantity,
          ].some((value) => !value.isZero()),
        );
        if (counts.some((count) => count > 0) || executed || !order.paid_amount.isZero())
          throw referenced();
        await tx.purchase_orders.delete({ where: { id } });
        await audit(
          new PrismaAuditWriter(tx),
          JSON.parse(JSON.stringify(order)) as Record<string, unknown>,
        );
        return { id, deleted: true as const };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003")
        throw referenced();
      throw error;
    }
  };
}
