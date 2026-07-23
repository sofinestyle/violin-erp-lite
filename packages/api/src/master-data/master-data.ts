import type { AuditWriter } from "../audit/audit.js";
import type { AuthenticationContext } from "../auth/authentication.js";
import { requirePermission } from "../authorization/authorization.js";
import type { PermissionCode } from "../authorization/permissions.js";
import { AppError, ConflictError, NotFoundError, ValidationError } from "../errors/app-error.js";
import type { RequestContext } from "../request-context/request-context.js";
import { recordAuditEvent } from "../audit/audit.js";

export const MASTER_DATA_RESOURCE_KEYS = [
  "products",
  "skus",
  "product-categories",
  "brands",
  "manufacturers",
  "suppliers",
  "warehouses",
  "stores",
] as const;

export type MasterDataResourceKey = (typeof MASTER_DATA_RESOURCE_KEYS)[number];
export type MasterDataAction = "create" | "disable" | "enable" | "read" | "update";
export type MasterDataRecord = Readonly<Record<string, unknown> & { id: string }>;

export type MasterDataListQuery = Readonly<{
  filters: Readonly<Record<string, boolean | string>>;
  isActive?: boolean;
  keyword?: string;
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
}>;

export type MasterDataListResult = Readonly<{
  items: readonly MasterDataRecord[];
  page: number;
  pageSize: number;
  total: number;
}>;

export type MasterDataRepository = Readonly<{
  create: (
    resource: MasterDataResourceKey,
    data: Readonly<Record<string, unknown>>,
    actorUserId: string,
  ) => Promise<MasterDataRecord>;
  findById: (
    resource: MasterDataResourceKey,
    id: string,
    actorUserId: string,
  ) => Promise<MasterDataRecord | null>;
  list: (
    resource: MasterDataResourceKey,
    query: MasterDataListQuery,
    actorUserId: string,
  ) => Promise<MasterDataListResult>;
  setActive: (
    resource: MasterDataResourceKey,
    id: string,
    isActive: boolean,
    updatedAt: string,
    actorUserId: string,
  ) => Promise<MasterDataRecord | null>;
  uniqueness: (
    resource: MasterDataResourceKey,
    field: string,
    value: string,
    excludeId: string | undefined,
    scope: Readonly<Record<string, string>>,
    actorUserId: string,
  ) => Promise<boolean>;
  update: (
    resource: MasterDataResourceKey,
    id: string,
    data: Readonly<Record<string, unknown>>,
    updatedAt: string,
    actorUserId: string,
  ) => Promise<MasterDataRecord | null>;
}>;

type FieldKind = "boolean" | "decimal" | "email" | "integer" | "string" | "uuid";

export type MasterDataField = Readonly<{
  key: string;
  kind: FieldKind;
  label: string;
  maxLength?: number;
  nullable?: boolean;
  requiredOnCreate?: boolean;
}>;

export type MasterDataResourceDefinition = Readonly<{
  codeField: string;
  fields: readonly MasterDataField[];
  filterFields: readonly string[];
  label: string;
  nameField: string;
  permissionResource:
    | "master.brand"
    | "master.category"
    | "master.manufacturer"
    | "master.product"
    | "master.sku"
    | "master.store"
    | "master.supplier"
    | "master.warehouse";
  sortFields: readonly string[];
}>;

const requiredString = (key: string, label: string, maxLength: number): MasterDataField => ({
  key,
  kind: "string",
  label,
  maxLength,
  requiredOnCreate: true,
});

const optionalString = (key: string, label: string, maxLength?: number): MasterDataField => ({
  key,
  kind: "string",
  label,
  ...(maxLength === undefined ? {} : { maxLength }),
  nullable: true,
});

const requiredUuid = (key: string, label: string): MasterDataField => ({
  key,
  kind: "uuid",
  label,
  requiredOnCreate: true,
});

export const MASTER_DATA_DEFINITIONS: Readonly<
  Record<MasterDataResourceKey, MasterDataResourceDefinition>
> = {
  products: {
    codeField: "productCode",
    fields: [
      requiredString("productCode", "产品编码", 50),
      requiredString("productName", "产品名称", 200),
      optionalString("productNameEn", "英文名称", 300),
      requiredUuid("categoryId", "产品分类"),
      requiredUuid("brandId", "品牌"),
      requiredString("productType", "产品类型", 50),
      optionalString("description", "产品说明"),
      requiredString("defaultUnit", "默认单位", 200),
    ],
    filterFields: ["categoryId", "brandId", "productType"],
    label: "产品",
    nameField: "productName",
    permissionResource: "master.product",
    sortFields: ["productCode", "productName", "createdAt", "updatedAt"],
  },
  skus: {
    codeField: "skuCode",
    fields: [
      requiredString("skuCode", "SKU 编码", 100),
      requiredString("skuName", "SKU 名称", 200),
      requiredUuid("productId", "所属产品"),
      optionalString("size", "尺寸", 200),
      optionalString("color", "颜色", 200),
      optionalString("specification", "规格", 200),
      optionalString("material", "材质", 200),
      requiredString("unit", "计量单位", 200),
      optionalString("barcode", "条码", 100),
      { key: "defaultPurchasePrice", kind: "decimal", label: "默认采购价", nullable: true },
      { key: "defaultProductionPrice", kind: "decimal", label: "默认生产价", nullable: true },
      { key: "defaultSalePrice", kind: "decimal", label: "默认销售价", nullable: true },
      {
        key: "safetyStockQuantity",
        kind: "decimal",
        label: "安全库存数量",
        requiredOnCreate: true,
      },
    ],
    filterFields: ["productId", "categoryId", "brandId"],
    label: "SKU",
    nameField: "skuName",
    permissionResource: "master.sku",
    sortFields: ["skuCode", "skuName", "safetyStockQuantity", "createdAt", "updatedAt"],
  },
  "product-categories": {
    codeField: "categoryCode",
    fields: [
      requiredString("categoryCode", "分类编码", 50),
      requiredString("categoryName", "分类名称", 200),
      { key: "parentCategoryId", kind: "uuid", label: "上级分类", nullable: true },
      { key: "categoryLevel", kind: "integer", label: "分类层级", requiredOnCreate: true },
      { key: "sortOrder", kind: "integer", label: "显示顺序", requiredOnCreate: true },
      optionalString("description", "说明"),
    ],
    filterFields: ["parentCategoryId"],
    label: "产品分类",
    nameField: "categoryName",
    permissionResource: "master.category",
    sortFields: ["categoryCode", "categoryName", "sortOrder", "createdAt", "updatedAt"],
  },
  brands: {
    codeField: "brandCode",
    fields: [
      requiredString("brandCode", "品牌编码", 50),
      requiredString("brandName", "品牌名称", 200),
      optionalString("brandNameEn", "英文名称", 300),
      optionalString("description", "说明"),
    ],
    filterFields: [],
    label: "品牌",
    nameField: "brandName",
    permissionResource: "master.brand",
    sortFields: ["brandCode", "brandName", "createdAt", "updatedAt"],
  },
  manufacturers: {
    codeField: "manufacturerCode",
    fields: [
      requiredString("manufacturerCode", "厂家编码", 50),
      requiredString("manufacturerName", "厂家名称", 200),
      optionalString("shortName", "简称", 100),
      optionalString("contactName", "联系人", 200),
      optionalString("contactPhone", "联系电话", 50),
      { key: "contactEmail", kind: "email", label: "联系邮箱", maxLength: 254, nullable: true },
      optionalString("address", "地址", 500),
      requiredString("settlementMethod", "结算方式", 50),
      optionalString("paymentTerms", "付款条件"),
      optionalString("productionCapacityNote", "产能说明"),
      optionalString("remark", "备注", 1000),
    ],
    filterFields: ["settlementMethod"],
    label: "生产厂家",
    nameField: "manufacturerName",
    permissionResource: "master.manufacturer",
    sortFields: ["manufacturerCode", "manufacturerName", "createdAt", "updatedAt"],
  },
  suppliers: {
    codeField: "supplierCode",
    fields: [
      requiredString("supplierCode", "供应商编码", 50),
      requiredString("supplierName", "供应商名称", 200),
      optionalString("shortName", "简称", 100),
      optionalString("contactName", "联系人", 200),
      optionalString("contactPhone", "联系电话", 50),
      { key: "contactEmail", kind: "email", label: "联系邮箱", maxLength: 254, nullable: true },
      optionalString("address", "地址", 500),
      requiredString("settlementMethod", "结算方式", 50),
      optionalString("paymentTerms", "付款条件"),
      optionalString("taxIdentifier", "税号", 255),
      optionalString("bankName", "开户行", 255),
      optionalString("bankAccountName", "账户名称", 255),
      optionalString("bankAccountNo", "银行账号", 255),
      optionalString("remark", "备注", 1000),
    ],
    filterFields: ["settlementMethod"],
    label: "供应商",
    nameField: "supplierName",
    permissionResource: "master.supplier",
    sortFields: ["supplierCode", "supplierName", "createdAt", "updatedAt"],
  },
  warehouses: {
    codeField: "warehouseCode",
    fields: [
      requiredString("warehouseCode", "仓库编码", 50),
      requiredString("warehouseName", "仓库名称", 200),
      requiredString("warehouseType", "仓库类型", 30),
      requiredString("ownerType", "责任主体类型", 50),
      { key: "manufacturerId", kind: "uuid", label: "生产厂家", nullable: true },
      optionalString("countryCode", "国家代码", 2),
      optionalString("province", "省份", 200),
      optionalString("city", "城市", 200),
      optionalString("address", "地址", 500),
      optionalString("contactName", "联系人", 200),
      optionalString("contactPhone", "联系电话", 50),
      {
        key: "allowsAvailableStock",
        kind: "boolean",
        label: "允许形成可用库存",
        requiredOnCreate: true,
      },
      { key: "sortOrder", kind: "integer", label: "显示顺序", requiredOnCreate: true },
    ],
    filterFields: ["warehouseType", "manufacturerId", "countryCode"],
    label: "仓库",
    nameField: "warehouseName",
    permissionResource: "master.warehouse",
    sortFields: ["warehouseCode", "warehouseName", "sortOrder", "createdAt", "updatedAt"],
  },
  stores: {
    codeField: "storeCode",
    fields: [
      requiredString("storeCode", "店铺编码", 50),
      requiredString("storeName", "店铺名称", 200),
      requiredUuid("platformId", "所属平台"),
      { key: "externalStoreId", kind: "uuid", label: "外部店铺标识", nullable: true },
      requiredString("countryCode", "国家代码", 2),
      requiredString("currencyCode", "币种", 3),
      optionalString("operatorName", "运营负责人", 200),
      optionalString("remark", "备注", 1000),
    ],
    filterFields: ["platformId", "countryCode", "currencyCode"],
    label: "店铺",
    nameField: "storeName",
    permissionResource: "master.store",
    sortFields: ["storeCode", "storeName", "createdAt", "updatedAt"],
  },
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WAREHOUSE_TYPES = new Set(["company", "manufacturer", "overseas", "transit", "pending"]);

function validationIssue(field: string, message: string): ValidationError {
  return new ValidationError("请求数据校验失败", [{ field, message }]);
}

function validateField(field: MasterDataField, value: unknown): unknown {
  if (value === null && field.nullable) return null;

  if (field.kind === "boolean") {
    if (typeof value !== "boolean") throw validationIssue(field.key, `${field.label}必须是布尔值`);
    return value;
  }

  if (field.kind === "integer") {
    if (!Number.isSafeInteger(value) || Number(value) < 0) {
      throw validationIssue(field.key, `${field.label}必须是非负整数`);
    }
    return value;
  }

  if (field.kind === "decimal") {
    const normalized = typeof value === "number" ? String(value) : value;
    if (typeof normalized !== "string" || !/^(?:0|[1-9]\d*)(?:\.\d{1,4})?$/.test(normalized)) {
      throw validationIssue(field.key, `${field.label}必须是非负十进制定点数`);
    }
    return normalized;
  }

  if (typeof value !== "string") throw validationIssue(field.key, `${field.label}必须是字符串`);
  const normalized = value.trim();
  if (!normalized && !field.nullable) throw validationIssue(field.key, `${field.label}不得为空`);
  if (field.maxLength !== undefined && normalized.length > field.maxLength) {
    throw validationIssue(field.key, `${field.label}长度不得超过 ${field.maxLength}`);
  }
  if (field.kind === "uuid" && normalized && !UUID_PATTERN.test(normalized)) {
    throw validationIssue(field.key, `${field.label}必须是 UUID`);
  }
  if (field.kind === "email" && normalized && !EMAIL_PATTERN.test(normalized)) {
    throw validationIssue(field.key, `${field.label}格式无效`);
  }
  return normalized || null;
}

export function validateMasterDataInput(
  resource: MasterDataResourceKey,
  input: unknown,
  mode: "create" | "update",
): Readonly<{ data: Readonly<Record<string, unknown>>; updatedAt?: string }> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ValidationError("请求体必须是对象");
  }

  const source = input as Record<string, unknown>;
  const definition = MASTER_DATA_DEFINITIONS[resource];
  const allowed = new Set(definition.fields.map((field) => field.key));
  if (mode === "update") allowed.add("updatedAt");

  for (const key of Object.keys(source)) {
    if (!allowed.has(key)) throw validationIssue(key, "包含未批准字段");
  }

  const data: Record<string, unknown> = {};
  for (const field of definition.fields) {
    const value = source[field.key];
    if (value === undefined) {
      if (mode === "create" && field.requiredOnCreate) {
        throw validationIssue(field.key, `${field.label}为必填项`);
      }
      continue;
    }
    data[field.key] = validateField(field, value);
  }

  const updatedAt = source.updatedAt;
  if (mode === "update" && (typeof updatedAt !== "string" || Number.isNaN(Date.parse(updatedAt)))) {
    throw validationIssue("updatedAt", "updatedAt 必须是有效 ISO 8601 时间");
  }

  if (resource === "warehouses") validateWarehouse(data);
  if (resource === "product-categories" && data.categoryLevel === 0) {
    throw validationIssue("categoryLevel", "分类层级必须从 1 开始");
  }

  return {
    data,
    ...(typeof updatedAt === "string" ? { updatedAt } : {}),
  };
}

function validateWarehouse(data: Readonly<Record<string, unknown>>): void {
  const type = data.warehouseType;
  if (type !== undefined && (typeof type !== "string" || !WAREHOUSE_TYPES.has(type))) {
    throw validationIssue("warehouseType", "仓库类型不属于 Frozen 正式枚举");
  }
  if (type === "manufacturer" && !data.manufacturerId) {
    throw validationIssue("manufacturerId", "厂家仓必须关联生产厂家");
  }
  if (type === "overseas" && !data.countryCode) {
    throw validationIssue("countryCode", "海外仓必须填写国家代码");
  }
  if ((type === "transit" || type === "pending") && data.allowsAvailableStock !== false) {
    throw validationIssue("allowsAvailableStock", "在途仓和待处理仓不得形成可用库存");
  }
}

export function parseMasterDataListQuery(
  resource: MasterDataResourceKey,
  searchParams: URLSearchParams,
): MasterDataListQuery {
  const definition = MASTER_DATA_DEFINITIONS[resource];
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "20");
  if (!Number.isSafeInteger(page) || page < 1) throw validationIssue("page", "page 必须大于 0");
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw validationIssue("pageSize", "pageSize 必须在 1 至 100 之间");
  }

  const sortBy = searchParams.get("sortBy") ?? "updatedAt";
  if (!definition.sortFields.includes(sortBy)) {
    throw validationIssue("sortBy", "排序字段不在正式允许集合内");
  }
  const sortOrder = searchParams.get("sortOrder") ?? "desc";
  if (sortOrder !== "asc" && sortOrder !== "desc") {
    throw validationIssue("sortOrder", "sortOrder 只允许 asc 或 desc");
  }

  const isActiveText = searchParams.get("isActive");
  if (isActiveText !== null && isActiveText !== "true" && isActiveText !== "false") {
    throw validationIssue("isActive", "isActive 只允许 true 或 false");
  }

  const filters: Record<string, string> = {};
  for (const field of definition.filterFields) {
    const value = searchParams.get(field);
    if (value) {
      if (field.endsWith("Id") && !UUID_PATTERN.test(value)) {
        throw validationIssue(field, `${field} 必须是 UUID`);
      }
      filters[field] = value;
    }
  }

  return {
    filters,
    ...(isActiveText === null ? {} : { isActive: isActiveText === "true" }),
    ...(searchParams.get("keyword")?.trim()
      ? { keyword: searchParams.get("keyword")!.trim() }
      : {}),
    page,
    pageSize,
    sortBy,
    sortOrder,
  };
}

function permissionFor(resource: MasterDataResourceKey, action: MasterDataAction): PermissionCode {
  return `${MASTER_DATA_DEFINITIONS[resource].permissionResource}.${action}` as PermissionCode;
}

export class MasterDataService {
  readonly #auditWriter: AuditWriter;
  readonly #repository: MasterDataRepository;

  constructor(repository: MasterDataRepository, auditWriter: AuditWriter) {
    this.#repository = repository;
    this.#auditWriter = auditWriter;
  }

  async list(
    resource: MasterDataResourceKey,
    query: MasterDataListQuery,
    authentication: AuthenticationContext,
  ): Promise<MasterDataListResult> {
    const { user } = requirePermission(authentication, permissionFor(resource, "read"));
    const result = await this.#repository.list(resource, query, user.userId);
    return {
      ...result,
      items: result.items.map((record) => this.#sanitize(resource, record, authentication)),
    };
  }

  async detail(
    resource: MasterDataResourceKey,
    id: string,
    authentication: AuthenticationContext,
    requestContext?: RequestContext,
  ): Promise<MasterDataRecord> {
    const { user } = requirePermission(authentication, permissionFor(resource, "read"));
    const record = await this.#repository.findById(resource, id, user.userId);
    if (!record) throw new NotFoundError("基础资料不存在或不可访问");
    const safeRecord = this.#sanitize(resource, record, authentication);
    if (
      requestContext &&
      ((resource === "suppliers" &&
        authentication.user.permissionCodes.includes("field.supplier-sensitive.read")) ||
        (resource === "manufacturers" &&
          authentication.user.permissionCodes.includes("field.manufacturer-sensitive.read")) ||
        (resource === "skus" &&
          authentication.user.permissionCodes.some(
            (permission) => permission === "field.cost.read" || permission === "field.amount.read",
          )))
    ) {
      await recordAuditEvent(this.#auditWriter, {
        action: "read-sensitive",
        actorUserId: authentication.user.userId,
        moduleCode: MASTER_DATA_DEFINITIONS[resource].permissionResource,
        requestId: requestContext.requestId,
        resourceId: id,
        resourceType: resource,
        result: "success",
        timestamp: new Date(requestContext.timestamp),
      });
    }
    return safeRecord;
  }

  async create(
    resource: MasterDataResourceKey,
    input: unknown,
    authentication: AuthenticationContext,
    requestContext: RequestContext,
  ): Promise<MasterDataRecord> {
    const { user } = requirePermission(authentication, permissionFor(resource, "create"));
    const { data } = validateMasterDataInput(resource, input, "create");
    const record = await this.#repository.create(resource, data, user.userId);
    const safeRecord = this.#sanitize(resource, record, authentication);
    await this.#audit("create", resource, safeRecord, user.userId, requestContext);
    return safeRecord;
  }

  async update(
    resource: MasterDataResourceKey,
    id: string,
    input: unknown,
    authentication: AuthenticationContext,
    requestContext: RequestContext,
  ): Promise<MasterDataRecord> {
    const { user } = requirePermission(authentication, permissionFor(resource, "update"));
    const { data, updatedAt } = validateMasterDataInput(resource, input, "update");
    const record = await this.#repository.update(resource, id, data, updatedAt!, user.userId);
    if (!record) throw new ConflictError("基础资料已被其他请求修改或不存在");
    const safeRecord = this.#sanitize(resource, record, authentication);
    await this.#audit("update", resource, safeRecord, user.userId, requestContext);
    return safeRecord;
  }

  async setActive(
    resource: MasterDataResourceKey,
    id: string,
    isActive: boolean,
    input: unknown,
    authentication: AuthenticationContext,
    requestContext: RequestContext,
  ): Promise<MasterDataRecord> {
    const action = isActive ? "enable" : "disable";
    const { user } = requirePermission(authentication, permissionFor(resource, action));
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new ValidationError("请求体必须是对象");
    }
    const source = input as Record<string, unknown>;
    if (typeof source.updatedAt !== "string" || Number.isNaN(Date.parse(source.updatedAt))) {
      throw validationIssue("updatedAt", "updatedAt 必须是有效 ISO 8601 时间");
    }
    if (!isActive && (typeof source.reason !== "string" || !source.reason.trim())) {
      throw validationIssue("reason", "停用原因必填");
    }
    const record = await this.#repository.setActive(
      resource,
      id,
      isActive,
      source.updatedAt,
      user.userId,
    );
    if (!record) throw new ConflictError("基础资料状态已变化或不存在");
    const safeRecord = this.#sanitize(resource, record, authentication);
    await this.#audit(action, resource, safeRecord, user.userId, requestContext);
    return safeRecord;
  }

  async options(
    resource: MasterDataResourceKey,
    query: MasterDataListQuery,
    authentication: AuthenticationContext,
    includeInactive = false,
  ): Promise<readonly MasterDataRecord[]> {
    const records = (
      await this.list(
        resource,
        {
          ...query,
          ...(includeInactive ? {} : { isActive: true }),
          pageSize: Math.min(query.pageSize, 100),
        },
        authentication,
      )
    ).items;
    const definition = MASTER_DATA_DEFINITIONS[resource];
    return records.map((record) => {
      const option: Record<string, unknown> = {
        id: record.id,
        isActive: record.isActive,
        [definition.codeField]: record[definition.codeField],
        [definition.nameField]: record[definition.nameField],
      };
      for (const key of [
        "accessLevel",
        "category",
        "manufacturer",
        "platform",
        "product",
        "specification",
        "warehouseType",
      ]) {
        if (record[key] !== undefined) option[key] = record[key];
      }
      return option as MasterDataRecord;
    });
  }

  async uniqueness(
    resource: MasterDataResourceKey,
    searchParams: URLSearchParams,
    authentication: AuthenticationContext,
  ): Promise<Readonly<{ isUnique: boolean; normalizedValue: string }>> {
    const { user } = requirePermission(authentication, permissionFor(resource, "read"));
    const field = searchParams.get("field");
    const value = searchParams.get("value")?.trim();
    const allowed = new Set([
      MASTER_DATA_DEFINITIONS[resource].codeField,
      MASTER_DATA_DEFINITIONS[resource].nameField,
      ...(resource === "skus" ? ["barcode"] : []),
      ...(resource === "stores" ? ["externalStoreId"] : []),
    ]);
    if (!field || !allowed.has(field) || !value) {
      throw new ValidationError("唯一性检查参数无效");
    }
    const isUnique = await this.#repository.uniqueness(
      resource,
      field,
      value,
      searchParams.get("excludeId") ?? undefined,
      {
        ...(resource === "stores" && searchParams.get("platformId")
          ? { platformId: searchParams.get("platformId")! }
          : {}),
        ...(resource === "product-categories" && searchParams.get("parentCategoryId")
          ? { parentCategoryId: searchParams.get("parentCategoryId")! }
          : {}),
      },
      user.userId,
    );
    return { isUnique, normalizedValue: value.toLowerCase() };
  }

  async #audit(
    action: string,
    resource: MasterDataResourceKey,
    record: MasterDataRecord,
    actorUserId: string,
    context: RequestContext,
  ): Promise<void> {
    await recordAuditEvent(this.#auditWriter, {
      action,
      actorUserId,
      afterSnapshot: record,
      moduleCode: MASTER_DATA_DEFINITIONS[resource].permissionResource,
      requestId: context.requestId,
      resourceId: record.id,
      resourceType: resource,
      result: "success",
      timestamp: new Date(context.timestamp),
    });
  }

  #sanitize(
    resource: MasterDataResourceKey,
    record: MasterDataRecord,
    authentication: AuthenticationContext,
  ): MasterDataRecord {
    const safe = { ...record };
    const permissions = new Set(authentication.user.permissionCodes);
    if (resource === "skus") {
      if (!permissions.has("field.cost.read")) {
        delete safe.defaultPurchasePrice;
        delete safe.defaultProductionPrice;
      }
      if (!permissions.has("field.amount.read")) {
        delete safe.defaultSalePrice;
      }
    }
    if (resource === "suppliers" && !permissions.has("field.supplier-sensitive.read")) {
      for (const field of [
        "address",
        "bankAccountName",
        "bankAccountNo",
        "bankName",
        "contactEmail",
        "contactPhone",
        "taxIdentifier",
      ]) {
        delete safe[field];
      }
    }
    if (resource === "manufacturers" && !permissions.has("field.manufacturer-sensitive.read")) {
      for (const field of ["address", "contactEmail", "contactPhone"]) {
        delete safe[field];
      }
    }
    return safe as MasterDataRecord;
  }
}

export function assertMasterDataResource(value: string): MasterDataResourceKey {
  if (!MASTER_DATA_RESOURCE_KEYS.includes(value as MasterDataResourceKey)) {
    throw new AppError("RESOURCE_NOT_FOUND", 404, "接口不存在");
  }
  return value as MasterDataResourceKey;
}
