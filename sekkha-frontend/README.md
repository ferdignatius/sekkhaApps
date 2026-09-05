# Sekkha Frontend

Aplikasi frontend untuk **Sekkha Apps** — platform komunitas remaja vihara dengan sistem gamifikasi.

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Router**: TanStack Router (file-based, type-safe)
- **Build**: Vite + Nitro
- **Styling**: Tailwind CSS v4 + shadcn/ui (custom Sekkha theme)
- **Font**: Roobert PRO (heading), Inter (body)
- **Icons**: lucide-react
- **HTTP**: native fetch (lihat `src/lib/api.ts`)
- **Tests**: Vitest + Testing Library

## Quick Start (Local Dev)

```bash
# Dari root monorepo (paling cepat):
bun dev:web

# Atau langsung di folder ini:
cd sekkha-frontend
npm install
npm run dev
```

Frontend jalan di `http://localhost:3000`. Backend harus jalan di `http://localhost:4000` (lihat `../sekkha-api/README.md`).

### Environment Variables

Salin `.env.example` ke `.env`:

```bash
cp .env.example .env
```

Variabel yang tersedia:

| Var | Default | Fungsi |
|-----|---------|--------|
| `VITE_API_URL` | `http://localhost:4000/api` | Base URL backend |

## Struktur Folder

Lihat README per-folder untuk detail:

- `src/components/` — Shared kernel (ui/base/common) → [README](src/components/README.md)
- `src/modules/` — Modul-modul independen → [README](src/modules/README.md)
- `src/shell/` — Orchestrator (registry + icon-map) → [README](src/shell/README.md)
- `src/routes/` — File-based routing (TanStack) → [README](src/routes/README.md)
- `src/lib/` — Shared utilities (api client, helpers) → [README](src/lib/README.md)
- `src/hooks/` — Global React hooks → [README](src/hooks/README.md)

## Prinsip Modular

> **Shell tidak tahu apa yang dikerjakan modul.** Shell hanya membaca **ModuleDefinition** dari setiap modul untuk menentukan menu sidebar dan route apa saja yang harus dibuka.

Cross-module communication **tidak boleh** lewat import langsung — selalu lewat backend (API + EventBus).

Lihat `RULES.md` di root repo untuk aturan lengkap.

## Adding shadcn Components

Gunakan skill `shadcn` di `.agents/skills/`:

```bash
npx shadcn@latest add button
npx shadcn@latest add dialog
```

> **Penting**: komponen dari `npx shadcn` masuk ke `src/components/ui/` dan **TIDAK BOLEH diedit manual** (lihat `src/components/README.md`). Untuk styling custom sesuai `DESIGN.md`, edit di `src/components/base/`.

## Skrip Penting

```bash
npm run dev           # dev server (HMR)
npm run build         # production build
npm run preview       # preview production build
npm run test          # run Vitest
npm run lint          # ESLint
```

## Testing

Unit + integration test via Vitest. Lihat `vitest.config.ts`.

```bash
npm run test          # run all tests once
npm run test -- --watch   # watch mode
```

Konvensi penamaan test:
- Component: `Component.test.tsx` di samping file-nya
- Hook: `useXxx.test.ts`
- API integration: `src/lib/api.test.ts` (mock fetch)

## Catatan Migrasi shadcn

Folder ini sedang dalam proses migrasi dari **Radix UI** ke **Base UI** sebagai primitive shadcn. Lihat skill `migrate-radix-to-base` di `.agents/skills/`. Status migrasi di-track via `.agents/skills-lock.json`.

## Backend Reference

Kontrak API ada di `../sekkha-api-contract.md` (sumber kebenaran untuk endpoint, payload, response).