---
document_name: 项目总纲
project: Violin ERP Lite
version: 1.0
status: Approved
owner: Project Manager
created_date: 2026-07-19
updated_date: 2026-07-19
related_phase: Phase 1
---

# PROJECT

## 项目简介

Violin ERP Lite 用于管理公司乐器产品，当前以小提琴及配件为主。

系统覆盖产品、采购、委外生产、质量验收、库存、出入库、跨境发货、采购付款、供应商及统计分析。

## 项目目标

- 用系统替代多个 Excel；
- 建立唯一产品资料；
- 实现实时库存；
- 建立可追溯库存流水；
- 统一国内与跨境业务；
- 实现业务流程数字化；
- 支持企业长期扩展。

## 使用终端

- 微信小程序；
- PC 管理端。

两端必须使用同一套后端、数据和业务规则。

## 项目用户

- 管理员；
- 采购人员；
- 仓库人员；
- 销售人员；
- 公司负责人。

## 项目进度

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
- 业务需求分析：Approved
- 业务规则：Frozen
- 项目治理文档：Approved
- 九阶段开发路线：Frozen
- 开发状态：尚未开始（Not Started）
- 数据库设计：进行中（In Progress）
- 数据库字段设计：尚未开始（Not Started）

Phase 1 已正式关闭，Phase 2 已完成并获得批准。Phase 3 Database Design 正在进行，Task 3.1 至 Task 3.3 均已完成并获得批准。下一任务为 Task 3.4 字段结构设计，当前尚未启动；验收 Task 3.3 前不得开始 Task 3.4。字段、字段类型、主外键、索引、SQL、ORM、数据库技术选型和技术开发均未开始。

## 固定九阶段开发路线

Violin ERP Lite 采用以下固定九阶段开发路线，详细阶段目标、输出、进入条件和完成条件以 `ROADMAP.md` 为准。

| 阶段 | 名称 | 英文名称 | 当前状态 |
| --- | --- | --- | --- |
| Phase 1 | 业务需求分析 | Business Requirement Analysis | Closed（Completed） |
| Phase 2 | 业务流程设计 | Business Process Design | Completed / Approved |
| Phase 3 | 数据库设计 | Database Design | In Progress |
| Phase 4 | 页面设计 | UI / Page Design | Waiting |
| Phase 5 | 接口设计 | API Design | Waiting |
| Phase 6 | 功能详细设计 | Functional Specification | Waiting |
| Phase 7 | 开发规范与 Codex 执行 | Development Specification | Waiting |
| Phase 8 | 测试方案 | Test Plan | Waiting |
| Phase 9 | 验收与上线 | Acceptance & Release | Waiting |

## 开发阶段冻结规则

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

## 项目语言规范

1. 项目主要语言为中文（简体）。
2. 所有正式项目文档默认使用中文编写，包括但不限于：
   - `PROJECT.md`；
   - `ROADMAP.md`；
   - `BUSINESS_RULES.md`；
   - `SYSTEM_SPEC.md`；
   - `FEATURE_LIST.md`；
   - `DATABASE_SPEC.md`；
   - UI 规范；
   - API 规范；
   - `TEST_PLAN.md`；
   - `ACCEPTANCE_CRITERIA.md`；
   - `CHANGELOG.md`；
   - `DECISION_LOG.md`；
   - Codex 执行汇报。
3. 专业术语首次出现时，可以采用“中文（English）”格式，例如业务需求分析（Business Requirement Analysis）、库存流水（Inventory Ledger）、采购订单（Purchase Order）和质量验收（Quality Inspection）。
4. 同一术语后续应统一使用，不得在产品、商品、货品、Item、Product 之间随意切换。
5. 页面显示文字默认使用中文（简体）。
6. 代码中的变量名、函数名、类名、数据库表名、字段名和 API 字段名使用英文。
7. Git Commit 继续使用英文，并遵循规范化格式。
8. README 以中文为主要语言，可以保留必要英文术语。
9. 除非项目负责人明确要求，不得将正式项目文档整体改写为英文。
10. 所有 AI 在本项目中默认使用中文回复。

## 项目原则

- Business Rules First；
- Spec Driven Development；
- Database First，但必须在进入数据库设计阶段后才能执行；
- Single Source of Truth；
- Never Break Existing Features；
- Backward Compatibility；
- 所有变更先更新文档，再开发；
- 当前 Phase 未确认，不得进入下一 Phase；
- 不得因为 AI 出现新想法而修改既定规则。

## 文档权威规则

GitHub 仓库中最新的 Approved 或 Frozen 文档，是项目唯一正式依据。

聊天记录不能自动覆盖正式文档。聊天中提出的新需求必须经过以下流程：

需求提出
→ 影响分析
→ 项目负责人确认
→ 更新正式文档
→ 更新 CHANGELOG
→ Codex 执行
