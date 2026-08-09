---
document_name: UAT Batch 002-C Core Business Completion Report
project: Violin ERP Lite
version: 1.0
status: Draft
owner: Project Manager
created_date: 2026-08-09
updated_date: 2026-08-09
related_phase: Phase 10
---

# UAT Batch 002-C Core Business Completion Report

## 1. 执行目标

本批目标是将 PC Admin 中已存在的后端核心业务能力继续业务化接入，使普通业务人员能够在不填写 JSON、内部 UUID、英文状态码或内部技术字段的前提下，完成 ERP 核心业务闭环：

基础资料

↓

采购

↓

生产

↓

质检

↓

入库

↓

库存

↓

销售出库

↓

跨境发货

本次未修改 Database Schema、Migration、Frozen API Contract、Permission、自动编码规则、BOM / MRP、财务模块或 AI 功能。

## 2. 实现范围

### 2.1 基础资料

当前基础资料入口已覆盖：

- 产品分类；
- 产品；
- SKU；
- 供应商；
- 生产厂家；
- 仓库；
- 电商平台；
- 店铺。

确认结果：

- 页面使用中文字段、中文说明、默认值和业务化下拉；
- Product / SKU 保持独立数据对象、独立 API、独立权限；
- 平台 / 店铺保持独立数据对象、独立 API、独立权限；
- 不要求用户填写 JSON、内部 UUID 或英文状态码；
- 自动编码 `UAT-009` 仍保持 `Blocked by CR`，未在本批实现。

### 2.2 采购 → 生产 → 质检 → 入库 → 库存

PC Admin Workflow Workbench 已通过现有正式 API 接入：

| 流程 | 页面能力 | API |
| --- | --- | --- |
| 采购订单 | 创建、提交、撤回、审核、驳回、反审核、取消、状态历史 | `PUR-*` |
| 生产任务 | 创建、提交、撤回、审核、驳回、反审核、开始生产、状态历史 | `PRO-*` |
| 采购 / 生产质检 | 来源单选择、来源明细加载、合格 / 不合格数量、提交、确认、撤销、作废 | `INS-*` |
| 采购 / 生产入库 | 已确认验收单选择、目标仓库、入库数量、提交、审核、确认入库、冲销、状态历史 | `INB-*` |
| 库存调整 | 仓库、SKU、增加 / 减少方向、调整数量、审核、执行、状态历史 | `INV-*` |

确认结果：

- 采购、生产、质检、入库均通过业务选择器选择关联对象；
- 来源明细由系统根据来源单加载；
- 确认入库后库存增加与库存流水生成由后端正式事务能力保障；
- 库存调整执行后库存变化与库存流水生成由后端正式事务能力保障。

### 2.3 销售出库

销售受限 MVP 继续复用既有 Outbound 与 Sales Return 能力：

| 流程 | 页面能力 | API |
| --- | --- | --- |
| 国内销售出库 | 平台、店铺、SKU、数量、提交、审核、确认出库、冲销 | `OUT-*` |
| 销售退货 | 原销售出库单、退货店铺、退货仓库、退货数量、退货入库 | `SRT-*` |

确认结果：

- 销售出库通过 `OUT-*` 改变库存；
- 销售退货通过 `SRT-*` 处理退货入库；
- 未新增 `/api/v1/sales` 或 `SALES-*` API；
- `UAT-011` 继续保持 `Blocked by CR`，独立 Sales Admin API Route 需后续 API CR。

### 2.4 跨境发货

跨境发货已通过现有正式 API 接入：

| 流程 | 页面能力 | API |
| --- | --- | --- |
| 跨境发货 | 来源仓、在途仓、海外仓、发货批次、承运商、运单号、运输方式、SKU、数量、提交、审核、确认发货 | `CBR-*` |

确认结果：

- 确认发货由后端正式事务执行来源仓扣减与在途仓增加；
- 发货库存流水与状态历史通过既有 `CBR-*` 能力查询；
- 当前 Frozen `cross_border_shipments` 数据模型和 `CBR-003` Create DTO 未包含 `platformId` / `storeId` 持久化字段；
- 因此“跨境发货单直接选择并保存平台 / 店铺”不能在本批无 CR 实现，避免出现前端选择但后端不落库的假能力。

## 3. 本次代码调整

本次代码调整仅限 PC Admin Workflow Workbench 与测试：

1. 补充更多 Workflow 状态中文映射，避免列表、详情和时间线显示 `shipped`、`reversed`、`pending_validation` 等英文状态值；
2. 表单帮助文案改为业务化说明，不再显示 UUID / JSON / DTO 等技术术语；
3. 关联下拉缺少业务标签时不再回退显示内部 id，而显示“未命名业务对象”；
4. 增加 Batch 002-C 核心闭环自动化测试，覆盖采购、生产、质检、入库、库存调整、销售出库、跨境发货、销售退货；
5. 增加 Sales 受限 MVP 路由边界测试，确认不新增未批准的 `/api/v1/sales` 根路径；
6. 增加跨境发货平台 / 店铺 CR 边界测试，确认不伪造未落库字段。

## 4. Frozen 边界检查

| 项目 | 结果 |
| --- | --- |
| Database Schema | Not Changed |
| Migration | Not Changed |
| API Contract | Not Changed |
| Permission | Not Changed |
| 自动编码 | Not Implemented；`UAT-009` remains Blocked by CR |
| Sales API | Not Added；`UAT-011` remains Blocked by CR |
| BOM / MRP | Not Implemented |
| 财务模块 | Not Implemented |
| AI 功能 | Not Implemented |

## 5. CR 判断

| 项目 | CR 判断 | 原因 |
| --- | --- | --- |
| 自动编码 | Business Rule CR + API CR Required；Database CR Recommended | Frozen Create DTO 当前要求编码由客户端提交，且未批准统一编号规则 |
| Sales Admin API Route | API CR Required for new `/api/v1/sales` or `SALES-*` | 当前受限 MVP 可复用 `OUT-*`、`SRT-*`、`INV-*`、`MD-*` |
| 跨境发货保存平台 / 店铺 | Database CR + API CR Required | `cross_border_shipments` 与 `CBR-003` 未包含可持久化 `platformId` / `storeId` 字段 |
| 新增 Permission | Not Required for current scope | 本批复用既有权限 |

## 6. 自动化测试结果

本批新增 / 更新测试覆盖：

- 核心业务表单不得出现 JSON / UUID / DTO / 英文状态码等技术提示；
- 采购 → 生产 → 质检 → 入库 → 库存调整 → 销售出库 → 跨境发货 → 销售退货均使用既有正式 API；
- 入库、出库、跨境、销售退货状态动作按钮为中文；
- Sales MVP 不新增未批准 Sales API；
- 跨境发货平台 / 店铺直连持久化被明确拦截为 CR 边界；
- 核心业务状态动作不出现重复按钮。

执行结果记录：

- `pnpm exec vitest run apps/admin/tests/workflow-page.test.tsx`：通过；
- `pnpm check`：通过；
- `pnpm status:check`：通过；
- `git diff --check`：通过。

## 7. 本地业务验证结果

本次自动化验证确认 PC Admin 已具备业务化表单、关联对象选择器、中文状态动作和错误反馈能力。

真实写入型本地业务操作建议由项目负责人在 `http://localhost:3100` 使用 UAT 标识数据执行最终人工复验，避免自动化脚本污染已有人工验收数据。

待人工复验的最小业务路径：

1. 创建完整小提琴产品和多个 SKU；
2. 创建采购订单并提交 / 审核；
3. 创建生产任务并提交 / 审核 / 开始生产；
4. 创建采购来源质检和生产来源质检；
5. 创建并确认入库，验证库存增加和库存流水；
6. 创建并执行库存调整；
7. 创建并确认销售出库，验证库存减少和库存流水；
8. 创建并确认跨境发货，验证来源仓扣减与在途仓增加；
9. 创建销售退货并执行退货入库。

## 8. UAT 状态

| 项目 | 状态 |
| --- | --- |
| UAT-010 Core Business / PC Admin Workbench | Fixed / Pending Verification |
| UAT-009 自动编码 | Blocked by CR |
| UAT-011 Sales Admin API Route | Blocked by CR |
| Batch 002-C Core Business Completion | Fixed / Pending Verification |

## 9. 已知限制

1. 自动编码未实现，等待 CR；
2. 独立 Sales Admin API Route 未实现，等待 CR；
3. 跨境发货单直接保存平台 / 店铺未实现，等待 Database/API CR；
4. BOM / MRP、财务模块、AI 功能不属于本批范围；
5. 本批不声明跨业务单据的原子批量提交或整体回滚能力。
