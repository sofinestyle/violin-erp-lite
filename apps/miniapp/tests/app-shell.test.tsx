import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AppProviders, useAppContext } from "../src/contexts/app-context";

function ContextProbe() {
  const context = useAppContext();
  return (
    <span>
      {context.theme}:{context.locale}:{context.user === null ? "empty-user" : "user"}:
      {context.healthEndpoint === null ? "reserved-health" : "configured-health"}
    </span>
  );
}

describe("miniapp application shell", () => {
  it("configures exactly the four approved TabBar entries", () => {
    const configPath = fileURLToPath(new URL("../src/app.config.ts", import.meta.url));
    const configSource = readFileSync(configPath, "utf8");
    const labels = [...configSource.matchAll(/text: "([^"]+)"/g)].map((match) => match[1]);
    const pagePaths = [...configSource.matchAll(/pagePath: "([^"]+)"/g)].map((match) => match[1]);

    expect(labels).toEqual(["首页", "业务", "库存", "我的"]);
    expect(pagePaths).toHaveLength(4);
    expect(configSource).not.toContain("扫一扫");
    expect(configSource).not.toContain("消息");
  });

  it("uses an empty user, empty permissions, fixed light and reserved health capability", () => {
    const html = renderToStaticMarkup(
      <AppProviders>
        <ContextProbe />
      </AppProviders>,
    );

    expect(html).toContain("light:zh-CN:empty-user:reserved-health");
    expect(html).not.toContain("dark");
  });
});
