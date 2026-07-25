---
document_name: Task 7.7 Event Infrastructure Implementation
project: Violin ERP Lite
phase: Phase 7 - Platform Foundation
task: Task 7.7-B Event Infrastructure Implementation
version: 1.0
status: Completed / Pending Review
owner: Project Manager
created_date: 2026-07-25
updated_date: 2026-07-25
related_documents:
  - docs/phases/phase-07/TASK_7_7_CACHE_EVENT_ARCHITECTURE_DECISION.md
  - docs/phases/phase-07/TASK_7_7_EVENT_DATABASE_CHANGE_REQUEST.md
  - docs/phases/phase-07/TASK_7_7_DATABASE_DESIGN_UPDATE.md
  - docs/phases/phase-07/TASK_7_7_EVENT_MAPPING_AUDIT.md
---

# Task 7.7 Event Infrastructure Implementation

## 1. Implementation Scope

本轮完成 Event Infrastructure 最小可用基础能力：

- Prisma Schema 同步；
- Forward-only Migration；
- Mapping Audit；
- Event Envelope；
- Event Registry；
- Transactional Outbox Writer；
- Event Publisher Runtime；
- Event History Writer；
- Consumer Inbox / Idempotency；
- Delivery Tracking；
- Retry Policy；
- Lease Claim / Lease Recovery；
- Dead Letter Handling；
- Event → Job Bridge；
- Trace ID / Audit Integration；
- 单元测试与迁移验证。

本轮不包含：

- Redis；
- Kafka / RabbitMQ / MQ；
- 对外 API；
- Permission 修改；
- Event 管理页面；
- Dead Letter 重放 API；
- 采购、库存、生产等业务模块大规模接入。

## 2. Architecture Boundary

正式边界：

- PostgreSQL 是 Event 状态与事件事实来源；
- Event System 负责发布与订阅；
- Job System 负责后台任务执行；
- Job Queue 不替代 Event Bus；
- Event 不替代业务事实表、库存流水、权限校验、审计日志或请求级幂等。

## 3. File List

新增：

- `packages/database/src/event/event-registry.ts`
- `packages/database/src/event/event-retry-engine.ts`
- `packages/database/src/event/prisma-event-repository.ts`
- `packages/database/src/event/event-runtime.ts`
- `packages/database/tests/event-repository.test.ts`
- `packages/database/tests/event-runtime.test.ts`
- `prisma/migrations/20260725190000_add_event_infrastructure/migration.sql`
- `docs/phases/phase-07/TASK_7_7_EVENT_MAPPING_AUDIT.md`
- `docs/phases/phase-07/TASK_7_7_EVENT_INFRASTRUCTURE_IMPLEMENTATION.md`

更新：

- `prisma/schema.prisma`
- `prisma/mapping-audit.json`
- `packages/database/src/index.ts`
- `packages/database/src/generated/prisma/*`

## 4. Migration

Migration 名称：

- `20260725190000_add_event_infrastructure`

Migration 内容：

- 创建 `event_outbox`；
- 创建 `event_history`；
- 创建 `event_consumptions`；
- 创建 `event_deliveries`；
- 创建 `event_dead_letters`；
- 创建全部主键、唯一约束、外键、普通索引和 Check；
- 不新增 PostgreSQL Enum；
- 不修改历史 Migration；
- 不修改业务领域表。

## 5. Runtime Capability

### 5.1 Event Envelope

统一事件结构包含：

- `eventId`
- `eventType`
- `eventVersion`
- `occurredAt`
- `aggregateType`
- `aggregateId`
- `producer`
- `requestTraceId`
- `actorUserId`
- `payload`
- `metadata`

### 5.2 Event Registry

`EventRegistry` 维护：

- Event Consumer 注册；
- Event Delivery Target 注册；
- 按 `eventType` 获取消费者；
- 按 `eventType + targetType + target` 获取投递目标。

### 5.3 Transactional Outbox Writer

`PrismaEventRepository.registerEvent` 在单个数据库事务中写入：

- `event_history`
- `event_outbox`

保证事件事实与待发布记录原子创建。

### 5.4 Publisher

`EventPublisherRuntime`：

- 恢复过期租约；
- 使用 Repository Claim 待发布事件；
- 为注册 Consumer 创建 Inbox；
- 为注册 Delivery Target 创建 Delivery；
- 成功后标记 Outbox 为 `published`；
- 失败后按 Retry Policy 进入 `failed` 或 `dead_letter`。

### 5.5 Consumer Inbox

`event_consumptions` 通过：

- `event_id + consumer_name` 唯一约束；
- `createMany(skipDuplicates: true)`；

实现消费幂等。

### 5.6 Delivery Tracking

`EventDeliveryRuntime`：

- Claim 待投递记录；
- 调用注册投递目标；
- 成功写入响应摘要；
- 失败进入 Retry 或 Dead Letter。

### 5.7 Retry / Lease / Dead Letter

统一 Retry Policy：

- 最大次数由记录 `max_attempts` 控制；
- Backoff 由 `evaluateEventRetry` 控制；
- Claim 使用租约；
- Recovery 扫描过期租约；
- 重试耗尽写入 `event_dead_letters`。

### 5.8 Event → Job Bridge

`createEventJobBridgeHandler` 支持 Event Handler 创建后台 Job。

该能力只桥接 Event 与 Job，不允许 Job Queue 直接替代 Event Bus。

## 6. Test Result

测试覆盖：

- 业务事务与 Outbox 原子写入；
- 发布成功；
- 发布失败重试；
- 发布租约恢复；
- Event History 写入；
- 多消费者独立消费；
- 同一消费者重复消费保护；
- 消费失败重试 / Dead Letter；
- Delivery 状态追踪；
- Event → Job 创建；
- Trace ID 贯通；
- 多 Worker 并发 Claim 的 Repository 路径；
- Migration 空库验证；
- Migration 增量验证。

最终命令结果以本次提交输出为准。

## 7. Known Limitations

当前暂不包含：

- Redis Cache Adapter；
- Redis Pub/Sub；
- Kafka / RabbitMQ；
- Event 管理 API；
- Dead Letter 重放 API；
- Event 运维 UI；
- 业务模块正式接入。

## 8. Business Module Integration

暂未接入：

- Attachment；
- Import；
- Backup；
- Inventory；
- Purchase；
- Production。

后续业务接入必须基于已批准业务 Service 和正式状态机，不得通过 Event Payload 直接修改业务事实。
