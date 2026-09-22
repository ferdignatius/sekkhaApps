# `src/modules/` — Modul-modul Backend

Setiap modul adalah fitur backend independen berbasis arsitektur MVC Modular. File standar MVC ditaruh langsung di root setiap modul, sedangkan file helper/utilitas privat khusus milik modul tersebut ditaruh di folder `internal/`.

## Struktur Standar Setiap Modul

```
modules/<nama>/
├── controllers.ts             # Request controllers (validasi request, panggil service, kirim response)
├── models.ts                  # Tipe data, interface & skema model modul
├── routes.ts                  # Express route definitions
├── services.ts                # Logika bisnis utama modul & akses data Prisma
├── module.ts                  # Entry point AppModule (register route & subscribe eventbus)
├── index.ts                   # Public barrel export modul
└── internal/                  # (Opsional) Helper / utilitas privat khusus modul tsb (cth: sse, cron, utils)
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