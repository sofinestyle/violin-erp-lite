# Master Data Delete Strategy Report

## 1. 删除规则

本次优化面向基础资料测试数据清理，保留正式启用 / 停用生命周期，并只允许删除无业务引用的数据。

删除结果分为三类：

1. 无业务引用：允许删除；
2. 已被业务单据或库存引用：禁止删除，提示“该数据已被业务单据引用，无法删除，请停用。”；
3. 系统数据：禁止删除，提示“系统数据不可删除。”。

本次未修改 Database Schema、Migration、业务状态模型或 Permission Code。由于既有 Master Data API 没有删除入口，本次新增 6 个受控 `DELETE` API，并已同步 `API_SPEC.md` v1.8。删除权限复用对应资源既有 `master.*.update` 权限，不新增 `delete` 权限码。

## 2. 引用检查范围

第一阶段支持安全删除的对象：

- Product Category；
- Product；
- SKU；
- Supplier；
- Manufacturer；
- Warehouse。

引用检查范围如下：

| 对象 | 引用检查 |
| --- | --- |
| Product Category | 子分类、Product |
| Product | SKU、Product Supplier Relation、Product Manufacturer Relation |
| SKU | Inventory、Inventory Transaction、Purchase Item、Production Item、Inspection Item、Inbound Item、Outbound Item、Adjustment Item、Cross-border Shipment Item、Sales Return Item、Transfer Item、Stock Count Item、Damage Report Item、Purchase Return Item、Production Completion Item、Import Task Match、Inventory Alert |
| Supplier | Purchase Order、Purchase Payment、Purchase Return、Inbound Order、Product Supplier Relation |
| Manufacturer | Production Order、Production Payment、Inbound Order、Product Manufacturer Relation、Manufacturer Warehouse |
| Warehouse | Inventory、Inventory Transaction、Inbound、Inspection、Outbound、Adjustment、Cross-border Shipment、Transfer、Stock Count、Damage Report、Sales Return、Purchase Return、Import Task、Import Task Match、Inventory Alert、Production Completion、Role Warehouse Scope |

Brand、Platform、Store 本次不开放删除，继续通过启用 / 停用管理生命周期。

## 3. 系统数据保护

当前数据库模型未提供 `is_system` 字段。为避免修改 Database Schema，本次采用保守保护规则：

- 编码以 `SYS-` 开头的数据视为系统数据；
- 编码以 `SYSTEM-` 开头的数据视为系统数据。

该规则不影响普通业务编码和历史数据。若后续需要更精确的系统数据治理，应提交 Database CR 增加正式系统数据标记字段。

## 4. 前端交互

基础资料列表增加删除入口：

- 只在 Product Category、Product、SKU、Supplier、Manufacturer、Warehouse 显示；
- 删除前弹出二次确认：“删除后无法恢复，确认删除吗？”；
- 删除成功后刷新列表；
- 删除失败时显示服务端业务提示；
- 保留原有启用 / 停用按钮。

## 5. 测试结果

已新增并通过以下测试：

- Product 无引用删除成功；
- Product 存在 SKU 引用时删除失败；
- Product Category 无引用删除成功；
- Product Category 存在 Product 或子分类引用时删除失败；
- Supplier 存在采购引用时删除失败；
- Supplier 无引用删除成功；
- Warehouse 存在库存引用时删除失败；
- Warehouse 无引用删除成功；
- 系统编码数据禁止删除；
- 前端只对批准范围显示删除能力；
- 删除失败返回业务化提示，不暴露数据库错误。

执行结果：

- `pnpm exec vitest run apps/admin/tests/master-data-page.test.tsx`：通过；
- `pnpm --filter @violin-erp/api exec vitest run tests/master-data.test.ts`：通过；
- `pnpm --filter @violin-erp/database exec vitest run tests/master-data-repository.test.ts`：通过；
- `pnpm check`：通过。

## 6. 风险说明

1. 删除为物理删除，仅允许无业务引用的基础资料测试数据；已被业务引用的数据必须停用；
2. 本次不删除任何业务单据、库存记录或库存流水；
3. 系统数据识别依赖编码前缀，后续若需要正式系统数据标记，应另行提交 Database CR；
4. 删除权限复用 `master.*.update`，不新增 Permission Code；
5. 本次新增受控 Delete API，已同步 API SSOT，未修改 DTO、Response 包装、错误码或 Permission Code。
