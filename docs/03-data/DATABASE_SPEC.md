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

Task 3.1 业务对象到数据库实体映射、Task 3.2 实体关系详细设计、Task 3.3 数据表结构设计、Task 3.4 字段结构设计及 Task 3.5.1 至 Task 3.5.5 均已完成并获得批准。正式成果参见 [Task 3.1 业务对象到数据库实体映射](../phases/phase-03/TASK_3_1_ENTITY_MAPPING.md)、[Task 3.2 实体关系详细设计](../phases/phase-03/TASK_3_2_ENTITY_RELATIONSHIP_DESIGN.md)、[Task 3.3 数据表结构设计](../phases/phase-03/TASK_3_3_TABLE_STRUCTURE_DESIGN.md)、[Task 3.4 字段结构设计](../phases/phase-03/TASK_3_4_FIELD_STRUCTURE_DESIGN.md)、[Task 3.5.1 字段数据类型规范](../phases/phase-03/TASK_3_5_1_FIELD_TYPE_STANDARD.md)、[Task 3.5.2 主键与唯一约束设计](../phases/phase-03/TASK_3_5_2_PRIMARY_KEY_UNIQUE_CONSTRAINT_DESIGN.md)、[Task 3.5.3 外键关系规范](../phases/phase-03/TASK_3_5_3_FOREIGN_KEY_RELATIONSHIP_STANDARD.md)、[Task 3.5.4 索引设计](../phases/phase-03/TASK_3_5_4_INDEX_DESIGN.md)和 [Task 3.5.5 Check 约束设计](../phases/phase-03/TASK_3_5_5_CHECK_CONSTRAINT_STANDARD.md)。本文件继续作为数据库规格总入口。

当前进度：

- Task 3.1：Completed / Approved；
- Task 3.2：Completed / Approved；
- Task 3.3：Completed / Approved；
- Task 3.4：Completed / Approved；
- Task 3.5：In Progress；
- Task 3.5.1：Completed / Approved；
- Task 3.5.2：Completed / Approved；
- Task 3.5.3：Completed / Approved；
- Task 3.5.4：Completed / Approved；
- Task 3.5.5：Completed / Approved；
- Task 3.5.6：In Progress；
- 数据库字段名称设计：Completed / Approved；
- 字段数据类型规范：Completed / Approved；
- 主键与唯一约束设计：Completed / Approved；
- 外键关系规范：Completed / Approved；
- 索引设计：Completed / Approved；
- Check 约束设计：Completed / Approved；
- 数据库命名规范：In Progress；
- SQL、ORM、Schema、Migration 和数据库技术选型：Not Started；
- 技术开发：Not Started。

Task 3.3 保持 Completed / Approved。其正式逻辑表清单经 Task 3.4 结构检查由 57 张修正为 60 张：基础资料类 11 张、采购与生产类 11 张、验收与出入库类 10 张、跨境与库存类 12 张、系统与治理类 16 张。新增 `production_completion_record_items`，`role_warehouses` 和 `role_stores` 转为正式表；`safety_stock_rules` 继续作为候选表。

Task 3.4 已统一一般表、正式业务单据主表和单据明细公共字段，完成全部 60 张正式表的字段名称、中文含义、业务用途、业务必填性与必要历史快照设计。Task 3.4 本身不定义字段类型、长度、精度、主键与外键物理实现、索引、SQL、ORM、数据库技术选型或物理模型；其后 Task 3.5 已按正式指令启动。

Task 3.5 已进入 In Progress。Task 3.5.1 已批准数据库无关的逻辑字段类型规范：主键及对象引用统一采用 UUID 并优先 UUID v7，数量和金额采用 `DECIMAL(18,4)`，税率和百分比采用 `DECIMAL(7,4)`，纯业务日期与准确操作时间分别采用 `DATE` 和 `DATETIME`。同时明确 ENUM 稳定代码、JSON 使用边界、敏感字段、文件字段及只追加表类型原则。

Task 3.5.2 已批准全部 60 张正式表的主键与唯一约束设计：每张表仅使用单字段 UUID 主键 `id`，关联表保留独立主键，业务唯一性由独立唯一约束表达；基础资料编码、单据编号、明细行号、库存余额、多对多关系、外部平台编号、权限关系和导入行号均已确定业务唯一范围；编码及用户名按不区分大小写原则判重，可空唯一字段仅在非空时参与判断；审计日志、单据状态历史和审批记录不设置业务唯一约束。

Task 3.5.3 已批准全部 60 张正式表的外键关系规范：普通业务外键更新和删除默认使用 `RESTRICT`，完全依附主表的明细、导入明细、附件关系和纯权限关系采用结构性 `CASCADE`；基础资料通过停用保留历史，正式业务主表和核心历史表不得级联删除；验收、入库、库存流水、附件、审计、状态历史和审批的多来源对象使用 Task 3.4 已批准的受控多态字段，不建立错误的单表外键。

Task 3.5.4 已批准 90 项普通逻辑索引，包括 69 项含外键字段索引、59 项组合索引和 15 项多态查询索引；同时排除 21 项与主键、唯一约束相同或已被有效前缀覆盖的重复建议。

Task 3.5.5 已批准 201 项 Check 逻辑规则，覆盖数值范围、日期先后、动作字段一致性、来源组合完整性、仓库角色、行号版本及同表计算公式；Check 不承担跨表存在性、权限、并发或库存事务验证。Task 3.5.6 已按数据库设计冲刺进入 In Progress。SQL、ORM、Schema、Migration、数据库选型和技术开发均未开始。
