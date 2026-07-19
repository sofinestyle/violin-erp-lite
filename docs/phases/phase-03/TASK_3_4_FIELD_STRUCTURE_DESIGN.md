---
document_name: Task 3.4 字段结构设计
project: Violin ERP Lite
version: 1.0
status: Approved
owner: Project Manager
created_date: 2026-07-19
updated_date: 2026-07-19
related_phase: Phase 3
---

# Task 3.4：字段结构设计（Field Structure Design）

## 1. 任务信息

| 项目 | 内容 |
| --- | --- |
| 所属阶段 | Phase 3：数据库设计（Database Design） |
| 当前任务 | Task 3.4：字段结构设计 |
| 前置任务 | Task 3.3：数据表结构设计（Completed / Approved） |
| 文档状态 | Approved |
| 任务状态 | Completed / Approved |
| 下一任务 | Task 3.5：字段类型、约束与索引设计（Not Started） |

## 2. 任务范围

本任务负责确定正式逻辑表的字段名称、中文含义、业务用途和业务必填性，统一公共字段、单据公共字段与明细公共字段，明确关联、状态、数量、金额、追溯及历史快照字段，并检查 Task 3.3 的逻辑表结构承载能力。

本任务不定义字段类型、长度、精度或技术默认值，不实现主键、外键、唯一约束、检查约束或索引，不编写 SQL、对象关系映射（Object-Relational Mapping，ORM）、数据库模式（Database Schema）、迁移文件、物理实体关系模型（Physical ER Model）、页面、API 或业务代码，也不选择数据库技术。

## 3. Task 3.3 结构修正

字段结构检查确认三个必要缺口：

1. 新增 `production_completion_record_items`（生产完工记录明细表），保存每次分批完工中各 SKU 的完工数量，并关联完工记录与原生产单明细；一张完工记录可包含多个 SKU。
2. `role_warehouses`（角色仓库权限范围表）转为正式表，用于限制角色可查看或操作的仓库并区分访问级别。
3. `role_stores`（角色店铺权限范围表）转为正式表，用于限制角色可查看或操作的店铺并区分访问级别。

修正后正式逻辑表由 57 张调整为 60 张；`safety_stock_rules` 继续作为候选表，不进入本期正式清单。Task 3.3 保持 Completed / Approved。

```text
production_completion_records
└── production_completion_record_items
```

## 4. 统一字段规范

### 4.1 一般表公共字段

除只追加流水、日志及历史表外，一般正式表统一包含：

| 字段 | 中文含义与业务用途 | 业务必填性 |
| --- | --- | --- |
| `id` | 记录唯一标识，用于稳定识别单条记录 | 必填 |
| `created_at` | 创建时间，用于建立时间追溯 | 必填，系统记录 |
| `created_by` | 创建用户，用于记录操作主体 | 必填，系统记录 |
| `updated_at` | 最后更新时间，用于并发及变更追溯 | 允许修改的表必填 |
| `updated_by` | 最后更新用户，用于记录最后操作主体 | 允许修改的表必填 |

主数据、配置及可停用关系表增加：

| 字段 | 中文含义与业务用途 | 业务必填性 |
| --- | --- | --- |
| `is_active` | 是否启用，控制后续业务是否可继续引用 | 必填 |
| `disabled_at` | 停用时间，保留停用历史 | 停用时必填 |
| `disabled_by` | 停用用户，追溯停用责任 | 停用时必填 |

不采用统一 `is_deleted` 字段进行历史业务删除。已被业务引用的资料只能停用；流水、审计日志和状态历史不得设置修改或删除用途字段。

### 4.2 正式业务单据主表公共字段

| 字段 | 中文含义与业务用途 | 业务必填性 |
| --- | --- | --- |
| `document_no` | 系统单据编号，唯一识别业务单据 | 必填 |
| `document_date` | 业务日期，确定业务所属日期 | 必填 |
| `status` | 当前业务状态 | 必填 |
| `approval_status` | 当前审核状态 | 必填 |
| `remark` | 单据备注 | 可选 |
| `submitted_at` | 提交时间 | 提交后必填 |
| `submitted_by` | 提交用户 | 提交后必填 |
| `approved_at` | 审核时间 | 审核后必填 |
| `approved_by` | 审核用户 | 审核后必填 |
| `cancelled_at` | 取消或作废时间 | 取消或作废时必填 |
| `cancelled_by` | 取消或作废用户 | 取消或作废时必填 |
| `cancel_reason` | 取消或作废原因 | 取消或作废时必填 |
| `version_no` | 并发更新版本号 | 必填 |

正式业务单据主表同时包含一般表公共字段。

### 4.3 单据明细公共字段

| 字段 | 中文含义与业务用途 | 业务必填性 |
| --- | --- | --- |
| `id` | 明细记录唯一标识 | 必填 |
| `line_no` | 单据行号，标识主单内明细顺序 | 必填 |
| `sku_id` | SKU 关联，用于统一引用正式 SKU 主档 | 必填 |
| `sku_code_snapshot` | SKU 编码快照，保留单据发生时信息 | 必填 |
| `sku_name_snapshot` | SKU 名称快照，保留单据发生时信息 | 必填 |
| `specification_snapshot` | 规格快照，保留单据发生时信息 | 按 SKU 规格必填 |
| `quantity` | 本行基础业务数量 | 必填 |
| `remark` | 明细备注 | 可选 |
| `created_at` | 明细创建时间 | 必填 |
| `created_by` | 明细创建用户 | 必填 |
| `updated_at` | 明细最后更新时间 | 允许修改时必填 |
| `updated_by` | 明细最后更新用户 | 允许修改时必填 |

必要历史快照必须保留，不能只依赖当前 SKU 主档。

### 4.4 金额公共字段

涉及金额的业务表按实际用途选用 `currency_code`（币种）、`unit_price`（单价）、`amount`（金额）、`tax_rate`（税率）、`tax_amount`（税额）、`subtotal_amount`（未含税或分项小计）、`total_amount`（总金额）、`paid_amount`（已付金额）和 `unpaid_amount`（未付金额）。金额字段在对应金额业务存在时必填；本任务不定义数值类型、精度和计算约束。

## 5. 基础资料类字段（11 张）

以下各表均使用一般表公共字段；标注“条件必填”的字段只在对应业务条件成立时必填。

### 5.1 `product_categories`

- `category_code`（分类编码，必填）、`category_name`（分类名称，必填）、`parent_category_id`（上级分类，顶级可空）、`category_level`（分类层级，必填）、`sort_order`（显示顺序，必填）、`description`（说明，可选）、停用字段。
- 支持多级分类，不允许循环层级；被引用后不得物理删除。

### 5.2 `brands`

- `brand_code`（品牌编码，必填）、`brand_name`（中文品牌名，必填）、`brand_name_en`（英文品牌名，可选）、`description`（说明，可选）、停用字段。

### 5.3 `products`

- `product_code`（产品编码，必填）、`product_name`（中文名称，必填）、`product_name_en`（英文名称，可选）、`category_id`（产品分类，必填）、`brand_id`（品牌，必填）、`product_type`（产品类型，必填）、`description`（说明，可选）、`default_unit`（默认单位，必填）、停用字段。

### 5.4 `skus`

- `sku_code`（SKU 编码，必填）、`sku_name`（SKU 名称，必填）、`product_id`（所属产品，必填）、`size`（尺寸，可选）、`color`（颜色，可选）、`specification`（综合规格，可选）、`material`（材质，可选）、`unit`（计量单位，必填）、`barcode`（条码，可选）、`default_purchase_price`（默认采购价，可选）、`default_production_price`（默认生产价，可选）、`default_sale_price`（默认销售价，可选）、`safety_stock_quantity`（第一阶段安全库存数量，必填）、停用字段。
- 第一阶段安全库存采用 SKU 级字段，暂不将 `safety_stock_rules` 转为正式表。

### 5.5 `suppliers`

- `supplier_code`（供应商编码，必填）、`supplier_name`（供应商全称，必填）、`short_name`（简称，可选）、`contact_name`（联系人，可选）、`contact_phone`（联系电话，可选）、`contact_email`（联系邮箱，可选）、`address`（地址，可选）、`settlement_method`（结算方式，必填）、`payment_terms`（付款条件，可选）、`tax_identifier`（税务识别号，可选）、`bank_name`（开户银行，可选）、`bank_account_name`（账户名称，可选）、`bank_account_no`（银行账号，可选）、`remark`（备注，可选）、停用字段。
- 银行及税务信息属于敏感信息，后续必须纳入权限、脱敏及审计设计。

### 5.6 `manufacturers`

- `manufacturer_code`（厂家编码，必填）、`manufacturer_name`（厂家全称，必填）、`short_name`（简称，可选）、`contact_name`（联系人，可选）、`contact_phone`（联系电话，可选）、`contact_email`（联系邮箱，可选）、`address`（地址，可选）、`settlement_method`（结算方式，必填）、`payment_terms`（付款条件，可选）、`production_capacity_note`（产能说明，可选）、`remark`（备注，可选）、停用字段。

### 5.7 `warehouses`

- `warehouse_code`（仓库编码，必填）、`warehouse_name`（仓库名称，必填）、`warehouse_type`（仓库类型，必填）、`owner_type`（责任主体类型，必填）、`manufacturer_id`（关联厂家，厂家仓必填）、`country_code`（国家代码，海外仓必填）、`province`（省份，可选）、`city`（城市，可选）、`address`（地址，可选）、`contact_name`（联系人，可选）、`contact_phone`（联系电话，可选）、`allows_available_stock`（是否允许形成可用库存，必填）、`sort_order`（显示顺序，必填）、停用字段。
- `warehouse_type` 至少支持公司仓、厂家仓、海外仓、在途仓和待处理仓；厂家仓必须关联 `manufacturer_id`。

### 5.8 `ecommerce_platforms`

- `platform_code`（平台编码，必填）、`platform_name`（平台名称，必填）、`platform_type`（平台类型，必填）、`country_code`（所属国家，可选）、`is_cross_border`（是否跨境平台，必填）、`description`（说明，可选）、停用字段。

### 5.9 `stores`

- `store_code`（店铺编码，必填）、`store_name`（店铺名称，必填）、`platform_id`（所属平台，必填）、`external_store_id`（外部店铺标识，可选）、`country_code`（经营国家，必填）、`currency_code`（业务币种，必填）、`operator_name`（运营负责人，可选）、`remark`（备注，可选）、停用字段。

### 5.10 `product_suppliers`

- `product_id`（产品，必填）、`supplier_id`（供应商，必填）、`supplier_product_code`（供应商产品编码，可选）、`default_unit_price`（默认采购单价，可选）、`minimum_order_quantity`（最小起订量，可选）、`lead_time_days`（采购提前期，可选）、`is_preferred`（是否首选，必填）、`effective_from`（生效日期，必填）、`effective_to`（失效日期，可选）、`remark`（备注，可选）、`is_active`（是否启用，必填）及停用字段。

### 5.11 `product_manufacturers`

- `product_id`（产品，必填）、`manufacturer_id`（生产厂家，必填）、`manufacturer_product_code`（厂家产品编码，可选）、`default_processing_price`（默认加工单价，可选）、`minimum_order_quantity`（最小生产量，可选）、`lead_time_days`（生产提前期，可选）、`production_capacity`（生产能力，可选）、`is_preferred`（是否首选，必填）、`effective_from`（生效日期，必填）、`effective_to`（失效日期，可选）、`remark`（备注，可选）、`is_active`（是否启用，必填）及停用字段。

## 6. 采购与生产类字段（11 张）

### 6.1 `purchase_orders`

- 使用单据主表公共字段。
- `supplier_id`（供应商，必填）、`supplier_code_snapshot`（供应商编码快照，必填）、`supplier_name_snapshot`（供应商名称快照，必填）、`expected_delivery_date`（预计交付日，必填）、`currency_code`（币种，必填）、`settlement_method`（结算方式，必填）、`payment_terms_snapshot`（付款条件快照，可选）、`total_quantity`（总数量，必填）、`subtotal_amount`（金额小计，必填）、`tax_amount`（税额，必填）、`total_amount`（总金额，必填）、`paid_amount`（已付金额，必填）、`unpaid_amount`（未付金额，必填）。

### 6.2 `purchase_order_items`

- 使用明细公共字段。
- `purchase_order_id`（采购单，必填）、`unit_price`（采购单价，必填）、`tax_rate`（税率，必填）、`tax_amount`（税额，必填）、`line_amount`（行金额，必填）、`expected_delivery_date`（行预计交付日，可选）、`received_quantity`（累计到货数量，必填）、`inspected_quantity`（累计验收数量，必填）、`qualified_quantity`（累计合格数量，必填）、`inbound_quantity`（累计入库数量，必填）、`returned_quantity`（累计退货数量，必填）。
- 执行累计字段仅为业务进度快照，正式事实仍以来源单据及流水为准。

### 6.3 `purchase_payments`

- `payment_no`（付款编号，必填）、`purchase_order_id`（采购单，必填）、`supplier_id`（供应商，必填）、`payment_date`（付款日期，必填）、`currency_code`（币种，必填）、`payment_amount`（付款金额，必填）、`payment_method`（付款方式，必填）、`bank_reference_no`（银行参考号，可选）、`payee_account_snapshot`（收款账户快照，必填）、`payment_status`（付款状态，必填）、`attachment_required`（是否要求凭证，必填）、`remark`（备注，可选）及一般表公共字段。
- 一条记录代表一次付款事实，不建立付款明细表。

### 6.4 `purchase_returns`

- 使用单据主表公共字段。
- `supplier_id`（供应商，必填）、`purchase_order_id`（原采购单，必填）、`source_inbound_order_id`（原入库单，必填）、`return_warehouse_id`（退货仓库，必填）、`return_reason`（退货原因，必填）、`total_quantity`（退货总数量，必填）、`total_amount`（退货总金额，必填）、`completed_at`（完成时间，完成后必填）。

### 6.5 `purchase_return_items`

- 使用明细公共字段。
- `purchase_return_id`（采购退货单，必填）、`purchase_order_item_id`（原采购明细，必填）、`source_inbound_order_item_id`（原入库明细，必填）、`unit_price`（退货单价，必填）、`line_amount`（行金额，必填）、`return_reason`（行退货原因，必填）、`inventory_condition`（库存状态，必填）。

### 6.6 `production_orders`

- 使用单据主表公共字段。
- `manufacturer_id`（生产厂家，必填）、`manufacturer_code_snapshot`（厂家编码快照，必填）、`manufacturer_name_snapshot`（厂家名称快照，必填）、`planned_start_date`（计划开始日，必填）、`expected_completion_date`（预计完工日，必填）、`actual_start_date`（实际开始日，开始后必填）、`actual_completion_date`（实际完工日，完成后必填）、`currency_code`（币种，必填）、`total_quantity`（总数量，必填）、`subtotal_amount`（金额小计，必填）、`total_amount`（总金额，必填）、`paid_amount`（已付金额，必填）、`unpaid_amount`（未付金额，必填）、`completion_percentage`（完工比例，必填）。

### 6.7 `production_order_items`

- 使用明细公共字段。
- `production_order_id`（生产单，必填）、`processing_unit_price`（加工单价，必填）、`line_amount`（行金额，必填）、`planned_quantity`（计划数量，必填）、`completed_quantity`（累计完工数量，必填）、`inspected_quantity`（累计验收数量，必填）、`qualified_quantity`（累计合格数量，必填）、`inbound_quantity`（累计入库数量，必填）、`shipped_quantity`（累计跨境发货数量，必填）。

### 6.8 `production_payments`

- `payment_no`（付款编号，必填）、`production_order_id`（生产单，必填）、`manufacturer_id`（生产厂家，必填）、`payment_date`（付款日期，必填）、`currency_code`（币种，必填）、`payment_amount`（付款金额，必填）、`payment_method`（付款方式，必填）、`bank_reference_no`（银行参考号，可选）、`payee_account_snapshot`（收款账户快照，必填）、`payment_status`（付款状态，必填）、`remark`（备注，可选）及一般表公共字段。

### 6.9 `production_progress_records`

- `production_order_id`（生产单，必填）、`progress_date`（进度日期，必填）、`progress_stage`（生产阶段，必填）、`progress_percentage`（进度比例，必填）、`completed_quantity`（截至记录时完工量，必填）、`estimated_completion_date`（预计完工日，可选）、`progress_description`（进度说明，必填）、`reported_by_name`（报告人姓名，可选）、`attachment_required`（是否要求附件，必填）及一般表公共字段。

### 6.10 `production_completion_records`

- `production_order_id`（生产单，必填）、`completion_batch_no`（完工批次号，必填）、`completion_date`（完工日期，必填）、`warehouse_id`（完工后目标仓库，必填）、`total_completed_quantity`（本次总完工量，必填）、`completion_status`（完工记录状态，必填）、`remark`（备注，可选）及一般表公共字段。

### 6.11 `production_completion_record_items`

- `production_completion_record_id`（生产完工记录，必填）、`line_no`（行号，必填）、`production_order_item_id`（原生产单明细，必填）、`sku_id`（SKU，必填）、`sku_code_snapshot`（SKU 编码快照，必填）、`sku_name_snapshot`（SKU 名称快照，必填）、`specification_snapshot`（规格快照，按规格必填）、`completed_quantity`（本行完工数量，必填）、`batch_no`（业务批次号，可选）、`remark`（备注，可选）及一般表公共字段。

## 7. 验收与出入库类字段（10 张）

### 7.1 `inspection_orders`

- 使用单据主表公共字段。
- `source_type`（来源类型，必填）、`purchase_order_id`（采购来源，采购验收必填）、`production_order_id`（生产来源，生产验收必填）、`inspection_date`（验收日期，必填）、`inspection_warehouse_id`（验收仓库，必填）、`inspector_id`（验收人，必填）、`total_inspected_quantity`（验收总量，必填）、`total_qualified_quantity`（合格总量，必填）、`total_unqualified_quantity`（不合格总量，必填）、`inspection_result`（验收结果，必填）、`unqualified_disposition`（不合格处理方式，有不合格量时必填）。
- `source_type` 只表示采购或生产；两个来源关联必须且只能存在一个，物理实现留待 Task 3.5。

### 7.2 `inspection_order_items`

- 使用明细公共字段。
- `inspection_order_id`（验收单，必填）、`source_item_id`（来源单据明细，必填）、`inspected_quantity`（验收数量，必填）、`qualified_quantity`（合格数量，必填）、`unqualified_quantity`（不合格数量，必填）、`pending_quantity`（待处理数量，必填）、`defect_category`（缺陷类别，有缺陷时必填）、`defect_description`（缺陷说明，有缺陷时必填）、`inspection_result`（行验收结果，必填）、`disposition_method`（处理方式，有不合格量时必填）。

### 7.3 `inbound_orders`

- 使用单据主表公共字段。
- `inbound_type`（入库类型，必填）、`warehouse_id`（目标仓库，必填）、`supplier_id`（供应商，采购入库时必填）、`manufacturer_id`（生产厂家，生产入库时必填）、`source_document_type`（来源单据类型，必填）、`source_document_id`（来源单据，必填）、`inspection_order_id`（验收单，适用验收入库时必填）、`total_quantity`（入库总数量，必填）、`inbound_completed_at`（入库完成时间，完成后必填）。

### 7.4 `inbound_order_items`

- 使用明细公共字段。
- `inbound_order_id`（入库单，必填）、`source_document_item_id`（来源明细，必填）、`inspection_order_item_id`（验收明细，适用验收入库时必填）、`batch_no`（批次号，必填）、`production_date`（生产日期，可选）、`unit_cost`（单位成本，必填）、`line_cost`（行成本，必填）、`inventory_condition`（库存状态，必填）。

### 7.5 `outbound_orders`

- 使用单据主表公共字段。
- `outbound_type`（出库类型，必填）、`warehouse_id`（出库仓库，必填）、`platform_id`（电商平台，销售出库时必填）、`store_id`（店铺，销售出库时必填）、`external_order_no`（平台订单号，销售出库时必填）、`customer_name`（客户姓名，可选）、`recipient_country`（收件国家，可选）、`recipient_address`（收件地址，可选）、`total_quantity`（出库总数量，必填）、`outbound_completed_at`（出库完成时间，完成后必填）。
- 用户姓名和地址属于个人信息，后续必须定义访问权限、脱敏和保留规则。

### 7.6 `outbound_order_items`

- 使用明细公共字段。
- `outbound_order_id`（出库单，必填）、`batch_no`（批次号，必填）、`unit_cost`（单位成本，必填）、`line_cost`（行成本，必填）、`external_sku_code`（外部 SKU 编码，可选）、`external_order_item_no`（外部订单行号，可选）。

### 7.7 `sales_returns`

- 使用单据主表公共字段。
- `outbound_order_id`（原销售出库单，必填）、`store_id`（来源店铺，必填）、`return_warehouse_id`（退货接收仓，必填）、`external_return_no`（外部退货号，可选）、`return_date`（退货日期，必填）、`return_reason`（退货原因，必填）、`total_quantity`（退货总数量，必填）、`return_result`（退货处理结果，完成后必填）。

### 7.8 `sales_return_items`

- 使用明细公共字段。
- `sales_return_id`（销售退货单，必填）、`outbound_order_item_id`（原出库明细，必填）、`returned_quantity`（退回数量，必填）、`sellable_quantity`（可售数量，必填）、`pending_quantity`（待处理数量，必填）、`damaged_quantity`（损坏数量，必填）、`inventory_condition`（库存状态，必填）、`disposition_method`（处理方式，必填）。

### 7.9 `damage_reports`

- 使用单据主表公共字段。
- `warehouse_id`（报损仓库，必填）、`source_document_type`（来源单据类型，可选）、`source_document_id`（来源单据，可选）、`damage_date`（报损日期，必填）、`damage_reason`（报损原因，必填）、`total_quantity`（报损总数量，必填）、`total_loss_amount`（损失总金额，必填）、`responsible_party`（责任方，可选）、`disposition_method`（处置方式，必填）。

### 7.10 `damage_report_items`

- 使用明细公共字段。
- `damage_report_id`（报损单，必填）、`source_document_item_id`（来源明细，可选）、`batch_no`（批次号，必填）、`unit_cost`（单位成本，必填）、`loss_amount`（损失金额，必填）、`damage_reason`（行报损原因，必填）、`inventory_condition`（库存状态，必填）。

## 8. 跨境与库存类字段（12 张）

### 8.1 `cross_border_shipments`

- 使用单据主表公共字段。
- `production_order_id`（生产单，可选）、`source_warehouse_id`（来源仓，必填）、`transit_warehouse_id`（在途仓，必填）、`destination_warehouse_id`（目的海外仓，必填）、`shipment_batch_no`（发货批次号，必填）、`carrier_name`（承运商，必填）、`tracking_no`（物流单号，必填）、`transport_method`（运输方式，必填）、`departure_date`（发运日期，必填）、`estimated_arrival_date`（预计到达日，必填）、`actual_arrival_date`（实际到达日，到达后必填）、`destination_country`（目的国家，必填）、`total_quantity`（发货总数量，必填）、`shipment_status`（发货状态，必填）。

### 8.2 `cross_border_shipment_items`

- 使用明细公共字段。
- `cross_border_shipment_id`（跨境发货单，必填）、`production_order_item_id`（生产单明细，可选）、`batch_no`（批次号，必填）、`shipped_quantity`（发货数量，必填）、`received_quantity`（海外实收数量，必填）、`difference_quantity`（差异数量，必填）、`unit_cost`（单位成本，必填）、`line_cost`（行成本，必填）。

### 8.3 `shipment_import_matches`

- `cross_border_shipment_id`（跨境发货单，必填）、`cross_border_shipment_item_id`（跨境发货明细，必填）、`import_task_id`（导入任务，必填）、`import_task_item_id`（导入任务明细，必填）、`matched_quantity`（匹配数量，必填）、`received_quantity`（实收数量，必填）、`difference_quantity`（差异数量，必填）、`match_status`（匹配状态，必填）、`matched_at`（匹配时间，匹配后必填）、`matched_by`（匹配用户，匹配后必填）、`remark`（备注，可选）及一般表公共字段。
- 正式采用明细级匹配，保证不同 SKU 和批次准确对应。

### 8.4 `inventories`

- `sku_id`（SKU，必填）、`warehouse_id`（仓库，必填）、`on_hand_quantity`（账面现存数量，必填）、`available_quantity`（可用数量，必填）、`reserved_quantity`（预留数量，必填）、`pending_quantity`（待处理数量，必填）、`last_transaction_at`（最后流水时间，可选）、`last_counted_at`（最后盘点时间，可选）及一般表公共字段。
- 不设置 `in_transit_quantity`；在途库存通过在途类型 `warehouses` 节点表达，避免双重记录。

### 8.5 `inventory_transactions`

- 只追加字段：`id`（流水标识，必填）、`transaction_no`（流水编号，必填）、`transaction_at`（发生时间，必填）、`sku_id`（SKU，必填）、`warehouse_id`（仓库，必填）、`transaction_type`（流水类型，必填）、`direction`（增减方向，必填）、`quantity`（变动数量，必填）、`quantity_before`（变动前数量，必填）、`quantity_after`（变动后数量，必填）、`unit_cost`（单位成本，按成本业务必填）、`amount`（变动金额，按金额业务必填）、`source_document_type`（来源单据类型，必填）、`source_document_id`（来源单据，必填）、`source_document_item_id`（来源明细，必填）、`related_transaction_id`（关联流水，可选）、`batch_no`（批次号，按批次业务必填）、`operator_id`（操作用户，必填）、`remark`（备注，可选）、`created_at`（创建时间，必填）。
- 不设置 `updated_at`、`updated_by`、`is_deleted` 或任何删除时间、删除用户字段。

### 8.6 `transfer_orders`

- 使用单据主表公共字段。
- `source_warehouse_id`（来源仓，必填）、`transit_warehouse_id`（在途仓，必填）、`destination_warehouse_id`（目的仓，必填）、`planned_transfer_date`（计划调拨日，必填）、`shipped_at`（调出时间，调出后必填）、`received_at`（调入时间，调入后必填）、`total_quantity`（调拨总数量，必填）。

### 8.7 `transfer_order_items`

- 使用明细公共字段。
- `transfer_order_id`（调拨单，必填）、`batch_no`（批次号，必填）、`shipped_quantity`（调出数量，必填）、`received_quantity`（调入数量，必填）、`difference_quantity`（差异数量，必填）、`unit_cost`（单位成本，必填）。

### 8.8 `stock_counts`

- 使用单据主表公共字段。
- `warehouse_id`（盘点仓库，必填）、`count_date`（盘点日期，必填）、`count_scope`（盘点范围，必填）、`started_at`（开始时间，开始后必填）、`completed_at`（完成时间，完成后必填）、`freeze_inventory`（是否冻结库存操作，必填）、`total_item_count`（盘点明细总数，必填）、`difference_item_count`（差异明细数，必填）。

### 8.9 `stock_count_items`

- 使用明细公共字段。
- `stock_count_id`（盘点单，必填）、`batch_no`（批次号，按批次业务必填）、`book_quantity`（账面数量，必填）、`counted_quantity`（实盘数量，必填）、`difference_quantity`（差异数量，必填）、`difference_reason`（差异原因，有差异时必填）、`recount_quantity`（复盘数量，复盘时必填）、`final_quantity`（最终确认数量，必填）。

### 8.10 `inventory_adjustments`

- 使用单据主表公共字段。
- `warehouse_id`（调整仓库，必填）、`stock_count_id`（来源盘点单，盘点调整时必填）、`adjustment_type`（调整类型，必填）、`adjustment_reason`（调整原因，必填）、`total_increase_quantity`（增加总量，必填）、`total_decrease_quantity`（减少总量，必填）、`adjusted_at`（实际调整时间，完成后必填）。

### 8.11 `inventory_adjustment_items`

- 使用明细公共字段。
- `inventory_adjustment_id`（库存调整单，必填）、`stock_count_item_id`（来源盘点明细，盘点调整时必填）、`batch_no`（批次号，按批次业务必填）、`quantity_before`（调整前数量，必填）、`adjustment_quantity`（调整数量，必填）、`quantity_after`（调整后数量，必填）、`adjustment_direction`（调整方向，必填）、`unit_cost`（单位成本，必填）、`amount`（调整金额，必填）。

### 8.12 `inventory_alerts`

- `alert_no`（预警编号，必填）、`alert_type`（预警类型，必填）、`sku_id`（SKU，必填）、`warehouse_id`（仓库，按仓库范围必填）、`threshold_quantity`（阈值数量，必填）、`current_quantity`（触发时当前数量，必填）、`alert_level`（预警级别，必填）、`alert_status`（预警状态，必填）、`generated_at`（生成时间，必填）、`viewed_at`（查看时间，查看后必填）、`viewed_by`（查看用户，查看后必填）、`handled_at`（处理时间，处理后必填）、`handled_by`（处理用户，处理后必填）、`handling_result`（处理结果，处理后必填）、`closed_at`（关闭时间，关闭后必填）、`closed_by`（关闭用户，关闭后必填）及一般表公共字段。

## 9. 系统与治理类字段（16 张）

### 9.1 `import_tasks`

- `task_no`（任务编号，必填）、`import_type`（导入类型，必填）、`file_name`（原文件名，必填）、`file_reference`（文件存储引用，必填）、`warehouse_id`（目标仓库，仓库导入时必填）、`store_id`（目标店铺，店铺导入时必填）、`status`（任务状态，必填）、`total_rows`（总行数，必填）、`success_rows`（成功行数，必填）、`failed_rows`（失败行数，必填）、`warning_rows`（警告行数，必填）、`started_at`（开始时间，开始后必填）、`completed_at`（完成时间，完成后必填）、`error_summary`（错误摘要，失败或部分失败时必填）及一般表公共字段。

### 9.2 `import_task_items`

- `import_task_id`（导入任务，必填）、`row_no`（文件行号，必填）、`raw_data`（原始行数据，必填）、`matched_sku_id`（匹配 SKU，匹配成功时必填）、`matched_warehouse_id`（匹配仓库，适用时必填）、`validation_status`（校验状态，必填）、`execution_status`（执行状态，必填）、`error_code`（错误代码，失败时必填）、`error_message`（错误信息，失败时必填）、`result_document_type`（结果单据类型，生成单据时必填）、`result_document_id`（结果单据，生成单据时必填）、`processed_at`（处理时间，处理后必填）及一般表公共字段。

### 9.3 `users`

- `username`（登录名，必填）、`display_name`（显示姓名，必填）、`password_hash`（密码哈希，必填）、`email`（邮箱，可选）、`phone`（电话，可选）、`status`（账号状态，必填）、`must_change_password`（是否必须修改密码，必填）、`last_login_at`（最后登录时间，可选）、`failed_login_count`（连续失败次数，必填）、`locked_until`（锁定截止时间，锁定时必填）、停用字段及一般表公共字段。
- 不得保存明文密码。

### 9.4 `roles`

- `role_code`（角色编码，必填）、`role_name`（角色名称，必填）、`description`（说明，可选）、`is_system_role`（是否系统角色，必填）、停用字段及一般表公共字段。

### 9.5 `permissions`

- `permission_code`（权限编码，必填）、`permission_name`（权限名称，必填）、`module_code`（模块编码，必填）、`action_code`（操作编码，必填）、`description`（说明，可选）、`is_active`（是否启用，必填）、停用字段及一般表公共字段。

### 9.6 `user_roles`

- `user_id`（用户，必填）、`role_id`（角色，必填）、`effective_from`（生效时间，必填）、`effective_to`（失效时间，可选）、`assigned_by`（分配用户，必填）、`assigned_at`（分配时间，必填）及一般表公共字段。

### 9.7 `role_permissions`

- `role_id`（角色，必填）、`permission_id`（权限，必填）、`granted_by`（授权用户，必填）、`granted_at`（授权时间，必填）及一般表公共字段。

### 9.8 `role_warehouses`

- `role_id`（角色，必填）、`warehouse_id`（仓库，必填）、`access_level`（只读、操作或管理等访问级别，必填）、`assigned_at`（分配时间，必填）、`assigned_by`（分配用户，必填）及一般表公共字段。

### 9.9 `role_stores`

- `role_id`（角色，必填）、`store_id`（店铺，必填）、`access_level`（只读、操作或管理等访问级别，必填）、`assigned_at`（分配时间，必填）、`assigned_by`（分配用户，必填）及一般表公共字段。

### 9.10 `system_settings`

- `setting_key`（配置键，必填）、`setting_name`（配置名称，必填）、`setting_value`（配置值，必填）、`setting_group`（配置分组，必填）、`value_format`（值格式说明，必填）、`is_sensitive`（是否敏感，必填）、`description`（说明，可选）、`is_active`（是否启用，必填）、停用字段及一般表公共字段。
- 敏感配置不得在日志或普通页面中显示明文。

### 9.11 `backup_tasks`

- `task_no`（任务编号，必填）、`backup_type`（备份类型，必填）、`backup_scope`（备份范围，必填）、`trigger_type`（触发类型，必填）、`status`（任务状态，必填）、`started_at`（开始时间，开始后必填）、`completed_at`（完成时间，完成后必填）、`file_reference`（备份文件引用，成功后必填）、`file_size`（文件大小，成功后必填）、`checksum`（校验值，成功后必填）、`retention_until`（保留截止时间，成功后必填）、`error_message`（错误信息，失败时必填）、`triggered_by`（触发主体，必填）、`created_at`（创建时间，必填）。

### 9.12 `attachments`

- `original_file_name`（原文件名，必填）、`stored_file_name`（存储文件名，必填）、`file_extension`（扩展名，必填）、`mime_type`（媒体类型，必填）、`file_size`（文件大小，必填）、`storage_reference`（存储引用，必填）、`checksum`（校验值，必填）、`uploaded_at`（上传时间，必填）、`uploaded_by`（上传用户，必填）、`is_sensitive`（是否敏感，必填）、`status`（附件状态，必填）及一般表公共字段。
- 数据库不直接保存大型文件二进制内容。

### 9.13 `attachment_links`

- `attachment_id`（附件，必填）、`object_type`（受控对象类型，必填）、`object_id`（受控对象，必填）、`object_item_id`（受控对象明细，可选）、`attachment_category`（附件类别，必填）、`sort_order`（显示顺序，必填）、`linked_at`（关联时间，必填）、`linked_by`（关联用户，必填）及一般表公共字段。

### 9.14 `audit_logs`

- 只追加字段：`id`（日志标识，必填）、`occurred_at`（事件发生时间，必填）、`user_id`（操作用户，可选系统事件）、`username_snapshot`（用户名快照，适用用户事件时必填）、`action_code`（操作编码，必填）、`module_code`（模块编码，必填）、`object_type`（对象类型，必填）、`object_id`（对象标识，必填）、`object_no_snapshot`（对象编号快照，可选）、`operation_result`（操作结果，必填）、`before_snapshot`（操作前快照，适用变更时必填）、`after_snapshot`（操作后快照，适用变更时必填）、`ip_address`（来源地址，可选）、`device_info`（设备信息，可选）、`request_trace_id`（请求追踪号，必填）、`failure_reason`（失败原因，失败时必填）、`created_at`（创建时间，必填）。
- 不设置更新或删除用途字段。

### 9.15 `document_status_histories`

- 只追加字段：`id`（历史标识，必填）、`object_type`（单据类型，必填）、`object_id`（单据标识，必填）、`object_no_snapshot`（单据编号快照，必填）、`from_status`（原状态，首次状态可空）、`to_status`（目标状态，必填）、`changed_at`（变更时间，必填）、`changed_by`（变更用户，必填）、`change_reason`（变更原因，关键或异常变更时必填）、`remark`（备注，可选）、`created_at`（创建时间，必填）。
- 状态历史不得修改或删除。

### 9.16 `approval_records`

- 只追加字段：`id`（审批记录标识，必填）、`object_type`（单据类型，必填）、`object_id`（单据标识，必填）、`object_no_snapshot`（单据编号快照，必填）、`approval_action`（审批动作，必填）、`approval_result`（审批结果，必填）、`approver_id`（审批用户，必填）、`approved_at`（审批时间，必填）、`approval_comment`（审批意见，驳回等场景必填）、`previous_approval_record_id`（前一审批记录，重新审核时必填）、`created_at`（创建时间，必填）。
- 用于保留审核、驳回、反审核和重新审核历史，不得修改或删除。

## 10. 修正后 60 张正式逻辑表清单

### 10.1 基础资料类（11 张）

1. `product_categories`
2. `brands`
3. `products`
4. `skus`
5. `suppliers`
6. `manufacturers`
7. `warehouses`
8. `ecommerce_platforms`
9. `stores`
10. `product_suppliers`
11. `product_manufacturers`

### 10.2 采购与生产类（11 张）

12. `purchase_orders`
13. `purchase_order_items`
14. `purchase_payments`
15. `purchase_returns`
16. `purchase_return_items`
17. `production_orders`
18. `production_order_items`
19. `production_payments`
20. `production_progress_records`
21. `production_completion_records`
22. `production_completion_record_items`

### 10.3 验收与出入库类（10 张）

23. `inspection_orders`
24. `inspection_order_items`
25. `inbound_orders`
26. `inbound_order_items`
27. `outbound_orders`
28. `outbound_order_items`
29. `sales_returns`
30. `sales_return_items`
31. `damage_reports`
32. `damage_report_items`

### 10.4 跨境与库存类（12 张）

33. `cross_border_shipments`
34. `cross_border_shipment_items`
35. `shipment_import_matches`
36. `inventories`
37. `inventory_transactions`
38. `transfer_orders`
39. `transfer_order_items`
40. `stock_counts`
41. `stock_count_items`
42. `inventory_adjustments`
43. `inventory_adjustment_items`
44. `inventory_alerts`

### 10.5 系统与治理类（16 张）

45. `import_tasks`
46. `import_task_items`
47. `users`
48. `roles`
49. `permissions`
50. `user_roles`
51. `role_permissions`
52. `role_warehouses`
53. `role_stores`
54. `system_settings`
55. `backup_tasks`
56. `attachments`
57. `attachment_links`
58. `audit_logs`
59. `document_status_histories`
60. `approval_records`

分类数量校验：11 + 11 + 10 + 12 + 16 = 60。候选表仅保留 `safety_stock_rules`。

## 11. Task 3.4 正式结论

1. 全部正式表采用统一公共字段规范。
2. 正式业务单据采用统一单据编号、状态、审核及作废字段。
3. 多 SKU 单据明细保存 SKU 关联及必要历史快照。
4. 被业务引用的基础资料只能停用，不能物理删除。
5. 库存流水、审计日志和状态历史均只追加。
6. 正式单据保存供应商、厂家、SKU 等必要业务快照。
7. 金额、数量和执行进度字段按业务表分别保存。
8. 统一附件表只保存文件元数据和存储引用。
9. 用户密码只保存密码哈希，不保存明文。
10. 银行、税务、个人信息和敏感配置必须受权限及审计控制。
11. 在途库存通过在途仓库节点表达，`inventories` 不设置 `in_transit_quantity`。
12. 第一阶段安全库存采用 `skus.safety_stock_quantity`。
13. 新增 `production_completion_record_items`。
14. `role_warehouses` 和 `role_stores` 转为正式表。
15. 正式逻辑表数量由 57 张修正为 60 张。
16. `safety_stock_rules` 继续作为候选表。
17. 本任务不确定字段类型、长度、主外键物理实现、索引、SQL、ORM 或数据库技术。
18. Task 3.4 作为 Task 3.5 字段类型、约束与索引设计的正式输入。

## 12. 状态与后续任务边界

- Phase 3：In Progress；
- Task 3.1：Completed / Approved；
- Task 3.2：Completed / Approved；
- Task 3.3：Completed / Approved；
- Task 3.4：Completed / Approved；
- Task 3.5：Not Started；
- 字段名称设计：Completed / Approved；
- 字段类型、长度、主外键物理约束、索引、SQL、ORM 和数据库技术选型：Not Started；
- 技术开发：Not Started。

Task 3.4 验收通过前不得启动 Task 3.5。本文件不定义字段类型、长度、精度、物理约束、索引或任何技术实现。
