import { describe, it, expect, vi } from "vitest";
import { initializeMasterDataScope } from "../src/master-data/initialize-master-data-scope";
import { PrismaMasterDataRepository } from "../src/index";
const actor = "11111111-1111-4111-8111-111111111111";
const target = "22222222-2222-4222-8222-222222222222";
const role = "33333333-3333-4333-8333-333333333333";
const context = {
  requestId: "44444444-4444-4444-8444-444444444444",
  requestTraceId: "trace",
  timestamp: new Date().toISOString(),
};
function client() {
  return {
    roles: { findMany: vi.fn().mockResolvedValue([{ id: role }]) },
    role_warehouses: { createMany: vi.fn() },
    role_stores: { createMany: vi.fn() },
    audit_logs: { create: vi.fn() },
  };
}
describe("CR-009 scope initialization", () => {
  it.each(["warehouses", "stores"] as const)(
    "grants only current eligible roles and audits %s",
    async (resource) => {
      const tx = client();
      await initializeMasterDataScope(tx as never, resource, target, actor, context);
      const query = tx.roles.findMany.mock.calls[0]![0];
      expect(query.where).toMatchObject({
        is_active: true,
        user_roles: {
          some: {
            user_id: actor,
            users_user_roles_user_idTousers: { is_active: true, status: "active" },
            OR: [{ effective_to: null }, { effective_to: { gt: expect.any(Date) } }],
          },
        },
        role_permissions: {
          some: {
            permissions: {
              permission_code:
                resource === "warehouses" ? "master.warehouse.create" : "master.store.create",
              is_active: true,
            },
          },
        },
      });
      const relation = resource === "warehouses" ? tx.role_warehouses : tx.role_stores;
      expect(relation.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            role_id: role,
            access_level: "manage",
            assigned_by: actor,
            [resource === "warehouses" ? "warehouse_id" : "store_id"]: target,
          }),
        ],
      });
      expect(tx.audit_logs.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action_code: "initialize-scope",
          object_id: target,
          request_trace_id: context.requestId,
          user_id: actor,
          after_snapshot: { roleIds: [role], accessLevel: "manage" },
        }),
      });
    },
  );
  it("rejects absent eligible role without granting or auditing", async () => {
    const tx = client();
    tx.roles.findMany.mockResolvedValue([]);
    await expect(
      initializeMasterDataScope(tx as never, "warehouses", target, actor, context),
    ).rejects.toThrow("有效创建角色");
    expect(tx.role_warehouses.createMany).not.toHaveBeenCalled();
    expect(tx.audit_logs.create).not.toHaveBeenCalled();
  });
  it("propagates audit failure to abort the caller transaction", async () => {
    const tx = client();
    tx.audit_logs.create.mockRejectedValue(new Error("AUDIT_FAIL"));
    await expect(
      initializeMasterDataScope(tx as never, "stores", target, actor, context),
    ).rejects.toThrow();
  });
  it("keeps explicit warehouse code creation and scope in the same transaction", async () => {
    const tx = {
      ...client(),
      warehouses: {
        create: vi.fn().mockResolvedValue({ id: target }),
        findFirst: vi.fn().mockResolvedValue({ id: target, warehouse_code: "UAT-SCOPE-WH" }),
      },
    };
    const transaction = vi.fn(async (work) => work(tx));
    const repository = new PrismaMasterDataRepository({ $transaction: transaction } as never);
    await repository.create("warehouses", { warehouseCode: "UAT-SCOPE-WH" }, actor, context);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(tx.role_warehouses.createMany).toHaveBeenCalledTimes(1);
  });
  it("does not expose a general historical object scope repair", async () => {
    const tx = { warehouses: { findFirst: vi.fn().mockResolvedValue(null) } };
    const repository = new PrismaMasterDataRepository({
      $transaction: async (work: (value: unknown) => unknown) => work(tx),
    } as never);
    await expect(
      repository.repairApprovedDiagnosticWarehouse(
        {
          user: {
            userId: actor,
            username: "uat",
            roleCodes: ["administrator"],
            permissionCodes: [
              "master.warehouse.create",
              "security.role.assign",
              "security.permission.assign",
            ],
            dataScopes: [],
          },
        },
        context,
      ),
    ).rejects.toThrow("获批诊断仓库");
    expect(tx.warehouses.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          warehouse_code: "WH-000009",
          warehouse_name: "UAT-WAREHOUSE-CHECK",
          created_by: actor,
        },
      }),
    );
  });
});
