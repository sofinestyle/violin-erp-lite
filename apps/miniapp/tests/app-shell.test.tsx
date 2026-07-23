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

  it("keeps Task 7.5-C miniapp capabilities read-only", () => {
    const inventoryPath = fileURLToPath(
      new URL("../src/pages/inventory/index.tsx", import.meta.url),
    );
    const source = readFileSync(inventoryPath, "utf8");
    expect(source).toContain("库存余额查询");
    expect(source).toContain("库存流水查询");
    expect(source).toContain("出入库查询");
    expect(source).toContain("跨境查询");
    expect(source).not.toContain("新增");
    expect(source).not.toContain("审批");
  });
});
