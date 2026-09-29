# Procurement Workflow Simplification 验证报告

> 2026-09-29 更新：CR-013 已批准采购最终简化，当前正式采购流程为采购订单 → 采购入库 → 库存（待审核 → 采购中 → 已入库）；独立采购付款/质检停止写入，采购入库一次确认完成。以下原五状态及入库二次审核说明为历史记录。当前代码、真实 HTTP/PostgreSQL 和自动化已通过；项目负责人于 2026-09-29 确认人工测试通过，当前 UAT 为 Fixed / Manual Verification Passed。保留此前自动浏览器原生确认交互超时记录，不将其改记为自动 E2E 通过。详见 [采购最终简化报告](./PROCUREMENT_FINAL_SIMPLIFICATION_REPORT.md)。


日期：2026-09-08。所属任务：当前 Procurement Workflow Simplification，未建立新批次或新 UAT 编号。

## 当前结论

**Fixed / Pending Manual Verification（2026-09-28 最新结论）。** 本任务已并入主数据与采购管理体验批次，CR-012 正式允许采购自审，替代此前采购双账号职责分离条件。保存、自审、整单质检、快照、待审核删除及真实 PostgreSQL Audit 回滚已验证；实现和回归已完成。当前新建采购入库的跨用户实际库存闭环仍未执行，不声明该部分 E2E 通过。最新完整执行边界见 [采购管理体验报告](./PROCUREMENT_MANAGEMENT_UX_REFACTOR_REPORT.md)。以下 2026-09-08 记录保留为历史诊断，不能作为当前状态。

基准 Commit：`c42385ebc9dd92864b7e7d0ee64366b0c12a2d0a`。

## 双账号真实认证与范围核验

通过正式 `POST /api/v1/auth/login` 分别认证现有制单账号、临时审核账号，均返回 HTTP 200。未输出密码、Token 或修改现有密码。未创建其他账号、未调整临时账号权限或范围。

临时审核账号持有且仅持有四项功能权限：`purchase.order.read`、`purchase.order.approve`、`inbound.order.read`、`inbound.order.approve`；正式解析的数据范围为 `business_related`，没有仓库范围。账号创建 Audit 已存在。

真实 HTTP 结果：

| 核验 | 结果 |
| --- | --- |
| 制单账号采购列表 | HTTP 200，36 条 |
| 审核账号采购列表 | HTTP 200，0 条 |
| 审核账号读取制单人的待审核采购单 | HTTP 404，`RESOURCE_NOT_FOUND` |
| 跨用户实际审核 | 未执行：审核账号无该单据正式访问范围 |

功能审核权限与记录访问范围不能互相替代。`ROLE_PERMISSION_SPEC.md` 第 8 节规定 all 需明确全范围授权，business_related 必须由实际业务关系派生；第 9 节要求直接 API 仍执行范围检查。当前 Workflow 查询仅处理 all、self_created 和适用仓库范围，未提供让当前临时审核账号访问另一制单人待审核采购单的有效关系。CR-011 第 1 节明确不新增数据范围，本次指令禁止扩大临时账号权限，因此未把审核权限改成全部采购可见，也未使用直接调用写接口绕过读取范围。

需要先确定审核人的正式记录范围及授予机制。其治理结论应明确适用单据、关联来源、有效期、跨用户审核边界与审计，不能用角色名称或权限代码直接推导全量访问。

## 业务闭环与负向条件

案例 A 完整状态链、库存增加、库存流水、质检及入库 Audit：**未执行**。

案例 B 待审核无下游删除、残留明细与删除 Audit：**未执行**。

九项负向条件（待审核不能质检、采购中不能入库、重复质检、重复入库、已取消无下游、执行后禁止删除、无审核权限拒绝、质检失败回滚、入库失败回滚）：**未执行**，不得将范围诊断的 404 当作这些业务用例通过。

浏览器完整闭环、Console 与网络验收：**未执行**。此次没有新建采购、质检或入库测试单，没有增加或清理库存事实。

## 临时账号生命周期

本次未扩大权限、未修改密码、未创建额外账号。由于业务测试尚未完成，暂未执行“测试完成后停用”；账号仍保留原有七天角色有效期。恢复闭环并完成验证后，仍须通过正式用户停用 API 处理并核验审计，不得删除历史 Audit。

## 2026-09-08 环境与交付检查（历史记录）

- `pnpm status:check`：通过；Phase 10 / Release & Acceptance 状态保持不变。
- `git diff --check`：通过。
- `localhost:3100/api/health`：HTTP 200，application.status=ok，database.status=connected。
- `localhost:3000`：初始 HTTP 307，跟随跳转后 HTTP 200；未操作 AI 视觉平台或 PM2。
- `pnpm check`：通过（格式、Lint、类型检查、测试与两端构建）。测试共 513 通过、69 条条件集成测试跳过；跳过项不计为真实数据库验证通过。本次同步了保存即待审核、采购质检员必填两处契约回归断言，并修正事务入口标识检查；没有完成其余状态转换实施。
- Migration：`prisma validate` 通过；`pnpm db:migrate:status` 明确报告 13 个迁移中 `20260908160000_procurement_workflow_simplification` 待部署（退出码 1）。没有本次数据库结构变更落库。
- Git：保留全部在途修改，未提交、未推送。

## 2026-09-28：新增采购与旧撤回入口 500 修复范围

用户报告的 Request ID `ad7c7d80-8aad-4ecd-bc89-fb581c580dbd` 对应采购撤回 POST。应用日志为 HTTP 500；同一时刻 PostgreSQL 日志确认查询 inspection_orders.inspector_name 失败，原因是 CR-011 已批准迁移尚未部署。另两次新增采购失败由 ck_purchase_orders_action_fields 拦截：应用提前生成 submitted_at，数据库稍后生成 created_at，违反 submitted_at >= created_at。用户随后一次新增返回 201，说明该时间问题具有时序相关性，不能按所有保存均失败处理。

修复按现有批准范围执行：新建采购一次生成 created_at、updated_at、submitted_at 的共同时间，不删除或放宽数据库约束；部署已批准 CR-011 迁移，保留全部历史数据；采购页面移除 CR-011 已取消的撤回入口，旧请求在服务端返回明确业务冲突且不修改单据。生产撤回保持原规则。不扩大临时审核账号权限，不声称跨用户闭环已完成。

专项复核：浏览器新建采购保存成功，列表刷新后显示待审核，详情无撤回按钮；Console error/warn 均为 0，无框架错误覆盖层。使用本机已有浏览器自动化的 Playwright 能力，不新增浏览器依赖。真实 HTTP 另外两次保存均成功，三张 UAT 订单分别有一条 PUR-003 成功 Audit，创建/提交/更新时间一致，明细保存正确。正式接口对用户报告的原采购单撤回请求返回 HTTP 409 / CONFLICT_REQUEST 和中文“不支持撤回”提示，前后原记录完全一致。质检员字段查询成功。迁移共 13 个全部已应用，实际 1344 字段、283 CHECK。

测试数据仅使用既有 UAT 供应商及 SKU，备注 UAT-PURCHASE-SAVE-FIX-20260928-*；三张待审核测试单保留，无付款/质检/入库和库存影响，未直接 SQL 删除。此专项状态为 Fixed / Pending Manual Verification，不据此宣称原采购完整闭环通过。

最终 pnpm check 通过：515 项通过、69 条件项跳过；格式、Lint、类型检查、两端构建通过。status:check、diff --check、Prisma validate / migrate status 通过。复测时段服务日志无新增 5xx，Health HTTP 200、application=ok、database=connected。未操作 PM2 或 AI 视觉平台，未提交/推送尚未完成整体验收的采购批次。


## 2026-09-28：合并批次收口

采购自审浏览器订单 10 × 300 保存待审核、审核为采购中，真实制单/审核/Audit 身份一致。另一 HTTP 单整单质检确认后已质检；待审核无下游安全删除及 Audit 通过；采购审核、质检确认 Audit 故障实库回滚通过。临时审核账号本次凭据无效，未改密码或扩权，已通过正式 API 停用并保留审计。旧跨用户采购审批限制被 CR-012 正式替代，生产与入库职责分离保持原样。统一状态 Fixed / Pending Manual Verification，统一提交信息按最新批准批次执行。完整真实入库不计为本次已验证结果。
