---
document_name: Task 7.5 Idempotency & Concurrency Control
project: Violin ERP Lite
version: 1.0
status: In Progress
owner: Project Manager
created_date: 2026-07-25
updated_date: 2026-07-25
related_phase: Phase 7
---

# Task 7.5：Idempotency & Concurrency Control

## 1. 正式状态

- Task Status：In Progress；
- Current Task：Task 7.5 Idempotency & Concurrency Control；
- Phase Status：Phase 7 In Progress。

## 2. 正式输入

- Database Logical Design v2.2：Completed / Approved / Frozen；
- API Master Specification v1.4：Completed / Approved / Frozen；
- DCR-004：Completed / Approved；
- API CR-004：Completed / Approved。

## 3. 后续实施范围

1. 建立 `idempotency_records` Repository；
2. 实现原子认领；
3. 生成 Canonical Request Hash；
4. 生成 Key HMAC Hash；
5. 管理 `processing` 租约；
6. 重放 `completed` / `failed` 首次安全结果；
7. 拒绝同 Key、不同 Request Hash；
8. 对过期 `processing` 进行对账与回收；
9. 持久化安全响应；
10. 建立高风险 API Adapter 与中间件边界；
11. 收口并发控制；
12. 不提前实现 Attachment、Import 或后台 Worker。

## 4. 执行边界

- 本次只正式启动 Task 7.5，不实现代码；
- 不修改数据库、Prisma、Migration、Mapping Audit 或 Frozen API；
- 不实施 Task 7.4 Attachment Framework；
- 不实施 Task 7.6 Background Job & Distributed Lock；
- 如后续实现需要超出 Database v2.2 或 API v1.4，必须停止对应部分并提出独立 DCR 或 API Change Request。

## 5. 本轮结论

Task 7.5 已成为 Current Task，正式状态为 In Progress。后续须等待独立正式执行指令。
