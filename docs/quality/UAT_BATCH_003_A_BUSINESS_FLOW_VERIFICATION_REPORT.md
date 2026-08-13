# Batch 003-A Business Flow Verification

## 1. 测试环境

- 测试阶段：Batch 003-A Test Data Preparation & Automated Business Flow Verification
- 测试日期：2026-08-13
- Node：v22.23.1
- 本地 Web / API：`http://localhost:3100`
- API Health：Healthy，`application.status = ok`，`database.status = connected`
- Database：`violin_erp_lite`
- 测试数据标识：`UAT-003A`
- 执行方式：通过现有 Master Data / Workflow / Inventory Workflow Service 执行业务动作；未修改业务代码、Database Schema、API Contract、Permission 或自动编码规则。

## 2. 测试数据

本轮在本地 UAT 数据库创建或复用以下 `UAT-003A` 测试数据。

| 类型 | 名称 / 编码 | 结果 |
|---|---|---|
| 产品分类 | `UAT-003A-提琴` / `CAT-UAT-003A` | 创建或复用成功 |
| 品牌 | `UAT-003A-品牌` / `BRD-UAT-003A` | 创建或复用成功 |
| 产品 | `UAT-003A-普及实木亮光小提琴-自动验证` / `PRD-000007` | 创建或复用成功 |
| 产品型号 | `UAT003AL2` | 创建或复用成功 |
| 供应商 | `UAT-003A-供应商` / `SUP-000007` | 创建或复用成功 |
| 生产厂家 | `UAT-003A-厂家` / `MFR-000002` | 创建或复用成功 |
| 国内仓 | `UAT-003A-国内成品仓` / `WH-000002` | 创建或复用成功 |
| 在途仓 | `UAT-003A-在途仓` / `WH-000003` | 创建或复用成功 |
| 海外仓 | `UAT-003A-海外仓` / `WH-000004` | 创建或复用成功 |
| 平台 | `UAT-003A-Temu`、`UAT-003A-Amazon`、`UAT-003A-天猫` | 创建或复用成功 |
| 店铺 | `UAT-003A-Temu美国站`、`UAT-003A-Amazon美国站`、`UAT-003A-旗舰店` | 创建或复用成功 |

SKU 创建结果：

| SKU Code | SKU Name | 单位 | 最低安全库存 |
|---|---|---|---|
| `UAT003AL2-44-BR` | `UAT-003A-普及实木亮光小提琴-自动验证 4/4 棕色` | 把 | 0 |
| `UAT003AL2-44-BK` | `UAT-003A-普及实木亮光小提琴-自动验证 4/4 黑色` | 把 | 0 |
| `UAT003AL2-34-BR` | `UAT-003A-普及实木亮光小提琴-自动验证 3/4 棕色` | 把 | 0 |
| `UAT003AL2-34-BK` | `UAT-003A-普及实木亮光小提琴-自动验证 3/4 黑色` | 把 | 0 |
| `UAT003AL2-12-BR` | `UAT-003A-普及实木亮光小提琴-自动验证 1/2 棕色` | 把 | 0 |
| `UAT003AL2-12-BK` | `UAT-003A-普及实木亮光小提琴-自动验证 1/2 黑色` | 把 | 0 |

说明：用户指定的产品型号 `UAT-003A-L2` 含连字符，不符合当前自动编码服务的产品型号提取规则（仅允许大写字母和数字）。为继续执行闭环验证，本轮使用 `UAT003AL2` 作为符合当前规则的 UAT 型号，并将此差异列为 Major 风险。

## 3. 基础资料结果

基础资料创建 / 复用结果：

- Product Category：通过。
- Product：通过，产品编码自动生成。
- SKU：通过，SKU 编码按当前 `产品型号-尺寸-颜色` 规则生成。
- Supplier：通过，供应商编码自动生成。
- Manufacturer：通过，厂家编码自动生成。
- Warehouse：通过，仓库编码自动生成。
- Platform / Store：通过，按现有独立对象与独立 API 创建；未测试跨境发货平台 / 店铺字段持久化 CR 能力。

基础资料可以被采购、生产、库存、销售出库和跨境流程选择和引用。

## 4. 采购结果

采购订单：

- 单据号：`PO-20260813-C425E71D`
- 供应商：`UAT-003A-供应商`
- SKU：`UAT003AL2-44-BR`
- 数量：100
- 状态流转：`draft → pending_approval → approved`
- 结果：通过。

## 5. 生产结果

生产任务：

- 单据号：`PRO-20260813-33E1C694`
- 生产厂家：`UAT-003A-厂家`
- SKU：`UAT003AL2-44-BR`
- 数量：100
- 状态流转：`draft → pending_approval → approved → in_production → completed`
- 分批完工：已通过 `PRO-026 / PRO-027` 登记并确认完工 100。
- 结果：通过。

## 6. 质检结果

质检单：

- 单据号：`INS-20260813-3B433C20`
- 来源：生产任务
- 验收数量：100
- 合格数量：98
- 不合格数量：2
- 状态流转：`draft → pending_confirmation → confirmed`
- 结果：通过。

## 7. 入库结果

入库单：

- 单据号：`INB-20260813-B44FF97A`
- 来源：已确认生产来源质检单
- 目标仓：`UAT-003A-国内成品仓`
- 入库数量：98
- 状态：`completed`
- 国内仓库存变化：`0 → 98`
- 库存流水：1 条，来源类型 `inbound_order`
- 重复确认保护：通过，重复确认未产生重复库存流水。
- 结果：通过。

## 8. 库存结果

核心 SKU：`UAT003AL2-44-BR`

| 节点 | 国内仓 | 在途仓 | 海外仓 |
|---|---:|---:|---:|
| 初始 | 0 | 0 | 0 |
| 入库后 | 98 | 0 | 0 |
| 销售出库后 | 88 | 0 | 0 |
| 跨境发货后 | 38 | 50 | 0 |
| 海外导入后 | 38 | 0 | 50 |

库存事实来源仍为：

- `inventories`
- `inventory_transactions`

未直接修改库存余额。

## 9. 销售结果

销售出库：

- 单据号：`OUT-20260813-AA18C10B`
- 平台：`UAT-003A-天猫`
- 店铺：`UAT-003A-旗舰店`
- SKU：`UAT003AL2-44-BR`
- 数量：10
- 状态：`completed`
- 国内仓库存变化：`98 → 88`
- 库存流水：1 条，来源类型 `outbound_order`
- 重复确认保护：通过，重复确认未产生重复库存流水。
- 结果：通过。

## 10. 跨境结果

跨境发货：

- 单据号：`CBR-20260813-94147514`
- 来源仓：`UAT-003A-国内成品仓`
- 在途仓：`UAT-003A-在途仓`
- 海外仓：`UAT-003A-海外仓`
- SKU：`UAT003AL2-44-BR`
- 数量：50
- 状态：`shipped`
- 确认发货库存变化：国内仓 `88 → 38`，在途仓 `0 → 50`
- 发货库存流水：2 条，来源类型 `cross-border`
- 海外库存导入状态：`succeeded`
- 海外导入库存变化：在途仓 `50 → 0`，海外仓 `0 → 50`
- 海外导入库存流水：2 条，来源类型 `overseas_import`
- 重复发货 / 重复导入保护：通过，重复请求未产生重复库存流水。
- 结果：通过。

## 11. 发现问题

| ID | 类型 | 等级 | 状态 | 说明 |
|---|---|---|---|---|
| B003A-001 | Audit Persistence | Major | Open | 使用真实 Prisma Audit Writer 执行创建类 Workflow 时，存在 `resourceId = collection` 写入 UUID 类型 `audit_logs.object_id` 的风险，脚本首次执行曾返回“审计记录暂时不可用”。本轮为继续验证业务闭环，改用 `InMemoryAuditWriter` 捕获 30 条审计事件。需要后续单独修复或复核审计落库。 |
| B003A-002 | SKU Code Rule / Test Requirement Conflict | Major | Open | 本轮指定产品型号 `UAT-003A-L2` 含连字符；当前 SKU 自动编码服务只接受大写字母和数字作为型号来源，因此无法生成 `UAT-003A-L2-44-BR`。本轮使用 `UAT003AL2` 完成业务闭环验证。 |

## 12. 风险等级

总体风险等级：Major。

理由：

- 核心业务库存闭环已通过；
- 库存数量与库存流水一致；
- 重复提交保护通过；
- 权限拦截测试通过；
- 但 Audit 落库风险和测试型号编码规则冲突均会影响正式验收完整性，不应直接视为无风险通过。

## 13. 是否达到人工业务验证条件

结论：Conditional Pass / Pending Issue Review。

可以进入人工业务流程复核，但需同时复核以下两项：

1. 创建类 Workflow / Inventory Workflow 在真实 API 环境下是否仍会因 Audit `object_id` 非 UUID 失败；
2. UAT 测试型号是否必须保留 `UAT-003A-L2`，如必须保留，需要提交编码规则 CR；如接受当前自动编码规则，则测试型号应使用 `UAT003AL2` 或其他字母数字型号。

Batch 003-A 状态：

Automated Verification Complete / Pending Manual Business Verification

## 14. Major Risk Consolidated Fix & Reverification

### 14.1 复核环境

- 复核日期：2026-08-13
- Node：v22.23.1
- Database：本地 UAT PostgreSQL，`violin_erp_lite`
- 执行路径：真实 `PrismaMasterDataRepository`、真实 `PrismaWorkflowRepository`、真实 `PrismaInventoryWorkflowRepository`、真实 `PrismaAuditWriter`
- 执行边界：未重建数据库，未 reset/drop，未重新 Seed，未修改 Permission，未新增无批准 API。

### 14.2 B003A-001 Audit Persistence 修复结果

根因：

- Workflow / Inventory Workflow 创建类动作没有 `entityId`；
- 旧逻辑在缺少 `entityId` 时将 `resourceId` 写为 `collection`；
- `audit_logs.object_id` 为 UUID 类型，真实 Prisma Audit Writer 下存在 UUID 类型不兼容风险。

修复：

- Workflow / Inventory Workflow 审计 resourceId 改为优先使用 Repository 返回结果中的正式业务对象主键 `id`；
- 状态操作仍使用正式 `entityId`；
- 如创建动作未返回正式 `id`，立即返回“审计对象缺少正式主键”，不再伪造 UUID，不关闭 Audit，不使用内存 Audit Writer 规避。

真实 Prisma Audit Writer 复核：

| 对象 | 单据号 | audit_logs 记录数 | 结果 |
|---|---|---:|---|
| Purchase | `PO-20260813-EA956268` | 3 | 通过 |
| Production | `PRO-20260813-6556B4DF` | 4 | 通过 |
| Inspection | `INS-20260813-BC9C8CAE` | 3 | 通过 |
| Inbound | `INB-20260813-7273FAE1` | 4 | 通过 |
| Outbound | `OUT-20260813-D9A768A6` | 5 | 通过 |
| Cross-border Shipment | `CBR-20260813-ABCC524C` | 5 | 通过 |

结论：

B003A-001 已解决。真实 Prisma Audit Writer 可以正常写入 `audit_logs`，`object_id` 使用正式业务对象 UUID。

### 14.3 B003A-002 产品型号 / SKU 编码规则修复结果

根因：

- SKU 自动编码服务此前只允许产品型号为纯字母数字；
- 实际业务型号允许 `L2`、`L101-BR`、`N101-BR` 等包含连字符的型号；
- 旧规则会迫使业务型号被改写为 `L101BR` 或导致 SKU 生成失败。

修复：

- 产品型号校验调整为允许 `A-Z / a-z / 0-9 / -`；
- 禁止空格、中文、斜杠、反斜杠、特殊符号和异常连续分隔符；
- SKU 生成时保留连字符并统一转为大写；
- SKU 自动编码不再使用 Product Code 作为型号兜底，避免生成 `PRD-xxxxxx-尺寸-颜色` 的错误业务编码。

验证：

| 产品型号 | 尺寸 | 颜色 | 生成 SKU | 结果 |
|---|---|---|---|---|
| `L2` | `4/4` | 黑色 | `L2-44-BK` | 通过 |
| `L101-BR` | `4/4` | 黑色 | `L101-BR-44-BK` | 通过 |
| `N101-BR` | `4/4` | 黑色 | `N101-BR-44-BK` | 通过 |
| `UAT-003A-L3` | `4/4` | 棕色 | `UAT-003A-L3-44-BR` | 通过 |

结论：

B003A-002 已解决。已有 Product Model 与已有 SKU Code 未被批量改写，新规则仅影响新建 / 修改校验和新 SKU 生成。

### 14.4 真实业务闭环复核结果

本轮使用 `UAT-003A-L3` 带连字符产品型号执行真实业务闭环。

| 环节 | 单据号 / 数据 | 结果 |
|---|---|---|
| Product | `PRD-000008`，型号 `UAT-003A-L3` | 通过 |
| SKU | `UAT-003A-L3-44-BR`、`UAT-003A-L3-44-BK`、`UAT-003A-L3-34-BR`、`UAT-003A-L3-34-BK`、`UAT-003A-L3-12-BR`、`UAT-003A-L3-12-BK` | 通过 |
| Purchase | `PO-20260813-EA956268`，数量 100，状态 `approved` | 通过 |
| Production | `PRO-20260813-6556B4DF`，数量 100，状态 `completed` | 通过 |
| Inspection | `INS-20260813-BC9C8CAE`，合格 98，不合格 2，状态 `confirmed` | 通过 |
| Inbound | `INB-20260813-7273FAE1`，状态 `completed` | 通过 |
| Sales Outbound | `OUT-20260813-D9A768A6`，状态 `completed` | 通过 |
| Cross-border Shipment | `CBR-20260813-ABCC524C`，状态 `shipped` | 通过 |
| Overseas Import | Import Task 状态 `succeeded` | 通过 |

库存与流水：

| 节点 | 国内仓 | 在途仓 | 海外仓 | 库存流水 |
|---|---:|---:|---:|---|
| 复核前 | 38 | 0 | 50 | - |
| 入库后 | 136 | 0 | 50 | `inbound_order` 1 条 |
| 销售出库后 | 126 | 0 | 50 | `outbound_order` 1 条 |
| 跨境发货后 | 76 | 50 | 50 | `cross-border` 2 条 |
| 海外导入后 | 76 | 0 | 100 | `overseas_import` 2 条 |

重复提交保护：

- 入库重复确认：通过，未产生重复流水；
- 出库重复确认：通过，未产生重复流水；
- 跨境重复发货：通过，未产生重复流水；
- 海外导入重复执行：通过，未产生重复流水。

### 14.5 最终风险状态

| ID | 类型 | 原等级 | 当前状态 | 结论 |
|---|---|---|---|---|
| B003A-001 | Audit Persistence | Major | Resolved | 已改用正式对象主键写入真实 `audit_logs.object_id` |
| B003A-002 | SKU Code Rule / Test Requirement Conflict | Major | Resolved | 已支持连字符业务型号并通过 SKU 生成验证 |

当前未发现未解决的 Blocker / Critical / Major。

Batch 003-A 状态更新为：

Automated Verification Passed / Pending Manual Business Verification
