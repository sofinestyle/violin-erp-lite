# Product / SKU Management Unified Refactoring Report

## 1. 执行范围

本轮围绕 PC Admin 基础资料中的 Product / SKU 管理体验进行重构。

目标：

- Product 只维护型号级主数据；
- SKU 维护产品型号 × 尺寸 × 颜色形成的销售 / 库存最小单元；
- 普通用户不再录入 SKU Code、SKU Name、UUID、JSON 或英文状态码；
- SKU 新增主流程由手工逐行录入调整为规格组合生成。

## 2. Product 页面调整

已完成：

- 产品编码继续由服务端自动生成，前端只读展示；
- 产品名称保持必填；
- `productNameEn` 前端语义从“英文名称”调整为“产品型号”；
- 产品型号在 Create DTO 校验中为必填；
- 产品类型继续隐藏，使用已批准默认值 `violin`；
- 默认单位继续复用统一单位下拉；
- Product 新增 / 编辑页移除 SKU 批量新增区域；
- Product 列表新增“SKU 管理”入口，跳转至 SKU 页面并携带当前 Product 上下文。

未落地：

- 产品型号唯一性未落地。

原因：

- 当前 `products.product_name_en` 未发现数据库唯一约束；
- 根据本任务治理要求，唯一约束落地需先提交 Database CR；
- 本轮不以应用层查询模拟数据库唯一约束，避免并发下形成伪保障。

状态：

Product 页面重构：Fixed / Pending Automated Verification

产品型号唯一性：Blocked by Database CR

## 3. SKU 页面调整

已完成：

- “所属产品”前端标签调整为“产品型号”；
- Product 下拉显示业务化标签：`产品型号｜产品名称`；
- SKU 创建页隐藏 SKU Code、SKU Name、尺寸、颜色、规格、材质和条码等手工主流程字段；
- 新增 SKU 组合生成器；
- 支持按产品分类展示尺寸预设：
  - 提琴：`4/4`、`3/4`、`1/2`、`1/4`、`1/8`、`1/10`、`1/16`、`自定义`；
  - 吉他：`36寸`、`38寸`、`39寸`、`40寸`、`41寸`、`自定义`；
  - 尤克里里：`21寸`、`23寸`、`26寸`、`自定义`；
  - 配件：`无尺寸`、`自定义`；
- 支持颜色预设：
  - 原木色 `NAT`
  - 棕色 `BR`
  - 黑色 `BK`
  - 白色 `WH`
  - 红色 `RD`
  - 蓝色 `BL`
  - 绿色 `GN`
  - 黄绿色 `YG`
  - 自定义
- 自定义颜色必须输入受控英文 / 数字色码，不使用中文直接生成 SKU Code；
- SKU 名称按“产品名称 + 尺寸 + 颜色”自动生成；
- 组合预览表展示预览编码、SKU 名称、单位、价格和最低安全库存；
- 批量设置支持单位、采购价、生产价、销售价、最低安全库存，并可一键应用到所有 SKU；
- 预览行支持单独修改 SKU 名称、单位、价格和最低安全库存；
- 保存时逐条调用现有 SKU Create API；
- 不新增批量创建 API；
- 不宣称原子批量提交或整体回滚。

状态：

SKU 页面重构：Fixed / Pending Automated Verification

## 4. SKU 编码规则

服务端 CodeGenerationService 已同步扩展 SKU 编码映射。

尺寸映射：

- `4/4` → `44`
- `3/4` → `34`
- `1/2` → `12`
- `1/4` → `14`
- `1/8` → `18`
- `1/10` → `110`
- `1/16` → `116`
- `36寸` → `36`
- `38寸` → `38`
- `39寸` → `39`
- `40寸` → `40`
- `41寸` → `41`
- `21寸` → `21`
- `23寸` → `23`
- `26寸` → `26`
- `无尺寸` → `NS`

颜色映射：

- 原木色 → `NAT`
- 棕色 → `BR`
- 黑色 → `BK`
- 白色 → `WH`
- 红色 → `RD`
- 蓝色 → `BL`
- 绿色 → `GN`
- 黄绿色 → `YG`

规则：

- SKU Code 最终仍由服务端生成；
- 前端只做预览和用户确认；
- 保存请求不提交 `skuCode`；
- 重复组合由前端预检查标记“已存在”，服务端唯一约束继续作为最终裁决。

## 5. API / Database / Permission 边界

Database：

- 未新增表；
- 未新增字段；
- 未新增 Migration；
- 未修改 Schema；
- 产品型号唯一性需要 Database CR。

API：

- 未新增 API Path；
- 未新增批量 SKU 创建 API；
- Product options 同步返回已有字段 `productNameEn` 与 `defaultUnit`，用于业务化下拉展示和默认单位继承；
- Product Create 中 `productNameEn` 按本轮字段校验要求设为必填。

Permission：

- 未新增 Permission Code；
- Product 与 SKU 仍分别使用既有 `master.product.*` 与 `master.sku.*`。

## 6. 自动化测试

已补充 / 更新测试覆盖：

- Product 型号字段显示；
- Product 类型隐藏并保留默认值；
- Product / SKU 共用单位选项源；
- SKU 产品型号下拉字段配置；
- SKU 尺寸预设；
- SKU 颜色预设；
- Store UUID 文案不暴露回归；
- Product options 返回产品型号；
- Product 型号必填；
- SKU 扩展尺寸与颜色编码映射。

已执行：

- `pnpm exec vitest run apps/admin/tests/master-data-page.test.tsx`：通过；
- `pnpm --filter @violin-erp/api exec vitest run tests/master-data.test.ts`：通过；
- `pnpm --filter @violin-erp/database exec vitest run tests/code-generation-service.test.ts`：通过。

完整验证结果以最终提交前 `pnpm check`、`pnpm status:check` 和 `git diff --check` 为准。

## 7. 待自动 / 人工复验

待复验：

- 创建产品：产品名称 `普及实木亮光小提琴`，产品型号 `L2`，分类 `提琴`，单位 `把`；
- 从 Product 列表点击“SKU 管理”进入 SKU 页面；
- 选择尺寸 `4/4`、`3/4`、`1/2`；
- 选择颜色 `棕色`、`黑色`；
- 生成 6 个 SKU 预览；
- 确认预览包含：
  - `L2-44-BR`
  - `L2-44-BK`
  - `L2-34-BR`
  - `L2-34-BK`
  - `L2-12-BR`
  - `L2-12-BK`
- 确认用户无需手工录入 SKU Code 或 SKU Name；
- 确认重复 SKU 显示“已存在”并跳过创建；
- 确认失败行可单独重试。

## 8. UAT 状态

Product / SKU Management UX Refactoring：

Fixed / Pending Automated Verification

产品型号唯一性：

Blocked by Database CR
