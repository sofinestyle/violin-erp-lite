import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { MasterDataService, type AuthenticationContext } from "@violin-erp/api";
import {
  createPrismaClient,
  createCurrentUserResolver,
  PrismaMasterDataRepository,
  PrismaAuditWriter,
} from "../src/index";
import { REFERENCE_CHECKS } from "../src/master-data/prisma-master-data-repository";

const enabled = process.env.UX_SAFE_DELETE_UAT === "1";
const context = () => ({ requestId: randomUUID(), timestamp: new Date().toISOString() });
describe.skipIf(!enabled)("CR-010 real PostgreSQL and HTTP", () => {
  let db: ReturnType<typeof createPrismaClient>;
  let token: string;
  let auth: AuthenticationContext;
  let service: MasterDataService;
  let platformId: string;
  const created: { resource: string; id: string }[] = [];
  async function api(path: string, method = "GET", body?: unknown) {
    const response = await fetch(`http://localhost:3100/api/v1/${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Client-Type": "pc",
        "Idempotency-Key": randomUUID(),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, ...(await response.json()) };
  }
  async function create(resource: string, body: unknown) {
    const result = await api(resource, "POST", body);
    expect(result.success, result.error?.code).toBe(true);
    created.push({ resource, id: result.data.id });
    return result.data;
  }
  const warehouseInput = () => ({
    warehouseName: "UAT-WH-SAFE-DELETE",
    warehouseType: "overseas",
    ownerType: "company",
    countryCode: "US",
    allowsAvailableStock: true,
    sortOrder: 0,
  });
  const storeInput = () => ({
    storeName: "UAT-STORE-DELETE-CHECK",
    platformId,
    countryCode: "US",
    currencyCode: "USD",
    externalStoreId: `TEMU-UAT-${randomUUID().slice(0, 8)}`,
  });
  beforeAll(async () => {
    db = createPrismaClient(process.env.DATABASE_URL);
    const login = await api("auth/login", "POST", {
      loginType: "password",
      username: process.env.CODE_GENERATION_UAT_USERNAME,
      password: process.env.CODE_GENERATION_UAT_PASSWORD,
    });
    if (!login.success) throw new Error(login.error?.code ?? "LOGIN_FAILED");
    token = login.data.accessToken;
    const session = await api("auth/session");
    const user = await createCurrentUserResolver(db)(session.data.userId);
    if (!user) throw new Error("USER_UNAVAILABLE");
    auth = { user };
    service = new MasterDataService(new PrismaMasterDataRepository(db), new PrismaAuditWriter(db));
    platformId = (await db.ecommerce_platforms.findFirstOrThrow({ where: { is_active: true } })).id;
  });
  afterAll(async () => {
    for (const item of [...created].reverse()) {
      const record = await api(`${item.resource}/${item.id}`);
      if (record.status === 404) continue;
      const deleted = await api(`${item.resource}/${item.id}`, "DELETE");
      expect(deleted.success, deleted.error?.code).toBe(true);
    }
    await db.$disconnect();
  });
  it("covers every actual Store/Warehouse business FK in the PostgreSQL catalog", async () => {
    const fks = await db.$queryRawUnsafe<{ target: string; source: string; field: string }[]>(
      `SELECT target.relname::text AS target, source.relname::text AS source, a.attname::text AS field FROM pg_constraint c JOIN pg_class target ON target.oid=c.confrelid JOIN pg_class source ON source.oid=c.conrelid JOIN LATERAL unnest(c.conkey) k(attnum) ON true JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.attnum WHERE c.contype='f' AND target.relname IN ('stores','warehouses')`,
    );
    for (const resource of ["stores", "warehouses"] as const) {
      expect(
        fks
          .filter((fk) => fk.target === resource && fk.source !== `role_${resource}`)
          .map((fk) => `${fk.source}.${fk.field}`)
          .sort(),
      ).toEqual(REFERENCE_CHECKS[resource].map((fk) => `${fk.model}.${fk.field}`).sort());
    }
  });
  it.each(["stores", "warehouses"] as const)(
    "HTTP deletes unreferenced %s with scopes and a committed audit",
    async (resource) => {
      const row = await create(resource, resource === "stores" ? storeInput() : warehouseInput());
      expect(row[resource === "stores" ? "storeCode" : "warehouseCode"]).toMatch(
        resource === "stores" ? /^STR-\d{6}$/ : /^WH-\d{6}$/,
      );
      const before =
        resource === "stores"
          ? await db.role_stores.count({ where: { store_id: row.id } })
          : await db.role_warehouses.count({ where: { warehouse_id: row.id } });
      expect(before).toBeGreaterThan(0);
      const result = await api(`${resource}/${row.id}`, "DELETE");
      expect(result.status).toBe(200);
      expect(result.data.deleted).toBe(true);
      expect(
        await db.audit_logs.count({
          where: { object_id: row.id, action_code: "delete", operation_result: "success" },
        }),
      ).toBe(1);
      expect(await db[resource].count({ where: { id: row.id } })).toBe(0);
      const after =
        resource === "stores"
          ? await db.role_stores.count({ where: { store_id: row.id } })
          : await db.role_warehouses.count({ where: { warehouse_id: row.id } });
      expect(after).toBe(0);
    },
  );
  it.each(["stores", "warehouses"] as const)(
    "real Audit INSERT failure rolls %s and its scopes back",
    async (resource) => {
      const row = await create(resource, resource === "stores" ? storeInput() : warehouseInput());
      const originalScopes =
        resource === "stores"
          ? await db.role_stores.findMany({ where: { store_id: row.id } })
          : await db.role_warehouses.findMany({ where: { warehouse_id: row.id } });
      const write = PrismaAuditWriter.prototype.write;
      const spy = vi
        .spyOn(PrismaAuditWriter.prototype, "write")
        .mockImplementationOnce(function (event) {
          return write.call(this, { ...event, resourceId: "invalid-audit-uuid" });
        });
      try {
        await expect(service.delete(resource, row.id, auth, context())).rejects.toMatchObject({
          code: "SYSTEM_AUDIT_UNAVAILABLE",
        });
      } finally {
        spy.mockRestore();
      }
      expect(await db[resource].count({ where: { id: row.id } })).toBe(1);
      expect(
        resource === "stores"
          ? await db.role_stores.findMany({ where: { store_id: row.id } })
          : await db.role_warehouses.findMany({ where: { warehouse_id: row.id } }),
      ).toEqual(originalScopes);
      expect(
        await db.audit_logs.count({ where: { object_id: row.id, action_code: "delete" } }),
      ).toBe(0);
    },
  );
  it("refuses actual import business references without persisting diagnostic history", async () => {
    const store = await create("stores", storeInput());
    const warehouse = await create("warehouses", warehouseInput());
    const rollback = new Error("UAT_FIXTURE_ROLLBACK");
    await expect(
      db.$transaction(async (tx) => {
        for (const target of [{ store_id: store.id }, { warehouse_id: warehouse.id }])
          await tx.import_tasks.create({
            data: {
              task_no: `UAT-DELETE-${randomUUID().slice(0, 8)}`,
              import_type: "outbound",
              file_name: "UAT-DELETE.csv",
              file_reference: "UAT-DELETE",
              file_checksum: "a".repeat(64),
              status: "pending_validation",
              total_rows: 0,
              success_rows: 0,
              failed_rows: 0,
              warning_rows: 0,
              ...target,
              created_by: auth.user.userId,
              updated_by: auth.user.userId,
            },
          });
        const adapter = new Proxy(tx, {
          get(target, prop) {
            if (prop === "$transaction")
              return (work: (client: unknown) => unknown) => work(target);
            return Reflect.get(target, prop);
          },
        });
        const transactional = new MasterDataService(
          new PrismaMasterDataRepository(adapter as never),
          new PrismaAuditWriter(tx),
        );
        await expect(
          transactional.delete("stores", store.id, auth, context()),
        ).rejects.toMatchObject({
          code: "CONFLICT_REQUEST",
          message: "该店铺已被业务记录引用，无法删除，请停用。",
        });
        await expect(
          transactional.delete("warehouses", warehouse.id, auth, context()),
        ).rejects.toMatchObject({
          code: "CONFLICT_REQUEST",
          message: "该仓库存在库存或历史业务记录，无法删除，请停用。",
        });
        expect(await tx.role_stores.count({ where: { store_id: store.id } })).toBeGreaterThan(0);
        expect(
          await tx.role_warehouses.count({ where: { warehouse_id: warehouse.id } }),
        ).toBeGreaterThan(0);
        throw rollback;
      }),
    ).rejects.toBe(rollback);
    expect(await db.import_tasks.count({ where: { store_id: store.id } })).toBe(0);
  });
  it("waits for a concurrent business FK writer before deleting the warehouse", async () => {
    const row = await create("warehouses", warehouseInput());
    let release!: () => void;
    let ready!: (pid: number) => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const started = new Promise<number>((resolve) => {
      ready = resolve;
    });
    const rollback = new Error("UAT_CONCURRENT_REFERENCE_ROLLBACK");
    const writer = db
      .$transaction(
        async (tx) => {
          await tx.import_tasks.create({
            data: {
              task_no: `UAT-LOCK-${randomUUID().slice(0, 8)}`,
              import_type: "outbound",
              file_name: "UAT-LOCK.csv",
              file_reference: "UAT-LOCK",
              file_checksum: "b".repeat(64),
              status: "pending_validation",
              total_rows: 0,
              success_rows: 0,
              failed_rows: 0,
              warning_rows: 0,
              warehouse_id: row.id,
              created_by: auth.user.userId,
              updated_by: auth.user.userId,
            },
          });
          const [backend] = await tx.$queryRawUnsafe<{ pid: number }[]>(
            "SELECT pg_backend_pid() AS pid",
          );
          ready(backend!.pid);
          await gate;
          throw rollback;
        },
        { timeout: 10000 },
      )
      .catch((error: unknown) => {
        if (error !== rollback) throw error;
      });
    const pid = await started;
    const deletion = service.delete("warehouses", row.id, auth, context());
    let blocked = false;
    try {
      for (let attempt = 0; attempt < 40; attempt += 1) {
        const waiters = await db.$queryRawUnsafe<{ waiting: boolean }[]>(
          "SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE $1::integer = ANY(pg_blocking_pids(pid))) AS waiting",
          pid,
        );
        if (waiters[0]?.waiting) {
          blocked = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
    } finally {
      release();
    }
    await writer;
    expect((await deletion).deleted).toBe(true);
    expect(blocked).toBe(true);
    expect(await db.import_tasks.count({ where: { warehouse_id: row.id } })).toBe(0);
  });

  it("HTTP derives levels, rejects cycles, and synchronizes moved descendants", async () => {
    const root = await create("product-categories", {
      categoryName: "UAT-UX-提琴",
      categoryLevel: 99,
      sortOrder: 0,
    });
    const child = await create("product-categories", {
      categoryName: "UAT-UX-小提琴",
      parentCategoryId: root.id,
      categoryLevel: 99,
      sortOrder: 0,
    });
    const leaf = await create("product-categories", {
      categoryName: "UAT-UX-三级",
      parentCategoryId: child.id,
      categoryLevel: 99,
      sortOrder: 0,
    });
    expect([root.categoryLevel, child.categoryLevel, leaf.categoryLevel]).toEqual([1, 2, 3]);
    for (const parentCategoryId of [root.id, leaf.id]) {
      const response = await api(`product-categories/${root.id}`, "PATCH", {
        parentCategoryId,
        updatedAt: root.updatedAt,
      });
      expect(response.success).toBe(false);
      expect(response.error.message).toContain("循环");
    }
    const moved = await api(`product-categories/${child.id}`, "PATCH", {
      parentCategoryId: null,
      updatedAt: child.updatedAt,
    });
    expect(moved.success, moved.error?.code).toBe(true);
    expect((await api(`product-categories/${leaf.id}`)).data.categoryLevel).toBe(2);
    expect(
      await db.audit_logs.count({
        where: { object_id: leaf.id, action_code: "update-derived-level" },
      }),
    ).toBe(1);
  });
  it("serializes concurrent opposite reparent requests so only one can succeed", async () => {
    const a = await create("product-categories", {
      categoryName: "UAT-UX-CONCURRENT-A",
      categoryLevel: 1,
      sortOrder: 0,
    });
    const b = await create("product-categories", {
      categoryName: "UAT-UX-CONCURRENT-B",
      categoryLevel: 1,
      sortOrder: 0,
    });
    const results = await Promise.all([
      api(`product-categories/${a.id}`, "PATCH", {
        parentCategoryId: b.id,
        updatedAt: a.updatedAt,
      }),
      api(`product-categories/${b.id}`, "PATCH", {
        parentCategoryId: a.id,
        updatedAt: b.updatedAt,
      }),
    ]);
    expect(results.filter((result) => result.success)).toHaveLength(1);
    expect(results.filter((result) => !result.success)[0].error.message).toContain("循环");
    const records = await db.product_categories.findMany({
      where: { id: { in: [a.id, b.id] } },
      orderBy: { category_level: "desc" },
    });
    for (const row of records)
      expect((await api(`product-categories/${row.id}`, "DELETE")).success).toBe(true);
  });
});
