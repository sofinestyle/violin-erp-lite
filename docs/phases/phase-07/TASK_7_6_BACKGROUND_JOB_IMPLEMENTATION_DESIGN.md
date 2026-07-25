---
document_name: Task 7.6 Background Job Implementation Design
project: Violin ERP Lite
version: 1.0
status: Completed / Approved
owner: Project Manager
created_date: 2026-07-25
updated_date: 2026-07-25
related_phase: Phase 7
---

# Task 7.6：Background Job Implementation Design

## 1. 正式范围

本文件基于已批准的 Task 7.6 Architecture Decision、Database Logical Design v2.4、Prisma Schema 和 Forward-only Migration，定义后台任务与分布式锁的实现设计。

本设计覆盖：

1. Job 生命周期；
2. PostgreSQL-backed Queue；
3. Worker 执行模型；
4. Scheduler 触发模型；
5. Job Lease 与 Scheduler Lock；
6. Retry 与 Backoff；
7. Dead Letter；
8. Job Audit；
9. Attachment、Import、Backup 与 Idempotency 的接入边界。

本文件不授权：

1. 修改数据库结构；
2. 修改 API Spec；
3. 修改 Permission；
4. 编写 Worker 代码；
5. 编写 Queue 代码；
6. 编写 Scheduler 代码；
7. 接入任何业务模块；
8. 修改业务领域表或业务状态机。

## 2. Job Lifecycle

### 2.1 Job 创建

Job 创建必须写入 `jobs` 主表。`jobs` 是后台任务状态、Queue 等待、执行租约和 Retry 裁决的唯一平台事实来源。

创建 Job 时必须确定：

1. `job_type`：受控后台任务类型代码；
2. `job_key`：同一逻辑 Job 的幂等创建 Key；
3. `status = pending`；
4. `priority`；
5. `target_object_type` 与 `target_object_id`，两者必须同时为空或同时非空；
6. 脱敏后的 `payload`；
7. `scheduled_at`；
8. `available_at`；
9. `max_attempts`；
10. `request_trace_id`；
11. `created_by`、`updated_by`，系统任务可空。

同一 `job_type + job_key` 只能创建一个 Job，由 `uq_jobs_job_type_job_key` 裁决。调用侧不得使用进程内 Map 或缓存替代该数据库唯一约束。

Job 创建可以由 API、Scheduler 或后续获批业务流程触发。若由用户请求触发，用户请求本身仍应使用 Task 7.5 `idempotency_records` 做请求级幂等；Job 的生命周期不由 `idempotency_records` 承载。

### 2.2 Queue 等待

处于以下状态且满足时间条件的 Job 可以进入候选队列：

1. `status = pending`；
2. `status = retrying`；
3. `available_at <= now()`；
4. 无有效执行租约，或 `locked_until IS NULL`。

`idx_jobs_claim (status, available_at, priority, created_at)` 是 Worker Claim 的主索引。Worker 必须按 `priority ASC, available_at ASC, created_at ASC` 的稳定顺序领取任务。

### 2.3 Worker 领取

Worker 领取 Job 时必须在数据库事务中完成：

1. 查询候选 Job；
2. 使用 PostgreSQL 行级锁锁定候选行；
3. 设置 `status = running`；
4. 设置 `locked_by`；
5. 设置 `locked_until`；
6. 设置 `started_at`；
7. 增加或同步 `attempt_count`；
8. 创建对应 `job_attempts` 行，状态为 `running`；
9. 写入 `audit_logs` 审计事实。

推荐 Claim SQL 语义为：

```text
SELECT ...
FROM jobs
WHERE status IN ('pending', 'retrying')
  AND available_at <= now()
  AND (locked_until IS NULL OR locked_until < now())
ORDER BY priority ASC, available_at ASC, created_at ASC
FOR UPDATE SKIP LOCKED
LIMIT N
```

领取成功后必须立即写入执行租约。Worker 不得先在内存中标记任务后异步更新数据库。

### 2.4 执行

Worker 执行 Job 时必须以 `job_type` 分派到受控 Handler。Handler 必须遵守：

1. 不绕过业务 Service；
2. 不直接修改库存余额；
3. 不修改 Frozen 业务状态机；
4. 不使用 Job 状态替代业务状态；
5. 涉及业务副作用时必须结合业务唯一约束、事务、幂等和审计；
6. 不把敏感原文、Token、Secret、Storage 私有路径写入 `payload`、`result_body`、`error_detail` 或 `audit_logs`。

### 2.5 成功

Job 成功时，Worker 必须在数据库事务中完成：

1. 将当前 `job_attempts.status` 更新为 `succeeded`；
2. 写入 `ended_at` 与 `duration_ms`；
3. 将 `jobs.status` 更新为 `succeeded`；
4. 写入 `completed_at`；
5. 清空 `locked_until` 与 `locked_by`；
6. 写入或确认唯一 `job_results`；
7. 写入 `audit_logs`。

`job_results` 只保存最终安全结果摘要，不保存文件本体、凭据、二进制内容或敏感原文。

### 2.6 失败

Job 执行失败时，Worker 必须记录失败 Attempt：

1. 当前 `job_attempts.status = failed` 或 `timed_out`；
2. 写入 `ended_at`、`duration_ms`；
3. 写入脱敏后的 `error_code`、`error_message`、`error_detail`；
4. 同步 `jobs.last_error_code` 与 `jobs.last_error_message`；
5. 写入失败审计。

失败后由 Retry Policy 裁决进入 `retrying`、`failed` 或 `dead_letter`。

### 2.7 Retry

若失败满足自动重试条件，Job 进入：

1. `jobs.status = retrying`；
2. `available_at = next_retry_at`；
3. `locked_until = NULL`；
4. `locked_by = NULL`。

每次 Retry 必须对应新的 `job_attempts` 行，不得覆盖历史 Attempt。

### 2.8 Dead Letter

当 Retry 耗尽或失败不可自动恢复时，Job 进入：

1. `jobs.status = dead_letter`；
2. `jobs.completed_at = now()`；
3. `locked_until = NULL`；
4. `locked_by = NULL`；
5. 新增唯一 `job_dead_letters` 行；
6. 写入 Dead Letter 审计。

Dead Letter 不自动修改业务数据。后续人工处理和重放必须经过权限、审计、业务前置校验和幂等保护。

## 3. Queue Design

### 3.1 Queue 数据来源

Queue 数据来源只允许是 `jobs` 表。普通日志、进程内内存、缓存、业务表状态或 `idempotency_records` 都不得成为 Queue 事实来源。

### 3.2 Job Claim 方式

Job Claim 必须依赖 PostgreSQL 事务和行级锁：

1. 使用 `FOR UPDATE SKIP LOCKED` 避免多 Worker 领取同一 Job；
2. 使用 `idx_jobs_claim` 缩小候选范围；
3. Claim 与写入执行租约必须在同一事务完成；
4. Claim 成功后必须创建 `job_attempts`；
5. Claim 失败时不得写入 Attempt。

### 3.3 并发领取

多 Worker 并发时，数据库是唯一裁决来源：

1. 每个 Worker 可按配置批量 Claim；
2. 同一 Job 同一时刻只能有一个有效 `locked_by`；
3. 被其他事务锁住的候选 Job 通过 `SKIP LOCKED` 跳过；
4. Worker 不得使用随机抢占或缓存锁绕过数据库 Claim；
5. 并发测试必须覆盖多个 Worker 实例同时 Claim 的场景。

### 3.4 Lease 机制

Job Lease 使用 `jobs.locked_until + jobs.locked_by` 表达当前执行租约，使用 `job_attempts.lease_expires_at` 记录本次 Attempt 租约截止。

Lease 规则：

1. Claim 成功后立即设置；
2. Worker 执行长任务时可以续租；
3. 续租必须校验当前 `locked_by` 与 Attempt；
4. Lease 过期不等于业务失败，只表示执行权可恢复；
5. Lease 不替代数据库事务或业务一致性约束。

### 3.5 超时恢复

超时恢复扫描条件：

```text
jobs.status = 'running'
AND jobs.locked_until < now()
```

恢复流程：

1. 锁定超时 Job；
2. 将当前 running Attempt 标记为 `timed_out`；
3. 记录超时错误摘要；
4. 根据 Retry Policy 决定 `retrying` 或 `dead_letter`；
5. 清理 `locked_until` 与 `locked_by`；
6. 写入审计。

超时恢复不得直接修改业务状态。若 Handler 可能已产生业务副作用，必须依赖业务幂等、唯一约束和审计对账。

## 4. Worker Design

### 4.1 Worker 职责

Worker 职责限定为：

1. Claim Job；
2. 创建 Attempt；
3. 执行受控 Handler；
4. 续租；
5. 捕获错误；
6. 更新 Job、Attempt、Result、Dead Letter；
7. 写入 `audit_logs`；
8. 支持 Graceful Shutdown。

Worker 不负责：

1. 定义业务规则；
2. 修改 API 契约；
3. 修改权限；
4. 绕过 Service 直接写业务表；
5. 自动修复业务数据。

### 4.2 执行上下文

每个 Job 执行上下文至少包含：

1. `job_id`；
2. `job_type`；
3. `attempt_id`；
4. `attempt_no`；
5. `worker_id`；
6. `request_trace_id`；
7. `target_object_type`；
8. `target_object_id`；
9. 脱敏 `payload`；
10. 当前 Lease 截止时间。

系统任务可以没有用户操作者，但仍必须有 `request_trace_id`、`worker_id` 和审计记录。

### 4.3 并发限制

Worker 并发限制分为三层：

1. 进程级最大并发数；
2. `job_type` 级并发数；
3. 目标对象级互斥规则。

目标对象级互斥不得依赖缓存。若同一目标对象不能并发执行，应通过 `job_key`、数据库唯一约束、Job Claim 条件或业务 Service 事务裁决。

### 4.4 错误处理

Worker 必须捕获所有 Handler 错误并分类：

1. 可重试技术错误；
2. 可重试外部依赖错误；
3. 不可重试校验错误；
4. 不可重试业务前置条件失败；
5. 超时；
6. 未分类异常。

错误记录必须脱敏。禁止记录密钥、Token、密码、Storage 私有路径、个人敏感原文或真实业务敏感数据。

### 4.5 Shutdown 流程

Worker 收到 Shutdown 信号后必须：

1. 停止领取新 Job；
2. 等待正在执行的 Job 在配置时间内完成；
3. 对可安全终止的 Job 记录取消或失败；
4. 对不可安全中断的 Job 保留 Lease，由超时恢复处理；
5. 释放已确认不再执行的 Lease；
6. 写入 Shutdown 审计或结构化运行日志。

Shutdown 不得把未完成 Job 标记为 `succeeded`。

## 5. Scheduler Design

### 5.1 Scheduler 职责

Scheduler 只负责：

1. 周期触发；
2. 获取 `scheduler_locks`；
3. 判断是否需要创建 Job；
4. 创建 Job；
5. 记录调度审计。

Scheduler 不直接执行业务任务。

### 5.2 创建 Job 规则

Scheduler 创建 Job 必须使用稳定 `job_key`：

1. 周期任务应包含 `job_type + schedule_window`；
2. 针对对象的任务应包含 `job_type + target_object_type + target_object_id + logical_window`；
3. 同一逻辑周期重复触发时，由 `uq_jobs_job_type_job_key` 返回已存在 Job；
4. Scheduler 不得用当前时间戳作为唯一去重依据。

### 5.3 防重复触发

Scheduler 防重复触发由两层组成：

1. `scheduler_locks.lock_key` 保证同一调度器同一时间窗口只有一个触发者；
2. `jobs.job_type + job_key` 保证即使 Scheduler 重入，也不会创建重复 Job。

`scheduler_locks` 只防止重复触发，不替代 Job 唯一约束。

## 6. Lock Design

### 6.1 `scheduler_locks` 使用

`scheduler_locks` 是 Scheduler 触发锁：

1. `lock_key` 表示调度任务唯一锁；
2. `owner_id` 表示当前 Scheduler 实例；
3. `locked_until` 表示租约截止；
4. `last_acquired_at` 表示最近取得时间；
5. `released_at` 表示主动释放时间。

获取锁必须通过数据库原子写入或更新完成。锁过期后可被其他 Scheduler 取得。

### 6.2 Job Lease 使用

Job Lease 位于 `jobs` 与 `job_attempts`：

1. `jobs.locked_until + locked_by` 表示当前执行权；
2. `job_attempts.lease_expires_at` 表示具体 Attempt 的租约截止；
3. Worker 续租必须匹配当前 Worker 和 Attempt；
4. Lease 过期后只允许恢复执行权，不自动推断业务结果。

### 6.3 与 `idempotency_records` 的区别

| 能力 | 事实来源 | 职责 |
| --- | --- | --- |
| 请求幂等 | `idempotency_records` | 防重复 API 请求、重放首次安全结果 |
| Job 执行租约 | `jobs`、`job_attempts` | 防止多个 Worker 同时执行同一 Job |
| Scheduler 锁 | `scheduler_locks` | 防止多个 Scheduler 同时触发同一周期任务 |

`idempotency_records.locked_until` 不得复用为 Worker Lease 或 Scheduler Lock。

## 7. Retry Design

### 7.1 Retry 触发条件

允许 Retry 的条件：

1. 当前 Attempt 失败或超时；
2. 错误被归类为可重试；
3. `attempt_count < max_attempts`；
4. Job 未进入终态；
5. 业务 Handler 声明重试安全，或业务副作用由幂等机制保护。

不允许 Retry 的条件：

1. 参数校验失败；
2. 权限或数据范围失败；
3. 业务前置条件已确定不可满足；
4. 已达到 `max_attempts`；
5. Handler 明确标记不可重试；
6. 可能产生重复库存、付款、单据或附件删除副作用且无幂等保护。

### 7.2 次数限制

`jobs.max_attempts` 是最大自动尝试次数，必须大于等于 1。`jobs.attempt_count` 不得超过 `max_attempts`。

禁止无限自动重试。若需要人工重新执行，必须通过 Dead Letter 处理流程形成新 Job 或获批恢复动作。

### 7.3 Backoff 策略

第一阶段采用确定性退避策略：

```text
next_retry_at = now() + min(base_delay * 2^(attempt_no - 1), max_delay)
```

建议默认策略：

1. `base_delay`：60 秒；
2. `max_delay`：30 分钟；
3. 可按 `job_type` 在代码配置中收敛；
4. 不在本阶段新增数据库字段保存动态 Retry Policy；
5. Retry 结果以 `jobs.available_at` 表达下一次可领取时间。

若后续需要用户可配置 Retry Policy、按租户/模块配置策略或对外 API 管理 Retry Policy，必须提交 CR。

## 8. Dead Letter Design

### 8.1 进入条件

Job 进入 Dead Letter 的条件：

1. `attempt_count >= max_attempts`；
2. 错误不可自动恢复；
3. Handler 判定需要人工处理；
4. 超时恢复后无法安全重试；
5. 数据一致性对账要求人工确认。

### 8.2 保存内容

`job_dead_letters` 保存：

1. `job_id`；
2. `failed_attempt_id`；
3. `dead_letter_reason`；
4. `handling_status`；
5. `handled_by`；
6. `handled_at`；
7. `handling_note`；
8. `replayed_job_id`；
9. `created_at`；
10. `updated_at`。

失败原因和处理说明必须脱敏。

### 8.3 后续处理方式

Dead Letter 后续处理包括：

1. `open`：待处理；
2. `in_review`：人工分析中；
3. `replayed`：已创建重新执行 Job；
4. `resolved`：人工确认关闭；
5. `ignored`：明确忽略并保留原因。

重放不直接复用原 Job。重放应创建新的 `jobs` 行，并通过 `job_dead_letters.replayed_job_id` 建立关系。

## 9. Job Audit Design

### 9.1 `jobs`

`jobs` 保存后台任务当前事实：

1. 当前状态；
2. 目标对象；
3. 执行租约；
4. Retry 计数；
5. 最近错误；
6. 创建与更新时间。

`jobs` 适合查询当前状态，不适合替代完整历史审计。

### 9.2 `job_attempts`

`job_attempts` 保存每次执行尝试：

1. Attempt 序号；
2. Worker；
3. 开始和结束；
4. 租约截止；
5. 错误；
6. 耗时。

Attempt 只追加或终结当前尝试，不覆盖历史尝试事实。

### 9.3 `audit_logs`

`audit_logs` 继续作为正式审计事实来源，至少记录：

1. Job 创建；
2. Job Claim；
3. Attempt 开始；
4. Attempt 成功；
5. Attempt 失败；
6. Retry 安排；
7. Lease 超时恢复；
8. 进入 Dead Letter；
9. Dead Letter 人工处理；
10. Job 重放。

`audit_logs.object_type` 可使用受控平台对象类型，例如 `job`、`job_attempt`、`job_dead_letter`。若后续需要新增客户端可见审计 API、DTO、权限或错误码，必须提交 API Change Request。

## 10. Existing Capability Integration

### 10.1 Attachment

Attachment 后续可接入：

1. 扫描 `pending_physical_delete`；
2. 执行物理文件删除；
3. 对删除失败进入可重试或 Dead Letter；
4. 保留 `physically_deleted` 墓碑；
5. 复用 Attachment Repository、Storage Adapter、Audit 与 Task 7.5 幂等能力。

Job 不改变 Attachment 生命周期状态值域，不绕过删除保护，不暴露 Storage Reference。

### 10.2 Import

Import 后续可接入：

1. 大文件异步校验；
2. 大批量导入执行；
3. 失败行处理；
4. 导入任务恢复。

`import_tasks.status` 继续是 Import 业务状态，Job 只记录后台执行事实。Import Handler 必须遵守文件摘要去重、目标范围约束、库存事务和业务审计规则。

### 10.3 Backup

Backup 后续可接入：

1. 定时创建备份 Job；
2. 后台执行备份；
3. 保存备份文件引用、大小、Checksum 和保留时间；
4. 失败后 Retry 或进入 Dead Letter。

备份领域结果继续由 `backup_tasks` 保存。Job Result 只保存平台级安全摘要。

### 10.4 Idempotency

Idempotency 与 Job 的关系：

1. 用户触发创建 Job 的 API 请求仍使用 `idempotency_records`；
2. Job 创建使用 `jobs.job_type + job_key` 保证任务级去重；
3. Worker 执行业务副作用时仍需业务级幂等与事务保护；
4. `idempotency_records` 不作为 Queue；
5. `idempotency_records.locked_until` 不作为 Job Lease。

## 11. CR 评估

### 11.1 Database Change Request

当前不需要新的 Database Change Request。

原因：

1. Database Logical Design v2.4 已提供 `jobs`、`job_attempts`、`job_results`、`job_dead_letters` 与 `scheduler_locks`；
2. 当前 Implementation Design 可以在既有字段、索引、约束和状态值域内完成；
3. 本阶段不提出新的表、字段、枚举、索引或约束。

### 11.2 API Change Request

当前不需要 API Change Request。

原因：

1. 本阶段不新增客户端可见 Job API；
2. 不新增 DTO；
3. 不新增 Permission；
4. 不新增错误码；
5. Worker、Scheduler、Retry 与 Dead Letter 均为平台内部能力设计。

若后续需要提供 Job 查询、Retry、Cancel、Dead Letter 人工处理、Scheduler 管理或运维控制接口，必须先提交 API Change Request。

### 11.3 Frozen Document Impact

当前不需要修改 Frozen 业务规则、API Spec 或权限文档。

本文件不改变业务流程、不新增业务模块、不修改业务领域表、不改变现有业务状态机。

## 12. 后续实施顺序

后续编码阶段建议按以下顺序推进：

1. Job Domain 与受控 `job_type` Registry；
2. Job Repository；
3. Claim 与 Lease 事务；
4. Attempt 记录；
5. Retry Policy；
6. Dead Letter Repository；
7. Scheduler Lock Repository；
8. Worker Runtime；
9. Scheduler Runtime；
10. Audit Writer 集成；
11. PostgreSQL 并发与恢复测试；
12. Attachment / Import / Backup 分别按获批边界接入。

每一步必须保持数据库为唯一任务事实来源，并通过真实 PostgreSQL 验证并发 Claim、Lease 超时恢复、Retry、Dead Letter 和审计写入。
