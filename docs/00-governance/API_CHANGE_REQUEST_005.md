---
document_name: API Change Request 005：Attachment API 契约补齐
project: Violin ERP Lite
version: 1.0
status: Proposed / Pending Approval
owner: Project Manager
created_date: 2026-07-25
updated_date: 2026-07-25
related_phase: Phase 5 / Phase 7
---

# API Change Request 005：Attachment API 契约补齐

> 本 Change Request 尚未批准。API Master Specification 当前仍为 v1.3 Completed / Approved / Frozen，正式接口总数仍为 335。本文只提出既有 `ATT-001` 至 `ATT-008` 的可执行契约，不新增第九个 Attachment API。

## 1. 变更原因与边界

现有 Frozen API 已定义 8 个 Attachment 接口的编号、路径、方法、权限语义和高层规则，但未定义完整 DTO、封闭 Object Type/Category、删除裁决、Storage 错误映射与生产级幂等依赖。

本提案：

- API 新增：0；
- API 删除：0；
- 路径或方法变化：0；
- 正式接口总数：335；
- 权限代码变化：0；
- 建议新增稳定错误码：9；
- 只复用 `attachments`、`attachment_links`、Task 7.3 Storage 和既有审计体系。

## 2. 依赖与版本建议

推荐批准顺序：

1. DCR-004 正式同步 Database v2.2；
2. API CR-004 正式同步 API v1.4；
3. DCR-005 正式同步 Database v2.3；
4. 本 API CR-005 正式同步 API v1.5；
5. 完成独立 GitHub 技术验收后，由项目负责人另行恢复 Task 7.4。

若 API CR-004 被拒绝或撤回，本提案必须重新基于 v1.3 审核，并可改为 v1.4；不得与 API CR-004 同时占用 v1.4。

## 3. 通用类型

### 3.1 `AttachmentObjectType`

只允许：

```text
purchase_order
purchase_payment
purchase_return
production_order
production_progress_record
production_completion_record
production_payment
inspection_order
inventory_adjustment
stock_count
inbound_order
outbound_order
sales_return
damage_report
transfer_order
cross_border_shipment
import_task
```

服务端 Object Registry 映射：

| Object Type | Frozen 对象 | 对象权限资源 | 数据范围 | ATT 外部写入 |
| --- | --- | --- | --- | --- |
| `purchase_order` | `purchase_orders` | `purchase.order` | 采购记录、仓库、业务关联 | 允许，受对象状态限制 |
| `purchase_payment` | `purchase_payments` | `purchase.payment` | 来源采购单、金额字段 | 允许凭证；创建后证据保护 |
| `purchase_return` | `purchase_returns` | `purchase.return` | 来源采购、退货仓 | 允许，受对象状态限制 |
| `production_order` | `production_orders` | `production.order` | 厂家、目标仓、业务关联 | 允许，受对象状态限制 |
| `production_progress_record` | `production_progress_records` | `production.progress` | 来源生产单与厂家 | 允许追加证据；记录创建后保护 |
| `production_completion_record` | `production_completion_records` | `production.completion` | 来源生产单与目标仓 | 允许追加证据；正式完成后保护 |
| `production_payment` | `production_payments` | `production.payment` | 来源生产单、厂家、金额字段 | 允许凭证；创建后证据保护 |
| `inspection_order` | `inspection_orders` | `inspection.order` | 来源单据、验收仓、厂家 | 允许，提交/确认后保护 |
| `inventory_adjustment` | `inventory_adjustments` | `inventory.adjustment` | 调整仓、成本字段 | 允许，提交/执行后保护 |
| `stock_count` | `stock_counts` | `inventory.stock-count` | 盘点仓库 | 允许，开始/提交后保护 |
| `inbound_order` | `inbound_orders` | `inbound.order` | 来源、目标仓 | 允许，提交/确认后保护 |
| `outbound_order` | `outbound_orders` | `outbound.order` | 来源仓、店铺、个人字段 | 允许，提交/确认后保护 |
| `sales_return` | `sales_returns` | `outbound.sales-return` | 店铺、原出库、接收仓 | 允许，提交/确认后保护 |
| `damage_report` | `damage_reports` | `inventory.damage` | 仓库、成本字段 | 允许，提交/确认后保护 |
| `transfer_order` | `transfer_orders` | `transfer.order` | 来源/在途/目的仓 | 允许，提交/调出后保护 |
| `cross_border_shipment` | `cross_border_shipments` | `cross-border.shipment` | 三仓、厂家、业务关联 | 允许，提交/发运后保护 |
| `import_task` | `import_tasks` | `import.task` | 仓库或店铺目标、原始数据字段 | ATT 外部只读；写入只由 `IMP-*` 调统一 Service |

每个 Registry Entry 必须提供存在性查询、可见性查询、对象状态读取、明细归属校验、读/写权限、仓库/店铺/厂家范围解析和保护点判断。未知类型在访问数据库前拒绝。

### 3.2 `AttachmentCategory`

只允许：

```text
general_business_document
inspection_evidence
inbound_evidence
outbound_evidence
inventory_evidence
import_source_file
import_error_report
payment_voucher
production_progress_evidence
cross_border_shipping_evidence
```

Category 的默认敏感、证据、删除和允许对象矩阵以 `ATTACHMENT_FRAMEWORK_SSOT_COMPLETION_001.md` 第 6 节为准。Category 默认敏感值不能被客户端降级。

### 3.3 通用 DTO

`AttachmentLinkDto`：

| 字段 | 类型 |
| --- | --- |
| `id` | UUID |
| `objectType` | `AttachmentObjectType` |
| `objectId` | UUID |
| `objectItemId` | UUID 或 `null` |
| `attachmentCategory` | `AttachmentCategory` |
| `sortOrder` | 非负整数 |
| `linkedAt` | ISO 8601 |
| `linkedBy` | 当前有权查看的用户安全摘要 |

`AttachmentPermissionDto`：

```text
canRead
canDownload
canLink
canUnlink
canDelete
```

全部为服务端实时派生布尔值，不持久化，不接受客户端提交。

`AttachmentResponseDto`：

| 字段 | 类型与规则 |
| --- | --- |
| `id` | UUID |
| `originalFilename` | 安全展示文件名 |
| `fileExtension` | 小写扩展名 |
| `mimeType` | 已验证 MIME |
| `fileSize` | 十进制整数字符串 |
| `checksum` | SHA-256；仅有权读取 Metadata 时返回 |
| `uploadedAt` | ISO 8601 |
| `uploadedBy` | 用户安全摘要 |
| `isSensitive` | 布尔值 |
| `status` | DCR-005 Attachment 状态 |
| `version` | `updatedAt` 的 ISO 8601 并发投影 |
| `storageStrategy` | `stream`；不得返回 Storage Key、路径或凭证 |
| `links` | 当前用户有权查看的 `AttachmentLinkDto[]` |
| `permission` | `AttachmentPermissionDto` |

无敏感附件权限时，接口按安全策略返回 `RESOURCE_ATTACHMENT_NOT_FOUND` 或 `PERMISSION_ATTACHMENT_DENIED`，不得返回删减 Metadata 后继续泄露其存在。

## 4. 通用安全、权限与数据范围

1. 全部接口要求有效 `Authorization`、有效用户和最新 Session；
2. `X-Request-ID` 客户端可提供合法值，否则服务端生成；
3. 功能权限必须与目标对象权限同时满足；
4. 查询前应用对象记录、仓库、店铺、厂家派生及字段范围；
5. `is_sensitive=true` 或 Category 默认敏感时，详情与下载额外要求 `field.attachment-sensitive.read`；
6. 客户端的 Object Type、Object ID、Category、敏感标记或权限摘要不能扩大授权；
7. `storage_reference`、`stored_file_name`、Local Root、Token、临时凭证和完整内部错误永不返回；
8. 审计失败时上传、关联、解除和删除等高风险动作整体失败。

## 5. `ATT-001` 上传附件

### 5.1 基本契约

- 名称：上传并关联附件；
- Method：`POST`；
- Path：`/api/v1/attachments`；
- Authentication：必需；
- Permission：`attachment.file.upload`、`attachment.file.link`，并具备目标对象写权限；
- Data Scope：目标对象记录、仓库、店铺、厂家及适用字段范围；
- Pagination：不适用。

### 5.2 Header 与 multipart

必需：

- `Authorization`；
- `Content-Type: multipart/form-data`；
- `Idempotency-Key`。

可选：`X-Request-ID`、`X-Client-Type`。

multipart 字段：

| 字段 | 必填 | 规则 |
| --- | --- | --- |
| `file` | 是 | 单文件；不得一次上传多个文件 |
| `objectType` | 是 | `AttachmentObjectType`；`import_task` 禁止外部上传 |
| `objectId` | 是 | UUID |
| `objectItemId` | 否 | UUID；必须属于目标主对象 |
| `attachmentCategory` | 是 | `AttachmentCategory` 且与对象兼容 |
| `isSensitive` | 否 | 布尔值，默认 Category 值；只允许从 false 提升为 true |
| `sortOrder` | 否 | 非负整数，默认 0 |

文件执行文件名、大小、Extension、MIME、内容签名、恶意内容和空文件校验。大小上限来自服务端正式配置，客户端不得覆盖；当前最小开发配置为 10 MiB，不在 DTO 中固化为可变业务规则。

### 5.3 Response

HTTP `201`，统一 Envelope 的 `data` 为完整 `AttachmentResponseDto`，并含本次创建的一个 Link。响应不返回文件内容、Storage Key 或永久 URL。

### 5.4 幂等、事务与 Storage

- Idempotency：必需，依赖 DCR-004/API CR-004；
- Canonical Request Hash：API ID、认证主体、规范路径、对象/明细、Category、敏感值、排序及服务端 SHA-256；
- 相同 Key/相同 Hash：每次重验用户状态和读取权限后重放首次安全结果；
- 相同 Key/不同 Hash：`409 SECURITY_REPLAY_DETECTED`；
- 禁止进程内 Map 作为生产实现。

执行边界：

```text
认证/权限/对象/Category/文件校验
→ 幂等原子认领
→ Storage store
→ 数据库事务：attachments + attachment_links + audit
→ 幂等终态
```

Storage 成功而数据库事务失败：对新对象执行 Soft Delete 与 Physical Delete；补偿失败必须审计并返回 Storage 系统错误，不得形成虚假成功。数据库事务提交后幂等终态失败：先对账已创建 Attachment，再由通用幂等恢复机制补写结果，不得重复上传。

### 5.5 Error 与 Audit

适用：

- `ATTACHMENT_FILE_UNSAFE`；
- `VALIDATION_ATTACHMENT_OBJECT_TYPE_UNSUPPORTED`；
- `VALIDATION_ATTACHMENT_CATEGORY_UNSUPPORTED`；
- `VALIDATION_ATTACHMENT_CATEGORY_OBJECT_MISMATCH`；
- 各对象既有 Not Found / Permission / State 错误；
- `CONFLICT_ATTACHMENT_LINK_DUPLICATE`；
- `SECURITY_REPLAY_DETECTED`；
- Storage 三类系统错误。

Audit Event：`attachment.upload.succeeded`、`attachment.upload.failed`、适用的 `attachment.storage.compensation_failed`。

## 6. `ATT-002` 附件列表

- Method/Path：`GET /api/v1/attachments`；
- Authentication：必需；
- Permission：`attachment.file.read` 与目标对象读权限；
- Header：`Authorization`，可选 `X-Request-ID`、`X-Client-Type`；
- Body：无；
- Transaction：只读一致性查询；
- Storage Failure Handling：列表不访问文件本体，不因 Storage 暂时不可用泄露内部状态。

`AttachmentListQueryDto`：

| 字段 | 必填 | 规则 |
| --- | --- | --- |
| `objectType` | 是 | 封闭值 |
| `objectId` | 是 | UUID |
| `objectItemId` | 否 | UUID |
| `attachmentCategory` | 否 | 封闭值 |
| `page` | 否 | 默认 1 |
| `pageSize` | 否 | 默认 20，最大 100 |
| `sortBy` | 否 | `uploadedAt`、`originalFilename`、`sortOrder` |
| `sortOrder` | 否 | `asc` 或 `desc`；默认 `uploadedAt desc, id desc` |

只返回 `active` 且当前用户可见的附件。敏感附件无字段权限时从结果及 `total` 中完全过滤。成功 `data.items` 为 `AttachmentResponseDto[]`，`meta` 使用统一分页。

Audit：普通列表按风险记录；敏感筛选、越权和异常必须记录。Idempotency：不适用。

## 7. `ATT-003` 附件详情

- Method/Path：`GET /api/v1/attachments/{attachmentId}`；
- Authentication：必需；
- Permission：`attachment.file.read`；敏感附件额外 `field.attachment-sensitive.read`；
- Path：`attachmentId` UUID；
- Query/Body/Pagination：无；
- Response：统一 Envelope，`data` 为 `AttachmentResponseDto`；
- Data Scope：至少一个当前可见 Link 的对象范围；不存在可见 Link 时默认拒绝；
- Transaction：只读；
- Storage：读取技术 Metadata 并校验 Checksum/Size/MIME/Extension 一致，但不读取全部文件内容；
- Error：Attachment Not Found、Permission、状态冲突、Storage Not Found/Integrity；
- Audit：`attachment.metadata.read`；敏感读取和拒绝必记；
- Idempotency：不适用。

## 8. `ATT-004` 下载附件

- Method/Path：`GET /api/v1/attachments/{attachmentId}/download`；
- Authentication：必需；
- Permission：`attachment.file.download`、至少一个目标对象读权限；敏感附件额外 `field.attachment-sensitive.read`；
- Path：`attachmentId` UUID；
- Query/Body/Pagination：无；
- Idempotency：不适用；
- Transaction：下载授权和状态读取使用只读一致性边界；开始 Streaming 前再次确认 `active`。

成功使用流式二进制响应：

- HTTP `200`；
- `Content-Type` 为已验证 MIME；
- `Content-Length` 为正式文件大小；
- `Content-Disposition: attachment`，只使用安全编码的原文件名；
- `X-Request-ID`；
- 不使用 JSON Envelope，不返回永久 URL、Storage Key 或路径。

Storage 只允许通过 `stream()`；Soft Delete、缺失、完整性异常分别映射状态或 Storage 系统错误。下载开始前写 `attachment.download.allowed` 审计；拒绝写 `attachment.download.denied`。若审计失败，不开始响应流。

## 9. `ATT-005` 创建关联

- Method/Path：`POST /api/v1/attachments/{attachmentId}/links`；
- Authentication：必需；
- Permission：`attachment.file.link`、目标对象写权限；敏感附件还需敏感字段权限；
- Header：`Authorization`、`Idempotency-Key`，可选 `X-Request-ID`；
- Path：`attachmentId` UUID；
- Pagination：不适用。

`CreateAttachmentLinkDto`：

| 字段 | 必填 | 规则 |
| --- | --- | --- |
| `objectType` | 是 | 封闭值；`import_task` 禁止外部关联 |
| `objectId` | 是 | UUID |
| `objectItemId` | 否 | UUID 且属于主对象 |
| `attachmentCategory` | 是 | 封闭值且与对象兼容 |
| `sortOrder` | 否 | 非负整数，默认 0 |

只允许 `active` Attachment。数据库事务内锁定 Attachment、验证对象/明细/状态/范围、写 Link 和 Audit。唯一冲突返回 `CONFLICT_ATTACHMENT_LINK_DUPLICATE`。成功 HTTP `201`，`data` 为最新 `AttachmentResponseDto`。

同 Key 同请求重放首次结果；同 Key 不同请求返回 `SECURITY_REPLAY_DETECTED`。本接口不访问或复制 Storage Object。

Audit：`attachment.link.created`、`attachment.link.rejected`。

## 10. `ATT-006` 解除关联

- Method/Path：`POST /api/v1/attachments/{attachmentId}/links/unlink`；
- Authentication：必需；
- Permission：`attachment.file.unlink`、目标对象写权限；敏感附件额外敏感字段权限；
- Header：`Authorization`、`Idempotency-Key`，可选 `X-Request-ID`；
- Path：`attachmentId` UUID。

`UnlinkAttachmentDto`：

| 字段 | 必填 | 规则 |
| --- | --- | --- |
| `attachmentLinkId` | 是 | UUID，必须属于 Path Attachment |
| `reason` | 是 | 去除首尾空白后非空，最长 500 |

事务内锁定 Attachment/Link、重新验证对象范围和保护点。证据类或已进入正式历史的 Link 返回 `STATE_ATTACHMENT_HISTORY_PROTECTED`。成功删除指定 Link，不影响其他 Link，不自动删除 Attachment 或 Storage；HTTP `200` 的 `data` 返回最新 `AttachmentResponseDto`。

Audit：`attachment.link.unlinked`、`attachment.link.unlink_denied`。Storage Failure Handling：不访问 Storage。Idempotency：依赖通用持久化实现。

## 11. `ATT-007` 删除附件

- Method/Path：`POST /api/v1/attachments/{attachmentId}/delete`；
- Authentication：必需；
- Permission：`attachment.file.delete`，并重新验证所有历史 Link 的对象范围；敏感附件额外敏感字段权限；
- Header：`Authorization`、`Idempotency-Key`，可选 `X-Request-ID`；
- Path：`attachmentId` UUID；
- Query/Pagination：无。

`DeleteAttachmentDto`：

| 字段 | 必填 | 规则 |
| --- | --- | --- |
| `reason` | 是 | 去除首尾空白后非空，最长 500 |
| `version` | 是 | 最近详情返回的 ISO 8601 `updatedAt` |

删除流程：

```text
锁定 Attachment
→ 校验版本、状态、零关联、证据保护、权限与范围
→ 必需删除请求审计
→ Attachment: soft_deleted
→ Storage Soft Delete
→ Attachment: pending_physical_delete
→ Storage Physical Delete
→ Attachment: physically_deleted
→ 删除结果审计
```

- 仍有 Link：`STATE_ATTACHMENT_STILL_REFERENCED`；
- 证据/保留保护：`STATE_ATTACHMENT_HISTORY_PROTECTED`；
- 非法状态/版本竞争：`STATE_ATTACHMENT_ACTION_NOT_ALLOWED`；
- Storage Soft Delete 失败：回滚 Attachment 状态，不宣告成功；
- Physical Delete 失败：写 `physical_delete_failed` 和失败审计，返回 `SYSTEM_ATTACHMENT_STORAGE_DELETE_FAILED`；
- `physical_delete_failed` 可由同一删除动作和新 Idempotency Key 安全重试；
- `physically_deleted` 的同一业务请求幂等返回既有墓碑摘要，不再次调用 Storage。

成功 HTTP `200`，`data`：

```json
{
  "attachmentId": "uuid",
  "status": "physically_deleted",
  "deleted": true
}
```

Audit：`attachment.delete.requested`、`attachment.soft_deleted`、`attachment.physical_delete.succeeded`、`attachment.physical_delete.failed`、`attachment.delete.denied`。

本期不实现 Worker；`pending_physical_delete` 与 `physical_delete_failed` 只支持同步动作、对账及后续获批任务。

## 12. `ATT-008` 生命周期

- Method/Path：`GET /api/v1/attachments/{attachmentId}/lifecycle`；
- Authentication：必需；
- Permission：`attachment.file.read`、`audit.log.read`、至少一个目标对象读权限；敏感附件额外敏感字段权限；
- Header：`Authorization`，可选 `X-Request-ID`；
- Path：`attachmentId` UUID；
- Query/Body/Pagination：无；
- Idempotency：不适用；
- Transaction：Attachment、Link 和 Audit 使用只读一致性快照；
- Storage：只检查 Metadata/存在性，不读取文件内容。

`AttachmentLifecycleEventDto`：

| 字段 | 类型 |
| --- | --- |
| `event` | 已批准 Attachment Audit Event |
| `occurredAt` | ISO 8601 |
| `operator` | 用户安全摘要或系统 |
| `result` | `succeeded`、`failed`、`denied` |
| `objectType` | 可见时的 Object Type 或 `null` |
| `objectId` | 可见时的 UUID 或 `null` |
| `reason` | 安全、脱敏原因或 `null` |
| `requestId` | Request ID |

`AttachmentLifecycleResponseDto`：

```text
attachmentId
status
version
storageAvailability: available | unavailable
activeLinkCount
protected
events[]
```

`events` 从 `attachments`、当前/历史 Audit 和可见 Link 派生，不新增历史表，不伪造缺失事件。Storage 不一致返回相应系统错误，不在成功响应暴露内部损坏细节。

Audit：`attachment.lifecycle.read`、拒绝和异常事件。

## 13. 删除与保留执行矩阵

| 场景 | 解除关联 | Attachment Soft Delete | Storage Soft Delete | Storage Physical Delete | 恢复 | 审计 |
| --- | --- | --- | --- | --- | --- | --- |
| 仍有其他有效关联 | 只可解除指定非保护 Link | 禁止 | 禁止 | 禁止 | 不适用 | 必需 |
| 同一附件关联多个对象 | 每个对象独立鉴权 | 全部合法解除前禁止 | 禁止 | 禁止 | 不适用 | 必需 |
| 证据类且已到保护点 | 禁止 | 禁止 | 禁止 | 禁止 | 不适用 | 拒绝必记 |
| 敏感附件 | 需 unlink + sensitive 权限 | 需 delete + sensitive 权限 | 同左 | 同左 | 无外部恢复 | 必需 |
| Import 源文件 | 外部禁止 | 外部禁止 | 外部禁止 | 外部禁止 | 不适用 | 查询/拒绝必记 |
| Import 错误报告 | 外部禁止 | 外部禁止 | 外部禁止 | 外部禁止 | 不适用 | 查询/拒绝必记 |
| 零关联普通附件 | 不适用 | delete 权限后允许 | Soft Delete 后允许 | 审计成功后允许 | 对外不允许 | 必需 |
| Attachment 已 `soft_deleted` | 不适用 | 幂等 | 已完成 | 可进入 pending | 只限未成功请求内部补偿 | 必需 |
| Storage 已 Soft Delete | 不适用 | 保持一致 | 幂等 | 条件满足后允许 | 只限内部补偿 | 必需 |
| Physical Delete 失败 | 不适用 | 已完成 | 保持不可访问 | 同一删除动作可重试 | 禁止恢复下载 | 失败必记 |
| 审计写入失败 | 不执行或补偿回滚 | 不得宣告成功 | 不得宣告成功 | 不得宣告成功 | 按真实状态补偿 | 返回系统失败 |

当前无后台任务。若未来需要自动扫描或重试 `pending_physical_delete`/`physical_delete_failed`，必须在 Task 7.6 或独立 DCR/API CR 中批准。

## 14. Error Code

### 14.1 复用

| 错误码 | 用途 |
| --- | --- |
| `RESOURCE_ATTACHMENT_NOT_FOUND` | Attachment 不存在或不可见 |
| 各对象既有 `RESOURCE_*_NOT_FOUND` | 目标业务对象不存在或不可见 |
| `ATTACHMENT_FILE_UNSAFE` | 文件名、大小、MIME、Extension、签名或内容不安全 |
| `STATE_ATTACHMENT_HISTORY_PROTECTED` | 证据或正式历史禁止解除/删除 |
| `PERMISSION_ATTACHMENT_DENIED` | Attachment、对象或敏感字段权限不足 |
| `SECURITY_REPLAY_DETECTED` | 幂等 Key 冲突或处理中重放 |
| `SYSTEM_SERVICE_UNAVAILABLE` | Attachment 依赖整体暂不可用 |

### 14.2 建议新增

| 错误码 | HTTP | 含义 |
| --- | ---: | --- |
| `VALIDATION_ATTACHMENT_OBJECT_TYPE_UNSUPPORTED` | 422 | Object Type 不属于封闭集合 |
| `VALIDATION_ATTACHMENT_CATEGORY_UNSUPPORTED` | 422 | Category 不属于封闭集合 |
| `VALIDATION_ATTACHMENT_CATEGORY_OBJECT_MISMATCH` | 422 | Category 不允许关联目标对象或明细 |
| `CONFLICT_ATTACHMENT_LINK_DUPLICATE` | 409 | 相同 Attachment/Object/Item/Category 已关联 |
| `STATE_ATTACHMENT_STILL_REFERENCED` | 409 | Attachment 仍有一个或多个有效 Link |
| `STATE_ATTACHMENT_ACTION_NOT_ALLOWED` | 409 | 当前 Attachment 状态或版本不允许动作 |
| `SYSTEM_ATTACHMENT_STORAGE_OBJECT_NOT_FOUND` | 503 | 正式记录存在但 Storage Object 缺失 |
| `SYSTEM_ATTACHMENT_STORAGE_INTEGRITY_ERROR` | 500 | Storage 二进制与 Metadata/正式记录不一致 |
| `SYSTEM_ATTACHMENT_STORAGE_DELETE_FAILED` | 503 | Storage 删除失败，状态已安全保留以供对账 |

错误详情不得返回 Storage Key、路径、Checksum 差异、SQL、堆栈或无权对象信息。

## 15. Audit Event

建议封闭 Attachment Audit Event：

```text
attachment.upload.succeeded
attachment.upload.failed
attachment.metadata.read
attachment.download.allowed
attachment.download.denied
attachment.link.created
attachment.link.rejected
attachment.link.unlinked
attachment.link.unlink_denied
attachment.delete.requested
attachment.delete.denied
attachment.soft_deleted
attachment.physical_delete.succeeded
attachment.physical_delete.failed
attachment.storage.compensation_failed
attachment.lifecycle.read
```

每项记录 Request ID、操作者、Attachment ID、适用对象/明细、Category、结果和脱敏原因；不得记录文件内容、Token、Storage 凭证或真实路径。

## 16. ATT-001 与通用幂等

正式推荐方案 A，不采用 Attachment 专用表：

- Task 7.4 只接入通用 `IdempotencyAdapter`；
- 持久化、租约、首次结果和恢复由 DCR-004/API CR-004 及 Task 7.5 统一提供；
- 文件 SHA-256 必须参与 Canonical Request Hash；
- Attachment 专用进程内 Map 禁止用于生产；
- DCR-004/API CR-004 未批准前，`ATT-001`、`ATT-005`、`ATT-006`、`ATT-007` 不能达到 Frozen 契约完成条件。

本提案不批准 DCR-004/API CR-004，也不启动 Task 7.5。

## 17. 测试影响

批准并正式同步后至少验证：

- 每个 DTO 的 Header、Path、Query、Body、multipart、分页和错误；
- 17 个 Object Type 的存在性、明细归属、状态、权限与数据范围；
- 10 个 Category 的兼容、敏感和证据保护；
- 5 个 Attachment 状态与合法迁移；
- ATT-001 同 Key 同/不同 Hash、首次结果重放及 Storage 补偿；
- 重复 Link 的 PostgreSQL 原子裁决；
- 敏感列表不泄露 Metadata/total；
- 流式下载、重新鉴权和 Storage 完整性失败；
- 多 Link、保护 Link、零 Link 删除；
- Physical Delete 失败状态及安全重试；
- ATT-001 至 ATT-008 全量 HTTP Integration；
- PostgreSQL 18.4 Repository Integration；
- SEC-001 至 SEC-005、Task 7.3 Storage 与既有业务 API 回归。

## 18. 批准 Gate

项目负责人需确认：

1. 17 个 Object Type；
2. 10 个 Category；
3. ATT-001 至 ATT-008 全部 DTO；
4. 流式下载响应；
5. 删除、墓碑和保留矩阵；
6. 9 个新增错误码；
7. 16 个 Attachment Audit Event；
8. 方案 A 及 DCR-004/API CR-004 前置依赖；
9. API v1.5 建议版本与总数 335 不变。

当前状态：**Proposed / Pending Approval**。批准前不得修改 API_SPEC、业务代码、Route、Service、Repository、测试、数据库或 Storage。
