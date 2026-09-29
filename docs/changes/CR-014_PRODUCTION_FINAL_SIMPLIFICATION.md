---
document_name: Production Workflow Final Simplification
project: Violin ERP Lite
status: Approved / Implemented
owner: Project Owner
created_date: 2026-09-29
---

# CR-014 生产流程最终简化

Approved By：Project Owner。Approval Date：2026-09-29。依据本轮负责人明确批准的业务目标及必要 Business/API/Database 变更。基准 `888b65323efc3ab4c6c56784da2b6a24c636f5f6`；采购已独立验收、提交及推送，本批不改变采购。

## 审计与批准范围

既有 production_orders → production_order_items 已是一对多，明细已有 planned_quantity、inbound_quantity、processing_unit_price；无需创建平行来源。旧创建 API 已接收 items 数组，前端需要完整开放多行。旧进度、完工、质检、入库是正式能力，不是单纯隐藏按钮即可移除的页面步骤。

新业务为厂家 → 生产订单 → 成品入库 → 库存。保存订单直接生产中；状态为 in_production、partially_received、received、cancelled。明细数量为正且 SKU 不重复；生产日期兼容赋值 planned_start_date，保留正式预计完成日。生产进度、完工、独立成品质检停止写入，历史数据及读取接口保留；旧提交、审核、开始等中间动作不再驱动新订单。既有生产付款不在本次删除范围内。

成品入库直接引用生产订单及其明细，允许每次选择部分 SKU 和部分剩余数量，至少一行正数；逐行累计不得超过计划数量，全部明细入足才已入库。是否质检必选且无默认，质检人选填最多 100 字，否时清空。批次允许 NULL，沿用正式来源单据及流水追溯。成本按本文补充批准规则取值。

复用 production.order.create、inbound.order.create-production 与 inbound.order.confirm；来源记录范围和目标仓 operate/manage 范围不放宽，不新增 Permission Code。每次入库锁定生产主单后复核所有剩余数量，同事务完成主明细、库存、流水、累计量、状态历史及 required Audit；任何一步失败全部回滚，正式幂等适配器防重复。生产创建同事务保存全部明细与 Audit。

## Contract 与历史边界

PRO-003 保存直接生产中，plannedStartDate 服务端取 documentDate。INB-004 不再要求 inspectionOrderId，使用 productionOrderId、warehouseId、documentDate、inspectionPerformed、inspectorName、items；明细 productionOrderItemId、skuId、quantity。历史进度/完工/质检表不删除，原始状态不批量改写。正常历史按实际入库与流水计算展示，证据矛盾只读待复核，不允许继续入库；旧完工量不伪装为已入库量。

迁移仅调整生产及入库所需约束/状态兼容；复用已有检查信息、累计字段和批次可空能力。正式版本、精确约束和成本规则在实施前同步至 API_SPEC / DATABASE_SPEC。

## 验证与交付

真实 PostgreSQL/HTTP 和浏览器验证 A100+B50，分三次 A40+B50、A30、A30；验证 3 张入库、逐 SKU 库存/流水/Audit、并发超量、失败回滚、幂等、状态/权限拒绝及历史查询。执行 pnpm check、status:check、diff --check、Prisma validate 与迁移状态；3100 Health 和 3000 只读检查，不操作 PM2。

统一一个提交 `refactor: simplify production and inbound workflow`，验证及文档完成后推送 origin/main。UAT 最终 Fixed / Pending Manual Verification，不直接 Closed。实施、571 项默认自动化测试、真实 PostgreSQL 专项及浏览器三次分批闭环已通过；人工最终复验待执行。


### CR-014 成本规则补充批准（2026-09-29，Project Owner）

成品入库单位成本定义为“Lite版本暂估生产入库成本”，逐 SKU、逐批次直接继承对应生产订单明细 processing_unit_price，不使用订单平均价，不计算移动平均生产成本。用户不重复填写；写入入库明细及库存流水。当前不额外计入原材料、配件、油漆、包装、领料、制造费用或其他间接成本，不表述为完整制造成本。历史成本不追溯、不重算；未来 BOM、Material Issue、Manufacturing Cost、Cost Accounting 通过独立 CR 升级。
