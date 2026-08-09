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
