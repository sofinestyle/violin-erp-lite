import {
  ConflictError,
  NotFoundError,
  ValidationError,
  type AuthenticatedUser,
  type WorkflowCommand,
  type WorkflowPayload,
  type WorkflowRepository,
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

const SNAKE_BOUNDARY = /_([a-z])/g;
const CAMEL_BOUNDARY = /[A-Z]/g;
const toCamel = (value: string) =>
  value.replace(SNAKE_BOUNDARY, (_, letter: string) => letter.toUpperCase());
const toSnake = (value: string) =>
  value.replace(CAMEL_BOUNDARY, (letter) => `_${letter.toLowerCase()}`);

function normalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object" && "toJSON" in value) {
    const toJSON = (value as { toJSON: () => unknown }).toJSON;
    if (typeof toJSON === "function") return toJSON.call(value);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [toCamel(key), normalize(item)]),
    );
  }
  return value;
}

function record(value: JsonRecord): JsonRecord {
  return normalize(value) as JsonRecord;
}

function decimal(value: unknown, field: string): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new ValidationError(`${field} 必须是非负数`, [{ field, message: "数值无效" }]);
  }
  return parsed;
}

function text(payload: WorkflowPayload, key: string, nullable = false): string | null {
  const value = payload[key];
  if (nullable && (value === null || value === undefined || value === "")) return null;
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError(`${key} 不能为空`, [{ field: key, message: "字符串无效" }]);
  }
  return value.trim();
}

function date(payload: WorkflowPayload, key: string): Date {
  const value = text(payload, key);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf())) {
    throw new ValidationError(`${key} 日期无效`, [{ field: key, message: "日期格式无效" }]);
  }
  return parsed;
}

function items(payload: WorkflowPayload): JsonRecord[] {
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
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replaceAll("-", "");
  return `${prefix}-${datePart}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function page(command: WorkflowCommand) {
  const rawPage = Number(command.query.get("page") ?? 1);
  const rawPageSize = Number(command.query.get("pageSize") ?? 20);
  if (
    !Number.isInteger(rawPage) ||
    rawPage < 1 ||
    !Number.isInteger(rawPageSize) ||
    rawPageSize < 1 ||
    rawPageSize > 100
  ) {
    throw new ValidationError("分页参数无效");
  }
  return { page: rawPage, pageSize: rawPageSize };
}

function modelFor(resource: WorkflowCommand["resource"]): string {
  return {
    inbound: "inbound_orders",
    inspection: "inspection_orders",
    production: "production_orders",
    "production-completion": "production_completion_records",
    "production-payment": "production_payments",
    "production-progress": "production_progress_records",
    purchase: "purchase_orders",
    "purchase-payment": "purchase_payments",
  }[resource];
}

function itemRelation(resource: WorkflowCommand["resource"]): string | undefined {
  const relations: Partial<Record<WorkflowCommand["resource"], string>> = {
    inbound: "inbound_order_items",
    inspection: "inspection_order_items",
    production: "production_order_items",
    "production-completion": "production_completion_record_items",
    purchase: "purchase_order_items",
  };
  return relations[resource];
}

function dataScopeWhere(command: WorkflowCommand, actor: AuthenticatedUser): JsonRecord {
  if (actor.dataScopes.includes("all")) return {};
  if (
    (command.resource === "inbound" || command.resource === "inspection") &&
    actor.dataScopes.includes("warehouse")
  ) {
    return {
      warehouses: {
        role_warehouses: {
          some: {
            roles: {
              user_roles: {
                some: { user_id: actor.userId },
              },
            },
          },
        },
      },
    };
  }
  return actor.dataScopes.includes("self_created") ? { created_by: actor.userId } : {};
}

function listWhere(command: WorkflowCommand, actor: AuthenticatedUser): JsonRecord {
  const where: JsonRecord[] = [dataScopeWhere(command, actor)];
  const allowed = [
    "status",
    "approvalStatus",
    "supplierId",
    "manufacturerId",
    "warehouseId",
    "sourceType",
    "sourceDocumentType",
    "inspectionWarehouseId",
  ];
  for (const key of allowed) {
    const value = command.query.get(key);
    if (value) where.push({ [toSnake(key)]: value });
  }
  const documentNoValue = command.query.get("documentNo") ?? command.query.get("keyword");
  if (documentNoValue)
    where.push({ document_no: { contains: documentNoValue, mode: "insensitive" } });
  if (command.parentId) {
    const parentField =
      command.resource === "purchase-payment" ? "purchase_order_id" : "production_order_id";
    where.push({ [parentField]: command.parentId });
  }
  return { AND: where };
}

async function list(
  client: DynamicClient,
  command: WorkflowCommand,
  actor: AuthenticatedUser,
): Promise<JsonRecord> {
  const pagination = page(command);
  const where = listWhere(command, actor);
  const delegate = client[modelFor(command.resource)]!;
  const relation = itemRelation(command.resource);
  const [rows, total] = await Promise.all([
    delegate.findMany({
      ...(relation ? { include: { [relation]: { orderBy: { line_no: "asc" } } } } : {}),
      orderBy: command.resource.endsWith("payment")
        ? { payment_date: "desc" }
        : command.resource === "production-progress"
          ? { progress_date: "desc" }
          : { created_at: "desc" },
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
      where,
    }),
    delegate.count({ where }),
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
  command: WorkflowCommand,
  actor: AuthenticatedUser,
): Promise<JsonRecord> {
  const relation = itemRelation(command.resource);
  const found = await client[modelFor(command.resource)]!.findFirst({
    ...(relation ? { include: { [relation]: { orderBy: { line_no: "asc" } } } } : {}),
    where: { id: command.entityId ?? command.parentId, ...dataScopeWhere(command, actor) },
  });
  if (!found) throw new NotFoundError();
  return record(found);
}

async function skuSnapshots(client: DynamicClient, sourceItems: JsonRecord[]) {
  const ids = sourceItems.map((item) => String(item.skuId));
  const rows = await client.skus!.findMany({
    select: { id: true, sku_code: true, sku_name: true, specification: true },
    where: { id: { in: ids }, is_active: true },
  });
  const map = new Map(rows.map((row) => [String(row.id), row]));
  if (map.size !== new Set(ids).size) throw new ValidationError("明细包含不存在或停用的 SKU");
  return map;
}

function commonItem(
  source: JsonRecord,
  snapshot: JsonRecord,
  lineNo: number,
  actorUserId: string,
): JsonRecord {
  return {
    created_by: actorUserId,
    line_no: lineNo,
    quantity: decimal(
      source.quantity ?? source.plannedQuantity ?? source.inspectedQuantity,
      "quantity",
    ),
    remark: typeof source.remark === "string" ? source.remark : null,
    sku_code_snapshot: snapshot.sku_code,
    sku_id: source.skuId,
    sku_name_snapshot: snapshot.sku_name,
    specification_snapshot: snapshot.specification,
    updated_by: actorUserId,
  };
}

async function createPurchase(client: DynamicClient, payload: WorkflowPayload, actor: string) {
  const sourceItems = items(payload);
  const [supplier, snapshots] = await Promise.all([
    client.suppliers!.findFirst({ where: { id: text(payload, "supplierId"), is_active: true } }),
    skuSnapshots(client, sourceItems),
  ]);
  if (!supplier) throw new ValidationError("供应商不存在或已停用");
  let subtotal = 0;
  let taxTotal = 0;
  let quantityTotal = 0;
  const detailRows = sourceItems.map((item, index) => {
    const quantity = decimal(item.quantity, "quantity");
    const unitPrice = decimal(item.unitPrice, "unitPrice");
    const taxRate = decimal(item.taxRate, "taxRate");
    const lineAmount = quantity * unitPrice;
    const taxAmount = lineAmount * taxRate;
    subtotal += lineAmount;
    taxTotal += taxAmount;
    quantityTotal += quantity;
    return {
      ...commonItem(item, snapshots.get(String(item.skuId))!, index + 1, actor),
      expected_delivery_date: item.expectedDeliveryDate
        ? new Date(`${String(item.expectedDeliveryDate)}T00:00:00.000Z`)
        : null,
      inbound_quantity: 0,
      inspected_quantity: 0,
      line_amount: lineAmount,
      qualified_quantity: 0,
      received_quantity: 0,
      returned_quantity: 0,
      tax_amount: taxAmount,
      tax_rate: taxRate,
      unit_price: unitPrice,
    };
  });
  return client.purchase_orders!.create({
    data: {
      approval_status: "not_submitted",
      created_by: actor,
      currency_code: "CNY",
      document_date: date(payload, "documentDate"),
      document_no: documentNo("PO"),
      expected_delivery_date: date(payload, "expectedDeliveryDate"),
      paid_amount: 0,
      payment_terms_snapshot: text(payload, "paymentTermsSnapshot", true),
      purchase_order_items: { create: detailRows },
      remark: text(payload, "remark", true),
      settlement_method: text(payload, "settlementMethod"),
      status: "draft",
      subtotal_amount: subtotal,
      supplier_code_snapshot: supplier.supplier_code,
      supplier_id: supplier.id,
      supplier_name_snapshot: supplier.supplier_name,
      tax_amount: taxTotal,
      total_amount: subtotal + taxTotal,
      total_quantity: quantityTotal,
      unpaid_amount: subtotal + taxTotal,
      updated_by: actor,
      version_no: 1,
    },
    include: { purchase_order_items: true },
  });
}

async function createProduction(client: DynamicClient, payload: WorkflowPayload, actor: string) {
  if ("purchaseOrderId" in payload) throw new ValidationError("生产单不得引用采购单");
  const sourceItems = items(payload);
  const [manufacturer, snapshots] = await Promise.all([
    client.manufacturers!.findFirst({
      where: { id: text(payload, "manufacturerId"), is_active: true },
    }),
    skuSnapshots(client, sourceItems),
  ]);
  if (!manufacturer) throw new ValidationError("生产厂家不存在或已停用");
  let total = 0;
  let quantityTotal = 0;
  const detailRows = sourceItems.map((item, index) => {
    const quantity = decimal(item.plannedQuantity, "plannedQuantity");
    const price = decimal(item.processingUnitPrice, "processingUnitPrice");
    quantityTotal += quantity;
    total += quantity * price;
    return {
      ...commonItem({ ...item, quantity }, snapshots.get(String(item.skuId))!, index + 1, actor),
      completed_quantity: 0,
      inbound_quantity: 0,
      inspected_quantity: 0,
      line_amount: quantity * price,
      planned_quantity: quantity,
      processing_unit_price: price,
      qualified_quantity: 0,
      shipped_quantity: 0,
    };
  });
  return client.production_orders!.create({
    data: {
      approval_status: "not_submitted",
      completion_percentage: 0,
      created_by: actor,
      currency_code: text(payload, "currencyCode", true) ?? "CNY",
      document_date: date(payload, "documentDate"),
      document_no: documentNo("PRO"),
      expected_completion_date: date(payload, "expectedCompletionDate"),
      manufacturer_code_snapshot: manufacturer.manufacturer_code,
      manufacturer_id: manufacturer.id,
      manufacturer_name_snapshot: manufacturer.manufacturer_name,
      paid_amount: 0,
      planned_start_date: date(payload, "plannedStartDate"),
      production_order_items: { create: detailRows },
      remark: text(payload, "remark", true),
      status: "draft",
      subtotal_amount: total,
      total_amount: total,
      total_quantity: quantityTotal,
      unpaid_amount: total,
      updated_by: actor,
      version_no: 1,
    },
    include: { production_order_items: true },
  });
}

async function createPayment(client: DynamicClient, command: WorkflowCommand, actor: string) {
  const purchase = command.resource === "purchase-payment";
  const orderModel = purchase ? "purchase_orders" : "production_orders";
  const paymentModel = purchase ? "purchase_payments" : "production_payments";
  const order = await client[orderModel]!.findFirst({ where: { id: command.parentId } });
  if (!order) throw new NotFoundError();
  const amount = decimal(command.payload.paymentAmount, "paymentAmount");
  if (amount <= 0 || amount > Number(order.unpaid_amount)) {
    throw new ValidationError("付款金额必须大于 0 且不得超过未付金额");
  }
  return client.$transaction(async (transaction) => {
    const payment = await transaction[paymentModel]!.create({
      data: {
        ...(purchase
          ? {
              attachment_required: command.payload.attachmentRequired === true,
              purchase_order_id: order.id,
              supplier_id: order.supplier_id,
            }
          : { manufacturer_id: order.manufacturer_id, production_order_id: order.id }),
        bank_reference_no: text(command.payload, "bankReferenceNo", true),
        created_by: actor,
        currency_code: order.currency_code,
        payee_account_snapshot: text(command.payload, "payeeAccountSnapshot"),
        payment_amount: amount,
        payment_date: date(command.payload, "paymentDate"),
        payment_method: text(command.payload, "paymentMethod"),
        payment_no: documentNo(purchase ? "PAY-P" : "PAY-M"),
        payment_status: "confirmed",
        remark: text(command.payload, "remark", true),
        updated_by: actor,
      },
    });
    await transaction[orderModel]!.update({
      data: {
        paid_amount: Number(order.paid_amount) + amount,
        unpaid_amount: Number(order.unpaid_amount) - amount,
        updated_by: actor,
      },
      where: { id: order.id },
    });
    return payment;
  });
}

async function createProgress(client: DynamicClient, command: WorkflowCommand, actor: string) {
  const order = await client.production_orders!.findFirst({ where: { id: command.parentId } });
  if (
    !order ||
    !["approved", "in_production", "partially_completed"].includes(String(order.status))
  ) {
    throw new ConflictError("当前生产单状态不允许登记进度");
  }
  return client.production_progress_records!.create({
    data: {
      attachment_required: command.payload.attachmentRequired === true,
      completed_quantity: decimal(command.payload.completedQuantity, "completedQuantity"),
      created_by: actor,
      estimated_completion_date: command.payload.estimatedCompletionDate
        ? date(command.payload, "estimatedCompletionDate")
        : null,
      production_order_id: order.id,
      progress_date: date(command.payload, "progressDate"),
      progress_description: text(command.payload, "progressDescription"),
      progress_percentage: decimal(command.payload.progressPercentage, "progressPercentage"),
      progress_stage: text(command.payload, "progressStage"),
      reported_by_name: text(command.payload, "reportedByName", true),
      updated_by: actor,
    },
  });
}

async function createCompletion(client: DynamicClient, command: WorkflowCommand, actor: string) {
  const order = await client.production_orders!.findFirst({
    include: { production_order_items: true },
    where: { id: command.parentId },
  });
  if (
    !order ||
    !["approved", "in_production", "partially_completed"].includes(String(order.status))
  ) {
    throw new ConflictError("当前生产单状态不允许登记完工");
  }
  if (Number(command.payload.productionOrderVersionNo) !== Number(order.version_no)) {
    throw new ConflictError("生产单版本已变化");
  }
  const sourceItems = items(command.payload);
  const orderItems = new Map(
    (order.production_order_items as JsonRecord[]).map((item) => [String(item.id), item]),
  );
  let total = 0;
  const detailRows = sourceItems.map((item, index) => {
    const source = orderItems.get(String(item.productionOrderItemId));
    if (!source || source.sku_id !== item.skuId)
      throw new ValidationError("完工明细与生产单不一致");
    const completed = decimal(item.completedQuantity, "completedQuantity");
    if (
      completed <= 0 ||
      completed > Number(source.planned_quantity) - Number(source.completed_quantity)
    ) {
      throw new ValidationError("完工数量超过生产单剩余可完工数量");
    }
    total += completed;
    return {
      completed_quantity: completed,
      created_by: actor,
      line_no: index + 1,
      production_order_item_id: source.id,
      sku_code_snapshot: source.sku_code_snapshot,
      sku_id: source.sku_id,
      sku_name_snapshot: source.sku_name_snapshot,
      specification_snapshot: source.specification_snapshot,
      batch_no: text(item, "batchNo", true),
      remark: text(item, "remark", true),
      updated_by: actor,
    };
  });
  return client.production_completion_records!.create({
    data: {
      completion_batch_no: text(command.payload, "completionBatchNo"),
      completion_date: date(command.payload, "completionDate"),
      completion_status: "Draft",
      created_by: actor,
      production_completion_record_items: { create: detailRows },
      production_order_id: order.id,
      remark: text(command.payload, "remark", true),
      total_completed_quantity: total,
      updated_by: actor,
      warehouse_id: text(command.payload, "warehouseId"),
    },
    include: { production_completion_record_items: true },
  });
}

async function createInspection(client: DynamicClient, payload: WorkflowPayload, actor: string) {
  const sourceType = text(payload, "sourceType");
  const sourceModel = sourceType === "purchase" ? "purchase_orders" : "production_orders";
  const sourceId = text(
    payload,
    sourceType === "purchase" ? "purchaseOrderId" : "productionOrderId",
  );
  const source = await client[sourceModel]!.findFirst({ where: { id: sourceId } });
  if (!source) throw new ValidationError("验收来源不存在");
  const sourceItems = items(payload);
  const snapshots = await skuSnapshots(client, sourceItems);
  let inspected = 0;
  let qualified = 0;
  let unqualified = 0;
  const detailRows = sourceItems.map((item, index) => {
    const inspectedQuantity = decimal(item.inspectedQuantity, "inspectedQuantity");
    const qualifiedQuantity = decimal(item.qualifiedQuantity, "qualifiedQuantity");
    const unqualifiedQuantity = decimal(item.unqualifiedQuantity, "unqualifiedQuantity");
    if (inspectedQuantity !== qualifiedQuantity + unqualifiedQuantity) {
      throw new ValidationError("验收数量必须等于合格数量与不合格数量之和");
    }
    inspected += inspectedQuantity;
    qualified += qualifiedQuantity;
    unqualified += unqualifiedQuantity;
    return {
      ...commonItem(
        { ...item, quantity: inspectedQuantity },
        snapshots.get(String(item.skuId))!,
        index + 1,
        actor,
      ),
      defect_category: text(item, "defectCategory", true),
      defect_description: text(item, "defectDescription", true),
      disposition_method: text(item, "dispositionMethod", true),
      inspected_quantity: inspectedQuantity,
      inspection_result: text(item, "inspectionResult"),
      pending_quantity: 0,
      qualified_quantity: qualifiedQuantity,
      source_item_id: text(item, "sourceItemId"),
      unqualified_quantity: unqualifiedQuantity,
    };
  });
  return client.inspection_orders!.create({
    data: {
      approval_status: "not_required",
      created_by: actor,
      document_date: date(payload, "inspectionDate"),
      document_no: documentNo("INS"),
      inspection_date: date(payload, "inspectionDate"),
      inspection_order_items: { create: detailRows },
      inspection_result:
        unqualified === 0 ? "qualified" : qualified === 0 ? "unqualified" : "partially_qualified",
      inspection_warehouse_id: text(payload, "inspectionWarehouseId"),
      inspector_id: text(payload, "inspectorId"),
      production_order_id: sourceType === "production" ? sourceId : null,
      purchase_order_id: sourceType === "purchase" ? sourceId : null,
      remark: text(payload, "remark", true),
      source_type: sourceType,
      status: "draft",
      total_inspected_quantity: inspected,
      total_qualified_quantity: qualified,
      total_unqualified_quantity: unqualified,
      unqualified_disposition: text(payload, "unqualifiedDisposition", true),
      updated_by: actor,
      version_no: 1,
    },
    include: { inspection_order_items: true },
  });
}

async function createInbound(client: DynamicClient, command: WorkflowCommand, actor: string) {
  const purchase = command.action === "create-purchase";
  const sourceModel = purchase ? "purchase_orders" : "production_orders";
  const sourceField = purchase ? "purchaseOrderId" : "productionOrderId";
  const source = await client[sourceModel]!.findFirst({
    where: { id: text(command.payload, sourceField) },
  });
  const inspection = await client.inspection_orders!.findFirst({
    include: { inspection_order_items: true },
    where: {
      id: text(command.payload, "inspectionOrderId"),
      status: "confirmed",
      source_type: purchase ? "purchase" : "production",
    },
  });
  if (!source || !inspection) throw new ValidationError("正式入库必须关联已确认且来源一致的验收单");
  const qualified = new Map(
    (inspection.inspection_order_items as JsonRecord[]).map((item) => [String(item.id), item]),
  );
  const sourceItems = items(command.payload);
  const snapshots = await skuSnapshots(client, sourceItems);
  let total = 0;
  const detailRows = sourceItems.map((item, index) => {
    const inspectionItem = qualified.get(String(item.inspectionOrderItemId));
    const quantity = decimal(item.quantity, "quantity");
    if (
      !inspectionItem ||
      inspectionItem.sku_id !== item.skuId ||
      quantity > Number(inspectionItem.qualified_quantity)
    ) {
      throw new ValidationError("入库明细超过已确认验收合格数量");
    }
    total += quantity;
    const unitCost = decimal(item.unitCost, "unitCost");
    return {
      ...commonItem(item, snapshots.get(String(item.skuId))!, index + 1, actor),
      batch_no: text(item, "batchNo"),
      inspection_order_item_id: inspectionItem.id,
      inventory_condition: text(item, "inventoryCondition"),
      line_cost: quantity * unitCost,
      production_date: item.productionDate
        ? new Date(`${String(item.productionDate)}T00:00:00.000Z`)
        : null,
      source_document_item_id: text(
        item,
        purchase ? "purchaseOrderItemId" : "productionOrderItemId",
      ),
      unit_cost: unitCost,
    };
  });
  return client.inbound_orders!.create({
    data: {
      approval_status: "not_submitted",
      created_by: actor,
      document_date: date(command.payload, "documentDate"),
      document_no: documentNo("INB"),
      inbound_order_items: { create: detailRows },
      inbound_type: purchase ? "purchase" : "production",
      inspection_order_id: inspection.id,
      manufacturer_id: purchase ? null : source.manufacturer_id,
      remark: text(command.payload, "remark", true),
      source_document_id: source.id,
      source_document_type: purchase ? "purchase_order" : "production_order",
      status: "draft",
      supplier_id: purchase ? source.supplier_id : null,
      total_quantity: total,
      updated_by: actor,
      version_no: 1,
      warehouse_id: text(command.payload, "warehouseId"),
    },
    include: { inbound_order_items: true },
  });
}

const transition: Record<string, { from: readonly string[]; status: string; approval?: string }> = {
  approve: { from: ["pending_approval"], status: "approved", approval: "approved" },
  cancel: { from: ["draft"], status: "cancelled" },
  reject: { from: ["pending_approval"], status: "rejected", approval: "rejected" },
  start: { from: ["approved"], status: "in_production" },
  submit: { from: ["draft", "rejected"], status: "pending_approval", approval: "pending" },
  unapprove: { from: ["approved"], status: "draft", approval: "not_submitted" },
  void: { from: ["approved"], status: "voided" },
  withdraw: { from: ["pending_approval"], status: "draft", approval: "not_submitted" },
};

async function action(client: DynamicClient, command: WorkflowCommand, actor: string) {
  const model = modelFor(command.resource);
  const current = await client[model]!.findFirst({ where: { id: command.entityId } });
  if (!current) throw new NotFoundError();
  if (
    command.resource !== "production-completion" &&
    Number(command.payload.versionNo) !== Number(current.version_no)
  ) {
    throw new ConflictError("单据版本已变化");
  }
  if (command.resource === "production-completion") {
    const state = {
      confirm: ["Draft", "Confirmed"],
      revoke: ["Confirmed", "Revoked"],
      void: ["Draft", "Voided"],
    }[command.action];
    if (!state || current.completion_status !== state[0])
      throw new ConflictError("当前完工记录状态不允许此操作");
    const completion = await client[model]!.findFirst({
      include: { production_completion_record_items: true },
      where: { id: current.id },
    });
    const completionItems = (completion?.production_completion_record_items as JsonRecord[]) ?? [];
    return client.$transaction(async (transaction) => {
      const direction = command.action === "revoke" ? -1 : command.action === "confirm" ? 1 : 0;
      for (const item of completionItems) {
        if (direction !== 0) {
          await transaction.production_order_items!.update({
            data: {
              completed_quantity: {
                increment: direction * Number(item.completed_quantity),
              },
              updated_by: actor,
            },
            where: { id: item.production_order_item_id },
          });
        }
      }
      return transaction[model]!.update({
        data: { completion_status: state[1], updated_by: actor },
        where: { id: current.id },
      });
    });
  }
  if (command.resource === "inspection") {
    const state: { from: readonly string[]; to: string } | undefined = {
      confirm: { from: ["pending_confirmation"], to: "confirmed" },
      revoke: { from: ["confirmed"], to: "revoked" },
      submit: { from: ["draft"], to: "pending_confirmation" },
      void: { from: ["draft", "pending_confirmation"], to: "voided" },
    }[command.action];
    if (!state || !state.from.includes(String(current.status)))
      throw new ConflictError("当前验收单状态不允许此操作");
    const inspection = await client.inspection_orders!.findFirst({
      include: { inspection_order_items: true },
      where: { id: current.id },
    });
    const inspectionItems = (inspection?.inspection_order_items as JsonRecord[]) ?? [];
    return client.$transaction(async (transaction) => {
      const direction = command.action === "revoke" ? -1 : command.action === "confirm" ? 1 : 0;
      if (direction !== 0) {
        const sourceModel =
          current.source_type === "purchase" ? "purchase_order_items" : "production_order_items";
        for (const item of inspectionItems) {
          await transaction[sourceModel]!.update({
            data: {
              inspected_quantity: {
                increment: direction * Number(item.inspected_quantity),
              },
              qualified_quantity: {
                increment: direction * Number(item.qualified_quantity),
              },
              updated_by: actor,
            },
            where: { id: item.source_item_id },
          });
        }
      }
      return transaction[model]!.update({
        data: {
          status: state.to,
          updated_by: actor,
          version_no: Number(current.version_no) + 1,
        },
        where: { id: current.id },
      });
    });
  }
  if (command.resource === "inbound" && command.action === "confirm") {
    return confirmInbound(client, current, command.payload, actor);
  }
  if (command.resource === "inbound" && command.action === "reverse") {
    if (current.status !== "completed") throw new ConflictError("仅已完成入库单可冲销");
    return reverseInbound(client, current, actor);
  }
  const rule = transition[command.action];
  if (!rule || !rule.from.includes(String(current.status)))
    throw new ConflictError("当前单据状态不允许此操作");
  if (
    (command.resource === "purchase" || command.resource === "production") &&
    ["unapprove", "void"].includes(command.action)
  ) {
    const sourceField =
      command.resource === "purchase" ? "purchase_order_id" : "production_order_id";
    const sourceType = command.resource === "purchase" ? "purchase_order" : "production_order";
    const [inspections, inbounds] = await Promise.all([
      client.inspection_orders!.count({ where: { [sourceField]: current.id } }),
      client.inbound_orders!.count({
        where: { source_document_id: current.id, source_document_type: sourceType },
      }),
    ]);
    if (inspections > 0 || inbounds > 0) {
      throw new ConflictError("单据已有验收或入库下游，不允许反审核或作废");
    }
  }
  if (command.action === "approve" && current.created_by === actor) {
    throw new ConflictError("制单人与审核人必须分离");
  }
  const now = new Date();
  const data: JsonRecord = {
    ...(rule.approval ? { approval_status: rule.approval } : {}),
    ...(command.action === "approve" ? { approved_at: now, approved_by: actor } : {}),
    ...(command.action === "cancel"
      ? {
          cancelled_at: now,
          cancelled_by: actor,
          cancel_reason: text(command.payload, "reason", true),
        }
      : {}),
    ...(command.action === "submit" ? { submitted_at: now, submitted_by: actor } : {}),
    ...(command.action === "start" ? { actual_start_date: now } : {}),
    status: rule.status,
    updated_by: actor,
    version_no: Number(current.version_no) + 1,
  };
  const updated = await client[model]!.update({ data, where: { id: current.id } });
  await client.document_status_histories!.create({
    data: {
      change_reason: text(command.payload, "reason", true),
      changed_at: now,
      changed_by: actor,
      from_status: current.status,
      object_id: current.id,
      object_no_snapshot: current.document_no,
      object_type: command.resource,
      remark: text(command.payload, "comment", true),
      to_status: rule.status,
    },
  });
  return updated;
}

async function updateDocument(
  client: DynamicClient,
  command: WorkflowCommand,
  actor: string,
): Promise<JsonRecord> {
  const model = modelFor(command.resource);
  const current = await client[model]!.findFirst({ where: { id: command.entityId } });
  if (!current) throw new NotFoundError();
  if (!["draft", "rejected"].includes(String(current.status))) {
    throw new ConflictError("仅草稿或已驳回单据允许编辑");
  }
  const versionNo = Number(command.payload.versionNo);
  if (!Number.isInteger(versionNo) || versionNo !== Number(current.version_no)) {
    throw new ConflictError("单据版本已变化");
  }
  if (command.payload.items !== undefined) {
    throw new ValidationError("明细编辑必须提交已批准的完整明细 DTO，禁止局部覆盖");
  }
  const allowed: Partial<Record<WorkflowCommand["resource"], readonly string[]>> = {
    inbound: ["documentDate", "warehouseId", "remark"],
    inspection: [
      "inspectionDate",
      "inspectionWarehouseId",
      "inspectorId",
      "remark",
      "unqualifiedDisposition",
    ],
    production: [
      "documentDate",
      "manufacturerId",
      "plannedStartDate",
      "expectedCompletionDate",
      "currencyCode",
      "remark",
    ],
    purchase: [
      "documentDate",
      "supplierId",
      "expectedDeliveryDate",
      "settlementMethod",
      "paymentTermsSnapshot",
      "remark",
    ],
  };
  const fields = allowed[command.resource];
  if (!fields) throw new ConflictError("当前资源不支持编辑");
  const data: JsonRecord = { updated_by: actor, version_no: versionNo + 1 };
  for (const field of fields) {
    if (!(field in command.payload)) continue;
    data[toSnake(field)] =
      field.toLowerCase().includes("date") && command.payload[field]
        ? date(command.payload, field)
        : command.payload[field];
  }
  return record(await client[model]!.update({ data, where: { id: current.id } }));
}

async function confirmInbound(
  client: DynamicClient,
  inbound: JsonRecord,
  payload: WorkflowPayload,
  actor: string,
) {
  if (inbound.status !== "approved") throw new ConflictError("仅已审批入库单可确认入库");
  if (Number(payload.versionNo) !== Number(inbound.version_no))
    throw new ConflictError("入库单版本已变化");
  const inboundWithItems = await client.inbound_orders!.findFirst({
    include: { inbound_order_items: true },
    where: { id: inbound.id },
  });
  const rows = (inboundWithItems?.inbound_order_items as JsonRecord[]) ?? [];
  return client.$transaction(async (transaction) => {
    for (const item of rows) {
      const inventory = await transaction.inventories!.upsert({
        create: {
          available_quantity: item.quantity,
          created_by: actor,
          last_transaction_at: new Date(),
          on_hand_quantity: item.quantity,
          pending_quantity: 0,
          reserved_quantity: 0,
          sku_id: item.sku_id,
          updated_by: actor,
          warehouse_id: inbound.warehouse_id,
        },
        update: {
          available_quantity: { increment: item.quantity },
          last_transaction_at: new Date(),
          on_hand_quantity: { increment: item.quantity },
          updated_by: actor,
        },
        where: { sku_id_warehouse_id: { sku_id: item.sku_id, warehouse_id: inbound.warehouse_id } },
      });
      const after = Number(inventory.on_hand_quantity);
      const quantity = Number(item.quantity);
      await transaction.inventory_transactions!.create({
        data: {
          amount: item.line_cost,
          batch_no: item.batch_no,
          direction: "in",
          operator_id: actor,
          quantity,
          quantity_after: after,
          quantity_before: after - quantity,
          sku_id: item.sku_id,
          source_document_id: inbound.id,
          source_document_item_id: item.id,
          source_document_type: "inbound_order",
          transaction_at: new Date(),
          transaction_no: documentNo("ITX"),
          transaction_type: inbound.inbound_type,
          unit_cost: item.unit_cost,
          warehouse_id: inbound.warehouse_id,
        },
      });
      const sourceItemModel =
        inbound.source_document_type === "purchase_order"
          ? "purchase_order_items"
          : "production_order_items";
      await transaction[sourceItemModel]!.update({
        data: {
          inbound_quantity: { increment: quantity },
          updated_by: actor,
        },
        where: { id: item.source_document_item_id },
      });
    }
    return transaction.inbound_orders!.update({
      data: {
        inbound_completed_at: new Date(),
        status: "completed",
        updated_by: actor,
        version_no: Number(inbound.version_no) + 1,
      },
      where: { id: inbound.id },
    });
  });
}

async function reverseInbound(client: DynamicClient, inbound: JsonRecord, actor: string) {
  const rows = await client.inbound_order_items!.findMany({
    where: { inbound_order_id: inbound.id },
  });
  const originalTransactions = await client.inventory_transactions!.findMany({
    where: { source_document_id: inbound.id, source_document_type: "inbound_order" },
  });
  const transactionByItem = new Map(
    originalTransactions.map((item) => [String(item.source_document_item_id), item]),
  );
  return client.$transaction(async (transaction) => {
    for (const item of rows) {
      const inventory = await transaction.inventories!.findFirst({
        where: { sku_id: item.sku_id, warehouse_id: inbound.warehouse_id },
      });
      const quantity = Number(item.quantity);
      if (!inventory || Number(inventory.available_quantity) < quantity) {
        throw new ConflictError("可用库存不足，无法冲销入库");
      }
      const updated = await transaction.inventories!.update({
        data: {
          available_quantity: { decrement: quantity },
          last_transaction_at: new Date(),
          on_hand_quantity: { decrement: quantity },
          updated_by: actor,
        },
        where: { id: inventory.id },
      });
      const original = transactionByItem.get(String(item.id));
      await transaction.inventory_transactions!.create({
        data: {
          amount: -Number(item.line_cost),
          batch_no: item.batch_no,
          direction: "out",
          operator_id: actor,
          quantity,
          quantity_after: updated.on_hand_quantity,
          quantity_before: Number(updated.on_hand_quantity) + quantity,
          related_transaction_id: original?.id,
          sku_id: item.sku_id,
          source_document_id: inbound.id,
          source_document_item_id: item.id,
          source_document_type: "inbound_order",
          transaction_at: new Date(),
          transaction_no: documentNo("ITX-R"),
          transaction_type: `${String(inbound.inbound_type)}_reversal`,
          unit_cost: item.unit_cost,
          warehouse_id: inbound.warehouse_id,
        },
      });
      const sourceItemModel =
        inbound.source_document_type === "purchase_order"
          ? "purchase_order_items"
          : "production_order_items";
      await transaction[sourceItemModel]!.update({
        data: {
          inbound_quantity: { decrement: quantity },
          updated_by: actor,
        },
        where: { id: item.source_document_item_id },
      });
    }
    return transaction.inbound_orders!.update({
      data: {
        status: "reversed",
        updated_by: actor,
        version_no: Number(inbound.version_no) + 1,
      },
      where: { id: inbound.id },
    });
  });
}

async function related(client: DynamicClient, command: WorkflowCommand) {
  if (command.action === "history") {
    return (
      await client.document_status_histories!.findMany({
        orderBy: { created_at: "asc" },
        where: { object_id: command.entityId, object_type: command.resource },
      })
    ).map(record);
  }
  if (command.action === "transactions") {
    return (
      await client.inventory_transactions!.findMany({
        orderBy: { created_at: "asc" },
        where: { source_document_id: command.entityId, source_document_type: "inbound_order" },
      })
    ).map(record);
  }
  if (command.action === "inspections") {
    const field = command.resource === "purchase" ? "purchase_order_id" : "production_order_id";
    return (await client.inspection_orders!.findMany({ where: { [field]: command.entityId } })).map(
      record,
    );
  }
  if (command.action === "inbounds") {
    const type = command.resource === "purchase" ? "purchase_order" : "production_order";
    return (
      await client.inbound_orders!.findMany({
        where: { source_document_id: command.entityId, source_document_type: type },
      })
    ).map(record);
  }
  if (command.action === "progress-summary" || command.action === "progress") {
    const model = modelFor(command.resource);
    const value = await client[model]!.findFirst({ where: { id: command.entityId } });
    if (!value) throw new NotFoundError();
    return record(value);
  }
  if (command.action === "export") {
    return { accepted: true, apiId: command.apiId, exportScope: "current-filter" };
  }
  throw new NotFoundError();
}

export class PrismaWorkflowRepository implements WorkflowRepository {
  private readonly client: DynamicClient;

  constructor(client: PrismaClient = getPrismaClient()) {
    this.client = client as unknown as DynamicClient;
  }

  async execute(command: WorkflowCommand, actor: AuthenticatedUser): Promise<unknown> {
    if (command.action === "list") return list(this.client, command, actor);
    if (command.action === "detail") return detail(this.client, command, actor);
    if (command.action === "create" && command.resource === "purchase") {
      return record(await createPurchase(this.client, command.payload, actor.userId));
    }
    if (command.action === "create" && command.resource === "production") {
      return record(await createProduction(this.client, command.payload, actor.userId));
    }
    if (command.action === "create" && command.resource.endsWith("payment")) {
      return record(await createPayment(this.client, command, actor.userId));
    }
    if (command.action === "create" && command.resource === "production-progress") {
      return record(await createProgress(this.client, command, actor.userId));
    }
    if (command.action === "create" && command.resource === "production-completion") {
      return record(await createCompletion(this.client, command, actor.userId));
    }
    if (command.action === "create" && command.resource === "inspection") {
      return record(await createInspection(this.client, command.payload, actor.userId));
    }
    if (command.action.startsWith("create-") && command.resource === "inbound") {
      return record(await createInbound(this.client, command, actor.userId));
    }
    if (command.action === "update") return updateDocument(this.client, command, actor.userId);
    if (
      [
        "progress",
        "progress-summary",
        "history",
        "inspections",
        "inbounds",
        "transactions",
        "export",
      ].includes(command.action)
    ) {
      return related(this.client, command);
    }
    return record(await action(this.client, command, actor.userId));
  }
}
