---
document_name: Task 7.7 Cache & Event Infrastructure Capability Audit
project: Violin ERP Lite
version: 1.0
status: Completed / Pending Approval
owner: Project Manager
created_date: 2026-07-25
updated_date: 2026-07-25
related_phase: Phase 7
---

# Task 7.7：Cache & Event Infrastructure Capability Audit

## 1. 审计范围

本文件仅审计当前仓库中 Cache 与 Event Infrastructure 的已有能力、缺口和变更影响。

本轮不授权：

1. 修改代码；
2. 修改 Database Schema 或 Migration；
3. 修改 API Spec；
4. 修改 Permission；
5. 新增依赖；
6. 引入 Redis、Kafka、RabbitMQ、SQS、NATS、BullMQ 或其他外部消息基础设施；
7. 接入业务模块。

## 2. Capability Matrix

| Capability | Status | Evidence |
|---|---|---|
| Cache | Missing | `apps/admin/lib/health.ts` 使用 `cache: "no-store"`；`packages/api/src/attachment/download.ts` 设置 `Cache-Control: private, no-store, max-age=0`；未发现平台级 Cache Layer、Cache Adapter、统一 TTL 或失效策略。 |
| Redis | Missing | 根目录与 workspace `package.json` 未声明 `redis`、`ioredis`、`@upstash/redis` 等依赖；`.env.example` 和 `compose.yaml` 未发现 Redis 运行配置；Task 7.6 明确不默认引入 Redis Queue。 |
| Event Bus | Missing | 未发现通用 `EventBus`、`event-bus`、Publish/Subscribe 抽象或跨模块事件分发器。 |
| Domain Event | Partial / Localized | Attachment Lifecycle API 可从 `audit_logs` 派生 `attachment.*` 事件；Job Audit 记录 `job.*`、`job_attempt.*`、`job.dead_letter.*` 审计动作。但这些是审计事件或生命周期展示事件，不是统一 Domain Event 模型。 |
| Publisher | Missing | 未发现通用 Event Publisher、提交后发布（after-commit publish）或 Outbox Publisher。 |
| Consumer | Missing | 未发现通用 Event Consumer、Subscriber、Handler Registry、Inbox 或幂等消费机制。 |
| Audit | Existing / Reusable | `packages/api/src/audit/audit.ts` 提供 `AuditEvent`、脱敏与 `recordAuditEvent`；`packages/database/src/audit/prisma-audit-writer.ts` 写入 `audit_logs`；Task 7.6 Job Repository 已写入 Job 生命周期、Retry、Timeout 和 Dead Letter Audit。 |

## 3. Cache Capability Audit

### 3.1 是否存在 Cache Layer

当前未发现统一 Cache Layer。

现有相关能力只包括：

1. Admin Health 请求显式使用 `cache: "no-store"`；
2. Attachment Download 响应显式设置 `Cache-Control: private, no-store, max-age=0`；
3. 构建工具和第三方依赖内部存在缓存包或构建缓存，但不属于 Violin ERP Lite 运行时平台缓存能力。

### 3.2 是否存在 Redis

当前未引入 Redis。

审计结果：

1. 无 Redis 运行时依赖；
2. 无 Redis 连接配置；
3. 无 Redis Adapter；
4. 无 Redis Queue；
5. 无 Redis Lock；
6. 无 Redis Pub/Sub。

Task 7.6 已批准 PostgreSQL-backed Queue 作为后台任务第一阶段方案，且明确不默认引入 Redis Queue、Kafka、RabbitMQ、SQS 或其他外部 MQ。

### 3.3 是否存在 Cache Adapter

当前未发现统一 Cache Adapter。

没有发现：

1. `CacheAdapter` 接口；
2. 内存 Cache Adapter；
3. Redis Cache Adapter；
4. 数据库派生缓存 Adapter；
5. 多端统一缓存契约。

### 3.4 是否存在缓存策略

当前未发现正式缓存策略。

已有代码倾向于禁止缓存高风险响应，尤其是认证、健康检查、附件下载等路径。尚未形成以下正式策略：

1. 哪些数据允许缓存；
2. 哪些数据禁止缓存；
3. 缓存 Key 规范；
4. Data Scope / Permission 参与缓存 Key 的规则；
5. 缓存命中是否需要二次权限校验；
6. 缓存是否允许跨用户、跨角色或跨租约复用。

### 3.5 是否存在 TTL

当前未发现统一 TTL 配置。

已有 TTL / 过期概念存在于其他平台能力中，例如：

1. `idempotency_records.expires_at`；
2. `jobs.locked_until`；
3. `scheduler_locks.locked_until`。

这些字段是幂等、Job Lease 与 Scheduler Lock 的生命周期控制，不是 Cache TTL。

### 3.6 是否存在 Cache Invalidation

当前未发现统一 Cache Invalidation 能力。

未发现：

1. 主数据变更后的缓存失效；
2. 权限变更后的缓存失效；
3. 库存变更后的缓存失效；
4. Attachment 状态变更后的缓存失效；
5. 事件驱动失效机制。

## 4. Event Capability Audit

### 4.1 是否存在 Event Bus

当前未发现通用 Event Bus。

没有发现：

1. Event Envelope；
2. Event Bus Interface；
3. Event Registry；
4. Subscribe / Publish API；
5. Transaction after-commit 发布机制。

### 4.2 是否存在 Domain Event

当前不存在统一 Domain Event 模型。

已有相近能力：

1. `audit_logs` 保存审计事实；
2. Attachment Lifecycle API 从 Attachment 状态和 Audit Log 派生生命周期事件；
3. Task 7.6 Job Audit 记录 Job 生命周期事件；
4. Request Context 与结构化日志提供 Request ID / Trace 信息。

边界：

1. 审计事件不是 Domain Event；
2. 日志不是 Event History；
3. Job 状态不是业务事件；
4. Attachment Lifecycle 展示事件不是通用 Event Bus。

### 4.3 是否存在 Event Publisher

当前未发现通用 Event Publisher。

现有模块直接调用 `recordAuditEvent` 写审计，不等于发布事件。没有发现：

1. Outbox Publisher；
2. after-commit Publisher；
3. 事件重试发布；
4. 发布失败补偿；
5. 发布审计与投递状态。

### 4.4 是否存在 Event Consumer

当前未发现通用 Event Consumer。

Task 7.6 Worker Runtime 是 Job Consumer，但它消费的是 `jobs` 队列表，不是通用事件流。当前未发现：

1. Event Consumer Registry；
2. Event Handler Interface；
3. Event Inbox；
4. 幂等消费记录；
5. 消费失败恢复；
6. Dead Letter Event。

### 4.5 是否存在 Event Handler

当前未发现平台级 Event Handler。

已有 Handler 概念存在于 Job Worker Runtime 的 `JobHandler`，其正式职责是执行后台 Job，不是 Event Handler。后续如复用 Job System 处理异步事件，必须先完成 Task 7.7 Architecture Decision，明确 Job 与 Event 的职责边界。

## 5. Message Infrastructure Audit

### 5.1 Queue

已有 PostgreSQL-backed Job Queue，属于 Task 7.6 Background Job 能力。

边界：

1. Queue 事实来源是 `jobs`；
2. `FOR UPDATE SKIP LOCKED` 用于 Job Claim；
3. Queue 用于后台任务执行，不等于 Event Bus；
4. 不得将 Job Queue 直接冒充通用 Pub/Sub。

### 5.2 Pub/Sub

当前未发现 Pub/Sub 能力。

没有发现：

1. Redis Pub/Sub；
2. PostgreSQL LISTEN / NOTIFY；
3. Kafka Topic；
4. RabbitMQ Exchange；
5. NATS Subject；
6. 应用内统一订阅机制。

### 5.3 Message Broker

当前未引入 Message Broker。

没有发现：

1. Kafka；
2. RabbitMQ；
3. SQS；
4. NATS；
5. BullMQ；
6. Redis Streams。

### 5.4 Async Event

当前没有统一 Async Event Infrastructure。

Task 7.6 提供异步 Job 执行能力，可作为后续 Event Consumer 的一种执行载体，但需要先定义：

1. Event Envelope；
2. Event Store / Outbox 是否持久化；
3. 发布事务边界；
4. 消费幂等；
5. 重试与 Dead Letter 归属；
6. Event Audit 与业务 Audit 的关系。

## 6. Redis Audit

当前 Redis 未引入。

结论：

1. 当前系统无 Redis 依赖；
2. 当前系统无 Redis 配置；
3. 当前系统无 Redis 运行时用途；
4. 当前系统无 Redis Queue、Redis Lock、Redis Cache 或 Redis Pub/Sub；
5. 如 Task 7.7 后续决定引入 Redis，必须先完成 Architecture Decision，明确其仅作为派生加速层或消息基础设施，不得成为库存、权限、状态、审计或业务一致性的唯一事实来源。

## 7. Audit / Trace / Event History

### 7.1 Event Audit

已有 `audit_logs` 作为正式审计事实来源。

已存在能力：

1. `AuditEvent`；
2. `sanitizeAuditEvent`；
3. `recordAuditEvent`；
4. `PrismaAuditWriter`；
5. Authentication、Master Data、Workflow、Attachment、Job 等模块的审计写入。

缺口：

1. 未区分 Event Audit 与 Business Audit；
2. 未定义事件发布审计；
3. 未定义事件消费审计；
4. 未定义事件重放审计；
5. 未定义事件 Dead Letter 审计。

### 7.2 Trace

已有 Request ID / Trace 基础能力。

证据：

1. `RequestContext` 提供 `requestId` 与 `timestamp`；
2. 结构化 Logger 自动带入 Request ID；
3. `audit_logs.request_trace_id` 保存请求链路；
4. `jobs.request_trace_id` 与 `job_attempts.request_trace_id` 保存后台任务链路。

缺口：

1. 未定义 Event Trace Envelope；
2. 未定义跨 Job / Event / HTTP 请求的统一关联字段；
3. 未定义事件处理链路的 Trace 传播规则。

### 7.3 Event History

当前没有独立 Event History。

`audit_logs` 可记录审计事实，但不得替代 Event Store。后续如果需要可靠事件历史、重放、消费位点或外部投递状态，预计需要新增持久化对象，并应先提交 Database Change Request。

## 8. Existing Integration Analysis

### 8.1 Job System

已有能力：

1. PostgreSQL-backed Queue；
2. Worker Runtime；
3. Scheduler Runtime；
4. Retry；
5. Dead Letter；
6. Lease Timeout Recovery；
7. Job Audit。

与 Task 7.7 的关系：

1. Job System 可作为异步事件处理的执行载体；
2. Job System 不等于 Event Bus；
3. Event 产生、存储、发布和消费边界仍需单独设计；
4. 若 Event Consumer 使用 Job，需要明确 Job Key、幂等、Retry、Dead Letter 与 Event ID 的映射。

### 8.2 Attachment

已有能力：

1. Attachment Service；
2. Attachment Audit；
3. Attachment Lifecycle 查询；
4. Storage 补偿与删除状态机。

与 Task 7.7 的关系：

1. Attachment 可成为后续事件来源，例如上传成功、关联创建、软删除、物理删除失败；
2. 当前 Attachment 事件主要是审计和生命周期展示事件；
3. 尚未发布 Domain Event；
4. 不得用 Event 替代 Attachment 状态机或删除保护规则。

### 8.3 Import

已有能力：

1. `import_tasks` 业务任务表；
2. 文件摘要去重；
3. Import 状态字段级 Check。

与 Task 7.7 的关系：

1. Import 可作为后续异步处理和事件发布重点场景；
2. `import_tasks.status` 继续是 Import 业务状态；
3. Event 不得替代 Import 状态；
4. 如需 Import Event History 或 Outbox，需要 DCR 判断。

### 8.4 Inventory

已有能力：

1. Inventory Workflow；
2. 库存事务与审计；
3. 禁止负库存等 Frozen 业务规则。

与 Task 7.7 的关系：

1. Inventory Event 可以用于后续派生通知、统计刷新或缓存失效；
2. Event 不得作为库存余额事实来源；
3. Cache 不得缓存绕过库存事务和负库存校验；
4. 任何库存相关缓存必须以数据库正式事实为准，并在权限与数据范围校验后使用。

### 8.5 Audit Logs

已有能力：

1. 审计事件脱敏；
2. `audit_logs` 持久化；
3. Request Trace；
4. Attachment / Job 等模块已写入审计。

与 Task 7.7 的关系：

1. Audit Logs 是审计事实来源；
2. Audit Logs 可作为部分生命周期展示的派生来源；
3. Audit Logs 不得替代 Event Store；
4. 事件发布、消费、重放和失败处理需要独立边界。

## 9. Gap Analysis

### A. 已存在

1. Request ID / Trace 基础能力；
2. 结构化日志；
3. `audit_logs` 审计事实来源；
4. `recordAuditEvent` 与 `PrismaAuditWriter`；
5. Task 7.6 PostgreSQL-backed Job Queue；
6. Task 7.6 Worker、Scheduler、Retry、Dead Letter、Lease Recovery；
7. Attachment Lifecycle 查询中的派生事件展示。

### B. 需要完善

1. Cache 使用边界：哪些数据允许缓存、哪些必须 `no-store`；
2. Cache Key 规范：必须包含用户、权限、数据范围或业务范围的场景；
3. Cache TTL 与失效策略；
4. Event 与 Audit 的职责边界；
5. Event 与 Job 的职责边界；
6. Event Trace Envelope；
7. Event Handler 与 Job Handler 的关系；
8. Event 发布失败、消费失败、重放和 Dead Letter 策略。

### C. 缺失

1. Cache Layer；
2. Cache Adapter；
3. Redis 或其他缓存基础设施；
4. Cache Invalidation；
5. Event Bus；
6. Domain Event Envelope；
7. Event Publisher；
8. Event Consumer；
9. Event Handler Registry；
10. Outbox / Inbox；
11. Event History；
12. Pub/Sub；
13. Message Broker；
14. Event Dead Letter。

## 10. Change Impact

### Database CR

Not Required for this Capability Audit.

后续若 Task 7.7 决定新增以下持久化对象，则需要 Database Change Request：

1. Event Outbox；
2. Event Inbox；
3. Event History；
4. Event Delivery State；
5. Event Dead Letter；
6. Cache Metadata 或 Cache Invalidation State。

### API CR

Not Required for this Capability Audit.

后续若新增客户端可见能力，则需要 API Change Request，例如：

1. Event 查询 API；
2. Event 重放 API；
3. Cache 管理 API；
4. Event Delivery / Dead Letter 管理 API；
5. 新增 DTO、权限或错误码。

### Architecture Decision

Required before implementation.

原因：

1. 必须先决定 Task 7.7 是否继续 PostgreSQL-first；
2. 必须决定是否引入 Redis 或 Message Broker；
3. 必须明确 Cache 只作为派生加速层，不得作为权限、库存、状态或审计事实来源；
4. 必须明确 Event 只传播已提交事实，不得替代业务状态、审计事实或 Job 状态；
5. 必须明确 Event 与 Job、Audit、Idempotency 的边界。

## 11. 审计结论

当前 Violin ERP Lite 已具备可复用的 Request Trace、Audit Logs 与 PostgreSQL-backed Job System，但尚未具备正式 Cache Layer 或 Event Infrastructure。

Task 7.7 后续应先完成 Architecture Decision，再判断是否需要 DCR / API CR。若保持内聚、轻量、PostgreSQL-first 的第一阶段路线，可优先设计：

1. Cache Policy 与 Cache Adapter 契约；
2. Event Envelope；
3. Event 与 Audit / Job 的边界；
4. 是否需要 Outbox / Inbox；
5. 是否引入 Redis 或继续避免新增基础设施。

