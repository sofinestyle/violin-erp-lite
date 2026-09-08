---
document_name: Manual UAT Bug Batch – SKU / Store / Warehouse / Category
project: Violin ERP Lite
status: Fixed / Pending Manual Verification
owner: Project Manager
created_date: 2026-09-08
updated_date: 2026-09-08
---

# Manual UAT Bug Batch

本批四项问题已修复，HTTP、浏览器和真实 PostgreSQL 验证通过。CR-008 / CR-009 已由 Project Owner 于 2026-09-08 正式批准并实施；仍待人工复验，不自动 Closed。基准为 `7448cc4d78096cd250eb3899d60a2769971f1b12`；保留并完成最初 8 个未提交文件，所有变更属于同一批次。Phase 10 / Task 状态不变。

## 四项根因及修复

| 问题 | 已核实根因 | 最终修复 |
| --- | --- | --- |
| BUG-1 SKU | L3-12-BR 的 API productId 与数据库一致，产品选项也存在；原 defaultValue 在异步选项加载后不重新选择。 | 关联下拉改为受控 value；保留表单状态，当前关联不在首组选项时经原详情 API 补齐。新增可正常选择，编辑默认回显，保存其他字段不丢失关系。 |
| BUG-2 Store | stores.external_store_id 为 nullable UUID，Create / Update Validator 同样要求 UUID，平台普通编号无法通过。 | CR-008 改为 optional / nullable string，去首尾空白、空白归一 null、最大 100 字符；Prisma 与 PostgreSQL 改为 VARCHAR(100)。storeCode 仍为 STR 自动编码，platformId 仍为原 UUID 外键，同平台非空唯一约束保持。 |
| BUG-3 Warehouse | UAT-WAREHOUSE-CHECK 创建 HTTP 201，WH-000009 已在 DB 启用，但角色范围 0；列表 GET 200 不含记录、详情 404。原前端已有刷新，主因是 Data Scope 初始化缺口。 | CR-009 仅对 Warehouse / Store 新建在同一事务中初始化创建者有效且具备相应 Create 权限的角色 manage 范围及审计。失败回滚对象、范围、流水；列表/详情/下游继续依既有范围过滤。新建后清除不匹配搜索和状态条件，回到第一页显示新记录；失败不提示成功。 |
| BUG-4 Category | 现有 parentCategoryId 与 categoryLevel 已正确保存；列表只有通用平铺列，父级编辑下拉又受异步 defaultValue 影响。 | 使用现有表格补充上级分类名称和中文“一级／二级”；通过现有详情 API 解析不在当前筛选页的父级，去重查询。用户不填数字层级；上级选择正确提交并由既有表单逻辑推导层级，编辑正确回显。 |

真实 L3 产品名称为“实木假花纹小提琴”，与最初人工描述略有不同。本轮按数据库原名称显示，不改 Product 名称或 SKU 归属。

## Contract 与治理影响

Database Logical Design v2.8 / API Master Specification v1.12 / DEC-112 已同步。正式表 75、字段 1343、接口 343 保持不变；不新增 Permission、Role 或数据范围类型，不改变 Store 与 Platform 关联。管理员保留现有全量功能权限，仓库/店铺仍须显式角色范围，不增加全局数据范围旁路。

CR-009 仅授权 Warehouse / Store；同角色成员共享新对象范围，其他角色不获授权。普通更新不初始化范围，SEC-023 / SEC-025 常规范围替换与禁止自身提权规则不变。范围初始化记录 actor、角色集合、目标、manage、时间与 Request ID，审计失败阻止事务提交。

唯一历史对象维护例外为 WH-000009。受限维护方法校验管理员及既有权限，并固定检查编码、诊断名称和创建人；没有通用授权 API。CLI 先正式登录/Session，再调用该机制，最后通过正式 HTTP API 停用；凭据不输出。维护脚本为 `scripts/uat/repair-approved-wh-000009.mjs`，需 `--approved-cr-009` 标志，重复执行不会再次授予已有范围。

## 真实数据库及 HTTP 验证

- Node 22.23.1；localhost:3100；真实本地 PostgreSQL，使用配置的 UAT 账号正式登录并核验 Session。
- Migration `20260908140000_store_external_id_string` 已部署；Prisma validate 通过，12 条迁移均已应用。迁移前 29 条店铺 external_store_id 均为 null，迁移后按 ID 逐条比对保持不变；真实 HTTP 另验证 UUID 格式文本仍被原样保存。
- 正式 HTTP 创建 `UAT-WAREHOUSE-SCOPE-CHECK`，最终专项运行生成 WH-000011，HTTP 201、DB 启用、accessLevel manage、列表与 options 可见，初始化审计存在。
- Store HTTP：null、empty、TEMU-US-001、123456789、AMZJP001、UUID 文本均创建成功；STR-000030—000036 属于最终专项运行，含跨平台复用记录。编辑普通平台编号成功；同平台重复返回 409，跨平台相同编号可用，platformId 保持正确。
- 用现有 UAT 用户在回滚事务中通过正式 SecurityManagementService 临时建立同角色与其他角色身份，调用真实 MasterDataService / Prisma 查询，验证同角色可见、其他角色不可见；测试结束比较原用户及角色关系恢复一致。原环境仅一个有效角色，隔离验证所用 purchaser 角色也只在回滚事务中存在。最终持久化仍为 2 个用户、1 个角色，没有新账号或永久提权。
- 注入初始化审计失败，真实 PostgreSQL 验证新仓库与代码流水全部回滚；无孤立业务记录。单元测试同时覆盖无合格角色拒绝及显式历史仓库编码也必须使用创建事务。

## 浏览器验证

使用现有 CUA / Playwright 能力，localhost:3100，1280×720；本会话没有专用 Browser skill。真实登录与页面身份已确认，页面非空、无框架错误覆盖。截图放在 /tmp，不提交仓库。

| 流程 | 实际结果 |
| --- | --- |
| 编辑 L3-12-BR | 自动选中 L3｜实木假花纹小提琴；本批前序曾修改测试材质并保存，DB product_id 始终不变，测试材质最后正式 PATCH null 恢复。批准变更完成后再次打开确认选中。 |
| 分类层级 | F001 提琴显示一级；CAT-000026 / 000027 / 000028 小提琴、中提琴、大提琴显示父级提琴和二级；编辑小提琴自动选中提琴。 |
| 新增分类 | 本批前序另以 UAT-MANUAL 前缀创建 CAT-000029 一级、CAT-000030—000032 二级，HTTP 201、真实父子关系正确；筛选只剩子分类时父级名称仍正确。 |
| 新增仓库 | 先设置不匹配搜索词及停用筛选，再创建 UAT-WAREHOUSE-SCOPE-BROWSER，自动生成 WH-000012；保存后清除筛选、回到第一页、立即显示启用记录。 |
| 后续业务下拉 | 打开采购入库表单，目标仓库包含 WH-000012，并实际选中。随后关闭表单，未保存单据，未修改库存。 |
| 空店铺标识 | STR-000037，持久化 null，编辑保持空白，平台 PLT-000033 正确选中。 |
| TEMU-US-001 | STR-000038，创建和编辑回显成功，平台 PLT-000033 正确；系统编码只读，与“平台店铺标识”字段清楚分开。 |
| 123456789 | STR-000039，按字符串保存并正确回显，无 UUID 要求，平台关联正确。 |

上述店铺列表均即时可见，DB 管理范围存在。最终浏览器日志 0 error / 0 warn，未观察到新增 5xx；最终刷新请求为 HTTP 200，复核窗口未截断。长流程早期 CDP 事件部分超出保留窗口，因此不将全程响应总数作为完整网络审计证据。前序修复时曾出现一次开发 Fast Refresh warn，正式最终复核未复现。界面未显示 UUID 或 code_type 技术字段。

## WH-000009 与测试数据处理

WH-000009 已经正式 Scope 初始化取得访问，然后正式 HTTP 停用，最终 is_active=false；数据库可查 initialize-scope 与 disable 两项 success 审计。无直接 SQL 修改或物理删除。

四条 UAT 分类经正式 Delete API 按子后父顺序清理；两个 HTTP 验证运行及浏览器创建的 Warehouse / Store / Platform 均经正式 API 停用，包括 WH-000010—000012、STR-000023—000039、PLT-000029—000033。首个真实专项运行因测试环境缺少预设 purchaser 角色导致身份夹具测试失败，业务创建项通过且均已清理；随后使用回滚事务夹具复测，4 项全部通过。没有将该夹具失败隐藏为通过。

范围关系随停用测试对象保留，未直接删除。原有业务分类、产品归属、Store 平台关联和库存数据未被改写；未重置密码、未新建账号、未操作 PM2，未停止 AI 视觉平台。

## 自动化与门禁

| 检查 | 最终结果 |
| --- | --- |
| pnpm check | 通过：格式、ESLint、TypeScript、测试及构建完成。shared 1、API 200、database 175、Admin/root 105，共 481 通过、60 条件性跳过。 |
| 真实专项 | MANUAL_MASTER_DATA_UAT=1：4 / 4 通过，真实 HTTP + Prisma + PostgreSQL；默认门禁跳过的 4 项在此单独启用，不混报。 |
| 本批回归新增 | 关联异步回显 3、跨页父级解析 1、创建反馈/刷新 2、externalStoreId Contract 14、范围初始化 6，以及真实专项 4。 |
| pnpm status:check | 通过，Phase / Task 状态未改变。 |
| prisma validate / db:migrate:status | 通过，12 条 Migration 一致。 |
| git diff --check | 通过。 |
| API Health | HTTP 200，application.status=ok，database.status=connected。 |
| AI 视觉平台 | localhost:3000 HTTP 200，无 PM2 操作或服务停止。 |

## 提交与待人工复验

本批保留同一基准、同一 UAT 记录，统一使用 `fix: resolve manual UAT master data issues` 提交并推送 origin/main。提交前逐项检查 .env、密码、日志、截图、数据库文件、构建产物及无关修改；提交与远程 SHA 结果以最终交付回执为准。

待人工复验：L3 编辑及保存体验、实际平台店铺编号输入、岗位人员新建仓库后的可见范围、分类父级与中文层级可读性。跨角色测试已经真实事务验证，但未替代现场多岗位账号的浏览器验收。整批状态固定为 Fixed / Pending Manual Verification，不自动 Verified / Closed。
