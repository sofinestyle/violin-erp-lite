import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  type AuthenticatedUser,
  type InventoryWorkflowCommand,
  type InventoryWorkflowPayload,
  type InventoryWorkflowRepository,
} from "@violin-erp/api";
import { createHash, randomUUID } from "node:crypto";
import { getPrismaClient } from "../client.js";
import type { PrismaClient } from "../generated/prisma/client.js";

type JsonRecord = Record<string, unknown>;
type DynamicDelegate = {
  count(args: JsonRecord): Promise<number>;
  create(args: JsonRecord): Promise<JsonRecord>;
  deleteMany(args: JsonRecord): Promise<unknown>;
  findFirst(args: JsonRecord): Promise<JsonRecord | null>;
  findMany(args: JsonRecord): Promise<JsonRecord[]>;
  update(args: JsonRecord): Promise<JsonRecord>;
  updateMany(args: JsonRecord): Promise<{ count: number }>;
  upsert(args: JsonRecord): Promise<JsonRecord>;
};
type DynamicClient = Record<string, DynamicDelegate> & {
  $transaction<T>(callback: (transaction: DynamicClient) => Promise<T>): Promise<T>;
};

const CAMEL_BOUNDARY = /[A-Z]/g;
const SNAKE_BOUNDARY = /_([a-z])/g;
const toSnake = (value: string) =>
  value.replace(CAMEL_BOUNDARY, (letter) => `_${letter.toLowerCase()}`);
const toCamel = (value: string) =>
  value.replace(SNAKE_BOUNDARY, (_, letter: string) => letter.toUpperCase());

function normalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object" && "toJSON" in value) {
    const method = (value as { toJSON: () => unknown }).toJSON;
    if (typeof method === "function") return method.call(value);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [toCamel(key), normalize(item)]),
    );
  }
  return value;
}

const record = (value: JsonRecord) => normalize(value) as JsonRecord;

function decimal(value: unknown, field: string, allowZero = true): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || (!allowZero && parsed === 0)) {
    throw new ValidationError(`${field} 数值无效`, [{ field, message: "必须是有效非负数" }]);
  }
  return parsed;
}

function stringValue(payload: Readonly<Record<string, unknown>>, key: string, nullable = false) {
  const value = payload[key];
  if (nullable && (value === undefined || value === null || value === "")) return null;
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError(`${key} 不能为空`, [{ field: key, message: "字符串无效" }]);
  }
  return value.trim();
}

function optionalString(payload: Readonly<Record<string, unknown>>, key: string): string | null {
  return stringValue(payload, key, true);
}

function dateValue(payload: Readonly<Record<string, unknown>>, key: string): Date {
  const value = stringValue(payload, key);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf())) throw new ValidationError(`${key} 日期无效`);
  return parsed;
}

function sourceItems(payload: InventoryWorkflowPayload): JsonRecord[] {
  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    throw new ValidationError("明细不能为空");
  }
  return payload.items.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new ValidationError(`第 ${index + 1} 条明细无效`);
    }
    return item as JsonRecord;
  });
}

function documentNo(prefix: string): string {
  return `${prefix}-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID()
    .slice(0, 8)
    .toUpperCase()}`;
}

function sha256Hex(value: unknown): string {
  if (typeof value === "string" && /^[a-f0-9]{64}$/u.test(value)) return value;
  const source =
    typeof value === "string"
      ? value
      : value === undefined || value === null
        ? randomUUID()
        : JSON.stringify(value);
  return createHash("sha256").update(source).digest("hex");
}

function rawRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError("导入行数据无效");
  }
  return value as JsonRecord;
}

function importRows(payload: InventoryWorkflowPayload): JsonRecord[] {
  const rows = Array.isArray(payload.items)
    ? payload.items
    : Array.isArray(payload.rows)
      ? payload.rows
      : [];
  return rows.map(rawRecord);
}

const MODEL: Partial<Record<InventoryWorkflowCommand["resource"], string>> = {
  "cross-border": "cross_border_shipments",
  damage: "damage_reports",
  inventory: "inventories",
  "inventory-adjustment": "inventory_adjustments",
  "inventory-alert": "inventory_alerts",
  "inventory-transaction": "inventory_transactions",
  outbound: "outbound_orders",
  "overseas-import": "import_tasks",
  "overseas-inventory": "inventories",
  "sales-return": "sales_returns",
  "stock-count": "stock_counts",
  transfer: "transfer_orders",
};

const ITEM_RELATION: Partial<Record<InventoryWorkflowCommand["resource"], string>> = {
  "cross-border": "cross_border_shipment_items",
  damage: "damage_report_items",
  "inventory-adjustment": "inventory_adjustment_items",
  outbound: "outbound_order_items",
  "sales-return": "sales_return_items",
  "stock-count": "stock_count_items",
  transfer: "transfer_order_items",
};

const OVERSEAS_OPERATION_FILTERS = [
  "importTaskId",
  "importBatch",
  "platformId",
  "storeId",
] as const;

function page(command: InventoryWorkflowCommand) {
  const page = Number(command.query.get("page") ?? 1);
  const pageSize = Number(command.query.get("pageSize") ?? 20);
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 100
  ) {
    throw new ValidationError("分页参数无效");
  }
  return { page, pageSize };
}

function warehouseScope(
  actor: AuthenticatedUser,
  resource: InventoryWorkflowCommand["resource"] = "inventory",
): JsonRecord {
  if (actor.dataScopes.includes("all")) return {};
  const storeIds = (actor.storeScopes ?? []).map((scope) => scope.targetId);
  if (
    (resource === "outbound" || resource === "sales-return") &&
    actor.dataScopes.includes("store") &&
    storeIds.length > 0
  ) {
    return { stores: { id: { in: storeIds } } };
  }
  const warehouseIds = (actor.warehouseScopes ?? []).map((scope) => scope.targetId);
  if (actor.dataScopes.includes("warehouse") && warehouseIds.length > 0) {
    const scope = { id: { in: warehouseIds } };
    if (resource === "transfer") {
      return {
        warehouses_transfer_orders_source_warehouse_idTowarehouses: scope,
      };
    }
    if (resource === "cross-border") {
      return {
        warehouses_cross_border_shipments_source_warehouse_idTowarehouses: scope,
      };
    }
    return { warehouses: scope };
  }
  if (actor.dataScopes.includes("self_created")) return { created_by: actor.userId };
  return { id: { in: [] } };
}

function ensureWarehouseAccess(actor: AuthenticatedUser, warehouseId: string): void {
  if (actor.dataScopes.includes("all")) return;
  const warehouseIds = (actor.warehouseScopes ?? []).map((scope) => scope.targetId);
  if (actor.dataScopes.includes("warehouse") && warehouseIds.includes(warehouseId)) return;
  throw new ForbiddenError("无权访问该仓库数据");
}

function ensureStoreAccess(actor: AuthenticatedUser, storeId: unknown): void {
  if (storeId === null || storeId === undefined || storeId === "") return;
  if (actor.dataScopes.includes("all")) return;
  const storeIds = (actor.storeScopes ?? []).map((scope) => scope.targetId);
  if (actor.dataScopes.includes("store") && storeIds.includes(String(storeId))) return;
  throw new ForbiddenError("无权访问该店铺数据");
}

async function requireActiveWarehouse(
  client: DynamicClient,
  actor: AuthenticatedUser,
  warehouseId: string,
  options: Readonly<{ field: string; type?: string }> = { field: "warehouseId" },
): Promise<JsonRecord> {
  ensureWarehouseAccess(actor, warehouseId);
  const warehouse = await client.warehouses!.findFirst({
    where: { id: warehouseId, is_active: true },
  });
  if (!warehouse) {
    throw new ValidationError("仓库不存在或已停用", [
      { field: options.field, message: "仓库不存在或已停用" },
    ]);
  }
  if (options.type && String(warehouse.warehouse_type) !== options.type) {
    throw new ValidationError("仓库类型不合法", [
      { field: options.field, message: `仓库类型必须为 ${options.type}` },
    ]);
  }
  return warehouse;
}

async function requireActiveStore(
  client: DynamicClient,
  actor: AuthenticatedUser,
  storeId: string,
): Promise<JsonRecord> {
  ensureStoreAccess(actor, storeId);
  const store = await client.stores!.findFirst({ where: { id: storeId, is_active: true } });
  if (!store) {
    throw new ValidationError("店铺不存在或已停用", [
      { field: "storeId", message: "店铺不存在或已停用" },
    ]);
  }
  return store;
}

function ensureOutboundAccess(actor: AuthenticatedUser, document: JsonRecord): void {
  ensureWarehouseAccess(actor, String(document.warehouse_id));
  ensureStoreAccess(actor, document.store_id);
}

function listWhere(command: InventoryWorkflowCommand, actor: AuthenticatedUser): JsonRecord {
  const clauses: JsonRecord[] = [];
  clauses.push(warehouseScope(actor, command.resource));
  const allowed = [
    "status",
    "approvalStatus",
    "warehouseId",
    "sourceWarehouseId",
    "destinationWarehouseId",
    "skuId",
    "storeId",
    "outboundType",
    "shipmentStatus",
    "alertStatus",
    "alertType",
    "transactionType",
    "direction",
  ];
  for (const key of allowed) {
    const value = command.query.get(key);
    if (command.resource === "overseas-inventory" && key === "storeId") continue;
    if (value) clauses.push({ [toSnake(key)]: value });
  }
  const keyword = command.query.get("keyword") ?? command.query.get("documentNo");
  if (keyword) {
    if (command.resource === "cross-border") {
      clauses.push({
        OR: [
          { document_no: { contains: keyword, mode: "insensitive" } },
          { shipment_batch_no: { contains: keyword, mode: "insensitive" } },
        ],
      });
    } else if (command.resource === "inventory-alert") {
      clauses.push({ alert_no: { contains: keyword, mode: "insensitive" } });
    } else if (command.resource === "overseas-import") {
      clauses.push({ task_no: { contains: keyword, mode: "insensitive" } });
    } else if (
      !["inventory", "inventory-transaction", "overseas-inventory"].includes(command.resource)
    ) {
      clauses.push({ document_no: { contains: keyword, mode: "insensitive" } });
    }
  }
  if (command.resource === "overseas-inventory") {
    clauses.push({ warehouses: { warehouse_type: "overseas" } });
  }
  if (command.resource === "overseas-import") clauses.push({ import_type: "overseas_inventory" });
  return { AND: clauses };
}

function numberQuery(command: InventoryWorkflowCommand, key: string, fallback: number): number {
  const value = command.query.get(key);
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new ValidationError(`${key} 参数无效`);
  }
  return parsed;
}

function unique(values: Iterable<unknown>): string[] {
  return [...new Set([...values].filter((value) => value).map(String))];
}

function pairKey(row: Readonly<{ sku_id?: unknown; warehouse_id?: unknown }>): string {
  return `${String(row.sku_id)}::${String(row.warehouse_id)}`;
}

function hasOverseasOperationFilter(command: InventoryWorkflowCommand): boolean {
  return OVERSEAS_OPERATION_FILTERS.some((key) => Boolean(command.query.get(key)));
}

function baseOverseasInventoryWhere(
  command: InventoryWorkflowCommand,
  actor: AuthenticatedUser,
): JsonRecord {
  const clauses: JsonRecord[] = [warehouseScope(actor, "overseas-inventory")];
  const warehouseId = command.query.get("warehouseId");
  const skuId = command.query.get("skuId");
  if (warehouseId) clauses.push({ warehouse_id: warehouseId });
  if (skuId) clauses.push({ sku_id: skuId });
  clauses.push({ warehouses: { warehouse_type: "overseas" } });
  return { AND: clauses };
}

async function storeIdsForPlatform(
  client: DynamicClient,
  platformId: string,
  actor: AuthenticatedUser,
): Promise<string[]> {
  const actorStoreIds = (actor.storeScopes ?? []).map((scope) => scope.targetId);
  const stores = await client.stores!.findMany({
    where: {
      is_active: true,
      platform_id: platformId,
      ...(actor.dataScopes.includes("store") && !actor.dataScopes.includes("all")
        ? { id: { in: actorStoreIds } }
        : {}),
    },
  });
  return stores.map((store) => String(store.id));
}

async function overseasImportTaskIdsForFilters(
  client: DynamicClient,
  command: InventoryWorkflowCommand,
  actor: AuthenticatedUser,
): Promise<string[] | null> {
  if (!hasOverseasOperationFilter(command)) return null;
  const importTaskId = command.query.get("importTaskId");
  const importBatch = command.query.get("importBatch") ?? command.query.get("taskNo");
  const platformId = command.query.get("platformId");
  const storeId = command.query.get("storeId");
  const where: JsonRecord = { import_type: "overseas_inventory" };

  if (importTaskId) where.id = importTaskId;
  if (importBatch) where.task_no = { contains: importBatch, mode: "insensitive" };

  if (storeId) {
    ensureStoreAccess(actor, storeId);
    where.store_id = storeId;
  }

  if (platformId) {
    const platformStoreIds = await storeIdsForPlatform(client, platformId, actor);
    if (platformStoreIds.length === 0) return [];
    if (storeId && !platformStoreIds.includes(storeId)) return [];
    if (!storeId) where.store_id = { in: platformStoreIds };
  }

  const tasks = await client.import_tasks!.findMany({ where });
  return tasks.map((task) => String(task.id));
}

async function overseasInventoryWhere(
  client: DynamicClient,
  command: InventoryWorkflowCommand,
  actor: AuthenticatedUser,
): Promise<JsonRecord> {
  const where = baseOverseasInventoryWhere(command, actor);
  const taskIds = await overseasImportTaskIdsForFilters(client, command, actor);
  if (taskIds === null) return where;
  if (taskIds.length === 0) return { AND: [where, { id: { in: [] } }] };
  const transactions = await client.inventory_transactions!.findMany({
    where: {
      direction: "in",
      source_document_id: { in: taskIds },
      source_document_type: "overseas_import",
    },
  });
  const pairs = new Map<string, JsonRecord>();
  for (const transaction of transactions) {
    pairs.set(pairKey(transaction), {
      sku_id: transaction.sku_id,
      warehouse_id: transaction.warehouse_id,
    });
  }
  if (pairs.size === 0) return { AND: [where, { id: { in: [] } }] };
  return { AND: [where, { OR: [...pairs.values()] }] };
}

async function transitQuantityBySku(
  client: DynamicClient,
  skuIds: readonly string[],
): Promise<Map<string, number>> {
  if (skuIds.length === 0) return new Map();
  const rows = await client.inventories!.findMany({
    where: {
      sku_id: { in: skuIds },
      warehouses: { warehouse_type: "transit" },
    },
  });
  const totals = new Map<string, number>();
  for (const row of rows) {
    totals.set(
      String(row.sku_id),
      (totals.get(String(row.sku_id)) ?? 0) + Number(row.available_quantity ?? 0),
    );
  }
  return totals;
}

async function overseasImportContextByInventory(
  client: DynamicClient,
  rows: readonly JsonRecord[],
): Promise<Map<string, JsonRecord>> {
  if (rows.length === 0) return new Map();
  const transactions = await client.inventory_transactions!.findMany({
    orderBy: { transaction_at: "desc" },
    where: {
      direction: "in",
      OR: rows.map((row) => ({ sku_id: row.sku_id, warehouse_id: row.warehouse_id })),
      source_document_type: "overseas_import",
    },
  });
  const latestByPair = new Map<string, JsonRecord>();
  for (const transaction of transactions) {
    const key = pairKey(transaction);
    if (!latestByPair.has(key)) latestByPair.set(key, transaction);
  }
  const taskIds = unique(
    [...latestByPair.values()].map((transaction) => transaction.source_document_id),
  );
  if (taskIds.length === 0) return new Map();
  const tasks = await client.import_tasks!.findMany({
    include: { stores: { include: { ecommerce_platforms: true } }, warehouses: true },
    where: { id: { in: taskIds } },
  });
  const taskById = new Map(tasks.map((task) => [String(task.id), task]));
  const context = new Map<string, JsonRecord>();
  for (const [key, transaction] of latestByPair.entries()) {
    const task = taskById.get(String(transaction.source_document_id));
    context.set(key, {
      latestImportTransaction: transaction,
      sourceImportTask: task ?? null,
    });
  }
  return context;
}

async function enrichOverseasInventoryRows(
  client: DynamicClient,
  rows: readonly JsonRecord[],
): Promise<JsonRecord[]> {
  const transitBySku = await transitQuantityBySku(client, unique(rows.map((row) => row.sku_id)));
  const contextByPair = await overseasImportContextByInventory(client, rows);
  return rows.map((row) => {
    const context = contextByPair.get(pairKey(row));
    const task = context?.sourceImportTask as JsonRecord | null | undefined;
    const store = task?.stores as JsonRecord | null | undefined;
    const platform = store?.ecommerce_platforms as JsonRecord | null | undefined;
    const normalized = record(row);
    return {
      ...normalized,
      availableQuantity: Number(row.available_quantity ?? 0),
      currentQuantity: Number(row.on_hand_quantity ?? 0),
      platform: platform ? record(platform) : null,
      platformId: platform?.id ?? null,
      platformName: platform?.platform_name ?? null,
      sourceImportTask: task ? record(task) : null,
      sourceImportTaskId: task?.id ?? null,
      sourceImportTaskNo: task?.task_no ?? null,
      store: store ? record(store) : null,
      storeId: store?.id ?? null,
      storeName: store?.store_name ?? null,
      transitQuantity: transitBySku.get(String(row.sku_id)) ?? 0,
    };
  });
}

async function overseasInventoryList(
  client: DynamicClient,
  command: InventoryWorkflowCommand,
  actor: AuthenticatedUser,
): Promise<JsonRecord> {
  const pagination = page(command);
  const where = await overseasInventoryWhere(client, command, actor);
  const [rows, total] = await Promise.all([
    client.inventories!.findMany({
      include: { skus: true, warehouses: true },
      orderBy: { updated_at: "desc" },
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
      where,
    }),
    client.inventories!.count({ where }),
  ]);
  return {
    items: await enrichOverseasInventoryRows(client, rows),
    page: pagination.page,
    pageSize: pagination.pageSize,
    total,
    totalPages: Math.ceil(total / pagination.pageSize),
  };
}

async function overseasInventorySummary(
  client: DynamicClient,
  command: InventoryWorkflowCommand,
  actor: AuthenticatedUser,
): Promise<JsonRecord> {
  const where = await overseasInventoryWhere(client, command, actor);
  const rows = await client.inventories!.findMany({
    include: { skus: true, warehouses: true },
    where,
  });
  const items = await enrichOverseasInventoryRows(client, rows);
  return {
    availableQuantity: rows.reduce((sum, row) => sum + Number(row.available_quantity), 0),
    inventoryCount: rows.length,
    items,
    onHandQuantity: rows.reduce((sum, row) => sum + Number(row.on_hand_quantity), 0),
    pendingQuantity: rows.reduce((sum, row) => sum + Number(row.pending_quantity), 0),
    reservedQuantity: rows.reduce((sum, row) => sum + Number(row.reserved_quantity), 0),
    transitQuantity: items.reduce((sum, row) => sum + Number(row.transitQuantity ?? 0), 0),
  };
}

async function replenishmentSuggestion(
  client: DynamicClient,
  command: InventoryWorkflowCommand,
  actor: AuthenticatedUser,
): Promise<JsonRecord> {
  const threshold = numberQuery(command, "lowStockThreshold", 10);
  const summary = await overseasInventorySummary(client, command, actor);
  const rows = (summary.items as JsonRecord[]) ?? [];
  const includeNormal = command.query.get("includeNormal") === "true";
  const items = rows
    .map((row) => {
      const availableQuantity = Number(row.availableQuantity ?? 0);
      const transitQuantity = Number(row.transitQuantity ?? 0);
      const coverageQuantity = availableQuantity + transitQuantity;
      const suggestionType =
        availableQuantity === 0
          ? "zero_stock"
          : coverageQuantity <= threshold
            ? "low_stock"
            : "normal";
      return {
        ...row,
        coverageQuantity,
        readOnly: true,
        suggestedQuantity: Math.max(0, threshold - coverageQuantity),
        suggestionType,
      };
    })
    .filter((row) => includeNormal || row.suggestionType !== "normal");
  return {
    items,
    lowStockCount: items.filter((row) => row.suggestionType === "low_stock").length,
    readOnly: true,
    threshold,
    totalCandidates: items.length,
    zeroStockCount: items.filter((row) => row.suggestionType === "zero_stock").length,
  };
}

async function list(
  client: DynamicClient,
  command: InventoryWorkflowCommand,
  actor: AuthenticatedUser,
): Promise<JsonRecord> {
  const pagination = page(command);
  const model = MODEL[command.resource];
  if (!model) throw new NotFoundError();
  const where = listWhere(command, actor);
  const relation = ITEM_RELATION[command.resource];
  const [rows, total] = await Promise.all([
    client[model]!.findMany({
      ...(relation ? { include: { [relation]: { orderBy: { line_no: "asc" } } } } : {}),
      orderBy:
        command.resource === "inventory-transaction"
          ? { transaction_at: "desc" }
          : { updated_at: "desc" },
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
      where,
    }),
    client[model]!.count({ where }),
  ]);
  return {
    items: rows.map(record),
    page: pagination.page,
    pageSize: pagination.pageSize,
    total,
    totalPages: Math.ceil(total / pagination.pageSize),
  };
}

async function detail(
  client: DynamicClient,
  command: InventoryWorkflowCommand,
  actor: AuthenticatedUser,
): Promise<JsonRecord> {
  const model = MODEL[command.resource];
  if (!model) throw new NotFoundError();
  const relation = ITEM_RELATION[command.resource];
  const found = await client[model]!.findFirst({
    ...(relation ? { include: { [relation]: { orderBy: { line_no: "asc" } } } } : {}),
    where: {
      id: command.entityId,
      ...listWhere(command, actor),
    },
  });
  if (!found) throw new NotFoundError();
  return record(found);
}

async function skuSnapshots(client: DynamicClient, rows: JsonRecord[]) {
  const ids = [...new Set(rows.map((row) => String(row.skuId)))];
  const skus = await client.skus!.findMany({
    select: { id: true, sku_code: true, sku_name: true, specification: true },
    where: { id: { in: ids }, is_active: true },
  });
  if (skus.length !== ids.length) throw new ValidationError("明细包含不存在或停用的 SKU");
  return new Map(skus.map((sku) => [String(sku.id), sku]));
}

function baseItem(row: JsonRecord, snapshot: JsonRecord, index: number, actor: string): JsonRecord {
  return {
    created_by: actor,
    line_no: index + 1,
    quantity: decimal(
      row.quantity ?? row.returnedQuantity ?? row.adjustmentQuantity,
      "quantity",
      false,
    ),
    remark: typeof row.remark === "string" ? row.remark : null,
    sku_code_snapshot: snapshot.sku_code,
    sku_id: row.skuId,
    sku_name_snapshot: snapshot.sku_name,
    specification_snapshot: snapshot.specification,
    updated_by: actor,
  };
}

function baseDocument(
  payload: InventoryWorkflowPayload,
  actor: string,
  prefix: string,
): JsonRecord {
  return {
    approval_status: "not_submitted",
    created_by: actor,
    document_date: dateValue(payload, "documentDate"),
    document_no: documentNo(prefix),
    remark: typeof payload.remark === "string" ? payload.remark : null,
    status: "draft",
    updated_by: actor,
    version_no: 1,
  };
}

async function createDocument(
  client: DynamicClient,
  command: InventoryWorkflowCommand,
  actor: AuthenticatedUser,
): Promise<JsonRecord> {
  const payload = command.payload;
  const actorId = actor.userId;
  if (command.resource === "stock-count") {
    return record(
      await client.stock_counts!.create({
        data: {
          ...baseDocument(payload, actorId, "STC"),
          count_date: dateValue(payload, "countDate"),
          count_scope: stringValue(payload, "countScope"),
          difference_item_count: 0,
          freeze_inventory: payload.freezeInventory === true,
          total_item_count: 0,
          warehouse_id: stringValue(payload, "warehouseId"),
        },
      }),
    );
  }
  const rows = sourceItems(payload);
  const snapshots = await skuSnapshots(client, rows);
  let totalQuantity = 0;
  const commonRows = rows.map((row, index) => {
    const common = baseItem(row, snapshots.get(String(row.skuId))!, index, actorId);
    totalQuantity += Number(common.quantity);
    return common;
  });

  if (command.resource === "transfer") {
    return record(
      await client.transfer_orders!.create({
        data: {
          ...baseDocument(payload, actorId, "TRF"),
          destination_warehouse_id: stringValue(payload, "destinationWarehouseId"),
          planned_transfer_date: dateValue(payload, "plannedTransferDate"),
          source_warehouse_id: stringValue(payload, "sourceWarehouseId"),
          total_quantity: totalQuantity,
          transit_warehouse_id: stringValue(payload, "transitWarehouseId"),
          transfer_order_items: {
            create: commonRows.map((row, index) => ({
              ...row,
              batch_no: stringValue(rows[index]!, "batchNo"),
              difference_quantity: 0,
              received_quantity: 0,
              shipped_quantity: 0,
              unit_cost: decimal(rows[index]!.unitCost, "unitCost"),
            })),
          },
        },
        include: { transfer_order_items: true },
      }),
    );
  }
  if (command.resource === "cross-border") {
    const sourceWarehouseId = String(stringValue(payload, "sourceWarehouseId"));
    const transitWarehouseId = String(stringValue(payload, "transitWarehouseId"));
    const destinationWarehouseId = String(stringValue(payload, "destinationWarehouseId"));
    if (new Set([sourceWarehouseId, transitWarehouseId, destinationWarehouseId]).size !== 3) {
      throw new ValidationError("跨境发货的来源仓、在途仓和海外仓必须互不相同");
    }
    await requireActiveWarehouse(client, actor, sourceWarehouseId, { field: "sourceWarehouseId" });
    await requireActiveWarehouse(client, actor, transitWarehouseId, {
      field: "transitWarehouseId",
      type: "transit",
    });
    await requireActiveWarehouse(client, actor, destinationWarehouseId, {
      field: "destinationWarehouseId",
      type: "overseas",
    });
    return record(
      await client.cross_border_shipments!.create({
        data: {
          ...baseDocument(payload, actorId, "CBR"),
          carrier_name: stringValue(payload, "carrierName"),
          departure_date: dateValue(payload, "departureDate"),
          destination_country: stringValue(payload, "destinationCountry"),
          destination_warehouse_id: destinationWarehouseId,
          estimated_arrival_date: dateValue(payload, "estimatedArrivalDate"),
          production_order_id: stringValue(payload, "productionOrderId", true),
          shipment_batch_no: stringValue(payload, "shipmentBatchNo"),
          shipment_status: "draft",
          source_warehouse_id: sourceWarehouseId,
          total_quantity: totalQuantity,
          tracking_no: stringValue(payload, "trackingNo"),
          transit_warehouse_id: transitWarehouseId,
          transport_method: stringValue(payload, "transportMethod"),
          cross_border_shipment_items: {
            create: commonRows.map((row, index) => {
              const unitCost = decimal(rows[index]!.unitCost, "unitCost");
              return {
                ...row,
                batch_no: stringValue(rows[index]!, "batchNo"),
                difference_quantity: 0,
                line_cost: Number(row.quantity) * unitCost,
                production_order_item_id: stringValue(rows[index]!, "productionOrderItemId", true),
                received_quantity: 0,
                shipped_quantity: 0,
                unit_cost: unitCost,
              };
            }),
          },
        },
        include: { cross_border_shipment_items: true },
      }),
    );
  }
  if (command.resource === "outbound") {
    const warehouseId = String(stringValue(payload, "warehouseId"));
    ensureWarehouseAccess(actor, warehouseId);
    ensureStoreAccess(actor, payload.storeId);
    const warehouse = await client.warehouses!.findFirst({
      where: { id: warehouseId, is_active: true },
    });
    if (!warehouse) throw new ValidationError("仓库不存在或已停用");
    return record(
      await client.outbound_orders!.create({
        data: {
          ...baseDocument(payload, actorId, "OUT"),
          customer_name: stringValue(payload, "customerName", true),
          external_order_no: stringValue(payload, "externalOrderNo", true),
          outbound_type: command.action === "create-domestic-sales" ? "domestic_sales" : "other",
          platform_id: stringValue(payload, "platformId", true),
          recipient_address: stringValue(payload, "recipientAddress", true),
          recipient_country: stringValue(payload, "recipientCountry", true),
          store_id: stringValue(payload, "storeId", true),
          total_quantity: totalQuantity,
          warehouse_id: warehouseId,
          outbound_order_items: {
            create: commonRows.map((row, index) => {
              const unitCost = decimal(rows[index]!.unitCost, "unitCost");
              return {
                ...row,
                batch_no: stringValue(rows[index]!, "batchNo"),
                external_order_item_no: stringValue(rows[index]!, "externalOrderItemNo", true),
                external_sku_code: stringValue(rows[index]!, "externalSkuCode", true),
                line_cost: Number(row.quantity) * unitCost,
                unit_cost: unitCost,
              };
            }),
          },
        },
        include: { outbound_order_items: true },
      }),
    );
  }
  if (command.resource === "damage") {
    let totalLoss = 0;
    const itemRows = commonRows.map((row, index) => {
      const unitCost = decimal(rows[index]!.unitCost, "unitCost");
      const loss = decimal(
        rows[index]!.lossAmount ?? Number(row.quantity) * unitCost,
        "lossAmount",
      );
      totalLoss += loss;
      return {
        ...row,
        batch_no: stringValue(rows[index]!, "batchNo"),
        damage_reason: stringValue(rows[index]!, "damageReason"),
        inventory_condition: stringValue(rows[index]!, "inventoryCondition"),
        loss_amount: loss,
        source_document_item_id: stringValue(rows[index]!, "sourceDocumentItemId", true),
        unit_cost: unitCost,
      };
    });
    const sourceType = stringValue(payload, "sourceDocumentType", true);
    const sourceId = stringValue(payload, "sourceDocumentId", true);
    if ((sourceType === null) !== (sourceId === null)) {
      throw new ValidationError("sourceDocumentType 与 sourceDocumentId 必须同时提供");
    }
    return record(
      await client.damage_reports!.create({
        data: {
          ...baseDocument(payload, actorId, "DMG"),
          damage_date: dateValue(payload, "damageDate"),
          damage_reason: stringValue(payload, "damageReason"),
          disposition_method: stringValue(payload, "dispositionMethod"),
          responsible_party: stringValue(payload, "responsibleParty", true),
          source_document_id: sourceId,
          source_document_type: sourceType,
          total_loss_amount: totalLoss,
          total_quantity: totalQuantity,
          warehouse_id: stringValue(payload, "warehouseId"),
          damage_report_items: { create: itemRows },
        },
        include: { damage_report_items: true },
      }),
    );
  }
  if (command.resource === "inventory-adjustment") {
    let increase = 0;
    let decrease = 0;
    const warehouseId = String(stringValue(payload, "warehouseId"));
    ensureWarehouseAccess(actor, warehouseId);
    const warehouse = await client.warehouses!.findFirst({
      where: { id: warehouseId, is_active: true },
    });
    if (!warehouse) throw new ValidationError("仓库不存在或已停用");
    const itemRows: JsonRecord[] = [];
    for (const [index, row] of rows.entries()) {
      const direction = stringValue(row, "adjustmentDirection");
      if (direction !== "increase" && direction !== "decrease") {
        throw new ValidationError("adjustmentDirection 只允许 increase 或 decrease");
      }
      const quantity = decimal(row.adjustmentQuantity, "adjustmentQuantity", false);
      const inventory = await client.inventories!.findFirst({
        where: { sku_id: row.skuId, warehouse_id: warehouseId },
      });
      const before = Number(inventory?.on_hand_quantity ?? 0);
      const availableBefore = Number(inventory?.available_quantity ?? 0);
      const after = direction === "increase" ? before + quantity : before - quantity;
      if (direction === "decrease" && (after < 0 || availableBefore < quantity)) {
        throw new ConflictError("可用库存不足，不能创建该调整单");
      }
      if (direction === "increase") increase += quantity;
      else decrease += quantity;
      const unitCost = decimal(row.unitCost, "unitCost");
      itemRows.push({
        ...commonRows[index],
        adjustment_direction: direction,
        adjustment_quantity: quantity,
        amount: quantity * unitCost,
        batch_no: stringValue(row, "batchNo", true),
        quantity: quantity,
        quantity_after: after,
        quantity_before: before,
        stock_count_item_id: stringValue(row, "stockCountItemId", true),
        unit_cost: unitCost,
      });
    }
    return record(
      await client.inventory_adjustments!.create({
        data: {
          ...baseDocument(payload, actorId, "ADJ"),
          adjustment_reason: stringValue(payload, "adjustmentReason"),
          adjustment_type: stringValue(payload, "adjustmentType"),
          stock_count_id: stringValue(payload, "stockCountId", true),
          total_decrease_quantity: decrease,
          total_increase_quantity: increase,
          warehouse_id: warehouseId,
          inventory_adjustment_items: { create: itemRows },
        },
        include: { inventory_adjustment_items: true },
      }),
    );
  }
  if (command.resource === "sales-return") {
    const outboundOrderId = stringValue(payload, "outboundOrderId");
    const storeId = stringValue(payload, "storeId");
    ensureStoreAccess(actor, storeId);
    const outboundOrder = await client.outbound_orders!.findFirst({
      where: { id: outboundOrderId, store_id: storeId },
    });
    if (!outboundOrder) throw new ValidationError("原销售出库不存在或店铺不匹配");
    const outboundItemIds = rows.map((row) => stringValue(row, "outboundOrderItemId"));
    const outboundRows = await client.outbound_order_items!.findMany({
      where: { id: { in: outboundItemIds }, outbound_order_id: outboundOrderId },
    });
    const outboundMap = new Map(outboundRows.map((row) => [String(row.id), row]));
    if (outboundMap.size !== new Set(outboundItemIds).size) {
      throw new ValidationError("退货明细必须引用同一原销售出库的有效明细");
    }
    const existingReturnRows = await client.sales_return_items!.findMany({
      where: { outbound_order_item_id: { in: outboundItemIds } },
    });
    const returnedByItem = new Map<string, number>();
    for (const item of existingReturnRows) {
      const key = String(item.outbound_order_item_id);
      returnedByItem.set(key, (returnedByItem.get(key) ?? 0) + Number(item.returned_quantity ?? 0));
    }
    const itemRows = rows.map((row, index) => {
      const source = outboundMap.get(String(row.outboundOrderItemId))!;
      if (String(source.sku_id) !== String(row.skuId)) {
        throw new ValidationError("退货 SKU 必须与原出库明细一致");
      }
      const returned = decimal(row.returnedQuantity, "returnedQuantity", false);
      const alreadyReturned = returnedByItem.get(String(row.outboundOrderItemId)) ?? 0;
      if (alreadyReturned + returned > Number(source.quantity)) {
        throw new ConflictError("退货数量不能超过原出库数量");
      }
      const dispositionTotal =
        decimal(row.sellableQuantity, "sellableQuantity") +
        decimal(row.pendingQuantity, "pendingQuantity") +
        decimal(row.damagedQuantity, "damagedQuantity");
      if (returned !== dispositionTotal) throw new ValidationError("退货处置数量合计不一致");
      return {
        ...commonRows[index],
        damaged_quantity: decimal(row.damagedQuantity, "damagedQuantity"),
        disposition_method: stringValue(row, "dispositionMethod"),
        inventory_condition: stringValue(row, "inventoryCondition"),
        outbound_order_item_id: row.outboundOrderItemId,
        pending_quantity: decimal(row.pendingQuantity, "pendingQuantity"),
        quantity: returned,
        returned_quantity: returned,
        sellable_quantity: decimal(row.sellableQuantity, "sellableQuantity"),
      };
    });
    return record(
      await client.sales_returns!.create({
        data: {
          ...baseDocument({ ...payload, documentDate: payload.returnDate }, actorId, "SRT"),
          external_return_no: stringValue(payload, "externalReturnNo", true),
          outbound_order_id: outboundOrderId,
          return_date: dateValue(payload, "returnDate"),
          return_reason: stringValue(payload, "returnReason"),
          return_warehouse_id: stringValue(payload, "returnWarehouseId"),
          store_id: storeId,
          total_quantity: itemRows.reduce((sum, row) => sum + Number(row.quantity), 0),
          sales_return_items: { create: itemRows },
        },
        include: { sales_return_items: true },
      }),
    );
  }
  throw new NotFoundError();
}

type Movement = Readonly<{
  batchNo?: string | null;
  delta: number;
  itemId: string;
  skuId: string;
  unitCost?: number | null;
  warehouseId: string;
}>;

export async function applyInventoryMovements(
  client: DynamicClient,
  movements: readonly Movement[],
  source: Readonly<{ actorId: string; documentId: string; documentType: string; remark?: string }>,
): Promise<void> {
  for (const movement of movements) {
    if (!Number.isFinite(movement.delta) || movement.delta === 0) {
      throw new ValidationError("库存事务数量不能为 0");
    }
    const current = await client.inventories!.findFirst({
      where: { sku_id: movement.skuId, warehouse_id: movement.warehouseId },
    });
    let before: number;
    let after: number;
    if (movement.delta < 0) {
      const quantity = Math.abs(movement.delta);
      if (
        !current ||
        Number(current.available_quantity ?? 0) < quantity ||
        Number(current.on_hand_quantity ?? 0) < quantity
      ) {
        throw new ConflictError("可用库存不足");
      }
      const updatedCount = await client.inventories!.updateMany({
        data: {
          available_quantity: { decrement: quantity },
          last_transaction_at: new Date(),
          on_hand_quantity: { decrement: quantity },
          updated_by: source.actorId,
        },
        where: {
          available_quantity: { gte: quantity },
          id: current.id,
          on_hand_quantity: { gte: quantity },
        },
      });
      if (updatedCount.count !== 1) throw new ConflictError("可用库存不足");
      const updated = await client.inventories!.findFirst({ where: { id: current.id } });
      after = Number(updated?.on_hand_quantity ?? Number(current.on_hand_quantity) - quantity);
      before = after + quantity;
    } else {
      const updated = await client.inventories!.upsert({
        create: {
          available_quantity: movement.delta,
          created_by: source.actorId,
          last_transaction_at: new Date(),
          on_hand_quantity: movement.delta,
          pending_quantity: 0,
          reserved_quantity: 0,
          sku_id: movement.skuId,
          updated_by: source.actorId,
          warehouse_id: movement.warehouseId,
        },
        update: {
          available_quantity: { increment: movement.delta },
          last_transaction_at: new Date(),
          on_hand_quantity: { increment: movement.delta },
          updated_by: source.actorId,
        },
        where: {
          sku_id_warehouse_id: {
            sku_id: movement.skuId,
            warehouse_id: movement.warehouseId,
          },
        },
      });
      after = Number(
        updated.on_hand_quantity ?? Number(current?.on_hand_quantity ?? 0) + movement.delta,
      );
      before = after - movement.delta;
    }
    await client.inventory_transactions!.create({
      data: {
        amount:
          movement.unitCost === null || movement.unitCost === undefined
            ? null
            : Math.abs(movement.delta) * movement.unitCost,
        batch_no: movement.batchNo ?? null,
        direction: movement.delta > 0 ? "in" : "out",
        operator_id: source.actorId,
        quantity: Math.abs(movement.delta),
        quantity_after: after,
        quantity_before: before,
        remark: source.remark ?? null,
        sku_id: movement.skuId,
        source_document_id: source.documentId,
        source_document_item_id: movement.itemId,
        source_document_type: source.documentType,
        transaction_at: new Date(),
        transaction_no: documentNo("TXN"),
        transaction_type: source.documentType,
        unit_cost: movement.unitCost ?? null,
        warehouse_id: movement.warehouseId,
      },
    });
  }
}

async function applyOutboundConfirmation(
  client: DynamicClient,
  document: JsonRecord,
  rows: readonly JsonRecord[],
  actor: AuthenticatedUser,
  command: InventoryWorkflowCommand,
): Promise<void> {
  for (const row of rows) {
    const quantity = Number(row.quantity);
    const inventory = await client.inventories!.findFirst({
      where: { sku_id: row.sku_id, warehouse_id: document.warehouse_id },
    });
    if (
      !inventory ||
      Number(inventory.available_quantity ?? 0) < quantity ||
      Number(inventory.on_hand_quantity ?? 0) < quantity
    ) {
      throw new ConflictError("可用库存不足");
    }
    const updatedCount = await client.inventories!.updateMany({
      data: {
        available_quantity: { decrement: quantity },
        last_transaction_at: new Date(),
        on_hand_quantity: { decrement: quantity },
        updated_by: actor.userId,
      },
      where: {
        available_quantity: { gte: quantity },
        id: inventory.id,
        on_hand_quantity: { gte: quantity },
      },
    });
    if (updatedCount.count !== 1) throw new ConflictError("可用库存不足");
    const updated = await client.inventories!.findFirst({ where: { id: inventory.id } });
    await client.inventory_transactions!.create({
      data: {
        amount: row.line_cost,
        batch_no: row.batch_no,
        direction: "out",
        operator_id: actor.userId,
        quantity,
        quantity_after: updated?.on_hand_quantity ?? Number(inventory.on_hand_quantity) - quantity,
        quantity_before: inventory.on_hand_quantity,
        remark: typeof command.payload.remark === "string" ? command.payload.remark : null,
        sku_id: row.sku_id,
        source_document_id: document.id,
        source_document_item_id: row.id,
        source_document_type: "outbound_order",
        transaction_at: new Date(),
        transaction_no: documentNo("ITX-O"),
        transaction_type: document.outbound_type,
        unit_cost: row.unit_cost,
        warehouse_id: document.warehouse_id,
      },
    });
  }
}

async function applyOutboundReverse(
  client: DynamicClient,
  document: JsonRecord,
  rows: readonly JsonRecord[],
  actor: AuthenticatedUser,
  command: InventoryWorkflowCommand,
): Promise<void> {
  const originalTransactions = await client.inventory_transactions!.findMany({
    where: {
      OR: [
        { source_document_id: document.id, source_document_type: "outbound_order" },
        { source_document_id: document.id, source_document_type: "outbound" },
      ],
    },
  });
  const transactionByItem = new Map(
    originalTransactions.map((item) => [String(item.source_document_item_id), item]),
  );
  for (const row of rows) {
    const quantity = Number(row.quantity);
    const current = await client.inventories!.findFirst({
      where: { sku_id: row.sku_id, warehouse_id: document.warehouse_id },
    });
    const before = Number(current?.on_hand_quantity ?? 0);
    const updated = await client.inventories!.upsert({
      create: {
        available_quantity: quantity,
        created_by: actor.userId,
        last_transaction_at: new Date(),
        on_hand_quantity: quantity,
        pending_quantity: 0,
        reserved_quantity: 0,
        sku_id: row.sku_id,
        updated_by: actor.userId,
        warehouse_id: document.warehouse_id,
      },
      update: {
        available_quantity: { increment: quantity },
        last_transaction_at: new Date(),
        on_hand_quantity: { increment: quantity },
        updated_by: actor.userId,
      },
      where: {
        sku_id_warehouse_id: {
          sku_id: row.sku_id,
          warehouse_id: document.warehouse_id,
        },
      },
    });
    const original = transactionByItem.get(String(row.id));
    await client.inventory_transactions!.create({
      data: {
        amount: -Number(row.line_cost ?? 0),
        batch_no: row.batch_no,
        direction: "in",
        operator_id: actor.userId,
        quantity,
        quantity_after: updated.on_hand_quantity,
        quantity_before: before,
        related_transaction_id: original?.id,
        remark: typeof command.payload.reason === "string" ? command.payload.reason : null,
        sku_id: row.sku_id,
        source_document_id: document.id,
        source_document_item_id: row.id,
        source_document_type: "outbound_order",
        transaction_at: new Date(),
        transaction_no: documentNo("ITX-OR"),
        transaction_type: `${String(document.outbound_type)}_reversal`,
        unit_cost: row.unit_cost,
        warehouse_id: document.warehouse_id,
      },
    });
  }
}

async function applyAdjustmentExecution(
  client: DynamicClient,
  document: JsonRecord,
  rows: readonly JsonRecord[],
  actor: AuthenticatedUser,
  command: InventoryWorkflowCommand,
): Promise<void> {
  const warehouseId = String(document.warehouse_id);
  for (const row of rows) {
    const direction = String(row.adjustment_direction);
    if (direction !== "increase" && direction !== "decrease") {
      throw new ValidationError("adjustmentDirection 只允许 increase 或 decrease");
    }
    const quantity = Number(row.adjustment_quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new ValidationError("调整数量必须大于 0");
    }
    const inventory = await client.inventories!.findFirst({
      where: { sku_id: row.sku_id, warehouse_id: warehouseId },
    });
    const before = Number(inventory?.on_hand_quantity ?? 0);
    const unitCost = row.unit_cost === null ? null : Number(row.unit_cost ?? 0);
    const remark =
      typeof command.payload.reason === "string"
        ? command.payload.reason
        : typeof document.adjustment_reason === "string"
          ? document.adjustment_reason
          : null;

    if (direction === "increase") {
      const updated = await client.inventories!.upsert({
        create: {
          available_quantity: quantity,
          created_by: actor.userId,
          last_transaction_at: new Date(),
          on_hand_quantity: quantity,
          pending_quantity: 0,
          reserved_quantity: 0,
          sku_id: row.sku_id,
          updated_by: actor.userId,
          warehouse_id: warehouseId,
        },
        update: {
          available_quantity: { increment: quantity },
          last_transaction_at: new Date(),
          on_hand_quantity: { increment: quantity },
          updated_by: actor.userId,
        },
        where: {
          sku_id_warehouse_id: {
            sku_id: row.sku_id,
            warehouse_id: warehouseId,
          },
        },
      });
      await client.inventory_transactions!.create({
        data: {
          amount: row.amount ?? (unitCost === null ? null : quantity * unitCost),
          batch_no: row.batch_no,
          direction: "in",
          operator_id: actor.userId,
          quantity,
          quantity_after: updated.on_hand_quantity ?? before + quantity,
          quantity_before: before,
          remark,
          sku_id: row.sku_id,
          source_document_id: document.id,
          source_document_item_id: row.id,
          source_document_type: "inventory_adjustment",
          transaction_at: new Date(),
          transaction_no: documentNo("ITX-A"),
          transaction_type: document.adjustment_type ?? "inventory_adjustment",
          unit_cost: unitCost,
          warehouse_id: warehouseId,
        },
      });
      continue;
    }

    if (
      !inventory ||
      Number(inventory.available_quantity ?? 0) < quantity ||
      Number(inventory.on_hand_quantity ?? 0) < quantity
    ) {
      throw new ConflictError("可用库存不足");
    }
    const updatedCount = await client.inventories!.updateMany({
      data: {
        available_quantity: { decrement: quantity },
        last_transaction_at: new Date(),
        on_hand_quantity: { decrement: quantity },
        updated_by: actor.userId,
      },
      where: {
        available_quantity: { gte: quantity },
        id: inventory.id,
        on_hand_quantity: { gte: quantity },
      },
    });
    if (updatedCount.count !== 1) throw new ConflictError("可用库存不足");
    const updated = await client.inventories!.findFirst({ where: { id: inventory.id } });
    await client.inventory_transactions!.create({
      data: {
        amount: row.amount ?? (unitCost === null ? null : quantity * unitCost),
        batch_no: row.batch_no,
        direction: "out",
        operator_id: actor.userId,
        quantity,
        quantity_after: updated?.on_hand_quantity ?? before - quantity,
        quantity_before: before,
        remark,
        sku_id: row.sku_id,
        source_document_id: document.id,
        source_document_item_id: row.id,
        source_document_type: "inventory_adjustment",
        transaction_at: new Date(),
        transaction_no: documentNo("ITX-A"),
        transaction_type: document.adjustment_type ?? "inventory_adjustment",
        unit_cost: unitCost,
        warehouse_id: warehouseId,
      },
    });
  }
}

function itemMovements(rows: JsonRecord[], warehouseId: string, sign: 1 | -1): Movement[] {
  return rows.map((row) => ({
    batchNo: typeof row.batch_no === "string" ? row.batch_no : null,
    delta: sign * Number(row.quantity ?? row.adjustment_quantity ?? row.returned_quantity),
    itemId: String(row.id),
    skuId: String(row.sku_id),
    unitCost: row.unit_cost === null ? null : Number(row.unit_cost ?? 0),
    warehouseId,
  }));
}

const ACTION_STATE: Readonly<Record<string, { approval?: string; status: string }>> = {
  approve: { approval: "approved", status: "approved" },
  cancel: { status: "cancelled" },
  confirm: { status: "completed" },
  complete: { status: "completed" },
  dispatch: { status: "dispatched" },
  execute: { status: "completed" },
  "confirm-inbound": { status: "completed" },
  "confirm-outbound": { status: "completed" },
  receive: { status: "completed" },
  reject: { approval: "rejected", status: "rejected" },
  reverse: { status: "reversed" },
  ship: { status: "shipped" },
  start: { status: "in_progress" },
  submit: { approval: "pending", status: "pending_approval" },
  unapprove: { approval: "not_submitted", status: "draft" },
  void: { status: "voided" },
  withdraw: { approval: "not_submitted", status: "draft" },
};

const ACTION_FROM: Readonly<Record<string, readonly string[]>> = {
  approve: ["pending_approval"],
  cancel: ["draft", "rejected", "approved"],
  confirm: ["approved"],
  complete: ["in_progress"],
  dispatch: ["approved"],
  execute: ["approved"],
  "confirm-inbound": ["approved"],
  "confirm-outbound": ["approved"],
  receive: ["shipped"],
  reject: ["pending_approval"],
  reverse: ["completed"],
  ship: ["approved"],
  start: ["approved"],
  submit: ["draft", "rejected"],
  unapprove: ["approved"],
  void: ["draft", "rejected", "cancelled"],
  withdraw: ["pending_approval"],
};

async function action(
  client: DynamicClient,
  command: InventoryWorkflowCommand,
  actor: AuthenticatedUser,
): Promise<JsonRecord> {
  const model = MODEL[command.resource];
  if (!model || !command.entityId) throw new NotFoundError();
  const relation = ITEM_RELATION[command.resource];
  const document = await client[model]!.findFirst({
    ...(relation ? { include: { [relation]: true } } : {}),
    where: { id: command.entityId },
  });
  if (!document) throw new NotFoundError();
  if (command.resource === "outbound") ensureOutboundAccess(actor, document);
  if (command.resource === "inventory-adjustment") {
    ensureWarehouseAccess(actor, String(document.warehouse_id));
  }
  if (
    command.resource === "inventory-adjustment" &&
    command.action === "execute" &&
    document.status === "completed"
  ) {
    return record(document);
  }
  if (
    command.resource === "outbound" &&
    command.action === "confirm" &&
    document.status === "completed"
  ) {
    return record(document);
  }
  if (
    command.resource === "outbound" &&
    command.action === "reverse" &&
    document.status === "reversed"
  ) {
    return record(document);
  }
  if (
    command.resource === "cross-border" &&
    command.action === "dispatch" &&
    (document.status === "shipped" || document.shipment_status === "shipped")
  ) {
    return record(document);
  }
  const allowedStates = ACTION_FROM[command.action];
  if (allowedStates && !allowedStates.includes(String(document.status))) {
    throw new ConflictError(`当前状态不允许执行 ${command.action}`);
  }
  const expectedVersion = Number(command.payload.versionNo);
  if (
    Number.isFinite(expectedVersion) &&
    expectedVersion > 0 &&
    Number(document.version_no) !== expectedVersion
  ) {
    throw new ConflictError("数据版本已变化，请刷新后重试");
  }
  const rows = relation ? ((document[relation] as JsonRecord[]) ?? []) : [];
  const actorId = actor.userId;
  const source = {
    actorId,
    documentId: command.entityId,
    documentType: command.resource,
  };

  await client.$transaction(async (transaction) => {
    if (command.resource === "inventory-adjustment" && command.action === "execute") {
      await applyAdjustmentExecution(transaction, document, rows, actor, command);
    } else if (command.resource === "transfer" && command.action === "ship") {
      await applyInventoryMovements(
        transaction,
        [
          ...itemMovements(rows, String(document.source_warehouse_id), -1),
          ...itemMovements(rows, String(document.transit_warehouse_id), 1),
        ],
        source,
      );
    } else if (command.resource === "transfer" && command.action === "receive") {
      await applyInventoryMovements(
        transaction,
        [
          ...itemMovements(rows, String(document.transit_warehouse_id), -1),
          ...itemMovements(rows, String(document.destination_warehouse_id), 1),
        ],
        source,
      );
    } else if (command.resource === "cross-border" && command.action === "dispatch") {
      await requireActiveWarehouse(transaction, actor, String(document.source_warehouse_id), {
        field: "sourceWarehouseId",
      });
      await requireActiveWarehouse(transaction, actor, String(document.transit_warehouse_id), {
        field: "transitWarehouseId",
        type: "transit",
      });
      await requireActiveWarehouse(transaction, actor, String(document.destination_warehouse_id), {
        field: "destinationWarehouseId",
        type: "overseas",
      });
      await applyInventoryMovements(
        transaction,
        [
          ...itemMovements(rows, String(document.source_warehouse_id), -1),
          ...itemMovements(rows, String(document.transit_warehouse_id), 1),
        ],
        source,
      );
      for (const row of rows) {
        await transaction.cross_border_shipment_items!.update({
          data: {
            shipped_quantity: Number(row.quantity),
            updated_by: actor.userId,
          },
          where: { id: row.id },
        });
      }
    } else if (command.resource === "outbound" && command.action === "confirm") {
      await applyOutboundConfirmation(transaction, document, rows, actor, command);
    } else if (command.resource === "damage" && command.action === "confirm-outbound") {
      await applyInventoryMovements(
        transaction,
        itemMovements(rows, String(document.warehouse_id), -1),
        source,
      );
    } else if (command.resource === "outbound" && command.action === "reverse") {
      await applyOutboundReverse(transaction, document, rows, actor, command);
    } else if (command.resource === "sales-return" && command.action === "confirm-inbound") {
      await applyInventoryMovements(
        transaction,
        itemMovements(rows, String(document.return_warehouse_id), 1),
        source,
      );
    } else if (command.resource === "stock-count" && command.action === "start") {
      const inventories = await transaction.inventories!.findMany({
        where: { warehouse_id: document.warehouse_id },
      });
      const snapshots = await skuSnapshots(
        transaction,
        inventories.map((inventory) => ({ skuId: inventory.sku_id })),
      );
      await transaction.stock_count_items!.deleteMany({ where: { stock_count_id: document.id } });
      for (const [index, inventory] of inventories.entries()) {
        const snapshot = snapshots.get(String(inventory.sku_id))!;
        await transaction.stock_count_items!.create({
          data: {
            batch_no: null,
            book_quantity: inventory.on_hand_quantity,
            counted_quantity: inventory.on_hand_quantity,
            created_by: actorId,
            difference_quantity: 0,
            final_quantity: inventory.on_hand_quantity,
            line_no: index + 1,
            quantity: inventory.on_hand_quantity,
            sku_code_snapshot: snapshot.sku_code,
            sku_id: inventory.sku_id,
            sku_name_snapshot: snapshot.sku_name,
            specification_snapshot: snapshot.specification,
            stock_count_id: document.id,
            updated_by: actorId,
          },
        });
      }
    }
    const state = ACTION_STATE[command.action];
    if (!state) return;
    const now = new Date();
    const data: JsonRecord = {
      status: state.status,
      updated_by: actorId,
      version_no: { increment: 1 },
      ...(state.approval ? { approval_status: state.approval } : {}),
      ...(command.action === "submit" ? { submitted_at: now, submitted_by: actorId } : {}),
      ...(command.action === "approve" ? { approved_at: now, approved_by: actorId } : {}),
      ...(command.action === "cancel"
        ? {
            cancel_reason: command.payload.reason,
            cancelled_at: now,
            cancelled_by: actorId,
          }
        : {}),
      ...(command.action === "ship" ? { shipped_at: now } : {}),
      ...(command.action === "receive" ? { received_at: now } : {}),
      ...(command.action === "execute" ? { adjusted_at: now } : {}),
      ...(command.action === "start" ? { started_at: now } : {}),
      ...(command.action === "complete" ? { completed_at: now } : {}),
      ...(command.resource === "outbound" && command.action === "confirm"
        ? { outbound_completed_at: now }
        : {}),
      ...(command.resource === "cross-border" && command.action === "dispatch"
        ? { shipment_status: "shipped", status: "shipped" }
        : {}),
    };
    const transitioned = await transaction[model]!.updateMany({
      data,
      where: {
        id: document.id,
        status: document.status,
        version_no: document.version_no,
      },
    });
    if (transitioned.count !== 1) {
      throw new ConflictError("数据版本或状态已变化，请刷新后重试");
    }
    await transaction.document_status_histories!.create({
      data: {
        change_reason: typeof command.payload.reason === "string" ? command.payload.reason : null,
        changed_at: now,
        changed_by: actorId,
        from_status: document.status,
        object_id: document.id,
        object_no_snapshot: document.document_no ?? document.alert_no ?? String(document.id),
        object_type: command.resource,
        remark: null,
        to_status: state.status,
      },
    });
  });
  const updated = await client[model]!.findFirst({
    ...(relation ? { include: { [relation]: true } } : {}),
    where: { id: command.entityId },
  });
  return record(updated!);
}

async function createImportTask(
  client: DynamicClient,
  command: InventoryWorkflowCommand,
  actor: AuthenticatedUser,
): Promise<JsonRecord> {
  const payload = command.payload;
  const importType = stringValue(payload, "importType");
  const warehouseId = optionalString(payload, "warehouseId");
  const storeId = optionalString(payload, "storeId");
  if ((warehouseId === null) === (storeId === null)) {
    throw new ValidationError("warehouseId 与 storeId 必须恰有一个非空");
  }
  if (importType === "overseas_inventory") {
    if (!warehouseId) throw new ValidationError("海外库存导入必须指定海外仓");
    await requireActiveWarehouse(client, actor, warehouseId, {
      field: "warehouseId",
      type: "overseas",
    });
  } else if (warehouseId) {
    await requireActiveWarehouse(client, actor, warehouseId, { field: "warehouseId" });
  }
  if (storeId) await requireActiveStore(client, actor, storeId);

  const checksum = sha256Hex(payload.fileChecksum ?? payload.fileContent ?? payload.rows);
  const duplicate = await client.import_tasks!.findFirst({
    where: {
      file_checksum: checksum,
      import_type: importType,
      ...(warehouseId ? { warehouse_id: warehouseId } : { store_id: storeId }),
    },
  });
  if (duplicate) throw new ConflictError("重复文件、导入类型和目标范围冲突");

  const rows = importRows(payload);
  return record(
    await client.import_tasks!.create({
      data: {
        completed_at: null,
        created_by: actor.userId,
        error_summary: null,
        failed_rows: 0,
        file_checksum: checksum,
        file_name: stringValue(payload, "fileName"),
        file_reference:
          optionalString(payload, "fileReference") ?? `import://${importType}/${checksum}`,
        import_task_items: {
          create: rows.map((row, index) => ({
            created_by: actor.userId,
            error_code: null,
            error_message: null,
            execution_status: "pending",
            matched_sku_id: typeof row.skuId === "string" ? row.skuId : null,
            matched_warehouse_id: warehouseId,
            processed_at: null,
            raw_data: row,
            result_document_id: null,
            result_document_type: null,
            row_no: index + 1,
            updated_by: actor.userId,
            validation_status: "pending",
          })),
        },
        import_type: importType,
        started_at: null,
        status: "pending_validation",
        store_id: storeId,
        success_rows: 0,
        task_no: documentNo("IMP"),
        total_rows: rows.length,
        updated_by: actor.userId,
        warehouse_id: warehouseId,
        warning_rows: 0,
      },
      include: { import_task_items: { orderBy: { row_no: "asc" } } },
    }),
  );
}

function importRowQuantity(raw: JsonRecord): number {
  return decimal(raw.receivedQuantity ?? raw.quantity, "quantity", false);
}

function importRowShipmentId(raw: JsonRecord): string {
  return (
    optionalString(raw, "crossBorderShipmentId") ??
    optionalString(raw, "shipmentId") ??
    optionalString(raw, "crossBorderShipmentItemId") ??
    ""
  );
}

function importRowShipmentItemId(raw: JsonRecord): string {
  return (
    optionalString(raw, "crossBorderShipmentItemId") ?? optionalString(raw, "shipmentItemId") ?? ""
  );
}

async function validateSingleImportItem(
  client: DynamicClient,
  task: JsonRecord,
  item: JsonRecord,
  actor: AuthenticatedUser,
): Promise<"invalid" | "valid"> {
  const raw = rawRecord(item.raw_data);
  const skuId = stringValue(raw, "skuId");
  const quantity = importRowQuantity(raw);
  const shipmentItemId = importRowShipmentItemId(raw);
  const shipmentId = importRowShipmentId(raw);
  const sku = await client.skus!.findFirst({ where: { id: skuId, is_active: true } });
  if (!sku) throw new ValidationError("SKU 不存在或已停用");
  const targetWarehouseId = String(task.warehouse_id);
  await requireActiveWarehouse(client, actor, targetWarehouseId, {
    field: "warehouseId",
    type: "overseas",
  });
  const shipmentItem = await client.cross_border_shipment_items!.findFirst({
    include: { cross_border_shipments: true },
    where: {
      id: shipmentItemId,
      ...(shipmentId ? { cross_border_shipment_id: shipmentId } : {}),
    },
  });
  if (!shipmentItem) throw new ValidationError("跨境发货明细不存在");
  if (String(shipmentItem.sku_id) !== skuId) throw new ValidationError("导入 SKU 与发货明细不一致");
  if (
    typeof raw.batchNo === "string" &&
    raw.batchNo.trim() &&
    String(shipmentItem.batch_no) !== raw.batchNo.trim()
  ) {
    throw new ValidationError("导入批次与发货明细不一致");
  }
  const shipment = shipmentItem.cross_border_shipments as JsonRecord | undefined;
  if (!shipment) throw new ValidationError("跨境发货单不存在");
  if (String(shipment.destination_warehouse_id) !== targetWarehouseId) {
    throw new ValidationError("导入目标海外仓与跨境发货目的仓不一致");
  }
  const transitInventory = await client.inventories!.findFirst({
    where: {
      sku_id: skuId,
      warehouse_id: shipment.transit_warehouse_id,
    },
  });
  if (
    !transitInventory ||
    Number(transitInventory.available_quantity ?? 0) < quantity ||
    Number(transitInventory.on_hand_quantity ?? 0) < quantity
  ) {
    throw new ConflictError("在途库存不足");
  }
  const shipped = Number(shipmentItem.shipped_quantity ?? shipmentItem.quantity ?? 0);
  const difference = Math.max(0, shipped - quantity);
  await client.shipment_import_matches!.upsert({
    create: {
      created_by: actor.userId,
      cross_border_shipment_id: shipmentItem.cross_border_shipment_id,
      cross_border_shipment_item_id: shipmentItem.id,
      difference_quantity: difference,
      import_task_id: task.id,
      import_task_item_id: item.id,
      match_status: difference === 0 ? "matched" : "partially_matched",
      matched_at: new Date(),
      matched_by: actor.userId,
      matched_quantity: quantity,
      received_quantity: quantity,
      remark: typeof raw.remark === "string" ? raw.remark : null,
      updated_by: actor.userId,
    },
    update: {
      difference_quantity: difference,
      match_status: difference === 0 ? "matched" : "partially_matched",
      matched_at: new Date(),
      matched_by: actor.userId,
      matched_quantity: quantity,
      received_quantity: quantity,
      updated_by: actor.userId,
    },
    where: {
      cross_border_shipment_item_id_import_task_item_id: {
        cross_border_shipment_item_id: shipmentItem.id,
        import_task_item_id: item.id,
      },
    },
  });
  await client.import_task_items!.update({
    data: {
      error_code: null,
      error_message: null,
      matched_sku_id: skuId,
      matched_warehouse_id: targetWarehouseId,
      updated_by: actor.userId,
      validation_status: "valid",
    },
    where: { id: item.id },
  });
  return "valid";
}

async function validateImportTask(
  client: DynamicClient,
  command: InventoryWorkflowCommand,
  actor: AuthenticatedUser,
): Promise<JsonRecord> {
  if (!command.entityId) throw new NotFoundError();
  const task = await client.import_tasks!.findFirst({
    include: { import_task_items: { orderBy: { row_no: "asc" } } },
    where: { id: command.entityId },
  });
  if (!task) throw new NotFoundError();
  if (
    !["pending_validation", "validation_failed", "pending_confirmation"].includes(
      String(task.status),
    )
  ) {
    throw new ConflictError("当前导入任务状态不允许校验");
  }
  const items = ((task.import_task_items as JsonRecord[]) ?? []) as JsonRecord[];
  if (items.length === 0) throw new ValidationError("导入任务没有可校验明细");
  let failedRows = 0;
  for (const item of items) {
    try {
      await validateSingleImportItem(client, task, item, actor);
    } catch (error) {
      failedRows += 1;
      const message = error instanceof Error ? error.message : "行校验失败";
      await client.import_task_items!.update({
        data: {
          error_code: "VALIDATION_IMPORT_ROW_INVALID",
          error_message: message,
          execution_status: "skipped",
          updated_by: actor.userId,
          validation_status: "invalid",
        },
        where: { id: item.id },
      });
    }
  }
  const status = failedRows > 0 ? "validation_failed" : "pending_confirmation";
  return record(
    await client.import_tasks!.update({
      data: {
        error_summary: failedRows > 0 ? `${failedRows} 行校验失败` : null,
        failed_rows: failedRows,
        status,
        success_rows: 0,
        total_rows: items.length,
        updated_by: actor.userId,
        warning_rows: 0,
      },
      where: { id: task.id },
    }),
  );
}

async function executeImportTask(
  client: DynamicClient,
  command: InventoryWorkflowCommand,
  actor: AuthenticatedUser,
  retryOnly: boolean,
): Promise<JsonRecord> {
  if (!command.entityId) throw new NotFoundError();
  const task = await client.import_tasks!.findFirst({
    include: { import_task_items: { orderBy: { row_no: "asc" } } },
    where: { id: command.entityId },
  });
  if (!task) throw new NotFoundError();
  if (task.status === "succeeded") return record(task);
  const allowed = retryOnly ? ["partially_succeeded", "failed"] : ["pending_confirmation"];
  if (!allowed.includes(String(task.status))) throw new ConflictError("当前导入任务状态不允许执行");
  const allItems = ((task.import_task_items as JsonRecord[]) ?? []) as JsonRecord[];
  const executableItems = allItems.filter(
    (item) =>
      ["valid", "warning"].includes(String(item.validation_status)) &&
      (retryOnly
        ? String(item.execution_status) === "failed"
        : String(item.execution_status) === "pending"),
  );
  if (executableItems.length === 0) throw new ValidationError("没有可执行导入明细");
  await client.$transaction(async (transaction) => {
    const claimed = await transaction.import_tasks!.updateMany({
      data: { started_at: new Date(), status: "importing", updated_by: actor.userId },
      where: { id: task.id, status: { in: allowed } },
    });
    if (claimed.count !== 1) throw new ConflictError("导入任务已由其他请求处理");
    for (const item of executableItems) {
      const match = await transaction.shipment_import_matches!.findFirst({
        where: { import_task_item_id: item.id },
      });
      if (!match) throw new ValidationError("导入明细未完成来源匹配");
      const shipmentItem = await transaction.cross_border_shipment_items!.findFirst({
        include: { cross_border_shipments: true },
        where: { id: match.cross_border_shipment_item_id },
      });
      if (!shipmentItem) throw new ValidationError("跨境发货明细不存在");
      const shipment = shipmentItem.cross_border_shipments as JsonRecord | undefined;
      if (!shipment) throw new ValidationError("跨境发货单不存在");
      const quantity = Number(match.received_quantity);
      await applyInventoryMovements(
        transaction,
        [
          {
            batchNo: typeof shipmentItem.batch_no === "string" ? shipmentItem.batch_no : null,
            delta: -quantity,
            itemId: String(item.id),
            skuId: String(shipmentItem.sku_id),
            unitCost: shipmentItem.unit_cost === null ? null : Number(shipmentItem.unit_cost ?? 0),
            warehouseId: String(shipment.transit_warehouse_id),
          },
          {
            batchNo: typeof shipmentItem.batch_no === "string" ? shipmentItem.batch_no : null,
            delta: quantity,
            itemId: String(item.id),
            skuId: String(shipmentItem.sku_id),
            unitCost: shipmentItem.unit_cost === null ? null : Number(shipmentItem.unit_cost ?? 0),
            warehouseId: String(task.warehouse_id),
          },
        ],
        {
          actorId: actor.userId,
          documentId: String(task.id),
          documentType: "overseas_import",
          ...(typeof command.payload.remark === "string" ? { remark: command.payload.remark } : {}),
        },
      );
      const receivedAfter = Number(shipmentItem.received_quantity ?? 0) + quantity;
      const shippedQuantity = Number(shipmentItem.shipped_quantity ?? shipmentItem.quantity ?? 0);
      await transaction.cross_border_shipment_items!.update({
        data: {
          difference_quantity: Math.max(0, shippedQuantity - receivedAfter),
          received_quantity: receivedAfter,
          updated_by: actor.userId,
        },
        where: { id: shipmentItem.id },
      });
      await transaction.shipment_import_matches!.update({
        data: {
          match_status:
            Math.max(0, shippedQuantity - receivedAfter) === 0 ? "matched" : "partially_matched",
          matched_at: new Date(),
          matched_by: actor.userId,
          updated_by: actor.userId,
        },
        where: { id: match.id },
      });
      await transaction.import_task_items!.update({
        data: {
          error_code: null,
          error_message: null,
          execution_status: "succeeded",
          processed_at: new Date(),
          result_document_id: task.id,
          result_document_type: "overseas_import",
          updated_by: actor.userId,
        },
        where: { id: item.id },
      });
    }
    const finalItems = await transaction.import_task_items!.findMany({
      where: { import_task_id: task.id },
    });
    const successRows = finalItems.filter((item) => item.execution_status === "succeeded").length;
    const failedRows = finalItems.filter((item) =>
      ["failed", "skipped"].includes(String(item.execution_status)),
    ).length;
    const finalStatus =
      successRows === finalItems.length
        ? "succeeded"
        : successRows > 0
          ? "partially_succeeded"
          : "failed";
    await transaction.import_tasks!.update({
      data: {
        completed_at: new Date(),
        error_summary: failedRows > 0 ? `${failedRows} 行未成功执行` : null,
        failed_rows: failedRows,
        status: finalStatus,
        success_rows: successRows,
        total_rows: finalItems.length,
        updated_by: actor.userId,
      },
      where: { id: task.id },
    });
  });
  return record(
    (await client.import_tasks!.findFirst({
      include: { import_task_items: { orderBy: { row_no: "asc" } } },
      where: { id: command.entityId },
    }))!,
  );
}

async function cancelImportTask(
  client: DynamicClient,
  command: InventoryWorkflowCommand,
  actor: AuthenticatedUser,
): Promise<JsonRecord> {
  if (!command.entityId) throw new NotFoundError();
  const task = await client.import_tasks!.findFirst({ where: { id: command.entityId } });
  if (!task) throw new NotFoundError();
  if (
    !["pending_validation", "validation_failed", "pending_confirmation"].includes(
      String(task.status),
    )
  ) {
    throw new ConflictError("当前导入任务状态不允许取消");
  }
  return record(
    await client.import_tasks!.update({
      data: {
        completed_at: new Date(),
        error_summary: typeof command.payload.reason === "string" ? command.payload.reason : null,
        status: "cancelled",
        updated_by: actor.userId,
      },
      where: { id: task.id },
    }),
  );
}

async function specialRead(
  client: DynamicClient,
  command: InventoryWorkflowCommand,
  actor: AuthenticatedUser,
): Promise<JsonRecord | null> {
  if (command.action === "summary") {
    if (command.resource === "overseas-inventory") {
      if (command.query.get("view") === "replenishment") {
        return replenishmentSuggestion(client, command, actor);
      }
      return overseasInventorySummary(client, command, actor);
    }
    const where = listWhere(command, actor);
    const rows = await client.inventories!.findMany({ where });
    return {
      availableQuantity: rows.reduce((sum, row) => sum + Number(row.available_quantity), 0),
      inventoryCount: rows.length,
      onHandQuantity: rows.reduce((sum, row) => sum + Number(row.on_hand_quantity), 0),
      pendingQuantity: rows.reduce((sum, row) => sum + Number(row.pending_quantity), 0),
      reservedQuantity: rows.reduce((sum, row) => sum + Number(row.reserved_quantity), 0),
    };
  }
  if (command.action === "by-warehouse" || command.action === "manufacturer-warehouses") {
    const rows = await client.inventories!.findMany({
      include: { warehouses: true },
      where: {
        ...listWhere(command, actor),
        ...(command.action === "manufacturer-warehouses"
          ? { warehouses: { warehouse_type: "manufacturer" } }
          : {}),
      },
    });
    const groups = new Map<string, { inventoryCount: number; onHandQuantity: number }>();
    for (const row of rows) {
      const id = String(row.warehouse_id);
      const current = groups.get(id) ?? { inventoryCount: 0, onHandQuantity: 0 };
      current.inventoryCount += 1;
      current.onHandQuantity += Number(row.on_hand_quantity);
      groups.set(id, current);
    }
    return {
      items: [...groups.entries()].map(([warehouseId, totals]) => ({ warehouseId, ...totals })),
    };
  }
  if (command.action === "history") {
    const rows = await client.document_status_histories!.findMany({
      orderBy: { created_at: "asc" },
      where: { object_id: command.entityId, object_type: command.resource },
    });
    return { items: rows.map(record) };
  }
  if (command.action === "transactions") {
    const rows = await client.inventory_transactions!.findMany({
      orderBy: { transaction_at: "asc" },
      where: { source_document_id: command.entityId },
    });
    return { items: rows.map(record) };
  }
  if (command.action === "differences") {
    const rows = await client.stock_count_items!.findMany({
      where: { difference_quantity: { not: 0 }, stock_count_id: command.entityId },
    });
    return { items: rows.map(record) };
  }
  if (command.action === "eligible-items") {
    const outboundOrderId = command.query.get("outboundOrderId");
    if (!outboundOrderId) throw new ValidationError("outboundOrderId 不能为空");
    const rows = await client.outbound_order_items!.findMany({
      where: { outbound_order_id: outboundOrderId },
    });
    return { items: rows.map(record) };
  }
  if (command.action === "import-matches") {
    const rows = await client.shipment_import_matches!.findMany({
      where: { cross_border_shipment_id: command.entityId },
    });
    return { items: rows.map(record) };
  }
  if (command.action === "items" && command.resource === "overseas-import") {
    const rows = await client.import_task_items!.findMany({
      where: { import_task_id: command.entityId },
    });
    return { items: rows.map(record) };
  }
  if (command.action === "status" && command.resource === "overseas-import") {
    const task = await client.import_tasks!.findFirst({ where: { id: command.entityId } });
    if (!task) throw new NotFoundError();
    return {
      completedAt: normalize(task.completed_at),
      failedRows: task.failed_rows,
      id: task.id,
      startedAt: normalize(task.started_at),
      status: task.status,
      successRows: task.success_rows,
      taskNo: task.task_no,
      totalRows: task.total_rows,
      warningRows: task.warning_rows,
    };
  }
  if (
    ["validation-results", "results"].includes(command.action) &&
    command.resource === "overseas-import"
  ) {
    const task = await client.import_tasks!.findFirst({ where: { id: command.entityId } });
    if (!task) throw new NotFoundError();
    const rows = await client.import_task_items!.findMany({
      orderBy: { row_no: "asc" },
      where: { import_task_id: command.entityId },
    });
    return { items: rows.map(record), task: record(task) };
  }
  if (command.action === "import-history" && command.resource === "overseas-import") {
    const rows = await client.import_tasks!.findMany({
      orderBy: { created_at: "desc" },
      where: listWhere(command, actor),
    });
    return { items: rows.map(record) };
  }
  if (command.action === "template" && command.resource === "overseas-import") {
    return {
      importType: "overseas_inventory",
      requiredColumns: ["skuId", "quantity", "crossBorderShipmentId", "crossBorderShipmentItemId"],
      templateVersion: "v1",
    };
  }
  if (command.action === "template-versions" && command.resource === "overseas-import") {
    return { items: [{ importType: "overseas_inventory", status: "active", version: "v1" }] };
  }
  if (command.action === "template-validate" && command.resource === "overseas-import") {
    return {
      compatible: command.payload.templateVersion === "v1",
      importType: "overseas_inventory",
    };
  }
  if (command.action === "source-trace") {
    const inventory = await client.inventories!.findFirst({
      where: {
        AND: [
          { id: command.entityId },
          warehouseScope(actor, "overseas-inventory"),
          { warehouses: { warehouse_type: "overseas" } },
        ],
      },
    });
    if (!inventory) throw new NotFoundError();
    const rows = await client.inventory_transactions!.findMany({
      orderBy: { transaction_at: "asc" },
      where: { sku_id: inventory.sku_id, warehouse_id: inventory.warehouse_id },
    });
    const importTaskIds = unique(
      rows
        .filter((row) => row.source_document_type === "overseas_import")
        .map((row) => row.source_document_id),
    );
    const importTasks =
      importTaskIds.length > 0
        ? await client.import_tasks!.findMany({
            include: { stores: { include: { ecommerce_platforms: true } }, warehouses: true },
            where: { id: { in: importTaskIds } },
          })
        : [];
    const importTaskItems =
      importTaskIds.length > 0
        ? await client.import_task_items!.findMany({
            orderBy: { row_no: "asc" },
            where: { import_task_id: { in: importTaskIds } },
          })
        : [];
    const importTaskItemIds = unique(importTaskItems.map((item) => item.id));
    const matches =
      importTaskIds.length > 0
        ? await client.shipment_import_matches!.findMany({
            where: {
              OR: [
                { import_task_id: { in: importTaskIds } },
                ...(importTaskItemIds.length > 0
                  ? [{ import_task_item_id: { in: importTaskItemIds } }]
                  : []),
              ],
            },
          })
        : [];
    const shipmentIds = unique(matches.map((match) => match.cross_border_shipment_id));
    const shipmentItemIds = unique(matches.map((match) => match.cross_border_shipment_item_id));
    const shipments =
      shipmentIds.length > 0
        ? await client.cross_border_shipments!.findMany({
            where: { id: { in: shipmentIds } },
          })
        : [];
    const shipmentItems =
      shipmentItemIds.length > 0
        ? await client.cross_border_shipment_items!.findMany({
            where: { id: { in: shipmentItemIds } },
          })
        : [];
    return {
      crossBorderShipmentItems: shipmentItems.map(record),
      crossBorderShipments: shipments.map(record),
      importTaskItems: importTaskItems.map(record),
      importTasks: importTasks.map(record),
      inventory: record(inventory),
      shipmentImportMatches: matches.map(record),
      transactions: rows.map(record),
    };
  }
  return null;
}

async function updateDocument(
  client: DynamicClient,
  command: InventoryWorkflowCommand,
  actor: AuthenticatedUser,
): Promise<JsonRecord> {
  const model = MODEL[command.resource];
  if (!model || !command.entityId) throw new NotFoundError();
  const current = await client[model]!.findFirst({ where: { id: command.entityId } });
  if (!current) throw new NotFoundError();
  if (current.status !== "draft") throw new ConflictError("仅草稿状态允许编辑");
  const data = Object.fromEntries(
    Object.entries(command.payload)
      .filter(([key]) => key !== "items" && key !== "versionNo")
      .map(([key, value]) => [
        toSnake(key),
        key.endsWith("Date") && typeof value === "string"
          ? new Date(`${value}T00:00:00.000Z`)
          : value === ""
            ? null
            : value,
      ]),
  );
  return record(
    await client[model]!.update({
      data: { ...data, updated_by: actor.userId, version_no: { increment: 1 } },
      where: { id: command.entityId },
    }),
  );
}

async function confirmPurchaseReturn(
  client: DynamicClient,
  command: InventoryWorkflowCommand,
  actor: AuthenticatedUser,
): Promise<JsonRecord> {
  const document = await client.purchase_returns!.findFirst({
    include: {
      purchase_return_items: {
        include: { inbound_order_items: true },
      },
    },
    where: { id: command.entityId },
  });
  if (!document) throw new NotFoundError();
  if (document.status !== "approved") throw new ConflictError("仅已审批采购退货可确认出库");
  if (Number(document.version_no) !== Number(command.payload.versionNo)) {
    throw new ConflictError("数据版本已变化，请刷新后重试");
  }
  const rows = (document.purchase_return_items as JsonRecord[]) ?? [];
  await client.$transaction(async (transaction) => {
    await applyInventoryMovements(
      transaction,
      rows.map((row) => {
        const source = row.inbound_order_items as JsonRecord | undefined;
        return {
          batchNo: typeof source?.batch_no === "string" ? source.batch_no : null,
          delta: -Number(row.quantity),
          itemId: String(row.id),
          skuId: String(row.sku_id),
          unitCost: source?.unit_cost === undefined ? null : Number(source.unit_cost),
          warehouseId: String(document.return_warehouse_id),
        };
      }),
      {
        actorId: actor.userId,
        documentId: String(document.id),
        documentType: "purchase_return",
      },
    );
    await transaction.purchase_returns!.update({
      data: {
        completed_at: new Date(),
        status: "completed",
        updated_by: actor.userId,
        version_no: { increment: 1 },
      },
      where: { id: document.id },
    });
  });
  return record((await client.purchase_returns!.findFirst({ where: { id: command.entityId } }))!);
}

export class PrismaInventoryWorkflowRepository implements InventoryWorkflowRepository {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async execute(command: InventoryWorkflowCommand, actor: AuthenticatedUser): Promise<unknown> {
    const client = this.prisma as unknown as DynamicClient;
    if (command.action === "confirm-purchase-return") {
      return confirmPurchaseReturn(client, command, actor);
    }
    const special = await specialRead(client, command, actor);
    if (special) return special;
    if (command.resource === "overseas-inventory" && command.action === "list") {
      return overseasInventoryList(client, command, actor);
    }
    if (command.action === "list") return list(client, command, actor);
    if (command.action === "detail") return detail(client, command, actor);
    if (command.resource === "overseas-import" && command.action === "create-import-task") {
      return createImportTask(client, command, actor);
    }
    if (command.action === "create" || command.action.startsWith("create-")) {
      return createDocument(client, command, actor);
    }
    if (command.action === "update") return updateDocument(client, command, actor);
    if (command.resource === "overseas-import" && command.action === "validate-import") {
      return validateImportTask(client, command, actor);
    }
    if (command.resource === "overseas-import" && command.action === "execute-import") {
      return executeImportTask(client, command, actor, false);
    }
    if (command.resource === "overseas-import" && command.action === "retry-failed-items") {
      return executeImportTask(client, command, actor, true);
    }
    if (command.resource === "overseas-import" && command.action === "cancel-import") {
      return cancelImportTask(client, command, actor);
    }
    if (
      command.resource === "inventory-alert" &&
      ["view", "handle", "close"].includes(command.action)
    ) {
      const now = new Date();
      return record(
        await client.inventory_alerts!.update({
          data: {
            alert_status:
              command.action === "close"
                ? "closed"
                : command.action === "handle"
                  ? "handled"
                  : "viewed",
            ...(command.action === "view" ? { viewed_at: now, viewed_by: actor.userId } : {}),
            ...(command.action === "handle"
              ? {
                  handled_at: now,
                  handled_by: actor.userId,
                  handling_result: command.payload.handlingResult,
                }
              : {}),
            ...(command.action === "close" ? { closed_at: now, closed_by: actor.userId } : {}),
            updated_by: actor.userId,
          },
          where: { id: command.entityId },
        }),
      );
    }
    if (command.action === "stock-validation") {
      const rows = sourceItems(command.payload);
      for (const row of rows) {
        const inventory = await client.inventories!.findFirst({
          where: { sku_id: row.skuId, warehouse_id: command.payload.warehouseId },
        });
        if (Number(inventory?.available_quantity ?? 0) < decimal(row.quantity, "quantity")) {
          throw new ConflictError("可用库存不足");
        }
      }
      return { valid: true };
    }
    if (command.action === "export") {
      return {
        exportType: command.resource,
        filters: Object.fromEntries(command.query.entries()),
        status: "accepted",
      };
    }
    if (command.action === "initial-results" || command.action === "recount-results") {
      const rows = sourceItems(command.payload);
      await client.$transaction(async (transaction) => {
        for (const row of rows) {
          const counted = decimal(
            command.action === "initial-results" ? row.countedQuantity : row.recountQuantity,
            command.action === "initial-results" ? "countedQuantity" : "recountQuantity",
          );
          const current = await transaction.stock_count_items!.findFirst({
            where: { id: row.id, stock_count_id: command.entityId },
          });
          if (!current) throw new NotFoundError("盘点明细不存在");
          await transaction.stock_count_items!.update({
            data: {
              ...(command.action === "initial-results"
                ? { counted_quantity: counted }
                : { recount_quantity: counted }),
              difference_quantity: counted - Number(current.book_quantity),
              difference_reason:
                typeof row.differenceReason === "string" ? row.differenceReason : null,
              final_quantity: counted,
              updated_by: actor.userId,
            },
            where: { id: row.id },
          });
        }
      });
      return detail(client, { ...command, action: "detail", mutation: false }, actor);
    }
    return action(client, command, actor);
  }
}
