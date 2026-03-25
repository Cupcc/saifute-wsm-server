# 决策日志

## 待决策 {#pending}

当前无待决策项。

---

## 已决策

### DEC-007: 全局库存重放与 cutover 收口策略

- 决策时间: 2026-03-25
- 结论: 选项 A——先补 scrap → 开发库存重放脚本 → 执行重放；迁移工作流随后归档，若后续需要停旧启新则按独立切换说明执行
- 理由: 保证全量迁移完整性，不留能力缺口，并把“迁移完成”与“后续运维切换动作”拆开表达
- 执行: `scripts/migration/scrap/`、`scripts/migration/inventory-replay/`、`inventory-replay-explainer.md`

### DEC-006: `project` 域遇到"确无对应物料"时自动补建 `material`

- 决策时间: 2026-03-25
- 结论: 按 `material_name + specification + unit` 稳定键自动补建目标 `material`
- 理由: 用户确认"确实没有对应物料，自行编码插入"；自动补建仍保持 deterministic
- 执行: `scripts/migration/project/transformer.ts`、`writer.ts`；真实数据重跑 `126` 条 `AUTO_CREATED` 物料

### DEC-005: pending 行放 pending_relations 还是 excluded_documents

- 决策时间: 2026-03-23
- 结论: `pending_relations`（可恢复的 staging），`excluded_documents` 仅用于结构性排除
- 理由: pending 行有恢复可能，语义上不是"排除"而是"暂缓"
- 执行: `scripts/migration/project/writer.ts`

### DEC-004: material resolution 是否允许 fuzzy matching

- 决策时间: 2026-03-23
- 结论: 不允许。只使用 deterministic fallback（精确的 名称+规格+单位 匹配）
- 理由: 物料映射错误会导致 BOM 成本失真和库存追溯污染
- 执行: `scripts/migration/project/transformer.ts`

### DEC-003: project 域采用三态 admission 还是二态

- 决策时间: 2026-03-23
- 结论: 三态——`migrated` / `pending-material-resolution` / `structural-excluded`
- 理由: 二态会把可恢复的 backlog 和真正的结构性问题混为一谈
- 执行: `scripts/migration/project/types.ts`、`transformer.ts`

### DEC-002: project 迁移的 header admission 策略

- 决策时间: 2026-03-23
- 结论: all-or-nothing——一个 project header 下只要有任意一条明细 pending，整个 header 不写入 live 表
- 理由: 部分写入会导致项目金额不完整、下游库存副作用基于不完整数据产生
- 执行: `scripts/migration/project/writer.ts`

### DEC-001: scrap 域是否纳入本轮迁移范围

- 决策时间: 2026-03-21
- 结论: 纳入。即使当前历史数据为 0，也要补齐迁移能力
- 理由: 保证全量迁移的完整性，避免上线后发现遗漏
- 执行: `scripts/migration/scrap/`
