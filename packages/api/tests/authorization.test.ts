import { describe, expect, it } from "vitest";
import {
  DATA_SCOPE_TYPES,
  PERMISSION_CODES,
  ROLE_CODES,
  ROLE_PERMISSION_MAP,
  isPermissionCode,
  requireAllPermissions,
  requireAnyPermission,
  requireAuthentication,
  requirePermission,
  type AuthenticationContext,
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
