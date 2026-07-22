import { AsyncLocalStorage } from "node:async_hooks";
import type { DataScopeType, PermissionCode, RoleCode } from "../authorization/permissions.js";
import { UnauthorizedError } from "../errors/app-error.js";
import type { JwtService } from "./token.js";

export type AuthenticatedUser = Readonly<{
  dataScopes: readonly DataScopeType[];
  permissionCodes: readonly PermissionCode[];
  roleCodes: readonly RoleCode[];
  userId: string;
  username: string;
}>;

export type AuthenticationContext = Readonly<{
  user: AuthenticatedUser;
}>;

export type CurrentUserResolver = (userId: string) => Promise<AuthenticatedUser | null>;

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
): Promise<AuthenticationContext> {
  const claims = await jwtService.verifyAccessToken(extractBearerToken(request));
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
): Promise<T> {
  const context = await authenticateRequest(request, jwtService, resolveCurrentUser);
  return runWithAuthenticationContext(context, () => callback(context));
}
