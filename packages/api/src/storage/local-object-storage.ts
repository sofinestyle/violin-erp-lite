import { randomUUID } from "node:crypto";
import {
  access,
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { isAbsolute, parse, relative, resolve } from "node:path";
import {
  OBJECT_LIFECYCLE_STATES,
  ObjectStorageAccessError,
  ObjectStorageIntegrityError,
  ObjectStorageNotFoundError,
  ObjectStorageUrlUnavailableError,
  type ObjectLifecycleState,
  type ObjectStorageAdapter,
  type ObjectStorageCleanupPlan,
  type ObjectStorageMetadata,
  type StorageObjectInput,
  type StorageUrlStrategy,
} from "./object-storage.js";

const STORAGE_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.[a-z0-9]+$/i;
const CHECKSUM_PATTERN = /^[a-f0-9]{64}$/;
const METADATA_DIRECTORY = ".metadata";

export type LocalObjectStorageOptions = Readonly<{
  generateStorageId?: () => string;
  now?: () => Date;
  rootPath: string;
  urlStrategy?: StorageUrlStrategy;
}>;

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function safeChildPath(parentPath: string, filename: string): string {
  const path = resolve(parentPath, filename);
  const relativePath = relative(parentPath, path);

  if (!relativePath || relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new ObjectStorageAccessError("存储引用不安全");
  }

  return path;
}

function validateStorageKey(storageKey: string): void {
  if (!STORAGE_KEY_PATTERN.test(storageKey)) {
    throw new ObjectStorageAccessError("存储引用不安全");
  }
}

function storagePath(rootPath: string, storageKey: string): string {
  validateStorageKey(storageKey);
  return safeChildPath(rootPath, storageKey);
}

function metadataPath(metadataRootPath: string, storageKey: string): string {
  validateStorageKey(storageKey);
  return safeChildPath(metadataRootPath, `${storageKey}.json`);
}

function isLifecycleState(value: unknown): value is ObjectLifecycleState {
  return (
    typeof value === "string" && (OBJECT_LIFECYCLE_STATES as readonly string[]).includes(value)
  );
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function parseMetadata(value: unknown, storageKey: string): ObjectStorageMetadata {
  if (!value || typeof value !== "object") {
    throw new ObjectStorageIntegrityError();
  }

  const candidate = value as Partial<ObjectStorageMetadata>;

  if (
    candidate.storageKey !== storageKey ||
    typeof candidate.originalFilename !== "string" ||
    !candidate.originalFilename ||
    typeof candidate.mimeType !== "string" ||
    !candidate.mimeType ||
    typeof candidate.extension !== "string" ||
    !candidate.extension ||
    !Number.isSafeInteger(candidate.fileSize) ||
    Number(candidate.fileSize) <= 0 ||
    typeof candidate.checksum !== "string" ||
    !CHECKSUM_PATTERN.test(candidate.checksum) ||
    !isIsoTimestamp(candidate.createdAt) ||
    !isIsoTimestamp(candidate.updatedAt) ||
    Date.parse(candidate.updatedAt) < Date.parse(candidate.createdAt) ||
    !isLifecycleState(candidate.lifecycleState)
  ) {
    throw new ObjectStorageIntegrityError();
  }

  if (!storageKey.toLowerCase().endsWith(`.${candidate.extension.toLowerCase()}`)) {
    throw new ObjectStorageIntegrityError();
  }

  return Object.freeze({
    checksum: candidate.checksum,
    createdAt: candidate.createdAt,
    extension: candidate.extension,
    fileSize: Number(candidate.fileSize),
    lifecycleState: candidate.lifecycleState,
    mimeType: candidate.mimeType,
    originalFilename: candidate.originalFilename,
    storageKey: candidate.storageKey,
    updatedAt: candidate.updatedAt,
  });
}

function validateStorageInput(object: StorageObjectInput): void {
  if (
    !CHECKSUM_PATTERN.test(object.checksum) ||
    !/^[a-z0-9]+$/i.test(object.extension) ||
    !object.mimeType ||
    !object.originalFilename ||
    !Number.isSafeInteger(object.fileSize) ||
    object.fileSize <= 0 ||
    object.fileSize !== object.content.byteLength
  ) {
    throw new ObjectStorageIntegrityError("存储对象输入与元数据不一致");
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (isMissingFileError(error)) {
      return false;
    }

    throw error;
  }
}

async function assertSecureFile(path: string, expectedSize?: number): Promise<void> {
  let file;

  try {
    file = await stat(path);
  } catch (error) {
    if (isMissingFileError(error)) {
      throw new ObjectStorageIntegrityError();
    }

    throw error;
  }

  if (
    !file.isFile() ||
    (file.mode & 0o077) !== 0 ||
    (file.mode & 0o600) !== 0o600 ||
    (expectedSize !== undefined && file.size !== expectedSize)
  ) {
    throw new ObjectStorageIntegrityError();
  }
}

function assertActive(metadata: ObjectStorageMetadata): void {
  if (metadata.lifecycleState !== "active") {
    throw new ObjectStorageAccessError("存储对象已软删除");
  }
}

function assertGeneratedUrl(url: string): string {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    throw new ObjectStorageIntegrityError("URL Strategy 返回了无效 URL");
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new ObjectStorageIntegrityError("URL Strategy 必须返回 HTTP(S) URL");
  }

  return parsed.toString();
}

export function createPathStorageUrlStrategy(baseUrl: string): StorageUrlStrategy {
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const parsedBaseUrl = assertGeneratedUrl(normalizedBaseUrl);

  return (metadata) => new URL(encodeURIComponent(metadata.storageKey), parsedBaseUrl).toString();
}

export function createLocalObjectStorage(options: LocalObjectStorageOptions): ObjectStorageAdapter {
  if (!options.rootPath.trim()) {
    throw new TypeError("rootPath is required");
  }

  const rootPath = resolve(options.rootPath);

  if (rootPath === parse(rootPath).root) {
    throw new TypeError("rootPath must not be a filesystem root");
  }

  const metadataRootPath = resolve(rootPath, METADATA_DIRECTORY);
  const generateStorageId = options.generateStorageId ?? randomUUID;
  const now = options.now ?? (() => new Date());

  async function readDirectory(path: string): Promise<readonly string[]> {
    try {
      return await readdir(path);
    } catch (error) {
      if (isMissingFileError(error)) {
        return [];
      }

      throw error;
    }
  }

  async function loadMetadata(storageKey: string): Promise<ObjectStorageMetadata> {
    const objectPath = storagePath(rootPath, storageKey);
    const objectMetadataPath = metadataPath(metadataRootPath, storageKey);
    let serialized: string;

    try {
      serialized = await readFile(objectMetadataPath, "utf8");
    } catch (error) {
      if (isMissingFileError(error)) {
        if (await pathExists(objectPath)) {
          throw new ObjectStorageIntegrityError();
        }

        throw new ObjectStorageNotFoundError();
      }

      throw error;
    }

    let value: unknown;

    try {
      value = JSON.parse(serialized);
    } catch {
      throw new ObjectStorageIntegrityError();
    }

    const objectMetadata = parseMetadata(value, storageKey);
    await assertSecureFile(objectMetadataPath);
    await assertSecureFile(objectPath, objectMetadata.fileSize);
    return objectMetadata;
  }

  async function updateLifecycle(
    storageKey: string,
    lifecycleState: ObjectLifecycleState,
  ): Promise<ObjectStorageMetadata> {
    const current = await loadMetadata(storageKey);

    if (current.lifecycleState === lifecycleState) {
      return current;
    }

    const updated = Object.freeze({
      ...current,
      lifecycleState,
      updatedAt: now().toISOString(),
    });
    const targetPath = metadataPath(metadataRootPath, storageKey);
    const temporaryPath = safeChildPath(metadataRootPath, `.${storageKey}.${randomUUID()}.tmp`);

    await writeFile(temporaryPath, JSON.stringify(updated), {
      flag: "wx",
      mode: 0o600,
    });

    try {
      await rename(temporaryPath, targetPath);
    } catch (error) {
      await rm(temporaryPath, { force: true });
      throw error;
    }

    return updated;
  }

  return {
    async activate(storageKey) {
      return updateLifecycle(storageKey, "active");
    },

    async delete(storageKey) {
      const objectPath = storagePath(rootPath, storageKey);
      const objectMetadataPath = metadataPath(metadataRootPath, storageKey);
      await Promise.all([rm(objectPath, { force: true }), rm(objectMetadataPath, { force: true })]);
    },

    async exists(storageKey) {
      const objectPath = storagePath(rootPath, storageKey);
      const objectMetadataPath = metadataPath(metadataRootPath, storageKey);
      const [hasObject, hasMetadata] = await Promise.all([
        pathExists(objectPath),
        pathExists(objectMetadataPath),
      ]);

      if (!hasObject && !hasMetadata) {
        return false;
      }

      if (hasObject !== hasMetadata) {
        throw new ObjectStorageIntegrityError();
      }

      await loadMetadata(storageKey);
      return true;
    },

    async generateUrl(storageKey, accessContext) {
      if (!accessContext.authorized) {
        throw new ObjectStorageAccessError();
      }

      const objectMetadata = await loadMetadata(storageKey);
      assertActive(objectMetadata);

      if (!options.urlStrategy) {
        throw new ObjectStorageUrlUnavailableError();
      }

      return assertGeneratedUrl(await options.urlStrategy(objectMetadata, accessContext));
    },

    async list() {
      let entries: string[];

      try {
        entries = await readdir(metadataRootPath);
      } catch (error) {
        if (isMissingFileError(error)) {
          return Object.freeze([]);
        }

        throw error;
      }

      const storageKeys = entries
        .filter((entry) => entry.endsWith(".json"))
        .map((entry) => entry.slice(0, -".json".length))
        .sort();
      const objects = await Promise.all(storageKeys.map((storageKey) => loadMetadata(storageKey)));
      return Object.freeze(objects);
    },

    metadata: loadMetadata,

    async planCleanup(referencedStorageKeys): Promise<ObjectStorageCleanupPlan> {
      const referenced = new Set(referencedStorageKeys);
      const [rootEntries, metadataEntries] = await Promise.all([
        readDirectory(rootPath),
        readDirectory(metadataRootPath),
      ]);
      const objectKeys = new Set(rootEntries.filter((entry) => STORAGE_KEY_PATTERN.test(entry)));
      const metadataKeys = new Set(
        metadataEntries
          .filter((entry) => entry.endsWith(".json"))
          .map((entry) => entry.slice(0, -".json".length))
          .filter((entry) => STORAGE_KEY_PATTERN.test(entry)),
      );
      const objectsWithoutMetadata = [...objectKeys]
        .filter((storageKey) => !metadataKeys.has(storageKey))
        .sort();
      const metadataWithoutObject = [...metadataKeys]
        .filter((storageKey) => !objectKeys.has(storageKey))
        .sort();
      const completeKeys = [...objectKeys]
        .filter((storageKey) => metadataKeys.has(storageKey))
        .sort();
      const completeObjects = await Promise.all(
        completeKeys.map((storageKey) => loadMetadata(storageKey)),
      );

      return Object.freeze({
        metadataWithoutObject: Object.freeze(metadataWithoutObject),
        objectsWithoutMetadata: Object.freeze(objectsWithoutMetadata),
        unreferencedObjects: Object.freeze(
          completeObjects.filter((object) => !referenced.has(object.storageKey)),
        ),
      });
    },

    async read(storageKey) {
      const objectMetadata = await loadMetadata(storageKey);
      assertActive(objectMetadata);

      try {
        const content = await readFile(storagePath(rootPath, storageKey));

        if (content.byteLength !== objectMetadata.fileSize) {
          throw new ObjectStorageIntegrityError();
        }

        return Uint8Array.from(content);
      } catch (error) {
        if (isMissingFileError(error)) {
          throw new ObjectStorageNotFoundError();
        }

        throw error;
      }
    },

    async softDelete(storageKey) {
      return updateLifecycle(storageKey, "soft_deleted");
    },

    async store(object: StorageObjectInput) {
      validateStorageInput(object);
      const storedFilename = `${generateStorageId()}.${object.extension}`;
      const objectPath = storagePath(rootPath, storedFilename);
      const objectMetadataPath = metadataPath(metadataRootPath, storedFilename);
      const timestamp = now().toISOString();
      const objectMetadata: ObjectStorageMetadata = Object.freeze({
        checksum: object.checksum,
        createdAt: timestamp,
        extension: object.extension,
        fileSize: object.fileSize,
        lifecycleState: "active",
        mimeType: object.mimeType,
        originalFilename: object.originalFilename,
        storageKey: storedFilename,
        updatedAt: timestamp,
      });

      await mkdir(rootPath, { mode: 0o700, recursive: true });
      await mkdir(metadataRootPath, { mode: 0o700, recursive: true });
      await writeFile(objectPath, object.content, { flag: "wx", mode: 0o600 });

      try {
        await writeFile(objectMetadataPath, JSON.stringify(objectMetadata), {
          flag: "wx",
          mode: 0o600,
        });
      } catch (error) {
        await rm(objectPath, { force: true });
        throw error;
      }

      return objectMetadata;
    },

    async stream(storageKey) {
      const objectMetadata = await loadMetadata(storageKey);
      assertActive(objectMetadata);
      let fileHandle;

      try {
        fileHandle = await open(storagePath(rootPath, storageKey), "r");
        const file = await fileHandle.stat();

        if (file.size !== objectMetadata.fileSize) {
          await fileHandle.close();
          throw new ObjectStorageIntegrityError();
        }

        return fileHandle.createReadStream({ autoClose: true });
      } catch (error) {
        if (fileHandle) {
          await fileHandle.close().catch(() => undefined);
        }

        if (isMissingFileError(error)) {
          throw new ObjectStorageNotFoundError();
        }

        throw error;
      }
    },
  };
}
