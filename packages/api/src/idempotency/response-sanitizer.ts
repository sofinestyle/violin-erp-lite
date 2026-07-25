import type { IdempotencyJson, IdempotencySafeResponse } from "./types.js";

const SENSITIVE_KEY =
  /(authorization|cookie|password|token|secret|stack|sql|storage.?key|storage.?reference|url|email|phone|openid|unionid|ip.?address)/i;

function sanitize(value: unknown, seen: Set<object>): IdempotencyJson {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      throw new TypeError("Idempotency response contains a non-finite number");
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => sanitize(item, seen));
  if (typeof value === "object") {
    if (seen.has(value)) throw new TypeError("Idempotency response contains a cycle");
    seen.add(value);
    const result: Record<string, IdempotencyJson> = {};
    for (const [key, child] of Object.entries(value)) {
      if (SENSITIVE_KEY.test(key)) continue;
      if (child === undefined || typeof child === "function" || typeof child === "symbol") continue;
      result[key] = sanitize(child, seen);
    }
    seen.delete(value);
    return result;
  }
  throw new TypeError(`Idempotency response contains unsupported ${typeof value} data`);
}

export class IdempotencyResponseSanitizer {
  readonly #maximumBytes: number;

  constructor(maximumBytes: number) {
    if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 1) {
      throw new TypeError("Idempotency response size limit is invalid");
    }
    this.#maximumBytes = maximumBytes;
  }

  sanitize(response: IdempotencySafeResponse): IdempotencySafeResponse {
    if (
      !Number.isInteger(response.httpStatus) ||
      response.httpStatus < 100 ||
      response.httpStatus > 599
    ) {
      throw new TypeError("Idempotency response HTTP status is invalid");
    }
    if ((response.resourceId === undefined) !== (response.resourceType === undefined)) {
      throw new TypeError("Idempotency resource type and ID must be supplied together");
    }
    const body = sanitize(response.body, new Set());
    if (Buffer.byteLength(JSON.stringify(body), "utf8") > this.#maximumBytes) {
      throw new TypeError("Idempotency response exceeds the configured safe size");
    }
    return Object.freeze({ ...response, body });
  }
}
