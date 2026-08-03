---
document_name: UAT问题清单
project: Violin ERP Lite
version: 1.0
status: Draft
owner: Project Manager
created_date: 2026-07-26
updated_date: 2026-08-03
related_phase: Phase 10
---

# Violin ERP Lite UAT Issue List

## 1. 文档说明

本文件用于记录 Violin ERP Lite 人工验收（User Acceptance Test, UAT）阶段发现的问题。

本文件仅作为本地人工验收问题管理清单，不修改项目 Phase 状态，不替代正式 Database、API、Permission 或业务规则 SSOT。

## 2. 状态流转

Open

↓

Analyzing

↓

Approved

↓

Fixed

↓

Verified

↓

Closed

## 3. 问题等级

- Blocker
- Critical
- Major
- Minor
- Future

## 4. Issue List

### UAT-001

模块：

用户管理

页面：

用户编辑页面

问题描述：

打开“编辑用户”弹窗后，弹窗主体背景透明，底层页面内容穿透显示。

问题类型：

UI / UX Bug

严重等级：

Minor

影响：

不影响业务功能。影响页面可读性和操作体验。

发现阶段：

Local UAT

状态：

Verified / Closed

处理：

项目负责人已完成人工复验，用户编辑弹窗背景、遮罩和层级修复通过。

发现日期：

2026-07-26

### UAT-005

模块：

Authentication / Login

页面：

系统登录页

问题描述：

密码输入框后缺少“显示/隐藏密码”按钮。

期望结果：

用户可以点击图标切换密码明文与隐藏状态，默认仍为隐藏状态。

问题类型：

UI / UX Bug

严重等级：

Minor

影响：

不影响核心业务。影响登录页易用性。

发现阶段：

Local UAT

状态：

Verified / Closed

处理：

项目负责人已完成人工复验，登录密码显示 / 隐藏交互通过。

发现日期：

2026-08-02

### UAT-006

模块：

Dashboard / Home

页面：

系统首页

问题描述：

首页目前仍显示占位内容，未呈现正式 Dashboard 功能。

期望结果：

首页应按照已批准页面设计展示正式业务概览、快捷入口或统计信息。

问题类型：

Incomplete Implementation

严重等级：

Major

影响：

首页缺少正式 Dashboard 功能，影响人工验收对系统首页的完整性判断。

发现阶段：

Local UAT

状态：

Verified / Closed

处理：

项目负责人已完成人工复验，Dashboard MVP 首页通过。

发现日期：

2026-08-02

### UAT-007

模块：

App Shell / Navigation

页面：

左侧菜单及内容区域

问题描述：

点击左侧菜单切换页面时出现明显屏闪，视觉效果类似整个页面重新刷新，页面过渡不自然。

期望结果：

菜单切换应保持 App Shell 稳定，仅更新内容区域，不出现明显闪烁。

问题类型：

Frontend Navigation / UX Bug

严重等级：

Major

影响：

影响系统导航体验和页面稳定感。

发现阶段：

Local UAT

状态：

Verified / Closed

处理：

项目负责人已完成人工复验，Header / Sidebar 稳定，右侧内容区切换无明显白屏或闪屏。

发现日期：

2026-08-02

### UAT-008

模块：

Master Data / Product

页面：

新增产品

问题描述：

提交新增产品时失败。

错误信息：

请求数据校验失败

Request ID：

9e8e5237-d350-479c-9a3b-35132a5ba947

期望结果：

合法产品数据应能够成功保存；校验失败时应准确显示具体字段和原因。

问题类型：

Business Function Bug / Validation Bug

严重等级：

Critical

影响：

产品是采购、生产、库存等后续业务的基础资料。当前错误会阻塞核心业务验收。

发现阶段：

Local UAT

状态：

Verified / Closed

处理：

项目负责人已完成人工复验，产品新增与字段级校验提示通过。

备注：

后续排查时应利用 Request ID 检查服务端日志、请求 DTO、前端字段映射和校验错误响应。

发现日期：

2026-08-02

### UAT-009

模块：

Master Data / Code Generation

涉及对象：

- Product Code
- SKU Code
- Category Code
- Manufacturer Code
- Supplier Code
- Warehouse Code
- Platform Code
- Store Code
- 其他能够规则化生成的业务编码

问题描述：

当前基础资料录入要求用户手工填写多个业务编码。

业务期望：

所有能够按照规则生成的编码，应由系统自动生成，避免人工重复、格式不统一及录入错误。

问题类型：

Business Requirement / Usability Improvement

严重等级：

Major

影响：

人工填写业务编码会增加重复、格式不统一和录入错误风险。

发现阶段：

Local UAT

状态：

Blocked by CR

处理：

已完成影响评估。现有 Frozen 业务规则与 API Create DTO 均要求业务编码由用户提交，未批准统一自动编码规则；需要先提交业务规则 / API Change Request 后才能实施。

处理要求：

后续修复前必须评估：

- 现有业务规则是否已有编码规范
- 前端是否应隐藏或只读显示编码字段
- API Create DTO 是否要求编码必填
- Repository 是否已有编号生成器
- 唯一性及并发生成安全
- 是否涉及 Frozen API 或 Database

如涉及 API Contract、Database 或正式业务规则变化，必须先提交相应 CR。

发现日期：

2026-08-02

### UAT-002

模块：

Layout / Theme

页面：

全局Header

问题描述：

Light主题按钮点击无响应。

问题类型：

UI / UX Bug

严重等级：

Minor

影响：

不影响核心业务。主题切换功能不可用。

发现阶段：

Local UAT

状态：

Verified / Closed

处理：

项目负责人已完成人工复验，Header 主题按钮已移除且现有 Light 主题样式正常。

发现日期：

2026-07-26

### UAT-003

模块：

Layout / Notification

页面：

Header顶部工具栏

问题描述：

帮助问号图标、通知铃铛图标点击无响应。

问题类型：

UI / UX Bug

严重等级：

Minor

影响：

不影响业务流程。辅助功能不可用。

发现阶段：

Local UAT

状态：

Verified / Closed

处理：

项目负责人已完成人工复验，帮助与通知图标交互通过。

发现日期：

2026-07-26

### UAT-004

模块：

User Management

页面：

Header用户菜单

问题描述：

点击管理员头像区域直接退出系统。

期望：

- 用户管理
- 退出登录

实际：

直接执行退出。

问题类型：

Interaction Logic Bug

严重等级：

Major

影响：

存在误退出风险。

发现阶段：

Local UAT

状态：

Verified / Closed

处理：

项目负责人已完成人工复验，用户菜单与退出交互通过。

发现日期：

2026-07-26

### UAT-010

模块：

Core Business / PC Admin Workbench

页面：

采购、生产、质检、入库、库存调整、出库、跨境发货、销售退货业务工作台

问题描述：

核心业务页面仍以通用 Workflow Workbench 方式呈现，新增业务单据时要求用户理解并填写 JSON DTO、内部 UUID、英文状态码或技术字段，普通业务用户无法直接完成端到端操作。

期望结果：

PC Admin 应提供正式业务表单、关联对象下拉、明细行录入、中文状态、状态动作按钮、成功 / 失败反馈和 Request ID 保留；用户不得手工输入 JSON、UUID 或英文状态码。

问题类型：

Incomplete Implementation / Business Usability Bug

严重等级：

Critical

影响：

阻塞采购 → 生产 → 质检 → 入库 → 库存 → 出库 → 跨境 → 销售退货的端到端人工验收。

发现阶段：

Local UAT Batch 002

状态：

Automated Pass / Pending Final Manual Spot Check

处理：

已将核心业务通用工作台改造为中文业务表单、关联对象选择器、状态中文映射、状态动作按钮和业务错误反馈；自动化复核通过，待项目负责人进行最终人工抽检。

发现日期：

2026-08-03

### UAT-011

模块：

Sales Management / Admin API Route

页面：

统计分析 / 销售只读视图

问题描述：

`SalesManagementService` 与数据库仓储已存在，但 Admin API Route 未发现与 Frozen API Contract 对应的销售分析独立 Path。若直接新增 `/api/v1/sales/...` 路由，将构成新增 API Path。

期望结果：

Sales Admin API Route 只能接入已批准的正式 API Contract；若需要新增销售分析路径，应先提交 API Change Request。

问题类型：

Contract Boundary / API CR Required

严重等级：

Major

影响：

销售统计 / 平台店铺销售只读视图无法通过新增 Admin API Route 强行接入；但销售出库与销售退货流程仍可复用 OUT-* 与 SRT-*。

发现阶段：

Local UAT Batch 002

状态：

Blocked by CR

处理：

本批未新增销售分析 API Path，避免违反 Frozen API 约束；建议后续提交 API CR 明确 Sales Management 只读路由。

发现日期：

2026-08-03

### UAT-012

模块：

Workflow Workbench

页面：

采购、生产、质检、入库、库存调整、出库、跨境发货、销售退货新增 / 编辑表单

问题描述：

所有核心业务表单背景透明，底层列表、筛选栏和文字穿透显示；输入框、明细区与底层内容叠加，影响表单可读性和操作准确性。

期望结果：

业务表单 Overlay、主体、基本信息区、明细区、底部操作区和表单控件均应使用明确不透明背景；底层页面内容不得穿透；下拉、日期控件和表单内容层级应稳定。

问题类型：

UI / UX Bug

严重等级：

Critical

影响：

阻塞核心业务工作台新增 / 编辑表单的人工验收，影响采购、生产、质检、入库、库存调整、出库、跨境发货和销售退货操作。

发现阶段：

Local UAT

状态：

Automated Pass / Pending Final Manual Spot Check

处理：

已统一修复 Workflow Workbench 共用表单和详情抽屉的遮罩、主体背景、分区背景、表单控件背景、底部操作区和层级；自动化复核通过，待项目负责人进行最终人工抽检。

发现日期：

2026-08-03

## 5. Batch 002-B Automated Verification Observations

说明：

本节记录 Batch 002-B Master Data UX Refactoring 的自动复核观察项，不新增 UAT 编号，不修改 Database / API / Permission，不关闭人工尚未确认的问题。

综合状态：

Automated Fail with Partial Automated Pass / Pending Final Manual Spot Check

已自动通过并等待最终人工抽检：

- 产品分类：预设分类、自定义说明、分类层级隐藏 / 推导、显示顺序默认值；
- 品牌：品牌名称突出，品牌编码保留；
- 厂家：结算方式中文下拉与字段分组；
- 供应商：结算方式中文下拉与字段分组；
- 基础资料入口：`产品 / SKU 规格` 与 `平台 / 店铺` 组合入口可见。

Automated Fail：

- B002B-AF-001：Product / SKU 默认单位下拉未覆盖复核清单要求的完整单位集；
- B002B-AF-002：Warehouse 生产厂家选择器初始可见，未严格按责任主体条件显示；
- B002B-AF-003：Store 表单仍暴露外部店铺标识 UUID 相关说明。

Manual Check Required：

- 产品分类同名防重复；
- Product 详情 / SKU 规格列表；
- SKU 失败行单独重试；
- 平台详情所属店铺与平台上下文新增店铺；
- 成功 / 错误反馈、Request ID、防重复提交和启用 / 停用二次确认。

处理：

本轮仅记录自动复核结果，不进行代码修复；Batch 002-B 不得标记 Verified / Closed。
