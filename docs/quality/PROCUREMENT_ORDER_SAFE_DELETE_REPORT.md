# 采购订单受控安全删除报告

状态：Fixed / Pending Manual Verification。依据：Approved CR-006 / DEC-110。实施基准：d1edcf306439a7f118eb6dc88d9576d1c998486e。日期：2026-09-07。

## 现状及设计

原接口仅覆盖采购查询、创建、编辑和状态操作，无采购 DELETE；复用现有 purchase.order.cancel 权限，不新增权限编码。采购明细已有级联删除外键，付款、质检和退货已有引用约束；附件、入库来源与库存流水存在多态来源，需显式检查。采用锁定采购订单、检查全部引用、删除及真实审计同事务的实现。

草稿无引用允许删除；已取消仅 administrator 可删除具有明确 UAT 前缀的无引用测试订单；其他状态拒绝。详细标识、权限、历史保留和契约见 CR-006。

## 删除规则及权限

1. draft：purchase.order.cancel + 原有 all / self_created 范围；无下游引用才删除。
2. cancelled：上述权限和范围之外，必须 administrator；单号或备注 trim 后满足 `^UAT-[A-Z0-9]+(?:[-\s:：]|$)`。例如 UAT-003A-采购；普通订单、含糊“测试”字样或任意位置包含 UAT 均不认可。
3. 其他状态全部拒绝；不增加状态、不修改历史编码或自动补 UAT 标识。
4. 前端按权限、状态和标识控制入口，服务端从认证上下文及锁定后的数据库记录重新检查；下游引用最终以服务端为准。

## 引用及事务保护

检查 purchase_payments、purchase_returns、purchase_return_items、inspection_orders、inbound_orders、inventory_transactions、damage_reports、attachment_links、approval_records，以及 paid_amount 和采购明细 received / inspected / qualified / inbound / returned 累计值。记录不因作废、撤销或停用而豁免。不存在采购必须关联生产的关系，本次也不引入该关系。

锁定采购订单，重新读取状态/范围/引用；既有 ON DELETE CASCADE 仅删除本单明细，其他外键限制作为最终保护；P2003 转换为“该采购订单已产生后续业务记录，无法删除。”。不删除附件或历史业务单据。audit_logs、document_status_histories 保留，成功删除审计包含原单号、原单及明细快照、真实 UUID、操作者和 Request ID。

订单删除与 PrismaAuditWriter 同事务；故障测试真实制造 Audit INSERT UUID 类型错误，订单及明细完整回滚，无成功删除审计。附件框架的正式事务写入路径增加父采购单 KEY SHARE 锁并复查父单/明细，和删除 FOR UPDATE 锁协调；不使用表锁或长时间外部调用，不修改附件契约。

幂等边界：沿用工作台 Idempotency-Key 入口校验；并发两次删除仅一次成功且仅一条成功审计，后续返回 404。未承诺成功响应跨请求缓存重放，也未增加幂等数据模型。

## 修改范围

- API：新增采购删除策略模块、Workflow PUR-030 匹配及独立权限校验、事务审计回调；Admin DELETE 支持无请求体。
- Database 实现：新增采购删除 Repository 辅助模块；现有 Workflow Repository 接线；附件事务与 Link Repository 增加采购父单锁协调。Schema、Migration、数据库 SSOT 均不变。
- Admin：采购列表按钮、二次确认、防重复提交、中文反馈、刷新；其他工作台不开放删除。
- 测试：API 策略/绕过/审计测试、Repository 引用/FK 映射、真实 PostgreSQL 专项、Admin 路由认证/Trace 与按钮策略。
- 治理：CR-006、API_SPEC v1.10（343 个接口）、DEC-110、CHANGELOG、UAT_TEST_RECORD、UAT_CHANGE_LOG 及本报告。Permission SSOT 与 Phase 状态不变。

## 自动化结果

环境：Node 22.23.1、pnpm 11.12.0、本地 PostgreSQL violin_erp_lite、ERP localhost:3100。

| 验证层 | 结果与范围 |
| --- | --- |
| API 专项 | 新增17项通过：标识边界、状态矩阵、权限绕过、事务审计回调及失败传播；既有 Workflow 7项通过 |
| Repository 单元 | 新增10项通过：9类引用均无生命周期豁免、最终 FK 冲突业务化且不写成功审计 |
| 真实 Prisma / PostgreSQL | 13项通过：草稿及明细删除、真实成功审计、付款引用、角色/正式取消单保护、合法 UAT 取消单、4类其他状态、真实审计故障回滚、数据范围/权限、并发重复删除一次成功、删除后陈旧附件关联拒绝 |
| 默认完整质量门禁 | pnpm check 通过；408项通过，51项按外部环境条件跳过；上述13项真实数据库测试另行显式运行通过，不把默认 skip 当作通过 |
| 浏览器交互 | 当前3100真实页面 + 模拟 API；administrator、purchaser、readonly 三角色通过：允许按钮2/1/0，取消不发请求，确认文案准确，管理员实际模拟删除2次、采购员1次，列表读取3/2/1次；无 pageerror 或 console error/warn |
| 本机端点 | Health HTTP200，application ok / database connected；匿名 DELETE 正确401并返回 Request ID；AI3000跟随跳转HTTP200 |

真实数据库测试仅创建 UAT-PODELETE-* 夹具；成功删除只针对本轮新建、可删除夹具。拒绝及回滚夹具保留标记，既有采购订单按完整字段比对不变；不 reset/drop/seed、不改角色权限。非测试取消单负向夹具备注采用“非前缀 UAT-PODELETE-*”，仅验证不会因包含标记而被误删。

复核中修正了前端 Row 类型检查和浏览器脚本页面地址，之后完整门禁及浏览器重跑通过。浏览器能力使用已有 Playwright：当前没有 Browser 插件；截图保存在工作区外 `/tmp/violin-purchase-delete-browser.png`，已目视检查列表布局、中文状态和删除成功反馈。

## 限制与待人工复验

- 本地 .env 配置的管理员密码与数据库不匹配；未尝试失败登录、未重置密码、未解锁或修改账号。浏览器使用模拟 API；真实业务校验通过正式 Service / Prisma Repository / Prisma Audit 路径完成，不能声称已完成真实登录端到端删除。
- 请使用当前有效的管理员及采购岗位账号，抽查无引用草稿删除、取消 UAT 删除、正式取消单保护、下游引用提示、取消确认不删除和列表刷新。客户端输入不能授权角色或修改状态以绕过检查。
- 无新增多连接压力测试；仅验证单单据并发重复请求。没有改动或重启 AI 平台/PM2，没有清理已有人工验收数据。
- 不新增 UAT 编号、不关闭验收；本次自动化结果不代替人工确认。
