---
document_name: Phase 7 Platform Foundation
project: Violin ERP Lite
version: 1.8
status: In Progress
owner: Project Manager
created_date: 2026-07-24
updated_date: 2026-07-25
related_phase: Phase 7
---

# Phase 7：平台基础（Platform Foundation）

## 1. 阶段目的

Phase 7 在 Phase 6 Functional Design 与 Phase 8 Application Development 之间建立统一平台基础。它负责盘点、复用并收口跨终端、跨模块的公共技术能力，防止认证、文件、附件、幂等、并发、任务、缓存、事件和审计形成多个事实来源。

本阶段不新增 Phase 6 未批准的业务功能，不修改 Frozen 业务规则、数据库、API、枚举或权限定义。任何正式 SSOT 缺口必须继续通过独立 DCR 或 Change Request 批准后处理。

## 2. 正式状态

- Phase：Phase 7 Platform Foundation；
- Phase Status：In Progress；
- Current Task：Task 7.4 Attachment Framework；
- Current Task Status：In Progress；
- Phase 8 Application Development：Waiting / Not Started；
- Phase 9 Test Plan & System Integration：Waiting / Not Started；
- Phase 10 Release & Acceptance：Waiting / Not Started。

当前状态唯一入口仍为 `docs/00-governance/CURRENT_STATUS.md`。

## 3. 权威输入

- Frozen `BUSINESS_RULES.md`；
- Frozen Database Logical Design v2.3；
- Frozen API Master Specification v1.5，正式接口总数 335；
- Frozen `ROLE_PERMISSION_SPEC.md`；
- Approved Phase 4 页面设计；
- Frozen Phase 6 Functional Specification；
- Completed / Approved 的原 Phase 7 工程成果，现已迁移为 Phase 8 历史 Task；
- Completed / Approved 的 Phase Renumbering Change Request 001；
- Completed / Approved 的 DCR-004、API CR-004、DCR-005 与 API CR-005。

DCR-004 与 API CR-004 已分别完成独立批准和正式 SSOT 同步，并作为 Task 7.5 的正式实现输入。DCR-005 与 API CR-005 已完成批准和同步，并作为 Task 7.4 的正式实现输入。

## 4. Task 结构

| Task | 名称 | 状态 |
| --- | --- | --- |
| Task 7.1 | Platform Baseline & Existing Capability Audit | Completed / Approved |
| Task 7.2 | Authentication & Authorization | Completed / Approved |
| Task 7.3 | Object Storage & File Lifecycle | Completed / Approved |
| Task 7.4 | Attachment Framework | In Progress |
| Task 7.5 | Idempotency & Concurrency Control | Completed / Approved |
| Task 7.6 | Background Job & Distributed Lock | Waiting / Not Started |
| Task 7.7 | Cache & Event Infrastructure | Waiting / Not Started |
| Task 7.8 | Audit, Trace & Observability | Waiting / Not Started |
| Task 7.9 | Platform Final Consistency Review | Waiting / Not Started |

Task 7.1 至 Task 7.3 及 Task 7.5 已完成并获得批准；Task 7.4 保持 In Progress 并恢复为 Current Task。Task 7.6 至 Task 7.9 必须依次通过正式启动、独立 Commit、Push、GitHub 技术验收和项目负责人批准，不得并行提前实施。

## 5. 平台边界

### 5.1 Authentication & Authorization

复核现有统一登录、Session、Token Family、RBAC、用户状态和双端认证成果，确认其唯一事实来源、运行边界、测试证据和待补缺口。

Task 7.2 已按以下正式边界完成并获得批准：

1. 统一服务端数据范围派生算法；
2. 消除 `current-user-resolver.ts` 与 Admin API Route 的两套逻辑；
3. 角色名称不得自动授予 `all` 数据范围；
4. 审计内存限流与微信绑定幂等的迁移边界；
5. 不得在未批准 DCR/API Change Request 的情况下修改数据库或 Frozen API。

Task 7.2 的实现、测试和报告已通过项目负责人技术验收。

### 5.2 Object Storage & File Lifecycle

定义二进制对象写入、读取、存在性、元数据、补偿、孤儿检测和清理边界；业务元数据继续由正式数据库对象管理。

Task 7.3 已按以下正式边界完成并获得批准：

1. 扩展 Storage Adapter 正式契约；
2. 补齐 `read`、`stream`、`exists`、`metadata`；
3. 明确 Local 与生产 Storage Adapter 边界；
4. 明确 Storage Key、Checksum、Metadata 与 URL Strategy；
5. 明确对象生命周期、删除补偿和孤儿对象处理；
6. 不得提前实现 Attachment Framework；
7. 如需修改数据库或 Frozen API，必须先提出独立 DCR 或 API Change Request。

Task 7.3 的实现、测试和报告已通过项目负责人技术验收。

### 5.3 Attachment Framework

复用既有 Attachment SSOT，统一上传、下载、关联、权限、安全扫描、保留和审计，不擅自增加对象关系。

Task 7.4 的正式启动边界：

1. 接入 Frozen `attachments` 与 `attachment_links`；
2. 实现 `ATT-001` 至 `ATT-008` 已冻结接口；
3. 建立 Attachment Route、Service、Repository；
4. 上传后正式记录必须复用 Task 7.3 Storage Metadata；
5. 每次下载必须重新进行权限和数据范围校验；
6. 实现业务对象关联、敏感附件权限和删除保护；
7. 完成附件操作审计与 Storage 删除补偿；
8. 不得修改 Frozen API 契约；
9. 如数据库现有字段不足，必须停止并提出 DCR；
10. 不得提前实现 Task 7.5 通用幂等或 Task 7.6 后台清理 Worker。

Task 7.4 实现前审计发现以下 Frozen SSOT 缺口，现均已通过正式变更流程关闭：

1. `attachments.status` 没有正式状态值域、默认值或 Check；
2. `ATT-001` 至 `ATT-008` 没有完整 Request/Response DTO；
3. `object_type` 与 `attachment_category` 没有封闭代码集合；
4. 删除保护、Storage 删除补偿及失败状态没有可执行矩阵；
5. 现有错误码不足以稳定映射全部 Attachment/Storage 失败；
6. `ATT-001` 的生产级首次结果重放依赖由 DCR-004/API CR-004 补齐，Attachment 状态、DTO、类别与删除规则由 DCR-005/API CR-005 补齐。

Database v2.3 与 API v1.5 已提供 Attachment Framework 的正式数据和接口契约。Task 7.5 已完成 `ATT-001`、`ATT-005`、`ATT-006` 与 `ATT-007` 所依赖的统一生产级持久化幂等平台。Task 7.4 不使用进程内 Map、Attachment 专用幂等或平行 Storage 实现。

Task 7.4 的三个内部实施批次结果：

1. Batch 7.4-A：Completed / Approved，完成 Domain、Repository、Registry、Validator 与 Lifecycle；
2. Batch 7.4-B：Completed / Approved，完成 `ATT-001` 至 `ATT-004`；
3. Batch 7.4-C：Completed / Pending Approval，完成 `ATT-005` 至 `ATT-008`、完整删除状态机、生命周期查询、审计和并发验证。

Task 7.4 Implementation 当前为 `Completed / Pending Approval`，正式 Task 状态仍为 `In Progress`，Current Task 仍为 Task 7.4。内部 Batch 状态不进入 `CURRENT_STATUS.md`、`ROADMAP.md`、`PROJECT.md` 或 `README.md`。

### 5.4 Idempotency & Concurrency Control

Task 7.5 的实施范围限定为：

1. 建立 `idempotency_records` Repository；
2. 实现原子认领；
3. 生成 Canonical Request Hash；
4. 生成 Key HMAC Hash；
5. 管理 `processing` 租约；
6. 重放 `completed` / `failed` 首次安全结果；
7. 拒绝同 Key、不同 Request Hash；
8. 对过期 `processing` 进行对账与回收；
9. 持久化安全响应；
10. 建立高风险 API Adapter 与中间件边界；
11. 收口并发控制；
12. 不提前实现 Attachment、Import 或后台 Worker。

Task 7.5 已完成通用持久化幂等平台、Prisma Repository、Hash、Scope、安全响应、租约、重放、对账与统一 Adapter/Middleware 实现，并通过真实 PostgreSQL 18.4 的 20 并发和 4 个独立 Prisma Client / Repository 实例竞争验证。PostgreSQL 是唯一正式并发裁决来源，20 并发仅 1 次认领和 1 次业务执行；HMAC、Canonical Hash、Scope、Lease、Replay、Reconciliation 和安全响应均已完成。Task 7.5 已通过 GitHub 技术验收，正式状态为 `Completed / Approved`；未修改 Database v2.2 或 API v1.4，未提前实现 Attachment、Import 或 Background Worker。任何超出 Database v2.2 或 API v1.4 的数据库或接口变更，仍须先通过独立 DCR 或 API Change Request。

### 5.5 Background Job & Distributed Lock

形成后台执行、重试、失败恢复、幂等消费和必要分布式互斥边界，不使用锁代替数据库业务约束。

### 5.6 Cache & Event Infrastructure

明确缓存只作为派生加速层，事件只作为已提交业务事实的传播机制；两者不得成为库存、权限、状态或审计唯一来源。

### 5.7 Audit, Trace & Observability

统一 Request ID、Trace、结构化日志、Audit Log、安全脱敏、健康检查和运行指标，不把普通日志代替正式审计事实。

## 6. 已有成果迁移原则

1. 原 Phase 7 / Task 7.x 已完成成果迁移为 Phase 8 / Task 8.x；
2. 已完成成果不删除、不重做、不伪造为新 Phase 7 Task 已完成；
3. Task 7.1 先建立能力清单、正式来源、代码证据、测试证据和目标 Task 映射；
4. 已符合 SSOT 的能力只记录复用和差距，不重复开发；
5. 原 Task 8.6 的内部 Batch 状态只记录在 Task 8.6 与 CHANGELOG；
6. Phase 7 完成前不得恢复 Phase 8 Application Development。

## 7. 阶段完成条件

- Task 7.1 至 Task 7.8 全部完成并获得批准；
- Task 7.9 Platform Final Consistency Review 完成并获得批准；
- 平台能力均有唯一 SSOT、清晰分层、可运行实现和自动化证据；
- 不存在已知平台 Blocker；
- DCR/API CR 依赖已完成批准与同步，或经项目负责人书面确认不阻塞；
- `pnpm status:check`、format、lint、typecheck、test、build 全部通过；
- 未修改或绕过 Frozen 业务规则；
- 具备正式启动 Phase 8 Application Development 的条件。

## 8. 当前结论

Phase 7 Platform Foundation 保持 In Progress。Task 7.1 至 Task 7.3 及 Task 7.5 已为 Completed / Approved；Task 7.4 保持 In Progress 并恢复为 Current Task，其 Task 7.5 平台依赖暂停已解除；Task 7.6 至 Task 7.9 均为 Waiting / Not Started。业务应用开发保持暂停。
