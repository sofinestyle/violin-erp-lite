---
document_name: Task 7.6 Background Job & Distributed Lock
project: Violin ERP Lite
version: 1.0
status: Approved
owner: Project Manager
created_date: 2026-07-25
updated_date: 2026-07-25
related_phase: Phase 7
---

# Task 7.6：Background Job & Distributed Lock

## 1. 正式状态

- Current Phase：Phase 7 Platform Foundation；
- Current Task：Task 7.6 Background Job & Distributed Lock；
- Current Task Status：Waiting / Not Started；
- 本文件状态：Approved；
- 本文件性质：Architecture Decision 与正式设计边界；
- 本文件不启动 Queue、Worker、Scheduler、Distributed Lock 或业务接入实现。

Task 7.6 当前只冻结后台任务与分布式锁的平台架构原则。后续如需新增数据库表、字段、状态、索引、API、DTO、权限、错误码或枚举，必须先提交并批准对应 Database Change Request 或 API Change Request。

## 2. 设计目标

建立 Violin ERP Lite 统一后台任务运行能力，用于支持：

1. 异步任务执行；
2. 长耗时任务处理；
3. 自动任务调度；
4. 失败恢复；
5. 并发控制；
6. 执行审计。

本能力属于 Phase 7 Platform Foundation，只提供跨模块平台基础，不改变业务流程，不新增业务模块，不替代已冻结的业务规则、数据库设计或 API 契约。

## 3. 设计原则

### 3.1 单一事实来源原则

后台任务状态、执行结果和业务数据必须保持职责分离。

禁止：

1. 使用业务状态代替 Job 状态；
2. 使用日志代替任务审计；
3. 使用缓存代替业务一致性控制；
4. 使用后台任务绕过业务单据、库存流水、权限校验或审计要求。

### 3.2 PostgreSQL 优先原则

当前系统已经采用 PostgreSQL 数据一致性、数据库事务、持久化幂等记录和行级锁。Task 7.6 延续该原则。

数据库继续作为：

1. 任务状态事实来源；
2. 执行结果事实来源；
3. 审计事实来源；
4. 并发裁决的首要基础。

### 3.3 不提前引入复杂基础设施

当前阶段不默认引入 Redis Queue、Kafka、RabbitMQ、SQS 或其他外部消息系统。

任何新增基础设施必须经过独立 Architecture Decision。不得因局部后台任务需求绕过 PostgreSQL-first 平台路线。

## 4. Background Job 架构

Job 代表一次需要后台执行的系统任务，例如：

1. 附件物理删除；
2. 数据导入处理；
3. 数据备份；
4. 系统清理。

Job 是平台任务事实，不是业务单据状态。业务对象继续使用其 Frozen 业务状态；Job 只记录后台执行事实、执行进度、尝试次数、结果、失败和审计线索。

## 5. Job 生命周期

统一概念生命周期为：

```text
Pending
  ↓
Running
  ↓
Succeeded
```

失败路径为：

```text
Running
  ↓
Retrying
  ↓
Failed
  ↓
Dead Letter
```

上述生命周期是架构概念，不直接新增数据库状态。具体状态字段、允许值、Check 约束和索引是否进入数据库，必须在后续 DCR 中判断并批准。

## 6. Queue 设计方向

Task 7.6 第一阶段采用 PostgreSQL-backed Queue 作为设计方向。

采用原因：

1. 与现有架构一致；
2. 减少基础设施；
3. 保证事务一致性；
4. 方便审计和恢复；
5. 与 Task 7.5 Persistent Idempotency 和现有 PostgreSQL 行级锁边界一致。

当前暂不采用：

1. Redis Queue；
2. Kafka；
3. RabbitMQ；
4. SQS；
5. 其他外部 MQ 系统。

## 7. Worker 设计方向

Worker 是独立后台执行进程。

Worker 职责：

1. 获取任务；
2. 获取执行租约；
3. 执行任务；
4. 更新执行结果；
5. 记录任务审计；
6. 保持幂等消费边界。

Worker 不直接修改业务规则，不绕过业务 Service，不直接修改库存余额，不跳过权限、数据范围、业务状态和审计要求。

## 8. Scheduler 设计方向

Scheduler 负责：

1. 周期任务触发；
2. 创建 Job；
3. 防止重复触发；
4. 记录调度审计。

Scheduler 不直接执行业务任务。正式流程为：

```text
Scheduler
  ↓
Create Job
  ↓
Worker Execute
```

Scheduler 的重复触发保护不得替代数据库唯一约束、业务幂等或 Job 执行租约。

## 9. Distributed Lock 设计方向

### 9.1 锁用途

Distributed Lock 只用于：

1. 防止多个 Worker 同时执行同一 Job；
2. 防止 Scheduler 重复创建同一周期任务；
3. 支持后台任务租约和恢复裁决。

### 9.2 锁原则

禁止：

1. 用 Lock 替代数据库约束；
2. 用 Lock 替代数据库事务；
3. 用 Lock 解决业务一致性；
4. 用 Lock 绕过 Frozen 业务状态和库存规则。

已有能力继续保持原职责：

1. Idempotency Lease 负责防重复请求和幂等恢复；
2. Database Row Lock 负责事务内行级并发裁决；
3. Distributed Lock 只负责后台任务执行互斥和调度互斥。

## 10. Retry 设计方向

Task 7.6 统一 Retry Policy，至少包含：

1. 最大重试次数；
2. 重试间隔；
3. 失败原因；
4. 是否允许自动恢复；
5. 下一次可执行时间；
6. 每次尝试的审计记录。

禁止无限自动重试。

涉及库存、付款、附件物理删除、导入执行等业务副作用时，必须结合幂等机制、业务唯一约束、审计事实和恢复对账，不得通过简单重跑产生重复业务结果。

## 11. Dead Letter 设计方向

Dead Letter 用于建立失败闭环：

```text
Job Failed
  ↓
Retry Exhausted
  ↓
Dead Letter
  ↓
Manual Handling
  ↓
Re-execute
```

Dead Letter 不自动修改业务数据，不自动恢复业务状态，不自动补写库存流水。人工处理或重新执行必须经过正式权限、幂等、审计和业务前置校验。

## 12. Job Audit 设计方向

后台任务必须记录：

1. Job ID；
2. Task Type；
3. Start Time；
4. End Time；
5. Worker；
6. Attempt；
7. Error；
8. Retry History；
9. Lock / Lease 取得和释放结果；
10. 与业务对象、幂等记录或审计记录的安全关联。

现有 `audit_logs` 继续保留为正式审计事实来源。是否需要扩展字段或新增 Job 审计对象，必须在后续 DCR 中判断，不得使用普通结构化日志替代正式任务审计。

## 13. 与现有模块关系

### 13.1 Attachment

Task 7.6 后续可支持：

1. 物理文件删除；
2. 删除失败恢复；
3. `pending_physical_delete` 与 `physical_delete_failed` 的后台扫描和安全重试。

当前 Database v2.3 的 `idx_attachments_status_updated_at` 只支持状态定位，不授权自动 Worker。后续接入前必须确认是否需要 DCR 或 API Change Request。

### 13.2 Import

Task 7.6 后续可支持：

1. 大批量导入；
2. 异步校验；
3. 异步执行；
4. 失败行重试。

Import 业务状态继续使用 API v1.5 与 Database v2.3 冻结状态。Job 不替代 `import_tasks.status`。

### 13.3 Backup

Task 7.6 后续可支持：

1. 定时备份；
2. 执行记录；
3. 失败恢复；
4. 保留期清理。

`backup_tasks` 是既有数据库对象，但是否足以承载通用 Job 结果和 Attempt，需要后续 DCR 判断。

### 13.4 Idempotency

Task 7.5 Persistent Idempotency 继续负责：

1. 防重复请求；
2. 幂等保护；
3. 首次安全结果重放；
4. 过期 `processing` 对账与回收。

Idempotency 不替代 Job。Job 消费业务副作用时必须复用幂等和业务唯一裁决，避免重复执行。

## 14. 变更控制

当前不提交 Database Change Request，不提交 API Change Request。

原因：

1. 本阶段只冻结架构原则；
2. 不新增数据库表、字段、索引、状态、约束或枚举；
3. 不新增 API 路径、编号、DTO、权限或错误码；
4. 不实现 Queue、Worker、Scheduler 或 Distributed Lock 代码。

后续实现阶段如新增以下内容，必须先提交对应 Change Request：

1. Job 表；
2. Attempt 表；
3. Lock 表；
4. Dead Letter 表；
5. Job Result 字段；
6. Job Audit 字段；
7. API 接口；
8. 状态、枚举、权限或错误码。

## 15. 后续实施顺序

Task 7.6 后续实施顺序为：

1. 创建并批准 Task 7.6 正式设计文档；
2. 批准 Background Job & Distributed Lock Architecture Decision；
3. 判断数据库和 API 变化；
4. 如需要，提交 DCR 或 API Change Request；
5. 实现 Job 基础能力；
6. 实现 Worker；
7. 实现 Scheduler；
8. 接入 Attachment、Import、Backup 等已批准场景。

每个实施批次必须独立 Commit、Push、GitHub 技术验收并获得项目负责人批准。未经正式批准，不得启动 Task 7.7、Task 7.8、Task 7.9 或 Phase 8。

## 16. 当前结论

Task 7.6 的架构决策已批准为 PostgreSQL-backed Queue 与 PostgreSQL-first Distributed Lock 方向。Redis Queue、Kafka、RabbitMQ、SQS 和其他 MQ 系统不作为第一阶段默认方案。

本文件不修改 Frozen Database Logical Design v2.3、API Master Specification v1.5、DTO、权限、错误码、枚举、Migration、Prisma Schema、Mapping Audit 或业务规则。
