---
document_name: Task 8-D2-A Cross-border Inventory & Shipment Implementation
project: Violin ERP Lite
phase: Phase 8 Application Development
task: 8-D2-A Cross-border Inventory & Shipment Development
version: 1.0
status: Completed / Pending Approval
owner: Codex
created_date: 2026-07-26
updated_date: 2026-07-26
related_documents:
  - docs/phases/phase-08/TASK_8_D1_CROSS_BORDER_IMPLEMENTATION_DESIGN.md
  - docs/phases/phase-08/TASK_8_D_CROSS_BORDER_IMPACT_REVIEW.md
  - docs/03-data/DATABASE_SPEC.md
  - docs/05-api/API_SPEC.md
  - docs/02-product/ROLE_PERMISSION_SPEC.md
  - docs/01-business/BUSINESS_RULES.md
---

# 1. 实现范围

本任务完成跨境库存与发货核心闭环的最小可用实现。

实现链路：

```text
国内库存
↓
跨境发货
↓
在途库存
↓
海外库存导入
↓
海外仓库存
```

本任务覆盖：

1. Cross-border Shipment；
2. Overseas Inventory Import；
3. 跨境发货确认库存事务；
4. 海外库存导入执行库存事务；
5. `inventory_transactions` 记录；
6. `document_status_histories` 记录；
7. Audit；
8. Trace；
9. Permission；
10. Idempotency-Key 前置要求。

未包含：

1. 外部平台 API 同步；
2. 独立平台订单生命周期；
3. 独立海外库存事实表；
4. 补货计划持久化；
5. 报关、清关、税费、物流费用和财务核算。

# 2. 修改文件

| 文件 | 说明 |
| --- | --- |
| `packages/api/src/inventory-workflow/inventory-workflow.ts` | 接入正式 `IMP-*` 运行时路由映射与导入基础 DTO 校验 |
| `packages/api/tests/inventory-workflow.test.ts` | 补充 `IMP-*` API 覆盖与路由映射测试 |
| `packages/database/src/inventory-workflow/prisma-inventory-workflow-repository.ts` | 实现跨境发货仓库校验、确认发货库存事务、Import Task 创建、校验、执行、重试、取消与查询 |
| `packages/database/tests/inventory-workflow-repository.test.ts` | 补充跨境发货、确认发货、海外导入执行库存事务测试 |
| `docs/phases/phase-08/TASK_8_D2_A_CROSS_BORDER_INVENTORY_SHIPMENT_IMPLEMENTATION.md` | 本实施记录 |

# 3. API 使用

复用既有 API SSOT。

## Cross-border Shipment

使用：

- `CBR-001` 跨境发货列表；
- `CBR-002` 跨境发货详情；
- `CBR-003` 创建跨境发货单；
- `CBR-004` 修改跨境发货单；
- `CBR-005` 提交；
- `CBR-006` 撤回；
- `CBR-007` 审核；
- `CBR-008` 驳回；
- `CBR-009` 反审核；
- `CBR-010` 取消；
- `CBR-011` 作废；
- `CBR-012` 确认发货；
- `CBR-013` 状态历史；
- `CBR-014` 库存流水；
- `CBR-015` 导出；
- `CBR-016` 海外仓库存汇总；
- `CBR-017` 海外仓库存明细；
- `CBR-018` 至 `CBR-022` 海外导入结果、匹配与来源追踪。

## Overseas Inventory Import

使用：

- `IMP-001` 创建导入任务并上传 Excel；
- `IMP-002` 导入任务列表；
- `IMP-003` 导入任务详情；
- `IMP-004` 导入任务状态；
- `IMP-005` 取消导入任务；
- `IMP-006` 获取导入模板；
- `IMP-007` 查询模板版本；
- `IMP-008` 校验模板兼容性；
- `IMP-009` 启动导入校验；
- `IMP-010` 查询校验结果；
- `IMP-011` 执行导入；
- `IMP-012` 重试失败明细；
- `IMP-013` 查询导入结果；
- `IMP-014` 导入历史查询；
- `IMP-015` 导出导入历史 / 结果。

API Change：Not Required

未新增 API Path，未修改 DTO，未修改 Response 结构，未新增 Error Code。

# 4. Database 对象

复用：

## Cross-border

- `cross_border_shipments`
- `cross_border_shipment_items`

## Inventory

- `inventories`
- `inventory_transactions`

## Warehouse

- `warehouses`

## Import

- `import_tasks`
- `import_task_items`
- `shipment_import_matches`

## Master

- `skus`
- `platforms`
- `stores`

## Audit / Workflow

- `audit_logs`
- `document_status_histories`

Database Change：Not Required

未修改：

- Database SSOT；
- Prisma Schema；
- Migration；
- 数据库 Enum；
- 数据库 Check。

# 5. 库存事务设计

## Cross-border Dispatch

确认发货是 Cross-border Shipment 的唯一库存变化边界。

事务语义：

```text
BEGIN
1. 校验跨境发货状态为 approved
2. 校验 versionNo
3. 复核来源仓、在途仓、海外仓类型
4. 校验来源仓 available_quantity / on_hand_quantity
5. 扣减来源仓 inventories
6. 增加在途仓 inventories
7. 追加 inventory_transactions
8. 更新 cross_border_shipments.status = shipped
9. 更新 cross_border_shipments.shipment_status = shipped
10. 写 document_status_histories
11. 写 audit_logs
12. 绑定 request_trace_id
COMMIT
```

规则：

1. 创建、提交、审核阶段不修改库存；
2. 确认发货不得直接增加海外仓库存；
3. 来源仓扣减与在途仓增加必须同成同败；
4. 不允许库存变负；
5. 重复确认已发货单据返回已有结果，不重复写库存流水。

## Overseas Inventory Import Execute

执行导入是 Overseas Inventory Import 的库存变化边界。

事务语义：

```text
BEGIN
1. 锁定 import_tasks
2. 校验任务状态
3. 读取已校验成功行
4. 读取 shipment_import_matches
5. 扣减在途仓 inventories
6. 增加海外仓 inventories
7. 追加 inventory_transactions
8. 更新 import_task_items.execution_status
9. 更新 import_tasks.status
10. 更新 shipment_import_matches
11. 更新 cross_border_shipment_items.received_quantity / difference_quantity
12. 写 audit_logs
13. 绑定 request_trace_id
COMMIT
```

规则：

1. 未匹配数据不得直接入海外仓；
2. 校验失败行不得执行；
3. 成功行不得重复执行；
4. 重试只处理失败行；
5. 不创建海外库存平行模型；
6. 不删除已形成的库存流水。

# 6. Permission

复用既有权限：

## Cross-border

- `cross-border.shipment.read`
- `cross-border.shipment.create`
- `cross-border.shipment.update`
- `cross-border.shipment.submit`
- `cross-border.shipment.withdraw`
- `cross-border.shipment.approve`
- `cross-border.shipment.reject`
- `cross-border.shipment.unapprove`
- `cross-border.shipment.cancel`
- `cross-border.shipment.void`
- `cross-border.shipment.dispatch`
- `cross-border.shipment.export`
- `cross-border.overseas-inventory.read`
- `cross-border.import-result.read`
- `cross-border.source-trace.read`

## Import

- `import.task.read`
- `import.task.create`
- `import.task.cancel`
- `import.task.validate`
- `import.task.execute`
- `import.template.read`
- `import.template.validate`
- `import.history.export`

## Inventory / Master / Field

- `inventory.stock.read`
- `inventory.transaction.read`
- `master.platform.*`
- `master.store.*`
- warehouse scope
- store scope
- `field.import-raw-data.read`
- `field.cost.read`
- `field.amount.read`

Permission Change：Not Required

未新增 Permission Code。

# 7. 测试结果

已新增或更新测试覆盖：

## Cross-border Shipment

1. 创建发货单；
2. 仓库类型校验；
3. 创建阶段不修改库存；
4. 确认发货；
5. 来源仓库存减少；
6. 在途仓库存增加；
7. `inventory_transactions` 生成；
8. 发货状态更新为 `shipped`；
9. API 权限映射；
10. Audit 记录。

## Overseas Inventory Import

1. `IMP-*` API 映射；
2. Import Task 创建；
3. 文件 checksum 重复检测；
4. 导入任务状态；
5. 导入行校验；
6. 来源匹配；
7. 执行导入；
8. 在途仓库存减少；
9. 海外仓库存增加；
10. `inventory_transactions` 生成；
11. `shipment_import_matches` 更新；
12. `import_task_items` 执行结果更新；
13. 重试失败行基础能力。

执行过的检查：

- `pnpm --filter @violin-erp/api test -- --run packages/api/tests/inventory-workflow.test.ts`
- `pnpm --filter @violin-erp/database test -- --run packages/database/tests/inventory-workflow-repository.test.ts`
- `pnpm --filter @violin-erp/api typecheck`
- `pnpm --filter @violin-erp/database typecheck`

# 8. 已知限制

1. 本任务不实现外部平台 API 同步；
2. 本任务不实现平台订单生命周期；
3. 本任务不实现正式补货计划；
4. 本任务不新增海外库存事实表；
5. Import Excel 解析仍依赖上层上传/解析后提交结构化行数据；
6. 大文件导入后续可继续接入 Job Runtime 执行；
7. 平台 / 店铺视图与补货建议将在后续批次实现；
8. 真实端到端数据库集成验证留待 Phase 9 系统集成测试进一步覆盖。

# 9. 结论

Task 8-D2-A Cross-border Inventory & Shipment Development 已完成实现设计范围内的核心运行能力。

Change Impact：

| 类型 | 判断 |
| --- | --- |
| Database Change | Not Required |
| API Change | Not Required |
| Permission Change | Not Required |
| Migration Change | Not Required |

实现结论：

1. Cross-border Shipment 已支持核心查询、创建、状态动作和确认发货库存事务；
2. Overseas Inventory Import 已支持 Import Task 创建、校验、来源匹配、执行导入和基础重试；
3. 库存变化继续以 `inventories` 和 `inventory_transactions` 为唯一事实来源；
4. 未建立海外库存平行模型；
5. 未修改 Frozen Database / API / Permission 文档。
