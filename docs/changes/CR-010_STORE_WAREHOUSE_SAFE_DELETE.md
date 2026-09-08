---
document_name: Store / Warehouse Safe Delete Enhancement
project: Violin ERP Lite
cr_id: CR-010
type: API / Permission Behavior Change
status: Approved / Implemented
owner: Project Manager
created_date: 2026-09-08
---

# CR-010 店铺安全删除与仓库 Scope 清理

Approved By：Project Owner。Approval Date：2026-09-08。

审批依据：项目负责人本次 Manual UAT UX & Safe Delete Enhancement 明确批准店铺安全删除、仅 Scope 关联仓库的安全删除，并要求必要最小 CR 按本次确认范围同步 Approved 后实施。不拆 UAT 编号，不改变 Phase / Task 状态。

## 正式范围

新增 MD-082：DELETE /api/v1/stores/{id}，仅有效 administrator 可用，仍须目标 Store 的现有 manage 数据范围。无业务引用且非系统对象时允许删除；任何现有业务引用均拒绝，提示“该店铺已被业务记录引用，无法删除，请停用。”。真实外键检查包括 outbound_orders.store_id、sales_returns.store_id、import_tasks.store_id；销售、平台订单及跨境来源业务经既有业务链引用，不新增平行对象。role_stores 为授权关系，不视为业务历史。

既有 Warehouse DELETE 保留 master.warehouse.update 并新增 administrator 限制；仍须目标 manage 范围。真实业务引用继续阻止删除，提示“该仓库存在库存或历史业务记录，无法删除，请停用。”。仅 role_warehouses 不阻止安全删除；不得移除任何业务数据、角色、用户或其他目标的 Scope。

Store / Warehouse 删除在同一事务内锁定目标行（FOR UPDATE）、重新核验现有 manage 范围及系统保护、逐项检查全部业务外键，清除该目标的 role_stores / role_warehouses，删除目标并写必需审计，全部成功才提交。外键竞争或审计失败回滚对象与 Scope；新建引用的 FK 锁与目标行锁协调，最终仍由数据库 FK 保护。拒绝时不清 Scope，不写成功审计。

SYS- / SYSTEM- 系统数据保护、既有错误包装、HTTP 200 删除结果、409 引用冲突、403 角色拒绝、404 不可访问语义保留。接口总数由 343 增至 344，基础资料由 81 增至 82；无新 Permission Code、Role、Schema、Migration 或业务字段。

## 同批实施边界

分类仅落实既有多级分类和禁止循环规则：树状父级下拉排除自身与后代；服务端串行协调分类结构写入，在事务内重新验证祖先链及推导层级，移动子树时同步后代派生层级并审计，不改变后代父级关系。既有 categoryLevel DTO 保持兼容，保存值以服务器按父链计算为准，用户无需输入数字。

Warehouse allowsAvailableStock 仅改页面名“计入可用库存”和本次指定帮助说明。正式类型仅 company / manufacturer / overseas / transit / pending，无法可靠映射成品/正常/不良品，故不新增类型、不改变默认值、不覆盖已有数据。

## 验收

Store 无业务引用删除、三类业务引用拒绝、普通用户拒绝；Warehouse 仅 Scope 可删、20 项业务外键拒绝、审计失败回滚、并发新增引用保护；分类多层树、父级回显、自身/后代/并发循环拒绝；库存文案正确。真实检查乐器文化产业园仓库，只有 Scope 时按授权由正式 API 删除；存在业务历史则保留并报告引用。

状态目标为 Fixed / Pending Manual Verification。实施完成后补充验证与交付证据。

## 实施结果（2026-09-08）

Approved / Implemented。Store / Warehouse Service、Repository、Admin 和专项测试已落实上述规则。正式 HTTP / PostgreSQL 专项 9 项通过，覆盖审计 INSERT 故障回滚对象与 Scope、业务引用拒绝、真实 FK 目录完整性和并发 FK 锁等待；分类并发互设父级只有一个请求成功，后代派生层级同步有审计。

浏览器店铺 STR-000049 创建后删除成功、列表刷新；CAT-000054 三级分类保存、父级回显、自身/后代排除通过，诊断分类已正式删除。WH-000013 最终只存在 1 条角色 Scope、20 项业务外键引用为零，正式 DELETE 200，目标及 Scope 清理、成功审计 1 条，其他 Scope / Role / User 未变化。库存字段只改文案与帮助，不改默认值、Schema 或字段语义。完整验收证据见 MASTER_DATA_DELETE_STRATEGY_REPORT；UAT 状态 Fixed / Pending Manual Verification。

最终完整检查：pnpm check 513 通过 / 69 条件性跳过；本轮真实专项 9 项另行启用并通过。status:check、diff 检查及 API Health 通过。
