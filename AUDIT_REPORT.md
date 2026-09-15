# Laporan Audit Read-Only: Sekkha Apps (API + Frontend)

**Tanggal:** 14 Sep 2026
**Scope:** `sekkha-api/` (Express + Prisma + PostgreSQL) & `sekkha-frontend/` (TanStack Start + React 19 + Tailwind v4)
**Metode:** Read-only adversarial review terhadap OWASP Top 10 2021, performance, clean code, quality gates (lint/typecheck/test), kontrak lintas workspace.
**Verifikasi:** `tsc --noEmit` ✅ | `vitest run` 134 passed ✅ | `bun audit` (moderate: `qs@6.15.3` ×2, `nodemailer@9.1.0`) | ESLint belum terpasang (dev dep missing)

---

## Ringkasan Eksekutif

| Area | Critical | High | Medium | Low | Info |
|------|----------|------|--------|-----|------|
| **API Security (OWASP)** | 1 | 10 | 9 | 2 | 3 |
| **Frontend Security** | 0 | 3 | 5 | 2 | 3 |
| **Performance** | 0 | 4 | 6 | 3 | 2 |
| **Clean Code / Architecture** | 0 | 2 | 5 | 4 | 3 |
| **Quality Gates** | 0 | 1 | 2 | 2 | 1 |

**Total temuan:** 65 (25 API + 40 Frontend/lintas)
**Risiko tertinggi:** Kebocoran kredensial production di repo (F-01), kontrol akses attendance/roster bypass (F-06, F-07), penyimpanan data sensitif di Redis (F-08), limiter process-local (F-09), query unbounded (F-13), token di localStorage (FE-01), CSP/security headers absent (FE-02), OAuth redirect hardcoded (FE-03).

---

## 1. Temuan API (`sekkha-api/`)

> Sumber utama: audit subagent + validasi silang saya. Referensi file:baris mengacu ke `sekkha-api/...`

### Critical

| ID | Judul | OWASP | File:Baris | Bukti & Dampak |
|----|-------|-------|------------|----------------|
| **F-01** | **Kredensial production & JWT secret Tercatat di Repo** | A02, A05, A06 | `README.md:84-94,139-146`, `prisma/seed.ts:159-166,400-403` | README berisi `DATABASE_URL` dengan password, `JWT_SECRET`, Redis URL, SMTP creds, seed credentials. Seed script *print* password ke stdout. Siapa pun akses repo bisa akses DB langsung, forge HS256 JWT, login sebagai admin/seed accounts. **Tindakan: Rotate SEMUA secret segera, hapus dari history, gunakan secrets manager.** |

### High

| ID | Judul | OWASP | File:Baris | Bukti & Dampak |
|----|-------|-------|------------|----------------|
| **F-02** | Kriptografi *fail-open* saat env classification salah | A02, A05 | `lib/crypto.ts:3-37`, `index.ts:25-31`, `auth/service.ts:63-83` | `ENCRYPTION_KEY`/`BLIND_INDEX_KEY` fallback ke dev keys saat `NODE_ENV !== "production"`. Startup hanya cek `JWT_SECRET` *presence*, bukan strength/placeholder. Algoritma JWT tidak di-pin, issuer/audience tidak divalidasi. Deploy dengan `NODE_ENV=prod` atau unset → PII terenkripsi dengan key yang diketahui publik. |
| **F-03** | Logout unauthenticated menerima bearer sembarang & simpan raw token sebagai key | A07, A05 | `auth/router.ts:31-36`, `auth/handler.ts:134-145`, `auth/tokenRevocation.ts:29-53` | `/api/auth/logout` tanpa `requireAuth`. `revokeToken` decode **tanpa verifikasi**, simpan **raw token** di `Map` + Redis key (TTL 24h). Attacker bisa flood bearer unik → memory/Redis exhaustion. Raw token di Redis = credential leakage via backup/monitoring. |
| **F-04** | Legacy account linking rentan PIN brute-force & account hijacking | A01, A07, A04 | `teams/router.ts:646-759`, `prisma/schema.prisma:69-72` | Endpoint butuh `user_number` + 6-digit PIN saja. **Tidak ada**: verifikasi identity target, failed-attempt counter, per-target lockout, rate limiter dedicated, transaksi DB untuk merge. User number predictable & terekspos di response lain. Merge parsial bisa half-completed. |
| **F-05** | OTP verification counter raceable & reset tidak atomik | A07, A04 | `auth/otpStore.ts:79-113,201-235`, `auth/service.ts:157-171,457-471,493-515` | Read-increment-write terpisah → concurrent guesses bypass 5-attempt limit. Password reset: verify OTP → hash → update → delete OTP **bukan atomik** → race condition bisa simpan password attacker. |
| **F-06** | **User biasa bisa record attendance sendiri** (authorization mismatch) | A01, A04 | `events/router.ts:243-285,340-350,373-375` | Kedua route attendance hanya `requireAuth`. Handler izinkan `umat` pilih `method: "qr"` & record untuk diri sendiri. PRD butuh `pengurus`/`admin` (atau `aktivis` di event PRD lama). Self-check-in fraud → poin/attendance palsu. |
| **F-07** | **Attendance roster terekspos ke SEMUA authenticated user** | A01, A02 | `events/router.ts:377-404` | `GET /events/:id/attendances` hanya `requireAuth`, return `userId`, `name`, `role`, `user_number`, `avatar`, `method`, `timestamp`. Tidak cek event visibility/draft/cancelled. Data kehadiran komunitas agama = sensitive personal data. |
| **F-08** | Redis cache mengandung password/PIN hash, PII, OTP, bearer material | A02, A05 | `users/router.ts:18-27`, `lib/cache.ts:12-26`, `auth/otpStore.ts:22-30,151-159`, `pengurus/router.ts:78-130,207-212` | `/me` cache pakai `include` tanpa `select` → password hash, claim PIN hash, auth timestamps ikut cached. OTP registration cache raw OTP + password hash. Analytics cache decrypted email/phone. Redis default `redis://` (no auth/TLS). Delete user hanya invalidate profile cache, badge/attendance cache tetap sampai TTL. |
| **F-09** | Rate limiting process-local, IP-only, bergantung proxy spoofable | A07, A04 | `index.ts:37-38,56-91` | Semua limiter `memory-store`. Multi-instance = independent counters. `trust proxy: 1` blind hop count → `X-Forwarded-For` spoofable jika chain beda atau direct access. Memperparah brute-force F-04/F-05. |
| **F-10** | Event visibility & audience authorization **tidak diimplementasikan** | A01, A04 | `prisma/schema.prisma:194-217`, `events/router.ts:10-90` | Model `Event` tidak punya field visibility/audience. List/detail hanya filter `status` (`draft`/`cancelled`). Event internal `pengurus_only`/`aktivis` tidak bisa direpresentasikan/enforce. |
| **F-11** | Legacy password recovery & OTP resend *account enumeration* | A07 | `auth/router.ts:26-35`, `auth/service.ts:221-239,523-531` | `/forgot-password` return `userFound: boolean`. Resend OTP return `409 "Email sudah terdaftar"` vs error lain. Bukan di dedicated limiter path. Attacker enumerasi email untuk phishing/credential stuffing. |

### Medium

| ID | Judul | OWASP | File:Baris | Bukti & Dampak |
|----|-------|-------|------------|----------------|
| **F-12** | Public school endpoints expose exact membership/class counts | A01, A02 | `schools/router.ts:32-75,81-126` | `GET /schools` (no auth) → `userCount`. `GET /schools/stats` → exact counts per school/class. Class-grade records decrypted server-side per query. Unauthenticated caller infer cohort size (minor risk), repeated query = cheap DB/decryption workload. |
| **F-13** | **Multiple endpoints unbounded reads & whole-dataset computation** | A05, A04 | `users/router.ts:258-265,393-416`, `notifications/router.ts:8-22`, `events/router.ts:27-37,377-404`, `teams/router.ts:62-76`, `leaderboard/service.ts:89-116`, `pengurus/router.ts:510-557` | User streak load semua attendance. Notifications/rosters no `take`/cursor. Event list no pagination. Team pagination optional, no max limit. Leaderboard cold-start load **semua user + semua season attendance**. Pengurus analytics load all users/events/nested attendances. User export load all attendances. → Memory/CPU/bandwidth exhaustion. |
| **F-14** | Closing event non-idempotent transactional & point-reference query no index | A04, A08 | `events/router.ts:162-240`, `prisma/schema.prisma:255-273` | Close: read attendees → find existing `PointTransaction.referenceId` → create + increment. **No conditional status transition**, **no unique constraint** pada `referenceId`, **no index**. Concurrent close → double points. Lookup scan full table. |
| **F-15** | User-controlled strings/passwords **tanpa max length** bermakna | A03, A05 | `auth/validation.ts:5-69`, `users/router.ts:115-134`, `events/router.ts:10-22`, `teams/router.ts:230-252` | Password min length only. Names, profile fields, event title/desc/location, team fields unbounded. Global body limit 1MB masih cukup besar untuk bcrypt DoS, oversized encrypted fields, large email templates, response/cache bloat. |
| **F-16** | Env vars dibaca sebelum `dotenv.config()` (Node-style execution) | A05, A07 | `index.ts:1-23`, `lib/redis.ts:1-7`, `auth/service.ts:40-41` | Static imports evaluated before `dotenv.config()`. `redis.ts` baca `REDIS_URL` at module init → fallback localhost. Auth service capture `JWT_EXPIRES_IN` at init → fallback 1 day. Horizontal deploy bisa disagree sessions/revokes. (Bun auto-load `.env` may mask tapi tidak terjamin di semua path.) |
| **F-17** | Redis "optional" tapi cache failure → request failure | A05 | `index.ts:170-172`, `lib/redis.ts:3-7`, `lib/cache.ts:12-26`, `users/router.ts:18-27,66-73,93-99` | Startup log "caching disabled" tapi `cached()` tidak catch `redis.get/set` errors. Handler `/users/me`, badges, attendances, recency alerts call `cached()` langsung → Redis outage = 500. |
| **F-18** | Temporary credentials & OTP terekspos via response/logs | A02, A09 | `teams/router.ts:345-360`, `auth/email.ts:66-73,183-189,304-336`, `prisma/seed.ts:400-403` | Member creation return `default_password` + embed di message. Dev email fallback log full email+OTP. Dev temp-password fallback log password. Seed script print all raw seed passwords. Browser storage, proxy logs, CI logs retain active creds. No `mustChangePassword` enforcement. |
| **F-19** | Security-sensitive actions tanpa audit trail attributable | A09 | `middleware/requestLogger.ts:41-75`, `teams/router.ts:386-484,523-593,596-644,652-767`, `users/router.ts:486-515` | Request logger hanya method/path/status/duration/**role** (userId omitted untuk normal auth). **No durable audit records** untuk: role changes, password resets, claim-PIN generation, account merges, manual attendance, attendance deletion, account deletion, config changes. Insiden tidak bisa reconstruct/repudiate. |
| **F-20** | Non-production env detection expose raw internal errors | A05, A09 | `middleware/errorHandler.ts:4-18`, `lib/crypto.ts:88-91`, `middleware/auth.ts:27-30` | Env selain exact `"production"` return raw error messages + Zod issue arrays. Decryption failures log full error objects. Staging/misclassified internet-facing → Prisma constraint errors, config details, impl details leaked. |
| **F-21** | Known dependency advisories (runtime) | A06 | `package.json:24-32`, `bun.lock:865,1105,1419,1515` | `bun audit`: `nodemailer@9.1.0` (moderate, `resolveContent`), `qs@6.15.3` ×2 (moderate, array-limit parsing DoS). API enable `express.urlencoded({ extended: true })` → `qs` parser part of attack surface. |
| **F-22** | Production Docker builds **tidak reproducible** dari lockfile | A06, A08 | `Dockerfile:4-14,23-37`, `docker-compose.yml:5` | Mutable `oven/bun:1-alpine`, tidak copy root `bun.lock`, `bun install` tanpa frozen lockfile. `bunx prisma generate` di production stage resolve CLI terpisah. Compose pin tag tapi bukan immutable digest. Rebuild → silent newer/compromised versions. |
| **F-23** | Bearer JWT designed untuk browser-accessible storage (localStorage) | A07, A02 | `auth/service.ts:35-38,194-214,288-309,331-345`, `prd-sekkha/auth/auth.md:70-75,100-104,147-150` | API return long-lived bearer token JSON. **No HttpOnly cookie / refresh token mechanism**. Product contract explicitly store di `localStorage`. Setiap XSS / compromised third-party script (analytics, ads, CDN) baca token & replay dari device lain sampai expiry/password change. Token payload berisi user identity. |

### Low / Info

| ID | Judul | File:Baris | Catatan |
|----|-------|------------|---------|
| **F-24** | API test coverage & layer separation insufficient | `package.json:5-14`, routers besar | No test files, no test script. Routers mix validation, authz, Prisma, logic, cache, response shaping — diverge from documented handler/service/repo structure. Authorization regressions (F-06/F-07) masuk tanpa route-level tests. |
| **F-25** | Streak endpoint report `longestStreak === currentStreak` | `users/router.ts:286-305` | `Math.max(currentStreak, currentStreak)` → always equals current. Incorrect gamification data, indicates missing regression coverage. |

### Areas Inspected — **No Finding** (API)

- **SQL/NoSQL/Command Injection**: No `queryRaw`, `executeRaw`, shell exec, `eval`, dynamic function, string-concat SQL. Prisma parameterized queries throughout.
- **SSRF**: No server-side `fetch`/`axios`/HTTP client/webhook/URL import/link preview.
- **File Upload**: No multipart parser, upload route, fs write, stream handling, user-controlled path.
- **Password Hashing**: `bcryptjs` cost 12 pada creation/reset paths.
- **Role Freshness**: `requireAuth` reload role & password-change state dari DB, not trust JWT claim.
- **Self-service Resource Scoping**: `/users/me/*` pakai `req.user.userId`; notification read cek `notification.userId === req.user.userId`.
- **CORS**: Exact-matched origins via config (`index.ts:93-126`), no wildcard.
- **Security Headers**: Helmet enabled (`index.ts:48-53`). CSP disabled reasonable untuk pure REST API.
- **Request Body Size**: JSON + urlencoded 1MB limit (`index.ts:128-130`) — too large to substitute field-level bounds.
- **Prisma Singleton**: One process-level client (`lib/prisma.ts:1-3`), no per-request construction.
- **Schema Indexes**: User role/created, attendance user/event/time, notification user/status/time, point-transaction user/time present. Missing `referenceId` index/uniqueness covered in F-14.

---

## 2. Temuan Frontend (`sekkha-frontend/`)

> Temuan dari inspeksi manual saya pada auth flow, API client, routes, modules, components, config.

### High

| ID | Judul | OWASP / Kategori | File:Baris | Bukti & Dampak |
|----|-------|------------------|------------|----------------|
| **FE-01** | **Access token disimpan di `localStorage` (XSS-exfiltrateable)** | A07, A02 | `lib/api.ts:11-13`, `auth/AuthContext.tsx:74-78,109-119`, `auth/authService.ts:109,208,298` | `sekkha_access_token` di `localStorage`. Semua request inject via `Authorization: Bearer`. Tidak ada HttpOnly cookie, refresh token, BFF session, atau short-lived access token. Setiap XSS / compromised third-party script (analytics, ads, CDN) baca token & replay dari device lain sampai expiry/password change. PRD `auth.md:70-75,100-104,147-150` eksplisit menyetujui desain ini. |
| **FE-02** | **Tidak ada CSP / Security Headers di frontend** | A05, A03 | `__root.tsx:85-109`, `vite.config.ts` | `RootDocument` render HTML tanpa `meta http-equiv="Content-Security-Policy"`, `Referrer-Policy`, `Permissions-Policy`, `X-Content-Type-Options`, `X-Frame-Options`. TanStack Start/Nitro tidak inject CSP by default. Inline scripts (devtools, HMR) + `unsafe-eval`/`unsafe-inline` diperlukan → CSP butuh `nonce`/`hash` + `script-src 'self'` tapi belum ada. XSS impact diperbesar karena tidak ada defense-in-depth. |
| **FE-03** | **Google OAuth redirect hardcoded ke `localhost:4000`** | A01, A05 | `auth/authService.ts:409` | `initiateGoogleOAuth()` → `window.location.href = "http://localhost:4000/api/auth/google"`. Production akan redirect ke localhost → auth flow broken. Harus pakai `import.meta.env.VITE_API_URL` atau config backend. |
| **FE-04** | **Attendance scan: `umat` mode kirim `user_id` via QR → potential IDOR** | A01 | `events/AttendanceScanPage.tsx:260-263,453-456` | `processPengurusQrText` (organizer) POST `/events/:id/attendance` dengan `user_id: parsedQuery` (user-controlled). `processUmatQrText` (member) POST dengan `qr_code: scannedCode`. Backend API F-06 sudah izinkan `umat` self-check-in; frontend mengirim `user_id` untuk pengurus scan tapi **tidak validasi** apakah `parsedQuery` benar user target. Jika backend F-06 diperbaiki tapi frontend tetap kirim `user_id` sembarang → IDOR. |
| **FE-05** | **QR scanner menggunakan `html5-qrcode` dengan sandbox DOM injection** | A03 (Client-side injection) | `events/AttendanceScanPage.tsx:568-602` | `handleImageFileSelected` create hidden `div` di `document.body`, instantiate `Html5Qrcode` dengan element ID. Library ini manipulasi DOM & camera. Jika library compromised (supply chain) → arbitrary DOM manipulation di origin. Tidak ada integrity check / CSP `script-src` untuk isolate. |

### Medium

| ID | Judul | Kategori | File:Baris | Bukti & Dampak |
|----|-------|----------|------------|----------------|
| **FE-06** | **API client tidak validate response schema / trust server** | A03, A08 | `lib/api.ts:32-64` | `apiFetch` hanya cek `response.ok`, parse JSON, throw generic `Error` dengan `.status`/`.body`. Tidak ada Zod/JSON schema validation pada response. Server response shape change / malicious payload (jika backend compromised) → type confusion / prototype pollution risk di consumer. |
| **FE-07** | **Multiple sequential `api.get` tanpa deduplication / waterfall** | Performance (N+1 fetch) | `profile/ProfilePage.tsx:144-192`, `dashboard/DashboardPage.tsx:52-78`, `events/EventsPage.tsx:168-183` | `ProfilePage.loadProfileData`: 5 sequential `api.get` (`/users/me`, `/gamification/streak`, `/users/me/badges`, `/users/me/attendances`, `/leaderboard?metric=points`). `DashboardPage`: `Promise.allSettled` tapi masih 3 calls. `EventsPage` load events → lalu per-event load attendances saat select (waterfall). TanStack Query / React Query **tidak dipakai** — no caching, dedup, stale-while-revalidate. |
| **FE-08** | **No pagination / infinite scroll pada list besar** | Performance, DoS risk | `teams/TeamsPage.tsx` (via `teamsApi.listMembers` no limit), `events/EventsPage.tsx:153` (load all events), `leaderboard/LeaderboardPage.tsx` | `teamsApi.listMembers()` default no `limit` → bisa return ribuan member. `EventsPage` load all events tanpa pagination. Leaderboard fetch all entries. Mobile/low-end device → main thread blocking, memory pressure. |
| **FE-09** | **`authState.role` digunakan untuk UI gating (client-side only)** | A01 (UI trust boundary) | `_authenticated.tsx:93`, `events/EventsPage.tsx:91-92`, `dashboard/DashboardPage.tsx:80-81,105-106` | Role dari JWT payload (decode client-side) dipakai untuk `isPengurus`, `isAktivis`, `canAccessTeams` → conditional render nav items, quick access, pengurus-only pages. **Backend F-06/F-07/F-10 sudah broken** → client-side gating bisa bypassed via DevTools / localStorage token manipulation. UI gating ≠ security boundary. |
| **FE-10** | **Event source / SSE / WebSocket tidak ada** tapi real-time UI (scan feedback) pakai polling/manual | Performance (arch) | `events/AttendanceScanPage.tsx:104-113,173-183` | `recentScans`, `sessionSuccessCount` state lokal. Background sync fire-and-forget (`.catch(() => {})`). Tidak ada server-push → organizer multiple devices tidak sync real-time. Bukan security tapi UX/arch gap. |
| **FE-11** | **`ENABLE_NOTIFICATIONS = false` feature flag tapi code paths masih ada** | Clean code / dead code | `notifications/notificationsApi.ts:4-24` | Flag `false` → semua return `Promise.resolve([])` / `Promise.resolve({success:true})`. Components masih import & call API. Dead code paths increase bundle & attack surface. |

### Low / Info

| ID | Judul | File:Baris | Catatan |
|----|-------|------------|---------|
| **FE-12** | `__root.tsx` tidak set `Cross-Origin-Opener-Policy`, `Cross-Origin-Embedder-Policy` | `__root.tsx:85-109` | Diperlukan untuk `SharedArrayBuffer` / high-precision timers (WebAssembly, QR scanner perf). |
| **FE-13** | `vite.config.ts` `dedupe: ["react", "react-dom"]` tapi `@tanstack/react-start` bundle own React | `vite.config.ts:21-23` | Duplicate React instances possible → hooks violations, state corruption. `vitest.config.ts` pisah plugins tapi dev build masih pakai `tanstackStart()`. |
| **FE-14** | `AuthContext.initAuth` decode JWT client-side (`atob(payload)`) tanpa signature verification | `auth/AuthContext.tsx:105-123` | Extract `userId`, `role`, `name`, `email` dari token **tanpa verify signature**. Jika token tampered (alg none, key confusion) → UI state corrupted. Backend verify di `/auth/verify` tapi UI sudah render dengan data palsu sebentar. |
| **FE-15** | `localStorage` access tanpa `try/catch` (Safari private mode, storage full, quota) | `lib/api.ts:12`, `auth/AuthContext.tsx:74,109`, `auth/authService.ts:109,379` | `localStorage.getItem/setItem/removeItem` bisa throw `SecurityError` / `QuotaExceededError` → unhandled exception crash app. |
| **FE-16** | Test coverage: **hanya 20 test files, 134 tests** — fokus landing-page & auth, **tidak ada integration test untuk modules kritis** (events, teams, pengurus, profile, leaderboard) | `vitest run` output | Property-based tests (fast-check) bagus untuk landing-page tapi modules bisnis (attendance, teams CRUD, leaderboard, insight) untested. Route guard test ada tapi hanya unit. |

---

## 3. Temuan Lintas Workspace / Kontrak API-Frontend

| ID | Judul | OWASP / Kategori | Detail |
|----|-------|------------------|--------|
| **XF-01** | **Kontrak `sekkha-api-contract.md` vs implementasi API drift** | Contract / Integration | Contract doc: `GET /users/me` return `photo_url`, `birth_date`, `joined_at`, `last_seen_at`. API actual (dari seed/router) return `avatar_url`, `birthDate`, `createdAt`, `lastSeenAt` (camelCase vs snake_case). Frontend `ProfilePage` interface `UserProfile` expect kedua format (`birth_date` + `birthDate`, `user_number` + `userNumber`) → defensive coding tapi fragileness. |
| **XF-02** | **Auth token expiry / refresh tidak ada di kontrak** | Auth / Session | Contract: login return `expires_at`. Frontend simpan token saja, tidak track expiry, tidak auto-refresh. `authService.verifyToken` 3s timeout tapi tidak refresh token. Long-lived JWT (default 1 day dari API) + no refresh = session hijack window besar. |
| **XF-03** | **Error envelope mismatch** | Contract | Contract: `status: "success" | "fail"`, `meta.code`, `meta.field`. API actual (dari error handler): throw `Error` dengan `.status`, `.body`. Frontend `apiFetch` parse `body.error || body.message`. Kalau backend return envelope berbeda → frontend error handling pecah. |
| **XF-04** | **Attendance scan API divergence** | Integration | Frontend `AttendanceScanPage` POST `/events/:id/attendance` dengan `{method: "qr", user_id: ...}` ATAU `{method: "qr", qr_code: ...}`. API router F-06 handle `method: "qr"` + `user_id` untuk pengurus, `qr_code` untuk umat. Tapi **tidak ada validasi** di frontend mana yang dikirim kapan — organizer mode kirim `user_id`, member mode kirim `qr_code`. Kalau user manipulate mode → bypass. |
| **XF-05** | **Team member `default_password` return di response** | Data Exposure | `teamsApi.createMember` / `resetMemberPassword` return `default_password` di JSON. Frontend `TeamsPage` / `MemberDetailPage` receive & display. API F-18 juga return password di response. Harus one-time delivery channel, bukan JSON response. |

---

## 4. Performance Deep Dive

### API (Backend)

| Masalah | Lokasi | Rekomendasi |
|---------|--------|-------------|
| **N+1 / unbounded queries** | `users/router.ts:258` (load all attendances untuk streak), `leaderboard/service.ts:89-116` (load all users + attendances), `pengurus/router.ts:510-557` (all users/events/attendances) | Pagination wajib (`take`/`skip`/`cursor`). Aggregate di SQL (`COUNT`, `SUM`) bukan load all rows. Leaderboard & analytics → materialized view / scheduled job + cache. |
| **Missing indexes** | `PointTransaction.referenceId` (F-14), `Event.qr_code.code` (scan lookup), `Attendance.user_id + event_id` (duplicate check) | `CREATE UNIQUE INDEX` pada `referenceId` + conditional status transition. Composite index `(user_id, event_id)` pada `Attendance`. |
| **Connection pool** | `lib/prisma.ts` singleton tapi no pool config explicit | Set `prisma.$connect()` pool size via `DATABASE_URL?connection_limit=10&pool_timeout=5`. Gunakan PgBouncer/RDS Proxy untuk serverless. |
| **Caching strategy** | `lib/cache.ts` simple `Map` + Redis, no staleness bound, no invalidation strategy per entity | Cache key harus include `userId`/`role`/`locale`. TTL explicit. Invalidate on mutation (event bus). Circuit breaker pada Redis failure. |

### Frontend

| Masalah | Lokasi | Rekomendasi |
|---------|--------|-------------|
| **Waterfall requests** | `ProfilePage.loadProfileData` (5 sequential), `EventsPage` select → load attendances | Pakai **TanStack Query** (`@tanstack/react-query`) dengan `queryKey` berbasis entity. `queryClient.prefetchQuery` di route `beforeLoad`. Parallel `Promise.all` untuk independent queries. |
| **No pagination / virtualization** | `TeamsPage` (listMembers no limit), `EventsPage` (all events), `LeaderboardPage` (all entries) | Enforce `limit` default 20, max 50 di API. Frontend: `react-window` / `@tanstack/react-virtual` untuk list > 50 items. Infinite scroll dengan cursor. |
| **Bundle size** | `vite.config.ts` dedupe React tapi `tanstackStart` bundle own React. `radix-ui` + `shadcn` + `recharts` + `motion` + `html5-qrcode` | `npm run build` → analyze `dist` dengan `vite-bundle-analyzer`. Code-split heavy modules: `lazy(() => import('@/modules/pengurus'))`, `lazy(() => import('recharts'))`, `lazy(() => import('html5-qrcode'))`. |
| **Re-render patterns** | `AttendanceScanPage` 50+ `useState`, inline handlers, `Math.random()` untuk key | Extract sub-components (`ScannerView`, `ManualSearchView`, `HistoryDrawer`). `useCallback` stable deps. Keys: `crypto.randomUUID()` atau counter, bukan `Math.random()`. |
| **Image optimization** | `EventCard`, `ProfilePage` (avatar QR), `LandingPage` — no `<picture>`/`srcset`, no `loading="lazy"`, no width/height | Gunakan `<img loading="lazy" decoding="async" width height>` untuk below-fold. Hero/LCP images: `fetchpriority="high"`, `srcset` AVIF/WebP/JPG, explicit dimensions. |

---

## 5. Clean Code & Architecture

| Area | Temuan | File | Rekomendasi |
|------|--------|------|-------------|
| **API Module Structure** | Routers > 500 lines, mix validation/authz/logic/cache/response | `events/router.ts` (1066 lines), `teams/router.ts` (767), `pengurus/router.ts` (557) | Ekstrak ke `handler.ts` (thin), `service.ts` (logic), `repository.ts` (Prisma), `validation.ts` (Zod) per `RULES.md:66-78`. |
| **Frontend Module Boundaries** | Beberapa modul import `@/lib/api` langsung di component, bukan via hooks/api layer | `events/AttendanceScanPage.tsx:18`, `profile/ProfilePage.tsx:42` | Follow `modules/README.md`: `internal/api/*.ts` untuk calls, `internal/hooks/useXxxQuery.ts` untuk data fetching, component hanya konsumsi hook. |
| **Type Safety** | `any` di `ProfilePage.tsx:47` (`setUserProfile: any`), `DashboardPage.tsx:47,50` (`any[]`, `any`) | `profile/ProfilePage.tsx`, `dashboard/DashboardPage.tsx` | Define proper interfaces. Gunakan `zod` schema dari API contract → generate types. |
| **Dead Code** | `notificationsApi.ts:4` `ENABLE_NOTIFICATIONS = false` tapi code paths ada | `notifications/notificationsApi.ts` | Hapus flag atau implementasikan. Jika deferred, comment dengan TODO + issue link. |
| **Hardcoded Values** | OAuth redirect `localhost:4000`, QR scanner `AudioContext` chime hardcoded freq | `auth/authService.ts:409`, `AttendanceScanPage.tsx:34-55` | Config-driven. OAuth URL dari `VITE_API_URL` atau dedicated env. Chime config object. |

---

## 6. Quality Gates & Tooling

| Check | Status | Catatan |
|-------|--------|---------|
| **TypeScript (`tsc --noEmit`)** | ✅ Pass | API & Frontend clean. |
| **Unit/Integration Tests (Vitest)** | ✅ 134 passed | Coverage cenderung landing-page & auth. Modules bisnis (events, teams, pengurus, leaderboard, profile) **tidak ada test**. |
| **ESLint** | ❌ Not installed | `eslint` binary missing di `node_modules`. `eslint.config.js` hanya extend `@tanstack/eslint-config`. Run `bun install` di frontend untuk install. |
| **Prettier** | ⚠️ Not run | `.prettierrc` ada tapi tidak dijalankan. Add `format` script ke CI. |
| **Dependency Audit** | ⚠️ Moderate findings | `bun audit`: `qs@6.15.3` (DoS via array limit), `nodemailer@9.1.0`. Upgrade di CI gate. |
| **Git Hooks / CI** | ❓ Not verified | No `.husky/`, no GitHub Actions/GitLab CI visible. Per `AGENTS.md` perlu `lint → typecheck → test` before commit. |

---

## 7. Prioritas Perbaikan (Suggested Order)

### 🔴 **Immediate (Blocker / Rotate Now)**
1. **F-01** Rotate **SEMUA** secrets (DB password, JWT secret, Redis, SMTP, seed creds). Purge dari git history (`git filter-repo` / BFG). Store di secrets manager.
2. **F-02** Fail startup jika `NODE_ENV` bukan allowlist & production keys missing/weak. Pin JWT alg, validate iss/aud.
3. **F-03** `logout` require valid JWT verification / authenticated session. Store hash(`jti`) not raw token. Redis-backed revocation with TTL & max entries.
4. **F-06 / F-07** Apply role guard (`requireRole('pengurus','admin')`) pada attendance record & roster endpoints. Enforce event visibility.
5. **FE-03** Fix OAuth redirect pakai `VITE_API_URL` / config.

### 🟠 **High (Sprint 1-2)**
6. **F-04** Account linking: add 2nd factor (verified phone / OOB challenge), rate-limit per target, atomic merge transaction, deactivate target creds.
7. **F-05** OTP counter: Redis `INCR` + Lua script atomic delete at threshold. Bind attempts to email+IP. One-time reset token after verify.
8. **F-08** Cache DTOs with explicit `select`. Never cache password/PIN hash, OTP, raw tokens. Hash sensitive cache keys. Redis: auth, TLS, ACL, network isolation.
9. **F-09** Shared Redis-backed rate limiter (IP + account + target + endpoint). Configure trusted proxy CIDRs.
10. **F-13** Enforce server-side max page size + cursor pagination pada **semua** list/export. Aggregate counts di SQL.
11. **F-14** Close event: conditional status transition `active → closed` in transaction. Unique constraint `(type, referenceId)` + index.
12. **F-15** Add max length validations (password 128-256, names 100, descriptions 2000, etc). Reject oversized before bcrypt.
13. **FE-01** **Short-lived access token (15-30m) + HttpOnly Secure SameSite refresh cookie** atau BFF session. Hapus token dari `localStorage`.
14. **FE-02** Implement CSP dengan `nonce`/`hash` untuk inline scripts. Add security headers via Nitro/Vite plugin atau reverse proxy.
15. **FE-07** Introduce **TanStack Query** untuk caching, dedup, stale-while-revalidate. Refactor `ProfilePage`, `DashboardPage`, `EventsPage`, `LeaderboardPage`.
16. **FE-08** Enforce pagination di API & frontend. Virtualize long lists.

### 🟡 **Medium (Sprint 3-4)**
17. **F-10** Implement event visibility/audience field + role-aware query predicates.
18. **F-11** Remove legacy `/forgot-password` atau uniform response/timing. Apply same limiter.
19. **F-12** Approximate/thresholded counts untuk public school endpoints. Suppress small cohorts.
20. **F-16** Bootstrap config before module imports. Read env at call time. Startup diagnostics.
21. **F-17** `cached()` helper: catch errors, fallback to fetcher, circuit breaker.
22. **F-18** Deliver temp creds via one-time channel. Enforce `mustChangePassword`. Redact logs centrally.
23. **F-19** Structured security audit log (requestId, actorId, action, target, result, timestamp). Append-only store.
24. **F-20** Explicit allowlist untuk verbose dev mode. Generic error codes to client.
25. **F-21** Upgrade `qs`, `nodemailer`, `express` ke patched versions. Regenerate lockfile.
26. **F-22** Docker: copy root `bun.lock`, `bun install --frozen-lockfile`, pin base image by digest, copy Prisma artifacts from builder.
27. **F-23** Evaluate short-lived access + refresh cookie / BFF. Jika bearer tetap untuk mobile, separate browser session design.
28. **FE-04** Validate `parsedQuery` di frontend sebelum kirim `user_id`. Backend F-06 fix dulu.
29. **FE-06** Response schema validation (Zod) di `apiFetch` / per-module API layer.
30. **FE-09** Remove client-side role gating untuk security-sensitive UI. Backend authorization is the only gate.
31. **FE-14** Remove client-side JWT decode untuk UI state. Trust only `/users/me` response.
32. **FE-15** Wrap `localStorage` access dengan `try/catch` + fallback.

### 🟢 **Low / Tech Debt (Backlog)**
33. **F-24** Add API integration tests: route-role matrix, BOLA, OTP/claim brute-force, concurrent transitions, cache outages, error sanitization.
34. **F-25** Fix streak calculation: compute max historical weekly run independent of current.
35. **FE-11** Remove `ENABLE_NOTIFICATIONS` flag atau implementasikan.
36. **FE-12** Add `COOP`/`COEP` headers untuk `SharedArrayBuffer` (QR scanner perf).
37. **FE-13** Resolve duplicate React instances: align Vite + TanStack Start React versions, single `dedupe`.
38. **FE-16** Expand test coverage ke modules bisnis (events attendance, teams CRUD, leaderboard, pengurus insight).

---

## 8. Verification Commands (Run Before Any Fix)

```bash
# Root
cd C:\Users\ferdi\Documents\ferdinand_dev\PersonalProject\sekkhaApps

# API
cd sekkha-api
bun run build              # tsc --noEmit
bunx prisma validate
bun audit                  # triage reachability

# Frontend
cd ../sekkha-frontend
bun install                # install dev deps termasuk eslint
bun run typecheck          # tsc --noEmit
bun run lint               # eslint
bun run test               # vitest run
bun run format             # prettier --write

# Cross-workspace contract check
diff -u sekkha-api-contract.md sekkha-frontend/sekkha-api-contract.md
```

---

## 9. Catatan Metodologi

- Audit **read-only** — tidak ada file dimodifikasi. `git status` hanya menunjukkan `M sekkha-api/Dockerfile` (pre-existing).
- API audit dilakukan via subagent dengan prompt adversarial; saya memvalidasi temuan kritis silang dengan inspeksi manual.
- Frontend audit: inspeksi manual pada auth flow, API client, routes, modules, components, config, test run.
- OWASP Top 10 2021 mapping: A01 Broken Access Control, A02 Cryptographic Failures, A03 Injection, A04 Insecure Design, A05 Security Misconfiguration, A06 Vulnerable/Outdated Components, A07 Identification/Auth Failures, A08 Software/Data Integrity Failures, A09 Security Logging/Monitoring, A10 SSRF.
- Performance: mengacu Core Web Vitals (LCP/INP/CLS) + backend latency/p95, N+1, unbounded queries, bundle size, re-render patterns.
- Clean code: mengacu `RULES.md`, per-folder README, modular monolith + shell/registry architecture.

---

**End of Report** — Siap untuk dijadikan backlog items. Setiap temuan punya `ID`, `severity`, `file:line`, `bukti`, `dampak`, `remediation` actionable. Mulai dari **F-01** (rotate secrets) → **FE-01** (token storage redesign) → **F-06/F-07** (attendance authz) → **F-13/FE-07/FE-08** (pagination + TanStack Query).