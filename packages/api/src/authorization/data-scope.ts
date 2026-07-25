import {
  DATA_SCOPE_TYPES,
  isPermissionCode,
  type DataScopeType,
  type PermissionCode,
} from "./permissions.js";

export type DataScopeAssignment = Readonly<{
  accessLevel: "manage" | "operate" | "read";
  targetId: string;
}>;

export type DataScopeResolutionInput = Readonly<{
  /**
   * Only server-trusted, formally granted record scopes may be supplied here.
   * Role names, usernames and client input are never valid sources.
   */
  explicitDataScopes?: readonly DataScopeType[];
  permissionCodes: readonly (PermissionCode | string)[];
  storeScopes: readonly DataScopeAssignment[];
  warehouseScopes: readonly DataScopeAssignment[];
}>;

function hasCreatePermission(permissionCodes: readonly PermissionCode[]): boolean {
  return permissionCodes.some((permissionCode) => {
    const action = permissionCode.slice(permissionCode.lastIndexOf(".") + 1);
    return action === "create" || action.startsWith("create-");
  });
}

/**
 * Resolves the canonical data-scope summary from current RBAC relationships.
 *
 * Priority and merge rules:
 * 1. no current permission means default denial (an empty scope collection);
 * 2. a trusted explicit `all` grant dominates other summary types;
 * 3. warehouse/store assignments are unioned and deduplicated by their callers;
 * 4. manufacturer scope is derived only from an assigned warehouse;
 * 5. record scopes are derived from current permissions, never from role names.
 */
export function resolveDataScopes(input: DataScopeResolutionInput): readonly DataScopeType[] {
  const permissionCodes = [...new Set(input.permissionCodes.filter(isPermissionCode))];
  if (permissionCodes.length === 0) return Object.freeze([]);

  const explicitDataScopes = new Set(
    (input.explicitDataScopes ?? []).filter((scope) => DATA_SCOPE_TYPES.includes(scope)),
  );
  if (explicitDataScopes.has("all")) return Object.freeze(["all"]);

  const resolved = new Set<DataScopeType>(explicitDataScopes);
  resolved.add("business_related");
  if (hasCreatePermission(permissionCodes)) resolved.add("self_created");
  if (input.warehouseScopes.length > 0) {
    resolved.add("warehouse");
    resolved.add("manufacturer_derived");
  }
  if (input.storeScopes.length > 0) resolved.add("store");

  return Object.freeze(DATA_SCOPE_TYPES.filter((scope) => resolved.has(scope)));
}
