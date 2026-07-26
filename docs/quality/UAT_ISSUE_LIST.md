---
document_name: UAT问题清单
project: Violin ERP Lite
version: 1.0
status: Draft
owner: Project Manager
created_date: 2026-07-26
updated_date: 2026-07-26
related_phase: Phase 10
---

# Violin ERP Lite UAT Issue List

## 1. 文档说明

本文件用于记录 Violin ERP Lite 人工验收（User Acceptance Test, UAT）阶段发现的问题。

本文件仅作为本地人工验收问题管理清单，不修改项目 Phase 状态，不替代正式 Database、API、Permission 或业务规则 SSOT。

## 2. 状态流转

Open

↓

Analyzing

↓

Approved

↓

Fixed

↓

Verified

↓

Closed

## 3. 问题等级

- Blocker
- Critical
- Major
- Minor
- Future

## 4. Issue List

### UAT-001

模块：

用户管理

页面：

用户编辑页面

问题描述：

打开“编辑用户”弹窗后，弹窗主体背景透明，底层页面内容穿透显示。

问题类型：

UI / UX Bug

严重等级：

Minor

影响：

不影响业务功能。影响页面可读性和操作体验。

发现阶段：

Local UAT

状态：

Open

处理：

待评估修复

发现日期：

2026-07-26

### UAT-002

模块：

Layout / Theme

页面：

全局Header

问题描述：

Light主题按钮点击无响应。

问题类型：

UI / UX Bug

严重等级：

Minor

影响：

不影响核心业务。主题切换功能不可用。

发现阶段：

Local UAT

状态：

Open

处理：

待评估修复

发现日期：

2026-07-26

### UAT-003

模块：

Layout / Notification

页面：

Header顶部工具栏

问题描述：

帮助问号图标、通知铃铛图标点击无响应。

问题类型：

UI / UX Bug

严重等级：

Minor

影响：

不影响业务流程。辅助功能不可用。

发现阶段：

Local UAT

状态：

Open

处理：

待评估修复

发现日期：

2026-07-26

### UAT-004

模块：

User Management

页面：

Header用户菜单

问题描述：

点击管理员头像区域直接退出系统。

期望：

- 用户管理
- 退出登录

实际：

直接执行退出。

问题类型：

Interaction Logic Bug

严重等级：

Major

影响：

存在误退出风险。

发现阶段：

Local UAT

状态：

Open

处理：

待评估修复

发现日期：

2026-07-26
