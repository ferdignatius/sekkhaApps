# `src/lib/` — Shared Utilities Backend

Utilitas bersama lintas modul: koneksi database, cache, dan helper. **Tidak boleh ada business logic** di sini — itu milik `modules/<x>/internal/service.ts`.

## File

| File | Fungsi |
|------|--------|
| `prisma.ts` | Singleton Prisma client |
| `redis.ts` | Redis connection (optional cache / session) |
| `cache.ts` | Helper caching generik (Redis wrapper) |

## `prisma.ts`

Singleton Prisma client agar tidak multiply koneksi di development (Hot Reload). Pakai di repository:

```ts
import { prisma } from "@/lib/prisma"

const user = await prisma.user.findUnique({ where: { id } })
```

Schema: `prisma/schema.prisma` di root folder `sekkha-api/`. Generate client dengan:

```bash
npm run db:generate      # generate Prisma client
npm run db:migrate       # apply migration ke DB
npm run db:seed          # seed data awal (akun test, master data)
npm run db:push          # sync schema tanpa migration (dev only)
```

## `redis.ts`

Koneksi Redis untuk cache dan token session. Dipakai oleh `cache.ts` dan middleware `auth.ts`.

## `cache.ts`

Wrapper generik untuk caching berbasis Redis. API kira-kira:

```ts
import { cache } from "@/lib/cache"

await cache.set("key", value, ttlSeconds)
const value = await cache.get<T>("key")
await cache.del("key")
```

Gunakan untuk:
- Cache response endpoint yang sering dipanggil dan jarang berubah
- Session / token blacklist
- Rate limiting counter

**Jangan cache** data yang:
- Berisi PII sensitif tanpa enkripsi
- Berubah setiap detik
- Wajib fresh demi konsistensi (mis. saldo, poin)

## Aturan

1. **Tambah file hanya kalau dipakai ≥2 modul.**
2. **Jangan taruh handler / route logic di sini.** Itu untuk `modules/<x>/internal/`.
3. **Pastikan koneksi di-handle dengan benar** — singleton, close pada shutdown.
4. **Setiap environment variable** yang dipakai harus ada di `.env.example` (lihat root `sekkha-api/`).

Lihat juga: `src/middleware/README.md`, `src/core/README.md`.