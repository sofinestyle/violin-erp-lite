---
document_name: 正式决策记录
project: Violin ERP Lite
version: 1.0
status: Approved
owner: Project Manager
created_date: 2026-07-19
updated_date: 2026-07-19
related_phase: Phase 1
---

# DECISION LOG

## DEC-001 GitHub仓库公开

决定：

- 仓库设为 Public；
- 便于 ChatGPT 和项目负责人检查 Codex 提交；
- 不得提交敏感数据。

## DEC-002 双端系统

决定：

- 同时规划微信小程序和 PC 管理端；
- 两端共用后端和数据。

## DEC-003 仓库结构

决定：

- 一个公司实际仓；
- 每个厂家独立厂家仓；
- 海外仓 Excel 定期导入。

## DEC-004 国内销售管理边界

决定：

- 国内电商逐单登记出库；
- 不建设完整销售订单模块。

## DEC-005 产品粒度

决定：

- 沿用现有 SKU 编码；
- 不管理单琴序列号；
- 套装作为独立 SKU 整体管理。

## DEC-006 采购及验收

决定：

- 采购统一人民币；
- 记录采购付款；
- 入库前强制质量验收；
- 不设独立质检角色。

## DEC-007 库存控制

决定：

- 单级审核；
- 禁止负库存；
- 支持安全库存预警；
- 不管理库位。

## DEC-008 历史数据迁移

决定：

- 只导入期初库存；
- 不导入全部历史流水。

## DEC-009 正式启用项目治理文档

### 状态

Approved

### 日期

2026-07-19

### 决定

以下文档正式作为 Violin ERP Lite 项目治理依据生效：

- `PROJECT.md`
- `AGENTS.md`
- `DOCUMENT_PRIORITY.md`
- `DEVELOPMENT_WORKFLOW.md`
- `CHANGE_CONTROL.md`
- `DECISION_LOG.md`

### 原因

上述文档已经完成项目治理规则确认，继续标记为 Draft 会造成其是否具备约束效力的歧义。

### 影响

Codex 后续执行任何任务前，必须读取并遵守上述治理文档。

本次调整不改变任何 Frozen 业务规则，不代表 Phase 2 开始，也不涉及数据库、技术架构或业务开发。

## DEC-010 固定九阶段开发路线

### 状态

Approved

### 日期

2026-07-19

### 决定

Violin ERP Lite 采用固定九阶段开发路线。

九个阶段的名称、顺序和范围正式冻结。未经项目负责人确认，不得增加、删除、合并、拆分、重命名、调整顺序或跳过任何 Phase。

### 影响

- `ROADMAP.md` 状态更新为 Frozen；
- 所有 AI 必须读取当前 Phase；
- 所有任务必须符合当前 Phase 边界；
- Phase 1 完成后，下一阶段固定为 Phase 2 业务流程设计。

## DEC-011 中文作为项目主要语言

### 状态

Approved

### 日期

2026-07-19

### 决定

中文（简体）作为项目文档、产品内容、页面文案和 AI 汇报的主要语言。

### 补充

代码命名、数据库字段、API 字段和 Git Commit 使用英文。

### 影响

- 后续正式文档优先使用中文；
- 专业术语首次出现可附英文；
- 不得无理由将项目整体转为英文。

## DEC-012 Phase 1正式关闭

### 状态

Approved

### 日期

2026-07-19

### 决定

Phase 1 业务需求分析、业务规则冻结、项目治理体系及开发路线治理已全部完成。

### 当前状态

- Phase 1：Closed
- Phase 2：Not Started
- Development：Not Started
