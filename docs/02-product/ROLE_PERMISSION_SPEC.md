---
document_name: 角色权限规格
project: Violin ERP Lite
version: 1.0
status: Completed / Approved / Frozen
owner: Project Manager
created_date: 2026-07-19
updated_date: 2026-07-22
related_phase: Phase 2
---

# ROLE PERMISSION SPEC

## 1. 文档定位与效力

本文档是 Violin ERP Lite 角色代码、权限代码、角色权限映射和数据范围表达的唯一正式入口，作为 Phase 7 Task 7.3-C 及后续认证授权实现的 Frozen 输入。

本文档只将已有 Approved / Frozen 业务角色、职责、页面能力、API 权限语义和数据范围整理为可实现代码，不新增业务模块、职责、审批流程、数据库对象、页面或 API。

权限代码以本文档为准；API 路径、方法、动作、权限语义和数据范围仍以 Frozen API Master Specification v1.1 为准。如两者冲突，必须停止实现并进入正式变更流程，不得由代码自行覆盖。

## 2. 正式来源

| 来源 | 本规格使用内容 |
| --- | --- |
| [`BUSINESS_RULES.md`](../01-business/BUSINESS_RULES.md) | BR-010 职责分离、BR-028 不设独立质检角色、BR-030 单级审核及内部使用边界 |
| [`PROJECT.md`](../../PROJECT.md) | 管理员、采购人员、仓库人员、销售人员、公司负责人五类正式项目用户 |
| [Task 2.2 模块职责](../phases/phase-02/TASK_2_2_MODULE_RESPONSIBILITY_DESIGN.md) | 功能、操作、数据、仓库、业务范围和审核权限职责 |
| [Task 2.6 业务对象](../phases/phase-02/TASK_2_6_BUSINESS_OBJECT_DEFINITION.md) | `users`、`roles`、`permissions` 及角色分配模型；其中“建议角色”不作为新正式角色 |
| [Phase 4 页面设计](../phases/phase-04/TASK_4_1_PAGE_ARCHITECTURE_DESIGN.md) | 菜单、按钮、字段、仓库、店铺、厂家和敏感信息权限表现；Task 4.2—4.10 同时适用 |
| [Task 5.1 API 通用规范](../phases/phase-05/TASK_5_1_API_DESIGN_PRINCIPLES.md) | 身份、功能、操作、记录、仓库、店铺、字段和职责分离校验 |
| [Task 5.2—5.5 API 设计](../phases/phase-05/TASK_5_2_MASTER_DATA_AND_PURCHASE_API.md) | 315 个 Frozen API 中已批准的资源、动作、使用端、权限与范围语义 |
| [API Change Request 001](../00-governance/API_CHANGE_REQUEST_001.md) | 库存盘点、销售退货和报损动作 |
| [Task 6.1—6.3 功能详细设计](../phases/phase-06/TASK_6_1_FUNCTIONAL_DESIGN_STANDARD.md) | 后端强制授权、页面/API 映射、用户角色权限管理、实时生效和审计规则 |

## 3. 权限模型

1. 系统采用 RBAC（Role-Based Access Control）；
2. 用户通过 `user_roles` 可关联一个或多个当前有效角色；
3. 角色通过 `role_permissions` 可关联多个当前有效权限；
4. 用户的有效权限是全部有效角色的有效权限并集，同时受记录、仓库、店铺、厂家派生、字段、状态和职责分离约束；
5. 默认拒绝：未登录、角色失效、权限未授予、数据范围不匹配或状态不允许时均拒绝；
6. 最小权限：只授予当前岗位所需权限和数据范围；
7. 后端是最终控制点；前端菜单、路由和按钮隐藏只用于交互，不能替代后端校验；
8. 每次请求均重新校验身份、权限、数据范围、当前状态与职责分离，不信任客户端传入的角色或权限代码。

## 4. 正式角色清单

| `role_code` | 中文名称 | 角色职责 | 适用端 | 数据范围 | 正式来源 |
| --- | --- | --- | --- | --- | --- |
| `administrator` | 管理员 | 系统、用户、角色、权限和敏感管理；业务动作仍遵守职责分离与审计 | 两端（管理主要在 PC） | 功能权限全量；仓库、店铺和字段范围仍显式授予 | PROJECT；Task 2.2 第 11 节；Task 5.2/5.3/5.4 权限矩阵 |
| `purchaser` | 采购人员 | 采购基础资料、采购单、采购付款、采购退货及获授权验收 | 两端 | 本人创建、业务关联、获授权仓库和厂家派生范围 | PROJECT；Task 5.2 第 17 节；Task 5.3 第 21 节 |
| `warehouse_staff` | 仓库人员 | 授权仓库的验收、库存、入库、出库、调拨、盘点、报损和运输执行 | 两端 | `role_warehouses` 及由仓库/来源业务派生的记录和厂家范围 | PROJECT；Task 5.3 第 21 节；Task 5.4 第 23 节 |
| `sales_staff` | 销售人员 | 授权店铺的国内销售出库、销售退货及相关查询 | 两端 | `role_stores`、相关出库记录和必要仓库范围 | PROJECT；Task 5.2 第 17 节；Task 5.4 第 23 节 |
| `company_principal` | 公司负责人 | 授权经营概况、汇总/明细、敏感字段和单级审批；默认不承担制单或仓库执行 | 两端 | 明确授权的全部或业务范围，以及显式仓库/店铺/字段范围 | PROJECT；Task 4.4 第 14 节；Task 5.2/5.3/5.4 权限矩阵 |

正式角色数量为 **5**。不建立“生产人员”、“验收人员”、“跨境业务人员”、“财务人员”或“普通查询用户”等新角色。Phase 2 BO-S02 中的“建议角色”只是历史建议；Phase 5 后续 Approved 矩阵已明确正式角色为上述五类。

## 5. 权限代码命名规范

权限代码固定为 `module.resource.action`：

- 仅使用小写英文、数字和短横线；
- 正则表达式为 `^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$`；
- `module` 表示正式模块，`resource` 表示 Frozen API 资源或 Approved 功能，`action` 表示已存在动作；
- 只使用目录中明确列出的 `read`、`create`、`update`、`enable`、`disable`、`submit`、`withdraw`、`approve`、`reject`、`unapprove`、`cancel`、`void`、`confirm`、`revoke`、`execute`、`export`、`upload`、`download`、`link`、`unlink`、`delete`、`assign` 等已批准动作；
- 目录表中 `module.resource` 与每个 action 的笛卡尔积是完整、逐项、不可省略的正式 `permission_code` 集合。

例如 `purchase.order` 的 action 含 `read`、`create` 和 `approve`，则正式代码分别为 `purchase.order.read`、`purchase.order.create` 和 `purchase.order.approve`。未出现在下表的组合不是正式权限。

每项权限的操作类型等于 action，中文名称固定由“第 6 节资源中文名 + 下表 action 中文名”组成。例如 `purchase.order.approve` 的中文名称为“采购订单·审核通过”。

| action | 中文名 | action | 中文名 |
| --- | --- | --- | --- |
| `approve` | 审核通过 | `assign` | 分配 |
| `cancel` | 取消 | `close` | 关闭 |
| `complete` | 完成 | `confirm` | 确认 |
| `confirm-inbound` | 确认入库 | `confirm-outbound` | 确认出库 |
| `create` | 新增 | `create-domestic-sales` | 创建国内销售出库 |
| `create-other` | 创建其他 | `create-production` | 创建生产来源 |
| `create-purchase` | 创建采购来源 | `delete` | 删除 |
| `disable` | 停用 | `dispatch` | 发运确认 |
| `download` | 下载 | `enable` | 启用 |
| `execute` | 执行 | `export` | 导出 |
| `handle` | 登记处理 | `initial-count` | 录入初盘 |
| `link` | 关联 | `read` | 查看 |
| `receive` | 调入确认 | `recount` | 录入复盘 |
| `reject` | 审核驳回 | `reverse` | 冲销 |
| `revoke` | 撤销 | `ship` | 调出确认 |
| `start` | 开始 | `submit` | 提交 |
| `unapprove` | 反审核 | `unlink` | 解除关联 |
| `update` | 修改 | `upload` | 上传 |
| `validate` | 校验 | `view` | 标记已查看 |
| `void` | 作废 | `withdraw` | 撤回 |

## 6. 正式权限代码目录

| `module.resource` | 中文资源 | 正式 action（每个都形成独立权限代码） | 数量 | 适用 API 或功能 | 正式来源 |
| --- | --- | --- | ---: | --- | --- |
| `master.product` | 产品 | read, create, update, enable, disable | 5 | `MD-PRD-01`—`08` | Task 5.2 第 3.1—3.2 节 |
| `master.sku` | SKU | read, create, update, enable, disable | 5 | `MD-SKU-01`—`08` | Task 5.2 第 3.1—3.2 节 |
| `master.category` | 产品分类 | read, create, update, enable, disable | 5 | `MD-CAT-01`—`08` | Task 5.2 第 3.1—3.2 节 |
| `master.brand` | 品牌 | read, create, update, enable, disable | 5 | `MD-BRD-01`—`08` | Task 5.2 第 3.1—3.2 节 |
| `master.supplier` | 供应商 | read, create, update, enable, disable | 5 | `MD-SUP-01`—`08` | Task 5.2 第 3.1—3.2 节 |
| `master.manufacturer` | 生产厂家 | read, create, update, enable, disable | 5 | `MD-MFR-01`—`08` | Task 5.2 第 3.1—3.2 节 |
| `master.warehouse` | 仓库 | read, create, update, enable, disable | 5 | `MD-WHS-01`—`08` | Task 5.2 第 3.1—3.2 节 |
| `master.platform` | 电商平台 | read, create, update, enable, disable | 5 | `MD-PLT-01`—`08` | Task 5.2 第 3.1—3.2 节 |
| `master.store` | 店铺 | read, create, update, enable, disable | 5 | `MD-STR-01`—`08` | Task 5.2 第 3.1—3.2 节 |
| `master.customer-snapshot` | 客户快照 | read | 1 | `MD-CUS-01`—`02` | Task 5.2 第 3.3 节 |
| `purchase.order` | 采购订单 | read, create, update, submit, withdraw, approve, reject, unapprove, cancel, void, export | 11 | `PUR-001`—`016` | Task 5.2 第 3.4、17—18 节 |
| `purchase.payment` | 采购付款 | read, create | 2 | `PUR-017`—`019` | Task 5.2 第 3.4、17 节 |
| `purchase.return` | 采购退货 | read, create, update, submit, approve, reject, unapprove, cancel, void, confirm-outbound | 10 | `PUR-020`—`029`、`OUT-017` | Task 5.2 第 3.4 节；Task 5.4 第 3.2 节 |
| `production.order` | 生产订单 | read, create, update, submit, withdraw, approve, reject, unapprove, start, cancel, void, export | 12 | `PRO-001`—`017` | Task 5.3 第 3.1 节 |
| `production.progress` | 生产进度 | read, create | 2 | `PRO-018`—`020` | Task 5.3 第 3.1 节 |
| `production.completion` | 分批完工 | read, create, confirm, revoke, void | 5 | `PRO-021`—`022`、`PRO-026`—`029` | Task 5.3 第 3.1 节；DCR-001 |
| `production.payment` | 生产付款 | read, create | 2 | `PRO-023`—`025` | Task 5.3 第 3.1 节 |
| `inspection.order` | 质量验收 | read, create, update, submit, confirm, revoke, void, export | 8 | `INS-001`—`010` | Task 5.3 第 3.2、16 节；BR-027—028 |
| `inventory.stock` | 当前库存 | read | 1 | `INV-001`—`005` | Task 5.3 第 3.3、17 节 |
| `inventory.transaction` | 库存流水 | read | 1 | `INV-006`—`007` | Task 5.3 第 3.3、18 节 |
| `inventory.alert` | 库存预警 | read, view, handle, close | 4 | `INV-008`—`012` | Task 5.3 第 3.3 节 |
| `inventory.adjustment` | 库存调整 | read, create, update, submit, withdraw, approve, reject, unapprove, cancel, void, execute, export | 12 | `INV-013`—`026` | Task 5.3 第 3.3、20—21 节 |
| `inventory.stock-count` | 库存盘点 | read, create, update, submit, withdraw, approve, reject, start, initial-count, recount, complete, cancel, void, export | 14 | `STC-001`—`017` | API CR-001 第 7.1 节；Task 5.4 第 2 节 |
| `inventory.damage` | 报损 | read, create, update, submit, withdraw, approve, reject, cancel, confirm-outbound, validate, export | 11 | `DMG-001`—`013` | API CR-001 第 7.3 节；Task 5.4 第 2 节 |
| `inbound.order` | 入库单 | read, create-purchase, create-production, create-other, update, submit, withdraw, approve, reject, unapprove, cancel, confirm, reverse, export | 14 | `INB-001`—`018` | Task 5.4 第 3.1、24 节 |
| `outbound.order` | 出库单 | read, create-domestic-sales, create-other, update, submit, withdraw, approve, reject, unapprove, cancel, confirm, reverse, export | 13 | `OUT-001`—`016` | Task 5.4 第 3.2、24 节 |
| `outbound.sales-return` | 销售退货 | read, create, update, submit, withdraw, approve, reject, cancel, confirm-inbound, export | 10 | `SRT-001`—`013` | API CR-001 第 7.2 节；Task 5.4 第 2 节 |
| `transfer.order` | 调拨单 | read, create, update, submit, withdraw, approve, reject, unapprove, cancel, ship, receive, export | 12 | `TRF-001`—`015` | Task 5.4 第 3.3、24 节 |
| `cross-border.shipment` | 跨境发货 | read, create, update, submit, withdraw, approve, reject, unapprove, cancel, void, dispatch, export | 12 | `CBR-001`—`015` | Task 5.4 第 3.4、24 节 |
| `cross-border.overseas-inventory` | 海外仓库存 | read | 1 | `CBR-016`—`017` | Task 5.4 第 3.4、22 节 |
| `cross-border.import-result` | 海外导入结果 | read | 1 | `CBR-018`—`021` | Task 5.4 第 3.4、22 节 |
| `cross-border.source-trace` | 海外库存来源追溯 | read | 1 | `CBR-022` | Task 5.4 第 3.4、22 节 |
| `import.task` | 导入任务 | read, create, cancel, validate, execute | 5 | `IMP-001`—`005`、`IMP-009`—`014` | Task 5.5 第 3.1、4 节 |
| `import.template` | 导入模板 | read, validate | 2 | `IMP-006`—`008` | Task 5.5 第 3.1、4.2 节 |
| `import.history` | 导入历史 | export | 1 | `IMP-015` | Task 5.5 第 3.1 节 |
| `attachment.file` | 附件 | upload, read, download, link, unlink, delete | 6 | `ATT-001`—`008` | Task 5.5 第 3.2、5 节；`ATT-008` 叠加 `audit.log.read` |
| `audit.log` | 审计日志 | read, export | 2 | `LOG-001`—`004` | Task 5.5 第 3.3、6 节 |
| `security.user` | 用户管理 | read, create, update, enable, disable | 5 | Approved 用户管理功能；无独立 API | Task 2.2 第 11 节；Task 6.3 第 4.1 节 |
| `security.role` | 角色管理 | read, create, update, enable, disable, assign | 6 | Approved 角色管理功能；无独立 API | Task 2.2 第 11 节；Task 6.3 第 4.2 节 |
| `security.permission` | 权限分配 | read, assign | 2 | Approved 权限分配功能；`SEC-005` 仅查当前摘要 | Task 6.3 第 4.3—4.4 节 |
| `security.setting` | 系统设置 | read, update | 2 | Approved 系统设置功能；无独立 API | Task 6.3 第 9 节 |
| `field.amount` | 金额字段 | read | 1 | 采购、生产、付款、报表 | Task 5.2 第 17 节；Task 5.3 第 21 节 |
| `field.cost` | 成本字段 | read | 1 | 库存、出入库、调拨、跨境 | Task 5.3 第 21 节；Task 5.4 第 23 节 |
| `field.personal-data` | 客户个人信息 | read | 1 | `MD-CUS-*`、`OUT-*`、`SRT-*` | Task 5.2 第 3.3 节；Task 5.4 第 11 节 |
| `field.supplier-sensitive` | 供应商敏感信息 | read | 1 | `MD-SUP-*`、`PUR-*` | Task 5.2 第 2、17 节 |
| `field.manufacturer-sensitive` | 厂家敏感信息 | read | 1 | `MD-MFR-*`、`PRO-*` | Task 5.2 第 2 节；Task 6.2 第 3.3 节 |
| `field.attachment-sensitive` | 敏感附件 | read | 1 | `ATT-003`—`004` | Task 5.5 第 3.2 节 |
| `field.import-raw-data` | 导入原始数据 | read | 1 | `IMP-003`、`010`、`CBR-020` | Task 5.5 第 3.1、4 节 |
| `field.audit-sensitive` | 审计敏感字段 | read | 1 | `LOG-002`、`LOG-004` | Task 5.5 第 3.3、6 节 |

### 6.1 各模块权限数量

| 模块 | 数量 | 模块 | 数量 |
| --- | ---: | --- | ---: |
| `master` | 46 | `purchase` | 23 |
| `production` | 21 | `inspection` | 8 |
| `inventory` | 43 | `inbound` | 14 |
| `outbound` | 23 | `transfer` | 12 |
| `cross-border` | 15 | `import` | 8 |
| `attachment` | 6 | `audit` | 2 |
| `security` | 15 | `field` | 8 |
| **合计** | **244** |  |  |

`SEC-001`—`SEC-005` 是登录、刷新、登出和当前会话/权限摘要能力，其准入条件是未登录入口或当前认证上下文，不作为额外 RBAC 业务权限代码。

## 7. 角色权限矩阵

下表的 action 均是第 6 节同一 `module.resource` 下的正式 action，每个单元格都精确展开为实际 `permission_code`。`ALL` 仅是文档矩阵简写，不是可持久权限代码。`—` 表示该角色未授予该项权限。

| `module.resource` | 管理员 | 采购人员 | 仓库人员 | 销售人员 | 公司负责人 |
| --- | --- | --- | --- | --- | --- |
| `master.product` / `sku` / `category` / `brand` | ALL | ALL | read | read | read |
| `master.supplier` / `manufacturer` | ALL | ALL | read | — | read |
| `master.warehouse` | ALL | read | ALL | read | read |
| `master.platform` / `store` | ALL | read | read | read, update | read |
| `master.customer-snapshot` | ALL | — | — | read | read |
| `purchase.order` | ALL | ALL | read | — | read, approve, reject, unapprove, cancel, void, export |
| `purchase.payment` | ALL | ALL | — | — | read |
| `purchase.return` | ALL | read, create, update, submit, approve, reject, unapprove, cancel, void | read, confirm-outbound | — | read, approve, reject, unapprove, void |
| `production.order` | ALL | — | read | — | read, approve, reject, unapprove, void, export |
| `production.progress` | ALL | — | ALL | — | read |
| `production.completion` | ALL | — | ALL | — | read |
| `production.payment` | ALL | — | — | — | read |
| `inspection.order` | ALL | ALL | ALL | — | read |
| `inventory.stock` / `transaction` | ALL | read | read | read | read |
| `inventory.alert` | ALL | read | ALL | read | read |
| `inventory.adjustment` | ALL | — | read, create, update, submit, withdraw, cancel, execute | — | read, approve, reject, unapprove, void, export |
| `inventory.stock-count` | ALL | — | read, create, update, submit, withdraw, start, initial-count, recount, complete, cancel, export | — | read, approve, reject, void, export |
| `inventory.damage` | ALL | — | read, create, update, submit, withdraw, cancel, confirm-outbound, validate | — | read, approve, reject, export |
| `inbound.order` | ALL | read, create-purchase | read, create-purchase, create-production, create-other, update, submit, withdraw, cancel, confirm | — | read, approve, reject, unapprove, reverse, export |
| `outbound.order` | ALL | — | read, create-other, update, submit, withdraw, cancel, confirm | read, create-domestic-sales, update, submit, withdraw, cancel | read, approve, reject, unapprove, reverse, export |
| `outbound.sales-return` | ALL | — | read, confirm-inbound | read, create, update, submit, withdraw, cancel, export | read, approve, reject, export |
| `transfer.order` | ALL | — | read, create, update, submit, withdraw, cancel, ship, receive | — | read, approve, reject, unapprove, export |
| `cross-border.shipment` | ALL | — | read, dispatch | — | read, approve, reject, unapprove, void, export |
| `cross-border.overseas-inventory` / `import-result` / `source-trace` | ALL | — | read | — | read |
| `import.task` | ALL | read, create, cancel, validate | ALL | read, create, cancel, validate | read |
| `import.template` | ALL | ALL | ALL | ALL | read |
| `import.history` | ALL | export | export | export | export |
| `attachment.file` | ALL | upload, read, download, link, unlink | upload, read, download, link, unlink | upload, read, download, link, unlink | read, download |
| `audit.log` | ALL | — | — | — | ALL |
| `security.user` / `role` / `permission` / `setting` | ALL | — | — | — | — |
| `field.amount` | ALL | read | — | — | read |
| `field.cost` | ALL | — | read | — | read |
| `field.personal-data` | ALL | — | — | read | read |
| `field.supplier-sensitive` / `manufacturer-sensitive` | ALL | read | — | — | read |
| `field.attachment-sensitive` | ALL | — | — | — | read |
| `field.import-raw-data` | ALL | — | read | — | read |
| `field.audit-sensitive` | ALL | — | — | — | read |

### 7.1 管理员全权限结论

`administrator` 是正式功能权限全量角色，映射第 6 节全部 244 个权限代码。该结论不表示可以越过：

- 制单人与审核人不得为同一用户的职责分离；
- 仓库、店铺、厂家派生、记录和字段范围；
- 当前业务状态、并发、幂等、库存和下游约束；
- 高风险操作的原因、二次确认和审计记录。

### 7.2 职责分离

角色可同时包含制单与审批权限，以支持同角色不同用户的单级审核；后端必须在记录级比较操作人与制单人，同一用户不得审批自己创建的单据。仓库执行和关键库存调整执行不能由前端隐藏按钮代替后端权限与范围校验。

## 8. 数据权限类型

| `DataScopeType` | 中文名称 | 正式语义 | 实现来源 |
| --- | --- | --- | --- |
| `all` | 全部数据 | 仅在获得明确全范围授权时使用，角色名称本身不自动产生全范围 | Task 5.2 第 17 节“全范围需正式授权” |
| `self_created` | 本人创建数据 | 通过正式 `created_by`、提交人或操作记录派生，不新增负责人字段 | Task 5.1 第 11 节；Task 4.6 责任追溯规则 |
| `business_related` | 业务关联范围 | 依来源单据、创建/提交/审核人、仓库、店铺或其他 Frozen 业务关系派生 | Task 5.1 第 11—12 节 |
| `warehouse` | 指定仓库数据 | 使用 `role_warehouses` 和 `access_level` 控制查看、操作或管理 | Database Logical Design v1.1；Task 5.1 第 12 节 |
| `store` | 指定店铺数据 | 使用 `role_stores` 和 `access_level` 控制店铺与销售数据 | Database Logical Design v1.1；Task 5.1 第 12 节 |
| `manufacturer_derived` | 指定厂家派生数据 | 只能由厂家仓授权、生产/验收来源和正式业务记录派生，不新增角色厂家关联表 | Task 5.1 第 12 节；Task 6.3 第 4.3 节 |

本项目没有 Approved/Frozen 组织对象或组织关联表，因此不建立“本组织”独立数据范围；其已批准可表达部分统一使用 `business_related`。不建立通用记录 ACL，不新增厂家权限字段或表。

## 9. API 与页面关系

1. 页面和菜单可见性由当前有效功能权限及数据范围决定；
2. 按钮可见性由操作权限、记录范围和当前状态决定；
3. API 权限是最终控制点，直接调用 API 时仍必须执行完整后端校验；
4. `SEC-005` 返回的当前权限摘要只供界面表现，不替代业务 API 实时校验；
5. PC 端与微信小程序使用同一用户、角色、权限代码和数据范围，不建立端侧平行权限。

## 10. 特殊规则

- **制单与审核**：同一用户不得审核自己创建的单据；这是记录级强制规则，不因管理员角色而失效。
- **质量验收**：不设独立质检/验收角色；只有拥有 `inspection.order.*` 适用权限且同时具备来源记录及验收仓/厂家范围的采购人员、仓库人员或管理员可执行。
- **仓库人员边界**：仓库人员只能在授权仓库执行已授权仓储动作，不得代替未授权验收人员，也不得以仓库范围替代验收功能权限。
- **敏感管理**：`security.user.*`、`security.role.*`、`security.permission.*` 和 `security.setting.*` 仅映射管理员角色；普通业务角色不得通过自助操作提权。
- **权限调整审计**：用户、角色、权限、仓库和店铺范围的授予、撤销、启停和有效期变更必须记录操作人、时间、目标、变更前后摘要、结果和 Request ID。
- **无授权访问**：无权角色不得通过菜单、直接 URL、已知 ID、统计数量、搜索或导出推断或访问相应功能/API。

## 11. 后端实现输入

### 11.1 正式类型集合

- `RoleCode`：`administrator | purchaser | warehouse_staff | sales_staff | company_principal`；
- `PermissionCode`：第 6 节每个 `module.resource` 与其 action 的完整组合，共 244 个；
- `DataScopeType`：`all | self_created | business_related | warehouse | store | manufacturer_derived`；
- `ROLE_PERMISSION_MAP`：第 7 节矩阵的精确展开结果，运行时不存储 `ALL` 或通配符。

### 11.2 授权函数正式语义

- `requireAuthentication(context)`：要求存在已认证、未失效且映射到当前启用用户的上下文；否则返回统一 `401 AUTH_*`。
- `requirePermission(context, permission)`：要求当前有效权限包含该唯一正式代码；否则返回统一 `403 PERMISSION_*`。
- `requireAnyPermission(context, permissions)`：非空候选集合中至少一项有效时通过；空集合或全部无效时拒绝。
- `requireAllPermissions(context, permissions)`：非空候选集合全部有效时通过；空集合或任一缺失时拒绝。

上述函数只完成功能/操作权限前置判断。正式业务 API 仍必须叠加数据范围、字段、状态、职责分离、幂等、并发和业务规则校验。

## 12. 一致性和冻结检查

| 检查项 | 结果 |
| --- | ---: |
| 正式角色数 | 5 |
| 正式权限数 | 244 |
| 无权限角色数 | 0 |
| 未分配权限数 | 0（全部权限至少映射 `administrator`） |
| 无正式来源权限数 | 0 |
| 新增角色/业务职责/审批流程 | 0 |

本规格已完成角色、权限目录、角色权限矩阵、数据范围和来源引用的内部一致性检查，状态为 Completed / Approved / Frozen。未修改 Frozen 业务、数据库、API 或 Phase 6 内容，正式 API 数量保持 315。
