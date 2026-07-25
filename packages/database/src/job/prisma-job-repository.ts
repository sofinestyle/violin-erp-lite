import { recordAuditEvent, type AuditEvent } from "@violin-erp/api";
import { getPrismaClient } from "../client.js";
import { PrismaAuditWriter } from "../audit/prisma-audit-writer.js";
import {
  Prisma,
  type PrismaClient,
  type job_dead_letters,
  type job_attempts,
  type jobs,
  type scheduler_locks,
} from "../generated/prisma/client.js";

export type JobStatus =
  "pending" | "running" | "retrying" | "succeeded" | "failed" | "dead_letter" | "cancelled";

export type JobAttemptStatus = "running" | "succeeded" | "failed" | "timed_out" | "cancelled";

export type JobJson = Prisma.JsonValue;

export type JobRecord = Readonly<{
  attemptCount: number;
  availableAt: Date;
  cancelledAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  createdBy: string | null;
  id: string;
  idempotencyRecordId: string | null;
  jobKey: string;
  jobType: string;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  lockedBy: string | null;
  lockedUntil: Date | null;
  maxAttempts: number;
  payload: JobJson | null;
  priority: number;
  requestTraceId: string;
  scheduledAt: Date;
  startedAt: Date | null;
  status: JobStatus;
  targetObjectId: string | null;
  targetObjectType: string | null;
  updatedAt: Date;
  updatedBy: string | null;
}>;

export type JobAttemptRecord = Readonly<{
  attemptNo: number;
  createdAt: Date;
  durationMs: number | null;
  endedAt: Date | null;
  errorCode: string | null;
  errorDetail: JobJson | null;
  errorMessage: string | null;
  id: string;
  jobId: string;
  leaseExpiresAt: Date;
  requestTraceId: string;
  startedAt: Date;
  status: JobAttemptStatus;
  workerId: string;
}>;

export type ClaimedJob = Readonly<{
  attempt: JobAttemptRecord;
  job: JobRecord;
}>;

export type CreateJobInput = Readonly<{
  availableAt: Date;
  createdBy?: string | null;
  idempotencyRecordId?: string | null;
  jobKey: string;
  jobType: string;
  maxAttempts: number;
  now?: Date;
  payload?: JobJson | null;
  priority?: number;
  requestTraceId: string;
  scheduledAt: Date;
  targetObjectId?: string | null;
  targetObjectType?: string | null;
}>;

export type ClaimJobsInput = Readonly<{
  limit: number;
  lockedUntil: Date;
  now: Date;
  requestTraceId: string;
  workerId: string;
}>;

export type UpdateJobStatusInput = Readonly<{
  completedAt?: Date | null;
  expectedStatus?: JobStatus;
  id: string;
  lastErrorCode?: string | null;
  lastErrorMessage?: string | null;
  now: Date;
  status: Extract<JobStatus, "pending" | "running" | "succeeded" | "failed">;
  updatedBy?: string | null;
}>;

export type ExtendJobLeaseInput = Readonly<{
  attemptId: string;
  jobId: string;
  lockedUntil: Date;
  now: Date;
  workerId: string;
}>;

export type CompleteJobInput = Readonly<{
  attemptId: string;
  jobId: string;
  now: Date;
  workerId: string;
}>;

export type FailJobInput = CompleteJobInput &
  Readonly<{
    errorCode?: string | null;
    errorDetail?: JobJson | null;
    errorMessage?: string | null;
  }>;

export type DeadLetterHandlingStatus = "open" | "in_review" | "replayed" | "resolved" | "ignored";

export type JobDeadLetterRecord = Readonly<{
  createdAt: Date;
  deadLetterReason: string;
  failedAttemptId: string;
  handledAt: Date | null;
  handledBy: string | null;
  handlingNote: string | null;
  handlingStatus: DeadLetterHandlingStatus;
  id: string;
  jobId: string;
  replayedJobId: string | null;
  updatedAt: Date;
}>;

export type SettleFailedAttemptInput = FailJobInput &
  (
    | Readonly<{
        nextRetryAt: Date;
        retryOutcome: "retry";
      }>
    | Readonly<{
        deadLetterReason: string;
        retryOutcome: "dead_letter";
      }>
  );

export type FailedAttemptSettlement = Readonly<{
  attempt: JobAttemptRecord;
  deadLetter: JobDeadLetterRecord | null;
  job: JobRecord;
}>;

export type RecoverExpiredLeasesInput = Readonly<{
  limit: number;
  now: Date;
  requestTraceId: string;
}>;

export type ExpiredLeaseRecovery = FailedAttemptSettlement;

export type SchedulerLockRecord = Readonly<{
  createdAt: Date;
  id: string;
  lastAcquiredAt: Date;
  lockedUntil: Date;
  lockKey: string;
  ownerId: string;
  releasedAt: Date | null;
  updatedAt: Date;
}>;

export type AcquireSchedulerLockInput = Readonly<{
  lockedUntil: Date;
  lockKey: string;
  now: Date;
  ownerId: string;
}>;

export type ReleaseSchedulerLockInput = Readonly<{
  lockKey: string;
  now: Date;
  ownerId: string;
}>;

type TransactionClient = Prisma.TransactionClient;
type AuditClient = Pick<PrismaClient, "audit_logs">;

type ClaimCandidate = Readonly<{
  attempt_count: number;
  id: string;
}>;

type ExpiredLeaseCandidate = Readonly<{
  attempt_count: number;
  id: string;
  max_attempts: number;
}>;

function assertSafePositiveInteger(value: number, name: string, max: number): void {
  if (!Number.isSafeInteger(value) || value < 1 || value > max) {
    throw new TypeError(`${name} is out of range`);
  }
}

function assertSupportedStatus(status: string): asserts status is JobStatus {
  if (
    !["pending", "running", "retrying", "succeeded", "failed", "dead_letter", "cancelled"].includes(
      status,
    )
  ) {
    throw new Error("Database returned an unsupported Job status");
  }
}

function assertSupportedAttemptStatus(status: string): asserts status is JobAttemptStatus {
  if (!["running", "succeeded", "failed", "timed_out", "cancelled"].includes(status)) {
    throw new Error("Database returned an unsupported Job Attempt status");
  }
}

function assertSupportedDeadLetterHandlingStatus(
  status: string,
): asserts status is DeadLetterHandlingStatus {
  if (!["open", "in_review", "replayed", "resolved", "ignored"].includes(status)) {
    throw new Error("Database returned an unsupported Dead Letter handling status");
  }
}

function nullableJson(value: JobJson | null): Prisma.InputJsonValue | typeof Prisma.DbNull {
  if (value === null) return Prisma.DbNull;
  return value as Prisma.InputJsonValue;
}

function rowToJob(row: jobs): JobRecord {
  assertSupportedStatus(row.status);
  return {
    attemptCount: row.attempt_count,
    availableAt: row.available_at,
    cancelledAt: row.cancelled_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    createdBy: row.created_by,
    id: row.id,
    idempotencyRecordId: row.idempotency_record_id,
    jobKey: row.job_key,
    jobType: row.job_type,
    lastErrorCode: row.last_error_code,
    lastErrorMessage: row.last_error_message,
    lockedBy: row.locked_by,
    lockedUntil: row.locked_until,
    maxAttempts: row.max_attempts,
    payload: row.payload as JobJson | null,
    priority: row.priority,
    requestTraceId: row.request_trace_id,
    scheduledAt: row.scheduled_at,
    startedAt: row.started_at,
    status: row.status,
    targetObjectId: row.target_object_id,
    targetObjectType: row.target_object_type,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

function rowToAttempt(row: job_attempts): JobAttemptRecord {
  assertSupportedAttemptStatus(row.status);
  return {
    attemptNo: row.attempt_no,
    createdAt: row.created_at,
    durationMs: row.duration_ms,
    endedAt: row.ended_at,
    errorCode: row.error_code,
    errorDetail: row.error_detail as JobJson | null,
    errorMessage: row.error_message,
    id: row.id,
    jobId: row.job_id,
    leaseExpiresAt: row.lease_expires_at,
    requestTraceId: row.request_trace_id,
    startedAt: row.started_at,
    status: row.status,
    workerId: row.worker_id,
  };
}

function rowToSchedulerLock(row: scheduler_locks): SchedulerLockRecord {
  return {
    createdAt: row.created_at,
    id: row.id,
    lastAcquiredAt: row.last_acquired_at,
    lockedUntil: row.locked_until,
    lockKey: row.lock_key,
    ownerId: row.owner_id,
    releasedAt: row.released_at,
    updatedAt: row.updated_at,
  };
}

function rowToDeadLetter(row: job_dead_letters): JobDeadLetterRecord {
  assertSupportedDeadLetterHandlingStatus(row.handling_status);
  return {
    createdAt: row.created_at,
    deadLetterReason: row.dead_letter_reason,
    failedAttemptId: row.failed_attempt_id,
    handledAt: row.handled_at,
    handledBy: row.handled_by,
    handlingNote: row.handling_note,
    handlingStatus: row.handling_status,
    id: row.id,
    jobId: row.job_id,
    replayedJobId: row.replayed_job_id,
    updatedAt: row.updated_at,
  };
}

function durationMs(startedAt: Date, endedAt: Date): number {
  return Math.max(0, endedAt.getTime() - startedAt.getTime());
}

function hasAuditLogs(client: unknown): client is AuditClient {
  return typeof client === "object" && client !== null && "audit_logs" in client;
}

async function writeJobAudit(client: unknown, event: AuditEvent): Promise<void> {
  if (!hasAuditLogs(client)) return;
  await recordAuditEvent(new PrismaAuditWriter(client), event);
}

async function findJobById(
  client: TransactionClient | PrismaClient,
  id: string,
): Promise<JobRecord | null> {
  const found = await client.jobs.findUnique({ where: { id } });
  return found ? rowToJob(found) : null;
}

export class PrismaJobRepository {
  readonly #client: PrismaClient;

  constructor(client: PrismaClient = getPrismaClient()) {
    this.#client = client;
  }

  async createJob(input: CreateJobInput): Promise<JobRecord> {
    const data: Prisma.jobsUncheckedCreateInput = {
      available_at: input.availableAt,
      created_by: input.createdBy ?? null,
      idempotency_record_id: input.idempotencyRecordId ?? null,
      job_key: input.jobKey,
      job_type: input.jobType,
      max_attempts: input.maxAttempts,
      priority: input.priority ?? 0,
      request_trace_id: input.requestTraceId,
      scheduled_at: input.scheduledAt,
      status: "pending",
      target_object_id: input.targetObjectId ?? null,
      target_object_type: input.targetObjectType ?? null,
      updated_by: input.createdBy ?? null,
    };
    if (input.now) {
      data.created_at = input.now;
      data.updated_at = input.now;
    }
    if (input.payload !== undefined) {
      data.payload = nullableJson(input.payload);
    }

    try {
      const created = await this.#client.jobs.create({ data });
      await writeJobAudit(this.#client, {
        action: "job.create",
        ...(input.createdBy ? { actorUserId: input.createdBy } : {}),
        afterSnapshot: {
          jobKey: created.job_key,
          jobType: created.job_type,
          maxAttempts: created.max_attempts,
          status: created.status,
          targetObjectId: created.target_object_id,
          targetObjectType: created.target_object_type,
        },
        metadata: {
          availableAt: created.available_at,
          priority: created.priority,
          scheduledAt: created.scheduled_at,
        },
        moduleCode: "background_job",
        requestId: input.requestTraceId,
        resourceId: created.id,
        resourceNoSnapshot: created.job_key,
        resourceType: "job",
        result: "success",
        timestamp: input.now ?? created.created_at,
      });
      return rowToJob(created);
    } catch (error) {
      if (!this.#uniqueConflict(error)) throw error;
      const existing = await this.#client.jobs.findUnique({
        where: {
          job_type_job_key: {
            job_key: input.jobKey,
            job_type: input.jobType,
          },
        },
      });
      if (!existing) throw error;
      return rowToJob(existing);
    }
  }

  findJob(id: string): Promise<JobRecord | null> {
    return findJobById(this.#client, id);
  }

  async updateJobStatus(input: UpdateJobStatusInput): Promise<JobRecord | null> {
    const data: Prisma.jobsUncheckedUpdateManyInput = {
      status: input.status,
      updated_at: input.now,
      updated_by: input.updatedBy ?? null,
    };
    if ("completedAt" in input) {
      data.completed_at = input.completedAt;
    }
    if ("lastErrorCode" in input) {
      data.last_error_code = input.lastErrorCode;
    }
    if ("lastErrorMessage" in input) {
      data.last_error_message = input.lastErrorMessage;
    }

    const updated = await this.#client.jobs.updateMany({
      data,
      where: {
        id: input.id,
        ...(input.expectedStatus ? { status: input.expectedStatus } : {}),
      },
    });
    if (updated.count !== 1) return null;
    return this.findJob(input.id);
  }

  async claimJobs(input: ClaimJobsInput): Promise<ClaimedJob[]> {
    assertSafePositiveInteger(input.limit, "Job claim limit", 100);
    if (input.lockedUntil <= input.now) {
      throw new TypeError("Job lease must expire after claim time");
    }

    return this.#client.$transaction(async (transaction) => {
      const candidates = await transaction.$queryRaw<ClaimCandidate[]>(
        Prisma.sql`
          SELECT id, attempt_count
          FROM jobs
          WHERE status IN ('pending', 'retrying')
            AND available_at <= ${input.now}
            AND (locked_until IS NULL OR locked_until < ${input.now})
          ORDER BY priority ASC, available_at ASC, created_at ASC
          FOR UPDATE SKIP LOCKED
          LIMIT ${input.limit}
        `,
      );

      const claimed: ClaimedJob[] = [];
      for (const candidate of candidates) {
        const attemptNo = candidate.attempt_count + 1;
        const job = await transaction.jobs.update({
          data: {
            attempt_count: attemptNo,
            locked_by: input.workerId,
            locked_until: input.lockedUntil,
            started_at: input.now,
            status: "running",
            updated_at: input.now,
          },
          where: { id: candidate.id },
        });
        const attempt = await transaction.job_attempts.create({
          data: {
            attempt_no: attemptNo,
            job_id: candidate.id,
            lease_expires_at: input.lockedUntil,
            request_trace_id: input.requestTraceId,
            started_at: input.now,
            status: "running",
            worker_id: input.workerId,
          },
        });
        await writeJobAudit(transaction, {
          action: "job.claim",
          afterSnapshot: {
            attemptCount: job.attempt_count,
            lockedBy: job.locked_by,
            lockedUntil: job.locked_until,
            status: job.status,
          },
          metadata: {
            attemptId: attempt.id,
            attemptNo,
            workerId: input.workerId,
          },
          moduleCode: "background_job",
          requestId: input.requestTraceId,
          resourceId: job.id,
          resourceNoSnapshot: job.job_key,
          resourceType: "job",
          result: "success",
          timestamp: input.now,
        });
        await writeJobAudit(transaction, {
          action: "job_attempt.start",
          afterSnapshot: {
            attemptNo,
            leaseExpiresAt: attempt.lease_expires_at,
            status: attempt.status,
            workerId: attempt.worker_id,
          },
          metadata: {
            jobId: job.id,
            jobKey: job.job_key,
            jobType: job.job_type,
          },
          moduleCode: "background_job",
          requestId: input.requestTraceId,
          resourceId: attempt.id,
          resourceNoSnapshot: `${job.job_key}#${attemptNo}`,
          resourceType: "job_attempt",
          result: "success",
          timestamp: input.now,
        });
        claimed.push({ attempt: rowToAttempt(attempt), job: rowToJob(job) });
      }

      return claimed;
    });
  }

  async extendLease(input: ExtendJobLeaseInput): Promise<ClaimedJob | null> {
    if (input.lockedUntil <= input.now) {
      throw new TypeError("Job lease extension must expire after current time");
    }

    return this.#client.$transaction(async (transaction) => {
      const updatedJob = await transaction.jobs.updateMany({
        data: {
          locked_until: input.lockedUntil,
          updated_at: input.now,
        },
        where: {
          id: input.jobId,
          locked_by: input.workerId,
          status: "running",
        },
      });
      if (updatedJob.count !== 1) return null;

      const updatedAttempt = await transaction.job_attempts.updateMany({
        data: { lease_expires_at: input.lockedUntil },
        where: {
          id: input.attemptId,
          job_id: input.jobId,
          status: "running",
          worker_id: input.workerId,
        },
      });
      if (updatedAttempt.count !== 1) return null;

      const [job, attempt] = await Promise.all([
        transaction.jobs.findUnique({ where: { id: input.jobId } }),
        transaction.job_attempts.findUnique({ where: { id: input.attemptId } }),
      ]);
      if (!job || !attempt) return null;
      return { attempt: rowToAttempt(attempt), job: rowToJob(job) };
    });
  }

  async markSucceeded(input: CompleteJobInput): Promise<ClaimedJob | null> {
    return this.#completeRunningJob("succeeded", input);
  }

  async markFailed(input: FailJobInput): Promise<ClaimedJob | null> {
    return this.#completeRunningJob("failed", input);
  }

  async settleFailedAttempt(
    input: SettleFailedAttemptInput,
  ): Promise<FailedAttemptSettlement | null> {
    return this.#client.$transaction(async (transaction) => {
      const attempt = await transaction.job_attempts.findUnique({
        where: { id: input.attemptId },
      });
      if (
        !attempt ||
        attempt.job_id !== input.jobId ||
        attempt.worker_id !== input.workerId ||
        attempt.status !== "running"
      ) {
        return null;
      }

      const job = await transaction.jobs.findUnique({
        where: { id: input.jobId },
      });
      if (!job || job.locked_by !== input.workerId || job.status !== "running") return null;

      const updatedJob = await transaction.jobs.update({
        data:
          input.retryOutcome === "retry"
            ? {
                available_at: input.nextRetryAt,
                completed_at: null,
                last_error_code: input.errorCode ?? null,
                last_error_message: input.errorMessage ?? null,
                locked_by: null,
                locked_until: null,
                status: "retrying",
                updated_at: input.now,
              }
            : {
                completed_at: input.now,
                last_error_code: input.errorCode ?? null,
                last_error_message: input.errorMessage ?? null,
                locked_by: null,
                locked_until: null,
                status: "dead_letter",
                updated_at: input.now,
              },
        where: { id: input.jobId },
      });

      const attemptData: Prisma.job_attemptsUncheckedUpdateInput = {
        duration_ms: durationMs(attempt.started_at, input.now),
        ended_at: input.now,
        error_code: input.errorCode ?? null,
        error_message: input.errorMessage ?? null,
        status: "failed",
      };
      if (input.errorDetail !== undefined) {
        attemptData.error_detail = nullableJson(input.errorDetail);
      }

      const updatedAttempt = await transaction.job_attempts.update({
        data: attemptData,
        where: { id: input.attemptId },
      });

      await writeJobAudit(transaction, {
        action: "job_attempt.failed",
        afterSnapshot: {
          attemptNo: updatedAttempt.attempt_no,
          durationMs: updatedAttempt.duration_ms,
          errorCode: updatedAttempt.error_code,
          errorMessage: updatedAttempt.error_message,
          status: updatedAttempt.status,
        },
        failureReason: input.errorMessage ?? input.errorCode ?? "Job Attempt failed",
        metadata: {
          jobId: updatedJob.id,
          jobKey: updatedJob.job_key,
          jobType: updatedJob.job_type,
          workerId: input.workerId,
        },
        moduleCode: "background_job",
        requestId: attempt.request_trace_id,
        resourceId: updatedAttempt.id,
        resourceNoSnapshot: `${updatedJob.job_key}#${updatedAttempt.attempt_no}`,
        resourceType: "job_attempt",
        result: "failure",
        timestamp: input.now,
      });

      const deadLetter =
        input.retryOutcome === "dead_letter"
          ? await transaction.job_dead_letters.create({
              data: {
                created_at: input.now,
                dead_letter_reason: input.deadLetterReason,
                failed_attempt_id: input.attemptId,
                handling_status: "open",
                job_id: input.jobId,
                updated_at: input.now,
              },
            })
          : null;

      if (input.retryOutcome === "retry") {
        await writeJobAudit(transaction, {
          action: "job.retry.scheduled",
          afterSnapshot: {
            availableAt: input.nextRetryAt,
            lastErrorCode: updatedJob.last_error_code,
            lastErrorMessage: updatedJob.last_error_message,
            status: updatedJob.status,
          },
          metadata: {
            attemptId: updatedAttempt.id,
            attemptNo: updatedAttempt.attempt_no,
            maxAttempts: updatedJob.max_attempts,
            workerId: input.workerId,
          },
          moduleCode: "background_job",
          requestId: attempt.request_trace_id,
          resourceId: updatedJob.id,
          resourceNoSnapshot: updatedJob.job_key,
          resourceType: "job",
          result: "success",
          timestamp: input.now,
        });
      } else if (deadLetter) {
        await writeJobAudit(transaction, {
          action: "job.dead_letter.open",
          afterSnapshot: {
            deadLetterReason: deadLetter.dead_letter_reason,
            handlingStatus: deadLetter.handling_status,
            status: updatedJob.status,
          },
          failureReason: input.errorMessage ?? input.errorCode ?? input.deadLetterReason,
          metadata: {
            attemptId: updatedAttempt.id,
            attemptNo: updatedAttempt.attempt_no,
            failedAttemptId: deadLetter.failed_attempt_id,
            jobId: updatedJob.id,
          },
          moduleCode: "background_job",
          requestId: attempt.request_trace_id,
          resourceId: deadLetter.id,
          resourceNoSnapshot: updatedJob.job_key,
          resourceType: "job_dead_letter",
          result: "failure",
          timestamp: input.now,
        });
      }

      return {
        attempt: rowToAttempt(updatedAttempt),
        deadLetter: deadLetter ? rowToDeadLetter(deadLetter) : null,
        job: rowToJob(updatedJob),
      };
    });
  }

  async recoverExpiredLeases(input: RecoverExpiredLeasesInput): Promise<ExpiredLeaseRecovery[]> {
    assertSafePositiveInteger(input.limit, "Expired Job lease recovery limit", 100);

    return this.#client.$transaction(async (transaction) => {
      const candidates = await transaction.$queryRaw<ExpiredLeaseCandidate[]>(
        Prisma.sql`
          SELECT id, attempt_count, max_attempts
          FROM jobs
          WHERE status = 'running'
            AND locked_until < ${input.now}
          ORDER BY locked_until ASC, created_at ASC
          FOR UPDATE SKIP LOCKED
          LIMIT ${input.limit}
        `,
      );

      const recovered: ExpiredLeaseRecovery[] = [];
      for (const candidate of candidates) {
        const attempt = await transaction.job_attempts.findFirst({
          orderBy: { attempt_no: "desc" },
          where: {
            job_id: candidate.id,
            status: "running",
          },
        });
        const job = await transaction.jobs.findUnique({ where: { id: candidate.id } });
        if (!attempt || !job || job.status !== "running" || !job.locked_by) continue;

        const retryable = candidate.attempt_count < candidate.max_attempts;
        const errorCode = "JOB_LEASE_TIMEOUT";
        const errorMessage = "Job lease expired before completion";
        const updatedJob = await transaction.jobs.update({
          data: retryable
            ? {
                available_at: input.now,
                completed_at: null,
                last_error_code: errorCode,
                last_error_message: errorMessage,
                locked_by: null,
                locked_until: null,
                status: "retrying",
                updated_at: input.now,
              }
            : {
                completed_at: input.now,
                last_error_code: errorCode,
                last_error_message: errorMessage,
                locked_by: null,
                locked_until: null,
                status: "dead_letter",
                updated_at: input.now,
              },
          where: { id: candidate.id },
        });

        const updatedAttempt = await transaction.job_attempts.update({
          data: {
            duration_ms: durationMs(attempt.started_at, input.now),
            ended_at: input.now,
            error_code: errorCode,
            error_message: errorMessage,
            status: "timed_out",
          },
          where: { id: attempt.id },
        });

        await writeJobAudit(transaction, {
          action: "job_attempt.timed_out",
          afterSnapshot: {
            attemptNo: updatedAttempt.attempt_no,
            durationMs: updatedAttempt.duration_ms,
            errorCode: updatedAttempt.error_code,
            errorMessage: updatedAttempt.error_message,
            status: updatedAttempt.status,
          },
          failureReason: errorMessage,
          metadata: {
            jobId: updatedJob.id,
            jobKey: updatedJob.job_key,
            jobType: updatedJob.job_type,
            previousWorkerId: attempt.worker_id,
          },
          moduleCode: "background_job",
          requestId: attempt.request_trace_id || input.requestTraceId,
          resourceId: updatedAttempt.id,
          resourceNoSnapshot: `${updatedJob.job_key}#${updatedAttempt.attempt_no}`,
          resourceType: "job_attempt",
          result: "failure",
          timestamp: input.now,
        });

        const deadLetter = retryable
          ? null
          : await transaction.job_dead_letters.create({
              data: {
                created_at: input.now,
                dead_letter_reason: "Job lease timed out and retry attempts exhausted",
                failed_attempt_id: updatedAttempt.id,
                handling_status: "open",
                job_id: updatedJob.id,
                updated_at: input.now,
              },
            });

        if (retryable) {
          await writeJobAudit(transaction, {
            action: "job.retry.scheduled",
            afterSnapshot: {
              availableAt: updatedJob.available_at,
              lastErrorCode: updatedJob.last_error_code,
              lastErrorMessage: updatedJob.last_error_message,
              status: updatedJob.status,
            },
            metadata: {
              attemptId: updatedAttempt.id,
              attemptNo: updatedAttempt.attempt_no,
              maxAttempts: updatedJob.max_attempts,
              previousWorkerId: attempt.worker_id,
            },
            moduleCode: "background_job",
            requestId: attempt.request_trace_id || input.requestTraceId,
            resourceId: updatedJob.id,
            resourceNoSnapshot: updatedJob.job_key,
            resourceType: "job",
            result: "success",
            timestamp: input.now,
          });
        } else if (deadLetter) {
          await writeJobAudit(transaction, {
            action: "job.dead_letter.open",
            afterSnapshot: {
              deadLetterReason: deadLetter.dead_letter_reason,
              handlingStatus: deadLetter.handling_status,
              status: updatedJob.status,
            },
            failureReason: errorMessage,
            metadata: {
              attemptId: updatedAttempt.id,
              attemptNo: updatedAttempt.attempt_no,
              failedAttemptId: deadLetter.failed_attempt_id,
              jobId: updatedJob.id,
            },
            moduleCode: "background_job",
            requestId: attempt.request_trace_id || input.requestTraceId,
            resourceId: deadLetter.id,
            resourceNoSnapshot: updatedJob.job_key,
            resourceType: "job_dead_letter",
            result: "failure",
            timestamp: input.now,
          });
        }

        recovered.push({
          attempt: rowToAttempt(updatedAttempt),
          deadLetter: deadLetter ? rowToDeadLetter(deadLetter) : null,
          job: rowToJob(updatedJob),
        });
      }

      return recovered;
    });
  }

  async acquireSchedulerLock(
    input: AcquireSchedulerLockInput,
  ): Promise<SchedulerLockRecord | null> {
    if (input.lockedUntil <= input.now) {
      throw new TypeError("Scheduler Lock lease must expire after acquisition time");
    }

    const rows = await this.#client.$queryRaw<scheduler_locks[]>(
      Prisma.sql`
        INSERT INTO scheduler_locks (
          lock_key,
          owner_id,
          locked_until,
          last_acquired_at,
          released_at,
          created_at,
          updated_at
        )
        VALUES (
          ${input.lockKey},
          ${input.ownerId},
          ${input.lockedUntil},
          ${input.now},
          NULL,
          ${input.now},
          ${input.now}
        )
        ON CONFLICT (lock_key) DO UPDATE
        SET
          owner_id = EXCLUDED.owner_id,
          locked_until = EXCLUDED.locked_until,
          last_acquired_at = EXCLUDED.last_acquired_at,
          released_at = NULL,
          updated_at = EXCLUDED.updated_at
        WHERE scheduler_locks.locked_until < ${input.now}
          OR scheduler_locks.owner_id = ${input.ownerId}
          OR scheduler_locks.released_at IS NOT NULL
        RETURNING *
      `,
    );

    const [lock] = rows;
    return lock ? rowToSchedulerLock(lock) : null;
  }

  async releaseSchedulerLock(
    input: ReleaseSchedulerLockInput,
  ): Promise<SchedulerLockRecord | null> {
    const updated = await this.#client.scheduler_locks.updateMany({
      data: {
        released_at: input.now,
        updated_at: input.now,
      },
      where: {
        lock_key: input.lockKey,
        owner_id: input.ownerId,
        released_at: null,
      },
    });
    if (updated.count !== 1) return null;

    const lock = await this.#client.scheduler_locks.findUnique({
      where: { lock_key: input.lockKey },
    });
    return lock ? rowToSchedulerLock(lock) : null;
  }

  async #completeRunningJob(
    status: Extract<JobAttemptStatus, "succeeded" | "failed">,
    input: CompleteJobInput | FailJobInput,
  ): Promise<ClaimedJob | null> {
    return this.#client.$transaction(async (transaction) => {
      const attempt = await transaction.job_attempts.findUnique({
        where: { id: input.attemptId },
      });
      if (
        !attempt ||
        attempt.job_id !== input.jobId ||
        attempt.worker_id !== input.workerId ||
        attempt.status !== "running"
      ) {
        return null;
      }

      const updatedJob = await transaction.jobs.updateMany({
        data: {
          completed_at: input.now,
          last_error_code: "errorCode" in input ? (input.errorCode ?? null) : null,
          last_error_message: "errorMessage" in input ? (input.errorMessage ?? null) : null,
          locked_by: null,
          locked_until: null,
          status,
          updated_at: input.now,
        },
        where: {
          id: input.jobId,
          locked_by: input.workerId,
          status: "running",
        },
      });
      if (updatedJob.count !== 1) return null;

      const attemptData: Prisma.job_attemptsUncheckedUpdateInput = {
        duration_ms: durationMs(attempt.started_at, input.now),
        ended_at: input.now,
        status,
      };
      if ("errorCode" in input) {
        attemptData.error_code = input.errorCode ?? null;
      }
      if ("errorDetail" in input && input.errorDetail !== undefined) {
        attemptData.error_detail = nullableJson(input.errorDetail);
      }
      if ("errorMessage" in input) {
        attemptData.error_message = input.errorMessage ?? null;
      }

      const updatedAttempt = await transaction.job_attempts.update({
        data: attemptData,
        where: { id: input.attemptId },
      });
      const job = await transaction.jobs.findUnique({ where: { id: input.jobId } });
      if (!job) return null;
      await writeJobAudit(transaction, {
        action: status === "succeeded" ? "job.succeeded" : "job.failed",
        afterSnapshot: {
          attemptId: updatedAttempt.id,
          completedAt: job.completed_at,
          lastErrorCode: job.last_error_code,
          lastErrorMessage: job.last_error_message,
          status: job.status,
        },
        ...(status === "failed"
          ? {
              failureReason:
                "errorMessage" in input
                  ? (input.errorMessage ?? input.errorCode ?? "Job failed")
                  : "Job failed",
            }
          : {}),
        metadata: {
          attemptNo: updatedAttempt.attempt_no,
          durationMs: updatedAttempt.duration_ms,
          workerId: input.workerId,
        },
        moduleCode: "background_job",
        requestId: attempt.request_trace_id,
        resourceId: job.id,
        resourceNoSnapshot: job.job_key,
        resourceType: "job",
        result: status === "succeeded" ? "success" : "failure",
        timestamp: input.now,
      } as AuditEvent);
      await writeJobAudit(transaction, {
        action: status === "succeeded" ? "job_attempt.succeeded" : "job_attempt.failed",
        afterSnapshot: {
          attemptNo: updatedAttempt.attempt_no,
          durationMs: updatedAttempt.duration_ms,
          errorCode: updatedAttempt.error_code,
          errorMessage: updatedAttempt.error_message,
          status: updatedAttempt.status,
        },
        ...(status === "failed"
          ? {
              failureReason:
                "errorMessage" in input
                  ? (input.errorMessage ?? input.errorCode ?? "Job Attempt failed")
                  : "Job Attempt failed",
            }
          : {}),
        metadata: {
          jobId: job.id,
          jobKey: job.job_key,
          jobType: job.job_type,
          workerId: input.workerId,
        },
        moduleCode: "background_job",
        requestId: attempt.request_trace_id,
        resourceId: updatedAttempt.id,
        resourceNoSnapshot: `${job.job_key}#${updatedAttempt.attempt_no}`,
        resourceType: "job_attempt",
        result: status === "succeeded" ? "success" : "failure",
        timestamp: input.now,
      } as AuditEvent);
      return { attempt: rowToAttempt(updatedAttempt), job: rowToJob(job) };
    });
  }

  #uniqueConflict(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
  }
}
