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
    const context = {
      requestId: "33333333-3333-4333-8333-333333333333",
      timestamp: "2026-07-23T00:00:00.000Z",
    };

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
        context,
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
});
