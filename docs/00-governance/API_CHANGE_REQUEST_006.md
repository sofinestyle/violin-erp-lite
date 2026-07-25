---
document_name: API Change Request 006：Product Attachment Object Type
project: Violin ERP Lite
version: 1.0
status: Proposed / Pending Approval
owner: Project Manager
created_date: 2026-07-25
updated_date: 2026-07-25
related_phase: Phase 8
---

# API Change Request 006：Product Attachment Object Type

## 1. Change Reason

Phase 8 Task `8-B2-2 Master Data Development - Core` 要求 Product 支持产品附件关联。

当前 Frozen API Master Specification v1.5 的 Attachment Framework 使用封闭 `AttachmentObjectType` 集合。该集合包含采购、生产、质检、入库、出库、库存、跨境和 Import 等 17 类对象，但不包含 `product`。

因此，如需实现产品附件关联，必须先扩展 Attachment Object Type 契约。不得在代码中直接接受 `product`，否则会违反：

1. Frozen API Contract；
2. Attachment Object Registry 封闭集合；
3. 未知 Object Type 必须在访问数据库前拒绝的安全规则；
4. Task 8-B2-2 禁止新增未批准 API / 修改 DTO 的约束。

## 2. Current Contract

API Master Specification v1.5 当前 `AttachmentObjectType` 封闭集合不包含：

```text
product
```

当前 `general_business_document` Category 允许对象为“除 `import_task` 外全部可写对象”，但其前提是对象已经存在于 `AttachmentObjectType` 正式集合。

由于 `product` 不在正式集合中，现有 `ATT-001` 上传并关联附件、`ATT-002` 附件列表、`ATT-005` 新增附件关联和 `ATT-006` 解除附件关联均不能合法用于产品。

## 3. Proposed Change

### 3.1 Add Attachment Object Type

建议新增：

```text
product
```

正式对象：

```text
products
```

权限资源：

```text
master.product
```

### 3.2 Object Registry Mapping

新增 Registry Entry：

| Object Type | 正式对象 | 权限资源 | 数据范围与写入边界 |
| --- | --- | --- | --- |
| `product` | `products` | `master.product` | 产品主数据；新增/修改/启用/停用受基础资料权限控制；已被业务引用后保护历史可读 |

Registry 必须提供：

1. 产品存在性校验；
2. 产品可见性校验；
3. 产品启用 / 停用状态读取；
4. 产品读写权限校验；
5. 数据范围校验；
6. 产品附件保护点判断；
7. 审计所需对象摘要。

### 3.3 Category Matrix

建议允许：

| Attachment Category | 是否允许 `product` | 说明 |
| --- | --- | --- |
| `general_business_document` | 是 | 用于产品图片、产品资料、规格资料等普通产品附件 |
| 其他 Evidence / Voucher / Import 类 Category | 否 | 不用于产品主数据附件 |

### 3.4 DTO Impact

涉及 DTO：

1. `AttachmentObjectType` 允许值新增 `product`；
2. `AttachmentLinkDto.objectType` 可返回 `product`；
3. `ATT-001` / `ATT-002` / `ATT-005` / `ATT-006` 可在合法情况下接收 `objectType = product`；
4. 响应结构字段不变；
5. 分页结构不变；
6. 错误响应结构不变。

### 3.5 Error Code Impact

不建议新增错误码。

仍复用：

1. `VALIDATION_ATTACHMENT_OBJECT_TYPE_UNSUPPORTED`；
2. `VALIDATION_ATTACHMENT_CATEGORY_UNSUPPORTED`；
3. `VALIDATION_ATTACHMENT_CATEGORY_MISMATCH`；
4. `PERMISSION_ATTACHMENT_DENIED`；
5. `PERMISSION_DATA_SCOPE_DENIED`；
6. `RESOURCE_ATTACHMENT_OBJECT_NOT_FOUND`；
7. `STATE_ATTACHMENT_OBJECT_PROTECTED`；
8. `CONFLICT_ATTACHMENT_LINK_DUPLICATE`。

## 4. Permission Impact

不新增 Permission Code。

建议复用：

| Operation | Required Permission |
| --- | --- |
| 产品附件读取 | `attachment.file.read` + `master.product.read` |
| 产品附件下载 | `attachment.file.download` + `master.product.read` |
| 产品附件上传并关联 | `attachment.file.upload` + `attachment.file.link` + `master.product.update` |
| 产品新增附件关联 | `attachment.file.link` + `master.product.update` |
| 产品解除附件关联 | `attachment.file.unlink` + `master.product.update` |
| 敏感产品附件读取 | 追加 `field.attachment-sensitive.read` |

Permission CR：Not Required。

## 5. Database Impact

当前 `attachment_links.object_type` 为 `varchar(50)`，数据库层不使用 PostgreSQL Enum。

本 CR 默认不需要新增表、字段、索引、外键或 Migration。

Database CR：Not Required。

前提：

1. 不为产品附件新增专用表；
2. 不修改 `attachments` 或 `attachment_links` 结构；
3. 不新增数据库 Check Value；
4. 只在 API Contract、Object Registry 与运行时映射中允许 `product`。

## 6. API Impact Assessment

API CR：Required。

原因：

1. `AttachmentObjectType` 是 Frozen API Contract 的封闭集合；
2. 新增 `product` 改变 DTO 允许值；
3. Attachment Category 允许对象矩阵需要同步；
4. Attachment Object Registry 需要增加正式映射；
5. Product 附件关联属于 Phase 8 业务应用开发对 Phase 7 Attachment Framework 的正式扩展接入。

## 7. Implementation Impact

批准后需同步：

1. `docs/05-api/API_SPEC.md`；
2. Attachment Object Type 类型定义；
3. Attachment Category Matrix；
4. Attachment Object Registry；
5. Product Object Reader 映射；
6. Product 附件关联测试；
7. Task 8-B2-2 Master Data Core Implementation 文档。

不得在本 CR 批准前实现 `objectType = product`。

## 8. Approval Required

需要项目负责人批准：

1. 是否允许 Product 成为 Attachment Object Type；
2. 是否仅允许 `general_business_document` Category 关联 Product；
3. 是否复用 `master.product.update` 作为产品附件写权限；
4. 是否确认不新增数据库对象；
5. 是否确认不新增 Permission Code；
6. 是否授权 Task 8-B2-2 在批准后继续实现 Product 附件关联。

## 9. Current Task Impact

Task `8-B2-2 Master Data Development - Core` 当前受阻于 Product 附件关联契约不足。

在本 CR 批准前：

1. 不得修改 API Spec；
2. 不得修改 Attachment Object Type 代码；
3. 不得修改 Attachment Object Registry；
4. 不得实现 Product 附件关联；
5. 不得以自由文本 `objectType = product` 绕过封闭 Registry。

Category、Brand、Product、SKU 的非附件基础 CRUD 能力已有既有实现基础，但本任务包含 Product 附件关联，因此建议先批准或拒绝本 CR 后再继续完整实现与验收。
