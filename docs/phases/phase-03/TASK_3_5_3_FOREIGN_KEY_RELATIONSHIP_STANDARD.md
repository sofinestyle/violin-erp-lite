---
document_name: Task 3.5.3 外键关系规范
project: Violin ERP Lite
version: 1.0
status: Approved
owner: Project Manager
created_date: 2026-07-20
updated_date: 2026-07-20
related_phase: Phase 3
---

# Task 3.5.3：外键关系规范（Foreign Key Relationship Standard）

## 1. 任务信息

| 项目 | 内容 |
| --- | --- |
| 所属阶段 | Phase 3：数据库设计（Database Design，In Progress） |
| 所属任务 | Task 3.5：字段类型、约束与索引设计（In Progress） |
| 当前小任务 | Task 3.5.3：外键关系规范 |
| 前置小任务 | Task 3.5.2：主键与唯一约束设计（Completed / Approved） |
| 文档状态 | Approved |
| 小任务状态 | Completed / Approved |
| 下一小任务 | Task 3.5.4：索引设计（Not Started） |

## 2. 任务范围

本任务负责：

- 检查全部 60 张正式表的外键需求；
- 确定已批准外键字段的引用目标和业务必填性；
- 确定外键更新、删除及结构性级联策略；
- 确定基础资料、单据主从、库存、跨境、权限和历史表引用规则；
- 确定受控多态业务引用不建立普通单表物理外键的范围；
- 明确停用、作废与物理删除边界。

本任务不负责普通查询索引、Check 约束、枚举完整合法值、SQL、ORM、Schema、Migration、数据库技术选型、页面、API 或业务代码。

## 3. Task 3.4 字段名称映射

本任务只使用 Task 3.4 已批准字段，不新增字段。附件中的描述性名称按下表映射到正式字段：

| 业务描述 | Task 3.4 正式字段 | 处理方式 |
| --- | --- | --- |
| 采购退货原入库单 `inbound_order_id` | `purchase_returns.source_inbound_order_id` | 使用正式字段建立普通外键 |
| 采购退货原入库明细 `inbound_order_item_id` | `purchase_return_items.source_inbound_order_item_id` | 使用正式字段建立普通外键 |
| 验收仓 `warehouse_id` | `inspection_orders.inspection_warehouse_id` | 使用正式字段建立普通外键 |
| 验收用户字段 | `inspection_orders.inspector_id` | 使用正式字段建立普通外键 |
| 验收来源明细 ID | `inspection_order_items.source_item_id` | 结合主单 `source_type` 受控解析，不建立错误的单表外键 |
| 入库采购、生产或销售退货来源 ID | `inbound_orders.source_document_type`、`source_document_id` | 受控多态引用，不新增平行来源字段 |
| 入库采购、生产或销售退货来源明细 ID | `inbound_order_items.source_document_item_id` | 结合入库主单来源类型受控解析 |
| 生产进度记录用户或完工确认用户 | 对应表公共字段 `created_by` | 使用已批准公共用户字段，不新增专用字段 |
| 审计与单据历史的 `document_type/document_id` | `object_type`、`object_id` | 使用 Task 3.4 正式字段 |
| 审批提交、审核用户描述 | `approval_records.approver_id` | 使用正式审批用户字段，不新增 `submitted_by` 或 `approved_by` |

上述差异均可由已批准字段承载，未发现缺少关系承载字段的情况。

## 4. 外键统一原则

### 4.1 默认策略

所有普通业务外键默认采用逻辑策略：更新时 `RESTRICT`，删除时 `RESTRICT`。

原因：

- 主键建立后不得随意修改；
- 已被业务引用的数据不得物理删除；
- 历史单据、库存流水、付款、审批和审计记录必须保持完整；
- 基础资料停用不能破坏历史引用。

### 4.2 结构性 CASCADE

删除时 `CASCADE` 仅用于完全依附父记录、不能独立存在的结构性明细、导入任务明细、纯权限关联关系及附件关系记录。

`CASCADE` 只表示结构完整性策略，不代表应用层可以删除正式业务单据。只有草稿状态、未产生下游业务、未产生库存流水且未形成审计历史时，应用层才可按正式规则评估物理删除；已提交、审核、完成、取消、作废或产生下游关系的主单及明细必须保留。

### 4.3 SET NULL

第一阶段不主动使用 `SET NULL`。用户、供应商、生产厂家、产品、SKU、仓库、正式业务单据、单据明细、库存流水来源、审批和状态历史关系均不得通过置空破坏追溯。

### 4.4 停用代替删除

基础资料使用 Task 3.4 已批准的 `is_active`、`disabled_at`、`disabled_by` 管理停用。已被业务引用的基础资料不得物理删除。

## 5. 外键命名规范

外键统一命名为 `fk_<child_table>_<field>`，例如 `fk_skus_product_id`、`fk_purchase_orders_supplier_id`、`fk_purchase_order_items_purchase_order_id`。

同一字段只能指向一个明确目标表。受控多态字段不得建立指向任意单一业务表的错误外键。下表删除策略未另行说明时均为 `RESTRICT`，所有外键更新策略统一为 `RESTRICT`。

## 6. 公共用户引用规则

Task 3.4 已批准的 `created_by`、`updated_by`、`disabled_by`、`submitted_by`、`approved_by`、`cancelled_by` 及各表专用操作用户字段统一引用 `users.id`，删除和更新均为 `RESTRICT`。

业务必填性严格沿用 Task 3.4：创建用户必填；允许修改的表更新用户必填；停用、提交、审核、取消等动作发生后相应用户字段必填。`audit_logs.user_id` 对用户事件必填，系统事件可按 Task 3.4 保持为空；其他自动任务、初始化数据及必须记录操作主体的系统操作使用不可删除的系统用户，不得以空用户绕过审计要求。

公共用户引用覆盖：

- 55 张采用一般表、单据主表或明细公共字段的表各包含 `created_by`、`updated_by`，共 110 项；
- 12 张正式业务单据各包含 `submitted_by`、`approved_by`、`cancelled_by`，共 36 项；
- 15 张主数据、配置及可停用表包含 `disabled_by`，共 15 项。

公共用户引用合计 161 项，均为 `RESTRICT`。各表专用用户字段另列入后续专项外键清单。

## 7. 基础资料类外键（11 张）

| 表 | 外键名称 | 字段 | 引用目标 | 业务必填性 | 删除策略 |
| --- | --- | --- | --- | --- | --- |
| `product_categories` | `fk_product_categories_parent_category_id` | `parent_category_id` | `product_categories.id` | 顶级分类可空 | RESTRICT |
| `brands` | — | — | 除公共用户字段外无专项外键 | — | — |
| `products` | `fk_products_category_id` | `category_id` | `product_categories.id` | 必填 | RESTRICT |
| `products` | `fk_products_brand_id` | `brand_id` | `brands.id` | 必填 | RESTRICT |
| `skus` | `fk_skus_product_id` | `product_id` | `products.id` | 必填 | RESTRICT |
| `suppliers` | — | — | 除公共用户字段外无专项外键 | — | — |
| `manufacturers` | — | — | 除公共用户字段外无专项外键 | — | — |
| `warehouses` | `fk_warehouses_manufacturer_id` | `manufacturer_id` | `manufacturers.id` | 厂家仓必填，其他仓可空 | RESTRICT |
| `ecommerce_platforms` | — | — | 除公共用户字段外无专项外键 | — | — |
| `stores` | `fk_stores_platform_id` | `platform_id` | `ecommerce_platforms.id` | 必填 | RESTRICT |
| `product_suppliers` | `fk_product_suppliers_product_id` | `product_id` | `products.id` | 必填 | RESTRICT |
| `product_suppliers` | `fk_product_suppliers_supplier_id` | `supplier_id` | `suppliers.id` | 必填 | RESTRICT |
| `product_manufacturers` | `fk_product_manufacturers_product_id` | `product_id` | `products.id` | 必填 | RESTRICT |
| `product_manufacturers` | `fk_product_manufacturers_manufacturer_id` | `manufacturer_id` | `manufacturers.id` | 必填 | RESTRICT |

分类不得关联自身或形成循环层级；厂家仓必须关联厂家。上述条件一致性留待 Check 约束或服务层校验，不在本任务实现。合作历史通过有效期和停用状态保留。

## 8. 采购与生产类外键（11 张）

| 表 | 外键名称 | 字段 | 引用目标 | 业务必填性 | 删除策略 |
| --- | --- | --- | --- | --- | --- |
| `purchase_orders` | `fk_purchase_orders_supplier_id` | `supplier_id` | `suppliers.id` | 必填 | RESTRICT |
| `purchase_order_items` | `fk_purchase_order_items_purchase_order_id` | `purchase_order_id` | `purchase_orders.id` | 必填 | CASCADE |
| `purchase_order_items` | `fk_purchase_order_items_sku_id` | `sku_id` | `skus.id` | 必填 | RESTRICT |
| `purchase_payments` | `fk_purchase_payments_purchase_order_id` | `purchase_order_id` | `purchase_orders.id` | 必填 | RESTRICT |
| `purchase_payments` | `fk_purchase_payments_supplier_id` | `supplier_id` | `suppliers.id` | 必填 | RESTRICT |
| `purchase_returns` | `fk_purchase_returns_supplier_id` | `supplier_id` | `suppliers.id` | 必填 | RESTRICT |
| `purchase_returns` | `fk_purchase_returns_purchase_order_id` | `purchase_order_id` | `purchase_orders.id` | 必填 | RESTRICT |
| `purchase_returns` | `fk_purchase_returns_source_inbound_order_id` | `source_inbound_order_id` | `inbound_orders.id` | 必填 | RESTRICT |
| `purchase_returns` | `fk_purchase_returns_return_warehouse_id` | `return_warehouse_id` | `warehouses.id` | 必填 | RESTRICT |
| `purchase_return_items` | `fk_purchase_return_items_purchase_return_id` | `purchase_return_id` | `purchase_returns.id` | 必填 | CASCADE |
| `purchase_return_items` | `fk_purchase_return_items_purchase_order_item_id` | `purchase_order_item_id` | `purchase_order_items.id` | 必填 | RESTRICT |
| `purchase_return_items` | `fk_purchase_return_items_source_inbound_order_item_id` | `source_inbound_order_item_id` | `inbound_order_items.id` | 必填 | RESTRICT |
| `purchase_return_items` | `fk_purchase_return_items_sku_id` | `sku_id` | `skus.id` | 必填 | RESTRICT |
| `production_orders` | `fk_production_orders_manufacturer_id` | `manufacturer_id` | `manufacturers.id` | 必填 | RESTRICT |
| `production_order_items` | `fk_production_order_items_production_order_id` | `production_order_id` | `production_orders.id` | 必填 | CASCADE |
| `production_order_items` | `fk_production_order_items_sku_id` | `sku_id` | `skus.id` | 必填 | RESTRICT |
| `production_payments` | `fk_production_payments_production_order_id` | `production_order_id` | `production_orders.id` | 必填 | RESTRICT |
| `production_payments` | `fk_production_payments_manufacturer_id` | `manufacturer_id` | `manufacturers.id` | 必填 | RESTRICT |
| `production_progress_records` | `fk_production_progress_records_production_order_id` | `production_order_id` | `production_orders.id` | 必填 | RESTRICT |
| `production_completion_records` | `fk_production_completion_records_production_order_id` | `production_order_id` | `production_orders.id` | 必填 | RESTRICT |
| `production_completion_records` | `fk_production_completion_records_warehouse_id` | `warehouse_id` | `warehouses.id` | 必填 | RESTRICT |
| `production_completion_record_items` | `fk_production_completion_record_items_production_completion_record_id` | `production_completion_record_id` | `production_completion_records.id` | 必填 | CASCADE |
| `production_completion_record_items` | `fk_production_completion_record_items_production_order_item_id` | `production_order_item_id` | `production_order_items.id` | 必填 | RESTRICT |
| `production_completion_record_items` | `fk_production_completion_record_items_sku_id` | `sku_id` | `skus.id` | 必填 | RESTRICT |

采购付款的供应商必须与采购单供应商一致，生产付款的厂家必须与生产单厂家一致。采购退货明细必须属于所关联的原采购单和原入库单，且 SKU 一致。生产完工明细必须属于完工记录对应生产单，且 SKU 与原生产明细一致。上述跨行一致性由服务层校验。

采购单与生产单保持平行，不建立相互外键。生产进度和完工主记录属于历史事实，不随生产单级联删除。

## 9. 验收与出入库类外键（10 张）

| 表 | 外键名称 | 字段 | 引用目标 | 业务必填性 | 删除策略 |
| --- | --- | --- | --- | --- | --- |
| `inspection_orders` | `fk_inspection_orders_purchase_order_id` | `purchase_order_id` | `purchase_orders.id` | 采购验收时必填 | RESTRICT |
| `inspection_orders` | `fk_inspection_orders_production_order_id` | `production_order_id` | `production_orders.id` | 生产验收时必填 | RESTRICT |
| `inspection_orders` | `fk_inspection_orders_inspection_warehouse_id` | `inspection_warehouse_id` | `warehouses.id` | 必填 | RESTRICT |
| `inspection_orders` | `fk_inspection_orders_inspector_id` | `inspector_id` | `users.id` | 必填 | RESTRICT |
| `inspection_order_items` | `fk_inspection_order_items_inspection_order_id` | `inspection_order_id` | `inspection_orders.id` | 必填 | CASCADE |
| `inspection_order_items` | `fk_inspection_order_items_sku_id` | `sku_id` | `skus.id` | 必填 | RESTRICT |
| `inbound_orders` | `fk_inbound_orders_warehouse_id` | `warehouse_id` | `warehouses.id` | 必填 | RESTRICT |
| `inbound_orders` | `fk_inbound_orders_supplier_id` | `supplier_id` | `suppliers.id` | 采购入库时必填 | RESTRICT |
| `inbound_orders` | `fk_inbound_orders_manufacturer_id` | `manufacturer_id` | `manufacturers.id` | 生产入库时必填 | RESTRICT |
| `inbound_orders` | `fk_inbound_orders_inspection_order_id` | `inspection_order_id` | `inspection_orders.id` | 适用验收入库时必填 | RESTRICT |
| `inbound_order_items` | `fk_inbound_order_items_inbound_order_id` | `inbound_order_id` | `inbound_orders.id` | 必填 | CASCADE |
| `inbound_order_items` | `fk_inbound_order_items_inspection_order_item_id` | `inspection_order_item_id` | `inspection_order_items.id` | 适用验收入库时必填 | RESTRICT |
| `inbound_order_items` | `fk_inbound_order_items_sku_id` | `sku_id` | `skus.id` | 必填 | RESTRICT |
| `outbound_orders` | `fk_outbound_orders_warehouse_id` | `warehouse_id` | `warehouses.id` | 必填 | RESTRICT |
| `outbound_orders` | `fk_outbound_orders_platform_id` | `platform_id` | `ecommerce_platforms.id` | 销售出库时必填 | RESTRICT |
| `outbound_orders` | `fk_outbound_orders_store_id` | `store_id` | `stores.id` | 销售出库时必填 | RESTRICT |
| `outbound_order_items` | `fk_outbound_order_items_outbound_order_id` | `outbound_order_id` | `outbound_orders.id` | 必填 | CASCADE |
| `outbound_order_items` | `fk_outbound_order_items_sku_id` | `sku_id` | `skus.id` | 必填 | RESTRICT |
| `sales_returns` | `fk_sales_returns_outbound_order_id` | `outbound_order_id` | `outbound_orders.id` | 必填 | RESTRICT |
| `sales_returns` | `fk_sales_returns_store_id` | `store_id` | `stores.id` | 必填 | RESTRICT |
| `sales_returns` | `fk_sales_returns_return_warehouse_id` | `return_warehouse_id` | `warehouses.id` | 必填 | RESTRICT |
| `sales_return_items` | `fk_sales_return_items_sales_return_id` | `sales_return_id` | `sales_returns.id` | 必填 | CASCADE |
| `sales_return_items` | `fk_sales_return_items_outbound_order_item_id` | `outbound_order_item_id` | `outbound_order_items.id` | 必填 | RESTRICT |
| `sales_return_items` | `fk_sales_return_items_sku_id` | `sku_id` | `skus.id` | 必填 | RESTRICT |
| `damage_reports` | `fk_damage_reports_warehouse_id` | `warehouse_id` | `warehouses.id` | 必填 | RESTRICT |
| `damage_report_items` | `fk_damage_report_items_damage_report_id` | `damage_report_id` | `damage_reports.id` | 必填 | CASCADE |
| `damage_report_items` | `fk_damage_report_items_sku_id` | `sku_id` | `skus.id` | 必填 | RESTRICT |

验收单必须且只能关联采购单或生产单之一，来源类型与来源 ID 必须一致；互斥条件留待 Task 3.5.5。`inspection_order_items.source_item_id`、入库主单来源字段、入库明细来源字段及报损来源字段按第 12 章受控多态规则处理，不建立错误的单表外键。

## 10. 跨境与库存类外键（12 张）

| 表 | 外键名称 | 字段 | 引用目标 | 业务必填性 | 删除策略 |
| --- | --- | --- | --- | --- | --- |
| `cross_border_shipments` | `fk_cross_border_shipments_production_order_id` | `production_order_id` | `production_orders.id` | 可选 | RESTRICT |
| `cross_border_shipments` | `fk_cross_border_shipments_source_warehouse_id` | `source_warehouse_id` | `warehouses.id` | 必填 | RESTRICT |
| `cross_border_shipments` | `fk_cross_border_shipments_transit_warehouse_id` | `transit_warehouse_id` | `warehouses.id` | 必填 | RESTRICT |
| `cross_border_shipments` | `fk_cross_border_shipments_destination_warehouse_id` | `destination_warehouse_id` | `warehouses.id` | 必填 | RESTRICT |
| `cross_border_shipment_items` | `fk_cross_border_shipment_items_cross_border_shipment_id` | `cross_border_shipment_id` | `cross_border_shipments.id` | 必填 | CASCADE |
| `cross_border_shipment_items` | `fk_cross_border_shipment_items_production_order_item_id` | `production_order_item_id` | `production_order_items.id` | 可选 | RESTRICT |
| `cross_border_shipment_items` | `fk_cross_border_shipment_items_sku_id` | `sku_id` | `skus.id` | 必填 | RESTRICT |
| `shipment_import_matches` | `fk_shipment_import_matches_cross_border_shipment_id` | `cross_border_shipment_id` | `cross_border_shipments.id` | 必填 | RESTRICT |
| `shipment_import_matches` | `fk_shipment_import_matches_cross_border_shipment_item_id` | `cross_border_shipment_item_id` | `cross_border_shipment_items.id` | 必填 | RESTRICT |
| `shipment_import_matches` | `fk_shipment_import_matches_import_task_id` | `import_task_id` | `import_tasks.id` | 必填 | RESTRICT |
| `shipment_import_matches` | `fk_shipment_import_matches_import_task_item_id` | `import_task_item_id` | `import_task_items.id` | 必填 | RESTRICT |
| `shipment_import_matches` | `fk_shipment_import_matches_matched_by` | `matched_by` | `users.id` | 匹配后必填 | RESTRICT |
| `inventories` | `fk_inventories_sku_id` | `sku_id` | `skus.id` | 必填 | RESTRICT |
| `inventories` | `fk_inventories_warehouse_id` | `warehouse_id` | `warehouses.id` | 必填 | RESTRICT |
| `inventory_transactions` | `fk_inventory_transactions_sku_id` | `sku_id` | `skus.id` | 必填 | RESTRICT |
| `inventory_transactions` | `fk_inventory_transactions_warehouse_id` | `warehouse_id` | `warehouses.id` | 必填 | RESTRICT |
| `inventory_transactions` | `fk_inventory_transactions_related_transaction_id` | `related_transaction_id` | `inventory_transactions.id` | 可选 | RESTRICT |
| `inventory_transactions` | `fk_inventory_transactions_operator_id` | `operator_id` | `users.id` | 必填 | RESTRICT |
| `transfer_orders` | `fk_transfer_orders_source_warehouse_id` | `source_warehouse_id` | `warehouses.id` | 必填 | RESTRICT |
| `transfer_orders` | `fk_transfer_orders_transit_warehouse_id` | `transit_warehouse_id` | `warehouses.id` | 必填 | RESTRICT |
| `transfer_orders` | `fk_transfer_orders_destination_warehouse_id` | `destination_warehouse_id` | `warehouses.id` | 必填 | RESTRICT |
| `transfer_order_items` | `fk_transfer_order_items_transfer_order_id` | `transfer_order_id` | `transfer_orders.id` | 必填 | CASCADE |
| `transfer_order_items` | `fk_transfer_order_items_sku_id` | `sku_id` | `skus.id` | 必填 | RESTRICT |
| `stock_counts` | `fk_stock_counts_warehouse_id` | `warehouse_id` | `warehouses.id` | 必填 | RESTRICT |
| `stock_count_items` | `fk_stock_count_items_stock_count_id` | `stock_count_id` | `stock_counts.id` | 必填 | CASCADE |
| `stock_count_items` | `fk_stock_count_items_sku_id` | `sku_id` | `skus.id` | 必填 | RESTRICT |
| `inventory_adjustments` | `fk_inventory_adjustments_warehouse_id` | `warehouse_id` | `warehouses.id` | 必填 | RESTRICT |
| `inventory_adjustments` | `fk_inventory_adjustments_stock_count_id` | `stock_count_id` | `stock_counts.id` | 盘点调整时必填 | RESTRICT |
| `inventory_adjustment_items` | `fk_inventory_adjustment_items_inventory_adjustment_id` | `inventory_adjustment_id` | `inventory_adjustments.id` | 必填 | CASCADE |
| `inventory_adjustment_items` | `fk_inventory_adjustment_items_stock_count_item_id` | `stock_count_item_id` | `stock_count_items.id` | 盘点调整时必填 | RESTRICT |
| `inventory_adjustment_items` | `fk_inventory_adjustment_items_sku_id` | `sku_id` | `skus.id` | 必填 | RESTRICT |
| `inventory_alerts` | `fk_inventory_alerts_sku_id` | `sku_id` | `skus.id` | 必填 | RESTRICT |
| `inventory_alerts` | `fk_inventory_alerts_warehouse_id` | `warehouse_id` | `warehouses.id` | 按仓库范围预警时必填 | RESTRICT |
| `inventory_alerts` | `fk_inventory_alerts_viewed_by` | `viewed_by` | `users.id` | 查看后必填 | RESTRICT |
| `inventory_alerts` | `fk_inventory_alerts_handled_by` | `handled_by` | `users.id` | 处理后必填 | RESTRICT |
| `inventory_alerts` | `fk_inventory_alerts_closed_by` | `closed_by` | `users.id` | 关闭后必填 | RESTRICT |

跨境发货和调拨的来源仓、在途仓、目的仓均必须保留独立角色；仓库类型及仓库角色互斥规则留待 Check 约束或服务层校验。发货匹配必须验证主从归属、导入任务归属及 SKU、仓库和数量一致性。

库存流水的 `source_document_type`、`source_document_id`、`source_document_item_id` 为受控多态来源，不建立指向任意单据表的普通外键；服务层必须验证来源类型、主单、明细、归属、SKU、仓库、数量和业务状态。

## 11. 系统与治理类外键（16 张）

| 表 | 外键名称 | 字段 | 引用目标 | 业务必填性 | 删除策略 |
| --- | --- | --- | --- | --- | --- |
| `import_tasks` | `fk_import_tasks_warehouse_id` | `warehouse_id` | `warehouses.id` | 仓库类导入时必填 | RESTRICT |
| `import_tasks` | `fk_import_tasks_store_id` | `store_id` | `stores.id` | 店铺类导入时必填 | RESTRICT |
| `import_task_items` | `fk_import_task_items_import_task_id` | `import_task_id` | `import_tasks.id` | 必填 | CASCADE |
| `import_task_items` | `fk_import_task_items_matched_sku_id` | `matched_sku_id` | `skus.id` | 匹配成功时必填 | RESTRICT |
| `import_task_items` | `fk_import_task_items_matched_warehouse_id` | `matched_warehouse_id` | `warehouses.id` | 适用时必填 | RESTRICT |
| `users` | — | — | 除公共用户自引用外无专项外键 | — | — |
| `roles` | — | — | 除公共用户字段外无专项外键 | — | — |
| `permissions` | — | — | 除公共用户字段外无专项外键 | — | — |
| `user_roles` | `fk_user_roles_user_id` | `user_id` | `users.id` | 必填 | CASCADE |
| `user_roles` | `fk_user_roles_role_id` | `role_id` | `roles.id` | 必填 | CASCADE |
| `user_roles` | `fk_user_roles_assigned_by` | `assigned_by` | `users.id` | 必填 | RESTRICT |
| `role_permissions` | `fk_role_permissions_role_id` | `role_id` | `roles.id` | 必填 | CASCADE |
| `role_permissions` | `fk_role_permissions_permission_id` | `permission_id` | `permissions.id` | 必填 | CASCADE |
| `role_permissions` | `fk_role_permissions_granted_by` | `granted_by` | `users.id` | 必填 | RESTRICT |
| `role_warehouses` | `fk_role_warehouses_role_id` | `role_id` | `roles.id` | 必填 | CASCADE |
| `role_warehouses` | `fk_role_warehouses_warehouse_id` | `warehouse_id` | `warehouses.id` | 必填 | RESTRICT |
| `role_warehouses` | `fk_role_warehouses_assigned_by` | `assigned_by` | `users.id` | 必填 | RESTRICT |
| `role_stores` | `fk_role_stores_role_id` | `role_id` | `roles.id` | 必填 | CASCADE |
| `role_stores` | `fk_role_stores_store_id` | `store_id` | `stores.id` | 必填 | RESTRICT |
| `role_stores` | `fk_role_stores_assigned_by` | `assigned_by` | `users.id` | 必填 | RESTRICT |
| `system_settings` | — | — | 除公共用户字段外无专项外键 | — | — |
| `backup_tasks` | `fk_backup_tasks_triggered_by` | `triggered_by` | `users.id` | 必填；自动任务使用系统用户 | RESTRICT |
| `attachments` | `fk_attachments_uploaded_by` | `uploaded_by` | `users.id` | 必填 | RESTRICT |
| `attachment_links` | `fk_attachment_links_attachment_id` | `attachment_id` | `attachments.id` | 必填 | CASCADE |
| `attachment_links` | `fk_attachment_links_linked_by` | `linked_by` | `users.id` | 必填 | RESTRICT |
| `audit_logs` | `fk_audit_logs_user_id` | `user_id` | `users.id` | 用户事件必填，系统事件可空 | RESTRICT |
| `document_status_histories` | `fk_document_status_histories_changed_by` | `changed_by` | `users.id` | 必填 | RESTRICT |
| `approval_records` | `fk_approval_records_approver_id` | `approver_id` | `users.id` | 必填 | RESTRICT |
| `approval_records` | `fk_approval_records_previous_approval_record_id` | `previous_approval_record_id` | `approval_records.id` | 重新审核时必填 | RESTRICT |

权限关联记录可以按授权变化删除或重建，但必须保留审计记录。用户和角色本体仍以停用为主；第一阶段原则上禁止物理删除用户。`attachment_links` 随附件本体结构性级联，但其业务对象字段采用受控多态引用。

## 12. 受控多态引用规范

下列六类字段组合不建立传统单表物理外键：

| 组合 | 涉及表 | 规则 |
| --- | --- | --- |
| `source_type + source_item_id` | `inspection_orders` 与 `inspection_order_items` | 来源明细目标由验收主单来源类型确定 |
| `source_document_type + source_document_id` | `inbound_orders`、`damage_reports`、`inventory_transactions` | 目标主表由受控来源类型确定 |
| `source_document_type + source_document_item_id` | `inbound_order_items`、`damage_report_items`、`inventory_transactions` | 明细目标由本表或所属主单来源类型确定 |
| `result_document_type + result_document_id` | `import_task_items` | 结果单据目标由受控结果类型确定 |
| `object_type + object_id` | `attachment_links`、`audit_logs`、`document_status_histories`、`approval_records` | 目标业务对象由受控对象类型确定 |
| `object_type + object_item_id` | `attachment_links` | 目标业务明细由受控对象类型确定 |

统一对象类型注册或应用层映射必须验证：对象类型、合法目标表、目标记录、主从归属、业务状态、SKU、仓库、数量等关键事实及必要审计记录。第一阶段不新增通用对象主表。

## 13. 结构性 CASCADE 清单

以下 21 项外键关系采用删除时结构性 `CASCADE`：

- 13 张业务明细表对所属主表的外键：`purchase_order_items`、`purchase_return_items`、`production_order_items`、`production_completion_record_items`、`inspection_order_items`、`inbound_order_items`、`outbound_order_items`、`sales_return_items`、`damage_report_items`、`cross_border_shipment_items`、`transfer_order_items`、`stock_count_items`、`inventory_adjustment_items`；
- `import_task_items.import_task_id`；
- `attachment_links.attachment_id`；
- `user_roles.user_id`、`user_roles.role_id`；
- `role_permissions.role_id`、`role_permissions.permission_id`；
- `role_warehouses.role_id`；
- `role_stores.role_id`。

已提交、审核、作废或形成下游业务的正式单据不得物理删除。权限关联表可随授权主体结构调整，但授权变化必须留痕。

## 14. 禁止级联删除的核心历史表

以下表不得因上游记录删除自动消失，相关普通外键统一使用 `RESTRICT`：

- `inventories`、`inventory_transactions`；
- `purchase_payments`、`production_payments`；
- `production_progress_records`、`production_completion_records`；
- `inspection_orders`、`inbound_orders`、`outbound_orders`；
- `purchase_returns`、`sales_returns`；
- `cross_border_shipments`、`shipment_import_matches`；
- `stock_counts`、`inventory_adjustments`、`inventory_alerts`；
- `audit_logs`、`document_status_histories`、`approval_records`、`backup_tasks`。

基础资料停用、单据取消或作废均不得破坏上述历史事实。

## 15. 覆盖与数量检查

- 已检查正式表：60 张；
- 专项普通外键关系：122 项；
- 公共用户外键关系：161 项；
- 外键关系合计：283 项；
- 删除时 `CASCADE`：21 项；
- 删除时 `RESTRICT`：262 项；
- 更新时 `RESTRICT`：283 项；
- 受控多态引用组合：6 类；
- Task 3.4 缺失关系承载字段：0 个；
- 本任务新增字段：0 个；
- 本任务新增正式表：0 张。

## 16. 正式结论

1. 所有普通外键默认更新和删除均使用 `RESTRICT`。
2. 基础资料被引用后只能停用，不得物理删除。
3. 正式业务主表和历史表不得级联删除。
4. 完全依附主表的明细、导入明细、附件关系和纯权限关系可采用结构性 `CASCADE`。
5. 正式单据提交、审核或产生下游关系后，应用层禁止物理删除。
6. 用户停用后不得删除，历史操作关系必须保留。
7. 采购与生产保持平行，不建立相互外键。
8. 验收单只能关联采购单或生产单之一，验收明细来源采用已批准的受控 `source_item_id`。
9. 入库单根据入库类型通过已批准的受控来源字段关联对应来源。
10. 库存流水必须关联 SKU、仓库和操作用户，来源单据及来源明细采用受控多态引用。
11. 跨境发货和调拨必须分别关联来源仓、在途仓和目的仓。
12. 多对多关系通过正式关联表及外键表达。
13. 附件、审计、状态历史和审批对象采用受控多态引用。
14. 多态字段不得错误建立指向单一业务表的外键。
15. 本任务仅使用 Task 3.4 已批准字段，不新增字段或正式表。
16. 本任务不设计普通查询索引、Check 约束或完整枚举值。
17. 本任务不编写 SQL、ORM、Schema 或 Migration，不选择数据库，不进入技术开发。
18. Task 3.5.3 作为 Task 3.5.4 索引设计的正式输入。

## 17. 状态与边界

- Phase 3：In Progress；
- Task 3.5：In Progress；
- Task 3.5.1：Completed / Approved；
- Task 3.5.2：Completed / Approved；
- Task 3.5.3：Completed / Approved；
- Task 3.5.4：Not Started；
- 普通查询索引和 Check 约束：Not Started；
- SQL、ORM、Schema、Migration、数据库选型及技术开发：Not Started。

下一小任务为 Task 3.5.4 索引设计。Task 3.5.3 验收通过前不得启动 Task 3.5.4。
