import { describe, expect, it, vi } from "vitest";
import {
  InventoryQueryService,
  parseInventoryListQuery,
  type AuthenticationContext,
  type InventoryAccessScope,
  type InventoryBalanceRecord,
  type InventoryListQuery,
  type InventoryQueryRepository,
} from "../src/index";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const SKU_ID = "22222222-2222-4222-8222-222222222222";
const WAREHOUSE_ID = "33333333-3333-4333-8333-333333333333";
const OTHER_WAREHOUSE_ID = "44444444-4444-4444-8444-444444444444";
const INVENTORY_ID = "55555555-5555-4555-8555-555555555555";

const context = {
  requestId: "66666666-6666-4666-8666-666666666666",
  requestTraceId: "66666666-6666-4666-8666-666666666666",
  timestamp: "2026-07-26T00:00:00.000Z",
};

function authentication(
  permissions = ["inventory.stock.read", "master.sku.read", "master.warehouse.read"],
  warehouseIds: readonly string[] = [WAREHOUSE_ID],
): AuthenticationContext {
  return {
    user: {
      dataScopes: warehouseIds.length > 0 ? ["warehouse"] : [],
      permissionCodes: permissions as AuthenticationContext["user"]["permissionCodes"],
      roleCodes: ["warehouse_staff"],
      userId: USER_ID,
      username: "warehouse-user",
      warehouseScopes: warehouseIds.map((targetId) => ({ accessLevel: "read", targetId })),
    },
  };
}

function inventory(overrides: Partial<InventoryBalanceRecord> = {}): InventoryBalanceRecord {
  return {
    availableQuantity: "7.0000",
    id: INVENTORY_ID,
    inventoryStatus: "available",
    lastCountedAt: null,
    lastTransactionAt: "2026-07-26T00:00:00.000Z",
    onHandQuantity: "10.0000",
    pendingQuantity: "1.0000",
    recentTransactionsPath: "/api/v1/inventory-transactions",
    reservedQuantity: "2.0000",
    sku: {
      id: SKU_ID,
      skuCode: "SKU-001",
      skuName: "4/4 手工小提琴",
      unit: "piece",
    },
    warehouse: {
      id: WAREHOUSE_ID,
      warehouseCode: "WH-001",
      warehouseName: "公司仓",
      warehouseType: "company",
    },
    ...overrides,
  };
}

function repository(
  records: readonly InventoryBalanceRecord[] = [inventory()],
): InventoryQueryRepository {
  return {
    byWarehouse: vi.fn(async (warehouseId: string) => {
      const rows = records.filter((item) => item.warehouse.id === warehouseId);
      if (rows.length === 0) return null;
      return {
        availableQuantity: rows
          .reduce((sum, item) => sum + Number(item.availableQuantity), 0)
          .toFixed(4),
        inventoryCount: rows.length,
        onHandQuantity: rows.reduce((sum, item) => sum + Number(item.onHandQuantity), 0).toFixed(4),
        pendingQuantity: rows
          .reduce((sum, item) => sum + Number(item.pendingQuantity), 0)
          .toFixed(4),
        reservedQuantity: rows
          .reduce((sum, item) => sum + Number(item.reservedQuantity), 0)
          .toFixed(4),
        skuCount: new Set(rows.map((item) => item.sku.id)).size,
        statusCounts: {
          normalStockCount: rows.filter((item) => item.inventoryStatus === "available").length,
          pendingStockCount: rows.filter((item) => item.inventoryStatus === "pending").length,
          unavailableStockCount: rows.filter((item) => item.inventoryStatus === "unavailable")
            .length,
          zeroStockCount: rows.filter((item) => item.inventoryStatus === "zero").length,
        },
        warehouse: rows[0]!.warehouse,
        warehouseCount: 1,
      };
    }),
    detail: vi.fn(async (id: string) => records.find((item) => item.id === id) ?? null),
    list: vi.fn(async (query: InventoryListQuery, access: InventoryAccessScope) => {
      const allowed = access.allowedWarehouseIds;
      const filtered = records.filter((item) => {
        if (allowed !== undefined && !allowed.includes(item.warehouse.id)) return false;
        if (query.skuId && item.sku.id !== query.skuId) return false;
        if (query.warehouseId && item.warehouse.id !== query.warehouseId) return false;
        return true;
      });
      return {
        items: filtered,
        page: query.page,
        pageSize: query.pageSize,
        total: filtered.length,
        totalPages: 1,
      };
    }),
    summary: vi.fn(async () => {
      return {
        availableQuantity: records
          .reduce((sum, item) => sum + Number(item.availableQuantity), 0)
          .toFixed(4),
        inventoryAmount: "1200.0000",
        inventoryCount: records.length,
        onHandQuantity: records
          .reduce((sum, item) => sum + Number(item.onHandQuantity), 0)
          .toFixed(4),
        pendingQuantity: records
          .reduce((sum, item) => sum + Number(item.pendingQuantity), 0)
          .toFixed(4),
        reservedQuantity: records
          .reduce((sum, item) => sum + Number(item.reservedQuantity), 0)
          .toFixed(4),
        skuCount: new Set(records.map((item) => item.sku.id)).size,
        statusCounts: {
          normalStockCount: records.filter((item) => item.inventoryStatus === "available").length,
          pendingStockCount: records.filter((item) => item.inventoryStatus === "pending").length,
          unavailableStockCount: records.filter((item) => item.inventoryStatus === "unavailable")
            .length,
          zeroStockCount: records.filter((item) => item.inventoryStatus === "zero").length,
        },
        warehouseCount: new Set(records.map((item) => item.warehouse.id)).size,
      };
    }),
    summaryBySku: vi.fn(async (skuId: string) => {
      const rows = records.filter((item) => item.sku.id === skuId);
      if (rows.length === 0) return null;
      return {
        availableQuantity: rows
          .reduce((sum, item) => sum + Number(item.availableQuantity), 0)
          .toFixed(4),
        inventoryCount: rows.length,
        onHandQuantity: rows.reduce((sum, item) => sum + Number(item.onHandQuantity), 0).toFixed(4),
        pendingQuantity: rows
          .reduce((sum, item) => sum + Number(item.pendingQuantity), 0)
          .toFixed(4),
        reservedQuantity: rows
          .reduce((sum, item) => sum + Number(item.reservedQuantity), 0)
          .toFixed(4),
        sku: rows[0]!.sku,
        skuCount: 1,
        statusCounts: {
          normalStockCount: rows.filter((item) => item.inventoryStatus === "available").length,
          pendingStockCount: rows.filter((item) => item.inventoryStatus === "pending").length,
          unavailableStockCount: rows.filter((item) => item.inventoryStatus === "unavailable")
            .length,
          zeroStockCount: rows.filter((item) => item.inventoryStatus === "zero").length,
        },
        warehouseCount: new Set(rows.map((item) => item.warehouse.id)).size,
        warehouses: rows,
      };
    }),
  };
}

describe("Inventory Query module", () => {
  it("parses approved INV-002 list filters and pagination", () => {
    expect(
      parseInventoryListQuery(
        new URLSearchParams(`page=2&pageSize=50&skuId=${SKU_ID}&warehouseId=${WAREHOUSE_ID}`),
      ),
    ).toMatchObject({ page: 2, pageSize: 50, skuId: SKU_ID, warehouseId: WAREHOUSE_ID });
    expect(() => parseInventoryListQuery(new URLSearchParams("pageSize=101"))).toThrowError(
      expect.objectContaining({ code: "VALIDATION_INVALID_FIELD" }),
    );
  });

  it("returns paginated current inventory list through warehouse scope", async () => {
    const store = repository([
      inventory(),
      inventory({
        id: "77777777-7777-4777-8777-777777777777",
        warehouse: {
          id: OTHER_WAREHOUSE_ID,
          warehouseCode: "WH-002",
          warehouseName: "海外仓",
          warehouseType: "overseas",
        },
      }),
    ]);
    const service = new InventoryQueryService(store);
    const result = await service.list(
      parseInventoryListQuery(new URLSearchParams()),
      authentication(),
      context,
    );

    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      availableQuantity: "7.0000",
      recentTransactionsPath: `/api/v1/inventory-transactions?skuId=${SKU_ID}&warehouseId=${WAREHOUSE_ID}`,
    });
    expect(store.list).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        actorUserId: USER_ID,
        allowedWarehouseIds: [WAREHOUSE_ID],
        requestTraceId: context.requestTraceId,
      }),
    );
  });

  it("returns SKU inventory summary from inventories without a summary table", async () => {
    const service = new InventoryQueryService(repository());
    await expect(
      service.summaryBySku(
        SKU_ID,
        parseInventoryListQuery(new URLSearchParams()),
        authentication(),
        context,
      ),
    ).resolves.toMatchObject({
      availableQuantity: "7.0000",
      sku: { skuCode: "SKU-001" },
      warehouseCount: 1,
    });
  });

  it("returns dashboard statistics and hides inventory amount without field permissions", async () => {
    const store = repository();
    const service = new InventoryQueryService(store);

    await expect(
      service.summary(parseInventoryListQuery(new URLSearchParams()), authentication(), context),
    ).resolves.toMatchObject({
      inventoryCount: 1,
      onHandQuantity: "10.0000",
      statusCounts: { normalStockCount: 1 },
    });
    await expect(
      service.summary(parseInventoryListQuery(new URLSearchParams()), authentication(), context),
    ).resolves.not.toHaveProperty("inventoryAmount");
    await expect(
      service.summary(
        parseInventoryListQuery(new URLSearchParams()),
        authentication([
          "inventory.stock.read",
          "master.sku.read",
          "master.warehouse.read",
          "field.amount.read",
          "field.cost.read",
        ]),
        context,
      ),
    ).resolves.toMatchObject({ inventoryAmount: "1200.0000" });
    expect(store.summary).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ allowedWarehouseIds: [WAREHOUSE_ID] }),
    );
  });

  it("returns inventory status statistics from authorized inventories", async () => {
    const service = new InventoryQueryService(
      repository([
        inventory(),
        inventory({
          availableQuantity: "0.0000",
          id: "77777777-7777-4777-8777-777777777777",
          inventoryStatus: "pending",
          onHandQuantity: "5.0000",
          pendingQuantity: "5.0000",
          reservedQuantity: "0.0000",
        }),
        inventory({
          availableQuantity: "0.0000",
          id: "88888888-8888-4888-8888-888888888888",
          inventoryStatus: "zero",
          onHandQuantity: "0.0000",
          pendingQuantity: "0.0000",
          reservedQuantity: "0.0000",
        }),
      ]),
    );

    await expect(
      service.summary(parseInventoryListQuery(new URLSearchParams()), authentication(), context),
    ).resolves.toMatchObject({
      statusCounts: {
        normalStockCount: 1,
        pendingStockCount: 1,
        zeroStockCount: 1,
      },
    });
  });

  it("returns warehouse inventory summary and keeps warehouse scope enforced", async () => {
    const service = new InventoryQueryService(repository());
    await expect(
      service.byWarehouse(
        WAREHOUSE_ID,
        parseInventoryListQuery(new URLSearchParams()),
        authentication(),
        context,
      ),
    ).resolves.toMatchObject({
      onHandQuantity: "10.0000",
      skuCount: 1,
      warehouse: { warehouseCode: "WH-001" },
    });
  });

  it("rejects inconsistent available_quantity values", async () => {
    const service = new InventoryQueryService(
      repository([inventory({ availableQuantity: "8.0000" })]),
    );
    await expect(
      service.list(parseInventoryListQuery(new URLSearchParams()), authentication(), context),
    ).rejects.toMatchObject({ code: "CONFLICT_REQUEST" });
  });

  it("requires inventory, SKU and warehouse read permissions", async () => {
    const service = new InventoryQueryService(repository());
    await expect(
      service.list(
        parseInventoryListQuery(new URLSearchParams()),
        authentication(["inventory.stock.read", "master.sku.read"]),
        context,
      ),
    ).rejects.toMatchObject({ code: "PERMISSION_FORBIDDEN" });
  });

  it("supports detail query and recent transaction entry", async () => {
    const service = new InventoryQueryService(repository());
    await expect(service.detail(INVENTORY_ID, authentication(), context)).resolves.toMatchObject({
      id: INVENTORY_ID,
      sku: { id: SKU_ID },
      warehouse: { id: WAREHOUSE_ID },
    });
    await expect(
      service.transactionEntry(INVENTORY_ID, authentication(["inventory.transaction.read"])),
    ).resolves.toMatchObject({
      transactionsPath: `/api/v1/inventory-transactions?inventoryId=${INVENTORY_ID}`,
    });
  });
});
