import type {
  InventoryAccessScope,
  InventoryBalanceRecord,
  InventoryListQuery,
  InventoryListResult,
  InventoryQueryRepository,
  InventoryQuantitySnapshot,
  InventorySummary,
  SkuInventorySummary,
  WarehouseInventorySummary,
} from "@violin-erp/api";
import { getPrismaClient } from "../client.js";
import type { PrismaClient } from "../generated/prisma/client.js";

type JsonRecord = Record<string, unknown>;
type DynamicDelegate = {
  count(args: JsonRecord): Promise<number>;
  findFirst(args: JsonRecord): Promise<JsonRecord | null>;
  findMany(args: JsonRecord): Promise<JsonRecord[]>;
};

type InventoryClient = Pick<PrismaClient, "inventories"> &
  Partial<Pick<PrismaClient, "inventory_transactions">>;

function quantity(value: unknown): string {
  if (value && typeof value === "object" && "toString" in value) return value.toString();
  if (typeof value === "number") return value.toFixed(4);
  if (typeof value === "string") return value;
  return "0.0000";
}

function optionalDate(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return null;
}

function relation(row: JsonRecord, key: string): JsonRecord {
  const value = row[key];
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function quantities(row: JsonRecord): InventoryQuantitySnapshot {
  return {
    availableQuantity: quantity(row.available_quantity),
    onHandQuantity: quantity(row.on_hand_quantity),
    pendingQuantity: quantity(row.pending_quantity),
    reservedQuantity: quantity(row.reserved_quantity),
  };
}

function numberQuantity(value: string): number {
  return Number(value);
}

function sumQuantities(rows: readonly InventoryBalanceRecord[]): InventoryQuantitySnapshot {
  return {
    availableQuantity: rows
      .reduce((sum, item) => sum + numberQuantity(item.availableQuantity), 0)
      .toFixed(4),
    onHandQuantity: rows
      .reduce((sum, item) => sum + numberQuantity(item.onHandQuantity), 0)
      .toFixed(4),
    pendingQuantity: rows
      .reduce((sum, item) => sum + numberQuantity(item.pendingQuantity), 0)
      .toFixed(4),
    reservedQuantity: rows
      .reduce((sum, item) => sum + numberQuantity(item.reservedQuantity), 0)
      .toFixed(4),
  };
}

function derivedStatus(record: InventoryBalanceRecord): string {
  if (Number(record.pendingQuantity) > 0) return "pending";
  if (Number(record.onHandQuantity) === 0) return "zero";
  if (Number(record.availableQuantity) > 0) return "available";
  return "unavailable";
}

function statusCounts(rows: readonly InventoryBalanceRecord[]): InventorySummary["statusCounts"] {
  return rows.reduce<InventorySummary["statusCounts"]>(
    (counts, item) => {
      const status = derivedStatus(item);
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

function summary(
  rows: readonly InventoryBalanceRecord[],
  inventoryAmount?: string,
): InventorySummary {
  return {
    ...sumQuantities(rows),
    inventoryCount: rows.length,
    ...(inventoryAmount === undefined ? {} : { inventoryAmount }),
    statusCounts: statusCounts(rows),
    skuCount: new Set(rows.map((item) => item.sku.id)).size,
    warehouseCount: new Set(rows.map((item) => item.warehouse.id)).size,
  };
}

function toInventoryRecord(row: JsonRecord): InventoryBalanceRecord {
  const sku = relation(row, "skus");
  const warehouse = relation(row, "warehouses");
  const skuId = String(row.sku_id ?? sku.id);
  const warehouseId = String(row.warehouse_id ?? warehouse.id);
  return {
    ...quantities(row),
    id: String(row.id),
    inventoryStatus: "available",
    lastCountedAt: optionalDate(row.last_counted_at),
    lastTransactionAt: optionalDate(row.last_transaction_at),
    recentTransactionsPath: `/api/v1/inventory-transactions?skuId=${skuId}&warehouseId=${warehouseId}`,
    sku: {
      id: skuId,
      ...(typeof sku.product_id === "string" ? { productId: sku.product_id } : {}),
      skuCode: String(sku.sku_code ?? ""),
      skuName: String(sku.sku_name ?? ""),
      specification: typeof sku.specification === "string" ? sku.specification : null,
      ...(typeof sku.unit === "string" ? { unit: sku.unit } : {}),
    },
    warehouse: {
      id: warehouseId,
      warehouseCode: String(warehouse.warehouse_code ?? ""),
      warehouseName: String(warehouse.warehouse_name ?? ""),
      warehouseType: String(warehouse.warehouse_type ?? ""),
    },
  };
}

function inventoryWhere(query: InventoryListQuery, access: InventoryAccessScope): JsonRecord {
  const clauses: JsonRecord[] = [];
  if (access.allowedWarehouseIds !== undefined) {
    clauses.push({ warehouse_id: { in: access.allowedWarehouseIds } });
  }
  if (query.skuId) clauses.push({ sku_id: query.skuId });
  if (query.warehouseId) clauses.push({ warehouse_id: query.warehouseId });
  if (query.warehouseType) clauses.push({ warehouses: { warehouse_type: query.warehouseType } });
  return clauses.length === 0 ? {} : { AND: clauses };
}

function pageRows<T>(rows: readonly T[], query: InventoryListQuery): readonly T[] {
  const start = (query.page - 1) * query.pageSize;
  return rows.slice(start, start + query.pageSize);
}

export class PrismaInventoryQueryRepository implements InventoryQueryRepository {
  readonly #client: InventoryClient;

  constructor(client: InventoryClient = getPrismaClient()) {
    this.#client = client;
  }

  async #records(
    query: InventoryListQuery,
    access: InventoryAccessScope,
  ): Promise<readonly InventoryBalanceRecord[]> {
    const delegate = this.#client.inventories as unknown as DynamicDelegate;
    const rows = (
      await delegate.findMany({
        include: {
          skus: true,
          warehouses: true,
        },
        orderBy: [{ warehouses: { warehouse_code: "asc" } }, { skus: { sku_code: "asc" } }],
        where: inventoryWhere(query, access),
      })
    ).map(toInventoryRecord);
    return query.status ? rows.filter((item) => derivedStatus(item) === query.status) : rows;
  }

  async #inventoryAmount(rows: readonly InventoryBalanceRecord[]): Promise<string | undefined> {
    const delegate = this.#client.inventory_transactions as unknown as DynamicDelegate | undefined;
    if (!delegate) return undefined;
    if (rows.length === 0) return "0.0000";
    const latestRows = await delegate.findMany({
      distinct: ["sku_id", "warehouse_id"],
      orderBy: [
        { sku_id: "asc" },
        { warehouse_id: "asc" },
        { transaction_at: "desc" },
        { created_at: "desc" },
      ],
      where: {
        OR: rows.map((row) => ({
          sku_id: row.sku.id,
          warehouse_id: row.warehouse.id,
        })),
        unit_cost: { not: null },
      },
    });
    const unitCostByInventory = new Map(
      latestRows.map((row) => [
        `${String(row.sku_id)}:${String(row.warehouse_id)}`,
        Number(row.unit_cost),
      ]),
    );
    let amount = 0;
    for (const row of rows) {
      const unitCost = unitCostByInventory.get(`${row.sku.id}:${row.warehouse.id}`);
      if (unitCost === undefined) continue;
      amount += Number(row.onHandQuantity) * unitCost;
    }
    return amount.toFixed(4);
  }

  async list(
    query: InventoryListQuery,
    access: InventoryAccessScope,
  ): Promise<InventoryListResult> {
    const filtered = await this.#records(query, access);
    const items = pageRows(filtered, query);
    return {
      items,
      page: query.page,
      pageSize: query.pageSize,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / query.pageSize),
    };
  }

  async summary(
    query: InventoryListQuery,
    access: InventoryAccessScope,
  ): Promise<InventorySummary> {
    const rows = await this.#records({ ...query, page: 1, pageSize: 100 }, access);
    return summary(rows, await this.#inventoryAmount(rows));
  }

  async detail(id: string, access: InventoryAccessScope): Promise<InventoryBalanceRecord | null> {
    const delegate = this.#client.inventories as unknown as DynamicDelegate;
    const row = await delegate.findFirst({
      include: {
        skus: true,
        warehouses: true,
      },
      where: {
        id,
        ...inventoryWhere({ page: 1, pageSize: 20 }, access),
      },
    });
    return row ? toInventoryRecord(row) : null;
  }

  async summaryBySku(
    skuId: string,
    query: InventoryListQuery,
    access: InventoryAccessScope,
  ): Promise<SkuInventorySummary | null> {
    const rows = await this.#records({ ...query, page: 1, pageSize: 100, skuId }, access);
    if (rows.length === 0) return null;
    return {
      ...summary(rows, await this.#inventoryAmount(rows)),
      sku: rows[0]!.sku,
      warehouses: rows,
    };
  }

  async byWarehouse(
    warehouseId: string,
    query: InventoryListQuery,
    access: InventoryAccessScope,
  ): Promise<WarehouseInventorySummary | null> {
    const rows = await this.#records({ ...query, page: 1, pageSize: 100, warehouseId }, access);
    if (rows.length === 0) return null;
    return {
      ...summary(rows, await this.#inventoryAmount(rows)),
      skuCount: new Set(rows.map((item) => item.sku.id)).size,
      warehouse: rows[0]!.warehouse,
    };
  }
}
