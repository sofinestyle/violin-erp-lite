---
document_name: 文档优先级规则
project: Violin ERP Lite
version: 1.0
status: Approved
owner: Project Manager
created_date: 2026-07-19
updated_date: 2026-07-19
related_phase: Phase 1
---

# 文档优先级规则

## 治理层级

第一层：Frozen 业务规则

第二层：Approved 项目治理文件

第三层：Approved 业务与产品文档

第四层：Reviewed 文档

第五层：Draft 文档

第六层：当前临时指令和聊天内容

- 当前聊天不能直接覆盖 Approved 或 Frozen 文档；
- 如果项目负责人确认新变更，必须先更新正式文档；
- 文档状态与业务规则优先级共同决定执行依据。

## 文档优先级

1. `BUSINESS_RULES.md`
2. `PROJECT.md`
3. `SYSTEM_SPEC.md`
4. `DATABASE_SPEC.md`
5. `FEATURE_LIST.md` 及功能详细 Spec
6. `ROLE_PERMISSION_SPEC.md`
7. UI Spec
8. `API_SPEC.md`
9. 测试及验收文档
10. 当前聊天或临时指令

## 同级冲突规则

1. Frozen 优先于 Approved；
2. Approved 优先于 Reviewed；
3. Reviewed 优先于 Draft；
4. 状态相同时，以明确标注的较新版本为参考；
5. 不得只根据文件修改时间判断业务规则有效性；
6. 无法判断时停止执行并报告。
