---
document_name: UAT-012 Workflow表单透明背景修复报告
project: Violin ERP Lite
version: 1.0
status: Draft
owner: Project Manager
created_date: 2026-08-03
updated_date: 2026-08-03
related_phase: Phase 10
---

# UAT-012 Workflow Form Transparent Background Fix Report

## 1. 问题摘要

UAT-012 发现核心业务工作台新增 / 编辑表单存在背景透明问题，底层列表、筛选栏和文字会穿透到表单主体中，影响字段填写、明细录入和底部操作按钮的可读性。

影响范围：

- Purchase；
- Production；
- Inspection；
- Inbound；
- Inventory Adjustment；
- Outbound；
- Cross-border Shipment；
- Sales Return。

## 2. 根因分析

Workflow Workbench 的新增表单和详情抽屉为多个核心业务模块共用。原实现中：

- Overlay 使用较弱的通用遮罩；
- Drawer / Dialog 主体依赖 `bg-background`；
- 明细卡片和详情字段块未强制声明不透明背景；
- input、select、textarea 等控件依赖背景变量；
- 底部操作区位于滚动表单内部，缺少独立不透明分区。

当工作台页面底层内容较密集时，弹层内容与底层列表视觉边界不足，表现为表单主体透明、底层页面穿透和输入区叠加。

## 3. 修复方案

本次修复采用 Workflow Workbench 共用样式收敛方案：

- 新增 `WORKFLOW_SURFACE_CLASSES`，统一定义业务弹层表面样式；
- Overlay 改为明确半透明深色遮罩；
- Drawer / Dialog 主体改为明确不透明背景、边框、阴影和层级；
- Dialog 拆分为 Header、Body、Footer 三个独立不透明区域；
- 长表单仅 Body 区滚动，Footer 保存 / 取消按钮保持清晰可见；
- 明细行卡片、详情字段块和状态历史卡片使用独立不透明背景；
- input、select、textarea 统一使用明确背景、边框和文本颜色；
- 保留 Light 模式正式视觉，不新增 Dark Mode 业务能力。

## 4. 修改文件

- `apps/admin/components/workflow/workflow-workbench.tsx`
- `apps/admin/tests/workflow-page.test.tsx`
- `docs/quality/UAT_ISSUE_LIST.md`
- `docs/quality/UAT_TEST_RECORD.md`
- `docs/quality/UAT_CHANGE_LOG.md`
- `docs/quality/UAT_012_TRANSPARENT_FORM_FIX_REPORT.md`

## 5. Frozen 影响判断

本次修复仅涉及 PC Admin Workflow Workbench 展示层样式和 UAT 文档。

- Database：Not Changed；
- API Contract：Not Changed；
- Permission：Not Changed；
- Business Rules：Not Changed；
- Workflow State Machine：Not Changed。

## 6. 自动化测试

新增 / 更新测试覆盖：

- Workflow Drawer / Dialog 主体必须有非透明背景；
- Overlay 必须存在明确半透明遮罩；
- 明细卡片和详情字段块必须有独立背景；
- 表单控件必须有明确背景和边框；
- Footer 操作区必须不透明；
- Purchase / Production / Inspection / Inbound / Inventory Adjustment / Outbound / Cross-border Shipment / Sales Return 共用同一业务表单外壳。

执行结果：

- `pnpm exec vitest run apps/admin/tests/workflow-page.test.tsx`：Passed；
- `pnpm check`：Passed；
- `pnpm status:check`：Passed；
- `git diff --check`：Passed。

## 7. 本地冒烟

本地冒烟范围：

- 新增采购订单；
- 新增生产任务；
- 新增质检单；
- 新增入库单；
- 新增库存调整；
- 新增出库单；
- 新增跨境发货；
- 新增销售退货。

执行结果：

Passed

验证方式：

- 使用 `http://localhost:3100` 已登录本地 UAT 会话；
- 通过 PC Admin 左侧导航和业务视图 Tab 依次打开各核心业务新增表单；
- 读取 Overlay、Dialog 主体、明细区、底部操作区和前 8 个表单控件的实际 computed background；
- 全部核心表单主体、明细区、Footer 和控件均为 `rgb(255, 255, 255)`；
- Overlay 为明确半透明深色遮罩；
- 未提交业务表单，未产生业务数据变更。

复验点：

- 表单主体不透明；
- 底层内容不穿透；
- 输入框清晰可见；
- 明细区清晰；
- 保存 / 取消按钮清晰；
- 下拉和日期控件层级正常。

## 8. UAT 状态

UAT-012：

Fixed / Pending Manual Verification

需项目负责人在本地人工复验通过后，更新为：

Verified / Closed
