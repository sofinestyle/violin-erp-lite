# Task 8-C2 Inventory Query Implementation

项目：Violin ERP Lite  
阶段：Phase 8 Application Development  
任务：8-C2 Batch 1 Inventory Query Development  
状态：Completed / Pending Approval  
创建日期：2026-07-26  
文档类型：Implementation Record  

---

## 1. 实现范围

本次实现 Module 3 Inventory Management 第一批库存查询能力，覆盖：

1. 当前库存查询；
2. SKU 库存汇总；
3. 仓库库存查询；
4. 库存详情；
5. 可用库存公式校验；
6. warehouse scope 过滤；
7. 权限校验；
8. Trace Context 传递。

本次只实现只读查询能力，不实现库存流水详情、不实现出库、不实现库存调整、不修改库存余额。

---

## 2. 修改文件

新增：

1. `packages/api/src/inventory-query/inventory-query.ts`；
2. `packages/database/src/inventory-query/prisma-inventory-query-repository.ts`；
3. `packages/api/tests/inventory-query.test.ts`；
4. `packages/database/tests/inventory-query-repository.test.ts`；
5. `docs/phases/phase-08/TASK_8_C2_INVENTORY_QUERY_IMPLEMENTATION.md`。

修改：

1. `packages/api/src/index.ts`；
2. `packages/database/src/index.ts`；
3. `apps/admin/app/api/v1/[...segments]/route.ts`。

---

## 3. API 使用

复用 API Master Specification v1.6 中已冻结的 `INV-*`：

| API | 路径 | 实现情况 |
| --- | --- | --- |
| `INV-001` | `GET /api/v1/inventories/summary` | 已实现库存汇总；携带 `skuId` 时返回 SKU 库存汇总 |
| `INV-002` | `GET /api/v1/inventories` | 已实现库存列表、分页和筛选 |
| `INV-003` | `GET /api/v1/inventories/{id}` | 已实现库存详情 |
| `INV-004` | `GET /api/v1/inventories/by-warehouse` | 已实现仓库库存汇总；携带 `warehouseId` 时返回指定仓库汇总 |
| `INV-005` | `GET /api/v1/inventories/manufacturer-warehouses` | 已实现厂家仓库存筛选 |

未新增 API Path，未修改 DTO，未修改 Response 包装，未新增 Error Code。

---

## 4. Database 对象

只读复用：

1. `inventories`；
2. `skus`；
3. `warehouses`。

库存详情中提供最近库存流水入口路径，但本次不读取或实现 `inventory_transactions` 详情。

未新增表、字段、Enum、Migration 或 Prisma Schema 修改。

---

## 5. Permission

复用既有权限：

1. `inventory.stock.read`；
2. `master.sku.read`；
3. `master.warehouse.read`；
4. warehouse scope。

库存查询会将当前用户授权仓库范围传递到 Repository。无 `all` 数据范围时，仅允许查询 `warehouseScopes` 中授权仓库的库存。

未新增 Permission Code。

---

## 6. 实现说明

### API Layer

新增 `InventoryQueryService`：

1. 解析 `page`、`pageSize`、`skuId`、`warehouseId`、`warehouseType`、`status`；
2. 校验 UUID 和分页范围；
3. 校验 `inventory.stock.read`、`master.sku.read`、`master.warehouse.read`；
4. 解析 warehouse scope；
5. 传递 `requestTraceId` 到 Repository；
6. 校验 `availableQuantity = onHandQuantity - reservedQuantity - pendingQuantity`；
7. 派生 `inventoryStatus`；
8. 返回最近流水查询入口。

### Database Layer

新增 `PrismaInventoryQueryRepository`：

1. 只读查询 `inventories`；
2. include `skus` 与 `warehouses`；
3. 根据 warehouse scope 添加 `warehouse_id in (...)` 过滤；
4. 支持 SKU、仓库、仓库类型筛选；
5. 基于当前库存实时聚合 SKU 汇总和仓库汇总；
6. 不创建任何库存汇总表。

### Route

Admin API Route 对 `INV-001` 至 `INV-005` 优先使用 `InventoryQueryService`，其他库存工作流接口仍继续走既有 `InventoryWorkflowService`。

---

## 7. 测试结果

已新增测试覆盖：

1. 库存列表查询；
2. SKU 库存汇总；
3. 仓库库存查询；
4. `available_quantity` 公式校验；
5. warehouse scope 过滤；
6. 权限校验；
7. Trace Context 传递；
8. Repository 行映射与 Prisma where 条件。

已执行：

1. `pnpm --filter @violin-erp/api test -- inventory-query.test.ts`：通过；
2. `pnpm --filter @violin-erp/api typecheck`：通过；
3. `pnpm --filter @violin-erp/database typecheck`：通过；
4. `pnpm --filter @violin-erp/admin exec tsc --noEmit`：通过。

最终以本任务完成时 `pnpm check` 结果为准。

---

## 8. 已知限制

1. 本次不实现出库；
2. 本次不实现库存调整；
3. 本次不实现库存流水详情；
4. 本次不新增库存汇总表；
5. 本次不新增独立库存冻结能力；
6. 本次不接入外部缓存；
7. 本次不修改业务状态；
8. 本次不直接修改库存余额。

---

## 9. Change Impact

| 项目 | 结果 |
| --- | --- |
| Database Schema | Not Changed |
| Migration | Not Changed |
| API Spec | Not Changed |
| Permission Spec | Not Changed |
| Permission Code | Not Changed |
| Business Rules | Not Changed |

结论：

8-C2 Inventory Query Development 已按批准范围完成，可以进入 Module 3 下一批 Inventory Transaction Development。
