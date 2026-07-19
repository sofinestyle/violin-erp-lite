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

## 当前状态

- Current Phase: Phase 1 Completed
- Phase 1 Status: Approved
- Business Rules Status: Frozen
- Development Status: Not Started

当前已完成项目治理体系、Phase 1 业务需求分析及第一版业务规则冻结，尚未开始任何技术开发。

## 仓库用途

本仓库用于保存项目正式文档、阶段成果、后续源代码和变更记录，并作为检查文档与实现一致性、识别需求偏移、追溯决策及审计 Git 提交的统一载体。

## 项目角色

- ChatGPT：Product Manager，负责需求、流程、规划、设计、PRD、验收标准及文档检查。
- Codex：Software Engineer，严格依据正式文档执行工程任务并同步测试、文档和 Git 记录。
- 项目负责人：Project Manager，负责业务确认、规则冻结、排期、验收和最终决策。

## 文档入口

- [项目总纲](PROJECT.md)
- [Codex 执行约束](AGENTS.md)
- [文档优先级](docs/00-governance/DOCUMENT_PRIORITY.md)
- [Phase 1 业务需求分析](docs/01-business/PHASE_01_BUSINESS_REQUIREMENT_ANALYSIS.md)
- [Frozen 业务规则](docs/01-business/BUSINESS_RULES.md)
- [变更记录](CHANGELOG.md)
- [正式决策记录](docs/00-governance/DECISION_LOG.md)

## 开发前强制阅读

开始任何任务前必须按顺序阅读 `PROJECT.md`、`AGENTS.md`、`docs/00-governance/DOCUMENT_PRIORITY.md`、`docs/01-business/BUSINESS_RULES.md`、`docs/02-product/SYSTEM_SPEC.md` 和当前 Phase 文档，并根据任务类型补充阅读对应 Spec。

## 当前禁止事项

当前不得进入 Phase 2，不得进行系统功能详细规划、数据库或数据表设计、API 设计、技术架构选型、页面设计、前后端编码、应用框架创建或依赖安装。

## 安全说明

本仓库为公开仓库，严禁提交真实业务数据、密码、密钥、令牌、私钥、付款凭证、用户手机号、平台账号及其他敏感资料。
