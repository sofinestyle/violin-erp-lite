import {
  ConflictError,
  isPermissionCode,
  ValidationError,
  type ScopeAssignment,
  type SecurityListQuery,
  type SecurityListResult,
  type SecurityRecord,
  type SecurityRepository,
  type UserRoleAssignment,
} from "@violin-erp/api";
import { getPrismaClient } from "../client.js";
import type { Prisma, PrismaClient } from "../generated/prisma/client.js";

const userSelect = {
  id: true,
  username: true,
  display_name: true,
  email: true,
  phone: true,
  status: true,
  must_change_password: true,
  last_login_at: true,
  failed_login_count: true,
  locked_until: true,
  is_active: true,
  created_at: true,
  created_by: true,
  updated_at: true,
  updated_by: true,
  disabled_at: true,
  disabled_by: true,
  user_roles_user_roles_user_idTousers: {
    select: {
      effective_from: true,
      effective_to: true,
      assigned_at: true,
      assigned_by: true,
      roles: { select: { id: true, role_code: true, role_name: true, is_active: true } },
    },
  },
} as const;

const roleSelect = {
  id: true,
  role_code: true,
  role_name: true,
  description: true,
  is_system_role: true,
  is_active: true,
  created_at: true,
  created_by: true,
  updated_at: true,
  updated_by: true,
  disabled_at: true,
  disabled_by: true,
  _count: { select: { role_permissions: true, user_roles: true } },
} as const;

const permissionSelect = {
  id: true,
  permission_code: true,
  permission_name: true,
  module_code: true,
  action_code: true,
  description: true,
  is_active: true,
  created_at: true,
  updated_at: true,
} as const;

type JsonRecord = Record<string, unknown>;
const SNAKE_BOUNDARY = /_([a-z])/g;
const CAMEL_BOUNDARY = /[A-Z]/g;
const toCamel = (value: string) =>
  value.replace(SNAKE_BOUNDARY, (_, letter: string) => letter.toUpperCase());
const toSnake = (value: string) =>
  value.replace(CAMEL_BOUNDARY, (letter) => `_${letter.toLowerCase()}`);

function prismaErrorCode(error: unknown): string | undefined {
  return error && typeof error === "object" && "code" in error
    ? String((error as { code: unknown }).code)
    : undefined;
}

function normalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [toCamel(key), normalize(item)]),
    );
  }
  return value;
}

function securityRecord(value: object): SecurityRecord {
  return normalize(value) as SecurityRecord;
}

function roleRecord(
  value: {
    _count: { role_permissions: number; user_roles: number };
  } & Record<string, unknown>,
): SecurityRecord {
  const { _count, ...role } = value;
  return securityRecord({
    ...role,
    permission_count: _count.role_permissions,
    user_count: _count.user_roles,
  });
}

function whereFor(
  kind: "permissions" | "roles" | "users",
  query: SecurityListQuery,
): Prisma.permissionsWhereInput | Prisma.rolesWhereInput | Prisma.usersWhereInput {
  const filters: JsonRecord[] = Object.entries(query.filters).map(([key, value]) => {
    if (kind === "users" && key === "roleCode") {
      return {
        user_roles_user_roles_user_idTousers: {
          some: { roles: { role_code: value, is_active: true } },
        },
      };
    }
    return { [toSnake(key)]: value };
  });
  if (query.keyword) {
    const fields =
      kind === "users"
        ? ["username", "display_name", "email", "phone"]
        : kind === "roles"
          ? ["role_code", "role_name"]
          : ["permission_code", "permission_name"];
    filters.push({
      OR: fields.map((field) => ({
        [field]: { contains: query.keyword, mode: "insensitive" },
      })),
    });
  }
  return { AND: filters };
}

function listResult(
  items: readonly object[],
  total: number,
  query: SecurityListQuery,
): SecurityListResult {
  return {
    items: items.map(securityRecord),
    page: query.page,
    pageSize: query.pageSize,
    total,
  };
}

function pagination(query: SecurityListQuery) {
  return {
    orderBy: { [toSnake(query.sortBy)]: query.sortOrder },
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
  };
}

async function ensureActiveIds(
  transaction: Prisma.TransactionClient,
  kind: "permissions" | "roles" | "stores" | "warehouses",
  ids: readonly string[],
): Promise<void> {
  if (ids.length === 0) return;
  const model = transaction as unknown as Record<
    string,
    { count: (args: JsonRecord) => Promise<number> }
  >;
  const count = await model[kind]!.count({ where: { id: { in: ids }, is_active: true } });
  if (count !== ids.length) {
    throw new ValidationError("关系集合包含不存在、停用或不可访问的记录");
  }
}

async function ensureManageableScopes(
  transaction: Prisma.TransactionClient,
  scope: "stores" | "warehouses",
  ids: readonly string[],
  actorUserId: string,
): Promise<void> {
  if (ids.length === 0) return;
  const now = new Date();
  const activeAssignment = {
    user_id: actorUserId,
    effective_from: { lte: now },
    OR: [{ effective_to: null }, { effective_to: { gt: now } }],
    roles: { is_active: true },
  };
  const count =
    scope === "stores"
      ? await transaction.stores.count({
          where: {
            id: { in: [...ids] },
            is_active: true,
            role_stores: {
              some: {
                access_level: "manage",
                roles: { user_roles: { some: activeAssignment } },
              },
            },
          },
        })
      : await transaction.warehouses.count({
          where: {
            id: { in: [...ids] },
            is_active: true,
            role_warehouses: {
              some: {
                access_level: "manage",
                roles: { user_roles: { some: activeAssignment } },
              },
            },
          },
        });
  if (count !== ids.length) {
    throw new ValidationError("数据范围包含操作者无权管理、不存在或停用的记录");
  }
}

async function ensureAssignablePermissions(
  transaction: Prisma.TransactionClient,
  permissionIds: readonly string[],
  actorUserId: string,
): Promise<void> {
  if (permissionIds.length === 0) return;
  const now = new Date();
  const [targets, actorAssignments] = await Promise.all([
    transaction.permissions.findMany({
      select: { id: true, permission_code: true },
      where: { id: { in: [...permissionIds] }, is_active: true },
    }),
    transaction.user_roles.findMany({
      select: {
        roles: {
          select: {
            role_permissions: {
              select: {
                permissions: { select: { is_active: true, permission_code: true } },
              },
            },
          },
        },
      },
      where: {
        effective_from: { lte: now },
        OR: [{ effective_to: null }, { effective_to: { gt: now } }],
        roles: { is_active: true },
        user_id: actorUserId,
      },
    }),
  ]);
  const actorPermissions = new Set(
    actorAssignments.flatMap((assignment) =>
      assignment.roles.role_permissions
        .filter((relation) => relation.permissions.is_active)
        .map((relation) => relation.permissions.permission_code),
    ),
  );
  if (
    targets.length !== permissionIds.length ||
    targets.some(
      (target) =>
        !isPermissionCode(target.permission_code) || !actorPermissions.has(target.permission_code),
    )
  ) {
    throw new ValidationError("权限集合包含未批准、停用或操作者无权授予的权限");
  }
}

export class PrismaSecurityRepository implements SecurityRepository {
  readonly #client: PrismaClient;

  constructor(client: PrismaClient = getPrismaClient()) {
    this.#client = client;
  }

  async actorHasRole(actorUserId: string, roleId: string): Promise<boolean> {
    const now = new Date();
    return (
      (await this.#client.user_roles.count({
        where: {
          effective_from: { lte: now },
          OR: [{ effective_to: null }, { effective_to: { gt: now } }],
          roles: { is_active: true },
          role_id: roleId,
          user_id: actorUserId,
        },
      })) > 0
    );
  }

  async listUsers(query: SecurityListQuery): Promise<SecurityListResult> {
    const where = whereFor("users", query) as Prisma.usersWhereInput;
    const [items, total] = await Promise.all([
      this.#client.users.findMany({ ...pagination(query), select: userSelect, where }),
      this.#client.users.count({ where }),
    ]);
    return listResult(items, total, query);
  }

  async findUser(id: string): Promise<SecurityRecord | null> {
    const item = await this.#client.users.findUnique({ select: userSelect, where: { id } });
    return item ? securityRecord(item) : null;
  }

  async createUser(
    data: Readonly<Record<string, unknown>>,
    assignments: readonly UserRoleAssignment[],
    actorUserId: string,
  ): Promise<SecurityRecord> {
    try {
      return await this.#client.$transaction(async (transaction) => {
        await ensureActiveIds(
          transaction,
          "roles",
          assignments.map((item) => item.roleId),
        );
        const now = new Date();
        const item = await transaction.users.create({
          data: {
            created_by: actorUserId,
            display_name: String(data.displayName),
            email: data.email as string | null,
            failed_login_count: 0,
            must_change_password: Boolean(data.mustChangePassword),
            password_hash: String(data.passwordHash),
            phone: data.phone as string | null,
            status: "active",
            updated_by: actorUserId,
            username: String(data.username),
            user_roles_user_roles_user_idTousers: {
              create: assignments.map((assignment) => ({
                assigned_at: now,
                assigned_by: actorUserId,
                created_by: actorUserId,
                effective_from: new Date(assignment.effectiveFrom),
                effective_to: assignment.effectiveTo ? new Date(assignment.effectiveTo) : null,
                role_id: assignment.roleId,
                updated_by: actorUserId,
              })),
            },
          },
          select: userSelect,
        });
        return securityRecord(item);
      });
    } catch (error) {
      if (prismaErrorCode(error) === "P2002") {
        throw new ConflictError("用户名已存在");
      }
      throw error;
    }
  }

  async updateUser(
    id: string,
    data: Readonly<Record<string, unknown>>,
    updatedAt: string,
    actorUserId: string,
  ): Promise<SecurityRecord | null> {
    const result = await this.#client.users.updateMany({
      data: {
        display_name: String(data.displayName),
        email: data.email as string | null,
        phone: data.phone as string | null,
        updated_at: new Date(),
        updated_by: actorUserId,
        username: String(data.username),
      },
      where: { id, updated_at: new Date(updatedAt) },
    });
    return result.count === 1 ? this.findUser(id) : null;
  }

  async setUserActive(
    id: string,
    isActive: boolean,
    updatedAt: string,
    actorUserId: string,
  ): Promise<SecurityRecord | null> {
    const result = await this.#client.users.updateMany({
      data: {
        disabled_at: isActive ? null : new Date(),
        disabled_by: isActive ? null : actorUserId,
        is_active: isActive,
        status: isActive ? "active" : "disabled",
        updated_at: new Date(),
        updated_by: actorUserId,
      },
      where: { id, updated_at: new Date(updatedAt) },
    });
    return result.count === 1 ? this.findUser(id) : null;
  }

  async updateUserPassword(
    id: string,
    passwordHash: string,
    mustChangePassword: boolean,
    updatedAt: string,
    actorUserId: string,
  ): Promise<SecurityRecord | null> {
    const result = await this.#client.users.updateMany({
      data: {
        must_change_password: mustChangePassword,
        password_hash: passwordHash,
        updated_at: new Date(),
        updated_by: actorUserId,
      },
      where: { id, updated_at: new Date(updatedAt) },
    });
    return result.count === 1 ? this.findUser(id) : null;
  }

  async listRoles(query: SecurityListQuery): Promise<SecurityListResult> {
    const where = whereFor("roles", query) as Prisma.rolesWhereInput;
    const [items, total] = await Promise.all([
      this.#client.roles.findMany({ ...pagination(query), select: roleSelect, where }),
      this.#client.roles.count({ where }),
    ]);
    return listResult(items.map(roleRecord), total, query);
  }

  async findRole(id: string): Promise<SecurityRecord | null> {
    const item = await this.#client.roles.findUnique({ select: roleSelect, where: { id } });
    return item ? roleRecord(item) : null;
  }

  async createRole(
    data: Readonly<Record<string, unknown>>,
    actorUserId: string,
  ): Promise<SecurityRecord> {
    try {
      const item = await this.#client.roles.create({
        data: {
          created_by: actorUserId,
          description: data.description as string | null,
          is_system_role: Boolean(data.isSystemRole),
          role_code: String(data.roleCode),
          role_name: String(data.roleName),
          updated_by: actorUserId,
        },
        select: roleSelect,
      });
      return roleRecord(item);
    } catch (error) {
      if (prismaErrorCode(error) === "P2002") {
        throw new ConflictError("角色代码或名称已存在");
      }
      throw error;
    }
  }

  async updateRole(
    id: string,
    data: Readonly<Record<string, unknown>>,
    updatedAt: string,
    actorUserId: string,
  ): Promise<SecurityRecord | null> {
    const result = await this.#client.roles.updateMany({
      data: {
        description: data.description as string | null,
        role_name: String(data.roleName),
        updated_at: new Date(),
        updated_by: actorUserId,
      },
      where: { id, updated_at: new Date(updatedAt) },
    });
    return result.count === 1 ? this.findRole(id) : null;
  }

  async setRoleActive(
    id: string,
    isActive: boolean,
    updatedAt: string,
    actorUserId: string,
  ): Promise<SecurityRecord | null> {
    const result = await this.#client.roles.updateMany({
      data: {
        disabled_at: isActive ? null : new Date(),
        disabled_by: isActive ? null : actorUserId,
        is_active: isActive,
        updated_at: new Date(),
        updated_by: actorUserId,
      },
      where: { id, updated_at: new Date(updatedAt) },
    });
    return result.count === 1 ? this.findRole(id) : null;
  }

  async listPermissions(query: SecurityListQuery): Promise<SecurityListResult> {
    const where = whereFor("permissions", query) as Prisma.permissionsWhereInput;
    const [items, total] = await Promise.all([
      this.#client.permissions.findMany({
        ...pagination(query),
        select: permissionSelect,
        where,
      }),
      this.#client.permissions.count({ where }),
    ]);
    return listResult(items, total, query);
  }

  async readRolePermissions(roleId: string): Promise<readonly SecurityRecord[]> {
    const items = await this.#client.role_permissions.findMany({
      orderBy: { permissions: { permission_code: "asc" } },
      select: {
        granted_at: true,
        granted_by: true,
        permissions: { select: permissionSelect },
      },
      where: { role_id: roleId },
    });
    return items.map((item) =>
      securityRecord({
        ...item.permissions,
        granted_at: item.granted_at,
        granted_by: item.granted_by,
      }),
    );
  }

  async readUserRoles(userId: string): Promise<readonly SecurityRecord[]> {
    const items = await this.#client.user_roles.findMany({
      orderBy: { roles: { role_code: "asc" } },
      select: {
        id: true,
        effective_from: true,
        effective_to: true,
        assigned_at: true,
        assigned_by: true,
        roles: { select: roleSelect },
      },
      where: { user_id: userId },
    });
    return items.map(securityRecord);
  }

  async replaceRolePermissions(
    roleId: string,
    permissionIds: readonly string[],
    updatedAt: string,
    actorUserId: string,
  ): Promise<SecurityRecord | null> {
    const changed = await this.#client.$transaction(async (transaction) => {
      await ensureAssignablePermissions(transaction, permissionIds, actorUserId);
      const update = await transaction.roles.updateMany({
        data: { updated_at: new Date(), updated_by: actorUserId },
        where: { id: roleId, updated_at: new Date(updatedAt) },
      });
      if (update.count !== 1) return false;
      await transaction.role_permissions.deleteMany({ where: { role_id: roleId } });
      if (permissionIds.length > 0) {
        const now = new Date();
        await transaction.role_permissions.createMany({
          data: permissionIds.map((permissionId) => ({
            created_by: actorUserId,
            granted_at: now,
            granted_by: actorUserId,
            permission_id: permissionId,
            role_id: roleId,
            updated_by: actorUserId,
          })),
        });
      }
      return true;
    });
    return changed ? this.findRole(roleId) : null;
  }

  async replaceUserRoles(
    userId: string,
    assignments: readonly UserRoleAssignment[],
    updatedAt: string,
    actorUserId: string,
  ): Promise<SecurityRecord | null> {
    const changed = await this.#client.$transaction(async (transaction) => {
      await ensureActiveIds(
        transaction,
        "roles",
        assignments.map((item) => item.roleId),
      );
      const update = await transaction.users.updateMany({
        data: { updated_at: new Date(), updated_by: actorUserId },
        where: { id: userId, updated_at: new Date(updatedAt) },
      });
      if (update.count !== 1) return false;
      await transaction.user_roles.deleteMany({ where: { user_id: userId } });
      const now = new Date();
      await transaction.user_roles.createMany({
        data: assignments.map((assignment) => ({
          assigned_at: now,
          assigned_by: actorUserId,
          created_by: actorUserId,
          effective_from: new Date(assignment.effectiveFrom),
          effective_to: assignment.effectiveTo ? new Date(assignment.effectiveTo) : null,
          role_id: assignment.roleId,
          updated_by: actorUserId,
          user_id: userId,
        })),
      });
      return true;
    });
    return changed ? this.findUser(userId) : null;
  }

  async readRoleScopes(
    roleId: string,
    scope: "stores" | "warehouses",
  ): Promise<readonly SecurityRecord[]> {
    if (scope === "stores") {
      const items = await this.#client.role_stores.findMany({
        orderBy: { stores: { store_code: "asc" } },
        select: {
          id: true,
          access_level: true,
          assigned_at: true,
          assigned_by: true,
          created_at: true,
          updated_at: true,
          stores: {
            select: {
              id: true,
              store_code: true,
              store_name: true,
              ecommerce_platforms: {
                select: { id: true, platform_code: true, platform_name: true },
              },
            },
          },
        },
        where: { role_id: roleId },
      });
      return items.map((item) =>
        securityRecord({
          access_level: item.access_level,
          assigned_at: item.assigned_at,
          assigned_by: item.assigned_by,
          created_at: item.created_at,
          platform_code: item.stores.ecommerce_platforms.platform_code,
          platform_id: item.stores.ecommerce_platforms.id,
          platform_name: item.stores.ecommerce_platforms.platform_name,
          store_code: item.stores.store_code,
          store_id: item.stores.id,
          store_name: item.stores.store_name,
          updated_at: item.updated_at,
        }),
      );
    }
    const items = await this.#client.role_warehouses.findMany({
      orderBy: { warehouses: { warehouse_code: "asc" } },
      select: {
        id: true,
        access_level: true,
        assigned_at: true,
        assigned_by: true,
        created_at: true,
        updated_at: true,
        warehouses: {
          select: {
            id: true,
            warehouse_code: true,
            warehouse_name: true,
            warehouse_type: true,
          },
        },
      },
      where: { role_id: roleId },
    });
    return items.map((item) =>
      securityRecord({
        access_level: item.access_level,
        assigned_at: item.assigned_at,
        assigned_by: item.assigned_by,
        created_at: item.created_at,
        updated_at: item.updated_at,
        warehouse_code: item.warehouses.warehouse_code,
        warehouse_id: item.warehouses.id,
        warehouse_name: item.warehouses.warehouse_name,
        warehouse_type: item.warehouses.warehouse_type,
      }),
    );
  }

  async replaceRoleScopes(
    roleId: string,
    scope: "stores" | "warehouses",
    assignments: readonly ScopeAssignment[],
    updatedAt: string,
    actorUserId: string,
  ): Promise<SecurityRecord | null> {
    const changed = await this.#client.$transaction(async (transaction) => {
      const currentAssignments =
        scope === "stores"
          ? await transaction.role_stores.findMany({
              select: { store_id: true },
              where: { role_id: roleId },
            })
          : await transaction.role_warehouses.findMany({
              select: { warehouse_id: true },
              where: { role_id: roleId },
            });
      await ensureManageableScopes(
        transaction,
        scope,
        [
          ...assignments.map((item) => item.targetId),
          ...currentAssignments.map((item) =>
            "store_id" in item ? item.store_id : item.warehouse_id,
          ),
        ].filter((id, index, ids) => ids.indexOf(id) === index),
        actorUserId,
      );
      const update = await transaction.roles.updateMany({
        data: { updated_at: new Date(), updated_by: actorUserId },
        where: { id: roleId, updated_at: new Date(updatedAt) },
      });
      if (update.count !== 1) return false;
      const now = new Date();
      if (scope === "stores") {
        await transaction.role_stores.deleteMany({ where: { role_id: roleId } });
        if (assignments.length > 0) {
          await transaction.role_stores.createMany({
            data: assignments.map((assignment) => ({
              access_level: assignment.accessLevel,
              assigned_at: now,
              assigned_by: actorUserId,
              created_by: actorUserId,
              role_id: roleId,
              store_id: assignment.targetId,
              updated_by: actorUserId,
            })),
          });
        }
      } else {
        await transaction.role_warehouses.deleteMany({ where: { role_id: roleId } });
        if (assignments.length > 0) {
          await transaction.role_warehouses.createMany({
            data: assignments.map((assignment) => ({
              access_level: assignment.accessLevel,
              assigned_at: now,
              assigned_by: actorUserId,
              created_by: actorUserId,
              role_id: roleId,
              updated_by: actorUserId,
              warehouse_id: assignment.targetId,
            })),
          });
        }
      }
      return true;
    });
    return changed ? this.findRole(roleId) : null;
  }
}
