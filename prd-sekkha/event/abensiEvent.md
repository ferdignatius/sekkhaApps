# PRD: Logika Absensi Event — Sekkha Apps

| Metadata | Detail |
| --- | --- |
| **Dokumen** | Product Requirement Document (PRD) |
| **Fitur** | Absensi Event (Sesi Scan QR, Batch Commit, Reward) |
| **Aplikasi** | Sekkha Apps (Frontend & Backend) |
| **Versi** | 2.0.0 |
| **Status** | Draft / Ready for Review |
| **Referensi** | `prd-sekkha/event/event.md`, `prd-sekkha/masterdata/badgePresensiEvent.md` |

---

## 1. Ringkasan Eksekutif

Sistem absensi event adalah mekanisme pencatatan kehadiran peserta yang berjalan dalam sebuah **sesi absensi** yang dibuka dan ditutup oleh **pengurus**.

Alur utama:
1. Pengurus **mengaktifkan absensi** pada event → sesi absensi dimulai.
2. Pengurus scan QR Code umat satu per satu secara kontinyu tanpa interupsi.
3. Setiap scan masuk ke **daftar sementara** (local + backend draft) — belum tersimpan ke database final.
4. Pengurus **menutup sesi** → semua data kehadiran di-commit ke database, reward (poin + badge) dihitung dan diberikan sekaligus.

Desain ini menjamin:
- **Kecepatan scan** — tidak ada delay per-user karena tidak ada DB write per scan.
- **Keamanan data** — data tersimpan di dua lapisan (IndexedDB frontend + tabel `AttendancePending` backend) sehingga aman meski terjadi crash.

---

## 2. Hak Akses

| Aksi | `admin` | `pengurus` | `aktivis` | `umat` |
| --- | :---: | :---: | :---: | :---: |
| Aktifkan sesi absensi event | v | v | x | x |
| Scan QR Code via kamera | v | v | x | x |
| Input absensi manual | v | v | x | x |
| Tutup sesi & commit data | v | v | x | x |
| Lihat QR Code Sendiri (`/profile/qr`) | v | v | v | v |
| Lihat rekap kehadiran event | v | v | x | x |

> **Catatan**: `aktivis` **tidak lagi memiliki akses** ke fitur absensi. Seluruh proses scan dan pengelolaan sesi dilakukan oleh `pengurus` atau `admin`.

---

## 3. Status Event & Lifecycle Absensi

### 3.1. Status Event

| Status | Deskripsi | Absensi Tersedia? |
| --- | --- | :---: |
| `planning` | Rencana kegiatan, belum terkonfirmasi | Tidak |
| `upcoming` | Event terkonfirmasi & terjadwal | Tidak |
| `ongoing` | Event sedang berlangsung — sesi absensi aktif | **Ya** |
| `completed` | Event selesai — sesi absensi ditutup & data di-commit | Tidak |
| `cancelled` | Event dibatalkan | Tidak |

### 3.2. Transisi Status oleh Pengurus

```
upcoming
    |
    | [Pengurus klik "Aktifkan Absensi"]
    ↓
ongoing  ←── AttendanceSession dibuat (status: active)
    |
    | [Scan QR berlangsung, data masuk ke PendingScan]
    |
    | [Pengurus klik "Tutup Absensi & Selesaikan Event"]
    ↓
completed ←── AttendancePending di-flush ke Attendance + reward dihitung
```

> **Aturan**: Pengurus tidak bisa langsung menutup event tanpa mengaktifkan absensi terlebih dahulu. Tombol "Tutup Sesi" hanya tersedia setelah sesi absensi diaktifkan.

---

## 4. Konsep: QR Code User

### 4.1. Deskripsi

Setiap user memiliki **QR Code unik personal** yang digunakan sebagai identitas kehadiran. Di-encode dari `user_id` + tanda tangan kriptografis (HMAC-SHA256) untuk mencegah pemalsuan.

### 4.2. Karakteristik QR Code

| Aspek | Detail |
| --- | --- |
| Konten encode | `{ user_id, issued_at }` + HMAC signature |
| Masa berlaku token | 24 jam (rolling — di-refresh setiap kali halaman QR dibuka) |
| Format | Signed string yang di-render menjadi QR image |
| Tampilan di profil | QR image besar + nama user + foto profil |
| Lokasi akses | `/profile/qr` — semua role |

### 4.3. Keamanan QR

1. Token tidak mengandung data sensitif selain `user_id` dan `issued_at`.
2. Signature diverifikasi di backend dengan server secret yang tidak pernah dikirim ke client.
3. Token expired → backend return `401 EXPIRED_QR_TOKEN`.
4. `attended_at` dicatat berdasarkan **server time**, bukan dari konten token.

---

## 5. Arsitektur Penyimpanan Data Sementara (Dual-Layer Safety)

### 5.1. Mengapa Dual-Layer?

Karena pengurus menscan puluhan umat tanpa commit ke DB, diperlukan mekanisme safety agar data tidak hilang jika:
- Baterai HP habis / aplikasi crash
- Koneksi internet putus di tengah sesi
- Browser ditutup tidak sengaja

### 5.2. Layer 1 — IndexedDB (Frontend)

| Aspek | Detail |
| --- | --- |
| Teknologi | Browser IndexedDB (persisten, tidak hilang saat refresh) |
| Kapan ditulis | Segera setelah QR berhasil terbaca dan tervalidasi |
| Isi | `{ sessionId, userId, userName, userPhoto, scannedAt }` |
| Kapan dihapus | Setelah commit berhasil (backend confirm `completed`) |
| Keunggulan | Zero-latency — tidak perlu tunggu network |

### 5.3. Layer 2 — Tabel `AttendancePending` (Backend)

| Aspek | Detail |
| --- | --- |
| Teknologi | PostgreSQL via Prisma |
| Kapan ditulis | Setiap scan QR berhasil divalidasi (async, fire-and-forget dari frontend) |
| Isi | `{ session_id, user_id, scanned_at }` |
| Kapan dihapus | Setelah commit berhasil → record dipindah ke `Attendance`, `AttendancePending` dihapus |
| Keunggulan | Data aman meski HP pengurus mati total — bisa di-recover dari backend |

### 5.4. Alur Recovery

Jika pengurus kehilangan data lokal (IndexedDB kosong) karena crash atau ganti device:

```
Pengurus buka kembali halaman event yang masih 'ongoing'
      |
Frontend: cek IndexedDB → kosong
      |
Frontend: GET /v1/events/:id/attendance-session/pending
      |
Backend: kembalikan semua AttendancePending milik sesi aktif
      |
Frontend: populate ulang daftar scan dari data backend
      |
Pengurus bisa lanjut scan atau langsung commit
```

---

## 6. Alur Lengkap: Sesi Absensi

### 6.1. Fase 1 — Aktivasi Sesi

```
Pengurus di halaman detail event (status: 'upcoming')
          |
Klik tombol "Aktifkan Absensi"
          |
Konfirmasi dialog: "Event akan ditandai sebagai Berlangsung.
                    Sesi absensi akan dibuka. Lanjutkan?"
          |
POST /v1/events/:id/attendance-session/open
          |
Backend:
  ├── Update event.status = 'ongoing'
  └── INSERT AttendanceSession { event_id, opened_at, status: 'active' }
          |
Response: { session_id, event_id }
          |
Frontend:
  ├── Simpan session_id ke IndexedDB
  └── Redirect ke /events/:id/scan
```

### 6.2. Fase 2 — Scanning Berkelanjutan

```
Halaman scanner terbuka (kamera aktif)
          |
┌─────────────────────────────────────┐
│           SCAN LOOP                 │
│                                     │
│  Kamera deteksi QR Code             │
│        |                            │
│  [debounce 500ms]                   │
│        |                            │
│  Decode QR → qr_token               │
│        |                            │
│  Validasi lokal (IndexedDB):        │
│  ├── User sudah di list? → Skip     │
│  └── Belum → lanjut                 │
│        |                            │
│  POST /v1/events/:id/attendance-    │
│       session/scan { qr_token }     │
│        |                            │
│  Backend validasi:                  │
│  ├── Token valid? (HMAC check)      │
│  ├── Token belum expired?           │
│  └── User belum di session ini?     │
│        |                            │
│  Response: user data                │
│        |                            │
│  Frontend:                          │
│  ├── Tambah ke IndexedDB            │
│  └── Tambah ke daftar UI (prepend)  │
│        |                            │
│  Kamera langsung aktif lagi         │
│  (auto-resume, tanpa interupsi)     │
└─────────────────────────────────────┘
```

### 6.3. Fase 3 — Commit & Tutup Sesi

```
Pengurus klik "Tutup Absensi & Selesaikan Event"
          |
Dialog konfirmasi:
"X orang tercatat hadir. Tutup sesi dan kirim data?"
          |
POST /v1/events/:id/attendance-session/commit
          |
Backend (dalam 1 transaksi DB):
  ├── Ambil semua AttendancePending (session_id)
  ├── Bulk INSERT ke Attendance (method, attended_at)
  ├── Untuk setiap Attendance:
  │     ├── Tambah event.point_reward ke user.total_points
  │     └── INSERT UserBadge jika event.badge_id ada & belum dimiliki
  ├── Update AttendanceSession.status = 'completed'
  ├── Update event.status = 'completed'
  └── Hapus semua AttendancePending sesi ini
          |
EventBus: publish("attendance.batch_recorded", {
  event_id,
  attendances: [{ user_id, point_reward, badge_id }]
})
          |
Frontend:
  ├── Hapus IndexedDB sesi ini
  └── Redirect ke /events/:id/attendances (rekap)
```

---

## 7. Sistem Reward (Batch)

Reward dihitung **satu kali setelah commit** — bukan per scan — untuk menjaga performa dan konsistensi transaksi.

### 7.1. Sumber Reward

| Jenis | Field | Keterangan |
| --- | --- | --- |
| **Poin Kehadiran** | `event.point_reward` | Ditambahkan ke `user.total_points` setelah commit |
| **Badge Presensi** | `event.badge_id` | Di-unlock via `UserBadge`, dilindungi unique constraint |

### 7.2. Logika Commit Reward (per user, dalam transaksi)

```
Untuk setiap user di AttendancePending:

  1. INSERT Attendance { event_id, user_id, method, attended_at }

  2. Jika event.point_reward > 0:
       UPDATE User SET total_points += point_reward

  3. Jika event.badge_id NOT NULL:
       Cek UserBadge (user_id, badge_id)
       ├── Belum ada → INSERT UserBadge + UPDATE User.total_points += badge.point_value
       └── Sudah ada → Skip (tidak diduplikasi)
```

### 7.3. Gagal Sebagian (Partial Failure)

Semua operasi commit berjalan dalam **satu database transaction**. Jika ada error di tengah:
- Seluruh transaksi di-rollback
- `AttendancePending` tetap ada — pengurus bisa retry commit
- Frontend menampilkan error toast: *"Gagal menyimpan data. Data scan aman, coba tutup ulang."*

---

## 8. UI: Halaman Detail Event (Tombol Aktivasi)

Pada halaman `/events/:id` untuk pengurus, tombol absensi berubah sesuai status:

| Status Event | Tombol Tampil |
| --- | --- |
| `upcoming` | **"Aktifkan Absensi"** (hijau, prominent) |
| `ongoing` | **"Buka Scanner"** + **"Tutup & Selesaikan"** |
| `completed` | **"Lihat Rekap Kehadiran"** |

---

## 9. UI: Halaman Scanner (`/events/:id/scan`)

### 9.1. Layout

```
┌─────────────────────────────────────┐
│  ←  Kebaktian Minggu Pagi           │
│  🔴 SESI ABSENSI AKTIF              │
├─────────────────────────────────────┤
│                                     │
│     [ LIVE CAMERA VIEW ]            │
│   ┌──────────────────┐              │
│   │   [ QR FRAME ]   │              │
│   └──────────────────┘              │
│                                     │
├─────────────────────────────────────┤
│  38 Peserta Tercatat                │
│  ─────────────────────────────────  │
│  • Hendra S.    08:15               │
│  • Lina W.      08:12               │
│  • Budi R.      08:10               │
│         [ scroll ]                  │
├─────────────────────────────────────┤
│  [ + Tambah Manual ]                │
│  [   Tutup & Selesaikan Event   ]   │
└─────────────────────────────────────┘
```

### 9.2. Behavior Detail

| Komponen | Deskripsi |
| --- | --- |
| **Badge sesi aktif** | Label merah "SESI ABSENSI AKTIF" — penanda visual bahwa data belum final |
| **Live camera** | Kamera aktif terus, auto-resume setelah setiap scan |
| **Counter** | Jumlah peserta yang sudah terscan di sesi ini (dari IndexedDB) |
| **Daftar scan** | Prepend — terbaru di atas, tampilkan foto + nama + waktu scan |
| **Debounce** | 500ms setelah QR terdeteksi sebelum request dikirim |
| **Feedback scan** | Toast 2 detik: ✅ sukses / ⚠️ duplikat / ❌ token invalid |
| **Tombol "Tambah Manual"** | Buka modal search user (pengurus/admin only) |
| **Tombol "Tutup & Selesaikan"** | Trigger commit — muncul dialog konfirmasi dengan jumlah peserta |

### 9.3. State Feedback Scan

| Kondisi | Tampilan |
| --- | --- |
| Scan baru berhasil | ✅ Toast hijau: "Hendra Santoso ditambahkan" |
| User sudah terscan di sesi ini | ⚠️ Toast kuning: "Hendra Santoso sudah ada di daftar" |
| Token expired / invalid | ❌ Toast merah: "QR tidak valid atau kadaluarsa" |
| Error network (scan tidak terkirim) | 🟠 Toast oranye: "Offline — data disimpan lokal" — tetap masuk IndexedDB |

### 9.4. Mode Offline

Jika koneksi terputus saat scan:
- Data tetap disimpan di **IndexedDB**
- Sinkronisasi ke backend dilakukan secara **background** saat koneksi kembali
- Scanner tetap bisa digunakan — tidak ada blocker

---

## 10. UI: Modal Absensi Manual

* Input search nama user (autocomplete — source: RSVP list + semua user aktif)
* Tiap hasil: foto, nama, badge status ("Sudah RSVP" / "Tidak RSVP")
* Jika user sudah ada di daftar scan: tampil badge "Sudah Tercatat", tombol disabled
* Klik **"Tambahkan"** → masuk ke daftar sesi (IndexedDB + AttendancePending)
* Modal tidak menutup otomatis — pengurus bisa tambah beberapa user sekaligus

---

## 11. UI: Rekap Kehadiran (`/events/:id/attendances`)

* **Summary card**: Total Hadir, Total Tidak Hadir, Persentase Kehadiran
* **Tabel**: Foto, Nama, Waktu Hadir, Via (QR / Manual)
* **Filter tab**: Semua / Hadir / Tidak Hadir
* **Export CSV** *(future feature)*
* Akses: `pengurus` / `admin` only

---

## 12. API Contract

### 12.1. Buka Sesi Absensi

#### `POST /v1/events/:id/attendance-session/open`

**Headers:** `Authorization: Bearer <token>` (role: `pengurus` / `admin`)

**Response 201:**
```json
{
  "status": "success",
  "data": {
    "session_id": "sess_abc123",
    "event_id": "evt_xyz789",
    "opened_at": "2026-08-03T08:00:00Z",
    "status": "active"
  },
  "message": "Sesi absensi dibuka. Event ditandai sebagai Berlangsung."
}
```

**Response 409 — Sesi sudah aktif:**
```json
{
  "status": "error",
  "code": "SESSION_ALREADY_ACTIVE",
  "data": { "session_id": "sess_abc123" },
  "message": "Sesi absensi sudah aktif untuk event ini"
}
```

---

### 12.2. Scan QR (Tambah ke Pending)

#### `POST /v1/events/:id/attendance-session/scan`

**Headers:** `Authorization: Bearer <token>` (role: `pengurus` / `admin`)

**Request Body:**
```json
{
  "qr_token": "eyJhbGciOiJIUzI1NiJ9...",
  "session_id": "sess_abc123"
}
```

**Response 200 — Sukses:**
```json
{
  "status": "success",
  "data": {
    "pending_id": "pend_001",
    "session_id": "sess_abc123",
    "user": {
      "id": "usr_9b1deb4d",
      "name": "Hendra Santoso",
      "photo_url": "https://cdn.sekkha.app/photos/usr_9b1d.jpg"
    },
    "scanned_at": "2026-08-03T08:15:30Z"
  },
  "message": "Hendra Santoso ditambahkan ke daftar"
}
```

**Response 409 — Sudah di sesi:**
```json
{
  "status": "error",
  "code": "ALREADY_IN_SESSION",
  "message": "Hendra Santoso sudah ada di daftar sesi ini"
}
```

**Response 401 — Token invalid/expired:**
```json
{
  "status": "error",
  "code": "EXPIRED_QR_TOKEN",
  "message": "QR Code tidak valid atau sudah kadaluarsa"
}
```

---

### 12.3. Tambah Manual ke Pending

#### `POST /v1/events/:id/attendance-session/manual`

**Headers:** `Authorization: Bearer <token>` (role: `pengurus` / `admin`)

**Request Body:**
```json
{
  "session_id": "sess_abc123",
  "user_id": "usr_9b1deb4d"
}
```

**Response 200:**
```json
{
  "status": "success",
  "data": {
    "pending_id": "pend_002",
    "user": { "id": "usr_9b1deb4d", "name": "Hendra Santoso" },
    "method": "manual",
    "scanned_at": "2026-08-03T08:20:00Z"
  },
  "message": "Hendra Santoso ditambahkan secara manual"
}
```

---

### 12.4. Ambil Data Pending (Recovery)

#### `GET /v1/events/:id/attendance-session/pending`

**Headers:** `Authorization: Bearer <token>` (role: `pengurus` / `admin`)

**Response 200:**
```json
{
  "status": "success",
  "data": {
    "session_id": "sess_abc123",
    "event_id": "evt_xyz789",
    "status": "active",
    "opened_at": "2026-08-03T08:00:00Z",
    "pending_count": 38,
    "pending": [
      {
        "pending_id": "pend_001",
        "user": { "id": "usr_9b1deb4d", "name": "Hendra Santoso", "photo_url": "..." },
        "method": "qr",
        "scanned_at": "2026-08-03T08:15:30Z"
      }
    ]
  }
}
```

---

### 12.5. Commit & Tutup Sesi

#### `POST /v1/events/:id/attendance-session/commit`

**Headers:** `Authorization: Bearer <token>` (role: `pengurus` / `admin`)

**Request Body:**
```json
{
  "session_id": "sess_abc123"
}
```

**Response 200:**
```json
{
  "status": "success",
  "data": {
    "event_id": "evt_xyz789",
    "total_committed": 38,
    "total_points_awarded": 1900,
    "total_badges_awarded": 12,
    "committed_at": "2026-08-03T10:30:00Z"
  },
  "message": "Sesi ditutup. 38 kehadiran berhasil disimpan."
}
```

**Response 400 — Tidak ada data pending:**
```json
{
  "status": "error",
  "code": "NO_PENDING_DATA",
  "message": "Tidak ada data kehadiran yang terscan di sesi ini"
}
```

---

### 12.6. Generate QR Token User

#### `GET /v1/users/me/qr-token`

**Headers:** `Authorization: Bearer <token>`

**Response 200:**
```json
{
  "status": "success",
  "data": {
    "qr_token": "eyJhbGciOiJIUzI1NiJ9...",
    "expires_at": "2026-08-04T08:00:00Z",
    "user": {
      "id": "usr_9b1deb4d",
      "name": "Hendra Santoso",
      "photo_url": "https://cdn.sekkha.app/photos/usr_9b1d.jpg"
    }
  }
}
```

---

### 12.7. Rekap Kehadiran

#### `GET /v1/events/:id/attendances`

**Headers:** `Authorization: Bearer <token>` (role: `pengurus` / `admin`)

**Response 200:**
```json
{
  "status": "success",
  "data": {
    "event_id": "evt_xyz789",
    "total_rsvp": 42,
    "total_attended": 38,
    "total_not_attended": 4,
    "attendance_rate": 90.5,
    "attendances": [
      {
        "user": {
          "id": "usr_9b1deb4d",
          "name": "Hendra Santoso",
          "photo_url": "..."
        },
        "attended_at": "2026-08-03T08:15:30Z",
        "method": "qr"
      }
    ]
  },
  "meta": { "total_attended": 38 }
}
```

---

## 13. Database Schema (Prisma)

```prisma
model AttendanceSession {
  id         String   @id @default(cuid())
  event_id   String   @unique  // 1 sesi per event
  opened_by  String             // user_id pengurus
  opened_at  DateTime @default(now())
  closed_at  DateTime?
  status     String   @default("active")  // 'active' | 'completed'

  event    Event              @relation(fields: [event_id], references: [id])
  opener   User               @relation(fields: [opened_by], references: [id])
  pendings AttendancePending[]
}

model AttendancePending {
  id         String   @id @default(cuid())
  session_id String
  user_id    String
  method     String   @default("qr")   // 'qr' | 'manual'
  scanned_at DateTime @default(now())

  session AttendanceSession @relation(fields: [session_id], references: [id], onDelete: Cascade)
  user    User              @relation(fields: [user_id], references: [id])

  @@unique([session_id, user_id])  // tidak bisa scan user yang sama 2x dalam 1 sesi
  @@index([session_id])
}

model Attendance {
  id          String   @id @default(cuid())
  event_id    String
  user_id     String
  method      String   @default("qr")   // 'qr' | 'manual'
  attended_at DateTime

  event Event @relation(fields: [event_id], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [user_id], references: [id])

  @@unique([event_id, user_id])
  @@index([event_id])
  @@index([user_id])
}
```

---

## 14. Domain Events (EventBus Integration)

| Event | Publisher | Subscriber | Payload | Keterangan |
| --- | --- | --- | --- | --- |
| `attendance.session_opened` | Events module | — | `{ event_id, session_id }` | Event status → ongoing |
| `attendance.batch_recorded` | Events module | Dashboard/Gamification | `{ event_id, attendances: [{user_id, point_reward, badge_id}] }` | Proses reward semua peserta sekaligus |
| `event.completed` | Events module | — | `{ event_id }` | Event selesai |

### Subscriber Logic (`attendance.batch_recorded`):

```
Gamification Module menerima event
          |
Untuk setiap item di attendances[]:
  ├── point_reward > 0 → UPDATE user.total_points
  ├── badge_id NOT NULL → INSERT UserBadge (skip jika sudah ada)
  └── Cek Achievement triggers (future PRD)
```

---

## 15. Acceptance Criteria

| ID | Skenario | Hasil yang Diharapkan |
| --- | --- | --- |
| **AC-01** | Pengurus klik "Aktifkan Absensi" pada event `upcoming` | Event berubah ke `ongoing`, sesi dibuat, halaman scanner terbuka |
| **AC-02** | `aktivis` mencoba membuka `/events/:id/scan` | `403 Forbidden` — aktivis tidak punya akses |
| **AC-03** | Pengurus scan QR user yang valid | User masuk ke daftar sesi, toast ✅, kamera auto-resume |
| **AC-04** | Pengurus scan QR user yang sama dua kali | Toast ⚠️ "Sudah ada di daftar", data tidak diduplikasi |
| **AC-05** | Pengurus scan QR token expired | Toast ❌ "QR tidak valid atau kadaluarsa", tidak ada data tersimpan |
| **AC-06** | Koneksi internet putus saat scan | Data tersimpan di IndexedDB, toast oranye "Offline", sinkronisasi otomatis saat koneksi kembali |
| **AC-07** | Pengurus kehilangan data lokal (IndexedDB kosong) dan buka ulang scanner | Data pending diambil dari backend, daftar scan terpulihkan |
| **AC-08** | Pengurus tambah manual user yang belum terscan | User masuk daftar dengan `method: 'manual'` |
| **AC-09** | Pengurus klik "Tutup & Selesaikan" dengan 38 peserta | Dialog konfirmasi muncul dengan jumlah peserta |
| **AC-10** | Pengurus konfirmasi tutup sesi | Semua data di-commit dalam 1 transaksi: Attendance tersimpan, poin & badge diberikan, event → `completed` |
| **AC-11** | Terjadi error saat commit | Transaksi di-rollback, AttendancePending tetap ada, toast error dengan instruksi retry |
| **AC-12** | Commit berhasil | IndexedDB dibersihkan, redirect ke rekap kehadiran |
| **AC-13** | Pengurus buka rekap kehadiran setelah commit | Tampil total hadir, persentase, tabel peserta dengan waktu dan metode hadir |
| **AC-14** | User buka `/profile/qr` | QR Code segar ditampilkan (token baru 24 jam) |
| **AC-15** | EventBus `attendance.batch_recorded` dipublish setelah commit | Gamification module menerima dan memperbarui poin + badge semua peserta |
