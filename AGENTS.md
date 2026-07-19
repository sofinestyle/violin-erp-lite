---
document_name: Codex项目执行约束
project: Violin ERP Lite
version: 1.0
status: Approved
owner: Project Manager
created_date: 2026-07-19
updated_date: 2026-07-19
related_phase: Phase 1
---

# AGENTS

## 文档效力

本文件状态为 Approved。
本文件中的执行规则对 Codex 后续所有任务正式生效。
如果临时指令与本文件或 Frozen 业务规则冲突，Codex 必须停止冲突部分并报告。

## 强制读取规则

开始任何任务前，必须依次读取：

1. `PROJECT.md`
2. `AGENTS.md`
3. `docs/00-governance/DOCUMENT_PRIORITY.md`
4. `docs/01-business/BUSINESS_RULES.md`
5. `docs/02-product/SYSTEM_SPEC.md`
6. 当前 Phase 文档

按任务类型额外读取：

- 涉及数据库：读取 `docs/03-data/DATABASE_SPEC.md`；
- 涉及页面：读取 `docs/04-ui/` 下对应文档；
- 涉及接口：读取 `docs/05-api/API_SPEC.md`；
- 涉及测试：读取 `docs/06-testing/` 下对应文档。

## 冲突处理规则

如果当前指令与 Frozen 文档冲突：

1. 停止执行冲突部分；
2. 明确指出冲突条目；
3. 说明可能影响；
4. 不得自行修改 Frozen 文档；
5. 不得选择自己认为更优的方案；
6. 等待项目负责人形成正式变更决定。

## 开发规则

- 不得先编码后补文档；
- 不得通过页面逻辑绕过业务规则；
- 不得直接修改库存余额；
- 不得为赶进度删减审计、库存流水或权限校验；
- 不得擅自增加模块；
- 不得建立与正式产品、库存、供应商平行的数据源；
- 每个功能只能有一个正式数据来源；
- 所有重要业务逻辑必须有测试；
- 新增功能不得破坏已有功能。

## 完成任务后的更新规则

每次完成正式开发任务后，必须检查并按需更新：

- 对应 Spec；
- `CHANGELOG.md`；
- 测试记录；
- `DECISION_LOG.md`；
- 当前 Phase 完成情况。

## Git规则

- 每次提交必须说明修改目的；
- 不提交无关文件；
- 不提交敏感信息；
- 不提交真实业务数据；
- 不得使用模糊提交信息，如“update”“fix”“修改”；
- 推送后检查远程 commit 是否与本地一致。
