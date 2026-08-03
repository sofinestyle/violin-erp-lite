---
document_name: UAT Batch 002只读影响与可用性审计报告
project: Violin ERP Lite
version: 1.0
status: Draft
owner: Project Manager
created_date: 2026-08-03
updated_date: 2026-08-03
related_phase: Phase 10
---

# UAT Batch 002 Read-only Impact & Usability Audit

## 1. Executive Summary

本次审计为 Phase 10 Release & Acceptance 完成后的 Local UAT 只读审计。审计范围覆盖基础资料、核心业务流程、跨境运营视图、销售统计、权限与移动端体验。

结论：

- `UAT-001` 至 `UAT-008` 已关闭；`UAT-009` 自动编码仍为 `Blocked by CR`。
- 当前系统底层平台能力、数据对象和多数 API 能力已经存在，但 PC Admin 前端仍大量使用“通用工作台”模式，部分业务流程需要用户手写 JSON DTO、UUID、英文状态或技术字段。
- 核心业务继续人工验收前，建议先处理 Batch 002-A：采购、生产、质检、入库、出库、调整、跨境和销售退货的可操作表单、状态动作按钮和页面接线。
- 基础资料可先做一批无 CR 的低风险 UX 优化，包括下拉、默认值、说明文案、字段分组、枚举中文化和隐藏非普通用户字段。
- 自动编码、Product/SKU 一体化创建、批量 SKU 组合生成、平台/店铺合并管理等属于高价值优化，但需要先完成业务规则 / API / 测试影响评估；其中自动编码必须先走 CR。

是否适合继续人工验收：

- 基础资料查看、简单新增、启停：可以继续。
- 端到端业务闭环人工验收：建议暂停，先完成 Batch 002-A，否则人工验收会被 JSON、UUID、状态动作缺失和销售/统计接线缺失反复打断。

## 2. 审计环境与依据

### 2.1 执行范围

本次只执行：

- 读取代码；
- 读取 SSOT 文档；
- 静态检查路由、组件、API 分发和 DTO 校验；
- 新增本审计报告。

未执行：

- 未修改业务代码；
- 未修改本地业务数据；
- 未修改 Database Schema / Migration；
- 未修改 API Contract；
- 未修改 Permission；
- 未修改 ROADMAP / Phase 状态；
- 未提交任何 CR；
- 未操作 AI 视觉平台或 PM2。

### 2.2 关键依据

- `AGENTS.md`：Frozen / Approved SSOT 优先，冲突停止；
- `CURRENT_STATUS.md`：项目状态 `Completed / Approved`；
- `ROADMAP.md`：十阶段路线 Frozen，Phase 10 Completed / Approved；
- `BUSINESS_RULES.md`：现有编码沿用、库存唯一事实来源、防负库存等规则；
- `DATABASE_SPEC.md` / `DATABASE_ENUM_SPEC.md`：数据库对象、`warehouse_type` 正式值；
- `API_SPEC.md`：API v1 契约、DTO、状态动作、幂等和权限边界；
- Phase 8 各模块实现与最终验收文档；
- `UAT_ISSUE_LIST.md`、`UAT_TEST_RECORD.md`、`UAT_CHANGE_LOG.md`。

### 2.3 已确认的当前事实

| 项目 | 结论 |
| --- | --- |
| Project Status | Completed / Approved |
| Phase 8 | Completed / Approved / Frozen |
| Phase 9 | Completed / Approved |
| Phase 10 | Completed / Approved |
| UAT Batch 001 | UAT-001 至 UAT-008 Verified / Closed |
| UAT-009 | Blocked by CR |
| 本次代码修改 | 无 |

## 3. 用户反馈逐项结论

| 用户反馈 / 审计主题 | 结论 | 分类 | 等级 | CR 判断 |
| --- | --- | --- | --- | --- |
| 产品分类预设：提琴、吉他、尤克里里、配件、自定义 | 可通过初始化数据或前端引导低风险优化；不新增表字段 | UX Improvement | Major | 通常不需 DB/API CR；如写入正式业务规则需 Business Rule CR |
| 产品类型隐藏 | 技术上可由前端提交默认值且不改 API；但默认语义需负责人确认 | Change Candidate | Major | 不需 DB/API CR；建议 Business Rule / UI 决策 |
| 分类层级自动推导 | 当前 API 要求 `categoryLevel` 必填；前端可根据上级分类推导后提交 | UX Improvement | Major | 不需 API/DB CR |
| 显示顺序隐藏 / 默认 / 拖拽 | 当前 API 要求 `sortOrder` 必填；前端可默认 0 或按同级末尾生成 | UX Improvement | Major | 不需 API/DB CR；拖拽排序若新增批量排序 API 则需 API CR |
| Product/SKU 统一页面管理 | 当前可通过页面重构实现“产品详情 + SKU 列表”；批量原子创建产品和 SKU 需要新增组合 API | Change Candidate | Major | 分步提交不需 CR；原子批量创建需 API CR |
| SKU 名称自动生成 | 若基于已填写产品、尺寸、颜色在前端生成并提交，不改 API；正式规则需确认 | Change Candidate | Major | 可能需 Business Rule CR；不必然需 API/DB CR |
| 默认单位改为下拉 | 当前 API 为字符串；前端下拉提交既有字符串即可 | UX Improvement | Minor | 不需 CR |
| 安全库存改名为“最低安全库存”且默认 0 | 前端标签和默认值可改，不改 DTO | UX Improvement | Minor | 不需 CR |
| 结算方式下拉：预付、现结、月结、自定义 | 当前 API 为字符串；前端下拉兼容 | UX Improvement | Minor | 不需 CR |
| 平台 / 店铺合并管理 | 当前对象独立且 Store 已有关联 Platform；可做页面合并 | UX Improvement | Major | 不需 DB/API CR |
| 仓库类型中文下拉 | `warehouse_type` 正式值已冻结，前端映射中文即可 | UX Improvement | Minor | 不需 CR |
| 自动编码 | 与 BR-019、Create DTO 必填、并发安全和导入兼容相关 | Change Candidate | Major | 需要 Business Rule CR；很可能需要 API CR；如引入序列/租约需 DB CR |
| 核心业务流程人工可操作性 | 当前前端仍要求 JSON DTO / UUID，缺少状态动作按钮 | Incomplete Implementation | Critical | 多数不需 CR，但需前端实现 |
| 销售统计 / 分析导航 | `analytics` 路由存在但无内容；Sales Service 未接入 Admin API 分发 | Incomplete Implementation | Major | HTTP 接线复用既有 API 意图通常不需 CR；若新增路径需 API CR |

## 4. 基础资料专项审计

### 4.1 基础资料对象矩阵

| 对象 | 当前实现证据 | 当前可用程度 | 主要问题 | 建议 |
| --- | --- | --- | --- | --- |
| Product Category | `apps/admin/lib/master-data.ts` 中 `product-categories` 工作台 | 可新增 / 编辑，但要求手填层级和排序 | `categoryLevel`、`sortOrder` 直接暴露；编码手填 | 前端推导层级，排序默认同级末尾；预置分类入口 |
| Brand | `brands` 工作台 | 基本可用 | 编码手填；无常用品牌引导 | 保留手填，后续自动编码 CR 统一处理 |
| Product | `products` 工作台 | 已比 Batch 001 改进，可选分类 / 品牌 | `productType`、`defaultUnit` 仍手填；产品与 SKU 分离 | 隐藏产品类型默认值；单位下拉；详情页聚合 SKU |
| SKU | `skus` 工作台 | 可维护 | `skuName`、`unit`、价格、安全库存手填；名称与编码规则不清 | SKU 名称可自动建议；单位下拉；安全库存改名和默认 0 |
| Manufacturer | `manufacturers` 工作台 | 可维护 | 结算方式自由文本；敏感信息无表单分组 | 结算方式下拉；联系方式 / 结算信息分组 |
| Supplier | `suppliers` 工作台 | 可维护 | 结算方式自由文本；银行信息长表单 | 结算方式下拉；敏感字段折叠显示 |
| Warehouse | `warehouses` 工作台 | 可维护 | 仓库类型 / Owner Type 自由文本；排序手填 | 正式枚举中文下拉；按类型联动字段和默认值 |
| Ecommerce Platform | `ecommerce-platforms` 工作台 | 可维护 | 平台类型、国家代码手填；与 Store 分离 | 平台详情内嵌店铺列表；平台类型下拉 |
| Store | `stores` 工作台 | 可维护 | `externalStoreId` API 校验为 UUID，对真实平台店铺 ID 不友好 | 需确认外部店铺标识是否必须 UUID；可能需要 API/DB CR |

### 4.2 基础资料通用体验问题

| ID | 问题 | 分类 | 等级 | 证据 | 建议 |
| --- | --- | --- | --- | --- | --- |
| UX-001 | 编码字段在 9 类基础资料中均要求用户手填 | Change Candidate | Major | `MASTER_WORKBENCHES` 与 API definitions 均 required code | 保留 UAT-009，先 CR |
| UX-002 | 枚举或候选值字段以文本框呈现 | UX Improvement | Major | `productType`、`defaultUnit`、`settlementMethod`、`warehouseType`、`ownerType` | 改为下拉 / 说明，不改 DTO |
| UX-003 | 技术排序和层级字段直接暴露 | UX Improvement | Major | `categoryLevel`、`sortOrder` | 前端推导 / 默认 / 高级设置 |
| UX-004 | 列表仅展示编码、名称、状态、更新时间 | UX Improvement | Minor | `MasterDataWorkbench` 表头固定 | 按对象配置展示关键字段，如产品分类、品牌、仓库类型 |
| UX-005 | 导入按钮为预留 toast | Incomplete Implementation | Minor | “导入入口已预留；本 Task 不实现 Excel 导入逻辑。” | 若当前 UAT 不验导入，可标注“暂未开放”；否则接入 Import |

## 5. 产品分类与产品类型处理方案

### 5.1 预设分类

建议预设：

- 提琴；
- 吉他；
- 尤克里里；
- 配件；
- 自定义。

无 CR 方案：

1. 使用现有 `product_categories` 表创建初始化数据；
2. 前端分类下拉优先展示预设分类；
3. 保留新增自定义分类能力；
4. 不新增字段，不新增 API，不修改权限。

风险：

- 如果预设分类要成为正式业务规则，需要更新 Business Rules 或初始化数据文档；
- 若历史 Excel 已有不同分类名称，需要导入映射策略。

### 5.2 产品类型隐藏

当前事实：

- `products.product_type` 存在；
- API Create DTO 要求 `productType`；
- 当前页面将 `productType` 作为必填文本框。

无 DB/API CR 优化方案：

1. 前端隐藏普通用户的产品类型字段；
2. 前端按负责人批准的默认值提交；
3. 编辑详情中可在“高级信息”只读或管理员可见；
4. 查询和导入仍保留字段兼容。

需要确认：

- 默认值语义，例如 `standard`、`instrument` 或中文业务值；
- 是否允许不同产品类型承担后续筛选 / 报表语义。

CR 判断：

- 不需要 Database CR；
- 不需要 API CR；
- 如默认值成为正式规则，建议 Business Rule / UI Decision。

### 5.3 分类层级

当前事实：

- API 要求 `categoryLevel`；
- 服务端仅校验不能为 0；
- 页面要求用户手填数字。

无 CR 方案：

- 无上级分类：前端提交 `1`；
- 有上级分类：加载上级分类详情或 options 扩展数据后提交 `parent.categoryLevel + 1`；
- 编辑时如修改上级分类，重新计算；
- 页面只显示“一级 / 二级 / 三级”等中文层级。

风险：

- 当前 options 返回字段是否包含 `categoryLevel` 需确认；如果没有，可通过详情请求查询上级分类，不新增 API。

### 5.4 显示顺序

当前事实：

- API 要求 `sortOrder`；
- 页面要求普通用户理解数字排序。

无 CR 方案：

- 新增时默认 0 或同级末尾；
- 将排序放入“高级设置”；
- 列表中用“上移 / 下移”表达。

需要 API CR 的情况：

- 若要一次性拖拽批量更新多个分类排序，需要新增批量排序 API。

## 6. Product / SKU 合并方案

### 6.1 当前结构

当前页面结构：

```text
基础资料
├─ 产品管理
└─ SKU 管理
```

当前数据对象：

- `products` 独立；
- `skus` 独立；
- `skus.product_id` 关联产品。

当前 API 能力：

- Product / SKU 各自具备列表、详情、创建、编辑、启停；
- 当前没有“创建产品并批量创建 SKU”的组合 API；
- SKU 可以按 `productId` 过滤，但当前前端没有产品详情内嵌 SKU 列表。

### 6.2 推荐目标页面

```text
产品列表
  ↓
产品详情 / 编辑
  ├─ 产品基本信息
  ├─ 附件
  └─ SKU规格列表
       ├─ 新增单个 SKU
       ├─ 尺寸 / 颜色组合生成草稿
       └─ 启用 / 停用 SKU
```

### 6.3 分步提交方案（无 CR）

适用范围：

- 创建产品后再创建 SKU；
- 产品创建成功后进入产品详情；
- SKU 列表使用既有 `GET /api/v1/skus?productId=...`；
- SKU 创建使用既有 `POST /api/v1/skus`；
- 失败时只影响当前 SKU，不回滚已创建产品。

优点：

- 不改 API Contract；
- 不改 Database；
- 风险低，适合 Batch 002-C。

缺点：

- 不满足“产品 + 多 SKU 原子提交”；
- 多 SKU 批量失败需要逐条提示。

### 6.4 原子提交方案（需 API CR）

适用范围：

- 创建产品时一次性提交多个 SKU；
- 要求产品与全部 SKU 要么都成功、要么全部失败；
- 要求服务端统一校验、事务和错误明细。

CR 判断：

- 需要 API CR：新增组合创建 DTO 或扩展 Product Create DTO；
- 通常不需要 DB CR；
- 需要新增事务级服务和测试。

### 6.5 SKU 编码示例 `L2-44-BK`

建议规则方向：

| 片段 | 来源 | 示例 | 风险 |
| --- | --- | --- | --- |
| 型号 | Product Code 或产品型号字段 | `L2` | 当前无独立型号字段，若不使用 Product Code 需要 CR |
| 尺寸 | SKU `size` 标准化 | `44` | 需确认 `4/4`、`1/2` 等映射 |
| 颜色 | SKU `color` 映射 | `BK` | 需维护中文颜色缩写表 |

结论：

- SKU 名称可先由前端建议生成，例如“产品名称 + 尺寸 + 颜色”；
- SKU Code 正式自动生成必须纳入 UAT-009 CR，不应在前端随机生成。

## 7. Platform / Store 合并方案

### 7.1 当前结构

当前页面结构：

```text
基础资料
├─ 电商平台
└─ 店铺
```

当前数据对象：

- `ecommerce_platforms` 独立；
- `stores` 独立；
- `stores.platform_id` 关联平台。

### 7.2 推荐目标页面

```text
平台列表
  ↓
平台详情 / 编辑
  └─ 店铺列表
       ├─ 新增店铺
       └─ 启用 / 停用店铺
```

无 CR 方案：

- 平台详情内加载 `stores?platformId=...`；
- 新增店铺时自动带入 `platformId`；
- 保留独立 Store 数据对象和 API；
- 保留 Store 权限、Store Scope 和平台权限。

风险：

- 当前 `externalStoreId` 被 API 定义为 UUID；真实平台店铺 ID 往往是字符串。如果实际录入需要 “tmall_123 / Amazon 店铺 ID”，需要 API/DB CR 调整字段类型或新增展示字段。

## 8. 仓库管理审计

### 8.1 `warehouse_type` 正式值

`DATABASE_ENUM_SPEC.md` 冻结的正式值：

| 正式值 | 建议中文显示 | 用户说明 |
| --- | --- | --- |
| `company` | 公司仓 | 公司自有或内部管理仓库，可形成可用库存 |
| `manufacturer` | 厂家仓 | 厂家侧库存或生产相关仓库，需关联生产厂家 |
| `overseas` | 海外仓 | 海外仓库，必须填写国家代码 |
| `transit` | 在途仓 | 跨境或调拨过程库存，不形成可用库存 |
| `pending` | 待处理仓 | 异常、待处理或暂存库存，不形成可用库存 |

无 CR 方案：

- 前端使用中文下拉，提交正式英文值；
- 根据类型联动字段：
  - 厂家仓显示并要求生产厂家；
  - 海外仓显示并要求国家代码；
  - 在途 / 待处理自动设置 `allowsAvailableStock = false`。

### 8.2 Owner Type

当前事实：

- `ownerType` 为字符串；
- API 只做必填字符串校验；
- 当前没有 Frozen Enum。

建议中文下拉：

- 公司；
- 厂家；
- 海外服务商；
- 平台 / 店铺；
- 其他。

CR 判断：

- 如果仅前端下拉提交字符串，不需 API/DB CR；
- 若要将 owner type 冻结为正式枚举，需要 Database / API / Enum CR。

## 9. 核心业务不可用根因

### 9.1 共性根因

| 根因 | 证据 | 影响 |
| --- | --- | --- |
| 业务页面使用通用 WorkflowWorkbench | `apps/admin/components/workflow/workflow-workbench.tsx` | 表单不是业务表单，用户需要理解 DTO |
| 新增业务单据要求手写 JSON | 新增弹窗标签为“请求 DTO（JSON）” | 普通用户无法稳定创建采购、生产、质检、入库、出库等单据 |
| 父子单据通过 UUID 关键词定位 | `placeholder="输入所属单据 UUID"` | 采购付款、生产进度、分批完工等无法自然从父单进入 |
| 状态动作按钮缺失 | 页面仅有新增、详情、刷新，没有提交 / 审核 / 确认等动作按钮 | 无法完成端到端状态流转 |
| 详情显示 JSON | `JSON.stringify(selected, null, 2)` | 用户看到技术字段而不是业务详情 |
| 状态显示英文代码 | `StatusBadge` 直接显示 `row.status` | 用户需要理解内部状态机 |
| 销售服务未接入 Admin API 路由 | `SalesManagementService` 存在，但 API route 无 dispatchSales | 平台 / 店铺销售视图和销售统计不可通过前端使用 |
| `analytics` / `settings` 导航存在但无页面内容 | `WorkspacePlaceholderPage` 对非 workflow section 返回 `null` | 点击后内容区为空 |

### 9.2 流程可用程度矩阵

| 流程 | 菜单 / 路由 | 页面是否占位 | 新增按钮 | 表单完整性 | API 接线 | 状态动作 | 人工端到端可用程度 | 主要原因 | 优先级 | CR |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 采购流程 | 有 `/workspace/purchase` | 非占位 | 有 | JSON DTO | 有 Workflow API | 缺少按钮 | 低 | 无业务表单、无提交/审核按钮 | Critical | 通常不需 |
| 生产流程 | 有 `/workspace/production` | 非占位 | 有 | JSON DTO | 有 Workflow API | 缺少按钮 | 低 | 进度/完工需 UUID + JSON | Critical | 通常不需 |
| 质检流程 | 在采购/生产页内 | 非占位 | 有 | JSON DTO | 有 Workflow API | 缺少确认按钮 | 低 | 来源选择和数量平衡不友好 | Critical | 通常不需 |
| 入库流程 | 有采购/生产入库视图 | 非占位 | 有 | JSON DTO | 有 Workflow API | 缺少审核/确认 | 低 | 无来源验收选择器，无确认入库动作 | Critical | 通常不需 |
| 库存调整 | 有 `/workspace/inventory` | 非占位 | 有 | JSON DTO | 有 Inventory Workflow API | 缺少执行按钮 | 低 | 无调整前数量读取和服务端计算提示 | Critical | 通常不需 |
| 出库 | 有 `/workspace/warehouse-operations` | 非占位 | 有 | JSON DTO | 有 Inventory Workflow API | 缺少确认出库/冲销 | 低 | 无 SKU/仓库选择和库存可用量提示 | Critical | 通常不需 |
| 跨境发货 | 有 `/workspace/cross-border` | 非占位 | 有 | JSON DTO | 有 CBR Workflow API | 缺少发运按钮 | 低 | 三仓、运输方式、明细均需手填 JSON | Critical | 通常不需 |
| 销售退货 | 在出入库管理 | 非占位 | 有 | JSON DTO | 有 SRT Inventory Workflow API | 缺少确认入库 | 低 | 无原出库单选择、无退货处置表单 | Major | 通常不需 |
| 平台 / 店铺销售视图 | 导航有统计分析 | 内容为空 | 无 | 无 | Sales Service 未接 HTTP route | 不适用 | 不可用 | 前端和 API 分发缺失 | Major | 若复用既有路径意图可不需；新增路径需 API CR |
| Replenishment Suggestion | 无专门入口 | 跨境页未展示 | 不适用 | 不适用 | CBR summary 支持方向存在 | 不适用 | 低 | 前端未调用 `view=replenishment` | Major | 不需 |

## 10. 全系统用户体验审计

### 10.1 表单体验

| ID | 问题 | 分类 | 等级 | 建议 |
| --- | --- | --- | --- | --- |
| UX-FORM-001 | 业务表单直接暴露 JSON DTO | Incomplete Implementation | Critical | 为每个流程建立业务表单 |
| UX-FORM-002 | UUID 要求用户输入 | Incomplete Implementation | Critical | 使用下拉、搜索选择器、从父单详情进入子流程 |
| UX-FORM-003 | Enum / 状态 / 类型自由文本 | UX Improvement | Major | 使用中文下拉并提交 Frozen 值 |
| UX-FORM-004 | 货币、数量、日期、单位缺少专门控件 | UX Improvement | Major | 使用数字、日期、单位、金额输入控件 |
| UX-FORM-005 | 表单过长且无分组 | UX Improvement | Major | 基础信息、明细、附件、备注分区 |
| UX-FORM-006 | 保存前缺少业务影响摘要 | UX Improvement | Major | 出入库、调整、跨境发运增加二次确认和库存影响摘要 |

### 10.2 列表体验

| ID | 问题 | 分类 | 等级 | 建议 |
| --- | --- | --- | --- | --- |
| UX-LIST-001 | 通用列无法体现业务重点 | UX Improvement | Major | 按对象定制列 |
| UX-LIST-002 | 状态英文代码直接展示 | UX Improvement | Major | 状态中文映射 |
| UX-LIST-003 | 搜索框语义单一 | UX Improvement | Minor | 按对象增加供应商、仓库、SKU、日期筛选 |
| UX-LIST-004 | 编码比名称更突出 | UX Improvement | Minor | 名称优先，编码作为辅助信息 |

### 10.3 流程体验

| ID | 问题 | 分类 | 等级 | 建议 |
| --- | --- | --- | --- | --- |
| UX-FLOW-001 | 缺少下一步动作提示 | Incomplete Implementation | Critical | 根据状态显示下一步按钮 |
| UX-FLOW-002 | 不可操作原因不清晰 | UX Improvement | Major | 按权限、状态、数据范围显示禁用原因 |
| UX-FLOW-003 | 缺少流程进度展示 | UX Improvement | Major | 增加状态时间线和当前步骤 |
| UX-FLOW-004 | 重复录入来源信息 | UX Improvement | Major | 从来源单带入 SKU、数量、供应商、厂家、仓库 |

### 10.4 导航体验

| ID | 问题 | 分类 | 等级 | 建议 |
| --- | --- | --- | --- | --- |
| UX-NAV-001 | Product / SKU 拆分增加操作成本 | UX Improvement | Major | 产品详情聚合 SKU |
| UX-NAV-002 | Platform / Store 拆分增加操作成本 | UX Improvement | Major | 平台详情聚合店铺 |
| UX-NAV-003 | Analytics / Settings 空白 | Incomplete Implementation | Major | 增加正式页面或隐藏未开放入口 |
| UX-NAV-004 | 子流程没有从父单详情进入 | Incomplete Implementation | Major | 采购单详情进入付款/验收/入库，生产单详情进入进度/完工/验收 |

### 10.5 权限体验

| ID | 问题 | 分类 | 等级 | 建议 |
| --- | --- | --- | --- | --- |
| UX-PERM-001 | 无权限时容易只看到通用错误 | UX Improvement | Major | 按按钮级隐藏 / 禁用并说明缺少权限 |
| UX-PERM-002 | Data Scope 对用户不可见 | UX Improvement | Minor | 在筛选区显示“当前可见仓库 / 店铺范围” |
| UX-PERM-003 | 字段权限缺少可见性提示 | UX Improvement | Minor | 成本、金额、敏感信息被隐藏时显示“无权限查看” |

### 10.6 系统反馈

| ID | 问题 | 分类 | 等级 | 建议 |
| --- | --- | --- | --- | --- |
| UX-FEEDBACK-001 | Request ID 显示已改进，但流程表单错误仍粗糙 | UX Improvement | Major | JSON 表单改业务表单后做字段级定位 |
| UX-FEEDBACK-002 | 高风险操作缺少统一二次确认 | UX Improvement | Major | 提交、审核、确认、冲销统一确认文案 |
| UX-FEEDBACK-003 | 操作后刷新依赖当前页面 | UX Improvement | Minor | 成功后刷新详情和列表，保留上下文 |

### 10.7 中文化

| ID | 问题 | 分类 | 等级 | 建议 |
| --- | --- | --- | --- | --- |
| UX-I18N-001 | 状态、字段名、JSON、UUID 仍面向开发者 | UX Improvement | Major | 中文字段、中文状态、隐藏技术细节 |
| UX-I18N-002 | 国家代码、币种代码直接输入 | UX Improvement | Minor | 下拉或常用值快捷选择 |

### 10.8 移动端

| ID | 问题 | 分类 | 等级 | 证据 | 建议 |
| --- | --- | --- | --- | --- | --- |
| UX-MINI-001 | 小程序首页仍为壳层 | Incomplete Implementation | Major | `pages/index/index.tsx` 描述“业务内容尚未开始” | 明确 Phase 10 UAT 是否包含小程序；若包含需接入只读 Dashboard |
| UX-MINI-002 | 小程序业务页为静态入口 | Incomplete Implementation | Major | `pages/business/index.tsx` 仅显示卡片 | 接入采购、生产、验收只读 API |
| UX-MINI-003 | 小程序库存页仅 SKU 查询可跳转 | Incomplete Implementation | Major | `pages/inventory/index.tsx` 余额、流水、出入库、跨境无操作 | 接入只读库存、流水、出入库、跨境查询 |

## 11. 自动编码影响评估

### 11.1 当前事实

| 项目 | 当前状态 |
| --- | --- |
| Business Rules | BR-019 要求优先沿用现有产品编码和 SKU 编码，不建立无必要第二套平行编码 |
| API Create DTO | Category / Brand / Product / SKU / Supplier / Manufacturer / Warehouse / Platform / Store 编码均必填 |
| Database | 编码字段非空，迁移中存在 lower(code) 唯一索引 |
| Repository | 未发现统一编号生成器 |
| 并发安全 | 依赖唯一索引能防重复，但没有已批准的序列 / 租约生成策略 |
| 导入兼容 | 历史 Excel 可能携带既有编码，必须保留外部编码导入能力 |
| 编辑 | 当前可编辑编码字段，是否允许修改需要规则确认 |

### 11.2 覆盖对象

- Category Code；
- Brand Code；
- Product Code；
- SKU Code；
- Manufacturer Code；
- Supplier Code；
- Warehouse Code；
- Platform Code；
- Store Code。

### 11.3 推荐统一编码规范方向

| 对象 | 建议前缀 | 示例 | 说明 |
| --- | --- | --- | --- |
| Category | CAT | `CAT-VIOLIN` | 可用固定分类代码 |
| Brand | BRD | `BRD-001` | 品牌可序列化 |
| Product | PRD 或型号 | `L2` / `PRD-0001` | 如公司已有型号，应沿用 |
| SKU | 产品型号-尺寸-颜色 | `L2-44-BK` | 需尺寸和颜色标准化 |
| Supplier | SUP | `SUP-0001` | 可序列化 |
| Manufacturer | MFR | `MFR-0001` | 可序列化 |
| Warehouse | WH | `WH-CN-001` | 可结合仓库类型 / 地区 |
| Platform | PLT | `PLT-AMAZON` | 平台可固定代码 |
| Store | STO | `STO-AMZ-US-001` | 可结合平台和国家 |

### 11.4 CR 判断

| CR 类型 | 是否需要 | 原因 |
| --- | --- | --- |
| Business Rule CR | Required | 自动编码会改变 BR-019 “沿用现有编码”的录入边界和编码治理 |
| API CR | Required | 若 Create DTO 允许省略 code 或服务端生成 code，必须调整契约 |
| Database CR | Conditional | 若引入编号序列表、租约表、规则表或数据库默认生成，需要 DB CR；若仅服务端应用层生成且保持 code 字段不变，可能不需要 |
| Permission CR | Not Required | 自动编码不应新增权限 |

## 12. CR 矩阵

| 项目 | Database CR | API CR | Permission CR | Business Rule / UI Decision | 备注 |
| --- | --- | --- | --- | --- | --- |
| 产品类型隐藏并默认 | Not Required | Not Required | Not Required | Required | 默认语义需批准 |
| 分类层级前端推导 | Not Required | Not Required | Not Required | Not Required | 若 options 不足可查详情 |
| 显示顺序默认 | Not Required | Not Required | Not Required | Not Required | 拖拽批量排序需 API CR |
| 单位下拉 | Not Required | Not Required | Not Required | Not Required | 提交字符串 |
| 结算方式下拉 | Not Required | Not Required | Not Required | Not Required | 自定义仍写字符串 |
| 仓库类型中文下拉 | Not Required | Not Required | Not Required | Not Required | 提交 Frozen 值 |
| Owner Type 正式枚举 | Required | Required | Not Required | Required | 若只是前端下拉则不需要 |
| Product/SKU 分步合并页面 | Not Required | Not Required | Not Required | Not Required | 复用现有 API |
| Product + SKU 原子批量创建 | Not Required | Required | Not Required | Required | 新增组合 DTO |
| 自动编码 | Conditional | Required | Not Required | Required | 可能需要编号表 / 序列 |
| `externalStoreId` 改为自由文本 | Required | Required | Not Required | Required | 当前 DB/API 按 UUID |
| Sales API Admin Route 接线 | Not Required | Conditional | Not Required | Not Required | 若复用已批准路径不需 CR；新增路径需 API CR |
| Analytics 页面接线 | Not Required | Conditional | Not Required | Not Required | 复用既有 API 优先 |
| 小程序只读业务查询接线 | Not Required | Not Required | Not Required | Not Required | 若使用既有 API |

## 13. 分批实施路线

### Batch 002-A：核心业务可用性修复

优先级：Critical。

范围：

- 采购订单业务表单；
- 生产任务业务表单；
- 质检业务表单；
- 入库业务表单和确认入库动作；
- 出库业务表单和确认出库动作；
- 库存调整业务表单和执行调整动作；
- 跨境发货业务表单和发运动作；
- 销售退货业务表单和确认入库动作；
- 状态动作按钮、状态中文映射、二次确认和错误提示。

修改文件方向：

- `apps/admin/lib/workflow.ts`；
- `apps/admin/components/workflow/workflow-workbench.tsx`；
- 新增按业务流程拆分的表单组件；
- 必要时补充 `apps/admin/tests/workflow-page.test.tsx`。

测试要求：

- 每个流程至少覆盖创建表单渲染；
- 提交/审核/确认等状态按钮按权限和状态显示；
- JSON / UUID 不再暴露给普通操作路径；
- 错误详情和 Request ID 可见；
- 不修改 API / DB / Permission。

CR 要求：

- 预计 Not Required，前提是复用现有 API。

是否阻塞人工验收：

- 是。建议完成后再继续端到端业务 UAT。

### Batch 002-B：基础资料低风险 UX 优化

优先级：Major。

范围：

- 产品类型隐藏和默认；
- 分类层级推导；
- 显示顺序默认；
- 单位下拉；
- 结算方式下拉；
- 仓库类型中文下拉；
- Owner Type 前端候选；
- 敏感字段分组；
- 列表关键字段优化；
- 导入按钮如未开放则改为明确“暂未开放”状态。

修改文件方向：

- `apps/admin/lib/master-data.ts`；
- `apps/admin/components/master-data/master-data-workbench.tsx`；
- `apps/admin/tests/master-data-page.test.tsx`。

CR 要求：

- 大多数 Not Required；
- 产品类型默认值需项目负责人确认；
- Owner Type 若正式枚举化需 CR。

是否阻塞人工验收：

- 不完全阻塞，但会显著降低人工测试成本。

### Batch 002-C：Product/SKU 与 Platform/Store 页面重构

优先级：Major。

范围：

- 产品详情聚合 SKU 列表；
- SKU 从产品详情创建；
- SKU 名称自动建议；
- 平台详情聚合店铺列表；
- 店铺新增自动带入平台；
- 保留独立数据对象。

修改文件方向：

- `apps/admin/app/workspace/master-data/[resource]/page.tsx`；
- `apps/admin/components/master-data/*`；
- `apps/admin/lib/master-data.ts`。

CR 要求：

- 分步提交 Not Required；
- 批量原子创建 Product + SKU 需要 API CR。

是否阻塞人工验收：

- 不阻塞基础验收，但建议在批量录入前完成。

### Batch 002-D：自动编码 CR 与实施

优先级：Major。

范围：

- 提交 Business Rule CR；
- 提交 API CR；
- 判断是否需要 Database CR；
- 编码规则、前缀、序列、并发安全、导入兼容；
- 前端编码字段只读 / 隐藏；
- 导入保留外部编码兼容。

CR 要求：

- Required。

是否阻塞人工验收：

- 阻塞大规模真实数据录入，不一定阻塞小样本功能验收。

### Batch 002-E：全系统体验统一优化

优先级：Major / Minor。

范围：

- 状态中文化；
- 列表筛选增强；
- 权限禁用原因；
- 操作后刷新；
- Request ID 呈现规范；
- 小程序只读业务查询接线；
- Analytics / Settings 未开放入口处理。

CR 要求：

- 通常 Not Required；
- 若新增 API 路径则需 API CR。

是否阻塞人工验收：

- 部分阻塞：Analytics 空页面和 Sales 统计接线建议尽快处理。

## 14. 推荐优先级

1. Batch 002-A：先让核心业务流程不再依赖 JSON / UUID 手填，恢复端到端人工 UAT 可操作性；
2. Batch 002-B：立刻降低基础资料录入负担；
3. 修复 Analytics / Sales HTTP route / 前端页面接线；
4. Batch 002-C：做 Product/SKU 与 Platform/Store 聚合；
5. Batch 002-D：走自动编码 CR；
6. Batch 002-E：统一体验、权限提示和移动端只读能力。

## 15. 是否建议暂停人工验收

建议：

- 暂停端到端核心业务流程人工验收；
- 继续进行基础资料低风险验收和只读页面走查；
- 等 Batch 002-A 完成后再恢复采购 → 生产 → 质检 → 入库 → 库存 → 出库 → 跨境 → 销售统计完整链路验收。

原因：

- 当前核心流程可用性缺口主要在前端表单和状态动作，而非底层数据库或库存事务；
- 继续强行人工验收会把大量时间消耗在 JSON / UUID / 状态码输入上，不能真实反映业务用户体验；
- Batch 002-A 多数可复用既有 Frozen API，不应触发 DB/API/Permission 变更。

## 16. 本次审计最终结论

本次只读审计未发现必须立即修改 Database Schema、Migration、API Contract 或 Permission Spec 的问题。

但是，人工验收层面存在一个 Critical 级系统性问题：

> 后端和 API 能力已经较完整，但 PC Admin 的核心业务页面仍停留在通用技术工作台形态，尚未达到普通业务人员可直接操作的 ERP 页面体验。

因此，推荐将 UAT Batch 002 的第一批修复聚焦在“核心业务可操作性”，而不是先做自动编码或高级页面重构。自动编码价值高，但必须走 CR；核心业务表单与状态按钮则更适合作为无 CR 的紧急修复批次。
