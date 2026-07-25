# Task 7.8 Audit, Trace & Observability Capability Audit

项目：Violin ERP Lite  
阶段：Phase 7 Platform Foundation  
任务：Task 7.8 Audit, Trace & Observability  
文档类型：Capability Audit  
状态：Draft  
创建日期：2026-07-25  
基准 Commit：`e54c650a7576101c1a1907ad2f6b3f5f8ec6d3d8`

---

## 1. 审计范围

本审计仅检查当前系统中 Audit、Trace、Logging、Metrics、Monitoring 与 Alert 的已有基础能力，不修改代码、数据库、API、权限、依赖或 Frozen 业务设计。

审计依据：

- `AGENTS.md`
- `docs/00-governance/CURRENT_STATUS.md`
- `ROADMAP.md`
- `docs/phases/phase-07/PHASE_7_PLATFORM_FOUNDATION.md`
- `docs/03-data/DATABASE_SPEC.md`
- `docs/phases/phase-07/TASK_7_6_BACKGROUND_JOB_IMPLEMENTATION_DESIGN.md`
- `docs/phases/phase-07/TASK_7_7_CACHE_EVENT_ARCHITECTURE_DECISION.md`
- 当前代码中的 Audit、Trace、Logging、Health、Job 与 Event 基础设施实现。

当前事实：

- Task 7.6 Background Job & Distributed Lock 已完成，提供 Job、Attempt、Dead Letter、Lease Recovery 与 Job Audit 基础能力。
- Task 7.7 Cache & Event Infrastructure 已完成，提供 Event Outbox、Event History、Inbox、Delivery、Dead Letter、Trace 与 Audit 集成基础能力。
- Task 7.8 仍处于 Waiting / Not Started，本文件仅作为进入 Task 7.8 设计前的能力审计。

---

## 2. Capability Matrix

| Capability | Status | Evidence |
|---|---|---|
| Audit | Partial | `DATABASE_SPEC.md` 已定义 `audit_logs` 为正式审计事实；`packages/api/src/audit/audit.ts` 定义 `AuditEvent`、`AuditWriter`、`recordAuditEvent` 与脱敏；`packages/database/src/audit/prisma-audit-writer.ts` 写入 `audit_logs`；Master Data、Security、Workflow、Attachment、Job、Event 均已有不同程度审计接入。 |
| Trace | Partial | `packages/api/src/request-context/request-context.ts` 支持 `X-Request-ID` 与 `requestId`；`packages/api/src/route-handler/route-handler.ts` 在响应头与日志中贯通 Request ID；`DATABASE_SPEC.md` 在 `audit_logs`、`idempotency_records`、`jobs`、`job_attempts`、Event 相关表中定义 `request_trace_id`；Job/Event Runtime 使用 `requestTraceId`。HTTP → Job → Event → Consumer 的全链路业务接入尚未形成统一规范与验证闭环。 |
| Logging | Partial | `packages/api/src/logging/logger.ts` 提供结构化 JSON Logger、日志等级、Request ID 注入与字段级敏感键脱敏；Route Handler 记录 `http.request.started/completed/failed`。尚未形成跨 package 统一 Logger 接入规范、日志采样、日志目的地、保留策略或审计/遥测边界文档。 |
| Metrics | Missing | 代码中未发现正式 Metrics 基础设施、Counter、Gauge、Histogram、性能指标采集、指标导出器或统一指标命名规范。Phase 7.1 审计已记录 Metrics / Exporter / Dashboard / Alert 缺失。 |
| Monitoring | Partial | `packages/api/src/route-handler/health-check.ts` 与 `apps/admin/app/api/health/route.ts` 提供基础 Health Check，检查 Application 与 Database；`apps/admin/lib/health.ts` 与 `apps/admin/components/shell/health-gate.tsx` 有前端健康门控。尚未区分 Readiness / Liveness，未覆盖 Job/Event Worker、Scheduler、Outbox backlog、Dead Letter、Lease Recovery 等平台运行状态。 |
| Alert | Missing | 未发现正式运行告警基础设施、告警规则、告警通道、阈值配置、告警抑制、升级策略或告警审计。现有 `inventory.alert` 属于业务库存预警，不是平台 Observability Alert。 |

---

## 3. Audit Capability Analysis

### 3.1 已有能力

当前系统已有统一审计事实表 `audit_logs`，并通过 `AuditWriter` 抽象与 `PrismaAuditWriter` 写入数据库。

已有能力包括：

- 审计事件模型：`AuditEvent`；
- 审计写入接口：`AuditWriter`；
- 审计写入入口：`recordAuditEvent`；
- 审计失败策略：`required` / `best-effort`；
- 审计值脱敏：`sanitizeAuditValue`；
- 敏感字段名脱敏；
- Token、数据库连接串、JWT、Bearer 等敏感字符串脱敏；
- 失败原因敏感模式保护；
- 数据库落地：`audit_logs`。

### 3.2 覆盖范围

| Area | Coverage | Evidence | Gap |
|---|---|---|---|
| Authentication | Partial | Security Management 已有用户与角色变更审计；Auth Session / 登录类安全事件是否统一写入 `audit_logs` 尚未形成完整证据。 | 需要 Task 7.8 明确登录成功、登录失败、登出、Session 失效、Token 刷新等安全审计范围。 |
| Permission | Partial | `field.*.read` 敏感字段读取、Security 读写操作、Workflow/Master Data 操作有审计记录。 | 普通权限校验失败、越权访问、Data Scope 拒绝是否必须审计尚未统一。 |
| Attachment | Existing | Attachment Service 大量使用 `recordAuditEvent`；Attachment Audit Reader 可按 `request_trace_id` 查询审计回执。 | 需要统一纳入 Trace / Observability 视角，确认失败场景覆盖与敏感路径保护。 |
| Job | Existing | Job Repository 写入 Job 创建、Claim、成功、失败、Retry、Dead Letter、Lease Timeout 等审计。 | 需要在 Task 7.8 中确认 Worker Runtime 日志、指标、Dead Letter 告警边界。 |
| Event | Existing | Event Repository 写入 Outbox、History、Consumption、Delivery、Dead Letter 等审计；事件表携带 `request_trace_id`。 | 需要确认事件消费失败、重复消费、投递失败与审计/指标/告警的统一规范。 |
| Business Operation | Partial | Master Data、Workflow、Inventory Workflow 等基础业务操作已有 `recordAuditEvent` 接入。 | 业务模块覆盖不完整；采购、库存、生产、跨境等正式业务审计完整性需要按模块验收。 |

### 3.3 审计边界

现有设计边界正确：

- `audit_logs` 是正式审计事实来源；
- 结构化日志不能替代 `audit_logs`；
- Job Attempt 不能替代 `audit_logs`；
- Event History 不能替代 `audit_logs`；
- `idempotency_records` 不能替代 `audit_logs`；
- 缓存不能成为审计事实来源。

当前缺口在于：审计能力存在，但尚未形成 Task 7.8 统一审计覆盖矩阵、失败场景策略、查询/追踪方式、保留策略和验收标准。

---

## 4. Trace Capability Analysis

### 4.1 已有能力

当前系统已有请求级 Trace 基础：

- API 请求支持读取 `X-Request-ID`；
- 缺失或无效 Request ID 时自动生成 UUID；
- Route Handler 将 Request ID 写入响应头 `X-Request-ID`；
- API 响应体携带 `requestId`；
- Logger 自动注入当前 Request Context 的 `requestId`；
- `audit_logs.request_trace_id` 保存请求链路；
- `idempotency_records.request_trace_id` 保存请求幂等链路；
- Job 表、Attempt 表、Event Outbox、Event History、Inbox、Delivery 等均保存 `request_trace_id`；
- Job Runtime 与 Event Runtime 通过 `requestTraceId` 传递执行上下文。

### 4.2 Trace Propagation 审计

| Flow | Status | Current Evidence | Gap |
|---|---|---|---|
| HTTP Request → API Response | Existing | `createRequestContext`、`createRouteHandler`、`X-Request-ID`、响应 `requestId`。 | 需要统一文档化 Trace Header 规范。 |
| HTTP Request → Audit Log | Existing | `recordAuditEvent` 使用 `context.requestId` 写入 `audit_logs.request_trace_id`。 | 需要覆盖所有重要失败场景。 |
| HTTP Request → Job | Partial | `jobs.request_trace_id` 与 Job Repository 支持 `requestTraceId`。 | 业务模块尚未大规模接入 Job，端到端链路有限。 |
| Job → Attempt | Existing | `job_attempts.request_trace_id` 与 Worker Runtime Context。 | 需要统一 Job 日志/指标/告警联动。 |
| Event Outbox → Event History | Existing | Event Envelope 与 Event Repository 保存 `requestTraceId`。 | 需要后续确认跨消费者链路查询方式。 |
| Event → Consumer | Existing | `event_consumptions.request_trace_id` 与 Consumer Context。 | 缺少统一 Trace 查询或可观测性视图。 |
| HTTP → Job → Event → Consumer | Partial | 基础字段和运行时已具备，但尚未形成业务级端到端接入与验收用例矩阵。 | Task 7.8 需要定义 Trace Propagation 标准和验收路径。 |

---

## 5. Logging Capability Analysis

### 5.1 已有能力

`packages/api/src/logging/logger.ts` 已提供最小结构化日志能力：

- 日志等级：`debug`、`info`、`warn`、`error`；
- JSON 序列化输出；
- `service`、`environment`、`timestamp`、`event`、`fields`；
- 当前 Request Context 存在时自动附带 `requestId`；
- 敏感字段键脱敏；
- Route Handler 已记录 HTTP 请求开始、完成和失败。

### 5.2 缺口

当前 Logging 仍为局部能力：

- 未见统一跨 package Logger 使用规范；
- Job Worker、Scheduler、Event Publisher/Consumer 的结构化日志接入尚未统一；
- 未定义日志事件命名规范；
- 未定义日志保留、采样、级别策略；
- 未定义错误堆栈、SQL、路径、Token 等敏感信息的统一记录边界；
- 未定义日志与 `audit_logs`、Trace、Metrics 的职责分离文档。

---

## 6. Metrics Capability Analysis

当前未发现正式 Metrics 基础设施。

缺失能力包括：

- Counter；
- Gauge；
- Histogram；
- Timer / Duration Measurement；
- HTTP 请求数量、延迟、错误率；
- Job Claim / Success / Failure / Retry / Dead Letter 指标；
- Event Outbox backlog、发布失败、消费失败、死信指标；
- Scheduler Lock 竞争与 Lease Recovery 指标；
- 数据库连接状态指标；
- Metrics Exporter；
- Dashboard 或指标命名规范。

Task 7.8 若进入实现阶段，需要 Architecture Decision 先明确：

- 指标是否仅在运行时内存中暴露；
- 是否需要持久化；
- 是否需要新增 `/metrics` 或内部观测端点；
- 是否引入 OpenTelemetry / Prometheus 兼容格式；
- 是否允许新增依赖。

---

## 7. Monitoring Capability Analysis

### 7.1 已有能力

当前已有基础健康检查：

- API Health Handler 检查 Application 与 Database；
- Admin Health Gate 调用 Health Endpoint；
- Health Response 携带 `requestId`；
- Health Endpoint 使用 Route Handler，因此具备 Request ID 与结构化日志。

### 7.2 缺口

当前 Monitoring 仍不完整：

- 未区分 Liveness 与 Readiness；
- 未覆盖 Worker Runtime 状态；
- 未覆盖 Scheduler Runtime 状态；
- 未覆盖 Event Outbox backlog；
- 未覆盖 Event Consumption backlog；
- 未覆盖 Dead Letter 数量；
- 未覆盖 Lease Timeout Recovery 状态；
- 未覆盖数据库迁移版本或连接池状态；
- 未定义监控失败后的告警行为；
- 未定义平台运行状态页面或内部 API。

---

## 8. Alert Capability Analysis

当前未发现平台级 Alert 基础设施。

需要明确区分：

- `inventory.alert` 是业务库存预警能力；
- Task 7.8 的 Alert 是平台 Observability 告警能力。

缺失能力包括：

- 告警规则；
- 告警阈值；
- 告警通道；
- 告警去重；
- 告警抑制；
- 告警升级；
- 告警恢复；
- 告警审计；
- Job/Event Dead Letter 或 backlog 告警策略。

---

## 9. Existing Integration

### 9.1 与 Task 7.6 Job System 的关系

已有关系：

- Job、Attempt、Result、Dead Letter 与 Scheduler Lock 均保存运行状态或执行事实；
- Job Repository 已向 `audit_logs` 写入 Job 生命周期审计；
- Worker Runtime 支持 `requestTraceId`；
- Lease Recovery 和 Dead Letter 已可审计。

Task 7.8 需要补齐：

- Job Runtime 结构化日志规范；
- Job 指标；
- Job Dead Letter 告警；
- Worker Liveness / Readiness；
- Scheduler Lock 异常监控；
- Lease Recovery 可观测性。

### 9.2 与 Task 7.7 Event System 的关系

已有关系：

- Event Outbox、History、Inbox、Delivery、Dead Letter 均保存 `request_trace_id`；
- Event Repository 支持发布、消费、投递、重试、Lease Recovery 与 Dead Letter 审计；
- Event Runtime 不替代 Job Queue，也不替代业务事实表。

Task 7.8 需要补齐：

- Event Publish / Consume / Delivery 指标；
- Event Dead Letter 告警；
- Event Trace 查询边界；
- Event 与 Audit Log 的统一定位方式；
- Event Consumer 结构化日志规范。

### 9.3 与 Database 的关系

已有：

- `audit_logs` 是正式审计事实；
- `request_trace_id` 已广泛存在于审计、幂等、Job 与 Event 表；
- Job/Event Dead Letter 表提供失败闭环事实。

缺口：

- 不存在独立 Trace Span / Trace Event 表；
- 不存在 Metrics 持久化表；
- 不存在 Monitoring Snapshot 表；
- 不存在平台 Alert 表。

如 Task 7.8 后续决定将 Trace、Metrics、Monitoring 或 Alert 状态持久化，必须提交 Database Change Request。

### 9.4 与 API 的关系

已有：

- API 响应包含 `requestId`；
- 响应头包含 `X-Request-ID`；
- Health Endpoint 已存在；
- Route Handler 统一记录请求日志。

缺口：

- 未定义 `/metrics`；
- 未定义 Readiness / Liveness 独立端点；
- 未定义 Trace 查询接口；
- 未定义 Audit 查询接口；
- 未定义 Alert 管理或查询接口。

如 Task 7.8 后续新增或修改对外/内部接口，必须提交 API Change Request。

---

## 10. Gap Analysis

### A Existing

- `audit_logs` 正式审计事实表；
- Audit Event 模型；
- Audit Writer 抽象；
- Prisma Audit Writer；
- 审计脱敏；
- Request Context；
- `X-Request-ID` 读取与响应回传；
- API 响应 `requestId`；
- 结构化 JSON Logger 基础能力；
- HTTP 请求开始、完成、失败日志；
- 基础 Health Check；
- Job Audit；
- Job Trace 字段；
- Event Audit；
- Event Trace 字段；
- Attachment 审计接入；
- Master Data / Workflow / Security 局部业务审计接入。

### B Partial

- Authentication 审计覆盖；
- Permission / Data Scope 拒绝审计；
- Business Operation 审计覆盖矩阵；
- HTTP → Job → Event → Consumer 全链路 Trace 验证；
- Worker / Scheduler / Event Consumer 日志接入；
- Readiness / Liveness；
- Job/Event 运行状态监控；
- Dead Letter 运行监控；
- Lease Recovery 可观测性；
- 日志敏感数据保护策略；
- Trace 查询与排障流程。

### C Missing

- Metrics 基础设施；
- Counter / Gauge / Histogram；
- Metrics Exporter；
- 性能测量统一规范；
- 平台级 Alert；
- Alert Rule / Channel / Threshold / Escalation；
- Trace Span 模型；
- Observability Architecture Decision；
- Observability API Contract；
- Observability Database Design；
- Dashboard 或运行视图。

---

## 11. Change Impact

本 Capability Audit 本身不修改任何正式设计、数据库、API、权限或代码。

Database CR: Required

原因：

- 当前已有 `audit_logs` 与 `request_trace_id` 基础，但不存在 Trace Span、Metrics、Monitoring Snapshot 或 Platform Alert 的持久化模型；
- 如 Task 7.8 后续要求持久化 Trace、指标、监控快照、告警事件或告警处理记录，必须先提交 Database Change Request；
- 如果后续 Architecture Decision 明确 Metrics / Alert 仅通过运行时日志或外部平台处理，数据库变更范围可在 DCR 中缩小或判定不执行。

API CR: Required

原因：

- 当前已有 Health Endpoint 与 Request ID 响应规范；
- 如 Task 7.8 后续新增 `/metrics`、`/health/live`、`/health/ready`、Trace 查询、Audit 查询或 Alert 查询/处理接口，必须先提交 API Change Request；
- 如果后续仅完善内部运行日志且不改变接口，则 API CR 可在 Architecture Decision 中重新评估。

Architecture Decision: Required

原因：

- Task 7.8 涉及 Audit、Trace、Logging、Metrics、Monitoring、Alert 的职责边界；
- 需要明确普通日志、审计事实、事件事实、Job 状态、Trace 与 Metrics 的边界；
- 需要明确是否引入 OpenTelemetry、Prometheus、外部日志平台或告警系统；
- 需要明确是否新增数据库对象、API、权限、依赖与运维约束。

Permission Impact: TBD

说明：

- 本审计不修改 Permission；
- 如后续提供 Audit / Trace / Metrics / Alert 查询或处理能力，可能需要新增或复用权限，必须在 API CR / Permission Change 中审批。

Frozen Document Impact: Not Required for this audit

说明：

- 本审计仅新增 Task 7.8 能力审计文档；
- 不修改 `DATABASE_SPEC.md`、`API_SPEC.md`、Permission、业务规则或阶段路线。

---

## 12. 审计结论

当前系统已经具备较扎实的 Audit 与 Trace 基础，尤其是：

- `audit_logs` 作为正式审计事实；
- Request ID / `request_trace_id` 已贯穿 API、Audit、Idempotency、Job 和 Event；
- Job/Event 已具备生命周期审计、Dead Letter 与 Lease Recovery 相关记录；
- API 已有结构化日志与基础 Health Check。

但 Task 7.8 的 Observability 能力仍未完成：

- Metrics 缺失；
- Alert 缺失；
- Monitoring 只有基础 Health Check；
- Trace 尚未形成端到端业务链路验收与查询能力；
- Logging 尚未覆盖 Worker、Scheduler、Event Consumer 等平台运行进程；
- Audit 覆盖范围需要形成统一矩阵并补齐 Authentication、Permission、业务失败场景。

因此，Task 7.8 下一步应进入 Architecture Decision Design，而不是直接实现。
