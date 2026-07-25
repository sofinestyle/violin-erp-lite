---
document_name: Task 7.4 Attachment Framework
project: Violin ERP Lite
version: 1.2
status: In Progress
owner: Project Manager
created_date: 2026-07-25
updated_date: 2026-07-25
related_phase: Phase 7
---

# Task 7.4：Attachment Framework

## 1. 正式状态

- Task Status：In Progress；
- Current Task：Task 7.4 Attachment Framework；
- Batch 7.4-A Implementation：Completed / Pending Approval。

Batch 是 Task 7.4 内部实施批次，不进入 `CURRENT_STATUS.md`、`ROADMAP.md`、`PROJECT.md` 或 `README.md`。Task 7.4 未完成、未关闭，也未启动 Task 7.6。

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

## 4. 本批次明确未实现

- `ATT-001` 至 `ATT-008` API；
- Route、Controller 或 HTTP Error Mapping；
- Upload、Download 或 Streaming；
- Attachment 删除执行流程或 Storage 删除补偿；
- Background Worker 或 Task 7.6 Distributed Lock；
- Import 业务接入；
- 页面或 Mini Program 功能。

本批次未修改 Database v2.3、API v1.5、Prisma Schema、Migration、Mapping Audit、Object Type、Category、Status、DTO、权限代码或正式 API 数量。

## 5. 后续边界

Batch 7.4-A 必须先完成独立 GitHub 技术验收。未经项目负责人后续正式指令，不得开始 Attachment API、Upload、Download、删除流程或下一内部批次。
