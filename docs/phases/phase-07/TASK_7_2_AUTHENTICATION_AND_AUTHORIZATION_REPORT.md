---
document_name: Task 7.2 Authentication & Authorization Report
project: Violin ERP Lite
version: 1.1
status: Completed / Approved
owner: Project Manager
created_date: 2026-07-25
updated_date: 2026-07-25
related_phase: Phase 7
---

# Task 7.2：Authentication & Authorization Report

## 1. 修改范围

本 Task 收口统一认证、授权、数据范围和认证专用安全边界，不新增业务模块。

实现范围：

- 建立唯一服务端数据范围解析器；
- 让 Current User Resolver 与 Admin API Session Resolver 复用同一用户上下文转换；
- 删除基于 `administrator`、`purchaser` 等角色名称派生数据范围的逻辑；
- 将无权限或无法实现的记录范围固定为默认拒绝；
- 让 Workflow 使用当前有效仓库 ID，让 Outbound/Sales Return 使用当前有效店铺 ID；
- 保持 SEC-001—SEC-005 的路径、DTO、响应和错误码不变；
- 为认证限流和微信绑定幂等增加可替换 Adapter 接口；
- 增补数据范围、Repository、真实 PostgreSQL 与 HTTP 集成证据。

未修改 Database、Prisma Schema、Migration、Seed 行为、Mapping Audit、Frozen API、角色权限规格或业务规则。

## 2. 统一数据范围算法

唯一解析入口为 `resolveDataScopes()`；`createAuthenticatedUser()` 负责将数据库当前用户记录转换为统一认证用户，Current User Resolver 与 Session Resolver 均调用该转换。

正式输出只使用 Frozen `DataScopeType`：

- `all`
- `self_created`
- `business_related`
- `warehouse`
- `store`
- `manufacturer_derived`

Frozen SSOT 不存在 `none` 代码，因此无有效权限时返回空集合，并由服务端默认拒绝，不新增状态值。

### 2.1 优先级与合并

1. 当前有效权限为空时直接返回空集合，仓库或店铺关系不能单独产生访问权；
2. 可信服务端显式 `all` 授权优先级最高，并成为唯一汇总范围；
3. 多角色的有效权限、仓库和店铺关系先求并集并去重；
4. 存在当前有效权限时形成 `business_related`；
5. 存在正式创建类权限时形成 `self_created`；
6. 当前有效仓库关系形成 `warehouse`，并按 Frozen 规则形成 `manufacturer_derived`；
7. 当前有效店铺关系形成 `store`；
8. 输出按 Frozen 类型顺序稳定生成，不信任客户端范围、用户名或角色名。

### 2.2 冲突与默认行为

- `all` 只接受服务端可信显式输入，角色名称和权限数量都不自动产生 `all`；
- 重复权限、重复仓库和重复店铺不扩大范围；
- 无权限、未知权限或范围缺少目标 ID 时默认拒绝；
- Repository 未实现具体 `business_related` 关系时使用不可能命中的过滤条件，不回退为全量查询；
- 服务端仍逐请求读取当前用户、有效角色、有效权限及范围关系，SEC-005 摘要不替代业务授权。

## 3. 权限来源和优先级

| 来源 | 用途 | 是否可信 |
| --- | --- | --- |
| `users` 当前状态 | 身份启用、锁定、密码变更要求 | 是 |
| 当前有效 `user_roles` 与启用 `roles` | 角色摘要及权限关系入口 | 是 |
| 当前有效 `role_permissions` 与启用 `permissions` | 功能及操作权限 | 是 |
| `role_warehouses` | 仓库目标与访问级别 | 是 |
| `role_stores` | 店铺目标与访问级别 | 是 |
| 服务端可信显式范围 | 仅为 Frozen 类型预留的正式授权输入 | 是 |
| 用户名、角色名称、客户端参数或 SEC-005 缓存 | 不参与授权 | 否 |

管理员的功能权限来自 `role_permissions` 中的 244 个正式权限关系，不来自 `administrator` 字符串。管理员仓库、店铺和全范围仍须有正式授权来源，当前实现不会猜测或自动补齐。

## 4. 认证能力矩阵

| 能力 | 结论 | 主要证据 |
| --- | --- | --- |
| Admin 密码登录 | Completed | 严格 DTO、密码校验、Session 与审计；HTTP/PostgreSQL 通过 |
| 微信首次绑定 | Completed | 账号校验、唯一裁决、绑定/Session/审计同事务；HTTP/PostgreSQL 通过 |
| 微信自动登录 | Completed | 当前 AppID/OpenID 映射、用户与角色实时校验；HTTP/PostgreSQL 通过 |
| Refresh Rotation | Completed | 每次新建 Session、前驱条件认领；PostgreSQL 通过 |
| 并发刷新 | Completed | 同一旧 Refresh Token 仅一项成功；PostgreSQL 通过 |
| Replay Protection | Completed | 旧 Hash 重放撤销整个 Token Family；PostgreSQL 通过 |
| Logout | Completed | 当前 Token Family 幂等撤销，不解绑微信、不影响其他族 |
| Session Recovery | Completed | Access Token、Session、Token Family、用户状态和客户端类型联合校验 |
| Permission Loading | Completed | 当前有效 RBAC 实时读取，两个旧入口使用相同转换结果 |
| Authentication Audit | Completed | 已知用户登录、绑定、刷新、重放、登出及拒绝事件关联 Request ID |

## 5. 内存限流与幂等边界

`AuthenticationRateLimiter` 与 `AuthenticationIdempotencyStore` 保持当前单实例开发可用，但存储已分别抽象为：

- `AuthenticationRateLimitAdapter`
- `AuthenticationIdempotencyAdapter`

默认实现为：

- `InMemoryAuthenticationRateLimitAdapter`
- `InMemoryAuthenticationIdempotencyAdapter`

上述默认 Adapter 使用进程内 `Map`，不跨进程共享，进程重启后不保留，不描述为生产级分布式能力。后续可注入 Redis 或持久化 Adapter，但本 Task 未实现 Task 7.5 的通用持久化幂等，也未使用尚未批准的 DCR-004/API CR-004。

## 6. SSOT 一致性

- Database Logical Design v2.1 保持 Completed / Approved / Frozen；
- API Master Specification v1.3 保持 Completed / Approved / Frozen，正式接口总数保持 335；
- SEC-001—SEC-005 的路径、方法、DTO、响应、错误码和审计要求未改变；
- 角色保持 5 个，权限代码保持 244 个，数据范围类型保持 6 个；
- 无 `none`、并行登录路径、用户直接权限表或平行微信用户体系；
- DCR-004 与 API CR-004 继续为 Proposed / Pending Approval。

## 7. 测试结果

使用 Node v22.23.1 与 PostgreSQL v18.4 执行：

| 范围 | 结果 |
| --- | --- |
| 数据范围单元测试 | PASS：角色名不授权 `all`、空权限拒绝、仓库/店铺、多来源合并、显式 `all` |
| Repository 单元测试 | PASS：无范围默认拒绝、店铺目标过滤 |
| API Package | PASS：10 files / 59 tests |
| PostgreSQL Integration | PASS：5 files / 17 tests |
| SEC-001—SEC-005 HTTP Integration | PASS：2 tests |
| 最终项目质量门禁 | PASS：status、format、lint、typecheck、test、build、diff |

真实 PostgreSQL 验证覆盖密码登录、Session 恢复、两个旧入口结果一致、并发刷新、Replay、Logout、微信绑定、微信自动登录、事务回滚和用户停用后拒绝。

`prisma/seed.ts` 的历史 Prettier 问题已按本 Task 授权机械修复，Seed 行为未改变。

## 8. 剩余风险

1. 默认内存 Adapter 不支持多实例共享、重启恢复或分布式一致性；
2. 当前 Frozen 数据库没有通用显式 `all` 数据范围关系，实现只保留可信服务端输入，绝不从角色名猜测；
3. `business_related` 与 `manufacturer_derived` 的具体业务记录关系仍须由对应业务 Repository 按 Frozen 来源实现；未实现路径已默认拒绝；
4. PostgreSQL 驱动在并发事务测试中输出 pg 9.0 前的 Deprecation Warning，不影响测试结论，后续依赖升级时复核；
5. DCR-004/API CR-004 未批准，通用持久化幂等仍属于 Task 7.5 阻塞，不属于本 Task。

## 9. DCR / API Change Request 结论

本 Task 不需要新增 DCR 或 API Change Request。

未新增表、字段、关系、Check、Index、状态、API、DTO、错误码或响应字段。DCR-004 与 API CR-004 未被采用、批准或实现。

## 10. 批准结论

项目负责人已完成 Task 7.2 的 GitHub 技术验收。Task 7.2 的实现、测试和报告正式更新为 Completed / Approved。

Phase 7 保持 In Progress，Current Task 切换为 Task 7.3 Object Storage & File Lifecycle，状态为 In Progress。本次只同步治理状态，不实施 Storage 代码。

Task 7.3 首要处理事项为：

1. 扩展 Storage Adapter 正式契约；
2. 补齐 `read`、`stream`、`exists`、`metadata`；
3. 明确 Local 与生产 Storage Adapter 边界；
4. 明确 Storage Key、Checksum、Metadata 与 URL Strategy；
5. 明确对象生命周期、删除补偿和孤儿对象处理；
6. 不得提前实现 Attachment Framework；
7. 如需修改数据库或 Frozen API，必须先提出独立 DCR 或 API Change Request。
