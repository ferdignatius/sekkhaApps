# `src/middleware/` — Express Middleware

Middleware Express yang dipasang di level aplikasi (bukan di level modul). Berjalan **sebelum** request masuk ke router modul mana pun.

## File

| File | Fungsi |
|------|--------|
| `auth.ts` | JWT verification + role guard (`requireAuth`, `requireRole`) |
| `errorHandler.ts` | Centralized error handling (termasuk normalisasi ZodError) |
| `requestLogger.ts` | Log setiap request masuk (method, path, status, durasi) |

## `auth.ts` — Autentikasi & Otorisasi

Dua middleware yang paling sering dipakai:

```ts
import { requireAuth, requireRole } from "@/middleware/auth"

// Wajib login:
router.get("/me", requireAuth, meHandler)

// Wajib role tertentu (admin di-bypass otomatis):
router.post("/events", requireAuth, requireRole("pengurus"), createEvent)
router.delete("/events/:id", requireAuth, requireRole("pengurus"), deleteEvent)
```

### `requireAuth`

- Ambil `Authorization: Bearer <token>` dari header
- Verifikasi pakai `process.env.JWT_SECRET` (lihat `.env.example`)
- Inject `req.user = { userId, role }` jika valid
- Return `401` kalau token tidak ada / invalid / expired

### `requireRole(...roles)`

- Harus dipasang **setelah** `requireAuth`
- Allow kalau `req.user.role === "admin"` ATAU role termasuk dalam list
- Return `403` kalau ditolak

> Konvensi role: `umat`, `aktivis`, `pengurus`, `admin`. Lihat PRD `prd-sekkha/auth/` untuk role matrix.

## `errorHandler.ts` — Error Normalizer

**Harus dipasang paling akhir** di pipeline Express (lihat `src/index.ts`):

```ts
app.use(errorHandler)
```

Behavior:

- `ZodError` → status `400` dengan `details: err.issues`
- Error dengan `.status` (number) → pakai itu, kalau tidak → `500`
- Di **production**, error 500 di-sanitize jadi `"Internal server error"` (tidak bocorkan stack / DB error ke client)
- Di **development**, raw message dikembalikan untuk debugging

### Cara Pakai dari Handler

```ts
import { HttpError } from "@/lib/errors"   // (opsional, kalau helper ada)
throw new HttpError(404, "User not found")
```

Atau cukup `throw new Error("...")` lalu set `.status` di error object. Middleware akan honor.

## `requestLogger.ts`

Log setiap request dengan format ringkas:

```
GET /api/events 42ms 200
POST /api/auth/login 120ms 201
GET /api/users/me 8ms 401
```

Berguna untuk observability dasar dan audit trail.

## Urutan Pemasangan (di `src/index.ts`)

```ts
app.use(express.json())          // 1. body parser
app.use(requestLogger)           // 2. logging (sebelum routes)
app.use("/api", router)          // 3. routes
app.use(errorHandler)            // 4. error handler (paling akhir)
```

## Aturan

1. **Middleware di sini dipakai oleh banyak modul.** Kalau hanya 1 modul, taruh di `modules/<x>/internal/middleware.ts`.
2. **Tidak ada business logic** di sini — murni cross-cutting concern (auth, logging, error).
3. **Order matters.** Jangan ubah urutan pemasangan tanpa paham implikasinya.

Lihat juga: `src/core/README.md`, `src/lib/README.md`, `src/modules/README.md`.