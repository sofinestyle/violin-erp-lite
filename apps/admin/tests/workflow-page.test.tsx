import { describe, expect, it } from "vitest";
import { inboundViews, procurementViews, productionViews } from "@/lib/workflow";

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
});
