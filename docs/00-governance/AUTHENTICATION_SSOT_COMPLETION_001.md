---
document_name: Authentication SSOT Completion 001：微信身份认证与账号绑定补齐
project: Violin ERP Lite
version: 1.0
status: Proposed / Pending Approval
owner: Project Manager
created_date: 2026-07-23
updated_date: 2026-07-23
related_phase: Phase 5 / Phase 6 / Phase 7
---

# Authentication SSOT Completion 001：微信身份认证与账号绑定补齐

> 本文件是待项目负责人批准的治理提案，不是 Approved / Frozen 事实，不授权修改正式规格、数据库或代码。

## 1. 变更背景

Approved Phase 6 已确定：PC 管理端以用户名和密码登录；微信小程序首次授权必须绑定已有且启用的系统账号，后续通过微信授权自动登录；双端最终都使用 `users` 和现有 RBAC 体系，不得建立平行微信用户体系。

实现审计发现，Frozen API 仅登记 `SEC-001` 至 `SEC-005` 的路径和能力，未定义密码登录、微信首次绑定及微信自动登录的可判别 Request DTO；Frozen Database Logical Design v1.1 的 60 张表中也没有可持久化微信身份与 `users.id` 映射的对象。客户端缓存、临时微信 `code`、Redis 或既有 `users` 展示字段均不能成为可信、可审计的长期身份事实。

因此 Batch 7.6-B 的认证实现部分必须暂停，先完成数据库与 API 正式变更流程。

## 2. SSOT 冲突清单

| 编号 | 正式来源 | 已批准要求 | 当前缺口 | 影响 |
| --- | --- | --- | --- | --- |
| AUTH-SSOT-001 | Phase 6 Task 6.3 第 3.2、3.3 节 | PC 密码登录；微信首次绑定已有账号，后续自动登录 | `SEC-001` 没有三种模式的 Request DTO、必填和互斥规则 | 无法形成唯一、可验证的接口契约 |
| AUTH-SSOT-002 | Phase 6 Task 6.3 第 3.1、3.3 节 | 微信身份始终映射回同一个 `users` 身份 | Frozen 数据库没有微信身份映射表或字段 | 无法在重启、多实例和多环境下可靠恢复映射 |
| AUTH-SSOT-003 | API Master Specification v1.1；Task 5.5 | `SEC-002` 至 `SEC-005` 统一处理刷新、登出、会话和权限 | 微信会话的兼容 DTO、客户端摘要及解绑边界未明确 | 双端会话行为可能分叉 |
| AUTH-SSOT-004 | Task 5.1、Task 5.5 | 稳定错误码、安全日志、幂等、并发和脱敏 | 微信授权失败、未绑定及并发绑定缺少正式语义 | 实现可能泄露账号或产生重复绑定 |
| AUTH-SSOT-005 | Database Logical Design v1.1 | 正式身份事实必须有完整约束、关系和审计 | 现有 `users` 字段均不适合保存 OpenID / UnionID | 不能以备注、邮箱、电话、名称或 JSON 规避 DCR |

这是既有 Approved/Frozen 输入之间的可实现性缺口。本提案只记录冲突和建议，不自行改变任一 SSOT。

## 3. 受影响文档

批准后需要依正式顺序评审和同步：

- `docs/03-data/DATABASE_SPEC.md`；
- `docs/03-data/DATABASE_ENUM_SPEC.md`（仅项目负责人决定将表内状态提升为正式数据库枚举时）；
- `docs/05-api/API_SPEC.md`；
- `docs/phases/phase-05/TASK_5_5_IMPORT_LOG_SECURITY_API_FINAL.md`；
- `docs/phases/phase-06/TASK_6_3_COMMON_CAPABILITY_FUNCTIONAL_DESIGN.md`；
- 相关数据库表结构、字段、关系、索引、约束和 Mapping Audit；
- `prisma/schema.prisma` 与新的 Migration；
- Task 7.6 实施文档、`DECISION_LOG.md` 和 `CHANGELOG.md`。

本轮未修改上述 Frozen / Approved 规格。

## 4. 受影响 API

- `SEC-001 POST /api/v1/auth/login`：建议补齐 `password`、`wechat`、`wechat-bind` 三种判别式请求及统一响应；
- `SEC-002 POST /api/v1/auth/refresh`：微信与 PC 复用同一刷新契约；
- `SEC-003 POST /api/v1/auth/logout`：只结束当前客户端认证上下文，不解绑微信；
- `SEC-004 GET /api/v1/auth/session`：可增加非敏感 `clientType`、`wechatBound` 摘要；
- `SEC-005 GET /api/v1/auth/permissions`：保持只从角色、权限和数据范围计算。

首选方案不新增路径或编号，API 正式总数建议保持 335。完整建议见 `API_CHANGE_REQUEST_002.md`。

## 5. 受影响数据库对象

建议新增 `user_wechat_identities`，只承担外部微信身份到现有 `users.id` 的映射，不承担用户、角色、权限、昵称或头像管理。

现有 `users`、`roles`、`user_roles`、`role_permissions`、`role_warehouses`、`role_stores` 继续是用户与授权唯一事实来源；`audit_logs` 记录能够合法映射到已知对象的绑定、登录、解绑、停用和拒绝事件。未知用户或无可用对象 ID 的失败事件不得伪造 `audit_logs.object_id`，只进入脱敏安全遥测；若未来要求持久化此类事件，需另行 DCR。

完整字段、约束、迁移和计数影响见 `DATABASE_CHANGE_REQUEST_002.md`。

## 6. 推荐统一方案

1. `users` 保持唯一系统用户身份，微信身份不是独立用户。
2. 每个部署环境只配置一个当前微信小程序 AppID；映射行仍保存 `mini_program_appid`，防止跨应用混淆和重放。首版不支持同一用户同时绑定多个 AppID。
3. `user_wechat_identities` 保存 OpenID、可选 UnionID、AppID、绑定生命周期和审计字段；只允许一个用户存在一个当前有效绑定，一个微信身份存在一个当前有效绑定。
4. `SEC-001` 使用 `loginType` 判别三种互斥请求：
   - `password`：PC 用户名和密码；
   - `wechat-bind`：微信临时 code 加已有系统用户名和密码，在单一事务中完成校验、绑定和登录；
   - `wechat`：微信临时 code 换取身份后查找当前有效映射并自动登录。
5. 微信临时 code 和 Session Key 只在服务端单次交换流程中使用，不持久化、不记录、不返回客户端。
6. 登录成功后双端使用同一 Access Token、Refresh Token、会话、角色、权限和数据范围机制。微信身份不能增加权限。
7. 用户停用、锁定、无有效角色或绑定失效时，微信登录与密码登录都必须拒绝。
8. 解绑、停用和重新绑定必须通过后续获批的正式流程并留下审计。Approved 页面目前没有绑定管理入口，因此本次不建议新增解绑或查询 API；如项目负责人要求管理能力，应另提有编号的页面/API/权限变更。

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
- **必须修改密码**：建议 `wechat-bind` 返回待新增的 `AUTH_PASSWORD_CHANGE_REQUIRED`，在管理员按现有正式密码重置流程清除标记前拒绝绑定；不得以微信授权绕过密码策略。该语义待项目负责人确认。

## 9. 数据迁移影响

- 新 Migration 只创建空映射表、约束、索引和外键，不回填或猜测任何现有用户的微信身份；
- 现有用户、角色、权限和业务数据不变；所有微信用户首次使用时按正式流程绑定；
- 上线前必须验证 AppID/Secret 环境变量存在但不输出值；
- 若表尚无正式数据，回滚可删除新表；一旦产生绑定历史，不得破坏性删除，必须停用功能、保留表和审计，并另行批准回滚 Migration；
- Prisma Schema、Migration、Database SSOT 和 `prisma/mapping-audit.json` 必须在同一批准批次保持一致。

## 10. 兼容性影响

- PC 继续使用同一路径；客户端需按批准后的判别式 DTO 提交 `loginType: "password"`，不存在路径迁移；
- Mini Program 从当前空会话壳层接入 `wechat-bind` / `wechat`；
- 现有 Access Token 与 Refresh Token 技术可复用，但正式刷新、登出和撤销边界必须由 API Change Request 固化；
- `X-Client-Type` 继续只用于兼容、审计和监控，不参与身份或授权决定；
- 错误码复用 Frozen `AUTH_CREDENTIAL_INVALID`、`AUTH_REFRESH_TOKEN_INVALID`；不得重复引入用户指令中的同义名称；
- 建议 API Master Specification 从 v1.1 升至 v1.2，Database Logical Design 从 v1.1 升至 v2.0；版本变化均需项目负责人批准。

## 11. 对 Phase 6、Phase 7 和 Batch 7.6-B 的影响

- Phase 6 已批准的统一身份、首次绑定和自动登录产品要求不变，只补齐其明确后置的技术 SSOT；
- Task 7.6 继续为 In Progress，不改变正式 Task 状态；
- Batch 7.6-B 的认证代码整改保持暂停；可继续进行不触碰本冲突的只读审计，但不得实现临时 DTO、映射或新增路径；
- 变更批准并完成 Frozen Consistency Review 与 GitHub 技术验收后，方可重新启动 Batch 7.6-B；
- Phase 7 Final Consistency Review 与 Phase 8 均不启动。

## 12. 批准前禁止事项

- 不修改 `DATABASE_SPEC.md`、`DATABASE_ENUM_SPEC.md`、`API_SPEC.md`、Phase 5 或 Phase 6 正式规格；
- 不修改 Prisma Schema、Migration、Mapping Audit、Seed、认证代码、双端 Context 或测试；
- 不创建 `user_wechat_identities`、新 API Route、临时字段或平行微信用户；
- 不以 Redis、客户端缓存、备注、邮箱、手机号、名称或 JSON 保存正式映射；
- 不使用真实 AppID、Secret、OpenID、UnionID、Token、密码或账号数据；
- 不将本提案描述为 Approved / Frozen。

## 13. 批准后的正式同步顺序

```text
项目负责人批准 Authentication SSOT Completion 001
→ Database Change Request 002 批准
→ API Change Request 002 批准
→ 更新并重新冻结数据库 SSOT
→ 更新并重新冻结 API SSOT
→ 同步 Phase 6 功能规格
→ Frozen Consistency Review
→ GitHub 技术验收
→ 重新启动 Batch 7.6-B
```

任何一步发现新冲突，都必须停止冲突部分并重新进入治理流程。

## 14. 项目负责人待确认事项

1. 是否批准以 `user_wechat_identities` 作为唯一微信身份映射对象；
2. 是否批准首版每个环境只支持一个当前 AppID、每个用户只允许一个当前有效微信绑定；
3. 是否批准 `password`、`wechat-bind`、`wechat` 三种 `loginType` 共用 `SEC-001`；
4. 是否批准首次绑定在单一事务中完成账号校验和绑定，并在提交后签发令牌；
5. 是否批准本次不新增绑定、解绑或查询 API；管理能力未来另行变更；
6. 是否批准 `mustChangePassword = true` 时拒绝微信绑定，并新增 `AUTH_PASSWORD_CHANGE_REQUIRED`；
7. 是否批准绑定状态使用表内受控代码而不扩展 `DATABASE_ENUM_SPEC.md`；
8. 是否批准 Database Logical Design 目标版本 v2.0、API Master Specification 目标版本 v1.2；
9. 对已解绑身份是否允许经管理员批准绑定到另一系统账号，以及相应冷却期/人工复核策略；
10. 未知用户登录失败安全事件是否只进入脱敏遥测，还是另行提出安全事件持久化 DCR。

## 15. 提案结论

正式推荐方案 A：新增最小微信身份映射表，保留 `users` 为唯一用户身份，并用现有 `SEC-001` 的判别式 DTO 承载密码登录、首次绑定和微信自动登录。该方案能闭合 Approved Phase 6 与当前 Frozen API/数据库之间的实现缺口，但在项目负责人批准、正式 SSOT 更新、Frozen Consistency Review 和 GitHub 技术验收完成前不生效。
