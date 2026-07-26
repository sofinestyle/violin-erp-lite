---
document_name: Task 8-C2 Batch 4 Inventory Adjustment Implementation
project: Violin ERP Lite
phase: Phase 8 Application Development
task: 8-C2 Batch 4 Inventory Adjustment Development
version: 1.0
status: Completed
owner: Codex
created_date: 2026-07-26
updated_date: 2026-07-26
related_documents:
  - docs/phases/phase-08/TASK_8_C1_INVENTORY_IMPLEMENTATION_DESIGN.md
  - docs/phases/phase-08/TASK_8_C2_OUTBOUND_IMPLEMENTATION.md
  - docs/03-data/DATABASE_SPEC.md
  - docs/05-api/API_SPEC.md
  - docs/02-product/ROLE_PERMISSION_SPEC.md
---

# 1. 实现范围

本批次完成 Module 3 Inventory Management 的库存调整（Inventory Adjustment）基础能力。

已实现：

- 库存调整单列表、详情、分页与状态筛选复用既有 INV-* 工作流查询能力；
- 库存调整单创建；
- 调整明细服务端读取调整前数量；
- 调整后数量服务端计算；
- 提交、撤回、审核、驳回、反审核、取消、执行等状态动作复用既有库存工作流动作；
- 执行调整时更新 `inventories`；
- 执行调整时写入 `inventory_transactions`；
- 执行调整时写入 `document_status_histories`；
- 执行调整时通过服务层写入 `audit_logs`；
- 执行调整防负库存；
- 重复执行防重；
- 事务失败整体回滚。

不包含：

- 新增数据库对象；
- 新增 API；
- 新增 Permission Code；
- 新增前端页面；
- 新增库存汇总表；
- 修改历史 Migration。

# 2. 修改文件

- `packages/database/src/inventory-workflow/prisma-inventory-workflow-repository.ts`
- `packages/database/tests/inventory-workflow-repository.test.ts`
- `packages/api/tests/inventory-workflow.test.ts`
- `docs/phases/phase-08/TASK_8_C2_INVENTORY_ADJUSTMENT_IMPLEMENTATION.md`

# 3. API 使用

本实现严格复用 API Master Specification v1.6 中既有 INV-* 库存调整接口。

主要使用：

- `INV-013`：库存调整单列表；
- `INV-014`：库存调整单详情；
- `INV-015`：创建库存调整单；
- `INV-016`：编辑库存调整单；
- `INV-017`：提交库存调整单；
- `INV-018`：撤回库存调整单；
- `INV-019`：审核库存调整单；
- `INV-020`：驳回库存调整单；
- `INV-021`：反审核库存调整单；
- `INV-022`：取消库存调整单；
- `INV-023`：作废库存调整单；
- `INV-024`：执行库存调整；
- `INV-025`：状态历史；
- `INV-026`：导出。

本批次未新增 API Path，未修改 DTO，未修改 Response 结构，未新增 Error Code。

# 4. Database 对象

复用既有数据库对象：

- `inventory_adjustments`
- `inventory_adjustment_items`
- `inventories`
- `inventory_transactions`
- `warehouses`
- `skus`
- `audit_logs`
- `document_status_histories`
- `attachments`
- `attachment_links`

本批次未修改 `DATABASE_SPEC.md`、Prisma Schema 或 Migration。

# 5. Inventory Transaction 设计

## 创建阶段

创建库存调整单时：

- 校验仓库存在且启用；
- 校验仓库数据范围；
- 校验 SKU 存在；
- 校验调整数量大于 0；
- 校验调整原因必填；
- 服务端读取 `inventories.on_hand_quantity` 作为调整前数量；
- 服务端计算调整后数量；
- 减少方向校验 `available_quantity` 足够；
- 不更新 `inventories`；
- 不写入 `inventory_transactions`。

## 执行阶段

执行库存调整时在同一事务中完成：

1. 校验调整单状态为 `approved`；
2. 校验版本号；
3. 读取调整明细；
4. 锁定并更新 `inventories`；
5. 减少方向校验 `available_quantity` 与 `on_hand_quantity` 足够；
6. 写入 `inventory_transactions`；
7. 更新调整单状态为 `completed`；
8. 写入 `document_status_histories`；
9. 通过服务层写入 Audit。

执行阶段任一步失败时，库存余额、流水与单据状态必须整体回滚。

# 6. Permission

复用既有权限：

- `inventory.adjustment.read`
- `inventory.adjustment.create`
- `inventory.adjustment.update`
- `inventory.adjustment.submit`
- `inventory.adjustment.withdraw`
- `inventory.adjustment.approve`
- `inventory.adjustment.reject`
- `inventory.adjustment.unapprove`
- `inventory.adjustment.cancel`
- `inventory.adjustment.void`
- `inventory.adjustment.execute`
- `inventory.stock.read`
- `inventory.transaction.read`
- `master.sku.read`
- `master.warehouse.read`
- `attachment.file.*`

本批次未新增 Permission Code。

# 7. 测试结果

新增和增强测试覆盖：

- 创建库存调整单；
- 调整前数量服务端读取；
- 调整后数量服务端计算；
- 提交；
- 审核；
- 执行调整库存变化；
- `inventory_transactions` 生成；
- 防负库存；
- 重复执行防重；
- 权限；
- Audit；
- 事务失败回滚。

验证命令：

- `pnpm check`
- `git diff --check`

# 8. 已知限制

- 本批次不开发库存调整页面；
- 本批次不新增库存调整附件运行时对象类型，继续复用既有 Attachment Framework；
- 本批次不支持通过库存调整绕过正式出入库流程；
- 历史 Excel 库存初始化仍需后续迁移方案单独处理。

# 9. Change Impact

Database Change：Not Required

API Change：Not Required

Permission Change：Not Required

Frozen Document Change：Not Required
