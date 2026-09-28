---
document_name: Procurement Self-Approval Rule Change
project: Violin ERP Lite
cr_id: CR-012
status: Approved / Implemented
owner: Project Manager
created_date: 2026-09-28
---

# CR-012 采购自审规则及管理体验同步

Approved By：Project Owner。Approval Date：2026-09-28。依据：负责人本次 Manual UAT UX Batch 明确批准取消采购订单制单/审核人必须分离，并要求保留动作权限、数据范围、合法状态与真实 Audit。

## 批准边界

仅 purchase_order 审核允许 creator=approver。purchase.order.approve、记录访问范围、版本、待审核前置状态和必需 Audit 均保留；不把角色或审核权限解释为全范围，不新增 Permission/Role/Scope。生产、入库及其他单据职责分离不变。覆盖 CR-011 对采购订单的职责分离约束，保留其五状态、整单数量、确认事务、历史异常只读隔离及生产不变原则。

本批同步主数据和采购呈现：产品分类完整路径、店铺平台名称、分类保留停用父级的层序；采购列表隐藏单号但保留搜索/详情/审计；正常采购只显示五个业务状态，异常历史在独立只读入口显示待复核，不虚构状态。采购列表/详情返回基于正式关联的产品型号、名称、尺寸、颜色等业务展示字段，不另建产品数据源，不逐行查询。

采购 Create 使用现有 suppliers.settlement_method / payment_terms 与 purchase_orders.settlement_method / payment_terms_snapshot；服务端读取主数据并保存快照，前端自动回显，后续供应商修改不回写历史订单。账期超出正式快照长度应明确拒绝，不截断。客户端既有结算字段保留兼容，但不覆盖服务器主数据来源。订单预计交付日为本版唯一录入交期，明细现有 nullable 字段自动继承；无新 Schema。新表单行金额为数量乘单价，新建税率保持既有允许值 0，总金额等于行金额合计；历史订单原有含税总额保留，不按 UI 重算或改写财务事实。币种按正式 currency_code 格式化。

本次不新增数据库迁移；沿用已部署 CR-011。API 路径/总数不变，v1.15 记录自审、主数据快照及派生展示字段。正常采购提交/撤回/反审核/编辑入口关闭，待审核无业务引用允许创建人或管理员按既有取消权限安全删除，删除与 Audit 同事务。

## 验证与交付

覆盖有权自审、无权限拒绝、范围外拒绝、状态与审计、供应商切换/历史快照、日期选择、金额、业务展示及层级循环回归。真实 HTTP / Browser / PostgreSQL 验证 10 × 300 = 3000，保存待审核、自审采购中。质量/入库确认、失败回滚和生产职责分离保留专项覆盖。整个批次一个 Commit：refactor: simplify procurement management experience；状态 Fixed / Pending Manual Verification，不标记 Closed。


## 实施记录（2026-09-28）

上述批准范围已实施。真实浏览器通过日历创建 10 × 300 采购单并由同一账号审核，状态待审核→采购中，创建人与审核人及 Audit 一致。采购审核、质检确认的 Audit 故障已在真实 PostgreSQL 中验证全部回滚；无权限及范围外动作仍拒绝。供应商快照、产品/店铺/分类和采购展示完成，正式权限代码与数据范围未扩展。完整证据和测试范围见 `docs/quality/PROCUREMENT_MANAGEMENT_UX_REFACTOR_REPORT.md`；UAT 保持 Fixed / Pending Manual Verification。
