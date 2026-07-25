import { randomUUID } from "node:crypto";
import {
  type ClaimedJob,
  type FailedAttemptSettlement,
  type JobJson,
  type PrismaJobRepository,
} from "./prisma-job-repository.js";
import { evaluateJobRetry, type JobRetryPolicy } from "./job-retry-engine.js";

export type JobWorkerState = "stopped" | "running" | "stopping";

export type JobExecutionContext = Readonly<{
  attemptId: string;
  attemptNo: number;
  jobId: string;
  jobKey: string;
  jobType: string;
  leaseExpiresAt: Date;
  maxAttempts: number;
  payload: JobJson | null;
  requestTraceId: string;
  targetObjectId: string | null;
  targetObjectType: string | null;
  workerId: string;
}>;

export type JobHandler = (context: JobExecutionContext) => Promise<void> | void;

export type JobHandlerRegistry =
  ReadonlyMap<string, JobHandler> | Readonly<Record<string, JobHandler>>;

export type JobWorkerRepository = Pick<
  PrismaJobRepository,
  "claimJobs" | "markSucceeded" | "settleFailedAttempt"
>;

export type JobWorkerRuntimeOptions = Readonly<{
  claimLimit?: number;
  clock?: () => Date;
  handlers: JobHandlerRegistry;
  leaseMilliseconds?: number;
  onError?: (error: unknown, context?: JobExecutionContext) => void;
  pollIntervalMilliseconds?: number;
  repository: JobWorkerRepository;
  retryPolicy?: JobRetryPolicy;
  sleep?: (milliseconds: number, signal: AbortSignal) => Promise<void>;
  workerId: string;
}>;

const DEFAULT_CLAIM_LIMIT = 1;
const DEFAULT_LEASE_MILLISECONDS = 5 * 60 * 1_000;
const DEFAULT_POLL_INTERVAL_MILLISECONDS = 1_000;
const MAX_ERROR_MESSAGE_LENGTH = 1_000;

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new TypeError(`${name} must be a positive safe integer`);
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

function getHandler(registry: JobHandlerRegistry, jobType: string): JobHandler | undefined {
  if (registry instanceof Map) return registry.get(jobType);
  return (registry as Readonly<Record<string, JobHandler>>)[jobType];
}

function toSafeErrorMessage(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Unknown Job handler error";
  return message.slice(0, MAX_ERROR_MESSAGE_LENGTH);
}

function toExecutionContext(claimed: ClaimedJob, workerId: string): JobExecutionContext {
  return {
    attemptId: claimed.attempt.id,
    attemptNo: claimed.attempt.attemptNo,
    jobId: claimed.job.id,
    jobKey: claimed.job.jobKey,
    jobType: claimed.job.jobType,
    leaseExpiresAt: claimed.attempt.leaseExpiresAt,
    maxAttempts: claimed.job.maxAttempts,
    payload: claimed.job.payload,
    requestTraceId: claimed.attempt.requestTraceId,
    targetObjectId: claimed.job.targetObjectId,
    targetObjectType: claimed.job.targetObjectType,
    workerId,
  };
}

export class JobWorkerRuntime {
  readonly #claimLimit: number;
  readonly #clock: () => Date;
  readonly #handlers: JobHandlerRegistry;
  readonly #leaseMilliseconds: number;
  readonly #onError: (error: unknown, context?: JobExecutionContext) => void;
  readonly #pollIntervalMilliseconds: number;
  readonly #repository: JobWorkerRepository;
  readonly #retryPolicy: JobRetryPolicy;
  readonly #sleep: (milliseconds: number, signal: AbortSignal) => Promise<void>;
  readonly #workerId: string;
  #abortController: AbortController | null = null;
  #loopPromise: Promise<void> | null = null;
  #state: JobWorkerState = "stopped";

  constructor(options: JobWorkerRuntimeOptions) {
    this.#claimLimit = options.claimLimit ?? DEFAULT_CLAIM_LIMIT;
    this.#leaseMilliseconds = options.leaseMilliseconds ?? DEFAULT_LEASE_MILLISECONDS;
    this.#pollIntervalMilliseconds =
      options.pollIntervalMilliseconds ?? DEFAULT_POLL_INTERVAL_MILLISECONDS;

    assertPositiveInteger(this.#claimLimit, "Job Worker claim limit");
    assertPositiveInteger(this.#leaseMilliseconds, "Job Worker lease milliseconds");
    assertPositiveInteger(this.#pollIntervalMilliseconds, "Job Worker poll interval milliseconds");
    if (options.workerId.trim().length === 0) {
      throw new TypeError("Job Worker ID must not be empty");
    }

    this.#clock = options.clock ?? (() => new Date());
    this.#handlers = options.handlers;
    this.#onError = options.onError ?? (() => undefined);
    this.#repository = options.repository;
    this.#retryPolicy = options.retryPolicy ?? {};
    this.#sleep = options.sleep ?? defaultSleep;
    this.#workerId = options.workerId;
  }

  get state(): JobWorkerState {
    return this.#state;
  }

  get workerId(): string {
    return this.#workerId;
  }

  start(): void {
    if (this.#state === "running") return;
    if (this.#state === "stopping") {
      throw new Error("Job Worker is stopping and cannot be started");
    }

    const abortController = new AbortController();
    this.#abortController = abortController;
    this.#state = "running";
    this.#loopPromise = this.#runLoop(abortController.signal).finally(() => {
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

  async runOnce(): Promise<number> {
    const now = this.#clock();
    const lockedUntil = new Date(now.getTime() + this.#leaseMilliseconds);
    const claimedJobs = await this.#repository.claimJobs({
      limit: this.#claimLimit,
      lockedUntil,
      now,
      requestTraceId: randomUUID(),
      workerId: this.#workerId,
    });

    for (const claimedJob of claimedJobs) {
      await this.#executeClaimedJob(claimedJob);
    }

    return claimedJobs.length;
  }

  async #runLoop(signal: AbortSignal): Promise<void> {
    while (this.#state === "running" && !signal.aborted) {
      try {
        const consumed = await this.runOnce();
        if (consumed === 0 && this.#state === "running" && !signal.aborted) {
          await this.#sleep(this.#pollIntervalMilliseconds, signal);
        }
      } catch (error) {
        this.#onError(error);
        if (this.#state === "running" && !signal.aborted) {
          await this.#sleep(this.#pollIntervalMilliseconds, signal);
        }
      }
    }
  }

  async #executeClaimedJob(claimedJob: ClaimedJob): Promise<void> {
    const context = toExecutionContext(claimedJob, this.#workerId);
    const handler = getHandler(this.#handlers, claimedJob.job.jobType);
    if (!handler) {
      await this.#markFailed(context, {
        errorCode: "JOB_HANDLER_NOT_FOUND",
        errorMessage: `No Job handler registered for ${claimedJob.job.jobType}`,
        retryable: false,
      });
      return;
    }

    try {
      await handler(context);
      await this.#repository.markSucceeded({
        attemptId: context.attemptId,
        jobId: context.jobId,
        now: this.#clock(),
        workerId: this.#workerId,
      });
    } catch (error) {
      await this.#markFailed(context, {
        errorCode: "JOB_HANDLER_FAILED",
        errorMessage: toSafeErrorMessage(error),
        retryable: true,
      });
      this.#onError(error, context);
    }
  }

  async #markFailed(
    context: JobExecutionContext,
    failure: Readonly<{ errorCode: string; errorMessage: string | null; retryable: boolean }>,
  ): Promise<FailedAttemptSettlement | null> {
    try {
      const now = this.#clock();
      const decision = evaluateJobRetry(
        {
          attemptCount: context.attemptNo,
          attemptNo: context.attemptNo,
          maxAttempts: context.maxAttempts,
          now,
          retryable: failure.retryable,
        },
        this.#retryPolicy,
      );

      return await this.#repository.settleFailedAttempt({
        attemptId: context.attemptId,
        errorCode: failure.errorCode,
        errorMessage: failure.errorMessage,
        jobId: context.jobId,
        now,
        ...(decision.outcome === "retry"
          ? {
              nextRetryAt: decision.nextRetryAt,
              retryOutcome: "retry" as const,
            }
          : {
              deadLetterReason: decision.deadLetterReason,
              retryOutcome: "dead_letter" as const,
            }),
        workerId: this.#workerId,
      });
    } catch (error) {
      this.#onError(error, context);
      return null;
    }
  }
}
