# GitHub CI Autofix

## Metadata

- Scope: 为当前仓库补齐“CI 结束后自动诊断、自动修复、再次推送、全过程留痕”的闭环
- Related requirement: `docs/requirements/req-20260328-1945-github-ci-autofix.md`
- Status: `completed`
- Review status: `reviewed`
- Lifecycle disposition: `active`
- Planner: `assistant`
- Coder: `assistant`
- Reviewer: `assistant`
- Last updated: `2026-03-28`
- Related checklist:
- Related files:
  - `docs/requirements/req-20260328-1945-github-ci-autofix.md`
  - `docs/tasks/task-20260328-1945-github-ci-autofix.md`
  - `docs/tasks/TASK_CENTER.md`
  - `docs/requirements/REQUIREMENT_CENTER.md`
  - `package.json`
  - `.github/workflows/ci-autofix.yml`
  - `scripts/ci-autofix/run.mjs`

## Requirement Alignment

- Requirement doc:
  - `docs/requirements/req-20260328-1945-github-ci-autofix.md`
- User intent summary:
  - 不满足于“看 CI 结果”，而是要形成自动闭环
  - `CI` 失败后，AI 要能够拿到日志、做出修复、重新推送，并触发下一轮验证
  - 自动化过程必须有可追溯日志，而不是只留下最终代码
- Acceptance criteria carried into this task:
  - GitHub 在 `CI` 完成后能够自动触发后续处理
  - 自动化流程能读取失败 run / job / log 信息
  - 自动化流程能调用本机 `codex` CLI 尝试修复
  - 自动化流程在修复后能重新执行与 `CI` 对齐的本地验证并决定是否推送
  - 全过程日志保存在仓库工作区，并可作为 workflow artifact 保留
  - 自动化流程有明确护栏，避免无限循环、修改受保护分支或处理 fork 分支
- Open questions requiring user confirmation:
  - None

## Requirement Sync

- Req-facing phase progress:
  - 从“仅有首版 GitHub CI”推进到“开始补齐 CI 自动诊断与自动修复闭环”
- Req-facing current state:
  - 自动修复通过 `workflow_run` 触发，并在 `sft` 用户下的 self-hosted runner 上调用本机 `codex`
- Req-facing blockers:
  - 需要把当前 `ci-autofix` 变更推到远端，并做一次真实失败场景的端到端演练
- Req-facing next step:
  - 推送变更并做真实 `workflow_run` 验证
- Requirement doc sync owner:
  - `assistant`

## Goal And Acceptance Criteria

- Goal:
  - 让仓库具备可控的 `CI -> AI 诊断 -> 自动修复 -> 再验证 -> 再推送` 闭环，并在失败和成功两条路径上都保留审计级日志
- Acceptance criteria:
  - 新增 `workflow_run` 触发的 `.github/workflows/ci-autofix.yml`
  - 新增 `scripts/ci-autofix/run.mjs`，可独立执行自动修复流程
  - 脚本能够获取指定 workflow run 的元数据、job 列表和失败日志，并落盘到 `logs/ci-autofix/**`
  - 脚本能够调用 `codex exec`，把失败上下文交给 AI 修复
  - 脚本能够重新执行与当前 `.github/workflows/ci.yml` 对齐的验证命令
  - 修复成功时脚本能够在护栏允许的分支上自动 commit + push
  - 修复失败、无改动、权限缺失、stale run、分支受保护等场景都必须明确记录并安全退出

## Scope And Ownership

- Allowed code paths:
  - `docs/requirements/req-20260328-1945-github-ci-autofix.md`
  - `docs/tasks/task-20260328-1945-github-ci-autofix.md`
  - `docs/tasks/TASK_CENTER.md`
  - `docs/requirements/REQUIREMENT_CENTER.md`
  - `package.json`
  - `.github/workflows/ci-autofix.yml`
  - `scripts/ci-autofix/run.mjs`
- Frozen or shared paths:
  - `src/**`
  - `test/**`
  - `.github/workflows/ci.yml`
- Task doc owner:
  - `assistant`
- Contracts that must not change silently:
  - 现有 `CI` workflow 仍然是基础质量门禁真源，不在本任务内改写其校验命令
  - 自动修复只能处理代码与 workflow 层问题，不能绕过 GitHub 分支保护
  - 自动修复日志必须可回溯，不能只打印到临时终端

## Implementation Plan

- [x] 新增需求与任务文档，并同步中心索引
- [x] 实现 `scripts/ci-autofix/run.mjs`
- [x] 新增 `.github/workflows/ci-autofix.yml`
- [x] 增加脚本入口与配置说明
- [x] 完成本地静态验证与文档回写

## Coder Handoff

- Execution brief:
  - 用最小但完整的方式补齐自动修复闭环，优先复用现有 `codex` CLI、GitHub Actions 和仓库日志目录，不引入新的重型基础设施
- Required source docs or files:
  - `docs/architecture/00-architecture-overview.md`
  - `docs/architecture/modules/scheduler.md`
  - `.github/workflows/ci.yml`
  - `package.json`
  - `web/package.json`
- Owned paths:
  - `docs/requirements/req-20260328-1945-github-ci-autofix.md`
  - `docs/tasks/task-20260328-1945-github-ci-autofix.md`
  - `docs/tasks/TASK_CENTER.md`
  - `docs/requirements/REQUIREMENT_CENTER.md`
  - `package.json`
  - `.github/workflows/ci-autofix.yml`
  - `scripts/ci-autofix/run.mjs`
- Forbidden shared files:
  - `src/**`
  - `test/**`
  - `.github/workflows/ci.yml`
- Constraints and non-goals:
  - 不在本任务内构建新的 webhook 服务、数据库表或 SaaS 平台
  - 不让 AI 直接改写受保护分支
  - 不让自动化在缺少日志、缺少凭据或 stale run 时“硬修”
- Validation command for this scope:
  - `node ./scripts/ci-autofix/run.mjs --help`
  - `node --check ./scripts/ci-autofix/run.mjs`
  - `pnpm typecheck`

## Reviewer Handoff

- Review focus:
  - `workflow_run` 触发条件、权限与 runner 约束是否正确
  - 脚本是否对 fork / 保护分支 / stale run / 无限循环做了足够护栏
  - 日志是否真正落盘且可上传 artifact
  - `codex exec` 调用是否保留了足够的失败上下文和可追溯输出
- Requirement alignment check:
  - 确认交付的是“自动修复闭环”，而不是单纯新增一个查看 CI 结果的脚本
  - 确认成功/失败/跳过路径都有日志和摘要
- Final validation gate:
  - `node --check ./scripts/ci-autofix/run.mjs`
  - `pnpm typecheck`
- Required doc updates:
  - 回写 requirement/task 当前进展
  - 更新 `TASK_CENTER.md` 与 `REQUIREMENT_CENTER.md`

## Parallelization Safety

- Status: `not-safe`
- If not safe, list the shared files or contracts that require a single writer:
  - 自动修复脚本、workflow、需求文档与索引必须保持一致，由单一写者收口更安全

## Review Log

- Validation results:
  - `node --check ./scripts/ci-autofix/run.mjs`：通过
  - `node ./scripts/ci-autofix/run.mjs --help`：通过
  - `pnpm typecheck`：通过
  - GitHub self-hosted runner smoke test：通过；`sft` 用户、`codex login status` 与 `codex exec` 均在 GitHub Actions 任务内成功
- Findings:
  - 当前 runner 已可直接复用本机 Codex ChatGPT 登录态，因此 `OPENAI_API_KEY` 不是必需项，只保留为可选兜底
- Follow-up action:
  - 推送 `ci-autofix` 相关变更后，用一个非保护分支故意制造一次可回滚的 CI 失败做端到端验收

## Final Status

- Outcome:
  - 自动修复骨架已落地到仓库，具备失败 run 拉取、日志归档、Codex 调用、本地回归、自动 commit/push 与 artifact 留痕能力
- Requirement alignment:
  - 当前任务直接对应“CI 完成后自动获取结果、自动修复并保留日志”的需求
- Residual risks or testing gaps:
  - 尚未在真实 GitHub `workflow_run` 事件下做端到端演练
  - 当前 workflow 已收紧到 `saifute-wsm-server` 标签；若未来更换 runner 标签，需要同步调整 `runs-on`
- Directory disposition after completion:
  - keep `active`
- Next action:
  - 推送变更并做一次受控分支演练
