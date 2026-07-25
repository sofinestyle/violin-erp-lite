import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  AttachmentAlreadyLinkedError,
  AttachmentDataScopeDeniedError,
  AttachmentObjectRegistry,
  AttachmentService,
  BaselineAttachmentContentScanner,
  IdempotencyAdapter,
  IdempotencyReplayError,
  InMemoryAuditWriter,
  createLocalObjectStorage,
  type AttachmentObjectReader,
  type AttachmentObjectSnapshot,
  type AttachmentTransactionContext,
  type AttachmentTransactionRunner,
  type AttachmentUploadDto,
  type AuthenticationContext,
  type IdempotencyClaimInput,
  type IdempotencyClaimResult,
  type IdempotencyExpiredTerminalInput,
  type IdempotencyReclaimInput,
  type IdempotencyRepository,
  type IdempotencyTerminalInput,
  type ObjectStorageAdapter,
  type PermissionCode,
  type RequestContext,
} from "@violin-erp/api";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaAuditWriter } from "../src/audit/prisma-audit-writer";
import { PrismaAttachmentAccessScopeResolver } from "../src/attachment/prisma-attachment-access-scope-resolver";
import { PrismaAttachmentLinkRepository } from "../src/attachment/prisma-attachment-link-repository";
import { PrismaAttachmentRepository } from "../src/attachment/prisma-attachment-repository";
import {
  PrismaAttachmentTransactionRunner,
  PrismaAttachmentUploadReceiptReader,
} from "../src/attachment/prisma-attachment-transaction";
import { createPrismaClient } from "../src/client";
import { PrismaIdempotencyRepository } from "../src/idempotency/prisma-idempotency-repository";

const databaseUrl = process.env.ATTACHMENT_API_INTEGRATION_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;
const client = databaseUrl ? createPrismaClient(databaseUrl) : null;
const PNG_BYTES = Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000", "hex");
const OBJECT_ID = "22222222-2222-4222-8222-222222222222";
const HMAC_SECRET = "attachment-api-integration-secret-at-least-32-characters";
const createdAttachmentIds: string[] = [];
const requestIds: string[] = [];
const storageDirectories: string[] = [];
let userId = "";

class FixedObjectReader implements AttachmentObjectReader {
  async load(
    objectType: Parameters<AttachmentObjectReader["load"]>[0],
    objectId: string,
    objectItemId?: string,
  ): Promise<AttachmentObjectSnapshot | null> {
    if (objectType !== "purchase_order" || objectId !== OBJECT_ID) return null;
    return {
      createdBy: userId,
      id: objectId,
      itemExists: objectItemId === undefined,
      manufacturerIds: [],
      objectType,
      protectionActivated: false,
      relatedUserIds: [userId],
      state: "draft",
      storeIds: [],
      updatedAt: new Date("2026-07-25T00:00:00.000Z"),
      warehouseIds: [],
    };
  }
}

function authentication(sensitive = true): AuthenticationContext {
  const permissionCodes = [
    "attachment.file.upload",
    "attachment.file.read",
    "attachment.file.download",
    "attachment.file.link",
    "attachment.file.unlink",
    "purchase.order.read",
    "purchase.order.update",
    ...(sensitive ? ["field.attachment-sensitive.read" as const] : []),
  ] satisfies PermissionCode[];
  return {
    user: {
      dataScopes: ["self_created"],
      permissionCodes,
      roleCodes: ["administrator"],
      userId,
      username: "attachment-integration",
    },
  };
}

function context(): RequestContext {
  const requestId = randomUUID();
  requestIds.push(requestId);
  return { requestId, timestamp: new Date().toISOString() };
}

function uploadInput(overrides: Partial<AttachmentUploadDto> = {}): AttachmentUploadDto {
  return {
    attachmentCategory: "general_business_document",
    file: {
      content: Uint8Array.from(PNG_BYTES),
      declaredMimeType: "image/png",
      originalFilename: "attachment-integration.png",
    },
    objectId: OBJECT_ID,
    objectType: "purchase_order",
    sortOrder: 0,
    ...overrides,
  };
}

function idempotency(repository: IdempotencyRepository): IdempotencyAdapter {
  return new IdempotencyAdapter(repository, {
    hmacSecret: HMAC_SECRET,
    leaseMilliseconds: 20,
    maxResponseBytes: 65_536,
    retentionMilliseconds: 86_400_000,
  });
}

function resourceId(response: Awaited<ReturnType<AttachmentService["upload"]>>): string {
  const body = response.body as {
    data?: { id?: string };
  };
  if (!body.data?.id) throw new Error("upload response is missing attachment id");
  createdAttachmentIds.push(body.data.id);
  return body.data.id;
}

function countingStorage(base: ObjectStorageAdapter) {
  let stores = 0;
  let softDeletes = 0;
  let deletes = 0;
  const storage: ObjectStorageAdapter = {
    ...base,
    async delete(key) {
      deletes += 1;
      await base.delete(key);
    },
    async softDelete(key) {
      softDeletes += 1;
      return base.softDelete(key);
    },
    async store(input) {
      stores += 1;
      return base.store(input);
    },
  };
  return {
    counts: () => ({ deletes, softDeletes, stores }),
    storage,
  };
}

async function service(
  options: Readonly<{
    idempotencyRepository?: IdempotencyRepository;
    storage?: ObjectStorageAdapter;
    transaction?: AttachmentTransactionRunner;
  }> = {},
) {
  const rootPath = await mkdtemp(join(tmpdir(), "attachment-api-integration-"));
  storageDirectories.push(rootPath);
  const storage = options.storage ?? createLocalObjectStorage({ rootPath });
  return {
    rootPath,
    service: new AttachmentService({
      accessScopes: new PrismaAttachmentAccessScopeResolver(client!),
      attachments: new PrismaAttachmentRepository(client!),
      audit: new PrismaAuditWriter(client!),
      contentScanner: new BaselineAttachmentContentScanner(),
      idempotency: idempotency(
        options.idempotencyRepository ?? new PrismaIdempotencyRepository(client!),
      ),
      links: new PrismaAttachmentLinkRepository(client!),
      objects: new AttachmentObjectRegistry(new FixedObjectReader()),
      receiptReader: new PrismaAttachmentUploadReceiptReader(client!),
      storage,
      transaction: options.transaction ?? new PrismaAttachmentTransactionRunner(client!),
      uploadPolicy: {
        allowedFileTypes: [{ extension: "png", mimeType: "image/png" }],
        maxFileSize: 10 * 1024 * 1024,
      },
    }),
    storage,
  };
}

integration("ATT-001 through ATT-004 PostgreSQL and Storage integration", () => {
  beforeAll(async () => {
    const user = await client!.users.findFirst({
      orderBy: { created_at: "asc" },
      select: { id: true },
    });
    if (!user) throw new Error("Attachment API integration requires the development seed");
    userId = user.id;
  });

  afterAll(async () => {
    if (requestIds.length > 0) {
      await client!.audit_logs.deleteMany({ where: { request_trace_id: { in: requestIds } } });
      await client!.idempotency_records.deleteMany({
        where: { request_trace_id: { in: requestIds } },
      });
    }
    if (createdAttachmentIds.length > 0) {
      await client!.attachment_links.deleteMany({
        where: { attachment_id: { in: createdAttachmentIds } },
      });
      await client!.attachments.deleteMany({ where: { id: { in: createdAttachmentIds } } });
    }
    await Promise.all(
      storageDirectories.map((directory) => rm(directory, { force: true, recursive: true })),
    );
    await client?.$disconnect();
  });

  it("uploads once under 20 concurrent claims, replays safely and rejects a different hash", async () => {
    const rootPath = await mkdtemp(join(tmpdir(), "attachment-api-concurrency-"));
    storageDirectories.push(rootPath);
    const counted = countingStorage(createLocalObjectStorage({ rootPath }));
    const endpoints = await Promise.all(
      Array.from(
        { length: 20 },
        async () =>
          (
            await service({
              storage: counted.storage,
            })
          ).service,
      ),
    );
    const endpoint = endpoints[0]!;
    const requestContext = context();
    const requests = endpoints.map((candidate) =>
      candidate.upload(uploadInput(), "same-concurrent-key", authentication(), requestContext),
    );
    const results = await Promise.allSettled(requests);
    expect(results.filter(({ status }) => status === "fulfilled").length).toBeGreaterThanOrEqual(1);
    expect(counted.counts().stores).toBe(1);
    const fulfilled = results.find(
      (
        result,
      ): result is PromiseFulfilledResult<Awaited<ReturnType<AttachmentService["upload"]>>> =>
        result.status === "fulfilled",
    )!;
    const attachmentId = resourceId(fulfilled.value);

    const replay = await endpoint.upload(
      uploadInput(),
      "same-concurrent-key",
      authentication(),
      requestContext,
    );
    expect(resourceId(replay)).toBe(attachmentId);
    expect(counted.counts().stores).toBe(1);
    await expect(
      endpoint.upload(
        uploadInput({ sortOrder: 1 }),
        "same-concurrent-key",
        authentication(),
        context(),
      ),
    ).rejects.toBeInstanceOf(IdempotencyReplayError);
    expect(await client!.attachment_links.count({ where: { attachment_id: attachmentId } })).toBe(
      1,
    );
    expect(
      await client!.audit_logs.count({
        where: { action_code: "attachment.upload.succeeded", object_id: attachmentId },
      }),
    ).toBe(1);
  });

  it("filters list/detail by scope and sensitivity and streams active downloads", async () => {
    const bundle = await service();
    const endpoint = bundle.service;
    const normal = await endpoint.upload(
      uploadInput({ file: { ...uploadInput().file, originalFilename: "normal.png" } }),
      `normal-${randomUUID()}`,
      authentication(),
      context(),
    );
    const sensitive = await endpoint.upload(
      uploadInput({
        file: { ...uploadInput().file, originalFilename: "sensitive.png" },
        isSensitive: true,
      }),
      `sensitive-${randomUUID()}`,
      authentication(),
      context(),
    );
    const normalId = resourceId(normal);
    const sensitiveId = resourceId(sensitive);
    const deniedScope: AuthenticationContext = {
      user: { ...authentication().user, dataScopes: [] },
    };
    await expect(
      endpoint.list(
        {
          objectId: OBJECT_ID,
          objectType: "purchase_order",
          page: 1,
          pageSize: 20,
          sortBy: "uploadedAt",
          sortOrder: "desc",
        },
        deniedScope,
        context(),
      ),
    ).rejects.toBeInstanceOf(AttachmentDataScopeDeniedError);
    const list = await endpoint.list(
      {
        objectId: OBJECT_ID,
        objectType: "purchase_order",
        page: 1,
        pageSize: 100,
        sortBy: "originalFilename",
        sortOrder: "asc",
      },
      authentication(false),
      context(),
    );
    expect(list.items.map(({ id }) => id)).toContain(normalId);
    expect(list.items.map(({ id }) => id)).not.toContain(sensitiveId);
    expect(list.items.find(({ id }) => id === normalId)).toMatchObject({
      permission: { canDownload: true, canRead: true },
      storageStrategy: "stream",
    });
    const paged = await endpoint.list(
      {
        objectId: OBJECT_ID,
        objectType: "purchase_order",
        page: 1,
        pageSize: 1,
        sortBy: "uploadedAt",
        sortOrder: "desc",
      },
      authentication(false),
      context(),
    );
    expect(paged.items).toHaveLength(1);
    expect(paged.totalPages).toBe(Math.ceil(paged.total / paged.pageSize));
    await expect(
      endpoint.detail(sensitiveId, authentication(false), context()),
    ).rejects.toMatchObject({ code: "RESOURCE_ATTACHMENT_NOT_FOUND" });
    await expect(
      endpoint.download(sensitiveId, authentication(false), context()),
    ).rejects.toMatchObject({ code: "PERMISSION_ATTACHMENT_DENIED" });
    const detail = await endpoint.detail(normalId, authentication(), context());
    expect(detail.links).toHaveLength(1);
    expect(detail).not.toHaveProperty("storageReference");
    const download = await endpoint.download(normalId, authentication(), context());
    const chunks: Buffer[] = [];
    for await (const chunk of download.stream) chunks.push(Buffer.from(chunk));
    expect(Buffer.concat(chunks)).toEqual(PNG_BYTES);
    expect(
      await client!.audit_logs.count({
        where: { action_code: "attachment.download.allowed", object_id: normalId },
      }),
    ).toBe(1);

    const repository = new PrismaAttachmentRepository(client!);
    const active = (await repository.findById(normalId))!;
    const softDeleted = await repository.softDelete({
      expectedStatus: "active",
      expectedUpdatedAt: active.updatedAt,
      id: normalId,
      nextStatus: "soft_deleted",
      now: new Date(active.updatedAt.getTime() + 1),
      updatedBy: userId,
    });
    const pending = await repository.markPendingPhysicalDelete({
      expectedStatus: "soft_deleted",
      expectedUpdatedAt: softDeleted.updatedAt,
      id: normalId,
      nextStatus: "pending_physical_delete",
      now: new Date(softDeleted.updatedAt.getTime() + 1),
      updatedBy: userId,
    });
    const physicallyDeleted = await repository.markPhysicallyDeleted({
      expectedStatus: "pending_physical_delete",
      expectedUpdatedAt: pending.updatedAt,
      id: normalId,
      nextStatus: "physically_deleted",
      now: new Date(pending.updatedAt.getTime() + 1),
      updatedBy: userId,
    });
    await bundle.storage.delete(physicallyDeleted.storageReference);
    await expect(endpoint.download(normalId, authentication(), context())).rejects.toMatchObject({
      code: "STATE_ATTACHMENT_ACTION_NOT_ALLOWED",
    });
    const tombstone = await endpoint.detail(normalId, authentication(), context());
    expect(tombstone).toMatchObject({
      id: normalId,
      status: "physically_deleted",
      storageStrategy: "stream",
    });
    expect(tombstone).not.toHaveProperty("storageReference");
  });

  it("rolls back audit failure and compensates Storage after transaction failure", async () => {
    const rootPath = await mkdtemp(join(tmpdir(), "attachment-api-compensation-"));
    storageDirectories.push(rootPath);
    const counted = countingStorage(createLocalObjectStorage({ rootPath }));
    const failingTransaction: AttachmentTransactionRunner = {
      run: <T>(operation: (transaction: AttachmentTransactionContext) => Promise<T>) =>
        client!.$transaction((databaseTransaction) =>
          operation({
            attachments: new PrismaAttachmentRepository(databaseTransaction),
            audit: new InMemoryAuditWriter(new Error("audit unavailable")),
            links: new PrismaAttachmentLinkRepository(databaseTransaction),
          }),
        ),
    };
    const endpoint = (
      await service({
        storage: counted.storage,
        transaction: failingTransaction,
      })
    ).service;
    const filename = `audit-failure-${randomUUID()}.png`;
    const before = await client!.attachments.count({ where: { original_file_name: filename } });
    const response = await endpoint.upload(
      uploadInput({ file: { ...uploadInput().file, originalFilename: filename } }),
      `audit-failure-${randomUUID()}`,
      authentication(),
      context(),
    );
    expect(response).toMatchObject({ httpStatus: 503 });
    expect(counted.counts()).toEqual({ deletes: 1, softDeletes: 1, stores: 1 });
    expect(await client!.attachments.count({ where: { original_file_name: filename } })).toBe(
      before,
    );
  });

  it("reconciles a committed upload when the first idempotency terminal write fails", async () => {
    const delegate = new PrismaIdempotencyRepository(client!);
    let failTerminal = true;
    const terminalFailureRepository: IdempotencyRepository = {
      claim: (input: IdempotencyClaimInput): Promise<IdempotencyClaimResult> =>
        delegate.claim(input),
      complete: async (input: IdempotencyTerminalInput) => {
        if (failTerminal) {
          failTerminal = false;
          return null;
        }
        return delegate.complete(input);
      },
      fail: (input: IdempotencyTerminalInput) => delegate.fail(input),
      finalizeExpired: (status: "completed" | "failed", input: IdempotencyExpiredTerminalInput) =>
        delegate.finalizeExpired(status, input),
      find: (scopeCode: string, keyHash: string) => delegate.find(scopeCode, keyHash),
      reclaimExpired: (input: IdempotencyReclaimInput) => delegate.reclaimExpired(input),
      removeExpiredTerminalRecords: (before: Date, limit: number) =>
        delegate.removeExpiredTerminalRecords(before, limit),
    };
    const endpoint = (
      await service({
        idempotencyRepository: terminalFailureRepository,
      })
    ).service;
    const requestContext = context();
    const key = `reconcile-${randomUUID()}`;
    await expect(
      endpoint.upload(
        uploadInput({ file: { ...uploadInput().file, originalFilename: "reconcile.png" } }),
        key,
        authentication(),
        requestContext,
      ),
    ).rejects.toBeInstanceOf(IdempotencyReplayError);
    await new Promise((resolve) => setTimeout(resolve, 30));
    const replay = await endpoint.upload(
      uploadInput({ file: { ...uploadInput().file, originalFilename: "reconcile.png" } }),
      key,
      authentication(),
      context(),
    );
    const replayId = resourceId(replay);
    expect(await client!.attachments.findUnique({ where: { id: replayId } })).not.toBeNull();
    expect(
      await client!.attachments.count({ where: { original_file_name: "reconcile.png" } }),
    ).toBe(1);
  });

  it("maps an injected Link uniqueness conflict and compensates the stored object", async () => {
    const rootPath = await mkdtemp(join(tmpdir(), "attachment-api-link-conflict-"));
    storageDirectories.push(rootPath);
    const counted = countingStorage(createLocalObjectStorage({ rootPath }));
    const conflictTransaction: AttachmentTransactionRunner = {
      async run() {
        throw new AttachmentAlreadyLinkedError();
      },
    };
    const endpoint = (
      await service({
        storage: counted.storage,
        transaction: conflictTransaction,
      })
    ).service;
    const response = await endpoint.upload(
      uploadInput(),
      `link-conflict-${randomUUID()}`,
      authentication(),
      context(),
    );
    expect(response).toMatchObject({ httpStatus: 409 });
    expect(response.body).toMatchObject({
      error: { code: "CONFLICT_ATTACHMENT_LINK_DUPLICATE" },
    });
    expect(counted.counts()).toEqual({ deletes: 1, softDeletes: 1, stores: 1 });
  });

  it("fails closed and audits when Storage compensation cannot physically delete", async () => {
    const rootPath = await mkdtemp(join(tmpdir(), "attachment-api-compensation-failure-"));
    storageDirectories.push(rootPath);
    const base = createLocalObjectStorage({ rootPath });
    const storage: ObjectStorageAdapter = {
      ...base,
      async delete() {
        throw new Error("injected physical deletion failure");
      },
    };
    const endpoint = (
      await service({
        storage,
        transaction: {
          async run() {
            throw new Error("injected database failure");
          },
        },
      })
    ).service;
    const response = await endpoint.upload(
      uploadInput(),
      `compensation-failure-${randomUUID()}`,
      authentication(),
      context(),
    );
    expect(response).toMatchObject({ httpStatus: 503 });
    expect(response.body).toMatchObject({
      error: { code: "SYSTEM_ATTACHMENT_STORAGE_DELETE_FAILED" },
    });
    expect(
      await client!.audit_logs.count({
        where: { action_code: "attachment.storage.compensation_failed" },
      }),
    ).toBeGreaterThan(0);
  });
});
