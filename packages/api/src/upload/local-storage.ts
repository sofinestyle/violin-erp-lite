import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { isAbsolute, parse, relative, resolve } from "node:path";
import {
  UnsafeAttachmentError,
  type StoredUpload,
  type UploadStorageAdapter,
  type ValidatedUpload,
} from "./upload.js";

const STORAGE_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.[a-z0-9]+$/i;

export type LocalUploadStorageOptions = Readonly<{
  generateStorageId?: () => string;
  rootPath: string;
}>;

function safeStoragePath(rootPath: string, storageKey: string): string {
  if (!STORAGE_KEY_PATTERN.test(storageKey)) {
    throw new UnsafeAttachmentError("存储引用不安全");
  }

  const path = resolve(rootPath, storageKey);
  const relativePath = relative(rootPath, path);

  if (!relativePath || relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new UnsafeAttachmentError("存储引用不安全");
  }

  return path;
}

export function createLocalUploadStorage(options: LocalUploadStorageOptions): UploadStorageAdapter {
  if (!options.rootPath.trim()) {
    throw new TypeError("rootPath is required");
  }

  const rootPath = resolve(options.rootPath);

  if (rootPath === parse(rootPath).root) {
    throw new TypeError("rootPath must not be a filesystem root");
  }

  const generateStorageId = options.generateStorageId ?? randomUUID;

  return {
    async delete(storageKey): Promise<void> {
      await rm(safeStoragePath(rootPath, storageKey), { force: true });
    },

    async store(upload: ValidatedUpload): Promise<StoredUpload> {
      const storedFilename = `${generateStorageId()}.${upload.extension}`;
      const path = safeStoragePath(rootPath, storedFilename);
      await mkdir(rootPath, { recursive: true });
      await writeFile(path, upload.content, { flag: "wx", mode: 0o600 });

      return Object.freeze({
        checksum: upload.checksum,
        extension: upload.extension,
        fileSize: upload.fileSize,
        mimeType: upload.mimeType,
        originalFilename: upload.originalFilename,
        storageKey: storedFilename,
        storedFilename,
      });
    },
  };
}
