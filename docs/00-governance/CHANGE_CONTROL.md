---
document_name: 变更控制规则
project: Violin ERP Lite
version: 1.0
status: Approved
owner: Project Manager
created_date: 2026-07-19
updated_date: 2026-07-19
related_phase: Phase 1
---

# 变更控制规则

提出变更
→ 确认变更原因
→ 识别受影响业务规则
→ 分析数据库、接口、页面和历史数据影响
→ 项目负责人批准或拒绝
→ 更新相关文档
→ 更新 `DECISION_LOG`
→ 更新 `CHANGELOG`
→ Codex 开发
→ 回归测试
→ 验收

Frozen 规则不得在没有正式变更记录的情况下修改。

## 阶段路线变更管理

凡涉及以下事项，必须执行正式变更流程：

- 增加 Phase；
- 删除 Phase；
- 修改 Phase 名称；
- 调整 Phase 顺序；
- 合并或拆分 Phase；
- 提前进入后续 Phase；
- 跳过 Phase；
- 更改当前 Phase 状态。

阶段路线变更必须执行：

提出变更申请
→ 说明必要性
→ 分析对文档、开发和进度的影响
→ 项目负责人批准或拒绝
→ 更新 `PROJECT.md`
→ 更新 `ROADMAP.md`
→ 更新 `DECISION_LOG.md`
→ 更新 `CHANGELOG.md`
→ 执行获批调整

所有阶段路线及阶段状态变更必须由项目负责人批准。Codex、ChatGPT 或其他 AI 不得自行批准，也不得在批准和正式文档更新前执行调整。
