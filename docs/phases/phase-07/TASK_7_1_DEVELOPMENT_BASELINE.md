---
document_name: Task 7.1 开发基线与工程初始化
version: 1.0
status: In Progress
project: Violin ERP Lite
owner: Project Manager
created_date: 2026-07-22
updated_date: 2026-07-22
related_phase: Phase 7
---

# Task 7.1：开发基线与工程初始化（Development Baseline & Project Initialization）

## 1. 文档目的与任务边界

本文建立 Violin ERP Lite 的技术架构、技术栈、Monorepo 目录、工程规范、开发顺序和职责边界，作为 Phase 7 后续工程实施的统一基线。

Phase 7 与 Task 7.1 当前状态均为 In Progress。Task 7.1 只形成开发基线文档和项目状态同步，不创建目录、源代码、真实 API Route、Prisma Schema、Migration、Seed、数据库对象或业务功能，不安装依赖，不提前执行 Task 7.2。

实现必须依次服从以下正式事实来源：

```text
Frozen BUSINESS_RULES
→ Frozen Database Logical Design v1.1
→ Approved Phase 4 页面设计
→ Frozen API Master Specification v1.1（315 个正式 API）
→ Frozen Phase 6 Functional Specification
→ 本 Task 的技术基线
```

技术实现无法映射 Approved/Frozen 内容时，必须停止冲突部分并发起正式 DCR 或 Change Request；不得通过代码、临时字段、JSON、备注、客户端缓存或非正式接口绕过。

## 2. 技术架构

系统采用 Monorepo 管理 PC 管理端、微信小程序、后端接口实现和共享包。PC 与微信小程序共用同一套后端、PostgreSQL 数据库、业务规则、API 契约和权限体系。

```text
PC 管理端（Next.js） ─┐
                     ├→ Next.js Route Handler → 应用服务 → Prisma → PostgreSQL
微信小程序（Taro） ──┘                         ↘ 日志、错误、权限与共享能力
```

- PC 管理端负责复杂查询、基础资料维护、批量导入、数据清理和报表导出；
- 微信小程序只面向内部用户，复用相同 API 和 RBAC 权限结论；
- Next.js Route Handler 是唯一后端 HTTP 入口，路径、方法、请求、响应和错误码必须映射 Frozen API Master Specification v1.1；
- 业务规则由服务端执行，前端不得直接连接数据库或把客户端状态作为正式事实；
- Prisma 只负责 Frozen Database Logical Design v1.1 到 PostgreSQL 的物理映射，不得改变逻辑表、字段、关系、状态或业务对象；
- JWT 负责认证上下文，RBAC 负责功能、操作、记录、仓库、店铺和字段权限；前端隐藏按钮不能替代服务端授权；
- 库存、状态、审批、导入、附件和审计等高风险写入必须遵守 Frozen API 的事务、幂等、并发和日志规则。

## 3. 技术栈

| 层级 | 正式技术基线 | 用途与限制 |
| --- | --- | --- |
| PC 管理端 | Next.js、React、TypeScript | PC 页面、交互及同仓后端入口；不得改写 Approved 页面和 Frozen 业务规则 |
| 微信小程序 | Taro、React、TypeScript | 内部微信小程序；不得建立平行用户、权限、API 或数据源 |
| 后端 | Next.js Route Handler | 实现 `/api/v1` Frozen API；不得新增、删除、重编号或改义 315 个正式 API |
| ORM | Prisma | 映射 Frozen Database Logical Design v1.1；不得先行创建或改变逻辑结构 |
| 数据库 | PostgreSQL | 作为系统正式数据库；物理实现须保持全部 Frozen 逻辑约束与历史保护 |
| UI | Tailwind CSS、shadcn/ui | 实现 Approved PC 视觉与组件规范；业务语义不得固化在展示组件中 |
| 认证与授权 | JWT、RBAC | 统一 PC 与微信身份及权限；不得新增认证数据库字段或平行权限对象 |
| 工程组织 | Monorepo | 统一依赖、脚本、类型、质量门禁和版本管理 |

具体运行时版本、包管理器、测试框架、校验库和部署环境由后续获批准 Task 在兼容本基线的前提下锁定；未经批准不得安装依赖。

## 4. Monorepo 目录结构

推荐结构如下，本 Task 仅记录设计，不创建目录：

```text
apps/
  admin/                 # Next.js PC 管理端与 Route Handler
  miniapp/               # Taro 微信小程序
packages/
  api/                   # Frozen API 的共享类型、校验与服务边界映射
  database/              # Prisma 与 PostgreSQL 物理映射（后续 Task）
  shared/                # 无业务事实的共享类型、工具与常量
docs/                    # Approved/Frozen 规格、阶段文档与治理记录
```

允许在仓库根目录增加必要的工作区配置、质量工具配置和环境变量示例，也允许在各应用或包内部按职责增加 `src`、`tests` 等工程目录，但必须遵守以下边界：

- 不增加与 `admin`、`miniapp` 平行的第三客户端；
- 不增加与 `api`、`database`、`shared` 平行的业务事实来源；
- `packages/api` 只能映射 Frozen API，不形成第二套接口定义；
- `packages/database` 只能映射 Frozen 数据库，不形成第二套数据模型；
- `packages/shared` 不得承载库存余额、单据状态或权限判定等服务端正式事实；
- 业务模块目录只能在对应 Phase 7 Task 获得批准后创建。

## 5. 编码与命名规范

### 5.1 通用规范

- 代码使用 TypeScript 严格模式，禁止无说明的 `any`；
- 变量、函数、类、数据库映射和 API 字段使用英文；正式文档和页面默认使用中文（简体）；
- 文件和目录使用小写英文及短横线，React 组件使用 PascalCase，函数和变量使用 camelCase，常量使用 UPPER_SNAKE_CASE；
- 数据库表和字段保持 Frozen snake_case，JSON 字段保持 Frozen lowerCamelCase；
- API 路径保持小写复数名词和短横线，不得因代码组织改变正式路径；
- 状态、错误码、权限码和枚举必须引用正式常量，不得散落硬编码或创造同义值；
- 公共逻辑进入共享层前必须确认确属跨端或跨模块能力，禁止为复用而混合业务边界；
- 注释解释约束、原因和风险，不重复描述显而易见的代码。

### 5.2 分层原则

- Route Handler 负责协议适配、身份入口、请求解析和统一响应，不直接堆叠业务规则；
- 应用服务负责用例编排、权限、状态、幂等和事务边界；
- 数据访问层只执行经批准的数据映射，不承载页面规则；
- 前端组件负责展示和交互，不直接生成正式编号、状态、库存或审计事实；
- PC 与微信可共享类型和无状态工具，但不得共享依赖具体运行环境的实现。

## 6. Git Commit 规范

提交信息使用英文 Conventional Commits 风格：

```text
<type>(optional-scope): <purpose>
```

允许的主要类型包括 `docs`、`chore`、`feat`、`fix`、`refactor`、`test` 和 `build`。提交必须说明修改目的，禁止使用 `update`、`fix`、`修改` 等模糊信息。

- 每个提交只包含一个可审查目的；
- 只暂存当前 Task 授权文件，不使用无范围确认的批量暂存；
- 不提交密钥、真实业务数据、构建产物或本地环境文件；
- 提交前至少执行适用 lint、类型检查、测试和 `git diff --check`；
- 推送后核对本地与远程 Commit SHA；
- 每个 Task 推送后等待 ChatGPT GitHub 验收和项目负责人批准，方可进入下一 Task。

## 7. Branch 规范

- 默认开发分支使用 `codex/phase-7-task-7-x-short-description`；
- 分支必须从最新 `origin/main` 创建，并在工作前确认无未授权修改；
- 一个分支原则上对应一个 Task 或一个经批准的独立修复；
- 未经项目负责人明确授权不得直接推送 `main`；
- 合并前必须通过适用质量门禁、代码审查和文档一致性检查；
- 禁止将下一 Task 的代码、依赖或目录混入当前分支；
- 紧急修复仍须遵守 Frozen 事实来源和正式变更流程。

## 8. 环境变量规范

- 环境变量名称使用 UPPER_SNAKE_CASE；
- 仓库只提交不含真实值的 `.env.example`，不得提交 `.env`、密钥、Token、密码或生产连接字符串；
- 服务端变量与客户端公开变量严格分离；只有明确可公开值才可使用 `NEXT_PUBLIC_` 或 Taro 客户端公开前缀；
- 数据库连接、JWT 密钥、文件存储凭证和第三方凭证只能在服务端运行环境读取；
- 应用启动时校验必需变量，缺失或格式错误时快速失败，不使用不安全默认值；
- 开发、测试、预发布和生产环境分别配置，不通过代码分支硬编码环境差异；
- 日志和错误响应不得输出环境变量原值；
- 环境变量只配置技术运行参数，不得把 Frozen 业务规则、状态机、权限结论或 API 契约转化为可覆盖配置。

## 9. 日志规范

- 应用日志使用结构化记录，至少包含时间、级别、服务、环境、Request ID、动作和结果；
- 请求链路沿用 Frozen API 的 `X-Request-ID`，适用时关联 Trace ID 和 Correlation ID；
- 日志级别统一为 `debug`、`info`、`warn`、`error`，生产环境不得依赖 `debug` 记录业务事实；
- 登录、状态动作、权限拒绝、库存事务、导入、导出、附件及敏感操作必须映射正式审计规则；
- 密码、JWT、Cookie、密钥、数据库连接、完整个人信息、SQL、堆栈和内部路径不得进入对外响应或未脱敏日志；
- 审计日志只追加，业务日志不得替代 Frozen `audit_logs` 正式事实；
- 不新增日志表、日志 API 或平行日志对象；如现有 Frozen 对象无法支撑必须停止并走变更流程。

## 10. 错误处理规范

- 所有 Route Handler 使用 Frozen API 的统一成功与失败包装；
- 错误码仅使用 API Master Specification v1.1 已批准分类和语义，不得将内部异常文本作为正式错误码；
- 400、401、403、404、409、422、429、500 和 503 按 Phase 6 统一规则处理；
- 校验错误定位到字段或明细，权限错误不得泄露目标是否存在；
- 未预期异常统一转换为安全系统错误并保留 Request ID，禁止暴露 SQL、数据库结构、堆栈、路径或凭证；
- 库存和其他高风险事务任一步失败必须整体回滚，不得留下部分余额、流水、累计、状态或审计结果；
- 网络结果不确定时先查询正式结果，禁止无条件重放写操作；
- 客户端只展示安全、可执行的提示，不通过本地状态伪造成功。

## 11. Codex 执行边界与 Phase 7 开发原则

1. 每次工作前读取 GitHub `main` 最新 Approved/Frozen 文档；
2. 只执行当前已批准 Task，不提前执行下一 Task；
3. 一个功能只能有一个正式数据来源，PC 与微信不得形成平行实现规则；
4. API Route、Prisma 映射和页面行为必须可追溯到正式 API、数据库与 Phase 6 功能条目；
5. 不直接修改库存余额，不绕过状态、权限、审计、幂等或历史保护；
6. 不新增表、字段、关系、状态、业务对象、页面或 API；发现缺口立即停止并报告；
7. 先更新并批准文档，再编写相应代码；
8. 重要业务逻辑必须有测试，测试不能替代 Frozen 规则；
9. 修改范围、验证结果和风险必须在每次提交报告中明确；
10. 每个 Task 完成后推送 GitHub，等待 ChatGPT GitHub 验收和项目负责人批准；
11. 不提交敏感信息、真实经营数据或未经批准的依赖；
12. Task 7.1 期间不得创建代码、目录、依赖或执行 Task 7.2。

## 12. Phase 7 六个 Task 的开发顺序

Phase 7 采用“6 个 Task + 独立 Final Consistency Review”结构。每个 Task 必须依次完成 GitHub 验收和批准，Final Consistency Review 是 Phase Exit Gate，不作为 Task 7.7。

| 顺序 | Task | 内容 | 当前状态 |
| --- | --- | --- | --- |
| 1 | Task 7.1 开发基线与工程初始化 | 确认架构、技术栈、目录、规范、执行顺序和职责；只形成文档 | In Progress |
| 2 | Task 7.2 Monorepo 工程骨架与质量门禁 | 创建工作区、应用/包骨架、基础脚本、lint、类型检查和测试门禁；不实现业务功能 | Waiting / Not Started |
| 3 | Task 7.3 数据持久化与后端公共基础 | 按 Frozen 数据库建立 Prisma/PostgreSQL 物理映射，并实现 Route Handler、JWT、RBAC、日志和错误处理基础 | Waiting / Not Started |
| 4 | Task 7.4 双端应用壳层与公共能力 | 实现 PC/微信公共壳层、导航、认证流程及 Phase 6 已批准公共能力 | Waiting / Not Started |
| 5 | Task 7.5 核心业务功能实现 | 按依赖顺序实现基础资料、采购、生产与验收、库存、出入库与调拨、跨境业务 | Waiting / Not Started |
| 6 | Task 7.6 系统集成与开发收口 | 完成双端集成、回归修复、安全与一致性加固、文档同步和 Phase 8 测试准备 | Waiting / Not Started |
| Gate | Phase 7 Final Consistency Review | 核对实现、测试和文档与全部 Approved/Frozen 事实来源一致 | Waiting / Not Started |

上述内容只定义顺序和边界，不代表 Task 7.2 至 Task 7.6 已获启动授权。

## 13. 职责边界

| 角色 | 主要职责 | 不承担或不得执行 |
| --- | --- | --- |
| 项目经理（Project Manager） | 业务确认、阶段启动、排期协调、测试组织、GitHub 验收确认和最终批准 | 不承担技术方案判断，不直接替代产品或工程评审 |
| ChatGPT 产品经理（Product Manager） | 制定与评审技术方案、拆分 Task、维护产品与技术规格映射、定义验收标准、执行 GitHub 文档与实现验收 | 不以聊天记忆覆盖 Frozen 文档，不直接批准自身未获授权的业务变化 |
| Codex（Software Engineer） | 严格按正式文档实现、测试、审查、同步文档、提交并推送 GitHub，报告冲突和风险 | 不自行改变业务规则、数据库、API、业务对象、Task 顺序或阶段状态 |

技术方案由 ChatGPT 产品经理负责制定与评审，Codex 负责实现；项目经理负责业务确认、测试和最终批准。任何角色发现实现与 Frozen 事实来源冲突时，都必须停止冲突部分并进入正式变更流程。

## 14. Task 7.1 验收标准

1. 技术架构和技术栈与项目负责人授权完全一致；
2. Monorepo 目录保留 `apps/admin`、`apps/miniapp`、`packages/api`、`packages/database`、`packages/shared` 和 `docs`；
3. 编码、Git、Branch、环境变量、日志和错误处理规范完整；
4. Codex 边界、Phase 7 原则、六个 Task 顺序和三方职责明确；
5. Phase 6 保持 Completed / Approved / Frozen；
6. Phase 7 与 Task 7.1 更新为 In Progress；
7. 技术开发仅进入开发规范阶段，业务编码尚未开始；
8. BUSINESS_RULES、Database Logical Design v1.1、API Master Specification v1.1 和 Phase 6 Functional Specification 未修改；
9. 正式 API 总数保持 315；
10. 未创建源代码、工程目录、Schema、Migration、Seed 或依赖；
11. 未提前执行 Task 7.2；
12. 当前下一步为 Task 7.1 GitHub 验收。

## 15. 当前结论

项目负责人已正式批准 Phase 7 启动。Phase 7 状态为 In Progress，Task 7.1 状态为 In Progress；本 Task 已形成待 GitHub 验收的开发基线文档。

本次未修改 Frozen 业务规则、数据库逻辑设计、API Master Specification v1.1、315 个正式 API 或 Phase 6 功能规格，未新增业务对象、数据库结构或业务流程，未编写业务代码。当前下一步仅为 Task 7.1 GitHub 验收，未经批准不得启动 Task 7.2。
