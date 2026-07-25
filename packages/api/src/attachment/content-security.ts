import { UnsafeAttachmentError } from "../upload/upload.js";
import type { AttachmentContentScanner } from "./types.js";

const DANGEROUS_SIGNATURES = [
  Uint8Array.from([0x4d, 0x5a]),
  Uint8Array.from([0x7f, 0x45, 0x4c, 0x46]),
  Uint8Array.from([0xca, 0xfe, 0xba, 0xbe]),
] as const;

function startsWith(content: Uint8Array, signature: Uint8Array): boolean {
  return (
    content.byteLength >= signature.byteLength &&
    signature.every((value, index) => content[index] === value)
  );
}

/**
 * Baseline fail-closed boundary for local development. Production malware engines
 * implement the same interface without changing AttachmentService.
 */
export class BaselineAttachmentContentScanner implements AttachmentContentScanner {
  async scan(input: Parameters<AttachmentContentScanner["scan"]>[0]): Promise<void> {
    if (DANGEROUS_SIGNATURES.some((signature) => startsWith(input.content, signature))) {
      throw new UnsafeAttachmentError("检测到危险可执行文件内容");
    }
  }
}
