import { describe, expect, it } from "vitest";
import {
  DATA_SCOPE_TYPES,
  PERMISSION_CODES,
  ROLE_CODES,
  ROLE_PERMISSION_MAP,
  createAuthenticatedUser,
  isPermissionCode,
  resolveDataScopes,
  requireAllPermissions,
  requireAnyPermission,
  requireAuthentication,
  requirePermission,
  type AuthenticationContext,
  type AuthUserRecord,
  type PermissionCode,
} from "../src/index";

function context(permissionCodes: readonly PermissionCode[]): AuthenticationContext {
  return {
    user: {
      dataScopes: ["warehouse"],
      permissionCodes,
      roleCodes: ["warehouse_staff"],
      userId: "11111111-1111-4111-8111-111111111111",
      username: "warehouse-user",
    },
  };
}

describe("Frozen RBAC catalog", () => {
  it("contains exactly the Frozen roles, data scopes and 244 permissions", () => {
    expect(ROLE_CODES).toEqual([
      "administrator",
      "purchaser",
      "warehouse_staff",
      "sales_staff",
      "company_principal",
    ]);
    expect(DATA_SCOPE_TYPES).toHaveLength(6);
    expect(PERMISSION_CODES).toHaveLength(244);
    expect(new Set(PERMISSION_CODES)).toHaveLength(244);
    expect(PERMISSION_CODES.every(isPermissionCode)).toBe(true);
  });

  it("assigns every permission and keeps every role non-empty", () => {
    const assigned = new Set(Object.values(ROLE_PERMISSION_MAP).flat());

    expect(ROLE_PERMISSION_MAP.administrator).toEqual(PERMISSION_CODES);
    expect(assigned).toEqual(new Set(PERMISSION_CODES));
    expect(Object.values(ROLE_PERMISSION_MAP).every((permissions) => permissions.length > 0)).toBe(
      true,
    );
  });
});

describe("authorization guards", () => {
  const authenticated = context(["purchase.order.read", "purchase.order.create"]);

  it("rejects missing authentication", () => {
    expect(() => requireAuthentication(undefined)).toThrowError(
      expect.objectContaining({ code: "AUTH_UNAUTHORIZED" }),
    );
  });

  it("enforces one permission", () => {
    expect(requirePermission(authenticated, "purchase.order.read")).toBe(authenticated);
    expect(() => requirePermission(authenticated, "purchase.order.approve")).toThrowError(
      expect.objectContaining({ code: "PERMISSION_FORBIDDEN" }),
    );
  });

  it("enforces any and all permissions with default denial for empty lists", () => {
    expect(
      requireAnyPermission(authenticated, ["purchase.order.approve", "purchase.order.read"]),
    ).toBe(authenticated);
    expect(
      requireAllPermissions(authenticated, ["purchase.order.read", "purchase.order.create"]),
    ).toBe(authenticated);
    expect(() => requireAnyPermission(authenticated, [])).toThrowError(
      expect.objectContaining({ code: "PERMISSION_FORBIDDEN" }),
    );
    expect(() =>
      requireAllPermissions(authenticated, ["purchase.order.read", "purchase.order.approve"]),
    ).toThrowError(expect.objectContaining({ code: "PERMISSION_FORBIDDEN" }));
  });
});

describe("canonical data-scope resolution", () => {
  const warehouseScope = {
    accessLevel: "operate" as const,
    targetId: "22222222-2222-4222-8222-222222222222",
  };
  const storeScope = {
    accessLevel: "read" as const,
    targetId: "33333333-3333-4333-8333-333333333333",
  };

  it("never grants all from an administrator role name", () => {
    const user: AuthUserRecord = {
      displayName: "管理员",
      failedLoginCount: 0,
      id: "11111111-1111-4111-8111-111111111111",
      isActive: true,
      lockedUntil: null,
      mustChangePassword: false,
      passwordHash: "redacted",
      permissions: [
        {
          actionCode: "read",
          moduleCode: "master.product",
          permissionCode: "master.product.read",
        },
      ],
      roles: [
        {
          id: "44444444-4444-4444-8444-444444444444",
          roleCode: "administrator",
          roleName: "管理员",
        },
      ],
      status: "active",
      storeScopes: [],
      username: "admin",
      warehouseScopes: [],
      wechatBound: false,
    };

    expect(createAuthenticatedUser(user).dataScopes).toEqual(["business_related"]);
  });

  it("defaults to no scope when no current permission is granted", () => {
    expect(
      resolveDataScopes({
        permissionCodes: [],
        storeScopes: [storeScope],
        warehouseScopes: [warehouseScope],
      }),
    ).toEqual([]);
  });

  it("unions permission-derived, warehouse and store scopes deterministically", () => {
    expect(
      resolveDataScopes({
        permissionCodes: ["purchase.order.read", "purchase.order.create", "purchase.order.read"],
        storeScopes: [storeScope, storeScope],
        warehouseScopes: [warehouseScope, warehouseScope],
      }),
    ).toEqual(["self_created", "business_related", "warehouse", "store", "manufacturer_derived"]);
  });

  it("honors only a trusted explicit all grant as the dominant scope", () => {
    expect(
      resolveDataScopes({
        explicitDataScopes: ["all", "business_related"],
        permissionCodes: ["purchase.order.read"],
        storeScopes: [storeScope],
        warehouseScopes: [warehouseScope],
      }),
    ).toEqual(["all"]);
  });
});
