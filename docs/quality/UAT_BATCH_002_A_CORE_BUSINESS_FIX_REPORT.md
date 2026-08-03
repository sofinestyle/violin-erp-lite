---
document_name: UAT Batch 002-A核心业务可用性修复报告
project: Violin ERP Lite
version: 1.0
status: Draft
owner: Project Manager
created_date: 2026-08-03
updated_date: 2026-08-03
related_phase: Phase 10
---

# UAT Batch 002-A Core Business Usability Fix Report

## 1. 修复目标

本批次面向 Local UAT Batch 002 审计发现的核心业务可用性问题。

目标：

普通业务用户在 PC Admin 中执行采购、生产、质检、入库、库存调整、出库、跨境发货和销售退货时，不再需要手工填写 JSON DTO、UUID、英文状态码或内部技术字段。

本批次只接入已有 Frozen 能力，不新增 Database Schema、Migration、API Contract、Permission Code 或业务状态机。

## 2. 修改文件

- `apps/admin/components/workflow/workflow-workbench.tsx`
- `apps/admin/tests/workflow-page.test.tsx`
- `docs/quality/UAT_ISSUE_LIST.md`
- `docs/quality/UAT_TEST_RECORD.md`
- `docs/quality/UAT_CHANGE_LOG.md`
- `docs/quality/UAT_BATCH_002_A_CORE_BUSINESS_FIX_REPORT.md`

## 3. 核心实现

### 3.1 通用业务工作台

已实现：

- 中文业务表单；
- 关联对象下拉选择器；
- 来源单据与来源明细选择；
- 单行明细录入；
- 状态中文映射；
- 状态动作按钮；
- 权限包装；
- 成功 / 失败反馈；
- API 错误字段详情与 Request ID 保留；
- 危险状态动作二次确认；
- 状态历史中文展示。

已移除：

- 新增弹窗中的 `请求 DTO（JSON）`；
- 子资源列表中的“输入所属正式单据 UUID”；
- 详情页直接展示原始 JSON。

### 3.2 采购流程

实现情况：

- 采购订单列表；
- 新增采购订单；
- 供应商下拉；
- SKU 明细行；
- 数量、单价、税率、交期录入；
- 提交、撤回、审核、驳回、反审核、取消；
- 采购付款登记；
- 状态历史。

使用 API：

- `PUR-*`

### 3.3 生产流程

实现情况：

- 生产任务列表；
- 新增生产任务；
- 生产厂家下拉；
- SKU、计划数量、加工单价明细；
- 提交、撤回、审核、驳回、反审核、开始生产、取消；
- 生产进度登记；
- 分批完工登记；
- 完工确认、撤销、作废；
- 状态历史。

使用 API：

- `PRO-*`

### 3.4 质检流程

实现情况：

- 采购来源验收；
- 生产来源验收；
- 来源单据下拉；
- 来源明细下拉；
- 合格 / 不合格 / 待处理结果；
- 提交、确认验收、撤销、作废；
- 状态历史。

使用 API：

- `INS-*`

限制：

- 当前只提供单行明细录入，多行验收可作为后续 UX 增强。

### 3.5 入库流程

实现情况：

- 采购入库；
- 生产入库；
- 来源单据下拉；
- 已确认验收单下拉；
- 验收明细选择；
- 目标仓库选择；
- 入库数量、单位成本、库存状态录入；
- 提交、撤回、审核、驳回、反审核、确认入库、冲销；
- 状态历史。

使用 API：

- `INB-*`

### 3.6 库存调整

实现情况：

- 库存调整列表；
- 新增调整单；
- 仓库下拉；
- SKU 下拉；
- 增加 / 减少方向中文选择；
- 调整数量、单位成本、原因；
- 提交、撤回、审核、驳回、反审核、执行调整、取消；
- 状态历史。

使用 API：

- `INV-*`

### 3.7 出库

实现情况：

- 国内销售出库列表；
- 新增销售出库；
- 仓库、平台、店铺下拉；
- 外部订单号、客户快照；
- SKU 明细；
- 提交、撤回、审核、驳回、反审核、确认出库、冲销；
- 状态历史。

使用 API：

- `OUT-*`

### 3.8 跨境发货

实现情况：

- 跨境发货列表；
- 新增跨境发货单；
- 来源仓、在途仓、海外仓下拉；
- 发货批次、承运商、运单号、运输方式、目的国家；
- SKU 明细；
- 提交、撤回、审核、驳回、反审核、确认发货、取消；
- 状态历史。

使用 API：

- `CBR-*`

限制：

- `cross_border_shipments` 当前未登记平台 / 店铺字段，本批不向跨境发货单新增平台或店铺写入能力；平台 / 店铺运营视图继续基于已批准只读能力处理。

### 3.9 销售退货

实现情况：

- 销售退货列表；
- 新增销售退货；
- 原销售出库单下拉；
- 原出库明细下拉；
- 店铺、退货接收仓选择；
- 退货数量、处置数量、库存状态、处理结果；
- 提交、撤回、审核、驳回、退货入库、取消；
- 状态历史。

使用 API：

- `SRT-*`

### 3.10 Sales Admin API Route

审查结论：

- `SalesManagementService`、`SalesManagementRepository` 与 `PrismaSalesManagementRepository` 已存在；
- Frozen `API_SPEC.md` 未登记独立 `SALES-*`、`ORDER-*` 或 `/api/v1/sales/...` 路由；
- Phase 8 销售受限 MVP 明确不新增完整销售订单中心、不新增 `sales.*` Permission，不新增平台订单对象；
- 因此，本批未新增 Sales Admin API Path。

CR 判断：

- API CR：Required，如果项目负责人希望正式开放 Sales Management 只读 Admin API Route；
- Database CR：Not Required；
- Permission CR：Not Required，受限 MVP 可继续复用 `OUT-*`、`SRT-*`、`MD-*`、`INV-*` 和既有字段权限。

## 4. Frozen 影响

| 项目 | 结果 |
| --- | --- |
| Database Schema | Not Modified |
| Migration | Not Modified |
| API Contract | Not Modified |
| Permission | Not Modified |
| Business Rules | Not Modified |
| ROADMAP / Phase Status | Not Modified |

## 5. 自动化测试

已执行：

- `pnpm --filter @violin-erp/admin exec tsc --noEmit`
- `pnpm exec vitest run apps/admin/tests/workflow-page.test.tsx apps/admin/tests/api-v1-contract.test.ts`

结果：

- 通过。

覆盖：

- 核心业务视图配置；
- 子资源不再提示手填 UUID；
- 新增弹窗不再暴露 JSON DTO；
- 中文业务字段；
- 中文状态动作；
- API v1 Frozen 边界。

## 6. 待人工复验

请项目负责人在 `http://localhost:3100` 逐项复验：

1. 创建采购订单；
2. 创建生产任务；
3. 创建采购来源质检；
4. 创建生产来源质检；
5. 创建并确认入库；
6. 创建并执行库存调整；
7. 创建并确认出库；
8. 创建并确认跨境发货；
9. 创建销售退货；
10. 确认页面不再要求手填 JSON、UUID 或英文状态码；
11. 确认状态按钮与当前单据状态、权限匹配；
12. 确认失败时展示中文业务错误与 Request ID。

## 7. 已知限制

1. 当前业务表单提供单行明细录入，多行明细属于后续 UX 增强；
2. 跨境发货单当前不写入平台 / 店铺字段，因为 Frozen Database 未登记该关系；
3. Sales Management 只读 Admin API Route 需要 API CR 后才能正式接入；
4. 附件入口沿用既有 Attachment Framework，本批未新增附件类型；
5. UAT-009 自动编码仍为 `Blocked by CR`。

## 8. UAT 状态

| UAT ID | 状态 |
| --- | --- |
| UAT-010 | Fixed / Pending Manual Verification |
| UAT-011 | Blocked by CR |

