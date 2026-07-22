import type { AuditWriter, AuditValue, SanitizedAuditEvent } from "@violin-erp/api";
import { getPrismaClient } from "../client.js";
import { Prisma, type PrismaClient } from "../generated/prisma/client.js";

type AuditPrismaClient = Pick<PrismaClient, "audit_logs">;

function snapshotWithMetadata(
  snapshot: AuditValue | undefined,
  metadata: AuditValue | undefined,
): AuditValue | undefined {
  if (metadata === undefined) {
    return snapshot;
  }

  if (snapshot === undefined) {
    return { metadata };
  }

  return { metadata, snapshot };
}

function toPrismaJson(
  value: AuditValue,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  return value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
}

export class PrismaAuditWriter implements AuditWriter {
  readonly #client: AuditPrismaClient;

  constructor(client: AuditPrismaClient = getPrismaClient()) {
    this.#client = client;
  }

  async write(event: SanitizedAuditEvent): Promise<void> {
    const afterSnapshot = snapshotWithMetadata(event.afterSnapshot, event.metadata);

    const data: Prisma.audit_logsUncheckedCreateInput = {
      occurred_at: event.timestamp,
      action_code: event.action,
      module_code: event.moduleCode,
      object_type: event.resourceType,
      object_id: event.resourceId,
      operation_result: event.result,
      request_trace_id: event.requestId,
      ...(event.actorUserId === undefined ? {} : { user_id: event.actorUserId }),
      ...(event.usernameSnapshot === undefined
        ? {}
        : { username_snapshot: event.usernameSnapshot }),
      ...(event.resourceNoSnapshot === undefined
        ? {}
        : { object_no_snapshot: event.resourceNoSnapshot }),
      ...(event.beforeSnapshot === undefined
        ? {}
        : { before_snapshot: toPrismaJson(event.beforeSnapshot) }),
      ...(afterSnapshot === undefined ? {} : { after_snapshot: toPrismaJson(afterSnapshot) }),
      ...(event.ipAddress === undefined ? {} : { ip_address: event.ipAddress }),
      ...(event.userAgent === undefined ? {} : { device_info: event.userAgent }),
      ...(event.result === "failure" ? { failure_reason: event.failureReason } : {}),
    };

    await this.#client.audit_logs.create({
      data,
    });
  }
}
