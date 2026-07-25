---
document_name: Task 8-B2-2 Master Data Core Implementation
project: Violin ERP Lite
version: 1.0
status: Completed / Pending Review
owner: Project Manager
created_date: 2026-07-25
updated_date: 2026-07-25
related_phase: Phase 8
---

# Task 8-B2-2：Master Data Development - Core

## 1. 实现范围

本次实现 Module 1 基础资料中心第一批核心能力：

1. Category：产品分类；
2. Brand：品牌；
3. Product：产品；
4. SKU：库存、采购、生产、入库、出库引用基础。

本次基于既有 Master Data 通用资源框架实现，不新增 API Path，不新增 DTO 字段，不修改 Database Schema，不创建 Migration，不新增 Permission Code。

## 2. 修改文件

1. `packages/api/src/attachment/types.ts`
2. `packages/api/src/attachment/object-registry.ts`
3. `packages/database/src/attachment/prisma-attachment-object-reader.ts`
4. `packages/api/tests/master-data.test.ts`
5. `packages/api/tests/attachment-domain.test.ts`
6. `packages/api/tests/attachment-http.test.ts`
7. `packages/database/tests/attachment-repository.test.ts`
8. `docs/phases/phase-08/TASK_8_B2_MASTER_DATA_CORE_IMPLEMENTATION.md`

## 3. API使用

继续复用 API Master Specification v1.6 中已冻结的 Master Data 通用接口：

| Resource | API Prefix | Path |
| --- | --- | --- |
| Category | `MD-CAT-01`—`MD-CAT-08` | `/api/v1/product-categories` |
| Brand | `MD-BRD-01`—`MD-BRD-08` | `/api/v1/brands` |
| Product | `MD-PRD-01`—`MD-PRD-08` | `/api/v1/products` |
| SKU | `MD-SKU-01`—`MD-SKU-08` | `/api/v1/skus` |

支持能力：

1. 列表查询；
2. 详情查询；
3. 创建；
4. 编辑；
5. 启用；
6. 停用；
7. 授权选择列表；
8. 唯一性检查。

## 4. Attachment v1.6 使用

根据 API CR-006 与 API Master Specification v1.6：

1. `AttachmentObjectType` 新增 `product`；
2. `product` 映射正式对象 `products`；
3. Product Attachment 权限资源为 `master.product`；
4. Product Attachment 仅允许 `general_business_document`；
5. Evidence、Voucher、Import 类 Attachment Category 禁止关联 Product；
6. Product Object Reader 使用 `products` 读取产品存在性、状态和审计上下文；
7. Product 已存在 SKU、供应商关系或厂家关系时，视为触发历史保护点。

## 5. Database对象

本次复用 Database Logical Design v2.5 既有对象：

1. `product_categories`；
2. `brands`；
3. `products`；
4. `skus`；
5. `attachment_links`；
6. `attachments`；
7. `audit_logs`。

未新增表、字段、索引、约束、Enum 或 Migration。

## 6. Permission使用

复用 Frozen `ROLE_PERMISSION_SPEC.md` 已有 Permission Code：

1. `master.category.read/create/update/enable/disable`；
2. `master.brand.read/create/update/enable/disable`；
3. `master.product.read/create/update/enable/disable`；
4. `master.sku.read/create/update/enable/disable`；
5. `attachment.file.upload/read/download/link/unlink/delete`；
6. `field.attachment-sensitive.read`；
7. `field.cost.read`；
8. `field.amount.read`。

未新增 Permission Code。

## 7. 测试结果

已增加或更新测试覆盖：

1. Category CRUD、校验、权限、Audit；
2. Brand CRUD、校验、权限、Audit；
3. Product CRUD、权限、Audit、Trace、Attachment Object Type；
4. SKU CRUD、校验、权限、Audit、禁止库存字段写入；
5. Product Attachment 仅允许 `general_business_document`；
6. Product Attachment 禁止 Evidence、Voucher、Import 类 Category；
7. Prisma Product Object Reader 映射与历史保护点；
8. API DTO 不新增字段。

针对性验证：

1. `pnpm --filter @violin-erp/api test`：通过；
2. `pnpm --filter @violin-erp/api build`：通过；
3. `pnpm --filter @violin-erp/database test`：通过。

最终验证以本任务提交前 `pnpm check` 与 `git diff --check` 为准。

## 8. 已知限制

1. 本次不实现 Supplier、Manufacturer、Warehouse、Platform、Store；
2. 本次不新增 Product Attachment 管理页面；
3. 本次不新增附件重放、批量附件或附件管理 API；
4. 本次不接入库存余额修改；
5. SKU 创建和编辑不创建库存表，不修改库存余额，不绕过 `inventory_transactions`。
