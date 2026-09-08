---
document_name: New Master Data Scope Initialization
project: Violin ERP Lite
cr_id: CR-009
type: Permission / API Behavior Change
status: Approved / Implemented
owner: Project Manager
created_date: 2026-09-08
related_issue: Manual UAT Bug Batch
---

# CR-009 新建仓库与店铺数据范围初始化

## 已证实根因

正式 HTTP 创建 `UAT-WAREHOUSE-CHECK` 返回 201，自动编码 `WH-000009`；真实数据库存在且启用，但没有 `role_warehouses` 关系。随后列表 GET 200 不含此仓库，详情 GET 404。前端已有成功提示和重新加载，问题属于记录被数据范围过滤，不是数据库未写入。Store 创建采用相同机制。

现有 Frozen Permission Spec 要求管理员也必须显式授予仓库与店铺范围；SEC-023 / SEC-025 禁止修改自身有效角色实现提权，并要求操作者已可管理目标对象。因此不能临时绕过数据范围或用 SQL 授权来冒充修复。

## 已批准最小方案

仅在正式 Create 新建仓库或店铺时，在创建业务记录的同一事务内，为操作者当前有效且拥有该资源 Create 权限的角色初始化该新对象的 `manage` 范围。写入既有 `role_warehouses` / `role_stores`，保留角色、用户有效期及权限检查，并记录本次初始化的角色、对象、访问级别、操作者和 Request ID 审计证据。无合格角色或初始化失败时，整个创建事务失败，不显示成功。

这是“新对象创建时初始化”这一明确例外，不允许给既有仓库或店铺追加范围，不允许传入任意角色或目标对象，不更改 SEC-023 / SEC-025 常规授权限制。列表、详情及下游业务继续通过既有关系检查数据范围。不得加入管理员全局绕过、created_by 查询旁路或平行 ACL。

**权限影响：同一角色的其他有效成员也会获得新对象范围。** 这是现有按角色授权模型的必然效果，已由项目负责人明确批准；不新增用户专属角色或账户。本申请不自动修复历史无范围对象；本轮诊断生成的 WH-000009 是唯一已批准维护例外，现已正式补齐范围并经 API 停用。

## 验收

新增后 API 列表、详情、选项与浏览器均可见；使用不同且未获范围的角色仍不可见；无 Create 权限仍拒绝；范围初始化失败应回滚业务记录及流水；正常更新不得产生新授权。权限审计应覆盖初始化，库存及库存流水不变化。

## 审批

Approved By：Project Owner。Approval Date：2026-09-08。

审批依据：项目负责人在同一 Manual UAT Bug Batch 后续指令正式批准 CR-008 / CR-009 全文范围，授权先同步正式契约再实施、迁移、验证及一次提交。本批准不改变当前 Phase / Task 状态。实施已完成，见下列证据。

WH-000009 特例同时获批：仅允许通过本次正式 Scope 初始化机制，对仓库编码 WH-000009、名称 UAT-WAREHOUSE-CHECK、由操作者创建的本轮诊断对象补齐一次访问范围，再由正式停用 API 停用。不得处理其他历史对象，不得直接 SQL 修改或物理删除；补齐与停用均须记录审计。此维护入口不暴露为通用 HTTP API。

管理员保留现有全量功能权限，仓库与店铺仍按显式角色范围校验；本批准不增加管理员全局数据范围旁路。

## 实施证据

2026-09-08：新增 Warehouse / Store 同事务初始化合格角色 manage 范围和审计；未扩大对象类型。HTTP 仓库 WH-000011 真实创建、DB 启用、列表、详情与 options 均通过；浏览器 WH-000012 在不匹配筛选条件下新增后自动清除筛选并显示，并在采购入库目标仓库下拉实际选中（未保存业务单据）。

使用现有 UAT 用户在回滚事务中通过 SecurityManagementService 分配角色，验证同角色可见、其他角色无范围不可见；无永久账号/角色/权限变化。注入初始化审计失败时业务对象与编码流水全部回滚。WH-000009 通过受限维护方法调用正式 Scope 初始化后经 HTTP 停用，initialize-scope / disable 两条审计成功。未直接 SQL 修改或物理删除。

整批 UAT 为 Fixed / Pending Manual Verification，不自动 Closed。详见统一专项报告。
