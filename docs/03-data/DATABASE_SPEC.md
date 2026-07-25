---
document_name: 数据库规格
project: Violin ERP Lite
version: 2.4
status: Completed / Approved / Pending Migration
owner: Project Manager
created_date: 2026-07-19
updated_date: 2026-07-25
related_phase: Phase 3 / Phase 7
---

# DATABASE SPEC

## 1. 正式状态

Phase 3 数据库设计（Database Design）已完成并冻结。Database Logical Design v1.0 于 2026-07-20 冻结；DCR-001 于 2026-07-21 批准后升级为 v1.1；项目负责人于 2026-07-23 批准 Database Change Request 002，并将微信身份映射对象纳入正式数据库设计；项目负责人于 2026-07-24 批准 Database Change Request 003，为四个既有导入状态字段增加正式值域 Check；项目负责人于 2026-07-25 批准 Database Change Request 004，补齐 Import 文件摘要去重与通用持久化幂等数据库基础；同日批准 Database Change Request 005，补齐 Attachment 生命周期状态值域、默认值和状态定位索引；项目负责人批准 Task 7.6 Background Job Database Change Request，新增后台任务、执行尝试、执行结果、死信闭环和调度租约的逻辑数据库设计。

当前唯一有效版本为：

- Database Logical Design：v2.4；
- 状态：Completed / Approved / Pending Migration；
- 正式表：68；
- 正式字段：1241；
- 主键：68；
- 唯一约束/唯一索引：84；
- 外键：300；
- 普通索引：106；
- Check：250；
- 正式数据库枚举：2。

Database Logical Design v1.1 的 60 张表和 1128 个字段保留为历史冻结基线。v2.0 按 DCR-002 及其 Completion Fix 新增 `user_wechat_identities` 与 `auth_sessions`。v2.1 按 DCR-003 只为四个既有 `VARCHAR(50)` 字段增加值域 Check。v2.2 按 DCR-004 为 `import_tasks` 增加 `file_checksum`，新增 `idempotency_records`，并增加对应主键、唯一、普通索引和 Check。v2.3 按 DCR-005 为既有 `attachments.status` 增加 `active` 默认值和五值域 Check，并新增一个状态定位普通索引；不新增表、字段、外键、唯一约束或 PostgreSQL Enum。v2.4 按 Task 7.6 Background Job Database Change Request 新增 `jobs`、`job_attempts`、`job_results`、`job_dead_letters` 与 `scheduler_locks` 五个逻辑表，新增 65 个字段、5 个主键、5 个唯一约束/唯一索引、8 个外键、8 个普通索引和 16 项 Check；不新增 PostgreSQL Enum，不修改业务领域表。

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
- [Database Change Request 004](../00-governance/DATABASE_CHANGE_REQUEST_004.md)。
- [Database Change Request 005](../00-governance/DATABASE_CHANGE_REQUEST_005.md)。
- [Task 7.6 Background Job Database Change Request](../phases/phase-07/TASK_7_6_BACKGROUND_JOB_DATABASE_CHANGE_REQUEST.md)。
- [Task 7.6 Database Design Update](../phases/phase-07/TASK_7_6_DATABASE_DESIGN_UPDATE.md)。

DCR-002 及其 Completion Fix 是 v1.1 到 v2.0 的唯一结构增量；DCR-003 是 v2.0 到 v2.1 的唯一约束增量；DCR-004 是 v2.1 到 v2.2 的唯一结构增量；DCR-005 是 v2.2 到 v2.3 的唯一约束与索引增量；Task 7.6 Background Job Database Change Request 是 v2.3 到 v2.4 的唯一逻辑结构增量。发生冲突时，本文件和已批准 Change Request 的对应定义优先于历史版本数量结论。正式枚举代码仍以 `DATABASE_ENUM_SPEC.md` 为唯一入口。

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
- `prisma/schema.prisma` 中 `import_tasks.file_checksum` 与 `idempotency_records` 模型；
- `prisma/migrations/20260725140000_add_persistent_idempotency_foundation/migration.sql`；
- `prisma/schema.prisma` 中 `attachments.status` 的 `active` 默认值与状态查询索引；
- `prisma/migrations/20260725160000_add_attachment_status_constraints/migration.sql`；
- `prisma/mapping-audit.json` 的 v2.3 计数。

DCR-002 的两个 Migration 分别创建空表及其约束、索引、外键和必要循环防护，不回填或猜测任何现有身份，不包含真实 AppID、Secret、OpenID、Token、用户或业务数据。DCR-003 Migration 在添加四项 Check 前审计现有值；发现未知值时以脱敏行数与 distinct 数量抛出异常并停止，不自动映射、删除或转换数据。Task 7.6 v2.4 当前只完成 Database SSOT 逻辑设计，尚未创建 Prisma Schema、Forward-only Migration 或 Mapping Audit。不得修改或重写任何历史 Migration。

v2.3 最终物理 Mapping Audit 为 63 表、1176 字段、63 主键、79 唯一约束/唯一索引、292 外键、98 普通索引、234 Check、2 枚举。v2.4 逻辑目标 Mapping 为 68 表、1241 字段、68 主键、84 唯一约束/唯一索引、300 外键、106 普通索引、250 Check、2 枚举；物理验证留待后续 Migration 阶段。

## 17. 枚举结论

DCR-002 及其 Completion Fix 不新增 PostgreSQL Enum。`user_wechat_identities.status`、`auth_sessions.client_type` 和 `auth_sessions.revocation_actor_type` 均为表内 Check 代码；正式数据库枚举仍只有：

- `warehouse_type`；
- `production_completion_status`。

`access_level` 的正式代码继续由 `DATABASE_ENUM_SPEC.md` 管理并通过 Check 物理限制，不改变本次 Mapping Audit 的 PostgreSQL Enum 数量。

Database Change Request 003 的四组 Import 状态同样是字段级 Check 代码集合，不新增 PostgreSQL Enum，也不改变 `DATABASE_ENUM_SPEC.md` 的既有定义或数量。Task 7.6 新增的 Job、Attempt、Result 和 Dead Letter 状态也是字段级 Check 代码集合，不新增 PostgreSQL Enum。正式数据库枚举数量继续为 2。

## 18. 冻结结论

Database Logical Design v2.3 在 DCR-005 的独立前向 Migration、Mapping Audit 与真实 PostgreSQL 验证通过后完成、批准并冻结。v2.4 在 Task 7.6 Background Job Database Change Request 批准后完成逻辑 SSOT 更新，新增五个后台任务平台技术对象及对应字段、约束、索引和字段级状态值域；当前尚未执行 Prisma Schema、Migration 或 Mapping Audit 物理同步。

后续任何表、字段、类型、状态、约束、索引、关系或枚举变化都必须重新提交 Database Change Request。不得通过代码、API、客户端缓存、JSON、备注或临时 Migration 绕过本规范。

## 19. `import_tasks` 文件摘要与目标约束

`import_tasks.file_checksum` 为 `VARCHAR(128) NOT NULL`，正式值必须是服务端对原始上传文件计算的 64 位小写十六进制 SHA-256。`ck_import_tasks_file_checksum_format` 强制摘要格式；`ck_import_tasks_target_exactly_one` 强制仓库与店铺目标恰有一个非空。

两个部分唯一索引分别为：

- `uq_import_tasks_file_checksum_import_type_warehouse (file_checksum, import_type, warehouse_id)`，只覆盖仓库目标；
- `uq_import_tasks_file_checksum_import_type_store (file_checksum, import_type, store_id)`，只覆盖店铺目标。

它们共同保证同一文件内容、导入类型和目标范围最多形成一个 Import Task。

## 20. `idempotency_records` 正式结构

`idempotency_records` 是通用持久化幂等记录，包含且仅包含 15 个字段：`id`、`scope_code`、`idempotency_key_hash`、`request_hash`、`status`、`response_http_status`、`response_body`、`resource_type`、`resource_id`、`request_trace_id`、`locked_until`、`completed_at`、`expires_at`、`created_at`、`updated_at`。

- 主键：`pk_idempotency_records`；
- 唯一约束：`uq_idempotency_records_scope_code_key_hash`；
- 普通索引：`idx_idempotency_records_status_locked_until`、`idx_idempotency_records_expires_at`、`idx_idempotency_records_resource_created_at`；
- 状态只允许 `processing`、`completed`、`failed`；
- 五项表级 Check 分别校验状态、Hash、HTTP 状态、生命周期和时间范围；
- 不建立外键，不新增 PostgreSQL Enum。

## 21. DCR-004 Migration 前置审计

2026-07-25 使用 PostgreSQL 18.4 对开发数据库完成迁移前审计：`import_tasks` 共 0 行，仓库与店铺双空 0 行、双非空 0 行，历史 Import 文件 0 个。开发库不需要历史 SHA-256 回填，可以执行空表 Migration。

Migration 内仍保留阻断守卫：如其他环境存在历史 Import 行，则必须先从受信 Storage 读取原文件并计算 SHA-256；不得用文件名、Storage Key、随机值或占位摘要伪造回填。

## 22. Attachment 生命周期状态与墓碑

`attachments.status` 保持 `VARCHAR(50) NOT NULL`，数据库默认值为 `active`。`ck_attachments_status` 只允许：

- `active`；
- `soft_deleted`；
- `pending_physical_delete`；
- `physical_delete_failed`；
- `physically_deleted`。

初始状态为 `active`，终止状态为 `physically_deleted`。正式迁移为：

1. `active → soft_deleted`；
2. `soft_deleted → pending_physical_delete`；
3. `pending_physical_delete → physically_deleted`；
4. `pending_physical_delete → physical_delete_failed`；
5. `physical_delete_failed → pending_physical_delete`。

数据库 Check 只约束值域；迁移合法性、零关联条件、证据保护和事务边界由后续获批 Attachment Repository 与 Service 控制。仍存在 `attachment_links` 时不得进入删除流程。物理删除成功后保留 `physically_deleted` 墓碑、业务 Metadata 和审计外键，不删除数据库记录；后续 API 不得暴露 Storage Reference。物理删除失败必须保留记录。

`idx_attachments_status_updated_at (status, updated_at)` 只支持状态定位，不授权 Background Worker、自动清理、自动重试或定时任务。DCR-005 不新增字段、表、外键、唯一约束、Enum 或 Seed。

2026-07-25 使用 PostgreSQL 18.4 隔离开发库完成 Migration 前置审计：`attachments` 总行数 0；五个正式状态各 0 行；NULL 0 行；未知状态 0 行；`updated_at < created_at` 0 行；`attachment_links` 重复约束异常组 0。满足空表 Migration 条件，无需映射、修正或删除历史数据。

## 23. Task 7.6 Background Job 数据库边界

Task 7.6 后台任务平台只新增平台技术对象，不修改任何业务领域表。禁止修改：

- Product；
- SKU；
- Purchase；
- Production；
- Inventory；
- Inbound；
- Outbound；
- Cross Border。

后台 Job 状态、执行结果、Dead Letter 和 Scheduler Lock 均不得替代业务状态、业务单据、库存流水、权限校验或正式审计。

## 24. `jobs` 正式结构

`jobs` 是后台任务主表，是 PostgreSQL-backed Queue 的唯一任务状态事实来源。`jobs` 不保存业务对象的正式状态，不保存二进制文件本体、Storage 私有路径、Token、Secret、密码或敏感原文。

| 字段 | PostgreSQL 类型 | 必填 | 默认值 | 正式语义 |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | 是 | `uuidv7()` | 主键 |
| `job_type` | `varchar(100)` | 是 | 无 | 后台任务类型代码 |
| `job_key` | `varchar(300)` | 是 | 无 | 同一逻辑 Job 的幂等创建 Key |
| `status` | `varchar(50)` | 是 | 无 | Job 当前状态 |
| `priority` | `integer` | 是 | `0` | Claim 排序优先级，数值越小优先级越高 |
| `target_object_type` | `varchar(50)` | 否 | `NULL` | 关联业务对象或平台对象类型 |
| `target_object_id` | `uuid` | 否 | `NULL` | 关联业务对象或平台对象 ID |
| `payload` | `jsonb` | 否 | `NULL` | 脱敏后的执行参数 |
| `scheduled_at` | `timestamptz(6)` | 是 | 无 | 计划调度时间 |
| `available_at` | `timestamptz(6)` | 是 | 无 | 下一次可领取执行时间 |
| `started_at` | `timestamptz(6)` | 否 | `NULL` | 最近一次进入执行的时间 |
| `completed_at` | `timestamptz(6)` | 否 | `NULL` | 进入终态时间 |
| `locked_until` | `timestamptz(6)` | 否 | `NULL` | Worker 执行租约截止时间 |
| `locked_by` | `varchar(200)` | 否 | `NULL` | 当前持有执行租约的 Worker 标识 |
| `attempt_count` | `integer` | 是 | `0` | 已创建的 Attempt 数量 |
| `max_attempts` | `integer` | 是 | 无 | 最大自动尝试次数 |
| `last_error_code` | `varchar(100)` | 否 | `NULL` | 最近一次失败错误代码 |
| `last_error_message` | `text` | 否 | `NULL` | 最近一次脱敏失败摘要 |
| `idempotency_record_id` | `uuid` | 否 | `NULL` | 触发请求的幂等记录安全关联，不建外键 |
| `request_trace_id` | `uuid` | 是 | 无 | 创建 Job 的请求链路 ID |
| `created_at` | `timestamptz(6)` | 是 | `CURRENT_TIMESTAMP` | 创建时间 |
| `created_by` | `uuid` | 否 | `NULL` | 创建操作者；系统任务可空 |
| `updated_at` | `timestamptz(6)` | 是 | `CURRENT_TIMESTAMP` | 更新时间 |
| `updated_by` | `uuid` | 否 | `NULL` | 最近更新操作者；系统任务可空 |
| `cancelled_at` | `timestamptz(6)` | 否 | `NULL` | 正式取消时间 |

### 24.1 `jobs` 状态

`jobs.status` 只允许：

- `pending`；
- `running`；
- `retrying`；
- `succeeded`；
- `failed`；
- `dead_letter`；
- `cancelled`。

`succeeded`、`dead_letter` 和 `cancelled` 是终态。`failed` 表示当前尝试失败但仍待 Retry Policy 裁决，不是业务失败状态。

### 24.2 `jobs` 主键、唯一约束与索引

- 主键：`pk_jobs (id)`；
- 唯一约束：`uq_jobs_job_type_job_key (job_type, job_key)`；
- 普通索引：`idx_jobs_claim (status, available_at, priority, created_at)`；
- 普通索引：`idx_jobs_locked_until (locked_until)`；
- 普通索引：`idx_jobs_target_created_at (target_object_type, target_object_id, created_at)`；
- 普通索引：`idx_jobs_job_type_created_at (job_type, created_at)`。

### 24.3 `jobs` 外键

| 外键 | 引用 | 更新 | 删除 |
| --- | --- | --- | --- |
| `fk_jobs_created_by` | `created_by → users.id` | RESTRICT | RESTRICT |
| `fk_jobs_updated_by` | `updated_by → users.id` | RESTRICT | RESTRICT |

`target_object_id` 是受控多态关联，不建立数据库外键。目标存在性、权限、业务状态和数据范围必须由获批 Service 按 `target_object_type` 校验。`idempotency_record_id` 不建立外键，避免与幂等终态清理策略形成生命周期冲突。

### 24.4 `jobs` Check

正式新增 5 项 Check：

1. `status` 只允许七个正式 Job 状态；
2. `priority >= 0`、`attempt_count >= 0`、`max_attempts >= 1` 且 `attempt_count <= max_attempts`；
3. `available_at >= scheduled_at`，`started_at`、`completed_at`、`cancelled_at` 不得早于 `created_at`；
4. `target_object_type` 与 `target_object_id` 必须同时为空或同时非空；
5. 活动租约字段必须成组：`locked_until` 与 `locked_by` 同时为空或同时非空。

## 25. `job_attempts` 正式结构

`job_attempts` 是每次 Worker 执行尝试的追加事实。Attempt 不覆盖历史，不替代 `jobs.status`。

| 字段 | PostgreSQL 类型 | 必填 | 默认值 | 正式语义 |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | 是 | `uuidv7()` | 主键 |
| `job_id` | `uuid` | 是 | 无 | 所属 Job |
| `attempt_no` | `integer` | 是 | 无 | Job 内单调递增尝试序号 |
| `worker_id` | `varchar(200)` | 是 | 无 | 执行 Worker 标识 |
| `status` | `varchar(50)` | 是 | 无 | Attempt 状态 |
| `started_at` | `timestamptz(6)` | 是 | 无 | Attempt 开始时间 |
| `ended_at` | `timestamptz(6)` | 否 | `NULL` | Attempt 结束时间 |
| `duration_ms` | `integer` | 否 | `NULL` | 执行耗时毫秒 |
| `lease_expires_at` | `timestamptz(6)` | 是 | 无 | 本次执行租约截止 |
| `error_code` | `varchar(100)` | 否 | `NULL` | 脱敏错误代码 |
| `error_message` | `text` | 否 | `NULL` | 脱敏错误摘要 |
| `error_detail` | `jsonb` | 否 | `NULL` | 脱敏结构化错误详情 |
| `request_trace_id` | `uuid` | 是 | 无 | Attempt 链路 ID |
| `created_at` | `timestamptz(6)` | 是 | `CURRENT_TIMESTAMP` | 创建时间 |

### 25.1 `job_attempts` 状态

`job_attempts.status` 只允许：

- `running`；
- `succeeded`；
- `failed`；
- `timed_out`；
- `cancelled`。

### 25.2 `job_attempts` 主键、唯一约束与索引

- 主键：`pk_job_attempts (id)`；
- 唯一约束：`uq_job_attempts_job_id_attempt_no (job_id, attempt_no)`；
- 普通索引：`idx_job_attempts_status_started_at (status, started_at)`。

### 25.3 `job_attempts` 外键

| 外键 | 引用 | 更新 | 删除 |
| --- | --- | --- | --- |
| `fk_job_attempts_job_id` | `job_id → jobs.id` | RESTRICT | RESTRICT |

### 25.4 `job_attempts` Check

正式新增 5 项 Check：

1. `status` 只允许五个正式 Attempt 状态；
2. `attempt_no >= 1`；
3. `ended_at IS NULL OR ended_at >= started_at`；
4. `duration_ms IS NULL OR duration_ms >= 0`；
5. 失败类状态必须有错误信息，非失败状态不得强制要求错误信息。

## 26. `job_results` 正式结构

`job_results` 保存 Job 最终安全结果。结果与 Job 当前状态分表存储，避免 Queue Claim 查询读取大 JSON。

| 字段 | PostgreSQL 类型 | 必填 | 默认值 | 正式语义 |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | 是 | `uuidv7()` | 主键 |
| `job_id` | `uuid` | 是 | 无 | 所属 Job |
| `result_status` | `varchar(50)` | 是 | 无 | 结果状态 |
| `result_body` | `jsonb` | 否 | `NULL` | 脱敏安全结果摘要 |
| `resource_type` | `varchar(50)` | 否 | `NULL` | 结果关联资源类型 |
| `resource_id` | `uuid` | 否 | `NULL` | 结果关联资源 ID |
| `created_at` | `timestamptz(6)` | 是 | `CURRENT_TIMESTAMP` | 创建时间 |

### 26.1 `job_results` 状态

`job_results.result_status` 只允许：

- `succeeded`；
- `failed`；
- `cancelled`。

### 26.2 `job_results` 主键、唯一约束与索引

- 主键：`pk_job_results (id)`；
- 唯一约束：`uq_job_results_job_id (job_id)`；
- 普通索引：`idx_job_results_resource_created_at (resource_type, resource_id, created_at)`。

### 26.3 `job_results` 外键

| 外键 | 引用 | 更新 | 删除 |
| --- | --- | --- | --- |
| `fk_job_results_job_id` | `job_id → jobs.id` | RESTRICT | RESTRICT |

### 26.4 `job_results` Check

正式新增 2 项 Check：

1. `result_status` 只允许三个正式 Result 状态；
2. `resource_type` 与 `resource_id` 必须同时为空或同时非空。

## 27. `job_dead_letters` 正式结构

`job_dead_letters` 保存重试耗尽或不可自动恢复 Job 的失败闭环。Dead Letter 不自动修改业务数据。

| 字段 | PostgreSQL 类型 | 必填 | 默认值 | 正式语义 |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | 是 | `uuidv7()` | 主键 |
| `job_id` | `uuid` | 是 | 无 | 进入 Dead Letter 的 Job |
| `failed_attempt_id` | `uuid` | 是 | 无 | 导致 Dead Letter 的最终 Attempt |
| `dead_letter_reason` | `text` | 是 | 无 | 脱敏失败归档原因 |
| `handling_status` | `varchar(50)` | 是 | 无 | 人工处理状态 |
| `handled_by` | `uuid` | 否 | `NULL` | 人工处理操作者 |
| `handled_at` | `timestamptz(6)` | 否 | `NULL` | 人工处理时间 |
| `handling_note` | `text` | 否 | `NULL` | 脱敏处理说明 |
| `replayed_job_id` | `uuid` | 否 | `NULL` | 重新执行形成的新 Job |
| `created_at` | `timestamptz(6)` | 是 | `CURRENT_TIMESTAMP` | 创建时间 |
| `updated_at` | `timestamptz(6)` | 是 | `CURRENT_TIMESTAMP` | 更新时间 |

### 27.1 `job_dead_letters` 状态

`job_dead_letters.handling_status` 只允许：

- `open`；
- `in_review`；
- `replayed`；
- `resolved`；
- `ignored`。

### 27.2 `job_dead_letters` 主键、唯一约束与索引

- 主键：`pk_job_dead_letters (id)`；
- 唯一约束：`uq_job_dead_letters_job_id (job_id)`；
- 普通索引：`idx_job_dead_letters_handling_status_created_at (handling_status, created_at)`。

### 27.3 `job_dead_letters` 外键

| 外键 | 引用 | 更新 | 删除 |
| --- | --- | --- | --- |
| `fk_job_dead_letters_job_id` | `job_id → jobs.id` | RESTRICT | RESTRICT |
| `fk_job_dead_letters_failed_attempt_id` | `failed_attempt_id → job_attempts.id` | RESTRICT | RESTRICT |
| `fk_job_dead_letters_handled_by` | `handled_by → users.id` | RESTRICT | RESTRICT |
| `fk_job_dead_letters_replayed_job_id` | `replayed_job_id → jobs.id` | RESTRICT | RESTRICT |

### 27.4 `job_dead_letters` Check

正式新增 3 项 Check：

1. `handling_status` 只允许五个正式 Dead Letter 处理状态；
2. 人工处理完成类状态必须有 `handled_at` 与 `handled_by`；
3. `replayed` 状态必须有 `replayed_job_id`，其他状态不得强制要求重新执行 Job。

## 28. `scheduler_locks` 正式结构

`scheduler_locks` 是 Scheduler 防重复触发的租约事实来源。它不参与业务一致性，不替代数据库唯一约束、业务事务、Job 执行租约或 Task 7.5 Idempotency Lease。

| 字段 | PostgreSQL 类型 | 必填 | 默认值 | 正式语义 |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | 是 | `uuidv7()` | 主键 |
| `lock_key` | `varchar(300)` | 是 | 无 | 调度锁唯一 Key |
| `owner_id` | `varchar(200)` | 是 | 无 | 当前持有锁的 Scheduler 实例 |
| `locked_until` | `timestamptz(6)` | 是 | 无 | 锁租约截止时间 |
| `last_acquired_at` | `timestamptz(6)` | 是 | 无 | 最近取得锁时间 |
| `released_at` | `timestamptz(6)` | 否 | `NULL` | 主动释放时间 |
| `created_at` | `timestamptz(6)` | 是 | `CURRENT_TIMESTAMP` | 创建时间 |
| `updated_at` | `timestamptz(6)` | 是 | `CURRENT_TIMESTAMP` | 更新时间 |

### 28.1 `scheduler_locks` 主键、唯一约束与索引

- 主键：`pk_scheduler_locks (id)`；
- 唯一约束：`uq_scheduler_locks_lock_key (lock_key)`；
- 普通索引：`idx_scheduler_locks_locked_until (locked_until)`。

### 28.2 `scheduler_locks` Check

正式新增 1 项 Check：

1. `locked_until >= last_acquired_at`，`released_at IS NULL OR released_at >= last_acquired_at`，`updated_at >= created_at`。

## 29. Task 7.6 数据库设计与既有对象关系

| 既有对象 | 正式职责 | 与 Task 7.6 的关系 |
| --- | --- | --- |
| `audit_logs` | 正式审计事实 | 继续记录 Job 创建、认领、开始、成功、失败、重试、Dead Letter 和人工处理审计；不作为 Queue 或 Job 状态 |
| `idempotency_records` | 请求级持久化幂等 | 继续负责防重复请求和首次安全结果重放；不作为 Worker 执行租约或 Job 状态 |
| `import_tasks` | Import 业务任务 | 可作为 `jobs.target_object_type/object_id` 指向的业务目标；Job 不替代 Import 状态 |
| `backup_tasks` | Backup 业务/运维任务 | 可作为 Job 目标；Backup 领域结果继续由 `backup_tasks` 保存 |
| `attachments` | Attachment 元数据与生命周期 | 后续可由 Job 扫描 `pending_physical_delete` 和 `physical_delete_failed`，但不得改变 Attachment 已冻结状态机 |

## 30. Task 7.6 Migration 边界

当前阶段不创建 Migration，不修改 Prisma Schema，不更新 Mapping Audit，不执行数据库 DDL。

后续物理同步必须满足：

1. 新增独立 Forward-only Migration；
2. 不修改或重写历史 Migration；
3. Migration 前审计现有数据；
4. 更新 Prisma Schema；
5. 更新 Mapping Audit；
6. 使用 PostgreSQL 18.x 验证主键、唯一约束、外键、索引、Check 和空库迁移；
7. 不写入真实业务数据、密钥、Token、Storage 私有路径或敏感数据。
