---
document_name: Task 8-B4-D Inbound Implementation
project: Violin ERP Lite
version: 1.0
status: Completed / Pending Review
owner: Project Manager
created_date: 2026-07-26
updated_date: 2026-07-26
related_phase: Phase 8
---

# Task 8-B4-D：Inbound Development

## 1. 实现范围

本次实现 Module 2 第四批 Inbound 入库基础能力，范围包括：

1. 入库单列表、详情、分页和既有筛选参数；
2. 采购来源入库单创建；
3. 生产来源入库单创建；
4. 入库明细创建；
5. 草稿或已驳回入库单基础编辑；
6. 入库单提交、撤回、审核、驳回、反审核、取消；
7. 确认入库库存事务；
8. 冲销入库反向库存事务；
9. 入库附件能力复用；
10. 权限、Audit、幂等入口和状态校验。

本次继续复用既有 Workflow API 框架，不新增 API Path，不新增 DTO 字段，不修改 Database Schema，不创建 Migration，不新增 Permission Code。

## 2. 修改文件

1. `packages/database/src/workflow/prisma-workflow-repository.ts`
2. `packages/database/tests/workflow-repository.test.ts`
3. `packages/api/tests/workflow.test.ts`
4. `packages/api/tests/attachment-domain.test.ts`
5. `docs/phases/phase-08/TASK_8_B4_INBOUND_IMPLEMENTATION.md`

## 3. API 使用

复用 API Master Specification v1.6 既有入库接口：

| 能力 | API |
| --- | --- |
| 入库单列表 | `INB-001` |
| 入库单详情 | `INB-002` |
| 创建采购入库单 | `INB-003` |
| 创建生产入库单 | `INB-004` |
| 修改入库单 | `INB-006` |
| 提交入库单 | `INB-007` |
| 撤回入库单 | `INB-008` |
| 审核通过 | `INB-009` |
| 审核驳回 | `INB-010` |
| 反审核 | `INB-011` |
| 取消 | `INB-012` |
| 确认入库 | `INB-013` |
| 冲销入库 | `INB-014` |
| 状态历史 | `INB-015` |
| 库存流水 | `INB-016` |
| 导出 | `INB-017` |
| 入库进度 | `INB-018` |

`INB-005` 创建其他批准入库单不属于本次 MVP 范围，继续不实现无来源入库。

未新增 API Path、DTO 字段、Response 字段、Pagination 字段或 Error Code。

## 4. Database 对象

本次复用既有数据库对象：

1. `inbound_orders`；
2. `inbound_order_items`；
3. `inspection_orders`；
4. `inspection_order_items`；
5. `purchase_orders`；
6. `purchase_order_items`；
7. `production_orders`；
8. `production_order_items`；
9. `inventories`；
10. `inventory_transactions`；
11. `warehouses`；
12. `document_status_histories`；
13. `audit_logs`；
14. `attachments`；
15. `attachment_links`。

未新增表、字段、索引、约束、Enum 或 Migration。

## 5. Permission 使用

复用既有 Permission Code：

1. `inbound.order.read`；
2. `inbound.order.create-purchase`；
3. `inbound.order.create-production`；
4. `inbound.order.update`；
5. `inbound.order.submit`；
6. `inbound.order.withdraw`；
7. `inbound.order.approve`；
8. `inbound.order.reject`；
9. `inbound.order.unapprove`；
10. `inbound.order.cancel`；
11. `inbound.order.confirm`；
12. `inbound.order.reverse`；
13. `inbound.order.export`；
14. `inspection.order.read`；
15. `inventory.stock.read`；
16. `inventory.transaction.read`；
17. `master.warehouse.read`；
18. `attachment.file.*`。

未新增 Permission Code。

## 6. 实现说明

### 6.1 查询

入库单查询继续通过 Workflow 通用列表与详情能力实现，支持分页、状态、审核状态、仓库、来源类型、来源主单、入库类型、验收单和关键词筛选。

列表与详情包含入库主表和明细，返回入库单号、来源类型、来源验收单、目标仓、SKU、数量、状态和版本号等字段。

### 6.2 创建入库单

创建采购来源或生产来源入库单时：

1. 禁止创建无来源入库；
2. 目标仓库必须存在且启用；
3. 验收单必须存在、已确认且来源类型一致；
4. 验收单必须与采购单或生产单主来源一致；
5. 来源单据状态必须合法；
6. 入库明细必须引用正式来源明细和验收明细；
7. SKU 必须与来源明细、验收明细一致；
8. 入库数量必须大于 0；
9. 入库数量不得超过“验收合格数量”和“来源合格剩余可入库数量”；
10. 服务端生成入库单号、快照、行成本、总量、草稿状态和版本；
11. 创建阶段不修改库存，不写库存流水。

### 6.3 状态流转

复用既有 Workflow 状态动作：

```text
draft
  ↓ submit
pending_approval
  ↓ approve
approved
  ↓ confirm
completed
```

同时支持撤回、驳回、反审核、取消和冲销。已完成入库只能通过 `INB-014` 形成反向库存流水进入 `reversed`，不得覆盖或删除原流水。

### 6.4 确认入库库存事务

确认入库在 Repository 事务边界中执行：

1. 校验入库单状态、版本和目标仓；
2. 重新读取入库明细；
3. 重新确认验收单仍为 `confirmed`；
4. 重新校验验收明细、来源明细和 SKU；
5. 校验本次确认数量不超过入库单剩余数量和来源剩余可入库数量；
6. `inventories` 按 SKU + 仓库 upsert 并增加 `on_hand_quantity` 与 `available_quantity`；
7. 为每条确认明细追加 `inventory_transactions`；
8. 更新采购或生产来源明细的 `inbound_quantity`；
9. 更新入库单状态、完成时间和版本；
10. 写入 `document_status_histories`。

任一步失败时，事务内状态更新、来源累计更新和状态历史不会继续写入。

### 6.5 幂等边界

HTTP Workflow 路由继续强制 mutation 请求提供 `Idempotency-Key`。本次不新增 API，也不改变持久化幂等框架。

Repository 侧确认入库额外依赖状态防重：已完成或已冲销入库单不能再次确认，避免重复增加库存、重复流水和重复来源累计。

### 6.6 附件

入库附件复用 Attachment Framework：

1. Object Type：`inbound_order`；
2. Category：`inbound_evidence`；
3. 权限：`attachment.file.*` 与 `inbound.order.*`；
4. 提交后或形成库存事实后按附件框架保护。

未新增 AttachmentObjectType。

## 7. 测试结果

本次新增和更新测试覆盖：

1. 采购来源入库创建；
2. 生产来源入库创建；
3. 确认入库库存增加；
4. `inventory_transactions` 生成；
5. 重复确认防重；
6. API mutation 的 `Idempotency-Key` 准入边界；
7. 入库权限；
8. Workflow Audit；
9. 事务失败时不推进状态和来源累计；
10. `inbound_evidence` 附件对象矩阵。

最终验证命令：

```bash
pnpm check
git diff --check
```

## 8. 已知限制

1. 本次不实现 `INB-005` 其他批准入库；
2. 本次不新增 UI；
3. 本次不新增入库管理页面；
4. 本次不新增独立死信、异步任务或事件接入；
5. 本次不修改 API Contract，因此入库确认仍使用现有 Workflow 通用返回结构；
6. 持久化幂等 replay 能力保持现有平台边界，本次不扩展 Workflow Service 的持久化幂等封装。

