# `src/lib/` — Shared Utilities

Utilitas bersama yang dipakai lintas modul. Berisi thin wrapper di atas dependency eksternal atau helper yang berdiri sendiri.

## File

| File | Fungsi |
|------|--------|
| `api.ts` | HTTP client terpusat ke `sekkha-api` + auth token injection |
| `utils.ts` | Helper kecil (biasanya `cn()` untuk className merge) |

## `api.ts` — API Client

Satu titik akses HTTP ke backend. Semua modul **wajib** import dari sini — bukan `fetch` langsung.

```ts
import { api } from "@/lib/api"

// Method singkat:
await api.get<T>("/events")
await api.post<T>("/events", payload)
await api.put<T>("/events/123", payload)
await api.patch<T>("/users/me", payload)
await api.delete<T>("/events/123")

// Atau full-control via apiFetch:
import { apiFetch } from "@/lib/api"
await apiFetch<T>("/path", { method: "GET" })
```

### Behavior

- **Base URL**: `import.meta.env.VITE_API_URL` atau fallback `http://localhost:4000/api`
- **Auth header**: Otomatis inject `Authorization: Bearer <token>` dari `localStorage.sekkha_access_token`
- **Error handling**: Non-2xx → throw `Error` dengan `.status` dan `.body` dari response
- **Content-Type default**: `application/json`

### Token Storage

Token disimpan di `localStorage` (key: `sekkha_access_token`). Modul `auth` yang bertanggung jawab menulis/menghapusnya.

## `utils.ts`

Biasanya berisi helper `cn()` (pola `clsx + tailwind-merge`) untuk menggabungkan Tailwind classes dengan benar:

```ts
import { cn } from "@/lib/utils"

<div className={cn("p-4", isActive && "bg-accent", className)} />
```

## Aturan

1. **Tambah file di sini hanya kalau dipakai ≥2 modul.** Kalau cuma satu modul, taruh di `modules/<x>/internal/`.
3. **Jangan taruh komponen UI di sini.** Itu milik `components/`.
3. **Jangan taruh hook di sini.** Hook global ada di `hooks/`, hook privat di `modules/<x>/internal/hooks/`.
4. **Setiap modul boleh menambahkan file** ke `lib/` (mis. format helper), tapi tetap jaga prinsip: dipakai lintas modul.

Lihat juga: `src/hooks/README.md`, `src/modules/README.md`.