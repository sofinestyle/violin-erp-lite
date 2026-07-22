import type { PermissionCode } from "@violin-erp/api";
import { createContext, type PropsWithChildren, useContext, useMemo } from "react";

export type MiniAppUser = Readonly<{ id: string; displayName: string }>;

type MiniAppContextValue = Readonly<{
  user: MiniAppUser | null;
  permissions: ReadonlySet<PermissionCode>;
  theme: "light";
  locale: "zh-CN";
  healthEndpoint: null;
  hasPermission: (permission: PermissionCode) => boolean;
}>;

const MiniAppContext = createContext<MiniAppContextValue | null>(null);

export function AppProviders({ children }: PropsWithChildren) {
  const value = useMemo<MiniAppContextValue>(() => {
    const permissions = new Set<PermissionCode>();
    return {
      user: null,
      permissions,
      theme: "light",
      locale: "zh-CN",
      healthEndpoint: null,
      hasPermission: (permission) => permissions.has(permission),
    };
  }, []);

  return <MiniAppContext.Provider value={value}>{children}</MiniAppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(MiniAppContext);
  if (!context) throw new Error("useAppContext 必须在 AppProviders 内使用");
  return context;
}
