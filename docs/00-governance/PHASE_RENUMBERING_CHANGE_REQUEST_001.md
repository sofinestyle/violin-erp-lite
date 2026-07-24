---
document_name: Phase Renumbering Change Request 001：平台基础阶段与十阶段路线
project: Violin ERP Lite
version: 1.1
status: Completed / Approved
owner: Project Manager
created_date: 2026-07-24
updated_date: 2026-07-24
related_phase: All Phases
---

# Phase Renumbering Change Request 001：平台基础阶段与十阶段路线

> 项目负责人已于 2026-07-24 正式批准本 Change Request。十阶段路线、Phase/Task 编号迁移、新 Phase 7 与 Task 7.1 的启动已在同一受控变更中完成；历史 Commit、执行基准和当时编号保持历史语义。

## 1. 变更背景

当前 Phase 7 同时承载工程基线、平台公共能力、业务应用开发和系统集成收口。Task 7.6 的实际审计进一步确认，认证授权、对象存储、附件、幂等、并发控制、后台任务、缓存、事件和可观测性具有跨模块、跨终端的基础平台属性。

继续把这些能力作为单个业务 Batch 的局部实现，会模糊平台 SSOT、应用开发和测试集成的阶段边界。为先完成平台基础，再恢复业务开发，并保留现有 Test Plan，本提案建议在 Functional Design 与 Application Development 之间插入独立 Platform Foundation 阶段，将路线从九阶段调整为十阶段。

本提案不改变任何已批准业务需求、数据库逻辑设计、API 契约、权限、页面或功能规格。

## 2. 变更前正式基线

本次迁移前的正式 SSOT 基线为：

- Frozen 路线：九个 Phase；
- Current Phase：Phase 7，In Progress；
- Current Task：Task 7.6，In Progress；
- Batch 7.6-C1：仅在 Task 7.6 与 CHANGELOG 中记录为 `Paused / Persistence SSOT Conflict`；
- Database Logical Design：v2.1，Completed / Approved / Frozen；
- API Master Specification：v1.3，Completed / Approved / Frozen；
- 正式 API 总数：335；
- Phase Renumbering 尚未生效。

## 3. 批准的十阶段正式路线

| Phase | 中文名称 | English Name | 正式状态 |
| --- | --- | --- | --- |
| Phase 1 | 业务需求分析 | Business Analysis | 保持现状 |
| Phase 2 | 业务流程设计 | Business Process | 保持现状 |
| Phase 3 | 数据库设计 | Database Design | 保持现状 |
| Phase 4 | 页面设计 | UI / Page Design | 保持现状 |
| Phase 5 | 接口设计 | API Design | 保持现状 |
| Phase 6 | 功能详细设计 | Functional Design | 保持现状 |
| Phase 7 | 平台基础 | Platform Foundation | In Progress |
| Phase 8 | 应用开发 | Application Development | Waiting / Not Started |
| Phase 9 | 测试方案与系统集成 | Test Plan & System Integration | Waiting / Not Started |
| Phase 10 | 发布与验收 | Release & Acceptance | Waiting / Not Started |

Phase 1 至 Phase 6 的编号、顺序、完成状态和正式成果不变。新增 Phase 7 后，原 Phase 7 至 Phase 9 按第 6 节迁移。

## 4. Phase 7 Platform Foundation 边界

### 4.1 目标

Platform Foundation 只负责建立所有应用和业务模块共用的技术能力及正式运行边界：

- 统一身份认证、授权和实时权限校验；
- 二进制对象存储与文件生命周期；
- 附件公共框架；
- 通用幂等、并发认领和重放保护；
- 分布式锁与后台任务；
- 缓存与事件基础设施；
- 审计、请求追踪和可观测性；
- 对已有相关能力进行盘点、迁移、补缺和一致性验证。

它不新增 Phase 6 未批准的业务功能，不修改 Frozen 业务规则，不自行改变数据库/API/权限 SSOT。发现正式结构缺口时继续通过独立 DCR 或 API Change Request 处理。

### 4.2 正式 Task 规划

正式规划如下。本次只创建并启动 Task 7.1；Task 7.2 至 Task 7.9 保持 Waiting / Not Started：

1. Task 7.1 Platform Baseline & Existing Capability Audit；
2. Task 7.2 Authentication & Authorization；
3. Task 7.3 Object Storage & File Lifecycle；
4. Task 7.4 Attachment Framework；
5. Task 7.5 Idempotency & Concurrency Control；
6. Task 7.6 Background Job & Distributed Lock；
7. Task 7.7 Cache & Event Infrastructure；
8. Task 7.8 Audit, Trace & Observability；
9. Task 7.9 Platform Final Consistency Review。

`Task 7.9` 是 Phase 7 的普通正式 Task，当前为 Waiting / Not Started；不得提前启动。

### 4.3 已有能力处理

- 已完成的认证、授权、运行基线、审计、上传和其他公共成果不删除、不重做；
- Phase 7 启动后先由 Task 7.1 审计现有成果与正式平台 Task 的映射；
- 符合正式 SSOT 和验收证据的成果直接迁移或引用；
- 仅对缺口、冲突或未形成公共框架的部分提出后续实施；
- 不通过迁移改写历史 Commit，也不把历史完成状态伪装成新完成状态。

## 5. 正式状态迁移结果

本次受控变更已原子同步：

- Current Phase：Phase 7 Platform Foundation；
- Phase 7 Status：In Progress；
- Phase 8 Application Development：Waiting / Not Started；
- Phase 9 Test Plan & System Integration：Waiting / Not Started；
- Phase 10 Release & Acceptance：Waiting / Not Started；
- 原 Task 7.6 已迁移为 Task 8.6，不在 Phase 7 完成前恢复 Phase 8 业务开发；
- Current Task：Task 7.1 Platform Baseline & Existing Capability Audit，In Progress；
- Batch 状态只保留在对应 Task 文档和 CHANGELOG，不写入 `CURRENT_STATUS.md`、`ROADMAP.md`、`PROJECT.md` 或 `README.md`。

Phase 7 未完成并批准前，不得把 Phase 8 标记为 In Progress。

## 6. 历史 Phase 与 Task 迁移

### 6.1 原 Phase 7

原 Phase 7“开发规范与 Codex 执行”迁移为 Phase 8“Application Development”历史与实施基线：

| 当前编号 | 批准后编号 |
| --- | --- |
| Phase 7 | Phase 8 |
| Task 7.1 | Task 8.1 |
| Task 7.2 | Task 8.2 |
| Task 7.3 | Task 8.3 |
| Task 7.4 | Task 8.4 |
| Task 7.5 | Task 8.5 |
| Task 7.6 | Task 8.6 |
| Phase 7 Final Consistency Review | Phase 8 Final Consistency Review |

现有 Task 的内容、完成/批准事实、Git 历史、技术证据和内部 Batch 记录均保留。批准同步时只调整治理编号、路径、标题和引用，不重新执行已完成 Task。

原 Batch 7.6-C1 在对应 Task 迁移后改称 Batch 8.6-C1；其状态只记录在 Task 8.6 文档与 CHANGELOG。

### 6.2 原 Phase 8

原 Phase 8 Test Plan 不删除，迁入 Phase 9“Test Plan & System Integration”，保留原目标、输出、进入条件和测试范围，并增加验收前系统集成职责。

### 6.3 原 Phase 9

原 Phase 9 Acceptance & Release 顺延为 Phase 10 Release & Acceptance。验收、数据初始化、上线检查、发布、培训、上线观察和正式交付内容不删除。

## 7. Phase 9 Test Plan & System Integration

Phase 9 正式统一覆盖：

- 测试方案和测试环境；
- 单元测试、Repository 测试和 API 集成测试；
- Web、Mini Program、API、数据库及共享包系统联调；
- 核心业务端到端与库存一致性测试；
- 权限、幂等、并发、审计和异常恢复测试；
- 性能、安全、故障恢复和回归测试；
- 用户测试及进入 Release & Acceptance 前的验收准备。

原 Phase 8 Test Plan 的内容继续作为正式输入。迁移后的 Task 8.6 中“开发收口”的集成修复仍属于 Application Development；Phase 9 的 System Integration 负责在开发完成后执行独立验证、跨系统联调和测试问题闭环，两者不得重复计算完成状态。

## 8. 本次正式同步范围

本次受控迁移允许并已按需修改：

- `ROADMAP.md`；
- `PROJECT.md`；
- `README.md`；
- `docs/00-governance/CURRENT_STATUS.md`；
- `docs/00-governance/DECISION_LOG.md`；
- `CHANGELOG.md`；
- Phase 7 至 Phase 10 的全部历史文档、目录、标题、Front Matter 与交叉引用；
- 原 `TASK_7_x` 至 `TASK_8_x` 文件及引用；
- 原 Phase 8 Test Plan 内容至 Phase 9；
- 原 Phase 9 Acceptance & Release 内容至 Phase 10；
- 状态检查脚本和只用于文档一致性校验的非业务配置（如编号变更导致其必须同步）。

同步必须先建立完整文件清单与引用审计，使用可复核的机械迁移规则；不得无差别替换数据库版本、API 编号、错误码、历史日期、Commit SHA 或与 Phase 编号无关的数字。

## 9. 不变事项

本提案及批准后的编号迁移均不得：

- 修改 `BUSINESS_RULES.md` 的 Frozen 业务规则；
- 修改 Database Logical Design、Prisma Schema、Migration、Seed 或 Mapping Audit；
- 修改 API Master Specification、API 路径、编号、DTO、权限、错误码或总数；
- 修改页面功能、业务代码、测试逻辑或数据库数据；
- 删除、压缩或伪造已完成工程成果；
- 重写、删除或变基历史 Commit；
- 把 Batch 写入正式状态治理文件；
- 在 Platform Foundation 完成前继续 Application Development；
- 把 Proposed 的 DCR-004 或 API CR-004视为已批准。

API 总数继续为 335。Database 继续为 v2.1、API 继续为 v1.3，除非各自 Change Request 独立批准并同步。

## 10. 影响分析

### 10.1 治理与文档

- 固定九阶段改为固定十阶段，`ROADMAP.md` 的路线冻结说明、进入/完成条件和引用必须整体更新；
- 当前状态入口需切换至新 Phase 7，原 Task 编号需保留可追溯映射；
- Phase 7 至 Phase 9 的目录、文件名、标题、Front Matter 和正文引用存在全局迁移；
- DECISION_LOG 必须记录批准决定、迁移边界和生效 Commit；
- CHANGELOG 必须区分“提案”“批准同步”和后续 Task 迁移，不能把本提案写成已生效。

### 10.2 实施与进度

- 当前业务开发保持暂停；
- 新 Phase 7 优先盘点并固化平台能力，可能延后应用开发恢复时间；
- 已完成开发成果可复用，降低重复实现风险；
- DCR-004、API CR-004 与平台幂等能力存在依赖，但仍需分别批准；
- Phase 9 合并 Test Plan 与 System Integration 后，需要在批准同步中定义阶段 Exit Gate，避免开发集成与独立测试职责重叠。

### 10.3 Git 与追溯

- 文件移动应保留 Git rename 可识别性，避免同时大幅改写正文；
- 历史 Commit SHA、原始执行基准和当时的 Phase 编号属于历史事实，不应机械改写；
- 文档应提供旧编号到新编号映射，保证外部链接和验收记录可追溯；
- 不删除历史分支、Tag 或 Commit。

## 11. 批准与执行记录

1. ChatGPT 已完成提案技术审查；
2. 项目负责人已正式批准；
3. 本次执行 Phase Renumbering Documentation Sync；
4. 原子同步 ROADMAP、CURRENT_STATUS、PROJECT、README；
5. 同步 DECISION_LOG、CHANGELOG、Phase/Task 文件及全部引用；
6. 运行全局 Phase/Task 引用审计与全部质量检查；
7. 独立 Commit、Push，等待 GitHub 技术验收；
8. Task 7.1 已按项目负责人指令正式启动，但本次不实施平台业务代码。

GitHub 技术验收完成前停止后续实现，也不得恢复 Phase 8 业务开发。

## 12. 风险

- 全局字符串替换可能误改 API 编号、数据库版本、历史 Commit 或业务数字；
- 历史文件路径移动会使外部链接失效；
- 新旧 Task 编号并存期间可能形成双重状态来源；
- Platform Foundation 与 Application Development 的已有公共能力边界可能重叠；
- Phase 9 的开发集成修复与独立系统测试可能重复；
- 若未先迁移状态检查规则，正式状态文件可能暂时不一致；
- 若未原子同步正式 Task 规划，会造成新旧状态并存。

上述风险已纳入本次同步的引用审计与质量检查。

## 13. 项目负责人批准事项

1. 九阶段改为十阶段及第 3 节完整路线；
2. 新 Phase 7 Platform Foundation 的目标和 In Progress 状态；
3. Phase 8 Application Development 保持 Waiting / Not Started；
4. 原 Phase 8 Test Plan 合并到 Phase 9 Test Plan & System Integration；
5. 原 Phase 9 顺延为 Phase 10 Release & Acceptance；
6. 原 Phase 7 / Task 7.x 到 Phase 8 / Task 8.x 的历史映射；
7. Platform Foundation 九项正式 Task，Task 7.9 为普通正式 Task；
8. Current Task 为 Task 7.1，状态为 In Progress；
9. 第 8 节允许同步范围和第 11 节执行顺序；
10. Platform Foundation 完成前持续暂停 Application Development。

## 14. 完成结论

Phase Renumbering Change Request 001 状态为 **Completed / Approved**。Frozen ROADMAP 已升级为十阶段路线；Phase 7 Platform Foundation 与 Task 7.1 均为 In Progress，Phase 8 至 Phase 10 均为 Waiting / Not Started。

本次只修改治理文档、Phase/Task 文件路径、标题、编号引用和状态检查配置。Database v2.1、API v1.3、335 个正式 API、DCR-004 与 API CR-004 的 Proposed / Pending Approval 状态均保持不变；未修改业务代码、数据库、API、Prisma、Migration、Mapping Audit 或测试逻辑。
