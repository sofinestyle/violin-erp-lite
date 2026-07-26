---
document_name: Task 8-B4-B Batch 2 Production Order Implementation
project: Violin ERP Lite
version: 1.0
status: Completed / Pending Review
owner: Project Manager
created_date: 2026-07-26
updated_date: 2026-07-26
related_phase: Phase 8
---

# Task 8-B4-B Batch 2：Production Order Development Implementation

## 1. 实现范围

本次实现 Module 2 第二批 Production Order 生产任务基础能力，范围包括：

1. 生产任务列表、详情、筛选和分页；
2. 生产任务创建；
3. 生产明细创建；
4. 草稿或已驳回生产任务编辑；
5. 生产任务状态流转；
6. 生产进度记录；
7. 分批完工记录与确认；
8. 生产任务附件能力复用；
9. 权限、Audit、幂等入口和状态校验。

本次继续复用既有 Workflow API 框架，不新增 API Path，不新增 DTO 字段，不修改 Database Schema，不创建 Migration，不新增 Permission Code。

## 2. 修改文件

1. `packages/database/src/workflow/prisma-workflow-repository.ts`
2. `packages/database/tests/workflow-repository.test.ts`
3. `packages/api/tests/workflow.test.ts`
4. `packages/api/tests/attachment-domain.test.ts`
5. `docs/phases/phase-08/TASK_8_B4_PRODUCTION_ORDER_IMPLEMENTATION.md`

## 3. API使用

复用 API Master Specification 既有生产接口：

| 能力 | API |
| --- | --- |
| 生产任务列表 | `PRO-001` |
| 生产任务详情 | `PRO-002` |
| 创建生产任务 | `PRO-003` |
| 编辑生产任务 | `PRO-004` |
| 提交生产任务 | `PRO-005` |
| 撤回生产任务 | `PRO-006` |
| 审核通过 | `PRO-007` |
| 审核驳回 | `PRO-008` |
| 反审核 | `PRO-009` |
| 开始生产 | `PRO-010` |
| 取消、作废 | `PRO-011`—`PRO-012` |
| 进度与关联查询 | `PRO-013`—`PRO-017` |
| 生产进度记录 | `PRO-018`—`PRO-020` |
| 分批完工查询 | `PRO-021`—`PRO-022` |
| 生产付款 | `PRO-023`—`PRO-025` |
| 分批完工创建与状态动作 | `PRO-026`—`PRO-029` |

未新增 API Path、DTO 字段、Response 字段、Pagination 字段或 Error Code。

## 4. Database对象

本次复用既有数据库对象：

1. `production_orders`；
2. `production_order_items`；
3. `production_progress_records`；
4. `production_completion_records`；
5. `production_completion_record_items`；
6. `production_payments`；
7. `manufacturers`；
8. `skus`；
9. `warehouses`；
10. `document_status_histories`；
11. `audit_logs`；
12. `attachments`；
13. `attachment_links`。

未新增表、字段、索引、约束、Enum 或 Migration。

## 5. Permission使用

复用既有 Permission Code：

1. `production.order.read`；
2. `production.order.create`；
3. `production.order.update`；
4. `production.order.submit`；
5. `production.order.withdraw`；
6. `production.order.approve`；
7. `production.order.reject`；
8. `production.order.unapprove`；
9. `production.order.start`；
10. `production.order.cancel`；
11. `production.order.void`；
12. `production.order.export`；
13. `production.progress.read`；
14. `production.progress.create`；
15. `production.completion.read`；
16. `production.completion.create`；
17. `production.completion.confirm`；
18. `production.completion.revoke`；
19. `production.completion.void`；
20. `master.manufacturer.read`；
21. `master.sku.read`；
22. `field.amount.read`；
23. `field.cost.read`；
24. `attachment.file.*`。

未新增 Permission Code。

## 6. 实现说明

### 6.1 查询

生产任务查询继续通过 Workflow 通用列表与详情能力实现，支持分页、状态、审核状态、生产厂家和关键词筛选。

列表与详情包含生产任务主表和生产明细，返回生产任务编号、生产厂家快照、SKU 明细、数量、状态、计划日期、创建人和版本号等字段。

### 6.2 创建

创建生产任务时：

1. 校验不得提交 `purchaseOrderId`；
2. 校验生产厂家存在且启用；
3. 校验 SKU 存在且启用；
4. 校验计划数量大于 0；
5. 校验加工单价和金额合法；
6. 校验计划开始日不早于单据日期；
7. 校验预计完成日不早于计划开始日；
8. 服务端生成生产任务编号；
9. 创建 `production_orders` 与 `production_order_items`；
10. 初始状态为 `draft` / `not_submitted`；
11. 不修改库存。

### 6.3 编辑

生产任务仅允许在 `draft` 或 `rejected` 状态编辑。

编辑支持完整替换生产明细，服务端重新计算：

1. 总计划数量；
2. 加工金额小计；
3. 总金额；
4. 未付金额。

如果生产明细已有完工、验收、合格、入库或发货等累计事实，不允许整体替换明细。如果订单已有付款，编辑后订单总金额不得低于已付款金额。

### 6.4 状态流转

支持：

```text
draft
  ↓ submit
pending_approval
  ↓ approve / reject / withdraw
approved / rejected / draft
  ↓ start
in_production
```

状态动作执行：

1. 状态校验；
2. `versionNo` 校验；
3. 职责分离校验；
4. 下游验收 / 入库阻塞校验；
5. `document_status_histories` 记录；
6. `audit_logs` 记录。

### 6.5 生产进度

生产进度写入 `production_progress_records`。

本次实现校验：

1. 仅 `approved`、`in_production`、`partially_completed` 状态允许登记进度；
2. `progressStage` 必须属于正式生产进度状态；
3. `progressPercentage` 必须在 0 到 100 之间；
4. `completedQuantity` 不得小于前次进度记录且不得超过计划总量；
5. `estimatedCompletionDate` 不得早于 `progressDate`。

生产进度不替代完工记录、质量验收、入库或库存流水。

### 6.6 分批完工

分批完工写入 `production_completion_records` 与 `production_completion_record_items`。

本次实现校验：

1. 来源生产任务必须处于允许完工状态；
2. `productionOrderVersionNo` 必须匹配；
3. 目标仓库存在且启用；
4. 每行只引用所属生产任务明细；
5. 同一完工记录不得重复引用同一生产明细；
6. 完工数量必须大于 0；
7. 累计完工数量不得超过计划数量。

完工确认只更新生产明细累计完工量和生产任务执行状态快照，不创建验收单、不创建入库单、不修改库存余额、不追加库存流水。

### 6.7 附件

生产资料继续复用 Attachment Framework。

对象类型使用已批准的：

`production_order`

本次不新增 `AttachmentObjectType`，不新增附件分类，不修改 Attachment Framework。

## 7. 测试结果

已增加或更新测试覆盖：

1. 创建生产任务；
2. 生产明细校验；
3. 草稿生产任务编辑；
4. 提交生产任务；
5. 开始生产；
6. 生产进度记录；
7. 分批完工创建；
8. 分批完工确认；
9. 权限校验；
10. Audit 记录；
11. 幂等入口要求；
12. 附件对象类型复用。

最终验证以本任务提交前 `pnpm check` 与 `git diff --check` 为准。

## 8. 已知限制

1. 本次不实现生产来源质量验收和生产入库闭环；
2. 本次不实现生产异常暂停、恢复或终止专项流程；
3. 本次不实现复杂厂家协同或外部系统同步；
4. 本次不修改库存余额；
5. Workflow 写操作当前沿用既有 API route 幂等键入口校验，未新增新的 API Contract 或持久幂等表结构。
