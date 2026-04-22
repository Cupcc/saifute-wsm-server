# Contributing

This repository currently uses a lightweight team workflow optimized for a
small team and a large active development phase.

## Branches

- `dev`: daily integration branch for ongoing development
- `main`: stage/release branch

## Daily Development

- Normal changes may be pushed directly to `dev`.
- High-risk changes should go through a PR into `dev`.
- Keep changes scoped to one main goal when practical, but do not over-split
  work during heavy development.

## Pull Requests To Main

- `main` must only be updated through pull requests.
- PRs targeting `main` must use a Conventional Commits title.
- Use the repository pull request template.

Examples:

- `feat(reporting): add monthly reporting filters`
- `fix(dev): restore bun-native dev scripts`
- `chore(main): sync dev into main`

## After Releasing Dev To Main

When `dev -> main` is merged with squash merge, sync `origin/main` back into
`dev` before opening the next release PR.

Recommended commands:

```bash
git checkout dev
git fetch origin
git merge origin/main
git push origin dev
```

## Why This Exists

- Keep `dev` fast for daily development.
- Keep `main` stable and reviewable.
- Avoid repeated history noise in later `dev -> main` pull requests.
