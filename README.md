# Sekkha Apps

Aplikasi komunitas remaja vihara dengan sistem gamifikasi untuk memantau keaktifan, kehadiran, dan membangun semangat komunitas.

## Arsitektur

```
sekkhaApps/
├── sekkha-frontend/     # Frontend (TanStack Start + React 19 + Tailwind v4 + shadcn/ui)
├── sekkha-api/          # Backend (Express + Prisma + PostgreSQL, berjalan di atas Bun)
├── prd-sekkha/          # Product Requirements Documents (PRD) & Master API Contract
├── DESIGN.md            # Design tokens & UI guidelines
├── RULES.md             # Coding conventions
└── AGENTS.md            # Guidance untuk AI coding agents
```

### Prinsip Modular

> **Shell tidak tahu apa yang dikerjakan modul.** Shell hanya membaca **Registry** untuk mengetahui rute halaman apa saja yang harus dibuka dan menu apa saja yang harus muncul di sidebar.

Komunikasi antar-modul di backend dilakukan lewat **EventBus** (in-memory) — publisher tidak tahu siapa yang mendengarkan, subscriber tidak tahu siapa yang mengirim.

## Tech Stack

### Frontend (`sekkha-frontend/`)
| Layer | Tech |
|-------|------|
| Framework | TanStack Start (SSR) + React 19 + TypeScript |
| Router | TanStack Router (file-based) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Build | Vite + Nitro |
| Testing | Vitest + Fast-Check (Property-Based Testing) |
| Font | Roobert PRO (heading), Inter (body) |

### Backend (`sekkha-api/`)
| Layer | Tech |
|-------|------|
| Runtime | Bun + TypeScript |
| Framework | Express.js |
| ORM | Prisma |
| Database | PostgreSQL 16 (`localhost:5432`) + Redis opsional (`localhost:6379`) |
| Auth | JWT (Access Token + HttpOnly Refresh Cookie) + bcrypt |
| Validation | Zod |
| EventBus | In-memory (`Node.js EventEmitter`) |

## Modul & Fitur Utama (9 Modul)

1. **`landing-page`** *(Frontend)* — Halaman publik pra-login (Hero, Features, School Stats, CTA).
2. **`auth`** — Registrasi berbasis OTP email, login (email / username / 10-digit `userNumber`), lupa password 3-tahap, onboarding, dan manajemen sesi JWT.
3. **`home`** — Dashboard gamifikasi utama: ringkasan Karma Points, Weekly Streak, jadwal kegiatan terdekat, dan riwayat aktivitas terbaru.
4. **`events`** — Kalender & daftar event vihara, Action-Button state transition (`scheduled` → `active` → `closed` / `cancel`), scanner presensi QR berkelanjutan, serta rekap kehadiran dan penugasan pelayanan (*Badge Activity*).
5. **`leaderboard`** — Papan peringkat berbasis *season* (Points, Streak, Attendance), podium Top 3, dan *Community Goal*.
6. **`people`** — Direktori anggota jemaat & *pre-provisioning* anggota baru oleh pengurus (`organizer` / `admin`) lengkap dengan pembuatan kredensial sementara otomatis.
7. **`users`** — Profil pribadi (`/profile`), kartu anggota digital berstandar HIG dengan QR Code statis permanen (`userNumber`), buku besar mutasi poin (*Points History*), ganti password 2FA (OTP), verifikasi ganti email (OTP), serta ekspor/hapus akun (kepatuhan UU PDP).
8. **`pengurus`** — Dashboard *Community Insights & Analytics* (`/insight`) untuk memantau tren kehadiran, retensi jemaat, *silent churn health*, dan *Seva Contributor Board* (khusus `organizer` & `admin`).
9. **`configure` & `schools`** — Master data & aturan sistem: Direktori Sekolah (`schools`), Kategori Acara (`event-types`), Peran Pelayanan (`badge-activities`), Periode Musim (`seasons`), dan Aturan Poin (`point-rules`). Read-only bagi `organizer`, Full CRUD bagi `admin`, serta disembunyikan dari `member` dan `activist`.

## Quick Start

### Prerequisites
- [Bun](https://bun.sh/) >= 1.2
- PostgreSQL 16 berjalan secara lokal di `localhost:5432`
- Redis berjalan secara lokal di `localhost:6379` *(opsional — jika tidak tersedia, aplikasi tetap berjalan dengan fallback in-memory dan menonaktifkan cache Redis)*

> **Catatan Docker**: File `sekkha-api/docker-compose.yml` dan `sekkha-api/Dockerfile` diperuntukkan bagi **deployment production** (menggunakan image `ferdignatius/sekkha-api` dan external network). Untuk development lokal, jalankan PostgreSQL secara langsung di mesin lokal Anda dan sesuaikan `DATABASE_URL` pada `sekkha-api/.env` (salin dari `sekkha-api/.env.example`).

### 1. Setup Monorepo

```bash
# Install seluruh dependency monorepo (root lockfile: bun.lock)
bun install
```

### 2. Setup Database (Generate Client + Migration + Seed)

```bash
# Generate Prisma Client, jalankan migrasi, dan isi data awal (seed)
bun run db:generate
bun run db:migrate
bun run db:seed
```

### 3. Menjalankan Aplikasi (Development)

```bash
# Menjalankan Backend (:4000) dan Frontend (:3000) sekaligus:
bun dev

# Atau jalankan secara terpisah per workspace:
bun dev:api    # Sekkha API di http://localhost:4000
bun dev:web    # Sekkha Frontend di http://localhost:3000
```

### 4. Build & Verifikasi

```bash
# Build seluruh workspace (API + Frontend)
bun run build
bun run build:api
bun run build:web

# Menjalankan unit test
cd sekkha-api && bun test
cd sekkha-frontend && bun run test
```

---

## Panduan Migrasi Database Production

| Perintah | Deskripsi | Lingkungan |
| :--- | :--- | :--- |
| `bun run db:migrate` | Membuat migrasi baru dan update DB lokal (`prisma migrate dev`) | **Development Only** |
| `bun run db:migrate:deploy` | Menjalankan migrasi pending secara transaksional (`prisma migrate deploy`) | **Production Only** |
| `bun run db:migrate:status` | Memeriksa status file migrasi yang terpasang di database | Development & Production |
| `bun run db:generate` | Menghasilkan `@prisma/client` TypeScript types | Development & Build |

### Alur Perubahan Database Pasca-Production:
1. **Di Lokal**: Ubah `sekkha-api/prisma/schema.prisma` lalu buat migrasi baru:
   ```bash
   bunx --cwd sekkha-api prisma migrate dev --name <nama_perubahan>
   ```
2. **Review & Test**: Cek file `.sql` yang dihasilkan di `sekkha-api/prisma/migrations/`, lalu jalankan tes (`bun --filter sekkha-frontend test` dan `bun run build`).
3. **Commit & Push**: Commit file schema dan folder migrations ke git (`production`).
4. **Deploy ke Production Server**:
   ```bash
   # Di server production / CI-CD:
   bun run db:migrate:deploy
   # Atau jika di dalam container Docker production:
   docker compose exec sekkha-api bun run db:migrate:deploy
   ```

## Credentials (Development Seed)

Sesuai `sekkha-api/prisma/seed.ts`, akun development berikut tersedia setelah menjalankan `bun run db:seed`:

| Role | Email | Username | Password |
|------|-------|----------|----------|
| `admin` | `admin@sekkha.com` | `admin` | `password123` |
| `organizer` | `organizer@sekkha.com` | `organizer` | `password123` |
| `activist` | `activist@sekkha.com` | `activist` | `password123` |
| `member` | `member@sekkha.com` | `member` | `password123` |

## Struktur Frontend (Modular)

```
sekkha-frontend/src/
├── components/                ← Shared Kernel (ui-kit)
│   ├── ui/                    # shadcn generated (jangan diubah)
│   ├── base/                  # shadcn yang di-customize
│   └── common/                # komponen komposit reusable
├── shell/                     ← Aplikasi Utama (Orchestrator)
│   ├── registry.ts            # Daftar modul aktif + nav items
│   └── icon-map.ts            # String icon → React component
├── modules/                   ← Modul-modul fitur independen
│   ├── auth/
│   │   ├── internal/          # Privat (login, register, onboarding, hooks, context)
│   │   └── index.ts           # Publik (ekspos ke Shell & route)
│   ├── home/
│   │   ├── internal/
│   │   └── index.ts
│   ├── events/
│   │   ├── internal/
│   │   └── index.ts
│   ├── leaderboard/
│   │   ├── internal/
│   │   └── index.ts
│   ├── people/
│   │   ├── internal/
│   │   └── index.ts
│   ├── users/
│   │   ├── internal/          # Profil pribadi, Digital Member Card, keamanan akun
│   │   └── index.ts
│   ├── pengurus/
│   │   ├── internal/          # Community Insights & Seva Contributor Board
│   │   └── index.ts
│   ├── configure/
│   │   ├── internal/          # Master data (Schools, Event Types, Badge Activity, Seasons, Point Rules)
│   │   └── index.ts
│   └── landing-page/
│       ├── internal/
│       └── index.ts
├── routes/                    # TanStack Router file-based routing
├── lib/                       # Shared utilities (api.ts, utils.ts)
├── hooks/                     # Global hooks
└── styles.css                 # Tailwind + Sekkha design tokens
```

### Cara Kerja Registry (Shell ↔ Module)

```
modules/events/index.ts          → mendaftarkan navItems ke Registry
    ↓
shell/registry.ts                → mengumpulkan semua ModuleDefinition
    ↓
components/app-sidebar.tsx       → membaca Registry, render sidebar dinamis
```

Shell **tidak tahu** internal modul. Modul **tidak tahu** tentang Shell. Mereka hanya berkomunikasi lewat kontrak `ModuleDefinition`.

## Struktur Backend (Modular)

```
sekkha-api/src/
├── core/                      ← Infrastruktur bersama
│   ├── eventbus/
│   │   ├── eventbus.ts        # In-memory EventBus (EventEmitter)
│   │   ├── events.ts          # Domain event definitions + payload types
│   │   └── index.ts
│   └── types.ts               # AppModule interface
├── lib/                       ← Shared utilities
│   ├── prisma.ts              # Prisma client singleton
│   ├── redis.ts               # Redis connection
│   └── cache.ts               # Caching utilities
├── middleware/
│   ├── auth.ts                # JWT verification + role guard (requireAuth, requireRole)
│   ├── requestLogger.ts
│   └── errorHandler.ts
├── modules/                   ← 9 Modul Backend (auth, users, home, events, leaderboard, people, pengurus, schools, configure)
│   └── <nama-modul>/
│       ├── routes.ts          # Definisi endpoint Express & middleware guard
│       ├── controllers.ts     # HTTP request/response handlers & validasi input
│       ├── services.ts        # Logika bisnis utama, query Prisma & eventbus.publish()
│       ├── models.ts          # TypeScript interfaces, DTOs & Zod schemas
│       ├── module.ts          # Implementasi AppModule (register & subscribe)
│       ├── index.ts           # Public barrel export
│       └── internal/          # (Opsional) Helper privat khusus modul (cron, sse, email, otpStore, dll.)
├── app.ts                     # Konfigurasi Express app & registrasi AppModule[]
└── server.ts                  # Entry point server (bun --watch src/server.ts)
```

### Cara Kerja Module Pattern (Backend)

```typescript
// app.ts — Registrasi rute modul
export const modules: AppModule[] = [
  authModule,
  usersModule,
  eventsModule,
  configureModule,
  leaderboardModule,
  peopleModule,
  pengurusModule,
  schoolsModule,
  homeModule,
]

modules.forEach((m) => m.register(app)) // Mount routes

// server.ts — Inisialisasi EventBus subscribers saat boot
modules.forEach((m) => m.subscribe?.())
```

Menambah modul baru = buat folder di `src/modules/<nama>/` + import di `src/app.ts` + tambahkan ke array `modules`.

## Ringkasan API Endpoints

Dokumentasi lengkap spesifikasi endpoint beserta request/response tersedia di **[`prd-sekkha/api-contract.md`](prd-sekkha/api-contract.md)**.

| Modul | Base Path | Deskripsi Utama |
|-------|-----------|-----------------|
| **Auth** | `/api/auth` | Register OTP, Login, Refresh Token, Logout, Verify Session, Forgot Password OTP |
| **Users** | `/api/users` | Profil mandiri (`/me`), Kartu Anggota QR (`/me/card`), Streak, Attendances, Point History, Change Password (OTP), Email Verification (OTP), Export & Delete Account |
| **Home** | `/api/home` | Aggregated dashboard data (profil ringkas, streak, jadwal terdekat, aktivitas terbaru) |
| **Events** | `/api/events` | CRUD event, transisi status (`PATCH /:id/status`), presensi QR/manual (`/:id/attendances`), dan penugasan *Badge Activity* |
| **Leaderboard** | `/api/leaderboard` | Peringkat berdasarkan `points`, `streak`, atau `attendance` per *season* aktif |
| **People** | `/api/people` | Direktori jemaat, *pre-provisioning* anggota baru, dan regenerasi password sementara |
| **Pengurus** | `/api/pengurus` | Analitik kehadiran, retensi, *silent churn health*, dan *Seva Contributor Board* (`/insight`) |
| **Schools** | `/api/schools` | Direktori sekolah aktif, statistik persebaran siswa (`/stats`), dan pengajuan sekolah baru |
| **Configure** | `/api/configure` | Konfigurasi master data (`event-types`, `badge-activities`, `seasons`, `point-rules`, `threshold`) |

## Design System

Mengikuti `DESIGN.md`:
- Warna brand: Yellow (`#ffd02f`), Blue (`#4262ff`), Teal (`#0fbcb0`)
- Typography: Roobert PRO untuk heading, Inter untuk body
- Komponen: Clay & HIG minimalist styling, kartu anggota digital proporsional (ISO/IEC 7810 ID-1), dan responsive card grid

## Database Schema

Entity utama di `sekkha-api/prisma/schema.prisma`:
- **`User`** — Identitas & profil anggota (`userNumber` 10-digit `yyyymmddnn`, `username`, `email`, role: `member` / `activist` / `organizer` / `admin`)
- **`Event`** & **`EventType`** — Kegiatan vihara beserta konfigurasi poin dan batas keterlambatan
- **`Attendance`** — Catatan kehadiran jemaat (`qr` / `manual`), status draft/finalized, keterlambatan, dan referensi `BadgeActivity`
- **`BadgeActivity`** — Master peran pelayanan kegiatan vihara (MC, Puja Leader, Musician, dll.) beserta bonus poin
- **`PointTransaction`** & **`PointRule`** — Buku besar riwayat mutasi poin jemaat dan aturan perolehan poin
- **`Season`** — Periode musim kompetisi papan peringkat dan target kehadiran komunitas
- **`School`** — Master data institusi pendidikan/sekolah jemaat

## Menambah Modul Baru

### Frontend
1. Buat folder `src/modules/<nama>/internal/` — taruh semua implementasi privat
2. Buat `src/modules/<nama>/index.ts` — ekspos komponen publik + `ModuleDefinition`
3. Import di `src/shell/registry.ts` → tambahkan ke `activeModules`
4. Buat route file di `src/routes/` yang mengimpor komponen dari modul

### Backend
1. Buat folder `src/modules/<nama>/` dengan struktur `{routes,controllers,services,models,module,index}.ts` (dan `internal/` bila perlu)
2. Implementasikan interface `AppModule` di `src/modules/<nama>/module.ts`
3. Import di `src/app.ts` → tambahkan ke array `modules`
4. (Opsional) Subscribe ke domain events pada `module.ts` dan publish event melalui `services.ts`
