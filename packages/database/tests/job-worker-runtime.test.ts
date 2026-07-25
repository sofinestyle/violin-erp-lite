import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  JobWorkerRuntime,
  type ClaimedJob,
  type JobHandler,
  type JobWorkerRepository,
} from "../src";

const NOW = new Date("2026-07-25T10:00:00.000Z");
const LEASE_UNTIL = new Date("2026-07-25T10:05:00.000Z");

function claimedJob(overrides: Partial<ClaimedJob["job"]> = {}): ClaimedJob {
  const jobId = randomUUID();
  const requestTraceId = randomUUID();
  return {
    attempt: {
      attemptNo: 1,
      createdAt: NOW,
      durationMs: null,
      endedAt: null,
      errorCode: null,
      errorDetail: null,
      errorMessage: null,
      id: randomUUID(),
      jobId,
      leaseExpiresAt: LEASE_UNTIL,
      requestTraceId,
      startedAt: NOW,
      status: "running",
      workerId: "worker-1",
    },
    job: {
      attemptCount: 1,
      availableAt: NOW,
      cancelledAt: null,
      completedAt: null,
      createdAt: NOW,
      createdBy: null,
      id: jobId,
      idempotencyRecordId: null,
      jobKey: "job-key",
      jobType: "test.job",
      lastErrorCode: null,
      lastErrorMessage: null,
      lockedBy: "worker-1",
      lockedUntil: LEASE_UNTIL,
      maxAttempts: 1,
      payload: { ok: true },
      priority: 0,
      requestTraceId,
      scheduledAt: NOW,
      startedAt: NOW,
      status: "running",
      targetObjectId: null,
      targetObjectType: null,
      updatedAt: NOW,
      updatedBy: null,
      ...overrides,
    },
  };
}

function createRepository(claimedJobs: ClaimedJob[] = []): JobWorkerRepository {
  return {
    claimJobs: vi.fn().mockResolvedValue(claimedJobs),
    markSucceeded: vi.fn().mockResolvedValue(null),
    settleFailedAttempt: vi.fn().mockResolvedValue(null),
  };
}

describe("Job Worker Runtime", () => {
  it("starts a Worker instance and claims executable Jobs", async () => {
    const repository = createRepository([]);
    const sleep = vi.fn().mockImplementation(() => Promise.resolve());
    const worker = new JobWorkerRuntime({
      clock: () => NOW,
      handlers: {},
      pollIntervalMilliseconds: 1,
      repository,
      sleep,
      workerId: "worker-1",
    });

    worker.start();
    await Promise.resolve();
    await worker.stop();

    expect(worker.state).toBe("stopped");
    expect(repository.claimJobs).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 1,
        lockedUntil: LEASE_UNTIL,
        now: NOW,
        workerId: "worker-1",
      }),
    );
  });

  it("consumes claimed Jobs and passes execution context to the registered Handler", async () => {
    const claimed = claimedJob({
      targetObjectId: "attachment-1",
      targetObjectType: "attachment",
    });
    const repository = createRepository([claimed]);
    const handler = vi.fn<JobHandler>().mockResolvedValue(undefined);
    const worker = new JobWorkerRuntime({
      clock: () => NOW,
      handlers: { "test.job": handler },
      repository,
      workerId: "worker-1",
    });

    await expect(worker.runOnce()).resolves.toBe(1);

    expect(handler).toHaveBeenCalledWith({
      attemptId: claimed.attempt.id,
      attemptNo: 1,
      jobId: claimed.job.id,
      jobKey: "job-key",
      jobType: "test.job",
      leaseExpiresAt: LEASE_UNTIL,
      maxAttempts: 1,
      payload: { ok: true },
      requestTraceId: claimed.attempt.requestTraceId,
      targetObjectId: "attachment-1",
      targetObjectType: "attachment",
      workerId: "worker-1",
    });
  });

  it("marks a Job as succeeded when the Handler completes", async () => {
    const claimed = claimedJob();
    const repository = createRepository([claimed]);
    const worker = new JobWorkerRuntime({
      clock: () => NOW,
      handlers: { "test.job": vi.fn<JobHandler>().mockResolvedValue(undefined) },
      repository,
      workerId: "worker-1",
    });

    await worker.runOnce();

    expect(repository.markSucceeded).toHaveBeenCalledWith({
      attemptId: claimed.attempt.id,
      jobId: claimed.job.id,
      now: NOW,
      workerId: "worker-1",
    });
    expect(repository.settleFailedAttempt).not.toHaveBeenCalled();
  });

  it("captures retryable Handler failures and schedules a Retry when attempts remain", async () => {
    const claimed = claimedJob({ maxAttempts: 2 });
    const repository = createRepository([claimed]);
    const onError = vi.fn();
    const worker = new JobWorkerRuntime({
      clock: () => NOW,
      handlers: {
        "test.job": vi.fn<JobHandler>().mockRejectedValue(new Error("handler exploded")),
      },
      onError,
      retryPolicy: { baseDelayMilliseconds: 1_000, maxDelayMilliseconds: 60_000 },
      repository,
      workerId: "worker-1",
    });

    await worker.runOnce();

    expect(repository.settleFailedAttempt).toHaveBeenCalledWith({
      attemptId: claimed.attempt.id,
      errorCode: "JOB_HANDLER_FAILED",
      errorMessage: "handler exploded",
      jobId: claimed.job.id,
      nextRetryAt: new Date(NOW.getTime() + 1_000),
      now: NOW,
      retryOutcome: "retry",
      workerId: "worker-1",
    });
    expect(repository.markSucceeded).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ jobId: claimed.job.id }),
    );
  });

  it("moves a Job to Dead Letter when no Handler is registered", async () => {
    const claimed = claimedJob({ jobType: "missing.job" });
    const repository = createRepository([claimed]);
    const worker = new JobWorkerRuntime({
      clock: () => NOW,
      handlers: {},
      repository,
      workerId: "worker-1",
    });

    await worker.runOnce();

    expect(repository.settleFailedAttempt).toHaveBeenCalledWith({
      attemptId: claimed.attempt.id,
      deadLetterReason: "Job failure is not retryable",
      errorCode: "JOB_HANDLER_NOT_FOUND",
      errorMessage: "No Job handler registered for missing.job",
      jobId: claimed.job.id,
      now: NOW,
      retryOutcome: "dead_letter",
      workerId: "worker-1",
    });
  });

  it("waits for the running Handler before graceful shutdown completes", async () => {
    const claimed = claimedJob();
    const repository = createRepository([claimed]);
    let releaseHandler!: () => void;
    const handlerStarted = vi.fn();
    const handler = vi.fn<JobHandler>().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          handlerStarted();
          releaseHandler = resolve;
        }),
    );
    const worker = new JobWorkerRuntime({
      clock: () => NOW,
      handlers: { "test.job": handler },
      pollIntervalMilliseconds: 1,
      repository,
      workerId: "worker-1",
    });

    worker.start();
    await vi.waitUntil(() => handlerStarted.mock.calls.length > 0);
    const stopPromise = worker.stop();
    await Promise.resolve();

    expect(worker.state).toBe("stopping");
    releaseHandler();
    await stopPromise;

    expect(worker.state).toBe("stopped");
    expect(repository.markSucceeded).toHaveBeenCalledWith(
      expect.objectContaining({
        attemptId: claimed.attempt.id,
        jobId: claimed.job.id,
      }),
    );
  });
});
