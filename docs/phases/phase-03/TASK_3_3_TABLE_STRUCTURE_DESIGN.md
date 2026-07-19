---
document_name: Task 3.3 数据表结构设计
project: Violin ERP Lite
version: 1.0
status: Approved
owner: Project Manager
created_date: 2026-07-19
updated_date: 2026-07-19
related_phase: Phase 3
---

# Task 3.3：数据表结构设计（Table Structure Design）

## 1. 任务信息

| 项目 | 内容 |
| --- | --- |
| 所属阶段 | Phase 3：数据库设计（Database Design） |
| 当前任务 | Task 3.3：数据表结构设计 |
| 前置任务 | Task 3.2：实体关系详细设计（Completed / Approved） |
| 文档状态 | Approved |
| 任务状态 | Completed / Approved |
| 后续任务 | Task 3.4：字段结构设计（Completed / Approved） |
| 当前下一任务 | Task 3.5：字段类型、约束与索引设计（Not Started） |

## 2. 任务范围

本任务负责：

- 确定需要建立的逻辑数据表；
- 确定表的英文名称和中文用途；
- 区分主数据表、业务主表、明细表、关联表、库存表、任务表和日志表；
- 明确各表逻辑从属关系；
- 明确不得建立的重复表；
- 形成后续字段结构设计的正式表清单。

本任务不负责：

- 字段清单、字段名称或字段类型；
- 主键和外键字段；
- 索引或唯一约束的物理实现；
- SQL；
- 对象关系映射（Object-Relational Mapping，ORM）；
- 数据库技术选型；
- 数据库模式（Database Schema）；
- 物理实体关系模型（Physical ER Model）；
- 页面、API 或业务代码。

## 3. 逻辑表命名规则

1. 正式表名统一使用英文小写复数形式和下划线命名。
2. 单据主表使用业务对象复数名称。
3. 单据明细表统一使用 `_items` 后缀。
4. 多对多关联表使用两个业务对象名称组合。
5. 流水、任务、状态历史和审计日志独立建表。
6. 不按公司仓、厂家仓、海外仓拆分平行仓库表。
7. 不按可用、厂家、海外、待处理、在途拆分平行库存余额表。
8. 本任务确定逻辑表名称，不代表已经完成物理数据库实现。

## 4. 基础资料类表（11 张）

| 序号 | 表名 | 中文名称 | 表类别 | 用途 |
| --- | --- | --- | --- | --- |
| 1 | `product_categories` | 产品分类表 | 主数据表 | 管理产品分类 |
| 2 | `brands` | 品牌表 | 主数据表 | 管理产品品牌 |
| 3 | `products` | 产品表 | 主数据表 | 管理统一产品主档 |
| 4 | `skus` | SKU 表 | 主数据表 | 管理最小库存核算单位 |
| 5 | `suppliers` | 供应商表 | 主数据表 | 管理采购合作方 |
| 6 | `manufacturers` | 生产厂家表 | 主数据表 | 管理委外生产合作方 |
| 7 | `warehouses` | 仓库表 | 主数据表 | 统一管理全部库存节点 |
| 8 | `ecommerce_platforms` | 电商平台表 | 主数据表 | 管理电商平台 |
| 9 | `stores` | 店铺表 | 主数据表 | 管理平台下具体店铺 |
| 10 | `product_suppliers` | 产品供应商关系表 | 关联表 | 表达产品与供应商多对多关系 |
| 11 | `product_manufacturers` | 产品生产厂家关系表 | 关联表 | 表达产品与生产厂家多对多关系 |

逻辑从属关系：

- `products` 逻辑归属于 `product_categories` 和 `brands`；
- `skus` 逻辑归属于 `products`；
- `stores` 逻辑归属于 `ecommerce_platforms`；
- `product_suppliers` 关联 `products` 与 `suppliers`；
- `product_manufacturers` 关联 `products` 与 `manufacturers`；
- 厂家仓等库存节点统一由 `warehouses` 表达。

不得建立以下平行仓库表：

- `company_warehouses`；
- `manufacturer_warehouses`；
- `overseas_warehouses`；
- `transit_warehouses`；
- `pending_warehouses`。

## 5. 采购与生产类表（11 张）

### 5.1 采购业务

| 序号 | 表名 | 中文名称 | 表类别 | 用途 |
| --- | --- | --- | --- | --- |
| 12 | `purchase_orders` | 采购单主表 | 业务主表 | 保存采购单据级业务事实 |
| 13 | `purchase_order_items` | 采购单明细表 | 明细表 | 保存采购 SKU 行级业务事实 |
| 14 | `purchase_payments` | 采购付款表 | 业务记录表 | 保存每次采购付款事实 |
| 15 | `purchase_returns` | 采购退货单主表 | 业务主表 | 保存采购退货单据级业务事实 |
| 16 | `purchase_return_items` | 采购退货单明细表 | 明细表 | 保存采购退货 SKU 行级业务事实 |

逻辑从属关系：

- `purchase_order_items` 从属于 `purchase_orders`；
- `purchase_payments` 逻辑关联采购单和供应商；
- `purchase_return_items` 从属于 `purchase_returns`；
- `purchase_returns` 必须追溯原采购单和原入库业务。

### 5.2 委外生产业务

| 序号 | 表名 | 中文名称 | 表类别 | 用途 |
| --- | --- | --- | --- | --- |
| 17 | `production_orders` | 委外生产单主表 | 业务主表 | 保存委外生产单据级业务事实 |
| 18 | `production_order_items` | 委外生产单明细表 | 明细表 | 保存生产 SKU 行级业务事实 |
| 19 | `production_payments` | 生产付款表 | 业务记录表 | 保存每次生产付款事实 |
| 20 | `production_progress_records` | 生产进度记录表 | 历史记录表 | 独立保存生产进度变化历史 |
| 21 | `production_completion_records` | 生产完工记录表 | 历史记录表 | 独立保存分批完工历史 |
| 22 | `production_completion_record_items` | 生产完工记录明细表 | 明细表 | 保存分批完工中的 SKU 行级数量并追溯原生产单明细 |

逻辑从属关系：

- `production_order_items` 从属于 `production_orders`；
- `production_payments`、`production_progress_records` 和 `production_completion_records` 逻辑关联 `production_orders`；
- `production_completion_record_items` 从属于 `production_completion_records`，并关联原 `production_order_items`；
- 生产进度和分批完工独立留痕，不以生产单当前状态覆盖历史。

采购单与生产单完全平行，不建立统一订单主表，也不建立采购单与生产单父子关系。

## 6. 验收与出入库类表（10 张）

| 序号 | 表名 | 中文名称 | 表类别 | 用途 |
| --- | --- | --- | --- | --- |
| 23 | `inspection_orders` | 质量验收单主表 | 业务主表 | 统一保存采购或生产验收单据级事实 |
| 24 | `inspection_order_items` | 质量验收单明细表 | 明细表 | 保存验收 SKU 行级结果 |
| 25 | `inbound_orders` | 入库单主表 | 业务主表 | 统一保存批准的库存增加单据 |
| 26 | `inbound_order_items` | 入库单明细表 | 明细表 | 保存入库 SKU 行级事实 |
| 27 | `outbound_orders` | 出库单主表 | 业务主表 | 统一保存普通库存减少单据 |
| 28 | `outbound_order_items` | 出库单明细表 | 明细表 | 保存出库 SKU 行级事实 |
| 29 | `sales_returns` | 销售退货单主表 | 业务主表 | 保存销售退货单据级业务事实 |
| 30 | `sales_return_items` | 销售退货单明细表 | 明细表 | 保存销售退货 SKU 行级事实 |
| 31 | `damage_reports` | 报损单主表 | 业务主表 | 保存报损单据级业务事实 |
| 32 | `damage_report_items` | 报损单明细表 | 明细表 | 保存报损 SKU 行级事实 |

统一规则：

- 采购验收与生产验收共用 `inspection_orders` 和 `inspection_order_items`；
- 不建立 `purchase_inspections` 或 `production_inspections`；
- `inbound_orders` 统一承载采购入库、生产入库、销售退货可售品入库及其他批准库存增加；
- `outbound_orders` 统一承载国内销售、样品、领用及其他普通出库；
- 采购退货、跨境发货、调拨和报损保持独立业务单据；
- 本期不建立完整销售订单表；
- 所有明细表均从属于对应主表，不得脱离主表独立存在。

## 7. 跨境与库存类表（12 张）

| 序号 | 表名 | 中文名称 | 表类别 | 用途 |
| --- | --- | --- | --- | --- |
| 33 | `cross_border_shipments` | 跨境发货单主表 | 业务主表 | 保存跨境发货单据级业务事实 |
| 34 | `cross_border_shipment_items` | 跨境发货单明细表 | 明细表 | 保存跨境发货 SKU 行级事实 |
| 35 | `shipment_import_matches` | 发货导入匹配表 | 关联表 | 表达跨境发货与导入任务的多对多匹配 |
| 36 | `inventories` | 当前库存表 | 库存表 | 保存每个 SKU 在每个库存节点的当前余额 |
| 37 | `inventory_transactions` | 库存流水表 | 流水表 | 保存每次库存变化历史及来源追溯 |
| 38 | `transfer_orders` | 调拨单主表 | 业务主表 | 保存调拨单据级业务事实 |
| 39 | `transfer_order_items` | 调拨单明细表 | 明细表 | 保存调拨 SKU 行级事实 |
| 40 | `stock_counts` | 盘点单主表 | 业务主表 | 保存盘点单据级业务事实 |
| 41 | `stock_count_items` | 盘点明细表 | 明细表 | 保存 SKU 实盘与差异行级事实 |
| 42 | `inventory_adjustments` | 库存调整单主表 | 业务主表 | 保存库存调整单据级业务事实 |
| 43 | `inventory_adjustment_items` | 库存调整单明细表 | 明细表 | 保存库存调整 SKU 行级事实 |
| 44 | `inventory_alerts` | 库存预警表 | 业务记录表 | 保存库存预警生成、处理和关闭历史 |

### 7.1 跨境匹配

`shipment_import_matches` 用于表达：

- `CrossBorderShipment` 与 `ImportTask` 的多对多关系；
- 发货批次与海外导入批次的匹配；
- 后续承载匹配数量、实收数量、差异数量和匹配状态。

本任务只确定匹配表及用途，不定义具体字段。

### 7.2 当前库存与库存流水

- `inventories` 只保存当前库存余额；
- `inventory_transactions` 保存每次库存变化历史；
- 同一 SKU 和仓库节点只有一条当前库存记录；
- 库存流水必须追溯业务单据和具体明细；
- 库存流水只追加，不修改、不删除；
- 调拨、盘点和调整的明细表分别从属于对应主表。

不得建立以下平行库存余额表：

- `available_inventories`；
- `manufacturer_inventories`；
- `overseas_inventories`；
- `pending_inventories`；
- `in_transit_inventories`。

## 8. 系统与治理类表（16 张）

| 序号 | 表名 | 中文名称 | 表类别 | 用途 |
| --- | --- | --- | --- | --- |
| 45 | `import_tasks` | 导入任务主表 | 任务表 | 统一保存各类批准导入任务 |
| 46 | `import_task_items` | 导入任务明细表 | 明细表 | 保存逐行校验、匹配和执行结果 |
| 47 | `users` | 用户表 | 系统主数据表 | 管理内部用户 |
| 48 | `roles` | 角色表 | 系统主数据表 | 管理角色 |
| 49 | `permissions` | 权限表 | 系统主数据表 | 管理功能及操作权限 |
| 50 | `user_roles` | 用户角色关联表 | 关联表 | 表达用户与角色多对多关系 |
| 51 | `role_permissions` | 角色权限关联表 | 关联表 | 表达角色与权限多对多关系 |
| 52 | `role_warehouses` | 角色仓库权限范围表 | 关联表 | 表达角色可访问仓库及访问级别 |
| 53 | `role_stores` | 角色店铺权限范围表 | 关联表 | 表达角色可访问店铺及访问级别 |
| 54 | `system_settings` | 系统参数表 | 配置表 | 管理系统通用配置 |
| 55 | `backup_tasks` | 数据备份任务表 | 任务表 | 保存备份执行及清理历史 |
| 56 | `attachments` | 附件表 | 资源表 | 统一管理附件基础记录 |
| 57 | `attachment_links` | 附件关联表 | 关联表 | 统一表达附件与受控业务对象关系 |
| 58 | `audit_logs` | 统一审计日志表 | 日志表 | 保存关键操作和系统重要事件 |
| 59 | `document_status_histories` | 单据状态历史表 | 历史记录表 | 保存单据状态变化历史 |
| 60 | `approval_records` | 审批记录表 | 历史记录表 | 保存审核、反审核和审批结果 |

### 8.1 导入任务

- 所有批准的 Excel 导入统一使用 `import_tasks`；
- 逐行校验、匹配和执行结果使用 `import_task_items`；
- `import_task_items` 从属于 `import_tasks`；
- 海外库存导入不建立独立 `overseas_inventory_imports` 表。

### 8.2 权限

- `User` 与 `Role` 通过 `user_roles` 表达多对多关系；
- `Role` 与 `Permission` 通过 `role_permissions` 表达多对多关系；
- `Role` 与 `Warehouse` 通过 `role_warehouses` 表达仓库数据范围；
- `Role` 与 `Store` 通过 `role_stores` 表达店铺数据范围；
- 暂不建立用户直接权限表。

### 8.3 附件

附件统一使用 `attachments` 和 `attachment_links`，不得为付款、验收或不同业务单据分别建立重复附件表。

### 8.4 审计、状态与审批

- 统一使用 `audit_logs`，不建立 `operation_logs`；
- 单据当前状态保存在业务主表；
- 状态变化历史保存于 `document_status_histories`；
- 审核、反审核和审批结果保存于 `approval_records`；
- `audit_logs` 只追加，不修改、不删除。

## 9. 正式逻辑表总清单

### 9.1 基础资料类（11 张）

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

### 9.2 采购与生产类（11 张）

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

### 9.3 验收与出入库类（10 张）

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

### 9.4 跨境与库存类（12 张）

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

### 9.5 系统与治理类（16 张）

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

正式逻辑表总数：60 张。

分类数量校验：11 + 11 + 10 + 12 + 16 = 60。

## 10. 候选表

以下表暂列候选，不进入 60 张正式逻辑表清单：

| 候选表 | 暂不纳入原因 |
| --- | --- |
| `safety_stock_rules` | 安全库存需要确认是 SKU 级配置还是 SKU 与 Warehouse 组合级配置 |

Task 3.4 字段结构检查已将 `role_warehouses` 和 `role_stores` 转为正式表；`safety_stock_rules` 继续保留为候选表。

## 11. 重点设计判断

1. 生产进度和分批完工独立建表，避免覆盖历史。
2. 附件采用统一附件表及附件关联表。
3. 单据状态历史和审批记录独立建表。
4. 采购付款和生产付款暂不建立付款明细表，一条付款记录代表一次付款事实。
5. 采购退货与销售退货分别建表。
6. 跨境发货不复用普通出库单主表，但必须生成统一库存流水。
7. 调拨、盘点、调整和报损分别建表。
8. 安全库存规则表暂不建立。
9. 角色仓库和店铺数据范围分别使用 `role_warehouses` 与 `role_stores`。
10. 本期不建立销售订单表。
11. 报表不建立业务事实表。
12. 业务操作日志展示不建立第二套日志表。

## 12. Task 3.3 正式结论

1. 数据库逻辑结构划分为基础资料、采购与生产、验收与出入库、跨境与库存、系统与治理五类。
2. Task 3.4 结构检查后，正式逻辑表数量由 57 张修正为 60 张。
3. 所有多 SKU 业务单据采用主表和明细表结构。
4. 仓库和库存采用统一表，不建立平行表。
5. 采购与生产分别建立独立业务表。
6. 采购验收和生产验收共用验收表。
7. 当前库存与库存流水分别建表。
8. 跨境发货与海外导入通过匹配表表达多对多关系。
9. 生产进度与分批完工独立留痕。
10. 用户、角色和权限使用两个授权关联表，角色数据范围另使用仓库与店铺两个关联表。
11. 附件采用统一附件体系。
12. 状态历史和审批记录独立保存。
13. 报表和业务操作日志展示不建立独立事实表。
14. `safety_stock_rules` 继续作为候选表，不进入正式表清单。
15. 本任务不定义字段、字段类型、主键、外键、索引、SQL、ORM 或数据库技术。
16. Task 3.3 作为 Task 3.4 字段结构设计的正式输入。

## 13. 状态与后续任务边界

- Phase 3：In Progress；
- Task 3.1：Completed / Approved；
- Task 3.2：Completed / Approved；
- Task 3.3：Completed / Approved；
- Task 3.4：Completed / Approved；
- Task 3.5：Not Started；
- 字段名称设计：Completed / Approved；
- 字段类型、长度、主外键物理约束、索引、SQL、ORM 和数据库技术选型：Not Started；
- 技术开发：Not Started。

Task 3.3 保持 Completed / Approved，正式逻辑表数量经 Task 3.4 结构检查由 57 张修正为 60 张。Task 3.4 验收通过前不得启动 Task 3.5；字段类型、长度、主外键物理约束、索引、SQL、ORM、数据库技术选型、数据库 Schema、物理 ER 模型、页面、API 和业务代码均未开始。
