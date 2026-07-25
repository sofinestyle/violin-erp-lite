---
document_name: API Change Request 006 Implementation Record
project: Violin ERP Lite
version: 1.0
status: Completed / Approved
owner: Project Manager
created_date: 2026-07-25
updated_date: 2026-07-25
related_phase: Phase 8
---

# API Change Request 006 Implementation Record

## 1. CR编号

API Change Request 006：Product Attachment Object Type。

## 2. 批准状态

Approved。

- Approved By: Project Manager
- Approval Date: 2026-07-25
- Approval Record：`docs/00-governance/API_CHANGE_REQUEST_006_APPROVAL_RECORD.md`

## 3. 实施 Commit

本实施记录随提交 `docs: implement api change request 006` 写入 GitHub SSOT。最终 Commit SHA 以该提交的 Git 记录为准。

## 4. 修改文件

1. `docs/05-api/API_SPEC.md`
2. `docs/00-governance/API_CHANGE_REQUEST_006_IMPLEMENTATION_RECORD.md`

## 5. API影响

API SSOT 已完成以下同步：

1. API Master Specification 更新为 v1.6；
2. `AttachmentObjectType` 新增允许值：`product`；
3. Attachment Object Registry 新增 `product` → `products` 映射；
4. `product` 权限资源映射为 `master.product`；
5. `general_business_document` 允许关联 `product`；
6. Evidence、Voucher、Import 类 Attachment Category 禁止关联 Product；
7. `ATT-001`、`ATT-002`、`ATT-005`、`ATT-006` 同步说明 `objectType = product` 的合法使用边界；
8. 正式 API 数量保持 335；
9. 未新增 API Path、Method、DTO 字段、Response 字段、Pagination 字段或 Error Code。

## 6. Database影响

Database Impact：Not Required。

本次未修改：

1. Database Schema；
2. Migration；
3. Prisma Schema；
4. `attachments`；
5. `attachment_links`；
6. Database Check Value。

## 7. Permission影响

Permission Impact：Not Required。

本次未修改 `ROLE_PERMISSION_SPEC.md`，未新增 Permission Code。Product Attachment 继续复用：

1. `attachment.file.read`；
2. `attachment.file.download`；
3. `attachment.file.upload`；
4. `attachment.file.link`；
5. `attachment.file.unlink`；
6. `master.product.read`；
7. `master.product.update`；
8. `field.attachment-sensitive.read`。

## 8. 测试结果

本阶段为 API SSOT 同步，不实现运行时代码，不新增业务测试。

已执行：

1. `pnpm status:check`；
2. `git diff --check`。

验证结论：

1. 项目状态一致性检查通过；
2. Markdown / diff whitespace 检查通过；
3. 未修改代码、数据库、Migration、Permission Spec 或业务规则。
