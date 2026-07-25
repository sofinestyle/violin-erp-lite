import { chmod, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createLocalObjectStorage,
  createLocalUploadStorage,
  createPathStorageUrlStrategy,
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
  it("keeps the legacy factory on the unified adapter", async () => {
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
    await expect(storage.read(stored.storageKey)).resolves.toEqual(Uint8Array.from(PNG_BYTES));
    await storage.delete(stored.storageKey);
    await expect(readFile(join(rootPath, stored.storageKey))).rejects.toMatchObject({
      code: "ENOENT",
    });
    await expect(storage.delete("../../outside.png")).rejects.toMatchObject({
      name: "ObjectStorageAccessError",
    });
  });

  it("stores one metadata source and supports read, stream, exists and inventory", async () => {
    const rootPath = await mkdtemp(join(tmpdir(), "violin-object-storage-test-"));
    temporaryDirectories.push(rootPath);
    const storage = createLocalObjectStorage({
      generateStorageId: () => "55555555-5555-4555-8555-555555555555",
      now: () => new Date("2026-07-25T08:00:00.000Z"),
      rootPath,
    });
    const upload = await validateUpload(
      {
        content: PNG_BYTES,
        declaredMimeType: "image/png",
        originalFilename: "inspection evidence.png",
      },
      POLICY,
    );
    const stored = await storage.store(upload);

    expect(stored).toEqual({
      checksum: upload.checksum,
      createdAt: "2026-07-25T08:00:00.000Z",
      extension: "png",
      fileSize: PNG_BYTES.length,
      lifecycleState: "active",
      mimeType: "image/png",
      originalFilename: "inspection evidence.png",
      storageKey: "55555555-5555-4555-8555-555555555555.png",
      updatedAt: "2026-07-25T08:00:00.000Z",
    });
    await expect(storage.exists(stored.storageKey)).resolves.toBe(true);
    await expect(storage.metadata(stored.storageKey)).resolves.toEqual(stored);
    await expect(storage.read(stored.storageKey)).resolves.toEqual(Uint8Array.from(PNG_BYTES));
    await expect(storage.list()).resolves.toEqual([stored]);

    const objectStream = await storage.stream(stored.storageKey);
    const chunks: Buffer[] = [];

    for await (const chunk of objectStream) {
      chunks.push(Buffer.from(chunk));
    }

    expect(Buffer.concat(chunks)).toEqual(PNG_BYTES);
    expect((await stat(join(rootPath, stored.storageKey))).mode & 0o777).toBe(0o600);
    expect(
      (await stat(join(rootPath, ".metadata", `${stored.storageKey}.json`))).mode & 0o777,
    ).toBe(0o600);
  });

  it("generates authorized URLs only through the configured strategy", async () => {
    const rootPath = await mkdtemp(join(tmpdir(), "violin-storage-url-test-"));
    temporaryDirectories.push(rootPath);
    const storage = createLocalObjectStorage({
      generateStorageId: () => "66666666-6666-4666-8666-666666666666",
      rootPath,
      urlStrategy: createPathStorageUrlStrategy("http://localhost:3000/storage-download"),
    });
    const upload = await validateUpload(
      { content: PNG_BYTES, declaredMimeType: "image/png", originalFilename: "file.png" },
      POLICY,
    );
    const stored = await storage.store(upload);

    await expect(
      storage.generateUrl(stored.storageKey, { authorized: false, purpose: "download" }),
    ).rejects.toMatchObject({ name: "ObjectStorageAccessError" });
    await expect(
      storage.generateUrl(stored.storageKey, { authorized: true, purpose: "download" }),
    ).resolves.toBe(
      "http://localhost:3000/storage-download/66666666-6666-4666-8666-666666666666.png",
    );
  });

  it("applies active, soft-delete, restore and physical-delete lifecycle", async () => {
    const rootPath = await mkdtemp(join(tmpdir(), "violin-storage-lifecycle-test-"));
    temporaryDirectories.push(rootPath);
    const timestamps = [
      new Date("2026-07-25T08:00:00.000Z"),
      new Date("2026-07-25T09:00:00.000Z"),
      new Date("2026-07-25T10:00:00.000Z"),
    ];
    const storage = createLocalObjectStorage({
      generateStorageId: () => "77777777-7777-4777-8777-777777777777",
      now: () => timestamps.shift() ?? new Date("2026-07-25T11:00:00.000Z"),
      rootPath,
      urlStrategy: createPathStorageUrlStrategy("http://localhost:3000/storage-download"),
    });
    const upload = await validateUpload(
      { content: PNG_BYTES, declaredMimeType: "image/png", originalFilename: "file.png" },
      POLICY,
    );
    const stored = await storage.store(upload);
    const deleted = await storage.softDelete(stored.storageKey);

    expect(deleted).toMatchObject({
      lifecycleState: "soft_deleted",
      updatedAt: "2026-07-25T09:00:00.000Z",
    });
    await expect(storage.exists(stored.storageKey)).resolves.toBe(true);
    await expect(storage.read(stored.storageKey)).rejects.toMatchObject({
      name: "ObjectStorageAccessError",
    });
    await expect(storage.stream(stored.storageKey)).rejects.toMatchObject({
      name: "ObjectStorageAccessError",
    });
    await expect(
      storage.generateUrl(stored.storageKey, { authorized: true, purpose: "read" }),
    ).rejects.toMatchObject({ name: "ObjectStorageAccessError" });

    const restored = await storage.activate(stored.storageKey);
    expect(restored).toMatchObject({
      lifecycleState: "active",
      updatedAt: "2026-07-25T10:00:00.000Z",
    });
    await expect(storage.read(stored.storageKey)).resolves.toEqual(Uint8Array.from(PNG_BYTES));

    await storage.delete(stored.storageKey);
    await expect(storage.exists(stored.storageKey)).resolves.toBe(false);
    await expect(storage.metadata(stored.storageKey)).rejects.toMatchObject({
      name: "ObjectStorageNotFoundError",
    });
  });

  it("rejects inconsistent metadata, insecure permissions and unsafe keys", async () => {
    const rootPath = await mkdtemp(join(tmpdir(), "violin-storage-integrity-test-"));
    temporaryDirectories.push(rootPath);
    const storage = createLocalObjectStorage({
      generateStorageId: () => "88888888-8888-4888-8888-888888888888",
      rootPath,
    });
    const upload = await validateUpload(
      { content: PNG_BYTES, declaredMimeType: "image/png", originalFilename: "file.png" },
      POLICY,
    );
    const stored = await storage.store(upload);

    await writeFile(
      join(rootPath, stored.storageKey),
      Buffer.concat([PNG_BYTES, Buffer.from("x")]),
    );
    await expect(storage.metadata(stored.storageKey)).rejects.toMatchObject({
      name: "ObjectStorageIntegrityError",
    });

    await writeFile(join(rootPath, stored.storageKey), PNG_BYTES);
    await chmod(join(rootPath, stored.storageKey), 0o644);
    await expect(storage.read(stored.storageKey)).rejects.toMatchObject({
      name: "ObjectStorageIntegrityError",
    });
    await expect(storage.exists("../file.png")).rejects.toMatchObject({
      name: "ObjectStorageAccessError",
    });
  });

  it("plans orphan cleanup without running a background worker or deleting files", async () => {
    const rootPath = await mkdtemp(join(tmpdir(), "violin-storage-cleanup-test-"));
    temporaryDirectories.push(rootPath);
    const storage = createLocalObjectStorage({
      generateStorageId: () => "99999999-9999-4999-8999-999999999999",
      rootPath,
    });
    const upload = await validateUpload(
      { content: PNG_BYTES, declaredMimeType: "image/png", originalFilename: "file.png" },
      POLICY,
    );
    const stored = await storage.store(upload);
    const orphanedStorageKey = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png";
    await writeFile(join(rootPath, orphanedStorageKey), PNG_BYTES, { mode: 0o600 });

    await expect(storage.planCleanup([])).resolves.toEqual({
      metadataWithoutObject: [],
      objectsWithoutMetadata: [orphanedStorageKey],
      unreferencedObjects: [stored],
    });
    await expect(storage.planCleanup([stored.storageKey])).resolves.toEqual({
      metadataWithoutObject: [],
      objectsWithoutMetadata: [orphanedStorageKey],
      unreferencedObjects: [],
    });
    await expect(storage.exists(stored.storageKey)).resolves.toBe(true);
    await expect(readFile(join(rootPath, orphanedStorageKey))).resolves.toEqual(PNG_BYTES);
  });
});
