---
document_name: Task 5.4 出入库与跨境业务 API
version: 1.1
status: Completed / Approved
project: Violin ERP Lite
owner: Project Manager
related_phase: Phase 5
---

# Task 5.4：出入库与跨境业务 API 设计

## 1. 文档目的与范围

本文档定义入库、出库、采购退货实际出库、仓库调拨、跨境发货、海外仓当前库存及海外导入结果查询的 API 契约。PC 管理端与微信小程序共用 `/api/v1`、统一请求响应、认证、权限、仓库/店铺范围、状态动作、幂等、并发、错误码、日志与脱敏规则。

覆盖：

- 采购、生产及现有 Frozen 来源可承载的其他批准入库；
- 国内销售、样品、领用及其他普通出库；
- 采购退货单的实际退货出库；
- 来源仓、在途仓、目的仓两阶段调拨；
- 来源仓到在途仓的跨境发运及分批发货；
- 海外仓当前库存、导入任务、导入明细及发货匹配结果只读查询；
- 入库、出库、调拨、跨境发运与库存余额、流水的原子事务衔接。
- API Change Request 001 候选补充的库存盘点、销售退货和报损接口；该补充为 Completed / Pending Approval，批准前不改变 v1.0 Frozen 基线。

本文件不创建真实 API Route，不编写 Controller、Service、Repository 或业务代码，不修改 Frozen 数据库或 Approved 页面。Excel 上传、校验和正式执行留待 Task 5.5。

## 2. 设计依据与对象映射

| 模块 | 业务/状态来源 | Frozen 表与关键字段 | Approved 页面 | 权限与范围 |
| --- | --- | --- | --- | --- |
| 入库 | BR-003、BR-004、BR-007 至 BR-009、BR-016；Task 2.5 第 7、8 节 | `inbound_orders`、`inbound_order_items`、验收、采购/生产来源、仓库、数量、状态、版本 | Task 4.9 第 4 节 | 入库功能、目标仓、来源记录、成本权限 |
| 普通出库 | BR-016、BR-023、BR-024、BR-035；Task 2.5 第 8 节 | `outbound_orders`、`outbound_order_items`、平台、店铺、客户快照、仓库、数量 | Task 4.9 第 5 节 | 出库仓、店铺、个人信息、成本权限 |
| 采购退货出库 | BR-003、BR-004、BR-006、BR-009 | `purchase_returns`、`purchase_return_items`、原采购/入库、退货仓、累计退货 | Task 4.6 第 8 节；Task 4.9 正式对象边界 | 退货、来源记录及退货仓权限 |
| 调拨 | BR-014、BR-016、BR-018；Task 2.5 第 12 节 | `transfer_orders`、`transfer_order_items`、来源/在途/目的仓、调出/调入/差异量 | Task 4.9 第 6 节 | 三个仓库范围、调出/调入权限 |
| 跨境发货 | BR-007、BR-013、BR-018、BR-027 至 BR-030；Task 2.5 第 10 节 | `cross_border_shipments`、`cross_border_shipment_items`、可选生产来源、三仓链路、发货/实收/差异量 | Task 4.10 第 4 至 8 节 | 三仓范围、生产记录、成本权限 |
| 海外仓与导入结果 | BR-013、BR-014；Task 2.5 第 11 节 | `warehouses`、`inventories`、`inventory_transactions`、`import_tasks`、`import_task_items`、`shipment_import_matches` | Task 4.10 第 9、10、12 节 | 海外仓、店铺、原始数据、导出权限 |
| 库存盘点 | BR-003 至 BR-005、BR-009、BR-010；Task 2.5 第 13 节 | `stock_counts`、`stock_count_items`、适用库存调整、状态历史与审批 | Task 4.9 第 7 节 | 仓库、盘点执行/复盘/审核/导出权限 |
| 销售退货 | BR-003、BR-004、BR-006、BR-009；Task 2.5 第 9 节 | `sales_returns`、`sales_return_items`、原销售出库、库存与流水 | Task 4.9 第 9 节 | 店铺、原出库、接收仓、处理/导出权限 |
| 报损 | BR-003 至 BR-006、BR-009、BR-010、BR-016；Task 2.5 第 14.2 节 | `damage_reports`、`damage_report_items`、库存与流水 | Task 4.9 第 10 节 | 仓库、成本、审核/确认/导出权限 |

字段使用 lowerCamelCase 映射 Frozen snake_case。生产订单没有统一目标仓字段；跨境发货只有可选生产单/生产明细关系，没有完工记录关系；普通出库不建立销售订单；采购退货实际出库直接执行既有采购退货对象，不重复创建 `outbound_orders`。

## 3. API 模块目录与数量

### 3.1 入库接口（18 个）

| 编号 | 名称 | 方法与路径 | 使用端 | 权限/范围 | 状态、幂等与并发 | 日志、页面与备注 |
| --- | --- | --- | --- | --- | --- | --- |
| `INB-001` | 入库单列表 | `GET /api/v1/inbound-orders` | PC、小程序 | 查看、目标仓/来源范围 | 只读 | 异常查询；Task 4.9 入库列表 |
| `INB-002` | 入库单详情 | `GET /api/v1/inbound-orders/{id}` | PC、小程序 | 查看、仓库/成本权限 | 只读 | 敏感成本查看；入库详情 |
| `INB-003` | 创建采购入库单 | `POST /api/v1/inbound-orders/purchase` | PC | 创建、目标仓、采购来源 | 创建草稿；幂等键 | 必记；采购入库新增 |
| `INB-004` | 创建生产入库单 | `POST /api/v1/inbound-orders/production` | PC | 创建、目标仓、生产来源 | 创建草稿；幂等键 | 必记；生产入库新增 |
| `INB-005` | 创建其他批准入库单 | `POST /api/v1/inbound-orders/other` | PC | 创建、目标仓 | 仅受控来源类型；幂等键 | 必记；不允许无来源入库 |
| `INB-006` | 修改入库单 | `PATCH /api/v1/inbound-orders/{id}` | PC | 编辑、目标仓 | 草稿/已驳回；`versionNo` | 必记 |
| `INB-007` | 提交入库单 | `POST /api/v1/inbound-orders/{id}/submit` | PC | 提交 | 草稿/已驳回→待审核；幂等、版本 | 状态历史/审计 |
| `INB-008` | 撤回入库单 | `POST /api/v1/inbound-orders/{id}/withdraw` | PC | 提交人/撤回 | 待审核→草稿；幂等、版本 | 必记 |
| `INB-009` | 审核入库单 | `POST /api/v1/inbound-orders/{id}/approve` | PC | 审核、职责分离 | 待审核→已审核；幂等、版本 | 审批/历史/审计 |
| `INB-010` | 驳回入库单 | `POST /api/v1/inbound-orders/{id}/reject` | PC | 审核 | 待审核→已驳回；幂等、版本 | 审批意见必记 |
| `INB-011` | 反审核入库单 | `POST /api/v1/inbound-orders/{id}/unapprove` | PC | 反审核 | 已审核且无流水→草稿；幂等、版本 | 原因必记 |
| `INB-012` | 取消入库单 | `POST /api/v1/inbound-orders/{id}/cancel` | PC | 取消 | 草稿且无下游→已取消；幂等、版本 | 原因必记 |
| `INB-013` | 确认入库 | `POST /api/v1/inbound-orders/{id}/confirm` | PC | 入库完成、目标仓操作 | 已审核/部分入库；幂等、版本、库存事务 | 高风险必记 |
| `INB-014` | 冲销入库 | `POST /api/v1/inbound-orders/{id}/reverse` | PC | 冲销、高风险权限 | 已完成且下游允许→已冲销；幂等、版本、反向事务 | 原因/关联流水必记 |
| `INB-015` | 入库状态历史 | `GET /api/v1/inbound-orders/{id}/status-history` | PC、小程序 | 查看 | 只读 | 状态 Tab |
| `INB-016` | 入库库存流水 | `GET /api/v1/inbound-orders/{id}/inventory-transactions` | PC、小程序 | 查看、仓库/成本权限 | 只读 | 流水 Tab |
| `INB-017` | 导出入库单 | `POST /api/v1/inbound-orders/export` | PC | 导出、仓库/成本权限 | 幂等键 | 必记导出范围 |
| `INB-018` | 入库进度 | `GET /api/v1/inbound-orders/{id}/progress` | PC、小程序 | 查看 | 由明细与流水派生 | 不写新字段 |

### 3.2 出库接口（17 个）

| 编号 | 名称 | 方法与路径 | 使用端 | 权限/范围 | 状态、幂等与并发 | 日志、页面与备注 |
| --- | --- | --- | --- | --- | --- | --- |
| `OUT-001` | 出库单列表 | `GET /api/v1/outbound-orders` | PC、小程序 | 查看、仓库/店铺范围 | 只读 | Task 4.9 出库列表 |
| `OUT-002` | 出库单详情 | `GET /api/v1/outbound-orders/{id}` | PC、小程序 | 查看、个人信息/成本权限 | 只读 | 敏感查看必记 |
| `OUT-003` | 创建国内销售出库 | `POST /api/v1/outbound-orders/domestic-sales` | PC | 创建、出库仓、店铺 | 创建草稿；幂等键 | 必记；不创建销售订单 |
| `OUT-004` | 创建普通其他出库 | `POST /api/v1/outbound-orders/other` | PC | 创建、出库仓 | 仅样品/领用/其他批准类型；幂等键 | 不替代调拨、退货、跨境、报损 |
| `OUT-005` | 修改出库单 | `PATCH /api/v1/outbound-orders/{id}` | PC | 编辑、仓库/店铺 | 草稿/已驳回；`versionNo` | 必记 |
| `OUT-006` | 提交出库单 | `POST /api/v1/outbound-orders/{id}/submit` | PC | 提交 | 草稿/已驳回→待审核；幂等、版本 | 状态历史/审计 |
| `OUT-007` | 撤回出库单 | `POST /api/v1/outbound-orders/{id}/withdraw` | PC | 提交人/撤回 | 待审核→草稿；幂等、版本 | 必记 |
| `OUT-008` | 审核出库单 | `POST /api/v1/outbound-orders/{id}/approve` | PC | 审核、职责分离 | 待审核→已审核；幂等、版本 | 审批/历史/审计 |
| `OUT-009` | 驳回出库单 | `POST /api/v1/outbound-orders/{id}/reject` | PC | 审核 | 待审核→已驳回；幂等、版本 | 必记 |
| `OUT-010` | 反审核出库单 | `POST /api/v1/outbound-orders/{id}/unapprove` | PC | 反审核 | 已审核且无流水→草稿；幂等、版本 | 原因必记 |
| `OUT-011` | 取消出库单 | `POST /api/v1/outbound-orders/{id}/cancel` | PC | 取消 | 草稿且无下游→已取消；幂等、版本 | 原因必记 |
| `OUT-012` | 确认出库 | `POST /api/v1/outbound-orders/{id}/confirm` | PC | 出库完成、仓库操作 | 已审核/部分出库；幂等、版本、库存条件更新 | 高风险必记 |
| `OUT-013` | 冲销出库 | `POST /api/v1/outbound-orders/{id}/reverse` | PC | 冲销、高风险权限 | 已完成且下游允许→已冲销；幂等、反向事务 | 原因/关联流水必记 |
| `OUT-014` | 出库状态历史 | `GET /api/v1/outbound-orders/{id}/status-history` | PC、小程序 | 查看 | 只读 | 状态 Tab |
| `OUT-015` | 出库库存流水 | `GET /api/v1/outbound-orders/{id}/inventory-transactions` | PC、小程序 | 查看、仓库/成本权限 | 只读 | 流水 Tab |
| `OUT-016` | 导出出库单 | `POST /api/v1/outbound-orders/export` | PC | 导出、店铺/个人信息/成本权限 | 幂等键 | 必记且脱敏 |
| `OUT-017` | 确认采购退货出库 | `POST /api/v1/purchase-returns/{id}/confirm-outbound` | PC | 采购退货出库、退货仓 | 已审核；幂等、版本、库存事务 | 更新退货完成事实；不建普通出库单 |

### 3.3 调拨接口（15 个）

| 编号 | 名称 | 方法与路径 | 使用端 | 权限/范围 | 状态、幂等与并发 | 日志、页面与备注 |
| --- | --- | --- | --- | --- | --- | --- |
| `TRF-001` | 调拨单列表 | `GET /api/v1/transfer-orders` | PC、小程序 | 查看、三仓范围 | 只读 | Task 4.9 调拨列表 |
| `TRF-002` | 调拨单详情 | `GET /api/v1/transfer-orders/{id}` | PC、小程序 | 查看、三仓/成本权限 | 只读 | 调拨详情 |
| `TRF-003` | 创建调拨单 | `POST /api/v1/transfer-orders` | PC | 创建、三仓操作 | 创建待调出业务草稿；幂等键 | 必记 |
| `TRF-004` | 修改调拨单 | `PATCH /api/v1/transfer-orders/{id}` | PC | 编辑、三仓范围 | 未提交/已驳回且未调出；`versionNo` | 必记 |
| `TRF-005` | 提交调拨单 | `POST /api/v1/transfer-orders/{id}/submit` | PC | 提交 | 审核状态草稿/驳回→待审核；幂等、版本 | 必记 |
| `TRF-006` | 撤回调拨单 | `POST /api/v1/transfer-orders/{id}/withdraw` | PC | 提交人/撤回 | 待审核→草稿；幂等、版本 | 必记 |
| `TRF-007` | 审核调拨单 | `POST /api/v1/transfer-orders/{id}/approve` | PC | 审核、职责分离 | 待审核→已审核；幂等、版本 | 审批/审计 |
| `TRF-008` | 驳回调拨单 | `POST /api/v1/transfer-orders/{id}/reject` | PC | 审核 | 待审核→已驳回；幂等、版本 | 必记 |
| `TRF-009` | 反审核调拨单 | `POST /api/v1/transfer-orders/{id}/unapprove` | PC | 反审核 | 已审核且未调出→草稿；幂等、版本 | 原因必记 |
| `TRF-010` | 取消调拨单 | `POST /api/v1/transfer-orders/{id}/cancel` | PC | 取消 | 未调出→已取消；幂等、版本 | 原因必记 |
| `TRF-011` | 调出确认 | `POST /api/v1/transfer-orders/{id}/ship` | PC | 调出、来源仓/在途仓 | 已审核且可调出；幂等、版本、双仓事务 | 高风险必记 |
| `TRF-012` | 调入确认 | `POST /api/v1/transfer-orders/{id}/receive` | PC | 调入、在途仓/目的仓 | 已调出/在途/部分调入；幂等、版本、双仓事务 | 差异必记 |
| `TRF-013` | 调拨状态历史 | `GET /api/v1/transfer-orders/{id}/status-history` | PC、小程序 | 查看 | 只读 | 状态 Tab |
| `TRF-014` | 调拨库存流水 | `GET /api/v1/transfer-orders/{id}/inventory-transactions` | PC、小程序 | 查看、三仓/成本权限 | 只读 | 调出/调入关联流水 |
| `TRF-015` | 导出调拨单 | `POST /api/v1/transfer-orders/export` | PC | 导出、三仓/成本权限 | 幂等键 | 必记 |

### 3.4 跨境接口（22 个）

| 编号 | 名称 | 方法与路径 | 使用端 | 权限/范围 | 状态、幂等与并发 | 日志、页面与备注 |
| --- | --- | --- | --- | --- | --- | --- |
| `CBR-001` | 跨境发货列表 | `GET /api/v1/cross-border-shipments` | PC、小程序 | 查看、三仓/生产范围 | 只读 | Task 4.10 发货列表 |
| `CBR-002` | 跨境发货详情 | `GET /api/v1/cross-border-shipments/{id}` | PC、小程序 | 查看、三仓/成本权限 | 只读 | 发货详情 |
| `CBR-003` | 创建跨境发货单 | `POST /api/v1/cross-border-shipments` | PC | 创建、三仓操作 | 创建草稿/待发货；幂等键 | 必记；不接平台实时订单 |
| `CBR-004` | 修改跨境发货单 | `PATCH /api/v1/cross-border-shipments/{id}` | PC | 编辑、三仓范围 | 草稿/已驳回且未发运；`versionNo` | 必记 |
| `CBR-005` | 提交跨境发货单 | `POST /api/v1/cross-border-shipments/{id}/submit` | PC | 提交 | 草稿/驳回→待审核；幂等、版本 | 必记 |
| `CBR-006` | 撤回跨境发货单 | `POST /api/v1/cross-border-shipments/{id}/withdraw` | PC | 提交人/撤回 | 待审核→草稿；幂等、版本 | 必记 |
| `CBR-007` | 审核跨境发货单 | `POST /api/v1/cross-border-shipments/{id}/approve` | PC | 审核、职责分离 | 待审核→已审核；幂等、版本 | 审批/审计 |
| `CBR-008` | 驳回跨境发货单 | `POST /api/v1/cross-border-shipments/{id}/reject` | PC | 审核 | 待审核→已驳回；幂等、版本 | 必记 |
| `CBR-009` | 反审核跨境发货单 | `POST /api/v1/cross-border-shipments/{id}/unapprove` | PC | 反审核 | 已审核且未发运→草稿；幂等、版本 | 原因必记 |
| `CBR-010` | 取消跨境发货单 | `POST /api/v1/cross-border-shipments/{id}/cancel` | PC | 取消 | 未发运→已取消；幂等、版本 | 必记 |
| `CBR-011` | 作废跨境发货单 | `POST /api/v1/cross-border-shipments/{id}/void` | PC | 作废 | 已审核且未发运/无下游；幂等、版本 | 原因必记 |
| `CBR-012` | 发运确认 | `POST /api/v1/cross-border-shipments/{id}/dispatch` | PC | 发运、来源仓/在途仓 | 已审核/部分发货；幂等、版本、双仓事务 | 高风险必记 |
| `CBR-013` | 跨境状态历史 | `GET /api/v1/cross-border-shipments/{id}/status-history` | PC、小程序 | 查看 | 只读 | 状态 Tab |
| `CBR-014` | 跨境库存流水 | `GET /api/v1/cross-border-shipments/{id}/inventory-transactions` | PC、小程序 | 查看、三仓/成本权限 | 只读 | 发运及后续导入执行流水 |
| `CBR-015` | 导出跨境发货 | `POST /api/v1/cross-border-shipments/export` | PC | 导出、三仓/成本权限 | 幂等键 | 必记 |
| `CBR-016` | 海外仓当前库存汇总 | `GET /api/v1/overseas-inventories/summary` | PC、小程序 | 海外仓查看 | 当前 `inventories` 聚合 | 不形成快照表 |
| `CBR-017` | 海外仓当前库存明细 | `GET /api/v1/overseas-inventories` | PC、小程序 | 海外仓查看 | 当前余额只读 | SKU/海外仓详情 |
| `CBR-018` | 海外导入任务列表 | `GET /api/v1/overseas-inventory-imports` | PC | 导入结果查看、仓库/店铺范围 | 只读 | Task 4.10 导入任务 |
| `CBR-019` | 海外导入任务详情 | `GET /api/v1/overseas-inventory-imports/{id}` | PC | 导入结果查看 | 只读 | 统计与错误摘要 |
| `CBR-020` | 海外导入结果明细 | `GET /api/v1/overseas-inventory-imports/{id}/items` | PC | 原始数据/仓库权限 | 只读、分页 | 原始行按权限脱敏 |
| `CBR-021` | 发货导入匹配结果 | `GET /api/v1/cross-border-shipments/{id}/import-matches` | PC | 发货/导入结果查看 | 只读 | 明细级匹配 |
| `CBR-022` | 海外库存来源追溯 | `GET /api/v1/overseas-inventories/{inventoryId}/source-trace` | PC | 海外仓/流水/导入权限 | 由流水、导入、匹配派生 | 不新增来源字段 |

Task 5.4 共定义 18 + 17 + 15 + 22 = 72 个正式接口。

### 3.5 API Change Request 001 候选补充（43 个）

下列接口仅补齐 Task 4.9 已批准页面能力，完整字段、权限、幂等、库存事务和验收规则见 `docs/00-governance/API_CHANGE_REQUEST_001.md`。在项目负责人 GitHub 验收前，本节状态为 Completed / Pending Approval。

| 模块 | 接口编号、方法与路径 | 数量 |
| --- | --- | ---: |
| 库存盘点 | `STC-001 GET /api/v1/stock-counts`；`STC-002 GET /api/v1/stock-counts/{id}`；`STC-003 POST /api/v1/stock-counts`；`STC-004 PATCH /api/v1/stock-counts/{id}`；`STC-005 POST /api/v1/stock-counts/{id}/submit`；`STC-006 POST /api/v1/stock-counts/{id}/withdraw`；`STC-007 POST /api/v1/stock-counts/{id}/approve`；`STC-008 POST /api/v1/stock-counts/{id}/reject`；`STC-009 POST /api/v1/stock-counts/{id}/start`；`STC-010 POST /api/v1/stock-counts/{id}/initial-results`；`STC-011 POST /api/v1/stock-counts/{id}/recount-results`；`STC-012 POST /api/v1/stock-counts/{id}/complete`；`STC-013 POST /api/v1/stock-counts/{id}/cancel`；`STC-014 POST /api/v1/stock-counts/{id}/void`；`STC-015 GET /api/v1/stock-counts/{id}/differences`；`STC-016 GET /api/v1/stock-counts/{id}/status-history`；`STC-017 POST /api/v1/stock-counts/export` | 17 |
| 销售退货 | `SRT-001 GET /api/v1/sales-returns`；`SRT-002 GET /api/v1/sales-returns/{id}`；`SRT-003 POST /api/v1/sales-returns`；`SRT-004 PATCH /api/v1/sales-returns/{id}`；`SRT-005 POST /api/v1/sales-returns/{id}/submit`；`SRT-006 POST /api/v1/sales-returns/{id}/withdraw`；`SRT-007 POST /api/v1/sales-returns/{id}/approve`；`SRT-008 POST /api/v1/sales-returns/{id}/reject`；`SRT-009 POST /api/v1/sales-returns/{id}/cancel`；`SRT-010 POST /api/v1/sales-returns/{id}/confirm-inbound`；`SRT-011 GET /api/v1/sales-return-eligible-items`；`SRT-012 GET /api/v1/sales-returns/{id}/status-history`；`SRT-013 POST /api/v1/sales-returns/export` | 13 |
| 报损 | `DMG-001 GET /api/v1/damage-reports`；`DMG-002 GET /api/v1/damage-reports/{id}`；`DMG-003 POST /api/v1/damage-reports`；`DMG-004 PATCH /api/v1/damage-reports/{id}`；`DMG-005 POST /api/v1/damage-reports/{id}/submit`；`DMG-006 POST /api/v1/damage-reports/{id}/withdraw`；`DMG-007 POST /api/v1/damage-reports/{id}/approve`；`DMG-008 POST /api/v1/damage-reports/{id}/reject`；`DMG-009 POST /api/v1/damage-reports/{id}/cancel`；`DMG-010 POST /api/v1/damage-reports/{id}/confirm-outbound`；`DMG-011 POST /api/v1/damage-reports/stock-validation`；`DMG-012 GET /api/v1/damage-reports/{id}/status-history`；`DMG-013 POST /api/v1/damage-reports/export` | 13 |

盘点完成只确认差异，不修改库存；销售退货审核不增加库存，只有 `SRT-010` 形成正式退货库存结果；报损审核不减少库存，只有 `DMG-010` 在防负库存校验后形成正式报损出库。所有库存确认均原子更新余额、单据事实和只追加流水。

## 4. 入库单查询接口

`INB-001` 支持 `documentNo`、`inboundType`、`sourceDocumentType`、`sourceDocumentId`、`warehouseId`、`supplierId`、`manufacturerId`、`inspectionOrderId`、`status`、`approvalStatus`、`documentDateFrom/To`、`inboundCompletedAtFrom/To`、`skuId`、`createdBy`、`submittedBy`、`approvedBy`、分页及白名单排序。

`INB-002` 返回正式主明细、来源单据/明细、验收单/明细、目标仓、数量、成本、状态、版本。`INB-018` 从来源合格数量、入库明细和库存流水实时派生计划、本次、累计及剩余数量。`INB-016` 使用库存流水的来源主单/明细追溯，不新增进度或追溯字段。

## 5. 创建采购入库单

`INB-003` 请求：`documentDate`、`purchaseOrderId`、`inspectionOrderId`、`warehouseId`、`remark`、`items`。明细为 `purchaseOrderItemId`、`inspectionOrderItemId`、`skuId`、`quantity`、`batchNo`、`productionDate`、`unitCost`、`inventoryCondition`、`remark`。

来源验收必须为采购来源且已确认，供应商由采购单派生；来源采购、验收、SKU 和明细必须一致。每行及累计满足 `inbound <= confirmedQualified <= inspected <= ordered`。服务端生成编号、快照、行号、行成本、总量、草稿状态和版本。不得无验收入库，不得由客户端提交累计量或目标状态。

## 6. 创建生产入库单

`INB-004` 请求结构同采购入库，使用 `productionOrderId`、`inspectionOrderId`、生产明细和验收明细。厂家由生产单派生，仓库依据已确认完工/验收语义及授权范围校验，不从生产单读取统一目标仓。

每行及累计满足 `inbound <= confirmedQualified <= confirmedCompletion <= planned`。生产验收仍以生产订单及生产明细为正式来源；没有验收到完工记录的持久化关系。不得超过已确认完工量、验收合格量或重复入库。

`INB-005` 只接受 Frozen 已批准的其他库存增加类型，并要求受控 `sourceDocumentType`、`sourceDocumentId` 与 `sourceDocumentItemId`。无正式来源的“手工增加库存”拒绝。

## 7. 入库单修改接口

`INB-006` 仅允许草稿或已驳回且未形成库存流水的单据。可修改业务日期、目标仓、备注及完整明细；来源类型、来源主单和适用验收单不得改变。明细增删改后服务端重建行号、快照、总量和成本。

必须提交 `versionNo`。禁止直接修改 `status`、`approvalStatus`、`totalQuantity`、`inboundCompletedAt`、来源累计量、库存余额或流水。提交、审核、部分入库、完成或形成库存流水后不得普通修改。

## 8. 入库状态动作接口

正式动作：提交、撤回、审核通过、审核驳回、反审核、取消、确认入库、冲销。入库具体状态只使用草稿、待审核、已审核、部分入库、已完成、已驳回、已取消、已冲销。

不设计“作废入库”或“直接撤销已完成”接口。已完成纠错只能由 `INB-014` 形成反向库存流水并进入已冲销；存在合法下游消耗、调拨或发货时禁止冲销，必须先处理下游。

## 9. 入库确认事务

`INB-013` 请求 `versionNo`、`items[{inboundOrderItemId, quantity}]`、可选 `confirmationComment`。同一事务内：

1. 校验单据已审核或部分入库；
2. 校验验收已确认及来源仍有效；
3. 重新汇总可入库数量；
4. 校验目标仓操作权限；
5. 读取并条件更新 SKU/仓库库存；
6. 增加账面及按库存状态允许的可用/待处理数量；
7. 为每个明细追加库存流水；
8. 更新采购/生产来源累计入库快照；
9. 由本单流水累计判断并更新部分入库/已完成状态及完成时间；
10. 写状态历史；
11. 写审计日志并递增版本。

任一步失败整体回滚。幂等重试返回首次结果，不重复余额、流水或累计量。

## 10. 国内销售出库

`OUT-003` 请求：`documentDate`、`warehouseId`、`platformId`、`storeId`、`externalOrderNo`、`customerName`、`recipientCountry`、`recipientAddress`、`remark`、`items`。明细为 `skuId`、`quantity`、`batchNo`、`unitCost`、`externalSkuCode`、`externalOrderItemNo`、`remark`。

服务端校验平台与店铺关系、店铺和出库仓权限、同店铺外部订单号唯一、SKU/批次有效及可用库存。套装按套装 SKU 整体扣减，不拆分组件。系统只登记销售出库，不创建销售订单、销售订单 ID 或订单状态。

`OUT-004` 只接受 Frozen 已批准的样品、领用及其他普通出库类型；不得代替采购退货、调拨、跨境发货、报损或无来源流水。

## 11. 客户隐私与店铺权限

客户姓名和收件地址默认脱敏；完整值仅向同时具备出库查看、店铺范围和个人信息字段权限的用户返回。无店铺权限时查询前过滤并对不可见资源返回 403/404。导出必须具备导出与个人信息权限并记录范围。

日志、错误详情、搜索提示和导出审计摘要不得记录完整客户姓名、收件地址或其他完整个人信息。不得通过排序、筛选、聚合或错误消息推断未授权值。

## 12. 采购退货出库

采购退货单的创建、修改、提交、审核等由 Task 5.2 `PUR-020` 至 `PUR-029` 管理。`OUT-017` 只执行已审核采购退货单的实际出库，不创建第二张普通出库单。

请求为 `versionNo`、可选 `completedAt` 和 `confirmationComment`。服务端校验原采购、原入库、退货仓、采购退货明细、SKU、批次/库存状态、合法可退数量和可用库存；累计退货出库不得超过采购退货数量、原合法入库量或当前可退量。事务扣减退货仓库存、追加以采购退货主明细为来源的流水、更新采购明细 `returned_quantity` 快照、采购退货完成状态与 `completed_at`、状态历史和审计。

已完成请求幂等返回首次结果；重复退货、超量、负库存或来源不一致拒绝。

## 13. 其他出库

Frozen `outbound_orders.outbound_type` 和 Approved Task 4.9 明确支持样品、领用及其他普通出库，因此 `OUT-004` 为正式接口。请求仅使用普通出库正式字段；销售专属平台、店铺和客户快照不适用时为空。

采购退货、调拨、跨境发货和报损已有独立正式对象，禁止通过 `OUT-004` 包装执行。

## 14. 出库库存事务

`OUT-012` 请求 `versionNo`、`items[{outboundOrderItemId, quantity}]`、可选说明。同一事务内校验来源和状态、出库仓/店铺权限、SKU/批次可用库存；按条件扣减库存并禁止负数；追加流水；由本单流水累计判断并更新部分出库/已完成状态及完成时间；写状态历史、审计并递增版本。

库存、流水、单据和累计事实必须同成同败。重复请求由幂等键阻止。`OUT-013` 仅在下游允许时以关联反向流水恢复库存并进入已冲销，不覆盖或删除原流水。

## 15. 调拨单查询和创建

`TRF-001` 支持单号、来源/在途/目的仓、业务状态、审核状态、计划日期、调出/调入时间、SKU 和创建/审核人筛选。`TRF-002` 返回三仓、计划量、调出量、调入量、差异、状态、版本和关联流水。

`TRF-003` 请求 `documentDate`、`sourceWarehouseId`、`transitWarehouseId`、`destinationWarehouseId`、`plannedTransferDate`、`remark`、`items`；明细为 `skuId`、`quantity`、`batchNo`、`unitCost`、`remark`。三仓必须两两不同，在途仓必须为正式在途类型，用户必须具备相应操作权限。创建不改变库存。

`TRF-004` 只允许未提交/已驳回且未调出时修改，并要求 `versionNo`；不得直接修改调出、调入、差异数量或状态。

## 16. 调拨状态动作

审核动作使用提交、撤回、审核、驳回和未调出前反审核；业务动作使用调出确认、调入确认和未调出前取消。业务状态只使用待调出、部分调出、已全部调出、调拨在途、部分调入、已完成、调拨异常、已取消。

调拨正式为两阶段，不设计单次“调拨确认”直接从来源仓进入目的仓，也不设计作废状态。客户端不得直接提交目标状态。

## 17. 调拨库存事务

`TRF-011` 按明细确认本次调出量：在一个事务内扣减来源仓、增加在途仓、写相互关联的两条流水、累计 `shippedQuantity`、更新调出时间及部分/全部调出和在途状态。任一仓更新失败整体回滚。

`TRF-012` 按明细确认本次调入量：在一个事务内扣减在途仓、增加目的仓、写关联流水、累计 `receivedQuantity`、计算 `differenceQuantity`、更新调入时间及部分调入/完成/异常状态。调入不得超过在途合法数量；差异不得覆盖原调出量。完成必须满足调出/调入闭环、在途为零、差异已处理及两端流水完整。

## 18. 跨境发货单查询

`CBR-001` 支持单号、发货批次、目的国家、来源/在途/海外仓、生产单、SKU、`shipmentStatus`、通用/审核状态、发运/预计/实际到达日期、承运商、物流单号、是否逾期及是否有差异。

Frozen 跨境发货单没有平台或店铺字段，因此发货列表不提供平台/店铺筛选。平台或店铺仅可在有正式 `import_tasks.store_id` 的导入结果查询中使用。厂家通过可选生产单派生，不作为发货单新增字段。

## 19. 创建跨境发货单

`CBR-003` 请求：`documentDate`、可选 `productionOrderId`、`sourceWarehouseId`、`transitWarehouseId`、`destinationWarehouseId`、`shipmentBatchNo`、`carrierName`、`trackingNo`、`departureDate`、`estimatedArrivalDate`、`destinationCountry`、`remark`、`items`。明细为可选 `productionOrderItemId`、`skuId`、`quantity`、`batchNo`、`unitCost`、`remark`。物流信息只接受承运商、运单号、发运日期和预计到达日期。

三仓两两不同；来源仓只接受合法公司仓、厂家仓或产业园成品仓语义，在途仓必须为在途类型，目的仓必须为海外仓；仓库权限、SKU/批次、数量、发货批次唯一及承运商+物流单号唯一均须校验。生产来源只能使用 Frozen 生产单/生产明细关系，不能提交完工记录 ID。关联生产时累计发货不超生产合法可发数量；未关联生产时以来源仓合法可用库存为准。

不接收平台、店铺、币种、清关、签收、费用或实时平台订单字段。跨境采购、生产和发货沿用人民币业务口径，不新增币种字段。

## 20. 跨境发货状态动作

通用审核动作：提交、撤回、审核、驳回、未发运前反审核；终止动作：未发运前取消或已审核无下游时作废；库存动作：发运确认。

`shipmentStatus` 只使用待发货、部分发货、已全部发货、已取消、发货异常。发运后禁止普通修改关键仓库、生产来源、SKU、批次和数量。根据第 32 节项目负责人正式决定，本 Task 不定义独立物流、海外收货和差异状态写接口，也不定义手工海外收货确认接口。

## 21. 跨境发货库存事务

`CBR-012` 请求 `versionNo`、`items[{crossBorderShipmentItemId, quantity}]` 和可选说明。同一事务内校验来源仓与在途仓权限、生产来源/明细、累计可发量、来源仓可用库存、SKU/批次和状态；扣减来源仓、增加在途仓；追加关联流水；累计发货数量；更新部分/全部发货状态、生产发货快照、状态历史、审计和版本。

发运确认不得直接增加海外仓库存。海外仓正式库存变化只能由 Task 5.5 正式 Excel 导入结果形成；本 Task 仅查询执行结果。网络重试不得形成重复流水或重复累计。

## 22. 海外仓库存与导入结果查询

`CBR-016`、`CBR-017` 只查询 `warehouse_type=overseas` 的当前 `inventories`，支持海外仓、国家、SKU、产品和数据日期元信息；海外仓权限在查询和聚合前过滤。它不是国内实时库存，也不允许反向修改国内库存。

`CBR-018` 至 `CBR-020` 查询 Task 5.5 后续正式导入任务及明细结果，支持仓库、店铺、导入类型、任务状态、创建/完成日期、SKU、校验/执行结果和分页。`CBR-021` 查询明细级 `shipment_import_matches`。`CBR-022` 从库存流水、导入任务、导入明细和匹配记录追溯来源。

项目负责人已正式取消历史余额快照、快照差异和快照查询接口。Task 5.4 只保留当前库存、库存流水、Excel 导入任务、导入明细、导入结果和来源追溯；正式上传、校验、确认、匹配写入和执行接口留待 Task 5.5。

## 23. 出入库权限矩阵

PROJECT 正式角色只有管理员、采购人员、仓库人员、销售人员和公司负责人。“生产人员”“验收人员”“跨境业务人员”只能通过现有用户、角色和权限配置赋能，不作为本 Task 新增角色。

| 操作 | 管理员 | 采购人员 | 仓库人员 | 销售人员 | 公司负责人 |
| --- | --- | --- | --- | --- | --- |
| 创建/确认采购入库 | 按授权 | 创建/来源查看 | 目标仓确认 | 无 | 按授权审核 |
| 创建/确认生产入库 | 按授权 | 默认无 | 目标仓确认 | 无 | 按授权审核 |
| 创建/确认销售出库 | 按授权 | 无 | 出库仓确认 | 店铺范围创建 | 按授权审核 |
| 采购退货出库 | 按授权 | 退货业务权限 | 退货仓确认 | 无 | 按授权审核 |
| 调拨 | 按三仓授权 | 无 | 调出/调入按仓库 | 无 | 按授权审核 |
| 跨境发货 | 按三仓授权 | 无 | 来源/在途仓执行 | 另授权方可 | 按授权审核 |
| 客户信息 | 字段权限 | 无 | 最小必要 | 店铺及字段权限 | 字段权限 |
| 海外仓/导入结果 | 海外仓权限 | 默认无 | 仓库范围 | 店铺关联范围 | 按授权 |
| 导出/成本金额 | 独立权限 | 业务必要 | 成本默认受限 | 个人信息/成本受限 | 独立权限 |

所有跨仓、跨店铺动作必须同时满足全部端点范围；前端隐藏不替代服务端校验。

## 24. 状态转换矩阵

### 24.1 入库单

| 当前状态 | 动作 | 目标 | 权限与前置 | 禁止/幂等、错误与日志 |
| --- | --- | --- | --- | --- |
| 草稿/已驳回 | 提交 | 待审核 | 明细、来源、验收有效 | 幂等；`STATE_INBOUND_ACTION_NOT_ALLOWED`；必记 |
| 待审核 | 撤回/审核/驳回 | 草稿/已审核/已驳回 | 提交人或审核权限、职责分离 | 版本竞争 409；审批/历史/审计 |
| 已审核 | 反审核 | 草稿 | 无库存流水或下游 | 有下游禁止；幂等；原因必记 |
| 草稿 | 取消 | 已取消 | 无下游 | 幂等；原因必记 |
| 已审核/部分入库 | 确认入库 | 部分入库/已完成 | 验收、数量、仓库、版本有效 | 原子库存事务；重复流水 409；必记 |
| 已完成 | 冲销 | 已冲销 | 下游允许、反向数量合法 | 原流水保留；关联反向流水；必记 |

### 24.2 出库单

| 当前状态 | 动作 | 目标 | 权限与前置 | 禁止/幂等、错误与日志 |
| --- | --- | --- | --- | --- |
| 草稿/已驳回 | 提交 | 待审核 | 明细、仓库/店铺有效 | 幂等；必记 |
| 待审核 | 撤回/审核/驳回 | 草稿/已审核/已驳回 | 提交人或审核权限 | 版本竞争 409；审批/审计 |
| 已审核 | 反审核 | 草稿 | 无库存流水 | 有下游禁止；原因必记 |
| 草稿 | 取消 | 已取消 | 无下游 | 幂等；原因必记 |
| 已审核/部分出库 | 确认出库 | 部分出库/已完成 | 库存、批次、权限、版本有效 | 不足时保持/提示库存不足；原子事务 |
| 已完成 | 冲销 | 已冲销 | 下游允许 | 关联反向流水；必记 |

### 24.3 调拨单

| 当前状态 | 动作 | 目标 | 权限与前置 | 禁止/幂等、错误与日志 |
| --- | --- | --- | --- | --- |
| 审核草稿/驳回 | 提交 | 待审核 | 三仓及明细有效 | 幂等、版本、必记 |
| 待审核 | 撤回/审核/驳回 | 草稿/已审核/已驳回 | 职责分离 | 409 竞争；审批/审计 |
| 已审核且待调出 | 反审核/取消 | 草稿/已取消 | 尚未调出 | 已调出禁止；原因必记 |
| 待调出/部分调出 | 调出确认 | 部分调出/已全部调出/调拨在途 | 来源与在途仓、库存有效 | 双仓原子事务；必记 |
| 已全部调出/调拨在途/部分调入 | 调入确认 | 部分调入/已完成/调拨异常 | 在途与目的仓、数量有效 | 不得超在途；双仓原子事务；必记 |

### 24.4 跨境发货

| 当前状态 | 动作 | 目标 | 权限与前置 | 禁止/幂等、错误与日志 |
| --- | --- | --- | --- | --- |
| 草稿/驳回 | 提交 | 待审核 | 三仓、物流和明细完整 | 幂等、版本、必记 |
| 待审核 | 撤回/审核/驳回 | 草稿/已审核/已驳回 | 职责分离 | 409 竞争；审批/审计 |
| 已审核且待发货 | 反审核/取消/作废 | 草稿/已取消/已作废 | 尚未发运、无下游 | 已发运禁止；原因必记 |
| 待发货/部分发货 | 发运确认 | 部分发货/已全部发货 | 来源与在途仓、生产可发量、库存有效 | 双仓原子事务；重复流水 409 |

客户端不得直接提交任意目标状态。根据第 32 节项目负责人正式决定，不建立独立物流、海外收货和差异状态动作。

## 25. 数量一致性规则

- 采购入库：`累计入库 <= 累计验收合格 <= 累计验收 <= 采购数量`；
- 生产入库：`累计入库 <= 累计验收合格 <= 已确认完工 <= 计划数量`；
- 销售/普通出库：`本次出库 <= 当前可用库存`；
- 采购退货出库：`累计退货出库 <= 合法可退数量 <= 原入库数量`；
- 调拨：累计调出不超计划及源仓可用量，累计调入不超在途合法量，差异保留；
- 跨境发货：累计发货不超来源仓可用库存；关联生产时同时不超生产合法可发量；
- 套装只按套装 SKU 数量执行；
- 正式事实以来源单据、明细和库存流水复核，累计字段仅为快照；
- 每次并发动作重新汇总，不按旧页面缓存累加，不得重复累计。

## 26. 幂等与并发

所有创建接口、提交/审核/反审核/取消/作废/冲销动作、入库确认、出库确认、采购退货出库、调出/调入、跨境发运及导出均要求 `Idempotency-Key`。编辑必须提交 `versionNo`。

并发使用现有 `version_no`、当前状态、唯一约束、来源累计事实、SKU+仓库库存唯一范围、库存余额条件更新和数据库事务。不得新增版本字段或幂等表。库存竞争、版本冲突、重复事务和同键不同请求均返回 409；事务失败整体回滚。

## 27. 业务错误码

| 错误码 | HTTP | 含义 |
| --- | --- | --- |
| `RESOURCE_INBOUND_ORDER_NOT_FOUND` | 404 | 入库单不存在或不可见 |
| `RESOURCE_OUTBOUND_ORDER_NOT_FOUND` | 404 | 出库单不存在或不可见 |
| `RESOURCE_TRANSFER_ORDER_NOT_FOUND` | 404 | 调拨单不存在或不可见 |
| `RESOURCE_CROSS_BORDER_SHIPMENT_NOT_FOUND` | 404 | 跨境发货单不存在或不可见 |
| `RESOURCE_SOURCE_DOCUMENT_INVALID` | 422 | 来源主单或明细无效 |
| `STATE_INSPECTION_NOT_CONFIRMED` | 422 | 验收尚未确认，禁止入库 |
| `VALIDATION_INBOUND_QUANTITY_EXCEEDED` | 422 | 超过合法可入库数量 |
| `INVENTORY_OUTBOUND_INSUFFICIENT` | 409 | 可出库库存不足 |
| `VALIDATION_PURCHASE_RETURN_QUANTITY_EXCEEDED` | 422 | 退货出库超过合法可退数量 |
| `VALIDATION_TRANSFER_WAREHOUSE_SAME` | 422 | 调拨仓库相同或角色不合法 |
| `PERMISSION_SOURCE_WAREHOUSE_DENIED` | 403 | 无来源仓权限 |
| `PERMISSION_DESTINATION_WAREHOUSE_DENIED` | 403 | 无目的仓权限 |
| `PERMISSION_STORE_DENIED` | 403 | 无店铺权限 |
| `PERMISSION_OVERSEAS_WAREHOUSE_DENIED` | 403 | 无海外仓权限 |
| `CONFLICT_INVENTORY_TRANSACTION_DUPLICATE` | 409 | 重复库存事务 |
| `STATE_INBOUND_ACTION_NOT_ALLOWED` | 422 | 入库状态不允许动作 |
| `STATE_OUTBOUND_ACTION_NOT_ALLOWED` | 422 | 出库状态不允许动作 |
| `STATE_TRANSFER_ACTION_NOT_ALLOWED` | 422 | 调拨状态不允许动作 |
| `STATE_CROSS_BORDER_ACTION_NOT_ALLOWED` | 422 | 跨境状态不允许动作 |
| `STATE_DOWNSTREAM_BUSINESS_EXISTS` | 409 | 已存在下游，禁止回退或冲销 |
| `CONFLICT_VERSION_MISMATCH` | 409 | 单据版本冲突 |
| `CONFLICT_INVENTORY_MODIFIED` | 409 | 库存并发变化 |
| `INVENTORY_NEGATIVE_NOT_ALLOWED` | 409 | 操作将产生负库存 |
| `DESIGN_FROZEN_MAPPING_MISSING` | 422 | 设计需要的 Frozen 字段、状态、关系或对象不存在 |

## 28. 日志与脱敏

必须记录入库、出库、采购退货出库、调拨、跨境发货的创建、修改与状态动作；所有库存事务；客户信息查看；海外仓导入结果/库存导出；高风险库存查询。状态变化写 `document_status_histories`，审批写 `approval_records`，操作写 `audit_logs`。

日志包含操作人、时间、模块、对象、编号快照、动作、结果、`requestId`、仓库/店铺范围及安全数量摘要。不得记录密码、Token、Cookie、完整客户姓名、完整地址、完整联系方式、完整银行账号、原始敏感导入数据、SQL、堆栈或服务器路径。

## 29. 接口示例

### 29.1 创建采购入库单

```json
{"documentDate":"2026-07-21","purchaseOrderId":"018f...001","inspectionOrderId":"018f...002","warehouseId":"018f...003","items":[{"purchaseOrderItemId":"018f...011","inspectionOrderItemId":"018f...012","skuId":"018f...013","quantity":"10.0000","batchNo":"B20260721","unitCost":"120.0000","inventoryCondition":"qualified"}]}
```

### 29.2 创建生产入库单

```json
{"documentDate":"2026-07-21","productionOrderId":"018f...101","inspectionOrderId":"018f...102","warehouseId":"018f...103","items":[{"productionOrderItemId":"018f...111","inspectionOrderItemId":"018f...112","skuId":"018f...113","quantity":"8.0000","batchNo":"P20260721","unitCost":"300.0000","inventoryCondition":"qualified"}]}
```

### 29.3 确认入库

```json
{"versionNo":2,"items":[{"inboundOrderItemId":"018f...201","quantity":"8.0000"}],"confirmationComment":"验收与数量已复核"}
```

### 29.4 创建国内销售出库

```json
{"documentDate":"2026-07-21","warehouseId":"018f...301","platformId":"018f...302","storeId":"018f...303","externalOrderNo":"EXT-20260721-001","customerName":"张三","recipientCountry":"CN","recipientAddress":"上海市…","items":[{"skuId":"018f...304","quantity":"1.0000","batchNo":"B202607","unitCost":"500.0000","externalSkuCode":"EXT-SKU-01"}]}
```

### 29.5 确认销售出库

```json
{"versionNo":2,"items":[{"outboundOrderItemId":"018f...311","quantity":"1.0000"}],"confirmationComment":"库存与订单快照已复核"}
```

### 29.6 确认采购退货出库

```json
{"versionNo":3,"completedAt":"2026-07-21T10:00:00+08:00","confirmationComment":"退货数量与来源入库已复核"}
```

### 29.7 创建调拨单与调出确认

```json
{"documentDate":"2026-07-21","sourceWarehouseId":"018f...401","transitWarehouseId":"018f...402","destinationWarehouseId":"018f...403","plannedTransferDate":"2026-07-22","items":[{"skuId":"018f...404","quantity":"5.0000","batchNo":"B202607","unitCost":"300.0000"}]}
```

```json
{"versionNo":2,"items":[{"transferOrderItemId":"018f...411","quantity":"5.0000"}]}
```

### 29.8 创建跨境发货与发运确认

```json
{"documentDate":"2026-07-21","productionOrderId":"018f...501","sourceWarehouseId":"018f...502","transitWarehouseId":"018f...503","destinationWarehouseId":"018f...504","shipmentBatchNo":"CB20260721-01","carrierName":"Carrier A","trackingNo":"TRACK-001","departureDate":"2026-07-22","estimatedArrivalDate":"2026-08-20","destinationCountry":"US","items":[{"productionOrderItemId":"018f...511","skuId":"018f...512","quantity":"12.0000","batchNo":"B202607","unitCost":"300.0000"}]}
```

```json
{"versionNo":2,"items":[{"crossBorderShipmentItemId":"018f...521","quantity":"12.0000"}]}
```

### 29.9 海外仓库存查询与失败响应

```http
GET /api/v1/overseas-inventories?warehouseId=018f...504&skuId=018f...512&page=1&pageSize=20
```

```json
{"success":false,"error":{"code":"CONFLICT_INVENTORY_MODIFIED","message":"库存已发生变化，请刷新后重试","details":[]},"requestId":"req-20260721-5401"}
```

## 30. 页面与接口映射

| Approved 页面/动作 | 接口 | 权限与状态 | 响应与异常 |
| --- | --- | --- | --- |
| Task 4.8 当前库存/分仓/流水 | Task 5.3 `INV-001` 至 `INV-007`；本 Task 业务详情接口提供来源跳转 | 库存、仓库、流水/成本权限 | 不重复创建库存余额或流水接口；按来源追溯入库、出库、调拨、跨境业务 |
| Task 4.8 海外仓库存视图 | `CBR-016`、`CBR-017`、`CBR-022` | 海外仓/流水权限 | 当前正式余额与来源追溯；无历史快照 |
| Task 4.9 入库列表/详情/进度 | `INB-001`、`INB-002`、`INB-015`、`INB-016`、`INB-018` | 查看、仓库/成本 | 正式主明细、历史、流水；无权 403/404 |
| 采购/生产/其他入库新增编辑 | `INB-003` 至 `INB-006` | 创建/编辑；草稿/驳回 | 来源、验收、数量校验 422 |
| 入库提交审核完成冲销 | `INB-007` 至 `INB-014` | 专用状态及库存权限 | 状态/版本/库存冲突 409 |
| Task 4.9 出库列表/详情 | `OUT-001`、`OUT-002`、`OUT-014`、`OUT-015` | 仓库/店铺/个人信息 | 脱敏主明细、历史、流水 |
| 国内销售/其他出库新增编辑 | `OUT-003` 至 `OUT-005` | 创建/编辑；草稿/驳回 | 店铺、唯一性、库存提示 |
| 出库提交审核完成冲销 | `OUT-006` 至 `OUT-013` | 专用状态及库存权限 | 库存不足、负库存、版本冲突 |
| Task 4.6 采购退货实际出库 | `OUT-017` | 已审核采购退货、退货仓 | 完成事实与流水；超量/重复拒绝 |
| Task 4.9 调拨列表/创建/审核 | `TRF-001` 至 `TRF-010` | 三仓及审核权限 | 三仓、状态、版本校验 |
| 调出/调入/流水 | `TRF-011` 至 `TRF-014` | 两端仓库权限 | 双仓事务、在途、差异提示 |
| Task 4.10 发货列表/新增/审核 | `CBR-001` 至 `CBR-011` | 三仓/生产/审核范围 | 正式字段；无平台/完工记录关系 |
| 发运确认与流水 | `CBR-012` 至 `CBR-014` | 来源/在途仓、库存权限 | 原子双仓流水；库存/累计冲突 |
| 海外仓当前库存 | `CBR-016`、`CBR-017`、`CBR-022` | 海外仓/流水权限 | 当前余额与来源追溯 |
| 导入任务/结果/匹配只读 | `CBR-018` 至 `CBR-021` | 导入、仓库/店铺权限 | Task 5.5 结果；原始数据脱敏 |
| Task 4.10 物流信息、导入结果与海外库存 | `CBR-001`、`CBR-002`、`CBR-016` 至 `CBR-022` | 三仓、导入、流水权限 | 物流仅展示；海外库存仅由 Task 5.5 Excel 导入结果形成 |
| 历史海外库存余额快照/差异快照 | 无正式接口 | 项目负责人已取消 | 保留当前库存、流水、导入历史和来源追溯 |
| Task 4.9 库存盘点 | `STC-001` 至 `STC-017` | 仓库、执行、复盘、审核、导出 | 盘点完成只确认差异；关联调整沿用 `INV-013` |
| Task 4.9 销售退货 | `SRT-001` 至 `SRT-013` | 店铺、原出库、接收仓、处理、导出 | 确认退货入库才形成库存与流水 |
| Task 4.9 报损 | `DMG-001` 至 `DMG-013` | 仓库、成本、审核、确认、导出 | 确认报损出库才扣减库存与追加流水 |

Task 4.8 当前库存入口、Task 4.9 与 Task 4.10 的可映射操作，在 API Change Request 001 获批后均有正式接口覆盖；Task 4.10 已取消能力不建立接口。

## 31. 范围排除

本 Task 不包含基础资料、采购单维护、生产单维护、验收单维护、库存调整、Excel 上传/校验/执行、通用附件、平台实时 API、完整销售订单、海外仓实时平台写入、真实 Route、Controller、Service、Repository、ORM、Schema、DDL、Migration、Seed、技术框架或技术开发。库存盘点、销售退货和报损不再属于范围排除，按 API Change Request 001 候选补充处理。

## 32. 跨境业务口径修正与正式结论

### 32.1 项目负责人正式决定

| 原冲突位置 | 页面/API 正式口径 | 处理结果 |
| --- | --- | --- |
| 独立物流状态、海外收货状态、差异处理状态及四维状态筛选/写接口 | 删除上述独立状态、筛选和写接口；只保留 `status`、`approval_status`、`shipment_status`。物流信息仅展示承运商、运单号、发运日期和预计到达日期 | 冲突关闭 |
| 海外库存历史余额快照、快照差异及快照查询接口 | 正式取消快照能力；保留当前库存、库存流水、Excel 导入任务、导入明细、导入结果和来源追溯 | 冲突关闭 |
| 手工海外收货入口、API 及手工增加海外仓库存 | 正式取消；跨境发运只执行来源仓至在途仓，海外仓库存只能由 Task 5.5 Excel 导入结果形成 | 冲突关闭 |

三个冲突全部采用页面/API 口径调整解决，不发起新的 DCR。Frozen 数据库保持不变，未新增字段、表、状态、关系、约束、索引或业务对象；Task 5.4 冲突全部关闭。

### 32.2 正式结论

1. Task 5.1、Task 5.2、Task 5.3 均为 Completed / Approved；
2. Task 5.4 已完成设计并获得项目负责人批准，状态为 Completed / Approved；
3. v1.0 原定义 72 个正式接口：入库 18、出库 17、调拨 15、跨境 22；API Change Request 001 另补充盘点 17、销售退货 13、报损 13，共 43 个候选接口；
4. 入库前必须完成正式验收；所有库存变化均通过原子库存事务和只追加流水；
5. 国内销售只登记销售出库，不建立销售订单；
6. 调拨严格经过在途仓；跨境发运只执行来源仓到在途仓；
7. 海外仓当前库存只读，Excel 正式导入写接口留待 Task 5.5；
8. 三项映射冲突已按项目负责人批准的页面/API 口径全部关闭，不发起 DCR；
9. 未新增字段、表、状态、关系、约束、索引或业务对象；
10. 未创建真实 API Route，未编写业务代码，未修改 Frozen 数据库；Task 4.10 仅同步本次批准的页面口径；
11. Phase 5 保持 In Progress，Task 5.5 为 Completed / Approved；
12. 当前下一步为 API Change Request 001 GitHub 验收；Phase 6 Final Consistency Review 保持 Waiting / Blocked by API CR Approval；
13. 技术开发保持 Not Started。
