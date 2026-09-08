import { describe, expect, it, vi } from "vitest";
import { PrismaMasterDataRepository } from "../src/index";

const USER_ID = "11111111-1111-4111-8111-111111111111";

function testRepository(client: unknown) {
  const delegates = {
    $queryRawUnsafe: vi.fn().mockResolvedValue([{ id: USER_ID, current_value: 0, version: 0 }]),
    $executeRawUnsafe: vi.fn().mockResolvedValue(1),
    ...(client as Record<string, unknown>),
  };
  return new PrismaMasterDataRepository({
    ...delegates,
    $transaction: async (work: (tx: unknown) => Promise<unknown>) => work(delegates),
  } as never);
}

describe("Prisma Master Data repository", () => {
  it.each([
    [1, false, false],
    [5000, true, true],
    [2, true, false],
    [2, false, true],
  ])(
    "summarizes Product references without per-SKU queries (%s, %s, %s)",
    async (skuCount, hasInventory, hasHistory) => {
      const deleteMany = vi.fn();
      const audit = vi.fn();
      const count = vi.fn().mockResolvedValue(skuCount);
      const findFirst = vi
        .fn()
        .mockResolvedValueOnce(hasInventory ? { id: USER_ID } : null)
        .mockResolvedValueOnce(hasHistory ? { id: USER_ID } : null);
      const repository = testRepository({
        products: {
          findFirst: vi.fn().mockResolvedValue({ id: USER_ID, product_code: "PRD-UAT" }),
          deleteMany,
        },
        skus: { count, findFirst },
      });
      await expect(repository.delete("products", USER_ID, USER_ID, audit)).resolves.toEqual({
        status: "referenced",
        reference: { label: "SKU", skuCount, hasInventory, hasHistory },
      });
      expect(count).toHaveBeenCalledTimes(1);
      expect(count).toHaveBeenCalledWith({ where: { product_id: USER_ID } });
      expect(findFirst).toHaveBeenCalledTimes(2);
      expect(findFirst).toHaveBeenNthCalledWith(1, {
        select: { id: true },
        where: { product_id: USER_ID, inventories: { some: {} } },
      });
      const historyArgs = findFirst.mock.calls[1]![0];
      expect(historyArgs.where.product_id).toBe(USER_ID);
      expect(historyArgs.where.OR).toHaveLength(16);
      for (const relation of [
        "inventory_transactions",
        "purchase_order_items",
        "production_order_items",
        "inspection_order_items",
        "inbound_order_items",
        "outbound_order_items",
        "inventory_adjustment_items",
        "cross_border_shipment_items",
        "sales_return_items",
        "transfer_order_items",
        "stock_count_items",
        "damage_report_items",
        "purchase_return_items",
        "production_completion_record_items",
        "import_task_items",
        "inventory_alerts",
      ]) {
        expect(historyArgs.where.OR).toContainEqual({ [relation]: { some: {} } });
      }
      // Disabled SKUs, zero stock rows and all historical states remain protected.
      expect(JSON.stringify(findFirst.mock.calls)).not.toMatch(/is_active|quantity|status/);
      expect(deleteMany).not.toHaveBeenCalled();
      expect(audit).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["product-categories", "product_categories", "products", "category_id", "产品"],
    ["brands", "brands", "products", "brand_id", "产品"],
    ["manufacturers", "manufacturers", "production_orders", "manufacturer_id", "生产订单记录"],
    ["manufacturers", "manufacturers", "warehouses", "manufacturer_id", "仓库关联"],
    ["suppliers", "suppliers", "product_suppliers", "supplier_id", "产品与供应商关联"],
    ["products", "products", "product_manufacturers", "product_id", "产品与厂家关联"],
    ["warehouses", "warehouses", "role_warehouses", "warehouse_id", "角色仓库范围关联"],
  ] as const)(
    "returns a confirmed reference label for %s via %s/%s",
    async (resource, model, referenceModel, field, label) => {
      const zero = vi.fn().mockResolvedValue(0);
      const hit = vi.fn().mockResolvedValue(1);
      const deleteMany = vi.fn();
      const audit = vi.fn();
      const models = [
        "product_categories",
        "products",
        "skus",
        "product_manufacturers",
        "product_suppliers",
        "purchase_orders",
        "purchase_payments",
        "purchase_returns",
        "production_orders",
        "production_payments",
        "warehouses",
        "inventories",
        "inventory_transactions",
        "inbound_orders",
        "inspection_orders",
        "outbound_orders",
        "inventory_adjustments",
        "cross_border_shipments",
        "transfer_orders",
        "stock_counts",
        "damage_reports",
        "sales_returns",
        "import_tasks",
        "import_task_items",
        "inventory_alerts",
        "production_completion_records",
        "role_warehouses",
      ];
      const client: Record<string, unknown> = Object.fromEntries(
        models.map((key) => [key, { count: zero }]),
      );
      client[model] = {
        count: zero,
        findFirst: vi.fn().mockResolvedValue({ id: USER_ID }),
        deleteMany,
      };
      client[referenceModel] = { count: hit };
      await expect(
        testRepository(client).delete(resource, USER_ID, USER_ID, audit),
      ).resolves.toEqual({
        status: "referenced",
        reference: { label },
      });
      expect(hit).toHaveBeenCalledWith({ where: { [field]: USER_ID } });
      expect(deleteMany).not.toHaveBeenCalled();
      expect(audit).not.toHaveBeenCalled();
    },
  );

  it.each(["unreferenced", "referenced", "system", "missing", "concurrent-reference"])(
    "handles brand delete protection: %s",
    async (scenario) => {
      const id = "22222222-2222-4222-8222-222222222222";
      const deleteMany =
        scenario === "concurrent-reference"
          ? vi.fn().mockRejectedValue({ code: "P2003" })
          : vi.fn().mockResolvedValue({ count: 1 });
      const count = vi.fn().mockResolvedValue(scenario === "referenced" ? 1 : 0);
      const client = {
        brands: {
          findFirst: vi
            .fn()
            .mockResolvedValue(
              scenario === "missing"
                ? null
                : { id, brand_code: scenario === "system" ? "SYS-BRAND" : "UAT-BRAND" },
            ),
          deleteMany,
        },
        products: { count },
      };
      const audit = vi.fn().mockResolvedValue(undefined);
      const result = await testRepository(client as never).delete("brands", id, USER_ID, audit);
      expect(audit).toHaveBeenCalledTimes(scenario === "unreferenced" ? 1 : 0);
      const status = {
        unreferenced: "deleted",
        referenced: "referenced",
        system: "system",
        missing: "not_found",
        "concurrent-reference": "referenced",
      }[scenario];
      expect(result.status).toBe(status);
      if (scenario === "unreferenced" || scenario === "concurrent-reference") {
        expect(deleteMany).toHaveBeenCalledTimes(1);
      } else {
        expect(deleteMany).not.toHaveBeenCalled();
      }
      if (["unreferenced", "referenced", "concurrent-reference"].includes(scenario)) {
        // No is_active filter: inactive products must also protect their brand.
        expect(count).toHaveBeenCalledWith({ where: { brand_id: id } });
      }
    },
  );
  it("maps a concurrent foreign-key refusal for existing non-brand deletion", async () => {
    const audit = vi.fn();
    const repository = new PrismaMasterDataRepository({
      $transaction: vi.fn().mockRejectedValue({ code: "P2003" }),
    } as never);
    await expect(repository.delete("skus", USER_ID, USER_ID, audit)).resolves.toEqual({
      status: "referenced",
    });
    expect(audit).not.toHaveBeenCalled();
  });
  it.each([false, true])(
    "protects SKU inventory references (referenced=%s)",
    async (referenced) => {
      const id = "22222222-2222-4222-8222-222222222222";
      const deleteMany = vi.fn().mockResolvedValue({ count: 1 });
      const models = [
        "inventories",
        "inventory_transactions",
        "purchase_order_items",
        "production_order_items",
        "inspection_order_items",
        "inbound_order_items",
        "outbound_order_items",
        "inventory_adjustment_items",
        "cross_border_shipment_items",
        "sales_return_items",
        "transfer_order_items",
        "stock_count_items",
        "damage_report_items",
        "purchase_return_items",
        "production_completion_record_items",
        "import_task_items",
        "inventory_alerts",
      ];
      const client = {
        ...Object.fromEntries(
          models.map((model) => [
            model,
            { count: vi.fn().mockResolvedValue(model === "inventories" && referenced ? 1 : 0) },
          ]),
        ),
        skus: {
          findFirst: vi.fn().mockResolvedValue({ id, sku_code: "UAT-DELETE-44-BK" }),
          deleteMany,
        },
      };
      const result = await testRepository(client as never).delete(
        "skus",
        id,
        USER_ID,
        async () => undefined,
      );
      if (referenced) {
        expect(result).toEqual({ status: "referenced", reference: { label: "库存记录" } });
        expect(deleteMany).not.toHaveBeenCalled();
      } else {
        expect(result).toEqual({ status: "deleted", id });
        expect(deleteMany).toHaveBeenCalledTimes(1);
      }
    },
  );
  it("applies warehouse role scope before pagination and maps response fields", async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        id: "22222222-2222-4222-8222-222222222222",
        is_active: true,
        warehouse_code: "W-001",
        warehouse_name: "公司仓",
        updated_at: new Date("2026-07-23T00:00:00.000Z"),
      },
    ]);
    const count = vi.fn().mockResolvedValue(1);
    const repository = testRepository({
      warehouses: { count, findMany },
    } as never);

    const result = await repository.list(
      "warehouses",
      {
        filters: { warehouseType: "company" },
        isActive: true,
        page: 1,
        pageSize: 20,
        sortBy: "updatedAt",
        sortOrder: "desc",
      },
      USER_ID,
    );

    expect(result.items[0]).toMatchObject({
      isActive: true,
      warehouseCode: "W-001",
      warehouseName: "公司仓",
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 20,
        where: {
          AND: expect.arrayContaining([
            expect.objectContaining({
              role_warehouses: expect.objectContaining({ some: expect.any(Object) }),
            }),
            { warehouse_type: "company" },
            { is_active: true },
          ]),
        },
      }),
    );
  });

  it("maps API camelCase fields to Frozen snake_case columns on create", async () => {
    const create = vi.fn().mockResolvedValue({
      id: "22222222-2222-4222-8222-222222222222",
      brand_code: "B-001",
      brand_name: "测试品牌",
    });
    const repository = testRepository({
      brands: { create },
    } as never);

    await repository.create("brands", { brandCode: "B-001", brandName: "测试品牌" }, USER_ID);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          brand_code: "B-001",
          brand_name: "测试品牌",
          created_by: USER_ID,
          updated_by: USER_ID,
        },
      }),
    );
  });

  it("maps ecommerce-platforms to the Frozen ecommerce_platforms table", async () => {
    const create = vi.fn().mockResolvedValue({
      id: "22222222-2222-4222-8222-222222222222",
      is_cross_border: false,
      platform_code: "PLT-001",
      platform_name: "测试平台",
      platform_type: "domestic",
    });
    const repository = testRepository({
      ecommerce_platforms: { create },
    } as never);

    await expect(
      repository.create(
        "ecommerce-platforms",
        {
          isCrossBorder: false,
          platformCode: "PLT-001",
          platformName: "测试平台",
          platformType: "domestic",
        },
        USER_ID,
      ),
    ).resolves.toMatchObject({
      isCrossBorder: false,
      platformCode: "PLT-001",
      platformName: "测试平台",
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          created_by: USER_ID,
          is_cross_border: false,
          platform_code: "PLT-001",
          updated_by: USER_ID,
        }),
      }),
    );
  });

  it("wraps automatic code generation and master data creation in one transaction", async () => {
    const create = vi.fn().mockResolvedValue({
      id: "22222222-2222-4222-8222-222222222222",
      product_code: "PRD-000001",
      product_name: "自动编码产品",
    });
    const transactionClient = {
      brands: { count: vi.fn().mockResolvedValue(1) },
      product_categories: { count: vi.fn().mockResolvedValue(1) },
      products: { create },
    };
    const transaction = vi.fn(async (callback: (client: typeof transactionClient) => unknown) =>
      callback(transactionClient),
    );
    const codeGeneration = {
      applyMasterDataCode: vi.fn().mockResolvedValue({
        brandId: "33333333-3333-4333-8333-333333333333",
        categoryId: "44444444-4444-4444-8444-444444444444",
        defaultUnit: "unit",
        productCode: "PRD-000001",
        productName: "自动编码产品",
        productNameEn: "L2",
        productType: "violin",
      }),
    };
    const repository = new PrismaMasterDataRepository(
      {
        $transaction: transaction,
      } as never,
      codeGeneration as never,
    );

    await expect(
      repository.create(
        "products",
        {
          brandId: "33333333-3333-4333-8333-333333333333",
          categoryId: "44444444-4444-4444-8444-444444444444",
          defaultUnit: "unit",
          productName: "自动编码产品",
          productNameEn: "L2",
          productType: "violin",
        },
        USER_ID,
      ),
    ).resolves.toMatchObject({ productCode: "PRD-000001" });
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(codeGeneration.applyMasterDataCode).toHaveBeenCalledWith(
      transactionClient,
      "products",
      expect.objectContaining({ productName: "自动编码产品" }),
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          product_code: "PRD-000001",
        }),
      }),
    );
  });

  it("maps Product model unique constraint conflicts to a business message", async () => {
    const uniqueError = {
      code: "P2002",
      meta: { target: "uq_products_product_name_en" },
    };
    const repository = testRepository({
      brands: { count: vi.fn().mockResolvedValue(1) },
      product_categories: { count: vi.fn().mockResolvedValue(1) },
      products: {
        create: vi.fn().mockRejectedValue(uniqueError),
        updateMany: vi.fn().mockRejectedValue(uniqueError),
      },
    } as never);

    await expect(
      repository.create(
        "products",
        {
          brandId: "33333333-3333-4333-8333-333333333333",
          categoryId: "44444444-4444-4444-8444-444444444444",
          defaultUnit: "unit",
          productCode: "PRD-LEGACY-001",
          productName: "重复型号产品",
          productNameEn: "L2",
          productType: "violin",
        },
        USER_ID,
      ),
    ).rejects.toMatchObject({
      code: "CONFLICT_REQUEST",
      message: "产品型号已存在，请使用其他型号",
    });

    await expect(
      repository.update(
        "products",
        "22222222-2222-4222-8222-222222222222",
        { productNameEn: "L2" },
        "2026-07-23T00:00:00.000Z",
        USER_ID,
      ),
    ).rejects.toMatchObject({
      code: "CONFLICT_REQUEST",
      message: "产品型号已存在，请使用其他型号",
    });
  });

  it("deletes unreferenced Product and Product Category master data", async () => {
    const productDeleteMany = vi.fn().mockResolvedValue({ count: 1 });
    const categoryDeleteMany = vi.fn().mockResolvedValue({ count: 1 });
    const repository = testRepository({
      product_categories: {
        count: vi.fn().mockResolvedValue(0),
        deleteMany: categoryDeleteMany,
        findFirst: vi.fn().mockResolvedValue({
          category_code: "CAT-UAT-001",
          id: "33333333-3333-4333-8333-333333333333",
        }),
      },
      product_manufacturers: { count: vi.fn().mockResolvedValue(0) },
      product_suppliers: { count: vi.fn().mockResolvedValue(0) },
      products: {
        count: vi.fn().mockResolvedValue(0),
        deleteMany: productDeleteMany,
        findFirst: vi.fn().mockResolvedValue({
          id: "22222222-2222-4222-8222-222222222222",
          product_code: "PRD-UAT-001",
        }),
      },
      skus: { count: vi.fn().mockResolvedValue(0) },
    } as never);

    await expect(
      repository.delete(
        "products",
        "22222222-2222-4222-8222-222222222222",
        USER_ID,
        async () => undefined,
      ),
    ).resolves.toEqual({
      id: "22222222-2222-4222-8222-222222222222",
      status: "deleted",
    });
    await expect(
      repository.delete(
        "product-categories",
        "33333333-3333-4333-8333-333333333333",
        USER_ID,
        async () => undefined,
      ),
    ).resolves.toEqual({
      id: "33333333-3333-4333-8333-333333333333",
      status: "deleted",
    });
    expect(productDeleteMany).toHaveBeenCalledWith({
      where: { AND: [{ id: "22222222-2222-4222-8222-222222222222" }, {}] },
    });
    expect(categoryDeleteMany).toHaveBeenCalledWith({
      where: { AND: [{ id: "33333333-3333-4333-8333-333333333333" }, {}] },
    });
  });

  it("blocks Product and Product Category delete when referenced", async () => {
    const repository = testRepository({
      product_categories: {
        count: vi.fn().mockResolvedValue(1),
        deleteMany: vi.fn(),
        findFirst: vi.fn().mockResolvedValue({
          category_code: "CAT-UAT-001",
          id: "33333333-3333-4333-8333-333333333333",
        }),
      },
      products: {
        count: vi.fn().mockResolvedValue(1),
        deleteMany: vi.fn(),
        findFirst: vi.fn().mockResolvedValue({
          id: "22222222-2222-4222-8222-222222222222",
          product_code: "PRD-UAT-001",
        }),
      },
      skus: { count: vi.fn().mockResolvedValue(1), findFirst: vi.fn().mockResolvedValue(null) },
    } as never);

    await expect(
      repository.delete(
        "products",
        "22222222-2222-4222-8222-222222222222",
        USER_ID,
        async () => undefined,
      ),
    ).resolves.toEqual({
      status: "referenced",
      reference: { label: "SKU", skuCount: 1, hasInventory: false, hasHistory: false },
    });
    await expect(
      repository.delete(
        "product-categories",
        "33333333-3333-4333-8333-333333333333",
        USER_ID,
        async () => undefined,
      ),
    ).resolves.toEqual({ status: "referenced", reference: { label: "子分类" } });
  });

  it("blocks Supplier delete when purchase order references exist", async () => {
    const repository = testRepository({
      inbound_orders: { count: vi.fn().mockResolvedValue(0) },
      product_suppliers: { count: vi.fn().mockResolvedValue(0) },
      purchase_orders: { count: vi.fn().mockResolvedValue(1) },
      purchase_payments: { count: vi.fn().mockResolvedValue(0) },
      purchase_returns: { count: vi.fn().mockResolvedValue(0) },
      suppliers: {
        deleteMany: vi.fn(),
        findFirst: vi.fn().mockResolvedValue({
          id: "22222222-2222-4222-8222-222222222222",
          supplier_code: "SUP-UAT-001",
        }),
      },
    } as never);

    await expect(
      repository.delete(
        "suppliers",
        "22222222-2222-4222-8222-222222222222",
        USER_ID,
        async () => undefined,
      ),
    ).resolves.toEqual({ status: "referenced", reference: { label: "采购订单记录" } });
  });

  it("deletes unreferenced Supplier and Warehouse master data", async () => {
    const supplierDeleteMany = vi.fn().mockResolvedValue({ count: 1 });
    const warehouseDeleteMany = vi.fn().mockResolvedValue({ count: 1 });
    const zeroCount = vi.fn().mockResolvedValue(0);
    const repository = testRepository({
      cross_border_shipments: { count: zeroCount },
      damage_reports: { count: zeroCount },
      import_task_items: { count: zeroCount },
      import_tasks: { count: zeroCount },
      inbound_orders: { count: zeroCount },
      inspection_orders: { count: zeroCount },
      inventories: { count: zeroCount },
      inventory_adjustments: { count: zeroCount },
      inventory_alerts: { count: zeroCount },
      inventory_transactions: { count: zeroCount },
      outbound_orders: { count: zeroCount },
      product_suppliers: { count: zeroCount },
      production_completion_records: { count: zeroCount },
      purchase_orders: { count: zeroCount },
      purchase_payments: { count: zeroCount },
      purchase_returns: { count: zeroCount },
      role_warehouses: { count: zeroCount },
      sales_returns: { count: zeroCount },
      stock_counts: { count: zeroCount },
      suppliers: {
        deleteMany: supplierDeleteMany,
        findFirst: vi.fn().mockResolvedValue({
          id: "22222222-2222-4222-8222-222222222222",
          supplier_code: "SUP-UAT-001",
        }),
      },
      transfer_orders: { count: zeroCount },
      warehouses: {
        deleteMany: warehouseDeleteMany,
        findFirst: vi.fn().mockResolvedValue({
          id: "33333333-3333-4333-8333-333333333333",
          warehouse_code: "WH-UAT-001",
        }),
      },
    } as never);

    await expect(
      repository.delete(
        "suppliers",
        "22222222-2222-4222-8222-222222222222",
        USER_ID,
        async () => undefined,
      ),
    ).resolves.toEqual({
      id: "22222222-2222-4222-8222-222222222222",
      status: "deleted",
    });
    await expect(
      repository.delete(
        "warehouses",
        "33333333-3333-4333-8333-333333333333",
        USER_ID,
        async () => undefined,
      ),
    ).resolves.toEqual({
      id: "33333333-3333-4333-8333-333333333333",
      status: "deleted",
    });
  });

  it("blocks Warehouse delete when inventory exists and protects system records", async () => {
    const repository = testRepository({
      inventories: { count: vi.fn().mockResolvedValue(1) },
      warehouses: {
        deleteMany: vi.fn(),
        findFirst: vi.fn().mockResolvedValue({
          id: "33333333-3333-4333-8333-333333333333",
          warehouse_code: "WH-UAT-001",
        }),
      },
    } as never);
    await expect(
      repository.delete(
        "warehouses",
        "33333333-3333-4333-8333-333333333333",
        USER_ID,
        async () => undefined,
      ),
    ).resolves.toEqual({ status: "referenced", reference: { label: "库存记录" } });

    const systemRepository = testRepository({
      products: {
        deleteMany: vi.fn(),
        findFirst: vi.fn().mockResolvedValue({
          id: "22222222-2222-4222-8222-222222222222",
          product_code: "SYS-PRD-001",
        }),
      },
    } as never);
    await expect(
      systemRepository.delete(
        "products",
        "22222222-2222-4222-8222-222222222222",
        USER_ID,
        async () => undefined,
      ),
    ).resolves.toEqual({ status: "system" });
  });

  it("applies store role scope before pagination and maps platform summary", async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        ecommerce_platforms: {
          id: "33333333-3333-4333-8333-333333333333",
          platform_code: "PLT-001",
          platform_name: "测试平台",
        },
        id: "22222222-2222-4222-8222-222222222222",
        is_active: true,
        store_code: "STR-001",
        store_name: "测试店铺",
        updated_at: new Date("2026-07-23T00:00:00.000Z"),
      },
    ]);
    const count = vi.fn().mockResolvedValue(1);
    const repository = testRepository({
      stores: { count, findMany },
    } as never);

    const result = await repository.list(
      "stores",
      {
        filters: { countryCode: "CN" },
        isActive: true,
        page: 1,
        pageSize: 20,
        sortBy: "updatedAt",
        sortOrder: "desc",
      },
      USER_ID,
    );

    expect(result.items[0]).toMatchObject({
      platform: { platformCode: "PLT-001", platformName: "测试平台" },
      storeCode: "STR-001",
      storeName: "测试店铺",
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: expect.arrayContaining([
            expect.objectContaining({
              role_stores: expect.objectContaining({ some: expect.any(Object) }),
            }),
            { country_code: "CN" },
            { is_active: true },
          ]),
        },
      }),
    );
  });
});
