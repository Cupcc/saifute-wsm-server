# GitHub CI 流程

## Metadata

- ID: `req-20260328-1710-github-ci-workflow`
- Status: `confirmed`
- Lifecycle disposition: `active`
- Owner: `user`
- Related tasks:
  - `docs/tasks/task-20260328-1710-github-ci-workflow.md`

## 用户需求

- [x] 为当前仓库构建 GitHub CI 流程。
- [x] CI 需要贴合当前仓库实际结构，至少覆盖后端主工程的基础质量门禁。
- [x] 仓库内存在独立 `web/` 前端工程时，CI 应一并考虑前端可构建性，避免只验证后端。

## 当前进展

- 阶段进度: 首版 GitHub Actions workflow 已落地，并已完成本地真实安装与命令校验。
- 当前状态: `.github/workflows/ci.yml` 已覆盖后端 `typecheck + prisma validate + build` 与 `web/` 前端 `build:prod`。本地验证表明这组命令可以通过；全量 `pnpm lint` 目前会被仓库内既有 Biome 问题拦下，全量 `pnpm verify` 会被 `file-storage.controller.spec.ts` 的环境/超时问题拦下，因此未被纳入首版稳定 CI。
- 阻塞项: 若后续希望把 CI 升级到全量 lint/test，需要先收口现有前端 Biome 问题与文件存储测试的数据库/超时耦合。
- 下一步: 若需要更严格门禁，可在修复上述现存问题后把 `pnpm lint`、`pnpm verify` 追加进 workflow。

## 待确认

- None
