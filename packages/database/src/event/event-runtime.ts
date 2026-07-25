import type { CreateJobInput, PrismaJobRepository } from "../job/prisma-job-repository.js";
import type { Logger, MetricsRegistry } from "@violin-erp/api";
import { evaluateEventRetry, type EventRetryPolicy } from "./event-retry-engine.js";
import { EventRegistry } from "./event-registry.js";
import {
  type EventConsumptionRecord,
  type EventDeliveryRecord,
  type EventEnvelope,
  type EventJson,
  type EventOutboxRecord,
  type PrismaEventRepository,
} from "./prisma-event-repository.js";

export type EventRuntimeState = "stopped" | "running" | "stopping";

export type EventPublisherRepository = Pick<
  PrismaEventRepository,
  | "claimOutbox"
  | "createConsumerInboxes"
  | "createDeliveries"
  | "markOutboxPublished"
  | "recoverExpiredLeases"
  | "settleOutboxFailure"
>;

export type EventConsumerRepository = Pick<
  PrismaEventRepository,
  | "claimConsumptions"
  | "markConsumptionSucceeded"
  | "recoverExpiredLeases"
  | "settleConsumptionFailure"
>;

export type EventDeliveryRepository = Pick<
  PrismaEventRepository,
  "claimDeliveries" | "markDeliverySucceeded" | "recoverExpiredLeases" | "settleDeliveryFailure"
>;

type Sleep = (milliseconds: number, signal: AbortSignal) => Promise<void>;

export type EventPublisherRuntimeOptions = Readonly<{
  claimLimit?: number;
  clock?: () => Date;
  leaseMilliseconds?: number;
  logger?: Logger;
  metrics?: MetricsRegistry;
  onError?: (error: unknown, event?: EventOutboxRecord) => void;
  pollIntervalMilliseconds?: number;
  publisherId: string;
  registry: EventRegistry;
  repository: EventPublisherRepository;
  retryPolicy?: EventRetryPolicy;
  sleep?: Sleep;
}>;

export type EventConsumerRuntimeOptions = Readonly<{
  claimLimit?: number;
  clock?: () => Date;
  consumerName: string;
  leaseMilliseconds?: number;
  logger?: Logger;
  metrics?: MetricsRegistry;
  onError?: (error: unknown, event?: EventConsumptionRecord) => void;
  pollIntervalMilliseconds?: number;
  registry: EventRegistry;
  repository: EventConsumerRepository;
  retryPolicy?: EventRetryPolicy;
  sleep?: Sleep;
  workerId: string;
}>;

export type EventDeliveryRuntimeOptions = Readonly<{
  claimLimit?: number;
  clock?: () => Date;
  leaseMilliseconds?: number;
  logger?: Logger;
  metrics?: MetricsRegistry;
  onError?: (error: unknown, event?: EventDeliveryRecord) => void;
  pollIntervalMilliseconds?: number;
  registry: EventRegistry;
  repository: EventDeliveryRepository;
  retryPolicy?: EventRetryPolicy;
  sleep?: Sleep;
  target?: string;
  targetType?: string;
  workerId: string;
}>;

const DEFAULT_CLAIM_LIMIT = 1;
const DEFAULT_LEASE_MILLISECONDS = 60_000;
const DEFAULT_POLL_INTERVAL_MILLISECONDS = 1_000;

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new TypeError(`${name} must be a positive safe integer`);
  }
}

function assertNonEmpty(value: string, name: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${name} must not be empty`);
  }
}

function defaultSleep(milliseconds: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, milliseconds);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timeout);
        resolve();
      },
      { once: true },
    );
  });
}

function toSafeErrorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim().length > 0
    ? error.message
    : "Event handler failed";
}

abstract class LoopRuntime {
  protected readonly clock: () => Date;
  protected readonly pollIntervalMilliseconds: number;
  protected readonly sleep: Sleep;
  #abortController: AbortController | null = null;
  #loopPromise: Promise<void> | null = null;
  #state: EventRuntimeState = "stopped";

  protected constructor(
    options: Readonly<{ clock?: () => Date; pollIntervalMilliseconds?: number; sleep?: Sleep }>,
  ) {
    this.clock = options.clock ?? (() => new Date());
    this.pollIntervalMilliseconds =
      options.pollIntervalMilliseconds ?? DEFAULT_POLL_INTERVAL_MILLISECONDS;
    assertPositiveInteger(
      this.pollIntervalMilliseconds,
      "Event runtime poll interval milliseconds",
    );
    this.sleep = options.sleep ?? defaultSleep;
  }

  get state(): EventRuntimeState {
    return this.#state;
  }

  start(): void {
    if (this.#state === "running") return;
    if (this.#state === "stopping") {
      throw new Error("Event runtime is stopping and cannot be started");
    }
    const abortController = new AbortController();
    this.#abortController = abortController;
    this.#state = "running";
    this.#loopPromise = this.runLoop(abortController.signal).finally(() => {
      this.#state = "stopped";
      this.#abortController = null;
      this.#loopPromise = null;
    });
  }

  async stop(): Promise<void> {
    if (this.#state === "stopped") return;
    this.#state = "stopping";
    this.#abortController?.abort();
    await this.#loopPromise;
  }

  abstract runOnce(): Promise<number>;

  protected abstract onLoopError(error: unknown): void;

  private async runLoop(signal: AbortSignal): Promise<void> {
    while (this.#state === "running" && !signal.aborted) {
      try {
        const consumed = await this.runOnce();
        if (consumed === 0 && this.#state === "running" && !signal.aborted) {
          await this.sleep(this.pollIntervalMilliseconds, signal);
        }
      } catch (error) {
        this.onLoopError(error);
        if (this.#state === "running" && !signal.aborted) {
          await this.sleep(this.pollIntervalMilliseconds, signal);
        }
      }
    }
  }
}

export class EventPublisherRuntime extends LoopRuntime {
  readonly #claimLimit: number;
  readonly #leaseMilliseconds: number;
  readonly #logger: Logger | undefined;
  readonly #metrics: MetricsRegistry | undefined;
  readonly #onError: (error: unknown, event?: EventOutboxRecord) => void;
  readonly #publisherId: string;
  readonly #registry: EventRegistry;
  readonly #repository: EventPublisherRepository;
  readonly #retryPolicy: EventRetryPolicy;

  constructor(options: EventPublisherRuntimeOptions) {
    super(options);
    this.#claimLimit = options.claimLimit ?? DEFAULT_CLAIM_LIMIT;
    this.#leaseMilliseconds = options.leaseMilliseconds ?? DEFAULT_LEASE_MILLISECONDS;
    assertPositiveInteger(this.#claimLimit, "Event Publisher claim limit");
    assertPositiveInteger(this.#leaseMilliseconds, "Event Publisher lease milliseconds");
    assertNonEmpty(options.publisherId, "Event Publisher ID");
    this.#onError = options.onError ?? (() => undefined);
    this.#logger = options.logger;
    this.#metrics = options.metrics;
    this.#publisherId = options.publisherId;
    this.#registry = options.registry;
    this.#repository = options.repository;
    this.#retryPolicy = options.retryPolicy ?? {};
  }

  override async runOnce(): Promise<number> {
    const now = this.clock();
    await this.#repository.recoverExpiredLeases({ limit: this.#claimLimit, now });
    const claimed = await this.#repository.claimOutbox({
      limit: this.#claimLimit,
      lockedUntil: new Date(now.getTime() + this.#leaseMilliseconds),
      now,
      publisherId: this.#publisherId,
    });
    for (const event of claimed) {
      await this.#publish(event);
    }
    return claimed.length;
  }

  protected override onLoopError(error: unknown): void {
    this.#onError(error);
  }

  async #publish(event: EventOutboxRecord): Promise<void> {
    const now = this.clock();
    try {
      const consumers = this.#registry.getConsumers(event.eventType);
      await this.#repository.createConsumerInboxes(
        consumers.map((consumer) => ({
          consumerName: consumer.consumerName,
          eventId: event.eventId,
          handlerName: consumer.handlerName ?? consumer.consumerName,
          maxAttempts: consumer.maxAttempts ?? 3,
          now,
          requestTraceId: event.requestTraceId,
        })),
      );
      const targets = this.#registry.getDeliveryTargets(event.eventType);
      await this.#repository.createDeliveries(
        targets.map((target) => ({
          deliveryTarget: target.target,
          deliveryTargetType: target.targetType,
          eventId: event.eventId,
          maxAttempts: target.maxAttempts ?? 3,
          now,
          requestTraceId: event.requestTraceId,
        })),
      );
      await this.#repository.markOutboxPublished({
        id: event.id,
        now,
        publisherId: this.#publisherId,
      });
      this.#logger?.info("event.publish.succeeded", {
        event_id: event.eventId,
        event_type: event.eventType,
        request_trace_id: event.requestTraceId,
      });
    } catch (error) {
      const decision = evaluateEventRetry(
        {
          attemptCount: event.attemptCount,
          maxAttempts: event.maxAttempts,
          now,
          retryable: true,
        },
        this.#retryPolicy,
      );
      await this.#repository.settleOutboxFailure({
        ...(decision.outcome === "retry"
          ? { nextRetryAt: decision.nextRetryAt, retryOutcome: "retry" as const }
          : { deadLetterReason: decision.deadLetterReason, retryOutcome: "dead_letter" as const }),
        errorCode: "EVENT_PUBLISHER_FAILED",
        errorMessage: toSafeErrorMessage(error),
        id: event.id,
        now,
        publisherId: this.#publisherId,
      });
      this.#metrics?.incrementCounter("event_publish_failed_count", {
        error_code: "EVENT_PUBLISHER_FAILED",
        event_type: event.eventType,
      });
      if (decision.outcome === "dead_letter") {
        this.#metrics?.incrementCounter("event_dead_letter_count", { failure_stage: "publish" });
      }
      this.#logger?.error("event.publish.failed", {
        error_code: "EVENT_PUBLISHER_FAILED",
        event_id: event.eventId,
        event_type: event.eventType,
        request_trace_id: event.requestTraceId,
      });
      this.#onError(error, event);
    }
  }
}

export class EventConsumerRuntime extends LoopRuntime {
  readonly #claimLimit: number;
  readonly #consumerName: string;
  readonly #leaseMilliseconds: number;
  readonly #logger: Logger | undefined;
  readonly #metrics: MetricsRegistry | undefined;
  readonly #onError: (error: unknown, event?: EventConsumptionRecord) => void;
  readonly #registry: EventRegistry;
  readonly #repository: EventConsumerRepository;
  readonly #retryPolicy: EventRetryPolicy;
  readonly #workerId: string;

  constructor(options: EventConsumerRuntimeOptions) {
    super(options);
    this.#claimLimit = options.claimLimit ?? DEFAULT_CLAIM_LIMIT;
    this.#leaseMilliseconds = options.leaseMilliseconds ?? DEFAULT_LEASE_MILLISECONDS;
    assertPositiveInteger(this.#claimLimit, "Event Consumer claim limit");
    assertPositiveInteger(this.#leaseMilliseconds, "Event Consumer lease milliseconds");
    assertNonEmpty(options.consumerName, "Event Consumer name");
    assertNonEmpty(options.workerId, "Event Consumer worker ID");
    this.#consumerName = options.consumerName;
    this.#logger = options.logger;
    this.#metrics = options.metrics;
    this.#onError = options.onError ?? (() => undefined);
    this.#registry = options.registry;
    this.#repository = options.repository;
    this.#retryPolicy = options.retryPolicy ?? {};
    this.#workerId = options.workerId;
  }

  override async runOnce(): Promise<number> {
    const now = this.clock();
    await this.#repository.recoverExpiredLeases({ limit: this.#claimLimit, now });
    const claimed = await this.#repository.claimConsumptions({
      consumerName: this.#consumerName,
      limit: this.#claimLimit,
      lockedUntil: new Date(now.getTime() + this.#leaseMilliseconds),
      now,
      workerId: this.#workerId,
    });
    for (const consumption of claimed) {
      await this.#consume(consumption);
    }
    return claimed.length;
  }

  protected override onLoopError(error: unknown): void {
    this.#onError(error);
  }

  async #consume(consumption: EventConsumptionRecord): Promise<void> {
    const handler = this.#registry.getConsumer(
      consumption.event.eventType,
      consumption.consumerName,
    );
    const now = this.clock();
    if (!handler) {
      await this.#repository.settleConsumptionFailure({
        deadLetterReason: "Event consumer handler is not registered",
        errorCode: "EVENT_CONSUMER_NOT_FOUND",
        errorMessage: `No Event handler registered for ${consumption.consumerName}`,
        id: consumption.id,
        now,
        retryOutcome: "dead_letter",
        workerId: this.#workerId,
      });
      return;
    }

    try {
      const startedAt = this.clock().getTime();
      await handler.handler({
        attemptCount: consumption.attemptCount,
        consumerName: consumption.consumerName,
        consumptionId: consumption.id,
        event: consumption.event,
        handlerName: consumption.handlerName,
        requestTraceId: consumption.requestTraceId,
      });
      await this.#repository.markConsumptionSucceeded({
        id: consumption.id,
        now: this.clock(),
        workerId: this.#workerId,
      });
      this.#metrics?.observeHistogram("event_consume_duration_ms", this.#durationSince(startedAt), {
        consumer_name: consumption.consumerName,
        event_type: consumption.event.eventType,
      });
      this.#logger?.info("event.consume.succeeded", {
        consumer_id: consumption.consumerName,
        duration_ms: this.#durationSince(startedAt),
        event_id: consumption.eventId,
        event_type: consumption.event.eventType,
        request_trace_id: consumption.requestTraceId,
      });
    } catch (error) {
      const retryable = true;
      const decision = evaluateEventRetry(
        {
          attemptCount: consumption.attemptCount,
          maxAttempts: consumption.maxAttempts,
          now,
          retryable,
        },
        this.#retryPolicy,
      );
      await this.#repository.settleConsumptionFailure({
        ...(decision.outcome === "retry"
          ? { nextRetryAt: decision.nextRetryAt, retryOutcome: "retry" as const }
          : { deadLetterReason: decision.deadLetterReason, retryOutcome: "dead_letter" as const }),
        errorCode: "EVENT_CONSUMER_FAILED",
        errorDetail: { consumerName: consumption.consumerName },
        errorMessage: toSafeErrorMessage(error),
        id: consumption.id,
        now,
        workerId: this.#workerId,
      });
      this.#metrics?.incrementCounter("event_consume_failed_count", {
        consumer_name: consumption.consumerName,
        error_code: "EVENT_CONSUMER_FAILED",
        event_type: consumption.event.eventType,
      });
      if (decision.outcome === "dead_letter") {
        this.#metrics?.incrementCounter("event_dead_letter_count", { failure_stage: "consume" });
      }
      this.#logger?.warn("event.consume.failed", {
        consumer_id: consumption.consumerName,
        error_code: "EVENT_CONSUMER_FAILED",
        event_id: consumption.eventId,
        event_type: consumption.event.eventType,
        request_trace_id: consumption.requestTraceId,
      });
      this.#onError(error, consumption);
    }
  }

  #durationSince(startedAt: number): number {
    return Math.max(0, this.clock().getTime() - startedAt);
  }
}

export class EventDeliveryRuntime extends LoopRuntime {
  readonly #claimLimit: number;
  readonly #leaseMilliseconds: number;
  readonly #logger: Logger | undefined;
  readonly #metrics: MetricsRegistry | undefined;
  readonly #onError: (error: unknown, event?: EventDeliveryRecord) => void;
  readonly #registry: EventRegistry;
  readonly #repository: EventDeliveryRepository;
  readonly #retryPolicy: EventRetryPolicy;
  readonly #target: string | undefined;
  readonly #targetType: string | undefined;
  readonly #workerId: string;

  constructor(options: EventDeliveryRuntimeOptions) {
    super(options);
    this.#claimLimit = options.claimLimit ?? DEFAULT_CLAIM_LIMIT;
    this.#leaseMilliseconds = options.leaseMilliseconds ?? DEFAULT_LEASE_MILLISECONDS;
    assertPositiveInteger(this.#claimLimit, "Event Delivery claim limit");
    assertPositiveInteger(this.#leaseMilliseconds, "Event Delivery lease milliseconds");
    assertNonEmpty(options.workerId, "Event Delivery worker ID");
    this.#logger = options.logger;
    this.#metrics = options.metrics;
    this.#onError = options.onError ?? (() => undefined);
    this.#registry = options.registry;
    this.#repository = options.repository;
    this.#retryPolicy = options.retryPolicy ?? {};
    this.#target = options.target;
    this.#targetType = options.targetType;
    this.#workerId = options.workerId;
  }

  override async runOnce(): Promise<number> {
    const now = this.clock();
    await this.#repository.recoverExpiredLeases({ limit: this.#claimLimit, now });
    const claimed = await this.#repository.claimDeliveries({
      limit: this.#claimLimit,
      lockedUntil: new Date(now.getTime() + this.#leaseMilliseconds),
      now,
      ...(this.#target === undefined ? {} : { target: this.#target }),
      ...(this.#targetType === undefined ? {} : { targetType: this.#targetType }),
      workerId: this.#workerId,
    });
    for (const delivery of claimed) {
      await this.#deliver(delivery);
    }
    return claimed.length;
  }

  protected override onLoopError(error: unknown): void {
    this.#onError(error);
  }

  async #deliver(delivery: EventDeliveryRecord): Promise<void> {
    const target = this.#registry.getDeliveryTarget(
      delivery.event.eventType,
      delivery.deliveryTargetType,
      delivery.deliveryTarget,
    );
    const now = this.clock();
    if (!target) {
      await this.#repository.settleDeliveryFailure({
        deadLetterReason: "Event delivery target is not registered",
        errorCode: "EVENT_DELIVERY_TARGET_NOT_FOUND",
        errorMessage: `No Event delivery target registered for ${delivery.deliveryTarget}`,
        id: delivery.id,
        now,
        retryOutcome: "dead_letter",
        workerId: this.#workerId,
      });
      this.#metrics?.incrementCounter("event_delivery_failed_count", {
        delivery_target_type: delivery.deliveryTargetType,
        event_type: delivery.event.eventType,
      });
      this.#metrics?.incrementCounter("event_dead_letter_count", { failure_stage: "deliver" });
      this.#logger?.warn("event.delivery.failed", {
        error_code: "EVENT_DELIVERY_TARGET_NOT_FOUND",
        event_id: delivery.eventId,
        event_type: delivery.event.eventType,
        request_trace_id: delivery.requestTraceId,
      });
      return;
    }

    try {
      const responseSummary = await target.deliver({
        attemptCount: delivery.attemptCount,
        deliveryId: delivery.id,
        event: delivery.event,
        requestTraceId: delivery.requestTraceId,
        target,
      });
      await this.#repository.markDeliverySucceeded({
        id: delivery.id,
        now: this.clock(),
        responseSummary: responseSummary ?? null,
        workerId: this.#workerId,
      });
      this.#logger?.info("event.delivery.succeeded", {
        event_id: delivery.eventId,
        event_type: delivery.event.eventType,
        request_trace_id: delivery.requestTraceId,
      });
    } catch (error) {
      const decision = evaluateEventRetry(
        {
          attemptCount: delivery.attemptCount,
          maxAttempts: delivery.maxAttempts,
          now,
          retryable: true,
        },
        this.#retryPolicy,
      );
      await this.#repository.settleDeliveryFailure({
        ...(decision.outcome === "retry"
          ? { nextRetryAt: decision.nextRetryAt, retryOutcome: "retry" as const }
          : { deadLetterReason: decision.deadLetterReason, retryOutcome: "dead_letter" as const }),
        errorCode: "EVENT_DELIVERY_FAILED",
        errorMessage: toSafeErrorMessage(error),
        id: delivery.id,
        now,
        responseSummary: { target: delivery.deliveryTarget },
        workerId: this.#workerId,
      });
      this.#metrics?.incrementCounter("event_delivery_failed_count", {
        delivery_target_type: delivery.deliveryTargetType,
        event_type: delivery.event.eventType,
      });
      if (decision.outcome === "dead_letter") {
        this.#metrics?.incrementCounter("event_dead_letter_count", { failure_stage: "deliver" });
      }
      this.#logger?.warn("event.delivery.failed", {
        error_code: "EVENT_DELIVERY_FAILED",
        event_id: delivery.eventId,
        event_type: delivery.event.eventType,
        request_trace_id: delivery.requestTraceId,
      });
      this.#onError(error, delivery);
    }
  }
}

export type EventJobBridgeFactory = (event: EventEnvelope) => CreateJobInput | null | undefined;

export type EventJobBridgeRepository = Pick<PrismaJobRepository, "createJob">;

export function createEventJobBridgeHandler(
  repository: EventJobBridgeRepository,
  factory: EventJobBridgeFactory,
): (context: Readonly<{ event: EventEnvelope }>) => Promise<void> {
  return async (context) => {
    const job = factory(context.event);
    if (!job) return;
    await repository.createJob(job);
  };
}

export function eventPayload<T extends EventJson>(event: EventEnvelope): T | null {
  return event.payload as T | null;
}
