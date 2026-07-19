---
document_name: 数据库规格
project: Violin ERP Lite
version: 1.0
status: Draft
owner: Project Manager
created_date: 2026-07-19
updated_date: 2026-07-19
related_phase: Phase 1
---

# DATABASE SPEC

Phase 3 数据库设计（Database Design）已正式启动，当前状态为 In Progress。

Task 3.1 业务对象到数据库实体映射、Task 3.2 实体关系详细设计与 Task 3.3 数据表结构设计均已完成并获得批准。正式成果参见 [Task 3.1 业务对象到数据库实体映射](../phases/phase-03/TASK_3_1_ENTITY_MAPPING.md)、[Task 3.2 实体关系详细设计](../phases/phase-03/TASK_3_2_ENTITY_RELATIONSHIP_DESIGN.md)和 [Task 3.3 数据表结构设计](../phases/phase-03/TASK_3_3_TABLE_STRUCTURE_DESIGN.md)。本文件继续作为数据库规格总入口，后续内容须在相应 Task 正式启动并获批准后逐步补充。

当前进度：

- Task 3.1：Completed / Approved；
- Task 3.2：Completed / Approved；
- Task 3.3：Completed / Approved；
- Task 3.4：Not Started；
- 数据库字段设计：Not Started；
- SQL、ORM 和数据库技术选型：Not Started；
- 技术开发：Not Started。

Task 3.3 正式确认五类共 57 张逻辑表：基础资料类 11 张、采购与生产类 10 张、验收与出入库类 10 张、跨境与库存类 12 张、系统与治理类 14 张。`role_warehouses`、`role_stores` 和 `safety_stock_rules` 为候选表，不进入正式清单。

Task 3.3 不定义字段清单、字段名称、字段类型、主键、外键实现、索引、SQL、ORM、数据库技术选型或物理模型。Task 3.3 验收通过前不得启动 Task 3.4。
