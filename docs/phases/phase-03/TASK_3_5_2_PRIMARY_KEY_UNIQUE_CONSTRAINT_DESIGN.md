---
document_name: Task 3.5.2 主键与唯一约束设计
project: Violin ERP Lite
version: 1.0
status: Approved
owner: Project Manager
created_date: 2026-07-20
updated_date: 2026-07-20
related_phase: Phase 3
---

# Task 3.5.2：主键与唯一约束设计（Primary Key and Unique Constraint Design）

## 1. 任务信息

| 项目 | 内容 |
| --- | --- |
| 所属阶段 | Phase 3：数据库设计（Database Design，In Progress） |
| 所属任务 | Task 3.5：字段类型、约束与索引设计（In Progress） |
| 当前小任务 | Task 3.5.2：主键与唯一约束设计 |
| 前置小任务 | Task 3.5.1：字段数据类型规范（Completed / Approved） |
| 文档状态 | Approved |
| 小任务状态 | Completed / Approved |
| 下一小任务 | Task 3.5.3：外键关系规范（Not Started） |

## 2. 任务范围

本任务负责：

- 确定全部 60 张正式表的主键规则；
- 确定业务编码、单据编号、任务编号的唯一规则；
- 确定关联表组合唯一约束；
- 确定主表和明细表的行号唯一规则；
- 确定库存、权限、导入和跨境匹配的业务唯一范围；
- 确定可空字段的条件唯一原则；
- 确定编码及用户名的大小写判重原则。

本任务不负责：

- 外键删除及更新策略；
- 普通查询索引；
- Check 约束；
- 枚举完整合法值集合；
- SQL、ORM、Schema 或 Migration；
- 数据库选型；
- 页面、API 或业务代码。

## 3. 主键统一规范

全部 60 张正式表统一使用单字段 `id` 作为主键，逻辑表达为 `PRIMARY KEY (id)`，逻辑类型为 `UUID`，优先采用 UUID v7。

统一原则：

1. 每张表只设置一个单字段主键 `id`。
2. 不使用业务编码作为主键。
3. 关联表也保留独立 UUID 主键。
4. 业务唯一性通过独立唯一约束表达。
5. 可修改的编码、编号、用户名和外部编号不得替代主键。
6. 流水、审计及历史表同样使用 UUID 主键。
7. 本任务只定义逻辑约束，不编写数据库 DDL。

## 4. 唯一约束命名规范

- 单字段唯一约束：`uq_<table>_<field>`；
- 组合唯一约束：`uq_<table>_<field1>_<field2>`。

示例：`uq_skus_sku_code`、`uq_inventories_sku_id_warehouse_id`、`uq_user_roles_user_id_role_id`。

下文“逻辑唯一范围”只描述稳定、真实、不可重复的业务事实，不代表具体数据库语法。数据库标识符长度适配留待数据库选型和 Schema 设计。

## 5. 基础资料类唯一约束（11 张）

| 序号 | 表名 | 约束名称 | 逻辑唯一范围 | 说明 |
| --- | --- | --- | --- | --- |
| 1 | `product_categories` | `uq_product_categories_category_code` | `category_code` | 分类编码全局唯一 |
|  |  | `uq_product_categories_parent_category_id_category_name` | `parent_category_id, category_name` | 同一父分类下名称唯一；不同父分类允许同名；顶级分类的条件实现后置 |
| 2 | `brands` | `uq_brands_brand_code` | `brand_code` | 品牌编码唯一 |
|  |  | `uq_brands_brand_name` | `brand_name` | 品牌名称唯一；英文名称不强制唯一 |
| 3 | `products` | `uq_products_product_code` | `product_code` | 产品编码唯一；产品名称不强制唯一 |
| 4 | `skus` | `uq_skus_sku_code` | `sku_code` | SKU 编码全局唯一 |
|  |  | `uq_skus_barcode` | `barcode` 非空时 | 条码仅在非空时唯一 |
| 5 | `suppliers` | `uq_suppliers_supplier_code` | `supplier_code` | 供应商编码唯一；供应商名称不强制唯一 |
|  |  | `uq_suppliers_tax_identifier` | `tax_identifier` 非空时 | 税务标识仅在非空时唯一 |
| 6 | `manufacturers` | `uq_manufacturers_manufacturer_code` | `manufacturer_code` | 生产厂家编码唯一；厂家名称不强制唯一 |
| 7 | `warehouses` | `uq_warehouses_warehouse_code` | `warehouse_code` | 仓库编码唯一；仓库名称不强制唯一 |
| 8 | `ecommerce_platforms` | `uq_ecommerce_platforms_platform_code` | `platform_code` | 平台编码唯一 |
|  |  | `uq_ecommerce_platforms_platform_name` | `platform_name` | 平台名称唯一 |
| 9 | `stores` | `uq_stores_store_code` | `store_code` | 店铺编码唯一；店铺名称不强制唯一 |
|  |  | `uq_stores_platform_id_external_store_id` | `platform_id, external_store_id`，且 `external_store_id` 非空 | 外部店铺标识只在同一平台内唯一 |
| 10 | `product_suppliers` | `uq_product_suppliers_product_id_supplier_id_effective_from` | `product_id, supplier_id, effective_from` | 允许保留不同时期的合作历史；有效期重叠规则不在本任务定义 |
| 11 | `product_manufacturers` | `uq_product_manufacturers_product_id_manufacturer_id_effective_from` | `product_id, manufacturer_id, effective_from` | 允许保留不同时期的合作历史 |

## 6. 采购与生产类唯一约束（11 张）

| 序号 | 表名 | 约束名称 | 逻辑唯一范围 | 说明 |
| --- | --- | --- | --- | --- |
| 12 | `purchase_orders` | `uq_purchase_orders_document_no` | `document_no` | 采购单编号唯一 |
| 13 | `purchase_order_items` | `uq_purchase_order_items_purchase_order_id_line_no` | `purchase_order_id, line_no` | 同一采购单允许相同 SKU 因价格、批次或交期不同出现多行 |
| 14 | `purchase_payments` | `uq_purchase_payments_payment_no` | `payment_no` | 付款编号唯一；银行参考号不强制唯一 |
| 15 | `purchase_returns` | `uq_purchase_returns_document_no` | `document_no` | 采购退货单编号唯一 |
| 16 | `purchase_return_items` | `uq_purchase_return_items_purchase_return_id_line_no` | `purchase_return_id, line_no` | 采购退货单内行号唯一 |
| 17 | `production_orders` | `uq_production_orders_document_no` | `document_no` | 生产单编号唯一 |
| 18 | `production_order_items` | `uq_production_order_items_production_order_id_line_no` | `production_order_id, line_no` | 生产单内行号唯一 |
| 19 | `production_payments` | `uq_production_payments_payment_no` | `payment_no` | 生产付款编号唯一 |
| 20 | `production_progress_records` | — | 不设置业务唯一约束 | 同一生产单同一天可多次记录进度；不得因阶段或日期重复阻止留痕 |
| 21 | `production_completion_records` | `uq_production_completion_records_production_order_id_completion_batch_no` | `production_order_id, completion_batch_no` | 完工批次号只在所属生产单内唯一 |
| 22 | `production_completion_record_items` | `uq_production_completion_record_items_production_completion_record_id_line_no` | `production_completion_record_id, line_no` | 同一完工记录内行号唯一 |
|  |  | `uq_production_completion_record_items_production_completion_record_id_production_order_item_id` | `production_completion_record_id, production_order_item_id` | 同一完工记录中的同一原生产单明细只允许出现一次 |

## 7. 验收与出入库类唯一约束（10 张）

| 序号 | 表名 | 约束名称 | 逻辑唯一范围 | 说明 |
| --- | --- | --- | --- | --- |
| 23 | `inspection_orders` | `uq_inspection_orders_document_no` | `document_no` | 验收单编号唯一 |
| 24 | `inspection_order_items` | `uq_inspection_order_items_inspection_order_id_line_no` | `inspection_order_id, line_no` | 验收单内行号唯一 |
| 25 | `inbound_orders` | `uq_inbound_orders_document_no` | `document_no` | 入库单编号唯一 |
| 26 | `inbound_order_items` | `uq_inbound_order_items_inbound_order_id_line_no` | `inbound_order_id, line_no` | 入库单内行号唯一 |
| 27 | `outbound_orders` | `uq_outbound_orders_document_no` | `document_no` | 出库单编号唯一 |
|  |  | `uq_outbound_orders_store_id_external_order_no` | `store_id, external_order_no`，且 `external_order_no` 非空 | 外部订单号只在同一店铺内唯一，不同店铺允许相同编号 |
| 28 | `outbound_order_items` | `uq_outbound_order_items_outbound_order_id_line_no` | `outbound_order_id, line_no` | 出库单内行号唯一 |
|  |  | `uq_outbound_order_items_outbound_order_id_external_order_item_no` | `outbound_order_id, external_order_item_no`，且 `external_order_item_no` 非空 | 外部订单明细号只在所属出库单内唯一 |
| 29 | `sales_returns` | `uq_sales_returns_document_no` | `document_no` | 销售退货单编号唯一 |
|  |  | `uq_sales_returns_store_id_external_return_no` | `store_id, external_return_no`，且 `external_return_no` 非空 | 外部退货号只在同一店铺内唯一 |
| 30 | `sales_return_items` | `uq_sales_return_items_sales_return_id_line_no` | `sales_return_id, line_no` | 销售退货单内行号唯一 |
| 31 | `damage_reports` | `uq_damage_reports_document_no` | `document_no` | 报损单编号唯一 |
| 32 | `damage_report_items` | `uq_damage_report_items_damage_report_id_line_no` | `damage_report_id, line_no` | 报损单内行号唯一 |

## 8. 跨境与库存类唯一约束（12 张）

| 序号 | 表名 | 约束名称 | 逻辑唯一范围 | 说明 |
| --- | --- | --- | --- | --- |
| 33 | `cross_border_shipments` | `uq_cross_border_shipments_document_no` | `document_no` | 跨境发货单编号唯一 |
|  |  | `uq_cross_border_shipments_shipment_batch_no` | `shipment_batch_no` | 发货批次号唯一 |
|  |  | `uq_cross_border_shipments_carrier_name_tracking_no` | `carrier_name, tracking_no`，且 `tracking_no` 非空 | 物流单号不得脱离承运商单独设置全局唯一 |
| 34 | `cross_border_shipment_items` | `uq_cross_border_shipment_items_cross_border_shipment_id_line_no` | `cross_border_shipment_id, line_no` | 跨境发货单内行号唯一 |
| 35 | `shipment_import_matches` | `uq_shipment_import_matches_cross_border_shipment_item_id_import_task_item_id` | `cross_border_shipment_item_id, import_task_item_id` | 防止同一发货明细与导入明细重复匹配；无需重复加入主单 ID |
| 36 | `inventories` | `uq_inventories_sku_id_warehouse_id` | `sku_id, warehouse_id` | 同一 SKU 在同一仓库节点仅有一条当前库存余额 |
| 37 | `inventory_transactions` | `uq_inventory_transactions_transaction_no` | `transaction_no` | 流水编号唯一；来源单据或来源明细可产生多条库存流水，不得据此唯一 |
| 38 | `transfer_orders` | `uq_transfer_orders_document_no` | `document_no` | 调拨单编号唯一 |
| 39 | `transfer_order_items` | `uq_transfer_order_items_transfer_order_id_line_no` | `transfer_order_id, line_no` | 调拨单内行号唯一 |
| 40 | `stock_counts` | `uq_stock_counts_document_no` | `document_no` | 盘点单编号唯一；不限制同一仓库同一天只能有一张盘点单 |
| 41 | `stock_count_items` | `uq_stock_count_items_stock_count_id_line_no` | `stock_count_id, line_no` | 盘点单内行号唯一 |
|  |  | `uq_stock_count_items_stock_count_id_sku_id_batch_no` | `stock_count_id, sku_id, batch_no` | `batch_no` 为空时的条件实现后置 |
| 42 | `inventory_adjustments` | `uq_inventory_adjustments_document_no` | `document_no` | 库存调整单编号唯一 |
|  |  | `uq_inventory_adjustments_stock_count_id` | `stock_count_id` 非空时 | 一个盘点单最多生成一张库存调整单 |
| 43 | `inventory_adjustment_items` | `uq_inventory_adjustment_items_inventory_adjustment_id_line_no` | `inventory_adjustment_id, line_no` | 库存调整单内行号唯一 |
| 44 | `inventory_alerts` | `uq_inventory_alerts_alert_no` | `alert_no` | 预警编号唯一；不对 `sku_id, warehouse_id, alert_type` 设置永久唯一，以保留历史预警 |

## 9. 系统与治理类唯一约束（16 张）

| 序号 | 表名 | 约束名称 | 逻辑唯一范围 | 说明 |
| --- | --- | --- | --- | --- |
| 45 | `import_tasks` | `uq_import_tasks_task_no` | `task_no` | 导入任务编号唯一；文件名不唯一 |
| 46 | `import_task_items` | `uq_import_task_items_import_task_id_row_no` | `import_task_id, row_no` | 导入任务内源数据行号唯一 |
| 47 | `users` | `uq_users_username` | `username` | 用户名按不区分大小写原则判重；邮箱和电话不强制唯一 |
| 48 | `roles` | `uq_roles_role_code` | `role_code` | 角色编码唯一 |
|  |  | `uq_roles_role_name` | `role_name` | 角色名称唯一 |
| 49 | `permissions` | `uq_permissions_permission_code` | `permission_code` | 权限编码唯一 |
|  |  | `uq_permissions_module_code_action_code` | `module_code, action_code` | 防止同一模块操作重复定义 |
| 50 | `user_roles` | `uq_user_roles_user_id_role_id` | `user_id, role_id` | 第一阶段同一用户与角色只保留一条关系，授权变化由审计日志记录 |
| 51 | `role_permissions` | `uq_role_permissions_role_id_permission_id` | `role_id, permission_id` | 角色与权限关系唯一 |
| 52 | `role_warehouses` | `uq_role_warehouses_role_id_warehouse_id` | `role_id, warehouse_id` | 角色与仓库数据范围关系唯一 |
| 53 | `role_stores` | `uq_role_stores_role_id_store_id` | `role_id, store_id` | 角色与店铺数据范围关系唯一 |
| 54 | `system_settings` | `uq_system_settings_setting_key` | `setting_key` | 系统配置键唯一 |
| 55 | `backup_tasks` | `uq_backup_tasks_task_no` | `task_no` | 备份任务编号唯一；文件引用和校验值不强制唯一 |
| 56 | `attachments` | — | 不设置业务唯一约束 | 原始文件名、存储文件名、存储引用和校验值均不唯一；文件去重属于存储策略 |
| 57 | `attachment_links` | `uq_attachment_links_attachment_id_object_type_object_id_object_item_id_attachment_category` | `attachment_id, object_type, object_id, object_item_id, attachment_category` | `object_item_id` 为空时的条件实现后置 |
| 58 | `audit_logs` | — | 不设置业务唯一约束 | 一个请求可产生多条审计记录，`request_trace_id` 不得唯一 |
| 59 | `document_status_histories` | — | 不设置业务唯一约束 | 同一对象允许多次状态变化、撤回、重新提交和重新审核 |
| 60 | `approval_records` | — | 不设置业务唯一约束 | 同一业务对象允许多轮提交、驳回、审核和反审核 |

## 10. 单据编号规则

下列正式业务单据的 `document_no` 在各自表内唯一：

- `purchase_orders`；
- `purchase_returns`；
- `production_orders`；
- `inspection_orders`；
- `inbound_orders`；
- `outbound_orders`；
- `sales_returns`；
- `damage_reports`；
- `cross_border_shipments`；
- `transfer_orders`；
- `stock_counts`；
- `inventory_adjustments`。

编号可包含业务前缀，例如 `PO-20260720-0001`、`MO-20260720-0001`、`IN-20260720-0001`、`OUT-20260720-0001`。不同单据表之间允许编号主体重复；编号生成、并发锁定和流水号实现不属于本任务。

## 11. 大小写判重原则

下列编码及用户名按不区分大小写原则判重：

- `category_code`、`brand_code`、`product_code`、`sku_code`；
- `supplier_code`、`manufacturer_code`、`warehouse_code`；
- `platform_code`、`store_code`；
- `username`、`role_code`、`permission_code`、`setting_key`。

例如 `SKU001` 与 `sku001` 应视为重复。具体通过数据库排序规则、规范化字段或函数索引实现，留待数据库选型和索引设计。

## 12. 可空唯一字段原则

下列字段或组合仅在相应可空字段非空时参与唯一判断：

- `barcode`；
- `tax_identifier`；
- `platform_id, external_store_id`；
- `store_id, external_order_no`；
- `outbound_order_id, external_order_item_no`；
- `store_id, external_return_no`；
- `carrier_name, tracking_no`；
- `stock_count_id`；
- 包含 `object_item_id` 的附件关联组合。

逻辑上允许存在多条空值记录。本任务不编写数据库特定的部分索引或函数索引语法。顶级分类名称、无批次盘点明细及附件对象级关联的空值条件实现，同样留待数据库选型和后续索引设计。

## 13. 不建立唯一约束的字段和事实

以下字段或事实不得仅因具有识别意义而设置唯一：

- 普通名称字段，已明确的品牌、平台和角色名称除外；
- 联系电话、邮箱、银行账号和地址；
- 文件名、存储引用和校验值；
- 脱离承运商的物流单号；
- 单据中的 SKU；
- 来源单据 ID 和来源单据明细 ID；
- 审计请求追踪 ID；
- 状态历史、审批记录及预警业务组合。

唯一约束不得用于代替普通重复数据治理。“同一业务范围只保留一个未关闭预警”等状态条件规则不在本任务定义。

## 14. 正式结论

1. 全部 60 张正式表使用单字段 UUID 主键 `id`，优先 UUID v7。
2. 业务编码不得作为主键，基础资料编码在各自表内唯一。
3. SKU 编码全局唯一，条码非空时唯一。
4. 单据编号在各自业务表内唯一，单据明细采用“主表 ID + 行号”组合唯一。
5. 库存余额采用 `sku_id, warehouse_id` 组合唯一。
6. 多对多关系表采用业务对象 ID 组合唯一，同时保留独立 UUID 主键。
7. 生产完工批次在所属生产单内唯一。
8. 平台外部订单及退货编号按店铺业务范围唯一。
9. 导入任务明细采用“任务 ID + 行号”组合唯一。
10. 用户名、角色编码、权限编码及系统配置键唯一。
11. 编码及用户名按不区分大小写原则判重。
12. 可空唯一字段仅在非空时参与唯一判断。
13. 审计日志、状态历史及审批记录不设置业务唯一约束。
14. 本任务不定义外键删除或更新策略、普通查询索引、Check 约束或枚举完整合法值。
15. 本任务不编写 SQL、ORM、Schema、Migration，不选择数据库，不进入技术开发。
16. Task 3.5.2 作为 Task 3.5.3 外键关系规范的正式输入。

## 15. 状态与边界

- Phase 3：In Progress；
- Task 3.5：In Progress；
- Task 3.5.1：Completed / Approved；
- Task 3.5.2：Completed / Approved；
- Task 3.5.3：Not Started；
- 外键关系规范、普通查询索引和 Check 约束：Not Started；
- SQL、ORM、Schema、Migration、数据库选型及技术开发：Not Started。

下一小任务为 Task 3.5.3 外键关系规范。Task 3.5.2 验收通过前不得启动 Task 3.5.3。
