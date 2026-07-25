import type { Readable } from "node:stream";
import type { AuthenticationContext } from "../auth/authentication.js";
import { requirePermission } from "../authorization/authorization.js";
import { recordAuditEvent, type AuditEvent, type AuditWriter } from "../audit/audit.js";
import { ValidationError, type AppError } from "../errors/app-error.js";
import type { IdempotencyAdapter } from "../idempotency/idempotency.js";
import type {
  IdempotencyJson,
  IdempotencyReconciliationStrategy,
  IdempotencySafeResponse,
} from "../idempotency/types.js";
import type { RequestContext } from "../request-context/request-context.js";
import {
  ObjectStorageIntegrityError,
  type ObjectStorageAdapter,
  type ObjectStorageMetadata,
} from "../storage/object-storage.js";
import { validateUpload, type UploadPolicy, type ValidatedUpload } from "../upload/upload.js";
import { AttachmentCategoryRegistry } from "./category-registry.js";
import { attachmentStorageDeleteFailedError, mapAttachmentError } from "./error-mapper.js";
import {
  AttachmentDomainError,
  AttachmentNotFoundError,
  AttachmentObjectStateError,
  AttachmentPermissionDeniedError,
  AttachmentStateConflictError,
} from "./errors.js";
import { AttachmentObjectRegistry } from "./object-registry.js";
import type {
  AttachmentAccessContext,
  AttachmentAccessScopeResolver,
  AttachmentContentScanner,
  AttachmentLinkDto,
  AttachmentLinkRecord,
  AttachmentLinkRepository,
  AttachmentListQueryDto,
  AttachmentListResult,
  AttachmentPermissionDto,
  AttachmentRecord,
  AttachmentRepository,
  AttachmentResponseDto,
  AttachmentTransactionRunner,
  AttachmentUploadDto,
  AttachmentUploadReceiptReader,
  AttachmentValidationOperation,
} from "./types.js";
import { AttachmentValidator } from "./validator.js";

export type AttachmentDownload = Readonly<{
  attachment: AttachmentRecord;
  stream: Readable;
}>;

export type AttachmentServiceDependencies = Readonly<{
  accessScopes: AttachmentAccessScopeResolver;
  attachments: AttachmentRepository;
  audit: AuditWriter;
  categories?: AttachmentCategoryRegistry;
  contentScanner: AttachmentContentScanner;
  idempotency: IdempotencyAdapter;
  links: AttachmentLinkRepository;
  objects: AttachmentObjectRegistry;
  receiptReader: AttachmentUploadReceiptReader;
  storage: ObjectStorageAdapter;
  transaction: AttachmentTransactionRunner;
  uploadPolicy: UploadPolicy;
}>;

type UploadAuthorization = Readonly<{
  access: AttachmentAccessContext;
  isSensitive: boolean;
}>;

async function accessContext(
  authentication: AuthenticationContext,
  resolver: AttachmentAccessScopeResolver,
): Promise<AttachmentAccessContext> {
  const warehouseIds = authentication.user.warehouseScopes?.map(({ targetId }) => targetId) ?? [];
  return Object.freeze({
    dataScopes: authentication.user.dataScopes,
    manufacturerIds: await resolver.resolveManufacturerIds(warehouseIds),
    permissionCodes: authentication.user.permissionCodes,
    storeIds: authentication.user.storeScopes?.map(({ targetId }) => targetId) ?? [],
    userId: authentication.user.userId,
    warehouseIds,
  });
}

function userSummary(id: string) {
  return Object.freeze({ id });
}

function linkDto(link: AttachmentLinkRecord): AttachmentLinkDto {
  return Object.freeze({
    attachmentCategory: link.attachmentCategory,
    id: link.id,
    linkedAt: link.linkedAt.toISOString(),
    linkedBy: userSummary(link.linkedBy),
    objectId: link.objectId,
    objectItemId: link.objectItemId,
    objectType: link.objectType,
    sortOrder: link.sortOrder,
  });
}

function json(value: unknown): IdempotencyJson {
  return JSON.parse(JSON.stringify(value)) as IdempotencyJson;
}

function successEnvelope(data: AttachmentResponseDto, context: RequestContext): IdempotencyJson {
  return json({
    data,
    meta: {},
    requestId: context.requestId,
    success: true,
    timestamp: context.timestamp,
  });
}

function errorEnvelope(error: AppError, context: RequestContext): IdempotencyJson {
  return json({
    error: {
      code: error.code,
      details: error.expose ? error.details : [],
      message: error.expose ? error.message : "系统异常，请稍后重试",
    },
    requestId: context.requestId,
    success: false,
    timestamp: context.timestamp,
  });
}

function auditEvent(
  action: string,
  authentication: AuthenticationContext,
  context: RequestContext,
  resourceId: string,
  result: "failure" | "success",
  metadata?: unknown,
  failureReason?: string,
): AuditEvent {
  const common = {
    action,
    actorUserId: authentication.user.userId,
    metadata,
    moduleCode: "attachment",
    requestId: context.requestId,
    resourceId,
    resourceType: "attachment",
    timestamp: new Date(context.timestamp),
    usernameSnapshot: authentication.user.username,
  } as const;
  return result === "success"
    ? { ...common, result }
    : { ...common, failureReason: failureReason ?? "附件操作失败", result };
}

function compareMetadata(attachment: AttachmentRecord, metadata: ObjectStorageMetadata): void {
  if (
    metadata.checksum !== attachment.checksum ||
    metadata.extension !== attachment.fileExtension ||
    metadata.fileSize !== Number(attachment.fileSize) ||
    metadata.mimeType !== attachment.mimeType
  ) {
    throw new ObjectStorageIntegrityError();
  }
}

function hasSensitivePermission(authentication: AuthenticationContext): boolean {
  return authentication.user.permissionCodes.includes("field.attachment-sensitive.read");
}

function allowsProtectedAppend(category: AttachmentLinkRecord["attachmentCategory"]): boolean {
  return category === "payment_voucher" || category === "production_progress_evidence";
}

function sortLinks(
  entries: readonly Readonly<{ attachment: AttachmentRecord; link: AttachmentLinkRecord }>[],
  query: AttachmentListQueryDto,
) {
  const direction = query.sortOrder === "asc" ? 1 : -1;
  return [...entries].sort((left, right) => {
    const comparison =
      query.sortBy === "sortOrder"
        ? left.link.sortOrder - right.link.sortOrder
        : query.sortBy === "originalFilename"
          ? left.attachment.originalFileName.localeCompare(right.attachment.originalFileName)
          : left.attachment.uploadedAt.getTime() - right.attachment.uploadedAt.getTime();
    if (comparison !== 0) return comparison * direction;
    return left.attachment.id.localeCompare(right.attachment.id) * direction;
  });
}

export class AttachmentService {
  readonly #accessScopes: AttachmentAccessScopeResolver;
  readonly #attachments: AttachmentRepository;
  readonly #audit: AuditWriter;
  readonly #categories: AttachmentCategoryRegistry;
  readonly #contentScanner: AttachmentContentScanner;
  readonly #idempotency: IdempotencyAdapter;
  readonly #links: AttachmentLinkRepository;
  readonly #objects: AttachmentObjectRegistry;
  readonly #receiptReader: AttachmentUploadReceiptReader;
  readonly #storage: ObjectStorageAdapter;
  readonly #transaction: AttachmentTransactionRunner;
  readonly #uploadPolicy: UploadPolicy;
  readonly #validator: AttachmentValidator;

  constructor(dependencies: AttachmentServiceDependencies) {
    this.#accessScopes = dependencies.accessScopes;
    this.#attachments = dependencies.attachments;
    this.#audit = dependencies.audit;
    this.#categories = dependencies.categories ?? new AttachmentCategoryRegistry();
    this.#contentScanner = dependencies.contentScanner;
    this.#idempotency = dependencies.idempotency;
    this.#links = dependencies.links;
    this.#objects = dependencies.objects;
    this.#receiptReader = dependencies.receiptReader;
    this.#storage = dependencies.storage;
    this.#transaction = dependencies.transaction;
    this.#uploadPolicy = dependencies.uploadPolicy;
    this.#validator = new AttachmentValidator(this.#objects, this.#categories);
  }

  async upload(
    input: AttachmentUploadDto,
    idempotencyKey: string,
    authentication: AuthenticationContext,
    context: RequestContext,
  ): Promise<IdempotencySafeResponse> {
    const authorization = await this.#authorizeUpload(input, authentication);
    const validated = await validateUpload(input.file, this.#uploadPolicy);
    await this.#contentScanner.scan(validated);

    const authorize = async () => {
      await this.#authorizeUpload(input, authentication);
    };
    const reconciliation: IdempotencyReconciliationStrategy = {
      reconcileExpiredProcessing: async (record) => {
        const attachmentId = await this.#receiptReader.findAttachmentIdByRequestId(
          record.requestTraceId,
        );
        if (!attachmentId) return { outcome: "unresolved" };
        const response = await this.detail(attachmentId, authentication, context);
        return {
          outcome: "completed",
          response: {
            body: successEnvelope(response, context),
            httpStatus: 201,
            requestTraceId: context.requestId,
            resourceId: attachmentId,
            resourceType: "attachment",
          },
        };
      },
    };

    return this.#idempotency.execute({
      authorize,
      operation: async () =>
        this.#executeUpload(input, validated, authorization.isSensitive, authentication, context),
      rawKey: idempotencyKey,
      reconciliation,
      request: {
        action: "ATT-001",
        authenticationScope: {
          dataScopes: [...authentication.user.dataScopes].sort(),
          permissionCodes: [...authentication.user.permissionCodes].sort(),
          storeIds: [...(authorization.access.storeIds ?? [])].sort(),
          userId: authentication.user.userId,
          warehouseIds: [...(authorization.access.warehouseIds ?? [])].sort(),
        },
        body: {
          attachmentCategory: input.attachmentCategory,
          isSensitive: authorization.isSensitive,
          objectItemId: input.objectItemId,
          sortOrder: input.sortOrder,
        },
        fileChecksum: validated.checksum,
        method: "POST",
        path: { objectId: input.objectId, objectType: input.objectType },
        query: {},
      },
      requestTraceId: context.requestId,
      scope: { apiId: "ATT-001", userId: authentication.user.userId },
    });
  }

  async list(
    query: AttachmentListQueryDto,
    authentication: AuthenticationContext,
    context: RequestContext,
  ): Promise<AttachmentListResult> {
    const access = await accessContext(authentication, this.#accessScopes);
    const object = await this.#objects.load(query.objectType, query.objectId, query.objectItemId);
    if (!object) throw mapAttachmentError(new AttachmentNotFoundError());
    this.#objects.checkObjectState(object, "read");
    this.#objects.checkReadPermission(query.objectType, access);
    this.#objects.checkDataScope(object, access);
    requirePermission(authentication, "attachment.file.read");

    const objectLinks = (
      await this.#links.listByObject(query.objectType, query.objectId, query.objectItemId)
    ).filter(
      (link) =>
        query.attachmentCategory === undefined ||
        link.attachmentCategory === query.attachmentCategory,
    );
    let sensitiveFilteredCount = 0;
    const entries = (
      await Promise.all(
        objectLinks.map(async (link) => {
          const attachment = await this.#attachments.findById(link.attachmentId);
          if (!attachment || attachment.status !== "active") return null;
          if (attachment.isSensitive && !hasSensitivePermission(authentication)) {
            sensitiveFilteredCount += 1;
            return null;
          }
          return { attachment, link };
        }),
      )
    ).filter(
      (entry): entry is Readonly<{ attachment: AttachmentRecord; link: AttachmentLinkRecord }> =>
        entry !== null,
    );
    const sorted = sortLinks(entries, query);
    const total = sorted.length;
    const pageEntries = sorted.slice(
      (query.page - 1) * query.pageSize,
      query.page * query.pageSize,
    );
    const items = await Promise.all(
      pageEntries.map(({ attachment }) => this.#response(attachment, authentication)),
    );
    await recordAuditEvent(
      this.#audit,
      auditEvent("attachment.metadata.read", authentication, context, query.objectId, "success", {
        attachmentCategory: query.attachmentCategory ?? null,
        objectType: query.objectType,
        page: query.page,
        pageSize: query.pageSize,
        resultCount: items.length,
        sensitiveFilteredCount,
      }),
    );
    return Object.freeze({
      items,
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    });
  }

  async detail(
    attachmentId: string,
    authentication: AuthenticationContext,
    context: RequestContext,
  ): Promise<AttachmentResponseDto> {
    try {
      const attachment = await this.#requireAttachment(attachmentId);
      if (attachment.isSensitive && !hasSensitivePermission(authentication)) {
        throw new AttachmentNotFoundError();
      }
      const visibleLinks = await this.#visibleLinks(attachment, authentication, "read");
      if (visibleLinks.length === 0) {
        throw new AttachmentNotFoundError();
      }
      if (attachment.status !== "physically_deleted") {
        compareMetadata(attachment, await this.#storage.metadata(attachment.storageReference));
      }
      const response = await this.#response(attachment, authentication, visibleLinks);
      await recordAuditEvent(
        this.#audit,
        auditEvent("attachment.metadata.read", authentication, context, attachment.id, "success", {
          sensitive: attachment.isSensitive,
          status: attachment.status,
          visibleLinkCount: visibleLinks.length,
        }),
      );
      return response;
    } catch (error) {
      const mapped = mapAttachmentError(error);
      await recordAuditEvent(
        this.#audit,
        auditEvent(
          "attachment.metadata.read",
          authentication,
          context,
          attachmentId,
          "failure",
          undefined,
          mapped.message,
        ),
      );
      throw mapped;
    }
  }

  async download(
    attachmentId: string,
    authentication: AuthenticationContext,
    context: RequestContext,
  ): Promise<AttachmentDownload> {
    try {
      const attachment = await this.#requireAttachment(attachmentId);
      if (attachment.status !== "active") {
        throw new AttachmentStateConflictError();
      }
      if (attachment.isSensitive && !hasSensitivePermission(authentication)) {
        throw new AttachmentPermissionDeniedError();
      }
      const visibleLinks = await this.#visibleLinks(attachment, authentication, "download");
      if (visibleLinks.length === 0) {
        throw new AttachmentNotFoundError();
      }
      compareMetadata(attachment, await this.#storage.metadata(attachment.storageReference));
      await recordAuditEvent(
        this.#audit,
        auditEvent(
          "attachment.download.allowed",
          authentication,
          context,
          attachment.id,
          "success",
          {
            sensitive: attachment.isSensitive,
          },
        ),
      );
      return Object.freeze({
        attachment,
        stream: await this.#storage.stream(attachment.storageReference),
      });
    } catch (error) {
      const mapped = mapAttachmentError(error);
      await recordAuditEvent(
        this.#audit,
        auditEvent(
          "attachment.download.denied",
          authentication,
          context,
          attachmentId,
          "failure",
          undefined,
          mapped.message,
        ),
      );
      throw mapped;
    }
  }

  async #authorizeUpload(
    input: AttachmentUploadDto,
    authentication: AuthenticationContext,
  ): Promise<UploadAuthorization> {
    requirePermission(authentication, "attachment.file.upload");
    const access = await accessContext(authentication, this.#accessScopes);
    const target = await this.#validator.validate({
      access,
      attachmentCategory: input.attachmentCategory,
      objectId: input.objectId,
      ...(input.objectItemId ? { objectItemId: input.objectItemId } : {}),
      objectType: input.objectType,
      operation: "link",
    });
    if (target.protected && !allowsProtectedAppend(input.attachmentCategory)) {
      throw new AttachmentObjectStateError();
    }
    const defaultSensitive = this.#categories.defaultSensitive(input.attachmentCategory);
    if (defaultSensitive && input.isSensitive === false) {
      throw new ValidationError("默认敏感附件不得降级", [
        { field: "isSensitive", message: "默认敏感附件不得降级" },
      ]);
    }
    return Object.freeze({
      access,
      isSensitive: defaultSensitive || input.isSensitive === true,
    });
  }

  async #executeUpload(
    input: AttachmentUploadDto,
    validated: ValidatedUpload,
    isSensitive: boolean,
    authentication: AuthenticationContext,
    context: RequestContext,
  ) {
    let stored: ObjectStorageMetadata | null = null;
    try {
      stored = await this.#storage.store(validated);
      const result = await this.#transaction.run(async ({ attachments, audit, links }) => {
        const now = new Date(context.timestamp);
        const attachment = await attachments.create({
          checksum: stored!.checksum,
          createdBy: authentication.user.userId,
          fileExtension: stored!.extension,
          fileSize: BigInt(stored!.fileSize),
          isSensitive,
          mimeType: stored!.mimeType,
          originalFileName: stored!.originalFilename,
          storageReference: stored!.storageKey,
          storedFileName: stored!.storageKey,
          uploadedAt: now,
          uploadedBy: authentication.user.userId,
        });
        await links.create({
          attachmentCategory: input.attachmentCategory,
          attachmentId: attachment.id,
          createdBy: authentication.user.userId,
          linkedAt: now,
          linkedBy: authentication.user.userId,
          objectId: input.objectId,
          ...(input.objectItemId ? { objectItemId: input.objectItemId } : {}),
          objectType: input.objectType,
          sortOrder: input.sortOrder,
        });
        await recordAuditEvent(
          audit,
          auditEvent(
            "attachment.upload.succeeded",
            authentication,
            context,
            attachment.id,
            "success",
            {
              attachmentCategory: input.attachmentCategory,
              checksum: stored!.checksum,
              fileSize: stored!.fileSize,
              mimeType: stored!.mimeType,
              objectId: input.objectId,
              objectItemId: input.objectItemId ?? null,
              objectType: input.objectType,
              sensitive: isSensitive,
            },
          ),
        );
        return attachment;
      });
      const response = await this.#response(result, authentication);
      return {
        outcome: "completed" as const,
        response: {
          body: successEnvelope(response, context),
          httpStatus: 201,
          requestTraceId: context.requestId,
          resourceId: result.id,
          resourceType: "attachment",
        },
      };
    } catch (error) {
      let mapped = mapAttachmentError(error);
      if (stored) {
        try {
          await this.#storage.softDelete(stored.storageKey);
          await this.#storage.delete(stored.storageKey);
        } catch {
          mapped = attachmentStorageDeleteFailedError();
          await recordAuditEvent(
            this.#audit,
            auditEvent(
              "attachment.storage.compensation_failed",
              authentication,
              context,
              input.objectId,
              "failure",
              { objectType: input.objectType },
              mapped.message,
            ),
            { failureMode: "best-effort" },
          );
        }
      }
      await recordAuditEvent(
        this.#audit,
        auditEvent(
          "attachment.upload.failed",
          authentication,
          context,
          input.objectId,
          "failure",
          { objectType: input.objectType },
          mapped.message,
        ),
        { failureMode: "best-effort" },
      );
      return {
        outcome: "failed" as const,
        response: {
          body: errorEnvelope(mapped, context),
          httpStatus: mapped.httpStatus,
          requestTraceId: context.requestId,
        },
      };
    }
  }

  async #requireAttachment(id: string): Promise<AttachmentRecord> {
    const attachment = await this.#attachments.findById(id);
    if (!attachment) {
      throw new AttachmentNotFoundError();
    }
    return attachment;
  }

  async #visibleLinks(
    attachment: AttachmentRecord,
    authentication: AuthenticationContext,
    operation: Extract<AttachmentValidationOperation, "download" | "read">,
  ): Promise<readonly AttachmentLinkRecord[]> {
    const access = await accessContext(authentication, this.#accessScopes);
    const links = await this.#links.listByAttachment(attachment.id);
    const visible: AttachmentLinkRecord[] = [];
    for (const link of links) {
      try {
        await this.#validator.validate({
          access,
          attachmentCategory: link.attachmentCategory,
          objectId: link.objectId,
          ...(link.objectItemId ? { objectItemId: link.objectItemId } : {}),
          objectType: link.objectType,
          operation,
        });
        visible.push(link);
      } catch (error) {
        if (error instanceof AttachmentDomainError) {
          // Hidden links are deliberately indistinguishable from absent links.
          continue;
        }
        throw error;
      }
    }
    return Object.freeze(visible);
  }

  async #response(
    attachment: AttachmentRecord,
    authentication: AuthenticationContext,
    knownVisibleLinks?: readonly AttachmentLinkRecord[],
  ): Promise<AttachmentResponseDto> {
    const visibleLinks =
      knownVisibleLinks ?? (await this.#visibleLinks(attachment, authentication, "read"));
    const allLinks = await this.#links.listByAttachment(attachment.id);
    const linkCapabilities = await Promise.all(
      visibleLinks.map(async (link) => ({
        canLink: await this.#canOperateLink(link, authentication, "link"),
        canUnlink: await this.#canOperateLink(link, authentication, "unlink"),
      })),
    );
    const permission: AttachmentPermissionDto = Object.freeze({
      canDelete:
        attachment.status === "active" &&
        allLinks.length === 0 &&
        authentication.user.permissionCodes.includes("attachment.file.delete"),
      canDownload:
        attachment.status === "active" &&
        visibleLinks.length > 0 &&
        authentication.user.permissionCodes.includes("attachment.file.download") &&
        (!attachment.isSensitive || hasSensitivePermission(authentication)),
      canLink: attachment.status === "active" && linkCapabilities.some(({ canLink }) => canLink),
      canRead: visibleLinks.length > 0,
      canUnlink:
        attachment.status === "active" && linkCapabilities.some(({ canUnlink }) => canUnlink),
    });
    return Object.freeze({
      ...(authentication.user.permissionCodes.includes("attachment.file.read")
        ? { checksum: attachment.checksum }
        : {}),
      fileExtension: attachment.fileExtension,
      fileSize: attachment.fileSize.toString(),
      id: attachment.id,
      isSensitive: attachment.isSensitive,
      links: Object.freeze(visibleLinks.map(linkDto)),
      mimeType: attachment.mimeType,
      originalFilename: attachment.originalFileName,
      permission,
      status: attachment.status,
      storageStrategy: "stream",
      uploadedAt: attachment.uploadedAt.toISOString(),
      uploadedBy: userSummary(attachment.uploadedBy),
      version: attachment.updatedAt.toISOString(),
    });
  }

  async #canOperateLink(
    link: AttachmentLinkRecord,
    authentication: AuthenticationContext,
    operation: Extract<AttachmentValidationOperation, "link" | "unlink">,
  ): Promise<boolean> {
    try {
      const validated = await this.#validator.validate({
        access: await accessContext(authentication, this.#accessScopes),
        attachmentCategory: link.attachmentCategory,
        objectId: link.objectId,
        ...(link.objectItemId ? { objectItemId: link.objectItemId } : {}),
        objectType: link.objectType,
        operation,
      });
      return (
        operation === "unlink" ||
        !validated.protected ||
        allowsProtectedAppend(link.attachmentCategory)
      );
    } catch (error) {
      if (error instanceof AttachmentDomainError) return false;
      throw error;
    }
  }
}
