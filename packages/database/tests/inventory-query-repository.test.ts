import { describe, expect, it, vi } from "vitest";
import { PrismaInventoryQueryRepository } from "../src/index";

const SKU_ID = "22222222-2222-4222-8222-222222222222";
const WAREHOUSE_ID = "33333333-3333-4333-8333-333333333333";
const INVENTORY_ID = "55555555-5555-4555-8555-555555555555";

function row() {
  return {
    available_quantity: "7.0000",
    id: INVENTORY_ID,
    last_counted_at: null,
    last_transaction_at: new Date("2026-07-26T00:00:00.000Z"),
    on_hand_quantity: "10.0000",
    pending_quantity: "1.0000",
    reserved_quantity: "2.0000",
    sku_id: SKU_ID,
    skus: {
      id: SKU_ID,
      product_id: "99999999-9999-4999-8999-999999999999",
      sku_code: "SKU-001",
      sku_name: "4/4 手工小提琴",
      specification: "4/4",
      unit: "piece",
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

describe("PrismaInventoryQueryRepository", () => {
  it("maps inventory rows and applies warehouse scope in the Prisma where clause", async () => {
    const findMany = vi.fn().mockResolvedValue([row()]);
    const repository = new PrismaInventoryQueryRepository({
      inventories: { findMany },
    } as never);

    const result = await repository.list(
      { page: 1, pageSize: 20 },
      {
        actorUserId: "11111111-1111-4111-8111-111111111111",
        allowedWarehouseIds: [WAREHOUSE_ID],
        requestTraceId: "66666666-6666-4666-8666-666666666666",
      },
    );

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { AND: [{ warehouse_id: { in: [WAREHOUSE_ID] } }] },
      }),
    );
    expect(result).toMatchObject({
      items: [
        {
          availableQuantity: "7.0000",
          sku: { skuCode: "SKU-001" },
          warehouse: { warehouseCode: "WH-001" },
        },
      ],
      total: 1,
    });
  });

  it("returns SKU and warehouse summaries from inventory balances", async () => {
    const repository = new PrismaInventoryQueryRepository({
      inventories: { findMany: vi.fn().mockResolvedValue([row()]) },
    } as never);

    await expect(
      repository.summaryBySku(
        SKU_ID,
        { page: 1, pageSize: 20 },
        {
          actorUserId: "11111111-1111-4111-8111-111111111111",
          requestTraceId: "66666666-6666-4666-8666-666666666666",
        },
      ),
    ).resolves.toMatchObject({
      availableQuantity: "7.0000",
      sku: { skuCode: "SKU-001" },
      warehouseCount: 1,
    });
    await expect(
      repository.byWarehouse(
        WAREHOUSE_ID,
        { page: 1, pageSize: 20 },
        {
          actorUserId: "11111111-1111-4111-8111-111111111111",
          requestTraceId: "66666666-6666-4666-8666-666666666666",
        },
      ),
    ).resolves.toMatchObject({
      onHandQuantity: "10.0000",
      skuCount: 1,
      warehouse: { warehouseCode: "WH-001" },
    });
  });
});
