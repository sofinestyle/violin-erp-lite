---
document_name: Task 7.4 Attachment Framework
project: Violin ERP Lite
version: 1.5
status: Completed / Approved
owner: Project Manager
created_date: 2026-07-25
updated_date: 2026-07-25
related_phase: Phase 7
---

# Task 7.4：Attachment Framework

## 1. 正式状态

- Task Status：Completed / Approved；
- Current Task：Task 7.6 Background Job & Distributed Lock；
- Current Task Status：Waiting / Not Started；
- Batch 7.4-A Implementation：Completed / Approved；
- Batch 7.4-B Implementation：Completed / Approved；
- Batch 7.4-C Implementation：Completed / Approved；
- Task 7.4 Implementation：Completed / Approved。

Batch 是 Task 7.4 内部实施批次，不进入 `CURRENT_STATUS.md`、`ROADMAP.md`、`PROJECT.md` 或 `README.md`。Task 7.4 已通过 GitHub 技术验收并正式关闭；Task 7.6 仅成为 Current Task，仍未启动。

## 2. 正式实现基线

- Database Logical Design v2.3：Completed / Approved / Frozen；
- API Master Specification v1.5：Completed / Approved / Frozen；
- Attachment Framework SSOT Completion 001：Completed / Approved；
- Database Change Request 005：Completed / Approved；
- API Change Request 005：Completed / Approved；
- Task 7.3 Object Storage & File Lifecycle：Completed / Approved；
- Task 7.5 Idempotency & Concurrency Control：Completed / Approved。

历史治理前置已经全部关闭。Attachment Framework 不得使用进程内 Map 作为生产级幂等能力，不得建立 Attachment 专用持久化幂等，不得绕过 Task 7.3 Storage 或 Task 7.5 Persistent Idempotency。

## 3. Batch 7.4-A 完成范围

本批次建立 Attachment Framework 基础领域层：

1. 冻结 17 个 Object Type 的统一 `AttachmentObjectRegistry`；
2. 冻结 10 个 Category 的统一 `AttachmentCategoryRegistry`；
3. 建立 `AttachmentRepository` 与 Prisma 实现；
4. 建立 `AttachmentLinkRepository` 与 Prisma 实现；
5. 建立统一 `AttachmentValidator`；
6. 建立五状态 `AttachmentLifecycle`；
7. 建立不包含 HTTP 语义的 Attachment Domain Error；
8. 完成领域、Repository、唯一约束及 PostgreSQL 18.4 集成测试。

Object Type 与 Category 的分派只通过 Registry 完成。业务 Service 不得使用 `switch` 或 `if-else` 建立平行 Object Type 规则。Attachment 与 Link 的数据库访问只通过 Repository 完成，业务层不得直接调用 Prisma。

## 4. Batch 7.4-B 完成范围

本批次严格按 API Master Specification v1.5 实现：

1. `ATT-001 POST /api/v1/attachments`：单文件 multipart 上传并关联；
2. `ATT-002 GET /api/v1/attachments`：对象范围、敏感过滤、稳定排序与分页；
3. `ATT-003 GET /api/v1/attachments/{attachmentId}`：安全 Metadata、可见 Link 与实时 Permission；
4. `ATT-004 GET /api/v1/attachments/{attachmentId}/download`：经 `ObjectStorageAdapter.stream()` 的流式下载；
5. 统一 `AttachmentService` 协调 Registry、Validator、Repository、Storage、Persistent Idempotency 与 Audit；
6. 统一 multipart/query DTO 解析、Frozen Error Mapper、敏感默认值、文件安全与下载 Header；
7. `ATT-001` 在同一 PostgreSQL 事务内写 `attachments`、`attachment_links` 与 `audit_logs`；
8. Storage 成功但事务失败时执行 Soft Delete 与 Physical Delete 补偿；
9. 复用 Task 7.5 Persistent Idempotency，并通过 Audit Receipt 对账已提交但终态未写入的上传；
10. 完成单元、HTTP 边界及 PostgreSQL 18.4 + Local Storage 集成测试。

20 个独立 Service/Repository 实例使用相同 Idempotency Key 并发时，PostgreSQL 只允许一次认领、一次 Storage 写入和一个 Attachment/Link 结果。相同 Key/相同 Hash 重放首次安全结果；相同 Key/不同 Hash 返回既有 `SECURITY_REPLAY_DETECTED`。

## 5. Batch 7.4-C 完成范围

本批次严格按 API Master Specification v1.5 完成剩余 Attachment API：

1. `ATT-005 POST /api/v1/attachments/{attachmentId}/links`：统一对象 Registry、Category、权限、数据范围、状态、敏感性、保护规则与 Storage Metadata 校验后创建关联；
2. `ATT-006 POST /api/v1/attachments/{attachmentId}/links/unlink`：事务内解除指定关联并写正式审计，不触碰 Storage 对象；
3. `ATT-007 POST /api/v1/attachments/{attachmentId}/delete`：实现 `active → soft_deleted → pending_physical_delete → physically_deleted` 完整删除状态机，以及 `pending_physical_delete → physical_delete_failed → pending_physical_delete` 失败重试；
4. `ATT-008 GET /api/v1/attachments/{attachmentId}/lifecycle`：从正式 Attachment、Link、Storage Metadata 与 Audit Log 只读生成生命周期摘要和事件；
5. `ATT-005`、`ATT-006`、`ATT-007` 全部复用 Task 7.5 Persistent Idempotency，支持首次安全结果重放、同 Key 不同 Hash 冲突和已提交结果对账；
6. `ATT-005` 使用 PostgreSQL 行锁和既有唯一约束裁决并发重复关联；
7. `ATT-007` 在每个状态事务内锁定 Attachment、执行版本比较、重新校验有效关联，并保留 `physically_deleted` 墓碑；
8. Storage Soft Delete 失败时回滚数据库状态；Physical Delete 失败时保留 `physical_delete_failed`，供显式新请求重试；
9. 审计写入失败时对应数据库状态事务整体回滚，不以普通日志替代正式审计；
10. 完成 DTO、HTTP Route、错误映射、Audit Reader、Repository、事务锁以及 PostgreSQL 18.4 + Local Storage 集成测试。

## 6. 明确未实现

- Background Worker 或 Task 7.6 Distributed Lock；
- 自动重试、定时清理或独立恢复 API；
- Import 业务接入；
- 页面或 Mini Program 功能。

本批次未修改 Database v2.3、API v1.5、Prisma Schema、Migration、Mapping Audit、Object Type、Category、Status、DTO 字段、权限代码、错误码或正式 API 数量。

## 7. 验证结论

- Attachment HTTP/Domain 单元测试通过；
- 全仓既有测试继续通过；
- PostgreSQL 18.4 + Local Storage 集成测试通过；
- `ATT-001` 20 并发只执行一次 Storage `store()`；
- 审计失败时数据库事务回滚且 Storage 完成补偿；
- Storage 补偿失败返回 Frozen Storage 错误且写失败审计；
- `ATT-004` 只对 `active` 状态返回安全流式响应；
- 敏感附件无字段权限时不进入列表总数，详情不泄露存在性，下载拒绝。
- `ATT-005` 并发创建同一关联只提交一个 Link，重复请求由数据库唯一约束裁决；
- `ATT-006` 只解除目标 Link，保护对象与敏感附件继续执行实时授权；
- `ATT-007` 成功路径保留墓碑且删除 Storage 对象，失败路径进入 `physical_delete_failed` 并支持显式重试；
- 并发删除只允许一个请求产生 Storage 删除副作用，过期 processing 可依据已提交 Audit Receipt 对账；
- `ATT-008` 覆盖五个正式状态，只读查询不改变 Attachment 状态或 Storage 生命周期。

## 8. 后续边界

Batch 7.4-A、Batch 7.4-B 与 Batch 7.4-C 均已通过 GitHub 技术验收并获得批准，Task 7.4 正式状态为 `Completed / Approved`。Current Task 已切换为 Task 7.6，但 Task 7.6 继续保持 `Waiting / Not Started`；未经项目负责人正式执行指令，不得启动 Task 7.6。
