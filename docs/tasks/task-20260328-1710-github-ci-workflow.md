# GitHub CI Workflow

## Metadata

- Scope: 为当前仓库新增一套首版 GitHub Actions CI，覆盖后端基础质量门禁与仓库内独立 `web/` 前端构建校验
- Related requirement: `docs/requirements/req-20260328-1710-github-ci-workflow.md`
- Status: `completed`
- Review status: `reviewed`
- Lifecycle disposition: `active`
- Planner: `assistant`
- Coder: `assistant`
- Reviewer: `assistant`
- Last updated: `2026-03-28`
- Related checklist:
- Related files:
  - `docs/requirements/req-20260328-1710-github-ci-workflow.md`
  - `docs/tasks/TASK_CENTER.md`
  - `docs/requirements/REQUIREMENT_CENTER.md`
  - `package.json`
  - `pnpm-lock.yaml`
  - `web/package.json`
  - `web/pnpm-lock.yaml`
  - `.github/workflows/ci.yml`

## Requirement Alignment

- Requirement doc:
  - `docs/requirements/req-20260328-1710-github-ci-workflow.md`
- User intent summary:
  - 为当前仓库补上一套真实可用的 GitHub CI，而不是套一个和项目脚本脱节的模板
  - 后端主工程需对齐现有 `pnpm` 质量门禁，前端若为仓库内独立工程则同步校验其构建链路
- Acceptance criteria carried into this task:
  - 仓库新增可在 GitHub Actions 运行的 CI workflow
  - 后端至少覆盖依赖安装、`lint`、`typecheck/test` 级别验证与 `build`
  - `web/` 独立前端至少覆盖依赖安装与生产构建
  - workflow 配置尽量复用现有脚本，不额外发明仓库里不存在的命令
- Open questions requiring user confirmation:
  - None

## Requirement Sync

- Req-facing phase progress:
  - 已从“只有本地 Husky 门禁、没有远端 CI”推进到“首版 GitHub Actions 已落地并完成本地校验”
- Req-facing current state:
  - 当前稳定门禁为后端 `prisma validate + typecheck + build` 与 `web build:prod`
- Req-facing blockers:
  - 若要追加全量 lint/test，需要先修复现存仓库问题
- Req-facing next step:
  - 视需要单开后续切片提升 lint/test 覆盖
- Requirement doc sync owner:
  - `assistant`

## Goal And Acceptance Criteria

- Goal:
  - 让仓库在 GitHub 上具备最小但可信的持续集成门禁，能在合并前自动拦截后端基础回归和前端构建错误
- Acceptance criteria:
  - 新增 `.github/workflows/ci.yml`
  - workflow 至少在 `push`、`pull_request`、`workflow_dispatch` 触发
  - 后端 job 使用与仓库一致的 `pnpm` / Node 运行时安装依赖并执行 `pnpm prisma:validate`、`pnpm typecheck`、`pnpm build`
  - 前端 job 能在 `web/` 目录完成 `pnpm install --frozen-lockfile` 与 `pnpm build:prod`
  - workflow 使用缓存能力并禁用 CI 中不必要的 Husky 安装副作用
  - 对当前仓库暂时无法稳定通过的 lint/test 门禁，在任务文档中明确记录原因而不是静默伪装为已覆盖

## Scope And Ownership

- Allowed code paths:
  - `docs/requirements/req-20260328-1710-github-ci-workflow.md`
  - `docs/tasks/task-20260328-1710-github-ci-workflow.md`
  - `docs/tasks/TASK_CENTER.md`
  - `docs/requirements/REQUIREMENT_CENTER.md`
  - `.github/workflows/ci.yml`
- Frozen or shared paths:
  - `src/**`
  - `test/**`
  - `prisma/**`
  - `web/src/**`
- Task doc owner:
  - `assistant`
- Contracts that must not change silently:
  - 后端 CI 以现有 `package.json` 脚本为真源，不改写业务测试语义
  - 前端 CI 仅做已有构建脚本验证，不凭空添加 lint/test 约束
  - 不借本任务修改应用代码或测试逻辑来“迁就” CI

## Implementation Plan

- [ ] 新增需求与任务索引，记录本次 GitHub CI 交付范围
- [ ] 编写 `.github/workflows/ci.yml`，覆盖后端验证与前端构建
- [ ] 安装依赖并执行后端/前端实际命令做本地校验
- [ ] 根据校验结果调整 workflow，并完成文档状态回写

## Coder Handoff

- Execution brief:
  - 用当前仓库已有脚本拼出最小可信 CI，不新增超出现有项目能力的检查项
- Required source docs or files:
  - `docs/architecture/00-architecture-overview.md`
  - `package.json`
  - `web/package.json`
  - `.husky/pre-push`
- Owned paths:
  - `docs/requirements/req-20260328-1710-github-ci-workflow.md`
  - `docs/tasks/task-20260328-1710-github-ci-workflow.md`
  - `docs/tasks/TASK_CENTER.md`
  - `docs/requirements/REQUIREMENT_CENTER.md`
  - `.github/workflows/ci.yml`
- Forbidden shared files:
  - `src/**`
  - `test/**`
  - `prisma/**`
  - `web/src/**`
- Constraints and non-goals:
  - 不在本任务内补业务代码、修测试、改前端源码
  - 不把 CI 扩成发布/CD
  - 不凭空增加数据库服务依赖，优先复用当前可离线运行的测试集合
- Validation command for this scope:
  - `HUSKY=0 pnpm install --frozen-lockfile`
  - `DATABASE_URL='mysql://ci:ci@127.0.0.1:3306/saifute_ci' pnpm prisma:validate`
  - `pnpm typecheck`
  - `pnpm build`
  - `HUSKY=0 pnpm --dir web install --frozen-lockfile`
  - `pnpm --dir web build:prod`

## Reviewer Handoff

- Review focus:
  - workflow 是否真实调用了仓库已有脚本
  - 后端与前端 job 的安装、缓存、工作目录和触发事件是否正确
  - 是否存在会在 CI 中引入额外副作用的本地 hook / 环境依赖
  - 对暂未纳入 CI 的 lint/test 问题是否有明确、可追溯的说明
- Requirement alignment check:
  - 确认交付的是 GitHub CI workflow，而不是本地开发脚本重组
  - 确认前端被纳入仓库级 CI，而不是遗漏在外
- Final validation gate:
  - `DATABASE_URL='mysql://ci:ci@127.0.0.1:3306/saifute_ci' pnpm prisma:validate`
  - `pnpm typecheck`
  - `pnpm build`
  - `pnpm --dir web build:prod`
- Required doc updates:
  - 回写 requirement/task 当前进展
  - 更新 `TASK_CENTER.md` 与 `REQUIREMENT_CENTER.md` 的活跃条目

## Parallelization Safety

- Status: `not-safe`
- If not safe, list the shared files or contracts that require a single writer:
  - workflow、需求索引和任务索引之间需要保持一致，一名写者更安全

## Review Log

- Validation results:
  - `HUSKY=0 pnpm install --frozen-lockfile`：通过
  - `HUSKY=0 pnpm --dir web install --frozen-lockfile`：通过
  - `DATABASE_URL='mysql://ci:ci@127.0.0.1:3306/saifute_ci' pnpm prisma:validate`：通过
  - `pnpm typecheck`：通过
  - `pnpm build`：通过
  - `pnpm --dir web build:prod`：通过
  - `pnpm lint`：失败；当前仓库存在既有前端与 migration 脚本 Biome 问题，不适合作为首版稳定 CI 门禁
  - `pnpm verify`：失败；`src/modules/file-storage/controllers/file-storage.controller.spec.ts` 目前与数据库环境/超时存在耦合，尚不适合直接纳入稳定 CI
- Findings:
  - 首版 workflow 不应直接照搬本地理想门禁，否则会因仓库现存问题导致 CI 常红
- Follow-up action:
  - 后续若要升级到全量 lint/test，先单独修复 Biome 存量问题与文件存储测试耦合

## Final Status

- Outcome:
  - 首版 GitHub Actions CI 已完成并完成本地校验
- Requirement alignment:
  - 当前范围与“构建 github ci 流程”保持一致
- Residual risks or testing gaps:
  - 当前 workflow 尚未覆盖全量 lint 与全量 Jest
  - `file-storage.controller.spec.ts` 需要单独修复后，才能安全纳入 CI
- Directory disposition after completion: keep `active` until是否要追加 lint/test 门禁得到后续处理，再决定是否归档
- Next action:
  - 如需加强门禁，下一步单开切片修复 lint 存量问题与文件存储测试稳定性
