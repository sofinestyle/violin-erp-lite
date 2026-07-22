import { createHash } from "node:crypto";
import { extname, posix, win32 } from "node:path";
import { fileTypeFromBuffer } from "file-type";
import { AppError } from "../errors/app-error.js";

const SAFE_FILENAME_CHARACTER_PATTERN = /[^\p{L}\p{N}._()\- ]/gu;
const MAX_FILENAME_LENGTH = 255;

export type AllowedFileType = Readonly<{
  extension: string;
  mimeType: string;
}>;

export type UploadPolicy = Readonly<{
  allowedFileTypes: readonly AllowedFileType[];
  maxFileSize: number;
}>;

export type UploadCandidate = Readonly<{
  content: Uint8Array;
  declaredMimeType: string;
  originalFilename: string;
}>;

export type DetectedFileType = Readonly<{
  extension: string;
  mimeType: string;
}>;

export type FileContentDetector = (content: Uint8Array) => Promise<DetectedFileType | undefined>;

export type ValidatedUpload = Readonly<{
  checksum: string;
  content: Uint8Array;
  extension: string;
  fileSize: number;
  mimeType: string;
  originalFilename: string;
}>;

export type StoredUpload = Readonly<{
  checksum: string;
  extension: string;
  fileSize: number;
  mimeType: string;
  originalFilename: string;
  storageKey: string;
  storedFilename: string;
}>;

export type UploadStorageAdapter = Readonly<{
  delete: (storageKey: string) => Promise<void>;
  store: (upload: ValidatedUpload) => Promise<StoredUpload>;
}>;

export type UploadEnvironment = Readonly<{
  UPLOAD_MAX_FILE_SIZE?: string;
  UPLOAD_STORAGE_PATH?: string;
}>;

export type UploadConfiguration = Readonly<{
  maxFileSize: number;
  storagePath: string;
}>;

export class UnsafeAttachmentError extends AppError {
  constructor(message = "文件内容或类型不安全") {
    super("ATTACHMENT_FILE_UNSAFE", 422, message);
  }
}

export async function detectFileType(content: Uint8Array): Promise<DetectedFileType | undefined> {
  const detected = await fileTypeFromBuffer(content);

  return detected ? { extension: detected.ext, mimeType: detected.mime } : undefined;
}

function hasControlCharacter(value: string): boolean {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 31 || codePoint === 127;
  });
}

export function sanitizeFilename(filename: string): string {
  const normalized = filename.normalize("NFKC").trim();

  if (
    !normalized ||
    hasControlCharacter(normalized) ||
    posix.basename(normalized) !== normalized ||
    win32.basename(normalized) !== normalized ||
    normalized === "." ||
    normalized === ".."
  ) {
    throw new UnsafeAttachmentError("文件名不安全");
  }

  const sanitized = normalized.replace(SAFE_FILENAME_CHARACTER_PATTERN, "_");
  const extension = extname(sanitized);
  const baseLength = Math.max(1, MAX_FILENAME_LENGTH - extension.length);
  const base = sanitized
    .slice(0, sanitized.length - extension.length)
    .slice(0, baseLength)
    .trim();
  const result = `${base || "file"}${extension}`;

  if (!result || result === "." || result === "..") {
    throw new UnsafeAttachmentError("文件名不安全");
  }

  return result;
}

function normalizedExtension(filename: string): string {
  return extname(filename).slice(1).toLowerCase();
}

function validatePolicy(policy: UploadPolicy): void {
  if (!Number.isSafeInteger(policy.maxFileSize) || policy.maxFileSize <= 0) {
    throw new TypeError("maxFileSize must be a positive integer");
  }

  if (policy.allowedFileTypes.length === 0) {
    throw new TypeError("allowedFileTypes must not be empty");
  }
}

export async function validateUpload(
  candidate: UploadCandidate,
  policy: UploadPolicy,
  detector: FileContentDetector = detectFileType,
): Promise<ValidatedUpload> {
  validatePolicy(policy);
  const content = Uint8Array.from(candidate.content);
  const originalFilename = sanitizeFilename(candidate.originalFilename);
  const extension = normalizedExtension(originalFilename);
  const declaredMimeType = candidate.declaredMimeType.toLowerCase();
  const allowed = policy.allowedFileTypes.find(
    (item) =>
      item.extension.toLowerCase() === extension &&
      item.mimeType.toLowerCase() === declaredMimeType,
  );

  if (!allowed || content.byteLength === 0) {
    throw new UnsafeAttachmentError();
  }

  if (content.byteLength > policy.maxFileSize) {
    throw new UnsafeAttachmentError("文件超过允许的大小");
  }

  const detected = await detector(content);

  if (
    !detected ||
    detected.extension.toLowerCase() !== extension ||
    detected.mimeType.toLowerCase() !== declaredMimeType
  ) {
    throw new UnsafeAttachmentError();
  }

  return Object.freeze({
    checksum: createHash("sha256").update(content).digest("hex"),
    content,
    extension,
    fileSize: content.byteLength,
    mimeType: declaredMimeType,
    originalFilename,
  });
}

export function loadUploadMaxFileSize(value: string | undefined): number {
  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error("UPLOAD_MAX_FILE_SIZE must be a positive integer in bytes");
  }

  return parsed;
}

export function loadUploadConfiguration(environment: UploadEnvironment): UploadConfiguration {
  const storagePath = environment.UPLOAD_STORAGE_PATH?.trim();

  if (!storagePath) {
    throw new Error("UPLOAD_STORAGE_PATH is required");
  }

  return Object.freeze({
    maxFileSize: loadUploadMaxFileSize(environment.UPLOAD_MAX_FILE_SIZE),
    storagePath,
  });
}
