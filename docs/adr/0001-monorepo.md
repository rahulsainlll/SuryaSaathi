# 1. One monorepo with pnpm, Turborepo and uv

- Status: accepted
- Date: 2026-10-10

## Context

SuryaSaathi has two Next.js apps, shared TypeScript packages, a CDK app and several Python
Lambda services. They share schemas and change together.

## Decision

Keep everything in one repository. TypeScript uses pnpm workspaces with Turborepo for task
orchestration and caching. Python services form one uv workspace with a single lockfile.

## Consequences

One clone and two install commands (`pnpm install`, `uv sync`) set up everything, and CI checks
all of it on every pull request. The two toolchains run side by side rather than through one
build tool.
