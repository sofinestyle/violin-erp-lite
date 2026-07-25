import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  CanonicalRequestHasher,
  canonicalizeRequest,
  IdempotencyAdapter,
  IdempotencyKeyHasher,
  IdempotencyMiddleware,
  IdempotencyReplayError,
  IdempotencyResponseSanitizer,
  IdempotencyScopeResolver,
  loadIdempotencyConfiguration,
  requireIdempotencyKey,
  type IdempotencyClaimInput,
  type IdempotencyClaimResult,
  type IdempotencyExpiredTerminalInput,
  type IdempotencyReclaimInput,
  type IdempotencyRecord,
  type IdempotencyRepository,
  type IdempotencyStatus,
  type IdempotencyTerminalInput,
} from "../src/index";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const HMAC_SECRET = "idempotency-test-secret-with-at-least-32-characters";

class MemoryRepository implements IdempotencyRepository {
  record: IdempotencyRecord | null = null;

  async claim(input: IdempotencyClaimInput): Promise<IdempotencyClaimResult> {
    if (this.record) return { kind: "existing", record: this.record };
    this.record = {
      completedAt: null,
      createdAt: input.now,
      expiresAt: input.expiresAt,
      id: randomUUID(),
      idempotencyKeyHash: input.idempotencyKeyHash,
      lockedUntil: input.lockedUntil,
      requestHash: input.requestHash,
      requestTraceId: input.requestTraceId,
      response: null,
      scopeCode: input.scopeCode,
      status: "processing",
      updatedAt: input.now,
    };
    return { kind: "claimed", record: this.record };
  }

  complete(input: IdempotencyTerminalInput): Promise<IdempotencyRecord | null> {
    return this.terminal("completed", input);
  }

  fail(input: IdempotencyTerminalInput): Promise<IdempotencyRecord | null> {
    return this.terminal("failed", input);
  }

  async terminal(
    status: Exclude<IdempotencyStatus, "processing">,
    input: IdempotencyTerminalInput,
  ): Promise<IdempotencyRecord | null> {
    if (
      !this.record ||
      this.record.id !== input.id ||
      this.record.requestTraceId !== input.ownerTraceId
    ) {
      return null;
    }
    this.record = {
      ...this.record,
      completedAt: input.now,
      lockedUntil: null,
      response: input.response,
      status,
      updatedAt: input.now,
    };
    return this.record;
  }

  async find(): Promise<IdempotencyRecord | null> {
    return this.record;
  }

  async finalizeExpired(
    status: Exclude<IdempotencyStatus, "processing">,
    input: IdempotencyExpiredTerminalInput,
  ): Promise<IdempotencyRecord | null> {
    if (!this.record || this.record.id !== input.id) return null;
    this.record = {
      ...this.record,
      completedAt: input.now,
      lockedUntil: null,
      response: input.response,
      status,
      updatedAt: input.now,
    };
    return this.record;
  }

  async reclaimExpired(input: IdempotencyReclaimInput): Promise<IdempotencyRecord | null> {
    if (!this.record || this.record.id !== input.id) return null;
    this.record = {
      ...this.record,
      lockedUntil: input.lockedUntil,
      requestTraceId: input.requestTraceId,
      updatedAt: input.now,
    };
    return this.record;
  }

  async removeExpiredTerminalRecords(): Promise<number> {
    return 0;
  }
}

function configuration() {
  return {
    hmacSecret: HMAC_SECRET,
    leaseMilliseconds: 30_000,
    maxResponseBytes: 4_096,
    retentionMilliseconds: 86_400_000,
  };
}

function command(
  requestTraceId: string,
  operation: () => Promise<{
    outcome: "completed" | "failed";
    response: {
      body: { ok: boolean; password?: string };
      httpStatus: number;
      requestTraceId: string;
    };
  }>,
) {
  return {
    authorize: vi.fn(),
    operation,
    rawKey: "client-key",
    reconciliation: {
      reconcileExpiredProcessing: vi.fn().mockResolvedValue({ outcome: "unresolved" }),
    },
    request: {
      action: "SEC-023",
      authenticationScope: { permissions: ["security.role.assign"] },
      body: { reason: "test", updatedAt: "2026-07-25T00:00:00.000Z" },
      method: "PUT",
      path: { id: "role-id" },
      query: {},
    },
    requestTraceId,
    scope: { apiId: "SEC-023", userId: USER_ID },
  } as const;
}

describe("idempotency configuration and hashes", () => {
  it("fails closed when the HMAC secret is missing or invalid", () => {
    expect(() => loadIdempotencyConfiguration({})).toThrow("IDEMPOTENCY_HMAC_SECRET");
    expect(() =>
      loadIdempotencyConfiguration({
        IDEMPOTENCY_HMAC_SECRET: HMAC_SECRET,
        IDEMPOTENCY_LEASE_SECONDS: "60",
        IDEMPOTENCY_RETENTION_SECONDS: "30",
      }),
    ).toThrow("must exceed");
  });

  it("uses a server-keyed HMAC without retaining the raw key", () => {
    const hasher = new IdempotencyKeyHasher(HMAC_SECRET);
    expect(hasher.hash("same")).toBe(hasher.hash("same"));
    expect(hasher.hash("same")).not.toBe(
      new IdempotencyKeyHasher(`${HMAC_SECRET}-other`).hash("same"),
    );
    expect(hasher.hash("same")).toMatch(/^[0-9a-f]{64}$/);
    expect(hasher.hash("same")).not.toContain("same");
  });

  it("canonicalizes keys stably, preserves arrays and distinguishes null from undefined", () => {
    const common = {
      action: "API-001",
      authenticationScope: { user: USER_ID },
      method: "post",
      path: { id: "1" },
      query: {},
    };
    const first = canonicalizeRequest({
      ...common,
      body: { alpha: undefined, items: [2, 1], nested: { b: true, a: null } },
    });
    const second = canonicalizeRequest({
      ...common,
      body: { nested: { a: null, b: true }, items: [2, 1], alpha: undefined },
    });
    expect(first).toBe(second);
    expect(first).not.toBe(canonicalizeRequest({ ...common, body: { alpha: null } }));
    expect(first).not.toBe(canonicalizeRequest({ ...common, body: { items: [1, 2] } }));
    expect(new CanonicalRequestHasher().hash({ ...common, body: { password: "secret" } })).toBe(
      new CanonicalRequestHasher().hash({ ...common, body: { password: "different" } }),
    );
  });

  it("isolates users and API actions in the formal scope", () => {
    const resolver = new IdempotencyScopeResolver();
    expect(resolver.resolve({ apiId: "SEC-023", userId: USER_ID })).toBe(
      `subject:user:${USER_ID}|action:SEC-023`,
    );
    expect(resolver.resolve({ apiId: "SEC-023", userId: USER_ID })).not.toBe(
      resolver.resolve({ apiId: "SEC-025", userId: USER_ID }),
    );
  });

  it("accepts the key only from the existing header at the middleware boundary", async () => {
    expect(() => requireIdempotencyKey(new Request("http://localhost"))).toThrow("Idempotency-Key");
    const repository = new MemoryRepository();
    const adapter = new IdempotencyAdapter(repository, configuration());
    const middleware = new IdempotencyMiddleware(adapter);
    const traceId = randomUUID();
    const base = command(
      traceId,
      vi.fn().mockResolvedValue({
        outcome: "completed",
        response: { body: { ok: true }, httpStatus: 201, requestTraceId: traceId },
      }),
    );
    const withoutKey = {
      authorize: base.authorize,
      operation: base.operation,
      reconciliation: base.reconciliation,
      request: base.request,
      requestTraceId: base.requestTraceId,
      scope: base.scope,
    };
    await expect(
      middleware.execute(
        new Request("http://localhost", { headers: { "Idempotency-Key": "header-key" } }),
        withoutKey,
      ),
    ).resolves.toMatchObject({ httpStatus: 201 });
  });
});

describe("idempotency response safety and replay", () => {
  it("removes credentials and internal details before persistence", () => {
    const sanitized = new IdempotencyResponseSanitizer(4_096).sanitize({
      body: {
        accessToken: "token",
        data: { ok: true },
        password_hash: "hash",
        stack: "internal",
      },
      httpStatus: 200,
      requestTraceId: randomUUID(),
    });
    expect(sanitized.body).toEqual({ data: { ok: true } });
  });

  it("replays completed and failed results without a second execution", async () => {
    for (const [outcome, httpStatus] of [
      ["completed", 201],
      ["failed", 422],
    ] as const) {
      const repository = new MemoryRepository();
      const adapter = new IdempotencyAdapter(repository, configuration());
      const requestTraceId = randomUUID();
      const operation = vi.fn().mockResolvedValue({
        outcome,
        response: { body: { ok: outcome === "completed" }, httpStatus, requestTraceId },
      });
      const input = command(requestTraceId, operation);
      expect(await adapter.execute(input)).toMatchObject({ httpStatus });
      expect(await adapter.execute(input)).toMatchObject({ httpStatus });
      expect(operation).toHaveBeenCalledOnce();
      expect(input.authorize).toHaveBeenCalledTimes(3);
    }
  });

  it("rejects the same key with a different request hash without execution", async () => {
    const repository = new MemoryRepository();
    const adapter = new IdempotencyAdapter(repository, configuration());
    const requestTraceId = randomUUID();
    await adapter.execute(
      command(
        requestTraceId,
        vi.fn().mockResolvedValue({
          outcome: "completed",
          response: { body: { ok: true }, httpStatus: 200, requestTraceId },
        }),
      ),
    );
    const changedBase = command(
      randomUUID(),
      vi.fn().mockResolvedValue({
        outcome: "completed",
        response: { body: { ok: true }, httpStatus: 200, requestTraceId: randomUUID() },
      }),
    );
    const changed = {
      ...changedBase,
      request: { ...changedBase.request, body: { ...changedBase.request.body, reason: "changed" } },
    };
    await expect(adapter.execute(changed)).rejects.toBeInstanceOf(IdempotencyReplayError);
    expect(changed.operation).not.toHaveBeenCalled();
  });

  it("requires reconciliation before reclaiming an expired processing record", async () => {
    let now = new Date("2026-07-25T00:00:00.000Z");
    const repository = new MemoryRepository();
    const adapter = new IdempotencyAdapter(repository, configuration(), { clock: () => now });
    const first = command(
      randomUUID(),
      vi.fn().mockImplementation(() => new Promise(() => {})),
    );
    void adapter.execute(first);
    await vi.waitFor(() => expect(repository.record).not.toBeNull());
    now = new Date("2026-07-25T00:01:00.000Z");

    const operation = vi.fn().mockResolvedValue({
      outcome: "completed",
      response: { body: { ok: true }, httpStatus: 200, requestTraceId: randomUUID() },
    });
    const unresolved = command(randomUUID(), operation);
    await expect(adapter.execute(unresolved)).rejects.toBeInstanceOf(IdempotencyReplayError);
    expect(unresolved.reconciliation.reconcileExpiredProcessing).toHaveBeenCalledOnce();
    expect(operation).not.toHaveBeenCalled();
  });
});
