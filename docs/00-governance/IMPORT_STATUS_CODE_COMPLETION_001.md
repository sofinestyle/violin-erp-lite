---
document_name: Import Status Code Completion 001：导入状态代码补齐提案
project: Violin ERP Lite
version: 1.0
status: Proposed / Pending Approval
owner: Project Manager
created_date: 2026-07-24
updated_date: 2026-07-24
related_phase: Phase 3 / Phase 4 / Phase 5 / Phase 6 / Phase 7
---

# Import Status Code Completion 001：导入状态代码补齐提案

> 本文件是待项目负责人批准的治理提案，不是 Approved / Frozen 事实。批准并完成 DCR-003、API CR-003 的正式同步和物理迁移前，不得据此恢复 Batch 7.6-C1 或实现 Import API。

## 1. 冲突背景

Batch 7.6-C1 实施前发现：

- Frozen `import_tasks.status`、`import_task_items.validation_status`、`import_task_items.execution_status` 和 `shipment_import_matches.match_status` 均为必填 `VARCHAR(50)`；
- Approved Phase 4 已给出导入任务的九项中文展示语义，但明确说明三个行级/匹配字段的完整代码集合尚未批准；
- Frozen API v1.2 要求校验、执行、重试、取消、筛选和结果响应使用受控状态，却没有定义完整英文代码；
- 当前 Migration 没有上述四个字段的值域 Check。

因此直接实现会自行创造数据库代码和 API 状态。Batch 7.6-C1 必须保持 `Paused / SSOT Conflict`。

## 2. 影响范围

影响 `IMP-001`—`IMP-015`、`CBR-018`—`CBR-021` 的状态响应、筛选、动作校验、行级结果、重试、页面文案和数据库写入。API 路径、方法、编号、DTO 字段结构、权限和接口总数不变。

## 3. 现有 Frozen 事实

- `import_tasks` 已有任务状态、四项计数及开始/完成时间；
- `import_task_items` 已有校验状态、执行状态、错误码、错误消息和结果对象；
- `shipment_import_matches` 要求跨境发货单、发货明细、导入任务和导入明细四个目标外键全部非空；
- `shipment_import_matches` 已有匹配数量、实收数量和差异数量；
- IMP-011 只允许已校验且无阻断错误的任务执行；
- IMP-012 只重试失败行，成功行不得重复执行；
- IMP-005 只允许未执行任务取消；
- Phase 4 的“待上传”发生在用户尚未完成 IMP-001 文件提交之前；而数据库任务要求 `file_name`、`file_reference` 非空。

## 4. 四个字段推荐代码集合

### 4.1 `import_tasks.status`

| 代码 | 中文名称 | 含义 | 终态/重试 |
| --- | --- | --- | --- |
| `pending_validation` | 待校验 | IMP-001 已完成受控上传并创建任务，等待 IMP-009 | 非终态 |
| `validation_failed` | 校验失败 | 至少一行 `invalid`，尚未进入执行 | 可重新校验或取消 |
| `pending_confirmation` | 待确认 | 校验完成且无 `invalid`，等待 IMP-011 | 非终态，可重新校验或取消 |
| `importing` | 导入中 | IMP-011 或 IMP-012 已原子认领任务 | 非终态，不可取消 |
| `partially_succeeded` | 部分成功 | 执行结束且成功行、失败行均大于零 | 本次终态，可用 IMP-012 重试失败行 |
| `succeeded` | 导入成功 | 全部可执行行成功且失败行数为零 | 最终态，不可重试或取消 |
| `cancelled` | 已取消 | IMP-005 对允许状态完成幂等取消 | 最终态 |
| `duplicate_file` | 重复文件 | 内容摘要、导入类型和目标范围命中正式重复判定 | 最终态 |
| `failed` | 执行失败 | 执行结束、有可执行行且成功行数为零 | 本次终态，可用 IMP-012 重试失败行 |

不批准 `pending_upload` 作为数据库代码。IMP-001 同时上传文件并创建任务，且 `file_name`、`file_reference` 均非空；“待上传”继续作为任务创建前的页面本地文案，不进入 API 状态筛选或数据库。数据库不设置状态默认值，服务必须在成功创建任务时显式写 `pending_validation`。

保留 `failed`：没有该代码时，“执行已结束、零成功、至少一行失败”既不能合法映射 `validation_failed`，也不能映射要求至少一行成功的 `partially_succeeded`。

### 4.2 `import_task_items.validation_status`

| 代码 | 中文名称 | 含义 | 初始/流转 |
| --- | --- | --- | --- |
| `pending` | 待校验 | 尚未形成当前轮次校验结论 | 明细初始值 |
| `valid` | 校验通过 | 无错误或警告 | `pending → valid` |
| `warning` | 校验通过但有警告 | 没有阻断错误，允许执行 | `pending → warning` |
| `invalid` | 校验失败 | 存在阻断执行的行级错误 | `pending → invalid` |

`warning` 行允许执行。具体原因只写现有 `error_code`、`error_message`，不得扩展状态代码。重新校验只允许任务尚未执行时进行；服务先把相关行重置为 `pending`，再覆盖当前校验状态和安全错误结果，并通过审计保留本次动作摘要。现有结构没有逐轮校验历史，不得伪造历史版本。

### 4.3 `import_task_items.execution_status`

| 代码 | 中文名称 | 含义 | 初始/流转 |
| --- | --- | --- | --- |
| `pending` | 待执行 | 尚未执行的 `valid` / `warning` 行 | 明细初始值 |
| `processing` | 执行中 | 当前事务已认领该行 | `pending/failed → processing` |
| `succeeded` | 执行成功 | 正式结果已提交 | 最终态，不可重试 |
| `failed` | 执行失败 | 当前执行尝试失败并保留安全原因 | 本次终态，可重试 |
| `skipped` | 已跳过 | 当前校验为 `invalid`，不得进入执行 | 校验结束时由 `pending → skipped` |

重新校验使 `invalid` 行恢复合法时，`skipped → pending`；该变化只允许任务进入执行前发生。失败重试只允许 `failed → processing → succeeded | failed`。`succeeded` 永远不得重新执行；重试其他失败行时，成功行保持 `succeeded`，不能改为 `skipped`。

### 4.4 `shipment_import_matches.match_status`

| 代码 | 中文名称 | 含义 | 初始/流转 |
| --- | --- | --- | --- |
| `pending` | 待确认匹配 | 已有唯一候选目标，但匹配尚未确认 | 匹配记录初始值 |
| `partially_matched` | 部分匹配 | 数量部分匹配：`0 < matched_quantity < received_quantity` | `pending → partially_matched` |
| `matched` | 已匹配 | 该匹配记录数量已完整匹配 | `pending/partially_matched → matched`，最终态 |

保留 `partially_matched`，且只表达数量部分匹配，不表达字段“部分相似”。

不批准 `unmatched`、`conflict` 作为 `shipment_import_matches.match_status`：该表的跨境发货单及明细外键均必填；没有合法目标或存在多个冲突候选时创建记录会伪造匹配事实。页面“未匹配”由不存在匹配记录且导入行校验错误派生，“匹配异常”由导入行的安全错误码派生。具体原因仍不写入状态字段。

## 5. 任务状态机

```text
IMP-001: pending_validation
pending_validation --IMP-009--> validation_failed | pending_confirmation
validation_failed --IMP-009--> pending_validation --> validation_failed | pending_confirmation
pending_confirmation --IMP-009--> pending_validation --> validation_failed | pending_confirmation
pending_confirmation --IMP-011--> importing --> succeeded | partially_succeeded | failed
partially_succeeded --IMP-012--> importing --> succeeded | partially_succeeded | failed
failed --IMP-012--> importing --> succeeded | partially_succeeded | failed
pending_validation | validation_failed | pending_confirmation --IMP-005--> cancelled
IMP-001 duplicate detection --> duplicate_file
```

`importing`、`succeeded`、`partially_succeeded`、`failed`、`duplicate_file` 和 `cancelled` 不允许 IMP-005。`succeeded`、`duplicate_file`、`cancelled` 不允许重试。

## 6. 行级状态规则

1. 创建明细显式写 `validation_status = pending`、`execution_status = pending`；
2. 校验将 `pending` 写为 `valid`、`warning` 或 `invalid`；
3. `invalid` 同步把执行状态写为 `skipped`；任务保持 `validation_failed`，不得执行；
4. 重新校验前只重置尚未执行任务的行；已执行任务不得回到校验阶段；
5. IMP-011 只认领 `valid/warning + pending` 行；
6. IMP-012 只认领 `failed` 行；
7. 认领与 `processing` 写入必须和最新任务状态、权限、`updatedAt` 校验处于同一事务；
8. 事务提交后才形成 `succeeded`；失败回滚业务事实，并把可安全确认失败的行保持/写为 `failed`；
9. 任何路径都不得把 `succeeded` 行重新认领。

## 7. 任务汇总计算规则

- `total_rows`：当前任务全部 `import_task_items` 数量；
- `warning_rows`：`validation_status = warning` 的行数，可与成功行重叠；
- 执行前 `failed_rows`：`validation_status = invalid` 的行数，`success_rows = 0`；
- 执行后 `success_rows`：`execution_status = succeeded` 的行数；
- 执行后 `failed_rows`：`execution_status = failed` 的行数；
- `succeeded`：`total_rows > 0`、`success_rows = total_rows`、`failed_rows = 0`；
- `partially_succeeded`：`success_rows > 0` 且 `failed_rows > 0`；
- `failed`：执行结束、`success_rows = 0` 且 `failed_rows > 0`；
- `validation_failed`：执行前至少一行 `invalid`；
- `skipped` 只表示校验阻断，不参与执行终态计算；含 `skipped` 的任务不得进入 IMP-011；
- 任务状态必须在事务内根据行级事实重算，不接受客户端目标状态。

## 8. 重试规则

- IMP-012 只接受任务 `failed` 或 `partially_succeeded`；
- 只重试 `execution_status = failed` 的原明细；
- 重试开始时任务变为 `importing`，失败行变为 `processing`；
- 原 `succeeded` 行、结果对象、库存流水和匹配记录保持不变；
- 重试结束后按第 7 节重新计算 `succeeded`、`partially_succeeded` 或 `failed`；
- 同一幂等键同请求返回首次结果，同键不同请求返回冲突；
- 并发认领零行必须回滚，不产生重复业务事实。

## 9. 取消规则

IMP-005 只允许 `pending_validation`、`validation_failed`、`pending_confirmation`，并幂等写为 `cancelled`。进入 `importing` 后不得取消；所有执行结果态、重复文件和已取消任务不得回退。

## 10. API 映射

- IMP-002、IMP-014 与 CBR-018 的任务状态筛选使用第 4.1 节九个数据库代码；
- IMP-003、IMP-004、IMP-013 与 CBR-019 返回任务状态及四项计数；
- IMP-010 与 CBR-020 返回第 4.2、4.3 节代码；
- CBR-021 返回第 4.4 节三个匹配状态；
- IMP-005、IMP-009、IMP-011、IMP-012 按第 5 节校验状态；
- 非法动作继续使用 `STATE_IMPORT_JOB_ACTION_NOT_ALLOWED`；
- 重复文件继续使用 `IMPORT_DUPLICATE_FILE`，并可保留 `duplicate_file` 任务事实；
- 不新增路径、方法、编号、DTO 字段或错误码，API 总数保持 335。

## 11. 页面映射

| 页面文案 | API/数据库来源 |
| --- | --- |
| 待上传 | IMP-001 提交前的页面本地状态，不是 `import_tasks.status` |
| 待校验、校验失败、待确认、导入中、部分成功、导入成功、已取消、重复文件、执行失败 | 第 4.1 节对应代码 |
| 待校验、校验通过、校验通过但有警告、校验失败 | 第 4.2 节对应代码 |
| 待执行、执行中、执行成功、执行失败、已跳过 | 第 4.3 节对应代码 |
| 待确认匹配、部分匹配、已匹配 | 第 4.4 节对应代码 |
| 未匹配、匹配异常 | 无匹配记录 + 导入行安全错误结果派生，不伪造匹配记录 |

## 12. 数据库 Check 审计

当前 Check 只有：

- `import_tasks`：更新时间、计数非负、计数平衡、开始/完成时间；
- `import_task_items`：行号、更新时间、结果对象字段成组；
- `shipment_import_matches`：更新时间、匹配/实收数量非负。

四个目标状态字段均没有值域 Check，现有 Check **未完整支持**推荐集合，属于情况 B。

## 13. Change Request 判断

- 必须提出 `DATABASE_CHANGE_REQUEST_003.md`：增加四项值域 Check，不新增表、字段、枚举或默认值；
- 必须提出 `API_CHANGE_REQUEST_003.md`：补状态代码、筛选、流转、汇总、重试和页面映射；
- 两份提案均保持 `Proposed / Pending Approval`；
- 批准前不得修改 Database/API Frozen SSOT、Schema、Migration、Mapping Audit 或实现。

## 14. 推荐方案与迁移影响

建议 Database Logical Design 从 v2.0 升级为 v2.1。表、字段、主键、唯一约束、外键、普通索引和 PostgreSQL Enum 数量不变；Check 预计从 222 增至 226。

正式 Migration 前必须查询四个字段的现有 distinct 值。未知值存在时 Migration 必须失败并输出脱敏计数，等待项目负责人批准数据映射；不得静默改写历史状态。当前仓库 Seed 不创建导入数据，但不能据此推断所有部署库为空。

## 15. 风险

1. 未知历史状态会阻止 Check 验证；
2. `pending_upload` 若被错误持久化，会与非空文件字段和 IMP-001 原子边界冲突；
3. 把 `unmatched/conflict` 写入匹配表会伪造必填目标关系；
4. 重试若重置成功行会重复业务单据、库存流水或匹配记录；
5. 任务计数若非事务重算，可能与行级事实不一致；
6. 重复文件内容摘要的持久技术方案仍须遵守现有 API 幂等边界，不得把摘要偷存到无关字段。

## 16. 待项目负责人批准事项

1. 四个字段的推荐代码集合与中文映射；
2. `failed` 任务状态保留；
3. `pending_upload` 仅为创建前页面状态，不作为数据库/API 代码；
4. `partially_matched` 仅表示数量部分匹配；
5. `unmatched/conflict` 不进入匹配表状态；
6. DCR-003、Database Logical Design v2.1 及 Check 222 → 226；
7. API CR-003、API Master Specification 建议升级 v1.3，接口总数保持 335；
8. 历史未知状态不自动迁移；
9. 批准、正式同步和物理 Migration 验收完成后，才可另行恢复 Batch 7.6-C1。
