# CR-005 品牌安全删除

类型：API Contract Change / 已有安全删除范围扩展

状态：Approved

Product Manager Review Completed：2026-09-07。提交前整改要求已批准：品牌删除仅限 administrator；全部基础资料删除与审计必须处于同一 Prisma 事务；保留本批既有修复，统一提交。UAT 保持 Fixed / Pending Manual Verification。

Approved By：Project Owner

Approval Date：2026-09-07

审批依据：项目负责人明确批准品牌安全删除方案，并要求实施及测试。

## 1. 批准范围

将品牌加入既有基础资料安全删除范围。新增 `MD-081 DELETE /api/v1/brands/{id}`，仅 administrator 可执行，复用标准响应、错误码和审计。`master.brand.update` 只负责编辑，不授予品牌物理删除资格。平台与店铺仍不开放删除。

## 2. 业务规则

- 无产品引用的品牌允许删除，启用或停用状态均可；保留原有启用/停用生命周期。
- 存在任意产品引用（包括已停用产品）时拒绝删除，提示“该品牌已被产品引用，无法删除，请停用。”。
- 系统品牌按既有 `SYS-`、`SYSTEM-` 编码规则保护，提示“系统数据不可删除。”。
- 非 administrator 不显示删除按钮，服务端从正式认证上下文独立校验 administrator 角色，禁止用权限集合或客户端提交角色替代。
- 所有七类基础资料的删除与成功审计通过同一 Prisma 事务提交；审计失败时删除回滚，删除失败时不得写成功审计。
- 删除前二次确认：“删除后无法恢复，确认删除吗？”；成功后刷新列表并写入审计。
- 检查引用后若并发新增产品引用，由既有外键约束阻止删除，返回同一业务引用提示。

## 3. 影响分析

API：Required，仅增加品牌 DELETE 方法契约；不增加 DTO、Response 字段或 Error Code。

Database：No Change，复用 `brands`、`products.brand_id` 及现有外键，不新增 Schema 或 Migration。

Permission Code / Permission SSOT：No Change；品牌删除收紧为已批准 administrator 角色边界，其余六类沿用既有权限。

系统数据识别：`SYS-` / `SYSTEM-` 为当前版本临时保护规则；未来预置数据扩大时另行设计正式 system-data 标识。

历史数据：不批量清理、不改变品牌编码或产品关联，不删除任何业务单据。

## 4. 验收要求

验证无引用删除成功、产品引用阻断、停用产品引用阻断、系统品牌保护、无权限阻断、审计对象准确、并发外键拒绝业务化，以及页面二次确认/取消/成功/失败反馈。自动测试通过后标记 Fixed / Pending Manual Verification，不代替人工验收。
