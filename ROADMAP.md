---
document_name: 项目开发路线
project: Violin ERP Lite
version: 2.0
status: Frozen
owner: Project Manager
created_date: 2026-07-19
updated_date: 2026-07-24
related_phase: All Phases
---

# 项目开发路线

## 1. 文档目的

本文件定义 Violin ERP Lite 固定十阶段开发路线、阶段边界、阶段状态及进入和完成条件，是所有项目参与者和 AI 判断任务是否可以执行的正式治理依据。

## 2. 当前项目进度

- Current Phase：Phase 7
- Phase Status：In Progress
- Current Task：Task 7.1
- Current Task Status：In Progress

当前状态唯一入口为 [`CURRENT_STATUS.md`](docs/00-governance/CURRENT_STATUS.md)。本文件负责定义固定阶段路线、Task 边界、进入条件和完成条件。

- 当前已完成阶段：Phase 6 功能详细设计（Functional Specification，Completed / Approved / Frozen）
- Phase 2 状态：Completed / Approved
- Task 2.1：Completed / Approved
- Task 2.2：Completed / Approved
- Task 2.3：Completed / Approved
- Task 2.4：Completed / Approved
- Task 2.5：Completed / Approved
- Task 2.6：Completed / Approved
- Phase 3 状态：Completed / Approved / Frozen
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
- Phase 4 状态：Completed / Approved
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
- Phase 5：Completed / Approved / Frozen
- Task 5.1 API 总体规范与安全规则设计：Completed / Approved
- Task 5.2 基础资料与采购 API：Completed / Approved
- Task 5.3 生产、质量验收与库存 API：Completed / Approved
- Task 5.4 出入库与跨境业务 API：Completed / Approved
- Task 5.5 导入、附件、日志、安全与 API 最终收口：Completed / Approved
- Phase 5 Final Consistency Review：Completed / Approved
- Phase 6：Completed / Approved / Frozen
- Task 6.1 功能详细设计统一规范：Completed / Approved
- Task 6.2 核心业务功能详细设计：Completed / Approved
- Task 6.3 公共能力功能详细设计：Completed / Approved
- Phase 7：In Progress
- Task 7.1 Platform Baseline & Existing Capability Audit：In Progress
- Task 7.2 Authentication & Authorization：Waiting / Not Started
- Task 7.3 Object Storage & File Lifecycle：Waiting / Not Started
- Task 7.4 Attachment Framework：Waiting / Not Started
- Task 7.5 Idempotency & Concurrency Control：Waiting / Not Started
- Task 7.6 Background Job & Distributed Lock：Waiting / Not Started
- Task 7.7 Cache & Event Infrastructure：Waiting / Not Started
- Task 7.8 Audit, Trace & Observability：Waiting / Not Started
- Task 7.9 Platform Final Consistency Review：Waiting / Not Started
- Phase 8：Waiting / Not Started
- Phase 9：Waiting / Not Started
- Phase 10：Waiting / Not Started
- API Change Request 001：Completed / Approved
- API Coverage Completion 002：Completed / Approved
- API Coverage Completion 003：Completed / Approved
- API Master Specification v1.3：Completed / Approved / Frozen（正式接口总数 335）
- Phase 6 Final Consistency Review：Completed / Approved
- 业务需求分析：Approved
- 业务规则：Frozen
- 项目治理文档：Approved
- 十阶段开发路线：Frozen
- 数据库设计：Completed / Approved / Frozen
- 数据库字段名称设计：Completed / Approved
- 字段数据类型规范：Completed / Approved
- 主键与唯一约束设计：Completed / Approved
- 外键关系规范：Completed / Approved
- 索引设计：Completed / Approved
- Check 约束设计：Completed / Approved
- 数据库命名规范：Completed / Approved
- 数据库冻结：Completed / Approved / Frozen

Phase 1 已正式关闭，Phase 2 已完成并获得批准。Phase 3 Database Design 及 Task 3.1 至 Task 3.5.7 已完成并获得批准，当前 Database Logical Design v2.1 已冻结。Phase 4 页面设计及 Task 4.1 至 Task 4.10 均为 Completed / Approved。当前 API Master Specification v1.3 已冻结，正式接口总数为 335。Phase 6 功能详细设计及 Final Consistency Review 已完成验收并获得批准，Phase 6 状态为 Completed / Approved / Frozen。Phase Renumbering Change Request 001 已获得批准，固定路线调整为十阶段；当前进入 Phase 7 Platform Foundation，Task 7.1 已正式启动。

## 3. 固定十阶段开发路线

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

- 状态：Completed / Approved / Frozen
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

- 状态：Completed / Approved
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

- 状态：Completed / Approved / Frozen
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

#### Phase 5 内部任务

1. Task 5.1 API 总体规范与安全规则设计：Completed / Approved；
2. Task 5.2 基础资料与采购 API：Completed / Approved；
3. Task 5.3 生产、质量验收与库存 API：Completed / Approved；
4. Task 5.4 出入库与跨境业务 API：Completed / Approved；
5. Task 5.5 导入、附件、日志、安全与 API 最终收口：Completed / Approved。

Phase 5 Final Consistency Review：Completed / Approved。Phase 5 已通过 Phase Exit Gate 与 Freeze Gate，状态为 Completed / Approved / Frozen。

Task 5.1 至 Task 5.5 及 Final Consistency Review 均已获得项目负责人批准。当前 API Master Specification v1.3 已冻结，正式接口总数为 335；后续修改必须经过正式 DCR 或 Change Request。Phase 6 已由项目负责人单独正式启动。

### Phase 6：功能详细设计（Functional Specification）

- 状态：Completed / Approved / Frozen
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

#### Phase 6 加速内部结构

1. Task 6.1 功能详细设计统一规范：Completed / Approved；
2. Task 6.2 核心业务功能详细设计：Completed / Approved；
3. Task 6.3 公共能力功能详细设计：Completed / Approved；
4. Phase 6 Final Consistency Review：Completed / Approved。

API Change Request 001、API Coverage Completion 002 与 API Coverage Completion 003：Completed / Approved。当前 API Master Specification v1.3：Completed / Approved / Frozen，正式接口总数为 335。Task 6.1 至 Task 6.3 均为后续技术阶段的正式产品输入；Database Logical Design v2.1 保持 Frozen。Phase 6 正式内容后续如需修改，必须通过 DCR 或正式 Change Request，不得通过聊天记忆、代码实现或临时决定覆盖 Frozen 文档。

Final Consistency Review 是 Phase Exit Gate，不作为普通业务 Task。每个 Task 完成后必须先通过 GitHub 验收，未经项目负责人批准不得启动后续 Task。Phase 6 不设置 Task 6.4。

### Phase 7：平台基础（Platform Foundation）

- 状态：In Progress
- 目标：盘点、复用并收口跨应用公共技术能力，为应用开发提供唯一、稳定、可审计的平台基线。
- 主要输出：
  - Platform Baseline 与已有能力审计；
  - Authentication & Authorization；
  - Object Storage & File Lifecycle；
  - Attachment Framework；
  - Idempotency & Concurrency Control；
  - Background Job & Distributed Lock；
  - Cache & Event Infrastructure；
  - Audit, Trace & Observability；
  - Platform Final Consistency Review。
- 进入条件：Phase 6 已完成并经项目负责人确认，Phase Renumbering Change Request 001 已批准并完成正式同步。
- 完成条件：全部平台 Task 完成 GitHub 技术验收并获得项目负责人批准，公共能力具备进入 Application Development 的一致性基线。

#### Phase 7 内部结构

1. Task 7.1 Platform Baseline & Existing Capability Audit：In Progress；
2. Task 7.2 Authentication & Authorization：Waiting / Not Started；
3. Task 7.3 Object Storage & File Lifecycle：Waiting / Not Started；
4. Task 7.4 Attachment Framework：Waiting / Not Started；
5. Task 7.5 Idempotency & Concurrency Control：Waiting / Not Started；
6. Task 7.6 Background Job & Distributed Lock：Waiting / Not Started；
7. Task 7.7 Cache & Event Infrastructure：Waiting / Not Started；
8. Task 7.8 Audit, Trace & Observability：Waiting / Not Started；
9. Task 7.9 Platform Final Consistency Review：Waiting / Not Started。

每个 Task 完成后必须先通过 GitHub 技术验收并获得项目负责人批准，方可启动下一 Task。Task 7.9 是本 Phase 的正式收口任务，未经项目负责人明确启动不得执行。

### Phase 8：应用开发（Application Development）

- 状态：Waiting / Not Started
- 目标：依据 Approved/Frozen 规格与 Phase 7 平台基线完成双端应用、API、数据访问和业务模块开发。
- 主要输出：
  - 原 Phase 7 已完成开发成果及历史 Task 的完整保留；
  - Web、Mini Program、API、数据库和共享包应用实现；
  - 核心业务流程与公共能力接入；
  - 开发收口及进入 Phase 9 的可运行基线。
- 进入条件：Phase 7 已完成并获得项目负责人批准，且项目负责人正式启动 Phase 8。
- 完成条件：计划内应用功能完成开发、代码审查和文档同步，并具备进入测试与系统集成阶段的条件。

#### Phase 8 历史迁移结构

1. Task 8.1 开发基线与工程初始化：Completed / Approved；
2. Task 8.2 Monorepo 工程骨架与质量门禁：Completed / Approved；
3. Task 8.3 数据持久化与后端公共基础：Completed / Approved；
4. Task 8.4 双端应用壳层与公共能力：Completed / Approved；
5. Task 8.5 核心业务功能实现：Completed / Approved；
6. Task 8.6 系统集成与开发收口：Waiting / Not Started；
7. Phase 8 Final Consistency Review：Waiting / Not Started。

Task 8.1 至 Task 8.5 是原 Phase 7 已完成成果的编号迁移，不删除、不重做。Task 8.6 的既有执行记录完整保留，但在 Phase 7 Platform Foundation 完成前不得恢复；其内部 Batch 状态不进入正式状态治理文件。

### Phase 9：测试方案与系统集成（Test Plan & System Integration）

- 状态：Waiting / Not Started
- 目标：验证功能、权限、数据一致性、跨端联调、异常处理、性能、安全和恢复能力符合正式规格与 Frozen 业务规则。
- 主要输出：
  - 测试方案；
  - 单元测试、Repository 测试与 API 集成测试；
  - 业务流程与系统端到端测试；
  - Web、Mini Program、API、数据库和共享包联调；
  - 权限、库存一致性、Excel 导入与审计测试；
  - 异常、回归、性能、安全和恢复测试；
  - 用户测试及验收前准备。
- 进入条件：Phase 8 已完成并经项目负责人确认，且项目负责人正式启动 Phase 9。
- 完成条件：测试与系统集成完成，问题闭环，结果满足发布与验收准备条件并由项目负责人确认。

### Phase 10：发布与验收（Release & Acceptance）

- 状态：Waiting / Not Started
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
- 进入条件：Phase 9 已完成并经项目负责人确认，且项目负责人正式启动 Phase 10。
- 完成条件：验收、上线检查、发布和交付完成，项目负责人确认正式上线与交付结果。

## 4. 开发阶段冻结规则

Violin ERP Lite 采用固定十阶段开发流程。

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

如确需调整十阶段路线，必须执行：

提出变更申请
→ 说明必要性
→ 分析对文档、开发和进度的影响
→ 项目负责人批准
→ 更新 `PROJECT.md`
→ 更新 `ROADMAP.md`
→ 更新 `DECISION_LOG.md`
→ 更新 `CHANGELOG.md`
→ 再执行调整

未经上述流程，十阶段路线保持 Frozen。Phase Renumbering Change Request 001 已按本流程批准并完成一次路线调整；本文件 v2.0 是调整后的 Frozen 基线。

## 5. 进度更新规则

- 每个 Phase 必须依次完成设计、文档输出、项目负责人审核、Codex 更新 GitHub、ChatGPT 复核 GitHub、项目负责人确认和正式状态更新；
- 每个 Task 完成并确认后，必须立即更新 GitHub 并完成验收，方可进入下一 Task；
- 当前 Phase 未完成并获得项目负责人确认前，不得更新下一 Phase 为 Started；
- Phase 或 Task 状态变化必须先更新 `docs/00-governance/CURRENT_STATUS.md`，再同步 `ROADMAP.md`、`PROJECT.md` 和 `README.md`；
- `DECISION_LOG.md` 只记录状态变更决定，`CHANGELOG.md` 只记录变更历史，二者不作为当前状态判断依据；
- 不得以单个功能已经明确为理由跳过当前 Phase；
- 当前聊天、临时指令或 AI 建议不得直接改变阶段状态或十阶段路线。

## 6. 当前状态入口

当前 Phase、当前 Task 及其状态统一参见 [`CURRENT_STATUS.md`](docs/00-governance/CURRENT_STATUS.md)。
