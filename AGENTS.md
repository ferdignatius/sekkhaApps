# AGENTS.md

Guidance for AI coding agents. Monorepo documentation and PRDs (`prd-sekkha/`) are mostly written in Indonesian, but all application UI must be in English.

## Overview & Workspaces

Sekkha is a gamified community app for Buddhist-temple youth (attendance streaks, karma points, service duties, event check-in, leaderboard). Bun monorepo with two workspaces:

- `sekkha-api/`: Express + Prisma + PostgreSQL, **runs on Bun** (`bun --watch src/server.ts`), port `:4000` (health: `/health`).
- `sekkha-frontend/`: TanStack Start (SSR) + React 19 + Tailwind v4 + shadcn/ui, Vite/Nitro, dev on port `:3000`.

Install dependencies once at the root with `bun install` (workspace lockfile: `bun.lock`). Active development happens on the **`development`** branch.

## Commands & Verification

| Task | Backend (`sekkha-api/`) | Frontend (`sekkha-frontend/`) |
|---|---|---|
| **Dev Server** | `bun run dev` (port 4000) | `bun run dev` (port 3000) |
| **Typecheck** | `bun run build` (`tsc`) | `bun run typecheck` (`tsc --noEmit`) |
| **Lint / Format** | — | `bun run lint` / `bun run format` |
| **Unit Tests** | `bun test` | `bun run test` (`vitest run`) |
| **Database** | `bun run db:generate` / `db:migrate` / `db:push` / `db:seed` | — |

- **Verify before commit**: Backend: `bun run build` & `bun test`; Frontend: `lint` → `typecheck` → `test`.
- **Single frontend test**: `bun --filter sekkha-frontend test <testFileName>`.
- ⚠️ **Strict Constraint**: Never run `bun test` at repo root — it invokes Bun's test runner on Vitest test files. Run tests inside workspaces or via `bun --filter <workspace> test`.
- Dev seed account: `admin@sekkha.com` / `password123`.

## Architecture: Modular Monolith

### Frontend (`sekkha-frontend/src/`)
- **9 Feature Modules**: `landing-page`, `auth`, `home`, `events`, `leaderboard`, `people`, `users`, `pengurus`, `configure`.
- **Encapsulation**: Code inside `modules/<name>/internal/` is strictly private. Only `modules/<name>/index.ts` is public and must export a `ModuleDefinition` registered in `shell/registry.ts` (drives navigation).
- **Component Hierarchy & Workflow**: Generate/ambil basis komponen shadcn (`components/ui/`, **never edit directly or add custom code here**) → refine & adaptasikan styling sesuai `DESIGN.md` di `components/base/` (Sekkha design tokens) → susun ke `components/common/` (komposit) → konsumsi di feature modules. Jangan buat elemen mentah jika sudah ada primitif shadcn yang ekuivalen.
- **Data Fetching**: HTTP calls strictly via `@/lib/api` (handles JWT injection, token-scoped caching, and automatic 401 silent refresh).
- **Design Tokens**: Defined in `DESIGN.md` and `src/styles.css`.

### Backend (`sekkha-api/src/`)
- **9 Modules**: `auth`, `users`, `people`, `events`, `leaderboard`, `configure`, `schools`, `pengurus`, `home`. Registered in `src/app.ts` as `AppModule[]`.
- **Module Structure**:
  - `controllers.ts`: Thin HTTP handlers (input extraction, Zod validation, JSON responses). Direct database queries here are forbidden.
  - `services.ts`: Business logic brain, Prisma queries, caching, and domain events.
  - `models.ts`: Zod validation schemas and TypeScript DTOs.
  - `module.ts` / `index.ts`: Public contracts. `internal/` is strictly module-private.
- **Cross-Module Communication**: Exclusively via in-memory EventBus (`src/core/eventbus`). Event types must be declared in `core/eventbus/events.ts`. Never import services across different modules directly.
- **Roles & Guards**: Roles: `member`, `activist`, `organizer`, `admin`. Guard order: `requireAuth` then `requireRole(...)` (admin bypasses role checks).

## Domain Rules & Security Standards

1. **PII Encryption (Tier 2)**: All personal data (`email`, `phone`, `classGrade`, `birthDate`) is encrypted at rest using AES-256-GCM (`src/lib/encryption.ts`). If decryption fails, never leak raw ciphertext strings.
2. **Blind Indexing**: Equality lookups on encrypted fields use deterministic HMAC-SHA256 blind indexing (`src/lib/blindIndex.ts`), e.g. `emailBindex`.
3. **User Number Format**: Standard 10-digit format `YYYYMMDDnn` (capped at 99 users/day per `src/lib/userNumber.ts`).
4. **Session & Revocation**: Password changes/resets immediately revoke all user refresh tokens (`auth:user_refresh:${userId}` Set) and invalidate older JWTs (`passwordChangedAt`).
5. **Event Lifecycle Guard**: An event **cannot be activated if the scheduled date has passed** (`today > event_date`); past events must be rescheduled or cancelled. Deleting `closed` events is forbidden.
6. **Gamification Caps**: Fixed daily limit of 150 points/day per user. Single active season enforced per period.
7. **Database Schema**: The single source of truth is `sekkha-api/prisma/schema.prisma`. Refer directly to this file for current models, relations, and indexes.

## Coding Agent Standards

1. **Mandatory Skills Reference**: Untuk mengeksekusi prompt/task apapun, pastikan agent SELALU membaca dan menerapkan panduan dari `agent-skills/` yang relevan sebelum dan selama implementasi (misal: `frontend-ui-engineering`, `test-driven-development`, `security-and-hardening`, `api-and-interface-design`, dll.).
2. **Component Workflow (shadcn → Refined via DESIGN.md)**: Untuk setiap komponen UI, selalu gunakan basis primitif shadcn (`components/ui/`), kemudian lakukan refinement dan adaptasi styling sesuai aturan design tokens di `DESIGN.md` (warm cream canvas, radius konsisten, typography, micro-interactions) di `components/base/` atau `components/common/`.
3. **PRD Alignment**: Sebelum perubahan non-trivial, baca spec terkait di `prd-sekkha/<domain>/`. Kode, contracts, dan business rules wajib selaras dengan PRD.
4. **UI Language (English)**: Seluruh user interface (UI) aplikasi di `sekkha-frontend` (labels, navigation, buttons, placeholders, dialogs, toasts, error messages) WAJIB menggunakan bahasa Inggris (English).
5. **No Auto-Commit**: Agent DILARANG melakukan commit secara mandiri. Hanya buat commit saat diminta secara eksplisit oleh user.
6. **Conventional Commits**: Format commit messages: `v<target> - <type>(<scope>): <summary>` atau standar Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`).
7. **Confidence Scoring**: Setiap respon agent wajib diawali skor confidence (contoh: `Confidence: 95%`) beserta justifikasi ringkas.
8. **Engineering Principles**:
   - **YAGNI**: Tidak membuat abstraksi spekulatif atau file boilerplate kosong.
   - **Clean Code & Big-O**: Single Responsibility Principle (SRP), $O(1)$ lookups via sets/maps/indexes, hindari $N+1$ queries.
   - **OWASP Security**: Validasi input ketat via Zod, proper auth guards/RBAC, enkripsi PII, dan penanganan error aman tanpa leak stack trace.
