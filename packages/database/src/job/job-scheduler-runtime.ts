import { randomUUID } from "node:crypto";
import {
  type CreateJobInput,
  type JobRecord,
  type PrismaJobRepository,
  type SchedulerLockRecord,
} from "./prisma-job-repository.js";

export type JobSchedulerState = "stopped" | "running" | "stopping";

export type SchedulerJobFactoryContext = Readonly<{
  lockKey: string;
  now: Date;
  requestTraceId: string;
  ruleId: string;
  schedulerId: string;
}>;

export type SchedulerJobFactoryResult =
  CreateJobInput | readonly CreateJobInput[] | null | undefined;

export type SchedulerRule = Readonly<{
  createJobs: (
    context: SchedulerJobFactoryContext,
  ) => Promise<SchedulerJobFactoryResult> | SchedulerJobFactoryResult;
  intervalMilliseconds: number;
  lockKey?: string;
  ruleId: string;
}>;

export type JobSchedulerRepository = Pick<
  PrismaJobRepository,
  "acquireSchedulerLock" | "createJob" | "releaseSchedulerLock"
>;

export type JobSchedulerRuntimeOptions = Readonly<{
  clock?: () => Date;
  lockLeaseMilliseconds?: number;
  onError?: (error: unknown, context?: SchedulerJobFactoryContext) => void;
  repository: JobSchedulerRepository;
  rules: readonly SchedulerRule[];
  schedulerId: string;
  sleep?: (milliseconds: number, signal: AbortSignal) => Promise<void>;
  tickIntervalMilliseconds?: number;
}>;

const DEFAULT_LOCK_LEASE_MILLISECONDS = 60_000;
const DEFAULT_TICK_INTERVAL_MILLISECONDS = 1_000;

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

function normalizeJobs(result: SchedulerJobFactoryResult): readonly CreateJobInput[] {
  if (!result) return [];
  if (Array.isArray(result)) return result as readonly CreateJobInput[];
  return [result as CreateJobInput];
}

function schedulerLockKey(rule: SchedulerRule): string {
  return rule.lockKey ?? `scheduler:${rule.ruleId}`;
}

export class JobSchedulerRuntime {
  readonly #clock: () => Date;
  readonly #lockLeaseMilliseconds: number;
  readonly #nextRunAtByRuleId = new Map<string, Date>();
  readonly #onError: (error: unknown, context?: SchedulerJobFactoryContext) => void;
  readonly #repository: JobSchedulerRepository;
  readonly #rules: readonly SchedulerRule[];
  readonly #schedulerId: string;
  readonly #sleep: (milliseconds: number, signal: AbortSignal) => Promise<void>;
  readonly #tickIntervalMilliseconds: number;
  #abortController: AbortController | null = null;
  #loopPromise: Promise<void> | null = null;
  #state: JobSchedulerState = "stopped";

  constructor(options: JobSchedulerRuntimeOptions) {
    this.#lockLeaseMilliseconds = options.lockLeaseMilliseconds ?? DEFAULT_LOCK_LEASE_MILLISECONDS;
    this.#tickIntervalMilliseconds =
      options.tickIntervalMilliseconds ?? DEFAULT_TICK_INTERVAL_MILLISECONDS;

    assertPositiveInteger(this.#lockLeaseMilliseconds, "Job Scheduler Lock lease milliseconds");
    assertPositiveInteger(
      this.#tickIntervalMilliseconds,
      "Job Scheduler tick interval milliseconds",
    );
    if (options.schedulerId.trim().length === 0) {
      throw new TypeError("Job Scheduler ID must not be empty");
    }
    for (const rule of options.rules) {
      assertPositiveInteger(rule.intervalMilliseconds, "Job Scheduler rule interval milliseconds");
      if (rule.ruleId.trim().length === 0) {
        throw new TypeError("Job Scheduler rule ID must not be empty");
      }
    }

    this.#clock = options.clock ?? (() => new Date());
    this.#onError = options.onError ?? (() => undefined);
    this.#repository = options.repository;
    this.#rules = options.rules;
    this.#schedulerId = options.schedulerId;
    this.#sleep = options.sleep ?? defaultSleep;
  }

  get schedulerId(): string {
    return this.#schedulerId;
  }

  get state(): JobSchedulerState {
    return this.#state;
  }

  start(): void {
    if (this.#state === "running") return;
    if (this.#state === "stopping") {
      throw new Error("Job Scheduler is stopping and cannot be started");
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

  async runOnce(): Promise<readonly JobRecord[]> {
    const createdJobs: JobRecord[] = [];
    const now = this.#clock();

    for (const rule of this.#rules) {
      if (!this.#isRuleDue(rule, now)) continue;
      this.#nextRunAtByRuleId.set(rule.ruleId, new Date(now.getTime() + rule.intervalMilliseconds));
      const ruleJobs = await this.#triggerRule(rule, now);
      createdJobs.push(...ruleJobs);
    }

    return createdJobs;
  }

  async #runLoop(signal: AbortSignal): Promise<void> {
    while (this.#state === "running" && !signal.aborted) {
      try {
        await this.runOnce();
      } catch (error) {
        this.#onError(error);
      }

      if (this.#state === "running" && !signal.aborted) {
        await this.#sleep(this.#tickIntervalMilliseconds, signal);
      }
    }
  }

  #isRuleDue(rule: SchedulerRule, now: Date): boolean {
    const nextRunAt = this.#nextRunAtByRuleId.get(rule.ruleId);
    return !nextRunAt || nextRunAt <= now;
  }

  async #triggerRule(rule: SchedulerRule, now: Date): Promise<readonly JobRecord[]> {
    const lockKey = schedulerLockKey(rule);
    const context: SchedulerJobFactoryContext = {
      lockKey,
      now,
      requestTraceId: randomUUID(),
      ruleId: rule.ruleId,
      schedulerId: this.#schedulerId,
    };
    const lock = await this.#acquireLock(lockKey, now);
    if (!lock) return [];

    try {
      const jobs = normalizeJobs(await rule.createJobs(context));
      const createdJobs: JobRecord[] = [];
      for (const job of jobs) {
        createdJobs.push(await this.#repository.createJob(job));
      }
      return createdJobs;
    } catch (error) {
      this.#onError(error, context);
      return [];
    } finally {
      await this.#releaseLock(lock, this.#clock(), context);
    }
  }

  async #acquireLock(lockKey: string, now: Date): Promise<SchedulerLockRecord | null> {
    return this.#repository.acquireSchedulerLock({
      lockedUntil: new Date(now.getTime() + this.#lockLeaseMilliseconds),
      lockKey,
      now,
      ownerId: this.#schedulerId,
    });
  }

  async #releaseLock(
    lock: SchedulerLockRecord,
    now: Date,
    context: SchedulerJobFactoryContext,
  ): Promise<void> {
    try {
      await this.#repository.releaseSchedulerLock({
        lockKey: lock.lockKey,
        now,
        ownerId: this.#schedulerId,
      });
    } catch (error) {
      this.#onError(error, context);
    }
  }
}
