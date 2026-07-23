---
document_name: Task 7.6 系统集成与开发收口
project: Violin ERP Lite
version: 1.0
status: In Progress
owner: Project Manager
created_date: 2026-07-23
updated_date: 2026-07-23
related_phase: Phase 7
---

# Task 7.6 系统集成与开发收口

## 1. 文档目的

本文档是 Task 7.6 的正式实施基线，用于记录执行基准 `475eaa54aa51ce11b0b9d8384d9b4acc781cca09` 上的代码现状、集成问题、证据、处理建议、内部实施批次和完成标准。

本轮只完成 Task 7.6 启动、只读审计与计划固化，不执行任何业务代码整改。审计结论以现有代码、实际命令结果和正式 SSOT 为依据；无法在当前环境验证的事项明确标记为 Out of Scope，不将推测写成事实。

## 2. 权威输入与边界

### 2.1 权威输入

本任务遵循以下正式输入：

- `AGENTS.md`；
- `docs/00-governance/CURRENT_STATUS.md`；
- `ROADMAP.md` 与 `PROJECT.md`；
- `docs/00-governance/DOCUMENT_PRIORITY.md`；
- Frozen `docs/01-business/BUSINESS_RULES.md`；
- Approved `docs/02-product/SYSTEM_SPEC.md`；
- Frozen `docs/03-data/DATABASE_SPEC.md`；
- Frozen `docs/03-data/DATABASE_ENUM_SPEC.md`；
- Frozen `docs/02-product/ROLE_PERMISSION_SPEC.md`；
- Frozen `docs/05-api/API_SPEC.md`；
- Phase 4 Approved 页面设计；
- Phase 6 Frozen 功能规格；
- Phase 7 已批准的开发结果。

用户指令中的 `docs/03-data/ROLE_PERMISSION_SPEC.md` 在仓库中不存在；本轮按仓库正式目录读取唯一文件 `docs/02-product/ROLE_PERMISSION_SPEC.md`。该路径差异不改变文档内容或权威性。

### 2.2 任务目标

Task 7.6 只负责：

- 已完成模块之间的集成；
- Web、Mini Program、API、数据库和共享包的联通；
- 权限、状态流转、库存流水和审计链路收口；
- 构建、启动、环境变量和开发运行方式收口；
- 已实现功能中的缺口、死链、占位实现和集成错误修复；
- 为 Phase 8 测试准备可运行开发基线。

Task 7.6 不新增 Phase 6 未批准的新业务功能，不修改 Frozen 业务规则、数据库、枚举、权限或 API 定义，不提前启动 Phase 7 Final Consistency Review 或 Phase 8。

## 3. 审计方法与命令证据

### 3.1 仓库与依赖

- `git status --short`：执行前无输出，工作区干净；
- `git branch --show-current`：`main`；
- `git pull --ff-only origin main`：Already up to date；
- `git rev-parse HEAD` 与 `git rev-parse origin/main`：均为 `475eaa54aa51ce11b0b9d8384d9b4acc781cca09`；
- `pnpm install --frozen-lockfile`：通过，Lockfile is up to date；
- `pnpm status:check`：执行前通过；
- 根目录与 5 个 workspace 的 `package.json`、`pnpm-workspace.yaml`、TypeScript、ESLint、Vitest、Next.js 和 Taro 配置均已读取。

### 3.2 数据库工具

- 未设置 `DATABASE_URL` 时，`pnpm db:validate` 与 `pnpm db:generate` 在加载 `prisma.config.ts` 时失败；
- 使用仅存在于进程内的无敏感占位连接串后，`pnpm db:validate` 与 `pnpm db:generate` 均通过；
- `prisma/schema.prisma`、`prisma/migrations/20260722000000_initial/migration.sql`、`prisma/mapping-audit.json` 和 `prisma/seed.ts` 已读取；
- `mapping-audit.json` 记录 60 张表、1128 个字段、283 个外键、90 个普通索引和 201 个 Check 约束；
- 使用不可连接的本机占位 PostgreSQL 地址执行 `pnpm db:migrate:status` 失败，未对真实数据库执行 Migration 或 Seed。

### 3.3 质量与构建

- `pnpm lint`：通过；
- `pnpm typecheck`：通过；
- `pnpm test`：首次运行在 50 项 package 测试断言均报告通过后，Node.js `v26.3.1` 的 Vitest 数据库 worker 退出阶段发生原生 `SIGABRT`；立即独立重跑通过，共 20 个 Test Files、76 项 Tests；
- `pnpm build`：通过；
- `pnpm build:admin`：通过；
- `pnpm build:miniapp`：通过。

### 3.4 本地运行探测

使用进程内无敏感占位环境变量启动 `pnpm dev:admin`，Next.js 在 `http://localhost:3000` 正常 Ready。因当前环境没有可用 PostgreSQL：

- `/` 返回 HTTP 200；
- `/api/health` 返回 HTTP 503 与 `SYSTEM_SERVICE_UNAVAILABLE`；
- `/api/v1/products` 在无 Authorization Header 时返回 HTTP 500 与 `SYSTEM_INTERNAL_ERROR`。

探测完成后已终止开发服务器，未写入 `.env` 或其他本地配置文件。

## 4. 集成审计总览

| 审计范围 | 结论 | 对应发现 |
| --- | --- | --- |
| Monorepo workspace 依赖关系 | 5 个 workspace 均由根脚本编排；正式依赖图未发现循环，旧目录仍有空占位 | V-001、N-001 |
| Web 页面与真实 API | 基础资料、权限和核心流程工作台使用真实 `/api/v1` 请求；首页、统计和设置仍为占位 | V-002、M-003 |
| Mini Program 与真实 API | 只有 SKU 查询执行真实请求，其余业务、库存和用户页仍是静态入口或壳层 | M-002 |
| API Route、Service、Repository 与 Prisma | 已实现的 282 个正式接口通过统一 Route、Service、Repository、Prisma 链路连接；335 个 Frozen 接口尚未全覆盖 | V-003、M-001 |
| 登录、身份认证和角色权限 | Token 校验、权限校验和数据范围基础存在，但登录/刷新/登出/当前会话接口与双端登录引导缺失 | B-001、V-004 |
| 基础资料 | 8 类基础资料及用户角色管理已有实现；其余正式基础资料 API 未覆盖 | V-003、M-001 |
| 采购管理 | 采购订单与付款工作台和后端链路存在；采购退货正式 API 未实现 | V-005、M-001 |
| 生产管理 | 生产订单、进度、分批完工和付款的 Route、Service、Repository 及 Web 工作台存在 | V-005 |
| 质量验收 | 采购与生产来源验收链路存在 | V-005 |
| 库存管理 | 库存余额、事务、调整、预警、调拨、盘点和报损实现存在 | V-006 |
| 出入库管理 | 正式入库、国内销售出库与销售退货实现存在；`INB-005` 尚未实现 | V-005、V-006、M-001 |
| 跨境业务 | 跨境发货、海外仓库存及海外导入投影实现存在 | V-006 |
| Dashboard 与统计数据 | 首页只有 App Shell；`analytics` 和 `settings` 没有业务内容 | M-003 |
| 枚举和状态映射 | Prisma、Repository 和 Validation 已使用正式状态及枚举；后续仍需真实数据库端到端验证 | V-007、O-001 |
| 错误码和异常处理 | 统一响应封装存在；数据库不可用时未认证业务请求返回 500，需要收口 | M-006 |
| 审计字段 | Repository 写入审计字段，Service 写 Audit Log；真实数据库审计链尚未端到端验证 | V-004、O-001 |
| 库存流水与库存余额一致性 | 库存变更集中在事务 Repository，库存余额与流水原子写入并有单元测试 | V-006 |
| 数据库 Migration 与 Seed | Schema 与生成验证通过，存在单一初始 Migration；Seed 当前有意为空，真实部署状态未验证 | M-005、V-007、O-001 |
| 环境变量 | `.env.example` 无真实敏感值，但缺少从模板到可运行数据库的完整启动说明 | M-004、V-008 |
| 本地启动和构建 | Admin 可启动，两端及根构建通过；无数据库时健康检查失败，完整运行基线未闭合 | M-004 |
| 单元测试及现有集成测试 | 20 个测试文件、76 项测试可通过；数据库 Repository 测试使用替身，暂无真实数据库端到端测试 | M-007、V-009 |

## 5. 问题分级规则

- **Blocker**：阻止正式核心链路运行或使任何授权用户无法进入系统，必须优先关闭；
- **Major**：核心范围存在明显实现、联通、交付或验证缺口，Task 7.6 完成前原则上必须关闭；
- **Minor**：不阻止主要业务链路，但影响可维护性、稳定性或仓库清晰度；
- **Verified**：已有代码和命令证据确认满足当前审计要求；
- **Out of Scope**：当前环境或本轮边界无法验证，或者明确属于后续 Phase，不将其伪装为已通过。

## 6. 审计发现清单

### 6.1 Blocker

| 编号 | 所属模块 | 现象 | 证据文件或命令 | 对应 SSOT | 风险 | 建议处理方式 | 代码修改 | 测试 | SSOT 冲突 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B-001 | 登录与身份认证 | `SEC-001` 至 `SEC-005` 未实现，双端没有登录、刷新、登出和会话恢复链路；所有现有业务 API 又要求 Bearer Token，正式用户无法通过系统自身取得会话 | `apps/admin/app/api/v1/[...segments]/route.ts`、`packages/api/src/auth/token.ts`、`apps/admin/contexts/app-providers.tsx`、`apps/miniapp/src/contexts/app-context.tsx`，源码检索无登录路由 | `API_SPEC.md` 第 15 节；Task 6.3 安全与会话功能规格；`ROLE_PERMISSION_SPEC.md` | 阻断 Web、Mini Program 和所有受保护 API 的真实端到端使用 | 优先实现 Frozen `SEC-001` 至 `SEC-005`，接入用户凭证、会话/刷新令牌与双端登录恢复，不新增接口 | 是 | 是，含成功、失败、刷新、登出、禁用用户和权限装载 | 否，属于代码未覆盖 SSOT |

### 6.2 Major

| 编号 | 所属模块 | 现象 | 证据文件或命令 | 对应 SSOT | 风险 | 建议处理方式 | 代码修改 | 测试 | SSOT 冲突 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| M-001 | API 覆盖 | Frozen API 共 335 个，当前统一路由覆盖 282 个：基础资料 64、权限管理 20、核心流程 75、库存与跨境 123；尚缺 53 个，包括 10 个基础资料、`PUR-020` 至 `PUR-029`、`INB-005`、`IMP-001` 至 `IMP-015`、`ATT-001` 至 `ATT-008`、`LOG-001` 至 `LOG-004`、`SEC-001` 至 `SEC-005` | `API_SPEC.md` 接口总数与模块计数；`MASTER_DATA_RESOURCE_KEYS`；`WORKFLOW_API_IDS`；`INVENTORY_WORKFLOW_API_IDS`；统一 Route 文件 | Frozen `API_SPEC.md` v1.1 | 已批准功能不能形成完整 API 基线，Phase 8 无法按 335 个接口验收 | 严格按现有编号、方法、路径和 DTO 分批补齐；不得新增或改义 API | 是 | 是，逐接口契约、权限、校验与 Repository 测试 | 否，属于实现缺口 |
| M-002 | Mini Program | 仅 SKU 查询调用真实 API；首页、业务、库存余额/流水/出入库/跨境和用户页为静态文案或壳层，应用上下文固定为 `user: null` 与空权限 | `apps/miniapp/src/pages/sku-query/index.tsx`、`pages/index/index.tsx`、`pages/business/index.tsx`、`pages/inventory/index.tsx`、`pages/profile/index.tsx`、`contexts/app-context.tsx` | `SYSTEM_SPEC.md`；Phase 4 双端页面设计；Task 6.2/6.3 | 移动端不能执行已批准的只读查询和授权边界 | 在认证链路完成后，将已批准的只读页面接入对应 Frozen API 和权限，不增加管理写操作 | 是 | 是，页面请求、权限、空态、错误态与真机/构建测试 | 否 |
| M-003 | Web Dashboard 与统计 | `/` 仅渲染 App Shell；`/workspace/analytics` 与 `/workspace/settings` 没有业务子内容，默认显示占位描述 | `apps/admin/app/page.tsx`、`apps/admin/app/workspace/[section]/page.tsx`、`apps/admin/components/shell/app-shell.tsx` | Phase 4 Task 4.4；Task 6.2 Dashboard 与统计规格 | 已批准的首页和统计能力不可用，存在导航死链/占位页 | 只实现 Phase 4/6 已批准 Dashboard 与统计数据链路；设置页若无已批准功能则保留明确边界，不凭空扩展 | 是 | 是，页面、API、权限、空态与聚合正确性 | 否 |
| M-004 | 环境与启动交付 | `.env.example` 有变量模板，但 README 未说明复制模板、数据库准备、Migration、Seed、双端启动及健康检查；干净环境直接执行 Prisma 命令因 `DATABASE_URL` 缺失而失败 | `.env.example`、`README.md`、`prisma.config.ts`；`pnpm db:validate` 与 `pnpm db:generate` 的干净环境结果 | Task 7.1 开发运行规范；Task 7.6 完成标准 | 新开发环境不能按仓库说明稳定复现运行基线 | 补齐无敏感信息的本地开发说明、前置版本、数据库准备、环境变量、迁移、Seed、启动和健康检查步骤 | 否，原则上仅配置/文档；如脚本缺口经审查可改工程配置 | 是，命令冒烟验证 | 否 |
| M-005 | 数据库 Seed | `prisma/seed.ts` 为空，不生成正式角色、权限、首个开发管理员或最小开发基线 | `prisma/seed.ts` | `ROLE_PERMISSION_SPEC.md`；Task 7.3 Seed 边界；Task 7.6 可运行基线 | 即使数据库迁移完成，也没有可登录和验证权限的数据基线 | 在不引入真实业务数据的前提下，按正式角色/权限 SSOT 设计可重复、安全的开发 Seed；首个管理员凭证必须由环境注入或独立初始化 | 是（仅后续获准修改 Seed 时） | 是，幂等、无敏感值、角色权限计数与登录冒烟 | 否 |
| M-006 | 错误处理与运行链路 | 本地 Admin 可启动，但数据库不可用时 `/api/health` 正确返回 503，而无 Authorization 的 `/api/v1/products` 返回 500，不符合未认证请求应优先返回统一 401 的边界 | 本地 `pnpm dev:admin` + `curl` 结果；`apps/admin/app/api/v1/[...segments]/route.ts` 在调用 `withAuthentication` 前构造 `createCurrentUserResolver()` | `API_SPEC.md` 认证与错误响应规则；Task 6.3 | 基础设施故障掩盖认证错误，客户端和监控无法准确区分故障类型 | 调整依赖初始化时机，确保缺少/无效凭证先返回正式认证错误，同时保持数据库健康检查 503 | 是 | 是，数据库不可用 + 无令牌/坏令牌/有效令牌组合测试 | 否 |
| M-007 | 集成测试 | 现有 Service 与 Repository 测试主要使用内存替身或代理；Admin API 契约测试只验证未认证 401，未使用真实 PostgreSQL 验证 Route → Service → Repository → Prisma → Audit/Inventory 全链路 | `packages/database/tests/*.test.ts`、`apps/admin/tests/api-v1-contract.test.ts`、根 `vitest.config.ts` | Task 6.1 测试要求；Task 7.6 完成标准 | 原子库存、状态流转、权限范围和数据库约束可能在真实集成时失败而未被发现 | 建立隔离测试数据库与最小端到端集成测试，覆盖认证、权限、核心流程、库存流水、回滚和审计 | 是（测试与测试基础设施） | 是 | 否；Phase 8 的全面测试方案仍不在本 Task 内 |

### 6.3 Minor

| 编号 | 所属模块 | 现象 | 证据文件或命令 | 对应 SSOT | 风险 | 建议处理方式 | 代码修改 | 测试 | SSOT 冲突 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| N-001 | 仓库目录 | `apps/admin-web/.gitkeep` 与 `apps/mini-program/.gitkeep` 是早期空目录，实际 workspace 为 `apps/admin` 与 `apps/miniapp` | `git ls-files apps/admin-web apps/mini-program`、`pnpm-workspace.yaml` | Task 7.1 Monorepo 目录约定 | 容易误导开发者和脚本维护者 | 确认无引用后在后续工程收口批次删除空目录 | 是（非业务代码） | 否，运行 workspace 检查即可 | 否 |
| N-002 | 测试运行稳定性 | Node.js `v26.3.1` 下首次 `pnpm test` 在断言均通过后发生 Vitest worker 原生 `SIGABRT`，独立重跑通过 | 首轮与重跑命令日志；`package.json` 未声明 Node engines 或版本文件 | Task 7.1 技术版本与质量门禁 | CI/本地结果可能偶发不稳定，降低复现性 | 核对 CI Node 版本并固化受支持版本；重复运行确认后再决定是否升级 Vitest | 是（工程配置，若需） | 是，重复执行测试 | 否 |

### 6.4 Verified

| 编号 | 所属模块 | 现象 | 证据文件或命令 | 对应 SSOT | 风险 | 建议处理方式 | 代码修改 | 测试 | SSOT 冲突 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| V-001 | Monorepo | `admin`、`miniapp`、`api`、`database`、`shared` 均由 pnpm workspace 管理；正式依赖方向未发现循环，构建顺序可执行 | 所有 `package.json`、`pnpm-workspace.yaml`、`pnpm build` | Task 7.1/7.2 | 已验证项 | 保持现有依赖方向 | 否 | 已有构建验证 | 否 |
| V-002 | Web API 接入 | 基础资料、用户权限、采购、生产、验收、库存、出入库和跨境工作台通过共享 fetch 工具请求 `/api/v1`，未使用页面静态演示数据替代结果 | `apps/admin/components/master-data/*`、`components/workflow/*`、`lib/api-client.ts`、`lib/workflow.ts` | Phase 4；Task 6.2/6.3 | 已验证项 | 在补齐认证后继续复用统一客户端 | 否 | 已有页面测试，后续补集成测试 | 否 |
| V-003 | 后端分层 | 已实现接口由统一 Next Route 分派至 API Service，再到 Prisma Repository | `apps/admin/app/api/v1/[...segments]/route.ts`、`packages/api/src/*`、`packages/database/src/*` | `SYSTEM_SPEC.md`；API Master 统一规范 | 已验证项 | 补缺口时保持相同分层 | 否 | 已有 Service/Repository 测试 | 否 |
| V-004 | 权限与审计基础 | Service 使用 `requirePermission`，Repository 使用当前用户和角色数据范围，写操作调用 Audit Writer | `packages/api/src/authorization/*`、`packages/api/src/security/*`、`packages/database/src/auth/*`、`packages/database/src/audit/*` | `ROLE_PERMISSION_SPEC.md`；Task 6.3 | 已验证项；真实数据库仍待 O-001 | 保持服务端为最终权限边界 | 否 | 已有单元测试，后续补真实集成 | 否 |
| V-005 | 核心业务链路代码 | 采购、采购付款、生产、进度、完工、验收和正式入库均已有 Endpoint、Service 与 Prisma Repository 实现 | `packages/api/src/workflow/workflow.ts`、`packages/database/src/workflow/prisma-workflow-repository.ts`、Admin workflow 配置 | Task 6.2；Frozen API | 已验证实现存在，不等于真实 DB E2E 已通过 | 后续以集成测试验证，不重设计流程 | 否 | 需要补真实集成测试 | 否 |
| V-006 | 库存一致性基础 | 库存写入集中在 Prisma 事务，余额与流水同步变更，负库存和正式动作边界有代码与单元测试 | `packages/database/src/inventory-workflow/prisma-inventory-workflow-repository.ts`、`applyInventoryMovements`、相关测试 | `BUSINESS_RULES.md` 库存规则；Task 6.2 | 已验证代码与单元测试，真实并发仍待验证 | 保持禁止页面直接修改余额 | 否 | 后续补 PostgreSQL 并发/回滚集成测试 | 否 |
| V-007 | Prisma 静态一致性 | Schema 格式有效、Client 可生成、初始 Migration 存在，Mapping Audit 与 Frozen 数据库规模一致 | `pnpm db:validate`、`pnpm db:generate`、Schema、Migration、Mapping Audit | Frozen `DATABASE_SPEC.md` 与 `DATABASE_ENUM_SPEC.md` | 已验证静态基线 | 不修改 Schema；以真实数据库验证迁移 | 否 | 需要 O-001 环境 | 否 |
| V-008 | 环境变量安全 | `.env.example` 仅包含占位值，Git 忽略本地环境和生成物，未发现真实密码、令牌或业务数据 | `.env.example`、`.gitignore`、仓库文本检索 | `AGENTS.md` Git 与安全规则 | 已验证项 | 保持真实值仅在未跟踪环境 | 否 | 否 | 否 |
| V-009 | 质量门禁 | 冻结安装、状态检查、Lint、Typecheck、重跑测试、根构建及两端独立构建均可通过 | `pnpm install --frozen-lockfile`、`pnpm status:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`、两端构建 | Task 7.2 质量门禁 | 已验证项；N-002 记录首次偶发崩溃 | 每个 Batch 完整复跑 | 否 | 已执行 | 否 |

### 6.5 Out of Scope

| 编号 | 所属模块 | 现象 | 证据文件或命令 | 对应 SSOT | 风险 | 建议处理方式 | 代码修改 | 测试 | SSOT 冲突 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| O-001 | 真实数据库 | 当前工作环境没有用户提供的 PostgreSQL 实例，因此无法确认 `migrate status`、实际 Migration、Seed、数据库约束、事务并发和端到端审计结果 | 占位连接执行 `pnpm db:migrate:status` 返回 Schema engine error；健康检查 503 | Task 7.6 完成标准 | 这些项目不能视为 Verified | Batch A 建立隔离开发/测试数据库后执行，不使用真实业务数据 | 视后续结果 | 是 | 否 |
| O-002 | Phase 8 测试 | 全量测试方案、性能、安全专项和正式验收不属于本轮 Task 7.6 启动审计，也不得提前开始 Phase 8 | `ROADMAP.md` Phase 8 边界 | Frozen `ROADMAP.md` | 提前执行会跨阶段 | Task 7.6 只准备可运行基线，等待 Phase 7 Exit Gate 后另行启动 | 否 | 否 | 否 |

## 7. 审计统计

本轮共记录 21 项：

- Blocker：1；
- Major：7；
- Minor：2；
- Verified：9；
- Out of Scope：2。

未发现 Frozen SSOT 彼此之间的内容冲突。发现的差异均为代码或运行基线尚未覆盖正式 SSOT，已按问题记录，不修改 Frozen 文档。

## 8. Task 7.6 内部实施批次

内部 Batch 只用于 Task 7.6 实施组织，不进入 `CURRENT_STATUS.md`、`ROADMAP.md`、`PROJECT.md` 或 `README.md` 的正式状态。每个 Batch 必须独立 Commit、Push、GitHub 技术验收；未获验收不得开始下一个 Batch。

### Batch 7.6-A：运行基线与依赖联通

范围：

- 关闭 M-004、M-005、N-001、N-002；
- 建立无敏感值的环境配置与本地 PostgreSQL 开发/测试基线；
- 验证 Migration、Seed、Prisma Client、健康检查和双端启动；
- 固化 Node/pnpm 受支持版本与稳定测试运行方式；
- 为 O-001 中可在开发数据库验证的项目建立证据。

交付：

- 可重复的安装、数据库初始化、启动与健康检查说明；
- 安全、幂等的最小开发 Seed；
- 运行基线冒烟测试；
- 不涉及业务规则或 Frozen Schema 变更。

### Batch 7.6-B：认证权限与公共链路集成

范围：

- 优先关闭 B-001；
- 实现 Frozen `SEC-001` 至 `SEC-005`；
- 接入 Web 与 Mini Program 的登录、会话恢复、刷新、登出、当前用户及权限装载；
- 修复 M-006 的认证前依赖初始化和错误码边界；
- 验证角色、权限、仓库/店铺范围均由服务端强制执行。

交付：

- 双端可通过正式登录接口取得会话；
- 无令牌、坏令牌、过期令牌、刷新、登出和禁用用户均有自动化测试；
- 前端权限只用于显示控制，不能绕过服务端权限。

### Batch 7.6-C：核心业务模块端到端集成

范围：

- 补齐 M-001 中的基础资料、采购退货与 `INB-005` 实现；
- 关闭 M-002 与 M-003 中属于基础资料、采购、生产、验收、Dashboard 和统计的批准范围；
- 以真实测试数据库验证采购与生产两条链路至验收、入库；
- 不新增 Phase 6 未批准的功能。

交付：

- 已批准核心业务流程具备 Web/API/Prisma 端到端链路；
- Mini Program 已批准只读查询可用；
- Dashboard 与统计只按既有正式规格落地。

### Batch 7.6-D：库存、流水与跨境一致性收口

范围：

- 以真实 PostgreSQL 验证库存余额、流水、调拨、盘点、报损、国内出库、销售退货、跨境和海外库存；
- 验证事务回滚、幂等、并发和负库存保护；
- 验证审计字段、Audit Log 与来源单据链路；
- 关闭库存、出入库和跨境页面的双端集成缺口。

交付：

- 库存余额只能由正式业务动作与库存流水原子变更；
- 状态流转、来源单据、审计与库存事务可追溯；
- 不存在前端直接修改库存余额的路径。

### Batch 7.6-E：测试、构建与开发交付收口

范围：

- 补齐 M-001 中 `IMP-*`、`ATT-*`、`LOG-*` 公共能力；
- 关闭 M-007，形成核心 Route → Service → Repository → Prisma 集成测试；
- 清理剩余死链、占位和失效 import；
- 完整执行状态、Lint、Typecheck、Test、Build、Migration/Seed 和双端启动检查；
- 汇总仍需项目负责人书面批准延期的 Major。

交付：

- 335 个 Frozen API 的实现覆盖证据；
- 可重复的开发交付基线；
- Task 7.6 完成审查材料；
- 只准备进入 Phase 7 Final Consistency Review，不自行启动该 Review。

## 9. Task 7.6 完成标准

Task 7.6 只有同时满足以下条件，才具备申请完成与 GitHub 技术验收的资格：

1. Web、Mini Program、API 和数据库能够按正式架构运行；
2. 已批准核心业务流程具备端到端执行链路；
3. 不存在已知 Blocker；
4. Major 问题全部关闭，或经项目负责人书面批准延期；
5. 权限校验不能被前端绕过，服务端仍是最终权限边界；
6. 库存余额只能通过正式业务动作与库存流水原子变更；
7. Prisma Schema、Migration、Seed 与 Frozen 数据库设计一致；
8. 环境变量模板完整、不包含敏感信息，并有可复现启动说明；
9. `pnpm status:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build` 全部通过；
10. 根构建、Admin 独立构建、Mini Program 独立构建及数据库验证命令通过；
11. 正式 335 个 API 的实现覆盖、权限、错误码和审计证据完整；
12. 已知占位、死链和静态演示数据已清理，或者明确证明属于正式 Out of Scope；
13. 具备进入 Phase 7 Final Consistency Review 的条件；
14. 未提前启动 Phase 7 Final Consistency Review 或 Phase 8；
15. 未新增 Phase 6 未批准的新业务功能，未修改 Frozen SSOT。

## 10. 本轮结论

Task 7.6 已正式启动并进入 In Progress。本轮完成现状审计与实施计划固化，未执行任何业务代码、测试逻辑、Prisma Schema、Migration、Seed 或依赖修改。

下一步建议从 Batch 7.6-A 开始，先建立可重复的数据库、环境、Seed、启动和测试运行基线；该 Batch 必须在本轮 GitHub 技术验收通过并获得项目负责人明确指令后方可执行。

## 11. Batch 7.6-A 实施记录

### 11.1 实施范围

本次实施严格限定为运行基线与依赖联通：

- README 开发运行说明；
- `.env.example` 最小开发配置；
- Node 与 pnpm Engine；
- PostgreSQL 18 Compose 基线；
- Prisma 开发 Seed；
- 未登录请求认证前置边界；
- 历史空目录清理；
- 对应测试、CHANGELOG 与 DECISION LOG。

未修改 `CURRENT_STATUS.md`、`ROADMAP.md`、`PROJECT.md`、Frozen 业务规格、API 定义、Prisma Schema、Migration、页面功能、Mini Program 功能或 Dashboard。Task 7.6 保持 In Progress。

### 11.2 运行基线

| 项目 | 固化结果 |
| --- | --- |
| Node.js | 22.x；由 `.nvmrc` 与 `package.json#engines` 约束 |
| pnpm | 11.12.0；`packageManager` 与 Engine 均已声明 |
| PostgreSQL | 18.x；满足现有 Migration 的 `uuidv7()` 要求 |
| 容器基线 | `compose.yaml` 提供隔离 PostgreSQL 18、Health Check、端口与持久卷 |
| 环境变量 | `.env.example` 覆盖双端环境、数据库、JWT、Seed 与上传配置；真实 Secret 和管理员密码保持为空 |
| 数据库脚本 | 新增 `db:up`、`db:down`、`db:setup`，保留 Generate、Validate、Migration、Status 与 Seed 独立命令 |
| Seed | 环境变量驱动；创建 1 个 `administrator` 角色、244 个 Frozen 权限、完整管理员权限映射和 1 个开发管理员 |
| 认证边界 | 缺失或格式错误的 Bearer Header 在 JWT 与数据库依赖初始化前返回 401 |

### 11.3 真实 PostgreSQL 验证

使用本机隔离的 PostgreSQL 18.4 临时集群完成以下验证，未连接真实业务数据库：

1. `pnpm db:generate`：通过；
2. `pnpm db:validate`：通过；
3. `pnpm db:migrate:deploy`：初始 Migration 成功应用；
4. `pnpm db:migrate:status`：Database schema is up to date；
5. `pnpm db:seed` 连续执行两次：均通过；
6. 两次 Seed 后数据库计数保持：
   - `users = 1`；
   - `roles = 1`；
   - `permissions = 244`；
   - `user_roles = 1`；
   - `role_permissions = 244`；
7. 数据库可用时 `/api/health` 返回 HTTP 200 与 `database.connected`；
8. 数据库停止后 `/api/health` 返回 HTTP 503 与 `SYSTEM_SERVICE_UNAVAILABLE`；
9. 数据库可用或停止时，无 Authorization Header 的 `/api/v1/products` 均返回 HTTP 401 与 `AUTH_UNAUTHORIZED`。

开发 Seed 未输出、记录或提交管理员密码；测试使用的临时凭据和临时数据库不属于仓库内容。

### 11.4 问题关闭

本次关闭以下初始审计问题：

| 编号 | 关闭证据 |
| --- | --- |
| M-004 | README、`.env.example`、Compose 与数据库脚本形成可重复开发说明和最小配置 |
| M-005 | 幂等 Seed 建立正式管理员角色、244 权限、环境变量开发管理员及关系 |
| M-006 | 数据库不可用实测 Health 503、未登录 API 401；新增认证前置自动化测试 |
| N-001 | 无引用的两个历史空目录已删除 |
| N-002 | Node Engine 固定为 22.x，pnpm 固定为 11.x；不再把 Node 26 作为受支持运行基线 |
| O-001 | 隔离 PostgreSQL 18 已完成 Migration、Seed、Health 与认证边界真实验证 |

### 11.5 剩余问题

当前仍需后续内部 Batch 处理：

- B-001：Frozen 登录、刷新、登出、当前会话及当前权限 API 与双端会话链路；
- M-001：其余正式 API 实现覆盖；
- M-002：Mini Program 真实业务查询接入；
- M-003：Web Dashboard 与统计占位；
- M-007：核心业务真实 PostgreSQL 端到端集成测试；
- O-002：Phase 8 全量测试方案，继续保持 Out of Scope。

原有 V-001 至 V-009 继续保持 Verified。Batch 7.6-A 完成后停止，等待 GitHub 技术验收，不自行开始 Batch 7.6-B。
