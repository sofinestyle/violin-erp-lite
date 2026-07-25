---
document_name: Task 7.7 Event Infrastructure Database Change Request
project: Violin ERP Lite
phase: Phase 7 - Platform Foundation
task: Task 7.7 Cache & Event Infrastructure
version: 1.0
status: Proposed / Pending Approval
owner: Project Manager
created_date: 2026-07-25
updated_date: 2026-07-25
related_documents:
  - docs/phases/phase-07/TASK_7_7_CACHE_EVENT_ARCHITECTURE_DECISION.md
  - docs/phases/phase-07/TASK_7_7_CACHE_EVENT_CAPABILITY_AUDIT.md
  - docs/03-data/DATABASE_SPEC.md
  - docs/03-data/DATABASE_ENUM_SPEC.md
---

# Task 7.7 Event Infrastructure Database Change Request

## 1. Change Reason

Task 7.7 计划建立统一 Cache & Event Infrastructure。其中 Event Infrastructure 需要支持领域事件（Domain Event）的可靠登记、发布、消费、失败恢复和审计追踪。

根据已批准的 `TASK_7_7_CACHE_EVENT_ARCHITECTURE_DECISION.md`：

- Event System 负责事件发布与订阅；
- Job System 负责后台任务执行；
- Job Queue 不得直接替代 Event Bus；
- 第一阶段不默认引入 Redis、Kafka、MQ 等外部消息系统；
- 可靠事件能力应延续 PostgreSQL 优先原则。

因此 Event Infrastructure 需要数据库持久化能力，用于：

1. 在业务事务提交时可靠登记待发布事件；
2. 保存事件事实，避免事件只存在于进程内存或运行日志中；
3. 为不同消费者提供消费幂等记录；
4. 跟踪事件投递状态、失败原因和重试状态；
5. 建立事件失败闭环，支持人工处理和后续重放；
6. 通过 `request_trace_id`、审计日志和事件记录建立可追踪链路。

本 DCR 仅提出数据库变更设计申请，不修改正式数据库规格、Prisma Schema 或 Migration。

## 2. Existing Capability Analysis

### 2.1 `audit_logs`

`audit_logs` 现有职责是记录系统审计事件，例如操作主体、操作对象、动作、详情和请求追踪信息。

不能替代 Event History / Outbox / Inbox，原因：

- 审计日志是“发生了什么”的审计记录，不是事件发布事实来源；
- 不包含事件发布状态、投递状态、消费者状态或重试状态；
- 不适合作为 `FOR UPDATE SKIP LOCKED` 的事件领取队列；
- 不提供每个消费者维度的幂等约束；
- 不应承载事件死信、重放、投递租约等运行控制语义。

结论：`audit_logs` 可作为 Event Infrastructure 的审计补充，但不能替代事件持久化模型。

### 2.2 `jobs`

`jobs` 是 Task 7.6 建立的后台任务主表，用于描述一次后台执行任务的状态、租约、重试和结果。

不能替代 Event History / Outbox / Inbox，原因：

- Job 表示“需要执行的一项后台任务”，Event 表示“系统中已经发生的事实”；
- Job Queue 是执行队列，不是发布订阅模型；
- 一个事件可能被多个消费者处理，Job 的领取模型不表达多消费者消费状态；
- Job 状态不应成为事件状态事实来源；
- 使用 Job 代替 Event Bus 会违反 Task 7.7 架构边界。

结论：Event 可以触发 Job 创建，但 Job 不能替代事件登记、历史和消费幂等。

### 2.3 `job_attempts`

`job_attempts` 用于记录后台任务每次执行尝试，包括 Worker、开始结束时间和错误信息。

不能替代 Event Delivery / Inbox，原因：

- Attempt 维度属于 Job 执行，不属于事件消费者；
- 不表达 `event_id + consumer_name` 的消费幂等；
- 不表达事件对外投递目标、投递状态和失败闭环；
- 不应混用 Job Attempt 与 Event Consumption Attempt。

结论：`job_attempts` 可用于事件触发后台任务后的任务执行审计，但不能替代事件消费记录。

### 2.4 `idempotency_records`

`idempotency_records` 是 Task 7.5 建立的持久幂等能力，主要用于请求级防重复、租约保护和响应回放。

不能替代 Event Inbox，原因：

- 请求幂等与事件消费幂等是不同边界；
- 请求幂等通常以客户端请求或接口调用为中心，Event Inbox 以 `event_id + consumer_name` 为中心；
- 请求幂等记录可能存在过期与响应回放语义，不适合作为事件长期消费事实；
- Event Consumer 需要独立的重试、死信和消费状态闭环。

结论：Event Infrastructure 可继续使用请求级幂等作为入口保护，但事件消费幂等需要独立数据对象。

## 3. Proposed Database Objects

本 DCR 建议新增以下事件基础设施数据库对象。字段为设计方向，正式字段、类型、约束和索引需在 DCR 批准后进入 Database SSOT 更新。

### 3.1 `event_outbox`

用途：可靠事件登记（Reliable Event Registration）。

是否必要：Required。

设计原因：

- 支持业务事务内写入事件；
- 支持后续异步发布；
- 避免进程崩溃导致事件丢失；
- 为事件发布提供状态、租约、重试和错误记录。

字段方向：

- `id`：主键；
- `event_id`：事件唯一标识；
- `event_type`：事件类型；
- `event_version`：事件版本；
- `aggregate_type`：聚合类型；
- `aggregate_id`：聚合 ID；
- `producer`：事件生产者；
- `payload`：事件载荷；
- `metadata`：事件元数据；
- `request_trace_id`：请求追踪 ID；
- `actor_user_id`：触发用户 ID，可为空；
- `status`：Outbox 发布状态；
- `available_at`：可发布时间；
- `published_at`：发布时间；
- `locked_by`：发布租约持有者；
- `locked_until`：发布租约到期时间；
- `attempt_count`：发布尝试次数；
- `max_attempts`：最大发布尝试次数；
- `last_error_code`：最近错误代码；
- `last_error_message`：最近错误摘要；
- `created_at`；
- `updated_at`。

状态方向：

- `pending`：待发布；
- `publishing`：发布中；
- `published`：已发布；
- `failed`：发布失败；
- `dead_letter`：进入死信；
- `cancelled`：已取消。

索引需求：

- `status + available_at + created_at`：支持待发布事件领取；
- `event_type + created_at`：支持按事件类型查询；
- `aggregate_type + aggregate_id + created_at`：支持聚合维度追踪；
- `locked_until`：支持租约超时恢复；
- `request_trace_id`：支持请求链路追踪。

约束需求：

- `event_id` 唯一；
- `status` Check Value；
- `event_version >= 1`；
- `attempt_count >= 0`；
- `max_attempts >= 1`；
- `locked_by` 与 `locked_until` 的租约字段一致性约束；
- `aggregate_type` 与 `aggregate_id` 的成对使用约束。

### 3.2 `event_history`

用途：事件事实保存（Event Fact History）。

是否必要：Required。

设计原因：

- 保存已经发生的事件事实；
- 与 Outbox 发布状态分离；
- 支持事件审计、追踪和后续补偿分析；
- 避免使用运行日志或审计日志替代事件事实。

字段方向：

- `id`：主键；
- `event_id`：事件唯一标识；
- `event_type`；
- `event_version`；
- `aggregate_type`；
- `aggregate_id`；
- `producer`；
- `payload`；
- `metadata`；
- `request_trace_id`；
- `actor_user_id`；
- `occurred_at`：事件发生时间；
- `created_at`。

状态方向：

- `event_history` 原则上不维护运行状态；
- 事件事实一旦写入，应视为不可变事实；
- 发布、投递和消费状态由 `event_outbox`、`event_deliveries`、`event_consumptions` 承担。

索引需求：

- `event_id` 唯一；
- `event_type + occurred_at`；
- `aggregate_type + aggregate_id + occurred_at`；
- `request_trace_id`；
- `producer + occurred_at`。

约束需求：

- `event_version >= 1`；
- `occurred_at` 必填；
- `aggregate_type` 与 `aggregate_id` 的成对使用约束；
- 事件载荷不得保存敏感信息，敏感字段需要在写入前脱敏或排除。

### 3.3 `event_consumptions` / Inbox

用途：消费幂等（Event Consumer Inbox）。

是否必要：Required。

设计原因：

- 同一事件可能被多个消费者处理；
- 每个消费者必须独立记录处理状态；
- 需要通过 `event_id + consumer_name` 防止重复消费；
- 需要支持消费重试、租约、错误记录和最终失败闭环。

字段方向：

- `id`：主键；
- `event_id`：事件 ID；
- `consumer_name`：消费者名称；
- `handler_name`：处理器名称；
- `status`：消费状态；
- `attempt_count`；
- `max_attempts`；
- `available_at`：下次可消费时间；
- `started_at`；
- `completed_at`；
- `locked_by`；
- `locked_until`；
- `last_error_code`；
- `last_error_message`；
- `last_error_detail`：受控错误详情；
- `request_trace_id`；
- `created_at`；
- `updated_at`。

状态方向：

- `pending`：待消费；
- `running`：消费中；
- `succeeded`：消费成功；
- `retrying`：等待重试；
- `failed`：消费失败；
- `dead_letter`：进入死信；
- `ignored`：确认忽略。

索引需求：

- `consumer_name + status + available_at`：支持消费者领取；
- `status + available_at + created_at`：支持全局恢复扫描；
- `locked_until`：支持租约超时恢复；
- `event_id`：支持事件维度追踪；
- `request_trace_id`：支持链路追踪。

约束需求：

- `event_id + consumer_name` 唯一；
- `status` Check Value；
- `attempt_count >= 0`；
- `max_attempts >= 1`；
- 租约字段一致性约束；
- 成功状态需要 `completed_at`；
- 错误信息必须为安全摘要，不得写入敏感数据。

### 3.4 `event_dead_letters`

用途：失败事件闭环（Event Dead Letter）。

是否必要：Required。

设计原因：

- 支持发布失败、投递失败、消费失败后的统一归档；
- 保留失败原因和必要上下文；
- 支持人工处理、标记解决、忽略或后续重放；
- 避免失败事件只停留在日志中。

字段方向：

- `id`：主键；
- `event_id`：事件 ID；
- `failure_stage`：失败阶段；
- `consumer_name`：消费者名称，可为空；
- `delivery_target`：投递目标，可为空；
- `outbox_id`：Outbox 记录 ID，可为空；
- `consumption_id`：消费记录 ID，可为空；
- `delivery_id`：投递记录 ID，可为空；
- `reason_code`：原因代码；
- `reason_message`：原因摘要；
- `context`：受控上下文；
- `status`：死信处理状态；
- `handled_by`：处理人；
- `handled_at`：处理时间；
- `handling_note`：处理说明；
- `replayed_event_id`：重放后事件 ID，可为空；
- `created_at`；
- `updated_at`。

状态方向：

- `open`：待处理；
- `in_review`：处理中；
- `replayed`：已重放；
- `resolved`：已解决；
- `ignored`：已忽略。

索引需求：

- `status + created_at`：支持待处理列表；
- `event_id`：支持事件追踪；
- `failure_stage + created_at`：支持失败类型分析；
- `consumer_name + status`：支持消费者维度处理；
- `delivery_target + status`：支持投递目标维度处理。

约束需求：

- `status` Check Value；
- `failure_stage` Check Value；
- 至少关联 `outbox_id`、`consumption_id`、`delivery_id` 或 `event_id` 中的一项；
- `replayed` 状态需要 `replayed_event_id`；
- `resolved`、`ignored`、`replayed` 状态需要处理人或处理时间；
- 错误上下文必须脱敏。

### 3.5 `event_deliveries`

用途：投递状态（Event Delivery State）。

是否必要：Required。

设计原因：

- 事件发布后可能需要投递给多个内部或外部目标；
- 投递状态与事件事实、消费状态应分离；
- 需要跟踪每个目标的投递尝试、租约、失败原因和完成时间。

字段方向：

- `id`：主键；
- `event_id`：事件 ID；
- `delivery_target_type`：投递目标类型；
- `delivery_target`：投递目标名称；
- `status`：投递状态；
- `attempt_count`；
- `max_attempts`；
- `available_at`；
- `delivered_at`；
- `locked_by`；
- `locked_until`；
- `last_error_code`；
- `last_error_message`；
- `response_summary`：受控响应摘要；
- `request_trace_id`；
- `created_at`；
- `updated_at`。

状态方向：

- `pending`：待投递；
- `delivering`：投递中；
- `succeeded`：投递成功；
- `retrying`：等待重试；
- `failed`：投递失败；
- `dead_letter`：进入死信；
- `cancelled`：已取消。

索引需求：

- `status + available_at + created_at`：支持投递领取；
- `delivery_target + status + available_at`：支持目标维度处理；
- `event_id`：支持事件追踪；
- `locked_until`：支持租约超时恢复；
- `request_trace_id`：支持链路追踪。

约束需求：

- `event_id + delivery_target_type + delivery_target` 唯一；
- `status` Check Value；
- `attempt_count >= 0`；
- `max_attempts >= 1`；
- 租约字段一致性约束；
- 成功状态需要 `delivered_at`；
- 错误与响应摘要不得保存敏感信息。

## 4. Enum Impact

建议本阶段不新增 PostgreSQL Enum。

原因：

- `DATABASE_ENUM_SPEC.md` 当前正式 PostgreSQL Enum 范围较小；
- Task 7.6 Background Job 相关状态采用字段级 Check Value，而不是 PostgreSQL Enum；
- Event Infrastructure 状态仍处于平台基础能力设计阶段，后续可能随实现边界调整；
- 使用 `varchar` / `text` + Check Constraint 更符合当前数据库设计演进方式。

建议新增字段级 Check Value：

- Outbox Status；
- Event Consumption Status；
- Event Delivery Status；
- Event Dead Letter Status；
- Event Failure Stage。

正式状态值需在 DCR 批准后同步进入 `DATABASE_SPEC.md`，如项目负责人要求集中枚举治理，再评估是否更新 `DATABASE_ENUM_SPEC.md`。

## 5. Relation With Existing Objects

### 5.1 与 `jobs`

- `jobs` 继续负责后台任务执行；
- Event System 负责事件发布、投递与消费状态；
- Event Consumer 可以在处理事件时创建 Job；
- Job 的执行状态不得替代 Event 的发布、消费或投递状态；
- 如后续需要记录事件触发的 Job，可在实现设计中评估是否建立可选关联字段或通过 `request_trace_id` 追踪。

### 5.2 与 `audit_logs`

- `audit_logs` 继续记录操作审计；
- Event Infrastructure 的关键生命周期动作可以写入 `audit_logs`；
- `audit_logs` 不作为事件事实来源；
- 事件事实、投递状态、消费状态和死信状态由 Event 专用表负责；
- `request_trace_id` 可作为审计日志与事件记录的链路关联。

### 5.3 与 `idempotency_records`

- `idempotency_records` 继续负责请求级幂等；
- Event Inbox 通过 `event_id + consumer_name` 负责消费级幂等；
- 两者边界不同，不互相替代；
- 如事件来自幂等请求，可通过 `request_trace_id` 或后续批准的关联字段建立追踪关系。

## 6. API Impact

API Change Request：Not Required。

原因：

- 本 DCR 仅申请内部平台数据库能力；
- 不新增对外 API；
- 不修改现有 API Contract；
- 不新增 DTO、Permission 或 API Status。

如果后续需要提供事件查询、死信处理、事件重放或运维管理接口，必须另行提交 API Change Request。

## 7. Migration Impact

Migration Impact：Not Yet。

当前阶段禁止：

- 修改 Prisma Schema；
- 创建 Migration；
- 修改 `DATABASE_SPEC.md`；
- 修改 `DATABASE_ENUM_SPEC.md`。

DCR 批准后，下一阶段应先更新 Database SSOT，再同步 Prisma Schema，并创建 Forward-only Migration。

## 8. Approval Requirement

需要项目负责人批准以下事项：

1. 是否新增 `event_outbox`；
2. 是否新增 `event_history`；
3. 是否新增 `event_consumptions` 作为 Event Inbox；
4. 是否新增 `event_dead_letters`；
5. 是否新增 `event_deliveries`；
6. 是否采用 `varchar` / `text` + Check Value，而不是 PostgreSQL Enum；
7. 各对象的状态值集合；
8. 各对象的主键、唯一约束、索引、外键和 Check Constraint；
9. Event Payload / Metadata / Error Context 的敏感信息存储边界；
10. Event 与 `jobs`、`audit_logs`、`idempotency_records` 的关系边界；
11. 是否需要事件保留周期、归档策略或清理策略；
12. 是否允许后续基于该 DCR 更新 `DATABASE_SPEC.md`、Prisma Schema 和 Migration。

本 DCR 批准前，不得执行任何数据库 Schema、Migration、API 或代码实现变更。
