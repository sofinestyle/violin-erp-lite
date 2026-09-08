// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { MasterDataWorkbench } from "../components/master-data/master-data-workbench";
import { PermissionProvider } from "../contexts/permission-context";
import { MASTER_WORKBENCHES } from "../lib/master-data";
import { authenticatedFetch } from "../lib/auth-client";
import { toast } from "../components/common/toast";
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("../lib/auth-client", () => ({ authenticatedFetch: vi.fn() }));
vi.mock("../components/common/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const tick = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
  });

describe("warehouse create feedback and list refresh", () => {
  it.each([true, false])(
    "refreshes only successful creates and never reports failed save as success (%s)",
    async (success) => {
      vi.clearAllMocks();
      let created = false;
      const calls: string[] = [];
      vi.mocked(authenticatedFetch).mockImplementation(async (url, init) => {
        calls.push(String(url));
        if (init?.method === "POST") {
          created = success;
          return {
            ok: success,
            status: success ? 201 : 422,
            headers: new Headers(),
            json: async () =>
              success
                ? { success: true, data: { id: "created" } }
                : { success: false, error: { message: "仓库校验失败" } },
          } as Response;
        }
        return {
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => ({
            success: true,
            data: created
              ? [
                  {
                    id: "created",
                    warehouseCode: "WH-000123",
                    warehouseName: "UAT-REFRESH",
                    isActive: true,
                  },
                ]
              : [],
            meta: { total: created ? 1 : 0 },
          }),
        } as Response;
      });
      const element = document.createElement("div");
      document.body.append(element);
      const root = createRoot(element);
      const definition = MASTER_WORKBENCHES.find((item) => item.key === "warehouses")!;
      await act(async () =>
        root.render(
          <PermissionProvider permissions={["master.warehouse.read", "master.warehouse.create"]}>
            <MasterDataWorkbench definition={definition} group="master" />
          </PermissionProvider>,
        ),
      );
      await tick();
      const status =
        element.querySelector<HTMLSelectElement>('select[aria-label="状态"]') ??
        element.querySelector<HTMLSelectElement>("select")!;
      await act(async () => {
        status.value = "false";
        status.dispatchEvent(new Event("change", { bubbles: true }));
      });
      await tick();
      const button = [...element.querySelectorAll("button")].find((item) =>
        item.textContent?.includes("新增仓库"),
      )!;
      await act(async () => button.click());
      await tick();
      const name = element.querySelector<HTMLInputElement>('input[name="warehouseName"]')!;
      name.value = "UAT-REFRESH";
      await act(async () =>
        element
          .querySelector("form")!
          .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
      );
      await tick();
      if (success) {
        expect(toast.success).toHaveBeenCalledWith("仓库创建成功");
        expect(element.querySelector("table")?.textContent).toContain("WH-000123");
        const last = new URL(calls[calls.length - 1]!, "http://localhost");
        expect(last.searchParams.get("isActive")).toBeNull();
        expect(last.searchParams.get("page")).toBe("1");
      } else {
        expect(toast.success).not.toHaveBeenCalled();
        expect(element.textContent).toContain("仓库校验失败");
        expect(element.querySelector('[role="dialog"]')).not.toBeNull();
      }
      await act(async () => root.unmount());
      element.remove();
    },
  );
});
