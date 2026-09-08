# UAT-009 Code Generation Implementation Report

## 1. CR执行范围

本报告记录 UAT-009 自动编码两阶段实施范围。第一阶段历史证据保留；第二阶段当前验证结果以文末补充及专项报告为准。

Phase 1 已实施：

- Product Code：`PRD-000001`
- SKU Code：`型号-尺寸-颜色`，例如 `L2-44-BK`
- Supplier Code：`SUP-000001`
- Manufacturer Code：`MFR-000001`
- Warehouse Code：`WH-000001`

Phase 2 已实施（CR-007，2026-09-08）：

- Category Code：`CAT-000001`
- Brand Code：`BRD-000001`
- Platform Code：`PLT-000001`
- Store Code：`STR-000001`

本次实施依据：

- `CR-001_CODE_GENERATION_BUSINESS_RULE.md`
- `CR-002_CODE_GENERATION_API_CHANGE.md`
- `CR-003_CODE_GENERATION_DATABASE_CHANGE.md`
- `CR-007_CODE_GENERATION_PHASE_2_EXTENSION.md`

## 2. Database变化

新增数据库对象：

- `code_generation_rules`
- `code_sequences`

新增 Migration：

- `prisma/migrations/20260809090000_add_code_generation_foundation/migration.sql`

正式数据库规格同步为 Database Logical Design v2.6：

- 正式表：75
- 正式字段：1343
- 主键：75
- 唯一约束 / 唯一索引：90
- 外键：310
- 普通索引：131
- Check：279
- PostgreSQL Enum：2

并发安全规则：

- 普通流水编码通过 `code_sequences` 行级锁和事务更新生成；
- 禁止 `max(code)+1`；
- 失败事务会回滚流水更新和业务创建；
- 既有业务表唯一约束继续裁决编码重复。

## 3. API变化

API Master Specification 同步为 v1.7。

第一阶段对象 Create DTO 的编码字段从必填调整为可选：

- `productCode`
- `skuCode`
- `supplierCode`
- `manufacturerCode`
- `warehouseCode`

兼容规则：

- 不提交编码时由服务端生成；
- 提交合法历史编码时保持兼容；
- Response 在既有编码字段中返回最终持久化编码；
- Update 阶段普通用户不得修改自动生成编码；
- 不新增 API Path、Response 字段、分页字段、错误码或 Permission Code。

## 4. 编码规则

普通流水编码：

| 对象 | 格式 |
| --- | --- |
| Product | `PRD-000001` |
| Supplier | `SUP-000001` |
| Manufacturer | `MFR-000001` |
| Warehouse | `WH-000001` |

SKU 组合编码：

```text
型号-尺寸-颜色
```

尺寸映射：

| 输入 | 编码 |
| --- | --- |
| `4/4` | `44` |
| `3/4` | `34` |
| `1/2` | `12` |
| `1/4` | `14` |

颜色映射：

| 输入 | 编码 |
| --- | --- |
| 黑色 | `BK` |
| 棕色 | `BR` |
| 原木色 | `NAT` |
| 绿色 | `GN` |
| 蓝色 | `BL` |

型号来源说明：

第一阶段不新增 Product Model 字段。SKU 编码服务只接受服务端可验证的稳定字母数字型号来源；当前可使用产品英文名称字段承载型号，例如 `L2`。如果产品无法提供稳定型号，服务端返回明确字段级校验错误，不使用中文名称、时间戳、随机值或前端生成编码。

## 5. 前端调整

PC Admin 基础资料页面已调整：

- Product、SKU、Supplier、Manufacturer、Warehouse 编码字段不再作为普通输入框展示；
- 新增时显示“保存后由系统自动生成”；
- 编辑 / 详情场景展示已生成编码；
- SKU 批量录入不再要求用户填写 SKU 编码；
- Product 英文名称字段补充型号填写说明，便于 SKU 组合编码生成。

## 6. 测试结果

已执行专项测试：

- `pnpm --filter @violin-erp/api test -- --runInBand`：通过；
- `pnpm --filter @violin-erp/database test`：通过；
- `pnpm exec vitest run apps/admin/tests/master-data-page.test.tsx`：通过；
- `pnpm --filter @violin-erp/database typecheck`：通过；
- `pnpm --filter @violin-erp/api typecheck`：通过；
- `pnpm --filter @violin-erp/admin exec tsc --noEmit`：通过。

覆盖内容：

- 普通流水编码生成；
- 并发安全事务路径；
- SKU 组合编码生成；
- 缺少型号时字段级错误；
- Create DTO 编码字段可选；
- 旧客户端提交合法编码兼容；
- 自动编码字段创建后禁止普通更新；
- 前端编码输入隐藏与生成结果展示。

## 7. 兼容方案

- 历史已有编码保持不变；
- 新增数据默认自动生成编码；
- 导入和旧客户端仍可提交已有合法编码；
- 不自动重写历史编码；
- 不新增编号管理后台；
- Category、Brand、Platform、Store 已按 CR-007 接入自动编码；仍兼容显式合法历史编码。

## 8. 人工验证步骤

在本地 `http://localhost:3100` 使用测试账号执行：

1. 创建 Product，确认用户无需输入 Product Code，保存后展示 `PRD-xxxxxx`；
2. 创建 SKU，填写稳定型号来源、尺寸和颜色，确认生成 `L2-44-BK` 类编码；
3. 创建 Supplier，确认生成 `SUP-xxxxxx`；
4. 创建 Manufacturer，确认生成 `MFR-xxxxxx`；
5. 创建 Warehouse，确认生成 `WH-xxxxxx`；
6. 编辑上述对象，确认编码只读且不可普通修改；
7. 重复创建相同 SKU 组合，确认系统返回明确业务错误。

## 9. UAT状态

## 9. 本地UAT部署验证

验证日期：

2026-08-11

部署结果：

- `20260809090000_add_code_generation_foundation` 已通过 `pnpm db:migrate:deploy` 正式部署到本地 UAT PostgreSQL；
- `pnpm db:migrate:status` 显示 Database schema is up to date；
- 新增表验证：
  - `code_generation_rules`：5 条规则；
  - `code_sequences`：4 条流水；
  - 规则类型：manufacturer、product、sku、supplier、warehouse；
- 未执行 `prisma migrate reset`；
- 未执行 drop database；
- 未重新 Seed；
- 未清空或重建业务数据。

Health 验证：

- `GET http://localhost:3100/api/health`：HTTP 200；
- `application.status = ok`；
- `database.status = connected`。

真实 API 验证：

| 对象 | 输入编码 | 生成结果 | 结果 |
| --- | --- | --- | --- |
| Product | 未提交 `productCode` | `PRD-000001` | Pass |
| SKU | 未提交 `skuCode`，型号 `L2`、尺寸 `4/4`、颜色 `黑色` | `L2-44-BK` | Pass |
| Supplier | 未提交 `supplierCode` | `SUP-000001` | Pass |
| Manufacturer | 未提交 `manufacturerCode` | `MFR-000001` | Pass |
| Warehouse | 未提交 `warehouseCode` | `WH-000001` | Pass |

并发与兼容验证：

- 并发创建 5 个 Supplier，生成 `SUP-000002` 至 `SUP-000006`，无重复；
- `code_sequences.supplier.current_value` 正确递增至 6；
- 显式提交合法历史 Supplier Code 成功；
- 重复显式 Supplier Code 返回 `CONFLICT_REQUEST`；
- 使用无效关联创建 Product 触发 `VALIDATION_INVALID_FIELD`，Product sequence 未推进；
- 未发现 `max(code)+1` 运行路径。

前端验证：

- `localhost:3100` 已可启动；
- Health 已恢复；
- 现有 Admin 自动化测试覆盖编码字段隐藏、创建后展示和 SKU 批量录入不要求编码；
- Browser 插件未返回可用交互输出，且本地未安装 Playwright CLI，因此本轮未完成真实浏览器点击式表单提交；该项保留为 Final Manual Spot Check。

AI视觉平台验证：

- `http://localhost:3000` 返回登录跳转响应；
- 未操作 PM2；
- 未停止、重启或修改 AI 视觉平台。

## 10. UAT状态

UAT-009 状态更新为：

```text
Automated Pass / Pending Final Manual Spot Check
```

待项目负责人完成最终人工抽查后，再决定是否进入 Verified / Closed。

## 11. 2026-09-08 第二阶段实施及验证边界

CR-007 / DEC-111 扩展批准四类对象；API_SPEC v1.11 同步 Create 编码可选和 Update 不可改码，接口数量仍为 343。数据库结构保持 v2.7，仅 forward-only Migration 幂等增加四条规则和四条流水，已部署本地 UAT。

真实 Prisma / PostgreSQL 验证已通过：每类五个并发创建、两个独立客户端、显式旧码、重复拒绝、大小写历史占用跳号、失败事务回滚及既有编码比对。有效UAT账号已通过正式HTTP登录与Session校验；四类HTTP创建、PATCH改码拒绝、旧码兼容及重复拒绝全部通过。浏览器实际新增、列表编码展示、编辑只读及Store平台关联复验通过，console error为0，无5xx。

HTTP编码：CAT-000023、BRD-000023、PLT-000026、STR-000021；浏览器编码：CAT-000024、BRD-000024、PLT-000027、STR-000022。本次12条E2E测试资料经正式API安全删除6条、停用6条，无直接SQL删除。修复分类自定义名称录入及Store编辑平台异步回显缺口。

当前状态：Automated Verification Passed / Pending Manual Spot Check。详细证据见 [自动编码第二阶段验证报告](UAT_CODE_GENERATION_PHASE_2_VERIFICATION_REPORT.md)，不自动标记 Verified / Closed。
