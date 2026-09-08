# Master Data Delete Strategy Report

## 2026-09-08 Master Data Delete Blocking Message UX Enhancement

实施设计：仅优化删除拒绝的中文原因和处理建议，不改变任何删除条件。Repository 复用首个命中的引用检查结果，返回内部业务摘要；Service 将摘要映射到既有 `CONFLICT_REQUEST` 的 message。公开响应结构、Request ID、接口、权限、生命周期、系统前缀保护、停用引用保护及删除/Audit 事务保持不变。

产品命中 SKU 引用后，补充两次整组 SKU 存在性查询，区分库存记录和历史业务/关联记录；不逐 SKU 循环、不加载 SKU 列表、不汇总库存数量。零余额库存记录仍受保护，不能将“存在库存记录”理解为“库存数量大于零”。其他对象提示首个已确认的引用类型，不宣称列出全部引用。并发 FK 拒绝无法确定引用类型时使用保守的对象化提示，不暴露数据库细节。

实施结果：Fixed / Pending Manual Verification，不新增 UAT 编号，不自动关闭验收。前端现有错误展示可直接显示新的 message 和 Request ID，无需修改前端业务代码。以下旧版本通用提示作为历史记录保留，当前提示以本节为准。

### 当前提示规则

| 对象 / 首个确认的引用 | 中文提示 |
| --- | --- |
| 产品关联 SKU，未检出 SKU 下游记录 | 该产品关联 N 个 SKU，无法删除。请先处理关联 SKU，或停用该产品。 |
| 产品关联 SKU，存在库存及历史业务 | 该产品关联 N 个 SKU，且存在库存记录及历史业务记录，无法删除，请停用。 |
| 产品关联 SKU，仅检出库存或历史业务其中一种 | 按实际结果仅显示“库存记录”或“历史业务记录”，不声称二者均存在。 |
| 分类有产品 | 该分类下仍有产品，无法删除，请先调整产品分类或停用该分类。 |
| 分类有子分类 | 该分类下仍有子分类，无法删除，请先处理子分类或停用该分类。 |
| SKU 有库存记录 | 该 SKU 存在库存记录，无法删除，请停用。 |
| 品牌有产品 | 该品牌已被产品引用，无法删除，请停用。 |
| 供应商有采购订单 | 该供应商存在采购订单记录，无法删除，请停用。 |
| 厂家有生产订单 | 该厂家存在生产订单记录，无法删除，请停用。 |
| 仓库有库存记录 | 该仓库存在库存记录，无法删除，请停用。 |

其余命中项按实际引用说明采购付款、采购退货、入库、产品与厂家/供应商关联、厂家仓库关联、导入匹配、库存预警或角色仓库范围关联；不能将基础资料关系误报为采购/生产订单。产品 SKU 历史检查覆盖既有 SKU 引用清单的全部 16 类非余额记录。摘要仅解释已确认的阻断原因，不构成完整引用清单，也不是删除关联数据的授权。

### 验证结果与边界

- Node 22.23.1；基准 `a80f533d93ea2275be711438cc02d5e2aac8ab1b`。
- API 基础资料 43 项、Repository 基础资料 30 项、Admin 页面 33 项：共 106 项通过；本轮新增 34 项。
- `pnpm check` 全部通过：442 项通过、51 项条件性集成测试跳过。格式、Lint、类型检查、Admin / Mini Program 构建通过。日志中的模拟 401 为既有权限拒绝测试预期结果，不是新增失败。
- 新增覆盖产品四种引用组合、七类对象提示、子分类/关系表/角色范围等替代引用、Request ID，以及模拟 5000 个 SKU 时额外查询仍固定为 2 次；这是查询形状验证，不是 5000 条真实数据压力测试。
- 原有无引用删除成功、权限、系统前缀、停用引用、并发 FK 拒绝及成功审计回归继续通过。未启用会写入/删除数据的真实数据库集成测试；本轮没有任何真实数据删除，也不将跳过测试计为通过。
- 新增 Service 测试的权限夹具曾重复拼接 `master.` 前缀，修正后专项和完整门禁均通过；未修改正式权限。
- `pnpm status:check`、`git diff --check` 通过。只读 Health 检查：3100 应用 `ok`、数据库 `connected`；AI 平台 3000 跟随跳转 HTTP 200，未操作 PM2 或重启服务。
- Database / Migration / API Path / DTO / Response 结构 / Error Code / Permission / 生命周期均无变化；只增加内部引用摘要并调整既有错误 message，不返回内部字段、表名或 ID。

修改文件：`packages/api/src/master-data/master-data.ts`、`packages/database/src/master-data/prisma-master-data-repository.ts`、对应两个基础资料测试文件、`apps/admin/tests/master-data-page.test.tsx`，以及本报告、`UAT_TEST_RECORD.md`、`UAT_CHANGE_LOG.md`，共 8 个文件。

待人工抽查：七类引用阻断文案是否易理解、Request ID 是否可见；保留原有二次确认和停用入口。不要求为抽查清理现有业务数据。

## 2026-09-07 CR-005 品牌安全删除实施

CR-005 保持 Approved，Product Manager Review Completed。API_SPEC v1.9 增加 MD-081；品牌删除仅 administrator 可以执行，前端根据正式角色隐藏按钮，服务端独立校验角色。仅有 `master.brand.update` 的用户无法删除品牌；该权限继续用于编辑。六类既有删除入口、中文异常响应、二次确认、引用检查及启用/停用全部保留。

### 删除与审计事务边界

分类、产品、SKU、供应商、厂家、仓库和品牌共同使用 `PrismaMasterDataRepository.delete()` 的 `$transaction`。事务内先做范围、系统数据、引用检查和删除，再调用 Service 的必需审计回调；回调接收绑定同一 transaction client 的 `PrismaAuditWriter`，以 `failureMode: required` 写入正式 `audit_logs`。全部成功后提交；审计失败抛出既有 `SYSTEM_AUDIT_UNAVAILABLE` 并回滚删除。引用/系统/不存在等拒绝不会触发成功审计。无独立连接写审计、无内存 Writer 替代正式路径，无 Schema / Migration 改动或大规模架构重写。

继续使用引用预检查、数据库 FK 最终保护及业务错误映射。全部删除路径的 P2003 外键拒绝转换为引用冲突；普通对象提示“该数据已被业务单据引用，无法删除，请停用。”，品牌保留“该品牌已被产品引用，无法删除，请停用。”。SYS- / SYSTEM- 为当前版本临时识别规则，未来预置数据扩大时独立设计 system-data 标识。

测试结果：

- `pnpm check` 通过：默认套件 372 项通过、35 项条件性集成测试跳过，较加固前 369 项无新增失败。其中新增的 5 项真实删除测试通过专用环境变量单独执行，全部通过；其余未配置集成条件的测试仍不计为通过。
- Admin 页面与路由、API 基础资料、Repository 基础资料四个文件共 84 项通过；认证客户端另 4 项通过，验证角色读取。覆盖空/非 JSON 响应、引用、系统数据、FK 冲突及审计。
- Playwright + Chrome 浏览器验证通过：管理员即使无品牌编辑权限仍可见删除按钮，非管理员即使有编辑权限也不可见；二次确认、取消不请求、成功刷新、引用阻断提示通过。使用模拟 API，无现有数据写入；无页面异常，控制台仅有预期模拟 HTTP 409。截图确认遮罩、白色弹窗与操作按钮清晰。
- 真实本地 PostgreSQL + Prisma Repository + PrismaAuditWriter 五项测试通过：管理员无引用删除和审计共同持久化；非管理员被拒；故意让真实 Audit INSERT 发生 UUID 校验失败，删除回滚且无成功审计；启用/停用产品引用保护；系统品牌保护。并非以外层强制回滚替代正式路径验证。结束后仅清理本轮随机 UAT-DELETE 标识及精确 ID 的临时记录，逐项核对既有品牌未变化。
- 并发新增引用后外键错误映射由 Repository 单元测试验证；未执行多连接真实并发压测。

复跑真实数据库专项：先安全加载项目根 `.env`，将 `DATABASE_URL` 传入 `MASTER_DATA_DELETE_INTEGRATION_DATABASE_URL`，执行 `pnpm --filter @violin-erp/database exec vitest run tests/master-data-delete.integration.test.ts`。未设置此变量时默认跳过。测试需要本地 dev-admin 和至少一个既有产品作为关联模板，只创建并清理本轮专属测试记录。

环境复核：Node 22；localhost:3100 Health HTTP 200，application=ok、database=connected；localhost:3000 仍返回 HTTP 307，未操作 AI 平台或 PM2。`pnpm status:check`、`git diff --check` 通过。本轮删除审计原子性风险已解决，不留 Major 技术债；仍需人工检查真实账号的按钮权限、无引用删除、引用阻断和停用。

实施状态：Fixed / Pending Manual Verification。无 Schema、Migration、Permission Code 变化；不开放平台和店铺删除。以下原报告内容保留 v1.8 初始六类对象范围作为历史记录。

### 本轮统一提交文件（21 个）

基准 HEAD：`b29487cb55b8880f79853f9501cb7de71cb15284`。原有 15 个已跟踪文件和 CR-005 全部保留，新增认证角色接线及事务回归测试后，共 21 个文件作为一个批次提交。

1. `apps/admin/app/api/v1/[...segments]/route.ts`
2. `apps/admin/components/master-data/master-data-workbench.tsx`
3. `apps/admin/contexts/auth-context.tsx`
4. `apps/admin/contexts/permission-context.tsx`
5. `apps/admin/lib/auth-client.ts`
6. `apps/admin/lib/master-data.ts`
7. `apps/admin/tests/api-v1-contract.test.ts`
8. `apps/admin/tests/auth-client.test.ts`
9. `apps/admin/tests/master-data-page.test.tsx`
10. `packages/api/src/master-data/master-data.ts`
11. `packages/api/tests/master-data.test.ts`
12. `packages/database/src/master-data/prisma-master-data-repository.ts`
13. `packages/database/tests/master-data-repository.test.ts`
14. `packages/database/tests/master-data-delete.integration.test.ts`
15. `docs/changes/CR-005_BRAND_SAFE_DELETE.md`
16. `docs/05-api/API_SPEC.md`
17. `docs/00-governance/DECISION_LOG.md`
18. `docs/quality/MASTER_DATA_DELETE_STRATEGY_REPORT.md`
19. `docs/quality/UAT_TEST_RECORD.md`
20. `docs/quality/UAT_CHANGE_LOG.md`
21. `CHANGELOG.md`

不包含环境文件、凭据、测试数据、截图、本地日志或构建产物；无 ROADMAP / Phase 状态变更。

## 2026-09-07 删除入口故障修复

现场日志确认 SKU 和产品的 DELETE 请求返回 HTTP 405。Admin 路由已包含删除分支，但未导出 Next.js 的 DELETE 方法；前端直接解析空响应，导致显示 `Unexpected end of JSON input`。

修复范围：补齐既有 DELETE 路由导出，为基础资料请求增加空响应、非 JSON 响应及异常响应结构的中文提示，保留 HTTP 状态与可用的 Request ID。继续复用 API_SPEC 第 25 节的六类安全删除契约、权限、引用保护和审计，不修改数据库或 API 契约。

验证结果：专项测试共 72 项通过（Admin 页面与路由 34 项、API 基础资料 25 项、Repository 基础资料 13 项）。新增测试覆盖六类删除路由鉴权与 Request ID、SKU 删除权限和审计、库存引用阻断、正常删除响应、空响应、HTML 响应及异常 JSON 结构。Repository 测试使用模拟委托，不代表真实数据库删除验证。

本地 `localhost:3100` 已通过 OPTIONS 确认允许 DELETE；无鉴权 DELETE 返回 HTTP 401、标准中文错误包装与 Request ID，证实请求进入正式鉴权边界，不再返回 405。API Health 为 HTTP 200，应用 `ok`、数据库 `connected`。本次未执行带身份凭据的真实数据删除，未清理任何现有 SKU。完整检查结果见 UAT 测试记录；修复状态为 Fixed / Pending Manual Verification。

## 1. 删除规则

本次优化面向基础资料测试数据清理，保留正式启用 / 停用生命周期，并只允许删除无业务引用的数据。

删除结果分为三类：

1. 无业务引用：允许删除；
2. 已被业务单据或库存引用：禁止删除，提示“该数据已被业务单据引用，无法删除，请停用。”；
3. 系统数据：禁止删除，提示“系统数据不可删除。”。

本次未修改 Database Schema、Migration、业务状态模型或 Permission Code。由于既有 Master Data API 没有删除入口，本次新增 6 个受控 `DELETE` API，并已同步 `API_SPEC.md` v1.8。删除权限复用对应资源既有 `master.*.update` 权限，不新增 `delete` 权限码。

## 2. 引用检查范围

第一阶段支持安全删除的对象：

- Product Category；
- Product；
- SKU；
- Supplier；
- Manufacturer；
- Warehouse。

引用检查范围如下：

| 对象 | 引用检查 |
| --- | --- |
| Product Category | 子分类、Product |
| Product | SKU、Product Supplier Relation、Product Manufacturer Relation |
| SKU | Inventory、Inventory Transaction、Purchase Item、Production Item、Inspection Item、Inbound Item、Outbound Item、Adjustment Item、Cross-border Shipment Item、Sales Return Item、Transfer Item、Stock Count Item、Damage Report Item、Purchase Return Item、Production Completion Item、Import Task Match、Inventory Alert |
| Supplier | Purchase Order、Purchase Payment、Purchase Return、Inbound Order、Product Supplier Relation |
| Manufacturer | Production Order、Production Payment、Inbound Order、Product Manufacturer Relation、Manufacturer Warehouse |
| Warehouse | Inventory、Inventory Transaction、Inbound、Inspection、Outbound、Adjustment、Cross-border Shipment、Transfer、Stock Count、Damage Report、Sales Return、Purchase Return、Import Task、Import Task Match、Inventory Alert、Production Completion、Role Warehouse Scope |

Brand、Platform、Store 本次不开放删除，继续通过启用 / 停用管理生命周期。

## 3. 系统数据保护

当前数据库模型未提供 `is_system` 字段。为避免修改 Database Schema，本次采用保守保护规则：

- 编码以 `SYS-` 开头的数据视为系统数据；
- 编码以 `SYSTEM-` 开头的数据视为系统数据。

该规则不影响普通业务编码和历史数据。若后续需要更精确的系统数据治理，应提交 Database CR 增加正式系统数据标记字段。

## 4. 前端交互

基础资料列表增加删除入口：

- 只在 Product Category、Product、SKU、Supplier、Manufacturer、Warehouse 显示；
- 删除前弹出二次确认：“删除后无法恢复，确认删除吗？”；
- 删除成功后刷新列表；
- 删除失败时显示服务端业务提示；
- 保留原有启用 / 停用按钮。

## 5. 测试结果

已新增并通过以下测试：

- Product 无引用删除成功；
- Product 存在 SKU 引用时删除失败；
- Product Category 无引用删除成功；
- Product Category 存在 Product 或子分类引用时删除失败；
- Supplier 存在采购引用时删除失败；
- Supplier 无引用删除成功；
- Warehouse 存在库存引用时删除失败；
- Warehouse 无引用删除成功；
- 系统编码数据禁止删除；
- 前端只对批准范围显示删除能力；
- 删除失败返回业务化提示，不暴露数据库错误。

执行结果：

- `pnpm exec vitest run apps/admin/tests/master-data-page.test.tsx`：通过；
- `pnpm --filter @violin-erp/api exec vitest run tests/master-data.test.ts`：通过；
- `pnpm --filter @violin-erp/database exec vitest run tests/master-data-repository.test.ts`：通过；
- `pnpm check`：通过。

## 6. 风险说明

1. 删除为物理删除，仅允许无业务引用的基础资料测试数据；已被业务引用的数据必须停用；
2. 本次不删除任何业务单据、库存记录或库存流水；
3. 系统数据识别依赖编码前缀，后续若需要正式系统数据标记，应另行提交 Database CR；
4. 删除权限复用 `master.*.update`，不新增 Permission Code；
5. 本次新增受控 Delete API，已同步 API SSOT，未修改 DTO、Response 包装、错误码或 Permission Code。
