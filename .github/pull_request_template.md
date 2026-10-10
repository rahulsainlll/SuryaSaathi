## What

<!-- What does this change, and why? Link the issue it closes. -->

Closes #

## How to test

<!-- Commands or steps a reviewer can run. -->

## Checklist

- [ ] Title follows Conventional Commits (`feat(scope): …`, `fix(scope): …`)
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` pass
- [ ] `uv run ruff check .`, `uv run mypy` and `uv run pytest` pass (if Python changed)
- [ ] Schema types regenerated (if `packages/schemas` changed)
- [ ] No credentials or real household data
