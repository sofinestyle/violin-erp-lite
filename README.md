---
document_name: 项目说明
project: Violin ERP Lite
version: 1.0
status: Draft
owner: Project Manager
created_date: 2026-07-19
updated_date: 2026-07-22
related_phase: Phase 1
---

# Violin ERP Lite（乐器产品管理系统）

## 项目定位

Violin ERP Lite 是面向企业内部使用的轻量级 ERP，用于管理以小提琴及相关配件为主的乐器产品，覆盖产品、SKU、供应商、采购、委外生产、质量验收、库存、国内销售出库、跨境分批发货、采购付款与统计分析等业务。

## 当前项目状态

- 当前已完成阶段：Phase 5 接口设计（API Design，Completed / Approved / Frozen）
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
- 当前阶段：Phase 6 功能详细设计
- Phase 5：Completed / Approved / Frozen
- Task 5.1 API 总体规范与安全规则设计：Completed / Approved
- Task 5.2 基础资料与采购 API：Completed / Approved
- Task 5.3 生产、质量验收与库存 API：Completed / Approved
- Task 5.4 出入库与跨境业务 API：Completed / Approved
- Task 5.5 导入、附件、日志、安全与 API 最终收口：Completed / Approved
- Phase 5 Final Consistency Review：Completed / Approved
- Phase 6：In Progress
- Task 6.1 功能详细设计统一规范：Completed / Approved
- Task 6.2 核心业务功能详细设计：Completed / Approved
- Task 6.3 公共能力功能详细设计：Completed / Approved
- API Change Request 001：Completed / Approved
- API Master Specification v1.1：Completed / Approved / Frozen（正式接口总数 315）
- Phase 6 Final Consistency Review：Completed / Pending Approval
- 当前下一步：Phase 6 Final Consistency Review GitHub 验收
- Phase 1 业务需求分析：Approved
- BUSINESS_RULES：Frozen
- 项目治理文件：Approved
- 九阶段开发路线：Frozen
- 数据库设计：Completed / Approved / Frozen
- 数据库字段名称设计：Completed / Approved
- 字段数据类型规范：Completed / Approved
- 主键与唯一约束设计：Completed / Approved
- 外键关系规范：Completed / Approved
- 索引设计：Completed / Approved
- Check 约束设计：Completed / Approved
- 数据库命名规范：Completed / Approved
- 数据库冻结：Completed / Approved / Frozen
- 技术开发：Not Started

Phase 1 已正式关闭，Phase 2 已完成并获得批准。Phase 3 Database Design 及 Task 3.1 至 Task 3.5.7 已完成并获得批准，Database Logical Design v1.1 已冻结；DCR-001 仅批准既有 `completion_status` 的正式状态定义，数据库结构不变。Phase 4 页面设计及 Task 4.1 至 Task 4.10 均为 Completed / Approved。API Change Request 001 已获得批准；库存盘点、销售退货和报损共 43 个接口已纳入 API Master Specification v1.1，正式接口总数为 315，v1.1 状态为 Completed / Approved / Frozen。Phase 6 为 In Progress；Task 6.1 至 Task 6.3 均为 Completed / Approved，独立 Final Consistency Review 为 Completed / Pending Approval，技术开发尚未开始，Phase 7 保持 Waiting / Not Started。

## 九阶段开发路线

| 阶段 | 名称 | 状态 |
| --- | --- | --- |
| Phase 1 | 业务需求分析 | Closed（Completed） |
| Phase 2 | 业务流程设计 | Completed / Approved |
| Phase 3 | 数据库设计 | Completed / Approved / Frozen |
| Phase 4 | 页面设计 | Completed / Approved |
| Phase 5 | 接口设计 | Completed / Approved / Frozen |
| Phase 6 | 功能详细设计 | In Progress |
| Phase 7 | 开发规范与 Codex 执行 | Waiting / Not Started |
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
- [Phase 6 Final Consistency Review（Completed / Pending Approval）](docs/phases/phase-06/PHASE_6_FINAL_CONSISTENCY_REVIEW.md)
- [变更记录](CHANGELOG.md)
- [正式决策记录](docs/00-governance/DECISION_LOG.md)

## 开发前强制阅读

开始任何任务前必须按顺序阅读 `PROJECT.md`、`AGENTS.md`、`docs/00-governance/DOCUMENT_PRIORITY.md`、`ROADMAP.md`、`docs/01-business/BUSINESS_RULES.md`、`docs/02-product/SYSTEM_SPEC.md` 和当前 Phase 文档，并根据任务类型补充阅读对应 Spec。

## 当前禁止事项

API Change Request 001 已正式批准，API Master Specification v1.1 已成为 Completed / Approved / Frozen 的唯一 API 事实来源，正式接口总数为 315；任何后续正式内容变更必须经过 DCR 或 Change Request。Phase 6 为 In Progress，Final Consistency Review 为 Completed / Pending Approval，当前下一步为其 GitHub 验收。不得提前冻结 Phase 6 或启动 Phase 7；不得创建真实 API Route，不得编写页面代码或业务代码，不得修改数据库，不得创建 ORM、DDL、Schema、Migration、Seed 或物理 ER 图，不得安装依赖。

## 安全说明

本仓库为公开仓库，严禁提交真实业务数据、密码、密钥、令牌、私钥、付款凭证、用户手机号、平台账号及其他敏感资料。
