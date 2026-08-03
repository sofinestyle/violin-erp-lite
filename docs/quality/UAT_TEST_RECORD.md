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

Local UAT In Progress，Batch 002-B 等待项目负责人进行人工复验。

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

Local UAT In Progress，Batch 002-B Automated Verification Passed，进入 Final Manual Spot Check；暂不得标记 Verified / Closed。
