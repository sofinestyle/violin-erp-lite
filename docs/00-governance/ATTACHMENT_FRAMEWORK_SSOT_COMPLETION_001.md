---
document_name: Attachment Framework SSOT Completion 001
project: Violin ERP Lite
version: 1.0
status: Proposed / Pending Approval
owner: Project Manager
created_date: 2026-07-25
updated_date: 2026-07-25
related_phase: Phase 7
---

# Attachment Framework SSOT Completion 001

> 本文件是 Task 7.4 Attachment Framework 的 SSOT 补齐提案，不是已批准规范。Database Logical Design v2.1 与 API Master Specification v1.3 继续保持 Completed / Approved / Frozen；在本提案、DCR-005、API CR-005 及其依赖完成批准和正式同步前，不得恢复 Attachment Framework 实现。

## 1. 审计结论

Task 7.4 实现前审计确认：

1. Frozen `attachments`、`attachment_links`、6 个 `attachment.file.*` 权限及 `field.attachment-sensitive.read` 可以作为统一 Attachment Framework 的数据和权限基础；
2. `attachments.status` 为必填字符串，但 Database v2.1 未定义允许值、默认值或 Check；
3. `ATT-001` 至 `ATT-008` 已冻结编号、路径、方法和高层语义，但未形成可执行 Request/Response DTO；
4. `attachment_links.object_type` 与 `attachment_category` 均为字符串，现有 SSOT 未形成封闭值域；
5. 历史保护原则已存在，但解除关联、Attachment Soft Delete、Storage Soft Delete、Storage Physical Delete 和补偿失败没有可执行矩阵；
6. Frozen API 只有 4 个附件专项错误码，无法稳定表达全部已批准失败边界；
7. `ATT-001` 要求生产级首次结果重放，但通用持久化幂等仍属于 DCR-004/API CR-004 Proposed 内容。

因此 Task 7.4 正式状态继续为 In Progress，实现状态记录为 **Paused / Frozen SSOT Conflict**。该实现状态不进入 `CURRENT_STATUS.md`。

## 2. 正式来源

- Database Logical Design v2.1；
- API Master Specification v1.3；
- Frozen `ROLE_PERMISSION_SPEC.md`；
- Task 5.1 附件通用原则；
- Task 5.5 `ATT-001` 至 `ATT-008`、附件统一契约和错误码；
- Task 6.2 统一模块覆盖矩阵；
- Task 6.3 公共能力附件生命周期；
- Task 7.3 Object Storage Adapter、Metadata 与生命周期；
- DCR-004 与 API CR-004（均为 Proposed / Pending Approval）。

## 3. 推荐 Attachment 状态

推荐 `attachments.status` 使用以下最小完整集合：

| 状态 | 含义 | 下载 | 新增关联 | 是否终止 |
| --- | --- | --- | --- | --- |
| `active` | 正式附件记录与 Storage Object 均可用 | 允许，仍须实时鉴权 | 允许，仍须校验对象和类别 | 否 |
| `soft_deleted` | Attachment 已逻辑删除，Storage 已 Soft Delete | 禁止 | 禁止 | 否 |
| `pending_physical_delete` | 已通过删除裁决，正在执行或等待重试 Storage Physical Delete | 禁止 | 禁止 | 否 |
| `physical_delete_failed` | Storage Physical Delete 失败，正式记录保留用于重试和审计 | 禁止 | 禁止 | 否 |
| `physically_deleted` | Storage Object 已物理删除，数据库墓碑记录保留 | 禁止 | 禁止 | 是 |

初始状态为 `active`。正式迁移仅允许：

```text
active
→ soft_deleted
→ pending_physical_delete
→ physically_deleted
```

物理删除失败：

```text
pending_physical_delete
→ physical_delete_failed
→ pending_physical_delete
```

本期不提供恢复 API，因此 `soft_deleted → active` 不属于 `ATT-001` 至 `ATT-008` 的外部动作。Task 7.3 的 `activate()` 只保留为受控补偿原语；如删除事务在对外成功前回滚，可由 Service 内部恢复 Storage，不能形成客户端可调用的新动作。

## 4. Storage 生命周期映射

| Attachment 状态 | Storage 生命周期 | 一致性要求 |
| --- | --- | --- |
| `active` | `active` | 二进制与 Metadata 完整，Checksum/Size/MIME/Extension 一致 |
| `soft_deleted` | `soft_deleted` | Storage 不可读、不可流式读取、不可生成 URL |
| `pending_physical_delete` | `soft_deleted` | 删除前必须保持不可访问 |
| `physical_delete_failed` | `soft_deleted`，或删除结果未知但不可对外访问 | 必须保留失败审计，不得宣告删除成功 |
| `physically_deleted` | 对象与技术 Metadata 均不存在 | 数据库墓碑和审计继续保留 |

`attachments` 继续是正式业务 Metadata 唯一来源，Task 7.3 Storage Metadata 继续是二进制技术 Metadata 唯一来源。业务层不得重复计算 Checksum 或另建 Metadata。

## 5. Object Type 推荐集合

推荐封闭 `AttachmentObjectType`：

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

集合来自 Frozen 采购、生产、质量验收、库存、盘点、入库、出库、销售退货、报损、调拨、跨境和 Import 对象。服务端必须通过封闭 Registry 将代码映射到唯一 Repository、主键、状态、功能权限和数据范围解析器；不得把客户端字符串直接映射为表名或 SQL。

`import_task` 在 Attachment API 中只允许查询、详情、下载和生命周期。Import 源文件与错误报告由正式 Import 流程调用统一 Attachment Service 建立，不允许客户端用 `ATT-001` 或 `ATT-005` 绕过 `IMP-*` 契约。

其他对象可否上传、关联、解除或删除，必须同时由对象当前 Frozen 状态、对象写权限、数据范围和 Attachment Category 决定；对象进入正式历史状态后转为只读或证据保护。

## 6. Attachment Category 推荐集合

推荐封闭 `AttachmentCategory`：

| 代码 | 默认敏感 | 证据类 | 默认删除规则 | 适用对象 |
| --- | --- | --- | --- | --- |
| `general_business_document` | 否 | 否 | 仅对象尚未形成正式历史且解除全部关联后可删 | 除 `import_task` 外全部可写对象 |
| `inspection_evidence` | 否 | 是 | 验收提交或确认后永久保护 | `inspection_order` |
| `inbound_evidence` | 否 | 是 | 入库提交或形成正式库存事实后永久保护 | `inbound_order`、`sales_return`、`transfer_order` |
| `outbound_evidence` | 否 | 是 | 出库提交或形成正式库存事实后永久保护 | `outbound_order`、`purchase_return`、`damage_report`、`transfer_order`、`cross_border_shipment` |
| `inventory_evidence` | 否 | 是 | 提交、执行、完成或形成库存事实后永久保护 | `inventory_adjustment`、`stock_count`、`sales_return`、`damage_report` |
| `import_source_file` | 是 | 是 | Import Task 存在期间不得解除或删除 | `import_task` |
| `import_error_report` | 是 | 是 | 随 Import Task 和审计链保留，不由普通用户删除 | `import_task` |
| `payment_voucher` | 是 | 是 | 付款事实创建后永久保护 | `purchase_payment`、`production_payment` |
| `production_progress_evidence` | 否 | 是 | 进度记录创建后永久保护 | `production_progress_record`、`production_completion_record` |
| `cross_border_shipping_evidence` | 是 | 是 | 发货提交或发运后永久保护 | `cross_border_shipment` |

`is_sensitive` 的正式值为“类别默认敏感”与操作者合法提升标记的逻辑或；客户端不得把默认敏感类别降为普通附件。Category 不使用自由文本，不提供 `other` 兜底。

## 7. 删除与保留结论

1. 解除关联只删除指定 `attachment_links`，不改变其他关联；
2. 任一 Category 已进入证据保护点时，解除关联和附件删除均返回历史保护冲突；
3. 附件仍有一个或多个有效关联时，不允许 Attachment Soft Delete；
4. Attachment Soft Delete 必须先持久化删除裁决和审计，再调用 Storage Soft Delete；
5. Storage Soft Delete 失败时数据库不得宣告 `soft_deleted` 成功；
6. Storage Physical Delete 只允许在零关联、非受保护、Attachment 已 Soft Delete 且审计成功后执行；
7. Physical Delete 失败进入 `physical_delete_failed`，不得伪装成功；
8. 本期不实现 Worker；失败重试只能由同一 `ATT-007` 幂等动作或后续获批后台任务执行；
9. `physically_deleted` 数据库记录作为墓碑保留，避免破坏审计链和 `ATT-008`；
10. 审计写入失败时高风险动作整体失败，并按当前真实 Storage/Database 状态执行同步补偿。

完整矩阵以 DCR-005 与 API CR-005 为准。

## 8. 错误码结论

继续复用：

- `RESOURCE_ATTACHMENT_NOT_FOUND`；
- `ATTACHMENT_FILE_UNSAFE`；
- `STATE_ATTACHMENT_HISTORY_PROTECTED`；
- `PERMISSION_ATTACHMENT_DENIED`；
- 各业务对象既有 `RESOURCE_*_NOT_FOUND`；
- `SECURITY_REPLAY_DETECTED`；
- `SYSTEM_SERVICE_UNAVAILABLE`。

API CR-005 建议新增 9 个代码：

```text
VALIDATION_ATTACHMENT_OBJECT_TYPE_UNSUPPORTED
VALIDATION_ATTACHMENT_CATEGORY_UNSUPPORTED
VALIDATION_ATTACHMENT_CATEGORY_OBJECT_MISMATCH
CONFLICT_ATTACHMENT_LINK_DUPLICATE
STATE_ATTACHMENT_STILL_REFERENCED
STATE_ATTACHMENT_ACTION_NOT_ALLOWED
SYSTEM_ATTACHMENT_STORAGE_OBJECT_NOT_FOUND
SYSTEM_ATTACHMENT_STORAGE_INTEGRITY_ERROR
SYSTEM_ATTACHMENT_STORAGE_DELETE_FAILED
```

敏感附件无权访问继续使用 `PERMISSION_ATTACHMENT_DENIED`，不得用新错误泄露附件存在性。

## 9. ATT-001 幂等裁决

正式推荐 **方案 A**：

1. 先批准并同步 DCR-004；
2. 再批准并同步 API CR-004；
3. 完成通用持久化幂等基础能力；
4. 批准并同步 DCR-005 与 API CR-005；
5. 由项目负责人另行下令恢复 Task 7.4。

Task 7.4 可以依赖通用 `IdempotencyAdapter`，但不得实现其持久化后端。`ATT-001` Canonical Request Hash 必须包含 API ID、认证主体、规范路径、对象类型/ID/明细 ID、Category、敏感标记、排序和服务端计算的文件 SHA-256；同 Key 不同 Hash 返回 `SECURITY_REPLAY_DETECTED`，同 Key 同 Hash重放首次安全结果。

Storage 已成功但业务事务或幂等终态写入失败时，必须 Soft Delete 后 Physical Delete 新对象；删除失败记录审计并保持可识别失败状态。生产级 Attachment 不允许使用进程内 Map，也不建立 Attachment 专用幂等表，以免与 Task 7.5 形成重复平台能力。

## 10. 影响与批准顺序

### 10.1 Database

- 当前正式版本保持 v2.1；
- 若先完成 DCR-004，DCR-005 建议把 Database v2.2 升级为 v2.3；
- DCR-005 不新增表或字段，建议新增 1 个 Check、1 个普通索引及 `status` 默认值；
- Prisma Schema、Forward Only Migration 与 Mapping Audit 仅在批准后的独立同步任务修改；
- Seed 不需要业务数据变更，只需验证任何附件 Seed 使用正式状态。

### 10.2 API

- 当前正式版本保持 v1.3；
- 若先完成 API CR-004，API CR-005 建议把 API v1.4 升级为 v1.5；
- API 数量保持 335；
- 只补全 `ATT-001` 至 `ATT-008`，不新增路径、编号、角色或权限；
- 建议新增 9 个稳定错误码。

### 10.3 Implementation

批准和正式同步后影响 Attachment Route、Service、Repository、Object Registry、Task 7.3 Storage Adapter 接入、Audit Writer、HTTP Integration 与 PostgreSQL Integration。不得修改业务页面或建立第二套 Storage、Metadata、权限或幂等能力。

## 11. 本提案状态

- Attachment Framework SSOT Completion 001：Proposed / Pending Approval；
- Database Change Request 005：Proposed / Pending Approval；
- API Change Request 005：Proposed / Pending Approval；
- DCR-004 / API CR-004：继续 Proposed / Pending Approval；
- Task 7.4：In Progress；
- Task 7.4 实现：Paused / Frozen SSOT Conflict。

本轮未修改 Frozen Database/API、Prisma、Migration、Mapping Audit、业务代码、Storage、Attachment 实现或测试逻辑。
