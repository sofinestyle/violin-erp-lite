import { describe, expect, it } from "vitest";
import { formFor, formatWorkflowApiError } from "@/components/workflow/workflow-workbench";
import { procurementViews, productionViews } from "@/lib/workflow";
import {
  actionStateAllowed,
  availableSourceQuantity,
  dualActionPayload,
  eligibleSourceRows,
  sourceContextFor,
} from "@/lib/dual-flow";

const purchase = procurementViews[0]!;
const production = productionViews[0]!;
const purchaseInspection = procurementViews[2]!;
const productionInspection = productionViews[3]!;
const purchaseInbound = procurementViews[3]!;
const productionInbound = productionViews[4]!;
const completion = productionViews[2]!;

describe("Independent procurement and production UI orchestration", () => {
  it("shows business field errors in Chinese while retaining Request ID", () => {
    const message = formatWorkflowApiError({
      error: {
        message: "qualifiedQuantity 无效",
        details: [{ field: "qualifiedQuantity", message: "必须是非负数" }],
      },
      requestId: "uat-source-error",
    });
    expect(message).toContain("合格数量");
    expect(message).not.toContain("qualifiedQuantity");
    expect(message).toContain("Request ID：uat-source-error");
  });
  it("creates production directly with manufacturer/SKU, without purchase fields or requests", () => {
    const form = formFor(production)!;
    expect(form.fields.map((field) => field.key)).not.toContain("purchaseOrderId");
    expect(JSON.stringify(form)).not.toContain("purchase-orders");
    expect(form.fields.map((field) => field.key)).toContain("manufacturerId");
    expect(JSON.stringify(formFor(purchase))).not.toContain("manufacturerId");
  });

  it("keeps inspection sources separate and filters approved/production-completed status", () => {
    expect(formFor(purchaseInspection)?.optionSources?.[0]?.path).toContain("purchase-orders");
    expect(formFor(productionInspection)?.optionSources?.[0]?.path).toContain("production-orders");
    const rows = [
      { id: "draft", status: "draft" },
      { id: "approved", status: "approved" },
      { id: "done", status: "completed" },
    ];
    expect(eligibleSourceRows(purchaseInspection, "purchaseOrders", rows).map((r) => r.id)).toEqual(
      ["approved"],
    );
    expect(
      eligibleSourceRows(productionInspection, "productionOrders", rows).map((r) => r.id),
    ).toEqual(["approved", "done"]);
    expect(
      availableSourceQuantity(productionInspection, {
        id: "item",
        plannedQuantity: 100,
        completedQuantity: 0,
      }),
    ).toBe(0);
    expect(
      availableSourceQuantity(productionInspection, {
        id: "item",
        completedQuantity: 100,
        inspectedQuantity: 3,
      }),
    ).toBe(97);
    expect(
      availableSourceQuantity(purchaseInspection, {
        id: "item",
        quantity: 100,
        inspectedQuantity: 2,
      }),
    ).toBe(98);
  });

  it("only accepts confirmed matching inspection sources and derives the original order", () => {
    const rows = [
      { id: "p", sourceType: "purchase", status: "confirmed", purchaseOrderId: "po" },
      { id: "r", sourceType: "production", status: "confirmed", productionOrderId: "pro" },
      { id: "d", sourceType: "purchase", status: "draft" },
    ];
    expect(
      eligibleSourceRows(purchaseInbound, "purchaseInspections", rows).map((r) => r.id),
    ).toEqual(["p"]);
    expect(
      eligibleSourceRows(productionInbound, "productionInspections", rows).map((r) => r.id),
    ).toEqual(["r"]);
    expect(sourceContextFor(purchaseInbound, rows[0]!)).toEqual({ purchaseOrderId: "po" });
    expect(sourceContextFor(productionInbound, rows[1]!)).toEqual({ productionOrderId: "pro" });
    expect(() => sourceContextFor(purchaseInbound, rows[1]!)).toThrow("采购质检");
    expect(() => sourceContextFor(productionInbound, rows[0]!)).toThrow("成品质检");
    expect(() => sourceContextFor(purchaseInbound, rows[2]!)).toThrow("已确认");
    expect(formFor(purchaseInbound)?.fields.map((f) => f.key)).not.toContain("purchaseOrderId");
    expect(formFor(productionInbound)?.fields.map((f) => f.key)).not.toContain("productionOrderId");
  });

  it("limits inbound defaults by confirmed qualified and remaining order quantities", () => {
    const inspection = { id: "inspection-item", sourceItemId: "order-item", qualifiedQuantity: 98 };
    expect(
      availableSourceQuantity(purchaseInbound, inspection, {
        id: "po",
        purchaseOrderItems: [{ id: "order-item", qualifiedQuantity: 98, inboundQuantity: 10 }],
      }),
    ).toBe(88);
    expect(availableSourceQuantity(productionInbound, inspection)).toBe(0);
    expect(
      availableSourceQuantity(
        purchaseInbound,
        { ...inspection, qualifiedQuantity: 20 },
        {
          id: "po",
          purchaseOrderItems: [{ id: "order-item", qualifiedQuantity: 100, inboundQuantity: 0 }],
        },
      ),
    ).toBe(20);
  });

  it("hides invalid actions without changing the approved state machine", () => {
    expect(actionStateAllowed(purchase, "approve", { id: "p", status: "draft" })).toBe(false);
    expect(actionStateAllowed(purchase, "submit", { id: "p", status: "draft" })).toBe(true);
    expect(actionStateAllowed(production, "start", { id: "p", status: "approved" })).toBe(true);
    expect(actionStateAllowed(production, "start", { id: "p", status: "in_production" })).toBe(
      false,
    );
    expect(
      actionStateAllowed(purchaseInspection, "confirm", {
        id: "i",
        status: "pending_confirmation",
      }),
    ).toBe(true);
    expect(actionStateAllowed(productionInspection, "confirm", { id: "i", status: "draft" })).toBe(
      false,
    );
    expect(actionStateAllowed(purchaseInbound, "confirm", { id: "i", status: "draft" })).toBe(
      false,
    );
    expect(actionStateAllowed(completion, "confirm", { id: "c", completionStatus: "Draft" })).toBe(
      true,
    );
    expect(
      actionStateAllowed(completion, "confirm", { id: "c", completionStatus: "Confirmed" }),
    ).toBe(false);
  });

  it("loads completion versions internally, uses existing completion/start/inbound payloads", () => {
    expect(formFor(completion)?.fields.map((f) => f.key)).not.toContain("productionOrderVersionNo");
    expect(sourceContextFor(completion, { id: "p", versionNo: 4 })).toEqual({
      productionOrderVersionNo: 4,
    });
    expect(
      dualActionPayload(completion, "confirm", { id: "c" }, { productionOrderVersionNo: 4 }),
    ).toEqual({ productionOrderVersionNo: 4 });
    expect(() => dualActionPayload(production, "start", { id: "p", versionNo: 3 })).toThrow(
      "实际开始日期",
    );
    expect(
      dualActionPayload(
        production,
        "start",
        { id: "p", versionNo: 3 },
        { actualStartDate: "2026-09-07", progressDescription: "开工" },
      ),
    ).toMatchObject({ versionNo: 3, progressDescription: "开工" });
    expect(
      dualActionPayload(purchaseInbound, "confirm", {
        id: "i",
        versionNo: 3,
        status: "approved",
        inboundOrderItems: [{ id: "line", quantity: 98 }],
      }),
    ).toEqual({ versionNo: 3, items: [{ inboundOrderItemId: "line", quantity: 98 }] });
  });
});
