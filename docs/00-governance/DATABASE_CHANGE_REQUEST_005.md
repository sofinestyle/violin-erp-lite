---
document_name: Database Change Request 005：Attachment 状态与生命周期约束
project: Violin ERP Lite
version: 1.0
status: Proposed / Pending Approval
owner: Project Manager
created_date: 2026-07-25
updated_date: 2026-07-25
related_phase: Phase 3 / Phase 7
---

# Database Change Request 005：Attachment 状态与生命周期约束

> 本 Change Request 尚未批准。Database Logical Design 当前仍为 v2.1 Completed / Approved / Frozen；本文只提出 Attachment 状态与查询约束候选变更，不修改 DATABASE_SPEC、DATABASE_ENUM_SPEC、Prisma Schema、Migration 或 Mapping Audit。

## 1. 变更原因

Frozen `attachments.status` 是 `VARCHAR(50) NOT NULL`，但现有 Database v2.1 没有正式值域、默认值或 Check。Task 7.4 无法在不自创状态的情况下持久化上传、逻辑删除、物理删除尝试、失败和终止结果。

现有 `attachments`、`attachment_links` 已具备业务 Metadata、Storage Reference、敏感标记、受控多态关系和审计用户字段，不需要新增表或字段。

## 2. 依赖与版本建议

DCR-004 当前拟占用 Database v2.2，并为高风险写 API 提供通用 `idempotency_records`。本提案推荐顺序：

1. 先批准并正式同步 DCR-004，形成 Database v2.2；
2. 再批准本 DCR-005，形成 Database v2.3。

若 DCR-004 被拒绝或撤回，本提案必须重新基于 v2.1 审核，并可改为 Database v2.2；不得同时让两个独立提案占用同一正式版本。

## 3. 正式状态值域

建议 `attachments.status` 只允许：

```text
active
soft_deleted
pending_physical_delete
physical_delete_failed
physically_deleted
```

- 初始状态：`active`；
- 非终止状态：`active`、`soft_deleted`、`pending_physical_delete`、`physical_delete_failed`；
- 终止状态：`physically_deleted`；
- 只允许 `active` 下载和新增关联；
- 其他状态均不得下载、生成 URL 或新增关联；
- 状态变化只能由 Attachment Service 执行，客户端不得直接提交目标状态。

## 4. Check、Default 与 Index

### 4.1 Check

新增：

```sql
CONSTRAINT ck_attachments_status
CHECK (
  status IN (
    'active',
    'soft_deleted',
    'pending_physical_delete',
    'physical_delete_failed',
    'physically_deleted'
  )
)
```

不创建 PostgreSQL Enum，不修改 `DATABASE_ENUM_SPEC.md`。该状态只属于 `attachments` 局部值域。

### 4.2 Default

把 `attachments.status` 默认值设为：

```sql
DEFAULT 'active'
```

应用写入仍须显式映射正式状态；默认值只是数据库防御性基线。

### 4.3 Index

新增普通索引：

```sql
CREATE INDEX idx_attachments_status_updated_at
ON attachments (status, updated_at);
```

用途仅为定位 `pending_physical_delete`、`physical_delete_failed` 和终止墓碑，不形成后台 Worker 或自动清理授权。

## 5. 不新增字段的结论

不建议新增：

- `deleted_at`、`deleted_by`；
- `physical_deleted_at`；
- `delete_failure_reason`；
- `retention_until`；
- `storage_status`；
- `retry_count`。

原因：

1. 当前状态、一般审计字段及 `audit_logs` 足以表达本期动作与时间；
2. Task 7.3 Storage Metadata 已表达技术 Storage 生命周期；
3. 删除失败原因属于审计事实，不应复制为可变业务字段；
4. 当前没有批准的按时间自动清理 Worker，不能提前增加任务调度字段；
5. 若未来批准精确保留期限、自动重试或分布式清理，必须另行 DCR。

## 6. 状态迁移约束

数据库 Check 只约束值域；合法迁移由同一事务内锁定的 Attachment Repository 与 Service 执行：

| 当前状态 | 动作 | 目标状态 |
| --- | --- | --- |
| `active` | 通过零关联与保留裁决后逻辑删除 | `soft_deleted` |
| `soft_deleted` | 开始物理删除 | `pending_physical_delete` |
| `pending_physical_delete` | Storage 删除成功 | `physically_deleted` |
| `pending_physical_delete` | Storage 删除失败 | `physical_delete_failed` |
| `physical_delete_failed` | 同一删除动作安全重试 | `pending_physical_delete` |

本期不存在普通 API 恢复路径。事务补偿若在对外成功前把 Storage 从 Soft Delete 恢复，只能同步把未提交或已回滚的 Attachment 维持为 `active`，不能形成额外公开状态动作。

## 7. Attachment Link 一致性

现有唯一约束：

```text
attachment_id, object_type, object_id, object_item_id, attachment_category
```

继续保留。历史 Migration 的 `UNIQUE NULLS NOT DISTINCT` 已覆盖 `object_item_id IS NULL` 的重复关联竞争，无需修改。

数据库不新增跨多态对象外键。`object_type`、对象存在性、对象明细归属、Category 兼容性、对象状态和数据范围必须由 API CR-005 批准的封闭 Object Registry 在事务内验证。

## 8. 删除与墓碑

1. 仍有 `attachment_links` 时不得从 `active` 进入删除流程；
2. 证据保护由 API/Service 基于 Category 与对象状态裁决；
3. Storage Physical Delete 成功后不删除 `attachments` 行，而是保留 `physically_deleted` 墓碑；
4. 墓碑保留原业务 Metadata 和审计外键，但 API 不返回 Storage Reference；
5. `attachment_links` 必须在进入 Attachment Soft Delete 前已合法解除；
6. 物理删除失败必须保留记录，不允许直接删除数据库行掩盖失败。

## 9. Migration 要求

- 只新增 Forward Only Migration，不修改历史 Migration；
- DDL 前按状态分组审计现有 `attachments`；
- 无数据时直接增加 Default、Check 和 Index；
- 仅当现有值全部属于推荐集合时允许添加 Check；
- 存在未知值时 Migration 必须停止并输出脱敏计数，不得自动映射；
- 验证 5 个合法值均 PASS，任一其他值 FAIL；
- 验证默认插入得到 `active`；
- 验证索引存在且名称一致；
- 验证 `updated_at >= created_at`、文件大小及 Link 唯一约束继续生效；
- 使用正式 PostgreSQL 18.4 验证迁移和回滚前置审计。

## 10. Prisma 与 Mapping Audit

批准后独立同步：

- Prisma：`attachments.status` 保持 `String @db.VarChar(50)`，新增 `@default("active")`；
- Check 继续由 Migration 与数据库承载，Prisma 注释明确存在额外 Check；
- Mapping Audit 基于 DCR-004 已完成的 v2.2 预计值：

| 项目 | v2.2 预计 | v2.3 预计 | 变化 |
| --- | ---: | ---: | ---: |
| 表 | 63 | 63 | 0 |
| 字段 | 1176 | 1176 | 0 |
| 主键 | 63 | 63 | 0 |
| 唯一约束/唯一索引 | 79 | 79 | 0 |
| 外键 | 292 | 292 | 0 |
| 普通索引 | 97 | 98 | +1 |
| Check | 233 | 234 | +1 |
| PostgreSQL Enum | 2 | 2 | 0 |

若 DCR-004 未实施而本提案重新获准，则相对 v2.1 的变化为普通索引 `94 → 95`、Check `226 → 227`，其他数量保持不变。

## 11. Seed 影响

当前不要求新增 Attachment Seed 或真实文件。若既有或未来开发 Seed 创建附件：

- `status` 必须为 `active` 或省略以使用默认值；
- 不得写入真实业务文件、真实凭证或真实个人数据；
- 不得 Seed `physical_delete_failed` 等运维异常状态冒充真实历史。

## 12. 不影响范围

本提案不新增表、字段、API、DTO、权限、角色、业务模块或 Worker；不修改 Storage Metadata、Attachment Link 唯一范围、业务对象状态、库存或审计表。批准前不修改任何 Frozen SSOT、Schema、Migration、Mapping Audit、Seed 或代码。

## 13. 批准 Gate

项目负责人需确认：

1. 5 个 Attachment 状态及迁移；
2. `physically_deleted` 墓碑保留原则；
3. 1 个 Check、1 个普通索引和 `active` 默认值；
4. 不新增字段；
5. DCR-004 → DCR-005 的版本顺序；
6. API CR-005 的状态动作与删除规则。

当前状态：**Proposed / Pending Approval**。
