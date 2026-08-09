---
document_name: UAT-009 与 UAT-011 影响分析报告
project: Violin ERP Lite
version: 1.0
status: Draft
owner: Project Manager
created_date: 2026-08-09
updated_date: 2026-08-09
related_phase: Phase 10
---

# UAT-009 & UAT-011 Impact Analysis

## Executive Summary

本报告针对 Local UAT 阶段剩余的两个 CR 阻断项进行只读影响评估：

1. `UAT-009`：基础资料自动编码；
2. `UAT-011`：Sales Admin API Route。

本次只执行架构、业务规则、Database、API、Permission 与 CR 建议分析，未修改代码、Database、Migration、API Contract、Permission、自动编码逻辑、Sales API 或 Frozen 文档。

结论：

| 项目 | 结论 | CR 判断 |
| --- | --- | --- |
| UAT-009 自动编码 | 不建议直接在前端或普通应用层临时生成；应先形成正式编码规则，再选择并发安全的服务端生成方案 | Business Rule CR 必需；API CR 必需；Database CR 取决于方案，推荐需要；Permission CR 不需要 |
| UAT-011 Sales Admin API Route | 受限 MVP 可以继续复用 `OUT-*`、`SRT-*`、`INV-*`、`MD-*` 的既有能力；如果只是把已有正式 API 在 Admin Route 中补齐接线，理论上无需新增 API CR；若新增 `/api/v1/sales/...` 或 `SALES-*`，必须先 API CR | 受限接线：无需 CR；新增 Sales API：API CR 必需；完整销售订单：Database/API/Permission/Business Rule 联合 CR |

推荐路线：

1. `UAT-009` 先提交正式 Business Rule CR + API CR；若批准统一编号服务，追加 Database CR；
2. `UAT-011` 优先走受限 MVP：不新增 `SALES-*`，仅复用既有销售出库、销售退货、库存流水和主数据能力；如产品负责人希望独立销售分析路径，再提交 API CR；
3. 完整销售订单、平台订单生命周期、客户主数据和利润分析不属于当前受限 MVP，应作为未来版本需求。

## UAT-009 自动编码分析

### 1. 当前业务规则状态

Frozen `BUSINESS_RULES.md` 中与编码直接相关的是：

- `BR-001 产品唯一原则`：同一产品或 SKU 只能有一个正式产品档案；
- `BR-006 历史数据保护原则`：已产生业务记录的产品、供应商、仓库和单据不得物理删除；
- `BR-019 现有编码沿用规则`：优先沿用公司现有产品编码和 SKU 编码，不建立无必要的第二套平行编码；
- `BR-034 PC管理端规则`：PC 端用于基础资料维护、Excel 批量导入、数据清理、复杂查询和报表导出。

影响判断：

1. 当前 Frozen 规则只确认“沿用现有编码”，没有批准“系统自动生成正式编码”；
2. 自动编码会改变创建基础资料时的责任边界：从用户提交正式编码，变为服务端生成正式编码；
3. 如果自动编码覆盖导入、历史数据和人工编码，必须明确外部编码与系统编码的优先级；
4. 因此 `UAT-009` 不能作为单纯 UI Bug 修复，应先走 Business Rule CR。

### 2. 当前 API 与实现状态

当前 `packages/api/src/master-data/master-data.ts` 对 9 类基础资料的编码字段均定义为创建必填：

| 对象 | API 字段 | 当前 Create DTO 状态 | 当前责任 |
| --- | --- | --- | --- |
| Product Category | `categoryCode` | Required | 客户端提交 |
| Brand | `brandCode` | Required | 客户端提交 |
| Product | `productCode` | Required | 客户端提交 |
| SKU | `skuCode` | Required | 客户端提交 |
| Manufacturer | `manufacturerCode` | Required | 客户端提交 |
| Supplier | `supplierCode` | Required | 客户端提交 |
| Warehouse | `warehouseCode` | Required | 客户端提交 |
| Platform | `platformCode` | Required | 客户端提交 |
| Store | `storeCode` | Required | 客户端提交 |

影响判断：

- 如果创建时允许省略编码，由服务端生成，则会改变 Create DTO 的必填语义；
- 这属于 API Contract 变化，需要 API CR；
- 仅在前端“帮用户填入一个编码”虽然不改 API，但会把正式编码规则放在客户端，存在并发、重复、导入兼容和多端不一致风险，不建议作为正式方案。

### 3. 当前 Database 状态

从 Prisma Schema 与现有数据库映射看：

| 对象 | 编码字段 | 当前数据库约束观察 |
| --- | --- | --- |
| Product Category | `category_code` | 字段存在；当前唯一性主要是同级分类名称唯一 |
| Brand | `brand_code` | 字段存在；`brand_name` 唯一 |
| Product | `product_code` | 字段存在 |
| SKU | `sku_code` | 字段存在；`barcode` 唯一 |
| Manufacturer | `manufacturer_code` | 字段存在 |
| Supplier | `supplier_code` | 字段存在；`tax_identifier` 唯一 |
| Warehouse | `warehouse_code` | 字段存在 |
| Platform | `platform_code` | 字段存在；`platform_name` 唯一 |
| Store | `store_code` | 字段存在；`platform_id + external_store_id` 唯一 |

影响判断：

1. 现有数据库已有编码字段，但未提供统一编号序列表、编号租约表或编号规则表；
2. 如果仅依赖“查最大编码 + 1”，在并发创建、多实例部署、重试和回滚场景中存在冲突风险；
3. 如果要求系统保证编码唯一且并发安全，推荐新增数据库级编号对象或序列；
4. 是否为每个编码字段新增唯一约束需要进一步审计历史数据与导入数据，不能本次直接判断为安全。

### 4. 当前 Permission 状态

`ROLE_PERMISSION_SPEC.md` 已冻结 244 个权限代码。基础资料对象均已有 `master.*` 权限：

- `master.product.*`
- `master.sku.*`
- `master.category.*`
- `master.brand.*`
- `master.supplier.*`
- `master.manufacturer.*`
- `master.warehouse.*`
- `master.platform.*`
- `master.store.*`

影响判断：

- 自动编码是创建流程内部能力，不需要新增独立 Permission Code；
- 仍应复用对应对象的 `create` / `update` 权限；
- 如后续建设“编号规则管理页面”，那将是新增管理能力，需要 Permission CR；但本次推荐的最小自动编码不需要。

### 5. 编码对象逐项分析

| 对象 | 当前是否人工输入 | 格式约束 | 唯一性风险 | 是否允许修改建议 | 是否参与业务关联 | 自动编码建议 |
| --- | --- | --- | --- | --- | --- | --- |
| Product Category Code | 是 | 未冻结统一格式 | 中 | 创建后不建议随意修改 | 产品分类引用主要用 `categoryId`，编码用于识别和导入 | `CAT-0001` 可行，需服务端生成 |
| Brand Code | 是 | 未冻结统一格式 | 中 | 创建后不建议随意修改 | 产品引用用 `brandId` | `BRD-0001` 可行 |
| Product Code | 是 | BR-019 要求优先沿用现有编码 | 高 | 已被 SKU、采购、生产、导入引用后不建议修改 | 产品主数据识别、导入、报表 | 建议支持手工保留 + 可选自动生成 |
| SKU Code | 是 | 需业务化规则 | 高 | 强烈不建议随意修改 | 采购、生产、库存、出入库、跨境、销售核心引用 | 需专项规则，不宜简单流水号 |
| Manufacturer Code | 是 | 未冻结统一格式 | 中 | 已被生产、仓库、供应链引用后不建议修改 | 生产厂家识别 | `MFR-0001` 可行 |
| Supplier Code | 是 | 未冻结统一格式 | 中 | 已被采购引用后不建议修改 | 采购供应商识别 | `SUP-0001` 可行 |
| Warehouse Code | 是 | 仓库类型影响语义 | 高 | 已有库存后不建议修改 | 库存与仓库范围核心识别 | 建议按类型前缀，如 `WHS-CN-0001` |
| Platform Code | 是 | 未冻结统一格式 | 中 | 已有关联店铺后不建议修改 | 平台 / 店铺视图 | `PLT-0001` 可行 |
| Store Code | 是 | 可能与平台外部店铺 ID 混淆 | 中 | 已有出库、销售、跨境记录后不建议修改 | 店铺范围、销售出库、退货 | 建议按平台前缀生成，如 `TM-STORE-0001` |

### 6. 方案评估

#### 方案 A：应用层生成

示例：

- `CAT-0001`
- `BRD-0001`
- `PRD-0001`
- `SUP-0001`

优点：

- 实现简单；
- 不一定需要新增数据库对象；
- 可以较快改善人工录入体验。

缺点：

- 如果只是查询最大编码后加 1，在并发创建时存在重复风险；
- 多实例部署下无法靠进程内锁保证唯一；
- 失败重试、事务回滚和幂等重放会让编码跳号或重复；
- 不适合 SKU 这类业务含义较强的编码。

判断：

不推荐作为正式生产方案，除非只是短期本地 UAT 辅助，并且仍保留用户确认编码。

#### 方案 B：数据库序列生成

示例：

- 每类编码使用独立 PostgreSQL Sequence；
- 服务端在事务中获取 `nextval`；
- 格式化为 `PREFIX-000001`。

优点：

- 并发唯一性强；
- 多实例安全；
- 实现路径相对清晰。

缺点：

- 需要 Database CR；
- 序列号天然可能跳号；
- 不适合复杂 SKU 业务组合编码；
- 编码规则变更灵活性有限。

判断：

适合 Category、Brand、Manufacturer、Supplier、Warehouse、Platform、Store 等简单对象；Product 可选；SKU 需要更细规则。

#### 方案 C：编号服务 / 编号表

示例对象：

```text
code_sequences
├─ scope
├─ prefix
├─ current_value
├─ padding
├─ reset_policy
├─ updated_at
└─ version_no
```

优点：

- 支持对象级、年度、平台、仓库、产品线等组合规则；
- 可在数据库事务中加行锁，保证并发安全；
- 可记录规则、审计和未来扩展；
- 更适合 SKU、Store、Warehouse 这类需要上下文的编码。

缺点：

- 需要新增数据模型；
- 需要 Database CR；
- 需要 API CR 明确创建时编码可省略；
- 需要实现编号服务、并发测试和回滚测试。

判断：

推荐作为正式方案。

### 7. SKU 编码专项

业务期望示例：

```text
L2-44-BK
```

建议组成：

| 片段 | 含义 | 来源建议 | 示例 |
| --- | --- | --- | --- |
| `L2` | 型号 / 产品系列 | 优先来自 Product Code 或新增“型号”业务规则；不建议从产品名称截取 | `L2` |
| `44` | 尺寸 | 来自 SKU `size` 的标准化映射 | `4/4 → 44` |
| `BK` | 颜色 | 来自 SKU `color` 的标准化映射 | `黑色 → BK` |

关键问题：

1. 型号来源未冻结：当前 Product 字段没有独立 `modelCode`；
2. 尺寸标准未冻结：`4/4`、`3/4`、`1/2`、`1/4` 是否映射为 `44`、`34`、`12`、`14` 需要业务确认；
3. 颜色字典未冻结：`黑色 BK`、`原木色 NAT`、`绿色 GR` 等需要正式字典；
4. 冲突处理未冻结：同型号、尺寸、颜色下存在多个材质、套装、配件包时需要后缀规则；
5. 多语言产品名不能作为编码来源：中文、英文和商品展示名可能变化，不能作为稳定编码事实。

推荐 SKU 编码规则：

```text
{productModelCode}-{sizeCode}-{colorCode}[-{variantSeq}]
```

示例：

- `L2-44-BK`
- `L2-34-NAT`
- `STU-44-GR-02`

规则建议：

1. `productModelCode` 必须来自稳定字段或明确由 Product Code 承担；
2. `sizeCode` 使用固定映射表；
3. `colorCode` 使用固定映射表；
4. 冲突时追加两位序号，例如 `-02`；
5. 导入场景允许保留外部已有 SKU Code，但必须经过唯一性校验；
6. 编辑后默认不允许修改 SKU Code；如确需修改，必须记录审计并校验无下游冲突。

### 8. UAT-009 CR 判断

| CR 类型 | 判断 | 原因 |
| --- | --- | --- |
| Business Rule CR | Required | 当前 Frozen 仅批准“优先沿用现有编码”，未批准系统自动生成规则、SKU 组合规则、颜色 / 尺寸字典和冲突处理 |
| API CR | Required | 当前 Create DTO 中 9 类编码均为必填；允许省略编码并由服务端生成会改变 API Contract |
| Database CR | Recommended / Required for formal service | 正式并发安全建议使用序列或编号表；若新增编号对象、唯一约束或字典表，则必须 DCR |
| Permission CR | Not Required for minimal generation | 自动编码作为创建流程内部能力可复用 `master.*.create`；除非新增编号规则管理页面 |

## UAT-011 Sales API 分析

### 1. 当前业务边界

Frozen `BUSINESS_RULES.md` 已明确：

- `BR-023 国内逐单销售出库规则`：国内电商业务按照平台订单逐单登记销售出库；
- `BR-024 不管理完整销售订单规则`：本期只管理销售出库，不建设完整销售订单生命周期。平台订单号作为销售出库来源和追溯依据；
- 库存事实仍由 `inventories` 与 `inventory_transactions` 承担，销售来源、销售视图和统计不得直接修改库存。

因此当前销售能力分为两层：

1. 受限 MVP：国内销售出库、销售退货、平台 / 店铺销售视图、基础销售统计；
2. 完整 Sales Management：销售订单、平台订单生命周期、客户主数据、售后、利润分析。

第二层与 BR-024 冲突，必须先变更业务规则。

### 2. 已有 Sales Service 能力

当前实现中已存在：

- `packages/api/src/sales/sales-management.ts`
  - `SalesManagementService`
  - `platformView`
  - `storeView`
  - `statistics`
  - `parseSalesListQuery`
- `packages/database/src/sales/prisma-sales-management-repository.ts`
  - 基于 `outbound_orders`
  - 基于 `sales_returns`
  - 基于 `inventory_transactions`
  - 支持平台、店铺、SKU、仓库、日期筛选
- 测试：
  - `packages/api/tests/sales-management.test.ts`
  - `packages/database/tests/sales-management-repository.test.ts`

权限上，Sales Service 当前要求既有权限：

- `outbound.order.read`
- `outbound.sales-return.read`
- `inventory.transaction.read`
- `master.platform.read`
- `master.store.read`
- 字段权限：`field.amount.read`、`field.cost.read`、`field.personal-data.read`

它没有引入 `sales.*` Permission Code。

### 3. 当前 Admin API Route 状态

`apps/admin/app/api/v1/[...segments]/route.ts` 当前已接线：

- Authentication；
- Attachment；
- Security；
- Inventory Query；
- Inventory Transaction；
- Inventory Workflow；
- Workflow；
- Master Data。

但未发现 `SalesManagementService` 的 Admin API 分发接线，也未引入 `PrismaSalesManagementRepository`。

影响：

1. Sales Service 与 Repository 已存在，但 PC Admin 无独立 route 暴露该服务；
2. 若直接新增 `/api/v1/sales/...` 或 `SALES-*`，会新增 API Path / API 编号，违反 Frozen API，必须 API CR；
3. 若仅把已有 Frozen 能力映射到现有 `OUT-*`、`SRT-*`、`INV-*`、`MD-*` 路径，不新增 Contract，可作为实现缺口处理。

### 4. API Spec 覆盖分析

当前 API Master Specification v1.6 覆盖：

| 能力 | 当前覆盖 | API |
| --- | --- | --- |
| 国内销售出库 | 已覆盖 | `OUT-*`，特别是 `OUT-003`、`OUT-012` |
| 销售退货 | 已覆盖 | `SRT-*` |
| 库存流水 | 已覆盖 | `INV-*` |
| 平台 / 店铺主数据 | 已覆盖 | `MD-*` |
| 平台 / 店铺销售只读视图 | 可由出库查询派生，但未独立定义 Sales path | `OUT-*` + `MD-*` + `INV-*` |
| 基础销售统计 | 可由出库、退货、库存流水派生，但未独立定义 Sales path | 可复用现有数据源；独立路径需 CR |
| 完整 Sales Order | 未覆盖 | 需要新 CR |
| Platform Order API | 未覆盖 | 需要新 CR |
| Profit / Fee / Commission Analysis | 未覆盖 | 需要新 CR |

### 5. UAT-011 分类判断

| 分类 | 是否适用 | 说明 |
| --- | --- | --- |
| A：无需 CR，可通过已有能力完成 | 适用于受限 MVP 接线 | 若不新增 path、不新增 DTO、不新增 Response、不新增 Error Code，只复用 `OUT-*` / `SRT-*` / `INV-*` / `MD-*` |
| B：需要 API CR | 适用于新增 `/api/v1/sales/...`、`SALES-*` 或独立销售统计契约 | 需要正式定义路径、编号、DTO、Response、权限和错误码 |
| C：需要 Database/API 联合 CR | 适用于完整销售订单、平台订单、客户主数据、统计快照、利润分析 | 需要新增对象、字段或事实来源 |
| D：未来版本需求 | 适用于 AI 预测、平台 API 同步、佣金、平台费用、复杂售后 | 当前 Phase 10 后置 UAT 不应直接实现 |

## Database 影响

### UAT-009

Database CR 判断：

Recommended / Required for formal service

原因：

1. 正式自动编码需要并发安全；
2. 当前没有统一编号表、编号规则表或对象级序列；
3. 如果采用数据库序列或编号表，必须新增数据库对象；
4. 如果新增编码唯一约束，也必须先审计历史数据并提交 DCR；
5. SKU 颜色 / 尺寸映射如需要字典表，也触发 DCR。

### UAT-011

Database CR 判断：

- 受限 MVP：Not Required；
- 完整销售管理：Required。

原因：

1. 受限 MVP 可复用 `outbound_orders`、`outbound_order_items`、`sales_returns`、`sales_return_items`、`inventory_transactions`、`stores`、`ecommerce_platforms`；
2. 完整销售订单、平台订单、客户主数据、销售渠道、利润快照均无正式数据库对象；
3. 不得用销售视图或统计表替代库存事实。

## API 影响

### UAT-009

API CR 判断：

Required

原因：

1. 当前 9 类基础资料 Create DTO 均要求编码字段必填；
2. 自动编码意味着编码字段可以省略、服务端生成或请求中显式选择生成策略；
3. 响应需要明确返回生成后的编码；
4. 错误码需要覆盖编号规则缺失、编号冲突、编号服务不可用等场景；
5. 导入场景是否允许外部编码与自动编码混用，需要 API 规则。

### UAT-011

API CR 判断：

- 受限复用接线：Not Required；
- 新增 Sales API：Required。

建议：

1. 如果只是满足当前 UAT 可用性，优先复用现有 `OUT-*`、`SRT-*`、`INV-*` 和 `MD-*`；
2. 如果要新增正式销售分析入口，建议提交 API CR，定义：
   - `SALES-001` 平台销售视图；
   - `SALES-002` 店铺销售视图；
   - `SALES-003` SKU 销售排行；
   - `SALES-004` 基础销售统计；
   - `SALES-005` 销售来源追踪。

以上编号仅为建议，不得在 CR 批准前实现。

## Permission 影响

### UAT-009

Permission CR 判断：

Not Required for minimal generation

原因：

- 自动生成编码属于 `master.*.create` 内部流程；
- 不需要普通用户额外权限；
- 如新增“编号规则管理”，则需要 Permission CR，可能为 `system.code-rule.*` 或 `master.code-rule.*`，但不属于最小方案。

### UAT-011

Permission CR 判断：

- 受限 MVP：Not Required；
- 完整销售 API：Required。

原因：

1. 当前 Sales Service 已复用 `outbound.*`、`inventory.*`、`master.*` 与 `field.*` 权限；
2. 当前 `ROLE_PERMISSION_SPEC.md` 没有 `sales.*`；
3. 若新增 `SALES-*`，需要明确是否继续复用既有权限，还是新增 `sales.view.read`、`sales.statistics.read` 等权限；
4. 完整销售订单一定需要 Permission CR，因为销售订单权限不等同于出库权限。

## CR Matrix

| 项目 | Business Rule CR | Database CR | API CR | Permission CR | 说明 |
| --- | --- | --- | --- | --- | --- |
| UAT-009 简单对象自动编码 | Required | Recommended | Required | Not Required | 推荐服务端生成，避免前端随机或查最大值 |
| UAT-009 SKU 组合编码 | Required | Recommended / Required | Required | Not Required | 需要型号、尺寸、颜色、冲突规则 |
| UAT-009 编号规则管理页面 | Required | Required | Required | Required | 新增管理能力与权限 |
| UAT-011 受限 MVP 路由接线 | Not Required | Not Required | Not Required | Not Required | 仅复用现有 `OUT-*` / `SRT-*` / `INV-*` / `MD-*`，不新增 Contract |
| UAT-011 新增 `SALES-*` API | Not Required for limited analytics | Not Required if derived only | Required | Optional / Required | 若新增 path 和 response contract，必须 API CR；是否新增权限需 CR 决定 |
| 完整 Sales Order / Platform Order | Required | Required | Required | Required | 与 BR-024 冲突，且缺少数据库对象与权限 |

## Recommended Roadmap

### 1. UAT-009 推荐实施方案

推荐分两步：

#### Step 1：CR 设计

提交：

1. Business Rule CR：确认编码规则、是否允许手工覆盖、导入兼容、编辑限制；
2. API CR：允许 Create DTO 编码字段可选，定义生成策略与错误码；
3. Database CR：批准编号服务 / 编号表或数据库序列。

#### Step 2：实现方案

推荐使用“编号服务 + 数据库编号表”：

1. 每个对象配置 `scope`、`prefix`、`padding`；
2. 编号生成在数据库事务中完成；
3. 使用行锁或原子 update 保证并发安全；
4. 仍保留导入 / 历史数据手工编码通道；
5. 创建后编码默认只读，修改需高风险操作与审计；
6. SKU 使用 `{productModelCode}-{sizeCode}-{colorCode}[-{variantSeq}]`。

优先级：

1. SKU Code；
2. Product Code；
3. Warehouse Code；
4. Category / Brand / Manufacturer / Supplier / Platform / Store Code。

### 2. UAT-011 推荐实施方案

推荐先走受限 MVP，不新增 `SALES-*`：

1. Admin 页面继续通过销售出库、销售退货、库存流水和主数据查询完成销售视图；
2. 如果需要复用现有 `SalesManagementService`，优先评估是否能挂接在现有已批准路径语义下；
3. 不新增 `/api/v1/sales/...`；
4. 不新增 `sales.*` Permission；
5. 不新增销售订单、平台订单或客户主数据。

如果项目负责人希望销售分析拥有独立 API：

1. 提交 API CR；
2. 明确接口编号、路径、DTO、Response、Error Code、Permission；
3. 限定只读派生，数据来源仍为出库、退货、库存流水；
4. 不引入销售订单事实对象。

如果目标升级为完整 Sales Management：

1. Business Rule CR：变更 BR-024；
2. Database CR：新增 `sales_orders`、`sales_order_items`、客户 / 平台订单等对象；
3. API CR：新增 Sales Order 生命周期与 Platform Order API；
4. Permission CR：新增 `sales.*`、`customer.*`、`platform-order.*`；
5. 重新执行数据库、API、权限、业务流程一致性评审。

### 3. 风险分析

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| 前端生成编码 | 多端不一致、并发重复、正式数据污染 | 禁止作为正式方案，只允许服务端生成 |
| 查最大编码 + 1 | 高并发重复、多实例冲突 | 使用数据库序列或编号表事务锁 |
| SKU 规则未确认 | 编码不可读或频繁返工 | 先冻结型号、尺寸、颜色、冲突规则 |
| 自动编码覆盖历史编码 | 破坏现有 Excel / 业务识别 | 保留手工编码和导入兼容 |
| 新增 Sales API 未走 CR | 破坏 API Frozen | 受限 MVP 复用既有 API；新增 path 必须 API CR |
| 完整销售订单绕过 BR-024 | 业务规则冲突 | 先提交 Business Rule CR |
| 销售统计成为事实来源 | 库存 / 销售事实漂移 | 统计只读派生，不落事实表 |

## Final Recommendation

### UAT-009

结论：

Blocked by CR。

建议：

- 不直接实现；
- 不前端随机生成；
- 不使用无并发保护的最大值递增；
- 先提交 Business Rule CR + API CR；
- 推荐采用 Database-backed 编号服务，因此建议同步准备 Database CR；
- Permission CR 暂不需要。

### UAT-011

结论：

分流处理。

1. 若目标是“当前受限 MVP 销售可用性”：无需 CR，可复用现有能力进行接线设计；
2. 若目标是新增独立 `/api/v1/sales/...` 或 `SALES-*`：需要 API CR；
3. 若目标是完整销售订单 / 平台订单：需要 Business Rule + Database + API + Permission 联合 CR；
4. 当前不建议在 CR 前新增 Sales API Path。
