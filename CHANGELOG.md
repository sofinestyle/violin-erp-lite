---
document_name: 项目变更记录
project: Violin ERP Lite
version: 1.0
status: Draft
owner: Project Manager
created_date: 2026-07-19
updated_date: 2026-07-20
related_phase: Phase 1
---

# CHANGELOG

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
