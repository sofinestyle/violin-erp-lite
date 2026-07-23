import { describe, expect, it, vi } from "vitest";
import {
  ACCESS_LEVELS,
  InMemoryAuditWriter,
  SecurityManagementService,
  type AuthenticationContext,
  type SecurityRepository,
} from "../src/index";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const ROLE_ID = "22222222-2222-4222-8222-222222222222";

function auth(
  permissions: AuthenticationContext["user"]["permissionCodes"],
): AuthenticationContext {
  return {
    user: {
      dataScopes: ["all"],
      permissionCodes: permissions,
      roleCodes: ["administrator"],
      userId: USER_ID,
      username: "admin",
    },
  };
}

function repository(): SecurityRepository {
  const role = { id: ROLE_ID, roleCode: "administrator", updatedAt: "2026-07-23T00:00:00Z" };
  return {
    actorHasRole: vi.fn().mockResolvedValue(false),
    createRole: vi.fn().mockResolvedValue(role),
    createUser: vi.fn().mockResolvedValue({ id: ROLE_ID }),
    findRole: vi.fn().mockResolvedValue(role),
    findUser: vi.fn().mockResolvedValue({ id: ROLE_ID }),
    listPermissions: vi.fn(),
    listRoles: vi.fn(),
    listUsers: vi.fn(),
    readRolePermissions: vi.fn().mockResolvedValue([]),
    readRoleScopes: vi.fn().mockResolvedValue([]),
    readUserRoles: vi.fn().mockResolvedValue([]),
    replaceRolePermissions: vi.fn().mockResolvedValue(role),
    replaceRoleScopes: vi.fn().mockResolvedValue(role),
    replaceUserRoles: vi.fn().mockResolvedValue({ id: ROLE_ID }),
    setRoleActive: vi.fn().mockResolvedValue(role),
    setUserActive: vi.fn().mockResolvedValue({ id: ROLE_ID }),
    updateRole: vi.fn().mockResolvedValue(role),
    updateUser: vi.fn().mockResolvedValue({ id: ROLE_ID }),
    updateUserPassword: vi.fn().mockResolvedValue({ id: ROLE_ID }),
  };
}

describe("SEC-006—SEC-025 service foundation", () => {
  it("uses the DATABASE_ENUM_SPEC access_level set only", () => {
    expect(ACCESS_LEVELS).toEqual(["read", "operate", "manage"]);
  });

  it("requires both assign permissions and validates Replace scope DTO", async () => {
    const store = repository();
    const service = new SecurityManagementService(store, new InMemoryAuditWriter());
    const context = {
      requestId: "33333333-3333-4333-8333-333333333333",
      timestamp: "2026-07-23T00:00:00.000Z",
    };
    const input = {
      reason: "授权调整",
      updatedAt: "2026-07-23T00:00:00.000Z",
      warehouseAssignments: [{ accessLevel: "manage", warehouseId: ROLE_ID }],
    };

    await expect(
      service.replaceRoleScopes(
        ROLE_ID,
        "warehouses",
        input,
        auth(["security.role.assign"]),
        context,
      ),
    ).rejects.toMatchObject({ code: "PERMISSION_FORBIDDEN" });
    await expect(
      service.replaceRoleScopes(
        ROLE_ID,
        "warehouses",
        input,
        auth(["security.role.assign", "security.permission.assign"]),
        context,
      ),
    ).resolves.toMatchObject({ id: ROLE_ID });
    expect(store.replaceRoleScopes).toHaveBeenCalledWith(
      ROLE_ID,
      "warehouses",
      [{ accessLevel: "manage", targetId: ROLE_ID }],
      input.updatedAt,
      USER_ID,
    );
  });

  it("rejects unapproved access levels and self role elevation", async () => {
    const service = new SecurityManagementService(repository(), new InMemoryAuditWriter());
    const context = {
      requestId: "33333333-3333-4333-8333-333333333333",
      timestamp: "2026-07-23T00:00:00.000Z",
    };
    await expect(
      service.replaceRoleScopes(
        ROLE_ID,
        "stores",
        {
          reason: "授权调整",
          storeAssignments: [{ accessLevel: "owner", storeId: ROLE_ID }],
          updatedAt: "2026-07-23T00:00:00Z",
        },
        auth(["security.role.assign", "security.permission.assign"]),
        context,
      ),
    ).rejects.toMatchObject({
      details: [
        expect.objectContaining({
          field: "accessLevel",
          message: expect.stringContaining("DATABASE_ENUM_SPEC"),
        }),
      ],
    });
    await expect(
      service.replaceUserRoles(
        USER_ID,
        {
          reason: "尝试自助提权",
          roleAssignments: [
            { effectiveFrom: "2026-07-23T00:00:00Z", effectiveTo: null, roleId: ROLE_ID },
          ],
          updatedAt: "2026-07-23T00:00:00Z",
        },
        auth(["security.role.assign", "security.user.update"]),
        context,
      ),
    ).rejects.toMatchObject({ code: "PERMISSION_FORBIDDEN" });
  });
});
