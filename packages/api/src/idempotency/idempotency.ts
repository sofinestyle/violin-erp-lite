import { AppError } from "../errors/app-error.js";
import type { IdempotencyConfiguration } from "./configuration.js";
import {
  CanonicalRequestHasher,
  IdempotencyKeyHasher,
  type CanonicalRequestInput,
} from "./hashing.js";
import { IdempotencyResponseSanitizer } from "./response-sanitizer.js";
import { IdempotencyScopeResolver, type IdempotencyScopeInput } from "./scope.js";
import type {
  IdempotencyExecutionResult,
  IdempotencyRecord,
  IdempotencyReconciliationStrategy,
  IdempotencyRepository,
  IdempotencySafeResponse,
} from "./types.js";

export class IdempotencyReplayError extends AppError {
  readonly retryAfterSeconds: number | undefined;

  constructor(retryAfterSeconds?: number) {
    super("SECURITY_REPLAY_DETECTED", 409, "请求正在处理或幂等键已用于其他请求");
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export type IdempotencyCommand = Readonly<{
  authorize: () => Promise<void> | void;
  operation: () => Promise<IdempotencyExecutionResult>;
  rawKey: string;
  reconciliation: IdempotencyReconciliationStrategy;
  request: CanonicalRequestInput;
  requestTraceId: string;
  scope: IdempotencyScopeInput;
}>;

export type IdempotencyAdapterDependencies = Readonly<{
  canonicalRequestHasher?: CanonicalRequestHasher;
  clock?: () => Date;
  keyHasher?: IdempotencyKeyHasher;
  responseSanitizer?: IdempotencyResponseSanitizer;
  scopeResolver?: IdempotencyScopeResolver;
}>;

export class IdempotencyAdapter {
  readonly #canonicalRequestHasher: CanonicalRequestHasher;
  readonly #clock: () => Date;
  readonly #configuration: IdempotencyConfiguration;
  readonly #keyHasher: IdempotencyKeyHasher;
  readonly #repository: IdempotencyRepository;
  readonly #responseSanitizer: IdempotencyResponseSanitizer;
  readonly #scopeResolver: IdempotencyScopeResolver;

  constructor(
    repository: IdempotencyRepository,
    configuration: IdempotencyConfiguration,
    dependencies: IdempotencyAdapterDependencies = {},
  ) {
    this.#repository = repository;
    this.#configuration = configuration;
    this.#clock = dependencies.clock ?? (() => new Date());
    this.#keyHasher = dependencies.keyHasher ?? new IdempotencyKeyHasher(configuration.hmacSecret);
    this.#canonicalRequestHasher =
      dependencies.canonicalRequestHasher ?? new CanonicalRequestHasher();
    this.#scopeResolver = dependencies.scopeResolver ?? new IdempotencyScopeResolver();
    this.#responseSanitizer =
      dependencies.responseSanitizer ??
      new IdempotencyResponseSanitizer(configuration.maxResponseBytes);
  }

  async execute(command: IdempotencyCommand): Promise<IdempotencySafeResponse> {
    await command.authorize();
    const scopeCode = this.#scopeResolver.resolve(command.scope);
    const idempotencyKeyHash = this.#keyHasher.hash(command.rawKey);
    const requestHash = this.#canonicalRequestHasher.hash(command.request);
    const now = this.#clock();
    const result = await this.#repository.claim({
      expiresAt: new Date(now.getTime() + this.#configuration.retentionMilliseconds),
      idempotencyKeyHash,
      lockedUntil: new Date(now.getTime() + this.#configuration.leaseMilliseconds),
      now,
      requestHash,
      requestTraceId: command.requestTraceId,
      scopeCode,
    });
    if (result.kind === "claimed") {
      return this.#executeClaimed(result.record, command);
    }
    return this.#handleExisting(result.record, requestHash, command);
  }

  async #executeClaimed(
    record: IdempotencyRecord,
    command: IdempotencyCommand,
  ): Promise<IdempotencySafeResponse> {
    const result = await command.operation();
    const response = this.#responseSanitizer.sanitize(result.response);
    if (response.requestTraceId !== record.requestTraceId) {
      throw new TypeError("Safe response Request ID must match the idempotency claim owner");
    }
    const terminal = await this.#repository[result.outcome === "completed" ? "complete" : "fail"]({
      id: record.id,
      now: this.#clock(),
      ownerTraceId: record.requestTraceId,
      requestHash: record.requestHash,
      response,
    });
    if (!terminal?.response) throw new IdempotencyReplayError();
    return terminal.response;
  }

  async #handleExisting(
    record: IdempotencyRecord,
    requestHash: string,
    command: IdempotencyCommand,
  ): Promise<IdempotencySafeResponse> {
    if (record.requestHash !== requestHash) throw new IdempotencyReplayError();
    await command.authorize();
    if (record.status !== "processing") {
      if (!record.response) throw new IdempotencyReplayError();
      return record.response;
    }
    const now = this.#clock();
    if (!record.lockedUntil || record.lockedUntil.getTime() > now.getTime()) {
      throw new IdempotencyReplayError(
        record.lockedUntil
          ? Math.max(1, Math.ceil((record.lockedUntil.getTime() - now.getTime()) / 1_000))
          : undefined,
      );
    }

    const reconciled = await command.reconciliation.reconcileExpiredProcessing(record);
    if (reconciled.outcome === "unresolved") throw new IdempotencyReplayError();
    if (reconciled.outcome === "retry") {
      const reclaimed = await this.#repository.reclaimExpired({
        id: record.id,
        lockedUntil: new Date(now.getTime() + this.#configuration.leaseMilliseconds),
        now,
        requestHash,
        requestTraceId: command.requestTraceId,
      });
      if (reclaimed) return this.#executeClaimed(reclaimed, command);
    } else {
      const response = this.#responseSanitizer.sanitize(reconciled.response);
      const terminal = await this.#repository.finalizeExpired(reconciled.outcome, {
        id: record.id,
        now,
        requestHash,
        response,
      });
      if (terminal?.response) return terminal.response;
    }

    const current = await this.#repository.find(record.scopeCode, record.idempotencyKeyHash);
    if (current && current.status !== "processing" && current.response) return current.response;
    throw new IdempotencyReplayError();
  }
}
