---
document_name: 标准开发流程
project: Violin ERP Lite
version: 1.0
status: Approved
owner: Project Manager
created_date: 2026-07-19
updated_date: 2026-07-21
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
- Phase 3：Completed / Approved / Frozen
- Task 3.1：Completed / Approved
- Task 3.2：Completed / Approved
- Task 3.3：Completed / Approved
- Task 3.4：Completed / Approved
- Task 3.5：Completed / Approved
- Task 3.5.1：Completed / Approved
- Task 3.5.2：Completed / Approved
- Task 3.5.3：Completed / Approved
- Task 3.5.4：Completed / Approved
- Task 3.5.5：Completed / Approved
- Task 3.5.6：Completed / Approved
- Task 3.5.7：Completed / Approved / Frozen
- 当前已完成阶段：Phase 4 页面设计（UI / Page Design）
- Phase 4：Completed / Approved
- Task 4.1 页面架构设计：Completed / Approved
- Task 4.2 PC 管理端布局与导航设计：Completed / Approved
- Task 4.3 PC 管理端视觉规范设计：Completed / Approved
- Task 4.4 首页 Dashboard 页面设计：Completed / Approved
- Task 4.5 基础资料模块页面设计：Completed / Approved
- Task 4.6 采购管理页面设计：Completed / Approved
- Task 4.7 生产管理页面设计：Completed / Approved
- Task 4.8 库存管理页面设计：Completed / Approved
- Task 4.9 出入库管理页面设计：Completed / Approved
- Task 4.10 跨境业务页面设计：Completed / Approved
- 当前阶段：Phase 5 接口设计
- Phase 5：In Progress
- Task 5.1 API 总体规范与安全规则设计：Completed / Approved
- Task 5.2 基础资料与采购 API：Completed / Approved
- Task 5.3 生产、质量验收与库存 API：Completed / Pending Approval
- Task 5.4 出入库与跨境业务 API：Waiting
- Task 5.5 导入、日志、安全与 API 最终收口：Waiting
- 当前下一步：Task 5.3 GitHub 验收
- 技术开发：Not Started
- 数据库设计：Completed / Approved / Frozen
- 数据库字段名称设计：Completed / Approved
- 字段数据类型规范：Completed / Approved
- 主键与唯一约束设计：Completed / Approved
- 外键关系规范：Completed / Approved
- 索引设计：Completed / Approved
- Check 约束设计：Completed / Approved
- 数据库命名规范：Completed / Approved
- 数据库冻结：Completed / Approved / Frozen

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
2. Task 3.2 实体关系详细设计（Entity Relationship Design）：Completed / Approved；
3. Task 3.3 数据表结构设计（Table Structure Design）：Completed / Approved；
4. Task 3.4 字段结构设计（Field Structure Design）：Completed / Approved；
5. Task 3.5 字段类型、约束与索引设计（Field Type, Constraint and Index Design）：Completed / Approved。

Task 3.5 内部小任务进度：

1. Task 3.5.1 字段数据类型规范（Field Type Standard）：Completed / Approved；
2. Task 3.5.2 主键与唯一约束设计（Primary Key and Unique Constraint Design）：Completed / Approved；
3. Task 3.5.3 外键关系规范（Foreign Key Relationship Standard）：Completed / Approved；
4. Task 3.5.4 索引设计（Index Design）：Completed / Approved；
5. Task 3.5.5 Check 约束设计（Check Constraint Standard）：Completed / Approved；
6. Task 3.5.6 数据库命名规范（Database Naming Standard）：Completed / Approved；
7. Task 3.5.7 Database Freeze：Completed / Approved / Frozen。

Phase 3 及 Task 3.5 已完成并获得批准，Database Logical Design v1.0 已冻结。Phase 4 页面设计及 Task 4.1 至 Task 4.10 均为 Completed / Approved。Phase 5 接口设计为 In Progress；Task 5.1 与 Task 5.2 均已获得批准，Task 5.3 已完成并等待 GitHub 验收。数据库、ORM、DDL、Schema、Migration 和技术开发均未开始。

## Phase 4内部任务进度

1. Task 4.1 页面架构设计（Page Architecture Design）：Completed / Approved；
2. Task 4.2 PC 管理端布局与导航设计（PC Layout and Navigation Design）：Completed / Approved；
3. Task 4.3 PC 管理端视觉规范设计（PC Visual Design System）：Completed / Approved；
4. Task 4.4 首页 Dashboard 页面设计（Dashboard Page Design）：Completed / Approved；
5. Task 4.5 基础资料模块页面设计（Master Data Page Design）：Completed / Approved；
6. Task 4.6 采购管理页面设计（Purchase Management Page Design）：Completed / Approved；
7. Task 4.7 生产管理页面设计（Production Management Page Design）：Completed / Approved；
8. Task 4.8 库存管理页面设计（Inventory Management Page Design）：Completed / Approved；
9. Task 4.9 出入库管理页面设计（Inbound and Outbound Management Page Design）：Completed / Approved；
10. Task 4.10 跨境业务页面设计（Cross-border Business Page Design）：Completed / Approved。

Phase 4 及 Task 4.1 至 Task 4.10 均已完成并获得批准，Phase 4 状态为 Completed / Approved，未标记为 Frozen。Phase 5 接口设计状态为 In Progress。Task 5.1 与 Task 5.2 均为 Completed / Approved；Task 5.3 为 Completed / Pending Approval，当前等待 GitHub 验收；Task 5.4 和 Task 5.5 保持 Waiting，不得开始正文。技术开发保持 Not Started。
