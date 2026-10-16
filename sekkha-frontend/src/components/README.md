# `src/components/` — Shared Kernel

Berisi semua komponen UI yang dipakai bersama oleh Shell dan seluruh modul frontend. **Tidak ada satu pun komponen di sini yang boleh tahu detail modul tertentu.**

## Layer Architecture

Komponen disusun bertingkat — dari bawah ke atas, setiap layer membungkus layer di bawahnya:

```
┌──────────────────────────────────────────────────────────────────┐
│ ui/        shadcn murni (generated)  ── JANGAN UBAH             │
│           • wrapper Radix UI primitives                          │
│           • styling default shadcn                                │
│           • di-overwrite oleh `npx shadcn add <component>`      │
└──────────────────────────────────────────────────────────────────┘
                          ↓ dibungkus dengan variant/style Sekkha
┌──────────────────────────────────────────────────────────────────┐
│ base/      shadcn + design system override                      │
│           • varian warna, ukuran, radius sesuai DESIGN.md       │
│           • API identik dengan ui/ (drop-in replacement)        │
│           • satu entry point: base/index.ts                     │
└──────────────────────────────────────────────────────────────────┘
                          ↓ dikomposisikan jadi komponen kompleks
┌──────────────────────────────────────────────────────────────────┐
│ common/    Komponen komposit reusable lintas modul              │
│           • Sidebar, Breadcrumb, Skeleton, Responsive Modal,    │
│             MobileDock                                          │
│           • boleh berisi business logic ringan (mis. responsive) │
└──────────────────────────────────────────────────────────────────┘
                          ↓ dipakai oleh modul
┌──────────────────────────────────────────────────────────────────┐
│ modules/<n>/internal/components/                                │
│           • komponen privat modul — tidak di-ekspos             │
└──────────────────────────────────────────────────────────────────┘
```

## Aturan

1. **`ui/` adalah read-only.** Jangan edit manual — pakai `npx shadcn@latest add` / `npx shadcn@latest diff`. Lihat skill: `sekkha-frontend/.agents/skills/shadcn/`.
2. **`base/` membungkus `ui/`, bukan menggantikan.** Saat shadcn update komponen, base tetap compile.
3. **Modul import dari `base/` atau `common/`, bukan dari `ui/` langsung.** Kalau butuh style Sekkha, selalu lewat `base/`.
4. **Tidak ada state global di sini.** Untuk state bersama, gunakan React Context (di `hooks/` atau di dalam modul).
5. **Sidebar top-level (`app-sidebar.tsx`, `nav-*.tsx`, `team-switcher.tsx`)** adalah shell-level; mereka membaca `shell/registry.ts` untuk menu dinamis.

## Contoh Aliran Styling

```tsx
// Modul ingin pakai tombol dengan style Sekkha:
import { Button } from "@/components/base/Button"   // ← yang ini

// JANGAN:
import { Button } from "@/components/ui/button"     // ← shadcn mentah, tidak sesuai design
```

Lihat `sekkha-frontend/sekkha-api-contract.md` dan `DESIGN.md` di root repo untuk konteks desain.