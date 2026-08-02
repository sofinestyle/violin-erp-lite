import type { PermissionCode } from "@violin-erp/api";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import GlobalError from "../app/global-error";
import NotFound from "../app/not-found";
import { EmptyState } from "../components/common/empty-state";
import { PermissionWrapper } from "../components/common/permission-wrapper";
import { AppShell } from "../components/shell/app-shell";
import { GlobalErrorState } from "../components/shell/global-error-state";
import { GlobalLoading } from "../components/shell/global-loading";
import { PermissionProvider } from "../contexts/permission-context";
import { ThemeProvider, useTheme } from "../contexts/theme-context";
import { UserProvider, useUser } from "../contexts/user-context";
import { fetchHealth } from "../lib/health";
import { navigationItems } from "../lib/navigation";

function ThemeProbe() {
  return <span>{useTheme().theme}</span>;
}

function UserProbe() {
  return <span>{useUser().user?.displayName ?? "empty-user"}</span>;
}

function ShellTestProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <PermissionProvider permissions={["security.user.read"]}>
        <UserProvider>{children}</UserProvider>
      </PermissionProvider>
    </ThemeProvider>
  );
}

describe("PC application shell", () => {
  it("renders the Phase 4 navigation and responsive header controls", () => {
    const html = renderToStaticMarkup(
      <ShellTestProviders>
        <AppShell activeSection="home" />
      </ShellTestProviders>,
    );

    expect(navigationItems).toHaveLength(10);
    for (const item of navigationItems) expect(html).toContain(item.label);
    expect(html).toContain("当前仅提供导航与公共状态占位");
    expect(html).toContain("当前主题 Light Mode");
    expect(html).toContain("打开帮助");
    expect(html).toContain("打开通知");
    expect(html).toContain("打开用户菜单");
    expect(html).not.toContain("退出登录</button>");
  });

  it("keeps the theme fixed to light and the default user empty", () => {
    const themeHtml = renderToStaticMarkup(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );
    const userHtml = renderToStaticMarkup(
      <UserProvider>
        <UserProbe />
      </UserProvider>,
    );

    expect(themeHtml).toContain("light");
    expect(userHtml).toContain("empty-user");
  });

  it("uses Task 7.3-C permission codes for display-only permission checks", () => {
    const permission: PermissionCode = "master.product.read";
    const allowed = renderToStaticMarkup(
      <PermissionProvider permissions={[permission]}>
        <PermissionWrapper permission={permission}>allowed</PermissionWrapper>
      </PermissionProvider>,
    );
    const denied = renderToStaticMarkup(
      <PermissionProvider>
        <PermissionWrapper permission={permission} fallback="denied">
          allowed
        </PermissionWrapper>
      </PermissionProvider>,
    );

    expect(allowed).toContain("allowed");
    expect(denied).toContain("denied");
  });

  it("accepts the approved health response", async () => {
    const fetcher = async () =>
      new Response(
        JSON.stringify({
          success: true,
          requestId: "013f88bb-bbac-7cf8-8bac-531414f684aa",
          data: { application: { status: "ok" }, database: { status: "connected" } },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );

    await expect(fetchHealth("/api/health", fetcher)).resolves.toEqual({
      requestId: "013f88bb-bbac-7cf8-8bac-531414f684aa",
      applicationStatus: "ok",
      databaseStatus: "connected",
    });
  });

  it("rejects failed or malformed health responses safely", async () => {
    const fetcher = async () =>
      new Response(JSON.stringify({ success: false, error: { code: "SERVICE_UNAVAILABLE" } }), {
        status: 503,
      });

    await expect(fetchHealth("/api/health", fetcher)).rejects.toThrow("HEALTH_CHECK_FAILED");
  });

  it("renders global empty, loading and error states", () => {
    expect(renderToStaticMarkup(<EmptyState />)).toContain("暂无内容");
    expect(renderToStaticMarkup(<GlobalLoading />)).toContain("正在加载应用");
    expect(renderToStaticMarkup(<GlobalErrorState />)).toContain("应用暂时不可用");
  });

  it("renders 404 and 500 foundations without sensitive details", () => {
    const notFound = renderToStaticMarkup(<NotFound />);
    const serverError = renderToStaticMarkup(
      <GlobalError error={new Error("sensitive detail")} reset={() => undefined} />,
    );

    expect(notFound).toContain("404");
    expect(notFound).toContain("页面不存在");
    expect(serverError).toContain("系统暂时不可用");
    expect(serverError).not.toContain("sensitive detail");
  });
});
