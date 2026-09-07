# CR-006 采购订单受控安全删除

类型：API Contract Change。状态：Approved。

Approved By：Project Owner。Approval Date：2026-09-07。

审批依据：项目负责人本次《Procurement Order Safe Delete Implementation》明确批准业务范围，并授权先建立最小 API CR、再实施。

## 批准范围

新增 `PUR-030 DELETE /api/v1/purchase-orders/{id}`；UUID 路径参数，无请求体，必须提供 `Idempotency-Key`，复用认证、Trace、标准响应及错误码。成功 HTTP 200，标准 envelope 中 `data = { id, deleted: true }`。不改变既有接口。

草稿订单复用 `purchase.order.cancel`，同时遵守现有 all / self_created 数据范围。已取消订单除上述权限与范围外，必须为 administrator 且具有明确测试标识。其他状态拒绝。编辑权限不授予删除资格。

测试标识仅认数据库中单号或备注去除首尾空白后，以大写 `UAT-` 加字母数字批次开头，批次之后为连字符、空白、冒号或字符串结束，例如 `UAT-003A-采购`。不认任意位置包含 UAT、日期、创建人或已取消状态。保留原始标识于删除审计快照；历史数据不自动补标。

## 历史完整性及事务

本变更仅允许无下游业务记录的草稿及上述已取消测试订单；不授权删除付款、退货、质检、入库、库存流水、附件或其他历史业务数据。引用判断保守包含已作废、已撤销记录。已有审核记录也阻止删除。审计与状态历史保留，删除审计记录原单据及明细快照。

锁定采购单后重新校验权限、状态、测试标识、引用及累计执行数量；明细随既有外键级联删除。删除和真实 Prisma Audit 写入处于同一事务；失败全部回滚。数据库外键作为最终保护；附件多态关联写入与删除协调采购单行锁。

拒绝引用使用既有 `CONFLICT_REQUEST`，提示“该采购订单已产生后续业务记录，无法删除。”；状态拒绝使用同一码，提示“当前状态的采购订单不允许删除。”；权限不足复用 403，数据范围不可见复用 404；审计失败沿用既有审计错误。不新增错误码。

## 前端及影响

草稿在具有取消权限时展示删除；取消单仅 administrator 且测试标识明确时展示。服务端最终判定下游引用；不增加列表响应字段。二次确认后执行，成功刷新，失败显示具体原因及 Request ID。

Database / Migration：No Change。Permission Code / Permission SSOT：No Change。Business Rules：不改变已产生下游业务记录不得删除的规则；本 CR 明确未使用草稿与隔离测试清理边界。UAT 状态为 Fixed / Pending Manual Verification，不代替人工验收。

## 验收

覆盖草稿成功、所有下游保护、普通用户越权、正式取消单保护、管理员测试取消单、其他状态保护、真实审计落库与故障回滚、外键错误映射、二次确认及列表刷新。测试只操作独立 UAT 夹具，不清理已有订单。
