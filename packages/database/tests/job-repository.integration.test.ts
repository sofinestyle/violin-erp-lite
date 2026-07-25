import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createPrismaClient } from "../src/client";
import { PrismaJobRepository } from "../src/job/prisma-job-repository";

const databaseUrl = process.env.JOB_REPOSITORY_INTEGRATION_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;
const clients = databaseUrl ? Array.from({ length: 4 }, () => createPrismaClient(databaseUrl)) : [];
const repositories = clients.map((client) => new PrismaJobRepository(client));

async function cleanup() {
  if (!clients[0]) return;
  await clients[0].job_dead_letters.deleteMany({});
  await clients[0].job_results.deleteMany({});
  await clients[0].job_attempts.deleteMany({});
  await clients[0].jobs.deleteMany({ where: { job_type: { startsWith: "test." } } });
  await clients[0].scheduler_locks.deleteMany({ where: { lock_key: { startsWith: "test." } } });
}

integration("PostgreSQL Job repository integration", () => {
  beforeEach(async () => {
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await Promise.all(clients.map((client) => client.$disconnect()));
  });

  it("claims a pending Job once across concurrent Workers using SKIP LOCKED", async () => {
    const now = new Date();
    const job = await repositories[0]!.createJob({
      availableAt: now,
      jobKey: `claim-${randomUUID()}`,
      jobType: "test.concurrent-claim",
      maxAttempts: 1,
      now,
      requestTraceId: randomUUID(),
      scheduledAt: now,
    });
    const attempts = Array.from({ length: 20 }, (_, index) =>
      repositories[index % repositories.length]!.claimJobs({
        limit: 1,
        lockedUntil: new Date(now.getTime() + 30_000),
        now,
        requestTraceId: randomUUID(),
        workerId: `worker-${index}`,
      }),
    );

    const results = await Promise.all(attempts);
    const claimed = results.flat();

    expect(claimed).toHaveLength(1);
    expect(claimed[0]!.job.id).toBe(job.id);
    expect(claimed[0]!.job.status).toBe("running");
    expect(await clients[0]!.job_attempts.count({ where: { job_id: job.id } })).toBe(1);
    expect((await repositories[0]!.findJob(job.id))?.attemptCount).toBe(1);
  });

  it("supports the running to succeeded and failed terminal transitions", async () => {
    const now = new Date();
    const success = await repositories[0]!.createJob({
      availableAt: now,
      jobKey: `success-${randomUUID()}`,
      jobType: "test.status-success",
      maxAttempts: 1,
      now,
      requestTraceId: randomUUID(),
      scheduledAt: now,
    });
    const [claimedSuccess] = await repositories[0]!.claimJobs({
      limit: 1,
      lockedUntil: new Date(now.getTime() + 30_000),
      now,
      requestTraceId: randomUUID(),
      workerId: "worker-success",
    });

    await expect(
      repositories[0]!.markSucceeded({
        attemptId: claimedSuccess!.attempt.id,
        jobId: success.id,
        now: new Date(now.getTime() + 1_000),
        workerId: "worker-success",
      }),
    ).resolves.toMatchObject({
      attempt: { status: "succeeded" },
      job: { lockedBy: null, status: "succeeded" },
    });

    const failure = await repositories[0]!.createJob({
      availableAt: now,
      jobKey: `failure-${randomUUID()}`,
      jobType: "test.status-failed",
      maxAttempts: 1,
      now,
      requestTraceId: randomUUID(),
      scheduledAt: now,
    });
    const [claimedFailure] = await repositories[0]!.claimJobs({
      limit: 1,
      lockedUntil: new Date(now.getTime() + 30_000),
      now,
      requestTraceId: randomUUID(),
      workerId: "worker-failure",
    });

    await expect(
      repositories[0]!.markFailed({
        attemptId: claimedFailure!.attempt.id,
        errorCode: "JOB_TEST_FAILURE",
        errorMessage: "safe integration failure",
        jobId: failure.id,
        now: new Date(now.getTime() + 1_000),
        workerId: "worker-failure",
      }),
    ).resolves.toMatchObject({
      attempt: { errorCode: "JOB_TEST_FAILURE", status: "failed" },
      job: { lastErrorCode: "JOB_TEST_FAILURE", lockedBy: null, status: "failed" },
    });
  });

  it("allows only one concurrent Scheduler Lock owner for the same lock_key", async () => {
    const now = new Date();
    const lockKey = `test.scheduler-lock-${randomUUID()}`;
    const attempts = Array.from({ length: 20 }, (_, index) =>
      repositories[index % repositories.length]!.acquireSchedulerLock({
        lockedUntil: new Date(now.getTime() + 30_000),
        lockKey,
        now,
        ownerId: `scheduler-${index}`,
      }),
    );

    const results = await Promise.all(attempts);
    const acquired = results.filter((result) => result !== null);

    expect(acquired).toHaveLength(1);
    expect(await clients[0]!.scheduler_locks.count({ where: { lock_key: lockKey } })).toBe(1);
  });
});
