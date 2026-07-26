---
document_name: Task 8-D2-B Cross-border Analytics & Operation View Implementation
project: Violin ERP Lite
phase: Phase 8 Application Development
task: 8-D2-B Cross-border Analytics & Operation View Development
version: 1.0
status: Completed / Pending Approval
owner: Codex
created_date: 2026-07-26
updated_date: 2026-07-26
related_documents:
  - docs/phases/phase-08/TASK_8_D1_CROSS_BORDER_IMPLEMENTATION_DESIGN.md
  - docs/phases/phase-08/TASK_8_D2_A_CROSS_BORDER_INVENTORY_SHIPMENT_IMPLEMENTATION.md
  - docs/03-data/DATABASE_SPEC.md
  - docs/05-api/API_SPEC.md
  - docs/02-product/ROLE_PERMISSION_SPEC.md
---

# 1. 实现范围

本任务完成跨境运营查询与分析的只读基础能力。

实现内容：

1. Platform / Store View；
2. Overseas Inventory Operation View；
3. Overseas Inventory Source Trace；
4. Replenishment Suggestion。

本任务不包含：

1. 平台订单对象；
2. 平台 API 同步；
3. 独立平台库存表；
4. 独立海外库存表；
5. 自动补货；
6. AI 预测；
7. 任何库存事实修改。

# 2. 修改文件

| 文件 | 说明 |
| --- | --- |
| `packages/database/src/inventory-workflow/prisma-inventory-workflow-repository.ts` | 增强 `overseas-inventory` 只读列表、汇总、补货建议和来源追踪 |
| `packages/database/tests/inventory-workflow-repository.test.ts` | 增加平台 / 店铺视图、来源追踪和补货建议测试 |
| `packages/api/tests/inventory-workflow.test.ts` | 补充 CBR-016、CBR-017、CBR-022 路由映射覆盖 |
| `docs/phases/phase-08/TASK_8_D2_B_CROSS_BORDER_ANALYTICS_IMPLEMENTATION.md` | 本实施记录 |

# 3. API 使用

复用既有 API SSOT：

| API | 用途 | 说明 |
| --- | --- | --- |
| `CBR-016` | 海外仓库存汇总 / 补货建议 | `view=replenishment` 时返回只读补货建议 |
| `CBR-017` | 海外仓库存明细 | 支持平台、店铺、SKU、海外仓和导入批次派生筛选 |
| `CBR-022` | 海外库存来源追踪 | 返回 Inventory → Import Task → Shipment Import Match → Cross-border Shipment → Inventory Transaction 链路 |
| `IMP-*` | 导入任务事实来源 | 仅用于查询导入任务、导入明细和批次来源 |
| `INV-*` | 库存事实来源 | 仅使用 `inventories` 与 `inventory_transactions` 查询 |

API Change：Not Required

未新增：

1. API Path；
2. DTO 字段；
3. Response 基础结构；
4. Error Code。

# 4. Database 对象

只读复用：

1. `ecommerce_platforms`；
2. `stores`；
3. `warehouses`；
4. `inventories`；
5. `inventory_transactions`；
6. `cross_border_shipments`；
7. `cross_border_shipment_items`；
8. `import_tasks`；
9. `import_task_items`；
10. `shipment_import_matches`；
11. `skus`。

Database Change：Not Required

未修改：

1. `DATABASE_SPEC.md`；
2. Prisma Schema；
3. Migration；
4. 数据库 Check；
5. 数据库 Enum。

# 5. Permission

复用既有权限：

1. `cross-border.overseas-inventory.read`；
2. `cross-border.import-result.read`；
3. `cross-border.source-trace.read`；
4. `import.task.read`；
5. `inventory.stock.read`；
6. `inventory.transaction.read`；
7. `master.platform.read`；
8. `master.store.read`；
9. warehouse scope。

Permission Change：Not Required

未新增 Permission Code。

# 6. 实现说明

## 6.1 Platform / Store View

`CBR-017` 继续使用 `/api/v1/overseas-inventories`。

运行时基于：

1. `import_tasks.store_id`；
2. `stores.platform_id`；
3. `inventory_transactions.source_document_type = overseas_import`；
4. `inventories.sku_id + inventories.warehouse_id`；

派生平台、店铺、SKU 和海外仓维度。

该视图不创建：

1. 平台库存表；
2. 平台订单表；
3. 海外库存快照表。

## 6.2 Overseas Inventory Operation View

海外库存仍以 `inventories` 为当前余额事实来源，以 `inventory_transactions` 为变更事实来源。

支持：

1. 海外仓筛选；
2. SKU 筛选；
3. 导入批次筛选；
4. 平台 / 店铺筛选；
5. warehouse scope 过滤。

导入批次来自 `import_tasks.task_no` 或 `importTaskId`。

## 6.3 Source Trace

`CBR-022` 返回来源链：

```text
Overseas Inventory
↓
Inventory Transaction
↓
Import Task / Import Task Item
↓
Shipment Import Match
↓
Cross-border Shipment / Shipment Item
```

该链路只做查询，不反写来源对象。

## 6.4 Replenishment Suggestion

补货建议使用 `CBR-016` 的只读派生模式：

```text
GET /api/v1/overseas-inventories/summary?view=replenishment
```

计算输入：

1. 海外仓当前库存；
2. 海外仓可用库存；
3. SKU；
4. 在途库存；
5. 平台 / 店铺派生维度。

输出：

1. `zero_stock`；
2. `low_stock`；
3. `normal`（仅 `includeNormal=true` 时展示）。

补货建议禁止：

1. 创建采购订单；
2. 创建生产任务；
3. 创建跨境发货；
4. 修改库存；
5. 写库存流水。

# 7. 测试结果

新增测试覆盖：

1. 平台筛选；
2. 店铺筛选；
3. SKU 筛选；
4. warehouse scope；
5. CBR 权限路由映射；
6. 海外库存查询；
7. 来源追踪；
8. 导入批次关联；
9. 低库存计算；
10. 零库存计算；
11. 只读限制。

验证命令：

```bash
pnpm check
pnpm status:check
git diff --check
```

# 8. 已知限制

1. 补货建议仅为规则计算，不持久化、不审批、不自动执行；
2. 平台与店铺维度依赖导入任务或来源库存流水可追溯；
3. 未接入 Amazon、Temu 或海外仓 API；
4. 未建立平台订单生命周期；
5. 未引入 AI 预测模型。

