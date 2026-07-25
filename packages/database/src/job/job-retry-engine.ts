export type JobRetryPolicy = Readonly<{
  baseDelayMilliseconds?: number;
  maxDelayMilliseconds?: number;
}>;

export type JobRetryDecisionInput = Readonly<{
  attemptCount: number;
  attemptNo: number;
  maxAttempts: number;
  now: Date;
  retryable: boolean;
}>;

export type JobRetryDecision =
  | Readonly<{
      nextRetryAt: Date;
      outcome: "retry";
    }>
  | Readonly<{
      deadLetterReason: string;
      outcome: "dead_letter";
    }>;

const DEFAULT_BASE_DELAY_MILLISECONDS = 60_000;
const DEFAULT_MAX_DELAY_MILLISECONDS = 30 * 60_000;

function assertNonNegativeInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${name} must be a non-negative safe integer`);
  }
}

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new TypeError(`${name} must be a positive safe integer`);
  }
}

export function evaluateJobRetry(
  input: JobRetryDecisionInput,
  policy: JobRetryPolicy = {},
): JobRetryDecision {
  assertPositiveInteger(input.attemptNo, "Job Retry attempt number");
  assertNonNegativeInteger(input.attemptCount, "Job Retry attempt count");
  assertPositiveInteger(input.maxAttempts, "Job Retry max attempts");

  const baseDelayMilliseconds = policy.baseDelayMilliseconds ?? DEFAULT_BASE_DELAY_MILLISECONDS;
  const maxDelayMilliseconds = policy.maxDelayMilliseconds ?? DEFAULT_MAX_DELAY_MILLISECONDS;
  assertPositiveInteger(baseDelayMilliseconds, "Job Retry base delay milliseconds");
  assertPositiveInteger(maxDelayMilliseconds, "Job Retry max delay milliseconds");

  if (!input.retryable) {
    return {
      deadLetterReason: "Job failure is not retryable",
      outcome: "dead_letter",
    };
  }
  if (input.attemptCount >= input.maxAttempts) {
    return {
      deadLetterReason: "Job retry attempts exhausted",
      outcome: "dead_letter",
    };
  }

  const exponentialDelay = baseDelayMilliseconds * 2 ** Math.max(input.attemptNo - 1, 0);
  const delayMilliseconds = Math.min(exponentialDelay, maxDelayMilliseconds);
  return {
    nextRetryAt: new Date(input.now.getTime() + delayMilliseconds),
    outcome: "retry",
  };
}
