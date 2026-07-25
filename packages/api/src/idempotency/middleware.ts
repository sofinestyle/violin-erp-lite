import { AppError } from "../errors/app-error.js";
import { IdempotencyAdapter, type IdempotencyCommand } from "./idempotency.js";
import type { IdempotencySafeResponse } from "./types.js";

export function requireIdempotencyKey(request: Request): string {
  const key = request.headers.get("Idempotency-Key");
  if (!key || key.length > 512 || key.trim() !== key) {
    throw new AppError("VALIDATION_IDEMPOTENCY_KEY_REQUIRED", 422, "缺少有效 Idempotency-Key");
  }
  return key;
}

export class IdempotencyMiddleware {
  readonly #adapter: IdempotencyAdapter;

  constructor(adapter: IdempotencyAdapter) {
    this.#adapter = adapter;
  }

  execute(
    request: Request,
    command: Omit<IdempotencyCommand, "rawKey">,
  ): Promise<IdempotencySafeResponse> {
    return this.#adapter.execute({ ...command, rawKey: requireIdempotencyKey(request) });
  }
}
