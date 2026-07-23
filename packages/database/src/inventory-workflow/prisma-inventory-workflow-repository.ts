import {
  ConflictError,
  NotFoundError,
  ValidationError,
  type AuthenticatedUser,
  type InventoryWorkflowCommand,
  type InventoryWorkflowPayload,
  type InventoryWorkflowRepository,
} from "@violin-erp/api";
import { randomUUID } from "node:crypto";
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
  if (actor.dataScopes.includes("warehouse")) {
    const scope = {
      role_warehouses: {
        some: {
          roles: {
            user_roles: {
              some: { user_id: actor.userId },
            },
          },
        },
      },
    };
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
  return actor.dataScopes.includes("self_created") ? { created_by: actor.userId } : {};
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
    return record(
      await client.cross_border_shipments!.create({
        data: {
          ...baseDocument(payload, actorId, "CBR"),
          carrier_name: stringValue(payload, "carrierName"),
          departure_date: dateValue(payload, "departureDate"),
          destination_country: stringValue(payload, "destinationCountry"),
          destination_warehouse_id: stringValue(payload, "destinationWarehouseId"),
          estimated_arrival_date: dateValue(payload, "estimatedArrivalDate"),
          production_order_id: stringValue(payload, "productionOrderId", true),
          shipment_batch_no: stringValue(payload, "shipmentBatchNo"),
          shipment_status: "draft",
          source_warehouse_id: stringValue(payload, "sourceWarehouseId"),
          total_quantity: totalQuantity,
          tracking_no: stringValue(payload, "trackingNo"),
          transit_warehouse_id: stringValue(payload, "transitWarehouseId"),
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
          warehouse_id: stringValue(payload, "warehouseId"),
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
    const warehouseId = stringValue(payload, "warehouseId");
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
      const after = direction === "increase" ? before + quantity : before - quantity;
      if (after < 0) throw new ConflictError("库存不足，不能创建该调整单");
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
    const outboundItemIds = rows.map((row) => stringValue(row, "outboundOrderItemId"));
    const outboundRows = await client.outbound_order_items!.findMany({
      where: { id: { in: outboundItemIds } },
    });
    const outboundMap = new Map(outboundRows.map((row) => [String(row.id), row]));
    if (outboundMap.size !== new Set(outboundItemIds).size) {
      throw new ValidationError("退货明细必须引用有效出库明细");
    }
    const itemRows = rows.map((row, index) => {
      const returned = decimal(row.returnedQuantity, "returnedQuantity", false);
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
          outbound_order_id: stringValue(payload, "outboundOrderId"),
          return_date: dateValue(payload, "returnDate"),
          return_reason: stringValue(payload, "returnReason"),
          return_warehouse_id: stringValue(payload, "returnWarehouseId"),
          store_id: stringValue(payload, "storeId"),
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
    const before = Number(current?.on_hand_quantity ?? 0);
    const after = before + movement.delta;
    if (after < 0) throw new ConflictError("可用库存不足");
    await client.inventories!.upsert({
      create: {
        available_quantity: after,
        created_by: source.actorId,
        last_transaction_at: new Date(),
        on_hand_quantity: after,
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
  complete: { status: "completed" },
  dispatch: { status: "dispatched" },
  execute: { status: "executed" },
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
      const warehouseId = String(document.warehouse_id);
      await applyInventoryMovements(
        transaction,
        rows.map((row) => ({
          batchNo: typeof row.batch_no === "string" ? row.batch_no : null,
          delta:
            String(row.adjustment_direction) === "increase"
              ? Number(row.adjustment_quantity)
              : -Number(row.adjustment_quantity),
          itemId: String(row.id),
          skuId: String(row.sku_id),
          unitCost: Number(row.unit_cost),
          warehouseId,
        })),
        source,
      );
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
      await applyInventoryMovements(
        transaction,
        [
          ...itemMovements(rows, String(document.source_warehouse_id), -1),
          ...itemMovements(rows, String(document.transit_warehouse_id), 1),
        ],
        source,
      );
    } else if (
      (command.resource === "outbound" && command.action === "confirm") ||
      (command.resource === "damage" && command.action === "confirm-outbound")
    ) {
      await applyInventoryMovements(
        transaction,
        itemMovements(rows, String(document.warehouse_id), -1),
        source,
      );
    } else if (command.resource === "outbound" && command.action === "reverse") {
      await applyInventoryMovements(
        transaction,
        itemMovements(rows, String(document.warehouse_id), 1),
        source,
      );
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
        ? { shipment_status: "dispatched" }
        : {}),
    };
    await transaction[model]!.update({ data, where: { id: document.id } });
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

async function specialRead(
  client: DynamicClient,
  command: InventoryWorkflowCommand,
  actor: AuthenticatedUser,
): Promise<JsonRecord | null> {
  if (command.action === "summary") {
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
  if (command.action === "source-trace") {
    const inventory = await client.inventories!.findFirst({
      where: { id: command.entityId, ...warehouseScope(actor, "overseas-inventory") },
    });
    if (!inventory) throw new NotFoundError();
    const rows = await client.inventory_transactions!.findMany({
      orderBy: { transaction_at: "asc" },
      where: { sku_id: inventory.sku_id, warehouse_id: inventory.warehouse_id },
    });
    return { inventory: record(inventory), transactions: rows.map(record) };
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
    if (command.action === "list") return list(client, command, actor);
    if (command.action === "detail") return detail(client, command, actor);
    if (command.action === "create" || command.action.startsWith("create-")) {
      return createDocument(client, command, actor);
    }
    if (command.action === "update") return updateDocument(client, command, actor);
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
