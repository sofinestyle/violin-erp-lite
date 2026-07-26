import type { AuthenticatedUser, AuthenticationContext } from "../auth/authentication.js";
import { requireAllPermissions, requirePermission } from "../authorization/authorization.js";
import { AppError, ConflictError, NotFoundError, ValidationError } from "../errors/app-error.js";
import type { RequestContext } from "../request-context/request-context.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const INVENTORY_STATUSES = ["available", "unavailable", "zero", "pending"] as const;

export type InventoryDerivedStatus = (typeof INVENTORY_STATUSES)[number];

export type InventoryListQuery = Readonly<{
  page: number;
  pageSize: number;
  skuId?: string;
  status?: InventoryDerivedStatus;
  warehouseId?: string;
  warehouseType?: string;
}>;

export type InventoryAccessScope = Readonly<{
  allowedWarehouseIds?: readonly string[];
  actorUserId: string;
  requestTraceId: string;
}>;

export type InventoryQuantitySnapshot = Readonly<{
  availableQuantity: string;
  onHandQuantity: string;
  pendingQuantity: string;
  reservedQuantity: string;
}>;

export type InventorySkuSnapshot = Readonly<{
  id: string;
  productId?: string;
  skuCode: string;
  skuName: string;
  specification?: string | null;
  unit?: string;
}>;

export type InventoryWarehouseSnapshot = Readonly<{
  id: string;
  warehouseCode: string;
  warehouseName: string;
  warehouseType: string;
}>;

export type InventoryBalanceRecord = InventoryQuantitySnapshot &
  Readonly<{
    id: string;
    inventoryStatus: InventoryDerivedStatus;
    lastCountedAt?: string | null;
    lastTransactionAt?: string | null;
    recentTransactionsPath: string;
    sku: InventorySkuSnapshot;
    warehouse: InventoryWarehouseSnapshot;
  }>;

export type InventoryListResult = Readonly<{
  items: readonly InventoryBalanceRecord[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}>;

export type InventorySummary = InventoryQuantitySnapshot &
  Readonly<{
    inventoryCount: number;
    inventoryAmount?: string;
    statusCounts: InventoryStatusCounts;
    skuCount: number;
    warehouseCount: number;
  }>;

export type InventoryStatusCounts = Readonly<{
  normalStockCount: number;
  pendingStockCount: number;
  unavailableStockCount: number;
  zeroStockCount: number;
}>;

export type SkuInventorySummary = InventorySummary &
  Readonly<{
    sku: InventorySkuSnapshot;
    warehouses: readonly InventoryBalanceRecord[];
  }>;

export type WarehouseInventorySummary = InventorySummary &
  Readonly<{
    skuCount: number;
    warehouse: InventoryWarehouseSnapshot;
  }>;

export type InventoryQueryRepository = Readonly<{
  byWarehouse: (
    warehouseId: string,
    query: InventoryListQuery,
    access: InventoryAccessScope,
  ) => Promise<WarehouseInventorySummary | null>;
  detail: (id: string, access: InventoryAccessScope) => Promise<InventoryBalanceRecord | null>;
  list: (query: InventoryListQuery, access: InventoryAccessScope) => Promise<InventoryListResult>;
  summary: (query: InventoryListQuery, access: InventoryAccessScope) => Promise<InventorySummary>;
  summaryBySku: (
    skuId: string,
    query: InventoryListQuery,
    access: InventoryAccessScope,
  ) => Promise<SkuInventorySummary | null>;
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

function parsePage(searchParams: URLSearchParams): Pick<InventoryListQuery, "page" | "pageSize"> {
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "20");
  if (!Number.isSafeInteger(page) || page < 1) throw validationIssue("page", "page 必须大于 0");
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw validationIssue("pageSize", "pageSize 必须在 1 至 100 之间");
  }
  return { page, pageSize };
}

export function parseInventoryListQuery(searchParams: URLSearchParams): InventoryListQuery {
  const status = optionalText(searchParams, "status", 50);
  if (status && !INVENTORY_STATUSES.includes(status as InventoryDerivedStatus)) {
    throw validationIssue("status", "库存状态不属于正式派生状态集合");
  }
  const skuId = optionalUuid(searchParams, "skuId");
  const warehouseId = optionalUuid(searchParams, "warehouseId");
  const warehouseType = optionalText(searchParams, "warehouseType", 50);
  return {
    ...parsePage(searchParams),
    ...(skuId ? { skuId } : {}),
    ...(status ? { status: status as InventoryDerivedStatus } : {}),
    ...(warehouseId ? { warehouseId } : {}),
    ...(warehouseType ? { warehouseType } : {}),
  };
}

function decimal(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new ConflictError("库存数量格式无效");
  return parsed;
}

export function deriveInventoryStatus(
  quantities: InventoryQuantitySnapshot,
): InventoryDerivedStatus {
  if (decimal(quantities.pendingQuantity) > 0) return "pending";
  if (decimal(quantities.onHandQuantity) === 0) return "zero";
  if (decimal(quantities.availableQuantity) > 0) return "available";
  return "unavailable";
}

export function assertAvailableQuantityBalance(record: InventoryQuantitySnapshot): void {
  const expected =
    decimal(record.onHandQuantity) -
    decimal(record.reservedQuantity) -
    decimal(record.pendingQuantity);
  const actual = decimal(record.availableQuantity);
  if (Math.abs(expected - actual) > 0.0001) {
    throw new ConflictError("库存可用数量与正式公式不一致");
  }
}

function normalizeRecord(record: InventoryBalanceRecord): InventoryBalanceRecord {
  assertAvailableQuantityBalance(record);
  return Object.freeze({
    ...record,
    inventoryStatus: deriveInventoryStatus(record),
    recentTransactionsPath: `/api/v1/inventory-transactions?skuId=${record.sku.id}&warehouseId=${record.warehouse.id}`,
  });
}

function normalizeList(result: InventoryListResult): InventoryListResult {
  return Object.freeze({
    ...result,
    items: result.items.map(normalizeRecord),
  });
}

function addQuantities(
  current: InventoryQuantitySnapshot,
  next: InventoryQuantitySnapshot,
): InventoryQuantitySnapshot {
  return {
    availableQuantity: (
      decimal(current.availableQuantity) + decimal(next.availableQuantity)
    ).toFixed(4),
    onHandQuantity: (decimal(current.onHandQuantity) + decimal(next.onHandQuantity)).toFixed(4),
    pendingQuantity: (decimal(current.pendingQuantity) + decimal(next.pendingQuantity)).toFixed(4),
    reservedQuantity: (decimal(current.reservedQuantity) + decimal(next.reservedQuantity)).toFixed(
      4,
    ),
  };
}

const zeroQuantities: InventoryQuantitySnapshot = Object.freeze({
  availableQuantity: "0.0000",
  onHandQuantity: "0.0000",
  pendingQuantity: "0.0000",
  reservedQuantity: "0.0000",
});

function summarize(records: readonly InventoryBalanceRecord[]): InventorySummary {
  const quantities = records.reduce<InventoryQuantitySnapshot>(addQuantities, zeroQuantities);
  return Object.freeze({
    ...quantities,
    inventoryCount: records.length,
    statusCounts: statusCounts(records),
    skuCount: new Set(records.map((item) => item.sku.id)).size,
    warehouseCount: new Set(records.map((item) => item.warehouse.id)).size,
  });
}

function statusCounts(records: readonly InventoryBalanceRecord[]): InventoryStatusCounts {
  return records.reduce<InventoryStatusCounts>(
    (counts, record) => {
      const status = deriveInventoryStatus(record);
      if (status === "available") {
        return { ...counts, normalStockCount: counts.normalStockCount + 1 };
      }
      if (status === "pending") {
        return { ...counts, pendingStockCount: counts.pendingStockCount + 1 };
      }
      if (status === "zero") {
        return { ...counts, zeroStockCount: counts.zeroStockCount + 1 };
      }
      return { ...counts, unavailableStockCount: counts.unavailableStockCount + 1 };
    },
    {
      normalStockCount: 0,
      pendingStockCount: 0,
      unavailableStockCount: 0,
      zeroStockCount: 0,
    },
  );
}

function scopedAccess(user: AuthenticatedUser, context: RequestContext): InventoryAccessScope {
  return {
    actorUserId: user.userId,
    requestTraceId: context.requestTraceId,
    ...(user.dataScopes.includes("all")
      ? {}
      : { allowedWarehouseIds: (user.warehouseScopes ?? []).map((scope) => scope.targetId) }),
  };
}

function canReadInventoryAmount(user: AuthenticatedUser): boolean {
  return (
    user.permissionCodes.includes("field.amount.read") &&
    user.permissionCodes.includes("field.cost.read")
  );
}

function redactInventoryAmount<T extends InventorySummary>(
  summary: T,
  user: AuthenticatedUser,
): T | Omit<T, "inventoryAmount"> {
  if (canReadInventoryAmount(user)) return summary;
  return Object.fromEntries(
    Object.entries(summary).filter(([key]) => key !== "inventoryAmount"),
  ) as Omit<T, "inventoryAmount">;
}

export class InventoryQueryService {
  readonly #repository: InventoryQueryRepository;

  constructor(repository: InventoryQueryRepository) {
    this.#repository = repository;
  }

  async list(
    query: InventoryListQuery,
    authentication: AuthenticationContext,
    context: RequestContext,
  ): Promise<InventoryListResult> {
    const { user } = requireAllPermissions(authentication, [
      "inventory.stock.read",
      "master.sku.read",
      "master.warehouse.read",
    ]);
    return normalizeList(await this.#repository.list(query, scopedAccess(user, context)));
  }

  async summary(
    query: InventoryListQuery,
    authentication: AuthenticationContext,
    context: RequestContext,
  ): Promise<InventorySummary | Omit<InventorySummary, "inventoryAmount">> {
    const { user } = requireAllPermissions(authentication, [
      "inventory.stock.read",
      "master.sku.read",
      "master.warehouse.read",
    ]);
    return redactInventoryAmount(
      await this.#repository.summary(query, scopedAccess(user, context)),
      user,
    );
  }

  async detail(
    id: string,
    authentication: AuthenticationContext,
    context: RequestContext,
  ): Promise<InventoryBalanceRecord> {
    if (!UUID_PATTERN.test(id))
      throw new AppError("VALIDATION_INVALID_PATH", 422, "路径参数必须是 UUID");
    const { user } = requireAllPermissions(authentication, [
      "inventory.stock.read",
      "master.sku.read",
      "master.warehouse.read",
    ]);
    const record = await this.#repository.detail(id, scopedAccess(user, context));
    if (!record) throw new NotFoundError("库存不存在或不可访问");
    return normalizeRecord(record);
  }

  async summaryBySku(
    skuId: string,
    query: InventoryListQuery,
    authentication: AuthenticationContext,
    context: RequestContext,
  ): Promise<SkuInventorySummary | Omit<SkuInventorySummary, "inventoryAmount">> {
    if (!UUID_PATTERN.test(skuId)) throw validationIssue("skuId", "skuId 必须是 UUID");
    const { user } = requireAllPermissions(authentication, [
      "inventory.stock.read",
      "master.sku.read",
      "master.warehouse.read",
    ]);
    const result = await this.#repository.summaryBySku(skuId, query, scopedAccess(user, context));
    if (!result) throw new NotFoundError("SKU 库存不存在或不可访问");
    const warehouses = result.warehouses.map(normalizeRecord);
    return redactInventoryAmount(
      Object.freeze({ ...result, ...summarize(warehouses), warehouses, sku: result.sku }),
      user,
    );
  }

  async byWarehouse(
    warehouseId: string,
    query: InventoryListQuery,
    authentication: AuthenticationContext,
    context: RequestContext,
  ): Promise<WarehouseInventorySummary | Omit<WarehouseInventorySummary, "inventoryAmount">> {
    if (!UUID_PATTERN.test(warehouseId))
      throw validationIssue("warehouseId", "warehouseId 必须是 UUID");
    const { user } = requireAllPermissions(authentication, [
      "inventory.stock.read",
      "master.sku.read",
      "master.warehouse.read",
    ]);
    const result = await this.#repository.byWarehouse(
      warehouseId,
      query,
      scopedAccess(user, context),
    );
    if (!result) throw new NotFoundError("仓库库存不存在或不可访问");
    assertAvailableQuantityBalance(result);
    return redactInventoryAmount(Object.freeze(result), user);
  }

  async manufacturerWarehouses(
    query: InventoryListQuery,
    authentication: AuthenticationContext,
    context: RequestContext,
  ): Promise<InventoryListResult> {
    return this.list({ ...query, warehouseType: "manufacturer" }, authentication, context);
  }

  async transactionEntry(
    id: string,
    authentication: AuthenticationContext,
  ): Promise<Readonly<{ inventoryId: string; transactionsPath: string }>> {
    requirePermission(authentication, "inventory.transaction.read");
    if (!UUID_PATTERN.test(id))
      throw new AppError("VALIDATION_INVALID_PATH", 422, "路径参数必须是 UUID");
    return {
      inventoryId: id,
      transactionsPath: `/api/v1/inventory-transactions?inventoryId=${id}`,
    };
  }
}
