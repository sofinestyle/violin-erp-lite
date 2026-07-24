---
document_name: API Change Request 004：幂等处理中与 Import 重复竞争行为
project: Violin ERP Lite
version: 1.0
status: Proposed / Pending Approval
owner: Project Manager
created_date: 2026-07-24
updated_date: 2026-07-24
related_phase: Phase 5 / Phase 7
---

# API Change Request 004：幂等处理中与 Import 重复竞争行为

> 本 Change Request 尚未批准。API Master Specification 当前仍为 v1.3 Completed / Approved / Frozen；本文不修改现有 API、DTO、权限、错误码或 335 个接口总数。

## 1. 变更原因

API v1.3 已要求高风险写操作使用 `Idempotency-Key`，同键同请求返回首次结果、同键不同请求返回冲突，并规定 IMP-001 的重复范围。但尚未明确：

- 同键同请求仍在 processing 时的稳定外部结果；
- processing 租约过期后的外部语义；
- Import 数据库唯一竞争失败时是否创建第二条任务；
- 文件 checksum 是否可由客户端提交。

这些是客户端可观察契约，不能只留给实现自行决定，因此需要 API CR-004。

## 2. 适用范围

适用于 v1.3 中已经要求 `Idempotency-Key` 的写 API，重点覆盖 `IMP-001`、导入动作、附件上传、导出、库存事务和状态动作。不扩大 Idempotency-Key 必填范围，不新增 Header、API 或 DTO 字段。

## 3. 提议的统一行为

| 既有记录 | Request Hash | 结果 |
| --- | --- | --- |
| 不存在 | — | 原子认领并执行 |
| `processing` 且租约有效 | 相同 | HTTP 409，`SECURITY_REPLAY_DETECTED`；可返回安全 `Retry-After`，不得泄露租约/内部锁 |
| `processing` 且租约过期 | 相同 | 服务端先对账并原子回收；客户端在恢复完成前仍得到上述稳定 409 |
| `completed` | 相同 | 返回首次安全 HTTP 状态与响应 |
| `failed` | 相同 | 返回首次安全失败 HTTP 状态与响应；同 Key 不重新执行 |
| 任意状态 | 不同 | HTTP 409，`SECURITY_REPLAY_DETECTED` |

不新增 `IDEMPOTENCY_IN_PROGRESS` 或其他同义错误码。响应继续使用统一 Envelope 和 Request ID；重放不得暴露首次调用之后已失去权限的数据。

## 4. Request Hash 与 Key

- 原始 `Idempotency-Key` 只来自既有 Header，不进入 DTO；
- 服务端只持久化 HMAC-SHA-256 Key Hash；
- Request Hash 由服务端在 Validation 后生成，覆盖 API 动作、Path、业务 Query、Body、文件 checksum、目标仓库/店铺及认证 Scope；
- 文件 checksum 由服务端计算，不允许客户端提交或覆盖；
- 同 Key 不同 Hash 的请求不得执行任何业务副作用。

## 5. IMP-001 重复文件竞争

1. 重复范围保持 v1.3：`fileChecksum + importType + warehouseId` 或 `fileChecksum + importType + storeId`；
2. 文件 checksum 只由服务端对原始上传内容计算；
3. 友好预查不能替代数据库唯一约束；
4. 并发竞争仅一个 Import Task 创建成功；
5. 其他请求返回既有 `IMPORT_DUPLICATE_FILE`；
6. 不创建第二条 `duplicate_file` 任务，重复尝试由幂等记录与审计链保留；
7. 原任务状态和后续处理不被重复请求改变。

若项目负责人要求第二条任务保存为 `duplicate_file`，必须拒绝当前唯一约束方案并重新批准可同时保留重复尝试和原子防重的结构，不能由实现自行取舍。

## 6. 租约、恢复与失败

- processing 租约是服务端技术状态，不新增响应 DTO；
- 租约过期不表示业务失败，也不授权直接重做；
- 服务端必须先核对已提交资源、业务唯一事实和审计，再决定补写终态或重新执行；
- 可确定的首次业务失败写入 failed，相同 Key 重放相同安全失败；
- 客户端需要重新尝试时使用新 Key；
- 恢复期间继续返回稳定 409，不能返回伪成功或重复创建；
- `Retry-After` 若返回，只是建议重试时间，不保证届时一定完成。

## 7. 安全与权限

每次首次执行和重放都重新检查认证主体、用户状态及必要权限。幂等缓存不能跨用户、跨 API 动作复用，不能绕过仓库/店铺范围。响应不返回 Key Hash、Request Hash、租约、内部 Session、Storage Key、SQL 或堆栈。

## 8. 数量与兼容性

- API 新增：0；
- API 删除：0；
- DTO 字段变化：0；
- 权限变化：0；
- 错误码变化：0；
- 正式接口总数：335；
- 建议 API Master Specification 版本：v1.3 → v1.4（仅在批准并正式同步后生效）。

现有客户端对 completed/failed 重放语义不变；新增明确的 processing 409 和 Import 唯一竞争行为。

## 9. 依赖与顺序

1. 项目负责人审查 Completion 001、DCR-004 与本 API CR；
2. 先批准并同步 Database v2.2；
3. 再批准并同步 API v1.4；
4. 完成独立 GitHub 技术验收；
5. 项目负责人另行下令恢复 Batch 7.6-C1。

当前状态：**Proposed / Pending Approval**。批准前不得修改 Frozen API_SPEC、实现、测试或数据库。
