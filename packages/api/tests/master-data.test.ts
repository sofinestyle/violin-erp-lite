import { describe, expect, it, vi } from "vitest";
import {
  InMemoryAuditWriter,
  MASTER_DATA_RESOURCE_KEYS,
  MasterDataService,
  parseMasterDataListQuery,
  validateMasterDataInput,
  type AuthenticationContext,
  type MasterDataRepository,
} from "../src/index";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const RECORD_ID = "22222222-2222-4222-8222-222222222222";

function authentication(permissions = ["master.product.read"]): AuthenticationContext {
  return {
    user: {
      dataScopes: ["all"],
      permissionCodes: permissions as AuthenticationContext["user"]["permissionCodes"],
      roleCodes: ["administrator"],
      userId: USER_ID,
      username: "admin",
    },
  };
}

function repository(): MasterDataRepository {
  const record = {
    id: RECORD_ID,
    isActive: true,
    productCode: "P-001",
    productName: "测试产品",
    updatedAt: "2026-07-23T00:00:00.000Z",
  };
  return {
    create: vi.fn().mockResolvedValue(record),
    findById: vi.fn().mockResolvedValue(record),
    list: vi.fn().mockResolvedValue({ items: [record], page: 1, pageSize: 20, total: 1 }),
    setActive: vi.fn().mockResolvedValue({ ...record, isActive: false }),
    uniqueness: vi.fn().mockResolvedValue(true),
    update: vi.fn().mockResolvedValue(record),
  };
}

function repositoryWithRecord(
  record: Readonly<Record<string, unknown> & { id: string }>,
): MasterDataRepository {
  return {
    create: vi.fn().mockResolvedValue(record),
    findById: vi.fn().mockResolvedValue(record),
    list: vi.fn().mockResolvedValue({ items: [record], page: 1, pageSize: 20, total: 1 }),
    setActive: vi.fn().mockResolvedValue({ ...record, isActive: false }),
    uniqueness: vi.fn().mockResolvedValue(true),
    update: vi.fn().mockResolvedValue(record),
  };
}

const requestContext = {
  requestId: "33333333-3333-4333-8333-333333333333",
  timestamp: "2026-07-23T00:00:00.000Z",
};

describe("Master Data API contracts", () => {
  it("covers the eight authorized Frozen resources and parses pagination safely", () => {
    expect(MASTER_DATA_RESOURCE_KEYS).toEqual([
      "products",
      "skus",
      "product-categories",
      "brands",
      "manufacturers",
      "suppliers",
      "warehouses",
      "stores",
    ]);
    expect(
      parseMasterDataListQuery(
        "products",
        new URLSearchParams("page=2&pageSize=50&keyword=violin&isActive=true"),
      ),
    ).toMatchObject({ page: 2, pageSize: 50, keyword: "violin", isActive: true });
    expect(() =>
      parseMasterDataListQuery("products", new URLSearchParams("pageSize=101")),
    ).toThrowError(
      expect.objectContaining({ details: [expect.objectContaining({ field: "pageSize" })] }),
    );
  });

  it("validates Frozen warehouse enum and all three warehouse checks", () => {
    const base = {
      warehouseCode: "W-001",
      warehouseName: "厂家仓",
      ownerType: "manufacturer",
      allowsAvailableStock: true,
      sortOrder: 1,
    };
    expect(() =>
      validateMasterDataInput("warehouses", { ...base, warehouseType: "manufacturer" }, "create"),
    ).toThrowError(
      expect.objectContaining({ details: [expect.objectContaining({ field: "manufacturerId" })] }),
    );
    expect(() =>
      validateMasterDataInput("warehouses", { ...base, warehouseType: "overseas" }, "create"),
    ).toThrowError(
      expect.objectContaining({ details: [expect.objectContaining({ field: "countryCode" })] }),
    );
    expect(() =>
      validateMasterDataInput("warehouses", { ...base, warehouseType: "transit" }, "create"),
    ).toThrowError(
      expect.objectContaining({
        details: [expect.objectContaining({ field: "allowsAvailableStock" })],
      }),
    );
    expect(() =>
      validateMasterDataInput("warehouses", { ...base, warehouseType: "unapproved" }, "create"),
    ).toThrowError(
      expect.objectContaining({ details: [expect.objectContaining({ field: "warehouseType" })] }),
    );
  });

  it("enforces permission, repository flow and required audit", async () => {
    const writer = new InMemoryAuditWriter();
    const store = repository();
    const service = new MasterDataService(store, writer);

    await expect(
      service.create(
        "products",
        {
          brandId: RECORD_ID,
          categoryId: RECORD_ID,
          defaultUnit: "piece",
          productCode: "P-001",
          productName: "测试产品",
          productType: "violin",
        },
        authentication(["master.product.create"]),
        requestContext,
      ),
    ).resolves.toMatchObject({ productCode: "P-001" });
    expect(writer.events).toHaveLength(1);
    await expect(
      service.list(
        "products",
        parseMasterDataListQuery("products", new URLSearchParams()),
        authentication([]),
      ),
    ).rejects.toMatchObject({ code: "PERMISSION_FORBIDDEN" });
  });

  it.each([
    [
      "product-categories",
      "master.category",
      {
        categoryCode: "CAT-001",
        categoryLevel: 1,
        categoryName: "小提琴",
        sortOrder: 1,
      },
      { categoryCode: "CAT-001", categoryName: "小提琴", id: RECORD_ID, isActive: true },
    ],
    [
      "brands",
      "master.brand",
      { brandCode: "BRD-001", brandName: "测试品牌" },
      { brandCode: "BRD-001", brandName: "测试品牌", id: RECORD_ID, isActive: true },
    ],
    [
      "products",
      "master.product",
      {
        brandId: RECORD_ID,
        categoryId: RECORD_ID,
        defaultUnit: "piece",
        productCode: "PRD-001",
        productName: "手工小提琴",
        productType: "violin",
      },
      { id: RECORD_ID, isActive: true, productCode: "PRD-001", productName: "手工小提琴" },
    ],
    [
      "skus",
      "master.sku",
      {
        productId: RECORD_ID,
        safetyStockQuantity: "0",
        skuCode: "SKU-001",
        skuName: "4/4 手工小提琴",
        unit: "piece",
      },
      { id: RECORD_ID, isActive: true, skuCode: "SKU-001", skuName: "4/4 手工小提琴" },
    ],
  ] as const)(
    "implements CRUD lifecycle, permission and audit boundary for %s",
    async (resource, permissionResource, input, persisted) => {
      const writer = new InMemoryAuditWriter();
      const store = repositoryWithRecord({
        ...persisted,
        updatedAt: "2026-07-23T00:00:00.000Z",
      });
      const service = new MasterDataService(store, writer);
      const allPermissions = [
        `${permissionResource}.read`,
        `${permissionResource}.create`,
        `${permissionResource}.update`,
        `${permissionResource}.enable`,
        `${permissionResource}.disable`,
        "field.cost.read",
        "field.amount.read",
      ] as AuthenticationContext["user"]["permissionCodes"];
      const auth = authentication(allPermissions);

      await expect(
        service.list(
          resource,
          parseMasterDataListQuery(resource, new URLSearchParams("page=1&pageSize=20")),
          auth,
        ),
      ).resolves.toMatchObject({ total: 1 });
      await expect(
        service.detail(resource, RECORD_ID, auth, requestContext),
      ).resolves.toMatchObject(persisted);
      await expect(service.create(resource, input, auth, requestContext)).resolves.toMatchObject(
        persisted,
      );
      await expect(
        service.update(
          resource,
          RECORD_ID,
          { ...input, updatedAt: "2026-07-23T00:00:00.000Z" },
          auth,
          requestContext,
        ),
      ).resolves.toMatchObject(persisted);
      await expect(
        service.setActive(
          resource,
          RECORD_ID,
          false,
          { reason: "历史保护停用", updatedAt: "2026-07-23T00:00:00.000Z" },
          auth,
          requestContext,
        ),
      ).resolves.toMatchObject({ isActive: false });
      await expect(
        service.setActive(
          resource,
          RECORD_ID,
          true,
          { updatedAt: "2026-07-23T00:00:00.000Z" },
          auth,
          requestContext,
        ),
      ).resolves.toMatchObject({ isActive: false });
      await expect(
        service.uniqueness(
          resource,
          new URLSearchParams(
            resource === "product-categories"
              ? "field=categoryCode&value=CAT-001"
              : resource === "brands"
                ? "field=brandCode&value=BRD-001"
                : resource === "products"
                  ? "field=productCode&value=PRD-001"
                  : "field=skuCode&value=SKU-001",
          ),
          auth,
        ),
      ).resolves.toMatchObject({ isUnique: true });

      expect(writer.events.map((event) => event.action)).toEqual(
        expect.arrayContaining(["create", "update", "disable", "enable"]),
      );
      expect(writer.events.every((event) => event.requestId === requestContext.requestId)).toBe(
        true,
      );
      expect(store.create).toHaveBeenCalledWith(resource, expect.any(Object), USER_ID);
      expect(store.update).toHaveBeenCalledWith(
        resource,
        RECORD_ID,
        expect.any(Object),
        "2026-07-23T00:00:00.000Z",
        USER_ID,
      );
    },
  );

  it("rejects unapproved inventory fields when creating Product or SKU", () => {
    expect(() =>
      validateMasterDataInput(
        "products",
        {
          brandId: RECORD_ID,
          categoryId: RECORD_ID,
          defaultUnit: "piece",
          inventoryQuantity: 1,
          productCode: "PRD-001",
          productName: "手工小提琴",
          productType: "violin",
        },
        "create",
      ),
    ).toThrowError(
      expect.objectContaining({
        details: [expect.objectContaining({ field: "inventoryQuantity" })],
      }),
    );
    expect(() =>
      validateMasterDataInput(
        "skus",
        {
          productId: RECORD_ID,
          safetyStockQuantity: "0",
          skuCode: "SKU-001",
          skuName: "4/4 手工小提琴",
          stockBalance: 10,
          unit: "piece",
        },
        "create",
      ),
    ).toThrowError(
      expect.objectContaining({ details: [expect.objectContaining({ field: "stockBalance" })] }),
    );
  });
});
