import { describe, expect, it, vi } from "vitest";
import { CodeGenerationService } from "../src/index";

function sequentialClient(currentValue = 0) {
  const query = vi
    .fn()
    .mockResolvedValueOnce([
      { code_type: "product", format: "{prefix}-{seq:000000}", prefix: "PRD" },
    ])
    .mockResolvedValueOnce([
      {
        current_value: currentValue,
        id: "11111111-1111-4111-8111-111111111111",
        version: 0,
      },
    ]);
  const execute = vi.fn().mockResolvedValue(1);
  return {
    $executeRawUnsafe: execute,
    $queryRawUnsafe: query,
    execute,
    query,
  };
}

describe("CodeGenerationService", () => {
  it.each([
    ["product-categories", "category", "categoryCode", "CAT"],
    ["brands", "brand", "brandCode", "BRD"],
    ["ecommerce-platforms", "platform", "platformCode", "PLT"],
    ["stores", "store", "storeCode", "STR"],
  ] as const)(
    "locks, skips historical occupancy and serializes explicit codes for %s",
    async (resource, type, field, prefix) => {
      const query = vi
        .fn()
        .mockResolvedValueOnce([{ code_type: type, prefix, format: "{prefix}-{seq:000000}" }])
        .mockResolvedValueOnce([{ id: "sequence", current_value: 0, version: 0 }])
        .mockResolvedValueOnce([{ id: "historical" }])
        .mockResolvedValueOnce([]);
      const execute = vi.fn().mockResolvedValue(1);
      const client = { $queryRawUnsafe: query, $executeRawUnsafe: execute };
      const service = new CodeGenerationService();
      expect(await service.applyMasterDataCode(client, resource, {})).toEqual({
        [field]: `${prefix}-000002`,
      });
      expect(query.mock.calls[1]![0]).toContain("FOR UPDATE");
      expect(execute).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE code_sequences"),
        2,
        "sequence",
      );
      query.mockResolvedValueOnce([{ id: "sequence" }]);
      expect(await service.applyMasterDataCode(client, resource, { [field]: "LEGACY" })).toEqual({
        [field]: "LEGACY",
      });
      expect(query.mock.calls[4]![0]).toContain("FOR UPDATE");
      expect(execute).toHaveBeenCalledTimes(1);
    },
  );

  it("rejects exhausted Phase 2 six-digit space without advancing the sequence", async () => {
    const client = sequentialClient(999999);
    await expect(
      new CodeGenerationService().applyMasterDataCode(client, "brands", {}),
    ).rejects.toMatchObject({ code: "VALIDATION_INVALID_FIELD" });
    expect(client.execute).not.toHaveBeenCalled();
  });

  it("generates sequential Product codes with locked sequence update", async () => {
    const client = sequentialClient(0);
    const service = new CodeGenerationService();

    await expect(service.applyMasterDataCode(client, "products", {})).resolves.toMatchObject({
      productCode: "PRD-000001",
    });
    expect(client.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("FOR UPDATE"),
      "product",
    );
    expect(client.execute).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE code_sequences"),
      1,
      "11111111-1111-4111-8111-111111111111",
    );
  });

  it("keeps legacy submitted codes unchanged", async () => {
    const client = sequentialClient();
    const service = new CodeGenerationService();

    await expect(
      service.applyMasterDataCode(client, "suppliers", { supplierCode: "LEGACY-SUP-001" }),
    ).resolves.toEqual({ supplierCode: "LEGACY-SUP-001" });
    expect(client.query).not.toHaveBeenCalled();
  });

  it("generates SKU code from product model, size and color mappings", async () => {
    const service = new CodeGenerationService();
    const client = {
      products: {
        findFirst: vi.fn().mockResolvedValue({
          product_code: "PRD-000001",
          product_name_en: "L2",
        }),
      },
    };

    await expect(
      service.applyMasterDataCode(client, "skus", {
        color: "黑色",
        productId: "22222222-2222-4222-8222-222222222222",
        size: "4/4",
      }),
    ).resolves.toMatchObject({ skuCode: "L2-44-BK" });
  });

  it("preserves hyphenated Product model semantics when generating SKU codes", async () => {
    const service = new CodeGenerationService();
    const client = {
      products: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce({ product_code: "PRD-000001", product_name_en: "L101-BR" })
          .mockResolvedValueOnce({ product_code: "PRD-000002", product_name_en: "N101-BR" })
          .mockResolvedValueOnce({ product_code: "PRD-000003", product_name_en: " l2 " }),
      },
    };

    await expect(
      service.applyMasterDataCode(client, "skus", {
        color: "黑色",
        productId: "22222222-2222-4222-8222-222222222222",
        size: "4/4",
      }),
    ).resolves.toMatchObject({ skuCode: "L101-BR-44-BK" });
    await expect(
      service.applyMasterDataCode(client, "skus", {
        color: "黑色",
        productId: "22222222-2222-4222-8222-222222222222",
        size: "4/4",
      }),
    ).resolves.toMatchObject({ skuCode: "N101-BR-44-BK" });
    await expect(
      service.applyMasterDataCode(client, "skus", {
        color: "黑色",
        productId: "22222222-2222-4222-8222-222222222222",
        size: "4/4",
      }),
    ).resolves.toMatchObject({ skuCode: "L2-44-BK" });
  });

  it("rejects Product models with spaces, slashes, non-ascii text or malformed separators", async () => {
    const service = new CodeGenerationService();

    for (const productNameEn of ["L 2", "L/2", "小提琴L2", "L2--BR", "-L2", "L2-"]) {
      const client = {
        products: {
          findFirst: vi.fn().mockResolvedValue({
            product_code: "PRD-000001",
            product_name_en: productNameEn,
          }),
        },
      };
      await expect(
        service.applyMasterDataCode(client, "skus", {
          color: "黑色",
          productId: "22222222-2222-4222-8222-222222222222",
          size: "4/4",
        }),
      ).rejects.toMatchObject({ code: "VALIDATION_INVALID_FIELD" });
    }
  });

  it("supports approved extended SKU size and color mappings", async () => {
    const service = new CodeGenerationService();
    const client = {
      products: {
        findFirst: vi.fn().mockResolvedValue({
          product_code: "PRD-000001",
          product_name_en: "L2",
        }),
      },
    };

    await expect(
      service.applyMasterDataCode(client, "skus", {
        color: "黄绿色",
        productId: "22222222-2222-4222-8222-222222222222",
        size: "1/10",
      }),
    ).resolves.toMatchObject({ skuCode: "L2-110-YG" });
    await expect(
      service.applyMasterDataCode(client, "skus", {
        color: "白色",
        productId: "22222222-2222-4222-8222-222222222222",
        size: "无尺寸",
      }),
    ).resolves.toMatchObject({ skuCode: "L2-NS-WH" });
  });

  it("rejects SKU generation when model source is missing", async () => {
    const service = new CodeGenerationService();
    const client = {
      products: {
        findFirst: vi.fn().mockResolvedValue({
          product_code: "PRD-000001",
          product_name_en: null,
        }),
      },
    };

    await expect(
      service.applyMasterDataCode(client, "skus", {
        color: "黑色",
        productId: "22222222-2222-4222-8222-222222222222",
        size: "4/4",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_INVALID_FIELD" });
  });
});
