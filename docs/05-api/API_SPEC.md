---
document_name: API规格
project: Violin ERP Lite
version: 1.0
status: Draft
owner: Project Manager
created_date: 2026-07-19
updated_date: 2026-07-21
related_phase: Phase 5
---

# API SPEC

Phase 5 接口设计已由项目负责人正式启动，当前状态为 In Progress。

当前进度：

- Task 5.1 API 总体规范与安全规则设计：Completed / Approved；
- Task 5.2 基础资料与采购 API：Completed / Approved；
- Task 5.3 生产、质量验收与库存 API：Completed / Approved；
- Task 5.4 出入库与跨境业务 API：Completed / Approved；
- Task 5.5 导入、日志、安全与 API 最终收口：Waiting。

Task 5.1 至 Task 5.4 正式设计分别参见 [API 总体规范](../phases/phase-05/TASK_5_1_API_DESIGN_PRINCIPLES.md)、[基础资料与采购 API](../phases/phase-05/TASK_5_2_MASTER_DATA_AND_PURCHASE_API.md)、[生产、质量验收与库存 API](../phases/phase-05/TASK_5_3_PRODUCTION_QUALITY_INVENTORY_API.md) 和 [出入库与跨境业务 API](../phases/phase-05/TASK_5_4_INBOUND_OUTBOUND_CROSS_BORDER_API.md)。Task 5.4 共登记 72 个正式接口：入库 18 个、出库 17 个、调拨 15 个、跨境 22 个。项目负责人已决定以页面/API口径关闭跨境三项冲突：只保留 `status`、`approval_status`、`shipment_status`，取消历史余额快照及快照接口，取消手工海外收货及手工增加海外仓库存；海外仓库存只能由 Task 5.5 正式 Excel 导入结果形成。本次不发起 DCR，Frozen 数据库保持不变。Task 5.1 至 Task 5.4 均为 Completed / Approved，Task 5.5 保持 Waiting。未创建真实 API，技术开发保持 Not Started。
