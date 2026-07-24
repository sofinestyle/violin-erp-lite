---
document_name: Task 7.1 Platform Baseline & Existing Capability Audit
project: Violin ERP Lite
version: 1.0
status: In Progress
owner: Project Manager
created_date: 2026-07-24
updated_date: 2026-07-24
related_phase: Phase 7
---

# Task 7.1：Platform Baseline & Existing Capability Audit

## 1. 任务目的

建立 Platform Foundation 的正式审计基线，识别已有平台能力、唯一事实来源、实现位置、自动化证据、缺口、重复实现和治理依赖，为 Task 7.2 至 Task 7.8 提供不重做既有成果的执行输入。

本 Task 已正式启动，状态为 In Progress。本轮路线重构只创建任务入口，不执行平台代码整改，不提前开始 Task 7.2。

## 2. 审计范围

- Monorepo、运行环境、依赖方向与公共包；
- Authentication、Session、Token、Authorization 与 RBAC；
- 上传、Object Storage 与文件生命周期；
- Attachment 数据对象、关联、安全与权限；
- Idempotency-Key、Request Hash、并发认领、重放与租约；
- Background Job、重试、恢复与 Distributed Lock；
- Cache 与 Event Infrastructure；
- Audit Log、Request ID、Trace、结构化日志、Health 与可观测性；
- Web、Mini Program、API、Repository、Prisma 与 PostgreSQL 的平台接入点；
- 现有测试、真实 PostgreSQL 证据、构建和启动方式；
- Proposed DCR-004、API CR-004 及其他待批准治理依赖。

## 3. 已确认的迁移基线

- 原 Phase 7 已迁移为 Phase 8 Application Development；
- 原 Task 7.1 与 Task 7.6 独立文件已迁移为 Task 8.1 与 Task 8.6；
- 原 Task 7.2 至 Task 7.5 没有独立 Task 文件，完成事实继续由 ROADMAP、PROJECT、DECISION_LOG、CHANGELOG 和 Git 历史追溯；
- 原 Batch 7.6-C1 已映射为 Batch 8.6-C1，其状态只在 Task 8.6 与 `CHANGELOG.md` 中维护；
- 原 Phase 8 Test Plan 已迁入 Phase 9 Test Plan & System Integration；
- 原 Phase 9 Acceptance & Release 已迁入 Phase 10 Release & Acceptance；
- 历史 Commit SHA、日期、API 编号、Database/API 版本和当时的执行证据未被重写。

## 4. 审计记录要求

每项平台能力必须记录：

1. 编号；
2. 能力名称；
3. 正式 SSOT；
4. 当前实现文件；
5. 当前测试和运行证据；
6. 已验证结论；
7. 缺口与风险；
8. 建议归属 Task；
9. 是否需要代码修改；
10. 是否需要测试；
11. 是否存在 SSOT 冲突；
12. 是否依赖 DCR 或 API Change Request。

发现 Frozen SSOT 冲突时停止冲突部分，只记录证据并发起正式治理，不自行修改。

## 5. 结果分级

- **Blocker**：阻止平台作为 Phase 8 统一基础；
- **Major**：关键公共能力不完整、不可复用或缺少正式持久化；
- **Minor**：不阻断平台但影响稳定性、维护性或观测性；
- **Verified**：SSOT、实现和验证证据一致；
- **Deferred by Approved Change**：已有正式批准的后续 Task 或 Change Request 处理；
- **Out of Scope**：属于业务应用、Phase 9 测试执行或 Phase 10 发布验收。

## 6. 明确边界

- 不修改数据库 Schema、Migration、Mapping Audit 或 Seed；
- 不修改 API、DTO、权限、错误码或335个接口总数；
- 不修改业务代码、页面功能或测试逻辑；
- 不批准或实现 DCR-004、API CR-004；
- 不把已有能力重新实现为平行框架；
- 不在 `CURRENT_STATUS.md` 记录 Batch；
- 不恢复 Task 8.6 或 Batch 8.6-C1；
- 不启动 Task 7.2 至 Task 7.9。

## 7. 交付物

- 平台能力完整清单；
- SSOT—实现—测试映射；
- 问题分级与证据；
- 已有成果复用清单；
- Task 7.2 至 Task 7.8 的建议实施边界；
- DCR/API CR 依赖清单；
- Task 7.1 完成标准与进入 Task 7.2 的 Gate。

## 8. 完成标准

- 审计范围逐项完成且均有仓库或命令证据；
- 已有能力不被误标为缺失或重新实现；
- Platform 与 Application Development 边界清晰；
- DCR-004、API CR-004 等 Proposed 文件状态准确；
- 不存在未记录的 Blocker；
- 所有建议均能映射正式 Task，不新增平行业务功能；
- 全部文档和质量检查通过；
- GitHub 技术验收通过并获得项目负责人批准。

## 9. 当前结论

Task 7.1 已正式启动并处于 In Progress。本轮只建立任务入口和路线迁移基线；完整平台能力审计尚待后续独立执行指令。
