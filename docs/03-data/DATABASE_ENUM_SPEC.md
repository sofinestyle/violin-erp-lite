---
document_name: 数据库枚举规范
project: Violin ERP Lite
version: 1.1
status: Completed / Approved / Frozen
owner: Project Manager
created_date: 2026-07-22
updated_date: 2026-07-23
related_phase: Phase 3
---

# 数据库枚举规范

## 1. 文档目的

本文档统一维护 Frozen Database Logical Design v2.0 的正式枚举代码，作为数据库物理映射、DTO 和 Validation 的唯一正式枚举输入。当前覆盖 `warehouse_type` 与 `access_level`。

Database Change Request 002 新增的 `user_wechat_identities.status` 是表内 Check 约束的局部生命周期代码，不新增 PostgreSQL Enum，也不扩展本文件的正式枚举集合。

## 2. `warehouse_type` 正式枚举

| 英文代码 | 中文含义 |
| --- | --- |
| `company` | 公司实际仓库 |
| `manufacturer` | 生产厂家仓库 |
| `overseas` | 海外仓库 |
| `transit` | 在途仓 |
| `pending` | 待处理仓 |

`warehouse_type` 只允许使用上述五个小写英文代码，不得自行新增、重命名、合并、拆分或使用同义代码。

## 3. `access_level` 正式枚举

| 英文代码 | 中文含义 | 正式语义 |
| --- | --- | --- |
| `read` | 只读 | 仅允许查看，不得新增、修改、删除或审批 |
| `operate` | 操作 | 允许新增、修改及执行业务处理，不允许管理权限 |
| `manage` | 管理 | 允许全部业务操作及配置管理 |

`access_level` 只允许使用上述三个小写英文代码，不得自行新增、重命名、合并、拆分或使用同义代码。

`access_level` 表达 `role_warehouses` 与 `role_stores` 的数据范围访问级别，不替代正式功能权限、操作权限、状态、职责分离或其他后端校验。任何查看、业务操作或配置管理仍必须同时具备 `ROLE_PERMISSION_SPEC.md` 和 API Master Specification 要求的正式权限。

## 4. Check 约束对应关系

| 条件 | 正式规则 | 对应 Check |
| --- | --- | --- |
| `warehouse_type = 'manufacturer'` | `manufacturer_id` 必须非空 | `ck_warehouses_manufacturer_required` |
| `warehouse_type = 'overseas'` | `country_code` 必须非空 | `ck_warehouses_country_required` |
| `warehouse_type IN ('transit', 'pending')` | `allows_available_stock` 必须为 `false` | `ck_warehouses_available_stock_role` |
| `warehouse_type IN ('company', 'manufacturer', 'overseas')` | 可以允许形成可用库存 | 由仓库类型与 `allows_available_stock` 组合语义控制 |

表中 `allows_available_stock` 是 Frozen Database Logical Design v2.0 继承的已批准字段名，不新增平行字段或别名。

## 5. 物理映射要求

1. PostgreSQL、Prisma Schema、Migration、DTO 及 Validation 必须使用本文档定义的英文代码。
2. 物理映射必须限制 `warehouse_type` 只能取五个正式值。
3. 物理映射必须限制 `access_level` 只能取 `read`、`operate`、`manage` 三个正式值。
4. 物理映射必须实现与三条已批准仓库 Check 规则一致的同行约束。
5. 本文档不授权新增其他枚举值、字段、关系或业务规则。
6. 如后续需要变更枚举集合或语义，必须经项目负责人批准并完成正式变更流程。

## 6. 正式结论

- 文档版本：v1.1；
- 文档状态：Completed / Approved / Frozen；
- `warehouse_type` 正式枚举数量：5；
- `access_level` 正式枚举数量：3；
- 数据库表、字段、关系及原有 Check 规则修改数量：0；
- DCR-002 新增 PostgreSQL Enum 数量：0；
- 后续数据库物理映射、DTO 和 Validation 必须以本文档为 `warehouse_type` 与 `access_level` 枚举的唯一正式输入。
