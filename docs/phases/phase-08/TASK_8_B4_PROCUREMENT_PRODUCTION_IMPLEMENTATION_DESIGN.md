---
document_name: Task 8-B4-A Procurement & Production Implementation Design
project: Violin ERP Lite
version: 1.0
status: Completed / Pending Review
owner: Project Manager
created_date: 2026-07-26
updated_date: 2026-07-26
related_phase: Phase 8
---

# Task 8-B4-A：Procurement & Production Implementation Design

## 1. Module 2 Business Scope

Module 2 采购与生产基础闭环基于已完成的 Module 1 Master Data Center 和 Phase 7 Frozen Platform Foundation，实现采购、委外生产、质量验收和入库准备的 MVP 闭环。

本设计不新增 Database Schema，不新增 Migration，不修改 API Spec，不新增 Permission Code，不修改业务规则。

### 1.1 Procurement

MVP 实现：

1. 采购订单；
2. 采购明细；
3. 采购执行；
4. 采购付款辅助记录。

采购需求不作为独立业务对象。库存预警、人工采购判断或 Dashboard 待办可以引导创建采购订单，但不得新增 `purchase_requests`、`procurement_requests` 或平行需求数据源。

采购订单只管理采购业务事实，不生成生产任务，不要求生产任务关联采购订单。

### 1.2 Production

MVP 实现：

1. 生产任务；
2. 生产明细；
3. 生产进度；
4. 分批完工。

生产任务独立创建，仅关联生产厂家、SKU、计划数量、计划日期、金额和说明等正式字段。生产任务不保存目标仓库；目标仓库只在分批完工或后续入库阶段确定。

### 1.3 Quality

MVP 实现：

1. 采购来源验收；
2. 生产来源验收。

质量验收共用 `inspection_orders` 与 `inspection_order_items`。一张验收单只能选择 `purchase` 或 `production` 其中一种来源，来源互斥。验收确认只形成入库资格，不直接修改库存。

### 1.4 Inbound

MVP 实现：

1. 入库准备；
2. 正式入库。

入库准备承接已确认的采购来源或生产来源验收结果。正式入库确认是库存变化边界，必须原子更新 `inventories` 并追加 `inventory_transactions`。

## 2. Process Design

### 2.1 Purchase Flow

```text
创建采购订单
  ↓
提交采购订单
  ↓
单级审核
  ↓
采购执行 / 采购进度跟踪
  ↓
采购来源质量验收
  ↓
采购来源入库准备
  ↓
确认入库
  ↓
inventory_transactions
```

#### 2.1.1 创建

创建采购订单时选择已启用供应商和 SKU，录入采购数量、单价、交期、备注和明细。服务端校验：

1. 供应商存在且启用；
2. SKU 存在且启用；
3. 数量大于 0；
4. 金额非负且由服务端计算或复核；
5. 币种遵守单币种人民币规则；
6. 用户具备 `purchase.order.create`；
7. 写操作使用 `Idempotency-Key`。

成功后创建 `purchase_orders` 与 `purchase_order_items`，状态为既有草稿类状态，不修改库存。

#### 2.1.2 提交

提交采购订单时校验当前状态、明细完整性、版本号、提交权限和幂等键。提交成功后进入既有待审核状态，并记录状态历史和 Audit。

#### 2.1.3 审核

审核采用单级审核。审核通过或驳回必须校验：

1. 当前状态为待审核；
2. 用户具备对应审核权限；
3. 同一用户不得审批自己创建的单据；
4. 记录版本未发生冲突。

审核通过后采购订单进入既有已审核状态。审核动作不修改库存。

#### 2.1.4 执行

采购执行通过采购进度查询展示付款、验收、入库、退货和状态历史。采购执行本身不新增独立执行表，不通过页面缓存保存平行进度事实。

采购付款辅助记录写入 `purchase_payments`，用于记录付款金额、日期、方式、凭证和结算状态，但不替代财务软件，不决定采购完成状态。

#### 2.1.5 验收

采购来源验收创建 `sourceType = purchase` 的验收单，来源为已审核且仍有可验收数量的采购订单或明细。确认验收只形成入库资格，不增加 `inventories`。

#### 2.1.6 入库

采购来源入库使用合格验收结果创建 `inbound_orders` 和 `inbound_order_items`。确认入库时，库存更新和流水追加必须在同一事务完成；任一步失败均整体回滚。

### 2.2 Production Flow

```text
创建生产任务
  ↓
提交生产任务
  ↓
单级审核
  ↓
开始生产
  ↓
登记生产进度
  ↓
分批完工
  ↓
生产来源质量验收
  ↓
生产来源入库准备
  ↓
确认入库
  ↓
inventory_transactions
```

#### 2.2.1 创建

创建生产任务时选择已启用生产厂家和 SKU，录入计划数量、计划日期、加工价格和备注。服务端校验：

1. 生产厂家存在且启用；
2. SKU 存在且启用；
3. 数量大于 0；
4. 金额非负；
5. 用户具备 `production.order.create`；
6. 写操作使用 `Idempotency-Key`。

生产任务不得读取、保存或展示采购订单 ID。

#### 2.2.2 提交与审核

提交、撤回、审核、驳回、反审核使用既有生产状态动作。审核采用单级审核，必须执行职责分离和版本校验。审核通过不修改库存。

#### 2.2.3 生产中

开始生产后记录状态变化。生产中状态用于表达执行阶段，不代表完工、验收或入库。

#### 2.2.4 进度记录

生产进度写入 `production_progress_records`，用于记录日期、进度百分比、完成数量、说明和附件。进度记录是过程事实，不替代分批完工、验收、入库或库存流水。

#### 2.2.5 分批完工

分批完工写入 `production_completion_records` 和明细，记录完工批次、完工数量、目标仓相关选择和说明。完工记录支持确认、撤销和作废；确认后如已有验收、入库、发货或库存流水等下游事实，则不得撤销。

#### 2.2.6 验收与入库

生产来源验收创建 `sourceType = production` 的验收单。验收确认后，合格数量可创建生产来源入库单。正式入库确认才修改库存。

### 2.3 Inspection Flow

验收来源只能是：

1. `purchase`；
2. `production`。

一张验收单必须且只能具有一种来源。服务端必须校验：

1. `sourceType` 与来源 ID 一致；
2. 采购来源和生产来源互斥；
3. 来源单据状态合法；
4. 可验收数量未超限；
5. 验收仓库或厂家范围合法；
6. 验收人员具备 `inspection.order.*` 相关权限；
7. 合格数量 + 不合格数量 + 待处理数量与验收数量保持平衡。

验收状态操作：

```text
创建验收单
  ↓
提交验收
  ↓
确认验收
  ↓
可入库合格数量
```

撤销或作废验收必须确保不存在已确认入库等下游事实。

### 2.4 Inbound Flow

```text
验收合格
  ↓
入库准备
  ↓
创建入库单
  ↓
提交 / 审核
  ↓
确认入库
  ↓
更新 inventories
  ↓
追加 inventory_transactions
```

入库必须选择 Approved 合法来源。采购入库和生产入库分别使用对应验收资格，同一来源累计入库数量不得超过合法可入库数量。

确认入库必须满足：

1. 入库单已处于允许确认状态；
2. 目标仓库存在、启用且在用户授权范围内；
3. SKU 有效；
4. 入库数量大于 0；
5. 来源验收仍有效；
6. 幂等键未重复产生不同请求结果；
7. 库存余额更新、来源累计更新、库存流水追加和审计写入在事务中完成。

确认入库失败时，库存余额、库存流水、来源累计和入库状态必须保持不变。

## 3. Page Design

### 3.1 PC Admin

#### 3.1.1 采购页面

PC Admin 采购页面包含：

1. 采购订单列表；
2. 采购订单详情；
3. 创建采购订单；
4. 编辑采购订单；
5. 提交、撤回、审核、驳回、反审核、取消、作废；
6. 采购执行跟踪；
7. 采购付款辅助记录；
8. 关联验收、关联入库和状态历史。

列表展示单号、供应商、状态、审核状态、总数量、金额、交期、创建人和更新时间。金额字段按 `field.amount.read` 控制。

详情页展示基础信息、明细、付款、验收、入库、状态历史、附件和审计摘要。无权限字段必须脱敏或隐藏。

#### 3.1.2 生产页面

PC Admin 生产页面包含：

1. 生产任务列表；
2. 生产任务详情；
3. 创建生产任务；
4. 编辑生产任务；
5. 提交、撤回、审核、驳回、反审核、开始生产、取消、作废；
6. 生产进度管理；
7. 分批完工管理；
8. 关联验收、关联入库和状态历史。

生产详情不得展示采购订单关联区域。目标仓库不得出现在生产任务主表编辑区，只能在分批完工或入库阶段出现。

#### 3.1.3 质检页面

PC Admin 质检页面包含：

1. 验收列表；
2. 验收详情；
3. 创建采购来源验收；
4. 创建生产来源验收；
5. 编辑验收单；
6. 提交验收；
7. 确认验收；
8. 撤销或作废；
9. 验收历史和附件。

页面必须明确展示来源类型，不允许同一表单同时选择采购来源和生产来源。

#### 3.1.4 入库页面

PC Admin 入库页面包含：

1. 入库列表；
2. 入库详情；
3. 采购来源入库准备；
4. 生产来源入库准备；
5. 创建入库单；
6. 编辑入库单；
7. 提交、审核、驳回、反审核、取消；
8. 确认入库；
9. 入库冲销；
10. 入库流水追溯。

确认入库必须二次确认，并展示目标仓库、SKU、数量、来源验收和即将产生的库存影响摘要。

### 3.2 微信小程序

微信小程序 MVP 规划：

1. 采购查询；
2. 采购详情；
3. 生产任务查询；
4. 生产进度查询；
5. 验收查询；
6. 待验收操作；
7. 入库查询；
8. 待入库确认。

移动端优先承载查询、待办、审批和轻量操作。复杂明细编辑、批量导入、导出和数据清理优先保留在 PC Admin。

## 4. API Usage

### 4.1 Procurement API

| 页面 / 操作 | API | 权限 |
| --- | --- | --- |
| 采购订单列表 | `PUR-001` | `purchase.order.read` |
| 采购订单详情 | `PUR-002` | `purchase.order.read`、金额字段权限 |
| 创建采购订单 | `PUR-003` | `purchase.order.create` |
| 编辑采购订单 | `PUR-004` | `purchase.order.update` |
| 提交采购订单 | `PUR-005` | `purchase.order.submit` |
| 撤回采购订单 | `PUR-006` | `purchase.order.withdraw` |
| 审核通过 | `PUR-007` | `purchase.order.approve` |
| 审核驳回 | `PUR-008` | `purchase.order.reject` |
| 反审核 | `PUR-009` | `purchase.order.unapprove` |
| 取消 | `PUR-010` | `purchase.order.cancel` |
| 作废 | `PUR-011` | `purchase.order.void` |
| 采购进度 | `PUR-012` | `purchase.order.read` |
| 关联验收 | `PUR-013` | `purchase.order.read`、`inspection.order.read` |
| 关联入库 | `PUR-014` | `purchase.order.read`、`inbound.order.read` |
| 状态时间线 | `PUR-015` | `purchase.order.read` |
| 导出采购单 | `PUR-016` | `purchase.order.export` |
| 采购付款 | `PUR-017`—`PUR-019` | `purchase.payment.read/create`、金额及敏感字段权限 |

### 4.2 Production API

| 页面 / 操作 | API | 权限 |
| --- | --- | --- |
| 生产任务列表 | `PRO-001` | `production.order.read` |
| 生产任务详情 | `PRO-002` | `production.order.read`、厂家范围 |
| 创建生产任务 | `PRO-003` | `production.order.create` |
| 编辑生产任务 | `PRO-004` | `production.order.update` |
| 提交生产任务 | `PRO-005` | `production.order.submit` |
| 撤回生产任务 | `PRO-006` | `production.order.withdraw` |
| 审核通过 | `PRO-007` | `production.order.approve` |
| 审核驳回 | `PRO-008` | `production.order.reject` |
| 反审核 | `PRO-009` | `production.order.unapprove` |
| 开始生产 | `PRO-010` | `production.order.start` |
| 取消 / 作废 | `PRO-011`、`PRO-012` | `production.order.cancel/void` |
| 生产进度查询 / 登记 | `PRO-018`—`PRO-020` | `production.progress.read/create` |
| 分批完工 | `PRO-021`—`PRO-022`、`PRO-026`—`PRO-029` | `production.completion.*` |
| 生产付款 | `PRO-023`—`PRO-025` | `production.payment.read/create` |

### 4.3 Inspection API

| 页面 / 操作 | API | 权限 |
| --- | --- | --- |
| 验收列表 | `INS-001` | `inspection.order.read` |
| 验收详情 | `INS-002` | `inspection.order.read` |
| 创建验收 | `INS-003` | `inspection.order.create` |
| 编辑验收 | `INS-004` | `inspection.order.update` |
| 提交验收 | `INS-005` | `inspection.order.submit` |
| 确认验收 | `INS-006` | `inspection.order.confirm` |
| 撤销确认 | `INS-007` | `inspection.order.revoke` |
| 作废验收 | `INS-008` | `inspection.order.void` |
| 验收历史 | `INS-009` | `inspection.order.read` |
| 导出验收 | `INS-010` | `inspection.order.export` |

### 4.4 Inbound API

| 页面 / 操作 | API | 权限 |
| --- | --- | --- |
| 入库列表 | `INB-001` | `inbound.order.read` |
| 入库详情 | `INB-002` | `inbound.order.read`、仓库范围 |
| 创建采购来源入库 | `INB-003` | `inbound.order.create-purchase` |
| 创建生产来源入库 | `INB-004` | `inbound.order.create-production` |
| 创建其他入库 | `INB-005` | `inbound.order.create-other` |
| 编辑入库 | `INB-006` | `inbound.order.update` |
| 提交 / 撤回 | `INB-007`、`INB-008` | `inbound.order.submit/withdraw` |
| 审核 / 驳回 / 反审核 | `INB-009`—`INB-011` | `inbound.order.approve/reject/unapprove` |
| 取消 | `INB-012` | `inbound.order.cancel` |
| 确认入库 | `INB-013` | `inbound.order.confirm` |
| 入库冲销 | `INB-014` | `inbound.order.reverse` |
| 入库历史 / 导出 | `INB-015`—`INB-018` | `inbound.order.read/export` |

### 4.5 API 边界

本设计禁止新增 API。若后续实现发现以下需求，必须停止并提交 API CR：

1. 独立采购需求 API；
2. 采购转生产 API；
3. 独立生产异常 API；
4. 独立质检照片或质检档案 API；
5. 未登记的新入库来源 API；
6. 新 DTO 字段、新 Response 字段或新 Error Code。

## 5. Database Mapping

### 5.1 正式对象映射

| 设计对象 | Database Object |
| --- | --- |
| 采购订单 | `purchase_orders` |
| 采购明细 | `purchase_order_items` |
| 采购付款辅助记录 | `purchase_payments` |
| 生产任务 | `production_orders` |
| 生产明细 | `production_order_items` |
| 生产进度 | `production_progress_records` |
| 分批完工 | `production_completion_records`、`production_completion_record_items` |
| 质量验收 | `inspection_orders` |
| 质检明细 | `inspection_order_items` |
| 入库单 | `inbound_orders` |
| 入库明细 | `inbound_order_items` |
| 当前库存 | `inventories` |
| 库存流水 | `inventory_transactions` |
| 状态历史 | `document_status_histories` |
| 审批记录 | `approval_records` |
| 审计 | `audit_logs` |
| 附件 | `attachments`、`attachment_links` |

### 5.2 禁止新增业务表

本设计不新增以下对象：

1. 采购需求表；
2. 采购执行表；
3. 采购转生产关系表；
4. 生产异常表；
5. 独立质检档案表；
6. 入库准备临时表；
7. 平行库存余额表；
8. 平行库存流水表。

### 5.3 库存写入边界

只有确认入库可在本模块中改变库存：

1. 更新 `inventories`；
2. 追加 `inventory_transactions`；
3. 更新入库单状态；
4. 更新来源累计；
5. 写入审计。

这些操作必须在数据库事务中完成，不允许部分成功。

## 6. Platform Capability Reuse

### 6.1 Attachment

复用 Attachment Framework：

1. 采购合同和采购付款凭证；
2. 生产资料和进度附件；
3. 验收图片或验收说明附件；
4. 入库凭证或仓库交接附件。

附件只保存业务资料，不改变采购、生产、验收或入库状态。

### 6.2 Audit

必须记录：

1. 创建；
2. 编辑；
3. 提交；
4. 审核通过；
5. 审核驳回；
6. 反审核；
7. 开始生产；
8. 登记进度；
9. 确认完工；
10. 确认验收；
11. 确认入库；
12. 入库冲销；
13. 作废；
14. 敏感字段读取。

`audit_logs` 是正式审计事实来源。Application Log、Event History、Job Attempt 不得替代 Audit。

### 6.3 Trace

所有 HTTP 请求、Service、Repository、Audit、Event 和 Job 应贯通 `request_trace_id`。Trace 只用于关联排查，不改变业务事实。

### 6.4 Idempotency

以下动作必须使用幂等能力：

1. 创建采购订单；
2. 提交、审核、反审核、取消、作废；
3. 创建采购付款记录；
4. 创建生产任务；
5. 开始生产；
6. 登记生产进度；
7. 创建或确认分批完工；
8. 创建和确认验收；
9. 创建和确认入库；
10. 入库冲销；
11. 导出或异步任务触发。

幂等不得替代业务状态校验、数据库事务或库存并发控制。

### 6.5 Job

Job 可用于导出、批量处理、未来导入或长耗时任务。Job 不替代采购、生产、验收、入库或库存状态。

第一阶段实现可不依赖 Job；如涉及导出或批量任务，应复用 Task 7.6 Background Job Foundation。

### 6.6 Event

Event 可用于业务状态通知、缓存失效、下游提醒或异步审计增强。Event 不替代业务事实表、库存流水或审计事实。

建议后续事件方向：

1. `purchase.order.approved`；
2. `production.order.started`；
3. `inspection.order.confirmed`；
4. `inbound.order.confirmed`。

事件发布失败不得导致已提交的业务事务被平行改写；需按 Task 7.7 Outbox 机制处理。

## 7. Permission Design

### 7.1 复用权限

本设计复用：

1. `purchase.order.*`；
2. `purchase.payment.*`；
3. `purchase.return.*`；
4. `production.order.*`；
5. `production.progress.*`；
6. `production.completion.*`；
7. `production.payment.*`；
8. `inspection.order.*`；
9. `inbound.order.*`；
10. `inventory.stock.*`；
11. `inventory.transaction.*`；
12. `field.amount.read`；
13. `field.cost.read`；
14. `field.supplier-sensitive.read`；
15. `field.manufacturer-sensitive.read`。

无需新增 Permission Code。

### 7.2 Data Scope

后端必须执行：

1. 仓库范围；
2. 店铺范围；
3. 厂家派生范围；
4. 业务记录范围；
5. 金额字段权限；
6. 成本字段权限；
7. 供应商和厂家敏感字段权限。

前端隐藏按钮不替代后端权限与数据范围校验。

### 7.3 职责分离

单级审核必须执行职责分离：

1. 同一用户不得审核自己创建的采购订单；
2. 同一用户不得审核自己创建的生产任务；
3. 同一用户不得审核自己创建的入库单；
4. 质量验收不新增独立质检角色，但必须具备对应验收权限和来源范围。

## 8. Development Order

建议开发顺序：

1. Purchase Order；
2. Production Order；
3. Inspection；
4. Inbound。

### 8.1 Purchase Order First

原因：

1. 采购是直接采购业务入口；
2. 采购验收和采购入库依赖采购来源；
3. 采购付款辅助记录可验证金额字段和敏感字段权限；
4. 采购订单可复用通用单据状态、审批、审计、幂等和附件模式。

### 8.2 Production Order Second

原因：

1. 生产与采购平行，但生产验收依赖生产来源；
2. 生产进度和分批完工是后续质量验收的重要来源；
3. 生产先完成后可统一验收逻辑。

### 8.3 Inspection Third

原因：

1. 验收统一承接采购来源和生产来源；
2. 必须验证来源互斥、数量分层和合格数量规则；
3. 验收确认是入库资格来源。

### 8.4 Inbound Fourth

原因：

1. 入库依赖已确认验收；
2. 入库确认是库存变化边界；
3. 需要在采购、生产、验收能力稳定后实现库存事务闭环。

## 9. Acceptance Criteria

### 9.1 采购验收标准

采购闭环满足：

```text
订单 → 执行 → 验收 → 入库
```

验收标准：

1. 可创建、编辑、提交、审核、驳回、撤回、反审核、取消、作废采购订单；
2. 采购明细可引用已启用 SKU；
3. 采购付款辅助记录可创建并保留事实；
4. 采购来源验收可创建、提交、确认；
5. 采购验收合格数量可进入入库；
6. 采购订单和采购付款不直接修改库存。

### 9.2 生产验收标准

生产闭环满足：

```text
任务 → 进度 → 完工 → 验收 → 入库
```

验收标准：

1. 可创建、编辑、提交、审核、驳回、撤回、反审核、开始、取消、作废生产任务；
2. 生产任务不关联采购订单；
3. 可登记生产进度；
4. 可创建并确认分批完工；
5. 分批完工可作为生产来源验收依据；
6. 生产来源验收可创建、提交、确认；
7. 生产验收合格数量可进入入库；
8. 生产任务、进度和完工不直接修改库存。

### 9.3 库存验收标准

库存闭环满足：

1. 只有入库确认改变库存；
2. 入库确认原子更新 `inventories`；
3. 入库确认追加 `inventory_transactions`；
4. 重复确认不得产生重复库存流水；
5. 任一步失败整体回滚；
6. 库存流水可追溯到入库单和来源验收；
7. 页面不得直接编辑库存余额。

### 9.4 平台能力验收标准

1. 所有写操作具备权限校验；
2. 关键状态动作具备幂等保护；
3. 关键操作写入 Audit；
4. 请求链路贯通 Trace；
5. 附件关联遵守 Attachment Framework；
6. Event 与 Job 仅作为平台辅助能力，不替代业务事实。

## 10. Risk Analysis

### 10.1 厂家生产数据真实性

风险：

1. 生产进度可能由人工录入，真实性依赖业务执行；
2. 分批完工时间和数量可能滞后；
3. 目标仓选择错误会影响后续入库。

控制：

1. 生产进度只作为过程记录；
2. 分批完工与验收、入库分层记录；
3. 入库前重新校验目标仓、SKU 和来源数量。

### 10.2 质检责任

风险：

1. 未设置独立质检角色可能导致职责边界不清；
2. 不合格处理方式需要业务统一；
3. 简化质检记录可能不足以覆盖复杂质量争议。

控制：

1. 严格复用 `inspection.order.*`；
2. 执行验收人、时间、结果、原因和处理方式审计；
3. 复杂质检档案不进入 MVP，后续单独评估。

### 10.3 入库准确性

风险：

1. 验收和入库边界混淆会导致库存提前增加；
2. 重复确认可能产生重复库存流水；
3. 并发入库可能造成来源累计超限。

控制：

1. 验收确认不改库存；
2. 入库确认必须幂等；
3. 入库确认必须事务化；
4. 来源累计和库存流水必须同步校验。

### 10.4 历史数据迁移

风险：

1. 历史 Excel 中未完成采购或生产状态不一致；
2. 历史供应商、厂家、SKU 编码与主数据不一致；
3. 历史库存流水不完整。

控制：

1. 先迁移主数据和期初库存；
2. 仅迁移必要未完成业务数据；
3. 不导入全部历史库存流水；
4. 迁移前建立 Excel 字段映射和校验报告。

## 11. Change Impact Summary

| Impact Area | Decision | Reason |
| --- | --- | --- |
| Database Schema | Not Changed | 复用现有业务表，不新增业务表。 |
| Migration | Not Required | 不修改 Prisma Schema，不创建 Migration。 |
| API Spec | Not Changed | 复用 `PUR-*`、`PRO-*`、`INS-*`、`INB-*`。 |
| Permission Spec | Not Changed | 复用既有 `purchase.*`、`production.*`、`inspection.*`、`inbound.*`、`inventory.*`。 |
| Business Rules | Not Changed | 遵守 Frozen `BUSINESS_RULES.md`。 |

## 12. Next Step

建议在本设计获得项目负责人批准后进入：

**8-B4-B Purchase Order Implementation**

后续任何实现中如发现现有数据库、API、权限或业务规则不足，必须立即停止并提交对应 CR，不得通过代码临时扩展。
