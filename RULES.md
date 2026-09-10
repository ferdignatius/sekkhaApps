Terapkan prinsip clean code

## Component Structure (Shared Kernel)

```
src/components/
├── ui/              # ← shadcn generated, JANGAN DIUBAH
│   ├── button.jsx
│   ├── dialog.jsx
│   └── ...
│
├── base/            # ← shadcn yang udah di-customize sesuai design
│   ├── Button.jsx   #   wrap ui/button + tambahin variant/size kita
│   ├── Input.jsx
│   ├── Badge.jsx
│   └── ...
│
└── common/          # ← komponen komposit (gabungan beberapa base)
    ├── AppTable.jsx
    ├── AppModal.jsx
    └── ...
```

Logika layer component:
```
ui/button.jsx          → component shadcn murni
    ↓
base/Button.jsx        → styling sesuai design DESIGN.md
    ↓
common/AppTable.jsx    → pakai base/Button di dalamnya
    ↓
modules/task/...       → pakai common/ atau base/ langsung
```

## Module Structure (Frontend)

```
modules/
└── task/
    ├── internal/          # Privat — semua implementasi di sini
    │   ├── components/    # UI khusus task, ga bisa dipake di module lain
    │   │   ├── TaskCard.jsx
    │   │   ├── TaskForm.jsx
    │   │   └── TaskKanban.jsx
    │   │
    │   ├── hooks/         # data fetching / logic khusus task
    │   │   └── useTaskQuery.js
    │   │
    │   ├── api/           # call ke backend endpoint task
    │   │   └── task.api.js
    │   │
    │   └── types.ts       # type definitions
    │
    └── index.ts           # Publik — export yang boleh dipakai dari luar
                           # + ModuleDefinition untuk Shell Registry
```

### Aturan Module

1. **Internal = privat.** File di `internal/` HANYA boleh diakses dari dalam modul itu sendiri.
2. **index.ts = kontrak publik.** Modul lain dan Shell hanya boleh import dari `index.ts`.
3. **ModuleDefinition wajib.** Setiap modul harus export `ModuleDefinition` yang mendaftarkan navItems.
4. **Shared components pakai Shared Kernel.** Modul pakai `@/components/base/` dan `@/components/common/` — JANGAN duplikasi komponen global di dalam modul.
5. **Inter-module communication lewat EventBus.** JANGAN import langsung dari modul lain di backend. Pakai `eventbus.publish()` dan `eventbus.subscribe()`.

## Module Structure (Backend)

```
modules/
└── task/
    ├── module.ts          # Kontrak publik: register() + subscribe()
    └── internal/
        ├── router.ts      # Express router definitions
        ├── handler.ts     # Request handlers (thin, parse + delegate)
        ├── service.ts     # Business logic + eventbus.publish()
        ├── repository.ts  # Prisma database queries
        └── validation.ts  # Zod schemas
```

### Aturan Backend Module

1. **module.ts = entry point.** Shell (index.ts) hanya import `module.ts`, bukan file internal.
2. **Handler tipis.** Handler hanya parse request + panggil service + kirim response.
3. **Service = brain.** Semua business logic, validasi bisnis, dan event publishing di sini.
4. **Repository = database only.** Hanya Prisma queries, TANPA business logic.
5. **EventBus untuk cross-module.** Kalau modul A perlu trigger aksi di modul B, publish event. JANGAN call service modul B langsung.

## Git: Niche Commits

1. **Satu commit = satu topik.** Jangan campur fitur beda domain dalam satu commit (mis. auth hardening jangan digabung schema migration). Kalau satu perubahan menyentuh schema + beberapa modul sekaligus dan tidak bisa jalan terpisah, jadikan satu commit migrasi dengan body yang menjelaskan tiap bagian.
2. **Pesan commit pakai format:** `v<target> - <type>(<scope>): <summary>` untuk judul, plus body bullet yang menjelaskan "apa & kenapa" bila perubahan non-trivial. `<target>` = versi rilis berikutnya yang belum di-tag (lihat section Versioning). Type mengikuti Conventional Commits: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`…
3. **Sebelum commit, jalankan verifikasi:** API → `bun run build` (tsc); frontend → `typecheck` lalu `test` (`lint` juga, begitu eslint terpasang). Jangan commit di atas merah.
4. **Jangan menyeret file lain ke commit.** Cek `git status` sebelum `git add`; gunakan `git add <file>` eksplisit, bukan `git add -A` sembarangan — working tree sering berubah di tengah jalan.
5. **CHANGELOG ditulis saat perubahan, bukan saat rilis.** Setiap commit fitur/fix wajib menambahkan entri ke bagian `[Unreleased]` di `CHANGELOG.md` (Added/Changed/Fixed/Removed). Saat release, tinggal pindahkan `[Unreleased]` jadi `[X.Y.Z] - tanggal`.

## Versioning & Release (Semver)

Semua versi (`MAJOR.MINOR.PATCH`, contoh `1.3.2`) dibagi rata di 3 `package.json` (root, api, frontend) — **annotated git tag adalah sumber kebenaran versi**.

### Kapan naikkan versi

Tanya: *"apakah ada orang yang kodenya bisa rusak kalau dia update?"*

| Bump | Kondisi | Contoh |
|---|---|---|
| **PATCH** (+0.0.1) | Fix bug; tanpa fitur baru, tanpa perubahan perilaku yang diandalkan konsumen | fix race condition generate user number |
| **MINOR** (+0.1.0) | **Additive** — endpoint/fitur/field baru yang backward-compatible | `GET /users/me/export`, endpoint claim PIN baru |
| **MAJOR** (+1.0.0) | **Breaking** — ada yang dihapus/diubah sehingga konsumen lama rusak dan wajib migrasi | hapus field dari response API, ubah shape schema |

- `fix:` → PATCH, `feat:` → MINOR, breaking change (`feat!:`/`fix!:` atau dihapus dari kontrak publik) → MAJOR.
- Khusus monorepo fullstack ini: kalau API breaking tapi satu-satunya konsumen adalah frontend di repo yang sama dan ikut berubah di rilis yang sama, boleh diperlakukan MINOR (pragmatis). MAJOR wajib begitu ada konsumen eksternal API (mobile app, integrasi pihak ketiga).
- **Bump versi terjadi di commit release, bukan di tiap commit.** Commit biasa cukup di-prefix versi target.

### Flow rilis (dari branch `production`)

1. Pastikan semua commit niche sudah masuk dan verifikasi hijau.
2. `bun run release <ver>` — bump versi di 3 package.json sekaligus.
3. Pindahkan isi `[Unreleased]` di `CHANGELOG.md` ke `[<ver>] - YYYY-MM-DD`.
4. `git commit -m "release: vX.Y.Z"` — **hanya berisi** perubahan versi + changelog. Jangan sampai ada file kode lain nyeret masuk; cek `git status` dulu, commit kode tersisa dulu secara terpisah.
5. `git tag -a vX.Y.Z -m "Release X.Y.Z"` lalu push branch + tag.
6. Saat deploy, bump pinned image tag di `sekkha-api/docker-compose.yml` (`ferdignatius/sekkha-api:vX.Y.Z`).