import { loadUploadConfiguration, type UploadPolicy } from "../upload/upload.js";

export const ATTACHMENT_ALLOWED_FILE_TYPES = Object.freeze([
  { extension: "jpg", mimeType: "image/jpeg" },
  { extension: "png", mimeType: "image/png" },
  { extension: "webp", mimeType: "image/webp" },
  { extension: "pdf", mimeType: "application/pdf" },
]);

export type AttachmentConfiguration = Readonly<{
  storagePath: string;
  uploadPolicy: UploadPolicy;
}>;

export function loadAttachmentConfiguration(
  environment: NodeJS.ProcessEnv = process.env,
): AttachmentConfiguration {
  const upload = loadUploadConfiguration({
    ...(environment.UPLOAD_MAX_FILE_SIZE
      ? { UPLOAD_MAX_FILE_SIZE: environment.UPLOAD_MAX_FILE_SIZE }
      : {}),
    ...(environment.UPLOAD_STORAGE_PATH
      ? { UPLOAD_STORAGE_PATH: environment.UPLOAD_STORAGE_PATH }
      : {}),
  });
  return Object.freeze({
    storagePath: upload.storagePath,
    uploadPolicy: {
      allowedFileTypes: ATTACHMENT_ALLOWED_FILE_TYPES,
      maxFileSize: upload.maxFileSize,
    },
  });
}
