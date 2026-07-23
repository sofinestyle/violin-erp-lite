import {
  authenticationError,
  isPermissionCode,
  isRoleCode,
  type AuthRepository,
  type AuthSessionState,
  type AuthUserRecord,
  type AuthenticatedSessionRecord,
  type PersistSessionInput,
  type RefreshResult,
  type TokenClaims,
  type WechatIdentity,
} from "@violin-erp/api";
import { getPrismaClient } from "../client.js";
import { Prisma, type PrismaClient } from "../generated/prisma/client.js";

const LOCK_THRESHOLD = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

const userSelect = {
  display_name: true,
  failed_login_count: true,
  id: true,
  is_active: true,
  locked_until: true,
  must_change_password: true,
  password_hash: true,
  status: true,
  username: true,
  user_roles_user_roles_user_idTousers: {
    select: {
      effective_from: true,
      effective_to: true,
      roles: {
        select: {
          id: true,
          is_active: true,
          role_code: true,
          role_name: true,
          role_permissions: {
            select: {
              permissions: {
                select: {
                  action_code: true,
                  is_active: true,
                  module_code: true,
                  permission_code: true,
                },
              },
            },
          },
          role_stores: {
            select: { access_level: true, store_id: true },
          },
          role_warehouses: {
            select: { access_level: true, warehouse_id: true },
          },
        },
      },
    },
  },
  user_wechat_identities_user_wechat_identities_user_idTousers: {
    select: { id: true },
    where: { status: "active" },
    take: 1,
  },
} as const;

type SelectedUser = Prisma.usersGetPayload<{ select: typeof userSelect }>;

function authUser(user: SelectedUser): AuthUserRecord {
  const now = Date.now();
  const assignments = user.user_roles_user_roles_user_idTousers.filter(
    (assignment) =>
      assignment.roles.is_active &&
      assignment.effective_from.getTime() <= now &&
      (!assignment.effective_to || assignment.effective_to.getTime() > now),
  );
  const roles = assignments
    .map(({ roles: role }) =>
      isRoleCode(role.role_code)
        ? { id: role.id, roleCode: role.role_code, roleName: role.role_name }
        : null,
    )
    .filter((role): role is NonNullable<typeof role> => role !== null);
  const permissions = assignments
    .flatMap(({ roles: role }) => role.role_permissions)
    .map(({ permissions: permission }) =>
      permission.is_active && isPermissionCode(permission.permission_code)
        ? {
            actionCode: permission.action_code,
            moduleCode: permission.module_code,
            permissionCode: permission.permission_code,
          }
        : null,
    )
    .filter((permission): permission is NonNullable<typeof permission> => permission !== null);
  const warehouseScopes = assignments.flatMap(({ roles: role }) =>
    role.role_warehouses.map((scope) => ({
      accessLevel: scope.access_level as "manage" | "operate" | "read",
      targetId: scope.warehouse_id,
    })),
  );
  const storeScopes = assignments.flatMap(({ roles: role }) =>
    role.role_stores.map((scope) => ({
      accessLevel: scope.access_level as "manage" | "operate" | "read",
      targetId: scope.store_id,
    })),
  );
  return {
    displayName: user.display_name,
    failedLoginCount: user.failed_login_count,
    id: user.id,
    isActive: user.is_active,
    lockedUntil: user.locked_until,
    mustChangePassword: user.must_change_password,
    passwordHash: user.password_hash,
    permissions: [...new Map(permissions.map((item) => [item.permissionCode, item])).values()],
    roles: [...new Map(roles.map((item) => [item.id, item])).values()],
    status: user.status,
    storeScopes: [
      ...new Map(
        storeScopes.map((item) => [`${item.targetId}:${item.accessLevel}`, item]),
      ).values(),
    ],
    username: user.username,
    warehouseScopes: [
      ...new Map(
        warehouseScopes.map((item) => [`${item.targetId}:${item.accessLevel}`, item]),
      ).values(),
    ],
    wechatBound: user.user_wechat_identities_user_wechat_identities_user_idTousers.length > 0,
  };
}

async function readUser(database: DatabaseClient, userId: string): Promise<AuthUserRecord | null> {
  const user = await database.users.findFirst({
    select: userSelect,
    where: { id: userId },
  });
  return user ? authUser(user) : null;
}

function sessionData(session: PersistSessionInput, userId = session.userId) {
  return {
    access_token_expires_at: session.accessTokenExpiresAt,
    client_type: session.clientType,
    created_at: session.issuedAt,
    created_by: userId,
    id: session.sessionId,
    issued_at: session.issuedAt,
    refresh_token_expires_at: session.refreshTokenExpiresAt,
    refresh_token_hash: session.refreshTokenHash,
    token_family_id: session.tokenFamilyId,
    updated_at: session.issuedAt,
    user_id: userId,
  };
}

async function audit(
  database: DatabaseClient,
  input: Readonly<{
    action: string;
    objectId: string;
    requestId: string;
    result?: "failure" | "success";
    userId: string;
    username: string;
  }>,
): Promise<void> {
  await database.audit_logs.create({
    data: {
      action_code: input.action,
      module_code: "security",
      object_id: input.objectId,
      object_type: "auth_session",
      occurred_at: new Date(),
      operation_result: input.result ?? "success",
      request_trace_id: input.requestId,
      user_id: input.userId,
      username_snapshot: input.username,
      ...(input.result === "failure" ? { failure_reason: "认证请求被拒绝" } : {}),
    },
  });
}

function sessionState(session: {
  access_token_expires_at: Date;
  client_type: string;
  id: string;
  refresh_token_expires_at: Date;
  token_family_id: string;
  user_id: string;
}): AuthSessionState {
  return {
    accessTokenExpiresAt: session.access_token_expires_at,
    clientType: session.client_type as AuthSessionState["clientType"],
    refreshTokenExpiresAt: session.refresh_token_expires_at,
    sessionId: session.id,
    tokenFamilyId: session.token_family_id,
    userId: session.user_id,
  };
}

export class PrismaAuthRepository implements AuthRepository {
  readonly #client: PrismaClient;

  constructor(client: PrismaClient = getPrismaClient()) {
    this.#client = client;
  }

  async findUserByUsername(username: string): Promise<AuthUserRecord | null> {
    const user = await this.#client.users.findFirst({
      select: userSelect,
      where: {
        username: { equals: username, mode: "insensitive" },
      },
    });
    return user ? authUser(user) : null;
  }

  async findUserByWechat(appId: string, openid: string): Promise<AuthUserRecord | null> {
    const mapping = await this.#client.user_wechat_identities.findFirst({
      select: { user_id: true },
      where: { mini_program_appid: appId, openid, status: "active" },
    });
    return mapping ? readUser(this.#client, mapping.user_id) : null;
  }

  async recordLoginFailure(user: AuthUserRecord, requestId: string): Promise<void> {
    await this.#client.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT id FROM users WHERE id = ${user.id}::uuid FOR UPDATE`;
      const current = await transaction.users.findUniqueOrThrow({
        select: { failed_login_count: true, username: true },
        where: { id: user.id },
      });
      const failedLoginCount = current.failed_login_count + 1;
      await transaction.users.update({
        data: {
          failed_login_count: failedLoginCount,
          ...(failedLoginCount >= LOCK_THRESHOLD
            ? { locked_until: new Date(Date.now() + LOCK_DURATION_MS) }
            : {}),
          updated_at: new Date(),
          updated_by: user.id,
        },
        where: { id: user.id },
      });
      await audit(transaction, {
        action: "login.rejected",
        objectId: user.id,
        requestId,
        result: "failure",
        userId: user.id,
        username: current.username,
      });
    });
  }

  async recordAuthenticationRejection(user: AuthUserRecord, requestId: string): Promise<void> {
    await audit(this.#client, {
      action: "authentication.rejected",
      objectId: user.id,
      requestId,
      result: "failure",
      userId: user.id,
      username: user.username,
    });
  }

  async createSession(
    session: PersistSessionInput,
    action: "login.password" | "login.wechat",
    identity?: WechatIdentity,
  ): Promise<AuthUserRecord> {
    return this.#client.$transaction(async (transaction) => {
      await transaction.auth_sessions.create({ data: sessionData(session) });
      await transaction.users.update({
        data: {
          failed_login_count: 0,
          last_login_at: session.issuedAt,
          locked_until: null,
          updated_at: session.issuedAt,
          updated_by: session.userId,
        },
        where: { id: session.userId },
      });
      if (identity) {
        await transaction.user_wechat_identities.updateMany({
          data: {
            last_login_at: session.issuedAt,
            updated_at: session.issuedAt,
            updated_by: session.userId,
          },
          where: { openid: identity.openid, status: "active", user_id: session.userId },
        });
      }
      await audit(transaction, {
        action,
        objectId: session.sessionId,
        requestId: session.requestId,
        userId: session.userId,
        username: session.username,
      });
      const user = await readUser(transaction, session.userId);
      if (!user) throw authenticationError.userDisabled();
      return user;
    });
  }

  async bindWechatAndCreateSession(
    userId: string,
    identity: WechatIdentity,
    appId: string,
    session: PersistSessionInput,
  ): Promise<AuthUserRecord> {
    try {
      return await this.#client.$transaction(async (transaction) => {
        await transaction.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
        const [userBinding, openidBinding, unionidBinding] = await Promise.all([
          transaction.user_wechat_identities.findFirst({
            select: { id: true },
            where: { status: "active", user_id: userId },
          }),
          transaction.user_wechat_identities.findFirst({
            select: { id: true, user_id: true },
            where: { mini_program_appid: appId, openid: identity.openid, status: "active" },
          }),
          identity.unionid
            ? transaction.user_wechat_identities.findFirst({
                select: { id: true, user_id: true },
                where: { status: "active", unionid: identity.unionid },
              })
            : Promise.resolve(null),
        ]);
        if (openidBinding || unionidBinding) throw authenticationError.wechatAlreadyBound();
        if (userBinding) throw authenticationError.wechatAccountBound();
        await transaction.user_wechat_identities.create({
          data: {
            bound_at: session.issuedAt,
            created_at: session.issuedAt,
            created_by: userId,
            mini_program_appid: appId,
            openid: identity.openid,
            status: "active",
            unionid: identity.unionid ?? null,
            updated_at: session.issuedAt,
            updated_by: userId,
            user_id: userId,
          },
        });
        await transaction.auth_sessions.create({ data: sessionData(session, userId) });
        await transaction.users.update({
          data: {
            failed_login_count: 0,
            last_login_at: session.issuedAt,
            locked_until: null,
            updated_at: session.issuedAt,
            updated_by: userId,
          },
          where: { id: userId },
        });
        await audit(transaction, {
          action: "login.wechat-bind",
          objectId: session.sessionId,
          requestId: session.requestId,
          userId,
          username: session.username,
        });
        const user = await readUser(transaction, userId);
        if (!user) throw authenticationError.userDisabled();
        return user;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw authenticationError.bindingConflict();
      }
      throw error;
    }
  }

  async rotateSession(
    input: Readonly<{
      clientType: AuthSessionState["clientType"];
      newSession: PersistSessionInput;
      oldRefreshTokenHash: string;
      requestId: string;
    }>,
  ): Promise<RefreshResult> {
    return this.#client.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT id FROM auth_sessions WHERE refresh_token_hash = ${input.oldRefreshTokenHash} FOR UPDATE`;
      const old = await transaction.auth_sessions.findUnique({
        where: { refresh_token_hash: input.oldRefreshTokenHash },
      });
      if (
        !old ||
        old.client_type !== input.clientType ||
        old.refresh_token_expires_at.getTime() <= Date.now()
      ) {
        return { kind: "invalid" };
      }
      const familyRevoked = await transaction.auth_sessions.count({
        where: { token_family_id: old.token_family_id, revoked_at: { not: null } },
      });
      if (old.revoked_at || familyRevoked > 0) return { kind: "revoked" };
      const user = await readUser(transaction, old.user_id);
      if (!user) return { kind: "invalid" };
      if (!user.isActive || user.status !== "active") {
        await audit(transaction, {
          action: "refresh.rejected",
          objectId: old.id,
          requestId: input.requestId,
          result: "failure",
          userId: user.id,
          username: user.username,
        });
        return { kind: "disabled" };
      }
      if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
        await audit(transaction, {
          action: "refresh.rejected",
          objectId: old.id,
          requestId: input.requestId,
          result: "failure",
          userId: user.id,
          username: user.username,
        });
        return { kind: "locked" };
      }
      if (user.roles.length === 0) return { kind: "invalid" };
      if (input.clientType === "wechat-mini-program" && user.mustChangePassword) {
        return { kind: "invalid" };
      }
      if (input.clientType === "wechat-mini-program" && !user.wechatBound) {
        return { kind: "wechat-invalid" };
      }
      if (old.replaced_by_session_id) {
        const now = new Date();
        await transaction.auth_sessions.updateMany({
          data: {
            revocation_actor_type: "system",
            revocation_reason: "refresh token replay",
            revoked_at: now,
            updated_at: now,
            updated_by: null,
          },
          where: { revoked_at: null, token_family_id: old.token_family_id },
        });
        await audit(transaction, {
          action: "refresh.replay",
          objectId: old.id,
          requestId: input.requestId,
          result: "failure",
          userId: user.id,
          username: user.username,
        });
        return { kind: "replay" };
      }
      const next: PersistSessionInput = {
        ...input.newSession,
        tokenFamilyId: old.token_family_id,
        userId: old.user_id,
        username: user.username,
      };
      await transaction.auth_sessions.create({ data: sessionData(next, old.user_id) });
      const updated = await transaction.auth_sessions.updateMany({
        data: {
          last_refreshed_at: next.issuedAt,
          replaced_by_session_id: next.sessionId,
          updated_at: next.issuedAt,
          updated_by: old.user_id,
        },
        where: { id: old.id, replaced_by_session_id: null, revoked_at: null },
      });
      if (updated.count !== 1) throw new Error("Concurrent session rotation was not claimed");
      await audit(transaction, {
        action: "refresh.success",
        objectId: next.sessionId,
        requestId: input.requestId,
        userId: user.id,
        username: user.username,
      });
      return { kind: "success", session: sessionState({ ...old, ...sessionData(next) }), user };
    });
  }

  async revokeFamily(
    input: Readonly<{
      claims: TokenClaims;
      refreshTokenHash: string;
      requestId: string;
    }>,
  ): Promise<"invalid" | "success"> {
    return this.#client.$transaction(async (transaction) => {
      const refreshSession = await transaction.auth_sessions.findUnique({
        where: { refresh_token_hash: input.refreshTokenHash },
      });
      if (
        !refreshSession ||
        refreshSession.user_id !== input.claims.userId ||
        refreshSession.token_family_id !== input.claims.tokenFamilyId
      ) {
        return "invalid";
      }
      const user = await transaction.users.findUnique({
        select: { username: true },
        where: { id: input.claims.userId },
      });
      if (!user) return "invalid";
      const now = new Date();
      await transaction.auth_sessions.updateMany({
        data: {
          revocation_actor_type: "user",
          revocation_reason: "user logout",
          revoked_at: now,
          revoked_by: input.claims.userId,
          updated_at: now,
          updated_by: input.claims.userId,
        },
        where: { revoked_at: null, token_family_id: input.claims.tokenFamilyId },
      });
      await audit(transaction, {
        action: "logout",
        objectId: input.claims.sessionId,
        requestId: input.requestId,
        userId: input.claims.userId,
        username: user.username,
      });
      return "success";
    });
  }

  async resolveSession(
    claims: TokenClaims,
    clientType: AuthSessionState["clientType"],
  ): Promise<AuthenticatedSessionRecord | null> {
    const session = await this.#client.auth_sessions.findFirst({
      where: {
        access_token_expires_at: { gt: new Date() },
        client_type: clientType,
        id: claims.sessionId,
        replaced_by_session_id: null,
        revoked_at: null,
        token_family_id: claims.tokenFamilyId,
        user_id: claims.userId,
      },
    });
    if (!session) return null;
    const familyRevoked = await this.#client.auth_sessions.count({
      where: { revoked_at: { not: null }, token_family_id: claims.tokenFamilyId },
    });
    if (familyRevoked > 0) return null;
    const user = await readUser(this.#client, claims.userId);
    if (
      !user ||
      !user.isActive ||
      user.status !== "active" ||
      user.roles.length === 0 ||
      (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) ||
      (clientType === "wechat-mini-program" && user.mustChangePassword) ||
      (clientType === "wechat-mini-program" && !user.wechatBound)
    ) {
      return null;
    }
    return { session: sessionState(session), user };
  }
}
