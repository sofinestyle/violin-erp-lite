---
document_name: UAT自动化复核报告
project: Violin ERP Lite
version: 1.0
status: Draft
owner: Project Manager
created_date: 2026-08-03
updated_date: 2026-08-03
related_phase: Phase 10
---

# Violin ERP Lite UAT Automated Verification Report

## 1. 检查环境

截止 Commit：

`67cbac64eb481c83942bcf46c338484a05277138`

本地环境：

- Node：22.x；
- Violin ERP Lite Web：`http://localhost:3100`；
- Violin ERP Lite API Health：`http://localhost:3100/api/health`；
- Database：`violin_erp_lite`；
- AI 视觉设计平台：`http://localhost:3000`，仅做存活检查，未操作 PM2。

## 2. 检查范围

本次筛选 `docs/quality/UAT_ISSUE_LIST.md` 中状态为 `Fixed / Pending Manual Verification` 的问题：

- UAT-010 Core Business / PC Admin Workbench；
- UAT-012 Workflow Workbench 透明背景。

不纳入自动通过项：

- UAT-009：`Blocked by CR`；
- UAT-011：`Blocked by CR`；
- UAT-001 至 UAT-008：已由项目负责人人工复验并关闭。

## 3. 自动化测试结果

| 检查项 | 结果 | 说明 |
|---|---|---|
| Workflow 页面测试 | Passed | `apps/admin/tests/workflow-page.test.tsx` 通过 |
| API Contract 测试 | Passed | `apps/admin/tests/api-v1-contract.test.ts` 通过 |
| App Shell 测试 | Passed | `apps/admin/tests/app-shell.test.tsx` 通过 |
| Dashboard 测试 | Passed | `apps/admin/tests/dashboard.test.tsx` 通过 |
| Master Data 页面测试 | Passed | `apps/admin/tests/master-data-page.test.tsx` 通过 |
| 全量检查 | Passed | `pnpm check` 通过 |
| 状态检查 | Passed | `pnpm status:check` 通过 |
| Diff 检查 | Passed | `git diff --check` 通过 |

说明：

API Contract 测试中的 `AUTH_UNAUTHORIZED` 日志属于未登录访问保护断言，预期结果为 401，不作为异常请求。

## 4. 浏览器自动复核结果

浏览器自动复核使用本地已登录 UAT 会话，只执行无副作用页面检查和表单打开 / 关闭检查，未提交业务单据。

| 检查项 | 结果 | 说明 |
|---|---|---|
| 页面可打开 | Automated Pass | 首页、采购、生产、库存、出入库、跨境页面均可打开 |
| 页面不空白 | Automated Pass | DOM 快照均包含 App Shell 与业务内容 |
| 框架错误覆盖 | Automated Pass | 未发现 Next.js / Application error overlay |
| Console error / warn | Automated Pass | 浏览器控制台 error / warn 为空 |
| API Health | Automated Pass | `success=true`，application ok，database connected |
| 侧边栏切换 | Automated Pass | 连续切换生产、库存、出入库、跨境、采购后 Shell 保持存在 |
| AI 视觉平台存活 | Automated Pass | `http://localhost:3000` 返回登录重定向，服务在线 |

## 5. UAT-010 自动复核

复核范围：

- 新增采购订单；
- 新增生产订单；
- 新增采购验收；
- 新增采购入库；
- 新增库存调整；
- 新增国内销售出库；
- 新增跨境发货；
- 新增销售退货。

复核结果：

| 目标 | 结果 | 证据 |
|---|---|---|
| 新增采购订单 | Automated Pass | 表单可打开，10 个控件可操作，保存 / 取消按钮存在 |
| 新增生产订单 | Automated Pass | 表单可打开，8 个控件可操作，保存 / 取消按钮存在 |
| 新增采购验收 | Automated Pass | 表单可打开，10 个控件可操作，保存 / 取消按钮存在 |
| 新增采购入库 | Automated Pass | 表单可打开，10 个控件可操作，保存 / 取消按钮存在 |
| 新增库存调整 | Automated Pass | 表单可打开，9 个控件可操作，保存 / 取消按钮存在 |
| 新增国内销售出库 | Automated Pass | 表单可打开，11 个控件可操作，保存 / 取消按钮存在 |
| 新增跨境发货 | Automated Pass | 表单可打开，15 个控件可操作，保存 / 取消按钮存在 |
| 新增销售退货 | Automated Pass | 表单可打开，13 个控件可操作，保存 / 取消按钮存在 |

用户可用性结论：

- 未发现 `请求 DTO` 原始 JSON 输入区；
- 未发现要求用户填写内部 `id` / `uuid` 的控件；
- 表单使用中文字段、中文按钮和中文状态入口；
- 表单中出现的 `不需要填写 UUID、JSON 或英文状态码` 为负向说明，不代表要求用户手工填写技术字段。

结果：

UAT-010：Automated Pass / Pending Final Manual Spot Check

## 6. UAT-012 专项复核

复核目标：

- Dialog / Drawer 背景非透明；
- Header / Body / Footer 非透明；
- 明细卡片非透明；
- Input / Select / Textarea 非透明；
- Overlay 层级正确；
- 下拉和日期控件不被遮挡。

复核结果：

| 目标 | Dialog主体 | 明细区 | Footer | 控件 | Overlay | 结果 |
|---|---|---|---|---|---|---|
| 新增采购订单 | `rgb(255, 255, 255)` | `rgb(255, 255, 255)` | `rgb(255, 255, 255)` | 非透明 | 半透明深色遮罩 | Automated Pass |
| 新增生产订单 | `rgb(255, 255, 255)` | `rgb(255, 255, 255)` | `rgb(255, 255, 255)` | 非透明 | 半透明深色遮罩 | Automated Pass |
| 新增采购验收 | `rgb(255, 255, 255)` | `rgb(255, 255, 255)` | `rgb(255, 255, 255)` | 非透明 | 半透明深色遮罩 | Automated Pass |
| 新增采购入库 | `rgb(255, 255, 255)` | `rgb(255, 255, 255)` | `rgb(255, 255, 255)` | 非透明 | 半透明深色遮罩 | Automated Pass |
| 新增库存调整 | `rgb(255, 255, 255)` | `rgb(255, 255, 255)` | `rgb(255, 255, 255)` | 非透明 | 半透明深色遮罩 | Automated Pass |
| 新增国内销售出库 | `rgb(255, 255, 255)` | `rgb(255, 255, 255)` | `rgb(255, 255, 255)` | 非透明 | 半透明深色遮罩 | Automated Pass |
| 新增跨境发货 | `rgb(255, 255, 255)` | `rgb(255, 255, 255)` | `rgb(255, 255, 255)` | 非透明 | 半透明深色遮罩 | Automated Pass |
| 新增销售退货 | `rgb(255, 255, 255)` | `rgb(255, 255, 255)` | `rgb(255, 255, 255)` | 非透明 | 半透明深色遮罩 | Automated Pass |

结果：

UAT-012：Automated Pass / Pending Final Manual Spot Check

## 7. 核心业务自动冒烟结果

本次未通过浏览器提交新增 / 审核 / 确认类业务单据，原因：

- 当前本地环境为人工验收库；
- 多个确认动作会写入正式库存余额和库存流水；
- 系统未提供无副作用回滚型 UAT Browser Sandbox；
- 为避免污染正式本地验收数据，本轮浏览器仅执行表单打开、控件、状态入口、样式和页面稳定性检查。

自动化覆盖来源：

- Workflow Service 测试覆盖采购、生产、质检、入库创建校验、权限和 Audit；
- Inventory Workflow Service 测试覆盖出库确认、库存调整执行、跨境发货、销售退货路由、权限和 Audit；
- Repository 测试覆盖库存扣减、库存流水写入、防负库存和事务边界；
- `pnpm check` 全量通过。

结论：

核心业务写入闭环在自动化测试层通过；浏览器端到端提交仍建议由项目负责人使用独立测试批次进行最终人工抽检。

## 8. 失败项

本次自动复核未发现 Automated Fail。

## 9. 仍需人工复核项

| UAT | 建议状态 | 原因 |
|---|---|---|
| UAT-010 | Automated Pass / Pending Final Manual Spot Check | 浏览器表单与自动化测试通过；完整端到端写入建议人工抽检 |
| UAT-012 | Automated Pass / Pending Final Manual Spot Check | computed style 自动复核通过；最终视觉观感建议人工抽检 |
| UAT-009 | Blocked by CR | 自动编码涉及业务规则 / API 契约影响 |
| UAT-011 | Blocked by CR | Sales Admin API Route 涉及 Frozen API Path |

## 10. 最终结论

当前 Fixed / Pending Manual Verification 项：

- UAT-010：Automated Pass / Pending Final Manual Spot Check；
- UAT-012：Automated Pass / Pending Final Manual Spot Check。

当前阻断项：

- UAT-009：Blocked by CR；
- UAT-011：Blocked by CR。

本次未修改业务范围、Database、API Contract、Permission 或业务逻辑。
