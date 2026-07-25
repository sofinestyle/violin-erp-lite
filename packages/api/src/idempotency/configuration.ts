export type IdempotencyConfiguration = Readonly<{
  hmacSecret: string;
  leaseMilliseconds: number;
  maxResponseBytes: number;
  retentionMilliseconds: number;
}>;

function requiredSecret(value: string | undefined): string {
  if (!value || value.length < 32) {
    throw new Error("IDEMPOTENCY_HMAC_SECRET must contain at least 32 characters");
  }
  return value;
}

function positiveInteger(
  value: string | undefined,
  fallback: number,
  name: string,
  maximum: number,
): number {
  const parsed = value === undefined || value === "" ? fallback : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw new Error(`${name} must be a positive integer no greater than ${maximum}`);
  }
  return parsed;
}

export function loadIdempotencyConfiguration(
  environment: NodeJS.ProcessEnv = process.env,
): IdempotencyConfiguration {
  const leaseSeconds = positiveInteger(
    environment.IDEMPOTENCY_LEASE_SECONDS,
    30,
    "IDEMPOTENCY_LEASE_SECONDS",
    3_600,
  );
  const retentionSeconds = positiveInteger(
    environment.IDEMPOTENCY_RETENTION_SECONDS,
    86_400,
    "IDEMPOTENCY_RETENTION_SECONDS",
    2_592_000,
  );
  if (retentionSeconds <= leaseSeconds) {
    throw new Error("IDEMPOTENCY_RETENTION_SECONDS must exceed IDEMPOTENCY_LEASE_SECONDS");
  }

  return Object.freeze({
    hmacSecret: requiredSecret(environment.IDEMPOTENCY_HMAC_SECRET),
    leaseMilliseconds: leaseSeconds * 1_000,
    maxResponseBytes: positiveInteger(
      environment.IDEMPOTENCY_MAX_RESPONSE_BYTES,
      65_536,
      "IDEMPOTENCY_MAX_RESPONSE_BYTES",
      1_048_576,
    ),
    retentionMilliseconds: retentionSeconds * 1_000,
  });
}
