---
document_name: Phase 8 Application Development Plan
project: Violin ERP Lite
version: 1.0
status: Completed / Pending Approval
owner: Project Manager
created_date: 2026-07-25
updated_date: 2026-07-25
related_phase: Phase 8
---

# Phase 8：Application Development Plan

## 1. Phase 8 Application Development Strategy

Phase 8 Application Development 的目标是在已冻结的 Phase 7 Platform Foundation 基础上，完成 Violin ERP Lite 企业乐器产品管理业务应用。

Phase 7 与 Phase 8 的边界：

```text
Phase 7 Platform Foundation
  ↓
Authentication / Authorization / Storage / Attachment / Idempotency
Background Job / Event Infrastructure / Audit / Trace / Observability
  ↓
Phase 8 Application Development
  ↓
Master Data / Purchase / Production / Inventory / Cross-border / Sales / Analytics
```

Phase 8 必须遵守：

1. Frozen `BUSINESS_RULES.md`；
2. Database Logical Design v2.5；
3. API Master Specification v1.5；
4. Frozen `ROLE_PERMISSION_SPEC.md`；
5. Phase 7 Platform Foundation v2.4；
6. 已批准的 Phase 4 页面设计与 Phase 6 Functional Specification。

当前 `SYSTEM_SPEC.md` 状态为 Draft，并明确不得作为开发依据。因此 Phase 8 规划不以 `SYSTEM_SPEC.md` 作为业务或技术实现事实来源。

本规划文件不启动 Phase 8，不修改 Phase / Task 状态，不授权代码开发、Schema 变更、API 变更或 Permission 变更。Phase 8 正式开发仍需项目负责人后续明确启动。

## 2. Business Module Roadmap

### Module 1 基础资料中心

优先级：P0

模块定位：

基础资料中心是所有业务流程的入口，必须优先稳定交付。产品、SKU、分类、供应商、仓库、店铺、平台和基础配置是采购、生产、库存、跨境和销售业务的共同事实来源。

包含范围：

1. 产品；
2. SKU；
3. 产品分类；
4. 品牌；
5. 配件与套装基础资料；
6. 供应商；
7. 生产厂家；
8. 仓库；
9. 电商平台；
10. 店铺；
11. 基础配置。

关键规则：

- 遵守 BR-001 产品唯一原则；
- 遵守 BR-019 现有编码沿用规则；
- 不建立平行产品、SKU、供应商或仓库数据源；
- 历史已使用资料不得物理删除，只能停用或保留历史。

### Module 2 采购与生产管理

优先级：P0

模块定位：

采购与生产管理承接业务源头，负责采购需求、采购订单、委外生产、厂家生产、质量验收和入库准备。

包含范围：

1. 采购需求；
2. 采购订单；
3. 采购付款记录；
4. 采购退货；
5. 生产任务；
6. 厂家生产进度；
7. 分批完工；
8. 质量验收；
9. 入库准备。

关键规则：

- 遵守 BR-007 分批执行原则；
- 遵守 BR-008 数量分层原则；
- 遵守 BR-025 单币种规则；
- 遵守 BR-026 采购付款记录规则；
- 遵守 BR-027 强制质量验收规则；
- 遵守 BR-028 非独立质检角色规则；
- 遵守 BR-030 单级审核规则。

### Module 3 库存管理

优先级：P0

模块定位：

库存管理是系统正式库存事实的核心模块。所有库存变化必须由正式业务单据触发，并写入库存流水。

包含范围：

1. 入库；
2. 出库；
3. 库存查询；
4. 库存流水；
5. 库存统计；
6. 调拨；
7. 盘点；
8. 报损；
9. 安全库存预警。

库存事实来源：

`inventory_transactions` 是库存变化的正式事实来源。任何页面、报表、缓存、事件或后台任务不得替代库存流水。

关键规则：

- 遵守 BR-002 库存单一真实来源原则；
- 遵守 BR-003 单据驱动库存原则；
- 遵守 BR-004 库存流水原则；
- 遵守 BR-005 禁止直接修改库存原则；
- 遵守 BR-016 禁止负库存规则；
- 遵守 BR-018 在途库存规则。

### Module 4 跨境业务管理

优先级：P1

模块定位：

跨境业务管理负责国内发往海外仓、海外库存导入、跨境库存追踪和补货分析。第一阶段保持文件导入和内部管理，不直接对接外部平台。

包含范围：

1. 跨境采购；
2. 跨境发货；
3. 海外库存导入；
4. Temu / Amazon 库存管理；
5. 海外库存来源追溯；
6. 补货分析。

关键规则：

- 遵守 BR-013 海外仓规则；
- 遵守 BR-018 在途库存规则；
- 遵守 BR-023 国内逐单销售出库规则；
- 外部平台自动同步不进入 MVP；
- 海外平台 API 对接需后续独立审批。

### Module 5 销售与分析

优先级：P1 / P2

模块定位：

销售与分析用于国内销售出库、销售退货、电商销售数据、报表和后续 AI 分析基础。MVP 只覆盖业务闭环所需的国内销售出库和基础统计。

包含范围：

1. 国内销售；
2. 销售退货；
3. 电商销售数据；
4. 基础报表；
5. 经营统计；
6. AI 分析基础。

关键规则：

- 遵守 BR-023 国内逐单销售出库规则；
- 遵守 BR-024 不管理完整销售订单规则；
- AI 分析、高级 BI 和预测模型不进入 MVP；
- 报表不得替代业务事实表或库存流水。

## 3. MVP Scope

### 3.1 MVP 必须包含

第一版上线范围必须覆盖可运行的基础业务闭环：

1. 基础资料；
2. 产品管理；
3. SKU 管理；
4. 供应商和厂家管理；
5. 仓库管理；
6. 采购；
7. 生产；
8. 质量验收；
9. 入库；
10. 库存查询；
11. 库存流水；
12. 基础出库；
13. 基础审计；
14. 用户认证、权限和数据范围；
15. 附件上传、下载和业务关联。

MVP 的最小业务闭环：

```text
基础资料
  ↓
采购 / 生产
  ↓
质量验收
  ↓
入库
  ↓
库存
  ↓
出库 / 查询 / 追溯
```

### 3.2 MVP 暂不包含

MVP 不包含：

1. AI 分析；
2. 外部平台自动同步；
3. 高级 BI；
4. 复杂审批流；
5. 多级审批；
6. 商业监控平台；
7. Dead Letter 管理页面；
8. Job / Event 管理页面；
9. Trace / Audit 查询扩展 API；
10. Redis / Kafka / RabbitMQ / 外部 MQ；
11. 海外仓实时 API 对接；
12. 单琴序列号管理；
13. 库位管理。

上述能力如需进入后续版本，必须通过对应业务任务、Architecture Decision、DCR、API Change Request 或 Permission 评估。

## 4. Page Development Order

### 4.1 PC Admin 页面顺序

PC Admin 是 Phase 8 业务配置、复杂操作、导入、数据清理、审核和报表的主要端。

建议顺序：

1. Dashboard；
2. 登录与当前用户权限摘要复核；
3. 基础资料总入口；
4. 产品管理；
5. SKU 管理；
6. 产品分类 / 品牌；
7. 供应商 / 生产厂家；
8. 仓库 / 平台 / 店铺；
9. 采购管理；
10. 生产管理；
11. 质量验收；
12. 入库管理；
13. 库存管理；
14. 库存流水；
15. 出库管理；
16. 跨境业务管理；
17. 导入中心；
18. 附件管理入口；
19. 审计日志；
20. 系统与权限管理。

### 4.2 微信小程序页面顺序

微信小程序面向内部移动操作和快速查询，不替代 PC 管理端的复杂配置与数据清理。

建议顺序：

1. 登录 / 微信绑定；
2. 首页工作台；
3. 当前用户权限摘要；
4. 产品 / SKU 快速查询；
5. 采购待办；
6. 生产进度；
7. 质量验收；
8. 入库确认；
9. 出库确认；
10. 库存查询；
11. 库存预警；
12. 附件查看 / 上传；
13. 我的操作记录。

### 4.3 页面开发原则

1. 页面可见性只作为交互提示，不能替代后端权限校验；
2. 按钮可见性必须基于权限、数据范围和业务状态；
3. 关键操作必须保留审计；
4. 上传、下载、删除等附件操作必须复用 Phase 7 Attachment Framework；
5. 库存相关页面不得直接修改库存余额；
6. 移动端不得绕过 PC 端已冻结业务流程。

## 5. Platform Capability Reuse

Phase 8 业务开发必须复用 Phase 7 冻结平台能力：

| Platform Capability | Phase 8 Reuse Rule |
| --- | --- |
| Authentication | 所有 PC Admin、微信小程序与 API 请求必须复用统一登录、Session、Token 轮换和微信身份绑定能力 |
| Authorization | 所有业务 API 必须执行 RBAC、Permission、Data Scope、Sensitive Field Access 和职责分离校验 |
| Storage | 二进制对象读写必须通过 Object Storage Adapter，不在业务表保存文件本体 |
| Attachment | 所有业务附件必须通过 Attachment Framework 关联，不建立业务模块专用附件表 |
| Idempotency | 高风险写操作、上传、删除、导入确认和库存类动作必须复用 Persistent Idempotency |
| Job | 长耗时、可恢复、可重试任务必须复用 Background Job，不创建业务专用队列 |
| Event | 已提交业务事实需要传播时复用 Event Infrastructure，不用 Job Queue 替代 Event Bus |
| Audit | 业务操作、安全事件、附件、Job 和 Event 必须写入正式 Audit，不用 Logger 替代 |
| Trace | HTTP、Service、Database、Job、Event、Consumer 链路必须传递 `request_trace_id` |
| Observability | 业务模块可接入内存 Metrics、Health Provider 和 Structured Logging，但不得引入未批准监控平台 |

## 6. Database Boundary

Phase 8 业务开发必须遵守 Database SSOT：

1. Database Logical Design v2.5 是当前数据库设计事实来源；
2. 不得修改 Frozen Platform 表；
3. 不得绕过业务事实表；
4. 不得使用 Event 替代业务数据；
5. 不得使用 Job 替代业务状态；
6. 不得使用 Cache 替代库存、权限、状态或审计事实；
7. 不得直接修改库存余额；
8. 库存变化必须由正式业务单据触发并写入 `inventory_transactions`；
9. 附件业务关系必须通过 `attachments` 与 `attachment_links`；
10. 幂等记录必须通过 `idempotency_records`；
11. Job 状态必须通过 `jobs`、`job_attempts`、`job_results`、`job_dead_letters` 与 `scheduler_locks`；
12. Event 状态必须通过 `event_outbox`、`event_history`、`event_consumptions`、`event_deliveries` 与 `event_dead_letters`；
13. Audit 必须通过 `audit_logs`。

如 Phase 8 发现现有 Database SSOT 不足，必须停止对应实现并提交 Database Change Request。不得直接修改 Prisma Schema、Migration 或业务表。

## 7. API Development Strategy

Phase 8 业务 API 必须遵守 API Spec 治理流程：

1. API Master Specification v1.5 是当前唯一正式 API 契约；
2. 已冻结 API 必须按路径、方法、DTO、错误码、权限和数据范围实现；
3. 新增 API 必须先提交 API Change Request；
4. 修改 DTO、错误码、权限、状态或响应结构必须先提交 API Change Request；
5. 不得通过页面需求直接扩展后端 API；
6. 不得以 Job、Event、Metrics 或 Health 的内部能力新增公开接口；
7. 业务 API 必须复用统一认证、授权、审计、幂等和 Trace；
8. API 测试必须覆盖权限拒绝、数据范围、输入校验、业务状态和审计记录。

Phase 8 API 优先级：

1. Master Data API；
2. Purchase / Production API；
3. Inspection / Inbound API；
4. Inventory API；
5. Outbound API；
6. Import / Attachment API；
7. Cross-border API；
8. Audit / Security 已冻结 API。

## 8. Development Milestones

### Phase 8-A Planning

目标：

- 完成 Phase 8 Application Development 业务开发规划；
- 明确模块顺序、MVP、页面顺序、平台复用、Database/API 边界和风险；
- 不开发代码；
- 不修改 Database、API、Permission 或业务规则。

交付：

- `PHASE_8_APPLICATION_DEVELOPMENT_PLAN.md`

### Phase 8-B Application Development

目标：

- 按获批规划和正式启动指令开展业务应用开发；
- 优先完成 MVP 业务闭环；
- 复用 Phase 7 平台能力；
- 按模块提交、测试和验收。

建议顺序：

1. 基础资料中心；
2. 采购与生产管理；
3. 质量验收与入库；
4. 库存查询与库存流水；
5. 出库与基础销售；
6. 跨境业务基础；
7. 导入、附件与审计接入；
8. Dashboard 与基础报表。

### Phase 8-C Application Review

目标：

- 完成应用开发一致性复核；
- 检查业务流程、Database、API、Permission、页面、测试和平台复用；
- 确认是否具备进入 Phase 9 Test Plan & System Integration 的条件。

复核范围：

1. Business Rules；
2. Database SSOT；
3. API Contract；
4. Permission；
5. PC Admin；
6. 微信小程序；
7. Platform Capability Reuse；
8. 测试覆盖；
9. 审计与 Trace。

## 9. Risks

| Risk | Description | Mitigation |
| --- | --- | --- |
| Excel 历史数据迁移 | 历史 Excel 可能存在编码不一致、字段缺失、库存不平或重复数据 | 先建立导入模板、校验规则和试导入流程；严格遵守 BR-031 |
| 库存准确性 | 库存是系统核心事实，错误写入会影响采购、销售和跨境决策 | 所有库存变化必须由正式单据驱动并写入 `inventory_transactions`；禁止直接改库存 |
| 业务流程确认 | 采购、生产、质检、入库和出库之间存在状态依赖 | 按 MVP 闭环逐步实现，先保证 P0 流程完整，再扩展 P1/P2 |
| 用户培训 | 用户从 Excel 转向系统，操作习惯变化明显 | PC Admin 优先提供清晰入口、导入模板、错误提示和操作审计；小程序聚焦移动待办 |
| 权限与数据范围 | 不同角色、仓库、店铺和敏感字段边界复杂 | 严格复用 ROLE_PERMISSION_SPEC 与 Phase 7 Authorization，不在页面层绕过后端 |
| 附件与文件安全 | 采购、质检、付款和跨境可能上传凭证或敏感附件 | 复用 Attachment Framework、Storage Adapter、敏感附件权限和审计 |
| 长耗时任务恢复 | 导入、批量处理和统计任务可能失败或超时 | 复用 Background Job、Retry、Dead Letter、Lease Recovery 和 Audit |
| 事件接入边界 | 业务模块接入 Event 可能被误用为业务事实来源 | Event 只传播已提交事实，不替代业务表；必要时先做模块级设计 |
| API 变更冲动 | 页面开发中可能发现现有 API 不足 | 发现不足时先提交 API Change Request，不直接改契约 |
| 外部平台依赖 | Temu/Amazon 自动同步容易扩大范围 | MVP 不接入外部平台 API；后续单独审批 |

## 10. Current Conclusion

Phase 8 Application Development 应以 Frozen Phase 7 Platform Foundation 为技术基线，以 Frozen Business Rules、Database SSOT、API Spec 与 Permission Spec 为业务和契约边界。

推荐第一阶段聚焦 MVP：基础资料、产品管理、采购、生产、质量验收、入库和库存，优先形成稳定的业务闭环。

本规划不修改当前治理状态。Phase 8 Application Development 仍需项目负责人正式启动后方可进入代码开发。

