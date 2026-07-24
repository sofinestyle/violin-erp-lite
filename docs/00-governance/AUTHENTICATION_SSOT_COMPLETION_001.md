---
document_name: Authentication SSOT Completion 001：微信身份认证与账号绑定补齐
project: Violin ERP Lite
version: 1.3
status: Completed / Approved
owner: Project Manager
created_date: 2026-07-23
updated_date: 2026-07-23
related_phase: Phase 5 / Phase 6 / Phase 8
---

# Authentication SSOT Completion 001：微信身份认证与账号绑定补齐

> 项目负责人已批准 Database Change Request 002、认证会话持久化 Completion Fix 及 API Change Request 002。数据库与 API SSOT 已完成同步；Batch 8.6-B 仍须等待 GitHub 技术验收及项目负责人后续启动。

## 1. 变更背景

Approved Phase 6 已确定：PC 管理端以用户名和密码登录；微信小程序首次授权必须绑定已有且启用的系统账号，后续通过微信授权自动登录；双端最终都使用 `users` 和现有 RBAC 体系，不得建立平行微信用户体系。

实现审计发现，Frozen API 仅登记 `SEC-001` 至 `SEC-005` 的路径和能力，未定义密码登录、微信首次绑定及微信自动登录的可判别 Request DTO；历史 Frozen Database Logical Design v1.1 的 60 张表中也没有可持久化微信身份与 `users.id` 映射的对象。客户端缓存、临时微信 `code`、Redis 或既有 `users` 展示字段均不能成为可信、可审计的长期身份事实。

Database Change Request 002 及其 Completion Fix 已批准并同步为 Frozen Database Logical Design v2.0，正式覆盖微信身份映射、Refresh Token 轮换、重放识别和登出撤销的持久化；API Change Request 002 已批准并同步为 Frozen API Master Specification v1.2。Authentication SSOT 的数据库与 API 缺口均已关闭。

## 2. SSOT 冲突清单

| 编号 | 正式来源 | 已批准要求 | 当前缺口 | 影响 |
| --- | --- | --- | --- | --- |
| AUTH-SSOT-001 | Phase 6 Task 6.3 第 3.2、3.3 节 | PC 密码登录；微信首次绑定已有账号，后续自动登录 | API v1.2 已补齐三种模式的 Request DTO、必填和互斥规则 | 已关闭 |
| AUTH-SSOT-002 | Phase 6 Task 6.3 第 3.1、3.3 节 | 微信身份始终映射回同一个 `users` 身份 | v1.1 没有微信身份映射表或字段；DCR-002 已在 v2.0 关闭该缺口 | 数据库阻塞已关闭，等待 API 契约 |
| AUTH-SSOT-003 | API Master Specification v1.2；Task 5.5 | `SEC-002` 至 `SEC-005` 统一处理刷新、登出、会话和权限 | Database v2.0 与 API v1.2 已补齐 | 已关闭 |
| AUTH-SSOT-004 | Task 5.1、Task 5.5 | 稳定错误码、安全日志、幂等、并发和脱敏 | API v1.2 已补齐微信授权、未绑定、并发绑定、刷新重放和撤销语义 | 已关闭 |
| AUTH-SSOT-005 | Database Logical Design v2.0 | 正式身份事实必须有完整约束、关系和审计 | `user_wechat_identities` 与 `auth_sessions` 已正式补齐且未污染 `users` | 已关闭 |

这是既有 Approved/Frozen 输入之间的可实现性缺口。Database v2.0 与 API v1.2 已按正式变更流程全部关闭；本表保留用于追溯，不再表示当前阻塞。

## 3. 受影响文档

正式同步状态：

- `docs/03-data/DATABASE_SPEC.md`：已升级并冻结为 v2.0；
- `docs/03-data/DATABASE_ENUM_SPEC.md`：已确认不新增枚举，引用同步至 v2.0；
- `prisma/schema.prisma`、正式 Migration、`prisma/mapping-audit.json`：已同步；
- `docs/05-api/API_SPEC.md`；
- `docs/phases/phase-05/TASK_5_5_IMPORT_LOG_SECURITY_API_FINAL.md`；
- `docs/phases/phase-06/TASK_6_3_COMMON_CAPABILITY_FUNCTIONAL_DESIGN.md`；
- Task 8.6 实施文档、`DECISION_LOG.md` 和 `CHANGELOG.md`。

API Master、Task 5.5 和 Task 6.3 已按获批 API Change Request 002 同步；角色权限规格与业务规则未改变。

## 4. 受影响 API

- `SEC-001 POST /api/v1/auth/login`：正式使用 `password`、`wechat-bind`、`wechat` 三种判别式请求及统一响应；
- `SEC-002 POST /api/v1/auth/refresh`：微信与 PC 复用同一刷新契约；
- `SEC-003 POST /api/v1/auth/logout`：只结束当前客户端认证上下文，不解绑微信；
- `SEC-004 GET /api/v1/auth/session`：可增加非敏感 `clientType`、`wechatBound` 摘要；
- `SEC-005 GET /api/v1/auth/permissions`：保持只从角色、权限和数据范围计算。

正式方案不新增路径或编号，API 正式总数保持 335。完整契约见 `API_CHANGE_REQUEST_002.md` 和 API Master Specification v1.2 第 20 节。

## 5. 受影响数据库对象

Frozen Database Logical Design v2.0 已正式新增：

- `user_wechat_identities`：只承担外部微信身份到现有 `users.id` 的映射；
- `auth_sessions`：只承担认证会话、令牌族、Refresh Token 安全摘要、轮换链、重放和撤销事实。

两张表都不承担用户、角色、权限、昵称或头像管理。Access Token 与 Refresh Token 明文、JWT Secret、微信 code 和 Session Key 均不入库。

现有 `users`、`roles`、`user_roles`、`role_permissions`、`role_warehouses`、`role_stores` 继续是用户与授权唯一事实来源；`audit_logs` 记录能够合法映射到已知对象的绑定、登录、解绑、停用和拒绝事件。未知用户或无可用对象 ID 的失败事件不得伪造 `audit_logs.object_id`，只进入脱敏安全遥测；若未来要求持久化此类事件，需另行 DCR。

完整字段、约束、Migration 和 62 表、1160 字段、62 主键、76 唯一约束、292 外键、94 普通索引、222 Check、2 枚举的正式计数见已批准的 `DATABASE_CHANGE_REQUEST_002.md`。

## 6. 推荐统一方案

1. `users` 保持唯一系统用户身份，微信身份不是独立用户。
2. Database v2.0 已批准每个部署环境只配置一个当前微信小程序 AppID；映射行保存 `mini_program_appid`。首版不支持同一用户同时绑定多个 AppID。
3. Database v2.0 已批准 `user_wechat_identities` 保存 OpenID、可选 UnionID、AppID、绑定生命周期和审计字段；只允许一个用户存在一个当前有效绑定，一个微信身份存在一个当前有效绑定。
4. `SEC-001` 使用 `loginType` 判别三种互斥请求：
   - `password`：PC 用户名和密码；
   - `wechat-bind`：微信临时 code 加已有系统用户名和密码，在单一事务中完成校验、绑定和登录；
   - `wechat`：微信临时 code 换取身份后查找当前有效映射并自动登录。
5. 微信临时 code 和 Session Key 只在服务端单次交换流程中使用，不持久化、不记录、不返回客户端。
6. 登录成功后双端使用同一 Access Token、Refresh Token、`auth_sessions` 轮换模型、角色、权限和数据范围机制。微信身份不能增加权限。
7. 用户停用、锁定、无有效角色或绑定失效时，微信登录与密码登录都必须拒绝。
8. 解绑、停用和重新绑定必须通过后续获批的正式流程并留下审计。Approved 页面目前没有绑定管理入口，本次正式不新增解绑或查询 API；如项目负责人要求管理能力，应另提有编号的页面/API/权限变更。

## 7. 备选方案及不采用原因

| 方案 | 安全性 | 完整性与审计 | 维护性 | Frozen 影响 | 结论 |
| --- | --- | --- | --- | --- | --- |
| A. 新增 `user_wechat_identities` | 服务端可信映射、唯一约束和事务可防止抢绑 | 可保留绑定生命周期并关联 `users` | 边界单一，后续可验证 | 需要 DCR、Migration 和 API DTO 补齐 | **正式推荐** |
| B. 复用 `users` 现有字段 | 无专用语义和约束，易泄露或碰撞 | `username`、`display_name`、`email`、`phone`、状态及审计字段均不适合；没有备注/JSON 可合法承载身份 | 字段语义污染，难以解绑和扩展 | 实质仍是未批准数据库语义变更 | 不采用；禁止偷存 OpenID |
| C. 仅 Redis / 服务端缓存 | 服务重启、淘汰或多环境配置错误会丢失映射 | 无正式 FK、唯一约束和完整生命周期审计 | 需额外恢复、备份和一致性机制 | 绕过 Frozen 数据事实来源 | 不采用；缓存只能作为获批持久映射的加速层 |
| D. 仅客户端缓存 | 客户端可篡改、复制、清理或伪造 | 不能证明微信身份与系统用户的绑定事实 | 无法安全处理换机、重装和多端 | 与服务端认证边界冲突 | 不采用 |
| E. 只支持用户名密码 | 密码登录本身可安全实现 | 无微信绑定事实 | 最简单但删除已批准能力 | 与 Approved Phase 6 微信自动登录直接冲突 | 不采用 |

## 8. 安全风险与控制

- **账号枚举**：无论用户名、微信身份或绑定冲突，响应不得透露另一账号标识；日志只保存脱敏摘要。
- **临时凭据泄露**：微信 code、Session Key、App Secret、密码、Token 不得进入数据库、响应、审计快照、普通日志或 URL。
- **绑定劫持**：`wechat-bind` 必须同时验证服务端换取的微信身份、系统账号凭据、账号状态、锁定状态和有效角色；绑定与签发令牌在事务提交后完成。
- **并发双绑**：依赖数据库当前有效绑定唯一约束；锁定目标用户和微信身份，冲突统一返回 409，不以“先查后写”代替约束。
- **跨 AppID 混淆**：AppID 来自服务端环境配置，不接受客户端提交；查询键包含 OpenID 与 AppID。
- **停用绕过**：每次登录、刷新和受保护请求都重新验证系统用户及授权有效性，不因微信已绑定而跳过。
- **UnionID 误用**：UnionID 可空，只作为同一开放平台下的辅助防冲突信息，不作为唯一登录输入。
- **必须修改密码**：`wechat-bind` 正式返回 `AUTH_PASSWORD_CHANGE_REQUIRED`，在管理员按现有正式密码重置流程清除标记前拒绝绑定；不得以微信授权绕过密码策略。

## 9. 数据迁移同步结果

- 正式 Migration 只创建空映射表、约束、索引和外键，不回填或猜测任何现有用户的微信身份；
- 现有用户、角色、权限和业务数据不变；所有微信用户首次使用时按正式流程绑定；
- 若表尚无正式数据，回滚可删除新表；一旦产生绑定历史，不得破坏性删除，必须停用功能、保留表和审计，并另行批准回滚 Migration；
- Prisma Schema、两个独立前向 Migration、Database SSOT 和 `prisma/mapping-audit.json` 已保持一致；
- AppID/Secret 环境变量和认证使用方式必须遵循 API v1.2；具体代码仍待 Batch 8.6-B 正式启动后实现。

## 10. 兼容性影响

- PC 继续使用同一路径；客户端需按批准后的判别式 DTO 提交 `loginType: "password"`，不存在路径迁移；
- Mini Program 从当前空会话壳层接入 `wechat-bind` / `wechat`；
- 现有 Access Token 与 Refresh Token 技术可复用；数据库已持久化轮换、重放和撤销事实，正式请求 DTO、响应和 Service 边界已由 API v1.2 固化；
- `X-Client-Type` 继续只用于兼容、审计和监控，不参与身份或授权决定；
- 错误码复用 Frozen `AUTH_CREDENTIAL_INVALID`、`AUTH_REFRESH_TOKEN_INVALID`；不得重复引入用户指令中的同义名称；
- Database Logical Design 为 v2.0；API Master Specification 为 v1.2；二者均为 Completed / Approved / Frozen。

## 11. 对 Phase 6、Phase 8 和 Batch 8.6-B 的影响

- Phase 6 已批准的统一身份、首次绑定和自动登录产品要求不变，只补齐其明确后置的技术 SSOT；
- Task 8.6 继续为 In Progress，不改变正式 Task 状态；
- Batch 8.6-B 的认证代码整改保持暂停；本轮只完成正式文档同步；
- Database/API/Phase 6 SSOT 已完成同步；本次 GitHub 技术验收通过并由项目负责人另行正式启动后，方可执行 Batch 8.6-B；
- Phase 8 Final Consistency Review 与 Phase 9 均不启动。

## 12. 本轮后续禁止事项

- 完成本次获批同步后，未经新的正式变更不得继续修改 `API_SPEC.md`、Phase 5 或 Phase 6 正式规格；
- 不修改 Seed、认证代码、双端 Context 或测试；
- 不创建新 API Route、临时字段或平行微信用户；
- 不以 Redis、客户端缓存、备注、邮箱、手机号、名称或 JSON 保存正式映射；
- 不使用真实 AppID、Secret、OpenID、UnionID、Token、密码或账号数据；
- 不在 GitHub 技术验收和后续正式启动前开始 Batch 8.6-B。

## 13. 批准后的正式同步顺序

```text
Database Change Request 002 批准（已完成）
→ 更新并重新冻结数据库 SSOT（已完成）
→ API Change Request 002 批准（已完成）
→ 更新并重新冻结 API SSOT（已完成）
→ 同步 Phase 5 / Phase 6 功能规格（已完成）
→ GitHub 技术验收（等待）
→ 项目负责人正式启动 Batch 8.6-B
```

任何一步发现新冲突，都必须停止冲突部分并重新进入治理流程。

## 14. 项目负责人批准决定

1. 批准 `password`、`wechat-bind`、`wechat` 三种 `loginType` 共用 `SEC-001`；
2. 批准首次绑定在单一事务中完成账号校验、绑定、首个 Session 和审计，提交后向客户端返回令牌；
3. 批准本次不新增绑定、解绑或查询 API；管理能力未来另行变更；
4. 批准 `mustChangePassword = true` 时拒绝微信绑定，并使用 `AUTH_PASSWORD_CHANGE_REQUIRED`；
5. 批准 API Master Specification v1.2，正式接口总数保持 335；
6. 已解绑身份跨账号重新绑定、冷却期和人工复核不在本次范围，未来如需必须正式变更；
7. 未知用户失败事件继续只进入脱敏安全遥测；如要求新增持久化对象必须另行 DCR。

## 15. 正式结论

Database Logical Design v2.0 与 API Master Specification v1.2 已正式批准：最小微信身份映射、最小认证会话、`SEC-001` 判别式 DTO、错误码及 `SEC-002` 至 `SEC-005` 会话契约已闭合，并保持 `users` 为唯一用户身份。Authentication SSOT Completion 001 正式更新为 Completed / Approved。

## 16. Database Change Request 002 Completion Fix

本次 Completion Fix 正式采用“每次刷新创建新 Session 行”的模型：

- `SEC-001` 登录成功创建首行，PC 与微信小程序共用模型；
- `SEC-002` 只按 `refresh_token_hash` 的服务端密钥单向摘要匹配，在事务内创建后继并条件认领前驱；
- 旧行和旧 Hash 保留，`replaced_by_session_id` 形成不可循环的轮换链；旧 Token 再次出现可识别为重放；
- 重放以 `revocation_actor_type = 'system'`、空 `revoked_by` 撤销整个 `token_family_id`，不伪造系统用户；
- `SEC-003` 以当前用户作为操作者幂等撤销当前令牌族，不解绑微信、不影响其他令牌族；
- 用户停用后的刷新必须读取 `users` 当前状态并拒绝，数据库索引支持定位该用户的活动会话；
- `SEC-004` 只能返回安全摘要，不返回 Hash、内部轮换链或明文 Token。

数据库与 API SSOT 缺口现已全部关闭。本文件整体为 Completed / Approved；Batch 8.6-B 继续暂停，等待本次 GitHub 技术验收和项目负责人后续正式启动。
