---
document_name: Task 3.5.5 Check约束设计
project: Violin ERP Lite
version: 1.0
status: Approved
owner: Project Manager
created_date: 2026-07-20
updated_date: 2026-07-23
related_phase: Phase 3
---

# Task 3.5.5：Check 约束设计（Check Constraint Standard）

## 1. 任务信息

| 项目 | 内容 |
| --- | --- |
| 所属阶段 | Phase 3：数据库设计（Database Design，In Progress） |
| 所属任务 | Task 3.5：字段类型、约束与索引设计（In Progress） |
| 当前小任务 | Task 3.5.5：Check 约束设计 |
| 前置小任务 | Task 3.5.4：索引设计（Completed / Approved） |
| 文档状态 | Approved |
| 小任务状态 | Completed / Approved |
| 下一小任务 | Task 3.5.6：数据库命名规范（In Progress） |

## 2. 任务范围与边界

本任务负责同一行内可判断的字段合法性、数值范围、日期先后、动作字段一致性、条件必填、来源组合完整性、仓库角色组合、行号与版本范围及逻辑计算公式。

本任务不负责跨表记录存在性、跨表归属一致性、权限、并发锁、库存事务实现、数据库特定 Check 语法、SQL、Schema 或 Migration。

## 3. 命名与解释原则

Check 约束命名为 `ck_<table>_<rule>`。下文表达的是数据库无关的逻辑条件，不代表具体语法。

统一解释：

- 普通金额、单价、累计数量、安全库存、文件大小和计数不得小于 0；
- 正式业务明细基础 `quantity` 必须大于 0；
- `difference_quantity`、`adjustment_quantity` 等可能表达方向的变化量不机械限制为非负；
- Task 3.4 不存在 `unavailable_quantity`，库存余额公式使用正式字段 `pending_quantity`；
- 验收来源使用正式字段 `purchase_order_id` 与 `production_order_id`，不新增 `source_document_id`；
- 具体枚举代码不在本任务重复维护，已完成正式补全的枚举值集合统一以 [数据库枚举规范](../../03-data/DATABASE_ENUM_SPEC.md) 为唯一入口；条件规则以对应业务类型或动作发生时表达。

## 4. 公共结构规则（44 项）

### 4.1 明细行号（13 项）

以下约束均要求 `line_no >= 1`：

| 约束名称 | 表 |
| --- | --- |
| `ck_purchase_order_items_line_no_range` | `purchase_order_items` |
| `ck_purchase_return_items_line_no_range` | `purchase_return_items` |
| `ck_production_order_items_line_no_range` | `production_order_items` |
| `ck_production_completion_record_items_line_no_range` | `production_completion_record_items` |
| `ck_inspection_order_items_line_no_range` | `inspection_order_items` |
| `ck_inbound_order_items_line_no_range` | `inbound_order_items` |
| `ck_outbound_order_items_line_no_range` | `outbound_order_items` |
| `ck_sales_return_items_line_no_range` | `sales_return_items` |
| `ck_damage_report_items_line_no_range` | `damage_report_items` |
| `ck_cross_border_shipment_items_line_no_range` | `cross_border_shipment_items` |
| `ck_transfer_order_items_line_no_range` | `transfer_order_items` |
| `ck_stock_count_items_line_no_range` | `stock_count_items` |
| `ck_inventory_adjustment_items_line_no_range` | `inventory_adjustment_items` |

### 4.2 正式明细基础数量（12 项）

以下约束均要求明细公共字段 `quantity > 0`：

| 约束名称 | 表 |
| --- | --- |
| `ck_purchase_order_items_quantity_positive` | `purchase_order_items` |
| `ck_purchase_return_items_quantity_positive` | `purchase_return_items` |
| `ck_production_order_items_quantity_positive` | `production_order_items` |
| `ck_inspection_order_items_quantity_positive` | `inspection_order_items` |
| `ck_inbound_order_items_quantity_positive` | `inbound_order_items` |
| `ck_outbound_order_items_quantity_positive` | `outbound_order_items` |
| `ck_sales_return_items_quantity_positive` | `sales_return_items` |
| `ck_damage_report_items_quantity_positive` | `damage_report_items` |
| `ck_cross_border_shipment_items_quantity_positive` | `cross_border_shipment_items` |
| `ck_transfer_order_items_quantity_positive` | `transfer_order_items` |
| `ck_stock_count_items_quantity_positive` | `stock_count_items` |
| `ck_inventory_adjustment_items_quantity_positive` | `inventory_adjustment_items` |

`production_completion_record_items` 使用正式字段 `completed_quantity`，由专项规则约束，不新增基础 `quantity`。

### 4.3 单据版本（12 项）

以下正式业务主表均要求 `version_no >= 1`：

| 约束名称 | 表 |
| --- | --- |
| `ck_purchase_orders_version_no_range` | `purchase_orders` |
| `ck_purchase_returns_version_no_range` | `purchase_returns` |
| `ck_production_orders_version_no_range` | `production_orders` |
| `ck_inspection_orders_version_no_range` | `inspection_orders` |
| `ck_inbound_orders_version_no_range` | `inbound_orders` |
| `ck_outbound_orders_version_no_range` | `outbound_orders` |
| `ck_sales_returns_version_no_range` | `sales_returns` |
| `ck_damage_reports_version_no_range` | `damage_reports` |
| `ck_cross_border_shipments_version_no_range` | `cross_border_shipments` |
| `ck_transfer_orders_version_no_range` | `transfer_orders` |
| `ck_stock_counts_version_no_range` | `stock_counts` |
| `ck_inventory_adjustments_version_no_range` | `inventory_adjustments` |

### 4.4 层级、排序、导入行号和提前期（7 项）

| 约束名称 | 逻辑规则 |
| --- | --- |
| `ck_product_categories_category_level_range` | `category_level >= 1` |
| `ck_product_categories_sort_order_range` | `sort_order >= 0` |
| `ck_warehouses_sort_order_range` | `sort_order >= 0` |
| `ck_attachment_links_sort_order_range` | `sort_order >= 0` |
| `ck_import_task_items_row_no_range` | `row_no >= 1` |
| `ck_product_suppliers_lead_time_days_range` | `lead_time_days` 为空或不小于 0 |
| `ck_product_manufacturers_lead_time_days_range` | `lead_time_days` 为空或不小于 0 |

## 5. 有效期、停用和单据动作规则（29 项）

### 5.1 有效期（2 项）

| 约束名称 | 逻辑规则 |
| --- | --- |
| `ck_product_suppliers_effective_date_range` | `effective_to` 为空或不早于 `effective_from` |
| `ck_product_manufacturers_effective_date_range` | `effective_to` 为空或不早于 `effective_from` |

### 5.2 停用字段一致性（15 项）

以下约束统一要求：启用时 `disabled_at`、`disabled_by` 均为空；停用时二者均非空且 `disabled_at` 不早于 `created_at`。

| 约束名称 | 表 |
| --- | --- |
| `ck_product_categories_active_fields` | `product_categories` |
| `ck_brands_active_fields` | `brands` |
| `ck_products_active_fields` | `products` |
| `ck_skus_active_fields` | `skus` |
| `ck_suppliers_active_fields` | `suppliers` |
| `ck_manufacturers_active_fields` | `manufacturers` |
| `ck_warehouses_active_fields` | `warehouses` |
| `ck_ecommerce_platforms_active_fields` | `ecommerce_platforms` |
| `ck_stores_active_fields` | `stores` |
| `ck_product_suppliers_active_fields` | `product_suppliers` |
| `ck_product_manufacturers_active_fields` | `product_manufacturers` |
| `ck_users_active_fields` | `users` |
| `ck_roles_active_fields` | `roles` |
| `ck_permissions_active_fields` | `permissions` |
| `ck_system_settings_active_fields` | `system_settings` |

### 5.3 正式单据动作字段（12 项）

以下约束统一要求：`submitted_at/submitted_by` 成组出现且提交时间不早于创建时间；`approved_at/approved_by` 成组出现且审核时间不早于提交时间；`cancelled_at/cancelled_by/cancel_reason` 成组出现且取消时间不早于创建时间。具体状态代码由后续正式枚举设计确定。

| 约束名称 | 表 |
| --- | --- |
| `ck_purchase_orders_action_fields` | `purchase_orders` |
| `ck_purchase_returns_action_fields` | `purchase_returns` |
| `ck_production_orders_action_fields` | `production_orders` |
| `ck_inspection_orders_action_fields` | `inspection_orders` |
| `ck_inbound_orders_action_fields` | `inbound_orders` |
| `ck_outbound_orders_action_fields` | `outbound_orders` |
| `ck_sales_returns_action_fields` | `sales_returns` |
| `ck_damage_reports_action_fields` | `damage_reports` |
| `ck_cross_border_shipments_action_fields` | `cross_border_shipments` |
| `ck_transfer_orders_action_fields` | `transfer_orders` |
| `ck_stock_counts_action_fields` | `stock_counts` |
| `ck_inventory_adjustments_action_fields` | `inventory_adjustments` |

## 6. 一般表更新时间规则（55 项）

以下采用一般表、正式单据或明细公共字段的表均要求 `updated_at` 不早于 `created_at`。约束名称统一为 `ck_<table>_updated_at_range`：

| 约束名称 | 约束名称 | 约束名称 |
| --- | --- | --- |
| `ck_product_categories_updated_at_range` | `ck_brands_updated_at_range` | `ck_products_updated_at_range` |
| `ck_skus_updated_at_range` | `ck_suppliers_updated_at_range` | `ck_manufacturers_updated_at_range` |
| `ck_warehouses_updated_at_range` | `ck_ecommerce_platforms_updated_at_range` | `ck_stores_updated_at_range` |
| `ck_product_suppliers_updated_at_range` | `ck_product_manufacturers_updated_at_range` | `ck_purchase_orders_updated_at_range` |
| `ck_purchase_order_items_updated_at_range` | `ck_purchase_payments_updated_at_range` | `ck_purchase_returns_updated_at_range` |
| `ck_purchase_return_items_updated_at_range` | `ck_production_orders_updated_at_range` | `ck_production_order_items_updated_at_range` |
| `ck_production_payments_updated_at_range` | `ck_production_progress_records_updated_at_range` | `ck_production_completion_records_updated_at_range` |
| `ck_production_completion_record_items_updated_at_range` | `ck_inspection_orders_updated_at_range` | `ck_inspection_order_items_updated_at_range` |
| `ck_inbound_orders_updated_at_range` | `ck_inbound_order_items_updated_at_range` | `ck_outbound_orders_updated_at_range` |
| `ck_outbound_order_items_updated_at_range` | `ck_sales_returns_updated_at_range` | `ck_sales_return_items_updated_at_range` |
| `ck_damage_reports_updated_at_range` | `ck_damage_report_items_updated_at_range` | `ck_cross_border_shipments_updated_at_range` |
| `ck_cross_border_shipment_items_updated_at_range` | `ck_shipment_import_matches_updated_at_range` | `ck_inventories_updated_at_range` |
| `ck_transfer_orders_updated_at_range` | `ck_transfer_order_items_updated_at_range` | `ck_stock_counts_updated_at_range` |
| `ck_stock_count_items_updated_at_range` | `ck_inventory_adjustments_updated_at_range` | `ck_inventory_adjustment_items_updated_at_range` |
| `ck_inventory_alerts_updated_at_range` | `ck_import_tasks_updated_at_range` | `ck_import_task_items_updated_at_range` |
| `ck_users_updated_at_range` | `ck_roles_updated_at_range` | `ck_permissions_updated_at_range` |
| `ck_user_roles_updated_at_range` | `ck_role_permissions_updated_at_range` | `ck_role_warehouses_updated_at_range` |
| `ck_role_stores_updated_at_range` | `ck_system_settings_updated_at_range` | `ck_attachments_updated_at_range` |
| `ck_attachment_links_updated_at_range` | — | — |

只追加或专用任务结构 `inventory_transactions`、`backup_tasks`、`audit_logs`、`document_status_histories`、`approval_records` 不含 `updated_at`，不得新增该字段。

## 7. 业务专项规则（70 项）

| 约束名称 | 逻辑规则 |
| --- | --- |
| `ck_skus_price_and_safety_stock_nonnegative` | 三类默认价格为空或不小于 0，`safety_stock_quantity >= 0` |
| `ck_product_suppliers_commercial_values_nonnegative` | 默认单价、最小起订量为空或不小于 0 |
| `ck_product_manufacturers_commercial_values_nonnegative` | 默认加工价、最小生产量为空或不小于 0 |
| `ck_purchase_orders_values_nonnegative` | 总数量、金额小计、税额、总额、已付及未付金额均不小于 0 |
| `ck_purchase_orders_payment_balance` | `paid_amount <= total_amount` 且 `unpaid_amount = total_amount - paid_amount` |
| `ck_purchase_orders_delivery_date_range` | `expected_delivery_date` 不早于 `document_date` |
| `ck_purchase_order_items_values_nonnegative` | 单价、税率、税额、行金额及各累计数量均不小于 0 |
| `ck_purchase_payments_payment_amount_positive` | `payment_amount > 0` |
| `ck_purchase_returns_values_nonnegative` | `total_quantity`、`total_amount` 均不小于 0 |
| `ck_purchase_return_items_values_nonnegative` | `unit_price`、`line_amount` 均不小于 0 |
| `ck_production_orders_values_nonnegative` | 总数量、金额、已付及未付金额均不小于 0 |
| `ck_production_orders_payment_balance` | `paid_amount <= total_amount` 且 `unpaid_amount = total_amount - paid_amount` |
| `ck_production_orders_completion_percentage_range` | `completion_percentage` 在 0 至 100 之间 |
| `ck_production_orders_date_range` | 计划完成日不早于计划开始日；实际完成日为空或不早于实际开始日 |
| `ck_production_order_items_values_nonnegative` | 加工单价、行金额及计划、完工、验收、合格、入库、发货累计量均不小于 0 |
| `ck_production_payments_payment_amount_positive` | `payment_amount > 0` |
| `ck_production_progress_records_values_nonnegative` | `completed_quantity >= 0` |
| `ck_production_progress_records_percentage_range` | `progress_percentage` 在 0 至 100 之间 |
| `ck_production_progress_records_date_range` | 预计完成日为空或不早于 `progress_date` |
| `ck_production_completion_records_quantity_positive` | `total_completed_quantity > 0` |
| `ck_production_completion_record_items_quantity_positive` | `completed_quantity > 0` |
| `ck_inspection_orders_source_complete` | `purchase_order_id` 与 `production_order_id` 必须且只能有一个非空，且 `source_type` 必填 |
| `ck_inspection_orders_quantities_nonnegative` | 验收、合格和不合格总量均不小于 0 |
| `ck_inspection_orders_quantity_balance` | `total_inspected_quantity = total_qualified_quantity + total_unqualified_quantity` |
| `ck_inspection_order_items_quantities_nonnegative` | 验收、合格、不合格及待处理数量均不小于 0 |
| `ck_inspection_order_items_quantity_balance` | `inspected_quantity = qualified_quantity + unqualified_quantity + pending_quantity` |
| `ck_inbound_orders_source_complete` | `source_document_type` 与 `source_document_id` 必须同时为空或同时非空；实际必填条件由 `inbound_type` 决定 |
| `ck_inbound_orders_total_quantity_nonnegative` | `total_quantity >= 0` |
| `ck_inbound_order_items_cost_nonnegative` | `unit_cost`、`line_cost` 均不小于 0 |
| `ck_outbound_orders_total_quantity_nonnegative` | `total_quantity >= 0` |
| `ck_outbound_order_items_cost_nonnegative` | `unit_cost`、`line_cost` 均不小于 0 |
| `ck_sales_returns_total_quantity_nonnegative` | `total_quantity >= 0` |
| `ck_sales_return_items_quantities_nonnegative` | 退回、可售、待处理及损坏数量均不小于 0 |
| `ck_sales_return_items_quantity_balance` | `returned_quantity = sellable_quantity + pending_quantity + damaged_quantity` |
| `ck_damage_reports_source_complete` | `source_document_type` 与 `source_document_id` 必须同时为空或同时非空 |
| `ck_damage_reports_values_nonnegative` | `total_quantity`、`total_loss_amount` 均不小于 0 |
| `ck_damage_report_items_values_nonnegative` | `unit_cost`、`loss_amount` 均不小于 0 |
| `ck_cross_border_shipments_total_quantity_nonnegative` | `total_quantity >= 0` |
| `ck_cross_border_shipments_warehouse_roles_distinct` | 来源仓、在途仓和目的仓三个 ID 两两不同 |
| `ck_cross_border_shipments_date_range` | 预计及实际到达日不早于发运日 |
| `ck_cross_border_shipment_items_values_nonnegative` | 发货量、实收量、单位成本及行成本均不小于 0；差异量不作非负限制 |
| `ck_shipment_import_matches_values_nonnegative` | 匹配量、实收量均不小于 0；差异量不作非负限制 |
| `ck_inventories_quantities_nonnegative` | 账面、可用、预留及待处理数量均不小于 0 |
| `ck_inventories_quantity_balance` | `available_quantity = on_hand_quantity - reserved_quantity - pending_quantity` |
| `ck_inventory_transactions_quantity_positive` | `quantity > 0`，方向由 `direction` 表达 |
| `ck_inventory_transactions_balance_nonnegative` | `quantity_before`、`quantity_after` 均不小于 0 |
| `ck_inventory_transactions_source_complete` | 来源类型、来源主单 ID、来源明细 ID 原则上全部非空 |
| `ck_inventory_transactions_related_not_self` | `related_transaction_id` 为空或不等于本行 `id` |
| `ck_inventory_transactions_cost_nonnegative` | 单位成本、金额为空或不小于 0 |
| `ck_transfer_orders_total_quantity_nonnegative` | `total_quantity >= 0` |
| `ck_transfer_orders_warehouse_roles_distinct` | 来源仓、在途仓和目的仓三个 ID 两两不同 |
| `ck_transfer_orders_time_range` | 调入时间为空，或调出时间非空且调入时间不早于调出时间 |
| `ck_transfer_order_items_values_nonnegative` | 调出量、调入量及单位成本均不小于 0；差异量不作非负限制 |
| `ck_stock_counts_counts_nonnegative` | 明细总数、差异明细数均不小于 0，且差异明细数不大于明细总数 |
| `ck_stock_counts_time_range` | 完成时间为空，或开始时间非空且完成时间不早于开始时间 |
| `ck_stock_count_items_quantities_nonnegative` | 账面、实盘、复盘和最终数量均不小于 0；差异量不作非负限制 |
| `ck_inventory_adjustments_totals_nonnegative` | 增加总量、减少总量均不小于 0 |
| `ck_inventory_adjustment_items_values_nonnegative` | 调整前后数量、单位成本和金额均不小于 0；`adjustment_quantity` 不机械限制为非负 |
| `ck_inventory_alerts_quantities_nonnegative` | 阈值数量、触发时当前数量均不小于 0 |
| `ck_import_tasks_row_counts_nonnegative` | 总行、成功、失败和警告行数均不小于 0 |
| `ck_import_tasks_row_count_balance` | 成功行数与失败行数之和不大于总行数；警告行数不大于总行数 |
| `ck_import_tasks_time_range` | 完成时间为空，或开始时间非空且完成时间不早于开始时间 |
| `ck_import_task_items_result_complete` | `result_document_type` 与 `result_document_id` 必须同时为空或同时非空 |
| `ck_users_failed_login_count_nonnegative` | `failed_login_count >= 0` |
| `ck_backup_tasks_file_size_nonnegative` | `file_size` 为空或不小于 0 |
| `ck_backup_tasks_time_range` | 完成时间为空，或开始时间非空且完成时间不早于开始时间 |
| `ck_backup_tasks_retention_range` | 保留截止时间为空，或完成时间非空且保留截止时间不早于完成时间 |
| `ck_attachments_file_size_nonnegative` | `file_size >= 0` |
| `ck_document_status_histories_status_changed` | `from_status` 为空或不等于 `to_status` |
| `ck_approval_records_previous_not_self` | `previous_approval_record_id` 为空或不等于本行 `id` |

## 8. 仓库条件补充（3 项）

| 约束名称 | 逻辑规则 |
| --- | --- |
| `ck_warehouses_manufacturer_required` | 厂家仓必须填写 `manufacturer_id` |
| `ck_warehouses_country_required` | 海外仓必须填写 `country_code` |
| `ck_warehouses_available_stock_role` | 在途仓和待处理仓不得允许形成可用库存 |

仓库类型的具体枚举代码以 [数据库枚举规范](../../03-data/DATABASE_ENUM_SPEC.md) 为正式依据，物理映射必须引用其已批准的 `warehouse_type` 枚举集合。

## 9. Check 与服务层校验边界

Check 只验证同一行字段组合，以下事项必须由服务层或事务逻辑验证：

1. 多态目标表及目标记录是否存在；
2. 来源明细是否属于来源主单；
3. 采购退货、生产完工、验收、入库及库存流水的 SKU 是否一致；
4. 付款供应商或厂家是否与所属单据一致；
5. 仓库 ID 对应的实际仓库类型是否满足业务角色；
6. 跨表日期先后关系；
7. 库存流水是否由合法状态的正式业务触发；
8. 库存事务、并发锁、幂等和禁止负库存的事务实现；
9. 用户权限及制单审核分离；
10. 分类完整循环检测；
11. 完整枚举值集合及类型到目标表映射。

## 10. 数量汇总

- 公共结构规则：44 项；
- 有效期、停用和单据动作规则：29 项；
- 一般表更新时间规则：55 项；
- 业务专项规则：70 项；
- 仓库条件补充：3 项；
- Check 逻辑规则合计：201 项。

## 11. 正式结论

1. 正式单据明细基础数量原则上大于 0。
2. 金额、价格、安全库存及普通累计数量不得为负数。
3. 允许表达变化方向的差异量不得错误限制为非负。
4. 行号、导入行号、版本号和分类层级从 1 开始。
5. 有效期结束日期不得早于开始日期。
6. 提交、审核、取消和停用必须具备一致的操作字段。
7. 验收来源字段必须完整并保持采购、生产互斥。
8. 入库来源类型与来源 ID 必须成组出现。
9. 库存流水来源字段必须满足完整性规则。
10. 厂家仓必须关联厂家，海外仓必须具备国家代码。
11. 跨境发货和调拨的仓库角色不得相同。
12. 当前库存和可用库存不得为负，库存公式使用已批准的 `pending_quantity`。
13. Check 不承担跨表目标存在性、权限或库存事务验证。
14. 具体数据库语法留待后续具备相应范围和正式授权的阶段确定。
15. Task 3.5.5 作为 Task 3.5.6 数据库命名规范的正式输入。

## 12. 状态与边界

- Phase 3：In Progress；
- Task 3.5：In Progress；
- Task 3.5.5：Completed / Approved；
- Task 3.5.6：In Progress；
- SQL、ORM、Schema、Migration、数据库选型及技术开发：Not Started。

Task 3.5.5 已完成。Task 3.5.6 按数据库设计冲刺进入 In Progress，但本文件不包含其设计内容。
