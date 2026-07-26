# Task 8-C2 Inventory Transaction Query Implementation

## 1. 实现范围

本次实现 Module 3 Inventory Management 第二批库存流水查询能力，覆盖：

- 库存流水列表查询；
- 库存流水详情查询；
- SKU、仓库、事务类型、来源类型、来源单据、日期范围筛选；
- 来源追踪展示；
- warehouse scope 数据范围控制；
- Trace Context 贯通；
- 成本与金额字段按字段权限输出。

本次不实现：

- 库存流水新增；
- 库存流水编辑；
- 库存流水删除；
- 库存余额修改；
- 新业务库存事实表；
- API Contract 变更；
- Database Schema / Migration 变更。

## 2. 修改文件

- `packages/api/src/inventory-transaction/inventory-transaction.ts`
- `packages/api/src/index.ts`
- `packages/api/tests/inventory-transaction.test.ts`
- `packages/database/src/inventory-transaction/prisma-inventory-transaction-repository.ts`
- `packages/database/src/index.ts`
- `packages/database/tests/inventory-transaction-repository.test.ts`
- `apps/admin/app/api/v1/[...segments]/route.ts`
- `docs/phases/phase-08/TASK_8_C2_INVENTORY_TRANSACTION_IMPLEMENTATION.md`

## 3. API 使用

复用 API Master Specification v1.6 中已有接口：

- `INV-006`：`GET /api/v1/inventory-transactions`
- `INV-007`：`GET /api/v1/inventory-transactions/{id}`

本次未新增 API Path、DTO 字段、Response 字段或 Error Code。

## 4. Database 对象

只读复用：

- `inventory_transactions`
- `skus`
- `warehouses`
- `users`

不新增表、不新增字段、不修改 Prisma Schema、不创建 Migration。

## 5. Permission 使用

复用：

- `inventory.transaction.read`
- `inventory.stock.read`
- `master.sku.read`
- `master.warehouse.read`
- `field.cost.read`
- `field.amount.read`

其中：

- 无 `field.cost.read` 时不返回 `unitCost`；
- 无 `field.amount.read` 时不返回 `amount`；
- 非全局数据范围用户按 `warehouseScopes` 限制可见流水。

## 6. 查询与来源追踪

列表查询支持：

- SKU 过滤；
- Warehouse 过滤；
- Transaction Type 过滤；
- Source Type 过滤；
- Source Document 过滤；
- Date Range 过滤；
- Pagination。

来源追踪支持：

- `inbound` / `inbound_order` → Inbound Order；
- `outbound` / `outbound_order` → Outbound Order；
- `adjustment` / `inventory_adjustment` → Inventory Adjustment。

库存流水保持只读事实记录，不替代来源单据、不替代审计日志。

## 7. 测试结果

新增测试覆盖：

- 流水列表；
- 流水详情；
- SKU 筛选；
- 仓库筛选；
- 日期筛选；
- 来源追踪；
- warehouse scope；
- 权限校验；
- Trace Context；
- 成本与金额字段权限隐藏；
- Prisma where 条件映射；
- Prisma row mapping。

最终验证以本次提交执行结果为准。

## 8. 已知限制

- 本批仅提供库存流水查询，不提供库存流水写入能力；
- 来源追踪仅返回基础来源路径，不新增来源详情聚合 DTO；
- Trace 使用请求链路 `request_trace_id` 贯通，不新增库存流水 trace 字段；
- 库存流水仍以 `inventory_transactions` 为唯一事实来源。
