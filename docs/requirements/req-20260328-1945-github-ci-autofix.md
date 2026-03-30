# GitHub CI 自动修复闭环

## Metadata

- ID: `req-20260328-1945-github-ci-autofix`
- Status: `confirmed`
- Lifecycle disposition: `active`
- Owner: `user`
- Related tasks:
  - `docs/tasks/task-20260328-1945-github-ci-autofix.md`

## 用户需求

- [x] 推送代码后继续由 GitHub 自动执行现有 `CI` workflow。
- [x] 当 `CI` 运行结束后，系统需要自动获取运行结果，而不是手动登录 GitHub 查看。
- [x] 若 `CI` 通过，则自动结束流程。
- [x] 若 `CI` 失败，则由 AI 自动查看失败日志、尝试修复、再次推送并触发新一轮 `CI`。
- [x] 整个自动化过程必须保留完整操作日志，便于回溯每一步做了什么、为什么这么做、最终结果如何。

## 当前进展

- 阶段进度: `ci-autofix` 脚本、`workflow_run` workflow、日志落盘目录和基础护栏已经落地到仓库。
- 当前状态: 仓库现已具备 `CI -> workflow_run -> codex exec -> 本地验证 -> commit/push -> artifact 留痕` 的自动修复骨架；`sft` 用户下的 self-hosted runner 已上线，并已通过真实 smoke test 验证可直接复用本机 Codex 的 ChatGPT 登录态。
- 阻塞项: 当前主要剩余工作是把 `ci-autofix` 变更推到远端并做一次真实 `workflow_run` 端到端演练；`OPENAI_API_KEY` 不再是必需项，仅作为未来无人值守兜底可选。
- 下一步: 推送 `ci-autofix` 相关变更，并在一个非保护分支上制造一次可回滚的 CI 失败，验证自动修复闭环。

## 默认护栏

- 默认只处理同仓库分支的失败 `CI`，跳过 fork PR。
- 默认跳过受保护分支（如 `main` / `master`），避免 AI 直接修改主分支。
- 默认限制连续自动修复次数，防止失败时进入无限推送循环。
- 默认把完整过程日志保存在仓库工作区 `logs/ci-autofix/**`，并由 GitHub Actions 上传为 artifact。

## 待确认

- None
