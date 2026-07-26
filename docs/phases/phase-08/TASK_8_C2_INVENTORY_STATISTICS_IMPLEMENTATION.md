---
document_name: Task 8-C2 Batch 5 Inventory Statistics Implementation
project: Violin ERP Lite
phase: Phase 8 Application Development
task: 8-C2 Batch 5 Inventory Statistics Development
version: 1.0
status: Completed
owner: Codex
created_date: 2026-07-26
updated_date: 2026-07-26
related_documents:
  - docs/phases/phase-08/TASK_8_C1_INVENTORY_IMPLEMENTATION_DESIGN.md
  - docs/phases/phase-08/TASK_8_C2_INVENTORY_ADJUSTMENT_IMPLEMENTATION.md
  - docs/03-data/DATABASE_SPEC.md
  - docs/05-api/API_SPEC.md
  - docs/02-product/ROLE_PERMISSION_SPEC.md
---

# 1. 实现范围

本批次完成 Module 3 Inventory Management 的库存统计（Inventory Statistics）基础能力。

已实现：

- SKU 库存统计；
- 仓库库存统计；
- 库存状态统计；
- 库存 Dashboard 基础聚合；
- warehouse scope 过滤；
- 库存金额字段权限控制；
- Trace Context 继续透传至查询仓储访问范围。

不包含：

- 新增统计表；
- 新增统计快照表；
- 新增 API Path；
- 新增 DTO 字段治理文档；
- 新增 Permission Code；
- 引入 Cache、Job 或 Event 作为库存统计事实来源。

# 2. 修改文件

- `packages/api/src/inventory-query/inventory-query.ts`
- `packages/api/tests/inventory-query.test.ts`
- `packages/database/src/inventory-query/prisma-inventory-query-repository.ts`
- `packages/database/tests/inventory-query-repository.test.ts`
- `docs/phases/phase-08/TASK_8_C2_INVENTORY_STATISTICS_IMPLEMENTATION.md`

# 3. API 使用

本实现严格复用既有 `INV-*` 库存查询接口：

- `INV-001`：`GET /api/v1/inventories/summary`
- `INV-002`：`GET /api/v1/inventories`
- `INV-003`：`GET /api/v1/inventories/{id}`
- `INV-004`：`GET /api/v1/inventories/by-warehouse`
- `INV-005`：`GET /api/v1/inventories/manufacturer-warehouses`

本批次未新增 API Path，未修改 Error Code，未修改分页结构。

# 4. Database 对象

只读复用：

- `inventories`
- `inventory_transactions`
- `skus`
- `warehouses`

统计来源：

1. 库存数量、SKU 数量、仓库数量和状态统计来自 `inventories`；
2. SKU 与仓库展示信息来自正式主数据关系；
3. 库存金额在具备字段权限时使用库存流水中的最新成本辅助计算；
4. 不创建库存统计事实表、快照表或缓存事实表。

# 5. Permission

复用既有权限：

- `inventory.stock.read`
- `inventory.transaction.read`
- `master.sku.read`
- `master.warehouse.read`
- `field.amount.read`
- `field.cost.read`

权限规则：

1. 库存统计必须先应用 warehouse scope；
2. 无授权仓库不得参与数量、金额或状态聚合；
3. `inventoryAmount` 只有同时具备 `field.amount.read` 与 `field.cost.read` 时返回；
4. 未具备字段权限时不返回金额字段，避免通过统计推断敏感成本。

# 6. 统计设计

## SKU 库存统计

按 SKU 聚合授权范围内的 `inventories`：

- SKU；
- SKU 名称；
- 总库存；
- 可用库存；
- 占用库存；
- 待处理库存；
- 分仓库存。

## 仓库库存统计

按仓库聚合授权范围内的 `inventories`：

- 仓库；
- SKU 数量；
- 总库存；
- 可用库存；
- 待处理库存；
- 预留库存。

## 库存状态统计

状态实时派生：

- 正常库存：`availableQuantity > 0` 且无待处理数量；
- 零库存：`onHandQuantity = 0`；
- 待处理库存：`pendingQuantity > 0`；
- 不可用库存：不满足上述条件且可用库存不足。

## Dashboard 统计

Dashboard 汇总包含：

- 总 SKU 数量；
- 总库存数量；
- 授权仓库数量；
- 库存状态计数；
- 库存金额（字段权限允许时）。

# 7. 测试结果

新增和增强测试覆盖：

- SKU 库存汇总；
- 仓库库存汇总；
- 库存状态统计；
- Dashboard 统计；
- warehouse scope；
- 金额字段权限；
- Trace Context 传递。

验证命令：

- `pnpm check`
- `git diff --check`

# 8. 已知限制

- 本批次不建设复杂 BI；
- 本批次不落地统计快照；
- 库存金额基于现有库存流水成本辅助计算，正式财务估值口径如需扩展，应另行提交业务和 API/Database 变更；
- 前端 Dashboard 页面接入留待页面开发批次。

# 9. Change Impact

Database Change：Not Required

API Change：Not Required

Permission Change：Not Required

Frozen Document Change：Not Required
