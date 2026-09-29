/** CR-014: derive display state from inbound evidence; never rename stored history in bulk. */
export type ProductionBusinessStatus =
  "in_production" | "partially_received" | "received" | "cancelled";
export type ProductionQuantityEvidence = Readonly<{
  planned: number;
  inbound: number;
  confirmedInbound: number;
  ledgerInbound: number;
}>;

export function deriveProductionState(
  status: string,
  items: readonly ProductionQuantityEvidence[],
) {
  const invalid =
    !items.length ||
    items.some(
      (item) =>
        ![item.planned, item.inbound, item.confirmedInbound, item.ledgerInbound].every(
          Number.isFinite,
        ) ||
        item.planned <= 0 ||
        item.inbound < 0 ||
        item.inbound > item.planned ||
        Math.abs(item.inbound - item.confirmedInbound) > 0.00001 ||
        Math.abs(item.inbound - item.ledgerInbound) > 0.00001,
    );
  const total = items.reduce((sum, item) => sum + item.inbound, 0);
  const cancelled = ["cancelled", "voided"].includes(status);
  const legacyReviewRequired =
    invalid ||
    (cancelled && total > 0) ||
    ![
      "in_production",
      "partially_received",
      "received",
      "approved",
      "partially_completed",
      "completed",
      "cancelled",
      "voided",
    ].includes(status);
  const businessStatus: ProductionBusinessStatus = cancelled
    ? "cancelled"
    : items.length > 0 && items.every((item) => item.inbound === item.planned)
      ? "received"
      : total > 0
        ? "partially_received"
        : "in_production";
  return {
    businessStatus: legacyReviewRequired ? null : businessStatus,
    legacyReviewRequired,
    legacyReviewReason: legacyReviewRequired
      ? "历史数据待复核：状态、累计入库或库存流水证据不一致。"
      : null,
  };
}

import type { PrismaClient } from "../generated/prisma/client.js";

export async function productionRows(client: PrismaClient, where: Record<string, unknown> = {}) {
  const orders = await client.production_orders.findMany({
    where,
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    include: {
      users_production_orders_created_byTousers: { select: { display_name: true } },
      production_order_items: {
        orderBy: { line_no: "asc" },
        include: { skus: { include: { products: true } } },
      },
    },
  });
  if (!orders.length) return [];
  const inbounds = await client.inbound_orders.findMany({
    where: {
      source_document_type: "production_order",
      source_document_id: { in: orders.map((o) => o.id) },
      status: "completed",
    },
    include: { inbound_order_items: true, warehouses: true },
  });
  const ledger = await client.inventory_transactions.findMany({
    where: {
      source_document_type: "inbound_order",
      source_document_id: { in: inbounds.map((i) => i.id) },
    },
  });
  return orders.map((order) => {
    const records = inbounds.filter((i) => i.source_document_id === order.id);
    const lines = records.flatMap((i) => i.inbound_order_items);
    const evidence = order.production_order_items.map((item) => {
      const own = lines.filter((i) => i.source_document_item_id === item.id);
      const ownIds = new Set(own.map((i) => i.id));
      return {
        planned: Number(item.planned_quantity),
        inbound: Number(item.inbound_quantity),
        confirmedInbound: own.reduce((s, i) => s + Number(i.quantity), 0),
        ledgerInbound: ledger
          .filter((t) => t.source_document_item_id && ownIds.has(t.source_document_item_id))
          .reduce((s, t) => s + (t.direction === "in" ? 1 : -1) * Number(t.quantity), 0),
      };
    });
    return {
      ...order,
      created_by_name: order.users_production_orders_created_byTousers.display_name,
      ...deriveProductionState(order.status, evidence),
      production_order_items: order.production_order_items.map(({ skus, ...item }) => ({
        ...item,
        product_model: skus.products.product_name_en,
        product_name: skus.products.product_name,
        size: skus.size,
        color: skus.color,
      })),
      inbound_records: records.map(({ warehouses, ...item }) => ({
        ...item,
        warehouse_name: warehouses.warehouse_name,
      })),
    };
  });
}
