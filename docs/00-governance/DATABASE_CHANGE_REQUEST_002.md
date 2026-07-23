---
document_name: Database Change Request 002：微信身份映射对象
project: Violin ERP Lite
version: 1.0
status: Proposed / Pending Approval
owner: Project Manager
created_date: 2026-07-23
updated_date: 2026-07-23
related_phase: Phase 3 / Phase 6 / Phase 7
---

# Database Change Request 002：微信身份映射对象

> 本文件是待项目负责人批准的数据库变更请求，不修改或替代当前 Frozen Database Logical Design v1.1。

## 1. 变更原因

Approved Phase 6 要求微信首次授权绑定已有系统账号，后续微信授权自动登录，并始终映射回同一 `users` 身份。当前 Frozen 60 张表中：

- `users` 只保存系统账号、密码哈希、状态、锁定和审计事实；
- `user_roles`、`role_permissions`、`role_warehouses`、`role_stores` 只保存授权关系；
- `audit_logs` 是只追加审计结果，不是当前身份映射；
- 没有 OpenID、UnionID、AppID 或外部身份到 `users.id` 的持久关系。

临时微信 code 会过期且只能单次使用；客户端缓存、Redis 或进程内缓存都不能提供数据库 FK、唯一约束、重启恢复、解绑历史和并发绑定保证。把 OpenID 偷存到用户名、名称、邮箱、手机号、备注或 JSON 会改变既有字段语义并绕过 Frozen 变更控制。

因此建议新增最小映射表，而不是修改 `users` 或建立平行微信用户表。

## 2. 新表业务必要性与边界

建议表名：`user_wechat_identities`。

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

OpenID、UnionID 和 AppID 长度是本 DCR 的提议值，批准前需由项目负责人确认。数据库不为 `status` 设置隐式激活默认值，避免漏传时意外启用。

## 4. 主键与唯一约束

### 4.1 主键

- `pk_user_wechat_identities`：`PRIMARY KEY (id)`；
- ID 使用项目统一 UUID v7。

### 4.2 当前有效绑定唯一约束

为保留解绑历史，建议使用部分唯一索引/约束：

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

建议至少建立：

1. `status IN ('active', 'unbound', 'disabled')`；
2. `openid = btrim(openid) AND length(openid) > 0`，且 `mini_program_appid` 同样非空、无首尾空白；
3. `unionid IS NULL OR (unionid = btrim(unionid) AND length(unionid) > 0)`；
4. `updated_at >= created_at`；
5. `bound_at >= created_at`；
6. `last_login_at IS NULL OR last_login_at >= bound_at`；
7. `status = 'unbound'` 时 `unbound_at`、`unbound_by` 均非空；其他状态两者均为空，且 `unbound_at >= bound_at`。

具体是否合并字符串和生命周期 Check 由获批后的数据库映射生成规则决定，但不得降低上述语义。

## 7. 普通索引

建议新增：

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

批准后建议单独生成一个前向 Migration：

1. 创建 `user_wechat_identities`；
2. 创建主键、4 个外键、3 个当前有效绑定部分唯一约束、1 个普通索引和 Check；
3. 更新 Prisma 双向关系，但不改变 `users` 的现有业务字段；
4. 运行 `prisma generate`、Schema Validate、Migration Deploy/Status；
5. 在空库和从当前 v1.1 升级的数据库分别验证；
6. 验证并发双绑、停用、解绑历史及 FK/Check 失败；
7. 重新生成并核对 Mapping Audit。

Migration 不写真实 AppID、Secret、OpenID、用户或业务数据。

## 12. 现有数据迁移与回滚

- 不回填：当前没有可信微信身份来源，禁止从日志、客户端数据、昵称、电话或邮箱猜测；
- 现有用户首次使用微信时按 `wechat-bind` 创建映射；
- 表尚未产生正式数据前，技术回滚可删除新表；
- 表产生任何绑定历史后，不允许破坏性 Drop；应关闭微信登录、保留数据与审计，再提交正式回滚 DCR/Migration；
- 任何数据修复必须有项目负责人批准和可追溯脚本，不允许手工改表。

## 13. 对 Mapping Audit 的影响

当前 `prisma/mapping-audit.json` 基线：

| 项目 | 当前 | 本提案预计 | 预计变化 |
| --- | ---: | ---: | ---: |
| 表 | 60 | 61 | +1 |
| 字段 | 1128 | 1142 | +14 |
| 主键 | 60 | 61 | +1 |
| 唯一约束 | 71 | 74 | +3 |
| 外键 | 283 | 287 | +4 |
| 普通索引 | 90 | 91 | +1 |
| Check | 201 | 208 | +7 |
| 枚举 | 2 | 2 | 0 |

预计值只用于影响审计，不是已批准结果。获批实现时必须以正式生成器和 Migration 实际结果重新核对；部分唯一约束的计数口径若与当前审计工具不同，必须显式解释，不得手工改 JSON 掩盖差异。

## 14. Database Logical Design 版本建议

新增一张正式身份映射表、14 个字段及关系属于逻辑结构变化，建议 Database Logical Design 从 v1.1 升级为 v2.0 并重新冻结。现有 60 张表、1128 个字段的 v1.1 继续保留为历史冻结基线。

`status` 建议作为本表受 Check 约束的局部技术生命周期代码，不新增 PostgreSQL Enum，也不改变 `DATABASE_ENUM_SPEC.md` 当前 `warehouse_type`、`access_level` 两个正式枚举。若项目负责人要求把该状态提升为跨对象正式枚举，需在批准时明确同步 `DATABASE_ENUM_SPEC.md`。

## 15. 非平行微信用户体系证明

- `user_wechat_identities` 没有用户名、密码、角色、权限、仓库、店铺或业务主体字段；
- 每一行必须通过 `user_id` 指向已有 `users`；
- 登录成功后的主体 ID、角色、权限、数据范围和审计操作人均来自现有体系；
- 微信身份不能独立启用系统账号、创建角色或获得权限；
- 昵称和头像不进入正式身份表；
- 用户停用优先于映射状态；
- 所以新表是外部凭据映射，不是第二套用户系统。

## 16. 不影响范围

本请求不修改业务规则、用户/角色/权限定义、既有 60 张表的字段含义、库存、采购、生产、验收、出入库、跨境、Dashboard、API 路径、API 数量、Seed 或真实数据；不创建 Schema、Migration 或代码。

## 17. 待确认事项

1. 是否批准表名和 14 个字段；
2. 是否批准首版单 AppID、每个用户一个当前有效绑定；
3. 是否批准三个部分唯一约束，特别是可选 UnionID 的当前有效唯一性；
4. 是否批准 `active`、`unbound`、`disabled` 三个局部状态及不修改数据库枚举规范；
5. 是否批准不物理删除、重新绑定新建历史行；
6. 是否批准 4 个 RESTRICT 外键、7 类 Check 和 1 个普通索引；
7. 是否批准不回填现有用户；
8. 是否批准 Database Logical Design 目标版本 v2.0；
9. 是否需要为管理员解绑/重新绑定另行批准页面、权限和 API；
10. 是否需要另建安全事件持久化对象以覆盖无法映射 `audit_logs.object_id` 的未知身份失败。

## 18. 提案结论

建议批准 `user_wechat_identities` 作为唯一微信身份映射对象。它以最小数据库结构满足持久映射、并发唯一性、停用/解绑历史和审计要求，同时保留 `users` 为唯一系统用户。项目负责人批准、数据库 SSOT 更新并重新冻结前，不得创建表、Schema 或 Migration。
