import type {
  InventoryAccessScope,
  InventoryTransactionListQuery,
  InventoryTransactionListResult,
  InventoryTransactionRecord,
  InventoryTransactionRepository,
} from "@violin-erp/api";
import { getPrismaClient } from "../client.js";
import type { PrismaClient } from "../generated/prisma/client.js";

type JsonRecord = Record<string, unknown>;
type DynamicDelegate = {
  count(args: JsonRecord): Promise<number>;
  findFirst(args: JsonRecord): Promise<JsonRecord | null>;
  findMany(args: JsonRecord): Promise<JsonRecord[]>;
};

type InventoryTransactionClient = Pick<PrismaClient, "inventory_transactions">;

function quantity(value: unknown): string {
  if (value && typeof value === "object" && "toString" in value) return value.toString();
  if (typeof value === "number") return value.toFixed(4);
  if (typeof value === "string") return value;
  return "0.0000";
}

function optionalQuantity(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return quantity(value);
}

function date(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return new Date(0).toISOString();
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function relation(row: JsonRecord, key: string): JsonRecord {
  const value = row[key];
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function transactionWhere(
  query: Partial<InventoryTransactionListQuery>,
  access: InventoryAccessScope,
  id?: string,
): JsonRecord {
  const clauses: JsonRecord[] = [];
  if (id) clauses.push({ id });
  if (access.allowedWarehouseIds !== undefined) {
    clauses.push({ warehouse_id: { in: access.allowedWarehouseIds } });
  }
  if (query.skuId) clauses.push({ sku_id: query.skuId });
  if (query.warehouseId) clauses.push({ warehouse_id: query.warehouseId });
  if (query.transactionType) clauses.push({ transaction_type: query.transactionType });
  if (query.direction) clauses.push({ direction: query.direction });
  if (query.sourceDocumentType) clauses.push({ source_document_type: query.sourceDocumentType });
  if (query.sourceDocumentId) clauses.push({ source_document_id: query.sourceDocumentId });
  if (query.dateFrom || query.dateTo) {
    clauses.push({
      transaction_at: {
        ...(query.dateFrom ? { gte: query.dateFrom } : {}),
        ...(query.dateTo ? { lte: query.dateTo } : {}),
      },
    });
  }
  return clauses.length === 0 ? {} : { AND: clauses };
}

function toRecord(row: JsonRecord, requestTraceId: string): InventoryTransactionRecord {
  const sku = relation(row, "skus");
  const warehouse = relation(row, "warehouses");
  const operator = relation(row, "users");
  const skuId = String(row.sku_id ?? sku.id);
  const warehouseId = String(row.warehouse_id ?? warehouse.id);
  return {
    amount: optionalQuantity(row.amount),
    batchNo: optionalString(row.batch_no),
    createdAt: date(row.created_at),
    direction: String(row.direction),
    id: String(row.id),
    operator: {
      displayName: optionalString(operator.display_name),
      id: String(row.operator_id ?? operator.id),
      ...(typeof operator.username === "string" ? { username: operator.username } : {}),
    },
    quantity: quantity(row.quantity),
    quantityAfter: quantity(row.quantity_after),
    quantityBefore: quantity(row.quantity_before),
    relatedTransactionId: optionalString(row.related_transaction_id),
    remark: optionalString(row.remark),
    requestTraceId,
    sku: {
      id: skuId,
      ...(typeof sku.product_id === "string" ? { productId: sku.product_id } : {}),
      skuCode: String(sku.sku_code ?? ""),
      skuName: String(sku.sku_name ?? ""),
      specification: optionalString(sku.specification),
      ...(typeof sku.unit === "string" ? { unit: sku.unit } : {}),
    },
    source: {
      sourceDocumentId: String(row.source_document_id),
      sourceDocumentItemId: String(row.source_document_item_id),
      sourceDocumentType: String(row.source_document_type),
    },
    transactionAt: date(row.transaction_at),
    transactionNo: String(row.transaction_no),
    transactionType: String(row.transaction_type),
    unitCost: optionalQuantity(row.unit_cost),
    warehouse: {
      id: warehouseId,
      warehouseCode: String(warehouse.warehouse_code ?? ""),
      warehouseName: String(warehouse.warehouse_name ?? ""),
      warehouseType: String(warehouse.warehouse_type ?? ""),
    },
  };
}

export class PrismaInventoryTransactionRepository implements InventoryTransactionRepository {
  readonly #client: InventoryTransactionClient;

  constructor(client: InventoryTransactionClient = getPrismaClient()) {
    this.#client = client;
  }

  async list(
    query: InventoryTransactionListQuery,
    access: InventoryAccessScope,
  ): Promise<InventoryTransactionListResult> {
    const delegate = this.#client.inventory_transactions as unknown as DynamicDelegate;
    const where = transactionWhere(query, access);
    const [rows, total] = await Promise.all([
      delegate.findMany({
        include: {
          skus: true,
          users: true,
          warehouses: true,
        },
        orderBy: [{ transaction_at: "desc" }, { created_at: "desc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        where,
      }),
      delegate.count({ where }),
    ]);
    return {
      items: rows.map((row) => toRecord(row, access.requestTraceId)),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    };
  }

  async detail(
    id: string,
    access: InventoryAccessScope,
  ): Promise<InventoryTransactionRecord | null> {
    const delegate = this.#client.inventory_transactions as unknown as DynamicDelegate;
    const row = await delegate.findFirst({
      include: {
        skus: true,
        users: true,
        warehouses: true,
      },
      where: transactionWhere({}, access, id),
    });
    return row ? toRecord(row, access.requestTraceId) : null;
  }
}
