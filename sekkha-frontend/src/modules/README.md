# `src/modules/` — Modul-modul Frontend

Setiap modul adalah fitur independen dengan **kontrak publik yang sempit** lewat `index.ts`. Modul lain dan Shell hanya boleh mengakses apa yang di-ekspor `index.ts`.

## Daftar Modul Aktif

| Modul | Path | Ekspos Utama | Status |
|-------|------|--------------|--------|
| `auth` | `auth/` | Login, register, sesi | Aktif |
| `dashboard` | `dashboard/` | `DashboardPage` (Home) | Aktif |
| `events` | `events/` | Kalender, RSVP, attendance | Aktif |
| `leaderboard` | `leaderboard/` | Ranking, podium, streak | Aktif |
| `profile` | `profile/` | Stats, badge, attendance tracker | Aktif |
| `notifications` | `notifications/` | Inbox notifikasi | Aktif |
| `configure` | `configure/` | Master data (admin) | Aktif |
| `teams` | `teams/` | Daftar tim | Aktif |
| `pengurus` | `pengurus/` | Tools pengurus (event mgmt, analytics) | Aktif |
| `landing-page` | `landing-page/` | Halaman publik (pre-login) | Aktif |

Daftar modul yang dimuat Shell didefinisikan di `shell/registry.ts` — lihat `shell/README.md`.

## Struktur Setiap Modul

```
modules/<nama>/
├── internal/                  ← PRIVAT (jangan di-import dari luar)
│   ├── components/            # UI spesifik modul
│   ├── hooks/                 # data fetching / logic privat
│   ├── api/                   # call ke backend
│   ├── context/               # React Context (kalau perlu)
│   └── types.ts               # type definitions privat
└── index.ts                   ← PUBLIK (kontrak + ModuleDefinition)
```

## Aturan

1. **`internal/` benar-benar privat.** Modul lain TIDAK BOLEH import dari sini. Konvensi dijaga lewat `eslint-plugin-boundaries` (atau disiplin PR review).
2. **`index.ts` adalah satu-satunya pintu.** Ekspos:
   - Komponen publik (mis. `DashboardPage`)
   - `ModuleDefinition` (untuk Shell)
   - Hook publik (kalau memang reusable)
3. **Modul BUKAN tahu modul lain.** Cross-module frontend lewat:
   - Shell (alur navigasi)
   - Backend EventBus (state sinkronisasi)
   - Backend API (data bersama)
4. **Modul BOLEH import dari `@/components/base/` dan `@/components/common/`.** JANGAN duplikasi komponen global.
5. **`ModuleDefinition` wajib.** Tanpa itu, modul tidak muncul di sidebar.

## Menambah Modul Baru

Misal modul `gamification`:

1. Buat folder dan struktur internal:
   ```bash
   mkdir -p src/modules/gamification/internal/components
   ```

2. Implementasi minimal:
   ```tsx
   // src/modules/gamification/internal/components/GamificationPage.tsx
   export function GamificationPage() {
     return <div>Gamification</div>
   }
   ```

3. Kontrak publik + module definition:
   ```ts
   // src/modules/gamification/index.ts
   import type { ModuleDefinition } from "@/shell/registry"

   export { GamificationPage } from "./internal/components/GamificationPage"

   export const gamificationModule: ModuleDefinition = {
     name: "gamification",
     navItems: [
       { label: "Gamifikasi", to: "/gamification", icon: "Trophy" },
     ],
   }
   ```

4. Daftarkan di `shell/registry.ts`:
   ```ts
   import { gamificationModule } from "@/modules/gamification"

   export const activeModules = [
     // ...existing
     gamificationModule,
   ]
   ```

5. Tambah route di `routes/_authenticated/gamification.tsx` yang import `{ GamificationPage }` dari modul.

6. (Opsional) Tambahkan PRD/spec di `prd-sekkha/<domain>/` sebelum mulai.

Lihat `RULES.md` di root repo untuk prinsip modular lengkap.