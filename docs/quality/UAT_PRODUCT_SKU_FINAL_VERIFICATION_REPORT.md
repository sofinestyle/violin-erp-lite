# Product / SKU Final Verification Report

## 1. 执行结论

Product Model Unique Constraint 与 Product / SKU Management Refactoring 最终自动复核已完成。

结论：

- 产品型号唯一性：Fixed / Pending Verification；
- Product 创建：通过；
- SKU 组合生成：通过；
- 自动编码：通过；
- Database CR-004：已实施；
- API 校验：已实施；
- Permission：No Change。

## 2. 产品型号唯一性

CR-004 已实施：

- `products.product_name_en` 正式作为“产品型号”；
- 字段必填；
- 去空格后不得为空；
- 大小写不敏感唯一；
- 不新增 Product Model 字段。

数据库对象：

- Migration：`20260813090000_add_product_model_unique_constraint`；
- 唯一索引：`uq_products_product_name_en`；
- Check：`ck_products_product_name_en_not_blank`。

执行前审计：

- 空型号或 NULL 型号：0；
- 重复型号：0；
- 旧 `L2-*` 测试 SKU 占用：0。

说明：

本地 UAT 旧测试数据已按项目负责人确认进行清理，仅释放 `L2` 型号和 `L2-*` 测试 SKU 编码，不删除业务表、不重建数据库、不覆盖 Seed。

## 3. Product 验证

测试输入：

- 产品名称：`UAT-CR004 普及实木亮光小提琴`；
- 产品型号：`L2`；
- 分类：`提琴`；
- 单位：`把`。

结果：

- Product 创建成功；
- 自动生成 Product Code：`PRD-000005`；
- 产品型号保存为 `L2`；
- 用户无需输入 Product Code。

重复保护：

- 再次创建产品型号 `L2` 被拒绝；
- 返回业务提示：`产品型号已存在，请使用其他型号`。

## 4. SKU 验证

测试组合：

| 尺寸 | 颜色 | SKU Code |
| --- | --- | --- |
| `4/4` | `棕色` | `L2-44-BR` |
| `4/4` | `黑色` | `L2-44-BK` |
| `3/4` | `棕色` | `L2-34-BR` |
| `3/4` | `黑色` | `L2-34-BK` |
| `1/2` | `棕色` | `L2-12-BR` |
| `1/2` | `黑色` | `L2-12-BK` |

结果：

- 6 个 SKU 均创建成功；
- SKU Code 由服务端按“型号-尺寸-颜色”生成；
- SKU Name 按产品名称、尺寸、颜色生成；
- 单位为 `把`；
- 最低安全库存为 `0`；
- 用户无需输入 SKU Code、SKU Name、UUID、JSON 或英文状态码。

重复保护：

- 重复创建相同“型号 + 尺寸 + 颜色”组合被拒绝；
- 最终裁决仍由 SKU 唯一约束保障。

## 5. 自动编码验证

Product：

- 未提交 `productCode`；
- 服务端生成 `PRD-000005`。

SKU：

- 未提交 `skuCode`；
- 服务端生成 `L2-44-BR`、`L2-44-BK`、`L2-34-BR`、`L2-34-BK`、`L2-12-BR`、`L2-12-BK`。

未修改：

- SKU 编码规则；
- 自动编码服务范围；
- Category / Brand / Platform / Store 编码策略。

## 6. API 校验结果

Product Create：

- `productNameEn` 为空：失败；
- `productNameEn` 重复：失败；
- 合法唯一 `productNameEn`：成功。

Product Update：

- 修改为其他产品已使用型号：失败；
- 继续复用既有 `MD-*` API；
- 不新增 API Path、Response 字段、分页字段或错误码。

## 7. 测试结果

已执行：

- `pnpm exec vitest run apps/admin/tests/master-data-page.test.tsx`：通过，15 tests passed；
- `pnpm --filter @violin-erp/api exec vitest run tests/master-data.test.ts`：通过，21 tests passed；
- `pnpm --filter @violin-erp/database exec vitest run tests/code-generation-service.test.ts tests/master-data-repository.test.ts`：通过，11 tests passed。

待最终提交前执行：

- `pnpm check`；
- `pnpm status:check`；
- `git diff --check`。

## 8. UAT 状态

UAT-009：

Fixed / Pending Verification

Product / SKU Management Refactoring：

Fixed / Pending Verification

待人工复验：

- PC Admin 中创建产品不要求输入编码；
- PC Admin 中产品型号标签显示为“产品型号”；
- PC Admin 中重复型号提示可读；
- SKU 管理可生成并保存 6 个目标组合；
- 已存在 SKU 不重复创建。
