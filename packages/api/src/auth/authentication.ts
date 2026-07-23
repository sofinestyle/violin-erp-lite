import { AsyncLocalStorage } from "node:async_hooks";
import type { DataScopeType, PermissionCode, RoleCode } from "../authorization/permissions.js";
import { UnauthorizedError } from "../errors/app-error.js";
import type { AuthRoleSummary, AuthScopeSummary } from "./auth-flow.js";
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
