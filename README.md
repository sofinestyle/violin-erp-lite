---
document_name: 项目说明
project: Violin ERP Lite
version: 1.0
status: Draft
owner: Project Manager
created_date: 2026-07-19
updated_date: 2026-07-19
related_phase: Phase 1
---

# Violin ERP Lite（乐器产品管理系统）

## 项目定位

Violin ERP Lite 是面向企业内部使用的轻量级 ERP，用于管理以小提琴及相关配件为主的乐器产品，覆盖产品、SKU、供应商、采购、委外生产、质量验收、库存、国内销售出库、跨境分批发货、采购付款与统计分析等业务。

## 当前项目状态

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
- Next Task：Task 3.4 Field Structure Design
- Task 3.4 状态：Not Started
- Phase 1 业务需求分析：Approved
- BUSINESS_RULES：Frozen
- 项目治理文件：Approved
- 九阶段开发路线：Frozen
- 数据库设计：In Progress
- 数据库字段设计：Not Started
- 技术开发：Not Started

Phase 1 已正式关闭，Phase 2 已完成并获得批准。Phase 3 Database Design 正在进行，Task 3.1 至 Task 3.3 均已完成并获得批准。Task 3.4 尚未启动，数据库字段设计和技术开发均未开始。

## 九阶段开发路线

| 阶段 | 名称 | 状态 |
| --- | --- | --- |
| Phase 1 | 业务需求分析 | Closed（Completed） |
| Phase 2 | 业务流程设计 | Completed / Approved |
| Phase 3 | 数据库设计 | In Progress |
| Phase 4 | 页面设计 | Waiting |
| Phase 5 | 接口设计 | Waiting |
| Phase 6 | 功能详细设计 | Waiting |
| Phase 7 | 开发规范与 Codex 执行 | Waiting |
| Phase 8 | 测试方案 | Waiting |
| Phase 9 | 验收与上线 | Waiting |

九个阶段的数量、名称和顺序已经冻结，详细规则参见 `ROADMAP.md`。

## 仓库用途

本仓库用于保存项目正式文档、阶段成果、后续源代码和变更记录，并作为检查文档与实现一致性、识别需求偏移、追溯决策及审计 Git 提交的统一载体。

## 项目角色

- ChatGPT：Product Manager，负责需求、流程、规划、设计、PRD、验收标准及文档检查。
- Codex：Software Engineer，严格依据正式文档执行工程任务并同步测试、文档和 Git 记录。
- 项目负责人：Project Manager，负责业务确认、规则冻结、排期、验收和最终决策。

## 文档入口

- [项目总纲](PROJECT.md)
- [Codex 执行约束](AGENTS.md)
- [Frozen 项目开发路线](ROADMAP.md)
- [文档优先级](docs/00-governance/DOCUMENT_PRIORITY.md)
- [Phase 1 业务需求分析](docs/01-business/PHASE_01_BUSINESS_REQUIREMENT_ANALYSIS.md)
- [Frozen 业务规则](docs/01-business/BUSINESS_RULES.md)
- [Task 2.1 系统模块划分](docs/phases/phase-02/TASK_2_1_MODULE_BREAKDOWN.md)
- [Task 2.2 模块职责设计（Approved）](docs/phases/phase-02/TASK_2_2_MODULE_RESPONSIBILITY_DESIGN.md)
- [Task 2.3 模块关系设计（Approved）](docs/phases/phase-02/TASK_2_3_MODULE_RELATIONSHIP_DESIGN.md)
- [Task 2.4 业务生命周期设计（Approved）](docs/phases/phase-02/TASK_2_4_BUSINESS_LIFECYCLE_DESIGN.md)
- [Task 2.5 状态流转设计（Approved）](docs/phases/phase-02/TASK_2_5_STATE_TRANSITION_DESIGN.md)
- [Task 2.6 业务对象定义（Approved）](docs/phases/phase-02/TASK_2_6_BUSINESS_OBJECT_DEFINITION.md)
- [Task 3.1 业务对象到数据库实体映射（Approved）](docs/phases/phase-03/TASK_3_1_ENTITY_MAPPING.md)
- [Task 3.2 实体关系详细设计（Approved）](docs/phases/phase-03/TASK_3_2_ENTITY_RELATIONSHIP_DESIGN.md)
- [Task 3.3 数据表结构设计（Approved）](docs/phases/phase-03/TASK_3_3_TABLE_STRUCTURE_DESIGN.md)
- [变更记录](CHANGELOG.md)
- [正式决策记录](docs/00-governance/DECISION_LOG.md)

## 开发前强制阅读

开始任何任务前必须按顺序阅读 `PROJECT.md`、`AGENTS.md`、`docs/00-governance/DOCUMENT_PRIORITY.md`、`ROADMAP.md`、`docs/01-business/BUSINESS_RULES.md`、`docs/02-product/SYSTEM_SPEC.md` 和当前 Phase 文档，并根据任务类型补充阅读对应 Spec。

## 当前禁止事项

Phase 3 正在进行，Task 3.1 至 Task 3.3 已完成并获得批准。Task 3.4 尚未启动，不得进行字段清单和字段类型设计、主外键实现、索引设计、物理 ER 图设计、SQL、ORM、数据库技术选型、API 设计、页面设计、前后端编码、应用框架创建或依赖安装。

## 安全说明

本仓库为公开仓库，严禁提交真实业务数据、密码、密钥、令牌、私钥、付款凭证、用户手机号、平台账号及其他敏感资料。
