# 前端旧风格回归阶段基线

## Metadata

- ID: `req-20260326-1900-frontend-old-style-adaptation`
- Status: `confirmed`
- Lifecycle disposition: `retained-completed`
- Owner: `user`
- Topic requirement: `docs/requirements/topics/frontend-old-style-adaptation.md`
- Related tasks:
  - `docs/tasks/archive/retained-completed/task-20260326-1940-frontend-old-style-phase1-shell-integration.md`
  - `docs/tasks/archive/retained-completed/task-20260327-1000-frontend-home-legacy-chart-restore.md`

## 用户需求

- [x] 前端回归只回归表现层风格，不回退当前 NestJS 后端架构与接口能力。
- [x] 登录页、Layout、首页 `/index`、顶部 / 侧边栏 / 标签页需要优先回归旧项目节奏。
- [x] `销售管理`、`生产车间`、`研发协同 / RD 小仓` 等真实业务分组必须保留，不回到泛化分组语义。
- [x] `RD 小仓` 相关页面必须保留，并维持非镜像双视角与 RD 独立首页行为。
- [x] 交付节奏按阶段推进，先收口壳层和高频入口，再继续细化业务页、详情页和编辑流。

## 当前进展

- 阶段进度: 已完成 Phase 1 `shell integration` 与 Phase 2 `/index` 旧版图表首页回归，并已归档对应 task。
- 当前状态: 长期约束、能力清单与阶段路线图已收口到 `docs/requirements/topics/frontend-old-style-adaptation.md`；本文档只保留已完成前两阶段的 requirement 基线，后续业务列表页、详情页和编辑流应另开新的前端切片 requirement / task。
- 已完成基线: 登录页 / 壳层 / 一级菜单分组 / RD 双视角行为已收口；`/index` 已恢复旧版统计卡 + 图表节奏，同时保持低权限安全降级、RD 直达 `workbench` 和当前 NestJS 权限 / 菜单 / 会话契约。
- 阻塞项: None
- 下一步: 归档；等待后续新切片。

## 待确认

- None
