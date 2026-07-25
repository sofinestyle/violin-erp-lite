---
document_name: Task 7.6 Database Design Update
project: Violin ERP Lite
version: 1.0
status: Completed / Approved
owner: Project Manager
created_date: 2026-07-25
updated_date: 2026-07-25
related_phase: Phase 7
---

# Task 7.6：Database Design Update

## 1. DCR 对应关系

本文件记录 Task 7.6 Background Job & Distributed Lock 在 Database SSOT 阶段的正式设计更新。

对应已批准文档：

- `docs/phases/phase-07/TASK_7_6_BACKGROUND_JOB_AND_DISTRIBUTED_LOCK.md`；
- `docs/phases/phase-07/TASK_7_6_BACKGROUND_JOB_DATABASE_CHANGE_REQUEST.md`。

本次更新将 Task 7.6 Background Job Database Change Request 纳入 `docs/03-data/DATABASE_SPEC.md`，形成 Database Logical Design v2.4。

本阶段只更新数据库逻辑设计事实来源，不执行以下动作：

1. 不修改 Prisma Schema；
2. 不创建 Migration；
3. 不执行数据库 DDL；
4. 不修改 API Spec；
5. 不修改 Permission；
6. 不编写业务代码；
7. 不修改业务领域表。

## 2. 新增数据库对象

Task 7.6 正式新增 5 个平台技术对象：

| 数据库对象 | 是否新增 | 正式职责 |
| --- | --- | --- |
| `jobs` | 是 | 后台任务主事实、Queue 数据来源、状态和租约事实 |
| `job_attempts` | 是 | Worker 每次执行尝试、错误、耗时和 Retry History |
| `job_results` | 是 | Job 最终安全结果、资源关联和结果摘要 |
| `job_dead_letters` | 是 | 重试耗尽或不可自动恢复 Job 的失败闭环与人工处理 |
| `scheduler_locks` | 是 | Scheduler 防重复触发的租约事实来源 |

Database Logical Design v2.4 的逻辑增量为：

- 新增表：5；
- 新增字段：65；
- 新增主键：5；
- 新增唯一约束/唯一索引：5；
- 新增外键：8；
- 新增普通索引：8；
- 新增 Check：16；
- 新增 PostgreSQL Enum：0。

## 3. 设计原因

Task 7.6 已批准采用 PostgreSQL-backed Queue 与 PostgreSQL-first Distributed Lock 方向。现有 Database Logical Design v2.3 不存在统一后台任务持久化对象，无法安全承载以下平台能力：

1. 通用后台 Job 状态事实；
2. Worker 原子 Claim 与执行租约；
3. Retry Attempt 历史；
4. Job 最终结果；
5. Dead Letter 失败闭环；
6. Scheduler 防重复触发；
7. 与正式审计事实的稳定关联。

如果复用业务状态、普通日志、缓存或 Task 7.5 Idempotency Lease 作为 Job 事实来源，会破坏已批准的职责分离原则。因此，本次新增独立平台技术对象。

## 4. 与现有模型关系

| 现有模型 | 正式职责 | Task 7.6 关系 |
| --- | --- | --- |
| `audit_logs` | 审计事实来源 | 继续记录 Job 创建、认领、执行、失败、重试、Dead Letter、人工处理等审计；不作为 Queue 或 Job 当前状态 |
| `idempotency_records` | 请求级持久化幂等 | 继续负责防重复请求和幂等结果重放；不作为 Worker 执行租约、Job 状态或 Queue |
| `import_tasks` | Import 业务任务 | 可作为 `jobs.target_object_type/object_id` 指向的业务目标；Job 不替代 Import 状态机 |
| `backup_tasks` | Backup 业务/运维任务 | 可作为 Job 目标；Backup 领域结果继续由 `backup_tasks` 保存 |
| `attachments` | Attachment 元数据与生命周期 | 后续可由 Job 支持物理删除与失败恢复；不改变 Attachment 已冻结状态机 |

Task 7.6 新增对象均属于 Platform Foundation，不新增业务模块，不改变业务流程，不修改 Product、SKU、Purchase、Production、Inventory、Inbound、Outbound 或 Cross Border 等业务领域表。

## 5. Enum 与状态设计

本次不新增 PostgreSQL Enum。

以下状态作为字段级 Check 值域进入 Database Logical Design v2.4：

1. `jobs.status`：
   - `pending`；
   - `running`；
   - `retrying`；
   - `succeeded`；
   - `failed`；
   - `dead_letter`；
   - `cancelled`。
2. `job_attempts.status`：
   - `running`；
   - `succeeded`；
   - `failed`；
   - `timed_out`；
   - `cancelled`。
3. `job_results.result_status`：
   - `succeeded`；
   - `failed`；
   - `cancelled`。
4. `job_dead_letters.handling_status`：
   - `open`；
   - `in_review`；
   - `replayed`；
   - `resolved`；
   - `ignored`。

`scheduler_locks` 使用 `locked_until`、`owner_id` 和时间约束表达租约，不新增状态字段。

## 6. Frozen 影响

本次正式影响：

- `docs/03-data/DATABASE_SPEC.md` 从 Database Logical Design v2.3 更新为 v2.4；
- `docs/03-data/DATABASE_ENUM_SPEC.md` 更新为 v1.4，用于记录 Task 7.6 不新增 PostgreSQL Enum，新增状态均为字段级 Check 值域。

本次不影响：

1. `docs/05-api/API_SPEC.md`；
2. Prisma Schema；
3. Migration；
4. Mapping Audit；
5. Permission；
6. DTO；
7. 业务规则；
8. 业务领域表；
9. 已冻结 API Master Specification v1.5。

## 7. 后续边界

后续进入物理同步或实现前，必须另行执行并验收：

1. Forward-only Migration；
2. Prisma Schema 更新；
3. Mapping Audit 更新；
4. PostgreSQL 18.x 空库迁移验证；
5. Queue Claim、Worker、Scheduler、Retry、Dead Letter 和审计实现；
6. 必要测试。

当前阶段不授权实现 Queue、Worker、Scheduler、Distributed Lock、Retry、Dead Letter 处理逻辑或任何业务模块接入。
