import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { MasterDataService, type AuthenticationContext } from "@violin-erp/api";
import { createPrismaClient, PrismaAuditWriter, PrismaMasterDataRepository } from "../src/index";

const databaseUrl = process.env.MASTER_DATA_DELETE_INTEGRATION_DATABASE_URL;

describe.skipIf(!databaseUrl)("real Prisma safe delete transaction", () => {
  let db: ReturnType<typeof createPrismaClient>;
  let service: MasterDataService;
  const tag = `UAT-DELETE-${randomUUID().slice(0, 8)}`;
  const brandIds: string[] = [];
  const productIds: string[] = [];
  const request = { requestId: randomUUID(), timestamp: new Date().toISOString() };
  let authentication: AuthenticationContext;
  let originalBrands: unknown;

  beforeAll(async () => {
    db = createPrismaClient(databaseUrl!);
    service = new MasterDataService(new PrismaMasterDataRepository(db), new PrismaAuditWriter(db));
    originalBrands = await db.brands.findMany({ orderBy: { id: "asc" } });
    const user = await db.users.findFirstOrThrow({ where: { username: "dev-admin" } });
    authentication = {
      user: {
        userId: user.id,
        username: user.username,
        roleCodes: ["administrator"],
        permissionCodes: [],
        dataScopes: ["all"],
      },
    };
  });

  async function brand(suffix: string, system = false) {
    const record = await db.brands.create({
      data: {
        brand_code: `${system ? "SYS-" : ""}${tag}-${suffix}`,
        brand_name: `${tag}-${suffix}`,
        created_by: authentication.user.userId,
        updated_by: authentication.user.userId,
      },
    });
    brandIds.push(record.id);
    return record;
  }

  afterAll(async () => {
    try {
      // Only this test's exact fixture IDs are removed; never touch UAT/business records.
      await db.products.deleteMany({ where: { id: { in: productIds } } });
      await db.brands.deleteMany({ where: { id: { in: brandIds } } });
      await db.audit_logs.deleteMany({
        where: { request_trace_id: request.requestId, object_id: { in: brandIds } },
      });
      expect(await db.brands.findMany({ orderBy: { id: "asc" } })).toEqual(originalBrands);
    } finally {
      await db.$disconnect();
    }
  });

  it("denies a non-administrator even with brand.update", async () => {
    const record = await brand("DENIED");
    const editor: AuthenticationContext = {
      user: {
        ...authentication.user,
        roleCodes: ["sales"],
        permissionCodes: ["master.brand.update"],
      },
    };
    await expect(service.delete("brands", record.id, editor, request)).rejects.toMatchObject({
      httpStatus: 403,
    });
    expect(await db.brands.count({ where: { id: record.id } })).toBe(1);
    expect(await db.audit_logs.count({ where: { object_id: record.id } })).toBe(0);
  });

  it("commits administrator deletion and real audit together without update permission", async () => {
    const record = await brand("SUCCESS");
    await expect(service.delete("brands", record.id, authentication, request)).resolves.toEqual({
      deleted: true,
      id: record.id,
    });
    expect(await db.brands.count({ where: { id: record.id } })).toBe(0);
    expect(
      await db.audit_logs.count({
        where: {
          object_id: record.id,
          request_trace_id: request.requestId,
          action_code: "delete",
          operation_result: "success",
        },
      }),
    ).toBe(1);
  });

  it("rolls back deletion when the real audit INSERT fails", async () => {
    const record = await brand("ROLLBACK");
    const write = PrismaAuditWriter.prototype.write;
    const spy = vi
      .spyOn(PrismaAuditWriter.prototype, "write")
      .mockImplementationOnce(function (event) {
        // Force PostgreSQL UUID validation failure, not an in-memory Audit Writer.
        return write.call(this, { ...event, resourceId: "invalid-audit-uuid" });
      });
    try {
      await expect(
        service.delete("brands", record.id, authentication, request),
      ).rejects.toMatchObject({ code: "SYSTEM_AUDIT_UNAVAILABLE", httpStatus: 503 });
      expect(spy).toHaveBeenCalledTimes(1);
    } finally {
      spy.mockRestore();
    }
    expect(await db.brands.count({ where: { id: record.id } })).toBe(1);
    expect(await db.audit_logs.count({ where: { object_id: record.id } })).toBe(0);
  });

  it("protects active and inactive product references without success audit", async () => {
    const record = await brand("REFERENCED");
    const template = await db.products.findFirstOrThrow();
    const product = await db.products.create({
      data: {
        product_code: `${tag}-PRD`,
        product_name: `${tag}-引用测试`,
        product_name_en: `${tag}-MODEL`,
        category_id: template.category_id,
        brand_id: record.id,
        product_type: template.product_type,
        default_unit: template.default_unit,
        created_by: authentication.user.userId,
        updated_by: authentication.user.userId,
      },
    });
    productIds.push(product.id);
    for (const active of [true, false]) {
      if (!active)
        await db.products.update({
          where: { id: product.id },
          data: {
            is_active: false,
            disabled_at: new Date(),
            disabled_by: authentication.user.userId,
          },
        });
      await expect(service.delete("brands", record.id, authentication, request)).rejects.toThrow(
        "该品牌已被产品引用，无法删除，请停用。",
      );
    }
    expect(await db.brands.count({ where: { id: record.id } })).toBe(1);
    expect(await db.audit_logs.count({ where: { object_id: record.id } })).toBe(0);
  });

  it("protects temporary system-code markers without success audit", async () => {
    const record = await brand("SYSTEM", true);
    await expect(service.delete("brands", record.id, authentication, request)).rejects.toThrow(
      "系统数据不可删除。",
    );
    expect(await db.brands.count({ where: { id: record.id } })).toBe(1);
    expect(await db.audit_logs.count({ where: { object_id: record.id } })).toBe(0);
  });
});
