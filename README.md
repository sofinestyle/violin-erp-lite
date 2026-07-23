---
document_name: 项目说明
project: Violin ERP Lite
version: 1.0
status: Draft
owner: Project Manager
created_date: 2026-07-19
updated_date: 2026-07-23
related_phase: Phase 1
---

# Violin ERP Lite（乐器产品管理系统）

## 项目定位

Violin ERP Lite 是面向企业内部使用的轻量级 ERP，用于管理以小提琴及相关配件为主的乐器产品，覆盖产品、SKU、供应商、采购、委外生产、质量验收、库存、国内销售出库、跨境分批发货、采购付款与统计分析等业务。

## 当前项目状态

- Current Phase：Phase 7
- Phase Status：In Progress
- Current Task：Task 7.6
- Current Task Status：Waiting / Not Started

完整当前状态以 [`CURRENT_STATUS.md`](docs/00-governance/CURRENT_STATUS.md) 为唯一入口。

## 九阶段开发路线

九个阶段的数量、名称和顺序已经冻结，阶段路线、状态及 Task 边界参见 [`ROADMAP.md`](ROADMAP.md)。

## 仓库用途

本仓库用于保存项目正式文档、阶段成果、后续源代码和变更记录，并作为检查文档与实现一致性、识别需求偏移、追溯决策及审计 Git 提交的统一载体。

## 项目角色

- ChatGPT：Product Manager，负责需求、流程、规划、设计、PRD、验收标准及文档检查。
- Codex：Software Engineer，严格依据正式文档执行工程任务并同步测试、文档和 Git 记录。
- 项目负责人：Project Manager，负责业务确认、规则冻结、排期、验收和最终决策。

## 文档入口

- [项目总纲](PROJECT.md)
- [Codex 执行约束](AGENTS.md)
- [当前项目状态](docs/00-governance/CURRENT_STATUS.md)
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
- [Task 3.4 字段结构设计（Approved）](docs/phases/phase-03/TASK_3_4_FIELD_STRUCTURE_DESIGN.md)
- [Task 3.5.1 字段数据类型规范（Approved）](docs/phases/phase-03/TASK_3_5_1_FIELD_TYPE_STANDARD.md)
- [Task 3.5.2 主键与唯一约束设计（Approved）](docs/phases/phase-03/TASK_3_5_2_PRIMARY_KEY_UNIQUE_CONSTRAINT_DESIGN.md)
- [Task 3.5.3 外键关系规范（Approved）](docs/phases/phase-03/TASK_3_5_3_FOREIGN_KEY_RELATIONSHIP_STANDARD.md)
- [Task 3.5.4 索引设计（Approved）](docs/phases/phase-03/TASK_3_5_4_INDEX_DESIGN.md)
- [Task 3.5.5 Check 约束设计（Approved）](docs/phases/phase-03/TASK_3_5_5_CHECK_CONSTRAINT_STANDARD.md)
- [Task 3.5.6 数据库命名规范（Approved）](docs/phases/phase-03/TASK_3_5_6_DATABASE_NAMING_STANDARD.md)
- [Task 3.5.7 数据库设计冻结（Frozen）](docs/phases/phase-03/TASK_3_5_7_DATABASE_FREEZE.md)
- [Task 4.1 页面架构设计（Approved）](docs/phases/phase-04/TASK_4_1_PAGE_ARCHITECTURE_DESIGN.md)
- [Task 4.2 PC 管理端布局与导航设计（Approved）](docs/phases/phase-04/TASK_4_2_PC_LAYOUT_AND_NAVIGATION.md)
- [Task 4.3 PC 管理端视觉规范设计（Approved）](docs/phases/phase-04/TASK_4_3_PC_VISUAL_DESIGN_SYSTEM.md)
- [Task 4.4 首页 Dashboard 页面设计（Approved）](docs/phases/phase-04/TASK_4_4_DASHBOARD_PAGE_DESIGN.md)
- [Task 4.5 基础资料模块页面设计（Approved）](docs/phases/phase-04/TASK_4_5_MASTER_DATA_PAGE_DESIGN.md)
- [Task 4.6 采购管理页面设计（Approved）](docs/phases/phase-04/TASK_4_6_PURCHASE_MANAGEMENT_PAGE_DESIGN.md)
- [Task 4.7 生产管理页面设计（Approved）](docs/phases/phase-04/TASK_4_7_PRODUCTION_MANAGEMENT_PAGE_DESIGN.md)
- [Task 4.8 库存管理页面设计（Approved）](docs/phases/phase-04/TASK_4_8_INVENTORY_MANAGEMENT_PAGE_DESIGN.md)
- [Task 4.9 出入库管理页面设计（Approved）](docs/phases/phase-04/TASK_4_9_INBOUND_OUTBOUND_MANAGEMENT_PAGE_DESIGN.md)
- [Task 4.10 跨境业务页面设计（Approved）](docs/phases/phase-04/TASK_4_10_CROSS_BORDER_BUSINESS_PAGE_DESIGN.md)
- [Task 5.1 API 总体规范与安全规则设计（Completed / Approved）](docs/phases/phase-05/TASK_5_1_API_DESIGN_PRINCIPLES.md)
- [Task 5.2 基础资料与采购 API（Completed / Approved）](docs/phases/phase-05/TASK_5_2_MASTER_DATA_AND_PURCHASE_API.md)
- [Task 5.3 生产、质量验收与库存 API（Completed / Approved）](docs/phases/phase-05/TASK_5_3_PRODUCTION_QUALITY_INVENTORY_API.md)
- [Task 5.4 出入库与跨境业务 API（Completed / Approved）](docs/phases/phase-05/TASK_5_4_INBOUND_OUTBOUND_CROSS_BORDER_API.md)
- [Task 5.5 导入、附件、日志、安全与 API 最终收口（Completed / Approved）](docs/phases/phase-05/TASK_5_5_IMPORT_LOG_SECURITY_API_FINAL.md)
- [Phase 5 Final Consistency Review（Completed / Approved）](docs/phases/phase-05/PHASE_5_FINAL_CONSISTENCY_REVIEW.md)
- [Task 6.1 功能详细设计统一规范（Completed / Approved）](docs/phases/phase-06/TASK_6_1_FUNCTIONAL_DESIGN_STANDARD.md)
- [Task 6.2 核心业务功能详细设计（Completed / Approved）](docs/phases/phase-06/TASK_6_2_CORE_BUSINESS_FUNCTIONAL_DESIGN.md)
- [Task 6.3 公共能力功能详细设计（Completed / Approved）](docs/phases/phase-06/TASK_6_3_COMMON_CAPABILITY_FUNCTIONAL_DESIGN.md)
- [API Change Request 001：补齐库存盘点、销售退货、报损 API（Completed / Approved）](docs/00-governance/API_CHANGE_REQUEST_001.md)
- [Phase 6 Final Consistency Review（Completed / Approved）](docs/phases/phase-06/PHASE_6_FINAL_CONSISTENCY_REVIEW.md)
- [Task 7.1 开发基线与工程初始化（Completed / Approved）](docs/phases/phase-07/TASK_7_1_DEVELOPMENT_BASELINE.md)
- [变更记录](CHANGELOG.md)
- [正式决策记录](docs/00-governance/DECISION_LOG.md)

## 开发前强制阅读

开始任何任务前必须更新到 GitHub `main` 最新代码，读取 `AGENTS.md` 并运行 `pnpm status:check`。检查通过后，按 `AGENTS.md` 规定读取 `CURRENT_STATUS.md`、`ROADMAP.md`、`PROJECT.md`、治理与 Frozen 文档、当前 Phase 文档及任务对应 Spec。

## 当前禁止事项

API Master Specification v1.1 是 Completed / Approved / Frozen 的唯一 API 事实来源；API Coverage Completion 002 已补齐用户、角色与权限管理接口，API Coverage Completion 003 已补齐角色仓库与店铺数据范围维护接口，正式接口总数为 335。Database Logical Design v1.1、DATABASE_ENUM_SPEC 与 Phase 6 Functional Specification 保持 Frozen。后续修改必须经过正式 DCR 或 Change Request，不得由聊天记忆、代码实现或临时决定覆盖。当前执行边界以 `CURRENT_STATUS.md`、`ROADMAP.md` 和已批准的当前 Task 指令为准。

## 安全说明

本仓库为公开仓库，严禁提交真实业务数据、密码、密钥、令牌、私钥、付款凭证、用户手机号、平台账号及其他敏感资料。
