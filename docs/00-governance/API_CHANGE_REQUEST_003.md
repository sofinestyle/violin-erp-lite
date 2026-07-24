---
document_name: API Change Request 003：导入状态代码与动作边界
project: Violin ERP Lite
version: 1.1
status: Completed / Approved
owner: Project Manager
created_date: 2026-07-24
updated_date: 2026-07-24
related_phase: Phase 5 / Phase 6 / Phase 7
---

# API Change Request 003：导入状态代码与动作边界

> 项目负责人已于 2026-07-24 批准本 Change Request。Database Logical Design v2.1 依赖已满足，API Master Specification v1.3 已完成正式同步并冻结。

## 1. 变更原因与边界

API v1.2 已定义 IMP-001—IMP-015 及 CBR-018—CBR-021 的路径、方法、权限、幂等、校验、执行、重试和结果语义，但没有定义四个现有 DTO 状态字段的完整英文代码、筛选值和动作状态边界。

本提案只补齐这些映射，不新增或改变：

- API 路径、方法、编号；
- Request/Response DTO 字段结构；
- 权限代码；
- 数据库字段；
- 错误码；
- 正式接口总数 335。

## 2. 正式状态集合

### 2.1 任务状态

`pending_validation | validation_failed | pending_confirmation | importing | partially_succeeded | succeeded | cancelled | duplicate_file | failed`

“待上传”是 IMP-001 提交前的客户端页面状态，不是 API 返回或筛选代码。

### 2.2 行级校验状态

`pending | valid | warning | invalid`

`warning` 无阻断错误，允许执行；具体原因使用现有错误字段。

### 2.3 行级执行状态

`pending | processing | succeeded | failed | skipped`

`skipped` 只用于校验为 `invalid` 的行；含阻断行的任务不能进入 IMP-011。

### 2.4 匹配状态

`pending | partially_matched | matched`

`partially_matched` 只表示 `0 < matchedQuantity < receivedQuantity` 的数量部分匹配。`unmatched/conflict` 不作为匹配记录状态；其页面提示由不存在合法匹配记录和导入行安全错误结果派生。

## 3. 响应与筛选映射

| API | 补齐内容 |
| --- | --- |
| IMP-002、IMP-014、CBR-018 | `status` 筛选只接受第 2.1 节代码 |
| IMP-003、IMP-004、IMP-013、CBR-019 | 返回任务 `status` 与正式统计字段 |
| IMP-010、CBR-020 | 返回 Validation / Execution 代码 |
| CBR-021 | 返回三个 Match 代码 |
| IMP-015 | 导出使用相同代码，并按中文映射展示 |

未知筛选值使用既有统一 Validation 错误，不新增同义错误码。

## 4. 动作边界

| API | 允许当前任务状态 | 结果 |
| --- | --- | --- |
| IMP-005 取消 | `pending_validation`, `validation_failed`, `pending_confirmation` | `cancelled` |
| IMP-009 校验/重新校验 | `pending_validation`, `validation_failed`, `pending_confirmation` | 先进入/保持 `pending_validation`，完成后为 `validation_failed` 或 `pending_confirmation` |
| IMP-011 执行 | `pending_confirmation` | `importing`，结束后为 `succeeded`, `partially_succeeded` 或 `failed` |
| IMP-012 重试失败行 | `partially_succeeded`, `failed` | `importing`，结束后重新计算结果状态 |

不在表中状态执行动作时使用既有 `STATE_IMPORT_JOB_ACTION_NOT_ALLOWED`。IMP-011 仍要求无阻断 `invalid` 行、有效权限、目标范围、模板版本、`updatedAt` 和幂等键。

## 5. 行级与汇总规则

1. Validation：`pending → valid | warning | invalid`；
2. `invalid` 行的 Execution：`pending → skipped`；
3. Execution：`pending → processing → succeeded | failed`；
4. Retry：仅 `failed → processing → succeeded | failed`；
5. `succeeded` 行不得重新执行；
6. `warningRows` 为 Validation `warning` 数量；
7. 执行前 `failedRows` 为 Validation `invalid` 数量；
8. 执行后 `successRows`、`failedRows` 分别为 Execution `succeeded`、`failed` 数量；
9. `partially_succeeded` 要求成功行和失败行均大于零；
10. `failed` 要求执行结束、零成功且至少一行失败；
11. 任务状态由服务端事务内根据行级事实计算，客户端不得提交目标状态。

## 6. 重复文件

IMP-001 按既有规则以文件内容摘要、`importType` 和目标仓库/店铺范围判断重复。命中时使用 `IMPORT_DUPLICATE_FILE`，任务事实可保存为 `duplicate_file`，不得进入 IMP-009/011/012。

本提案不决定内容摘要的技术持久化介质；实现不得把摘要偷存到无关业务字段。如现有正式结构与选定存储适配器不能可靠判重，应停止并另行提出变更。

## 7. 页面中文映射

API 返回英文代码，页面使用 `IMPORT_STATUS_CODE_COMPLETION_001.md` 第 11 节的唯一中文映射。页面不得向 API 提交中文状态，也不得将错误原因当作状态。

## 8. 错误码

继续复用：

- `STATE_IMPORT_JOB_ACTION_NOT_ALLOWED`；
- `IMPORT_FILE_FORMAT_INVALID`；
- `IMPORT_TEMPLATE_VERSION_UNSUPPORTED`；
- `IMPORT_VALIDATION_FAILED`；
- `IMPORT_DUPLICATE_FILE`；
- `IMPORT_EXECUTION_PARTIAL_FAILED`；
- `CONFLICT_IMPORT_JOB_MODIFIED`。

本变更新增错误码数量为 0。

## 9. 版本与数量

API Master Specification 正式从 v1.2 升级为 **v1.3**：这是向既有 DTO 状态字段补充受控值、筛选和动作边界的兼容性契约增量。正式接口总数仍为 335。

## 10. 依赖与完成顺序

API CR-003 依赖 DCR-003 的值域集合，已按以下顺序完成：

1. 项目负责人同时审查状态补齐提案、DCR-003 和 API CR-003；
2. 批准 DCR-003 并同步 Database Logical Design v2.1；
3. 批准 API CR-003 并同步 API Master Specification v1.3、Phase 4/5/6 适用引用；
4. 生成并验证前向 Migration；
5. 本轮文档同步完成后，Batch 7.6-C1 更新为 Ready to Resume / Pending Execution，仍须由项目负责人另行下令执行。

## 11. 完成与冻结结果

1. 四个状态集合、页面映射、筛选及行级流转已正式生效；
2. `failed` 任务状态已保留；
3. `pending_upload` 只作为 IMP-001 提交前客户端状态，不作为数据库/API 状态；
4. `partially_matched` 只表示数量部分匹配，`unmatched/conflict` 不进入匹配表状态；
5. IMP-005、IMP-009、IMP-011、IMP-012 的取消、校验、执行与重试边界已同步；
6. 汇总统计规则已同步，客户端不得提交目标状态；
7. Database Logical Design v2.1 依赖已满足；
8. API Master Specification v1.3 已完成、批准并冻结，API 总数保持 335；
9. 未新增 API、DTO 字段、权限代码、错误码或数据库对象；
10. API Change Request 003 最终状态为 Completed / Approved。
