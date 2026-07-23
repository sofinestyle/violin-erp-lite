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
});
