import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PermissionProvider } from "@/contexts/permission-context";
import { UserProvider } from "@/contexts/user-context";
import { WorkflowWorkbench, actionsFor, formFor } from "@/components/workflow/workflow-workbench";
import {
  crossBorderViews,
  inboundViews,
  inventoryViews,
  procurementViews,
  productionViews,
  warehouseOperationViews,
} from "@/lib/workflow";

describe("Parallel workflow pages", () => {
  it("keeps procurement and production routes independent", () => {
    expect(procurementViews.map((view) => view.id)).toEqual([
      "purchase-orders",
      "purchase-payments",
      "purchase-inspections",
      "purchase-inbound",
    ]);
    expect(productionViews.map((view) => view.id)).toEqual([
      "production-orders",
      "production-progress",
      "production-completions",
      "production-inspections",
      "production-inbound",
    ]);
    expect(procurementViews[0]?.description).toContain("不触发生产");
    expect(productionViews[0]?.description).toContain("不接收采购订单标识");
  });

  it("limits inbound confirmation workbench to purchase and production sources", () => {
    expect(inboundViews.map((view) => view.sourceType)).toEqual(["purchase", "production"]);
    expect(inboundViews.some((view) => view.apiPath.includes("other"))).toBe(false);
  });

  it("exposes the complete Task 7.5-C PC workbenches inside the existing shell", () => {
    expect(inventoryViews.map((view) => view.id)).toEqual([
      "inventory-balances",
      "inventory-ledger",
      "inventory-adjustments",
      "inventory-alerts",
    ]);
    expect(warehouseOperationViews.map((view) => view.id)).toEqual([
      "transfer-orders",
      "stock-counts",
      "damage-reports",
      "domestic-outbound",
      "sales-returns",
    ]);
    expect(crossBorderViews.map((view) => view.id)).toEqual([
      "cross-border-shipments",
      "overseas-inventories",
      "overseas-imports",
    ]);
    expect(
      warehouseOperationViews.find((view) => view.id === "domestic-outbound")?.apiPath,
    ).toContain("outboundType=domestic_sales");
    expect(crossBorderViews[0]?.description).toContain("运输方式");
  });

  it("renders business forms without JSON DTO or manual UUID prompts", () => {
    const purchasePayment = procurementViews.find((view) => view.id === "purchase-payments")!;
    const html = renderToStaticMarkup(
      <UserProvider user={{ displayName: "管理员", id: "11111111-1111-4111-8111-111111111111" }}>
        <PermissionProvider permissions={["purchase.payment.create"]}>
          <WorkflowWorkbench view={purchasePayment} />
        </PermissionProvider>
      </UserProvider>,
    );

    expect(html).toContain("请选择采购订单");
    expect(html).not.toContain("请求 DTO");
    expect(html).not.toContain("JSON");
    expect(html).not.toContain("UUID");
  });

  it("defines Chinese business form fields for the core UAT Batch 002-A flows", () => {
    expect(formFor(procurementViews[0]!)?.fields.map((field) => field.label)).toContain("供应商");
    expect(formFor(productionViews[0]!)?.fields.map((field) => field.label)).toContain("生产厂家");
    expect(formFor(procurementViews[2]!)?.fields.map((field) => field.label)).toContain(
      "采购来源单",
    );
    expect(formFor(procurementViews[3]!)?.fields.map((field) => field.label)).toContain(
      "已确认验收单",
    );
    expect(formFor(inventoryViews[2]!)?.itemFields?.map((field) => field.label)).toContain("方向");
    expect(formFor(warehouseOperationViews[3]!)?.fields.map((field) => field.label)).toContain(
      "客户快照",
    );
    expect(formFor(crossBorderViews[0]!)?.fields.map((field) => field.label)).toContain("运输方式");
    expect(formFor(warehouseOperationViews[4]!)?.fields.map((field) => field.label)).toContain(
      "原销售出库单",
    );
  });

  it("exposes Chinese status action buttons through existing permission codes", () => {
    expect(actionsFor(procurementViews[0]!).map((action) => action.label)).toEqual([
      "提交",
      "撤回",
      "审核",
      "驳回",
      "反审核",
      "取消",
    ]);
    expect(actionsFor(crossBorderViews[0]!).map((action) => action.label)).toContain("确认发货");
    expect(actionsFor(warehouseOperationViews[4]!).map((action) => action.label)).toContain(
      "退货入库",
    );
    expect(actionsFor(inventoryViews[2]!).map((action) => action.permission)).toContain(
      "inventory.adjustment.execute",
    );
  });
});
