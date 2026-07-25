---
document_name: Task 7.8 Observability Foundation Implementation
project: Violin ERP Lite
version: 1.0
status: Draft
owner: Project Manager
created_date: 2026-07-25
updated_date: 2026-07-25
related_phase: Phase 7
---

# Task 7.8-B：Observability Foundation Implementation

## 1. 实现范围

本阶段基于已批准的 `TASK_7_8_AUDIT_TRACE_OBSERVABILITY_ARCHITECTURE_DECISION.md`，实现第一阶段内部 Observability Foundation。

已实现：

1. Trace Foundation；
2. Structured Logging Enhancement；
3. Audit Enhancement；
4. Metrics Foundation；
5. Health Foundation；
6. Job Runtime 可选 Metrics / Logger 接入；
7. Scheduler Runtime 可选 Metrics / Logger 接入；
8. Event Runtime 可选 Metrics / Logger 接入；
9. 单元测试覆盖；
10. 不新增公开 API；
11. 不修改数据库 Schema；
12. 不新增 Migration；
13. 不修改 Permission；
14. 不引入 Prometheus、Grafana、OpenTelemetry、ELK 或商业监控平台。

## 2. Trace 实现

新增或增强：

- `RequestContext.requestTraceId`；
- `createTraceContext`；
- `getRequestTraceId`；
- Job / Event Runtime 保持使用既有 `requestTraceId` 传递链路；
- Logger 自动读取当前 Request Context，并输出 `request_trace_id`。

Trace 只用于关联 HTTP、Service、Database、Job、Event 与 Consumer，不参与业务判断、权限判断、库存裁决、幂等 Key 或审计真实性判断。

## 3. Structured Logging 实现

增强 `createLogger`：

- 输出 `request_trace_id`；
- 支持 `error_code`；
- 支持 `duration_ms`；
- 支持 `job_id`；
- 支持 `event_id`；
- 支持 `consumer_id`；
- 支持嵌套 `context`；
- 增强敏感字段与敏感字符串脱敏。

禁止记录：

- Token；
- Password；
- Secret；
- Authorization Header；
- Cookie；
- Database URL；
- Storage 私有路径；
- SQL 敏感信息。

Logger 仍只作为运行诊断记录，不替代 `audit_logs`。

## 4. Audit 实现

保留：

- `audit_logs` 作为唯一审计事实来源；
- `AuditEvent`；
- `AuditWriter`；
- `recordAuditEvent`；
- `PrismaAuditWriter`。

增强：

- 新增 `AuditCategory`；
- 新增 `createAuditMetadata`；
- 测试覆盖 Security Audit 元数据脱敏与 `request_trace_id` 关联。

本阶段不新增 Audit 表，不修改 `audit_logs` 字段，不新增审计查询 API。

## 5. Metrics 实现

新增内部 Metrics Foundation：

- `MetricsRegistry`；
- `InMemoryMetricsRegistry`；
- `NoopMetricsRegistry`；
- Counter；
- Gauge；
- Histogram；
- `defaultMetricsRegistry`。

覆盖：

| 范围 | 指标 |
| --- | --- |
| HTTP | `http_request_count`、`http_error_count`、`http_request_latency_ms` |
| Job | `job_success_count`、`job_failed_count`、`job_retry_count`、`job_dead_letter_count`、`job_execution_duration_ms` |
| Scheduler | `job_scheduler_created_count`、`job_scheduler_failed_count` |
| Event | `event_publish_failed_count`、`event_consume_failed_count`、`event_delivery_failed_count`、`event_dead_letter_count`、`event_consume_duration_ms` |

Metrics 第一阶段仅内存实现：

- 不持久化；
- 重启后可丢失；
- 不作为业务事实；
- 不作为审计事实；
- 不暴露 `/metrics`。

## 6. Health 实现

新增内部 Health Foundation：

- `HealthStatus`：`healthy`、`degraded`、`unhealthy`；
- `HealthCheckKind`：`liveness`、`readiness`；
- `HealthChecker`；
- `HealthProvider`；
- `createStaticHealthProvider`；
- `createDatabaseHealthProvider`。

本阶段只提供内部抽象，不新增：

- `/health/liveness`；
- `/health/readiness`；
- 新的公开 Health API Contract。

## 7. 文件列表

新增：

- `packages/api/src/observability/metrics.ts`
- `packages/api/src/observability/health.ts`
- `packages/api/tests/observability.test.ts`
- `docs/phases/phase-07/TASK_7_8_OBSERVABILITY_IMPLEMENTATION.md`

修改：

- `packages/api/src/request-context/request-context.ts`
- `packages/api/src/logging/logger.ts`
- `packages/api/src/audit/audit.ts`
- `packages/api/src/route-handler/route-handler.ts`
- `packages/api/src/index.ts`
- `packages/api/tests/audit.test.ts`
- `packages/database/src/job/job-worker-runtime.ts`
- `packages/database/src/job/job-scheduler-runtime.ts`
- `packages/database/src/event/event-runtime.ts`
- `packages/database/tests/job-worker-runtime.test.ts`
- `packages/database/tests/event-runtime.test.ts`

## 8. 测试结果

已执行并通过：

```bash
pnpm --filter @violin-erp/api test
pnpm --filter @violin-erp/database test
pnpm --filter @violin-erp/api typecheck
pnpm --filter @violin-erp/database typecheck
```

覆盖：

- HTTP Trace 生成；
- Job Trace 传递；
- Event Trace 传递；
- JSON 日志输出；
- 日志敏感信息脱敏；
- Security Audit 元数据；
- Job Metrics；
- Event Metrics；
- Counter；
- Gauge；
- Histogram；
- Health `healthy` / `degraded` / `unhealthy`。

完整 `pnpm check` 结果以最终执行输出为准。

## 9. 已知限制

1. 未新增公开 `/metrics`；
2. 未新增 `/health/liveness`；
3. 未新增 `/health/readiness`；
4. 未新增 Trace 查询 API；
5. 未新增 Audit 查询 API；
6. 未新增 Metrics 持久化；
7. 未新增 Alert 持久化；
8. 未接入外部告警通道；
9. 未引入 Prometheus、Grafana、OpenTelemetry、ELK 或商业监控平台；
10. Authentication 全量安全审计与 Permission / Data Scope 拒绝审计仍需在后续获批实现中继续补齐具体业务接入点。

## 10. CR 判断

Database CR：Not Required

原因：

- 未新增数据库对象；
- 未修改 `audit_logs`；
- 未新增 Trace / Metrics / Alert 表；
- 未创建 Migration。

API CR：Not Required for this implementation

原因：

- 未新增公开 API；
- 未修改现有 API Contract；
- 未新增 `/metrics`、`/health/liveness` 或 `/health/readiness`。

后续如需要公开 Metrics、Readiness、Liveness、Trace 查询、Audit 查询或 Alert API，必须先提交 API Change Request。
