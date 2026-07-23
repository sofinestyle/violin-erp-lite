---
document_name: 数据库规格
project: Violin ERP Lite
version: 2.0
status: Completed / Approved / Frozen
owner: Project Manager
created_date: 2026-07-19
updated_date: 2026-07-23
related_phase: Phase 3 / Phase 7
---

# DATABASE SPEC

## 1. 正式状态

Phase 3 数据库设计（Database Design）已完成并冻结。Database Logical Design v1.0 于 2026-07-20 冻结；DCR-001 于 2026-07-21 批准后升级为 v1.1；项目负责人于 2026-07-23 批准 Database Change Request 002，并将微信身份映射对象纳入正式数据库设计。

当前唯一有效版本为：

- Database Logical Design：v2.0；
- 状态：Completed / Approved / Frozen；
- 正式表：61；
- 正式字段：1142；
- 主键：61；
- 唯一约束：74；
- 外键：287；
- 普通索引：91；
- Check：208；
- 正式数据库枚举：2。

Database Logical Design v1.1 的 60 张表和 1128 个字段保留为历史冻结基线。v2.0 只按 DCR-002 新增 `user_wechat_identities`，不修改既有 60 张表的字段、类型、约束或业务语义。

## 2. 既有正式设计来源

Task 3.1 至 Task 3.5.7 的正式成果继续有效：

- [Task 3.1 业务对象到数据库实体映射](../phases/phase-03/TASK_3_1_ENTITY_MAPPING.md)；
- [Task 3.2 实体关系详细设计](../phases/phase-03/TASK_3_2_ENTITY_RELATIONSHIP_DESIGN.md)；
- [Task 3.3 数据表结构设计](../phases/phase-03/TASK_3_3_TABLE_STRUCTURE_DESIGN.md)；
- [Task 3.4 字段结构设计](../phases/phase-03/TASK_3_4_FIELD_STRUCTURE_DESIGN.md)；
- [Task 3.5.1 字段数据类型规范](../phases/phase-03/TASK_3_5_1_FIELD_TYPE_STANDARD.md)；
- [Task 3.5.2 主键与唯一约束设计](../phases/phase-03/TASK_3_5_2_PRIMARY_KEY_UNIQUE_CONSTRAINT_DESIGN.md)；
- [Task 3.5.3 外键关系规范](../phases/phase-03/TASK_3_5_3_FOREIGN_KEY_RELATIONSHIP_STANDARD.md)；
- [Task 3.5.4 索引设计](../phases/phase-03/TASK_3_5_4_INDEX_DESIGN.md)；
- [Task 3.5.5 Check 约束设计](../phases/phase-03/TASK_3_5_5_CHECK_CONSTRAINT_STANDARD.md)；
- [Task 3.5.6 数据库命名规范](../phases/phase-03/TASK_3_5_6_DATABASE_NAMING_STANDARD.md)；
- [Task 3.5.7 数据库设计冻结](../phases/phase-03/TASK_3_5_7_DATABASE_FREEZE.md)；
- [数据库枚举规范](DATABASE_ENUM_SPEC.md)；
- [Database Change Request 002](../00-governance/DATABASE_CHANGE_REQUEST_002.md)。

DCR-002 是 v1.1 到 v2.0 的唯一结构增量；发生冲突时，本文件和已批准 DCR-002 对新增对象的定义优先于历史 v1.1 表数量结论。正式枚举代码仍以 `DATABASE_ENUM_SPEC.md` 为唯一入口。

## 3. `user_wechat_identities` 正式定位

`user_wechat_identities` 是微信身份到既有 `users.id` 的外部身份映射，不是平行用户体系：

- `users` 继续是唯一系统用户身份；
- 角色、权限、仓库和店铺范围仍只来自现有 RBAC 表；
- 不保存微信昵称、头像、手机号或业务资料；
- 不保存微信临时 code、Session Key、App Secret、Access Token 或 Refresh Token；
- 首版每个环境只使用一个服务端配置的小程序 AppID；
- 每个用户只允许一个当前有效微信绑定；
- 历史绑定不物理删除。

## 4. 正式字段

| 字段 | PostgreSQL 类型 | 必填 | 默认值 | 正式语义 |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | 是 | `uuidv7()` | 主键 |
| `user_id` | `uuid` | 是 | 无 | 既有系统用户 |
| `openid` | `varchar(128)` | 是 | 无 | 当前 AppID 下的敏感微信身份 |
| `unionid` | `varchar(128)` | 否 | `NULL` | 可选辅助身份 |
| `mini_program_appid` | `varchar(100)` | 是 | 无 | 服务端配置的小程序 AppID |
| `status` | `varchar(50)` | 是 | 无 | `active`、`unbound`、`disabled` |
| `bound_at` | `timestamptz(6)` | 是 | 无 | 首次绑定成功时间 |
| `last_login_at` | `timestamptz(6)` | 否 | `NULL` | 最近微信登录成功时间 |
| `unbound_at` | `timestamptz(6)` | 否 | `NULL` | 正式解绑时间 |
| `unbound_by` | `uuid` | 否 | `NULL` | 正式解绑操作者 |
| `created_at` | `timestamptz(6)` | 是 | `CURRENT_TIMESTAMP` | 创建时间 |
| `created_by` | `uuid` | 是 | 无 | 创建人 |
| `updated_at` | `timestamptz(6)` | 是 | `CURRENT_TIMESTAMP` | 更新时间 |
| `updated_by` | `uuid` | 是 | 无 | 更新人 |

`status` 不设置隐式默认值，必须由正式服务显式写入。

## 5. 主键、唯一约束与索引

- 主键：`pk_user_wechat_identities (id)`；
- 当前有效微信身份唯一：`uq_user_wechat_identities_active_openid_appid (openid, mini_program_appid) WHERE status = 'active'`；
- 当前有效用户绑定唯一：`uq_user_wechat_identities_active_user_id (user_id) WHERE status = 'active'`；
- 当前有效 UnionID 唯一：`uq_user_wechat_identities_active_unionid (unionid) WHERE status = 'active' AND unionid IS NOT NULL`；
- 普通索引：`idx_user_wechat_identities_status_updated_at (status, updated_at)`。

三个部分唯一索引只约束当前有效绑定，允许保留 `unbound` 和 `disabled` 历史行。首版不支持同一用户同时绑定多个 AppID。

## 6. 外键

| 外键 | 引用 | 更新 | 删除 |
| --- | --- | --- | --- |
| `fk_user_wechat_identities_user_id` | `user_id → users.id` | RESTRICT | RESTRICT |
| `fk_user_wechat_identities_unbound_by` | `unbound_by → users.id` | RESTRICT | RESTRICT |
| `fk_user_wechat_identities_created_by` | `created_by → users.id` | RESTRICT | RESTRICT |
| `fk_user_wechat_identities_updated_by` | `updated_by → users.id` | RESTRICT | RESTRICT |

不得使用级联删除。

## 7. Check 约束

正式新增 7 项 Check：

1. `status` 只允许 `active`、`unbound`、`disabled`；
2. `openid` 与 `mini_program_appid` 去除首尾空白后必须非空，数据库值不得包含首尾空白；
3. `unionid` 为空或去除首尾空白后非空，数据库值不得包含首尾空白；
4. `updated_at >= created_at`；
5. `bound_at >= created_at`；
6. `last_login_at IS NULL OR last_login_at >= bound_at`；
7. `unbound` 状态必须同时具有合法 `unbound_at`、`unbound_by`，其他状态两者必须为空。

Check 不替代跨表身份、权限、并发和业务流程校验。

## 8. 生命周期与审计

- 解绑把当前行更新为 `unbound`，写入 `unbound_at`、`unbound_by`、`updated_at`、`updated_by`；
- 安全停用把映射更新为 `disabled`，保留原绑定事实；
- 重新绑定创建新的 `active` 行，不覆盖历史行；
- 用户停用不删除映射，但登录、刷新和受保护请求必须以 `users` 当前状态为准；
- 绑定、解绑、停用和重新绑定必须写适用审计，OpenID、UnionID 及任何凭据不得写入日志原文；
- 当前尚未批准解绑或重新绑定 API，本数据库结构不授权相关业务开发。

## 9. Migration 与 Mapping Audit

正式物理同步包括：

- `prisma/schema.prisma` 中的 `user_wechat_identities` 模型及 `users` 双向关系；
- `prisma/migrations/20260723150000_add_user_wechat_identities/migration.sql`；
- `prisma/mapping-audit.json` 的 v2.0 计数。

Migration 只创建空表、约束、索引和外键，不回填或猜测任何现有微信身份，不包含真实 AppID、Secret、OpenID、用户或业务数据。

## 10. 枚举结论

DCR-002 不新增 PostgreSQL Enum。`status` 是本表受 Check 约束的局部生命周期代码；正式数据库枚举仍只有：

- `warehouse_type`；
- `production_completion_status`。

`access_level` 的正式代码继续由 `DATABASE_ENUM_SPEC.md` 管理并通过 Check 物理限制，不改变本次 Mapping Audit 的 PostgreSQL Enum 数量。

## 11. 冻结结论

Database Logical Design v2.0 已完成、批准并冻结。除 DCR-002 新增的 `user_wechat_identities` 外，v1.1 的表、字段、关系、约束、索引、枚举、库存粒度和历史保留规则全部保持不变。

后续任何表、字段、类型、状态、约束、索引、关系或枚举变化都必须重新提交 Database Change Request。不得通过代码、API、客户端缓存、JSON、备注或临时 Migration 绕过本规范。
