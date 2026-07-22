import { getAuthenticationContext, type AuthenticationContext } from "../auth/authentication.js";
import { ForbiddenError, UnauthorizedError } from "../errors/app-error.js";
import type { PermissionCode } from "./permissions.js";

export function requireAuthentication(
  context: AuthenticationContext | undefined = getAuthenticationContext(),
): AuthenticationContext {
  if (!context) {
    throw new UnauthorizedError();
  }

  return context;
}

function permissionSet(context: AuthenticationContext): ReadonlySet<PermissionCode> {
  return new Set(context.user.permissionCodes);
}

export function requirePermission(
  context: AuthenticationContext | undefined,
  permission: PermissionCode,
): AuthenticationContext {
  const authenticated = requireAuthentication(context);

  if (!permissionSet(authenticated).has(permission)) {
    throw new ForbiddenError();
  }

  return authenticated;
}

export function requireAnyPermission(
  context: AuthenticationContext | undefined,
  permissions: readonly PermissionCode[],
): AuthenticationContext {
  const authenticated = requireAuthentication(context);
  const granted = permissionSet(authenticated);

  if (permissions.length === 0 || !permissions.some((permission) => granted.has(permission))) {
    throw new ForbiddenError();
  }

  return authenticated;
}

export function requireAllPermissions(
  context: AuthenticationContext | undefined,
  permissions: readonly PermissionCode[],
): AuthenticationContext {
  const authenticated = requireAuthentication(context);
  const granted = permissionSet(authenticated);

  if (permissions.length === 0 || !permissions.every((permission) => granted.has(permission))) {
    throw new ForbiddenError();
  }

  return authenticated;
}
