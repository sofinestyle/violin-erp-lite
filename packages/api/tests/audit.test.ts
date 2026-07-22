import { describe, expect, it, vi } from "vitest";
import {
  InMemoryAuditWriter,
  recordAuditEvent,
  sanitizeAuditEvent,
  sanitizeAuditValue,
  type AuditEvent,
} from "../src/index";

const BASE_EVENT: AuditEvent = {
  action: "permission.assign",
  actorUserId: "11111111-1111-4111-8111-111111111111",
  moduleCode: "security",
  requestId: "22222222-2222-4222-8222-222222222222",
  resourceId: "33333333-3333-4333-8333-333333333333",
  resourceType: "role",
  result: "success",
  timestamp: new Date("2026-07-22T12:00:00.000Z"),
};

describe("audit foundation", () => {
  it("deeply filters credentials, personal data, connection strings and binary data", () => {
    expect(
      sanitizeAuditValue({
        authorization: "Bearer secret",
        nested: {
          accessToken: "token-value",
          databaseUrl: "postgresql://user:password@host/db",
          password: "plain-password",
          phone: "13800000000",
          rawBinary: new Uint8Array([1, 2, 3]),
          safe: "visible",
        },
      }),
    ).toEqual({
      authorization: "[REDACTED]",
      nested: {
        accessToken: "[REDACTED]",
        databaseUrl: "[REDACTED]",
        password: "[REDACTED]",
        phone: "[REDACTED]",
        rawBinary: "[REDACTED]",
        safe: "visible",
      },
    });
  });

  it("writes sanitized audit events", async () => {
    const writer = new InMemoryAuditWriter();

    await expect(
      recordAuditEvent(writer, {
        ...BASE_EVENT,
        metadata: { cookie: "session=value", safe: "value" },
      }),
    ).resolves.toBe(true);
    expect(writer.events).toHaveLength(1);
    expect(writer.events[0]?.metadata).toEqual({ cookie: "[REDACTED]", safe: "value" });
  });

  it("replaces sensitive internal failure reasons", () => {
    const event = sanitizeAuditEvent({
      ...BASE_EVENT,
      failureReason: "database password leaked in stack",
      result: "failure",
    });

    expect(event.failureReason).toBe("操作失败");
  });

  it("supports required and best-effort failure handling without exposing internals", async () => {
    const onFailure = vi.fn();
    const writer = new InMemoryAuditWriter(new Error("database password and stack"));

    await expect(recordAuditEvent(writer, BASE_EVENT, { onFailure })).rejects.toMatchObject({
      code: "SYSTEM_AUDIT_UNAVAILABLE",
      message: "审计记录暂时不可用",
    });
    await expect(
      recordAuditEvent(writer, BASE_EVENT, { failureMode: "best-effort" }),
    ).resolves.toBe(false);
    expect(onFailure).toHaveBeenCalledOnce();
  });
});
