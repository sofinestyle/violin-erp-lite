---
document_name: Phase 8-E3 Sales Management Development Implementation
project: Violin ERP Lite
phase: Phase 8 Application Development
task: 8-E3 Sales Management Development Implementation
status: Completed / Pending Approval
owner: Project Manager
created_date: 2026-07-26
updated_date: 2026-07-26
related_phase: Phase 8
---

# TASK 8-E3 Sales Management Development Implementation

## 1. 实现范围

本次实现 Sales Limited MVP，严格基于：

1. `TASK_8_E_SALES_IMPACT_REVIEW.md`；
2. `TASK_8_E2_SALES_IMPLEMENTATION_DESIGN.md`；
3. Database SSOT v2.5；
4. API Master Specification v1.6；
5. Role Permission Spec。

实现内容：

1. Sales Outbound Integration；
2. Sales Return；
3. Platform / Store Sales View；
4. Sales Statistics。

本次未实现：

1. Sales Order 系统；
2. Platform Order 系统；
3. Customer Master；
4. `SALES-*` API；
5. `sales.*` Permission；
6. 统计快照表；
7. 平台 API 同步。

## 2. 修改文件

新增：

1. `packages/api/src/sales/sales-management.ts`；
2. `packages/database/src/sales/prisma-sales-management-repository.ts`；
3. `packages/api/tests/sales-management.test.ts`；
4. `packages/database/tests/sales-management-repository.test.ts`；
5. `docs/phases/phase-08/TASK_8_E3_SALES_IMPLEMENTATION.md`。

修改：

1. `packages/api/src/index.ts`；
2. `packages/database/src/index.ts`；
3. `packages/database/src/inventory-workflow/prisma-inventory-workflow-repository.ts`；
4. `packages/database/tests/inventory-workflow-repository.test.ts`。

## 3. Sales Outbound 实现

Sales Outbound 继续复用既有 Outbound Workflow。

支持能力：

1. 国内销售出库创建；
2. 平台、店铺、客户快照、外部订单号、外部订单行号记录；
3. 状态流转复用 `OUT-*`；
4. 确认出库复用既有事务库存扣减；
5. 生成 `inventory_transactions`；
6. 防负库存；
7. 重复确认防重；
8. Audit；
9. Trace；
10. Idempotency。

创建阶段仍禁止：

1. 修改 `inventories`；
2. 写入 `inventory_transactions`；
3. 创建 Sales Order；
4. 创建 Platform Order。

确认出库仍是库存减少唯一边界。

## 4. Sales Return 实现

Sales Return 继续复用既有 `sales_returns` 与 `sales_return_items`。

本次增强：

1. 创建退货时校验原销售出库存在；
2. 校验退货店铺与原销售出库店铺一致；
3. 校验退货明细必须属于同一原销售出库；
4. 校验退货 SKU 与原出库明细一致；
5. 校验累计退货数量不得超过原出库数量；
6. 退货入库继续复用 `confirm-inbound`；
7. 退货入库通过 `inventories` 与 `inventory_transactions` 形成库存增加事实。

创建退货阶段仍禁止：

1. 增加库存；
2. 写库存流水。

退货入库确认是销售退货库存增加边界。

## 5. Platform View 实现

新增 Sales Management 只读查询抽象：

1. `SalesManagementService`；
2. `SalesManagementRepository`；
3. `PrismaSalesManagementRepository`。

平台销售视图数据来源：

1. `outbound_orders`；
2. `outbound_order_items`；
3. `ecommerce_platforms`；
4. `stores`；
5. `inventory_transactions`。

支持筛选：

1. Platform；
2. Store；
3. SKU；
4. Warehouse；
5. Date Range。

权限与范围：

1. `outbound.order.read`；
2. `inventory.transaction.read`；
3. `master.platform.read`；
4. `master.store.read`；
5. Store Scope；
6. Warehouse Scope；
7. `field.personal-data.read` 控制客户字段。

未创建平台订单表或平台订单 API。

## 6. Sales Statistics 实现

销售统计为只读派生结果。

支持：

1. 总销量；
2. 退货数量；
3. 净销量；
4. SKU 销量排行；
5. 平台销量；
6. 店铺销量；
7. 出库库存流水数量对照。

数据来源：

1. 已完成国内销售出库；
2. 销售出库明细；
3. 已完成销售退货；
4. 销售退货明细；
5. 出库库存流水。

金额与成本：

1. `field.amount.read` 控制金额字段；
2. `field.cost.read` 控制成本字段。

统计结果不回写数据库，不创建统计事实表。

## 7. Database 对象

复用对象：

1. `outbound_orders`；
2. `outbound_order_items`；
3. `sales_returns`；
4. `sales_return_items`；
5. `inventories`；
6. `inventory_transactions`；
7. `ecommerce_platforms`；
8. `stores`；
9. `audit_logs`；
10. `document_status_histories`；
11. `idempotency_records`。

Database Change：Not Required

本次未修改：

1. Prisma Schema；
2. Migration；
3. Database SSOT；
4. 数据库枚举；
5. Check Constraint。

## 8. API 使用

复用：

1. `OUT-*`；
2. `SRT-*`；
3. `MD-*`；
4. `INV-*`。

API Change：Not Required

本次未新增：

1. API Path；
2. DTO 字段；
3. Response 结构；
4. Error Code；
5. `SALES-*`；
6. `ORDER-*`；
7. Platform Order API。

## 9. Permission

复用：

1. `outbound.order.*`；
2. `outbound.sales-return.*`；
3. `inventory.*`；
4. `master.platform.*`；
5. `master.store.*`；
6. `field.personal-data.read`；
7. `field.amount.read`；
8. `field.cost.read`；
9. Store Scope；
10. Warehouse Scope。

Permission Change：Not Required

本次未新增：

1. `sales.*`；
2. `customer.*`；
3. `platform-order.*`。

## 10. 测试结果

新增和增强测试覆盖：

1. Sales Outbound 创建；
2. 销售来源记录；
3. 创建阶段不修改库存；
4. 出库确认库存扣减；
5. `inventory_transactions` 生成；
6. 防负库存；
7. 重复确认防重；
8. 事务失败回滚；
9. Sales Return 创建；
10. 原出库关联；
11. SKU 匹配；
12. 累计退货数量限制；
13. 退货入库库存增加；
14. 退货入库流水生成；
15. 权限校验；
16. Audit；
17. 平台筛选；
18. 店铺筛选；
19. SKU 统计；
20. Store Scope；
21. 字段权限控制；
22. 销售统计。

验证命令：

```bash
pnpm check
pnpm status:check
git diff --check
```

## 11. 已知限制

1. 当前不建设完整 Sales Order 生命周期；
2. 当前不持久化 Platform Order；
3. 当前不建设 Customer Master；
4. 当前不接入平台 API；
5. 当前不创建销售统计快照表；
6. Sales View / Statistics 为内部服务能力，后续页面开发应继续复用既有 API Contract 边界；
7. 利润、佣金、税费和平台费用分析需要后续独立设计。
