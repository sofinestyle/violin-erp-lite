import type { PermissionCode } from "@violin-erp/api";
import type { ReactNode } from "react";
import { useAppContext } from "../contexts/app-context";

export function PermissionWrapper({
  permission,
  children,
  fallback = null,
}: {
  permission: PermissionCode;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { hasPermission } = useAppContext();
  return hasPermission(permission) ? children : fallback;
}
