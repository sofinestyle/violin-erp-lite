---
document_name: UAT Batch 002-C Automated Verification Report
project: Violin ERP Lite
version: 1.0
status: Draft
owner: Project Manager
created_date: 2026-08-09
updated_date: 2026-08-09
related_phase: Phase 10
---

# Batch 002-C Automated Verification Report

## 1. 环境信息

| 项目 | 结果 |
| --- | --- |
| Verification Type | Automated / Read-only |
| Target Commit | `b85cd398f01f893bfd27d8b9e8266d7b08e6e97e` |
| Node | 22.x via `/opt/homebrew/opt/node@22/bin` |
| Violin ERP | `http://localhost:3100` |
| API Health | Healthy；`application.status = ok`；`database.status = connected` |
| AI 视觉平台 | `http://localhost:3000` 有响应；未操作 PM2 |
| Database Write | Not Executed；本次按任务限制执行只读复核，不创建或修改业务数据 |

## 2. 基础资料检查结果

结果：Automated Pass / Pending Manual Business Verification

检查范围：

- 产品分类；
- 产品；
- SKU；
- 单位；
- 供应商；
- 生产厂家；
- 仓库；
- 平台；
- 店铺。

自动复核结果：

1. Master Data 页面测试通过；
2. 产品 / SKU 保持同页管理入口，底层对象、API 和权限保持独立；
3. 平台 / 店铺保持同页管理入口，底层对象、API 和权限保持独立；
4. 单位下拉、结算方式下拉、仓库类型与责任主体中文下拉已被测试覆盖；
5. 不要求用户填写 JSON、内部 UUID 或英文状态码；
6. 自动编码仍为 `UAT-009 Blocked by CR`，本次未实现。

说明：

本次不创建“黑色实木小提琴”等真实业务数据。真实写入验证需由项目负责人使用 UAT 标识数据进行人工业务复验。

## 3. 采购生产库存闭环结果

结果：Automated Pass / Pending Manual Business Verification

验证链路：

供应商

↓

采购订单

↓

生产任务

↓

质检

↓

入库

↓

库存

自动复核结果：

| 环节 | 结果 | Evidence |
| --- | --- | --- |
| 采购订单 | Pass | Workflow 测试确认使用 `/api/v1/purchase-orders`，表单包含供应商、SKU、采购数量、单价等中文字段 |
| 生产任务 | Pass | Workflow 测试确认使用 `/api/v1/production-orders`，表单包含生产厂家、SKU、计划数量等中文字段 |
| 质检 | Pass | Workflow 测试确认采购 / 生产来源质检使用来源选择器和来源明细，不要求手填来源 UUID |
| 入库 | Pass | Workflow 测试确认使用 `/api/v1/inbound-orders/purchase` 与 `/api/v1/inbound-orders/production`，包含已确认验收单、目标仓库和入库数量 |
| 库存变化 | Pass by existing automated coverage | `packages/api/tests/workflow.test.ts`、`packages/api/tests/inventory-workflow.test.ts`、`packages/database/tests/workflow-repository.test.ts`、`packages/database/tests/inventory-workflow-repository.test.ts` 在全量 `pnpm check` 中通过 |
| 库存流水 | Pass by existing automated coverage | Inventory workflow / inventory transaction 相关测试通过 |

说明：

本次只读复核不执行真实确认入库，因此未直接写入 `inventories` 或 `inventory_transactions`。库存增加与流水生成由现有 Service / Repository 自动化测试覆盖，最终业务数据写入需人工复验。

## 4. 销售闭环结果

结果：Automated Pass / Pending Manual Business Verification

验证链路：

平台

↓

店铺

↓

销售出库

↓

库存减少

自动复核结果：

| 环节 | 结果 | Evidence |
| --- | --- | --- |
| 平台 / 店铺选择 | Pass | Master Data 与 Workflow 测试确认平台 / 店铺对象可作为业务选择器使用 |
| 销售出库 | Pass | Workflow 测试确认销售出库复用 `/api/v1/outbound-orders/domestic-sales` |
| 确认出库 | Pass by existing automated coverage | Inventory workflow 测试覆盖 `OUT-012` / `outbound.order.confirm` |
| 库存减少 | Pass by existing automated coverage | Inventory workflow repository 测试覆盖库存扣减与事务边界 |
| Sales API 边界 | Pass | Workflow 测试确认不新增未批准 `/api/v1/sales` 根路径 |

说明：

独立 Sales Admin API Route 仍为 `UAT-011 Blocked by CR`。本次验证的销售闭环采用已批准的 `OUT-*` 与 `SRT-*` 能力。

## 5. 跨境结果

结果：Automated Pass with CR Boundary / Pending Manual Business Verification

验证链路：

国内仓

↓

跨境发货

↓

在途仓

↓

海外仓

自动复核结果：

| 环节 | 结果 | Evidence |
| --- | --- | --- |
| 来源仓 / 在途仓 / 海外仓 | Pass | Workflow 测试确认跨境发货表单包含三仓选择 |
| SKU / 数量 | Pass | Workflow 测试确认跨境发货明细包含 SKU 与发货数量 |
| 状态流转 | Pass | Workflow 测试确认存在提交、撤回、审核、驳回、反审核、确认发货、取消动作 |
| 库存流转 | Pass by existing automated coverage | Inventory workflow 测试覆盖 `CBR-012` / `cross-border.shipment.dispatch` |
| 平台 / 店铺持久化 | CR Boundary | 当前 Frozen `cross_border_shipments` 与 `CBR-003` 不包含可持久化 `platformId` / `storeId`，本次不测试、不伪造 |

说明：

本次不测试跨境平台 / 店铺持久化，因为该能力当前为 Database CR + API CR 边界。

## 6. 中文业务化体验

结果：Automated Pass / Pending Manual UX Spot Check

自动复核结果：

- 核心业务表单字段为中文；
- 状态动作按钮为中文；
- Workflow 状态中文映射覆盖常用业务状态；
- 表单帮助文案不展示 JSON、UUID、DTO 或英文状态码；
- 关联对象通过下拉选择；
- 缺少业务标签时不回退显示内部 id；
- 成功反馈、失败反馈和 Request ID 保留能力由 Workflow Workbench 覆盖；
- 页面主观顺畅度仍需项目负责人最终人工抽检。

## 7. 自动化测试结果

| Command | Result |
| --- | --- |
| `pnpm exec vitest run apps/admin/tests/master-data-page.test.tsx apps/admin/tests/workflow-page.test.tsx` | Passed；27 tests passed |
| `pnpm check` | Passed |
| `pnpm status:check` | Passed |
| `git diff --check` | Passed |
| `curl http://localhost:3100/api/health` | Healthy |
| `curl -I http://localhost:3000` | Responded with HTTP 307；service reachable |

## 8. 发现问题

| ID | 类型 | 等级 | 状态 |
| --- | --- | --- | --- |
| B002C-OBS-001 | Read-only Scope Limitation | Minor | Accepted |
| B002C-CR-001 | Cross-border Platform / Store Persistence | Major | Blocked by Database/API CR |
| B002C-CR-002 | Automatic Code Generation | Major | Blocked by Business Rule/API CR |
| B002C-CR-003 | Independent Sales Admin API Route | Major | Blocked by API CR |

### B002C-OBS-001

本次任务同时要求只读检查与“创建测试产品 / 确认入库 / 确认出库”等写入型业务操作。为遵守只读限制，本次未写入数据库，只执行自动化测试、代码路径验证、健康检查和文档记录。

### B002C-CR-001

跨境发货单当前不能直接保存平台 / 店铺。需要先通过 Database CR 与 API CR 扩展 `cross_border_shipments` 和 `CBR-003`。

### B002C-CR-002

自动编码仍需 Business Rule CR + API CR；如采用编号表或序列方案，推荐追加 Database CR。

### B002C-CR-003

独立 Sales Admin API Route 仍需 API CR。当前受限 MVP 继续复用 `OUT-*`、`SRT-*`、`INV-*` 和 `MD-*`。

## 9. 风险等级

| 范围 | 风险等级 | 说明 |
| --- | --- | --- |
| 基础资料衔接 | Low | 自动化测试通过，待人工写入复验 |
| 采购生产库存闭环 | Low | 自动化测试通过，真实库存写入需人工确认 |
| 销售出库闭环 | Low | 使用既有 OUT/SRT 能力，独立 Sales API 不属于本批 |
| 跨境发货库存流转 | Medium | 三仓库存流转测试覆盖；平台 / 店铺持久化需 CR |
| 中文业务化体验 | Low | 自动化测试通过，主观体验需人工抽检 |

## 10. Final Result

Batch 002-C Automated Verification：

Automated Pass / Pending Manual Business Verification

进入人工业务验证条件：

Yes

人工验证前提：

- 使用 UAT 标识测试数据；
- 不关闭 UAT-009 / UAT-011；
- 不测试跨境平台 / 店铺持久化，除非对应 CR 已批准。
