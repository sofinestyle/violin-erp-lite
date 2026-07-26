---
document_name: Task 8-D1 Cross-border Business Implementation Design
project: Violin ERP Lite
phase: Phase 8 Application Development
task: 8-D1 Cross-border Business Implementation Design
version: 1.0
status: Completed / Pending Approval
owner: Codex
created_date: 2026-07-26
updated_date: 2026-07-26
related_documents:
  - docs/phases/phase-08/TASK_8_D_CROSS_BORDER_IMPACT_REVIEW.md
  - docs/03-data/DATABASE_SPEC.md
  - docs/05-api/API_SPEC.md
  - docs/02-product/ROLE_PERMISSION_SPEC.md
  - docs/01-business/BUSINESS_RULES.md
  - docs/phases/phase-04/TASK_4_10_CROSS_BORDER_BUSINESS_PAGE_DESIGN.md
  - docs/phases/phase-05/TASK_5_4_INBOUND_OUTBOUND_CROSS_BORDER_API.md
  - docs/phases/phase-05/TASK_5_5_IMPORT_LOG_SECURITY_API_FINAL.md
---

# 1. Cross-border Module Scope

本实施设计基于 Phase 8-D Cross-border Business Impact Review，并严格复用已批准的页面、API、数据库、权限和业务规则。

本阶段只定义 Cross-border Business 的实施方案，不修改 Database SSOT、API SSOT、Permission SSOT，不新增业务对象，不开发代码。

## Cross-border Shipment

Cross-border Shipment 是国内库存进入在途仓的正式业务边界。

包含：

1. 跨境发货单；
2. 跨境发货明细；
3. 创建、编辑、提交、撤回、审核、驳回、反审核、取消、作废；
4. 确认发货；
5. 来源仓库存扣减；
6. 在途仓库存增加；
7. 跨境发货库存流水；
8. 发货状态历史；
9. 跨境发货审计；
10. 来源追踪入口。

不包含：

1. 独立跨境采购订单；
2. 独立跨境销售订单；
3. 手工海外收货；
4. 直接增加海外仓库存；
5. 报关、清关、税费、物流费用和财务核算；
6. 外部物流轨迹平台。

## Overseas Inventory Import

Overseas Inventory Import 是在途库存进入海外仓库存的正式业务边界。

包含：

1. Excel 上传；
2. Import Task 创建；
3. 模板校验；
4. 文件校验；
5. 行级数据校验；
6. SKU / 仓库 / 来源发货明细匹配；
7. 导入执行；
8. 在途仓库存扣减；
9. 海外仓库存增加；
10. `shipment_import_matches` 明细级匹配；
11. 导入结果、错误、警告和执行状态；
12. 导入审计和来源追踪。

不包含：

1. 第二套跨境 Excel 导入表；
2. 历史海外库存快照表；
3. 手工修改导入成功结果；
4. 导入回滚删除正式库存流水；
5. 未匹配数据静默入库；
6. Amazon / Temu API 自动同步。

## Platform / Store View

Platform / Store View 是跨境业务的查询和分析维度，不是新的库存事实来源。

包含：

1. 平台维度；
2. 店铺维度；
3. SKU 维度；
4. 海外仓维度；
5. 海外库存查询；
6. 导入任务目标店铺或目标仓库查询；
7. 平台 / 店铺维度统计展示。

不包含：

1. 独立 `platform_orders` 生命周期；
2. 平台订单履约管理；
3. 平台 Token / Secret 管理；
4. 平台实时库存同步；
5. 平台订单直接扣减库存。

## Replenishment Suggestion

Replenishment Suggestion 是只读派生建议。

包含：

1. 低库存提醒；
2. 零库存提醒；
3. 海外仓、SKU、平台和店铺维度的补货候选；
4. 基于当前库存、在途库存和导入结果的补货建议；
5. 页面只读展示。

不包含：

1. 正式补货计划；
2. 补货审批流；
3. 自动创建采购订单；
4. 自动创建生产任务；
5. 自动创建跨境发货单；
6. AI 自动决策补货。

# 2. Cross-border Shipment Flow

跨境发货流程：

```text
创建发货单
↓
提交
↓
审核
↓
确认发货
↓
来源仓扣减
↓
运输中库存增加
```

## 2.1 Create

创建跨境发货单使用 `CBR-003`。

服务端设计要求：

1. 校验用户具备 `cross-border.shipment.create`；
2. 校验来源仓、在途仓、目的海外仓均存在且启用；
3. 校验三仓两两不同；
4. 来源仓必须是合法公司仓、厂家仓或已批准可发货仓；
5. 在途仓必须为 `warehouse_type = transit`；
6. 目的仓必须为 `warehouse_type = overseas`；
7. 校验用户对来源仓、在途仓和目的海外仓具备对应 warehouse scope；
8. 校验 SKU 存在且启用；
9. 校验发货数量大于零；
10. 校验发货批次号唯一；
11. 校验承运商和物流单号唯一性；
12. 可选校验生产订单和生产明细来源；
13. 使用 Idempotency-Key 防止重复创建；
14. 写入跨境发货单和明细；
15. 写入 Audit 和 Trace。

创建阶段禁止：

1. 修改库存；
2. 写 `inventory_transactions`；
3. 修改海外仓库存；
4. 创建平台订单；
5. 创建补货计划。

## 2.2 Submit / Withdraw

提交使用 `CBR-005`，撤回使用 `CBR-006`。

设计要求：

1. 校验当前状态；
2. 校验 `versionNo`；
3. 校验明细完整性；
4. 校验用户权限；
5. 写状态历史；
6. 写 Audit；
7. 绑定 `request_trace_id`。

提交和撤回均不得修改库存。

## 2.3 Approve / Reject / Unapprove

审核使用 `CBR-007`，驳回使用 `CBR-008`，反审核使用 `CBR-009`。

设计要求：

1. 校验审核权限；
2. 执行制单与审核职责分离；
3. 校验当前状态和 `versionNo`；
4. 反审核仅允许未发运且无下游库存流水时执行；
5. 写状态历史；
6. 写 Audit；
7. 保留操作原因。

审核阶段禁止：

1. 修改库存；
2. 写库存流水；
3. 修改发货数量；
4. 修改海外实收数量。

## 2.4 Dispatch

确认发货使用 `CBR-012`。

确认发货是跨境发货唯一库存变化边界。

事务设计：

```text
BEGIN
1. 校验 Idempotency-Key
2. 锁定 cross_border_shipments
3. 校验状态、versionNo、权限、职责边界
4. 读取并校验 cross_border_shipment_items
5. 锁定来源仓 inventories
6. 锁定在途仓 inventories
7. 校验来源仓 available_quantity
8. 扣减来源仓库存
9. 增加在途仓库存
10. 追加库存流水
11. 更新发货明细累计发货数量
12. 更新 shipment_status
13. 写状态历史
14. 写 audit_logs
15. 绑定 request_trace_id
COMMIT
```

失败处理：

1. 任一步失败整体回滚；
2. 不允许来源仓扣减成功但在途仓增加失败；
3. 不允许只写库存流水不改余额；
4. 不允许只改余额不写库存流水；
5. 重复请求返回首次确认结果，不重复扣减。

禁止：

1. 确认发货直接增加海外仓库存；
2. 从来源仓直接转入海外仓；
3. 用平台订单或导入文件代替发货单；
4. 绕过 `inventories` 和 `inventory_transactions`。

## 2.5 Cancel / Void

取消使用 `CBR-010`，作废使用 `CBR-011`。

设计要求：

1. 仅允许未发运或无下游时执行；
2. 校验状态、版本和权限；
3. 保留原因；
4. 写状态历史和 Audit；
5. 不物理删除单据。

# 3. Overseas Inventory Import Flow

海外库存导入流程：

```text
Excel
↓
Upload
↓
Import Task
↓
Validation
↓
Mapping
↓
Execute
↓
Inventory Update
```

正式接口以 `IMP-*` 为准。本文中的 IMPORT 能力指已冻结的 Import Framework。

## 3.1 Upload

上传与创建导入任务使用 `IMP-001`。

设计要求：

1. 校验文件扩展名、MIME、大小和内容特征；
2. 校验模板版本；
3. 服务端计算 `file_checksum`；
4. 同一文件内容、导入类型和目标范围不得重复创建任务；
5. 仓库类导入必须指定 `warehouseId`；
6. 店铺类导入必须指定 `storeId`；
7. `warehouseId` 和 `storeId` 必须恰有一个非空；
8. 目标海外仓必须存在、启用且用户有 warehouse scope；
9. 文件本体保存到对象存储，数据库只保存文件引用；
10. 写 Import Task、Audit 和 Trace。

## 3.2 Validation

校验使用 `IMP-008` 至 `IMP-010`。

校验内容：

1. 表头、必填列和模板版本；
2. 数据类型、长度、日期、数量和金额；
3. SKU 是否存在且启用；
4. 目标海外仓是否存在、启用且授权；
5. 来源跨境发货单是否存在；
6. 来源发货明细是否存在；
7. SKU、批次、发货批次和导入行是否匹配；
8. 在途仓可核销数量是否充足；
9. 文件内重复行；
10. 已执行成功行不得重复执行；
11. 原始行敏感数据脱敏显示。

状态设计：

1. 任务状态只使用 `pending_validation`、`validation_failed`、`pending_confirmation`、`importing`、`partially_succeeded`、`succeeded`、`cancelled`、`duplicate_file`、`failed`；
2. 行校验状态只使用 `pending`、`valid`、`warning`、`invalid`；
3. 行执行状态只使用 `pending`、`processing`、`succeeded`、`failed`、`skipped`；
4. 匹配状态只使用 `pending`、`partially_matched`、`matched`。

禁止：

1. 将 `pending_upload` 写入数据库；
2. 自动创建缺失 SKU；
3. 自动创建缺失仓库；
4. 将未匹配或冲突行写入伪匹配记录；
5. 跳过阻断错误继续执行。

## 3.3 Mapping

来源匹配使用 `shipment_import_matches`。

设计要求：

1. 明细级匹配，不允许只按主单匹配；
2. SKU 必须匹配；
3. 批次必须匹配；
4. 导入实收数量不得超过导入行可匹配数量；
5. 匹配数量不得超过发货明细剩余可匹配数量；
6. 支持部分匹配；
7. 保留差异数量；
8. 记录匹配用户和匹配时间；
9. 匹配记录不得物理删除。

无法建立合法外键的未匹配或冲突行保留在 `import_task_items` 的错误信息中，不创建伪造 `shipment_import_matches`。

## 3.4 Execute

导入执行使用 `IMP-011`。

执行导入必须：

1. 使用 Idempotency-Key；
2. 校验任务状态为 `pending_confirmation`；
3. 校验无阻断 `invalid` 行；
4. 校验用户权限和目标范围；
5. 校验模板版本和文件摘要；
6. 绑定 Trace；
7. 写 Audit；
8. 在数据库事务内完成库存更新。

库存事务：

```text
BEGIN
1. 校验 Idempotency-Key
2. 锁定 import_tasks
3. 将任务置为 importing
4. 读取可执行 import_task_items
5. 校验并锁定来源在途仓 inventories
6. 校验并锁定目标海外仓 inventories
7. 写入 shipment_import_matches
8. 扣减在途仓库存
9. 增加海外仓库存
10. 追加 inventory_transactions
11. 更新导入行 execution_status
12. 汇总任务 successRows / failedRows / warningRows
13. 更新任务状态为 succeeded / partially_succeeded / failed
14. 写 audit_logs
15. 绑定 request_trace_id
COMMIT
```

失败处理：

1. 事务失败整体回滚；
2. 成功行不得重复执行；
3. 失败行可通过 `IMP-012` 重试；
4. 重试只处理失败行；
5. 不得复制成功结果；
6. 不得通过导入回滚删除已形成库存流水。

禁止：

1. 直接更新库存余额而不写流水；
2. 跳过在途仓直接增加海外仓；
3. 从来源仓直接增加海外仓；
4. 建立海外库存历史余额快照；
5. 手工修改海外实收结果；
6. 用导入文件原始行代替正式库存事实。

# 4. Database Mapping

## 4.1 Object Mapping

| 数据库对象 | 用途 | 实施判断 |
| --- | --- | --- |
| `cross_border_shipments` | 跨境发货主单 | 复用 |
| `cross_border_shipment_items` | 跨境发货明细 | 复用 |
| `warehouses` | 来源仓、在途仓、海外仓 | 复用 |
| `inventories` | 国内、在途、海外仓当前库存余额 | 复用 |
| `inventory_transactions` | 发货和导入形成的库存流水 | 复用 |
| `import_tasks` | Excel 导入任务 | 复用 |
| `import_task_items` | Excel 导入明细、校验和执行结果 | 复用 |
| `shipment_import_matches` | 发货明细与导入行匹配 | 复用 |
| `platforms` | Amazon、Temu 等平台主数据 | 复用 |
| `stores` | 平台店铺主数据 | 复用 |
| `audit_logs` | 跨境关键动作审计 | 复用 |
| `attachments` / `attachment_links` | 跨境发货和导入相关附件 | 复用 |

## 4.2 Inventory Mapping

库存模型：

1. 来源仓库存：`inventories` 中来源仓记录；
2. 在途库存：`inventories` 中 `warehouse_type = transit` 仓库记录；
3. 海外库存：`inventories` 中 `warehouse_type = overseas` 仓库记录；
4. 库存变化：`inventory_transactions`；
5. 来源追踪：库存流水 + 导入任务 + 导入明细 + 匹配记录。

边界：

1. 跨境发货只更新来源仓和在途仓；
2. 海外库存导入只更新在途仓和海外仓；
3. 平台 / 店铺视图只查询或聚合；
4. 补货建议只读取派生结果。

## 4.3 Status / Check Mapping

本设计不新增数据库状态值。

复用：

1. Cross-border Shipment 的既有 `status`、`approval_status`、`shipment_status`；
2. Import Task Status；
3. Import Item Validation Status；
4. Import Item Execution Status；
5. Shipment Import Match Status；
6. Warehouse Type；
7. Inventory Quantity Check。

不得新增 PostgreSQL Enum、字段级 Check、表、字段、索引或 Migration。

## 4.4 Database CR Judgment

Database CR：Not Required

原因：

1. Cross-border Shipment 已有主明细表；
2. Overseas Inventory 使用现有仓库和库存模型；
3. Import Framework 已有任务、明细和文件摘要去重能力；
4. 发货导入匹配已有 `shipment_import_matches`；
5. Platform / Store 主数据已存在；
6. Replenishment Suggestion 为只读派生建议；
7. 不新增独立平台订单、跨境订单、海外库存事实表或补货计划表。

后续若新增以下能力，必须先提交 Database CR：

1. 独立跨境采购订单；
2. 独立平台订单；
3. 平台 API 同步记录；
4. 海外库存历史快照；
5. 正式补货计划；
6. 报关、税费、物流费用或财务对象。

# 5. API Mapping

## 5.1 Cross-border Shipment APIs

| 页面 / 动作 | API | 权限 |
| --- | --- | --- |
| 发货列表 | `CBR-001` | `cross-border.shipment.read` |
| 发货详情 | `CBR-002` | `cross-border.shipment.read` |
| 创建发货 | `CBR-003` | `cross-border.shipment.create` |
| 编辑发货 | `CBR-004` | `cross-border.shipment.update` |
| 提交 | `CBR-005` | `cross-border.shipment.submit` |
| 撤回 | `CBR-006` | `cross-border.shipment.withdraw` |
| 审核 | `CBR-007` | `cross-border.shipment.approve` |
| 驳回 | `CBR-008` | `cross-border.shipment.reject` |
| 反审核 | `CBR-009` | `cross-border.shipment.unapprove` |
| 取消 | `CBR-010` | `cross-border.shipment.cancel` |
| 作废 | `CBR-011` | `cross-border.shipment.void` |
| 确认发货 | `CBR-012` | `cross-border.shipment.dispatch` |
| 状态历史 | `CBR-013` | `cross-border.shipment.read` |
| 发货库存流水 | `CBR-014` | `cross-border.shipment.read` |
| 导出 | `CBR-015` | `cross-border.shipment.export` |

## 5.2 Overseas Inventory APIs

| 页面 / 动作 | API | 权限 |
| --- | --- | --- |
| 海外仓库存汇总 | `CBR-016` | `cross-border.overseas-inventory.read` |
| 海外仓库存明细 | `CBR-017` | `cross-border.overseas-inventory.read` |
| 海外导入任务列表 | `CBR-018` | `cross-border.import-result.read` |
| 海外导入任务详情 | `CBR-019` | `cross-border.import-result.read` |
| 海外导入结果明细 | `CBR-020` | `cross-border.import-result.read` + `field.import-raw-data.read` |
| 发货导入匹配结果 | `CBR-021` | `cross-border.import-result.read` |
| 海外库存来源追溯 | `CBR-022` | `cross-border.source-trace.read` |

## 5.3 Import Framework APIs

正式导入接口为 `IMP-*`。

| 页面 / 动作 | API | 权限 |
| --- | --- | --- |
| 创建导入任务并上传 Excel | `IMP-001` | `import.task.create` |
| 导入任务列表 | `IMP-002` | `import.task.read` |
| 导入任务详情 | `IMP-003` | `import.task.read` |
| 导入任务状态 | `IMP-004` | `import.task.read` |
| 取消导入任务 | `IMP-005` | `import.task.cancel` |
| 获取导入模板 | `IMP-006` | `import.template.read` |
| 查询模板版本 | `IMP-007` | `import.template.read` |
| 校验模板兼容性 | `IMP-008` | `import.template.validate` |
| 启动导入校验 | `IMP-009` | `import.task.validate` |
| 查询校验结果 | `IMP-010` | `import.task.read` |
| 执行导入 | `IMP-011` | `import.task.execute` |
| 重试失败明细 | `IMP-012` | `import.task.execute` |
| 查询导入结果 | `IMP-013` | `import.task.read` |
| 导入历史查询 | `IMP-014` | `import.task.read` |
| 导出导入历史 / 结果 | `IMP-015` | `import.history.export` |

## 5.4 Inventory APIs

| 页面 / 动作 | API | 用途 |
| --- | --- | --- |
| 海外库存查询 | `INV-*` / `CBR-016` / `CBR-017` | 当前库存查询和跨境专用投影 |
| 库存流水查询 | `INV-*` / `CBR-014` | 发货、导入和来源追踪 |
| 平台 / 店铺维度统计 | `INV-*` 派生查询 | 只读统计 |

## 5.5 API CR Judgment

API CR：Not Required

原因：

1. 跨境发货已有 `CBR-001` 至 `CBR-015`；
2. 海外库存与导入结果查询已有 `CBR-016` 至 `CBR-022`；
3. Excel 导入已有 `IMP-001` 至 `IMP-015`；
4. 库存查询和流水可复用 `INV-*`；
5. 平台 / 店铺仅作为查询维度；
6. 补货建议为只读派生结果；
7. 不新增 API Path、DTO 字段、Response 字段、Error Code 或 Permission。

后续若新增以下能力，必须先提交 API CR：

1. Amazon / Temu API 同步；
2. 平台订单导入或管理；
3. 平台授权连接管理；
4. 正式补货计划；
5. 独立跨境采购订单。

# 6. Permission Design

## 6.1 Permission Mapping

| 能力 | 权限 |
| --- | --- |
| 跨境发货查询 | `cross-border.shipment.read` |
| 跨境发货创建 | `cross-border.shipment.create` |
| 跨境发货编辑 | `cross-border.shipment.update` |
| 跨境发货提交 | `cross-border.shipment.submit` |
| 跨境发货撤回 | `cross-border.shipment.withdraw` |
| 跨境发货审核 | `cross-border.shipment.approve` |
| 跨境发货驳回 | `cross-border.shipment.reject` |
| 跨境发货反审核 | `cross-border.shipment.unapprove` |
| 跨境发货取消 | `cross-border.shipment.cancel` |
| 跨境发货作废 | `cross-border.shipment.void` |
| 确认发货 | `cross-border.shipment.dispatch` |
| 跨境导出 | `cross-border.shipment.export` |
| 海外库存查询 | `cross-border.overseas-inventory.read` |
| 导入结果查询 | `cross-border.import-result.read` |
| 来源追踪 | `cross-border.source-trace.read` |
| 导入任务创建 / 校验 / 执行 | `import.task.*` |
| 导入模板 | `import.template.*` |
| 导入历史导出 | `import.history.export` |
| 库存查询 | `inventory.stock.read` |
| 库存流水查询 | `inventory.transaction.read` |
| 平台主数据 | `master.platform.*` |
| 店铺主数据 | `master.store.*` |
| 成本字段 | `field.cost.read` |
| 金额字段 | `field.amount.read` |
| 导入原始数据 | `field.import-raw-data.read` |

## 6.2 Warehouse Scope

跨境业务必须同时校验：

1. 来源仓 scope；
2. 在途仓 scope；
3. 目的海外仓 scope；
4. 导入目标海外仓 scope；
5. 库存查询海外仓 scope；
6. 跨境发货库存流水涉及仓库 scope。

无仓库范围时：

1. 列表查询前过滤；
2. 详情不可见资源返回 403 或 404；
3. 不得通过数量、统计、导出或错误信息泄露未授权仓库数据。

## 6.3 Store Scope

店铺范围用于：

1. 导入任务目标店铺；
2. 平台 / 店铺维度查询；
3. 平台销售数据展示；
4. 后续如有店铺级导入历史和报表。

MVP 不以店铺范围替代仓库范围。海外库存仍必须以海外仓范围作为库存查询和库存变化前置条件。

## 6.4 Permission CR Judgment

Permission CR：Not Required

原因：

1. 跨境发货权限已存在；
2. 海外库存、导入结果、来源追踪权限已存在；
3. Import Framework 权限已存在；
4. Platform / Store 主数据权限已存在；
5. warehouse scope 和 store scope 已存在；
6. MVP 不新增平台订单管理、补货计划或跨境采购订单权限。

后续若新增以下能力，必须先提交 Permission CR：

1. 平台订单管理；
2. 补货计划审批；
3. 平台授权连接管理；
4. 跨境费用、税费、利润或敏感销售字段；
5. 独立海外运营角色。

# 7. Page Design

## PC Admin

### Cross-border Shipment

页面：

1. 跨境发货列表；
2. 跨境发货详情；
3. 新建跨境发货；
4. 编辑跨境发货；
5. 发运确认；
6. 状态历史；
7. 库存流水；
8. 来源追踪入口。

列表能力：

1. 发货单号；
2. 发货批次号；
3. 来源仓；
4. 在途仓；
5. 目的海外仓；
6. SKU；
7. 目的国家；
8. 承运商；
9. 物流单号；
10. 发货状态；
11. 发运日期；
12. 是否逾期；
13. 是否存在差异。

状态操作：

1. 提交；
2. 撤回；
3. 审核；
4. 驳回；
5. 反审核；
6. 确认发货；
7. 取消；
8. 作废；
9. 导出。

### Overseas Inventory

页面：

1. 导入任务列表；
2. 新建导入任务；
3. 导入预检；
4. 导入结果；
5. 发货导入匹配；
6. 海外库存汇总；
7. 海外库存明细；
8. 海外库存来源追踪。

页面规则：

1. 导入文件失败行必须展示错误原因；
2. 部分成功必须展示成功、失败、警告数量；
3. 未匹配行不得静默忽略；
4. 原始导入数据按 `field.import-raw-data.read` 控制；
5. 海外库存只读；
6. 不显示手工修改库存入口。

### Platform

页面：

1. 平台库存视图；
2. 店铺库存视图；
3. 平台 / 店铺维度 SKU 库存；
4. 平台 / 店铺导入任务入口；
5. 平台 / 店铺来源追踪入口。

页面边界：

1. 平台和店铺为维度；
2. 不显示平台 API 同步配置；
3. 不显示平台 Token 管理；
4. 不显示独立平台订单列表；
5. 不提供平台订单直接扣减库存。

### Replenishment

页面：

1. 补货建议列表；
2. 低库存 SKU；
3. 零库存 SKU；
4. 在途库存参考；
5. 海外仓库存参考；
6. 平台 / 店铺筛选；
7. 导出或查看详情。

页面边界：

1. 只读；
2. 不创建采购订单；
3. 不创建生产任务；
4. 不创建跨境发货单；
5. 不持久化正式补货计划。

## 微信小程序

MVP 建议包含：

1. 海外库存查询；
2. 海外库存详情；
3. 跨境发货查询；
4. 跨境发货详情；
5. 发货状态查看；
6. 导入结果摘要查看。

微信小程序暂不包含：

1. 跨境发货创建；
2. 发运确认；
3. 导入文件上传；
4. 导入执行；
5. 补货计划操作；
6. 平台 API 管理。

# 8. Platform Capability Reuse

| 平台能力 | 复用设计 |
| --- | --- |
| Authentication | 所有页面和 API 必须基于认证用户上下文 |
| Authorization | 使用 RBAC、warehouse scope、store scope 和字段权限 |
| Attachment | 跨境发货资料、物流文件、导入源文件和错误报告复用附件框架 |
| Audit | 创建、编辑、提交、审核、发货、导入执行、匹配和导出均写审计 |
| Trace | HTTP、Import Task、Job、库存事务、Audit 均绑定 `request_trace_id` |
| Idempotency | 创建、发货确认、导入执行、失败行重试、导出等高风险动作防重 |
| Job | 导入校验、导入执行和大型导出可作为后台任务执行 |
| Event | 发货完成、导入完成、库存变化可发布事件；Event 不替代库存事实 |
| Import Framework | 统一处理 Excel 上传、校验、执行、结果和历史 |

边界：

1. Attachment 不保存库存事实；
2. Audit 不替代库存流水；
3. Trace 不改变业务事实；
4. Idempotency 不替代状态机；
5. Job 不替代 Import Task 状态；
6. Event 不替代 Cross-border Shipment、Import Task 或 Inventory Transaction。

# 9. Development Order

建议开发顺序：

1. Overseas Inventory Import
2. Cross-border Shipment
3. Platform View
4. Replenishment Suggestion

## 9.1 Overseas Inventory Import

优先原因：

1. 海外仓库存真实性依赖 Excel 导入；
2. 导入执行是海外仓库存形成的唯一边界；
3. 需要先验证 Import Framework、Idempotency、Job、Audit 和 Trace 在跨境场景中的复用；
4. 需要先打通 `shipment_import_matches` 与来源追踪。

验收重点：

1. 重复文件不重复执行；
2. 校验失败不形成库存；
3. 执行成功原子扣减在途仓并增加海外仓；
4. 成功行不得重复执行；
5. 来源可追踪。

## 9.2 Cross-border Shipment

第二优先原因：

1. 跨境发货是国内库存进入在途仓的正式上游；
2. 需要复用 Module 3 库存事务、防负库存和幂等能力；
3. 与海外库存导入形成完整链路。

验收重点：

1. 创建和审核不修改库存；
2. 仅确认发货修改库存；
3. 来源仓扣减与在途仓增加同成同败；
4. 不直接增加海外仓库存；
5. 发货流水可追踪。

## 9.3 Platform View

第三优先原因：

1. Platform / Store 主数据已完成；
2. 可在库存和导入结果稳定后提供平台 / 店铺维度展示；
3. 避免过早引入外部平台 API。

验收重点：

1. 平台 / 店铺仅作为查询维度；
2. 无店铺权限不可见；
3. 不出现平台订单事实表；
4. 不提供平台 API 同步入口。

## 9.4 Replenishment Suggestion

第四优先原因：

1. 依赖海外仓库存、在途库存和平台 / 店铺维度数据；
2. 必须在库存链路稳定后生成建议；
3. MVP 只读即可满足基础管理价值。

验收重点：

1. 建议只读；
2. 不自动创建业务单据；
3. 不持久化正式补货计划；
4. 不作为库存事实来源。

# 10. Acceptance Criteria

## Overseas Inventory Import

完成标准：

1. Excel 上传创建 Import Task；
2. 重复文件、导入类型和目标范围被识别；
3. 校验覆盖模板、SKU、海外仓、来源跨境发货和在途库存；
4. 校验失败行不能执行；
5. 执行导入原子扣减在途仓并增加海外仓；
6. 每次库存变化生成 `inventory_transactions`；
7. 生成或更新 `shipment_import_matches`；
8. 导入任务状态、行状态和统计准确；
9. 重复执行不会重复增加库存；
10. Audit、Trace 和权限校验完整。

## Cross-border Shipment

完成标准：

1. 可查询跨境发货列表和详情；
2. 可创建、编辑、提交、审核、驳回、反审核、取消、作废；
3. 创建和审核不修改库存；
4. 确认发货才修改库存；
5. 确认发货原子扣减来源仓并增加在途仓；
6. 防止负库存；
7. 重复确认不重复扣减；
8. 状态历史和 Audit 完整；
9. 库存流水可追踪；
10. 不直接增加海外仓库存。

## Platform / Store View

完成标准：

1. 可按平台、店铺、SKU 和海外仓查看库存；
2. 平台 / 店铺权限正确；
3. 无权限数据不可见；
4. 不新增平台订单；
5. 不接入外部平台 API；
6. 不产生库存写操作。

## Replenishment Suggestion

完成标准：

1. 可展示低库存、零库存和待补货候选；
2. 建议基于正式库存和流水派生；
3. 建议只读；
4. 不创建采购、生产或跨境单据；
5. 不新增补货计划表；
6. 权限和仓库范围正确。

# 11. Risk Analysis

| 风险 | 影响 | 设计约束 |
| --- | --- | --- |
| Excel 格式变化 | 导入失败、字段错配、错误库存结果 | 模板版本、列校验、行级错误、任务状态和错误下载必须完整 |
| 海外库存真实性 | 海外仓库存可能滞后或与平台实际不一致 | 页面标识导入批次和数据来源，海外库存不宣称实时同步 |
| 平台数据同步 | Amazon / Temu API 权限、速率和字段变化可能影响稳定性 | MVP 不接平台 API；如接入先提交 Architecture Decision 和 API CR |
| 库存边界混淆 | 国内、在途、海外仓库存共享模型，可能查询或扣减错误 | 所有查询和写操作必须校验 `warehouse_type`、warehouse scope 和来源类型 |
| 重复导入 | 重复文件或重试可能重复增加海外库存 | 使用 `file_checksum`、目标范围唯一约束、Idempotency 和导入状态机 |
| 发货重复确认 | 网络重试可能重复扣减来源仓 | 使用 Idempotency-Key、版本校验、状态校验和事务锁 |
| 来源匹配不准确 | 在途库存核销错误，海外库存来源不可追踪 | 明细级 `shipment_import_matches`，无法匹配行不得静默执行 |
| 权限泄露 | 未授权用户可能看到海外仓、成本或原始导入数据 | RBAC、warehouse scope、store scope 和字段权限必须在服务端执行 |
| 补货建议误导 | 派生建议可能被误认为正式计划 | MVP 页面明确只读，不生成业务单据，不保存计划事实 |

总体结论：

Task 8-D1 Cross-border Business Implementation Design 可以在现有 Database SSOT、API SSOT 和 Permission SSOT 范围内成立。

Change Impact：

| 类型 | 判断 | 说明 |
| --- | --- | --- |
| Database CR | Not Required | 复用既有跨境、导入、库存、平台、店铺和审计对象 |
| API CR | Not Required | 复用 `CBR-*`、`IMP-*`、`INV-*` 既有接口 |
| Permission CR | Not Required | 复用 cross-border、import、inventory、platform、store、warehouse scope 和字段权限 |

Implementation Recommendation：

可以进入跨境业务开发阶段。开发时必须坚持：

1. 确认发货才修改库存；
2. 跨境发货只从来源仓进入在途仓；
3. 海外库存只能由正式 Excel 导入执行形成；
4. 所有库存变化必须写 `inventory_transactions`；
5. 平台 / 店铺只作为维度，不作为库存事实；
6. 补货建议只读，不生成正式业务单据；
7. 如需平台 API、平台订单或正式补货计划，必须先走 CR。
