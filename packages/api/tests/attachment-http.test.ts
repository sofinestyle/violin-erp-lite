import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  AttachmentCategoryMismatchError,
  AttachmentCategoryRegistry,
  AttachmentPermissionDeniedError,
  BaselineAttachmentContentScanner,
  createAttachmentDownloadHeaders,
  createLocalObjectStorage,
  mapAttachmentError,
  parseAttachmentListQuery,
  parseCreateAttachmentLink,
  parseDeleteAttachment,
  parseUnlinkAttachment,
  parseAttachmentUploadRequest,
  type AttachmentRecord,
} from "../src/index";
import { afterEach, describe, expect, it } from "vitest";

const PNG_BYTES = Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000", "hex");
const USER_ID = "11111111-1111-4111-8111-111111111111";
const OBJECT_ID = "22222222-2222-4222-8222-222222222222";
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

describe("Attachment multipart and query DTO", () => {
  const categories = new AttachmentCategoryRegistry();

  it("parses the Frozen single-file multipart DTO and applies defaults", async () => {
    const form = new FormData();
    form.set("file", new File([PNG_BYTES], "evidence.png", { type: "image/png" }));
    form.set("objectType", "inspection_order");
    form.set("objectId", OBJECT_ID);
    form.set("attachmentCategory", "inspection_evidence");
    const parsed = await parseAttachmentUploadRequest(
      new Request("http://localhost/api/v1/attachments", { body: form, method: "POST" }),
      categories,
    );
    expect(parsed).toMatchObject({
      attachmentCategory: "inspection_evidence",
      objectId: OBJECT_ID,
      objectType: "inspection_order",
      sortOrder: 0,
    });
    expect(parsed.file.content).toEqual(Uint8Array.from(PNG_BYTES));
  });

  it("parses API v1.6 Product Attachment DTO without adding fields", async () => {
    const form = new FormData();
    form.set("file", new File([PNG_BYTES], "product.png", { type: "image/png" }));
    form.set("objectType", "product");
    form.set("objectId", OBJECT_ID);
    form.set("attachmentCategory", "general_business_document");

    const parsed = await parseAttachmentUploadRequest(
      new Request("http://localhost/api/v1/attachments", { body: form, method: "POST" }),
      categories,
    );

    expect(parsed).toMatchObject({
      attachmentCategory: "general_business_document",
      objectId: OBJECT_ID,
      objectType: "product",
      sortOrder: 0,
    });
    expect(() =>
      parseCreateAttachmentLink({
        attachmentCategory: "general_business_document",
        objectId: OBJECT_ID,
        objectType: "product",
      }),
    ).not.toThrow();
  });

  it("rejects multiple files, arbitrary Object Type and invalid query fields", async () => {
    const form = new FormData();
    form.append("file", new File([PNG_BYTES], "one.png", { type: "image/png" }));
    form.append("file", new File([PNG_BYTES], "two.png", { type: "image/png" }));
    form.set("objectType", "purchase_order");
    form.set("objectId", OBJECT_ID);
    form.set("attachmentCategory", "general_business_document");
    await expect(
      parseAttachmentUploadRequest(
        new Request("http://localhost/api/v1/attachments", { body: form, method: "POST" }),
        categories,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_INVALID_FIELD" });

    expect(() =>
      parseAttachmentListQuery(
        new URLSearchParams({
          objectId: OBJECT_ID,
          objectType: "arbitrary",
        }),
        categories,
      ),
    ).toThrow();
    expect(() =>
      parseAttachmentListQuery(
        new URLSearchParams({
          objectId: OBJECT_ID,
          objectType: "purchase_order",
          pageSize: "101",
        }),
        categories,
      ),
    ).toThrow();
  });
});

describe("Attachment HTTP security helpers", () => {
  it("parses the Frozen ATT-005 through ATT-007 JSON DTOs strictly", () => {
    expect(
      parseCreateAttachmentLink({
        attachmentCategory: "general_business_document",
        objectId: OBJECT_ID,
        objectType: "purchase_order",
      }),
    ).toMatchObject({ sortOrder: 0 });
    expect(
      parseUnlinkAttachment({
        attachmentLinkId: OBJECT_ID,
        reason: " 解除错误关联 ",
      }),
    ).toMatchObject({ reason: "解除错误关联" });
    expect(
      parseDeleteAttachment({
        reason: "删除无引用附件",
        version: "2026-07-25T00:00:00.000Z",
      }),
    ).toMatchObject({ version: "2026-07-25T00:00:00.000Z" });
    expect(() =>
      parseCreateAttachmentLink({
        attachmentCategory: "general_business_document",
        objectId: OBJECT_ID,
        objectType: "purchase_order",
        unknown: true,
      }),
    ).toThrow();
    expect(() =>
      parseDeleteAttachment({
        reason: " ",
        version: "not-a-date",
      }),
    ).toThrow();
  });

  it("maps Domain and Storage errors only to Frozen API v1.5 codes", () => {
    expect(mapAttachmentError(new AttachmentCategoryMismatchError())).toMatchObject({
      code: "VALIDATION_ATTACHMENT_CATEGORY_OBJECT_MISMATCH",
      httpStatus: 422,
    });
    expect(mapAttachmentError(new AttachmentPermissionDeniedError())).toMatchObject({
      code: "PERMISSION_ATTACHMENT_DENIED",
      httpStatus: 403,
    });
  });

  it("rejects executable signatures through the malware scanner boundary", async () => {
    await expect(
      new BaselineAttachmentContentScanner().scan({
        content: Uint8Array.from([0x4d, 0x5a, 0x00, 0x00]),
        extension: "png",
        mimeType: "image/png",
      }),
    ).rejects.toMatchObject({ code: "ATTACHMENT_FILE_UNSAFE" });
  });

  it("builds safe streaming download headers without exposing storage metadata", () => {
    const attachment = attachmentRecord({
      originalFileName: '检验"报告.pdf',
      mimeType: "application/pdf",
      fileSize: 123n,
    });
    const headers = createAttachmentDownloadHeaders(attachment, randomUUID());
    expect(headers.get("Content-Type")).toBe("application/pdf");
    expect(headers.get("Content-Length")).toBe("123");
    expect(headers.get("Content-Disposition")).toContain("filename*=UTF-8''");
    expect(headers.get("Content-Disposition")).not.toContain("storage");
    expect(headers.get("Cache-Control")).toBe("private, no-store, max-age=0");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("streams through the Local Object Storage adapter", async () => {
    const rootPath = await mkdtemp(join(tmpdir(), "attachment-http-stream-"));
    temporaryDirectories.push(rootPath);
    const storage = createLocalObjectStorage({ rootPath });
    const stored = await storage.store({
      checksum: "a".repeat(64),
      content: Uint8Array.from(PNG_BYTES),
      extension: "png",
      fileSize: PNG_BYTES.length,
      mimeType: "image/png",
      originalFilename: "evidence.png",
    });
    const stream = await storage.stream(stored.storageKey);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    expect(Buffer.concat(chunks)).toEqual(PNG_BYTES);
  });
});

function attachmentRecord(overrides: Partial<AttachmentRecord> = {}): AttachmentRecord {
  const now = new Date("2026-07-25T00:00:00.000Z");
  return {
    checksum: "a".repeat(64),
    createdAt: now,
    createdBy: USER_ID,
    fileExtension: "png",
    fileSize: BigInt(PNG_BYTES.length),
    id: randomUUID(),
    isSensitive: false,
    mimeType: "image/png",
    originalFileName: "evidence.png",
    status: "active",
    storageReference: `${randomUUID()}.png`,
    storedFileName: `${randomUUID()}.png`,
    updatedAt: now,
    updatedBy: USER_ID,
    uploadedAt: now,
    uploadedBy: USER_ID,
    ...overrides,
  };
}
