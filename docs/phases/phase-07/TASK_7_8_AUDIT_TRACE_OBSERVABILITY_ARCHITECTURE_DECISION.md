---
document_name: Task 7.8 Audit Trace Observability Architecture Decision
project: Violin ERP Lite
version: 1.0
status: Draft
owner: Project Manager
created_date: 2026-07-25
updated_date: 2026-07-25
related_phase: Phase 7
---

# Task 7.8：Audit, Trace & Observability Architecture Decision

## 1. Audit Architecture Decision

### 1.1 `audit_logs` 是否继续作为唯一审计事实来源

决策：

`audit_logs` 继续作为 Violin ERP Lite 唯一正式审计事实来源。

原因：

1. `DATABASE_SPEC.md` 已冻结 `audit_logs` 的正式职责；
2. 现有 `AuditEvent`、`AuditWriter` 与 `PrismaAuditWriter` 已围绕 `audit_logs` 建立；
3. Task 7.6 Job 与 Task 7.7 Event 已明确复用 `audit_logs`，但不以 Job Attempt 或 Event History 替代审计；
4. 审计记录必须可追溯、可查询、可脱敏、可与 `request_trace_id` 关联；
5. 普通日志、缓存、事件、Job 状态或业务状态均不得成为正式审计事实来源。

本阶段不新增审计扩展表，不修改 `audit_logs` 结构，不修改数据库 Schema。

### 1.2 AuditEvent 模型

决策：

继续使用统一 `AuditEvent` 模型作为代码层审计事件入口。

AuditEvent 至少表达：

1. `action`：操作代码；
2. `moduleCode`：模块代码；
3. `resourceType`：对象类型；
4. `resourceId`：对象 ID；
5. `resourceNoSnapshot`：对象编号快照；
6. `actorUserId`：操作者，系统事件可空；
7. `usernameSnapshot`：用户名快照；
8. `result`：`success` 或 `failure`；
9. `failureReason`：失败原因；
10. `beforeSnapshot`；
11. `afterSnapshot`；
12. `metadata`；
13. `requestId`：映射到数据库 `request_trace_id`；
14. `ipAddress`；
15. `userAgent`；
16. `timestamp`。

AuditEvent 写入前必须脱敏。禁止把 Token、Password、Secret、Storage 私有路径、数据库连接串、JWT、Cookie、Authorization Header、SQL 敏感片段、堆栈原文或敏感业务原文写入 `audit_logs`。

### 1.3 审计分类

Task 7.8 将审计分为六类：

| 分类 | 说明 | 示例 |
| --- | --- | --- |
| Security Audit | 安全与身份相关事件 | 登录成功、登录失败、登出、Token 刷新失败、Session 撤销 |
| Data Change Audit | 数据变更事件 | 创建、修改、停用、启用、删除保护、状态变更 |
| Business Operation Audit | 业务操作事件 | 提交、审核、反审核、作废、出入库、导入确认 |
| System Audit | 平台系统事件 | Health 异常、配置变更、系统任务触发、Lease Recovery |
| Job Audit | 后台任务生命周期事件 | Job 创建、Claim、成功、失败、Retry、Dead Letter |
| Event Audit | 事件基础设施生命周期事件 | Outbox 登记、发布、消费、投递、Retry、Dead Letter |

### 1.4 必须审计事件

Task 7.8 后续实现与补齐时，以下事件必须写入 `audit_logs`：

1. 登录成功；
2. 登录失败；
3. 登出；
4. Token 刷新失败或重放风险；
5. 权限拒绝；
6. 数据范围拒绝；
7. 数据创建、修改、停用、启用、作废、删除保护；
8. 敏感字段读取；
9. Attachment 上传、下载、关联、解除关联、逻辑删除、恢复、物理删除补偿；
10. Job 创建、Claim、Attempt 开始、成功、失败、Retry、Lease Timeout Recovery、Dead Letter；
11. Event Outbox 登记、发布、Event History 写入、Consumer 领取、消费成功、消费失败、Delivery 失败、Dead Letter；
12. 平台运行异常中需要留痕的安全或一致性事件。

业务读取是否审计按模块风险分级确定：普通列表读取不强制审计；敏感数据读取、审计查询、安全配置读取必须审计。

### 1.5 Audit 不等于其他记录

明确禁止：

1. Application Log 不替代 Audit；
2. Event History 不替代 Audit；
3. Job Attempt 不替代 Audit；
4. Metrics 不替代 Audit；
5. Alert 不替代 Audit；
6. API Response 不替代 Audit；
7. Cache 不替代 Audit。

职责边界：

| 对象 | 职责 | 不得替代 |
| --- | --- | --- |
| `audit_logs` | 正式审计事实 | 业务状态、Event History、Job State |
| Application Log | 运行排障与诊断 | 正式审计事实 |
| Event History | 已提交事件事实 | 审计日志、业务状态 |
| Job Attempt | Worker 执行尝试事实 | 审计日志、业务状态 |
| Metrics | 聚合运行指标 | 审计日志、Trace 明细 |

---

## 2. Trace Architecture Decision

### 2.1 建立统一 Trace 规范

决策：

建立统一 Trace Context，用于关联 HTTP、Service、Database、Job、Event 与 Consumer 的执行链路。

Trace 只能用于关联、排障和观测，不得改变业务事实，不得作为权限、库存、状态、审计或幂等的裁决来源。

### 2.2 Trace Context

统一 Trace Context 字段：

| 字段 | 来源 | 说明 |
| --- | --- | --- |
| `request_trace_id` | HTTP Header 或系统生成 | 跨数据库、审计、Job、Event 的统一链路 ID |
| `request_id` | API 层上下文 | 与 `request_trace_id` 同值或同源映射；对外响应使用 `requestId` |
| `job_id` | `jobs.id` | 后台任务链路上下文，可空 |
| `job_attempt_id` | `job_attempts.id` | Worker 执行尝试上下文，可空 |
| `event_id` | Event Envelope | 事件链路上下文，可空 |
| `consumer_id` | Consumer Name / Delivery Target | 事件消费或投递上下文，可空 |
| `actor_user_id` | 当前认证用户或系统身份 | 系统事件可空 |
| `service` | 运行服务名称 | API、Worker、Scheduler、Event Runtime 等 |

`request_trace_id` 必须是主关联键。`job_id`、`event_id` 与 `consumer_id` 是局部上下文，不能替代 `request_trace_id`。

### 2.3 Trace 链路规范

标准链路：

```text
HTTP
  ↓
Service
  ↓
Database
  ↓
Job
  ↓
Event
  ↓
Consumer
```

规则：

1. HTTP 入口优先接受合法 `X-Request-ID`；
2. 缺失或非法时由服务端生成 UUID；
3. API 响应头必须回传 `X-Request-ID`；
4. API 响应体继续使用 `requestId`；
5. Service 调用 Repository、Audit、Idempotency、Job、Event 时必须传递同一 Trace；
6. Job 创建时写入 `jobs.request_trace_id`；
7. Job Attempt 创建时写入 `job_attempts.request_trace_id`；
8. Event Envelope 必须携带 `requestTraceId`；
9. Event Outbox、History、Consumption、Delivery 必须保存 `request_trace_id`；
10. Consumer Handler 必须接收 Trace Context；
11. Logger 必须在可用时输出 `request_trace_id`。

### 2.4 Trace 安全边界

Trace ID 不得包含业务语义、用户身份、Token、手机号、订单号、Storage Key 或敏感对象编号。

Trace 不用于：

1. 权限判断；
2. 数据范围判断；
3. 幂等 Key；
4. 业务状态判断；
5. 库存一致性判断；
6. 审计真实性判断。

Trace 只用于关联：

1. API 响应；
2. 结构化日志；
3. `audit_logs`；
4. `idempotency_records`；
5. `jobs` / `job_attempts`；
6. Event Outbox / History / Consumption / Delivery；
7. Metrics 标签中的低基数字段。

---

## 3. Logging Architecture Decision

### 3.1 Structured Logging

决策：

统一采用结构化日志（Structured Logging），第一阶段继续使用 JSON 记录，不引入 ELK、商业日志平台或外部日志依赖。

日志用于运行诊断、错误定位、性能观测和开发排障，不作为正式审计事实来源。

### 3.2 日志字段

标准日志字段：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `timestamp` | 是 | ISO 8601 时间 |
| `level` | 是 | `debug`、`info`、`warn`、`error` |
| `service` | 是 | 服务名称，如 `violin-erp-api`、`violin-erp-worker` |
| `event` | 是 | 结构化事件代码 |
| `request_trace_id` | 否 | 当前请求链路 ID |
| `error_code` | 否 | 脱敏错误代码 |
| `context` | 否 | 脱敏上下文 |
| `duration_ms` | 否 | 耗时 |
| `job_id` | 否 | Job 上下文 |
| `event_id` | 否 | Event 上下文 |
| `consumer_id` | 否 | Consumer 上下文 |

现有 `requestId` 字段应在 Task 7.8-B 中兼容迁移为语义等价的 `request_trace_id` 输出，或者保留 `requestId` 并在文档中明确其与 `request_trace_id` 的映射。不得同时产生语义冲突。

### 3.3 日志事件命名

日志事件采用点分命名：

```text
domain.resource.action
```

示例：

1. `http.request.started`；
2. `http.request.completed`；
3. `http.request.failed`；
4. `job.claim.succeeded`；
5. `job.execution.failed`；
6. `event.publish.failed`；
7. `event.consume.succeeded`；
8. `health.readiness.failed`；
9. `metrics.snapshot.collected`。

### 3.4 安全规则

日志禁止记录：

1. Token；
2. Password；
3. Secret；
4. Refresh Token；
5. Authorization Header；
6. Cookie；
7. 数据库连接串；
8. SQL 敏感信息；
9. Storage 私有路径；
10. 文件二进制内容；
11. 未脱敏个人敏感信息；
12. 真实业务敏感数据原文；
13. 完整错误堆栈中的本地路径或凭据信息。

错误日志应记录：

1. `error_code`；
2. 脱敏错误摘要；
3. 安全上下文；
4. `request_trace_id`；
5. 相关 `job_id` 或 `event_id`；
6. 必要耗时和状态。

### 3.5 Logger 不替代 Audit

Logger 与 Audit 的关系：

| 能力 | 事实属性 | 用途 |
| --- | --- | --- |
| Logger | 运行诊断记录 | 排障、调试、性能分析 |
| `audit_logs` | 正式审计事实 | 合规、追责、关键操作留痕 |

任何必须审计事件，即使已写结构化日志，也必须写入 `audit_logs`。

---

## 4. Metrics Architecture Decision

### 4.1 第一阶段不建设完整监控平台

决策：

Task 7.8 第一阶段只建立基础 Metrics 抽象与内存指标能力，不建设完整监控平台。

不引入：

1. Prometheus；
2. Grafana；
3. ELK；
4. OpenTelemetry SDK；
5. 商业监控平台；
6. 外部 Metrics 存储；
7. 消息中间件；
8. 新增数据库 Metrics 表。

原因：

1. 当前阶段目标是平台基础收口，不是运维平台建设；
2. 现有系统仍处于应用开发前，外部观测基础设施未冻结；
3. 过早引入外部平台会扩大部署、权限、安全与运维边界；
4. 第一阶段应先统一指标命名、采集边界和测试证据。

### 4.2 基础 Metrics 类型

第一阶段定义三类基础指标：

| 类型 | 说明 | 示例 |
| --- | --- | --- |
| Counter | 单调递增计数 | 请求数、失败数、Retry 次数 |
| Gauge | 当前值 | Queue 积压、Dead Letter 数量 |
| Histogram | 分布/耗时 | HTTP 延迟、Job 执行耗时、Event 消费耗时 |

### 4.3 HTTP Metrics

HTTP 指标：

| 指标 | 类型 | 标签 |
| --- | --- | --- |
| `http_request_count` | Counter | `method`、`route`、`status_class` |
| `http_error_count` | Counter | `method`、`route`、`error_code` |
| `http_request_latency_ms` | Histogram | `method`、`route`、`status_class` |

不得使用高基数字段作为指标标签，例如用户 ID、完整 URL、请求体、Token、订单号或 Storage Key。

### 4.4 Job Metrics

Job 指标：

| 指标 | 类型 | 标签 |
| --- | --- | --- |
| `job_success_count` | Counter | `job_type` |
| `job_failed_count` | Counter | `job_type`、`error_code` |
| `job_retry_count` | Counter | `job_type` |
| `job_dead_letter_count` | Counter / Gauge | `job_type` |
| `job_queue_pending` | Gauge | `job_type` |
| `job_execution_duration_ms` | Histogram | `job_type` |

### 4.5 Event Metrics

Event 指标：

| 指标 | 类型 | 标签 |
| --- | --- | --- |
| `event_outbox_pending` | Gauge | `event_type` |
| `event_publish_failed_count` | Counter | `event_type`、`error_code` |
| `event_consume_failed_count` | Counter | `event_type`、`consumer_name`、`error_code` |
| `event_delivery_failed_count` | Counter | `event_type`、`delivery_target_type` |
| `event_dead_letter_count` | Counter / Gauge | `failure_stage` |
| `event_consume_duration_ms` | Histogram | `event_type`、`consumer_name` |

### 4.6 内存指标、Exporter 与 OpenTelemetry

决策：

1. 第一阶段采用内存指标（In-memory Metrics Registry）；
2. 指标在进程内聚合，不作为正式业务事实；
3. 指标重启后可丢失；
4. 不持久化 Metrics；
5. 不引入 OpenTelemetry；
6. 不引入 Prometheus 客户端依赖；
7. 不提供对外 `/metrics`，除非 API Change Request 先获批准。

后续如需要 Exporter，可在 API CR 或运维架构决策中选择：

1. 内部 JSON Metrics Endpoint；
2. Prometheus Text Exposition；
3. OpenTelemetry；
4. 外部平台采集。

当前 Architecture Decision 不授权新增接口或依赖。

---

## 5. Monitoring Architecture Decision

### 5.1 Health 模型

决策：

建立统一 Health 模型，区分：

1. Liveness：进程是否存活；
2. Readiness：服务是否可以安全承接流量或执行任务；
3. Component Health：关键组件状态。

健康状态：

| 状态 | 含义 |
| --- | --- |
| `healthy` | 组件正常，可承接对应职责 |
| `degraded` | 组件部分异常或积压升高，但仍可有限服务 |
| `unhealthy` | 组件不可用或存在阻断性错误 |

### 5.2 Liveness

Liveness 只判断进程基本存活，不执行重型数据库扫描，不依赖外部长耗时调用。

Liveness 适用：

1. API Server；
2. Worker Runtime；
3. Scheduler Runtime；
4. Event Runtime。

Liveness 失败表示进程本身异常，应由运行环境重启或人工介入。

### 5.3 Readiness

Readiness 判断服务是否可承接职责。

覆盖：

| Component | Readiness 检查 |
| --- | --- |
| Application | 配置完整、基础依赖初始化成功 |
| Database | 数据库连接可用、必要查询可执行 |
| Worker | 可访问 Job Repository、未处于停止中、Lease Recovery 可执行 |
| Scheduler | 可访问 `scheduler_locks`、可获取或检查锁状态 |
| Event Runtime | 可访问 Outbox、History、Consumption、Delivery、Dead Letter |

Readiness 可返回 `degraded`，例如：

1. Job Dead Letter 数量超过阈值；
2. Event Dead Letter 增长；
3. Queue 积压超过阈值；
4. Lease Recovery 最近失败；
5. 数据库响应时间过高但仍可用。

### 5.4 Health 输出模型

Health 结果建议包含：

1. `status`：`healthy`、`degraded`、`unhealthy`；
2. `requestId` / `request_trace_id`；
3. `checkedAt`；
4. `components`；
5. `durationMs`；
6. 脱敏错误摘要；
7. 不包含 Token、Secret、连接串、SQL、Storage 私有路径。

### 5.5 API 边界

当前已有基础 Health Endpoint。新增 `/health/liveness`、`/health/readiness` 或改变现有 Health Response Contract，必须先提交 API Change Request。

本 Architecture Decision 不修改 API Spec。

---

## 6. Alert Architecture Decision

### 6.1 第一阶段不建设完整告警平台

决策：

Task 7.8 第一阶段不建设完整告警平台，不引入告警通道、外部通知服务或商业监控平台。

第一阶段仅定义告警边界、告警条件分类和后续接入点。

### 6.2 告警边界

平台 Observability Alert 关注运行风险，不处理业务库存预警。

需要关注：

1. 服务不可用；
2. Database 异常；
3. Job 大量失败；
4. Job Dead Letter 增长；
5. Job Queue 积压；
6. Event Outbox 积压；
7. Event Consumer 失败；
8. Event Dead Letter 增长；
9. Lease Recovery 连续失败；
10. Health Readiness 持续 `unhealthy`；
11. 权限拒绝或登录失败异常增高。

不包含：

1. 业务库存预警；
2. 安全库存提醒；
3. 采购补货提醒；
4. 销售或库存业务规则告警；
5. 客户通知。

业务库存预警继续由正式业务模块和 `inventory.alert` 权限范围管理。

### 6.3 告警阶段策略

第一阶段：

1. 不发送外部告警；
2. 不新增告警表；
3. 不新增告警 API；
4. 可通过 Metrics / Health 状态表达风险；
5. 可通过结构化日志记录运行异常；
6. 必须审计的安全或平台一致性事件仍写入 `audit_logs`。

后续若需要完整 Alert Platform，必须先完成：

1. Architecture Decision 更新；
2. Database Change Request；
3. API Change Request；
4. Permission Change；
5. 告警通道与安全边界设计。

---

## 7. Database Impact

### 7.1 是否需要审计扩展表

决策：

第一阶段不需要。

`audit_logs` 继续作为唯一审计事实来源。Task 7.8-B 不新增 Audit 扩展表。

### 7.2 是否需要 Trace 表

决策：

第一阶段不需要。

现有 `request_trace_id` 已存在于 `audit_logs`、`idempotency_records`、`jobs`、`job_attempts`、Event 相关表中，足以支撑第一阶段 Trace 关联。

不建立 Trace Span 表，不持久化调用图，不保存完整链路明细。

### 7.3 是否需要 Metrics 表

决策：

第一阶段不需要。

Metrics 采用内存聚合，不作为业务事实或审计事实，不持久化。

### 7.4 是否需要 Alert 表

决策：

第一阶段不需要。

Alert 仅定义边界与风险条件，不建设完整告警平台。

### 7.5 Database CR 判断

Database CR：Not Required

原因：

1. 第一阶段不新增表；
2. 不修改 `audit_logs`；
3. 不新增 Trace 表；
4. 不新增 Metrics 表；
5. 不新增 Alert 表；
6. 不修改业务领域表；
7. 不修改 Check、Enum、外键、索引或 Migration。

如果后续需要持久化 Trace Span、Metrics Snapshot、Alert Rule、Alert Event 或 Alert Handling，则必须重新提交 Database Change Request。

---

## 8. API Impact

### 8.1 `/metrics`

判断：

第一阶段架构定义 Metrics，但不授权新增 `/metrics`。

如果后续需要暴露 Metrics Endpoint，需要 API Change Request。

### 8.2 `/health/readiness`

判断：

当前已有基础 Health Endpoint，但未冻结独立 Readiness Contract。新增 `/health/readiness` 或改变 Health Response 结构，需要 API Change Request。

### 8.3 `/health/liveness`

判断：

新增 `/health/liveness` 需要 API Change Request。

### 8.4 Trace 查询 API

判断：

第一阶段不新增 Trace 查询 API。若后续需要通过 `request_trace_id` 查询 Audit、Job、Event 或日志关联结果，需要 API Change Request，并评估 Permission。

### 8.5 Audit 查询 API

判断：

第一阶段不新增 Audit 查询 API。若后续新增审计查询、导出或敏感审计查看接口，需要 API Change Request，并评估 Permission。

### 8.6 API CR 判断

API CR：Required

原因：

1. Task 7.8 的完整 Monitoring / Metrics 能力通常需要新增或扩展 Health 与 Metrics 接口；
2. `/metrics`、`/health/liveness`、`/health/readiness` 当前不属于已冻结 API Contract；
3. Trace 查询 API 与 Audit 查询 API 涉及权限、数据范围、脱敏和响应 DTO；
4. 未获批 API CR 前，Task 7.8-B 只能实现不改变对外 API Contract 的内部基础能力。

---

## 9. Implementation Boundary

### 9.1 Task 7.8-B 实现范围

在未获得 DCR 或 API CR 前，Task 7.8-B 允许实现：

1. Audit 分类与统一事件代码规范；
2. 现有 Audit Writer 的补强与测试；
3. 登录成功/失败、权限拒绝、数据范围拒绝的审计补齐；
4. Trace Context 类型与传递规范；
5. Logger 字段标准化与脱敏增强；
6. 内存 Metrics Registry；
7. Counter / Gauge / Histogram 基础抽象；
8. HTTP、Job、Event 的内部 Metrics 采集点；
9. Health Checker 抽象；
10. Application、Database、Worker、Scheduler、Event Runtime 的内部 Health Provider；
11. Alert 条件枚举或内部风险评估，不发送外部告警；
12. 对应单元测试与集成测试；
13. 文档与最终一致性复核。

### 9.2 Task 7.8-B 禁止范围

禁止：

1. 引入 Prometheus；
2. 引入 Grafana；
3. 引入 ELK；
4. 引入 OpenTelemetry；
5. 引入商业监控平台；
6. 新增数据库表；
7. 新增 Migration；
8. 修改 `DATABASE_SPEC.md`；
9. 修改 `API_SPEC.md`；
10. 新增 `/metrics`；
11. 新增 `/health/liveness`；
12. 新增 `/health/readiness`；
13. 新增 Trace 查询 API；
14. 新增 Audit 查询 API；
15. 修改 Permission；
16. 修改业务流程；
17. 修改业务状态机；
18. 修改库存、采购、生产、出入库、跨境等业务表；
19. 将日志、指标或事件作为业务事实来源。

### 9.3 需要 CR 后才能进入的范围

以下内容必须先获得 CR：

| 范围 | 需要审批 |
| --- | --- |
| Trace Span 持久化 | Database CR |
| Metrics Snapshot 持久化 | Database CR |
| Alert Rule / Alert Event / Alert Handling 表 | Database CR |
| `/metrics` | API CR |
| `/health/liveness` | API CR |
| `/health/readiness` | API CR |
| Trace 查询 API | API CR + Permission Impact |
| Audit 查询 API | API CR + Permission Impact |
| 告警处理 API | API CR + Permission Impact |
| 外部告警通道 | Architecture Decision Update |
| Prometheus / OpenTelemetry / ELK / Grafana | Architecture Decision Update + 依赖审批 |

---

## 10. 架构结论

Task 7.8 第一阶段采用轻量平台内建方案：

1. `audit_logs` 继续作为唯一审计事实来源；
2. `AuditEvent` 继续作为统一审计事件模型；
3. `request_trace_id` 作为跨 HTTP、Service、Database、Job、Event、Consumer 的主 Trace 关联键；
4. Structured Logging 使用 JSON 结构化日志，不替代 Audit；
5. Metrics 只建立 Counter、Gauge、Histogram 抽象与内存 Registry；
6. Monitoring 建立 Liveness、Readiness 与 Component Health 模型；
7. Alert 只定义平台运行风险边界，第一阶段不建设完整告警平台；
8. 不新增数据库对象；
9. 不新增 API Contract；
10. 不引入 Prometheus、Grafana、ELK、OpenTelemetry 或商业监控平台；
11. 后续任何持久化 Trace / Metrics / Alert 或新增观测接口，必须先通过对应 CR。

Task 7.8-B 可在不修改 Database、API、Permission 和业务流程的前提下，实现内部 Audit / Trace / Logging / Metrics / Health 基础设施与测试。
