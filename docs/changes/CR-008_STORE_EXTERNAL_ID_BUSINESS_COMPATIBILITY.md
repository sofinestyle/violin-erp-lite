---
document_name: Store External ID Business Compatibility
project: Violin ERP Lite
cr_id: CR-008
type: Database / API Contract Change
status: Approved / Implemented
owner: Project Manager
created_date: 2026-09-08
related_issue: Manual UAT Bug Batch
---

# CR-008 店铺外部标识业务兼容

## 事实与申请原因

本轮真实 PostgreSQL 检查确认 `stores.external_store_id` 为可空 UUID；Prisma 使用 `String? @db.Uuid`，Create / Update 共用字段定义使用 UUID 校验。Frozen 字段类型规范要求对象引用使用 UUID，但平台后台店铺编号并非本系统对象引用。现状无法保存 `123456789`、`US-STORE-001`、`TEMU123456`。这不是仅调整页面提示即可解决的问题。

## 已批准变更

将该列调整为可空 `VARCHAR(100)`，Prisma 使用 `String? @db.VarChar(100)`；Create / Update 接受不超过 100 个字符的普通字符串，去除首尾空白，空白或 null 归一为 null，缺省仍为可选。不限定 UUID，也不限定纯数字；内部 `storeCode` 仍由系统生成 STR 编码，`platformId` 仍为 UUID 外键。

保留 `(platform_id, external_store_id)` 唯一约束，非空标识在同平台唯一，不同平台可复用。既有 UUID 通过 `external_store_id::text` 无损转换，不修改历史 ID 内容，不新增字段、表、接口路径、权限代码。不自动回填外部标识。

已先同步 Database / API SSOT，再新增 forward-only Migration。迁移涉及列类型及索引重建，需要短暂表锁；执行前确认已有值可转换，执行后核对历史值及唯一约束。不得对已出现非 UUID 数据的数据库直接反向转换为 UUID。

## 验收

覆盖三种示例、缺省、空值、非法类型、超长、同平台重复拒绝、跨平台复用、更新兼容、历史 UUID 保留。执行 Prisma 校验、迁移状态、真实 HTTP / PostgreSQL 与浏览器新增店铺验证，保留 STR 自动编码和平台关联。

## 审批

Approved By：Project Owner。Approval Date：2026-09-08。

审批依据：项目负责人在同一 Manual UAT Bug Batch 后续指令正式批准 CR-008 / CR-009 全文范围，授权先同步正式契约再实施、迁移、验证及一次提交。本批准不改变当前 Phase / Task 状态。实施已完成，见下列证据。

## 实施证据

2026-09-08：Schema / DTO / Database v2.8 / API v1.12 已同步；迁移 `20260908140000_store_external_id_string` 已部署本地 PostgreSQL，Prisma validate 与 12 条迁移状态通过。迁移前 29 条 Store 均为空外部标识，迁移后逐条保持不变；真实 HTTP 另验证 UUID 文本仍可保留。

HTTP 空值、TEMU-US-001、123456789、AMZJP001、UUID 文本、更新、同平台重复拒绝、跨平台复用均通过。浏览器 STR-000037 / 000038 / 000039 分别验证空值、TEMU-US-001、123456789，所属 PLT-000033 正确，列表及编辑回显通过。测试对象经正式 API 停用。整批 UAT 为 Fixed / Pending Manual Verification，不自动 Closed。
