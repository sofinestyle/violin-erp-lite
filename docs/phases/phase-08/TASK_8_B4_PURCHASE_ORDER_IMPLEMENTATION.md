---
document_name: Task 8-B4-B Purchase Order Implementation
project: Violin ERP Lite
version: 1.0
status: Completed / Pending Review
owner: Project Manager
created_date: 2026-07-26
updated_date: 2026-07-26
related_phase: Phase 8
---

# Task 8-B4-B：Procurement Development Implementation - Purchase Order

## 1. 实现范围

本次实现 Module 2 第一批 Purchase Order 采购订单基础能力，范围包括：

1. 采购订单列表、详情、筛选和分页；
2. 采购订单创建；
3. 采购明细创建；
4. 草稿采购订单编辑；
5. 采购订单状态流转；
6. 采购付款辅助记录；
7. 采购订单附件能力复用；
8. 权限、Audit、幂等入口和状态校验。

本次继续复用既有 Workflow API 框架，不新增 API Path，不新增 DTO 字段，不修改 Database Schema，不创建 Migration，不新增 Permission Code。

## 2. 修改文件

1. `packages/database/src/workflow/prisma-workflow-repository.ts`
2. `packages/api/tests/workflow.test.ts`
3. `packages/database/tests/workflow-repository.test.ts`
4. `docs/phases/phase-08/TASK_8_B4_PURCHASE_ORDER_IMPLEMENTATION.md`

## 3. API使用

复用 API Master Specification 既有采购接口：

| 能力 | API |
| --- | --- |
| 采购订单列表 | `PUR-001` |
| 采购订单详情 | `PUR-002` |
| 创建采购订单 | `PUR-003` |
| 编辑采购订单 | `PUR-004` |
| 提交采购订单 | `PUR-005` |
| 撤回采购订单 | `PUR-006` |
| 审核通过 | `PUR-007` |
| 审核驳回 | `PUR-008` |
| 反审核 | `PUR-009` |
| 取消 | `PUR-010` |
| 作废 | `PUR-011` |
| 采购执行进度 | `PUR-012` |
| 关联验收查询 | `PUR-013` |
| 关联入库查询 | `PUR-014` |
| 状态时间线 | `PUR-015` |
| 导出 | `PUR-016` |
| 采购付款列表、详情、创建 | `PUR-017`—`PUR-019` |

未新增 API Path、DTO 字段、Response 字段、Pagination 字段或 Error Code。

## 4. Database对象

本次复用既有数据库对象：

1. `purchase_orders`；
2. `purchase_order_items`；
3. `purchase_payments`；
4. `suppliers`；
5. `skus`；
6. `document_status_histories`；
7. `audit_logs`；
8. `attachments`；
9. `attachment_links`。

未新增表、字段、索引、约束、Enum 或 Migration。

## 5. Permission使用

复用既有 Permission Code：

1. `purchase.order.read`；
2. `purchase.order.create`；
3. `purchase.order.update`；
4. `purchase.order.submit`；
5. `purchase.order.withdraw`；
6. `purchase.order.approve`；
7. `purchase.order.reject`；
8. `purchase.order.unapprove`；
9. `purchase.order.cancel`；
10. `purchase.order.void`；
11. `purchase.order.export`；
12. `purchase.payment.read`；
13. `purchase.payment.create`；
14. `master.supplier.read`；
15. `master.sku.read`；
16. `field.amount.read`；
17. `field.cost.read`；
18. `attachment.file.*`。

未新增 Permission Code。

## 6. 实现说明

### 6.1 查询

采购订单查询继续通过 Workflow 通用列表与详情能力实现，支持分页、状态、审核状态、供应商和关键词筛选。

列表与详情包含采购订单主表和采购明细，返回采购单号、供应商快照、状态、SKU 明细、数量、金额、交期、创建人和版本号等字段。

### 6.2 创建

创建采购订单时：

1. 校验供应商存在且启用；
2. 校验 SKU 存在且启用；
3. 校验采购数量大于 0；
4. 校验单价、税率和金额合法；
5. 校验预计交付日不早于单据日期；
6. 服务端生成采购单号；
7. 创建 `purchase_orders` 与 `purchase_order_items`；
8. 初始状态为 `draft` / `not_submitted`；
9. 不修改库存。

### 6.3 编辑

采购订单仅允许在 `draft` 或 `rejected` 状态编辑。

编辑支持完整替换采购明细，服务端重新计算：

1. 总数量；
2. 小计金额；
3. 税额；
4. 总金额；
5. 未付金额。

如果订单已有付款，编辑后订单总金额不得低于已付款金额。

### 6.4 状态流转

支持：

```text
draft
  ↓ submit
pending_approval
  ↓ approve / reject / withdraw
approved / rejected / draft
```

同时支持反审核、取消和作废的既有边界。

状态动作执行：

1. 状态校验；
2. `versionNo` 校验；
3. 职责分离校验；
4. 下游验收 / 入库阻塞校验；
5. `document_status_histories` 记录；
6. `audit_logs` 记录。

### 6.5 附件

采购合同和采购资料继续复用 Attachment Framework。

对象类型使用已批准的：

`purchase_order`

本次不新增 `AttachmentObjectType`，不新增附件分类，不修改 Attachment Framework。

### 6.6 付款辅助记录

采购付款辅助记录复用 `purchase_payments`。

本次实现边界：

1. 仅已审核采购订单允许登记付款；
2. 付款金额必须大于 0；
3. 付款金额不得超过未付金额；
4. 付款记录不改变采购生命周期状态；
5. 付款记录不替代财务系统。

## 7. 测试结果

已增加或更新测试覆盖：

1. 创建采购订单；
2. 采购订单明细校验；
3. 草稿采购订单编辑；
4. 提交采购订单；
5. 审核职责分离；
6. 付款前置状态校验；
7. 权限校验；
8. Audit 记录；
9. 幂等入口要求；
10. 附件对象类型复用。

最终验证以本任务提交前 `pnpm check` 与 `git diff --check` 为准。

## 8. 已知限制

1. 本次不实现采购退货；
2. 本次不实现采购来源质量验收和采购入库闭环；
3. 本次不新增采购需求单；
4. 本次不实现财务系统；
5. 本次不修改库存余额；
6. Workflow 写操作当前沿用既有 API route 幂等键入口校验，未新增新的 API Contract 或持久幂等表结构。
