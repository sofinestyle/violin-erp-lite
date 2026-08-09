---
document_name: UAT-009 自动编码 CR 建议书
project: Violin ERP Lite
version: 1.0
status: Draft
owner: Project Manager
created_date: 2026-08-09
updated_date: 2026-08-09
related_phase: Phase 10
---

# UAT-009 Automatic Code Generation CR Proposal

## 1. Executive Summary

UAT-009 反映基础资料录入仍要求用户手工填写多个正式业务编码，增加重复、格式不统一和录入错误风险。

本建议书只做 CR 设计，不修改代码、Database、Migration、API、Permission，也不实现自动编码。

结论：

| 项目 | 判断 |
| --- | --- |
| 推荐方案 | 服务端统一编号服务（Code Generation Service）+ 数据库编号表 / 编号规则表 |
| 不推荐方案 | 前端随机生成、时间戳生成、无锁“查询最大编码 + 1” |
| Business Rule CR | Required |
| API CR | Required |
| Database CR | Required |
| Permission CR | Not Required for minimal generation |
| 实施优先级 | SKU → Product → Warehouse → Store → Category / Brand / Manufacturer / Supplier / Platform |

推荐原则：

1. 保留历史编码和导入编码兼容；
2. 支持服务端自动生成；
3. 支持手工编码作为受控例外；
4. 编码生成必须并发安全；
5. 编码一旦参与业务引用，默认只读，不随意修改；
6. SKU 编码采用业务组合规则，不能简单套用流水号。

## 2. 当前编码现状

当前 9 类基础资料 Create DTO 均要求客户端提交编码字段：

| 对象 | API 字段 | Database 字段 | 当前责任 | 当前风险 |
| --- | --- | --- | --- | --- |
| Category | `categoryCode` | `category_code` | 用户 / 前端提交 | 分类编码格式不统一 |
| Brand | `brandCode` | `brand_code` | 用户 / 前端提交 | 品牌编码重复或命名不统一 |
| Product | `productCode` | `product_code` | 用户 / 前端提交 | 与现有产品编码兼容复杂 |
| SKU | `skuCode` | `sku_code` | 用户 / 前端提交 | 影响采购、生产、库存、销售，是最高风险编码 |
| Manufacturer | `manufacturerCode` | `manufacturer_code` | 用户 / 前端提交 | 厂家编码重复或格式不统一 |
| Supplier | `supplierCode` | `supplier_code` | 用户 / 前端提交 | 供应商编码重复或格式不统一 |
| Warehouse | `warehouseCode` | `warehouse_code` | 用户 / 前端提交 | 仓库类型和库存范围语义容易混淆 |
| Platform | `platformCode` | `platform_code` | 用户 / 前端提交 | 平台编码重复或格式不统一 |
| Store | `storeCode` | `store_code` | 用户 / 前端提交 | 容易与平台店铺外部标识混淆 |

已确认现状：

1. `BUSINESS_RULES.md` 的 `BR-019` 当前只批准“优先沿用公司现有产品编码和 SKU 编码”，未批准系统自动生成正式编码；
2. `API_SPEC.md` 与 Task 5.2 中 Create DTO 当前仍将编码字段作为正式请求字段；
3. `DATABASE_SPEC.md` / Prisma 中已有编码字段，但没有统一编号表、编号规则表或编号序列；
4. `ROLE_PERMISSION_SPEC.md` 已有九类基础资料的 `master.*` 权限，不存在独立编号规则权限。

## 3. 自动编码目标

自动编码目标不是建立第二套平行编码，而是在保留现有编码兼容的基础上，降低人工录入成本。

目标：

1. 新建基础资料时，普通用户可以不手工填写编码；
2. 服务端根据正式规则生成唯一编码；
3. 导入历史数据时允许继续提交既有编码；
4. 如用户手工提交编码，必须经过格式、唯一性和权限校验；
5. 响应必须返回最终正式编码；
6. 编码生成必须支持并发创建、多实例部署、失败重试和事务回滚；
7. 编码不能替代正式主键、关联 ID、库存事实或审计事实；
8. 编码规则可审计、可追溯、可扩展。

非目标：

1. 不新增销售订单、BOM / MRP 或财务规则；
2. 不用前端随机值作为正式编码；
3. 不用时间戳作为无规则正式编码；
4. 不把商品展示名称、多语言名称作为稳定编码事实；
5. 不改变库存事实来源。

## 4. 编码规则设计

### 4.1 总体规则

推荐采用：

```text
{PREFIX}-{SEQUENCE}
```

或带业务上下文的：

```text
{PREFIX}-{CONTEXT}-{SEQUENCE}
```

通用要求：

1. 全部大写；
2. 前缀使用英文大写字母；
3. 流水位数默认 4 或 6 位；
4. 允许跳号，不允许重复；
5. 编码创建后默认只读；
6. 停用对象不释放编码；
7. 删除 / 作废 / 冲销不复用编码；
8. 手工编码必须通过唯一性校验。

### 4.2 对象规则建议

| 对象 | 推荐格式 | 示例 | 说明 |
| --- | --- | --- | --- |
| Category | `CAT-{0001}` | `CAT-0001` | 简单流水，分类名称仍为业务展示主体 |
| Brand | `BRD-{0001}` | `BRD-0001` | 简单流水 |
| Product | `PRD-{000001}` 或沿用现有编码 | `PRD-000001` | 默认服务端生成，但允许导入 / 手工沿用历史编码 |
| SKU | `{MODEL}-{SIZE}-{COLOR}[-{SEQ}]` | `L2-44-BK` | 使用专项规则 |
| Manufacturer | `MFR-{0001}` | `MFR-0001` | 简单流水 |
| Supplier | `SUP-{0001}` | `SUP-0001` | 简单流水 |
| Warehouse | `WHS-{TYPE}-{0001}` | `WHS-CN-0001` | 建议按仓库类型或区域加入上下文 |
| Platform | `PLT-{0001}` | `PLT-0001` | 简单流水 |
| Store | `{PLATFORM}-STR-{0001}` | `TM-STR-0001` | 建议带平台上下文，避免跨平台混淆 |

### 4.3 前缀建议

| 对象 | Prefix |
| --- | --- |
| Category | `CAT` |
| Brand | `BRD` |
| Product | `PRD` |
| SKU | 使用产品型号 / 产品编码片段 |
| Manufacturer | `MFR` |
| Supplier | `SUP` |
| Warehouse | `WHS` |
| Platform | `PLT` |
| Store | 平台编码 + `STR` |

### 4.4 手工编码规则

手工编码应作为例外能力，而不是普通用户默认路径。

建议：

1. Create DTO 中编码字段改为可选；
2. 若客户端提交编码，则使用客户端编码；
3. 若客户端不提交编码，则服务端生成；
4. 导入任务允许提交历史编码；
5. 手工编码必须：
   - 去除首尾空格；
   - 转大写或按业务规则标准化；
   - 校验长度；
   - 校验允许字符；
   - 校验唯一性；
   - 写入 Audit。

## 5. SKU 编码规则

SKU 是自动编码中风险最高的对象，因为它直接参与采购、生产、库存、入库、出库、跨境和销售引用。

### 5.1 推荐格式

```text
{productModelCode}-{sizeCode}-{colorCode}[-{variantSeq}]
```

示例：

| 产品 | 尺寸 | 颜色 | SKU Code |
| --- | --- | --- | --- |
| 入门级实木小提琴 L2 | 4/4 | 黑色 | `L2-44-BK` |
| 学生款夹板琴套餐 STU | 3/4 | 原木色 | `STU-34-NAT` |
| 学生款夹板琴套餐 STU | 4/4 | 绿色 | `STU-44-GR` |
| 冲突变体 | 4/4 | 黑色 | `L2-44-BK-02` |

### 5.2 字段来源

| 片段 | 来源建议 | CR 影响 |
| --- | --- | --- |
| `productModelCode` | 优先新增业务规则：由 Product Code 或受控型号字段提供 | 如新增字段，需要 Database CR；如复用 Product Code，不新增字段 |
| `sizeCode` | 从 SKU `size` 标准化映射 | 需要 Business Rule CR 定义映射 |
| `colorCode` | 从 SKU `color` 标准化映射 | 需要 Business Rule CR 定义映射 |
| `variantSeq` | 同组合冲突时由编号服务生成 | 需要 Database CR 支持上下文序列 |

### 5.3 尺寸映射建议

| 尺寸 | Code |
| --- | --- |
| `4/4` | `44` |
| `3/4` | `34` |
| `1/2` | `12` |
| `1/4` | `14` |
| `1/8` | `18` |
| `其他` | `OT` |

### 5.4 颜色映射建议

| 颜色 | Code |
| --- | --- |
| 黑色 | `BK` |
| 原木色 | `NAT` |
| 绿色 | `GR` |
| 红色 | `RD` |
| 棕色 | `BRN` |
| 白色 | `WH` |
| 其他 | `OT` |

### 5.5 冲突处理

推荐冲突规则：

1. 先生成基础编码，例如 `L2-44-BK`；
2. 如果已存在同编码：
   - 查找该 scope 的下一个 `variantSeq`；
   - 生成 `L2-44-BK-02`、`L2-44-BK-03`；
3. 冲突处理必须由服务端编号服务在事务中完成；
4. 不允许前端自行拼接后缀；
5. 不允许并发请求产生相同 SKU Code。

### 5.6 SKU 编辑规则

建议：

1. SKU Code 创建后默认只读；
2. 修改 SKU 名称、规格、价格、安全库存不改变 SKU Code；
3. 如尺寸或颜色修改导致编码语义变化：
   - 默认不自动改码；
   - 如确需改码，必须走高风险操作、权限校验、审计和下游影响检查；
4. 已有库存、采购、生产、出库、跨境或销售退货引用的 SKU 不允许普通改码。

## 6. 并发安全方案

### 6.1 不推荐方案

禁止采用：

```text
SELECT max(code) → +1 → INSERT
```

原因：

1. 并发创建会产生重复编码；
2. 多实例部署下进程锁无效；
3. 请求失败和重试可能生成冲突；
4. 无法支持 SKU 上下文序列；
5. 难以审计规则变更。

### 6.2 推荐方案：编号表 + 行级锁

新增数据库对象建议：

```text
code_generation_rules
├─ id
├─ object_type
├─ scope_key
├─ prefix
├─ padding
├─ current_value
├─ reset_policy
├─ is_active
├─ version_no
├─ created_at
├─ updated_at
```

生成流程：

1. 开启业务事务；
2. 根据对象类型和 scope 锁定对应规则行；
3. 使用 `SELECT ... FOR UPDATE` 或原子 `UPDATE current_value = current_value + 1 RETURNING current_value`；
4. 生成候选编码；
5. 执行业务唯一性校验；
6. 创建业务对象；
7. 写 Audit；
8. 提交事务。

特点：

- 并发安全；
- 多实例安全；
- 支持上下文规则；
- 支持 SKU 冲突后缀；
- 可审计、可迁移。

### 6.3 可选方案：PostgreSQL Sequence

适用：

- Category；
- Brand；
- Manufacturer；
- Supplier；
- Platform；
- 简单 Product。

不适用：

- SKU 组合编码；
- Store 按平台上下文编码；
- Warehouse 按类型 / 区域上下文编码。

判断：

如果项目只需要简单流水编码，Sequence 成本低；但考虑 SKU 和 Store 的上下文规则，推荐统一编号表。

## 7. 导入兼容方案

导入兼容是 UAT-009 的关键边界，因为 `BR-019` 要求优先沿用公司现有产品编码和 SKU 编码。

建议：

1. 导入模板保留编码列；
2. 导入行包含编码：
   - 校验格式；
   - 校验唯一性；
   - 校验是否与现有对象冲突；
   - 通过后沿用导入编码；
3. 导入行不包含编码：
   - 如 CR 批准，服务端自动生成；
   - 生成结果写入导入结果；
4. 导入失败行必须返回字段级原因；
5. 导入执行必须保持幂等，不允许重复生成多个业务对象；
6. 编码冲突不得自动覆盖历史数据；
7. 导入报告中必须标明“沿用编码”或“系统生成编码”。

导入模式建议：

| 模式 | 编码字段 | 行为 |
| --- | --- | --- |
| 历史数据导入 | 可填 | 优先沿用既有编码 |
| 新资料批量导入 | 可空 | 为空时自动生成 |
| 修正导入 | 必填或匹配现有对象 | 不自动改码 |

## 8. 历史数据兼容方案

现有历史数据不能被自动编码方案破坏。

建议：

1. 保留所有已有编码；
2. 编号服务初始化时扫描现有最大值和冲突值；
3. 对无法解析的旧编码建立保留记录，不强制重命名；
4. 新编码从不会与历史编码冲突的起点开始；
5. 历史编码和新编码共存；
6. 报表、查询和导入继续支持旧编码；
7. 不批量改写已经产生业务记录的 Product / SKU / Warehouse / Supplier / Manufacturer 编码；
8. 如确需历史改码，必须走单独数据治理 CR。

初始化策略：

| 对象 | 历史处理 |
| --- | --- |
| Product / SKU | 保留原编码，不自动重排 |
| Supplier / Manufacturer | 保留原编码，新编码从安全起点开始 |
| Warehouse | 保留原编码，避免影响库存范围识别 |
| Platform / Store | 保留原编码，避免影响平台 / 店铺追溯 |
| Category / Brand | 可保留原编码，新建对象使用新规则 |

## 9. Business Rule CR

Business Rule CR 必需。

建议新增或修订规则：

### BR-036 自动编码规则

系统允许在创建基础资料时由服务端生成正式业务编码。自动编码不得建立第二套平行编码，不得替代主键，不得替代库存、审计或业务事实。

### BR-037 历史编码沿用与兼容规则

历史数据、导入数据和已有业务对象编码继续保留。系统自动编码只适用于新建资料或导入空编码行，不自动覆盖已有编码。

### BR-038 SKU 组合编码规则

SKU 编码优先采用产品型号 / 产品编码片段、尺寸代码、颜色代码和冲突序号组合生成。尺寸和颜色映射必须由正式规则确认。

### BR-039 编码修改保护规则

已被采购、生产、库存、入库、出库、跨境、销售退货或导入引用的正式编码不得由普通用户直接修改。确需改码必须走高风险流程、审计和下游影响检查。

Business Rule CR 范围：

1. 自动编码是否为默认行为；
2. 手工编码是否保留；
3. 导入编码优先级；
4. SKU 型号、尺寸、颜色和冲突处理规则；
5. 编码创建后是否允许修改；
6. 编码显示和用户确认规则。

## 10. API CR

API CR 必需。

当前 API Contract 中 9 类编码字段均为 Create 请求字段。若允许自动生成，必须修改 Create DTO 语义。

建议 API CR 内容：

### 10.1 Create DTO 调整

九类基础资料 Create DTO：

| 字段 | 当前 | 建议 |
| --- | --- | --- |
| `categoryCode` | Required | Optional；为空时生成 |
| `brandCode` | Required | Optional；为空时生成 |
| `productCode` | Required | Optional；为空时生成；导入可沿用 |
| `skuCode` | Required | Optional；为空时按 SKU 规则生成 |
| `manufacturerCode` | Required | Optional；为空时生成 |
| `supplierCode` | Required | Optional；为空时生成 |
| `warehouseCode` | Required | Optional；为空时生成 |
| `platformCode` | Required | Optional；为空时生成 |
| `storeCode` | Required | Optional；为空时生成 |

### 10.2 Response 调整

创建成功响应必须返回最终编码：

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "code": "PRD-000001"
  },
  "requestId": "req-example"
}
```

实际字段仍使用各对象既有字段名，例如 `productCode`、`skuCode`，不得新增平行 `code` 字段替代正式字段。

### 10.3 生成策略

可选方案：

1. 不新增 DTO 字段：编码为空或缺失即自动生成；
2. 新增可选 `codeGenerationMode`：
   - `auto`
   - `manual`

推荐：

第一阶段不新增 `codeGenerationMode`，以降低 API 变更面；编码字段为空时自动生成，提交编码时按手工编码校验。

### 10.4 Error Code 建议

如现有错误码不足，API CR 可新增或复用：

| 场景 | 建议错误码 |
| --- | --- |
| 编码规则不存在 | `VALIDATION_CODE_RULE_MISSING` |
| 编码格式非法 | `VALIDATION_CODE_FORMAT_INVALID` |
| 编码冲突 | `CONFLICT_CODE_DUPLICATE` |
| 编码生成失败 | `SYSTEM_CODE_GENERATION_FAILED` |
| SKU 规则缺少型号 / 尺寸 / 颜色 | `VALIDATION_CODE_SOURCE_INCOMPLETE` |

如项目要求不新增 Error Code，可先复用：

- `VALIDATION_INVALID_FIELD`
- `CONFLICT_DUPLICATE`
- `SYSTEM_INTERNAL_ERROR`

但正式上线建议新增编码专用错误码以便 UAT 诊断。

### 10.5 Import API 影响

导入 API 需要明确：

1. 编码列可选；
2. 空编码是否自动生成；
3. 自动生成结果如何出现在导入结果；
4. 编码冲突如何进入失败行；
5. 重试失败行是否复用同一生成结果或重新生成；
6. 幂等重复请求不得生成重复业务对象。

## 11. Database CR

Database CR 必需。

原因：

1. 正式自动编码必须并发安全；
2. 当前数据库没有统一编号规则表或编号序列表；
3. SKU / Store / Warehouse 需要上下文序列；
4. 需要记录规则、当前值、启用状态和审计字段；
5. 可能需要补充编码字段唯一约束或唯一索引。

### 11.1 推荐新增对象

建议新增：

```text
code_generation_rules
```

字段方向：

| 字段 | 方向 |
| --- | --- |
| `id` | UUID 主键 |
| `object_type` | 对象类型，如 `product`、`sku`、`warehouse` |
| `scope_key` | 作用域，如 `global`、`platform:{platformId}`、`sku:{model}:{size}:{color}` |
| `prefix` | 编码前缀 |
| `padding` | 流水位数 |
| `current_value` | 当前已使用最大流水 |
| `reset_policy` | 重置策略，第一阶段建议 `never` |
| `is_active` | 是否启用 |
| `version_no` | 乐观锁版本 |
| `created_by` / `updated_by` | 审计用户 |
| `created_at` / `updated_at` | 时间戳 |

约束建议：

- 主键：`id`；
- 唯一：`object_type + scope_key`；
- Check：`object_type`、`reset_policy`、`padding > 0`、`current_value >= 0`；
- Index：`object_type`、`is_active`。

### 11.2 可选新增对象

如果 SKU 颜色 / 尺寸需要后台维护，可新增：

```text
code_generation_dictionaries
```

但第一阶段建议先通过 Business Rule 固定映射，避免扩大 DCR。

### 11.3 编码唯一约束

建议 DCR 进一步审计并确认是否补充：

| 对象 | 唯一约束建议 |
| --- | --- |
| Category | `category_code` 全局唯一 |
| Brand | `brand_code` 全局唯一 |
| Product | `product_code` 全局唯一 |
| SKU | `sku_code` 全局唯一 |
| Manufacturer | `manufacturer_code` 全局唯一 |
| Supplier | `supplier_code` 全局唯一 |
| Warehouse | `warehouse_code` 全局唯一 |
| Platform | `platform_code` 全局唯一 |
| Store | `store_code` 全局唯一 |

注意：

补唯一约束前必须检查历史数据冲突；如存在冲突，应先数据治理，不得直接 Migration。

## 12. Permission 影响

最小自动编码：Permission CR Not Required。

原因：

1. 自动编码是创建基础资料时的内部服务能力；
2. 继续复用九类对象现有 `master.*.create` 权限；
3. 手工编码可继续跟随对应对象的 `create` / `update` 权限；
4. 不需要普通用户新增编号权限。

需要 Permission CR 的场景：

1. 新增“编号规则管理页面”；
2. 允许业务用户修改编号规则；
3. 允许高风险改码；
4. 引入 `system.code-rule.*` 或 `master.code-rule.*`。

建议：

第一阶段不建设编号规则管理页面，由系统预置规则；因此不提交 Permission CR。

## 13. 实施优先级

### P0：CR 批准

1. Business Rule CR；
2. API CR；
3. Database CR；
4. 明确是否新增 Error Code；
5. 明确是否补唯一约束。

### P1：高价值对象

1. SKU Code；
2. Product Code；
3. Warehouse Code；
4. Store Code。

原因：

- 这些编码直接影响采购、生产、库存、出库、跨境、销售和导入追溯。

### P2：普通基础资料

1. Category Code；
2. Brand Code；
3. Manufacturer Code；
4. Supplier Code；
5. Platform Code。

原因：

- 这些编码主要用于识别、查询和导入，业务风险相对低。

### P3：可选增强

1. 编号规则管理页面；
2. 高风险改码流程；
3. 编码审计查询；
4. SKU 尺寸 / 颜色字典维护。

## 14. 推荐实施方案

推荐实施顺序：

1. 提交并批准 Business Rule CR；
2. 提交并批准 API CR；
3. 提交并批准 Database CR；
4. 更新 Database SSOT；
5. 更新 API SSOT；
6. 实现 `code_generation_rules` Migration；
7. 实现 Code Generation Service；
8. 接入 Master Data Create 流程；
9. 接入导入流程；
10. 更新 PC Admin 表单：编码字段默认隐藏或只读展示；
11. 增加并发生成、导入兼容、历史兼容和字段级错误测试；
12. UAT 复验 UAT-009。

实现边界：

- 不改变已存在业务对象 ID；
- 不回填改写历史编码；
- 不在前端生成正式编码；
- 不绕过唯一性校验；
- 不把编码作为权限或库存事实。

## 15. CR Matrix

| CR | Required | 内容 |
| --- | --- | --- |
| Business Rule CR | Yes | 批准自动编码、历史兼容、手工编码、SKU 组合规则、改码保护 |
| API CR | Yes | Create DTO 编码字段可选、响应返回生成编码、导入兼容、错误码 |
| Database CR | Yes | 新增编号规则 / 编号序列表、约束、索引、并发安全；审计唯一约束 |
| Permission CR | No for minimal scope | 复用 `master.*.create`；规则管理页面或改码流程才需要 |

## 16. Final Recommendation

建议批准 UAT-009 进入正式 CR 流程。

推荐采用：

服务端 Code Generation Service + `code_generation_rules` 数据库对象 + Create DTO 编码字段可选 + 导入历史编码兼容。

不建议：

- 前端自动填随机编码；
- 无锁查询最大值后加 1；
- 时间戳编码；
- 自动改写历史编码；
- 在未批准 CR 前隐藏编码字段并提交空值。

UAT-009 当前状态应继续保持：

Blocked by CR
