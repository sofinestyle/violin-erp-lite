"use client";

import { DEFAULT_HEALTH_ENDPOINT, DEFAULT_LOCALE, type AppConfig } from "@violin-erp/shared";
import { createContext, type ReactNode, useContext } from "react";

export const defaultAppConfig: AppConfig = {
  applicationName: "Violin ERP Lite",
  healthEndpoint: DEFAULT_HEALTH_ENDPOINT,
  locale: DEFAULT_LOCALE,
};

const AppConfigContext = createContext<AppConfig | null>(null);

export function AppConfigProvider({
  children,
  value = defaultAppConfig,
}: {
  children: ReactNode;
  value?: AppConfig;
}) {
  return <AppConfigContext.Provider value={value}>{children}</AppConfigContext.Provider>;
}

export function useAppConfig() {
  const context = useContext(AppConfigContext);
  if (!context) throw new Error("useAppConfig 必须在 AppConfigProvider 内使用");
  return context;
}
