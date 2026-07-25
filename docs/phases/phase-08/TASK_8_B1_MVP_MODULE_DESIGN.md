---
document_name: Task 8-B1 MVP Module Design and Impact Review
project: Violin ERP Lite
version: 1.0
status: Completed / Pending Approval
owner: Project Manager
created_date: 2026-07-25
updated_date: 2026-07-25
related_phase: Phase 8
---

# Task 8-B1：MVP Module Design and Impact Review

## 1. MVP Business Scope

本文件基于已完成的 `PHASE_8_APPLICATION_DEVELOPMENT_PLAN.md`，对 Phase 8 MVP 第一阶段业务模块进行模块设计与影响评估。

本阶段只做设计，不开发代码，不修改 Database Schema、Migration、API Contract、Permission、业务规则或平台能力。

### 1.1 MVP 第一阶段业务闭环

MVP 第一阶段目标是形成企业乐器产品管理的最小可运行业务闭环：

```text
基础资料中心
  ↓
采购 / 生产
  ↓
质量验收
  ↓
入库准备
  ↓
入库确认
  ↓
库存查询 / 库存流水
  ↓
基础出库
```

第一阶段包含三个业务模块：

1. Module 1 基础资料中心；
2. Module 2 采购生产基础闭环；
3. Module 3 库存基础闭环。

### 1.2 MVP 第一阶段包含范围

MVP 第一阶段包含：

1. 产品；
2. SKU；
3. 产品分类；
4. 品牌；
5. 配件；
6. 套装；
7. 供应商；
8. 生产厂家；
9. 仓库；
10. 平台；
11. 店铺；
12. 采购需求；
13. 采购订单；
14. 生产任务；
15. 厂家生产；
16. 质量验收；
17. 入库准备；
18. 入库；
19. 出库；
20. 库存查询；
21. 库存流水。

### 1.3 MVP 第一阶段不包含范围

MVP 第一阶段不包含：

1. AI 分析；
2. 高级 BI；
3. 外部平台自动同步；
4. 多级审批；
5. 复杂工作流引擎；
6. Job / Event / Dead Letter 管理页面；
7. Trace / Audit 查询扩展 API；
8. Redis、Kafka、RabbitMQ 或外部 MQ；
9. 单琴序列号管理；
10. 库位管理；
11. 套装拆装、BOM 成本核算或复杂组合库存；
12. 独立采购需求数据库对象，除非后续 DCR 批准。

### 1.4 业务事实来源

MVP 第一阶段必须遵守以下事实来源边界：

| Business Area | Fact Source |
| --- | --- |
| 产品 / SKU / 分类 / 品牌 | Database SSOT 中的 Master Data 表 |
| 供应商 / 厂家 / 仓库 / 平台 / 店铺 | Database SSOT 中的 Master Data 表 |
| 采购订单 | `purchase_orders` 及其明细 |
| 生产任务 | `production_orders` 及其执行记录 |
| 质量验收 | `inspection_orders` 及其明细 |
| 入库 | `inbound_orders` 及其明细 |
| 出库 | `outbound_orders` 及其明细 |
| 库存变化 | `inventory_transactions` |
| 审计 | `audit_logs` |
| 业务附件 | `attachments`、`attachment_links` |
| 幂等保护 | `idempotency_records` |
| 后台任务 | `jobs`、`job_attempts`、`job_results`、`job_dead_letters`、`scheduler_locks` |
| 事件传播 | `event_outbox`、`event_history`、`event_consumptions`、`event_deliveries`、`event_dead_letters` |

Event、Job、Cache、Logger、Metrics 或页面状态不得替代正式业务事实表。

## 2. Module Design

### 2.1 Module 1：基础资料中心

#### 2.1.1 业务目标

基础资料中心是 MVP 所有业务单据的共同入口，目标是建立稳定、可追溯、可权限控制的业务主数据。

覆盖对象：

1. 产品；
2. SKU；
3. 产品分类；
4. 品牌；
5. 配件；
6. 套装；
7. 供应商；
8. 生产厂家；
9. 仓库；
10. 平台；
11. 店铺。

设计原则：

1. 产品和 SKU 不建立平行数据源；
2. 配件优先按产品分类、产品类型或 SKU 属性管理，不新增独立配件事实表；
3. 套装遵守 BR-021，MVP 第一阶段按独立 SKU 管理；
4. 若后续需要套装组成、拆装、BOM、组合库存或配件专用生命周期，必须先提交 Database CR、API CR 和 Permission 影响评估；
5. 已被业务单据引用的基础资料不得物理删除，只允许停用或保留历史。

#### 2.1.2 页面范围

PC Admin 页面：

1. 基础资料总入口；
2. 产品列表 / 新增 / 编辑 / 详情 / 启用 / 停用；
3. SKU 列表 / 新增 / 编辑 / 详情 / 启用 / 停用；
4. 产品分类管理；
5. 品牌管理；
6. 配件资料视图；
7. 套装 SKU 视图；
8. 供应商管理；
9. 生产厂家管理；
10. 仓库管理；
11. 平台管理；
12. 店铺管理；
13. 附件关联入口；
14. 基础资料操作审计入口。

微信小程序页面：

1. 产品 / SKU 快速查询；
2. 供应商 / 厂家基础查询；
3. 仓库基础查询；
4. 店铺基础查询；
5. 附件查看。

小程序默认以查询和现场辅助操作为主，不承担复杂配置、批量清理或权限维护。

#### 2.1.3 核心流程

基础资料核心流程：

```text
创建 / 导入基础资料
  ↓
校验编码、名称、分类、关联对象
  ↓
保存正式主数据
  ↓
启用 / 停用
  ↓
被采购、生产、库存、出库等业务单据引用
  ↓
保留历史可追溯
```

关键校验：

1. 产品唯一性；
2. SKU 唯一性；
3. 分类、品牌、供应商、厂家、仓库、平台、店铺引用有效性；
4. 停用对象不得用于新业务单据；
5. 已引用对象不得破坏历史单据可读性。

#### 2.1.4 使用 Phase 7 能力

| Phase 7 Capability | Usage |
| --- | --- |
| Authentication | 所有页面和 API 请求必须认证 |
| Authorization | 使用 `master.*` 权限和数据范围控制 |
| Attachment | 产品图片、供应商资质、厂家资料等附件统一通过 Attachment Framework |
| Idempotency | 创建、导入、启用、停用等写操作使用幂等保护 |
| Job | 批量导入、批量校验、历史资料清洗可使用 Background Job |
| Event | 基础资料变更后可发布 Master Data Changed 事件 |
| Audit | 新增、修改、启用、停用、导入必须写入审计 |
| Trace / Logging / Metrics / Health | 贯通 `request_trace_id`，记录结构化日志和基础指标 |

### 2.2 Module 2：采购生产基础闭环

#### 2.2.1 业务目标

采购生产基础闭环负责从采购需求、采购订单、厂家生产、质量验收到入库准备的业务承接。

覆盖对象：

1. 采购需求；
2. 采购订单；
3. 生产任务；
4. 厂家生产；
5. 质量验收；
6. 入库准备。

设计原则：

1. MVP 第一阶段不默认新增独立 `purchase_requisitions` 表；
2. 采购需求默认作为采购订单创建前的页面级输入、草稿语义或采购订单来源说明处理；
3. 如项目负责人要求采购需求成为可审批、可追踪、可转单的正式业务对象，必须提交 Database CR、API CR 和 Permission CR；
4. 采购订单和生产任务必须遵守单级审核规则；
5. 质量验收是入库前置动作；
6. 厂家生产进度、完工和验收记录不得直接修改库存。

#### 2.2.2 页面范围

PC Admin 页面：

1. 采购需求录入 / 转采购订单入口；
2. 采购订单列表 / 新增 / 编辑 / 提交 / 撤回 / 审批 / 驳回 / 取消 / 作废 / 详情；
3. 采购订单明细；
4. 生产任务列表 / 新增 / 编辑 / 提交 / 审批 / 取消 / 详情；
5. 厂家生产进度记录；
6. 分批完工记录；
7. 质量验收列表 / 新增 / 提交 / 审批 / 详情；
8. 入库准备入口；
9. 采购、生产、质检附件入口；
10. 操作审计入口。

微信小程序页面：

1. 采购待办查询；
2. 生产任务查询；
3. 生产进度上报；
4. 完工上报；
5. 质量验收录入；
6. 附件拍照 / 上传 / 查看。

#### 2.2.3 核心流程

采购生产基础闭环：

```text
采购需求录入
  ↓
采购订单创建
  ↓
采购订单提交 / 审批
  ↓
生产任务创建
  ↓
厂家生产进度记录
  ↓
分批完工
  ↓
质量验收
  ↓
生成或进入入库准备
```

关键规则：

1. 采购订单审批后才能进入后续生产或验收流程；
2. 生产任务不得绕过采购、产品、SKU、厂家和仓库校验；
3. 质量验收必须记录验收结果和不合格数量；
4. 分批执行必须保留数量分层；
5. 付款、退货、复杂对账不作为 MVP 第一阶段核心闭环，但不得破坏既有字段和 API 边界；
6. 任何失败、取消、驳回、作废操作必须写入审计。

#### 2.2.4 使用 Phase 7 能力

| Phase 7 Capability | Usage |
| --- | --- |
| Authentication | 所有采购、生产、质检操作必须认证 |
| Authorization | 使用 `purchase.order`、`production.*`、`inspection.order` 权限 |
| Data Scope | 按厂家、仓库、店铺或角色范围过滤可见数据 |
| Attachment | 合同、凭证、质检照片、生产资料统一作为业务附件 |
| Idempotency | 提交、审批、取消、完工、验收等高风险写操作使用幂等 |
| Job | 批量导入采购单、生产单、质检记录或附件处理使用后台任务 |
| Event | 采购审批、生产完工、质检确认等已提交事实可发布事件 |
| Audit | 所有状态流转和关键字段变更必须审计 |
| Trace / Logging / Metrics / Health | 跨 HTTP、Service、Database、Job、Event 传递 `request_trace_id` |

### 2.3 Module 3：库存基础闭环

#### 2.3.1 业务目标

库存基础闭环负责入库、出库、库存查询和库存流水，是 MVP 第一阶段的业务闭环终点。

覆盖对象：

1. 入库；
2. 出库；
3. 库存查询；
4. 库存流水。

设计原则：

1. `inventory_transactions` 是库存变化事实来源；
2. 入库和出库必须由正式业务单据驱动；
3. 禁止页面、脚本、缓存、Job 或 Event 直接修改库存余额；
4. 库存查询可以读取库存汇总或流水派生结果，但不得替代库存事实；
5. 出库不得导致负库存；
6. 库存变更必须可追溯到来源单据、来源明细、操作人和时间。

#### 2.3.2 页面范围

PC Admin 页面：

1. 入库单列表 / 新增 / 编辑 / 提交 / 审批 / 确认 / 取消 / 详情；
2. 出库单列表 / 新增 / 编辑 / 提交 / 审批 / 确认 / 取消 / 详情；
3. 库存查询；
4. SKU / 仓库库存明细；
5. 库存流水；
6. 来源单据追溯；
7. 库存相关附件入口；
8. 库存操作审计入口。

微信小程序页面：

1. 入库待办；
2. 入库确认；
3. 出库待办；
4. 出库确认；
5. 库存快速查询；
6. 库存流水查看；
7. 附件拍照 / 上传 / 查看。

#### 2.3.3 核心流程

入库流程：

```text
质检通过 / 入库准备
  ↓
入库单创建
  ↓
入库单提交 / 审批
  ↓
入库确认
  ↓
写入 inventory_transactions
  ↓
库存查询可见
```

出库流程：

```text
出库业务来源
  ↓
出库单创建
  ↓
库存校验
  ↓
出库单提交 / 审批
  ↓
出库确认
  ↓
写入 inventory_transactions
  ↓
库存查询可见
```

关键规则：

1. 入库确认和出库确认必须原子化处理业务单据状态与库存流水；
2. 库存流水必须记录来源单据类型、来源单据 ID、来源明细 ID、SKU、仓库、数量、方向和操作人；
3. 出库确认前必须校验可用库存；
4. 撤销、取消或反向处理必须生成对应库存流水，不得删除历史流水；
5. 库存查询不得绕过数据范围和敏感字段规则。

#### 2.3.4 使用 Phase 7 能力

| Phase 7 Capability | Usage |
| --- | --- |
| Authentication | 入库、出库、库存查询必须认证 |
| Authorization | 使用 `inbound.order`、`outbound.order`、`inventory.*` 权限 |
| Data Scope | 仓库、店铺和角色范围控制库存可见性 |
| Attachment | 入库凭证、出库凭证、照片、单据附件统一关联 |
| Idempotency | 入库确认、出库确认、取消、反向处理必须幂等 |
| Job | 库存导入、批量校验、库存报表生成可使用后台任务 |
| Event | 入库确认、出库确认、库存流水生成后可发布事件 |
| Audit | 库存相关状态流转和流水生成必须审计 |
| Trace / Logging / Metrics / Health | 库存操作必须可按 `request_trace_id` 追踪 |

## 3. Database Impact

### 3.1 Existing Database v2.5 Coverage

Database Logical Design v2.5 已覆盖 MVP 第一阶段大部分正式业务对象：

| MVP Area | Existing Database Coverage | Assessment |
| --- | --- | --- |
| 产品 | `products` | 已覆盖 |
| SKU | `skus` | 已覆盖 |
| 产品分类 | `product_categories` | 已覆盖 |
| 品牌 | `brands` | 已覆盖 |
| 配件 | 可通过产品分类、产品属性或 SKU 语义表达 | MVP 已覆盖；独立配件生命周期需 DCR |
| 套装 | 按 BR-021 作为独立 SKU 管理 | MVP 已覆盖；套装组成需 DCR |
| 供应商 | `suppliers`、产品供应商关系 | 已覆盖 |
| 生产厂家 | `manufacturers`、产品厂家关系 | 已覆盖 |
| 仓库 | `warehouses` | 已覆盖 |
| 平台 | `ecommerce_platforms` | 已覆盖 |
| 店铺 | `stores` | 已覆盖 |
| 采购需求 | 当前无独立采购需求对象 | MVP 可用页面级输入 / 采购订单草稿语义；独立对象需 DCR |
| 采购订单 | `purchase_orders` 及明细 | 已覆盖 |
| 生产任务 | `production_orders` 及相关执行记录 | 已覆盖 |
| 厂家生产 | 生产进度、完工相关对象 | 已覆盖 |
| 质量验收 | `inspection_orders` 及明细 | 已覆盖 |
| 入库准备 / 入库 | `inbound_orders` 及明细 | 已覆盖 |
| 出库 | `outbound_orders` 及明细 | 已覆盖 |
| 库存查询 | 库存汇总 / 库存相关对象 | 已覆盖 |
| 库存流水 | `inventory_transactions` | 已覆盖 |
| 附件 | `attachments`、`attachment_links` | 已覆盖 |
| 审计 | `audit_logs` | 已覆盖 |
| 幂等 | `idempotency_records` | 已覆盖 |
| 后台任务 | `jobs` 等 Task 7.6 对象 | 已覆盖 |
| 事件 | Task 7.7 Event Infrastructure 对象 | 已覆盖 |

### 3.2 New Business Tables

默认 MVP 第一阶段不新增业务表。

Database CR 为 Not Required 的前提：

1. 采购需求不作为独立正式业务对象；
2. 配件不作为独立于产品 / SKU 的正式对象；
3. 套装按独立 SKU 管理，不维护组成明细；
4. 不新增跨业务汇总表；
5. 不新增独立 Dashboard、报表或导入结果事实表；
6. 不新增 Job / Event / Audit 管理页面所需查询表。

以下情况将触发 Database CR Required：

1. 新增 `purchase_requisitions` 或采购需求明细表；
2. 新增配件专用表、配件生命周期、配件库存或配件替代关系；
3. 新增套装组成、BOM、拆装流水、组合库存或套装成本表；
4. 新增业务状态字段、审批字段、扩展字段或统计字段；
5. 新增正式报表事实表或汇总快照表；
6. 修改已有业务表约束、索引、外键、Check Value 或字段可空性；
7. 修改 Frozen Platform 表。

### 3.3 New Fields

默认 MVP 第一阶段不新增字段。

如页面开发发现现有对象缺少展示字段或操作字段，必须先判断：

1. 是否已存在于 Database v2.5；
2. 是否可由已有关系或已有字段表达；
3. 是否只是前端临时输入；
4. 是否必须成为正式业务事实。

只有必须成为正式业务事实时，才提交 Database CR。

### 3.4 New Status / Enum / Check Value

默认 MVP 第一阶段不新增 PostgreSQL Enum，不新增状态值，不新增 Check Value。

如需要新增：

1. 采购需求状态；
2. 套装状态；
3. 配件状态；
4. 入库准备状态；
5. 库存业务动作类型；
6. 单据来源类型；

必须先提交 Database CR，并同步评估 API CR 和 Permission 影响。

### 3.5 Database CR Judgment

结论：

Database CR：Not Required（在 MVP 第一阶段复用现有 Database v2.5，并将采购需求、配件、套装限定在现有对象表达范围内的前提下）。

条件性结论：

Database CR：Required（如项目负责人要求采购需求、配件或套装组成成为独立正式业务对象，或要求新增字段、状态、Check Value、索引、约束、业务表）。

## 4. API Impact

### 4.1 Existing API Coverage

API Master Specification v1.5 已覆盖 MVP 第一阶段主要业务 API 类别：

| MVP Area | Existing API Category | Assessment |
| --- | --- | --- |
| 产品 / SKU / 分类 / 品牌 | Master Data API | 已覆盖 |
| 供应商 / 厂家 / 仓库 / 平台 / 店铺 | Master Data API | 已覆盖 |
| 采购订单 | Purchase API | 已覆盖 |
| 生产任务 / 厂家生产 | Production API | 已覆盖 |
| 质量验收 | Inspection API | 已覆盖 |
| 入库 | Inbound API | 已覆盖 |
| 出库 | Outbound API | 已覆盖 |
| 库存查询 / 库存流水 | Inventory API | 已覆盖 |
| 附件 | Attachment API | 已覆盖 |
| 导入 | Import API | 已覆盖 |
| 审计 / 安全 | Audit / Security API | 已覆盖 |

### 4.2 Potential Business API Needs

MVP 第一阶段实现时需要按 API Spec 逐项落地以下 API 能力：

1. Master Data：列表、详情、新增、编辑、启用、停用；
2. Purchase：采购订单创建、提交、撤回、审批、驳回、取消、作废、导出；
3. Production：生产任务创建、提交、审批、进度、完工、取消；
4. Inspection：质检创建、提交、审批、详情；
5. Inbound：入库单创建、提交、审批、确认、取消；
6. Outbound：出库单创建、提交、审批、确认、取消；
7. Inventory：库存查询、库存流水查询；
8. Attachment：上传、关联、下载、删除；
9. Import：批量导入、校验、执行；
10. Audit：按既有权限查看审计记录。

### 4.3 API CR Judgment

结论：

API CR：Not Required（在 MVP 第一阶段严格实现 API Master Specification v1.5 已冻结接口，不新增路径、DTO、状态、错误码或权限字段的前提下）。

以下情况将触发 API CR Required：

1. 新增独立采购需求 API；
2. 新增套装组成、拆装、BOM 或组合库存 API；
3. 新增配件专用 API；
4. 新增 Dashboard 聚合 API；
5. 新增 Job / Event / Dead Letter 管理 API；
6. 修改既有 DTO、错误码、响应结构、状态值或权限绑定；
7. 小程序为绕过现有业务接口而新增专用业务 API。

## 5. Permission Impact

### 5.1 Existing Permission Coverage

ROLE_PERMISSION_SPEC v1.0 已覆盖 MVP 第一阶段主要权限：

| MVP Area | Existing Permission Coverage | Assessment |
| --- | --- | --- |
| 产品 / SKU / 分类 / 品牌 | `master.product`、`master.sku`、`master.category`、`master.brand` | 已覆盖 |
| 供应商 / 厂家 / 仓库 / 平台 / 店铺 | `master.supplier`、`master.manufacturer`、`master.warehouse`、`master.platform`、`master.store` | 已覆盖 |
| 采购订单 | `purchase.order` | 已覆盖 |
| 生产任务 / 厂家生产 | `production.order`、`production.progress`、`production.completion` | 已覆盖 |
| 质量验收 | `inspection.order` | 已覆盖 |
| 入库 | `inbound.order` | 已覆盖 |
| 出库 | `outbound.order` | 已覆盖 |
| 库存查询 / 库存流水 | `inventory.stock`、`inventory.transaction` | 已覆盖 |
| 附件 | 附件相关权限与业务对象绑定 | 已覆盖 |
| 审计 | `audit.log` 等审计权限 | 已覆盖 |
| 敏感字段 | `field.*` 敏感字段权限 | 已覆盖 |

### 5.2 Role Impact

MVP 第一阶段不新增角色。

现有角色覆盖：

1. `admin`：系统管理员；
2. `manager`：业务管理者；
3. `procurement_staff`：采购人员；
4. `warehouse_staff`：仓库人员；
5. `sales_staff`：销售人员。

### 5.3 Data Scope Impact

MVP 第一阶段不新增 Data Scope 类型。

继续复用：

1. 全局范围；
2. 仓库范围；
3. 店铺范围；
4. 角色与对象派生的数据范围；
5. 敏感字段访问控制。

采购、生产、质检、入库、出库和库存查询必须按仓库、厂家、店铺、角色和业务对象关系进行后端数据范围校验。页面按钮和菜单可见性不能替代后端权限。

### 5.4 Sensitive Field Impact

MVP 第一阶段不新增敏感字段。

如采购价格、付款信息、供应商税号、联系方式、附件私有路径等字段涉及敏感访问，必须复用既有 Sensitive Field Access 规则，不得用前端隐藏替代后端控制。

### 5.5 Permission Judgment

结论：

Permission Code：Not Required。

Role：Not Required。

Data Scope：Not Required。

Sensitive Field：Not Required。

条件性结论：

如新增独立采购需求、套装组成、配件生命周期、Dashboard 管理、Job / Event 管理页面或新的高风险动作，则需要 Permission Change Request。

## 6. Event / Job Usage

### 6.1 Job Usage

MVP 第一阶段可使用 Job 的场景：

| Scenario | Job Usage |
| --- | --- |
| 基础资料批量导入 | 异步校验、执行、失败恢复 |
| 产品图片或附件批量处理 | 异步处理、失败重试 |
| 采购 / 生产 / 库存批量导入 | 长耗时校验和执行 |
| 库存报表或导出 | 异步生成结果 |
| 附件物理删除 | 复用 Attachment 既有后台删除闭环 |

Job 使用边界：

1. Job 不替代业务状态；
2. Job 不直接绕过业务服务修改库存；
3. Job 执行失败不得自动修改业务事实；
4. Job 的重试必须结合幂等机制；
5. Job 结果只作为任务执行结果，不作为业务事实来源。

### 6.2 Event Usage

MVP 第一阶段可发布 Event 的业务动作：

| Business Action | Event Direction |
| --- | --- |
| 产品 / SKU / 分类 / 品牌变更 | Master Data Changed |
| 供应商 / 厂家 / 仓库 / 平台 / 店铺变更 | Master Data Changed |
| 采购订单提交 / 审批 / 取消 / 作废 | Purchase Order Lifecycle |
| 生产任务提交 / 审批 / 进度 / 完工 | Production Lifecycle |
| 质量验收提交 / 审批 | Inspection Lifecycle |
| 入库确认 | Inbound Confirmed |
| 出库确认 | Outbound Confirmed |
| 库存流水生成 | Inventory Transaction Created |
| 批量导入完成 / 失败 | Import Lifecycle |

Event 使用边界：

1. Event 只传播已提交业务事实；
2. Event 不替代业务表；
3. Event 不替代库存流水；
4. Event 不替代 Audit；
5. Job Queue 不替代 Event Bus；
6. Event Consumer 必须使用消费幂等。

### 6.3 Audit Usage

MVP 第一阶段必须审计：

1. 登录成功 / 失败；
2. 权限拒绝；
3. 基础资料新增、修改、启用、停用；
4. 采购订单状态流转；
5. 生产任务状态流转；
6. 生产进度和完工记录；
7. 质量验收状态流转；
8. 入库单状态流转和确认；
9. 出库单状态流转和确认；
10. 库存流水生成；
11. 附件上传、下载、关联、删除；
12. 批量导入、导出；
13. Job 生命周期关键事件；
14. Event 发布、消费、失败、Dead Letter。

Audit 使用边界：

1. `audit_logs` 是审计事实来源；
2. Logger 不替代 Audit；
3. Event History 不替代 Audit；
4. Job Attempt 不替代 Audit；
5. Metrics 不替代 Audit。

## 7. Development Order

### 7.1 PC Admin Development Order

PC Admin 是 MVP 第一阶段主开发端，建议顺序：

1. Phase 8-B1 MVP Module Design & Impact Review；
2. Phase 8-B2 Master Data Implementation Design；
3. 基础资料入口与列表框架；
4. 产品 / SKU / 分类 / 品牌页面；
5. 供应商 / 生产厂家页面；
6. 仓库 / 平台 / 店铺页面；
7. Master Data API 接入、权限校验、审计、附件；
8. 采购订单页面；
9. 生产任务页面；
10. 生产进度和完工页面；
11. 质量验收页面；
12. 入库准备和入库页面；
13. 库存查询和库存流水页面；
14. 出库页面；
15. 批量导入、导出、后台任务接入；
16. Event、Audit、Trace、Metrics 一致性复核；
17. MVP 端到端测试和验收。

### 7.2 微信小程序 Development Order

微信小程序建议在 PC Admin 基础流程稳定后推进：

1. 登录 / 当前用户 / 权限摘要；
2. 首页工作台；
3. 产品 / SKU 快速查询；
4. 采购待办；
5. 生产任务和生产进度；
6. 质量验收；
7. 入库待办和入库确认；
8. 出库待办和出库确认；
9. 库存查询；
10. 库存流水查看；
11. 附件拍照、上传和查看；
12. 我的操作记录。

### 7.3 Implementation Gate

进入任何代码实现前必须确认：

1. Phase 8 正式状态允许开发；
2. 当前实现任务已明确获批；
3. 本设计文档状态已获项目负责人批准；
4. 若涉及新增数据库对象、字段、状态或约束，DCR 已批准；
5. 若涉及新增或修改接口，API CR 已批准；
6. 若涉及新增权限、角色、数据范围或敏感字段，Permission CR 已批准。

## 8. MVP Acceptance Criteria

MVP 第一阶段完成标准：

### 8.1 Business Flow Acceptance

1. 能创建并维护产品、SKU、分类、品牌、供应商、厂家、仓库、平台和店铺；
2. 能从基础资料创建采购订单；
3. 能完成采购订单提交、审批、取消或作废；
4. 能创建并跟踪生产任务；
5. 能记录厂家生产进度和分批完工；
6. 能完成质量验收；
7. 能从验收或业务来源进入入库准备；
8. 能创建、提交、审批并确认入库；
9. 入库确认后生成正式库存流水；
10. 能创建、提交、审批并确认出库；
11. 出库确认后生成正式库存流水；
12. 能查询库存余额、库存明细和库存流水；
13. 能按来源单据追溯库存流水。

### 8.2 Platform Reuse Acceptance

1. 所有业务 API 通过 Authentication；
2. 所有业务 API 执行 RBAC、Permission、Data Scope 和 Sensitive Field Access；
3. 高风险写操作复用 Persistent Idempotency；
4. 附件复用 Attachment Framework；
5. 长耗时任务复用 Background Job；
6. 已提交事实传播复用 Event Infrastructure；
7. 关键操作写入 `audit_logs`；
8. HTTP、Service、Database、Job、Event、Consumer 链路贯通 `request_trace_id`；
9. 结构化日志完成敏感信息脱敏；
10. 基础 Metrics 和 Health Provider 可观测。

### 8.3 Governance Acceptance

1. 不修改 Frozen Business Rules；
2. 不绕过 Database SSOT；
3. 不绕过 API Spec；
4. 不绕过 Permission Spec；
5. 不使用 Event、Job、Cache、Logger 或 Metrics 替代业务事实；
6. 如发现设计不足，先提交 CR，不直接实现变更；
7. `pnpm status:check` 通过；
8. `pnpm check` 在实现阶段通过；
9. `git diff --check` 通过。

### 8.4 Data Integrity Acceptance

1. 产品、SKU、供应商、厂家、仓库、平台、店铺不存在平行事实源；
2. 已引用主数据历史可追溯；
3. 库存变化全部来自正式业务单据；
4. `inventory_transactions` 可完整解释库存变化；
5. 出库不得产生负库存；
6. 取消、撤销或反向处理不得删除历史流水；
7. 审计记录、Trace、Job、Event 与业务事实可关联但不替代业务事实。

## 9. Impact Review Conclusion

| Impact Area | Judgment | Notes |
| --- | --- | --- |
| Database CR | Not Required | 前提是 MVP 第一阶段复用 Database v2.5，不新增采购需求、配件、套装组成等独立对象 |
| API CR | Not Required | 前提是严格实现 API Spec v1.5 已冻结接口 |
| Permission Change | Not Required | 现有权限、角色、数据范围和敏感字段覆盖 MVP 第一阶段 |
| Frozen Document Impact | Not Required | 本文件只做模块设计与影响评估，不修改 Frozen 文档 |
| Code Impact | Not Required | 本阶段禁止代码开发 |
| Migration Impact | Not Required | 本阶段禁止数据库迁移 |

条件性 CR：

1. 独立采购需求对象：Database CR、API CR、Permission CR Required；
2. 套装组成 / BOM / 拆装：Database CR、API CR、Permission CR Required；
3. 配件独立生命周期：Database CR、API CR、Permission CR Required；
4. 新 Dashboard 聚合接口：API CR Required，可能需要 Database CR；
5. 新状态、字段、Check Value、索引或约束：Database CR Required；
6. 新角色、权限代码、数据范围或敏感字段：Permission CR Required。

当前推荐：

在不触发 CR 的前提下，Phase 8 MVP 第一阶段可以按现有 Database v2.5、API Spec v1.5、ROLE_PERMISSION_SPEC v1.0 和 Phase 7 Frozen Platform Foundation 进入后续实施设计。
