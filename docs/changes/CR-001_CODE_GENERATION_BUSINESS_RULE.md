---
document_name: CR-001 自动编码业务规则变更
project: Violin ERP Lite
cr_id: CR-001
type: Business Rule Change
status: Approved
owner: Project Manager
created_date: 2026-08-09
related_issue: UAT-009
---

# Change Request

编号：

CR-001

类型：

Business Rule Change

主题：

Automatic Code Generation Business Rules

## 审批信息

Approved By：

Project Owner

Approval Date：

2026-08-09

Approval Scope：

批准自动编码第一阶段实施。

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

当前基础资料编码由用户人工输入：

- Category
- Brand
- Product
- SKU
- Manufacturer
- Supplier
- Warehouse
- Platform
- Store

问题：

- 人工维护成本高；
- 格式不统一；
- 容易重复；
- 不符合 ERP 最佳实践；
- 普通业务用户需要理解内部编码规则，增加录入负担；
- 后续采购、生产、库存和销售流程依赖基础资料编码，错误编码会放大为业务追踪问题。

## 目标

实现服务端自动生成编码，使基础资料创建时普通业务用户无需手工维护正式业务编码。

目标包括：

- 编码由服务端统一生成；
- 编码唯一且可追踪；
- 创建后默认不可随意修改；
- 支持历史数据兼容；
- 支持导入场景兼容；
- 支持并发创建时不重复；
- 不使用前端随机值、时间戳或无锁 `max(code) + 1`。

## 编码规则

### 普通编码

| 对象 | 编码示例 | 说明 |
|---|---:|---|
| Category | CAT-000001 | 产品分类编码 |
| Brand | BRD-000001 | 品牌编码 |
| Product | PRD-000001 | 产品编码 |
| Manufacturer | MFR-000001 | 生产厂家编码 |
| Supplier | SUP-000001 | 供应商编码 |
| Warehouse | WH-000001 | 仓库编码 |
| Platform | PLT-000001 | 平台编码 |
| Store | STR-000001 | 店铺编码 |

### SKU 编码

SKU 使用业务组合编码：

```text
型号-尺寸-颜色
```

示例：

```text
L2-44-BK
```

建议组成：

- 型号：来自 Product 的型号或经批准的产品型号字段；
- 尺寸：使用业务标准值，例如 `44` 表示 `4/4`；
- 颜色：使用经批准的颜色简称，例如 `BK` 表示黑色，`NAT` 表示原木色。

如同一业务组合发生冲突，应由服务端按批准规则处理，例如增加短序号后缀，并在响应中返回最终编码。

## 规则

- 服务端生成；
- 唯一；
- 不允许重复；
- 创建后不可随意修改；
- 支持历史数据兼容；
- 支持旧客户端继续提交编码；
- 支持导入数据保留外部编码；
- 前端不得生成正式业务编码；
- 禁止无并发保护的 `max(code) + 1`；
- 编码生成失败时必须返回明确错误，不得静默生成错误编码。

## 历史数据兼容

- 已存在编码继续保留；
- 已存在空编码或异常编码的数据需在实施阶段单独评估；
- 历史数据补码不得覆盖已被业务引用的正式编码；
- 历史数据迁移或修复必须保留审计记录。

## 导入兼容

- 导入文件中包含外部编码时，服务端应支持按规则校验并保留；
- 导入文件未包含编码时，可由服务端生成；
- 导入冲突时应隔离错误行，不影响其他合法行；
- 导入结果必须返回最终编码。

## 风险

- SKU 编码需要正式确认型号、尺寸、颜色来源；
- 历史数据可能存在不规范编码；
- 多实例部署下并发生成需要数据库级保护；
- API Create DTO 从必填变可选会影响前端校验和接口文档；
- 若允许导入外部编码，需要明确格式校验和冲突处理规则。

## 验收标准

- Category、Brand、Product、SKU、Manufacturer、Supplier、Warehouse、Platform、Store 创建时可不提交编码；
- 服务端返回最终编码；
- 并发创建不产生重复编码；
- 编码唯一约束仍有效；
- 旧客户端提交合法编码仍可创建；
- 非法编码或重复编码返回明确错误；
- 前端不再要求普通用户手工输入可自动生成的编码；
- 自动编码不改变现有数据库事实来源、权限模型和业务状态机。

## 审批结论

当前状态：

Approved

已批准进入第一阶段实现。第一阶段仅覆盖 Product Code、SKU Code、Supplier Code、Manufacturer Code、Warehouse Code；Category Code、Brand Code、Platform Code、Store Code 暂不纳入本轮实现。
