import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { PrismaEventRepository } from "../src";

const NOW = new Date("2026-07-25T12:00:00.000Z");
const LEASE_UNTIL = new Date("2026-07-25T12:01:00.000Z");

function eventHistoryRow(overrides: Record<string, unknown> = {}) {
  const eventId = randomUUID();
  return {
    actor_user_id: null,
    aggregate_id: randomUUID(),
    aggregate_type: "test_object",
    created_at: NOW,
    event_id: eventId,
    event_type: "test.event.created",
    event_version: 1,
    id: randomUUID(),
    metadata: { source: "test" },
    occurred_at: NOW,
    payload: { ok: true },
    producer: "test",
    request_trace_id: randomUUID(),
    ...overrides,
  };
}

function eventOutboxRow(overrides: Record<string, unknown> = {}) {
  const history = eventHistoryRow(overrides);
  return {
    ...history,
    attempt_count: 0,
    available_at: NOW,
    last_error_code: null,
    last_error_message: null,
    locked_by: null,
    locked_until: null,
    max_attempts: 3,
    published_at: null,
    status: "pending",
    updated_at: NOW,
    ...overrides,
  };
}

describe("Prisma Event repository", () => {
  it("writes Event History and Outbox atomically in one transaction", async () => {
    const outbox = eventOutboxRow();
    const transaction = {
      audit_logs: { create: vi.fn().mockResolvedValue({ id: randomUUID() }) },
      event_history: { create: vi.fn().mockResolvedValue(eventHistoryRow(outbox)) },
      event_outbox: { create: vi.fn().mockResolvedValue(outbox) },
    };
    const repository = new PrismaEventRepository({
      $transaction: (callback: (client: typeof transaction) => unknown) => callback(transaction),
    } as never);

    await expect(
      repository.registerEvent({
        aggregateId: outbox.aggregate_id,
        aggregateType: "test_object",
        eventId: outbox.event_id,
        eventType: "test.event.created",
        eventVersion: 1,
        now: NOW,
        occurredAt: NOW,
        payload: { ok: true },
        producer: "test",
        requestTraceId: outbox.request_trace_id,
      }),
    ).resolves.toMatchObject({
      eventId: outbox.event_id,
      status: "pending",
    });
    expect(transaction.event_history.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        event_id: outbox.event_id,
        event_type: "test.event.created",
      }),
    });
    expect(transaction.event_outbox.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        event_id: outbox.event_id,
        status: "pending",
      }),
    });
  });

  it("claims Outbox rows using FOR UPDATE SKIP LOCKED and lease fields", async () => {
    const outbox = eventOutboxRow({
      attempt_count: 1,
      locked_by: "publisher-1",
      locked_until: LEASE_UNTIL,
      status: "publishing",
    });
    const transaction = {
      $queryRaw: vi.fn().mockResolvedValue([{ attempt_count: 0, id: outbox.id }]),
      event_outbox: { update: vi.fn().mockResolvedValue(outbox) },
    };
    const repository = new PrismaEventRepository({
      $transaction: (callback: (client: typeof transaction) => unknown) => callback(transaction),
    } as never);

    await expect(
      repository.claimOutbox({
        limit: 1,
        lockedUntil: LEASE_UNTIL,
        now: NOW,
        publisherId: "publisher-1",
      }),
    ).resolves.toMatchObject([{ eventId: outbox.event_id, status: "publishing" }]);
    expect(transaction.$queryRaw).toHaveBeenCalledOnce();
    expect(transaction.event_outbox.update).toHaveBeenCalledWith({
      data: expect.objectContaining({
        attempt_count: 1,
        locked_by: "publisher-1",
        locked_until: LEASE_UNTIL,
        status: "publishing",
      }),
      where: { id: outbox.id },
    });
  });

  it("creates Consumer Inbox records with skipDuplicates for consumption idempotency", async () => {
    const createMany = vi.fn().mockResolvedValue({ count: 1 });
    const repository = new PrismaEventRepository({
      event_consumptions: { createMany },
    } as never);
    const eventId = randomUUID();
    const requestTraceId = randomUUID();

    await expect(
      repository.createConsumerInboxes([
        {
          consumerName: "consumer-a",
          eventId,
          handlerName: "handler-a",
          maxAttempts: 3,
          now: NOW,
          requestTraceId,
        },
      ]),
    ).resolves.toBe(1);

    expect(createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          consumer_name: "consumer-a",
          event_id: eventId,
          request_trace_id: requestTraceId,
          status: "pending",
        }),
      ],
      skipDuplicates: true,
    });
  });

  it("recovers expired consumption leases into retrying or dead letter states", async () => {
    const live = {
      attempt_count: 1,
      consumer_name: "consumer-a",
      event_id: randomUUID(),
      id: randomUUID(),
      max_attempts: 3,
    };
    const exhausted = {
      attempt_count: 3,
      consumer_name: "consumer-b",
      event_id: randomUUID(),
      id: randomUUID(),
      max_attempts: 3,
    };
    const repository = new PrismaEventRepository({
      event_consumptions: {
        findMany: vi.fn().mockResolvedValue([live, exhausted]),
        update: vi.fn().mockResolvedValue({}),
      },
      event_dead_letters: { create: vi.fn().mockResolvedValue({}) },
      event_deliveries: { findMany: vi.fn().mockResolvedValue([]) },
      event_outbox: { findMany: vi.fn().mockResolvedValue([]) },
    } as never);

    await expect(repository.recoverExpiredLeases({ limit: 10, now: NOW })).resolves.toBe(2);
  });
});
