"use client";

import type { PermissionCode } from "@violin-erp/api";
import { createContext, type ReactNode, useContext, useMemo } from "react";

type PermissionContextValue = Readonly<{
  permissions: ReadonlySet<PermissionCode>;
  hasPermission: (permission: PermissionCode) => boolean;
  hasAnyPermission: (permissions: readonly PermissionCode[]) => boolean;
  hasAllPermissions: (permissions: readonly PermissionCode[]) => boolean;
}>;

const PermissionContext = createContext<PermissionContextValue | null>(null);

export function PermissionProvider({
  children,
  permissions = [],
}: {
  children: ReactNode;
  permissions?: readonly PermissionCode[];
}) {
  const value = useMemo<PermissionContextValue>(() => {
    const granted = new Set(permissions);
    return {
      permissions: granted,
      hasPermission: (permission) => granted.has(permission),
      hasAnyPermission: (required) => required.some((permission) => granted.has(permission)),
      hasAllPermissions: (required) => required.every((permission) => granted.has(permission)),
    };
  }, [permissions]);

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

export function usePermission() {
  const context = useContext(PermissionContext);
  if (!context) throw new Error("usePermission 必须在 PermissionProvider 内使用");
  return context;
}
