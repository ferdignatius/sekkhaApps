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