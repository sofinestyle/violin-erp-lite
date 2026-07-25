---
document_name: Task 8-B2 Master Data Implementation Design
project: Violin ERP Lite
version: 1.0
status: Completed / Pending Approval
owner: Project Manager
created_date: 2026-07-25
updated_date: 2026-07-25
related_phase: Phase 8
---

# Task 8-B2-1：Master Data Implementation Design

## 1. Business Scope

本文件基于 `PHASE_8_APPLICATION_DEVELOPMENT_PLAN.md` 与 `TASK_8_B1_MVP_MODULE_DESIGN.md`，完成 Module 1 基础资料中心的实施设计与影响评估。

本阶段只做设计，不开发代码，不修改 Database Schema、Migration、API Contract、Permission 或业务规则。

### 1.1 Module 1 定位

基础资料中心是 Phase 8 MVP 第一阶段的业务入口，为采购、生产、质量验收、入库、出库、库存查询、跨境业务和销售分析提供统一主数据。

Module 1 必须遵守：

1. BR-001 产品唯一原则；
2. BR-006 历史数据保护原则；
3. BR-019 现有编码沿用规则；
4. BR-021 套装独立 SKU 规则；
5. BR-033 双端统一规则；
6. BR-034 PC 管理端规则；
7. Database Logical Design v2.5；
8. API Master Specification v1.5；
9. Frozen `ROLE_PERMISSION_SPEC.md`；
10. Phase 7 Frozen Platform Foundation。

### 1.2 Object Scope Summary

| Object | 业务目标 | 使用场景 | 页面范围 | 生命周期 |
| --- | --- | --- | --- | --- |
| Product | 建立产品正式档案 | 采购、生产、库存、出库、跨境、报表 | PC 完整维护；小程序查询 | draft / active / inactive 语义，由创建、更新、启用、停用表达 |
| SKU | 建立库存与交易最小管理单元 | 库存流水、入库、出库、采购明细、生产明细 | PC 完整维护；小程序查询 | 创建、更新、启用、停用；已引用 SKU 保留历史 |
| Category | 管理产品分类结构 | 产品归类、筛选、报表 | PC 维护；小程序筛选 | 创建、更新、启用、停用 |
| Brand | 管理品牌资料 | 产品归属、筛选、统计 | PC 维护；小程序筛选 | 创建、更新、启用、停用 |
| Supplier | 管理采购供应商 | 采购订单、入库来源、付款记录 | PC 维护；小程序查询 | 创建、更新、启用、停用；敏感字段受控 |
| Manufacturer | 管理生产厂家 | 生产任务、厂家仓、质检来源 | PC 维护；小程序查询 | 创建、更新、启用、停用；敏感字段受控 |
| Warehouse | 管理公司仓、厂家仓、海外仓、在途仓、待处理仓 | 库存、入库、出库、调拨、跨境 | PC 维护；小程序查询 | 创建、更新、启用、停用；受 `warehouse_type` 约束 |
| Platform | 管理电商平台 | 店铺、销售出库、跨境导入 | PC 维护；小程序查询 | 创建、更新、启用、停用 |
| Store | 管理平台店铺 | 出库、销售、店铺数据范围 | PC 维护；小程序查询 | 创建、更新、启用、停用；受 Store Data Scope 控制 |
| Accessory | 以产品分类、产品属性或 SKU 语义表达配件 | 配件查询、采购、库存、出库 | PC 通过产品/SKU 视图维护；小程序查询 | 复用 Product / SKU 生命周期 |
| Package | 按 BR-021 作为独立 SKU 表达套装 | 套装销售、套装库存、套装出库 | PC 通过 SKU 视图维护；小程序查询 | 复用 SKU 生命周期；不管理套装组成 |

### 1.3 Object Detail

#### 1.3.1 Product

业务目标：

建立唯一产品档案，作为 SKU、采购、生产、库存、附件、统计和报表的上层主数据。

使用场景：

1. 产品列表与筛选；
2. 产品详情；
3. SKU 归属；
4. 采购与生产选品；
5. 附件关联；
6. 库存、出库、跨境和报表引用。

页面范围：

1. PC Admin：产品列表、新增、编辑、详情、启用、停用、附件、审计入口；
2. 微信小程序：产品查询、产品详情、关联 SKU 查询。

生命周期：

```text
创建
  ↓
启用
  ↓
被业务单据引用
  ↓
更新非破坏性字段
  ↓
停用
  ↓
历史保留
```

#### 1.3.2 SKU

业务目标：

建立库存、采购、生产、入库、出库和库存流水引用的最小业务管理单元。

使用场景：

1. SKU 查询；
2. 采购订单明细；
3. 生产任务明细；
4. 入库明细；
5. 出库明细；
6. 库存查询；
7. 库存流水。

页面范围：

1. PC Admin：SKU 列表、新增、编辑、详情、启用、停用、附件、库存入口；
2. 微信小程序：SKU 快速查询、库存查询、扫码或编码查询。

生命周期：

```text
创建
  ↓
启用
  ↓
进入业务单据与库存流水
  ↓
必要字段更新
  ↓
停用
  ↓
历史保留
```

#### 1.3.3 Category

业务目标：

为产品、配件、套装视图和报表提供分类维度。

使用场景：

1. 产品分类维护；
2. 产品列表筛选；
3. SKU 查询筛选；
4. 配件视图筛选；
5. 报表统计。

页面范围：

1. PC Admin：分类列表、新增、编辑、详情、启用、停用；
2. 微信小程序：分类筛选和查询。

生命周期：

创建、启用、更新、停用。已被产品引用的分类不得物理删除或破坏历史可读性。

#### 1.3.4 Brand

业务目标：

维护品牌主数据，用于产品归属、采购、库存查询和统计分析。

使用场景：

1. 产品维护；
2. SKU 筛选；
3. 采购选品；
4. 库存统计；
5. 报表维度。

页面范围：

1. PC Admin：品牌列表、新增、编辑、详情、启用、停用；
2. 微信小程序：品牌筛选。

生命周期：

创建、启用、更新、停用。已引用品牌必须保留历史。

#### 1.3.5 Supplier

业务目标：

维护采购供应商资料，服务采购订单、入库来源、供应商附件和敏感字段控制。

使用场景：

1. 采购订单；
2. 供应商资料查询；
3. 采购付款记录；
4. 入库来源；
5. 供应商附件。

页面范围：

1. PC Admin：供应商列表、新增、编辑、详情、启用、停用、附件、敏感字段查看；
2. 微信小程序：供应商查询和详情摘要。

生命周期：

创建、启用、更新、停用。供应商税号、联系方式、银行或结算相关敏感信息必须受字段权限控制。

#### 1.3.6 Manufacturer

业务目标：

维护生产厂家资料，服务生产任务、厂家仓、质检、入库和厂家敏感信息管理。

使用场景：

1. 生产任务；
2. 厂家生产进度；
3. 厂家仓；
4. 质检来源；
5. 入库来源。

页面范围：

1. PC Admin：厂家列表、新增、编辑、详情、启用、停用、附件、敏感字段查看；
2. 微信小程序：厂家查询和生产任务关联查看。

生命周期：

创建、启用、更新、停用。厂家敏感信息必须受字段权限控制。

#### 1.3.7 Warehouse

业务目标：

维护仓库主数据，支持公司仓、厂家仓、海外仓、在途仓和待处理仓的库存边界。

使用场景：

1. 入库；
2. 出库；
3. 库存查询；
4. 库存流水；
5. 调拨；
6. 跨境；
7. 角色仓库数据范围。

页面范围：

1. PC Admin：仓库列表、新增、编辑、详情、启用、停用、仓库类型配置；
2. 微信小程序：授权仓库查询和库存查询。

生命周期：

创建、启用、更新、停用。`warehouse_type` 必须使用 `company`、`manufacturer`、`overseas`、`transit`、`pending`，不得新增同义值。

#### 1.3.8 Platform

业务目标：

维护电商平台资料，为店铺、销售出库、跨境业务和外部数据导入提供平台维度。

使用场景：

1. 店铺归属；
2. 平台筛选；
3. 销售出库来源；
4. 海外库存导入来源；
5. 后续跨境分析。

页面范围：

1. PC Admin：平台列表、新增、编辑、详情、启用、停用；
2. 微信小程序：平台筛选和查看。

生命周期：

创建、启用、更新、停用。MVP 不接入外部平台 API。

#### 1.3.9 Store

业务目标：

维护平台店铺资料，用于出库、销售数据、店铺数据范围和后续分析。

使用场景：

1. 出库单；
2. 销售相关查询；
3. 店铺数据范围；
4. 导入目标；
5. 报表维度。

页面范围：

1. PC Admin：店铺列表、新增、编辑、详情、启用、停用；
2. 微信小程序：授权店铺查询。

生命周期：

创建、启用、更新、停用。Store 可见性和操作范围必须受 `role_stores` 和 `access_level` 控制。

#### 1.3.10 Accessory

业务目标：

在不新增独立配件事实源的前提下，使配件可被查询、采购、入库、出库和库存管理。

使用场景：

1. 配件类产品查询；
2. 配件 SKU 查询；
3. 配件采购；
4. 配件库存；
5. 配件出库。

页面范围：

1. PC Admin：配件视图，基于产品分类、产品属性或 SKU 筛选；
2. 微信小程序：配件查询。

生命周期：

复用 Product / SKU 生命周期。MVP 不新增配件专用生命周期、替代关系或配件组合关系。

#### 1.3.11 Package

业务目标：

按 BR-021 将套装作为独立 SKU 管理，支持套装库存、套装销售和套装出库。

使用场景：

1. 套装 SKU 查询；
2. 套装采购；
3. 套装入库；
4. 套装库存；
5. 套装出库。

页面范围：

1. PC Admin：套装 SKU 视图，基于 SKU 类型、分类或属性筛选；
2. 微信小程序：套装查询。

生命周期：

复用 SKU 生命周期。MVP 不管理套装内部配件组成，不拆分扣减套装内部配件库存。

## 2. Database Impact Analysis

### 2.1 Object Mapping

| Business Object | Existing Database Object | Impact | Judgment |
| --- | --- | --- | --- |
| Product | `products` | 复用既有产品表 | Not Required |
| SKU | `skus` | 复用既有 SKU 表 | Not Required |
| Category | `product_categories` | 复用既有分类表 | Not Required |
| Brand | `brands` | 复用既有品牌表 | Not Required |
| Supplier | `suppliers`、产品供应商关系 | 复用既有供应商与关联对象 | Not Required |
| Manufacturer | `manufacturers`、产品厂家关系 | 复用既有厂家与关联对象 | Not Required |
| Warehouse | `warehouses` | 复用既有仓库表和 `warehouse_type` | Not Required |
| Platform | `ecommerce_platforms` | 复用既有平台表 | Not Required |
| Store | `stores` | 复用既有店铺表 | Not Required |
| Accessory | `products`、`skus`、`product_categories` | 作为产品 / SKU 分类或视图表达 | Not Required |
| Package | `skus` | 按 BR-021 作为独立 SKU 表达 | Not Required |

### 2.2 Field Impact

默认不新增字段。

实施阶段如出现页面字段需求，必须先判断是否满足以下任一条件：

1. 已存在于 Database v2.5；
2. 可由既有产品、SKU、分类、品牌、供应商、厂家、仓库、平台、店铺关系表达；
3. 可作为前端临时展示或筛选条件，不成为正式业务事实；
4. 可通过附件、审计、导入任务或事件记录表达，而不改变基础资料事实表。

若字段必须成为正式业务事实，则 Database CR Required。

### 2.3 Status / Enum / Check Impact

默认不新增 PostgreSQL Enum，不新增字段级 Check Value。

`Warehouse` 继续使用 `DATABASE_ENUM_SPEC.md` 已冻结的 `warehouse_type`：

1. `company`；
2. `manufacturer`；
3. `overseas`；
4. `transit`；
5. `pending`。

`access_level` 继续只用于角色仓库和角色店铺数据范围，不作为业务对象生命周期状态。

### 2.4 Accessory / Package Boundary

Accessory：

1. MVP 不新增 `accessories` 表；
2. MVP 不新增配件替代关系表；
3. MVP 不新增配件生命周期状态；
4. 配件作为 Product / SKU 的业务分类、属性或视图表达。

Package：

1. MVP 不新增 `packages` 表；
2. MVP 不新增套装组成表；
3. MVP 不新增 BOM、拆装流水或组合库存表；
4. 套装作为独立 SKU 管理，销售时扣减套装 SKU 库存。

以下情况触发 Database CR Required：

1. 配件成为独立正式业务对象；
2. 配件需要替代关系、适配关系或独立库存规则；
3. 套装需要维护组成明细；
4. 套装需要拆装、BOM、成本核算或内部配件库存联动；
5. 新增产品类型、SKU 类型或状态值；
6. 修改现有表结构、约束、索引或字段可空性。

### 2.5 Database CR Judgment

Database CR：Not Required。

前提：

1. 严格复用 Database v2.5 已有对象；
2. Accessory 作为 Product / SKU 分类或视图表达；
3. Package 按 BR-021 作为独立 SKU 表达；
4. 不新增业务表、字段、状态、Enum、Check、索引或约束。

## 3. API Impact Analysis

### 3.1 Existing API Coverage

API Master Specification v1.5 已冻结，基础资料 `MD-*` 共 74 个接口，覆盖 Module 1 的主要接口类别。

| Business Object | Required API Capability | Existing API Category | API CR |
| --- | --- | --- | --- |
| Product | 列表、详情、新增、修改、启用、停用、导入、附件关联 | `MD-PRD-*`、Import、Attachment | Not Required |
| SKU | 列表、详情、新增、修改、启用、停用、导入、附件关联 | `MD-SKU-*`、Import、Attachment | Not Required |
| Category | 列表、详情、新增、修改、启用、停用 | `MD-CAT-*` | Not Required |
| Brand | 列表、详情、新增、修改、启用、停用 | `MD-BRD-*` | Not Required |
| Supplier | 列表、详情、新增、修改、启用、停用、附件关联 | `MD-SUP-*`、Attachment | Not Required |
| Manufacturer | 列表、详情、新增、修改、启用、停用、附件关联 | `MD-MFR-*`、Attachment | Not Required |
| Warehouse | 列表、详情、新增、修改、启用、停用 | `MD-WHS-*` | Not Required |
| Platform | 列表、详情、新增、修改、启用、停用 | `MD-PLT-*` | Not Required |
| Store | 列表、详情、新增、修改、启用、停用 | `MD-STR-*` | Not Required |
| Accessory | 基于 Product / SKU 的筛选、查询、维护 | `MD-PRD-*`、`MD-SKU-*`、`MD-CAT-*` | Not Required |
| Package | 基于 SKU 的筛选、查询、维护 | `MD-SKU-*` | Not Required |

### 3.2 API Implementation Boundary

实施阶段必须遵守：

1. 不新增 API 路径；
2. 不修改 DTO；
3. 不修改错误码；
4. 不修改权限绑定；
5. 不新增状态字段；
6. 不为微信小程序创建绕过 PC Admin 业务规则的专用接口；
7. 不新增 Job / Event / Audit 管理接口；
8. 不新增外部平台同步接口。

### 3.3 API CR Judgment

API CR：Not Required。

以下情况触发 API CR Required：

1. 新增独立 Accessory API；
2. 新增 Package 组成、拆装、BOM 或组合库存 API；
3. 新增 Product / SKU 字段导致 DTO 变化；
4. 新增批量操作、批量启停或聚合查询接口，且 API Spec 未覆盖；
5. 新增 Dashboard 或报表聚合 API；
6. 修改已冻结错误码、权限、状态或响应结构。

## 4. Permission Impact

### 4.1 Existing Permission Coverage

ROLE_PERMISSION_SPEC v1.0 已覆盖 Module 1 基础资料权限：

| Business Object | Existing Permission | Actions | Coverage |
| --- | --- | --- | --- |
| Product | `master.product` | read, create, update, enable, disable | 覆盖 |
| SKU | `master.sku` | read, create, update, enable, disable | 覆盖 |
| Category | `master.category` | read, create, update, enable, disable | 覆盖 |
| Brand | `master.brand` | read, create, update, enable, disable | 覆盖 |
| Supplier | `master.supplier` | read, create, update, enable, disable | 覆盖 |
| Manufacturer | `master.manufacturer` | read, create, update, enable, disable | 覆盖 |
| Warehouse | `master.warehouse` | read, create, update, enable, disable | 覆盖 |
| Platform | `master.platform` | read, create, update, enable, disable | 覆盖 |
| Store | `master.store` | read, create, update, enable, disable | 覆盖 |
| Accessory | `master.product`、`master.sku`、`master.category` | read, create, update, enable, disable | 覆盖 |
| Package | `master.sku` | read, create, update, enable, disable | 覆盖 |

### 4.2 Import Permission

基础资料导入必须复用既有 Import 权限和 API 规则，不为单个基础资料对象新增导入权限代码。

导入执行必须同时校验：

1. 导入功能权限；
2. 目标对象维护权限；
3. 字段权限；
4. 数据范围；
5. 幂等键；
6. 文件 Checksum；
7. 导入任务状态；
8. 审计记录。

### 4.3 Attachment Permission

基础资料附件必须复用 Attachment Framework 和对象 Registry，不新增基础资料专用附件权限。

附件操作必须校验：

1. Attachment 功能权限；
2. 目标对象读写权限；
3. 目标对象状态；
4. 仓库、店铺或厂家派生范围；
5. 敏感字段权限；
6. 审计规则。

### 4.4 Sensitive Field Permission

Supplier 和 Manufacturer 可能涉及敏感信息。

必须复用：

1. `field.supplier-sensitive`；
2. `field.manufacturer-sensitive`。

不得通过前端隐藏替代后端字段权限。

### 4.5 Permission CR Judgment

Permission CR：Not Required。

以下情况触发 Permission CR Required：

1. 新增独立 Accessory 权限；
2. 新增独立 Package 权限；
3. 新增基础资料批量审批、批量启停、敏感导出等高风险动作；
4. 新增角色；
5. 新增数据范围类型；
6. 新增敏感字段类型；
7. 改变现有角色权限矩阵。

## 5. Page Implementation Plan

### 5.1 PC Admin

PC Admin 是基础资料维护主端。

#### 5.1.1 Navigation

基础资料中心导航：

1. 产品管理；
2. SKU 管理；
3. 产品分类；
4. 品牌管理；
5. 配件视图；
6. 套装 SKU 视图；
7. 供应商管理；
8. 生产厂家管理；
9. 仓库管理；
10. 平台管理；
11. 店铺管理。

#### 5.1.2 List Page

列表页通用能力：

1. 关键词搜索；
2. 状态筛选；
3. 分类或类型筛选；
4. 权限控制的操作按钮；
5. 分页；
6. 排序；
7. 导入入口；
8. 导出入口，仅在 API Spec 和权限允许时启用；
9. 附件状态入口；
10. 审计入口。

列表页不得泄露无权数据或敏感字段。

#### 5.1.3 Form Page

表单页通用能力：

1. 新增；
2. 编辑；
3. 必填校验；
4. 唯一性校验；
5. 引用对象选择；
6. 状态提示；
7. 幂等提交；
8. 保存后重新读取正式数据；
9. 错误提示不泄露 SQL、内部路径或无权对象。

#### 5.1.4 Detail Page

详情页通用能力：

1. 基础信息；
2. 关联对象；
3. 附件；
4. 最近审计；
5. 引用提示；
6. 权限控制的操作按钮；
7. 停用原因或停用信息；
8. Trace 关联信息仅用于内部排查，不作为业务展示事实。

#### 5.1.5 Actions

基础资料通用动作：

1. 查看；
2. 新增；
3. 修改；
4. 启用；
5. 停用；
6. 导入；
7. 附件上传；
8. 附件关联；
9. 附件删除；
10. 审计查看。

动作约束：

1. 页面可见性不替代后端权限；
2. 启用 / 停用必须写审计；
3. 已被业务引用对象不得物理删除；
4. 停用对象不得用于新业务单据；
5. 关键写操作必须幂等。

### 5.2 微信小程序

微信小程序是内部移动查询与轻量操作端。

页面范围：

1. 基础资料搜索；
2. 产品详情；
3. SKU 详情；
4. 配件查询；
5. 套装 SKU 查询；
6. 供应商摘要；
7. 厂家摘要；
8. 仓库摘要；
9. 平台 / 店铺摘要；
10. 附件查看；
11. 授权范围内快速跳转到采购、生产、入库、出库或库存页面。

小程序限制：

1. 不做复杂配置；
2. 不做批量导入；
3. 不做权限维护；
4. 不做敏感字段默认展示；
5. 不绕过 PC Admin 与后端规则。

## 6. Phase 7 Capability Reuse

| Capability | Reuse Design |
| --- | --- |
| Authentication | PC Admin 与微信小程序所有请求复用统一认证、Session、Token 与微信身份绑定能力 |
| Authorization | 所有列表、详情、表单、动作和附件操作执行 RBAC、Permission、Data Scope、Sensitive Field Access |
| Attachment | 产品图片、供应商资料、厂家资料、资质文件等通过 Attachment Framework 关联 |
| Idempotency | 创建、更新、启用、停用、导入执行、附件变更等写操作使用幂等保护 |
| Audit | 新增、修改、启用、停用、导入、附件操作、权限拒绝必须写入 `audit_logs` |
| Trace | HTTP、Service、Database、Job、Event 链路传递 `request_trace_id` |
| Logging | 使用结构化日志，禁止记录 Token、Password、Secret、Authorization Header、Cookie、Database URL、Storage 私有路径 |
| Job | 基础资料导入、批量校验、批量附件处理可使用 Background Job |
| Event | 基础资料提交成功后可发布 Master Data Changed 类事件，不替代业务事实 |
| Metrics / Health | 基础接口请求、错误、导入任务、后台任务可接入基础 Metrics 和 Health Provider |

## 7. Development Order

推荐开发顺序：

1. Category；
2. Brand；
3. Product；
4. SKU；
5. Supplier；
6. Manufacturer；
7. Warehouse；
8. Platform；
9. Store；
10. Accessory / Package。

### 7.1 Order Rationale

1. Category 和 Brand 是 Product 的基础维度；
2. Product 是 SKU 的上层主数据；
3. SKU 是采购、生产、入库、出库和库存的核心引用对象；
4. Supplier 和 Manufacturer 支撑后续采购与生产；
5. Warehouse 支撑库存、入库、出库和数据范围；
6. Platform 和 Store 支撑出库、销售和店铺数据范围；
7. Accessory 与 Package 不新增对象，应在 Product / SKU 稳定后以筛选视图完成。

### 7.2 Implementation Milestones

| Milestone | Scope | Exit Criteria |
| --- | --- | --- |
| MD-1 | Category、Brand | 列表、详情、新增、编辑、启用、停用、审计通过 |
| MD-2 | Product | 产品完整维护、附件、导入、权限和审计通过 |
| MD-3 | SKU | SKU 完整维护、产品关联、库存引用前置校验通过 |
| MD-4 | Supplier、Manufacturer | 敏感字段、附件、启停、权限和审计通过 |
| MD-5 | Warehouse | 仓库类型、厂家仓、数据范围和 Check 语义通过 |
| MD-6 | Platform、Store | 平台店铺关系、店铺数据范围和启停通过 |
| MD-7 | Accessory / Package | 配件视图和套装 SKU 视图完成，不新增表和接口 |

## 8. Acceptance Criteria

### 8.1 Business Acceptance

1. 产品、SKU、分类、品牌、供应商、厂家、仓库、平台和店铺可完成查看、创建、修改、启用、停用；
2. Accessory 可通过产品 / SKU 分类或视图查询和维护；
3. Package 可按独立 SKU 查询和维护；
4. 停用基础资料不得用于新业务单据；
5. 已被业务单据引用的基础资料保留历史可读；
6. 仓库类型遵守 `warehouse_type` 正式枚举；
7. Store 与 Platform 关系正确；
8. Supplier 与 Manufacturer 敏感字段受控。

### 8.2 Technical Acceptance

1. 不修改 Database Schema；
2. 不创建 Migration；
3. 不修改 API Spec；
4. 不修改 Permission；
5. 不新增业务表、字段、状态、Enum、Check、索引或约束；
6. 不新增 API 路径、DTO、错误码或权限绑定；
7. 不新增 Redis、MQ 或外部基础设施；
8. 不创建基础资料专用附件表、审计表、缓存表或事件表。

### 8.3 Platform Acceptance

1. 所有请求必须认证；
2. 所有动作必须权限校验；
3. 数据范围和字段权限在后端执行；
4. 写操作具备幂等保护；
5. 附件通过 Attachment Framework；
6. 关键操作写入 `audit_logs`；
7. Trace 贯通 `request_trace_id`；
8. 结构化日志完成敏感信息脱敏；
9. 批量导入和长耗时处理复用 Background Job；
10. 基础资料变更事件只传播已提交事实，不替代主数据。

### 8.4 Governance Acceptance

1. `pnpm status:check` 通过；
2. `git diff --check` 通过；
3. 如发现数据库不足，先提交 Database CR；
4. 如发现 API 不足，先提交 API CR；
5. 如发现权限不足，先提交 Permission CR；
6. 未经批准不得进入代码开发。

## 9. Impact Review Conclusion

| Impact Area | Judgment | Reason |
| --- | --- | --- |
| Database CR | Not Required | Module 1 默认复用 Database v2.5 已有基础资料对象 |
| API CR | Not Required | API Master Specification v1.5 已覆盖基础资料 `MD-*` 接口类别 |
| Permission CR | Not Required | `master.*`、Import、Attachment、Sensitive Field 既有权限覆盖本模块 |
| Frozen Document Impact | Not Required | 本阶段只新增实施设计文档，不修改 Frozen 文档 |
| Code Impact | Not Required | 本阶段禁止代码开发 |
| Migration Impact | Not Required | 本阶段禁止数据库迁移 |

条件性 CR：

1. 独立 Accessory 表、状态、权限或 API：Database CR、API CR、Permission CR Required；
2. Package 组成、BOM、拆装或组合库存：Database CR、API CR、Permission CR Required；
3. 新字段、新状态、新 Check Value、新索引或新约束：Database CR Required；
4. 新接口、新 DTO、新错误码或新响应结构：API CR Required；
5. 新角色、新权限、新数据范围或新敏感字段：Permission CR Required。

当前推荐：

Module 1 基础资料中心可以在不触发 CR 的前提下，按 Category → Brand → Product → SKU → Supplier → Manufacturer → Warehouse → Platform → Store → Accessory / Package 的顺序进入后续开发任务。
