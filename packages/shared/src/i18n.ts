export const supportedLocales = ["zh-CN", "en-US"] as const;

export type SupportedLocale = (typeof supportedLocales)[number];

export const DEFAULT_LOCALE: SupportedLocale = "zh-CN";

export const shellMessages = {
  "zh-CN": {
    applicationName: "Violin ERP Lite",
    loading: "正在加载应用",
    unavailable: "应用暂时不可用",
    empty: "暂无内容",
    retry: "重试",
  },
  "en-US": {
    applicationName: "Violin ERP Lite",
    loading: "Loading application",
    unavailable: "Application unavailable",
    empty: "No content",
    retry: "Retry",
  },
} as const;

export function getShellMessages(locale: SupportedLocale = DEFAULT_LOCALE) {
  return shellMessages[locale];
}
