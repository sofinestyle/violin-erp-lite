---
document_name: 正式决策记录
project: Violin ERP Lite
version: 1.0
status: Approved
owner: Project Manager
created_date: 2026-07-19
updated_date: 2026-07-22
related_phase: Phase 1
---

# DECISION LOG

## DEC-001 GitHub仓库公开

决定：

- 仓库设为 Public；
- 便于 ChatGPT 和项目负责人检查 Codex 提交；
- 不得提交敏感数据。

## DEC-002 双端系统

决定：

- 同时规划微信小程序和 PC 管理端；
- 两端共用后端和数据。

## DEC-003 仓库结构

决定：

- 一个公司实际仓；
- 每个厂家独立厂家仓；
- 海外仓 Excel 定期导入。

## DEC-004 国内销售管理边界

决定：

- 国内电商逐单登记出库；
- 不建设完整销售订单模块。

## DEC-005 产品粒度

决定：

- 沿用现有 SKU 编码；
- 不管理单琴序列号；
- 套装作为独立 SKU 整体管理。

## DEC-006 采购及验收

决定：

- 采购统一人民币；
- 记录采购付款；
- 入库前强制质量验收；
- 不设独立质检角色。

## DEC-007 库存控制

决定：

- 单级审核；
- 禁止负库存；
- 支持安全库存预警；
- 不管理库位。

## DEC-008 历史数据迁移

决定：

- 只导入期初库存；
- 不导入全部历史流水。

## DEC-009 正式启用项目治理文档

### 状态

Approved

### 日期

2026-07-19

### 决定

以下文档正式作为 Violin ERP Lite 项目治理依据生效：

- `PROJECT.md`
- `AGENTS.md`
- `DOCUMENT_PRIORITY.md`
- `DEVELOPMENT_WORKFLOW.md`
- `CHANGE_CONTROL.md`
- `DECISION_LOG.md`

### 原因

上述文档已经完成项目治理规则确认，继续标记为 Draft 会造成其是否具备约束效力的歧义。

### 影响

Codex 后续执行任何任务前，必须读取并遵守上述治理文档。

本次调整不改变任何 Frozen 业务规则，不代表 Phase 2 开始，也不涉及数据库、技术架构或业务开发。

## DEC-010 固定九阶段开发路线

### 状态

Approved

### 日期

2026-07-19

### 决定

Violin ERP Lite 采用固定九阶段开发路线。

九个阶段的名称、顺序和范围正式冻结。未经项目负责人确认，不得增加、删除、合并、拆分、重命名、调整顺序或跳过任何 Phase。

### 影响

- `ROADMAP.md` 状态更新为 Frozen；
- 所有 AI 必须读取当前 Phase；
- 所有任务必须符合当前 Phase 边界；
- Phase 1 完成后，下一阶段固定为 Phase 2 业务流程设计。

## DEC-011 中文作为项目主要语言

### 状态

Approved

### 日期

2026-07-19

### 决定

中文（简体）作为项目文档、产品内容、页面文案和 AI 汇报的主要语言。

### 补充

代码命名、数据库字段、API 字段和 Git Commit 使用英文。

### 影响

- 后续正式文档优先使用中文；
- 专业术语首次出现可附英文；
- 不得无理由将项目整体转为英文。

## DEC-012 Phase 1正式关闭

### 状态

Approved

### 日期

2026-07-19

### 决定

Phase 1 业务需求分析、业务规则冻结、项目治理体系及开发路线治理已全部完成。

### 当前状态

- Phase 1：Closed
- Phase 2：Not Started
- Development：Not Started

## DEC-013 正式启动Phase 2并确认Task 2.1

### 状态

Approved

### 日期

2026-07-19

### 决定

项目负责人正式启动 Phase 2：业务流程设计（Business Process Design），Phase 2 状态更新为 In Progress。

Task 2.1：系统模块划分（Module Breakdown）正式认定为 Completed。第一版确认以下九个一级模块：

1. 基础资料；
2. 采购管理；
3. 生产管理；
4. 库存管理；
5. 出入库管理；
6. 跨境业务；
7. 统计分析；
8. 用户权限；
9. 系统设置。

“出入库管理”名称保持不变，不改为“库存作业”。

### 影响

- `ROADMAP.md` 中 Phase 2 状态更新为 In Progress；
- Task 2.1 状态为 Completed；
- Task 2.2 模块职责设计以 Reviewed 状态进入项目文档，等待项目负责人确认；
- 当前任务为 Task 2.2；
- Task 2.2 确认后方可进入 Task 2.3 模块关系设计；
- 技术开发和数据库设计继续保持 Not Started。

## DEC-014 采购管理与生产管理平行

### 状态

Approved

### 日期

2026-07-19

### 决定

- 采购管理与生产管理不存在上下级关系；
- 采购单不生成生产单；
- 生产单不要求关联采购单；
- 直接采购和委外生产分别独立创建；
- 两条流程在质量验收节点汇合；
- 质量验收不新增一级模块。

### 影响

本决定作为后续业务流程和数据库设计的正式依据。本次仅确认业务关系，不启动数据库设计，也不改变任何 Frozen 业务规则。

## DEC-015 采用五类核心业务生命周期

### 状态

Approved

### 日期

2026-07-19

### 决定

- Task 2.4 采用业务生命周期设计；
- 五类核心生命周期为产品、采购、委外生产、跨境和库存；
- 生命周期作为后续状态流转、数据库和功能详细设计的业务依据；
- 生命周期设计不新增一级模块；
- 本期不建立独立采购需求模块；
- 本期不管理完整海外销售订单；
- 本期不管理单把小提琴生命周期；
- 采购和委外生产的付款状态与各自业务完成状态分离。

### 影响

Task 2.4 状态更新为 Completed / Approved。Phase 2 继续保持 In Progress，Task 2.5 状态流转设计保持 Not Started；本决定不启动状态机详细设计、数据库设计或技术开发。

## DEC-016 Task 2.6调整为业务对象定义

### 状态

Approved

### 日期

2026-07-19

### 决定

- Task 2.6 由“输入输出分析”调整为“业务对象定义（Business Object Definition）”；
- 业务对象定义更符合当前产品设计阶段的任务目标；
- 本次调整不新增或删除 Task，不改变 Task 顺序；
- 本次调整不改变固定九阶段开发路线；
- Task 2.6 负责定义核心业务对象、用途、业务关系、生命周期和状态关联，以及对象的业务输入和输出；
- Task 2.6 不进入数据库表、字段、主键、外键、索引、API、页面或技术实现设计；
- Task 2.6 作为 Phase 3 数据库设计的业务输入。

### 影响

Task 2.6 保持 Not Started。项目进度记录和后续任务名称统一使用“业务对象定义（Business Object Definition）”，不得在未获正式启动前编写 Task 2.6 正文。

## DEC-017 采用多维业务状态体系

### 状态

Approved

### 日期

2026-07-19

### 决定

- 审核状态、执行状态、库存状态、付款状态和异常状态分别管理；
- 不使用单一笼统状态表达全部业务含义；
- 付款完成不代表采购或生产业务完成；
- 发货完成不代表海外收货完成；
- 所有关键状态转换必须保留操作人、时间和原因等追溯记录。

### 影响

Task 2.5 状态更新为 Completed / Approved。多维业务状态体系作为后续业务对象定义、数据库设计和功能详细设计的业务依据；本次不进入数据库或技术实现设计。

## DEC-018 Task 2.6业务对象定义获得批准

### 状态

Approved

### 日期

2026-07-19

### 决定

- Task 2.6 采用基础对象、业务对象、库存对象和系统对象四章结构；
- 基础、业务、库存和系统对象已经完成定义；
- Task 2.6 不进入数据库字段设计或技术实现；
- Task 2.6 作为 Phase 3 数据库设计的业务输入；
- Task 2.6 状态为 Completed / Approved。

### 影响

Phase 2 的 Task 2.1 至 Task 2.6 均已完成并获得批准，Phase 2 状态更新为 Completed / Approved。下一阶段为 Phase 3 Database Design，当前状态为 Not Started；本决定不启动 Task 3.1。

## DEC-019 Task完成后立即更新GitHub并验收

### 状态

Approved

### 日期

2026-07-19

### 决定

每个 Task 或正式小章节完成并经项目负责人确认后，必须立即更新 GitHub 并完成验收，方可进入下一 Task 或正式小章节。

### 影响

后续阶段内任务必须逐项完成文档回写、Git 提交、推送和验收，不得累积未归档成果后提前进入下一章节。本决定不改变固定九阶段顺序，也不代表 Phase 3 已启动。

## DEC-020 正式启动Phase 3并批准Task 3.1实体映射

### 状态

Approved

### 日期

2026-07-19

### 决定

- 正式启动 Phase 3 数据库设计（Database Design），Phase 3 状态更新为 In Progress；
- Task 3.1 业务对象到数据库实体映射（Entity Mapping）状态为 Completed / Approved；
- 公司仓、厂家仓、海外仓、在途节点和待处理节点统一使用 `Warehouse` 表达，不建立平行仓库实体；
- 可用库存、厂家库存、海外库存、待处理库存和在途库存统一使用 `Inventory` 表达，不建立平行库存余额实体；
- 当前库存与库存流水分离，分别使用 `Inventory` 和 `InventoryTransaction`；
- 统计报表不建立业务事实实体，不得形成平行业务数据源；
- 业务操作日志统一使用 `AuditLog`，不建立第二套平行日志实体；
- 库存预警使用独立 `InventoryAlert` 持久化，以保留生成、处理和关闭记录；
- 海外库存导入复用统一 `ImportTask`；
- 下一任务为 Task 3.2 实体关系详细设计（Entity Relationship Design），状态为 Not Started。

### 影响

Task 3.1 作为后续实体关系和数据表设计的正式输入。本决定只确认概念实体边界，不定义详细字段、字段类型、主键、外键、索引、SQL、ORM、数据库技术选型或物理 ER 模型，不启动 Task 3.2，也不进入技术开发。

## DEC-021 批准Task 3.2实体关系详细设计

### 状态

Approved

### 日期

2026-07-19

### 决定

- Task 3.2 实体关系详细设计（Entity Relationship Design）状态为 Completed / Approved；
- `PurchaseOrder` 与 `ProductionOrder` 完全平行，不建立父子关系；
- 采购和生产共用统一 `InspectionOrder`，一张验收单必须且只能对应一种业务来源；
- 所有多 SKU 正式业务单据采用主实体与明细实体一对多结构；
- `InventoryTransaction` 必须追溯来源业务单据及具体明细；
- `CrossBorderShipment` 与 `ImportTask` 采用多对多匹配关系，后续由关联实体承载匹配业务属性；
- `User` 与 `Role`、`Role` 与 `Permission` 均采用多对多关系；
- 已被业务引用的基础资料、已完成单据及其明细、库存流水和审计日志的历史关系不得物理删除；
- 下一任务为 Task 3.3 数据表结构设计（Table Structure Design），状态为 Not Started。

### 影响

Task 3.2 作为后续数据表结构设计的正式输入。本决定只确认概念关系、关系基数、业务约束、单据主从结构及追溯关系，不定义字段名称、字段类型、主键、外键实现、索引、SQL、ORM、数据库技术选型或物理 ER 模型，不启动 Task 3.3，也不进入技术开发。

## DEC-022 批准Task 3.3数据表结构设计

### 状态

Approved

### 日期

2026-07-19

### 决定

- Task 3.3 数据表结构设计（Table Structure Design）状态为 Completed / Approved；
- 正式逻辑表数量为 57 张，分为基础资料类 11 张、采购与生产类 10 张、验收与出入库类 10 张、跨境与库存类 12 张、系统与治理类 14 张；
- 仓库和当前库存分别使用统一的 `warehouses` 和 `inventories`，不建立平行表；
- 所有多 SKU 正式业务单据采用主表与明细表结构；
- `production_progress_records` 和 `production_completion_records` 独立保存生产进度及分批完工历史；
- 附件统一使用 `attachments` 和 `attachment_links`；
- 单据状态历史和审批记录分别使用 `document_status_histories` 和 `approval_records`；
- `role_warehouses`、`role_stores` 和 `safety_stock_rules` 暂列候选，不进入 57 张正式表清单；
- 下一任务为 Task 3.4 字段结构设计（Field Structure Design），状态为 Not Started。

### 影响

Task 3.3 作为 Task 3.4 字段结构设计的正式输入。本决定只确认逻辑表名称、分类、用途和从属关系，不定义字段清单、字段名称、字段类型、主键、外键字段、索引、唯一约束的物理实现、SQL、ORM、数据库技术选型、数据库 Schema 或物理 ER 模型，不启动 Task 3.4，也不进入技术开发。

## DEC-023 批准Task 3.4字段结构设计

### 状态

Approved

### 日期

2026-07-19

### 决定

- Task 3.4 字段结构设计（Field Structure Design）状态为 Completed / Approved；
- 全部正式表采用统一公共字段规范，正式业务单据统一使用单据编号、状态、审核、作废和版本字段；
- 多 SKU 单据明细保存 SKU 关联以及编码、名称和规格等必要历史快照；
- 正式单据保存供应商、生产厂家及其他必要业务快照；
- 库存流水、审计日志、单据状态历史和审批记录采用只追加原则，不设置更新或删除用途字段；
- Task 3.3 保持 Completed / Approved，正式逻辑表数量经字段结构检查由 57 张修正为 60 张；
- 新增 `production_completion_record_items`，用于保存分批完工中的 SKU 行级数量并追溯原生产单明细；
- `role_warehouses` 和 `role_stores` 由候选表转为正式表，承载角色的仓库和店铺数据权限范围；
- `safety_stock_rules` 继续保留为候选表，第一阶段安全库存采用 `skus.safety_stock_quantity`；
- `inventories` 不设置 `in_transit_quantity`，在途库存继续通过在途仓库节点表达；
- 用户密码只保存密码哈希，银行、税务、个人信息和敏感配置必须受权限、脱敏及审计控制；
- 下一任务为 Task 3.5 字段类型、约束与索引设计（Field Type, Constraint and Index Design），状态为 Not Started。

### 影响

Task 3.4 作为 Task 3.5 的正式输入。本决定只确认字段名称、中文含义、业务用途、业务必填性、历史快照和只追加原则，不定义字段类型、长度、精度、主键与外键物理约束、唯一约束、检查约束、索引、SQL、ORM、数据库技术选型、数据库 Schema、迁移文件或物理 ER 模型。Task 3.4 验收通过前不得启动 Task 3.5，也不进入页面、API 或业务代码开发。

## DEC-024 批准Task 3.5.1字段数据类型规范

### 状态

Approved

### 日期

2026-07-19

### 决定

- Task 3.5 字段类型、约束与索引设计（Field Type, Constraint and Index Design）状态更新为 In Progress；
- Task 3.5.1 字段数据类型规范（Field Type Standard）状态为 Completed / Approved；
- 项目采用数据库无关的逻辑字段类型规范；
- 所有主键及对象引用采用 UUID，并优先采用大致按时间有序的 UUID v7；
- 普通数量、金额和单价统一采用 `DECIMAL(18,4)`，不得使用浮点类型；
- 税率和百分比统一采用 `DECIMAL(7,4)` 并保存实际百分数值；
- 纯业务日期采用 `DATE`，准确操作时间采用 `DATETIME`，正式日期时间不得使用普通字符串保存；
- ENUM 保存稳定的小写英文及下划线代码，已使用代码不得直接改名；
- JSON 仅用于导入原始数据、审计快照等非固定数据，不得替代正式关系表、明细表或库存余额；
- 密码只保存密码哈希，银行、税务及个人信息继续作为敏感字段管理；
- 文件本体不直接保存至数据库，仅保存元数据和存储引用；
- `inventory_transactions`、`audit_logs`、`document_status_histories` 和 `approval_records` 继续执行只追加类型原则；
- 下一小任务为 Task 3.5.2 主键与唯一约束设计（Primary Key and Unique Constraint Design），状态为 Not Started。

### 影响

Task 3.5.1 作为 Task 3.5.2 的正式输入。本决定只确认逻辑字段类型、长度、精度及适用边界，不定义具体主键或唯一约束清单、外键删除策略、索引、Check 约束、SQL、ORM、数据库选型、Schema、Migration 或业务代码。Task 3.5.1 验收通过前不得启动 Task 3.5.2。

## DEC-025 批准Task 3.5.2主键与唯一约束设计

### 状态

Approved

### 日期

2026-07-20

### 决定

- Phase 3 数据库设计状态保持 In Progress；
- Task 3.5 字段类型、约束与索引设计状态保持 In Progress；
- Task 3.5.1 字段数据类型规范状态为 Completed / Approved；
- Task 3.5.2 主键与唯一约束设计状态为 Completed / Approved；
- 全部 60 张正式表采用单字段 UUID 主键 `id`，优先 UUID v7，业务编码不得作为主键；
- 业务编码及单据编号在各自业务范围内唯一，单据明细采用“主表 ID + 行号”组合唯一；
- 库存余额采用 `sku_id, warehouse_id` 组合唯一，多对多关系表采用业务对象 ID 组合唯一且保留独立 UUID 主键；
- 平台外部订单及退货编号按店铺范围唯一，外部店铺标识按平台范围唯一，物流信息按承运商与非空物流单号组合唯一；
- 编码及用户名按不区分大小写原则判重；
- 可空唯一字段仅在非空时参与唯一判断；
- 审计日志、单据状态历史和审批记录不设置业务唯一约束；
- 下一小任务为 Task 3.5.3 外键关系规范（Foreign Key Relationship Standard），状态为 Not Started。

### 影响

Task 3.5.2 作为 Task 3.5.3 的正式输入。本决定只确认逻辑主键与业务唯一范围，不定义外键删除或更新策略、普通查询索引、Check 约束、枚举完整合法值、SQL、ORM、数据库选型、Schema、Migration、页面、API 或业务代码。Task 3.5.2 验收通过前不得启动 Task 3.5.3。

## DEC-026 批准Task 3.5.3外键关系规范

### 状态

Approved

### 日期

2026-07-20

### 决定

- Phase 3 数据库设计和 Task 3.5 状态保持 In Progress；
- Task 3.5.1、Task 3.5.2 和 Task 3.5.3 状态均为 Completed / Approved；
- 所有普通业务外键更新和删除默认采用 `RESTRICT`；
- 完全依附主表的明细、导入任务明细、附件关系及纯权限关系可采用结构性 `CASCADE`，但不得据此删除已提交、审核、作废或形成下游业务的正式历史；
- 已被引用的基础资料统一通过停用管理，不得物理删除；
- 正式业务主表、库存流水、付款、进度、完工、验收、出入库、匹配、盘点、调整、预警、审计、状态历史及审批记录不得因上游记录删除自动消失；
- 用户历史引用统一保护，用户停用或离职后不得删除历史操作关系；
- 验收来源必须在采购与生产之间互斥，验收明细使用 Task 3.4 已批准的受控来源字段；
- 入库按业务类型使用已批准的受控来源主单与明细字段，不新增平行来源字段；
- 库存流水来源单据和来源明细采用受控多态引用，不建立指向任意单据表的错误外键；
- 跨境发货和调拨分别关联来源仓、在途仓及目的仓；
- 权限关联表可采用结构性级联，授权变化必须保留审计记录；
- 附件、审计、状态历史和审批对象的多态引用不建立普通单表外键；
- 下一小任务为 Task 3.5.4 索引设计（Index Design），状态为 Not Started。

### 影响

Task 3.5.3 作为 Task 3.5.4 的正式输入。本决定仅使用 Task 3.4 已批准字段，未新增字段或正式表；不设计普通查询索引、Check 约束或完整枚举值，不编写 SQL、ORM、Schema、Migration，不选择数据库，也不进入页面、API 或业务代码开发。Task 3.5.3 验收通过前不得启动 Task 3.5.4。

## DEC-027 批准Task 3.5.4索引设计

### 状态

Approved

### 日期

2026-07-20

### 决定

- Task 3.5.4 索引设计状态为 Completed / Approved；
- Task 3.5.5 Check 约束设计按数据库设计冲刺进入 In Progress；
- 普通外键字段原则上应获得有效索引覆盖；
- 正式业务单据围绕业务主体、状态和日期建立组合索引；
- 单据明细围绕主表外键覆盖及 SKU 查询建立索引；
- 受控多态引用使用类型与对象 ID 组合索引；
- 库存流水重点覆盖 SKU、仓库、时间、来源主单和来源明细；
- 历史及只追加表围绕对象、用户和时间建立索引；
- 主键和唯一约束形成的索引不得重复创建，单据明细所属主表外键已被唯一索引前缀覆盖时不机械增加单列索引；
- 不机械为长文本、JSON、快照、敏感联系信息或单独低选择性布尔字段建立普通索引。

### 影响

Task 3.5.4 作为 Task 3.5.5 的正式输入。本决定确认逻辑索引需求，不绑定数据库语法、排序方向、覆盖索引或部分索引实现，不进行性能压测，不编写 SQL、Schema 或 Migration，也不进入技术开发。

## DEC-028 批准Task 3.5.5 Check约束设计

### 状态

Approved

### 日期

2026-07-20

### 决定

- Task 3.5.5 Check 约束设计状态为 Completed / Approved；
- Task 3.5.6 数据库命名规范按数据库设计冲刺进入 In Progress；
- 正式明细基础数量原则上大于 0，金额、价格、安全库存和普通累计数量不得为负；
- 方向性差异量和调整变化量不得被机械限制为非负；
- 行号、导入行号、版本号和分类层级从 1 开始；
- 有效期、业务日期及操作时间执行同表内先后逻辑；
- 提交、审核、取消、停用必须具备一致的时间、用户和原因字段；
- 验收来源保持采购与生产互斥，入库及库存流水来源字段执行组合完整性规则；
- 厂家仓必须关联厂家，海外仓必须具备国家代码，跨境及调拨仓库角色不得相同；
- Check 只验证同一行可判断条件，不承担跨表目标存在性、主从归属、权限、并发锁或库存事务验证。

### 影响

Task 3.5.5 作为 Task 3.5.6 的正式输入。本决定只使用 Task 3.4 已批准字段，不新增字段，不定义完整枚举值，不绑定数据库特定语法，不编写 SQL、Schema 或 Migration，也不进入技术开发。

## DEC-029 批准Task 3.5.6数据库命名规范

### 状态

Approved

### 日期

2026-07-20

### 决定

- Task 3.5.6 数据库命名规范状态为 Completed / Approved；
- Task 3.5.7 Database Freeze 按数据库设计冲刺进入 In Progress；
- 表名统一采用小写、`snake_case` 和复数形式，字段名统一采用小写 `snake_case`；
- 主键、普通外键、角色外键和受控多态引用采用统一语义结构；
- 时间点、业务日期、布尔、编码编号、数量金额比率、快照、状态、约束、索引及枚举值采用统一格式；
- 保留 5 类业务语义明确的已批准兼容项，不新增别名或平行字段；
- 已审计 60 张正式逻辑表，未新增、删除或重命名任何表或字段；
- 已批准名称如需调整，必须进入 Database Change Request 流程。

### 影响

Task 3.5.6 作为 Task 3.5.7 Database Freeze 的正式输入。本决定不定义数据库物理标识符适配，不选择数据库或 ORM，不编写 SQL、Schema、Migration，也不进入页面、API 或业务代码开发。

## DEC-030 冻结数据库逻辑设计并关闭Phase 3

### 状态

Approved / Frozen

### 日期

2026-07-20

### 决定

- Database Logical Design v1.0 于 2026-07-20 正式冻结；
- Phase 3 数据库设计状态更新为 Completed / Approved / Frozen；
- Task 3.5 状态更新为 Completed / Approved；
- Task 3.5.7 Database Freeze 状态更新为 Completed / Approved / Frozen；
- 60 张正式逻辑表、字段业务语义、逻辑类型、主键、唯一约束、外键关系、逻辑索引、Check 规则、命名规范、库存粒度和历史保留原则纳入冻结范围；
- 任何逻辑表、字段、业务含义、唯一范围、外键关系、库存粒度或历史保留规则的修改必须提交 Database Change Request；
- Frozen 数据库逻辑设计作为后续页面设计、技术设计和开发工作的正式输入，后续阶段不得改变其业务语义；
- 数据库、ORM、物理类型、DDL、Schema、Migration、Seed、物理 ER 图及数据库初始化必须等待后续具备相应范围和正式授权的开发阶段启动后执行；
- 下一阶段保持 Frozen 路线定义的 Phase 4 页面设计（UI / Page Design），状态为 Not Started；
- 当前等待 ChatGPT 验收 Phase 3，验收通过前不得启动 Phase 4。

### 影响

本决定不改变九阶段路线、Phase 4 名称或既有阶段定义，不预先将数据库或 ORM 选型及技术映射分配给 Phase 4。本次未新增或删除正式逻辑表及字段，未修改 Frozen 业务规则，未编写 SQL，未创建 Schema、Migration、Seed 或物理 ER 图，未产生页面、API 或业务代码，也未安装依赖。

## DEC-031 正式启动Phase 4并批准Task 4.1页面架构设计

### 状态

Approved

### 日期

2026-07-20

### 决定

- 正式启动 Phase 4 页面设计（UI / Page Design），Phase 4 状态更新为 In Progress；
- Task 4.1 页面架构设计（Page Architecture Design）状态为 Completed / Approved；
- PC 管理端保持基础资料、采购管理、生产管理、库存管理、出入库管理、跨境业务、统计分析、用户权限和系统设置九个已批准一级模块；
- 微信小程序采用“首页、业务、库存、我的”四个主导航；
- PC 管理端采购验收归属采购管理，生产验收归属生产管理，出入库管理不承担质量验收职责；
- 微信小程序首页允许设置统一质量验收快捷入口，进入后按权限显示采购验收或生产验收，实际业务归属保持不变；
- 验收通过角色权限、功能权限、仓库数据权限及授权生产厂家范围控制；
- 本期不新增固定独立质检角色，允许按业务需要配置“跨境验收人员”角色；
- 质量验收不新增为一级模块；
- 下一任务为 Task 4.2，状态为 Not Started。

### 影响

Task 4.1 作为 Phase 4 后续页面设计任务的正式页面架构输入。本决定只确认 PC 管理端与微信小程序的页面分组、导航层级、质量验收页面归属及入口权限原则，不定义 UI 视觉样式、页面具体布局、表单字段、API、数据库技术实现、ORM、Schema、Migration 或业务代码。本次不改变 Frozen 业务规则、Database Logical Design v1.0 或固定九阶段路线，不启动 Task 4.2 正文设计，也不安装依赖。

## DEC-032 批准Task 4.2 PC管理端布局与导航设计

### 状态

Approved

### 日期

2026-07-20

### 决定

- PC 管理端采用 Header、Sidebar、Main Content 和 Info Panel 布局；
- 正式采用 Tab 多标签工作区，首页 Tab 固定且不可关闭；
- Sidebar 保持九个已批准一级模块，第一版原则上不使用三级菜单；
- Info Panel 第一版默认关闭且默认不占用 Main Content 宽度；
- Info Panel 展开和折叠状态应被记忆；
- Info Panel 第一版仅预留 AI 助手、最近操作、快捷入口、操作帮助和系统通知；
- 第一版不开发 Info Panel 具体功能；
- PC 管理端和微信小程序采用不同页面布局；
- Task 4.2 PC 管理端布局与导航设计状态为 Completed / Approved；
- Phase 4 页面设计状态保持 In Progress；
- 下一任务为 Task 4.3 PC 管理端视觉规范设计，状态为 Not Started。

### 影响

Task 4.2 为后续 PC 页面视觉规范和页面详细设计提供统一布局依据。本决定不改变 Frozen 业务规则，不改变 Database Logical Design v1.0，不改变固定九阶段路线，不开始技术开发，不启动 Task 4.3 正文设计。本次不定义具体配色、字体、图标、按钮、表格或表单视觉规范，不创建页面代码、API 或技术文件，也不安装依赖。

## DEC-033 批准Task 4.3 PC管理端视觉规范设计

### 状态

Approved

### 日期

2026-07-20

### 决定

- PC 管理端采用干净、专业、清晰、轻量的企业级 ERP 视觉风格；
- 主色采用企业蓝，Sidebar 采用深蓝灰色；
- 采用 4px 基础间距系统；
- 普通卡片使用白色背景和浅灰边框，不使用重阴影；
- 表格、表单和状态表达保持清晰、紧凑、可读；
- 第一版本仅支持 Light Mode；
- 本任务不指定具体组件库或图标库；
- Task 4.3 PC 管理端视觉规范设计状态为 Completed / Approved；
- Phase 4 页面设计状态保持 In Progress；
- 下一任务为 Task 4.4 首页 Dashboard 页面设计，状态为 Not Started；
- 技术开发状态保持 Not Started。

### 影响

Task 4.3 为后续 PC 管理端页面详细设计提供统一视觉依据。本决定不改变 Task 4.1 页面架构设计，不改变 Task 4.2 PC 管理端布局与导航设计，不改变 Frozen 业务规则、Database Logical Design v1.0 或固定九阶段路线，不启动 Task 4.4 至 Task 4.10 正文设计。本次不编写页面代码或组件，不选择具体组件库或图标库，不创建 API、ORM、DDL、Schema、Migration、Seed 或其他技术文件，不制作 Figma 或交互原型，也不安装依赖。

## DEC-034 批准Task 4.4首页Dashboard页面设计

### 状态

Approved

### 日期

2026-07-20

### 决定

- Dashboard 作为用户登录后的默认首页；
- 首页 Tab 固定且不可关闭，Info Panel 第一版保持默认折叠；
- Dashboard 包含页面头部、待我处理、KPI 指标卡片、业务趋势与库存结构图表、最近业务动态和快捷入口；
- 待我处理作为 Dashboard 最高优先级区域；
- Dashboard 内容根据功能权限、仓库数据权限、店铺数据权限及厂家和厂家仓数据权限动态展示；
- Dashboard 只展示信息并跳转至对应业务页面，不直接审核、验收、入库、出库或修改库存；
- Dashboard 不代替统计分析模块；
- 海外库存等导入型数据必须显示数据日期、更新时间和必要的过期提示；
- Dashboard 支持局部加载与局部失败，单个区域失败不得阻断其他区域；
- 本任务不选择具体图表库或前端组件库；
- Task 4.4 首页 Dashboard 页面设计状态为 Completed / Approved；
- Phase 4 页面设计状态保持 In Progress；
- 下一任务为 Task 4.5 基础资料模块页面设计，状态为 Not Started；
- 技术开发状态保持 Not Started。

### 影响

Task 4.4 为后续 PC 管理端页面详细设计提供首页信息架构、跳转、权限及状态依据。本决定不改变 Task 4.1 页面架构设计、Task 4.2 PC 管理端布局与导航设计或 Task 4.3 PC 管理端视觉规范设计，不改变 Frozen 业务规则、Database Logical Design v1.0 或固定九阶段路线，不启动 Task 4.5 至 Task 4.10 正文设计。本次不编写页面代码或 Dashboard 组件，不创建 API、ORM、DDL、Schema、Migration、Seed 或其他技术文件，不选择或安装图表库、组件库及依赖，不制作 Figma 或可运行原型。

## DEC-035 批准Task 4.5基础资料模块页面设计

### 状态

Approved

### 日期

2026-07-20

### 决定

- 基础资料模块保持产品管理、SKU 管理、产品分类、品牌管理、计量单位、供应商管理、仓库管理、销售平台、店铺管理和客户资料十个已批准页面入口；
- 产品与 SKU 分别采用列表、详情、新增和编辑页面；
- SKU 保持库存及业务单据使用的正式产品粒度，本期不管理单琴序列号；
- 已被业务引用的产品、SKU、分类、品牌、供应商、仓库、平台和店铺不得物理删除，只能按规则停用；
- 仓库管理使用统一仓库页面与数据源，并保持公司仓、厂家仓、在途仓、海外仓和待处理仓的 Frozen 语义；
- 计量单位复用受控字典能力，不新增独立计量单位表或平行数据源；
- 客户资料只查询和追溯销售出库客户快照，不建立独立客户主数据、客户生命周期或完整销售订单；
- 页面按功能权限、仓库数据权限、店铺数据权限及授权厂家范围动态展示；
- 银行、税务、价格和个人信息必须受权显示、脱敏并保留审计；
- 基础资料页面不得直接修改库存或业务单据；
- Task 4.5 基础资料模块页面设计状态为 Completed / Approved；
- Phase 4 页面设计状态保持 In Progress；
- 下一任务为 Task 4.6 采购管理页面设计，状态为 Not Started；
- 技术开发状态保持 Not Started。

### 影响

Task 4.5 为后续 PC 管理端业务页面设计提供统一基础资料入口、页面结构、权限、跳转和状态依据。本决定不改变 Task 4.1 至 Task 4.4，不改变 Frozen 业务规则、Database Logical Design v1.0 或固定九阶段路线，不启动 Task 4.6 至 Task 4.10 正文设计。本次不新增数据库表、字段、业务流程或一级模块，不编写页面代码，不创建 API、ORM、DDL、Schema、Migration、Seed 或其他技术文件，不安装依赖。

## DEC-036 批准Task 4.6采购管理页面设计

### 状态

Approved

### 日期

2026-07-20

### 决定

- 批准采购订单列表、新增、编辑、详情及采购执行跟踪页面设计；
- 批准采购验收、采购退货和采购付款辅助记录页面设计；
- 采购订单和采购验收不得直接增加库存；
- 采购验收确认只形成正式入库依据，实际采购入库必须通过出入库管理完成；
- 创建采购退货不得直接减少库存，实际库存减少必须通过正式退货出库完成；
- 采购执行数据由采购订单及其合法关联记录汇总，不允许手工改写；
- 采购付款只提供辅助记录，不替代完整财务、应付账款或银行对账能力；
- 已被下游业务引用的采购订单、验收、退货和付款记录不得物理删除；
- 页面根据功能权限、金额权限和数据权限动态显示；
- Task 4.6 采购管理页面设计状态为 Completed / Approved；
- Phase 4 页面设计状态保持 In Progress；
- 下一任务为 Task 4.7 生产管理页面设计，状态为 Not Started；
- 技术开发状态保持 Not Started。

### 影响

Task 4.6 为采购订单执行、验收、退货和付款辅助记录提供统一页面结构、权限、跳转与状态依据。本决定不改变 Task 4.1 至 Task 4.5，不改变 Frozen 业务规则、Database Logical Design v1.0 或固定九阶段路线，不启动 Task 4.7 至 Task 4.10 正文设计。本次不新增数据库表、字段、业务流程或一级模块，不编写页面代码，不创建 API、ORM、DDL、Schema、Migration、Seed 或其他技术文件，不安装依赖。

## DEC-037 批准Task 4.7生产管理页面设计

### 状态

Approved

### 日期

2026-07-20

### 决定

- 批准委外生产单、生产进度记录、分批完工、生产验收、生产付款关联展示及生产执行跟踪页面设计；
- 委外生产单不保存目标仓库，不新增目标仓库字段，目标仓库只在分批完工记录中选择；
- 不建立独立生产异常表、字段、业务对象、页面、权限或平行数据源；
- 特殊或异常情况通过暂停、逾期、已终止、生产进度说明及现有附件能力表达；
- 页面严格映射 Frozen 表、字段、生产进度状态和完工验收状态；
- 生产单、进度记录、分批完工和生产验收不得直接增加库存；
- 生产验收确认只形成正式入库依据，实际入库必须通过出入库管理完成；
- 厂家仓产品可按跨境业务规则直接发往海外；
- 不发起 Database Change Request，不修改 Frozen 数据库设计；
- Task 4.7 生产管理页面设计状态为 Completed / Approved；
- Phase 4 页面设计状态保持 In Progress；
- 下一任务为 Task 4.8 库存管理页面设计，状态为 Not Started；
- 技术开发状态保持 Not Started。

### 影响

Task 4.7 为委外生产执行、进度、分批完工、生产验收和关联业务提供统一页面结构、Frozen 映射、权限、跳转与状态依据。本决定不改变 Task 4.1 至 Task 4.6，不改变 Frozen 业务规则、Database Logical Design v1.0 或固定九阶段路线，不启动 Task 4.8 至 Task 4.10 正文设计。本次不新增数据库表、字段、业务对象、生产异常页面或一级模块，不编写页面代码，不创建 API、ORM、DDL、Schema、Migration、Seed 或其他技术文件，不安装依赖。

## DEC-038 批准Task 4.8库存管理页面设计

### 状态

Approved

### 日期

2026-07-20

### 决定

- 批准当前库存、分仓库存、厂家仓库存、在途库存、海外仓库存、SKU 库存详情、库存流水和库存预警页面设计；
- `inventories` 保持 SKU 与仓库粒度的唯一正式库存余额来源；
- 不设置独立在途数量字段，在途库存通过在途类型仓库及对应库存记录表达；
- 公司仓、厂家仓、在途仓和海外仓均为统一库存的筛选或汇总视图，不建立平行库存数据源；
- 库存流水严格映射 `inventory_transactions`，只追加、不可编辑、不可删除且必须保留来源追溯；
- 库存页面不得直接修改库存，库存预警处理和关闭也不得直接改变库存；
- 调拨、盘点和库存调整的创建与执行归属 Task 4.9 出入库管理页面设计；
- 海外库存导入与匹配归属 Task 4.10 跨境业务页面设计；
- 本次不新增库存字段、库存表、库存对象或平行数据源；
- Task 4.8 库存管理页面设计状态为 Completed / Approved；
- Phase 4 页面设计状态保持 In Progress；
- 下一任务为 Task 4.9 出入库管理页面设计，状态为 Not Started；
- 技术开发状态保持 Not Started。

### 影响

Task 4.8 为统一库存余额、仓库类型视图、库存流水、库存预警及来源业务跳转提供正式页面结构、Frozen 映射、权限和状态依据。本决定不改变 Task 4.1 至 Task 4.7，不改变 Frozen 业务规则、Database Logical Design v1.0 或固定九阶段路线，不启动 Task 4.9 至 Task 4.10 正文设计。本次不新增数据库表、字段、业务对象或一级模块，不编写页面代码，不创建 API、ORM、DDL、Schema、Migration、Seed 或其他技术文件，不安装依赖。

## DEC-039 批准Task 4.9出入库管理页面设计

### 状态

Approved

### 日期

2026-07-20

### 决定

- 批准入库、出库、仓库调拨、库存盘点、库存调整、销售退货和报损页面设计；
- 各页面严格映射 Frozen 正式表、字段、状态和业务边界，不新增出入库类型；
- 保存草稿、提交审核、审核和查看详情均不得直接修改库存；
- 正式完成业务后才形成库存流水及对应库存余额变更；
- 调拨必须经过在途仓，不得从来源仓直接瞬时转入目的仓；
- 盘点只确认库存事实和差异，不得直接修改库存；
- 库存调整正式完成后才允许修改库存并生成库存流水；
- 销售退货必须关联原销售出库单及明细；
- 报损使用正式报损对象，不得由普通其他出库替代；
- 库存流水只追加、不可修改、不可删除并保留来源追溯；
- 不新增销售订单、独立其他出库对象或平行库存数据源；
- Task 4.9 出入库管理页面设计状态为 Completed / Approved；
- Phase 4 页面设计状态保持 In Progress；
- 下一任务为 Task 4.10 跨境业务页面设计，状态为 Not Started；
- 技术开发状态保持 Not Started。

### 影响

Task 4.9 为出入库和仓库库存作业提供统一页面结构、Frozen 映射、权限、跳转和状态依据。本决定不改变 Task 4.1 至 Task 4.8，不改变 Frozen 业务规则、Database Logical Design v1.0 或固定九阶段路线，不启动或创建 Task 4.10 正文。本次不新增数据库表、字段、业务对象、平行数据源或一级模块，不编写页面代码，不创建 API、ORM、DDL、Schema、Migration、Seed 或其他技术文件，不安装依赖。

## DEC-040 批准Task 4.10跨境业务页面设计并完成Phase 4

### 状态

Approved

### 日期

2026-07-20

### 决定

- Task 4.10 跨境业务页面设计状态为 Completed / Approved；
- 批准跨境发货、发运确认、海外收货、海外数据导入、发货明细匹配、执行跟踪和海外库存入口页面设计；
- 跨境发货必须经过来源仓、在途仓和目的海外仓；
- 正式发运后来源仓库存减少、在途仓库存增加，海外收货确认后在途仓库存减少、海外仓库存增加；
- 发运和海外收货均通过正式仓库、库存余额和库存流水表达；
- 海外实收、差异和发货导入匹配均按明细记录；
- 导入任务、导入明细和发货匹配复用 Frozen 正式对象；
- 海外正式库存继续以 `inventories` 为唯一余额来源；
- 不新增独立跨境销售订单、物流轨迹、海外库存余额表或其他平行数据对象；
- Task 4.1 至 Task 4.10 状态均为 Completed / Approved；
- Phase 4 页面设计状态更新为 Completed / Approved，不标记为 Frozen；
- 下一阶段为 Phase 5 接口设计，状态保持 Waiting / Not Started；
- 未经项目负责人单独确认不得启动 Phase 5；
- 技术开发状态保持 Not Started。

### 影响

Task 4.10 完成 Phase 4 页面设计收口，为后续经正式授权的接口设计提供页面输入。本决定不改变 Task 4.1 至 Task 4.9 Approved 正文，不改变 Frozen 业务规则、Database Logical Design v1.0 或固定九阶段路线，不启动或创建 Phase 5 正文。本次不新增数据库表、字段、业务对象或平行数据源，不创建 API、页面代码、ORM、DDL、Schema、Migration、Seed 或其他技术文件，不安装依赖。

## DEC-041 初始化Phase 5文档结构

### 状态

Approved

### 日期

2026-07-20

### 决定

- 创建 `docs/phases/phase-05/` 文档目录；
- 创建 Task 5.1 至 Task 5.5 占位文档；
- Task 5.1 API 设计原则状态为 Waiting；
- Task 5.2 基础资料与采购 API 状态为 Waiting；
- Task 5.3 生产、质量验收与库存 API 状态为 Waiting；
- Task 5.4 出入库与跨境业务 API 状态为 Waiting；
- Task 5.5 导入、日志、安全与 API 最终收口状态为 Waiting；
- Phase 5 接口设计状态保持 Waiting / Not Started；
- 各占位文档不得填写任何 API 正文，必须等待项目负责人批准启动对应 Task；
- 技术开发状态保持 Not Started。

### 影响

本决定仅初始化 Phase 5 文档结构和内部任务清单，不启动 Phase 5 正文，不创建接口、参数或错误码，不改变 Frozen 业务规则、Database Logical Design v1.0、Approved 页面设计或固定九阶段路线。本次未新增数据库字段、表或业务对象，未创建 API、ORM、DDL、Schema、Migration、Seed、页面代码或业务代码，也未安装依赖。

## DEC-042 正式启动Phase 5并完成Task 5.1设计

### 状态

Approved

### 日期

2026-07-20

### 决定

- 项目负责人正式启动 Phase 5 接口设计，Phase 5 状态更新为 In Progress；
- Task 5.1 API 总体规范与安全规则设计状态更新为 Completed / Pending Approval；
- Task 5.1 统一 PC 管理端与微信小程序的 API 设计原则、版本、URL、HTTP、请求和响应规范；
- Task 5.1 统一身份认证、权限、仓库与店铺数据范围、状态校验、数据校验、幂等、并发和错误处理原则；
- Task 5.1 统一操作日志、数据脱敏、附件及 API 安全规则；
- Task 5.1 建立 Task 5.2 至 Task 5.5 共用的接口描述模板；
- Task 5.2 至 Task 5.5 状态保持 Waiting；
- 当前下一步为 Task 5.1 GitHub 验收；
- 技术开发状态保持 Not Started。

### 影响

Task 5.1 作为后续 Phase 5 接口设计任务的统一规则输入，但其状态为 Completed / Pending Approval，不代表已经获得项目负责人验收批准。本决定不开始 Task 5.2，不改变 Phase 1 至 Phase 4 已批准状态，不改变 Frozen 业务规则、Database Logical Design v1.0、Approved 页面设计或固定九阶段路线。本次未创建真实 API Route，未编写业务代码，未新增数据库字段、表、状态、索引、关联关系或业务对象，未创建 ORM、DDL、Schema、Migration、Seed，也未安装依赖。

## DEC-043 批准Task 5.1并完成Task 5.2设计

### 状态

Approved

### 日期

2026-07-21

### 决定

- Task 5.1 API 总体规范与安全规则设计状态更新为 Completed / Approved；
- 正式启动并完成 Task 5.2 基础资料与采购管理 API 设计，状态为 Completed / Pending Approval；
- Phase 5 接口设计状态保持 In Progress；
- Task 5.2 定义产品、SKU、分类、品牌、供应商、生产厂家、仓库、电商平台、店铺、客户快照、采购订单、采购付款和采购退货接口契约；
- Task 5.2 共登记 103 个接口，其中基础资料 74 个、采购管理 29 个；
- 采购单提交、撤回、审核、驳回、反审核、取消和作废使用专用动作接口；
- 反审核只允许在未形成库存流水或后续关联记录时执行；
- 采购验收、实际入库、实际退货出库、通用附件和正式 Excel 导入的写接口分别留待 Task 5.3 至 Task 5.5；
- 无法映射 Frozen 数据库的计量单位维护、采购类型/负责人、独立到货登记、采购厂家关系和关闭状态接口停止设计并登记冲突；
- Task 5.3 至 Task 5.5 保持 Waiting；
- 当前下一步为 Task 5.2 GitHub 验收；
- 技术开发状态保持 Not Started。

### 影响

Task 5.2 为后续功能详细设计提供基础资料与采购接口契约。本决定不修改 Frozen 业务规则、Database Logical Design v1.0、Approved 页面正文或固定九阶段路线；不新增数据库字段、表、状态、唯一约束、索引、关系或业务对象。冲突部分必须由项目负责人选择调整接口/页面口径或发起正式 DCR/Change Request 后方可补充。本次未创建真实 API Route，未编写业务代码，未创建 ORM、DDL、Schema、Migration、Seed，未安装依赖，也未开始 Task 5.3。

## DEC-044 修正页面口径并批准Task 5.2

### 状态

Approved

### 日期

2026-07-21

### 决定

- 不发起 Database Change Request，不修改 Frozen Database Logical Design v1.0；
- Task 4.5 取消独立计量单位维护页面和新增、编辑、启用、停用、删除能力，计量单位改为产品和 SKU 表单中的固定受控值选择；
- Task 4.6 删除采购类型字段、列表列和筛选；
- Task 4.6 删除独立采购负责人字段、列表列和筛选，责任通过创建人、提交人、审核人及审计记录追溯；
- 到货入口统一修正为创建采购验收单和查看到货进度，不新增独立到货登记对象；
- 采购页面不提供厂家筛选、生产任务直达或已生产数量，采购与委外生产保持平行；
- 采购订单不提供关闭按钮、状态或筛选，正式状态保持草稿、待审核、已审核、已驳回、已完成、已取消和已作废，已完成由系统按业务完成条件判定；
- Task 5.2 原映射冲突全部关闭，不再阻塞批准；
- Task 5.2 接口数量经重新核算保持 103 个，其中九类基础资料通用接口 72 个、客户快照只读接口 2 个、采购管理接口 29 个；
- Task 5.2 状态更新为 Completed / Approved；
- Phase 5 保持 In Progress，Task 5.1 与 Task 5.2 为 Completed / Approved，Task 5.3 至 Task 5.5 保持 Waiting；
- 当前下一步为等待项目负责人确认启动 Task 5.3；
- 技术开发保持 Not Started。

### 影响

本决定以页面口径修正关闭 Task 5.2 映射冲突，Task 4.5 与 Task 4.6 保持 Completed / Approved。Database Logical Design v1.0 保持 Frozen，未新增或修改数据库字段、表、状态、唯一约束、索引、关系或业务对象。Task 5.1 正文未修改，Task 5.3 未启动。本次未创建真实 API Route，未编写业务代码，未创建 ORM、DDL、Schema、Migration、Seed，也未安装依赖。

## DEC-045 正式启动并完成Task 5.3设计

### 状态

Approved

### 日期

2026-07-21

### 决定

- 项目负责人正式启动 Task 5.3 生产、质量验收与库存 API 设计；
- Task 5.3 可映射范围设计完成，状态更新为 Completed / Pending Approval；
- 共登记 61 个正式接口，其中生产 25 个、质量验收 10 个、库存 26 个；
- 生产订单与采购订单保持平行，不建立直接关系；
- 生产订单不保存统一目标仓库，目标仓只使用分批完工记录现有字段；
- 生产进度、质量验收和库存流水均保留历史，不得由普通更新覆盖；
- 验收确认只形成后续正式入库资格，不直接修改库存；
- 库存余额不得通过普通接口直接修改，库存调整执行必须原子更新余额并追加流水；
- `production_completion_records.completion_status` 缺少已批准状态值和转换，分批完工创建、提交、确认写接口停止设计；
- Frozen 验收结构没有直接关联分批完工记录/明细，验收直连完工批次停止设计；
- 验收明细存在待处理数量，但验收主表没有待处理总量且主表平衡约束不包含待处理量，待处理量大于零的写入分支停止设计；
- 上述映射缺口只登记，不发起或执行 DCR，不修改 Frozen 数据库；
- Phase 5 保持 In Progress，Task 5.1 和 Task 5.2 为 Completed / Approved；
- Task 5.4 和 Task 5.5 保持 Waiting，当前下一步为 Task 5.3 GitHub 验收；
- 技术开发保持 Not Started。

### 影响

Task 5.3 为生产、质量验收、库存查询、库存流水、库存预警和库存调整提供正式接口契约。三项 Frozen 映射缺口等待项目负责人决定通过口径调整关闭或发起正式变更。本次未修改 Frozen BUSINESS_RULES、DATABASE_SPEC、Phase 3 正文、Approved 页面、Task 5.1、Task 5.2、Task 5.4 或 Task 5.5 正文；未新增字段、表、状态、关系、索引或业务对象；未创建真实 API Route，未编写业务代码，未创建 ORM、Schema、DDL、Migration 或 Seed，也未开始 Task 5.4。

## DEC-046 批准DCR-001并批准Task 5.3

### 状态

Approved

### 日期

2026-07-21

### 决定

- 正式批准唯一 Database Change Request：DCR-001；
- DCR-001 仅定义既有 `production_completion_records.completion_status` 的正式状态：Draft（草稿）、Confirmed（已确认）、Revoked（已撤销）、Voided（已作废）；
- 正式状态机为草稿提交确认至已确认、草稿作废至已作废、已确认在无下游业务时撤销至已撤销；
- 禁止已确认再次确认、已确认直接作废、已作废恢复及已撤销再次确认；
- Database Logical Design 由 v1.0 更新为 v1.1；数据库表数量、字段数量、索引、外键、关系和业务对象保持不变；
- 验收保持生产订单及生产订单明细来源，不建立验收到完工记录关系；
- 验收 API 统一采用“验收数量＝合格数量＋不合格数量”，不接收或返回待处理数量；既有 Frozen `pending_quantity` 字段由服务端固定为零，不删除字段；
- Task 4.7 同步分批完工四个状态和提交确认、撤销、作废三个按钮，不增加其他按钮；
- Task 5.3 共登记 65 个正式接口，其中生产 29 个、质量验收 10 个、库存 26 个；
- Task 5.3 状态更新为 Completed / Approved；Phase 5 保持 In Progress；
- Task 5.4 与 Task 5.5 保持 Waiting，当前下一步为等待项目负责人正式启动 Task 5.4；
- 技术开发保持 Not Started。

### 影响

DCR-001 是本次唯一数据库变更请求，只改变既有字段的正式状态语义，不改变 Frozen 数据库逻辑结构。本决定未修改采购 API、Task 5.1、Task 5.2 或 Task 5.4 正文，未新增字段、表、索引、外键、关系或业务对象；未创建真实 API Route，未编写代码，未创建 ORM、Schema、DDL、Migration 或 Seed，也未开始 Task 5.4。

## DEC-047 正式启动并完成Task 5.4设计

### 状态

Approved

### 日期

2026-07-21

### 决定

- 项目负责人正式启动 Task 5.4 出入库与跨境业务 API 设计；
- Task 5.4 可映射范围设计完成，状态更新为 Completed / Pending Approval；
- 共登记 72 个正式接口，其中入库 18 个、出库 17 个、调拨 15 个、跨境 22 个；
- 入库前必须完成正式验收，所有库存变化必须原子更新余额、追加流水并同步来源及状态；
- 国内销售只登记销售出库，不建立销售订单；采购退货实际出库直接执行既有采购退货对象；
- 调拨必须经过来源仓、在途仓和目的仓两阶段事务；跨境发运只执行来源仓到在途仓；
- 海外仓当前库存及导入结果只读查询纳入 Task 5.4，Excel 上传、校验和正式执行留待 Task 5.5；
- 跨境多维状态缺少独立 Frozen 字段、海外历史余额快照缺少正式对象、手工海外收货与 Excel 唯一来源口径冲突已登记并停止冲突部分；
- 未发起或执行 DCR，未修改 Frozen 数据库或 Approved 页面；
- Phase 5 保持 In Progress，Task 5.1 至 Task 5.3 为 Completed / Approved；
- Task 5.5 保持 Waiting，当前下一步为 Task 5.4 GitHub 验收；
- 技术开发保持 Not Started。

### 影响

Task 5.4 为出入库、采购退货实际出库、调拨、跨境发运及海外仓查询提供正式接口契约。冲突项等待项目负责人决定调整页面/API 口径或发起正式 DCR。本次未修改 Frozen BUSINESS_RULES、DATABASE_SPEC、Phase 3 正文、Approved Phase 4 页面、Task 5.1、Task 5.2、Task 5.3 或 Task 5.5 正文；未新增字段、表、状态、关系、约束、索引或业务对象；未创建真实 API Route，未编写业务代码，未创建 ORM、Schema、DDL、Migration 或 Seed，也未开始 Task 5.5。

## DEC-048 批准Task 5.4并统一跨境业务口径

### 状态

Approved

### 日期

2026-07-21

### 决定

- 项目负责人正式批准 Task 5.4，状态更新为 Completed / Approved；
- 三项跨境业务冲突全部采用页面/API口径调整解决，不发起新的 DCR；
- 跨境发货只保留 `status`、`approval_status` 和 `shipment_status`，删除独立物流状态、海外收货状态、差异处理状态及其筛选和写接口；
- 物流信息仅展示承运商、运单号、发运日期和预计到达日期；
- 取消海外库存历史余额快照、快照差异和快照查询接口，保留当前库存、库存流水、Excel 导入任务、导入明细、导入结果和来源追溯；
- 取消手工海外收货入口、手工海外收货 API 和手工增加海外仓库存；
- 跨境发运只执行来源仓库存减少、在途仓库存增加；海外仓库存只能由 Task 5.5 正式 Excel 导入结果形成；
- Frozen 数据库保持不变，未新增字段、表、状态、关系、约束、索引或业务对象；
- Phase 5 保持 In Progress，Task 5.5 保持 Waiting；当前下一步为等待项目负责人正式启动 Task 5.5；
- 技术开发保持 Not Started。

### 影响

Task 4.10 仅同步本次批准的跨境页面口径，状态继续保持 Completed / Approved；Task 5.4 三项冲突全部关闭。本决定不修改 Frozen BUSINESS_RULES、DATABASE_SPEC、Phase 3 正文、Task 5.1、Task 5.2、Task 5.3 或 Task 5.5 正文，不创建真实 API Route，不编写业务代码，不创建 ORM、Schema、DDL、Migration 或 Seed，也不开始 Task 5.5。

## DEC-049 正式启动并完成Task 5.5设计

### 状态

Approved

### 日期

2026-07-21

### 决定

- 项目负责人正式启动 Task 5.5 导入、附件、日志、安全与 API 最终收口；
- Task 5.5 设计完成，状态更新为 Completed / Pending Approval；
- 定义导入接口 15 个、附件接口 8 个、日志接口 4 个、安全接口 5 个，Task 5.5 共 32 个接口；
- Phase 5 正式接口总数为 272 个；
- 导入统一复用 `import_tasks`、`import_task_items`，海外仓库存导入同时复用跨境发货、匹配、正式库存和流水对象；
- 海外仓库存只能由正式 Excel 导入结果形成，不提供手工海外收货或手工增加库存；
- 附件统一复用 `attachments` 和 `attachment_links`，适用于采购、生产、验收、入库、出库、调拨和跨境业务；
- Audit Log、Operation Log、Import Log、Export Log、Login Log 和 Security Log 作为统一 `audit_logs` 的查询分类，不新增日志表或业务对象；
- Authentication、Authorization、Token、Refresh Token、Session、Permission、Replay Protection、Idempotency、Rate Limit、IP White List、Permission Validation 和 Header 安全规则统一适用于所有 API；
- API_SPEC 升级为 API Master Specification；
- DEVELOPMENT_WORKFLOW 增加 Phase Exit Gate 和 Freeze Gate，不新增独立治理文档；
- Phase 5 保持 In Progress，Task 5.1 至 Task 5.4 保持 Completed / Approved；
- 当前下一步为 Task 5.5 GitHub 验收；本次不执行 Phase Final Consistency Review；
- 技术开发保持 Not Started。

### 影响

本决定不新增业务模块，不修改 Frozen BUSINESS_RULES、DATABASE_SPEC、Phase 3 正文或 Task 5.1 至 Task 5.4 正文；不新增数据库字段、表、状态、关系或业务对象；不创建真实 API Route，不编写代码，不安装依赖，不开始 Phase 6。Task 5.5 GitHub 验收通过后，仍须等待项目负责人正式启动 Phase 5 Final Consistency Review。

## DEC-050 批准Task 5.5并完成Phase 5最终一致性审查

### 状态

Approved

### 日期

2026-07-21

### 决定

- 项目负责人正式批准 Task 5.5，状态更新为 Completed / Approved；
- 项目负责人正式启动 Phase 5 Final Consistency Review；
- Review 已完成，状态为 Completed / Pending Approval，等待 GitHub 验收；
- Phase 5 的 272 个正式接口已完成数量、编号、路径、HTTP Method、请求响应、状态机、权限、库存事务、导入、附件、日志、安全、页面及 Frozen 映射复核；
- 未发现重复接口或重复编号，Task 5.2、Task 5.3、Task 5.4、Task 5.5 数量分别保持 103、65、72、32；
- 完成 10 项一致性修正，不新增或删除正式业务接口；
- 无 Pending DCR、无 Outstanding Issue、无内容性 Freeze 阻塞问题；
- Phase 5 已具备内容冻结条件，但 Review 尚待 GitHub 验收和项目负责人最终批准，因此 Phase 5 保持 In Progress，不标记为 Frozen；
- Phase 6 保持 Waiting / Not Started，当前下一步为 Phase 5 Final Consistency Review GitHub 验收。

### 影响

本决定不修改 Frozen BUSINESS_RULES、DATABASE_SPEC 或 Phase 3 正文，不新增数据库字段、表、状态、关系、索引、约束或业务对象，不创建真实 API Route，不编写代码，不安装依赖，不启动 Phase 6。Phase 4 仅修正已批准后续口径对应的引用与文字一致性，不增加页面业务能力。

## DEC-051 批准并冻结Phase 5接口设计

### 状态

Approved

### 日期

2026-07-21

### 决定

- 项目负责人正式批准 Phase 5 Final Consistency Review，状态更新为 Completed / Approved；
- 项目负责人正式批准 Phase 5 更新为 Completed / Approved / Frozen；
- API Master Specification v1.0 正式冻结，272 个正式接口保持不变；
- Task 5.1 至 Task 5.5 全部保持 Completed / Approved；
- Phase 5 的 Phase Exit Gate 与 Freeze Gate 已全部通过；
- 当前无 Pending DCR、无 Pending Review、无 Outstanding Issue；
- API Master Specification v1.0 是 Phase 6 及后续阶段唯一 API 事实来源；
- Phase 5 正式内容后续不得直接修改，任何变更必须经过正式 DCR 或 Change Request；
- 禁止通过 Phase 6 文档、页面代码或实现代码绕过已冻结 API 规范；
- Phase 6 保持 Waiting / Not Started，必须等待项目负责人单独正式启动。

### 影响

本决定只关闭并冻结 Phase 5，不新增、删除、重编号或修改业务接口，不修改 URL、HTTP Method、状态机或错误码；不修改 Frozen BUSINESS_RULES、DATABASE_SPEC、Phase 3 正文或 Approved Phase 4 页面；不创建真实 API，不编写代码，不安装依赖，不创建 Phase 6 正文。

## DEC-052 启动Phase 6并完成Task 6.1统一规范

### 状态

Approved

### 日期

2026-07-21

### 决定

- 项目负责人正式启动 Phase 6 功能详细设计，Phase 6 状态更新为 In Progress；
- Phase 6 采用三个 Task 加独立 Final Consistency Review 的加速结构；
- Task 6.1 为功能详细设计统一规范，Task 6.2 为核心业务功能详细设计，Task 6.3 为公共能力功能详细设计；
- Final Consistency Review 是 Phase Exit Gate，不作为普通业务 Task，不新增 Task 6.4；
- Task 6.1 已正式启动并完成设计，状态为 Completed / Pending Approval；
- 通用页面、表单、按钮、API、权限、异常、幂等、库存、导入、附件、日志、性能和验收规则仅在 Task 6.1 定义一次，后续 Task 直接引用；
- Task 6.2、Task 6.3 与 Final Consistency Review 保持 Waiting / Not Started；
- 每个 Task 必须先完成 GitHub 验收，未经项目负责人批准不得启动后续 Task；
- 技术框架、代码结构和具体实现工具留待 Phase 7；
- Phase 3 数据库和 API Master Specification v1.0 保持 Frozen；
- 当前下一步为 Task 6.1 GitHub 验收。

### 影响

本决定不新增业务模块，不修改 Frozen BUSINESS_RULES、DATABASE_SPEC、API_SPEC 接口正文、Approved Phase 4 页面或 Phase 5 Task 文档；不新增数据库字段、表、关系、状态或 API；不编写代码，不创建真实页面或 API Route，不安装依赖，不启动或创建 Task 6.2 正文。

## DEC-053 批准Task 6.1并完成Task 6.2核心业务功能设计

### 状态

Approved

### 日期

2026-07-22

### 决定

- 项目负责人正式批准 Task 6.1，状态更新为 Completed / Approved；
- 项目负责人正式启动并完成 Task 6.2，状态为 Completed / Pending Approval；
- Task 6.2 按 Task 6.1 的统一规范，集中完成基础资料、采购管理、生产与质量验收、库存管理、出入库与调拨、跨境业务六个核心模块的功能设计；
- 采购管理与生产管理是平行业务模块，生产订单独立创建，采购订单与生产订单之间不建立页面、数据库或 API 直接关系；
- 直接采购与委外生产仅在质量验收节点汇合，采购来源与生产来源互斥；
- 前一版错误指令已在执行前被阻止，未修改文件、未提交且未进入 GitHub，不作为正式项目缺陷记录；
- 本次不发起 DCR 或 Change Request，Frozen 数据库和 API Master Specification v1.0 保持不变，正式接口总数保持 272；
- Task 6.3 与 Phase 6 Final Consistency Review 保持 Waiting / Not Started；
- 当前下一步为 Task 6.2 GitHub 验收。

### 影响

本决定不新增业务模块、接口、数据库字段、表、关系、状态或业务对象，不修改 Frozen BUSINESS_RULES、DATABASE_SPEC、API_SPEC、Approved Phase 4 页面或 Phase 5 Task 正文；不编写代码，不创建真实页面或 API Route，不安装依赖，不启动 Task 6.3。技术框架、代码结构和具体实现工具继续留待 Phase 7。

## DEC-054 批准Task 6.2并完成Task 6.3公共能力设计

### 状态

Approved

### 日期

2026-07-22

### 决定

- 项目负责人正式批准 Task 6.2，状态更新为 Completed / Approved；
- 项目负责人正式启动并完成 Task 6.3，状态为 Completed / Pending Approval；
- 登录、权限、编号、附件、导入、导出、日志、审计、查询、状态动作、异常提示、数据字典、打印、国际化和系统时间采用统一公共能力，不允许业务模块形成平行版本；
- PC 管理端使用用户名和密码登录，微信小程序支持微信授权登录且首次必须绑定已有启用系统账号；两端统一映射现有用户身份、角色、权限、数据范围和字段权限；
- 不建立独立微信用户体系，不新增 OpenID、UnionID、Token、Session 或客户端来源数据库字段；认证技术实现留待后续技术阶段；
- 用户、角色、权限管理继续映射 Frozen 系统对象；无独立 Frozen API 的能力只定义 Approved 产品规则或复用现有业务 API，不虚构接口；
- Excel 导入统一使用 `IMP-*`，附件统一使用 `ATT-*`，日志统一使用 `LOG-*`，登录会话统一使用 `SEC-*`；
- Frozen 数据库和 API Master Specification v1.0 保持不变，正式接口总数保持 272；
- 本次未发现 Frozen 冲突，不发起 DCR 或 Change Request；
- Phase 6 保持 In Progress，Phase 6 Final Consistency Review 保持 Waiting / Not Started；
- 当前下一步为 Task 6.3 GitHub 验收。

### 影响

本决定不新增业务模块、接口、状态、数据库字段、表、关系或业务对象，不修改 Frozen BUSINESS_RULES、DATABASE_SPEC、API_SPEC、Approved Phase 4 页面或 Phase 5 Task 正文；不编写代码，不创建真实页面或 API Route，不安装依赖，不启动 Phase 6 Final Consistency Review 或 Phase 7。未经项目负责人批准不得进入 Phase 6 Final Consistency Review。

## DEC-055 发起API Change Request 001补齐三类Approved页面接口

### 状态

Approved

### 日期

2026-07-22

### 决定

- 正式保留 Task 4.9 已批准的库存盘点、销售退货和报损页面及业务流程，不删除、不取消、不降级；
- 正式发起 API Change Request 001，状态为 Completed / Pending Approval；
- 确认冲突事实：Task 5.4 将三类能力排除，Phase 5 Final Consistency Review 的页面覆盖结论存在遗漏，Task 6.2 无法建立完整映射；
- 使用 Frozen Database Logical Design v1.1 既有 `stock_counts`、`stock_count_items`、`sales_returns`、`sales_return_items`、`damage_reports`、`damage_report_items` 及库存/历史对象完成适配；
- 新增盘点 `STC-*` 17 个、销售退货 `SRT-*` 13 个、报损 `DMG-*` 13 个候选接口，共 43 个；既有 272 个接口不删除、不复用、不改义、不重编号；
- API Master Specification 更新为 v1.1、Completed / Pending Approval，候选接口总数为 315；v1.0 与原 272 个接口仍是最后批准的 Frozen 基线；
- 盘点完成只确认差异，不直接修改库存；销售退货与报损的创建、提交和审核不改变库存，只有专用确认动作可以原子形成余额变化与只追加流水；
- Frozen Database Logical Design v1.1 可以完整支撑本次接口，不发起数据库 DCR，不新增表、字段、关系、状态或业务对象；
- Task 6.1、Task 6.2 保持 Completed / Approved，Task 6.3 保持 Completed / Pending Approval，Phase 6 保持 In Progress；
- Phase 6 Final Consistency Review 更新为 Waiting / Blocked by API CR Approval，当前下一步为 API Change Request 001 GitHub 验收。

### 影响

本决定仅授权完成 API Change Request 001 的候选设计和相关文档同步，不直接批准或重新冻结 API Master Specification v1.1。未修改 Frozen 数据库、BUSINESS_RULES 或 Approved 页面，未修改与本缺口无关的接口；未编写代码、创建真实 API Route、ORM、Schema、Migration 或 Seed，未安装依赖，未启动 Phase 6 Final Consistency Review 或 Phase 7。

## DEC-056 批准API Change Request 001并完成Phase 6最终一致性审查

### 状态

Approved

### 日期

2026-07-22

### 决定

- 项目负责人正式批准 API Change Request 001，状态更新为 Completed / Approved；
- 库存盘点 `STC-*` 17 个、销售退货 `SRT-*` 13 个、报损 `DMG-*` 13 个接口正式生效，共 43 个；
- API Master Specification v1.1 更新为 Completed / Approved / Frozen，正式接口总数为 315，并成为后续阶段唯一 API 事实来源；
- Task 6.3 正式批准，状态更新为 Completed / Approved；Task 6.1 至 Task 6.3 至此全部为 Completed / Approved；
- 正式执行并完成 Phase 6 Final Consistency Review，状态为 Completed / Pending Approval；
- 审查确认 Phase 4 Approved 页面均有正式 API 支撑，采购与生产保持平行，生产订单独立创建，采购来源与生产来源验收互斥；
- 审查确认 PC 管理端与微信小程序使用同一系统身份、角色、权限及数据范围，不建立独立微信用户体系或新增认证字段；
- Database Logical Design v1.1 保持 Frozen，未发现数据库冲突或新的 API 冲突，不需要新增 DCR 或 Change Request；
- Phase 6 保持 In Progress，当前下一步为 Phase 6 Final Consistency Review GitHub 验收；
- Phase 7 保持 Waiting / Not Started，未经项目负责人最终验收不得冻结 Phase 6 或启动 Phase 7。

### 影响

本决定批准 API Change Request 001 已设计的 43 个接口并冻结 API Master Specification v1.1，不新增其他业务模块、接口、表、字段、关系、状态或业务对象，不修改 Frozen Database Logical Design v1.1 或 Approved 页面；不编写代码，不创建真实页面、API Route、ORM、Schema、Migration 或 Seed，不安装依赖，不冻结 Phase 6，不启动 Phase 7。

## DEC-057 批准并冻结Phase 6功能详细设计

### 状态

Approved

### 日期

2026-07-22

### 决定

- 项目负责人正式批准 Phase 6 Final Consistency Review，状态更新为 Completed / Approved；
- Phase 6 功能详细设计正式更新为 Completed / Approved / Frozen；
- Task 6.1、Task 6.2、Task 6.3 均保持 Completed / Approved，并成为后续技术阶段的正式产品输入；
- Phase 6 的 Phase Exit Gate 与 Freeze Gate 已全部通过，无 Pending DCR、Pending Review、Pending Change Request 或 Outstanding Issue；
- API Change Request 001 保持 Completed / Approved；
- API Master Specification v1.1 保持 Completed / Approved / Frozen，是唯一正式 API 事实来源，正式接口总数保持 315；
- Database Logical Design v1.1 保持 Frozen；
- 后续如需修改 Phase 6 正式内容，必须通过 DCR 或正式 Change Request；
- 不得通过聊天记忆、代码实现或临时决定覆盖 Frozen 文档；
- Phase 7 保持 Waiting / Not Started，当前下一步为 Phase 7 规划与启动准备；
- 未经项目负责人后续正式指令，不得启动 Phase 7 或预先设计 Phase 7 Task 结构。

### 影响

本决定只完成 Phase 6 状态批准、冻结说明和治理关闭，不修改 Phase 6 正文业务规则、Frozen Database Logical Design v1.1、Frozen API Master Specification v1.1 或 Approved 页面；不新增表、字段、关系、状态、页面、模块、接口或业务对象；不编写代码，不创建真实页面、API Route、ORM、Schema、Migration 或 Seed，不安装依赖，不启动 Phase 7。

## DEC-058 启动Phase 7并执行Task 7.1开发基线与工程初始化

### 状态

Approved

### 日期

2026-07-22

### 决定

- 项目负责人正式批准启动 Phase 7 开发规范与 Codex 执行，Phase 7 状态更新为 In Progress；
- Task 7.1 开发基线与工程初始化正式启动，状态更新为 In Progress；
- Phase 7 采用简化后的“6 个 Task + 独立 Final Consistency Review”结构，Final Consistency Review 是 Phase Exit Gate，不作为 Task 7.7；
- Task 7.1 确认 PC 管理端采用 Next.js、React、TypeScript，微信小程序采用 Taro、React、TypeScript，后端采用 Next.js Route Handler，ORM 采用 Prisma，数据库采用 PostgreSQL，UI 采用 Tailwind CSS 与 shadcn/ui，认证权限采用 JWT 与 RBAC，工程采用 Monorepo；
- 推荐目录保持 `apps/admin`、`apps/miniapp`、`packages/api`、`packages/database`、`packages/shared` 和 `docs`；
- Phase 7 六个 Task 依次为：Task 7.1 开发基线与工程初始化、Task 7.2 Monorepo 工程骨架与质量门禁、Task 7.3 数据持久化与后端公共基础、Task 7.4 双端应用壳层与公共能力、Task 7.5 核心业务功能实现、Task 7.6 系统集成与开发收口；
- 项目经理不承担技术方案判断；技术方案由 ChatGPT 产品经理负责制定与评审，Codex 负责实现；项目经理负责业务确认、测试和最终批准；
- Phase 6 保持 Completed / Approved / Frozen，Database Logical Design v1.1 与 API Master Specification v1.1 保持 Frozen，正式 API 总数保持 315；
- 技术开发仅进入开发规范阶段，业务编码尚未开始；
- 当前任务为 Task 7.1 开发基线与工程初始化，当前下一步为 Task 7.1 GitHub 验收；
- 未经 Task 7.1 GitHub 验收和项目负责人批准，不得启动 Task 7.2。

### 影响

本决定只建立 Phase 7 开发基线并同步阶段状态，不修改 Frozen BUSINESS_RULES、Database Logical Design v1.1、API Master Specification v1.1、315 个正式 API 或 Phase 6 Functional Specification；不新增数据库表、字段、关系、状态、业务对象或业务流程；不创建源代码、真实 API Route、Prisma Schema、Migration、Seed 或工程目录，不安装依赖，不开发采购、生产、库存、出入库或跨境业务功能。

## DEC-059 批准Task 7.1并启动Task 7.2

### 状态

Approved

### 日期

2026-07-22

### 决定

- 项目负责人正式批准 Task 7.1 开发基线与工程初始化，状态更新为 Completed / Approved；
- Phase 7 保持 In Progress；
- Task 7.2 Monorepo 工程骨架与质量门禁正式启动，状态更新为 In Progress；
- 当前正式任务更新为 Task 7.2；
- Task 7.2-A、Task 7.2-B 和 Task 7.2-C 仅为 Task 7.2 内部执行 Section，不属于正式项目治理状态，不写入 `PROJECT.md`、`README.md` 或 `ROADMAP.md`；
- 当前内部执行下一步为 Task 7.2-A；
- Task 7.3 至 Task 7.6 与 Phase 7 Final Consistency Review 保持 Waiting / Not Started；
- 未经 Task 7.2 GitHub 验收和项目负责人批准，不得启动 Task 7.3。

### 影响

本决定只同步 Phase 7 Task 状态，不修改 Task 7.1 开发基线正文、Frozen BUSINESS_RULES、Database Logical Design v1.1、API Master Specification v1.1、315 个正式 API 或 Phase 6 Functional Specification；不新增数据库表、字段、关系、状态、业务对象或业务流程；不创建工程代码、Schema、Migration、Seed 或其他实现文件，不安装任何依赖。

## DEC-060 批准Task 7.2并启动Task 7.3

### 状态

Approved

### 日期

2026-07-22

### 决定

- 项目负责人正式批准 Task 7.2 Monorepo 工程骨架与质量门禁，状态更新为 Completed / Approved；
- Phase 7 保持 In Progress；
- Task 7.3 数据持久化与后端公共基础正式启动，状态更新为 In Progress；
- 当前正式任务更新为 Task 7.3；
- 当前下一步更新为 Task 7.3（正式任务）；
- 正式治理文档只记录 Phase 与 Task，不记录 Task 7.3 内部执行 Section；
- Task 7.4 至 Task 7.6 与 Phase 7 Final Consistency Review 保持 Waiting / Not Started；
- 未经 Task 7.3 GitHub 验收和项目负责人批准，不得启动 Task 7.4。

### 影响

本决定只同步 Phase 7 Task 状态，不修改 Task 7.1 开发基线正文、Frozen BUSINESS_RULES、Database Logical Design v1.1、API Master Specification v1.1、315 个正式 API 或 Phase 6 Functional Specification；不新增数据库表、字段、关系、状态、业务对象或业务流程；不修改工程代码、依赖或其他实现文件，不执行 Task 7.3 技术开发。

## DEC-061 建立当前状态唯一入口与自动一致性检查

### 状态

Approved

### 日期

2026-07-22

### 决定

- 新增 `docs/00-governance/CURRENT_STATUS.md`，作为当前 Phase 与 Task 状态的唯一入口；
- 当前状态判断依次参考 `CURRENT_STATUS.md`、`ROADMAP.md`、`PROJECT.md` 和 `README.md`；
- `API_SPEC.md`、`DECISION_LOG.md` 和 `CHANGELOG.md` 不再承担当前状态判断职责；
- `README.md` 只展示当前 Phase、Phase 状态、当前 Task 与 Task 状态的简要摘要；
- 正式状态治理文件只记录 Phase 与 Task，不记录 Section 状态；
- 新增 `pnpm status:check`，自动核对四份状态文档的当前 Phase、Phase 状态、当前 Task 与当前 Task 状态；
- `pnpm check` 将 `status:check` 作为第一道质量门禁；
- Codex 每次任务开始前必须运行 `pnpm status:check`，失败时停止执行并报告。

### 影响

本决定只改进项目状态治理和工程质量门禁，不修改 Frozen BUSINESS_RULES、Database Logical Design v1.1、API Master Specification v1.1 的接口定义与 315 个正式 API、Phase 6 Functional Specification、数据库结构或业务规则；不实现 Prisma、PostgreSQL、真实 API、认证或 ERP 业务代码。

## DEC-062 批准warehouse_type正式枚举补全

### 状态

Approved

### 日期

2026-07-22

### 决定

- 项目负责人正式批准 `warehouse_type` 的五个正式枚举代码：`company`、`manufacturer`、`overseas`、`transit` 和 `pending`；
- `manufacturer` 要求 `manufacturer_id` 非空，`overseas` 要求 `country_code` 非空，`transit` 与 `pending` 要求 `allows_available_stock` 为 `false`；
- `company`、`manufacturer` 和 `overseas` 可以允许形成可用库存；
- 新增 `docs/03-data/DATABASE_ENUM_SPEC.md` v1.0，状态为 Completed / Approved / Frozen，作为后续数据库物理映射的正式枚举输入；
- 后续 PostgreSQL、Prisma Schema、Migration 及相关校验必须使用上述英文代码，不得自行增加其他 `warehouse_type` 值；
- `TASK_3_5_5_CHECK_CONSTRAINT_STANDARD.md` 原有三条仓库 Check 规则保持不变，仅将预留的枚举输入指向新增正式规范。

### 影响

本决定只补全 Frozen Database Logical Design v1.1 已预留的 `warehouse_type` 枚举代码，不新增、删除或修改数据库表、字段、关系、索引、原有 Check 规则、API 或业务对象；不修改 BUSINESS_RULES、Phase 6 Frozen 内容或 315 个正式 API；不安装 PostgreSQL、Prisma，不创建 Schema、Migration、Seed 或工程代码。

## DEC-063 完成并冻结角色权限规格

### 状态

Approved

### 日期

2026-07-22

### 决定

- 从已有 Approved / Frozen 业务、Phase 2 职责、Phase 4 页面、Phase 5 API 和 Phase 6 功能详细设计中整理 `ROLE_PERMISSION_SPEC.md` v1.0；
- 正式角色固定为管理员、采购人员、仓库人员、销售人员和公司负责人 5 类，不将 Phase 2 历史“建议角色”或生产/验收/跨境能力另建新角色；
- 建立 `module.resource.action` 命名规范和 244 个可追溯正式权限代码，完成角色权限矩阵；
- 数据范围固定为 `all`、`self_created`、`business_related`、`warehouse`、`store` 和 `manufacturer_derived`；厂家范围只从厂家仓及正式业务关系派生；
- `administrator` 是全功能权限角色，但不得越过职责分离、数据/字段范围、状态、幂等、并发、库存和审计约束；
- `ROLE_PERMISSION_SPEC.md` 更新为 Completed / Approved / Frozen，并成为角色代码、权限代码、角色权限映射和数据范围的唯一正式入口；
- API 权限语义仍以 Frozen API Master Specification v1.1 为依据；两者冲突时必须停止，不得自行覆盖；
- 一致性核对结果为无权限角色 0、未分配权限 0、无正式来源权限 0。

### 影响

本决定只完成角色权限规格的文档治理与 Frozen 输入收口，不修改 BUSINESS_RULES、Database Logical Design v1.1、API Master Specification v1.1、Phase 6 Frozen 内容或 315 个正式 API；不修改 Prisma Schema、Migration、Seed 或工程代码，不执行 Task 7.3-C 开发。

## DEC-064 批准Task 7.3并启动Task 7.4

### 状态

Approved

### 日期

2026-07-22

### 决定

- 项目负责人正式批准 Task 7.3 数据持久化与后端公共基础，状态更新为 Completed / Approved；
- Phase 7 保持 In Progress；
- Task 7.4 双端应用壳层与公共能力正式启动，状态更新为 In Progress；
- 当前正式任务更新为 Task 7.4；
- Task 7.5 至 Task 7.6 与 Phase 7 Final Consistency Review 保持 Waiting / Not Started；
- 未经 Task 7.4 GitHub 验收和项目负责人批准，不得启动 Task 7.5。

### 影响

本决定只同步 Phase 7 Task 状态，不修改 Frozen BUSINESS_RULES、Database Logical Design v1.1、ROLE_PERMISSION_SPEC、API Master Specification v1.1、315 个正式 API 或 Phase 6 Functional Specification；不修改工程代码、依赖、Prisma Schema、Migration 或 Seed，不执行 Task 7.4 技术开发。
