import { ForbiddenError, recordAuditEvent, type RequestContext } from "@violin-erp/api";
import type { Prisma } from "../generated/prisma/client.js";
import { PrismaAuditWriter } from "../audit/prisma-audit-writer.js";

// CR-009: callable only within the transaction that creates the target object,
// or the explicitly approved WH-000009 maintenance method. Never a general grant API.
export async function initializeMasterDataScope(
  transaction: Prisma.TransactionClient,
  resource: "warehouses" | "stores",
  targetId: string,
  actorUserId: string,
  context: RequestContext,
): Promise<void> {
  const now = new Date();
  const permission = resource === "warehouses" ? "master.warehouse.create" : "master.store.create";
  const roles = await transaction.roles.findMany({
    where: {
      is_active: true,
      user_roles: {
        some: {
          user_id: actorUserId,
          effective_from: { lte: now },
          OR: [{ effective_to: null }, { effective_to: { gt: now } }],
          users_user_roles_user_idTousers: { is_active: true, status: "active" },
        },
      },
      role_permissions: { some: { permissions: { permission_code: permission, is_active: true } } },
    },
    select: { id: true },
  });
  if (roles.length === 0) throw new ForbiddenError("当前没有可初始化新对象范围的有效创建角色");
  const data = roles.map((role) => ({
    role_id: role.id,
    access_level: "manage",
    assigned_at: now,
    assigned_by: actorUserId,
    created_by: actorUserId,
    updated_by: actorUserId,
  }));
  if (resource === "warehouses") {
    await transaction.role_warehouses.createMany({
      data: data.map((item) => ({ ...item, warehouse_id: targetId })),
    });
  } else {
    await transaction.role_stores.createMany({
      data: data.map((item) => ({ ...item, store_id: targetId })),
    });
  }
  await recordAuditEvent(
    new PrismaAuditWriter(transaction),
    {
      action: "initialize-scope",
      actorUserId,
      moduleCode: resource === "warehouses" ? "master.warehouse" : "master.store",
      requestId: context.requestId,
      resourceId: targetId,
      resourceType: resource,
      result: "success",
      timestamp: new Date(context.timestamp),
      beforeSnapshot: { roleIds: [] },
      afterSnapshot: { roleIds: roles.map((role) => role.id), accessLevel: "manage" },
    },
    { failureMode: "required" },
  );
}
