import {
  ObjectStorageAccessError,
  ObjectStorageIntegrityError,
  ObjectStorageNotFoundError,
} from "../storage/object-storage.js";
import { AppError } from "../errors/app-error.js";
import {
  AttachmentAlreadyLinkedError,
  AttachmentCategoryMismatchError,
  AttachmentCategoryUnsupportedError,
  AttachmentDataScopeDeniedError,
  AttachmentNotFoundError,
  AttachmentObjectStateError,
  AttachmentObjectUnsupportedError,
  AttachmentPermissionDeniedError,
  AttachmentProtectedError,
  AttachmentStateConflictError,
} from "./errors.js";

export function mapAttachmentError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof AttachmentObjectUnsupportedError) {
    return new AppError(
      "VALIDATION_ATTACHMENT_OBJECT_TYPE_UNSUPPORTED",
      422,
      "不支持的附件对象类型",
    );
  }
  if (error instanceof AttachmentCategoryUnsupportedError) {
    return new AppError("VALIDATION_ATTACHMENT_CATEGORY_UNSUPPORTED", 422, "不支持的附件类别");
  }
  if (error instanceof AttachmentCategoryMismatchError) {
    return new AppError(
      "VALIDATION_ATTACHMENT_CATEGORY_OBJECT_MISMATCH",
      422,
      "附件类别与目标对象不匹配",
    );
  }
  if (error instanceof AttachmentAlreadyLinkedError) {
    return new AppError("CONFLICT_ATTACHMENT_LINK_DUPLICATE", 409, "附件已存在相同业务关联");
  }
  if (error instanceof AttachmentProtectedError) {
    return new AppError("STATE_ATTACHMENT_HISTORY_PROTECTED", 409, "附件受正式历史保护");
  }
  if (
    error instanceof AttachmentStateConflictError ||
    error instanceof AttachmentObjectStateError ||
    error instanceof ObjectStorageAccessError
  ) {
    return new AppError("STATE_ATTACHMENT_ACTION_NOT_ALLOWED", 409, "当前状态不允许附件操作");
  }
  if (
    error instanceof AttachmentPermissionDeniedError ||
    error instanceof AttachmentDataScopeDeniedError
  ) {
    return new AppError("PERMISSION_ATTACHMENT_DENIED", 403, "无权访问目标附件");
  }
  if (error instanceof AttachmentNotFoundError) {
    return new AppError("RESOURCE_ATTACHMENT_NOT_FOUND", 404, "附件或目标对象不存在");
  }
  if (error instanceof ObjectStorageNotFoundError) {
    return new AppError("SYSTEM_ATTACHMENT_STORAGE_OBJECT_NOT_FOUND", 503, "附件存储对象暂不可用");
  }
  if (error instanceof ObjectStorageIntegrityError) {
    return new AppError("SYSTEM_ATTACHMENT_STORAGE_INTEGRITY_ERROR", 500, "附件存储完整性校验失败");
  }
  return new AppError("SYSTEM_SERVICE_UNAVAILABLE", 503, "附件服务暂不可用");
}

export function attachmentStorageDeleteFailedError(): AppError {
  return new AppError("SYSTEM_ATTACHMENT_STORAGE_DELETE_FAILED", 503, "附件存储补偿失败");
}
