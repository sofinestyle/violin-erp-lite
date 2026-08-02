---
document_name: UAT人工验收记录
project: Violin ERP Lite
version: 1.0
status: Draft
owner: Project Manager
created_date: 2026-07-26
updated_date: 2026-08-02
related_phase: Phase 10
---

# Violin ERP Lite UAT Test Record

## 1. 当前阶段

Local UAT In Progress

## 2. 测试环境

Web:

http://localhost:3100

Database:

violin_erp_lite

## 3. 测试状态

进行中

## 4. 已发现问题

- UAT-001
- UAT-002
- UAT-003
- UAT-004
- UAT-005
- UAT-006
- UAT-007
- UAT-008
- UAT-009

## 5. 已测试模块

- 登录
- 用户管理
- 登录页
- Dashboard
- 左侧导航
- 产品新增
- 基础资料编码录入

## 6. 本轮测试记录

测试模块：

- 登录页
- Dashboard
- 左侧导航
- 产品新增
- 基础资料编码录入

新增问题：

- UAT-005
- UAT-006
- UAT-007
- UAT-008
- UAT-009

当前累计问题：

UAT-001 至 UAT-009

状态：

Local UAT In Progress

## 7. UAT Batch 001 修复记录

修复范围：

- UAT-001 用户编辑弹窗背景透明
- UAT-002 Light 主题按钮无响应
- UAT-003 帮助 / 通知图标无响应
- UAT-004 用户头像点击直接退出
- UAT-005 登录密码显示 / 隐藏
- UAT-006 Dashboard 占位内容
- UAT-007 菜单切换屏闪
- UAT-008 新增产品请求校验失败

影响评估：

- UAT-009 基础资料编码自动生成已完成影响评估，当前状态为 Blocked by CR。

自动化回归：

- App Shell 回归测试：通过
- Dashboard 回归测试：通过
- 登录密码控件回归测试：通过
- Master Data 关系选择和校验详情回归测试：通过
- 全量 `pnpm check`：通过

本地冒烟：

- Violin ERP Lite `http://localhost:3100/`：可访问
- Violin ERP Lite `/api/health`：Healthy，数据库 connected
- AI 视觉设计平台 `http://localhost:3000/`：服务存活，未操作 PM2

当前状态：

Local UAT In Progress，等待项目负责人进行人工复验。
