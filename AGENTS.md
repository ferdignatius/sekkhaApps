# AGENTS.md

Guidance for AI coding agents. Repo docs (README, RULES, PRDs, code READMEs) are mostly in Indonesian.

## Overview

Sekkha — gamified community app for Buddhist-temple youth (streak, points, badges, events, leaderboard). Bun monorepo with two workspaces:

- `sekkha-api/` — Express + Prisma + PostgreSQL, **runs on Bun** (`bun --watch src/index.ts`), entry `src/index.ts`
- `sekkha-frontend/` — TanStack Start (SSR) + React 19 + Tailwind v4 + shadcn/ui, Vite/Nitro, dev on port 3000

Install once at the root with `bun install` (workspace lockfile: `bun.lock`).

## Commands

Root (bun workspaces): `bun dev` (both), `bun dev:api`, `bun dev:web`, `bun build` / `build:api` / `build:web`. No root-level lint/test/typecheck scripts — run per workspace.

`sekkha-api/` (no lint or tests; `bun run build` = `tsc`, the only typecheck):

- `bun run dev` — API on `:4000` (health: `/health`)
- `bun run db:generate` / `db:migrate` / `db:seed` / `db:push` / `db:studio`
- Needs PostgreSQL on `localhost:5432` (`DATABASE_URL` in `sekkha-api/.env`; copy from `.env.example`). There is **no dev compose for Postgres in the repo**. Redis is optional — missing Redis only logs a warning and disables caching.
- `JWT_SECRET` is required in production or the API exits at boot (`src/index.ts`).
- Dev seed accounts: `admin@sekkha.local` / `admin` (full table in root `README.md`).

`sekkha-frontend/` (`bun run ...`):

- `dev` / `lint` (eslint) / `typecheck` (tsc --noEmit) / `test` (vitest run) / `format` (prettier)
- Verify before commit: `lint` → `typecheck` → `test`
- Single test file: `bunx vitest run <path>` (from `sekkha-frontend/`)
- ⚠️ Do NOT run `bun test` at the repo root — it launches Bun's builtin test runner against the vitest files. Run tests from `sekkha-frontend/` or via `bun --filter sekkha-frontend test`.

## Architecture: modular monolith + shell/registry

Before non-trivial features, read `RULES.md` (conventions) and the PRD in `prd-sekkha/<domain>/` (PRDs are the product source of truth; PR code should trace to them).

Frontend (`sekkha-frontend/src/`):

- Each feature = `src/modules/<name>/` exposing only `index.ts` (`internal/` is private to the module). Every module must export a `ModuleDefinition`.
- `src/shell/registry.ts` = contract + `activeModules` (array order = sidebar order). Sidebar/nav is rendered from the registry — never hardcode nav for one module.
- Routes: TanStack file-based `src/routes/`; authenticated pages live under `routes/_authenticated/` and just import pages from modules. `routeTree.gen.ts` is auto-generated — **never edit**.
- Components: `components/ui/` = shadcn generated (**never edit**) → `components/base/` (customized) → `components/common/` (composites). Modules use base/common, don't duplicate.
- HTTP only via `@/lib/api` (injects `localStorage.sekkha_access_token`; base URL `VITE_API_URL`, fallback `http://localhost:4000/api`).
- Design tokens: `DESIGN.md` + `src/styles.css`.

Backend (`sekkha-api/src/`):

- `src/index.ts` owns the `AppModule[]` array; new modules get imported + added there. `AppModule` = `{ name, register(app), subscribe?() }`.
- Module layers: `module.ts` → `internal/{router,handler,service,repository,validation}.ts`. Handlers stay thin; business logic in service; repository = Prisma queries only.
- Cross-module communication ONLY via the in-memory EventBus (`@/core/eventbus`); event names + payload types live in `core/eventbus/events.ts` (never publish/subscribe on undeclared events).
- Roles: `umat`, `aktivis`, `pengurus`, `admin`. Guards: `requireAuth` then `requireRole(...)` — admin bypasses role checks.

Per-folder rules live in READMEs next to the code (`sekkha-*/src/**/README.md`) — read the one for the folder you're touching.

## Gotchas

- Root `README.md` quick start is **stale**: it says npm, `sekkha-main-app/`, and a dev docker-compose for Postgres. Truth: workspaces are `sekkha-api` + `sekkha-frontend`, tooling is bun, and `sekkha-api/docker-compose.yml` + `Dockerfile` are the **production deploy** (pulls pinned image `ferdignatius/sekkha-api`, external networks).
- Run `db:generate` after editing `prisma/schema.prisma`.
- Tests are colocated (`__tests__/`, `*.test.ts(x)`); property-based tests are `*.pbt.test.ts` (fast-check). Vitest uses `vitest.config.ts`, deliberately separate from `vite.config.ts` because TanStack Start/Nitro plugins bundle their own React and break unit tests. jsdom + globals; `src/test-setup.ts` stubs IntersectionObserver for framer-motion.
- Prettier: no semicolons, double quotes, print width 80, Tailwind class sorting (`cn`/`cva` aware) — `sekkha-frontend/.prettierrc`.
- `agent-skills/` is a gitignored upstream clone (addyosmani/agent-skills); the installed skills live in `.agents/skills/`. Neither is project code — don't edit or build them.
- Branches: `main` and `production`. Conventional Commits (`feat:`, `fix:`, `chore:`…).

## Release & Versioning

Semver; all three `package.json` files (root, api, frontend) share one version — the annotated git tag is the source of truth. Bump rules: breaking → MAJOR, additive → MINOR, fix → PATCH.

Release flow (from `production`):

1. `bun run release <ver>` — bumps version in all workspaces (no deps needed)
2. Move `[Unreleased]` entries to the new version in `CHANGELOG.md`; write each entry with the change, not at release time
3. `git commit -m "release: vX.Y.Z"` then `git tag -a vX.Y.Z -m "Release X.Y.Z"` then push branch + tag
4. On deploy, bump the pinned image tag in `sekkha-api/docker-compose.yml` (`ferdignatius/sekkha-api:vX.Y.Z`)
