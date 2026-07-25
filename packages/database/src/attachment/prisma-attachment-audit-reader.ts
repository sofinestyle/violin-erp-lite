import type { AttachmentAuditReader, AttachmentAuditRecord } from "@violin-erp/api";
import { getPrismaClient } from "../client.js";
import type { PrismaClient } from "../generated/prisma/client.js";

type AuditClient = Pick<PrismaClient, "audit_logs">;

function metadata(value: unknown): Readonly<Record<string, unknown>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return Object.freeze({});
  const snapshot = value as Record<string, unknown>;
  const nested = snapshot.metadata;
  if (!nested || typeof nested !== "object" || Array.isArray(nested)) return Object.freeze({});
  return Object.freeze({ ...(nested as Record<string, unknown>) });
}

function record(
  row: Awaited<ReturnType<AuditClient["audit_logs"]["findFirst"]>> extends infer T
    ? NonNullable<T>
    : never,
): AttachmentAuditRecord {
  return Object.freeze({
    event: row.action_code,
    metadata: metadata(row.after_snapshot),
    occurredAt: row.occurred_at,
    operatorId: row.user_id,
    reason: row.failure_reason,
    requestId: row.request_trace_id,
    result: row.operation_result === "success" ? "success" : "failure",
  });
}

export class PrismaAttachmentAuditReader implements AttachmentAuditReader {
  readonly #client: AuditClient;

  constructor(client: AuditClient = getPrismaClient()) {
    this.#client = client;
  }

  async findByRequestId(
    requestId: string,
    events: readonly string[],
  ): Promise<AttachmentAuditRecord | null> {
    const found = await this.#client.audit_logs.findFirst({
      orderBy: [{ occurred_at: "desc" }, { id: "desc" }],
      where: {
        action_code: { in: [...events] },
        module_code: "attachment",
        request_trace_id: requestId,
      },
    });
    return found ? record(found) : null;
  }

  async listByAttachment(attachmentId: string): Promise<readonly AttachmentAuditRecord[]> {
    const rows = await this.#client.audit_logs.findMany({
      orderBy: [{ occurred_at: "asc" }, { id: "asc" }],
      where: {
        module_code: "attachment",
        object_id: attachmentId,
      },
    });
    return Object.freeze(rows.map(record));
  }
}
