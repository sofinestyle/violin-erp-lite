# 采购与生产双业务链对齐报告

日期：2026-09-07。基准：origin/main `348cd4b271318d53c0fd5a5a3e0587cf1c0dcd93`。

## 1. 实施前审计与依据

当前 Phase 10 Completed / Approved，本次属于项目负责人批准的后置 UAT 调整，不修改路线或 Phase 状态。

| 审计项 | 结论 |
| --- | --- |
| Production Create / DTO | 不要求采购单；Service 与 Repository 均明确拒绝 purchaseOrderId |
| 生产页面 | 已支持厂家与 SKU 直接创建，无采购来源选择器 |
| 质检 | 共享 inspection_orders / items，purchase / production 来源互斥 |
| 入库 | 共享 inbound_orders / items，已有独立 purchase / production 创建接口和来源校验 |
| Database | production_orders 没有 purchase_order_id，亦无采购强制外键 |
| 状态机 | 采购、生产独立执行；生产完工只形成质检资格，不直接增加库存 |
| 现有工作台问题 | 质检名称不够清晰、选项未筛选合法状态、入库重复选择原单、完工版本号暴露、状态动作全部显示 |
| 历史文档问题 | 部分 UAT / 最终验收的串行模块图易误读为采购强制产生生产，不代表正式数据关联 |

依据：Frozen BUSINESS_RULES BR-002～010、BR-027；Task 5.3 第 5、9、11～14 节；Task 5.4 第 4～9 节；Task 4.6 / 4.7 / 4.9 页面设计；Phase 8 Production / Inspection / Inbound 实施文档。正式 API 已禁止采购与生产直接关系，本轮不引入“可选采购参考”。BUSINESS_RULES 无需修改，保留 Frozen 原文。

## 2. 已批准执行方案

- 采购：供应商 → 采购订单 → 采购质检 → 采购入库 → 库存。
- 生产：生产厂家 → 独立生产订单 → 分批完工确认 → 成品质检 → 成品入库 → 库存。
- 前端按入口固定来源类型、过滤合法来源，入库由已确认质检自动推导原订单及明细；用户不填写 UUID、JSON 或状态枚举。
- 保留既有采购付款、生产进度、分批完工入口，不删减已批准功能。数量与状态以后端为准，不新增状态。
- 统一中文提示与状态动作可用性；版本号由详情读取，生产开始、完工确认、入库确认使用既有请求字段。
- 数据库 / API / Permission 均无变更，不新增接口、字段或权限；不实现 BOM、领料、MRP 或原材料联动。CR Not Required。

## 3. 测试与验收计划

自动化覆盖独立创建、互斥来源、合法状态选项、可质检/可入库数量、来源切换防串单、中文表单及状态动作。使用真实 Prisma Repository、PrismaAuditWriter 和本地 UAT PostgreSQL，先执行生产案例（不得创建采购作为前置），再执行采购案例。使用 UAT-DUAL 标识数据，不删除既有业务数据、不直接修改库存。

采购 100 → 合格 98 / 不合格 2 → 入库 +98；生产 100 → 分批完工 100 → 合格 97 / 不合格 3 → 入库 +97。核对业务来源、audit_logs、inventories、inventory_transactions，并测试交叉来源拒绝和重复确认保护。

## 4. 执行结果

两条独立业务链完成前端对齐并通过自动验证。原后端已独立，本轮没有“拆除数据库强依赖”，也没有新增后端业务能力。UAT：Fixed / Pending Manual Verification，不自动关闭。

### 4.1 采购链

采购订单仅选择供应商和 SKU，不选择厂家或生产单。采购质检只提供已审核采购订单，按剩余未质检数量加载明细。采购入库只提供已确认、来源为采购的质检单，自动读取其采购订单和质检明细，默认数量受质检合格量与订单剩余可入库量共同限制。

### 4.2 生产链

生产订单直接选择厂家和 SKU；创建表单不请求采购订单列表，也不提交 purchaseOrderId。开始生产使用既有日期与生产说明字段；分批完工不再要求手填生产订单版本号，自动从来源详情读取。完工确认不再错误要求完工单拥有通用 versionNo。成品质检读取已确认完工数量减已质检数量；成品入库从已确认成品质检自动关联生产订单。列表查看仍允许选择已完工生产订单，不因创建选项过滤而丢失历史完工记录。

### 4.3 共用模型和体验

- 质检沿用 inspection_orders / inspection_order_items，source_type 为 purchase 或 production；入库沿用 inbound_orders / inbound_order_items，来源类型为 purchase_order 或 production_order。两个入口不能互换质检单。
- 库存事实仍仅为 inventories + inventory_transactions。创建、审核、完工、质检不直接增加库存；确认入库才增加余额并写入流水。
- 入口中文化为采购质检、成品质检、采购入库、成品入库。状态筛选和按钮遵守已有状态机，生产“已完工”、入库“已确认入库”仅为中文展示，不新增 Enum。
- 来源加载期间禁止保存；切换来源清空旧明细并忽略过期异步返回；切换业务标签清理工作台状态，Header / Sidebar 不重新挂载。可处理数量自动带入，用户可在合法范围内调整。
- 质检结果、库存状态、生产进度阶段使用中文下拉；隐藏通用版本号和非业务详情字段。字段错误转换为中文并保留 Request ID；入库批次号补充必填提示。采购/生产页面页头移除旧的占位说明。
- 复用既有 PUR-* / PRO-* / INS-* / INB-* 路径与权限，保留二次确认和 Idempotency-Key；服务端权限、职责分离、来源校验仍是最终控制点。

## 5. 自动化验证

环境：macOS，本地 Node v22.23.1，pnpm 11.12.0，PostgreSQL UAT 数据库 violin_erp_lite，http://localhost:3100。未操作 PM2，未停止、重启或修改 AI 视觉平台。

| 验证 | 结果与证据 |
| --- | --- |
| Admin 专项 | workflow-page 14 项 + dual-flow 7 项：独立生产表单、互斥来源、合法状态、剩余数量、内部版本读取、中文错误及 Request ID |
| 完整质量门禁 | pnpm check：格式、Lint、类型、默认测试、Admin / Mini Program 构建通过；默认 379 项通过、38 项条件性跳过 |
| 真实 Prisma 专项 | dual-flow.integration.test.ts 3 项另行启用并全部通过，不计为默认跳过后未执行 |
| 浏览器 | 生产直接创建 → 完工 → 成品质检 → 成品入库，以及采购 → 采购质检 → 采购入库，共 23 次写动作交互通过；无页面异常、控制台 error/warn；模拟请求 129 次，无异常 4xx/5xx |
| 健康检查 | 3100 Health HTTP 200，application.status=ok，database.status=connected；3000 首次响应 307，跟随跳转 HTTP 200 |
| 治理与差异 | pnpm status:check、git diff --check 通过；Phase 10 Completed / Approved 不变 |

浏览器工具说明：Browser plugin not available，依照前端测试技能使用已有 Playwright + Chrome。浏览器使用模拟的既有 API，不写人工验收数据；真实持久化单独通过 API Service → Prisma Repository → 本地 PostgreSQL，并使用 PrismaAuditWriter。测试审核身份复用现有 uat-003a-approver 的真实用户主键、在测试进程注入授权上下文，创建者为 dev-admin；没有修改数据库角色/权限，不将此宣称为两个真实登录账号的端到端权限验收。

真实测试可复现命令：在 Node 22 下将项目根 .env 的 DATABASE_URL 作为进程内 DUAL_FLOW_INTEGRATION_DATABASE_URL，再执行 `pnpm --filter @violin-erp/database exec vitest run tests/dual-flow.integration.test.ts`。测试仅允许本地 violin_erp_lite；每次会保留新的 UAT-DUAL 标识业务数据，不能对生产数据库运行。

## 6. 真实数据库闭环结果

有效验证批次：UAT-DUAL-9328A072，自动生成产品编码 PRD-000011，独立 SKU 区分两条链，使用同一 UAT 成品仓。

| 项目 | 案例 B：生产（先执行） | 案例 A：采购（后执行） |
| --- | --- | --- |
| 原订单 | PRO-20260907-C2B608AE | PO-20260907-8EEBB78A |
| 原订单数量 | 100，独立创建 | 100，无生产关联 |
| 完工 | 100，确认后生产已完工 | 不适用，不创建生产单 |
| 质检 | INS-20260907-10B325B9，合格97 / 不合格3 | INS-20260907-A13D5B1B，合格98 / 不合格2 |
| 入库单 | INB-20260907-356E0E07 | INB-20260907-88AA9B5B |
| SKU | UAT-DUAL-9328A072-44-BK | UAT-DUAL-9328A072-44-BR |
| 库存 | on_hand=available=97，reserved=pending=0 | on_hand=available=98，reserved=pending=0 |
| 流水 | ITX-20260907-0FCA67EB，0→97 | ITX-20260907-4329FA7F，0→98 |
| 来源核对 | inbound.source_document_type=production_order，指向原生产单 | inbound.source_document_type=purchase_order，指向原采购单 |
| 独立性断言 | 全部生产链执行前后，采购单总数完全不变 | 全部采购链执行前后，生产单总数完全不变 |

两条流水的 source_document_type 均为既有正式值 inbound_order，分别指向对应入库单；通过入库单追溯质检和原订单。流水表没有来源单号快照字段，不伪造新字段，以上单号由正式对象关联核对。采购单在现有状态机下仍为 approved，不因本次合格品入库虚报为整单 completed；不合格2件不计入库存。

成功 Workflow 操作共23条，逐一按正式 object_id + request_trace_id 核对真实 audit_logs，均恰好1条成功记录。采购质检错误传生产来源、成品质检错误传采购来源、采购入库使用成品质检、成品入库使用采购质检共4项均拒绝。两张入库单重复确认均拒绝，流水仍仅2条，库存未重复增加。

首次测试脚本误将状态动作响应当作包含明细的详情 DTO，因此中断；修正为使用正式 GET 详情后完整通过，未修改后端 Response。该预跑批次 UAT-DUAL-A4B925AB（PRD-000010、PO-20260907-A75F5E0C 已审核、PRO-20260907-CEC62392 生产中）保留 UAT 标识，未入库、无库存流水。未自动取消/删除既有或本次业务记录。

## 7. 边界、限制与待人工验证

- Database / Schema / Migration / API Contract / Permission / BUSINESS_RULES 均无修改，CR Not Required。没有 BOM、MRP、采购领料联动或新增状态。
- 页面仍沿用本批之前的单行明细录入和最多100条候选来源列表；本轮不扩展多行编辑或大数据远程搜索。来源数量和状态最终以后端重新校验为准。
- 数据库驱动输出既有 pg client.query 并发调用 DeprecationWarning；本次真实事务正常完成，记录为环境/依赖警告，不伪装成无警告。审计正常落库验证不等于本轮重构了所有 Workflow 的审计事务边界。
- 人工复验：分别使用具有正式授权的制单人与审核人，直接创建生产单（不建采购单），确认部分/全部完工、成品质检及成品入库；另测采购质检及采购入库；核对原单、合格/不合格数量、库存流水链接与状态提示。创建者不得自行审核的原有职责分离规则仍有效。
- 主观体验、实际岗位权限及超100条来源的选取仍需人工抽查；不自动标记 Verified / Closed。本轮已验证范围未发现未解决的 Blocker / Critical / Major。

## 8. 修改文件

- apps/admin/components/shell/app-frame.tsx：采购/生产页头业务说明。
- apps/admin/components/workflow/workflow-hub.tsx：业务标签切换清理工作台状态。
- apps/admin/components/workflow/workflow-workbench.tsx：来源、明细、默认值、状态动作、内部版本与中文反馈。
- apps/admin/lib/workflow.ts：两条链入口命名与说明。
- apps/admin/lib/dual-flow.ts：来源资格、数量、上下文和状态动作共用逻辑。
- apps/admin/tests/workflow-page.test.tsx、apps/admin/tests/dual-flow.test.ts：页面与双链编排回归。
- packages/database/tests/dual-flow.integration.test.ts：真实独立双链及审计/库存/负向验证。
- 本报告、UAT_TEST_RECORD.md、UAT_CHANGE_LOG.md、CHANGELOG.md：结果与人工验收边界。
