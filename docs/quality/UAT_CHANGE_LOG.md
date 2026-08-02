---
document_name: UAT变更记录
project: Violin ERP Lite
version: 1.0
status: Draft
owner: Project Manager
created_date: 2026-07-26
updated_date: 2026-08-02
related_phase: Phase 10
---

# Violin ERP Lite UAT Change Log

## 1. 文档说明

本文件用于记录 Local UAT 阶段的问题修复批次，包括：

- 修复的问题；
- 修改文件；
- 测试结果；
- Git Commit。

## 2. 记录格式

### Batch XXX

问题：

UAT-XXX

修改：

xxx

测试：

xxx

Commit：

xxx

### Batch 001

问题：

- UAT-001
- UAT-002
- UAT-003
- UAT-004
- UAT-005
- UAT-006
- UAT-007
- UAT-008
- UAT-009

修改：

- 修复 App Shell、Dialog/Drawer、登录页、Dashboard 和 Master Data 表单交互。
- UAT-009 完成影响评估，因涉及 Frozen 业务规则和 API Create DTO，标记为 Blocked by CR。

测试：

- `pnpm exec vitest run apps/admin/tests/app-shell.test.tsx apps/admin/tests/master-data-page.test.tsx apps/admin/tests/auth-client.test.ts apps/admin/tests/dashboard.test.tsx`：通过。
- 全量 `pnpm check`：通过。
- 本地 `http://localhost:3100/` 页面冒烟：通过。
- 本地 `http://localhost:3100/api/health`：通过。
- AI 视觉设计平台 `http://localhost:3000/` 存活确认：通过，未操作 PM2。

Commit：

`fix: resolve UAT batch 001 issues`
