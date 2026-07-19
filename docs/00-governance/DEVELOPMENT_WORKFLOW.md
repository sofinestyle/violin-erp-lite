---
document_name: 标准开发流程
project: Violin ERP Lite
version: 1.0
status: Approved
owner: Project Manager
created_date: 2026-07-19
updated_date: 2026-07-19
related_phase: Phase 1
---

# 标准开发流程

## 固定九阶段流程

Phase 1 业务需求分析
→ Phase 2 业务流程设计
→ Phase 3 数据库设计
→ Phase 4 页面设计
→ Phase 5 接口设计
→ Phase 6 功能详细设计
→ Phase 7 开发规范与 Codex 执行
→ Phase 8 测试方案
→ Phase 9 验收与上线

九个阶段的名称、数量、顺序、范围和状态以 Frozen 的 `ROADMAP.md` 为准。

## 阶段内强制控制

每一个 Phase 均必须依次完成：

设计
→ 文档输出
→ 项目负责人审核
→ Codex 更新 GitHub
→ ChatGPT 复核 GitHub
→ 项目负责人确认
→ 状态更新为 Approved 或 Frozen
→ 方可进入下一 Phase

不得以单个功能已经明确为理由跳过当前 Phase。

## 强制规则

- 每个阶段完成后必须更新正式文档、决策记录和变更记录；
- 每个 Task 或正式小章节完成并确认后，必须立即更新 GitHub 并完成验收，方可进入下一 Task 或正式小章节；
- 每个阶段必须经过项目负责人确认；
- 当前 Phase 未完成并确认前，不得进入下一 Phase；
- Codex、ChatGPT 或其他 AI 不得自行批准阶段启动或状态变化；
- 不得将后续 Phase 的设计内容提前写入正式文档；
- 阶段路线调整必须遵循正式变更控制流程。

## 当前阶段状态

- Phase 1：Closed
- Phase 2：Completed / Approved
- Task 2.1：Completed / Approved
- Task 2.2：Completed / Approved
- Task 2.3：Completed / Approved
- Task 2.4：Completed / Approved
- Task 2.5：Completed / Approved
- Task 2.6：Completed / Approved
- Phase 3：In Progress
- Task 3.1：Completed / Approved
- Next Task：Task 3.2 Entity Relationship Design
- Task 3.2：Not Started
- 技术开发：Not Started
- 数据库设计：In Progress
- 数据库详细字段设计：Not Started

## Phase 2内部任务列表

1. Task 2.1 系统模块划分：Completed / Approved；
2. Task 2.2 模块职责设计：Completed / Approved；
3. Task 2.3 模块关系设计：Completed / Approved；
4. Task 2.4 业务生命周期设计：Completed / Approved；
5. Task 2.5 状态流转设计：Completed / Approved；
6. Task 2.6 业务对象定义（Business Object Definition）：Completed / Approved。

Task 2.1 至 Task 2.6 均已完成并获得批准，Phase 2 已完成。Task 2.6 的名称调整不增加或删除 Task，不改变 Task 顺序，也不改变固定九阶段开发路线。

Task 2.6 定义核心业务对象及其用途、业务关系、生命周期与状态关联，以及对象的业务输入和输出；不包含数据库表、字段、主键、外键、索引、API、页面或技术实现。

## Phase 3内部任务进度

1. Task 3.1 业务对象到数据库实体映射（Entity Mapping）：Completed / Approved；
2. Task 3.2 实体关系详细设计（Entity Relationship Design）：Not Started。

Phase 3 已正式启动。Task 3.1 已完成概念实体边界设计，不包含详细字段、字段类型、主键、外键、索引、SQL、ORM、数据库技术选型或正式 ER 图。Task 3.1 验收通过前不得启动 Task 3.2。
