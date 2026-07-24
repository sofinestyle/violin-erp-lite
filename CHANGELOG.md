---
document_name: 项目变更记录
project: Violin ERP Lite
version: 1.0
status: Draft
owner: Project Manager
created_date: 2026-07-19
updated_date: 2026-07-24
related_phase: Phase 1
---

# CHANGELOG

## [0.11.6] - 2026-07-24

### Added

- 新增 Phase 7 Platform Foundation 正式目录、阶段入口与 Task 7.1 Platform Baseline & Existing Capability Audit 文档
- 新增 Phase 8 Application Development、Phase 9 Test Plan & System Integration、Phase 10 Release & Acceptance 阶段入口

### Changed

- Phase Renumbering Change Request 001 已批准并更新为 `Completed / Approved`
- Frozen `ROADMAP.md` 从九阶段原子升级为十阶段路线
- 原 Phase 7 / Task 7.1 至 Task 7.6 迁移为 Phase 8 / Task 8.1 至 Task 8.6，原 Phase 7 Final Consistency Review 迁移为 Phase 8 Final Consistency Review
- 原 Phase 8 Test Plan 迁入 Phase 9 Test Plan & System Integration，原 Phase 9 Acceptance & Release 顺延为 Phase 10 Release & Acceptance
- Current Phase 更新为 Phase 7 Platform Foundation / In Progress，Current Task 更新为 Task 7.1 / In Progress
- Phase 8、Phase 9 与 Phase 10 更新为 `Waiting / Not Started`
- 原 Batch 7.6-C1 迁移为 Batch 8.6-C1，状态保持 `Paused / Persistence SSOT Conflict`
- 状态检查脚本增加 ROADMAP 与 PROJECT 十阶段编号、数量及顺序校验

### Preserved

- 原 Phase 7 已完成工程成果、批准事实、Commit SHA、日期和 Git 历史均不删除、不重做
- 本条之前的 CHANGELOG 与 DECISION_LOG 旧 Phase/Task 编号保留其历史语义，现行编号按批准的迁移映射解释
- Database v2.1、API v1.3 与 335 个正式 API 保持 Frozen 基线
- DCR-004 与 API CR-004 继续为 `Proposed / Pending Approval`

### Scope

- 只修改治理文档、Phase/Task 文件路径、标题、编号引用和状态检查配置
- 未修改业务代码、数据库、Prisma、Migration、Mapping Audit、API 或测试逻辑
- Phase 8 Application Development 未启动

## [0.11.5] - 2026-07-24

### Added

- 新增 `PHASE_RENUMBERING_CHANGE_REQUEST_001.md`，以 `Proposed / Pending Approval` 提议引入 Platform Foundation 并将固定九阶段路线调整为十阶段
- 提案记录新 Phase 7 的九项候选规划，以及原 Phase 7/Task 7.x、原 Phase 8 Test Plan 和原 Phase 9 的迁移规则

### Changed

- Task 7.6 记录等待路线变更技术审查和项目负责人批准
- 当前业务开发与 Batch 7.6-C1 继续暂停，不执行 Phase/Task 重编号

### Scope

- Frozen `ROADMAP.md`、`PROJECT.md`、`README.md`、`CURRENT_STATUS.md` 和 `DECISION_LOG.md` 均未修改
- 当前九阶段路线、Phase 7 / Task 7.6 状态和全部既有编号继续有效
- Database 保持 v2.1 Frozen，API 保持 v1.3 Frozen，正式 API 总数保持 335
- 未修改代码、数据库、Prisma、Migration、Mapping Audit、API、测试或已完成工程成果

## [0.11.4] - 2026-07-24

### Added

- 新增 `IMPORT_FILE_DEDUPLICATION_AND_IDEMPOTENCY_PERSISTENCE_COMPLETION_001.md`，记录 Import 文件摘要、数据库并发去重、通用幂等持久化及文件补偿的技术审计
- 新增 `DATABASE_CHANGE_REQUEST_004.md`，以 `Proposed / Pending Approval` 提议 Database Logical Design v2.2
- 新增 `API_CHANGE_REQUEST_004.md`，以 `Proposed / Pending Approval` 提议补充幂等 processing 与 Import 重复竞争的外部行为

### Changed

- Task 7.6 记录 Batch 7.6-C1 因持久化 SSOT 缺口暂停
- M-001 保持 `Open / 48 APIs Remaining`，Task 7.6 保持 In Progress

### Verified

- 确认上传层已有 SHA-256 checksum，但 Import Task 未持久化该摘要
- 确认当前无通用持久化幂等记录，认证内存 Map 不能作为业务事实来源
- 确认 Storage Metadata 与 `attachments.checksum` 均不能替代 Import 去重 SSOT
- 确认 API v1.3 未明确 processing 重复请求的外部结果，因此需要 API CR-004

### Scope

- 本轮只完成技术审计和正式 Change Request 提案
- Database 保持 v2.1 Frozen，API 保持 v1.3 Frozen，接口总数保持 335
- 未修改 Frozen SSOT、Prisma Schema、Migration、Mapping Audit、业务代码或测试
- Batch 7.6-C1 更新为 `Paused / Persistence SSOT Conflict`，未实现其 27 个 API

## [0.11.3] - 2026-07-24

### Changed

- API Change Request 003 已批准并完成，API Master Specification 由 v1.2 升级并冻结为 v1.3
- `IMP-001` 至 `IMP-015` 正式同步任务、行校验、行执行和匹配四组状态，以及取消、校验、执行、重试、汇总和重复文件边界
- Task 4.10、Task 5.5、Task 6.2、Task 6.3 与 Task 7.6 已同步 Database v2.1 / API v1.3 的 Import 契约

### Verified

- `IMP-001` 至 `IMP-015` 保持 15 个；API 正式总数保持 335
- 未新增或改义 API、DTO、权限、错误码、数据库对象或业务功能
- `CBR-018` 至 `CBR-021` 的任务、详情、行结果和匹配结果投影与正式状态一致，`CBR-022` 保持来源追溯

### Scope

- Task 7.6 保持 In Progress，M-001 保持 Open / 48 APIs Remaining
- Batch 7.6-C1 从 `Paused / SSOT Conflict` 更新为 `Ready to Resume / Pending Execution`，本轮尚未实现该批次 27 个 API
- 本轮未修改 `CURRENT_STATUS.md`、路线、项目状态、README、数据库、Route、Service、Repository、前端或测试

## [0.11.2] - 2026-07-24

### Changed

- Database Change Request 003 已批准并完成，Database Logical Design 由 v2.0 升级并冻结为 v2.1
- 为 `import_tasks.status`、`import_task_items.validation_status`、`import_task_items.execution_status` 和 `shipment_import_matches.match_status` 增加四项正式值域 Check
- Prisma Schema 补充 Check 物理映射说明，Mapping Audit 的 Check 由 222 增至 226

### Verified

- 新增 `20260724090000_add_import_status_value_checks` 独立前向 Migration，在添加约束前审计未知历史值且不自动映射
- 隔离 PostgreSQL 18 完成全量 Migration、Migration Status、四组全部合法值写入及每个字段非法值拒绝验证
- 表、字段、主键、唯一约束、外键、普通索引和 PostgreSQL Enum 数量均保持不变

### Scope

- API Master Specification v1.3 尚未执行 Documentation Sync 或 Freeze，API Change Request 003 文件状态保持不变
- Task 7.6 保持 In Progress，Batch 7.6-C1 继续 `Paused / SSOT Conflict`，M-001 保持 Open / 48 APIs Remaining
- 本轮未修改 `CURRENT_STATUS.md`、路线、项目状态、README、API、Route、Service、Repository、前端或测试业务逻辑

## [0.11.1] - 2026-07-24

### Added

- 新增 `Import Status Code Completion 001`，审计并提出导入任务、行级校验、行级执行和发货导入匹配四个状态代码集合
- 新增 `Database Change Request 003` 提案，建议为四个现有状态字段增加值域 Check，并将 Database Logical Design 建议升级为 v2.1
- 新增 `API Change Request 003` 提案，补充既有 Import API 的状态筛选、动作、重试、取消、汇总和页面映射

### Changed

- Task 7.6 记录 Batch 7.6-C1 因状态代码 SSOT 缺口保持 `Paused / SSOT Conflict`
- M-001 保持 Open，剩余 48 个 API；Task 7.6 保持 In Progress
- 建议保留 `failed` 任务状态和仅表示数量部分匹配的 `partially_matched`
- 建议“待上传”保持 IMP-001 提交前页面状态，`unmatched/conflict` 不写入具有必填目标外键的匹配记录

### Scope

- 三份治理文件均为 Proposed / Pending Approval，不构成 Approved / Frozen 事实
- 正式 API 总数保持 335；本轮未实现任何 Import、Attachment 或 Audit Log API
- 未修改 Frozen SSOT、Prisma Schema、Migration、Mapping Audit、业务代码或测试

## [0.11.0] - 2026-07-23

### Added

- 实现 Frozen `SEC-001` 至 `SEC-005` 的统一密码登录、微信绑定/自动登录、Refresh Session 轮换、Token Family 登出、当前会话和当前权限 API
- 新增基于 `users`、`user_wechat_identities`、`auth_sessions` 与现有 RBAC 的认证 Service、Prisma Repository、微信服务端适配器及统一安全错误
- 新增 Admin 登录、恢复、单飞刷新、认证失效退出和登出链路
- 新增 Mini Program 微信自动登录、首次绑定、恢复、单飞刷新、权限装载和登出链路
- 新增认证单元测试、双端客户端测试、真实 PostgreSQL Repository 集成测试和 `SEC-001` 至 `SEC-005` HTTP 集成测试

### Changed

- Access Token 改为最小 Session Claims，Refresh Token 改为服务端 Pepper 参与的 HMAC 摘要
- 所有已实现受保护 API 改为逐请求校验当前 Session、Token Family、用户状态、有效角色、权限及显式仓库/店铺范围
- `.env.example` 与 README 认证说明同步 Refresh Pepper、微信 AppID、App Secret 和微信服务端地址
- API 实现覆盖由 282 / 335 更新为 287 / 335；B-001 关闭，M-001 剩余 48 个接口

### Verified

- Node.js 22.23.1 下 `status:check`、Lint、Typecheck、标准 Test、Build、Admin/Mini Program 独立 Build、Prisma Generate/Validate 与 Migration Status 通过
- 隔离 PostgreSQL 18.4 完成 Migration、Seed、认证 Repository 并发/事务测试及真实 Admin HTTP 登录、权限、Refresh、Logout 冒烟验证
- Mock 微信服务覆盖首次绑定、幂等重试和后续自动登录，不连接真实微信网络

### Scope

- Batch 7.6-B：Completed / Pending Approval；Task 7.6 保持 In Progress
- 未修改 Frozen SSOT、Prisma Schema、Migration、Mapping Audit、Seed、角色权限定义或 API 总数
- 未实现剩余 48 个 M-001 接口，未启动后续 Batch、Phase 7 Final Consistency Review 或 Phase 8

## [0.10.2] - 2026-07-23

### Changed

- 正式批准 API Change Request 002，并将 API Master Specification 从 v1.1 升级为 v1.2
- 补齐 `SEC-001` 的 `password`、`wechat-bind`、`wechat` 判别式请求、统一响应、Validation、幂等、审计和安全规则
- 补齐 `SEC-002` 的 Session 轮换、Refresh Token 重放整族撤销和数据库事务要求
- 补齐 `SEC-003` 当前 Token Family 幂等登出、`SEC-004` 安全会话摘要和 `SEC-005` RBAC 权限摘要
- Authentication SSOT Completion 001 更新为 Completed / Approved
- 同步 Task 5.5、Task 6.3 和 Task 7.6 的认证契约与边界

### Freeze

- API Master Specification v1.2：Completed / Approved / Frozen
- 正式接口总数保持 335，不新增路径、编号、权限代码、页面或业务功能
- Database Logical Design v2.0、角色权限规格和业务规则保持不变

### Scope

- 仓库不维护 OpenAPI / Swagger 文件，本轮无 OpenAPI 资产需要同步
- 本轮只修改正式文档，不修改数据库、Migration、Prisma Schema、Mapping Audit、API 实现、JWT、前端、Seed 或测试逻辑
- Task 7.6 保持 In Progress，Batch 7.6-B 继续暂停

## [0.10.1] - 2026-07-23

### Added

- 为 Database Change Request 002 新增认证会话持久化 Completion Fix，正式加入 `auth_sessions`
- 新增 `20260723160000_add_auth_sessions` 独立前向 Migration
- 新增每次刷新创建新 Session 行的轮换链、Refresh Token 安全摘要、令牌族撤销和循环防护

### Changed

- Database Logical Design 版本保持 v2.0，并在 Completion Fix 验证通过后保持 Completed / Approved / Frozen
- Prisma Schema 与 Mapping Audit 同步为 62 表、1160 字段、62 主键、76 唯一约束、292 外键、94 普通索引、222 Check、2 枚举
- Authentication SSOT Completion 001 同步为 Database Approved / API Pending Approval；API Change Request 002 状态不变

### Verified

- 在隔离 PostgreSQL 18 上验证空库全量 Migration、v2.0 基线增量升级、Migration Status、约束、RESTRICT 外键、轮换并发、重放历史和族撤销
- `user_wechat_identities` 的既有 Schema 与 Migration 未修改

### Scope

- 本轮只补齐数据库认证会话结构，不修改 API、Route、Service、Repository、登录、刷新、登出、JWT、Web、Mini Program、权限或 Seed
- Batch 7.6-B 继续暂停，Task 7.6 保持 In Progress

## [0.10.0] - 2026-07-23

### Added

- 正式新增 `user_wechat_identities` 微信身份映射表，包含 14 个字段、1 个主键、3 个当前有效绑定部分唯一约束、4 个 RESTRICT 外键、7 项 Check 和 1 个普通索引
- 新增 `20260723150000_add_user_wechat_identities` 正式前向 Migration

### Changed

- Database Change Request 002 更新为 Completed / Approved
- Database Logical Design 由 v1.1 升级并重新冻结为 v2.0
- Prisma Schema、`prisma/mapping-audit.json` 和数据库枚举规范引用同步至 v2.0
- Database Mapping Audit 更新为 61 表、1142 字段、61 主键、74 唯一约束、287 外键、91 普通索引、208 Check、2 枚举
- Authentication SSOT Completion 001 更新为 Database Approved / API Pending Approval
- Task 7.6 文档记录数据库阻塞关闭及 API 变更仍待批准

### Scope

- Task 7.6 保持 In Progress，Batch 7.6-B 仍未开始
- 未修改 API、Route、Service、Repository、登录、JWT、Web、Mini Program、权限、Seed 或业务逻辑
- 未修改 `CURRENT_STATUS.md`、`ROADMAP.md`、`PROJECT.md` 或 `README.md`

## [0.9.9] - 2026-07-23

### Added

- 新增 `Authentication SSOT Completion 001`，记录 Approved 微信首次绑定、自动登录与当前 Frozen API / Database SSOT 之间的实现缺口及正式推荐方案
- 新增 `API Change Request 002`，提议在既有 `SEC-001` 中以 `password`、`wechat-bind`、`wechat` 三种判别模式补齐统一认证契约
- 新增 `Database Change Request 002`，提议以 `user_wechat_identities` 建立微信身份到既有 `users.id` 的可审计持久映射

### Changed

- Task 7.6 实施文档记录认证 SSOT 阻塞、治理入口和 Batch 7.6-B 暂停边界
- 新增 DEC-075，记录冲突发现、提案状态及批准前禁止开发

### Scope

- 三份新增治理文件均为 Proposed / Pending Approval，不构成 Approved / Frozen 事实
- Task 7.6 保持 In Progress；Batch 7.6-B 的冲突部分保持暂停
- 未修改任何 Frozen / Approved 正式规格、API 数量、Prisma Schema、Migration、Mapping Audit、Seed、业务代码或测试

## [0.9.8] - 2026-07-23

### Added

- 建立 Node.js 22、pnpm 11.12.0 与 PostgreSQL 18 的正式开发运行基线
- 新增 `.nvmrc`、PostgreSQL 18 Compose 配置及数据库启动、停止和初始化脚本
- 新增无真实业务数据的幂等开发 Seed，由环境变量初始化开发管理员，并建立 Frozen `administrator` 角色与 244 个正式权限
- README 补齐环境变量、数据库初始化、Prisma、Migration、Seed、双端启动、Health Check 与常见错误说明

### Changed

- `.env.example` 补齐所有开发变量说明、最小本地配置及无明文管理员密码的 Seed 配置
- 受保护 API 在初始化 JWT 与数据库依赖前先校验 Bearer Header，数据库不可用时 Health 保持 503，未登录请求保持 401
- Node Engine 固定为 22.x，pnpm Engine 固定为 11.x，避免使用未验证的 Node 26 测试 worker
- 删除未被 workspace 或代码引用的 `apps/admin-web` 与 `apps/mini-program` 历史空目录
- Task 7.6 文档记录 Batch 7.6-A 的实施结果、真实 PostgreSQL 验证证据及剩余问题

### Scope

- Task 7.6 保持 In Progress，未修改 `CURRENT_STATUS.md`、`ROADMAP.md` 或 `PROJECT.md`
- 未修改业务规则、API 定义、Prisma Schema、Migration、权限规格、页面功能、Mini Program 功能或 Dashboard
- 未写入真实账号、密码、密钥、业务数据或真实业务数据库

## [0.9.7] - 2026-07-23

### Added

- 新增 Task 7.6 系统集成与开发收口正式实施文档
- 完成 Monorepo、双端应用、API、数据库、权限、业务链路、环境、构建和现有测试的代码现状审计
- 建立 Blocker、Major、Minor、Verified 与 Out of Scope 五级问题清单及后续内部 Batch 实施计划

### Changed

- 项目负责人正式启动 Task 7.6，Current Task Status 与 Task 7.6 状态更新为 In Progress
- Phase 7 保持 In Progress，Task 7.5 保持 Completed / Approved，Phase 7 Final Consistency Review 保持 Waiting / Not Started
- 新增 DEC-073，记录 Task 7.6 启动、审计基线与后续分批执行边界

### Scope

- 本轮只执行 Task 7.6 状态启动、现状审计与实施计划固化，未修改业务代码或测试逻辑
- 未修改 Prisma Schema、Migration、Seed、依赖或任何 Approved / Frozen 业务规格
- 未启动任何后续代码整改、Phase 7 Final Consistency Review 或 Phase 8

## [0.9.6] - 2026-07-23

### Changed

- Task 7.5-A、Task 7.5-B 和 Task 7.5-C 的开发成果均已完成并通过 GitHub 技术验收
- 项目负责人正式批准 Task 7.5 核心业务功能实现，状态更新为 Completed / Approved
- Current Task 切换至 Task 7.6 系统集成与开发收口，Task 7.6 保持 Waiting / Not Started
- 新增 DEC-072，记录 Task 7.5 批准及当前任务切换决定

### Scope

- Phase 7 保持 In Progress，Phase 7 Final Consistency Review 保持 Waiting / Not Started
- 本次仅执行 Documentation Status Sync，未启动 Task 7.6 或 Phase 7 Final Consistency Review
- 未修改工程代码、测试、Prisma Schema、Migration、Seed、依赖或任何 Approved / Frozen 业务规格

## [0.9.5] - 2026-07-23

### Added

- 完成 Task 7.5-C 库存、库存事务、国内出入库与跨境业务 MVP，接入 `INV-001` 至 `INV-026`、`TRF-001` 至 `TRF-015`、`STC-001` 至 `STC-017`、`DMG-001` 至 `DMG-013`、`OUT-001` 至 `OUT-017`、`SRT-001` 至 `SRT-013`、`CBR-001` 至 `CBR-022` 共 123 个既有正式 API
- 新增统一 Route Handler 分派、Service、Validation、Permission、Audit 与 Prisma Repository；所有写入继续复用 Task 7.3 公共能力
- 新增 PC 库存余额、库存流水、库存调整、库存预警、库存调拨、库存盘点、库存报损、国内销售出库、销售退货、跨境发货、海外仓库存及海外库存导入工作台
- 微信小程序新增库存余额、库存流水、出入库及跨境只读查询入口，不增加后台管理能力
- 新增 API 覆盖、权限、校验、Repository、库存事务、工作流及双端页面自动化测试

### Changed

- 库存增加与扣减统一通过原子库存事务同步写入库存余额和库存流水，并在库存不足时拒绝事务
- 调拨发运执行来源仓至在途仓的成对库存事务，调拨收货执行在途仓至目标仓的成对库存事务
- 盘点开始时建立账面库存快照，完成盘点不直接修改库存；报损、国内销售出库与销售退货仅在正式确认动作中影响库存
- 跨境发货保持厂家仓、在途仓、海外仓正式模型，`CBR-003` 的 `transportMethod` 按 Frozen API 作为必填且最大长度 50 的自由文本处理

### Scope

- 未实现 Dashboard、统计分析或 AI，未新增、修改或重命名任何正式 API
- 未修改数据库表、字段、枚举、约束、索引、Prisma Schema、Migration 或 Seed
- 未修改任何 Approved / Frozen 文档；Task 7.5-C 完成后等待 GitHub 技术验收，未经项目负责人批准不得启动下一阶段

## [0.9.4] - 2026-07-23

### Changed

- 通过 API Coverage Completion 004，在 `CBR-003` 创建跨境发货单 Request DTO 中补充必填 `transportMethod`
- `transportMethod` 类型为 `string`、最大长度 50，直接映射 `cross_border_shipments.transport_method`（`VARCHAR(50) NOT NULL`）
- `CBR-003` 成功响应返回持久化后的 `transportMethod`，不使用默认值或派生值

### Scope

- `transportMethod` 不建立枚举、不限制固定字符串、不设置默认值
- 本次未新增 API，`CBR-*` 仍为 22 个，API Master Specification v1.1 正式接口总数保持 335
- 未修改数据库、业务规则、`SYSTEM_SPEC.md`、`DATABASE_SPEC.md`、`DATABASE_ENUM_SPEC.md`、`ROLE_PERMISSION_SPEC.md`、Phase 4、Phase 5、Phase 6 或工程代码

## [0.9.3] - 2026-07-23

### Changed

- 根据 Frozen Consistency Fix 002，在 Phase 4 Task 4.10 跨境发货新建与编辑表单的物流信息区域补充“运输方式”
- 跨境发货正式字段清单、物流信息说明与页面表单保持一致

### Scope

- 本次仅修复 Phase 4 跨境业务页面设计的文档内部一致性，不新增业务需求
- 未修改数据库、API、`BUSINESS_RULES.md`、`SYSTEM_SPEC.md`、`DATABASE_SPEC.md`、`DATABASE_ENUM_SPEC.md`、`ROLE_PERMISSION_SPEC.md`、Phase 5、Phase 6 或工程代码
- `transport_method` 继续使用既有数据库定义；CBR-003 的覆盖补齐留待独立 API Coverage Completion 004

## [0.9.2] - 2026-07-23

### Added

- 完成 Task 7.5-B 两条平行业务闭环：采购订单 → 采购付款 → 采购来源验收 → 采购来源正式入库，以及生产订单 → 生产进度/分批完工 → 生产来源验收 → 生产来源正式入库
- 新增 `PUR-001` 至 `PUR-019`、`PRO-001` 至 `PRO-029`、`INS-001` 至 `INS-010`、`INB-001` 至 `INB-004` 与 `INB-006` 至 `INB-018` 的 Route Handler、Service、Repository、Validation、Permission 与 Audit 实现
- 新增 PC 采购、采购付款、采购验收、生产进度、分批完工、生产验收及两类入库工作台；微信小程序新增采购、生产和验收只读查询入口
- 新增 API、Repository、Permission、Validation、Workflow 与 Page 自动化测试

### Changed

- 采购付款仅累计已付与未付金额，不改变采购订单完成状态，也不创建或触发生产订单
- 生产创建 DTO 明确拒绝任何采购订单标识；采购与生产验收通过互斥来源字段保持独立
- 正式入库仅接受已确认且来源一致的采购/生产验收单，并在确认与冲销时以事务写入库存余额、库存流水及来源累计数量
- 生产完工确认/撤销与验收确认/撤销采用事务更新对应累计数量

### Scope

- 未实现采购退货、其他来源入库、库存管理、盘点、调拨、报损、国内销售出库/退货、跨境、Dashboard、统计或 AI
- 未新增或修改正式 API，未修改数据库表、字段、枚举、约束、索引、Migration 或 Seed
- 未修改任何 Approved / Frozen 文档；Task 7.5-B 完成后等待 GitHub 技术验收，未经项目负责人批准不得启动 Task 7.5-C

## [0.9.1] - 2026-07-23

### Changed

- 根据 Frozen Consistency Fix 001，从 Phase 6 Task 6.2 采购订单新增与编辑描述中删除“采购类型”
- Task 6.2 采购功能规格与 Approved Phase 4 页面、Frozen Phase 5 API 和 Database Logical Design v1.1 保持一致

### Scope

- 本次仅修复 Frozen 文档一致性，不修改数据库、API、页面、`BUSINESS_RULES.md`、`SYSTEM_SPEC.md`、`DATABASE_SPEC.md`、`DATABASE_ENUM_SPEC.md`、`ROLE_PERMISSION_SPEC.md` 或工程代码
- 采购订单继续使用供应商、SKU、数量、单价、交期、币种及既有 Approved / Frozen 字段，不新增或删除数据库字段及正式 API

## [0.9.0] - 2026-07-23

### Added

- 完成 Task 7.5-A 基础资料 MVP，覆盖 Product、SKU、Category、Brand、Manufacturer、Supplier、Warehouse、Store、User 和 Role 十个正式对象
- 新增 8 类基础资料的 Repository、Service、DTO/Validation、Mapper 与受控 Route Handler 分派，实现 64 个既有 `MD-*` 正式接口
- 新增 `SEC-006` 至 `SEC-025` 的用户、角色、权限、用户角色及角色仓库/店铺数据范围实现，数据范围更新仅支持整体 Replace
- 新增符合 Task 7.4 App Shell 的 PC 基础资料与用户权限页面，提供表格、工具栏、搜索、状态筛选、分页、详情/编辑抽屉、确认 Dialog、空态、加载态和错误态
- 微信小程序新增 Phase 4 正式规划内的 SKU 查询入口；未增加后台管理能力
- 新增 Repository、Service、API、Validation、Permission 与 Page 自动化测试

### Changed

- 根目录测试脚本先构建共享包，保证 Workspace 测试使用当前源码对应的发布产物
- 基础资料写操作统一复用 Task 7.3 的 JWT、RBAC、Permission Guard、Audit、Logger、Response 与 Error 公共能力
- 仓库与店铺列表在分页前应用 `role_warehouses` 与 `role_stores` 数据范围；`access_level` 仅接受 `read`、`operate`、`manage`

### Scope

- 未实现采购、生产、库存操作、调拨、盘点、报损、出入库、跨境、Dashboard、统计或 AI 能力
- 未新增 API、数据库表、字段、枚举、约束、索引、Migration 或 Seed
- 未修改任何 Approved / Frozen 业务、数据库、角色权限、API、Phase 4 或 Phase 6 文档
- Task 7.5-A 已达到待 GitHub 技术验收条件；未经项目负责人批准不得启动 Task 7.5-B

## [0.8.7] - 2026-07-23

### Added

- 通过 API Coverage Completion 003 补齐角色仓库与店铺数据范围维护 `SEC-022` 至 `SEC-025` 共 4 个正式接口
- 新增角色仓库范围查询/整体替换及角色店铺范围查询/整体替换契约
- 每个接口已定义 Request、Response、DTO、Validation、Permission、Error Code 与 Audit

### Changed

- `accessLevel` Validation 统一引用 Frozen `DATABASE_ENUM_SPEC.md`，只接受 `read`、`operate`、`manage`
- 两个 PUT 接口采用原子 Replace，禁止 Append、Remove 或 Patch 语义
- API Master Specification v1.1 正式接口总数由 331 更新为 335，并重新确认为 Completed / Approved / Frozen
- `PROJECT.md`、`ROADMAP.md` 和 `README.md` 同步 API Coverage Completion 003 及 335 个正式接口
- 新增 DEC-068，记录角色数据范围 API 覆盖补齐决定

### Scope

- 本次只补齐既有 `role_warehouses` 与 `role_stores` 关系的正式 API 覆盖，不新增业务对象、数据库表、字段、关系、枚举、角色、权限代码或数据范围
- 未修改 BUSINESS_RULES、SYSTEM_SPEC、DATABASE_SPEC、DATABASE_ENUM_SPEC、ROLE_PERMISSION_SPEC、Phase 4 或 Phase 6
- 未修改工程代码、Prisma Schema、Migration、Seed 或依赖，未启动 Task 7.5-A

## [0.8.6] - 2026-07-23

### Added

- 通过 SSOT Completion 001 补全 `access_level` 的三个正式枚举代码：`read`、`operate`、`manage`
- 明确 `read` 仅允许查看，`operate` 允许业务操作但不允许管理权限，`manage` 允许全部业务操作及配置管理

### Changed

- `DATABASE_ENUM_SPEC.md` 成为 `warehouse_type` 与 `access_level` 正式枚举的唯一维护入口
- `DATABASE_SPEC.md`、Task 3.5.1 与 Task 3.5.5 仅同步统一枚举入口引用，不重复维护枚举集合
- 新增 DEC-067，记录 `access_level` 正式枚举补全与冻结决定

### Scope

- 本次只补全 Frozen Database Logical Design v1.1 已预留的 `access_level` 枚举集合，不新增业务对象、业务规则、数据库表、字段、关系、索引或其他枚举
- 未修改 BUSINESS_RULES、SYSTEM_SPEC、ROLE_PERMISSION_SPEC、Phase 4、Phase 5、Phase 6 或工程代码
- 未修改 Prisma Schema、Migration、Seed 或 API；Task 7.5 保持 In Progress

## [0.8.5] - 2026-07-23

### Added

- 通过 API Coverage Completion 002 补齐用户、角色与权限管理 `SEC-006` 至 `SEC-021` 共 16 个正式接口
- 用户管理新增列表、详情、创建、更新、状态更新和密码重置接口
- 角色管理新增列表、详情、创建、更新、状态更新、角色权限查询/替换及用户角色查询/替换接口
- 权限管理新增正式权限目录分页查询接口
- 每个新增接口已定义 Request、Response、DTO、Validation、Permission、Error Code、Audit 及适用分页规则

### Changed

- API Master Specification v1.1 正式接口总数由 315 更新为 331，并重新确认为 Completed / Approved / Frozen
- `PROJECT.md`、`ROADMAP.md` 和 `README.md` 同步 API Coverage Completion 002 及 331 个正式接口
- 新增 DEC-066，记录用户、角色与权限管理 API 覆盖补齐决定

### Scope

- 本次只补齐既有 Approved 用户、角色与权限管理能力的 API 覆盖，不新增业务模块、业务对象、角色、权限代码、数据库表、字段、关系或状态
- 未修改 BUSINESS_RULES、SYSTEM_SPEC、DATABASE_SPEC、DATABASE_ENUM_SPEC、ROLE_PERMISSION_SPEC 或 Phase 6 Frozen 内容
- 未修改工程代码、依赖、Prisma Schema、Migration 或 Seed，未执行 Task 7.5-A 开发

## [0.8.4] - 2026-07-23

### Changed

- Task 7.4 双端应用壳层与公共能力已通过 GitHub 技术验收并获得项目负责人批准，状态更新为 Completed / Approved
- Task 7.5 核心业务功能实现正式启动，状态更新为 In Progress
- 当前正式任务更新为 Task 7.5，Phase 7 保持 In Progress
- 新增 DEC-065，记录 Task 7.4 批准与 Task 7.5 启动决定

### Scope

- Task 7.6 与 Phase 7 Final Consistency Review 保持 Waiting / Not Started
- 本次仅同步正式 Phase 与 Task 状态，未修改工程代码、依赖、Prisma Schema、Migration 或 Seed
- 未修改 Frozen 业务、产品、角色权限、数据库、API、Phase 4 或 Phase 6 文档，正式 API 总数保持 315

## [0.8.3] - 2026-07-22

### Added

- 新增符合 Phase 4 的 PC 管理端应用壳层，包括 Header、Sidebar、Breadcrumb、Tab、默认折叠信息面板、全局加载与错误状态、404、500 及十个一级导航占位入口
- 新增微信小程序应用壳层及“首页、业务、库存、我的”四个正式 TabBar 占位页面，并提供网络状态与 Update Manager 工程封装
- 新增固定 Light Theme、空用户、空权限、应用配置 Context，以及复用 Task 7.3-C `PermissionCode` 的双端 Permission Wrapper
- 新增 PageContainer、PageHeader、Card、EmptyState、TableEmpty、SearchBar、Pagination、Dialog、ConfirmDialog、Toast、Skeleton 和 StatusBadge 通用组件
- 新增 `zh-CN` 默认、`en-US` 预留的最小 i18n 基础，以及 PC 壳层启动健康检查门控

### Changed

- `AGENTS.md` 补充 Approved / Frozen SSOT 高于 ChatGPT 执行指令、冲突停止报告及禁止使用聊天记忆覆盖正式设计的永久执行规则
- 补齐 Tailwind CSS、shadcn/ui 组件基础及 Taro 4.2.1 同版本 loader 所需工程依赖，未升级既有核心依赖大版本

### Verified

- PC 壳层启动与 `GET /api/health` 均返回 HTTP 200；一级导航、占位页、信息面板与健康检查失败安全状态通过自动测试和浏览器验证
- 微信小程序生产编译成功并能进入 watch；TabBar 仅包含“首页、业务、库存、我的”
- 仓库共 46 项测试通过，其中本次新增 9 项双端壳层测试并更新 1 项共享 i18n 测试

### Scope

- Task 7.4 保持 In Progress，完成后仍需 ChatGPT GitHub 技术验收与项目负责人批准
- 本次未实现登录、Token 业务流程、Dashboard、ERP 业务页面、315 个正式业务 API、Repository、Service、数据库结构、Migration、Seed 或真实业务审计与上传
- 未修改 Frozen 业务、产品、角色权限、数据库、API、Phase 4 或 Phase 6 文档，正式 API 总数保持 315

## [0.8.2] - 2026-07-22

### Changed

- Task 7.3 数据持久化与后端公共基础已通过 GitHub 技术验收并获得项目负责人批准，状态更新为 Completed / Approved
- Task 7.4 双端应用壳层与公共能力正式启动，状态更新为 In Progress
- 当前正式任务更新为 Task 7.4，Phase 7 保持 In Progress
- 新增 DEC-064，记录 Task 7.3 批准与 Task 7.4 启动决定

### Scope

- Task 7.5 至 Task 7.6 与 Phase 7 Final Consistency Review 保持 Waiting / Not Started
- 本次仅同步正式 Phase 与 Task 状态，未修改工程代码、依赖、Prisma Schema、Migration 或 Seed
- 未修改 Frozen 业务、数据库、角色权限、API 或 Phase 6 文档，正式 API 总数保持 315

## [0.8.1] - 2026-07-22

### Added

- 新增 JWT Access Token / Refresh Token 签发与验证、Token 类型隔离、过期/无效安全错误、密码 scrypt 哈希与当前用户认证上下文
- 按 Frozen `ROLE_PERMISSION_SPEC.md` 精确展开 5 个角色、244 个权限代码和 6 类数据范围，新增单权限、任一权限与全部权限后端守卫
- 新增审计事件、深层敏感字段过滤、必须/最佳努力失败策略、内存测试适配器和 Frozen `audit_logs` Prisma 写入适配器
- 新增上传文件扩展名、MIME、二进制特征、大小、文件名和路径穿越校验，以及本地开发存储与删除适配器
- 新增认证、RBAC、审计、上传及 Prisma 审计适配器的工程测试

### Changed

- 服务端技术参数新增 JWT 密钥/时限和上传存储/大小的无真实凭据环境变量示例
- `X-Request-ID` 的合法格式收口为 UUID，以便与 Frozen `audit_logs.request_trace_id` 物理类型一致
- 新增 `jose 6.2.3` 和 `file-type 20.5.0` 固定依赖及 pnpm lockfile，未放宽现有供应链策略

### Verified

- JWT 签发/验证、Access/Refresh 隔离、过期、篡改、错误密钥和密码哈希测试通过
- Frozen RBAC 目录为 5 个角色、244 个唯一权限和 6 类数据范围；无空权限角色，无未分配权限
- 审计敏感信息过滤、写入成功/失败和上传类型、大小、文件名、存储及删除测试通过

### Scope

- 本次只实现 Task 7.3-C 认证、权限、审计和上传公共技术基础，未实现登录/刷新/退出 API、315 个业务 API、Repository、Service、页面或 ERP 业务逻辑
- 未修改 Prisma Schema、Migration、Seed、Frozen 业务/数据库/API/角色权限/Phase 6 文档或当前状态治理文件，正式 API 总数保持 315

## [0.8.0] - 2026-07-22

### Added

- 将 `ROLE_PERMISSION_SPEC.md` 从占位文档完善为 Completed / Approved / Frozen 正式规格
- 固定管理员、采购人员、仓库人员、销售人员和公司负责人 5 个正式角色代码
- 建立 `module.resource.action` 权限代码规范、244 个可追溯正式权限、角色权限矩阵和 6 类数据范围
- 新增 DEC-063，记录角色权限正式入口、管理员权限边界和冲突停止规则

### Changed

- `DOCUMENT_PRIORITY.md` 明确 `ROLE_PERMISSION_SPEC.md` 是角色代码、权限代码、角色权限映射和数据范围的唯一正式入口
- API 权限语义继续以 Frozen API Master Specification v1.1 为依据；两者冲突时必须停止

### Verified

- 正式角色 5 个，正式权限 244 个；模块权限数量合计与目录一致
- 无权限角色、未分配权限和无正式来源权限均为 0

### Scope

- 本次只整理并冻结既有 Approved / Frozen 角色权限语义，不新增业务模块、业务职责、审批流程、数据库对象、页面或 API
- 未修改 Frozen 业务、数据库、API 或 Phase 6 内容，未修改工程代码，未执行 Task 7.3-C 开发，315 个正式 API 保持不变

## [0.7.9] - 2026-07-22

### Added

- 完成 Task 7.3 后端公共框架，新增 Frozen-compatible 统一成功/失败响应、基础错误体系、Request ID、请求上下文、结构化安全日志、参数解析与校验入口
- 新增 Prisma Client 延迟初始化单例与只执行 `SELECT 1` 的数据库连接检查
- 新增工程健康检查 `GET /api/health`，返回应用及数据库状态，不登记为 `/api/v1` 正式业务接口
- 新增公共响应、错误安全转换、Request ID 生成与透传、Prisma 单例及健康检查成功/异常测试

### Changed

- `apps/admin` 接入 `packages/api` 与 `packages/database` Workspace 公共包，并配置 Next.js 转译本地 TypeScript 包
- `packages/api` 与 `packages/database` 保留源码类型入口和构建产物运行时入口，admin 直接启动或构建前统一构建后端依赖包

### Scope

- 本次只建立后端公共技术能力，未实现 315 个正式业务 API、登录、JWT、RBAC、文件上传、Repository、Service、审计日志业务写入、页面或 ERP 业务逻辑
- 未修改 Frozen 数据库结构、Migration、Seed、BUSINESS_RULES、API Master Specification v1.1、Phase 6 Functional Specification 或当前状态治理文件

## [0.7.8] - 2026-07-22

### Added

- 完成 Task 7.3 数据库物理映射的初始实施，新增 PostgreSQL 18.4 初始 Migration、Prisma Schema、Prisma Client 生成配置与空 Seed 骨架
- 新增 `warehouse_type` 五个 Frozen 枚举代码以及 DCR-001 `production_completion_status` 四个正式状态的 PostgreSQL 枚举映射
- 新增根目录 Prisma 格式、校验、Client 生成、Migration、状态和 Seed 命令

### Changed

- `packages/database` 新增 Prisma Client、PostgreSQL Driver Adapter 和 `pg` 开发依赖
- `.env.example` 新增无真实值的 `DATABASE_URL` 格式示例，`.gitignore` 忽略本地生成的 Prisma Client

### Verified

- PostgreSQL 物理结构实测包含 60 张正式业务表、60 个主键、71 个业务唯一索引、283 个外键、90 个普通索引与 201 条 Check
- `ck_warehouses_manufacturer_required`、`ck_warehouses_country_required` 和 `ck_warehouses_available_stock_role` 已在初始 Migration SQL 中实现
- Prisma format、validate、generate、初始 Migration、空数据库重新 Migration、空 Seed 和 Prisma Client 连接均通过

### Scope

- 本次只实现 Frozen Database Logical Design v1.1 的物理映射，未新增、删除或重命名任何表、字段、关系、状态或业务对象
- Seed 为空执行骨架，未导入业务数据；未实现 Route Handler、API、JWT、RBAC、Repository、Service 或 ERP 业务逻辑
- 未修改 Frozen 数据库、业务、API 或 Phase 6 文档，315 个正式 API 保持不变

## [0.7.7] - 2026-07-22

### Added

- 新增 Frozen `DATABASE_ENUM_SPEC.md` v1.0，正式定义 `warehouse_type` 的 `company`、`manufacturer`、`overseas`、`transit` 和 `pending` 五个英文代码
- 新增 DEC-062，记录仓库类型预留枚举补全及物理映射输入决定

### Changed

- `TASK_3_5_5_CHECK_CONSTRAINT_STANDARD.md` 将后续正式枚举集合的预留说明指向 `DATABASE_ENUM_SPEC.md`
- `DOCUMENT_PRIORITY.md` 将 `DATABASE_ENUM_SPEC.md` 纳入数据库物理映射正式输入

### Scope

- 本次只补全 Frozen 设计已预留的枚举代码，不修改原有三条仓库 Check 规则
- 未新增、删除或修改数据库表、字段、关系、API 或业务规则；正式 API 总数保持 315
- 未安装 PostgreSQL 或 Prisma，未创建 Schema、Migration、Seed 或任何工程代码

## [0.7.6] - 2026-07-22

### Added

- 新增 `docs/00-governance/CURRENT_STATUS.md`，建立当前 Phase 与 Task 状态的唯一入口
- 新增无外部依赖的 `scripts/check-project-status.mjs` 和根命令 `pnpm status:check`
- 新增 DEC-061，记录状态事实来源优先级与自动一致性检查决定

### Changed

- `PROJECT.md`、`ROADMAP.md` 和 `README.md` 使用统一的可检查状态摘要，README 不再重复展示全部历史阶段状态
- `API_SPEC.md` 移除 Phase 6 与 Phase 7 当前进度附注，只保留 API Master Specification v1.1 状态和 315 个正式 API
- `AGENTS.md` 要求每次任务开始前运行 `pnpm status:check`，并明确检查失败时必须停止
- `pnpm check` 将 `status:check` 作为第一道质量门禁
- `DECISION_LOG.md` 只记录治理决定，`CHANGELOG.md` 只记录变化，二者不作为当前状态判断依据

### Scope

- 未修改业务规则、数据库逻辑设计、Phase 6 Frozen 内容或任何 API 定义、编号、请求、响应、权限、错误码与规则
- 正式 API 总数保持 315，未实现 Prisma、PostgreSQL、真实 API、认证或 ERP 业务代码

## [0.7.5] - 2026-07-22

### Changed

- Task 7.2 Monorepo 工程骨架与质量门禁已通过 GitHub 技术验收并获得项目负责人批准，状态更新为 Completed / Approved
- Task 7.3 数据持久化与后端公共基础正式启动，状态更新为 In Progress
- 当前正式任务更新为 Task 7.3，当前下一步更新为 Task 7.3（正式任务）
- 新增 DEC-060，记录 Task 7.2 批准与 Task 7.3 启动决定

### Scope

- Phase 7 保持 In Progress；Task 7.4 至 Task 7.6 与 Phase 7 Final Consistency Review 保持 Waiting / Not Started
- 本次仅同步正式 Phase 与 Task 状态，不记录 Task 7.3 内部执行 Section
- 未修改 BUSINESS_RULES、Database Logical Design v1.1、API Master Specification v1.1、Phase 6 或 Phase 7 开发基线
- 未修改工程代码或依赖，未实现任何业务、数据库或 API 内容

## [0.7.4] - 2026-07-22

### Added

- 完成 Task 7.2-C Quality Gates & Engineering Closure
- 新增 ESLint、Prettier 和 Vitest 基础配置，统一覆盖根项目、双端应用和三个共享包
- 新增三个共享包空占位导入测试及根 Workspace 工程清单测试

### Changed

- 根目录新增 `lint`、`lint:fix`、`format`、`format:check`、`test` 和 `check` 脚本
- `check` 按 `format:check`、`lint`、`typecheck`、`test`、`build` 顺序执行
- 三个共享包新增独立 `test` 脚本
- 质量工具锁定为 ESLint 9.39.5、Prettier 3.9.6、TypeScript ESLint 8.65.0、Vitest 0.34.6 和 Vite 4.5.14，保持现有 Node、Next.js、Taro 与 TypeScript 兼容

### Verified

- `pnpm install --lockfile=false` 成功，`pnpm peers check` 无 peer dependency 问题
- `pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build` 和 `pnpm check` 全部通过
- 三个共享包均可独立构建、类型检查和测试；根 Workspace 工程测试 7 项通过
- PC 管理端开发服务器启动成功并返回 HTTP 200，微信小程序完成编译并进入 watch 状态

### Closure

- Task 7.2-A、Task 7.2-B 和 Task 7.2-C 已完成，Task 7.2 已达到待 GitHub 技术验收条件
- Task 7.2 保持 In Progress；下一步仍需 ChatGPT 技术验收及项目负责人批准
- 未经 Task 7.2 验收和项目负责人批准，不得启动 Task 7.3
- 未实现业务、数据库、API、认证或权限功能，未修改任何 Approved / Frozen 文档

## [0.7.3] - 2026-07-22

### Added

- 完成 Task 7.2-B Shared Packages & Unified Engineering Configuration
- 新增 `packages/api`、`packages/database` 和 `packages/shared` 最小 TypeScript 包骨架
- 新增根目录 TypeScript 基础配置和无真实值的技术环境变量示例

### Changed

- 三个共享包统一采用 `@violin-erp/*` 命名、`0.0.0` 版本、私有 ESM、exports 和 TypeScript 配置
- PC 管理端与微信小程序继承统一 TypeScript 基础配置，同时保留各自框架配置
- 根目录新增统一 `dev`、`build` 和 `typecheck` 脚本
- `.gitignore` 增加 TypeScript 构建缓存忽略规则

### Verified

- `pnpm install --lockfile=false` 成功，Workspace 正确识别根项目、两个应用和三个共享包，共 6 个项目
- `pnpm build` 成功，三个共享包、PC 管理端和微信小程序均构建通过
- `pnpm typecheck` 成功，三个共享包同时及逐包类型检查均通过
- PC 管理端开发服务器启动成功并返回 HTTP 200，微信小程序编译成功并进入 watch 状态

### Scope

- 三个共享包仅保留未来 Frozen API、Frozen 数据库物理映射及无业务事实共享工具的空占位
- 当前无包间代码依赖，因此未建立不必要的 TypeScript project references
- 未安装或配置 Prisma、PostgreSQL、Route Handler、JWT、RBAC、Tailwind CSS、shadcn/ui、ESLint、Prettier、测试框架或 Docker
- 未实现真实 API、Schema、Migration、Seed、登录、业务页面或 ERP 业务代码
- 未修改任何 Approved / Frozen 业务、数据库、API、项目治理或开发基线文档

## [0.7.2] - 2026-07-22

### Added

- 完成 Task 7.2-A Workspace & Dual App Skeleton，建立 pnpm Monorepo 工作区
- 新增 `apps/admin` Next.js、React、TypeScript 最小可启动工程骨架
- 新增 `apps/miniapp` Taro、React、TypeScript 微信小程序最小可启动工程骨架
- 保留空 `packages` 目录，不创建任何共享 package

### Verified

- `pnpm install` 成功，workspace 正确识别根项目、`apps/admin` 和 `apps/miniapp`
- PC 管理端开发服务器启动成功，本地请求返回 HTTP 200
- 微信小程序完成 Taro 微信端编译并进入 watch 状态，非 watch 构建同时通过

### Scope

- Task 7.2-A 仅作为 Task 7.2 内部执行 Section，Task 7.2 保持 In Progress
- 未修改 `PROJECT.md`、`README.md`、`ROADMAP.md` 或 `DECISION_LOG.md`
- 未创建 `packages/api`、`packages/database` 或 `packages/shared`
- 未配置 Prisma、PostgreSQL、Route Handler、JWT、RBAC、Tailwind CSS、shadcn/ui、ESLint、Prettier、Docker、测试框架、Husky 或 Commit Hooks
- 未实现登录、业务页面、API、Schema、Migration、Seed 或 ERP 业务代码

## [0.7.1] - 2026-07-22

### Changed

- Task 7.1 开发基线与工程初始化已通过 GitHub 验收并更新为 Completed / Approved
- Task 7.2 Monorepo 工程骨架与质量门禁正式启动并更新为 In Progress
- 当前正式任务更新为 Task 7.2；当前内部执行下一步为 Task 7.2-A
- Task 7.2-A、Task 7.2-B 和 Task 7.2-C 仅作为 Task 7.2 内部执行 Section，不属于正式项目治理状态
- 新增 DEC-059，记录 Task 7.1 批准、Task 7.2 启动和 Section 边界

### Scope

- Phase 7 保持 In Progress；Task 7.3 至 Task 7.6 与 Phase 7 Final Consistency Review 保持 Waiting / Not Started
- 未修改 Task 7.1 开发基线正文、BUSINESS_RULES、Database Logical Design v1.1、API Master Specification v1.1 或 Phase 6 Functional Specification
- 正式 API 总数保持 315，未新增、删除、重编号或改义任何 API
- 未新增数据库表、字段、关系、状态、业务对象或业务流程
- 未创建任何工程代码、Schema、Migration、Seed 或实现文件，未安装任何依赖

## [0.7.0] - 2026-07-22

### Added

- 新增 Task 7.1 开发基线与工程初始化，确认技术架构、技术栈、Monorepo 目录、工程规范、开发顺序和职责边界
- 新增 DEC-058，记录项目负责人正式启动 Phase 7、Phase 7 内部结构及三方职责边界

### Changed

- Phase 7 状态由 Waiting / Not Started 更新为 In Progress
- Task 7.1 状态更新为 In Progress，当前任务更新为 Task 7.1 开发基线与工程初始化
- 技术基线确认为 Next.js、React、TypeScript、Taro、Next.js Route Handler、Prisma、PostgreSQL、Tailwind CSS、shadcn/ui、JWT、RBAC 与 Monorepo
- Phase 7 采用“6 个 Task + 独立 Final Consistency Review”结构
- 技术开发仅进入开发规范阶段，业务编码尚未开始；当前下一步为 Task 7.1 GitHub 验收

### Scope

- Phase 6 保持 Completed / Approved / Frozen
- BUSINESS_RULES、Database Logical Design v1.1、API Master Specification v1.1 和 Phase 6 Functional Specification 均未修改
- 正式 API 总数保持 315，未新增、删除、重编号或改义任何 API
- 未新增数据库表、字段、关系、状态、业务对象或业务流程
- 未创建源代码、真实 API Route、Prisma Schema、Migration、Seed 或工程目录，未安装依赖，未提前执行 Task 7.2

## [0.6.6] - 2026-07-22

### Changed

- Phase 6 Final Consistency Review 已通过 GitHub 验收并更新为 Completed / Approved
- Phase 6 功能详细设计正式更新为 Completed / Approved / Frozen
- Task 6.1、Task 6.2、Task 6.3 保持 Completed / Approved，并成为后续技术阶段的正式产品输入
- 当前下一步更新为 Phase 7 规划与启动准备；Phase 7 保持 Waiting / Not Started
- 新增 DEC-057，记录 Phase 6 Phase Exit Gate 与 Freeze Gate 全部通过及正式冻结决定

### Freeze

- API Master Specification v1.1 保持 Completed / Approved / Frozen，是唯一正式 API 事实来源，正式接口总数保持 315
- Database Logical Design v1.1 保持 Frozen
- Phase 6 正式内容后续如需修改，必须通过 DCR 或正式 Change Request
- 禁止通过聊天记忆、代码实现或临时决定覆盖 Frozen 文档

### Scope

- 未修改 Phase 6 正文业务规则、Frozen 数据库、Frozen API 或 Approved 页面
- 未新增表、字段、关系、状态、页面、模块、接口或业务对象
- 未编写代码、创建真实页面或 API Route、安装依赖，未启动 Phase 7，未预先设计 Phase 7 Task 结构

## [0.6.5] - 2026-07-22

### Added

- 新增 Phase 6 Final Consistency Review，完成 Task 6.1 至 Task 6.3 与 Approved/Frozen 事实来源的最终一致性审查
- 新增 DEC-056，记录 API Change Request 001 正式批准、API Master Specification v1.1 冻结及 Phase 6 Final Consistency Review 完成

### Changed

- API Change Request 001 更新为 Completed / Approved
- API Master Specification v1.1 更新为 Completed / Approved / Frozen；`STC-*` 17 个、`SRT-*` 13 个、`DMG-*` 13 个接口正式生效，正式接口总数为 315
- Task 6.3 更新为 Completed / Approved
- Phase 6 Final Consistency Review 更新为 Completed / Pending Approval；Phase 6 保持 In Progress
- Phase 4 Approved 页面与 API 覆盖结论完成复核，库存盘点、销售退货和报损页面均有正式 API 支撑
- 当前下一步更新为 Phase 6 Final Consistency Review GitHub 验收；Phase 7 保持 Waiting / Not Started

### Scope

- Database Logical Design v1.1 保持 Frozen，未新增或修改表、字段、关系、状态或业务对象
- 除已通过 API Change Request 001 批准的 43 个接口外，本次未新增、删除、重编号或修改业务接口
- 未发现新的阻塞性冲突、Pending DCR、Pending Change Request 或 Outstanding Issue
- 未编写代码、创建真实页面或 API Route、安装依赖，未冻结 Phase 6，未启动 Phase 7

## [0.6.4] - 2026-07-22

### Added

- 新增 API Change Request 001，正式记录 Approved Task 4.9 的库存盘点、销售退货和报损页面缺少完整 API 覆盖的问题
- 完成库存盘点 `STC-*` 17 个、销售退货 `SRT-*` 13 个、报损 `DMG-*` 13 个候选接口设计，共新增 43 个
- 新增 DEC-055，记录 API 覆盖遗漏、数据库适配结论和审批阻塞状态

### Changed

- API Master Specification 更新为 v1.1、Completed / Pending Approval；候选接口总数由 272 更新为 315
- Task 5.4 删除盘点、销售退货和报损属于范围排除的错误口径，并补充三类接口目录和页面映射
- Phase 5 Final Consistency Review 修正“Approved 页面全部覆盖”的遗漏结论
- Task 6.2 补充三类页面的动作、状态、权限、库存事务及 API 映射
- Phase 6 Final Consistency Review 更新为 Waiting / Blocked by API CR Approval
- 当前下一步更新为 API Change Request 001 GitHub 验收

### Scope

- API Master Specification v1.0 与原 272 个接口仍是最后批准的 Frozen 基线；v1.1 与 315 个候选接口尚未批准或重新冻结
- 三类 Approved 页面完整保留；盘点完成不修改库存，销售退货和报损仅由正式确认动作形成库存变化及只追加流水
- Frozen Database Logical Design v1.1 可以支撑全部新增接口，未发起数据库 DCR，未新增表、字段、关系、状态或业务对象
- 未修改其他业务接口，未编写代码、创建真实 API Route、安装依赖，未启动 Phase 6 Final Consistency Review 或 Phase 7

## [0.6.3] - 2026-07-22

### Added

- 新增 Task 6.3 公共能力功能详细设计，统一登录与会话、用户角色权限、Excel 导入、附件、导出、日志审计、系统设置、提醒、编号、数据字典、打印、国际化、系统时间及统一交互原则
- 建立 15 项公共能力的页面、Frozen API、权限、数据范围、审计和失败处理覆盖矩阵
- 新增 DEC-054，记录 Task 6.2 正式批准及 Task 6.3 按 Approved/Frozen 口径完成

### Changed

- Task 6.2 状态更新为 Completed / Approved
- Task 6.3 状态更新为 Completed / Pending Approval
- PC 管理端与微信小程序统一映射现有系统用户身份、角色、权限、数据范围和字段权限
- 微信小程序首次授权绑定已有启用系统账号，不建立独立微信用户体系
- 当前下一步更新为 Task 6.3 GitHub 验收；Phase 6 Final Consistency Review 保持 Waiting / Not Started

### Scope

- 无独立 Frozen API 的公共能力仅定义 Approved 产品规则或复用既有业务 API，未虚构接口编号、路径、参数或状态
- 未发起 DCR 或 Change Request
- Frozen 数据库和 API Master Specification v1.0 均未修改，正式接口总数保持 272
- 未新增 OpenID、UnionID、认证字段、业务模块、接口、状态、表、关系或业务对象
- 未编写代码、创建真实页面/API Route、指定技术框架或安装依赖，未启动 Phase 6 Final Consistency Review 或 Phase 7

## [0.6.2] - 2026-07-22

### Added

- 新增 Task 6.2 核心业务功能详细设计，完成基础资料、采购管理、生产与质量验收、库存管理、出入库与调拨、跨境业务六个核心模块的功能设计
- 建立六个模块的页面、动作、状态、权限与 Frozen API 映射，并完成核心业务覆盖矩阵
- 新增 DEC-053，记录 Task 6.1 正式批准及 Task 6.2 按 Frozen 口径完成

### Changed

- Task 6.1 状态更新为 Completed / Approved
- Task 6.2 状态更新为 Completed / Pending Approval
- 采购管理与生产管理保持平行，生产订单独立创建且不直接关联采购订单
- 采购来源与生产来源仅在质量验收节点汇合，两类验收来源互斥
- 当前下一步更新为 Task 6.2 GitHub 验收；Task 6.3 与 Phase 6 Final Consistency Review 保持 Waiting / Not Started

### Scope

- 前一版错误指令已在执行前被阻止，未修改文件、未提交且未进入 GitHub；本次不创建正式缺陷记录
- 未发起 DCR 或 Change Request
- Frozen 数据库和 API Master Specification v1.0 均未修改，正式接口总数保持 272
- 未新增业务模块、接口、数据库字段、表、关系、状态或业务对象
- 未编写代码、创建真实页面或 API、安装依赖，未启动 Task 6.3

## [0.6.1] - 2026-07-21

### Added

- 正式启动 Phase 6 功能详细设计
- 新增 Task 6.1 功能详细设计统一规范，定义 16 个强制模板章节
- Phase 6 采用 Task 6.1、Task 6.2、Task 6.3 加独立 Final Consistency Review 的加速结构
- 新增 DEC-052，记录 Phase 6 与 Task 6.1 正式启动及设计完成

### Changed

- Phase 6 状态更新为 In Progress
- Task 6.1 状态更新为 Completed / Pending Approval
- Task 6.2、Task 6.3 与 Phase 6 Final Consistency Review 保持 Waiting / Not Started
- 当前下一步更新为 Task 6.1 GitHub 验收

### Scope

- Phase 3 数据库与 API Master Specification v1.0 保持 Frozen
- 未修改 BUSINESS_RULES、DATABASE_SPEC、API 接口正文、Phase 4 页面或 Phase 5 Task 文档
- 未新增业务模块、数据库字段、表、关系、状态或 API
- 未指定最终技术框架或第三方库，未编写代码、创建真实页面或 API Route、安装依赖
- 未启动 Task 6.2，未创建 Task 6.2 正文

## [0.6.0] - 2026-07-21

### Changed

- Phase 5 Final Consistency Review 正式批准，状态更新为 Completed / Approved
- Phase 5 正式更新为 Completed / Approved / Frozen
- API Master Specification v1.0 正式冻结，作为 Phase 6 及后续阶段唯一 API 事实来源
- Phase 5 的 Phase Exit Gate 与 Freeze Gate 全部通过
- 当前下一步更新为等待项目负责人正式启动 Phase 6

### Freeze Result

- Task 5.1 至 Task 5.5 全部保持 Completed / Approved
- Phase 5 正式接口总数保持 272，不新增、删除、重编号或修改接口
- 无 Pending DCR、无 Pending Review、无 Outstanding Issue
- 后续修改 Phase 5 正式内容必须经过正式 DCR 或 Change Request

### Scope

- 未修改业务接口、URL、HTTP Method、状态机或错误码
- 未修改 Frozen 数据库、BUSINESS_RULES 或 Approved 页面
- 未创建真实 API，未编写代码，未安装依赖
- Phase 6 保持 Waiting / Not Started，未创建 Phase 6 正文

## [0.5.9] - 2026-07-21

### Added

- 新增 Phase 5 Final Consistency Review 独立审查文档
- 新增 DEC-050，记录 Task 5.5 正式批准及 Phase 5 Final Consistency Review 完成

### Changed

- Task 5.5 状态更新为 Completed / Approved
- 完成 272 个正式接口的数量、编号、路径、HTTP Method、状态、权限、安全、页面与 Frozen 映射复核
- 完成 10 项一致性修正：4 项 Phase 4 页面/API 文字映射、5 项 Task 5.1 至 Task 5.5 状态与下一步引用、1 项 API_SPEC 状态与审查入口同步
- PROJECT、README、ROADMAP、DECISION_LOG、DEVELOPMENT_WORKFLOW 和 API_SPEC 同步 Review 状态与下一步

### Review Result

- 未发现重复接口或重复编号；接口总数保持 272
- 未修正 URL、HTTP Method、状态机、权限或错误码
- 无 Pending DCR、无 Outstanding Issue、无内容性 Freeze 阻塞问题
- Phase 5 具备内容冻结条件，但 Review 仍等待 GitHub 验收及项目负责人最终批准

### Scope

- 未修改 Frozen 数据库，未新增字段、表、状态、关系、业务对象或业务接口
- 未创建真实 API，未编写代码，未安装依赖
- Phase 5 保持 In Progress，未标记为 Frozen
- Phase 6 保持 Waiting / Not Started

## [0.5.8] - 2026-07-21

### Added

- 完成 Task 5.5 导入、附件、日志、安全与 API 最终收口设计
- 定义 15 个导入接口、8 个附件接口、4 个日志接口和 5 个安全接口，共 32 个接口
- 覆盖导入任务、模板、校验、执行、重试、结果、历史和海外仓库存 Excel 导入
- 统一 Attachment API、六类日志查询与导出、身份认证、权限、Token、Session、重放、幂等、限流和 IP 白名单规则
- 新增 DEC-049 正式启动并完成 Task 5.5 设计
- DEVELOPMENT_WORKFLOW 增加 Phase Exit Gate 和 Freeze Gate

### Changed

- API_SPEC 升级为 API Master Specification，统一 Task 5.1 至 Task 5.5 的编号、Header、Request、Response、ErrorCode、Naming、Version、Permission、Log、Import、Attachment 和 Security
- Phase 5 正式接口总数更新为 272 个
- Task 5.5 状态由 Waiting 更新为 Completed / Pending Approval
- Phase 5 保持 In Progress，Task 5.1 至 Task 5.4 保持 Completed / Approved
- 当前下一步更新为 Task 5.5 GitHub 验收
- PROJECT、README、ROADMAP、API_SPEC、DECISION_LOG 和 DEVELOPMENT_WORKFLOW 同步当前状态

### Scope

- 未修改 Frozen 数据库，未新增字段、表、状态、关系或业务对象
- 未修改 Task 5.1、Task 5.2、Task 5.3 或 Task 5.4 正文
- 未创建真实 API Route，未编写业务代码，未安装依赖
- 未执行 Phase Final Consistency Review，未开始 Phase 6

### Status

- Phase 5 API Design: In Progress
- Task 5.1: Completed / Approved
- Task 5.2: Completed / Approved
- Task 5.3: Completed / Approved
- Task 5.4: Completed / Approved
- Task 5.5: Completed / Pending Approval
- Current Next Step: Task 5.5 GitHub 验收
- Technical Development: Not Started

## [0.5.7] - 2026-07-21

### Added

- 新增 DEC-048，正式批准 Task 5.4 并关闭三项跨境业务口径冲突

### Changed

- Task 4.10 删除独立物流状态、海外收货状态、差异处理状态及其筛选，跨境发货只保留 `status`、`approval_status`、`shipment_status`
- Task 4.10 删除手工海外收货入口、手工海外收货操作及历史余额快照；海外仓库存唯一正式来源调整为 Task 5.5 Excel 导入结果
- Task 5.4 第 32 章由等待决定更新为项目负责人已决定，三项冲突全部关闭且不发起 DCR
- Task 5.4 状态由 Completed / Pending Approval 更新为 Completed / Approved
- Phase 5 保持 In Progress，Task 5.5 保持 Waiting
- 当前下一步更新为等待项目负责人正式启动 Task 5.5
- PROJECT、README、ROADMAP、API_SPEC、DECISION_LOG 和 DEVELOPMENT_WORKFLOW 同步当前状态

### Scope

- 未修改 Frozen 数据库，未新增字段、表、状态、关系、约束、索引或业务对象
- 未修改 Task 5.1、Task 5.2、Task 5.3 或 Task 5.5 正文
- 未创建真实 API Route，未编写代码，未创建 ORM、Schema、DDL、Migration 或 Seed
- 未开始 Task 5.5、Phase 6 或技术开发

### Status

- Phase 5 API Design: In Progress
- Task 5.1: Completed / Approved
- Task 5.2: Completed / Approved
- Task 5.3: Completed / Approved
- Task 5.4: Completed / Approved
- Task 5.5: Waiting
- Technical Development: Not Started

## [0.5.6] - 2026-07-21

### Added

- 完成 Task 5.4 出入库与跨境业务 API 设计文档
- 定义入库、普通出库、采购退货实际出库、调拨、跨境发运、海外仓当前库存及导入结果查询契约
- 建立入库、出库、调拨和跨境状态矩阵、原子库存事务、权限、幂等、并发、错误码、日志、脱敏及页面映射规则
- 新增 DEC-047 正式启动 Task 5.4 并提交 GitHub 验收

### Changed

- Task 5.4 状态由 Waiting 更新为 Completed / Pending Approval
- Phase 5 保持 In Progress，Task 5.5 保持 Waiting
- 当前下一步更新为 Task 5.4 GitHub 验收
- PROJECT、README、ROADMAP、API_SPEC、DECISION_LOG 和 DEVELOPMENT_WORKFLOW 同步当前状态

### Design

- 共定义 72 个正式接口：入库 18 个、出库 17 个、调拨 15 个、跨境 22 个
- 所有库存变化必须原子更新余额、追加流水并同步来源和状态
- 调拨与跨境发运必须经过正式在途仓；海外仓导入写接口留待 Task 5.5
- 采购退货实际出库直接执行既有采购退货对象，不重复创建普通出库单
- 跨境多维状态缺少独立字段、海外历史余额快照缺少正式对象、手工海外收货与 Excel 唯一来源口径冲突已登记并停止冲突部分

### Scope

- 未修改 Frozen BUSINESS_RULES、DATABASE_SPEC、Phase 3 正文或 Approved Phase 4 页面正文
- 未修改 Task 5.1、Task 5.2、Task 5.3 或 Task 5.5 正文
- 未新增字段、表、状态、关系、约束、索引或业务对象
- 未创建真实 API Route，未编写代码，未创建 ORM、Schema、DDL、Migration 或 Seed
- 未开始 Task 5.5、Phase 6 或技术开发

### Status

- Phase 5 API Design: In Progress
- Task 5.1: Completed / Approved
- Task 5.2: Completed / Approved
- Task 5.3: Completed / Approved
- Task 5.4: Completed / Pending Approval
- Task 5.5: Waiting
- Technical Development: Not Started

## [0.5.5] - 2026-07-21

### Added

- 正式批准唯一 Database Change Request：DCR-001
- 为既有 `production_completion_records.completion_status` 定义 Draft、Confirmed、Revoked、Voided 四个正式状态及状态机
- 补充 4 个分批完工写接口，Task 5.3 正式接口总数更新为 65 个
- 新增 DEC-046 批准 DCR-001 并批准 Task 5.3

### Changed

- Database Logical Design 由 v1.0 更新为 v1.1，唯一变化为既有 `completion_status` 的正式状态定义
- Task 4.7 增加分批完工的提交确认、撤销和作废按钮，并删除生产验收的来源完工批次页面口径
- 生产验收保持生产订单来源，不建立验收到完工记录关系
- 验收 API 统一采用“验收数量＝合格数量＋不合格数量”，删除待处理数量输入输出；既有 Frozen 字段固定为零
- Task 5.3 状态由 Completed / Pending Approval 更新为 Completed / Approved
- Phase 5 保持 In Progress；Task 5.4 和 Task 5.5 保持 Waiting

### Scope

- 未新增或删除字段、表、索引、外键、关系或业务对象，数据库逻辑结构保持不变
- 未修改采购 API、Task 5.1、Task 5.2 或 Task 5.4 正文
- 未创建真实 API Route，未编写代码，未创建 ORM、Schema、DDL、Migration 或 Seed
- 未开始 Task 5.4、Phase 6 或技术开发

### Status

- Database Logical Design: v1.1 / Frozen
- Phase 5 API Design: In Progress
- Task 5.3: Completed / Approved
- Task 5.4: Waiting
- Task 5.5: Waiting
- Technical Development: Not Started

## [0.5.4] - 2026-07-21

### Added

- 完成 Task 5.3 生产、质量验收与库存 API 设计文档
- 定义生产订单、生产进度、生产付款、质量验收、库存查询、库存流水、库存预警和库存调整接口契约
- 建立生产、验收和库存调整状态转换矩阵、仓库权限矩阵、数量一致性、幂等、并发、错误码、日志、脱敏及页面映射规则
- 新增正式启动 Task 5.3 并提交 GitHub 验收的决策记录

### Changed

- Task 5.3 状态由 Waiting 更新为 Completed / Pending Approval
- Phase 5 状态保持 In Progress
- Task 5.4 和 Task 5.5 状态保持 Waiting
- 当前下一步更新为 Task 5.3 GitHub 验收
- PROJECT、README、ROADMAP、API_SPEC、DECISION_LOG 和 DEVELOPMENT_WORKFLOW 同步当前状态

### Design

- 共定义 61 个正式接口，其中生产 25 个、质量验收 10 个、库存 26 个
- 生产订单与采购订单保持平行，生产单不保存统一目标仓库
- 验收确认只形成后续入库资格，不直接修改库存
- 库存调整执行必须在同一事务内完成来源校验、余额条件更新、流水追加、状态历史和审计日志
- 分批完工写动作因 `completion_status` 缺少正式状态机停止设计
- 验收单直接关联分批完工记录因 Frozen 关系缺失停止设计
- 验收待处理数量因主表缺少对应总量且与 Frozen 主表平衡约束冲突，相关写入分支停止设计

### Scope

- 未发起或执行 DCR，三项映射缺口等待项目负责人决定
- 未修改 Frozen 数据库、Approved 页面或 Task 5.1、Task 5.2 正文
- 未新增字段、表、状态、关系、索引或业务对象
- 未创建真实 API Route，未编写业务代码，未创建 ORM、Schema、DDL、Migration 或 Seed
- 未开始 Task 5.4、Phase 6 或技术开发

### Status

- Phase 5 API Design: In Progress
- Task 5.1: Completed / Approved
- Task 5.2: Completed / Approved
- Task 5.3: Completed / Pending Approval
- Task 5.4: Waiting
- Task 5.5: Waiting
- Technical Development: Not Started

## [0.5.3] - 2026-07-21

### Changed

- 按项目负责人正式决定修正 Task 4.5 计量单位页面口径：取消独立维护页面及新增、编辑、启用、停用、删除能力，改为产品和 SKU 表单中的固定受控值选择
- 修正 Task 4.6 采购页面口径：删除采购类型和独立采购负责人字段、列表列及筛选，责任改由创建、提交、审核与审计记录追溯
- 将到货操作修正为创建采购验收单和查看到货进度，不建立独立到货登记对象
- 删除采购厂家筛选、生产任务直达、已生产数量，以及采购关闭按钮、状态和筛选
- Task 5.2 第 26 节由待决冲突更新为项目负责人已决定并全部关闭
- Task 5.2 状态由 Completed / Pending Approval 更新为 Completed / Approved
- PROJECT、README、ROADMAP、API_SPEC、DECISION_LOG 和 DEVELOPMENT_WORKFLOW 同步当前状态与下一步

### Design

- 采购订单保留草稿、待审核、已审核、已驳回、已完成、已取消和已作废七个正式状态，已完成由系统按业务完成条件判定
- 不发起 Database Change Request，不修改 Database Logical Design v1.0
- 接口数量经逐项复核为 72 个基础资料通用接口、2 个客户快照只读接口和 29 个采购接口，合计仍为 103 个
- 原冲突能力从未计入正式接口目录，因此修正后接口总数不变

### Scope

- 仅修改 Task 4.5、Task 4.6、Task 5.2 及相关治理与规格文档
- 未新增数据库字段、表、状态、关系或业务对象
- 未创建真实 API Route，未编写业务代码，未创建 ORM、DDL、Schema、Migration 或 Seed
- 未开始 Task 5.3、Phase 6 或技术开发

### Status

- Phase 5 API Design: In Progress
- Task 5.1: Completed / Approved
- Task 5.2: Completed / Approved
- Task 5.3: Waiting
- Task 5.4: Waiting
- Task 5.5: Waiting
- Current Next Step: 等待项目负责人确认启动 Task 5.3
- Technical Development: Not Started

## [0.5.2] - 2026-07-21

### Added

- 完成 Task 5.2 基础资料与采购管理 API 设计文档
- 定义产品、SKU、分类、品牌、供应商、生产厂家、仓库、电商平台、店铺和客户快照接口
- 定义采购订单、采购付款、采购退货、进度、关联验收、关联入库、状态历史和导出接口
- 新增采购状态转换、权限数据范围、校验、幂等、并发、错误码、日志、脱敏及页面映射规则
- 新增批准 Task 5.1 并完成 Task 5.2 设计的正式决策

### Changed

- Task 5.1 状态由 Completed / Pending Approval 更新为 Completed / Approved
- Task 5.2 状态由 Waiting 更新为 Completed / Pending Approval
- Phase 5 状态保持 In Progress
- Task 5.3 至 Task 5.5 状态保持 Waiting
- 当前下一步更新为 Task 5.2 GitHub 验收
- PROJECT、README、ROADMAP、API_SPEC、DECISION_LOG 和 DEVELOPMENT_WORKFLOW 同步更新当前状态

### Design

- 共定义 103 个接口契约，其中基础资料 74 个、采购管理 29 个
- 采购单提交、撤回、审核、驳回、反审核、取消和作废均使用专用动作接口
- 反审核仅在未形成库存流水或任何下游关联记录时允许
- 采购进度只从采购明细、验收、入库、付款和退货正式记录汇总，客户端不得上传进度
- 停止设计无法映射 Frozen 数据库的计量单位维护、采购类型/负责人、独立到货登记、采购厂家关系和关闭状态接口
- 冲突项等待项目负责人选择调整接口/页面口径或发起正式 DCR/Change Request

### Scope

- 本次仅完成接口契约和治理文档
- 未创建真实 API Route，未编写业务代码
- 未修改 Frozen 数据库设计或 Approved 页面设计
- 未新增数据库字段、表、状态、唯一约束、索引、关系或业务对象
- 未开始 Task 5.3、Phase 6 或技术开发

### Status

- Phase 5 API Design: In Progress
- Task 5.1: Completed / Approved
- Task 5.2: Completed / Pending Approval
- Task 5.3: Waiting
- Task 5.4: Waiting
- Task 5.5: Waiting
- Technical Development: Not Started

## [0.5.1] - 2026-07-20

### Added

- 完成 Task 5.1 API 总体规范与安全规则设计文档
- 新增 API 版本、资源命名、HTTP、请求响应、分页筛选和接口模板规范
- 新增身份认证、权限、状态、校验、幂等、并发、错误码、日志、脱敏、附件和安全规则
- 新增正式启动 Phase 5 并提交 Task 5.1 验收的决策记录

### Changed

- Phase 5 状态由 Waiting / Not Started 更新为 In Progress
- Task 5.1 状态由 Waiting 更新为 Completed / Pending Approval
- Task 5.2 至 Task 5.5 状态保持 Waiting
- PROJECT、README、ROADMAP、API_SPEC、DECISION_LOG 和 DEVELOPMENT_WORKFLOW 同步更新当前状态
- 当前下一步更新为 Task 5.1 GitHub 验收

### Scope

- 本次仅完成 API 总体规范和通用安全契约设计
- 未创建真实 API Route，未编写业务代码
- 未修改 Frozen 数据库设计或 Approved 页面设计
- 未新增数据库字段、表、状态、索引、关联关系或业务对象
- 未开始 Task 5.2、Phase 6 或技术开发

### Status

- Phase 4: Completed / Approved
- Phase 5 API Design: In Progress
- Task 5.1: Completed / Pending Approval
- Task 5.2: Waiting
- Task 5.3: Waiting
- Task 5.4: Waiting
- Task 5.5: Waiting
- Technical Development: Not Started

## [0.5.0] - 2026-07-20

### Added

- 新增 Phase 5 文档目录及 Task 5.1 至 Task 5.5 占位文档
- 新增 Phase 5 内部任务清单及文档入口
- 新增 Phase 5 文档结构初始化正式决策

### Changed

- Task 5.1 至 Task 5.5 状态登记为 Waiting
- Phase 5 状态保持 Waiting / Not Started
- PROJECT、ROADMAP、README 和 DECISION_LOG 同步登记 Phase 5 初始化状态

### Scope

- 本次仅完成 Phase 5 文档初始化，不包含任何 API 正文
- 未修改 Frozen 数据库设计或 Approved 页面设计
- 未新增数据库字段、表或业务对象
- 未开始技术开发

### Status

- Phase 4: Completed / Approved
- Phase 5 API Design: Waiting / Not Started
- Task 5.1: Waiting
- Task 5.2: Waiting
- Task 5.3: Waiting
- Task 5.4: Waiting
- Task 5.5: Waiting
- Technical Development: Not Started

## [0.4.9] - 2026-07-20

### Added

- 新增 Task 4.10 跨境业务页面设计文档
- 新增跨境发货、发运确认、海外收货、海外数据导入和明细匹配页面设计
- 新增跨境执行跟踪、海外仓库存入口、页面组件、状态、权限和异常处理规则
- 新增批准 Task 4.10 并完成 Phase 4 的正式决策

### Changed

- Task 4.10 状态更新为 Completed / Approved
- Phase 4 状态更新为 Completed / Approved，未标记为 Frozen
- 下一阶段更新为 Phase 5 接口设计
- Phase 5 状态保持 Waiting / Not Started
- 项目进度、文档入口、路线状态和开发流程同步更新

### Design

- 跨境发货严格经过来源仓、在途仓和目的海外仓
- 发运与海外收货分别形成正式库存流水和库存余额变化
- 海外实收、差异和发货导入匹配均按明细记录
- 导入任务、导入明细和匹配记录严格复用 Frozen 正式对象
- 海外正式库存继续以 `inventories` 为唯一余额来源
- 本次未新增跨境订单、物流轨迹、海外库存余额表或平行数据源

### Status

- Phase 4: Completed / Approved
- Task 4.1: Completed / Approved
- Task 4.2: Completed / Approved
- Task 4.3: Completed / Approved
- Task 4.4: Completed / Approved
- Task 4.5: Completed / Approved
- Task 4.6: Completed / Approved
- Task 4.7: Completed / Approved
- Task 4.8: Completed / Approved
- Task 4.9: Completed / Approved
- Task 4.10: Completed / Approved
- Phase 5 API Design: Waiting / Not Started
- Technical Development: Not Started

## [0.4.8] - 2026-07-20

### Added

- 新增 Task 4.9 出入库管理页面设计文档
- 新增入库、出库、调拨、盘点、库存调整、销售退货和报损页面设计
- 新增统一单据详情、页面组件、状态、权限、跳转及异常处理规则
- 新增批准 Task 4.9 出入库管理页面设计的正式决策

### Changed

- Task 4.9 状态更新为 Completed / Approved
- 下一任务更新为 Task 4.10 跨境业务页面设计
- Task 4.10 状态保持 Not Started
- 项目进度、文档入口和开发流程同步更新

### Design

- 入库、出库及各类库存作业严格映射 Frozen 正式对象、字段和状态
- 保存草稿、提交审核和查看详情均不得直接修改库存
- 调拨必须经过在途仓，盘点只确认差异，库存调整完成后才修改正式库存
- 销售退货必须关联原销售出库单，报损不得由普通其他出库替代
- 库存流水只追加、不可修改、不可删除并保留来源追溯
- 本次未新增数据库字段、表、出入库类型或平行业务对象

### Status

- Phase 4: In Progress
- Task 4.1: Completed / Approved
- Task 4.2: Completed / Approved
- Task 4.3: Completed / Approved
- Task 4.4: Completed / Approved
- Task 4.5: Completed / Approved
- Task 4.6: Completed / Approved
- Task 4.7: Completed / Approved
- Task 4.8: Completed / Approved
- Task 4.9: Completed / Approved
- Task 4.10: Not Started
- Technical Development: Not Started

## [0.4.7] - 2026-07-20

### Added

- 新增 Task 4.8 库存管理页面设计文档
- 新增当前库存、分仓库存、厂家仓、在途仓和海外仓库存视图设计
- 新增 SKU 库存详情、库存流水和库存预警页面设计
- 新增批准 Task 4.8 库存管理页面设计的正式决策

### Changed

- Task 4.8 状态更新为 Completed / Approved
- 下一任务更新为 Task 4.9 出入库管理页面设计
- Task 4.9 状态保持 Not Started
- 项目进度、文档入口和开发流程同步更新

### Design

- `inventories` 保持 SKU 与仓库粒度的唯一库存余额来源
- 在途库存通过在途类型仓库表达，不设置独立在途数量字段
- 公司仓、厂家仓、在途仓和海外仓仅作为统一库存筛选视图
- 库存流水严格映射 `inventory_transactions`，只追加且不可编辑或删除
- 库存页面及预警处置均不得直接修改库存
- 调拨、盘点和库存调整执行归属 Task 4.9
- 海外库存导入归属 Task 4.10
- 本次未新增数据库字段、表或平行库存数据源

### Status

- Phase 4: In Progress
- Task 4.1: Completed / Approved
- Task 4.2: Completed / Approved
- Task 4.3: Completed / Approved
- Task 4.4: Completed / Approved
- Task 4.5: Completed / Approved
- Task 4.6: Completed / Approved
- Task 4.7: Completed / Approved
- Task 4.8: Completed / Approved
- Task 4.9: Not Started
- Technical Development: Not Started

## [0.4.6] - 2026-07-20

### Added

- 新增 Task 4.7 生产管理页面设计文档
- 新增委外生产单、生产进度、分批完工、生产验收和执行跟踪页面设计
- 新增生产付款关联展示、跨境验收人员及生产页面权限规则
- 新增批准 Task 4.7 生产管理页面设计的正式决策

### Changed

- Task 4.7 状态更新为 Completed / Approved
- 下一任务更新为 Task 4.8 库存管理页面设计
- Task 4.8 状态保持 Not Started
- 项目进度、文档入口和开发流程同步更新

### Design

- 委外生产单不保存目标仓库，目标仓库只映射分批完工记录
- 不建立独立生产异常表、字段、业务对象、页面或权限
- 特殊情况通过 Frozen 生产进度状态、进度说明和现有附件能力表达
- 生产进度与完工验收严格使用 Frozen 状态集合
- 生产单、进度、分批完工及验收均不得直接增加库存
- 验收合格数量只形成入库依据，实际入库通过出入库管理完成
- 本次不发起 Database Change Request，不修改数据库逻辑或九阶段路线

### Status

- Phase 4: In Progress
- Task 4.1: Completed / Approved
- Task 4.2: Completed / Approved
- Task 4.3: Completed / Approved
- Task 4.4: Completed / Approved
- Task 4.5: Completed / Approved
- Task 4.6: Completed / Approved
- Task 4.7: Completed / Approved
- Task 4.8: Not Started
- Technical Development: Not Started

## [0.4.5] - 2026-07-20

### Added

- 新增 Task 4.6 采购管理页面设计文档
- 新增采购订单列表、新增、编辑、详情及采购执行跟踪页面设计
- 新增采购验收、采购退货和采购付款辅助记录页面设计
- 新增采购管理页面组件、状态、权限、跳转与异常处理规则
- 新增批准 Task 4.6 采购管理页面设计的正式决策

### Changed

- Task 4.6 状态更新为 Completed / Approved
- 下一任务更新为 Task 4.7 生产管理页面设计
- Task 4.7 状态保持 Not Started
- 项目进度、文档入口和开发流程同步更新

### Design

- 采购订单和采购验收均不得直接增加库存
- 验收确认只形成正式入库依据，实际入库通过出入库管理完成
- 采购执行数量与金额均由合法关联记录汇总，不允许直接编辑
- 采购退货的库存减少必须通过正式退货出库完成
- 采购付款仅作为付款辅助记录，不替代财务、应付或银行对账能力
- 页面按功能权限、金额权限和数据权限动态显示
- 本次未修改 Task 4.1 至 Task 4.5、Frozen 业务规则、数据库逻辑或九阶段路线

### Status

- Phase 4: In Progress
- Task 4.1: Completed / Approved
- Task 4.2: Completed / Approved
- Task 4.3: Completed / Approved
- Task 4.4: Completed / Approved
- Task 4.5: Completed / Approved
- Task 4.6: Completed / Approved
- Task 4.7: Not Started
- Technical Development: Not Started

## [0.4.4] - 2026-07-20

### Added

- 新增 Task 4.5 基础资料模块页面设计文档
- 新增产品、SKU、产品分类、品牌、计量单位和供应商页面设计
- 新增仓库、销售平台、店铺和客户资料页面设计
- 新增基础资料页面组件、状态、权限、跳转、空状态、加载和异常规则
- 新增批准 Task 4.5 基础资料模块页面设计的正式决策

### Changed

- Task 4.5 状态更新为 Completed / Approved
- 下一任务更新为 Task 4.6 采购管理页面设计
- Task 4.6 状态保持 Not Started
- 项目进度、文档入口和开发流程同步更新

### Design

- 产品与 SKU 分别采用列表、详情、新增和编辑页面
- 基础资料被业务引用后不得物理删除，只能按规则停用
- 仓库采用统一页面和数据源，并保持不同仓库类型语义
- 计量单位复用受控字典能力，不新增独立表或平行数据源
- 客户资料仅查询销售出库客户快照，不建立独立客户主数据
- 基础资料按功能、仓库、店铺及厂家范围动态展示
- 本次未修改 Task 4.1 至 Task 4.4、Frozen 业务规则、数据库逻辑或九阶段路线

### Status

- Phase 4: In Progress
- Task 4.1: Completed / Approved
- Task 4.2: Completed / Approved
- Task 4.3: Completed / Approved
- Task 4.4: Completed / Approved
- Task 4.5: Completed / Approved
- Task 4.6: Not Started
- Technical Development: Not Started

## [0.4.3] - 2026-07-20

### Added

- 新增 Task 4.4 首页 Dashboard 页面设计文档
- 新增待我处理、KPI、图表、最近业务动态和快捷入口设计
- 新增 Dashboard 权限、跳转、加载、空状态和异常状态设计
- 新增批准 Task 4.4 首页 Dashboard 页面设计的正式决策

### Changed

- Task 4.4 状态更新为 Completed / Approved
- 下一任务更新为 Task 4.5 基础资料模块页面设计
- Task 4.5 状态保持 Not Started
- 项目进度、文档入口和开发流程同步更新

### Design

- Dashboard 作为用户登录后的默认首页
- 首页 Tab 固定且不可关闭
- Dashboard 只展示和跳转，不直接执行业务或修改库存
- 海外库存等导入数据必须显示数据日期
- Dashboard 支持局部加载与局部失败，单个区域失败不阻断整个页面
- Dashboard 内容根据功能权限和数据权限动态展示
- 本次未修改 Task 4.1、Task 4.2、Task 4.3、Frozen 业务规则、数据库逻辑或九阶段路线

### Status

- Phase 4: In Progress
- Task 4.1: Completed / Approved
- Task 4.2: Completed / Approved
- Task 4.3: Completed / Approved
- Task 4.4: Completed / Approved
- Task 4.5: Not Started
- Technical Development: Not Started

## [0.4.2] - 2026-07-20

### Added

- 新增 Task 4.3 PC 管理端视觉规范设计文档
- 新增 PC 管理端色彩、字体、间距、圆角与阴影视觉规范
- 新增 Header、Sidebar、Tab、按钮、表单、表格与状态标签规范
- 新增卡片、弹窗、抽屉、图标、反馈、加载、空状态及无障碍规范
- 新增批准 Task 4.3 PC 管理端视觉规范设计的正式决策

### Changed

- Task 4.3 状态更新为 Completed / Approved
- 下一任务更新为 Task 4.4 首页 Dashboard 页面设计
- Task 4.4 状态保持 Not Started
- 项目进度、文档入口和开发流程同步更新

### Design

- PC 管理端采用轻量企业级 ERP 视觉风格
- 主色采用企业蓝，Sidebar 采用深蓝灰色
- 间距采用 4px 基础系统，普通卡片不使用重阴影
- 表格、表单和状态表达保持清晰、紧凑、可读
- 第一版本仅支持 Light Mode
- 本任务不指定具体组件库或图标库
- 本次未修改 Task 4.1 页面架构、Task 4.2 布局与导航、Frozen 业务规则、数据库逻辑或九阶段路线

### Status

- Phase 4: In Progress
- Task 4.1: Completed / Approved
- Task 4.2: Completed / Approved
- Task 4.3: Completed / Approved
- Task 4.4: Not Started
- Technical Development: Not Started

## [0.4.1] - 2026-07-20

### Added

- 新增 Task 4.2 PC 管理端布局与导航设计文档
- 新增 PC 管理端 Header、Sidebar、Main Content、Tab 和 Info Panel 布局规则
- 新增 Tab 多标签工作区规则
- 新增右侧信息区默认折叠及预留规则
- 新增 PC 页面导航、状态保留和响应式原则

### Changed

- Task 4.2 状态更新为 Completed / Approved
- 下一任务更新为 Task 4.3 PC 管理端视觉规范设计
- Task 4.3 状态保持 Not Started
- 项目进度和开发流程同步更新

### Design

- PC 管理端采用 Header、Sidebar、Main Content 和 Info Panel 框架
- Header 高度建议 64px
- Sidebar 展开宽度建议 260px，折叠宽度建议 72px
- 正式采用 Tab 多标签工作区，首页 Tab 固定且不可关闭
- 右侧信息区第一版默认关闭且默认不占用主工作区宽度
- 右侧信息区第一版只预留功能，不开发具体能力
- PC 与微信小程序不复用同一页面布局
- 本次未修改 Frozen 业务规则、数据库逻辑或九阶段路线

### Status

- Phase 4: In Progress
- Task 4.1: Completed / Approved
- Task 4.2: Completed / Approved
- Task 4.3: Not Started
- Technical Development: Not Started

## [0.4.0] - 2026-07-20

### Added

- 新增 Task 4.1 页面架构设计文档
- 新增 Phase 4 启动及 Task 4.1 页面架构设计正式决策
- 确认 PC 管理端九个一级模块下的页面架构
- 确认微信小程序“首页、业务、库存、我的”四个主导航

### Changed

- Phase 4 状态更新为 In Progress
- Task 4.1 页面架构设计状态更新为 Completed / Approved
- 下一任务更新为 Task 4.2，状态为 Not Started
- 项目进度、开发流程和文档入口同步至 Phase 4 当前状态

### Design

- 采购验收页面归属采购管理，生产验收页面归属生产管理
- 微信小程序首页允许统一质量验收快捷入口，并按权限显示采购或生产来源
- 验收入口按角色权限、仓库数据权限及授权厂家范围动态显示
- PC 管理端保持九个已批准一级模块，不新增质量验收一级模块
- 本次不定义 UI 视觉样式、具体布局、表单字段、API 或技术实现
- 本次未修改 Frozen 业务规则、数据库逻辑或九阶段路线

### Status

- Phase 3: Completed / Approved / Frozen
- Phase 4 UI / Page Design: In Progress
- Task 4.1 Page Architecture Design: Completed / Approved
- Task 4.2: Not Started
- Technical Development: Not Started

## [0.3.10] - 2026-07-20

### Added

- 新增 Task 3.5.7 Database Freeze 文档
- 建立 Database Change Request 冻结后变更流程
- 新增 Database Logical Design v1.0 冻结及 Phase 3 关闭正式决策

### Changed

- Phase 3 状态更新为 Completed / Approved / Frozen
- Task 3.5 状态更新为 Completed / Approved
- Task 3.5.7 状态更新为 Completed / Approved / Frozen
- `DATABASE_SPEC.md` 更新为 Frozen 数据库逻辑规格总入口
- 下一阶段保持 Phase 4 页面设计（UI / Page Design），状态为 Not Started
- 当前下一步更新为等待 ChatGPT 验收 Phase 3

### Design

- 冻结 60 张正式逻辑表、字段业务语义、逻辑类型、约束、关系、逻辑索引、命名、库存粒度及历史保留原则
- 明确任何 Frozen 数据库逻辑设计变化必须经过 Database Change Request
- 明确技术索引、物理类型和实现语法仅可在后续正式授权阶段确定
- 未将数据库或 ORM 选型、DDL、Schema、Migration、Seed 或物理 ER 图预先分配给 Phase 4
- 未修改 Frozen 九阶段路线或 Phase 4 页面设计定义

### Status

- Phase 3: Completed / Approved / Frozen
- Task 3.5: Completed / Approved
- Task 3.5.7: Completed / Approved / Frozen
- Phase 4 UI / Page Design: Not Started
- Database, ORM, DDL, Schema, Migration and Development: Not Started

## [0.3.9] - 2026-07-20

### Added

- 新增 Task 3.5.6 数据库命名规范文档
- 完成 60 张正式逻辑表及 Task 3.4 已批准字段的命名审计
- 新增 Task 3.5.6 数据库命名规范正式决策

### Changed

- Task 3.5.6 状态更新为 Completed / Approved
- Task 3.5.7 Database Freeze 按数据库设计冲刺进入 In Progress
- 数据库规格入口增加 Task 3.5.6 文档链接和命名审计摘要

### Design

- 统一表名、字段名、时间日期、布尔、编码编号、数量金额比率、快照及状态命名
- 统一主键、唯一约束、外键、Check 约束和普通索引名称前缀
- 统一枚举值格式和允许、禁止缩写边界
- 保留 5 类已批准兼容项，不新增别名或平行字段
- 未新增、删除或重命名任何正式逻辑表或字段

### Status

- Phase 3: In Progress
- Task 3.5: In Progress
- Task 3.5.6: Completed / Approved
- Task 3.5.7: In Progress
- SQL, ORM, Schema, Migration and Development: Not Started

## [0.3.8] - 2026-07-20

### Added

- 新增 Task 3.5.5 Check 约束设计文档
- 完成数值、日期、动作字段、来源组合和仓库角色逻辑约束设计
- 新增 Task 3.5.5 Check 约束正式决策

### Changed

- Task 3.5.5 状态更新为 Completed / Approved
- Task 3.5.6 数据库命名规范按数据库设计冲刺进入 In Progress
- 数据库规格入口增加 Task 3.5.5 文档链接和约束摘要

### Design

- 确定 201 项数据库无关的 Check 逻辑规则
- 正式明细数量、行号、版本号、金额、价格和累计数量获得范围约束
- 提交、审核、取消、停用及有效期字段获得一致性约束
- 验收、入库、库存流水和多态结果字段获得组合完整性约束
- 厂家仓、海外仓、跨境发货及调拨仓库角色获得逻辑约束
- 明确 Check 不承担跨表存在性、权限、并发和库存事务验证

### Status

- Phase 3: In Progress
- Task 3.5: In Progress
- Task 3.5.5: Completed / Approved
- Task 3.5.6: In Progress
- SQL, ORM, Schema, Migration and Development: Not Started

## [0.3.7] - 2026-07-20

### Added

- 新增 Task 3.5.4 索引设计文档
- 完成外键、业务主体状态日期、多态对象及历史表逻辑索引设计
- 新增 Task 3.5.4 索引设计正式决策

### Changed

- Task 3.5.4 状态更新为 Completed / Approved
- Task 3.5.5 Check 约束设计按数据库设计冲刺进入 In Progress
- 数据库规格入口增加 Task 3.5.4 文档链接和索引摘要

### Design

- 确定 90 项普通逻辑索引，其中含外键字段 69 项、组合索引 59 项、多态索引 15 项
- 正式单据围绕业务主体、状态和日期建立组合索引
- 库存流水围绕 SKU、仓库、时间和受控来源建立索引
- 历史与只追加表围绕对象、用户和时间建立索引
- 排除 21 项与主键、唯一约束重复或已被有效前缀覆盖的建议
- 不机械索引长文本、JSON、快照、敏感联系信息或单独低选择性布尔字段

### Status

- Phase 3: In Progress
- Task 3.5: In Progress
- Task 3.5.4: Completed / Approved
- Task 3.5.5: In Progress
- SQL, ORM, Schema, Migration and Development: Not Started

## [0.3.6] - 2026-07-20

### Added

- 新增 Task 3.5.3 外键关系规范文档
- 完成全部 60 张正式表的外键需求、引用必填性及删除更新策略检查
- 新增 Task 3.5.3 外键关系正式决策

### Changed

- Task 3.5.3 状态更新为 Completed / Approved
- 下一小任务更新为 Task 3.5.4 索引设计，状态 Not Started
- 数据库规格入口增加 Task 3.5.3 文档链接和外键策略摘要

### Design

- 普通业务外键更新和删除默认采用 `RESTRICT`
- 结构性明细、导入明细、附件关系及纯权限关系限定使用结构性 `CASCADE`
- 基础资料被引用后通过停用保留历史，正式业务主表和核心历史表不得级联删除
- 用户历史引用统一保护，专用操作用户字段继续关联 `users.id`
- 验收来源保持采购与生产互斥，入库来源使用已批准受控多态字段
- 库存流水、附件、审计、状态历史和审批对象采用受控多态引用，不建立错误的单表外键
- 跨境发货和调拨分别保留来源仓、在途仓与目的仓关系
- 全部外键字段均来源于 Task 3.4，未新增字段或正式表

### Status

- Phase 3: In Progress
- Task 3.5: In Progress
- Task 3.5.1: Completed / Approved
- Task 3.5.2: Completed / Approved
- Task 3.5.3: Completed / Approved
- Task 3.5.4: Not Started
- Foreign Key Relationship Standard: Completed / Approved
- Ordinary Index and Check Constraint Design: Not Started
- SQL, ORM, Schema, Migration and Development: Not Started

## [0.3.5] - 2026-07-20

### Added

- 新增 Task 3.5.2 主键与唯一约束设计文档
- 完成全部 60 张正式表的主键和业务唯一范围设计
- 新增 Task 3.5.2 主键与唯一约束正式决策

### Changed

- Task 3.5.2 状态更新为 Completed / Approved
- 下一小任务更新为 Task 3.5.3 外键关系规范，状态 Not Started
- 数据库规格入口增加 Task 3.5.2 文档链接和约束设计摘要

### Design

- 全部 60 张正式表统一采用单字段 UUID 主键 `id`，优先 UUID v7
- 业务编码不作为主键，业务唯一性通过独立唯一约束表达
- 单据编号在各自业务表内唯一，单据明细采用“主表 ID + 行号”组合唯一
- 库存余额采用 `sku_id, warehouse_id` 组合唯一，多对多关联表采用业务对象 ID 组合唯一
- 外部平台订单及退货编号按店铺范围唯一，物流信息按承运商与非空物流单号组合唯一
- 编码及用户名按不区分大小写原则判重，可空唯一字段仅在非空时参与判断
- 审计日志、单据状态历史和审批记录不设置业务唯一约束

### Status

- Phase 3: In Progress
- Task 3.5: In Progress
- Task 3.5.1: Completed / Approved
- Task 3.5.2: Completed / Approved
- Task 3.5.3: Not Started
- Field Type Standard: Completed / Approved
- Primary Key and Unique Constraint Design: Completed / Approved
- Foreign Key Policy, Ordinary Index and Check Constraint Design: Not Started
- SQL, ORM, Schema, Migration and Development: Not Started

## [0.3.4] - 2026-07-19

### Added

- 新增 Task 3.5.1 字段数据类型规范文档
- 建立数据库无关的标准逻辑类型与字符串长度规范
- 明确数量、金额、税率、百分比、日期时间、ENUM、JSON、敏感字段和文件字段规范
- 新增 Task 3.5.1 字段数据类型正式决策

### Changed

- Task 3.5 状态更新为 In Progress
- Task 3.5.1 状态更新为 Completed / Approved
- 下一小任务更新为 Task 3.5.2 主键与唯一约束设计，状态 Not Started
- 数据库规格入口增加 Task 3.5.1 文档链接和逻辑类型摘要

### Design

- 所有主键和对象引用采用 UUID，优先 UUID v7
- 数量、金额及单价采用 `DECIMAL(18,4)`
- 税率及百分比采用 `DECIMAL(7,4)`
- 纯业务日期采用 `DATE`，准确操作时间采用 `DATETIME`
- ENUM 保存稳定英文代码，JSON 不得替代正式关系表或明细表
- 文件本体不直接保存至数据库，文件大小统一按字节记录
- 密码只保存密码哈希，银行、税务和个人信息继续按敏感字段管理
- 只追加表不设置更新或删除用途字段

### Status

- Phase 3: In Progress
- Task 3.4: Completed / Approved
- Task 3.5: In Progress
- Task 3.5.1: Completed / Approved
- Task 3.5.2: Not Started
- Field Name Design: Completed / Approved
- Field Type Standard: Completed / Approved
- Primary Key, Unique Constraint, Foreign Key Policy, Index and Check Constraint Design: Not Started
- SQL, ORM, Schema, Migration and Development: Not Started

## [0.3.3] - 2026-07-19

### Added

- 新增 Task 3.4 字段结构设计文档
- 完成一般表、正式业务单据主表和单据明细公共字段规范
- 完成全部 60 张正式逻辑表的字段名称、中文含义、业务用途及业务必填性设计
- 新增 Task 3.4 字段结构设计正式决策

### Changed

- Task 3.4 状态更新为 Completed / Approved
- Task 3.3 保持 Completed / Approved，正式逻辑表数量经结构检查由 57 张修正为 60 张
- 新增 `production_completion_record_items`
- `role_warehouses` 和 `role_stores` 由候选表转为正式表
- 下一任务更新为 Task 3.5 字段类型、约束与索引设计，状态 Not Started
- 数据库规格入口增加 Task 3.4 文档链接和修正后的表清单摘要

### Design

- 正式单据统一单据编号、状态、审核、作废和版本字段
- 多 SKU 明细统一保留 SKU 编码、名称和规格快照
- 库存流水、审计日志、单据状态历史和审批记录只追加
- `inventories` 不设置 `in_transit_quantity`，在途库存继续通过在途仓库节点表达
- 第一阶段安全库存采用 `skus.safety_stock_quantity`
- `safety_stock_rules` 继续保留为候选表
- 敏感银行、税务、个人与配置数据后续必须纳入权限、脱敏和审计控制

### Status

- Phase 3: In Progress
- Task 3.1: Completed / Approved
- Task 3.2: Completed / Approved
- Task 3.3: Completed / Approved
- Task 3.4: Completed / Approved
- Task 3.5: Not Started
- Field Name Design: Completed / Approved
- Field Type, Constraint and Index Design: Not Started
- Development: Not Started

## [0.3.2] - 2026-07-19

### Added

- 新增 Task 3.3 数据表结构设计文档
- 正式确认五类共 57 张逻辑表
- 明确三张候选表及暂不纳入原因
- 新增 Task 3.3 表结构设计正式决策

### Changed

- Task 3.3 状态更新为 Completed / Approved
- 下一任务更新为 Task 3.4 字段结构设计，状态 Not Started
- 数据库规格入口增加 Task 3.3 文档链接和正式表清单摘要

### Design

- 统一仓库表和统一当前库存表，不建立平行表
- 多 SKU 正式单据采用主表与明细表结构
- 生产进度和分批完工记录独立建表
- 附件采用统一附件表及附件关联表
- 单据状态历史和审批记录独立建表
- `role_warehouses`、`role_stores` 和 `safety_stock_rules` 暂列候选

### Status

- Phase 3: In Progress
- Task 3.1: Completed / Approved
- Task 3.2: Completed / Approved
- Task 3.3: Completed / Approved
- Task 3.4: Not Started
- Field Design: Not Started
- Development: Not Started

## [0.3.1] - 2026-07-19

### Added

- 新增 Task 3.2 实体关系详细设计文档
- 完成基础资料、业务单据、库存、跨境、权限和审计关系设计
- 增加概念级实体关系图及关系基数说明
- 新增 Task 3.2 核心关系正式决策

### Changed

- Task 3.2 状态更新为 Completed / Approved
- 下一任务更新为 Task 3.3 数据表结构设计，状态 Not Started
- 同步更新项目进度、开发流程和数据库规格入口

### Design

- 采购与生产实体保持平行，不建立父子关系
- 采购与生产共用 `InspectionOrder`，并执行单一业务来源互斥规则
- 多 SKU 正式业务单据采用主实体与明细实体一对多结构
- 库存流水必须追溯来源业务单据及具体明细
- `CrossBorderShipment` 与 `ImportTask` 采用多对多匹配关系
- `User` 与 `Role`、`Role` 与 `Permission` 采用多对多关系
- 历史实体关系不得物理删除

### Status

- Phase 3: In Progress
- Task 3.1: Completed / Approved
- Task 3.2: Completed / Approved
- Task 3.3: Not Started
- Database Field Design: Not Started
- Development: Not Started

## [0.3.0] - 2026-07-19

### Added

- 正式启动 Phase 3 数据库设计
- 新增 Task 3.1 业务对象到数据库实体映射文档
- 明确独立实体、非独立实体及初步概念关系
- 新增 Phase 3 启动与实体映射正式决策

### Changed

- Phase 3 状态更新为 In Progress
- Task 3.1 状态更新为 Completed / Approved
- 下一任务更新为 Task 3.2 实体关系详细设计，状态 Not Started
- 数据库规格入口更新为 Phase 3 当前进度

### Design

- 仓库子类型统一映射至 `Warehouse`
- 五类库存余额统一映射至 `Inventory`
- 当前库存与库存流水分别映射至 `Inventory` 和 `InventoryTransaction`
- 海外库存导入复用统一 `ImportTask`
- 统计报表不建立业务事实实体
- 业务操作日志复用统一 `AuditLog`
- 库存预警建立独立 `InventoryAlert`

### Status

- Phase 2: Completed / Approved
- Phase 3: In Progress
- Task 3.1: Completed / Approved
- Task 3.2: Not Started
- Detailed Database Design: Not Started
- Development: Not Started

## [0.2.4] - 2026-07-19

### Added

- 新增 Task 2.6 业务对象定义
- 完成基础对象、业务对象、库存对象和系统对象定义
- 增加按 Task 完成后立即更新 GitHub 的工作规则

### Changed

- Task 2.6 更新为 Completed / Approved
- Phase 2 更新为 Completed / Approved
- 下一阶段更新为 Phase 3 Database Design，状态 Not Started

### Status

- Phase 2: Completed / Approved
- Phase 3: Not Started
- Database Design: Not Started
- Development: Not Started

## [0.2.3] - 2026-07-19

### Added

- 新增 Task 2.5 状态流转设计
- 明确采购、委外生产、验收、出入库、跨境、调拨、盘点等多维状态体系
- 明确关键状态转换条件和禁止规则
- 新增多维业务状态正式决策

### Changed

- Task 2.5 状态更新为 Approved
- Task 2.6 由“输入输出分析”调整为“业务对象定义（Business Object Definition）”
- 更新 Phase 2 任务进度
- 当前下一任务更新为 Task 2.6 业务对象定义

### Status

- Phase 2: In Progress
- Task 2.1: Approved
- Task 2.2: Approved
- Task 2.3: Approved
- Task 2.4: Approved
- Task 2.5: Approved
- Task 2.6: Not Started
- Database Design: Not Started
- Development: Not Started

## [0.2.2] - 2026-07-19

### Added

- 新增 Task 2.4 业务生命周期设计
- 明确产品、采购、委外生产、跨境和库存五类生命周期
- 明确各生命周期的正常路径、异常路径和完成条件
- 明确付款状态与业务完成状态分离
- 新增五类业务生命周期正式决策

### Changed

- Task 2.4 状态更新为 Approved
- 更新 Phase 2 任务进度
- 当前下一任务更新为 Task 2.5 状态流转设计

### Status

- Phase 2: In Progress
- Task 2.1: Approved
- Task 2.2: Approved
- Task 2.3: Approved
- Task 2.4: Approved
- Task 2.5: Not Started
- Database Design: Not Started
- Development: Not Started

## [0.2.1] - 2026-07-19

### Added

- 新增 Task 2.3 模块关系设计
- 明确采购管理与生产管理为平行模块
- 明确质量验收为采购与生产共用业务节点
- 明确国内采购、委外生产、跨境发货、单据流和库存流关系
- 新增采购与生产关系正式决策

### Changed

- Task 2.2 状态由 Reviewed 更新为 Approved
- Task 2.3 状态设置为 Approved
- 更新 Phase 2 任务进度
- 当前下一任务更新为 Task 2.4 核心业务流程设计

### Status

- Phase 2: In Progress
- Task 2.1: Approved
- Task 2.2: Approved
- Task 2.3: Approved
- Task 2.4: Not Started
- Database Design: Not Started
- Development: Not Started

## [0.2.0] - 2026-07-19

### Added

- 新增 Phase 2 Task 2.1 系统模块划分正式记录
- 新增 Phase 2 Task 2.2 模块职责设计 Reviewed 评审稿
- 记录九个一级模块及“出入库管理”正式名称
- 新增 DEC-013 正式启动 Phase 2 并确认 Task 2.1

### Changed

- 将 Phase 2 状态由 Not Started 更新为 In Progress
- 同步更新 `PROJECT.md`、`README.md`、`ROADMAP.md` 和开发流程中的项目进度
- 将 Current Task 更新为 Task 2.2 模块职责设计
- 将 Next Task 更新为待 Task 2.2 确认后进入 Task 2.3 模块关系设计

### Status

- Phase 1: Closed
- Phase 2: In Progress
- Task 2.1: Completed
- Task 2.2: Reviewed
- Current Task: Task 2.2
- Business Rules: Frozen
- Database Design: Not Started
- Development: Not Started

## [0.1.2] - 2026-07-19

### Added

- 正式建立并冻结固定九阶段开发路线
- 增加开发阶段冻结规则
- 增加项目语言规范
- 明确中文（简体）为项目主要语言
- 增加 Codex 阶段边界检查要求
- 增加 Phase 路线变更控制规则

### Changed

- 将 `ROADMAP.md` 由 Draft 升级为 Frozen
- 更新 `PROJECT.md` 中的项目进度和开发路线
- 更新 `README.md` 中的当前项目状态
- 更新 `AGENTS.md` 中的阶段读取和语言规则
- 更新 `DEVELOPMENT_WORKFLOW.md` 和 `CHANGE_CONTROL.md`
- 更新 `DECISION_LOG.md`

### Status

- Phase 1: Closed
- Phase 2: Not Started
- Business Requirements: Approved
- Business Rules: Frozen
- Governance Documents: Approved
- Development Roadmap: Frozen
- Database Design: Not Started
- Development: Not Started

## [0.1.1] - 2026-07-19

### Changed

- 将正式项目治理文档状态由 Draft 修正为 Approved
- 明确 `AGENTS.md` 已作为 Codex 正式执行约束生效
- 明确 `PROJECT.md` 及治理流程文件已正式生效
- 更新 README 中的治理文档状态说明

### Unchanged

- Phase 1 Business Requirement Analysis remains Approved
- BUSINESS_RULES remains Frozen
- System, database, UI, API and testing specifications remain Draft
- Development remains Not Started

### Status

- Current Phase: Phase 1 Completed
- Governance Documents: Approved
- Phase 1: Approved
- Business Rules: Frozen
- Development: Not Started

## [0.1.0] - 2026-07-19

### Added

- 初始化 Violin ERP Lite 项目治理体系
- 建立 `PROJECT.md` 和 `AGENTS.md`
- 完成 Phase 1 业务需求分析
- 冻结第一版业务规则
- 建立后续产品、数据库、UI、API 和测试文档模板
- 建立公开 GitHub 仓库安全规则

### Status

- Phase 1: Approved
- Business Rules: Frozen
- Development: Not Started
