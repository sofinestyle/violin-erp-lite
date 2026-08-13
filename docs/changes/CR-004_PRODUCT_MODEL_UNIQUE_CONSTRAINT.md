# Change Request

编号：CR-004

类型：Database Change / API Validation Change

主题：Product Model Unique Constraint

状态：Approved / Implemented

Approved By：Project Owner

Approval Date：2026-08-13

## 1. 背景

UAT-009 自动编码第一阶段确认不新增产品型号字段，复用 `products.product_name_en` 的业务语义作为“产品型号”。SKU 自动编码使用“型号-尺寸-颜色”生成正式 SKU Code，例如 `L2-44-BK`。

当前问题：

- `productNameEn` 已在 Product Create DTO 中作为产品型号必填；
- 数据库层尚未限制产品型号唯一；
- 多个 Product 使用同一型号时，会造成 SKU 组合编码冲突；
- 业务人员无法仅依靠人工输入保证型号唯一。

## 2. 变更目标

对 `products.product_name_en` 增加数据库级唯一约束与非空保护，使产品型号成为可稳定引用的业务编码组成部分。

## 3. 变更内容

Database：

- `products.product_name_en` 调整为必填；
- 新增 Check：`ck_products_product_name_en_not_blank`；
- 新增唯一索引：`uq_products_product_name_en`，基于 `lower(trim(product_name_en))`，保证大小写与首尾空格不导致重复型号。

API：

- Product Create：`productNameEn` 为空时失败；
- Product Create：`productNameEn` 重复时失败；
- Product Update：修改为其他产品已使用型号时失败；
- 错误提示使用业务化文案：`产品型号已存在，请使用其他型号`。

Permission：

- No Change。

## 4. 边界

本 CR 不新增产品型号字段，不修改 SKU 编码规则，不修改自动编码服务，不新增 API Path，不新增 Permission Code，不重写历史编码。

## 5. 兼容策略

- 已有历史产品型号保持不变；
- Migration 执行前审计空值与重复值；
- 如发现空值或重复值，Migration 停止，不自动修改正式业务数据；
- 本地 UAT 测试数据可按项目负责人确认进行清理。

## 6. 风险

- 现有重复型号会阻塞 Migration；
- 历史导入数据如缺少型号，需要先补齐；
- 型号规则不清晰会影响 SKU 编码可读性。

## 7. 验收标准

- Migration 可执行；
- 数据库拒绝空型号与重复型号；
- Product Create / Update 能返回明确业务错误；
- `L2` 型号产品只能存在一个；
- SKU 组合编码不会因多个 Product 共享同一型号产生歧义；
- Permission 无变化。
