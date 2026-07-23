import type { PermissionCode } from "@violin-erp/api";

export type WorkbenchField = Readonly<{
  key: string;
  label: string;
  required?: boolean;
  type?: "boolean" | "number" | "password" | "text";
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
): WorkbenchField => ({ key, label, required, type });

export const MASTER_WORKBENCHES: readonly WorkbenchDefinition[] = [
  {
    apiPath: "/api/v1/products",
    codeField: "productCode",
    createPermission: "master.product.create",
    disablePermission: "master.product.disable",
    enablePermission: "master.product.enable",
    fields: [
      field("productCode", "产品编码", true),
      field("productName", "产品名称", true),
      field("productNameEn", "英文名称"),
      field("categoryId", "产品分类 ID", true),
      field("brandId", "品牌 ID", true),
      field("productType", "产品类型", true),
      field("defaultUnit", "默认单位", true),
      field("description", "产品说明"),
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
      field("skuCode", "SKU 编码", true),
      field("skuName", "SKU 名称", true),
      field("productId", "所属产品 ID", true),
      field("size", "尺寸"),
      field("color", "颜色"),
      field("specification", "规格"),
      field("material", "材质"),
      field("unit", "计量单位", true),
      field("barcode", "条码"),
      field("defaultPurchasePrice", "默认采购价"),
      field("defaultProductionPrice", "默认生产价"),
      field("defaultSalePrice", "默认销售价"),
      field("safetyStockQuantity", "安全库存数量", true),
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
      field("categoryCode", "分类编码", true),
      field("categoryName", "分类名称", true),
      field("parentCategoryId", "上级分类 ID"),
      field("categoryLevel", "分类层级", true, "number"),
      field("sortOrder", "显示顺序", true, "number"),
      field("description", "说明"),
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
      field("brandCode", "品牌编码", true),
      field("brandName", "品牌名称", true),
      field("brandNameEn", "英文名称"),
      field("description", "说明"),
    ],
    key: "brands",
    label: "品牌",
    nameField: "brandName",
    readPermission: "master.brand.read",
    updatePermission: "master.brand.update",
  },
  {
    apiPath: "/api/v1/manufacturers",
    codeField: "manufacturerCode",
    createPermission: "master.manufacturer.create",
    disablePermission: "master.manufacturer.disable",
    enablePermission: "master.manufacturer.enable",
    fields: [
      field("manufacturerCode", "厂家编码", true),
      field("manufacturerName", "厂家名称", true),
      field("shortName", "简称"),
      field("contactName", "联系人"),
      field("contactPhone", "联系电话"),
      field("contactEmail", "联系邮箱"),
      field("address", "地址"),
      field("settlementMethod", "结算方式", true),
      field("paymentTerms", "付款条件"),
      field("productionCapacityNote", "产能说明"),
      field("remark", "备注"),
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
      field("supplierCode", "供应商编码", true),
      field("supplierName", "供应商名称", true),
      field("shortName", "简称"),
      field("contactName", "联系人"),
      field("contactPhone", "联系电话"),
      field("contactEmail", "联系邮箱"),
      field("address", "地址"),
      field("settlementMethod", "结算方式", true),
      field("paymentTerms", "付款条件"),
      field("taxIdentifier", "税号"),
      field("bankName", "开户行"),
      field("bankAccountName", "账户名称"),
      field("bankAccountNo", "银行账号"),
      field("remark", "备注"),
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
      field("warehouseCode", "仓库编码", true),
      field("warehouseName", "仓库名称", true),
      field("warehouseType", "仓库类型", true),
      field("ownerType", "责任主体类型", true),
      field("manufacturerId", "生产厂家 ID"),
      field("countryCode", "国家代码"),
      field("province", "省份"),
      field("city", "城市"),
      field("address", "地址"),
      field("contactName", "联系人"),
      field("contactPhone", "联系电话"),
      field("allowsAvailableStock", "允许形成可用库存", true, "boolean"),
      field("sortOrder", "显示顺序", true, "number"),
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
      field("storeCode", "店铺编码", true),
      field("storeName", "店铺名称", true),
      field("platformId", "所属平台 ID", true),
      field("externalStoreId", "外部店铺标识"),
      field("countryCode", "国家代码", true),
      field("currencyCode", "业务币种", true),
      field("operatorName", "运营负责人"),
      field("remark", "备注"),
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
