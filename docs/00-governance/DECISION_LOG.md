---
document_name: 正式决策记录
project: Violin ERP Lite
version: 1.0
status: Draft
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
