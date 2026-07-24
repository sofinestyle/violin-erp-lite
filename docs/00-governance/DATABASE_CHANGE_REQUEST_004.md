---
document_name: Database Change Request 004：Import 文件去重与通用幂等持久化
project: Violin ERP Lite
version: 1.0
status: Proposed / Pending Approval
owner: Project Manager
created_date: 2026-07-24
updated_date: 2026-07-24
related_phase: Phase 3 / Phase 8
---

# Database Change Request 004：Import 文件去重与通用幂等持久化

> 本 Change Request 尚未批准。Database Logical Design 当前仍为 v2.1 Completed / Approved / Frozen；本文只提出 v2.2 候选变更，不修改现有 Database SSOT、Schema、Migration 或 Mapping Audit。

## 1. 变更原因

Frozen API v1.3 要求 IMP-001 按文件内容摘要、导入类型和目标范围判重，并要求高风险写 API 支持可靠幂等。现有数据库没有 `import_tasks.file_checksum`、Import 原子重复约束或通用持久化幂等对象，无法跨进程和并发请求实现正式契约。

技术证据及边界见 `IMPORT_FILE_DEDUPLICATION_AND_IDEMPOTENCY_PERSISTENCE_COMPLETION_001.md`。

## 2. 建议版本

Database Logical Design：**v2.1 → v2.2**。

这是结构性变更：新增 1 表、16 字段、1 主键、3 项唯一、3 个普通索引及 7 项 Check。不得以补丁代码代替数据库正式同步。

## 3. `import_tasks.file_checksum`

新增：

```text
file_checksum VARCHAR(128) NOT NULL
```

- 服务端对原始上传内容计算 SHA-256；
- 只保存 64 位小写十六进制；
- 不接受客户端摘要作为正式值；
- 不表示 Storage Key、附件关系或文件内容；
- Check：`ck_import_tasks_file_checksum_format`。

历史行必须在 Migration DDL 前审计。只有能从受信存储引用读取原文件并重新计算时才可回填；缺失、不可读或内容不确定时 Migration 停止并输出脱敏计数，不得使用文件名、引用或随机值伪造。

## 4. Import 目标与唯一约束

现有数据库允许 `warehouse_id/store_id` 双空或双非空，但 Approved IMP-001 只批准适用仓库或店铺，未发现第三目标或双目标 Import。建议新增：

```text
ck_import_tasks_target_exactly_one
```

语义为 `(warehouse_id IS NOT NULL) <> (store_id IS NOT NULL)`。

建议新增：

```text
uq_import_tasks_file_checksum_import_type_warehouse
  UNIQUE (file_checksum, import_type, warehouse_id)
  WHERE warehouse_id IS NOT NULL AND store_id IS NULL

uq_import_tasks_file_checksum_import_type_store
  UNIQUE (file_checksum, import_type, store_id)
  WHERE store_id IS NOT NULL AND warehouse_id IS NULL
```

并发唯一冲突映射既有 `IMPORT_DUPLICATE_FILE`。不得以“先查后写”为唯一保护，也不得为重复请求插入第二条 Import Task。

## 5. `idempotency_records`

### 5.1 字段

| 字段 | 类型 | 约束 |
| --- | --- | --- |
| `id` | UUID | PK，`uuidv7()` |
| `scope_code` | VARCHAR(300) | NOT NULL |
| `idempotency_key_hash` | VARCHAR(128) | NOT NULL |
| `request_hash` | VARCHAR(128) | NOT NULL |
| `status` | VARCHAR(50) | NOT NULL |
| `response_http_status` | INTEGER | NULL |
| `response_body` | JSONB | NULL |
| `resource_type` | VARCHAR(50) | NULL |
| `resource_id` | UUID | NULL |
| `request_trace_id` | UUID | NOT NULL |
| `locked_until` | TIMESTAMPTZ | NULL |
| `completed_at` | TIMESTAMPTZ | NULL |
| `expires_at` | TIMESTAMPTZ | NOT NULL |
| `created_at` | TIMESTAMPTZ | NOT NULL，CURRENT_TIMESTAMP |
| `updated_at` | TIMESTAMPTZ | NOT NULL，CURRENT_TIMESTAMP |

`resource_id` 为多态技术关联，不设外键；`scope_code` 内的认证主体也不再增加用户外键。该表不建立平行业务对象，不允许客户端直接访问。

### 5.2 唯一、索引与 Check

- 唯一：`uq_idempotency_records_scope_code_key_hash (scope_code, idempotency_key_hash)`；
- 索引：`idx_idempotency_records_status_locked_until (status, locked_until)`；
- 索引：`idx_idempotency_records_expires_at (expires_at)`；
- 索引：`idx_idempotency_records_resource_created_at (resource_type, resource_id, created_at)`；
- Check：`ck_idempotency_records_status`，仅 `processing/completed/failed`；
- Check：`ck_idempotency_records_hash_format`，两个 Hash 均为 64 位小写十六进制；
- Check：`ck_idempotency_records_http_status`，为空或 100—599；
- Check：`ck_idempotency_records_lifecycle`，processing 无终态字段且有租约；completed/failed 有 HTTP 状态和完成时间、无活动租约；资源类型/ID 成组；
- Check：`ck_idempotency_records_time_range`，更新时间、完成时间、租约和过期时间顺序合法。

不新增 PostgreSQL Enum，状态保持表内局部代码。

## 6. Hash、Scope 与安全

- `idempotency_key_hash`：服务端密钥参与的 HMAC-SHA-256；不保存/记录原始 Key；
- `scope_code`：`subject:user:{authenticatedUserId}|action:{apiId}`；无 API 编号时才使用方法与规范路径模板；
- `request_hash`：规范化业务请求的 SHA-256，覆盖动作、Path、业务 Query、Body、文件摘要、仓库/店铺目标和认证 Scope；
- 仓库/店铺进入 Request Hash，不进入当前 scope；当前项目没有租户对象；
- Response 只保存可安全重放 DTO，不保存 Token、Cookie、SQL、堆栈、文件内容或敏感原始数据。

## 7. 状态、租约与清理

1. 新请求事务内原子插入 `processing`；
2. 唯一冲突后锁定并比较 Request Hash；
3. 不同 Hash 返回既有 409；
4. `completed/failed` 重放首次安全结果；
5. 有效 processing 返回 API CR-004 批准的稳定冲突；
6. 过期 processing 先核对业务结果，再以条件更新回收，不得盲目重做；
7. 可确定业务失败写 `failed`，同 Key 在过期前重放首次失败，不允许同 Key 重试；
8. 结果不确定时保持 processing，待租约恢复对账；
9. 只清理已过期且不承担业务/审计事实的终态记录；processing 不直接删除；
10. 保留期、租约时长与响应大小上限作为批准后技术配置固化。

## 8. 文件补偿边界

现有 Adapter 只支持 `store/delete`，批准后实施顺序为：校验及 checksum → 幂等认领 → store → 数据库事务及唯一裁决 → 写幂等终态；数据库失败调用 delete。删除失败进入可审计清理机制，孤儿扫描只清理超过安全窗口且没有数据库 `file_reference` 引用的对象。

该流程是补偿一致性，不是文件系统与 PostgreSQL 的 ACID 事务。

## 9. Migration 要求

- 只新增 Forward Only Migration，不修改历史 Migration；
- DDL 前审计历史摘要回填能力和目标字段双空/双非空数量；
- 任一无法安全回填的摘要或不符合 XOR 的目标行都阻断，不自动改写；
- 先回填并验证 `file_checksum`，再设 NOT NULL/Check/唯一索引；
- 新表、Check 与索引使用正式显式命名；
- 验证合法/非法 Hash、状态、生命周期、时间范围；
- 用真实 PostgreSQL 验证并发相同文件仅一个成功、同 scope/key 仅一个认领；
- Prisma Schema 与 Mapping Audit 必须在批准后的独立同步任务中一致更新。

## 10. Mapping Audit 预计变化

| 项目 | v2.1 | v2.2 预计 | 变化 |
| --- | ---: | ---: | ---: |
| 表 | 62 | 63 | +1 |
| 字段 | 1160 | 1176 | +16 |
| 主键 | 62 | 63 | +1 |
| 唯一约束/唯一索引 | 76 | 79 | +3 |
| 外键 | 292 | 292 | 0 |
| 普通索引 | 94 | 97 | +3 |
| Check | 226 | 233 | +7 |
| PostgreSQL Enum | 2 | 2 | 0 |

特殊外键 123、通用用户外键 169 均保持不变。

## 11. 不影响范围

本提案不新增 API、DTO、权限、角色、业务状态、业务功能、Attachment 关系或 Storage SSOT；不修改库存规则、页面、Mini Program、Dashboard、认证会话或现有业务表含义。批准前不修改 DATABASE_SPEC、Prisma Schema、Migration、Mapping Audit 或代码。

## 12. 批准依赖

项目负责人需同时确认：

1. v2.2 结构、预计 Mapping 数量；
2. Import 目标 XOR 是否为正式约束；
3. 重复请求不创建第二条 `duplicate_file` 任务；
4. 历史摘要回填阻断规则；
5. 幂等 Hash、Scope、租约、失败重放与清理原则；
6. API CR-004 对外行为。

批准后必须先独立同步并冻结 Database v2.2，再实施业务代码。当前状态：**Proposed / Pending Approval**。
