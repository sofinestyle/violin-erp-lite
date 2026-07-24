---
document_name: Import File Deduplication and Idempotency Persistence Completion 001
project: Violin ERP Lite
version: 1.0
status: Proposed / Pending Approval
owner: Project Manager
created_date: 2026-07-24
updated_date: 2026-07-24
related_phase: Phase 3 / Phase 5 / Phase 7
---

# Import File Deduplication and Idempotency Persistence Completion 001

> 本文件只记录技术审计和待批准方案，不构成数据库或 API 变更批准。Database Logical Design 仍为 v2.1，API Master Specification 仍为 v1.3；Batch 7.6-C1 在正式变更完成前保持暂停。

## 1. 冲突背景

Batch 7.6-C1 在实现 `IMP-001`—`IMP-015` 前发现三个无法在现有 Frozen SSOT 下可靠完成的持久化缺口：

1. 上传层已经计算文件内容摘要，但 `import_tasks` 没有保存 Import 原始文件摘要的字段；
2. 当前没有可供所有写 API 共用、跨进程生效的幂等记录；
3. 当前没有数据库原子唯一约束裁决相同文件、导入类型和目标范围的并发重复创建。

API v1.3 要求识别重复文件以及同幂等键重放，但不能以无正式数据库对象的内存状态、文件系统元数据或“先查后写”实现这些业务事实。因此本轮停止 C1 代码实现，仅提出 DCR-004 与 API CR-004。

## 2. 现有实现审计

| 编号 | 审计结论 | 证据 |
| --- | --- | --- |
| A-001 | `ValidatedUpload` 对受控上传内容计算 SHA-256，输出 64 位小写十六进制 `checksum` | `packages/api/src/upload/upload.ts` |
| A-002 | `UploadStorageAdapter` 当前只定义 `store` 与 `delete` | `packages/api/src/upload/upload.ts` |
| A-003 | Local Storage 用随机 UUID Storage Key 保存二进制，不保存可查询业务元数据或 sidecar | `packages/api/src/upload/local-storage.ts` |
| A-004 | `import_tasks` 有 `file_name`、`file_reference`，没有 `file_checksum` | `prisma/schema.prisma`、全部 Migration、`prisma/mapping-audit.json` |
| A-005 | 当前没有通用持久化 Idempotency Record | Prisma Schema、全部 Migration、Route / Service / Repository 公共基础全文检索 |
| A-006 | 认证幂等存储是认证流程专用的进程内 `Map`，不能作为业务 API 的跨进程事实来源 | `packages/api/src/auth/auth-flow.ts` |
| A-007 | `attachments.checksum` 是附件文件元数据，不是 Import Task 原始文件摘要事实 | `DATABASE_SPEC.md`、`prisma/schema.prisma` |
| A-008 | Import 与 Attachment 没有获批的强制关系；`attachment_links.object_type` 未批准 `import_task` | Database/API SSOT、Schema 与 Migration |
| A-009 | 当前 workspace 未发现 Redis 依赖、连接配置或已批准的 Redis 正式用途 | 根目录及 workspace `package.json`、源码与环境变量模板全文检索 |
| A-010 | `import_tasks.warehouse_id` 与 `store_id` 均可空，现有数据库没有两者恰好一个的 Check | Schema 与全部 Migration |

Phase 5 的 IMP-001 规定业务字段使用“适用的 `warehouseId` 或 `storeId`”，仓库类与店铺类分别校验范围；未发现同时使用两个目标、两个目标均为空或第三类目标的获批 Import。由于当前物理结构仍允许这些组合，本提案不把排他约束描述为既有事实，而把它列为 DCR-004 待批准项。

## 3. 为什么 Storage Adapter 单独不足

Storage Adapter 的正式职责是二进制对象存取。随机 Storage Key 不能证明内容相同；文件系统没有 PostgreSQL 唯一约束、业务事务和统一审计能力；多实例也不能依赖单机目录完成原子竞争。

可以在后续实现中兼容增加 `exists`、`read`、`metadata`，Local Storage 也可用 sidecar 支撑运维校验，但这些信息不能成为 Import 判重或 API 幂等的唯一 SSOT。业务摘要、唯一裁决和重放结果必须由 PostgreSQL 持久化。

## 4. 为什么不能直接复用 `attachments.checksum`

- Attachment 与 Import 是不同业务事实；
- Import 文件没有获批要求先创建 Attachment；
- 强制复用会隐式新增 Import—Attachment 关系、生命周期和权限语义；
- 不得创建未经批准的 `attachment_links.object_type = import_task`；
- 附件删除/保留策略也不能决定 Import 任务的判重历史。

因此 `attachments.checksum` 继续服务附件元数据，Import 摘要优先保存为 `import_tasks.file_checksum`。未来若要统一文件体系，必须另行批准关系、权限、删除和审计语义。

## 5. 推荐数据库方案

提出 Database Change Request 004，将 Database Logical Design 从 v2.1 升级为 v2.2：

1. `import_tasks` 新增 `file_checksum VARCHAR(128) NOT NULL`；
2. 摘要由服务端对已校验的原始上传内容按 SHA-256 计算，只保存 64 位小写十六进制值；
3. 新增 `ck_import_tasks_file_checksum_format`；
4. 新增两个目标范围部分唯一索引；
5. 新增 `ck_import_tasks_target_exactly_one`，使所有合法 Import 恰好属于仓库或店铺分支；
6. 新增通用 `idempotency_records` 表。

`file_checksum` 不由客户端提交，不表示 Storage Key、附件关系或原文件内容。历史行如何安全回填摘要必须在批准后的 Migration 实施前审计；不能可靠重算时 Migration 必须阻断，不得伪造或用文件名代替。

## 6. Import 唯一约束方案

建议两个部分唯一索引：

```sql
CREATE UNIQUE INDEX uq_import_tasks_file_checksum_import_type_warehouse
  ON import_tasks (file_checksum, import_type, warehouse_id)
  WHERE warehouse_id IS NOT NULL AND store_id IS NULL;

CREATE UNIQUE INDEX uq_import_tasks_file_checksum_import_type_store
  ON import_tasks (file_checksum, import_type, store_id)
  WHERE store_id IS NOT NULL AND warehouse_id IS NULL;
```

并建议：

```sql
CONSTRAINT ck_import_tasks_target_exactly_one
CHECK ((warehouse_id IS NOT NULL) <> (store_id IS NOT NULL))
```

这样每个合法 Import 必被一个唯一索引覆盖。服务可先做友好查询，但最终裁决必须依赖唯一冲突；并发请求中仅一个任务创建成功，其余映射既有 `IMPORT_DUPLICATE_FILE`。

唯一约束覆盖所有任务状态。重复请求不新增第二条 `import_tasks`；原任务保留，重复尝试由 `idempotency_records` 和审计链记录。API v1.3 的“任务可保存为 `duplicate_file`”不是强制创建重复任务；若项目负责人要求每次重复均形成任务行，则与上述原子唯一目标冲突，必须另行选择并批准。

## 7. 通用 Idempotency 表结构

建议 `idempotency_records`：

| 字段 | 建议类型 | Null / 默认 | 语义 |
| --- | --- | --- | --- |
| `id` | `UUID` | NOT NULL / `uuidv7()` | 主键 |
| `scope_code` | `VARCHAR(300)` | NOT NULL | 服务端规范化作用域 |
| `idempotency_key_hash` | `VARCHAR(128)` | NOT NULL | 原始 Key 的 HMAC-SHA-256 小写十六进制摘要 |
| `request_hash` | `VARCHAR(128)` | NOT NULL | 规范化请求的 SHA-256 小写十六进制摘要 |
| `status` | `VARCHAR(50)` | NOT NULL | `processing/completed/failed` |
| `response_http_status` | `INTEGER` | NULL | 首次终态 HTTP 状态 |
| `response_body` | `JSONB` | NULL | 可安全重放的首次响应；204 等允许为空 |
| `resource_type` | `VARCHAR(50)` | NULL | 可选业务结果类型 |
| `resource_id` | `UUID` | NULL | 可选业务结果 ID |
| `request_trace_id` | `UUID` | NOT NULL | 首次请求追踪 ID |
| `locked_until` | `TIMESTAMPTZ` | NULL | processing 租约截止 |
| `completed_at` | `TIMESTAMPTZ` | NULL | 首次终态形成时间 |
| `expires_at` | `TIMESTAMPTZ` | NOT NULL | 技术记录最早可清理时间 |
| `created_at` | `TIMESTAMPTZ` | NOT NULL / CURRENT_TIMESTAMP | 创建时间 |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL / CURRENT_TIMESTAMP | 更新时间 |

唯一约束为 `UNIQUE(scope_code, idempotency_key_hash)`。不保存原始 Key，不对多态 `resource_id` 建外键，不新增用户外键；认证主体已进入不可由客户端覆盖的 `scope_code`。建议普通索引：

- `(status, locked_until)`：过期 processing 租约扫描；
- `(expires_at)`：清理；
- `(resource_type, resource_id, created_at)`：结果追踪与补偿核对。

## 8. Scope 与 Request Hash 规则

### 8.1 Scope

`scope_code` 由服务端生成，规范语义为：

```text
subject:user:{authenticatedUserId}|action:{apiId}
```

没有正式 API 编号的公共内部入口才使用 `METHOD + canonicalPathTemplate` 作为动作标识。不得从请求 Header/Body 接受 userId 或 scope。当前项目没有业务租户对象；仓库/店铺不是 scope 组成，而进入请求摘要。若未来批准租户隔离，必须先变更 scope 规则。

### 8.2 Idempotency Key Hash

对规范化原始 `Idempotency-Key` 使用服务端密钥参与的 HMAC-SHA-256，保存 64 位小写十六进制摘要。密钥不进入数据库、日志、响应或仓库；不得使用无密钥 SHA-256 直接摘要低熵 Key。

### 8.3 Request Hash

先完成 DTO 白名单与格式校验，再对确定性 Canonical JSON 使用 SHA-256。对象键排序，数组保持业务顺序，数字、日期、空值采用单一规范。摘要至少覆盖：

- API 编号/动作；
- Path 参数；
- Query 中参与业务的白名单字段；
- Request Body；
- 文件 `checksum`；
- 目标 `warehouseId/storeId`；
- 当前认证用户与正式 scope。

排除 Authorization、Cookie、Request ID、传输边界、原始文件名等不改变业务语义的值。未知字段先拒绝，不能静默忽略后参与另一套摘要。

## 9. 并发认领规则

1. 事务内尝试插入 `processing` 记录并设置有界 `locked_until`；
2. 唯一冲突后锁定既有记录，恒定时间比较 Request Hash；
3. Hash 不同返回既有正式 409 `SECURITY_REPLAY_DETECTED`；
4. Hash 相同且 `completed/failed`，返回首次安全 HTTP 状态和响应；
5. Hash 相同且 processing 租约有效，返回 API CR-004 批准的稳定 409；
6. 租约过期不能直接重做；先核对 `resource_type/resource_id`、业务唯一事实与审计，再通过条件更新（旧状态及旧 `locked_until` 必须仍匹配）由单一请求回收；
7. 发现已提交业务结果时补写终态；只有确认没有已提交结果时才可重新执行。

不能用“查询后插入”或进程内 Map 作为唯一竞争保护。

## 10. 文件系统补偿事务

现有 Adapter 不支持临时对象确认，本提案采用兼容顺序：

1. 校验文件并计算 SHA-256；
2. 原子认领 Idempotency Record；
3. `store` 写入随机 Storage Key；
4. PostgreSQL 事务创建 Import Task，并由唯一索引裁决重复；
5. 数据库成功后把首次安全响应写入幂等终态；
6. 数据库失败或判重时调用 `delete` 补偿；
7. 删除失败必须记录脱敏审计/运维清理任务，按 Storage Key、Request Trace 与时间重试；
8. 孤儿扫描只清理超过安全窗口且数据库无 `file_reference` 引用的对象。

文件系统与 PostgreSQL 不是单一 ACID 事务，任何实现或文档都不得宣称完全原子。未来扩展 `storeTemporary/confirm` 可减少可见窗口，但不改变数据库作为判重事实来源。

## 11. 失败与重试规则

- 能确定的业务失败写为 `failed`，保存首次安全错误状态/响应；相同 Key、相同 Hash 在过期前只重放首次失败，不重新执行业务；
- 同一请求要重新尝试必须使用新 Idempotency Key；
- 事务结果不确定、进程崩溃或补偿未核对时保持 `processing`，由租约恢复流程先对账；
- 业务事务与幂等终态应尽可能同一 PostgreSQL 事务提交；不能同事务的外部文件步骤使用第 10 节补偿；
- 不缓存 Token、堆栈、SQL、内部路径、未脱敏原始行或超出首次调用者权限的数据；
- 同 Key 不同 Hash 永远不执行并返回 409。

## 12. 过期与清理规则

- `expires_at` 的具体保留期是待批准技术配置，不在本提案硬编码；
- `completed/failed` 仅在过期且不承担业务/审计事实后清理；
- `processing` 不按普通过期任务直接删除，必须先完成租约回收与结果对账；
- 清理仅删除幂等技术缓存，不删除 Import Task、文件业务引用、库存流水或审计日志；
- 已清理 Key 的再次使用按新请求处理，因此保留期必须覆盖客户端最大重试窗口和业务风险窗口；
- 清理任务记录数量、状态和 Request Trace 摘要，不记录原始 Key 或请求敏感内容。

## 13. 安全与脱敏

1. 原始 Idempotency Key、HMAC 密钥、Token、Cookie、文件内容及敏感 DTO 不入库、不入日志；
2. Response 只保存允许同一认证主体重放的安全 DTO；
3. 每次重放仍重新执行身份、用户状态和必要数据可见性校验，不因缓存绕过授权；
4. `scope_code` 防止不同用户共享 Key；请求摘要防止同用户用同 Key 改写请求；
5. 数据库错误只映射正式安全错误，不返回约束 SQL、Storage 路径或内部堆栈；
6. 幂等记录访问只允许服务内部 Repository，不新增业务查询 API。

## 14. Mapping Audit 预计变化

以 Frozen v2.1 的 `prisma/mapping-audit.json` 为基线：

| 项目 | v2.1 | v2.2 预计 | 变化 |
| --- | ---: | ---: | ---: |
| 表 | 62 | 63 | +1 |
| 字段 | 1160 | 1176 | +16（Import 1 + 新表 15） |
| 主键 | 62 | 63 | +1 |
| 唯一约束/唯一索引 | 76 | 79 | +3 |
| 外键 | 292 | 292 | 0 |
| 普通索引 | 94 | 97 | +3 |
| Check | 226 | 233 | +7 |
| PostgreSQL Enum | 2 | 2 | 0 |

七项 Check 预计为：Import checksum 格式、Import 目标恰好一个、幂等状态值域、两个 Hash 格式（可在同一 Check）、HTTP 状态范围、生命周期/响应字段一致性、时间/租约范围。正式同步时必须用 Mapping Audit 脚本复核；若 DDL 拆分方式改变计数，需在批准范围内明确后再实施。

## 15. API Change Request 是否需要

审计结论为需要 API CR-004。API v1.3 已明确：

- 高风险写操作的 Idempotency-Key 必填范围；
- 同键同请求返回首次结果；
- 同键不同请求返回冲突；
- IMP-001 重复范围与 `IMPORT_DUPLICATE_FILE`。

但尚未明确 processing 租约有效时的稳定 HTTP/错误结果、租约恢复外部语义，以及数据库唯一竞争失败时是否创建第二个 duplicate task。API CR-004 只补充这些外部可观察行为，不新增 API、DTO、权限、错误码或接口数量。

## 16. 风险

- 历史 Import 文件可能无法从 `file_reference` 可靠读取并回填摘要；
- 若不批准目标 XOR Check，两个部分唯一索引无法覆盖双空/双目标行；
- 文件写入与数据库提交之间可能产生孤儿对象，必须具备可审计补偿；
- 幂等 Response 持久化可能保存过量或敏感数据，需限定安全 DTO 与大小；
- 租约过短会误回收，过长会延迟恢复；具体配置需通过真实并发/故障测试；
- 过早清理会让旧 Key 再次执行，过晚清理增加存储与敏感面；
- 为已有大量写 API 接入通用幂等需要分批回归，不能只覆盖 Import。

## 17. 待项目负责人批准事项

1. DCR-004 及 Database v2.2 目标版本；
2. `file_checksum`、两个部分唯一索引及目标 XOR Check；
3. `idempotency_records` 的 15 个字段、唯一约束、3 个普通索引和 5 个表级 Check；
4. HMAC-SHA-256 Key Hash、SHA-256 Canonical Request Hash 规则；
5. processing 租约恢复、failed 重放及清理原则；
6. 文件存储补偿和孤儿清理原则；
7. API CR-004 的 processing 409 与重复文件竞争外部行为；
8. 历史 `import_tasks` 摘要回填策略、保留期、租约时长、Response 大小上限等实施参数。

批准前不得修改 Frozen Database/API SSOT、Prisma Schema、Migration、Mapping Audit 或业务实现；Batch 7.6-C1 保持 `Paused / Persistence SSOT Conflict`。
