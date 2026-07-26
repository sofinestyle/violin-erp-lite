# Task 8-C Inventory Management Impact Review

项目：Violin ERP Lite  
阶段：Phase 8 Application Development  
任务：Phase 8-C Module 3 Inventory Management Impact Review  
状态：Completed / Pending Approval  
创建日期：2026-07-26  
文档类型：Impact Review  

---

## 1. Inventory Business Scope

Module 3 Inventory Management 的 MVP 目标是在已完成的 Module 1 基础资料中心和 Module 2 采购生产闭环之上，建设库存查询、库存流水、出库和基础库存统计能力。

本模块继续遵守 Frozen 业务规则：

1. 库存余额唯一事实来源为 `inventories`；
2. 库存变化历史唯一事实来源为 `inventory_transactions`；
3. 采购、生产、验收、Event、Job、Cache 均不得直接修改库存；
4. 库存增加或减少必须由正式业务单据触发；
5. 所有库存变化必须生成库存流水；
6. 禁止负库存；
7. 普通用户不得直接修改库存余额。

### Inventory Query

MVP 包含：

1. 当前库存查询；
2. SKU 库存查询；
3. 仓库库存查询；
4. 可用库存查询；
5. 库存详情；
6. 厂家仓、公司仓、海外仓、在途仓和待处理仓等已批准仓库类型的受控筛选或汇总。

库存查询只读取正式库存余额，不保存额外汇总表，不建立平行库存数据源。

### Inventory Transaction

MVP 包含：

1. 入库流水查询；
2. 出库流水查询；
3. 调整流水查询；
4. 来源单据追溯；
5. SKU / 仓库 / 日期 / 来源类型筛选。

库存流水只追加，不提供手工新增、普通编辑或删除入口。

### Outbound

MVP 包含：

1. 出库单；
2. 出库明细；
3. 提交；
4. 审核；
5. 驳回；
6. 撤回；
7. 反审核；
8. 取消；
9. 确认出库；
10. 出库冲销；
11. 出库附件；
12. 出库库存流水追溯。

确认出库是本模块核心库存扣减动作，必须在同一数据库事务内完成：

1. 校验出库单状态、版本、权限和仓库范围；
2. 校验 SKU 与可用库存；
3. 条件更新 `inventories`；
4. 追加 `inventory_transactions`；
5. 更新出库单状态；
6. 写入 `audit_logs`；
7. 绑定 `request_trace_id`；
8. 受 `Idempotency-Key` 保护。

### Inventory Statistics

MVP 包含：

1. SKU 库存汇总；
2. 仓库库存汇总；
3. 授权仓库范围内的库存概览；
4. 基于当前库存和流水的实时统计。

库存统计仅作为查询聚合或页面展示结果，不新增统计事实表，不替代 `inventories` 或 `inventory_transactions`。

---

## 2. Inventory Fact Boundary

库存事实边界如下：

| 对象 | 是否库存事实来源 | 说明 |
| --- | --- | --- |
| `inventories` | 是 | 当前库存余额唯一事实来源，粒度为 SKU + 仓库 |
| `inventory_transactions` | 是 | 库存变化历史唯一事实来源，只追加 |
| Purchase | 否 | 采购订单只形成采购业务事实，不修改库存 |
| Production | 否 | 生产任务、进度和完工只形成生产事实，不修改库存 |
| Inspection | 否 | 质量验收只形成入库资格，不修改库存 |
| Inbound | 是，限确认入库动作 | 确认入库原子增加库存并追加流水 |
| Outbound | 是，限确认出库动作 | 确认出库原子扣减库存并追加流水 |
| Inventory Adjustment | 是，限执行调整动作 | 审核后的正式调整动作可原子更新库存并追加流水 |
| Event | 否 | Event 只做通知和订阅，不裁决库存余额 |
| Job | 否 | Job 只执行后台任务，不替代业务单据或库存流水 |
| Cache | 否 | Cache 只可缓存派生查询结果，不作为库存事实 |

边界确认：

1. Purchase、Production、Inspection 不得直接写 `inventories`；
2. Event 不得替代 `inventory_transactions`；
3. Job Queue 不得作为库存变动事实来源；
4. Cache 不得成为库存余额、状态或审计事实来源；
5. 出库确认、入库确认、库存调整执行必须以正式单据为来源；
6. 任何库存扣减必须防止负库存；
7. 任何库存事务不得只改余额不写流水，也不得只写流水不改余额。

---

## 3. Database Impact Analysis

### Existing Database Objects

MVP 复用以下既有数据库对象：

| 对象 | 用途 | 影响判断 |
| --- | --- | --- |
| `inventories` | 当前库存余额，SKU + 仓库唯一粒度 | 满足库存查询、可用库存、仓库汇总和 SKU 汇总 |
| `inventory_transactions` | 库存流水与来源追溯 | 满足入库、出库、调整流水查询 |
| `warehouses` | 仓库主数据和仓库类型 | 满足仓库范围、仓库类型和授权过滤 |
| `skus` | SKU 主数据 | 满足库存引用基础 |
| `outbound_orders` | 出库主单 | 满足出库单生命周期 |
| `outbound_order_items` | 出库明细 | 满足 SKU、数量、来源和成本记录 |
| `inventory_adjustments` | 库存调整主单 | 满足正式库存调整流程 |
| `inventory_adjustment_items` | 库存调整明细 | 满足调整明细、调整前后数量和成本记录 |
| `audit_logs` | 审计事实 | 满足库存高风险动作审计 |
| `attachment_links` / `attachments` | 出库附件 | 满足出库单附件复用 |

### Capability Coverage

| 能力 | 数据库覆盖情况 | 结论 |
| --- | --- | --- |
| 当前库存查询 | `inventories` | 已覆盖 |
| SKU 库存查询 | `inventories.sku_id` + SKU 关系 | 已覆盖 |
| 仓库库存查询 | `inventories.warehouse_id` + `warehouses` | 已覆盖 |
| 可用库存 | `available_quantity = on_hand_quantity - reserved_quantity - pending_quantity` | 已覆盖 |
| 库存详情 | `inventories` + SKU / 仓库关系 | 已覆盖 |
| 入库流水 | `inventory_transactions` 来源类型与方向 | 已覆盖 |
| 出库流水 | `inventory_transactions` 来源类型与方向 | 已覆盖 |
| 调整流水 | `inventory_transactions` + `inventory_adjustments` | 已覆盖 |
| 出库单 | `outbound_orders` | 已覆盖 |
| 出库明细 | `outbound_order_items` | 已覆盖 |
| 出库确认扣减 | `inventories` + `inventory_transactions` + `outbound_orders` | 已覆盖 |
| 库存调整 | `inventory_adjustments` + `inventory_adjustment_items` | 已覆盖 |
| 基础统计 | 基于 `inventories` 实时聚合 | 已覆盖 |

### Freeze / Reserved / Pending Analysis

当前 Frozen 数据库支持：

1. `reserved_quantity`；
2. `pending_quantity`；
3. `available_quantity`；
4. `on_hand_quantity`；
5. 数量非负 Check；
6. `available_quantity = on_hand_quantity - reserved_quantity - pending_quantity` 平衡 Check。

当前 Frozen 数据库不包含独立库存冻结单、冻结原因、冻结生命周期、冻结释放记录或独立冻结数量字段。

影响判断：

1. MVP 库存查询、流水、出库和基础统计不需要新增冻结对象；
2. 若后续需要“库存冻结 / 解冻”作为独立业务流程，需要先提交 Database Change Request；
3. 本阶段不得用 Cache、Job、Event 或页面状态模拟库存冻结事实。

### Database CR Judgment

Database CR：Not Required

原因：

1. MVP 所需库存查询、流水、出库、调整和统计均已有正式数据库对象支持；
2. 不需要新增表；
3. 不需要新增字段；
4. 不需要新增 Enum；
5. 不需要修改 Migration；
6. 不修改 Frozen Platform 表或业务领域表。

非阻塞后续事项：

如项目负责人确认独立库存冻结生命周期进入业务范围，则需要单独提交 Database CR。

---

## 4. API Impact Analysis

### Existing API Coverage

MVP 复用 API Master Specification v1.6 中既有接口：

| 范围 | API | 覆盖能力 |
| --- | --- | --- |
| 当前库存 | `INV-001` 至 `INV-005` | 库存汇总、库存列表、库存详情、分仓汇总、厂家仓库存 |
| 库存流水 | `INV-006` 至 `INV-007` | 库存流水列表和详情 |
| 库存预警 | `INV-008` 至 `INV-012` | 预警查询、查看、处理和关闭 |
| 库存调整 | `INV-013` 至 `INV-026` | 调整单生命周期、执行和导出 |
| 出库 | `OUT-001` 至 `OUT-016` | 出库单列表、详情、创建、编辑、状态流转、确认、冲销、导出 |
| 采购退货出库 | `OUT-017` | 采购退货确认出库 |

### API Sufficiency

| 能力 | API 覆盖 | 结论 |
| --- | --- | --- |
| 库存查询 | `INV-001` 至 `INV-005` | 已覆盖 |
| 库存流水 | `INV-006` 至 `INV-007` | 已覆盖 |
| 出库管理 | `OUT-001` 至 `OUT-016` | 已覆盖 |
| 出库确认 | `OUT-012` | 已覆盖 |
| 出库冲销 | `OUT-013` | 已覆盖 |
| 出库流水追溯 | `OUT-015` + `INV-006` / `INV-007` | 已覆盖 |
| 库存调整 | `INV-013` 至 `INV-026` | 已覆盖 |
| SKU / 仓库汇总 | `INV-001` / `INV-004` | 已覆盖 |

### API CR Judgment

API CR：Not Required

原因：

1. MVP 不新增 API Path；
2. 不新增 DTO 字段；
3. 不修改 Response 结构；
4. 不新增 Error Code；
5. 不新增 Pagination 结构；
6. 不改变 `INV-*`、`OUT-*` 已冻结接口语义。

非阻塞后续事项：

如后续需要独立库存冻结、库存 BI、外部库存同步或库存批次余额 API，需要单独提交 API Change Request。

---

## 5. Permission Impact

MVP 复用既有 Permission Code：

| 能力 | Permission |
| --- | --- |
| 当前库存查看 | `inventory.stock.read` |
| 库存流水查看 | `inventory.transaction.read` |
| 库存调整 | `inventory.adjustment.*` |
| 出库单 | `outbound.order.*` |
| 仓库范围 | `role_warehouses` / warehouse data scope |
| 店铺范围 | store data scope |
| 成本字段 | `field.cost.read` |
| 金额字段 | `field.amount.read` |
| 附件 | `attachment.file.*` |

权限边界：

1. 库存查询必须按授权仓库过滤；
2. 出库单必须按来源仓、店铺和个人信息字段权限过滤；
3. 库存流水成本和金额字段必须按字段权限脱敏；
4. 出库确认属于高风险库存动作，必须校验操作权限、仓库范围、职责分离和幂等键；
5. 页面隐藏按钮不得替代后端权限校验。

Permission 判断：Not Required

原因：

1. `inventory.*` 已覆盖库存查询、流水、预警和调整；
2. `outbound.order.*` 已覆盖出库生命周期；
3. 仓库范围和字段权限已存在；
4. 不新增 Permission Code；
5. 不新增 Role；
6. 不新增 Sensitive Field 分类。

---

## 6. Platform Capability Reuse

### Authentication

库存和出库接口必须复用 Phase 7 Authentication。所有请求必须绑定认证主体，不允许匿名库存查询或库存事务。

### Authorization

库存查询、库存流水、出库操作和库存调整必须复用 RBAC、Data Scope 和 Field Permission。

### Audit

必须审计：

1. 出库创建；
2. 出库编辑；
3. 出库提交；
4. 出库审核；
5. 出库确认；
6. 出库冲销；
7. 库存调整提交、审核和执行；
8. 高风险库存查询；
9. 权限拒绝。

审计仍以 `audit_logs` 为唯一审计事实来源。

### Trace

库存查询、库存流水、出库确认和库存调整必须贯通 `request_trace_id`。

Trace 只做链路关联，不参与库存裁决。

### Idempotency

以下动作必须使用 `Idempotency-Key`：

1. 创建出库单；
2. 出库状态动作；
3. 确认出库；
4. 出库冲销；
5. 创建库存调整；
6. 执行库存调整；
7. 导出类高风险请求。

重复请求必须返回同一结果，禁止重复扣减库存或重复生成库存流水。

### Job

Job 可用于后续异步导出、库存预警扫描或统计刷新，但不得替代库存事务、出库确认或库存调整执行。

MVP 不要求新增 Job。

### Event

Event 可在库存事务成功后发布派生事件，例如库存已变更、出库已确认、调整已执行。

Event 不得替代库存余额、库存流水、业务状态或审计日志。

MVP 不要求新增 Event 接入。

---

## 7. Page Design

### PC Admin

#### 库存查询

页面能力：

1. 库存概况；
2. 当前库存列表；
3. SKU 库存筛选；
4. 仓库库存筛选；
5. 可用库存筛选；
6. 低库存提示；
7. 跳转库存流水；
8. 跳转来源业务单据。

权限：

1. `inventory.stock.read`；
2. warehouse data scope；
3. `field.cost.read` / `field.amount.read` 控制成本与金额展示。

#### 库存流水

页面能力：

1. 流水列表；
2. 流水详情；
3. 来源类型筛选；
4. 来源单据跳转；
5. SKU / 仓库 / 日期筛选；
6. 关联流水追溯。

权限：

1. `inventory.transaction.read`；
2. warehouse data scope；
3. 成本和金额字段权限。

#### 出库管理

页面能力：

1. 出库单列表；
2. 出库单详情；
3. 创建国内销售出库；
4. 创建普通其他出库；
5. 编辑草稿或已驳回出库单；
6. 提交；
7. 撤回；
8. 审核；
9. 驳回；
10. 反审核；
11. 取消；
12. 确认出库；
13. 冲销；
14. 附件；
15. 状态历史；
16. 库存流水 Tab。

权限：

1. `outbound.order.*`；
2. warehouse data scope；
3. store data scope；
4. `attachment.file.*`；
5. 个人信息、成本和金额字段权限。

### 微信小程序

MVP 包含轻量查询：

1. 当前库存查询；
2. SKU 库存查询；
3. 仓库库存查询；
4. 库存流水查询；
5. 出库单查询；
6. 出库详情查询。

微信小程序 MVP 暂不作为复杂审批和高风险库存事务的主要入口，除非后续任务明确批准。

---

## 8. Development Order

建议开发顺序：

### 1. Inventory Query

先实现当前库存、SKU 库存、仓库库存和可用库存查询。

原因：

1. 只读能力风险最低；
2. 可验证 Master Data 和 Inbound 已形成的库存余额；
3. 为 Outbound 创建和确认提供库存可用量基础。

### 2. Inventory Transaction

实现库存流水列表、详情和来源追溯。

原因：

1. 库存流水是库存变化审计和排错基础；
2. 可验证入库确认、出库确认和调整执行是否完整写入流水；
3. 不改变库存余额。

### 3. Outbound

实现出库单生命周期和确认出库。

原因：

1. 出库是 Module 3 的首个库存扣减闭环；
2. 必须在 Inventory Query 和 Transaction 可验证后实施；
3. 确认出库涉及事务、幂等、防负库存和审计，风险最高。

### 4. Inventory Statistics

实现 SKU 汇总、仓库汇总和基础概览。

原因：

1. 可基于已完成的 Query 和 Transaction 派生；
2. 不建立独立事实表；
3. 适合作为页面层聚合能力收尾。

---

## 9. Acceptance Criteria

Module 3 MVP 完成标准：

1. 当前库存查询准确；
2. SKU 库存查询准确；
3. 仓库库存查询准确；
4. 可用库存公式正确；
5. 库存详情可追溯到 SKU 和仓库；
6. 入库、出库、调整流水完整可查；
7. 库存流水只追加，不可覆盖；
8. 出库单可完成创建、编辑、提交、审核、确认出库和冲销；
9. 确认出库正确扣减 `inventories`；
10. 确认出库正确新增 `inventory_transactions`；
11. 出库确认重复请求不会重复扣减库存；
12. 库存不足时禁止确认出库；
13. 出库和调整动作写入 `audit_logs`；
14. `request_trace_id` 可贯通库存查询、出库和流水；
15. 仓库范围、店铺范围、成本字段和金额字段权限生效；
16. 不新增 Database Schema；
17. 不新增 API Contract；
18. 不新增 Permission Code；
19. 不建立平行库存数据源；
20. Event、Job、Cache 均不替代库存事实。

---

## 10. Risk Analysis

### 历史库存导入

风险：

1. Excel 历史库存存在 SKU、仓库、数量和批次口径不一致；
2. 期初库存导入只应形成正式初始库存，不导入全部历史流水；
3. 海外仓库存仍需遵守已冻结的导入和跨境追溯规则。

缓解：

1. 历史数据迁移必须在单独任务中设计；
2. 导入结果必须写正式库存对象和必要审计；
3. 不允许用 Excel 作为上线后的库存事实来源。

### Excel 数据迁移

风险：

1. 历史 Excel 可能包含重复 SKU、非正式仓库、手工库存修正；
2. 数据清洗不足会影响库存准确性。

缓解：

1. 先完成 SKU、仓库、供应商等主数据校验；
2. 使用正式 Import 能力和校验结果；
3. 失败行不得部分绕过校验入库。

### 库存准确性

风险：

1. 并发出库导致超扣；
2. 幂等缺失导致重复扣减；
3. 只改库存余额但漏写流水；
4. 出库冲销和调整执行边界不清。

缓解：

1. 确认出库必须事务执行；
2. 使用行级锁或条件更新保护库存余额；
3. 必须使用 `Idempotency-Key`；
4. 必须追加 `inventory_transactions`；
5. 冲销必须形成反向流水并保留关联关系。

### 仓库权限

风险：

1. 未授权仓库库存泄露；
2. 成本和金额字段越权展示；
3. 店铺销售出库数据范围与仓库范围叠加不当。

缓解：

1. 查询前先应用仓库范围；
2. 出库同时校验仓库范围和店铺范围；
3. 成本、金额、个人信息字段必须后端脱敏；
4. 权限拒绝必须可审计。

### 独立库存冻结

风险：

当前数据库只有 `reserved_quantity` 和 `pending_quantity`，没有独立冻结生命周期。

判断：

1. Module 3 MVP 不建设独立冻结单；
2. 不得用页面状态、Cache、Job 或 Event 模拟冻结事实；
3. 若后续业务需要冻结 / 解冻 / 冻结原因 / 冻结释放记录，必须提交 Database CR、API CR 和可能的 Permission CR。

---

## Impact Review Conclusion

| 项目 | 判断 | 说明 |
| --- | --- | --- |
| Database CR | Not Required | MVP 复用 `inventories`、`inventory_transactions`、`outbound_orders`、`outbound_order_items`、`inventory_adjustments`、`inventory_adjustment_items` |
| API CR | Not Required | MVP 复用 `INV-*` 和 `OUT-*` 已冻结接口 |
| Permission CR | Not Required | 复用 `inventory.*`、`outbound.order.*`、仓库范围、店铺范围和字段权限 |
| Frozen 文档修改 | Not Required | 本阶段只新增 Phase 8 影响评估文档 |
| 代码修改 | Not Required | 本阶段只审计和设计，不开发 |
| Schema / Migration 修改 | Not Required | 禁止修改数据库结构 |

推荐进入下一步：

Phase 8 Module 3 Inventory Management Implementation Design。
