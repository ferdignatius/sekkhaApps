# Changelog

All notable changes to Sekkha Apps. Semver (`MAJOR.MINOR.PATCH`); newest on top. Entries are curated for humans — see git log for the full history.

## [1.4.1] - 2026-09-16

### Added
- Browser native EventSource (SSE) authentication support via `?token=` query parameter fallback on `requireAuth` middleware (`sekkha-api/src/middleware/auth.ts`).
- Real-time live attendance feed on the organizer scanner page via SSE stream (`/api/events/:id/live-attendance`), automatically updating recent check-in queue, counts, and cache.
- Dedicated Member QR Code card for members (`umat`) on the attendance scan page, allowing attendees to present their unique registered QR to organizers at check-in stations.
- Strict Content-Security-Policy (CSP), `X-Frame-Options: DENY`, `Cross-Origin-Embedder-Policy: credentialless`, and Camera `Permissions-Policy` headers on the frontend root layout.
- Runtime Zod response validation on `/events` and `/users/me` API queries to guarantee type and data contract safety.

### Changed
- Harmonized attendance flow with vihara domain model: members no longer self-scan event codes, avoiding 403 authorization errors and enforcing organizer-mediated check-in.
- Cleaned up all ESLint warnings (`@typescript-eslint/require-await`, `no-shadow`) and unused variables across frontend test files and components.
- Applied Prettier code formatting consistently across all frontend modules.

## [1.4.0] - 2026-09-15

### Added
- Single-use Refresh Token lifecycle with automatic rotation and revocation via `POST /api/auth/refresh` and HttpOnly cookies (`sekkha_refresh_token`).
- Server-Sent Events (SSE) real-time streaming endpoint (`GET /api/events/:id/live`) for instant attendee check-in broadcasting on the scanner dashboard.
- Comprehensive Read-Only Security Audit Report (`AUDIT_REPORT.md`) reviewing OWASP Top 10 2021, concurrency, architecture, and performance.
- Formal API Contract Specification (`docs/sekkha-api-contract.md`) as single source of truth for request/response payloads, status codes, and envelopes.
- Structured Security Audit Logger (`src/lib/auditLogger.ts`) for tracking authentication lifecycle, permission elevation, and sensitive administrative operations.
- Client-side secure token storage abstraction (`src/lib/storage.ts`) and silent token refresh in `@/lib/api`.
- ESLint 9 configuration with strict quality gate rules for `sekkha-frontend`.
- Unit tests for token revocation, refresh rotation, EventCard rendering, and attendance scan flows.

### Changed
- JWT verification hardened: pinned algorithm to HS256, enforced issuer/audience validation, and verified secret presence & strength during boot.
- Token revocation blacklist hashes bearer tokens with SHA-256 before storage in memory/Redis instead of storing raw credentials.
- Attendance scanning and roster access (`GET /events/:id/attendances`) strictly restricted to `pengurus` and `admin` roles, preventing unauthorized member access and self-check-in abuse.
- Bounded queries across events, notifications, teams, and users with enforced limits (`take`/pagination) to eliminate full-table scan and memory exhaustion risks.
- User and profile responses sanitized across all endpoints to omit password hashes, PIN hashes, and internal authorization timestamps.
- Rate limiting backed by Redis store (`rate-limit-redis`) when available with strict proxy hop parsing.
- Overrode `qs` dependency to `>=6.16.0` to eliminate prototype vulnerability advisory.

## [1.3.0] - 2026-09-10

### Added
- `POST /auth/logout` with token revocation (Redis blacklist + in-memory fallback); frontend logout now calls it before clearing the stored token.
- Dedicated OTP rate limiter (5 requests/15 min/IP) on all register and forgot-password OTP endpoints, plus a brute-force guard: OTP is voided after 5 wrong attempts.
- OTP codes are now generated with a CSPRNG (`crypto.randomInt`) instead of `Math.random`.
- GDPR / UU PDP user data export (`GET /users/me/export`) and self-serve account deletion (`POST /users/me/delete-account`).
- Concurrency-safe unique user number generation (`src/lib/userNumber.ts`) with sequence-order lookup and conflict retry loops.
- Field-level encryption at rest (AES-256-GCM) for member PII — email, phone, class grade, birth date, gender — with HMAC-SHA256 blind-index email lookup; keys configured via `ENCRYPTION_KEY`/`BLIND_INDEX_KEY`.
- Claim PIN flow for pre-provisioned members: pengurus/admin generate a bcrypt-hashed 30-day PIN (`POST /teams/members/:id/generate-claim-pin`), and the member claims their account via `POST /teams/link-legacy-account`, merging attendance and points history.
- Tier 1 one-way hashing for `claimPin`: claim PINs are now hashed with bcrypt (12 rounds) in the database, never returned via API responses, and securely compared during account linking.
- Tier 2 AES-256-GCM at-rest encryption for sensitive PII (`User.email`, `UserProfile.phone`, `UserProfile.birthDate`, `UserProfile.gender`, `UserProfile.classGrade`) using 12-byte random IVs and authenticated tag verification (`src/lib/crypto.ts`).
- Deterministic HMAC-SHA256 blind indexing (`User.emailBindex`) enabling $O(1)$ unique constraint enforcement and fast lookup without storing plaintext emails in the database.

### Changed
- `requireAuth` rejects revoked tokens, re-reads the user role from the DB, and invalidates sessions issued before a password change/reset.
- JWT: `JWT_SECRET` is required (no fallback secret), default expiry 1 day, and `.env.example` sample lowered to 14 days.
- OTP dev console logging is disabled when SMTP is configured or in production; email recipients and PII are masked in logs.
- Password minimum length raised to 8 characters with bcrypt 12 rounds.
- Anti-enumeration: `POST /forgot-password/request` and `POST /register-otp/request` return uniform generic success responses.
- HTML injection prevention: all email recipient names and variables are escaped, and OTP removed from subject lines.
- Attendance can only be recorded while an event status is `active`; QR scans must match the event's QR code, and QR codes are exposed only to pengurus/admin. Draft/cancelled events are hidden from non-privileged members.
- Member password resets now email the temporary password when an email exists; offline members get it displayed once with a change-on-login flag. Default member passwords use high-entropy CSPRNG values.
- Reverse proxy trust (`trust proxy: 1`) and strict exact-match CORS origins configured (no wildcards).
- Production Docker container runs as non-root user (`USER bun`); database seeding is blocked when `NODE_ENV=production`.
- Stricter ISO datetime parsing on `birth_date`, `event_date`, `start_date`, and `end_date` to prevent 500 runtime errors on invalid dates.
- Strict schema validation (`.strict()`) on `PUT /api/configure/threshold`.
- `GET /api/leaderboard?refresh=true` forced recalculation restricted to `pengurus` and `admin`.

### Removed
- Google OAuth remnants (`oauth.ts` and mock routes) and the default-password fallback when resending a registration OTP.
- User custom avatar image upload / update (`avatar_url`), replaced by deterministic stylized initials display.
- Role invitation flow end to end: `RoleInvitation` model and `/teams/invitations` endpoints, frontend invitation accept/reject actions, and the `role_invitation` notification type.
- Role invitation email system and `RoleInvitation` database model; role assignment is now managed directly by administrators via People / Community member management.

### Changed
- User table normalized: personal data and stats moved into 1:1 `UserProfile` and `UserStats` tables; new master tables `EventType`, `Season`, and `Level` wired into events, auth, schools, leaderboard, and users modules.
- `GET /users/me` now resolves school via relation and returns `school_id`; seed data updated for the new schema.
- Events module no longer auto-registers new users into the welcome event on `user.registered`; the subscriber only logs the welcome flow for now.

## [1.2.0] - 2026-09-08

### Added
- Events page: month/year picker, category dropdown, date search, attendance list per event, and role-guarded create/duplicate/delete actions.
- Leaderboard page: selectable scoring metrics, podium layout, role-filtered entries, and pagination.
- Teams page: search plus role-based category filtering and pagination.
- Two new shadcn-style UI components: `field` (`Field`/`FieldLabel`) and `pagination`.
- `EventCalendar` gains a `hideHeader` prop for compact form pickers.
- `MobileDock` tests and a `matchMedia` mock in `test-setup` (needed by the `use-mobile` hook).

### Changed
- Mobile nudge dock is now role-aware: Community is hidden for `umat`, and nav order matches the sidebar (Home, Events, Leaderboard, Community, Profile).
- `app-sidebar-profile-sync` test rewritten to use `SidebarProvider`/`TooltipProvider` and a router mock instead of `MemoryRouter`.
- Landing page responsive overhaul per `DESIGN.md`: mobile-first section padding, typography scale fixed at breakpoints (no more 72px hero overflow), StatsSection dividers corrected on 2-column mobile grid, sticky notes shrink on small screens.
- Removed codewhale runtime state and unused scratch files; added `AGENTS.md` with repo conventions.

### Fixed
- Landing page hero/feature/event/leaderboard headlines no longer win over mobile size utilities (custom `text-display-*` utility conflicts).
- Dashboard mockup used undefined color tokens (`sekkha-yellow-dark`, `sekkha-brand-yellow-deep`, `bg-sekkha-surface-yellow`, `fill-orange-55`); mapped to valid Clay tokens.
- Weekly quests in the dashboard mockup are now real `<button>`s with `aria-pressed` (were non-focusable `div`s).
- Mobile nav drawer now traps Tab focus and scrolls when taller than the viewport.

## [1.1.0] - 2026-09-06

### Added
- Full-stack modular core: auth, users, events, leaderboard, configure, teams, notifications, pengurus, schools modules.
- Public landing page for Vihara Tri Maha Dharma (hero, features, stats, events, leaderboard, CTA, footer).
- Insight & analytics dashboard page for pengurus/admin.
- Testing infrastructure: vitest + jsdom unit tests and fast-check property-based tests.
- Configurable JWT expiry (`JWT_EXPIRES_IN`).

### Changed
- Backend runtime migrated to a full Bun stack (dev tooling + Alpine Docker image).
- Docker compose pins the published API image `ferdignatius/sekkha-api:v1.0.0`.

### Fixed
- Landing page routing, auth redirect, and navigation scaffolding stabilized across modules.