import { describe, expect, it } from "vitest";
import {
  formFor,
  formatWorkflowApiError,
  actionsFor,
} from "@/components/workflow/workflow-workbench";
import { procurementViews, productionViews } from "@/lib/workflow";
import {
  actionStateAllowed,
  availableSourceQuantity,
  eligibleSourceRows,
  sourceContextFor,
  dualFlowStatusOptions,
} from "@/lib/dual-flow";
const purchase = procurementViews[0]!,
  production = productionViews[0]!,
  inbound = productionViews[1]!;
describe("CR-014 independent direct inbound flows", () => {
  it("keeps Chinese validation and request trace", () => {
    const text = formatWorkflowApiError({
      error: {
        message: "qualifiedQuantity 无效",
        details: [{ field: "qualifiedQuantity", message: "必须是非负数" }],
      },
      requestId: "uat-source-error",
    });
    expect(text).toContain("合格数量");
    expect(text).toContain("Request ID：uat-source-error");
  });
  it("preserves separate sources and removes duplicate planned start input", () => {
    expect(JSON.stringify(formFor(production))).not.toContain("purchase-orders");
    expect(formFor(production)?.fields.map((f) => f.key)).not.toContain("plannedStartDate");
    expect(formFor(inbound)?.optionSources?.[0]?.key).toBe("productionOrders");
  });
  it("filters terminal and inconsistent production sources", () => {
    const rows = ["in_production", "partially_received", "received", "cancelled"].map((status) => ({
      id: status,
      businessStatus: status,
    }));
    expect(eligibleSourceRows(inbound, "productionOrders", rows).map((r) => r.id)).toEqual([
      "in_production",
      "partially_received",
    ]);
    expect(sourceContextFor(inbound, rows[0]!)).toEqual({ productionOrderId: "in_production" });
    expect(() => sourceContextFor(inbound, rows[2]!)).toThrow();
  });
  it("calculates remaining quantity per SKU independently", () => {
    expect(
      availableSourceQuantity(inbound, { id: "a", plannedQuantity: 100, inboundQuantity: 40 }),
    ).toBe(60);
    expect(
      availableSourceQuantity(inbound, { id: "b", plannedQuantity: 50, inboundQuantity: 50 }),
    ).toBe(0);
    expect(
      availableSourceQuantity(procurementViews[1]!, { id: "p", quantity: 10, inboundQuantity: 0 }),
    ).toBe(10);
  });
  it("removes intermediate actions and retains existing permission boundary", () => {
    expect(actionsFor(production).map((a) => a.action)).toEqual(["cancel"]);
    expect(actionsFor(inbound)).toEqual([]);
    expect(actionStateAllowed(production, "start", { id: "p", status: "approved" })).toBe(false);
    expect(actionStateAllowed(production, "cancel", { id: "p", businessStatus: "received" })).toBe(
      false,
    );
    expect(
      actionStateAllowed(purchase, "approve", { id: "p", businessStatus: "pending_approval" }),
    ).toBe(true);
  });
  it("offers only four new production states", () => {
    expect(dualFlowStatusOptions(production)?.map((s) => s[1])).toEqual([
      "生产中",
      "部分入库",
      "已入库",
      "已取消",
    ]);
  });
});
