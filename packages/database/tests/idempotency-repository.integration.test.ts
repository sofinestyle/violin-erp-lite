import { randomUUID } from "node:crypto";
import {
  CanonicalRequestHasher,
  IdempotencyAdapter,
  IdempotencyKeyHasher,
  IdempotencyReplayError,
  IdempotencyScopeResolver,
  type IdempotencyCommand,
} from "@violin-erp/api";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createPrismaClient } from "../src/client";
import { PrismaIdempotencyRepository } from "../src/idempotency/prisma-idempotency-repository";

const databaseUrl = process.env.IDEMPOTENCY_INTEGRATION_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;
const clients = databaseUrl ? Array.from({ length: 4 }, () => createPrismaClient(databaseUrl)) : [];
const repositories = clients.map((client) => new PrismaIdempotencyRepository(client));
const configuration = {
  hmacSecret: "integration-idempotency-secret-at-least-32-characters",
  leaseMilliseconds: 30_000,
  maxResponseBytes: 65_536,
  retentionMilliseconds: 86_400_000,
};
const userId = "11111111-1111-4111-8111-111111111111";

function input(
  key: string,
  traceId: string,
  operation: IdempotencyCommand["operation"],
): IdempotencyCommand {
  return {
    authorize: vi.fn(),
    operation,
    rawKey: key,
    reconciliation: {
      reconcileExpiredProcessing: vi.fn().mockResolvedValue({ outcome: "unresolved" }),
    },
    request: {
      action: "SEC-023",
      authenticationScope: {
        permissions: ["security.permission.assign", "security.role.assign"],
      },
      body: { reason: "integration", updatedAt: "2026-07-25T00:00:00.000Z" },
      method: "PUT",
      path: { id: "22222222-2222-4222-8222-222222222222" },
      query: {},
    },
    requestTraceId: traceId,
    scope: { apiId: "SEC-023", userId },
  };
}

integration("PostgreSQL persistent idempotency integration", () => {
  beforeEach(async () => {
    await clients[0]!.idempotency_records.deleteMany({
      where: { scope_code: { startsWith: `subject:user:${userId}|` } },
    });
  });

  afterAll(async () => {
    await Promise.all(clients.map((client) => client.$disconnect()));
  });

  it("allows only one of 20 concurrent claims and one business execution", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let executions = 0;
    const traces = Array.from({ length: 20 }, () => randomUUID());
    const attempts = traces.map((traceId, index) => {
      const ownOperation = vi.fn().mockImplementation(async () => {
        executions += 1;
        await gate;
        return {
          outcome: "completed",
          response: { body: { ok: true }, httpStatus: 201, requestTraceId: traceId },
        };
      });
      const execution = new IdempotencyAdapter(
        repositories[index % repositories.length]!,
        configuration,
      ).execute(input("concurrent-key", traceId, ownOperation));
      return {
        ownOperation,
        promise: execution.then(
          (value) => ({ status: "fulfilled" as const, value }),
          (reason: unknown) => ({ reason, status: "rejected" as const }),
        ),
      };
    });
    await new Promise((resolve) => setTimeout(resolve, 200));
    release();
    const results = await Promise.all(attempts.map(({ promise }) => promise));

    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    expect(
      results.filter(
        (result) => result.status === "rejected" && result.reason instanceof IdempotencyReplayError,
      ),
    ).toHaveLength(19);
    expect(executions).toBe(1);
    expect(attempts.reduce((sum, item) => sum + item.ownOperation.mock.calls.length, 0)).toBe(1);
    expect(
      await clients[0]!.idempotency_records.count({
        where: {
          idempotency_key_hash: new IdempotencyKeyHasher(configuration.hmacSecret).hash(
            "concurrent-key",
          ),
        },
      }),
    ).toBe(1);
  });

  it("replays completed and failed results and rejects a changed request", async () => {
    for (const [key, outcome, status] of [
      ["complete-key", "completed", 201],
      ["failed-key", "failed", 422],
    ] as const) {
      const adapter = new IdempotencyAdapter(repositories[0]!, configuration);
      const traceId = randomUUID();
      const operation = vi.fn().mockResolvedValue({
        outcome,
        response: { body: { outcome }, httpStatus: status, requestTraceId: traceId },
      });
      const command = input(key, traceId, operation);
      await expect(adapter.execute(command)).resolves.toMatchObject({ httpStatus: status });
      await expect(adapter.execute(command)).resolves.toMatchObject({ httpStatus: status });
      expect(operation).toHaveBeenCalledOnce();

      const changedBase = input(key, randomUUID(), vi.fn());
      const changed = {
        ...changedBase,
        request: { ...changedBase.request, body: { reason: "changed" } },
      };
      await expect(adapter.execute(changed)).rejects.toBeInstanceOf(IdempotencyReplayError);
      expect(changed.operation).not.toHaveBeenCalled();
    }
  });

  it("requires reconciliation and atomically reclaims only a confirmed side-effect-free request", async () => {
    const now = new Date();
    const key = "expired-key";
    const traceId = randomUUID();
    const request = input(key, traceId, vi.fn()).request;
    const scopeCode = new IdempotencyScopeResolver().resolve({ apiId: "SEC-023", userId });
    const keyHash = new IdempotencyKeyHasher(configuration.hmacSecret).hash(key);
    const requestHash = new CanonicalRequestHasher().hash(request);
    await repositories[0]!.claim({
      expiresAt: new Date(now.getTime() + 60_000),
      idempotencyKeyHash: keyHash,
      lockedUntil: new Date(now.getTime() - 1_000),
      now: new Date(now.getTime() - 31_000),
      requestHash,
      requestTraceId: randomUUID(),
      scopeCode,
    });

    const unresolvedOperation = vi.fn();
    const unresolved = input(key, traceId, unresolvedOperation);
    await expect(
      new IdempotencyAdapter(repositories[1]!, configuration).execute(unresolved),
    ).rejects.toBeInstanceOf(IdempotencyReplayError);
    expect(unresolved.reconciliation.reconcileExpiredProcessing).toHaveBeenCalledOnce();
    expect(unresolvedOperation).not.toHaveBeenCalled();

    const retryTrace = randomUUID();
    const retryOperation = vi.fn().mockResolvedValue({
      outcome: "completed",
      response: { body: { recovered: true }, httpStatus: 201, requestTraceId: retryTrace },
    });
    const retry = {
      ...input(key, retryTrace, retryOperation),
      reconciliation: {
        reconcileExpiredProcessing: vi.fn().mockResolvedValue({ outcome: "retry" as const }),
      },
    };
    await expect(
      new IdempotencyAdapter(repositories[2]!, configuration).execute(retry),
    ).resolves.toMatchObject({ body: { recovered: true } });
    expect(retryOperation).toHaveBeenCalledOnce();
  });
});
