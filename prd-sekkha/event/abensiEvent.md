# PRD: Logika Absensi Event — Sekkha Apps

| Metadata | Detail |
| --- | --- |
| **Dokumen** | Product Requirement Document (PRD) |
| **Fitur** | Absensi Event (Sesi Scan QR, Draft Attendance, Batch Point Finalization) |
| **Aplikasi** | Sekkha Apps (Frontend & Backend) |
| **Versi** | 2.1.0 |
| **Status** | Approved / Synchronized |
| **Referensi** | `prd-sekkha/event/event.md`, `prd-sekkha/configure/masterdata/eventType.md` |

---

## 1. Ringkasan Eksekutif

Sistem absensi event adalah mekanisme pencatatan kehadiran jemaat yang berjalan dalam sebuah **sesi absensi** yang dibuka, dikelola, dan difinalisasi secara eksklusif oleh **organizer** dan **admin**.

Alur utama:
1. Organizer/Admin **memulai acara** via Action Button (`scheduled` → `active`) → sesi absensi dibuka.
2. Organizer/Admin memindai QR Code jemaat satu per satu secara kontinyu tanpa interupsi atau menginput manual jika jemaat tidak membawa ponsel.
3. Setiap scan masuk ke **daftar kehadiran draft** (local + backend draft) dengan status `is_finalized = false`. Selama event berstatus `active`, data presensi masih **editable** (bisa dihapus/dikoreksi jika salah scan), dan **poin jemaat belum bertambah**.
4. Organizer/Admin **menutup acara** (`active` → `closed`) → seluruh kehadiran difinalisasi, poin kehadiran dikreditkan secara batch ke saldo jemaat (`UserStats.points`), mutasi transaksi dicatat, dan streak mingguan jemaat diperbarui.
5. Gamifikasi badge/level telah **dieliminasi total** dari sistem Sekkha.

Desain ini menjamin:
- **Kecepatan scan** — zero latency scan di lokasi tanpa delay per-user.
- **Koreksi Aman (Zero-Rollback)** — salah scan dapat langsung dihapus saat event `active` tanpa perlu rollback transaksi poin.
- **Integritas Data** — poin hanya didistribusikan saat kegiatan resmi ditutup (`closed`).

---

## 2. Hak Akses

| Aksi | `admin` | `organizer` | `activist` | `member` |
| --- | :---: | :---: | :---: | :---: |
| Buka Sesi Absensi (`scheduled` → `active`) | v | v | x | x |
| Scan QR Code via kamera (`/events/:id/scan`) | v | v | x | x |
| Input absensi manual | v | v | x | x |
| Hapus / Koreksi presensi draft | v | v | x | x |
| Tutup Sesi & Finalisasi Poin (`closed`) | v | v | x | x |
| Batalkan Event (`cancel`) | v | v | x | x |
| Lihat QR Code Sendiri (`/profile/qr`) | v | v | v | v |
| Lihat & Ekspor rekap kehadiran | v | v | x | x |

> **Catatan Ketat**: Role `activist` **TIDAK MEMILIKI AKSES** ke fitur absensi. Seluruh proses scan, koreksi draft, dan penutupan sesi dilakukan eksklusif oleh `organizer` atau `admin`.

---

## 3. Status Event & Lifecycle Absensi

### 3.1. Status Event

| Status | Deskripsi | Absensi Tersedia? | Poin Terdistribusi? |
| --- | --- | :---: | :---: |
| `scheduled` | Event terkonfirmasi & terjadwal | Tidak | Tidak |
| `active` | Event sedang berlangsung — sesi absensi dibuka | **Ya (Draft)** | Belum (Pending) |
| `closed` | Event selesai — sesi ditutup & poin difinalisasi | Tidak | **Ya (Final)** |
| `cancel` | Event dibatalkan | Tidak | Tidak |

### 3.2. Transisi Status oleh Organizer / Admin

```
       [Buat Event Baru (event_date >= current date)]
                           │
                           ▼
                    ┌──────────────┐   [Reschedule Event]   ┌──────────────┐
                    │  scheduled   │ ◄───────────────────── │    cancel    │
                    └──────┬───────┘   (Input tanggal baru) └──────────────┘
                           │                                       ▲
                 ┌─────────┴─────────┐                             │
                 │ [Mulai Acara]     │ [Batalkan Acara]            │
                 ▼                   ▼                             │
            ┌──────────────┐   ┌──────────────┐                    │
            │    active    │   │    cancel    │                    │
            └──────┬───────┘   └──────────────┘                    │
                   │                                               │
                   │ [Tutup Sesi &                                 │ [Batalkan Acara]
                   │  Kreditkan Poin]                              │
                   ▼                                               │
            ┌──────────────┐                                       │
            │    closed    │───────────────────────────────────────┘ (Jika belum ada transaksi poin)
            └──────────────┘
```

> **Aturan**:
> 1. Pengurus tidak bisa langsung menutup event tanpa mengaktifkan absensi terlebih dahulu (`active`). Tombol "Tutup Sesi & Kreditkan Poin" hanya tersedia saat status `active`.
> 2. Event yang berstatus `cancel` dapat dijadwalkan ulang (**Reschedule**) kembali menjadi `scheduled` dengan memasukkan tanggal baru (`event_date >= current date`). Sesi absensi tidak dapat dibuka pada event berstatus `cancel`.
> 3. Tombol **"Mulai Acara" (Start Event)** untuk mengubah status ke `active` hanya dapat dieksekusi jika waktu pelaksanaan kegiatan sudah tiba (**`event_date <= current date`**). Sesi presensi tidak dapat diaktifkan sebelum waktu jadwal kegiatan.

---

## 4. Konsep: QR Code Identitas Jemaat (Dikelola Modul Users)

### 4.1. Deskripsi

QR Code kehadiran adalah **representasi visual statis dan permanen dari `userNumber`** anggota (10 digit numerik `yyyymmddnn`). Halaman kartu anggota dan penerbitan QR dikelola secara terpusat oleh modul **Users** (`/profile/qr` atau modal profil jemaat).

### 4.2. Karakteristik QR Code

| Aspek | Detail |
| --- | --- |
| Konten Encode | String statis nomor anggota: `userNumber` (misal: `"2026102301"`) |
| Masa Berlaku | **Permanen / Statis** (tidak ada kedaluwarsa 24 jam / tanpa rolling token) |
| Format | Gambar QR 2D yang dapat di-scan oleh kamera scanner panitia |
| Ketahanan Offline | Dapat dicetak pada kartu fisik/lanyard atau disimpan di galeri smartphone tanpa butuh koneksi internet jemaat |
| Dual-Mode Scan | Scanner kamera membaca string `userNumber`. Jika kamera bermasalah, panitia cukup mengetikkan `userNumber` yang sama di kolom input manual. |

---

## 5. Arsitektur Presensi Draft & Recovery Otomatis

### 5.1. Mekanisme Draft Langsung di Database (`is_finalized: false`)

Untuk menghindari kompleksitas sinkronisasi IndexedDB lokal vs tabel pending terpisah, sistem menggunakan pendekatan terpadu yang jauh lebih bersih, aman, dan zero-rollback:

1. **Penyimpanan Langsung**:
   Setiap scan QR yang berhasil langsung disimpan ke tabel `attendances` dengan atribut:
   ```prisma
   isFinalized = false
   ```
2. **Saldo Poin Belum Berubah**:
   Karena `isFinalized = false`, mutasi saldo poin di `user_stats` **belum dieksekusi**. Jemaat belum menerima poin.
3. **Editable & Safe Correction**:
   Di layar scanner dan rekap kehadiran, setiap nama jemaat yang baru saja di-scan memiliki tombol hapus. Jika panitia salah memindai jemaat, panitia cukup menghapus baris tersebut tanpa repot melakukan rollback transaksi keuangan poin.
4. **Alur Recovery Instan (Anti Data-Loss)**:
   Karena data langsung tersimpan di PostgreSQL:
   - Jika baterai smartphone panitia habis, browser tertutup tidak sengaja, atau panitia berganti perangkat, data scan **tidak akan pernah hilang**.
   - Saat panitia membuka kembali halaman `/events/:id/attendances` atau scanner `/events/:id/scan`, sistem langsung mengambil data kehadiran draft (`GET /api/events/:id/attendances`) dan menampilkan seluruh daftar peserta yang sudah di-scan sebelumnya. Panitia dapat langsung melanjutkan scan tanpa jeda.

### 5.2. Arsitektur Scanning Berkelanjutan & Mitigasi Race Condition

Sistem **TIDAK menggunakan SSE (Server-Sent Events) atau WebSocket** untuk transmisi scan absensi panitia. SSE hanya menambah kompleksitas koneksi persisten yang rentan putus-nyambung pada jaringan seluler di lapangan dan tidak memecahkan masalah race condition (karena mutasi presensi adalah aksi tulis / *write action*).

Sebagai gantinya, sistem menerapkan kombinasi **Frontend In-Flight Lock + Cooldown Buffer** dipadukan dengan **PostgreSQL Database Unique Constraint** untuk menjamin *zero race condition* dan kecepatan scan maksimal:

```
[Kamera Aktif (Continuous 30-60 FPS Video Stream)]
                     │
         Deteksi Frame: userNumber
                     │
    Apakah sama dengan barcode terakhir & < 3000ms?
         ├── YA  ──► [ABAIKAN] (Zero Network Overhead)
         └── TIDAK
                     │
    Kunci State UI: `isProcessing = true` (In-Flight Mutex)
                     │
    Kirim HTTP POST /api/events/:id/attendances { user_number, method: "qr" }
                     │
         ┌───────────┴─────────────────────────────┐
         ▼                                         ▼
   [201 Created (Sukses)]                   [409 Conflict (Sudah Hadir)]
   • Play audio beep sukses                • Play audio buzz peringatan
   • Prepend nama jemaat ke daftar draft   • Tampilkan notifikasi "Sudah Hadir"
   • Reset recent scan buffer              • Catat di recent scan buffer
         └───────────┬─────────────────────────────┘
                     │
    Buka Kunci State: `isProcessing = false`
    (Kamera langsung siap mendeteksi jemaat berikutnya dalam < 300ms)
```

#### Komponen Penjamin Konsistensi & Kecepatan:

1. **Frontend Level: In-Flight Mutex & Rapid Scan Cooldown (3 Detik)**:
   - **In-Flight Lock**: Saat satu frame barcode sedang dikirim melalui HTTP POST, event scanner lain ditahan sementara (`isProcessing = true`).
   - **Cooldown Set (Deduplication Buffer)**: Menyimpan `lastScannedUserNumber` dan timestamp-nya. Jika kamera membaca kartu anggota yang sama dalam kurun waktu $\le 3$ detik, event tersebut langsung diabaikan di sisi browser tanpa mengirim request ke server.

2. **Database Level: PostgreSQL Compound Unique Constraint (`[user_id, event_id]`)**:
   - Di `prisma/schema.prisma`:
     ```prisma
     @@unique([userId, eventId])
     ```
   - **Jaminan Konsistensi 100%**: Jika terdapat multi-gate / beberapa panitia berbeda yang memindai QR kartu anggota yang sama pada milidetik yang identik:
     - Request pertama sukses tersimpan (`201 Created`).
     - Request kedua ditolak langsung oleh PostgreSQL Engine dengan kode pelanggaran unik `P2002` $\rightarrow$ Server menangkap exception dan mengembalikan respon bersih `409 Conflict: "Peserta sudah tercatat hadir"`.
   - **Idempotency**: Operasi presensi bersifat idempoten; tidak akan pernah terjadi data ganda (*duplicate attendance*) dalam kondisi konkurensi sepadat apa pun.

---

## 6. Alur Lengkap: Presensi Event

### 6.1. Fase 1 — Mulai Acara (Aktivasi Sesi Presensi)

```
Organizer/Admin di halaman detail event (/events/:id)
          │
          │ Klik Action Button "Start Event" (hanya jika event_date <= current date)
          ▼
PATCH /api/events/:id/status { "status": "active" }
          │
Backend:
  └── UPDATE events SET status = 'active', updated_at = now() WHERE id = :id
          │
Response 200: { status: "success", code: 200, message: "Event started...", data: { id, status: "active" } }
          │
Frontend:
  └── Tombol "Buka Scanner Presensi" aktif → Arahkan ke /events/:id/scan
```

### 6.2. Fase 2 — Scanning Berkelanjutan (Zero Race Condition)

```
Halaman scanner terbuka di /events/:id/scan (kamera aktif)
          │
┌───────────────────────────────────────────────────────────────┐
│                       SCAN LOOP                               │
│                                                               │
│  Kamera mendeteksi QR Code Kartu Anggota (isi: userNumber)    │
│        │                                                      │
│  [Cek Cooldown Buffer 3000ms]                                 │
│  ├── userNumber sama & < 3 detik? → ABAIKAN (Skip frame)      │
│  └── Baru → Lanjut                                            │
│        │                                                      │
│  Lock State UI: isProcessing = true (In-Flight Mutex)         │
│        │                                                      │
│  POST /api/events/:id/attendances { user_number, method }     │
│        │                                                      │
│  Backend validasi:                                            │
│  ├── Event berstatus 'active'?                                │
│  ├── userNumber terdaftar di database?                        │
│  ├── Belum pernah tercatat hadir (@@unique([userId, eventId]))│
│  └── Evaluasi waktu scan vs (event_date + max_late_minutes)   │
│        │                                                      │
│  ┌─────┴────────────────────────────────────────┐             │
│  ▼                                              ▼             │
│  Response 201 Created:                          Response 409: │
│  {                                              {             │
│    status: "success",                             code: 409,  │
│    code: 201,                                     message:    │
│    data: {                                          "Sudah    │
│      attendance_id,                                  tercatat │
│      user_id,                                        hadir"   │
│      name,                                      }             │
│      user_number,                                             │
│      is_late,                                                 │
│      is_finalized: false                                      │
│    }                                                          │
│  }                                                            │
│        │                                                      │
│  Frontend:                                                    │
│  ├── Play audio beep sukses / buzz jika 409                   │
│  ├── Tambah nama ke daftar UI draft (prepend)                 │
│  └── isProcessing = false → Kamera langsung siap scan jemaat  │
│      berikutnya dalam < 300ms!                                │
└───────────────────────────────────────────────────────────────┘
```

### 6.3. Fase 3 — Tutup Acara & Finalisasi Poin

```
Organizer/Admin klik Action Button "Close & Finalize Event"
          │
Dialog konfirmasi:
"Tutup acara dan distribusikan poin ke seluruh peserta hadir?"
          │
PATCH /api/events/:id/status { "status": "closed" }
          │
Backend (dalam 1 Transaksi Database Prisma $transaction):
  ├── UPDATE events SET status = 'closed', updated_at = now() WHERE id = :id
  ├── UPDATE attendances SET is_finalized = true WHERE event_id = :id
  ├── Untuk setiap Attendance:
  │     ├── Tambah (points_earned + badge_bonus_points) ke user_stats.points
  │     └── INSERT PointTransaction
  └── Perbarui streak mingguan jemaat
          │
EventBus: publish("event.closed", {
  eventId,
  totalAttendees,
  pointsDistributed: true
})
          │
Response 200: { status: "success", code: 200, message: "Event closed...", data: { status: "closed" } }
          │
Frontend:
  └── Redirect ke /events/:id/attendances (Rekap Kehadiran Terkunci)
```

---

## 7. Sistem Distribusi Poin (Batch Finalization)

Poin dihitung dan dikreditkan **satu kali saat status event diubah menjadi `closed`** — bukan saat scan berlangsung — untuk menjamin data presensi bersih dari kekeliruan scan dan menjaga konsistensi transaksi database.

### 7.1. Aturan Poin Kehadiran

| Jenis | Field | Keterangan |
| --- | --- | --- |
| **Poin Kehadiran** | `event.point_reward` | Ditambahkan ke saldo `user_stats.points` saat status event menjadi `closed` |
| **Potongan Terlambat** | `event.late_penalty_points` | Mengurangi perolehan poin kehadiran jika scan melewati `max_late_minutes` |
| **Bonus Badge Activity** | `badge_bonus_points` | Poin tambahan jika jemaat bertugas pelayanan (MC, Puja Leader, Musician) |
| **Streak Mingguan** | `user_stats.current_streak` | Dihitung otomatis per minggu kalender saat finalisasi event |
| **Mutasi Transaksi** | `PointTransaction` | Tercatat resmi dengan referensi `eventId` dan label kegiatan |

> **Catatan Sistem**: Fitur badge reward dan level akun telah **dieliminasi total** dari Sekkha Apps.

---

## 8. UI: Halaman Detail Event (Action Buttons)

Pada halaman `/events/:id` untuk organizer dan admin, tombol aksi berubah secara kontekstual sesuai status:

| Status Event | Action Button yang Ditampilkan |
| --- | --- |
| `scheduled` | **"Start Event"** (hanya jika `event_date <= current date`) dan **"Cancel Event"** |
| `active` | **"Buka Scanner Presensi"** (`/events/:id/scan`), **"Lihat Rekap Kehadiran"**, **"Close & Finalize Event"** (kreditkan poin), dan **"Cancel Event"** |
| `closed` | **"Lihat Rekap Kehadiran"** (status final, read-only) |
| `cancel` | **"Reschedule Event"** (membuka modal input tanggal baru `event_date >= current date` untuk kembali ke `scheduled`) |

---

## 9. UI: Halaman Scanner (`/events/:id/scan`)

### 9.1. Layout

```
┌─────────────────────────────────────┐
│  ←  Kebaktian Remaja                │
│  🔴 SESI ABSENSI AKTIF              │
├─────────────────────────────────────┤
│                                     │
│     [ LIVE CAMERA VIEW ]            │
│   ┌──────────────────┐              │
│   │   [ SCAN FRAME ] │              │
│   └──────────────────┘              │
│                                     │
├─────────────────────────────────────┤
│  38 Jemaat Tercatat                 │
│  ─────────────────────────────────  │
│  • Hendra Santoso (202610230001)    │
│  • Lina Wijaya    (202610230002)    │
│  • Budi Raharjo   (202610230003)    │
│         [ scroll list ]             │
├─────────────────────────────────────┤
│  [ + Absensi Manual (userNumber) ]  │
│  [   Tutup & Finalisasi Poin     ]  │
└─────────────────────────────────────┘
```

### 9.2. State Feedback Scan

| Kondisi | Tampilan Feedback |
| --- | --- |
| Scan baru berhasil | ✅ Beep + Toast hijau: *"Hendra Santoso tercatat hadir"* |
| Jemaat terlambat | ⚠️ Beep + Toast oranye: *"Hendra Santoso tercatat (Terlambat -15 Pts)"* |
| User sudah tercatat sebelumnya | ⚠️ Buzz + Toast kuning: *"Peserta sudah tercatat hadir"* (HTTP 409) |
| Nomor anggota tidak valid | ❌ Buzz + Toast merah: *"Nomor anggota tidak ditemukan"* (HTTP 404) |

---

## 10. UI: Modal Absensi Manual (Fallback)

* Input pencarian berdasarkan **`userNumber`** (nomor anggota) atau Nama jemaat.
* Tampilan hasil: Nama Jemaat, Nomor Anggota (`userNumber`), Role, Asal Sekolah.
* Tombol **"Catat Hadir"** $\rightarrow$ Menembak endpoint presensi manual `POST /api/events/:id/attendances` dengan `method: "manual"`.

---

## 11. UI: Rekap Kehadiran (`/events/:id/attendances`)

* **Summary Card**: Total Kehadiran (`total_attended`), Status Finalisasi (`is_finalized: false / true`). *(Tidak ada data photo_url, total RSVP, atau attendance rate).*
* **Tabel Presensi**:
  * Kolom: Nomor Anggota (`userNumber`), Nama Jemaat, Role, Sekolah, Waktu Scan, Metode (`qr` / `manual`), Badge Aktivitas, Status Terlambat, Aksi (Hapus presensi draft jika event masih `active`).
* Akses: `organizer` dan `admin` only (`activist` dan `member` dilarang).

---

## 12. Spesifikasi API Contract

Semua endpoint menggunakan format envelope numerik standar Sekkha Apps:
```json
{
  "status": "success" | "error",
  "code": 200,
  "message": "Pesan deskriptif",
  "data": {}
}
```

### 12.1. Ubah Status Event (Start, Close, Cancel, Reschedule)
#### `PATCH /api/events/:id/status`
- **Akses**: `organizer`, `admin`
- **Request Body (Start Event)**:
  ```json
  {
    "status": "active"
  }
  ```
- **Response 200 OK**:
  ```json
  {
    "status": "success",
    "code": 200,
    "message": "Event started successfully and attendance session is now active",
    "data": {
      "id": "evt_abc123",
      "status": "active"
    }
  }
  ```
- **Error 400 Bad Request (Start Prematur)**:
  ```json
  {
    "status": "error",
    "code": 400,
    "message": "Event cannot be started before its scheduled date and time"
  }
  ```
- **Request Body (Reschedule Event dari `cancel` ke `scheduled`)**:
  ```json
  {
    "status": "scheduled",
    "event_date": "2026-11-01T09:00:00.000Z"
  }
  ```
- **Response 200 OK (Reschedule)**:
  ```json
  {
    "status": "success",
    "code": 200,
    "message": "Event rescheduled successfully",
    "data": {
      "id": "evt_abc123",
      "status": "scheduled",
      "event_date": "2026-11-01T09:00:00.000Z"
    }
  }
  ```

---

### 12.2. Catat Presensi (QR Scanner / Manual)
#### `POST /api/events/:id/attendances`
- **Akses**: `organizer`, `admin` (`requireRole("organizer", "admin")`)
- **Request Body (Scan QR)**:
  ```json
  {
    "user_number": "202610230001",
    "method": "qr"
  }
  ```
- **Response 201 Created**:
  ```json
  {
    "status": "success",
    "code": 201,
    "message": "Attendance drafted successfully",
    "data": {
      "attendance_id": "att_001",
      "user_id": "usr_9b1deb4d",
      "name": "Hendra Santoso",
      "user_number": "202610230001",
      "is_late": false,
      "late_penalty_applied": 0,
      "points_earned": 50,
      "is_finalized": false,
      "scanned_at": "2026-10-25T09:15:00.000Z"
    }
  }
  ```
- **Error 409 Conflict (Sudah Hadir)**:
  ```json
  {
    "status": "error",
    "code": 409,
    "message": "Peserta sudah tercatat hadir"
  }
  ```
- **Error 404 Not Found (Nomor Anggota Tidak Ditemukan)**:
  ```json
  {
    "status": "error",
    "code": 404,
    "message": "User with specified user number not found"
  }
  ```

---

### 12.3. Rekap Kehadiran Event
#### `GET /api/events/:id/attendances`
- **Akses**: `organizer`, `admin`
- **Response 200 OK**:
  ```json
  {
    "status": "success",
    "code": 200,
    "message": "Daftar kehadiran berhasil diambil",
    "data": {
      "event_id": "evt_abc123",
      "total_attended": 38,
      "is_finalized": false,
      "attendances": [
        {
          "attendance_id": "att_001",
          "user_id": "usr_9b1deb4d",
          "name": "Hendra Santoso",
          "user_number": "202610230001",
          "role": "member",
          "school": "SMA Negeri 1 Jakarta",
          "method": "qr",
          "is_late": false,
          "badge_activity": "MC",
          "scanned_at": "2026-10-25T09:15:00.000Z"
        }
      ]
    }
  }
  ```

---

### 12.4. Hapus / Koreksi Kehadiran Draft
#### `DELETE /api/events/:id/attendances/:userId`
- **Akses**: `organizer`, `admin`
- **Aturan**: Hanya bisa dilakukan saat status event belum `closed`.
- **Response 200 OK**:
  ```json
  {
    "status": "success",
    "code": 200,
    "message": "Presensi peserta berhasil dibatalkan",
    "data": {
      "user_id": "usr_9b1deb4d"
    }
  }
  ```

---

## 13. Database Schema (Prisma)

Mengikuti schema konsisten di PostgreSQL:

```prisma
model Attendance {
  id                 String           @id @default(cuid())
  userId             String           @map("user_id")
  eventId            String           @map("event_id")
  method             AttendanceMethod @default(qr)
  pointsEarned       Int              @default(50) @map("points_earned")
  isLate             Boolean          @default(false) @map("is_late")
  latePenaltyApplied Int              @default(0) @map("late_penalty_applied")
  badgeActivityId    String?          @map("badge_activity_id")
  badgeBonusPoints   Int              @default(0) @map("badge_bonus_points")
  isFinalized        Boolean          @default(false) @map("is_finalized")
  scannedAt          DateTime         @default(now) @map("scanned_at")

  user          User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  event         Event          @relation(fields: [eventId], references: [id], onDelete: Cascade)
  badgeActivity BadgeActivity? @relation(fields: [badgeActivityId], references: [id], onDelete: SetNull)

  @@unique([userId, eventId])
  @@index([eventId, scannedAt])
  @@index([scannedAt])
  @@index([userId, scannedAt(sort: Desc)])
  @@map("attendances")
}
```

---

## 14. Domain Events (EventBus Integration)

| Event | Publisher | Subscriber | Payload | Efek Samping |
| --- | --- | --- | --- | --- |
| `event.closed` | Events module | Users/Stats module | `{ eventId, pointReward, attendeeUserIds: string[] }` | Menandai `isFinalized = true` pada seluruh `Attendance`, menambah saldo poin di `UserStats`, membuat catatan `PointTransaction`, memperbarui streak mingguan jemaat, dan menginvalidasi cache leaderboard/profil. |

---

## 15. Acceptance Criteria

| ID | Skenario | Hasil yang Diharapkan |
| --- | --- | --- |
| **AC-ATT-01** | Organizer klik "Start Event" saat jadwal sudah tiba (`event_date <= current date`) | Status event berubah menjadi `active` via `PATCH /api/events/:id/status` (code `200`). Scanner presensi terbuka. |
| **AC-ATT-02** | Organizer mencoba klik "Start Event" sebelum tanggal/jam event | Backend menolak dengan `400 Bad Request` dan pesan "Event cannot be started before its scheduled date and time". |
| **AC-ATT-03** | `activist` mencoba membuka `/events/:id/scan` atau POST absensi | Backend menolak dengan `403 Forbidden`. Akses scanner eksklusif untuk `organizer` dan `admin`. |
| **AC-ATT-04** | Panitia memindai QR Code kartu anggota jemaat (`userNumber`) | Data masuk ke presensi draft (`is_finalized: false`), respon `201 Created` dengan code angka `201`, audio beep aktif, kamera auto-resume. |
| **AC-ATT-05** | Panitia memindai jemaat yang sama dua kali atau multi-gate scan berbarengan | Backend merespon `409 Conflict` (code `409`) dengan pesan "Peserta sudah tercatat hadir" berkat constraint `@@unique([userId, eventId])`. Data tidak ganda. |
| **AC-ATT-06** | Jemaat di-scan melewati batas toleransi `max_late_minutes` | Sistem otomatis mencatat `is_late: true` dan mengurangi perolehan poin sesuai `late_penalty_applied`. |
| **AC-ATT-07** | Panitia menghapus entri salah scan saat event masih `active` | Data draft terhapus via `DELETE /api/events/:id/attendances/:userId` tanpa perlu rollback saldo poin (karena poin belum terdistribusi). |
| **AC-ATT-08** | Organizer klik "Close & Finalize Event" | Status event berubah menjadi `closed` (code `200`), seluruh presensi ditandai `is_finalized = true`, poin dikreditkan serentak dalam 1 transaksi DB. |
| **AC-ATT-09** | Organizer membuka Rekap Kehadiran (`/events/:id/attendances`) | Menampilkan `total_attended`, status finalisasi, dan daftar peserta dengan nomor anggota, sekolah, dan waktu scan (tanpa photo_url, tanpa RSVP, tanpa attendance rate). |
| **AC-ATT-10** | Organizer melakukan "Reschedule Event" pada event `cancel` | Menentukan tanggal baru (`event_date >= current date`), status berubah kembali menjadi `scheduled` (code `200`). |

