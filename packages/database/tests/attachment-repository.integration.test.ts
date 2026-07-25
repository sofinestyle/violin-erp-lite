import { randomUUID } from "node:crypto";
import { AttachmentAlreadyLinkedError, AttachmentLifecycle } from "@violin-erp/api";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaAttachmentLinkRepository } from "../src/attachment/prisma-attachment-link-repository";
import { PrismaAttachmentRepository } from "../src/attachment/prisma-attachment-repository";
import { createPrismaClient } from "../src/client";

const databaseUrl = process.env.ATTACHMENT_INTEGRATION_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;
const client = databaseUrl ? createPrismaClient(databaseUrl) : null;
const attachments = client ? new PrismaAttachmentRepository(client) : null;
const links = client ? new PrismaAttachmentLinkRepository(client) : null;
const lifecycle = new AttachmentLifecycle();
let userId = "";
const createdAttachmentIds: string[] = [];

integration("PostgreSQL Attachment repositories", () => {
  beforeAll(async () => {
    const user = await client!.users.findFirst({
      orderBy: { created_at: "asc" },
      select: { id: true },
    });
    if (!user) throw new Error("Attachment integration requires the idempotent development seed");
    userId = user.id;
  });

  afterAll(async () => {
    if (createdAttachmentIds.length > 0) {
      await client!.attachment_links.deleteMany({
        where: { attachment_id: { in: createdAttachmentIds } },
      });
      await client!.attachments.deleteMany({ where: { id: { in: createdAttachmentIds } } });
    }
    await client?.$disconnect();
  });

  it("persists CRUD and every lifecycle state through compare-and-set", async () => {
    const created = await attachments!.create({
      checksum: "a".repeat(64),
      createdBy: userId,
      fileExtension: "pdf",
      fileSize: 128n,
      isSensitive: false,
      mimeType: "application/pdf",
      originalFileName: "integration.pdf",
      storageReference: `integration/${randomUUID()}`,
      storedFileName: randomUUID(),
      uploadedAt: new Date(),
      uploadedBy: userId,
    });
    createdAttachmentIds.push(created.id);
    expect(await attachments!.exists(created.id)).toBe(true);
    expect(await attachments!.findById(created.id)).toMatchObject({ status: "active" });
    expect(
      await attachments!.findMany({ ids: [created.id], status: "active", take: 1 }),
    ).toHaveLength(1);

    const softDeleted = await attachments!.softDelete({
      expectedStatus: created.status,
      expectedUpdatedAt: created.updatedAt,
      id: created.id,
      nextStatus: lifecycle.nextState(created.status, "soft_delete"),
      now: new Date(created.updatedAt.getTime() + 1),
      updatedBy: userId,
    });
    const pending = await attachments!.markPendingPhysicalDelete({
      expectedStatus: softDeleted.status,
      expectedUpdatedAt: softDeleted.updatedAt,
      id: created.id,
      nextStatus: lifecycle.nextState(softDeleted.status, "begin_physical_delete"),
      now: new Date(softDeleted.updatedAt.getTime() + 1),
      updatedBy: userId,
    });
    const failed = await attachments!.markPhysicalDeleteFailed({
      expectedStatus: pending.status,
      expectedUpdatedAt: pending.updatedAt,
      id: created.id,
      nextStatus: lifecycle.nextState(pending.status, "physical_delete_failed"),
      now: new Date(pending.updatedAt.getTime() + 1),
      updatedBy: userId,
    });
    const retry = await attachments!.markPendingPhysicalDelete({
      expectedStatus: failed.status,
      expectedUpdatedAt: failed.updatedAt,
      id: created.id,
      nextStatus: lifecycle.nextState(failed.status, "retry_physical_delete"),
      now: new Date(failed.updatedAt.getTime() + 1),
      updatedBy: userId,
    });
    const terminal = await attachments!.markPhysicallyDeleted({
      expectedStatus: retry.status,
      expectedUpdatedAt: retry.updatedAt,
      id: created.id,
      nextStatus: lifecycle.nextState(retry.status, "physical_delete_succeeded"),
      now: new Date(retry.updatedAt.getTime() + 1),
      updatedBy: userId,
    });
    expect(terminal.status).toBe("physically_deleted");
  });

  it("lets PostgreSQL accept only one identical Attachment Link", async () => {
    const attachment = await attachments!.create({
      checksum: "b".repeat(64),
      createdBy: userId,
      fileExtension: "pdf",
      fileSize: 64n,
      isSensitive: false,
      mimeType: "application/pdf",
      originalFileName: "link-integration.pdf",
      storageReference: `integration/${randomUUID()}`,
      storedFileName: randomUUID(),
      uploadedAt: new Date(),
      uploadedBy: userId,
    });
    createdAttachmentIds.push(attachment.id);
    const objectId = randomUUID();
    const input = {
      attachmentCategory: "general_business_document" as const,
      attachmentId: attachment.id,
      createdBy: userId,
      linkedAt: new Date(),
      linkedBy: userId,
      objectId,
      objectType: "purchase_order" as const,
      sortOrder: 0,
    };
    const results = await Promise.allSettled([links!.create(input), links!.create(input)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected");
    expect(rejected).toMatchObject({
      reason: expect.any(AttachmentAlreadyLinkedError),
      status: "rejected",
    });
    expect(await links!.countByAttachment(attachment.id)).toBe(1);
    expect(await links!.listByAttachment(attachment.id)).toHaveLength(1);
    expect(await links!.listByObject("purchase_order", objectId, null)).toHaveLength(1);
  });
});
