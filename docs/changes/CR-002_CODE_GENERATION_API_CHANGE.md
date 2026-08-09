---
document_name: CR-002 自动编码 API 合同变更
project: Violin ERP Lite
cr_id: CR-002
type: API Contract Change
status: Approved
owner: Project Manager
created_date: 2026-08-09
related_issue: UAT-009
---

# Change Request

编号：

CR-002

类型：

API Contract Change

主题：

Allow Server-side Code Generation

## 审批信息

Approved By：

Project Owner

Approval Date：

2026-08-09

Approval Scope：

批准自动编码第一阶段 API Contract 调整。

包含：

- Product Code
- SKU Code
- Supplier Code
- Manufacturer Code
- Warehouse Code

暂不包含：

- Category Code
- Brand Code
- Platform Code
- Store Code

## 当前问题

当前基础资料 Create DTO 要求 `code` 字段必填。

这导致：

- 普通业务用户必须手工填写编码；
- 前端必须暴露编码字段；
- 批量录入时容易出现重复或格式不统一；
- 与 UAT-009 的自动编码目标冲突。

## 调整目标

Create Request：

- 编码字段可选；
- 未提交编码时由服务端自动生成；
- 提交编码时继续支持旧客户端兼容。

服务端：

- 按 CR-001 批准后的业务规则生成编码；
- 保证编码唯一；
- 保证并发安全；
- 生成失败时返回明确错误。

Response：

- 返回最终编码；
- Response 结构保持兼容，仅字段取值从“客户端提交值”变为“最终服务端确认值”。

## 影响范围

涉及 API：

- Category API
- Brand API
- Product API
- SKU API
- Supplier API
- Manufacturer API
- Warehouse API
- Platform API
- Store API

重点影响：

- Create DTO 中 `code` 字段由必填调整为可选；
- 前端表单校验可改为不要求普通用户填写编码；
- Repository / Service 创建逻辑需在缺少编码时调用编号生成能力；
- Response 必须返回最终生成或保留的编码。

## 兼容策略

- 旧客户端继续提交编码时，服务端继续接受；
- 旧客户端提交重复编码时，继续返回冲突错误；
- 新客户端不提交编码时，服务端生成；
- 导入场景可按批准规则提交外部编码；
- API 路径、分页结构、错误响应结构不因本 CR 改变。

## 错误处理建议

优先复用现有错误响应结构。

如现有错误码不足，实施前需在 API CR 审批中明确新增或复用策略。

建议覆盖：

- 编码规则不存在；
- 编码格式非法；
- 编码重复；
- 编码生成失败；
- 并发生成冲突重试耗尽。

## 验收标准

- Create Request 不提交编码时创建成功；
- Response 返回最终编码；
- 旧客户端提交合法编码时创建成功；
- 重复编码返回明确冲突错误；
- 并发创建不产生重复编码；
- DTO、Response 和 Error Contract 更新到 API SSOT 后再进入实现；
- 不新增未经批准的 API Path。

## 审批结论

当前状态：

Approved

已批准进入第一阶段 API SSOT 同步与实现。第一阶段仅覆盖 Product、SKU、Supplier、Manufacturer、Warehouse 的 Create DTO 编码字段可选与服务端自动生成；Category、Brand、Platform、Store 暂不纳入本轮实现。
