import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createLocalUploadStorage,
  loadUploadConfiguration,
  sanitizeFilename,
  validateUpload,
  type UploadPolicy,
} from "../src/index";

const PNG_BYTES = Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000", "hex");
const POLICY: UploadPolicy = {
  allowedFileTypes: [{ extension: "png", mimeType: "image/png" }],
  maxFileSize: 1024,
};
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

describe("upload validation", () => {
  it("loads technical limits from environment variables", () => {
    expect(
      loadUploadConfiguration({
        UPLOAD_MAX_FILE_SIZE: "1024",
        UPLOAD_STORAGE_PATH: "./uploads",
      }),
    ).toEqual({ maxFileSize: 1024, storagePath: "./uploads" });
  });

  it("validates extension, declared MIME, binary signature, size and checksum", async () => {
    const upload = await validateUpload(
      {
        content: PNG_BYTES,
        declaredMimeType: "image/png",
        originalFilename: "quality inspection.png",
      },
      POLICY,
    );

    expect(upload).toMatchObject({
      extension: "png",
      fileSize: PNG_BYTES.length,
      mimeType: "image/png",
      originalFilename: "quality inspection.png",
    });
    expect(upload.checksum).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects mismatched type, oversized content and path traversal", async () => {
    await expect(
      validateUpload(
        { content: PNG_BYTES, declaredMimeType: "image/jpeg", originalFilename: "file.jpg" },
        POLICY,
      ),
    ).rejects.toMatchObject({ code: "ATTACHMENT_FILE_UNSAFE" });
    await expect(
      validateUpload(
        {
          content: PNG_BYTES,
          declaredMimeType: "image/png",
          originalFilename: "file.png",
        },
        { ...POLICY, maxFileSize: 4 },
      ),
    ).rejects.toMatchObject({ code: "ATTACHMENT_FILE_UNSAFE" });
    expect(() => sanitizeFilename("../../secret.png")).toThrowError(
      expect.objectContaining({ code: "ATTACHMENT_FILE_UNSAFE" }),
    );
    expect(() => sanitizeFilename("..\\secret.png")).toThrowError(
      expect.objectContaining({ code: "ATTACHMENT_FILE_UNSAFE" }),
    );
  });
});

describe("local development storage", () => {
  it("stores under an opaque key and deletes without exposing the root path", async () => {
    const rootPath = await mkdtemp(join(tmpdir(), "violin-upload-test-"));
    temporaryDirectories.push(rootPath);
    const storage = createLocalUploadStorage({
      generateStorageId: () => "44444444-4444-4444-8444-444444444444",
      rootPath,
    });
    const upload = await validateUpload(
      { content: PNG_BYTES, declaredMimeType: "image/png", originalFilename: "file.png" },
      POLICY,
    );
    const stored = await storage.store(upload);

    expect(stored.storageKey).toBe("44444444-4444-4444-8444-444444444444.png");
    expect(stored.storageKey).not.toContain(rootPath);
    await expect(readFile(join(rootPath, stored.storageKey))).resolves.toEqual(PNG_BYTES);
    await storage.delete(stored.storageKey);
    await expect(readFile(join(rootPath, stored.storageKey))).rejects.toMatchObject({
      code: "ENOENT",
    });
    await expect(storage.delete("../../outside.png")).rejects.toMatchObject({
      code: "ATTACHMENT_FILE_UNSAFE",
    });
  });
});
