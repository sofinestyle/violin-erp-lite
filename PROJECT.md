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
