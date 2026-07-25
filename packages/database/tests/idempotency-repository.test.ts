import { randomUUID } from "node:crypto";
import { PrismaIdempotencyRepository } from "../src/idempotency/prisma-idempotency-repository";
import { Prisma, type PrismaClient } from "../src/generated/prisma/client";
import { describe, expect, it, vi } from "vitest";

const NOW = new Date("2026-07-25T00:00:00.000Z");

function row(overrides: Record<string, unknown> = {}) {
  return {
    completed_at: null,
    created_at: NOW,
    expires_at: new Date(NOW.getTime() + 86_400_000),
    id: randomUUID(),
    idempotency_key_hash: "a".repeat(64),
    locked_until: new Date(NOW.getTime() + 30_000),
    request_hash: "b".repeat(64),
    request_trace_id: randomUUID(),
    resource_id: null,
    resource_type: null,
    response_body: null,
    response_http_status: null,
    scope_code: "subject:user:user-id|action:SEC-023",
    status: "processing",
    updated_at: NOW,
    ...overrides,
  };
}

function claimInput() {
  return {
    expiresAt: new Date(NOW.getTime() + 86_400_000),
    idempotencyKeyHash: "a".repeat(64),
    lockedUntil: new Date(NOW.getTime() + 30_000),
    now: NOW,
    requestHash: "b".repeat(64),
    requestTraceId: randomUUID(),
    scopeCode: "subject:user:user-id|action:SEC-023",
  };
}

describe("Prisma idempotency repository", () => {
  it("claims by a direct atomic insert", async () => {
    const created = row();
    const create = vi.fn().mockResolvedValue(created);
    const repository = new PrismaIdempotencyRepository({
      idempotency_records: { create },
    } as unknown as PrismaClient);
    await expect(repository.claim(claimInput())).resolves.toMatchObject({ kind: "claimed" });
    expect(create).toHaveBeenCalledOnce();
  });

  it("re-reads the formal record after a unique conflict", async () => {
    const existing = row();
    const create = vi.fn().mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("unique", {
        clientVersion: "7.9.0",
        code: "P2002",
      }),
    );
    const findUnique = vi.fn().mockResolvedValue(existing);
    const repository = new PrismaIdempotencyRepository({
      idempotency_records: { create, findUnique },
    } as unknown as PrismaClient);
    await expect(repository.claim(claimInput())).resolves.toMatchObject({
      kind: "existing",
      record: { id: existing.id },
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: {
        scope_code_idempotency_key_hash: {
          idempotency_key_hash: "a".repeat(64),
          scope_code: "subject:user:user-id|action:SEC-023",
        },
      },
    });
  });

  it("finalizes only the processing row owned by the current claim", async () => {
    const terminal = row({
      completed_at: NOW,
      locked_until: null,
      response_body: { ok: true },
      response_http_status: 201,
      status: "completed",
    });
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const findUnique = vi.fn().mockResolvedValue(terminal);
    const repository = new PrismaIdempotencyRepository({
      idempotency_records: { findUnique, updateMany },
    } as unknown as PrismaClient);
    await expect(
      repository.complete({
        id: terminal.id,
        now: NOW,
        ownerTraceId: terminal.request_trace_id,
        requestHash: terminal.request_hash,
        response: {
          body: { ok: true },
          httpStatus: 201,
          requestTraceId: terminal.request_trace_id,
        },
      }),
    ).resolves.toMatchObject({ status: "completed" });
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          request_trace_id: terminal.request_trace_id,
          status: "processing",
        }),
      }),
    );
  });
});
