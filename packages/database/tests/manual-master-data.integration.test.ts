import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import {
  MasterDataService,
  SecurityManagementService,
  parseMasterDataListQuery,
  type AuthenticationContext,
} from "@violin-erp/api";
import {
  createPrismaClient,
  createCurrentUserResolver,
  PrismaMasterDataRepository,
  PrismaSecurityRepository,
  PrismaAuditWriter,
} from "../src/index";

const enabled = process.env.MANUAL_MASTER_DATA_UAT === "1";
const context = () => ({
  requestId: randomUUID(),
  requestTraceId: randomUUID(),
  timestamp: new Date().toISOString(),
});
describe.skipIf(!enabled)("Manual UAT Bug Batch real HTTP / PostgreSQL", () => {
  let db: ReturnType<typeof createPrismaClient>;
  let token: string;
  let auth: AuthenticationContext;
  let platformId: string;
  let warehouseId: string;
  const tag = `UAT-MANUAL-${randomUUID().slice(0, 8)}`;
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
  async function create(resource: string, input: unknown) {
    const result = await api(resource, "POST", input);
    expect(result.success, result.error?.code).toBe(true);
    expect(result.status).toBe(201);
    created.push({ resource, id: result.data.id });
    return result.data;
  }
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
    expect(session.success).toBe(true);
    const user = await createCurrentUserResolver(db)(session.data.userId);
    if (!user) throw new Error("USER_UNAVAILABLE");
    auth = { user };
    const platform = await create("ecommerce-platforms", {
      platformName: `${tag}-PLATFORM`,
      platformType: "cross_border",
      isCrossBorder: true,
    });
    platformId = platform.id;
  });
  afterAll(async () => {
    for (const item of [...created].reverse()) {
      const current = await api(`${item.resource}/${item.id}`);
      if (!current.success) throw new Error("CLEANUP_SCOPE_MISSING");
      const disabled = await api(`${item.resource}/${item.id}/disable`, "POST", {
        updatedAt: current.data.updatedAt,
        reason: "Manual UAT Bug Batch 自动验证完成",
      });
      expect(disabled.success).toBe(true);
    }
    await db.$disconnect();
  });
  it("creates a warehouse with scope, list visibility, options and audit", async () => {
    const row = await create("warehouses", {
      warehouseName: "UAT-WAREHOUSE-SCOPE-CHECK",
      warehouseType: "overseas",
      ownerType: "company",
      countryCode: "US",
      allowsAvailableStock: true,
      sortOrder: 0,
    });
    warehouseId = row.id;
    expect(row.warehouseCode).toMatch(/^WH-\d{6}$/);
    expect(row.accessLevel).toBe("manage");
    const persisted = await db.warehouses.findUniqueOrThrow({ where: { id: row.id } });
    expect(persisted.is_active).toBe(true);
    for (const path of [
      "warehouses?keyword=UAT-WAREHOUSE-SCOPE-CHECK",
      "warehouses/options?pageSize=100",
    ]) {
      const result = await api(path);
      expect(result.data.some((item: { id: string }) => item.id === row.id)).toBe(true);
    }
    expect(
      await db.audit_logs.count({ where: { object_id: row.id, action_code: "initialize-scope" } }),
    ).toBe(1);
    console.log(
      JSON.stringify({
        warehouseCode: row.warehouseCode,
        list: "visible",
        options: "selectable",
        audit: "recorded",
      }),
    );
  });
  it("accepts optional and real store identifiers, enforces platform uniqueness and preserves relations", async () => {
    const identifiers = [null, "", "TEMU-US-001", "123456789", "AMZJP001", randomUUID()];
    for (const [index, externalStoreId] of identifiers.entries()) {
      const row = await create("stores", {
        storeName: `${tag}-STORE-${index}`,
        platformId,
        externalStoreId,
        countryCode: "US",
        currencyCode: "USD",
      });
      expect(row.storeCode).toMatch(/^STR-\d{6}$/);
      expect(row.externalStoreId).toBe(externalStoreId || null);
      expect(row.platformId).toBe(platformId);
      const persisted = await db.stores.findUniqueOrThrow({ where: { id: row.id } });
      expect(persisted.external_store_id).toBe(externalStoreId || null);
      expect(
        (await api(`stores?keyword=${tag}-STORE-${index}`)).data.some(
          (item: { id: string }) => item.id === row.id,
        ),
      ).toBe(true);
      if (externalStoreId === "TEMU-US-001") {
        const duplicate = await api("stores", "POST", {
          storeName: `${tag}-DUP`,
          platformId,
          externalStoreId,
          countryCode: "US",
          currencyCode: "USD",
        });
        expect(duplicate.status).toBe(409);
        const updated = await api(`stores/${row.id}`, "PATCH", {
          externalStoreId: " TEMU-US-EDIT ",
          updatedAt: row.updatedAt,
        });
        expect(updated.data.externalStoreId).toBe("TEMU-US-EDIT");
        expect(updated.data.platformId).toBe(platformId);
        const second = await create("ecommerce-platforms", {
          platformName: `${tag}-SECOND`,
          platformType: "cross_border",
          isCrossBorder: true,
        });
        await create("stores", {
          storeName: `${tag}-CROSS`,
          platformId: second.id,
          externalStoreId: "TEMU-US-EDIT",
          countryCode: "US",
          currencyCode: "USD",
        });
      }
      console.log(
        JSON.stringify({
          storeCode: row.storeCode,
          identifier: externalStoreId || "empty",
          relation: "correct",
          list: "visible",
        }),
      );
    }
  });
  it("shares scope with same-role existing user and isolates another role in a rolled-back formal assignment", async () => {
    const peer = await db.users.findFirstOrThrow({
      where: {
        username: { startsWith: "uat-" },
        id: { not: auth.user.userId },
        status: "active",
        is_active: true,
      },
    });
    const before = await db.user_roles.findMany({
      where: { user_id: peer.id },
      orderBy: { id: "asc" },
    });
    const roles = await db.roles.findMany({
      where: { role_code: { in: ["administrator", "purchaser"] }, is_active: true },
    });
    const rollback = new Error("ROLLBACK_TEST_IDENTITY");
    await expect(
      db.$transaction(async (tx) => {
        const adapter = new Proxy(tx, {
          get: (target, key) =>
            key === "$transaction"
              ? (work: (value: typeof tx) => unknown) => work(tx)
              : Reflect.get(target, key),
        });
        const security = new SecurityManagementService(
          new PrismaSecurityRepository(adapter as never),
          new PrismaAuditWriter(tx),
        );
        const service = new MasterDataService(
          new PrismaMasterDataRepository(tx as never),
          new PrismaAuditWriter(tx),
        );
        if (!roles.some((role) => role.role_code === "purchaser")) {
          const createdRole = await security.createRole(
            { roleCode: "purchaser", roleName: "UAT-MANUAL-ROLLBACK-ROLE", isSystemRole: false },
            auth,
            context(),
          );
          const readPermission = await tx.permissions.findFirstOrThrow({
            where: { permission_code: "master.warehouse.read", is_active: true },
          });
          await security.replaceRolePermissions(
            createdRole.id,
            {
              permissionIds: [readPermission.id],
              updatedAt: createdRole.updatedAt,
              reason: "仅回滚事务隔离验证",
            },
            auth,
            context(),
          );
          roles.push(await tx.roles.findUniqueOrThrow({ where: { id: createdRole.id } }));
        }

        for (const code of ["administrator", "purchaser"]) {
          const role = roles.find((row) => row.role_code === code)!;
          const current = await tx.users.findUniqueOrThrow({ where: { id: peer.id } });
          await security.replaceUserRoles(
            peer.id,
            {
              roleAssignments: [
                {
                  roleId: role.id,
                  effectiveFrom: new Date(Date.now() - 1000).toISOString(),
                  effectiveTo: null,
                },
              ],
              updatedAt: current.updated_at.toISOString(),
              reason: "UAT 回滚事务身份验证",
            },
            auth,
            context(),
          );
          const user = await createCurrentUserResolver(tx as never)(peer.id);
          expect(user).not.toBeNull();
          const query = parseMasterDataListQuery(
            "warehouses",
            new URLSearchParams({ keyword: "UAT-WAREHOUSE-SCOPE-CHECK", pageSize: "100" }),
          );
          const list = await service.list("warehouses", query, { user: user! });
          expect(list.items.some((row) => row.id === warehouseId)).toBe(code === "administrator");
          if (code === "purchaser")
            await expect(
              service.detail("warehouses", warehouseId, { user: user! }),
            ).rejects.toThrow();
        }
        throw rollback;
      }),
    ).rejects.toBe(rollback);
    expect(
      await db.user_roles.findMany({ where: { user_id: peer.id }, orderBy: { id: "asc" } }),
    ).toEqual(before);
    expect((await db.users.findUniqueOrThrow({ where: { id: peer.id } })).updated_at).toEqual(
      peer.updated_at,
    );
  });
  it("rolls back new object, scope and sequence when initialization audit fails", async () => {
    const before = await db.code_sequences.findMany({ orderBy: { id: "asc" } });
    const bad = db.$extends({
      query: {
        audit_logs: {
          create() {
            throw new Error("INJECTED_AUDIT_FAILURE");
          },
        },
      },
    });
    const repo = new PrismaMasterDataRepository(bad as never);
    await expect(
      repo.create(
        "warehouses",
        {
          warehouseName: `${tag}-ROLLBACK`,
          warehouseType: "overseas",
          ownerType: "company",
          countryCode: "US",
          allowsAvailableStock: true,
          sortOrder: 0,
        },
        auth.user.userId,
        context(),
      ),
    ).rejects.toThrow();
    expect(await db.warehouses.count({ where: { warehouse_name: `${tag}-ROLLBACK` } })).toBe(0);
    expect(await db.code_sequences.findMany({ orderBy: { id: "asc" } })).toEqual(before);
  });
});
