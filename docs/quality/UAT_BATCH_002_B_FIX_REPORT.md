---
document_name: UAT Batch 002-B Master Data UX Refactoring Report
project: Violin ERP Lite
version: 1.0
status: Draft
owner: Project Manager
created_date: 2026-08-03
updated_date: 2026-08-03
related_phase: Phase 10
---

# UAT Batch 002-B Master Data UX Refactoring Report

## 1. 修复目标

本批次针对基础资料模块进行前端 UX 重构，目标是降低普通业务用户的理解和录入成本：

- 减少不必要的人工输入；
- 将技术字段转换为业务用户能理解的中文下拉、默认值和说明；
- 在不改变 Frozen Database / API / Permission 的前提下优化页面组织；
- 明确保留 UAT-009 自动编码为 CR 阻断项，不在本批实现。

## 2. 修改范围

本批仅修改 PC Admin 基础资料前端配置、页面渲染和测试文档。

修改文件：

- `apps/admin/lib/master-data.ts`
- `apps/admin/components/master-data/master-data-workbench.tsx`
- `apps/admin/components/master-data/workbench-hub.tsx`
- `apps/admin/tests/master-data-page.test.tsx`
- `docs/quality/UAT_BATCH_002_B_FIX_REPORT.md`
- `docs/quality/UAT_CHANGE_LOG.md`
- `docs/quality/UAT_TEST_RECORD.md`

未修改：

- Database Schema
- Migration
- API Contract
- Permission Spec
- 业务状态机
- UAT-009 自动编码逻辑

## 3. UX 优化清单

### 3.1 产品分类

- 增加分类预设：提琴、吉他、尤克里里、配件；
- 支持自定义分类名称，作为推荐模板 / 快捷选择，不直接修改生产数据；
- 不存在的分类通过现有 Category API 创建；同名分类由现有唯一性校验禁止重复创建；
- 隐藏产品类型以外的技术性层级输入；
- 分类层级根据上级分类在前端自动推导；
- 显示顺序使用默认值 `0`，不再要求用户填写。

### 3.2 品牌

- 简化品牌页面字段组织；
- 突出品牌名称；
- 品牌编码继续保留手工录入，等待 UAT-009 CR。

### 3.3 产品 / SKU

- 保持 Product 与 SKU 数据库对象分离；
- 在入口页以“产品 / SKU 规格”组合展示，降低用户理解成本；
- 产品表单隐藏底层 `productType`，使用 Frozen Contract 已允许的固定默认值 `violin` 提交；
- SKU 名称支持根据产品、尺寸、颜色和规格自动生成；
- Product 表单支持录入多行 SKU：先保存 Product，再逐条调用现有 SKU API 创建；
- SKU 表单支持批量录入规格行：逐条调用现有 SKU API 创建；
- 批量 SKU 不新增批量创建 API，不宣称原子批量提交或整体回滚；
- 批量 SKU 显示每一行成功 / 失败结果，失败行可单独重试；
- 单位改为中文下拉；
- 最低安全库存默认 `0`；
- 字段按基础信息、业务归类、规格信息、库存与价格分组。

### 3.4 厂家 / 供应商

- 结算方式改为中文下拉：预付、现结、月结、自定义；
- 联系方式、结算信息、银行信息、生产信息和备注按业务分组展示。

### 3.5 仓库

- 仓库类型改为中文下拉；
- 责任主体改为中文下拉；
- 显示顺序隐藏并使用默认值 `0`；
- 地址、联系方式、库存规则分组展示。

### 3.6 平台 / 店铺

- 在入口页以“平台 / 店铺”组合展示；
- 底层继续使用 `ecommerce_platforms` 与 `stores`；
- 平台类型、国家代码、业务币种改为中文下拉；
- 店铺外部标识保留 Frozen API 当前校验说明，不绕过契约。

### 3.7 统一体验

- 补充中文文案、Placeholder、字段说明和空状态；
- 保留成功 / 失败反馈和 Request ID 错误链路；
- 不再暴露隐藏技术字段给普通录入流程；
- 基础资料正式生命周期仍为启用 / 停用，不新增物理删除；
- 产品 / SKU、平台 / 店铺仅合并前端管理入口和上下文展示，独立数据对象、API、权限和状态保持不变；
- 未实现自动编码，所有编码字段仍按 Frozen API 保留。

## 4. Frozen 影响判断

| 项目 | 判断 | 说明 |
|---|---|---|
| Database | Not Changed | 未修改 Schema / Migration / DATABASE_SPEC |
| API | Not Changed | 未新增 Path，未修改 DTO / Response / Error Code |
| Permission | Not Changed | 未新增 Permission Code |
| Business Rule | Not Changed | 未改变正式状态机和库存事实边界 |
| UAT-009 | Blocked by CR | 自动编码仍需 CR，不在本批实现 |
| Batch Create | Not Atomic | 逐条调用现有 SKU API；失败行单独重试，不具备整体回滚 |

## 5. 测试结果

自动化测试：

- `pnpm exec vitest run apps/admin/tests/master-data-page.test.tsx`：通过。
- `pnpm check`：通过。
- `pnpm status:check`：通过。
- `git diff --check`：通过。

浏览器冒烟：

- `http://localhost:3100/workspace/master-data`：可打开；
- Master Data 入口显示“产品 / SKU 规格”和“平台 / 店铺”组合入口；
- 产品分类、产品、SKU、生产厂家、供应商、仓库、电商平台、店铺新增表单均可打开；
- 关键中文下拉、默认值、字段说明可见；
- 产品类型、分类层级、显示顺序等隐藏字段未暴露给普通录入流程；
- Product / SKU 批量新增文案明确逐条调用现有 SKU API，不具备原子批量或整体回滚能力；
- Browser 控制台 error / warn：0；
- Browser 截图命令受当前 in-app Browser 能力限制未产出截图，不影响 DOM 与交互验证结论。

## 6. 本地人工冒烟范围

建议项目负责人复验：

- 产品分类新增 / 编辑 / 停用；
- 品牌新增 / 编辑 / 停用；
- 产品新增 / 编辑 / 停用；
- SKU 单条新增、批量新增、编辑 / 停用；
- 厂家新增 / 编辑 / 停用；
- 供应商新增 / 编辑 / 停用；
- 仓库新增 / 编辑 / 停用；
- 平台新增 / 编辑 / 停用；
- 店铺新增 / 编辑 / 停用。

说明：

- 本系统当前基础资料冻结能力为启用 / 停用，不新增删除能力；
- 如需物理删除或编码自动生成，需要独立 CR。
- 浏览器冒烟使用 UAT 标识测试数据；测试后可停用测试数据，不直接删除业务数据。

## 7. 待人工复验项

- 组合入口是否符合业务用户理解；
- 分类预设和自定义输入是否满足实际分类习惯；
- SKU 批量录入格式是否易懂；
- 厂家 / 供应商结算方式下拉是否覆盖当前业务；
- 仓库责任主体下拉是否符合运营用语；
- 平台 / 店铺统一入口是否符合人工验收预期。
