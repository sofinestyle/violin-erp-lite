---
document_name: Task 8-B2-3 Master Data Extended Implementation
project: Violin ERP Lite
version: 1.0
status: Completed / Pending Review
owner: Project Manager
created_date: 2026-07-26
updated_date: 2026-07-26
related_phase: Phase 8
---

# Task 8-B2-3：Master Data Extended Development

## 1. 实现范围

本次实现 Module 1 基础资料中心第二批业务能力：

1. Supplier：供应商；
2. Manufacturer：生产厂家；
3. Warehouse：仓库；
4. Platform：电商平台；
5. Store：店铺。

本次继续复用 Master Data 通用资源框架，不新增 API Path，不新增 DTO 字段，不修改 Database Schema，不创建 Migration，不新增 Permission Code。

## 2. 修改文件

1. `packages/api/src/master-data/master-data.ts`
2. `packages/database/src/master-data/prisma-master-data-repository.ts`
3. `apps/admin/lib/master-data.ts`
4. `packages/api/tests/master-data.test.ts`
5. `packages/database/tests/master-data-repository.test.ts`
6. `apps/admin/tests/master-data-page.test.tsx`
7. `docs/phases/phase-08/TASK_8_B2_MASTER_DATA_EXTENDED_IMPLEMENTATION.md`

## 3. Database对象

本次复用 Database Logical Design v2.5 既有对象：

1. `suppliers`；
2. `manufacturers`；
3. `warehouses`；
4. `ecommerce_platforms`；
5. `stores`；
6. `role_warehouses`；
7. `role_stores`；
8. `audit_logs`。

未新增表、字段、索引、约束、Enum 或 Migration。

## 4. API使用

继续复用 API Master Specification v1.6 中已冻结的 Master Data 通用接口：

| Resource | API Prefix | Path |
| --- | --- | --- |
| Supplier | `MD-SUP-01`—`MD-SUP-08` | `/api/v1/suppliers` |
| Manufacturer | `MD-MFR-01`—`MD-MFR-08` | `/api/v1/manufacturers` |
| Warehouse | `MD-WHS-01`—`MD-WHS-08` | `/api/v1/warehouses` |
| Platform | `MD-PLT-01`—`MD-PLT-08` | `/api/v1/ecommerce-platforms` |
| Store | `MD-STR-01`—`MD-STR-08` | `/api/v1/stores` |

支持能力：

1. 列表查询；
2. 详情查询；
3. 创建；
4. 编辑；
5. 启用；
6. 停用；
7. 授权选择列表；
8. 唯一性检查。

## 5. Permission使用

复用 Frozen `ROLE_PERMISSION_SPEC.md` 已有 Permission Code：

1. `master.supplier.read/create/update/enable/disable`；
2. `master.manufacturer.read/create/update/enable/disable`；
3. `master.warehouse.read/create/update/enable/disable`；
4. `master.platform.read/create/update/enable/disable`；
5. `master.store.read/create/update/enable/disable`；
6. `field.supplier-sensitive.read`；
7. `field.manufacturer-sensitive.read`。

未新增 Permission Code。

## 6. 实现说明

### 6.1 Supplier

供应商支持列表、详情、创建、编辑、启用、停用和唯一性检查。

敏感字段包括联系方式、结算信息、银行信息和税号。无 `field.supplier-sensitive.read` 时，服务层从返回结果中移除敏感字段；具备字段权限查看详情时记录敏感读取审计。

### 6.2 Manufacturer

生产厂家支持列表、详情、创建、编辑、启用、停用和唯一性检查。

敏感字段包括联系方式和地址信息。无 `field.manufacturer-sensitive.read` 时，服务层从返回结果中移除敏感字段；具备字段权限查看详情时记录敏感读取审计。

### 6.3 Warehouse

仓库支持 `warehouseType`：

1. `company`；
2. `manufacturer`；
3. `overseas`；
4. `transit`；
5. `pending`。

实现保留以下校验：

1. 厂家仓必须关联生产厂家；
2. 海外仓必须填写国家代码；
3. 在途仓和待处理仓不得形成可用库存；
4. 仓库列表和详情在 Repository 层使用 `role_warehouses` 控制数据范围。

本次不修改库存余额，不创建库存逻辑，不绕过 `inventory_transactions`。

### 6.4 Platform

Platform 使用正式 API Path `/api/v1/ecommerce-platforms`，映射数据库对象 `ecommerce_platforms`。

实现字段包括 `platformCode`、`platformName`、`platformType`、`countryCode`、`isCrossBorder` 和 `description`。

本次不接入外部平台 API，不接收或保存平台 Token、API Key、Secret 或账号密码。

### 6.5 Store

店铺支持列表、详情、创建、编辑、启用、停用和唯一性检查。

店铺列表和详情在 Repository 层使用 `role_stores` 控制数据范围，并返回平台安全摘要。

## 7. 测试结果

已增加或更新测试覆盖：

1. Supplier CRUD、敏感字段、权限、Audit；
2. Manufacturer CRUD、敏感字段、权限、Audit；
3. Warehouse CRUD、类型校验、数据范围、Audit；
4. Platform CRUD、权限、Audit、PC 工作台入口；
5. Store CRUD、数据范围、权限、Audit；
6. 禁止仓库库存余额字段写入；
7. 禁止 Platform 外部同步凭证字段写入；
8. Prisma Repository 对 `ecommerce_platforms`、`role_warehouses`、`role_stores` 的映射。

针对性验证：

1. `pnpm --filter @violin-erp/api test`：通过；
2. `pnpm --filter @violin-erp/api build`：通过；
3. `pnpm --filter @violin-erp/database test`：通过；
4. `pnpm --filter @violin-erp/api typecheck`：通过；
5. `pnpm --filter @violin-erp/database typecheck`：通过。

最终验证以本任务提交前 `pnpm check` 与 `git diff --check` 为准。

## 8. 已知限制

1. 本次不实现外部平台 API 同步；
2. 本次不实现平台授权密钥管理；
3. 本次不新增供应商、厂家、仓库、平台或店铺附件专属能力；
4. 本次不修改库存余额，不创建库存表，不实现库存业务流程；
5. 本次不修改 Database SSOT、API SSOT、Permission Spec 或业务规则。
