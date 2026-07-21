---
document_name: Task 5.3 生产、质量验收与库存 API
version: 1.1
status: Completed / Approved
project: Violin ERP Lite
owner: Project Manager
related_phase: Phase 5
---

# Task 5.3：生产、质量验收与库存 API 设计

## 1. 文档目的与范围

本文档定义委外生产、生产进度、分批完工、生产付款、统一质量验收、库存查询、库存流水、库存预警、库存事务原则及库存调整的 API 契约。PC 管理端与微信小程序共用 `/api/v1`、统一请求响应、认证、权限、数据范围、状态、幂等、并发、错误码、日志和脱敏规则。

覆盖对象：

- 生产：`production_orders`、`production_order_items`、`production_progress_records`、`production_completion_records`、`production_completion_record_items`、`production_payments`；
- 验收：`inspection_orders`、`inspection_order_items`，统一支持采购或生产单一来源；
- 库存：`inventories`、`inventory_transactions`、`inventory_alerts`、`inventory_adjustments`、`inventory_adjustment_items`；
- 只读关联：生产订单的验收、入库、跨境发货、付款和库存进度。

本文件只进行接口契约设计，不创建真实 API Route，不编写 Controller、Service、Repository 或业务代码，不修改 Frozen 数据库或 Approved 页面。

## 2. 设计依据及对象映射

| 模块 | 业务与状态来源 | Frozen 表与关键字段 | Approved 页面 | 权限范围 |
| --- | --- | --- | --- | --- |
| 生产订单 | BR-006、BR-010、BR-025 至 BR-027；Task 2.5 第 2、3、6 节 | `production_orders`、`production_order_items`；厂家、日期、金额、累计数量、`status`、`approval_status`、`version_no` | Task 4.7 第 4 至 6、12 节 | 功能、记录、厂家、金额权限 |
| 生产进度 | Task 2.5 第 6.1 节 | `production_progress_records`；阶段、比例、截至记录完工量、预计日期、说明、报告人 | Task 4.7 第 7 节 | 进度查看/登记、来源生产单范围 |
| 分批完工 | Task 2.5 第 6.1.1 节；DCR-001 | `production_completion_records`、`production_completion_record_items`；生产单、日期、目标仓、数量、原生产明细、`completion_status` | Task 4.7 第 8 节 | 完工查看、登记、确认、撤销、作废及目标仓库权限 |
| 生产付款 | BR-025、BR-026；Task 2.5 第 6.4 节 | `production_payments`、`production_orders`、`manufacturers` | Task 4.7 第 11 节 | 付款、金额和敏感字段权限 |
| 质量验收 | BR-003、BR-004；Task 2.5 第 7 节 | `inspection_orders`、`inspection_order_items`；互斥采购/生产来源、验收仓、验收人、数量及结果 | Task 4.7 第 9、10 节；Task 4.6 采购验收 | 验收功能、来源记录、厂家仓/仓库范围 |
| 当前库存 | BR-011 至 BR-018、BR-027 至 BR-029 | `inventories`；SKU、仓库、账面、可用、预留、待处理数量 | Task 4.8 第 4 至 10 节 | `role_warehouses.access_level`、成本/金额权限 |
| 库存流水 | BR-015、BR-016、BR-029 | `inventory_transactions`；来源主单/明细、方向、前后数量、成本、操作人 | Task 4.8 第 11 节 | 仓库、流水、成本及金额权限 |
| 库存预警 | BR-018；Task 2.5 第 14.3 节 | `inventory_alerts` | Task 4.8 第 12 节 | 预警查看、处理、关闭、仓库范围 |
| 库存调整 | Task 2.5 第 14.1 节 | `inventory_adjustments`、`inventory_adjustment_items` | Task 4.9 第 8 节；Task 4.8 只读入口 | 调整查看、创建、审核、执行及仓库范围 |

字段使用 lowerCamelCase 映射 Frozen snake_case。接口不得增加采购与生产直接关系、生产单目标仓库、独立生产异常、独立厂家库存、独立在途数量或直接可写库存余额。

## 3. API 模块目录与数量

### 3.1 生产接口目录

| 编号 | 接口 | HTTP 与路径 | 使用端 | 权限/范围 | 状态/幂等/并发 | 日志与页面 |
| --- | --- | --- | --- | --- | --- | --- |
| `PRO-001` | 生产单列表 | `GET /api/v1/production-orders` | PC、小程序 | 生产查看、记录/厂家范围 | 只读 | 异常/敏感查询；生产列表 |
| `PRO-002` | 生产单详情 | `GET /api/v1/production-orders/{id}` | PC、小程序 | 查看、金额权限 | 只读 | 敏感查看；生产详情 |
| `PRO-003` | 创建生产单 | `POST /api/v1/production-orders` | PC、小程序 | 创建 | 创建草稿；幂等键；事务 | 必记；新增页 |
| `PRO-004` | 修改生产单 | `PATCH /api/v1/production-orders/{id}` | PC、小程序 | 编辑 | 草稿/已驳回；`versionNo` | 必记；编辑页 |
| `PRO-005` | 提交 | `POST /api/v1/production-orders/{id}/submit` | PC、小程序 | 提交 | 草稿/已驳回→待审核；幂等键、版本 | 必记 |
| `PRO-006` | 撤回 | `POST /api/v1/production-orders/{id}/withdraw` | PC、小程序 | 提交人/撤回 | 待审核→草稿；幂等键、版本 | 必记 |
| `PRO-007` | 审核通过 | `POST /api/v1/production-orders/{id}/approve` | PC、小程序 | 审核、职责分离 | 待审核→已审核；幂等键、版本 | 审批/状态/审计 |
| `PRO-008` | 审核驳回 | `POST /api/v1/production-orders/{id}/reject` | PC、小程序 | 审核 | 待审核→已驳回；幂等键、版本 | 审批/状态/审计 |
| `PRO-009` | 反审核 | `POST /api/v1/production-orders/{id}/unapprove` | PC | 反审核 | 已审核且无下游→草稿；幂等键、版本 | 必记 |
| `PRO-010` | 开始生产 | `POST /api/v1/production-orders/{id}/start` | PC | 生产执行 | 已审核且未开始；幂等键、版本 | 设置实际开始日并记进度/审计 |
| `PRO-011` | 取消 | `POST /api/v1/production-orders/{id}/cancel` | PC | 取消 | 草稿→已取消；幂等键、版本 | 必记原因 |
| `PRO-012` | 作废 | `POST /api/v1/production-orders/{id}/void` | PC | 作废 | 已审核且无下游→已作废；幂等键、版本 | 必记原因 |
| `PRO-013` | 执行进度汇总 | `GET /api/v1/production-orders/{id}/progress-summary` | PC、小程序 | 查看 | 实时派生 | 生产详情/跟踪 |
| `PRO-014` | 关联验收 | `GET /api/v1/production-orders/{id}/inspection-orders` | PC、小程序 | 生产及验收查看 | 只读 | 生产详情 |
| `PRO-015` | 关联入库 | `GET /api/v1/production-orders/{id}/inbound-orders` | PC、小程序 | 生产、入库、仓库权限 | 只读 | 生产详情 |
| `PRO-016` | 状态历史 | `GET /api/v1/production-orders/{id}/status-history` | PC、小程序 | 查看 | 只读 | 状态历史 |
| `PRO-017` | 导出 | `POST /api/v1/production-orders/export` | PC | 导出、金额/范围权限 | 幂等键 | 必记 |
| `PRO-018` | 进度记录列表 | `GET /api/v1/production-orders/{id}/progress-records` | PC、小程序 | 进度查看 | 只读 | 进度 Tab |
| `PRO-019` | 进度记录详情 | `GET /api/v1/production-progress-records/{recordId}` | PC、小程序 | 进度查看 | 只读 | 进度详情 |
| `PRO-020` | 新增进度记录 | `POST /api/v1/production-orders/{id}/progress-records` | PC | 进度登记 | 幂等键；来源状态条件更新 | 必记 |
| `PRO-021` | 完工记录列表 | `GET /api/v1/production-orders/{id}/completion-records` | PC、小程序 | 完工查看 | 只读 | 分批完工 Tab |
| `PRO-022` | 完工记录详情 | `GET /api/v1/production-completion-records/{recordId}` | PC、小程序 | 完工查看、仓库范围 | 只读 | 完工详情 |
| `PRO-023` | 生产付款列表 | `GET /api/v1/production-orders/{id}/payments` | PC | 付款/金额权限 | 只读 | 付款 Tab |
| `PRO-024` | 生产付款详情 | `GET /api/v1/production-payments/{paymentId}` | PC | 付款/敏感字段权限 | 只读 | 必记敏感查看 |
| `PRO-025` | 创建生产付款 | `POST /api/v1/production-orders/{id}/payments` | PC | 付款记录 | 幂等键；累计金额事务 | 必记 |
| `PRO-026` | 创建完工记录 | `POST /api/v1/production-orders/{id}/completion-records` | PC | 分批完工登记、目标仓范围 | 创建草稿；幂等键；生产单版本 | 必记 |
| `PRO-027` | 提交确认完工记录 | `POST /api/v1/production-completion-records/{recordId}/confirm` | PC | 分批完工确认 | 草稿→已确认；幂等键、版本、数量事务 | 状态历史/审计必记 |
| `PRO-028` | 撤销完工记录 | `POST /api/v1/production-completion-records/{recordId}/revoke` | PC | 分批完工撤销 | 已确认且无下游→已撤销；幂等键、版本 | 原因、下游校验、状态历史/审计必记 |
| `PRO-029` | 作废完工记录 | `POST /api/v1/production-completion-records/{recordId}/void` | PC | 分批完工作废 | 草稿→已作废；幂等键、版本 | 原因、状态历史/审计必记 |

生产正式接口数量为 29 个。

### 3.2 质量验收接口目录

| 编号 | 接口 | HTTP 与路径 | 使用端 | 权限/范围 | 状态/幂等/并发 | 日志与页面 |
| --- | --- | --- | --- | --- | --- | --- |
| `INS-001` | 验收单列表 | `GET /api/v1/inspection-orders` | PC、小程序 | 验收查看、来源/仓库范围 | 只读 | 异常/敏感查询；验收列表 |
| `INS-002` | 验收单详情 | `GET /api/v1/inspection-orders/{id}` | PC、小程序 | 查看 | 只读 | 验收详情 |
| `INS-003` | 创建验收单 | `POST /api/v1/inspection-orders` | PC | 验收创建 | 创建草稿；幂等键 | 必记 |
| `INS-004` | 修改验收单 | `PATCH /api/v1/inspection-orders/{id}` | PC | 验收编辑 | 仅草稿；`versionNo` | 必记 |
| `INS-005` | 提交验收 | `POST /api/v1/inspection-orders/{id}/submit` | PC | 验收提交 | 草稿→待确认；幂等键、版本 | 状态/审计 |
| `INS-006` | 确认验收 | `POST /api/v1/inspection-orders/{id}/confirm` | PC | 验收确认 | 待确认→已确认；幂等键、版本 | 必记；形成入库资格但不改库存 |
| `INS-007` | 撤销验收 | `POST /api/v1/inspection-orders/{id}/revoke` | PC | 验收撤销 | 已确认且无入库→已撤销；幂等键、版本 | 必记原因 |
| `INS-008` | 作废验收 | `POST /api/v1/inspection-orders/{id}/void` | PC | 验收作废 | 草稿/待确认且无下游→已作废；幂等键、版本 | 必记原因 |
| `INS-009` | 状态历史 | `GET /api/v1/inspection-orders/{id}/status-history` | PC、小程序 | 查看 | 只读 | 状态 Tab |
| `INS-010` | 导出验收 | `POST /api/v1/inspection-orders/export` | PC | 导出、字段/范围权限 | 幂等键 | 必记 |

正式状态机没有“验收驳回”或“验收取消”，因此不设计对应接口。质量验收正式接口数量为 10 个。

### 3.3 库存接口目录

| 编号 | 接口 | HTTP 与路径 | 使用端 | 权限/范围 | 状态/幂等/并发 | 日志与页面 |
| --- | --- | --- | --- | --- | --- | --- |
| `INV-001` | 库存汇总 | `GET /api/v1/inventories/summary` | PC、小程序 | 库存查看、仓库范围 | 实时聚合 | 高风险查询可记；概况 |
| `INV-002` | 库存列表 | `GET /api/v1/inventories` | PC、小程序 | 库存查看、仓库范围 | 只读 | 当前库存 |
| `INV-003` | 库存详情 | `GET /api/v1/inventories/{id}` | PC、小程序 | 库存查看、仓库范围 | 只读 | SKU/仓库详情 |
| `INV-004` | 分仓汇总 | `GET /api/v1/inventories/by-warehouse` | PC、小程序 | 仓库范围 | 实时聚合 | 分仓库存 |
| `INV-005` | 厂家仓库存 | `GET /api/v1/inventories/manufacturer-warehouses` | PC、小程序 | 厂家仓范围 | 只读视图 | 厂家仓库存 |
| `INV-006` | 库存流水列表 | `GET /api/v1/inventory-transactions` | PC、小程序 | 流水查看、仓库范围 | 只读 | 流水页 |
| `INV-007` | 库存流水详情 | `GET /api/v1/inventory-transactions/{id}` | PC、小程序 | 流水查看、仓库/成本权限 | 只读 | 流水详情 |
| `INV-008` | 预警列表 | `GET /api/v1/inventory-alerts` | PC、小程序 | 预警查看、仓库范围 | 只读 | 预警页 |
| `INV-009` | 预警详情 | `GET /api/v1/inventory-alerts/{id}` | PC、小程序 | 预警查看 | 只读 | 预警详情 |
| `INV-010` | 标记预警已查看 | `POST /api/v1/inventory-alerts/{id}/view` | PC | 预警查看 | 幂等键、`updatedAt` | 必记 |
| `INV-011` | 登记预警处理 | `POST /api/v1/inventory-alerts/{id}/handle` | PC | 预警处理 | 幂等键、`updatedAt` | 必记 |
| `INV-012` | 关闭预警 | `POST /api/v1/inventory-alerts/{id}/close` | PC | 预警关闭 | 幂等键、`updatedAt` | 必记；不改库存 |
| `INV-013` | 调整单列表 | `GET /api/v1/inventory-adjustments` | PC | 调整查看、仓库范围 | 只读 | Task 4.9 调整页/Task 4.8 跳转 |
| `INV-014` | 调整单详情 | `GET /api/v1/inventory-adjustments/{id}` | PC | 调整查看、成本权限 | 只读 | 调整详情 |
| `INV-015` | 创建调整单 | `POST /api/v1/inventory-adjustments` | PC | 调整创建、仓库操作 | 创建草稿；幂等键 | 必记 |
| `INV-016` | 修改调整单 | `PATCH /api/v1/inventory-adjustments/{id}` | PC | 调整编辑 | 草稿/已驳回；`versionNo` | 必记 |
| `INV-017` | 提交调整单 | `POST /api/v1/inventory-adjustments/{id}/submit` | PC | 调整提交 | 草稿/已驳回→待审核；幂等键、版本 | 必记 |
| `INV-018` | 撤回调整单 | `POST /api/v1/inventory-adjustments/{id}/withdraw` | PC | 提交人/撤回 | 待审核→草稿；幂等键、版本 | 必记 |
| `INV-019` | 审核调整单 | `POST /api/v1/inventory-adjustments/{id}/approve` | PC | 调整审核、职责分离 | 待审核→已审核；幂等键、版本 | 审批/状态/审计 |
| `INV-020` | 驳回调整单 | `POST /api/v1/inventory-adjustments/{id}/reject` | PC | 调整审核 | 待审核→已驳回；幂等键、版本 | 必记意见 |
| `INV-021` | 反审核调整单 | `POST /api/v1/inventory-adjustments/{id}/unapprove` | PC | 反审核 | 已审核且未执行→草稿；幂等键、版本 | 必记原因 |
| `INV-022` | 取消调整单 | `POST /api/v1/inventory-adjustments/{id}/cancel` | PC | 调整取消 | 草稿→已取消；幂等键、版本 | 必记原因 |
| `INV-023` | 作废调整单 | `POST /api/v1/inventory-adjustments/{id}/void` | PC | 调整作废 | 已审核且未执行→已作废；幂等键、版本 | 必记原因 |
| `INV-024` | 执行库存调整 | `POST /api/v1/inventory-adjustments/{id}/execute` | PC | 调整执行、仓库操作 | 已审核→已完成；幂等键、版本、库存条件更新 | 高风险必记；原子库存事务 |
| `INV-025` | 调整状态历史 | `GET /api/v1/inventory-adjustments/{id}/status-history` | PC | 调整查看 | 只读 | 状态历史 |
| `INV-026` | 导出库存/流水/调整 | `POST /api/v1/inventory-exports` | PC | 导出、仓库/成本权限 | 幂等键 | 必记 |

库存正式接口数量为 26 个。Task 5.3 正式接口总数为 29 + 10 + 26 = 65 个。

## 4. 生产订单查询接口

`PRO-001` 支持 `documentNo`、`manufacturerId`、`status`、`approvalStatus`、最新 `progressStage`（派生）、`plannedStartDateFrom/To`、`expectedCompletionDateFrom/To`、`dueState`、`skuId`、`productId`、`createdBy`、`submittedBy`、`approvedBy`、分页与白名单排序。关键词只搜索生产单号、厂家和 SKU 安全快照。

列表和详情返回厂家快照、计划/实际日期、金额、计划总量、累计完工/验收/合格/入库/发货量、完成比例及付款汇总。累计字段为进度快照，正式事实以进度、完工、验收、入库、发货和付款记录复核。不得返回采购单关系或生产单统一目标仓库。

`PRO-013` 实时派生生产、完工、验收、入库、发货和付款进度；临期/逾期只为查询条件，不写入新状态。

## 5. 生产订单创建接口

`PRO-003` 请求：`documentDate`、`manufacturerId`、`plannedStartDate`、`expectedCompletionDate`、`currencyCode`、`remark`、`items`。明细为 `skuId`、`plannedQuantity`、`processingUnitPrice`、`remark`。

服务端生成 `id`、`documentNo`、厂家和 SKU 快照、行号、行金额、总量、金额、累计字段、`completionPercentage=0`、草稿状态、创建信息和 `versionNo=1`。币种只接受 Approved/Frozen 规则允许值。请求不得包含 `warehouseId`、采购单 ID、累计数量、目标状态或服务端审计字段。

厂家、SKU 必须有效；计划数量大于 0；价格不小于 0；预计完工日不早于计划开始日；编号和创建在同一事务中完成；`Idempotency-Key` 必填。

## 6. 生产订单修改接口

`PRO-004` 仅允许草稿或已驳回。可修改厂家、业务日期、计划日期、预计日期、备注和完整明细集合；`versionNo` 必填。服务端重建行号并重算快照、金额和总量。

存在进度、完工、验收、付款、入库、跨境发货或库存流水后，禁止修改厂家、SKU、数量、价格或删除关联行。不得接收状态、实际日期、完成比例、累计完工/验收/合格/入库/发货量、已付/未付金额或统一目标仓库。

## 7. 生产状态动作接口

- `PRO-005` 提交、`PRO-006` 撤回、`PRO-007` 审核、`PRO-008` 驳回、`PRO-009` 反审核、`PRO-011` 取消和 `PRO-012` 作废均使用专用动作；
- `PRO-010` 请求 `actualStartDate`、必填 `progressDescription` 及可选 `estimatedCompletionDate`；只在已审核且尚未开始时设置实际开始日，并追加生产中进度事实，不创建新状态字段；
- 系统完成判定不是客户端接口：计划量已全部完工或终止、完成验收、合格量已入库、不合格已处理、无剩余及无待处理异常后，原子更新为已完成并设置实际完成时间；
- 反审核、作废仅在无进度、完工、验收、付款、入库、发货和库存流水时允许；
- 客户端不得提交任意目标状态或新增审批层级。

通用单据状态代码沿用 `draft`、`pending_approval`、`approved`、`rejected`、`completed`、`cancelled`、`voided`，仅映射已批准中文状态。

## 8. 生产进度接口

`PRO-020` 请求：`progressDate`、`progressStage`、`progressPercentage`、`completedQuantity`、`estimatedCompletionDate`、`progressDescription`、`reportedByName`、`attachmentRequired`。

阶段只使用待生产 `pending_production`、已排产 `scheduled`、生产中 `in_production`、部分完工 `partially_completed`、已全部完工 `fully_completed`、暂停 `paused`、逾期 `overdue` 和已终止 `terminated`。比例为 0 至 100；截至记录完工量不小于前次合法值且不超过计划总量；预计日期不早于进度日期。

进度记录是历史事实，创建后不提供普通修改、撤销或删除接口。纠错通过追加新记录说明，不覆盖历史。进度不得直接改变正式完工量或库存。附件只保存关联要求，上传与关联接口留待 Task 5.5。

## 9. 分批完工接口

`PRO-021` 和 `PRO-022` 查询生产单、完工批次号、完工日期、目标仓、主记录数量、`completionStatus`、明细原生产单行、SKU 快照、完工数量、业务批次号及备注。`completionStatus` 只允许 `draft`、`confirmed`、`revoked`、`voided`，分别对应 Draft（草稿）、Confirmed（已确认）、Revoked（已撤销）、Voided（已作废）。

`PRO-026` 创建请求为：`completionBatchNo`、`completionDate`、`warehouseId`、`remark`、`productionOrderVersionNo` 和 `items`；明细为 `productionOrderItemId`、`skuId`、`completedQuantity`、`batchNo`、`remark`。服务端生成主明细标识、快照、行号、数量合计和 `completionStatus=draft`。客户端不得提交目标状态。

创建时校验：目标仓为授权且适用的公司仓或对应厂家仓；每行只引用所属生产单明细；主数量等于明细合计；每行及已确认累计完工量不超计划；同一生产单批次号唯一；同一完工记录同一生产明细只出现一次。重复请求幂等，并发以生产单版本、累计已确认事实和唯一约束保护。

- `PRO-027` 只允许草稿提交确认；原子校验数量、状态、权限、版本和唯一性后置为已确认，并更新生产累计完工快照；确认只形成生产验收资格，不创建验收、入库、库存余额或库存流水；
- `PRO-028` 只允许已确认且不存在验收、入库、发货、库存流水或其他下游业务时撤销，原因必填；原子置为已撤销并按剩余已确认事实重算累计完工快照；
- `PRO-029` 只允许草稿作废，原因必填；作废不计入完工累计；
- 禁止已确认再次确认、已确认直接作废、已作废恢复及已撤销再次确认；已确认、已撤销、已作废记录不得物理删除。

## 10. 生产付款接口

`PRO-025` 请求：`paymentDate`、`paymentAmount`、`paymentMethod`、`bankReferenceNo`、`payeeAccountSnapshot`、`remark`。服务端从生产单派生厂家和币种，生成付款编号和付款状态，校验金额大于 0、累计付款不超过生产总额并更新生产单付款汇总。

付款状态独立于生产完成状态。不建立付款明细表，不提供普通修改或删除；附件上传留待 Task 5.5。银行参考号、账户快照和金额按权限脱敏并审计。

## 11. 验收单查询接口

`INS-001` 支持 `documentNo`、`sourceType=purchase|production`、`purchaseOrderId`、`productionOrderId`、`supplierId`/`manufacturerId`（通过正式来源派生）、`inspectionWarehouseId`、`status`、`inspectionDateFrom/To`、`inspectorId`、`skuId`、结果及派生 `inboundEligibility`。

响应返回互斥来源、验收仓、验收人、总量、结果、处置、明细数量、状态和只读入库资格。Frozen 数据库没有验收单到分批完工记录的直接关联，因此不得返回持久化 `productionCompletionRecordId`。

## 12. 验收单创建接口

`INS-003` 请求：`sourceType`、适用的 `purchaseOrderId` 或 `productionOrderId`、`inspectionDate`、`inspectionWarehouseId`、`inspectorId`、`remark`、`items`。明细为 `sourceItemId`、`skuId`、`inspectedQuantity`、`qualifiedQuantity`、`unqualifiedQuantity`、缺陷信息、结果、处置及备注。API 不接收 `pendingQuantity`。

两个来源 ID 必须且只能一个非空。`sourceItemId` 由主单来源类型解析为采购或生产订单明细，不得指向分批完工明细。服务端生成编号、快照、行号、主单总量和草稿状态。验收仓及验收人必须在功能和数据权限内；创建使用幂等键。

## 13. 验收编辑及提交接口

`INS-004` 仅允许草稿修改日期、验收仓、验收人、备注和明细；不得改变来源类型及来源主单。`versionNo` 必填。

每行和主单都必须满足 `inspectedQuantity = qualifiedQuantity + unqualifiedQuantity`。主单 `totalInspectedQuantity`、`totalQualifiedQuantity` 和 `totalUnqualifiedQuantity` 分别按同名明细语义汇总。API 不接收或返回验收待处理数量；既有 Frozen `inspection_order_items.pending_quantity` 在该接口口径下由服务端固定保存为零，不删除字段、不改变字段数量或数据库结构。`inspectionResult=pending` 仅可表达不合格量的处置尚待决定，不形成第三个数量桶。累计验收不得超过来源合法可验收量，重复验收以来源明细累计事实和条件更新防护。

`INS-005` 提交前重新校验来源状态、资料、数量平衡、缺陷与处置必填、权限和版本，目标为待确认。

## 14. 验收确认接口

`INS-006` 请求含 `versionNo`、可选 `confirmationComment`，并要求 `Idempotency-Key`。服务端校验待确认状态、验收功能权限、验收人员身份、来源记录有效、来源可验收量、数量平衡、无重复确认、仓库范围和版本。

确认原子写入已确认状态、状态历史、审计日志及必要审批事实。只有已确认的合格数量获得后续正式入库资格；不合格量不得进入正常可用库存。确认不得创建入库单、库存余额或库存流水。

## 15. 验收撤销、作废及禁止动作

- `INS-007`：已确认且尚无入库、退货、返工、报损或库存流水时可撤销，原因必填；
- `INS-008`：草稿或待确认且无下游时可作废，原因必填；
- 已形成入库或其他下游后禁止撤销或作废，应先按正式流程处理下游；
- 正式状态机不含“驳回”和“取消”，因此不设计同名接口，也不得混用作废或撤销；
- 两个动作均要求权限、幂等键、版本、状态历史和审计日志。

验收单状态代码仅为 `draft`、`pending_confirmation`、`confirmed`、`revoked`、`voided`；验收结果仅为 `qualified`、`unqualified`、`pending`。

## 16. 专人验收权限

跨境委外加工产品可由专人到厂家仓验收。验收人员不必等同仓库人员，但必须是现有 `users` 中有效用户，具有验收功能权限，并具有对应厂家仓、来源生产单或记录范围权限。不得新增“验收人员”角色。

服务端必须同时校验 `permissions`、`role_permissions`、`role_warehouses` 和来源业务范围；页面按钮隐藏不能替代后端校验。验收完成后仍由 Task 5.4 的正式入库流程执行。

## 17. 库存查询接口

`INV-001` 至 `INV-005` 只查询 `inventories` 与正式仓库、SKU、产品关系。支持 `warehouseId`、`warehouseType`、`manufacturerId`（厂家仓派生）、`skuId`、`productId`、分类、品牌、零库存、预警及实时派生库存状态。

响应仅使用 `onHandQuantity`、`availableQuantity`、`reservedQuantity`、`pendingQuantity`、最后流水和盘点时间。可用关系必须满足 `available = onHand - reserved - pending`。在途库存只通过在途仓记录表达；无锁定/冻结数量或独立批次库存余额字段。无权限仓库在查询和聚合前过滤。

Frozen 数据库没有独立库存批次主对象；`batchNo` 只在正式业务明细和流水中按适用业务保存，因此本 Task 不创建库存批次资源或批次余额接口。

## 18. 库存流水查询接口

`INV-006` 支持流水编号、流水类型、方向、来源类型、来源主单/明细、仓库、SKU、日期、批次和操作人筛选。`INV-007` 返回变动数量、前后数量、成本金额、来源、关联流水、操作人和追溯链路。

流水只追加，不提供新增、普通修改或删除接口。成本和金额按权限隐藏。`requestId` 通过关联审计日志的 `request_trace_id` 追溯，不新增流水字段。

## 19. 库存事务接口原则

本 Task 不提供通用 `POST/PATCH /inventories` 或手工流水接口。库存事务只能由正式业务动作触发；本 Task 的正式写入口是 `INV-024` 执行库存调整，其他采购入库、生产入库、销售出库、调拨和退货留待 Task 5.4。

每次库存事务必须在同一数据库事务内：锁定并读取来源单据、校验状态和权限、读取库存、校验可用量和版本、条件更新余额、追加流水、更新来源状态/版本、追加状态历史与审计。任一步失败整体回滚。

客户端不得传入变动后库存，不得绕过服务端计算；重复请求按认证主体、路径、动作和幂等键返回首次结果；来源单据和动作必须唯一追踪；并发竞争返回 `409`。禁止负库存；不得只更新余额不写流水，也不得只写流水不更新余额。

## 20. 库存调整接口

库存调整对象已由 Frozen `inventory_adjustments`、`inventory_adjustment_items` 及 Task 4.9 第 8 节明确支持，因此设计 `INV-013` 至 `INV-025`。

创建字段：`documentDate`、`warehouseId`、适用的 `stockCountId`、`adjustmentType`、`adjustmentReason`、`remark`、明细 `stockCountItemId`、`skuId`、`batchNo`、`adjustmentQuantity`、`adjustmentDirection`、`unitCost`、`remark`。盘点调整必须关联盘点主单和明细；独立纠错仅使用已批准类型和正式依据。

库存调整状态代码仅为 `draft`、`pending_approval`、`approved`、`rejected`、`completed`、`cancelled`、`voided`、`reversed`，分别映射 Task 4.9 已批准状态；本 Task 不扩展状态集合。

服务端读取 `quantityBefore`，并校验 `adjustmentQuantity` 不为零：增加方向必须为正数，减少方向必须为负数，方向与符号必须一致；`quantityAfter = quantityBefore + adjustmentQuantity`，增加/减少总量分别按绝对值汇总。客户端不得提交或覆盖调整前后数量。保存、提交和审核不修改库存。`INV-024` 仅在已审核时执行，逐行防负库存，原子更新余额、写流水并将单据置为已完成。已完成调整只读，纠错使用正式冲销流程；本 Task 不新增冲销接口语义。

## 21. 仓库数据权限矩阵

PROJECT 的现有正式角色不含“生产人员”或“验收人员”角色，故下表只使用现有角色并通过可配置权限表达职责。

| 操作 | 管理员 | 采购人员 | 仓库人员 | 销售人员 | 公司负责人 |
| --- | --- | --- | --- | --- | --- |
| 查询生产 | 按授权 | 关联采购默认无 | 关联仓库只读 | 默认无 | 按授权 |
| 创建/提交生产 | 按授权 | 另授权方可 | 默认无 | 无 | 默认无 |
| 审核生产 | 职责分离且授权 | 另授权且非制单人 | 无 | 无 | 按授权 |
| 填写进度/登记完工 | 按授权 | 默认无 | 目标仓范围内另授权 | 无 | 默认只读 |
| 执行验收 | 验收权限及范围 | 采购验收按授权 | 仓库/厂家仓及验收权限 | 无 | 按授权 |
| 查看库存/流水 | 按授权仓库 | 业务相关范围 | 按授权仓库 | 按销售相关范围 | 按授权 |
| 调整库存 | 高风险权限 | 无 | 创建/执行按职责分离 | 无 | 审核按授权 |
| 敏感金额 | 字段权限 | 业务必要权限 | 成本权限 | 默认无 | 字段权限 |

“生产人员”“验收人员”通过现有用户、角色和权限可配置体系分配能力，不新增角色或字段。

## 22. 状态转换矩阵

### 22.1 生产订单

| 当前状态 | 动作 | 目标 | 前置/禁止 | 幂等、错误与日志 |
| --- | --- | --- | --- | --- |
| 草稿/已驳回 | 提交 | 待审核 | 明细完整；资料有效 | 必填；`STATE_PRODUCTION_ORDER_ACTION_NOT_ALLOWED`；必记 |
| 待审核 | 撤回 | 草稿 | 尚未审核 | 必填；版本冲突 409；必记 |
| 待审核 | 审核/驳回 | 已审核/已驳回 | 职责分离 | 必填；审批竞争 409；审批/历史/审计 |
| 已审核 | 反审核 | 草稿 | 无任何下游 | 必填；有下游 409；必记 |
| 已审核 | 开始生产 | 单据状态不变 | 尚未开始；写实际开始日和进度 | 必填；重复动作 409；必记 |
| 草稿 | 取消 | 已取消 | 无下游 | 必填；原因；必记 |
| 已审核 | 作废 | 已作废 | 无下游 | 必填；原因；必记 |
| 已审核 | 系统完成 | 已完成 | 满足 Task 2.5 完成条件 | 系统事务；必记 |

### 22.2 分批完工

| 当前状态 | 动作 | 目标 | 前置/禁止 | 幂等、错误与日志 |
| --- | --- | --- | --- | --- |
| 草稿 | 提交确认 | 已确认 | 数量平衡、累计不超计划、目标仓及版本有效；禁止重复确认 | 必填；校验错误 422/冲突 409；状态历史/审计必记 |
| 草稿 | 作废 | 已作废 | 无下游；原因及版本必填；禁止已确认直接作废 | 必填；`STATE_PRODUCTION_COMPLETION_ACTION_NOT_ALLOWED`；必记 |
| 已确认 | 撤销 | 已撤销 | 无验收、入库、发货、库存流水或其他下游；原因及版本必填 | 必填；`CONFLICT_PRODUCTION_COMPLETION_DOWNSTREAM_EXISTS`；必记 |

已作废不得恢复，已撤销不得再次确认。客户端不得直接提交任意目标状态。

### 22.3 验收单

| 当前状态 | 动作 | 目标 | 前置/禁止 | 幂等、错误与日志 |
| --- | --- | --- | --- | --- |
| 草稿 | 提交 | 待确认 | 数量及处置完整 | 必填；校验错误 422；必记 |
| 待确认 | 确认 | 已确认 | 权限、来源、数量、版本有效 | 必填；重复确认 409；必记 |
| 已确认 | 撤销 | 已撤销 | 无入库或其他下游 | 必填；下游存在 409；必记 |
| 草稿/待确认 | 作废 | 已作废 | 无下游 | 必填；原因；必记 |

### 22.4 库存调整

| 当前状态 | 动作 | 目标 | 前置/禁止 | 幂等、错误与日志 |
| --- | --- | --- | --- | --- |
| 草稿/已驳回 | 提交 | 待审核 | 来源、仓库、明细完整 | 必填；422；必记 |
| 待审核 | 撤回 | 草稿 | 尚未审核 | 必填；409；必记 |
| 待审核 | 审核/驳回 | 已审核/已驳回 | 职责分离 | 必填；409；审批/审计 |
| 已审核 | 反审核 | 草稿 | 未执行、无流水 | 必填；409；必记 |
| 草稿 | 取消 | 已取消 | 无下游 | 必填；必记 |
| 已审核 | 作废 | 已作废 | 未执行、无流水 | 必填；必记 |
| 已审核 | 执行 | 已完成 | 库存、权限、版本有效 | 必填；原子库存事务；必记 |

## 23. 数量一致性规则

- 生产明细计划量大于 0；累计完工不超计划；
- 进度记录的完工量只是当时快照，不代替正式完工记录；
- 正式分批完工累计量来源于完工记录明细，不得重复计入；
- 验收累计不超采购可验收量或生产合法完工累计量；
- 每行及主单验收量等于合格量与不合格量之和；验收 API 不形成待处理数量桶；
- 合格累计量不超验收累计量；入库累计量不超已确认合格量；
- 生产发货累计量不超合法可发量；
- 剩余量由计划、完工、验收、入库和发货正式事实派生，不写新字段；
- 累计字段只是进度快照，正式事实以来源记录、入库单和库存流水为准；
- 并发更新必须重新汇总正式记录并使用条件更新，禁止按旧页面缓存累加。

## 24. 幂等与并发规则

创建生产单、所有状态动作、开始生产、新增进度、创建及确认/撤销/作废分批完工、创建验收、验收确认、创建调整单、执行调整、创建生产付款和导出均要求 `Idempotency-Key`。普通编辑使用 `versionNo` 或 `updatedAt` 条件更新。

并发保护组合使用 `versionNo`、`updatedAt`、当前状态、唯一约束、来源累计事实、库存条件更新和数据库事务。生产完工批次按生产单内唯一；库存余额按 SKU 与仓库唯一；盘点单最多生成一张库存调整单。不新增版本字段或幂等表。

## 25. 业务错误码

| 错误码 | HTTP | 含义 |
| --- | --- | --- |
| `RESOURCE_PRODUCTION_ORDER_NOT_FOUND` | 404 | 生产单不存在或不可见 |
| `RESOURCE_PRODUCTION_MANUFACTURER_INVALID` | 422 | 厂家不存在、停用或不可用 |
| `STATE_PRODUCTION_ORDER_ACTION_NOT_ALLOWED` | 422 | 当前生产单状态不允许动作 |
| `VALIDATION_PRODUCTION_PLAN_QUANTITY_INVALID` | 422 | 计划数量不合法 |
| `VALIDATION_PRODUCTION_COMPLETION_EXCEEDED` | 422 | 完工累计超过计划量 |
| `CONFLICT_PRODUCTION_COMPLETION_DUPLICATE` | 409 | 完工批次或重复完工冲突 |
| `STATE_PRODUCTION_COMPLETION_ACTION_NOT_ALLOWED` | 422 | 当前分批完工状态不允许动作 |
| `CONFLICT_PRODUCTION_COMPLETION_DOWNSTREAM_EXISTS` | 409 | 分批完工已存在下游业务，禁止撤销或作废 |
| `RESOURCE_INSPECTION_SOURCE_INVALID` | 422 | 验收来源或来源明细无效 |
| `VALIDATION_INSPECTION_QUANTITY_EXCEEDED` | 422 | 验收超过合法可验收量 |
| `VALIDATION_INSPECTION_QUANTITY_UNBALANCED` | 422 | 验收数量不平衡 |
| `STATE_INSPECTION_ACTION_NOT_ALLOWED` | 422 | 验收状态不允许动作 |
| `PERMISSION_INSPECTION_DENIED` | 403 | 无验收功能或记录范围权限 |
| `PERMISSION_WAREHOUSE_DENIED` | 403 | 无仓库访问或操作权限 |
| `RESOURCE_INVENTORY_NOT_FOUND` | 404 | 库存记录不存在或不可见 |
| `STATE_INVENTORY_INSUFFICIENT` | 409 | 可用库存不足或执行将产生负库存 |
| `CONFLICT_INVENTORY_MODIFIED` | 409 | 库存并发竞争 |
| `CONFLICT_INVENTORY_TRANSACTION_DUPLICATE` | 409 | 重复库存事务 |
| `STATE_INVENTORY_ADJUSTMENT_ACTION_NOT_ALLOWED` | 422 | 调整单状态不允许动作 |
| `STATE_DOWNSTREAM_BUSINESS_EXISTS` | 409 | 已有下游记录，禁止回退或作废 |
| `CONFLICT_VERSION_MISMATCH` | 409 | 版本冲突 |
| `DESIGN_FROZEN_MAPPING_MISSING` | 422 | 设计所需 Frozen 字段、状态或关系不存在 |

## 26. 日志与脱敏

生产单创建、修改、状态动作、开始生产、进度、分批完工创建/确认/撤销/作废及查询异常、生产付款、验收创建/修改/确认/撤销/作废、预警处理、库存调整、库存事务、敏感金额查看、导出和高风险库存查询均写 `audit_logs`。状态变化写 `document_status_histories`，审核动作写 `approval_records`。

日志包含操作人、时间、模块、对象、编号快照、动作、结果、`requestId` 和安全变更摘要。不得记录密码、Token、完整银行账号、完整敏感联系方式、服务器路径、SQL、异常堆栈或未脱敏前后快照。

## 27. 接口示例

### 27.1 生产订单列表

```http
GET /api/v1/production-orders?manufacturerId=018f...001&expectedCompletionDateTo=2026-09-01&dueState=due_soon&page=1&pageSize=20
```

### 27.2 创建生产单

```json
{"documentDate":"2026-07-21","manufacturerId":"018f...001","plannedStartDate":"2026-07-25","expectedCompletionDate":"2026-09-01","currencyCode":"CNY","items":[{"skuId":"018f...002","plannedQuantity":"20.0000","processingUnitPrice":"300.0000"}]}
```

### 27.3 新增进度

```json
{"progressDate":"2026-08-01","progressStage":"in_production","progressPercentage":"35.0000","completedQuantity":"0.0000","progressDescription":"生产进行中","attachmentRequired":false}
```

### 27.4 创建验收单

```json
{"sourceType":"production","productionOrderId":"018f...010","inspectionDate":"2026-08-20","inspectionWarehouseId":"018f...020","inspectorId":"018f...030","items":[{"sourceItemId":"018f...011","skuId":"018f...002","inspectedQuantity":"10.0000","qualifiedQuantity":"9.0000","unqualifiedQuantity":"1.0000","inspectionResult":"unqualified","dispositionMethod":"rework"}]}
```

### 27.5 验收确认

```json
{"versionNo":2,"confirmationComment":"数量与结果已核对"}
```

### 27.6 库存查询

```http
GET /api/v1/inventories?warehouseId=018f...020&skuId=018f...002&page=1&pageSize=20
```

### 27.7 库存流水查询

```http
GET /api/v1/inventory-transactions?sourceDocumentType=inventory_adjustment&warehouseId=018f...020&dateFrom=2026-07-01&dateTo=2026-07-31
```

### 27.8 库存调整执行

```json
{"versionNo":3,"executionComment":"按已批准盘点差异执行"}
```

失败响应沿用 Task 5.1：

```json
{"success":false,"error":{"code":"CONFLICT_INVENTORY_MODIFIED","message":"库存已发生变化，请刷新后重试","details":[]},"requestId":"req-20260721-001"}
```

分批完工动作按第 9、22.2 节 DCR-001 正式状态机执行。

## 28. 页面与接口映射

| 页面/操作 | 接口 | 权限与状态 | 数据范围、响应和异常 |
| --- | --- | --- | --- |
| Task 4.7 生产列表/详情 | `PRO-001`、`PRO-002`、`PRO-013` 至 `PRO-016` | 生产查看 | 厂家/记录范围；无权 403/404 |
| 生产新增/编辑 | `PRO-003`、`PRO-004` | 创建/编辑；草稿/驳回 | 校验厂家、SKU、日期、金额；冲突 409 |
| 提交/审核/撤回/反审核/取消/作废 | `PRO-005` 至 `PRO-009`、`PRO-011`、`PRO-012` | 专用动作 | 新状态和版本；下游冲突 409 |
| 开始生产 | `PRO-010` | 已审核、执行权限 | 实际开始日及进度事实 |
| 生产进度 | `PRO-018` 至 `PRO-020` | 进度查看/登记 | 只追加记录 |
| 分批完工 | `PRO-021`、`PRO-022`、`PRO-026` 至 `PRO-029` | 查看、登记、确认、撤销、作废 | 正式状态机、目标仓范围、数量与下游校验 |
| 生产付款 | `PRO-023` 至 `PRO-025` | 付款/金额权限 | 脱敏付款信息 |
| 生产/采购验收 | `INS-001` 至 `INS-010` | 验收权限/正式状态 | 来源、验收仓范围；数量错误 422 |
| Task 4.8 当前/分仓/厂家仓库存 | `INV-001` 至 `INV-005` | 库存查看 | 授权仓库过滤；只读余额 |
| 库存流水 | `INV-006`、`INV-007` | 流水/成本权限 | 只追加历史及来源追溯 |
| 库存预警 | `INV-008` 至 `INV-012` | 预警查看/处理/关闭 | 不直接修改库存 |
| Task 4.8 调整结果入口、Task 4.9 调整页 | `INV-013` 至 `INV-025` | 调整、审核、执行权限 | 仓库范围；执行原子更新库存和流水 |
| 库存导出 | `INV-026` | 导出、仓库/成本权限 | 仅授权范围 |

Task 4.7 已同步 DCR-001 分批完工状态与按钮。生产验收保持生产订单来源，不建立验收到完工记录的持久化关系；其他 Approved 页面操作均有对应接口或明确留待 Task 5.4/Task 5.5。

## 29. 范围排除

本 Task 不包含采购订单接口、实际采购入库、实际生产入库、销售出库、调拨、采购退货出库、跨境发货、海外仓导入、Excel 正式导入、通用附件接口、真实 API Route、代码、Controller、Service、Repository、ORM、Schema、DDL、Migration、Seed、技术框架、Phase 6 或技术开发。

## 30. DCR-001 与口径修正正式结论

### 30.1 DCR 与映射缺口关闭

| 原冲突位置 | 正式处理 | 关闭结论 |
| --- | --- | --- |
| 分批完工状态 | 正式批准唯一 DCR：DCR-001；将既有 `completion_status` 定义为 Draft、Confirmed、Revoked、Voided，并同步状态机 | 已关闭；未新增字段、表、索引、外键、关系或业务对象 |
| 验收关联完工批次 | 采用页面/API 口径：验收保持生产订单及生产订单明细来源，不建立验收到完工记录关系 | 已关闭；不新增关系或字段 |
| 验收待处理数量 | 采用页面/API 口径：`验收数量 = 合格数量 + 不合格数量`；API 删除待处理数量输入输出，既有 Frozen 字段由服务端固定为零 | 已关闭；不删除或新增数据库字段，不改变字段数量或结构 |

DCR-001 已正式批准并完成。Database Logical Design 由 v1.0 更新为 v1.1，唯一变化为既有 `completion_status` 的正式状态定义；数据库表数量、字段数量、索引、外键、关系及业务对象均保持不变。另两项映射缺口通过页面/API 口径关闭，不发起其他 DCR。

### 30.2 正式结论

1. Task 5.1、Task 5.2 均为 Completed / Approved；
2. Task 5.3 已完成并获得项目负责人批准，状态为 Completed / Approved；
3. 共定义 65 个正式接口：生产 29 个、质量验收 10 个、库存 26 个；
4. 生产与采购保持平行，生产单不保存统一目标仓库；
5. 验收确认只形成入库资格，不直接修改库存；
6. 库存余额只能由正式库存事务改变，流水只追加；
7. 库存调整执行使用原子事务并防止负库存；
8. DCR-001 已批准，另两项映射缺口已通过页面/API 口径关闭；
9. 仅补充既有 `completion_status` 的正式状态定义，未新增字段、表、关系、索引、外键或业务对象；
10. 未创建真实 API Route，未编写业务代码；Database Logical Design 仅按 DCR-001 更新至 v1.1，Approved Task 4.7 仅同步批准口径；
11. Phase 5 保持 In Progress，Task 5.4 和 Task 5.5 均为 Completed / Approved；
12. 当前下一步为 Phase 5 Final Consistency Review GitHub 验收；本 Task 不开始 Phase 6；
13. 技术开发保持 Not Started。
