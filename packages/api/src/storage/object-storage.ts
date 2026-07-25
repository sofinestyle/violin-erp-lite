import type { Readable } from "node:stream";

export const OBJECT_LIFECYCLE_STATES = ["active", "soft_deleted"] as const;

export type ObjectLifecycleState = (typeof OBJECT_LIFECYCLE_STATES)[number];

export type StorageObjectInput = Readonly<{
  checksum: string;
  content: Uint8Array;
  extension: string;
  fileSize: number;
  mimeType: string;
  originalFilename: string;
}>;

export type ObjectStorageMetadata = Readonly<{
  checksum: string;
  createdAt: string;
  extension: string;
  fileSize: number;
  lifecycleState: ObjectLifecycleState;
  mimeType: string;
  originalFilename: string;
  storageKey: string;
  updatedAt: string;
}>;

export type StorageUrlAccess = Readonly<{
  authorized: boolean;
  expiresAt?: string;
  purpose: "download" | "read";
}>;

export type StorageUrlStrategy = (
  metadata: ObjectStorageMetadata,
  access: StorageUrlAccess,
) => Promise<string> | string;

export type ObjectStorageCleanupPlan = Readonly<{
  metadataWithoutObject: readonly string[];
  objectsWithoutMetadata: readonly string[];
  unreferencedObjects: readonly ObjectStorageMetadata[];
}>;

export type ObjectStorageAdapter = Readonly<{
  activate: (storageKey: string) => Promise<ObjectStorageMetadata>;
  delete: (storageKey: string) => Promise<void>;
  exists: (storageKey: string) => Promise<boolean>;
  generateUrl: (storageKey: string, access: StorageUrlAccess) => Promise<string>;
  list: () => Promise<readonly ObjectStorageMetadata[]>;
  metadata: (storageKey: string) => Promise<ObjectStorageMetadata>;
  planCleanup: (referencedStorageKeys: readonly string[]) => Promise<ObjectStorageCleanupPlan>;
  read: (storageKey: string) => Promise<Uint8Array>;
  softDelete: (storageKey: string) => Promise<ObjectStorageMetadata>;
  store: (object: StorageObjectInput) => Promise<ObjectStorageMetadata>;
  stream: (storageKey: string) => Promise<Readable>;
}>;

export class ObjectStorageNotFoundError extends Error {
  constructor() {
    super("存储对象不存在");
    this.name = "ObjectStorageNotFoundError";
  }
}

export class ObjectStorageAccessError extends Error {
  constructor(message = "存储对象访问未授权") {
    super(message);
    this.name = "ObjectStorageAccessError";
  }
}

export class ObjectStorageIntegrityError extends Error {
  constructor(message = "存储对象与元数据不一致") {
    super(message);
    this.name = "ObjectStorageIntegrityError";
  }
}

export class ObjectStorageUrlUnavailableError extends Error {
  constructor() {
    super("当前存储未配置 URL Strategy");
    this.name = "ObjectStorageUrlUnavailableError";
  }
}
