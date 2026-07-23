---
document_name: 数据库规格
project: Violin ERP Lite
version: 2.1
status: Completed / Approved / Frozen
owner: Project Manager
created_date: 2026-07-19
updated_date: 2026-07-23
related_phase: Phase 3 / Phase 7
---

# DATABASE SPEC

## 1. 正式状态

Phase 3 数据库设计（Database Design）已完成并冻结。Database Logical Design v1.0 于 2026-07-20 冻结；DCR-001 于 2026-07-21 批准后升级为 v1.1；项目负责人于 2026-07-23 批准 Database Change Request 002，并将微信身份映射对象纳入正式数据库设计；项目负责人于 2026-07-24 批准 Database Change Request 003，为四个既有导入状态字段增加正式值域 Check。

当前唯一有效版本为：

- Database Logical Design：v2.1；
- 状态：Completed / Approved / Frozen；
- 正式表：62；
- 正式字段：1160；
- 主键：62；
- 唯一约束：76；
- 外键：292；
- 普通索引：94；
- Check：226；
- 正式数据库枚举：2。

Database Logical Design v1.1 的 60 张表和 1128 个字段保留为历史冻结基线。v2.0 按 DCR-002 及其 Completion Fix 新增 `user_wechat_identities` 与 `auth_sessions`，不修改既有 60 张表的字段、类型、约束或业务语义。初次 DCR-002 同步的 61 表、1142 字段是 Completion Fix 前的中间历史基线，不是当前正式计数。v2.1 按 DCR-003 只为四个既有 `VARCHAR(50)` 字段增加值域 Check；表、字段、主键、唯一约束、外键、普通索引和 PostgreSQL Enum 均不变。

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
- [Database Change Request 002](../00-governance/DATABASE_CHANGE_REQUEST_002.md)；
- [Database Change Request 003](../00-governance/DATABASE_CHANGE_REQUEST_003.md)。

DCR-002 及其 Completion Fix 是 v1.1 到 v2.0 的唯一结构增量；DCR-003 是 v2.0 到 v2.1 的唯一约束增量。发生冲突时，本文件和已批准 Change Request 的对应定义优先于历史版本数量结论。正式枚举代码仍以 `DATABASE_ENUM_SPEC.md` 为唯一入口。

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

## 9. `auth_sessions` 正式定位

`auth_sessions` 是认证会话和令牌生命周期的持久事实，不是用户或授权副本：

- `users` 继续是唯一用户身份，刷新和受保护请求必须校验其当前状态；
- `user_wechat_identities` 继续只保存微信身份映射，会话表不复制 OpenID、UnionID 或 AppID Secret；
- 角色、权限、仓库和店铺范围仍只来自现有 RBAC；
- PC 与微信小程序复用同一模型，通过 `client_type` 区分，但该字段不得用于授权；
- 不保存 Access Token 或 Refresh Token 明文，只保存服务端密钥参与的确定性单向摘要；
- 正式采用每次刷新创建新 Session 行的轮换模型，保留旧行用于重放识别；
- 不建立平行 Refresh Token 表。

## 10. `auth_sessions` 正式字段

| 字段 | PostgreSQL 类型 | 必填 | 默认值 | 正式语义 |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | 是 | `uuidv7()` | 主键 |
| `user_id` | `uuid` | 是 | 无 | 唯一系统用户 |
| `client_type` | `varchar(50)` | 是 | 无 | `pc` 或 `wechat-mini-program` |
| `token_family_id` | `uuid` | 是 | 无 | 登录及全部刷新轮换共享的令牌族 |
| `refresh_token_hash` | `varchar(128)` | 是 | 无 | Refresh Token 的服务端密钥单向摘要 |
| `refresh_token_expires_at` | `timestamptz(6)` | 是 | 无 | Refresh Token 到期时间 |
| `access_token_expires_at` | `timestamptz(6)` | 是 | 无 | 对应 Access Token 到期时间 |
| `issued_at` | `timestamptz(6)` | 是 | 无 | 令牌签发时间 |
| `last_refreshed_at` | `timestamptz(6)` | 否 | `NULL` | 本行被成功轮换的时间 |
| `revoked_at` | `timestamptz(6)` | 否 | `NULL` | 撤销时间 |
| `revoked_by` | `uuid` | 否 | `NULL` | 用户操作撤销时的系统用户 |
| `revocation_actor_type` | `varchar(50)` | 否 | `NULL` | 撤销时为 `user` 或 `system` |
| `revocation_reason` | `varchar(1000)` | 否 | `NULL` | 撤销原因 |
| `replaced_by_session_id` | `uuid` | 否 | `NULL` | 唯一后继 Session |
| `created_at` | `timestamptz(6)` | 是 | `CURRENT_TIMESTAMP` | 创建时间 |
| `created_by` | `uuid` | 是 | 无 | 创建对应的已知系统用户 |
| `updated_at` | `timestamptz(6)` | 是 | `CURRENT_TIMESTAMP` | 更新时间 |
| `updated_by` | `uuid` | 否 | `NULL` | 用户操作更新时的系统用户 |

`updated_by` 可空是本技术表的正式例外：系统重放保护使用 `revocation_actor_type = 'system'` 且不伪造用户；用户主动登出必须使用真实 `users.id`。

## 11. `auth_sessions` 约束与索引

- 主键：`pk_auth_sessions (id)`；
- 唯一约束：`uq_auth_sessions_refresh_token_hash (refresh_token_hash)`；
- 唯一约束：`uq_auth_sessions_replaced_by_session_id (replaced_by_session_id)`；
- 普通索引：`idx_auth_sessions_user_revoked_refresh_expiry (user_id, revoked_at, refresh_token_expires_at)`；
- 普通索引：`idx_auth_sessions_family_revoked (token_family_id, revoked_at)`；
- 普通索引：`idx_auth_sessions_client_type_updated_at (client_type, updated_at)`。

`token_family_id` 必须允许同族多行，故不唯一；它由族撤销索引覆盖。活动 Session 定义为 `revoked_at IS NULL AND replaced_by_session_id IS NULL`。

## 12. `auth_sessions` 外键

| 外键 | 引用 | 更新 | 删除 |
| --- | --- | --- | --- |
| `fk_auth_sessions_user_id` | `user_id → users.id` | RESTRICT | RESTRICT |
| `fk_auth_sessions_revoked_by` | `revoked_by → users.id` | RESTRICT | RESTRICT |
| `fk_auth_sessions_created_by` | `created_by → users.id` | RESTRICT | RESTRICT |
| `fk_auth_sessions_updated_by` | `updated_by → users.id` | RESTRICT | RESTRICT |
| `fk_auth_sessions_replaced_by_session_id` | `replaced_by_session_id → auth_sessions.id` | RESTRICT | RESTRICT |

不得使用级联删除。

## 13. `auth_sessions` Check 与循环防护

正式新增 14 项 Check，覆盖客户端类型、Hash 非空、Refresh/Access 到期顺序、签发时间、刷新时间、撤销字段组合、撤销操作者一致性、撤销时间、自引用、被替换记录刷新时间、创建和更新时间。

具体命名与逻辑以 DCR-002 第 22 节和正式 Migration 为准。同表多行循环由 `trg_auth_sessions_rotation_acyclic` 与 `check_auth_session_rotation_cycle()` 阻止。

## 14. 轮换、重放与撤销持久化

- 刷新必须在数据库事务中先插入后继，再条件认领未撤销、未替换、未到期的前驱；零行认领必须回滚整个事务；
- 数据库行锁、Hash 唯一约束和后继唯一约束保证同一旧 Refresh Token 的并发轮换最多一个提交；
- 旧行及 Hash 保留，旧 Token 再次出现时按 `token_family_id` 以系统操作者撤销整族；
- 登出按当前 `token_family_id` 幂等撤销整族，使用用户操作者，不解绑微信身份，不影响其他令牌族；
- 用户停用后刷新必须读取 `users` 状态并拒绝；是否即时批量撤销由后续获批 API / Service 实现明确。

本节只定义数据库支撑，不授权实现认证业务代码。

## 15. Import 状态值域

Database Logical Design v2.1 为以下四个既有字段冻结局部 Check 代码集合：

| Check | 字段 | 允许值 |
| --- | --- | --- |
| `ck_import_tasks_status` | `import_tasks.status` | `pending_validation`, `validation_failed`, `pending_confirmation`, `importing`, `partially_succeeded`, `succeeded`, `cancelled`, `duplicate_file`, `failed` |
| `ck_import_task_items_validation_status` | `import_task_items.validation_status` | `pending`, `valid`, `warning`, `invalid` |
| `ck_import_task_items_execution_status` | `import_task_items.execution_status` | `pending`, `processing`, `succeeded`, `failed`, `skipped` |
| `ck_shipment_import_matches_match_status` | `shipment_import_matches.match_status` | `pending`, `partially_matched`, `matched` |

四个字段继续使用非空 `VARCHAR(50)` 且不设置数据库默认值；创建事实时必须由正式服务显式写入。上述代码是字段级 Check 值域，不是 PostgreSQL Enum，不得增加同义状态或页面中文值。

`pending_upload` 只表示 IMP-001 提交前的页面本地状态，不写入数据库。`partially_matched` 只表示数量部分匹配；`unmatched` 与 `conflict` 不写入具有必填目标外键的 `shipment_import_matches`。

## 16. Migration 与 Mapping Audit

正式物理同步包括：

- `prisma/schema.prisma` 中的 `user_wechat_identities` 模型及 `users` 双向关系；
- `prisma/migrations/20260723150000_add_user_wechat_identities/migration.sql`；
- `prisma/schema.prisma` 中的 `auth_sessions` 模型、自关联及 `users` 双向关系；
- `prisma/migrations/20260723160000_add_auth_sessions/migration.sql`；
- `prisma/migrations/20260724090000_add_import_status_value_checks/migration.sql`；
- `prisma/mapping-audit.json` 的 v2.1 计数。

DCR-002 的两个 Migration 分别创建空表及其约束、索引、外键和必要循环防护，不回填或猜测任何现有身份，不包含真实 AppID、Secret、OpenID、Token、用户或业务数据。DCR-003 Migration 在添加四项 Check 前审计现有值；发现未知值时以脱敏行数与 distinct 数量抛出异常并停止，不自动映射、删除或转换数据。不得修改或重写任何历史 Migration。

最终 Mapping Audit 为 62 表、1160 字段、62 主键、76 唯一约束、292 外键、94 普通索引、226 Check、2 枚举。

## 17. 枚举结论

DCR-002 及其 Completion Fix 不新增 PostgreSQL Enum。`user_wechat_identities.status`、`auth_sessions.client_type` 和 `auth_sessions.revocation_actor_type` 均为表内 Check 代码；正式数据库枚举仍只有：

- `warehouse_type`；
- `production_completion_status`。

`access_level` 的正式代码继续由 `DATABASE_ENUM_SPEC.md` 管理并通过 Check 物理限制，不改变本次 Mapping Audit 的 PostgreSQL Enum 数量。

Database Change Request 003 的四组 Import 状态同样是字段级 Check 代码集合，不新增 PostgreSQL Enum，也不改变 `DATABASE_ENUM_SPEC.md` 的既有定义或数量。

## 18. 冻结结论

Database Logical Design v2.1 在 DCR-003 的独立前向 Migration、Mapping Audit 与真实 PostgreSQL 验证通过后完成、批准并冻结。v2.1 只比 v2.0 增加四项 Import 状态值域 Check；既有表、字段、默认值、非空、主键、唯一约束、外键、普通索引、PostgreSQL Enum、库存粒度和历史保留规则全部保持不变。

后续任何表、字段、类型、状态、约束、索引、关系或枚举变化都必须重新提交 Database Change Request。不得通过代码、API、客户端缓存、JSON、备注或临时 Migration 绕过本规范。
