import { describe, expect, it } from "vitest";
import { evaluateJobRetry } from "../src";

const NOW = new Date("2026-07-25T10:00:00.000Z");

describe("Job Retry Engine", () => {
  it("returns a retry decision with deterministic exponential backoff", () => {
    expect(
      evaluateJobRetry(
        {
          attemptCount: 1,
          attemptNo: 1,
          maxAttempts: 3,
          now: NOW,
          retryable: true,
        },
        {
          baseDelayMilliseconds: 1_000,
          maxDelayMilliseconds: 60_000,
        },
      ),
    ).toEqual({
      nextRetryAt: new Date(NOW.getTime() + 1_000),
      outcome: "retry",
    });
  });

  it("moves exhausted retry attempts to Dead Letter", () => {
    expect(
      evaluateJobRetry({
        attemptCount: 3,
        attemptNo: 3,
        maxAttempts: 3,
        now: NOW,
        retryable: true,
      }),
    ).toEqual({
      deadLetterReason: "Job retry attempts exhausted",
      outcome: "dead_letter",
    });
  });
});
