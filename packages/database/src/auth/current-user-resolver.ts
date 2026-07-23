import {
  DATA_SCOPE_TYPES,
  isPermissionCode,
  isRoleCode,
  type AuthenticatedUser,
  type CurrentUserResolver,
  type DataScopeType,
} from "@violin-erp/api";
import type { PrismaClient } from "../generated/prisma/client.js";
import { getPrismaClient } from "../client.js";

export function createCurrentUserResolver(client?: PrismaClient): CurrentUserResolver {
  return async (userId): Promise<AuthenticatedUser | null> => {
    const database = client ?? getPrismaClient();
    const now = new Date();
    const user = await database.users.findFirst({
      select: {
        id: true,
        username: true,
        user_roles_user_roles_user_idTousers: {
          select: {
            roles: {
              select: {
                role_code: true,
                role_permissions: {
                  select: { permissions: { select: { permission_code: true, is_active: true } } },
                },
                role_stores: { select: { id: true }, take: 1 },
                role_warehouses: { select: { id: true }, take: 1 },
              },
            },
          },
          where: {
            effective_from: { lte: now },
            OR: [{ effective_to: null }, { effective_to: { gt: now } }],
            roles: { is_active: true },
          },
        },
      },
      where: { id: userId, is_active: true },
    });
    if (!user) return null;

    const roleCodes = user.user_roles_user_roles_user_idTousers
      .map((assignment) => assignment.roles.role_code)
      .filter(isRoleCode);
    const permissionCodes = user.user_roles_user_roles_user_idTousers
      .flatMap((assignment) => assignment.roles.role_permissions)
      .filter((assignment) => assignment.permissions.is_active)
      .map((assignment) => assignment.permissions.permission_code)
      .filter(isPermissionCode);
    const scopes = new Set<DataScopeType>();
    if (roleCodes.includes("administrator")) scopes.add("all");
    if (
      user.user_roles_user_roles_user_idTousers.some(
        (assignment) => assignment.roles.role_warehouses.length > 0,
      )
    ) {
      scopes.add("warehouse");
      scopes.add("manufacturer_derived");
    }
    if (
      user.user_roles_user_roles_user_idTousers.some(
        (assignment) => assignment.roles.role_stores.length > 0,
      )
    ) {
      scopes.add("store");
    }
    if (scopes.size === 0) scopes.add("business_related");

    return {
      dataScopes: [...scopes].filter((scope) => DATA_SCOPE_TYPES.includes(scope)),
      permissionCodes: [...new Set(permissionCodes)],
      roleCodes: [...new Set(roleCodes)],
      userId: user.id,
      username: user.username,
    };
  };
}
