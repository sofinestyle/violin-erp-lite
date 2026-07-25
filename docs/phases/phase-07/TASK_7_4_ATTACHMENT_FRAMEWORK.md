---
document_name: Task 7.4 Attachment Framework
project: Violin ERP Lite
version: 1.1
status: In Progress
owner: Project Manager
created_date: 2026-07-25
updated_date: 2026-07-25
related_phase: Phase 7
---

# Task 7.4：Attachment Framework

## 1. 正式状态

- Task Status：In Progress；
- Implementation Status：Governance Prerequisites Pending；
- Current Task：Task 7.4 Attachment Framework。

Task 7.4 未完成、未关闭，也未退回 Waiting / Not Started。

## 2. 历史依赖与恢复结论

`ATT-001` 上传要求生产级持久化幂等。Attachment Framework 不得：

- 使用进程内 Map 作为生产级幂等能力；
- 建立 Attachment 专用持久化幂等；
- 绕过统一 Platform Idempotency Framework。

Database Logical Design v2.2 与 API Master Specification v1.4 已完成前置冻结。Task 7.5 已完成统一幂等与并发控制基础并通过 GitHub 技术验收，正式状态为 Completed / Approved。Task 7.4 因 Task 7.5 产生的历史依赖暂停现已解除，并恢复为 Current Task。

## 3. 后续治理前置顺序

Task 7.4 后续必须按以下顺序执行：

1. DCR-005 Approval；
2. Database v2.3 Documentation & Migration Sync；
3. API CR-005 Approval；
4. API v1.5 Documentation Sync；
5. Attachment Framework Implementation。

DCR-005 与 API CR-005 继续保持 Proposed / Pending Approval。未经正式批准与 SSOT 同步，不得进入 Attachment Framework Implementation。

## 4. 未变边界

- 不提前实现 Attachment Route、Service、Repository 或测试；
- 不修改 Frozen Database v2.2 或 API v1.4；
- DCR-005 与 API CR-005 保持原状态，本次状态同步不批准、不修改；
- 不提前实现 Import 或后台清理 Worker；
- Task 7.4 实施时仍须遵守届时有效的 Approved / Frozen SSOT。

## 5. 本轮结论

本轮只批准 Task 7.5、解除 Task 7.4 的历史平台依赖暂停并切换 Current Task，不实施 Attachment 代码，不批准或修改 DCR-005 与 API CR-005。
