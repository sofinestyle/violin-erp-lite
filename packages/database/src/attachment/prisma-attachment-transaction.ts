import type {
  AttachmentTransactionContext,
  AttachmentTransactionRunner,
  AttachmentUploadReceiptReader,
} from "@violin-erp/api";
import { PrismaAuditWriter } from "../audit/prisma-audit-writer.js";
import { getPrismaClient } from "../client.js";
import type { PrismaClient } from "../generated/prisma/client.js";
import { Prisma } from "../generated/prisma/client.js";
import { PrismaAttachmentLinkRepository } from "./prisma-attachment-link-repository.js";
import { PrismaAttachmentRepository } from "./prisma-attachment-repository.js";

export class PrismaAttachmentTransactionRunner implements AttachmentTransactionRunner {
  readonly #client: PrismaClient;

  constructor(client: PrismaClient = getPrismaClient()) {
    this.#client = client;
  }

  run<T>(operation: (context: AttachmentTransactionContext) => Promise<T>): Promise<T> {
    return this.#client.$transaction((transaction) =>
      operation({
        attachments: new PrismaAttachmentRepository(transaction),
        audit: new PrismaAuditWriter(transaction),
        links: new PrismaAttachmentLinkRepository(transaction),
        lockAttachment: async (id) => {
          await transaction.$queryRaw(
            Prisma.sql`SELECT id FROM attachments WHERE id = ${id}::uuid FOR UPDATE`,
          );
        },
        lockAttachmentLink: async (attachmentId, linkId) => {
          await transaction.$queryRaw(
            Prisma.sql`SELECT id FROM attachment_links WHERE id = ${linkId}::uuid AND attachment_id = ${attachmentId}::uuid FOR UPDATE`,
          );
        },
        lockAttachmentLinks: async (attachmentId) => {
          await transaction.$queryRaw(
            Prisma.sql`SELECT id FROM attachment_links WHERE attachment_id = ${attachmentId}::uuid FOR UPDATE`,
          );
        },
      }),
    );
  }
}

export class PrismaAttachmentUploadReceiptReader implements AttachmentUploadReceiptReader {
  readonly #client: Pick<PrismaClient, "audit_logs">;

  constructor(client: Pick<PrismaClient, "audit_logs"> = getPrismaClient()) {
    this.#client = client;
  }

  async findAttachmentIdByRequestId(requestId: string): Promise<string | null> {
    const receipt = await this.#client.audit_logs.findFirst({
      orderBy: { created_at: "asc" },
      select: { object_id: true },
      where: {
        action_code: "attachment.upload.succeeded",
        module_code: "attachment",
        operation_result: "success",
        request_trace_id: requestId,
      },
    });
    return receipt?.object_id ?? null;
  }
}
