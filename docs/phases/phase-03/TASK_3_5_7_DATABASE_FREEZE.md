---
document_name: Task 3.5.7 Database Freeze
project: Violin ERP Lite
version: 1.1
status: Frozen
owner: Project Manager
created_date: 2026-07-20
updated_date: 2026-07-21
related_phase: Phase 3
---

# Task 3.5.7：数据库设计冻结（Database Freeze）

## 1. 任务信息

| 项目 | 内容 |
| --- | --- |
| 所属阶段 | Phase 3：数据库设计（Completed / Approved / Frozen） |
| 所属任务 | Task 3.5：字段类型、约束与索引设计（Completed / Approved） |
| 当前小任务 | Task 3.5.7：Database Freeze |
| 前置小任务 | Task 3.5.6：数据库命名规范（Completed / Approved） |
| 文档状态 | Frozen |
| 小任务状态 | Completed / Approved / Frozen |
| 冻结版本 | Database Logical Design v1.1 |
| 冻结日期 | 2026-07-20 |

## 2. 冻结目的

本文件将 Phase 3 已批准的数据库逻辑设计确立为后续页面设计、技术设计和开发工作的正式输入，并关闭 Phase 3。

本次冻结不选择数据库或 ORM，不生成物理数据库类型、DDL、Schema、Migration、Seed 或物理 ER 图，不进行数据库初始化，也不产生页面、API 或业务代码。

## 3. 冻结范围

Database Logical Design v1.1 正式冻结以下内容：

1. 60 张正式逻辑表及其表名称；
2. Task 3.4 已批准的字段名称；
3. 字段业务含义与业务必填性；
4. 字段逻辑类型、字符串长度和数值精度；
5. 单字段 UUID 主键原则；
6. 业务唯一约束及其唯一范围；
7. 外键目标、关系语义、更新策略和删除策略；
8. 普通逻辑索引需求及避免重复索引原则；
9. Check 约束逻辑及其与服务层校验的边界；
10. 数据库逻辑命名规范及已批准兼容项；
11. 只追加表规则；
12. 受控多态引用规则；
13. 审计、状态历史和审批记录保留规则；
14. 基础资料停用及历史引用保护规则；
15. 当前库存余额的仓库与 SKU 粒度；
16. 库存流水作为库存变化正式来源及其来源追溯原则。

## 4. 正式输入文档

- [Task 3.1 业务对象到数据库实体映射](TASK_3_1_ENTITY_MAPPING.md)；
- [Task 3.2 实体关系详细设计](TASK_3_2_ENTITY_RELATIONSHIP_DESIGN.md)；
- [Task 3.3 数据表结构设计](TASK_3_3_TABLE_STRUCTURE_DESIGN.md)；
- [Task 3.4 字段结构设计](TASK_3_4_FIELD_STRUCTURE_DESIGN.md)；
- [Task 3.5.1 字段数据类型规范](TASK_3_5_1_FIELD_TYPE_STANDARD.md)；
- [Task 3.5.2 主键与唯一约束设计](TASK_3_5_2_PRIMARY_KEY_UNIQUE_CONSTRAINT_DESIGN.md)；
- [Task 3.5.3 外键关系规范](TASK_3_5_3_FOREIGN_KEY_RELATIONSHIP_STANDARD.md)；
- [Task 3.5.4 索引设计](TASK_3_5_4_INDEX_DESIGN.md)；
- [Task 3.5.5 Check 约束设计](TASK_3_5_5_CHECK_CONSTRAINT_STANDARD.md)；
- [Task 3.5.6 数据库命名规范](TASK_3_5_6_DATABASE_NAMING_STANDARD.md)；
- [数据库规格](../../03-data/DATABASE_SPEC.md)；
- [Frozen 业务规则](../../01-business/BUSINESS_RULES.md)；
- [系统规格](../../02-product/SYSTEM_SPEC.md)。

`BUSINESS_RULES.md` 是 Frozen 业务基线。`SYSTEM_SPEC.md` 当前仍为 Draft，仅作为现有产品规格输入，不因本次数据库冻结自动获得 Approved 或 Frozen 状态，也不得覆盖更高优先级的治理文件和 Frozen 业务规则。

## 5. 冻结后变更流程

任何涉及数据库逻辑设计的变更必须提交 Database Change Request，至少包含：

- 变更编号；
- 提交日期；
- 申请人；
- 变更原因；
- 涉及表；
- 涉及字段；
- 对业务规则的影响；
- 对历史数据的影响；
- 对唯一约束的影响；
- 对外键关系的影响；
- 对逻辑索引的影响；
- 对 API 的影响；
- 对页面的影响；
- 数据迁移方案；
- 回滚方案；
- 测试方案；
- 目标版本号；
- 审批结论。

未经批准，不得改变 Frozen 数据库业务语义。

## 6. 技术映射边界

数据库、ORM、物理类型、DDL、Schema、Migration、Seed、物理 ER 图、数据库初始化、数据库特定索引语法及其他技术映射工作，必须等待后续具备相应范围和正式授权的开发阶段启动后执行。

技术索引、索引排序方向、物理数据库类型和实现语法只能在后续正式授权阶段确定。相关实现不得改变 Frozen 的逻辑表、字段、业务含义、唯一范围、外键关系、库存粒度或历史保留规则。本文件不预先指定这些工作属于 Phase 4。

## 7. 重大数据库变更

以下变化属于重大数据库逻辑变更，必须重新评审并更新数据库逻辑设计版本：

- 新增或删除正式逻辑表；
- 新增或删除正式字段；
- 修改字段业务含义或关键必填性；
- 修改当前库存粒度；
- 修改业务单据主从关系；
- 修改业务唯一范围；
- 修改外键目标或关系语义；
- 修改受控多态引用原则；
- 修改只追加表规则；
- 修改审计及历史保留规则；
- 允许正式历史物理删除；
- 修改采购与生产平行关系；
- 修改跨境仓库角色关系。

## 8. 阶段关闭状态

- Phase 3：Completed / Approved / Frozen；
- Task 3.5：Completed / Approved；
- Task 3.5.4：Completed / Approved；
- Task 3.5.5：Completed / Approved；
- Task 3.5.6：Completed / Approved；
- Task 3.5.7：Completed / Approved / Frozen。

下一阶段为 Phase 4：页面设计（UI / Page Design），状态为 Not Started。Phase 4 的范围继续以 Frozen `ROADMAP.md` 既有定义为准，本文件不新增或修改 Phase 4 内部任务。

## 8.1 DCR-001 版本修订

DCR-001 于 2026-07-21 获得项目负责人正式批准。Database Logical Design 由 v1.0 修订为 v1.1，唯一变化为既有字段 `production_completion_records.completion_status` 的正式状态定义：

- Draft（草稿）；
- Confirmed（已确认）；
- Revoked（已撤销）；
- Voided（已作废）。

本次修订未新增或删除字段、表、索引、外键、关系或业务对象，正式逻辑表仍为 60 张，字段数量及数据库逻辑结构保持不变。

## 9. 正式结论

1. Database Logical Design v1.0 于 2026-07-20 正式冻结；DCR-001 于 2026-07-21 批准唯一状态语义修订，当前冻结版本为 Database Logical Design v1.1。
2. 正式逻辑表数量为 60 张。
3. 业务规则、逻辑表、字段、类型、约束、关系、逻辑索引、命名及历史保留原则纳入冻结范围。
4. Frozen 数据库逻辑设计作为后续页面设计、技术设计和开发工作的正式输入。
5. 后续阶段不得改变 Frozen 数据库业务语义。
6. 任何逻辑表、字段、业务含义、唯一范围、外键关系、库存粒度或历史保留规则的修改，必须走 Database Change Request。
7. 技术索引、数据库物理类型和实现语法只能在后续正式授权阶段确定。
8. 重大数据库逻辑结构变化必须重新评审并更新版本。
9. Phase 3 正式关闭，状态为 Completed / Approved / Frozen。
10. Phase 4 仍为页面设计（UI / Page Design），状态为 Not Started。
11. 本次未选择数据库或 ORM，未编写 SQL，未创建 DDL、Schema、Migration、Seed、物理 ER 图或数据库初始化内容。
12. 本次未产生页面、API 或业务代码，未安装依赖。

## 10. 下一步

等待 ChatGPT 读取 GitHub 并统一验收 Task 3.5.4 至 Task 3.5.7 及 Phase 3 Database Freeze。验收通过前不得启动 Phase 4，不得预先启动任何技术映射工作。
