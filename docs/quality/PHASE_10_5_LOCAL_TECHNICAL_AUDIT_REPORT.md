---
document_name: Phase 10.5 本地技术审查与自动化验收报告
project: Violin ERP Lite
task: Phase 10.5 Local Technical Audit & Automated Acceptance
status: Completed / Pending Approval
owner: Project Manager
created_date: 2026-07-26
updated_date: 2026-07-26
related_phase: Phase 10
---

# Phase 10.5 本地技术审查与自动化验收报告

## 1. 审查定位与边界

本任务是 Phase 10 Release & Acceptance 完成后的上线前本地质量门禁，不新增 Phase，
不修改 Frozen `ROADMAP.md`、Database SSOT、API Contract、Permission Spec 或业务规则。

允许范围：

1. 审查现有代码；
2. 新增 Vitest 自动化测试；
3. 修复不改变既有契约的普通代码缺陷；
4. 记录需要 Change Request 的结构性问题，但不直接修改对应 Frozen SSOT。

以下已批准范围限制不作为 Bug：

1. 未实现平台 API 实时同步；
2. 未实现 BOM / MRP；
3. 未实现财务系统；
4. 未实现 AI 预测；
5. 未实现物流费用计算；
6. 本地 Node Engine Warning。

## 2. 测试环境

| 项目 | 环境 |
| --- | --- |
| 基准 Commit | `6ecb6576b96a53be974db9a91dad04aa3336fa40` |
| 操作系统 | macOS |
| Node.js | `v26.3.1`，项目要求 `>=22.0.0 <23` |
| pnpm | `11.12.0` |
| 测试框架 | Vitest `0.34.6` |
| PostgreSQL | 未提供可用本地 PostgreSQL / Docker 运行时；外部集成测试按既有条件跳过 |

## 3. 测试项目与结果

| ID | 审查项目 | 状态 | 结果 |
| --- | --- | --- | --- |
| T1 | 并发库存安全 | Pass（修复后） | 同 SKU 并发扣减只允许一个请求成功；重复请求稳定重放；未出现负库存或重复流水 |
| T2 | 事务一致性与回滚 | Pass（模拟事务） | 跨境发货在途仓写入失败后，来源仓、在途仓、流水和单据状态全部回滚 |
| T3 | ORM 查询性能与 N+1 | Pass（低风险） | 修复库存金额汇总 N+1；5,000 条库存输入下成本查询保持 1 次 |
| B1 | 供应链闭环 | Pass | 采购、生产、验收、入库的服务、状态机、审计与库存边界测试通过 |
| B2 | 库存闭环 | Pass | 入库、查询、出库、调整、冲销、流水和防负库存测试通过 |
| B3 | 跨境闭环 | Pass | 来源仓扣减、在途增加、海外导入、来源追踪及竞争保护测试通过 |
| B4 | 销售闭环 | Pass | 销售来源、出库、库存流水、退货与统计测试通过 |
| S1 | RBAC / Data Scope / Field Permission | Pass | 路由认证、服务权限、仓库/店铺范围和金额/成本/敏感字段隔离测试通过 |
| S2 | 输入安全 | Pass | 超长名称被拒绝；异常字符作为普通数据处理；未发现不安全 SQL 或 DOM HTML 注入 |

## 4. 技术审查明细

### 4.1 T1 并发库存安全

审查覆盖 `Outbound Confirm`、`Inventory Adjustment Execute`、`Cross-border Shipment
Confirm` 和 `Overseas Import Execute`。

修复后形成以下防线：

1. 高风险库存写接口接入 Task 7.5 持久化幂等适配器，同一用户、API 与
   `Idempotency-Key` 的相同请求返回首次稳定结果，不重复执行业务写入；
2. 同一 Key 对应不同请求体时返回既有 `SECURITY_REPLAY_DETECTED`，未增加错误码；
3. 负向库存变更使用带 `available_quantity >= quantity` 与
   `on_hand_quantity >= quantity` 条件的原子 `updateMany`；
4. 单据终态使用 `id + status + version_no` 条件抢占，竞争失败时整个事务回滚；
5. 海外库存导入先原子抢占任务状态，竞争请求在库存变更前退出；
6. 库存余额、`inventory_transactions`、单据状态和审计仍处于同一 Prisma 事务边界。

新增测试模拟两个并发请求操作同一 SKU：仅一个请求成功，期末库存为 `1`，只生成一条
库存流水。相同出库确认并发执行时，期末库存只扣减一次，单据只完成一次。

结论：**Pass**。

### 4.2 T2 事务一致性与回滚

新增跨境发货故障注入测试，在来源仓扣减完成后强制令在途仓增加失败。事务模拟器对库存、
流水和单据状态进行快照回滚。断言结果：

- 来源仓余额恢复；
- 在途仓无新增余额；
- `inventory_transactions` 无残留记录；
- 单据状态与版本号不变；
- 异常继续向调用方返回。

结论：**Pass（自动化事务模拟）**。本机没有可用 PostgreSQL 运行时，因此未执行真实
PostgreSQL 故障注入；生产部署前仍须在 PostgreSQL 18.x 环境执行同一场景的集成冒烟。

### 4.3 T3 ORM 查询性能与 N+1

审查 Master Data、Inventory Query、Inventory Statistics、Sales Statistics 和
Cross-border View：

- Master Data 使用数据库分页、`select` 与并行 `count`；
- Sales Statistics 使用关联 `include` 和批量流水查询，循环中不发起数据库查询；
- Cross-border View 使用批量 `findMany`、集合映射与来源 ID 批量追踪；
- API 列表 `pageSize` 上限为 `100`，避免单次返回 5,000 条记录；
- 发现 Inventory Statistics 的库存金额计算按库存行查询最近成本，属于 N+1；
- 已改为按 SKU/仓库组合一次批量查询最近成本，再在内存中映射。

5,000 条库存输入回归测试确认成本查询次数恒为 `1`。由于缺少真实 PostgreSQL 测试环境，
本报告不虚构 API 响应时间与进程内存实测值。

结论：**Low Risk / Pass**。上线后应以生产规模数据补充 `EXPLAIN ANALYZE`、P95 延迟和
内存基线。

## 5. ERP 业务闭环验证

### 5.1 B1 供应链

Supplier → Purchase Order → Production Order → Inspection → Inbound → Inventory 的
既有工作流与 Repository 测试全部通过。采购、生产、验收不直接修改库存；只有 Inbound
Confirm 通过库存事务边界生成余额和流水。状态、数量、审计与 Trace 断言通过。

### 5.2 B2 库存

Inbound → Inventory Query → Outbound → Adjustment 覆盖余额增加、条件扣减、流水生成、
重复确认防重、冲销反向流水、失败回滚和可用库存校验。并发修复后未出现负库存。

### 5.3 B3 跨境

Cross-border Shipment → Transit Warehouse → Overseas Import → Overseas Inventory
覆盖来源仓扣减、在途仓增加、海外仓更新、Import Task、Shipment Import Match 与流水追踪。
海外导入竞争请求只能有一个执行者。

### 5.4 B4 销售

Sales Source → Outbound → Inventory Transaction → Sales Statistics 覆盖平台/店铺来源、
仓库范围、销售退货和基础统计。统计只读，不成为库存事实来源。

上述结论基于 API、Service、Repository 与事务模拟自动化测试。真实 PostgreSQL 的端到端
数据链路仍属于部署前环境冒烟项。

## 6. 权限安全审查

1. API 路由首先执行共享身份认证，未认证请求返回 `AUTH_UNAUTHORIZED`；
2. Service 层继续执行 Frozen Permission Code 校验，缺失业务权限时拒绝访问；
3. Warehouse Scope 与 Store Scope 被传入 Repository 查询条件，不能跨范围查询；
4. `field.amount.read`、`field.cost.read`、Supplier/Manufacturer Sensitive Field
   权限缺失时对应字段被隐藏；
5. Admin、Purchase、Production、Warehouse、Sales 的权限来源仍为 Frozen RBAC 映射，
   未新增 Role、Permission Code、Data Scope 或字段权限。

结论：**Pass**。认证入口与业务服务层形成两层控制。

## 7. 输入安全审查

自动化测试向 SKU 名称写入 `<script>`、引号、分号和 SQL 关键字，验证其被作为普通文本
数据处理；SKU、Supplier 和 Store 名称超过 Frozen 长度时返回校验错误。

代码级检查结果：

- Repository 使用 Prisma 结构化查询，未发现 `$queryRawUnsafe` 或
  `$executeRawUnsafe`；
- Admin 页面未发现 `dangerouslySetInnerHTML` 或直接 `innerHTML` 写入；
- React 默认文本转义继续作为展示层 XSS 防线；
- 未修改数据库字段、DTO、API 错误码或业务规则。

结论：**Pass**。

## 8. Bug 列表

| ID | 类型 | 等级 | 状态 | 说明 |
| --- | --- | --- | --- | --- |
| P10.5-001 | 幂等 | Critical | Fixed | 库存工作流只校验 Header 存在，未接入持久化幂等执行 |
| P10.5-002 | 并发库存 | Critical | Fixed | 负向库存采用先读后增量更新，竞争请求可能同时通过余额检查 |
| P10.5-003 | 并发状态 | Critical | Fixed | 单据终态更新未使用状态与版本条件抢占 |
| P10.5-004 | 导入并发 | Critical | Fixed | 海外导入任务执行前未原子抢占状态 |
| P10.5-005 | ORM 性能 | Major | Fixed | 库存金额汇总对每条库存执行一次最近成本查询 |
| P10.5-006 | 测试环境 | Future | Accepted | 本机无可用 PostgreSQL/Docker，28 项数据库外部集成测试按既有条件跳过 |

本次未发现需要 Database CR、API CR 或 Permission CR 的问题。所有修复均位于运行时代码和
测试，不改变 Frozen Schema、Migration、API Contract、DTO、Error Code 或 Permission。

## 9. 自动化执行结果

`pnpm check` 全链路通过：

- Format：Pass；
- ESLint：Pass；
- TypeScript：Pass；
- API：`137 passed`；
- Shared：`1 passed`；
- Database：`121 passed / 28 skipped`；
- Workspace / Admin / Mini Program：`35 passed / 2 skipped`；
- 合计：`294 passed / 30 skipped`；
- Admin production build：Pass；
- Mini Program build：Pass；
- `pnpm status:check`：Pass；
- `git diff --check`：Pass。

跳过项均依赖外部 PostgreSQL 环境，与 Phase 9 已接受的 External Integration Test Skip
一致；本次新增的并发、回滚、幂等、性能与输入安全测试没有跳过。

## 10. Future Enhancement

以下项目保持既有范围，不作为本次 Bug：

1. 平台 API 实时同步；
2. BOM / MRP；
3. 财务系统；
4. AI 预测；
5. 物流费用计算；
6. 外部监控与生产负载基线；
7. 在受支持 Node.js 22 与 PostgreSQL 18.x 上执行部署前集成冒烟。

## 11. 腾讯云部署门禁结论

结论：**有条件通过（Conditionally Ready）**。

代码质量门禁、自动化测试、构建、SSOT 状态检查均已通过，Blocker/Critical 未解决问题为
`0`，可以进入腾讯云部署准备。正式切换生产流量前必须：

1. 使用项目声明的 Node.js 22 运行镜像；
2. 在目标 PostgreSQL 18.x 环境执行 Migration、外部集成测试与 T1/T2 冒烟；
3. 确认数据库备份、恢复演练、COS、环境变量与健康检查符合 Task 10-A / 11-A；
4. 任一真实数据库并发或回滚冒烟失败时停止上线。
