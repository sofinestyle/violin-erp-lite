import type {
  SalesAccessScope,
  SalesAggregateRecord,
  SalesDimension,
  SalesListQuery,
  SalesManagementRepository,
  SalesOutboundRecord,
  SalesStatistics,
  SalesViewResult,
} from "@violin-erp/api";
import { getPrismaClient } from "../client.js";
import type { PrismaClient } from "../generated/prisma/client.js";

type JsonRecord = Record<string, unknown>;
type DynamicDelegate = {
  count(args: JsonRecord): Promise<number>;
  findMany(args: JsonRecord): Promise<JsonRecord[]>;
};

type SalesClient = Pick<
  PrismaClient,
  "inventory_transactions" | "outbound_orders" | "sales_returns"
>;

function quantity(value: unknown): string {
  if (value && typeof value === "object" && "toString" in value) return value.toString();
  if (typeof value === "number") return value.toFixed(4);
  if (typeof value === "string") return Number(value).toFixed(4);
  return "0.0000";
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

function rowsRelation(row: JsonRecord, key: string): JsonRecord[] {
  const value = row[key];
  return Array.isArray(value)
    ? (value.filter((item) => item && typeof item === "object") as JsonRecord[])
    : [];
}

function decimal(value: unknown): number {
  if (value && typeof value === "object" && "toString" in value) return Number(value.toString());
  return Number(value ?? 0);
}

function format(value: number): string {
  return value.toFixed(4);
}

function salesWhere(query: SalesListQuery, access: SalesAccessScope): JsonRecord {
  const clauses: JsonRecord[] = [{ outbound_type: "domestic_sales" }, { status: "completed" }];
  if (access.allowedStoreIds !== undefined) {
    clauses.push({ store_id: { in: access.allowedStoreIds } });
  }
  if (access.allowedWarehouseIds !== undefined) {
    clauses.push({ warehouse_id: { in: access.allowedWarehouseIds } });
  }
  if (query.platformId) clauses.push({ platform_id: query.platformId });
  if (query.storeId) clauses.push({ store_id: query.storeId });
  if (query.warehouseId) clauses.push({ warehouse_id: query.warehouseId });
  if (query.dateFrom || query.dateTo) {
    clauses.push({
      outbound_completed_at: {
        ...(query.dateFrom ? { gte: query.dateFrom } : {}),
        ...(query.dateTo ? { lte: query.dateTo } : {}),
      },
    });
  }
  if (query.skuId) {
    clauses.push({ outbound_order_items: { some: { sku_id: query.skuId } } });
  }
  return { AND: clauses };
}

function salesReturnWhere(query: SalesListQuery, access: SalesAccessScope): JsonRecord {
  const clauses: JsonRecord[] = [{ status: "completed" }];
  if (access.allowedStoreIds !== undefined) {
    clauses.push({ store_id: { in: access.allowedStoreIds } });
  }
  if (query.storeId) clauses.push({ store_id: query.storeId });
  if (query.dateFrom || query.dateTo) {
    clauses.push({
      updated_at: {
        ...(query.dateFrom ? { gte: query.dateFrom } : {}),
        ...(query.dateTo ? { lte: query.dateTo } : {}),
      },
    });
  }
  if (query.skuId) clauses.push({ sales_return_items: { some: { sku_id: query.skuId } } });
  return { AND: clauses };
}

function platform(row: JsonRecord): SalesDimension | null {
  const platformRow = relation(row, "ecommerce_platforms");
  if (!platformRow.id) return null;
  return {
    id: String(platformRow.id),
    name: String(platformRow.platform_name ?? ""),
  };
}

function store(row: JsonRecord): SalesDimension | null {
  const storeRow = relation(row, "stores");
  if (!storeRow.id) return null;
  return {
    id: String(storeRow.id),
    name: String(storeRow.store_name ?? ""),
  };
}

function sku(row: JsonRecord): SalesOutboundRecord["sku"] {
  const skuRow = relation(row, "skus");
  return {
    id: String(row.sku_id ?? skuRow.id),
    skuCode: String(row.sku_code_snapshot ?? skuRow.sku_code ?? ""),
    skuName: String(row.sku_name_snapshot ?? skuRow.sku_name ?? ""),
    specification: optionalString(row.specification_snapshot ?? skuRow.specification),
  };
}

function toSalesRows(row: JsonRecord, query: SalesListQuery): SalesOutboundRecord[] {
  const items = rowsRelation(row, "outbound_order_items").filter(
    (item) => !query.skuId || String(item.sku_id) === query.skuId,
  );
  return items.map((item) => ({
    customerName: optionalString(row.customer_name),
    documentDate: date(row.document_date),
    documentNo: String(row.document_no),
    externalOrderNo: optionalString(row.external_order_no),
    id: String(row.id),
    platform: platform(row),
    sku: sku(item),
    soldQuantity: quantity(item.quantity),
    store: store(row),
    warehouseId: String(row.warehouse_id),
  }));
}

function pageRows<T>(rows: readonly T[], query: SalesListQuery): readonly T[] {
  const start = (query.page - 1) * query.pageSize;
  return rows.slice(start, start + query.pageSize);
}

type MutableAggregate = {
  amount: number;
  cost: number;
  platform?: SalesAggregateRecord["platform"];
  returnQuantity: number;
  sku?: SalesAggregateRecord["sku"];
  soldQuantity: number;
  store?: SalesAggregateRecord["store"];
  transactionQuantity: number;
};

function aggregateRecord(value: MutableAggregate): SalesAggregateRecord {
  return {
    amount: format(value.amount),
    cost: format(value.cost),
    ...(value.platform !== undefined ? { platform: value.platform } : {}),
    returnQuantity: format(value.returnQuantity),
    ...(value.sku !== undefined ? { sku: value.sku } : {}),
    soldQuantity: format(value.soldQuantity),
    ...(value.store !== undefined ? { store: value.store } : {}),
    transactionQuantity: format(value.transactionQuantity),
  };
}

function add(
  groups: Map<string, MutableAggregate>,
  key: string,
  base: Omit<
    MutableAggregate,
    "amount" | "cost" | "returnQuantity" | "soldQuantity" | "transactionQuantity"
  >,
  delta: Readonly<{
    amount?: number;
    cost?: number;
    returnQuantity?: number;
    soldQuantity?: number;
    transactionQuantity?: number;
  }>,
): void {
  const current = groups.get(key) ?? {
    ...base,
    amount: 0,
    cost: 0,
    returnQuantity: 0,
    soldQuantity: 0,
    transactionQuantity: 0,
  };
  current.amount += delta.amount ?? 0;
  current.cost += delta.cost ?? 0;
  current.returnQuantity += delta.returnQuantity ?? 0;
  current.soldQuantity += delta.soldQuantity ?? 0;
  current.transactionQuantity += delta.transactionQuantity ?? 0;
  groups.set(key, current);
}

function sorted(records: Iterable<MutableAggregate>): SalesAggregateRecord[] {
  return [...records]
    .sort((left, right) => right.soldQuantity - left.soldQuantity)
    .map(aggregateRecord);
}

export class PrismaSalesManagementRepository implements SalesManagementRepository {
  readonly #client: SalesClient;

  constructor(client: SalesClient = getPrismaClient()) {
    this.#client = client;
  }

  async #outboundRows(query: SalesListQuery, access: SalesAccessScope): Promise<JsonRecord[]> {
    const delegate = this.#client.outbound_orders as unknown as DynamicDelegate;
    return delegate.findMany({
      include: {
        ecommerce_platforms: true,
        outbound_order_items: {
          include: { skus: true },
          orderBy: { line_no: "asc" },
        },
        stores: true,
      },
      orderBy: [{ outbound_completed_at: "desc" }, { updated_at: "desc" }],
      where: salesWhere(query, access),
    });
  }

  async #view(query: SalesListQuery, access: SalesAccessScope): Promise<SalesViewResult> {
    const rows = (await this.#outboundRows(query, access)).flatMap((row) =>
      toSalesRows(row, query),
    );
    const items = pageRows(rows, query);
    return {
      items,
      page: query.page,
      pageSize: query.pageSize,
      total: rows.length,
      totalPages: Math.ceil(rows.length / query.pageSize),
    };
  }

  async platformView(query: SalesListQuery, access: SalesAccessScope): Promise<SalesViewResult> {
    return this.#view(query, access);
  }

  async storeView(query: SalesListQuery, access: SalesAccessScope): Promise<SalesViewResult> {
    return this.#view(query, access);
  }

  async statistics(query: SalesListQuery, access: SalesAccessScope): Promise<SalesStatistics> {
    const outbounds = await this.#outboundRows(query, access);
    const returnDelegate = this.#client.sales_returns as unknown as DynamicDelegate;
    const returns = await returnDelegate.findMany({
      include: {
        sales_return_items: {
          include: { outbound_order_items: true },
          orderBy: { line_no: "asc" },
        },
        stores: true,
      },
      where: salesReturnWhere(query, access),
    });
    const transactionDelegate = this.#client.inventory_transactions as unknown as DynamicDelegate;
    const transactions = await transactionDelegate.findMany({
      where: {
        direction: "out",
        source_document_id: { in: outbounds.map((row) => String(row.id)) },
        source_document_type: "outbound_order",
      },
    });
    const transactionByItem = new Map<string, number>();
    for (const transaction of transactions) {
      const key = String(transaction.source_document_item_id);
      transactionByItem.set(key, (transactionByItem.get(key) ?? 0) + decimal(transaction.quantity));
    }

    const byPlatform = new Map<string, MutableAggregate>();
    const byStore = new Map<string, MutableAggregate>();
    const bySku = new Map<string, MutableAggregate>();
    let totalSold = 0;
    let totalReturns = 0;

    for (const outbound of outbounds) {
      const outboundPlatform = platform(outbound);
      const outboundStore = store(outbound);
      for (const item of rowsRelation(outbound, "outbound_order_items")) {
        if (query.skuId && String(item.sku_id) !== query.skuId) continue;
        const sold = decimal(item.quantity);
        const lineCost = decimal(item.line_cost);
        const transactionQuantity = transactionByItem.get(String(item.id)) ?? 0;
        totalSold += sold;
        add(
          byPlatform,
          String(outboundPlatform?.id ?? "unknown-platform"),
          { platform: outboundPlatform },
          {
            cost: lineCost,
            soldQuantity: sold,
            transactionQuantity,
          },
        );
        add(
          byStore,
          String(outboundStore?.id ?? "unknown-store"),
          { store: outboundStore },
          {
            cost: lineCost,
            soldQuantity: sold,
            transactionQuantity,
          },
        );
        add(
          bySku,
          String(item.sku_id),
          { sku: sku(item) },
          {
            cost: lineCost,
            soldQuantity: sold,
            transactionQuantity,
          },
        );
      }
    }

    for (const salesReturn of returns) {
      const returnStore = store(salesReturn);
      for (const item of rowsRelation(salesReturn, "sales_return_items")) {
        if (query.skuId && String(item.sku_id) !== query.skuId) continue;
        const returned = decimal(item.returned_quantity ?? item.quantity);
        totalReturns += returned;
        const sourceItem = relation(item, "outbound_order_items");
        add(
          byStore,
          String(returnStore?.id ?? "unknown-store"),
          { store: returnStore },
          {
            returnQuantity: returned,
          },
        );
        add(
          bySku,
          String(item.sku_id),
          { sku: sku({ ...item, skus: relation(sourceItem, "skus") }) },
          {
            returnQuantity: returned,
          },
        );
      }
    }

    return {
      netQuantity: format(totalSold - totalReturns),
      platformSales: sorted(byPlatform.values()),
      skuRanking: sorted(bySku.values()),
      storeSales: sorted(byStore.values()),
      totalReturnQuantity: format(totalReturns),
      totalSoldQuantity: format(totalSold),
    };
  }
}
