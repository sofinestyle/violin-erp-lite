---
document_name: Task 10-B UAT Production Readiness
project: Violin ERP Lite
phase: Phase 10 Release & Acceptance
task: 10-B User Acceptance Test & Production Readiness
status: Completed / Pending Approval
owner: Project Manager
created_date: 2026-07-26
updated_date: 2026-07-26
related_phase: Phase 10
---

# Task 10-B User Acceptance Test & Production Readiness

## 1. UAT Objective

本阶段目标是制定用户验收测试（User Acceptance Test, UAT）与生产就绪评估方案，验证 Violin ERP Lite 是否满足正式上线前的业务使用要求。

本阶段只做验收方案与生产就绪评估设计，不执行生产发布，不修改代码、数据库、API、权限或业务规则。

UAT 重点确认：

- Phase 8 已完成的业务闭环可以被业务用户按真实场景使用；
- Phase 9 系统集成测试结果可被业务验收承接；
- 角色权限、数据范围和字段权限满足上线使用要求；
- 初始数据准备方式符合正式事实来源边界；
- 生产环境技术、业务、备份和回滚准备项可检查、可确认、可验收；
- 所有上线前问题有明确分级、处理和验证流程。

验收目标结论为：

Production Ready

前提是本文件定义的验收标准全部满足，并由项目负责人完成最终上线批准。

## 2. Business UAT Plan

### Master Data

验收范围：

- 产品分类；
- 品牌；
- 产品；
- SKU；
- 供应商；
- 生产厂家；
- 仓库；
- 平台；
- 店铺。

验收内容：

- 列表、详情、创建、编辑、启用、停用操作可按权限执行；
- 唯一性校验、启停状态、历史数据保护符合业务规则；
- 产品附件仅按已批准 Attachment Framework 关联；
- 供应商、生产厂家等敏感字段按字段权限展示；
- 审计、Trace、权限校验正常记录和生效。

通过标准：

- 主数据可作为采购、生产、库存、跨境、销售业务引用基础；
- 不存在未授权访问、字段越权展示或平行主数据来源。

### Procurement

验收范围：

- 采购订单；
- 采购明细；
- 采购状态流转；
- 采购付款辅助记录；
- 采购附件。

验收内容：

- 采购订单可创建、编辑、提交、审核、驳回、反审核、取消；
- 供应商、SKU、数量、金额、交期校验有效；
- 草稿状态允许编辑，已审核单据禁止直接修改；
- 采购过程不修改库存；
- 采购订单可作为采购来源验收的上游对象；
- 幂等、审计和附件关联符合平台规则。

通过标准：

- 采购订单可以进入后续验收流程；
- 采购模块不直接写入 `inventories` 或 `inventory_transactions`。

### Production

验收范围：

- 生产任务；
- 生产明细；
- 生产进度；
- 分批完工；
- 生产附件。

验收内容：

- 生产任务可创建、编辑、提交、审核、开始生产、取消、作废；
- 生产厂家、SKU、数量、金额、计划日期校验有效；
- 生产进度记录不替代完工记录、验收或入库；
- 分批完工可追踪完工数量和日期；
- 生产过程不直接修改库存；
- 审计、Trace、幂等和附件关联正常。

通过标准：

- 生产任务可以进入生产来源验收流程；
- 生产模块不直接写入库存事实。

### Inspection

验收范围：

- 采购来源验收；
- 生产来源验收；
- 验收明细；
- 验收确认；
- 验收附件。

验收内容：

- 一张验收单只能关联一种来源；
- 禁止同时关联采购与生产来源；
- 来源单据存在且状态合法；
- 验收数量、合格数量、不合格数量、待处理数量平衡；
- 验收确认后只产生可入库资格；
- 验收不直接创建入库单，不直接修改库存；
- 审计、权限、Trace、幂等和附件关联正常。

通过标准：

- 验收结果可作为入库来源；
- 验收模块不直接写入库存事实。

### Inventory

验收范围：

- 当前库存查询；
- SKU库存查询；
- 仓库库存查询；
- 库存流水查询；
- 出库；
- 库存调整；
- 库存统计。

验收内容：

- 库存查询结果来自 `inventories`；
- 库存流水来自 `inventory_transactions`；
- 可用库存使用系统字段，不由页面自行计算；
- 入库确认、出库确认、调整执行均通过事务更新库存与流水；
- 防负库存生效；
- 仓库数据范围控制生效；
- 金额、成本字段受字段权限控制；
- 审计、Trace、幂等和权限校验正常。

通过标准：

- `inventories` 与 `inventory_transactions` 是唯一库存事实来源；
- 所有库存变化均有对应库存流水；
- 采购、生产、验收、事件、Job、缓存均不能成为库存事实来源。

### Cross-border

验收范围：

- 跨境发货；
- 在途库存；
- 海外库存导入；
- 平台 / 店铺库存视图；
- 补货建议。

验收内容：

- 跨境发货确认后才发生库存变化；
- 海外库存导入通过 Import Task、校验、匹配、执行形成库存变化；
- 来源追踪可从海外库存追溯到导入任务、匹配记录、跨境发货和库存流水；
- 平台 / 店铺视图为查询视图，不创建平台库存事实表；
- 补货建议为只读计算，不自动创建采购、生产或发货；
- 权限、仓库范围、审计、Trace、幂等正常。

通过标准：

- 跨境业务库存变化仍以 `inventories` 与 `inventory_transactions` 为事实；
- 平台视图、导入任务、补货建议均不替代库存事实。

### Sales

验收范围：

- 销售出库集成；
- 销售退货；
- 平台 / 店铺销售视图；
- 销售统计。

验收内容：

- 销售来源通过 Outbound Order 完成出库；
- Outbound Confirm 是销售库存扣减唯一边界；
- 销售退货必须经过退货处理与退货入库确认后形成库存流水；
- 销售统计来自已批准业务数据和库存流水；
- 平台 / 店铺销售视图不成为库存事实；
- 权限、字段权限、审计、Trace、幂等正常。

通过标准：

- 销售流程库存变化准确；
- 销售统计可追溯；
- 销售来源、平台视图和统计结果不替代库存事实。

## 3. User Role Test

UAT 需要按真实用户角色验证权限、数据范围和字段权限。

| Role | Test Focus | Permission | Data Scope | Field Permission |
|---|---|---|---|---|
| Admin | 全模块配置、审核、查询、异常确认 | 应具备管理员授权范围内权限 | 可查看管理范围内全部数据 | 可查看被授权敏感字段 |
| Business | 主数据、采购、生产、销售日常操作 | 仅允许业务岗位相关操作 | 仅访问授权业务数据 | 不应默认查看成本、金额、敏感联系信息 |
| Warehouse | 库存、入库、出库、调整、仓库查询 | 仅允许仓库相关操作 | 必须受 warehouse scope 限制 | 成本、金额字段按授权展示 |
| Purchase | 供应商、采购订单、采购附件、采购查询 | 仅允许采购相关操作 | 仅访问授权采购数据 | 供应商敏感字段按授权展示 |
| Production | 生产厂家、生产任务、进度、完工、生产查询 | 仅允许生产相关操作 | 仅访问授权生产数据 | 生产厂家敏感字段按授权展示 |
| Sales | 销售出库、销售退货、平台 / 店铺销售查询 | 仅允许销售相关操作 | 仅访问授权销售、店铺、仓库数据 | 金额、成本字段按授权展示 |

验证要求：

- 未授权角色不能访问对应页面和 API；
- 无权限的状态操作必须被拒绝；
- 仓库、平台、店铺等数据范围必须过滤；
- 字段权限必须对金额、成本、供应商敏感信息、生产厂家敏感信息生效；
- 权限拒绝需要形成可追踪记录。

## 4. Initial Data Plan

上线前初始数据必须按正式事实来源初始化，不得通过临时表、Excel 文件或脚本结果替代系统数据。

### 初始化对象

必须准备：

- User；
- Role；
- Permission；
- SKU；
- Warehouse；
- Platform；
- Store。

建议初始化顺序：

1. Permission；
2. Role；
3. User；
4. Warehouse；
5. Platform；
6. Store；
7. SKU；
8. Inventory。

### 库存初始化

库存初始化必须同时形成：

- `inventories`；
- `inventory_transactions`。

要求：

- 初始库存余额必须可追溯；
- 每一笔初始化库存必须有对应库存流水；
- 初始化批次、操作人、时间、来源说明需要记录；
- 初始化完成后必须进行 SKU、仓库、总量和流水对账。

禁止：

- 直接修改库存余额且不写库存流水；
- 使用 Excel 作为上线后的库存事实来源；
- 绕过库存事务边界；
- 使用 Event、Job、Cache、统计结果替代库存事实。

### 初始数据确认流程

流程：

业务整理

↓

数据清洗

↓

业务确认

↓

测试环境试导

↓

差异核对

↓

生产初始化

↓

上线前复核

## 5. Production Readiness Checklist

### Technical Checklist

| Area | Readiness Check | Result |
|---|---|---|
| Application | API、Admin、Mini Program 使用同一批准发布版本 | Pending UAT |
| Database | PostgreSQL 可用，Migration 状态已确认 | Pending UAT |
| Storage | 附件、图片、导入文件存储可用且权限正确 | Pending UAT |
| Backup | 数据库备份、文件备份、恢复演练方案已确认 | Pending UAT |
| Log | 结构化日志、错误日志、审计日志、Trace 可查询 | Pending UAT |
| Environment | 环境变量、密钥、存储配置、数据库连接配置完整 | Pending UAT |
| Health | liveness、readiness、数据库、Worker、Scheduler、Event Runtime 健康状态可检查 | Pending UAT |

### Business Checklist

| Area | Readiness Check | Result |
|---|---|---|
| Login | 用户可登录，认证、会话、权限拒绝正常 | Pending UAT |
| Master Data | 产品、SKU、供应商、厂家、仓库、平台、店铺可用 | Pending UAT |
| Purchase | 采购订单到验收前置流程可用 | Pending UAT |
| Production | 生产任务、进度、完工到验收前置流程可用 | Pending UAT |
| Inventory | 入库、库存、出库、调整、统计可用且库存事实一致 | Pending UAT |
| Cross-border | 跨境发货、海外库存导入、平台 / 店铺视图、补货建议可用 | Pending UAT |
| Sales | 销售出库、销售退货、销售统计可用 | Pending UAT |

### Permission Checklist

| Area | Readiness Check | Result |
|---|---|---|
| Role | Admin、Business、Warehouse、Purchase、Production、Sales 角色配置完成 | Pending UAT |
| Permission | 模块权限、操作权限、附件权限配置完成 | Pending UAT |
| Data Scope | 仓库、平台、店铺等数据范围过滤生效 | Pending UAT |
| Field Permission | 金额、成本、供应商敏感字段、生产厂家敏感字段按授权展示 | Pending UAT |

## 6. UAT Issue Management

### Issue Severity

| Severity | Definition | Release Decision |
|---|---|---|
| Blocker | 阻断上线，核心链路不可用，库存事实错误，权限严重越权，数据丢失或不可恢复 | 必须修复并验证后才能上线 |
| Critical | 关键模块不可用或关键结果明显错误，但未造成不可恢复数据损坏 | 原则上必须修复后上线 |
| Major | 重要功能受影响，但存在可接受临时处理方式 | 需项目负责人确认修复或延期 |
| Minor | 文案、展示、低风险体验问题，不影响核心业务闭环 | 可记录为已知问题并延期处理 |

### Issue Flow

处理流程：

发现

↓

记录

↓

分级

↓

指派

↓

修复

↓

验证

↓

回归

↓

关闭

记录要求：

- Issue ID；
- 发现人；
- 发现时间；
- 影响模块；
- 严重级别；
- 复现步骤；
- 期望结果；
- 实际结果；
- 修复负责人；
- 验证结果；
- 关闭结论。

## 7. Acceptance Criteria

系统达到以下条件时，可判定为 Production Ready：

1. Master Data、Procurement、Production、Inspection、Inventory、Cross-border、Sales 的 UAT 主流程通过；
2. Blocker 数量为 0；
3. Critical 数量为 0；
4. Major 问题已修复，或经项目负责人批准作为非阻塞已知问题；
5. Minor 问题已记录并有后续处理计划；
6. 初始数据方案已完成业务确认；
7. 库存初始化严格通过 `inventories` 与 `inventory_transactions`，并完成对账；
8. 用户角色、权限、数据范围、字段权限验证通过；
9. 生产技术检查项、业务检查项、权限检查项均通过；
10. 备份、恢复、回滚方案已确认；
11. Database、API、Permission 均无未批准变更；
12. 项目负责人批准进入正式发布。

本阶段结论：

Task 10-B User Acceptance Test & Production Readiness：

Completed / Pending Approval

