# Task 8-C2 Outbound Implementation

项目：Violin ERP Lite  
阶段：Phase 8 Application Development  
任务：8-C2 Batch 3 Outbound Development  
状态：Completed / Pending Approval  
创建日期：2026-07-26  
文档类型：Implementation Record

---

## 1. 实现范围

本次实现 Module 3 Inventory Management 第三批出库能力，覆盖：

1. 出库单查询与详情；
2. 出库单创建；
3. 出库状态流转；
4. 确认出库库存扣减；
5. 库存流水写入；
6. 防负库存；
7. 重复确认防重；
8. 已完成出库冲销；
9. 出库操作审计；
10. warehouse / store scope 数据范围控制。

本次不实现：

1. 完整销售订单生命周期；
2. 外部平台自动同步；
3. 出库管理页面；
4. 新增 Attachment Object Type；
5. 新增 API；
6. 新增数据库表、字段、枚举或 Migration。

---

## 2. 修改文件

修改：

1. `packages/database/src/inventory-workflow/prisma-inventory-workflow-repository.ts`
2. `packages/database/tests/inventory-workflow-repository.test.ts`
3. `packages/api/tests/inventory-workflow.test.ts`

新增：

1. `docs/phases/phase-08/TASK_8_C2_OUTBOUND_IMPLEMENTATION.md`

---

## 3. API 使用

复用 API Master Specification v1.6 已有 `OUT-*`：

| API | 路径 | 实现说明 |
| --- | --- | --- |
| `OUT-001` | `GET /api/v1/outbound-orders` | 复用既有库存工作流列表 |
| `OUT-002` | `GET /api/v1/outbound-orders/{id}` | 复用既有库存工作流详情 |
| `OUT-003` | `POST /api/v1/outbound-orders/domestic-sales` | 创建国内销售出库 |
| `OUT-004` | `POST /api/v1/outbound-orders/other` | 创建其他出库 |
| `OUT-005` | `PATCH /api/v1/outbound-orders/{id}` | 草稿编辑 |
| `OUT-006`—`OUT-013` | 状态操作 | 提交、撤回、审核、驳回、反审核、取消、确认、冲销 |
| `OUT-014` | 状态历史 | 复用 `document_status_histories` |
| `OUT-015` | 出库库存流水 | 复用 `inventory_transactions` |

未新增 API Path、DTO 字段、Response 字段或 Error Code。

---

## 4. Database 对象

复用：

1. `outbound_orders`
2. `outbound_order_items`
3. `inventories`
4. `inventory_transactions`
5. `warehouses`
6. `skus`
7. `audit_logs`
8. `document_status_histories`
9. `attachments`
10. `attachment_links`

未修改 Prisma Schema，未创建 Migration，未修改 Database SSOT。

---

## 5. Inventory Transaction 设计

### 5.1 创建出库单

创建出库单只写入：

1. `outbound_orders`
2. `outbound_order_items`

创建阶段禁止：

1. 修改 `inventories`；
2. 写入 `inventory_transactions`。

### 5.2 确认出库

确认出库在数据库事务中执行：

1. 校验出库单状态必须为 `approved`；
2. 校验 `versionNo`；
3. 校验 warehouse / store scope；
4. 读取出库明细；
5. 读取库存余额；
6. 校验 `available_quantity` 与 `on_hand_quantity` 均足够；
7. 使用条件更新扣减 `available_quantity` 与 `on_hand_quantity`；
8. 写入 `inventory_transactions`；
9. 更新出库单状态为 `completed`；
10. 写入状态历史；
11. 由 API Service 写入 `audit_logs`。

任一步失败时事务失败，单据状态不会进入完成。

### 5.3 防负库存

确认出库必须满足：

```text
available_quantity >= outbound_quantity
on_hand_quantity >= outbound_quantity
```

同时使用数据库条件更新保护：

```text
WHERE available_quantity >= quantity
  AND on_hand_quantity >= quantity
```

未命中更新时返回冲突错误，不写库存流水。

### 5.4 重复确认防重

已完成出库单再次确认时返回当前 `completed` 状态，不再次扣减库存，不新增库存流水。

路由层继续要求写操作携带 `Idempotency-Key`。

### 5.5 出库冲销

冲销规则：

1. 仅允许 `completed` 出库单；
2. 不删除原库存流水；
3. 创建方向为 `in` 的反向库存流水；
4. 使用 `related_transaction_id` 关联原出库流水；
5. 状态更新为 `reversed`；
6. 写入状态历史和审计。

---

## 6. Permission

复用：

1. `outbound.order.read`
2. `outbound.order.create-domestic-sales`
3. `outbound.order.create-other`
4. `outbound.order.update`
5. `outbound.order.submit`
6. `outbound.order.withdraw`
7. `outbound.order.approve`
8. `outbound.order.reject`
9. `outbound.order.unapprove`
10. `outbound.order.cancel`
11. `outbound.order.confirm`
12. `outbound.order.reverse`
13. `outbound.order.export`
14. `inventory.stock.read`
15. `inventory.transaction.read`
16. `master.sku.read`
17. `master.warehouse.read`
18. `attachment.file.*`

未新增 Permission Code。

---

## 7. 测试结果

新增 / 更新测试覆盖：

1. 创建出库单；
2. 创建阶段不修改库存、不写库存流水；
3. 确认出库库存扣减；
4. `inventory_transactions` 生成；
5. 防负库存；
6. 重复确认防重；
7. 出库冲销；
8. 冲销反向流水关联原流水；
9. 权限与审计；
10. 流水写入失败时不更新单据状态。

最终验证以本次提交执行结果为准。

---

## 8. 已知限制

1. 本批不建设出库页面；
2. 本批不接入外部电商平台；
3. 本批不新增出库附件运行时能力，继续复用 Attachment Framework；
4. 本批不新增销售订单事实对象；
5. 路由层要求 `Idempotency-Key`，重复确认通过状态终态防重，不重复扣减库存。

---

## 9. Change Impact

| 项目 | 结果 |
| --- | --- |
| Database Schema | Not Changed |
| Migration | Not Changed |
| API Spec | Not Changed |
| Permission Spec | Not Changed |
| Business Rules | Not Changed |

结论：

8-C2 Batch 3 Outbound Development 已按批准范围完成，可以进入 Module 3 下一批库存调整开发。
