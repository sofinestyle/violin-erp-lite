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
