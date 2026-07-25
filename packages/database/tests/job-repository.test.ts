import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { Prisma, type PrismaClient } from "../src/generated/prisma/client";
import { PrismaJobRepository } from "../src/job/prisma-job-repository";

const NOW = new Date("2026-07-25T10:00:00.000Z");
const LEASE_UNTIL = new Date("2026-07-25T10:05:00.000Z");

function jobRow(overrides: Record<string, unknown> = {}) {
  return {
    attempt_count: 0,
    available_at: NOW,
    cancelled_at: null,
    completed_at: null,
    created_at: NOW,
    created_by: null,
    id: randomUUID(),
    idempotency_record_id: null,
    job_key: "job-key",
    job_type: "test.job",
    last_error_code: null,
    last_error_message: null,
    locked_by: null,
    locked_until: null,
    max_attempts: 1,
    payload: { ok: true },
    priority: 0,
    request_trace_id: randomUUID(),
    scheduled_at: NOW,
    started_at: null,
    status: "pending",
    target_object_id: null,
    target_object_type: null,
    updated_at: NOW,
    updated_by: null,
    ...overrides,
  };
}

function attemptRow(overrides: Record<string, unknown> = {}) {
  return {
    attempt_no: 1,
    created_at: NOW,
    duration_ms: null,
    ended_at: null,
    error_code: null,
    error_detail: null,
    error_message: null,
    id: randomUUID(),
    job_id: randomUUID(),
    lease_expires_at: LEASE_UNTIL,
    request_trace_id: randomUUID(),
    started_at: NOW,
    status: "running",
    worker_id: "worker-1",
    ...overrides,
  };
}

function schedulerLockRow(overrides: Record<string, unknown> = {}) {
  return {
    created_at: NOW,
    id: randomUUID(),
    last_acquired_at: NOW,
    locked_until: LEASE_UNTIL,
    lock_key: "scheduler:test",
    owner_id: "scheduler-1",
    released_at: null,
    updated_at: NOW,
    ...overrides,
  };
}

function auditLogCreate() {
  return vi.fn().mockResolvedValue({ id: randomUUID() });
}

describe("Prisma Job repository", () => {
  it("creates a pending Job using the formal queue fields", async () => {
    const created = jobRow();
    const create = vi.fn().mockResolvedValue(created);
    const repository = new PrismaJobRepository({
      jobs: { create },
    } as unknown as PrismaClient);

    await expect(
      repository.createJob({
        availableAt: NOW,
        jobKey: "job-key",
        jobType: "test.job",
        maxAttempts: 1,
        now: NOW,
        payload: { ok: true },
        requestTraceId: created.request_trace_id,
        scheduledAt: NOW,
      }),
    ).resolves.toMatchObject({
      jobKey: "job-key",
      jobType: "test.job",
      status: "pending",
    });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        available_at: NOW,
        job_key: "job-key",
        job_type: "test.job",
        max_attempts: 1,
        status: "pending",
      }),
    });
  });

  it("writes Job creation Audit entry with safe lifecycle context", async () => {
    const created = jobRow();
    const create = vi.fn().mockResolvedValue(created);
    const createAuditLog = auditLogCreate();
    const repository = new PrismaJobRepository({
      audit_logs: { create: createAuditLog },
      jobs: { create },
    } as unknown as PrismaClient);

    await repository.createJob({
      availableAt: NOW,
      jobKey: "job-key",
      jobType: "test.job",
      maxAttempts: 1,
      now: NOW,
      payload: { ok: true },
      requestTraceId: created.request_trace_id,
      scheduledAt: NOW,
    });

    expect(createAuditLog).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action_code: "job.create",
        module_code: "background_job",
        object_id: created.id,
        object_no_snapshot: "job-key",
        object_type: "job",
        operation_result: "success",
        request_trace_id: created.request_trace_id,
      }),
    });
  });

  it("returns the existing Job when job_type and job_key already exist", async () => {
    const existing = jobRow();
    const create = vi.fn().mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("unique", {
        clientVersion: "7.9.0",
        code: "P2002",
      }),
    );
    const findUnique = vi.fn().mockResolvedValue(existing);
    const repository = new PrismaJobRepository({
      jobs: { create, findUnique },
    } as unknown as PrismaClient);

    await expect(
      repository.createJob({
        availableAt: NOW,
        jobKey: "job-key",
        jobType: "test.job",
        maxAttempts: 1,
        now: NOW,
        requestTraceId: existing.request_trace_id,
        scheduledAt: NOW,
      }),
    ).resolves.toMatchObject({ id: existing.id, status: "pending" });
    expect(findUnique).toHaveBeenCalledWith({
      where: {
        job_type_job_key: {
          job_key: "job-key",
          job_type: "test.job",
        },
      },
    });
  });

  it("claims pending Jobs in one transaction and creates running Attempts", async () => {
    const candidate = { attempt_count: 0, id: randomUUID() };
    const runningJob = jobRow({
      attempt_count: 1,
      id: candidate.id,
      locked_by: "worker-1",
      locked_until: LEASE_UNTIL,
      started_at: NOW,
      status: "running",
    });
    const runningAttempt = attemptRow({
      job_id: candidate.id,
      request_trace_id: runningJob.request_trace_id,
    });
    const transaction = {
      $queryRaw: vi.fn().mockResolvedValue([candidate]),
      job_attempts: { create: vi.fn().mockResolvedValue(runningAttempt) },
      jobs: { update: vi.fn().mockResolvedValue(runningJob) },
    };
    const repository = new PrismaJobRepository({
      $transaction: (callback: (client: typeof transaction) => unknown) => callback(transaction),
    } as unknown as PrismaClient);

    await expect(
      repository.claimJobs({
        limit: 1,
        lockedUntil: LEASE_UNTIL,
        now: NOW,
        requestTraceId: runningJob.request_trace_id,
        workerId: "worker-1",
      }),
    ).resolves.toMatchObject([
      {
        attempt: { attemptNo: 1, status: "running", workerId: "worker-1" },
        job: { id: candidate.id, status: "running" },
      },
    ]);
    expect(transaction.$queryRaw).toHaveBeenCalledOnce();
    expect(transaction.jobs.update).toHaveBeenCalledWith({
      data: expect.objectContaining({
        attempt_count: 1,
        locked_by: "worker-1",
        locked_until: LEASE_UNTIL,
        status: "running",
      }),
      where: { id: candidate.id },
    });
    expect(transaction.job_attempts.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        attempt_no: 1,
        job_id: candidate.id,
        status: "running",
        worker_id: "worker-1",
      }),
    });
  });

  it("claims retrying Jobs and creates a new Attempt record", async () => {
    const candidate = { attempt_count: 1, id: randomUUID() };
    const runningJob = jobRow({
      attempt_count: 2,
      id: candidate.id,
      locked_by: "worker-1",
      locked_until: LEASE_UNTIL,
      started_at: NOW,
      status: "running",
    });
    const runningAttempt = attemptRow({
      attempt_no: 2,
      job_id: candidate.id,
      request_trace_id: runningJob.request_trace_id,
    });
    const transaction = {
      $queryRaw: vi.fn().mockResolvedValue([candidate]),
      job_attempts: { create: vi.fn().mockResolvedValue(runningAttempt) },
      jobs: { update: vi.fn().mockResolvedValue(runningJob) },
    };
    const repository = new PrismaJobRepository({
      $transaction: (callback: (client: typeof transaction) => unknown) => callback(transaction),
    } as unknown as PrismaClient);

    await expect(
      repository.claimJobs({
        limit: 1,
        lockedUntil: LEASE_UNTIL,
        now: NOW,
        requestTraceId: runningJob.request_trace_id,
        workerId: "worker-1",
      }),
    ).resolves.toMatchObject([
      {
        attempt: { attemptNo: 2, status: "running" },
        job: { attemptCount: 2, id: candidate.id, status: "running" },
      },
    ]);
    expect(transaction.job_attempts.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        attempt_no: 2,
        job_id: candidate.id,
        status: "running",
      }),
    });
  });

  it("extends a Lease only for the current running Worker and Attempt", async () => {
    const job = jobRow({ locked_by: "worker-1", locked_until: LEASE_UNTIL, status: "running" });
    const attempt = attemptRow({ job_id: job.id, lease_expires_at: LEASE_UNTIL });
    const transaction = {
      job_attempts: {
        findUnique: vi.fn().mockResolvedValue(attempt),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      jobs: {
        findUnique: vi.fn().mockResolvedValue(job),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const repository = new PrismaJobRepository({
      $transaction: (callback: (client: typeof transaction) => unknown) => callback(transaction),
    } as unknown as PrismaClient);

    await expect(
      repository.extendLease({
        attemptId: attempt.id,
        jobId: job.id,
        lockedUntil: LEASE_UNTIL,
        now: NOW,
        workerId: "worker-1",
      }),
    ).resolves.toMatchObject({
      attempt: { id: attempt.id },
      job: { id: job.id, lockedBy: "worker-1" },
    });
  });

  it("marks a running Job as succeeded and clears the Lease", async () => {
    const attempt = attemptRow();
    const completed = new Date(NOW.getTime() + 1_000);
    const succeededAttempt = {
      ...attempt,
      duration_ms: 1_000,
      ended_at: completed,
      status: "succeeded",
    };
    const succeededJob = jobRow({
      completed_at: completed,
      id: attempt.job_id,
      locked_by: null,
      locked_until: null,
      status: "succeeded",
    });
    const transaction = {
      job_attempts: {
        findUnique: vi.fn().mockResolvedValue(attempt),
        update: vi.fn().mockResolvedValue(succeededAttempt),
      },
      jobs: {
        findUnique: vi.fn().mockResolvedValue(succeededJob),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const repository = new PrismaJobRepository({
      $transaction: (callback: (client: typeof transaction) => unknown) => callback(transaction),
    } as unknown as PrismaClient);

    await expect(
      repository.markSucceeded({
        attemptId: attempt.id,
        jobId: attempt.job_id,
        now: completed,
        workerId: "worker-1",
      }),
    ).resolves.toMatchObject({
      attempt: { status: "succeeded" },
      job: { status: "succeeded", lockedBy: null },
    });
  });

  it("writes Job success lifecycle Audit entries", async () => {
    const attempt = attemptRow();
    const completed = new Date(NOW.getTime() + 1_000);
    const succeededAttempt = {
      ...attempt,
      duration_ms: 1_000,
      ended_at: completed,
      status: "succeeded",
    };
    const succeededJob = jobRow({
      completed_at: completed,
      id: attempt.job_id,
      locked_by: null,
      locked_until: null,
      status: "succeeded",
    });
    const createAuditLog = auditLogCreate();
    const transaction = {
      audit_logs: { create: createAuditLog },
      job_attempts: {
        findUnique: vi.fn().mockResolvedValue(attempt),
        update: vi.fn().mockResolvedValue(succeededAttempt),
      },
      jobs: {
        findUnique: vi.fn().mockResolvedValue(succeededJob),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const repository = new PrismaJobRepository({
      $transaction: (callback: (client: typeof transaction) => unknown) => callback(transaction),
    } as unknown as PrismaClient);

    await repository.markSucceeded({
      attemptId: attempt.id,
      jobId: attempt.job_id,
      now: completed,
      workerId: "worker-1",
    });

    expect(createAuditLog).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action_code: "job.succeeded",
        module_code: "background_job",
        object_id: attempt.job_id,
        object_type: "job",
        operation_result: "success",
        request_trace_id: attempt.request_trace_id,
      }),
    });
    expect(createAuditLog).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action_code: "job_attempt.succeeded",
        object_id: attempt.id,
        object_type: "job_attempt",
        operation_result: "success",
      }),
    });
  });

  it("marks a running Job as failed and records the latest safe error", async () => {
    const attempt = attemptRow();
    const failedAt = new Date(NOW.getTime() + 1_000);
    const failedAttempt = {
      ...attempt,
      duration_ms: 1_000,
      ended_at: failedAt,
      error_code: "JOB_TEST_ERROR",
      error_message: "safe failure",
      status: "failed",
    };
    const failedJob = jobRow({
      completed_at: failedAt,
      id: attempt.job_id,
      last_error_code: "JOB_TEST_ERROR",
      last_error_message: "safe failure",
      locked_by: null,
      locked_until: null,
      status: "failed",
    });
    const transaction = {
      job_attempts: {
        findUnique: vi.fn().mockResolvedValue(attempt),
        update: vi.fn().mockResolvedValue(failedAttempt),
      },
      jobs: {
        findUnique: vi.fn().mockResolvedValue(failedJob),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const repository = new PrismaJobRepository({
      $transaction: (callback: (client: typeof transaction) => unknown) => callback(transaction),
    } as unknown as PrismaClient);

    await expect(
      repository.markFailed({
        attemptId: attempt.id,
        errorCode: "JOB_TEST_ERROR",
        errorMessage: "safe failure",
        jobId: attempt.job_id,
        now: failedAt,
        workerId: "worker-1",
      }),
    ).resolves.toMatchObject({
      attempt: { errorCode: "JOB_TEST_ERROR", status: "failed" },
      job: { lastErrorCode: "JOB_TEST_ERROR", status: "failed" },
    });
  });

  it("writes Job failure Audit entries with safe error context", async () => {
    const attempt = attemptRow();
    const failedAt = new Date(NOW.getTime() + 1_000);
    const failedAttempt = {
      ...attempt,
      duration_ms: 1_000,
      ended_at: failedAt,
      error_code: "JOB_TEST_ERROR",
      error_message: "safe failure",
      status: "failed",
    };
    const failedJob = jobRow({
      completed_at: failedAt,
      id: attempt.job_id,
      last_error_code: "JOB_TEST_ERROR",
      last_error_message: "safe failure",
      locked_by: null,
      locked_until: null,
      status: "failed",
    });
    const createAuditLog = auditLogCreate();
    const transaction = {
      audit_logs: { create: createAuditLog },
      job_attempts: {
        findUnique: vi.fn().mockResolvedValue(attempt),
        update: vi.fn().mockResolvedValue(failedAttempt),
      },
      jobs: {
        findUnique: vi.fn().mockResolvedValue(failedJob),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const repository = new PrismaJobRepository({
      $transaction: (callback: (client: typeof transaction) => unknown) => callback(transaction),
    } as unknown as PrismaClient);

    await repository.markFailed({
      attemptId: attempt.id,
      errorCode: "JOB_TEST_ERROR",
      errorMessage: "safe failure",
      jobId: attempt.job_id,
      now: failedAt,
      workerId: "worker-1",
    });

    expect(createAuditLog).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action_code: "job.failed",
        failure_reason: "safe failure",
        object_id: attempt.job_id,
        object_type: "job",
        operation_result: "failure",
      }),
    });
    expect(createAuditLog).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action_code: "job_attempt.failed",
        failure_reason: "safe failure",
        object_id: attempt.id,
        object_type: "job_attempt",
        operation_result: "failure",
      }),
    });
  });

  it("settles a failed Attempt into retrying and keeps retry history traceable", async () => {
    const attempt = attemptRow();
    const failedAt = new Date(NOW.getTime() + 1_000);
    const nextRetryAt = new Date(NOW.getTime() + 60_000);
    const runningJob = jobRow({
      attempt_count: 1,
      id: attempt.job_id,
      locked_by: "worker-1",
      locked_until: LEASE_UNTIL,
      max_attempts: 3,
      status: "running",
    });
    const failedAttempt = {
      ...attempt,
      duration_ms: 1_000,
      ended_at: failedAt,
      error_code: "JOB_RETRYABLE_FAILURE",
      error_message: "safe retryable failure",
      status: "failed",
    };
    const retryingJob = {
      ...runningJob,
      available_at: nextRetryAt,
      last_error_code: "JOB_RETRYABLE_FAILURE",
      last_error_message: "safe retryable failure",
      locked_by: null,
      locked_until: null,
      status: "retrying",
      updated_at: failedAt,
    };
    const transaction = {
      job_attempts: {
        findUnique: vi.fn().mockResolvedValue(attempt),
        update: vi.fn().mockResolvedValue(failedAttempt),
      },
      job_dead_letters: { create: vi.fn() },
      jobs: {
        findUnique: vi.fn().mockResolvedValue(runningJob),
        update: vi.fn().mockResolvedValue(retryingJob),
      },
    };
    const repository = new PrismaJobRepository({
      $transaction: (callback: (client: typeof transaction) => unknown) => callback(transaction),
    } as unknown as PrismaClient);

    await expect(
      repository.settleFailedAttempt({
        attemptId: attempt.id,
        errorCode: "JOB_RETRYABLE_FAILURE",
        errorMessage: "safe retryable failure",
        jobId: attempt.job_id,
        nextRetryAt,
        now: failedAt,
        retryOutcome: "retry",
        workerId: "worker-1",
      }),
    ).resolves.toMatchObject({
      attempt: { errorCode: "JOB_RETRYABLE_FAILURE", status: "failed" },
      deadLetter: null,
      job: { availableAt: nextRetryAt, lockedBy: null, status: "retrying" },
    });
    expect(transaction.job_attempts.update).toHaveBeenCalledWith({
      data: expect.objectContaining({
        duration_ms: 1_000,
        ended_at: failedAt,
        status: "failed",
      }),
      where: { id: attempt.id },
    });
    expect(transaction.job_dead_letters.create).not.toHaveBeenCalled();
  });

  it("writes Retry Audit entries when a failed Attempt is scheduled again", async () => {
    const attempt = attemptRow();
    const failedAt = new Date(NOW.getTime() + 1_000);
    const nextRetryAt = new Date(NOW.getTime() + 60_000);
    const runningJob = jobRow({
      attempt_count: 1,
      id: attempt.job_id,
      locked_by: "worker-1",
      locked_until: LEASE_UNTIL,
      max_attempts: 3,
      status: "running",
    });
    const failedAttempt = {
      ...attempt,
      duration_ms: 1_000,
      ended_at: failedAt,
      error_code: "JOB_RETRYABLE_FAILURE",
      error_message: "safe retryable failure",
      status: "failed",
    };
    const retryingJob = {
      ...runningJob,
      available_at: nextRetryAt,
      last_error_code: "JOB_RETRYABLE_FAILURE",
      last_error_message: "safe retryable failure",
      locked_by: null,
      locked_until: null,
      status: "retrying",
      updated_at: failedAt,
    };
    const createAuditLog = auditLogCreate();
    const transaction = {
      audit_logs: { create: createAuditLog },
      job_attempts: {
        findUnique: vi.fn().mockResolvedValue(attempt),
        update: vi.fn().mockResolvedValue(failedAttempt),
      },
      job_dead_letters: { create: vi.fn() },
      jobs: {
        findUnique: vi.fn().mockResolvedValue(runningJob),
        update: vi.fn().mockResolvedValue(retryingJob),
      },
    };
    const repository = new PrismaJobRepository({
      $transaction: (callback: (client: typeof transaction) => unknown) => callback(transaction),
    } as unknown as PrismaClient);

    await repository.settleFailedAttempt({
      attemptId: attempt.id,
      errorCode: "JOB_RETRYABLE_FAILURE",
      errorMessage: "safe retryable failure",
      jobId: attempt.job_id,
      nextRetryAt,
      now: failedAt,
      retryOutcome: "retry",
      workerId: "worker-1",
    });

    expect(createAuditLog).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action_code: "job_attempt.failed",
        failure_reason: "safe retryable failure",
        object_id: attempt.id,
        object_type: "job_attempt",
        operation_result: "failure",
      }),
    });
    expect(createAuditLog).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action_code: "job.retry.scheduled",
        object_id: attempt.job_id,
        object_type: "job",
        operation_result: "success",
      }),
    });
  });

  it("settles an exhausted failed Attempt into Dead Letter", async () => {
    const attempt = attemptRow();
    const failedAt = new Date(NOW.getTime() + 1_000);
    const runningJob = jobRow({
      attempt_count: 1,
      id: attempt.job_id,
      locked_by: "worker-1",
      locked_until: LEASE_UNTIL,
      max_attempts: 1,
      status: "running",
    });
    const failedAttempt = {
      ...attempt,
      duration_ms: 1_000,
      ended_at: failedAt,
      error_code: "JOB_EXHAUSTED",
      error_message: "safe exhausted failure",
      status: "failed",
    };
    const deadLetterJob = {
      ...runningJob,
      completed_at: failedAt,
      last_error_code: "JOB_EXHAUSTED",
      last_error_message: "safe exhausted failure",
      locked_by: null,
      locked_until: null,
      status: "dead_letter",
      updated_at: failedAt,
    };
    const deadLetter = {
      created_at: failedAt,
      dead_letter_reason: "Job retry attempts exhausted",
      failed_attempt_id: attempt.id,
      handled_at: null,
      handled_by: null,
      handling_note: null,
      handling_status: "open",
      id: randomUUID(),
      job_id: attempt.job_id,
      replayed_job_id: null,
      updated_at: failedAt,
    };
    const transaction = {
      job_attempts: {
        findUnique: vi.fn().mockResolvedValue(attempt),
        update: vi.fn().mockResolvedValue(failedAttempt),
      },
      job_dead_letters: { create: vi.fn().mockResolvedValue(deadLetter) },
      jobs: {
        findUnique: vi.fn().mockResolvedValue(runningJob),
        update: vi.fn().mockResolvedValue(deadLetterJob),
      },
    };
    const repository = new PrismaJobRepository({
      $transaction: (callback: (client: typeof transaction) => unknown) => callback(transaction),
    } as unknown as PrismaClient);

    await expect(
      repository.settleFailedAttempt({
        attemptId: attempt.id,
        deadLetterReason: "Job retry attempts exhausted",
        errorCode: "JOB_EXHAUSTED",
        errorMessage: "safe exhausted failure",
        jobId: attempt.job_id,
        now: failedAt,
        retryOutcome: "dead_letter",
        workerId: "worker-1",
      }),
    ).resolves.toMatchObject({
      attempt: { errorCode: "JOB_EXHAUSTED", status: "failed" },
      deadLetter: { failedAttemptId: attempt.id, handlingStatus: "open" },
      job: { completedAt: failedAt, lockedBy: null, status: "dead_letter" },
    });
    expect(transaction.job_dead_letters.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        dead_letter_reason: "Job retry attempts exhausted",
        failed_attempt_id: attempt.id,
        handling_status: "open",
        job_id: attempt.job_id,
      }),
    });
  });

  it("writes Dead Letter Audit entries when retry attempts are exhausted", async () => {
    const attempt = attemptRow();
    const failedAt = new Date(NOW.getTime() + 1_000);
    const runningJob = jobRow({
      attempt_count: 1,
      id: attempt.job_id,
      locked_by: "worker-1",
      locked_until: LEASE_UNTIL,
      max_attempts: 1,
      status: "running",
    });
    const failedAttempt = {
      ...attempt,
      duration_ms: 1_000,
      ended_at: failedAt,
      error_code: "JOB_EXHAUSTED",
      error_message: "safe exhausted failure",
      status: "failed",
    };
    const deadLetterJob = {
      ...runningJob,
      completed_at: failedAt,
      last_error_code: "JOB_EXHAUSTED",
      last_error_message: "safe exhausted failure",
      locked_by: null,
      locked_until: null,
      status: "dead_letter",
      updated_at: failedAt,
    };
    const deadLetter = {
      created_at: failedAt,
      dead_letter_reason: "Job retry attempts exhausted",
      failed_attempt_id: attempt.id,
      handled_at: null,
      handled_by: null,
      handling_note: null,
      handling_status: "open",
      id: randomUUID(),
      job_id: attempt.job_id,
      replayed_job_id: null,
      updated_at: failedAt,
    };
    const createAuditLog = auditLogCreate();
    const transaction = {
      audit_logs: { create: createAuditLog },
      job_attempts: {
        findUnique: vi.fn().mockResolvedValue(attempt),
        update: vi.fn().mockResolvedValue(failedAttempt),
      },
      job_dead_letters: { create: vi.fn().mockResolvedValue(deadLetter) },
      jobs: {
        findUnique: vi.fn().mockResolvedValue(runningJob),
        update: vi.fn().mockResolvedValue(deadLetterJob),
      },
    };
    const repository = new PrismaJobRepository({
      $transaction: (callback: (client: typeof transaction) => unknown) => callback(transaction),
    } as unknown as PrismaClient);

    await repository.settleFailedAttempt({
      attemptId: attempt.id,
      deadLetterReason: "Job retry attempts exhausted",
      errorCode: "JOB_EXHAUSTED",
      errorMessage: "safe exhausted failure",
      jobId: attempt.job_id,
      now: failedAt,
      retryOutcome: "dead_letter",
      workerId: "worker-1",
    });

    expect(createAuditLog).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action_code: "job_attempt.failed",
        failure_reason: "safe exhausted failure",
        object_id: attempt.id,
        object_type: "job_attempt",
        operation_result: "failure",
      }),
    });
    expect(createAuditLog).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action_code: "job.dead_letter.open",
        failure_reason: "safe exhausted failure",
        object_id: deadLetter.id,
        object_type: "job_dead_letter",
        operation_result: "failure",
      }),
    });
  });

  it("recovers a running Job with an expired Lease into retrying and marks Attempt timed_out", async () => {
    const expiredAt = new Date(NOW.getTime() - 1_000);
    const attempt = attemptRow({ lease_expires_at: expiredAt });
    const runningJob = jobRow({
      attempt_count: 1,
      id: attempt.job_id,
      locked_by: "worker-timeout",
      locked_until: expiredAt,
      max_attempts: 2,
      started_at: attempt.started_at,
      status: "running",
    });
    const retryingJob = {
      ...runningJob,
      available_at: NOW,
      last_error_code: "JOB_LEASE_TIMEOUT",
      last_error_message: "Job lease expired before completion",
      locked_by: null,
      locked_until: null,
      status: "retrying",
      updated_at: NOW,
    };
    const timedOutAttempt = {
      ...attempt,
      duration_ms: 0,
      ended_at: NOW,
      error_code: "JOB_LEASE_TIMEOUT",
      error_message: "Job lease expired before completion",
      status: "timed_out",
    };
    const transaction = {
      $queryRaw: vi
        .fn()
        .mockResolvedValue([
          { attempt_count: runningJob.attempt_count, id: runningJob.id, max_attempts: 2 },
        ]),
      job_attempts: {
        findFirst: vi.fn().mockResolvedValue(attempt),
        update: vi.fn().mockResolvedValue(timedOutAttempt),
      },
      job_dead_letters: { create: vi.fn() },
      jobs: {
        findUnique: vi.fn().mockResolvedValue(runningJob),
        update: vi.fn().mockResolvedValue(retryingJob),
      },
    };
    const repository = new PrismaJobRepository({
      $transaction: (callback: (client: typeof transaction) => unknown) => callback(transaction),
    } as unknown as PrismaClient);

    await expect(
      repository.recoverExpiredLeases({
        limit: 1,
        now: NOW,
        requestTraceId: runningJob.request_trace_id,
      }),
    ).resolves.toMatchObject([
      {
        attempt: { errorCode: "JOB_LEASE_TIMEOUT", status: "timed_out" },
        deadLetter: null,
        job: { lockedBy: null, lockedUntil: null, status: "retrying" },
      },
    ]);
    expect(transaction.$queryRaw).toHaveBeenCalledOnce();
    expect(transaction.job_attempts.findFirst).toHaveBeenCalledWith({
      orderBy: { attempt_no: "desc" },
      where: {
        job_id: runningJob.id,
        status: "running",
      },
    });
    expect(transaction.jobs.update).toHaveBeenCalledWith({
      data: expect.objectContaining({
        available_at: NOW,
        locked_by: null,
        locked_until: null,
        status: "retrying",
      }),
      where: { id: runningJob.id },
    });
    expect(transaction.job_attempts.update).toHaveBeenCalledWith({
      data: expect.objectContaining({
        error_code: "JOB_LEASE_TIMEOUT",
        status: "timed_out",
      }),
      where: { id: attempt.id },
    });
    expect(transaction.job_dead_letters.create).not.toHaveBeenCalled();
  });

  it("lets a recovered retrying Job be claimed again with a new Attempt", async () => {
    const candidate = { attempt_count: 1, id: randomUUID() };
    const runningJob = jobRow({
      attempt_count: 2,
      id: candidate.id,
      locked_by: "worker-2",
      locked_until: LEASE_UNTIL,
      started_at: NOW,
      status: "running",
    });
    const runningAttempt = attemptRow({
      attempt_no: 2,
      job_id: candidate.id,
      request_trace_id: runningJob.request_trace_id,
      worker_id: "worker-2",
    });
    const transaction = {
      $queryRaw: vi.fn().mockResolvedValue([candidate]),
      job_attempts: { create: vi.fn().mockResolvedValue(runningAttempt) },
      jobs: { update: vi.fn().mockResolvedValue(runningJob) },
    };
    const repository = new PrismaJobRepository({
      $transaction: (callback: (client: typeof transaction) => unknown) => callback(transaction),
    } as unknown as PrismaClient);

    await expect(
      repository.claimJobs({
        limit: 1,
        lockedUntil: LEASE_UNTIL,
        now: NOW,
        requestTraceId: runningJob.request_trace_id,
        workerId: "worker-2",
      }),
    ).resolves.toMatchObject([
      {
        attempt: { attemptNo: 2, status: "running", workerId: "worker-2" },
        job: { attemptCount: 2, id: candidate.id, status: "running" },
      },
    ]);
  });

  it("moves an exhausted expired Lease directly to Dead Letter", async () => {
    const expiredAt = new Date(NOW.getTime() - 1_000);
    const attempt = attemptRow({ lease_expires_at: expiredAt });
    const runningJob = jobRow({
      attempt_count: 1,
      id: attempt.job_id,
      locked_by: "worker-timeout",
      locked_until: expiredAt,
      max_attempts: 1,
      started_at: attempt.started_at,
      status: "running",
    });
    const deadLetterJob = {
      ...runningJob,
      completed_at: NOW,
      last_error_code: "JOB_LEASE_TIMEOUT",
      last_error_message: "Job lease expired before completion",
      locked_by: null,
      locked_until: null,
      status: "dead_letter",
      updated_at: NOW,
    };
    const timedOutAttempt = {
      ...attempt,
      duration_ms: 0,
      ended_at: NOW,
      error_code: "JOB_LEASE_TIMEOUT",
      error_message: "Job lease expired before completion",
      status: "timed_out",
    };
    const deadLetter = {
      created_at: NOW,
      dead_letter_reason: "Job lease timed out and retry attempts exhausted",
      failed_attempt_id: attempt.id,
      handled_at: null,
      handled_by: null,
      handling_note: null,
      handling_status: "open",
      id: randomUUID(),
      job_id: attempt.job_id,
      replayed_job_id: null,
      updated_at: NOW,
    };
    const transaction = {
      $queryRaw: vi
        .fn()
        .mockResolvedValue([
          { attempt_count: runningJob.attempt_count, id: runningJob.id, max_attempts: 1 },
        ]),
      job_attempts: {
        findFirst: vi.fn().mockResolvedValue(attempt),
        update: vi.fn().mockResolvedValue(timedOutAttempt),
      },
      job_dead_letters: { create: vi.fn().mockResolvedValue(deadLetter) },
      jobs: {
        findUnique: vi.fn().mockResolvedValue(runningJob),
        update: vi.fn().mockResolvedValue(deadLetterJob),
      },
    };
    const repository = new PrismaJobRepository({
      $transaction: (callback: (client: typeof transaction) => unknown) => callback(transaction),
    } as unknown as PrismaClient);

    await expect(
      repository.recoverExpiredLeases({
        limit: 1,
        now: NOW,
        requestTraceId: runningJob.request_trace_id,
      }),
    ).resolves.toMatchObject([
      {
        attempt: { status: "timed_out" },
        deadLetter: { failedAttemptId: attempt.id, handlingStatus: "open" },
        job: { lockedBy: null, status: "dead_letter" },
      },
    ]);
    expect(transaction.job_dead_letters.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        dead_letter_reason: "Job lease timed out and retry attempts exhausted",
        failed_attempt_id: attempt.id,
        handling_status: "open",
        job_id: attempt.job_id,
      }),
    });
  });

  it("relies on SKIP LOCKED so only one Worker recovers an expired Lease", async () => {
    const firstRepository = new PrismaJobRepository({
      $transaction: (callback: (client: { $queryRaw: ReturnType<typeof vi.fn> }) => unknown) =>
        callback({ $queryRaw: vi.fn().mockResolvedValue([]) }),
    } as unknown as PrismaClient);
    const secondRepository = new PrismaJobRepository({
      $transaction: (callback: (client: { $queryRaw: ReturnType<typeof vi.fn> }) => unknown) =>
        callback({ $queryRaw: vi.fn().mockResolvedValue([]) }),
    } as unknown as PrismaClient);

    await expect(
      Promise.all([
        firstRepository.recoverExpiredLeases({
          limit: 1,
          now: NOW,
          requestTraceId: randomUUID(),
        }),
        secondRepository.recoverExpiredLeases({
          limit: 1,
          now: NOW,
          requestTraceId: randomUUID(),
        }),
      ]),
    ).resolves.toEqual([[], []]);
  });

  it("acquires a Scheduler Lock through one atomic database statement", async () => {
    const lock = schedulerLockRow();
    const queryRaw = vi.fn().mockResolvedValue([lock]);
    const repository = new PrismaJobRepository({
      $queryRaw: queryRaw,
    } as unknown as PrismaClient);

    await expect(
      repository.acquireSchedulerLock({
        lockedUntil: LEASE_UNTIL,
        lockKey: "scheduler:test",
        now: NOW,
        ownerId: "scheduler-1",
      }),
    ).resolves.toMatchObject({
      lockKey: "scheduler:test",
      ownerId: "scheduler-1",
      releasedAt: null,
    });
    expect(queryRaw).toHaveBeenCalledOnce();
  });

  it("returns null when Scheduler Lock acquisition loses the database competition", async () => {
    const repository = new PrismaJobRepository({
      $queryRaw: vi.fn().mockResolvedValue([]),
    } as unknown as PrismaClient);

    await expect(
      repository.acquireSchedulerLock({
        lockedUntil: LEASE_UNTIL,
        lockKey: "scheduler:test",
        now: NOW,
        ownerId: "scheduler-1",
      }),
    ).resolves.toBeNull();
  });

  it("releases a Scheduler Lock only for the current owner", async () => {
    const lock = schedulerLockRow({ released_at: NOW });
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const findUnique = vi.fn().mockResolvedValue(lock);
    const repository = new PrismaJobRepository({
      scheduler_locks: {
        findUnique,
        updateMany,
      },
    } as unknown as PrismaClient);

    await expect(
      repository.releaseSchedulerLock({
        lockKey: "scheduler:test",
        now: NOW,
        ownerId: "scheduler-1",
      }),
    ).resolves.toMatchObject({
      lockKey: "scheduler:test",
      releasedAt: NOW,
    });
    expect(updateMany).toHaveBeenCalledWith({
      data: {
        released_at: NOW,
        updated_at: NOW,
      },
      where: {
        lock_key: "scheduler:test",
        owner_id: "scheduler-1",
        released_at: null,
      },
    });
  });
});
