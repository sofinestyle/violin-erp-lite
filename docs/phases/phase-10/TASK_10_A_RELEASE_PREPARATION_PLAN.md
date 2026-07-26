---
document_name: Task 10-A Release Preparation Plan
project: Violin ERP Lite
phase: Phase 10 Release & Acceptance
task: 10-A Release Preparation & Deployment Plan
status: Completed / Pending Approval
owner: Project Manager
created_date: 2026-07-26
updated_date: 2026-07-26
related_phase: Phase 10
---

# TASK 10-A Release Preparation & Deployment Plan

## 1. Release Objective

Phase 10 Release & Acceptance 的目标是完成 Violin ERP Lite 正式生产环境发布准备，确保系统在发布前具备可部署、可初始化、可验证、可回滚和可验收的条件。

本发布准备方案基于：

1. Phase 8 Application Development：Completed / Approved / Frozen；
2. Phase 9 Test Plan & System Integration：Completed / Approved；
3. Final Test Result：Pass with Known Issues；
4. Database / API / Permission：Approved；
5. Phase 7 Platform Foundation：Completed / Approved / Frozen。

本阶段不执行实际发布，不修改代码、Database Schema、Migration、API Contract 或 Permission Spec。

发布准备目标：

1. 明确生产部署环境；
2. 明确数据初始化边界；
3. 明确备份与恢复策略；
4. 明确正式发布流程；
5. 明确上线检查清单；
6. 明确回滚方案；
7. 形成 Release Ready 验收标准。

## 2. Deployment Environment

### Application

正式部署对象：

| Component | Purpose | Release Requirement |
| --- | --- | --- |
| API | 后端 API、认证、业务服务、平台能力 | 必须使用 Release Commit 构建，环境变量完整，健康检查通过 |
| Admin | PC 管理端 | 必须使用 Release Commit 构建，API Endpoint 指向生产 API |
| Mini Program | 微信小程序 | 必须使用 Release Commit 构建，生产 App 配置完成，提交微信侧审核前完成验收 |

部署要求：

1. API、Admin 与 Mini Program 必须来自同一个 Release Commit；
2. 发布前必须完成 `pnpm check`；
3. 生产环境不得使用本地开发密钥；
4. 生产日志必须开启结构化输出；
5. 发布包必须可追溯到 Git Commit SHA。

### Database

数据库对象：

1. PostgreSQL；
2. Prisma Schema 对应数据库结构；
3. Forward-only Migration；
4. 初始化 Seed / Data Initialization Script（如后续任务批准）。

Migration 要求：

1. 发布前确认所有历史 Migration 未被修改；
2. 发布前在 staging 环境执行完整 Migration 验证；
3. 生产执行 Migration 前必须完成数据库备份；
4. Migration 执行结果必须记录执行时间、操作者、Commit SHA 和结果；
5. Migration 失败必须停止发布，不得继续初始化数据或开放服务。

### Infrastructure

#### Redis

当前项目第一阶段不以 Redis 作为 Queue、Lock、Event 或业务事实来源。

Release 准备要求：

1. 如生产环境暂不启用 Redis，必须确认相关配置为空或禁用；
2. 如后续正式引入 Redis，必须经过 Architecture Decision 与部署审批；
3. Redis 不得替代数据库事实、库存事实、审计事实或权限事实。

#### Storage

对象存储用于：

1. Attachment；
2. Image；
3. Import File；
4. 业务相关上传文件。

发布要求：

1. 生产 Bucket / 存储目录独立；
2. 访问密钥使用生产 Secret 管理；
3. 禁止提交真实密钥到 Git；
4. 文件访问权限、私有路径和生命周期策略必须验证；
5. 发布前确认附件上传、下载、关联、删除生命周期可用。

#### Environment Variables

生产环境变量至少包含：

1. Database URL；
2. API Base URL；
3. Auth Secret / Session Secret；
4. Object Storage 配置；
5. Log Level；
6. Runtime Environment；
7. Mini Program 生产配置；
8. 外部服务占位配置（如暂不启用必须明确禁用）。

安全要求：

1. 不得在仓库提交 `.env` 真实文件；
2. 不得在日志输出 Secret、Token、Password、Database URL；
3. 环境变量应由部署平台 Secret 管理；
4. 发布前执行环境变量完整性检查。

## 3. Data Initialization Plan

### Master Data

生产初始化必须按以下顺序准备基础资料：

1. User；
2. Role；
3. Permission；
4. SKU；
5. Warehouse；
6. Platform；
7. Store。

建议初始化顺序：

```text
Permission
  ↓
Role
  ↓
User
  ↓
Warehouse
  ↓
Platform
  ↓
Store
  ↓
SKU
```

初始化规则：

1. Permission 必须来自正式 `ROLE_PERMISSION_SPEC.md`；
2. Role 必须经过项目负责人确认；
3. User 初始账号必须强制修改默认密码或通过正式认证流程创建；
4. SKU、Warehouse、Platform、Store 必须来自业务确认数据；
5. 禁止导入未经清洗的 Excel 历史数据；
6. 敏感字段初始化必须遵守 Field Permission。

### Inventory Initialization

库存初始化必须遵守库存事实边界：

```text
库存初始化单 / 初始化流程
  ↓
inventories
  ↓
inventory_transactions
```

确认：

1. 库存余额事实为 `inventories`；
2. 库存流水事实为 `inventory_transactions`；
3. 初始化库存必须同时形成余额与流水；
4. 初始化过程必须可审计；
5. 初始化过程必须可追溯到来源文件或人工确认记录。

禁止：

1. 直接修改库存余额；
2. 绕过 `inventory_transactions`；
3. 只写 `inventories` 不写流水；
4. 使用 Excel 文件替代库存事实；
5. 使用 Event、Job、Cache、Import Task 替代库存流水。

库存初始化建议流程：

```text
历史库存整理
  ↓
数据清洗
  ↓
业务确认
  ↓
试导入
  ↓
差异核对
  ↓
生产初始化
  ↓
库存余额与流水核对
```

## 4. Backup Strategy

### Database

发布前必须执行数据库备份。

Backup 要求：

1. 发布前完整备份 PostgreSQL；
2. 备份文件必须记录时间、环境、数据库版本、Commit SHA；
3. 备份文件必须加密或存放在受控位置；
4. 备份完成后必须验证文件可读取；
5. 备份结果必须进入发布记录。

Restore 要求：

1. 发布前至少在非生产环境验证恢复流程；
2. 恢复流程必须包含数据库连接、Schema、数据、索引和约束校验；
3. 如 Migration 后失败，优先按回滚决策执行 Database Restore；
4. Restore 操作必须由项目负责人批准。

### File

文件备份范围：

1. Attachment；
2. Image；
3. Import File；
4. 业务上传文件；
5. 发布相关导入原始文件。

File Backup 要求：

1. 发布前确认对象存储可访问；
2. 发布前确认关键目录或 Bucket 已备份；
3. 文件备份应保留路径、对象 Key、大小、Hash 或 ETag；
4. 文件恢复必须验证访问权限和业务关联关系；
5. 私有文件不得公开暴露。

## 5. Release Process

正式发布流程：

```text
代码冻结
  ↓
Backup
  ↓
Deploy
  ↓
Migration
  ↓
Initialize Data
  ↓
Health Check
  ↓
Business Check
  ↓
Release
```

### Step 1：代码冻结

1. 确认 Release Commit；
2. 确认 GitHub main 与 Release Commit 一致；
3. 确认无未提交变更；
4. 执行 `pnpm check`；
5. 记录版本号与 Commit SHA。

### Step 2：Backup

1. 执行数据库备份；
2. 执行文件备份；
3. 验证备份可读取；
4. 记录备份路径和时间。

### Step 3：Deploy

1. 部署 API；
2. 部署 Admin；
3. 构建 Mini Program；
4. 注入生产环境变量；
5. 验证服务启动。

### Step 4：Migration

1. 检查待执行 Migration；
2. 执行 Migration；
3. 验证 Schema；
4. 记录 Migration 结果。

### Step 5：Initialize Data

1. 初始化 Permission / Role / User；
2. 初始化基础资料；
3. 初始化库存；
4. 验证初始化结果；
5. 记录初始化来源和操作者。

### Step 6：Health Check

1. API Health；
2. Database Connectivity；
3. Storage Connectivity；
4. Authentication；
5. Logging；
6. Trace；
7. Background Job / Event 基础状态。

### Step 7：Business Check

1. 登录；
2. Master Data 查询；
3. Purchase / Production / Inspection / Inbound 查询；
4. Inventory 查询与流水查询；
5. Cross-border 查询；
6. Sales 查询；
7. Attachment 上传 / 关联 / 下载；
8. Permission 与 Field Permission 抽查。

### Step 8：Release

1. 项目负责人确认；
2. 开放正式访问；
3. 记录发布时间；
4. 进入上线观察期。

## 6. Production Checklist

### Technical

| Item | Check |
| --- | --- |
| Service | API、Admin、Mini Program 使用同一 Release Commit |
| Database | PostgreSQL 可连接，Migration 状态正确 |
| Redis | 未启用时明确禁用；启用前必须有正式审批 |
| Storage | Bucket / Path / Permission / Lifecycle 可用 |
| Log | 结构化日志开启，敏感信息不落日志 |
| Trace | `request_trace_id` 可贯通 |
| Audit | 关键操作写入 `audit_logs` |
| Backup | 数据库与文件备份完成并可恢复 |
| Environment Variables | 生产变量完整，Secret 未入库 |
| Health Check | 生产健康检查通过 |

### Business

| Item | Check |
| --- | --- |
| Login | 用户可登录，未授权访问被拒绝 |
| Master Data | Product、SKU、Warehouse、Platform、Store 可查询 |
| Purchase | 采购订单基础查询可用 |
| Production | 生产任务基础查询可用 |
| Inventory | 库存余额与流水可查询 |
| Cross-border | 跨境发货、海外库存相关查询可用 |
| Sales | 销售出库、销售退货、销售统计可查询 |
| Attachment | 附件上传、关联和下载可用 |
| Import | 导入任务基础能力可用 |

### Permission

| Item | Check |
| --- | --- |
| Role | 初始角色配置正确 |
| Scope | warehouse scope / store scope 生效 |
| Field | amount / cost / sensitive field 权限生效 |
| Admin | 管理员权限可用且受审计 |
| Read-only | 只读账号无法执行写操作 |
| Deny | 未授权动作返回权限错误 |

## 7. Rollback Plan

### Application Rollback

触发条件：

1. 服务启动失败；
2. Health Check 失败；
3. 关键 API 不可用；
4. 登录或核心查询不可用；
5. 发布后出现阻塞 Bug。

回滚步骤：

1. 停止新版本流量；
2. 恢复上一稳定版本应用；
3. 保持数据库状态不变或按数据库回滚决策处理；
4. 验证 Health Check；
5. 验证核心业务查询；
6. 记录回滚原因和时间。

### Database Restore

触发条件：

1. Migration 失败且无法安全重试；
2. 初始化数据严重错误；
3. 库存初始化结果不一致；
4. 数据库约束或数据完整性异常。

恢复步骤：

1. 停止业务写入；
2. 项目负责人批准 Restore；
3. 使用发布前备份恢复数据库；
4. 验证 Schema、约束、关键表和数据；
5. 验证库存余额与库存流水；
6. 重新执行 Health Check；
7. 输出 Restore 记录。

### Data Recovery

适用范围：

1. 初始化数据局部错误；
2. 文件对象缺失；
3. 附件关联异常；
4. 导入文件重复或遗漏；
5. 非结构性业务数据问题。

恢复原则：

1. 优先通过正式业务流程纠正；
2. 不直接修改库存余额；
3. 不绕过审计；
4. 必须保留恢复记录；
5. 涉及库存时必须形成 `inventory_transactions`。

## 8. Acceptance Criteria

Release Ready 条件：

1. Release Commit 已确认；
2. `pnpm check` 通过；
3. 生产环境变量准备完成；
4. 数据库备份与文件备份完成；
5. Migration 方案已确认；
6. Master Data 初始化方案已确认；
7. Inventory Initialization 方案已确认并遵守库存事实边界；
8. Health Check 清单已确认；
9. Business Check 清单已确认；
10. Permission Check 清单已确认；
11. Rollback Plan 已确认；
12. Database / API / Permission 无未批准变更；
13. 项目负责人批准进入正式发布执行。

本任务结论：

Release Preparation Plan：Completed / Pending Approval

当前未执行：

1. 实际生产部署；
2. 实际 Migration；
3. 实际数据初始化；
4. 实际发布；
5. 实际回滚。
