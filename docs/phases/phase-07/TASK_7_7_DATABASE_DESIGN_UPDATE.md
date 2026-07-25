---
document_name: Task 7.7 Database Design Update
project: Violin ERP Lite
phase: Phase 7 - Platform Foundation
task: Task 7.7 Cache & Event Infrastructure
version: 1.0
status: Completed / Pending Migration
owner: Project Manager
created_date: 2026-07-25
updated_date: 2026-07-25
related_documents:
  - docs/phases/phase-07/TASK_7_7_EVENT_DATABASE_CHANGE_REQUEST.md
  - docs/phases/phase-07/TASK_7_7_CACHE_EVENT_ARCHITECTURE_DECISION.md
  - docs/03-data/DATABASE_SPEC.md
  - docs/03-data/DATABASE_ENUM_SPEC.md
---

# Task 7.7 Database Design Update

## 1. DCR 对应关系

本设计更新对应已批准的：

- `TASK_7_7_EVENT_DATABASE_CHANGE_REQUEST.md`

本次更新将 Event Infrastructure 数据库对象纳入 Database SSOT：

- `DATABASE_SPEC.md` 升级为 v2.5；
- `DATABASE_ENUM_SPEC.md` 升级为 v1.5；
- 不新增 PostgreSQL Enum；
- 不修改 Prisma Schema；
- 不创建 Migration；
- 不修改 API Contract；
- 不修改 Permission；
- 不编写代码。

## 2. 新增数据库对象

本次新增五个 Event 平台技术对象：

| 对象 | 正式职责 | 是否业务表 |
| --- | --- | --- |
| `event_outbox` | 可靠事件登记与发布状态 | 否 |
| `event_history` | 不可变事件事实保存 | 否 |
| `event_consumptions` | Event Inbox 与消费幂等 | 否 |
| `event_dead_letters` | 事件失败死信闭环 | 否 |
| `event_deliveries` | 事件投递状态追踪 | 否 |

上述对象只属于 Platform Foundation，不新增业务模块，不修改业务流程，不替代任何业务领域表。

## 3. 设计原因

Task 7.7 Architecture Decision 已明确：

- Event System 负责事件发布与订阅；
- Job System 负责后台任务执行；
- Job Queue 不得直接替代 Event Bus；
- 第一阶段不默认引入 Redis、Kafka 或 MQ；
- 可靠事件能力延续 PostgreSQL 优先原则。

因此需要在数据库层提供：

1. 事务内可靠登记事件；
2. 事件事实长期保存；
3. 多消费者消费幂等；
4. 投递状态追踪；
5. 发布、消费、投递失败后的 Dead Letter 闭环；
6. 与 `request_trace_id`、`audit_logs` 和 Job System 的可追踪关系。

## 4. Database SSOT 更新摘要

`DATABASE_SPEC.md` v2.5 新增：

- 正式表：+5；
- 正式字段：+89；
- 主键：+5；
- 唯一约束/唯一索引：+4；
- 外键：+10；
- 普通索引：+24；
- Check：+27；
- PostgreSQL Enum：+0。

逻辑目标 Mapping：

- 正式表：73；
- 正式字段：1330；
- 主键：73；
- 唯一约束/唯一索引：88；
- 外键：310；
- 普通索引：130；
- Check：277；
- 正式数据库枚举：2。

## 5. 字段级 Check 值域

`DATABASE_ENUM_SPEC.md` v1.5 仅同步字段级 Check 值域，不新增 PostgreSQL Enum。

新增字段级 Check 值域：

| 字段 | 允许值 |
| --- | --- |
| `event_outbox.status` | `pending`、`publishing`、`published`、`failed`、`dead_letter`、`cancelled` |
| `event_consumptions.status` | `pending`、`running`、`succeeded`、`retrying`、`failed`、`dead_letter`、`ignored` |
| `event_deliveries.status` | `pending`、`delivering`、`succeeded`、`retrying`、`failed`、`dead_letter`、`cancelled` |
| `event_dead_letters.status` | `open`、`in_review`、`replayed`、`resolved`、`ignored` |
| `event_dead_letters.failure_stage` | `publish`、`consume`、`deliver` |

这些代码不得伪造为 Prisma Enum 或 PostgreSQL Enum。

## 6. 与现有模型关系

| 既有对象 | 关系 |
| --- | --- |
| `jobs` | Event 可触发 Job 创建；Job 不替代 Event History、Outbox、Inbox、Delivery 或 Event Dead Letter |
| `job_attempts` | 记录 Job 执行尝试，不记录事件消费幂等 |
| `audit_logs` | 记录事件生命周期审计，不作为事件事实或事件状态 |
| `idempotency_records` | 负责请求级幂等，不替代 `event_consumptions` 的消费级幂等 |
| `attachments` | 后续可通过事件通知缓存失效或创建后台 Job，事件不修改 Attachment 状态机 |
| `import_tasks` | 后续可发布导入相关事件，事件不替代 Import 业务状态 |
| `inventory_transactions` | 库存流水仍是库存事实来源，事件只可作为派生通知 |

## 7. Frozen 影响

Frozen Document Impact：Required / Completed for Database SSOT。

本次已更新：

- `docs/03-data/DATABASE_SPEC.md`；
- `docs/03-data/DATABASE_ENUM_SPEC.md`。

本次未更新：

- Prisma Schema；
- Migration；
- API Spec；
- Permission；
- DTO；
- 业务规则；
- 业务模块代码。

## 8. 后续实施边界

后续进入 Prisma Schema Sync + Migration 前必须：

1. 基于 `DATABASE_SPEC.md` v2.5 同步 Prisma Schema；
2. 创建独立 Forward-only Migration；
3. 不修改历史 Migration；
4. 不新增 PostgreSQL Enum；
5. 不修改业务领域表；
6. 不修改 API Contract 或 Permission；
7. 完成 Mapping Audit；
8. 使用 PostgreSQL 18.x 验证主键、唯一约束、外键、索引、Check 和空库迁移。

本设计更新不授权 Event Runtime、Publisher、Consumer、Cache Adapter 或业务模块接入实现。
