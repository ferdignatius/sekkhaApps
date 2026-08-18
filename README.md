# Sekkha Apps

Aplikasi komunitas remaja vihara dengan sistem gamifikasi untuk memantau keaktifan, kehadiran, dan membangun semangat komunitas.

## Arsitektur

```
sekkhaApps/
├── sekkha-main-app/     # Frontend (React + TanStack Router)
├── sekkha-api/          # Backend (Express + Prisma + PostgreSQL)
├── DESIGN.md            # Design tokens & UI guidelines
└── RULES.md             # Coding conventions
```

### Prinsip Modular

> **Shell tidak tahu apa yang dikerjakan modul.** Shell hanya membaca **Registry** untuk mengetahui rute halaman apa saja yang harus dibuka dan menu apa saja yang harus muncul di sidebar.

Komunikasi antar-modul di backend dilakukan lewat **EventBus** (in-memory) — publisher tidak tahu siapa yang mendengarkan, subscriber tidak tahu siapa yang mengirim.

## Tech Stack

### Frontend (`sekkha-main-app/`)
| Layer | Tech |
|-------|------|
| Framework | React 19 + TypeScript |
| Router | TanStack Router (file-based) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Build | Vite + Nitro |
| Font | Roobert PRO (heading), Inter (body) |

### Backend (`sekkha-api/`)
| Layer | Tech |
|-------|------|
| Runtime | Node.js + TypeScript |
| Framework | Express.js |
| ORM | Prisma |
| Database | PostgreSQL 16 (Docker) |
| Auth | JWT + bcrypt |
| Validation | Zod |
| EventBus | In-memory (Node.js EventEmitter) |

## Fitur Utama

- **Home** — Dashboard gamifikasi: streak, poin, level bar, misi mingguan, mini leaderboard
- **Events** — Kalender event + RSVP + QR attendance + pengelolaan event (pengurus)
- **Leaderboard** — Season-based ranking, podium top 3, streak shield, community goals
- **Komunitas** — Forum diskusi (Reddit-like) + Curhat (tiket privat ke pengurus)
- **Profil** — Stats hero, attendance tracker bulanan, achievements/badge collection
- **Configure** — Master data (Badge, Level, Event Type, Achievement) — Read-Only bagi `pengurus`, Full CRUD bagi `admin`. Disembunyikan bagi `umat` (user biasa) & `aktivis`.
- **Insight & Analysis** — Metrics + early warning anggota berisiko — Khusus `pengurus` & `admin`. Disembunyikan bagi `umat` (user biasa) & `aktivis`.

## Quick Start

### Prerequisites
- Node.js >= 18
- Docker & Docker Compose
- npm

### 1. Clone & Setup

```bash
cd sekkhaApps
```

### 2. Jalankan Backend

```bash
cd sekkha-api

# Start PostgreSQL + pgAdmin
docker-compose up -d

# Install dependencies
npm install

# Generate Prisma client + migrate + seed
npm run db:generate
npm run db:migrate
npm run db:seed

# Start dev server
npm run dev
```

API jalan di `http://localhost:4000`
pgAdmin di `http://localhost:5050` (admin@sekkha.local / admin123)

### 3. Jalankan Frontend

```bash
cd sekkha-main-app

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend jalan di `http://localhost:3000`

## Credentials (Development)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@sekkha.local` | admin |
| Pengurus | `budi@sekkha.local` | admin |
| Aktivis | `joko@sekkha.local` | admin |
| Umat (User Biasa) | `hendra@sekkha.local` | admin |
| Umat (User Biasa) | `sari@sekkha.local` | admin |

> Frontend juga masih support dummy login: email `admin`, password `admin` (bypass validation)

## Struktur Frontend (Modular)

```
sekkha-main-app/src/
├── components/                ← Shared Kernel (ui-kit)
│   ├── ui/                    # shadcn generated (jangan diubah)
│   ├── base/                  # shadcn yang di-customize
│   └── common/                # komponen komposit reusable
├── shell/                     ← Aplikasi Utama (Orchestrator)
│   ├── registry.ts            # Daftar modul aktif + nav items
│   └── icon-map.ts            # String icon → React component
├── modules/                   ← Modul-modul independen
│   ├── auth/
│   │   ├── internal/          # Privat (login, register, hooks, context)
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── api/
│   │   │   └── context/
│   │   └── index.ts           # Publik (ekspos ke Shell & modul lain)
│   ├── events/
│   │   ├── internal/          # Privat (halaman, hooks, types)
│   │   └── index.ts
│   ├── dashboard/
│   │   ├── internal/
│   │   └── index.ts
│   ├── leaderboard/
│   │   ├── internal/
│   │   └── index.ts
│   ├── community/
│   │   ├── internal/
│   │   └── index.ts
│   ├── profile/
│   │   ├── internal/
│   │   └── index.ts
│   ├── configure/
│   │   ├── internal/
│   │   └── index.ts
│   └── pengurus/
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
│   ├── auth.ts                # JWT verification + role guard
│   └── errorHandler.ts
├── modules/
│   ├── auth/
│   │   ├── module.ts          # register() — mount routes
│   │   └── internal/
│   │       ├── router.ts      # Express router
│   │       ├── handler.ts     # Request handlers (thin)
│   │       ├── service.ts     # Business logic + eventbus.publish()
│   │       ├── repository.ts  # Prisma queries
│   │       └── validation.ts  # Zod schemas
│   ├── events/
│   │   ├── module.ts          # register() + subscribe()
│   │   └── internal/
│   │       ├── router.ts
│   │       └── subscribers.ts # Event handlers (user.registered → auto RSVP)
│   ├── users/
│   │   ├── module.ts
│   │   └── internal/router.ts
│   ├── configure/
│   │   ├── module.ts
│   │   └── internal/router.ts
│   ├── leaderboard/
│   │   ├── module.ts
│   │   └── internal/router.ts
│   └── community/
│       ├── module.ts
│       └── internal/router.ts
└── index.ts                   # Entry point — loops modules, register + subscribe
```

### Cara Kerja Module Pattern (Backend)

```typescript
// index.ts — Entry point
const modules: AppModule[] = [authModule, usersModule, eventsModule, ...]

modules.forEach(m => m.register(app))   // Mount routes
modules.forEach(m => m.subscribe?.())   // Wire EventBus listeners
```

Menambah modul baru = buat folder + import di `index.ts` + tambahkan ke array.

## Case Study: Register → Auto Event

Alur lengkap ketika user mendaftar akun baru:

```
┌────────────────────────────────────────────────────────────────┐
│ FASE 1: Frontend (UI → API)                                    │
│                                                                │
│  User → RegisterPage.tsx → authService.ts                      │
│            ↓                                                   │
│  POST http://localhost:4000/api/auth/register                  │
└────────────────────────────────────────────────────────────────┘
            ↓
┌────────────────────────────────────────────────────────────────┐
│ FASE 2: Backend Auth Module                                    │
│                                                                │
│  router.ts → handler.ts → service.ts → repository.ts          │
│                               ↓                               │
│                    INSERT INTO users (...)                      │
│                               ↓                               │
│              eventbus.publish("user.registered", payload)       │
└────────────────────────────────────────────────────────────────┘
            ↓ EventBus (in-memory, async)
┌────────────────────────────────────────────────────────────────┐
│ FASE 3: Backend Events Module (Subscriber)                     │
│                                                                │
│  module.ts → subscribe("user.registered")                      │
│                    ↓                                           │
│  subscribers.ts → onUserRegistered()                           │
│                    ↓                                           │
│  INSERT INTO rsvps (event_id, user_id) → welcome event         │
└────────────────────────────────────────────────────────────────┘
            ↓
┌────────────────────────────────────────────────────────────────┐
│ Response ke Frontend                                           │
│                                                                │
│  { "accessToken": "...", "user": { ... } }                     │
│  (Status 201 Created)                                          │
└────────────────────────────────────────────────────────────────┘
```

### Key Points

1. **Auth module** hanya berteriak: *"Ada user baru lahir!"* — tidak tahu siapa yang mendengarkan
2. **Events module** mendaftarkan subscriber saat startup — tidak tahu siapa yang mengirim event
3. **EventBus** menjembatani keduanya secara **loose-coupled**
4. Subscriber berjalan **asynchronous** — tidak memblokir response ke frontend

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register user baru |
| POST | `/api/auth/login` | Login, return JWT |
| GET | `/api/auth/verify` | Verify token validity |

### Users (requires auth)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/users/me` | Profil user |
| GET | `/api/users/me/badges` | Badge yang dimiliki |
| GET | `/api/users/me/attendances` | Riwayat kehadiran |
| PATCH | `/api/users/me` | Update profil |
| GET | `/api/users/me/streak` | Data streak |
| GET | `/api/users/me/level` | Data level |

### Events (requires auth)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/events` | List semua event |
| GET | `/api/events/:id` | Detail event |
| POST | `/api/events` | Buat event (pengurus/admin) |
| PUT | `/api/events/:id` | Update event (pengurus/admin) |
| DELETE | `/api/events/:id` | Hapus event (pengurus/admin) |
| POST | `/api/events/:id/rsvp` | RSVP event |
| POST | `/api/events/:id/attendance` | Record attendance |
| GET | `/api/events/:id/attendances` | List attendees |

## Domain Events

| Event | Publisher | Subscriber | Description |
|-------|-----------|------------|-------------|
| `user.registered` | Auth | Events | Auto-register user ke welcome event |
| `attendance.recorded` | Events | (future) | Trigger badge/point calculation |
| `badge.earned` | (future) | (future) | Notification ke user |

## Design System

Mengikuti `DESIGN.md` — berbasis Miro design tokens:
- Warna brand: Yellow (#ffd02f), Blue (#4262ff), Teal (#0fbcb0)
- Typography: Roobert PRO untuk heading, Inter untuk body
- Komponen: rounded-full buttons, card-base styling, pastel feature cards
- Target: remaja vihara (usia 13-18), visual gamifikasi yang fun dan engaging

## Database Schema

Entity utama:
- **User** — auth + profil (role: umat/pengurus/admin)
- **Event** — kebaktian, retreat, meditasi, sosial
- **Attendance** — record kehadiran (QR/manual)
- **Rsvp** — konfirmasi hadir/tidak
- **Badge** — achievement yang bisa di-unlock
- **Level** — progression system berbasis poin
- **Post/Comment** — forum komunitas
- **CurhatThread/Message** — channel privat umat → pengurus

## Menambah Modul Baru

### Frontend
1. Buat folder `src/modules/<nama>/internal/` — taruh semua implementasi
2. Buat `src/modules/<nama>/index.ts` — ekspos komponen + `ModuleDefinition`
3. Import di `src/shell/registry.ts` → tambahkan ke `activeModules`
4. Buat route file di `src/routes/` yang import dari modul

### Backend
1. Buat folder `src/modules/<nama>/internal/` — router, handler, service, repository
2. Buat `src/modules/<nama>/module.ts` — implement `AppModule` interface
3. Import di `src/index.ts` → tambahkan ke `modules` array
4. (Opsional) Subscribe ke domain events di `module.ts`
5. (Opsional) Publish domain events di service layer
