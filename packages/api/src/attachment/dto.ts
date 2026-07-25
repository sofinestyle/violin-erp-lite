import { AppError, ValidationError } from "../errors/app-error.js";
import { AttachmentCategoryRegistry } from "./category-registry.js";
import type {
  AttachmentListQueryDto,
  AttachmentUploadDto,
  CreateAttachmentLinkDto,
  DeleteAttachmentDto,
  UnlinkAttachmentDto,
} from "./types.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UPLOAD_FIELDS = new Set([
  "attachmentCategory",
  "file",
  "isSensitive",
  "objectId",
  "objectItemId",
  "objectType",
  "sortOrder",
]);

function uuid(value: FormDataEntryValue | string | null, field: string): string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new ValidationError(`${field} 必须是 UUID`, [{ field, message: "必须是 UUID" }]);
  }
  return value;
}

function singleText(form: FormData, field: string, required = true): string | undefined {
  const values = form.getAll(field);
  if (values.length > 1 || (required && values.length !== 1)) {
    throw new ValidationError(`${field} 字段数量无效`, [{ field, message: "字段数量无效" }]);
  }
  const value = values[0];
  if (value === undefined && !required) return undefined;
  if (typeof value !== "string" || !value.trim() || value.trim() !== value) {
    throw new ValidationError(`${field} 字段无效`, [{ field, message: "字段无效" }]);
  }
  return value;
}

function positiveInteger(
  value: string | null,
  fallback: number,
  field: string,
  maximum: number,
): number {
  if (value === null) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw new ValidationError(`${field} 字段无效`, [{ field, message: "字段无效" }]);
  }
  return parsed;
}

export async function parseAttachmentUploadRequest(
  request: Request,
  registry: AttachmentCategoryRegistry = new AttachmentCategoryRegistry(),
): Promise<AttachmentUploadDto> {
  const contentType = request.headers.get("Content-Type") ?? "";
  if (!/^multipart\/form-data\s*;/i.test(contentType)) {
    throw new AppError("VALIDATION_INVALID_HEADER", 422, "Content-Type 必须是 multipart/form-data");
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new ValidationError("multipart 请求无效");
  }
  for (const field of form.keys()) {
    if (!UPLOAD_FIELDS.has(field)) {
      throw new ValidationError("multipart 包含未定义字段", [{ field, message: "未定义字段" }]);
    }
  }
  const files = form.getAll("file");
  if (files.length !== 1 || !(files[0] instanceof File)) {
    throw new ValidationError("file 必须且只能包含一个文件", [
      { field: "file", message: "必须且只能包含一个文件" },
    ]);
  }
  const objectTypeValue = singleText(form, "objectType")!;
  const categoryValue = singleText(form, "attachmentCategory")!;
  const objectItemId = singleText(form, "objectItemId", false);
  const sensitive = singleText(form, "isSensitive", false);
  const sortOrderValue = singleText(form, "sortOrder", false);
  if (sensitive !== undefined && sensitive !== "true" && sensitive !== "false") {
    throw new ValidationError("isSensitive 只允许 true 或 false", [
      { field: "isSensitive", message: "只允许 true 或 false" },
    ]);
  }
  const sortOrder = sortOrderValue === undefined ? 0 : Number(sortOrderValue);
  if (!Number.isSafeInteger(sortOrder) || sortOrder < 0) {
    throw new ValidationError("sortOrder 必须是非负整数", [
      { field: "sortOrder", message: "必须是非负整数" },
    ]);
  }
  const file = files[0];
  return Object.freeze({
    attachmentCategory: registry.requireCategory(categoryValue),
    file: {
      content: new Uint8Array(await file.arrayBuffer()),
      declaredMimeType: file.type,
      originalFilename: file.name,
    },
    ...(sensitive === undefined ? {} : { isSensitive: sensitive === "true" }),
    objectId: uuid(singleText(form, "objectId")!, "objectId"),
    ...(objectItemId === undefined ? {} : { objectItemId: uuid(objectItemId, "objectItemId") }),
    objectType: registry.requireObjectType(objectTypeValue),
    sortOrder,
  });
}

export function parseAttachmentListQuery(
  searchParams: URLSearchParams,
  registry: AttachmentCategoryRegistry = new AttachmentCategoryRegistry(),
): AttachmentListQueryDto {
  const allowed = new Set([
    "attachmentCategory",
    "objectId",
    "objectItemId",
    "objectType",
    "page",
    "pageSize",
    "sortBy",
    "sortOrder",
  ]);
  for (const key of searchParams.keys()) {
    if (!allowed.has(key) || searchParams.getAll(key).length !== 1) {
      throw new ValidationError("查询参数无效", [{ field: key, message: "未定义或重复参数" }]);
    }
  }
  const objectType = registry.requireObjectType(searchParams.get("objectType") ?? "");
  const category = searchParams.get("attachmentCategory");
  const objectItemId = searchParams.get("objectItemId");
  const sortBy = searchParams.get("sortBy") ?? "uploadedAt";
  const sortOrder = searchParams.get("sortOrder") ?? "desc";
  if (!["originalFilename", "sortOrder", "uploadedAt"].includes(sortBy)) {
    throw new ValidationError("sortBy 字段无效", [{ field: "sortBy", message: "字段无效" }]);
  }
  if (sortOrder !== "asc" && sortOrder !== "desc") {
    throw new ValidationError("sortOrder 字段无效", [{ field: "sortOrder", message: "字段无效" }]);
  }
  return Object.freeze({
    ...(category === null ? {} : { attachmentCategory: registry.requireCategory(category) }),
    objectId: uuid(searchParams.get("objectId"), "objectId"),
    ...(objectItemId === null ? {} : { objectItemId: uuid(objectItemId, "objectItemId") }),
    objectType,
    page: positiveInteger(searchParams.get("page"), 1, "page", Number.MAX_SAFE_INTEGER),
    pageSize: positiveInteger(searchParams.get("pageSize"), 20, "pageSize", 100),
    sortBy: sortBy as AttachmentListQueryDto["sortBy"],
    sortOrder,
  });
}

export function parseAttachmentId(value: string | undefined): string {
  return uuid(value ?? null, "attachmentId");
}

function jsonObject(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError("请求体必须是对象");
  }
  return value as Record<string, unknown>;
}

function exactFields(
  value: Record<string, unknown>,
  allowed: readonly string[],
  required: readonly string[],
): void {
  const allowedSet = new Set(allowed);
  const unknown = Object.keys(value).find((field) => !allowedSet.has(field));
  if (unknown) {
    throw new ValidationError("请求体包含未定义字段", [{ field: unknown, message: "未定义字段" }]);
  }
  const missing = required.find((field) => !(field in value));
  if (missing) {
    throw new ValidationError("请求体缺少必填字段", [{ field: missing, message: "必填" }]);
  }
}

function jsonString(value: unknown, field: string, maximum?: number): string {
  if (typeof value !== "string" || !value.trim() || value.trim() !== value) {
    throw new ValidationError(`${field} 字段无效`, [{ field, message: "字段无效" }]);
  }
  if (maximum !== undefined && value.length > maximum) {
    throw new ValidationError(`${field} 字段过长`, [{ field, message: `最长 ${maximum} 字符` }]);
  }
  return value;
}

function reason(value: unknown): string {
  if (typeof value !== "string") {
    throw new ValidationError("reason 字段无效", [{ field: "reason", message: "字段无效" }]);
  }
  const normalized = value.trim();
  if (!normalized) {
    throw new ValidationError("reason 字段无效", [{ field: "reason", message: "字段无效" }]);
  }
  if (normalized.length > 500) {
    throw new ValidationError("reason 字段过长", [{ field: "reason", message: "最长 500 字符" }]);
  }
  return normalized;
}

export function parseCreateAttachmentLink(
  value: unknown,
  registry: AttachmentCategoryRegistry = new AttachmentCategoryRegistry(),
): CreateAttachmentLinkDto {
  const input = jsonObject(value);
  exactFields(
    input,
    ["attachmentCategory", "objectId", "objectItemId", "objectType", "sortOrder"],
    ["attachmentCategory", "objectId", "objectType"],
  );
  const sortOrder = input.sortOrder ?? 0;
  if (!Number.isSafeInteger(sortOrder) || Number(sortOrder) < 0) {
    throw new ValidationError("sortOrder 必须是非负整数", [
      { field: "sortOrder", message: "必须是非负整数" },
    ]);
  }
  return Object.freeze({
    attachmentCategory: registry.requireCategory(
      jsonString(input.attachmentCategory, "attachmentCategory"),
    ),
    objectId: uuid(jsonString(input.objectId, "objectId"), "objectId"),
    ...(input.objectItemId === undefined
      ? {}
      : {
          objectItemId: uuid(jsonString(input.objectItemId, "objectItemId"), "objectItemId"),
        }),
    objectType: registry.requireObjectType(jsonString(input.objectType, "objectType")),
    sortOrder: Number(sortOrder),
  });
}

export function parseUnlinkAttachment(value: unknown): UnlinkAttachmentDto {
  const input = jsonObject(value);
  exactFields(input, ["attachmentLinkId", "reason"], ["attachmentLinkId", "reason"]);
  return Object.freeze({
    attachmentLinkId: uuid(
      jsonString(input.attachmentLinkId, "attachmentLinkId"),
      "attachmentLinkId",
    ),
    reason: reason(input.reason),
  });
}

export function parseDeleteAttachment(value: unknown): DeleteAttachmentDto {
  const input = jsonObject(value);
  exactFields(input, ["reason", "version"], ["reason", "version"]);
  const version = jsonString(input.version, "version");
  const parsed = new Date(version);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== version) {
    throw new ValidationError("version 必须是 ISO-8601 时间", [
      { field: "version", message: "必须是 ISO-8601 时间" },
    ]);
  }
  return Object.freeze({
    reason: reason(input.reason),
    version,
  });
}
