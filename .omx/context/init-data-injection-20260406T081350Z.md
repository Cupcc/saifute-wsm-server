# Context Snapshot: init-data-injection

- Task statement: 用户询问“初始化的数据有吗，需要注入哪些数据？”
- Desired outcome: 明确当前仓库哪些数据会自动初始化，哪些必须手动注入或迁移导入。
- Stated solution: 使用 `deep-interview` 先做 brownfield 事实预检，再收敛到具体初始化范围。
- Probable intent hypothesis: 用户准备本地起环境、联调、验收或新库冷启动，想先知道最小可运行数据前置，避免缺数据导致误判实现问题。

## Known facts / evidence

- 仓库为 brownfield NestJS + Prisma 项目，存在真实初始化逻辑与迁移脚本。
- 系统管理/RBAC 会在模块启动时执行 `restoreOrSeedState()`；若规范化表全空，则把内置 canonical seed 持久化到 `sys_*` 表。
  - Evidence: `src/modules/rbac/infrastructure/in-memory-rbac.repository.ts`
- 系统管理 seed 至少覆盖 `sys_dept / sys_post / sys_menu / sys_role / sys_user / sys_dict_type / sys_dict_data / sys_config / sys_notice`。
  - Evidence: `restoreOrSeedState()` 统计并加载上述表；e2e 使用 `admin / operator / rd-operator / procurement` 登录成功。
  - Evidence: `src/modules/rbac/infrastructure/in-memory-rbac.repository.ts`, `test/app.e2e-spec.ts`, `test/redis-real-integration.e2e-spec.ts`
- 主数据模块启动时只自动保证两类 canonical 数据存在：
  - `workshop`: `MAIN`, `RD`
  - `stock_scope`: `MAIN`, `RD_SUB`
  - Evidence: `src/modules/master-data/application/master-data.service.ts`, `src/modules/master-data/infrastructure/master-data.repository.ts`
- `material_category / material / customer / supplier / personnel` 默认不会自动 seed。
  - Evidence: `src/modules/master-data/infrastructure/master-data.repository.ts` 仅包含 `ensureCanonicalWorkshops()` / `ensureCanonicalStockScopes()`
- 历史验收明确记录：空 `material_category` 环境下，浏览器链路曾需要补“最小分类 fixture”才能完成某些复验；后续产品修复已消除前端硬编码 `categoryId=1`，但“有没有分类数据”仍影响某些联调体验。
  - Evidence: `docs/acceptance-tests/specs/master-data.md`
- migration 体系另有独立 staging/bootstrap 与业务迁移脚本，不应与系统管理 seed 混为一谈。
  - Evidence: `package.json`, `scripts/migration/bootstrap-staging.ts`, `scripts/migration/stock-scope-phase2/migrate.ts`

## Constraints

- 需要区分“系统登录/RBAC 初始化”、“master-data 最小运行前置”、“迁移导入数据”三种不同初始化语义。
- 当前 `.omx` 目录原先不存在，本次为 deep-interview 预检新建。
- 本轮仅做需求澄清与事实收集，不直接实现 seed/注数脚本。

## Unknowns / open questions

- 用户问的“初始化数据”具体指哪一层：
  - 冷启动后可登录并看到菜单
  - 可以跑业务链路/验收
  - 迁移/导数前置
- 用户是想知道“仓库里已有自动 seed”，还是“当前这套环境还缺哪些真实业务数据要补”。
- 用户希望得到的输出形态是：
  - 最小数据清单
  - SQL / API 注数脚本
  - 启动 checklist

## Decision-boundary unknowns

- 我可以默认按“本地冷启动最小可运行数据”来整理，还是必须按某个具体模块/验收 case 给出注数清单？
- 是否允许把“测试 fixture / API 补数”也算作初始化方案的一部分？

## Likely codebase touchpoints

- `src/modules/rbac/infrastructure/in-memory-rbac.repository.ts`
- `src/modules/master-data/application/master-data.service.ts`
- `src/modules/master-data/infrastructure/master-data.repository.ts`
- `docs/requirements/domain/system-management-module.md`
- `docs/requirements/domain/master-data-management.md`
- `docs/acceptance-tests/specs/master-data.md`
- `package.json`
