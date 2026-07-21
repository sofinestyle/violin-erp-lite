---
document_name: Task 5.5 导入、附件、日志、安全与 API 最终收口
version: 1.0
status: Completed / Pending Approval
project: Violin ERP Lite
owner: Project Manager
related_phase: Phase 5
---

# Task 5.5：导入、附件、日志、安全与 API 最终收口

## 1. 文档目的与范围

本文档完成 Phase 5 最后一个业务 Task，统一导入任务（Import Job）、附件（Attachment）、日志与安全接口，并对 Task 5.1 至 Task 5.5 的 API 规则进行最终收口。

本 Task 只定义接口契约，不新增业务模块，不创建真实 API Route，不编写 Controller、Service、Repository 或业务代码，不安装依赖，不修改 Frozen 数据库，不开始 Phase 6，也不执行 Phase 5 Final Consistency Review。

## 2. 正式依据与对象映射

| 能力 | Frozen/Approved 对象 | 设计边界 |
| --- | --- | --- |
| 导入任务 | `import_tasks`、`import_task_items` | API 名称 Import Job 只是现有导入任务的资源表达，不新增业务对象 |
| 海外仓库存导入 | `import_tasks`、`import_task_items`、`shipment_import_matches`、`inventories`、`inventory_transactions`、跨境发货主明细 | Excel 导入结果是海外仓库存唯一正式来源；不得手工增加海外仓库存 |
| 附件 | `attachments`、`attachment_links` | 统一适用于采购、生产、验收、入库、出库、调拨、跨境，不新增模块专用附件表 |
| 审计与操作日志 | `audit_logs` | 只追加；日志类型是查询分类，不新增日志表 |
| 导入日志 | `audit_logs`、`import_tasks`、`import_task_items` | 任务/行结果与审计事件联合投影，不建立平行日志对象 |
| 导出、登录、安全日志 | `audit_logs` | 仅记录能够合法映射现有用户或受控对象的事件；不得伪造对象标识 |
| 身份与权限 | `users`、`roles`、`permissions`、`user_roles`、`role_permissions`、`role_warehouses`、`role_stores` | Token、Session、限流和重放保护的技术实现后置，不新增认证表或字段 |

接口字段使用 lowerCamelCase 映射 Frozen snake_case。任何派生字段均不得成为新的数据库事实。

## 3. 接口目录与数量

### 3.1 导入接口（15 个）

| 编号 | 接口 | 方法与路径 | 权限/范围 | 幂等、日志与备注 |
| --- | --- | --- | --- | --- |
| `IMP-001` | 创建导入任务并上传 Excel | `POST /api/v1/import-jobs` | 导入创建、目标仓库/店铺 | 幂等键；创建 `import_tasks`，文件只保存引用 |
| `IMP-002` | 导入任务列表 | `GET /api/v1/import-jobs` | 导入查看、仓库/店铺范围 | 分页；与 Task 5.4 海外导入只读投影一致 |
| `IMP-003` | 导入任务详情 | `GET /api/v1/import-jobs/{id}` | 导入查看、原始数据权限 | 返回统计和安全错误摘要 |
| `IMP-004` | 导入任务状态 | `GET /api/v1/import-jobs/{id}/status` | 导入查看 | 无副作用；适合轮询 |
| `IMP-005` | 取消导入任务 | `POST /api/v1/import-jobs/{id}/cancel` | 导入取消 | 幂等键；仅未执行状态 |
| `IMP-006` | 获取导入模板 | `GET /api/v1/import-templates/{importType}` | 导入模板查看 | 返回受控模板文件，不暴露存储路径 |
| `IMP-007` | 查询模板版本 | `GET /api/v1/import-templates/{importType}/versions` | 导入模板查看 | 模板版本是 API/文件契约，不新增数据库对象 |
| `IMP-008` | 校验模板兼容性 | `POST /api/v1/import-templates/{importType}/validate` | 导入校验 | 校验列、版本和文件特征，不创建业务结果 |
| `IMP-009` | 启动导入校验 | `POST /api/v1/import-jobs/{id}/validate` | 导入校验、目标范围 | 幂等键；逐行生成/更新现有任务明细 |
| `IMP-010` | 查询校验结果 | `GET /api/v1/import-jobs/{id}/validation-results` | 导入查看、原始数据权限 | 分页返回行级错误与警告 |
| `IMP-011` | 执行导入 | `POST /api/v1/import-jobs/{id}/execute` | 导入执行、高风险库存权限 | 幂等键；事务执行；海外库存导入必记 |
| `IMP-012` | 重试失败明细 | `POST /api/v1/import-jobs/{id}/retry-failed-items` | 导入执行 | 复用原任务和失败行；不得复制成功结果 |
| `IMP-013` | 查询导入结果 | `GET /api/v1/import-jobs/{id}/results` | 导入查看、目标范围 | 成功、失败、部分成功摘要和明细 |
| `IMP-014` | 导入历史查询 | `GET /api/v1/import-history` | 导入历史、仓库/店铺范围 | 查询正式任务、结果与来源追溯 |
| `IMP-015` | 导出导入历史/结果 | `POST /api/v1/import-history/export` | 导出、导入、敏感字段权限 | 幂等键；异步或文件响应按统一导出规则 |

Task 5.4 的 `CBR-018` 至 `CBR-020` 是海外库存导入的专用只读投影，不在 Task 5.5 重复计数。

### 3.2 附件接口（8 个）

| 编号 | 接口 | 方法与路径 | 权限/范围 | 备注 |
| --- | --- | --- | --- | --- |
| `ATT-001` | 上传附件 | `POST /api/v1/attachments` | 附件上传、目标对象编辑 | 幂等键；创建 `attachments`，不保存文件二进制 |
| `ATT-002` | 附件列表 | `GET /api/v1/attachments` | 目标对象查看、字段权限 | 按 `objectType`、`objectId`、类别筛选 |
| `ATT-003` | 附件详情 | `GET /api/v1/attachments/{attachmentId}` | 目标对象查看、敏感附件权限 | 返回安全元数据，不返回存储凭证 |
| `ATT-004` | 下载附件 | `GET /api/v1/attachments/{attachmentId}/download` | 下载、目标对象、敏感附件权限 | 每次重新授权；记录敏感下载 |
| `ATT-005` | 关联附件 | `POST /api/v1/attachments/{attachmentId}/links` | 关联、目标对象编辑 | 幂等键；创建 `attachment_links` |
| `ATT-006` | 解除附件关联 | `POST /api/v1/attachments/{attachmentId}/links/unlink` | 解除关联、目标对象编辑 | 历史保护；不得破坏正式业务证据 |
| `ATT-007` | 删除附件 | `POST /api/v1/attachments/{attachmentId}/delete` | 删除、高风险权限 | 仅无正式历史引用且策略允许；操作必记 |
| `ATT-008` | 查询附件生命周期 | `GET /api/v1/attachments/{attachmentId}/lifecycle` | 附件查看、审计权限 | 从附件、关联和审计记录派生，不新增历史表 |

### 3.3 日志接口（4 个）

| 编号 | 接口 | 方法与路径 | 权限/范围 | 备注 |
| --- | --- | --- | --- | --- |
| `LOG-001` | 日志列表 | `GET /api/v1/audit-logs` | 日志查看、模块/对象范围 | 支持六类逻辑日志及分页筛选 |
| `LOG-002` | 日志详情 | `GET /api/v1/audit-logs/{id}` | 日志查看、敏感字段权限 | 只读脱敏结果 |
| `LOG-003` | Trace 日志链路 | `GET /api/v1/audit-logs/traces/{traceId}` | 日志查看 | 按 `request_trace_id` 查询完整授权链路 |
| `LOG-004` | 导出日志 | `POST /api/v1/audit-logs/export` | 日志导出、模块/字段范围 | 幂等键；导出动作自身必须审计 |

### 3.4 安全接口（5 个）

| 编号 | 接口 | 方法与路径 | 权限/范围 | 备注 |
| --- | --- | --- | --- | --- |
| `SEC-001` | 登录 | `POST /api/v1/auth/login` | 未登录入口；频率/IP/风险控制 | 返回短期访问凭证和刷新契约；不返回密码哈希 |
| `SEC-002` | 刷新访问凭证 | `POST /api/v1/auth/refresh` | 有效刷新凭证 | 重放保护；旧刷新凭证处理由技术方案确定 |
| `SEC-003` | 登出 | `POST /api/v1/auth/logout` | 已认证会话 | 幂等；使当前认证上下文失效 |
| `SEC-004` | 当前会话 | `GET /api/v1/auth/session` | 已认证会话 | 返回用户、安全会话摘要和到期信息 |
| `SEC-005` | 当前权限能力 | `GET /api/v1/auth/permissions` | 已认证会话 | 返回功能、操作及仓库/店铺授权摘要；不替代每次服务端校验 |

Task 5.5 新增接口数为 15 + 8 + 4 + 5 = 32 个。Task 5.2、Task 5.3、Task 5.4 分别已有 103、65、72 个接口；Phase 5 当前正式接口总数为 103 + 65 + 72 + 32 = 272 个。

## 4. 导入任务统一契约

### 4.1 创建与文件上传

`IMP-001` 使用受控文件上传请求，业务字段为 `importType`、`templateVersion`、适用的 `warehouseId` 或 `storeId`、文件及可选说明。服务端生成 `taskNo`，保存安全原文件名和 `fileReference`，并初始化统计字段。

- 文件扩展名、MIME、内容特征、大小、工作表、表头和恶意内容必须校验；
- 原文件名不得作为存储路径；文件本体不得写入数据库；
- 仓库类导入必须校验仓库权限，店铺类导入必须校验店铺权限；
- 相同文件内容、导入类型和目标范围的重复提交必须识别，不能重复执行；
- 文件大小、行数和执行时限阈值留待技术阶段配置，不写入新业务字段。

### 4.2 模板与版本

模板契约至少包含 `importType`、`templateVersion`、有效期、必填列、可选列、字段格式、示例说明和校验摘要。模板文件及版本属于 API/文件契约资产，不是新业务对象，不创建模板表。

旧模板在兼容期内按其版本校验；不兼容列变更必须发布新模板版本。客户端不得通过自定义列名绕过正式字段映射。

### 4.3 校验规则

`IMP-008` 至 `IMP-010` 必须覆盖：

1. 字段校验：表头、必填列、类型、长度、精度、日期和编码格式；
2. 数据校验：数量、金额、业务日期、行内计算和 Frozen Check 语义；
3. 唯一校验：文件内重复、正式业务唯一范围和并发唯一竞争；
4. 外键校验：SKU、仓库、店铺、来源单据和明细存在且归属一致；
5. 状态校验：关联资料启用、来源单据允许、导入任务当前状态允许；
6. 权限校验：用户对全部目标仓库、店铺、来源业务和敏感原始数据有权；
7. 海外导入校验：目标必须为授权海外仓，SKU、批次、跨境发货和在途来源匹配合法。

原始行安全保存至 `raw_data`，行号映射 `row_no`。`validation_status`、`execution_status` 和任务 `status` 只使用已有受控值；本文不新增数据库状态或枚举。错误码和错误消息按行保存，敏感原值必须脱敏。

### 4.4 执行、幂等、重试与回滚

`IMP-011` 仅允许已完成校验且无阻断错误的任务。请求必须携带 `Idempotency-Key` 和任务的 `updatedAt`；服务端重新校验状态、模板版本、权限、目标范围和行数据。

- 每个可提交原子单元必须在事务内同成同败；
- 库存类导入必须原子更新 `inventories`、追加 `inventory_transactions`、写导入行结果和 `audit_logs`；
- 海外仓库存导入必须从合法跨境发货及在途库存匹配，减少在途仓、增加海外仓，并生成明细级 `shipment_import_matches`；
- 不得从来源仓直接增加海外仓库存，不得创建历史余额快照；
- 未提交事务自动回滚；已成功形成正式库存或业务结果后不得通过“导入回滚”删除历史，应使用既有正式冲销或库存调整流程；
- `IMP-012` 只重试失败行，成功行不得重复执行；重试继续使用原任务和行标识；
- 网络超时重试必须返回首次已确认结果，不得重复库存流水、附件或业务单据。

### 4.5 结果与历史

结果响应返回 `totalRows`、`successRows`、`failedRows`、`warningRows`、开始/完成时间、错误摘要和分页行结果。成功、失败、部分成功由正式计数与任务状态表达，不新增结果状态字段。

`IMP-014` 与 `IMP-015` 只查询/导出用户授权范围内的正式任务、任务明细、结果单据、库存流水和匹配记录。不得返回历史余额快照或未脱敏原始数据。

## 5. 附件统一契约

附件 API 统一适用于采购、生产、验收、入库、出库、调拨和跨境业务。统一语义如下：

| 统一名称 | 正式来源或计算规则 |
| --- | --- |
| `attachmentId` | `attachments.id` |
| `objectType` | `attachment_links.object_type` 受控值 |
| `objectId` | `attachment_links.object_id` |
| `objectItemId` | `attachment_links.object_item_id`，适用明细时使用 |
| `version` | 由 `checksum` 与 `uploadedAt` 形成的只读文件版本标识，不新增数据库字段 |
| `permission` | 当前请求根据功能、对象、字段及数据范围实时计算，不持久化为附件字段 |
| `storageStrategy` | 对 `storage_reference` 的抽象策略说明；不得返回内部路径、密钥或临时凭证 |

### 5.1 上传与关联

上传前校验目标对象、对象状态、附件类别、权限、文件扩展名、MIME、内容特征、大小和安全性。上传成功创建 `attachments`，关联动作创建 `attachment_links`；二者失败必须避免孤立正式关联。

一个附件可按 Frozen 关系链接合法业务对象，但重复的附件、对象、明细和类别组合必须由正式唯一约束拒绝。附件关联不得改变业务单据状态或库存。

### 5.2 查询、下载、解除关联与删除

查询和下载必须重新校验当前对象权限、仓库/店铺范围、附件敏感级别和文件状态。下载不得暴露服务器路径或存储凭证。

正式单据历史所需附件不得解除关联或删除。仅未被正式历史引用、无有效关联且权限/保留策略允许时，`ATT-007` 才可执行删除语义；不得通过物理删除破坏审计链。生命周期由附件、关联和审计记录派生，本文不新增附件历史表或状态值。

## 6. 统一日志体系

六类日志均通过统一 Audit Log API 查询：

| 逻辑类型 | 正式来源 | 内容 |
| --- | --- | --- |
| Audit Log | `audit_logs` | 高风险与审计事件 |
| Operation Log | `audit_logs` | 新增、修改、状态动作和业务执行 |
| Import Log | `audit_logs` + 导入任务/明细 | 上传、校验、执行、重试、结果 |
| Export Log | `audit_logs` | 导出条件、范围、操作者和结果 |
| Login Log | `audit_logs` | 可合法映射现有用户对象的登录成功、失败、登出和刷新事件 |
| Security Log | `audit_logs` | 权限拒绝、限流、重放、IP 策略和高风险安全事件 |

这些类型是 `moduleCode`、`actionCode`、对象和结果的受控查询分类，不是新表、新对象或新数据库状态。未知用户登录失败等无法提供合法 `object_id` 的事件不得伪造审计对象；其技术安全遥测方案须在后续技术阶段验证，如必须修改 Frozen 结构则另行提出 DCR。

### 6.1 统一字段投影

| API 字段 | Frozen 来源/派生 |
| --- | --- |
| `requestId` | `audit_logs.request_trace_id` |
| `traceId` | 第一版与 `requestId` 使用同一正式追踪值 |
| `correlationId` | 无独立持久化字段时使用同一追踪值；不得伪造跨请求关联 |
| `operator` | `user_id`、`username_snapshot` |
| `ip` | `ip_address`，按权限脱敏 |
| `userAgent` | `device_info` 的安全摘要 |
| `timestamp` | `occurred_at` |
| `logLevel` | 根据 `operation_result` 与失败事实只读派生 |
| `action` | `action_code` |
| `object` | `object_type`、`object_no_snapshot` |
| `objectId` | `object_id` |
| `result` | `operation_result` 与安全失败摘要 |

### 6.2 查询、导出、权限、脱敏与生命周期

日志列表支持 `logType`、`requestId`、`traceId`、操作者、模块、动作、对象类型/标识、结果、IP、时间范围、分页和白名单排序。无权数据在查询前过滤。

日志只追加，不提供创建、修改或删除 API。导出必须同时具备日志导出、模块范围和敏感字段权限，导出动作本身写审计。密码、Token、Cookie、完整银行账号、完整联系方式、完整地址、完整原始导入数据、SQL、堆栈和服务器路径不得返回或写入日志。保留期限与归档/清理实现由后续正式技术与合规配置确定，不得绕过 Frozen 历史保护原则。

## 7. 统一安全体系

### 7.1 Authentication、Token、Refresh Token 与 Session

- 除登录、刷新等明确入口外，所有 API 必须验证有效认证上下文；
- 访问凭证短期有效，刷新凭证仅用于刷新；具体格式、签名算法、存储介质和时限由技术阶段确定；
- Token、Refresh Token、Cookie、Session 标识不得出现在 URL、业务响应、普通日志或错误详情；
- 刷新必须实施轮换或等效重放保护；登出必须使当前认证上下文失效；
- 当前会话只返回用户 ID、显示名、安全到期时间、客户端类型和必要风险摘要；
- 本文不新增 Token 表、Refresh Token 表或 Session 表。

### 7.2 Authorization、Permission 与 Permission Validation

所有 API 在服务端逐次校验：身份、功能权限、操作权限、角色有效性、仓库范围、店铺范围、记录范围、字段权限、状态权限和职责分离。`SEC-005` 只为界面能力展示提供摘要，不能替代业务接口的实时授权。

跨仓、跨店铺、跨来源动作必须满足全部端点权限。无权获知资源是否存在时可返回 404，但内部审计必须保留真实拒绝原因。

### 7.3 Replay Protection、Idempotency 与 Rate Limit

- 高风险写操作要求 `Idempotency-Key`；同键同请求返回首次结果，同键不同请求返回 409；
- 登录、刷新、导入执行、库存事务、附件上传和导出必须防重放；
- 请求时间窗、随机数、签名或等效重放机制由技术阶段确定，不新增业务字段；
- 登录、刷新、查询、导出、上传和批量操作分别实施风险分级限流，超限返回 429；
- 限流不得成为越权数据泄露渠道，安全拒绝按规则记日志。

### 7.4 IP White List

IP 白名单只对经正式配置的高风险后台操作生效，不能替代身份与权限。可信客户端 IP 必须从受控网络边界解析，不信任任意客户端 Header。白名单配置介质、网关和网络拓扑留待技术阶段确定；本文不新增 IP 白名单表、字段或维护 API。

### 7.5 统一 Header

| Header | 规则 |
| --- | --- |
| `Authorization` | 非公开接口必需；不得记录原值 |
| `Content-Type` | JSON 使用 `application/json; charset=utf-8`；文件使用受控 multipart |
| `Accept` | 默认 `application/json`；文件下载使用允许类型 |
| `X-Request-ID` | 客户端可提供合法值，否则服务端生成 |
| `Idempotency-Key` | 需要幂等保护的写操作必需 |
| `X-Client-Type` | `pc` 或 `wechat-mini-program`；不作为授权依据 |

不得使用 Header 绕过 `/api/v1` 版本、权限、仓库/店铺范围或状态校验。

## 8. API 最终统一规范

Task 5.1 至 Task 5.5 统一采用：

- 基础路径 `/api/v1`，URL 复数英文资源与短横线命名；
- JSON 字段 lowerCamelCase；ID 使用 UUID 字符串；日期/时间、十进制定点值和布尔值遵守 Task 5.1；
- 成功响应 `success/data/meta/requestId`，失败响应 `success/error/requestId`；
- `page/pageSize` 分页，`sortBy/sortOrder` 白名单排序，明确 Query 筛选；
- 状态动作使用专用 POST 路径，普通 PATCH 不得覆盖状态；
- 认证、权限、状态、数据、唯一性、幂等、并发、日志和脱敏逐接口执行；
- 所有业务错误码采用稳定大写英文下划线代码；
- Task 5.1 为通用基线，Task 5.2 至 Task 5.5 为模块契约，`API_SPEC.md` 为 API Master Specification 总入口。

## 9. Task 5.5 错误码

| 错误码 | HTTP | 含义 |
| --- | --- | --- |
| `RESOURCE_IMPORT_JOB_NOT_FOUND` | 404 | 导入任务不存在或不可见 |
| `STATE_IMPORT_JOB_ACTION_NOT_ALLOWED` | 422 | 当前任务状态不允许校验、执行、重试或取消 |
| `IMPORT_FILE_FORMAT_INVALID` | 422 | 文件格式、MIME 或内容特征不合法 |
| `IMPORT_TEMPLATE_VERSION_UNSUPPORTED` | 422 | 模板版本不兼容 |
| `IMPORT_VALIDATION_FAILED` | 422 | 存在阻断执行的校验错误 |
| `IMPORT_DUPLICATE_FILE` | 409 | 重复文件、导入类型和目标范围冲突 |
| `IMPORT_EXECUTION_PARTIAL_FAILED` | 422 | 导入执行部分失败，详情见行结果 |
| `CONFLICT_IMPORT_JOB_MODIFIED` | 409 | 导入任务状态或内容已变化 |
| `RESOURCE_ATTACHMENT_NOT_FOUND` | 404 | 附件不存在或不可见 |
| `ATTACHMENT_FILE_UNSAFE` | 422 | 文件内容或类型不安全 |
| `STATE_ATTACHMENT_HISTORY_PROTECTED` | 409 | 正式历史附件禁止解除或删除 |
| `PERMISSION_ATTACHMENT_DENIED` | 403 | 无附件查看、上传、关联或下载权限 |
| `PERMISSION_AUDIT_LOG_DENIED` | 403 | 无日志查询或导出权限 |
| `AUTH_CREDENTIAL_INVALID` | 401 | 登录凭证无效 |
| `AUTH_TOKEN_EXPIRED` | 401 | 访问凭证已过期 |
| `AUTH_REFRESH_TOKEN_INVALID` | 401 | 刷新凭证无效或已被重放 |
| `SECURITY_REPLAY_DETECTED` | 409 | 检测到重放或重复高风险请求 |
| `SECURITY_IP_NOT_ALLOWED` | 403 | 高风险接口来源 IP 不在允许范围 |
| `SECURITY_RATE_LIMIT_EXCEEDED` | 429 | 超出访问频率限制 |

## 10. 范围排除

本 Task 不包含真实导入程序、真实文件存储、Token/Session 技术实现、日志基础设施、限流器、网关、IP 白名单管理、真实 API、代码、ORM、Schema、DDL、Migration、Seed、数据库变更、业务模块扩展、Task 5.1 至 Task 5.4 正文修改、Phase Final Consistency Review、Phase 6 或技术开发。

## 11. 正式结论

1. Task 5.5 已完成导入、附件、日志、安全及 API 最终收口设计，状态为 Completed / Pending Approval；
2. 导入接口 15 个、附件接口 8 个、日志接口 4 个、安全接口 5 个，Task 5.5 共 32 个接口；
3. Phase 5 当前共登记 272 个正式接口；
4. 海外仓库存只能由正式 Excel 导入结果形成，导入事务必须保留库存流水和来源追溯；
5. 附件统一复用 `attachments` 与 `attachment_links`；
6. 六类日志统一映射现有 `audit_logs` 及适用导入对象，不新增日志表；
7. 安全规则统一适用于 Task 5.1 至 Task 5.5 全部 API；
8. 未修改 Frozen 数据库，未新增字段、表、状态、关系或业务对象；
9. 未创建真实 API，未编写业务代码，未安装依赖；
10. Phase 5 保持 In Progress，Task 5.1 至 Task 5.4 保持 Completed / Approved；
11. 当前下一步为 Task 5.5 GitHub 验收；验收前不得执行 Phase 5 Final Consistency Review；
12. 技术开发保持 Not Started。
