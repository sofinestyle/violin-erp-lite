---
document_name: Task 7.7 Cache & Event Infrastructure Architecture Decision
project: Violin ERP Lite
version: 1.0
status: Completed / Pending Approval
owner: Project Manager
created_date: 2026-07-25
updated_date: 2026-07-25
related_phase: Phase 7
---

# Task 7.7：Cache & Event Infrastructure Architecture Decision

## 1. Cache Architecture Decision

### 1.1 是否引入 Cache Layer

决策：

引入统一 Cache Layer 设计，但本阶段不实现代码、不新增依赖、不修改 API、不修改数据库。

Cache Layer 的定位是派生加速层（Derived Acceleration Layer），只能缓存可重新从正式事实来源计算或读取的数据。

缓存不得成为：

1. 库存事实来源；
2. 权限事实来源；
3. 业务状态事实来源；
4. 审计事实来源；
5. 幂等事实来源；
6. Job 状态事实来源；
7. Event 历史事实来源。

任何缓存命中结果在用于敏感资源、权限、数据范围或业务状态判断前，仍必须遵守正式 Service 的权限、数据范围、状态和业务规则校验。

### 1.2 是否引入 Redis

决策：

第一阶段不引入 Redis。

原因：

1. 当前 Capability Audit 未发现 Redis 依赖、配置或正式用途；
2. Task 7.6 已采用 PostgreSQL-backed Queue，不需要 Redis Queue；
3. 当前阶段应优先定义 Cache 与 Event 的职责边界；
4. 缓存不允许成为库存、权限、状态或审计事实来源；
5. 引入 Redis 会增加运行基础设施、故障模式和一致性边界，需要独立批准。

Redis 后续可作为可选实现，但必须先经过 Architecture Decision 更新，并明确其仅作为：

1. 派生缓存；
2. 非关键通知加速；
3. 可丢弃的运行时优化层。

Redis 不得用于：

1. 库存余额裁决；
2. 权限授予或撤销裁决；
3. 业务状态机裁决；
4. 审计事实保存；
5. 幂等唯一裁决；
6. Job Queue 第一阶段替代；
7. 分布式锁替代数据库约束或事务。

### 1.3 Cache Adapter 设计方向

决策：

后续实现应定义 `CacheAdapter` 契约，但本阶段不实现。

建议 Adapter 边界：

1. `get(key)`：读取派生缓存；
2. `set(key, value, ttl)`：写入带 TTL 的缓存；
3. `delete(key)`：删除单个 Key；
4. `deleteByPrefix(prefix)`：删除命名空间；
5. `withCache(policy, loader)`：统一缓存读取与回源流程；
6. `isAvailable()`：标识缓存依赖是否可用。

第一阶段建议优先支持：

1. `NoopCacheAdapter`：默认不缓存，保证行为安全；
2. `InMemoryCacheAdapter`：仅测试或单进程本地开发可用，不得描述为生产级分布式缓存；
3. 后续 Redis Adapter：需另行批准。

所有 Adapter 必须支持缓存不可用降级到正式数据源，不得因缓存不可用导致业务写入错误、权限绕过或状态不一致。

### 1.4 TTL 策略

决策：

所有缓存必须显式 TTL，禁止无限期缓存。

建议分层：

| 数据类型 | 缓存策略 |
| --- | --- |
| 健康检查、认证、附件下载 | 默认 `no-store` |
| 权限与数据范围 | 默认不缓存；如后续缓存，TTL 必须极短且必须支持权限变更失效 |
| 主数据只读列表 | 可短 TTL 缓存，但必须按用户、权限、数据范围和查询条件隔离 |
| 库存余额、库存流水、业务状态 | 默认不缓存；后续如缓存只能作为展示加速，写入和校验必须回源数据库 |
| 审计日志 | 不缓存为事实来源；可在只读查询场景做短 TTL 派生缓存 |
| Job / Event 状态 | 不使用 Cache 作为状态事实来源 |

TTL 必须由 Cache Policy 定义，不得由调用方随意传入任意值。

### 1.5 Cache Key 规范

决策：

Cache Key 必须结构化、稳定、可审计，禁止使用未脱敏原始请求体、Token、Secret、Storage 私有路径或真实敏感业务内容。

推荐 Key 结构：

```text
vel:{environment}:{module}:{resource}:{scope}:{hash}
```

必须包含的隔离因素：

1. 环境；
2. 模块；
3. 资源类型；
4. 查询参数 Hash；
5. 用户 ID 或角色范围；
6. Permission 版本或权限摘要；
7. Data Scope 摘要；
8. 业务对象 ID 或组织范围。

禁止：

1. 跨用户共享含权限差异的数据；
2. 跨数据范围共享结果；
3. 用前端缓存 Key 替代服务端权限校验；
4. 在 Key 或 Value 中保存 Token、密码、Storage 私有路径或敏感原文。

### 1.6 Permission / Data Scope 影响

决策：

缓存读取不得绕过权限和数据范围。

规则：

1. 权限校验必须发生在正式 Service 边界；
2. 数据范围必须参与缓存 Key；
3. 权限变化、角色变化、用户状态变化后，相关缓存必须失效或自然极短 TTL 过期；
4. 敏感附件、用户管理、安全管理和审计查询默认不进入共享缓存；
5. 缓存命中结果仍只能返回当前用户可见字段。

### 1.7 Cache Invalidation 策略

决策：

第一阶段采用显式失效 + 短 TTL 的组合策略。

失效来源：

1. 写操作成功提交后，主动失效相关 Cache Key；
2. 权限、角色、用户状态变更后，失效用户与角色相关缓存；
3. Attachment 状态、Link、Storage 补偿变更后，失效附件只读派生缓存；
4. 库存事务提交后，失效相关 SKU、仓库和报表派生缓存；
5. 后续 Event Infrastructure 可作为失效通知来源，但事件通知不得替代数据库事务。

如果后续需要跨进程可靠失效通知，则需要 Event Persistence 或外部消息机制，并应先完成 DCR / Architecture Decision 更新。

## 2. Event Architecture Decision

### 2.1 是否建立 Domain Event 模型

决策：

建立统一 Domain Event 模型。

Event 的职责是传播已经提交的事实（Committed Facts），用于：

1. 派生缓存失效；
2. 异步通知；
3. 后台派生任务创建；
4. 统计刷新；
5. 跨模块弱耦合协作。

Event 不得替代：

1. 业务状态；
2. 库存流水；
3. 审计日志；
4. Job 状态；
5. 幂等记录；
6. 数据库事务；
7. 权限和数据范围校验。

### 2.2 Event Envelope 设计

决策：

后续实现必须使用统一 Event Envelope。

建议字段：

| 字段 | 说明 |
| --- | --- |
| `event_id` | Event 唯一 ID |
| `event_type` | 事件类型，例如 `attachment.upload.succeeded` |
| `event_version` | 事件结构版本 |
| `occurred_at` | 事实发生时间 |
| `published_at` | 发布登记时间 |
| `aggregate_type` | 聚合或对象类型 |
| `aggregate_id` | 聚合或对象 ID |
| `producer` | 事件生产模块 |
| `request_trace_id` | 请求链路 ID |
| `actor_user_id` | 操作者；系统事件可空 |
| `payload` | 脱敏事件载荷 |
| `metadata` | 脱敏元数据 |

Envelope 不得包含：

1. 文件本体；
2. Token；
3. Secret；
4. 密码；
5. Storage 私有路径；
6. 未脱敏个人敏感信息；
7. 可绕过权限判断的完整业务快照。

### 2.3 Event Publisher

决策：

建立 Event Publisher 设计边界，但实现前必须先完成 Database CR。

Publisher 职责：

1. 接收已提交事实形成的 Event Envelope；
2. 记录发布事实；
3. 保证同一业务事实不重复发布；
4. 支持失败重试；
5. 保留发布审计；
6. 不在事务提交前对外发布事件。

禁止：

1. 在数据库事务未提交前发布外部事件；
2. 使用普通日志代替 Event Publisher；
3. 使用 Job Queue 直接代替 Event Bus；
4. 使用前端状态或缓存触发正式事件。

### 2.4 Event Consumer

决策：

建立 Event Consumer 设计边界，但实现前必须先完成 Database CR。

Consumer 职责：

1. 按 Event Type 分发到 Handler；
2. 记录消费状态；
3. 支持幂等消费；
4. 支持失败重试；
5. 支持消费 Dead Letter；
6. 保留消费审计和 Trace。

Consumer 不得：

1. 绕过业务 Service；
2. 直接修改库存余额；
3. 使用 Event Payload 替代正式数据库读取；
4. 使用 Event 代替业务状态机。

### 2.5 Event Handler

决策：

建立 Event Handler 契约。

Handler 输入必须是 Event Envelope 与安全执行上下文。Handler 只能执行获批的派生动作，例如：

1. 失效缓存；
2. 创建后台 Job；
3. 刷新统计派生数据；
4. 发送内部通知；
5. 记录消费审计。

如果 Handler 需要产生业务副作用，必须经过对应业务 Service、数据库事务、权限或系统身份边界，并满足幂等要求。

## 3. Event Persistence

### 3.1 是否需要 Outbox Pattern

决策：

需要。

原因：

1. Event 必须传播已提交事实；
2. 事务内业务写入与事件登记必须保持一致；
3. 进程内内存事件无法支持重启恢复；
4. 普通日志无法支持可靠投递、重试、消费位点或 Dead Letter；
5. Task 7.7 需要避免各模块自建平行事件机制。

影响：

需要 Database Change Request。

### 3.2 是否需要 Event History

决策：

第一阶段需要最小 Event History。

Event History 的用途是记录事件创建、发布、处理状态和审计关联。它不是业务状态事实来源，也不替代 `audit_logs`。

影响：

需要 Database Change Request。

### 3.3 是否需要 Inbox

决策：

如果实现 Event Consumer，则需要 Inbox 或等价的消费幂等记录。

原因：

1. 防止重复消费；
2. 支持 Handler 幂等；
3. 支持失败恢复；
4. 支持消费状态审计；
5. 支持 Consumer 横向扩展。

影响：

需要 Database Change Request。

### 3.4 是否需要 Event Dead Letter

决策：

需要。

Event Dead Letter 用于事件消费失败闭环，不自动修改业务数据，不替代 Task 7.6 Job Dead Letter。

影响：

需要 Database Change Request。

### 3.5 DCR 边界

本 Architecture Decision 不修改 Database Spec、Prisma Schema 或 Migration。

进入 Task 7.7 实现前，应先提交 DCR，至少评估以下对象：

1. `event_outbox`；
2. `event_inbox`；
3. `event_deliveries`；
4. `event_dead_letters`；
5. 必要索引、唯一约束、状态值域 Check；
6. 与 `audit_logs`、`jobs`、`idempotency_records` 的关系。

## 4. Job 与 Event 边界

### 4.1 Task 7.6 Job System 职责

Task 7.6 Job System 负责后台任务执行。

职责包括：

1. Job 创建；
2. Queue Claim；
3. Worker 执行；
4. Scheduler 触发；
5. Retry；
6. Dead Letter；
7. Lease Timeout Recovery；
8. Job Audit。

Job 的事实来源是 `jobs`、`job_attempts`、`job_results`、`job_dead_letters` 和 `scheduler_locks`。

### 4.2 Task 7.7 Event System 职责

Task 7.7 Event System 负责事件发布与订阅。

职责包括：

1. Event Envelope；
2. Event Outbox；
3. Event Publisher；
4. Event Consumer；
5. Event Handler；
6. Event Inbox；
7. Event Dead Letter；
8. Event Trace。

### 4.3 禁止 Job Queue 替代 Event Bus

禁止：

1. 直接把 `jobs` 当作 Event Store；
2. 直接把 Job Queue 当作 Pub/Sub；
3. 用 Job 状态表示业务事件是否已发布；
4. 用 Job Dead Letter 替代 Event Dead Letter；
5. 用 Job Attempt 替代 Event Delivery；
6. 用 Scheduler 替代 Event Publisher。

允许：

1. Event Consumer 在必要时创建 Job；
2. Job Handler 在业务事实提交后请求发布事件；
3. Event Handler 使用 Job System 执行长耗时派生任务；
4. Event 与 Job 通过 `request_trace_id` 和受控关联字段建立链路。

## 5. Redis Decision

### 5.1 Redis 是否用于 Cache

当前决策：

不在第一阶段引入 Redis Cache。

后续如果引入 Redis Cache，必须满足：

1. Redis 只保存派生缓存；
2. 缓存必须有 TTL；
3. 缓存 Key 必须包含权限和数据范围隔离；
4. Redis 不可用时必须回源数据库；
5. Redis 数据不得作为业务一致性裁决依据。

### 5.2 Redis 是否用于 Pub/Sub

当前决策：

不在第一阶段引入 Redis Pub/Sub。

原因：

1. Redis Pub/Sub 不提供默认持久化投递保证；
2. 当前更需要先建立 Outbox / Inbox 可靠事件边界；
3. Pub/Sub 可作为后续加速通知层，但不得替代 Event Persistence。

### 5.3 Redis 是否用于 Lock

当前决策：

不使用 Redis Lock。

原因：

1. Task 7.5 Idempotency Lease 已由 PostgreSQL 提供；
2. Task 7.6 Scheduler Lock 已由 PostgreSQL `scheduler_locks` 提供；
3. Lock 不得替代数据库约束、事务或业务一致性。

### 5.4 Redis 是否用于 Queue

当前决策：

不使用 Redis Queue。

Task 7.6 已批准并实现 PostgreSQL-backed Queue。任何改用 Redis Queue、BullMQ 或其他消息队列，都必须另行提交 Architecture Decision，并评估 Database / API / 运维影响。

### 5.5 故障处理

如果后续引入 Redis，故障处理必须遵守：

1. Redis 故障不得导致权限放宽；
2. Redis 故障不得导致库存状态错误；
3. Redis 故障不得丢失审计事实；
4. Redis 故障不得丢失已提交业务事件；
5. Redis 故障时 Cache 回源正式数据库；
6. Redis 仅作为加速或通知层，不作为唯一事实来源。

## 6. Audit / Trace

### 6.1 Event 与 `audit_logs`

决策：

Event 与 `audit_logs` 职责分离。

`audit_logs` 负责：

1. 记录谁在什么时间执行了什么操作；
2. 记录操作结果、失败原因和脱敏前后快照；
3. 作为审计事实来源；
4. 支持审计查询与导出。

Event 负责：

1. 表达已提交业务或平台事实；
2. 驱动派生动作；
3. 支持发布、消费、重试和 Dead Letter；
4. 支持跨模块异步协作。

禁止：

1. 使用 `audit_logs` 代替 Event Outbox；
2. 使用 Event History 代替审计日志；
3. 使用普通日志代替 Event 或 Audit。

### 6.2 Event 与 `request_trace_id`

决策：

Event Envelope 必须携带 `request_trace_id`。

规则：

1. HTTP 请求产生的 Event 使用当前 Request Context 的 Request ID；
2. Job 产生的 Event 使用 Job / Attempt 的 `request_trace_id`；
3. Scheduler 或系统任务产生的 Event 必须生成系统 Request Trace ID；
4. Event Consumer 创建 Job 时，Job 必须继承或派生 Event Trace；
5. Audit、Job、Event 之间通过 Trace 关联，但不得互相替代。

### 6.3 Event Audit

Event Publisher 与 Consumer 后续实现必须记录：

1. Event 创建；
2. Event 发布；
3. Event 消费成功；
4. Event 消费失败；
5. Event 重试；
6. Event Dead Letter；
7. Event 重放。

是否复用 `audit_logs` 或新增专用投递状态表，由后续 DCR 决定。审计事实仍以 `audit_logs` 为准。

## 7. Change Impact Assessment

### Database CR

Required.

原因：

可靠 Event Infrastructure 需要持久化 Outbox、Inbox、Delivery State 和 Event Dead Letter。现有 `audit_logs`、`jobs`、`idempotency_records` 均不能替代这些职责。

本 Architecture Decision 不提交 DCR，不修改 Database Spec，不修改 Prisma Schema，不创建 Migration。下一步应先提交 Task 7.7 Database Change Request。

### API CR

Not Required for this Architecture Decision.

当前设计不新增客户端可见 API、DTO、错误码或响应字段。

后续如果新增以下能力，则需要 API Change Request：

1. Event 查询 API；
2. Event 重放 API；
3. Event Delivery 管理 API；
4. Event Dead Letter 管理 API；
5. Cache 管理 API；
6. 新增客户端可见 DTO、错误码或状态字段。

### Permission

Not Required for this Architecture Decision.

当前设计不新增权限代码。

后续如果新增 Event 管理、Cache 管理、Event Replay 或 Dead Letter 人工处理界面 / API，则必须先更新 Permission 设计并按正式变更流程处理。

## 8. Final Decision

Task 7.7 第一阶段架构决策如下：

1. 建立统一 Cache Layer 设计，但不在第一阶段引入 Redis；
2. Cache 仅作为派生加速层，禁止成为库存、权限、状态或审计事实来源；
3. 建立统一 Domain Event 模型；
4. Event 只传播已提交事实，不替代业务状态、审计事实或 Job 状态；
5. 可靠 Event Infrastructure 采用 PostgreSQL-first 方向，需通过 Outbox / Inbox / Event Dead Letter 实现；
6. Job System 继续负责后台任务执行，Event System 负责发布与订阅；
7. 禁止 Job Queue 直接替代 Event Bus；
8. Redis、Message Broker、Pub/Sub 均不作为第一阶段默认基础设施；
9. Event 与 Audit / Trace 职责分离但通过 `request_trace_id` 串联；
10. 进入实现前必须先提交并批准 Database Change Request。

