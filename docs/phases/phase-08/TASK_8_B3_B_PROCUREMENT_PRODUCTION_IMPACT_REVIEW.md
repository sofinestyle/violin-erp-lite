---
document_name: Task 8-B3-B Procurement & Production Impact Review
project: Violin ERP Lite
version: 1.0
status: Completed / Pending Review
owner: Project Manager
created_date: 2026-07-26
updated_date: 2026-07-26
related_phase: Phase 8
---

# Task 8-B3-B：Procurement & Production Impact Review

## 1. Business Flow Review

Module 2 采购生产基础闭环承接 Module 1 Master Data Center，基于已完成的产品、SKU、供应商、生产厂家、仓库、平台和店铺等主数据开展采购、委外生产、质量验收和入库准备。

### 1.1 采购基础流程

```text
采购需求判断
  ↓
创建采购订单
  ↓
提交审核
  ↓
单级审核
  ↓
采购执行 / 采购进度跟踪
  ↓
采购来源质量验收
  ↓
入库准备
  ↓
正式入库
  ↓
库存余额与库存流水
```

采购与生产保持平行，不允许采购单生成生产单，也不允许通过采购单状态限制生产单。

采购需求在 MVP 中不作为独立数据库对象或独立业务生命周期。系统可通过库存预警、人工补货判断、Dashboard 待办或采购订单草稿承接需求，但不得建立未批准的 `purchase_requests`、`procurement_requests` 或平行需求表。

### 1.2 生产基础流程

```text
创建生产任务
  ↓
提交审核
  ↓
单级审核
  ↓
开始生产
  ↓
登记生产进度
  ↓
分批完工
  ↓
生产来源质量验收
  ↓
入库准备
  ↓
正式入库
  ↓
库存余额与库存流水
```

生产任务独立创建，仅关联生产厂家、SKU 和计划明细。目标仓库不保存在生产任务主表中，目标仓库由分批完工或入库准备阶段按正式规则确定。

### 1.3 质量验收汇合点

采购来源和生产来源在质量验收节点汇合：

```text
采购来源 ─┐
          ├→ 质量验收 → 合格数量 → 入库准备 → 正式入库
生产来源 ─┘                ↓
                         不合格数量 → 待处理 / 退货 / 后续处理
```

质量验收必须遵守：

1. 采购来源和生产来源互斥；
2. 一张验收单只能对应采购或生产其中一种来源；
3. 验收确认只形成入库资格，不直接修改库存；
4. 合格数量可进入入库准备；
5. 不合格数量不得进入可用库存；
6. 验收由具备权限的采购人员、仓库人员或管理员执行，不新增独立质检角色。

### 1.4 入库衔接

入库准备承接已确认的采购来源或生产来源验收结果。正式库存变化只在入库确认时发生：

```text
验收完成
  ↓
创建入库单
  ↓
提交 / 审核
  ↓
确认入库
  ↓
原子更新 inventories
  ↓
追加 inventory_transactions
```

任何页面、事件、后台任务、缓存或临时状态不得替代 `inventories` 与 `inventory_transactions`。

## 2. Module Scope

### 2.1 MVP 包含

Module 2 MVP 建议包含以下功能：

1. 采购订单列表、详情、创建、编辑；
2. 采购订单提交、撤回、审核、驳回、反审核、取消、作废；
3. 采购执行进度与关联验收、关联入库、状态历史查询；
4. 采购付款辅助记录；
5. 生产任务列表、详情、创建、编辑；
6. 生产任务提交、撤回、审核、驳回、反审核、开始生产、取消、作废；
7. 生产进度记录；
8. 分批完工记录；
9. 采购来源质量验收；
10. 生产来源质量验收；
11. 入库准备与采购 / 生产来源入库；
12. 采购、生产、质检和入库关键操作审计；
13. 附件关联；
14. 请求幂等、状态并发和职责分离校验。

### 2.2 MVP 暂不包含

Module 2 MVP 暂不包含：

1. 独立采购需求单生命周期；
2. 多级审批；
3. 采购单自动生成生产单；
4. 生产单关联采购单；
5. 独立质检角色；
6. 复杂质检照片档案；
7. 供应商门户或厂家门户；
8. 财务软件替代能力；
9. 多币种与汇率；
10. 外部平台自动采购或生产同步；
11. 完整生产异常对象；
12. 直接修改库存余额。

上述能力如需进入后续版本，必须先经过对应 Database CR、API CR、Permission 评估或独立获批任务。

## 3. Database Impact Analysis

### 3.1 结论

Database CR：**Not Required**

原因：

1. Database Logical Design v2.5 继续引用 Phase 3 已冻结业务表结构；
2. Phase 3 已定义采购、生产、质检、入库和库存流水所需核心对象；
3. Prisma Schema 已存在对应模型；
4. MVP 不建立独立采购需求对象；
5. 本阶段只做影响评估，不修改 Database SSOT、Prisma Schema 或 Migration。

### 3.2 对象逐项分析

| 业务对象 | 现有数据库对象 | 是否足够支持 MVP | 影响判断 |
| --- | --- | --- | --- |
| 采购需求 | 无独立对象 | 足够，MVP 不建设独立采购需求生命周期 | 不需要新增表；通过人工判断、库存预警或采购订单草稿承接 |
| 采购订单 | `purchase_orders` | 足够 | 复用采购单主表 |
| 采购明细 | `purchase_order_items` | 足够 | 复用采购 SKU 行级事实 |
| 采购付款 | `purchase_payments` | 足够 | 复用付款辅助记录，不替代财务软件 |
| 采购退货 | `purchase_returns`、`purchase_return_items` | 非本轮 MVP 主线，但已有基础 | 后续采购退货实现可复用 |
| 生产任务 | `production_orders` | 足够 | 复用委外生产单主表 |
| 生产明细 | `production_order_items` | 足够 | 复用生产 SKU 行级计划 |
| 生产进度 | `production_progress_records` | 足够 | 复用过程历史记录 |
| 分批完工 | `production_completion_records`、`production_completion_record_items` | 足够 | 复用分批完工历史 |
| 生产付款 | `production_payments` | 非本轮 MVP 主线，但已有基础 | 后续可复用 |
| 质量验收 | `inspection_orders` | 足够 | 统一承载采购来源与生产来源验收 |
| 质检明细 | `inspection_order_items` | 足够 | 保存验收 SKU 行级结果 |
| 入库 | `inbound_orders` | 足够 | 统一承载采购入库、生产入库及其他批准库存增加 |
| 入库明细 | `inbound_order_items` | 足够 | 保存入库 SKU 行级事实 |
| 当前库存 | `inventories` | 足够 | 正式库存余额事实来源 |
| 库存流水 | `inventory_transactions` | 足够 | 正式库存变化事实来源 |
| 审批与状态历史 | `approval_records`、`document_status_histories` | 足够 | 支持单级审核和状态留痕 |
| 附件 | `attachments`、`attachment_links` | 足够 | 支持采购、生产、验收、入库相关附件 |
| 审计 | `audit_logs` | 足够 | 正式审计事实来源 |

### 3.3 采购需求判断

采购需求不作为独立业务对象：

1. Phase 2 生命周期设计明确不建立独立采购需求生命周期；
2. Module 2 MVP 目标是采购订单、生产任务、质量验收和入库基础闭环；
3. 如果当前库存预警需要触发采购，可作为“建议动作”或跳转入口，不落地为需求单事实；
4. 若未来需要采购需求单、需求审批、需求合并或需求转订单，则必须先提交 DCR 和 API CR。

### 3.4 入库与库存边界

入库确认是库存变化边界：

1. 采购订单、生产任务、生产进度、分批完工和质量验收均不直接改变库存余额；
2. 入库确认必须在事务中更新 `inventories` 并追加 `inventory_transactions`；
3. 失败必须整体回滚；
4. 不得通过普通更新、页面计算、缓存、事件或后台 Job 修改库存。

## 4. API Impact Analysis

### 4.1 结论

API CR：**Not Required**

原因：

1. API Master Specification 已覆盖采购 `PUR-*`；
2. API Master Specification 已覆盖生产 `PRO-*`；
3. API Master Specification 已覆盖质量验收 `INS-*`；
4. API Master Specification 已覆盖入库 `INB-*`；
5. MVP 不新增独立采购需求 API；
6. 本阶段不修改 API Spec、DTO、Response、Pagination 或 Error Code。

### 4.2 API 覆盖分析

| 功能域 | 已有 API 编号 | 影响判断 |
| --- | --- | --- |
| 采购订单 | `PUR-001`—`PUR-016` | 覆盖列表、详情、创建、编辑、状态动作、进度、关联查询、导出 |
| 采购付款 | `PUR-017`—`PUR-019` | 覆盖付款列表、详情、创建 |
| 采购退货 | `PUR-020`—`PUR-029` | 已有接口，本轮可暂不实现主线 |
| 生产任务 | `PRO-001`—`PRO-017` | 覆盖生产单、状态动作、关联查询、导出 |
| 生产进度 | `PRO-018`—`PRO-020` | 覆盖进度查询与登记 |
| 分批完工 | `PRO-021`—`PRO-022`、`PRO-026`—`PRO-029` | 覆盖完工记录与状态动作 |
| 生产付款 | `PRO-023`—`PRO-025` | 已有接口，本轮可暂不实现主线 |
| 质量验收 | `INS-001`—`INS-010` | 覆盖验收列表、详情、创建、编辑、提交、确认、撤销、作废、历史、导出 |
| 入库 | `INB-001`—`INB-018` | 覆盖入库列表、详情、创建、编辑、状态动作、确认、冲销、导出 |

### 4.3 DTO 与 Error Code

本次评估不要求新增 DTO 或 Error Code。

后续实现应复用既有通用错误与业务错误类别：

1. 认证失败；
2. 权限不足；
3. 数据范围拒绝；
4. 资源不存在；
5. 状态不允许；
6. 并发冲突；
7. 幂等冲突；
8. 校验失败；
9. 库存不足或库存事务失败。

如果实现中发现采购需求独立对象、生产异常对象、质检扩展字段或新入库来源无法通过现有 API 表达，必须停止并提交 API CR。

## 5. Permission Impact

### 5.1 结论

Permission CR：**Not Required**

原因：

1. `ROLE_PERMISSION_SPEC.md` 已定义采购、生产、验收、入库和库存相关权限；
2. 已定义五类正式角色，不新增“生产人员”或“质检人员”；
3. 已定义金额、成本、供应商敏感、厂家敏感等字段权限；
4. 已定义仓库、店铺、厂家派生和业务关联数据范围；
5. 本阶段不修改 Permission Spec。

### 5.2 权限覆盖

| 功能域 | 复用权限资源 | 关键权限点 |
| --- | --- | --- |
| 采购订单 | `purchase.order.*` | read、create、update、submit、withdraw、approve、reject、unapprove、cancel、void、export |
| 采购付款 | `purchase.payment.*` | read、create |
| 采购退货 | `purchase.return.*` | read、create、update、submit、approve、reject、unapprove、cancel、void、confirm-outbound |
| 生产任务 | `production.order.*` | read、create、update、submit、withdraw、approve、reject、unapprove、start、cancel、void、export |
| 生产进度 | `production.progress.*` | read、create |
| 分批完工 | `production.completion.*` | read、create、confirm、revoke、void |
| 生产付款 | `production.payment.*` | read、create |
| 质量验收 | `inspection.order.*` | read、create、update、submit、confirm、revoke、void、export |
| 入库 | `inbound.order.*` | read、create-purchase、create-production、create-other、update、submit、withdraw、approve、reject、unapprove、cancel、confirm、reverse、export |
| 库存查询与流水 | `inventory.stock.*`、`inventory.transaction.*` | read |
| 金额 / 成本字段 | `field.amount.read`、`field.cost.read` | 采购、生产、付款、库存成本字段脱敏 |
| 供应商 / 厂家敏感信息 | `field.supplier-sensitive.read`、`field.manufacturer-sensitive.read` | 联系方式、结算、银行、厂家联系信息脱敏 |

### 5.3 职责分离与数据范围

后续实现必须遵守：

1. 同一用户不得审批自己创建的单据；
2. 仓库人员只能在授权仓库范围内执行入库、验收和库存动作；
3. 采购人员可执行获授权采购和验收动作；
4. 质量验收不新增独立角色；
5. 厂家范围通过生产、验收来源和厂家仓授权派生；
6. 金额、成本和敏感字段不得通过列表、搜索、排序、日志或错误信息泄露。

## 6. Platform Capability Reuse

Module 2 后续实现必须复用 Phase 7 Frozen Platform Foundation：

| Platform Capability | Reuse Requirement |
| --- | --- |
| Authentication | 所有 API 必须经过统一认证边界，不允许匿名业务访问。 |
| Authorization | 复用 RBAC、Data Scope、Sensitive Field Access，不以前端按钮代替后端授权。 |
| Attachment | 采购单、采购付款、采购退货、生产单、生产进度、验收单、入库单可复用 Attachment Framework；附件不改变业务状态。 |
| Job | 导出、批量处理、未来导入或长耗时任务可复用 Background Job；Job 不替代业务单据状态。 |
| Event | 关键业务动作可发布领域事件用于通知、缓存失效或异步后续处理；Event 不替代业务事实表。 |
| Audit | 创建、编辑、提交、审核、确认、冲销、作废、付款、敏感字段读取等必须写审计。 |
| Trace | HTTP、Service、Repository、Job、Event、Audit 贯通 `request_trace_id`。 |
| Idempotency | 创建、提交、审核、确认、冲销、导出等写动作必须按 API 契约使用幂等键。 |

## 7. Page Development Plan

### 7.1 PC Admin

建议 PC Admin 开发顺序：

1. 采购订单列表；
2. 采购订单详情；
3. 采购订单新增 / 编辑；
4. 采购订单状态动作；
5. 采购执行跟踪；
6. 采购付款辅助记录；
7. 生产任务列表；
8. 生产任务详情；
9. 生产任务新增 / 编辑；
10. 生产任务状态动作；
11. 生产进度记录；
12. 分批完工；
13. 采购来源质量验收；
14. 生产来源质量验收；
15. 入库准备列表；
16. 采购来源入库；
17. 生产来源入库；
18. 入库确认与冲销。

PC Admin 是复杂业务操作主入口，应覆盖完整表单、明细行、状态动作、附件、审批、审计提示、导出和错误恢复。

### 7.2 微信小程序

建议微信小程序 MVP 范围：

1. 采购订单查询；
2. 采购订单详情；
3. 采购订单简单创建或移动端补录；
4. 待审核采购订单处理；
5. 生产任务查询；
6. 生产进度快速登记；
7. 待验收列表；
8. 验收确认；
9. 待入库列表；
10. 入库确认。

如移动端操作复杂度过高，可先以查询、待办、审批和轻量执行为主，复杂编辑保留在 PC Admin。

## 8. MVP Acceptance Criteria

Module 2 MVP 完成标准：

1. 采购订单可创建、编辑、提交、审核、驳回、撤回、取消、作废；
2. 采购明细可选择已启用 SKU、供应商和合法数量金额；
3. 采购进度可展示付款、验收、入库和状态历史；
4. 生产任务可创建、编辑、提交、审核、开始生产、取消、作废；
5. 生产任务不关联采购订单，不保存目标仓库；
6. 生产进度可登记并保留历史；
7. 分批完工可记录目标仓和完工数量；
8. 质量验收支持采购来源和生产来源互斥；
9. 验收确认只形成入库资格，不改变库存；
10. 入库确认可原子更新库存余额并追加库存流水；
11. 重复提交、网络重试和并发冲突不会产生重复单据或重复库存流水；
12. 审批遵守单级审核和职责分离；
13. 权限、仓库范围、厂家范围、金额字段、敏感字段均由服务端校验；
14. 关键操作写入 `audit_logs`；
15. 附件、Trace、Idempotency、Event 和 Job 复用平台能力且不替代业务事实。

## 9. Risk Analysis

### 9.1 历史 Excel 数据

风险：

1. 历史采购、生产、验收、入库数据可能字段不完整；
2. 历史 Excel 编码、供应商、厂家、SKU 可能与 Module 1 主数据不一致；
3. 未完成采购或生产业务迁移需要明确状态映射。

建议：

1. 先迁移主数据和期初库存；
2. 未完成业务只迁移必要业务事实；
3. 迁移前建立字段映射与校验报告；
4. 不用历史 Excel 替代正式库存流水。

### 9.2 厂家生产流程

风险：

1. 厂家生产进度可能不稳定；
2. 分批完工与目标仓选择容易和生产单主表混淆；
3. 厂家仓、公司仓和待处理仓边界需要在页面清晰表达。

建议：

1. 保持生产单独立；
2. 目标仓只在分批完工或入库准备阶段确定；
3. 通过仓库类型和厂家范围校验减少误操作。

### 9.3 库存准确性

风险：

1. 验收、入库、库存流水边界若混淆，会造成库存提前增加；
2. 重复确认入库可能产生重复库存流水；
3. 并发入库可能造成余额错误。

建议：

1. 验收确认不改库存；
2. 入库确认必须事务化；
3. 库存变化必须只追加 `inventory_transactions`；
4. 写动作必须幂等并重新校验来源状态。

### 9.4 质检责任边界

风险：

1. 用户可能期待独立质检角色；
2. 不合格处理路径需要后续明确；
3. 质检照片和复杂质量档案不在 MVP。

建议：

1. 继续遵守非独立质检角色规则；
2. MVP 记录合格数量、不合格数量、原因、处理方式、验收人和时间；
3. 复杂质检档案如需建设，单独提交后续任务或 CR。

## 10. Change Impact Summary

| Impact Area | Decision | Reason |
| --- | --- | --- |
| Database CR | Not Required | 现有 Phase 3 / Database v2.5 / Prisma 已覆盖 Module 2 MVP 所需对象；MVP 不新增采购需求独立对象。 |
| API CR | Not Required | 现有 `PUR-*`、`PRO-*`、`INS-*`、`INB-*` 已覆盖 MVP。 |
| Permission CR | Not Required | 现有 `purchase.*`、`production.*`、`inspection.*`、`inbound.*`、`inventory.*` 与字段权限已覆盖。 |
| Frozen Document Update | Not Required | 本阶段只做影响评估，不修改 Frozen SSOT。 |

## 11. Recommendation

建议进入下一阶段：

**8-B3-C Procurement & Production Implementation Design**

前提：

1. 项目负责人批准本 Impact Review；
2. 后续设计继续限定在现有 Database、API 和 Permission 边界内；
3. 如实现设计发现独立采购需求、复杂质检、生产异常、入库来源或状态字段不足，必须停止并提交对应 CR。
