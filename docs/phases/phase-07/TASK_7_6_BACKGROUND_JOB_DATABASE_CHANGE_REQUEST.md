---
document_name: Task 7.6 Background Job Database Change Request
project: Violin ERP Lite
version: 1.1
status: Completed / Approved
owner: Project Manager
created_date: 2026-07-25
updated_date: 2026-07-25
related_phase: Phase 7
---

# Task 7.6：Background Job Database Change Request

## 1. Change Reason

Task 7.6 Background Job & Distributed Lock 已批准采用 PostgreSQL-backed Queue 与 PostgreSQL-first Distributed Lock 设计方向。该能力需要数据库承载后台任务状态、执行租约、执行尝试、结果、失败闭环和审计关联。

现有 Frozen Database Logical Design v2.3 尚无通用 Job、Job Attempt、Job Result、Dead Letter 或 Scheduler Lock 事实来源。若直接使用业务表状态、普通日志或幂等记录承载后台任务，会违反 Task 7.6 已批准的职责分离原则：

1. 业务状态不得代替 Job 状态；
2. 日志不得代替任务审计；
3. 幂等租约不得代替后台任务执行租约；
4. 缓存或进程内状态不得成为任务一致性事实来源；
5. Lock 不得替代数据库约束、数据库事务或业务一致性。

因此，Task 7.6 后续进入 Implementation Design 和实现前，需要先提交数据库变更申请设计，用于评估是否新增专用后台任务持久化对象。

本文件只提出 DCR 设计，不修改 `DATABASE_SPEC.md`、Prisma Schema、Migration、Mapping Audit、API Spec、Enum、Permission 或代码。

## 2. Existing Capability Analysis

### 2.1 `audit_logs`

当前能力：

- 记录 `occurred_at`、`user_id`、`action_code`、`module_code`、`object_type`、`object_id`、`operation_result`、`before_snapshot`、`after_snapshot`、`request_trace_id` 和失败原因；
- 已用于正式审计事实；
- 可通过 `object_type + object_id + created_at`、`user_id + created_at` 和 `created_at` 查询。

可复用范围：

- 作为 Job 创建、认领、开始、成功、失败、重试、进入 Dead Letter、人工处理和重新执行的审计收据；
- 作为 Job 与业务对象、幂等记录、附件或导入任务的审计关联。

不能替代的范围：

- 不能作为 Queue；
- 不能作为 Job 当前状态；
- 不能作为 Job Claim 或 Lease 的并发裁决；
- 不能承载结构化 Retry Policy、Attempt 序号、Worker 身份、下一次执行时间或 Dead Letter 当前处理状态；
- 不能替代 Job Result 的唯一事实来源。

结论：`audit_logs` 必须复用为审计事实，但不能作为 Job 平台主表或队列表。

### 2.2 `idempotency_records`

当前能力：

- 通过 `scope_code + idempotency_key_hash` 唯一约束完成请求级原子认领；
- 支持 `processing`、`completed`、`failed` 三种幂等状态；
- 支持 `locked_until`、安全响应、`resource_type/resource_id` 和过期终态清理；
- 已作为 Task 7.5 Persistent Idempotency 的正式事实来源。

可复用范围：

- 用户触发创建 Job 的 API 请求仍可复用 `Idempotency-Key`；
- Worker 执行业务副作用时可复用业务层幂等、唯一约束和对账机制；
- Job 可记录可选的 `idempotency_record_id` 或安全关联，用于追踪首次触发请求。

不能替代的范围：

- 不适合保存长期 Job；
- 不适合作为 Queue；
- `processing/completed/failed` 不足以表示 `pending/running/retrying/dead_letter` 等 Job 生命周期；
- `locked_until` 是请求幂等租约，不是 Worker 执行租约；
- 响应重放语义不等同于后台 Job Result；
- 清理策略可能早于 Job 审计保留期。

结论：`idempotency_records` 必须继续保持请求幂等职责，不应扩展为后台任务队列表。

### 2.3 `import_tasks`

当前能力：

- 保存导入业务任务，包括文件名、文件引用、文件摘要、导入类型、目标仓库或店铺、导入状态、行数统计、开始和完成时间；
- 已有状态值域：`pending_validation`、`validation_failed`、`pending_confirmation`、`importing`、`partially_succeeded`、`succeeded`、`cancelled`、`duplicate_file`、`failed`；
- 已有文件摘要与目标范围唯一约束，防止同文件、同类型、同目标重复导入任务。

可复用范围：

- 可作为 Import 业务对象；
- Job 可引用 `import_tasks.id` 作为业务目标；
- Worker 执行 Import 时必须遵循现有 Import 状态机、幂等规则和库存/匹配事务要求。

不能替代的范围：

- Import 状态是业务任务状态，不是通用 Job 状态；
- 不适用于 Attachment、Backup、清理等其他后台任务；
- 缺少 Worker Lease、Attempt、Backoff、Dead Letter、统一 Job Result 和通用调度字段；
- 不能把 `importing` 等业务状态改义为通用 Worker 状态。

结论：`import_tasks` 可作为 Job Target，不可复用为通用 Job Queue。

### 2.4 `backup_tasks`

当前能力：

- 保存备份任务编号、备份类型、范围、触发类型、状态、开始和完成时间、文件引用、文件大小、Checksum、保留截止时间和错误信息；
- 有 `task_no` 唯一约束和 `status + created_at` 索引。

可复用范围：

- 可作为 Backup 业务/运维目标记录；
- Job 可引用 `backup_tasks.id`；
- 备份完成后仍由 `backup_tasks` 保存备份领域结果。

不能替代的范围：

- 只适用于 Backup，不适合作为通用后台任务平台；
- 缺少通用 Job Type、Priority、Worker Lease、Retry Policy、Attempt 历史、Dead Letter 和 Scheduler 防重字段；
- `status` 的正式值域和 Job 状态职责未冻结；
- 将 Backup 表扩展为平台队列会混淆领域边界。

结论：`backup_tasks` 可作为 Backup Target，不可复用为通用 Job Queue。

## 3. Proposed Database Change

本节已获得项目负责人批准，并进入 Database Logical Design v2.4 的正式逻辑设计。物理同步、Prisma Schema、Forward-only Migration 和 Mapping Audit 留待后续阶段执行。

### 3.1 `jobs`

是否必要：必要。

原因：

- 需要通用 Queue 的唯一事实来源；
- 需要保存 Job 当前状态、类型、目标对象、优先级、调度时间、执行租约和完成结果摘要；
- 不能由 `import_tasks`、`backup_tasks` 或 `idempotency_records` 代替。

建议职责：

- 保存每个后台 Job 的主事实；
- 支持 Worker 原子 Claim；
- 支持 Scheduler 防重复创建；
- 支持状态查询、失败恢复和 Dead Letter 关联。

建议字段方向：

- `id`；
- `job_type`；
- `job_key`；
- `status`；
- `priority`；
- `target_object_type`；
- `target_object_id`；
- `payload`；
- `scheduled_at`；
- `available_at`；
- `started_at`；
- `completed_at`；
- `locked_until`；
- `locked_by`；
- `attempt_count`；
- `max_attempts`；
- `last_error_code`；
- `last_error_message`；
- `created_at`、`created_by`、`updated_at`、`updated_by`。

设计约束：

- `payload` 不得保存密钥、Token、Storage 私有凭据或敏感原文；
- `job_type` 必须是受控代码；
- `target_object_type` 必须映射正式业务对象或平台对象；
- Job 状态不得替代业务对象状态。

### 3.2 `job_attempts`

是否必要：必要。

原因：

- Retry、Backoff、错误捕获和 Worker 执行审计需要 Attempt 级事实；
- 单个 Job 可多次尝试，不能只靠 `jobs.last_error_*` 表达完整历史。

建议职责：

- 记录每次 Worker 执行尝试；
- 记录 Worker、开始时间、结束时间、执行结果、错误和耗时；
- 支撑失败定位、Retry History 和人工处理。

建议字段方向：

- `id`；
- `job_id`；
- `attempt_no`；
- `worker_id`；
- `status`；
- `started_at`；
- `ended_at`；
- `duration_ms`；
- `error_code`；
- `error_message`；
- `error_detail`；
- `request_trace_id`；
- `created_at`。

设计约束：

- 同一 `job_id + attempt_no` 必须唯一；
- 错误详情必须脱敏；
- Attempt 只能追加，不得覆盖历史尝试事实。

### 3.3 `job_results`

是否必要：建议必要。

原因：

- Job Result 与 Job 当前状态职责应分离；
- 成功或失败结果可能需要结构化摘要、资源关联和安全保留；
- 避免把大 JSON 结果直接塞入 `jobs` 主表，影响 Claim 查询。

建议职责：

- 保存 Job 的最终安全结果；
- 保存关联资源类型、资源 ID、摘要和安全响应；
- 为后续人工处理和审计查询提供稳定事实。

建议字段方向：

- `id`；
- `job_id`；
- `result_status`；
- `result_body`；
- `resource_type`；
- `resource_id`；
- `created_at`。

设计约束：

- 每个 Job 最多一个最终 Result；
- `result_body` 必须执行大小限制和敏感字段过滤；
- 不保存二进制文件本体、Storage 私有路径或凭据。

### 3.4 `job_dead_letters`

是否必要：必要。

原因：

- Retry Exhausted 后需要独立失败闭环；
- Dead Letter 不应仅靠 `jobs.status = dead_letter` 表达人工处理、重新执行和关闭过程；
- 人工处理必须保留操作原因和处理事实。

建议职责：

- 保存进入 Dead Letter 的 Job；
- 记录失败原因、最终 Attempt、人工处理状态、重新执行来源；
- 支撑人工处理和审计闭环。

建议字段方向：

- `id`；
- `job_id`；
- `failed_attempt_id`；
- `dead_letter_reason`；
- `handling_status`；
- `handled_by`；
- `handled_at`；
- `handling_note`；
- `replayed_job_id`；
- `created_at`。

设计约束：

- 同一 Job 只能有一个活动 Dead Letter；
- Dead Letter 不自动修改业务数据；
- 重新执行必须创建新 Job 或明确复用原 Job 的获批规则。

### 3.5 `job_locks` / Lease

是否必要：待定，建议拆分为两类处理。

Job 执行互斥：

- 建议优先由 `jobs.locked_until`、`jobs.locked_by`、状态条件和行级锁完成；
- Worker Claim 使用 PostgreSQL 条件更新或 `FOR UPDATE SKIP LOCKED`；
- 不一定需要独立 `job_locks` 表。

Scheduler 防重复触发：

- 建议新增独立 `scheduler_locks` 或等价平台锁对象；
- 用于周期任务按 `lock_key` 防重复创建 Job；
- 需要保存 `lock_key`、`owner_id`、`locked_until`、`last_acquired_at`、`created_at`、`updated_at`。

设计约束：

- Lock 只服务后台任务互斥和调度互斥；
- 不替代数据库唯一约束、业务事务、业务状态机或幂等记录；
- 锁必须有租约期限，不允许无限持有；
- 锁释放或过期必须可审计。

## 4. Status / Enum Impact

需要新增状态值，但建议不新增 PostgreSQL Enum，继续沿用项目既有模式：`VARCHAR(50)` + Check 约束。

建议 Job 状态代码：

- `pending`：已创建，等待执行；
- `running`：已被 Worker 认领并处于执行中；
- `retrying`：本次失败后等待下一次执行；
- `succeeded`：执行成功；
- `failed`：执行失败但未进入 Dead Letter 或仍待裁决；
- `dead_letter`：重试耗尽或不可自动恢复，进入失败闭环；
- `cancelled`：被正式取消。

建议 Attempt 状态代码：

- `running`；
- `succeeded`；
- `failed`；
- `timed_out`；
- `cancelled`。

建议 Dead Letter 处理状态代码：

- `open`；
- `in_review`；
- `replayed`；
- `resolved`；
- `ignored`。

建议 Scheduler Lock 状态：

- 如使用 `locked_until` 租约模型，可不单独设置状态；
- 若需状态字段，应限定为 `active`、`released`、`expired`，并通过 Check 约束管理。

影响结论：

- 需要新增字段级状态值域；
- 不建议新增 PostgreSQL Enum；
- 不修改现有 `import_tasks.status`、`backup_tasks.status`、`idempotency_records.status` 或 `attachments.status`。

## 5. Index / Constraint Impact

后续正式 DCR 预计需要新增以下约束与索引。

### 5.1 Unique

可能需要：

- `jobs.job_key` 或 `(job_type, job_key)` 唯一约束，用于幂等创建同一逻辑 Job；
- `job_attempts (job_id, attempt_no)` 唯一约束，确保 Attempt 序号稳定；
- `job_results.job_id` 唯一约束，确保每个 Job 最多一个最终结果；
- `job_dead_letters.job_id` 活动唯一约束，确保同一 Job 不重复进入活动 Dead Letter；
- `scheduler_locks.lock_key` 唯一约束，用于 Scheduler 防重复触发。

### 5.2 Index

可能需要：

- `jobs(status, available_at, priority, created_at)`，支持 Queue Claim；
- `jobs(locked_until)`，支持租约超时恢复；
- `jobs(target_object_type, target_object_id, created_at)`，支持按业务目标追踪；
- `jobs(job_type, created_at)`，支持分类查询和清理；
- `job_attempts(job_id, attempt_no)`，支持 Retry History；
- `job_attempts(status, started_at)`，支持运行中 Attempt 定位；
- `job_dead_letters(handling_status, created_at)`，支持人工处理队列；
- `scheduler_locks(lock_key, locked_until)`，支持调度锁获取与过期判断。

### 5.3 Foreign Key

可能需要：

- `job_attempts.job_id → jobs.id`；
- `job_results.job_id → jobs.id`；
- `job_dead_letters.job_id → jobs.id`；
- `job_dead_letters.failed_attempt_id → job_attempts.id`；
- `job_dead_letters.replayed_job_id → jobs.id`；
- 可选的操作者字段引用 `users.id`，如 `created_by`、`updated_by`、`handled_by`。

不建议为 `target_object_id` 建多态外键。业务目标存在性、权限和状态应由 Service 按 `target_object_type` 校验。

### 5.4 Check Constraint

可能需要：

- Job 状态值域；
- Attempt 状态值域；
- Dead Letter 处理状态值域；
- 时间顺序：`available_at >= created_at`、`completed_at >= started_at`、`locked_until` 合法；
- 尝试次数：`attempt_count >= 0`、`max_attempts >= 1`、`attempt_count <= max_attempts`；
- Priority 范围；
- Payload / Result 大小由应用控制，数据库可根据 PostgreSQL 能力补充基本约束；
- `target_object_type` 与 `target_object_id` 成组；
- `resource_type` 与 `resource_id` 成组；
- Dead Letter 人工处理字段组合合法。

### 5.5 Trigger / Function

原则上不优先新增 Trigger。若后续发现跨行循环、防重复或历史不可变约束无法由普通约束表达，必须在正式 DCR 中单独说明。

## 6. API Impact Assessment

API Change Request：Not Required。

理由：

1. 本 DCR 设计只提出后台任务平台数据库能力；
2. 当前不新增客户端可见 Job API；
3. 当前不修改 `ATT-*`、`IMP-*`、`LOG-*`、`SEC-*` 或其他 Frozen API；
4. 当前不新增 DTO、权限代码、错误码或接口编号。

后续如出现以下需求，则必须另行提交 API Change Request：

1. 客户端查询 Job 状态或结果；
2. 客户端查看 Dead Letter；
3. 客户端人工重放 Job；
4. 客户端取消 Job；
5. 修改 `IMP-*` 或 `ATT-*` 的异步可见响应契约；
6. 新增 Job 管理权限、错误码或 DTO。

## 7. Migration Impact

当前不执行 Migration。

本文件不创建或修改：

1. Prisma Schema；
2. `prisma/migrations/`；
3. `DATABASE_SPEC.md`；
4. `DATABASE_ENUM_SPEC.md`；
5. Mapping Audit；
6. Seed；
7. 任何数据库运行脚本。

如本 DCR 后续获批，必须创建独立 forward-only Migration，并在 Migration 前完成现有数据审计。不得修改或重写历史 Migration。

## 8. Approval Required

需要项目负责人批准的事项：

1. 是否新增通用 `jobs` 表；
2. 是否新增 `job_attempts` 表；
3. 是否新增 `job_results` 表，或将最终结果摘要合并入 `jobs`；
4. 是否新增 `job_dead_letters` 表，或只用 Job 状态表达 Dead Letter；
5. 是否新增独立 Scheduler Lock 表，或仅使用 `jobs` 唯一约束防重复调度；
6. Job、Attempt、Dead Letter、Lock 的正式状态代码；
7. Job Type 受控代码集合的管理方式；
8. 是否允许 `payload` 与 `result_body` 使用 JSON，以及大小与脱敏要求；
9. 多态业务目标字段是否不建外键；
10. 与 `audit_logs`、`idempotency_records`、`import_tasks`、`backup_tasks` 的正式关联方式；
11. 正式索引、唯一约束、外键和 Check 约束；
12. 是否需要 API Change Request；
13. 是否进入正式 DCR 编写、Database v2.4 更新、Prisma Schema 更新、Forward-only Migration 和 Mapping Audit。

## 9. Current Conclusion

Task 7.6 需要数据库变更支持。现有 `audit_logs`、`idempotency_records`、`import_tasks` 和 `backup_tasks` 均可作为关联事实或业务目标复用，但不能替代通用后台任务平台的数据事实来源。

本 DCR 设计建议新增专用 Job 平台持久化对象，并由项目负责人先批准数据库变更范围。批准前不得开始 Implementation Design、Prisma Schema 修改、Migration 编写、Worker/Queue/Scheduler/Lock 代码实现或业务模块接入。
