import type { PermissionCode } from "@violin-erp/api";

export type WorkbenchField = Readonly<{
  defaultValue?: string;
  group?: string;
  helpText?: string;
  hidden?: true;
  inputMode?: "datalist" | "select" | "textarea";
  key: string;
  label: string;
  optionCodeField?: string;
  optionNameField?: string;
  optionResource?: string;
  options?: readonly { label: string; value: string }[];
  placeholder?: string;
  required?: boolean;
  type?: "boolean" | "number" | "password" | "text";
  visibleWhen?: Readonly<{ equals: string; field: string }>;
}>;

export type WorkbenchDefinition = Readonly<{
  apiPath: string;
  codeField: string;
  createPermission: PermissionCode;
  disablePermission: PermissionCode;
  enablePermission: PermissionCode;
  fields: readonly WorkbenchField[];
  key: string;
  label: string;
  nameField: string;
  readPermission: PermissionCode;
  updatePermission: PermissionCode;
}>;

const field = (
  key: string,
  label: string,
  required = false,
  type: WorkbenchField["type"] = "text",
  options: Omit<WorkbenchField, "key" | "label" | "required" | "type"> = {},
): WorkbenchField => ({ key, label, required, type, ...options });

export const MASTER_DATA_FIELD_OPTIONS = {
  categoryPresets: [
    { label: "提琴", value: "提琴" },
    { label: "吉他", value: "吉他" },
    { label: "尤克里里", value: "尤克里里" },
    { label: "配件", value: "配件" },
  ],
  countryCodes: [
    { label: "中国大陆（CN）", value: "CN" },
    { label: "美国（US）", value: "US" },
    { label: "日本（JP）", value: "JP" },
    { label: "英国（GB）", value: "GB" },
    { label: "德国（DE）", value: "DE" },
  ],
  currencies: [
    { label: "人民币（CNY）", value: "CNY" },
    { label: "美元（USD）", value: "USD" },
    { label: "欧元（EUR）", value: "EUR" },
    { label: "日元（JPY）", value: "JPY" },
  ],
  ownerTypes: [
    { label: "公司自有", value: "company" },
    { label: "厂家负责", value: "manufacturer" },
    { label: "平台 / 店铺", value: "platform" },
    { label: "第三方服务商", value: "third_party" },
  ],
  platformTypes: [
    { label: "综合电商", value: "marketplace" },
    { label: "跨境平台", value: "cross_border" },
    { label: "自营渠道", value: "owned" },
    { label: "线下渠道", value: "offline" },
  ],
  settlementMethods: [
    { label: "预付", value: "prepaid" },
    { label: "现结", value: "cash" },
    { label: "月结", value: "monthly" },
    { label: "自定义", value: "custom" },
  ],
  units: [
    { label: "把", value: "unit" },
    { label: "只", value: "piece_single" },
    { label: "件", value: "piece" },
    { label: "个", value: "item" },
    { label: "条", value: "strip" },
    { label: "套", value: "set" },
    { label: "箱", value: "box" },
    { label: "包", value: "pack" },
    { label: "支", value: "stick" },
    { label: "其他", value: "other" },
  ],
  warehouseTypes: [
    { label: "公司仓", value: "company" },
    { label: "厂家仓", value: "manufacturer" },
    { label: "海外仓", value: "overseas" },
    { label: "在途仓", value: "transit" },
    { label: "待处理仓", value: "pending" },
  ],
} as const;

export const MASTER_WORKBENCHES: readonly WorkbenchDefinition[] = [
  {
    apiPath: "/api/v1/products",
    codeField: "productCode",
    createPermission: "master.product.create",
    disablePermission: "master.product.disable",
    enablePermission: "master.product.enable",
    fields: [
      field("productCode", "产品编码", true, "text", {
        group: "基础信息",
        helpText: "暂按 Frozen API 保留手填，自动编码等待 UAT-009 CR。",
        placeholder: "例如：PRD-VLN-001",
      }),
      field("productName", "产品名称", true, "text", {
        group: "基础信息",
        placeholder: "例如：入门级实木小提琴",
      }),
      field("productNameEn", "英文名称", false, "text", {
        group: "基础信息",
        placeholder: "可选，例如：Student Violin",
      }),
      field("categoryId", "产品分类", true, "text", {
        group: "业务归类",
        optionCodeField: "categoryCode",
        optionNameField: "categoryName",
        optionResource: "product-categories",
      }),
      field("brandId", "品牌", true, "text", {
        group: "业务归类",
        optionCodeField: "brandCode",
        optionNameField: "brandName",
        optionResource: "brands",
      }),
      field("productType", "产品类型", true, "text", {
        defaultValue: "violin",
        hidden: true,
        helpText: "底层字段保留，当前页面按默认产品类型提交。",
      }),
      field("defaultUnit", "默认单位", true, "text", {
        defaultValue: "unit",
        group: "业务归类",
        inputMode: "select",
        options: MASTER_DATA_FIELD_OPTIONS.units,
        placeholder: "请选择默认单位",
      }),
      field("description", "产品说明", false, "text", {
        group: "补充信息",
        inputMode: "textarea",
        placeholder: "填写产品定位、材质、适用场景等说明",
      }),
    ],
    key: "products",
    label: "产品",
    nameField: "productName",
    readPermission: "master.product.read",
    updatePermission: "master.product.update",
  },
  {
    apiPath: "/api/v1/skus",
    codeField: "skuCode",
    createPermission: "master.sku.create",
    disablePermission: "master.sku.disable",
    enablePermission: "master.sku.enable",
    fields: [
      field("skuCode", "SKU 编码", true, "text", {
        group: "SKU 基础信息",
        helpText: "暂按 Frozen API 保留手填，自动编码等待 UAT-009 CR。",
        placeholder: "例如：SKU-VLN-44-NAT",
      }),
      field("skuName", "SKU 名称", true, "text", {
        group: "SKU 基础信息",
        helpText: "留空时前端会按产品、尺寸、颜色和规格自动生成。",
        placeholder: "留空自动生成，例如：入门级小提琴 / 4/4 / 原木色",
      }),
      field("productId", "所属产品", true, "text", {
        group: "SKU 基础信息",
        optionCodeField: "productCode",
        optionNameField: "productName",
        optionResource: "products",
      }),
      field("size", "尺寸", false, "text", {
        group: "规格信息",
        placeholder: "例如：4/4、3/4、21寸",
      }),
      field("color", "颜色", false, "text", {
        group: "规格信息",
        placeholder: "例如：原木色、黑色、黄绿色",
      }),
      field("specification", "规格", false, "text", {
        group: "规格信息",
        placeholder: "例如：学生款套装、单琴",
      }),
      field("material", "材质", false, "text", {
        group: "规格信息",
        placeholder: "例如：实木、夹板、树脂",
      }),
      field("unit", "计量单位", true, "text", {
        defaultValue: "unit",
        group: "库存与价格",
        inputMode: "select",
        options: MASTER_DATA_FIELD_OPTIONS.units,
      }),
      field("barcode", "条码", false, "text", {
        group: "库存与价格",
        placeholder: "可选，扫码场景使用",
      }),
      field("defaultPurchasePrice", "默认采购价", false, "text", {
        group: "库存与价格",
        placeholder: "可选，金额字段受权限控制",
      }),
      field("defaultProductionPrice", "默认生产价", false, "text", {
        group: "库存与价格",
        placeholder: "可选，金额字段受权限控制",
      }),
      field("defaultSalePrice", "默认销售价", false, "text", {
        group: "库存与价格",
        placeholder: "可选，金额字段受权限控制",
      }),
      field("safetyStockQuantity", "最低安全库存", true, "number", {
        defaultValue: "0",
        group: "库存与价格",
        helpText: "默认 0；后续库存预警按此值判断。",
      }),
    ],
    key: "skus",
    label: "SKU",
    nameField: "skuName",
    readPermission: "master.sku.read",
    updatePermission: "master.sku.update",
  },
  {
    apiPath: "/api/v1/product-categories",
    codeField: "categoryCode",
    createPermission: "master.category.create",
    disablePermission: "master.category.disable",
    enablePermission: "master.category.enable",
    fields: [
      field("categoryCode", "分类编码", true, "text", {
        group: "基础信息",
        helpText: "暂按 Frozen API 保留手填，自动编码等待 UAT-009 CR。",
        placeholder: "例如：CAT-VLN",
      }),
      field("categoryName", "分类名称", true, "text", {
        group: "基础信息",
        inputMode: "datalist",
        options: MASTER_DATA_FIELD_OPTIONS.categoryPresets,
        placeholder: "可选预设：提琴 / 吉他 / 尤克里里 / 配件，或输入自定义分类",
      }),
      field("parentCategoryId", "上级分类", false, "text", {
        group: "层级关系",
        optionCodeField: "categoryCode",
        optionNameField: "categoryName",
        optionResource: "product-categories",
      }),
      field("categoryLevel", "分类层级", true, "number", {
        defaultValue: "1",
        hidden: true,
        helpText: "根据上级分类自动推导。",
      }),
      field("sortOrder", "显示顺序", true, "number", {
        defaultValue: "0",
        hidden: true,
        helpText: "默认 0；排序增强另行评估。",
      }),
      field("description", "说明", false, "text", {
        group: "补充信息",
        inputMode: "textarea",
        placeholder: "填写分类适用范围或备注",
      }),
    ],
    key: "product-categories",
    label: "产品分类",
    nameField: "categoryName",
    readPermission: "master.category.read",
    updatePermission: "master.category.update",
  },
  {
    apiPath: "/api/v1/brands",
    codeField: "brandCode",
    createPermission: "master.brand.create",
    disablePermission: "master.brand.disable",
    enablePermission: "master.brand.enable",
    fields: [
      field("brandCode", "品牌编码", true, "text", {
        group: "品牌信息",
        helpText: "暂按 Frozen API 保留手填，自动编码等待 UAT-009 CR。",
      }),
      field("brandName", "品牌名称", true, "text", {
        group: "品牌信息",
        placeholder: "优先填写用户识别度最高的品牌名称",
      }),
      field("brandNameEn", "英文名称", false, "text", { group: "品牌信息" }),
      field("description", "说明", false, "text", {
        group: "补充信息",
        inputMode: "textarea",
      }),
    ],
    key: "brands",
    label: "品牌",
    nameField: "brandName",
    readPermission: "master.brand.read",
    updatePermission: "master.brand.update",
  },
  {
    apiPath: "/api/v1/ecommerce-platforms",
    codeField: "platformCode",
    createPermission: "master.platform.create",
    disablePermission: "master.platform.disable",
    enablePermission: "master.platform.enable",
    fields: [
      field("platformCode", "平台编码", true, "text", {
        group: "平台信息",
        helpText: "暂按 Frozen API 保留手填，自动编码等待 UAT-009 CR。",
      }),
      field("platformName", "平台名称", true, "text", {
        group: "平台信息",
        placeholder: "例如：Temu、Amazon、天猫",
      }),
      field("platformType", "平台类型", true, "text", {
        group: "平台信息",
        inputMode: "select",
        options: MASTER_DATA_FIELD_OPTIONS.platformTypes,
      }),
      field("countryCode", "国家代码", false, "text", {
        group: "平台信息",
        inputMode: "select",
        options: MASTER_DATA_FIELD_OPTIONS.countryCodes,
      }),
      field("isCrossBorder", "是否跨境平台", true, "boolean", { group: "平台信息" }),
      field("description", "说明", false, "text", {
        group: "补充信息",
        inputMode: "textarea",
      }),
    ],
    key: "ecommerce-platforms",
    label: "电商平台",
    nameField: "platformName",
    readPermission: "master.platform.read",
    updatePermission: "master.platform.update",
  },
  {
    apiPath: "/api/v1/manufacturers",
    codeField: "manufacturerCode",
    createPermission: "master.manufacturer.create",
    disablePermission: "master.manufacturer.disable",
    enablePermission: "master.manufacturer.enable",
    fields: [
      field("manufacturerCode", "厂家编码", true, "text", {
        group: "基础信息",
        helpText: "暂按 Frozen API 保留手填，自动编码等待 UAT-009 CR。",
      }),
      field("manufacturerName", "厂家名称", true, "text", { group: "基础信息" }),
      field("shortName", "简称", false, "text", { group: "基础信息" }),
      field("contactName", "联系人", false, "text", { group: "联系方式" }),
      field("contactPhone", "联系电话", false, "text", { group: "联系方式" }),
      field("contactEmail", "联系邮箱", false, "text", { group: "联系方式" }),
      field("address", "地址", false, "text", { group: "联系方式" }),
      field("settlementMethod", "结算方式", true, "text", {
        group: "结算信息",
        inputMode: "select",
        options: MASTER_DATA_FIELD_OPTIONS.settlementMethods,
      }),
      field("paymentTerms", "付款条件", false, "text", { group: "结算信息" }),
      field("productionCapacityNote", "产能说明", false, "text", {
        group: "生产信息",
        inputMode: "textarea",
      }),
      field("remark", "备注", false, "text", { group: "补充信息", inputMode: "textarea" }),
    ],
    key: "manufacturers",
    label: "生产厂家",
    nameField: "manufacturerName",
    readPermission: "master.manufacturer.read",
    updatePermission: "master.manufacturer.update",
  },
  {
    apiPath: "/api/v1/suppliers",
    codeField: "supplierCode",
    createPermission: "master.supplier.create",
    disablePermission: "master.supplier.disable",
    enablePermission: "master.supplier.enable",
    fields: [
      field("supplierCode", "供应商编码", true, "text", {
        group: "基础信息",
        helpText: "暂按 Frozen API 保留手填，自动编码等待 UAT-009 CR。",
      }),
      field("supplierName", "供应商名称", true, "text", { group: "基础信息" }),
      field("shortName", "简称", false, "text", { group: "基础信息" }),
      field("contactName", "联系人", false, "text", { group: "联系方式" }),
      field("contactPhone", "联系电话", false, "text", { group: "联系方式" }),
      field("contactEmail", "联系邮箱", false, "text", { group: "联系方式" }),
      field("address", "地址", false, "text", { group: "联系方式" }),
      field("settlementMethod", "结算方式", true, "text", {
        group: "结算信息",
        inputMode: "select",
        options: MASTER_DATA_FIELD_OPTIONS.settlementMethods,
      }),
      field("paymentTerms", "付款条件", false, "text", { group: "结算信息" }),
      field("taxIdentifier", "税号", false, "text", { group: "结算信息" }),
      field("bankName", "开户行", false, "text", { group: "银行信息" }),
      field("bankAccountName", "账户名称", false, "text", { group: "银行信息" }),
      field("bankAccountNo", "银行账号", false, "text", { group: "银行信息" }),
      field("remark", "备注", false, "text", { group: "补充信息", inputMode: "textarea" }),
    ],
    key: "suppliers",
    label: "供应商",
    nameField: "supplierName",
    readPermission: "master.supplier.read",
    updatePermission: "master.supplier.update",
  },
  {
    apiPath: "/api/v1/warehouses",
    codeField: "warehouseCode",
    createPermission: "master.warehouse.create",
    disablePermission: "master.warehouse.disable",
    enablePermission: "master.warehouse.enable",
    fields: [
      field("warehouseCode", "仓库编码", true, "text", {
        group: "仓库信息",
        helpText: "暂按 Frozen API 保留手填，自动编码等待 UAT-009 CR。",
      }),
      field("warehouseName", "仓库名称", true, "text", { group: "仓库信息" }),
      field("warehouseType", "仓库类型", true, "text", {
        group: "仓库信息",
        inputMode: "select",
        options: MASTER_DATA_FIELD_OPTIONS.warehouseTypes,
      }),
      field("ownerType", "责任主体", true, "text", {
        group: "责任主体",
        inputMode: "select",
        options: MASTER_DATA_FIELD_OPTIONS.ownerTypes,
      }),
      field("manufacturerId", "生产厂家", false, "text", {
        group: "责任主体",
        optionCodeField: "manufacturerCode",
        optionNameField: "manufacturerName",
        optionResource: "manufacturers",
        visibleWhen: { equals: "manufacturer", field: "ownerType" },
      }),
      field("countryCode", "国家代码", false, "text", {
        group: "地址信息",
        inputMode: "select",
        options: MASTER_DATA_FIELD_OPTIONS.countryCodes,
      }),
      field("province", "省份", false, "text", { group: "地址信息" }),
      field("city", "城市", false, "text", { group: "地址信息" }),
      field("address", "地址", false, "text", { group: "地址信息" }),
      field("contactName", "联系人", false, "text", { group: "联系方式" }),
      field("contactPhone", "联系电话", false, "text", { group: "联系方式" }),
      field("allowsAvailableStock", "允许形成可用库存", true, "boolean", {
        group: "库存规则",
      }),
      field("sortOrder", "显示顺序", true, "number", {
        defaultValue: "0",
        hidden: true,
        helpText: "默认 0；排序增强另行评估。",
      }),
    ],
    key: "warehouses",
    label: "仓库",
    nameField: "warehouseName",
    readPermission: "master.warehouse.read",
    updatePermission: "master.warehouse.update",
  },
  {
    apiPath: "/api/v1/stores",
    codeField: "storeCode",
    createPermission: "master.store.create",
    disablePermission: "master.store.disable",
    enablePermission: "master.store.enable",
    fields: [
      field("storeCode", "店铺编码", true, "text", {
        group: "店铺信息",
        helpText: "暂按 Frozen API 保留手填，自动编码等待 UAT-009 CR。",
      }),
      field("storeName", "店铺名称", true, "text", {
        group: "店铺信息",
        placeholder: "例如：Amazon US 官方店",
      }),
      field("platformId", "所属平台", true, "text", {
        group: "店铺信息",
        optionCodeField: "platformCode",
        optionNameField: "platformName",
        optionResource: "ecommerce-platforms",
      }),
      field("externalStoreId", "平台店铺标识", false, "text", {
        group: "店铺信息",
        helpText: "填写平台后台显示的店铺ID或店铺编号；没有可暂不填写。",
        placeholder: "例如：Amazon 后台店铺编号，可选",
      }),
      field("countryCode", "国家代码", true, "text", {
        group: "经营信息",
        inputMode: "select",
        options: MASTER_DATA_FIELD_OPTIONS.countryCodes,
      }),
      field("currencyCode", "业务币种", true, "text", {
        group: "经营信息",
        inputMode: "select",
        options: MASTER_DATA_FIELD_OPTIONS.currencies,
      }),
      field("operatorName", "运营负责人", false, "text", { group: "经营信息" }),
      field("remark", "备注", false, "text", { group: "补充信息", inputMode: "textarea" }),
    ],
    key: "stores",
    label: "店铺",
    nameField: "storeName",
    readPermission: "master.store.read",
    updatePermission: "master.store.update",
  },
];

export const SECURITY_WORKBENCHES: readonly WorkbenchDefinition[] = [
  {
    apiPath: "/api/v1/users",
    codeField: "username",
    createPermission: "security.user.create",
    disablePermission: "security.user.disable",
    enablePermission: "security.user.enable",
    fields: [
      field("username", "登录名", true),
      field("displayName", "显示姓名", true),
      field("email", "邮箱"),
      field("phone", "电话"),
      field("password", "初始密码", true, "password"),
      field("mustChangePassword", "首次登录修改密码", true, "boolean"),
      field("roleAssignments", "角色分配 JSON", true),
    ],
    key: "users",
    label: "用户",
    nameField: "displayName",
    readPermission: "security.user.read",
    updatePermission: "security.user.update",
  },
  {
    apiPath: "/api/v1/roles",
    codeField: "roleCode",
    createPermission: "security.role.create",
    disablePermission: "security.role.disable",
    enablePermission: "security.role.enable",
    fields: [
      field("roleCode", "角色代码", true),
      field("roleName", "角色名称", true),
      field("description", "角色说明"),
      field("isSystemRole", "系统角色", true, "boolean"),
    ],
    key: "roles",
    label: "角色",
    nameField: "roleName",
    readPermission: "security.role.read",
    updatePermission: "security.role.update",
  },
];

export function getWorkbenchDefinition(
  group: "master" | "security",
  key: string,
): WorkbenchDefinition | undefined {
  return (group === "master" ? MASTER_WORKBENCHES : SECURITY_WORKBENCHES).find(
    (item) => item.key === key,
  );
}
