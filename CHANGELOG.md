---
document_name: 项目变更记录
project: Violin ERP Lite
version: 1.0
status: Draft
owner: Project Manager
created_date: 2026-07-19
updated_date: 2026-07-19
related_phase: Phase 1
---

# CHANGELOG

## [0.2.4] - 2026-07-19

### Added

- 新增 Task 2.6 业务对象定义
- 完成基础对象、业务对象、库存对象和系统对象定义
- 增加按 Task 完成后立即更新 GitHub 的工作规则

### Changed

- Task 2.6 更新为 Completed / Approved
- Phase 2 更新为 Completed / Approved
- 下一阶段更新为 Phase 3 Database Design，状态 Not Started

### Status

- Phase 2: Completed / Approved
- Phase 3: Not Started
- Database Design: Not Started
- Development: Not Started

## [0.2.3] - 2026-07-19

### Added

- 新增 Task 2.5 状态流转设计
- 明确采购、委外生产、验收、出入库、跨境、调拨、盘点等多维状态体系
- 明确关键状态转换条件和禁止规则
- 新增多维业务状态正式决策

### Changed

- Task 2.5 状态更新为 Approved
- Task 2.6 由“输入输出分析”调整为“业务对象定义（Business Object Definition）”
- 更新 Phase 2 任务进度
- 当前下一任务更新为 Task 2.6 业务对象定义

### Status

- Phase 2: In Progress
- Task 2.1: Approved
- Task 2.2: Approved
- Task 2.3: Approved
- Task 2.4: Approved
- Task 2.5: Approved
- Task 2.6: Not Started
- Database Design: Not Started
- Development: Not Started

## [0.2.2] - 2026-07-19

### Added

- 新增 Task 2.4 业务生命周期设计
- 明确产品、采购、委外生产、跨境和库存五类生命周期
- 明确各生命周期的正常路径、异常路径和完成条件
- 明确付款状态与业务完成状态分离
- 新增五类业务生命周期正式决策

### Changed

- Task 2.4 状态更新为 Approved
- 更新 Phase 2 任务进度
- 当前下一任务更新为 Task 2.5 状态流转设计

### Status

- Phase 2: In Progress
- Task 2.1: Approved
- Task 2.2: Approved
- Task 2.3: Approved
- Task 2.4: Approved
- Task 2.5: Not Started
- Database Design: Not Started
- Development: Not Started

## [0.2.1] - 2026-07-19

### Added

- 新增 Task 2.3 模块关系设计
- 明确采购管理与生产管理为平行模块
- 明确质量验收为采购与生产共用业务节点
- 明确国内采购、委外生产、跨境发货、单据流和库存流关系
- 新增采购与生产关系正式决策

### Changed

- Task 2.2 状态由 Reviewed 更新为 Approved
- Task 2.3 状态设置为 Approved
- 更新 Phase 2 任务进度
- 当前下一任务更新为 Task 2.4 核心业务流程设计

### Status

- Phase 2: In Progress
- Task 2.1: Approved
- Task 2.2: Approved
- Task 2.3: Approved
- Task 2.4: Not Started
- Database Design: Not Started
- Development: Not Started

## [0.2.0] - 2026-07-19

### Added

- 新增 Phase 2 Task 2.1 系统模块划分正式记录
- 新增 Phase 2 Task 2.2 模块职责设计 Reviewed 评审稿
- 记录九个一级模块及“出入库管理”正式名称
- 新增 DEC-013 正式启动 Phase 2 并确认 Task 2.1

### Changed

- 将 Phase 2 状态由 Not Started 更新为 In Progress
- 同步更新 `PROJECT.md`、`README.md`、`ROADMAP.md` 和开发流程中的项目进度
- 将 Current Task 更新为 Task 2.2 模块职责设计
- 将 Next Task 更新为待 Task 2.2 确认后进入 Task 2.3 模块关系设计

### Status

- Phase 1: Closed
- Phase 2: In Progress
- Task 2.1: Completed
- Task 2.2: Reviewed
- Current Task: Task 2.2
- Business Rules: Frozen
- Database Design: Not Started
- Development: Not Started

## [0.1.2] - 2026-07-19

### Added

- 正式建立并冻结固定九阶段开发路线
- 增加开发阶段冻结规则
- 增加项目语言规范
- 明确中文（简体）为项目主要语言
- 增加 Codex 阶段边界检查要求
- 增加 Phase 路线变更控制规则

### Changed

- 将 `ROADMAP.md` 由 Draft 升级为 Frozen
- 更新 `PROJECT.md` 中的项目进度和开发路线
- 更新 `README.md` 中的当前项目状态
- 更新 `AGENTS.md` 中的阶段读取和语言规则
- 更新 `DEVELOPMENT_WORKFLOW.md` 和 `CHANGE_CONTROL.md`
- 更新 `DECISION_LOG.md`

### Status

- Phase 1: Closed
- Phase 2: Not Started
- Business Requirements: Approved
- Business Rules: Frozen
- Governance Documents: Approved
- Development Roadmap: Frozen
- Database Design: Not Started
- Development: Not Started

## [0.1.1] - 2026-07-19

### Changed

- 将正式项目治理文档状态由 Draft 修正为 Approved
- 明确 `AGENTS.md` 已作为 Codex 正式执行约束生效
- 明确 `PROJECT.md` 及治理流程文件已正式生效
- 更新 README 中的治理文档状态说明

### Unchanged

- Phase 1 Business Requirement Analysis remains Approved
- BUSINESS_RULES remains Frozen
- System, database, UI, API and testing specifications remain Draft
- Development remains Not Started

### Status

- Current Phase: Phase 1 Completed
- Governance Documents: Approved
- Phase 1: Approved
- Business Rules: Frozen
- Development: Not Started

## [0.1.0] - 2026-07-19

### Added

- 初始化 Violin ERP Lite 项目治理体系
- 建立 `PROJECT.md` 和 `AGENTS.md`
- 完成 Phase 1 业务需求分析
- 冻结第一版业务规则
- 建立后续产品、数据库、UI、API 和测试文档模板
- 建立公开 GitHub 仓库安全规则

### Status

- Phase 1: Approved
- Business Rules: Frozen
- Development: Not Started
