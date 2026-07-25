---
document_name: Task 7.3 Object Storage & File Lifecycle Report
project: Violin ERP Lite
version: 1.1
status: Completed / Approved
owner: Project Manager
created_date: 2026-07-25
updated_date: 2026-07-25
related_phase: Phase 7
---

# Task 7.3：Object Storage & File Lifecycle Report

## 1. 修改范围

本 Task 建立统一 Object Storage 平台契约、Local Storage 实现和文件生命周期边界，复用现有上传校验，不新增业务模块。

完成范围：

- 统一 `store`、`read`、`stream`、`exists`、`delete`、`metadata`、`generateUrl`；
- 建立技术对象 Metadata 的唯一来源；
- 建立 Active、Soft Delete 与 Physical Delete 生命周期；
- 保留 Local Storage 作为默认实现；
- 为未来 S3、OSS 与 MinIO Adapter 保留同一接口和 URL Strategy；
- 增加 Adapter、Metadata、Streaming、URL、Local Storage 与 Lifecycle 自动化测试。

本 Task 不修改 Database、Prisma Schema、Migration、Mapping Audit、Frozen API、权限规格或业务规则。

## 2. Adapter 架构

统一 `ObjectStorageAdapter` 由平台层定义，业务层不得直接访问文件系统。正式契约包含：

- `store()`；
- `read()`；
- `stream()`；
- `exists()`；
- `delete()`；
- `metadata()`；
- `generateUrl()`；
- `activate()`；
- `softDelete()`；
- `list()`；
- `planCleanup()`。

Local Storage 只负责二进制对象、技术 Metadata、存储安全和生命周期动作；正式附件记录、关联、对象权限、保留策略和审计不属于本 Task。现有 `createLocalUploadStorage()` 保留为指向同一实现的兼容入口，不形成第二套 Adapter。

## 3. 生命周期

生命周期边界为：

```text
Upload
→ Active
→ Soft Delete
→ Physical Delete
```

Upload 原子写入二进制和技术 Metadata，成功后进入 Active。Soft Delete 原子更新 Metadata，使对象不可读、不可流式读取且不可生成 URL；`activate()` 可在业务保留规则允许时恢复 Active；Physical Delete 删除二进制与技术 Metadata。

本 Task 不新增数据库状态。Storage 层只持久化 `active` 与 `soft_deleted` 两个技术状态；Upload 是创建动作，Physical Delete 是无本地 Metadata 留存的终止动作。

`planCleanup()` 接受外部正式引用集合，只生成以下只读清理计划，不自动删除：

- 有二进制但无 Metadata；
- 有 Metadata 但无二进制；
- 技术对象完整但未被正式来源引用。

正式引用必须由后续 Task 7.4 从 Frozen `attachments.storage_reference` 提供。当前没有后台 Worker，也没有自动物理删除。

## 4. Metadata

统一技术 Metadata 至少包含：

- Storage Key；
- Original Filename；
- MIME Type；
- Extension；
- Size；
- SHA-256；
- Created Time；
- Updated Time；
- 当前 Storage 生命周期状态。

Checksum 在上传校验时计算一次，Storage 层持久化并复用，不在业务层重复计算。Local Storage 使用同目录内受保护的技术 Metadata 文件作为自身唯一来源；加载时检查 Storage Key、扩展名、大小、时间顺序、生命周期、二进制存在性及 `0600` 权限。

正式 `attachments` 业务元数据继续以 Frozen Database 为唯一来源。Task 7.4 只能做字段映射和正式持久化，不得重新计算或建立平行文件 Metadata。

## 5. URL Strategy

`generateUrl()` 通过可注入 `StorageUrlStrategy` 生成，不允许业务层拼接 URL。Local 使用 `createPathStorageUrlStrategy()`；未来 S3、OSS 与 MinIO 实现同一 Strategy 接口即可替换。

生成前必须提供已授权访问上下文，未授权或 Soft Delete 对象拒绝生成；Strategy 只允许返回合法 HTTP(S) URL，不返回 Local Root Path。Storage 层不替代 Task 7.4 的附件权限校验，Task 7.4 仍须在每次下载前重新鉴权。

## 6. Streaming

`stream()` 使用 Node `FileHandle.createReadStream()`，不一次性读取整个文件。打开前检查对象状态和 Metadata，流式读取与具体 Storage Adapter 解耦，调用方只依赖统一 `Readable`。

## 7. Local Storage

Local Storage 保持：

- 随机、不透明 Storage Key；
- 路径穿越防护；
- 原子排他写入；
- 文件与 Metadata 权限 `0600`；
- 不暴露真实根目录。

并补齐读取、流式读取、存在性、Metadata、一致性校验、URL Strategy、生命周期、对象清单和只读清理计划能力。

不存在的完整对象统一抛出 `ObjectStorageNotFoundError`；不安全引用、未授权 URL 和 Soft Delete 访问统一使用 `ObjectStorageAccessError`；二进制、Metadata 或权限不一致使用 `ObjectStorageIntegrityError`。这些是平台内部错误类型，不新增 Frozen API ErrorCode。

## 8. 与 Task 7.4 的边界

本 Task 不实现：

- Attachment API、Route、Service 或 Repository；
- `attachments`、`attachment_links` 的数据库读写；
- 业务对象关联；
- 附件权限与敏感字段权限；
- 附件审计；
- 正式证据保留与删除裁决。

Task 7.4 必须在服务端完成正式对象权限、数据范围、敏感附件权限、保留策略和审计后，才可调用本 Task 的 Storage 能力。

## 9. 测试结果

Node v22.23.1 下完成：

| 测试范围 | 结果 |
| --- | --- |
| 上传安全校验 | PASS |
| Adapter 统一接口与兼容入口 | PASS |
| Metadata 唯一来源与一致性 | PASS |
| `read()` 与 `stream()` | PASS |
| URL Strategy 与授权边界 | PASS |
| Active、Soft Delete、恢复、Physical Delete | PASS |
| 路径穿越与 `0600` 权限 | PASS |
| 孤儿与未引用对象清理计划 | PASS |
| API Package | PASS：10 files / 64 tests |
| 项目质量门禁 | PASS：status、format、lint、typecheck、test、build、diff |

本 Task 不访问数据库，未新增 PostgreSQL 测试；PostgreSQL 18.4 正式开发基线保持不变。

## 10. 剩余风险

1. 当前只有 Local Storage 实现；S3、OSS 与 MinIO 只完成 Adapter 和 URL Strategy 替换边界；
2. Local 技术 Metadata 与二进制仍受单机文件系统故障域影响，生产 Adapter 必须提供等价原子性和一致性；
3. `planCleanup()` 只生成计划，正式引用来源、保留规则、操作者、审计和执行属于 Task 7.4 或后续 Background Job；
4. Physical Delete 不保留 Storage 层历史，正式删除裁决和审计必须在调用前由 Task 7.4 完成；
5. URL Strategy 的 `authorized` 上下文必须由服务端权限层生成，客户端输入不得直接映射。

## 11. 批准结论

项目负责人已完成 Task 7.3 的 GitHub 技术验收。Task 7.3 的 Adapter、Metadata、URL Strategy、Lifecycle、Streaming、Local Storage、测试和报告正式更新为 Completed / Approved。

Phase 7 保持 In Progress，Current Task 切换为 Task 7.4 Attachment Framework，状态为 In Progress。本次只同步治理状态，不实施 Attachment 或 Storage 代码。

Task 7.4 首要处理事项为：

1. 接入 Frozen `attachments` 与 `attachment_links`；
2. 实现 `ATT-001` 至 `ATT-008` 已冻结接口；
3. 建立 Attachment Route、Service、Repository；
4. 上传后正式记录必须复用 Task 7.3 Storage Metadata；
5. 每次下载必须重新进行权限和数据范围校验；
6. 实现业务对象关联、敏感附件权限和删除保护；
7. 完成附件操作审计与 Storage 删除补偿；
8. 不得修改 Frozen API 契约；
9. 如数据库现有字段不足，必须停止并提出 DCR；
10. 不得提前实现 Task 7.5 通用幂等或 Task 7.6 后台清理 Worker。
