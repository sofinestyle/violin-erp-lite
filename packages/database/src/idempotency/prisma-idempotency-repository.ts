import type {
  IdempotencyClaimInput,
  IdempotencyClaimResult,
  IdempotencyExpiredTerminalInput,
  IdempotencyJson,
  IdempotencyReclaimInput,
  IdempotencyRecord,
  IdempotencyRepository,
  IdempotencySafeResponse,
  IdempotencyStatus,
  IdempotencyTerminalInput,
} from "@violin-erp/api";
import { getPrismaClient } from "../client.js";
import { Prisma, type PrismaClient } from "../generated/prisma/client.js";

type IdempotencyRow =
  Awaited<ReturnType<PrismaClient["idempotency_records"]["findUnique"]>> extends infer Result
    ? NonNullable<Result>
    : never;

function response(row: IdempotencyRow): IdempotencySafeResponse | null {
  if (row.status === "processing" || row.response_http_status === null) return null;
  return {
    body: row.response_body as IdempotencyJson,
    httpStatus: row.response_http_status,
    requestTraceId: row.request_trace_id,
    ...(row.resource_id && row.resource_type
      ? { resourceId: row.resource_id, resourceType: row.resource_type }
      : {}),
  };
}

function record(row: IdempotencyRow): IdempotencyRecord {
  if (!["completed", "failed", "processing"].includes(row.status)) {
    throw new Error("Database returned an unsupported idempotency status");
  }
  return {
    completedAt: row.completed_at,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    id: row.id,
    idempotencyKeyHash: row.idempotency_key_hash,
    lockedUntil: row.locked_until,
    requestHash: row.request_hash,
    requestTraceId: row.request_trace_id,
    response: response(row),
    scopeCode: row.scope_code,
    status: row.status as IdempotencyStatus,
    updatedAt: row.updated_at,
  };
}

function json(value: IdempotencyJson): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
}

function terminalData(
  status: Exclude<IdempotencyStatus, "processing">,
  safeResponse: IdempotencySafeResponse,
  now: Date,
) {
  return {
    completed_at: now,
    locked_until: null,
    resource_id: safeResponse.resourceId ?? null,
    resource_type: safeResponse.resourceType ?? null,
    response_body: json(safeResponse.body),
    response_http_status: safeResponse.httpStatus,
    status,
    updated_at: now,
  } as const;
}

function uniqueConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export class PrismaIdempotencyRepository implements IdempotencyRepository {
  readonly #client: PrismaClient;

  constructor(client: PrismaClient = getPrismaClient()) {
    this.#client = client;
  }

  async claim(input: IdempotencyClaimInput): Promise<IdempotencyClaimResult> {
    try {
      const created = await this.#client.idempotency_records.create({
        data: {
          created_at: input.now,
          expires_at: input.expiresAt,
          idempotency_key_hash: input.idempotencyKeyHash,
          locked_until: input.lockedUntil,
          request_hash: input.requestHash,
          request_trace_id: input.requestTraceId,
          scope_code: input.scopeCode,
          status: "processing",
          updated_at: input.now,
        },
      });
      return { kind: "claimed", record: record(created) };
    } catch (error) {
      if (!uniqueConflict(error)) throw error;
      const existing = await this.find(input.scopeCode, input.idempotencyKeyHash);
      if (!existing) throw error;
      return { kind: "existing", record: existing };
    }
  }

  async find(scopeCode: string, idempotencyKeyHash: string): Promise<IdempotencyRecord | null> {
    const found = await this.#client.idempotency_records.findUnique({
      where: {
        scope_code_idempotency_key_hash: {
          idempotency_key_hash: idempotencyKeyHash,
          scope_code: scopeCode,
        },
      },
    });
    return found ? record(found) : null;
  }

  complete(input: IdempotencyTerminalInput): Promise<IdempotencyRecord | null> {
    return this.#terminal("completed", input);
  }

  fail(input: IdempotencyTerminalInput): Promise<IdempotencyRecord | null> {
    return this.#terminal("failed", input);
  }

  async #terminal(
    status: Exclude<IdempotencyStatus, "processing">,
    input: IdempotencyTerminalInput,
  ): Promise<IdempotencyRecord | null> {
    const updated = await this.#client.idempotency_records.updateMany({
      data: terminalData(status, input.response, input.now),
      where: {
        expires_at: { gt: input.now },
        id: input.id,
        request_hash: input.requestHash,
        request_trace_id: input.ownerTraceId,
        status: "processing",
      },
    });
    if (updated.count !== 1) return null;
    const found = await this.#client.idempotency_records.findUnique({ where: { id: input.id } });
    return found ? record(found) : null;
  }

  async finalizeExpired(
    status: Exclude<IdempotencyStatus, "processing">,
    input: IdempotencyExpiredTerminalInput,
  ): Promise<IdempotencyRecord | null> {
    const updated = await this.#client.idempotency_records.updateMany({
      data: terminalData(status, input.response, input.now),
      where: {
        expires_at: { gt: input.now },
        id: input.id,
        locked_until: { lte: input.now },
        request_hash: input.requestHash,
        status: "processing",
      },
    });
    if (updated.count !== 1) return null;
    const found = await this.#client.idempotency_records.findUnique({ where: { id: input.id } });
    return found ? record(found) : null;
  }

  async reclaimExpired(input: IdempotencyReclaimInput): Promise<IdempotencyRecord | null> {
    const updated = await this.#client.idempotency_records.updateMany({
      data: {
        locked_until: input.lockedUntil,
        request_trace_id: input.requestTraceId,
        updated_at: input.now,
      },
      where: {
        expires_at: { gt: input.lockedUntil },
        id: input.id,
        locked_until: { lte: input.now },
        request_hash: input.requestHash,
        status: "processing",
      },
    });
    if (updated.count !== 1) return null;
    const found = await this.#client.idempotency_records.findUnique({ where: { id: input.id } });
    return found ? record(found) : null;
  }

  async removeExpiredTerminalRecords(before: Date, limit: number): Promise<number> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 10_000) {
      throw new TypeError("Idempotency cleanup limit is invalid");
    }
    const candidates = await this.#client.idempotency_records.findMany({
      select: { id: true },
      take: limit,
      where: {
        expires_at: { lte: before },
        status: { in: ["completed", "failed"] },
      },
    });
    if (candidates.length === 0) return 0;
    const deleted = await this.#client.idempotency_records.deleteMany({
      where: { id: { in: candidates.map(({ id }) => id) } },
    });
    return deleted.count;
  }
}
