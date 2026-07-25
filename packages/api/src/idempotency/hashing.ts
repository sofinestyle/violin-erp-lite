import { createHash, createHmac } from "node:crypto";

const SENSITIVE_KEY = /(authorization|cookie|password|secret|token)/i;

export type CanonicalRequestInput = Readonly<{
  action: string;
  authenticationScope: unknown;
  body?: unknown;
  fileChecksum?: string;
  method: string;
  path: Readonly<Record<string, unknown>>;
  query: Readonly<Record<string, unknown>>;
  storeId?: string;
  warehouseId?: string;
}>;

function canonical(value: unknown, propertyName?: string): string {
  if (propertyName && SENSITIVE_KEY.test(propertyName.replaceAll(/[-_]/g, ""))) {
    return '["excluded"]';
  }
  if (value === undefined) return '["undefined"]';
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      throw new TypeError("Canonical request contains a non-finite number");
    return Object.is(value, -0) ? "0" : JSON.stringify(value);
  }
  if (typeof value === "bigint") return `["bigint",${JSON.stringify(value.toString())}]`;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime()))
      throw new TypeError("Canonical request contains an invalid date");
    return `["date",${JSON.stringify(value.toISOString())}]`;
  }
  if (Array.isArray(value)) return `[${value.map((item) => canonical(item)).join(",")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonical(child, key)}`);
    return `{${entries.join(",")}}`;
  }
  throw new TypeError(`Canonical request contains unsupported ${typeof value} data`);
}

export function canonicalizeRequest(input: CanonicalRequestInput): string {
  return canonical({
    action: input.action,
    authenticationScope: input.authenticationScope,
    body: input.body,
    fileChecksum: input.fileChecksum,
    method: input.method.toUpperCase(),
    path: input.path,
    query: input.query,
    storeId: input.storeId,
    warehouseId: input.warehouseId,
  });
}

export class IdempotencyKeyHasher {
  readonly #secret: string;

  constructor(secret: string) {
    if (secret.length < 32) throw new TypeError("Idempotency HMAC secret is invalid");
    this.#secret = secret;
  }

  hash(rawKey: string): string {
    if (!rawKey || rawKey.length > 512) throw new TypeError("Idempotency-Key is invalid");
    return createHmac("sha256", this.#secret).update(rawKey, "utf8").digest("hex");
  }
}

export class CanonicalRequestHasher {
  hash(input: CanonicalRequestInput): string {
    return createHash("sha256").update(canonicalizeRequest(input), "utf8").digest("hex");
  }
}
