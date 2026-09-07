import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PermissionProvider } from "@/contexts/permission-context";
import { UserProvider } from "@/contexts/user-context";
import {
  WORKFLOW_FORM_HELP_TEXT,
  WORKFLOW_SURFACE_CLASSES,
  WorkflowWorkbench,
  actionsFor,
  formFor,
  purchaseDeleteVisible,
} from "@/components/workflow/workflow-workbench";
import {
  crossBorderViews,
  inboundViews,
  inventoryViews,
  procurementViews,
  productionViews,
  warehouseOperationViews,
} from "@/lib/workflow";

describe("Parallel workflow pages", () => {
  it("shows purchase delete only for permitted draft or administrator UAT cancelled", () => {
    const visible = (
      status: string,
      administrator = false,
      canCancel = true,
      remark = "UAT-003A-test",
    ) => purchaseDeleteVisible("purchase-orders", { status, remark }, canCancel, administrator);
    expect(visible("draft")).toBe(true);
    expect(visible("draft", false, false)).toBe(false);
    expect(visible("cancelled")).toBe(false);
    expect(visible("cancelled", true)).toBe(true);
    expect(visible("cancelled", true, true, "正式订单")).toBe(false);
    for (const status of ["approved", "completed", "pending_approval", "rejected"])
      expect(visible(status, true)).toBe(false);
    expect(purchaseDeleteVisible("production-orders", { status: "draft" }, true, true)).toBe(false);
  });
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
    expect(productionViews[0]?.description).toContain("无需采购订单");
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
    expect(formFor(procurementViews[2]!)?.fields.map((field) => field.label)).toContain("采购订单");
    expect(formFor(procurementViews[3]!)?.fields.map((field) => field.label)).toContain(
      "已确认采购质检单",
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

  it("keeps the Batch 002-C core flow business-friendly without technical prompts", () => {
    const coreViews = [
      procurementViews[0],
      productionViews[0],
      procurementViews[2],
      procurementViews[3],
      inventoryViews[2],
      warehouseOperationViews[3],
      crossBorderViews[0],
      warehouseOperationViews[4],
    ];

    for (const view of coreViews) {
      const form = formFor(view!);
      expect(form).toBeDefined();
      const labels = [
        ...(form?.fields.map((field) => field.label) ?? []),
        ...(form?.itemFields?.map((field) => field.label) ?? []),
      ].join(" / ");

      expect(labels).not.toMatch(/UUID|JSON|DTO|英文状态码|内部技术字段/i);
    }

    expect(WORKFLOW_FORM_HELP_TEXT).not.toMatch(/UUID|JSON|DTO|英文状态码|内部技术字段/i);
    expect(WORKFLOW_FORM_HELP_TEXT).toContain("中文业务表单");
  });

  it("covers the procurement-production-inventory-sales-cross-border loop with existing APIs", () => {
    const purchase = procurementViews[0]!;
    const production = productionViews[0]!;
    const inspection = procurementViews[2]!;
    const inbound = procurementViews[3]!;
    const adjustment = inventoryViews[2]!;
    const outbound = warehouseOperationViews[3]!;
    const crossBorder = crossBorderViews[0]!;
    const salesReturn = warehouseOperationViews[4]!;

    expect(purchase.createApiPath).toBe("/api/v1/purchase-orders");
    expect(production.createApiPath).toBe("/api/v1/production-orders");
    expect(inspection.createApiPath).toBe("/api/v1/inspection-orders");
    expect(inbound.createApiPath).toBe("/api/v1/inbound-orders/purchase");
    expect(adjustment.createApiPath).toBe("/api/v1/inventory-adjustments");
    expect(outbound.createApiPath).toBe("/api/v1/outbound-orders/domestic-sales");
    expect(crossBorder.createApiPath).toBe("/api/v1/cross-border-shipments");
    expect(salesReturn.createApiPath).toBe("/api/v1/sales-returns");

    expect(actionsFor(inbound).map((action) => action.label)).toContain("确认入库");
    expect(actionsFor(outbound).map((action) => action.label)).toContain("确认出库");
    expect(actionsFor(crossBorder).map((action) => action.label)).toContain("确认发货");
    expect(actionsFor(salesReturn).map((action) => action.label)).toContain("退货入库");
  });

  it("keeps Sales MVP on OUT/SRT routes instead of adding an unapproved SALES API", () => {
    const outbound = warehouseOperationViews.find((view) => view.id === "domestic-outbound")!;
    const salesReturn = warehouseOperationViews.find((view) => view.id === "sales-returns")!;

    expect(outbound.apiPath).toContain("/api/v1/outbound-orders");
    expect(outbound.createApiPath).toContain("/api/v1/outbound-orders/domestic-sales");
    expect(salesReturn.apiPath).toContain("/api/v1/sales-returns");
    for (const path of [outbound.apiPath, outbound.createApiPath, salesReturn.apiPath]) {
      expect(path).not.toMatch(/^\/api\/v1\/sales(\/|\?|$)/);
    }
  });

  it("does not fake platform or store persistence on cross-border shipment without CR", () => {
    const fields = formFor(crossBorderViews[0]!)?.fields.map((field) => field.key);
    const optionKeys = formFor(crossBorderViews[0]!)?.optionSources?.map((source) => source.key);

    expect(fields).toEqual(
      expect.arrayContaining([
        "sourceWarehouseId",
        "transitWarehouseId",
        "destinationWarehouseId",
        "shipmentBatchNo",
        "transportMethod",
      ]),
    );
    expect(fields).not.toEqual(expect.arrayContaining(["platformId", "storeId"]));
    expect(optionKeys).not.toEqual(expect.arrayContaining(["platforms", "stores"]));
  });

  it("does not show duplicate status actions on business documents", () => {
    const views = [
      procurementViews[0],
      productionViews[0],
      procurementViews[2],
      procurementViews[3],
      inventoryViews[2],
      warehouseOperationViews[3],
      crossBorderViews[0],
      warehouseOperationViews[4],
    ];

    for (const view of views) {
      const labels = actionsFor(view!).map((action) => action.label);
      expect(new Set(labels).size).toBe(labels.length);
    }
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

  it("uses opaque workflow drawer and dialog surfaces for UAT-012", () => {
    expect(WORKFLOW_SURFACE_CLASSES.dialogOverlay).toContain("bg-slate-950/45");
    expect(WORKFLOW_SURFACE_CLASSES.drawerOverlay).toContain("bg-slate-950/45");
    expect(WORKFLOW_SURFACE_CLASSES.dialogContent).toContain("!bg-white");
    expect(WORKFLOW_SURFACE_CLASSES.drawerContent).toContain("!bg-white");
    expect(WORKFLOW_SURFACE_CLASSES.dialogContent).not.toContain("bg-transparent");
    expect(WORKFLOW_SURFACE_CLASSES.drawerContent).not.toContain("bg-transparent");
  });

  it("keeps workflow form sections, controls and footer opaque for UAT-012", () => {
    expect(WORKFLOW_SURFACE_CLASSES.sectionCard).toContain("!bg-white");
    expect(WORKFLOW_SURFACE_CLASSES.detailCard).toContain("!bg-white");
    expect(WORKFLOW_SURFACE_CLASSES.fieldPanel).toContain("!bg-white");
    expect(WORKFLOW_SURFACE_CLASSES.formControl).toContain("!bg-white");
    expect(WORKFLOW_SURFACE_CLASSES.formControl).toContain("border-slate-300");
    expect(WORKFLOW_SURFACE_CLASSES.textareaControl).toContain("!bg-white");
    expect(WORKFLOW_SURFACE_CLASSES.dialogFooter).toContain("!bg-white");
  });

  it("applies the same opaque business form shell across core workflow modules", () => {
    const coreViews = [
      procurementViews[0],
      productionViews[0],
      procurementViews[2],
      procurementViews[3],
      inventoryViews[2],
      warehouseOperationViews[3],
      crossBorderViews[0],
      warehouseOperationViews[4],
    ];

    for (const view of coreViews) {
      expect(view).toBeDefined();
      expect(formFor(view!)).toBeDefined();
    }
    expect(WORKFLOW_SURFACE_CLASSES.dialogContent).toContain("max-w-4xl");
    expect(WORKFLOW_SURFACE_CLASSES.dialogBody).toContain("overflow-y-auto");
    expect(WORKFLOW_SURFACE_CLASSES.dialogFooter).toContain("border-t");
  });
});
