# 项目管理 Phase 1/2 验收报告

## 元数据

| 字段 | 值 |
|------|------|
| 关联spec | `docs/acceptance-tests/specs/project-management.md` |
| 关联task | `docs/tasks/archive/retained-completed/task-20260409-0056-project-management-phase1-phase2-delivery.md` |
| 创建原因 | 冻结 Phase 1/2 full acceptance 证据 |
| 状态 | `passed` |
| 环境 | `.env.dev`; backend `http://127.0.0.1:8112`; web `http://127.0.0.1:90`; Chrome DevTools MCP |
| 被测提交 | `b37d9dc` |
| 时间 | `2026-04-09` |

## 执行记录

- 先执行 `set -a && source .env.dev && set +a && pnpm prisma:validate`，结果 `pass`。
- 首次访问 `/rd/project-consumption` 时，列表请求 `/api/projects?limit=10&offset=0` 返回 `500`；确认根因是本地 MySQL 尚未同步新增的 `ProjectBomLine / ProjectMaterialAction*` schema。
- 显式执行 `set -a && source .env.dev && set +a && pnpm prisma db push --schema prisma/schema.prisma --accept-data-loss` 后，页面恢复正常。
- 登录 `admin / admin123`，访问 `/rd/project-consumption`：
  - 菜单项、面包屑、页标题均显示“项目管理”。
  - 点击“新增项目”，可选择业务车间，不再要求固定 `workshopScope.workshopId`。
  - 使用项目编码 `RDPRJ-20260409012646-476`、项目名称“浏览器项目验收”、业务车间“内勤”、BOM 物料“fdsf sadfa”完成创建，提示“项目已创建”。
  - 项目列表出现新项目行，显示 `BOM 行数 = 1`、`计划数量 = 1`。
  - 打开详情抽屉，看到 `计划成本/已领成本/退料回补/报废损耗/净耗用成本/缺口物料数` 摘要卡，以及行级 `缺口量 = 1 / 补货状态 = 待补货`。
  - 切换到“项目物料动作”页签，看到 `新增物料动作` 入口与空动作列表。
- 自动化证据同时通过：
  - `pnpm typecheck`
  - `pnpm test -- src/modules/project/application/project.service.spec.ts src/modules/project/application/project-material-action.service.spec.ts src/modules/rd-subwarehouse/application/rd-procurement-request.service.spec.ts src/modules/workshop-material/application/workshop-material.service.spec.ts`
  - `pnpm --dir web build:prod`

## 验收矩阵

| AC | 结论 | 关键证据 | 备注 |
|----|------|----------|------|
| AC-1 | `met` | 浏览器创建项目主档成功；`project.service.spec.ts` 断言 create 不再直接出库 | 项目语义已从“项目领用单”升级为项目主档 |
| AC-2 | `met` | 详情页展示 BOM / 缺口 / 补货状态；service spec 覆盖 shortage / replenishment 聚合 | browser 样本走到“待补货”路径 |
| AC-3 | `met` | `project-material-action.service.spec.ts` 覆盖 `PICK/RETURN/SCRAP` 与回补/逆转；浏览器详情页展示动作入口 | browser run 未额外准备 RD_SUB 库存 fixture |
| AC-4 | `met` | 详情页展示成本摘要与净耗用台账；service spec 覆盖成本聚合 | browser 当前样本为零金额基线 |
| AC-5 | `met` | 菜单、页面、创建弹窗、详情抽屉、动作页签均可真实访问 | 工作台与菜单文案已对齐“项目管理” |
| AC-6 | `met` | Prisma/typecheck/test/build/browser/spec/cases/run 证据齐全 | 需记录 schema sync 为环境前置条件 |

## 总结

- 建议：`accept`
- 残余风险：部署或其他本地库如果未先同步 Prisma schema，`/api/projects` 仍会因缺表失败；当前 browser run 未准备非零成本的 live 库存动作样本，但该部分已有 focused tests 覆盖。
