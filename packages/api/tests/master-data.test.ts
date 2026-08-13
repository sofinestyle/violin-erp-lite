import { describe, expect, it, vi } from "vitest";
import {
  InMemoryAuditWriter,
  MASTER_DATA_RESOURCE_KEYS,
  MASTER_DATA_DEFINITIONS,
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
    delete: vi.fn().mockResolvedValue({ id: RECORD_ID, status: "deleted" }),
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
    delete: vi.fn().mockResolvedValue({ id: record.id, status: "deleted" }),
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

function updateInputFor(
  resource: (typeof MASTER_DATA_RESOURCE_KEYS)[number],
  input: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  const result = { ...input, updatedAt: "2026-07-23T00:00:00.000Z" };
  const codeField = MASTER_DATA_DEFINITIONS[resource].codeField;
  if (["products", "skus", "suppliers", "manufacturers", "warehouses"].includes(resource)) {
    delete result[codeField];
  }
  return result;
}

describe("Master Data API contracts", () => {
  it("covers the eight authorized Frozen resources and parses pagination safely", () => {
    expect(MASTER_DATA_RESOURCE_KEYS).toEqual([
      "products",
      "skus",
      "product-categories",
      "brands",
      "ecommerce-platforms",
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

  it("treats script and SQL metacharacters as data and rejects oversized names", () => {
    const updatedAt = "2026-07-23T00:00:00.000Z";
    expect(
      validateMasterDataInput(
        "skus",
        { skuName: `<script>alert("xss")</script>'; DROP TABLE skus; --`, updatedAt },
        "update",
      ),
    ).toMatchObject({
      data: { skuName: `<script>alert("xss")</script>'; DROP TABLE skus; --` },
    });

    for (const [resource, field] of [
      ["skus", "skuName"],
      ["suppliers", "supplierName"],
      ["stores", "storeName"],
    ] as const) {
      expect(() =>
        validateMasterDataInput(resource, { [field]: "超".repeat(301), updatedAt }, "update"),
      ).toThrowError(expect.objectContaining({ details: [expect.objectContaining({ field })] }));
    }
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
          productNameEn: "L2",
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

  it("allows first-stage automatic code resources to omit code on create", () => {
    expect(
      validateMasterDataInput(
        "products",
        {
          brandId: RECORD_ID,
          categoryId: RECORD_ID,
          defaultUnit: "piece",
          productName: "手工小提琴",
          productNameEn: "L2",
          productType: "violin",
        },
        "create",
      ),
    ).toMatchObject({ data: expect.not.objectContaining({ productCode: expect.anything() }) });
    expect(
      validateMasterDataInput(
        "suppliers",
        {
          settlementMethod: "monthly",
          supplierName: "测试供应商",
        },
        "create",
      ),
    ).toMatchObject({ data: expect.not.objectContaining({ supplierCode: expect.anything() }) });
  });

  it("requires Product model and exposes approved uniqueness checks", async () => {
    expect(() =>
      validateMasterDataInput(
        "products",
        {
          brandId: RECORD_ID,
          categoryId: RECORD_ID,
          defaultUnit: "piece",
          productName: "手工小提琴",
          productType: "violin",
        },
        "create",
      ),
    ).toThrowError(
      expect.objectContaining({ details: [expect.objectContaining({ field: "productNameEn" })] }),
    );
    expect(
      MASTER_DATA_DEFINITIONS.products.fields.find((field) => field.key === "productNameEn"),
    ).toMatchObject({ label: "产品型号", requiredOnCreate: true });
    expect(
      validateMasterDataInput(
        "products",
        {
          brandId: RECORD_ID,
          categoryId: RECORD_ID,
          defaultUnit: "piece",
          productName: "手工小提琴",
          productNameEn: "L101-BR",
          productType: "violin",
        },
        "create",
      ),
    ).toMatchObject({ data: expect.objectContaining({ productNameEn: "L101-BR" }) });
    for (const productNameEn of ["L 2", "L/2", "小提琴L2", "L2--BR", "-L2", "L2-"]) {
      expect(() =>
        validateMasterDataInput(
          "products",
          {
            brandId: RECORD_ID,
            categoryId: RECORD_ID,
            defaultUnit: "piece",
            productName: "手工小提琴",
            productNameEn,
            productType: "violin",
          },
          "create",
        ),
      ).toThrowError(
        expect.objectContaining({ details: [expect.objectContaining({ field: "productNameEn" })] }),
      );
    }

    const store = repositoryWithRecord({
      id: RECORD_ID,
      productCode: "PRD-000001",
      productName: "手工小提琴",
      productNameEn: "L2",
    });
    const service = new MasterDataService(store, new InMemoryAuditWriter());
    await expect(
      service.uniqueness(
        "products",
        new URLSearchParams("field=productNameEn&value=L2"),
        authentication(["master.product.read"]),
      ),
    ).resolves.toEqual({ isUnique: true, normalizedValue: "l2" });
  });

  it("returns a business error when Product model is duplicated on create or update", async () => {
    const store = {
      ...repository(),
      uniqueness: vi.fn().mockResolvedValue(false),
    };
    const service = new MasterDataService(store, new InMemoryAuditWriter());
    const duplicatedInput = {
      brandId: RECORD_ID,
      categoryId: RECORD_ID,
      defaultUnit: "piece",
      productName: "重复型号产品",
      productNameEn: "L2",
      productType: "violin",
    };

    await expect(
      service.create(
        "products",
        duplicatedInput,
        authentication(["master.product.create"]),
        requestContext,
      ),
    ).rejects.toMatchObject({
      code: "CONFLICT_REQUEST",
      message: "产品型号已存在，请使用其他型号",
    });
    expect(store.create).not.toHaveBeenCalled();
    expect(store.uniqueness).toHaveBeenCalledWith(
      "products",
      "productNameEn",
      "L2",
      undefined,
      {},
      USER_ID,
    );

    await expect(
      service.update(
        "products",
        RECORD_ID,
        { productNameEn: "L2", updatedAt: "2026-07-23T00:00:00.000Z" },
        authentication(["master.product.update"]),
        requestContext,
      ),
    ).rejects.toMatchObject({
      code: "CONFLICT_REQUEST",
      message: "产品型号已存在，请使用其他型号",
    });
    expect(store.update).not.toHaveBeenCalled();
    expect(store.uniqueness).toHaveBeenCalledWith(
      "products",
      "productNameEn",
      "L2",
      RECORD_ID,
      {},
      USER_ID,
    );
  });

  it("returns Product model in options for SKU business-facing selectors", async () => {
    const writer = new InMemoryAuditWriter();
    const store = repositoryWithRecord({
      id: RECORD_ID,
      isActive: true,
      productCode: "PRD-000001",
      defaultUnit: "unit",
      productName: "普及实木亮光小提琴",
      productNameEn: "L2",
      updatedAt: "2026-07-23T00:00:00.000Z",
    });
    const service = new MasterDataService(store, writer);

    await expect(
      service.options(
        "products",
        parseMasterDataListQuery("products", new URLSearchParams("page=1&pageSize=20")),
        authentication(["master.product.read"]),
      ),
    ).resolves.toEqual([
      expect.objectContaining({
        productName: "普及实木亮光小提琴",
        productNameEn: "L2",
        defaultUnit: "unit",
      }),
    ]);
  });

  it("allows safe master data delete and records audit with update permission", async () => {
    const writer = new InMemoryAuditWriter();
    const store = repository();
    const service = new MasterDataService(store, writer);

    await expect(
      service.delete(
        "products",
        RECORD_ID,
        authentication(["master.product.update"]),
        requestContext,
      ),
    ).resolves.toEqual({ deleted: true, id: RECORD_ID });
    expect(store.delete).toHaveBeenCalledWith("products", RECORD_ID, USER_ID);
    expect(writer.events.at(-1)).toMatchObject({
      action: "delete",
      resourceId: RECORD_ID,
      resourceType: "products",
    });
  });

  it("returns business messages for referenced and system master data deletes", async () => {
    const referencedStore = {
      ...repository(),
      delete: vi.fn().mockResolvedValue({ status: "referenced" }),
    };
    const systemStore = {
      ...repository(),
      delete: vi.fn().mockResolvedValue({ status: "system" }),
    };
    const unsupportedStore = {
      ...repository(),
      delete: vi.fn().mockResolvedValue({ status: "unsupported" }),
    };

    await expect(
      new MasterDataService(referencedStore, new InMemoryAuditWriter()).delete(
        "products",
        RECORD_ID,
        authentication(["master.product.update"]),
        requestContext,
      ),
    ).rejects.toMatchObject({
      code: "CONFLICT_REQUEST",
      message: "该数据已被业务单据引用，无法删除，请停用。",
    });

    await expect(
      new MasterDataService(systemStore, new InMemoryAuditWriter()).delete(
        "products",
        RECORD_ID,
        authentication(["master.product.update"]),
        requestContext,
      ),
    ).rejects.toMatchObject({
      code: "CONFLICT_REQUEST",
      message: "系统数据不可删除。",
    });

    await expect(
      new MasterDataService(unsupportedStore, new InMemoryAuditWriter()).delete(
        "brands",
        RECORD_ID,
        authentication(["master.brand.update"]),
        requestContext,
      ),
    ).rejects.toMatchObject({
      code: "VALIDATION_INVALID_FIELD",
      message: "该基础资料暂不支持删除，请停用。",
    });
  });

  it("keeps legacy create code compatibility but rejects generated code updates", () => {
    expect(
      validateMasterDataInput(
        "products",
        {
          brandId: RECORD_ID,
          categoryId: RECORD_ID,
          defaultUnit: "piece",
          productCode: "LEGACY-001",
          productName: "历史产品",
          productNameEn: "L2",
          productType: "violin",
        },
        "create",
      ),
    ).toMatchObject({ data: { productCode: "LEGACY-001" } });
    expect(() =>
      validateMasterDataInput(
        "products",
        { productCode: "PRD-999999", updatedAt: "2026-07-23T00:00:00.000Z" },
        "update",
      ),
    ).toThrowError(
      expect.objectContaining({ details: [expect.objectContaining({ field: "productCode" })] }),
    );
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
        productNameEn: "L2",
        productType: "violin",
      },
      {
        id: RECORD_ID,
        isActive: true,
        productCode: "PRD-001",
        productName: "手工小提琴",
        productNameEn: "L2",
      },
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
        service.update(resource, RECORD_ID, updateInputFor(resource, input), auth, requestContext),
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

  it.each([
    [
      "suppliers",
      "master.supplier",
      {
        contactEmail: "supplier@example.com",
        contactName: "张三",
        contactPhone: "13800000000",
        settlementMethod: "bank_transfer",
        supplierCode: "SUP-001",
        supplierName: "测试供应商",
      },
      {
        bankAccountNo: "6222000000000000",
        contactEmail: "supplier@example.com",
        contactPhone: "13800000000",
        id: RECORD_ID,
        isActive: true,
        supplierCode: "SUP-001",
        supplierName: "测试供应商",
      },
      "field.supplier-sensitive.read",
      "field=supplierCode&value=SUP-001",
    ],
    [
      "manufacturers",
      "master.manufacturer",
      {
        contactEmail: "manufacturer@example.com",
        contactName: "李四",
        contactPhone: "13900000000",
        manufacturerCode: "MFR-001",
        manufacturerName: "测试厂家",
        settlementMethod: "monthly",
      },
      {
        address: "厂家地址",
        contactEmail: "manufacturer@example.com",
        contactPhone: "13900000000",
        id: RECORD_ID,
        isActive: true,
        manufacturerCode: "MFR-001",
        manufacturerName: "测试厂家",
      },
      "field.manufacturer-sensitive.read",
      "field=manufacturerCode&value=MFR-001",
    ],
    [
      "warehouses",
      "master.warehouse",
      {
        allowsAvailableStock: true,
        ownerType: "company",
        sortOrder: 1,
        warehouseCode: "WHS-001",
        warehouseName: "公司仓",
        warehouseType: "company",
      },
      { id: RECORD_ID, isActive: true, warehouseCode: "WHS-001", warehouseName: "公司仓" },
      null,
      "field=warehouseCode&value=WHS-001",
    ],
    [
      "ecommerce-platforms",
      "master.platform",
      {
        countryCode: "CN",
        isCrossBorder: false,
        platformCode: "PLT-001",
        platformName: "测试平台",
        platformType: "domestic",
      },
      { id: RECORD_ID, isActive: true, platformCode: "PLT-001", platformName: "测试平台" },
      null,
      "field=platformCode&value=PLT-001",
    ],
    [
      "stores",
      "master.store",
      {
        countryCode: "CN",
        currencyCode: "CNY",
        platformId: RECORD_ID,
        storeCode: "STR-001",
        storeName: "测试店铺",
      },
      { id: RECORD_ID, isActive: true, storeCode: "STR-001", storeName: "测试店铺" },
      null,
      "field=storeCode&value=STR-001",
    ],
  ] as const)(
    "implements extended CRUD lifecycle, permission and audit boundary for %s",
    async (resource, permissionResource, input, persisted, fieldPermission, uniquenessQuery) => {
      const writer = new InMemoryAuditWriter();
      const store = repositoryWithRecord({
        ...persisted,
        updatedAt: "2026-07-23T00:00:00.000Z",
      });
      const service = new MasterDataService(store, writer);
      const auth = authentication([
        `${permissionResource}.read`,
        `${permissionResource}.create`,
        `${permissionResource}.update`,
        `${permissionResource}.enable`,
        `${permissionResource}.disable`,
        ...(fieldPermission ? [fieldPermission] : []),
      ] as AuthenticationContext["user"]["permissionCodes"]);

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
        service.update(resource, RECORD_ID, updateInputFor(resource, input), auth, requestContext),
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
        service.uniqueness(resource, new URLSearchParams(uniquenessQuery), auth),
      ).resolves.toMatchObject({ isUnique: true });

      expect(writer.events.map((event) => event.action)).toEqual(
        expect.arrayContaining(["create", "update", "disable", "enable"]),
      );
      expect(writer.events.every((event) => event.requestId === requestContext.requestId)).toBe(
        true,
      );
    },
  );

  it("protects Supplier and Manufacturer sensitive fields by field permissions", async () => {
    const supplierService = new MasterDataService(
      repositoryWithRecord({
        bankAccountNo: "6222000000000000",
        contactEmail: "supplier@example.com",
        contactPhone: "13800000000",
        id: RECORD_ID,
        supplierCode: "SUP-001",
        supplierName: "测试供应商",
      }),
      new InMemoryAuditWriter(),
    );
    await expect(
      supplierService.detail(
        "suppliers",
        RECORD_ID,
        authentication(["master.supplier.read"]),
        requestContext,
      ),
    ).resolves.not.toHaveProperty("bankAccountNo");
    await expect(
      supplierService.detail(
        "suppliers",
        RECORD_ID,
        authentication(["master.supplier.read", "field.supplier-sensitive.read"]),
        requestContext,
      ),
    ).resolves.toHaveProperty("bankAccountNo");

    const manufacturerService = new MasterDataService(
      repositoryWithRecord({
        address: "厂家地址",
        contactPhone: "13900000000",
        id: RECORD_ID,
        manufacturerCode: "MFR-001",
        manufacturerName: "测试厂家",
      }),
      new InMemoryAuditWriter(),
    );
    await expect(
      manufacturerService.detail(
        "manufacturers",
        RECORD_ID,
        authentication(["master.manufacturer.read"]),
        requestContext,
      ),
    ).resolves.not.toHaveProperty("contactPhone");
    await expect(
      manufacturerService.detail(
        "manufacturers",
        RECORD_ID,
        authentication(["master.manufacturer.read", "field.manufacturer-sensitive.read"]),
        requestContext,
      ),
    ).resolves.toHaveProperty("contactPhone");
  });

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
          productNameEn: "L2",
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

  it("rejects inventory mutations and external sync credentials in extended master data", () => {
    expect(() =>
      validateMasterDataInput(
        "warehouses",
        {
          allowsAvailableStock: true,
          ownerType: "company",
          sortOrder: 1,
          stockBalance: 10,
          warehouseCode: "WHS-001",
          warehouseName: "公司仓",
          warehouseType: "company",
        },
        "create",
      ),
    ).toThrowError(
      expect.objectContaining({ details: [expect.objectContaining({ field: "stockBalance" })] }),
    );
    expect(() =>
      validateMasterDataInput(
        "ecommerce-platforms",
        {
          apiKey: "secret",
          isCrossBorder: false,
          platformCode: "PLT-001",
          platformName: "测试平台",
          platformType: "domestic",
        },
        "create",
      ),
    ).toThrowError(
      expect.objectContaining({ details: [expect.objectContaining({ field: "apiKey" })] }),
    );
  });
});
