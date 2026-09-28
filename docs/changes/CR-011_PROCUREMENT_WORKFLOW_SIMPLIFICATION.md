---
document_name: Procurement Workflow Simplification
project: Violin ERP Lite
cr_id: CR-011
type: Business / Database / API Contract Change
status: Approved / Implemented
owner: Project Manager
created_date: 2026-09-08
---

# CR-011 采购流程简化与业务状态重构

Approved By：Project Owner。Approval Date：2026-09-08。

审批依据：负责人本次任务明确批准采购五状态、保存即待审核、待审核安全删除、采购质检员文本和确认事务，并补充明确批准：采购改为整单一次执行，每次确认覆盖全部待处理数量，采购不再适用 BR-007 分批；正常历史按确认事实和数量映射，异常历史只读隔离，保留原状态并标记待复核。本文先于 Schema / API / 业务代码修改记录具体变更。

## 1. 业务状态与职责

新建采购状态为 pending_approval（待审核），保存同时写 pending 审核状态、提交人和时间，不建立 draft、不要求额外提交。审批通过写 purchasing（采购中）；驳回仍为 pending_approval，记录 rejected 审核结果与原因，不能恢复 draft。初始批准要求制单与审核分离；2026-09-28 CR-012 正式覆盖采购订单此项约束，允许有审核权限且在范围内的用户自审，其他单据不变。不新增 Permission Code、角色或数据范围。

采购中只有一次完整采购质检确认后变 inspected（已质检）；必须覆盖每条采购明细全部待质检数量，合格加不合格等于质检数量，来源与明细锁内重新核验。已质检且存在有效确认质检、正数可入库合格量，才可创建采购入库；确认覆盖全部未入库合格量，余额、流水、来源累计、主单 received（已入库）、版本、状态历史和必需 Audit 同事务。任何失败全部回滚。零合格量保持已质检，显示无可入库合格数量，不伪造零数量入库或已入库事实。

采购不再支持分批质检/入库；生产及其质检、入库维持既有分批规则。保留质检单和入库单自身既有提交/确认或审批流程，不擅自免除入库审核。采购列表移除编辑、提交、撤回、反审核及不合法动作；已有采购中取消能力并不存在，因此本轮不新增此动作。已质检/已入库不可物理删除。既有验收撤销和入库冲销仍受原权限/下游保护，合法纠错需同事务回推采购状态，不可留虚假已入库。

## 2. 删除

PUR-030 复用 purchase.order.cancel 和现有 all / self_created 范围，再限制制单人本人或 administrator。只允许未执行待审核单；有付款、质检、入库、退货、库存流水、附件等任何下游，或非零执行累计则拒绝。驳回审核记录必须保留，审批记录不应让已驳回待审核订单永远不可删除：仅成功审核事实阻止删除，拒绝记录及状态历史保留。已取消沿 CR-006，仅管理员且明确 UAT 标识、无任何下游可清理。删除与必需 Audit 同事务。

## 3. Database v2.9

现库采购 status 是 VARCHAR，实际 PostgreSQL 未设置采购状态值域 CHECK，并非现有 PostgreSQL Enum。新增采购 CHECK 允许五个正式新状态 pending_approval / purchasing / inspected / received / cancelled，并保留历史 draft / approved / rejected / completed / voided，不批量改写旧状态。

inspection_orders 新增 inspector_name nullable VARCHAR(100)，代表手工填写的实际质检员姓名，首尾去空格、1—100 字符；采购新 API 必填，不要求系统账号。inspection_warehouse_id、inspector_id 改可空；保留原 FK 与所有历史值，生产分支继续必填。采购新单两个 UUID 字段为空，实际操作人仍由 created_by / approved_by / Audit 记录，不拿操作账号冒充手工姓名。条件 CHECK 允许旧采购保留两项 UUID 和空姓名；新采购使用非空姓名及空 UUID；生产必须两项 UUID 非空。姓名空或超长拒绝，不用仓库 ID 保存姓名，不回填未知历史姓名。

无新表、索引、外键、角色。1 个新增字段、3 项新增 CHECK（采购状态、姓名格式、来源身份组合），保留枚举及其他约束。

## 4. API v1.14

不新增 Path，沿用 PUR / INS / INB。采购 Create / 状态动作语义按第 1 节；不再接受客户端通过 submit / withdraw / unapprove 恢复 draft，采购 Update 拒绝。采购来源 INS Create / Update 使用 inspectorName，拒绝 inspectionWarehouseId / inspectorId；生产 DTO 保持原样。旧质检详情仍保留原始关联以追溯。

采购 Response 增加派生 businessStatus（正常记录为五状态之一，异常历史为 null）、legacyReviewRequired、legacyReviewReason；原始 status 保留供只读追溯。status 查询按业务状态过滤；legacyReview=true 单独查询历史异常，不把“历史待复核”定义为第六种业务状态。默认业务列表排除异常并返回 legacyReviewCount 供只读入口提示；来源选择排除异常历史。历史映射必须验证明细数量、有效质检确认和实际入库记录，不将 completed 无证据强行映射已入库，也不重写原数据。

采购质检去掉仓库后，授权基于现有采购来源记录范围和 inspection 功能权限；不会让只有 warehouse 范围但没有采购来源访问资格的账号获得全量采购权限。采购入库仍需目标仓库操作范围。正常动作、来源详情、列表和变更均由服务端检查，前端隐藏不替代安全边界。

## 5. 一致性与验证

采购来源行锁作为同一订单创建/审批/质检/入库/删除的并发边界；锁内检查版本、状态、整单剩余数量、来源绑定、权限及审计。幂等重试不重复库存和流水，不同幂等键并发确认只能一次生效。不修改库存余额来准备或清理测试；完整 UAT 库存事实通过正式单据形成并保留审计。

覆盖正向闭环、待审核删除、八项用户负向条件、整单数量不完整拒绝、审核职责分离、历史异常隔离、文本质检员、生产分批回归、质检和入库 Audit 故障回滚、并发重复确认。执行 pnpm check、status:check、diff 检查、Prisma validate / migrate status、本地 UAT Migration 与 HTTP / Browser。

不改变 Phase / Task，不拆 UAT 编号，最终状态 Fixed / Pending Manual Verification；完成后统一一个 Commit：refactor: simplify procurement workflow。

## 6. 实施进度（2026-09-28）

数据库迁移已部署本地 UAT，13 个迁移全部应用，实际字段 1344、CHECK 283；未批量改写历史业务状态。修正新建保存的创建/提交时间竞争；采购撤回入口移除并返回业务拒绝，符合第 1、4 节原批准规则，不另新增 CR。浏览器保存与旧撤回保护专项通过；此时状态机实施与完整验证仍未完成，以下收口记录为最新结论。


## 7. 合并收口（2026-09-28）

工程实施已完成并并入 Manual UAT UX Batch；统一 Commit message 以最新任务为准：`refactor: simplify procurement management experience`。保存即待审核、采购自审后的采购中、整单质检确认、整单入库确认及纠错状态同步、历史隔离、必需 Audit 事务、安全删除均有回归覆盖。采购审核和质检 Audit 故障在真实 PostgreSQL 验证回滚；质检撤销/作废补齐既有 cancelled_at/by/reason，使操作满足 Frozen action_fields CHECK，不放宽约束。

原“双账号审核”验收条件对采购订单已被 CR-012 取代；采购入库审核仍保持职责分离。当前真实账号未完成新的跨用户入库闭环，不将单元测试视为真实入库 E2E 通过。当前批次规定的浏览器自审闭环已通过；详细执行与未执行边界见管理体验报告。UAT 状态为 Fixed / Pending Manual Verification，未 Closed。
