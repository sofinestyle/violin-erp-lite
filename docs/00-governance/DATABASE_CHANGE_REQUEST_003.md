---
document_name: Database Change Request 003：导入状态代码值域约束
project: Violin ERP Lite
version: 1.1
status: Completed / Approved
owner: Project Manager
created_date: 2026-07-24
updated_date: 2026-07-24
related_phase: Phase 3 / Phase 7
---

# Database Change Request 003：导入状态代码值域约束

> 项目负责人已于 2026-07-24 批准本 Change Request。Database Logical Design v2.1、独立前向 Migration、Mapping Audit 和真实 PostgreSQL 验证完成后，本变更已正式生效并冻结。

## 1. 变更原因

四个现有必填 `VARCHAR(50)` 状态字段没有值域 Check，无法以数据库约束阻止未批准代码：

- `import_tasks.status`；
- `import_task_items.validation_status`；
- `import_task_items.execution_status`；
- `shipment_import_matches.match_status`。

完整语义与流转见 `IMPORT_STATUS_CODE_COMPLETION_001.md`。

## 2. 正式 Check

| Check | 字段 | 允许值 |
| --- | --- | --- |
| `ck_import_tasks_status` | `import_tasks.status` | `pending_validation`, `validation_failed`, `pending_confirmation`, `importing`, `partially_succeeded`, `succeeded`, `cancelled`, `duplicate_file`, `failed` |
| `ck_import_task_items_validation_status` | `import_task_items.validation_status` | `pending`, `valid`, `warning`, `invalid` |
| `ck_import_task_items_execution_status` | `import_task_items.execution_status` | `pending`, `processing`, `succeeded`, `failed`, `skipped` |
| `ck_shipment_import_matches_match_status` | `shipment_import_matches.match_status` | `pending`, `partially_matched`, `matched` |

这些代码作为表内 Check 局部代码，不新增 PostgreSQL Enum，不扩展 `DATABASE_ENUM_SPEC.md` 当前两个正式枚举。

## 3. 默认值与初始写入

四个字段均不新增数据库默认值。正式 Service 必须显式写入：

- 创建导入任务：`pending_validation`；
- 创建导入明细：Validation `pending`、Execution `pending`；
- 创建具有唯一候选目标的匹配记录：`pending`。

“待上传”是 IMP-001 提交前页面状态，不写入数据库。

## 4. 结构影响

- 新增表：0；
- 新增字段：0；
- 字段类型或非空变化：0；
- 新增主键、唯一约束、外键、普通索引：0；
- 新增 PostgreSQL Enum：0；
- 新增 Check：4。

`unmatched` 和 `conflict` 不加入匹配状态，因为匹配表的目标单据和明细外键必填，无法在不伪造目标事实的情况下持久化这两类结果。

## 5. 历史数据与 Migration

正式独立前向 Migration 按以下规则执行：

1. 查询四个字段的 distinct 值及数量；
2. 如果存在不在获批集合中的值，Migration 停止，不自动改写；
3. 由项目负责人另行批准精确数据映射或清理脚本；
4. 无未知值后添加四项 Check 并立即验证；
5. 验证合法值成功、非法值拒绝及现有外键/计数 Check 不受影响。

当前 Seed 不创建导入数据，不代表所有现有部署数据库均为空。

## 6. Mapping Audit 正式变化

| 项目 | v2.0 | v2.1 | 变化 |
| --- | ---: | ---: | ---: |
| 表 | 62 | 62 | 0 |
| 字段 | 1160 | 1160 | 0 |
| 主键 | 62 | 62 | 0 |
| 唯一约束 | 76 | 76 | 0 |
| 外键 | 292 | 292 | 0 |
| 普通索引 | 94 | 94 | 0 |
| Check | 222 | 226 | +4 |
| PostgreSQL Enum | 2 | 2 | 0 |

Database Logical Design 正式升级为 **v2.1**，原因是既有字段的正式值域与数据库可执行约束发生兼容性收紧，不新增结构对象。

## 7. 回滚方式

- 尚未产生依赖新代码的数据时，可用新的前向回滚 Migration 删除四项 Check；
- 已产生正式数据后，不得回退为无约束状态或破坏性改写历史；
- 如需缩减/重命名代码集合，必须再次提交 DCR，并先完成获批数据迁移；
- 不修改或重写既有 Migration。

## 8. 不影响范围

本变更不修改表、字段、默认值、非空、主键、唯一约束、外键、索引、枚举、库存规则、API、权限、页面、业务代码或测试。

## 9. 完成与冻结结果

1. 项目负责人已批准四项值域 Check、代码集合、无默认值和未知历史值阻断规则；
2. Database Logical Design v2.1 已同步为 Completed / Approved / Frozen；
3. 正式 Migration 为 `20260724090000_add_import_status_value_checks`；
4. Migration 在写入 DDL 前审计四个字段，未知值只输出脱敏行数与 distinct 数量并停止，不自动映射；
5. Mapping Audit 保持 62 表、1160 字段、62 主键、76 唯一约束、292 外键、94 普通索引和 2 个 PostgreSQL Enum，Check 由 222 增至 226；
6. 隔离 PostgreSQL 18 验证全部历史 Migration 可应用且状态最新，四组全部批准值可写入，每个字段的非法值均被对应 Check 拒绝；
7. 未修改现有合法数据，未删除、转换或回填数据，未修改历史 Migration；
8. Database Change Request 003 最终状态为 Completed / Approved，Database Logical Design v2.1 已冻结。
