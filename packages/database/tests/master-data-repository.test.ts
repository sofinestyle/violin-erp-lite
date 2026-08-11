import { describe, expect, it, vi } from "vitest";
import { PrismaMasterDataRepository } from "../src/index";

const USER_ID = "11111111-1111-4111-8111-111111111111";

describe("Prisma Master Data repository", () => {
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
    const repository = new PrismaMasterDataRepository({
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
    const repository = new PrismaMasterDataRepository({
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
    const repository = new PrismaMasterDataRepository({
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
    const repository = new PrismaMasterDataRepository({
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
