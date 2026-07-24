---
document_name: Codex项目执行约束
project: Violin ERP Lite
version: 1.1
status: Approved
owner: Project Manager
created_date: 2026-07-19
updated_date: 2026-07-24
related_phase: Phase 1
---

# AGENTS

## 文档效力

本文件状态为 Approved。
本文件中的执行规则对 Codex 后续所有任务正式生效。
如果临时指令与本文件或 Frozen 业务规则冲突，Codex 必须停止冲突部分并报告。

## 正式文档优先规则

- ChatGPT 执行指令的优先级低于 Approved / Frozen 唯一事实来源（SSOT）。
- 指令与正式文档冲突时必须立即停止冲突部分并报告，不得自行选择、修改或继续实现。
- 不得使用其他项目偏好、聊天记忆或通用最佳实践覆盖当前项目正式设计。

## 强制读取规则

更新到 GitHub `main` 最新代码后，开始任何任务前必须：

1. 读取 `AGENTS.md`；
2. 运行 `pnpm status:check`；
3. 检查通过后依次读取：
   - `docs/00-governance/CURRENT_STATUS.md`；
   - `ROADMAP.md`；
   - `PROJECT.md`；
   - `docs/00-governance/DOCUMENT_PRIORITY.md`；
   - `docs/01-business/BUSINESS_RULES.md`；
   - `docs/02-product/SYSTEM_SPEC.md`；
   - 当前 Phase 文档。

`pnpm status:check` 未通过时必须立即停止，报告不一致内容并等待项目负责人决定，不得继续设计、开发、状态同步或其他写操作。

按任务类型额外读取：

- 涉及数据库：读取 `docs/03-data/DATABASE_SPEC.md`；
- 涉及页面：读取 `docs/04-ui/` 下对应文档；
- 涉及接口：读取 `docs/05-api/API_SPEC.md`；
- 涉及测试：读取 `docs/06-testing/` 下对应文档。

## 阶段读取规则

Codex 开始任何任务前必须读取 `ROADMAP.md`，并确认：

- 当前 Phase；
- 当前 Phase 状态；
- 下一 Phase；
- 本次任务是否属于当前 Phase；
- 是否存在跨阶段内容。

## 当前状态事实来源规则

当前 Phase 与 Task 状态的事实来源优先级为：

1. `docs/00-governance/CURRENT_STATUS.md`：当前状态唯一入口；
2. `ROADMAP.md`：阶段路线和 Task 边界；
3. `PROJECT.md`：项目总览；
4. `README.md`：简要展示。

`docs/05-api/API_SPEC.md`、`docs/00-governance/DECISION_LOG.md` 和 `CHANGELOG.md` 不作为当前状态判断依据。该规则仅适用于当前状态，不改变 Frozen 业务规则、数据库逻辑设计、API Master Specification 或 Phase 6 Functional Specification 的文档优先级。

正式状态治理文件只允许记录 Phase 与 Task，不得记录 Section 状态。状态变更必须先更新 `CURRENT_STATUS.md`，再同步 `ROADMAP.md`、`PROJECT.md` 和 `README.md`，并通过 `pnpm status:check`。

## 阶段边界规则

如用户指令要求执行尚未进入的 Phase 内容：

1. 不直接执行；
2. 指出当前 Phase；
3. 指出请求属于哪个后续 Phase；
4. 等待项目负责人正式确认启动该 Phase；
5. 不得自行推断项目负责人已经同意跨阶段执行。

不得以单个功能已经明确为理由跳过当前 Phase。

## 路线冻结规则

`ROADMAP.md` 状态为 Frozen。

Codex 不得自行增加、删除、合并、拆分、重命名或调整十个 Phase，不得跳过 Phase，也不得在当前 Phase 完成前执行后续 Phase 内容。任何路线或阶段状态变更必须由项目负责人批准并完成正式变更流程。Phase Renumbering Change Request 001 已按正式流程批准；当前十阶段路线以 Frozen `ROADMAP.md` v2.0 为准。

## 项目语言规范

1. 项目主要语言为中文（简体）。
2. 所有正式项目文档默认使用中文编写，包括但不限于：
   - `PROJECT.md`；
   - `ROADMAP.md`；
   - `BUSINESS_RULES.md`；
   - `SYSTEM_SPEC.md`；
   - `FEATURE_LIST.md`；
   - `DATABASE_SPEC.md`；
   - UI 规范；
   - API 规范；
   - `TEST_PLAN.md`；
   - `ACCEPTANCE_CRITERIA.md`；
   - `CHANGELOG.md`；
   - `DECISION_LOG.md`；
   - Codex 执行汇报。
3. 专业术语首次出现时，可以采用“中文（English）”格式，例如业务需求分析（Business Requirement Analysis）、库存流水（Inventory Ledger）、采购订单（Purchase Order）和质量验收（Quality Inspection）。
4. 同一术语后续应统一使用，不得在产品、商品、货品、Item、Product 之间随意切换。
5. 页面显示文字默认使用中文（简体）。
6. 代码中的变量名、函数名、类名、数据库表名、字段名和 API 字段名使用英文。
7. Git Commit 继续使用英文，并遵循规范化格式。
8. README 以中文为主要语言，可以保留必要英文术语。
9. 除非项目负责人明确要求，不得将正式项目文档整体改写为英文。
10. 所有 AI 在本项目中默认使用中文回复。

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
- `docs/00-governance/CURRENT_STATUS.md`；
- `ROADMAP.md`、`PROJECT.md` 和 `README.md` 的当前状态摘要；
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
