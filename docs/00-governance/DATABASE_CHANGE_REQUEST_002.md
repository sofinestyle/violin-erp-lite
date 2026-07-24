---
document_name: Database Change Request 002：微信身份映射对象
project: Violin ERP Lite
version: 2.1
status: Completed / Approved
owner: Project Manager
created_date: 2026-07-23
updated_date: 2026-07-23
related_phase: Phase 3 / Phase 6 / Phase 8
---

# Database Change Request 002：微信身份映射对象

> 项目负责人已于 2026-07-23 正式批准本 Database Change Request 及其 Completion Fix。本文定义 Database Logical Design v1.1 到 v2.0 的完整结构增量；初次同步只加入微信身份映射，Completion Fix 补齐认证会话持久化。

## 0. 批准结果

- Database Change Request 002：Completed / Approved；
- Database Logical Design：v2.0，Completed / Approved / Frozen；
- 正式新增：`user_wechat_identities`、`auth_sessions`；
- 正式计数：62 表、1160 字段、62 主键、76 唯一约束、292 外键、94 普通索引、222 Check、2 枚举；
- Prisma Schema、正式 Migration 与 Mapping Audit 已同步；
- 不修改 API、权限、业务逻辑或既有 60 张表；
- Batch 8.6-B 仍未开始。

## 1. 变更原因

Approved Phase 6 要求微信首次授权绑定已有系统账号，后续微信授权自动登录，并始终映射回同一 `users` 身份。当前 Frozen 60 张表中：

- `users` 只保存系统账号、密码哈希、状态、锁定和审计事实；
- `user_roles`、`role_permissions`、`role_warehouses`、`role_stores` 只保存授权关系；
- `audit_logs` 是只追加审计结果，不是当前身份映射；
- 没有 OpenID、UnionID、AppID 或外部身份到 `users.id` 的持久关系。

临时微信 code 会过期且只能单次使用；客户端缓存、Redis 或进程内缓存都不能提供数据库 FK、唯一约束、重启恢复、解绑历史和并发绑定保证。把 OpenID 偷存到用户名、名称、邮箱、手机号、备注或 JSON 会改变既有字段语义并绕过 Frozen 变更控制。

因此正式新增最小映射表，而不是修改 `users` 或建立平行微信用户表。

## 2. 新表业务必要性与边界

正式表名：`user_wechat_identities`。

该表只回答“当前微信身份映射到哪个既有 `users.id`”：

- 不创建微信用户；
- 不保存微信昵称、头像、手机号或业务资料；
- 不保存微信 code、Session Key、App Secret、Access Token 或 Refresh Token；
- 不保存角色、权限、仓库或店铺范围；
- 不替代 `users`、RBAC 或 `audit_logs`；
- 首版每个环境只支持一个由服务端配置的当前小程序 AppID，每个用户只允许一个当前有效微信绑定。

## 3. 完整字段清单

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `id` | UUID | 是 | `uuidv7()` | 主键 |
| `user_id` | UUID | 是 | 无 | 指向唯一系统用户 `users.id` |
| `openid` | VARCHAR(128) | 是 | 无 | 当前 AppID 下的微信身份；敏感外部标识 |
| `unionid` | VARCHAR(128) | 否 | `NULL` | 可选辅助身份；不得强制依赖 |
| `mini_program_appid` | VARCHAR(100) | 是 | 无 | 服务端配置的 AppID；不接受客户端输入 |
| `status` | VARCHAR(50) | 是 | 无 | 服务显式写入 `active`、`unbound` 或 `disabled` |
| `bound_at` | TIMESTAMPTZ(6) | 是 | 无 | 首次绑定成功时间 |
| `last_login_at` | TIMESTAMPTZ(6) | 否 | `NULL` | 最近一次微信自动登录成功时间 |
| `unbound_at` | TIMESTAMPTZ(6) | 否 | `NULL` | 正式解绑时间 |
| `unbound_by` | UUID | 否 | `NULL` | 执行正式解绑的系统用户 |
| `created_at` | TIMESTAMPTZ(6) | 是 | `CURRENT_TIMESTAMP` | 创建时间 |
| `created_by` | UUID | 是 | 无 | 首次绑定对应的已验证系统用户或正式操作者 |
| `updated_at` | TIMESTAMPTZ(6) | 是 | `CURRENT_TIMESTAMP` | 最近更新时间 |
| `updated_by` | UUID | 是 | 无 | 最近操作人 |

OpenID、UnionID 和 AppID 长度已按本表正式字段定义批准。数据库不为 `status` 设置隐式激活默认值，避免漏传时意外启用。

## 4. 主键与唯一约束

### 4.1 主键

- `pk_user_wechat_identities`：`PRIMARY KEY (id)`；
- ID 使用项目统一 UUID v7。

### 4.2 当前有效绑定唯一约束

为保留解绑历史，正式使用部分唯一索引/约束：

1. `uq_user_wechat_identities_active_openid_appid`：`(openid, mini_program_appid) WHERE status = 'active'`；
2. `uq_user_wechat_identities_active_user_id`：`(user_id) WHERE status = 'active'`；
3. `uq_user_wechat_identities_active_unionid`：`(unionid) WHERE status = 'active' AND unionid IS NOT NULL`。

第一项保证一个微信身份当前只绑定一个系统用户；第二项明确首版一个系统用户只绑定一个当前小程序身份；第三项在微信返回 UnionID 时防止同一开放平台身份并发绑定多个账号。历史 `unbound` / `disabled` 行可保留，不参与当前有效唯一性。

若项目负责人未来批准多 AppID，同一用户唯一范围需通过新的 DCR 明确调整为 `(user_id, mini_program_appid)`；本请求不预留或暗中启用该能力。

## 5. 外键

| 外键 | 引用 | 删除 | 更新 | 说明 |
| --- | --- | --- | --- | --- |
| `fk_user_wechat_identities_user_id` | `user_id → users.id` | RESTRICT | RESTRICT | 禁止删除仍有关联历史的系统用户 |
| `fk_user_wechat_identities_created_by` | `created_by → users.id` | RESTRICT | RESTRICT | 创建审计 |
| `fk_user_wechat_identities_updated_by` | `updated_by → users.id` | RESTRICT | RESTRICT | 更新审计 |
| `fk_user_wechat_identities_unbound_by` | `unbound_by → users.id` | RESTRICT | RESTRICT | 可空解绑审计 |

不对任何关系使用级联删除。

## 6. Check 约束

正式建立：

1. `status IN ('active', 'unbound', 'disabled')`；
2. `openid = btrim(openid) AND length(openid) > 0`，且 `mini_program_appid` 同样非空、无首尾空白；
3. `unionid IS NULL OR (unionid = btrim(unionid) AND length(unionid) > 0)`；
4. `updated_at >= created_at`；
5. `bound_at >= created_at`；
6. `last_login_at IS NULL OR last_login_at >= bound_at`；
7. `status = 'unbound'` 时 `unbound_at`、`unbound_by` 均非空；其他状态两者均为空，且 `unbound_at >= bound_at`。

物理 Migration 按上述 7 类语义建立 7 项命名 Check。

## 7. 普通索引

正式新增：

- `idx_user_wechat_identities_status_updated_at (status, updated_at)`，用于运维审计和生命周期查询。

登录查询使用当前有效绑定部分唯一约束，不重复创建等价普通索引。

## 8. 审计、删除、停用、解绑和重新绑定

- 不提供物理删除；历史绑定行永久保留，除非未来有获批的数据保留与销毁规则；
- 解绑把当前行改为 `unbound`，填写 `unbound_at`、`unbound_by`、`updated_at`、`updated_by`，并写 `audit_logs`；
- 安全或运维停用把映射改为 `disabled`，保留原绑定事实并写审计；
- 重新绑定创建新的 `active` 行；不得覆盖旧行中的 OpenID、用户或绑定时间；
- 解绑/重新绑定 API、页面、权限、冷却期和再认证要求不在现有 Approved 范围内，批准前不得实现；
- `audit_logs` 记录操作摘要，不保存 OpenID、UnionID、微信 code、Session Key 或 Secret 原文。

## 9. 用户禁用后的行为

`users` 继续是账号状态唯一事实来源：

- 用户停用不删除或修改微信映射历史；
- `SEC-001` 微信登录、`SEC-002` 刷新及每次受保护请求都必须重新校验用户状态；
- 用户停用、锁定、无有效角色时，即使映射为 `active` 也拒绝认证；
- 用户重新启用不会自动解除锁定、重新绑定或恢复已解绑/停用映射。

## 10. 同一 OpenID 并发绑定

1. 服务端从环境配置取得 AppID并交换微信 code；
2. 在事务中锁定目标用户和可能存在的当前映射；
3. 校验用户、账号凭据、状态、角色及当前绑定；
4. 插入 `active` 映射；
5. 以数据库部分唯一约束作为最终并发裁决；
6. 唯一冲突转换为 API Change Request 002 的稳定 409 错误；
7. 事务失败不留下映射或成功审计，事务提交前不签发 Token。

不得用“先查询后插入”、客户端锁或缓存锁代替数据库约束。

## 11. Migration 方案

本次正式生成一个前向 Migration：

1. 创建 `user_wechat_identities`；
2. 创建主键、4 个外键、3 个当前有效绑定部分唯一约束、1 个普通索引和 Check；
3. 更新 Prisma 双向关系，但不改变 `users` 的现有业务字段；
4. 运行 `prisma generate`、Schema Validate、Migration Deploy/Status；
5. 在空库和从当前 v1.1 升级的数据库分别验证；
6. 验证并发双绑、停用、解绑历史及 FK/Check 失败；
7. 同步并核对 Mapping Audit。

Migration 不写真实 AppID、Secret、OpenID、用户或业务数据。

## 12. 现有数据迁移与回滚

- 不回填：当前没有可信微信身份来源，禁止从日志、客户端数据、昵称、电话或邮箱猜测；
- 现有用户首次使用微信时按 `wechat-bind` 创建映射；
- 表尚未产生正式数据前，技术回滚可删除新表；
- 表产生任何绑定历史后，不允许破坏性 Drop；应关闭微信登录、保留数据与审计，再提交正式回滚 DCR/Migration；
- 任何数据修复必须有项目负责人批准和可追溯脚本，不允许手工改表。

## 13. Mapping Audit 正式结果

初次 DCR-002 同步结果如下；该结果是 Completion Fix 前的中间历史基线，不再是当前正式计数：

| 项目 | v1.1 | v2.0 | 变化 |
| --- | ---: | ---: | ---: |
| 表 | 60 | 61 | +1 |
| 字段 | 1128 | 1142 | +14 |
| 主键 | 60 | 61 | +1 |
| 唯一约束 | 71 | 74 | +3 |
| 外键 | 283 | 287 | +4 |
| 普通索引 | 90 | 91 | +1 |
| Check | 201 | 208 | +7 |
| 枚举 | 2 | 2 | 0 |

三个部分唯一索引按正式唯一约束计数，普通索引只计 `idx_user_wechat_identities_status_updated_at`。Completion Fix 的最终计数见第 24 节。

## 14. Database Logical Design 版本决定

新增正式身份映射和认证会话持久化对象属于同一项认证 SSOT 补齐，Database Logical Design 从 v1.1 升级为 v2.0 并在 Completion Fix 验证通过后重新冻结。现有 60 张表、1128 个字段的 v1.1 继续保留为历史冻结基线。

`status` 正式作为本表受 Check 约束的局部生命周期代码，不新增 PostgreSQL Enum，也不扩展 `DATABASE_ENUM_SPEC.md` 的正式枚举集合。

## 15. 非平行微信用户体系证明

- `user_wechat_identities` 没有用户名、密码、角色、权限、仓库、店铺或业务主体字段；
- 每一行必须通过 `user_id` 指向已有 `users`；
- 登录成功后的主体 ID、角色、权限、数据范围和审计操作人均来自现有体系；
- 微信身份不能独立启用系统账号、创建角色或获得权限；
- 昵称和头像不进入正式身份表；
- 用户停用优先于映射状态；
- 所以新表是外部凭据映射，不是第二套用户系统。

## 16. 不影响范围

本请求不修改业务规则、用户/角色/权限定义、既有 60 张表的字段含义、库存、采购、生产、验收、出入库、跨境、Dashboard、API 路径、API 数量、Seed 或真实数据。仅同步 Prisma Schema、正式 Migration 和 Mapping Audit，不创建业务代码。

## 17. 批准决定与保留事项

项目负责人已批准：

1. `user_wechat_identities` 表名和 14 个字段；
2. 首版单 AppID、每个用户一个当前有效绑定；
3. 三个当前有效绑定部分唯一约束；
4. `active`、`unbound`、`disabled` 三个局部状态且不新增数据库枚举；
5. 不物理删除，重新绑定创建新的历史行；
6. 4 个 RESTRICT 外键、7 项 Check 和 1 个普通索引；
7. 不回填现有用户；
8. Database Logical Design v2.0。

管理员解绑/重新绑定的页面、权限和 API，以及未知身份失败事件的独立持久化对象均未在本 DCR 中批准；如确有需要，必须另行走正式变更流程。

## 18. 初次同步结论与 Completion Fix 原因

初次同步正式批准 `user_wechat_identities` 为唯一微信身份映射对象，但当时的 61 表结论尚不能持久化 Refresh Token 轮换、旧凭证重放和登出撤销状态，不能完整支撑已批准的 `SEC-002` 与 `SEC-003`。因此不得把初次同步描述为数据库认证设计已经完整完成。

项目负责人随后批准本 Completion Fix：在不改变 Database Logical Design v2.0 版本号、不修改 API 和不开始 Batch 8.6-B 的前提下，新增最小 `auth_sessions` 对象。只有第 24 节验证全部通过后，v2.0 的 Completed / Approved / Frozen 状态才成立。

## 19. `auth_sessions` 定位与轮换模型

正式采用**模型 A：每次刷新创建新 Session 行**：

- 同一次登录及其全部刷新轮换使用同一个 `token_family_id`；
- 每个 Session 行只持有一个 Refresh Token 的服务端密钥单向摘要；
- 刷新时先创建后继行，再以条件更新原行的 `replaced_by_session_id` 完成唯一认领；
- 原行和旧摘要永久保留，因而能够识别旧 Refresh Token 再次出现；
- 活动 Session 定义为 `revoked_at IS NULL AND replaced_by_session_id IS NULL`；
- 不采用覆盖同一行 Hash 的模型 B，因为覆盖会丢失旧凭证的持久重放证据；
- 不新增平行 Refresh Token 表。

`auth_sessions` 只管理认证会话和令牌生命周期。`users` 仍是唯一用户身份，`user_wechat_identities` 仍只管理微信映射，RBAC 仍是授权唯一事实来源。会话不保存权限副本、OpenID、UnionID 或 AppID Secret。

## 20. `auth_sessions` 字段

| 字段 | PostgreSQL 类型 | 必填 | 默认值 | 正式语义 |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | 是 | `uuidv7()` | Session 主键 |
| `user_id` | `uuid` | 是 | 无 | 唯一系统用户 |
| `client_type` | `varchar(50)` | 是 | 无 | `pc` 或 `wechat-mini-program`；不得用于授权 |
| `token_family_id` | `uuid` | 是 | 无 | 同一次登录及全部轮换共享的不可预测族标识 |
| `refresh_token_hash` | `varchar(128)` | 是 | 无 | 服务端密钥参与的确定性单向摘要，不是明文 Token |
| `refresh_token_expires_at` | `timestamptz(6)` | 是 | 无 | Refresh Token 到期时间 |
| `access_token_expires_at` | `timestamptz(6)` | 是 | 无 | 对应 Access Token 到期时间 |
| `issued_at` | `timestamptz(6)` | 是 | 无 | 本轮令牌签发时间 |
| `last_refreshed_at` | `timestamptz(6)` | 否 | `NULL` | 原行被成功轮换的时间 |
| `revoked_at` | `timestamptz(6)` | 否 | `NULL` | 撤销时间 |
| `revoked_by` | `uuid` | 否 | `NULL` | 用户操作触发撤销时的系统用户 |
| `revocation_actor_type` | `varchar(50)` | 否 | `NULL` | 撤销时为 `user` 或 `system` |
| `revocation_reason` | `varchar(1000)` | 否 | `NULL` | 非空、去除首尾空白的撤销原因 |
| `replaced_by_session_id` | `uuid` | 否 | `NULL` | 指向唯一后继 Session |
| `created_at` | `timestamptz(6)` | 是 | `CURRENT_TIMESTAMP` | 创建时间 |
| `created_by` | `uuid` | 是 | 无 | 登录或刷新对应的已知系统用户 |
| `updated_at` | `timestamptz(6)` | 是 | `CURRENT_TIMESTAMP` | 更新时间 |
| `updated_by` | `uuid` | 否 | `NULL` | 用户操作更新时的系统用户 |

不新增 `refresh_token_version`：每行本身就是一个轮换版本；不新增 `last_used_at`：`last_refreshed_at` 已表达旧凭证被消费；不新增 `wechat_identity_id`：`user_id` 与 `client_type` 已足够关联会话主体和客户端类型，复制微信映射关系没有必要。

`updated_by` 允许为空是认证技术表的正式例外：重放保护等系统安全动作使用 `revocation_actor_type = 'system'`、`revoked_by = NULL`、`updated_by = NULL`，不得为未知攻击事件伪造系统用户。用户主动登出使用 `user` 和真实 `users.id`。

## 21. 主键、唯一约束、索引与外键

- 主键：`pk_auth_sessions (id)`；
- 唯一约束：`uq_auth_sessions_refresh_token_hash (refresh_token_hash)`；
- 唯一约束：`uq_auth_sessions_replaced_by_session_id (replaced_by_session_id)`，保证一个后继只能替换一个前驱；
- 普通索引：`idx_auth_sessions_user_revoked_refresh_expiry (user_id, revoked_at, refresh_token_expires_at)`；
- 普通索引：`idx_auth_sessions_family_revoked (token_family_id, revoked_at)`；
- 普通索引：`idx_auth_sessions_client_type_updated_at (client_type, updated_at)`。

`token_family_id` 在同族轮换行中必须重复，因此不唯一；它由族撤销索引覆盖。`id` 已是主键，不建立冗余 `(token_family_id, id)` 唯一约束；Hash 和后继外键已由唯一约束提供索引，不创建重复普通索引。

| 外键 | 引用 | 更新 | 删除 |
| --- | --- | --- | --- |
| `fk_auth_sessions_user_id` | `user_id → users.id` | RESTRICT | RESTRICT |
| `fk_auth_sessions_revoked_by` | `revoked_by → users.id` | RESTRICT | RESTRICT |
| `fk_auth_sessions_created_by` | `created_by → users.id` | RESTRICT | RESTRICT |
| `fk_auth_sessions_updated_by` | `updated_by → users.id` | RESTRICT | RESTRICT |
| `fk_auth_sessions_replaced_by_session_id` | `replaced_by_session_id → auth_sessions.id` | RESTRICT | RESTRICT |

全部外键禁止级联删除。

## 22. Check、循环防护与事务并发

正式新增 14 项命名 Check：

1. `client_type` 只允许 `pc`、`wechat-mini-program`；
2. `refresh_token_hash` 去除首尾空白后必须非空且数据库值无首尾空白；
3. Refresh 到期不得早于 Access 到期；
4. `issued_at` 不得晚于 Access 到期；
5. `issued_at` 不得晚于 Refresh 到期；
6. `last_refreshed_at` 为空或不早于 `issued_at`；
7. `revocation_actor_type` 为空或只允许 `user`、`system`；
8. 撤销时间、操作者类型和非空原因必须整体为空或整体存在；
9. `user` 撤销必须有 `revoked_by`，`system` 撤销必须没有 `revoked_by`；
10. `revoked_at` 为空或不早于 `issued_at`；
11. `replaced_by_session_id` 不得等于自身；
12. 被替换行必须具有 `last_refreshed_at`；
13. `issued_at` 不早于 `created_at`；
14. `updated_at` 不早于 `created_at`。

同表循环由 `trg_auth_sessions_rotation_acyclic` 及 `check_auth_session_rotation_cycle()` 在写入时阻止；自引用同时由 Check 阻止。

同一 Refresh Token 的并发轮换使用单个数据库事务：

1. 事务插入预生成 UUID 的后继 Session；
2. 以 `id`、未撤销、未替换、未到期为条件更新前驱，写入后继 ID 和刷新时间；
3. 必须验证前驱恰好更新一行；零行时抛错并回滚，包括刚插入的后继；
4. 数据库行锁与唯一约束使并发请求中最多一个提交成功；
5. 失败请求随后仍能用唯一 Hash 找到保留的旧行，并将其识别为重放；
6. 不以应用内存、Redis 锁或客户端状态作为最终裁决。

轮换链只允许从前驱指向新建后继；已设置的 `replaced_by_session_id` 不得改写。该写入规则属于后续获批 Service 实现约束，本轮只固化数据库支撑且不实现业务代码。

## 23. 对认证 API 语义的数据库支撑

- `SEC-001`：登录成功后为 PC 或微信小程序创建首个 Session；微信映射仍由 `user_wechat_identities` 管理；
- `SEC-002`：按唯一 Hash 定位 Session，验证用户状态、到期、撤销和替换事实，在事务内轮换；旧 Hash 重放后按 `token_family_id` 以系统操作者撤销整族；
- `SEC-003`：按当前 `token_family_id` 幂等撤销整族，使用用户操作者，不解绑微信身份，也不影响其他令牌族；
- `SEC-004`：可从 Session 形成非敏感摘要，不返回 Hash、内部后继 ID 或令牌族内部细节；
- 用户停用：刷新必须重新读取 `users` 当前状态并拒绝；数据库索引支持按 `user_id` 定位活动会话，是否即时批量撤销留待 API / Service 正式实现明确。

Access Token 和 Refresh Token 明文均不入库；JWT Secret、密码、微信 code、Session Key、OpenID、UnionID 和 AppID Secret 也不进入本表。

## 24. Completion Fix Migration 与 Mapping Audit

新增独立前向 Migration：

- `20260723160000_add_auth_sessions`；
- 只创建 `auth_sessions`、相关约束、索引、循环防护函数和触发器；
- 不修改 `20260723150000_add_user_wechat_identities` 或任何既有业务表；
- 不写 Token、用户或业务数据。

最终 Mapping Audit：

| 项目 | v1.1 | DCR-002 初次同步 | v2.0 Completion Fix | 相对初次同步 |
| --- | ---: | ---: | ---: | ---: |
| 表 | 60 | 61 | 62 | +1 |
| 字段 | 1128 | 1142 | 1160 | +18 |
| 主键 | 60 | 61 | 62 | +1 |
| 唯一约束 | 71 | 74 | 76 | +2 |
| 外键 | 283 | 287 | 292 | +5 |
| 普通索引 | 90 | 91 | 94 | +3 |
| Check | 201 | 208 | 222 | +14 |
| 枚举 | 2 | 2 | 2 | 0 |

其中 5 个外键包括 4 个用户外键和 1 个同表轮换外键；`revocation_actor_type` 与 `client_type` 均为表内 Check 代码，不新增 PostgreSQL Enum。

PostgreSQL 18.4 隔离验证结果：

- 空库通过 Prisma 顺序部署全部 3 个 Migration，`prisma migrate status` 返回 up to date；
- 从初次 v2.0 的前两个 Migration 基线独立执行 `20260723160000_add_auth_sessions` 成功；
- 真实 Catalog 得到 62 表、1160 字段、62 主键、76 唯一约束、292 外键、94 普通索引、222 Check、2 枚举；
- 有效 Session 创建成功，表中不存在 `access_token` 或 `refresh_token` 明文字段；
- 重复 Hash、错误到期顺序、撤销字段不一致、自引用、轮换循环和用户删除均被正式约束拒绝；
- 两个并发事务使用同一旧 Hash 轮换时，一个提交、一个回滚，最终只存在一个后继和一个活动 Session；
- 旧行与旧 Hash 保留，重放后整族系统撤销成功；用户登出整族撤销具备幂等性且不影响其他令牌族。

## 25. Completion Fix 正式结论

`user_wechat_identities` 与 `auth_sessions` 共同构成 Database Logical Design v2.0 的认证持久化边界：前者只映射微信外部身份，后者只保留会话轮换、重放与撤销事实，二者均指向现有 `users`，不形成平行用户或授权体系。

Database Logical Design v2.0、Prisma Schema、两个独立前向 Migration 和 Mapping Audit 在本 Completion Fix 验证通过后正式保持 Completed / Approved / Frozen。本批准不修改或批准 API Change Request 002，不授权 Route、Service、Repository、登录、刷新、登出、JWT、Web 或 Mini Program 开发；Batch 8.6-B 继续暂停。
