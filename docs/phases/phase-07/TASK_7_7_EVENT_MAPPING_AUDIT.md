---
document_name: Task 7.7 Event Infrastructure Mapping Audit
project: Violin ERP Lite
phase: Phase 7 - Platform Foundation
task: Task 7.7-B Event Infrastructure Implementation
version: 1.0
status: Completed / Pending Review
owner: Project Manager
created_date: 2026-07-25
updated_date: 2026-07-25
related_documents:
  - docs/03-data/DATABASE_SPEC.md
  - docs/03-data/DATABASE_ENUM_SPEC.md
  - docs/phases/phase-07/TASK_7_7_DATABASE_DESIGN_UPDATE.md
  - prisma/schema.prisma
  - prisma/migrations/20260725190000_add_event_infrastructure/migration.sql
---

# Task 7.7 Event Infrastructure Mapping Audit

## 1. Audit Scope

本次 Mapping Audit 覆盖 Task 7.7 Event Infrastructure 新增数据库对象：

- `event_outbox`
- `event_history`
- `event_consumptions`
- `event_dead_letters`
- `event_deliveries`

审计对象：

- Database SSOT v2.5；
- `DATABASE_ENUM_SPEC.md` v1.5；
- Prisma Schema；
- Forward-only Migration；
- Runtime Repository 映射。

## 2. Target Result

Task 7.7 Event Infrastructure 增量目标：

| 项目 | 目标 |
| --- | ---: |
| Tables | 5 |
| Fields | 89 |
| Primary Keys | 5 |
| Unique Constraints / Indexes | 4 |
| Foreign Keys | 10 |
| Normal Indexes | 24 |
| Checks | 27 |
| PostgreSQL Enums | 0 |

审计结果：Matched。

## 3. Object Mapping Matrix

| Object | SSOT | Prisma Schema | Migration SQL | Result |
| --- | --- | --- | --- | --- |
| `event_outbox` | Present | Present | Present | Matched |
| `event_history` | Present | Present | Present | Matched |
| `event_consumptions` | Present | Present | Present | Matched |
| `event_dead_letters` | Present | Present | Present | Matched |
| `event_deliveries` | Present | Present | Present | Matched |

## 4. Field Count

| Object | Fields |
| --- | ---: |
| `event_outbox` | 23 |
| `event_history` | 13 |
| `event_consumptions` | 18 |
| `event_dead_letters` | 18 |
| `event_deliveries` | 17 |
| Total | 89 |

结果：Matched。

## 5. Primary Keys

| Object | Primary Key |
| --- | --- |
| `event_outbox` | `pk_event_outbox (id)` |
| `event_history` | `pk_event_history (id)` |
| `event_consumptions` | `pk_event_consumptions (id)` |
| `event_dead_letters` | `pk_event_dead_letters (id)` |
| `event_deliveries` | `pk_event_deliveries (id)` |

数量：5。结果：Matched。

## 6. Unique Constraints / Indexes

| Object | Unique |
| --- | --- |
| `event_outbox` | `uq_event_outbox_event_id (event_id)` |
| `event_history` | `uq_event_history_event_id (event_id)` |
| `event_consumptions` | `uq_event_consumptions_event_consumer (event_id, consumer_name)` |
| `event_deliveries` | `uq_event_deliveries_event_target (event_id, delivery_target_type, delivery_target)` |

数量：4。结果：Matched。

## 7. Foreign Keys

| Object | Foreign Keys |
| --- | ---: |
| `event_outbox` | 1 |
| `event_history` | 1 |
| `event_consumptions` | 1 |
| `event_dead_letters` | 6 |
| `event_deliveries` | 1 |
| Total | 10 |

结果：Matched。

## 8. Normal Indexes

| Object | Normal Indexes |
| --- | ---: |
| `event_outbox` | 5 |
| `event_history` | 4 |
| `event_consumptions` | 5 |
| `event_dead_letters` | 5 |
| `event_deliveries` | 5 |
| Total | 24 |

结果：Matched。

## 9. Check Value / Constraint Audit

| Object | Checks |
| --- | ---: |
| `event_outbox` | 6 |
| `event_history` | 4 |
| `event_consumptions` | 6 |
| `event_dead_letters` | 5 |
| `event_deliveries` | 6 |
| Total | 27 |

字段级 Check 值域：

- `event_outbox.status`
- `event_consumptions.status`
- `event_deliveries.status`
- `event_dead_letters.status`
- `event_dead_letters.failure_stage`

结果：Matched。

## 10. Defaults / Nullability / Relation

审计结论：

- `id` 均使用 `uuidv7()`；
- `created_at` / `updated_at` 默认值与 SSOT 对齐；
- 状态字段均为 `varchar(50)` / Prisma `String`；
- JSON 字段均为 `jsonb` / Prisma `Json?`；
- 用户外键均为 `RESTRICT / RESTRICT`；
- Event 对象间关系均按 `event_history.event_id` 或对象主键建立；
- 未新增 PostgreSQL Enum；
- 未修改业务领域表。

## 11. Overall Conclusion

Task 7.7 Event Infrastructure Mapping Audit：Passed。

增量结果：

- 5 tables；
- 89 fields；
- 5 primary keys；
- 4 unique constraints / indexes；
- 10 foreign keys；
- 24 normal indexes；
- 27 checks；
- 0 PostgreSQL enums。

后续如修改 Event 表字段、状态、索引、约束、外键或生命周期，必须重新提交 DCR。
