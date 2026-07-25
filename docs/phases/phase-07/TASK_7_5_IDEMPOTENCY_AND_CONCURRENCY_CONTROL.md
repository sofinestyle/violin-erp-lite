---
document_name: Task 7.5 Idempotency & Concurrency Control
project: Violin ERP Lite
version: 1.2
status: Completed / Approved
owner: Project Manager
created_date: 2026-07-25
updated_date: 2026-07-25
related_phase: Phase 7
---

# Task 7.5：Idempotency & Concurrency Control

## 1. 执行状态

- Implementation Status：Completed / Approved；
- Current Task：Task 7.4 Attachment Framework；
- Formal Current Task Status：In Progress；
- Phase Status：Phase 7 In Progress。

本 Task 已通过 GitHub 技术验收并获得项目负责人批准。通用持久化幂等平台作为 Task 7.4 后续实现的正式平台依赖继续有效。

## 2. 正式输入与修改范围

正式输入：

- Database Logical Design v2.2：Completed / Approved / Frozen；
- API Master Specification v1.4：Completed / Approved / Frozen；
- DCR-004：Completed / Approved；
- API CR-004：Completed / Approved。

实现只新增通用幂等平台组件、Prisma Repository、环境变量模板与自动化测试。未修改 Prisma Schema、Migration、Mapping Audit、Frozen Database/API、API 总数、DTO、权限或错误码；未实现 Attachment、Import 业务流程或 Background Worker。

## 3. 平台组件

唯一平台边界包括：

- `IdempotencyAdapter`：统一认领、状态裁决、重放、对账和执行流程；
- `IdempotencyMiddleware`：只从既有 `Idempotency-Key` Header 读取原始 Key；
- `PrismaIdempotencyRepository`：封装 `idempotency_records` 的全部 Prisma 操作；
- `createPersistentIdempotencyAdapter()`：生产默认 PostgreSQL 组装入口；
- `IdempotencyKeyHasher`：服务端 Secret 参与的 HMAC-SHA-256；
- `CanonicalRequestHasher`：稳定规范化及 SHA-256；
- `IdempotencyScopeResolver`：用户与 API 动作隔离；
- `IdempotencyResponseSanitizer`：安全响应过滤及大小限制；
- `IdempotencyReconciliationStrategy`：过期 `processing` 对账接口；
- `IdempotencyRepository.removeExpiredTerminalRecords()`：后续清理接口边界。

现有认证内存 Adapter 继续只表示单进程开发/测试替身，不是本平台的生产默认实现。

## 4. Repository 与原子认领

Repository 直接尝试插入 `processing`，依赖
`uq_idempotency_records_scope_code_key_hash` 完成原子认领。唯一冲突后重新读取正式记录并按 Request Hash、状态和租约裁决，不使用“先查询再插入”、进程内 Map、Mutex 或 Redis Lock。

终态更新必须同时匹配：

- 记录 ID；
- `processing` 状态；
- Request Hash；
- 当前认领的 `request_trace_id`；
- 有效保留期。

过期回收使用 `status + request_hash + locked_until` 条件更新，多个实例只能有一个完成回收。

## 5. Hash、Scope 与配置

### 5.1 Key HMAC Hash

- 原始 Key 只存在于请求调用栈；
- 使用 `IDEMPOTENCY_HMAC_SECRET` 生成 HMAC-SHA-256；
- Secret 缺失或少于 32 字符时拒绝初始化；
- 原始 Key 不进入数据库、日志、Trace 或响应。

### 5.2 Canonical Request Hash

Request Hash 覆盖 API 动作、Method、Path 参数、业务 Query、Body、文件 Checksum、仓库/店铺目标和 Authentication Scope。对象 Key 稳定排序，数组顺序保持；`undefined`、`null`、Date、数字和 Boolean 使用确定表达；密码、Token、Cookie、Authorization 和 Secret 不参与；最终使用 SHA-256。

### 5.3 Scope

正式 Scope 使用：

```text
subject:user:{authenticatedUserId}|action:{apiId}
```

无 API ID 时才回退到 Method 与规范 Path Template。仓库/店铺和当前授权摘要进入 Request Hash，不擅自改变 DCR-004 的 `scope_code` 定义。不同用户或 API 动作不能共享幂等记录。

### 5.4 集中配置

`.env.example` 新增：

- `IDEMPOTENCY_HMAC_SECRET`；
- `IDEMPOTENCY_LEASE_SECONDS`；
- `IDEMPOTENCY_RETENTION_SECONDS`；
- `IDEMPOTENCY_MAX_RESPONSE_BYTES`。

租约、保留期和响应大小均由平台加载器集中校验，业务调用方不能逐请求覆盖。

## 6. 状态、重放与对账

- 有效 `processing`：返回 `409 SECURITY_REPLAY_DETECTED`；Adapter 提供安全 `retryAfterSeconds`，不暴露租约时间、Hash、内部主键或锁；
- 同 Key 不同 Request Hash：所有状态均返回同一 409，原记录不变，不执行操作；
- `completed`：重新执行授权回调后返回首次安全状态与 Body，不重新执行业务；
- `failed`：重新执行授权回调后返回首次安全失败，不重新执行业务；
- 过期 `processing`：必须先调用 `reconcileExpiredProcessing()`；
- 对账结果只允许确认成功、确认失败、确认无副作用后回收重试或无法确认；
- 无法确认时保持 `processing` 并稳定返回 409；
- 本 Task 不包含 Attachment/Import 专用对账，也不实现后台清理 Worker。

## 7. 安全响应

`IdempotencySafeResponse` 映射 Database v2.2 的：

- `response_http_status`；
- `response_body`；
- `resource_type` / `resource_id`；
- `request_trace_id`。

Sanitizer 递归移除 Token、Cookie、密码、Secret、SQL、堆栈、Storage 引用、URL、邮箱、电话、微信身份与 IP 等敏感字段，拒绝循环、非法数字、非 JSON 数据、资源字段不成组及超出大小限制的响应。

## 8. 测试证据

单元测试覆盖：

- Repository 原子插入、唯一冲突重读和认领者条件终态；
- HMAC 稳定性、Secret 隔离及配置失败关闭；
- Canonical Key 排序、数组、`undefined` / `null` 和敏感输入排除；
- 用户/API Scope 隔离；
- Header Middleware；
- 安全响应过滤；
- completed / failed 重放；
- 同 Key 不同 Hash；
- 租约过期必须先对账。

PostgreSQL 18.4 隔离测试库部署全部正式 Migration 后验证：

- 20 个同 Key、同请求并发：1 个成功认领，19 个稳定 409；
- 业务操作执行次数：1；
- 正式幂等记录数：1；
- completed / failed 首次结果重放且不重复执行；
- 同 Key 不同 Hash 不执行；
- 过期 processing 无法确认时不回收，确认无副作用后条件回收；
- 4 个独立 Prisma Client / Repository 实例共同竞争时仍由 PostgreSQL 唯一裁决。

## 9. SSOT 与剩余边界

- 不需要新增 DCR 或 API Change Request；
- Database v2.2 与 API v1.4 足以完成本 Task；
- 高风险业务 API 后续必须通过统一 Middleware/Adapter 接入；
- Task 7.4、Import 和后台 Worker 仍未实现；
- 清理调度属于后续 Background Job 边界，本 Task 只提供安全删除终态记录的 Repository 接口。

## 10. 结论

Task 7.5 已通过 GitHub 技术验收，正式状态为 Completed / Approved。Current Task 已切换为 Task 7.4 Attachment Framework / In Progress；本次状态同步不实施 Attachment、Import 或 Background Worker。
