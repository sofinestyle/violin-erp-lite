import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma, type PrismaClient } from "../src/generated/prisma/client";
import { createDirectPurchaseInbound } from "../src/workflow/purchase-inbound";
import { procurementRows } from "../src/workflow/procurement-state";
vi.mock("../src/workflow/procurement-state", () => ({ procurementRows: vi.fn() }));
const D = (value: number) => new Prisma.Decimal(value);
const payload = {
  documentDate: "2026-09-29",
  purchaseOrderId: "po",
  warehouseId: "wh",
  inspectionPerformed: true,
  inspectorName: "张三",
  items: [
    { purchaseOrderItemId: "line", skuId: "sku", quantity: 10, unitCost: 999, batchNo: "fake" },
  ],
};
const order = {
  id: "po",
  document_no: "PO-UAT",
  status: "purchasing",
  businessStatus: "purchasing",
  supplier_id: "sup",
  purchase_order_items: [
    {
      id: "line",
      sku_id: "sku",
      sku_code_snapshot: "SKU",
      sku_name_snapshot: "商品",
      quantity: D(10),
      inbound_quantity: D(0),
      unit_price: D(300),
    },
  ],
};
function setup(available = true) {
  const client = {
    warehouses: {
      findFirst: vi.fn().mockResolvedValue({ id: "wh", allows_available_stock: available }),
    },
    inbound_orders: {
      create: vi.fn().mockImplementation(async ({ data }) => ({
        ...data,
        id: "inb",
        inbound_order_items: data.inbound_order_items.create.map((line: object) => ({
          ...line,
          id: "il",
        })),
      })),
    },
    inventories: { upsert: vi.fn().mockResolvedValue({ on_hand_quantity: D(10) }) },
    inventory_transactions: { create: vi.fn() },
    purchase_order_items: { update: vi.fn() },
    purchase_orders: { update: vi.fn() },
    document_status_histories: { create: vi.fn() },
  };
  return client;
}
beforeEach(() => {
  vi.mocked(procurementRows).mockResolvedValue([order] as never);
});
describe("CR-013 direct purchase inbound", () => {
  it("inherits authoritative cost, keeps batch null and writes completed stock facts", async () => {
    const client = setup();
    const result = await createDirectPurchaseInbound(
      client as unknown as PrismaClient,
      payload,
      "actor",
    );
    expect(result.status).toBe("completed");
    expect(result.inspection_performed).toBe(true);
    expect(result.inspector_name).toBe("张三");
    expect(Number(result.inbound_order_items[0]!.unit_cost)).toBe(300);
    expect(result.inbound_order_items[0]!.batch_no).toBeNull();
    expect(client.inventory_transactions.create).toHaveBeenCalledTimes(1);
    expect(client.purchase_orders.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "received" }) }),
    );
  });
  it("clears inspector when no inspection and respects non-available warehouse", async () => {
    const client = setup(false);
    const result = await createDirectPurchaseInbound(
      client as unknown as PrismaClient,
      { ...payload, inspectionPerformed: false },
      "actor",
    );
    expect(result.inspector_name).toBeNull();
    const data = client.inventories.upsert.mock.calls[0]![0].create;
    expect(Number(data.available_quantity)).toBe(0);
    expect(Number(data.pending_quantity)).toBe(10);
  });
  it.each([
    ["missing choice", { ...payload, inspectionPerformed: undefined }],
    ["string choice", { ...payload, inspectionPerformed: "false" }],
    ["oversized name", { ...payload, inspectorName: "长".repeat(101) }],
    ["invalid date", { ...payload, documentDate: "2026-02-30" }],
    ["old inspection source", { ...payload, inspectionOrderId: "old" }],
    ["partial", { ...payload, items: [{ ...payload.items[0], quantity: 9 }] }],
    ["over", { ...payload, items: [{ ...payload.items[0], quantity: 11 }] }],
    ["foreign SKU", { ...payload, items: [{ ...payload.items[0], skuId: "other" }] }],
    ["duplicate", { ...payload, items: [payload.items[0], payload.items[0]] }],
    ["empty", { ...payload, items: [] }],
  ])("rejects %s before writing", async (_, input) => {
    const client = setup();
    await expect(
      createDirectPurchaseInbound(client as unknown as PrismaClient, input, "actor"),
    ).rejects.toThrow();
    expect(client.inbound_orders.create).not.toHaveBeenCalled();
  });
  it.each(["pending_approval", "cancelled", "received"])(
    "rejects source state %s",
    async (state) => {
      vi.mocked(procurementRows).mockResolvedValue([{ ...order, businessStatus: state }] as never);
      const client = setup();
      await expect(
        createDirectPurchaseInbound(client as unknown as PrismaClient, payload, "actor"),
      ).rejects.toThrow("仅采购中");
      expect(client.inventories.upsert).not.toHaveBeenCalled();
    },
  );
});
