---
document_name: Procurement Workflow Final Simplification
project: Violin ERP Lite
cr_id: CR-013
status: Approved / Implemented
owner: Project Manager
created_date: 2026-09-29
---

# CR-013 采购流程最终简化

Approved By：Project Owner。Approval Date：2026-09-29。批准依据：负责人本轮明确批准业务目标及必要 Frozen Business/API/Database 调整；本 CR 仅限采购，不扩展生产。

## 正式业务与边界

采购流程为供应商 → 采购订单 → 采购入库 → 库存；采购业务状态为待审核、采购中、已入库、已取消。保留 CR-012 有权自审采购订单及服务端数据范围保护。采购付款与独立采购质检停止新写入，保留历史只读接口、表和审计；生产付款、完工、成品质检和生产入库不变。

覆盖 BR-007 采购例外：采购继续整单一次执行，入库覆盖全部剩余采购数量；不接受部分、超量或重复明细。覆盖 BR-026：采购付款 Deprecated / Hidden from Lite Workflow。覆盖 BR-027/029 采购分支：到货检查为可选业务事实，不再要求独立采购验收单；生产强制验收不变。覆盖 BR-022 采购批次要求：新采购入库不维护批次，持久化 NULL，不伪造批次。

## API 与权限

复用 POST /inbound-orders/purchase（INB-003）。请求 documentDate、purchaseOrderId、warehouseId、inspectionPerformed（布尔值，无默认）、items（purchaseOrderItemId、skuId、quantity）；inspectorName 可选文字 100 字，inspectionPerformed=false 时服务端清空。拒绝不匹配 SKU、来源、旧 inspectionOrderId；单位成本从正式采购明细 unit_price 读取，客户端不得覆盖；批次保存 NULL。

一次保存即完成入库，不再提交/审核/确认。复用 inbound.order.create-purchase 与 inbound.order.confirm 权限及目标仓 operate/manage 范围，来源仍受正式记录范围约束。不新增 Permission、Role 或 Scope，不要求 inbound.order.approve；生产审批不变。旧采购入库后续写动作关闭，历史只读保留。客户端按钮仅辅助，服务端最终校验。

锁定采购单后重新验证采购中、剩余数量和范围，同一事务写入 completed 入库单及明细、库存余额、库存流水、采购累计数量与 received 状态、状态历史及 required Audit。事务失败全部回滚；父单行锁保证重复/并发入库不重复记账，复用正式幂等机制返回同请求结果。

## 数据库与历史兼容

inbound_orders 新增 inspection_performed nullable boolean（历史 NULL，不回填虚假质检事实）、inspector_name nullable varchar(100)。CHECK 限定新质检信息只用于采购，未质检不得保留姓名；inbound_order_items.batch_no 改 nullable，生产服务继续校验必填。不删除表、历史记录、外键或原始状态。purchase_orders CHECK 保留 inspected 等历史值作为兼容存储，新业务不写 inspected。

历史 received 必须有真实 completed 入库和对应净库存流水；旧 inspected 有完整确认质检、无入库事实且全量合格时兼容为采购中，保持原始状态与质检记录。存在不合格、分批、数量不一致或缺少证据时只读隔离为历史数据待复核，不强行入库或虚构数量。正常历史已入库仍可按旧合格数量证据读取。

## 验收与交付

专项覆盖四状态、停用旧写入口、整单/超量/缺少质检选择、成本继承、无批次、权限和范围、事务回滚、并发重复、历史证据与生产回归。执行 pnpm check、status:check、diff --check、Prisma validate/migrate status、真实 PostgreSQL 与 HTTP/浏览器闭环；检查 3100 Health 与 3000 可达性，不操作 PM2。

本批统一提交 refactor: simplify procurement inbound workflow；2026-09-29 项目负责人确认“经过人工测试，测试通过。”实施与自动化、真实 HTTP/PostgreSQL 验证完成，CR 为 Approved / Implemented，UAT 为 Fixed / Manual Verification Passed；保留自动浏览器中断的证据边界，不直接 Closed。
