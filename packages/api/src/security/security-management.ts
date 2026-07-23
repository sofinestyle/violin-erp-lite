import { recordAuditEvent, type AuditWriter } from "../audit/audit.js";
import { hashPassword } from "../auth/password.js";
import type { AuthenticationContext } from "../auth/authentication.js";
import { requireAllPermissions, requirePermission } from "../authorization/authorization.js";
import { isRoleCode, type PermissionCode, type RoleCode } from "../authorization/permissions.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../errors/app-error.js";
import type { RequestContext } from "../request-context/request-context.js";

export const ACCESS_LEVELS = ["read", "operate", "manage"] as const;
export type AccessLevel = (typeof ACCESS_LEVELS)[number];
export type SecurityRecord = Readonly<Record<string, unknown> & { id: string }>;
export type SecurityListQuery = Readonly<{
  filters: Readonly<Record<string, boolean | string>>;
  keyword?: string;
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
}>;
export type SecurityListResult = Readonly<{
  items: readonly SecurityRecord[];
  page: number;
  pageSize: number;
  total: number;
}>;

export type UserRoleAssignment = Readonly<{
  effectiveFrom: string;
  effectiveTo: string | null;
  roleId: string;
}>;
export type ScopeAssignment = Readonly<{
  accessLevel: AccessLevel;
  targetId: string;
}>;

export type SecurityRepository = Readonly<{
  actorHasRole: (actorUserId: string, roleId: string) => Promise<boolean>;
  createRole: (
    data: Readonly<Record<string, unknown>>,
    actorUserId: string,
  ) => Promise<SecurityRecord>;
  createUser: (
    data: Readonly<Record<string, unknown>>,
    assignments: readonly UserRoleAssignment[],
    actorUserId: string,
  ) => Promise<SecurityRecord>;
  findRole: (id: string) => Promise<SecurityRecord | null>;
  findUser: (id: string) => Promise<SecurityRecord | null>;
  listPermissions: (query: SecurityListQuery) => Promise<SecurityListResult>;
  listRoles: (query: SecurityListQuery) => Promise<SecurityListResult>;
  listUsers: (query: SecurityListQuery) => Promise<SecurityListResult>;
  readRolePermissions: (roleId: string) => Promise<readonly SecurityRecord[]>;
  readRoleScopes: (
    roleId: string,
    scope: "stores" | "warehouses",
  ) => Promise<readonly SecurityRecord[]>;
  readUserRoles: (userId: string) => Promise<readonly SecurityRecord[]>;
  replaceRolePermissions: (
    roleId: string,
    permissionIds: readonly string[],
    updatedAt: string,
    actorUserId: string,
  ) => Promise<SecurityRecord | null>;
  replaceRoleScopes: (
    roleId: string,
    scope: "stores" | "warehouses",
    assignments: readonly ScopeAssignment[],
    updatedAt: string,
    actorUserId: string,
  ) => Promise<SecurityRecord | null>;
  replaceUserRoles: (
    userId: string,
    assignments: readonly UserRoleAssignment[],
    updatedAt: string,
    actorUserId: string,
  ) => Promise<SecurityRecord | null>;
  setRoleActive: (
    id: string,
    isActive: boolean,
    updatedAt: string,
    actorUserId: string,
  ) => Promise<SecurityRecord | null>;
  setUserActive: (
    id: string,
    isActive: boolean,
    updatedAt: string,
    actorUserId: string,
  ) => Promise<SecurityRecord | null>;
  updateRole: (
    id: string,
    data: Readonly<Record<string, unknown>>,
    updatedAt: string,
    actorUserId: string,
  ) => Promise<SecurityRecord | null>;
  updateUser: (
    id: string,
    data: Readonly<Record<string, unknown>>,
    updatedAt: string,
    actorUserId: string,
  ) => Promise<SecurityRecord | null>;
  updateUserPassword: (
    id: string,
    passwordHash: string,
    mustChangePassword: boolean,
    updatedAt: string,
    actorUserId: string,
  ) => Promise<SecurityRecord | null>;
}>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function objectInput(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ValidationError("请求体必须是对象");
  }
  return input as Record<string, unknown>;
}

function requiredString(input: Record<string, unknown>, field: string, maxLength: number): string {
  const value = input[field];
  if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength) {
    throw new ValidationError("请求数据校验失败", [
      { field, message: `${field} 必填且长度不得超过 ${maxLength}` },
    ]);
  }
  return value.trim();
}

function optionalString(
  input: Record<string, unknown>,
  field: string,
  maxLength: number,
): string | null {
  const value = input[field];
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.trim().length > maxLength) {
    throw new ValidationError("请求数据校验失败", [
      { field, message: `${field} 长度不得超过 ${maxLength}` },
    ]);
  }
  return value.trim();
}

function uuid(value: unknown, field: string): string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new ValidationError("请求数据校验失败", [{ field, message: `${field} 必须是 UUID` }]);
  }
  return value;
}

function isoTime(value: unknown, field = "updatedAt"): string {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new ValidationError("请求数据校验失败", [
      { field, message: `${field} 必须是 ISO 8601 时间` },
    ]);
  }
  return value;
}

function booleanValue(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new ValidationError("请求数据校验失败", [{ field, message: `${field} 必须是布尔值` }]);
  }
  return value;
}

function reason(input: Record<string, unknown>): string {
  return requiredString(input, "reason", 1000);
}

function uniqueIds(input: unknown, field: string): readonly string[] {
  if (!Array.isArray(input)) {
    throw new ValidationError("请求数据校验失败", [{ field, message: `${field} 必须是数组` }]);
  }
  const values = input.map((value) => uuid(value, field));
  if (new Set(values).size !== values.length) {
    throw new ValidationError("请求数据校验失败", [{ field, message: `${field} 不得重复` }]);
  }
  return values;
}

function roleAssignments(input: unknown, allowEmpty = false): readonly UserRoleAssignment[] {
  if (!Array.isArray(input) || (!allowEmpty && input.length === 0)) {
    throw new ValidationError("请求数据校验失败", [
      { field: "roleAssignments", message: "角色分配至少包含一项" },
    ]);
  }
  const assignments = input.map((item) => {
    const value = objectInput(item);
    const effectiveFrom = isoTime(value.effectiveFrom, "effectiveFrom");
    const effectiveTo =
      value.effectiveTo === null || value.effectiveTo === undefined
        ? null
        : isoTime(value.effectiveTo, "effectiveTo");
    if (effectiveTo && Date.parse(effectiveTo) < Date.parse(effectiveFrom)) {
      throw new ValidationError("请求数据校验失败", [
        { field: "effectiveTo", message: "effectiveTo 不得早于 effectiveFrom" },
      ]);
    }
    return { effectiveFrom, effectiveTo, roleId: uuid(value.roleId, "roleId") };
  });
  if (new Set(assignments.map((item) => item.roleId)).size !== assignments.length) {
    throw new ValidationError("请求数据校验失败", [
      { field: "roleAssignments", message: "roleId 不得重复" },
    ]);
  }
  return assignments;
}

function scopeAssignments(
  input: unknown,
  scope: "stores" | "warehouses",
): readonly ScopeAssignment[] {
  if (!Array.isArray(input)) {
    throw new ValidationError("请求数据校验失败", [
      { field: `${scope}Assignments`, message: "数据范围必须是数组" },
    ]);
  }
  const idField = scope === "stores" ? "storeId" : "warehouseId";
  const assignments = input.map((item) => {
    const value = objectInput(item);
    const accessLevel = value.accessLevel;
    if (typeof accessLevel !== "string" || !ACCESS_LEVELS.includes(accessLevel as AccessLevel)) {
      throw new ValidationError("请求数据校验失败", [
        {
          field: "accessLevel",
          message: "accessLevel 必须引用 DATABASE_ENUM_SPEC 的 read、operate 或 manage",
        },
      ]);
    }
    return {
      accessLevel: accessLevel as AccessLevel,
      targetId: uuid(value[idField], idField),
    };
  });
  if (new Set(assignments.map((item) => item.targetId)).size !== assignments.length) {
    throw new ValidationError("请求数据校验失败", [
      { field: `${scope}Assignments`, message: `${idField} 不得重复` },
    ]);
  }
  return assignments;
}

export function parseSecurityListQuery(
  kind: "permissions" | "roles" | "users",
  searchParams: URLSearchParams,
): SecurityListQuery {
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "20");
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    !Number.isSafeInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 100
  ) {
    throw new ValidationError("分页参数无效");
  }
  const allowedSort =
    kind === "users"
      ? ["username", "displayName", "lastLoginAt", "createdAt", "updatedAt"]
      : kind === "roles"
        ? ["roleCode", "roleName", "createdAt", "updatedAt"]
        : ["permissionCode", "permissionName", "moduleCode", "actionCode"];
  const sortBy = searchParams.get("sortBy") ?? allowedSort[0]!;
  const sortOrder = searchParams.get("sortOrder") ?? "asc";
  if (!allowedSort.includes(sortBy) || (sortOrder !== "asc" && sortOrder !== "desc")) {
    throw new ValidationError("排序参数无效");
  }
  const filters: Record<string, boolean | string> = {};
  for (const field of kind === "users"
    ? ["status", "isActive", "roleCode"]
    : kind === "roles"
      ? ["isActive", "isSystemRole"]
      : ["moduleCode", "actionCode", "isActive"]) {
    const value = searchParams.get(field);
    if (value !== null) {
      filters[field] = value === "true" ? true : value === "false" ? false : value;
    }
  }
  return {
    filters,
    ...(searchParams.get("keyword")?.trim()
      ? { keyword: searchParams.get("keyword")!.trim() }
      : {}),
    page,
    pageSize,
    sortBy,
    sortOrder,
  };
}

export class SecurityManagementService {
  readonly #auditWriter: AuditWriter;
  readonly #repository: SecurityRepository;

  constructor(repository: SecurityRepository, auditWriter: AuditWriter) {
    this.#repository = repository;
    this.#auditWriter = auditWriter;
  }

  listUsers(query: SecurityListQuery, auth: AuthenticationContext) {
    requirePermission(auth, "security.user.read");
    return this.#repository.listUsers(query);
  }
  async user(id: string, auth: AuthenticationContext, context?: RequestContext) {
    requirePermission(auth, "security.user.read");
    const record = await this.#repository.findUser(id);
    if (!record) throw new NotFoundError("用户不存在或不可访问");
    await this.#auditRead("user", id, auth, context);
    return record;
  }
  listRoles(query: SecurityListQuery, auth: AuthenticationContext) {
    requirePermission(auth, "security.role.read");
    return this.#repository.listRoles(query);
  }
  async role(id: string, auth: AuthenticationContext, context?: RequestContext) {
    requirePermission(auth, "security.role.read");
    const record = await this.#repository.findRole(id);
    if (!record) throw new NotFoundError("角色不存在或不可访问");
    await this.#auditRead("role", id, auth, context);
    return record;
  }
  listPermissions(query: SecurityListQuery, auth: AuthenticationContext) {
    requirePermission(auth, "security.permission.read");
    return this.#repository.listPermissions(query);
  }

  async createUser(input: unknown, auth: AuthenticationContext, context: RequestContext) {
    requireAllPermissions(auth, ["security.user.create", "security.role.assign"]);
    const source = objectInput(input);
    const email = optionalString(source, "email", 254);
    if (email && !EMAIL_PATTERN.test(email)) throw new ValidationError("邮箱格式无效");
    const password = requiredString(source, "password", 200);
    const data = {
      displayName: requiredString(source, "displayName", 200),
      email,
      mustChangePassword: booleanValue(source.mustChangePassword, "mustChangePassword"),
      passwordHash: await hashPassword(password),
      phone: optionalString(source, "phone", 50),
      username: requiredString(source, "username", 100),
    };
    const record = await this.#repository.createUser(
      data,
      roleAssignments(source.roleAssignments),
      auth.user.userId,
    );
    await this.#audit("create", "user", record, auth, context);
    return record;
  }

  async updateUser(
    id: string,
    input: unknown,
    auth: AuthenticationContext,
    context: RequestContext,
  ) {
    requirePermission(auth, "security.user.update");
    const source = objectInput(input);
    const email = optionalString(source, "email", 254);
    if (email && !EMAIL_PATTERN.test(email)) throw new ValidationError("邮箱格式无效");
    const record = await this.#repository.updateUser(
      id,
      {
        displayName: requiredString(source, "displayName", 200),
        email,
        phone: optionalString(source, "phone", 50),
        username: requiredString(source, "username", 100),
      },
      isoTime(source.updatedAt),
      auth.user.userId,
    );
    return this.#changed("update", "user", record, auth, context);
  }

  async setUserActive(
    id: string,
    input: unknown,
    auth: AuthenticationContext,
    context: RequestContext,
  ) {
    const source = objectInput(input);
    const isActive = booleanValue(source.isActive, "isActive");
    requirePermission(auth, isActive ? "security.user.enable" : "security.user.disable");
    if (!isActive) reason(source);
    if (id === auth.user.userId) throw new ForbiddenError("不得通过状态修改实现自身权限变更");
    const record = await this.#repository.setUserActive(
      id,
      isActive,
      isoTime(source.updatedAt),
      auth.user.userId,
    );
    return this.#changed(isActive ? "enable" : "disable", "user", record, auth, context);
  }

  async resetPassword(
    id: string,
    input: unknown,
    auth: AuthenticationContext,
    context: RequestContext,
  ) {
    requirePermission(auth, "security.user.update");
    const source = objectInput(input);
    const record = await this.#repository.updateUserPassword(
      id,
      await hashPassword(requiredString(source, "newPassword", 200)),
      booleanValue(source.mustChangePassword, "mustChangePassword"),
      isoTime(source.updatedAt),
      auth.user.userId,
    );
    return this.#changed("password.reset", "user", record, auth, context);
  }

  async createRole(input: unknown, auth: AuthenticationContext, context: RequestContext) {
    requirePermission(auth, "security.role.create");
    const source = objectInput(input);
    const roleCode = requiredString(source, "roleCode", 100);
    if (!isRoleCode(roleCode)) {
      throw new ValidationError("角色代码不属于五个 Frozen 正式代码");
    }
    const record = await this.#repository.createRole(
      {
        description: optionalString(source, "description", 2000),
        isSystemRole: booleanValue(source.isSystemRole, "isSystemRole"),
        roleCode,
        roleName: requiredString(source, "roleName", 200),
      },
      auth.user.userId,
    );
    await this.#audit("create", "role", record, auth, context);
    return record;
  }

  async updateRole(
    id: string,
    input: unknown,
    auth: AuthenticationContext,
    context: RequestContext,
  ) {
    requirePermission(auth, "security.role.update");
    const source = objectInput(input);
    const record = await this.#repository.updateRole(
      id,
      {
        description: optionalString(source, "description", 2000),
        roleName: requiredString(source, "roleName", 200),
      },
      isoTime(source.updatedAt),
      auth.user.userId,
    );
    return this.#changed("update", "role", record, auth, context);
  }

  async setRoleActive(
    id: string,
    input: unknown,
    auth: AuthenticationContext,
    context: RequestContext,
  ) {
    const source = objectInput(input);
    const isActive = booleanValue(source.isActive, "isActive");
    requirePermission(auth, isActive ? "security.role.enable" : "security.role.disable");
    if (!isActive) reason(source);
    if (await this.#repository.actorHasRole(auth.user.userId, id)) {
      throw new ForbiddenError("不得修改自身有效角色状态");
    }
    const record = await this.#repository.setRoleActive(
      id,
      isActive,
      isoTime(source.updatedAt),
      auth.user.userId,
    );
    return this.#changed(isActive ? "enable" : "disable", "role", record, auth, context);
  }

  async rolePermissions(id: string, auth: AuthenticationContext, context?: RequestContext) {
    requireAllPermissions(auth, ["security.permission.read", "security.role.read"]);
    const records = await this.#repository.readRolePermissions(id);
    await this.#auditRead("role-permissions", id, auth, context, records.length);
    return records;
  }
  async userRoles(id: string, auth: AuthenticationContext, context?: RequestContext) {
    requireAllPermissions(auth, ["security.user.read", "security.role.read"]);
    const records = await this.#repository.readUserRoles(id);
    await this.#auditRead("user-roles", id, auth, context, records.length);
    return records;
  }
  async roleScopes(
    id: string,
    scope: "stores" | "warehouses",
    auth: AuthenticationContext,
    context?: RequestContext,
  ) {
    requireAllPermissions(auth, ["security.role.read", "security.permission.read"]);
    const records = await this.#repository.readRoleScopes(id, scope);
    await this.#auditRead(`role-${scope}`, id, auth, context, records.length);
    return records;
  }

  async replaceRolePermissions(
    id: string,
    input: unknown,
    auth: AuthenticationContext,
    context: RequestContext,
  ) {
    requireAllPermissions(auth, ["security.permission.assign", "security.role.assign"]);
    if (await this.#repository.actorHasRole(auth.user.userId, id)) {
      throw new ForbiddenError("不得通过修改自身有效角色实现提权");
    }
    const source = objectInput(input);
    reason(source);
    const record = await this.#repository.replaceRolePermissions(
      id,
      uniqueIds(source.permissionIds, "permissionIds"),
      isoTime(source.updatedAt),
      auth.user.userId,
    );
    return this.#changed("permission.replace", "role", record, auth, context);
  }

  async replaceUserRoles(
    id: string,
    input: unknown,
    auth: AuthenticationContext,
    context: RequestContext,
  ) {
    requireAllPermissions(auth, ["security.role.assign", "security.user.update"]);
    if (id === auth.user.userId) throw new ForbiddenError("不得通过修改自身角色实现提权");
    const source = objectInput(input);
    reason(source);
    const record = await this.#repository.replaceUserRoles(
      id,
      roleAssignments(source.roleAssignments),
      isoTime(source.updatedAt),
      auth.user.userId,
    );
    return this.#changed("role.replace", "user", record, auth, context);
  }

  async replaceRoleScopes(
    id: string,
    scope: "stores" | "warehouses",
    input: unknown,
    auth: AuthenticationContext,
    context: RequestContext,
  ) {
    requireAllPermissions(auth, ["security.role.assign", "security.permission.assign"]);
    if (await this.#repository.actorHasRole(auth.user.userId, id)) {
      throw new ForbiddenError("不得通过修改自身有效角色的数据范围实现提权");
    }
    const source = objectInput(input);
    reason(source);
    const record = await this.#repository.replaceRoleScopes(
      id,
      scope,
      scopeAssignments(
        source[scope === "stores" ? "storeAssignments" : "warehouseAssignments"],
        scope,
      ),
      isoTime(source.updatedAt),
      auth.user.userId,
    );
    return this.#changed(`${scope}.replace`, "role", record, auth, context);
  }

  async #changed(
    action: string,
    type: "role" | "user",
    record: SecurityRecord | null,
    auth: AuthenticationContext,
    context: RequestContext,
  ) {
    if (!record) throw new ConflictError("资源已被其他请求修改或不存在");
    await this.#audit(action, type, record, auth, context);
    return record;
  }

  async #audit(
    action: string,
    type: "role" | "user",
    record: SecurityRecord,
    auth: AuthenticationContext,
    context: RequestContext,
  ) {
    await recordAuditEvent(this.#auditWriter, {
      action,
      actorUserId: auth.user.userId,
      afterSnapshot: record,
      moduleCode: "security",
      requestId: context.requestId,
      resourceId: record.id,
      resourceType: type,
      result: "success",
      timestamp: new Date(context.timestamp),
      usernameSnapshot: auth.user.username,
    });
  }

  async #auditRead(
    resourceType: string,
    resourceId: string,
    auth: AuthenticationContext,
    context: RequestContext | undefined,
    count?: number,
  ): Promise<void> {
    if (!context) return;
    await recordAuditEvent(this.#auditWriter, {
      action: "read",
      actorUserId: auth.user.userId,
      ...(count === undefined ? {} : { metadata: { count } }),
      moduleCode: "security",
      requestId: context.requestId,
      resourceId,
      resourceType,
      result: "success",
      timestamp: new Date(context.timestamp),
    });
  }
}

export function assertRoleCode(value: string): RoleCode {
  if (!isRoleCode(value)) throw new ValidationError("角色代码不属于 Frozen 正式代码");
  return value;
}

export function assertPermissionCodes(values: readonly string[]): readonly PermissionCode[] {
  return values as readonly PermissionCode[];
}
