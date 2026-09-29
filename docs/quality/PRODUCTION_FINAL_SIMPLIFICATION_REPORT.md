# 生产流程最终简化验证报告

日期：2026-09-29。基准：`888b65323efc3ab4c6c56784da2b6a24c636f5f6`。CR-014：Approved / Implemented，Approved By：Project Owner。UAT：**Fixed / Pending Manual Verification**。本轮不新增 UAT 编号，不直接 Closed。

采购批次已独立提交推送，开始时工作区干净、origin/main 一致，pnpm status:check 通过。当前 Phase 10 Completed / Approved 不变。本批统一提交 `refactor: simplify production and inbound workflow`。

## 业务实施

生产厂家 → 多 SKU 生产订单 → 分批成品入库 → 库存。保存直接生产中；四状态为生产中、部分入库、已入库、已取消。生产列表仅日期、生产商、SKU、数量、状态、操作；多明细摘要“首 SKU 等 N 项”。生产日期使用日历，默认当天且可修改；planned_start_date 服务端取正式生产日期，保留预计完成日。

订单多行 SKU 可添加、删除，重复 SKU 和非正数量拒绝；主明细与 Audit 同事务。型号、名称、尺寸、颜色由正式 SKU/Product 展示。生产进度、分配完工、成品质检导航及新写操作停用，历史表、数据、查询与 Audit 保留。旧审核/开始动作不再用于新订单；生产付款未纳入删除范围。

成品入库直接选择生产中/部分入库订单，加载仍有剩余数量的明细；用户只填本次数量，允许选择部分 SKU，未填写/零不提交。是否质检必选、无默认；姓名文字选填最多 100 字，否时 UI 清空且数据库保存 NULL。入库日期使用日历；成本与批次不再重复输入，批次 NULL。一次保存直接 completed，刷新列表。

订单详情展示业务信息、各 SKU 计划/累计/剩余、每次入库的日期、数量、质检信息、仓库，以及创建人和日期。Dashboard 使用生产中待成品入库、部分入库生产订单；无新流程完工/质检入口。

## Lite版本暂估生产入库成本

负责人已正式批准：成品入库暂估单位成本等于对应 Production Order Item 的加工单价。每个 SKU 和每一批分别读取 processing_unit_price，写入 Inbound Item 与 Inventory Transaction；客户端 unitCost 覆盖无效，不取订单平均价格，不计算移动平均生产成本。

不额外计入原材料、配件、油漆、包装、领料、制造费用或其他间接成本，不表述为完整制造成本。历史成本不追溯、不重算；后续 BOM / Material Issue / Manufacturing Cost / Cost Accounting 由独立 CR 升级。

## 安全、事务与历史

生产父单 FOR UPDATE 锁内重查来源状态、范围和逐明细剩余量，防止并发超入库。入库主明细、库存、流水、生产累计和状态、状态历史、required Audit 同事务；正式持久化幂等适配器重放原响应，不重复记账。稳定 SKU 锁顺序，使用 Decimal 计算数量和成本。连续部分入库若状态未变化，仅记录本次入库状态及 Audit，不伪造相同前后状态历史。

不新增 Permission Code，不扩大角色或 Data Scope；成品入库同时要求 create-production 与 confirm，并校验来源记录与目标仓 operate/manage 范围。普通用户不能通过 UI 绕过服务端校验。

初审 6 张历史生产单、4 张已完成生产入库，未发现累计超过计划。历史 completed 不等同已入库；以正式入库明细和净流水核对累计后兼容展示，不批量改写旧状态。证据矛盾的历史只读待复核。原进度、完工、质检及成本均未重算或删除。

## Database / API

API v1.17，仍 344 条正式路径；PRO-003 保存生产中、INB-004 直接分批入库；历史路径保留读取，停用写入返回业务 409。新动作不需要第二次入库审批，权限代码保持原样。

Database v2.11：75 个正式表、1346 字段不变，Check 285。迁移 `20260929150000_production_final_simplification` 扩展既有质检信息 CHECK 到 production_order，新增累计入库不超过计划的 CHECK；不新增表或字段，不重写历史。新增数量 CHECK 使用 NOT VALID 保留历史异常兼容，新写入和更新强制检查。Prisma validate、迁移部署、15 个迁移状态全部通过。

## 真实 PostgreSQL / HTTP

专项已显式启用 RUN_PRODUCTION_FINAL_POSTGRES，最后一次订单 `PRO-20260929-3CF895F3`；A100 × 123.45、B50 × 200，三次 A40+B50、A30、A30。最终 3 张 completed 入库、4 条流水、库存 A100/B50，暂估金额 22345，父单 received；创建和每次入库 Audit 均成功。

真实测试覆盖：已入库/已取消拒绝、未选质检 422、false 清空姓名、单次超量、逐 SKU 累计、两键并发仅一次成功、同键重放、Audit 故障与库存流水故障全部回滚、来源与仓库范围拒绝、旧进度/完工/质检停写及历史进度查询。单元专项另覆盖重复/外部 SKU、空明细、非布尔质检、非法日期、姓名过长、非可用仓库存分类。

初次实库验证发现连续部分入库写入相同状态历史违反原 CHECK，已修正为仅在状态变化时追加生产状态历史；失败事务整体回滚，随后完整专项通过。失败轮留下的 UAT 部分入库事实保留，不删除已记账数据。

## 浏览器闭环

环境：Codex 内嵌浏览器，`http://localhost:3100/workspace/production`，桌面视口 1280×720，复用既有 UAT 账号。通过真实日历选日期、创建两 SKU 生产单 `PRO-20260929-D09159C1`，备注 `UAT-PROD-FINAL-20260929-BROWSER`；保存即生产中。

首批是/张三，A40+B50；第二批先填姓名再切换否，姓名隐藏并保存 NULL，A30；第三批是/张三，A30。界面分别显示 A 剩余 60、30、0；B 首批入足后不再列入可入库明细。最终列表已入库、详情 A100/B50、3 次入库记录及创建人正确。

入库单：`INB-20260929-A5C903D4`、`INB-20260929-14247050`、`INB-20260929-7CEB9E1C`。数据库只读复核 4 条流水、合计数量 150、金额 22345，生产创建与入库成功 Audit 共 4 条；每项各自继承 123.45 / 200，未用均价。

页面有实际内容、无框架报错覆盖；两个生产页签、四状态、六列表头、日历、多 SKU、必选质检、清空姓名及自动刷新均通过。Console error=0、warn=0；该浏览器验证时段服务端请求日志无异常 5xx。截图保存在仓库外 `/tmp/production-final-browser.png`，未提交 Git。移动端视口未复测。

## 全量检查与待人工复验

pnpm check 通过：571 passed，71 conditional skipped；其中本轮 PostgreSQL 专项已另行启用通过，其余 70 条件性测试本轮未全量启用。格式、Lint、类型检查、Admin/Miniapp 构建通过。首次沙箱构建因 Next 端口绑定及 Taro 系统配置受限失败，已在正常权限环境重跑通过。

pnpm status:check、git diff --check 通过。ERP Health HTTP 200，application.status=ok、database.status=connected；AI 视觉平台 3000 HTTP 200。未操作 PM2 或 AI 平台，未新增账号、改密码或扩大临时账号权限。未提交凭据、测试业务数据、日志、截图或构建产物。

待负责人以实际岗位账号复验生产日期、多 SKU 制单、分批数量、暂估成本说明、历史单据与仓库范围。最终 UAT 保持 Fixed / Pending Manual Verification。
