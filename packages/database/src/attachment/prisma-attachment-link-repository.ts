import {
  AttachmentAlreadyLinkedError,
  AttachmentCategoryRegistry,
  type AttachmentLinkRecord,
  type AttachmentLinkRepository,
  type AttachmentObjectType,
  type CreateAttachmentLinkInput,
} from "@violin-erp/api";
import { getPrismaClient } from "../client.js";
import { Prisma, type PrismaClient } from "../generated/prisma/client.js";

type AttachmentLinkRow = NonNullable<
  Awaited<ReturnType<PrismaClient["attachment_links"]["findUnique"]>>
>;
type AttachmentLinkPrismaClient = Pick<PrismaClient, "attachment_links">;

const categories = new AttachmentCategoryRegistry();

function record(row: AttachmentLinkRow): AttachmentLinkRecord {
  return Object.freeze({
    attachmentCategory: categories.requireCategory(row.attachment_category),
    attachmentId: row.attachment_id,
    createdAt: row.created_at,
    createdBy: row.created_by,
    id: row.id,
    linkedAt: row.linked_at,
    linkedBy: row.linked_by,
    objectId: row.object_id,
    objectItemId: row.object_item_id,
    objectType: categories.requireObjectType(row.object_type),
    sortOrder: row.sort_order,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  });
}

function uniqueConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export class PrismaAttachmentLinkRepository implements AttachmentLinkRepository {
  readonly #client: AttachmentLinkPrismaClient;

  constructor(client: AttachmentLinkPrismaClient = getPrismaClient()) {
    this.#client = client;
  }

  async create(input: CreateAttachmentLinkInput): Promise<AttachmentLinkRecord> {
    try {
      const created = await this.#client.attachment_links.create({
        data: {
          attachment_category: input.attachmentCategory,
          attachment_id: input.attachmentId,
          created_by: input.createdBy,
          linked_at: input.linkedAt,
          linked_by: input.linkedBy,
          object_id: input.objectId,
          object_item_id: input.objectItemId ?? null,
          object_type: input.objectType,
          sort_order: input.sortOrder,
          updated_by: input.createdBy,
        },
      });
      return record(created);
    } catch (error) {
      if (uniqueConflict(error)) throw new AttachmentAlreadyLinkedError();
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    return (await this.#client.attachment_links.deleteMany({ where: { id } })).count === 1;
  }

  async exists(id: string): Promise<boolean> {
    return (await this.#client.attachment_links.count({ where: { id } })) > 0;
  }

  async listByAttachment(attachmentId: string): Promise<readonly AttachmentLinkRecord[]> {
    const rows = await this.#client.attachment_links.findMany({
      orderBy: [{ sort_order: "asc" }, { linked_at: "asc" }, { id: "asc" }],
      where: { attachment_id: attachmentId },
    });
    return Object.freeze(rows.map(record));
  }

  async listByObject(
    objectType: AttachmentObjectType,
    objectId: string,
    objectItemId?: string | null,
  ): Promise<readonly AttachmentLinkRecord[]> {
    const rows = await this.#client.attachment_links.findMany({
      orderBy: [{ sort_order: "asc" }, { linked_at: "asc" }, { id: "asc" }],
      where: {
        object_id: objectId,
        ...(objectItemId === undefined ? {} : { object_item_id: objectItemId }),
        object_type: objectType,
      },
    });
    return Object.freeze(rows.map(record));
  }

  countByAttachment(attachmentId: string): Promise<number> {
    return this.#client.attachment_links.count({ where: { attachment_id: attachmentId } });
  }
}
