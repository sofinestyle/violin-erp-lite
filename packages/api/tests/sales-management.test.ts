import { describe, expect, it, vi } from "vitest";
import {
  parseSalesListQuery,
  SalesManagementService,
  type AuthenticationContext,
  type SalesAccessScope,
  type SalesManagementRepository,
} from "../src/index";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const PLATFORM_ID = "22222222-2222-4222-8222-222222222222";
const STORE_ID = "33333333-3333-4333-8333-333333333333";
const WAREHOUSE_ID = "44444444-4444-4444-8444-444444444444";
const SKU_ID = "55555555-5555-4555-8555-555555555555";
const context = {
  requestId: "66666666-6666-4666-8666-666666666666",
  requestTraceId: "66666666-6666-4666-8666-666666666666",
  timestamp: "2026-07-26T00:00:00.000Z",
};

function authentication(
  permissions: readonly string[] = [
    "outbound.order.read",
    "outbound.sales-return.read",
    "inventory.transaction.read",
    "master.platform.read",
    "master.store.read",
  ],
): AuthenticationContext {
  return {
    user: {
      dataScopes: ["store", "warehouse"],
      permissionCodes: permissions as AuthenticationContext["user"]["permissionCodes"],
      roleCodes: ["sales_staff"],
      storeScopes: [{ accessLevel: "read", targetId: STORE_ID }],
      userId: USER_ID,
      username: "sales-user",
      warehouseScopes: [{ accessLevel: "read", targetId: WAREHOUSE_ID }],
    },
  };
}

function repository(): SalesManagementRepository {
  return {
    platformView: vi.fn(async () => ({
      items: [
        {
          customerName: "张三",
          documentDate: "2026-07-26T00:00:00.000Z",
          documentNo: "OUT-001",
          externalOrderNo: "TM-001",
          id: "77777777-7777-4777-8777-777777777777",
          platform: { id: PLATFORM_ID, name: "天猫" },
          sku: { id: SKU_ID, skuCode: "SKU-001", skuName: "小提琴" },
          soldQuantity: "2.0000",
          store: { id: STORE_ID, name: "旗舰店" },
          warehouseId: WAREHOUSE_ID,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    })),
    statistics: vi.fn(async () => ({
      netQuantity: "1.0000",
      platformSales: [
        {
          amount: "200.0000",
          cost: "120.0000",
          platform: { id: PLATFORM_ID, name: "天猫" },
          returnQuantity: "1.0000",
          soldQuantity: "2.0000",
          transactionQuantity: "2.0000",
        },
      ],
      skuRanking: [],
      storeSales: [],
      totalReturnQuantity: "1.0000",
      totalSoldQuantity: "2.0000",
    })),
    storeView: vi.fn(async () => ({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
    })),
  };
}

describe("Sales Management limited MVP service", () => {
  it("parses approved reused filters without introducing SALES-* API contracts", () => {
    expect(
      parseSalesListQuery(
        new URLSearchParams(
          `page=2&pageSize=50&platformId=${PLATFORM_ID}&storeId=${STORE_ID}&warehouseId=${WAREHOUSE_ID}&skuId=${SKU_ID}&dateFrom=2026-07-01&dateTo=2026-07-31`,
        ),
      ),
    ).toMatchObject({
      page: 2,
      pageSize: 50,
      platformId: PLATFORM_ID,
      skuId: SKU_ID,
      storeId: STORE_ID,
      warehouseId: WAREHOUSE_ID,
    });
    expect(() => parseSalesListQuery(new URLSearchParams("pageSize=101"))).toThrowError(
      expect.objectContaining({ code: "VALIDATION_INVALID_FIELD" }),
    );
  });

  it("returns platform view with store and warehouse scope", async () => {
    const repo = repository();
    const service = new SalesManagementService(repo);
    const result = await service.platformView(
      parseSalesListQuery(new URLSearchParams()),
      authentication(),
      context,
    );

    expect(result.items[0]).not.toHaveProperty("customerName");
    expect(repo.platformView).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining<SalesAccessScope>({
        actorUserId: USER_ID,
        allowedStoreIds: [STORE_ID],
        allowedWarehouseIds: [WAREHOUSE_ID],
        canViewPersonalData: false,
        requestTraceId: context.requestTraceId,
      }),
    );
  });

  it("requires existing outbound and master permissions instead of sales.*", async () => {
    const service = new SalesManagementService(repository());
    await expect(
      service.platformView(parseSalesListQuery(new URLSearchParams()), authentication([]), context),
    ).rejects.toMatchObject({ code: "PERMISSION_FORBIDDEN" });
  });

  it("hides amount and cost in sales statistics without field permissions", async () => {
    const service = new SalesManagementService(repository());
    const result = await service.statistics(
      parseSalesListQuery(new URLSearchParams()),
      authentication(),
      context,
    );
    expect(result.platformSales[0]).not.toHaveProperty("amount");
    expect(result.platformSales[0]).not.toHaveProperty("cost");

    const visible = await service.statistics(
      parseSalesListQuery(new URLSearchParams()),
      authentication([
        "outbound.order.read",
        "outbound.sales-return.read",
        "inventory.transaction.read",
        "master.platform.read",
        "master.store.read",
        "field.amount.read",
        "field.cost.read",
      ]),
      context,
    );
    expect(visible.platformSales[0]).toMatchObject({ amount: "200.0000", cost: "120.0000" });
  });
});
