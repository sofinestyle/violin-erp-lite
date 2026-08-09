---
document_name: CR-003 自动编码数据库变更
project: Violin ERP Lite
cr_id: CR-003
type: Database Change
status: Pending Approval
owner: Project Manager
created_date: 2026-08-09
related_issue: UAT-009
---

# Change Request

编号：

CR-003

类型：

Database Change

主题：

Code Generation Storage

## 当前问题

UAT-009 自动编码要求服务端生成唯一业务编码。

如果仅在应用层查询当前最大编码后加一，会存在：

- 并发重复；
- 多实例部署冲突；
- 事务回滚后序号不一致；
- 编码规则无法集中治理；
- 历史数据兼容困难。

因此需要正式数据库变更设计，用于保存编码规则和并发安全序列。

## 建议新增对象

### code_generation_rules

字段：

- `id`
- `code_type`
- `prefix`
- `format`
- `enabled`
- `created_at`
- `updated_at`

用途：

- 保存编码类型；
- 保存编码前缀；
- 保存编码格式；
- 控制规则启用状态；
- 支持未来编码规则调整。

### code_sequences

字段：

- `id`
- `code_type`
- `current_value`
- `lock_version`
- `updated_at`

用途：

- 保存当前序列值；
- 支持并发安全递增；
- 支持乐观锁或事务锁；
- 支持多实例部署。

## 并发安全要求

禁止：

- `max(code) + 1`
- 前端生成正式编码；
- 无锁内存计数器；
- 时间戳直接作为正式编码。

支持：

- 数据库事务；
- 行级锁；
- 乐观锁版本；
- 唯一约束兜底；
- 多实例部署。

## Database SSOT 影响

审批通过后需要更新：

- `docs/03-data/DATABASE_SPEC.md`
- `prisma/schema.prisma`
- 新增 forward-only migration
- 数据库映射审计文档

本 CR 文件创建阶段不修改上述 Frozen 内容。

## 数据兼容

- 已存在编码不自动覆盖；
- 历史空编码需单独制定补码策略；
- 导入外部编码需与唯一约束和格式校验一致；
- 编码生成失败不得创建半成品业务数据。

## 验收标准

- 并发创建不重复；
- 数据一致；
- 多实例部署下编码仍唯一；
- 编码规则可启用 / 停用；
- 序列更新在事务中完成；
- 自动编码失败时业务创建回滚；
- 不产生与现有业务表平行的数据事实来源。

## 审批结论

当前状态：

Pending Approval

审批通过后，方可进入 Database SSOT、Prisma Schema 和 Migration 实施阶段。
