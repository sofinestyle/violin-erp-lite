import { describe, expect, it, vi } from "vitest";
import { PrismaSalesManagementRepository } from "../src/index";
import type { PrismaClient } from "../src/generated/prisma/client";

const PLATFORM_ID = "11111111-1111-4111-8111-111111111111";
const STORE_ID = "22222222-2222-4222-8222-222222222222";
const WAREHOUSE_ID = "33333333-3333-4333-8333-333333333333";
const SKU_ID = "44444444-4444-4444-8444-444444444444";
const OUTBOUND_ID = "55555555-5555-4555-8555-555555555555";
const OUTBOUND_ITEM_ID = "66666666-6666-4666-8666-666666666666";

const access = {
  actorUserId: "77777777-7777-4777-8777-777777777777",
  allowedStoreIds: [STORE_ID],
  allowedWarehouseIds: [WAREHOUSE_ID],
  canViewAmount: true,
  canViewCost: true,
  canViewPersonalData: true,
  requestTraceId: "88888888-8888-4888-8888-888888888888",
};

const query = {
  page: 1,
  pageSize: 20,
  platformId: PLATFORM_ID,
  storeId: STORE_ID,
  warehouseId: WAREHOUSE_ID,
};

function outboundRow() {
  return {
    customer_name: "张三",
    document_date: new Date("2026-07-26T00:00:00.000Z"),
    document_no: "OUT-001",
    ecommerce_platforms: { id: PLATFORM_ID, platform_name: "天猫" },
    external_order_no: "TM-001",
    id: OUTBOUND_ID,
    outbound_order_items: [
      {
        id: OUTBOUND_ITEM_ID,
        line_cost: 120,
        quantity: 2,
        sku_code_snapshot: "SKU-001",
        sku_id: SKU_ID,
        sku_name_snapshot: "小提琴",
        specification_snapshot: "4/4",
      },
    ],
    store_id: STORE_ID,
    stores: { id: STORE_ID, store_name: "旗舰店" },
    warehouse_id: WAREHOUSE_ID,
  };
}

describe("PrismaSalesManagementRepository", () => {
  it("builds platform and store sales views from outbound records without platform orders", async () => {
    const findMany = vi.fn().mockResolvedValue([outboundRow()]);
    const repository = new PrismaSalesManagementRepository({
      outbound_orders: { findMany },
    } as unknown as PrismaClient);

    const result = await repository.platformView(query, access);

    expect(result.items[0]).toMatchObject({
      customerName: "张三",
      externalOrderNo: "TM-001",
      platform: { id: PLATFORM_ID, name: "天猫" },
      sku: { id: SKU_ID, skuCode: "SKU-001" },
      soldQuantity: "2.0000",
      store: { id: STORE_ID, name: "旗舰店" },
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: expect.arrayContaining([
            { outbound_type: "domestic_sales" },
            { status: "completed" },
            { platform_id: PLATFORM_ID },
            { store_id: STORE_ID },
            { warehouse_id: WAREHOUSE_ID },
          ]),
        },
      }),
    );
  });

  it("aggregates sales statistics from confirmed outbound, returns and inventory transactions", async () => {
    const repository = new PrismaSalesManagementRepository({
      inventory_transactions: {
        findMany: vi.fn().mockResolvedValue([
          {
            direction: "out",
            quantity: 2,
            source_document_id: OUTBOUND_ID,
            source_document_item_id: OUTBOUND_ITEM_ID,
            source_document_type: "outbound_order",
          },
        ]),
      },
      outbound_orders: { findMany: vi.fn().mockResolvedValue([outboundRow()]) },
      sales_returns: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "99999999-9999-4999-8999-999999999999",
            sales_return_items: [
              {
                outbound_order_items: { sku_code_snapshot: "SKU-001" },
                quantity: 1,
                returned_quantity: 1,
                sku_id: SKU_ID,
              },
            ],
            stores: { id: STORE_ID, store_name: "旗舰店" },
          },
        ]),
      },
    } as unknown as PrismaClient);

    const result = await repository.statistics(query, access);

    expect(result).toMatchObject({
      netQuantity: "1.0000",
      totalReturnQuantity: "1.0000",
      totalSoldQuantity: "2.0000",
    });
    expect(result.platformSales[0]).toMatchObject({
      cost: "120.0000",
      platform: { id: PLATFORM_ID, name: "天猫" },
      soldQuantity: "2.0000",
      transactionQuantity: "2.0000",
    });
    expect(result.storeSales[0]).toMatchObject({
      returnQuantity: "1.0000",
      soldQuantity: "2.0000",
      store: { id: STORE_ID, name: "旗舰店" },
    });
    expect(result.skuRanking[0]).toMatchObject({
      returnQuantity: "1.0000",
      soldQuantity: "2.0000",
      sku: { id: SKU_ID },
    });
  });
});
