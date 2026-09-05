# `src/shell/` — Orchestrator

Shell adalah **lapisan aplikasi utama** yang membaca *Module Definition* dari setiap modul untuk membangun UI utama (sidebar, routing layout) tanpa tahu detail modul. Shell tidak mengandung business logic modul apa pun.

## File

| File | Isi |
|------|-----|
| `registry.ts` | Interface `ModuleDefinition` + `activeModules` (daftar modul yang dimuat) |
| `icon-map.ts` | Mapping string icon → komponen lucide-react |

## `registry.ts` — Kontrak Modul

Setiap modul frontend **wajib** mengekspor sebuah `ModuleDefinition` dari `index.ts`-nya. Kontrak didefinisikan sebagai:

```ts
interface ModuleDefinition {
  name: string                       // identifier unik
  navItems: NavItem[]                // menu sidebar utama
  pengurusNavItems?: NavItem[]       // menu khusus pengurus (sidebar kedua)
  configureSections?: ConfigureSection[]  // sub-menu modul configure
}

interface NavItem {
  label: string
  to: string                         // path TanStack Router
  icon: string                       // key dari iconMap (lihat bawah)
}
```

## `icon-map.ts` — String → Component

Karena `ModuleDefinition` harus **serializable** (bisa dilintas-batas modul), icon-nya hanya string nama. Shell me-resolve string → komponen lewat `iconMap`:

```ts
iconMap["Trophy"]       → TrophyIcon
iconMap["LayoutDashboard"] → LayoutDashboardIcon
// ...
```

Untuk menambah icon baru, import dari `lucide-react` dan tambahkan ke map.

## Aliran Kerja

```
modules/<x>/index.ts
   ↓ ekspor { xModule: ModuleDefinition }
shell/registry.ts
   ↓ kumpulkan ke activeModules[]
components/app-sidebar.tsx, nav-projects.tsx
   ↓ baca activeModules, render sidebar dinamis
```

Shell **tidak boleh** import dari `modules/<x>/internal/`. Jika perlu, berarti Anda sedang mencoba menembus boundary — coba pakai kontrak publik modul atau perlebar `ModuleDefinition`.

## Cara Menambah Modul ke Shell

1. Di modul baru, ekspor `xxxModule: ModuleDefinition` dari `index.ts`.
2. Di `shell/registry.ts`, import dan tambahkan ke array `activeModules`.

Urutan di array = urutan tampil di sidebar.

## Anti-Pattern yang Dilarang

- ❌ Sidebar / nav di-hardcode untuk satu modul tertentu
- ❌ Shell import langsung dari `modules/<x>/internal/`
- ❌ Modul tahu tentang keberadaan Shell (harus sebaliknya)
- ❌ Icon pakai React component langsung di `ModuleDefinition` (akan kehilangan serializability)

Lihat juga: `src/modules/README.md`, `src/components/README.md`.