import type { AuthenticationContext, AuthenticatedUser } from "../auth/authentication.js";
import { requireAllPermissions } from "../authorization/authorization.js";
import type { PermissionCode } from "../authorization/permissions.js";
import { AppError, NotFoundError, ValidationError } from "../errors/app-error.js";
import type {
  InventoryAccessScope,
  InventorySkuSnapshot,
  InventoryWarehouseSnapshot,
} from "../inventory-query/inventory-query.js";
import type { RequestContext } from "../request-context/request-context.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type InventoryTransactionListQuery = Readonly<{
  dateFrom?: Date;
  dateTo?: Date;
  direction?: string;
  page: number;
  pageSize: number;
  skuId?: string;
  sourceDocumentId?: string;
  sourceDocumentType?: string;
  transactionType?: string;
  warehouseId?: string;
}>;

export type InventoryTransactionSource = Readonly<{
  sourceDocumentId: string;
  sourceDocumentItemId: string;
  sourceDocumentPath?: string;
  sourceDocumentType: string;
}>;

export type InventoryTransactionOperator = Readonly<{
  displayName?: string | null;
  id: string;
  username?: string;
}>;

export type InventoryTransactionRecord = Readonly<{
  amount?: string | null;
  batchNo?: string | null;
  createdAt: string;
  direction: string;
  id: string;
  operator: InventoryTransactionOperator;
  quantity: string;
  quantityAfter: string;
  quantityBefore: string;
  relatedTransactionId?: string | null;
  remark?: string | null;
  requestTraceId: string;
  sku: InventorySkuSnapshot;
  source: InventoryTransactionSource;
  transactionAt: string;
  transactionNo: string;
  transactionType: string;
  unitCost?: string | null;
  warehouse: InventoryWarehouseSnapshot;
}>;

export type InventoryTransactionListResult = Readonly<{
  items: readonly InventoryTransactionRecord[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}>;

export type InventoryTransactionRepository = Readonly<{
  detail: (id: string, access: InventoryAccessScope) => Promise<InventoryTransactionRecord | null>;
  list: (
    query: InventoryTransactionListQuery,
    access: InventoryAccessScope,
  ) => Promise<InventoryTransactionListResult>;
}>;

function validationIssue(field: string, message: string): ValidationError {
  return new ValidationError("请求数据校验失败", [{ field, message }]);
}

function optionalUuid(searchParams: URLSearchParams, field: string): string | undefined {
  const value = searchParams.get(field)?.trim();
  if (!value) return undefined;
  if (!UUID_PATTERN.test(value)) throw validationIssue(field, `${field} 必须是 UUID`);
  return value;
}

function optionalText(
  searchParams: URLSearchParams,
  field: string,
  maxLength: number,
): string | undefined {
  const value = searchParams.get(field)?.trim();
  if (!value) return undefined;
  if (value.length > maxLength) throw validationIssue(field, `${field} 长度不得超过 ${maxLength}`);
  return value;
}

function parsePage(
  searchParams: URLSearchParams,
): Pick<InventoryTransactionListQuery, "page" | "pageSize"> {
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "20");
  if (!Number.isSafeInteger(page) || page < 1) throw validationIssue("page", "page 必须大于 0");
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw validationIssue("pageSize", "pageSize 必须在 1 至 100 之间");
  }
  return { page, pageSize };
}

function parseDateBoundary(
  searchParams: URLSearchParams,
  field: "dateFrom" | "dateTo",
): Date | undefined {
  const value = searchParams.get(field)?.trim();
  if (!value) return undefined;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}${field === "dateFrom" ? "T00:00:00.000Z" : "T23:59:59.999Z"}`
    : value;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.valueOf())) throw validationIssue(field, `${field} 必须是有效日期`);
  return parsed;
}

export function parseInventoryTransactionListQuery(
  searchParams: URLSearchParams,
): InventoryTransactionListQuery {
  const skuId = optionalUuid(searchParams, "skuId");
  const warehouseId = optionalUuid(searchParams, "warehouseId");
  const sourceDocumentId = optionalUuid(searchParams, "sourceDocumentId");
  const transactionType = optionalText(searchParams, "transactionType", 50);
  const direction = optionalText(searchParams, "direction", 50);
  const sourceDocumentType =
    optionalText(searchParams, "sourceDocumentType", 50) ??
    optionalText(searchParams, "sourceType", 50);
  const dateFrom = parseDateBoundary(searchParams, "dateFrom");
  const dateTo = parseDateBoundary(searchParams, "dateTo");
  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw validationIssue("dateTo", "dateTo 必须大于或等于 dateFrom");
  }
  return {
    ...parsePage(searchParams),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
    ...(direction ? { direction } : {}),
    ...(skuId ? { skuId } : {}),
    ...(sourceDocumentId ? { sourceDocumentId } : {}),
    ...(sourceDocumentType ? { sourceDocumentType } : {}),
    ...(transactionType ? { transactionType } : {}),
    ...(warehouseId ? { warehouseId } : {}),
  };
}

function accessScope(user: AuthenticatedUser, context: RequestContext): InventoryAccessScope {
  return {
    actorUserId: user.userId,
    requestTraceId: context.requestTraceId,
    ...(user.dataScopes.includes("all")
      ? {}
      : { allowedWarehouseIds: (user.warehouseScopes ?? []).map((scope) => scope.targetId) }),
  };
}

function sourceDocumentPath(source: InventoryTransactionSource): string | undefined {
  if (source.sourceDocumentType === "inbound" || source.sourceDocumentType === "inbound_order") {
    return `/api/v1/inbound-orders/${source.sourceDocumentId}`;
  }
  if (source.sourceDocumentType === "outbound" || source.sourceDocumentType === "outbound_order") {
    return `/api/v1/outbound-orders/${source.sourceDocumentId}`;
  }
  if (
    source.sourceDocumentType === "adjustment" ||
    source.sourceDocumentType === "inventory_adjustment"
  ) {
    return `/api/v1/inventory-adjustments/${source.sourceDocumentId}`;
  }
  return undefined;
}

function hasPermission(authentication: AuthenticationContext, permission: PermissionCode): boolean {
  return authentication.user.permissionCodes.includes(permission);
}

function normalizeRecord(
  record: InventoryTransactionRecord,
  authentication: AuthenticationContext,
  context: RequestContext,
): InventoryTransactionRecord {
  const { amount, unitCost, ...publicRecord } = record;
  const path = sourceDocumentPath(record.source);
  return Object.freeze({
    ...publicRecord,
    ...(hasPermission(authentication, "field.amount.read") && amount !== undefined
      ? { amount }
      : {}),
    requestTraceId: context.requestTraceId,
    source: {
      ...record.source,
      ...(path ? { sourceDocumentPath: path } : {}),
    },
    ...(hasPermission(authentication, "field.cost.read") && unitCost !== undefined
      ? { unitCost }
      : {}),
  });
}

function normalizeList(
  result: InventoryTransactionListResult,
  authentication: AuthenticationContext,
  context: RequestContext,
): InventoryTransactionListResult {
  return Object.freeze({
    ...result,
    items: result.items.map((item) => normalizeRecord(item, authentication, context)),
  });
}

export class InventoryTransactionService {
  readonly #repository: InventoryTransactionRepository;

  constructor(repository: InventoryTransactionRepository) {
    this.#repository = repository;
  }

  async list(
    query: InventoryTransactionListQuery,
    authentication: AuthenticationContext,
    context: RequestContext,
  ): Promise<InventoryTransactionListResult> {
    const { user } = requireAllPermissions(authentication, [
      "inventory.transaction.read",
      "inventory.stock.read",
      "master.sku.read",
      "master.warehouse.read",
    ]);
    return normalizeList(
      await this.#repository.list(query, accessScope(user, context)),
      authentication,
      context,
    );
  }

  async detail(
    id: string,
    authentication: AuthenticationContext,
    context: RequestContext,
  ): Promise<InventoryTransactionRecord> {
    if (!UUID_PATTERN.test(id)) {
      throw new AppError("VALIDATION_INVALID_PATH", 422, "路径参数必须是 UUID");
    }
    const { user } = requireAllPermissions(authentication, [
      "inventory.transaction.read",
      "inventory.stock.read",
      "master.sku.read",
      "master.warehouse.read",
    ]);
    const record = await this.#repository.detail(id, accessScope(user, context));
    if (!record) throw new NotFoundError("库存流水不存在或不可访问");
    return normalizeRecord(record, authentication, context);
  }
}
