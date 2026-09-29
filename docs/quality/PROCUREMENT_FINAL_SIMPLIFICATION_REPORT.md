# 采购流程最终简化验证报告

日期：2026-09-29。批准：CR-013 / Project Owner。当前状态：**Fixed / Manual Verification Passed（Project Owner Confirmed）**。代码与自动化、真实 HTTP/PostgreSQL 验证已完成；项目负责人于 2026-09-29 确认“经过人工测试，测试通过。”据此完成本批人工验收收口，按原授权统一提交与推送。

基准 Commit：`1ec2ff2481e5455e50f8a01a0b75a77a8970b74d`。拟统一提交：`refactor: simplify procurement inbound workflow`。项目 Phase 10 / Release & Acceptance 仍为 Completed / Approved，不调整路线、不新增 UAT 编号。

## 正式业务结果

采购流程为供应商 → 采购订单 → 采购入库 → 库存。采购订单正常状态为待审核 → 采购中 → 已入库，已取消为异常终态。采购付款与独立采购质检停止写入及导航入口，历史表、记录、Audit 和只读接口保留；生产付款、完工、成品质检、成品入库不变。

采购入库选择采购中订单，带出供应商及 SKU、型号、名称、尺寸、颜色、采购和已入库数量。继续整单一次执行，不允许部分、超量、遗漏或重复明细。入库日期复用 documentDate，日历选择、默认本地当天。是否质检必选且无默认；质检人选填 100 字，是时显示，切换否清空，服务端同样清空。单位成本继承正式采购单价，客户端覆盖值无效；批次保存 NULL，无成本或批次录入框。

一次确认保存直接生成 completed 入库单，无第二次提交、审核或确认。采购父单行锁内重新验证状态和剩余数量，入库、明细、库存、流水、累计数量、received 状态、状态历史和 required Audit 在同一事务；稳定 SKU 顺序降低库存锁竞争。非可用仓库存进入待处理量，不计入可用量；成本金额使用 Decimal 并按四位精度保存。

列表/详情改为中文业务字段，订单保留八列并增加采购入库入口，详情显示已入库/采购数量。入库显示日期、采购单号、供应商、SKU摘要、数量、是否质检、质检人、目标仓库和状态。Dashboard 增加待采购入库（purchasing）队列，旧入库审核队列限定生产来源。页面不展示 Inspection UUID 或内部来源类型。

## Contract 与迁移

- 统一 CR-013 已批准，API v1.16；正式路径仍 344 个，旧路径保留兼容读取，采购付款/独立质检写入返回明确 409。
- INB-003 改为直接采购入库 DTO：documentDate、purchaseOrderId、warehouseId、inspectionPerformed、items；inspectorName 可选。明细使用 purchaseOrderItemId、skuId、quantity。旧 inspectionOrderId 不接受，成本由服务端决定。
- 复用 inbound.order.create-purchase + inbound.order.confirm 及记录/目标仓 operate/manage 范围；不新增 Permission、Role 或扩大账号 Scope，不要求第二次 inbound.order.approve。前端入口与服务端共同校验，服务端为最终边界。
- Database v2.10：75 业务/平台表、1346 字段、284 CHECK；加上 `_prisma_migrations` 后数据库实测 76 表、1354 字段。新迁移 `20260929090000_procurement_final_simplification` 已部署，总计 14 个迁移。
- inbound_orders 新增 nullable inspection_performed / inspector_name，历史保持 NULL；新增信息一致性 CHECK；inbound_order_items.batch_no 改可空，生产服务仍要求批次。无新表、无历史删除、无枚举或状态 CHECK 放宽。
- 采购原始 inspected 等值保留作历史存储，新业务不写入。历史全量已检合格、无入库且证据完整者兼容为采购中；历史已入库必须有 completed 单和净流水；不合格、分批或证据矛盾订单只读隔离，不机械批量改状态。

## 真实 HTTP 与 PostgreSQL

正式 API 创建采购单 `PO-20260928-0CD5F648`（业务采购日期 2026-09-29，单号前缀沿用既有生成规则）。10 件 × 300 元；保存待审核、正式审核采购中、INB-003 返回 201 completed，入库单 `INB-20260929-AD927A01`。是否质检是，质检人张三；采购单变已入库，目标 UAT 仓账面和可用库存增加 10，生成 1 条入库流水，金额 3000，INB-003 Audit 1 条。客户端尝试传 unitCost=999 和自造 batch 均未覆盖正式成本及 NULL 批次。

新增 `packages/database/tests/procurement-final-postgres.test.ts` 以 RUN_PROCUREMENT_FINAL_POSTGRES=1 单独执行通过：仅复用现有正式账号、UAT 供应商/SKU；通过正式 API 新建本轮 UAT 仓和订单，未创建账号或修改密码。真实事务内分别注入 Audit 和库存流水写失败，均验证主单、明细、库存及采购状态回滚；两个并发入库请求仅一个 201，另一个 409，成功请求同键重放返回原入库对象，最终仅一个入库单、一条库存流水、一条成功审计。

所有测试对象带 UAT 标识，已有完成事实及 Audit 保留用于复核；未直接 SQL 修改/删除业务数据。迁移只调整已批准结构。

## 负向和回归证据

| 场景 | 结果 |
| --- | --- |
| 待审核、已取消、已入库采购单不能入库 | 真实 HTTP / PostgreSQL 拒绝 |
| 是否质检未选或非布尔值 | HTTP 422 / 专项校验拒绝 |
| 否时质检人清空 | 真实入库保存 NULL，React 交互切换后字段清空 |
| 部分、超量、缺漏、重复、外部 SKU | 专项拒绝；部分和超量另有真实 HTTP 证据 |
| 成本继承、批次 NULL | 真实 PostgreSQL 数量、成本及流水验证 |
| Audit / 流水失败不改变采购状态 | 真实事务故障注入回滚通过 |
| 并发及重复请求不重复流水 | 真实 HTTP 两键并发及成功键重放通过 |
| 采购付款/采购质检停用 | 正式写 API 返回 409；导航测试与初始浏览器页面仅两个采购页签 |
| 生产质检保留 | 生产来源、质检/入库数量与状态动作回归通过；负责人已确认本批人工测试通过 |
| 权限和范围 | 原有专项继续通过；采购入库新增确认权限门槛，无新权限代码 |

## 自动化与环境

pnpm check 通过：549 passed，70 条件性 skipped；其中本轮真实 PostgreSQL 测试已单独启用并通过，其他 69 项默认条件性测试本轮未全量启用。格式、ESLint、TypeScript、API/Database/Admin 回归、Admin / Mini Program 构建通过。新增专项包括 15 项直接入库规则测试、采购入库展示/交互及 Dashboard 队列测试。

初次完整构建因沙箱禁止端口绑定/Taro 系统配置访问失败，已在获准执行环境完整重跑通过。迁移后首次 HTTP 入库因开发服务缓存旧 Prisma 客户端返回 500；仅重启 ERP 3100 后同一采购单入库成功，后续真实专项无异常 5xx。未操作 PM2 / AI 视觉服务。

Health 实测 HTTP 200，application.status=ok、database.status=connected；AI 视觉平台 localhost:3000 跟随既有跳转 HTTP 200。Prisma validate、迁移部署、db:migrate:status（14 个迁移全部已应用）、状态检查及 git diff --check 通过。

## 浏览器自动验证边界与人工验收

内嵌浏览器已完成正式登录、仅两个采购页签/四状态确认、通过日历创建采购单 `PO-20260928-F93C1BEF`，备注 `UAT-PROC-FINAL-20260929-BROWSER`；数量 10、单价 300、预计交付日 2026-09-30，保存待审核，详情和入库进度 0/10 正确。

点击审核后浏览器原生确认交互超时，后续 CDP focus 指令持续失败，重连及新标签页未恢复可靠输入。当时数据库只读确认该单仍待审核，未重复执行审核。已请求负责人关闭或处理可见原生确认框；此为工具交互恢复，不是再次请求业务批准。

此前工具未完成浏览器审核后的入库闭环、成品质检入口、Console/5xx 最终检查及截图采集。以上自动浏览器证据仍不计为通过，也不推定 Console error 为零。

人工确认后只读复查：采购单 `PO-20260928-F93C1BEF` 已为 received（已入库）；Health HTTP 200、数据库 connected，AI 视觉平台 HTTP 200。此项验证确认当前最终状态，不替代完整浏览器操作日志。

2026-09-29，项目负责人明确反馈：“经过人工测试，测试通过。”本批人工验收据此记录为通过；未提供逐项操作日志，因此保留人工确认与自动化证据的区别。此前等待人工复核的交付条件已解除，依照本批原授权完成一个 Commit 和 Push。CR-013 记录为 Approved / Implemented，UAT 为 Fixed / Manual Verification Passed，不直接标记 Closed；Phase/Task 状态不变。
