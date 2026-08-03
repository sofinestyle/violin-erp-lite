---
document_name: UAT变更记录
project: Violin ERP Lite
version: 1.0
status: Draft
owner: Project Manager
created_date: 2026-07-26
updated_date: 2026-08-03
related_phase: Phase 10
---

# Violin ERP Lite UAT Change Log

## 1. 文档说明

本文件用于记录 Local UAT 阶段的问题修复批次，包括：

- 修复的问题；
- 修改文件；
- 测试结果；
- Git Commit。

## 2. 记录格式

### Batch XXX

问题：

UAT-XXX

修改：

xxx

测试：

xxx

Commit：

xxx

### Batch 001

问题：

- UAT-001
- UAT-002
- UAT-003
- UAT-004
- UAT-005
- UAT-006
- UAT-007
- UAT-008
- UAT-009

修改：

- 修复 App Shell、Dialog/Drawer、登录页、Dashboard 和 Master Data 表单交互。
- UAT-009 完成影响评估，因涉及 Frozen 业务规则和 API Create DTO，标记为 Blocked by CR。

测试：

- `pnpm exec vitest run apps/admin/tests/app-shell.test.tsx apps/admin/tests/master-data-page.test.tsx apps/admin/tests/auth-client.test.ts apps/admin/tests/dashboard.test.tsx`：通过。
- 全量 `pnpm check`：通过。
- 本地 `http://localhost:3100/` 页面冒烟：通过。
- 本地 `http://localhost:3100/api/health`：通过。
- AI 视觉设计平台 `http://localhost:3000/` 存活确认：通过，未操作 PM2。

Commit：

`fix: resolve UAT batch 001 issues`

### Batch 001-A

问题：

- UAT-002
- UAT-007

修改：

- UAT-002：按项目负责人确认，移除全局 Header 中的 Light / Theme 按钮，并删除仅为该按钮服务的 ThemeProvider 代码。
- UAT-007：将根级路由 loading 从全屏加载态改为内容区稳定骨架，避免右侧内容区在菜单切换时整块白屏闪烁。

测试：

- `pnpm exec vitest run apps/admin/tests/app-shell.test.tsx apps/admin/tests/dashboard.test.tsx`：通过。
- 全量 `pnpm check`：通过。
- 本地 `http://localhost:3100/` 页面冒烟：通过。
- 连续切换 5 个左侧菜单：通过，Header / Sidebar 稳定，右侧内容区未出现全屏白屏。
- 本地 `http://localhost:3100/api/health`：通过。
- AI 视觉设计平台 `http://localhost:3000/` 存活确认：通过，未操作 PM2。

Commit：

`fix: refine UAT theme and navigation issues`

### Batch 001 Manual Verification

人工复验：

Passed

涉及问题：

- UAT-001
- UAT-002
- UAT-003
- UAT-004
- UAT-005
- UAT-006
- UAT-007
- UAT-008

状态：

Verified / Closed

保留问题：

- UAT-009：Blocked by CR

Commit：

`docs: close UAT batch 001 verification`

### Batch 002-A

问题：

- UAT-010
- UAT-011

修改：

- UAT-010：将采购、生产、质检、入库、库存调整、国内销售出库、跨境发货和销售退货的通用工作台改造为中文业务表单；新增关联对象下拉、来源明细选择、单行明细录入、状态中文映射、状态动作按钮、危险操作确认和 Request ID 错误反馈。
- UAT-011：审查 Sales Management Admin API Route；确认当前 Frozen `API_SPEC.md` 未登记销售分析独立 Path，本批未新增 `/api/v1/sales/...` 路由，避免破坏 API Frozen 规则。

测试：

- `pnpm exec vitest run apps/admin/tests/workflow-page.test.tsx apps/admin/tests/api-v1-contract.test.ts`：通过。
- `pnpm --filter @violin-erp/admin exec tsc --noEmit`：通过。

Commit：

`fix: implement UAT batch 002 core business usability`

### UAT-012 Transparent Workflow Form Fix

问题：

- UAT-012

修改：

- 将 Workflow Workbench 的新增表单、详情抽屉、Overlay、表单分区、明细卡片、表单控件和底部操作区统一改为明确不透明背景。
- 修复采购、生产、质检、入库、库存调整、出库、跨境发货和销售退货共用业务表单的底层页面穿透问题。
- 保持业务逻辑、Database、API 和 Permission 不变。

测试：

- `pnpm exec vitest run apps/admin/tests/workflow-page.test.tsx`：通过。
- 全量 `pnpm check`：通过。
- `pnpm status:check`：通过。
- `git diff --check`：通过。

Commit：

`fix: resolve transparent workflow forms`

### Batch 002-B

问题：

- Batch 002 Master Data UX 可用性优化
- UAT-009 自动编码保持 Blocked by CR

修改：

- 产品分类增加提琴、吉他、尤克里里、配件预设，分类层级和显示顺序由前端默认 / 推导。
- 产品与 SKU 在入口页合并为“产品 / SKU 规格”业务入口，底层 Product / SKU 数据对象保持分离。
- SKU 名称支持前端按产品、尺寸、颜色和规格自动生成；Product / SKU 表单支持批量规格录入，保存时逐条调用现有 SKU API，显示逐行成功 / 失败结果，失败行可单独重试；不新增批量 API，不具备原子批量或整体回滚。
- 厂家 / 供应商结算方式、仓库类型、责任主体、平台类型、国家代码、业务币种改为中文下拉。
- 平台与店铺在入口页合并为“平台 / 店铺”业务入口，底层数据库对象保持不变。

测试：

- `pnpm exec vitest run apps/admin/tests/master-data-page.test.tsx`：通过。
- 全量 `pnpm check`：通过。
- `pnpm status:check`：通过。
- `git diff --check`：通过。
- 本地 `http://localhost:3100/workspace/master-data` 浏览器冒烟：通过，控制台 error / warn 为 0。

Commit：

`fix: improve master data ux`
