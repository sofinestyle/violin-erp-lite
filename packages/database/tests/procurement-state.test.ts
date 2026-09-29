import { describe, it, expect } from "vitest";
import { projectProcurementState } from "../src/workflow/procurement-state";
import { assertWholeProcurement, procurementInspector } from "../src/workflow/procurement-rules";
const item = {
  id: "line",
  quantity: 100,
  inspected_quantity: 0,
  qualified_quantity: 0,
  inbound_quantity: 0,
};
const order = {
  status: "pending_approval",
  approval_status: "pending",
  purchase_order_items: [item],
};
describe("whole-order procurement evidence and quantity boundaries", () => {
  it("maps saving, approval, inspection and inbound using confirmation evidence", () => {
    expect(projectProcurementState(order, false, false).businessStatus).toBe("pending_approval");
    expect(
      projectProcurementState(
        {
          ...order,
          status: "purchasing",
          approval_status: "approved",
          approved_by: "actor",
          approved_at: new Date(),
        },
        false,
        false,
      ).businessStatus,
    ).toBe("purchasing");
    const inspected = {
      ...order,
      status: "approved",
      purchase_order_items: [{ ...item, inspected_quantity: 100, qualified_quantity: 98 }],
    };
    expect(projectProcurementState(inspected, true, false).legacyReviewRequired).toBe(true);
    expect(
      projectProcurementState(
        {
          ...inspected,
          purchase_order_items: [{ ...item, inspected_quantity: 100, qualified_quantity: 100 }],
        },
        true,
        false,
      ).businessStatus,
    ).toBe("purchasing");
    expect(
      projectProcurementState(
        {
          ...order,
          status: "received",
          purchase_order_items: [{ ...item, inbound_quantity: 100 }],
        },
        false,
        true,
      ).businessStatus,
    ).toBe("received");
    expect(projectProcurementState(inspected, false, false).legacyReviewRequired).toBe(true);
    expect(
      projectProcurementState(
        {
          ...inspected,
          purchase_order_items: [
            { ...item, inspected_quantity: 100, qualified_quantity: 98, inbound_quantity: 98 },
          ],
        },
        true,
        true,
      ).businessStatus,
    ).toBe("received");
  });
  it("isolates contradictory completed history and maps cancelled terminal history", () => {
    expect(
      projectProcurementState({ ...order, status: "completed" }, false, false).legacyReviewRequired,
    ).toBe(true);
    expect(
      projectProcurementState({ ...order, status: "cancelled" }, false, false).businessStatus,
    ).toBe("cancelled");
  });
  it("rejects partial, missing, repeated and already executed inspection or inbound", () => {
    expect(() =>
      assertWholeProcurement(
        [item],
        [{ source_item_id: "line", inspected_quantity: 100 }],
        "inspection",
      ),
    ).not.toThrow();
    expect(() =>
      assertWholeProcurement(
        [item],
        [{ source_item_id: "line", inspected_quantity: 40 }],
        "inspection",
      ),
    ).toThrow("整单");
    expect(() => assertWholeProcurement([item], [], "inspection")).toThrow();
    expect(() =>
      assertWholeProcurement(
        [item],
        [
          { source_item_id: "line", inspected_quantity: 100 },
          { source_item_id: "line", inspected_quantity: 100 },
        ],
        "inspection",
      ),
    ).toThrow();
    expect(() =>
      assertWholeProcurement(
        [{ ...item, qualified_quantity: 98 }],
        [{ source_document_item_id: "line", quantity: 98 }],
        "inbound",
      ),
    ).not.toThrow();
    expect(() =>
      assertWholeProcurement(
        [{ ...item, qualified_quantity: 98, inbound_quantity: 98 }],
        [{ source_document_item_id: "line", quantity: 98 }],
        "inbound",
      ),
    ).toThrow();
  });
  it("uses a real inspector name without account or warehouse substitutes", () => {
    expect(procurementInspector({ inspectorName: "  UAT质检员  " })).toEqual({
      inspector_name: "UAT质检员",
      inspector_id: null,
      inspection_warehouse_id: null,
    });
    expect(() => procurementInspector({ inspectorName: "" })).toThrow();
    expect(() => procurementInspector({ inspectorName: "A", inspectorId: "uuid" })).toThrow();
  });
});
