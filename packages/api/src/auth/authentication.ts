import { AsyncLocalStorage } from "node:async_hooks";
import type { DataScopeType, PermissionCode, RoleCode } from "../authorization/permissions.js";
import { resolveDataScopes } from "../authorization/data-scope.js";
import { UnauthorizedError } from "../errors/app-error.js";
import type {
  AuthenticatedSessionRecord,
  AuthRoleSummary,
  AuthScopeSummary,
  AuthUserRecord,
} from "./auth-flow.js";
import type { ClientType, JwtService, TokenClaims } from "./token.js";

export type AuthenticatedUser = Readonly<{
  dataScopes: readonly DataScopeType[];
  displayName?: string;
  mustChangePassword?: boolean;
  permissionCodes: readonly PermissionCode[];
  roles?: readonly AuthRoleSummary[];
  roleCodes: readonly RoleCode[];
  storeScopes?: readonly AuthScopeSummary[];
  userId: string;
  username: string;
  warehouseScopes?: readonly AuthScopeSummary[];
  wechatBound?: boolean;
}>;

export type AuthenticationContext = Readonly<{
  claims?: TokenClaims;
  session?: Readonly<{
    accessTokenExpiresAt: Date;
    clientType: ClientType;
    refreshTokenExpiresAt: Date;
  }>;
  user: AuthenticatedUser;
}>;

export type CurrentUserResolver = (userId: string) => Promise<AuthenticatedUser | null>;
export type SessionAuthenticationResolver = (
  claims: TokenClaims,
  clientType: ClientType,
) => Promise<AuthenticationContext | null>;

export function createAuthenticatedUser(
  user: AuthUserRecord,
  explicitDataScopes: readonly DataScopeType[] = [],
): AuthenticatedUser {
  return Object.freeze({
    dataScopes: resolveDataScopes({
      explicitDataScopes,
      permissionCodes: user.permissions.map((item) => item.permissionCode),
      storeScopes: user.storeScopes,
      warehouseScopes: user.warehouseScopes,
    }),
    displayName: user.displayName,
    mustChangePassword: user.mustChangePassword,
    permissionCodes: user.permissions.map((item) => item.permissionCode),
    roleCodes: user.roles.map((item) => item.roleCode),
    roles: user.roles,
    storeScopes: user.storeScopes,
    userId: user.id,
    username: user.username,
    warehouseScopes: user.warehouseScopes,
    wechatBound: user.wechatBound,
  });
}

export function createSessionAuthenticationContext(
  record: AuthenticatedSessionRecord,
): AuthenticationContext {
  return Object.freeze({
    session: {
      accessTokenExpiresAt: record.session.accessTokenExpiresAt,
      clientType: record.session.clientType,
      refreshTokenExpiresAt: record.session.refreshTokenExpiresAt,
    },
    user: createAuthenticatedUser(record.user),
  });
}

const authenticationStorage = new AsyncLocalStorage<AuthenticationContext>();

export function runWithAuthenticationContext<T>(
  context: AuthenticationContext,
  callback: () => T,
): T {
  return authenticationStorage.run(context, callback);
}

export function getAuthenticationContext(): AuthenticationContext | undefined {
  return authenticationStorage.getStore();
}

export function extractBearerToken(request: Request): string {
  const authorization = request.headers.get("Authorization");
  const match = authorization ? /^Bearer ([^\s]+)$/i.exec(authorization) : null;

  if (!match?.[1]) {
    throw new UnauthorizedError();
  }

  return match[1];
}

export async function authenticateRequest(
  request: Request,
  jwtService: JwtService,
  resolveCurrentUser: CurrentUserResolver,
  resolveSession?: SessionAuthenticationResolver,
): Promise<AuthenticationContext> {
  const claims = await jwtService.verifyAccessToken(extractBearerToken(request));
  if (resolveSession) {
    const clientType = request.headers.get("X-Client-Type");
    if (clientType !== "pc" && clientType !== "wechat-mini-program") {
      throw new UnauthorizedError();
    }
    if (clientType !== claims.clientType) throw new UnauthorizedError();
    const context = await resolveSession(claims, clientType);
    if (!context) throw new UnauthorizedError();
    return context;
  }
  const user = await resolveCurrentUser(claims.userId);

  if (!user) {
    throw new UnauthorizedError();
  }

  return Object.freeze({ user });
}

export async function withAuthentication<T>(
  request: Request,
  jwtService: JwtService,
  resolveCurrentUser: CurrentUserResolver,
  callback: (context: AuthenticationContext) => Promise<T>,
  resolveSession?: SessionAuthenticationResolver,
): Promise<T> {
  const context = await authenticateRequest(
    request,
    jwtService,
    resolveCurrentUser,
    resolveSession,
  );
  return runWithAuthenticationContext(context, () => callback(context));
}
