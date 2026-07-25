import { randomUUID } from "node:crypto";
import {
  AttachmentAlreadyLinkedError,
  AttachmentNotFoundError,
  AttachmentStateConflictError,
} from "@violin-erp/api";
import { describe, expect, it, vi } from "vitest";
import { PrismaAttachmentLinkRepository } from "../src/attachment/prisma-attachment-link-repository";
import {
  PRISMA_ATTACHMENT_OBJECT_TYPES,
  PrismaAttachmentObjectReader,
} from "../src/attachment/prisma-attachment-object-reader";
import { PrismaAttachmentRepository } from "../src/attachment/prisma-attachment-repository";
import { Prisma, type PrismaClient } from "../src/generated/prisma/client";

const NOW = new Date("2026-07-25T00:00:00.000Z");
const USER_ID = "11111111-1111-4111-8111-111111111111";

function attachmentRow(overrides: Record<string, unknown> = {}) {
  return {
    checksum: "a".repeat(64),
    created_at: NOW,
    created_by: USER_ID,
    file_extension: "pdf",
    file_size: 100n,
    id: randomUUID(),
    is_sensitive: false,
    mime_type: "application/pdf",
    original_file_name: "test.pdf",
    status: "active",
    storage_reference: "storage-key",
    stored_file_name: "opaque-name",
    updated_at: NOW,
    updated_by: USER_ID,
    uploaded_at: NOW,
    uploaded_by: USER_ID,
    ...overrides,
  };
}

function linkRow(overrides: Record<string, unknown> = {}) {
  return {
    attachment_category: "general_business_document",
    attachment_id: randomUUID(),
    created_at: NOW,
    created_by: USER_ID,
    id: randomUUID(),
    linked_at: NOW,
    linked_by: USER_ID,
    object_id: randomUUID(),
    object_item_id: null,
    object_type: "purchase_order",
    sort_order: 0,
    updated_at: NOW,
    updated_by: USER_ID,
    ...overrides,
  };
}

describe("Prisma Attachment repository", () => {
  it("creates and maps the Frozen attachment record", async () => {
    const row = attachmentRow();
    const create = vi.fn().mockResolvedValue(row);
    const repository = new PrismaAttachmentRepository({
      attachments: { create },
    } as unknown as PrismaClient);
    await expect(
      repository.create({
        checksum: row.checksum,
        createdBy: USER_ID,
        fileExtension: "pdf",
        fileSize: 100n,
        isSensitive: false,
        mimeType: "application/pdf",
        originalFileName: "test.pdf",
        storageReference: "storage-key",
        storedFileName: "opaque-name",
        uploadedAt: NOW,
        uploadedBy: USER_ID,
      }),
    ).resolves.toMatchObject({ id: row.id, status: "active" });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "active" }) }),
    );
  });

  it("updates lifecycle status with status and updatedAt compare-and-set", async () => {
    const updated = attachmentRow({
      status: "soft_deleted",
      updated_at: new Date(NOW.getTime() + 1),
    });
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const findUnique = vi.fn().mockResolvedValue(updated);
    const repository = new PrismaAttachmentRepository({
      attachments: { findUnique, updateMany },
    } as unknown as PrismaClient);
    await expect(
      repository.softDelete({
        expectedStatus: "active",
        expectedUpdatedAt: NOW,
        id: updated.id,
        nextStatus: "soft_deleted",
        now: updated.updated_at,
        updatedBy: USER_ID,
      }),
    ).resolves.toMatchObject({ status: "soft_deleted" });
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: updated.id, status: "active", updated_at: NOW },
      }),
    );
  });

  it("distinguishes missing rows from lifecycle conflicts", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const count = vi.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(1);
    const repository = new PrismaAttachmentRepository({
      attachments: { count, updateMany },
    } as unknown as PrismaClient);
    const mutation = {
      expectedStatus: "active" as const,
      expectedUpdatedAt: NOW,
      id: randomUUID(),
      nextStatus: "soft_deleted" as const,
      now: new Date(NOW.getTime() + 1),
      updatedBy: USER_ID,
    };
    await expect(repository.updateStatus(mutation)).rejects.toBeInstanceOf(AttachmentNotFoundError);
    await expect(repository.updateStatus(mutation)).rejects.toBeInstanceOf(
      AttachmentStateConflictError,
    );
  });
});

describe("Prisma Attachment Link repository", () => {
  it("relies on the database unique constraint and maps P2002", async () => {
    const create = vi.fn().mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("unique", {
        clientVersion: "7.9.0",
        code: "P2002",
      }),
    );
    const repository = new PrismaAttachmentLinkRepository({
      attachment_links: { create },
    } as unknown as PrismaClient);
    await expect(
      repository.create({
        attachmentCategory: "general_business_document",
        attachmentId: randomUUID(),
        createdBy: USER_ID,
        linkedAt: NOW,
        linkedBy: USER_ID,
        objectId: randomUUID(),
        objectType: "purchase_order",
        sortOrder: 0,
      }),
    ).rejects.toBeInstanceOf(AttachmentAlreadyLinkedError);
    expect(create).toHaveBeenCalledOnce();
  });

  it("lists links through repository ordering", async () => {
    const row = linkRow();
    const findMany = vi.fn().mockResolvedValue([row]);
    const repository = new PrismaAttachmentLinkRepository({
      attachment_links: { findMany },
    } as unknown as PrismaClient);
    await expect(repository.listByAttachment(row.attachment_id)).resolves.toMatchObject([
      { id: row.id, objectType: "purchase_order" },
    ]);
  });
});

describe("Prisma Attachment Object reader", () => {
  it("maps all 17 Frozen Object Types without a service-level switch", () => {
    expect(PRISMA_ATTACHMENT_OBJECT_TYPES).toHaveLength(17);
  });

  it("loads the object and validates item ownership through configured delegates", async () => {
    const findUnique = vi.fn().mockResolvedValue({
      approved_at: null,
      cancelled_by: null,
      created_by: USER_ID,
      id: "22222222-2222-4222-8222-222222222222",
      status: "draft",
      submitted_at: null,
      updated_at: NOW,
    });
    const findFirst = vi.fn().mockResolvedValue({
      id: "33333333-3333-4333-8333-333333333333",
      purchase_order_id: "22222222-2222-4222-8222-222222222222",
    });
    const reader = new PrismaAttachmentObjectReader({
      purchase_order_items: { findFirst },
      purchase_orders: { findUnique },
    } as unknown as PrismaClient);
    await expect(
      reader.load(
        "purchase_order",
        "22222222-2222-4222-8222-222222222222",
        "33333333-3333-4333-8333-333333333333",
      ),
    ).resolves.toMatchObject({
      itemExists: true,
      objectType: "purchase_order",
      protectionActivated: false,
      state: "draft",
    });
  });
});
