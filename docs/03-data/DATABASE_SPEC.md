---
document_name: 数据库规格
project: Violin ERP Lite
version: 1.0
status: Draft
owner: Project Manager
created_date: 2026-07-19
updated_date: 2026-07-20
related_phase: Phase 1
---

# DATABASE SPEC

Phase 3 数据库设计（Database Design）已正式启动，当前状态为 In Progress。

Task 3.1 业务对象到数据库实体映射、Task 3.2 实体关系详细设计、Task 3.3 数据表结构设计、Task 3.4 字段结构设计、Task 3.5.1 字段数据类型规范与 Task 3.5.2 主键与唯一约束设计均已完成并获得批准。正式成果参见 [Task 3.1 业务对象到数据库实体映射](../phases/phase-03/TASK_3_1_ENTITY_MAPPING.md)、[Task 3.2 实体关系详细设计](../phases/phase-03/TASK_3_2_ENTITY_RELATIONSHIP_DESIGN.md)、[Task 3.3 数据表结构设计](../phases/phase-03/TASK_3_3_TABLE_STRUCTURE_DESIGN.md)、[Task 3.4 字段结构设计](../phases/phase-03/TASK_3_4_FIELD_STRUCTURE_DESIGN.md)、[Task 3.5.1 字段数据类型规范](../phases/phase-03/TASK_3_5_1_FIELD_TYPE_STANDARD.md)和 [Task 3.5.2 主键与唯一约束设计](../phases/phase-03/TASK_3_5_2_PRIMARY_KEY_UNIQUE_CONSTRAINT_DESIGN.md)。本文件继续作为数据库规格总入口，后续内容须在相应 Task 正式启动并获批准后逐步补充。

当前进度：

- Task 3.1：Completed / Approved；
- Task 3.2：Completed / Approved；
- Task 3.3：Completed / Approved；
- Task 3.4：Completed / Approved；
- Task 3.5：In Progress；
- Task 3.5.1：Completed / Approved；
- Task 3.5.2：Completed / Approved；
- Task 3.5.3：Not Started；
- 数据库字段名称设计：Completed / Approved；
- 字段数据类型规范：Completed / Approved；
- 主键与唯一约束设计：Completed / Approved；
- 外键关系规范、普通查询索引和 Check 约束：Not Started；
- SQL、ORM、Schema、Migration 和数据库技术选型：Not Started；
- 技术开发：Not Started。

Task 3.3 保持 Completed / Approved。其正式逻辑表清单经 Task 3.4 结构检查由 57 张修正为 60 张：基础资料类 11 张、采购与生产类 11 张、验收与出入库类 10 张、跨境与库存类 12 张、系统与治理类 16 张。新增 `production_completion_record_items`，`role_warehouses` 和 `role_stores` 转为正式表；`safety_stock_rules` 继续作为候选表。

Task 3.4 已统一一般表、正式业务单据主表和单据明细公共字段，完成全部 60 张正式表的字段名称、中文含义、业务用途、业务必填性与必要历史快照设计。Task 3.4 本身不定义字段类型、长度、精度、主键与外键物理实现、索引、SQL、ORM、数据库技术选型或物理模型；其后 Task 3.5 已按正式指令启动。

Task 3.5 已进入 In Progress。Task 3.5.1 已批准数据库无关的逻辑字段类型规范：主键及对象引用统一采用 UUID 并优先 UUID v7，数量和金额采用 `DECIMAL(18,4)`，税率和百分比采用 `DECIMAL(7,4)`，纯业务日期与准确操作时间分别采用 `DATE` 和 `DATETIME`。同时明确 ENUM 稳定代码、JSON 使用边界、敏感字段、文件字段及只追加表类型原则。

Task 3.5.2 已批准全部 60 张正式表的主键与唯一约束设计：每张表仅使用单字段 UUID 主键 `id`，关联表保留独立主键，业务唯一性由独立唯一约束表达；基础资料编码、单据编号、明细行号、库存余额、多对多关系、外部平台编号、权限关系和导入行号均已确定业务唯一范围；编码及用户名按不区分大小写原则判重，可空唯一字段仅在非空时参与判断；审计日志、单据状态历史和审批记录不设置业务唯一约束。Task 3.5.3 尚未启动，外键删除或更新策略、普通查询索引、Check 约束、SQL、ORM、Schema、Migration 和数据库选型均未开始。
