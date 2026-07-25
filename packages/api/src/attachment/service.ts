import type { Readable } from "node:stream";
import type { AuthenticationContext } from "../auth/authentication.js";
import { requirePermission } from "../authorization/authorization.js";
import { recordAuditEvent, type AuditEvent, type AuditWriter } from "../audit/audit.js";
import { AppError, ValidationError } from "../errors/app-error.js";
import type { IdempotencyAdapter } from "../idempotency/idempotency.js";
import type {
  IdempotencyJson,
  IdempotencyReconciliationStrategy,
  IdempotencySafeResponse,
} from "../idempotency/types.js";
import type { RequestContext } from "../request-context/request-context.js";
import {
  ObjectStorageIntegrityError,
  ObjectStorageNotFoundError,
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
  AttachmentStillReferencedError,
} from "./errors.js";
import { AttachmentLifecycle } from "./lifecycle.js";
import { AttachmentObjectRegistry } from "./object-registry.js";
import type {
  AttachmentAccessContext,
  AttachmentAccessScopeResolver,
  AttachmentAuditReader,
  AttachmentAuditRecord,
  AttachmentContentScanner,
  AttachmentLinkDto,
  AttachmentLinkRecord,
  AttachmentLinkRepository,
  AttachmentListQueryDto,
  AttachmentListResult,
  AttachmentLifecycleEventDto,
  AttachmentLifecycleResponseDto,
  AttachmentPermissionDto,
  AttachmentRecord,
  AttachmentRepository,
  AttachmentResponseDto,
  AttachmentTransactionRunner,
  AttachmentUploadDto,
  AttachmentUploadReceiptReader,
  AttachmentValidationOperation,
  CreateAttachmentLinkDto,
  DeleteAttachmentDto,
  DeleteAttachmentResponseDto,
  UnlinkAttachmentDto,
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
  auditReader: AttachmentAuditReader;
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

type MutationAuthorization = Readonly<{
  access: AttachmentAccessContext;
  attachment: AttachmentRecord;
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

function successEnvelope(data: unknown, context: RequestContext): IdempotencyJson {
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

type AttachmentTargetReference = Readonly<{
  attachmentCategory: string;
  attachmentLinkId?: string;
  objectId: string;
  objectItemId?: string;
  objectType: string;
}>;

function auditTarget(record: AttachmentAuditRecord): AttachmentTargetReference | null {
  const { metadata } = record;
  if (
    typeof metadata.attachmentCategory !== "string" ||
    typeof metadata.objectId !== "string" ||
    typeof metadata.objectType !== "string"
  ) {
    return null;
  }
  return Object.freeze({
    attachmentCategory: metadata.attachmentCategory,
    ...(typeof metadata.attachmentLinkId === "string"
      ? { attachmentLinkId: metadata.attachmentLinkId }
      : {}),
    objectId: metadata.objectId,
    ...(typeof metadata.objectItemId === "string" ? { objectItemId: metadata.objectItemId } : {}),
    objectType: metadata.objectType,
  });
}

function targetFromLink(link: AttachmentLinkRecord): AttachmentTargetReference {
  return Object.freeze({
    attachmentCategory: link.attachmentCategory,
    attachmentLinkId: link.id,
    objectId: link.objectId,
    ...(link.objectItemId ? { objectItemId: link.objectItemId } : {}),
    objectType: link.objectType,
  });
}

function targetKey(target: AttachmentTargetReference): string {
  return JSON.stringify([
    target.attachmentCategory,
    target.objectType,
    target.objectId,
    target.objectItemId ?? null,
  ]);
}

function uniqueTargets(
  targets: readonly AttachmentTargetReference[],
): readonly AttachmentTargetReference[] {
  const seen = new Set<string>();
  return Object.freeze(
    targets.filter((target) => {
      const key = targetKey(target);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  );
}

export class AttachmentService {
  readonly #accessScopes: AttachmentAccessScopeResolver;
  readonly #attachments: AttachmentRepository;
  readonly #audit: AuditWriter;
  readonly #auditReader: AttachmentAuditReader;
  readonly #categories: AttachmentCategoryRegistry;
  readonly #contentScanner: AttachmentContentScanner;
  readonly #idempotency: IdempotencyAdapter;
  readonly #links: AttachmentLinkRepository;
  readonly #lifecycle: AttachmentLifecycle;
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
    this.#auditReader = dependencies.auditReader;
    this.#categories = dependencies.categories ?? new AttachmentCategoryRegistry();
    this.#contentScanner = dependencies.contentScanner;
    this.#idempotency = dependencies.idempotency;
    this.#links = dependencies.links;
    this.#lifecycle = new AttachmentLifecycle();
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

  async createLink(
    attachmentId: string,
    input: CreateAttachmentLinkDto,
    idempotencyKey: string,
    authentication: AuthenticationContext,
    context: RequestContext,
  ): Promise<IdempotencySafeResponse> {
    let authorization: MutationAuthorization;
    try {
      authorization = await this.#authorizeCreateLink(attachmentId, input, authentication);
    } catch (error) {
      const mapped = mapAttachmentError(error);
      await recordAuditEvent(
        this.#audit,
        auditEvent(
          "attachment.link.rejected",
          authentication,
          context,
          attachmentId,
          "failure",
          {
            attachmentCategory: input.attachmentCategory,
            objectId: input.objectId,
            objectItemId: input.objectItemId ?? null,
            objectType: input.objectType,
          },
          mapped.message,
        ),
        { failureMode: "best-effort" },
      );
      throw mapped;
    }
    const authorize = async () => {
      await this.#authorizeCreateLink(attachmentId, input, authentication);
    };
    const reconciliation: IdempotencyReconciliationStrategy = {
      reconcileExpiredProcessing: async (record) => {
        const receipt = await this.#auditReader.findByRequestId(record.requestTraceId, [
          "attachment.link.created",
          "attachment.link.rejected",
        ]);
        if (!receipt) return { outcome: "unresolved" };
        if (receipt.event === "attachment.link.rejected") {
          const error = this.#errorFromReceipt(receipt);
          return {
            outcome: "failed",
            response: {
              body: errorEnvelope(error, context),
              httpStatus: error.httpStatus,
              requestTraceId: context.requestId,
            },
          };
        }
        return {
          outcome: "completed",
          response: {
            body: successEnvelope(
              await this.#response(await this.#requireAttachment(attachmentId), authentication),
              context,
            ),
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
      operation: () => this.#executeCreateLink(attachmentId, input, authentication, context),
      rawKey: idempotencyKey,
      reconciliation,
      request: {
        action: "ATT-005",
        authenticationScope: this.#authenticationScope(authentication, authorization.access),
        body: input,
        method: "POST",
        path: { attachmentId, suffix: "links" },
        query: {},
      },
      requestTraceId: context.requestId,
      scope: { apiId: "ATT-005", userId: authentication.user.userId },
    });
  }

  async unlink(
    attachmentId: string,
    input: UnlinkAttachmentDto,
    idempotencyKey: string,
    authentication: AuthenticationContext,
    context: RequestContext,
  ): Promise<IdempotencySafeResponse> {
    let authorization: MutationAuthorization;
    try {
      authorization = await this.#authorizeUnlink(attachmentId, input, authentication);
    } catch (error) {
      const mapped = mapAttachmentError(error);
      await recordAuditEvent(
        this.#audit,
        auditEvent(
          "attachment.link.unlink_denied",
          authentication,
          context,
          attachmentId,
          "failure",
          { attachmentLinkId: input.attachmentLinkId, reason: input.reason },
          mapped.message,
        ),
        { failureMode: "best-effort" },
      );
      throw mapped;
    }
    const authorize = async () => {
      await this.#authorizeUnlink(attachmentId, input, authentication);
    };
    const reconciliation: IdempotencyReconciliationStrategy = {
      reconcileExpiredProcessing: async (record) => {
        const receipt = await this.#auditReader.findByRequestId(record.requestTraceId, [
          "attachment.link.unlinked",
          "attachment.link.unlink_denied",
        ]);
        if (!receipt) return { outcome: "unresolved" };
        if (receipt.event === "attachment.link.unlink_denied") {
          const error = this.#errorFromReceipt(receipt);
          return {
            outcome: "failed",
            response: {
              body: errorEnvelope(error, context),
              httpStatus: error.httpStatus,
              requestTraceId: context.requestId,
            },
          };
        }
        return {
          outcome: "completed",
          response: {
            body: successEnvelope(
              await this.#response(await this.#requireAttachment(attachmentId), authentication),
              context,
            ),
            httpStatus: 200,
            requestTraceId: context.requestId,
            resourceId: attachmentId,
            resourceType: "attachment",
          },
        };
      },
    };
    return this.#idempotency.execute({
      authorize,
      operation: () => this.#executeUnlink(attachmentId, input, authentication, context),
      rawKey: idempotencyKey,
      reconciliation,
      request: {
        action: "ATT-006",
        authenticationScope: this.#authenticationScope(authentication, authorization.access),
        body: input,
        method: "POST",
        path: { attachmentId, suffix: "links/unlink" },
        query: {},
      },
      requestTraceId: context.requestId,
      scope: { apiId: "ATT-006", userId: authentication.user.userId },
    });
  }

  async deleteAttachment(
    attachmentId: string,
    input: DeleteAttachmentDto,
    idempotencyKey: string,
    authentication: AuthenticationContext,
    context: RequestContext,
  ): Promise<IdempotencySafeResponse> {
    let authorization: MutationAuthorization;
    try {
      authorization = await this.#authorizeDelete(attachmentId, authentication);
    } catch (error) {
      const mapped = mapAttachmentError(error);
      await recordAuditEvent(
        this.#audit,
        auditEvent(
          "attachment.delete.denied",
          authentication,
          context,
          attachmentId,
          "failure",
          { reason: input.reason },
          mapped.message,
        ),
        { failureMode: "best-effort" },
      );
      throw mapped;
    }
    const authorize = async () => {
      await this.#authorizeDelete(attachmentId, authentication);
    };
    const reconciliation: IdempotencyReconciliationStrategy = {
      reconcileExpiredProcessing: async (record) => {
        const receipt = await this.#auditReader.findByRequestId(record.requestTraceId, [
          "attachment.physical_delete.succeeded",
          "attachment.physical_delete.failed",
          "attachment.delete.denied",
        ]);
        if (!receipt) {
          const current = await this.#requireAttachment(attachmentId);
          if (
            current.status === "pending_physical_delete" &&
            !(await this.#storage.exists(current.storageReference))
          ) {
            await this.#finishPhysicalDelete(
              current,
              "physically_deleted",
              authentication,
              context,
              input.reason,
            );
            return {
              outcome: "completed",
              response: this.#deleteSuccessResponse(attachmentId, context),
            };
          }
          return { outcome: "unresolved" };
        }
        if (receipt.event === "attachment.physical_delete.succeeded") {
          return {
            outcome: "completed",
            response: this.#deleteSuccessResponse(attachmentId, context),
          };
        }
        const error = this.#errorFromReceipt(receipt);
        return {
          outcome: "failed",
          response: {
            body: errorEnvelope(error, context),
            httpStatus: error.httpStatus,
            requestTraceId: context.requestId,
          },
        };
      },
    };
    return this.#idempotency.execute({
      authorize,
      operation: () => this.#executeDelete(attachmentId, input, authentication, context),
      rawKey: idempotencyKey,
      reconciliation,
      request: {
        action: "ATT-007",
        authenticationScope: this.#authenticationScope(authentication, authorization.access),
        body: input,
        method: "POST",
        path: { attachmentId, suffix: "delete" },
        query: {},
      },
      requestTraceId: context.requestId,
      scope: { apiId: "ATT-007", userId: authentication.user.userId },
    });
  }

  async lifecycle(
    attachmentId: string,
    authentication: AuthenticationContext,
    context: RequestContext,
  ): Promise<AttachmentLifecycleResponseDto> {
    const attachment = await this.#requireAttachment(attachmentId);
    requirePermission(authentication, "attachment.file.read");
    requirePermission(authentication, "audit.log.read");
    if (attachment.isSensitive && !hasSensitivePermission(authentication)) {
      throw mapAttachmentError(new AttachmentPermissionDeniedError());
    }
    const records = await this.#auditReader.listByAttachment(attachment.id);
    const currentLinks = await this.#links.listByAttachment(attachment.id);
    const targets = uniqueTargets([
      ...currentLinks.map(targetFromLink),
      ...records.flatMap((record) => {
        const target = auditTarget(record);
        return target ? [target] : [];
      }),
    ]);
    const visibility = await this.#targetVisibility(targets, authentication);
    if (![...visibility.values()].some(Boolean)) {
      throw mapAttachmentError(new AttachmentNotFoundError());
    }

    const storageExists = await this.#storage.exists(attachment.storageReference);
    let storageAvailability: "available" | "unavailable" = "unavailable";
    if (storageExists) {
      const metadata = await this.#storage.metadata(attachment.storageReference);
      compareMetadata(attachment, metadata);
      if (attachment.status === "physically_deleted") {
        throw mapAttachmentError(new ObjectStorageIntegrityError());
      }
      storageAvailability =
        attachment.status === "active" && metadata.lifecycleState === "active"
          ? "available"
          : "unavailable";
    } else if (attachment.status !== "physically_deleted") {
      throw mapAttachmentError(new ObjectStorageNotFoundError());
    }

    const events = records.map((record) => this.#lifecycleEvent(record, visibility));
    const protectedAttachment = await this.#targetsProtected(targets, authentication);
    await recordAuditEvent(
      this.#audit,
      auditEvent("attachment.lifecycle.read", authentication, context, attachment.id, "success", {
        activeLinkCount: currentLinks.length,
        status: attachment.status,
        storageAvailability,
      }),
    );
    return Object.freeze({
      activeLinkCount: currentLinks.length,
      attachmentId: attachment.id,
      events: Object.freeze(events),
      protected: protectedAttachment,
      status: attachment.status,
      storageAvailability,
      version: attachment.updatedAt.toISOString(),
    });
  }

  async #authorizeCreateLink(
    attachmentId: string,
    input: CreateAttachmentLinkDto,
    authentication: AuthenticationContext,
  ): Promise<MutationAuthorization> {
    requirePermission(authentication, "attachment.file.link");
    const attachment = await this.#requireAttachment(attachmentId);
    if (!this.#lifecycle.canLink(attachment.status)) throw new AttachmentStateConflictError();
    if (attachment.isSensitive && !hasSensitivePermission(authentication)) {
      throw new AttachmentPermissionDeniedError();
    }
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
    if (!(await this.#storage.exists(attachment.storageReference))) {
      throw new ObjectStorageNotFoundError();
    }
    compareMetadata(attachment, await this.#storage.metadata(attachment.storageReference));
    return Object.freeze({ access, attachment });
  }

  async #authorizeUnlink(
    attachmentId: string,
    input: UnlinkAttachmentDto,
    authentication: AuthenticationContext,
  ): Promise<MutationAuthorization> {
    requirePermission(authentication, "attachment.file.unlink");
    const attachment = await this.#requireAttachment(attachmentId);
    if (attachment.status !== "active") throw new AttachmentStateConflictError();
    if (attachment.isSensitive && !hasSensitivePermission(authentication)) {
      throw new AttachmentPermissionDeniedError();
    }
    const target = await this.#unlinkTarget(attachmentId, input.attachmentLinkId);
    if (!target) throw new AttachmentNotFoundError();
    const access = await accessContext(authentication, this.#accessScopes);
    await this.#validator.validate({
      access,
      attachmentCategory: target.attachmentCategory,
      objectId: target.objectId,
      ...(target.objectItemId ? { objectItemId: target.objectItemId } : {}),
      objectType: target.objectType,
      operation: "unlink",
    });
    return Object.freeze({ access, attachment });
  }

  async #authorizeDelete(
    attachmentId: string,
    authentication: AuthenticationContext,
  ): Promise<MutationAuthorization> {
    requirePermission(authentication, "attachment.file.delete");
    const attachment = await this.#requireAttachment(attachmentId);
    if (attachment.isSensitive && !hasSensitivePermission(authentication)) {
      throw new AttachmentPermissionDeniedError();
    }
    const links = await this.#links.listByAttachment(attachment.id);
    if (links.length > 0) throw new AttachmentStillReferencedError();
    const targets = await this.#historicalTargets(attachment.id);
    if (targets.length === 0) throw new AttachmentNotFoundError();
    const access = await accessContext(authentication, this.#accessScopes);
    for (const target of targets) {
      await this.#validator.validate({
        access,
        attachmentCategory: target.attachmentCategory,
        objectId: target.objectId,
        ...(target.objectItemId ? { objectItemId: target.objectItemId } : {}),
        objectType: target.objectType,
        operation: "delete",
      });
    }
    return Object.freeze({ access, attachment });
  }

  async #executeCreateLink(
    attachmentId: string,
    input: CreateAttachmentLinkDto,
    authentication: AuthenticationContext,
    context: RequestContext,
  ) {
    try {
      const attachment = await this.#transaction.run(
        async ({ attachments, audit, links, lockAttachment }) => {
          await lockAttachment(attachmentId);
          const current = await attachments.findById(attachmentId);
          if (!current) throw new AttachmentNotFoundError();
          if (current.status !== "active") throw new AttachmentStateConflictError();
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
          const now = new Date(context.timestamp);
          const link = await links.create({
            attachmentCategory: input.attachmentCategory,
            attachmentId,
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
              "attachment.link.created",
              authentication,
              context,
              attachmentId,
              "success",
              {
                attachmentCategory: input.attachmentCategory,
                attachmentLinkId: link.id,
                objectId: input.objectId,
                objectItemId: input.objectItemId ?? null,
                objectType: input.objectType,
                sortOrder: input.sortOrder,
              },
            ),
          );
          return current;
        },
      );
      return {
        outcome: "completed" as const,
        response: {
          body: successEnvelope(await this.#response(attachment, authentication), context),
          httpStatus: 201,
          requestTraceId: context.requestId,
          resourceId: attachmentId,
          resourceType: "attachment",
        },
      };
    } catch (error) {
      const mapped = mapAttachmentError(error);
      await recordAuditEvent(
        this.#audit,
        auditEvent(
          "attachment.link.rejected",
          authentication,
          context,
          attachmentId,
          "failure",
          {
            attachmentCategory: input.attachmentCategory,
            errorCode: mapped.code,
            httpStatus: mapped.httpStatus,
            objectId: input.objectId,
            objectItemId: input.objectItemId ?? null,
            objectType: input.objectType,
          },
          mapped.message,
        ),
        { failureMode: "best-effort" },
      );
      return this.#failedExecution(mapped, context);
    }
  }

  async #executeUnlink(
    attachmentId: string,
    input: UnlinkAttachmentDto,
    authentication: AuthenticationContext,
    context: RequestContext,
  ) {
    try {
      const attachment = await this.#transaction.run(
        async ({ attachments, audit, links, lockAttachment, lockAttachmentLink }) => {
          await lockAttachment(attachmentId);
          await lockAttachmentLink(attachmentId, input.attachmentLinkId);
          const current = await attachments.findById(attachmentId);
          if (!current) throw new AttachmentNotFoundError();
          if (current.status !== "active") throw new AttachmentStateConflictError();
          const link = await links.findById(input.attachmentLinkId);
          if (!link || link.attachmentId !== attachmentId) throw new AttachmentNotFoundError();
          const access = await accessContext(authentication, this.#accessScopes);
          await this.#validator.validate({
            access,
            attachmentCategory: link.attachmentCategory,
            objectId: link.objectId,
            ...(link.objectItemId ? { objectItemId: link.objectItemId } : {}),
            objectType: link.objectType,
            operation: "unlink",
          });
          if (!(await links.delete(link.id))) throw new AttachmentStateConflictError();
          await recordAuditEvent(
            audit,
            auditEvent(
              "attachment.link.unlinked",
              authentication,
              context,
              attachmentId,
              "success",
              {
                attachmentCategory: link.attachmentCategory,
                attachmentLinkId: link.id,
                objectId: link.objectId,
                objectItemId: link.objectItemId,
                objectType: link.objectType,
                reason: input.reason,
              },
            ),
          );
          return current;
        },
      );
      return {
        outcome: "completed" as const,
        response: {
          body: successEnvelope(await this.#response(attachment, authentication), context),
          httpStatus: 200,
          requestTraceId: context.requestId,
          resourceId: attachmentId,
          resourceType: "attachment",
        },
      };
    } catch (error) {
      const mapped = mapAttachmentError(error);
      await recordAuditEvent(
        this.#audit,
        auditEvent(
          "attachment.link.unlink_denied",
          authentication,
          context,
          attachmentId,
          "failure",
          {
            attachmentLinkId: input.attachmentLinkId,
            errorCode: mapped.code,
            httpStatus: mapped.httpStatus,
            reason: input.reason,
          },
          mapped.message,
        ),
        { failureMode: "best-effort" },
      );
      return this.#failedExecution(mapped, context);
    }
  }

  async #executeDelete(
    attachmentId: string,
    input: DeleteAttachmentDto,
    authentication: AuthenticationContext,
    context: RequestContext,
  ) {
    try {
      let current = await this.#requireAttachment(attachmentId);
      if (current.status === "active") {
        current = await this.#beginSoftDelete(current, input, authentication, context);
        try {
          const metadata = await this.#storage.softDelete(current.storageReference);
          compareMetadata(current, metadata);
        } catch {
          await this.#rollbackSoftDelete(current, authentication, context);
          throw attachmentStorageDeleteFailedError();
        }
      } else if (
        current.status !== "physical_delete_failed" &&
        current.status !== "pending_physical_delete"
      ) {
        throw new AttachmentStateConflictError();
      } else if (current.updatedAt.toISOString() !== input.version) {
        throw new AttachmentStateConflictError();
      }

      const pending =
        current.status === "pending_physical_delete"
          ? current
          : await this.#beginPhysicalDelete(current, authentication);
      const exists = await this.#storage.exists(pending.storageReference);
      if (exists) {
        const metadata = await this.#storage.metadata(pending.storageReference);
        compareMetadata(pending, metadata);
        if (metadata.lifecycleState !== "soft_deleted") throw new ObjectStorageIntegrityError();
        try {
          await this.#storage.delete(pending.storageReference);
        } catch {
          await this.#finishPhysicalDelete(
            pending,
            "physical_delete_failed",
            authentication,
            context,
            input.reason,
          );
          throw attachmentStorageDeleteFailedError();
        }
      } else if (current.status !== "physical_delete_failed") {
        await this.#finishPhysicalDelete(
          pending,
          "physical_delete_failed",
          authentication,
          context,
          input.reason,
        );
        throw new ObjectStorageNotFoundError();
      }

      await this.#finishPhysicalDelete(
        pending,
        "physically_deleted",
        authentication,
        context,
        input.reason,
      );
      return {
        outcome: "completed" as const,
        response: this.#deleteSuccessResponse(attachmentId, context),
      };
    } catch (error) {
      const mapped = mapAttachmentError(error);
      await recordAuditEvent(
        this.#audit,
        auditEvent(
          "attachment.delete.denied",
          authentication,
          context,
          attachmentId,
          "failure",
          {
            errorCode: mapped.code,
            httpStatus: mapped.httpStatus,
            reason: input.reason,
          },
          mapped.message,
        ),
        { failureMode: "best-effort" },
      );
      return this.#failedExecution(mapped, context);
    }
  }

  #authenticationScope(authentication: AuthenticationContext, access: AttachmentAccessContext) {
    return {
      dataScopes: [...authentication.user.dataScopes].sort(),
      manufacturerIds: [...(access.manufacturerIds ?? [])].sort(),
      permissionCodes: [...authentication.user.permissionCodes].sort(),
      storeIds: [...(access.storeIds ?? [])].sort(),
      userId: authentication.user.userId,
      warehouseIds: [...(access.warehouseIds ?? [])].sort(),
    };
  }

  #deleteSuccessResponse(attachmentId: string, context: RequestContext): IdempotencySafeResponse {
    const data: DeleteAttachmentResponseDto = Object.freeze({
      attachmentId,
      deleted: true,
      status: "physically_deleted",
    });
    return Object.freeze({
      body: successEnvelope(data, context),
      httpStatus: 200,
      requestTraceId: context.requestId,
      resourceId: attachmentId,
      resourceType: "attachment",
    });
  }

  #failedExecution(error: AppError, context: RequestContext) {
    return {
      outcome: "failed" as const,
      response: {
        body: errorEnvelope(error, context),
        httpStatus: error.httpStatus,
        requestTraceId: context.requestId,
      },
    };
  }

  #errorFromReceipt(receipt: AttachmentAuditRecord): AppError {
    const code = receipt.metadata.errorCode;
    const httpStatus = receipt.metadata.httpStatus;
    return typeof code === "string" &&
      typeof httpStatus === "number" &&
      Number.isInteger(httpStatus)
      ? new AppError(code, httpStatus, "附件操作未完成")
      : new AppError("SYSTEM_SERVICE_UNAVAILABLE", 503, "附件服务暂不可用");
  }

  async #historicalTargets(attachmentId: string): Promise<readonly AttachmentTargetReference[]> {
    const records = await this.#auditReader.listByAttachment(attachmentId);
    return uniqueTargets(
      records
        .filter((record) =>
          [
            "attachment.link.created",
            "attachment.link.unlinked",
            "attachment.upload.succeeded",
          ].includes(record.event),
        )
        .flatMap((record) => {
          const target = auditTarget(record);
          return target ? [target] : [];
        }),
    );
  }

  #lifecycleEvent(
    record: AttachmentAuditRecord,
    visibility: ReadonlyMap<string, boolean>,
  ): AttachmentLifecycleEventDto {
    const target = auditTarget(record);
    const visible = target ? visibility.get(targetKey(target)) === true : false;
    const reason =
      typeof record.metadata.reason === "string"
        ? "[REDACTED]"
        : (record.reason?.slice(0, 500) ?? null);
    return Object.freeze({
      event: record.event,
      objectId: visible && target ? target.objectId : null,
      objectType: visible && target ? this.#categories.requireObjectType(target.objectType) : null,
      occurredAt: record.occurredAt.toISOString(),
      operator: record.operatorId ? userSummary(record.operatorId) : "system",
      reason,
      requestId: record.requestId,
      result:
        record.event.endsWith(".denied") || record.event.endsWith(".rejected")
          ? "denied"
          : record.result === "success"
            ? "succeeded"
            : "failed",
    });
  }

  #nextMutationTime(previous: Date): Date {
    return new Date(Math.max(Date.now(), previous.getTime() + 1));
  }

  async #targetVisibility(
    targets: readonly AttachmentTargetReference[],
    authentication: AuthenticationContext,
  ): Promise<ReadonlyMap<string, boolean>> {
    const access = await accessContext(authentication, this.#accessScopes);
    const result = new Map<string, boolean>();
    for (const target of targets) {
      try {
        await this.#validator.validate({
          access,
          attachmentCategory: target.attachmentCategory,
          objectId: target.objectId,
          ...(target.objectItemId ? { objectItemId: target.objectItemId } : {}),
          objectType: target.objectType,
          operation: "read",
        });
        result.set(targetKey(target), true);
      } catch (error) {
        if (error instanceof AttachmentDomainError) {
          result.set(targetKey(target), false);
          continue;
        }
        throw error;
      }
    }
    return result;
  }

  async #targetsProtected(
    targets: readonly AttachmentTargetReference[],
    authentication: AuthenticationContext,
  ): Promise<boolean> {
    const access = await accessContext(authentication, this.#accessScopes);
    for (const target of targets) {
      try {
        const validated = await this.#validator.validate({
          access,
          attachmentCategory: target.attachmentCategory,
          objectId: target.objectId,
          ...(target.objectItemId ? { objectItemId: target.objectItemId } : {}),
          objectType: target.objectType,
          operation: "read",
        });
        if (validated.protected) return true;
      } catch (error) {
        if (error instanceof AttachmentDomainError) continue;
        throw error;
      }
    }
    return false;
  }

  async #unlinkTarget(
    attachmentId: string,
    attachmentLinkId: string,
  ): Promise<AttachmentTargetReference | null> {
    const current = await this.#links.findById(attachmentLinkId);
    if (current?.attachmentId === attachmentId) return targetFromLink(current);
    const records = await this.#auditReader.listByAttachment(attachmentId);
    for (const record of [...records].reverse()) {
      const target = auditTarget(record);
      if (target?.attachmentLinkId === attachmentLinkId) return target;
    }
    return null;
  }

  async #beginSoftDelete(
    attachment: AttachmentRecord,
    input: DeleteAttachmentDto,
    authentication: AuthenticationContext,
    context: RequestContext,
  ): Promise<AttachmentRecord> {
    return this.#transaction.run(
      async ({ attachments, audit, links, lockAttachment, lockAttachmentLinks }) => {
        await lockAttachment(attachment.id);
        await lockAttachmentLinks(attachment.id);
        const current = await attachments.findById(attachment.id);
        if (!current) throw new AttachmentNotFoundError();
        if (current.status !== "active" || current.updatedAt.toISOString() !== input.version) {
          throw new AttachmentStateConflictError();
        }
        if ((await links.countByAttachment(current.id)) > 0) {
          throw new AttachmentStillReferencedError();
        }
        await this.#authorizeDelete(current.id, authentication);
        await recordAuditEvent(
          audit,
          auditEvent(
            "attachment.delete.requested",
            authentication,
            context,
            current.id,
            "success",
            {
              reason: input.reason,
              version: input.version,
            },
          ),
        );
        const now = this.#nextMutationTime(current.updatedAt);
        const updated = await attachments.softDelete({
          expectedStatus: current.status,
          expectedUpdatedAt: current.updatedAt,
          id: current.id,
          nextStatus: this.#lifecycle.nextState(current.status, "soft_delete"),
          now,
          updatedBy: authentication.user.userId,
        });
        await recordAuditEvent(
          audit,
          auditEvent("attachment.soft_deleted", authentication, context, current.id, "success", {
            reason: input.reason,
          }),
        );
        return updated;
      },
    );
  }

  async #rollbackSoftDelete(
    attachment: AttachmentRecord,
    authentication: AuthenticationContext,
    context: RequestContext,
  ): Promise<void> {
    try {
      await this.#storage.activate(attachment.storageReference);
      await this.#transaction.run(async ({ attachments, lockAttachment }) => {
        await lockAttachment(attachment.id);
        const current = await attachments.findById(attachment.id);
        if (!current || current.status !== "soft_deleted") return;
        await attachments.updateStatus({
          expectedStatus: "soft_deleted",
          expectedUpdatedAt: current.updatedAt,
          id: current.id,
          nextStatus: "active",
          now: this.#nextMutationTime(current.updatedAt),
          updatedBy: authentication.user.userId,
        });
      });
    } catch {
      await recordAuditEvent(
        this.#audit,
        auditEvent(
          "attachment.storage.compensation_failed",
          authentication,
          context,
          attachment.id,
          "failure",
          undefined,
          "附件存储补偿失败",
        ),
        { failureMode: "best-effort" },
      );
    }
  }

  async #beginPhysicalDelete(
    attachment: AttachmentRecord,
    authentication: AuthenticationContext,
  ): Promise<AttachmentRecord> {
    return this.#transaction.run(async ({ attachments, links, lockAttachment }) => {
      await lockAttachment(attachment.id);
      const current = await attachments.findById(attachment.id);
      if (!current) throw new AttachmentNotFoundError();
      if (current.status !== "soft_deleted" && current.status !== "physical_delete_failed") {
        throw new AttachmentStateConflictError();
      }
      if ((await links.countByAttachment(current.id)) > 0) {
        throw new AttachmentStillReferencedError();
      }
      await this.#authorizeDelete(current.id, authentication);
      const action =
        current.status === "soft_deleted" ? "begin_physical_delete" : "retry_physical_delete";
      return attachments.markPendingPhysicalDelete({
        expectedStatus: current.status,
        expectedUpdatedAt: current.updatedAt,
        id: current.id,
        nextStatus: this.#lifecycle.nextState(current.status, action),
        now: this.#nextMutationTime(current.updatedAt),
        updatedBy: authentication.user.userId,
      });
    });
  }

  async #finishPhysicalDelete(
    attachment: AttachmentRecord,
    status: "physical_delete_failed" | "physically_deleted",
    authentication: AuthenticationContext,
    context: RequestContext,
    reason: string,
  ): Promise<AttachmentRecord> {
    return this.#transaction.run(async ({ attachments, audit, lockAttachment }) => {
      await lockAttachment(attachment.id);
      const current = await attachments.findById(attachment.id);
      if (!current || current.status !== "pending_physical_delete") {
        throw new AttachmentStateConflictError();
      }
      const action =
        status === "physically_deleted" ? "physical_delete_succeeded" : "physical_delete_failed";
      const updated =
        status === "physically_deleted"
          ? await attachments.markPhysicallyDeleted({
              expectedStatus: current.status,
              expectedUpdatedAt: current.updatedAt,
              id: current.id,
              nextStatus: this.#lifecycle.nextState(current.status, action),
              now: this.#nextMutationTime(current.updatedAt),
              updatedBy: authentication.user.userId,
            })
          : await attachments.markPhysicalDeleteFailed({
              expectedStatus: current.status,
              expectedUpdatedAt: current.updatedAt,
              id: current.id,
              nextStatus: this.#lifecycle.nextState(current.status, action),
              now: this.#nextMutationTime(current.updatedAt),
              updatedBy: authentication.user.userId,
            });
      await recordAuditEvent(
        audit,
        auditEvent(
          status === "physically_deleted"
            ? "attachment.physical_delete.succeeded"
            : "attachment.physical_delete.failed",
          authentication,
          context,
          current.id,
          status === "physically_deleted" ? "success" : "failure",
          {
            ...(status === "physical_delete_failed"
              ? {
                  errorCode: "SYSTEM_ATTACHMENT_STORAGE_DELETE_FAILED",
                  httpStatus: 503,
                }
              : {}),
            reason,
          },
          status === "physical_delete_failed" ? "附件存储物理删除失败" : undefined,
        ),
      );
      return updated;
    });
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
