---
document_name: Phase 8-E Sales Management Impact Review
project: Violin ERP Lite
phase: Phase 8 Application Development
task: Phase 8-E Sales Management Impact Review
status: Completed / Pending Approval
owner: Project Manager
created_date: 2026-07-26
updated_date: 2026-07-26
related_phase: Phase 8
---

# TASK 8-E Sales Management Impact Review

## 1. Sales Business Scope

本评估面向 Phase 8 后续销售管理（Sales Management）实施前影响审查。

当前 Frozen 业务规则已经明确：

1. 国内电商业务按照平台订单逐单登记销售出库；
2. 本期只管理销售出库，不建设完整销售订单生命周期；
3. 平台订单号作为销售出库来源和追溯依据；
4. 库存变化必须通过正式业务单据形成 `inventory_transactions`，不得直接修改库存余额。

因此，Sales Management 需要拆分为两类范围：

1. 当前可复用既有能力完成的受限 MVP；
2. 需要正式 Change Request 后才能建设的独立销售订单、平台订单和客户管理能力。

### Sales Order

#### Domestic Sales Order

国内销售当前正式实现基础是：

```text
平台订单号
  ↓
domestic sales outbound
  ↓
outbound_orders / outbound_order_items
  ↓
inventory_transactions
```

当前不应新增完整 `sales_orders` 生命周期。

可在 MVP 中使用 `outbound_orders` 的国内销售出库类型表达销售执行结果，并通过 `store_id`、`platform_id`、`external_order_no`、客户快照字段和出库明细完成追溯。

#### E-commerce Order

电商订单当前只作为销售出库来源信息，不是正式订单事实对象。

当前允许：

1. 在销售出库中记录平台订单号；
2. 按店铺和平台查询销售出库；
3. 基于已确认出库和库存流水做销售分析；
4. 查询客户快照。

当前不允许：

1. 建设独立电商订单生命周期；
2. 建设平台订单同步状态；
3. 用平台订单替代出库单或库存流水；
4. 用导入文件直接修改库存。

#### Platform Order

Temu、Amazon、天猫、抖店等平台订单如需持久化订单头、订单明细、履约状态、退款状态或同步记录，应作为独立对象进入后续 CR。

当前阶段不应直接新增 `platform_orders`。

#### Independent Sales Order Judgment

是否需要独立销售订单对象：

| 场景 | 判断 | 说明 |
| --- | --- | --- |
| 国内销售出库执行 | 暂不需要 | 已由 `outbound_orders`、`outbound_order_items` 和 `OUT-*` 覆盖 |
| 平台订单号追溯 | 暂不需要 | 已由销售出库来源字段承载 |
| 完整销售订单生命周期 | 需要 | 当前 Frozen 明确不建设；如实施必须先提交 Database CR、API CR 和 Permission CR |
| 平台订单导入 / 同步 / 履约 | 需要 | 当前未登记 `platform_orders` 和平台订单接口 |
| 订单退款、售后、拆单、合单 | 需要 | 当前仅有销售退货对象，不覆盖完整售后订单体系 |

### Sales Outbound

销售库存闭环必须保持：

```text
Sales Source
  ↓
Outbound
  ↓
Inventory Transaction
```

销售订单或平台订单即使后续建立，也只能作为销售来源和履约管理对象，不得直接修改库存。

正式库存变化边界仍是：

1. `OUT-012` 确认出库；
2. 事务内更新 `inventories`；
3. 同步写入 `inventory_transactions`；
4. 写入审计与 Trace。

### Platform Sales

平台销售覆盖：

1. 天猫；
2. 抖店；
3. Temu；
4. Amazon。

#### Excel Import

平台销售 Excel 导入如仅用于生成查询视图或导入预校验，需要复用 Import Framework。

如导入结果需要正式保存为平台订单事实，则需要新增数据库对象、API 契约和权限控制，必须先提交 CR。

#### API Sync

平台 API 同步暂不属于当前 MVP。

原因：

1. 不同平台接口授权、限流、字段、退款和履约规则差异大；
2. 当前 Phase 8 尚未批准外部平台同步能力；
3. 同步任务需要 Job、Event、幂等、审计和错误恢复共同约束；
4. 平台订单持久化需要先明确数据库事实模型。

#### Order Lifecycle

平台订单生命周期暂不纳入当前 MVP。

如后续建设，需要至少定义：

1. 订单创建；
2. 订单支付；
3. 发货；
4. 退款；
5. 取消；
6. 售后；
7. 与出库、退货和库存流水的关系。

### Customer Management

当前正式能力是客户快照只读：

1. 数据来自 `outbound_orders.customer_name`、收件国家、收件地址、店铺等销售出库字段；
2. API 复用 `MD-CUS-01` 和 `MD-CUS-02`；
3. 权限复用 `master.customer-snapshot.read`、店铺范围和 `field.personal-data.read`。

当前不建设正式客户主数据。

如后续需要：

1. 客户；
2. 经销商；
3. B2B 客户；
4. 客户等级；
5. 客户信用；
6. 联系人；
7. 客户地址簿；

则需要先提交 Database CR、API CR 和 Permission CR。

### Sales Analysis

销售分析可分两层：

#### MVP 可做

1. 基于 `outbound_orders` 汇总销售出库数量；
2. 基于 `outbound_order_items` 汇总 SKU 销量；
3. 基于 `stores` 和 `ecommerce_platforms` 汇总平台 / 店铺销量；
4. 基于 `inventory_transactions` 追踪库存出库流水；
5. 在具备字段权限时展示金额或成本相关分析。

#### 需要 CR 后才能做

1. 基于正式 `sales_orders` 的订单统计；
2. 基于正式 `platform_orders` 的平台订单统计；
3. 利润分析快照；
4. 退款、折扣、佣金、平台费和税费分析；
5. 独立销售统计表或报表快照表；
6. AI 预测和高级 BI。

## 2. Sales Inventory Boundary Review

销售管理不得改变库存事实边界。

库存唯一事实来源为：

1. `inventories`；
2. `inventory_transactions`。

销售订单不是库存事实。

平台订单不是库存事实。

客户资料不是库存事实。

销售分析不是库存事实。

正式销售库存流程必须保持：

```text
Sales Order / Platform Order / Platform Order No
  ↓
Outbound Order
  ↓
Outbound Confirm
  ↓
Inventory Transaction
```

只有确认出库才能改变库存余额。

禁止：

1. 创建销售订单时扣减库存；
2. 审核销售订单时扣减库存；
3. 导入平台订单时扣减库存；
4. 销售分析计算结果回写库存；
5. 平台库存或缓存替代 `inventories`；
6. Event、Job 或 Import Task 直接替代库存流水。

## 3. Database Impact Analysis

### Existing Database Capability

当前可复用对象：

| 对象 | 当前作用 | 对销售管理支持 |
| --- | --- | --- |
| `outbound_orders` | 出库主单 | 支持国内销售出库、平台订单号、店铺、客户快照和库存出库来源 |
| `outbound_order_items` | 出库明细 | 支持 SKU、数量、成本、外部 SKU 和外部订单行号 |
| `sales_returns` | 销售退货主单 | 支持销售退货处理 |
| `sales_return_items` | 销售退货明细 | 支持退货 SKU、数量和处理结果 |
| `inventories` | 当前库存事实 | 支持销售出库后的库存余额 |
| `inventory_transactions` | 库存流水事实 | 支持销售出库、冲销和退货库存追溯 |
| `ecommerce_platforms` | 电商平台主数据 | 支持平台维度筛选和汇总 |
| `stores` | 店铺主数据 | 支持店铺维度筛选、范围控制和汇总 |
| `role_stores` | 店铺数据范围 | 支持销售人员店铺范围 |
| `audit_logs` | 审计事实 | 支持销售出库、退货、敏感查看和导出审计 |

说明：部分 Phase 8 跨境设计文档以 `platforms` 泛称平台主数据；当前 Prisma 与 API 证据中正式运行对象为 `ecommerce_platforms`。

### Proposed Object Review

| 可能对象 | 当前是否存在 | MVP 是否必要 | Database CR 判断 |
| --- | --- | --- | --- |
| `sales_orders` | 否 | 否 | 独立销售订单生命周期需要 Database CR |
| `sales_order_items` | 否 | 否 | 独立销售订单明细需要 Database CR |
| `customers` | 否 | 否 | 正式客户 / 经销商 / B2B 客户主数据需要 Database CR |
| `sales_channels` | 否 | 否 | 若超出既有平台 / 店铺表达，需要 Database CR |
| `platform_orders` | 否 | 否 | 平台订单导入、同步和生命周期需要 Database CR |

### Database CR Judgment

Database CR：Required for full Sales Management

原因：

1. Frozen 规则明确当前不建设完整销售订单生命周期；
2. 当前数据库无正式 `sales_orders`、`sales_order_items`、`customers`、`sales_channels` 和 `platform_orders`；
3. 平台订单生命周期、正式客户管理、销售订单履约和销售分析快照均需要新增事实对象或字段；
4. 不能用 `outbound_orders` 承载超出销售出库职责的完整销售订单事实。

Database CR：Not Required for constrained MVP

仅当后续实施范围严格限定为：

1. 国内销售出库；
2. 销售退货；
3. 客户快照只读；
4. 平台 / 店铺销售出库查询；
5. 基于既有出库和库存流水的只读统计；

且不新增正式销售订单、平台订单、客户主数据或统计快照时，可以不提交 Database CR。

## 4. API Impact Analysis

### Existing API Capability

当前可复用 API：

| API | 用途 | 销售管理支持 |
| --- | --- | --- |
| `OUT-*` | 出库单 | 支持国内销售出库、状态流转、确认出库、冲销、状态历史、库存流水和导出 |
| `SRT-*` | 销售退货 | 支持销售退货生命周期 |
| `MD-PLT-*` | 电商平台 | 支持平台主数据 |
| `MD-STR-*` | 店铺 | 支持店铺主数据 |
| `MD-CUS-*` | 客户快照 | 支持客户快照只读 |
| `INV-*` | 库存查询 / 流水 / 统计 | 支持销售库存影响追踪和只读分析 |

### Potential API Need

| 可能 API | 当前是否存在 | 判断 |
| --- | --- | --- |
| `SALES-*` | 否 | 独立销售订单、销售分析或销售管理入口需要 API CR |
| `ORDER-*` | 否 | 通用订单生命周期需要 API CR |
| Platform Order API | 否 | 平台订单导入、同步、履约、退款状态需要 API CR |
| Customer API | 否 | 正式客户主数据维护需要 API CR；客户快照只读已由 `MD-CUS-*` 覆盖 |

### API CR Judgment

API CR：Required for full Sales Management

原因：

1. 当前 API Master Specification 未批准 `SALES-*`、`ORDER-*` 或 Platform Order API；
2. 独立销售订单和平台订单需要新的 DTO、状态操作、错误场景和权限映射；
3. 正式客户主数据维护不同于客户快照只读。

API CR：Not Required for constrained MVP

仅当后续实施严格复用 `OUT-*`、`SRT-*`、`MD-CUS-*`、`MD-PLT-*`、`MD-STR-*` 和 `INV-*`，并不新增路径、DTO、Response 字段和 Error Code 时，可以不提交 API CR。

## 5. Permission Impact

### Existing Permission Capability

当前可复用权限：

| 权限 | 用途 |
| --- | --- |
| `outbound.order.*` | 国内销售出库、普通出库、状态流转、确认和冲销 |
| `outbound.sales-return.*` | 销售退货 |
| `master.customer-snapshot.read` | 客户快照只读 |
| `master.platform.*` | 电商平台主数据 |
| `master.store.*` | 店铺主数据 |
| `inventory.stock.read` | 库存查询 |
| `inventory.transaction.read` | 库存流水查询 |
| `field.personal-data.read` | 客户个人信息查看 |
| `field.amount.read` | 金额字段查看 |
| `field.cost.read` | 成本字段查看 |
| Store Data Scope | 销售人员授权店铺范围 |
| Warehouse Data Scope | 仓库和库存范围 |

### Potential Permission Need

| 可能权限 | 当前是否存在 | 判断 |
| --- | --- | --- |
| `sales.*` | 否 | 独立销售订单、销售分析和销售管理入口需要 Permission CR |
| `customer.*` | 否 | 正式客户主数据生命周期需要 Permission CR |
| `platform-order.*` | 否 | 平台订单导入、同步、履约和退款需要 Permission CR |

### Permission Judgment

Permission CR：Required for full Sales Management

原因：

1. 当前销售出库权限不等于完整销售订单权限；
2. 客户快照只读权限不等于客户主数据维护权限；
3. 平台 / 店铺主数据权限不等于平台订单权限；
4. 销售分析可能涉及金额、成本、利润和个人信息，需要明确字段与范围权限。

Permission CR：Not Required for constrained MVP

仅当后续实施严格复用：

1. `outbound.order.*`；
2. `outbound.sales-return.*`；
3. `master.customer-snapshot.read`；
4. `master.platform.*`；
5. `master.store.*`；
6. `inventory.*` 只读权限；
7. 已有字段权限和数据范围；

且不新增销售订单、客户主数据或平台订单操作时，可以不提交 Permission CR。

## 6. Existing Capability Reuse

| 能力 | 复用方式 |
| --- | --- |
| Authentication | 所有销售查询、出库、退货和统计均需登录态 |
| Authorization | 使用 `outbound.*`、`master.*`、`inventory.*`、字段权限和数据范围 |
| Attachment | 销售出库、销售退货可复用既有附件对象与类别 |
| Audit | 记录销售出库状态、库存影响、客户敏感信息查看、导出和高风险操作 |
| Trace | `request_trace_id` 贯通销售查询、出库确认、库存流水和统计 |
| Idempotency | 出库确认、冲销、退货确认和导出等动作使用幂等保护 |
| Workflow | 复用出库和销售退货既有状态流转 |
| Job | 后续可用于销售导出、平台数据导入或异步统计；不得替代业务事实 |
| Event | 后续可发布销售出库、退货和库存变化事件；不得替代库存流水或审计 |
| Import Framework | 后续平台订单或销售数据导入可复用；导入不直接修改库存 |
| Outbound | 国内销售库存扣减的正式执行单据 |

## 7. MVP Scope

### Included

建议 Sales MVP 只包含：

1. 国内销售出库查询与操作增强；
2. 销售退货查询与处理复用；
3. 平台 / 店铺销售出库视图；
4. 客户快照只读查询；
5. 基于 `outbound_orders`、`outbound_order_items`、`inventory_transactions` 的只读销售统计；
6. SKU 销量、平台销量、店铺销量基础汇总；
7. 金额和成本字段按既有字段权限控制；
8. 销售出库与库存流水追溯。

### Excluded

当前不纳入 MVP：

1. 完整 `sales_orders` 生命周期；
2. 独立 `sales_order_items`；
3. 正式客户 / 经销商 / B2B 客户主数据；
4. `platform_orders` 导入、同步和履约生命周期；
5. 平台 API 自动同步；
6. 退款、售后、换货和赔付完整闭环；
7. 销售利润快照、佣金、税费和平台费用模型；
8. 自动补货；
9. AI 预测；
10. 高级 BI。

## 8. Development Order

建议开发顺序：

1. Sales Order Impact CR Preparation
   - 若项目负责人确认需要完整销售订单，应先提交 Database CR、API CR 和 Permission CR；
   - 若仅做受限 MVP，则进入第 2 步。

2. Sales Outbound Integration
   - 复用已完成的 Outbound 能力；
   - 稳定销售库存扣减、客户快照、店铺范围和审计；
   - 这是销售与库存一致性的核心。

3. Sales Return Integration
   - 复用 `SRT-*`；
   - 完成销售后向库存回流的业务追溯。

4. Platform / Store Sales View
   - 基于 `ecommerce_platforms`、`stores`、`outbound_orders` 和 `outbound_order_items`；
   - 不新增平台订单事实。

5. Customer Snapshot View
   - 复用 `MD-CUS-*`；
   - 严格执行个人信息字段权限。

6. Sales Analysis
   - 基于既有出库、退货和库存流水做只读统计；
   - 不创建统计事实表。

如项目负责人批准完整 Sales Management，则后续顺序可调整为：

1. Sales Order；
2. Sales Outbound Integration；
3. Platform Sales Import / View；
4. Sales Analysis。

但该路径必须以前置 CR 批准为条件。

## 9. Risk Analysis

| 风险 | 影响 | 建议 |
| --- | --- | --- |
| 平台订单数据差异 | 不同平台字段、订单状态和退款规则不同，容易导致事实模型不稳定 | MVP 暂不建设平台订单生命周期；后续先做平台字段映射和 CR |
| 库存一致性 | 销售订单、平台订单或导入数据若直接扣库存，会破坏库存事实 | 坚持 Sales → Outbound → Inventory Transaction |
| 重复订单 | 平台订单号重复导入或重复出库会造成库存重复扣减 | 复用 `store_id + external_order_no` 唯一约束和 Idempotency |
| 退款退货 | 退款、退货、换货和售后状态复杂 | 当前仅复用销售退货；完整售后另行设计 |
| 客户数据 | 客户姓名、地址、联系方式属于敏感信息 | 继续使用客户快照只读和 `field.personal-data.read` |
| 利润分析 | 利润需要成本、售价、费用、退款和平台扣点共同计算 | MVP 只做基础销售数量统计；利润分析需独立设计 |
| 平台 API 同步 | 外部 API 鉴权、限流和失败恢复复杂 | 后续基于 Job、Event、Import 和审计另行规划 |

## 10. Impact Summary

| Impact Area | Judgment | Reason |
| --- | --- | --- |
| Database CR | Required for full Sales Management；Not Required for constrained MVP | 当前未批准 `sales_orders`、`customers`、`platform_orders` 等对象；受限 MVP 可复用出库、退货、平台、店铺和客户快照 |
| API CR | Required for full Sales Management；Not Required for constrained MVP | 当前无 `SALES-*`、`ORDER-*` 或 Platform Order API；受限 MVP 可复用 `OUT-*`、`SRT-*`、`MD-*`、`INV-*` |
| Permission CR | Required for full Sales Management；Not Required for constrained MVP | 当前无 `sales.*`、`customer.*`、`platform-order.*`；受限 MVP 可复用 `outbound.*`、`master.*`、`inventory.*` 和字段权限 |
| Frozen Document Impact | Required if full Sales Management is selected；Not Required for constrained MVP | 完整销售订单与 BR-024 冲突，必须先变更正式业务规则 |

## 11. Recommendation

建议项目负责人先确认 Sales Management 的实施路线：

1. 若目标是快速完成 Phase 8 MVP，应采用受限 MVP：
   - 不新增销售订单；
   - 不新增平台订单；
   - 不新增客户主数据；
   - 基于出库、销售退货、客户快照和库存流水完成销售查询与基础分析。

2. 若目标是建设完整销售订单和平台订单管理，应先启动：
   - Database Change Request；
   - API Change Request；
   - Permission Change Request；
   - Business Rule Change Review。

在未完成上述 CR 前，不建议进入完整 Sales Order 或 Platform Order 开发。
