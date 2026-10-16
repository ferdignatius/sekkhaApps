# 🧭 Panduan Arsitektur & Alur Kerja (Flow) `src/modules/`

Dokumen ini menjelaskan **arsitektur modular MVC**, **alur kerja request (request flow)**, serta **peran masing-masing file** di dalam setiap modul backend `sekkha-api`.

---

## 🗺️ 1. Diagram Alur Utama (End-to-End Flow)

Setiap request HTTP yang masuk ke backend mengikuti alur linear dan terstruktur:

```
[ CLIENT: Frontend / Postman / Mobile ]
                   │
                   │ 1. HTTP Request (cth: POST /api/events)
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 🚀 Express App (src/app.ts & src/index.ts)                   │
│    - Global Middleware (CORS, JSON Parser, Helmet, RateLimit)│
│    - Routing ke modul via `app.use("/api/events", ...)`     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ 2. Masuk ke Router Modul
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 🛣️ routes.ts                                                │
│    - Middleware Otentikasi (`requireAuth`)                  │
│    - Middleware Hak Akses / Role (`requireRole("organizer")`)│
│    - Meneruskan ke Controller yang sesuai                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ 3. Panggil Controller
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 🎮 controllers.ts                                            │
│    - Mengambil input dari `req.body`, `req.params`, `req.user`│
│    - Validasi format input (Zod schema)                     │
│    - Memanggil method di `services.ts`                      │
│    - Mengirim response JSON (`res.status(201).json(...)`)    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ 4. Eksekusi Logika Bisnis
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 🧠 services.ts (Otak Bisnis)                                │
│    - Logika bisnis utama (validasi kuota, hitung poin/streak)│
│    - Akses Database langsung via Prisma (`prisma.event...`) │
│    - Invalidation / set Redis cache jika diperlukan         │
│    - (Opsional) Panggil helper privat di `internal/`        │
│    - (Opsional) Publish domain event ke EventBus            │
└────────────┬─────────────────────────────┬──────────────────┘
             │                             │
             │ Query DB                    │ Publish Event (Decoupled)
             ▼                             ▼
┌──────────────────────────┐   ┌──────────────────────────────┐
│ 🗄️ PostgreSQL (Prisma)    │   │ 📢 EventBus (src/core/)      │
│    Database Data Utama   │   │    Memicu modul lain (cth:   │
│                          │   │    notifikasi, leaderboard)  │
└──────────────────────────┘   └──────────────────────────────┘
```

---

## 📁 2. Anatomi & Peran File di Setiap Modul

Setiap modul fitur (seperti `events`, `auth`, `users`, `leaderboard`) memiliki struktur file yang konsisten:

```
src/modules/<nama-modul>/
├── routes.ts         ← [Rute URL] Endpoint Express & pasang middleware
├── controllers.ts    ← [Controller] Handle req/res HTTP & validasi input
├── services.ts       ← [Bisnis & Data] Otak logika, kalkulasi & query Prisma
├── models.ts         ← [Tipe & Schema] TypeScript interface & tipe data
├── module.ts         ← [Identitas Modul] Kontrak AppModule untuk didaftar di app.ts
├── index.ts          ← [Pintu Keluar] Barrel export publik untuk konsumsi luar
└── internal/         ← [Privat] File pembantu KHUSUS modul ini saja (opsional)
```

### Penjelasan Detail Peran File:

| File | Peran & Tanggung Jawab | Aturan Penting |
|---|---|---|
| **`routes.ts`** | Menentukan endpoint (GET, POST, PUT, DELETE) dan memasang guard middleware seperti `requireAuth` atau `requireRole`. | ❌ Jangan taruh logika bisnis di sini. Router hanya memetakan URL ke fungsi controller. |
| **`controllers.ts`** | Bertindak sebagai perantara HTTP. Mengekstrak data dari `req.body` / `req.params`, memvalidasi tipe/skema, memanggil service, dan mengirim respon `res.json()`. | ❌ Jangan panggil query Prisma langsung di controller. Selalu lewat `services.ts`. |
| **`services.ts`** | **Otak dari modul.** Berisi seluruh aturan bisnis, validasi logika (cth: "apakah user sudah RSVP?", "apakah event sudah penuh?"), query ke Database via Prisma, dan audit logging. | ✅ Semua logika manipulasi data berada di sini. |
| **`models.ts`** | Tempat mendefinisikan interface TypeScript, tipe parameter request, dan response shape. | ✅ Menjaga agar kode memiliki type-safety yang kuat dan tidak menggunakan `any`. |
| **`module.ts`** | Menerapkan interface `AppModule`. Berisi method `register(app)` untuk mendaftarkan router ke Express dan `subscribe()` untuk mendengar event dari EventBus. | ✅ Entry point resmi modul saat server dinyalakan. |
| **`index.ts`** | Public export modul. Modul lain hanya boleh mengimpor dari file ini (bukan dari file privat). | ✅ Memastikan modularitas terjaga rapi. |
| **`internal/`** *(Opsional)* | Folder khusus untuk file pembantu yang hanya relevan bagi modul tersebut (misal: `cron.ts` untuk scheduler mingguan, `sse.ts` untuk streaming presensi, `email.ts` untuk template email). | ❌ File di dalam folder ini tidak boleh diakses oleh modul lain. |

---

## 🔄 3. Komunikasi Antar-Modul (EventBus vs Direct Import)

Untuk menjaga kode tetap bersih, modular, dan tidak saling bergantung erat (*loose coupling*):

### Aturan Emas:
1. **Gunakan EventBus jika terjadi efek samping (*side-effect*) ke modul lain.**
   - Contoh: Ketika seorang user baru mendaftar di modul `auth`, modul `events` ingin otomatis mendaftarkan user ke event penyambutan.
   - **Solusi**: Modul `auth` **TIDAK** memanggil `eventsService`. Modul `auth` hanya mem-publish event:
     ```ts
     // di auth/services.ts
     eventbus.publish(DomainEvents.USER_REGISTERED, { userId, name, email })
     ```
   - Modul `events` mendengarkan event tersebut di `module.ts` / `internal/subscribers.ts`:
     ```ts
     // di events/module.ts
     subscribe() {
       eventbus.subscribe(DomainEvents.USER_REGISTERED, onUserRegistered)
     }
     ```

2. **Gunakan Direct Import HANYA untuk fungsi utility murni lewat `index.ts`.**
   - Contoh: Middleware otentikasi global perlu memeriksa apakah token sudah di-revoke (`isTokenRevoked` dari `modules/auth`).

---

## 💡 4. Contoh Nyata: Menambah Endpoint Baru

Misalnya Anda ingin menambahkan fitur: **"User memberi rating pada event"** di modul `events`.

Berikut urutan langkah yang harus dilakukan:

### Langkah 1: Definisikan Tipe Data di `models.ts`
```ts
// src/modules/events/models.ts
export interface EventRatingInput {
  rating: number // 1 - 5
  feedback?: string
}
```

### Langkah 2: Buat Logika Bisnis di `services.ts`
```ts
// src/modules/events/services.ts
export const eventServices = {
  // ...
  async rateEvent(userId: string, eventId: string, data: EventRatingInput) {
    // 1. Cek apakah user benar-benar hadir di event tersebut
    const attendance = await prisma.eventAttendance.findUnique({
      where: { event_id_user_id: { event_id: eventId, user_id: userId } }
    })
    if (!attendance) throw new Error("Hanya peserta yang hadir yang dapat memberi rating")

    // 2. Simpan rating ke database
    return await prisma.eventRating.create({
      data: { user_id: userId, event_id: eventId, rating: data.rating, feedback: data.feedback }
    })
  }
}
```

### Langkah 3: Buat Handler di `controllers.ts`
```ts
// src/modules/events/controllers.ts
export const eventControllers = {
  // ...
  async submitRating(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId
      const eventId = req.params.id
      const { rating, feedback } = req.body

      const result = await eventServices.rateEvent(userId, eventId, { rating, feedback })
      res.status(201).json({ success: true, data: result })
    } catch (err) {
      next(err) // Meneruskan error ke global error handler
    }
  }
}
```

### Langkah 4: Daftarkan Rute di `routes.ts`
```ts
// src/modules/events/routes.ts
import { requireAuth } from "../../middleware/auth"
import { eventControllers } from "./controllers"

eventsRouter.post("/:id/rating", requireAuth, eventControllers.submitRating)
```

Selesai! Fitur baru langsung terpasang rapi tanpa mengganggu file sistem lainnya.

---

## 📋 5. Ringkasan Modul & Keberadaan Folder `internal/`

| Modul | Peran Utama | Memiliki `internal/`? | Isi File `internal/` |
|---|---|:---:|---|
| **`auth`** | Registrasi, Login, Password, Session JWT & OTP | ✅ Ya | `email.ts`, `otpStore.ts`, `refreshTokenStore.ts`, `tokenRevocation.ts`, `utils.ts`, `validation.ts` |
| **`events`** | Manajemen Event, RSVP, Live Scanner Attendance | ✅ Ya | `sse.ts` (Server-Sent Events), `subscribers.ts` (Event listener) |
| **`leaderboard`**| Ranking Poin, Season, Streak mingguan | ✅ Ya | `cron.ts` (Scheduler kalkulasi mingguan) |
| **`schools`** | Master Data Sekolah/Kampus & Autocomplete | ✅ Ya | `schoolsData.ts` (Daftar statis sekolah) |
| **`users`** | Profil Pengguna, Avatar, Role & Poin | ✅ Ya | `utils.ts` (Helper format profil) |
| **`configure`** | Konfigurasi Dinamis Master Data | ❌ Tidak | *(Semua logika cukup di MVC root)* |
| **`notifications`**| Notifikasi In-App Pengguna | ❌ Tidak | *(Semua logika cukup di MVC root)* |
| **`pengurus`** | Dashboard & Fitur Khusus Pengurus | ❌ Tidak | *(Semua logika cukup di MVC root)* |
| **`people`** | Direktori Umat & Anggota Komunitas | ❌ Tidak | *(Semua logika cukup di MVC root)* |