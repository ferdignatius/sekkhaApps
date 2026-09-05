# `src/modules/` — Modul-modul Backend

Setiap modul adalah fitur backend independen dengan entry point `module.ts` yang mengekspor `AppModule` (lihat `src/core/types.ts`). Folder `internal/` privat dan tidak boleh diakses langsung dari modul lain.

## Daftar Modul Aktif

| Modul | Path | Domain | Status |
|-------|------|--------|--------|
| `auth` | `auth/` | Registrasi, login, JWT | Aktif |
| `users` | `users/` | Profil, role, badge, attendance | Aktif |
| `events` | `events/` | Event, RSVP, attendance | Aktif |
| `leaderboard` | `leaderboard/` | Ranking, season, streak | Aktif |
| `configure` | `configure/` | Master data (admin) | Aktif |
| `notifications` | `notifications/` | Notifikasi in-app | Aktif |
| `teams` | `teams/` | Daftar tim & anggota | Aktif |
| `pengurus` | `pengurus/` | Tools pengurus (analytics, broadcast) | Aktif |
| `schools` | `schools/` | School combobox (master data) | Aktif |

Daftar modul yang dimuat didefinisikan di `src/index.ts`:

```ts
const modules: AppModule[] = [
  authModule, usersModule, eventsModule, /* ... */
]
```

## Struktur Setiap Modul

```
modules/<nama>/
├── module.ts                  ← PUBLIK: AppModule (wajib)
└── internal/                  ← PRIVAT (jangan di-import dari luar)
    ├── router.ts              # Express router definitions
    ├── handler.ts             # Request handlers (tipis: parse → delegate → respond)
    ├── service.ts             # Business logic + eventbus.publish()
    ├── repository.ts          # Prisma queries only (no logic)
    ├── validation.ts          # Zod schemas
    └── subscribers.ts         # EventBus handlers (kalau perlu)
```

## Aturan Backend Module

1. **`module.ts` adalah satu-satunya pintu publik.** Modul lain TIDAK BOLEH import dari `internal/`.
2. **Handler tipis.** Handler hanya:
   - Parse + validate request (`validation.ts`)
   - Panggil service
   - Kirim response
   - Tangani error lewat next(err)
3. **Service = business brain.** Validasi bisnis, orchestration, event publishing — semuanya di sini.
4. **Repository = DB only.** Cuma query Prisma. Tidak ada validasi, tidak ada business rule.
5. **Cross-module lewat EventBus.** Modul A butuh trigger modul B → publish event. JANGAN panggil service B langsung.

## Pola Standar Modul

```ts
// modules/<nama>/module.ts
import type { AppModule } from "@/core/types"
import { router } from "./internal/router"
import { subscribe } from "./internal/subscribers"

export const <nama>Module: AppModule = {
  name: "<nama>",
  register(app) {
    app.use("/api/<nama>", router)
  },
  subscribe() {
    subscribe()
  },
}
```

## Komunikasi EventBus Antar-Modul

Contoh lengkap (lihat root `README.md` untuk diagram):

```
auth.service.ts:
  await prisma.user.create(...)
  eventbus.publish("user.registered", { userId, email })

events/subscribers.ts:
  eventbus.subscribe("user.registered", async ({ userId }) => {
    await rsvpToWelcomeEvent(userId)
  })
```

Daftar event resmi ada di `src/core/eventbus/events.ts`.

## Menambah Modul Baru

1. Buat folder dan `module.ts`:
   ```bash
   mkdir -p src/modules/gamification/internal
   ```
2. Implementasi minimal (lihat pola di modul `auth` atau `events`):
   - `internal/router.ts` — Express router
   - `internal/handler.ts` — handlers tipis
   - `internal/service.ts` — business logic
   - `internal/repository.ts` — Prisma queries
   - `internal/validation.ts` — Zod schemas
3. Export `<nama>Module: AppModule` dari `module.ts`.
4. Daftarkan di `src/index.ts`:
   ```ts
   import { gamificationModule } from "./modules/gamification/module"
   const modules = [/* ... */, gamificationModule]
   ```
5. (Opsional) Subscribe ke event di `module.ts` + `internal/subscribers.ts`.
6. Publish event dari `service.ts` kalau ada side-effect yang perlu modul lain tahu.
7. Tulis PRD di `prd-sekkha/<domain>/` sebelum mulai (lihat skill `spec-driven-development`).

## Anti-Pattern

- ❌ Handler akses Prisma langsung (lewati service)
- ❌ Service panggil repository modul lain (harus lewat EventBus)
- ❌ Modul import dari `modules/<x>/internal/` modul lain
- ❌ Module tanpa `module.ts` (file `internal/*.ts` di-root folder modul)
- ❌ Business logic di repository

Lihat juga: `src/core/README.md`, `src/middleware/README.md`, `src/lib/README.md`.