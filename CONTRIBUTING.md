# Contributing

## Main branch policy

- `main` is the only protected trunk branch.
- All changes to `main` must go through a pull request.
- `main` uses squash merge only. Merge commits and rebase merges are disabled.
- Do not push directly to `main`.
- Keep feature branches short-lived and task-focused.

## Pull request rules

- Use a short-lived branch from `main` for each task or bugfix.
- Keep one pull request focused on one coherent change.
- Write the pull request title in Conventional Commits format because the squash commit on `main` should stay readable.
- Prefer deleting short-lived feature branches after merge.

## Required local verification

Run these commands before asking for review:

- `bun run lint`
- `bun run verify`

`verify` currently expands to:

- `bun run typecheck`
- `bun run test`

The local `pre-push` hook also runs:

- `DATABASE_URL=... bun run prisma:generate`
- `bun run verify`

## CI and protection rollout

This repository now includes a GitHub Actions workflow at `.github/workflows/ci.yml` with two stable jobs:

- `lint`
- `verify`

Once that workflow has been merged into `main` and has run successfully there, add these two jobs as required status checks on the `main` branch protection rule.

## Maintainer notes

- Prefer a linear `main` history over long-lived integration-branch merges.
- If a branch accumulates multiple unrelated concerns, split it before merging to `main`.
- Use tags for release anchors instead of relying on merge commits in `main`.
