import { describe, expect, it, vi } from "vitest";
import {
  InventoryTransactionService,
  parseInventoryTransactionListQuery,
  type AuthenticationContext,
  type InventoryAccessScope,
  type InventoryTransactionListQuery,
  type InventoryTransactionRecord,
  type InventoryTransactionRepository,
} from "../src/index";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const SKU_ID = "22222222-2222-4222-8222-222222222222";
const WAREHOUSE_ID = "33333333-3333-4333-8333-333333333333";
const TRANSACTION_ID = "44444444-4444-4444-8444-444444444444";
const SOURCE_ID = "55555555-5555-4555-8555-555555555555";
const SOURCE_ITEM_ID = "66666666-6666-4666-8666-666666666666";

const context = {
  requestId: "77777777-7777-4777-8777-777777777777",
  requestTraceId: "88888888-8888-4888-8888-888888888888",
  timestamp: "2026-07-26T00:00:00.000Z",
};

function authentication(
  permissions = [
    "inventory.transaction.read",
    "inventory.stock.read",
    "master.sku.read",
    "master.warehouse.read",
  ],
  warehouseIds: readonly string[] = [WAREHOUSE_ID],
): AuthenticationContext {
  return {
    user: {
      dataScopes: warehouseIds.length > 0 ? ["warehouse"] : ["all"],
      permissionCodes: permissions as AuthenticationContext["user"]["permissionCodes"],
      roleCodes: ["warehouse_staff"],
      userId: USER_ID,
      username: "warehouse-user",
      warehouseScopes: warehouseIds.map((targetId) => ({ accessLevel: "read", targetId })),
    },
  };
}

function transaction(
  overrides: Partial<InventoryTransactionRecord> = {},
): InventoryTransactionRecord {
  return {
    amount: "100.0000",
    batchNo: "BATCH-001",
    createdAt: "2026-07-26T01:00:00.000Z",
    direction: "in",
    id: TRANSACTION_ID,
    operator: {
      displayName: "仓库操作员",
      id: USER_ID,
      username: "warehouse-user",
    },
    quantity: "10.0000",
    quantityAfter: "10.0000",
    quantityBefore: "0.0000",
    relatedTransactionId: null,
    remark: "首批入库",
    requestTraceId: "repository-trace",
    sku: {
      id: SKU_ID,
      skuCode: "SKU-001",
      skuName: "4/4 手工小提琴",
      unit: "piece",
    },
    source: {
      sourceDocumentId: SOURCE_ID,
      sourceDocumentItemId: SOURCE_ITEM_ID,
      sourceDocumentType: "inbound",
    },
    transactionAt: "2026-07-26T00:00:00.000Z",
    transactionNo: "ITX-20260726-0001",
    transactionType: "inbound",
    unitCost: "10.0000",
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
  records: readonly InventoryTransactionRecord[] = [transaction()],
): InventoryTransactionRepository {
  return {
    detail: vi.fn(async (id: string, access: InventoryAccessScope) => {
      const found = records.find((item) => item.id === id);
      if (!found) return null;
      if (
        access.allowedWarehouseIds !== undefined &&
        !access.allowedWarehouseIds.includes(found.warehouse.id)
      ) {
        return null;
      }
      return found;
    }),
    list: vi.fn(async (query: InventoryTransactionListQuery, access: InventoryAccessScope) => {
      const filtered = records.filter((item) => {
        if (
          access.allowedWarehouseIds !== undefined &&
          !access.allowedWarehouseIds.includes(item.warehouse.id)
        ) {
          return false;
        }
        if (query.skuId && item.sku.id !== query.skuId) return false;
        if (query.warehouseId && item.warehouse.id !== query.warehouseId) return false;
        if (query.transactionType && item.transactionType !== query.transactionType) return false;
        if (
          query.sourceDocumentType &&
          item.source.sourceDocumentType !== query.sourceDocumentType
        ) {
          return false;
        }
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
  };
}

describe("Inventory Transaction Query module", () => {
  it("parses approved INV-006 filters and pagination", () => {
    const query = parseInventoryTransactionListQuery(
      new URLSearchParams(
        `page=2&pageSize=50&skuId=${SKU_ID}&warehouseId=${WAREHOUSE_ID}&transactionType=inbound&sourceType=inbound&sourceDocumentId=${SOURCE_ID}&dateFrom=2026-07-01&dateTo=2026-07-31`,
      ),
    );

    expect(query).toMatchObject({
      page: 2,
      pageSize: 50,
      skuId: SKU_ID,
      sourceDocumentId: SOURCE_ID,
      sourceDocumentType: "inbound",
      transactionType: "inbound",
      warehouseId: WAREHOUSE_ID,
    });
    expect(query.dateFrom?.toISOString()).toBe("2026-07-01T00:00:00.000Z");
    expect(query.dateTo?.toISOString()).toBe("2026-07-31T23:59:59.999Z");
  });

  it("rejects invalid date range", () => {
    expect(() =>
      parseInventoryTransactionListQuery(
        new URLSearchParams("dateFrom=2026-07-31&dateTo=2026-07-01"),
      ),
    ).toThrowError(expect.objectContaining({ code: "VALIDATION_INVALID_FIELD" }));
  });

  it("returns transaction list through warehouse scope and trace context", async () => {
    const store = repository();
    const service = new InventoryTransactionService(store);

    const result = await service.list(
      parseInventoryTransactionListQuery(new URLSearchParams(`skuId=${SKU_ID}`)),
      authentication(),
      context,
    );

    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      id: TRANSACTION_ID,
      requestTraceId: context.requestTraceId,
      source: {
        sourceDocumentPath: `/api/v1/inbound-orders/${SOURCE_ID}`,
        sourceDocumentType: "inbound",
      },
    });
    expect(store.list).toHaveBeenCalledWith(
      expect.objectContaining({ skuId: SKU_ID }),
      expect.objectContaining({
        actorUserId: USER_ID,
        allowedWarehouseIds: [WAREHOUSE_ID],
        requestTraceId: context.requestTraceId,
      }),
    );
  });

  it("returns transaction detail and source trace for outbound and adjustment records", async () => {
    const service = new InventoryTransactionService(
      repository([
        transaction({
          source: {
            sourceDocumentId: SOURCE_ID,
            sourceDocumentItemId: SOURCE_ITEM_ID,
            sourceDocumentType: "outbound",
          },
        }),
      ]),
    );
    await expect(service.detail(TRANSACTION_ID, authentication(), context)).resolves.toMatchObject({
      source: { sourceDocumentPath: `/api/v1/outbound-orders/${SOURCE_ID}` },
    });

    const adjustmentService = new InventoryTransactionService(
      repository([
        transaction({
          source: {
            sourceDocumentId: SOURCE_ID,
            sourceDocumentItemId: SOURCE_ITEM_ID,
            sourceDocumentType: "inventory_adjustment",
          },
        }),
      ]),
    );
    await expect(
      adjustmentService.detail(TRANSACTION_ID, authentication(), context),
    ).resolves.toMatchObject({
      source: { sourceDocumentPath: `/api/v1/inventory-adjustments/${SOURCE_ID}` },
    });
  });

  it("hides cost and amount fields without sensitive field permissions", async () => {
    const service = new InventoryTransactionService(repository());
    const result = await service.detail(TRANSACTION_ID, authentication(), context);

    expect(result.unitCost).toBeUndefined();
    expect(result.amount).toBeUndefined();

    await expect(
      service.detail(
        TRANSACTION_ID,
        authentication([
          "inventory.transaction.read",
          "inventory.stock.read",
          "master.sku.read",
          "master.warehouse.read",
          "field.cost.read",
          "field.amount.read",
        ]),
        context,
      ),
    ).resolves.toMatchObject({ amount: "100.0000", unitCost: "10.0000" });
  });

  it("requires inventory transaction, inventory, SKU and warehouse read permissions", async () => {
    const service = new InventoryTransactionService(repository());
    await expect(
      service.list(
        parseInventoryTransactionListQuery(new URLSearchParams()),
        authentication(["inventory.transaction.read", "inventory.stock.read", "master.sku.read"]),
        context,
      ),
    ).rejects.toMatchObject({ code: "PERMISSION_FORBIDDEN" });
  });
});
