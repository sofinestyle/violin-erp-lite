export type EventRetryPolicy = Readonly<{
  baseDelayMilliseconds?: number;
  maxDelayMilliseconds?: number;
}>;

export type EventRetryDecisionInput = Readonly<{
  attemptCount: number;
  maxAttempts: number;
  now: Date;
  retryable: boolean;
}>;

export type EventRetryDecision =
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

export function evaluateEventRetry(
  input: EventRetryDecisionInput,
  policy: EventRetryPolicy = {},
): EventRetryDecision {
  assertNonNegativeInteger(input.attemptCount, "Event Retry attempt count");
  assertPositiveInteger(input.maxAttempts, "Event Retry max attempts");

  const baseDelayMilliseconds = policy.baseDelayMilliseconds ?? DEFAULT_BASE_DELAY_MILLISECONDS;
  const maxDelayMilliseconds = policy.maxDelayMilliseconds ?? DEFAULT_MAX_DELAY_MILLISECONDS;
  assertPositiveInteger(baseDelayMilliseconds, "Event Retry base delay milliseconds");
  assertPositiveInteger(maxDelayMilliseconds, "Event Retry max delay milliseconds");

  if (!input.retryable) {
    return {
      deadLetterReason: "Event failure is not retryable",
      outcome: "dead_letter",
    };
  }

  if (input.attemptCount >= input.maxAttempts) {
    return {
      deadLetterReason: "Event retry attempts exhausted",
      outcome: "dead_letter",
    };
  }

  const exponentialDelay = baseDelayMilliseconds * 2 ** Math.max(input.attemptCount - 1, 0);
  const delayMilliseconds = Math.min(exponentialDelay, maxDelayMilliseconds);

  return {
    nextRetryAt: new Date(input.now.getTime() + delayMilliseconds),
    outcome: "retry",
  };
}
