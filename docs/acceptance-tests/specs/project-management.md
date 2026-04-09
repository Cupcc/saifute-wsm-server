# 项目管理（project-management）验收规格

## 元数据

| 字段 | 值 |
|------|------|
| 模块 | project-management |
| 需求源 | docs/requirements/domain/project-management.md |
| 最近更新 | 2026-04-09 |

## 能力覆盖

| 能力 | 说明 | 状态 |
|------|------|------|
| F1 | 项目主档轻量 CRUD 与固定 RD_SUB 口径 | `已验收` |
| F2 | 项目 BOM、缺料预警与补货辅助 | `已验收` |
| F3 | 项目领料 / 退料 / 报废通过 inventory-core 落账 | `已验收` |
| F4 | 项目净耗用与成本台账 | `已验收` |

## F1-F4 总体验收摘要

- 关联任务：`docs/tasks/archive/retained-completed/task-20260409-0056-project-management-phase1-phase2-delivery.md`
- 验收模式：`full`
- 结论：`accepted`
- 理由摘要：
  - `project` 后端已从“创建项目即直接出库”切换为“项目主档 + BOM + 独立项目物料动作”语义，`create/update` 不再直接记库存，项目动作统一经 `inventory-core` 落账。
  - 浏览器在 `http://127.0.0.1:90/rd/project-consumption` 上已显示“项目管理”入口与页面语义；可真实创建项目主档、选择业务车间、保存 BOM，并在详情页查看缺口/台账与项目物料动作标签页。
  - 本地 live 环境首次访问出现 `/api/projects` `500`，根因是 `.env.dev` 数据库尚未同步新增 `ProjectBomLine / ProjectMaterialAction*` Prisma schema；在显式执行 `pnpm prisma db push --schema prisma/schema.prisma --accept-data-loss` 后恢复为可验收状态，需作为 rollout 前置条件记录。

### 验证摘要

| 时间 | 关联 task | 环境 | 结果 |
|------|-----------|------|------|
| 2026-04-09 | `archive/retained-completed/task-20260409-0056-project-management-phase1-phase2-delivery.md` | `.env.dev`; backend `http://127.0.0.1:8112`; web `http://127.0.0.1:90`; Prisma schema synced to local DB; automated validation + browser walkthrough | `passed` |

### 证据索引

| 执行面 | 证据文件/命令 | 结果 |
|--------|-------------|------|
| prisma | `set -a && source .env.dev && set +a && pnpm prisma:validate` | pass |
| prisma | `set -a && source .env.dev && set +a && pnpm prisma db push --schema prisma/schema.prisma --accept-data-loss` | pass |
| typecheck | `pnpm typecheck` | pass |
| unit | `pnpm test -- src/modules/project/application/project.service.spec.ts src/modules/project/application/project-material-action.service.spec.ts src/modules/rd-subwarehouse/application/rd-procurement-request.service.spec.ts src/modules/workshop-material/application/workshop-material.service.spec.ts` | pass |
| build | `pnpm --dir web build:prod` | pass |
| browser | `docs/acceptance-tests/runs/run-20260409-0126-project-management-phase1-phase2.md` | pass |
| cases | `docs/acceptance-tests/cases/project-management.json` | pass |

## F1 项目主档轻量 CRUD 与固定 RD_SUB 口径

### 验收矩阵

| AC | 描述 | 结论 | 执行面 | 关键证据 | 备注 |
|----|------|------|--------|----------|------|
| AC-1 | 项目主档提供轻量 CRUD，项目作业仓别固定为 RD_SUB，且主档不再等同库存消耗单 | `met` | unit + browser | `project.service.spec.ts` 明确断言 create 不调用 `inventoryService.settleConsumerOut`；browser run 中 `/rd/project-consumption` 首屏文案、创建弹窗、项目列表与详情页都体现项目主档语义 | 浏览器创建使用业务车间下拉，修复了对固定 workshopScope 的错误假设 |

### 残余风险

- rollout 到其他环境前必须先同步 Prisma schema；否则 `/api/projects` 会因缺表而失败。

## F2 项目 BOM、缺料预警与补货辅助

### 验收矩阵

| AC | 描述 | 结论 | 执行面 | 关键证据 | 备注 |
|----|------|------|--------|----------|------|
| AC-2 | 项目 BOM 保存不直接过账库存，并能展示缺口/补货状态 | `met` | unit + browser | `project.service.spec.ts` 覆盖 BOM、短缺、补货状态、legacy ledger 聚合；browser run 中详情抽屉展示 `计划量/当前可用/缺口量/补货状态/补货在途` | 当前 browser fixture 未覆盖进行中的采购单，但读模型字段已在 UI 呈现 |

### 残余风险

- browser 只验证了“待补货”路径；“补货中”状态仍主要依赖自动化与后端读模型逻辑。

## F3 项目库存动作通过 inventory-core 落账

### 验收矩阵

| AC | 描述 | 结论 | 执行面 | 关键证据 | 备注 |
|----|------|------|--------|----------|------|
| AC-3 | 项目领料 / 退料 / 报废统一经 inventory-core 落账，并维持与 workshop-material 一致的动作家族语义 | `met` | unit + browser | `project-material-action.service.spec.ts` 覆盖 `PICK/RETURN/SCRAP` create/void、来源释放与回补；详情页浏览器 walkthrough 显示“项目物料动作”页签与 `新增物料动作` 入口 | 当前 live browser run 未额外制造 RD_SUB 库存 fixture，因此动作创建真路径以 focused tests 为主证据 |

### 残余风险

- 若后续要做更强 browser 证据，需先准备一条可供 RD_SUB 消耗的 handoff 库存 fixture。

## F4 项目净耗用与成本台账

### 验收矩阵

| AC | 描述 | 结论 | 执行面 | 关键证据 | 备注 |
|----|------|------|--------|----------|------|
| AC-4 | 可查看项目层的计划、已领、已退、已报废、净耗用、缺口量与成本汇总 | `met` | unit + browser | `project.service.spec.ts` 断言 ledger summary / netUsed / shortage 聚合；browser run 中详情抽屉显示 `计划成本/已领成本/退料回补/报废损耗/净耗用成本/缺口物料数` 与行级台账 | 当前 browser 数据集金额为 0，是因未执行领料动作，不影响字段闭环验收 |

### 残余风险

- live browser 未展示非零成本样本，成本数值正确性主要由 service tests 覆盖。
