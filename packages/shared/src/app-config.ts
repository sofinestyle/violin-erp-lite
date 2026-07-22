import type { SupportedLocale } from "./i18n.js";

export const DEFAULT_HEALTH_ENDPOINT = "/api/health";

export type AppConfig = Readonly<{
  applicationName: string;
  healthEndpoint: string;
  locale: SupportedLocale;
}>;
