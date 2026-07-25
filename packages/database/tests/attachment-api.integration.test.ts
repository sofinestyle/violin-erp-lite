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
import { PrismaAttachmentAuditReader } from "../src/attachment/prisma-attachment-audit-reader";
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
const SECOND_OBJECT_ID = "33333333-3333-4333-8333-333333333333";
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
    if (
      !["purchase_order", "inspection_order", "import_task"].includes(objectType) ||
      ![OBJECT_ID, SECOND_OBJECT_ID].includes(objectId)
    ) {
      return null;
    }
    return {
      createdBy: userId,
      id: objectId,
      itemExists: objectItemId === undefined,
      manufacturerIds: [],
      objectType,
      protectionActivated: objectType === "inspection_order",
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
    "attachment.file.delete",
    "audit.log.read",
    "purchase.order.read",
    "purchase.order.update",
    "inspection.order.read",
    "inspection.order.update",
    "import.task.read",
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
      auditReader: new PrismaAttachmentAuditReader(client!),
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

integration("ATT-001 through ATT-008 PostgreSQL and Storage integration", () => {
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
            lockAttachment: async () => {},
            lockAttachmentLink: async () => {},
            lockAttachmentLinks: async () => {},
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

  it("implements ATT-005 and ATT-006 with PostgreSQL link arbitration and stable replay", async () => {
    const bundle = await service();
    const endpoint = bundle.service;
    const uploaded = await endpoint.upload(
      uploadInput({ file: { ...uploadInput().file, originalFilename: "link-actions.png" } }),
      `link-actions-upload-${randomUUID()}`,
      authentication(),
      context(),
    );
    const attachmentId = resourceId(uploaded);
    const createInput = {
      attachmentCategory: "general_business_document" as const,
      objectId: SECOND_OBJECT_ID,
      objectType: "purchase_order" as const,
      sortOrder: 2,
    };
    const keys = Array.from({ length: 20 }, () => `link-${randomUUID()}`);
    const created = await Promise.all(
      keys.map((key) =>
        endpoint.createLink(attachmentId, createInput, key, authentication(), context()),
      ),
    );
    expect(created.filter(({ httpStatus }) => httpStatus === 201)).toHaveLength(1);
    expect(created.filter(({ httpStatus }) => httpStatus === 409)).toHaveLength(19);
    expect(
      await client!.attachment_links.count({
        where: {
          attachment_id: attachmentId,
          object_id: SECOND_OBJECT_ID,
        },
      }),
    ).toBe(1);

    const winningIndex = created.findIndex(({ httpStatus }) => httpStatus === 201);
    const replay = await endpoint.createLink(
      attachmentId,
      createInput,
      keys[winningIndex]!,
      authentication(),
      context(),
    );
    expect(replay.httpStatus).toBe(201);
    await expect(
      endpoint.createLink(
        attachmentId,
        { ...createInput, sortOrder: 3 },
        keys[winningIndex]!,
        authentication(),
        context(),
      ),
    ).rejects.toBeInstanceOf(IdempotencyReplayError);

    const link = await client!.attachment_links.findFirstOrThrow({
      where: { attachment_id: attachmentId, object_id: SECOND_OBJECT_ID },
    });
    const unlinkKey = `unlink-${randomUUID()}`;
    const unlinked = await endpoint.unlink(
      attachmentId,
      { attachmentLinkId: link.id, reason: "解除重复业务关联" },
      unlinkKey,
      authentication(),
      context(),
    );
    expect(unlinked.httpStatus).toBe(200);
    expect(await client!.attachment_links.findUnique({ where: { id: link.id } })).toBeNull();
    const unlinkReplay = await endpoint.unlink(
      attachmentId,
      { attachmentLinkId: link.id, reason: "解除重复业务关联" },
      unlinkKey,
      authentication(),
      context(),
    );
    expect(unlinkReplay.httpStatus).toBe(200);
    expect(
      await client!.audit_logs.count({
        where: { action_code: "attachment.link.unlinked", object_id: attachmentId },
      }),
    ).toBe(1);

    await endpoint.createLink(
      attachmentId,
      createInput,
      `link-concurrent-unlink-create-${randomUUID()}`,
      authentication(),
      context(),
    );
    const concurrentLink = await client!.attachment_links.findFirstOrThrow({
      where: { attachment_id: attachmentId, object_id: SECOND_OBJECT_ID },
    });
    const concurrentUnlinks = await Promise.all(
      Array.from({ length: 2 }, () =>
        endpoint.unlink(
          attachmentId,
          { attachmentLinkId: concurrentLink.id, reason: "并发解除只允许一次提交" },
          `link-concurrent-unlink-${randomUUID()}`,
          authentication(),
          context(),
        ),
      ),
    );
    expect(concurrentUnlinks.filter(({ httpStatus }) => httpStatus === 200)).toHaveLength(1);
    expect(concurrentUnlinks.filter(({ httpStatus }) => httpStatus === 404)).toHaveLength(1);
    expect(
      await client!.attachment_links.count({
        where: { attachment_id: attachmentId, object_id: SECOND_OBJECT_ID },
      }),
    ).toBe(0);

    await expect(
      endpoint.createLink(
        attachmentId,
        {
          attachmentCategory: "general_business_document",
          objectId: OBJECT_ID,
          objectType: "import_task",
          sortOrder: 0,
        },
        `import-link-${randomUUID()}`,
        authentication(),
        context(),
      ),
    ).rejects.toMatchObject({
      code: "VALIDATION_ATTACHMENT_CATEGORY_OBJECT_MISMATCH",
    });

    const evidence = await new PrismaAttachmentLinkRepository(client!).create({
      attachmentCategory: "inspection_evidence",
      attachmentId,
      createdBy: userId,
      linkedAt: new Date(),
      linkedBy: userId,
      objectId: OBJECT_ID,
      objectType: "inspection_order",
      sortOrder: 0,
    });
    await expect(
      endpoint.unlink(
        attachmentId,
        { attachmentLinkId: evidence.id, reason: "不得解除已保护验收证据" },
        `evidence-unlink-${randomUUID()}`,
        authentication(),
        context(),
      ),
    ).rejects.toMatchObject({ code: "STATE_ATTACHMENT_HISTORY_PROTECTED" });
    expect(
      await client!.attachment_links.findUnique({ where: { id: evidence.id } }),
    ).not.toBeNull();

    const sensitive = await endpoint.upload(
      uploadInput({
        file: { ...uploadInput().file, originalFilename: "link-sensitive.png" },
        isSensitive: true,
      }),
      `link-sensitive-upload-${randomUUID()}`,
      authentication(),
      context(),
    );
    const sensitiveId = resourceId(sensitive);
    await expect(
      endpoint.createLink(
        sensitiveId,
        createInput,
        `link-sensitive-create-${randomUUID()}`,
        authentication(false),
        context(),
      ),
    ).rejects.toMatchObject({ code: "PERMISSION_ATTACHMENT_DENIED" });
    const sensitiveLink = await client!.attachment_links.findFirstOrThrow({
      where: { attachment_id: sensitiveId },
    });
    await expect(
      endpoint.unlink(
        sensitiveId,
        { attachmentLinkId: sensitiveLink.id, reason: "无敏感权限不得解除" },
        `link-sensitive-unlink-${randomUUID()}`,
        authentication(false),
        context(),
      ),
    ).rejects.toMatchObject({ code: "PERMISSION_ATTACHMENT_DENIED" });
  });

  it("runs ATT-007 end to end, preserves the tombstone and projects ATT-008", async () => {
    const rootPath = await mkdtemp(join(tmpdir(), "attachment-delete-success-"));
    storageDirectories.push(rootPath);
    const counted = countingStorage(createLocalObjectStorage({ rootPath }));
    const endpoint = (await service({ storage: counted.storage })).service;
    const uploaded = await endpoint.upload(
      uploadInput({ file: { ...uploadInput().file, originalFilename: "delete-success.png" } }),
      `delete-success-upload-${randomUUID()}`,
      authentication(),
      context(),
    );
    const attachmentId = resourceId(uploaded);
    const initialLink = await client!.attachment_links.findFirstOrThrow({
      where: { attachment_id: attachmentId },
    });
    await endpoint.unlink(
      attachmentId,
      { attachmentLinkId: initialLink.id, reason: "删除前解除唯一关联" },
      `delete-success-unlink-${randomUUID()}`,
      authentication(),
      context(),
    );
    const beforeDelete = await client!.attachments.findUniqueOrThrow({
      where: { id: attachmentId },
    });
    const deleteKey = `delete-success-${randomUUID()}`;
    const deleted = await endpoint.deleteAttachment(
      attachmentId,
      {
        reason: "无有效关联，执行正式删除",
        version: beforeDelete.updated_at.toISOString(),
      },
      deleteKey,
      authentication(),
      context(),
    );
    expect(deleted).toMatchObject({ httpStatus: 200 });
    expect(deleted.body).toMatchObject({
      data: { attachmentId, deleted: true, status: "physically_deleted" },
    });
    expect(counted.counts()).toEqual({ deletes: 1, softDeletes: 1, stores: 1 });
    expect(await client!.attachments.findUnique({ where: { id: attachmentId } })).toMatchObject({
      id: attachmentId,
      status: "physically_deleted",
    });

    const replay = await endpoint.deleteAttachment(
      attachmentId,
      {
        reason: "无有效关联，执行正式删除",
        version: beforeDelete.updated_at.toISOString(),
      },
      deleteKey,
      authentication(),
      context(),
    );
    expect(replay.httpStatus).toBe(200);
    expect(counted.counts().deletes).toBe(1);
    await expect(
      endpoint.download(attachmentId, authentication(), context()),
    ).rejects.toMatchObject({ code: "STATE_ATTACHMENT_ACTION_NOT_ALLOWED" });
    await expect(
      endpoint.createLink(
        attachmentId,
        {
          attachmentCategory: "general_business_document",
          objectId: SECOND_OBJECT_ID,
          objectType: "purchase_order",
          sortOrder: 0,
        },
        `deleted-link-${randomUUID()}`,
        authentication(),
        context(),
      ),
    ).rejects.toMatchObject({ code: "STATE_ATTACHMENT_ACTION_NOT_ALLOWED" });

    const lifecycle = await endpoint.lifecycle(attachmentId, authentication(), context());
    expect(lifecycle).toMatchObject({
      activeLinkCount: 0,
      attachmentId,
      protected: false,
      status: "physically_deleted",
      storageAvailability: "unavailable",
    });
    expect(lifecycle.events.map(({ event }) => event)).toEqual(
      expect.arrayContaining([
        "attachment.upload.succeeded",
        "attachment.link.unlinked",
        "attachment.delete.requested",
        "attachment.soft_deleted",
        "attachment.physical_delete.succeeded",
      ]),
    );
    expect(
      lifecycle.events.find(({ event }) => event === "attachment.delete.requested")?.reason,
    ).toBe("[REDACTED]");
    expect(lifecycle.events.every((event) => !("storageReference" in event))).toBe(true);
  });

  it("persists physical_delete_failed and safely retries ATT-007", async () => {
    const rootPath = await mkdtemp(join(tmpdir(), "attachment-delete-retry-"));
    storageDirectories.push(rootPath);
    const counted = countingStorage(createLocalObjectStorage({ rootPath }));
    let failDelete = true;
    const storage: ObjectStorageAdapter = {
      ...counted.storage,
      async delete(key) {
        if (failDelete) {
          failDelete = false;
          throw new Error("injected storage delete failure");
        }
        await counted.storage.delete(key);
      },
    };
    const endpoint = (await service({ storage })).service;
    const uploaded = await endpoint.upload(
      uploadInput({ file: { ...uploadInput().file, originalFilename: "delete-retry.png" } }),
      `delete-retry-upload-${randomUUID()}`,
      authentication(),
      context(),
    );
    const attachmentId = resourceId(uploaded);
    const initialLink = await client!.attachment_links.findFirstOrThrow({
      where: { attachment_id: attachmentId },
    });
    await endpoint.unlink(
      attachmentId,
      { attachmentLinkId: initialLink.id, reason: "准备删除失败测试" },
      `delete-retry-unlink-${randomUUID()}`,
      authentication(),
      context(),
    );
    const active = await client!.attachments.findUniqueOrThrow({ where: { id: attachmentId } });
    const failed = await endpoint.deleteAttachment(
      attachmentId,
      { reason: "第一次物理删除", version: active.updated_at.toISOString() },
      `delete-retry-first-${randomUUID()}`,
      authentication(),
      context(),
    );
    expect(failed).toMatchObject({ httpStatus: 503 });
    const failedRecord = await client!.attachments.findUniqueOrThrow({
      where: { id: attachmentId },
    });
    expect(failedRecord.status).toBe("physical_delete_failed");

    const retried = await endpoint.deleteAttachment(
      attachmentId,
      { reason: "安全重试物理删除", version: failedRecord.updated_at.toISOString() },
      `delete-retry-second-${randomUUID()}`,
      authentication(),
      context(),
    );
    expect(retried.httpStatus).toBe(200);
    expect(await client!.attachments.findUnique({ where: { id: attachmentId } })).toMatchObject({
      status: "physically_deleted",
    });
    expect(
      await client!.audit_logs.count({
        where: {
          action_code: "attachment.physical_delete.failed",
          object_id: attachmentId,
        },
      }),
    ).toBe(1);
  });

  it("uses version CAS and permits only one concurrent ATT-007 Storage side effect", async () => {
    const rootPath = await mkdtemp(join(tmpdir(), "attachment-delete-concurrency-"));
    storageDirectories.push(rootPath);
    const counted = countingStorage(createLocalObjectStorage({ rootPath }));
    const endpoint = (await service({ storage: counted.storage })).service;
    const uploaded = await endpoint.upload(
      uploadInput({ file: { ...uploadInput().file, originalFilename: "delete-concurrency.png" } }),
      `delete-concurrency-upload-${randomUUID()}`,
      authentication(),
      context(),
    );
    const attachmentId = resourceId(uploaded);
    const initialLink = await client!.attachment_links.findFirstOrThrow({
      where: { attachment_id: attachmentId },
    });
    await endpoint.unlink(
      attachmentId,
      { attachmentLinkId: initialLink.id, reason: "准备并发删除" },
      `delete-concurrency-unlink-${randomUUID()}`,
      authentication(),
      context(),
    );
    const active = await client!.attachments.findUniqueOrThrow({ where: { id: attachmentId } });
    const stale = await endpoint.deleteAttachment(
      attachmentId,
      {
        reason: "过期版本不得删除",
        version: new Date(active.updated_at.getTime() - 1).toISOString(),
      },
      `delete-stale-${randomUUID()}`,
      authentication(),
      context(),
    );
    expect(stale).toMatchObject({ httpStatus: 409 });
    expect(await client!.attachments.findUnique({ where: { id: attachmentId } })).toMatchObject({
      status: "active",
    });

    const input = {
      reason: "并发删除仅允许一次副作用",
      version: active.updated_at.toISOString(),
    };
    const keys = [`delete-concurrent-${randomUUID()}`, `delete-concurrent-${randomUUID()}`];
    const results = await Promise.all(
      keys.map((key) =>
        endpoint.deleteAttachment(attachmentId, input, key, authentication(), context()),
      ),
    );
    expect(results.filter(({ httpStatus }) => httpStatus === 200)).toHaveLength(1);
    expect(results.filter(({ httpStatus }) => httpStatus === 409)).toHaveLength(1);
    expect(counted.counts()).toEqual({ deletes: 1, softDeletes: 1, stores: 1 });
    const winner = results.findIndex(({ httpStatus }) => httpStatus === 200);
    await expect(
      endpoint.deleteAttachment(
        attachmentId,
        { ...input, reason: "同Key不同Hash" },
        keys[winner]!,
        authentication(),
        context(),
      ),
    ).rejects.toBeInstanceOf(IdempotencyReplayError);
  });

  it("rolls back ATT-005 and ATT-006 when their transactional Audit write fails", async () => {
    const bundle = await service();
    const uploaded = await bundle.service.upload(
      uploadInput({ file: { ...uploadInput().file, originalFilename: "link-audit-failure.png" } }),
      `link-audit-upload-${randomUUID()}`,
      authentication(),
      context(),
    );
    const attachmentId = resourceId(uploaded);
    const failingTransaction: AttachmentTransactionRunner = {
      run: <T>(operation: (transaction: AttachmentTransactionContext) => Promise<T>) =>
        client!.$transaction((databaseTransaction) =>
          operation({
            attachments: new PrismaAttachmentRepository(databaseTransaction),
            audit: new InMemoryAuditWriter(new Error("injected audit failure")),
            links: new PrismaAttachmentLinkRepository(databaseTransaction),
            lockAttachment: async () => {},
            lockAttachmentLink: async () => {},
            lockAttachmentLinks: async () => {},
          }),
        ),
    };
    const failing = (
      await service({
        storage: bundle.storage,
        transaction: failingTransaction,
      })
    ).service;
    const create = await failing.createLink(
      attachmentId,
      {
        attachmentCategory: "general_business_document",
        objectId: SECOND_OBJECT_ID,
        objectType: "purchase_order",
        sortOrder: 0,
      },
      `link-audit-create-${randomUUID()}`,
      authentication(),
      context(),
    );
    expect(create.httpStatus).toBe(503);
    expect(
      await client!.attachment_links.count({
        where: { attachment_id: attachmentId, object_id: SECOND_OBJECT_ID },
      }),
    ).toBe(0);

    const initialLink = await client!.attachment_links.findFirstOrThrow({
      where: { attachment_id: attachmentId, object_id: OBJECT_ID },
    });
    const unlink = await failing.unlink(
      attachmentId,
      { attachmentLinkId: initialLink.id, reason: "审计失败必须回滚" },
      `link-audit-unlink-${randomUUID()}`,
      authentication(),
      context(),
    );
    expect(unlink.httpStatus).toBe(503);
    expect(await client!.attachment_links.findUnique({ where: { id: initialLink.id } })).not.toBe(
      null,
    );
    await bundle.service.unlink(
      attachmentId,
      { attachmentLinkId: initialLink.id, reason: "准备删除审计回滚测试" },
      `delete-audit-prep-${randomUUID()}`,
      authentication(),
      context(),
    );
    const beforeDelete = await client!.attachments.findUniqueOrThrow({
      where: { id: attachmentId },
    });
    const deletion = await failing.deleteAttachment(
      attachmentId,
      {
        reason: "删除审计失败必须回滚",
        version: beforeDelete.updated_at.toISOString(),
      },
      `delete-audit-failure-${randomUUID()}`,
      authentication(),
      context(),
    );
    expect(deletion.httpStatus).toBe(503);
    expect(await client!.attachments.findUnique({ where: { id: attachmentId } })).toMatchObject({
      status: "active",
    });
  });

  it("reconciles ATT-007 after the committed delete outlives its idempotency terminal write", async () => {
    const rootPath = await mkdtemp(join(tmpdir(), "attachment-delete-reconciliation-"));
    storageDirectories.push(rootPath);
    const counted = countingStorage(createLocalObjectStorage({ rootPath }));
    const normal = await service({ storage: counted.storage });
    const uploaded = await normal.service.upload(
      uploadInput({ file: { ...uploadInput().file, originalFilename: "delete-reconcile.png" } }),
      `delete-reconcile-upload-${randomUUID()}`,
      authentication(),
      context(),
    );
    const attachmentId = resourceId(uploaded);
    const initialLink = await client!.attachment_links.findFirstOrThrow({
      where: { attachment_id: attachmentId },
    });
    await normal.service.unlink(
      attachmentId,
      { attachmentLinkId: initialLink.id, reason: "准备删除对账" },
      `delete-reconcile-unlink-${randomUUID()}`,
      authentication(),
      context(),
    );
    const active = await client!.attachments.findUniqueOrThrow({ where: { id: attachmentId } });

    const delegate = new PrismaIdempotencyRepository(client!);
    let failTerminal = true;
    const terminalFailureRepository: IdempotencyRepository = {
      claim: (input) => delegate.claim(input),
      complete: async (input) => {
        if (failTerminal) {
          failTerminal = false;
          return null;
        }
        return delegate.complete(input);
      },
      fail: (input) => delegate.fail(input),
      finalizeExpired: (status, input) => delegate.finalizeExpired(status, input),
      find: (scopeCode, keyHash) => delegate.find(scopeCode, keyHash),
      reclaimExpired: (input) => delegate.reclaimExpired(input),
      removeExpiredTerminalRecords: (before, limit) =>
        delegate.removeExpiredTerminalRecords(before, limit),
    };
    const endpoint = (
      await service({
        idempotencyRepository: terminalFailureRepository,
        storage: counted.storage,
      })
    ).service;
    const input = {
      reason: "删除已提交后恢复幂等终态",
      version: active.updated_at.toISOString(),
    };
    const key = `delete-reconcile-${randomUUID()}`;
    await expect(
      endpoint.deleteAttachment(attachmentId, input, key, authentication(), context()),
    ).rejects.toBeInstanceOf(IdempotencyReplayError);
    await new Promise((resolve) => setTimeout(resolve, 30));
    const replay = await endpoint.deleteAttachment(
      attachmentId,
      input,
      key,
      authentication(),
      context(),
    );
    expect(replay.httpStatus).toBe(200);
    expect(counted.counts()).toEqual({ deletes: 1, softDeletes: 1, stores: 1 });
  });

  it("projects every Frozen ATT-008 state without mutating Attachment or reading binary", async () => {
    const bundle = await service();
    const endpoint = bundle.service;
    const uploaded = await endpoint.upload(
      uploadInput({ file: { ...uploadInput().file, originalFilename: "lifecycle-states.png" } }),
      `lifecycle-states-upload-${randomUUID()}`,
      authentication(),
      context(),
    );
    const attachmentId = resourceId(uploaded);
    expect(await endpoint.lifecycle(attachmentId, authentication(), context())).toMatchObject({
      activeLinkCount: 1,
      status: "active",
      storageAvailability: "available",
    });
    const link = await client!.attachment_links.findFirstOrThrow({
      where: { attachment_id: attachmentId },
    });
    await endpoint.unlink(
      attachmentId,
      { attachmentLinkId: link.id, reason: "准备生命周期投影" },
      `lifecycle-states-unlink-${randomUUID()}`,
      authentication(),
      context(),
    );

    const repository = new PrismaAttachmentRepository(client!);
    const active = (await repository.findById(attachmentId))!;
    const soft = await repository.softDelete({
      expectedStatus: "active",
      expectedUpdatedAt: active.updatedAt,
      id: attachmentId,
      nextStatus: "soft_deleted",
      now: new Date(active.updatedAt.getTime() + 1),
      updatedBy: userId,
    });
    await bundle.storage.softDelete(soft.storageReference);
    expect(await endpoint.lifecycle(attachmentId, authentication(), context())).toMatchObject({
      activeLinkCount: 0,
      status: "soft_deleted",
      storageAvailability: "unavailable",
    });
    const pending = await repository.markPendingPhysicalDelete({
      expectedStatus: "soft_deleted",
      expectedUpdatedAt: soft.updatedAt,
      id: attachmentId,
      nextStatus: "pending_physical_delete",
      now: new Date(soft.updatedAt.getTime() + 1),
      updatedBy: userId,
    });
    expect(await endpoint.lifecycle(attachmentId, authentication(), context())).toMatchObject({
      status: "pending_physical_delete",
      storageAvailability: "unavailable",
    });
    const failed = await repository.markPhysicalDeleteFailed({
      expectedStatus: "pending_physical_delete",
      expectedUpdatedAt: pending.updatedAt,
      id: attachmentId,
      nextStatus: "physical_delete_failed",
      now: new Date(pending.updatedAt.getTime() + 1),
      updatedBy: userId,
    });
    expect(await endpoint.lifecycle(attachmentId, authentication(), context())).toMatchObject({
      status: "physical_delete_failed",
      storageAvailability: "unavailable",
    });
    const retry = await repository.markPendingPhysicalDelete({
      expectedStatus: "physical_delete_failed",
      expectedUpdatedAt: failed.updatedAt,
      id: attachmentId,
      nextStatus: "pending_physical_delete",
      now: new Date(failed.updatedAt.getTime() + 1),
      updatedBy: userId,
    });
    await bundle.storage.delete(retry.storageReference);
    const terminal = await repository.markPhysicallyDeleted({
      expectedStatus: "pending_physical_delete",
      expectedUpdatedAt: retry.updatedAt,
      id: attachmentId,
      nextStatus: "physically_deleted",
      now: new Date(retry.updatedAt.getTime() + 1),
      updatedBy: userId,
    });
    const beforeReadVersion = terminal.updatedAt.toISOString();
    const tombstone = await endpoint.lifecycle(attachmentId, authentication(), context());
    expect(tombstone).toMatchObject({
      status: "physically_deleted",
      storageAvailability: "unavailable",
      version: beforeReadVersion,
    });
    expect((await repository.findById(attachmentId))!.updatedAt.toISOString()).toBe(
      beforeReadVersion,
    );
  });
});
