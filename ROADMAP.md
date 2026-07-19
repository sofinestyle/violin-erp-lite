---
document_name: 项目开发路线
project: Violin ERP Lite
version: 1.0
status: Frozen
owner: Project Manager
created_date: 2026-07-19
updated_date: 2026-07-20
related_phase: All Phases
---

# 项目开发路线

## 1. 文档目的

本文件定义 Violin ERP Lite 固定九阶段开发路线、阶段边界、阶段状态及进入和完成条件，是所有项目参与者和 AI 判断任务是否可以执行的正式治理依据。

## 2. 当前项目进度

- 当前阶段：Phase 3 数据库设计（进行中）
- Phase 2 状态：Completed / Approved
- Task 2.1：Completed / Approved
- Task 2.2：Completed / Approved
- Task 2.3：Completed / Approved
- Task 2.4：Completed / Approved
- Task 2.5：Completed / Approved
- Task 2.6：Completed / Approved
- Phase 3 状态：In Progress
- Task 3.1：Completed / Approved
- Task 3.2：Completed / Approved
- Task 3.3：Completed / Approved
- Task 3.4：Completed / Approved
- Task 3.5：In Progress
- Task 3.5.1：Completed / Approved
- Task 3.5.2：Completed / Approved
- Task 3.5.3：Completed / Approved
- Task 3.5.4：Completed / Approved
- Task 3.5.5：Completed / Approved
- Current Subtask：Task 3.5.6 Database Naming Standard
- Task 3.5.6 状态：In Progress
- 业务需求分析：Approved
- 业务规则：Frozen
- 项目治理文档：Approved
- 九阶段开发路线：Frozen
- 技术开发：Not Started
- 数据库设计：In Progress
- 数据库字段名称设计：Completed / Approved
- 字段数据类型规范：Completed / Approved
- 主键与唯一约束设计：Completed / Approved
- 外键关系规范：Completed / Approved
- 索引设计：Completed / Approved
- Check 约束设计：Completed / Approved
- 数据库命名规范：In Progress

Phase 1 已正式关闭，Phase 2 已完成并获得批准。Phase 3 Database Design 正在进行，Task 3.1 至 Task 3.5.5 均已完成并获得批准，Task 3.5 状态为 In Progress。Task 3.5.6 数据库命名规范已按数据库设计冲刺进入 In Progress。

## 3. 固定九阶段开发路线

### Phase 1：业务需求分析（Business Requirement Analysis）

- 状态：Completed（Closed）
- 目标：确认项目业务现状、范围、核心规则和最终业务结论，形成后续阶段的正式业务基线。
- 主要输出：
  - 业务流程梳理；
  - 角色分析；
  - 业务对象分析；
  - 核心业务确认；
  - 业务边界确认；
  - 数据管理范围确认；
  - 现有问题分析；
  - 优化方案；
  - 最终需求确认；
  - `BUSINESS_RULES.md` 冻结。
- 进入条件：项目负责人确认启动业务需求分析。
- 完成条件：业务需求分析文档状态为 Approved，业务规则状态为 Frozen，项目治理和开发路线完成确认，项目负责人确认 Phase 1 关闭。

### Phase 2：业务流程设计（Business Process Design）

- 状态：Completed / Approved
- 目标：在不进入技术实现设计的前提下，明确系统业务模块、模块边界和端到端业务流转。
- 主要输出：
  - 系统模块划分；
  - 模块职责；
  - 模块关系；
  - 功能边界；
  - 输入与输出；
  - 业务流程图；
  - 业务状态流转；
  - 异常流程；
  - 模块与 `BUSINESS_RULES.md` 映射；
  - 功能清单初步整理。
- 进入条件：Phase 1 已关闭，且项目负责人正式确认启动 Phase 2。
- 完成条件：本阶段业务流程和功能边界文档完成审核并由项目负责人确认，状态更新为 Approved 或 Frozen。
- 本阶段不进行：
  - 数据库表设计；
  - 数据库字段设计；
  - API 设计；
  - 页面视觉设计；
  - 业务编码。

### Phase 3：数据库设计（Database Design）

- 状态：In Progress
- 目标：将已批准的业务对象和业务流程转化为一致、可追溯的数据设计。
- 主要输出：
  - 数据对象落地；
  - 实体关系；
  - 数据表设计；
  - 字段设计；
  - 主键与外键；
  - 索引；
  - 数据约束；
  - 库存一致性规则；
  - 数据迁移方案。
- 进入条件：Phase 2 已完成并经项目负责人确认，且项目负责人正式启动 Phase 3。
- 完成条件：数据库规格完成审核，数据结构、约束和迁移方案由项目负责人确认。

### Phase 4：页面设计（UI / Page Design）

- 状态：Waiting
- 目标：基于已批准的业务流程和数据设计，确定微信小程序及 PC 管理端的页面架构与交互规则。
- 主要输出：
  - 微信小程序页面架构；
  - PC 管理端页面架构；
  - 页面清单；
  - 页面流程；
  - 交互规则；
  - 表单结构；
  - 列表与详情；
  - 状态展示；
  - 权限展示；
  - UI 规范。
- 进入条件：Phase 3 已完成并经项目负责人确认，且项目负责人正式启动 Phase 4。
- 完成条件：两端页面规格和交互规范完成审核并由项目负责人确认。

### Phase 5：接口设计（API Design）

- 状态：Waiting
- 目标：在已批准业务、数据和页面设计基础上，定义系统接口契约及安全、一致性规则。
- 主要输出：
  - API 目录；
  - 请求与响应；
  - 权限校验；
  - 错误码；
  - 数据校验；
  - 幂等规则；
  - Excel 导入接口；
  - 库存事务接口；
  - 审核接口；
  - 日志接口。
- 进入条件：Phase 4 已完成并经项目负责人确认，且项目负责人正式启动 Phase 5。
- 完成条件：API 规格完成审核，接口契约和相关规则由项目负责人确认。

### Phase 6：功能详细设计（Functional Specification）

- 状态：Waiting
- 目标：形成可以指导实现和验收的逐功能详细规格，不开始业务编码。
- 主要输出：
  - 各功能详细规则；
  - 前置条件；
  - 操作流程；
  - 输入输出；
  - 状态转换；
  - 权限要求；
  - 异常处理；
  - 验收标准；
  - 功能之间的依赖关系。
- 进入条件：Phase 5 已完成并经项目负责人确认，且项目负责人正式启动 Phase 6。
- 完成条件：功能详细规格及对应验收标准完成审核并由项目负责人确认。

### Phase 7：开发规范与Codex执行（Development Specification）

- 状态：Waiting
- 目标：确认技术与工程规范，按照已批准规格组织 Codex 分阶段开发和审查。
- 主要输出：
  - 技术架构确认；
  - 项目目录结构；
  - 编码规范；
  - 开发任务拆分；
  - Codex 执行指令；
  - 分阶段开发；
  - 代码审查；
  - 文档同步；
  - Git 提交规范。
- 进入条件：Phase 6 已完成并经项目负责人确认，且项目负责人正式启动 Phase 7。
- 完成条件：计划内功能依据正式规格完成开发、代码审查和文档同步，并由项目负责人确认进入测试阶段。

### Phase 8：测试方案（Test Plan）

- 状态：Waiting
- 目标：验证功能、权限、数据一致性、异常处理和性能符合正式规格与 Frozen 业务规则。
- 主要输出：
  - 单元测试；
  - 接口测试；
  - 业务流程测试；
  - 权限测试；
  - 库存一致性测试；
  - Excel 导入测试；
  - 异常场景测试；
  - 回归测试；
  - 用户测试；
  - 性能测试。
- 进入条件：Phase 7 开发成果经项目负责人确认，且项目负责人正式启动 Phase 8。
- 完成条件：测试计划执行完成，问题得到记录和处理，测试结果满足验收准备条件并由项目负责人确认。

### Phase 9：验收与上线（Acceptance & Release）

- 状态：Waiting
- 目标：完成项目验收、数据初始化、上线发布和正式交付。
- 主要输出：
  - 验收清单；
  - 用户验收测试；
  - 数据初始化；
  - 期初库存导入；
  - 上线检查；
  - 发布；
  - 使用培训；
  - 上线后观察；
  - 问题修复；
  - 正式交付。
- 进入条件：Phase 8 已完成并经项目负责人确认，且项目负责人正式启动 Phase 9。
- 完成条件：验收、上线检查、发布和交付完成，项目负责人确认正式上线与交付结果。

## 4. 开发阶段冻结规则

Violin ERP Lite 采用固定九阶段开发流程。

未经项目负责人正式确认，任何人员或 AI 不得：

1. 增加新的 Phase；
2. 删除已有 Phase；
3. 修改 Phase 名称；
4. 调整 Phase 顺序；
5. 合并或拆分 Phase；
6. 跳过 Phase；
7. 在当前 Phase 未完成前提前进入下一 Phase；
8. 将非当前 Phase 内容写入正式设计文档；
9. 以“优化流程”为理由自行改变项目路线。

如确需调整九阶段路线，必须执行：

提出变更申请
→ 说明必要性
→ 分析对文档、开发和进度的影响
→ 项目负责人批准
→ 更新 `PROJECT.md`
→ 更新 `ROADMAP.md`
→ 更新 `DECISION_LOG.md`
→ 更新 `CHANGELOG.md`
→ 再执行调整

未经上述流程，九阶段路线保持 Frozen。

## 5. 进度更新规则

- 每个 Phase 必须依次完成设计、文档输出、项目负责人审核、Codex 更新 GitHub、ChatGPT 复核 GitHub、项目负责人确认和正式状态更新；
- 每个 Task 或正式小章节完成并确认后，必须立即更新 GitHub 并完成验收，方可进入下一 Task 或正式小章节；
- 当前 Phase 未完成并获得项目负责人确认前，不得更新下一 Phase 为 Started；
- 阶段状态变化必须同步更新 `PROJECT.md`、`README.md`、`ROADMAP.md`、`DECISION_LOG.md` 和 `CHANGELOG.md`；
- 不得以单个功能已经明确为理由跳过当前 Phase；
- 当前聊天、临时指令或 AI 建议不得直接改变阶段状态或九阶段路线。

## 6. 当前下一步

继续执行 Database Design Sprint 的 Task 3.5.6 数据库命名规范。

Phase 2 的 Task 2.1 至 Task 2.6 已全部完成并获得批准。Phase 3 正在进行，Task 3.1 至 Task 3.5.5 已完成并获得批准。Task 3.5.5 已确定 201 项 Check 逻辑规则，覆盖数值、日期、动作字段、来源完整性和仓库角色，并明确跨表及事务校验仍由服务层负责。

Task 3.5.6 状态为 In Progress。本冲刺仍不得编写 SQL、ORM、Schema、Migration，不得选择数据库或进入技术开发。
