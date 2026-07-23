import { describe, expect, it } from "vitest";
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
});
