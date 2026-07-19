---
document_name: Task 3.5.6 数据库命名规范
project: Violin ERP Lite
version: 1.0
status: Approved
owner: Project Manager
created_date: 2026-07-20
updated_date: 2026-07-20
related_phase: Phase 3
---

# Task 3.5.6：数据库命名规范（Database Naming Standard）

## 1. 任务信息

| 项目 | 内容 |
| --- | --- |
| 所属阶段 | Phase 3：数据库设计（Database Design，In Progress） |
| 所属任务 | Task 3.5：字段类型、约束与索引设计（In Progress） |
| 当前小任务 | Task 3.5.6：数据库命名规范 |
| 前置小任务 | Task 3.5.5：Check 约束设计（Completed / Approved） |
| 文档状态 | Approved |
| 小任务状态 | Completed / Approved |
| 下一小任务 | Task 3.5.7：Database Freeze（In Progress） |

## 2. 任务范围

本任务统一数据库逻辑表、字段、时间日期、布尔、编码编号、数量金额比率、快照、状态、约束、索引及枚举值的命名规则，并检查已批准名称的兼容性。

本任务不重命名 60 张正式表或 Task 3.4 已批准字段，不新增或删除字段，不定义完整枚举集合，不编写 SQL、Schema 或 Migration，也不选择数据库或 ORM。

## 3. 表名规范

正式表名统一使用：

- 小写英文；
- `snake_case`；
- 复数形式；
- 能直接表达业务对象或关系用途的完整名称。

正确示例：`purchase_orders`、`inventory_transactions`、`production_completion_record_items`。

禁止形式：`PurchaseOrder`、`purchaseOrder`、`tbl_purchase_order`、`t_purchase_order`。

Task 3.3 和 Task 3.4 已批准的 60 张正式表全部符合小写、`snake_case` 和复数形式要求，其名称保持不变。

## 4. 字段名规范

字段名统一使用小写英文和 `snake_case`。

- 主键统一为 `id`；
- 普通外键优先使用 `<实体单数>_id`；
- 角色外键必须体现角色，例如 `source_warehouse_id`、`destination_warehouse_id`、`return_warehouse_id`、`inspection_warehouse_id`；
- 受控多态字段使用 `<object>_type`、`<object>_id`、`<object>_item_id` 结构；
- 不使用名称字段代替稳定对象引用；
- 不得为了形式美化而新增平行字段。

Task 3.4 已批准的角色字段和多态字段继续作为正式名称，不因本规范重命名。

## 5. 时间、日期与有效期

| 语义 | 命名形式 | 示例 |
| --- | --- | --- |
| 准确操作时间点 | `*_at` | `created_at`、`approved_at`、`completed_at` |
| 纯业务日期 | `*_date` | `document_date`、`payment_date`、`inspection_date` |
| 生效起止 | `effective_from`、`effective_to` | 合作关系有效期 |
| 截止时间 | 已批准时可使用 `*_until` | `locked_until`、`retention_until` |

新字段默认遵守时间点和业务日期规则；已批准的 `*_until` 表达截止边界，作为兼容项保留。

## 6. 布尔字段

新增布尔字段优先使用明确语义前缀：

- `is_`；
- `has_`；
- `allows_`；
- `must_`；
- `can_`。

示例：`is_active`、`is_preferred`、`is_sensitive`、`allows_available_stock`、`must_change_password`。

不得新增含义模糊的 `flag` 或无业务语义布尔字段。Task 3.4 已批准的 `freeze_inventory` 和 `attachment_required` 作为兼容项保留，不在本任务直接重命名。

## 7. 编码、编号和外部标识

| 语义 | 命名形式 | 示例 |
| --- | --- | --- |
| 主数据编码 | `*_code` | `product_code`、`sku_code`、`warehouse_code` |
| 正式单据编号 | `document_no` | 各正式业务单据 |
| 专用编号 | 语义名 + `_no` | `payment_no`、`transaction_no`、`task_no`、`alert_no` |
| 批次编号 | `*_batch_no` 或正式批次字段 | `completion_batch_no`、`shipment_batch_no` |
| 外部系统标识 | `external_*` | `external_order_no`、`external_store_id` |

编码、编号和外部标识不得替代 UUID 主键。

## 8. 数量、金额、价格、成本和比率

| 语义 | 命名形式 | 示例 |
| --- | --- | --- |
| 通用数量 | `quantity`、`*_quantity` | `total_quantity`、`available_quantity` |
| 单价 | `unit_price` 或明确业务前缀 | `processing_unit_price` |
| 金额 | `amount`、`*_amount` | `total_amount`、`tax_amount` |
| 成本 | `unit_cost`、`line_cost` | 已批准成本字段 |
| 比率 | `*_rate` | `tax_rate` |
| 百分比 | `*_percentage` | `completion_percentage` |

禁止新增 `qty`、`amt`、`num`、`money`、`price_value` 等模糊或无必要缩写。已批准的成本字段表达与金额不同的成本语义，保持不变。

## 9. 快照与历史字段

历史快照统一使用 `*_snapshot`，例如：

- `sku_code_snapshot`；
- `sku_name_snapshot`；
- `specification_snapshot`；
- `before_snapshot`；
- `after_snapshot`；
- `object_no_snapshot`。

快照字段用于保留业务发生时事实，不得改成当前主数据名称或关系字段。

## 10. 状态和类型字段

- 通用当前状态使用 `status`；
- 审核状态使用 `approval_status`；
- 对象专用状态使用明确业务前缀，例如 `payment_status`、`alert_status`；
- 类型字段使用明确的 `*_type`；
- 禁止 `flag`、`type1`、`state2` 等无业务语义名称。

## 11. 约束和索引命名

| 对象 | 命名形式 |
| --- | --- |
| 主键 | `pk_<table>` |
| 单字段唯一约束 | `uq_<table>_<field>` |
| 组合唯一约束 | `uq_<table>_<field1>_<field2>` |
| 外键 | `fk_<table>_<field>` |
| Check 约束 | `ck_<table>_<rule>` |
| 单字段普通索引 | `idx_<table>_<field>` |
| 组合普通索引 | `idx_<table>_<field1>_<field2>` |

Task 3.5.2 至 Task 3.5.5 已批准的约束和索引名称遵循上述前缀规则。物理数据库标识符长度适配留待后续具备相应范围和正式授权的阶段确定，不改变逻辑名称语义。

## 12. 枚举值命名

枚举值统一使用小写英文和 `snake_case`，例如 `draft`、`pending_approval`、`in_progress`、`partially_completed`、`completed`、`cancelled`。

本任务只确认格式，不确定每个字段的完整枚举集合，不将示例自动写入正式枚举。

## 13. 缩写规则

允许使用行业或技术通用缩写：`id`、`sku`、`api`、`url`、`json`、`ip`。

原则上禁止新增：`prod`、`supp`、`mfr`、`wh`、`stat`、`qty`、`amt`、`cfg`、`desc`。

现有 60 张正式表和 Task 3.4 字段中未发现上述禁止缩写被用于替代完整业务名称。

## 14. 已批准兼容项

检查发现以下已批准名称与新字段默认规则存在形式差异，但业务语义明确，保持兼容：

| 兼容项 | 原因 | 处理 |
| --- | --- | --- |
| `freeze_inventory` | 已批准布尔字段，未使用推荐前缀 | 保持现名，不新增别名 |
| `attachment_required` | 已批准布尔字段，未使用推荐前缀 | 保持现名，不新增别名 |
| `locked_until`、`retention_until` | 表达截止边界而非事件发生时间 | 保持现名 |
| `unit_cost`、`line_cost` | 表达成本语义，不等同于普通金额 | 保持现名 |
| `reported_by_name` | 保存外部报告人姓名而非正式用户外键 | 保持现名，不改为 `*_id` |

兼容项不是本任务的重命名授权。未来如需调整，必须提交 Database Change Request，分析历史数据、接口、页面、迁移和兼容影响并获得批准。

## 15. 命名审计结论

- 已检查正式表：60 张；
- 修改表名：0 张；
- 新增、删除或重命名字段：0 个；
- 发现兼容项：5 类；
- 发现禁止缩写替代完整业务名称：0 项；
- 新增别名或平行字段：0 个。

## 16. 正式结论

1. 表名统一使用小写、`snake_case` 和复数形式。
2. 字段名统一使用小写 `snake_case`。
3. 主键统一为 `id`。
4. 外键使用实体单数名加 `_id`，角色外键必须保留角色前缀。
5. 时间点使用 `*_at`，业务日期使用 `*_date`。
6. 布尔字段优先使用明确语义前缀。
7. 编码使用 `*_code`，编号使用 `*_no`。
8. 数量、金额、价格、成本和比率使用完整英文语义。
9. 快照字段使用 `*_snapshot`。
10. 约束及索引使用统一前缀。
11. 枚举值统一使用小写 `snake_case`。
12. 禁止无意义缩写。
13. 已批准表名和字段名不得擅自重命名。
14. 不一致项进入 Database Change Request 流程。
15. Task 3.5.6 作为 Task 3.5.7 Database Freeze 的正式输入。

## 17. 状态与边界

- Phase 3：In Progress；
- Task 3.5：In Progress；
- Task 3.5.6：Completed / Approved；
- Task 3.5.7：In Progress；
- SQL、ORM、Schema、Migration、数据库选型及技术开发：Not Started。

Task 3.5.6 已完成。Task 3.5.7 按数据库设计冲刺进入 In Progress；本文件不提前关闭 Task 3.5 或 Phase 3。
