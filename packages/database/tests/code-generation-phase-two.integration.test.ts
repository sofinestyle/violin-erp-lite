import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  MasterDataService,
  AppError,
  type AuthenticationContext,
  type MasterDataResourceKey,
} from "@violin-erp/api";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createPrismaClient,
  PrismaMasterDataRepository,
  CodeGenerationService,
  PrismaAuditWriter,
} from "../src/index";

// Explicit opt-in: uses the existing local UAT API and only tagged new fixtures.
const enabled = process.env.CODE_GENERATION_PHASE_TWO_UAT === "1";
const serviceTransport = process.env.CODE_GENERATION_UAT_TRANSPORT === "service";
const cases = [
  [
    "product-categories",
    "product_categories",
    "category",
    "categoryCode",
    "category_code",
    "CAT",
    "categoryName",
  ],
  ["brands", "brands", "brand", "brandCode", "brand_code", "BRD", "brandName"],
  [
    "ecommerce-platforms",
    "ecommerce_platforms",
    "platform",
    "platformCode",
    "platform_code",
    "PLT",
    "platformName",
  ],
  ["stores", "stores", "store", "storeCode", "store_code", "STR", "storeName"],
] as const;

describe.skipIf(!enabled)(
  `Phase 2 real PostgreSQL and ${serviceTransport ? "Service (no HTTP)" : "HTTP"} UAT`,
  () => {
    let db: ReturnType<typeof createPrismaClient>;
    let second: ReturnType<typeof createPrismaClient>;
    let token: string;
    let service: MasterDataService;
    let authentication: AuthenticationContext;
    let userId: string;
    let platformId: string;
    let roleId: string;
    const scopeIds: string[] = [];
    const tag = `UAT-AUTO-${randomUUID().slice(0, 8)}`;
    const created: { resource: string; id: string }[] = [];
    const originals = new Map<string, { id: string; code: string }[]>();
    const base = "http://localhost:3100/api/v1";

    async function api(resource: string, method = "GET", data?: unknown) {
      if (serviceTransport) {
        const [key, id, action] = resource.split("/");
        const kind = key as MasterDataResourceKey;
        const request = { requestId: randomUUID(), timestamp: new Date().toISOString() };
        try {
          const result =
            method === "GET"
              ? await service.detail(kind, id!, authentication, request)
              : method === "DELETE"
                ? await service.delete(kind, id!, authentication, request)
                : method === "PATCH"
                  ? await service.update(kind, id!, data, authentication, request)
                  : action === "disable"
                    ? await service.setActive(kind, id!, false, data, authentication, request)
                    : await service.create(kind, data, authentication, request);
          return { status: 200, body: { success: true, data: result } };
        } catch (error) {
          if (!(error instanceof AppError)) throw error;
          return {
            status: error.httpStatus,
            body: { success: false, error: { code: error.code, message: error.message } },
          };
        }
      }
      const response = await fetch(`${base}/${resource}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-Client-Type": "pc",
          "Idempotency-Key": randomUUID(),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(data === undefined ? {} : { body: JSON.stringify(data) }),
      });
      return { status: response.status, body: await response.json() };
    }
    async function scopeStore(storeId: string) {
      const row = await db.role_stores.create({
        data: {
          role_id: roleId,
          store_id: storeId,
          access_level: "manage",
          assigned_at: new Date(),
          assigned_by: userId,
          created_by: userId,
          updated_by: userId,
        },
      });
      scopeIds.push(row.id);
    }
    async function create(resource: string, data: Record<string, unknown>) {
      const result = await api(resource, "POST", data);
      if (result.body.success && result.body.data?.id)
        created.push({ resource, id: result.body.data.id });
      expect(result.body.success, JSON.stringify(result.body.error)).toBe(true);
      if (resource === "stores") await scopeStore(result.body.data.id);
      return result.body.data;
    }
    async function sequence(type: string) {
      return db.code_sequences.findFirstOrThrow({ where: { code_type: type } });
    }
    beforeAll(async () => {
      console.log(`UAT fixture batch: ${tag}`);
      db = createPrismaClient(process.env.DATABASE_URL!);
      second = createPrismaClient(process.env.DATABASE_URL!);
      for (const [, table, , , column] of cases) {
        originals.set(
          table,
          await db.$queryRawUnsafe(`SELECT id, ${column} AS code FROM ${table} ORDER BY id`),
        );
      }
      const username =
        process.env.CODE_GENERATION_UAT_USERNAME ?? process.env.SEED_ADMIN_USERNAME ?? "dev-admin";
      const user = await db.users.findFirstOrThrow({ where: { username } });
      userId = user.id;
      const role = await db.roles.findFirstOrThrow({
        where: { role_code: "administrator", user_roles: { some: { user_id: userId } } },
      });
      roleId = role.id;
      if (serviceTransport) {
        service = new MasterDataService(
          new PrismaMasterDataRepository(db),
          new PrismaAuditWriter(db),
        );
        authentication = {
          user: {
            userId,
            username,
            roleCodes: ["administrator"],
            dataScopes: ["all"],
            permissionCodes: (await db.permissions.findMany()).map(
              (row) => row.permission_code,
            ) as AuthenticationContext["user"]["permissionCodes"],
          },
        };
      } else {
        const login = await api("auth/login", "POST", {
          loginType: "password",
          username,
          password: process.env.CODE_GENERATION_UAT_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD,
        });
        expect(login.body.success, JSON.stringify(login.body.error)).toBe(true);
        token = login.body.data.accessToken;
      }
      platformId = (
        await create("ecommerce-platforms", {
          platformName: `${tag}-PARENT`,
          platformType: "cross_border",
          isCrossBorder: true,
        })
      ).id;
    }, 30000);

    afterAll(async () => {
      try {
        // Clean through existing APIs only; platforms/stores have no approved delete API.
        for (const item of [...created].reverse()) {
          const current = await api(`${item.resource}/${item.id}`);
          if (!current.body.success) continue;
          const record = current.body.data;
          const deletable = ["brands", "product-categories"].includes(item.resource);
          const deleted = deletable ? await api(`${item.resource}/${item.id}`, "DELETE") : null;
          if (!deleted?.body.success) {
            const disabled = await api(`${item.resource}/${item.id}/disable`, "POST", {
              updatedAt: record.updatedAt,
              reason: `${tag} 验证完成`,
            });
            expect(disabled.body.success, JSON.stringify(disabled.body.error)).toBe(true);
          }
        }
        for (const [, table, , , column] of cases) {
          const current = await db.$queryRawUnsafe<{ id: string; code: string }[]>(
            `SELECT id, ${column} AS code FROM ${table} ORDER BY id`,
          );
          const ids = new Set(originals.get(table)!.map((row) => row.id));
          expect(current.filter((row) => ids.has(row.id))).toEqual(originals.get(table));
        }
      } finally {
        if (scopeIds.length) await db.role_stores.deleteMany({ where: { id: { in: scopeIds } } });
        await db?.$disconnect();
        await second?.$disconnect();
      }
    }, 60000);

    it("repeats data-only initialization without resetting sequences or duplicating rules", async () => {
      const before = await db.code_sequences.findMany({ orderBy: { id: "asc" } });
      const rules = await db.code_generation_rules.findMany({ orderBy: { id: "asc" } });
      const sql = readFileSync(
        new URL(
          "../../../prisma/migrations/20260908090000_seed_code_generation_phase_2/migration.sql",
          import.meta.url,
        ),
        "utf8",
      );
      for (let run = 0; run < 2; run++) {
        for (const statement of sql.split(";").filter((text) => text.includes("INSERT INTO")))
          await db.$executeRawUnsafe(statement);
      }
      expect(await db.code_sequences.findMany({ orderBy: { id: "asc" } })).toEqual(before);
      expect(await db.code_generation_rules.findMany({ orderBy: { id: "asc" } })).toEqual(rules);
    });

    it.each(cases)(
      "verifies automatic, legacy, concurrent and rollback behavior for %s",
      async (resource, table, type, field, column, prefix, nameField) => {
        const payload: Record<string, unknown> = {
          [nameField]:
            resource === "product-categories"
              ? `${tag}-提琴测试分类`
              : `${tag}-${type.toUpperCase()}`,
          ...(resource === "product-categories" ? { categoryLevel: 1, sortOrder: 0 } : {}),
          ...(resource === "ecommerce-platforms"
            ? { platformType: "cross_border", isCrossBorder: true }
            : {}),
          ...(resource === "stores" ? { platformId, countryCode: "US", currencyCode: "USD" } : {}),
        };
        const first = await create(resource, payload);
        expect(first[field]).toMatch(new RegExp(`^${prefix}-\\d{6}$`));
        const before = await sequence(type);
        const concurrent = await Promise.all(
          Array.from({ length: 5 }, (_, index) =>
            create(resource, { ...payload, [nameField]: `${tag}-${type}-CONCURRENT-${index}` }),
          ),
        );
        expect(new Set(concurrent.map((row) => row[field])).size).toBe(5);
        expect((await sequence(type)).current_value).toBe(before.current_value + 5n);
        const legacyCode = `${tag}-${type}-LEGACY`;
        const legacy = await create(resource, {
          ...payload,
          [field]: legacyCode,
          [nameField]: `${tag}-${type}-LEGACY`,
        });
        expect(legacy[field]).toBe(legacyCode);
        const duplicate = await api(resource, "POST", {
          ...payload,
          [field]: legacyCode,
          [nameField]: `${tag}-${type}-DUPLICATE`,
        });
        expect(duplicate.status).toBe(409);
        expect(duplicate.body.error.code).toBe("CONFLICT_REQUEST");
        const invalid = await api(resource, "POST", { ...payload, [field]: 123 });
        expect(invalid.body.error.code).toBe("VALIDATION_INVALID_FIELD");
        const update = await api(`${resource}/${first.id}`, "PATCH", {
          [field]: "CHANGED",
          updatedAt: first.updatedAt,
        });
        expect(update.body.error.code).toBe("VALIDATION_INVALID_FIELD");
        expect((await api(`${resource}/${first.id}`)).body.data[field]).toBe(first[field]);
        if (resource === "stores") {
          expect(first.platformId).toBe(platformId);
          expect(first.externalStoreId).toBeNull();
        }

        // Two independently pooled Prisma clients prove locking isn't process-local state.
        const independent = await Promise.all(
          [db, second].map(async (client, index) => {
            const record = await new PrismaMasterDataRepository(client).create(
              resource,
              { ...payload, [nameField]: `${tag}-${type}-CLIENT-${index}` },
              userId,
            );
            created.push({ resource, id: record.id });
            if (resource === "stores") await scopeStore(record.id);
            return record;
          }),
        );
        expect(independent[0]![field]).not.toBe(independent[1]![field]);
        const saved = await sequence(type);
        const countBefore = await db.$queryRawUnsafe(`SELECT count(*)::int AS count FROM ${table}`);
        const sentinel = new Error("UAT-AUTO intentional transaction rollback");
        await expect(
          db.$transaction(async (transaction) => {
            // Call generation and INSERT in the existing transaction without nesting repositories.
            const generator = new CodeGenerationService();
            const queryClient = transaction as never;
            const occupied = `${prefix}-${String(saved.current_value + 1n).padStart(6, "0")}`;
            await generator.applyMasterDataCode(queryClient, resource, {
              ...payload,
              [field]: occupied,
            });
            // Static case metadata controls SQL identifiers; all values are bound.
            await transaction.$executeRawUnsafe(
              `INSERT INTO ${table} (${column}, ${type === "category" ? "category_name, category_level, sort_order" : type === "brand" ? "brand_name" : type === "platform" ? "platform_name, platform_type, is_cross_border" : "store_name, platform_id, country_code, currency_code"}, created_by, updated_by) VALUES ($1, $2${type === "category" ? ", 1, 0" : type === "platform" ? ", 'cross_border', true" : type === "store" ? ", $5::uuid, 'US', 'USD'" : ""}, $3::uuid, $4::uuid)`,
              occupied.toLowerCase(),
              `${tag}-OCCUPIED`,
              userId,
              userId,
              ...(type === "store" ? [platformId] : []),
            );
            const generated = await generator.applyMasterDataCode(queryClient, resource, payload);
            expect(generated[field]).toBe(
              `${prefix}-${String(saved.current_value + 2n).padStart(6, "0")}`,
            );
            throw sentinel;
          }),
        ).rejects.toBe(sentinel);
        expect(await sequence(type)).toEqual(saved);
        expect(await db.$queryRawUnsafe(`SELECT count(*)::int AS count FROM ${table}`)).toEqual(
          countBefore,
        );
        await expect(
          new PrismaMasterDataRepository(db).create(
            resource,
            { ...payload, [nameField]: `${tag}-${type}-INVALID-ACTOR` },
            randomUUID(),
          ),
        ).rejects.toMatchObject({ code: "VALIDATION_INVALID_FIELD" });
        expect(await sequence(type)).toEqual(saved);
        expect(await db.$queryRawUnsafe(`SELECT count(*)::int AS count FROM ${table}`)).toEqual(
          countBefore,
        );
        console.log(
          JSON.stringify({
            transport: serviceTransport ? "service" : "HTTP",
            resource,
            firstCode: first[field],
            concurrent: concurrent.map((row) => row[field]),
            finalSequence: String(saved.current_value),
            legacy: "pass",
            immutable: "pass",
            rollback: "pass",
            historicalCollision: "pass",
            independentClients: "pass",
          }),
        );
      },
      60000,
    );
  },
);
