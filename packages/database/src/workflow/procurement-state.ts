import type { PrismaClient } from "../generated/prisma/client.js";

type Row = Record<string, unknown>;
export type ProcurementState =
  "pending_approval" | "purchasing" | "inspected" | "received" | "cancelled";
export function projectProcurementState(
  order: Row,
  confirmedInspection: boolean,
  confirmedInbound: boolean,
) {
  const items = (order.purchase_order_items ?? []) as Row[];
  const status = String(order.status);
  const quantities = items.map((item) => ({
    ordered: Number(item.quantity),
    inspected: Number(item.inspected_quantity),
    qualified: Number(item.qualified_quantity),
    inbound: Number(item.inbound_quantity),
  }));
  const executed = quantities.some((item) => item.inspected || item.qualified || item.inbound);
  const allInspected =
    quantities.length > 0 &&
    quantities.every(
      (item) =>
        item.ordered > 0 &&
        item.inspected === item.ordered &&
        item.qualified >= 0 &&
        item.qualified <= item.inspected,
    );
  const qualifiedTotal = quantities.reduce((sum, item) => sum + item.qualified, 0);
  const allReceived =
    allInspected &&
    qualifiedTotal > 0 &&
    quantities.every((item) => item.inbound === item.qualified);
  let businessStatus: ProcurementState | null = null;
  if (status === "cancelled" || status === "voided") businessStatus = "cancelled";
  else if (
    ["draft", "rejected", "pending_approval"].includes(status) &&
    !executed &&
    Number(order.paid_amount ?? 0) === 0 &&
    !confirmedInspection &&
    (status !== "pending_approval" ||
      ["pending", "rejected"].includes(String(order.approval_status)))
  )
    businessStatus = "pending_approval";
  else if (["approved", "completed", "purchasing", "inspected", "received"].includes(status)) {
    if (allReceived && confirmedInspection && confirmedInbound) businessStatus = "received";
    else if (allInspected && confirmedInspection && quantities.every((item) => item.inbound === 0))
      businessStatus = "inspected";
    else if (
      !executed &&
      !confirmedInspection &&
      ["approved", "purchasing"].includes(status) &&
      order.approval_status === "approved" &&
      order.approved_by &&
      order.approved_at
    )
      businessStatus = "purchasing";
  }
  return {
    businessStatus,
    legacyReviewRequired: businessStatus === null,
    legacyReviewReason:
      businessStatus === null ? "历史状态与审核、质检或入库事实不一致，请人工复核。" : null,
  };
}

/** Batch-read authoritative confirmation evidence, never rewrite historical states. */
export async function procurementRows(client: PrismaClient, where: Record<string, unknown> = {}) {
  const orders = await client.purchase_orders.findMany({
    where,
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    include: {
      purchase_order_items: { orderBy: { line_no: "asc" } },
      inspection_orders: {
        where: { status: "confirmed" },
        include: { inspection_order_items: true },
      },
    },
  });
  const ids = orders.map((order) => order.id);
  if (!ids.length) return [];
  const inbounds = await client.inbound_orders.findMany({
    where: {
      source_document_type: "purchase_order",
      source_document_id: { in: ids },
      status: "completed",
    },
    include: { inbound_order_items: true },
  });
  const transactions = await client.inventory_transactions.findMany({
    where: {
      source_document_type: "inbound_order",
      source_document_id: { in: inbounds.map((item) => item.id) },
    },
    select: {
      source_document_id: true,
      source_document_item_id: true,
      direction: true,
      quantity: true,
    },
  });
  const [skus, users] = await Promise.all([
    client.skus.findMany({
      where: {
        id: {
          in: [
            ...new Set(
              orders.flatMap((order) => order.purchase_order_items.map((item) => item.sku_id)),
            ),
          ],
        },
      },
      select: {
        id: true,
        size: true,
        color: true,
        products: { select: { product_name: true, product_name_en: true } },
      },
    }),
    client.users.findMany({
      where: {
        id: {
          in: [
            ...new Set(
              orders.flatMap((order) =>
                [order.created_by, order.approved_by].filter((id): id is string => !!id),
              ),
            ),
          ],
        },
      },
      select: { id: true, display_name: true },
    }),
  ]);
  const skuMap = new Map(skus.map((sku) => [sku.id, sku]));
  const userMap = new Map(users.map((user) => [user.id, user.display_name]));
  return orders.map((order) => {
    const confirmedInspection =
      order.purchase_order_items.length > 0 &&
      order.purchase_order_items.every((item) => {
        const matches = order.inspection_orders
          .flatMap((inspection) => inspection.inspection_order_items)
          .filter((line) => line.source_item_id === item.id && line.sku_id === item.sku_id);
        return (
          matches.reduce((sum, line) => sum + Number(line.inspected_quantity), 0) ===
            Number(item.inspected_quantity) &&
          matches.reduce((sum, line) => sum + Number(line.qualified_quantity), 0) ===
            Number(item.qualified_quantity)
        );
      }) &&
      order.inspection_orders.length > 0;
    const sourceInbounds = inbounds.filter((inbound) => inbound.source_document_id === order.id);
    const confirmedInbound =
      sourceInbounds.length > 0 &&
      order.purchase_order_items.every((item) => {
        const lines = sourceInbounds
          .flatMap((inbound) => inbound.inbound_order_items)
          .filter(
            (line) => line.source_document_item_id === item.id && line.sku_id === item.sku_id,
          );
        const lineIds = new Set(lines.map((line) => line.id));
        const quantity = transactions
          .filter(
            (entry) => entry.source_document_item_id && lineIds.has(entry.source_document_item_id),
          )
          .reduce(
            (sum, entry) => sum + (entry.direction === "out" ? -1 : 1) * Number(entry.quantity),
            0,
          );
        return (
          quantity === Number(item.inbound_quantity) &&
          lines.reduce((sum, line) => sum + Number(line.quantity), 0) === quantity
        );
      });
    return {
      ...order,
      purchase_order_items: order.purchase_order_items.map((item) => ({
        ...item,
        product_model: skuMap.get(item.sku_id)?.products?.product_name_en ?? null,
        product_name: skuMap.get(item.sku_id)?.products?.product_name ?? item.sku_name_snapshot,
        size: skuMap.get(item.sku_id)?.size ?? null,
        color: skuMap.get(item.sku_id)?.color ?? null,
      })),
      creator_name: userMap.get(order.created_by) ?? null,
      approver_name: order.approved_by ? (userMap.get(order.approved_by) ?? null) : null,
      ...projectProcurementState(order as unknown as Row, confirmedInspection, confirmedInbound),
    };
  });
}
