import { describe, expect, it } from "vitest";
import { deriveProductionState } from "../src/workflow/production-state.js";
const row = (planned: number, inbound: number) => ({
  planned,
  inbound,
  confirmedInbound: inbound,
  ledgerInbound: inbound,
});
describe("CR-014 production business state", () => {
  it("does not interpret old completion as inbound", () => {
    expect(deriveProductionState("completed", [row(100, 0)]).businessStatus).toBe("in_production");
  });
  it("requires every SKU to be fully received", () => {
    expect(deriveProductionState("in_production", [row(100, 40), row(50, 50)]).businessStatus).toBe(
      "partially_received",
    );
    expect(
      deriveProductionState("partially_received", [row(100, 100), row(50, 50)]).businessStatus,
    ).toBe("received");
  });
  it("isolates inconsistent evidence and unsupported historical states", () => {
    for (const rows of [[row(10, 11)], [{ ...row(10, 5), ledgerInbound: 0 }], []]) {
      expect(deriveProductionState("completed", rows).legacyReviewRequired).toBe(true);
    }
    expect(deriveProductionState("draft", [row(10, 0)]).legacyReviewRequired).toBe(true);
  });
  it("keeps cancellation terminal without hiding inventory evidence", () => {
    expect(deriveProductionState("cancelled", [row(10, 0)]).businessStatus).toBe("cancelled");
    expect(deriveProductionState("cancelled", [row(10, 5)]).legacyReviewRequired).toBe(true);
  });
});
