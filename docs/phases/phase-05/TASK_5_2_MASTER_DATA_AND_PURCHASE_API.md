---
document_name: Task 5.2 基础资料与采购 API
version: 1.0
status: Completed / Pending Approval
project: Violin ERP Lite
owner: Project Manager
related_phase: Phase 5
---

# Task 5.2：基础资料与采购管理 API 设计

## 1. 文档目的与范围

本文档定义基础资料与采购管理的 API 契约，供 PC 管理端与微信小程序共用。所有接口均遵守 Task 5.1 的 `/api/v1`、统一请求响应、认证、权限、状态、幂等、并发、错误码、日志和脱敏规范。

本 Task 覆盖：

- 基础资料：产品、SKU、产品分类、品牌、供应商、生产厂家、仓库、电商平台、店铺，以及销售出库客户快照的只读查询；
- 采购管理：采购订单、采购付款辅助记录、采购退货单，以及采购订单关联验收、入库、状态历史和执行进度的只读查询；
- 产品中的配件通过现有 `products.product_type` 与所属 SKU 表达，不建立独立配件资源；
- 产品与供应商、产品与生产厂家的既有关系在产品详情中只读返回，不重新定义关系；
- 采购验收写入、实际入库、实际退货出库、附件上传和正式 Excel 导入分别留待 Task 5.3、Task 5.4 和 Task 5.5。

本文件是接口契约设计，不创建真实 API Route，不编写业务代码，不修改数据库或页面。

## 2. 设计依据与对象映射

| API 模块 | 业务与状态来源 | Frozen 数据库来源 | 页面来源 | 权限来源 |
| --- | --- | --- | --- | --- |
| 产品、SKU | BR-001、BR-006、BR-017、BR-019 至 BR-021；Task 2.5 第 4 节 | `products`、`skus`、`product_categories`、`brands`、`product_suppliers`、`product_manufacturers` | Task 4.5 第 2、3 节 | `permissions`、`role_permissions` |
| 分类、品牌 | BR-001、BR-006 | `product_categories`、`brands` | Task 4.5 第 4、5 节 | `permissions`、`role_permissions` |
| 供应商、生产厂家 | BR-006、BR-025、BR-026 | `suppliers`、`manufacturers`、`product_suppliers`、`product_manufacturers` | Task 4.5 第 7 节及产品关联区 | `permissions`、`role_permissions`、字段权限 |
| 仓库 | BR-006、BR-011 至 BR-018 | `warehouses`、`role_warehouses` | Task 4.5 第 8 节 | `permissions`、`role_permissions`、`role_warehouses.access_level` |
| 电商平台、店铺 | BR-006、BR-013、BR-023、BR-024 | `ecommerce_platforms`、`stores`、`role_stores` | Task 4.5 第 9、10 节 | `permissions`、`role_permissions`、`role_stores.access_level` |
| 客户快照查询 | BR-023、BR-024、BR-035 | `outbound_orders.customer_name`、`recipient_country`、`recipient_address`、`store_id` | Task 4.5 第 11 节 | 店铺数据范围、个人信息字段权限 |
| 采购订单 | BR-006 至 BR-010、BR-025、BR-030；Task 2.5 第 2、3、5 节 | `purchase_orders`、`purchase_order_items`、`document_status_histories`、`approval_records`、`audit_logs` | Task 4.6 第 2 至 6 节 | 功能、操作、记录及金额字段权限 |
| 采购付款 | BR-025、BR-026 | `purchase_payments`、`purchase_orders`、`suppliers` | Task 4.6 第 9 节 | 付款记录权限、金额及敏感字段权限 |
| 采购退货 | BR-003、BR-004、BR-006、BR-009 | `purchase_returns`、`purchase_return_items`、来源采购及入库记录 | Task 4.6 第 8 节 | 功能、操作、仓库及记录权限 |
| 采购进度与关联查询 | BR-007 至 BR-009、BR-027 | 采购明细累计字段、`inspection_orders`、`inspection_order_items`、`inbound_orders`、`inbound_order_items`、`purchase_payments`、`purchase_returns` | Task 4.6 第 5、6 节 | 查询、金额、仓库及记录权限 |

接口字段使用 lowerCamelCase，并与上述 snake_case 字段一一映射。服务端派生字段必须在本文标为“派生”，不得成为客户端可写字段或平行事实来源。

## 3. API 模块目录与数量

### 3.1 基础资料资源目录

下表每个资源均应用 3.2 的 8 个通用操作，接口编号由“资源前缀 + 操作后缀”组成。例如产品列表为 `MD-PRD-01`，产品停用为 `MD-PRD-06`。

| 资源前缀 | 模块 | 基础路径 | Frozen 对象 | 对应页面 | 数据范围 |
| --- | --- | --- | --- | --- | --- |
| `MD-PRD` | 产品 | `/api/v1/products` | `products` | 产品管理 | 全局功能权限 |
| `MD-SKU` | SKU | `/api/v1/skus` | `skus` | SKU 管理 | 全局功能权限；敏感价格字段另校验 |
| `MD-CAT` | 产品分类 | `/api/v1/product-categories` | `product_categories` | 产品分类 | 全局功能权限 |
| `MD-BRD` | 品牌 | `/api/v1/brands` | `brands` | 品牌管理 | 全局功能权限 |
| `MD-SUP` | 供应商 | `/api/v1/suppliers` | `suppliers` | 供应商管理 | 全局功能权限；敏感字段另校验 |
| `MD-MFR` | 生产厂家 | `/api/v1/manufacturers` | `manufacturers` | 产品关联生产厂家 | 全局功能权限；联系字段另校验 |
| `MD-WHS` | 仓库 | `/api/v1/warehouses` | `warehouses` | 仓库管理 | `role_warehouses` 授权范围 |
| `MD-PLT` | 电商平台 | `/api/v1/ecommerce-platforms` | `ecommerce_platforms` | 销售平台管理 | 全局功能权限 |
| `MD-STR` | 店铺 | `/api/v1/stores` | `stores` | 店铺管理 | `role_stores` 授权范围 |

### 3.2 基础资料通用操作目录

`{basePath}` 与 `{prefix}` 取自 3.1。九个资源各有 8 个正式接口，共 72 个接口。

| 后缀 | 接口名称 | HTTP | 路径 | 使用端 | 权限 | 幂等 | 日志 | 状态变化 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `01` | 列表查询 | `GET` | `{basePath}` | PC、微信小程序 | 查看 | 不需要 | 仅敏感查询或异常 | 无 |
| `02` | 详情查询 | `GET` | `{basePath}/{id}` | PC、微信小程序 | 查看、字段权限 | 不需要 | 敏感字段查看需记录 | 无 |
| `03` | 新增 | `POST` | `{basePath}` | PC | 新增 | `Idempotency-Key` 必填 | 必记 | 创建启用资料 |
| `04` | 修改 | `PATCH` | `{basePath}/{id}` | PC | 编辑 | 不要求幂等键；使用 `updatedAt` 并发校验 | 必记 | 不允许修改启停状态 |
| `05` | 启用 | `POST` | `{basePath}/{id}/enable` | PC | 启用 | 必填 | 必记 | 停用 → 启用 |
| `06` | 停用 | `POST` | `{basePath}/{id}/disable` | PC | 停用 | 必填 | 必记 | 启用 → 停用 |
| `07` | 授权选择列表 | `GET` | `{basePath}/options` | PC、微信小程序 | 查看或业务选择 | 不需要 | 异常时记录 | 无 |
| `08` | 唯一性检查 | `GET` | `{basePath}/uniqueness` | PC | 新增或编辑 | 不需要 | 冲突可记录 | 无 |

正式接口编号集合为 `MD-PRD-01` 至 `MD-PRD-08`、`MD-SKU-01` 至 `MD-SKU-08`、`MD-CAT-01` 至 `MD-CAT-08`、`MD-BRD-01` 至 `MD-BRD-08`、`MD-SUP-01` 至 `MD-SUP-08`、`MD-MFR-01` 至 `MD-MFR-08`、`MD-WHS-01` 至 `MD-WHS-08`、`MD-PLT-01` 至 `MD-PLT-08`、`MD-STR-01` 至 `MD-STR-08`。

### 3.3 客户快照只读接口

| 编号 | 接口名称 | HTTP | 路径 | 使用端 | 权限与数据范围 | 日志 | 对应页面 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `MD-CUS-01` | 客户快照列表 | `GET` | `/api/v1/customer-snapshots` | PC | 客户快照查看、`role_stores`、个人信息字段权限 | 敏感查看与导出必记 | 客户资料 |
| `MD-CUS-02` | 客户快照详情 | `GET` | `/api/v1/customer-snapshots/{outboundOrderId}` | PC | 同上 | 必记敏感查看 | 客户资料、销售出库详情 |

客户快照只读来自 `outbound_orders`，不提供新增、修改、启用、停用或删除接口。

### 3.4 采购接口目录

| 编号 | 接口名称 | HTTP | 路径 | 使用端 | 权限/数据范围 | 幂等 | 日志 | 状态变化或备注 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `PUR-001` | 采购单列表 | `GET` | `/api/v1/purchase-orders` | PC、微信小程序 | 查看、记录范围、金额字段权限 | 否 | 异常时 | 无 |
| `PUR-002` | 采购单详情 | `GET` | `/api/v1/purchase-orders/{id}` | PC、微信小程序 | 查看、记录范围、金额字段权限 | 否 | 敏感查看时 | 无 |
| `PUR-003` | 创建采购单 | `POST` | `/api/v1/purchase-orders` | PC、微信小程序 | 创建 | 必填 | 必记 | 创建草稿 |
| `PUR-004` | 修改采购单 | `PATCH` | `/api/v1/purchase-orders/{id}` | PC、微信小程序 | 编辑、记录范围 | 否；`versionNo` 必填 | 必记 | 不改变状态 |
| `PUR-005` | 提交采购单 | `POST` | `/api/v1/purchase-orders/{id}/submit` | PC、微信小程序 | 提交 | 必填 | 必记 | 草稿/已驳回 → 待审核 |
| `PUR-006` | 撤回采购单 | `POST` | `/api/v1/purchase-orders/{id}/withdraw` | PC、微信小程序 | 提交人或获授权人员 | 必填 | 必记 | 待审核 → 草稿 |
| `PUR-007` | 审核通过 | `POST` | `/api/v1/purchase-orders/{id}/approve` | PC、微信小程序 | 审核；制单审核分离 | 必填 | 必记 | 待审核 → 已审核 |
| `PUR-008` | 审核驳回 | `POST` | `/api/v1/purchase-orders/{id}/reject` | PC、微信小程序 | 审核；制单审核分离 | 必填 | 必记 | 待审核 → 已驳回 |
| `PUR-009` | 反审核 | `POST` | `/api/v1/purchase-orders/{id}/unapprove` | PC | 反审核 | 必填 | 必记 | 已审核 → 草稿；无下游时 |
| `PUR-010` | 取消采购单 | `POST` | `/api/v1/purchase-orders/{id}/cancel` | PC、微信小程序 | 取消 | 必填 | 必记 | 草稿 → 已取消 |
| `PUR-011` | 作废采购单 | `POST` | `/api/v1/purchase-orders/{id}/void` | PC | 作废 | 必填 | 必记 | 已审核 → 已作废；无下游时 |
| `PUR-012` | 采购进度 | `GET` | `/api/v1/purchase-orders/{id}/progress` | PC、微信小程序 | 查看、金额及关联仓库权限 | 否 | 异常时 | 只读派生 |
| `PUR-013` | 关联验收查询 | `GET` | `/api/v1/purchase-orders/{id}/inspection-orders` | PC、微信小程序 | 采购与验收查看权限 | 否 | 异常时 | 只读；写入归 Task 5.3 |
| `PUR-014` | 关联入库查询 | `GET` | `/api/v1/purchase-orders/{id}/inbound-orders` | PC、微信小程序 | 采购、入库及仓库权限 | 否 | 异常时 | 只读；写入归 Task 5.4 |
| `PUR-015` | 状态时间线 | `GET` | `/api/v1/purchase-orders/{id}/status-history` | PC、微信小程序 | 查看 | 否 | 异常时 | 只读历史 |
| `PUR-016` | 导出采购单 | `POST` | `/api/v1/purchase-orders/export` | PC | 导出、记录与金额权限 | 必填 | 必记 | 无；导出当前授权查询结果 |
| `PUR-017` | 采购付款列表 | `GET` | `/api/v1/purchase-orders/{id}/payments` | PC | 付款查看、金额权限 | 否 | 敏感查看时 | 无 |
| `PUR-018` | 采购付款详情 | `GET` | `/api/v1/purchase-payments/{paymentId}` | PC | 付款查看、金额及敏感字段权限 | 否 | 必记敏感查看 | 无 |
| `PUR-019` | 创建采购付款记录 | `POST` | `/api/v1/purchase-orders/{id}/payments` | PC | 付款记录 | 必填 | 必记 | 新增付款事实；不改变采购完成状态 |
| `PUR-020` | 采购退货列表 | `GET` | `/api/v1/purchase-returns` | PC、微信小程序 | 退货查看、仓库范围 | 否 | 异常时 | 无 |
| `PUR-021` | 采购退货详情 | `GET` | `/api/v1/purchase-returns/{id}` | PC、微信小程序 | 退货查看、仓库范围 | 否 | 异常时 | 无 |
| `PUR-022` | 创建采购退货单 | `POST` | `/api/v1/purchase-returns` | PC | 退货创建、退货仓库操作权限 | 必填 | 必记 | 创建草稿；不减库存 |
| `PUR-023` | 修改采购退货单 | `PATCH` | `/api/v1/purchase-returns/{id}` | PC | 退货编辑、仓库范围 | 否；`versionNo` 必填 | 必记 | 不改变状态 |
| `PUR-024` | 提交采购退货单 | `POST` | `/api/v1/purchase-returns/{id}/submit` | PC | 退货提交 | 必填 | 必记 | 草稿/已驳回 → 待审核 |
| `PUR-025` | 审核采购退货单 | `POST` | `/api/v1/purchase-returns/{id}/approve` | PC | 退货审核、制单审核分离 | 必填 | 必记 | 待审核 → 已审核 |
| `PUR-026` | 驳回采购退货单 | `POST` | `/api/v1/purchase-returns/{id}/reject` | PC | 退货审核 | 必填 | 必记 | 待审核 → 已驳回 |
| `PUR-027` | 反审核采购退货单 | `POST` | `/api/v1/purchase-returns/{id}/unapprove` | PC | 退货反审核 | 必填 | 必记 | 已审核 → 草稿；未产生退货出库 |
| `PUR-028` | 取消采购退货单 | `POST` | `/api/v1/purchase-returns/{id}/cancel` | PC | 退货取消 | 必填 | 必记 | 草稿 → 已取消 |
| `PUR-029` | 作废采购退货单 | `POST` | `/api/v1/purchase-returns/{id}/void` | PC | 退货作废 | 必填 | 必记 | 已审核 → 已作废；未产生退货出库 |

接口数量：基础资料 74 个，采购管理 29 个，合计 103 个。

## 4. 基础资料通用请求与响应

### 4.1 列表、详情、选择和唯一性

列表统一支持 `page`、`pageSize`、`keyword`、`isActive`、`sortBy`、`sortOrder`。默认 `page=1`、`pageSize=20`，最大 100。`keyword` 仅搜索各资源已列明的编码、名称及安全的简称，不搜索银行账号、税号、完整联系方式或地址。

详情成功响应返回资源字段及 `id`、`isActive`、`createdAt`、`createdBy`、`updatedAt`、`updatedBy`、`disabledAt`、`disabledBy`。无权查看的敏感字段不返回；需要保留布局时返回脱敏值和 `masked: true`，不得返回原值。

选择接口只返回 `id`、编码、名称、必要归属、规格摘要和启用状态；默认只返回启用资料。`includeInactive=true` 仅供历史查询且需查看权限。仓库和店铺选择在查询前应用角色授权范围。

唯一性检查参数为 `field`、`value`、可选 `excludeId` 和资源特定作用域，响应为 `isUnique`、`normalizedValue`。服务端最终仍以 Frozen 唯一约束为准；检查成功不保证后续并发创建一定成功。

### 4.2 写入与引用保护

- 新增请求只接收资源业务字段，不接收 `id`、创建更新字段、停用字段或库存字段；
- 修改请求必须提交读取到的 `updatedAt`，服务端条件更新；冲突返回 `409 CONFLICT_MASTER_DATA_MODIFIED`；
- 启用/停用动作体包含 `updatedAt`，停用另含必填 `reason`；操作人和时间由服务端记录；
- 已被业务引用的基础资料不提供 `DELETE`；停用后历史记录可继续显示，但不得进入新业务选择列表；
- 供应商或生产厂家被引用后，编码与影响历史识别的关键语义不得随意修改；历史单据快照不回写；
- 仓库存在库存、流水或单据引用时不得改变破坏历史的仓库类型、厂家归属或国家语义；
- 店铺存在销售业务后不得改变其平台归属；
- 启用时重新校验所有必填字段、关联资料及 Frozen Check 规则。

## 5. 产品及 SKU 接口契约

### 5.1 产品字段

产品请求字段：`productCode`、`productName`、`productNameEn`、`categoryId`、`brandId`、`productType`、`description`、`defaultUnit`。响应另返回分类和品牌的安全摘要，以及只读 `skuCount`、`supplierRelations`、`manufacturerRelations`（均由 Frozen 关系派生）。

产品列表支持 `categoryId`、`brandId`、`productType`、`isActive`；可排序字段为 `productCode`、`productName`、`createdAt`、`updatedAt`，默认 `updatedAt desc, id desc`。

### 5.2 SKU 字段

SKU 请求字段：`skuCode`、`skuName`、`productId`、`size`、`color`、`specification`、`material`、`unit`、`barcode`、`defaultPurchasePrice`、`defaultProductionPrice`、`defaultSalePrice`、`safetyStockQuantity`。响应另返回所属产品、分类和品牌摘要。

SKU 列表支持 `productId`、`categoryId`、`brandId`、`isActive`；`keyword` 搜索 SKU 编码、名称和规格。价格字段仅向具备价格权限的用户返回。可排序字段为 `skuCode`、`skuName`、`safetyStockQuantity`、`createdAt`、`updatedAt`。

SKU 选择接口支持可选 `usage=purchase|production|inventory|cross_border`、`supplierId`、`manufacturerId`。这些参数只根据现有启用状态及 `product_suppliers`、`product_manufacturers` 关系过滤，不创建新的关系，不返回库存余额；库存可用量由相应库存接口提供。

### 5.3 编码及业务规则

- `productCode` 为 `STRING(50)`，`skuCode` 为 `STRING(100)`，均按不区分大小写原则唯一；
- `barcode` 仅在非空时唯一；
- 分类、品牌、产品必须存在且启用；
- `safetyStockQuantity` 及三类默认价格为空或不小于 0，数量和价格均为十进制定点字符串；
- 创建或修改 SKU 不创建或修改 `inventories`、`inventory_transactions`；
- SKU 已被业务引用后不得物理删除；停用后不得用于新采购、生产、库存或跨境业务；
- 套装和配件仍是产品及 SKU，不拆分为新资源，也不改变既有关系。

## 6. 分类、品牌、供应商与生产厂家契约

### 6.1 产品分类与品牌

分类字段：`categoryCode`、`categoryName`、`parentCategoryId`、`categoryLevel`、`sortOrder`、`description`。分类列表另支持树形响应 `children`；服务端校验父级存在、启用、层级从 1 开始且不得循环。唯一性范围为分类编码全局唯一、同一父分类下分类名称唯一。

品牌字段：`brandCode`、`brandName`、`brandNameEn`、`description`。品牌编码和中文名称分别唯一。

### 6.2 供应商

供应商字段：`supplierCode`、`supplierName`、`shortName`、`contactName`、`contactPhone`、`contactEmail`、`address`、`settlementMethod`、`paymentTerms`、`taxIdentifier`、`bankName`、`bankAccountName`、`bankAccountNo`、`remark`。

列表默认不返回银行账号、税号和完整地址。普通查看者的电话、邮箱只返回脱敏值；具备敏感字段查看权限者可在详情查看原值，并记录审计日志。银行、税务字段修改必须单独记录变更摘要，日志不得保存完整原值。

### 6.3 生产厂家

生产厂家字段：`manufacturerCode`、`manufacturerName`、`shortName`、`contactName`、`contactPhone`、`contactEmail`、`address`、`settlementMethod`、`paymentTerms`、`productionCapacityNote`、`remark`。

供应商与生产厂家是不同 Frozen 对象。接口不自动同步、不合并身份，也不因名称相同建立关系。两者被采购或生产业务引用后，修改不得覆盖历史快照；停用只禁止新业务选择。

## 7. 仓库接口契约

仓库字段：`warehouseCode`、`warehouseName`、`warehouseType`、`ownerType`、`manufacturerId`、`countryCode`、`province`、`city`、`address`、`contactName`、`contactPhone`、`allowsAvailableStock`、`sortOrder`。

仓库列表支持 `warehouseType`、`manufacturerId`、`countryCode`、`isActive`，但服务端必须先按 `role_warehouses` 过滤。选择接口只返回用户获得只读、操作或管理授权的仓库，并返回当前有效 `accessLevel`；客户端传入仓库 ID 不能扩大范围。

厂家仓必须关联有效生产厂家；海外仓必须有两位国家代码；在途仓和待处理仓不得允许形成可用库存。已存在库存、流水或业务单据引用时，禁止修改仓库类型、厂家归属或其他破坏历史语义的字段。任何仓库资料接口均不得直接修改库存。

## 8. 电商平台与店铺接口契约

电商平台字段：`platformCode`、`platformName`、`platformType`、`countryCode`、`isCrossBorder`、`description`。平台编码和名称分别唯一。

店铺字段：`storeCode`、`storeName`、`platformId`、`externalStoreId`、`countryCode`、`currencyCode`、`operatorName`、`remark`。店铺编码全局唯一；`externalStoreId` 非空时在平台范围唯一。店铺列表支持 `platformId`、`countryCode`、`currencyCode`、`isActive`，并在查询前应用 `role_stores`。

授权店铺选择接口返回 `id`、`storeCode`、`storeName`、平台摘要、国家、币种和 `accessLevel`。Frozen 数据库不存在平台账号、密码、Token、API Key 或密钥字段，任何店铺接口不得接收或返回此类字段。

## 9. 采购单查询接口

### 9.1 列表 Query

`PUR-001` 支持：

- `documentNo`、`keyword`；`keyword` 搜索采购单号、供应商编码/名称快照、SKU 编码/名称快照；
- `status`、`approvalStatus`、`supplierId`、`skuId`、`productId`；
- `documentDateFrom`、`documentDateTo`、`expectedDeliveryDateFrom`、`expectedDeliveryDateTo`，边界均包含；
- `createdBy`、`approvedBy`；
- `dueState=normal|due_soon|overdue` 为基于预计交付日和完成事实的派生筛选，不写入状态；
- 通用分页和排序；允许排序 `documentNo`、`documentDate`、`expectedDeliveryDate`、`totalQuantity`、`totalAmount`、`createdAt`、`updatedAt`。

不提供 `manufacturerId` 筛选。采购单与生产单平行且采购单无厂家关联，禁止通过产品厂家关系伪造采购单厂家归属。

### 9.2 列表响应

每项返回：`id`、`documentNo`、`documentDate`、`status`、`approvalStatus`、供应商 ID/编码/名称快照、`expectedDeliveryDate`、`currencyCode`、`totalQuantity`、`subtotalAmount`、`taxAmount`、`totalAmount`、`paidAmount`、`unpaidAmount`、`versionNo`、`createdAt`、`createdBy`、`approvedAt`、`approvedBy`，以及派生的 `skuCount`、`receivedQuantity`、`inspectedQuantity`、`qualifiedQuantity`、`inboundQuantity`、`returnedQuantity`、`dueState`。

无金额权限时不返回单价、税额、总额、已付和未付金额，也不得通过排序、筛选、错误详情或导出推断其值。

### 9.3 详情响应

`PUR-002` 返回主表全部允许字段、提交/审核/取消操作字段、创建更新字段和明细。每条明细返回：`id`、`lineNo`、`skuId`、SKU 编码/名称/规格快照、`quantity`、`unitPrice`、`taxRate`、`taxAmount`、`lineAmount`、`expectedDeliveryDate`、五类累计进度数量、`remark`、创建更新时间。关联验收、入库、付款、退货、状态历史和审计通过独立接口按权限加载。

采购单本身没有仓库或店铺字段；列表和详情不得伪造仓库/店铺归属。关联验收、入库查询必须分别执行对应仓库权限。

## 10. 创建采购单接口

### 10.1 请求

`POST /api/v1/purchase-orders`

必需 Header：`Authorization`、`Content-Type`、`Accept`、`Idempotency-Key`；建议 `X-Request-ID`、`X-Client-Type`。

Request Body：

| 字段 | 必填 | 规则与来源 |
| --- | --- | --- |
| `documentDate` | 是 | `YYYY-MM-DD` |
| `supplierId` | 是 | 启用供应商 UUID |
| `expectedDeliveryDate` | 是 | 不早于单据日期 |
| `settlementMethod` | 是 | Frozen 受控值 |
| `paymentTermsSnapshot` | 否 | 最长按普通备注边界；可由供应商资料带入后确认 |
| `remark` | 否 | 最长 1000 |
| `items` | 是 | 非空数组 |
| `items[].skuId` | 是 | 启用 SKU UUID |
| `items[].quantity` | 是 | `DECIMAL(18,4)` 字符串且大于 0 |
| `items[].unitPrice` | 是 | `DECIMAL(18,4)` 字符串且不小于 0 |
| `items[].taxRate` | 是 | `DECIMAL(7,4)` 字符串，0 至 100 |
| `items[].expectedDeliveryDate` | 否 | 不早于单据日期 |
| `items[].remark` | 否 | 最长 1000 |

服务端生成 `id`、`documentNo`、行号、供应商和 SKU 快照、`currencyCode=CNY`、金额、累计数量、初始状态、创建信息及 `versionNo=1`。客户端不得提交这些服务端字段。

金额统一由服务端使用定点数重算：`lineAmount = quantity × unitPrice`，行 `taxAmount = lineAmount × taxRate / 100`，主表 `subtotalAmount`、`taxAmount`、`totalAmount` 分别为行金额、行税额及二者合计；每步保留 Frozen 四位小数精度。客户端显示值不作为正式金额。

同一 SKU 可因单价或交付日期不同存在多行，服务端不自动合并；每行使用独立 `lineNo`。供应商、SKU 或关联产品停用时拒绝创建。

### 10.2 编号、状态与响应

采购单号由服务端按既有 `PO` 业务前缀、业务日期和并发安全顺序生成，并满足 `purchase_orders.document_no` 唯一；客户端不得指定。具体序列实现留待技术阶段，不新增字段。

初始审核状态为草稿，付款为未付款，累计到货、验收、合格、入库、退货和已付金额为 0。成功返回 `201`、新采购单详情和 `requestId`。

## 11. 修改采购单接口

`PUR-004` 仅允许草稿或已驳回状态调用。请求可包含 `supplierId`、`documentDate`、`expectedDeliveryDate`、`settlementMethod`、`paymentTermsSnapshot`、`remark`、`items` 和必填 `versionNo`。

明细规则：

- 已存在行用 `id` 标识并更新允许字段；新行不带 `id`；移除行通过完整 `items` 集合表达；
- 服务端重新生成连续 `lineNo` 并重算快照、金额和合计；
- `documentNo`、状态、提交审核字段、累计进度、付款汇总、创建字段不得修改；
- 已产生验收、入库、付款、退货或其他下游记录时，禁止修改供应商、SKU、数量、价格、税率、交付日期或删除关联行；
- 修改接口不得接受 `status`、`approvalStatus` 或任意目标状态；
- 服务端以 `id + versionNo + 当前状态` 条件更新并原子递增版本；旧页面返回 `409 CONFLICT_VERSION_MISMATCH`；
- 成功写入 `audit_logs` 的安全变更摘要，不覆盖状态、审批或历史快照。

## 12. 提交与撤回接口

`PUR-005` 请求体只含 `versionNo`。服务端重新校验草稿/已驳回状态、提交权限、供应商、明细、SKU、数量、价格、税额、金额、日期、数据完整性及无并发修改。相同幂等键和请求重复返回首次结果，不重复写状态历史。

`PUR-006` 请求体含 `versionNo`、可选 `reason`。只允许待审核且尚未审核的采购单，由原提交人或有撤回权限者执行，目标为草稿。撤回必须写状态历史和审计日志。

## 13. 审核、驳回与反审核接口

`PUR-007` 请求体为 `versionNo`、可选 `approvalComment`。只允许待审核状态；审核人不得与制单人相同，且必须具备审核及记录范围权限。采购单没有仓库或店铺归属，不得伪造范围；后续仓库业务另行校验。成功写入 `approvedAt`、`approvedBy`、`approval_records`、状态历史和审计日志。

`PUR-008` 请求体为 `versionNo`、必填 `approvalComment`，目标为已驳回。驳回不删除采购单或明细。

Task 2.5 明确允许在未形成库存流水或后续关联单据时反审核，因此提供 `PUR-009`。请求体含 `versionNo`、必填 `reason`。仅允许已审核状态，且不得存在验收、入库、付款、采购退货、库存流水或其他下游记录。成功恢复至草稿并只追加反审核记录。存在下游时返回 `409 STATE_PURCHASE_ORDER_DOWNSTREAM_EXISTS`，不得自动撤销下游。

## 14. 取消与作废接口

- `PUR-010`：草稿采购单可取消；请求含 `versionNo`、必填 `reason`；目标为已取消；
- `PUR-011`：已审核但尚无任何下游业务的采购单可作废；请求含 `versionNo`、必填 `reason`；目标为已作废；
- 待审核单应先撤回再取消；已驳回单应恢复编辑后按草稿规则取消；
- 已完成、已取消、已作废或已有下游记录的采购单不得取消或作废；
- 取消与作废分别记录动作、原因、状态历史和审计日志，不合并为同一接口；
- “关闭”不是 Task 2.5 的采购正式状态，本 Task 不提供关闭接口。

采购退货的提交、审核、驳回、反审核、取消、作废复用同一原则；反审核或作废前额外校验未产生实际退货出库和库存流水。

## 15. 采购付款与采购退货契约

### 15.1 采购付款

`PUR-019` 请求字段：`paymentDate`、`paymentAmount`、`paymentMethod`、`bankReferenceNo`、`payeeAccountSnapshot`、`attachmentRequired`、`remark`。服务端从采购单派生 `purchaseOrderId`、`supplierId`、`currencyCode=CNY`，生成 `paymentNo`，校验付款金额大于 0、累计付款不超过采购总额，并按 Task 2.5 付款状态更新采购付款进度。付款状态不改变采购完成状态。

已创建付款事实不提供普通修改或删除接口。纠错、退款及附件上传需等待上游明确流程或 Task 5.5 通用附件接口，不得覆盖原记录。付款账户快照、银行参考号、金额按权限脱敏和审计。

### 15.2 采购退货

采购退货创建字段：`documentDate`、`supplierId`、`purchaseOrderId`、`sourceInboundOrderId`、`returnWarehouseId`、`returnReason`、`remark`、`items`。明细字段：`purchaseOrderItemId`、`sourceInboundOrderItemId`、`skuId`、`quantity`、`unitPrice`、`returnReason`、`inventoryCondition`、`remark`。

服务端生成编号、SKU 快照、行号、行金额和总量总额。供应商必须与原采购单一致，来源入库必须属于原采购业务，SKU 和来源明细必须一致，退货数量不得超过合法可退量，退货仓库必须在用户操作权限内。

创建、提交和审核采购退货均不得减少库存；实际退货出库归 Task 5.4。已产生退货出库后，退货单不得反审核、作废、删除或修改关键字段。

## 16. 采购进度及关联查询

`PUR-012` 返回订单级和明细级：

- 正式字段汇总：`orderedQuantity`、`receivedQuantity`、`inspectedQuantity`、`qualifiedQuantity`、`inboundQuantity`、`returnedQuantity`、`paidAmount`、`unpaidAmount`；
- 派生数量：`remainingToReceiveQuantity`、`remainingToInspectQuantity`、`remainingToInboundQuantity`；
- 派生状态：交付、验收入库和付款展示状态，严格依据 Task 2.5 状态语义和正式记录计算，不写回新字段；
- 关联数量：验收单、入库单、付款、退货记录数量；
- 状态时间线摘要。

累计字段是业务进度快照；验收、入库、付款、退货等正式事实必须以对应正式记录复核。客户端不得上传或修改任何进度汇总。

采购与委外生产为平行业务，Frozen 数据库不存在采购单到生产单关系，因此不返回 `producedQuantity` 或关联生产任务。`PUR-013` 和 `PUR-014` 只查询正式验收和入库记录，不包含写接口。

## 17. 权限与数据范围矩阵

下表只使用 PROJECT 已确认角色，不新增角色。实际授权仍由 `roles`、`permissions`、关联表及有效期决定，角色名称不替代后端权限计算。

| 操作 | 管理员 | 采购人员 | 仓库人员 | 销售人员 | 公司负责人 |
| --- | --- | --- | --- | --- | --- |
| 基础资料查看 | 按授权 | 按授权 | 按授权仓库 | 按授权店铺 | 按授权 |
| 基础资料新增/修改/启停 | 按授权 | 供应商、产品等按授权 | 仓库资料按授权 | 店铺资料按授权 | 默认只读，另授权除外 |
| 采购查看 | 全范围需正式授权 | 按记录范围 | 仅关联仓库记录 | 默认无，另授权除外 | 按授权汇总/明细 |
| 采购创建/修改/提交 | 按授权 | 按授权 | 无 | 无 | 默认无 |
| 采购审核/反审核 | 按授权且职责分离 | 仅有审核权限且非制单人 | 无 | 无 | 按授权且职责分离 |
| 取消/作废 | 按授权 | 按授权 | 无 | 无 | 按授权 |
| 采购付款查看/记录 | 敏感及金额权限 | 按金额/付款权限 | 无 | 无 | 按金额权限 |
| 采购退货 | 按授权 | 创建/业务审核按授权 | 仓库范围内查看，实际出库归 Task 5.4 | 无 | 按授权查看/审核 |
| 导出 | 按导出、金额、字段权限 | 按授权范围 | 按关联范围 | 默认无 | 按授权范围 |
| 敏感信息查看 | 字段权限必需 | 业务必要字段权限 | 最小必要 | 最小必要 | 字段权限必需 |

任何角色均不得绕过仓库、店铺、金额、字段或记录范围。销售人员和仓库人员未获采购权限时不得因知道 ID 而访问采购记录。

## 18. 状态转换矩阵

| 当前状态 | 动作/接口 | 目标状态 | 权限 | 前置条件 | 禁止条件 | 错误码 | 日志 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 草稿、已驳回 | 提交 `PUR-005` | 待审核 | 提交 | 明细完整、资料有效、版本一致 | 空明细、资料停用 | `STATE_PURCHASE_ORDER_ACTION_NOT_ALLOWED` 等 | 是 |
| 待审核 | 撤回 `PUR-006` | 草稿 | 提交人/撤回 | 尚未审核 | 已被审核 | `CONFLICT_PURCHASE_ORDER_APPROVAL` | 是 |
| 待审核 | 审核 `PUR-007` | 已审核 | 审核 | 制单审核分离 | 同人审核、版本冲突 | `PERMISSION_DUTY_SEPARATION_REQUIRED` | 是 |
| 待审核 | 驳回 `PUR-008` | 已驳回 | 审核 | 意见完整 | 状态已变化 | `CONFLICT_PURCHASE_ORDER_APPROVAL` | 是 |
| 已审核 | 反审核 `PUR-009` | 草稿 | 反审核 | 原因完整且无下游 | 验收、入库、付款、退货、流水存在 | `STATE_PURCHASE_ORDER_DOWNSTREAM_EXISTS` | 是 |
| 草稿 | 取消 `PUR-010` | 已取消 | 取消 | 原因完整 | 已提交或有下游 | `STATE_PURCHASE_ORDER_ACTION_NOT_ALLOWED` | 是 |
| 已审核 | 作废 `PUR-011` | 已作废 | 作废 | 原因完整且无下游 | 已完成或有下游 | `STATE_PURCHASE_ORDER_DOWNSTREAM_EXISTS` | 是 |
| 已审核 | 系统完成判定 | 已完成 | 系统事务 | 满足 Task 2.5 采购完成条件 | 未交、未验、未入库或异常未结 | `STATE_PURCHASE_ORDER_INCOMPLETE` | 是 |
| 已完成/已取消/已作废 | 查询 | 不变 | 查看 | 有权访问 | 任何写动作 | `STATE_PURCHASE_ORDER_READ_ONLY` | 查询异常/敏感查看按规则 |

客户端不得提交目标状态。每次转换在同一原子边界内更新当前状态、版本、状态历史、审批记录和审计日志。

## 19. 数据校验规则

- ID 使用 UUID；日期使用 `YYYY-MM-DD`；时间使用带时区 ISO 8601；
- 普通编码最长 50，SKU 编码最长 100，中文名称最长 200，英文名称最长 300，电话最长 50，邮箱最长 254，地址最长 500，备注最长 1000；
- 数量、金额、单价为 `DECIMAL(18,4)` 字符串，税率为 `DECIMAL(7,4)`；
- 明细不能为空，`lineNo >= 1`，基础数量必须大于 0，普通金额和累计数量不得为负；
- `expectedDeliveryDate` 不早于 `documentDate`；行预计交付日不早于单据日期；
- `paidAmount <= totalAmount` 且 `unpaidAmount = totalAmount - paidAmount`；
- 编码按 Frozen 大小写判重；外键对象必须存在、归属正确、启用且可被当前用户选择；
- 分类循环、供应商/厂家身份混用、仓库类型条件、平台店铺归属均由服务层再次校验；
- 同一采购单允许同一 SKU 多行；服务端不得擅自合并，客户端应明确展示各行价格和交付日期；
- 数据库 Check、唯一约束和外键仍是最终一致性保护，接口预校验不能替代数据库约束。

## 20. 幂等与并发

| 操作 | `Idempotency-Key` | 并发条件 |
| --- | --- | --- |
| 基础资料创建、启用、停用 | 必填 | `updatedAt`、唯一约束、事务 |
| 采购单/退货单创建 | 必填 | 幂等范围、单据编号唯一、事务 |
| 提交、撤回、审核、驳回、反审核、取消、作废 | 必填 | `versionNo`、当前状态、条件更新、事务 |
| 采购付款创建 | 必填 | 幂等范围、付款编号唯一、累计金额条件校验、事务 |
| 普通主数据修改 | 不要求 | `updatedAt` 条件更新 |
| 采购单/退货单修改 | 不要求 | `versionNo` 条件更新并递增 |

本 Task 不新增幂等表或版本字段。幂等持久化实现若无法使用已批准的技术机制且需要改变 Frozen 数据库，必须另行提出 DCR。

## 21. Task 5.2 业务错误码

| 错误码 | HTTP | 含义 |
| --- | --- | --- |
| `RESOURCE_MASTER_DATA_NOT_FOUND` | 404 | 基础资料不存在或不可见 |
| `RESOURCE_MASTER_DATA_INACTIVE` | 422 | 基础资料已停用，不能用于新业务 |
| `CONFLICT_MASTER_DATA_CODE_DUPLICATE` | 409 | 编码或受控唯一值重复 |
| `CONFLICT_MASTER_DATA_MODIFIED` | 409 | 基础资料已被其他请求修改 |
| `STATE_MASTER_DATA_REFERENCED` | 409 | 被正式业务引用，禁止破坏性修改 |
| `PERMISSION_WAREHOUSE_DENIED` | 403 | 无仓库访问或操作权限 |
| `PERMISSION_STORE_DENIED` | 403 | 无店铺访问权限 |
| `PERMISSION_SENSITIVE_FIELD_DENIED` | 403 | 无敏感字段查看或修改权限 |
| `PERMISSION_AMOUNT_FIELD_DENIED` | 403 | 无金额字段权限 |
| `PERMISSION_DUTY_SEPARATION_REQUIRED` | 403 | 制单人与审核人职责未分离 |
| `RESOURCE_PURCHASE_ORDER_NOT_FOUND` | 404 | 采购单不存在或不可见 |
| `STATE_PURCHASE_ORDER_ACTION_NOT_ALLOWED` | 422 | 当前状态不允许操作 |
| `STATE_PURCHASE_ORDER_DOWNSTREAM_EXISTS` | 409 | 已存在验收、入库、付款、退货或库存后续业务 |
| `STATE_PURCHASE_ORDER_INCOMPLETE` | 422 | 尚未满足采购完成条件 |
| `STATE_PURCHASE_ORDER_READ_ONLY` | 422 | 终态采购单只读 |
| `VALIDATION_PURCHASE_ORDER_ITEMS_REQUIRED` | 422 | 采购明细为空 |
| `VALIDATION_PURCHASE_ORDER_DATE_RANGE` | 422 | 采购日期关系不合法 |
| `VALIDATION_PURCHASE_ORDER_AMOUNT_MISMATCH` | 422 | 请求显示金额与服务端重算不一致 |
| `RESOURCE_PURCHASE_SUPPLIER_INVALID` | 422 | 供应商不存在、停用或无效 |
| `RESOURCE_PURCHASE_SKU_INVALID` | 422 | SKU 或所属产品不存在、停用或无效 |
| `CONFLICT_PURCHASE_ORDER_DUPLICATE_SUBMISSION` | 409 | 重复提交或幂等键复用冲突 |
| `CONFLICT_PURCHASE_ORDER_APPROVAL` | 409 | 审核状态竞争或重复审核 |
| `CONFLICT_VERSION_MISMATCH` | 409 | 单据版本冲突 |
| `VALIDATION_PAYMENT_AMOUNT_EXCEEDED` | 422 | 付款后累计金额超过采购总额 |
| `RESOURCE_PURCHASE_RETURN_SOURCE_INVALID` | 422 | 采购退货来源采购或入库记录无效 |
| `VALIDATION_PURCHASE_RETURN_QUANTITY_EXCEEDED` | 422 | 退货数量超过合法可退数量 |

错误响应必须使用 Task 5.1 统一结构，字段级错误放入安全的 `details`，不得包含 SQL、堆栈、完整敏感值或内部路径。

## 22. 日志与脱敏

- 基础资料新增、修改、启用、停用；采购单和退货单创建、修改、提交、撤回、审核、驳回、反审核、取消、作废；采购付款创建；敏感查看和导出均记录 `audit_logs`；
- 状态变化写 `document_status_histories`，审核、驳回、反审核写 `approval_records`；
- 日志关联操作人、时间、模块、对象、对象编号快照、动作、结果、`requestId` 与必要变更摘要；
- 供应商银行账号、税号、付款账户快照、联系方式、客户姓名和地址按最小必要原则脱敏；
- 无权限时不得通过搜索、排序、唯一性检查、错误信息或导出推断原值；
- 密码、Token、Cookie、密钥、完整银行账号、完整联系方式和完整地址不得写入日志。

## 23. 接口示例

### 23.1 采购单列表

```http
GET /api/v1/purchase-orders?page=1&pageSize=20&supplierId=018f0000-0000-7000-8000-000000000001&approvalStatus=approved&sortBy=expectedDeliveryDate&sortOrder=asc
```

```json
{
  "success": true,
  "data": [{
    "id": "018f0000-0000-7000-8000-000000000010",
    "documentNo": "PO-20260721-0001",
    "documentDate": "2026-07-21",
    "approvalStatus": "approved",
    "supplierId": "018f0000-0000-7000-8000-000000000001",
    "supplierCodeSnapshot": "SUP001",
    "supplierNameSnapshot": "示例供应商",
    "expectedDeliveryDate": "2026-08-21",
    "currencyCode": "CNY",
    "totalQuantity": "10.0000",
    "receivedQuantity": "0.0000",
    "inboundQuantity": "0.0000",
    "versionNo": 1
  }],
  "meta": {"page": 1, "pageSize": 20, "total": 1, "totalPages": 1},
  "requestId": "req-20260721-001"
}
```

### 23.2 创建采购单

```json
{
  "documentDate": "2026-07-21",
  "supplierId": "018f0000-0000-7000-8000-000000000001",
  "expectedDeliveryDate": "2026-08-21",
  "settlementMethod": "bank_transfer",
  "remark": "采购备注",
  "items": [{
    "skuId": "018f0000-0000-7000-8000-000000000002",
    "quantity": "10.0000",
    "unitPrice": "100.0000",
    "taxRate": "13.0000"
  }]
}
```

### 23.3 修改采购单

```json
{
  "versionNo": 1,
  "expectedDeliveryDate": "2026-08-25",
  "items": [{
    "id": "018f0000-0000-7000-8000-000000000011",
    "skuId": "018f0000-0000-7000-8000-000000000002",
    "quantity": "12.0000",
    "unitPrice": "100.0000",
    "taxRate": "13.0000"
  }]
}
```

### 23.4 提交与审核

```json
{"versionNo": 2}
```

```json
{"versionNo": 3, "approvalComment": "审核通过"}
```

### 23.5 失败响应

```json
{
  "success": false,
  "error": {
    "code": "CONFLICT_VERSION_MISMATCH",
    "message": "采购单已被其他用户修改，请刷新后重试",
    "details": []
  },
  "requestId": "req-20260721-009"
}
```

示例只使用 Frozen 字段、其 lowerCamelCase 映射或明确标注的服务端派生值，不代表真实业务数据。

## 24. 页面与接口映射

| Approved 页面/操作 | 当前接口 | 权限/状态 | 响应或异常 |
| --- | --- | --- | --- |
| 产品、SKU、分类、品牌、供应商、仓库、平台、店铺列表与详情 | 对应 `*-01`、`*-02` | 查看及数据范围 | 列表、详情；无权返回 403/404 |
| 上述资料新增、编辑、启停 | 对应 `*-03` 至 `*-06` | 维护、当前启停状态 | 资源详情；引用冲突返回 409 |
| 业务表单选择资料 | 对应 `*-07` | 查看/选择、仓库/店铺范围 | 精简启用选项 |
| 编码唯一性校验 | 对应 `*-08` | 新增/编辑 | `isUnique`；并发仍可能 409 |
| 客户资料查询 | `MD-CUS-01`、`MD-CUS-02` | 店铺及个人字段权限 | 脱敏快照、来源出库标识 |
| 采购订单列表、详情、新增、编辑 | `PUR-001` 至 `PUR-004` | 采购查看/维护 | 采购单及明细 |
| 提交、审核通过、审核驳回 | `PUR-005`、`PUR-007`、`PUR-008` | 状态、职责分离 | 新状态和版本；冲突提示刷新 |
| 反审核、取消、作废 | `PUR-009` 至 `PUR-011` | 无下游、原因、权限 | 新状态；有下游返回 409 |
| 执行跟踪、到货/验收/入库展示 | `PUR-012` 至 `PUR-014` | 采购、验收、入库、仓库权限 | 正式记录汇总；只读 |
| 状态历史、操作审计 | `PUR-015` 及后续通用审计查询 | 查看/审计权限 | 只追加历史 |
| 导出 | `PUR-016` | 导出、金额、字段及记录权限 | 授权范围文件或异步结果 |
| 采购付款 | `PUR-017` 至 `PUR-019` | 付款及金额权限 | 付款记录、采购付款汇总 |
| 采购退货 | `PUR-020` 至 `PUR-029` | 退货、仓库、状态权限 | 退货单；实际出库另行处理 |
| 采购验收编辑/确认 | Task 5.3 | 验收权限和来源状态 | 本 Task 只提供关联查询，不提前设计写接口 |
| 采购入库、退货出库 | Task 5.4 | 仓库、库存和单据状态 | 本 Task 不提前设计库存写接口 |
| 导入与附件上传 | Task 5.5 | 导入/附件权限 | 本 Task 不提前设计通用接口 |

已批准页面中的“采购类型”“采购负责人”“独立到货登记”“关闭”和可编辑计量单位未能映射 Frozen 字段或状态，按第 26 节停止冲突设计，不以临时接口字段替代。

## 25. 范围排除

本 Task 不包含：

- 生产业务写接口；
- 质量验收写接口；
- 库存余额或库存事务写接口；
- 入库、出库或退货实际出库写接口；
- 跨境业务接口；
- Excel 正式导入；
- 通用附件上传、下载和关联接口；
- 真实 API Route、Controller、Service、Repository 或业务代码；
- ORM、Schema、DDL、Migration、Seed；
- 技术框架或数据库选型；
- Phase 6、Phase 7 或任何技术开发。

## 26. DCR 检查、停止项与正式结论

### 26.1 已停止的冲突设计

| 冲突位置 | Frozen/Approved 依据与行号 | 缺失字段、状态、对象或关系 | 本 Task 处理 | 建议 |
| --- | --- | --- | --- | --- |
| 可编辑计量单位接口 | Task 3.3 第 60 至 74 行的正式基础表无计量单位表；Task 4.5 第 203 至 205 行明确不新增独立表且持久化映射待后续 | 可维护计量单位对象及正式持久化来源 | 不设计计量单位写接口或虚构字典资源 | 项目负责人选择固定受控值方案，或发起 DCR 后再设计维护接口 |
| 采购类型、采购负责人 | Task 3.4 第 167 至 176 行列出的采购主表/明细字段无 `purchase_type`、负责人字段；Task 4.6 第 55、57、121、125、278 行要求页面字段 | 采购类型、采购负责人字段 | 不接收、不返回、不筛选这些字段 | 优先调整页面/API 口径；确需持久化时发起 DCR |
| 独立到货登记与到货批次 | Task 3.3 第 95 至 110 行的采购正式表无到货主表/明细；Task 3.4 第 175 至 176 行仅有累计到货快照；Task 4.6 第 230 行提供登记入口 | 可追溯到货对象、日期、批次及来源关系 | 只读返回累计 `receivedQuantity`，不设计到货写接口 | 调整页面为创建验收/查看进度，或发起正式变更评审 |
| 采购单厂家筛选及关联生产任务 | Task 3.3 第 130 行明确采购单与生产单完全平行；Task 3.4 第 169 至 170 行采购单只有供应商关系 | `manufacturer_id` 或采购到生产关系 | 不提供厂家筛选、已生产数量、关联生产任务 | 必须调整接口需求，不建议以 DCR 破坏已批准平行关系 |
| 采购关闭动作 | Task 2.5 第 55 至 77 行正式状态为草稿、待审核、已审核、已驳回、已完成、已取消、已作废；Task 4.6 第 99、230、447 行出现关闭 | `closed` 正式状态及转换 | 不提供关闭接口，不把作废或完成改名为关闭 | 发起页面/状态口径 Change Request；如要新增状态则需同步正式变更及 DCR 检查 |

本 Task 未自行提出或执行数据库变更。上述冲突部分已停止设计；项目负责人必须选择调整接口/页面口径或启动正式 DCR/Change Request 后，才能补充相应契约。

### 26.2 正式结论

1. Task 5.1 状态为 Completed / Approved，并作为本文件统一规范；
2. Task 5.2 可映射范围的 API 设计已完成，状态为 Completed / Pending Approval；
3. Phase 5 保持 In Progress；Task 5.3 至 Task 5.5 保持 Waiting；
4. 共定义 103 个接口：基础资料 74 个、采购管理 29 个；
5. 本次设计反审核接口，依据 Task 2.5 第 35、79 至 84 行，且严格限制无库存流水和无下游关联；
6. 冲突接口已停止并在 26.1 登记，未新增任何字段、表、状态、唯一约束、索引、关系或业务对象；
7. 未创建真实 API Route，未编写业务代码，未修改 Frozen 数据库或 Approved 页面正文；
8. 技术开发保持 Not Started；
9. 当前下一步为 Task 5.2 GitHub 验收，不得开始 Task 5.3。
