import { describe, expect, it, vi } from "vitest";
import {
  InMemoryAuditWriter,
  matchWorkflowEndpoint,
  WorkflowService,
  WORKFLOW_API_IDS,
  WORKFLOW_IMPLEMENTED_API_IDS,
  type AuthenticationContext,
  type WorkflowCommand,
  type WorkflowRepository,
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

function command(payload: Record<string, unknown>): WorkflowCommand {
  return {
    action: "create",
    apiId: "PRO-003",
    mutation: true,
    payload,
    query: new URLSearchParams(),
    resource: "production",
  };
}

describe("Frozen workflow API contracts", () => {
  it("registers all in-scope APIs and excludes only INB-005 other inbound", () => {
    expect(WORKFLOW_API_IDS).toHaveLength(75);
    expect(new Set(WORKFLOW_API_IDS).size).toBe(75);
    expect([...WORKFLOW_IMPLEMENTED_API_IDS].sort()).toEqual([...WORKFLOW_API_IDS].sort());
    expect(WORKFLOW_API_IDS).toContain("PUR-019");
    expect(WORKFLOW_API_IDS).toContain("PRO-029");
    expect(WORKFLOW_API_IDS).toContain("INS-010");
    expect(WORKFLOW_API_IDS).toContain("INB-018");
    expect(WORKFLOW_API_IDS).not.toContain("INB-005");
  });

  it("matches formal routes and permissions", () => {
    expect(
      matchWorkflowEndpoint(
        "POST",
        ["purchase-orders", DOCUMENT_ID, "payments"],
        new URLSearchParams(),
        {},
      ),
    ).toMatchObject({
      command: { apiId: "PUR-019", parentId: DOCUMENT_ID },
      permission: "purchase.payment.create",
    });
    expect(
      matchWorkflowEndpoint("POST", ["inbound-orders", "production"], new URLSearchParams(), {}),
    ).toMatchObject({
      command: { apiId: "INB-004", action: "create-production" },
      permission: "inbound.order.create-production",
    });
  });

  it("rejects every purchase reference from production creation", async () => {
    const repository: WorkflowRepository = { execute: vi.fn() };
    const service = new WorkflowService(repository, new InMemoryAuditWriter());
    await expect(
      service.execute(
        command({
          documentDate: "2026-07-23",
          expectedCompletionDate: "2026-08-23",
          items: [{ skuId: DOCUMENT_ID }],
          manufacturerId: DOCUMENT_ID,
          plannedStartDate: "2026-07-24",
          purchaseOrderId: DOCUMENT_ID,
        }),
        "production.order.create",
        authentication(["production.order.create"]),
        context,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_INVALID_FIELD" });
    expect(repository.execute).not.toHaveBeenCalled();
  });

  it("enforces permission and writes required audit for mutations", async () => {
    const repository: WorkflowRepository = {
      execute: vi.fn().mockResolvedValue({ id: DOCUMENT_ID, status: "draft" }),
    };
    const audit = new InMemoryAuditWriter();
    const service = new WorkflowService(repository, audit);
    await expect(
      service.execute(
        command({
          documentDate: "2026-07-23",
          expectedCompletionDate: "2026-08-23",
          items: [{ skuId: DOCUMENT_ID }],
          manufacturerId: DOCUMENT_ID,
          plannedStartDate: "2026-07-24",
        }),
        "production.order.create",
        authentication([]),
        context,
      ),
    ).rejects.toMatchObject({ code: "PERMISSION_FORBIDDEN" });
    await service.execute(
      command({
        documentDate: "2026-07-23",
        expectedCompletionDate: "2026-08-23",
        items: [{ skuId: DOCUMENT_ID }],
        manufacturerId: DOCUMENT_ID,
        plannedStartDate: "2026-07-24",
      }),
      "production.order.create",
      authentication(["production.order.create"]),
      context,
    );
    expect(audit.events).toHaveLength(1);
    expect(audit.events[0]).toMatchObject({ action: "PRO-003", actorUserId: USER_ID });
  });
});
