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

Automated Pass / Pending Final Manual Spot Check

处理：

已完成 CR-001、CR-002、CR-003 第一阶段实施和本地 UAT Migration 部署验证。Product Code、SKU Code、Supplier Code、Manufacturer Code、Warehouse Code 已支持服务端自动生成；Category Code、Brand Code、Platform Code、Store Code 暂不纳入第一阶段。普通用户创建第一阶段对象时不再输入编码，创建后展示最终生成编码；历史已有编码保持不变，旧客户端提交合法编码继续兼容。CR-004 已批准并实施，产品型号唯一性已通过数据库唯一索引和 Product Create / Update 业务校验落地。

处理要求：

已完成评估：

- CR-001 已批准并定义第一阶段编码规则；
- CR-002 已批准并将第一阶段 Create DTO 编码字段调整为可选；
- CR-003 已批准并新增 `code_generation_rules` 与 `code_sequences`；
- 编码由统一 CodeGenerationService 服务端生成；
- 普通流水编码通过数据库事务与行级锁保证并发安全；
- SKU 组合编码由服务端基于型号、尺寸、颜色生成，并由既有 SKU 唯一约束裁决重复组合。
- 本地 UAT PostgreSQL 已部署 `20260809090000_add_code_generation_foundation`；
- `GET /api/health` 已恢复 HTTP 200，`application.status = ok`，`database.status = connected`；
- 真实 API 验证已生成 `PRD-000001`、`SUP-000001`、`MFR-000001`、`WH-000001` 和 `L2-44-BK`；
- 并发创建 Supplier 自动编码无重复；
- 显式合法历史编码兼容；
- 重复显式编码被唯一约束拒绝；
- 失败事务未推进 Product 编码流水。

待最终人工抽查：

- 创建 Product 时生成 `PRD-xxxxxx`；
- 创建 SKU 时生成 `型号-尺寸-颜色`；
- 创建 Supplier 时生成 `SUP-xxxxxx`；
- 创建 Manufacturer 时生成 `MFR-xxxxxx`；
- 创建 Warehouse 时生成 `WH-xxxxxx`；
- 确认普通表单不再要求用户输入上述编码。

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

Fixed / Pending Verification

处理：

已将核心业务通用工作台改造为中文业务表单、关联对象选择器、来源明细加载、状态中文映射、状态动作按钮和业务错误反馈。本批继续补齐业务化文案、状态中文映射和核心闭环自动化测试，确认采购、生产、质检、入库、库存调整、销售出库、跨境发货和销售退货均通过既有正式 API 进入人工复验阶段。跨境发货单直连平台 / 店铺、自动编码和独立 Sales API 仍按 CR 边界处理。

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

### UAT-013

模块：

Master Data / Product Category

页面：

产品分类

问题描述：

产品分类预设功能中，选择“提琴”后，下拉列表无法切换到其他分类。

当前表现：

- 下拉仅显示提琴；
- 吉他、尤克里里、配件、自定义无法选择。

期望结果：

预设分类应完整显示：

- 提琴
- 吉他
- 尤克里里
- 配件
- 自定义

实际结果：

仅显示部分分类。

问题类型：

UX / Configuration Bug

严重等级：

Major

影响：

产品基础资料创建受影响。

发现阶段：

Batch 002-B Final Manual Spot Check

状态：

Fixed / Pending Manual Verification

处理：

已修复。根因为产品分类预设使用浏览器原生 `datalist`，选择“提琴”后候选项会被输入值过滤为“提琴”本身，导致无法继续切换其他预设。现已改为正式下拉选择，完整保留 `提琴`、`吉他`、`尤克里里`、`配件`、`自定义` 五个预设；默认值为 `提琴`，用户可自由切换。未修改 Category API、Database、Permission 或自动编码逻辑。

发现日期：

2026-08-09

## 5. Batch 002-B Automated Verification Observations

说明：

本节记录 Batch 002-B Master Data UX Refactoring 的自动复核观察项，不新增 UAT 编号，不修改 Database / API / Permission，不关闭人工尚未确认的问题。

综合状态：

Verified / Closed

已自动通过并等待最终人工抽检：

- 产品分类：预设分类、自定义说明、分类层级隐藏 / 推导、显示顺序默认值；
- 品牌：品牌名称突出，品牌编码保留；
- 厂家：结算方式中文下拉与字段分组；
- 供应商：结算方式中文下拉与字段分组；
- 基础资料入口：`产品 / SKU 规格` 与 `平台 / 店铺` 组合入口可见。

已修复并通过最终自动复核：

- B002B-AF-001：Automated Verification Passed / Pending Final Manual Spot Check。Product / SKU 默认单位下拉已补齐完整单位集，并共用同一选项源；
- B002B-AF-002：Automated Verification Passed / Pending Final Manual Spot Check。Warehouse 生产厂家选择器已按责任主体条件显示，非厂家主体提交时忽略残留值；
- B002B-AF-003：Automated Verification Passed / Pending Final Manual Spot Check。Store 平台店铺标识已去除 UUID 技术说明，改为业务化中文说明。

Manual Check Required：

- 产品分类同名防重复；
- Product 详情 / SKU 规格列表；
- SKU 失败行单独重试；
- 平台详情所属店铺与平台上下文新增店铺；
- 成功 / 错误反馈、Request ID、防重复提交和启用 / 停用二次确认。

处理：

项目负责人 Final Manual Spot Check 已通过，Batch 002-B 已更新为 Verified / Closed。UAT-013 为最终抽查中发现的独立问题，已完成修复并等待人工复验。

## 6. Batch 002-C Core Business Completion

说明：

本节记录 Batch 002-C Core Business Completion 的实现与验收准备状态。本批不新增 UAT 编号，不修改 Database / API / Permission，不实现自动编码、BOM / MRP、财务模块或 AI 功能。

综合状态：

Fixed / Pending Verification

已完成并进入人工复验：

- 基础资料：产品分类、产品、SKU、供应商、生产厂家、仓库、平台、店铺均保持中文业务化入口；
- 采购：采购订单创建、提交、审核、驳回、撤回、反审核、取消等状态动作通过 `PUR-*`；
- 生产：生产任务创建、提交、审核、开始生产、进度和分批完工通过 `PRO-*`；
- 质检：采购来源和生产来源质检通过来源选择器与来源明细加载完成，不要求手填来源 UUID；
- 入库：采购 / 生产来源入库通过已确认验收单、目标仓库和入库明细完成，确认入库由后端事务更新库存与流水；
- 库存：库存调整通过仓库、SKU、方向和数量执行业务操作，确认由正式库存事务能力保障；
- 销售出库：销售受限 MVP 复用 `OUT-*` 与 `SRT-*`，不新增独立 Sales API；
- 跨境发货：跨境发货复用 `CBR-*`，支持来源仓、在途仓、海外仓、SKU、数量和确认发货。

CR 边界：

- UAT-009 自动编码：Approved for Implementation；
- UAT-011 独立 Sales Admin API Route：Blocked by CR；
- 跨境发货单直接保存平台 / 店铺：需要 Database CR + API CR，当前不伪造前端字段。

自动化回归：

- `pnpm exec vitest run apps/admin/tests/workflow-page.test.tsx`：通过；
- `pnpm check`：通过；
- `pnpm status:check`：通过；
- `git diff --check`：通过。

待人工复验：

- 使用 UAT 标识测试数据完成真实业务链路写入；
- 验证无需输入 JSON、内部 UUID、英文状态码或内部技术字段；
- 验证入库、出库、库存调整和跨境发货的库存流水与余额变化；
- 验证错误提示、Request ID、成功反馈和状态刷新。

## 7. Product / SKU Management Unified Refactoring

说明：

本节记录 Product / SKU Management Unified Refactoring 的 UAT 状态。本轮不新增无批准 Database 字段，不新增 API Path，不新增 Permission Code，不新增 SKU 批量原子创建 API。

综合状态：

Fixed / Pending Verification

已完成：

- Product 页面回归型号级主数据职责；
- `productNameEn` 前端语义调整为“产品型号”；
- Product Create 中产品型号不能为空；
- Product 页面移除 SKU 批量新增区域；
- Product 列表提供“SKU 管理”入口；
- SKU 页面以“产品型号”下拉选择 Product；
- SKU 新增主流程调整为尺寸 × 颜色组合生成；
- SKU 组合预览包含编码、名称、单位、价格和最低安全库存；
- SKU 保存仍逐条调用现有 SKU Create API；
- 自定义颜色必须输入受控色码，不直接使用中文生成 SKU Code；
- SKU 编码映射补齐 `1/8`、`1/10`、`1/16`、白色、红色、黄绿色等本轮要求。

CR-004 结果：

- 产品型号唯一性已落地；
- `products.product_name_en` 已设置为必填；
- 新增 `uq_products_product_name_en` 唯一索引；
- 新增 `ck_products_product_name_en_not_blank` 非空白 Check；
- Product Create / Update 重复型号返回“产品型号已存在，请使用其他型号”。

待人工复验：

- Product 创建与“SKU 管理”入口；
- SKU 产品型号下拉显示 `型号｜产品名称`；
- 组合生成 6 个指定 SKU；
- 批量设置与逐行编辑；
- 已存在 SKU 标记与失败行重试；
- 用户无需输入 UUID、JSON、SKU Code 或 SKU Name。
