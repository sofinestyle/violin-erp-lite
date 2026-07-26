---
document_name: Task 8-B4-C Inspection Quality Acceptance Implementation
project: Violin ERP Lite
version: 1.0
status: Completed / Pending Review
owner: Project Manager
created_date: 2026-07-26
updated_date: 2026-07-26
related_phase: Phase 8
---

# Task 8-B4-C：Inspection Quality Acceptance Development

## 1. 实现范围

本次实现 Module 2 第三批 Inspection Quality Acceptance 质量验收基础能力，范围包括：

1. 验收单列表、详情、来源筛选和分页；
2. 采购来源验收创建；
3. 生产来源验收创建；
4. 验收明细创建；
5. 草稿验收单编辑；
6. 验收提交、确认、撤销和作废；
7. 验收确认后的入库资格事实；
8. 验收附件能力复用；
9. 权限、Audit、幂等入口和状态校验。

本次继续复用既有 Workflow API 框架，不新增 API Path，不新增 DTO 字段，不修改 Database Schema，不创建 Migration，不新增 Permission Code。

## 2. 修改文件

1. `packages/database/src/workflow/prisma-workflow-repository.ts`
2. `packages/database/tests/workflow-repository.test.ts`
3. `packages/api/tests/workflow.test.ts`
4. `docs/phases/phase-08/TASK_8_B4_INSPECTION_IMPLEMENTATION.md`

## 3. API使用

复用 API Master Specification 既有验收接口：

| 能力 | API |
| --- | --- |
| 验收单列表 | `INS-001` |
| 验收单详情 | `INS-002` |
| 创建验收单 | `INS-003` |
| 编辑验收单 | `INS-004` |
| 提交验收 | `INS-005` |
| 确认验收 | `INS-006` |
| 撤销验收 | `INS-007` |
| 作废验收 | `INS-008` |
| 状态历史 | `INS-009` |
| 导出验收 | `INS-010` |

未新增 API Path、DTO 字段、Response 字段、Pagination 字段或 Error Code。

## 4. Database对象

本次复用既有数据库对象：

1. `inspection_orders`；
2. `inspection_order_items`；
3. `purchase_orders`；
4. `purchase_order_items`；
5. `production_orders`；
6. `production_order_items`；
7. `warehouses`；
8. `document_status_histories`；
9. `audit_logs`；
10. `attachments`；
11. `attachment_links`。

未新增表、字段、索引、约束、Enum 或 Migration。

## 5. Permission使用

复用既有 Permission Code：

1. `inspection.order.read`；
2. `inspection.order.create`；
3. `inspection.order.update`；
4. `inspection.order.submit`；
5. `inspection.order.confirm`；
6. `inspection.order.revoke`；
7. `inspection.order.void`；
8. `inspection.order.export`；
9. `purchase.order.read`；
10. `production.order.read`；
11. `master.sku.read`；
12. `attachment.file.*`。

未新增 Permission Code。

## 6. 实现说明

### 6.1 查询

验收单查询继续通过 Workflow 通用列表与详情能力实现，支持分页、来源类型、来源单据、仓库、状态、验收日期和关键词筛选。

列表与详情包含验收单主表和验收明细，返回验收单号、来源类型、来源单据、SKU、数量、状态和验收结果等字段。

### 6.2 创建验收

创建验收单时：

1. `sourceType` 只允许 `purchase` 或 `production`；
2. 采购来源必须只提供 `purchaseOrderId`；
3. 生产来源必须只提供 `productionOrderId`；
4. 禁止一张验收单同时关联采购和生产；
5. 校验来源单据存在且状态合法；
6. 校验验收仓库存在且启用；
7. 校验来源明细归属和 SKU 匹配；
8. 校验验收数量不超过来源可验收数量；
9. 创建 `inspection_orders` 与 `inspection_order_items`；
10. 初始状态为 `draft`；
11. 不创建入库单，不修改库存。

### 6.3 验收明细

本次严格遵守 API Master Specification v1.6 与 Task 5.3 口径：

1. API 不接收 `pendingQuantity`；
2. 既有数据库字段 `pending_quantity` 由服务端固定保存为 `0`；
3. 每行必须满足 `inspectedQuantity = qualifiedQuantity + unqualifiedQuantity`；
4. 主表必须满足 `totalInspectedQuantity = totalQualifiedQuantity + totalUnqualifiedQuantity`。

如需启用待处理数量作为正式 API 输入，需要另行提交 API Change Request。

### 6.4 状态流转

支持：

```text
draft
  ↓ submit
pending_confirmation
  ↓ confirm
confirmed
  ↓ revoke
revoked
```

草稿或待确认状态支持作废：

```text
draft / pending_confirmation
  ↓ void
voided
```

状态动作执行：

1. 状态校验；
2. `versionNo` 校验；
3. 入库下游阻塞校验；
4. 来源累计验收数量更新或回滚；
5. `document_status_histories` 记录；
6. `audit_logs` 记录。

### 6.5 入库资格

验收确认后，只通过已确认验收单和合格数量形成后续入库资格。

验收确认禁止：

1. 创建入库单；
2. 修改 `inventories`；
3. 追加 `inventory_transactions`；
4. 直接改变采购或生产完成状态。

### 6.6 附件

验收图片和验收资料继续复用 Attachment Framework。

对象类型使用已批准的：

`inspection_order`

验收证据类别使用已批准的：

`inspection_evidence`

本次不新增 `AttachmentObjectType`，不新增附件分类，不修改 Attachment Framework。

## 7. 测试结果

已增加或更新测试覆盖：

1. 创建采购来源验收；
2. 创建生产来源验收；
3. 禁止双来源；
4. 数量平衡校验；
5. 提交验收；
6. 确认验收；
7. 撤销验收；
8. 权限校验；
9. Audit 记录；
10. 幂等入口要求；
11. 附件对象类型复用。

最终验证以本任务提交前 `pnpm check` 与 `git diff --check` 为准。

## 8. 已知限制

1. 本次不实现入库单创建与确认闭环；
2. 本次不实现验收图片上传页面；
3. 本次不实现独立质检角色；
4. 本次不修改库存余额；
5. 本次不启用 `pendingQuantity` 作为正式 API 输入。
