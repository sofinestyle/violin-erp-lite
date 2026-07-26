---
document_name: Phase 8-E2 Sales Order & Outbound Integration Design
project: Violin ERP Lite
phase: Phase 8 Application Development
task: 8-E2 Sales Order & Outbound Integration Design
status: Completed / Pending Approval
owner: Project Manager
created_date: 2026-07-26
updated_date: 2026-07-26
related_phase: Phase 8
---

# TASK 8-E2 Sales Implementation Design

## 1. Sales MVP Scope

本设计基于已完成的 [Task 8-E Sales Impact Review](TASK_8_E_SALES_IMPACT_REVIEW.md)，采用受限 MVP 路线。

受限 MVP 的核心原则：

1. 不建设完整销售订单中心；
2. 不新增数据库对象；
3. 不新增 API Contract；
4. 不新增 Permission Code；
5. 销售库存变化只通过既有 Outbound Confirm 完成；
6. 销售统计只读派生，不成为业务事实。

### Included

Sales MVP 包含：

1. 国内销售出库；
2. 销售退货；
3. 平台 / 店铺销售视图；
4. 基础销售统计；
5. 客户快照只读查询；
6. 销售出库与库存流水追溯。

### Excluded

Sales MVP 不包含：

1. 完整销售订单中心；
2. 独立 `sales_orders` / `sales_order_items`；
3. 平台订单生命周期；
4. 独立 `platform_orders`；
5. 客户主数据；
6. 独立 `customers`、经销商或 B2B 客户生命周期；
7. 平台 API 同步；
8. 高级利润分析；
9. 退款、换货和售后完整闭环；
10. AI 销售预测；
11. 销售统计快照表。

### Business Positioning

销售来源只作为出库来源和追溯信息。

正式销售库存执行对象仍为：

```text
outbound_orders
outbound_order_items
```

正式销售退货对象仍为：

```text
sales_returns
sales_return_items
```

库存唯一事实来源仍为：

```text
inventories
inventory_transactions
```

## 2. Sales Outbound Flow

### Flow

Sales Outbound 使用既有 `OUT-*` 接口和 `outbound.order.*` 权限。

流程：

```text
销售来源
  ↓
Outbound Order
  ↓
提交
  ↓
审核
  ↓
确认出库
  ↓
Inventory Transaction
```

### Sales Source

销售来源可包括：

1. 国内平台订单号；
2. 店铺；
3. 平台；
4. 客户快照信息；
5. 外部 SKU / 外部订单行号。

销售来源不得成为库存事实，也不得替代出库单。

### Outbound Order Creation

创建国内销售出库时复用：

| 能力 | 设计 |
| --- | --- |
| API | `OUT-003 POST /api/v1/outbound-orders/domestic-sales` |
| 数据对象 | `outbound_orders`、`outbound_order_items` |
| 权限 | `outbound.order.create-domestic-sales` |
| 幂等 | 使用 Idempotency-Key |
| 审计 | 记录创建行为和客户敏感信息写入边界 |

创建阶段禁止：

1. 修改库存；
2. 写入 `inventory_transactions`；
3. 创建销售订单；
4. 创建平台订单；
5. 写入销售统计事实。

### Review and Approval

销售出库状态流转复用 Outbound 状态机：

```text
draft
  ↓
pending_approval
  ↓
approved
  ↓
completed
```

支持操作：

1. 提交；
2. 撤回；
3. 审核；
4. 驳回；
5. 反审核；
6. 取消；
7. 确认出库；
8. 冲销。

状态操作必须校验：

1. `versionNo`；
2. 当前状态；
3. 操作权限；
4. 店铺范围；
5. 仓库范围；
6. 幂等键；
7. 审计上下文。

### Outbound Confirm Boundary

`Outbound Confirm` 是销售库存变化唯一边界。

确认出库必须保持既有事务语义：

```text
BEGIN
  锁定 outbound_order
  校验状态
  校验 Idempotency-Key
  读取 outbound_order_items
  锁定 inventories
  校验 available_quantity
  扣减 inventories
  新增 inventory_transactions
  更新 outbound_orders 状态
  写入 audit_logs
  绑定 request_trace_id
COMMIT
```

失败时必须整体回滚。

确认出库后必须满足：

1. `available_quantity >= 0`；
2. 库存流水完整；
3. 出库状态与库存流水一致；
4. 重复请求不重复扣减库存；
5. 审计可追踪。

## 3. Sales Return Flow

### Flow

销售退货复用 `SRT-*` 接口和 `outbound.sales-return.*` 权限。

流程：

```text
销售退货
  ↓
提交
  ↓
审核
  ↓
退货验收 / 处理
  ↓
退货入库
  ↓
Inventory Transaction
```

### Source Relationship

销售退货必须关联：

1. 原销售出库单；
2. 原出库明细；
3. 来源店铺；
4. 退货接收仓；
5. 外部退货号。

销售退货不得脱离原出库单独创建库存增加。

### Return Inspection

退货处理应记录：

1. 退货数量；
2. 可销售数量；
3. 待整理数量；
4. 待维修数量；
5. 配件缺失数量；
6. 包装损坏数量；
7. 不可销售数量；
8. 处理说明。

退货处理结果用于决定后续库存状态，但不得在提交或审核阶段直接增加库存。

### Return Inbound Boundary

退货不能直接增加库存。

退货入库必须通过正式确认动作形成库存变化：

```text
sales_return confirm-inbound
  ↓
inventories
  ↓
inventory_transactions
```

必须保证：

1. 库存增加有正式退货来源；
2. 不删除原销售出库流水；
3. 退货入库产生新的库存流水；
4. 原出库、退货、入库结果可追溯；
5. 审计记录完整。

## 4. Database Mapping

### Reused Objects

| Object | Usage |
| --- | --- |
| `outbound_orders` | 国内销售出库主单、平台订单号、店铺、平台、客户快照 |
| `outbound_order_items` | 销售出库 SKU、数量、外部 SKU、外部订单行号 |
| `sales_returns` | 销售退货主单 |
| `sales_return_items` | 销售退货明细与处理结果 |
| `inventories` | 当前库存事实 |
| `inventory_transactions` | 销售出库、冲销和退货入库库存流水 |
| `ecommerce_platforms` | 平台维度 |
| `stores` | 店铺维度与店铺范围 |
| `role_stores` | 店铺数据范围 |
| `audit_logs` | 销售出库、退货、敏感查看和导出审计 |
| `document_status_histories` | 单据状态历史 |
| `idempotency_records` | 高风险动作幂等保护 |

### Not Introduced

本 MVP 不新增：

1. `sales_orders`；
2. `sales_order_items`；
3. `customers`；
4. `sales_channels`；
5. `platform_orders`；
6. 销售统计快照表；
7. 利润分析表。

### Database CR Judgment

Database CR：Not Required

原因：

1. 本设计严格复用现有数据库对象；
2. 不新增表、字段、Enum、Check、索引或外键；
3. 不改变库存事实来源；
4. 不建设完整销售订单或平台订单生命周期；
5. 不修改 Database SSOT。

如果后续项目负责人要求完整 Sales Order 或 Platform Order，则必须重新提交 Database CR。

## 5. API Mapping

### Reused API Groups

| API Group | Usage |
| --- | --- |
| `OUT-*` | 国内销售出库、状态流转、确认出库、冲销、状态历史、库存流水和导出 |
| `SRT-*` | 销售退货生命周期 |
| `MD-PLT-*` | 平台主数据查询 |
| `MD-STR-*` | 店铺主数据查询 |
| `MD-CUS-*` | 客户快照只读 |
| `INV-*` | 库存查询、库存流水、库存统计 |

### Page to API Mapping

| Page / Action | API |
| --- | --- |
| 销售出库列表 | `OUT-001` |
| 销售出库详情 | `OUT-002` |
| 创建国内销售出库 | `OUT-003` |
| 编辑销售出库 | `OUT-005` |
| 提交 / 撤回 / 审核 / 驳回 / 反审核 / 取消 | `OUT-006` 至 `OUT-011` |
| 确认出库 | `OUT-012` |
| 冲销出库 | `OUT-013` |
| 出库状态历史 | `OUT-014` |
| 出库库存流水 | `OUT-015` |
| 出库导出 | `OUT-016` |
| 销售退货列表 / 详情 / 状态操作 | `SRT-*` |
| 平台 / 店铺基础数据 | `MD-PLT-*`、`MD-STR-*` |
| 客户快照 | `MD-CUS-*` |
| 库存与流水查询 | `INV-*` |

### API CR Judgment

API CR：Not Required

原因：

1. 本 MVP 不新增 API Path；
2. 不新增 DTO 字段；
3. 不修改 Response 结构；
4. 不新增 Error Code；
5. 不引入 `SALES-*`、`ORDER-*` 或 Platform Order API；
6. 仅复用 API Master Specification 已批准接口。

如果后续需要独立 Sales Order API、Platform Order API 或正式 Customer API，则必须提交 API CR。

## 6. Permission Design

### Reused Permission

| Permission | Usage |
| --- | --- |
| `outbound.order.read` | 销售出库查询 |
| `outbound.order.create-domestic-sales` | 创建国内销售出库 |
| `outbound.order.update` | 草稿 / 驳回状态编辑 |
| `outbound.order.submit` | 提交销售出库 |
| `outbound.order.withdraw` | 撤回销售出库 |
| `outbound.order.approve` | 审核销售出库 |
| `outbound.order.reject` | 驳回销售出库 |
| `outbound.order.unapprove` | 反审核销售出库 |
| `outbound.order.cancel` | 取消销售出库 |
| `outbound.order.confirm` | 确认出库 |
| `outbound.order.reverse` | 冲销出库 |
| `outbound.order.export` | 导出销售出库 |
| `outbound.sales-return.*` | 销售退货 |
| `inventory.stock.read` | 库存查询 |
| `inventory.transaction.read` | 库存流水查询 |
| `master.platform.read` | 平台维度查询 |
| `master.store.read` | 店铺维度查询 |
| `master.customer-snapshot.read` | 客户快照查询 |
| `field.personal-data.read` | 客户姓名、地址等个人信息 |
| `field.amount.read` | 金额字段 |
| `field.cost.read` | 成本字段 |

### Data Scope

必须叠加：

1. Store Data Scope；
2. Warehouse Data Scope；
3. 字段级权限；
4. 导出权限；
5. 敏感查看审计。

### sales.* Judgment

是否需要 `sales.*`：

Permission CR：Not Required

原因：

1. 本 MVP 不建立独立销售订单资源；
2. 国内销售执行使用 `outbound.order.*`；
3. 销售退货使用 `outbound.sales-return.*`；
4. 平台、店铺和客户快照已有 `master.*` 权限覆盖；
5. 基础统计使用既有库存、出库和字段权限。

如果后续建立完整销售订单中心，应新增 `sales.*` 并提交 Permission CR。

## 7. Page Design

### PC Admin

#### Sales

销售出库列表：

1. 按平台筛选；
2. 按店铺筛选；
3. 按仓库筛选；
4. 按 SKU 筛选；
5. 按外部订单号筛选；
6. 按状态筛选；
7. 按日期范围筛选。

销售出库详情：

1. 基本信息；
2. 平台 / 店铺 / 外部订单号；
3. 客户快照；
4. 出库明细；
5. 状态历史；
6. 库存流水；
7. 附件；
8. 审计记录入口。

销售统计：

1. SKU 销量；
2. 平台销量；
3. 店铺销量；
4. 出库数量；
5. 退货数量；
6. 净出库数量；
7. 金额 / 成本字段按权限显示。

#### Return

退货列表：

1. 原销售出库单；
2. 来源店铺；
3. 退货接收仓；
4. 外部退货号；
5. 退货状态；
6. 处理结果。

退货详情：

1. 原出库信息；
2. 退货明细；
3. 商品处理结果；
4. 入库结果；
5. 库存流水；
6. 审计记录入口。

#### Platform

平台销售视图：

1. 平台维度汇总；
2. 店铺维度汇总；
3. SKU 维度汇总；
4. 出库与退货趋势；
5. 只读展示。

店铺销售视图：

1. 店铺销售出库；
2. 店铺退货；
3. 店铺净销量；
4. 店铺库存流水入口；
5. 店铺数据范围过滤。

### 微信小程序

微信小程序只提供轻量查询：

1. 出库查询；
2. 销售出库详情；
3. 销售退货查询；
4. 平台 / 店铺销售查询；
5. SKU 销售查询。

微信小程序暂不提供：

1. 销售统计复杂报表；
2. 高风险确认出库；
3. 导出；
4. 平台订单导入；
5. 客户资料维护。

## 8. Platform Capability Reuse

| Capability | Reuse Design |
| --- | --- |
| Authentication | 所有销售页面和接口必须认证 |
| Authorization | 使用 `outbound.*`、`inventory.*`、`master.*`、`field.*` 和数据范围 |
| Attachment | 销售出库、销售退货复用既有 Attachment Framework |
| Audit | 出库、退货、确认、冲销、敏感查看、导出均写审计 |
| Trace | `request_trace_id` 贯通查询、状态操作、确认出库和统计 |
| Idempotency | 创建、状态操作、确认出库、冲销、退货确认和导出使用幂等 |
| Workflow | 复用 Outbound 与 Sales Return 状态机 |
| Outbound | 销售库存扣减唯一执行对象 |

Job、Event、Import Framework 可作为后续扩展能力使用：

1. 销售导出可后续接入 Job；
2. 销售出库完成可后续发布 Event；
3. 平台销售导入如获批准可复用 Import Framework；
4. 这些能力不得替代销售出库、退货或库存流水事实。

## 9. Development Order

建议开发顺序：

### 1. Sales Outbound Integration

原因：

1. 已有 Outbound 能力完成；
2. 国内销售出库是销售 MVP 的库存执行核心；
3. 先稳定库存扣减、店铺范围、客户快照和审计。

实现重点：

1. 销售出库列表 / 详情；
2. 国内销售出库创建入口；
3. 平台、店铺、外部订单号查询；
4. 客户快照脱敏；
5. 出库库存流水入口。

### 2. Sales Return

原因：

1. 销售闭环需要支持退货；
2. 退货涉及库存回流，必须在销售出库后实现；
3. 销售退货已有正式对象和 API。

实现重点：

1. 退货列表 / 详情；
2. 原销售出库追溯；
3. 退货处理结果展示；
4. 退货入库流水追踪。

### 3. Platform / Store Sales View

原因：

1. 平台和店铺是销售分析主要维度；
2. 依赖销售出库和退货数据稳定；
3. 不需要新增平台订单事实。

实现重点：

1. 平台销售汇总；
2. 店铺销售汇总；
3. SKU 销量；
4. 店铺范围过滤。

### 4. Sales Statistics

原因：

1. 统计依赖前面数据闭环；
2. 必须确保统计只读派生；
3. 金额和成本字段权限需要统一验证。

实现重点：

1. 出库数量统计；
2. 退货数量统计；
3. 净销量统计；
4. SKU / 平台 / 店铺维度；
5. 字段权限控制。

## 10. Acceptance Criteria

### Sales Outbound

1. 可以查询国内销售出库列表；
2. 可以查看销售出库详情；
3. 可以基于既有 `OUT-*` 创建国内销售出库；
4. 创建、提交、审核、确认、冲销均按既有状态机执行；
5. 确认出库后库存正确扣减；
6. 确认出库后生成 `inventory_transactions`；
7. 重复确认不会重复扣减库存；
8. 销售出库可追溯平台、店铺和外部订单号。

### Sales Return

1. 可以查询销售退货列表；
2. 可以查看销售退货详情；
3. 退货必须关联原销售出库；
4. 退货入库必须生成库存流水；
5. 退货不能绕过正式确认动作直接增加库存；
6. 退货状态与库存结果一致。

### Platform / Store View

1. 平台销售视图只读；
2. 店铺销售视图只读；
3. 支持平台、店铺、SKU 和日期筛选；
4. 店铺数据范围正确；
5. 不创建平台订单表或统计表。

### Sales Statistics

1. SKU 销量统计准确；
2. 平台销量统计准确；
3. 店铺销量统计准确；
4. 出库、退货和净销量口径清晰；
5. 金额、成本和客户个人信息按权限展示；
6. 统计不回写业务事实。

### Governance

1. Database Change：Not Required；
2. API Change：Not Required；
3. Permission Change：Not Required；
4. 不修改 Frozen 业务规则；
5. 不修改 Database SSOT；
6. 不修改 API Spec；
7. 不修改 Permission Spec。
