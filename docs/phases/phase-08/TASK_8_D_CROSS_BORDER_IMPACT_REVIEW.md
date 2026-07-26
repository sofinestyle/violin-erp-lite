---
document_name: Task 8-D Cross-border Business Impact Review
project: Violin ERP Lite
phase: Phase 8 Application Development
task: Phase 8-D Cross-border Business Impact Review
version: 1.0
status: Completed / Pending Approval
owner: Codex
created_date: 2026-07-26
updated_date: 2026-07-26
related_documents:
  - docs/phases/phase-08/PHASE_8_APPLICATION_DEVELOPMENT_PLAN.md
  - docs/phases/phase-08/TASK_8_C3_MODULE_3_FINAL_REVIEW.md
  - docs/03-data/DATABASE_SPEC.md
  - docs/05-api/API_SPEC.md
  - docs/02-product/ROLE_PERMISSION_SPEC.md
  - docs/01-business/BUSINESS_RULES.md
  - docs/phases/phase-04/TASK_4_10_CROSS_BORDER_BUSINESS_PAGE_DESIGN.md
  - docs/phases/phase-05/TASK_5_4_INBOUND_OUTBOUND_CROSS_BORDER_API.md
  - docs/phases/phase-05/TASK_5_5_IMPORT_LOG_SECURITY_API_FINAL.md
---

# 1. Cross-border Business Scope

Phase 8-D 目标是在 Module 1 主数据、Module 2 采购生产闭环和 Module 3 库存闭环之上，评估跨境业务模块的实施边界。

跨境业务必须继续遵守库存事实边界：

1. 国内库存当前余额唯一事实来源为 `inventories`；
2. 国内与海外库存变化历史唯一事实来源为 `inventory_transactions`；
3. 跨境发货、海外库存导入、平台销售、补货建议均不得建立平行库存事实；
4. Event、Job、Cache 不得替代业务单据、库存余额或库存流水；
5. 海外仓库存必须通过正式仓库类型、库存余额和库存流水区分，不得直接混入国内库存事实。

## Cross-border Procurement

跨境采购在 MVP 中不作为独立采购对象实现。

本阶段评估范围包括：

1. 国内采购订单或生产任务形成可发货来源；
2. 厂家生产完成后经质量验收和入库形成正式库存；
3. 跨境发货从公司仓、厂家仓或其他批准来源仓发出；
4. 发货后库存进入在途仓；
5. 海外仓正式库存由海外库存 Excel 导入结果形成。

MVP 不包含：

1. 独立 `cross_border_orders` 采购订单生命周期；
2. 独立跨境采购审批流；
3. 海关申报、报关、税费、物流费用核算；
4. 跨境采购付款或完整财务闭环；
5. 海外仓手工收货或手工增加库存。

判断：

跨境采购应复用既有采购、生产、库存、跨境发货和导入能力。若后续需要独立跨境采购订单，必须先提交 Database CR、API CR 和 Permission CR。

## Overseas Warehouse

海外仓库存不应建立独立库存事实对象。

采用方案：

B. 扩展现有库存

实现方向：

1. 使用 `warehouses.warehouse_type = overseas` 标识海外仓；
2. 使用 `inventories` 保存海外仓当前库存余额；
3. 使用 `inventory_transactions` 保存海外仓库存变化流水；
4. 使用 `import_tasks`、`import_task_items` 和 `shipment_import_matches` 记录 Excel 导入、校验、执行和来源匹配；
5. 使用 CBR 查询接口读取海外仓库存，不提供手工修改海外库存入口。

海外仓库存形成规则：

```text
Cross-border Dispatch
↓
Source Warehouse Decrease
↓
Transit Warehouse Increase
↓
Overseas Inventory Excel Import
↓
Transit Warehouse Decrease
↓
Overseas Warehouse Increase
↓
Inventory Transaction
```

边界确认：

1. 海外库存不是独立库存事实表；
2. 海外库存不能绕过 `inventories` 和 `inventory_transactions`；
3. Excel 导入执行必须具备幂等保护，避免重复增加海外仓库存；
4. 海外仓库存查询必须受 warehouse scope 控制；
5. 不建设海外库存历史快照表；
6. 不建设海外仓手工收货流程。

## Platform Sales

平台销售覆盖 Amazon、Temu 等平台来源。

MVP 评估范围包括：

1. 已有 Platform / Store 主数据用于标识平台和店铺；
2. 海外仓库存可按平台、店铺、SKU 或仓库维度查询；
3. 平台销售出库可在后续实现中通过正式出库或海外库存导入结果反映；
4. 平台订单数据如来自 Excel，应纳入 Import Framework 管理；
5. 平台订单数据如来自外部 API，同步能力必须另行批准。

MVP 不包含：

1. Amazon / Temu 实时 API 对接；
2. 平台 Token、Secret 或授权凭据管理；
3. 独立 `platform_orders` 生命周期；
4. 平台订单履约、退款、售后完整闭环；
5. 使用平台订单直接修改库存。

判断：

若仅做平台 / 店铺维度查询、Excel 导入结果展示和库存来源追踪，不需要新增 `platform_orders`。若后续建设正式平台订单同步、订单历史、履约状态或平台订单管理，需要提交 Database CR、API CR 和 Permission CR。

## Replenishment

补货建议在 MVP 中定位为派生分析能力，不作为正式业务单据。

MVP 评估范围包括：

1. 基于海外仓库存、在途库存、SKU、仓库和平台 / 店铺维度形成补货提示；
2. 基于当前库存、库存流水和业务规则生成只读建议；
3. 支持页面展示低库存、零库存和待补货候选；
4. 不持久化正式补货计划；
5. 不自动创建采购订单、生产任务或跨境发货单。

MVP 不包含：

1. 独立 `replenishment_plans`；
2. 补货审批流；
3. 自动采购、自动生产或自动发货；
4. AI 自动决策补货；
5. 外部平台实时销量预测。

判断：

补货建议可作为只读统计或查询聚合实现。若后续需要正式补货计划、审批、执行和追踪，需要提交 Database CR、API CR 和 Permission CR。

# 2. Inventory Boundary Review

## Domestic Inventory

国内库存事实来源：

| 对象 | 职责 |
| --- | --- |
| `inventories` | 国内仓库、厂家仓、在途仓、待处理仓等当前库存余额 |
| `inventory_transactions` | 国内库存变化流水、来源单据和追溯 |

国内库存确认：

1. 入库确认增加库存；
2. 出库确认扣减库存；
3. 库存调整执行调整库存；
4. 跨境发货扣减来源仓库存并增加在途仓库存；
5. 国内库存不得由平台订单、Event、Job、Cache 或页面状态直接修改。

## Overseas Inventory

海外库存采用：

B. 扩展现有库存

正式边界：

| 对象 | 职责 |
| --- | --- |
| `warehouses` | 通过 `warehouse_type = overseas` 标识海外仓 |
| `inventories` | 保存海外仓当前库存余额 |
| `inventory_transactions` | 保存海外仓库存变化流水 |
| `import_tasks` | 保存海外库存 Excel 导入任务 |
| `import_task_items` | 保存导入明细、校验结果和执行结果 |
| `shipment_import_matches` | 保存导入结果与跨境发货来源匹配关系 |

禁止：

1. 直接混入国内库存事实；
2. 建立独立海外库存余额表作为事实来源；
3. 使用平台订单、导入文件原始行或缓存作为海外库存事实；
4. 手工修改海外库存余额；
5. 跳过库存流水生成海外库存变化。

国内库存与海外库存通过仓库类型、仓库权限范围和库存流水来源隔离。它们共享库存事实模型，但不得在页面、服务或统计中混淆业务含义。

# 3. Database Impact Analysis

## Existing Database Coverage

MVP 可复用以下既有数据库对象：

| 对象 | 覆盖能力 | 判断 |
| --- | --- | --- |
| `cross_border_shipments` | 跨境发货主单、状态流转、发货执行 | 已覆盖 |
| `cross_border_shipment_items` | 跨境发货明细、SKU、数量、来源 | 已覆盖 |
| `warehouses` | 公司仓、厂家仓、海外仓、在途仓、待处理仓 | 已覆盖 |
| `inventories` | 国内与海外仓当前库存余额 | 已覆盖 |
| `inventory_transactions` | 发货、在途、海外仓库存变化流水 | 已覆盖 |
| `import_tasks` | Excel 导入任务 | 已覆盖 |
| `import_task_items` | 导入明细、校验、执行结果 | 已覆盖 |
| `shipment_import_matches` | 导入结果与跨境发货来源匹配 | 已覆盖 |
| `platforms` | Amazon、Temu 等平台主数据 | 已覆盖 |
| `stores` | 平台店铺主数据 | 已覆盖 |
| `audit_logs` | 跨境发货、导入、库存变化审计 | 已覆盖 |

## Proposed / Possible Objects Review

| 可能对象 | MVP 是否必要 | 判断 |
| --- | --- | --- |
| `cross_border_orders` | 否 | MVP 不建设独立跨境采购订单，复用采购、生产和跨境发货 |
| `overseas_inventory` | 否 | 海外库存使用 `warehouses` + `inventories` + `inventory_transactions`，不建平行事实表 |
| `platform_orders` | 否 | MVP 不建设正式平台订单生命周期；平台订单 API 同步或持久化需另行 CR |
| `replenishment_plans` | 否 | MVP 只做只读补货建议，不持久化正式计划 |

## Database CR Judgment

Database CR：Not Required for MVP

原因：

1. 跨境发货已有 `cross_border_shipments` 和 `cross_border_shipment_items`；
2. 海外仓库存可通过既有仓库类型、库存余额和库存流水表达；
3. Excel 导入已有 Import Framework 数据对象；
4. 平台和店铺主数据已存在；
5. MVP 不新增独立跨境采购订单、平台订单、海外库存事实表或补货计划表；
6. 不需要新增字段、Enum 或 Migration。

后续触发 Database CR 的情况：

1. 建设独立跨境采购订单；
2. 建设正式平台订单生命周期；
3. 建设海外库存历史快照；
4. 建设补货计划审批和执行；
5. 建设平台 API 同步记录、Token 管理或平台订单持久化；
6. 建设海关、物流、费用或税费核算对象。

# 4. API Impact Analysis

## Existing API Coverage

MVP 可复用 API Master Specification 中既有接口：

| 范围 | API | 覆盖能力 |
| --- | --- | --- |
| 跨境发货 | `CBR-001` 至 `CBR-015` | 列表、详情、创建、编辑、提交、审核、发货、取消、作废、导出 |
| 海外仓库存 | `CBR-016` 至 `CBR-017` | 海外仓库存查询和详情 |
| 导入结果 | `CBR-018` 至 `CBR-020` | 导入任务、导入明细和结果查询 |
| 来源匹配 | `CBR-021` | 跨境发货与导入结果匹配查询 |
| 来源追踪 | `CBR-022` | 海外库存来源追踪 |
| Excel 导入 | `IMP-*` | 文件上传、模板、校验、执行、结果、历史 |
| 库存查询 | `INV-*` | 当前库存、流水和统计查询 |
| 出库 | `OUT-*` | 正式出库能力，可供后续销售出库复用 |

## API Need Review

| 能力 | MVP 判断 | API CR |
| --- | --- | --- |
| 跨境发货 | 复用 `CBR-*` | Not Required |
| 海外库存查询 | 复用 `CBR-016` / `CBR-017` | Not Required |
| 海外库存 Excel 导入 | 复用 `IMP-*` + `CBR-018` 至 `CBR-022` | Not Required |
| 平台订单导入 | MVP 不建设正式平台订单导入接口 | Required if included later |
| 海外库存导入 | 复用 Import Framework | Not Required |
| Excel 导入 | 复用 Import Framework | Not Required |
| 同步接口 | MVP 不对接 Amazon / Temu API | Required if included later |
| 补货建议 | 可用库存统计派生展示 | Required if formal plan API is added |

## API CR Judgment

API CR：Not Required for MVP

原因：

1. 跨境发货、海外库存查询、导入结果查询和来源追踪已有 CBR 接口覆盖；
2. Excel 导入已有 IMP 接口覆盖；
3. MVP 不新增外部平台同步接口；
4. MVP 不新增正式平台订单、补货计划或跨境采购订单 API；
5. 不修改 DTO、Response、Pagination 或 Error Code。

后续触发 API CR 的情况：

1. Amazon / Temu 实时或准实时同步；
2. 平台订单导入、履约或状态管理；
3. 正式补货计划创建、审批或执行；
4. 独立跨境采购订单；
5. 平台授权、Token 或连接管理。

# 5. Permission Impact

## Existing Permission Coverage

MVP 可复用以下权限：

| 权限范围 | 覆盖能力 |
| --- | --- |
| `cross-border.shipment.*` | 跨境发货查询、创建、编辑、提交、审核、发货、作废、导出 |
| `cross-border.overseas-inventory.read` | 海外仓库存查询 |
| `cross-border.import-result.read` | 导入结果查询 |
| `cross-border.source-trace.read` | 来源追踪查询 |
| `import.task.*` | 导入任务创建、校验、执行、取消 |
| `import.template.*` | 导入模板读取和校验 |
| `import.history.export` | 导入历史导出 |
| `master.platform.*` | 平台主数据管理 |
| `master.store.*` | 店铺主数据管理 |
| `master.warehouse.read` | 仓库读取与仓库范围过滤 |
| `inventory.stock.read` | 库存查询 |
| `inventory.transaction.read` | 库存流水查询 |
| `field.import-raw-data.read` | 导入原始数据敏感字段读取 |
| `field.amount.read` / `field.cost.read` | 金额和成本字段读取 |

## Permission Need Review

| 能力 | MVP 判断 | Permission CR |
| --- | --- | --- |
| 跨境发货 | 既有 `cross-border.shipment.*` 覆盖 | Not Required |
| 海外库存查询 | 既有 `cross-border.overseas-inventory.read` + warehouse scope 覆盖 | Not Required |
| 导入结果查询 | 既有 `cross-border.import-result.read` 覆盖 | Not Required |
| 来源追踪 | 既有 `cross-border.source-trace.read` 覆盖 | Not Required |
| Excel 导入 | 既有 `import.task.*` / `import.template.*` 覆盖 | Not Required |
| 平台 / 店铺维度 | 既有 `master.platform.*` / `master.store.*` 覆盖 | Not Required |
| 平台订单管理 | MVP 不包含 | Required if included later |
| 补货计划管理 | MVP 不包含 | Required if included later |

## Permission Judgment

Permission CR：Not Required for MVP

原因：

1. 跨境发货、海外库存、导入结果和来源追踪已有正式权限码；
2. 平台和店铺主数据权限已存在；
3. warehouse scope 可覆盖海外仓、在途仓和来源仓范围；
4. MVP 不新增平台订单、补货计划或跨境采购订单管理权限；
5. 不新增 Sensitive Field。

后续触发 Permission CR 的情况：

1. 建设平台订单管理；
2. 建设补货计划审批；
3. 建设平台 API 连接管理；
4. 建设跨境费用、税费、利润或敏感销售数据访问控制；
5. 建设独立海外仓运营角色。

# 6. Platform Capability Reuse

| Phase 7 能力 | 复用方式 |
| --- | --- |
| Authentication | 所有跨境页面和操作必须基于登录身份 |
| Authorization | 使用 RBAC、warehouse scope、cross-border / import / inventory 权限控制 |
| Attachment | 跨境发货资料、物流文件、导入附件可复用附件框架 |
| Audit | 记录创建、编辑、提交、审核、发货、导入执行、库存变化等关键动作 |
| Trace | 贯通 HTTP 请求、导入任务、库存事务、审计记录 |
| Idempotency | 保护发货执行、导入执行等关键写操作，防止重复扣减或重复增加库存 |
| Job | Excel 导入校验、执行、匹配等长耗时任务可复用后台任务能力 |
| Event | 跨境发货完成、导入完成、库存变化可发布事件；Event 不替代库存事实 |

平台能力边界：

1. Job 只执行后台任务，不替代跨境发货单、导入任务或库存流水；
2. Event 只发布事实发生后的通知，不裁决库存余额；
3. Cache 只能缓存派生查询结果，不作为海外库存事实；
4. Audit 不替代 Event History、Job Attempt 或库存流水；
5. Trace 只做链路关联，不作为业务判断依据。

# 7. MVP Scope

## Included

MVP 建议包含：

1. 跨境发货列表、详情、创建、编辑；
2. 跨境发货提交、审核、驳回、反审核、取消、作废；
3. 跨境发货执行：来源仓扣减、在途仓增加、库存流水生成；
4. 海外仓库存查询和详情；
5. 海外库存 Excel 导入任务、校验、执行、结果查询；
6. 导入结果与跨境发货来源匹配；
7. 海外库存来源追踪；
8. 平台和店铺维度展示或筛选；
9. 基于现有库存和平台 / 店铺主数据的只读补货建议；
10. 跨境关键动作 Audit、Trace 和 Idempotency。

## Not Included

MVP 暂不包含：

1. Amazon / Temu API 实时同步；
2. 平台 Token、Secret、授权连接管理；
3. 独立平台订单生命周期；
4. 独立跨境采购订单；
5. 海外库存历史快照表；
6. 手工海外仓收货或手工增加海外库存；
7. 报关、清关、税费、物流费用和财务核算；
8. 完整销售订单、售后、退款和平台履约闭环；
9. 正式补货计划、审批和自动执行；
10. AI 自动补货决策。

# 8. Development Order

建议开发顺序：

1. Overseas Inventory Import
2. Platform Order Integration
3. Cross-border Outbound
4. Replenishment

## 1. Overseas Inventory Import

优先原因：

1. 海外仓库存真实性依赖 Excel 导入；
2. 需要先确认在途仓到海外仓的正式库存闭环；
3. 可优先复用 Import、Job、Idempotency、Audit 和 Trace；
4. 可验证 `shipment_import_matches` 与来源追踪。

实施边界：

1. 复用 `IMP-*`；
2. 复用 `CBR-018` 至 `CBR-022`；
3. 不新增海外库存表；
4. 不新增平台 API 同步。

## 2. Platform Order Integration

MVP 中建议定位为平台 / 店铺维度查询与 Excel 数据导入结果展示。

优先原因：

1. Platform / Store 主数据已完成；
2. Amazon / Temu 可先作为平台维度纳入查询；
3. 避免过早引入外部 API、Token 和平台订单生命周期。

实施边界：

1. 不建设正式 `platform_orders`；
2. 不建设外部平台实时同步；
3. 不保存平台凭据；
4. 若项目负责人要求正式平台订单导入或同步，先提交 API CR / Database CR。

## 3. Cross-border Outbound

优先原因：

1. 跨境发货是国内库存进入在途仓的正式边界；
2. 与 Module 3 已完成库存扣减、流水和防负库存规则一致；
3. 是海外库存来源追踪的上游基础。

实施边界：

1. 复用 `cross_border_shipments`；
2. 复用 `cross_border_shipment_items`；
3. 发货只影响来源仓和在途仓；
4. 不直接增加海外仓库存。

## 4. Replenishment

优先原因：

1. 依赖海外库存、在途库存和平台 / 店铺维度数据；
2. 应在库存导入、来源追踪和跨境发货稳定后实现；
3. 初期可作为只读建议，不引入正式计划对象。

实施边界：

1. 不新增 `replenishment_plans`；
2. 不自动创建采购、生产或跨境发货；
3. 不作为库存事实来源；
4. 正式计划化前必须提交 CR。

# 9. Risk Analysis

| 风险 | 影响 | 缓解建议 |
| --- | --- | --- |
| 平台 API 限制 | Amazon / Temu API 权限、速率、字段和授权机制可能变化 | MVP 不直接接入平台 API；如接入，先做 Architecture Decision 和 API CR |
| Excel 数据准确性 | 海外仓库存依赖人工或平台导出的 Excel，可能存在格式、重复、缺失和延迟 | 使用 Import Framework 校验、幂等、错误明细、导入历史和来源匹配 |
| 海外库存真实性 | 海外仓库存不一定实时，导入结果可能滞后于平台销售 | 明确数据日期、导入批次、来源和 Trace；页面不得宣称实时库存 |
| 国内海外库存边界 | 海外库存与国内库存共享 `inventories` 模型，若过滤不严可能混淆 | 必须按 `warehouse_type`、warehouse scope 和来源类型隔离查询与统计 |
| 重复导入 | 同一文件或同一数据批次重复执行可能重复增加库存 | 导入执行必须受 Idempotency 和导入任务状态保护 |
| 在途库存核销 | 导入海外库存时若来源匹配不准确，可能导致在途仓余额异常 | 使用 `shipment_import_matches` 并保留未匹配、部分匹配和异常记录 |
| 补货建议误导 | 基于滞后库存和缺失销量数据的建议可能不准确 | MVP 将补货定位为只读参考，不自动创建业务单据 |
| 权限越界 | 海外仓、平台、店铺数据可能跨组织或角色可见 | 强制 RBAC、warehouse scope、field permission 和审计 |

总体结论：

Phase 8-D 跨境业务 MVP 可以在现有 Database SSOT、API SSOT 和 Permission SSOT 范围内继续推进。

Change Impact：

| 类型 | 判断 | 说明 |
| --- | --- | --- |
| Database CR | Not Required for MVP | 不新增跨境订单、海外库存事实表、平台订单表或补货计划表 |
| API CR | Not Required for MVP | 复用 CBR、IMP、INV、OUT 既有接口；外部平台同步需另行 CR |
| Permission CR | Not Required for MVP | 复用 cross-border、import、inventory、platform、store 和 warehouse scope |

Recommendation：

可以进入跨境业务实施设计阶段。实施设计必须继续坚持：

1. 海外库存采用现有库存模型；
2. 跨境发货不直接增加海外仓库存；
3. 海外仓库存由正式 Excel 导入执行形成；
4. 平台 API 同步、正式平台订单和补货计划均不纳入 MVP，除非先完成 CR。
