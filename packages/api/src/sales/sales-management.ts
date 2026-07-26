import type { AuthenticationContext, AuthenticatedUser } from "../auth/authentication.js";
import { requireAllPermissions } from "../authorization/authorization.js";
import type { PermissionCode } from "../authorization/permissions.js";
import { ValidationError } from "../errors/app-error.js";
import type { RequestContext } from "../request-context/request-context.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type SalesListQuery = Readonly<{
  dateFrom?: Date;
  dateTo?: Date;
  page: number;
  pageSize: number;
  platformId?: string;
  skuId?: string;
  storeId?: string;
  warehouseId?: string;
}>;

export type SalesAccessScope = Readonly<{
  actorUserId: string;
  allowedStoreIds?: readonly string[];
  allowedWarehouseIds?: readonly string[];
  canViewAmount: boolean;
  canViewCost: boolean;
  canViewPersonalData: boolean;
  requestTraceId: string;
}>;

export type SalesDimension = Readonly<{
  id: string;
  name: string;
}>;

export type SalesSkuSnapshot = Readonly<{
  id: string;
  skuCode: string;
  skuName: string;
  specification?: string | null;
}>;

export type SalesOutboundRecord = Readonly<{
  customerName?: string | null;
  documentDate: string;
  documentNo: string;
  externalOrderNo?: string | null;
  id: string;
  platform?: SalesDimension | null;
  sku: SalesSkuSnapshot;
  soldQuantity: string;
  store?: SalesDimension | null;
  warehouseId: string;
}>;

export type SalesViewResult = Readonly<{
  items: readonly SalesOutboundRecord[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}>;

export type SalesAggregateRecord = Readonly<{
  amount?: string;
  cost?: string;
  platform?: SalesDimension | null;
  returnQuantity: string;
  sku?: SalesSkuSnapshot;
  soldQuantity: string;
  store?: SalesDimension | null;
  transactionQuantity: string;
}>;

export type SalesStatistics = Readonly<{
  netQuantity: string;
  platformSales: readonly SalesAggregateRecord[];
  skuRanking: readonly SalesAggregateRecord[];
  storeSales: readonly SalesAggregateRecord[];
  totalReturnQuantity: string;
  totalSoldQuantity: string;
}>;

export type SalesManagementRepository = Readonly<{
  platformView: (query: SalesListQuery, access: SalesAccessScope) => Promise<SalesViewResult>;
  statistics: (query: SalesListQuery, access: SalesAccessScope) => Promise<SalesStatistics>;
  storeView: (query: SalesListQuery, access: SalesAccessScope) => Promise<SalesViewResult>;
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

function parsePage(searchParams: URLSearchParams): Pick<SalesListQuery, "page" | "pageSize"> {
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

export function parseSalesListQuery(searchParams: URLSearchParams): SalesListQuery {
  const dateFrom = parseDateBoundary(searchParams, "dateFrom");
  const dateTo = parseDateBoundary(searchParams, "dateTo");
  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw validationIssue("dateTo", "dateTo 必须大于或等于 dateFrom");
  }
  const platformId = optionalUuid(searchParams, "platformId");
  const skuId = optionalUuid(searchParams, "skuId");
  const storeId = optionalUuid(searchParams, "storeId");
  const warehouseId = optionalUuid(searchParams, "warehouseId");
  return {
    ...parsePage(searchParams),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
    ...(platformId ? { platformId } : {}),
    ...(skuId ? { skuId } : {}),
    ...(storeId ? { storeId } : {}),
    ...(warehouseId ? { warehouseId } : {}),
  };
}

function hasPermission(user: AuthenticatedUser, permission: PermissionCode): boolean {
  return user.permissionCodes.includes(permission);
}

function accessScope(user: AuthenticatedUser, context: RequestContext): SalesAccessScope {
  return {
    actorUserId: user.userId,
    ...(user.dataScopes.includes("all")
      ? {}
      : {
          allowedStoreIds: (user.storeScopes ?? []).map((scope) => scope.targetId),
          allowedWarehouseIds: (user.warehouseScopes ?? []).map((scope) => scope.targetId),
        }),
    canViewAmount: hasPermission(user, "field.amount.read"),
    canViewCost: hasPermission(user, "field.cost.read"),
    canViewPersonalData: hasPermission(user, "field.personal-data.read"),
    requestTraceId: context.requestTraceId,
  };
}

function normalizeOutboundRecord(
  record: SalesOutboundRecord,
  access: SalesAccessScope,
): SalesOutboundRecord {
  const { customerName, ...publicRecord } = record;
  return Object.freeze({
    ...publicRecord,
    ...(access.canViewPersonalData && customerName !== undefined ? { customerName } : {}),
  });
}

function normalizeAggregate(
  record: SalesAggregateRecord,
  access: SalesAccessScope,
): SalesAggregateRecord {
  const { amount, cost, ...publicRecord } = record;
  return Object.freeze({
    ...publicRecord,
    ...(access.canViewAmount && amount !== undefined ? { amount } : {}),
    ...(access.canViewCost && cost !== undefined ? { cost } : {}),
  });
}

function normalizeView(result: SalesViewResult, access: SalesAccessScope): SalesViewResult {
  return Object.freeze({
    ...result,
    items: result.items.map((item) => normalizeOutboundRecord(item, access)),
  });
}

function normalizeStatistics(result: SalesStatistics, access: SalesAccessScope): SalesStatistics {
  return Object.freeze({
    ...result,
    platformSales: result.platformSales.map((item) => normalizeAggregate(item, access)),
    skuRanking: result.skuRanking.map((item) => normalizeAggregate(item, access)),
    storeSales: result.storeSales.map((item) => normalizeAggregate(item, access)),
  });
}

export class SalesManagementService {
  readonly #repository: SalesManagementRepository;

  constructor(repository: SalesManagementRepository) {
    this.#repository = repository;
  }

  async platformView(
    query: SalesListQuery,
    authentication: AuthenticationContext,
    context: RequestContext,
  ): Promise<SalesViewResult> {
    const { user } = requireAllPermissions(authentication, [
      "outbound.order.read",
      "inventory.transaction.read",
      "master.platform.read",
      "master.store.read",
    ]);
    const access = accessScope(user, context);
    return normalizeView(await this.#repository.platformView(query, access), access);
  }

  async storeView(
    query: SalesListQuery,
    authentication: AuthenticationContext,
    context: RequestContext,
  ): Promise<SalesViewResult> {
    const { user } = requireAllPermissions(authentication, [
      "outbound.order.read",
      "inventory.transaction.read",
      "master.store.read",
    ]);
    const access = accessScope(user, context);
    return normalizeView(await this.#repository.storeView(query, access), access);
  }

  async statistics(
    query: SalesListQuery,
    authentication: AuthenticationContext,
    context: RequestContext,
  ): Promise<SalesStatistics> {
    const { user } = requireAllPermissions(authentication, [
      "outbound.order.read",
      "outbound.sales-return.read",
      "inventory.transaction.read",
      "master.platform.read",
      "master.store.read",
    ]);
    const access = accessScope(user, context);
    return normalizeStatistics(await this.#repository.statistics(query, access), access);
  }
}
