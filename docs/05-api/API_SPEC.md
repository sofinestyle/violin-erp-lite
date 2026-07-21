---
document_name: API Master Specification
project: Violin ERP Lite
version: 1.0
status: Completed / Approved / Frozen
owner: Project Manager
created_date: 2026-07-19
updated_date: 2026-07-21
related_phase: Phase 5
---

# API Master Specification

## 1. 文档定位

本文件是 Violin ERP Lite Phase 5 正式 API 规范总入口，统一 Task 5.1 至 Task 5.5 的接口编号、Header、请求、响应、分页、排序、筛选、命名、版本、错误码、权限、日志、导入、附件和安全规则。

当前状态：Phase 5 为 Completed / Approved / Frozen；Task 5.1 至 Task 5.5 与 Phase 5 Final Consistency Review 均为 Completed / Approved。API Master Specification v1.0 已正式冻结，正式接口总数保持 272；Phase 6 为 Waiting / Not Started，当前下一步为等待项目负责人正式启动 Phase 6。

## 2. 正式文档入口

1. [Task 5.1 API 总体规范与安全规则](../phases/phase-05/TASK_5_1_API_DESIGN_PRINCIPLES.md)
2. [Task 5.2 基础资料与采购 API](../phases/phase-05/TASK_5_2_MASTER_DATA_AND_PURCHASE_API.md)
3. [Task 5.3 生产、质量验收与库存 API](../phases/phase-05/TASK_5_3_PRODUCTION_QUALITY_INVENTORY_API.md)
4. [Task 5.4 出入库与跨境业务 API](../phases/phase-05/TASK_5_4_INBOUND_OUTBOUND_CROSS_BORDER_API.md)
5. [Task 5.5 导入、附件、日志、安全与 API 最终收口](../phases/phase-05/TASK_5_5_IMPORT_LOG_SECURITY_API_FINAL.md)
6. [Phase 5 Final Consistency Review](../phases/phase-05/PHASE_5_FINAL_CONSISTENCY_REVIEW.md)

发生冲突时，Frozen 业务规则和 Frozen Database Logical Design v1.1 优先；Task 5.1 提供通用规则，Task 5.2 至 Task 5.5 提供模块契约，本文件提供统一索引与最终规范。

## 3. 接口编号与数量

| Task | 模块与编号 | 数量 | 状态 |
| --- | --- | ---: | --- |
| Task 5.2 | 基础资料 `MD-*` 74；采购 `PUR-*` 29 | 103 | Completed / Approved |
| Task 5.3 | 生产 `PRO-*` 29；验收 `INS-*` 10；库存 `INV-*` 26 | 65 | Completed / Approved |
| Task 5.4 | 入库 `INB-*` 18；出库 `OUT-*` 17；调拨 `TRF-*` 15；跨境 `CBR-*` 22 | 72 | Completed / Approved |
| Task 5.5 | 导入 `IMP-*` 15；附件 `ATT-*` 8；日志 `LOG-*` 4；安全 `SEC-*` 5 | 32 | Completed / Approved |
| 合计 | Phase 5 正式接口 | 272 | Completed / Approved / Frozen |

接口编号在 Phase 5 内唯一且稳定。现有编号不得复用、改义或因排序调整而重新编号。Task 5.4 的海外导入只读投影属于 `CBR-018` 至 `CBR-020`，不在 Task 5.5 重复计数。

## 4. Version 与 Naming

- 第一版基础路径统一为 `/api/v1`；URL 中主版本是唯一 API 版本依据；
- 资源路径使用小写英文复数名词，多个单词以短横线连接；
- JSON 字段使用 lowerCamelCase；数据库映射字段保持 Frozen snake_case；
- ID 使用 UUID 字符串；日期使用 `YYYY-MM-DD`；日期时间使用带时区 ISO 8601；
- 数量、金额、单价和比例使用十进制定点字符串；
- 状态动作使用专用 `POST` 路径，普通更新不得直接覆盖状态；
- 不兼容的路径、字段、类型、错误码或语义变化必须升级主版本。

## 5. Header

| Header | 使用规则 |
| --- | --- |
| `Authorization` | 非公开接口必需；不得写入日志或错误详情 |
| `Content-Type` | JSON 为 `application/json; charset=utf-8`；文件为受控 multipart |
| `Accept` | 默认 `application/json`；下载按允许文件类型 |
| `X-Request-ID` | 客户端可提供合法值，否则服务端生成；贯穿响应与日志 |
| `Idempotency-Key` | 创建、状态动作、库存事务、导入执行、附件上传、导出等高风险写操作必需 |
| `X-Client-Type` | `pc` 或 `wechat-mini-program`；只用于兼容、审计和监控，不作为授权依据 |

禁止用 Header 覆盖 URL 版本、用户、角色、权限、仓库/店铺范围或目标状态。

## 6. Request

- Path、Query、Header、JSON 和文件输入均执行类型、长度、范围、白名单和安全校验；
- 客户端不得提交服务端生成的 ID、编号、汇总、库存余额、审计字段或任意目标状态；
- PATCH 中缺失字段表示不修改，显式 `null` 仅允许清空正式可空字段；
- 所有关联 ID 必须校验存在性、启用状态、主从归属、业务状态和当前用户数据范围；
- 文件请求必须额外校验扩展名、MIME、内容特征、大小、模板和恶意内容；
- 请求字段不得绕过或扩展 Frozen 数据库对象、关系和状态。

## 7. Response

成功响应统一为：

```json
{"success":true,"data":{},"meta":{},"requestId":"req-example"}
```

失败响应统一为：

```json
{"success":false,"error":{"code":"VALIDATION_INVALID_FIELD","message":"请求数据校验失败","details":[]},"requestId":"req-example"}
```

除 `204 No Content` 外均使用统一包装。响应不得暴露密码、Token、Cookie、密钥、SQL、数据库结构、内部路径、堆栈或未脱敏敏感值。

## 8. Pagination、Sorting 与 Filter

- `page` 从 1 开始，默认 1；`pageSize` 默认 20、最大 100；
- `meta` 返回 `page`、`pageSize`、`total`、`totalPages`，只统计授权数据；
- `sortBy` 必须属于接口白名单，`sortOrder` 只允许 `asc` 或 `desc`；
- 关键词统一为 `keyword`；范围条件使用 `From/To/Min/Max` 后缀；
- 状态筛选只允许 Approved/Frozen 正式值；
- 仓库、店铺、厂家和记录范围在查询与聚合前完成权限过滤；
- 空字符串、`null` 与未提供参数的语义不得混用。

## 9. Permission 与状态校验

所有 API 必须组合校验身份认证、功能权限、操作权限、角色有效性、仓库范围、店铺范围、记录级范围、字段权限、状态权限和职责分离。客户端按钮隐藏或 `SEC-005` 权限摘要不能替代服务端逐请求验证。

所有状态变化必须校验当前状态、目标动作、业务前置、版本与下游事实，并原子写状态历史、审批记录和审计日志。不得创造新状态，不得用页面提示或导入结果替代数据库状态。

## 10. ErrorCode

错误码统一采用大写英文与下划线，分类如下：

| 分类 | 范围 |
| --- | --- |
| `AUTH_*` | 登录、凭证、Token 和 Session |
| `PERMISSION_*` | 功能、操作、数据及字段权限 |
| `VALIDATION_*` | 格式、必填、类型、精度及业务校验 |
| `RESOURCE_*` | 资源不存在、停用或不可用 |
| `STATE_*` | 当前状态不允许动作或下游阻塞 |
| `CONFLICT_*` | 并发、幂等、版本、唯一和重复执行 |
| `INVENTORY_*` | 库存不足、负库存和库存事务 |
| `IMPORT_*` | 文件、模板、校验、重复和执行 |
| `ATTACHMENT_*` | 附件安全与历史保护 |
| `SECURITY_*` | 重放、IP 策略、限流和安全拒绝 |
| `SYSTEM_*` | 未预期错误与暂时不可用 |

错误码含义发布后保持稳定；字段级详情不得包含内部实现或完整敏感值。

## 11. Idempotency 与并发

- 同一认证主体、方法、规范路径和幂等键的相同请求返回首次结果；同键不同请求返回 409；
- 正式单据更新使用现有 `versionNo`，无版本字段对象使用 `updatedAt`、当前状态、唯一约束和事务；
- 库存事务、导入执行和跨仓动作必须在原子事务内完成余额、流水、来源状态和审计；
- 禁止重复库存流水、重复导入成功行、重复附件关联和重复审批；
- 幂等、锁、隔离级别和持久化介质的技术选择后置，不新增数据库字段或表。

## 12. Import

导入统一使用 `IMP-001` 至 `IMP-015`，覆盖任务创建、查询、详情、状态、取消、模板与版本、模板校验、数据校验、执行、失败行重试、结果、历史和导出。

导入必须执行字段、数据、唯一、外键、状态和权限校验。海外仓库存只能由 Task 5.5 正式 Excel 导入结果形成；执行必须合法匹配跨境发货和在途库存，原子减少在途仓、增加海外仓、追加流水并保留来源追溯。不得建立历史余额快照或手工海外收货。

## 13. Attachment

附件统一使用 `ATT-001` 至 `ATT-008`，覆盖上传、查询、详情、下载、关联、解除、删除和生命周期。采购、生产、验收、入库、出库、调拨、跨境均复用 `attachments` 和 `attachment_links`。

统一使用 `attachmentId`、`objectType`、`objectId`、适用的 `objectItemId`、只读派生 `version`、实时计算 `permission` 和抽象 `storageStrategy`。文件本体不写数据库，响应不暴露存储路径或凭证。正式历史附件不得破坏性删除。

## 14. Log

Audit Log、Operation Log、Import Log、Export Log、Login Log 和 Security Log 统一通过 `LOG-001` 至 `LOG-004` 查询、链路追踪和导出，正式持久化复用 `audit_logs` 及适用导入对象。

统一投影 `requestId`、`traceId`、`correlationId`、`operator`、`ip`、`userAgent`、`timestamp`、`logLevel`、`action`、`object`、`objectId`、`result`。不存在独立 Frozen 字段的值必须按 Task 5.5 规则派生，不得伪造历史事实。日志只追加，不提供修改或删除 API。

## 15. Security

`SEC-001` 至 `SEC-005` 定义登录、刷新、登出、当前会话和当前权限能力。Authentication、Authorization、Token、Refresh Token、Session、Permission Validation、Replay Protection、Idempotency、Rate Limit、IP White List 和 Header 安全规则适用于全部 272 个接口。

Token、Session、网关、限流器、IP 配置及安全遥测的技术实现留待后续阶段，不新增认证、会话、IP 或日志数据库表。生产环境必须使用 HTTPS，并执行最小权限、数据脱敏、文件安全、输入白名单和安全错误处理。

## 16. Phase 5 冻结结论

1. Task 5.1 至 Task 5.5 为 Completed / Approved；
2. Phase 5 Final Consistency Review 为 Completed / Approved；
3. Phase 5 为 Completed / Approved / Frozen；
4. Phase 5 当前共登记 272 个正式接口；
5. 本文件已升级为 API Master Specification；
6. 未修改 Frozen 数据库，未新增字段、表、状态、关系或业务对象；
7. 未创建真实 API，未编写业务代码；
8. 272 个正式接口的编号、路径、方法、状态、权限、安全及 Frozen 映射已经完成一致性复核；
9. API Master Specification v1.0 是 Phase 6 及后续阶段唯一 API 事实来源；后续不得直接修改，如需变更必须经过正式 DCR 或 Change Request；
10. 禁止通过 Phase 6 文档、页面代码或实现代码绕过本规范；当前下一步为等待项目负责人正式启动 Phase 6。
