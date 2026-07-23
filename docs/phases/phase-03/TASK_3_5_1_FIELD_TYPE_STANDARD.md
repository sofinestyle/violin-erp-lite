---
document_name: Task 3.5.1 字段数据类型规范
project: Violin ERP Lite
version: 1.0
status: Approved
owner: Project Manager
created_date: 2026-07-19
updated_date: 2026-07-23
related_phase: Phase 3
---

# Task 3.5.1：字段数据类型规范（Field Type Standard）

## 1. 任务信息

| 项目 | 内容 |
| --- | --- |
| 所属阶段 | Phase 3：数据库设计（Database Design） |
| 所属任务 | Task 3.5：字段类型、约束与索引设计（In Progress） |
| 当前小任务 | Task 3.5.1：字段数据类型规范 |
| 前置任务 | Task 3.4：字段结构设计（Completed / Approved） |
| 文档状态 | Approved |
| 小任务状态 | Completed / Approved |
| 下一小任务 | Task 3.5.2：主键与唯一约束设计（Not Started） |

## 2. 任务范围

本任务负责：

- 建立数据库无关的逻辑字段类型规范；
- 确定字段长度标准；
- 确定数量、金额、税率和百分比精度；
- 确定日期和时间字段类型；
- 确定主键和外键的逻辑类型；
- 确定布尔值（BOOLEAN）、枚举（ENUM）、JSON 和文件字段规范；
- 明确敏感字段和只追加表的数据类型原则。

本任务不负责：

- 主键和唯一约束具体清单；
- 外键删除策略；
- 索引设计；
- 检查约束（Check Constraint）；
- SQL；
- 对象关系映射（Object-Relational Mapping，ORM）；
- 数据库选型；
- 数据库模式（Database Schema）；
- 数据迁移文件（Migration）；
- 页面、API 或业务代码。

## 3. 标准逻辑类型

| 逻辑类型 | 适用范围 |
| --- | --- |
| `UUID` | 主键、外键及对象引用 |
| `STRING` | 编码、名称、状态和短文本 |
| `TEXT` | 备注、描述、地址和错误详情 |
| `INTEGER` | 行号、排序、天数和次数 |
| `BIG_INTEGER` | 文件大小等较大整数 |
| `DECIMAL` | 数量、金额、税率和百分比 |
| `BOOLEAN` | 是否类字段 |
| `DATE` | 纯业务日期 |
| `DATETIME` | 精确操作时间 |
| `JSON` | 导入原始数据和审计快照 |
| `ENUM` | 状态、类型、方向及级别 |

统一原则：

1. 逻辑类型不绑定具体数据库。
2. 金额和数量不得使用浮点类型。
3. JSON 不得替代正式关系表或明细表。
4. 正式日期与时间不得使用普通字符串保存。

## 4. 主键与外键逻辑类型

所有正式表的 `id` 统一采用 `UUID`，优先采用 UUID v7。

采用 UUID v7 的理由：

- 全局唯一；
- 大致按时间有序；
- 适合未来导入、离线生成和跨系统同步；
- 相比完全随机 UUID 更利于索引组织。

所有 `*_id` 字段必须与目标表主键保持相同的 `UUID` 类型。

禁止：

- UUID 主键搭配整数外键；
- 使用业务编码代替正式对象引用；
- 使用名称字段作为关系依据。

本任务只确认主键与对象引用的逻辑类型，不定义主键、外键或唯一约束的具体清单及物理实现。

## 5. 字符串长度标准

### 5.1 编码和标识

| 字段类别 | 逻辑类型 |
| --- | --- |
| 普通业务编码 `*_code` | `STRING(50)` |
| SKU 编码 | `STRING(100)` |
| 条码 | `STRING(100)` |
| 单据编号 `document_no` | `STRING(50)` |
| 付款编号、任务编号、流水编号、预警编号 | `STRING(50)` |
| 外部订单号、退货号、物流单号 | `STRING(100)` |
| 国家代码 | `STRING(2)` |
| 币种代码 | `STRING(3)` |

国家代码参考 ISO 3166-1 alpha-2，币种代码参考 ISO 4217。本任务只确认逻辑长度，不引入技术依赖。

### 5.2 名称和文本

| 字段类别 | 逻辑类型 |
| --- | --- |
| 中文名称 | `STRING(200)` |
| 简称 | `STRING(100)` |
| 英文名称 | `STRING(300)` |
| 用户名、角色编码、权限编码 | `STRING(100)` |
| 联系电话 | `STRING(50)` |
| 电子邮箱 | `STRING(254)` |
| 地址 | `STRING(500)` |
| 普通备注 | `STRING(1000)` |
| 详细描述及错误详情 | `TEXT` |
| 文件名 | `STRING(255)` |
| 文件存储引用 | `STRING(1000)` |

### 5.3 状态和类型

| 字段类别 | 逻辑类型 |
| --- | --- |
| `*_status` | `STRING(50)` 或逻辑 `ENUM` |
| `*_type` | `STRING(50)` 或逻辑 `ENUM` |
| 操作代码、模块代码 | `STRING(100)` |
| 处理方式、结算方式 | `STRING(50)` |
| 访问级别 | `STRING(30)` |

## 6. 数值类型标准

### 6.1 数量

所有业务数量统一采用 `DECIMAL(18,4)`，适用于：

- 采购数量；
- 生产数量；
- 入库、出库和退货数量；
- 库存数量；
- 调拨、盘点和调整数量；
- 匹配及差异数量；
- 安全库存数量。

当前业务主要使用件、只、套等单位，但保留四位小数以兼容未来重量、长度或换算单位。

### 6.2 金额和单价

金额和单价统一采用 `DECIMAL(18,4)`，适用于：

- 单价；
- 行金额；
- 总金额；
- 付款金额；
- 库存成本；
- 损失金额。

显示小数位可按币种处理，数据库逻辑精度统一保留四位小数。金额不得使用浮点类型。

### 6.3 税率和百分比

税率和百分比统一采用 `DECIMAL(7,4)`，并保存实际百分数值：

- `13.0000` 表示 13%；
- `75.5000` 表示 75.5%。

适用字段包括 `tax_rate`、`completion_percentage` 和 `progress_percentage`。

### 6.4 计数、顺序和天数

以下字段采用 `INTEGER`：

- `line_no`；
- `sort_order`；
- `lead_time_days`；
- `failed_login_count`；
- `total_rows`；
- `success_rows`；
- `failed_rows`；
- `warning_rows`；
- 各类记录数量统计。

### 6.5 文件大小

文件大小采用 `BIG_INTEGER`，单位统一为字节。

## 7. 日期和时间类型

### 7.1 `DATE`

纯业务日期采用 `DATE`，包括：

- `document_date`；
- `payment_date`；
- `inspection_date`；
- `return_date`；
- `count_date`；
- `departure_date`；
- `expected_delivery_date`；
- `expected_completion_date`；
- `effective_from`；
- `effective_to`；
- 其他不需要时分秒的业务日期。

### 7.2 `DATETIME`

准确操作时间采用 `DATETIME`，包括：

- `created_at`；
- `updated_at`；
- `submitted_at`；
- `approved_at`；
- `cancelled_at`；
- `transaction_at`；
- `generated_at`；
- `handled_at`；
- `completed_at`；
- `last_login_at`；
- 其他需要准确时间追溯的字段。

统一规则：

1. 系统时间由后端生成。
2. 数据库存储使用统一时区。
3. 前端按用户时区展示。
4. 后续数据库选型时优先采用带时区时间类型。
5. 正式日期和时间不使用普通字符串保存。

## 8. BOOLEAN 规范

是否类字段统一采用 `BOOLEAN`，包括：

- `is_active`；
- `is_cross_border`；
- `is_preferred`；
- `is_system_role`；
- `is_sensitive`；
- `must_change_password`；
- `freeze_inventory`；
- `allows_available_stock`；
- `attachment_required`。

建议默认值：

| 字段 | 建议默认值 |
| --- | --- |
| `is_active` | `true` |
| `is_preferred` | `false` |
| `is_sensitive` | `false` |
| `must_change_password` | `true` |

其他字段是否设置默认值由后续约束设计确定。

## 9. ENUM 规范

以下字段采用逻辑 `ENUM`：

- `status`；
- `approval_status`；
- `warehouse_type`；
- `product_type`；
- `platform_type`；
- `source_type`；
- `inbound_type`；
- `outbound_type`；
- `transaction_type`；
- `direction`；
- `inventory_condition`；
- `disposition_method`；
- `alert_level`；
- `alert_status`；
- `access_level`；
- `backup_type`；
- `trigger_type`。

规则：

1. 枚举代码统一使用小写英文及下划线。
2. 数据库存储稳定代码，不存中文显示名称。
3. 中文名称由应用层字典转换。
4. 已正式使用的枚举代码不得直接改名。
5. 已完成正式补全的枚举值集合统一以 [数据库枚举规范](../../03-data/DATABASE_ENUM_SPEC.md) 为唯一入口，本文件不重复维护。

代码形式示例：`draft`、`submitted`、`approved`、`completed`、`cancelled`。

## 10. JSON 规范

允许正式使用 JSON 的字段：

| 表 | 字段 |
| --- | --- |
| `import_task_items` | `raw_data` |
| `audit_logs` | `before_snapshot` |
| `audit_logs` | `after_snapshot` |

后续可评估使用 JSON 的内容：

- 设备信息；
- 扩展错误上下文；
- 外部平台原始响应快照。

禁止使用 JSON 保存：

- 单据明细；
- SKU 列表；
- 用户角色关系；
- 仓库或店铺权限；
- 正式库存余额；
- 能通过正式关系表表达的数据。

## 11. 密码及敏感字段

### 11.1 密码

`password_hash` 采用 `STRING(255)`，只保存密码哈希。

不得保存：

- 明文密码；
- 可逆加密密码；
- 密码提示答案。

### 11.2 银行及税务信息

以下字段建议采用 `STRING(255)`：

- `tax_identifier`；
- `bank_name`；
- `bank_account_name`；
- `bank_account_no`；
- `payee_account_snapshot`。

后续实现必须支持加密存储、页面脱敏、权限控制以及查看与修改审计。

### 11.3 个人信息

姓名、电话、邮箱和地址采用对应字符串或文本类型，同时标记为敏感业务字段，并纳入后续权限、脱敏和审计控制。

## 12. 文件字段规范

| 字段 | 逻辑类型 |
| --- | --- |
| `original_file_name` | `STRING(255)` |
| `stored_file_name` | `STRING(255)` |
| `file_extension` | `STRING(20)` |
| `mime_type` | `STRING(100)` |
| `file_size` | `BIG_INTEGER` |
| `storage_reference` | `STRING(1000)` |
| `file_reference` | `STRING(1000)` |
| `checksum` | `STRING(128)` |

文件本体不得直接保存至数据库，仅保存文件元数据和存储引用。

## 13. 库存类型规范

`inventories` 的以下数量字段统一采用 `DECIMAL(18,4)`：

- `on_hand_quantity`；
- `available_quantity`；
- `reserved_quantity`；
- `pending_quantity`。

`inventory_transactions` 的以下数量字段同样采用 `DECIMAL(18,4)`：

- `quantity`；
- `quantity_before`；
- `quantity_after`。

不得增加 `in_transit_quantity`。在途库存继续通过在途类型 `warehouses` 节点表达。

## 14. 审计和只追加表

以下表继续执行只追加原则：

- `inventory_transactions`；
- `audit_logs`；
- `document_status_histories`；
- `approval_records`。

类型规则：

- `id`：`UUID`；
- 发生时间：`DATETIME`；
- 对象引用：`UUID`；
- 快照：`JSON` 或受控字符串；
- 不设置 `updated_at`；
- 不设置 `updated_by`；
- 不设置 `is_deleted`；
- 不设置删除时间或删除用户字段。

## 15. Task 3.5.1 正式结论

1. 项目采用数据库无关的逻辑字段类型规范。
2. 所有主键及外键采用 UUID，优先 UUID v7。
3. 普通数量统一采用 `DECIMAL(18,4)`。
4. 金额及单价统一采用 `DECIMAL(18,4)`。
5. 税率及百分比统一采用 `DECIMAL(7,4)`。
6. 计数、排序和天数采用 `INTEGER`。
7. 文件大小采用 `BIG_INTEGER`，单位为字节。
8. 纯业务日期采用 `DATE`，准确操作时间采用 `DATETIME`。
9. 状态和类型使用受控枚举代码。
10. JSON 仅用于导入原始数据和审计快照等非固定数据。
11. 文件本体不直接保存至数据库。
12. 密码只保存密码哈希。
13. 银行、税务和个人信息作为敏感字段处理。
14. 只追加表不得设置更新和删除字段。
15. 本任务不确定主键、外键、唯一约束、索引和 Check 约束具体清单。
16. 本任务不选择数据库，不编写 SQL、ORM、Schema 或 Migration。
17. Task 3.5.1 作为 Task 3.5.2 主键与唯一约束设计的正式输入。

## 16. 状态与后续小任务边界

- Phase 3：In Progress；
- Task 3.4：Completed / Approved；
- Task 3.5：In Progress；
- Task 3.5.1：Completed / Approved；
- Task 3.5.2：Not Started；
- 字段名称设计：Completed / Approved；
- 字段类型规范：Completed / Approved；
- 主键和唯一约束清单、外键策略、索引及 Check 约束：Not Started；
- SQL、ORM、Schema、Migration 和技术开发：Not Started。

Task 3.5.1 验收通过前不得启动 Task 3.5.2。本任务不定义具体唯一约束、外键删除策略、索引或 Check 约束，不进入任何物理实现或业务开发。
