---
document_name: Phase 7 Platform Foundation
project: Violin ERP Lite
version: 1.0
status: In Progress
owner: Project Manager
created_date: 2026-07-24
updated_date: 2026-07-24
related_phase: Phase 7
---

# Phase 7：平台基础（Platform Foundation）

## 1. 阶段目的

Phase 7 在 Phase 6 Functional Design 与 Phase 8 Application Development 之间建立统一平台基础。它负责盘点、复用并收口跨终端、跨模块的公共技术能力，防止认证、文件、附件、幂等、并发、任务、缓存、事件和审计形成多个事实来源。

本阶段不新增 Phase 6 未批准的业务功能，不修改 Frozen 业务规则、数据库、API、枚举或权限定义。任何正式 SSOT 缺口必须继续通过独立 DCR 或 Change Request 批准后处理。

## 2. 正式状态

- Phase：Phase 7 Platform Foundation；
- Phase Status：In Progress；
- Current Task：Task 7.1 Platform Baseline & Existing Capability Audit；
- Current Task Status：In Progress；
- Phase 8 Application Development：Waiting / Not Started；
- Phase 9 Test Plan & System Integration：Waiting / Not Started；
- Phase 10 Release & Acceptance：Waiting / Not Started。

当前状态唯一入口仍为 `docs/00-governance/CURRENT_STATUS.md`。

## 3. 权威输入

- Frozen `BUSINESS_RULES.md`；
- Frozen Database Logical Design v2.1；
- Frozen API Master Specification v1.3，正式接口总数 335；
- Frozen `ROLE_PERMISSION_SPEC.md`；
- Approved Phase 4 页面设计；
- Frozen Phase 6 Functional Specification；
- Completed / Approved 的原 Phase 7 工程成果，现已迁移为 Phase 8 历史 Task；
- Completed / Approved 的 Phase Renumbering Change Request 001；
- Proposed / Pending Approval 的 DCR-004 与 API CR-004。

DCR-004 与 API CR-004 未因路线重构获得批准，也不得在本阶段入口中被描述为已生效。

## 4. Task 结构

| Task | 名称 | 状态 |
| --- | --- | --- |
| Task 7.1 | Platform Baseline & Existing Capability Audit | In Progress |
| Task 7.2 | Authentication & Authorization | Waiting / Not Started |
| Task 7.3 | Object Storage & File Lifecycle | Waiting / Not Started |
| Task 7.4 | Attachment Framework | Waiting / Not Started |
| Task 7.5 | Idempotency & Concurrency Control | Waiting / Not Started |
| Task 7.6 | Background Job & Distributed Lock | Waiting / Not Started |
| Task 7.7 | Cache & Event Infrastructure | Waiting / Not Started |
| Task 7.8 | Audit, Trace & Observability | Waiting / Not Started |
| Task 7.9 | Platform Final Consistency Review | Waiting / Not Started |

本轮只启动 Task 7.1。其余 Task 必须依次通过正式启动、独立 Commit、Push、GitHub 技术验收和项目负责人批准，不得并行提前实施。

## 5. 平台边界

### 5.1 Authentication & Authorization

复核现有统一登录、Session、Token Family、RBAC、用户状态和双端认证成果，确认其唯一事实来源、运行边界、测试证据和待补缺口。

### 5.2 Object Storage & File Lifecycle

定义二进制对象写入、读取、存在性、元数据、补偿、孤儿检测和清理边界；业务元数据继续由正式数据库对象管理。

### 5.3 Attachment Framework

复用既有 Attachment SSOT，统一上传、下载、关联、权限、安全扫描、保留和审计，不擅自增加对象关系。

### 5.4 Idempotency & Concurrency Control

建立写 API 的通用幂等、请求摘要、原子认领、重放、租约、并发冲突和过期清理框架。DCR-004 与 API CR-004 在正式批准前只作为待决依赖。

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

Phase 7 Platform Foundation 已正式启动并处于 In Progress。当前只执行 Task 7.1；Task 7.2 至 Task 7.9 均为 Waiting / Not Started。业务应用开发保持暂停。
