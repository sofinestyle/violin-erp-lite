---
document_name: Task 9-A System Integration Test Plan
project: Violin ERP Lite
phase: Phase 9 Test Plan & System Integration
task: 9-A System Integration Test Plan
status: Completed / Pending Approval
owner: Project Manager
created_date: 2026-07-26
updated_date: 2026-07-26
related_phase: Phase 9
---

# TASK 9-A System Integration Test Plan

## 1. Test Objective

Phase 9 的目标是验证 Phase 8 Application Development 形成的完整业务系统是否可运行、可追溯、可审计，并与已冻结的 Phase 7 Platform Foundation 保持一致。

本测试方案覆盖：

1. Phase 8 五个业务模块的端到端业务闭环；
2. Database SSOT、Prisma Schema、Migration 与运行时数据访问的一致性；
3. API Contract、DTO、Response、Error Code 与幂等边界；
4. Role、Data Scope 与 Field Permission；
5. Authentication、Authorization、Attachment、Audit、Trace、Workflow、Job、Event 与 Import Framework 等平台能力复用；
6. 库存唯一事实来源边界。

本阶段测试只验证系统一致性和运行能力，不修改业务规则、数据库设计、API Contract 或 Permission Spec。

## 2. Business Flow Test Plan

### Supply Chain

测试链路：

```text
采购
  ↓
生产
  ↓
质检
  ↓
入库
```

测试目标：

1. 验证采购订单可创建、提交、审核和进入执行；
2. 验证生产任务可创建、提交、审核、开始生产、记录进度和分批完工；
3. 验证质量验收可从采购或生产来源创建，并且一张验收单只能有一种来源；
4. 验证验收确认后形成入库资格，但不直接修改库存；
5. 验证入库确认后原子更新 `inventories` 并追加 `inventory_transactions`；
6. 验证 Audit、Trace、Idempotency 与 Workflow 状态历史完整。

重点断言：

1. 采购、生产、质检阶段不修改库存；
2. 只有 Inbound Confirm 修改库存；
3. 入库失败时库存、流水、状态和审计全部回滚；
4. 重复确认入库不重复增加库存。

### Inventory

测试链路：

```text
入库
  ↓
库存
  ↓
出库
  ↓
调整
```

测试目标：

1. 验证入库后库存查询结果准确；
2. 验证库存流水查询可追踪来源单据；
3. 验证出库确认扣减库存并追加出库流水；
4. 验证库存调整执行后更新库存并追加调整流水；
5. 验证库存统计基于 `inventories` 实时聚合，不依赖统计快照表。

重点断言：

1. `available_quantity = on_hand_quantity - reserved_quantity - pending_quantity`；
2. 出库和减少类调整不得造成负库存；
3. `inventory_transactions` 不可被业务流程绕过；
4. warehouse scope 必须过滤库存与流水结果。

### Cross-border

测试链路：

```text
跨境发货
  ↓
在途
  ↓
海外库存
```

测试目标：

1. 验证跨境发货创建、提交、审核与确认发货；
2. 验证确认发货后扣减来源仓库存并增加在途库存；
3. 验证海外库存导入任务可上传、校验、匹配与执行；
4. 验证导入执行后扣减在途库存并增加海外仓库存；
5. 验证平台 / 店铺视图与补货建议只读计算。

重点断言：

1. Cross-border Shipment 不直接替代库存事实；
2. Import Task 不直接替代库存流水；
3. Platform / Store View 与 Replenishment Suggestion 不回写库存；
4. 重复导入执行受幂等保护；
5. 导入失败时库存与流水保持一致。

### Sales

测试链路：

```text
销售来源
  ↓
Outbound
  ↓
库存变化
  ↓
统计
```

测试目标：

1. 验证销售来源通过 Domestic Sales Outbound 表达；
2. 验证确认出库扣减库存并追加库存流水；
3. 验证销售退货必须关联原销售出库和原出库明细；
4. 验证退货入库确认增加库存并追加库存流水；
5. 验证平台 / 店铺销售视图只读；
6. 验证销售统计只读派生，不创建统计事实。

重点断言：

1. 不存在完整 Sales Order 系统；
2. 不存在 Platform Order 系统；
3. 不存在 Customer Master；
4. 销售来源、销售视图和销售统计均不是库存事实；
5. Outbound Confirm 与 Return Inbound Confirm 是销售库存变化边界。

## 3. Database Test Plan

### Schema Consistency

验证：

1. `DATABASE_SPEC.md` 与 Prisma Schema 对关键业务表保持一致；
2. Migration 可在空库完整执行；
3. Migration 可在既有数据库增量执行；
4. 无未登记表、字段、Enum 或 Constraint；
5. 无业务模块私建平行事实表。

### Migration Status

验证：

1. Migration 历史未被修改；
2. Forward-only Migration 顺序完整；
3. 已执行 Migration 与 Prisma Schema 一致；
4. 新环境初始化后关键表、索引、外键和 Check Constraint 存在。

### Data Integrity

验证：

1. 主键、唯一约束和外键约束生效；
2. 状态字段 Check Value 生效；
3. 明细数量、来源关系和单据状态一致；
4. 审计记录与业务单据操作可关联；
5. `request_trace_id` 可贯通关键写操作。

### Inventory Fact Boundary

重点确认：

1. `inventories` 是库存余额事实；
2. `inventory_transactions` 是库存流水事实；
3. Purchase、Production、Inspection、Event、Job、Cache、Import、Statistics 均不能成为库存事实来源；
4. 所有库存变化必须同时满足余额更新和流水追加；
5. 任一步失败必须整体回滚。

## 4. API Test Plan

### API Contract

验证：

1. API Path 与 `API_SPEC.md` 一致；
2. HTTP Method 与正式 API Contract 一致；
3. Request DTO 与 Response DTO 字段一致；
4. Pagination 结构一致；
5. Error Response 结构一致。

覆盖范围：

1. Master Data API；
2. Purchase / Production / Inspection / Inbound API；
3. Inventory / Outbound / Adjustment API；
4. Cross-border / Import API；
5. Sales 复用的 Outbound、Sales Return、Inventory 与 Master Data API；
6. Attachment API；
7. Authentication 与 Authorization 边界。

### DTO

验证：

1. 必填字段校验；
2. 类型校验；
3. 枚举 / Check Value 校验；
4. 数量与金额合法性校验；
5. 来源对象存在性校验；
6. versionNo 乐观并发校验。

### Response

验证：

1. 成功响应结构一致；
2. 列表分页结构一致；
3. 详情结构一致；
4. 状态操作响应一致；
5. 敏感字段根据 Field Permission 正确隐藏。

### Error Code

验证：

1. 未认证返回认证错误；
2. 无权限返回权限错误；
3. 数据范围不匹配返回 Data Scope 错误；
4. 校验失败返回 Validation 错误；
5. 状态非法返回 State 错误；
6. 幂等冲突返回 Idempotency / Conflict 错误；
7. 资源不存在返回 Resource 错误。

### Idempotency

重点测试：

1. 创建类关键操作重复提交结果一致；
2. 确认入库重复请求不重复增加库存；
3. 确认出库重复请求不重复扣减库存；
4. 库存调整重复执行不重复修改库存；
5. 跨境发货和导入执行重复请求不重复写库存流水；
6. 销售退货入库重复请求不重复增加库存。

## 5. Permission Test Plan

### Role

验证：

1. Admin 可执行授权范围内所有管理动作；
2. 业务角色只能执行本角色授权动作；
3. 只读角色不能执行创建、编辑、审核、确认或冲销；
4. 未授权角色不能访问对应资源。

### Data Scope

验证：

1. warehouse scope 过滤库存、出库、入库、调整、跨境与库存统计；
2. store scope 过滤店铺、销售、跨境平台视图；
3. supplier / manufacturer 等业务范围按既有规则校验；
4. 数据范围不匹配时禁止读取或写入。

### Field Permission

验证：

1. `field.amount.read` 控制金额展示；
2. `field.cost.read` 控制成本展示；
3. 供应商敏感字段仅授权可见；
4. 生产厂家敏感字段仅授权可见；
5. 客户快照或个人信息字段仅授权可见；
6. 未授权字段必须脱敏或隐藏。

## 6. Platform Capability Test Plan

### Authentication

验证：

1. 未登录请求被拒绝；
2. Session / Token 正常识别用户；
3. 重放保护与身份绑定生效；
4. 认证上下文进入 Service、Repository、Audit 与 Trace。

### Authorization

验证：

1. Permission Code 校验生效；
2. Data Scope 校验生效；
3. Field Permission 校验生效；
4. 权限失败不产生业务副作用。

### Attachment

验证：

1. 采购、生产、验收、入库、出库、库存调整、跨境、产品等对象附件可按已批准类型关联；
2. Object Type 与 Category Matrix 校验生效；
3. 附件权限、数据范围和生命周期校验生效；
4. 附件操作写入 Audit。

### Audit

验证：

1. 关键创建、编辑、提交、审核、确认、冲销写入审计；
2. Job、Event、Import、Attachment 相关审计可追溯；
3. 审计记录包含必要操作者、对象、动作、时间和 Trace；
4. 审计不记录敏感明文。

### Trace

验证：

1. HTTP 请求生成 `request_trace_id`；
2. Service、Database、Job、Event、Consumer 可关联 Trace；
3. 错误日志、审计和关键业务结果可关联 Trace；
4. Trace 只用于关联，不改变业务事实。

### Workflow

验证：

1. 单据状态机按 API 和业务规则流转；
2. 非法状态转换被拒绝；
3. versionNo 并发校验生效；
4. `document_status_histories` 记录状态历史。

### Job

验证：

1. Job 创建、Claim、Worker 执行、Retry、Dead Letter、Lease Recovery 基础能力可运行；
2. 业务模块需要异步能力时不建立平行 Worker；
3. Job State 不替代业务状态。

### Event

验证：

1. Outbox、Event History、Consumer Inbox、Delivery、Dead Letter 基础能力可运行；
2. Event 不替代业务事实表；
3. Job Queue 不替代 Event Bus；
4. Event Trace 与 Audit 可关联。

### Import Framework

验证：

1. Import Task 创建、校验、执行、结果记录完整；
2. 导入任务与业务执行边界清晰；
3. 导入不得直接绕过正式库存事务；
4. 导入失败、重复导入和部分错误可追踪。

## 7. Test Environment

### 测试环境

建议建立独立 Phase 9 测试环境：

1. 独立 PostgreSQL 数据库；
2. 独立对象存储测试 Bucket 或本地存储 Adapter；
3. 独立环境变量；
4. 禁止连接真实生产数据；
5. 可重复初始化的测试 Seed；
6. 保留日志、审计和 Trace 输出。

### 测试数据

测试数据应覆盖：

1. 产品、SKU、分类、品牌；
2. 供应商、生产厂家；
3. 公司仓、厂家仓、海外仓、在途仓、待处理仓；
4. 平台、店铺；
5. 采购订单、生产任务、验收单、入库单；
6. 库存余额和库存流水；
7. 出库单、库存调整单；
8. 跨境发货、导入任务、匹配记录；
9. 销售出库、销售退货；
10. 附件、审计、Trace、Job、Event。

测试数据不得包含真实客户隐私、真实业务价格、真实银行信息或真实外部平台凭证。

### 测试账号

建议准备：

1. System Admin；
2. Master Data Manager；
3. Purchase User；
4. Production User；
5. Warehouse User；
6. Inventory Manager；
7. Cross-border User；
8. Sales User；
9. Read-only User；
10. Restricted Scope User。

每类账号必须明确：

1. Role；
2. Permission Code；
3. Warehouse Scope；
4. Store Scope；
5. Field Permission。

### 测试流程

建议执行顺序：

1. 环境初始化；
2. Migration 验证；
3. Seed 验证；
4. Master Data 测试；
5. Supply Chain 测试；
6. Inventory 测试；
7. Cross-border 测试；
8. Sales 测试；
9. Platform Capability 测试；
10. API Contract 与权限回归；
11. 数据一致性复核；
12. Bug 分类与闭环；
13. Phase 9 Final Test Report。

## 8. Acceptance Criteria

Phase 9 系统集成测试通过标准：

1. 业务闭环通过；
2. 关键业务链路可从 Master Data 执行到库存、跨境、销售与统计；
3. 数据一致；
4. `inventories` 与 `inventory_transactions` 边界正确；
5. API Contract 一致；
6. DTO、Response、Error Code 无漂移；
7. Permission、Data Scope 与 Field Permission 正确；
8. Authentication、Authorization、Attachment、Audit、Trace、Workflow、Job、Event、Import Framework 可复用；
9. Idempotency 在关键写操作中生效；
10. 无阻塞 Bug；
11. 无未批准 Database、API 或 Permission 变更；
12. 测试结果可追溯并形成正式 Phase 9 测试报告。

阻塞 Bug 定义：

1. 库存余额或库存流水错误；
2. 未授权用户可读写受限数据；
3. 幂等失效导致重复库存变化；
4. 业务状态与库存流水不一致；
5. API Contract 漂移；
6. 数据库约束缺失或迁移失败；
7. 审计或 Trace 丢失导致关键操作不可追溯；
8. 核心业务链路无法完成。

Phase 9 验收前，所有阻塞 Bug 必须修复并完成回归验证。
