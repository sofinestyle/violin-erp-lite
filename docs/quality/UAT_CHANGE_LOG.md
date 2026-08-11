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

### Batch 002-B Automated Verification

问题：

- Batch 002-B Master Data UX 自动复核；
- UAT-009 自动编码继续保持 Blocked by CR。

修改：

- 新增 `docs/quality/UAT_BATCH_002_B_AUTOMATED_VERIFICATION_REPORT.md`；
- 更新 UAT 测试记录与变更记录；
- 记录 Batch 002-B 已通过项、Automated Fail 项和仍需人工抽检项。

测试：

- `pnpm exec vitest run apps/admin/tests/master-data-page.test.tsx`：通过；
- `pnpm check`：通过；
- `pnpm status:check`：通过；
- `git diff --check`：通过；
- `http://localhost:3100/api/health`：Healthy；
- AI 视觉设计平台 `http://localhost:3000` 在线，未操作 PM2。

结果：

- 产品分类、品牌、厂家、供应商：Automated Pass / Pending Final Manual Spot Check；
- 产品 / SKU、仓库、平台 / 店铺：Automated Verification Passed / Pending Final Manual Spot Check；
- 统一 UX 写入路径：Manual Check Required；
- 不标记 Verified / Closed。

Commit：

`test: verify UAT batch 002-B master data ux`

### Batch 002-B Verification Failure Fix

问题：

- B002B-AF-001：Product / SKU 单位下拉不完整；
- B002B-AF-002：Warehouse 厂家选择器条件显示错误；
- B002B-AF-003：Store 表单暴露 UUID 技术说明。

修改：

- 补齐 `MASTER_DATA_FIELD_OPTIONS.units`，Product 默认单位与 SKU 计量单位共用同一选项源，默认值为 `把`；
- 增加字段级 `visibleWhen` 条件显示能力，Warehouse 仅在责任主体为厂家时显示厂家选择器，非厂家主体提交时忽略 `manufacturerId`；
- 将 Store `externalStoreId` 前端标签与说明业务化为 `平台店铺标识`，不再展示 UUID 技术术语。

测试：

- `pnpm exec vitest run apps/admin/tests/master-data-page.test.tsx`：通过。

结果：

- B002B-AF-001：Automated Verification Passed / Pending Final Manual Spot Check；
- B002B-AF-002：Automated Verification Passed / Pending Final Manual Spot Check；
- B002B-AF-003：Automated Verification Passed / Pending Final Manual Spot Check。

Commit：

`fix: resolve batch 002-B verification failures`

### Batch 002-B Final Automated Verification

问题：

- Batch 002-B 最终自动复核。

修改：

- 更新 UAT 自动复核报告、测试记录、变更记录和问题清单；
- 将 B002B-AF-001、B002B-AF-002、B002B-AF-003 记录为 Automated Verification Passed / Pending Final Manual Spot Check；
- 未修改业务代码、Database、API Contract、Permission 或自动编码规则。

测试：

- `pnpm exec vitest run apps/admin/tests/master-data-page.test.tsx`：通过；
- `pnpm check`：通过；
- `pnpm status:check`：通过；
- `git diff --check`：通过；
- 浏览器复核：Product / SKU 单位下拉、Warehouse 责任主体切换、Store 平台店铺标识文案通过；
- `http://localhost:3100/api/health`：Healthy；
- AI 视觉设计平台 `http://localhost:3000` 在线，未操作 PM2。

结果：

- Batch 002-B Automated Verification：Passed；
- Pending：Final Manual Spot Check；
- 不标记 Verified / Closed。

Commit：

`test: complete batch 002-B automated verification`

### UAT-013 Product Category Preset Selection Issue

问题：

- UAT-013：Master Data / Product Category 预设分类选择问题。

发现记录：

- Batch 002-B Final Manual Spot Check 中发现；
- 选择“提琴”后，下拉列表仅显示提琴，无法切换到吉他、尤克里里、配件或自定义；
- 问题类型为 UX / Configuration Bug；
- 严重等级为 Major；
- 状态为 Open。

修改：

- 仅更新 UAT 问题清单、测试记录和变更记录；
- 未修改代码、Database、API Contract 或 Permission。

测试：

- `git diff --check`：通过；
- `pnpm status:check`：通过。

Commit：

`docs: record UAT-013 category preset issue`

### Batch 002-B Closure and UAT-013 Fix

问题：

- Batch 002-B Final Manual Spot Check；
- UAT-013：产品分类预设选择“提琴”后无法切换到其他分类。

修改：

- 将 Batch 002-B 状态更新为 Verified / Closed；
- 修复 UAT-013：产品分类预设由原生 `datalist` 改为正式下拉选择；
- 补齐并保持五个预设：`提琴`、`吉他`、`尤克里里`、`配件`、`自定义`；
- 默认选中 `提琴`，用户可自由切换其他分类；
- 更新 UAT 问题清单、测试记录、变更记录和 Batch 002-B 报告。

测试：

- `pnpm exec vitest run apps/admin/tests/master-data-page.test.tsx`：通过；
- `pnpm check`：通过；
- `pnpm status:check`：通过；
- `git diff --check`：通过。

结果：

- Batch 002-B：Verified / Closed；
- UAT-013：Fixed / Pending Manual Verification；
- 未修改 Database、API Contract、Permission、自动编码逻辑或 Sales API。

Commit：

`fix: close batch 002-B and resolve UAT-013`

### Batch 002-C Core Business Completion

问题：

- UAT-010：核心业务工作台需从技术工作台升级为普通业务用户可操作的业务系统；
- Batch 002-C：基础资料 → 采购 → 生产 → 质检 → 入库 → 库存 → 销售出库 → 跨境发货闭环验收准备；
- UAT-009 自动编码和 UAT-011 独立 Sales Admin API Route 继续作为 CR 边界项。

修改：

- 补充 Workflow 状态中文映射，避免核心业务列表、详情和状态历史显示英文状态；
- 表单帮助文案改为业务化说明，不再提示用户 UUID、JSON 或 DTO 等技术概念；
- 关联下拉在缺少业务标签时不再回退显示内部 id；
- 增加 Workflow 自动化测试，覆盖采购、生产、质检、入库、库存调整、销售出库、跨境发货和销售退货；
- 新增 `docs/quality/UAT_BATCH_002_C_CORE_COMPLETION_REPORT.md`；
- 更新 UAT 问题清单和测试记录，将 UAT-010 / Batch 002-C 标记为 Fixed / Pending Verification。

测试：

- `pnpm exec vitest run apps/admin/tests/workflow-page.test.tsx`：通过；
- `pnpm check`：通过；
- `pnpm status:check`：通过；
- `git diff --check`：通过。

结果：

- 核心业务工作台进入人工复验；
- 未修改 Database、Migration、API Contract、Permission 或自动编码逻辑；
- 跨境发货单直接保存平台 / 店铺需 Database CR + API CR，当前不伪造前端字段；
- 独立 Sales API 仍需 API CR，销售受限 MVP 继续复用 `OUT-*` / `SRT-*`。

Commit：

`fix: complete batch 002-C core business flow`

### Batch 002-C Automated Verification

问题：

- Batch 002-C Core Business Completion 自动复核；
- 重点验证基础资料衔接、采购生产库存闭环、销售出库闭环、跨境发货库存流转和中文业务化体验。

修改：

- 新增 `docs/quality/UAT_BATCH_002_C_AUTOMATED_VERIFICATION_REPORT.md`；
- 更新 UAT 测试记录；
- 记录 Batch 002-C 自动复核结果为 Automated Pass / Pending Manual Business Verification；
- 保持 UAT-009、UAT-011 和跨境发货平台 / 店铺持久化为 CR 边界；
- 未修改代码、Database、Migration、API Contract、Permission 或 UAT Closed 状态。

测试：

- `pnpm exec vitest run apps/admin/tests/master-data-page.test.tsx apps/admin/tests/workflow-page.test.tsx`：通过，27 tests passed；
- `pnpm check`：通过；
- `pnpm status:check`：通过；
- `git diff --check`：通过；
- `http://localhost:3100/api/health`：Healthy；
- AI 视觉平台 `http://localhost:3000` 有响应，未操作 PM2。

结果：

- Batch 002-C：Automated Pass / Pending Manual Business Verification；
- B002C-OBS-001：只读限制与写入型业务操作存在范围冲突，已记录为 Accepted；
- B002C-CR-001：跨境发货平台 / 店铺持久化需 Database CR + API CR；
- B002C-CR-002：自动编码需 Business Rule CR + API CR，推荐 Database CR；
- B002C-CR-003：独立 Sales Admin API Route 需 API CR。

Commit：

`test: verify batch 002-C business flow`

### UAT-009 Formal Change Request Documents

问题：

- UAT-009 自动编码。

修改：

- 新增 `docs/changes/CR-001_CODE_GENERATION_BUSINESS_RULE.md`；
- 新增 `docs/changes/CR-002_CODE_GENERATION_API_CHANGE.md`；
- 新增 `docs/changes/CR-003_CODE_GENERATION_DATABASE_CHANGE.md`；
- 将 UAT-009 状态从 `Blocked by CR` 更新为 `Pending CR Approval`。

测试：

- `pnpm status:check`：通过；
- `git diff --check`：通过。

结果：

- 自动编码进入正式 CR 审批等待状态；
- 本次未修改代码、Database、API Contract、Permission、Migration 或 Frozen SSOT。

Commit：

`docs: add UAT-009 change requests`

### Automatic Code Generation CR Approval Completed

问题：

- UAT-009 自动编码；
- CR-001 Automatic Code Generation Business Rules；
- CR-002 Allow Server-side Code Generation；
- CR-003 Code Generation Storage。

修改：

- 将 CR-001 状态更新为 `Approved`；
- 将 CR-002 状态更新为 `Approved`；
- 将 CR-003 状态更新为 `Approved`；
- 补充 Approved By、Approval Date 和 Approval Scope；
- 将 UAT-009 状态更新为 `Approved for Implementation`。

审批：

- Approved By：Project Owner；
- Approval Date：2026-08-09；
- Approval Scope：批准自动编码第一阶段实施，包含 Product Code、SKU Code、Supplier Code、Manufacturer Code、Warehouse Code；暂不包含 Category Code、Brand Code、Platform Code、Store Code；
- Business Rule：Approved；
- API Contract：Approved；
- Database：Approved；
- Permission：No Change。

测试：

- `pnpm status:check`：通过；
- `git diff --check`：通过。

结果：

- 自动编码正式进入第一阶段实现准备状态；
- 本次未修改代码、Database、Migration、API Contract、Permission 或业务实现。

Commit：

`docs: approve automatic code generation CRs`

### UAT-009 Automatic Code Generation Implementation

问题：

- UAT-009 自动编码；
- CR-001 Automatic Code Generation Business Rules；
- CR-002 Allow Server-side Code Generation；
- CR-003 Code Generation Storage。

修改：

- 新增 `code_generation_rules` 与 `code_sequences`；
- 新增统一 CodeGenerationService；
- Product、SKU、Supplier、Manufacturer、Warehouse 支持服务端自动生成编码；
- Product、SKU、Supplier、Manufacturer、Warehouse Create DTO 编码字段调整为可选；
- PC Admin 基础资料页面隐藏第一阶段自动编码输入，创建后展示最终编码；
- 新增 `UAT_009_CODE_GENERATION_IMPLEMENTATION_REPORT.md`；
- 将 UAT-009 状态更新为 `Fixed / Pending Verification`。

测试：

- `pnpm --filter @violin-erp/api test -- --runInBand`：通过；
- `pnpm --filter @violin-erp/database test`：通过；
- `pnpm exec vitest run apps/admin/tests/master-data-page.test.tsx`：通过；
- `pnpm --filter @violin-erp/database typecheck`：通过；
- `pnpm --filter @violin-erp/api typecheck`：通过；
- `pnpm --filter @violin-erp/admin exec tsc --noEmit`：通过。

结果：

- 自动编码第一阶段实现完成；
- Category Code、Brand Code、Platform Code、Store Code 暂不纳入第一阶段；
- 未新增 Permission Code；
- 未新增 API Path、Response 字段、分页字段或错误码；
- 未修改历史业务编码；
- 待项目负责人进行最终人工复验。

Commit：

`feat: implement automatic code generation`

### UAT-009 Automatic Code Generation Deployment Verification

问题：

- UAT-009 自动编码本地 UAT Migration 部署与真实运行验证。

修改：

- 部署 `20260809090000_add_code_generation_foundation` 到本地 UAT PostgreSQL；
- 验证 `code_generation_rules` 与 `code_sequences` 已创建并初始化；
- 验证 `localhost:3100/api/health` 恢复 HTTP 200；
- 通过正式 API 创建 UAT 标识 Product、SKU、Supplier、Manufacturer、Warehouse；
- 更新 UAT-009 验证记录。

测试：

- `pnpm db:migrate:status`：Database schema is up to date；
- `GET /api/health`：HTTP 200；
- Product 自动生成 `PRD-000001`；
- SKU 自动生成 `L2-44-BK`；
- Supplier 自动生成 `SUP-000001`；
- Manufacturer 自动生成 `MFR-000001`；
- Warehouse 自动生成 `WH-000001`；
- 并发 Supplier 自动编码无重复；
- 显式合法历史编码兼容；
- 重复显式编码返回 `CONFLICT_REQUEST`；
- 失败事务未推进 Product 编码流水；
- `pnpm check`：通过；
- `pnpm status:check`：通过；
- `git diff --check`：通过。

结果：

- UAT-009 更新为 `Automated Pass / Pending Final Manual Spot Check`；
- 本轮只更新验证文档，未修改业务代码、Database Schema、Migration、API Contract 或 Permission。

Commit：

`test: verify automatic code generation deployment`

### Product / SKU Management Unified Refactoring

问题：

- Product / SKU 管理职责不够清晰；
- SKU 新增仍偏技术工作台形态；
- Product 页面仍残留 SKU 批量维护入口；
- 产品型号唯一性需治理判断。

修改：

- Product 页面聚焦型号级主数据；
- `productNameEn` 前端语义改为“产品型号”，Create 校验必填；
- Product 页面移除 SKU 批量新增区域；
- Product 列表增加“SKU 管理”入口；
- SKU 页面产品选择改为“产品型号”，下拉展示 `型号｜产品名称`；
- 新增 SKU 尺寸 × 颜色组合生成器；
- 新增 SKU 组合预览、批量设置、逐行编辑、已存在标记和失败行重试；
- 扩展 SKU 编码服务尺寸 / 颜色映射；
- 新增 `UAT_PRODUCT_SKU_MANAGEMENT_REFACTOR_REPORT.md`。

测试：

- `pnpm exec vitest run apps/admin/tests/master-data-page.test.tsx`：通过；
- `pnpm --filter @violin-erp/api exec vitest run tests/master-data.test.ts`：通过；
- `pnpm --filter @violin-erp/database exec vitest run tests/code-generation-service.test.ts`：通过。

结果：

- Product / SKU Management UX Refactoring：Fixed / Pending Automated Verification；
- 产品型号唯一性：Blocked by Database CR；
- 未新增 Database Schema、Migration、API Path 或 Permission Code。

Commit：

`refactor: simplify product and sku management`
