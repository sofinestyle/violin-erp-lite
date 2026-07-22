import { describe, expect, it, vi } from "vitest";
import { getPrismaClient, PrismaAuditWriter } from "../src/index";

describe("Prisma Client singleton", () => {
  it("reuses one client instance within the process", () => {
    const databaseUrl = "postgresql://test:test@localhost:5432/test";

    expect(getPrismaClient(databaseUrl)).toBe(getPrismaClient(databaseUrl));
  });
});

describe("Prisma audit adapter", () => {
  it("maps the safe audit event to the Frozen audit_logs fields", async () => {
    const create = vi.fn().mockResolvedValue({ id: "audit-id" });
    const writer = new PrismaAuditWriter({ audit_logs: { create } } as never);

    await writer.write({
      action: "permission.assign",
      actorUserId: "11111111-1111-4111-8111-111111111111",
      metadata: { source: "test" },
      moduleCode: "security",
      requestId: "22222222-2222-4222-8222-222222222222",
      resourceId: "33333333-3333-4333-8333-333333333333",
      resourceType: "role",
      result: "success",
      timestamp: new Date("2026-07-22T12:00:00.000Z"),
      usernameSnapshot: "administrator",
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action_code: "permission.assign",
        after_snapshot: { metadata: { source: "test" } },
        module_code: "security",
        object_id: "33333333-3333-4333-8333-333333333333",
        object_type: "role",
        operation_result: "success",
        request_trace_id: "22222222-2222-4222-8222-222222222222",
        user_id: "11111111-1111-4111-8111-111111111111",
      }),
    });
  });
});
