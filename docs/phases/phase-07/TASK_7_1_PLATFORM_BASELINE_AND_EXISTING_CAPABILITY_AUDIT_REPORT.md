---
document_name: Task 7.1 Platform Baseline & Existing Capability Audit Report
project: Violin ERP Lite
version: 1.0
status: Completed / Pending Approval
owner: Project Manager
created_date: 2026-07-24
updated_date: 2026-07-24
related_phase: Phase 7
---

# Task 7.1：Platform Baseline & Existing Capability Audit Report

## 1. 审计结论

本报告基于 Commit `046482d09706378291438c37b8ff28db39c827a1`，对 Phase 7 Platform Foundation 的既有实现、Frozen/Approved SSOT、测试和运行配置进行只读审计。

审计确认：统一认证会话、RBAC、上传校验、本地文件写入、审计写入、Request ID、结构化日志和数据库健康检查已经形成可复用成果；但八组平台能力均尚未达到可直接冻结状态。通用持久化幂等存在已知 SSOT 前置阻塞，Background Job、Cache 和 Event Infrastructure 尚无正式平台实现，Attachment 与 Log Frozen API 尚未接入 Route/Service/Repository。

本轮未实现任何 Platform Feature，未修改业务代码、数据库、API、Prisma、Migration、测试逻辑或正式状态文件。

### 1.1 成熟度定义

- **Completed**：SSOT、平台实现、接入和自动化证据完整，可直接进入冻结验收；
- **Partial**：已有可复用成果，但仍存在平台缺口、接入缺口或 SSOT 一致性问题；
- **Missing**：未发现可作为正式平台能力复用的实现；
- **Not Applicable**：经 SSOT 确认不适用于当前项目。

### 1.2 工作量定义

- **S**：1—2 个工程日；
- **M**：3—5 个工程日；
- **L**：6—10 个工程日；
- **XL**：超过 10 个工程日，或依赖独立治理批准及多批次验证。

工作量只用于后续 Task 切分，不构成启动或实现授权。

## 2. Platform Capability Matrix

| 审计能力 | 成熟度 | 已完成内容 | 核心缺口 | 可直接冻结 | 正式归属 |
| --- | --- | --- | --- | --- | --- |
| Authentication & Authorization | Partial | 统一三模式登录、JWT、Session/Token Family、Refresh Rotation、Replay、Logout、微信绑定、RBAC Repository、双端客户端、权限 Guard、认证审计 | 数据范围存在两套不一致派生；限流和微信绑定幂等是单进程内存状态；未发现全局 IP 策略；真实 PostgreSQL 测试默认跳过 | 否 | Task 7.2 |
| Object Storage & File Lifecycle | Partial | 文件名、大小、MIME、扩展名和内容签名校验；SHA-256；Local Storage `store/delete`；随机 Storage Key | 无 `read/stream/exists/metadata` Adapter 契约，无生产 Adapter、URL Strategy、生命周期、孤儿扫描和可审计补偿执行器 | 否 | Task 7.3 |
| Attachment Framework | Partial | Frozen `attachments`、`attachment_links`；附件权限代码；上传安全原语；ATT-001—ATT-008 SSOT | 无 Attachment Route、Service、Repository；无关联对象验证、下载重新鉴权、删除保护、生命周期查询及审计闭环 | 否 | Task 7.4 |
| Idempotency & Concurrency Control | Partial | Request ID；高风险 Route 强制 Header；认证专用内存幂等；认证 Session 持久化重放保护；业务 Repository 事务/唯一约束局部使用 | 无跨进程通用幂等记录、首次结果重放、租约恢复、Canonical Request Hash、Import 文件摘要和原子重复裁决 | 否 | Task 7.5 |
| Background Job & Distributed Lock | Missing | 仅有部分业务任务数据对象和同步执行入口 | 无 Queue、Scheduler、Worker、Retry Policy、Dead Letter、Job Lease、Distributed Lock 或恢复执行器 | 否 | Task 7.6 |
| Cache | Missing | 客户端请求使用 `no-store`；构建工具缓存不属于运行时平台缓存 | 无 Redis 依赖、连接配置、Cache Adapter、TTL、失效策略、权限/状态实时性保护 | 否 | Task 7.7 |
| Event Infrastructure | Missing | 未发现正式 Domain Event 或 Event Bus 实现 | 无事件 Envelope、Publish/Subscribe、提交后发布、可靠投递、幂等消费和失败恢复 | 否 | Task 7.7 |
| Audit & Observability | Partial | `audit_logs`、脱敏 Audit Writer、Request ID、AsyncLocalStorage 上下文、JSON 结构化日志、统一错误响应、数据库 Health 503 | 无 LOG-001—LOG-004 实现；无独立 Trace/Correlation 模型、Metrics、Telemetry Exporter、告警和跨异步链路传播 | 否 | Task 7.8 |

Frozen `ROADMAP.md` 把 Cache 与 Event Infrastructure 合并为 Task 7.7，把 Audit、Trace 与 Observability 定义为 Task 7.8，并把 Task 7.9 定义为 Platform Final Consistency Review。本报告按该正式编号归属，不采用临时指令中与路线不一致的能力编号。

## 3. 现有成果映射

### 3.1 Authentication & Authorization

| 能力 | 代码证据 | 测试证据 | 结论 |
| --- | --- | --- | --- |
| 三种登录模式与严格 DTO | `packages/api/src/auth/auth-flow.ts` | `packages/api/tests/auth-flow.test.ts` | 可复用 |
| JWT、Refresh Hash 与 Token Family | `packages/api/src/auth/token.ts` | `packages/api/tests/auth.test.ts` | 可复用 |
| Session 持久化、轮换、重放和登出 | `packages/database/src/auth/prisma-auth-repository.ts` | `packages/database/tests/auth-repository.integration.test.ts` | 实现存在；真实 PostgreSQL 套件需要显式环境变量 |
| 微信身份绑定 | `packages/api/src/auth/auth-flow.ts`、`packages/database/src/auth/prisma-auth-repository.ts` | API Unit 与 PostgreSQL Integration | 可复用 |
| RBAC 类型与 Guard | `packages/api/src/authorization/permissions.ts`、`packages/api/src/authorization/authorization.ts` | `packages/api/tests/authorization.test.ts` | 可复用 |
| 用户、角色、权限、仓库和店铺管理 | `packages/api/src/security/security-management.ts`、`packages/database/src/security/prisma-security-repository.ts` | `packages/api/tests/security-management.test.ts` | 可复用 |
| 双端会话客户端 | `apps/admin/lib/auth-client.ts`、`apps/miniapp/src/lib/auth-client.ts` | 两端 auth-client tests | 可复用 |
| 认证 Route | `apps/admin/app/api/v1/[...segments]/route.ts` | `apps/admin/tests/auth-api.integration.test.ts` | SEC-001—SEC-005 已接入；集成套件默认依赖环境变量 |

不能直接冻结的主要原因：

1. `packages/database/src/auth/current-user-resolver.ts` 根据 `administrator` 角色直接加入 `all`，而 Frozen `ROLE_PERMISSION_SPEC.md` 明确角色名称本身不自动产生全范围；
2. `apps/admin/app/api/v1/[...segments]/route.ts` 的 Session 路径另行硬编码 `business_related`、采购人员 `self_created` 及仓库/店铺派生，与前述 Resolver 不是同一算法；
3. `AuthenticationRateLimiter` 与 `AuthenticationIdempotencyStore` 都使用进程内 `Map`，无法跨实例共享；
4. Frozen API v1.3 要求的全局安全边界尚未形成统一平台中间件。

### 3.2 Object Storage

现有 `packages/api/src/upload/upload.ts` 已完成：

- 文件名规范化和路径穿越防护；
- 文件大小限制；
- 扩展名、声明 MIME 与内容签名一致性校验；
- SHA-256 Checksum；
- 上传配置读取。

现有 `packages/api/src/upload/local-storage.ts` 已完成：

- UUID Storage Key；
- 非文件系统根目录保护；
- 原子排他写入；
- 文件权限 `0600`；
- `store/delete`。

当前 Adapter 没有读取、流式下载、存在性、Metadata、URL、生命周期或对象枚举能力；Local Storage 也未接入 API Route 或数据库附件事务。

### 3.3 Attachment Framework

数据库已经冻结 `attachments` 与 `attachment_links`，包含文件元数据、Checksum、敏感标记、状态、业务对象关联和审计字段。Frozen API v1.3 已定义 ATT-001—ATT-008，Frozen `ROLE_PERMISSION_SPEC.md` 已定义六个 `attachment.file.*` 权限。

但当前统一 Route 只分发 Authentication、Security、Master Data、Workflow 和 Inventory Workflow；未发现 Attachment Route、Service、Repository 或数据库接入。上传原语不能等同于 Attachment Framework。

### 3.4 Idempotency

已实现：

- `X-Request-ID` 校验、生成、响应回传和 AsyncLocalStorage；
- 多个高风险 Route 对 `Idempotency-Key` 的存在性检查；
- 微信首次绑定的认证专用内存幂等；
- Refresh Token 的持久化重放识别；
- 部分业务写入的数据库事务、版本和唯一约束。

未实现：

- 所有写 API 共用的持久化认领与结果重放；
- 同 Key 不同 Request Hash 的统一数据库裁决；
- Processing Lease、恢复和过期清理；
- `import_tasks.file_checksum`；
- 同文件、类型、目标范围的并发唯一裁决。

`DATABASE_CHANGE_REQUEST_004.md` 与 `API_CHANGE_REQUEST_004.md` 已完整提出上述缺口，但均为 Proposed / Pending Approval，不能作为已生效 SSOT。

### 3.5 Background Job、Cache 与 Event

根目录和全部 Workspace Manifest 未声明 Redis、Queue、Scheduler、Worker、Distributed Lock 或 Event Bus 运行时依赖。源码未发现平台级 Queue、Worker、Retry、Dead Letter、Lock、Cache Adapter、Domain Event、Publisher 或 Subscriber。

`import_tasks`、`backup_tasks` 等数据对象是业务/运维任务记录，不等同于通用 Background Job Framework；Taro、Next、ESLint 或依赖包的内部缓存、Scheduler、Worker 也不构成本项目平台能力。

### 3.6 Audit & Observability

已实现：

- `packages/api/src/audit/audit.ts`：审计事件、敏感值脱敏、required/best-effort 失败模式；
- `packages/database/src/audit/prisma-audit-writer.ts`：写入 Frozen `audit_logs`；
- `packages/api/src/request-context/request-context.ts`：Request ID；
- `packages/api/src/logging/logger.ts`：JSON 结构化日志与字段脱敏；
- `packages/api/src/route-handler/route-handler.ts`：请求开始、完成、失败日志和统一错误；
- `packages/api/src/route-handler/health-check.ts` 与 `apps/admin/app/api/health/route.ts`：数据库不可用时 503。

未实现：

- LOG-001—LOG-004 Route、Service、Repository；
- 独立 Trace ID、Correlation ID 和异步传播；
- Metrics、Exporter、Dashboard、Alert；
- 六类日志的正式查询投影与权限过滤；
- 日志查询和导出自身的审计闭环。

## 4. SSOT 一致性

| 编号 | 结论 | 状态 | 证据与处理 |
| --- | --- | --- | --- |
| SSOT-001 | 用户、微信映射和 Session 分别使用 `users`、`user_wechat_identities`、`auth_sessions` | 一致 | API v1.3、Database v2.1、Prisma 与 Auth Repository |
| SSOT-002 | Refresh Rotation、Replay 和 Logout 的持久化边界 | 一致 | API v1.3 第 20 节、`prisma-auth-repository.ts` |
| SSOT-003 | RBAC 权限代码从 Frozen 目录加载并由服务端校验 | 基本一致 | Permission Catalog、Security Repository、Authorization Guard |
| SSOT-004 | 数据范围摘要存在两套硬编码算法，且管理员角色直接产生 `all` | 冲突 | `current-user-resolver.ts`、API Route 与 `ROLE_PERMISSION_SPEC.md`；Task 7.2 停止直接冻结，先统一算法 |
| SSOT-005 | Attachment 表、权限和 Frozen API 已定义 | 一致但未实现 | Database v2.1、ROLE Permission、API v1.3 |
| SSOT-006 | Import 持久化幂等和文件去重缺少正式数据库对象 | 已知缺口 | DCR-004 / API CR-004 Proposed；批准前不得实现 |
| SSOT-007 | `DOCUMENT_PRIORITY.md` 仍引用 API v1.1 | 陈旧治理引用 | Frozen API v1.3 优先；本轮只记录，不修改 |
| SSOT-008 | 正式 API 总数保持 335，Database 保持 v2.1 | 一致 | ROADMAP、API_SPEC、DATABASE_SPEC |

## 5. 风险清单

| 编号 | 级别 | 风险 | 影响 | 建议 |
| --- | --- | --- | --- | --- |
| PF-R01 | Blocker | DCR-004 与 API CR-004 未批准 | Task 7.5 无法合法实现持久化幂等和 Import 原子去重 | 先完成独立治理审批与 SSOT 同步 |
| PF-R02 | Major | 数据范围存在两套派生逻辑并与 Frozen 规则冲突 | SEC-005 摘要和业务 API 授权结论可能不一致 | Task 7.2 建立唯一 Resolver 并增加回归测试 |
| PF-R03 | Major | 认证限流与绑定幂等仅在单进程内存 | 多实例重启或横向扩展后保护失效 | Task 7.2/7.5 分别收口安全限流与持久化幂等 |
| PF-R04 | Major | Storage Adapter 只有 `store/delete` | 无法形成安全下载、流式读取和生命周期治理 | Task 7.3 补齐 Adapter 契约与运维边界 |
| PF-R05 | Major | Attachment Frozen API 完全未接入 | 附件关系、权限、下载和审计无法端到端运行 | Task 7.4 实施统一框架，不新增 API |
| PF-R06 | Major | Background Job、Retry、Dead Letter 和 Lock 缺失 | Import、Export、清理和恢复无法形成统一异步基线 | Task 7.6 先固化平台语义和持久化需求 |
| PF-R07 | Major | Cache 与 Event Infrastructure 缺失 | 后续模块可能各自实现平行缓存或事件机制 | Task 7.7 建立单一平台边界 |
| PF-R08 | Major | LOG API、Trace、Metrics 和 Alert 缺失 | 无法完成跨请求追踪、运行指标和正式日志查询 | Task 7.8 分离审计事实与运行遥测并补齐接入 |
| PF-R09 | Minor | Approved `DOCUMENT_PRIORITY.md` 保留 API v1.1 陈旧引用 | 阅读者可能误判当前 API 版本 | 通过独立治理同步更新为 v1.3 |
| PF-R10 | Minor | 当前执行环境 Node v26.3.1 超出仓库 Node 22 Engine | Database Test 完成断言后发生 V8 SIGABRT，影响审计稳定性 | 后续验证使用 `.nvmrc` 的 Node 22 |

## 6. 建议 Task 拆分

| Task | 建议边界 | 工作量 | 预计 DCR | 预计 API CR | 预计影响范围 |
| --- | --- | ---: | --- | --- | --- |
| Task 7.2 Authentication & Authorization | 复用现有 Auth/RBAC；统一数据范围 Resolver；收口全局认证 Guard、限流、安全策略和真实 PostgreSQL 证据 | L | 否；发现新持久化需求时另行提案 | 否；不得改变 SEC-001—SEC-025 | API、Database Repository、双端认证客户端、测试 |
| Task 7.3 Object Storage & File Lifecycle | 补齐抽象 Adapter 的安全读取、Streaming、Exists、Metadata、生命周期、补偿和孤儿治理；Local 为开发实现 | M | 原则上否；若新增持久化对象则必须 DCR | 原则上否；保持既有 Storage Strategy 抽象 | API Package、运行配置、存储 Adapter、测试 |
| Task 7.4 Attachment Framework | 实现 ATT-001—ATT-008 的 Route/Service/Repository、对象关联、下载重新鉴权、删除保护和审计 | L | 否；现有两表足够时不得新增结构 | 否；严格实现 Frozen API | API、Database Repository、Object Storage、权限、审计 |
| Task 7.5 Idempotency & Concurrency Control | 建立持久化认领、Request Hash、结果重放、Lease、恢复、清理及 Import 原子去重 | XL | **是：DCR-004，Pending Approval** | **是：API CR-004，Pending Approval** | Database、Migration、API Middleware、全部高风险写 API、测试 |
| Task 7.6 Background Job & Distributed Lock | 固化 Queue、Worker、Retry、Dead Letter、Lease/Lock 和恢复边界；先识别哪些业务动作允许异步 | XL | 待定；若新增 Job/Lock/Outbox 持久化对象则需要 | 待定；只有客户端可观察契约变化才需要 | Runtime、Worker、Database、Import/Export/清理、可观测性 |
| Task 7.7 Cache & Event Infrastructure | Cache 只做派生加速；Event 只传播已提交事实；建立 TTL/失效、事件 Envelope、可靠投递和幂等消费边界 | XL | Cache 原则上否；可靠 Outbox/Inbox 结构预计需要 DCR | 原则上否 | Runtime、Database、API、Worker、业务模块接入点 |
| Task 7.8 Audit, Trace & Observability | 复用 Audit Writer；补齐 LOG-001—LOG-004、Trace/Correlation、Metrics、Telemetry 和告警边界 | L | 原则上否；不得新增平行审计表 | 否；实现既有 LOG API | API、Database Repository、Logger、Health、运维配置 |
| Task 7.9 Platform Final Consistency Review | 验证 Task 7.2—7.8 的唯一 SSOT、实现、测试、依赖方向和运行证据 | M | 否；发现缺口应退回对应 Task | 否 | 全平台只读复核与质量门禁 |

每个 Task 必须独立启动、Commit、Push 和 GitHub 技术验收。本建议不授权并行启动 Task 7.2—7.9。

## 7. 测试与命令证据

| 检查 | 结果 | 说明 |
| --- | --- | --- |
| `pnpm status:check` | PASS | Phase 7 / Task 7.1 均为 In Progress |
| API Package Unit Test | PASS | 10 个 Test Files、55 个 Tests 全部通过 |
| Database Package Test Assertions | PASS with environment limitation | 4 个 Test Files、9 个 Tests 通过；认证 PostgreSQL Integration 6 个 Tests 因未配置环境变量而跳过 |
| Database Package Process | FAIL after assertions | Node v26.3.1 发生 V8 SIGABRT；仓库 Engine 与 `.nvmrc` 要求 Node 22 |
| Redis/Queue/Event 依赖检索 | NONE | 根目录及 Workspace Manifest 无对应运行时依赖 |
| Attachment/Import/Log Route 检索 | NONE | 当前统一 Route 未分发 ATT、IMP、LOG |

上述额外测试仅作为审计证据。Task 7.1 的正式提交门禁仍按用户指令执行 `pnpm status:check` 与 `git diff --check`。

## 8. Task 7.1 完成 Gate

Task 7.1 的审计交付物已形成，进入技术验收前确认：

1. 八组平台能力均已给出成熟度、代码证据、缺口、风险和正式 Task 归属；
2. 没有把 Schema、权限代码或上传原语误判为完整平台框架；
3. DCR-004、API CR-004 仍为 Proposed / Pending Approval；
4. Database v2.1、API v1.3 与 335 个正式 API 保持不变；
5. 未启动 Task 7.2 至 Task 7.9；
6. 未修改 `CURRENT_STATUS.md` 或 `ROADMAP.md`；
7. 未修改任何代码、数据库或 Frozen SSOT。

本报告状态为 Completed / Pending Approval。Task 7.1 的正式状态仍以 `CURRENT_STATUS.md` 为准，继续保持 In Progress，等待 GitHub 技术验收及项目负责人后续批准。
