---
document_name: API Master Specification
project: Violin ERP Lite
version: 1.2
status: Completed / Approved / Frozen
owner: Project Manager
created_date: 2026-07-19
updated_date: 2026-07-23
related_phase: Phase 5
---

# API Master Specification

## 1. 文档定位

本文件是 Violin ERP Lite Phase 5 正式 API 规范总入口，统一 Task 5.1 至 Task 5.5 的接口编号、Header、请求、响应、分页、排序、筛选、命名、版本、错误码、权限、日志、导入、附件和安全规则。

API Master Specification v1.2 为 Completed / Approved / Frozen，正式接口总数保持 335。API Change Request 002 已正式批准，在不新增路径、编号或业务功能的前提下补齐 `SEC-001` 至 `SEC-005` 的统一认证契约。API Master Specification v1.1 及其 335 个接口保留为历史冻结基线。

## 2. 正式文档入口

1. [Task 5.1 API 总体规范与安全规则](../phases/phase-05/TASK_5_1_API_DESIGN_PRINCIPLES.md)
2. [Task 5.2 基础资料与采购 API](../phases/phase-05/TASK_5_2_MASTER_DATA_AND_PURCHASE_API.md)
3. [Task 5.3 生产、质量验收与库存 API](../phases/phase-05/TASK_5_3_PRODUCTION_QUALITY_INVENTORY_API.md)
4. [Task 5.4 出入库与跨境业务 API](../phases/phase-05/TASK_5_4_INBOUND_OUTBOUND_CROSS_BORDER_API.md)
5. [Task 5.5 导入、附件、日志、安全与 API 最终收口](../phases/phase-05/TASK_5_5_IMPORT_LOG_SECURITY_API_FINAL.md)
6. [Phase 5 Final Consistency Review](../phases/phase-05/PHASE_5_FINAL_CONSISTENCY_REVIEW.md)
7. [API Change Request 001：补齐库存盘点、销售退货、报损 API](../00-governance/API_CHANGE_REQUEST_001.md)
8. 本文件第 16 节：API Coverage Completion 002 用户、角色与权限管理 API 补齐
9. 本文件第 17 节：API Coverage Completion 003 角色数据范围维护 API 补齐
10. 本文件第 18 节：API Coverage Completion 004 `CBR-003` 运输方式字段补齐
11. [API Change Request 002：微信登录与统一认证契约补齐](../00-governance/API_CHANGE_REQUEST_002.md)
12. 本文件第 20 节：API Master Specification v1.2 统一认证正式契约

发生冲突时，Frozen 业务规则、Frozen Database Logical Design v2.0 和 Frozen `ROLE_PERMISSION_SPEC.md` 优先；Task 5.1 提供通用规则，Task 5.2 至 Task 5.5 提供模块契约，本文件提供统一索引与最终规范。

## 3. 接口编号与数量

| 来源 | 模块与编号 | 数量 | 状态 |
| --- | --- | ---: | --- |
| Task 5.2 | 基础资料 `MD-*` | 74 | Completed / Approved |
| Task 5.2 | 采购 `PUR-*` | 29 | Completed / Approved |
| Task 5.3 | 生产 `PRO-*` | 29 | Completed / Approved |
| Task 5.3 | 质量验收 `INS-*` | 10 | Completed / Approved |
| Task 5.3 | 库存 `INV-*` | 26 | Completed / Approved |
| Task 5.4 | 入库 `INB-*` | 18 | Completed / Approved |
| Task 5.4 | 出库 `OUT-*` | 17 | Completed / Approved |
| Task 5.4 | 调拨 `TRF-*` | 15 | Completed / Approved |
| Task 5.4 | 跨境 `CBR-*` | 22 | Completed / Approved |
| Task 5.5 | 导入 `IMP-*` | 15 | Completed / Approved |
| Task 5.5 | 附件 `ATT-*` | 8 | Completed / Approved |
| Task 5.5 | 日志 `LOG-*` | 4 | Completed / Approved |
| Task 5.5 | 安全 `SEC-*` | 5 | Completed / Approved |
| API Coverage Completion 002 | 用户、角色与权限管理 `SEC-006`—`SEC-021` | 16 | Completed / Approved |
| API Coverage Completion 003 | 角色仓库与店铺数据范围 `SEC-022`—`SEC-025` | 4 | Completed / Approved |
| API CR-001 | 库存盘点 `STC-*` | 17 | Completed / Approved |
| API CR-001 | 销售退货 `SRT-*` | 13 | Completed / Approved |
| API CR-001 | 报损 `DMG-*` | 13 | Completed / Approved |
| 合计 | API Master Specification v1.2 正式接口 | 335 | Completed / Approved / Frozen |

逐模块复核结果为 `74 + 29 + 29 + 10 + 26 + 18 + 17 + 15 + 22 + 15 + 8 + 4 + 5 + 16 + 4 + 17 + 13 + 13 = 335`。接口编号唯一且稳定，不得复用、改义或因排序调整重新编号。Task 5.4 的海外导入只读投影属于 `CBR-018` 至 `CBR-020`，不在 Task 5.5 重复计数。`STC-*`、`SRT-*` 和 `DMG-*` 的完整正式契约以 API Change Request 001 及 Task 5.4 补充章节为准；`SEC-006` 至 `SEC-021` 的完整正式契约以本文件第 16 节为准；`SEC-022` 至 `SEC-025` 的完整正式契约以本文件第 17 节为准；`CBR-003` 的 `transportMethod` 字段补充契约以本文件第 18 节为准。

## 4. Version 与 Naming

- 第一版基础路径统一为 `/api/v1`；URL 中主版本是唯一 API 版本依据；
- 资源路径使用小写英文复数名词，多个单词以短横线连接；
- JSON 字段使用 lowerCamelCase；数据库映射字段保持 Frozen snake_case；
- ID 使用 UUID 字符串；日期使用 `YYYY-MM-DD`；日期时间使用带时区 ISO 8601；
- 数量、金额、单价和比例使用十进制定点字符串；
- 状态动作使用专用 `POST` 路径，普通更新不得直接覆盖状态；
- 不兼容的路径、字段、类型、错误码或语义变化必须升级主版本。

## 5. Header

| Header | 使用规则 |
| --- | --- |
| `Authorization` | 非公开接口必需；不得写入日志或错误详情 |
| `Content-Type` | JSON 为 `application/json; charset=utf-8`；文件为受控 multipart |
| `Accept` | 默认 `application/json`；下载按允许文件类型 |
| `X-Request-ID` | 客户端可提供合法值，否则服务端生成；贯穿响应与日志 |
| `Idempotency-Key` | 创建、状态动作、库存事务、导入执行、附件上传、导出等高风险写操作必需 |
| `X-Client-Type` | `pc` 或 `wechat-mini-program`；只用于兼容、审计和监控，不作为授权依据 |

禁止用 Header 覆盖 URL 版本、用户、角色、权限、仓库/店铺范围或目标状态。

## 6. Request

- Path、Query、Header、JSON 和文件输入均执行类型、长度、范围、白名单和安全校验；
- 客户端不得提交服务端生成的 ID、编号、汇总、库存余额、审计字段或任意目标状态；
- PATCH 中缺失字段表示不修改，显式 `null` 仅允许清空正式可空字段；
- 所有关联 ID 必须校验存在性、启用状态、主从归属、业务状态和当前用户数据范围；
- 文件请求必须额外校验扩展名、MIME、内容特征、大小、模板和恶意内容；
- 请求字段不得绕过或扩展 Frozen 数据库对象、关系和状态。

## 7. Response

成功响应统一为：

```json
{"success":true,"data":{},"meta":{},"requestId":"req-example"}
```

失败响应统一为：

```json
{"success":false,"error":{"code":"VALIDATION_INVALID_FIELD","message":"请求数据校验失败","details":[]},"requestId":"req-example"}
```

除 `204 No Content` 外均使用统一包装。只有 `SEC-001` 与 `SEC-002` 可在成功响应中返回本次新签发的 Access Token 和 Refresh Token；其他响应不得暴露密码、Token、Cookie、密钥、SQL、数据库结构、内部路径、堆栈或未脱敏敏感值。

## 8. Pagination、Sorting 与 Filter

- `page` 从 1 开始，默认 1；`pageSize` 默认 20、最大 100；
- `meta` 返回 `page`、`pageSize`、`total`、`totalPages`，只统计授权数据；
- `sortBy` 必须属于接口白名单，`sortOrder` 只允许 `asc` 或 `desc`；
- 关键词统一为 `keyword`；范围条件使用 `From/To/Min/Max` 后缀；
- 状态筛选只允许 Approved/Frozen 正式值；
- 仓库、店铺、厂家和记录范围在查询与聚合前完成权限过滤；
- 空字符串、`null` 与未提供参数的语义不得混用。

## 9. Permission 与状态校验

所有 API 必须组合校验身份认证、功能权限、操作权限、角色有效性、仓库范围、店铺范围、记录级范围、字段权限、状态权限和职责分离。客户端按钮隐藏或 `SEC-005` 权限摘要不能替代服务端逐请求验证。

所有状态变化必须校验当前状态、目标动作、业务前置、版本与下游事实，并原子写状态历史、审批记录和审计日志。不得创造新状态，不得用页面提示或导入结果替代数据库状态。

## 10. ErrorCode

错误码统一采用大写英文与下划线，分类如下：

| 分类 | 范围 |
| --- | --- |
| `AUTH_*` | 登录、凭证、Token 和 Session |
| `PERMISSION_*` | 功能、操作、数据及字段权限 |
| `VALIDATION_*` | 格式、必填、类型、精度及业务校验 |
| `RESOURCE_*` | 资源不存在、停用或不可用 |
| `STATE_*` | 当前状态不允许动作或下游阻塞 |
| `CONFLICT_*` | 并发、幂等、版本、唯一和重复执行 |
| `INVENTORY_*` | 库存不足、负库存和库存事务 |
| `IMPORT_*` | 文件、模板、校验、重复和执行 |
| `ATTACHMENT_*` | 附件安全与历史保护 |
| `SECURITY_*` | 重放、IP 策略、限流和安全拒绝 |
| `SYSTEM_*` | 未预期错误与暂时不可用 |

错误码含义发布后保持稳定；字段级详情不得包含内部实现或完整敏感值。

## 11. Idempotency 与并发

- 同一认证主体、方法、规范路径和幂等键的相同请求返回首次结果；同键不同请求返回 409；
- 正式单据更新使用现有 `versionNo`，无版本字段对象使用 `updatedAt`、当前状态、唯一约束和事务；
- 库存事务、导入执行和跨仓动作必须在原子事务内完成余额、流水、来源状态和审计；
- 禁止重复库存流水、重复导入成功行、重复附件关联和重复审批；
- 幂等、锁、隔离级别和持久化介质的技术选择后置，不新增数据库字段或表。

## 12. Import

导入统一使用 `IMP-001` 至 `IMP-015`，覆盖任务创建、查询、详情、状态、取消、模板与版本、模板校验、数据校验、执行、失败行重试、结果、历史和导出。

导入必须执行字段、数据、唯一、外键、状态和权限校验。海外仓库存只能由 Task 5.5 正式 Excel 导入结果形成；执行必须合法匹配跨境发货和在途库存，原子减少在途仓、增加海外仓、追加流水并保留来源追溯。不得建立历史余额快照或手工海外收货。

## 13. Attachment

附件统一使用 `ATT-001` 至 `ATT-008`，覆盖上传、查询、详情、下载、关联、解除、删除和生命周期。采购、生产、验收、入库、出库、调拨、跨境均复用 `attachments` 和 `attachment_links`。

统一使用 `attachmentId`、`objectType`、`objectId`、适用的 `objectItemId`、只读派生 `version`、实时计算 `permission` 和抽象 `storageStrategy`。文件本体不写数据库，响应不暴露存储路径或凭证。正式历史附件不得破坏性删除。

## 14. Log

Audit Log、Operation Log、Import Log、Export Log、Login Log 和 Security Log 统一通过 `LOG-001` 至 `LOG-004` 查询、链路追踪和导出，正式持久化复用 `audit_logs` 及适用导入对象。

统一投影 `requestId`、`traceId`、`correlationId`、`operator`、`ip`、`userAgent`、`timestamp`、`logLevel`、`action`、`object`、`objectId`、`result`。不存在独立 Frozen 字段的值必须按 Task 5.5 规则派生，不得伪造历史事实。日志只追加，不提供修改或删除 API。

## 15. Security

`SEC-001` 至 `SEC-005` 定义登录、刷新、登出、当前会话和当前权限能力；`SEC-006` 至 `SEC-021` 定义用户、角色、角色权限、用户角色和权限目录管理能力；`SEC-022` 至 `SEC-025` 定义角色仓库与店铺数据范围查询及整体替换能力。Authentication、Authorization、Token、Refresh Token、Session、Permission Validation、Replay Protection、Idempotency、Rate Limit、IP White List 和 Header 安全规则适用于 v1.2 的全部 335 个 Frozen 接口。

认证持久化只使用 Frozen Database Logical Design v2.0 的 `users`、`user_wechat_identities` 和 `auth_sessions`；不得新增平行用户、微信映射或会话来源。网关、限流器、IP 配置及安全遥测的技术实现留待后续阶段。生产环境必须使用 HTTPS，并执行最小权限、数据脱敏、文件安全、输入白名单和安全错误处理。

## 16. API Coverage Completion 002：用户、角色与权限管理

### 16.1 补齐范围与边界

本节补齐 Phase 6 已批准用户管理、角色管理与权限分配页面行为缺少正式 API 覆盖的问题。全部接口只映射 Frozen `users`、`roles`、`permissions`、`user_roles` 和 `role_permissions`，复用既有认证、RBAC 和审计能力，不新增业务模块、角色、权限代码、数据库表、字段、关系或状态。

角色代码只允许使用 `ROLE_PERMISSION_SPEC.md` 已冻结的 `administrator`、`purchaser`、`warehouse_staff`、`sales_staff` 和 `company_principal`。权限代码只允许使用该文档已冻结的 244 个 `PermissionCode`。任何请求均不得创建其他角色代码、权限代码或用户直接权限关系。

### 16.2 正式接口目录

| 编号 | 接口 | 方法与路径 | 正式权限 | 分页 | 审计要求 |
| --- | --- | --- | --- | --- | --- |
| `SEC-006` | 用户列表 | `GET /api/v1/users` | `security.user.read` | 是 | 异常、越权和敏感查询记录 |
| `SEC-007` | 用户详情 | `GET /api/v1/users/{id}` | `security.user.read` | 否 | 敏感查看记录 |
| `SEC-008` | 创建用户 | `POST /api/v1/users` | `security.user.create`、`security.role.assign` | 否 | 必记 |
| `SEC-009` | 更新用户 | `PUT /api/v1/users/{id}` | `security.user.update` | 否 | 必记 |
| `SEC-010` | 更新用户状态 | `PATCH /api/v1/users/{id}/status` | 启用使用 `security.user.enable`；停用使用 `security.user.disable` | 否 | 高风险，必记 |
| `SEC-011` | 重置用户密码 | `PATCH /api/v1/users/{id}/password` | `security.user.update` | 否 | 高风险，必记且不得记录密码 |
| `SEC-012` | 角色列表 | `GET /api/v1/roles` | `security.role.read` | 是 | 异常和越权记录 |
| `SEC-013` | 角色详情 | `GET /api/v1/roles/{id}` | `security.role.read` | 否 | 系统角色敏感查看记录 |
| `SEC-014` | 创建正式角色记录 | `POST /api/v1/roles` | `security.role.create` | 否 | 必记 |
| `SEC-015` | 更新角色 | `PUT /api/v1/roles/{id}` | `security.role.update` | 否 | 必记 |
| `SEC-016` | 更新角色状态 | `PATCH /api/v1/roles/{id}/status` | 启用使用 `security.role.enable`；停用使用 `security.role.disable` | 否 | 高风险，必记 |
| `SEC-017` | 角色权限列表 | `GET /api/v1/roles/{id}/permissions` | `security.permission.read`、`security.role.read` | 否 | 敏感查看记录 |
| `SEC-018` | 替换角色权限 | `PUT /api/v1/roles/{id}/permissions` | `security.permission.assign`、`security.role.assign` | 否 | 高风险，必记 |
| `SEC-019` | 用户角色列表 | `GET /api/v1/users/{id}/roles` | `security.user.read`、`security.role.read` | 否 | 敏感查看记录 |
| `SEC-020` | 替换用户角色 | `PUT /api/v1/users/{id}/roles` | `security.role.assign`、`security.user.update` | 否 | 高风险，必记 |
| `SEC-021` | 权限目录列表 | `GET /api/v1/permissions` | `security.permission.read` | 是 | 异常、越权和敏感查询记录 |

写接口均要求 `X-Request-ID`。`SEC-008`、`SEC-010`、`SEC-011`、`SEC-014`、`SEC-016`、`SEC-018` 和 `SEC-020` 必须携带 `Idempotency-Key`；`SEC-009` 和 `SEC-015` 使用 `updatedAt` 执行并发校验。路径中的 `{id}` 均为 UUID。

### 16.3 查询、分页与筛选 DTO

`SEC-006 UserListQueryDto`：

- `page`、`pageSize`、`keyword`、`sortBy`、`sortOrder` 遵循第 8 节；
- `isActive` 为可选布尔值；
- `roleId` 为可选 UUID；
- `status` 仅允许使用 Frozen 数据中已存在且服务端认可的账号状态代码，不得由客户端创造新状态；
- `keyword` 只搜索 `username`、`displayName`、经授权的 `email` 和 `phone`，不得搜索密码哈希。

用户列表排序白名单为 `username`、`displayName`、`createdAt`、`updatedAt`、`lastLoginAt`，默认 `updatedAt desc, id desc`。

`SEC-012 RoleListQueryDto`：

- `page`、`pageSize`、`keyword`、`sortBy`、`sortOrder` 遵循第 8 节；
- `isActive`、`isSystemRole` 为可选布尔值；
- `keyword` 搜索 `roleCode`、`roleName` 和 `description`。

角色列表排序白名单为 `roleCode`、`roleName`、`createdAt`、`updatedAt`，默认 `updatedAt desc, id desc`。

`SEC-021 PermissionListQueryDto`：

- `page`、`pageSize`、`keyword`、`sortBy`、`sortOrder` 遵循第 8 节；
- `moduleCode`、`actionCode`、`isActive` 为可选筛选；
- `keyword` 搜索 `permissionCode`、`permissionName` 和 `description`。

权限列表排序白名单为 `permissionCode`、`permissionName`、`moduleCode`、`actionCode`，默认 `moduleCode asc, actionCode asc, id asc`。

三个列表均返回：

```json
{
  "success": true,
  "data": {"items": []},
  "meta": {"page": 1, "pageSize": 20, "total": 0, "totalPages": 0},
  "requestId": "req-example"
}
```

### 16.4 用户 Request DTO

`SEC-008 CreateUserDto`：

| 字段 | 必填 | 校验与映射 |
| --- | --- | --- |
| `username` | 是 | `STRING(100)`；去除首尾空白后非空；按不区分大小写原则唯一 |
| `displayName` | 是 | `STRING(200)`；去除首尾空白后非空 |
| `password` | 是 | 只作为密码哈希输入；满足正式密码安全策略；不得持久化或记录明文 |
| `email` | 否 | 合法邮箱，最长 254；空值使用 `null` |
| `phone` | 否 | 最长 50；空值使用 `null` |
| `mustChangePassword` | 是 | 布尔值 |
| `roleAssignments` | 是 | 至少一项 `UserRoleAssignmentDto`；仅可引用启用的五个正式角色 |

`SEC-009 UpdateUserDto`：

| 字段 | 必填 | 校验与映射 |
| --- | --- | --- |
| `username` | 是 | 与创建相同的长度和唯一性规则 |
| `displayName` | 是 | 与创建相同 |
| `email` | 否 | 合法邮箱或 `null` |
| `phone` | 否 | 最长 50 或 `null` |
| `updatedAt` | 是 | 当前详情返回的 ISO 8601 时间；不一致返回并发冲突 |

普通更新不得接收 `password`、`passwordHash`、`status`、`isActive`、锁定字段、角色、权限或审计字段。

`SEC-010 UpdateUserStatusDto`：

| 字段 | 必填 | 校验与映射 |
| --- | --- | --- |
| `isActive` | 是 | `true` 表示启用，`false` 表示停用；服务端同步维护 Frozen 停用字段和既有账号状态语义 |
| `reason` | 停用时是 | 非空安全文本；启用时可选 |
| `updatedAt` | 是 | 用于并发校验 |

服务端必须阻止用户通过本接口自助提权或无保护地停用最后一个必要管理身份。停用后历史业务和审计记录保留，旧会话在下一次请求失效。

`SEC-011 ResetUserPasswordDto`：

| 字段 | 必填 | 校验与映射 |
| --- | --- | --- |
| `newPassword` | 是 | 满足正式密码安全策略；只写入哈希结果 |
| `mustChangePassword` | 是 | 布尔值 |
| `updatedAt` | 是 | 用于并发校验 |

响应和审计均不得包含密码、密码哈希、Token、Cookie 或密码策略内部细节。

### 16.5 角色、权限与关联 Request DTO

`SEC-014 CreateRoleDto`：

| 字段 | 必填 | 校验与映射 |
| --- | --- | --- |
| `roleCode` | 是 | 只能是五个 Frozen `RoleCode` 之一，且数据库中尚不存在 |
| `roleName` | 是 | `STRING(200)`，全局唯一 |
| `description` | 否 | 安全文本或 `null` |
| `isSystemRole` | 是 | 布尔值；系统角色标识须受服务端保护 |

本接口只允许建立尚未落库的正式角色记录，不授权创建第六种角色、别名角色或新角色代码。

`SEC-015 UpdateRoleDto`：

| 字段 | 必填 | 校验与映射 |
| --- | --- | --- |
| `roleName` | 是 | `STRING(200)`，全局唯一 |
| `description` | 否 | 安全文本或 `null` |
| `updatedAt` | 是 | 用于并发校验 |

`roleCode` 和 `isSystemRole` 不得通过普通更新修改。系统角色受保护，任何修改均须再次校验操作者权限和受影响范围。

`SEC-016 UpdateRoleStatusDto` 与用户状态 DTO 相同，包含 `isActive`、停用时必填的 `reason` 和 `updatedAt`。停用角色不得删除历史关系或历史审计，不得破坏最后一个必要管理身份。

`SEC-018 ReplaceRolePermissionsDto`：

| 字段 | 必填 | 校验与映射 |
| --- | --- | --- |
| `permissionIds` | 是 | UUID 数组、不得重复；每项必须是启用且属于 Frozen 244 个权限代码的现有权限 |
| `updatedAt` | 是 | 当前角色的并发时间戳 |
| `reason` | 是 | 权限调整原因 |

本接口以提交集合原子替换 `role_permissions`，记录 `grantedBy`、`grantedAt` 及完整差异摘要。操作者不得授予自身不具备或无权管理的权限，不得通过空集合或权限缩减破坏必要管理身份。

`UserRoleAssignmentDto`：

| 字段 | 必填 | 校验与映射 |
| --- | --- | --- |
| `roleId` | 是 | 已存在且启用的正式角色 UUID |
| `effectiveFrom` | 是 | ISO 8601 时间 |
| `effectiveTo` | 否 | ISO 8601 时间或 `null`；不得早于 `effectiveFrom` |

`SEC-020 ReplaceUserRolesDto` 包含非空、`roleId` 不重复的 `roleAssignments`、用户 `updatedAt` 和必填 `reason`。服务端原子替换 `user_roles`，记录 `assignedBy`、`assignedAt` 和差异摘要，并禁止操作者通过修改自身角色实现提权。

### 16.6 Response DTO

`UserResponseDto` 只返回：

- `id`、`username`、`displayName`、`email`、`phone`；
- `status`、`mustChangePassword`、`lastLoginAt`、`failedLoginCount`、`lockedUntil`；
- `isActive`、`createdAt`、`createdBy`、`updatedAt`、`updatedBy`、`disabledAt`、`disabledBy`；
- 当前有效角色的安全摘要 `roles`，以及按当前权限允许返回的数据范围摘要。

任何用户响应均不得返回 `passwordHash`、密码、Token、Cookie、密钥或完整权限计算内部信息。

`RoleResponseDto` 只返回：

- `id`、`roleCode`、`roleName`、`description`、`isSystemRole`、`isActive`；
- `userCount` 和 `permissionCount` 两个服务端派生只读统计；
- `createdAt`、`createdBy`、`updatedAt`、`updatedBy`、`disabledAt`、`disabledBy`。

`PermissionResponseDto` 只返回 `id`、`permissionCode`、`permissionName`、`moduleCode`、`actionCode`、`description` 和 `isActive` 及通用审计时间字段。

`SEC-017` 返回 `RoleResponseDto` 安全摘要及完整 `PermissionResponseDto[]`；`SEC-019` 返回 `UserResponseDto` 安全摘要及带 `effectiveFrom`、`effectiveTo`、`assignedBy`、`assignedAt` 的角色分配数组。关联查询不返回数据库内部关系 ID 之外的未批准事实。

创建、更新、状态和密码重置成功响应使用第 7 节统一包装。密码重置响应只返回更新后的用户安全摘要，不返回任何凭据。权限和角色替换成功响应返回服务端重新读取的正式集合及 `updatedAt`。

### 16.7 Validation、Permission 与安全规则

1. 所有接口先执行认证，再执行本节列明的正式 `PermissionCode`；前端隐藏不能替代后端校验。
2. 角色代码、权限代码和角色权限映射以 Frozen `ROLE_PERMISSION_SPEC.md` 为唯一来源；不接受客户端自定义代码。
3. 用户名、角色代码和角色名称执行 Frozen 唯一性规则；冲突不得泄露无权资源的详细信息。
4. 用户、角色和权限引用必须存在、启用并处于操作者授权范围。
5. 用户角色和角色权限替换必须在单一事务中完成；失败不得留下部分关系或虚假审计成功。
6. 用户不能修改自身角色、权限、数据范围或状态来提升权限；普通管理员不得破坏系统角色。
7. 用户和角色不提供删除 API；停用保留历史关系、业务记录和审计记录。
8. 状态、密码、角色和权限写入均重新校验最新 `updatedAt`、当前状态及必要管理身份保护。
9. 密码仅作为受控请求输入并立即哈希；日志、错误、响应、审计快照和 Request ID 上下文均不得保存原值。
10. 所有列表先应用授权范围再分页和统计，不得通过总数、筛选、排序或错误推断无权对象。

### 16.8 Error Code

| 错误码 | HTTP | 含义 |
| --- | ---: | --- |
| `RESOURCE_USER_NOT_FOUND` | 404 | 用户不存在或不可见 |
| `RESOURCE_ROLE_NOT_FOUND` | 404 | 角色不存在或不可见 |
| `RESOURCE_PERMISSION_NOT_FOUND` | 404 | 权限不存在、停用或不可见 |
| `CONFLICT_USER_USERNAME_DUPLICATE` | 409 | 用户名按不区分大小写原则重复 |
| `CONFLICT_ROLE_CODE_DUPLICATE` | 409 | 正式角色代码已存在 |
| `CONFLICT_ROLE_NAME_DUPLICATE` | 409 | 角色名称已存在 |
| `CONFLICT_SECURITY_RESOURCE_MODIFIED` | 409 | 用户、角色或授权集合已被其他请求修改 |
| `VALIDATION_ROLE_CODE_NOT_APPROVED` | 422 | 角色代码不属于五个 Frozen 正式代码 |
| `VALIDATION_ROLE_ASSIGNMENT_INVALID` | 422 | 用户角色集合为空、重复、失效或有效期不合法 |
| `VALIDATION_PERMISSION_ASSIGNMENT_INVALID` | 422 | 角色权限集合包含重复、失效或非 Frozen 权限 |
| `VALIDATION_PASSWORD_POLICY_FAILED` | 422 | 密码未满足正式安全策略；响应不披露内部实现 |
| `STATE_USER_STATUS_ACTION_NOT_ALLOWED` | 409 | 当前用户状态或管理身份保护不允许启停 |
| `STATE_ROLE_STATUS_ACTION_NOT_ALLOWED` | 409 | 当前角色状态、系统角色保护或引用不允许启停 |
| `PERMISSION_SELF_ELEVATION_DENIED` | 403 | 用户尝试修改自身角色、权限、范围或状态实现提权 |
| `PERMISSION_SYSTEM_ROLE_PROTECTED` | 403 | 当前操作不允许修改受保护系统角色 |

认证、通用权限、格式、幂等、限流、未知错误和系统不可用继续复用第 10 节及 Task 5.1 既有错误码。错误响应使用统一包装，不得暴露密码策略细节、密码哈希、资源存在性、SQL、堆栈或内部路径。

### 16.9 Audit

- 创建、更新、启用、停用、密码重置、角色权限替换和用户角色替换全部写入 `audit_logs`；
- 审计至少记录操作者、Request ID、动作、对象类型、对象 ID、结果、时间及必要前后差异；
- 用户详情、角色权限、用户角色及权限目录的敏感查看按风险记录；
- 密码重置仅记录“密码凭据已重置”和 `mustChangePassword` 变化，不记录密码、哈希、Token 或策略内部值；
- 权限和角色变更记录增删代码摘要，但不得记录客户端凭据或无权敏感资料；
- 审计写入失败时，高风险写操作整体失败，不得向客户端暴露内部审计异常。

### 16.10 正式结论

API Coverage Completion 002 补齐 `SEC-006` 至 `SEC-021` 共 16 个正式接口。既有 315 个接口的编号、路径、方法和语义保持不变；正式接口总数更新为 331。Frozen 业务规则、Database Logical Design v1.1、数据库枚举、ROLE_PERMISSION_SPEC、Phase 6 功能内容及 244 个正式权限代码均未修改。

## 17. API Coverage Completion 003：角色数据范围维护

### 17.1 补齐范围与边界

本节补齐 Approved 用户权限页面及 Phase 6 角色数据范围维护缺少正式 API 覆盖的问题。全部接口只映射 Frozen `role_warehouses` 和 `role_stores` 既有关系，复用既有 `roles`、`warehouses`、`stores`、认证、RBAC、审计和并发能力，不新增业务对象、数据库表、字段、关系、角色、权限代码、枚举或数据范围。

仓库数据范围继续使用 `ROLE_PERMISSION_SPEC.md` 已冻结的 `warehouse`，店铺数据范围继续使用已冻结的 `store`。`accessLevel` 必须直接引用 [数据库枚举规范](../03-data/DATABASE_ENUM_SPEC.md) 的 `access_level` 唯一正式集合，当前只允许 `read`、`operate`、`manage`；本文件不建立或维护平行枚举。

### 17.2 正式接口目录

| 编号 | 接口 | 方法与路径 | 正式权限 | 分页 | 审计要求 |
| --- | --- | --- | --- | --- | --- |
| `SEC-022` | 角色仓库数据范围 | `GET /api/v1/roles/{id}/warehouses` | `security.role.read`、`security.permission.read` | 否 | 敏感查看记录 |
| `SEC-023` | 替换角色仓库数据范围 | `PUT /api/v1/roles/{id}/warehouses` | `security.role.assign`、`security.permission.assign` | 否 | 高风险，必记 |
| `SEC-024` | 角色店铺数据范围 | `GET /api/v1/roles/{id}/stores` | `security.role.read`、`security.permission.read` | 否 | 敏感查看记录 |
| `SEC-025` | 替换角色店铺数据范围 | `PUT /api/v1/roles/{id}/stores` | `security.role.assign`、`security.permission.assign` | 否 | 高风险，必记 |

四个接口均要求有效认证及 `X-Request-ID`，路径中的 `{id}` 必须是角色 UUID。`SEC-023` 和 `SEC-025` 还必须携带 `Idempotency-Key`，并使用请求中的 `updatedAt` 执行并发校验。

### 17.3 Request 与 Replace DTO

`SEC-022` 与 `SEC-024` 不接收请求体或分页参数，只接收路径参数 `{id}`。服务端必须先验证角色存在且操作者有权查看其完整数据范围；不得返回部分集合后让客户端据此执行整体覆盖。

`RoleWarehouseAssignmentDto`：

| 字段 | 必填 | 校验与映射 |
| --- | --- | --- |
| `warehouseId` | 是 | UUID；映射既有 `role_warehouses.warehouse_id`；仓库必须存在、启用且处于操作者可管理范围 |
| `accessLevel` | 是 | 直接引用 `DATABASE_ENUM_SPEC.md` 的 `access_level`；只接受其当前正式值 `read`、`operate`、`manage` |

`SEC-023 ReplaceRoleWarehousesDto`：

| 字段 | 必填 | 校验与映射 |
| --- | --- | --- |
| `warehouseAssignments` | 是 | `RoleWarehouseAssignmentDto[]`；`warehouseId` 不得重复；空数组明确表示清空该角色的全部仓库范围 |
| `updatedAt` | 是 | 当前角色响应中的 ISO 8601 并发时间戳 |
| `reason` | 是 | 去除首尾空白后非空的安全调整原因 |

`RoleStoreAssignmentDto`：

| 字段 | 必填 | 校验与映射 |
| --- | --- | --- |
| `storeId` | 是 | UUID；映射既有 `role_stores.store_id`；店铺必须存在、启用且处于操作者可管理范围 |
| `accessLevel` | 是 | 直接引用 `DATABASE_ENUM_SPEC.md` 的 `access_level`；只接受其当前正式值 `read`、`operate`、`manage` |

`SEC-025 ReplaceRoleStoresDto`：

| 字段 | 必填 | 校验与映射 |
| --- | --- | --- |
| `storeAssignments` | 是 | `RoleStoreAssignmentDto[]`；`storeId` 不得重复；空数组明确表示清空该角色的全部店铺范围 |
| `updatedAt` | 是 | 当前角色响应中的 ISO 8601 并发时间戳 |
| `reason` | 是 | 去除首尾空白后非空的安全调整原因 |

`assignedBy`、`assignedAt`、`createdBy`、`createdAt`、`updatedBy` 和关系 `updatedAt` 均由服务端生成或维护，客户端不得提交。PUT 请求只接受上述完整 DTO，不接受 `append`、`remove`、局部 Patch 指令或关系 ID。

### 17.4 PUT 整体覆盖规则

1. `SEC-023` 以 `warehouseAssignments` 原子替换该角色全部 `role_warehouses` 关系；
2. `SEC-025` 以 `storeAssignments` 原子替换该角色全部 `role_stores` 关系；
3. 服务端必须在同一事务内校验、计算新增/更新/移除差异、写入完整新集合、更新并发时间戳并记录审计；
4. 任一关系、枚举、权限、并发或审计校验失败时整笔回滚，不得留下部分关系或虚假成功；
5. 重复的目标 ID、未批准 `accessLevel`、不存在或停用的目标均拒绝；
6. 操作者必须有权管理变更涉及的全部仓库或店铺，不得授予超出自身可管理范围的数据范围；
7. 操作者不得通过修改自身有效角色的数据范围实现提权，也不得绕过系统角色及必要管理身份保护；
8. 数据范围变化后，受影响用户的下一次请求立即按最新 `role_warehouses`、`role_stores` 和 `access_level` 重新计算授权。

### 17.5 Response DTO

`RoleWarehouseScopeItemDto` 只返回：

- `warehouseId`、`warehouseCode`、`warehouseName`、`warehouseType`；
- `accessLevel`；
- `assignedBy`、`assignedAt`、`createdAt`、`updatedAt`。

`RoleStoreScopeItemDto` 只返回：

- `storeId`、`storeCode`、`storeName`；
- `platformId`、`platformCode`、`platformName`；
- `accessLevel`；
- `assignedBy`、`assignedAt`、`createdAt`、`updatedAt`。

`SEC-022` 和 `SEC-023` 返回 `RoleWarehouseScopeResponseDto`：

```json
{
  "success": true,
  "data": {
    "role": {},
    "warehouses": [],
    "updatedAt": "2026-07-23T00:00:00Z"
  },
  "meta": {},
  "requestId": "req-example"
}
```

`SEC-024` 和 `SEC-025` 返回 `RoleStoreScopeResponseDto`：

```json
{
  "success": true,
  "data": {
    "role": {},
    "stores": [],
    "updatedAt": "2026-07-23T00:00:00Z"
  },
  "meta": {},
  "requestId": "req-example"
}
```

其中 `role` 使用第 16.6 节 `RoleResponseDto` 安全摘要。PUT 成功后必须重新读取并返回数据库正式集合，不得根据客户端请求回显推测结果。响应不得返回数据库内部连接信息、无权仓库/店铺、完整权限计算过程或其他敏感资料。

### 17.6 Validation 与 Permission

1. 四个接口先执行认证，再执行第 17.2 节列明的全部正式权限代码；
2. 角色必须存在且对操作者可见；按安全策略不可见时返回 `RESOURCE_ROLE_NOT_FOUND`；
3. 仓库和店铺必须存在、启用并可被操作者管理；无权目标不得通过错误详情泄露；
4. 每个请求集合内目标 UUID 必须唯一，并符合 Frozen 关系唯一约束；
5. `accessLevel` 的唯一事实来源是 `DATABASE_ENUM_SPEC.md`，Validation 不得复制可独立演进的本地枚举或接受显示文案；
6. `read`、`operate`、`manage` 只表达对应仓库或店铺的数据范围访问级别，不替代功能权限、操作权限、状态、职责分离和记录级校验；
7. PUT 必须验证 `updatedAt`、`Idempotency-Key`、当前角色保护状态及操作者最新权限，不能信任页面缓存；
8. 整体覆盖不得因客户端漏传、隐藏部分集合或无权读取完整集合而静默删除关系；
9. 不创建用户直接仓库/店铺关系，不创建角色厂家关系，也不新增通用记录 ACL；
10. GET 无副作用，不分页；PUT 只能使用整体 Replace，不提供 Append、Remove 或 Patch 语义。

### 17.7 Error Code

| 错误码 | HTTP | 含义 |
| --- | ---: | --- |
| `RESOURCE_ROLE_NOT_FOUND` | 404 | 角色不存在或不可见 |
| `RESOURCE_MASTER_DATA_NOT_FOUND` | 404 | 仓库或店铺不存在或不可见 |
| `RESOURCE_MASTER_DATA_INACTIVE` | 422 | 仓库或店铺已停用，不能用于新的数据范围集合 |
| `VALIDATION_ACCESS_LEVEL_NOT_APPROVED` | 422 | `accessLevel` 不属于 `DATABASE_ENUM_SPEC.md` 正式集合 |
| `VALIDATION_ROLE_WAREHOUSE_ASSIGNMENT_INVALID` | 422 | 仓库范围集合存在重复、格式错误或非法关系 |
| `VALIDATION_ROLE_STORE_ASSIGNMENT_INVALID` | 422 | 店铺范围集合存在重复、格式错误或非法关系 |
| `CONFLICT_SECURITY_RESOURCE_MODIFIED` | 409 | 角色或数据范围集合已被其他请求修改 |
| `PERMISSION_WAREHOUSE_DENIED` | 403 | 操作者无权查看或管理涉及的仓库范围 |
| `PERMISSION_STORE_DENIED` | 403 | 操作者无权查看或管理涉及的店铺范围 |
| `PERMISSION_SELF_ELEVATION_DENIED` | 403 | 操作者尝试通过角色数据范围变更实现自身提权 |
| `PERMISSION_SYSTEM_ROLE_PROTECTED` | 403 | 当前操作违反系统角色或必要管理身份保护 |

认证、通用格式、权限、幂等、重放、限流、审计失败、未知错误和系统不可用继续复用第 10 节、Task 5.1 及第 16.8 节既有规则。错误响应不得泄露无权仓库、店铺、角色、关系集合、SQL、堆栈或内部路径。

### 17.8 Audit

- `SEC-022` 与 `SEC-024` 的敏感数据范围查看按风险写入 `audit_logs`，记录操作者、Request ID、角色、范围类型、结果和时间；
- `SEC-023` 与 `SEC-025` 是高风险权限调整，必须记录操作者、Request ID、目标角色、原因、变更前后集合摘要、新增/更新/移除数量、结果和时间；
- 仓库与店铺摘要只记录必要 ID、`accessLevel` 和差异，不记录无权敏感资料；
- 审计不得记录 Token、Cookie、数据库连接串、完整客户端凭据或内部异常；
- 高风险 PUT 的审计写入失败时整笔事务失败，客户端只收到安全错误和 Request ID。

### 17.9 正式结论

API Coverage Completion 003 补齐 `SEC-022` 至 `SEC-025` 共 4 个正式接口。既有 331 个接口的编号、路径、方法和语义保持不变；正式接口总数更新为 335。Frozen 业务规则、Database Logical Design v1.1、`DATABASE_ENUM_SPEC.md`、`ROLE_PERMISSION_SPEC.md`、Phase 4、Phase 6、5 个正式角色、244 个正式权限代码及 6 类数据范围均未修改。

## 18. API Coverage Completion 004：CBR-003 运输方式字段补齐

### 18.1 补齐范围与边界

本节补齐 Approved Phase 4 跨境发货页面及 Frozen Database Logical Design v1.1 的必填 `transport_method` 字段在 `CBR-003` 创建请求中缺少正式 API 覆盖的问题。

本次只补充既有 `CBR-003 POST /api/v1/cross-border-shipments` 的 Request DTO、Validation 和成功响应字段，不新增接口，不改变接口编号、路径、方法、权限、幂等、审计、业务流程或其他字段。Task 5.4 第 19 节除运输方式字段遗漏外继续保持有效。

### 18.2 Request DTO 与 Validation

`CBR-003 CreateCrossBorderShipmentDto` 在既有请求字段中增加：

| 字段 | 必填 | 类型 | 长度 | 数据库映射 |
| --- | --- | --- | --- | --- |
| `transportMethod` | 是 | `string` | 最大 50 个字符 | `cross_border_shipments.transport_method`（`VARCHAR(50) NOT NULL`） |

Validation 必须满足：

1. `transportMethod` 必须提供，缺失、`null` 或非字符串值均拒绝；
2. `transportMethod` 最大长度为 50 个字符；
3. `transportMethod` 不建立枚举，不限制固定字符串集合；
4. `transportMethod` 不设置默认值，不得由服务端、客户端或数据库自动推断；
5. 校验失败使用既有统一 Validation 错误结构，不新增业务错误码。

### 18.3 Response DTO

`CBR-003` 创建成功响应中的跨境发货单 DTO 必须返回 `transportMethod`，类型为 `string`，值直接映射已持久化的 `cross_border_shipments.transport_method`。响应不得使用默认值、枚举转换或派生值替代数据库正式字段。

### 18.4 正式结论

API Coverage Completion 004 只补齐 `CBR-003` 的 `transportMethod` 字段覆盖。`CBR-*` 接口数量保持 22，API Master Specification v1.1 正式接口总数保持 335。Frozen 业务规则、Database Logical Design v1.1、`DATABASE_ENUM_SPEC.md`、`ROLE_PERMISSION_SPEC.md`、Phase 4、Phase 6 及工程代码均未修改。

## 19. API Master Specification v1.1 历史冻结结论

1. Task 5.1 至 Task 5.5 为 Completed / Approved；
2. Phase 5 Final Consistency Review 为 Completed / Approved；
3. Phase 5 为 Completed / Approved / Frozen；
4. API Master Specification v1.1 共登记 335 个 Completed / Approved / Frozen 正式接口；
5. 本文件已升级为 API Master Specification；
6. 未修改 Frozen 数据库，未新增字段、表、状态、关系或业务对象；
7. 未创建真实 API，未编写业务代码；
8. 原 272 个正式接口的编号、路径、方法、状态、权限、安全及 Frozen 映射保持不变；
9. API Change Request 001 已正式批准，库存盘点 17、销售退货 13、报损 13，共 43 个新增接口纳入 v1.1；
10. API Coverage Completion 002 已正式批准，用户、角色与权限管理 `SEC-006` 至 `SEC-021` 共 16 个接口纳入 v1.1；
11. API Coverage Completion 003 已正式批准，角色仓库与店铺数据范围维护 `SEC-022` 至 `SEC-025` 共 4 个接口纳入 v1.1；
12. API Coverage Completion 004 已正式批准，`CBR-003` 的必填 `transportMethod` 已纳入 v1.1；
13. API Master Specification v1.1 已重新冻结并成为 Phase 6 及后续阶段唯一正式 API 事实来源；v1.0 保留为历史冻结基线；
14. 本次只补齐 Approved 页面、权限管理和既有数据库必填字段的 API 覆盖，不修改 Frozen 数据库，不新增表、字段、关系、状态、角色、权限代码、枚举、数据范围或业务对象；
15. 禁止通过 Phase 6 文档、页面代码或实现代码绕过本规范；后续修改必须经过正式 DCR 或 Change Request。

## 20. API Change Request 002：统一认证正式契约

### 20.1 正式边界与唯一事实来源

1. `users` 是唯一系统用户身份；
2. `user_wechat_identities` 是唯一微信身份映射；
3. `auth_sessions` 是唯一认证会话和令牌生命周期持久化对象；
4. 角色、权限、仓库范围、店铺范围和字段权限只来自现有 RBAC；
5. 微信身份不能创建用户、角色或权限，也不能增加授权；
6. PC 与微信小程序共用 Access Token、Refresh Token、Session 和授权模型；
7. 每次刷新创建新的 Session 行，旧行保留用于重放识别；
8. Refresh Token 只以服务端密钥参与的确定性单向摘要持久化；
9. Refresh Token 重放撤销整个 Token Family；
10. 每次登录、刷新和受保护请求重新校验用户、角色及授权的当前有效状态。

本节只调整既有 `SEC-001` 至 `SEC-005` 的 Request、Response、Validation、错误、安全与审计契约，不新增接口、路径、编号、权限代码、页面或业务功能。正式接口总数保持 335。

### 20.2 通用认证 Header 与 Validation

- JSON 请求使用 `Content-Type: application/json; charset=utf-8`；
- `X-Request-ID` 遵循第 5 节；
- `X-Client-Type` 必须是 `pc` 或 `wechat-mini-program`，只用于兼容、审计和监控，不作为授权依据；
- 请求 DTO 严格拒绝未知字段、未知 `loginType`、缺失必填字段及跨模式字段混用；
- AppID 与 App Secret 只来自服务端环境配置，客户端不得提交；
- 密码、微信 code、Session Key、App Secret、Access Token 和 Refresh Token 不得写入普通日志或审计快照。

### 20.3 `SEC-001 POST /api/v1/auth/login`

`loginType` 是唯一模式判别字段，不得根据其他字段是否存在推断模式。

| `loginType` | `username` | `password` | `wechatCode` | `X-Client-Type` |
| --- | --- | --- | --- | --- |
| `password` | 必填 | 必填 | 禁止 | `pc` |
| `wechat-bind` | 必填 | 必填 | 必填 | `wechat-mini-program` |
| `wechat` | 禁止 | 禁止 | 必填 | `wechat-mini-program` |

`PasswordLoginRequestDto`：

```json
{
  "loginType": "password",
  "username": "example",
  "password": "example-password"
}
```

- `username`：去除首尾空白后 1—100 字符；
- `password`：非空、最大 256 字符，不 trim、不回显、不持久化、不记录。

`WechatBindLoginRequestDto`：

```json
{
  "loginType": "wechat-bind",
  "wechatCode": "temporary-code",
  "username": "example",
  "password": "example-password"
}
```

- `wechatCode`：去除首尾空白后 1—256 字符，仅单次交换，不持久化；
- 必须携带 `Idempotency-Key`；
- 同键同请求返回首次逻辑结果，同键不同请求返回正式幂等冲突；
- 服务端交换微信身份后，验证账号凭据、启用、锁定、`mustChangePassword` 和有效角色；
- `mustChangePassword = true` 时拒绝绑定并返回 `AUTH_PASSWORD_CHANGE_REQUIRED`；
- 绑定、首个 `auth_sessions` 行、合法审计和数据库唯一裁决在单一事务中完成，事务提交后才向客户端返回令牌；
- 绑定失败不得留下部分映射、成功审计、Session 或 Token。

`WechatLoginRequestDto`：

```json
{
  "loginType": "wechat",
  "wechatCode": "temporary-code"
}
```

- 只按服务端 AppID 与交换所得 OpenID 查询当前有效 `user_wechat_identities`；
- 未绑定、已解绑、映射停用、用户停用、用户锁定或无有效角色时不创建 Session、不签发令牌；
- 普通密码登录和已绑定微信登录不要求 `Idempotency-Key`，但必须实施限流与防凭据重放。

三种模式成功时均创建首个 `auth_sessions` 行，并返回 `AuthTokenResponseDto`：

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
  "meta": {},
  "requestId": "req-example"
}
```

示例不是正式账号或凭据。响应不得包含 OpenID、UnionID、AppID、Session Key、密码哈希、Refresh Token Hash、Token Family ID、内部 Session ID 或轮换链。

### 20.4 `SEC-002 POST /api/v1/auth/refresh`

`RefreshTokenRequestDto`：

```json
{
  "refreshToken": "redacted-example"
}
```

- `refreshToken` 必填、非空，必须通过安全上限校验；不得 trim、记录或持久化明文；
- PC 与微信使用相同 DTO 和轮换模型，请求的 `X-Client-Type` 必须与 Session 客户端一致；
- 服务端以相同密钥摘要算法定位 `auth_sessions.refresh_token_hash`，并重新校验 Session 未到期、未撤销、未被替换，以及用户、有效角色和适用微信映射仍有效；
- 成功刷新必须在单一数据库事务中创建同一 `token_family_id` 的新 Session，并条件认领旧 Session；旧 Session 写入 `replaced_by_session_id` 和 `last_refreshed_at`；
- 条件认领零行时事务整体回滚；数据库是并发刷新最终裁决，同一旧 Refresh Token 最多一个请求成功；
- 已被替换的旧 Hash 再次出现时识别为重放，以系统操作者撤销该 `token_family_id` 的全部活动 Session；
- 成功响应复用 `AuthTokenResponseDto`，返回新 Access Token、新 Refresh Token 和安全会话摘要；
- 客户端收到任何刷新失败后不得继续自动重试写操作。

### 20.5 `SEC-003 POST /api/v1/auth/logout`

请求必须具有当前有效 Access Token，并使用：

```json
{
  "refreshToken": "redacted-example"
}
```

- `refreshToken` 必填且不得记录；
- 服务端必须校验 Access Token 与 Refresh Token 属于当前用户和同一 Token Family；
- 以当前用户作为撤销操作者，幂等撤销当前 Token Family；
- 重复登出返回同一逻辑成功，不把已撤销状态当作错误；
- 不解绑、不停用或删除 `user_wechat_identities`；
- 不影响同一用户其他合法 Token Family。

成功响应：

```json
{
  "success": true,
  "data": {
    "loggedOut": true
  },
  "meta": {},
  "requestId": "req-example"
}
```

### 20.6 `SEC-004 GET /api/v1/auth/session`

不接收请求体，使用当前 Access Token。成功返回 `CurrentSessionResponseDto`：

```json
{
  "success": true,
  "data": {
    "userId": "00000000-0000-0000-0000-000000000000",
    "username": "example",
    "displayName": "示例用户",
    "clientType": "pc",
    "wechatBound": false,
    "mustChangePassword": false,
    "accessTokenExpiresAt": "2026-07-23T12:00:00.000Z",
    "refreshTokenExpiresAt": "2026-08-22T12:00:00.000Z",
    "roles": [],
    "active": true
  },
  "meta": {},
  "requestId": "req-example"
}
```

只返回当前用户和当前会话的非敏感摘要。不得返回 Token、Refresh Token Hash、Token Family ID、内部 Session ID、`replaced_by_session_id`、轮换历史、OpenID、UnionID、Session Key、密码哈希或内部撤销原因。

### 20.7 `SEC-005 GET /api/v1/auth/permissions`

不接收请求体，使用当前 Access Token。成功返回 `CurrentPermissionResponseDto`：

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "00000000-0000-0000-0000-000000000000",
      "username": "example",
      "displayName": "示例用户"
    },
    "roles": [],
    "permissions": [],
    "warehouseScopes": [],
    "storeScopes": [],
    "dataScopes": []
  },
  "meta": {},
  "requestId": "req-example"
}
```

- `roles` 只来自当前有效 `user_roles` 与 `roles`；
- `permissions` 只来自当前有效 `role_permissions` 与 `permissions`；
- `warehouseScopes` 只来自 `role_warehouses`；
- `storeScopes` 只来自 `role_stores`；
- `dataScopes` 是上述正式关系按 Frozen `ROLE_PERMISSION_SPEC.md` 计算的安全摘要，不是独立持久权限；
- `roles[]` 只包含 `id`、`roleCode`、`roleName`；
- `permissions[]` 只包含 `permissionCode`、`moduleCode`、`actionCode`；
- `warehouseScopes[]` 只包含 `warehouseId`、`accessLevel`；
- `storeScopes[]` 只包含 `storeId`、`accessLevel`；
- `dataScopes[]` 只包含 Frozen `type`，以及适用且已授权的 `targetId`、`accessLevel`；`type` 只允许 `all`、`self_created`、`business_related`、`warehouse`、`store`、`manufacturer_derived`；
- 结果只用于客户端菜单和按钮展示，不能替代每个业务 API 的实时服务端授权；
- 不返回 Refresh Token、Hash、Session 链或权限计算内部信息。

### 20.8 正式认证错误码

| 错误码 | HTTP | 正式语义 |
| --- | ---: | --- |
| `AUTH_UNAUTHORIZED` | 401 | 缺失、格式错误或无效认证 |
| `AUTH_CREDENTIAL_INVALID` | 401 | 用户名或密码无效；不得区分账号不存在与密码错误 |
| `AUTH_TOKEN_EXPIRED` | 401 | Access Token 已过期 |
| `AUTH_REFRESH_TOKEN_INVALID` | 401 | Refresh Token 未知、格式错误、过期或摘要不匹配 |
| `AUTH_REFRESH_TOKEN_REPLAY` | 401 | 已被替换的 Refresh Token 再次使用；已触发整族撤销 |
| `AUTH_SESSION_REVOKED` | 401 | 当前 Session 或 Token Family 已撤销 |
| `AUTH_USER_DISABLED` | 403 | 凭据有效但系统用户已停用 |
| `AUTH_USER_LOCKED` | 429 | 用户处于临时锁定；适用时返回安全 `Retry-After` |
| `AUTH_PASSWORD_CHANGE_REQUIRED` | 403 | 必须先完成正式密码变更，不能进行微信首次绑定 |
| `AUTH_WECHAT_CODE_INVALID` | 401 | 微信 code 无效、过期、已使用或交换失败 |
| `AUTH_WECHAT_NOT_BOUND` | 401 | 当前微信身份没有有效绑定 |
| `AUTH_WECHAT_ALREADY_BOUND` | 409 | 当前微信身份已有有效绑定；不得透露目标账号 |
| `AUTH_ACCOUNT_ALREADY_BOUND` | 409 | 当前系统用户已有其他当前有效微信绑定 |
| `AUTH_BINDING_CONFLICT` | 409 | 并发绑定或绑定版本冲突 |

通用权限拒绝继续使用已冻结的 `PERMISSION_*` 分类，不新增同义 `AUTH_PERMISSION_DENIED`；通用高风险请求重放继续使用 `SECURITY_REPLAY_DETECTED`，Refresh Token 重放专用 `AUTH_REFRESH_TOKEN_REPLAY`。不得创建 `AUTH_INVALID_CREDENTIALS`、`AUTH_ACCOUNT_DISABLED`、`AUTH_ACCOUNT_LOCKED`、`AUTH_REFRESH_INVALID` 等同义重复码。

### 20.9 审计、安全与幂等

- 已知用户的登录成功/失败、绑定、自动登录、刷新、重放、登出、停用拒绝、锁定拒绝和权限拒绝按风险写入合法审计；
- 审计记录 Request ID、客户端类型、用户/对象、动作、结果、时间和脱敏原因，不记录任何凭据原值；
- 未知身份失败无法合法映射 `audit_logs.object_id` 时只进入脱敏安全遥测，不伪造用户或 UUID；
- 微信身份只记录不可逆摘要或末尾脱敏值，不记录 OpenID、UnionID 原文；
- 绑定审计失败时绑定事务整体失败；Session 轮换和撤销必须与其正式安全审计保持一致；
- 登录、绑定与刷新分别实施限流；错误消息不得泄露账号、微信身份、数据库、SQL、堆栈、配置或上游原始响应。

### 20.10 v1.2 冻结结论

1. API Change Request 002：Completed / Approved；
2. API Master Specification：v1.2，Completed / Approved / Frozen；
3. `SEC-001` 至 `SEC-005` 路径、方法和编号保持不变；
4. 不新增 `/pc-login`、`/wechat-login`、`/bind` 或任何平行认证接口；
5. 正式接口总数保持 335；
6. Database Logical Design v2.0、`ROLE_PERMISSION_SPEC.md`、业务规则和权限代码不变；
7. 本次不创建 Route、Service、Repository、JWT、前端或测试实现；
8. Task 7.6 保持 In Progress，Batch 7.6-B 在本次文档同步及 GitHub 技术验收前不启动。
