---
document_name: API Master Specification
project: Violin ERP Lite
version: 1.1
status: Completed / Approved / Frozen
owner: Project Manager
created_date: 2026-07-19
updated_date: 2026-07-23
related_phase: Phase 5
---

# API Master Specification

## 1. 文档定位

本文件是 Violin ERP Lite Phase 5 正式 API 规范总入口，统一 Task 5.1 至 Task 5.5 的接口编号、Header、请求、响应、分页、排序、筛选、命名、版本、错误码、权限、日志、导入、附件和安全规则。

API Master Specification v1.1 为 Completed / Approved / Frozen，正式接口总数为 331。API Change Request 001 已正式批准，库存盘点、销售退货和报损的 43 个接口已纳入冻结基线；API Coverage Completion 002 已正式批准，用户、角色与权限管理的 16 个接口已纳入冻结基线；v1.0 与原 272 个接口保留为历史冻结基线。

## 2. 正式文档入口

1. [Task 5.1 API 总体规范与安全规则](../phases/phase-05/TASK_5_1_API_DESIGN_PRINCIPLES.md)
2. [Task 5.2 基础资料与采购 API](../phases/phase-05/TASK_5_2_MASTER_DATA_AND_PURCHASE_API.md)
3. [Task 5.3 生产、质量验收与库存 API](../phases/phase-05/TASK_5_3_PRODUCTION_QUALITY_INVENTORY_API.md)
4. [Task 5.4 出入库与跨境业务 API](../phases/phase-05/TASK_5_4_INBOUND_OUTBOUND_CROSS_BORDER_API.md)
5. [Task 5.5 导入、附件、日志、安全与 API 最终收口](../phases/phase-05/TASK_5_5_IMPORT_LOG_SECURITY_API_FINAL.md)
6. [Phase 5 Final Consistency Review](../phases/phase-05/PHASE_5_FINAL_CONSISTENCY_REVIEW.md)
7. [API Change Request 001：补齐库存盘点、销售退货、报损 API](../00-governance/API_CHANGE_REQUEST_001.md)
8. 本文件第 16 节：API Coverage Completion 002 用户、角色与权限管理 API 补齐

发生冲突时，Frozen 业务规则和 Frozen Database Logical Design v1.1 优先；Task 5.1 提供通用规则，Task 5.2 至 Task 5.5 提供模块契约，本文件提供统一索引与最终规范。

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
| API CR-001 | 库存盘点 `STC-*` | 17 | Completed / Approved |
| API CR-001 | 销售退货 `SRT-*` | 13 | Completed / Approved |
| API CR-001 | 报损 `DMG-*` | 13 | Completed / Approved |
| 合计 | API Master Specification v1.1 正式接口 | 331 | Completed / Approved / Frozen |

逐模块复核结果为 `74 + 29 + 29 + 10 + 26 + 18 + 17 + 15 + 22 + 15 + 8 + 4 + 5 + 16 + 17 + 13 + 13 = 331`。接口编号唯一且稳定，不得复用、改义或因排序调整重新编号。Task 5.4 的海外导入只读投影属于 `CBR-018` 至 `CBR-020`，不在 Task 5.5 重复计数。`STC-*`、`SRT-*` 和 `DMG-*` 的完整正式契约以 API Change Request 001 及 Task 5.4 补充章节为准；`SEC-006` 至 `SEC-021` 的完整正式契约以本文件第 16 节为准。

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

除 `204 No Content` 外均使用统一包装。响应不得暴露密码、Token、Cookie、密钥、SQL、数据库结构、内部路径、堆栈或未脱敏敏感值。

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

`SEC-001` 至 `SEC-005` 定义登录、刷新、登出、当前会话和当前权限能力；`SEC-006` 至 `SEC-021` 定义用户、角色、角色权限、用户角色和权限目录管理能力。Authentication、Authorization、Token、Refresh Token、Session、Permission Validation、Replay Protection、Idempotency、Rate Limit、IP White List 和 Header 安全规则适用于 v1.1 的全部 331 个 Frozen 接口。

Token、Session、网关、限流器、IP 配置及安全遥测的技术实现留待后续阶段，不新增认证、会话、IP 或日志数据库表。生产环境必须使用 HTTPS，并执行最小权限、数据脱敏、文件安全、输入白名单和安全错误处理。

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

## 17. API Master Specification v1.1 冻结结论

1. Task 5.1 至 Task 5.5 为 Completed / Approved；
2. Phase 5 Final Consistency Review 为 Completed / Approved；
3. Phase 5 为 Completed / Approved / Frozen；
4. API Master Specification v1.1 共登记 331 个 Completed / Approved / Frozen 正式接口；
5. 本文件已升级为 API Master Specification；
6. 未修改 Frozen 数据库，未新增字段、表、状态、关系或业务对象；
7. 未创建真实 API，未编写业务代码；
8. 原 272 个正式接口的编号、路径、方法、状态、权限、安全及 Frozen 映射保持不变；
9. API Change Request 001 已正式批准，库存盘点 17、销售退货 13、报损 13，共 43 个新增接口纳入 v1.1；
10. API Coverage Completion 002 已正式批准，用户、角色与权限管理 `SEC-006` 至 `SEC-021` 共 16 个接口纳入 v1.1；
11. API Master Specification v1.1 已重新冻结并成为 Phase 6 及后续阶段唯一正式 API 事实来源；v1.0 保留为历史冻结基线；
12. 本次只补齐 Approved 页面和权限管理能力，不修改 Frozen 数据库，不新增表、字段、关系、状态、角色、权限代码或业务对象；
13. 禁止通过 Phase 6 文档、页面代码或实现代码绕过本规范；后续修改必须经过正式 DCR 或 Change Request。
