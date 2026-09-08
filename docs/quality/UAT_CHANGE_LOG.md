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

## 2026-09-08 Automatic Code Generation Phase 2（CR-007）

状态：Automated Verification Passed / Pending Manual Spot Check。Approved CR-007 / DEC-111 扩展四类自动编码，API_SPEC v1.11，复用既有编号表及事务行锁，无新Schema、API Path或Permission Code。

有效UAT账号正式HTTP登录/Session及浏览器登录通过。Category / Brand / Platform / Store HTTP编码分别为CAT-000023、BRD-000023、PLT-000026、STR-000021，数据库一致；四类PATCH改码拒绝，显式旧码沿用、重复409拒绝。浏览器四类实际创建、列表编码及编辑只读通过，Store关联正确且外部平台标识区分清楚。修复分类自定义文本入口及Store平台异步回显；控制台0 error，两次开发热更新warn，无应用新增异常，0个5xx。

完整pnpm check、状态与diff检查通过；前序真实PostgreSQL五项专项通过。本次12条E2E记录经正式API删除6条、停用6条，无直接SQL删除。三条测试店铺范围关联随停用店铺保留，未修改既有业务范围。详见 [专项报告](UAT_CODE_GENERATION_PHASE_2_VERIFICATION_REPORT.md)。不自动Verified / Closed。

## 2026-09-08 Master Data Delete Blocking Message UX Enhancement

复用既有引用预检查，补充内部业务摘要；产品命中 SKU 后仅增加两次整组存在性查询，说明 SKU 数量及库存/历史业务引用，其他基础资料返回对象化原因。保留并发 FK 保护、权限、系统前缀、停用引用、二次确认和原子审计，不修改删除条件、Database / Migration、公开 API Contract 或 Permission，不新增 UAT 编号。

专项 106 项通过；完整门禁 442 项通过 / 51 项条件性跳过，status:check / diff --check 通过。没有执行真实数据删除；前端沿用既有 message + Request ID 展示。状态 Fixed / Pending Manual Verification，待人工抽查，不自动关闭。修改范围及测试限制见 [基础资料删除策略报告](MASTER_DATA_DELETE_STRATEGY_REPORT.md)。

## 2026-09-07 Procurement Order Safe Delete

Approved CR-006 / DEC-110：新增 PUR-030 受控采购删除及前端二次确认，保守拒绝任何下游引用，取消单必须管理员与明确UAT标记；删除、明细及真实审计同事务，附件多态关联增加父单锁协调。无 Schema / Migration / Permission 变化，无阶段状态变更。

验证：默认门禁408通过/51条件跳过，真实Prisma专项13项通过；浏览器三角色模拟API、取消确认及刷新通过，控制台无error/warn。真实登录因配置密码不匹配未执行，未修改账号，待有效岗位账号人工复验。状态 Fixed / Pending Manual Verification，不新增UAT编号、不自动关闭。完整范围、风险及证据见 [采购安全删除报告](PROCUREMENT_ORDER_SAFE_DELETE_REPORT.md)。

## 2026-09-07 Procurement & Production Dual-Flow Alignment

将采购质检/采购入库与成品质检/成品入库入口明确分开，保留并验证生产直接创建。自动筛选合法来源并推导原单、可处理数量和版本号，修正完工确认/生产开始/入库确认请求编排，按状态显示中文动作，避免来源切换串单；保留独立采购付款、生产进度及分批完工。数据库、Frozen API、Permission、BUSINESS_RULES及Phase路线不变，无需CR。

验证：Admin双链7项+原工作台14项；默认质量门禁379项通过/38项条件性跳过；真实Prisma3项另行通过，生产+97、采购+98、2条流水、23条业务审计；浏览器模拟既有API完成23次动作，无控制台错误/警告。真实用例先生产、后采购，未删除或覆盖UAT数据。详细记录见 [双业务链报告](PROCUREMENT_PRODUCTION_DUAL_FLOW_ALIGNMENT_REPORT.md)。状态为 Fixed / Pending Manual Verification，不自动关闭。

## 2026-09-07 品牌安全删除 CR-005

Project Owner 批准品牌安全删除扩展，Product Manager Review Completed。品牌删除收紧为仅 administrator，前后端独立校验；编辑权限不再授权品牌删除。七类基础资料删除与真实 Prisma Audit 同事务提交，Audit 失败回滚删除；保留全部产品引用保护及并发 FK 错误业务化、二次确认、六类路由修复及中文异常响应。SYS- / SYSTEM- 明确为临时系统数据识别规则。同步 API_SPEC v1.9、Approved CR-005 和 DEC-109。

本批统一验证：`pnpm check` 372 项通过、35 项条件性跳过；其中新增真实 PostgreSQL 专项 5 项另行运行并通过，验证管理员限制、成功审计、真实 Audit INSERT 失败回滚、启用/停用产品引用和系统品牌保护。浏览器模拟 API 验证按钮权限、取消、成功刷新和引用提示通过；既有品牌数据比对一致。状态保持 Fixed / Pending Manual Verification，不直接关闭；完整修改文件和风险说明见 `MASTER_DATA_DELETE_STRATEGY_REPORT.md`。

## 2026-09-07 基础资料删除入口修复

修复已实现删除分支未导出 DELETE 方法的问题，以及基础资料前端对空响应直接 JSON 解析的问题。新增路由、页面响应、SKU 权限及引用保护回归测试，专项 72 项通过。覆盖产品、SKU、分类、供应商、厂家和仓库的既有入口，不新增 API、不修改数据库、权限或生命周期，不清理现有数据。修复与复核详情见 `MASTER_DATA_DELETE_STRATEGY_REPORT.md` 及 `UAT_TEST_RECORD.md`，状态为 Fixed / Pending Manual Verification。

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

### Product Model Unique Constraint and Product / SKU Final Verification

问题：

- Product 型号已作为 SKU 编码的型号来源，但数据库层未限制唯一；
- 重复型号会导致 `型号-尺寸-颜色` SKU 编码冲突；
- Product / SKU Management Refactoring 需要最终自动复核。

修改：

- 新增 CR-004 Product Model Unique Constraint；
- 新增 Migration `20260813090000_add_product_model_unique_constraint`；
- `products.product_name_en` 调整为必填；
- 新增唯一索引 `uq_products_product_name_en`；
- 新增 Check `ck_products_product_name_en_not_blank`；
- Product Create / Update 增加产品型号唯一性校验；
- Prisma Repository 将产品型号唯一冲突映射为“产品型号已存在，请使用其他型号”；
- 更新 `DATABASE_SPEC.md` 至 v2.7；
- 更新 API 产品型号唯一性说明；
- 新增 `UAT_PRODUCT_SKU_FINAL_VERIFICATION_REPORT.md`。

测试：

- Migration 部署前审计：空型号 0，重复型号 0；
- Migration `20260813090000_add_product_model_unique_constraint`：已应用；
- 数据库约束检查：NOT NULL、`uq_products_product_name_en`、`ck_products_product_name_en_not_blank` 均存在；
- Product 创建型号 `L2` 成功，生成 `PRD-000005`；
- SKU 创建成功：`L2-44-BR`、`L2-44-BK`、`L2-34-BR`、`L2-34-BK`、`L2-12-BR`、`L2-12-BK`；
- 重复 Product 型号返回“产品型号已存在，请使用其他型号”；
- 重复 SKU 组合被唯一约束拒绝；
- `pnpm exec vitest run apps/admin/tests/master-data-page.test.tsx`：通过；
- `pnpm --filter @violin-erp/api exec vitest run tests/master-data.test.ts`：通过；
- `pnpm --filter @violin-erp/database exec vitest run tests/code-generation-service.test.ts tests/master-data-repository.test.ts`：通过。

结果：

- 产品型号唯一性：Fixed / Pending Verification；
- Product / SKU Final Verification：Fixed / Pending Verification；
- 未新增 Product Model 字段；
- 未修改 SKU 编码规则；
- 未新增 API Path 或 Permission Code。

Commit：

`feat: enforce product model uniqueness`

### Master Data Delete Strategy Enhancement

问题：

- 基础资料仅支持停用；
- 本地 UAT 期间未被业务引用的测试基础资料无法清理；
- 已被业务引用的数据仍必须保护历史完整性。

修改：

- 为 Product Category、Product、SKU、Supplier、Manufacturer、Warehouse 增加安全删除入口；
- 删除前执行统一业务引用检查；
- 无业务引用时允许删除；
- 已被业务引用时返回“该数据已被业务单据引用，无法删除，请停用。”；
- 系统数据返回“系统数据不可删除。”；
- 前端列表增加删除按钮和二次确认；
- 新增 `MASTER_DATA_DELETE_STRATEGY_REPORT.md`；
- 同步 `API_SPEC.md` v1.8，新增 6 个受控 `MD-*` Delete API；
- 不新增 Permission Code，删除复用对应 `master.*.update` 权限。

测试：

- `pnpm exec vitest run apps/admin/tests/master-data-page.test.tsx`：通过；
- `pnpm --filter @violin-erp/api exec vitest run tests/master-data.test.ts`：通过；
- `pnpm --filter @violin-erp/database exec vitest run tests/master-data-repository.test.ts`：通过；
- `pnpm check`：通过。

结果：

- Master Data Delete Strategy Enhancement：Fixed / Pending Manual Verification；
- 未修改 Database Schema 或 Migration；
- 未新增 Permission Code；
- 未删除业务数据或历史业务记录。

### Batch 003-A Business Flow Verification

问题：

- 需要建立带 `UAT-003A` 标识的本地 UAT 测试数据；
- 需要验证基础资料、采购、生产、质检、入库、库存、销售出库、跨境发货是否能形成真实业务闭环。

修改：

- 新增 `UAT_BATCH_003_A_BUSINESS_FLOW_VERIFICATION_REPORT.md`；
- 更新 `UAT_TEST_RECORD.md`；
- 未修改业务代码；
- 未修改 Database Schema；
- 未修改 API Contract；
- 未修改 Permission；
- 未修改自动编码规则。

测试：

- 创建或复用 `UAT-003A` 基础资料；
- 采购订单 `PO-20260813-C425E71D`：创建、提交、审核通过；
- 生产任务 `PRO-20260813-33E1C694`：创建、提交、审核、开始生产、完工确认通过；
- 质检单 `INS-20260813-3B433C20`：确认合格 98、不合格 2；
- 入库单 `INB-20260813-B44FF97A`：确认入库，库存 `0 → 98`；
- 销售出库 `OUT-20260813-AA18C10B`：确认出库，库存 `98 → 88`；
- 跨境发货 `CBR-20260813-94147514`：确认发货，国内仓 `88 → 38`，在途仓 `0 → 50`；
- 海外库存导入：执行成功，在途仓 `50 → 0`，海外仓 `0 → 50`。

结果：

- Batch 003-A：Automated Verification Complete / Pending Manual Business Verification；
- 核心库存闭环通过；
- 发现 Audit 落库风险和 UAT 型号编码规则冲突，均记录为 Major。

### Batch 003-A Major Risk Consolidated Fix & Reverification

问题：

- B003A-001：创建类 Workflow / Inventory Workflow 缺少 `entityId` 时，审计 resourceId 可能写入 `collection`，与 `audit_logs.object_id` UUID 类型不兼容；
- B003A-002：产品型号实际允许 `L2`、`L101-BR`、`N101-BR` 等含连字符业务型号，但 SKU 自动编码服务此前只接受纯字母数字。

修改：

- Workflow / Inventory Workflow 审计 resourceId 改为优先使用 Repository 返回结果中的正式业务对象主键 `id`；
- 无正式对象主键时返回业务校验错误，不伪造 UUID，不关闭 Audit；
- 产品型号校验调整为允许字母、数字和单连字符分隔；
- SKU 生成时保留连字符并统一转为大写；
- SKU 自动编码不再使用 Product Code 作为型号兜底；
- 更新 `UAT_BATCH_003_A_BUSINESS_FLOW_VERIFICATION_REPORT.md`；
- 更新 `UAT_TEST_RECORD.md`。

测试：

- `pnpm --filter @violin-erp/api exec vitest run tests/workflow.test.ts tests/inventory-workflow.test.ts tests/master-data.test.ts`：通过；
- `pnpm --filter @violin-erp/database exec vitest run tests/code-generation-service.test.ts`：通过；
- 真实 Prisma 业务闭环复核：通过；
- 真实 `PrismaAuditWriter` audit_logs 落库复核：通过；
- SKU 编码验证：`L2-44-BK`、`L101-BR-44-BK`、`N101-BR-44-BK`、`UAT-003A-L3-44-BR` 均通过。

结果：

- B003A-001：Resolved；
- B003A-002：Resolved；
- 当前未发现未解决的 Blocker / Critical / Major；
- Batch 003-A：Automated Verification Passed / Pending Manual Business Verification。
