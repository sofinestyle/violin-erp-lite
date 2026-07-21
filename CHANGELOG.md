---
document_name: 项目变更记录
project: Violin ERP Lite
version: 1.0
status: Draft
owner: Project Manager
created_date: 2026-07-19
updated_date: 2026-07-21
related_phase: Phase 1
---

# CHANGELOG

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
