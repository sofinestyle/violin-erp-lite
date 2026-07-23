---
document_name: API Change Request 002：微信登录与统一认证契约补齐
project: Violin ERP Lite
version: 1.0
status: Proposed / Pending Approval
owner: Project Manager
created_date: 2026-07-23
updated_date: 2026-07-23
related_phase: Phase 5 / Phase 6 / Phase 7
---

# API Change Request 002：微信登录与统一认证契约补齐

> 本文件是待项目负责人批准的 API 变更提案，不修改或替代当前 Frozen API Master Specification v1.1。

## 1. 变更原因与边界

`SEC-001 POST /api/v1/auth/login` 已冻结为统一登录入口，Approved Phase 6 要求同时支持 PC 密码登录、微信首次绑定和微信自动登录，但现有 API 未定义三种模式的 Request DTO。建议只补齐现有 `SEC-001` 至 `SEC-005`，不增加路径、编号、页面、权限代码或业务功能。

本提案依赖 `DATABASE_CHANGE_REQUEST_002.md` 获批并完成正式数据库同步；两项请求必须共同闭合后才能开发。

## 2. 通用约束

- `Content-Type` 为 `application/json; charset=utf-8`；
- `X-Request-ID` 按 Frozen 通用规则处理；
- `X-Client-Type` 只允许 `pc` 或 `wechat-mini-program`，仅用于兼容、审计和监控，不是授权依据；
- `loginType` 是唯一模式判别字段，服务端拒绝未知模式、未知字段、缺失字段和跨模式字段混用；
- AppID 和 App Secret 只来自服务端环境配置，客户端不得提交；
- 密码、微信 code、Session Key、App Secret、Access Token 和 Refresh Token 不得写入普通日志或审计快照。

## 3. SEC-001 完整 Request DTO

### 3.1 PC 密码登录

```json
{
  "loginType": "password",
  "username": "example",
  "password": "example"
}
```

`PasswordLoginRequestDto`：

| 字段 | 必填 | 规则 |
| --- | --- | --- |
| `loginType` | 是 | 固定为 `password` |
| `username` | 是 | string；去除首尾空白后 1—100 字符 |
| `password` | 是 | string；非空；最大 256 字符；不得 trim、回显、持久化或记录 |

该模式建议只接受 `X-Client-Type: pc`。不接收 `wechatCode`。

### 3.2 微信首次授权绑定

```json
{
  "loginType": "wechat-bind",
  "wechatCode": "temporary-code",
  "username": "example",
  "password": "example"
}
```

`WechatBindLoginRequestDto`：

| 字段 | 必填 | 规则 |
| --- | --- | --- |
| `loginType` | 是 | 固定为 `wechat-bind` |
| `wechatCode` | 是 | string；去除首尾空白后 1—256 字符；单次使用，不持久化 |
| `username` | 是 | 与密码登录相同 |
| `password` | 是 | 与密码登录相同 |

该模式只接受 `X-Client-Type: wechat-mini-program`。

服务端先以当前环境配置向微信服务端交换 code，在内存中取得 OpenID、可选 UnionID 和临时 Session Key；再验证系统账号密码、启用状态、锁定状态、`mustChangePassword` 和有效角色。验证成功后，在单一数据库事务内锁定目标用户及相关映射、检查唯一约束、创建当前有效绑定并写合法审计；事务提交成功后才签发令牌。

### 3.3 微信已绑定自动登录

```json
{
  "loginType": "wechat",
  "wechatCode": "temporary-code"
}
```

`WechatLoginRequestDto`：

| 字段 | 必填 | 规则 |
| --- | --- | --- |
| `loginType` | 是 | 固定为 `wechat` |
| `wechatCode` | 是 | 与首次绑定相同 |

该模式只接受 `X-Client-Type: wechat-mini-program`，不接收用户名或密码。服务端交换 code 后，按服务端 AppID 和 OpenID 查询当前有效映射，再加载同一 `users`、角色、权限和数据范围。未绑定、已解绑、映射停用、用户停用、用户锁定或无有效角色均不签发令牌。

### 3.4 必填与互斥矩阵

| `loginType` | `username` | `password` | `wechatCode` | 允许客户端 |
| --- | --- | --- | --- | --- |
| `password` | 必填 | 必填 | 禁止 | `pc` |
| `wechat-bind` | 必填 | 必填 | 必填 | `wechat-mini-program` |
| `wechat` | 禁止 | 禁止 | 必填 | `wechat-mini-program` |

不允许从字段是否存在推断模式，不允许同一请求尝试多个模式。

## 4. 首次绑定幂等与并发

- `wechat-bind` 必须携带 `Idempotency-Key`；同键同请求返回同一逻辑结果，同键不同请求返回 Frozen 通用幂等冲突；
- 同一 OpenID + AppID、同一用户的并发绑定依赖数据库当前有效绑定唯一约束，不能只依赖应用层查询；
- 同一幂等键已成功后可重放原成功响应；使用新键重复绑定同一身份返回 `AUTH_WECHAT_ALREADY_BOUND`；
- 微信身份已绑定其他用户时同样返回 `AUTH_WECHAT_ALREADY_BOUND`，不得泄露对方账号；
- 系统账号已有其他当前有效微信身份时返回 `AUTH_ACCOUNT_ALREADY_BOUND`；
- 唯一约束或事务竞争产生不可确定胜者时返回 `AUTH_BINDING_CONFLICT`；
- 绑定失败不产生部分映射、令牌或成功审计；令牌只在事务提交后签发。

## 5. SEC-001 成功响应

三种模式复用相同统一响应包装：

```json
{
  "success": true,
  "data": {
    "tokenType": "Bearer",
    "accessToken": "redacted-example",
    "accessTokenExpiresAt": "2026-07-23T12:00:00.000Z",
    "refreshToken": "redacted-example",
    "refreshTokenExpiresAt": "2026-08-22T12:00:00.000Z",
    "session": {
      "userId": "00000000-0000-0000-0000-000000000000",
      "username": "example",
      "displayName": "示例用户",
      "clientType": "pc",
      "wechatBound": false,
      "mustChangePassword": false,
      "roles": []
    }
  },
  "requestId": "00000000-0000-0000-0000-000000000000"
}
```

示例值不是真实账号或凭据。`roles` 仅为当前有效角色安全摘要；完整权限继续由 `SEC-005` 返回。响应不得包含 OpenID、UnionID、AppID、Session Key、密码哈希、锁定内部原因或权限计算内部信息。

## 6. 失败响应与错误码

失败继续使用 Frozen `success/error/requestId` 包装。先复用已有错误码，再提出必要新增码：

| 正式错误码 | HTTP | 状态 | 语义 |
| --- | ---: | --- | --- |
| `AUTH_CREDENTIAL_INVALID` | 401 | 已 Frozen，复用 | 用户指令所列 `AUTH_INVALID_CREDENTIALS` 的正式现有等价码；用户名或密码无效 |
| `AUTH_REFRESH_TOKEN_INVALID` | 401 | 已 Frozen，复用 | 用户指令所列 `AUTH_REFRESH_INVALID` 的正式现有等价码；刷新凭证无效或重放 |
| `AUTH_UNAUTHORIZED` | 401 | 现有实现码，建议纳入正式目录 | 未提供、格式错误或无效认证 |
| `AUTH_USER_DISABLED` | 403 | 提案 | 凭据有效但系统用户已停用 |
| `AUTH_USER_LOCKED` | 429 | 提案 | 用户临时锁定；适用时返回安全的 `Retry-After` |
| `AUTH_PASSWORD_CHANGE_REQUIRED` | 403 | 提案，待确认 | `mustChangePassword = true` 时拒绝微信首次绑定 |
| `AUTH_WECHAT_CODE_INVALID` | 401 | 提案 | 微信 code 无效、过期、已使用或交换失败 |
| `AUTH_WECHAT_NOT_BOUND` | 401 | 提案 | 当前微信身份没有有效绑定 |
| `AUTH_WECHAT_ALREADY_BOUND` | 409 | 提案 | 当前微信身份已存在有效绑定 |
| `AUTH_ACCOUNT_ALREADY_BOUND` | 409 | 提案 | 系统用户已有其他有效微信绑定 |
| `AUTH_BINDING_CONFLICT` | 409 | 提案 | 并发绑定或绑定版本冲突 |
| `SECURITY_RATE_LIMIT_EXCEEDED` | 429 | 已 Frozen，复用 | 登录或绑定触发限流 |
| `SYSTEM_SERVICE_UNAVAILABLE` | 503 | 现有通用边界，复用 | 数据库或必要上游服务不可用 |

错误消息不得区分用户名不存在与密码错误，不得暴露 OpenID、UnionID、另一账号、微信服务原始响应、SQL、堆栈或配置值。

## 7. SEC-002 刷新兼容调整

建议 `RefreshTokenRequestDto`：

```json
{
  "refreshToken": "redacted-example"
}
```

- PC 与微信使用同一 DTO、令牌轮换、过期、重放和撤销规则；
- 请求仍携带真实 `X-Client-Type`，但不能据此改变用户或权限；
- 刷新时重新校验用户启用/锁定状态、当前有效角色及微信绑定状态；微信客户端绑定失效时拒绝刷新；
- 成功返回与 SEC-001 相同的令牌字段和安全会话摘要；
- 旧 Refresh Token 在轮换后失效；无效或重放统一返回 `AUTH_REFRESH_TOKEN_INVALID`。

## 8. SEC-003 登出兼容调整

建议 `LogoutRequestDto` 包含必填 `refreshToken`，并要求当前 Access Token：

```json
{
  "refreshToken": "redacted-example"
}
```

- 只撤销当前客户端认证上下文或当前令牌族；
- 操作幂等，重复登出返回同一逻辑成功；
- 不删除、解绑或停用微信身份，不影响其他合法客户端会话；
- 日志不记录令牌原值。

具体令牌族持久化机制不是本提案新增的业务数据库对象；若实现无法满足正式撤销语义，须另行 DCR。

## 9. SEC-004 当前会话兼容调整

建议响应在既有安全用户摘要中明确：

- `userId`、`username`、`displayName`；
- `clientType: "pc" | "wechat-mini-program"`；
- `wechatBound: boolean`；
- `mustChangePassword`；
- 当前有效角色安全摘要；
- 会话和用户是否仍有效的非敏感状态。

不得返回 OpenID、UnionID、AppID、微信 code、Session Key、Token、密码哈希或其他客户端会话。

## 10. SEC-005 当前权限兼容调整

`SEC-005` 不因微信身份新增权限字段或权限来源。其结果仍只来自：

- `users` 当前有效状态；
- `user_roles` 与 `roles`；
- `role_permissions` 与 `permissions`；
- `role_warehouses`、`role_stores` 及 Frozen `access_level`。

微信身份只决定能否映射到 `users.id`，不能授予、扩展或缓存授权。

## 11. 绑定、解绑和查询接口评估

本次**不建议新增 API**：

- Approved Phase 4 / Phase 6 只要求首次绑定和后续自动登录，均可由 `SEC-001` 完整承载；
- 当前没有 Approved 的绑定管理、解绑或重新绑定页面，也没有对应权限代码；
- 新增 `/wechat-login` 或 `/bind-wechat` 会制造平行认证路径；
- `SEC-004` 的 `wechatBound` 足以提供当前会话非敏感摘要。

若项目负责人要求用户自助解绑、管理员强制解绑或绑定历史查询，必须先明确 Approved 页面、操作者、权限、再认证、冷却期和审计规则，再提交新的有编号 API Change Request；本文件不占用编号。

## 12. 安全日志

- 已知用户的登录成功/失败、绑定、自动登录、刷新、登出、停用拒绝和锁定拒绝按 Frozen 规则记录 Request ID、客户端类型、用户/对象、动作、结果和脱敏原因；
- 微信身份只记录不可逆摘要或末尾脱敏值，不记录 OpenID/UnionID 原文；
- 密码、密码哈希、微信 code、Session Key、App Secret 和 Token 永不记录；
- 无法合法映射现有 `audit_logs.object_id` 的未知身份失败只进入脱敏安全遥测，不伪造 UUID；
- 绑定审计失败时绑定事务整体失败；普通失败遥测不得反向泄露认证结果。

## 13. 安全与兼容性

- 所有授权仍在服务端执行，前端 Context 和按钮显示不能替代；
- 微信 code 只能交换一次，服务端校验环境 AppID 和微信响应；
- 用户停用后登录、刷新和旧会话请求均拒绝；
- `mustChangePassword` 的微信绑定行为按待批准决定执行；
- PC 路径不变，但正式客户端需增加 `loginType`；Mini Program 从当前空 Context 接入真实 API；
- 不为兼容旧的未完成实现接受无判别字段请求，避免长期歧义。

## 14. API 数量与版本建议

- 不新增、删除、重编号或改路径；
- `SEC-001` 至 `SEC-005` 数量仍为 5；
- API Master Specification 正式总数建议保持 335；
- 因 Request/Response DTO、错误语义和兼容边界得到实质补齐，建议批准后将 API Master Specification v1.1 升级为 v1.2 并重新冻结；
- 本轮不修改正式数量或版本。

## 15. 依赖与批准条件

本请求只有在以下条件全部满足后才能生效：

1. Authentication SSOT Completion 001 获项目负责人批准；
2. Database Change Request 002 获批准并更新数据库 Frozen SSOT；
3. 本 API Change Request 获批准；
4. Phase 5 Task 5.5、Phase 6 Task 6.3 和 API Master Specification 完成同步；
5. Frozen Consistency Review 与 GitHub 技术验收通过。

## 16. 待确认事项

1. 是否批准三种 `loginType` 和严格互斥 DTO；
2. 是否批准 `wechat-bind` 强制 `Idempotency-Key` 并在数据库事务提交后签发令牌；
3. 是否批准 `mustChangePassword = true` 时拒绝微信绑定；
4. 是否批准不新增绑定、解绑或查询 API；
5. 是否批准 SEC-003 的当前客户端/令牌族登出边界；
6. 是否批准新增错误码及现有实现 `AUTH_UNAUTHORIZED` 的正式纳入；
7. 是否批准 API Master Specification v1.2、总数保持 335。

## 17. 提案结论

建议保留唯一 `SEC-001`，以三种 `loginType` 形成清晰的判别式联合契约；`SEC-002` 至 `SEC-005` 继续作为双端统一会话与权限链路。本提案不建议新增 API，总数保持 335，但在正式批准和重新冻结前不得开发。
