"use client";

import type { PermissionCode } from "@violin-erp/api";
import type { ReactNode } from "react";
import { usePermission } from "@/contexts/permission-context";

type PermissionWrapperProps = Readonly<{
  permission?: PermissionCode;
  anyOf?: readonly PermissionCode[];
  allOf?: readonly PermissionCode[];
  fallback?: ReactNode;
  children: ReactNode;
}>;

export function PermissionWrapper({
  permission,
  anyOf,
  allOf,
  fallback = null,
  children,
}: PermissionWrapperProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermission();
  const allowed = permission
    ? hasPermission(permission)
    : anyOf
      ? hasAnyPermission(anyOf)
      : allOf
        ? hasAllPermissions(allOf)
        : false;

  return allowed ? children : fallback;
}
