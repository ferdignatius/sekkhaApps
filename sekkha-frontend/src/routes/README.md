# `src/routes/` — File-Based Routing (TanStack Router)

Folder ini berisi **routes** aplikasi menggunakan file-based routing dari TanStack Router. Setiap file `.tsx` di sini adalah satu route — generator `routeTree.gen.ts` mem-build type-safe route tree dari struktur folder.

## Struktur

```
routes/
├── __root.tsx                 ← root layout (HTML shell, providers)
├── index.tsx                  ← "/" → redirect ke /login atau /home
├── login.tsx                  ← "/login"
├── sign-up.tsx                ← "/sign-up"
├── forgot-password.tsx        ← "/forgot-password"
└── _authenticated/            ← layout group: butuh sesi aktif
    ├── _authenticated.tsx     ← layout (sidebar + outlet)
    ├── home.tsx               ← "/home" → DashboardPage
    ├── events.tsx             ← "/events" → EventsPage
    ├── ...                    ← route lain sesuai modul
```

## Aturan Penamaan

| Pattern | Contoh | Arti |
|---------|--------|------|
| `nama.tsx` | `login.tsx` | Route `/nama` |
| `__root.tsx` | `__root.tsx` | Root layout |
| `_prefix/` | `_authenticated/` | Pathless layout group — tidak menambah segmen URL, hanya untuk layout |
| `_authenticated.tsx` | — | Layout untuk grup `_authenticated/` |
| `_authenticated/nama.tsx` | `_authenticated/events.tsx` | Route `/nama` di dalam layout `_authenticated` |

> Awalan `_` = **pathless layout**. Berguna untuk mengelompokkan route yang punya shared layout (mis. butuh auth) tanpa menambah segmen URL.

## Cara Kerja `_authenticated/`

1. `_authenticated.tsx` adalah layout component. Ia:
   - Mengecek apakah ada sesi (`localStorage.sekkha_access_token`)
   - Kalau tidak ada → `<Navigate to="/login" />`
   - Kalau ada → render `<Outlet />` + `<SekkhaAppSidebar />`
2. Semua route di dalam folder `_authenticated/` otomatis memakai layout ini.
3. Sidebar dirender dari `shell/registry.ts` (lihat `src/shell/README.md`).

## Menambah Route Baru

Misal untuk modul `events`:

```bash
touch src/routes/_authenticated/events.tsx
```

```tsx
// src/routes/_authenticated/events.tsx
import { createFileRoute } from "@tanstack/react-router"
import { EventsPage } from "@/modules/events"

export const Route = createFileRoute("/_authenticated/events")({
  component: EventsPage,
})
```

Setelah itu, dev server TanStack akan auto-regenerate `routeTree.gen.ts` — **JANGAN edit file ini manual**.

## Anti-Pattern

- ❌ Taruh logic fetch di komponen route — gunakan hook dari modul (`useEventsQuery`, dll.)
- ❌ Bypass `_authenticated` layout dengan menambah route langsung di root
- ❌ Edit `routeTree.gen.ts` (auto-generated)
- ❌ Hardcode navigasi lewat `<a href>` — gunakan `<Link>` dari TanStack

Lihat juga: `src/modules/README.md`, `src/shell/README.md`.