import { sanitizeFilename } from "../upload/upload.js";
import type { AttachmentRecord } from "./types.js";

function asciiFallback(filename: string): string {
  const safe = sanitizeFilename(filename);
  const fallback = safe.replace(/[^\x20-\x7e]/g, "_").replaceAll(/["\\]/g, "_");
  return fallback || "attachment";
}

export function createAttachmentDownloadHeaders(
  attachment: AttachmentRecord,
  requestId: string,
): Headers {
  const headers = new Headers();
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set(
    "Content-Disposition",
    `attachment; filename="${asciiFallback(
      attachment.originalFileName,
    )}"; filename*=UTF-8''${encodeURIComponent(attachment.originalFileName)}`,
  );
  headers.set("Content-Length", attachment.fileSize.toString());
  headers.set("Content-Type", attachment.mimeType);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Request-ID", requestId);
  return headers;
}
