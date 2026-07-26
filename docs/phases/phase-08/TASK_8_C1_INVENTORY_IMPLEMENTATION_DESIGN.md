# Task 8-C1 Inventory Management Implementation Design

项目：Violin ERP Lite  
阶段：Phase 8 Application Development  
任务：8-C1 Inventory Management Implementation Design  
状态：Completed / Pending Approval  
创建日期：2026-07-26  
文档类型：Implementation Design  

---

## 1. Inventory Module Scope

Module 3 Inventory Management 的 MVP 目标是基于已冻结的 Phase 7 Platform Foundation、已完成的 Module 1 Master Data Center 和 Module 2 Procurement & Production，完成库存查询、库存流水、出库、库存调整和基础统计的实施设计。

本阶段只设计，不开发代码，不修改 Database SSOT、API Spec 或 Permission Spec。

### Inventory Query

MVP 包含：

1. 当前库存；
2. SKU 库存；
3. 仓库库存；
4. 可用库存；
5. 库存详情；
6. 授权仓库范围内的实时库存聚合。

设计边界：

1. 库存查询只读取 `inventories`；
2. 可用库存使用正式字段 `available_quantity`；
3. 可用关系必须满足 `available_quantity = on_hand_quantity - reserved_quantity - pending_quantity`；
4. 在途库存通过 `warehouse_type = transit` 的仓库节点表达，不新增 `in_transit_quantity`；
5. 不建立库存快照表、缓存事实表或平行库存表。

### Transaction

MVP 包含：

1. 入库流水；
2. 出库流水；
3. 调整流水；
4. 来源单据追溯；
5. 关联流水追溯；
6. 操作人、SKU、仓库、日期、来源类型筛选。

设计边界：

1. 库存流水唯一来源为 `inventory_transactions`；
2. 流水只追加；
3. 不提供手工新增流水、普通修改流水或删除流水；
4. 成本和金额字段按字段权限脱敏。

### Outbound

MVP 包含：

1. 出库单；
2. 出库明细；
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
14. 出库状态历史；
15. 出库库存流水；
16. 出库附件。

设计边界：

1. 出库不创建完整销售订单生命周期；
2. 平台订单号作为国内销售出库追溯依据；
3. 确认出库是出库模块中库存减少的唯一边界；
4. 保存、提交、审核、驳回、撤回、反审核和取消不修改库存；
5. 出库确认必须同时更新 `inventories` 并追加 `inventory_transactions`。

### Adjustment

MVP 包含：

1. 调整单；
2. 调整明细；
3. 创建；
4. 编辑；
5. 提交；
6. 撤回；
7. 审核；
8. 驳回；
9. 反审核；
10. 取消；
11. 作废；
12. 执行调整；
13. 调整状态历史；
14. 调整导出。

设计边界：

1. 库存调整必须通过 `inventory_adjustments` 和 `inventory_adjustment_items`；
2. 保存、提交和审核不修改库存；
3. `INV-024` 执行库存调整是调整模块中库存变化的唯一边界；
4. 执行调整必须原子更新库存余额并追加库存流水；
5. 已完成调整只读，纠错通过正式冲销或后续批准流程处理。

### Statistics

MVP 包含：

1. SKU 统计；
2. 仓库统计；
3. 当前库存概览；
4. 授权仓库范围内的实时汇总。

设计边界：

1. 统计只作为查询聚合；
2. 不新增统计事实表；
3. 不使用 Cache 替代库存事实；
4. 不将 Event History、Job Result 或日志作为库存统计事实来源。

---

## 2. Business Flow Design

### Outbound Flow

出库流程：

```text
创建出库单
↓
提交
↓
审核
↓
确认出库
↓
扣减库存
↓
inventory_transactions
```

#### Outbound Create

创建出库单时：

1. 校验用户认证；
2. 校验 `outbound.order.create-domestic-sales` 或 `outbound.order.create-other` 权限；
3. 校验仓库范围；
4. 国内销售出库校验店铺范围和平台订单号；
5. 校验 SKU 存在且启用；
6. 校验数量大于 0；
7. 创建 `outbound_orders`；
8. 创建 `outbound_order_items`；
9. 写入 `audit_logs`；
10. 不修改 `inventories`；
11. 不写 `inventory_transactions`。

#### Outbound Submit

提交时：

1. 仅允许草稿或已驳回状态；
2. 校验 `versionNo`；
3. 校验必填明细完整；
4. 更新出库单状态为待审核；
5. 写入状态历史和审计；
6. 不修改库存。

#### Outbound Approve

审核时：

1. 仅允许待审核状态；
2. 校验审核权限；
3. 校验职责分离，同一用户不得审核自己创建的单据；
4. 校验 `versionNo`；
5. 更新状态为已审核；
6. 写入状态历史和审计；
7. 不修改库存。

#### Outbound Confirm

确认出库是库存减少唯一边界。

确认出库必须在同一数据库事务中完成：

1. 获取并锁定出库单；
2. 校验状态为已审核或正式允许的部分出库状态；
3. 校验 `versionNo`；
4. 校验操作权限、仓库范围和店铺范围；
5. 校验 `Idempotency-Key`；
6. 读取出库明细；
7. 按 SKU + 仓库读取并锁定 `inventories`；
8. 校验 `available_quantity` 足够；
9. 条件更新 `inventories`，扣减 `on_hand_quantity` 和 `available_quantity`；
10. 逐行新增 `inventory_transactions`，方向为减少；
11. 更新 `outbound_orders` 状态和完成时间；
12. 写入状态历史；
13. 写入 `audit_logs`；
14. 绑定 `request_trace_id`；
15. 提交事务。

任一步失败必须整体回滚。

禁止：

1. 只改库存不写流水；
2. 只写流水不改库存；
3. 出现负库存；
4. 重复确认导致重复扣减；
5. 客户端提交变动后库存；
6. Event、Job 或 Cache 代替确认出库。

#### Outbound Reverse

冲销出库时：

1. 仅允许已完成且下游允许的出库单；
2. 必须要求高风险权限；
3. 必须要求幂等键；
4. 必须生成反向库存事务；
5. 必须通过 `related_transaction_id` 或正式关联方式追溯原流水；
6. 必须写入冲销原因、状态历史和审计；
7. 不得删除原流水。

### Adjustment Flow

库存调整流程：

```text
创建调整单
↓
审核
↓
执行调整
↓
更新库存
↓
inventory_transactions
```

#### Adjustment Create

创建调整单时：

1. 校验认证；
2. 校验 `inventory.adjustment.create`；
3. 校验仓库范围；
4. 校验 SKU 存在且启用；
5. 校验调整数量不为 0；
6. 校验调整方向和数量符号一致；
7. 服务端读取 `quantity_before`；
8. 服务端计算 `quantity_after`；
9. 创建 `inventory_adjustments`；
10. 创建 `inventory_adjustment_items`；
11. 写入审计；
12. 不修改库存。

#### Adjustment Approve

审核调整单时：

1. 仅允许待审核状态；
2. 校验审核权限；
3. 校验职责分离；
4. 校验版本；
5. 更新状态为已审核；
6. 写入状态历史和审计；
7. 不修改库存。

#### Adjustment Execute

执行调整是调整模块中库存变化唯一边界。

执行调整必须在同一数据库事务中完成：

1. 获取并锁定调整单；
2. 校验状态为已审核；
3. 校验执行权限；
4. 校验仓库范围；
5. 校验 `Idempotency-Key`；
6. 读取调整明细；
7. 按 SKU + 仓库读取并锁定 `inventories`；
8. 校验减少方向不会形成负库存；
9. 更新 `inventories`；
10. 新增 `inventory_transactions`；
11. 更新调整单状态为已完成；
12. 写入状态历史；
13. 写入 `audit_logs`；
14. 绑定 `request_trace_id`；
15. 提交事务。

任一步失败必须整体回滚。

---

## 3. Inventory Fact Boundary

库存唯一事实来源：

1. `inventories`；
2. `inventory_transactions`。

边界确认：

| 对象 | 是否允许修改库存 | 说明 |
| --- | --- | --- |
| Purchase | 否 | 采购订单只形成采购业务事实 |
| Production | 否 | 生产任务、进度和完工只形成生产事实 |
| Inspection | 否 | 质量验收只形成入库资格 |
| Inbound | 是，仅确认入库 | Module 2 已完成，确认入库增加库存 |
| Outbound | 是，仅确认出库 | Module 3 实施，确认出库扣减库存 |
| Adjustment | 是，仅执行调整 | Module 3 实施，执行调整修正库存 |
| Event | 否 | 只能发布库存变更通知，不能裁决库存 |
| Job | 否 | 只能执行后台任务，不能替代库存事务 |
| Cache | 否 | 只能缓存派生查询，不能作为库存事实 |
| Audit Log | 否 | 审计记录不替代库存流水 |
| Application Log | 否 | 应用日志不参与库存事实裁决 |

库存事实规则：

1. `inventories` 保存当前余额；
2. `inventory_transactions` 保存每次库存变化；
3. 所有库存变化必须由正式单据触发；
4. 所有库存变化必须追加流水；
5. 库存事务必须原子执行；
6. 负库存必须被拒绝；
7. Excel 不得作为上线后的库存事实来源。

---

## 4. Database Mapping

### `inventories`

用途：

1. 当前库存余额；
2. SKU + 仓库唯一粒度；
3. 账面数量、可用数量、预留数量、待处理数量；
4. 最后流水时间；
5. 最后盘点时间。

字段满足情况：

| 字段方向 | 覆盖情况 |
| --- | --- |
| SKU | `sku_id` 已覆盖 |
| 仓库 | `warehouse_id` 已覆盖 |
| 账面数量 | `on_hand_quantity` 已覆盖 |
| 可用数量 | `available_quantity` 已覆盖 |
| 预留数量 | `reserved_quantity` 已覆盖 |
| 待处理数量 | `pending_quantity` 已覆盖 |
| 最后流水 | `last_transaction_at` 已覆盖 |
| 最后盘点 | `last_counted_at` 已覆盖 |

判断：满足 MVP。

限制：

1. 不存在独立 `in_transit_quantity`；
2. 不存在独立冻结数量；
3. 不存在独立批次库存余额。

这些限制符合当前 MVP 边界；如后续建设独立冻结或批次余额，需要 Database CR。

### `inventory_transactions`

用途：

1. 库存流水事实；
2. 变动方向；
3. 变动数量；
4. 变动前后数量；
5. 成本金额；
6. 来源单据；
7. 关联流水；
8. 批次追溯；
9. 操作人。

判断：满足 MVP 入库、出库、调整流水查询与追溯。

限制：

1. 只追加；
2. 不含 `updated_at`；
3. 不允许普通修改或删除。

### `outbound_orders`

用途：

1. 出库主单；
2. 国内销售出库；
3. 普通其他出库；
4. 状态流转；
5. 出库完成时间；
6. 仓库、店铺和客户快照。

判断：满足 MVP 出库主单生命周期。

### `outbound_order_items`

用途：

1. 出库明细；
2. SKU；
3. 出库数量；
4. 批次；
5. 成本；
6. 外部订单明细追溯。

判断：满足 MVP 出库明细与库存扣减来源。

### `inventory_adjustments`

用途：

1. 库存调整主单；
2. 调整仓库；
3. 调整类型；
4. 调整原因；
5. 增加总量；
6. 减少总量；
7. 实际调整时间。

判断：满足 MVP 调整单生命周期。

### `inventory_adjustment_items`

用途：

1. 调整明细；
2. SKU；
3. 批次；
4. 调整前数量；
5. 调整数量；
6. 调整后数量；
7. 调整方向；
8. 成本金额。

判断：满足 MVP 调整执行与追溯。

### `warehouses`

用途：

1. 仓库主数据；
2. 仓库类型；
3. 仓库启停；
4. 仓库数据范围。

判断：满足库存查询、出库和调整的仓库控制。

### `skus`

用途：

1. SKU 主数据；
2. 库存引用基础；
3. 出库明细引用；
4. 调整明细引用。

判断：满足 MVP。

### Database CR Judgment

Database CR：Not Required

原因：

1. MVP 所需对象已存在；
2. 字段满足库存查询、流水、出库、调整和统计；
3. 不新增表；
4. 不新增字段；
5. 不新增 Enum；
6. 不新增 Migration；
7. 不修改 Database SSOT。

后续可能触发 Database CR 的事项：

1. 独立库存冻结生命周期；
2. 独立批次库存余额；
3. 高级库存快照；
4. 外部库存平台同步状态；
5. 复杂 BI 统计持久化。

---

## 5. API Mapping

### Inventory Query APIs

| API | 页面 | 业务动作 | 权限 |
| --- | --- | --- | --- |
| `INV-001` | 库存 Dashboard | 库存汇总 | `inventory.stock.read` + warehouse scope |
| `INV-002` | 库存列表 | 当前库存查询 | `inventory.stock.read` + warehouse scope |
| `INV-003` | 库存详情 | SKU / 仓库详情 | `inventory.stock.read` + warehouse scope |
| `INV-004` | 分仓统计 | 分仓汇总 | `inventory.stock.read` + warehouse scope |
| `INV-005` | 厂家仓库存 | 厂家仓查询 | `inventory.stock.read` + manufacturer / warehouse scope |

### Transaction APIs

| API | 页面 | 业务动作 | 权限 |
| --- | --- | --- | --- |
| `INV-006` | 库存流水列表 | 查询库存流水 | `inventory.transaction.read` + warehouse scope |
| `INV-007` | 库存流水详情 | 查看流水详情 | `inventory.transaction.read` + warehouse scope + `field.cost.read` |

### Adjustment APIs

| API | 页面 | 业务动作 | 权限 |
| --- | --- | --- | --- |
| `INV-013` | 调整列表 | 查询调整单 | `inventory.adjustment.read` + warehouse scope |
| `INV-014` | 调整详情 | 查看调整单 | `inventory.adjustment.read` + `field.cost.read` |
| `INV-015` | 创建调整 | 创建调整单 | `inventory.adjustment.create` |
| `INV-016` | 编辑调整 | 修改调整单 | `inventory.adjustment.update` |
| `INV-017` | 调整详情 | 提交调整单 | `inventory.adjustment.submit` |
| `INV-018` | 调整详情 | 撤回调整单 | `inventory.adjustment.withdraw` |
| `INV-019` | 调整详情 | 审核调整单 | `inventory.adjustment.approve` |
| `INV-020` | 调整详情 | 驳回调整单 | `inventory.adjustment.reject` |
| `INV-021` | 调整详情 | 反审核调整单 | `inventory.adjustment.unapprove` |
| `INV-022` | 调整详情 | 取消调整单 | `inventory.adjustment.cancel` |
| `INV-023` | 调整详情 | 作废调整单 | `inventory.adjustment.void` |
| `INV-024` | 调整详情 | 执行库存调整 | `inventory.adjustment.execute` |
| `INV-025` | 调整详情 | 查看状态历史 | `inventory.adjustment.read` |
| `INV-026` | 库存 / 流水 / 调整 | 导出 | `inventory.adjustment.export` 或对应导出权限 |

### Outbound APIs

| API | 页面 | 业务动作 | 权限 |
| --- | --- | --- | --- |
| `OUT-001` | 出库列表 | 查询出库单 | `outbound.order.read` + warehouse / store scope |
| `OUT-002` | 出库详情 | 查看出库详情 | `outbound.order.read` + 字段权限 |
| `OUT-003` | 创建销售出库 | 创建国内销售出库 | `outbound.order.create-domestic-sales` |
| `OUT-004` | 创建其他出库 | 创建普通其他出库 | `outbound.order.create-other` |
| `OUT-005` | 出库详情 | 修改出库单 | `outbound.order.update` |
| `OUT-006` | 出库详情 | 提交出库单 | `outbound.order.submit` |
| `OUT-007` | 出库详情 | 撤回出库单 | `outbound.order.withdraw` |
| `OUT-008` | 出库详情 | 审核出库单 | `outbound.order.approve` |
| `OUT-009` | 出库详情 | 驳回出库单 | `outbound.order.reject` |
| `OUT-010` | 出库详情 | 反审核出库单 | `outbound.order.unapprove` |
| `OUT-011` | 出库详情 | 取消出库单 | `outbound.order.cancel` |
| `OUT-012` | 出库详情 | 确认出库 | `outbound.order.confirm` |
| `OUT-013` | 出库详情 | 冲销出库 | `outbound.order.reverse` |
| `OUT-014` | 出库详情 | 查看状态历史 | `outbound.order.read` |
| `OUT-015` | 出库详情 | 查看出库流水 | `outbound.order.read` + `inventory.transaction.read` |
| `OUT-016` | 出库列表 | 导出出库单 | `outbound.order.export` |
| `OUT-017` | 采购退货 | 确认采购退货出库 | 采购退货与出库权限 |

### API CR Judgment

API CR：Not Required

原因：

1. `INV-*` 已覆盖库存查询、流水、调整和导出；
2. `OUT-*` 已覆盖出库生命周期和确认出库；
3. MVP 不新增 API Path；
4. 不新增 DTO 字段；
5. 不修改 Response；
6. 不新增 Error Code；
7. 不修改 API Master Specification。

---

## 6. Permission Design

### Inventory Permissions

复用：

1. `inventory.stock.read`；
2. `inventory.transaction.read`；
3. `inventory.alert.*`；
4. `inventory.adjustment.*`。

使用规则：

1. 当前库存和统计必须校验 `inventory.stock.read`；
2. 流水查询必须校验 `inventory.transaction.read`；
3. 调整单动作必须按动作校验 `inventory.adjustment.*`；
4. 调整执行属于高风险动作，必须校验仓库操作范围和职责分离。

### Outbound Permissions

复用：

1. `outbound.order.read`；
2. `outbound.order.create-domestic-sales`；
3. `outbound.order.create-other`；
4. `outbound.order.update`；
5. `outbound.order.submit`；
6. `outbound.order.withdraw`；
7. `outbound.order.approve`；
8. `outbound.order.reject`；
9. `outbound.order.unapprove`；
10. `outbound.order.cancel`；
11. `outbound.order.confirm`；
12. `outbound.order.reverse`；
13. `outbound.order.export`。

### Data Scope

仓库范围：

1. 库存查询按授权仓库过滤；
2. 库存流水按授权仓库过滤；
3. 出库按来源仓过滤；
4. 调整按调整仓过滤。

店铺范围：

1. 国内销售出库按店铺范围过滤；
2. 平台订单号和客户快照只在授权范围内展示。

### Field Permissions

字段权限：

1. `field.cost.read` 控制单位成本、成本金额；
2. `field.amount.read` 控制金额字段；
3. 个人信息字段按既有敏感字段规则脱敏。

### Permission Judgment

Permission CR：Not Required

原因：

1. 既有 `inventory.*` 覆盖库存能力；
2. 既有 `outbound.order.*` 覆盖出库能力；
3. warehouse scope 已覆盖仓库数据范围；
4. store scope 已覆盖销售出库店铺范围；
5. 字段权限已覆盖成本、金额和个人信息；
6. 不新增 Permission Code。

---

## 7. Page Design

### PC Admin

#### 库存列表

页面能力：

1. 当前库存列表；
2. SKU、产品、分类、品牌筛选；
3. 仓库、仓库类型筛选；
4. 零库存筛选；
5. 预警状态筛选；
6. 可用库存展示；
7. 账面、预留、待处理展示；
8. 成本和金额按权限展示；
9. 跳转库存详情；
10. 跳转库存流水。

#### 库存详情

页面能力：

1. SKU 基本信息；
2. 仓库信息；
3. 当前数量；
4. 最后流水时间；
5. 最后盘点时间；
6. 关联流水 Tab；
7. 来源单据跳转。

#### 流水查询

页面能力：

1. 流水列表；
2. 流水详情；
3. 来源类型筛选；
4. 来源单据筛选；
5. SKU、仓库、日期筛选；
6. 入库、出库、调整方向筛选；
7. 成本金额按权限展示；
8. 关联流水追溯。

#### 出库列表

页面能力：

1. 出库单列表；
2. 状态筛选；
3. 出库类型筛选；
4. 仓库筛选；
5. 店铺筛选；
6. 创建国内销售出库；
7. 创建普通其他出库；
8. 导出出库单。

#### 出库详情

页面能力：

1. 主单信息；
2. 出库明细；
3. 附件；
4. 状态历史；
5. 库存流水；
6. 提交；
7. 撤回；
8. 审核；
9. 驳回；
10. 反审核；
11. 取消；
12. 确认出库；
13. 冲销。

#### 创建出库

页面能力：

1. 选择出库类型；
2. 选择仓库；
3. 国内销售出库选择平台和店铺；
4. 填写平台订单号；
5. 添加 SKU 明细；
6. 展示可用库存；
7. 校验数量；
8. 保存草稿。

#### 调整列表

页面能力：

1. 调整单列表；
2. 状态筛选；
3. 仓库筛选；
4. 调整类型筛选；
5. 创建调整单；
6. 导出。

#### 调整详情

页面能力：

1. 主单信息；
2. 调整明细；
3. 调整前数量；
4. 调整数量；
5. 调整后数量；
6. 状态历史；
7. 提交；
8. 撤回；
9. 审核；
10. 驳回；
11. 反审核；
12. 取消；
13. 作废；
14. 执行调整。

#### Statistics Dashboard

页面能力：

1. SKU 库存汇总；
2. 仓库库存汇总；
3. 低库存提示；
4. 最近库存变动；
5. 出库待处理概览；
6. 调整待处理概览。

统计数据实时聚合，不落地为新的事实表。

### 微信小程序

MVP 包含：

1. 库存查询；
2. 库存详情；
3. 出库查询；
4. 出库详情；
5. 库存流水查询。

小程序 MVP 暂不作为复杂库存调整和高风险出库确认的主操作入口，除非后续任务明确批准。

---

## 8. Platform Capability Reuse

### Authentication

所有库存、出库和调整接口必须复用 Phase 7 Authentication。

禁止匿名访问库存数据。

### Authorization

必须复用：

1. RBAC；
2. Data Scope；
3. Field Permission；
4. Sensitive Field Access。

### Audit

必须审计：

1. 出库创建；
2. 出库编辑；
3. 出库提交；
4. 出库审核；
5. 出库确认；
6. 出库冲销；
7. 调整创建；
8. 调整审核；
9. 调整执行；
10. 高风险库存查询；
11. 权限拒绝。

`audit_logs` 继续作为唯一审计事实来源。

### Trace

库存模块必须贯通：

1. HTTP request；
2. Service；
3. Database transaction；
4. Audit；
5. Event；
6. Job，如后续异步任务接入。

`request_trace_id` 只做链路关联，不参与库存裁决。

### Idempotency

必须使用幂等的动作：

1. 创建出库单；
2. 出库状态动作；
3. 确认出库；
4. 出库冲销；
5. 创建调整单；
6. 调整状态动作；
7. 执行调整；
8. 导出类高风险请求。

重复请求必须返回首次结果，禁止重复扣减库存、重复增加库存或重复写流水。

### Workflow

复用既有单级审核规则：

1. 草稿；
2. 提交；
3. 审核；
4. 驳回；
5. 撤回；
6. 反审核；
7. 取消；
8. 完成或冲销。

同一用户不得审批自己创建的单据。

### Event

库存事务成功后可发布派生事件，例如：

1. `inventory.changed`；
2. `outbound.confirmed`；
3. `inventory_adjustment.executed`。

Event 使用边界：

1. Event 不替代库存余额；
2. Event 不替代库存流水；
3. Event 不修改业务状态；
4. Event 只在数据库事务成功后发布；
5. Event 失败不得造成已提交库存事实回滚，除非后续设计明确采用事务性 Outbox 处理。

---

## 9. Development Order

建议开发顺序：

### 1. Inventory Query

优先实现当前库存、SKU 库存、仓库库存、可用库存和库存详情。

原因：

1. 只读能力风险最低；
2. 可验证 Module 2 入库确认形成的库存余额；
3. 为后续出库创建提供可用库存展示基础；
4. 可先验证仓库范围和字段权限。

### 2. Inventory Transaction

实现库存流水列表、详情和来源追溯。

原因：

1. 流水是库存变化审计和排错基础；
2. 可验证入库确认已形成的流水；
3. 可为出库确认和调整执行测试提供校验入口；
4. 只读实现不改变库存。

### 3. Outbound

实现出库单生命周期和确认出库。

原因：

1. 出库是 Module 3 的核心库存扣减闭环；
2. 确认出库依赖库存查询和流水校验；
3. 需要重点验证事务、幂等、防负库存和审计。

### 4. Adjustment

实现库存调整生命周期和执行调整。

原因：

1. 调整是纠错和盘点差异处理的正式入口；
2. 调整执行同样涉及库存事务；
3. 排在出库后可以复用库存事务基础能力。

### 5. Statistics

实现 SKU 统计、仓库统计和库存 Dashboard。

原因：

1. 统计依赖库存查询和流水能力；
2. 只做实时聚合；
3. 适合作为 Module 3 MVP 收尾。

---

## 10. Acceptance Criteria

Module 3 MVP 完成标准：

1. 库存查询准确；
2. SKU 库存查询准确；
3. 仓库库存查询准确；
4. 可用库存公式正确；
5. 未授权仓库不可见；
6. 库存详情可追溯 SKU 和仓库；
7. 入库流水完整可查；
8. 出库流水完整可查；
9. 调整流水完整可查；
10. 流水只追加，不被覆盖或删除；
11. 出库单可完成创建、编辑、提交、审核、确认出库和冲销；
12. 确认出库正确扣减 `inventories`；
13. 确认出库正确追加 `inventory_transactions`；
14. 出库确认重复请求不会重复扣减库存；
15. 库存不足时禁止确认出库；
16. 调整单可完成创建、审核和执行；
17. 调整执行正确更新库存；
18. 调整执行正确追加流水；
19. 成本和金额字段按权限展示；
20. 出库和调整关键动作写入 `audit_logs`；
21. `request_trace_id` 可贯通库存查询、出库、调整和流水；
22. 不新增 Database Schema；
23. 不新增 API Contract；
24. 不新增 Permission Code；
25. 不建立平行库存数据源。

---

## 11. Risk Analysis

### 历史库存导入

风险：

1. 历史 Excel 库存和系统 SKU / 仓库主数据不一致；
2. 期初库存导入可能被误用为完整历史流水；
3. 海外仓库存导入与国内库存边界可能混淆。

缓解：

1. 历史库存导入必须作为独立任务设计；
2. 上线后 Excel 不作为库存事实来源；
3. 期初库存只形成正式期初余额和必要审计；
4. 海外仓仍按已批准导入规则处理。

### 库存初始化

风险：

1. 初始库存缺失会导致出库无法执行；
2. 初始库存错误会影响后续全部库存流水。

缓解：

1. 初始化前完成 SKU、仓库和历史数据清洗；
2. 使用正式导入和校验流程；
3. 初始化结果必须可审计、可追溯。

### Excel 迁移

风险：

1. Excel 中存在重复 SKU、非正式仓库、手工修正和缺失字段；
2. 迁移失败行若绕过校验，会破坏库存准确性。

缓解：

1. 执行字段、唯一、外键、状态和权限校验；
2. 失败行不得进入正式库存；
3. 不直接导入全部历史流水。

### 仓库权限

风险：

1. 未授权仓库库存泄露；
2. 出库跨仓操作越权；
3. 成本和金额字段越权展示。

缓解：

1. 查询前应用 warehouse scope；
2. 出库和调整动作再次校验仓库范围；
3. 字段权限在服务端脱敏；
4. 权限拒绝写入审计。

### 负库存风险

风险：

1. 并发出库导致超扣；
2. 重复请求导致重复扣减；
3. 调整减少导致负库存；
4. 冲销逻辑错误导致库存反向异常。

缓解：

1. 库存事务使用数据库事务；
2. 库存行加锁或条件更新；
3. 强制幂等；
4. 所有扣减动作先校验可用库存；
5. 所有失败整体回滚；
6. 所有变化追加流水。

### 独立库存冻结

风险：

当前 Frozen 数据库没有独立冻结数量或冻结生命周期。

判断：

1. Module 3 MVP 不建设独立库存冻结；
2. 不得用页面状态、Cache、Job 或 Event 模拟冻结事实；
3. 如后续需要冻结 / 解冻 / 冻结原因 / 冻结释放记录，必须提交 Database CR、API CR 和可能的 Permission CR。

---

## Implementation Design Conclusion

| 项目 | 判断 | 说明 |
| --- | --- | --- |
| Database CR | Not Required | 既有数据库对象满足 MVP |
| API CR | Not Required | `INV-*` 与 `OUT-*` 覆盖 MVP |
| Permission CR | Not Required | 复用 `inventory.*`、`outbound.order.*`、warehouse scope 和字段权限 |
| Database SSOT 修改 | Not Required | 本阶段禁止修改 |
| API Spec 修改 | Not Required | 本阶段禁止修改 |
| Permission Spec 修改 | Not Required | 本阶段禁止修改 |
| 代码修改 | Not Required | 本阶段只设计 |

推荐进入下一步：

Phase 8 Module 3 Inventory Query Development。
