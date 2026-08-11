---
document_name: UAT人工验收记录
project: Violin ERP Lite
version: 1.0
status: Draft
owner: Project Manager
created_date: 2026-07-26
updated_date: 2026-08-03
related_phase: Phase 10
---

# Violin ERP Lite UAT Test Record

## 1. 当前阶段

Local UAT In Progress

## 2. 测试环境

Web:

http://localhost:3100

Database:

violin_erp_lite

## 3. 测试状态

进行中

## 4. 已发现问题

- UAT-001
- UAT-002
- UAT-003
- UAT-004
- UAT-005
- UAT-006
- UAT-007
- UAT-008
- UAT-009
- UAT-010
- UAT-011
- UAT-012
- UAT-013

## 5. 已测试模块

- 登录
- 用户管理
- 登录页
- Dashboard
- 左侧导航
- 产品新增
- 基础资料编码录入

## 6. 本轮测试记录

测试模块：

- 登录页
- Dashboard
- 左侧导航
- 产品新增
- 基础资料编码录入

新增问题：

- UAT-005
- UAT-006
- UAT-007
- UAT-008
- UAT-009

当前累计问题：

UAT-001 至 UAT-009

状态：

Local UAT In Progress

## 7. UAT Batch 001 修复记录

修复范围：

- UAT-001 用户编辑弹窗背景透明
- UAT-002 Light 主题按钮无响应
- UAT-003 帮助 / 通知图标无响应
- UAT-004 用户头像点击直接退出
- UAT-005 登录密码显示 / 隐藏
- UAT-006 Dashboard 占位内容
- UAT-007 菜单切换屏闪
- UAT-008 新增产品请求校验失败

影响评估：

- UAT-009 基础资料编码自动生成已完成影响评估，当前状态为 Blocked by CR。

自动化回归：

- App Shell 回归测试：通过
- Dashboard 回归测试：通过
- 登录密码控件回归测试：通过
- Master Data 关系选择和校验详情回归测试：通过
- 全量 `pnpm check`：通过

本地冒烟：

- Violin ERP Lite `http://localhost:3100/`：可访问
- Violin ERP Lite `/api/health`：Healthy，数据库 connected
- AI 视觉设计平台 `http://localhost:3000/`：服务存活，未操作 PM2

当前状态：

Local UAT In Progress，等待项目负责人进行人工复验。

## 8. UAT-002 / UAT-007 复修记录

测试模块：

- 全局 Header
- 左侧导航
- 右侧内容区域路由切换

处理结果：

- UAT-002：项目负责人确认不需要主题切换，已移除 Header 主题按钮和专用 ThemeProvider 代码。
- UAT-007：左侧菜单栏保持稳定；右侧内容区域闪屏根因定位为根级 route loading 使用全屏加载态，已替换为内容区稳定骨架。

自动化回归：

- App Shell 回归测试：通过
- Dashboard 回归测试：通过

当前状态：

UAT-002 与 UAT-007 已通过项目负责人人工复验。

## 9. Batch 001 Manual Verification

复验范围：

- UAT-001
- UAT-002
- UAT-003
- UAT-004
- UAT-005
- UAT-006
- UAT-007
- UAT-008

Result：

Passed

关闭结果：

- UAT-001 至 UAT-008：Verified / Closed
- UAT-009：Blocked by CR

当前状态：

Local UAT In Progress，剩余事项为 UAT-009 CR 阻断项。

## 10. UAT Batch 002-A Core Business Usability Fix

测试模块：

- 采购订单
- 生产任务
- 质检单
- 入库单
- 库存调整
- 国内销售出库
- 跨境发货
- 销售退货
- 销售统计 Admin API Route 边界

处理结果：

- UAT-010：核心业务工作台已从 JSON DTO / UUID 输入改为中文业务表单、关联对象下拉、明细行录入、中文状态显示和状态动作按钮。
- UAT-011：Sales Management 只读 Service 已存在，但未发现 Frozen API Contract 对应 Path；本批未新增 API Path，状态为 Blocked by CR。

自动化回归：

- `pnpm exec vitest run apps/admin/tests/workflow-page.test.tsx apps/admin/tests/api-v1-contract.test.ts`：通过。

当前状态：

Local UAT In Progress，UAT-010 等待人工复验，UAT-009 / UAT-011 为 CR 阻断项。

## 11. UAT-012 Workflow Form Background Fix

测试模块：

- 新增采购订单
- 新增生产任务
- 新增质检单
- 新增入库单
- 新增库存调整
- 新增出库单
- 新增跨境发货
- 新增销售退货

问题：

- UAT-012：核心业务工作台新增 / 编辑表单背景透明，底层页面内容穿透。

处理结果：

- Workflow Workbench 统一使用明确半透明 Overlay；
- 表单主体、详情抽屉、基本信息区、明细区、底部操作区和表单控件统一使用不透明背景；
- 长表单保持内容区滚动，保存 / 取消操作区保持清晰可见；
- 未修改业务逻辑、Database、API 或 Permission。

自动化回归：

- `pnpm exec vitest run apps/admin/tests/workflow-page.test.tsx`：通过。
- 全量 `pnpm check`：通过。

当前状态：

Local UAT In Progress，UAT-012 等待项目负责人人工复验。

## 12. Automated UAT Verification Pass

复核范围：

- UAT-010 Core Business / PC Admin Workbench；
- UAT-012 Workflow Workbench 透明背景。

自动化测试：

- `pnpm exec vitest run apps/admin/tests/workflow-page.test.tsx apps/admin/tests/api-v1-contract.test.ts apps/admin/tests/app-shell.test.tsx apps/admin/tests/dashboard.test.tsx apps/admin/tests/master-data-page.test.tsx`：通过；
- `pnpm check`：通过；
- `pnpm status:check`：通过；
- `git diff --check`：通过。

浏览器复核：

- `http://localhost:3100` 页面可打开；
- `/api/health` 返回 `success=true`，database connected；
- 连续切换生产、库存、出入库、跨境、采购后 App Shell 保持存在；
- 控制台 error / warn 为空；
- 核心业务新增表单均可打开，保存 / 取消按钮存在；
- 未发现 `请求 DTO` 原始 JSON 输入区；
- 未发现要求用户填写内部 `id` / `uuid` 的控件；
- UAT-012 表单主体、明细区、Footer 和控件 computed background 均为非透明。

AI 视觉平台：

- `http://localhost:3000` 服务在线；
- 未操作 PM2。

结果：

- UAT-010：Automated Pass / Pending Final Manual Spot Check；
- UAT-012：Automated Pass / Pending Final Manual Spot Check；
- UAT-009：Blocked by CR；
- UAT-011：Blocked by CR。

说明：

本次未通过浏览器提交会写入正式本地验收库的业务单据；核心业务写入闭环由 Service / Repository 自动化测试和全量 `pnpm check` 覆盖，端到端写入建议使用独立测试批次进行最终人工抽检。

## 13. UAT Batch 002-B Master Data UX Refactoring

测试模块：

- 产品分类
- 品牌
- 产品
- SKU
- 生产厂家
- 供应商
- 仓库
- 电商平台
- 店铺

处理结果：

- 产品分类增加中文预设和自定义录入，分类层级 / 显示顺序改为前端推导或默认；
- 产品与 SKU 在入口页合并展示为“产品 / SKU 规格”，底层数据对象保持分离；
- SKU 名称支持前端自动推导，Product / SKU 表单批量新增支持每行录入一个规格；
- SKU 批量新增逐条调用现有 SKU API，显示逐行成功 / 失败结果，失败行可单独重试；不新增批量 API，不具备原子批量或整体回滚；
- 厂家 / 供应商结算方式改为中文下拉；
- 仓库类型和责任主体改为中文下拉，排序字段隐藏；
- 平台与店铺在入口页合并展示为“平台 / 店铺”，底层数据对象保持不变；
- 编码自动生成未实现，UAT-009 继续保持 Blocked by CR。

自动化回归：

- `pnpm exec vitest run apps/admin/tests/master-data-page.test.tsx`：通过。
- 全量 `pnpm check`：通过。
- `pnpm status:check`：通过。
- `git diff --check`：通过。

浏览器冒烟：

- Master Data 入口可打开；
- 产品 / SKU 规格、平台 / 店铺组合入口可见；
- 产品分类、产品、SKU、厂家、供应商、仓库、平台、店铺新增表单可打开；
- 中文下拉、字段说明、默认值和隐藏字段规则符合本批设计；
- 批量 SKU 文案明确逐条调用现有 API，失败行单独重试；
- 控制台 error / warn 为 0；
- AI 视觉设计平台 `http://localhost:3000` 服务在线，未操作 PM2。

当前状态：

Local UAT In Progress，Batch 002-B Final Manual Spot Check 已通过，状态更新为 Verified / Closed。

## 14. UAT Batch 002-B Automated Verification

复核范围：

- 产品分类；
- 品牌；
- 产品 / SKU；
- 生产厂家；
- 供应商；
- 仓库；
- 平台 / 店铺；
- 基础资料统一 UX。

运行版本：

- 目标源码 Commit：`fb35f5de13796ae4b0fe67ee355f2bb0d4cf4561`；
- `http://localhost:3100/api/health`：Healthy；
- `http://localhost:3000`：AI 视觉设计平台在线，未操作 PM2。

自动化测试：

- `pnpm exec vitest run apps/admin/tests/master-data-page.test.tsx`：通过；
- `pnpm check`：通过；
- `pnpm status:check`：通过；
- `git diff --check`：通过。

自动复核结果：

- 产品分类：Automated Pass / Pending Final Manual Spot Check；
- 品牌：Automated Pass / Pending Final Manual Spot Check；
- 厂家：Automated Pass / Pending Final Manual Spot Check；
- 供应商：Automated Pass / Pending Final Manual Spot Check；
- 产品 / SKU：Automated Verification Passed / Pending Final Manual Spot Check；
- 仓库：Automated Verification Passed / Pending Final Manual Spot Check；
- 平台 / 店铺：Automated Verification Passed / Pending Final Manual Spot Check；
- 统一 UX：Manual Check Required。

已修复并通过最终自动复核：

- B002B-AF-001：Automated Verification Passed / Pending Final Manual Spot Check，单位下拉已补齐完整单位集并默认选中 `把`；
- B002B-AF-002：Automated Verification Passed / Pending Final Manual Spot Check，Warehouse 厂家选择器已通过条件显示复核；
- B002B-AF-003：Automated Verification Passed / Pending Final Manual Spot Check，Store 平台店铺标识已去除 UUID 技术文案。

仍需人工抽检：

- 产品分类同名防重复；
- Product 详情 / SKU 规格列表；
- SKU 失败行单独重试；
- 平台详情所属店铺与平台上下文新增店铺；
- 成功 / 错误反馈、Request ID、防重复提交和启用 / 停用二次确认。

当前状态：

Local UAT In Progress，Batch 002-B Automated Verification Passed；项目负责人 Final Manual Spot Check 已通过，Batch 002-B 状态更新为 Verified / Closed。

## 15. UAT-013 Product Category Preset Selection Issue

发现阶段：

Batch 002-B Final Manual Spot Check

测试模块：

- Master Data / Product Category
- 产品分类预设选择

新增问题：

- UAT-013

问题摘要：

产品分类预设功能中，选择“提琴”后，下拉列表无法切换到其他分类；吉他、尤克里里、配件、自定义无法选择。

当前状态：

Fixed / Pending Manual Verification

修复记录：

- 根因：产品分类预设使用浏览器原生 `datalist`，选择“提琴”后会按输入值过滤候选项，导致下拉仅剩“提琴”；
- 修复：将产品分类预设改为正式下拉选择，完整显示 `提琴`、`吉他`、`尤克里里`、`配件`、`自定义`；
- 默认：新增产品分类时默认选中 `提琴`；
- 边界：未修改 Category API、Database、Permission 或自动编码逻辑。

自动化回归：

- `pnpm exec vitest run apps/admin/tests/master-data-page.test.tsx`：通过；
- `pnpm check`：通过；
- `pnpm status:check`：通过；
- `git diff --check`：通过。

## 16. UAT Batch 002-C Core Business Completion

测试模块：

- 基础资料；
- 采购订单；
- 生产任务；
- 采购 / 生产质检；
- 采购 / 生产入库；
- 库存调整；
- 国内销售出库；
- 跨境发货；
- 销售退货。

处理结果：

- PC Admin 核心业务工作台继续保持中文业务表单、关联对象下拉、来源明细加载、状态中文映射、状态动作按钮、成功 / 失败反馈和 Request ID 保留；
- 表单帮助文案改为业务化说明，不再显示 UUID / JSON / DTO 等技术提示；
- 关联下拉缺少业务标签时不再回退展示内部 id；
- 补充 Workflow 状态中文映射，覆盖 `shipped`、`reversed`、`pending_validation`、`pending_confirmation` 等运行状态；
- 增加核心闭环自动化测试，确认采购、生产、质检、入库、库存调整、销售出库、跨境发货和销售退货均使用既有正式 API；
- 销售受限 MVP 继续复用 `OUT-*` 与 `SRT-*`，不新增 `/api/v1/sales`；
- 跨境发货单直连平台 / 店铺因 Frozen Database/API 未覆盖，记录为 CR 边界，不伪造前端字段。

当前状态：

- UAT-010：Fixed / Pending Verification；
- Batch 002-C：Fixed / Pending Verification；
- UAT-009：Blocked by CR；
- UAT-011：Blocked by CR。

自动化回归：

- `pnpm exec vitest run apps/admin/tests/workflow-page.test.tsx`：通过；
- `pnpm check`：通过；
- `pnpm status:check`：通过；
- `git diff --check`：通过。

待人工复验：

- 使用 `http://localhost:3100` 和 UAT 标识测试数据完成真实业务链路写入；
- 验证无需输入 JSON、内部 UUID、英文状态码或内部技术字段；
- 验证库存增加、库存减少、库存调整、跨境发货库存流转和库存流水；
- 验证状态刷新、成功反馈、错误提示和 Request ID。

## 17. UAT Batch 002-C Automated Verification

测试类型：

Automated / Read-only

测试范围：

- 基础资料 → 业务流程衔接；
- 采购 → 生产 → 质检 → 入库 → 库存闭环；
- 销售出库库存闭环；
- 跨境发货库存流转；
- 中文业务化体验。

测试结果：

Batch 002-C：Automated Pass / Pending Manual Business Verification

自动化检查：

- `pnpm exec vitest run apps/admin/tests/master-data-page.test.tsx apps/admin/tests/workflow-page.test.tsx`：通过，27 tests passed；
- `pnpm check`：通过；
- `pnpm status:check`：通过；
- `git diff --check`：通过。

运行环境：

- `http://localhost:3100/api/health`：Healthy，`application.status = ok`，`database.status = connected`；
- `http://localhost:3000`：服务有响应，未操作 PM2。

只读边界：

本次未创建测试产品、采购订单、入库单、出库单或跨境发货单，未写入 `inventories` 或 `inventory_transactions`。真实写入型业务验证保留为 Pending Manual Business Verification。

发现问题：

- B002C-OBS-001：只读限制与写入型业务操作存在范围冲突，已接受为本轮检查限制；
- B002C-CR-001：跨境发货平台 / 店铺持久化需 Database CR + API CR；
- B002C-CR-002：自动编码需 Business Rule CR + API CR，推荐 Database CR；
- B002C-CR-003：独立 Sales Admin API Route 需 API CR。

当前状态：

Local UAT In Progress，Batch 002-C Automated Pass，Pending Manual Business Verification。

## 18. UAT-009 Automatic Code Generation Deployment Verification

测试类型：

Migration Deployment / API Runtime Verification / Automated Regression

测试环境：

- Violin ERP：`http://localhost:3100`
- PostgreSQL：`localhost:5432`
- Database：`violin_erp_lite`
- Node：22.x

部署验证：

- `20260809090000_add_code_generation_foundation` 已部署；
- `code_generation_rules` 已创建并初始化 5 条规则；
- `code_sequences` 已创建并初始化 4 条流水；
- 未执行 reset、drop database、重新 Seed 或清空业务数据。

Health 验证：

- `GET /api/health`：HTTP 200；
- `application.status = ok`；
- `database.status = connected`。

真实 API 验证：

- Product 未提交 `productCode`，生成 `PRD-000001`；
- SKU 未提交 `skuCode`，型号 `L2`、尺寸 `4/4`、颜色 `黑色`，生成 `L2-44-BK`；
- Supplier 未提交 `supplierCode`，生成 `SUP-000001`；
- Manufacturer 未提交 `manufacturerCode`，生成 `MFR-000001`；
- Warehouse 未提交 `warehouseCode`，生成 `WH-000001`。

并发与兼容验证：

- 并发创建 Supplier 自动编码无重复；
- `code_sequences` 正确递增；
- 显式合法历史编码兼容；
- 重复显式编码被唯一约束拒绝；
- 失败事务未推进 Product 编码流水；
- 未发现 `max(code)+1` 路径。

前端验证：

- Admin 自动化测试覆盖编码字段隐藏和自动编码展示；
- 本轮真实浏览器点击式验证因 Browser 插件无可用交互输出且本地未安装 Playwright CLI，保留为 Final Manual Spot Check。

测试结果：

UAT-009：Automated Pass / Pending Final Manual Spot Check

## 19. Product / SKU Management Unified Refactoring

测试类型：

Implementation / Automated Regression Preparation

测试范围：

- Product 型号级主数据页面；
- SKU 产品型号选择；
- SKU 尺寸 × 颜色组合生成；
- SKU 编码预览与服务端生成规则；
- SKU 批量设置、逐行保存和失败重试；
- Product → SKU 管理导航。

测试结果：

Product / SKU Management UX Refactoring：Fixed / Pending Automated Verification

已执行自动化回归：

- `pnpm exec vitest run apps/admin/tests/master-data-page.test.tsx`：通过，15 tests passed；
- `pnpm --filter @violin-erp/api exec vitest run tests/master-data.test.ts`：通过，20 tests passed；
- `pnpm --filter @violin-erp/database exec vitest run tests/code-generation-service.test.ts`：通过，5 tests passed。

边界记录：

- 未新增 Database 字段、表或 Migration；
- 未新增 API Path；
- 未新增 Permission Code；
- 未新增 SKU 批量原子创建 API；
- 产品型号唯一性需 Database CR，当前保持 Blocked by Database CR；
- SKU Code 最终仍由服务端生成，前端仅预览。

待复验：

- 使用 `http://localhost:3100` 完成 Product 创建和 SKU 组合生成；
- 确认 `L2-44-BR`、`L2-44-BK`、`L2-34-BR`、`L2-34-BK`、`L2-12-BR`、`L2-12-BK` 预览正确；
- 确认用户无需录入 UUID、JSON、SKU Code 或 SKU Name；
- 确认已存在 SKU 标记和失败行重试。
