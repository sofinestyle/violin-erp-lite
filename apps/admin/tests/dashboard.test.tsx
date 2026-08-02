import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Dashboard } from "../components/dashboard/dashboard";
import { PermissionProvider } from "../contexts/permission-context";

describe("Dashboard", () => {
  it("renders the approved MVP dashboard foundation without placeholder copy", () => {
    const html = renderToStaticMarkup(
      <PermissionProvider
        permissions={[
          "cross-border.shipment.read",
          "inventory.stock.read",
          "master.product.create",
          "master.product.read",
          "master.sku.read",
          "master.store.read",
          "master.warehouse.read",
          "outbound.order.read",
          "purchase.order.read",
          "production.order.read",
        ]}
      >
        <Dashboard />
      </PermissionProvider>,
    );

    expect(html).toContain("业务工作台");
    expect(html).toContain("业务概览");
    expect(html).toContain("待我处理");
    expect(html).toContain("常用入口");
    expect(html).toContain("新增产品");
    expect(html).not.toContain("当前仅提供导航与公共状态占位");
  });
});
