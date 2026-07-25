import {
  ATTACHMENT_STATUSES,
  AttachmentNotFoundError,
  AttachmentStateConflictError,
  type AttachmentRecord,
  type AttachmentRepository,
  type AttachmentStatus,
  type AttachmentStatusMutation,
  type CreateAttachmentInput,
  type FindAttachmentsInput,
} from "@violin-erp/api";
import { getPrismaClient } from "../client.js";
import type { PrismaClient } from "../generated/prisma/client.js";

type AttachmentRow = NonNullable<Awaited<ReturnType<PrismaClient["attachments"]["findUnique"]>>>;

const statusSet = new Set<string>(ATTACHMENT_STATUSES);

function status(value: string): AttachmentStatus {
  if (!statusSet.has(value)) throw new Error("Database returned an unsupported attachment status");
  return value as AttachmentStatus;
}

function record(row: AttachmentRow): AttachmentRecord {
  return Object.freeze({
    checksum: row.checksum,
    createdAt: row.created_at,
    createdBy: row.created_by,
    fileExtension: row.file_extension,
    fileSize: row.file_size,
    id: row.id,
    isSensitive: row.is_sensitive,
    mimeType: row.mime_type,
    originalFileName: row.original_file_name,
    status: status(row.status),
    storageReference: row.storage_reference,
    storedFileName: row.stored_file_name,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    uploadedAt: row.uploaded_at,
    uploadedBy: row.uploaded_by,
  });
}

function assertTarget(input: AttachmentStatusMutation, expected: AttachmentStatus): void {
  if (input.nextStatus !== expected) {
    throw new TypeError(`Attachment mutation must target ${expected}`);
  }
}

export class PrismaAttachmentRepository implements AttachmentRepository {
  readonly #client: PrismaClient;

  constructor(client: PrismaClient = getPrismaClient()) {
    this.#client = client;
  }

  async create(input: CreateAttachmentInput): Promise<AttachmentRecord> {
    const created = await this.#client.attachments.create({
      data: {
        checksum: input.checksum,
        created_by: input.createdBy,
        file_extension: input.fileExtension,
        file_size: input.fileSize,
        is_sensitive: input.isSensitive,
        mime_type: input.mimeType,
        original_file_name: input.originalFileName,
        status: "active",
        storage_reference: input.storageReference,
        stored_file_name: input.storedFileName,
        updated_by: input.createdBy,
        uploaded_at: input.uploadedAt,
        uploaded_by: input.uploadedBy,
      },
    });
    return record(created);
  }

  async findById(id: string): Promise<AttachmentRecord | null> {
    const found = await this.#client.attachments.findUnique({ where: { id } });
    return found ? record(found) : null;
  }

  async findMany(input: FindAttachmentsInput = {}): Promise<readonly AttachmentRecord[]> {
    const rows = await this.#client.attachments.findMany({
      orderBy: [{ uploaded_at: "desc" }, { id: "desc" }],
      ...(input.skip === undefined ? {} : { skip: input.skip }),
      ...(input.take === undefined ? {} : { take: input.take }),
      where: {
        ...(input.ids ? { id: { in: [...input.ids] } } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.uploadedBy ? { uploaded_by: input.uploadedBy } : {}),
      },
    });
    return Object.freeze(rows.map(record));
  }

  async exists(id: string): Promise<boolean> {
    return (await this.#client.attachments.count({ where: { id } })) > 0;
  }

  async updateStatus(input: AttachmentStatusMutation): Promise<AttachmentRecord> {
    const updated = await this.#client.attachments.updateMany({
      data: {
        status: input.nextStatus,
        updated_at: input.now,
        updated_by: input.updatedBy,
      },
      where: {
        id: input.id,
        status: input.expectedStatus,
        updated_at: input.expectedUpdatedAt,
      },
    });
    if (updated.count !== 1) {
      if (!(await this.exists(input.id))) throw new AttachmentNotFoundError();
      throw new AttachmentStateConflictError();
    }
    const found = await this.#client.attachments.findUnique({ where: { id: input.id } });
    if (!found) throw new AttachmentNotFoundError();
    return record(found);
  }

  softDelete(input: AttachmentStatusMutation): Promise<AttachmentRecord> {
    assertTarget(input, "soft_deleted");
    return this.updateStatus(input);
  }

  markPendingPhysicalDelete(input: AttachmentStatusMutation): Promise<AttachmentRecord> {
    assertTarget(input, "pending_physical_delete");
    return this.updateStatus(input);
  }

  markPhysicalDeleteFailed(input: AttachmentStatusMutation): Promise<AttachmentRecord> {
    assertTarget(input, "physical_delete_failed");
    return this.updateStatus(input);
  }

  markPhysicallyDeleted(input: AttachmentStatusMutation): Promise<AttachmentRecord> {
    assertTarget(input, "physically_deleted");
    return this.updateStatus(input);
  }
}
