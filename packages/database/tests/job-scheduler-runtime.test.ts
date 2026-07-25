import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  JobSchedulerRuntime,
  type CreateJobInput,
  type JobRecord,
  type JobSchedulerRepository,
  type SchedulerLockRecord,
  type SchedulerRule,
} from "../src";

const NOW = new Date("2026-07-25T10:00:00.000Z");
const LOCKED_UNTIL = new Date("2026-07-25T10:01:00.000Z");

function schedulerLock(overrides: Partial<SchedulerLockRecord> = {}): SchedulerLockRecord {
  return {
    createdAt: NOW,
    id: randomUUID(),
    lastAcquiredAt: NOW,
    lockedUntil: LOCKED_UNTIL,
    lockKey: "scheduler:test",
    ownerId: "scheduler-1",
    releasedAt: null,
    updatedAt: NOW,
    ...overrides,
  };
}

function createJobInput(overrides: Partial<CreateJobInput> = {}): CreateJobInput {
  return {
    availableAt: NOW,
    jobKey: "test.job:2026-07-25T10:00:00.000Z",
    jobType: "test.job",
    maxAttempts: 1,
    now: NOW,
    payload: { scheduled: true },
    requestTraceId: randomUUID(),
    scheduledAt: NOW,
    ...overrides,
  };
}

function jobRecord(input: CreateJobInput): JobRecord {
  return {
    attemptCount: 0,
    availableAt: input.availableAt,
    cancelledAt: null,
    completedAt: null,
    createdAt: input.now ?? NOW,
    createdBy: input.createdBy ?? null,
    id: randomUUID(),
    idempotencyRecordId: input.idempotencyRecordId ?? null,
    jobKey: input.jobKey,
    jobType: input.jobType,
    lastErrorCode: null,
    lastErrorMessage: null,
    lockedBy: null,
    lockedUntil: null,
    maxAttempts: input.maxAttempts,
    payload: input.payload ?? null,
    priority: input.priority ?? 0,
    requestTraceId: input.requestTraceId,
    scheduledAt: input.scheduledAt,
    startedAt: null,
    status: "pending",
    targetObjectId: input.targetObjectId ?? null,
    targetObjectType: input.targetObjectType ?? null,
    updatedAt: input.now ?? NOW,
    updatedBy: input.createdBy ?? null,
  };
}

function createRepository(lock: SchedulerLockRecord | null): JobSchedulerRepository {
  return {
    acquireSchedulerLock: vi.fn().mockResolvedValue(lock),
    createJob: vi
      .fn()
      .mockImplementation((input: CreateJobInput) => Promise.resolve(jobRecord(input))),
    releaseSchedulerLock: vi.fn().mockResolvedValue(lock),
  };
}

function rule(jobInput: CreateJobInput = createJobInput()): SchedulerRule {
  return {
    createJobs: vi.fn().mockReturnValue(jobInput),
    intervalMilliseconds: 60_000,
    lockKey: "scheduler:test",
    ruleId: "test",
  };
}

describe("Job Scheduler Runtime", () => {
  it("starts a Scheduler instance and runs the timed trigger loop", async () => {
    const repository = createRepository(null);
    const sleep = vi.fn().mockImplementation(() => Promise.resolve());
    const scheduler = new JobSchedulerRuntime({
      clock: () => NOW,
      repository,
      rules: [rule()],
      schedulerId: "scheduler-1",
      sleep,
      tickIntervalMilliseconds: 1,
    });

    scheduler.start();
    await Promise.resolve();
    await scheduler.stop();

    expect(scheduler.state).toBe("stopped");
    expect(repository.acquireSchedulerLock).toHaveBeenCalledWith({
      lockedUntil: LOCKED_UNTIL,
      lockKey: "scheduler:test",
      now: NOW,
      ownerId: "scheduler-1",
    });
  });

  it("creates Jobs from Scheduler rules after acquiring the Scheduler Lock", async () => {
    const lock = schedulerLock();
    const jobInput = createJobInput();
    const repository = createRepository(lock);
    const schedulerRule = rule(jobInput);
    const scheduler = new JobSchedulerRuntime({
      clock: () => NOW,
      repository,
      rules: [schedulerRule],
      schedulerId: "scheduler-1",
    });

    await expect(scheduler.runOnce()).resolves.toMatchObject([
      {
        jobKey: "test.job:2026-07-25T10:00:00.000Z",
        jobType: "test.job",
        status: "pending",
      },
    ]);

    expect(schedulerRule.createJobs).toHaveBeenCalledWith(
      expect.objectContaining({
        lockKey: "scheduler:test",
        now: NOW,
        ruleId: "test",
        schedulerId: "scheduler-1",
      }),
    );
    expect(repository.createJob).toHaveBeenCalledWith(jobInput);
    expect(repository.releaseSchedulerLock).toHaveBeenCalledWith({
      lockKey: "scheduler:test",
      now: NOW,
      ownerId: "scheduler-1",
    });
  });

  it("skips Job creation when another Scheduler owns the Lock", async () => {
    const repository = createRepository(null);
    const schedulerRule = rule();
    const scheduler = new JobSchedulerRuntime({
      clock: () => NOW,
      repository,
      rules: [schedulerRule],
      schedulerId: "scheduler-1",
    });

    await expect(scheduler.runOnce()).resolves.toEqual([]);

    expect(schedulerRule.createJobs).not.toHaveBeenCalled();
    expect(repository.createJob).not.toHaveBeenCalled();
    expect(repository.releaseSchedulerLock).not.toHaveBeenCalled();
  });

  it("does not create duplicate Jobs within the same in-memory interval window", async () => {
    const repository = createRepository(schedulerLock());
    const schedulerRule = rule();
    const scheduler = new JobSchedulerRuntime({
      clock: () => NOW,
      repository,
      rules: [schedulerRule],
      schedulerId: "scheduler-1",
    });

    await scheduler.runOnce();
    await scheduler.runOnce();

    expect(repository.createJob).toHaveBeenCalledTimes(1);
  });

  it("waits for the running Scheduler rule before graceful shutdown completes", async () => {
    const repository = createRepository(schedulerLock());
    let releaseRule!: () => void;
    const ruleStarted = vi.fn();
    const schedulerRule: SchedulerRule = {
      createJobs: vi.fn().mockImplementation(
        () =>
          new Promise<CreateJobInput>((resolve) => {
            ruleStarted();
            releaseRule = () => resolve(createJobInput());
          }),
      ),
      intervalMilliseconds: 60_000,
      lockKey: "scheduler:test",
      ruleId: "test",
    };
    const scheduler = new JobSchedulerRuntime({
      clock: () => NOW,
      repository,
      rules: [schedulerRule],
      schedulerId: "scheduler-1",
      tickIntervalMilliseconds: 1,
    });

    scheduler.start();
    await vi.waitUntil(() => ruleStarted.mock.calls.length > 0);
    const stopPromise = scheduler.stop();
    await Promise.resolve();

    expect(scheduler.state).toBe("stopping");
    releaseRule();
    await stopPromise;

    expect(scheduler.state).toBe("stopped");
    expect(repository.createJob).toHaveBeenCalledOnce();
    expect(repository.releaseSchedulerLock).toHaveBeenCalledWith(
      expect.objectContaining({
        lockKey: "scheduler:test",
        ownerId: "scheduler-1",
      }),
    );
  });
});
