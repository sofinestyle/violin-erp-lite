---
document_name: 数据库枚举规范
project: Violin ERP Lite
version: 1.0
status: Completed / Approved / Frozen
owner: Project Manager
created_date: 2026-07-22
updated_date: 2026-07-22
related_phase: Phase 3
---

# 数据库枚举规范

## 1. 文档目的

本文档补全 Frozen Database Logical Design v1.1 已预留的 `warehouse_type` 正式枚举代码，作为后续数据库物理映射的正式输入。

本次枚举补全不新增、删除或修改任何数据库表、字段、关系、索引、Check 规则或业务对象，不改变仓库类型的已批准业务语义。

## 2. `warehouse_type` 正式枚举

| 英文代码 | 中文含义 |
| --- | --- |
| `company` | 公司实际仓库 |
| `manufacturer` | 生产厂家仓库 |
| `overseas` | 海外仓库 |
| `transit` | 在途仓 |
| `pending` | 待处理仓 |

`warehouse_type` 只允许使用上述五个小写英文代码，不得自行新增、重命名、合并、拆分或使用同义代码。

## 3. Check 约束对应关系

| 条件 | 正式规则 | 对应 Check |
| --- | --- | --- |
| `warehouse_type = 'manufacturer'` | `manufacturer_id` 必须非空 | `ck_warehouses_manufacturer_required` |
| `warehouse_type = 'overseas'` | `country_code` 必须非空 | `ck_warehouses_country_required` |
| `warehouse_type IN ('transit', 'pending')` | `allows_available_stock` 必须为 `false` | `ck_warehouses_available_stock_role` |
| `warehouse_type IN ('company', 'manufacturer', 'overseas')` | 可以允许形成可用库存 | 由仓库类型与 `allows_available_stock` 组合语义控制 |

表中 `allows_available_stock` 是 Frozen Database Logical Design v1.1 已批准字段名，不新增平行字段或别名。

## 4. 物理映射要求

1. PostgreSQL、Prisma Schema、Migration 及相关校验必须使用本文档定义的英文代码。
2. 物理映射必须限制 `warehouse_type` 只能取五个正式值。
3. 物理映射必须实现与三条已批准仓库 Check 规则一致的同行约束。
4. 本文档不授权新增其他枚举值、字段、关系或业务规则。
5. 如后续需要变更枚举集合或语义，必须经项目负责人批准并完成正式变更流程。

## 5. 正式结论

- 文档版本：v1.0；
- 文档状态：Completed / Approved / Frozen；
- `warehouse_type` 正式枚举数量：5；
- 数据库表、字段、关系及原有 Check 规则修改数量：0；
- 后续数据库物理映射必须以本文档为 `warehouse_type` 枚举的唯一正式输入。
