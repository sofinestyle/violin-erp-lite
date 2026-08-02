---
document_name: UAT Batch 001修复报告
project: Violin ERP Lite
version: 1.0
status: Draft
owner: Project Manager
created_date: 2026-08-02
updated_date: 2026-08-02
related_phase: Phase 10
---

# Violin ERP Lite UAT Batch 001 Fix Report

## 1. 修复范围

本批次覆盖 Local UAT 已登记问题：

- UAT-001 用户编辑弹窗背景透明
- UAT-002 Light 主题按钮无响应
- UAT-003 帮助与通知图标无响应
- UAT-004 管理员头像点击直接退出
- UAT-005 登录密码显示 / 隐藏
- UAT-006 首页 Dashboard 占位内容
- UAT-007 左侧菜单切换屏闪
- UAT-008 新增产品请求校验失败
- UAT-009 基础资料编码自动生成影响评估

## 2. 逐项根因与处理结果

### UAT-001 用户编辑弹窗背景透明

根因：

用户编辑使用基础资料工作台 Drawer，遮罩与主体依赖通用背景变量，视觉上与底层页面区分不足。

修复：

- Drawer 遮罩改为明确深色半透明背景；
- Drawer 主体改为明确白色背景、边框和正文颜色；
- 通用 Dialog 提升层级并明确 Light 模式背景。

状态：

Fixed，等待人工复验。

### UAT-002 Light 主题按钮无响应

根因：

Phase 4 视觉设计仅批准 Light Mode。Batch 001 曾为 Light 展示控件补齐反馈；项目负责人在本轮确认系统当前不需要主题切换，因此 Header 中继续保留 Light / Theme 控件会形成误导。

修复：

- 从全局 Header 完全移除 Light / Theme 按钮；
- 删除仅为该按钮服务的 ThemeProvider 代码；
- 不新增 Dark Mode；
- 不影响现有 Light 主题样式。

状态：

Fixed / Pending Manual Verification。

### UAT-003 帮助与通知图标无响应

根因：

Header 帮助和通知图标为静态按钮，未接入最小交互。

修复：

- 帮助按钮打开帮助说明浮层，并可进入信息面板；
- 通知按钮打开通知面板；
- 无通知时显示“暂无通知”。

状态：

Fixed，等待人工复验。

### UAT-004 管理员头像点击直接退出

根因：

用户区域按钮直接绑定 logout，缺少用户菜单。

修复：

- 用户区域改为下拉菜单；
- 菜单包含“用户管理”和“退出登录”；
- “用户管理”受 `security.user.read` 权限控制；
- 支持点击外部和 Escape 关闭；
- 只有点击“退出登录”才注销。

状态：

Fixed，等待人工复验。

### UAT-005 登录密码显示 / 隐藏

根因：

登录密码框未提供可见性切换入口。

修复：

- 密码框末尾新增显示 / 隐藏按钮；
- 默认隐藏；
- 切换不改变字段名称、密码内容和浏览器密码管理属性；
- 补充无障碍标签。

状态：

Fixed，等待人工复验。

### UAT-006 首页 Dashboard 占位内容

根因：

首页仍直接渲染 App Shell 默认空状态，未接入正式 MVP Dashboard。

修复：

- 新增 Dashboard 组件；
- 仅复用现有 API，不新增 Dashboard API；
- 按当前账号权限展示基础资料概览、库存概览、待处理事项、常用入口和业务模块入口；
- 提供加载、空状态和错误状态；
- 不硬编码生产统计结果。

状态：

Fixed，等待人工复验。

### UAT-007 左侧菜单切换屏闪

根因：

Batch 001 已修复左侧菜单栏和 Header 重复挂载问题。但根级 `app/loading.tsx` 仍使用全屏 `GlobalLoading`，在 Next.js 路由切换时作为 App Shell children 渲染，导致右侧内容区域被整块替换为全屏加载态，形成明显白屏 / 闪屏。

修复：

- 将 App Shell 提升到 Root Layout；
- Workspace 页面仅渲染内容区域；
- Header 与 Sidebar 在客户端路由切换时保持稳定；
- 页面标题由路径解析得到。
- 将 route loading 改为内容区稳定骨架；
- 保留 App Shell，不再在右侧内容区显示全屏加载页。

状态：

Fixed / Pending Manual Verification。

### UAT-008 新增产品请求校验失败

根因：

产品创建表单要求用户手工输入 `categoryId` 和 `brandId`，实际 API DTO 要求 UUID 且引用对象必须存在并启用。用户填写业务含义字段或空值时，服务端返回字段级校验错误，但前端仅展示“请求数据校验失败”，未暴露具体字段和 Request ID。

修复：

- 产品分类、品牌、SKU 所属产品、上级分类、仓库厂家、店铺平台等关联字段改为下拉选择；
- 选项复用已批准 `/options` API；
- API 错误展示补充字段级 details 与 Request ID；
- 合法关联数据可提交，非法数据可准确定位字段原因。

状态：

Fixed，等待人工复验。

### UAT-009 基础资料编码自动生成

影响评估：

- `BUSINESS_RULES.md` 当前要求历史 Product Code / SKU Code 保留并延续正式编码；
- 已批准页面设计将 Product Code、SKU Code、Category Code、Brand Code、Supplier Code、Warehouse Code、Platform Code、Store Code 等作为人工录入并校验唯一的业务字段；
- API Create DTO 当前要求编码字段由客户端提交；
- 现有数据库没有统一编号规则表、序列对象或已批准编号策略；
- 仓促实现会影响 Frozen 业务规则和 API Contract。

处理结论：

不在本批次实现自动编码。该项需要先提交业务规则 / API Change Request；如后续决定采用数据库序列或编号租约，还需再判断 Database CR。

状态：

Blocked by CR。

## 3. 修改文件

- `apps/admin/app/layout.tsx`
- `apps/admin/app/page.tsx`
- `apps/admin/app/workspace/[section]/page.tsx`
- `apps/admin/app/workspace/access-control/[resource]/page.tsx`
- `apps/admin/app/workspace/access-control/page.tsx`
- `apps/admin/app/workspace/master-data/[resource]/page.tsx`
- `apps/admin/app/workspace/master-data/page.tsx`
- `apps/admin/components/dashboard/dashboard.tsx`
- `apps/admin/components/master-data/master-data-workbench.tsx`
- `apps/admin/components/shell/app-frame.tsx`
- `apps/admin/components/shell/app-shell.tsx`
- `apps/admin/components/ui/dialog.tsx`
- `apps/admin/contexts/auth-context.tsx`
- `apps/admin/lib/master-data.ts`
- `apps/admin/app/loading.tsx`
- `apps/admin/tests/app-shell.test.tsx`
- `apps/admin/tests/auth-client.test.ts`
- `apps/admin/tests/dashboard.test.tsx`
- `apps/admin/tests/master-data-page.test.tsx`
- `docs/quality/UAT_ISSUE_LIST.md`
- `docs/quality/UAT_TEST_RECORD.md`
- `docs/quality/UAT_CHANGE_LOG.md`

## 4. Frozen 影响判断

- Database：未修改。
- Migration：未修改。
- API Contract：未修改。
- Permission：未修改。
- ROADMAP / Phase 状态：未修改。

UAT-009 涉及 Frozen 业务规则和 API Create DTO，已按 CR 阻断处理。

## 5. 自动化测试结果

本批次新增和更新测试覆盖：

- Dialog / Drawer 背景与 App Shell Header 交互基础回归；
- Header 无主题切换误导入口；
- 帮助 / 通知 / 用户菜单静态可访问性；
- 登录密码显示 / 隐藏控件；
- Dashboard MVP 结构；
- 右侧内容区 route loading 稳定骨架；
- Master Data 关联字段 options 配置；
- Product 创建校验详情和 Request ID 展示。

执行结果：

- Targeted Vitest：通过。
- `pnpm check`：通过。
- `pnpm status:check`：通过。
- `git diff --check`：通过。

## 6. 本地页面冒烟测试

环境：

- Node：22.x
- Violin ERP Lite：`http://localhost:3100`
- AI 视觉设计平台保护端口：`http://localhost:3000`

结果：

- Violin Web：`http://localhost:3100/` 返回 200。
- Violin API Health：`/api/health` 返回 `application.status = ok`、`database.status = connected`。
- 连续切换 5 个左侧菜单：Header / Sidebar 保持稳定，右侧内容区非空，未出现全屏“正在加载应用”。
- AI 视觉设计平台：`http://localhost:3000/` 有服务响应，未停止、未重启、未操作 PM2。

备注：

本地启动 3100 时需要加载项目根目录 `.env`；否则 Health 会因数据库环境变量缺失返回 503。

## 7. 待人工复验清单

- UAT-001 至 UAT-008 已由项目负责人人工复验通过；
- UAT-009 保留为 Blocked by CR，等待项目负责人确认是否启动自动编码 CR。

## 8. Manual Verification Result

复验结果：

Passed

关闭范围：

- UAT-001 用户编辑 Drawer 背景和遮罩可读性；
- UAT-002 Header 主题按钮移除；
- UAT-003 帮助和通知面板；
- UAT-004 用户菜单与退出操作；
- UAT-005 登录密码显示 / 隐藏；
- UAT-006 首页 Dashboard 数据、空状态和错误状态；
- UAT-007 菜单切换无明显白屏或闪屏；
- UAT-008 新增产品合法保存与非法字段提示。

状态：

Verified / Closed

保留事项：

- UAT-009：Blocked by CR，等待 CR 决策。
