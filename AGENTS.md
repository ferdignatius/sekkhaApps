# AGENTS.md

Guidance for AI coding agents. Repo docs (README, RULES, PRDs, code READMEs) are mostly in Indonesian.

## Overview

Sekkha — gamified community app for Buddhist-temple youth (streak, points, badge activities/service roles, events, leaderboard). Bun monorepo with two workspaces:

- `sekkha-api/` — Express + Prisma + PostgreSQL, **runs on Bun** (`bun --watch src/server.ts`), entry `src/server.ts` (`src/app.ts` configures Express and registers `AppModule[]`)
- `sekkha-frontend/` — TanStack Start (SSR) + React 19 + Tailwind v4 + shadcn/ui, Vite/Nitro, dev on port 3000

Install once at the root with `bun install` (workspace lockfile: `bun.lock`).

## Commands

Root (bun workspaces): `bun dev` (both), `bun dev:api`, `bun dev:web`, `bun build` / `build:api` / `build:web`. No root-level lint/test/typecheck scripts — run per workspace.

`sekkha-api/` (unit tests run via `bun test` inside `sekkha-api/`; `bun run build` = `tsc`, the typecheck):

- `bun run dev` — API on `:4000` (health: `/health`)
- `bun test` — runs backend unit tests (run from `sekkha-api/`)
- `bun run db:generate` / `db:migrate` / `db:seed` / `db:push` / `db:studio`
- Needs PostgreSQL on `localhost:5432` (`DATABASE_URL` in `sekkha-api/.env`; copy from `.env.example`). There is **no dev compose for Postgres in the repo**. Redis is optional — missing Redis only logs a warning and falls back to in-memory caching.
- `JWT_SECRET` is required in production or the API exits at boot (`src/server.ts`).
- Dev seed accounts: `admin@sekkha.com` / `password123` (full table in root `README.md`).

`sekkha-frontend/` (`bun run ...`):

- `dev` / `lint` (eslint) / `typecheck` (tsc --noEmit) / `test` (vitest run) / `format` (prettier)
- Verify before commit: `lint` → `typecheck` → `test`
- Single test file: `bunx vitest run <path>` (from `sekkha-frontend/`)
- ⚠️ Do NOT run `bun test` at the repo root — it launches Bun's builtin test runner against the vitest files. Run tests from `sekkha-frontend/` or via `bun --filter sekkha-frontend test`.

## Database Schema & Data Models (Prisma)

The source of truth is `sekkha-api/prisma/schema.prisma`. All legacy out-of-scope entities (post/comment, badges gallery, XP levels, RSVP) have been removed.

### Enums
- **`Role`**: `member`, `activist`, `organizer`, `admin`
- **`EventStatus`**: `scheduled`, `active`, `closed`, `cancel`
- **`EventVisibility`**: `all`, `member`, `activist`, `organizer`
- **`AttendanceMethod`**: `qr`, `manual`
- **`PointTransactionType`**: `attendance`, `manual`, `reward`, `system`
- **`SchoolStatus`**: `pending`, `active`, `cancel`

### Models & Normalization
1. **`User` (Lean Identity Table)**:
   - `id`: CUID
   - `userNumber`: BigInt (10-digit format `YYYYMMDDnn`, unique, capped at 99 per day via `src/lib/userNumber.ts`). Can be used to log in.
   - `username`: unique string handle
   - `email`: AES-256-GCM ciphertext string (PII)
   - `emailBindex`: HMAC-SHA256 blind index for $O(1)$ unique lookups without decrypting
   - `emailVerifiedAt`: DateTime timestamp
   - `password`: bcrypt hashed password
   - `role`: `Role` enum (default `member`)
   - `isClaimed`: boolean (pre-provisioned users require changing temp password + verifying email to claim)
   - `onboardingCompleted`: boolean
   - `passwordChangedByUser`: boolean
   - `passwordChangedAt`: DateTime timestamp (used to invalidate older sessions and refresh tokens)
2. **`UserProfile` (Normalized Personal & Academic Data)**:
   - 1:1 relation to `User` via `userId`.
   - `name`: Plaintext display name
   - `phone`: AES-256-GCM ciphertext string (PII)
   - `schoolId`: ForeignKey to `School`
   - `classGrade`: AES-256-GCM ciphertext string (PII)
   - `birthDate`: AES-256-GCM ciphertext of ISO date string (PII)
   - ⚠️ **Note**: `gender` and `address` were intentionally deleted and do NOT exist in the schema.
3. **`UserStats` (Gamification & Engagement Counters)**:
   - 1:1 relation to `User` via `userId`.
   - `points`: Lifetime earned Karma Points
   - `consecutiveMissed`: Missed event counter for pastoral care
   - `totalAttendances`: Lifetime count of finalized attendances
   - `currentStreak`: Consecutive weekly attendance streak (updated on event closure)
   - `lastActivityAt`: Timestamp of last attendance
4. **`School` (Master Data: Institutions)**:
   - `name`: Unique institution name
   - `type`: School level ("SMP", "SMA/SMK", "Universitas", "Umum")
   - `status`: `SchoolStatus` (`pending`, `active`, `cancel`)
   - `isActive`: Boolean flag
   - `requestedBy` / `reviewedBy`: ForeignKeys to `User` for crowdsourced onboarding review
5. **`EventType` (Master Data: Event Categories)**:
   - `code`: Unique code (e.g. `puja_bhakti`, `meditasi`, `dhammasakaccha`)
   - `defaultPointReward`: Default Karma Points for attending this event type
   - `color`: Hex color string for UI calendar tags
   - `isActive`: Boolean flag
6. **`Season` (Master Data: Gamification Quarters/Periods)**:
   - `code`: Unique code (e.g. `S2026-Q1`)
   - `startDate` / `endDate`: Period boundaries
   - `targetAttendance`: Milestone target attendance count for season progress bar
   - `isActive`: Boolean flag (at most one active season enforced via `$transaction`)
7. **`Event` (Event Schedules & Lifecycle)**:
   - `eventDate`: Scheduled execution datetime
   - `status`: `EventStatus` (`scheduled` → `active` → `closed` / `cancel`)
   - `visibility`: `EventVisibility`
   - `pointReward`: Event attendance point reward (default 50)
   - `maxLateMinutes` / `latePenaltyPoints`: Late attendance penalty configuration
   - `eventTypeId` / `seasonId`: ForeignKeys to `EventType` and `Season`
   - ⚠️ **Lifecycle Constraint**: An event **cannot be activated if the current date has passed the scheduled event date** (`current date > event_date`); past events must be rescheduled or cancelled. Deleting `closed` events is forbidden.
8. **`Attendance` (Attendance Logs)**:
   - Unique on `[userId, eventId]` (anti-double scan)
   - `pointsEarned`: Points credited upon event closure
   - `badgeActivityId` / `badgeBonusPoints`: Service duty role and bonus points
   - `isFinalized`: Boolean flag (finalized upon event closure)
9. **`BadgeActivity` (Master Data: Service Duties)**:
   - Service roles for attendees (e.g. MC, chanter, musician, operator) with `bonusPoints` (default +30 Pts).
10. **`PointRule` (Fixed Gamification Engine Policies)**:
    - Predefined policy rules: `attendance_rutin` (+50), `first_attendance_bonus` (+50 for claimed users on 1st attendance), `streak_monthly_bonus` (+50 every 4 consecutive weeks).
    - Hard constraint: Daily point cap of 150 points/day per user.
11. **`PointTransaction` (Append-Only Ledger)**:
    - Unique on `[userId, referenceId, type]`
    - Records all point movements with `ruleId` and `referenceId`.

## Security & Cryptography Standards

- **PII Encryption (Tier 2)**: All personal data (`email`, `phone`, `classGrade`, `birthDate`) is encrypted at rest using `AES-256-GCM` (`sekkha-api/src/lib/encryption.ts`). If decryption fails, never leak raw ciphertext strings.
- **Blind Indexing**: Equality lookups on encrypted fields use deterministic `HMAC-SHA256` blind indexing (`sekkha-api/src/lib/blindIndex.ts`), e.g. `emailBindex`.
- **JWT & Session Security**:
  - Access Token: 15-minute lifespan (`JWT_EXPIRES_IN`), pinned to `HS256`, issuer `sekkha-api`, audience `sekkha-app`.
  - Refresh Token: Stored as SHA-256 hash in Redis / memory / DB, rotated on single-use, sent via `HttpOnly`, `Secure`, `SameSite` cookie (`sekkha_refresh_token`).
  - Session Revocation: Password changes and resets immediately revoke all user refresh tokens and invalidate older JWTs (`passwordChangedAt`).
- **Timing Oracle Mitigation**: Login endpoint runs dummy bcrypt hash verification when a user identifier is not found to equalize response times and prevent enumeration.

## Architecture & Conventions (from RULES.md)

### Component Structure (Shared Kernel)

```
sekkha-frontend/src/components/
├── ui/              # ← shadcn generated, JANGAN DIUBAH
│   ├── button.tsx
│   ├── dialog.tsx
│   └── ...
│
├── base/            # ← shadcn yang di-customize sesuai DESIGN.md
│   ├── Button.tsx   #   wrap ui/button + variant/size Sekkha
│   ├── Input.tsx
│   ├── Badge.tsx
│   └── ...
│
└── common/          # ← komponen komposit (gabungan beberapa base)
    ├── AppTable.tsx
    ├── AppModal.tsx
    └── ...
```

Logika layer component:
```
ui/button.tsx          → component shadcn murni
    ↓
base/Button.tsx        → styling sesuai tokens DESIGN.md
    ↓
common/AppTable.tsx    → pakai base/Button di dalamnya
    ↓
modules/<name>/...     → pakai common/ atau base/ langsung
```

### Module Structure (Frontend)

```
sekkha-frontend/src/modules/<nama-modul>/
├── internal/          # Privat — semua implementasi di sini
│   ├── components/    # UI khusus modul, tidak dipakai modul lain
│   ├── hooks/         # data fetching / logic khusus modul
│   ├── api/           # call ke backend endpoint modul via @/lib/api
│   └── types.ts       # type definitions internal
│
└── index.ts           # Publik — export yang boleh dipakai dari luar
                       # + ModuleDefinition untuk Shell Registry
```

**Aturan Frontend Module:**
1. **Internal = privat**: File di `internal/` HANYA boleh diakses dari dalam modul itu sendiri.
2. **index.ts = kontrak publik**: Modul lain dan Shell hanya boleh import dari `index.ts`.
3. **ModuleDefinition wajib**: Setiap modul wajib export `ModuleDefinition` yang mendaftarkan `navItems` ke registry.
4. **Shared components pakai Shared Kernel**: Modul pakai `@/components/base/` dan `@/components/common/` — DILARANG menduplikasi komponen global di dalam modul.

### Module Structure (Backend)

```
sekkha-api/src/modules/<nama-modul>/
├── routes.ts          # Endpoint Express & middleware (requireAuth, requireRole)
├── controllers.ts     # HTTP handlers: thin, parse + validasi Zod + delegate ke services
├── services.ts        # Otak bisnis: business logic, query Prisma, cache & eventbus.publish()
├── models.ts          # TypeScript interfaces, DTOs & Zod schemas
├── module.ts          # Kontrak publik AppModule: register(app) + subscribe?()
├── index.ts           # Barrel export publik untuk konsumsi luar
└── internal/          # (Opsional) Helper privat khusus modul (cron, sse, email, otpStore, dll.)
```

**Aturan Backend Module:**
1. **module.ts & index.ts = kontrak publik**: `src/app.ts` / `src/server.ts` hanya mengimpor `module.ts` atau fungsi publik lewat `index.ts`.
2. **Controller tipis (`controllers.ts`)**: Hanya ekstrak input (`req.body`, `req.params`, `req.query`), validasi Zod, delegasi ke `services.ts`, kirim response JSON. Dilarang query Prisma langsung di controller.
3. **Service = brain (`services.ts`)**: Semua business logic, aturan bisnis, query Prisma, cache invalidation, dan `eventbus.publish()` berada di sini.
4. **Internal = privat (`internal/`)**: Helper privat modul dilarang diimpor modul lain.
5. **EventBus untuk cross-module**: Modul A memicu efek modul B HANYA via domain event EventBus (`src/core/eventbus`). Dilarang import service lintas modul.

### Git & Commit Conventions (Niche Commits)

1. **No Auto-Commit**: Agent dilarang commit mandiri. Commit dilakukan hanya bila diinstruksikan eksplisit oleh user.
2. **Satu commit = satu topik**: Jangan campur fitur beda domain dalam satu commit.
3. **Format pesan commit**: `v<target> - <type>(<scope>): <summary>` untuk judul, plus body bullet bila perubahan non-trivial (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, dll.).
4. **Verifikasi sebelum commit**: API → `bun run build` (tsc) & `bun test`; Frontend → `lint` → `typecheck` → `test`.
5. **CHANGELOG diisi saat perubahan**: Setiap fitur/fix wajib catat entri ke `[Unreleased]` di `CHANGELOG.md` (Added/Changed/Fixed/Removed). Saat release, pindahkan ke `[X.Y.Z] - tanggal`.

## Architecture: modular monolith + shell/registry

Sebelum fitur non-trivial, baca PRD di `prd-sekkha/<domain>/` (PRD adalah source of truth produk).

Frontend (`sekkha-frontend/src/`):

- Each feature = `src/modules/<name>/` exposing only `index.ts` (`internal/` is private to the module). Every module must export a `ModuleDefinition`.
- The 9 frontend modules: `landing-page`, `auth`, `home`, `events`, `leaderboard`, `people`, `users`, `pengurus`, `configure`.
- `src/shell/registry.ts` = contract + `activeModules` (array order = sidebar order). Sidebar/nav is rendered from the registry — never hardcode nav for one module.
- Routes: TanStack file-based `src/routes/`; authenticated pages live under `routes/_authenticated/` and just import pages from modules. `routeTree.gen.ts` is auto-generated — **never edit**.
- Components: `components/ui/` = shadcn generated (**never edit or add custom code here**) → `components/base/` (customized) → `components/common/` (composites). Modules use base/common, don't duplicate.
- HTTP only via `@/lib/api` (injects `localStorage.sekkha_access_token`; handles automatic 401 silent refresh with token-scoped caching).
- Design tokens: `DESIGN.md` + `src/styles.css`.

Backend (`sekkha-api/src/`):

- `src/app.ts` owns the `AppModule[]` array (`src/server.ts` is the server entry point and calls `subscribe()`); new modules get imported + added in `src/app.ts`. `AppModule` = `{ name, register(app), subscribe?() }`.
- The 9 backend modules: `auth`, `users`, `people`, `events`, `leaderboard`, `configure`, `schools`, `pengurus`, `home`.
- Module layers: `{routes,controllers,services,models,module,index}.ts` + optional `internal/` for module-private helpers (e.g. `cron.ts`, `sse.ts`, `email.ts`, `otpStore.ts`). Controllers stay thin (HTTP + validation); business logic & Prisma queries live in `services.ts`.
- Cross-module communication ONLY via the in-memory EventBus (`@/core/eventbus`); event names + payload types live in `core/eventbus/events.ts` (never publish/subscribe on undeclared events).
- Roles: `member`, `activist`, `organizer`, `admin`. Guards: `requireAuth` then `requireRole(...)` — admin bypasses role checks.

Per-folder rules live in READMEs next to the code (`sekkha-*/src/**/README.md`) — read the one for the folder you're touching.

## Gotchas

- Workspaces are `sekkha-api` + `sekkha-frontend`, tooling is bun, and `sekkha-api/docker-compose.yml` + `Dockerfile` are the **production deploy** (pulls pinned image `ferdignatius/sekkha-api`, external networks).
- Run `db:generate` after editing `prisma/schema.prisma`. Run `db:push` (or `db:migrate --name <name>`) to sync schema changes to PostgreSQL.
- Tests are colocated (`__tests__/`, `*.test.ts(x)`); property-based tests are `*.pbt.test.ts` (fast-check). Vitest uses `vitest.config.ts`, deliberately separate from `vite.config.ts` because TanStack Start/Nitro plugins bundle their own React and break unit tests. jsdom + globals; `src/test-setup.ts` stubs IntersectionObserver for framer-motion.
- Prettier: no semicolons, double quotes, print width 80, Tailwind class sorting (`cn`/`cva` aware) — `sekkha-frontend/.prettierrc`.
- `agent-skills/` & `.agents/skills/`: Koleksi agent skills untuk referensi praktik engineering terbaik. Coding agent WAJIB membaca skill terkait di folder ini sebelum implementasi untuk memaksimalkan kualitas output.
- Branches: `main`, `staging`, `development`, `production`. Active development happens on **`development`**.
- Conventional Commits (`feat:`, `fix:`, `chore:`…).

## Coding Agent Rules & Engineering Standards

1. **Alignment PRD & Monorepo (Source of Truth)**: Sebelum dan selama implementasi, agent wajib memverifikasi keselarasan penuh antara dokumen PRD di `prd-sekkha/<domain>/`, modul backend di `sekkha-api/`, dan modul frontend di `sekkha-frontend/`. Kontrak API (endpoints, payloads, data types), domain logic, serta state/UI harus konsisten tanpa deviasi liar.
2. **Agent Skills Reference**: Sebelum merancang atau menulis kode, agent wajib membaca dan merujuk skill terkait di `agent-skills/` (atau `.agents/skills/`) sesuai kebutuhan task.
3. **No Auto-Commit**: Agent DILARANG melakukan auto-commit secara mandiri. Hanya buat commit saat diminta secara eksplisit oleh user.
4. **Confidence Scoring**: Setiap respon/prompt agent WAJIB menyertakan skor confidence (contoh: `Confidence: 95%`) beserta justification ringkas untuk memastikan keselarasan pemahaman antara user dan agent.
5. **Engineering Principles**:
   - **YAGNI**: Terapkan prinsip "You Aren't Gonna Need It". Jangan membuat abstraksi spekulatif, file kosong, atau fitur berlebih yang belum diminta.
   - **Clean Code**: Struktur rapi, penamaan deskriptif, fungsi modular berfokus satu tanggung jawab (SRP), minim redundansi, mudah diuji dan dirawat.
   - **Big O Optimization**: Optimalkan algoritma dan query database dari segi waktu dan memori (utamakan $O(1)$ lookup via hash map/set/index, hindari $O(n^2)$ pada collections).
   - **Maximum Security (OWASP Top 10)**: Validasi dan sanitasi ketat di semua trust boundaries (Zod/Prisma), cegah injection, pastikan auth guard & RBAC di setiap route, enkripsi PII, lindungi session dan tokens.
6. **UI Language (English)**: Seluruh user interface (UI) aplikasi (`sekkha-frontend`) wajib menggunakan bahasa Inggris (English), mencakup labels, navigation items, buttons, placeholders, dialogs, toasts, error messages, dan copy user-facing lainnya. Dokumentasi repo/PRD boleh berbahasa Indonesia, tetapi interface end-user harus konsisten berbahasa Inggris.

## Release & Versioning

Semver; all three `package.json` files (root, api, frontend) share one version — the annotated git tag is the source of truth. Bump rules: breaking → MAJOR, additive → MINOR, fix → PATCH.

Release flow (from `production`):

1. `bun run release <ver>` — bumps version in all workspaces (no deps needed)
2. Move `[Unreleased]` entries to the new version in `CHANGELOG.md`; write each entry with the change, not at release time
3. `git commit -m "release: vX.Y.Z"` then `git tag -a vX.Y.Z -m "Release X.Y.Z"` then push branch + tag
4. On deploy, bump the pinned image tag in `sekkha-api/docker-compose.yml` (`ferdignatius/sekkha-api:vX.Y.Z`)

