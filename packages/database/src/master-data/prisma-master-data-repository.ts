import {
  ConflictError,
  MASTER_DATA_DEFINITIONS,
  ValidationError,
  type MasterDataListQuery,
  type MasterDataListResult,
  type MasterDataRecord,
  type MasterDataRepository,
  type MasterDataResourceKey,
} from "@violin-erp/api";
import type { PrismaClient } from "../generated/prisma/client.js";
import { getPrismaClient } from "../client.js";

type UnknownRecord = Record<string, unknown>;
type GenericDelegate = Readonly<{
  count: (args: UnknownRecord) => Promise<number>;
  create: (args: UnknownRecord) => Promise<UnknownRecord>;
  findFirst: (args: UnknownRecord) => Promise<UnknownRecord | null>;
  findMany: (args: UnknownRecord) => Promise<UnknownRecord[]>;
  updateMany: (args: UnknownRecord) => Promise<{ count: number }>;
}>;

const RESOURCE_MODELS: Readonly<Record<MasterDataResourceKey, string>> = {
  brands: "brands",
  manufacturers: "manufacturers",
  "product-categories": "product_categories",
  products: "products",
  skus: "skus",
  stores: "stores",
  suppliers: "suppliers",
  warehouses: "warehouses",
};

const CAMEL_BOUNDARY = /[A-Z]/g;
const SNAKE_BOUNDARY = /_([a-z])/g;

function prismaErrorCode(error: unknown): string | undefined {
  return error && typeof error === "object" && "code" in error
    ? String((error as { code: unknown }).code)
    : undefined;
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

  constructor(client: PrismaClient = getPrismaClient()) {
    this.#client = client;
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
    await validateActiveRelations(this.#client, resource, data);
    try {
      const record = await delegate(this.#client, resource).create({
        data: {
          ...dataToPrisma(data),
          created_by: actorUserId,
          updated_by: actorUserId,
        },
        select: selectFor(resource, actorUserId),
      });
      return toApiRecord(record);
    } catch (error) {
      if (prismaErrorCode(error) === "P2002") {
        throw new ConflictError("基础资料编码或受控唯一值重复");
      }
      if (prismaErrorCode(error) === "P2003") {
        throw new ValidationError("引用的基础资料不存在或不可用");
      }
      throw error;
    }
  }

  async update(
    resource: MasterDataResourceKey,
    id: string,
    data: Readonly<Record<string, unknown>>,
    updatedAt: string,
    actorUserId: string,
  ): Promise<MasterDataRecord | null> {
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
