---
document_name: Task 3.5.4 索引设计
project: Violin ERP Lite
version: 1.0
status: Approved
owner: Project Manager
created_date: 2026-07-20
updated_date: 2026-07-20
related_phase: Phase 3
---

# Task 3.5.4：索引设计（Index Design）

## 1. 任务信息

| 项目 | 内容 |
| --- | --- |
| 所属阶段 | Phase 3：数据库设计（Database Design，In Progress） |
| 所属任务 | Task 3.5：字段类型、约束与索引设计（In Progress） |
| 当前小任务 | Task 3.5.4：索引设计 |
| 前置小任务 | Task 3.5.3：外键关系规范（Completed / Approved） |
| 文档状态 | Approved |
| 小任务状态 | Completed / Approved |
| 下一小任务 | Task 3.5.5：Check 约束设计（In Progress） |

## 2. 任务范围

本任务负责逻辑索引需求、外键字段索引、高频状态日期及业务主体组合索引、多态查询索引、历史与只追加表查询索引，以及重复和过度索引检查。

本任务不负责数据库特定索引语法、全文索引、函数索引、部分索引具体语法、排序方向、覆盖索引、SQL、Schema、Migration 或性能压测。

## 3. 索引类型与原则

项目逻辑上区分四类索引：

1. 主键索引：由全部 60 张正式表的 UUID 主键 `id` 自动形成。
2. 唯一索引：由 Task 3.5.2 的唯一约束形成。
3. 外键索引：服务关联检查和父子关系查询，普通外键原则上应获得有效索引覆盖。
4. 普通查询索引：服务已确认的业务主体、状态、日期、多态对象和历史查询路径。

统一原则：

- 不重复创建与主键或唯一约束完全相同的普通索引；
- 组合索引优先匹配真实过滤路径，索引字段顺序按本任务逻辑顺序记录；
- 多态引用优先使用“类型 + 对象 ID”组合；
- 高频历史查询可在对象组合后追加时间字段；
- 单据明细的主表外键若已被“主表 ID + 行号”唯一索引前缀覆盖，不再机械增加单列索引；
- 本任务只确定逻辑建议，不绑定数据库实现。

## 4. 命名规范

- 单字段：`idx_<table>_<field>`；
- 双字段：`idx_<table>_<field1>_<field2>`；
- 三字段：`idx_<table>_<field1>_<field2>_<field3>`。

字段名称全部来自 Task 3.4。附件中的 `recorded_at` 映射为正式字段 `progress_date`；验收来源使用正式字段 `purchase_order_id`、`production_order_id`；库存预警状态使用 `alert_status`。

## 5. 基础资料类普通索引（12 项）

| 索引名称 | 字段顺序 | 主要用途 | 分类 |
| --- | --- | --- | --- |
| `idx_product_categories_parent_category_id_sort_order` | `parent_category_id, sort_order` | 分类树同级排序 | 外键、组合 |
| `idx_products_category_id_is_active` | `category_id, is_active` | 分类下启用产品 | 外键、组合 |
| `idx_products_brand_id_is_active` | `brand_id, is_active` | 品牌下启用产品 | 外键、组合 |
| `idx_skus_product_id_is_active` | `product_id, is_active` | 产品下启用 SKU | 外键、组合 |
| `idx_skus_is_active_sku_name` | `is_active, sku_name` | 启用 SKU 名称筛选 | 组合 |
| `idx_warehouses_warehouse_type_is_active` | `warehouse_type, is_active` | 仓库类型列表 | 组合 |
| `idx_warehouses_manufacturer_id_is_active` | `manufacturer_id, is_active` | 厂家仓查询 | 外键、组合 |
| `idx_stores_platform_id_is_active` | `platform_id, is_active` | 平台下启用店铺 | 外键、组合 |
| `idx_product_suppliers_supplier_id_is_active` | `supplier_id, is_active` | 供应商合作产品 | 外键、组合 |
| `idx_product_suppliers_product_id_is_preferred_is_active` | `product_id, is_preferred, is_active` | 产品首选供应商 | 外键、组合 |
| `idx_product_manufacturers_manufacturer_id_is_active` | `manufacturer_id, is_active` | 厂家合作产品 | 外键、组合 |
| `idx_product_manufacturers_product_id_is_preferred_is_active` | `product_id, is_preferred, is_active` | 产品首选厂家 | 外键、组合 |

## 6. 采购与生产类普通索引（16 项）

| 索引名称 | 字段顺序 | 主要用途 | 分类 |
| --- | --- | --- | --- |
| `idx_purchase_orders_supplier_id_status_document_date` | `supplier_id, status, document_date` | 供应商采购单列表 | 外键、组合 |
| `idx_purchase_orders_approval_status_document_date` | `approval_status, document_date` | 待审采购单 | 组合 |
| `idx_purchase_order_items_sku_id` | `sku_id` | SKU 采购明细追溯 | 外键 |
| `idx_purchase_payments_purchase_order_id_payment_date` | `purchase_order_id, payment_date` | 采购单付款历史 | 外键、组合 |
| `idx_purchase_payments_supplier_id_payment_date` | `supplier_id, payment_date` | 供应商付款历史 | 外键、组合 |
| `idx_purchase_returns_purchase_order_id_status` | `purchase_order_id, status` | 原采购单退货查询 | 外键、组合 |
| `idx_purchase_returns_source_inbound_order_id` | `source_inbound_order_id` | 原入库单退货追溯 | 外键 |
| `idx_purchase_return_items_sku_id` | `sku_id` | SKU 采购退货追溯 | 外键 |
| `idx_production_orders_manufacturer_id_status_document_date` | `manufacturer_id, status, document_date` | 厂家生产单列表 | 外键、组合 |
| `idx_production_orders_approval_status_document_date` | `approval_status, document_date` | 待审生产单 | 组合 |
| `idx_production_order_items_sku_id` | `sku_id` | SKU 生产明细追溯 | 外键 |
| `idx_production_payments_production_order_id_payment_date` | `production_order_id, payment_date` | 生产单付款历史 | 外键、组合 |
| `idx_production_progress_records_production_order_id_progress_date` | `production_order_id, progress_date` | 生产进度时间线 | 外键、组合 |
| `idx_production_completion_records_production_order_id_completion_date` | `production_order_id, completion_date` | 分批完工时间线 | 外键、组合 |
| `idx_production_completion_record_items_production_order_item_id` | `production_order_item_id` | 原生产明细完工追溯 | 外键 |
| `idx_production_completion_record_items_sku_id` | `sku_id` | SKU 完工记录追溯 | 外键 |

## 7. 验收与出入库类普通索引（20 项）

| 索引名称 | 字段顺序 | 主要用途 | 分类 |
| --- | --- | --- | --- |
| `idx_inspection_orders_source_type_purchase_order_id` | `source_type, purchase_order_id` | 采购来源验收查询 | 外键、多态、组合 |
| `idx_inspection_orders_source_type_production_order_id` | `source_type, production_order_id` | 生产来源验收查询 | 外键、多态、组合 |
| `idx_inspection_orders_inspection_warehouse_id_status_document_date` | `inspection_warehouse_id, status, document_date` | 仓库验收单列表 | 外键、组合 |
| `idx_inspection_order_items_source_item_id` | `source_item_id` | 受控来源明细追溯 | 多态 |
| `idx_inspection_order_items_sku_id` | `sku_id` | SKU 验收历史 | 外键 |
| `idx_inbound_orders_warehouse_id_status_document_date` | `warehouse_id, status, document_date` | 仓库入库单列表 | 外键、组合 |
| `idx_inbound_orders_source_document_type_source_document_id` | `source_document_type, source_document_id` | 入库来源主单追溯 | 多态、组合 |
| `idx_inbound_order_items_source_document_item_id` | `source_document_item_id` | 入库来源明细追溯 | 多态 |
| `idx_inbound_order_items_sku_id` | `sku_id` | SKU 入库历史 | 外键 |
| `idx_outbound_orders_warehouse_id_status_document_date` | `warehouse_id, status, document_date` | 仓库出库单列表 | 外键、组合 |
| `idx_outbound_orders_store_id_status_document_date` | `store_id, status, document_date` | 店铺出库单列表 | 外键、组合 |
| `idx_outbound_order_items_sku_id` | `sku_id` | SKU 出库历史 | 外键 |
| `idx_sales_returns_outbound_order_id_status` | `outbound_order_id, status` | 原出库单退货查询 | 外键、组合 |
| `idx_sales_returns_store_id_document_date` | `store_id, document_date` | 店铺退货列表 | 外键、组合 |
| `idx_sales_return_items_outbound_order_item_id` | `outbound_order_item_id` | 原出库明细退货追溯 | 外键 |
| `idx_sales_return_items_sku_id` | `sku_id` | SKU 销售退货历史 | 外键 |
| `idx_damage_reports_warehouse_id_status_document_date` | `warehouse_id, status, document_date` | 仓库报损单列表 | 外键、组合 |
| `idx_damage_reports_source_document_type_source_document_id` | `source_document_type, source_document_id` | 报损来源主单追溯 | 多态、组合 |
| `idx_damage_report_items_source_document_item_id` | `source_document_item_id` | 报损来源明细追溯 | 多态 |
| `idx_damage_report_items_sku_id` | `sku_id` | SKU 报损历史 | 外键 |

`outbound_orders(store_id, external_order_no)` 已由唯一约束覆盖，不重复建立普通索引。

## 8. 跨境与库存类普通索引（23 项）

| 索引名称 | 字段顺序 | 主要用途 | 分类 |
| --- | --- | --- | --- |
| `idx_cross_border_shipments_source_warehouse_id_status_document_date` | `source_warehouse_id, status, document_date` | 来源仓跨境单列表 | 外键、组合 |
| `idx_cross_border_shipments_destination_warehouse_id_status_document_date` | `destination_warehouse_id, status, document_date` | 目的仓跨境单列表 | 外键、组合 |
| `idx_cross_border_shipments_production_order_id` | `production_order_id` | 生产单跨境追溯 | 外键 |
| `idx_cross_border_shipment_items_sku_id` | `sku_id` | SKU 跨境历史 | 外键 |
| `idx_shipment_import_matches_import_task_id` | `import_task_id` | 导入任务匹配记录 | 外键 |
| `idx_shipment_import_matches_cross_border_shipment_id` | `cross_border_shipment_id` | 跨境主单匹配记录 | 外键 |
| `idx_inventories_warehouse_id_sku_id` | `warehouse_id, sku_id` | 仓库库存列表 | 外键、组合 |
| `idx_inventory_transactions_sku_id_warehouse_id_created_at` | `sku_id, warehouse_id, created_at` | SKU 仓库流水时间线 | 外键、组合 |
| `idx_inventory_transactions_warehouse_id_created_at` | `warehouse_id, created_at` | 仓库流水时间线 | 外键、组合 |
| `idx_inventory_transactions_source_document_type_source_document_id` | `source_document_type, source_document_id` | 来源主单流水 | 多态、组合 |
| `idx_inventory_transactions_source_document_type_source_document_id_source_document_item_id` | `source_document_type, source_document_id, source_document_item_id` | 来源明细流水 | 多态、组合 |
| `idx_inventory_transactions_related_transaction_id` | `related_transaction_id` | 关联流水追溯 | 外键 |
| `idx_transfer_orders_source_warehouse_id_status_document_date` | `source_warehouse_id, status, document_date` | 调出仓调拨单列表 | 外键、组合 |
| `idx_transfer_orders_destination_warehouse_id_status_document_date` | `destination_warehouse_id, status, document_date` | 调入仓调拨单列表 | 外键、组合 |
| `idx_transfer_order_items_sku_id` | `sku_id` | SKU 调拨历史 | 外键 |
| `idx_stock_counts_warehouse_id_status_document_date` | `warehouse_id, status, document_date` | 仓库盘点单列表 | 外键、组合 |
| `idx_stock_count_items_sku_id` | `sku_id` | SKU 盘点历史 | 外键 |
| `idx_inventory_adjustments_warehouse_id_status_document_date` | `warehouse_id, status, document_date` | 仓库调整单列表 | 外键、组合 |
| `idx_inventory_adjustments_stock_count_id` | `stock_count_id` | 盘点调整追溯 | 外键 |
| `idx_inventory_adjustment_items_sku_id` | `sku_id` | SKU 调整历史 | 外键 |
| `idx_inventory_alerts_alert_status_warehouse_id` | `alert_status, warehouse_id` | 仓库预警处理列表 | 外键、组合 |
| `idx_inventory_alerts_sku_id_alert_status` | `sku_id, alert_status` | SKU 未处理预警 | 外键、组合 |
| `idx_inventory_alerts_created_at` | `created_at` | 预警时间排序 | 时间 |

`inventories(sku_id, warehouse_id)` 已由唯一约束覆盖；这里只增加反向 `warehouse_id, sku_id` 以服务仓库库存列表。

## 9. 系统与治理类普通索引（19 项）

| 索引名称 | 字段顺序 | 主要用途 | 分类 |
| --- | --- | --- | --- |
| `idx_import_tasks_status_created_at` | `status, created_at` | 导入任务处理列表 | 组合 |
| `idx_import_tasks_warehouse_id_created_at` | `warehouse_id, created_at` | 仓库导入历史 | 外键、组合 |
| `idx_import_tasks_store_id_created_at` | `store_id, created_at` | 店铺导入历史 | 外键、组合 |
| `idx_import_task_items_matched_sku_id` | `matched_sku_id` | SKU 导入匹配历史 | 外键 |
| `idx_import_task_items_result_document_type_result_document_id` | `result_document_type, result_document_id` | 导入结果单据追溯 | 多态、组合 |
| `idx_user_roles_role_id` | `role_id` | 角色下用户查询 | 外键 |
| `idx_role_permissions_permission_id` | `permission_id` | 权限下角色查询 | 外键 |
| `idx_role_warehouses_warehouse_id` | `warehouse_id` | 仓库授权角色查询 | 外键 |
| `idx_role_stores_store_id` | `store_id` | 店铺授权角色查询 | 外键 |
| `idx_attachments_uploaded_by_created_at` | `uploaded_by, created_at` | 用户上传历史 | 外键、组合 |
| `idx_attachment_links_object_type_object_id` | `object_type, object_id` | 对象附件查询 | 多态、组合 |
| `idx_attachment_links_object_type_object_id_object_item_id` | `object_type, object_id, object_item_id` | 对象明细附件查询 | 多态、组合 |
| `idx_audit_logs_object_type_object_id_created_at` | `object_type, object_id, created_at` | 对象审计时间线 | 多态、组合 |
| `idx_audit_logs_user_id_created_at` | `user_id, created_at` | 用户审计时间线 | 外键、组合 |
| `idx_audit_logs_created_at` | `created_at` | 全局审计时间排序 | 时间 |
| `idx_document_status_histories_object_type_object_id_created_at` | `object_type, object_id, created_at` | 单据状态时间线 | 多态、组合 |
| `idx_approval_records_object_type_object_id_created_at` | `object_type, object_id, created_at` | 单据审批时间线 | 多态、组合 |
| `idx_approval_records_approver_id_created_at` | `approver_id, created_at` | 审批人处理历史 | 外键、组合 |
| `idx_backup_tasks_status_created_at` | `status, created_at` | 备份任务处理列表 | 组合 |

`import_task_items(import_task_id, row_no)` 已由唯一约束覆盖，不重复建立普通索引。

## 10. 重复与过度索引控制

本次共排除 21 项与现有唯一索引完全相同或已被其有效前缀覆盖的普通索引建议：

- 13 张正式业务明细表的所属主表单列索引，已由“主表 ID + 行号”唯一索引覆盖；
- `import_task_items.import_task_id`，已由 `import_task_id, row_no` 唯一索引覆盖；
- `attachment_links.attachment_id`，已由附件关联组合唯一索引前缀覆盖；
- `user_roles.user_id`、`role_permissions.role_id`、`role_warehouses.role_id`、`role_stores.role_id`，已由各自关系组合唯一索引前缀覆盖；
- `inventories(sku_id, warehouse_id)`，已由库存余额唯一约束覆盖；
- `outbound_orders(store_id, external_order_no)`，已由店铺外部订单唯一约束覆盖。

不得机械为长备注、地址、描述、JSON、审计前后快照、文件名、校验值、银行账号、联系电话、联系邮箱或低选择性的单独布尔字段建立普通索引。

## 11. 数量汇总

- 普通逻辑索引：90 项；
- 含外键字段的索引：69 项；
- 组合索引：59 项；
- 多态查询索引：15 项；
- 单字段索引：31 项；
- 排除的重复索引建议：21 项。

分类可能重叠，例如外键组合索引同时计入外键索引和组合索引。

## 12. 正式结论

1. 普通外键字段原则上应获得有效索引覆盖。
2. 主键及唯一约束形成的索引不重复创建。
3. 正式单据围绕业务主体、状态和日期建立组合索引。
4. 单据明细围绕主单外键覆盖和 SKU 建立索引。
5. 多态引用使用类型与对象 ID 组合索引。
6. 库存流水重点索引 SKU、仓库、时间和来源。
7. 历史表重点索引对象和时间。
8. 仓库库存列表使用 `warehouse_id, sku_id` 反向组合索引。
9. 不机械为所有字段建立索引。
10. 不为长文本、JSON 及快照字段建立普通索引。
11. 物理索引细节留待后续具备相应范围和正式授权的阶段及性能测试确定。
12. Task 3.5.4 作为 Task 3.5.5 Check 约束设计的正式输入。

## 13. 状态与边界

- Phase 3：In Progress；
- Task 3.5：In Progress；
- Task 3.5.4：Completed / Approved；
- Task 3.5.5：In Progress；
- Check 约束：尚未完成；
- SQL、ORM、Schema、Migration、数据库选型及技术开发：Not Started。

Task 3.5.4 已完成。Task 3.5.5 按冲刺指令进入 In Progress，但本文件不包含其设计内容。
