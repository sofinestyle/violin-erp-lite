---
document_name: CR-007 自动编码第二阶段批准扩展
project: Violin ERP Lite
cr_id: CR-007
type: Business Rule / API / Database Scope Extension
status: Approved
owner: Project Manager
created_date: 2026-09-08
related_issue: UAT-009
---

# Automatic Code Generation Phase 2 Approval Extension

Approved By：Project Owner。Approval Date：2026-09-08。

审批依据：项目负责人本次《Automatic Code Generation Phase 2 Category / Brand / Platform / Store》任务明确批准范围扩展，并授权先同步批准状态及正式契约，再一次性交付代码、测试、文档和单次提交。本批准是上线后独立变更，不变更十阶段路线或当前 Phase / Task 状态。

## 批准范围及规则

扩展 CR-001 / CR-002 / CR-003 原暂缓的 Category、Brand、Platform、Store 自动编码范围。分别采用 `CAT-000001`、`BRD-000001`、`PLT-000001`、`STR-000001`，固定前缀加六位流水；Store 全局流水，不拼接 platformCode。六位空间耗尽时明确拒绝，不能生成七位号码。

复用 CodeGenerationService、code_generation_rules、code_sequences；code_type 遵循现有小写命名 category / brand / platform / store。通过可重复执行的 forward-only 数据 Migration 初始化四条规则及四条流水，不新增表、字段、约束或编号管理后台，不重置已存在流水，不批量重写历史编码。

四类 Create DTO 的编码字段改为 optional；缺省、null 或空白时生成，显式合法历史编码保持兼容。Response 在既有编码字段返回最终值。Update 显式提交编码字段时拒绝，编辑界面只读；保留现有字段格式、长度、重复错误和业务校验。

## 事务与兼容性

四类对象均通过统一服务在业务事务内锁定既有 code_sequences 行，再逐号检查历史占用并更新流水，禁止 max(code)+1、时间戳、前端随机编号及 Repository 自行拼码。显式编码创建同样遵守该流水行锁，避免与自动编号竞争；既有业务唯一约束最终裁决重复。失败事务回滚流水及业务记录。历史占用只影响新号码选择，不更改原数据；多实例依赖数据库锁，不依赖进程内计数。

## 契约与保护边界

不新增 API Path、Response 包装、错误码或 Permission Code。保留品牌 administrator 安全删除与 Product 引用保护、分类层级推导、Platform / Store 独立关系和 Store Data Scope。platformId 仍为关联主键；externalStoreId 仍为可选平台外部标识，与内部 storeCode 无关，其现有类型与唯一性约束不在本次变更范围。

## 验收及交付

每类覆盖缺省自动创建、最终编码返回、显式旧码兼容、重复拒绝、非法编码、Update 拒绝、至少五个并发创建、流水推进、历史占用跳号和失败回滚。执行 Node 22、本地 PostgreSQL、localhost:3100 真实验证及完整 pnpm check、状态检查、Prisma 检查、健康检查，确认 localhost:3000 可用；禁止操作 PM2。

测试资料统一 UAT-AUTO- 标识，仅通过已有安全删除或停用能力清理。UAT 为 Fixed / Pending Manual Verification，最终人工验收不由自动化替代。
