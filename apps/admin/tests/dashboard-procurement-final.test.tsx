// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { Dashboard } from "../components/dashboard/dashboard";
import { PermissionProvider } from "../contexts/permission-context";
import { authenticatedFetch } from "../lib/auth-client";
vi.mock("../lib/auth-client", () => ({ authenticatedFetch: vi.fn() }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
describe("CR-013 dashboard procurement queues", () => {
  it("loads purchasing orders for receipt and keeps pending production inbound separate", async () => {
    const paths: string[] = [];
    vi.mocked(authenticatedFetch).mockImplementation(async (url) => {
      paths.push(String(url));
      return {
        ok: true,
        json: async () => ({
          success: true,
          data: [],
          meta: { total: String(url).includes("status=purchasing") ? 7 : 2 },
        }),
      } as Response;
    });
    const element = document.createElement("div");
    document.body.append(element);
    const root = createRoot(element);
    await act(async () =>
      root.render(
        <PermissionProvider permissions={["purchase.order.read", "inbound.order.read"]}>
          <Dashboard />
        </PermissionProvider>,
      ),
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(element.textContent).toContain("待采购入库");
    expect(element.textContent).toContain("7");
    expect(element.textContent).toContain("待生产入库单据");
    expect(element.textContent).not.toContain("待采购质检");
    expect(paths).toContain("/api/v1/purchase-orders?page=1&pageSize=1&status=purchasing");
    expect(paths).toContain(
      "/api/v1/inbound-orders?page=1&pageSize=1&status=pending_approval&sourceDocumentType=production_order",
    );
    await act(async () => root.unmount());
    element.remove();
  });
});
