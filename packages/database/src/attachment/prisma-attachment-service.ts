import {
  AttachmentCategoryRegistry,
  AttachmentObjectRegistry,
  AttachmentService,
  BaselineAttachmentContentScanner,
  createLocalObjectStorage,
  loadAttachmentConfiguration,
} from "@violin-erp/api";
import { PrismaAuditWriter } from "../audit/prisma-audit-writer.js";
import { getPrismaClient } from "../client.js";
import type { PrismaClient } from "../generated/prisma/client.js";
import { createPersistentIdempotencyAdapter } from "../idempotency/persistent-idempotency.js";
import { PrismaAttachmentAccessScopeResolver } from "./prisma-attachment-access-scope-resolver.js";
import { PrismaAttachmentAuditReader } from "./prisma-attachment-audit-reader.js";
import { PrismaAttachmentLinkRepository } from "./prisma-attachment-link-repository.js";
import { PrismaAttachmentObjectReader } from "./prisma-attachment-object-reader.js";
import { PrismaAttachmentRepository } from "./prisma-attachment-repository.js";
import {
  PrismaAttachmentTransactionRunner,
  PrismaAttachmentUploadReceiptReader,
} from "./prisma-attachment-transaction.js";

export function createAttachmentService(
  environment: NodeJS.ProcessEnv = process.env,
  client: PrismaClient = getPrismaClient(),
): AttachmentService {
  const configuration = loadAttachmentConfiguration(environment);
  const categories = new AttachmentCategoryRegistry();
  return new AttachmentService({
    accessScopes: new PrismaAttachmentAccessScopeResolver(client),
    attachments: new PrismaAttachmentRepository(client),
    audit: new PrismaAuditWriter(client),
    auditReader: new PrismaAttachmentAuditReader(client),
    categories,
    contentScanner: new BaselineAttachmentContentScanner(),
    idempotency: createPersistentIdempotencyAdapter(environment, client),
    links: new PrismaAttachmentLinkRepository(client),
    objects: new AttachmentObjectRegistry(new PrismaAttachmentObjectReader(client)),
    receiptReader: new PrismaAttachmentUploadReceiptReader(client),
    storage: createLocalObjectStorage({ rootPath: configuration.storagePath }),
    transaction: new PrismaAttachmentTransactionRunner(client),
    uploadPolicy: configuration.uploadPolicy,
  });
}
