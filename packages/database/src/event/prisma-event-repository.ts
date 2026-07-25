import { randomUUID } from "node:crypto";
import { recordAuditEvent } from "@violin-erp/api";
import { PrismaAuditWriter } from "../audit/prisma-audit-writer.js";
import { getPrismaClient } from "../client.js";
import {
  Prisma,
  type PrismaClient,
  type event_consumptions,
  type event_dead_letters,
  type event_deliveries,
  type event_history,
  type event_outbox,
} from "../generated/prisma/client.js";

export type EventOutboxStatus =
  "pending" | "publishing" | "published" | "failed" | "dead_letter" | "cancelled";
export type EventConsumptionStatus =
  "pending" | "running" | "succeeded" | "retrying" | "failed" | "dead_letter" | "ignored";
export type EventDeliveryStatus =
  "pending" | "delivering" | "succeeded" | "retrying" | "failed" | "dead_letter" | "cancelled";
export type EventDeadLetterStatus = "open" | "in_review" | "replayed" | "resolved" | "ignored";
export type EventFailureStage = "publish" | "consume" | "deliver";
export type EventJson = Prisma.JsonValue;

export type EventEnvelope = Readonly<{
  actorUserId: string | null;
  aggregateId: string | null;
  aggregateType: string | null;
  eventId: string;
  eventType: string;
  eventVersion: number;
  metadata: EventJson | null;
  occurredAt: Date;
  payload: EventJson | null;
  producer: string;
  requestTraceId: string;
}>;

export type EventOutboxRecord = EventEnvelope &
  Readonly<{
    attemptCount: number;
    availableAt: Date;
    createdAt: Date;
    id: string;
    lastErrorCode: string | null;
    lastErrorMessage: string | null;
    lockedBy: string | null;
    lockedUntil: Date | null;
    maxAttempts: number;
    publishedAt: Date | null;
    status: EventOutboxStatus;
    updatedAt: Date;
  }>;

export type EventHistoryRecord = EventEnvelope &
  Readonly<{
    createdAt: Date;
    id: string;
  }>;

export type EventConsumptionRecord = Readonly<{
  attemptCount: number;
  availableAt: Date;
  completedAt: Date | null;
  consumerName: string;
  createdAt: Date;
  event: EventEnvelope;
  eventId: string;
  handlerName: string;
  id: string;
  lastErrorCode: string | null;
  lastErrorDetail: EventJson | null;
  lastErrorMessage: string | null;
  lockedBy: string | null;
  lockedUntil: Date | null;
  maxAttempts: number;
  requestTraceId: string;
  startedAt: Date | null;
  status: EventConsumptionStatus;
  updatedAt: Date;
}>;

export type EventDeliveryRecord = Readonly<{
  attemptCount: number;
  availableAt: Date;
  createdAt: Date;
  deliveredAt: Date | null;
  deliveryTarget: string;
  deliveryTargetType: string;
  event: EventEnvelope;
  eventId: string;
  id: string;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  lockedBy: string | null;
  lockedUntil: Date | null;
  maxAttempts: number;
  requestTraceId: string;
  responseSummary: EventJson | null;
  status: EventDeliveryStatus;
  updatedAt: Date;
}>;

export type EventDeadLetterRecord = Readonly<{
  consumerName: string | null;
  context: EventJson | null;
  createdAt: Date;
  deliveryTarget: string | null;
  eventId: string;
  failureStage: EventFailureStage;
  handledAt: Date | null;
  handledBy: string | null;
  handlingNote: string | null;
  id: string;
  reasonCode: string;
  reasonMessage: string;
  replayedEventId: string | null;
  status: EventDeadLetterStatus;
  updatedAt: Date;
}>;

export type RegisterEventInput = Readonly<{
  actorUserId?: string | null;
  aggregateId?: string | null;
  aggregateType?: string | null;
  availableAt?: Date;
  eventId?: string;
  eventType: string;
  eventVersion: number;
  maxAttempts?: number;
  metadata?: EventJson | null;
  now?: Date;
  occurredAt: Date;
  payload?: EventJson | null;
  producer: string;
  requestTraceId: string;
}>;

export type ClaimOutboxInput = Readonly<{
  limit: number;
  lockedUntil: Date;
  now: Date;
  publisherId: string;
}>;

export type CreateConsumerInboxInput = Readonly<{
  consumerName: string;
  eventId: string;
  handlerName: string;
  maxAttempts: number;
  now: Date;
  requestTraceId: string;
}>;

export type ClaimConsumptionsInput = Readonly<{
  consumerName: string;
  limit: number;
  lockedUntil: Date;
  now: Date;
  workerId: string;
}>;

export type CreateDeliveryInput = Readonly<{
  deliveryTarget: string;
  deliveryTargetType: string;
  eventId: string;
  maxAttempts: number;
  now: Date;
  requestTraceId: string;
}>;

export type ClaimDeliveriesInput = Readonly<{
  limit: number;
  lockedUntil: Date;
  now: Date;
  target?: string;
  targetType?: string;
  workerId: string;
}>;

export type RecoverEventLeasesInput = Readonly<{
  limit: number;
  now: Date;
}>;

type TransactionClient = Prisma.TransactionClient;
type EventClient = PrismaClient | TransactionClient;

type OutboxClaimCandidate = Readonly<{ attempt_count: number; id: string }>;
type ConsumptionClaimCandidate = Readonly<{ attempt_count: number; id: string }>;
type DeliveryClaimCandidate = Readonly<{ attempt_count: number; id: string }>;

function assertPositiveInteger(value: number, name: string, max = 1000): void {
  if (!Number.isSafeInteger(value) || value < 1 || value > max) {
    throw new TypeError(`${name} must be a positive safe integer`);
  }
}

function assertNonEmpty(value: string, name: string): void {
  if (value.trim().length === 0 || value !== value.trim()) {
    throw new TypeError(`${name} must be non-empty and trimmed`);
  }
}

function jsonInput(
  value: EventJson | null | undefined,
): Prisma.InputJsonValue | typeof Prisma.DbNull {
  if (value === undefined || value === null) return Prisma.DbNull;
  return value as Prisma.InputJsonValue;
}

function assertOutboxStatus(status: string): asserts status is EventOutboxStatus {
  if (
    !["pending", "publishing", "published", "failed", "dead_letter", "cancelled"].includes(status)
  ) {
    throw new Error("Database returned an unsupported Event Outbox status");
  }
}

function assertConsumptionStatus(status: string): asserts status is EventConsumptionStatus {
  if (
    !["pending", "running", "succeeded", "retrying", "failed", "dead_letter", "ignored"].includes(
      status,
    )
  ) {
    throw new Error("Database returned an unsupported Event Consumption status");
  }
}

function assertDeliveryStatus(status: string): asserts status is EventDeliveryStatus {
  if (
    ![
      "pending",
      "delivering",
      "succeeded",
      "retrying",
      "failed",
      "dead_letter",
      "cancelled",
    ].includes(status)
  ) {
    throw new Error("Database returned an unsupported Event Delivery status");
  }
}

function assertDeadLetterStatus(status: string): asserts status is EventDeadLetterStatus {
  if (!["open", "in_review", "replayed", "resolved", "ignored"].includes(status)) {
    throw new Error("Database returned an unsupported Event Dead Letter status");
  }
}

function assertFailureStage(stage: string): asserts stage is EventFailureStage {
  if (!["publish", "consume", "deliver"].includes(stage)) {
    throw new Error("Database returned an unsupported Event failure stage");
  }
}

function envelopeFromRow(row: event_history | event_outbox): EventEnvelope {
  return {
    actorUserId: row.actor_user_id,
    aggregateId: row.aggregate_id,
    aggregateType: row.aggregate_type,
    eventId: row.event_id,
    eventType: row.event_type,
    eventVersion: row.event_version,
    metadata: row.metadata,
    occurredAt: row.occurred_at,
    payload: row.payload,
    producer: row.producer,
    requestTraceId: row.request_trace_id,
  };
}

function outboxFromRow(row: event_outbox): EventOutboxRecord {
  assertOutboxStatus(row.status);
  return {
    ...envelopeFromRow(row),
    attemptCount: row.attempt_count,
    availableAt: row.available_at,
    createdAt: row.created_at,
    id: row.id,
    lastErrorCode: row.last_error_code,
    lastErrorMessage: row.last_error_message,
    lockedBy: row.locked_by,
    lockedUntil: row.locked_until,
    maxAttempts: row.max_attempts,
    publishedAt: row.published_at,
    status: row.status,
    updatedAt: row.updated_at,
  };
}

function historyFromRow(row: event_history): EventHistoryRecord {
  return {
    ...envelopeFromRow(row),
    createdAt: row.created_at,
    id: row.id,
  };
}

function consumptionFromRow(row: event_consumptions, event: EventEnvelope): EventConsumptionRecord {
  assertConsumptionStatus(row.status);
  return {
    attemptCount: row.attempt_count,
    availableAt: row.available_at,
    completedAt: row.completed_at,
    consumerName: row.consumer_name,
    createdAt: row.created_at,
    event,
    eventId: row.event_id,
    handlerName: row.handler_name,
    id: row.id,
    lastErrorCode: row.last_error_code,
    lastErrorDetail: row.last_error_detail,
    lastErrorMessage: row.last_error_message,
    lockedBy: row.locked_by,
    lockedUntil: row.locked_until,
    maxAttempts: row.max_attempts,
    requestTraceId: row.request_trace_id,
    startedAt: row.started_at,
    status: row.status,
    updatedAt: row.updated_at,
  };
}

function deliveryFromRow(row: event_deliveries, event: EventEnvelope): EventDeliveryRecord {
  assertDeliveryStatus(row.status);
  return {
    attemptCount: row.attempt_count,
    availableAt: row.available_at,
    createdAt: row.created_at,
    deliveredAt: row.delivered_at,
    deliveryTarget: row.delivery_target,
    deliveryTargetType: row.delivery_target_type,
    event,
    eventId: row.event_id,
    id: row.id,
    lastErrorCode: row.last_error_code,
    lastErrorMessage: row.last_error_message,
    lockedBy: row.locked_by,
    lockedUntil: row.locked_until,
    maxAttempts: row.max_attempts,
    requestTraceId: row.request_trace_id,
    responseSummary: row.response_summary,
    status: row.status,
    updatedAt: row.updated_at,
  };
}

function deadLetterFromRow(row: event_dead_letters): EventDeadLetterRecord {
  assertDeadLetterStatus(row.status);
  assertFailureStage(row.failure_stage);
  return {
    consumerName: row.consumer_name,
    context: row.context,
    createdAt: row.created_at,
    deliveryTarget: row.delivery_target,
    eventId: row.event_id,
    failureStage: row.failure_stage,
    handledAt: row.handled_at,
    handledBy: row.handled_by,
    handlingNote: row.handling_note,
    id: row.id,
    reasonCode: row.reason_code,
    reasonMessage: row.reason_message,
    replayedEventId: row.replayed_event_id,
    status: row.status,
    updatedAt: row.updated_at,
  };
}

async function writeEventAudit(
  client: EventClient,
  input: Readonly<{
    action: string;
    eventId: string;
    eventType: string;
    failureReason?: string;
    metadata?: EventJson | null;
    requestTraceId: string;
    result: "failure" | "success";
    timestamp: Date;
  }>,
): Promise<void> {
  const event =
    input.result === "failure"
      ? {
          action: input.action,
          afterSnapshot: { eventType: input.eventType },
          failureReason: input.failureReason ?? "Event operation failed",
          ...(input.metadata === null || input.metadata === undefined
            ? {}
            : { metadata: input.metadata }),
          moduleCode: "event_infrastructure",
          requestId: input.requestTraceId,
          resourceId: input.eventId,
          resourceNoSnapshot: input.eventType,
          resourceType: "event",
          result: input.result,
          timestamp: input.timestamp,
        }
      : {
          action: input.action,
          afterSnapshot: { eventType: input.eventType },
          ...(input.metadata === null || input.metadata === undefined
            ? {}
            : { metadata: input.metadata }),
          moduleCode: "event_infrastructure",
          requestId: input.requestTraceId,
          resourceId: input.eventId,
          resourceNoSnapshot: input.eventType,
          resourceType: "event",
          result: input.result,
          timestamp: input.timestamp,
        };

  await recordAuditEvent(
    new PrismaAuditWriter(client as unknown as Pick<PrismaClient, "audit_logs">),
    event,
    { failureMode: "best-effort" },
  );
}

export class PrismaEventRepository {
  readonly #client: PrismaClient;

  constructor(client: PrismaClient = getPrismaClient()) {
    this.#client = client;
  }

  async registerEvent(input: RegisterEventInput): Promise<EventOutboxRecord> {
    assertNonEmpty(input.eventType, "Event type");
    assertNonEmpty(input.producer, "Event producer");
    assertPositiveInteger(input.eventVersion, "Event version");
    const now = input.now ?? new Date();
    const eventId = input.eventId ?? randomUUID();
    const availableAt = input.availableAt ?? now;
    const maxAttempts = input.maxAttempts ?? 3;
    assertPositiveInteger(maxAttempts, "Event max attempts");

    return this.#client.$transaction(async (transaction) => {
      await transaction.event_history.create({
        data: {
          actor_user_id: input.actorUserId ?? null,
          aggregate_id: input.aggregateId ?? null,
          aggregate_type: input.aggregateType ?? null,
          created_at: now,
          event_id: eventId,
          event_type: input.eventType,
          event_version: input.eventVersion,
          metadata: jsonInput(input.metadata),
          occurred_at: input.occurredAt,
          payload: jsonInput(input.payload),
          producer: input.producer,
          request_trace_id: input.requestTraceId,
        },
      });

      const outbox = await transaction.event_outbox.create({
        data: {
          actor_user_id: input.actorUserId ?? null,
          aggregate_id: input.aggregateId ?? null,
          aggregate_type: input.aggregateType ?? null,
          attempt_count: 0,
          available_at: availableAt,
          created_at: now,
          event_id: eventId,
          event_type: input.eventType,
          event_version: input.eventVersion,
          max_attempts: maxAttempts,
          metadata: jsonInput(input.metadata),
          occurred_at: input.occurredAt,
          payload: jsonInput(input.payload),
          producer: input.producer,
          request_trace_id: input.requestTraceId,
          status: "pending",
          updated_at: now,
        },
      });

      await writeEventAudit(transaction, {
        action: "event.outbox.create",
        eventId,
        eventType: input.eventType,
        requestTraceId: input.requestTraceId,
        result: "success",
        timestamp: now,
      });

      return outboxFromRow(outbox);
    });
  }

  async getEventHistory(eventId: string): Promise<EventHistoryRecord | null> {
    const row = await this.#client.event_history.findUnique({ where: { event_id: eventId } });
    return row ? historyFromRow(row) : null;
  }

  async claimOutbox(input: ClaimOutboxInput): Promise<readonly EventOutboxRecord[]> {
    assertPositiveInteger(input.limit, "Event Outbox claim limit");
    if (input.lockedUntil <= input.now) {
      throw new TypeError("Event Outbox lease must expire after claim time");
    }

    return this.#client.$transaction(async (transaction) => {
      const candidates = await transaction.$queryRaw<OutboxClaimCandidate[]>(
        Prisma.sql`
          SELECT id, attempt_count
          FROM event_outbox
          WHERE status IN ('pending', 'failed')
            AND available_at <= ${input.now}
            AND (locked_until IS NULL OR locked_until < ${input.now})
          ORDER BY available_at ASC, created_at ASC
          FOR UPDATE SKIP LOCKED
          LIMIT ${input.limit}
        `,
      );
      const claimed: EventOutboxRecord[] = [];
      for (const candidate of candidates) {
        const row = await transaction.event_outbox.update({
          data: {
            attempt_count: candidate.attempt_count + 1,
            locked_by: input.publisherId,
            locked_until: input.lockedUntil,
            status: "publishing",
            updated_at: input.now,
          },
          where: { id: candidate.id },
        });
        claimed.push(outboxFromRow(row));
      }
      return claimed;
    });
  }

  async markOutboxPublished(
    input: Readonly<{ id: string; now: Date; publisherId: string }>,
  ): Promise<EventOutboxRecord | null> {
    const updated = await this.#client.event_outbox.updateMany({
      data: {
        locked_by: null,
        locked_until: null,
        published_at: input.now,
        status: "published",
        updated_at: input.now,
      },
      where: { id: input.id, locked_by: input.publisherId, status: "publishing" },
    });
    if (updated.count !== 1) return null;
    const row = await this.#client.event_outbox.findUnique({ where: { id: input.id } });
    if (row) {
      await writeEventAudit(this.#client, {
        action: "event.outbox.published",
        eventId: row.event_id,
        eventType: row.event_type,
        requestTraceId: row.request_trace_id,
        result: "success",
        timestamp: input.now,
      });
    }
    return row ? outboxFromRow(row) : null;
  }

  async settleOutboxFailure(
    input: Readonly<{
      deadLetterReason?: string;
      errorCode: string;
      errorMessage: string;
      id: string;
      nextRetryAt?: Date;
      now: Date;
      publisherId: string;
      retryOutcome: "dead_letter" | "retry";
    }>,
  ): Promise<Readonly<{
    deadLetter: EventDeadLetterRecord | null;
    outbox: EventOutboxRecord;
  }> | null> {
    return this.#client.$transaction(async (transaction) => {
      const current = await transaction.event_outbox.findUnique({ where: { id: input.id } });
      if (!current || current.status !== "publishing" || current.locked_by !== input.publisherId) {
        return null;
      }
      const outbox = await transaction.event_outbox.update({
        data: {
          ...(input.retryOutcome === "retry" ? { available_at: input.nextRetryAt } : {}),
          last_error_code: input.errorCode,
          last_error_message: input.errorMessage,
          locked_by: null,
          locked_until: null,
          status: input.retryOutcome === "retry" ? "failed" : "dead_letter",
          updated_at: input.now,
        },
        where: { id: current.id },
      });
      const deadLetter =
        input.retryOutcome === "dead_letter"
          ? await transaction.event_dead_letters.create({
              data: {
                context: jsonInput({ outboxId: current.id }),
                created_at: input.now,
                event_id: current.event_id,
                failure_stage: "publish",
                outbox_id: current.id,
                reason_code: input.errorCode,
                reason_message: input.deadLetterReason ?? input.errorMessage,
                status: "open",
                updated_at: input.now,
              },
            })
          : null;

      await writeEventAudit(transaction, {
        action: input.retryOutcome === "retry" ? "event.outbox.retry" : "event.dead_letter.open",
        eventId: current.event_id,
        eventType: current.event_type,
        failureReason: input.errorMessage,
        requestTraceId: current.request_trace_id,
        result: "failure",
        timestamp: input.now,
      });

      return {
        deadLetter: deadLetter ? deadLetterFromRow(deadLetter) : null,
        outbox: outboxFromRow(outbox),
      };
    });
  }

  async createConsumerInboxes(inputs: readonly CreateConsumerInboxInput[]): Promise<number> {
    if (inputs.length === 0) return 0;
    const result = await this.#client.event_consumptions.createMany({
      data: inputs.map((input) => ({
        attempt_count: 0,
        available_at: input.now,
        consumer_name: input.consumerName,
        created_at: input.now,
        event_id: input.eventId,
        handler_name: input.handlerName,
        max_attempts: input.maxAttempts,
        request_trace_id: input.requestTraceId,
        status: "pending",
        updated_at: input.now,
      })),
      skipDuplicates: true,
    });
    return result.count;
  }

  async claimConsumptions(
    input: ClaimConsumptionsInput,
  ): Promise<readonly EventConsumptionRecord[]> {
    assertPositiveInteger(input.limit, "Event Consumption claim limit");
    return this.#client.$transaction(async (transaction) => {
      const candidates = await transaction.$queryRaw<ConsumptionClaimCandidate[]>(
        Prisma.sql`
          SELECT id, attempt_count
          FROM event_consumptions
          WHERE consumer_name = ${input.consumerName}
            AND status IN ('pending', 'retrying')
            AND available_at <= ${input.now}
            AND (locked_until IS NULL OR locked_until < ${input.now})
          ORDER BY available_at ASC, created_at ASC
          FOR UPDATE SKIP LOCKED
          LIMIT ${input.limit}
        `,
      );
      const claimed: EventConsumptionRecord[] = [];
      for (const candidate of candidates) {
        const row = await transaction.event_consumptions.update({
          data: {
            attempt_count: candidate.attempt_count + 1,
            locked_by: input.workerId,
            locked_until: input.lockedUntil,
            started_at: input.now,
            status: "running",
            updated_at: input.now,
          },
          where: { id: candidate.id },
        });
        const event = await transaction.event_history.findUniqueOrThrow({
          where: { event_id: row.event_id },
        });
        claimed.push(consumptionFromRow(row, envelopeFromRow(event)));
      }
      return claimed;
    });
  }

  async markConsumptionSucceeded(
    input: Readonly<{ id: string; now: Date; workerId: string }>,
  ): Promise<EventConsumptionRecord | null> {
    const row = await this.#client.event_consumptions.update({
      data: {
        completed_at: input.now,
        locked_by: null,
        locked_until: null,
        status: "succeeded",
        updated_at: input.now,
      },
      where: { id: input.id, locked_by: input.workerId, status: "running" },
    });
    const event = await this.#client.event_history.findUniqueOrThrow({
      where: { event_id: row.event_id },
    });
    await writeEventAudit(this.#client, {
      action: "event.consumer.succeeded",
      eventId: row.event_id,
      eventType: event.event_type,
      requestTraceId: row.request_trace_id,
      result: "success",
      timestamp: input.now,
    });
    return consumptionFromRow(row, envelopeFromRow(event));
  }

  async settleConsumptionFailure(
    input: Readonly<{
      deadLetterReason?: string;
      errorCode: string;
      errorDetail?: EventJson | null;
      errorMessage: string;
      id: string;
      nextRetryAt?: Date;
      now: Date;
      retryOutcome: "dead_letter" | "retry";
      workerId: string;
    }>,
  ): Promise<Readonly<{
    consumption: EventConsumptionRecord;
    deadLetter: EventDeadLetterRecord | null;
  }> | null> {
    return this.#client.$transaction(async (transaction) => {
      const current = await transaction.event_consumptions.findUnique({ where: { id: input.id } });
      if (!current || current.status !== "running" || current.locked_by !== input.workerId)
        return null;
      const row = await transaction.event_consumptions.update({
        data: {
          ...(input.retryOutcome === "retry" ? { available_at: input.nextRetryAt } : {}),
          completed_at: input.retryOutcome === "dead_letter" ? input.now : null,
          last_error_code: input.errorCode,
          last_error_detail: jsonInput(input.errorDetail),
          last_error_message: input.errorMessage,
          locked_by: null,
          locked_until: null,
          status: input.retryOutcome === "retry" ? "retrying" : "dead_letter",
          updated_at: input.now,
        },
        where: { id: current.id },
      });
      const event = await transaction.event_history.findUniqueOrThrow({
        where: { event_id: row.event_id },
      });
      const deadLetter =
        input.retryOutcome === "dead_letter"
          ? await transaction.event_dead_letters.create({
              data: {
                consumer_name: row.consumer_name,
                consumption_id: row.id,
                context: jsonInput(input.errorDetail ?? { consumptionId: row.id }),
                created_at: input.now,
                event_id: row.event_id,
                failure_stage: "consume",
                reason_code: input.errorCode,
                reason_message: input.deadLetterReason ?? input.errorMessage,
                status: "open",
                updated_at: input.now,
              },
            })
          : null;
      return {
        consumption: consumptionFromRow(row, envelopeFromRow(event)),
        deadLetter: deadLetter ? deadLetterFromRow(deadLetter) : null,
      };
    });
  }

  async createDeliveries(inputs: readonly CreateDeliveryInput[]): Promise<number> {
    if (inputs.length === 0) return 0;
    const result = await this.#client.event_deliveries.createMany({
      data: inputs.map((input) => ({
        attempt_count: 0,
        available_at: input.now,
        created_at: input.now,
        delivery_target: input.deliveryTarget,
        delivery_target_type: input.deliveryTargetType,
        event_id: input.eventId,
        max_attempts: input.maxAttempts,
        request_trace_id: input.requestTraceId,
        status: "pending",
        updated_at: input.now,
      })),
      skipDuplicates: true,
    });
    return result.count;
  }

  async claimDeliveries(input: ClaimDeliveriesInput): Promise<readonly EventDeliveryRecord[]> {
    assertPositiveInteger(input.limit, "Event Delivery claim limit");
    const targetFilter =
      input.target && input.targetType
        ? Prisma.sql`AND delivery_target = ${input.target} AND delivery_target_type = ${input.targetType}`
        : Prisma.empty;
    return this.#client.$transaction(async (transaction) => {
      const candidates = await transaction.$queryRaw<DeliveryClaimCandidate[]>(
        Prisma.sql`
          SELECT id, attempt_count
          FROM event_deliveries
          WHERE status IN ('pending', 'retrying')
            AND available_at <= ${input.now}
            AND (locked_until IS NULL OR locked_until < ${input.now})
            ${targetFilter}
          ORDER BY available_at ASC, created_at ASC
          FOR UPDATE SKIP LOCKED
          LIMIT ${input.limit}
        `,
      );
      const claimed: EventDeliveryRecord[] = [];
      for (const candidate of candidates) {
        const row = await transaction.event_deliveries.update({
          data: {
            attempt_count: candidate.attempt_count + 1,
            locked_by: input.workerId,
            locked_until: input.lockedUntil,
            status: "delivering",
            updated_at: input.now,
          },
          where: { id: candidate.id },
        });
        const event = await transaction.event_history.findUniqueOrThrow({
          where: { event_id: row.event_id },
        });
        claimed.push(deliveryFromRow(row, envelopeFromRow(event)));
      }
      return claimed;
    });
  }

  async markDeliverySucceeded(
    input: Readonly<{
      id: string;
      now: Date;
      responseSummary?: EventJson | null;
      workerId: string;
    }>,
  ): Promise<EventDeliveryRecord | null> {
    const row = await this.#client.event_deliveries.update({
      data: {
        delivered_at: input.now,
        locked_by: null,
        locked_until: null,
        response_summary: jsonInput(input.responseSummary),
        status: "succeeded",
        updated_at: input.now,
      },
      where: { id: input.id, locked_by: input.workerId, status: "delivering" },
    });
    const event = await this.#client.event_history.findUniqueOrThrow({
      where: { event_id: row.event_id },
    });
    return deliveryFromRow(row, envelopeFromRow(event));
  }

  async settleDeliveryFailure(
    input: Readonly<{
      deadLetterReason?: string;
      errorCode: string;
      errorMessage: string;
      id: string;
      nextRetryAt?: Date;
      now: Date;
      responseSummary?: EventJson | null;
      retryOutcome: "dead_letter" | "retry";
      workerId: string;
    }>,
  ): Promise<Readonly<{
    deadLetter: EventDeadLetterRecord | null;
    delivery: EventDeliveryRecord;
  }> | null> {
    return this.#client.$transaction(async (transaction) => {
      const current = await transaction.event_deliveries.findUnique({ where: { id: input.id } });
      if (!current || current.status !== "delivering" || current.locked_by !== input.workerId)
        return null;
      const row = await transaction.event_deliveries.update({
        data: {
          ...(input.retryOutcome === "retry" ? { available_at: input.nextRetryAt } : {}),
          last_error_code: input.errorCode,
          last_error_message: input.errorMessage,
          locked_by: null,
          locked_until: null,
          response_summary: jsonInput(input.responseSummary),
          status: input.retryOutcome === "retry" ? "retrying" : "dead_letter",
          updated_at: input.now,
        },
        where: { id: current.id },
      });
      const event = await transaction.event_history.findUniqueOrThrow({
        where: { event_id: row.event_id },
      });
      const deadLetter =
        input.retryOutcome === "dead_letter"
          ? await transaction.event_dead_letters.create({
              data: {
                context: jsonInput(input.responseSummary ?? { deliveryId: row.id }),
                created_at: input.now,
                delivery_id: row.id,
                delivery_target: row.delivery_target,
                event_id: row.event_id,
                failure_stage: "deliver",
                reason_code: input.errorCode,
                reason_message: input.deadLetterReason ?? input.errorMessage,
                status: "open",
                updated_at: input.now,
              },
            })
          : null;
      return {
        deadLetter: deadLetter ? deadLetterFromRow(deadLetter) : null,
        delivery: deliveryFromRow(row, envelopeFromRow(event)),
      };
    });
  }

  async recoverExpiredLeases(input: RecoverEventLeasesInput): Promise<number> {
    assertPositiveInteger(input.limit, "Event lease recovery limit");
    const [outbox, consumptions, deliveries] = await Promise.all([
      this.#recoverExpiredOutboxLeases(input),
      this.#recoverExpiredConsumptionLeases(input),
      this.#recoverExpiredDeliveryLeases(input),
    ]);
    return outbox + consumptions + deliveries;
  }

  async #recoverExpiredOutboxLeases(input: RecoverEventLeasesInput): Promise<number> {
    const rows = await this.#client.event_outbox.findMany({
      orderBy: { updated_at: "asc" },
      take: input.limit,
      where: { locked_until: { lt: input.now }, status: "publishing" },
    });
    for (const row of rows) {
      await this.#client.event_outbox.update({
        data: {
          locked_by: null,
          locked_until: null,
          status: row.attempt_count >= row.max_attempts ? "dead_letter" : "failed",
          updated_at: input.now,
        },
        where: { id: row.id },
      });
      if (row.attempt_count >= row.max_attempts) {
        await this.#client.event_dead_letters.create({
          data: {
            context: jsonInput({ outboxId: row.id }),
            created_at: input.now,
            event_id: row.event_id,
            failure_stage: "publish",
            outbox_id: row.id,
            reason_code: "EVENT_OUTBOX_LEASE_TIMEOUT",
            reason_message: "Event outbox publishing lease timed out and retry attempts exhausted",
            status: "open",
            updated_at: input.now,
          },
        });
      }
    }
    return rows.length;
  }

  async #recoverExpiredConsumptionLeases(input: RecoverEventLeasesInput): Promise<number> {
    const rows = await this.#client.event_consumptions.findMany({
      orderBy: { updated_at: "asc" },
      take: input.limit,
      where: { locked_until: { lt: input.now }, status: "running" },
    });
    for (const row of rows) {
      const exhausted = row.attempt_count >= row.max_attempts;
      await this.#client.event_consumptions.update({
        data: {
          completed_at: exhausted ? input.now : null,
          last_error_code: "EVENT_CONSUMPTION_LEASE_TIMEOUT",
          last_error_message: "Event consumption lease timed out",
          locked_by: null,
          locked_until: null,
          status: exhausted ? "dead_letter" : "retrying",
          updated_at: input.now,
        },
        where: { id: row.id },
      });
      if (exhausted) {
        await this.#client.event_dead_letters.create({
          data: {
            consumer_name: row.consumer_name,
            consumption_id: row.id,
            context: jsonInput({ consumptionId: row.id }),
            created_at: input.now,
            event_id: row.event_id,
            failure_stage: "consume",
            reason_code: "EVENT_CONSUMPTION_LEASE_TIMEOUT",
            reason_message: "Event consumption lease timed out and retry attempts exhausted",
            status: "open",
            updated_at: input.now,
          },
        });
      }
    }
    return rows.length;
  }

  async #recoverExpiredDeliveryLeases(input: RecoverEventLeasesInput): Promise<number> {
    const rows = await this.#client.event_deliveries.findMany({
      orderBy: { updated_at: "asc" },
      take: input.limit,
      where: { locked_until: { lt: input.now }, status: "delivering" },
    });
    for (const row of rows) {
      const exhausted = row.attempt_count >= row.max_attempts;
      await this.#client.event_deliveries.update({
        data: {
          last_error_code: "EVENT_DELIVERY_LEASE_TIMEOUT",
          last_error_message: "Event delivery lease timed out",
          locked_by: null,
          locked_until: null,
          status: exhausted ? "dead_letter" : "retrying",
          updated_at: input.now,
        },
        where: { id: row.id },
      });
      if (exhausted) {
        await this.#client.event_dead_letters.create({
          data: {
            context: jsonInput({ deliveryId: row.id }),
            created_at: input.now,
            delivery_id: row.id,
            delivery_target: row.delivery_target,
            event_id: row.event_id,
            failure_stage: "deliver",
            reason_code: "EVENT_DELIVERY_LEASE_TIMEOUT",
            reason_message: "Event delivery lease timed out and retry attempts exhausted",
            status: "open",
            updated_at: input.now,
          },
        });
      }
    }
    return rows.length;
  }
}
