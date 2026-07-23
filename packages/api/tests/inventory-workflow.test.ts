import { describe, expect, it, vi } from "vitest";
import {
  InMemoryAuditWriter,
  INVENTORY_WORKFLOW_API_IDS,
  INVENTORY_WORKFLOW_IMPLEMENTED_API_IDS,
  InventoryWorkflowService,
  matchInventoryWorkflowEndpoint,
  type AuthenticationContext,
  type InventoryWorkflowCommand,
  type InventoryWorkflowRepository,
} from "../src/index";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const DOCUMENT_ID = "22222222-2222-4222-8222-222222222222";
const context = {
  requestId: "33333333-3333-4333-8333-333333333333",
  timestamp: "2026-07-23T00:00:00.000Z",
};

function authentication(permissionCodes: string[]): AuthenticationContext {
  return {
    user: {
      dataScopes: ["all"],
      permissionCodes: permissionCodes as AuthenticationContext["user"]["permissionCodes"],
      roleCodes: ["administrator"],
      userId: USER_ID,
      username: "admin",
    },
  };
}

describe("Task 7.5-C Frozen API coverage", () => {
  it("registers every formal INV/TRF/STC/DMG/OUT/SRT/CBR API exactly once", () => {
    expect(INVENTORY_WORKFLOW_API_IDS).toHaveLength(123);
    expect(new Set(INVENTORY_WORKFLOW_API_IDS).size).toBe(123);
    expect(INVENTORY_WORKFLOW_IMPLEMENTED_API_IDS).toHaveLength(123);
    expect(new Set(INVENTORY_WORKFLOW_IMPLEMENTED_API_IDS).size).toBe(123);
    expect([...INVENTORY_WORKFLOW_IMPLEMENTED_API_IDS].sort()).toEqual(
      [...INVENTORY_WORKFLOW_API_IDS].sort(),
    );
  });

  it("maps representative formal routes to exact API IDs and permissions", () => {
    const cases = [
      ["GET", ["inventories"], "INV-002", "inventory.stock.read"],
      ["POST", ["transfer-orders", DOCUMENT_ID, "ship"], "TRF-011", "transfer.order.ship"],
      [
        "POST",
        ["stock-counts", DOCUMENT_ID, "initial-results"],
        "STC-010",
        "inventory.stock-count.initial-count",
      ],
      [
        "POST",
        ["stock-counts", DOCUMENT_ID, "complete"],
        "STC-012",
        "inventory.stock-count.complete",
      ],
      [
        "POST",
        ["damage-reports", DOCUMENT_ID, "confirm-outbound"],
        "DMG-010",
        "inventory.damage.confirm-outbound",
      ],
      ["POST", ["outbound-orders", DOCUMENT_ID, "confirm"], "OUT-012", "outbound.order.confirm"],
      [
        "POST",
        ["sales-returns", DOCUMENT_ID, "confirm-inbound"],
        "SRT-010",
        "outbound.sales-return.confirm-inbound",
      ],
      [
        "POST",
        ["cross-border-shipments", DOCUMENT_ID, "dispatch"],
        "CBR-012",
        "cross-border.shipment.dispatch",
      ],
    ] as const;
    for (const [method, segments, apiId, permission] of cases) {
      expect(
        matchInventoryWorkflowEndpoint(method, segments, new URLSearchParams(), {}),
      ).toMatchObject({ command: { apiId }, permission });
    }
  });

  it("requires CBR-003 transportMethod as a non-enum string of at most 50 characters", async () => {
    const repository: InventoryWorkflowRepository = { execute: vi.fn() };
    const service = new InventoryWorkflowService(repository, new InMemoryAuditWriter());
    const base: InventoryWorkflowCommand = {
      action: "create",
      apiId: "CBR-003",
      mutation: true,
      payload: {
        carrierName: "承运商",
        departureDate: "2026-07-23",
        destinationCountry: "US",
        destinationWarehouseId: DOCUMENT_ID,
        documentDate: "2026-07-23",
        estimatedArrivalDate: "2026-08-23",
        items: [{ skuId: DOCUMENT_ID }],
        shipmentBatchNo: "CB-001",
        sourceWarehouseId: DOCUMENT_ID,
        trackingNo: "TRACK",
        transitWarehouseId: USER_ID,
      },
      query: new URLSearchParams(),
      resource: "cross-border",
    };
    await expect(
      service.execute(
        base,
        "cross-border.shipment.create",
        authentication(["cross-border.shipment.create"]),
        context,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_INVALID_FIELD" });
    await expect(
      service.execute(
        { ...base, payload: { ...base.payload, transportMethod: "x".repeat(51) } },
        "cross-border.shipment.create",
        authentication(["cross-border.shipment.create"]),
        context,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_INVALID_FIELD" });
    await expect(
      service.execute(
        { ...base, payload: { ...base.payload, transportMethod: "海运专线" } },
        "cross-border.shipment.create",
        authentication(["cross-border.shipment.create"]),
        context,
      ),
    ).resolves.toBeUndefined();
  });

  it("enforces RBAC and records audit for mutations", async () => {
    const repository: InventoryWorkflowRepository = {
      execute: vi.fn().mockResolvedValue({ id: DOCUMENT_ID, status: "dispatched" }),
    };
    const audit = new InMemoryAuditWriter();
    const service = new InventoryWorkflowService(repository, audit);
    const command: InventoryWorkflowCommand = {
      action: "dispatch",
      apiId: "CBR-012",
      entityId: DOCUMENT_ID,
      mutation: true,
      payload: { versionNo: 1 },
      query: new URLSearchParams(),
      resource: "cross-border",
    };
    await expect(
      service.execute(command, "cross-border.shipment.dispatch", authentication([]), context),
    ).rejects.toMatchObject({ code: "PERMISSION_FORBIDDEN" });
    await service.execute(
      command,
      "cross-border.shipment.dispatch",
      authentication(["cross-border.shipment.dispatch"]),
      context,
    );
    expect(audit.events).toHaveLength(1);
    expect(audit.events[0]).toMatchObject({ action: "CBR-012", actorUserId: USER_ID });
  });
});
