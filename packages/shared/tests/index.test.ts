import { describe, expect, it } from "vitest";
import {
  DEFAULT_HEALTH_ENDPOINT,
  DEFAULT_LOCALE,
  getShellMessages,
  supportedLocales,
} from "../src/index";

describe("@violin-erp/shared skeleton", () => {
  it("uses Chinese as the default shell locale and reserves English", () => {
    expect(DEFAULT_LOCALE).toBe("zh-CN");
    expect(supportedLocales).toEqual(["zh-CN", "en-US"]);
    expect(getShellMessages().loading).toBe("正在加载应用");
    expect(DEFAULT_HEALTH_ENDPOINT).toBe("/api/health");
  });
});
