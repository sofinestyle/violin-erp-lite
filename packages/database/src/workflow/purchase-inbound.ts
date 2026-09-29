import { ConflictError, ValidationError, type WorkflowPayload } from "@violin-erp/api";
import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "../generated/prisma/client.js";
import { procurementRows } from "./procurement-state.js";

/** Invoked on the locked procurement transaction connection, including required Audit. */
export async function createDirectPurchaseInbound(
  client: PrismaClient,
  payload: WorkflowPayload,
  actor: string,
) {
  if (typeof payload.inspectionPerformed !== "boolean") throw new ValidationError("请选择是否质检");
  if (payload.inspectionOrderId != null)
    throw new ValidationError("采购入库直接选择采购订单，不再选择质检单");
  if (payload.inspectorName != null && typeof payload.inspectorName !== "string")
    throw new ValidationError("质检人须为文字");
  const name = typeof payload.inspectorName === "string" ? payload.inspectorName.trim() : "";
  if (name.length > 100) throw new ValidationError("质检人不能超过 100 个字符");
  const documentDate = String(payload.documentDate);
  const date = new Date(`${documentDate}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(documentDate) ||
    Number.isNaN(date.valueOf()) ||
    date.toISOString().slice(0, 10) !== documentDate
  )
    throw new ValidationError("入库日期无效");
  const [order] = await procurementRows(client, { id: String(payload.purchaseOrderId) });
  if (!order || order.businessStatus !== "purchasing" || order.legacyReviewRequired)
    throw new ConflictError("仅采购中订单允许入库");
  const warehouse = await client.warehouses.findFirst({
    where: { id: String(payload.warehouseId), is_active: true },
  });
  if (!warehouse) throw new ValidationError("目标仓库不存在或已停用");
  if (!Array.isArray(payload.items) || !payload.items.length)
    throw new ValidationError("入库明细不能为空");
  const expected = new Map(
    order.purchase_order_items
      .filter((item) => item.quantity.gt(item.inbound_quantity))
      .map((item) => [item.id, item]),
  );
  const seen = new Set<string>();
  const now = new Date();
  const lines = payload.items.map((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
      throw new ValidationError("入库明细无效");
    const item = raw as Record<string, unknown>;
    const source = expected.get(String(item.purchaseOrderItemId));
    if (!source || seen.has(source.id) || source.sku_id !== item.skuId)
      throw new ValidationError("入库明细必须来自当前采购订单且不得重复");
    let quantity: Prisma.Decimal;
    try {
      quantity = new Prisma.Decimal(String(item.quantity));
    } catch {
      throw new ValidationError("入库数量无效");
    }
    if (
      !quantity.isFinite() ||
      !quantity.gt(0) ||
      !quantity.equals(source.quantity.minus(source.inbound_quantity))
    )
      throw new ValidationError("采购必须整单一次入库，数量须等于全部剩余采购数量");
    seen.add(source.id);
    return {
      line_no: index + 1,
      sku_id: source.sku_id,
      sku_code_snapshot: source.sku_code_snapshot,
      sku_name_snapshot: source.sku_name_snapshot,
      specification_snapshot: source.specification_snapshot,
      source_document_item_id: source.id,
      inspection_order_item_id: null,
      quantity,
      unit_cost: source.unit_price,
      line_cost: quantity.mul(source.unit_price).toDecimalPlaces(4),
      batch_no: null,
      inventory_condition: "normal",
      created_by: actor,
      updated_by: actor,
    };
  });
  if (!expected.size || seen.size !== expected.size)
    throw new ValidationError("采购入库必须覆盖全部待处理明细");
  const number = (prefix: string) =>
    `${prefix}-${documentDate.replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
  const inbound = await client.inbound_orders.create({
    data: {
      created_at: now,
      updated_at: now,
      created_by: actor,
      updated_by: actor,
      document_no: number("INB"),
      document_date: date,
      inbound_type: "purchase",
      status: "completed",
      approval_status: "approved",
      submitted_at: now,
      submitted_by: actor,
      approved_at: now,
      approved_by: actor,
      inbound_completed_at: now,
      version_no: 1,
      warehouse_id: warehouse.id,
      supplier_id: order.supplier_id,
      source_document_type: "purchase_order",
      source_document_id: order.id,
      inspection_order_id: null,
      inspection_performed: payload.inspectionPerformed,
      inspector_name: payload.inspectionPerformed ? name || null : null,
      remark: typeof payload.remark === "string" ? payload.remark : null,
      total_quantity: lines.reduce((sum, line) => sum.plus(line.quantity), new Prisma.Decimal(0)),
      inbound_order_items: { create: lines },
    },
    include: { inbound_order_items: true },
  });
  // Stable SKU order avoids lock inversions when different purchase orders share stock.
  for (const line of [...inbound.inbound_order_items].sort((a, b) =>
    a.sku_id.localeCompare(b.sku_id),
  )) {
    const available = warehouse.allows_available_stock ? line.quantity : new Prisma.Decimal(0);
    const pending = warehouse.allows_available_stock ? new Prisma.Decimal(0) : line.quantity;
    const inventory = await client.inventories.upsert({
      where: { sku_id_warehouse_id: { sku_id: line.sku_id, warehouse_id: warehouse.id } },
      create: {
        sku_id: line.sku_id,
        warehouse_id: warehouse.id,
        on_hand_quantity: line.quantity,
        available_quantity: available,
        pending_quantity: pending,
        reserved_quantity: 0,
        created_by: actor,
        updated_by: actor,
        last_transaction_at: now,
      },
      update: {
        on_hand_quantity: { increment: line.quantity },
        available_quantity: { increment: available },
        pending_quantity: { increment: pending },
        updated_by: actor,
        last_transaction_at: now,
      },
    });
    await client.inventory_transactions.create({
      data: {
        transaction_no: number("ITX"),
        transaction_type: "purchase",
        direction: "in",
        transaction_at: now,
        operator_id: actor,
        sku_id: line.sku_id,
        warehouse_id: warehouse.id,
        quantity: line.quantity,
        quantity_before: inventory.on_hand_quantity.minus(line.quantity),
        quantity_after: inventory.on_hand_quantity,
        unit_cost: line.unit_cost,
        amount: line.line_cost,
        batch_no: null,
        source_document_type: "inbound_order",
        source_document_id: inbound.id,
        source_document_item_id: line.id,
      },
    });
    await client.purchase_order_items.update({
      where: { id: line.source_document_item_id },
      data: {
        inbound_quantity: { increment: line.quantity },
        received_quantity: { increment: line.quantity },
        updated_by: actor,
      },
    });
  }
  await client.purchase_orders.update({
    where: { id: order.id },
    data: { status: "received", updated_by: actor, version_no: { increment: 1 } },
  });
  for (const event of [
    {
      object_id: order.id,
      object_no_snapshot: order.document_no,
      object_type: "purchase",
      from_status: order.status,
      to_status: "received",
    },
    {
      object_id: inbound.id,
      object_no_snapshot: inbound.document_no,
      object_type: "inbound",
      from_status: null,
      to_status: "completed",
    },
  ])
    await client.document_status_histories.create({
      data: { ...event, changed_by: actor, changed_at: now, change_reason: "采购入库一次确认完成" },
    });
  return inbound;
}
