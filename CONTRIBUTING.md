# Contributing to SuryaSaathi

Thanks for helping. Please open an issue to discuss a change before starting a pull request.

## Setup

You need Node.js 20+, pnpm 9+, Python 3.12+ and [uv](https://docs.astral.sh/uv/).

```bash
pnpm install   # TypeScript workspaces (apps, packages, infra)
uv sync        # Python services
```

## Layout

- `apps/*`, `packages/*` and `infra/` are pnpm workspaces, run through Turborepo.
- `services/*` are Python packages in one uv workspace.
- See the [repository structure](README.md#repository-structure) for what lives where.

## Checks

CI runs these on every pull request; run them before you push.

```bash
# TypeScript
pnpm lint
pnpm typecheck
pnpm test
pnpm build

# Python
uv run ruff check .
uv run ruff format --check .
uv run mypy
uv run pytest
```

Run one workspace with `pnpm --filter <name> <script>`, for example `pnpm --filter web dev`.

If you change a JSON schema in `packages/schemas/schemas/`, regenerate the types with
`pnpm --filter @suryasaathi/schemas generate` and commit them.

## Commits and pull requests

- Commits follow [Conventional Commits](https://www.conventionalcommits.org):
  `feat(console): add vendor leaderboard`, `fix(ingest): handle missing fault code`.
  Common types: `feat`, `fix`, `docs`, `refactor`, `test`, `build`, `ci`, `chore`.
- Keep pull requests focused on one change, and fill in the PR template.
- Never commit credentials or real household data. All data in this repository is simulated.

## License

By contributing you agree that your contributions are licensed under the [MIT License](LICENSE).
