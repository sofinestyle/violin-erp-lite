---
document_name: API Change Request 006 Approval Record
project: Violin ERP Lite
version: 1.0
status: Approved
owner: Project Manager
created_date: 2026-07-25
updated_date: 2026-07-25
related_phase: Phase 8
---

# API Change Request 006 Approval Record

## 1. CR编号

API Change Request 006：Product Attachment Object Type。

## 2. 原状态

Proposed / Pending Approval。

## 3. 批准状态

Approved。

- Approved By: Project Manager
- Approval Date: 2026-07-25

## 4. 批准内容

本次批准范围如下：

1. 新增 AttachmentObjectType：`product`；
2. 新增 `product` → `products` 正式对象映射；
3. 允许 `general_business_document` 支持 Product Attachment；
4. 不新增 Database Schema；
5. 不新增 Permission Code；
6. 不新增 Error Code。

## 5. 后续实施步骤

后续实施必须按批准范围执行：

1. 更新 `docs/05-api/API_SPEC.md` 中 Attachment Framework 的 Object Type Registry；
2. 同步 Attachment Category Matrix，允许 `general_business_document` 关联 `product`；
3. 同步 `ATT-001`、`ATT-002`、`ATT-005`、`ATT-006` 中 `AttachmentObjectType` 允许值说明；
4. 新增 Product Attachment Object Registry / Object Reader 运行时映射；
5. 增加 Product Attachment 相关测试；
6. 记录 API CR-006 Implementation Record；
7. 在 Task `8-B2-2 Master Data Development - Core` 中继续 Product 附件关联实现。

实施边界：

1. 不新增 Database Schema；
2. 不创建 Migration；
3. 不新增 Permission Code；
4. 不新增 Error Code；
5. 不改变 Attachment Response、Pagination 或 Error Response 结构。
