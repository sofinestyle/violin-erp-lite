import { describe, expect, it, vi } from "vitest";
import { PrismaInventoryTransactionRepository } from "../src/index";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const SKU_ID = "22222222-2222-4222-8222-222222222222";
const WAREHOUSE_ID = "33333333-3333-4333-8333-333333333333";
const TRANSACTION_ID = "44444444-4444-4444-8444-444444444444";
const SOURCE_ID = "55555555-5555-4555-8555-555555555555";
const SOURCE_ITEM_ID = "66666666-6666-4666-8666-666666666666";
const TRACE_ID = "77777777-7777-4777-8777-777777777777";

function row() {
  return {
    amount: "100.0000",
    batch_no: "BATCH-001",
    created_at: new Date("2026-07-26T01:00:00.000Z"),
    direction: "in",
    id: TRANSACTION_ID,
    operator_id: USER_ID,
    quantity: "10.0000",
    quantity_after: "10.0000",
    quantity_before: "0.0000",
    related_transaction_id: null,
    remark: "首批入库",
    sku_id: SKU_ID,
    skus: {
      id: SKU_ID,
      product_id: "99999999-9999-4999-8999-999999999999",
      sku_code: "SKU-001",
      sku_name: "4/4 手工小提琴",
      specification: "4/4",
      unit: "piece",
    },
    source_document_id: SOURCE_ID,
    source_document_item_id: SOURCE_ITEM_ID,
    source_document_type: "inbound",
    transaction_at: new Date("2026-07-26T00:00:00.000Z"),
    transaction_no: "ITX-20260726-0001",
    transaction_type: "inbound",
    unit_cost: "10.0000",
    users: {
      display_name: "仓库操作员",
      id: USER_ID,
      username: "warehouse-user",
    },
    warehouse_id: WAREHOUSE_ID,
    warehouses: {
      id: WAREHOUSE_ID,
      warehouse_code: "WH-001",
      warehouse_name: "公司仓",
      warehouse_type: "company",
    },
  };
}

describe("PrismaInventoryTransactionRepository", () => {
  it("maps inventory transaction rows and applies all supported list filters", async () => {
    const findMany = vi.fn().mockResolvedValue([row()]);
    const count = vi.fn().mockResolvedValue(1);
    const repository = new PrismaInventoryTransactionRepository({
      inventory_transactions: { count, findMany },
    } as never);
    const dateFrom = new Date("2026-07-01T00:00:00.000Z");
    const dateTo = new Date("2026-07-31T23:59:59.999Z");

    const result = await repository.list(
      {
        dateFrom,
        dateTo,
        page: 1,
        pageSize: 20,
        skuId: SKU_ID,
        sourceDocumentId: SOURCE_ID,
        sourceDocumentType: "inbound",
        transactionType: "inbound",
        warehouseId: WAREHOUSE_ID,
      },
      {
        actorUserId: USER_ID,
        allowedWarehouseIds: [WAREHOUSE_ID],
        requestTraceId: TRACE_ID,
      },
    );

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: { skus: true, users: true, warehouses: true },
        skip: 0,
        take: 20,
        where: {
          AND: [
            { warehouse_id: { in: [WAREHOUSE_ID] } },
            { sku_id: SKU_ID },
            { warehouse_id: WAREHOUSE_ID },
            { transaction_type: "inbound" },
            { source_document_type: "inbound" },
            { source_document_id: SOURCE_ID },
            { transaction_at: { gte: dateFrom, lte: dateTo } },
          ],
        },
      }),
    );
    expect(count).toHaveBeenCalledWith(expect.objectContaining({ where: expect.any(Object) }));
    expect(result).toMatchObject({
      items: [
        {
          amount: "100.0000",
          operator: { username: "warehouse-user" },
          requestTraceId: TRACE_ID,
          sku: { skuCode: "SKU-001" },
          source: {
            sourceDocumentId: SOURCE_ID,
            sourceDocumentItemId: SOURCE_ITEM_ID,
            sourceDocumentType: "inbound",
          },
          transactionNo: "ITX-20260726-0001",
          unitCost: "10.0000",
          warehouse: { warehouseCode: "WH-001" },
        },
      ],
      total: 1,
    });
  });

  it("uses findFirst with id and warehouse scope for detail", async () => {
    const findFirst = vi.fn().mockResolvedValue(row());
    const repository = new PrismaInventoryTransactionRepository({
      inventory_transactions: { findFirst },
    } as never);

    await expect(
      repository.detail(TRANSACTION_ID, {
        actorUserId: USER_ID,
        allowedWarehouseIds: [WAREHOUSE_ID],
        requestTraceId: TRACE_ID,
      }),
    ).resolves.toMatchObject({
      id: TRANSACTION_ID,
      requestTraceId: TRACE_ID,
    });

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [{ id: TRANSACTION_ID }, { warehouse_id: { in: [WAREHOUSE_ID] } }],
        },
      }),
    );
  });
});
