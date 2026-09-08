import {
  ConflictError,
  MASTER_DATA_DEFINITIONS,
  ValidationError,
  type AuditWriter,
  type MasterDataListQuery,
  type MasterDataListResult,
  type MasterDataDeleteOutcome,
  type MasterDataDeleteReference,
  type MasterDataRecord,
  type MasterDataRepository,
  type MasterDataResourceKey,
} from "@violin-erp/api";
import type { PrismaClient } from "../generated/prisma/client.js";
import { getPrismaClient } from "../client.js";
import { PrismaAuditWriter } from "../audit/prisma-audit-writer.js";
import {
  CodeGenerationService,
  isAutomaticCodeResource,
} from "../code-generation/code-generation-service.js";

type UnknownRecord = Record<string, unknown>;
type GenericDelegate = Readonly<{
  count: (args: UnknownRecord) => Promise<number>;
  create: (args: UnknownRecord) => Promise<UnknownRecord>;
  deleteMany: (args: UnknownRecord) => Promise<{ count: number }>;
  findFirst: (args: UnknownRecord) => Promise<UnknownRecord | null>;
  findMany: (args: UnknownRecord) => Promise<UnknownRecord[]>;
  updateMany: (args: UnknownRecord) => Promise<{ count: number }>;
}>;

type ReferenceCheck = Readonly<{
  field: string;
  model: string;
}>;

const RESOURCE_MODELS: Readonly<Record<MasterDataResourceKey, string>> = {
  brands: "brands",
  "ecommerce-platforms": "ecommerce_platforms",
  manufacturers: "manufacturers",
  "product-categories": "product_categories",
  products: "products",
  skus: "skus",
  stores: "stores",
  suppliers: "suppliers",
  warehouses: "warehouses",
};

const DELETABLE_RESOURCES = new Set<MasterDataResourceKey>([
  "brands",
  "product-categories",
  "products",
  "skus",
  "suppliers",
  "manufacturers",
  "warehouses",
]);

const REFERENCE_CHECKS: Readonly<Record<MasterDataResourceKey, readonly ReferenceCheck[]>> = {
  brands: [{ model: "products", field: "brand_id" }],
  "ecommerce-platforms": [],
  "product-categories": [
    { model: "product_categories", field: "parent_category_id" },
    { model: "products", field: "category_id" },
  ],
  products: [
    { model: "skus", field: "product_id" },
    { model: "product_manufacturers", field: "product_id" },
    { model: "product_suppliers", field: "product_id" },
  ],
  skus: [
    { model: "inventories", field: "sku_id" },
    { model: "inventory_transactions", field: "sku_id" },
    { model: "purchase_order_items", field: "sku_id" },
    { model: "production_order_items", field: "sku_id" },
    { model: "inspection_order_items", field: "sku_id" },
    { model: "inbound_order_items", field: "sku_id" },
    { model: "outbound_order_items", field: "sku_id" },
    { model: "inventory_adjustment_items", field: "sku_id" },
    { model: "cross_border_shipment_items", field: "sku_id" },
    { model: "sales_return_items", field: "sku_id" },
    { model: "transfer_order_items", field: "sku_id" },
    { model: "stock_count_items", field: "sku_id" },
    { model: "damage_report_items", field: "sku_id" },
    { model: "purchase_return_items", field: "sku_id" },
    { model: "production_completion_record_items", field: "sku_id" },
    { model: "import_task_items", field: "matched_sku_id" },
    { model: "inventory_alerts", field: "sku_id" },
  ],
  suppliers: [
    { model: "purchase_orders", field: "supplier_id" },
    { model: "purchase_payments", field: "supplier_id" },
    { model: "purchase_returns", field: "supplier_id" },
    { model: "inbound_orders", field: "supplier_id" },
    { model: "product_suppliers", field: "supplier_id" },
  ],
  manufacturers: [
    { model: "production_orders", field: "manufacturer_id" },
    { model: "production_payments", field: "manufacturer_id" },
    { model: "inbound_orders", field: "manufacturer_id" },
    { model: "product_manufacturers", field: "manufacturer_id" },
    { model: "warehouses", field: "manufacturer_id" },
  ],
  warehouses: [
    { model: "inventories", field: "warehouse_id" },
    { model: "inventory_transactions", field: "warehouse_id" },
    { model: "inbound_orders", field: "warehouse_id" },
    { model: "inspection_orders", field: "inspection_warehouse_id" },
    { model: "outbound_orders", field: "warehouse_id" },
    { model: "inventory_adjustments", field: "warehouse_id" },
    { model: "cross_border_shipments", field: "source_warehouse_id" },
    { model: "cross_border_shipments", field: "transit_warehouse_id" },
    { model: "cross_border_shipments", field: "destination_warehouse_id" },
    { model: "transfer_orders", field: "source_warehouse_id" },
    { model: "transfer_orders", field: "transit_warehouse_id" },
    { model: "transfer_orders", field: "destination_warehouse_id" },
    { model: "stock_counts", field: "warehouse_id" },
    { model: "damage_reports", field: "warehouse_id" },
    { model: "sales_returns", field: "return_warehouse_id" },
    { model: "purchase_returns", field: "return_warehouse_id" },
    { model: "import_tasks", field: "warehouse_id" },
    { model: "import_task_items", field: "matched_warehouse_id" },
    { model: "inventory_alerts", field: "warehouse_id" },
    { model: "production_completion_records", field: "warehouse_id" },
    { model: "role_warehouses", field: "warehouse_id" },
  ],
  stores: [],
};

const CAMEL_BOUNDARY = /[A-Z]/g;
const SNAKE_BOUNDARY = /_([a-z])/g;

// Labels describe the confirmed first blocking reference, not every possible reference.
const REFERENCE_LABELS: Readonly<Record<string, string>> = {
  products: "产品",
  product_categories: "子分类",
  product_manufacturers: "产品与厂家关联",
  product_suppliers: "产品与供应商关联",
  inventories: "库存记录",
  inventory_transactions: "库存流水记录",
  purchase_orders: "采购订单记录",
  purchase_payments: "采购付款记录",
  purchase_returns: "采购退货记录",
  production_orders: "生产订单记录",
  production_payments: "生产付款记录",
  warehouses: "仓库关联",
  inbound_orders: "入库业务记录",
  role_warehouses: "角色仓库范围关联",
  import_tasks: "导入任务记录",
  import_task_items: "导入匹配记录",
  inventory_alerts: "库存预警记录",
};

function prismaErrorCode(error: unknown): string | undefined {
  return error && typeof error === "object" && "code" in error
    ? String((error as { code: unknown }).code)
    : undefined;
}

function prismaErrorMeta(error: unknown): string {
  if (!error || typeof error !== "object" || !("meta" in error)) return "";
  return JSON.stringify((error as { meta: unknown }).meta).toLowerCase();
}

function uniqueConflictError(error: unknown): ConflictError {
  const meta = prismaErrorMeta(error);
  if (meta.includes("uq_products_product_name_en") || meta.includes("product_name_en")) {
    return new ConflictError("产品型号已存在，请使用其他型号");
  }
  return new ConflictError("基础资料编码或受控唯一值重复");
}

function toSnakeCase(value: string): string {
  return value.replace(CAMEL_BOUNDARY, (letter) => `_${letter.toLowerCase()}`);
}

function toCamelCase(value: string): string {
  return value.replace(SNAKE_BOUNDARY, (_, letter: string) => letter.toUpperCase());
}

function delegate(client: PrismaClient, resource: MasterDataResourceKey): GenericDelegate {
  const delegates = client as unknown as Record<string, GenericDelegate>;
  const modelDelegate = delegates[RESOURCE_MODELS[resource]];
  if (!modelDelegate) throw new Error(`Unsupported Prisma model: ${resource}`);
  return modelDelegate;
}

function modelCounter(client: PrismaClient, modelName: string): GenericDelegate["count"] {
  const delegates = client as unknown as Record<string, GenericDelegate>;
  const modelDelegate = delegates[modelName];
  if (!modelDelegate) throw new Error(`Unsupported Prisma model: ${modelName}`);
  return modelDelegate.count;
}

function isSystemMasterData(
  resource: MasterDataResourceKey,
  record: Readonly<Record<string, unknown>>,
): boolean {
  const code = record[toSnakeCase(MASTER_DATA_DEFINITIONS[resource].codeField)];
  if (typeof code !== "string") return false;
  const normalized = code.trim().toUpperCase();
  return normalized.startsWith("SYS-") || normalized.startsWith("SYSTEM-");
}

async function findBusinessReference(
  client: PrismaClient,
  resource: MasterDataResourceKey,
  id: string,
): Promise<MasterDataDeleteReference | undefined> {
  for (const check of REFERENCE_CHECKS[resource]) {
    const count = await modelCounter(client, check.model)({ where: { [check.field]: id } });
    if (count === 0) continue;
    if (resource === "products" && check.model === "skus") {
      // Two bounded existence queries over all related SKUs. No per-SKU queries,
      // quantities, status filtering, or new deletion preconditions.
      const inventory = await client.skus.findFirst({
        select: { id: true },
        where: { product_id: id, inventories: { some: {} } },
      });
      const history = await client.skus.findFirst({
        select: { id: true },
        where: {
          product_id: id,
          OR: REFERENCE_CHECKS.skus
            .filter((item) => item.model !== "inventories")
            .map((item) => ({ [item.model]: { some: {} } })),
        },
      });
      return { label: "SKU", skuCount: count, hasInventory: !!inventory, hasHistory: !!history };
    }
    return { label: REFERENCE_LABELS[check.model] ?? "历史业务记录" };
  }
  return undefined;
}

function selectFor(resource: MasterDataResourceKey, actorUserId?: string): UnknownRecord {
  const definition = MASTER_DATA_DEFINITIONS[resource];
  const base = Object.fromEntries(
    [
      "id",
      "created_at",
      "created_by",
      "updated_at",
      "updated_by",
      "is_active",
      "disabled_at",
      "disabled_by",
      ...definition.fields.map((field) => toSnakeCase(field.key)),
    ].map((field) => [field, true]),
  );
  if (resource === "products") {
    return {
      ...base,
      _count: { select: { skus: true } },
      brands: { select: { id: true, brand_code: true, brand_name: true } },
      product_categories: {
        select: { id: true, category_code: true, category_name: true },
      },
      product_manufacturers: {
        select: {
          effective_from: true,
          effective_to: true,
          is_active: true,
          is_preferred: true,
          manufacturers: {
            select: { id: true, manufacturer_code: true, manufacturer_name: true },
          },
        },
      },
      product_suppliers: {
        select: {
          effective_from: true,
          effective_to: true,
          is_active: true,
          is_preferred: true,
          suppliers: { select: { id: true, supplier_code: true, supplier_name: true } },
        },
      },
    };
  }
  if (resource === "skus") {
    return {
      ...base,
      products: {
        select: {
          id: true,
          product_code: true,
          product_name: true,
          brands: { select: { id: true, brand_code: true, brand_name: true } },
          product_categories: {
            select: { id: true, category_code: true, category_name: true },
          },
        },
      },
    };
  }
  if (resource === "warehouses") {
    return {
      ...base,
      manufacturers: {
        select: { id: true, manufacturer_code: true, manufacturer_name: true },
      },
      ...(actorUserId
        ? {
            role_warehouses: {
              select: { access_level: true },
              where: {
                roles: { user_roles: { some: activeRoleWhere(actorUserId) } },
              },
            },
          }
        : {}),
    };
  }
  if (resource === "stores") {
    return {
      ...base,
      ecommerce_platforms: {
        select: { id: true, platform_code: true, platform_name: true },
      },
      ...(actorUserId
        ? {
            role_stores: {
              select: { access_level: true },
              where: {
                roles: { user_roles: { some: activeRoleWhere(actorUserId) } },
              },
            },
          }
        : {}),
    };
  }
  return base;
}

function normalizeValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (value && typeof value === "object" && "toJSON" in value) {
    const toJSON = (value as { toJSON: () => unknown }).toJSON;
    if (typeof toJSON === "function") return toJSON.call(value);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [toCamelCase(key), normalizeValue(item)]),
    );
  }
  return value;
}

function toApiRecord(record: UnknownRecord): MasterDataRecord {
  const mapped = Object.fromEntries(
    Object.entries(record).map(([key, value]) => [toCamelCase(key), normalizeValue(value)]),
  );
  if (mapped._count && typeof mapped._count === "object") {
    mapped.skuCount = (mapped._count as Record<string, unknown>).skus;
    delete mapped._count;
  }
  if (mapped.brands) {
    mapped.brand = mapped.brands;
    delete mapped.brands;
  }
  if (mapped.productCategories) {
    mapped.category = mapped.productCategories;
    delete mapped.productCategories;
  }
  if (mapped.products) {
    const product = mapped.products as Record<string, unknown>;
    if (product.brands) {
      product.brand = product.brands;
      delete product.brands;
    }
    if (product.productCategories) {
      product.category = product.productCategories;
      delete product.productCategories;
    }
    mapped.product = product;
    delete mapped.products;
  }
  if (mapped.manufacturers) {
    mapped.manufacturer = mapped.manufacturers;
    delete mapped.manufacturers;
  }
  if (mapped.ecommercePlatforms) {
    mapped.platform = mapped.ecommercePlatforms;
    delete mapped.ecommercePlatforms;
  }
  if (mapped.productSuppliers) {
    mapped.supplierRelations = mapped.productSuppliers;
    delete mapped.productSuppliers;
  }
  if (mapped.productManufacturers) {
    mapped.manufacturerRelations = mapped.productManufacturers;
    delete mapped.productManufacturers;
  }
  for (const relation of ["roleWarehouses", "roleStores"]) {
    if (Array.isArray(mapped[relation])) {
      const rank = { read: 1, operate: 2, manage: 3 } as const;
      const levels = (mapped[relation] as Array<Record<string, unknown>>)
        .map((item) => item.accessLevel)
        .filter((value): value is keyof typeof rank => typeof value === "string" && value in rank);
      mapped.accessLevel = levels.sort((left, right) => rank[right] - rank[left])[0] ?? null;
      delete mapped[relation];
    }
  }
  return mapped as MasterDataRecord;
}

function dataToPrisma(data: Readonly<Record<string, unknown>>): UnknownRecord {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [toSnakeCase(key), value]));
}

function activeRoleWhere(actorUserId: string): UnknownRecord {
  const now = new Date();
  return {
    user_id: actorUserId,
    effective_from: { lte: now },
    OR: [{ effective_to: null }, { effective_to: { gt: now } }],
    roles: { is_active: true },
  };
}

function dataScopeWhere(
  resource: MasterDataResourceKey,
  actorUserId: string,
  minimum: "manage" | "read" = "read",
): UnknownRecord {
  const access =
    minimum === "manage"
      ? { access_level: "manage" }
      : { access_level: { in: ["read", "operate", "manage"] } };
  if (resource === "warehouses") {
    return {
      role_warehouses: {
        some: {
          ...access,
          roles: { user_roles: { some: activeRoleWhere(actorUserId) } },
        },
      },
    };
  }
  if (resource === "stores") {
    return {
      role_stores: {
        some: {
          ...access,
          roles: { user_roles: { some: activeRoleWhere(actorUserId) } },
        },
      },
    };
  }
  return {};
}

function keywordWhere(resource: MasterDataResourceKey, keyword: string): UnknownRecord {
  const definition = MASTER_DATA_DEFINITIONS[resource];
  const fields = [definition.codeField, definition.nameField];
  if (resource === "skus") fields.push("specification");
  if (resource === "suppliers" || resource === "manufacturers") fields.push("shortName");
  return {
    OR: fields.map((field) => ({
      [toSnakeCase(field)]: { contains: keyword, mode: "insensitive" },
    })),
  };
}

function filterWhere(
  resource: MasterDataResourceKey,
  filters: Readonly<Record<string, boolean | string>>,
): UnknownRecord[] {
  const result: UnknownRecord[] = [];
  for (const [key, value] of Object.entries(filters)) {
    if (resource === "skus" && key === "categoryId") {
      result.push({ products: { category_id: value } });
    } else if (resource === "skus" && key === "brandId") {
      result.push({ products: { brand_id: value } });
    } else {
      result.push({ [toSnakeCase(key)]: value });
    }
  }
  return result;
}

function buildWhere(
  resource: MasterDataResourceKey,
  actorUserId: string,
  query: MasterDataListQuery,
): UnknownRecord {
  const conditions: UnknownRecord[] = [
    dataScopeWhere(resource, actorUserId),
    ...filterWhere(resource, query.filters),
  ];
  if (query.keyword) conditions.push(keywordWhere(resource, query.keyword));
  if (query.isActive !== undefined) conditions.push({ is_active: query.isActive });
  return { AND: conditions };
}

async function validateActiveRelations(
  client: PrismaClient,
  resource: MasterDataResourceKey,
  data: Readonly<Record<string, unknown>>,
): Promise<void> {
  const active = async (
    model: "brands" | "ecommerce_platforms" | "manufacturers" | "product_categories" | "products",
    id: unknown,
  ) => {
    if (typeof id !== "string") return true;
    const models = client as unknown as Record<
      string,
      { count: (args: UnknownRecord) => Promise<number> }
    >;
    return (await models[model]!.count({ where: { id, is_active: true } })) === 1;
  };
  const checks: Promise<boolean>[] = [];
  if (resource === "products") {
    checks.push(active("brands", data.brandId), active("product_categories", data.categoryId));
  } else if (resource === "skus") {
    checks.push(active("products", data.productId));
  } else if (resource === "product-categories" && data.parentCategoryId !== null) {
    checks.push(active("product_categories", data.parentCategoryId));
  } else if (resource === "warehouses" && data.manufacturerId !== null) {
    checks.push(active("manufacturers", data.manufacturerId));
  } else if (resource === "stores") {
    checks.push(active("ecommerce_platforms", data.platformId));
  }
  if ((await Promise.all(checks)).some((valid) => !valid)) {
    throw new ValidationError("引用的基础资料不存在或已停用");
  }
}

export class PrismaMasterDataRepository implements MasterDataRepository {
  readonly #client: PrismaClient;
  readonly #codeGeneration: CodeGenerationService;

  constructor(
    client: PrismaClient = getPrismaClient(),
    codeGeneration: CodeGenerationService = new CodeGenerationService(),
  ) {
    this.#client = client;
    this.#codeGeneration = codeGeneration;
  }

  async list(
    resource: MasterDataResourceKey,
    query: MasterDataListQuery,
    actorUserId: string,
  ): Promise<MasterDataListResult> {
    const model = delegate(this.#client, resource);
    const where = buildWhere(resource, actorUserId, query);
    const [items, total] = await Promise.all([
      model.findMany({
        orderBy: [
          { [toSnakeCase(query.sortBy)]: query.sortOrder },
          ...(query.sortBy === "id" ? [] : [{ id: "desc" }]),
        ],
        select: selectFor(resource, actorUserId),
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        where,
      }),
      model.count({ where }),
    ]);
    return {
      items: items.map(toApiRecord),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async findById(
    resource: MasterDataResourceKey,
    id: string,
    actorUserId: string,
  ): Promise<MasterDataRecord | null> {
    const record = await delegate(this.#client, resource).findFirst({
      select: selectFor(resource, actorUserId),
      where: { AND: [{ id }, dataScopeWhere(resource, actorUserId)] },
    });
    return record ? toApiRecord(record) : null;
  }

  async create(
    resource: MasterDataResourceKey,
    data: Readonly<Record<string, unknown>>,
    actorUserId: string,
  ): Promise<MasterDataRecord> {
    try {
      const createWithClient = async (client: PrismaClient) => {
        const dataWithCode = await this.#codeGeneration.applyMasterDataCode(
          client as never,
          resource,
          data,
        );
        await validateActiveRelations(client, resource, dataWithCode);
        const record = await delegate(client, resource).create({
          data: {
            ...dataToPrisma(dataWithCode),
            created_by: actorUserId,
            updated_by: actorUserId,
          },
          select: selectFor(resource, actorUserId),
        });
        return toApiRecord(record);
      };
      const codeField = MASTER_DATA_DEFINITIONS[resource].codeField;
      const shouldGenerateCode =
        isAutomaticCodeResource(resource) &&
        !(typeof data[codeField] === "string" && data[codeField].trim());
      if (shouldGenerateCode) {
        return await this.#client.$transaction(async (transaction) =>
          createWithClient(transaction as PrismaClient),
        );
      }
      return await createWithClient(this.#client);
    } catch (error) {
      if (prismaErrorCode(error) === "P2002") {
        throw uniqueConflictError(error);
      }
      if (prismaErrorCode(error) === "P2003") {
        throw new ValidationError("引用的基础资料不存在或不可用");
      }
      throw error;
    }
  }

  async delete(
    resource: MasterDataResourceKey,
    id: string,
    actorUserId: string,
    onDeleted: (transactionAuditWriter: AuditWriter) => Promise<void>,
  ): Promise<MasterDataDeleteOutcome> {
    try {
      return await this.#client.$transaction(async (transaction) => {
        const repository = new PrismaMasterDataRepository(transaction as PrismaClient);
        const result = await repository.#deleteRecord(resource, id, actorUserId);
        if (result.status === "deleted") {
          await onDeleted(new PrismaAuditWriter(transaction));
        }
        return result;
      });
    } catch (error) {
      if (prismaErrorCode(error) === "P2003") return { status: "referenced" };
      throw error;
    }
  }

  async #deleteRecord(
    resource: MasterDataResourceKey,
    id: string,
    actorUserId: string,
  ): Promise<MasterDataDeleteOutcome> {
    if (!DELETABLE_RESOURCES.has(resource)) return { status: "unsupported" };
    const model = delegate(this.#client, resource);
    const scope = dataScopeWhere(resource, actorUserId, "manage");
    const record = await model.findFirst({
      select: { id: true, [toSnakeCase(MASTER_DATA_DEFINITIONS[resource].codeField)]: true },
      where: { AND: [{ id }, scope] },
    });
    if (!record) return { status: "not_found" };
    if (isSystemMasterData(resource, record)) return { status: "system" };
    const reference = await findBusinessReference(this.#client, resource, id);
    if (reference) return { status: "referenced", reference };
    const result = await model.deleteMany({ where: { AND: [{ id }, scope] } });
    return result.count === 1 ? { status: "deleted", id } : { status: "not_found" };
  }

  async update(
    resource: MasterDataResourceKey,
    id: string,
    data: Readonly<Record<string, unknown>>,
    updatedAt: string,
    actorUserId: string,
  ): Promise<MasterDataRecord | null> {
    try {
      await validateActiveRelations(this.#client, resource, data);
      const model = delegate(this.#client, resource);
      const result = await model.updateMany({
        data: { ...dataToPrisma(data), updated_at: new Date(), updated_by: actorUserId },
        where: {
          AND: [
            { id, updated_at: new Date(updatedAt) },
            dataScopeWhere(resource, actorUserId, "manage"),
          ],
        },
      });
      if (result.count !== 1) return null;
      return this.findById(resource, id, actorUserId);
    } catch (error) {
      if (prismaErrorCode(error) === "P2002") {
        throw uniqueConflictError(error);
      }
      if (prismaErrorCode(error) === "P2003") {
        throw new ValidationError("引用的基础资料不存在或不可用");
      }
      throw error;
    }
  }

  async setActive(
    resource: MasterDataResourceKey,
    id: string,
    isActive: boolean,
    updatedAt: string,
    actorUserId: string,
  ): Promise<MasterDataRecord | null> {
    const model = delegate(this.#client, resource);
    const result = await model.updateMany({
      data: {
        disabled_at: isActive ? null : new Date(),
        disabled_by: isActive ? null : actorUserId,
        is_active: isActive,
        updated_at: new Date(),
        updated_by: actorUserId,
      },
      where: {
        AND: [
          { id, updated_at: new Date(updatedAt) },
          dataScopeWhere(resource, actorUserId, "manage"),
        ],
      },
    });
    if (result.count !== 1) return null;
    return this.findById(resource, id, actorUserId);
  }

  async uniqueness(
    resource: MasterDataResourceKey,
    field: string,
    value: string,
    excludeId: string | undefined,
    scope: Readonly<Record<string, string>>,
    actorUserId: string,
  ): Promise<boolean> {
    const record = await delegate(this.#client, resource).findFirst({
      select: { id: true },
      where: {
        AND: [
          { [toSnakeCase(field)]: { equals: value, mode: "insensitive" } },
          ...Object.entries(scope).map(([key, scopeValue]) => ({
            [toSnakeCase(key)]: scopeValue,
          })),
          ...(excludeId ? [{ id: { not: excludeId } }] : []),
          dataScopeWhere(resource, actorUserId),
        ],
      },
    });
    return record === null;
  }
}
