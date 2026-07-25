import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  createEventJobBridgeHandler,
  EventConsumerRuntime,
  EventDeliveryRuntime,
  EventPublisherRuntime,
  EventRegistry,
  type EventConsumptionRecord,
  type EventDeliveryRecord,
  type EventEnvelope,
  type EventOutboxRecord,
} from "../src";

const NOW = new Date("2026-07-25T12:00:00.000Z");
const LEASE_UNTIL = new Date("2026-07-25T12:01:00.000Z");

function envelope(overrides: Partial<EventEnvelope> = {}): EventEnvelope {
  return {
    actorUserId: null,
    aggregateId: randomUUID(),
    aggregateType: "test_object",
    eventId: randomUUID(),
    eventType: "test.event.created",
    eventVersion: 1,
    metadata: { source: "test" },
    occurredAt: NOW,
    payload: { ok: true },
    producer: "test",
    requestTraceId: randomUUID(),
    ...overrides,
  };
}

function outboxRecord(overrides: Partial<EventOutboxRecord> = {}): EventOutboxRecord {
  const event = envelope(overrides);
  return {
    ...event,
    attemptCount: 1,
    availableAt: NOW,
    createdAt: NOW,
    id: randomUUID(),
    lastErrorCode: null,
    lastErrorMessage: null,
    lockedBy: "publisher-1",
    lockedUntil: LEASE_UNTIL,
    maxAttempts: 3,
    publishedAt: null,
    status: "publishing",
    updatedAt: NOW,
    ...overrides,
  };
}

function consumptionRecord(
  overrides: Partial<EventConsumptionRecord> = {},
): EventConsumptionRecord {
  const event = envelope(overrides.event);
  return {
    attemptCount: 1,
    availableAt: NOW,
    completedAt: null,
    consumerName: "consumer-a",
    createdAt: NOW,
    event,
    eventId: event.eventId,
    handlerName: "consumer-a",
    id: randomUUID(),
    lastErrorCode: null,
    lastErrorDetail: null,
    lastErrorMessage: null,
    lockedBy: "worker-1",
    lockedUntil: LEASE_UNTIL,
    maxAttempts: 3,
    requestTraceId: event.requestTraceId,
    startedAt: NOW,
    status: "running",
    updatedAt: NOW,
    ...overrides,
  };
}

function deliveryRecord(overrides: Partial<EventDeliveryRecord> = {}): EventDeliveryRecord {
  const event = envelope(overrides.event);
  return {
    attemptCount: 1,
    availableAt: NOW,
    createdAt: NOW,
    deliveredAt: null,
    deliveryTarget: "target-a",
    deliveryTargetType: "internal",
    event,
    eventId: event.eventId,
    id: randomUUID(),
    lastErrorCode: null,
    lastErrorMessage: null,
    lockedBy: "delivery-worker-1",
    lockedUntil: LEASE_UNTIL,
    maxAttempts: 3,
    requestTraceId: event.requestTraceId,
    responseSummary: null,
    status: "delivering",
    updatedAt: NOW,
    ...overrides,
  };
}

describe("Event Infrastructure runtime", () => {
  it("publishes an Outbox event into consumer inboxes and delivery tracking", async () => {
    const registry = new EventRegistry();
    registry.registerConsumer({
      consumerName: "consumer-a",
      eventType: "test.event.created",
      handler: vi.fn(),
    });
    registry.registerDeliveryTarget({
      deliver: vi.fn(),
      eventType: "test.event.created",
      target: "target-a",
      targetType: "internal",
    });
    const event = outboxRecord();
    const repository = {
      claimOutbox: vi.fn().mockResolvedValue([event]),
      createConsumerInboxes: vi.fn().mockResolvedValue(1),
      createDeliveries: vi.fn().mockResolvedValue(1),
      markOutboxPublished: vi.fn().mockResolvedValue({ ...event, status: "published" }),
      recoverExpiredLeases: vi.fn().mockResolvedValue(0),
      settleOutboxFailure: vi.fn().mockResolvedValue(null),
    };
    const publisher = new EventPublisherRuntime({
      clock: () => NOW,
      publisherId: "publisher-1",
      registry,
      repository,
    });

    await expect(publisher.runOnce()).resolves.toBe(1);

    expect(repository.recoverExpiredLeases).toHaveBeenCalledWith({ limit: 1, now: NOW });
    expect(repository.claimOutbox).toHaveBeenCalledWith({
      limit: 1,
      lockedUntil: LEASE_UNTIL,
      now: NOW,
      publisherId: "publisher-1",
    });
    expect(repository.createConsumerInboxes).toHaveBeenCalledWith([
      expect.objectContaining({
        consumerName: "consumer-a",
        eventId: event.eventId,
        requestTraceId: event.requestTraceId,
      }),
    ]);
    expect(repository.createDeliveries).toHaveBeenCalledWith([
      expect.objectContaining({
        deliveryTarget: "target-a",
        deliveryTargetType: "internal",
        eventId: event.eventId,
      }),
    ]);
    expect(repository.markOutboxPublished).toHaveBeenCalledWith({
      id: event.id,
      now: NOW,
      publisherId: "publisher-1",
    });
  });

  it("schedules publish retry when Event Publisher fails before attempts are exhausted", async () => {
    const registry = new EventRegistry();
    const event = outboxRecord({ attemptCount: 1, maxAttempts: 3 });
    const repository = {
      claimOutbox: vi.fn().mockResolvedValue([event]),
      createConsumerInboxes: vi.fn().mockRejectedValue(new Error("inbox unavailable")),
      createDeliveries: vi.fn(),
      markOutboxPublished: vi.fn(),
      recoverExpiredLeases: vi.fn().mockResolvedValue(0),
      settleOutboxFailure: vi.fn().mockResolvedValue(null),
    };
    const publisher = new EventPublisherRuntime({
      clock: () => NOW,
      publisherId: "publisher-1",
      registry,
      repository,
      retryPolicy: { baseDelayMilliseconds: 1000, maxDelayMilliseconds: 1000 },
    });

    await publisher.runOnce();

    expect(repository.settleOutboxFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: "EVENT_PUBLISHER_FAILED",
        id: event.id,
        nextRetryAt: new Date(NOW.getTime() + 1000),
        retryOutcome: "retry",
      }),
    );
  });

  it("consumes events independently per consumer and keeps trace ID in context", async () => {
    const event = envelope({ requestTraceId: randomUUID() });
    const consumption = consumptionRecord({ event });
    const handler = vi.fn().mockResolvedValue(undefined);
    const registry = new EventRegistry();
    registry.registerConsumer({
      consumerName: "consumer-a",
      eventType: event.eventType,
      handler,
    });
    const repository = {
      claimConsumptions: vi.fn().mockResolvedValue([consumption]),
      markConsumptionSucceeded: vi.fn().mockResolvedValue({
        ...consumption,
        status: "succeeded",
      }),
      recoverExpiredLeases: vi.fn().mockResolvedValue(0),
      settleConsumptionFailure: vi.fn(),
    };
    const consumer = new EventConsumerRuntime({
      clock: () => NOW,
      consumerName: "consumer-a",
      registry,
      repository,
      workerId: "worker-1",
    });

    await expect(consumer.runOnce()).resolves.toBe(1);

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        consumerName: "consumer-a",
        event,
        requestTraceId: event.requestTraceId,
      }),
    );
    expect(repository.markConsumptionSucceeded).toHaveBeenCalledWith({
      id: consumption.id,
      now: NOW,
      workerId: "worker-1",
    });
  });

  it("moves consumption to Dead Letter when retry attempts are exhausted", async () => {
    const consumption = consumptionRecord({ attemptCount: 3, maxAttempts: 3 });
    const registry = new EventRegistry();
    registry.registerConsumer({
      consumerName: "consumer-a",
      eventType: consumption.event.eventType,
      handler: vi.fn().mockRejectedValue(new Error("boom")),
    });
    const repository = {
      claimConsumptions: vi.fn().mockResolvedValue([consumption]),
      markConsumptionSucceeded: vi.fn(),
      recoverExpiredLeases: vi.fn().mockResolvedValue(0),
      settleConsumptionFailure: vi.fn().mockResolvedValue(null),
    };
    const consumer = new EventConsumerRuntime({
      clock: () => NOW,
      consumerName: "consumer-a",
      registry,
      repository,
      workerId: "worker-1",
    });

    await consumer.runOnce();

    expect(repository.settleConsumptionFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: "EVENT_CONSUMER_FAILED",
        id: consumption.id,
        retryOutcome: "dead_letter",
      }),
    );
  });

  it("tracks delivery success and records response summary", async () => {
    const delivery = deliveryRecord();
    const registry = new EventRegistry();
    registry.registerDeliveryTarget({
      deliver: vi.fn().mockResolvedValue({ delivered: true }),
      eventType: delivery.event.eventType,
      target: delivery.deliveryTarget,
      targetType: delivery.deliveryTargetType,
    });
    const repository = {
      claimDeliveries: vi.fn().mockResolvedValue([delivery]),
      markDeliverySucceeded: vi.fn().mockResolvedValue({ ...delivery, status: "succeeded" }),
      recoverExpiredLeases: vi.fn().mockResolvedValue(0),
      settleDeliveryFailure: vi.fn(),
    };
    const runtime = new EventDeliveryRuntime({
      clock: () => NOW,
      registry,
      repository,
      workerId: "delivery-worker-1",
    });

    await runtime.runOnce();

    expect(repository.markDeliverySucceeded).toHaveBeenCalledWith({
      id: delivery.id,
      now: NOW,
      responseSummary: { delivered: true },
      workerId: "delivery-worker-1",
    });
  });

  it("creates Jobs from Event handlers through the Event to Job bridge", async () => {
    const event = envelope();
    const createJob = vi.fn().mockResolvedValue({ id: randomUUID() });
    const handler = createEventJobBridgeHandler({ createJob }, (input) => ({
      availableAt: NOW,
      jobKey: `event:${input.eventId}`,
      jobType: "event.test.job",
      maxAttempts: 1,
      now: NOW,
      payload: { eventId: input.eventId },
      requestTraceId: input.requestTraceId,
      scheduledAt: NOW,
      targetObjectId: input.aggregateId,
      targetObjectType: input.aggregateType,
    }));

    await handler({ event });

    expect(createJob).toHaveBeenCalledWith(
      expect.objectContaining({
        jobKey: `event:${event.eventId}`,
        requestTraceId: event.requestTraceId,
      }),
    );
  });
});
