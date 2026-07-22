---
document_name: API Change Request 001：补齐库存盘点、销售退货、报损 API
project: Violin ERP Lite
version: 1.0
status: Completed / Approved
owner: Project Manager
created_date: 2026-07-22
updated_date: 2026-07-22
related_phase: Phase 5 / Phase 6
---

# API Change Request 001：补齐库存盘点、销售退货、报损 API

## 1. 变更背景

Phase 6 一致性准备检查发现，Approved Task 4.9 已定义库存盘点、销售退货和报损页面及正式动作，但 API Master Specification v1.0 未提供完整接口映射。本 Change Request 仅补齐既有 Approved 页面能力的 API 契约，不新增业务模块、对象、字段、关系或状态。

## 2. 冲突来源

1. `TASK_4_9_INBOUND_OUTBOUND_MANAGEMENT_PAGE_DESIGN.md` 已批准三类页面、状态、动作和权限；
2. `TASK_5_4_INBOUND_OUTBOUND_CROSS_BORDER_API.md` 第 31 章错误地将盘点、销售退货和报损排除在范围之外；
3. `TASK_6_2_CORE_BUSINESS_FUNCTIONAL_DESIGN.md` 因此无法为三类页面建立完整 Frozen API 映射；
4. `PHASE_5_FINAL_CONSISTENCY_REVIEW.md` 关于 Approved 页面已全部覆盖的结论存在遗漏；
5. Phase 6 Final Consistency Review 曾因 API Change Request 001 尚待批准而正式阻塞；本 Change Request 获批后该阻塞已解除。

该遗漏不得通过删除或降级页面、前端临时实现、隐藏接口、备注、JSON 扩展字段或复用不匹配接口规避。

## 3. 受影响页面

- Task 4.9 第 7 节库存盘点列表、创建、执行和复盘；
- Task 4.9 第 9 节销售退货列表、详情与处理；
- Task 4.9 第 10 节报损列表、新建、审核与正式报损；
- 三类详情页的状态历史、库存追溯、权限控制及适用导出。

上述 Approved 页面全部保留，不删除、不取消、不降级。

## 4. 受影响业务对象

本次仅使用 Frozen Database Logical Design v1.1 已存在对象：

- 盘点：`stock_counts`、`stock_count_items`；
- 销售退货：`sales_returns`、`sales_return_items`、原 `outbound_orders` 与 `outbound_order_items`；
- 报损：`damage_reports`、`damage_report_items`；
- 库存结果：`inventories`、只追加 `inventory_transactions`；
- 通用历史：既有 `document_status_histories`、`approval_records`、`audit_logs`。

## 5. Frozen 数据库适配检查

三类能力所需的主表、明细表、单据公共字段、状态、审核、版本、仓库、SKU、批次、数量、原因、来源、库存条件和金额字段均已存在。接口只使用 Frozen 字段及服务端派生查询结果，不持久化新的汇总或临时事实。

结论：Database Logical Design v1.1 可以完整支撑本变更；不发起数据库 DCR，不新增表、字段、关系或状态。

## 6. 缺失 API 清单

| 模块 | 缺失能力 | 新前缀 | 数量 |
| --- | --- | --- | ---: |
| 库存盘点 | 查询、维护、审核、执行、初盘、复盘、完成、终止、差异、历史、导出 | `STC-*` | 17 |
| 销售退货 | 查询、维护、审核、取消、来源与可退量、确认退货入库、历史、导出 | `SRT-*` | 13 |
| 报损 | 查询、维护、审核、取消、库存校验、确认报损出库、历史、导出 | `DMG-*` | 13 |
| 合计 | 本次最小完备补齐 |  | 43 |

`STC-*`、`SRT-*`、`DMG-*` 在 API Master Specification v1.0 中未占用；既有 272 个编号不删除、不复用、不改义、不重编号。

## 7. 新增 API 设计

### 7.1 库存盘点 API（17 个）

| 编号 | 名称 | 方法与路径 | 关键规则 |
| --- | --- | --- | --- |
| `STC-001` | 盘点单列表 | `GET /api/v1/stock-counts` | 按编号、仓库、范围、状态、审核状态、日期、创建人筛选并分页 |
| `STC-002` | 盘点单详情 | `GET /api/v1/stock-counts/{id}` | 返回主明细、初盘/复盘事实、权限动作摘要，不改变状态 |
| `STC-003` | 创建盘点单 | `POST /api/v1/stock-counts` | 创建草稿；请求使用 `documentDate`、`warehouseId`、`countDate`、`countScope`、`freezeInventory`、`remark` |
| `STC-004` | 编辑盘点单 | `PATCH /api/v1/stock-counts/{id}` | 仅草稿及允许修改状态；提交 `versionNo`，不得覆盖状态或系统汇总 |
| `STC-005` | 提交盘点单 | `POST /api/v1/stock-counts/{id}/submit` | 草稿进入待开始/待审核流程；幂等、版本、范围校验 |
| `STC-006` | 撤回盘点单 | `POST /api/v1/stock-counts/{id}/withdraw` | 仅尚未开始且无审批结果时撤回；原因和版本必填 |
| `STC-007` | 审核盘点单 | `POST /api/v1/stock-counts/{id}/approve` | 待审核进入允许完成状态；职责分离、审批与历史必记 |
| `STC-008` | 驳回盘点单 | `POST /api/v1/stock-counts/{id}/reject` | 待审核驳回；意见和版本必填，不改变库存 |
| `STC-009` | 开始盘点 | `POST /api/v1/stock-counts/{id}/start` | 固化账面数量并记录开始时间；执行 `freezeInventory` 既有规则，不改余额 |
| `STC-010` | 录入初盘结果 | `POST /api/v1/stock-counts/{id}/initial-results` | 逐行写入实盘数量和差异原因；初盘事实后续不得被复盘覆盖 |
| `STC-011` | 录入复盘结果 | `POST /api/v1/stock-counts/{id}/recount-results` | 仅差异行；写复盘数量、最终数量和原因，保留初盘事实 |
| `STC-012` | 完成盘点 | `POST /api/v1/stock-counts/{id}/complete` | 校验全部明细、审核和差异，记录完成事实；不直接修改库存 |
| `STC-013` | 取消盘点单 | `POST /api/v1/stock-counts/{id}/cancel` | 未开始且无下游时取消；原因、幂等键和版本必填 |
| `STC-014` | 作废盘点单 | `POST /api/v1/stock-counts/{id}/void` | 已开始但未完成且无调整下游时作废；原因及高风险权限必填 |
| `STC-015` | 盘点差异明细 | `GET /api/v1/stock-counts/{id}/differences` | 返回账面、初盘、复盘、最终数量及差异状态，不生成调整 |
| `STC-016` | 盘点状态历史 | `GET /api/v1/stock-counts/{id}/status-history` | 返回既有状态历史和审批投影 |
| `STC-017` | 导出盘点单 | `POST /api/v1/stock-counts/export` | 按查询范围异步导出；仓库与导出权限、脱敏和审计必需；关联调整沿用 `INV-013` 按 `stockCountId` 查询 |

创建和编辑明细只接受 Frozen `skuId`、`batchNo` 及允许的备注；`bookQuantity`、差异、汇总和编号由服务端从正式事实生成。初盘/复盘请求使用现有明细 ID、数量、差异原因、`versionNo`，不得提交任意目标状态。

### 7.2 销售退货 API（13 个）

| 编号 | 名称 | 方法与路径 | 关键规则 |
| --- | --- | --- | --- |
| `SRT-001` | 销售退货列表 | `GET /api/v1/sales-returns` | 按编号、原出库、店铺、接收仓、日期、结果和状态筛选分页 |
| `SRT-002` | 销售退货详情 | `GET /api/v1/sales-returns/{id}` | 返回主明细、原销售出库、数量分类、状态历史和权限动作摘要 |
| `SRT-003` | 创建销售退货单 | `POST /api/v1/sales-returns` | 关联合法原销售出库与明细；创建草稿，幂等键必填 |
| `SRT-004` | 编辑销售退货单 | `PATCH /api/v1/sales-returns/{id}` | 仅草稿/驳回；`versionNo` 必填，不可直接写状态或库存 |
| `SRT-005` | 提交销售退货单 | `POST /api/v1/sales-returns/{id}/submit` | 校验来源、可退量、数量等式、仓库和版本 |
| `SRT-006` | 撤回销售退货单 | `POST /api/v1/sales-returns/{id}/withdraw` | 待审核且未审批、未收货时撤回；原因必填 |
| `SRT-007` | 审核销售退货单 | `POST /api/v1/sales-returns/{id}/approve` | 职责分离；审核只更新审批事实，不增加库存 |
| `SRT-008` | 驳回销售退货单 | `POST /api/v1/sales-returns/{id}/reject` | 待审核驳回；意见和版本必填 |
| `SRT-009` | 取消销售退货单 | `POST /api/v1/sales-returns/{id}/cancel` | 未形成退货库存结果且无下游时取消；原因必填 |
| `SRT-010` | 确认退货入库 | `POST /api/v1/sales-returns/{id}/confirm-inbound` | 正式确认后按可售/待处理/损坏语义原子更新库存并追加流水 |
| `SRT-011` | 查询可退来源与数量 | `GET /api/v1/sales-return-eligible-items` | 按原销售出库查询授权范围内合法可退明细和服务端派生可退量 |
| `SRT-012` | 销售退货状态历史 | `GET /api/v1/sales-returns/{id}/status-history` | 返回状态、审批和库存确认历史投影 |
| `SRT-013` | 导出销售退货单 | `POST /api/v1/sales-returns/export` | 按授权店铺、仓库及字段范围导出并审计 |

创建字段只使用 Frozen 主表字段 `outboundOrderId`、`storeId`、`returnWarehouseId`、`externalReturnNo`、`returnDate`、`returnReason`、`remark`，以及明细 `outboundOrderItemId`、`returnedQuantity`、`sellableQuantity`、`pendingQuantity`、`damagedQuantity`、`inventoryCondition`、`dispositionMethod`、`remark`。服务端校验 `returnedQuantity = sellableQuantity + pendingQuantity + damagedQuantity` 及累计可退量。

### 7.3 报损 API（13 个）

| 编号 | 名称 | 方法与路径 | 关键规则 |
| --- | --- | --- | --- |
| `DMG-001` | 报损单列表 | `GET /api/v1/damage-reports` | 按编号、仓库、来源、日期、处置方式和状态筛选分页 |
| `DMG-002` | 报损单详情 | `GET /api/v1/damage-reports/{id}` | 返回主明细、来源、金额脱敏、状态历史和权限动作摘要 |
| `DMG-003` | 创建报损单 | `POST /api/v1/damage-reports` | 创建既有正式报损对象；幂等键必填，不减少库存 |
| `DMG-004` | 编辑报损单 | `PATCH /api/v1/damage-reports/{id}` | 仅待鉴定/驳回等允许状态；`versionNo` 必填 |
| `DMG-005` | 提交报损单 | `POST /api/v1/damage-reports/{id}/submit` | 校验仓库、SKU、批次、数量、原因、来源组合和版本 |
| `DMG-006` | 撤回报损单 | `POST /api/v1/damage-reports/{id}/withdraw` | 待审核且未审批时撤回；原因必填，不改变库存 |
| `DMG-007` | 审核报损单 | `POST /api/v1/damage-reports/{id}/approve` | 待审核进入已批准；职责分离，不减少库存 |
| `DMG-008` | 驳回报损单 | `POST /api/v1/damage-reports/{id}/reject` | 待审核进入已驳回；意见和版本必填 |
| `DMG-009` | 取消报损单 | `POST /api/v1/damage-reports/{id}/cancel` | 尚未形成库存流水且无下游时取消；原因必填 |
| `DMG-010` | 确认报损出库 | `POST /api/v1/damage-reports/{id}/confirm-outbound` | 已批准且库存合法时原子减少库存、追加流水并进入已报损 |
| `DMG-011` | 校验可报损库存 | `POST /api/v1/damage-reports/stock-validation` | 只读校验仓库、SKU、批次和数量；不锁定或修改库存 |
| `DMG-012` | 报损状态历史 | `GET /api/v1/damage-reports/{id}/status-history` | 返回状态、审批及正式出库历史投影 |
| `DMG-013` | 导出报损单 | `POST /api/v1/damage-reports/export` | 按仓库、成本和导出权限处理并审计 |

创建字段只使用 Frozen 主表字段 `warehouseId`、`sourceDocumentType`、`sourceDocumentId`、`damageDate`、`damageReason`、`responsibleParty`、`dispositionMethod`、`remark`，以及明细 `skuId`、`sourceDocumentItemId`、`quantity`、`batchNo`、`unitCost`、`lossAmount`、`damageReason`、`inventoryCondition`、`remark`。来源类型与来源 ID 必须同时为空或同时非空；金额和汇总由服务端复核。

### 7.4 统一请求、响应与业务错误

三类接口复用 API Master Specification 的 Header、统一响应包装、分页、排序、筛选、字段命名、日期时间、十进制字符串、HTTP 状态和安全规则。列表返回授权范围内的 `data.items` 与分页 `meta`；详情返回 Frozen 主明细、只读派生值、`versionNo` 和允许动作摘要。状态动作至少提交 `versionNo` 及适用的 `reason` 或 `comment`，不得提交目标状态；创建、动作和导出使用 `Idempotency-Key`。

新增业务错误码不改变现有分类或含义：

| 错误码 | 使用场景 |
| --- | --- |
| `RESOURCE_STOCK_COUNT_NOT_FOUND` | 盘点单不存在或不在授权范围 |
| `STATE_STOCK_COUNT_ACTION_NOT_ALLOWED` | 当前盘点/审核状态不允许动作 |
| `VALIDATION_COUNT_DIFFERENCE_REASON_REQUIRED` | 盘点存在差异但未填写原因 |
| `CONFLICT_STOCK_COUNT_VERSION` | 盘点版本、状态或账面事实已变化 |
| `RESOURCE_SALES_RETURN_NOT_FOUND` | 销售退货单不存在或不可见 |
| `STATE_SALES_RETURN_ACTION_NOT_ALLOWED` | 当前退货状态不允许动作 |
| `VALIDATION_RETURN_QUANTITY_EXCEEDED` | 累计退回数量超过合法可退量 |
| `VALIDATION_RETURN_QUANTITY_MISMATCH` | 退回数量与分类数量之和不一致 |
| `RESOURCE_DAMAGE_REPORT_NOT_FOUND` | 报损单不存在或不可见 |
| `STATE_DAMAGE_REPORT_ACTION_NOT_ALLOWED` | 当前报损状态不允许动作 |
| `VALIDATION_DAMAGE_SOURCE_PAIR_INVALID` | 报损来源类型与来源 ID 组合不完整 |
| `INVENTORY_DAMAGE_QUANTITY_INSUFFICIENT` | 确认报损时可用库存不足 |

认证、权限、格式、限流、幂等、通用并发和系统错误继续复用 Task 5.1 既有错误码；错误响应不得泄露资源存在性、库存成本或内部实现。

## 8. 权限与数据范围

- 统一执行身份、功能、操作、角色有效性、记录、仓库、店铺、字段、成本和导出权限；
- 盘点至少区分查看、创建、编辑、执行、复盘、审核、完成、取消/作废和导出；
- 销售退货至少区分查看、创建、编辑、审核、确认入库和导出；来源店铺、原出库与接收仓均须授权；
- 报损至少区分查看、创建、编辑、审核、库存校验、确认出库和导出；
- 制单与审核遵循职责分离；客户端按钮隐藏不替代服务端逐请求校验；
- 无成本权限时隐藏或脱敏单位成本、损失金额及库存流水金额。

## 9. 幂等与并发控制

创建、提交、撤回、审核、驳回、开始、结果录入、完成、取消/作废、库存确认和导出均遵循 Task 5.1 的幂等规则。写请求使用 `Idempotency-Key`；可更新单据使用既有 `versionNo`，同时校验当前状态、来源累计、库存事实及下游记录。同键不同请求、版本冲突、状态竞争或重复库存执行返回 409，不得产生重复单据或流水。

## 10. 库存事务与流水规则

- 盘点开始、初盘、复盘、审核和完成均不直接修改库存；差异只能由既有 `INV-*` 库存调整流程形成正式余额变化；
- 销售退货创建、提交和审核不增加库存；仅 `SRT-010` 可按 Frozen 数量分类原子形成库存结果与只追加流水；
- 报损创建、提交和审核不减少库存；仅 `DMG-010` 在再次校验可用库存后原子扣减并追加流水；
- 库存确认必须在单一事务内更新余额、流水、单据状态、来源累计和审计；失败整体回滚；
- 禁止负库存、重复流水、直接修改余额或删除/覆盖既有流水。

## 11. 审计要求

所有状态动作、初盘、复盘、完成、库存确认、敏感查看、权限拒绝和导出均记录 Request ID、操作人、对象、动作、结果、必要前后值及失败原因。状态动作同步写既有状态历史，审核同步写审批记录。日志不得保存 Token、未脱敏个人信息、完整文件内容或内部实现细节。

## 12. 对 API 总数的影响

API Master Specification v1.0 的 272 个历史 Approved/Frozen 接口保持原编号与含义。本次正式新增接口 43 个：盘点 17、销售退货 13、报损 13。API Master Specification v1.1 正式总数为 315。

项目负责人已完成 GitHub 验收并正式批准本 Change Request；API Master Specification v1.1 与 315 个接口状态为 Completed / Approved / Frozen。v1.0 与 272 个接口保留为历史冻结基线。

## 13. 对 Phase 5 文档的影响

- API Master Specification 更新为 v1.1、Completed / Approved / Frozen，并登记 43 个正式新增接口；
- Task 5.4 删除三类能力属于范围排除的错误口径，补充 `STC-*`、`SRT-*`、`DMG-*` 设计；
- Phase 5 Final Consistency Review 修正“页面全部覆盖”遗漏，并已在本 Change Request 获批后完成补充复核；
- Task 5.1、Task 5.2、Task 5.3、Task 5.5 的既有正文和接口不变。

## 14. 对 Task 6.2 的影响

Task 6.2 已将三类页面、动作、状态、权限和 API 映射更新为正式输入；API Change Request 001 批准后阻塞解除，Phase 6 Final Consistency Review 已按独立指令执行。

## 15. 不影响范围

本变更不修改 Frozen 业务规则、Database Logical Design v1.1、Approved 页面、既有 272 个 API、采购、生产、验收、普通入库/出库、调拨、跨境、导入、附件、日志、安全、业务对象、数据库对象或九阶段路线；不编写代码，不创建真实 API Route，不安装依赖，不启动 Phase 7。

## 16. 风险与回滚原则

- 批准结果：三类页面/API 覆盖已完整，原 Final Consistency Review 阻塞已解除；
- 实现期风险：重复确认、并发库存变化、来源累计超限和权限越界；由幂等、版本、条件更新、事务及审计控制；
- 文档回滚：v1.1 已正式冻结，后续不得直接回退或修改；任何变化必须再次经过正式 Change Request；
- 数据回滚：本任务没有代码或数据写入，不存在数据库迁移或数据回滚。

## 17. 验收标准

1. 43 个接口编号唯一且未占用，数量统计为 17 + 13 + 13；
2. 三类 Approved 页面动作均有最小完备 API 映射；
3. 所有请求、响应、Header、分页、错误码、权限、幂等、并发、日志和安全遵循 Task 5.1；
4. 盘点完成不改库存，销售退货和报损仅由正式确认动作改变库存并追加流水；
5. 仅使用 Frozen 既有表、字段、关系和状态；
6. API Master v1.1 正式总数准确为 315，既有 272 个接口不变；
7. Phase 5、Phase 6 和治理文档的批准状态与下一步一致；
8. 未编写代码、创建 Route、安装依赖或启动 Phase 7；Phase 6 Final Consistency Review 已在本 Change Request 获批后按独立正式指令执行。

## 18. 最终结论

库存盘点、销售退货和报损 API 的最小完备设计已完成并获得批准。Frozen Database Logical Design v1.1 可以完整支撑全部接口，无需数据库 DCR。本次新增 43 个正式接口，API Master Specification v1.1 正式总数为 315。

API Change Request 001 状态为 Completed / Approved，API Master Specification v1.1 已重新冻结。库存盘点、销售退货和报损页面全部保留；`STC-*` 17 个、`SRT-*` 13 个、`DMG-*` 13 个接口正式生效。Database Logical Design v1.1 未修改，不需要数据库 DCR。当前下一步为 Phase 6 Final Consistency Review GitHub 验收，不得启动 Phase 7。
