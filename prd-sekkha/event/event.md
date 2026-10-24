# PRD: Event Management System — Sekkha Apps

| Metadata | Detail |
| --- | --- |
| **Dokumen** | Product Requirement Document (PRD) |
| **Fitur** | Event Management (Siklus Event, Action-Button State Transition, Presensi QR, Visibility Berbasis Role) |
| **Aplikasi** | Sekkha Apps (Frontend & Backend) |
| **Versi** | 2.0.0 |
| **Status** | Approved / Ready for Development |

---

## 1. Ringkasan Eksekutif & Tujuan

**Event Management System** adalah modul operasional inti Sekkha Apps yang memungkinkan **organizer** dan **admin** mengelola seluruh siklus kegiatan komunitas vihara (kebaktian, retreat, meditasi, pelatihan, dll.). Modul ini mendukung pengaturan visibilitas audiens berbasis peran (*role-based visibility*), pencatatan presensi di lokasi (*on-site attendance*) secara instan, serta finalisasi poin terpadu saat event ditutup.

Alur utama:
1. **Organizer / Admin** membuat event, memilih jenis kegiatan dari master data `event_types`, menentukan jadwal, lokasi, kapasitas, dan target audiens (`visibility`). Poin kehadiran otomatis terisi dari `default_point_reward` Event Type terpilih dan dapat disesuaikan.
2. **Member / Activist** (sesuai target audiens) melihat jadwal dan informasi detail event melalui kalender atau daftar acara.
3. **Transisi Status Event**: Perubahan status (`scheduled`, `active`, `closed`, `cancel`) **tidak dapat diedit melalui dropdown form**, melainkan dikendalikan secara ketat melalui **Action Buttons** pada antarmuka detail event khusus oleh `organizer` dan `admin`.
4. **Presensi di Lokasi**: Saat event berstatus `active`, hanya pengurus (`organizer` dan `admin`) yang memindai QR Code jemaat atau menginput absensi manual.
   - **Perhatian Hak Akses**: `activist` **TIDAK MEMILIKI HAK AKSES** untuk melakukan absensi (scan QR/input manual) maupun melihat rekap kehadiran. Operasional presensi eksklusif untuk `organizer` dan `admin`.
5. **Logika Finalisasi Poin**: Selama event berstatus `active`, data presensi berstatus draft (*editable*) dan **poin jemaat belum dikreditkan**. Poin kehadiran dan streak jemaat baru dikreditkan secara batch ke akun masing-masing user ketika organizer/admin mengubah status event menjadi **`closed`**. Fitur badge dan level telah **dieliminasi total** dari sistem Sekkha.

---

## 2. Definisi Role & Hak Akses

Role dalam seluruh sistem Sekkha menggunakan terminologi Bahasa Inggris resmi: `member`, `activist`, `organizer`, dan `admin`.

| Role | Lihat Event | Buat / Edit / Hapus Event | Ubah Status (Action Button) | Take Presensi QR / Manual | Lihat & Ekspor Rekap Kehadiran |
| --- | :---: | :---: | :---: | :---: | :---: |
| `member` | v (sesuai `visibility`) | x | x | x | x |
| `activist` | v (sesuai `visibility`) | x | x | x | x |
| `organizer` | v (semua visibilitas) | v | v | v | v |
| `admin` | v (semua visibilitas) | v | v | v | v |

> **Catatan Otorisasi Operasional Presensi**:
> - Seluruh endpoint operasional presensi (`POST /api/events/:id/attendances`, `GET /api/events/:id/attendances`, `DELETE /api/events/:id/attendances/:userId`, dan scanner UI `/events/:id/scan`) **dibatasi ketat hanya untuk `organizer` dan `admin`**.
> - Request dari `activist` atau `member` untuk mengambil absensi akan ditolak oleh server dengan **`403 Forbidden`**.

---

## 3. Konsep: Event Type & Status

### 3.1. Master Data Tipe Event (`event_type_id`)

Tipe event tidak lagi di-hardcode sebagai enum lokal, melainkan terintegrasi dengan modul master data `event_types` (lihat referensi `prd-sekkha/configure/masterdata/eventType.md`).

* Tabel referensi: `event_types` (`id`, `code`, `name`/`label`, `color`, `default_point_reward`, `is_active`).
* Saat `organizer` memilih jenis kegiatan di form pembuatan event:
  1. `default_point_reward` dari master data otomatis mengisi nilai default `point_reward` event.
  2. Nilai poin tersebut dapat diubah secara spesifik per event jika dibutuhkan.
  3. Label dan warna badge kategori di UI kalender/list event mengikuti konfigurasi `name` dan `color` hex dari master data.
* Event Types yang nonaktif (`is_active = false`) tidak dimunculkan dalam pilihan form event baru, namun event lama yang telah terasosiasi tetap valid.

### 3.2. Status Event (`event_status`)

Siklus hidup event diatur melalui 4 status resmi:

| Status | Label UI | Deskripsi |
| --- | --- | --- |
| `scheduled` | Scheduled (Terjadwal) | Event telah dibuat, dijadwalkan, dan terkonfirmasi. Siap dipublikasikan ke target audiens. |
| `active` | Active (Berlangsung) | Event sedang berjalan di lokasi. Scanner presensi dibuka khusus oleh organizer/admin. Data presensi berstatus draft (*editable*), **poin belum dikreditkan**. |
| `closed` | Closed (Ditutup & Final) | Event telah selesai dan ditutup resmi oleh organizer/admin. Seluruh poin kehadiran difinalisasi dan dikreditkan serentak ke akun jemaat yang hadir, streak dihitung, dan data terkunci (*immutable*). |
| `cancel` | Cancelled (Dibatalkan) | Event dibatalkan karena suatu alasan. Presensi tidak dapat dilakukan dan tidak ada pembagian poin. |

---

## 4. Mekanisme Perubahan Status: Action Buttons (Bukan Dropdown)

Status event **tidak dapat diedit melalui input `<select>` / dropdown pada form create maupun edit**. Hal ini untuk mencegah inkonsistensi data serta menjaga integritas audit presensi.

Perubahan status dilakukan secara eksplisit melalui **Action Buttons** kontekstual di halaman Detail Event (`/events/:id`) khusus oleh role berwenang (`organizer` atau `admin`):

```
       [Buat Event Baru]
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
│    closed    │───────────────────────────────────────┘ (Hanya jika belum ada transaksi poin terdistribusi)
└──────────────┘
```

### Aturan Transisi Action Button:
1. **Status `scheduled`**:
   - Tombol **"Start Event" (Mulai Acara)**: Mengubah status menjadi `active`. Scanner presensi aktif dan siap menerima data jemaat.
     - **Validasi Waktu Mulai**: Event hanya dapat diaktifkan jika tanggal & jam event sudah tiba atau telah terlewati (**`event_date <= current date`** / waktu saat tombol ditekan). Jika panitia mencoba menekan "Start Event" sebelum tanggal/jam event (`event_date > current date`), tombol berstatus disabled / request ditolak dengan pesan error: *"Event belum dapat dimulai sebelum tanggal dan jam pelaksanaan"*.
   - Tombol **"Cancel Event" (Batalkan Acara)**: Membuka modal konfirmasi pembatalan. Jika dikonfirmasi, status berubah menjadi `cancel`.
2. **Status `active`**:
   - Tombol **"Close & Finalize Event" (Tutup & Finalisasi Poin)**: Mengubah status menjadi `closed`. Sesi scanner ditutup, rekap kehadiran dikunci, dan sistem secara otomatis mengeksekusi pembagian poin ke seluruh jemaat hadir serta memperbarui streak mingguan jemaat.
   - Tombol **"Cancel Event" (Batalkan Acara)**: Membuka modal konfirmasi darurat pembatalan event berjalan. Data kehadiran draft diabaikan dan tidak ada poin yang dikreditkan.
3. **Status `cancel`**:
   - Tombol **"Reschedule Event" (Jadwalkan Ulang)**: Membuka modal/dialog reschedule untuk menentukan tanggal & jam baru (`event_date >= current date`). Jika dikonfirmasi, status event kembali berubah menjadi **`scheduled`** dengan jadwal baru tersebut.
4. **Status `closed`**:
   - Status bersifat final (*terminal state*) setelah pembagian poin tuntas. Tidak ada tombol transisi status lanjutan.
5. **Implementasi API**:
   - Transisi status dieksekusi melalui endpoint mutasi khusus `PATCH /api/events/:id/status` dengan payload `{ "status": "<target_status>", "event_date"?: "<ISO_DATE>" }`. Form edit umum (`PUT /api/events/:id`) menolak perubahan field `status`.

---

## 5. Konsep: Target Audiens (`visibility`)

Visibilitas menentukan siapa yang dapat melihat jadwal event:

| Nilai `visibility` | Label UI | Hak Melihat |
| --- | --- | --- |
| `all` | Semua | Semua role (`member`, `activist`, `organizer`, `admin`) |
| `member` | Jemaat/Member | `member`, `organizer`, `admin` |
| `activist` | Aktivis | `activist`, `organizer`, `admin` |
| `organizer` | Internal Pengurus | Khusus `organizer` & `admin` |

> **Keamanan Server-Side**:
> Event dengan visibilitas yang tidak sesuai dengan role user otomatis difilter di query level database. Jika user mencoba mengakses langsung URL detail `/api/events/:id` yang tidak berhak dilihatnya, server mengembalikan respon `404 Not Found` (bukan `403`) untuk mencegah kebocoran informasi (*information disclosure*).

---

## 6. Spesifikasi Fitur

### 6.1. Halaman Daftar Event (`GET /api/events`)
* **Route**: `/events`
* **Tampilan**: Dukungan tampilan Kalender dan List View.
* **Filter**:
  * Jenis Event (`event_type_id`) berdasarkan master data aktif.
  * Status Event: `scheduled`, `active`, `closed`, `cancel` (default filter: `scheduled` dan `active`).
  * Bulan / Periode tanggal.
* **Visibilitas Server-Side**:
  * `member`: hanya mengambil event dengan `visibility IN ('all', 'member')` dan status `scheduled`, `active`, atau `closed`.
  * `activist`: hanya mengambil event dengan `visibility IN ('all', 'activist')`.
  * `organizer` / `admin`: melihat seluruh event tanpa batasan visibilitas.

### 6.2. Detail Event (`GET /api/events/:id`)
* **Route**: `/events/:id`
* **Komponen Tampilan**:
  * Header: Judul, badge tipe kegiatan (warna dinamis), tanggal, waktu, dan lokasi.
  * Status badge (`scheduled`, `active`, `closed`, `cancel`).
  * Panel Action Buttons:
    * Tombol status transition ("Start Event", "Close & Finalize Event", "Cancel Event", "Reschedule Event") sesuai status berjalan (khusus `organizer`/`admin`). Saat event `cancel`, muncul tombol **"Reschedule Event"** untuk mengatur tanggal baru dan mengembalikan status ke `scheduled`.
    * Tombol **"Buka Scanner Presensi"**: Tampil saat event `active` **khusus untuk role `organizer` dan `admin`** (`activist` tidak memiliki akses).
    * Tombol **"Lihat Rekap Kehadiran"**: Tampil saat event `active` atau `closed` **khusus untuk `organizer` dan `admin`**.
    * Tombol **"Edit Event"** dan **"Hapus Event"**: Khusus `organizer` dan `admin`.

### 6.3. Buat & Edit Event
* **Route**: `/events/new` dan `/events/:id/edit`
* **Akses**: Hanya `organizer` dan `admin`.
* **Field Form & Validasi**:
  * `title`: Nama Acara (wajib, min 3 karakter).
  * `description`: Deskripsi lengkap kegiatan (opsional).
  * `event_type_id`: Dropdown pilihan dari Master Data Event Type (wajib). Saat dipilih, otomatis mengisi nilai `point_reward`, `max_late_minutes` (default 30 menit), dan `late_penalty_points` (default 15 poin).
  * `visibility`: Radio pilihan `all`, `member`, `activist`, `organizer` (wajib, default: `all`).
  * `event_date`: Tanggal dan jam pelaksanaan (wajib, DateTime ISO).
    * **Validasi Pembuatan Event Baru**: **`event_date >= current date`** (waktu saat request dibuat). Form menolak tanggal di masa lampau dan menampilkan pesan *"Tanggal pelaksanaan tidak boleh di masa lampau"*.
  * `location`: Lokasi kegiatan (wajib, teks).
  * `point_reward`: Poin presensi jemaat (angka positif, default mengikuti master data).
  * `max_late_minutes`: Batas menit toleransi keterlambatan (default 30 menit dari master data, editable per-event).
  * `late_penalty_points`: Jumlah potongan poin jika terlambat (default 15 poin dari master data, editable per-event).
  * `capacity`: Kapasitas kuota peserta (opsional).
  *(Catatan: Input status **ditiadakan** dari form create/edit; status baru selalu default `scheduled`).*

### 6.4. Presensi di Lokasi (QR Scanner & Manual)
* **Route**: `/events/:id/scan`
* **Akses**: **Eksklusif hanya `organizer` dan `admin`** (`activist` dilarang).
* **Kamera Scanner (Continuous Scanning & Anti-Race Condition)**:
  * Membaca QR Code statis kartu anggota jemaat yang berisikan **`userNumber`** permanen secara berkelanjutan (*continuous loop*).
  * **Arsitektur Zero Race Condition (Tanpa SSE/WebSocket)**:
    * **Frontend In-Flight Mutex**: Mengunci status pemrosesan saat satu request scan berjalan (`isProcessing = true`), mencegah pengiriman paralel ganda dari pembacaan video stream kamera (30-60 FPS).
    * **Cooldown Buffer (3 Detik)**: Barcode yang sama diabaikan di sisi browser selama 3 detik tanpa membebani network.
    * **PostgreSQL Database Unique Constraint**: `@unique([userId, eventId])` menjamin multi-gate scanner yang memindai QR yang sama secara bersamaan tidak akan menduplikasi kehadiran (mengembalikan `409 Conflict: "Peserta sudah tercatat hadir"`).
  * **Deteksi Keterlambatan Otomatis**: Jika waktu scan `scanned_at > event_date + max_late_minutes`, sistem otomatis menandai `is_late: true` dan mencatat `late_penalty_applied = event.late_penalty_points`.
  * **Draft State & Editable**: Presensi yang dicatat selama status `active` berstatus draft (`is_finalized: false`). Poin **belum masuk** ke saldo jemaat, sehingga pengurus dapat membatalkan/menghapus entri salah scan secara aman tanpa perlu proses rollback poin.
* **Absensi Manual (Fallback)**:
  * Input manual nomor anggota jemaat (`userNumber`) untuk jemaat yang tidak membawa smartphone atau kartu fisik.

### 6.5. Rekap Kehadiran Event
* **Route**: `/events/:id/attendances`
* **Akses**: **Hanya `organizer` dan `admin`** (`activist` dilarang).
* **Konten & Penugasan Pelayanan**:
  * Metrik ringkasan: Total kehadiran jemaat (`total_attended`), status finalisasi (`is_finalized`).
  * Tabel data presensi: Nama Jemaat, Nomor Anggota (`userNumber`), Role, Sekolah, Waktu Presensi, dan Metode (`qr` / `manual`). *(Tidak memuat photo URL, total RSVP, atau attendance rate karena Sekkha tidak menggunakan sistem RSVP).*
  * **Badge Aktivitas & Peran (*Badge Activity*)**:
    * Organizer dapat menetapkan peran pelayanan jemaat melalui dropdown Badge Activity (MC, Puja Leader, Musician).
    * Saat dipilih, tampil badge **"Badge Activity: +30 Pts"** di samping nama jemaat.
  * **Badge Keterlambatan (*Late Badge*)**:
    * Muncul otomatis sebagai badge **"Late (-15 Pts)"** di samping nama jemaat jika jemaat di-scan melewati batas toleransi `max_late_minutes`.
  * Pembatalan presensi: Tombol hapus kehadiran peserta tertentu (`DELETE /api/events/:id/attendances/:userId`) selama event belum berstatus `closed`.
  * Fitur ekspor data kehadiran (CSV/Excel).

---

## 7. Database Schema (Prisma)

Mengikuti `sekkha-api/prisma/schema.prisma`:

```prisma
enum Role {
  member
  activist
  organizer
  admin
}

enum EventStatus {
  scheduled
  active
  closed
  cancel
}

enum EventVisibility {
  all
  member
  activist
  organizer
}

enum AttendanceMethod {
  qr
  manual
}

model Event {
  id                String          @id @default(cuid())
  title             String
  description       String?
  location          String
  eventDate         DateTime        @map("event_date")
  eventTypeId       String?         @map("event_type_id")
  seasonId          String?         @map("season_id")
  status            EventStatus     @default(scheduled)
  visibility        EventVisibility @default(all)
  qrCode            String?         @map("qr_code")
  pointReward       Int             @default(50) @map("point_reward")
  maxLateMinutes    Int?            @default(30) @map("max_late_minutes")
  latePenaltyPoints Int?            @default(15) @map("late_penalty_points")
  createdAt         DateTime        @default(now()) @map("created_at")
  updatedAt         DateTime        @updatedAt @map("updated_at")

  // Relations
  eventType   EventType?   @relation(fields: [eventTypeId], references: [id], onDelete: SetNull)
  season      Season?      @relation(fields: [seasonId], references: [id], onDelete: SetNull)
  attendances Attendance[]

  @@index([status, eventDate])
  @@index([status, visibility])
  @@index([visibility, eventDate])
  @@index([eventTypeId])
  @@map("events")
}

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
  scannedAt          DateTime         @default(now()) @map("scanned_at")

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

## 8. Spesifikasi API Contract

Semua endpoint menggunakan base path `/api/events` dengan format envelope standar:
```json
{
  "status": "success",
  "code": 200,
  "message": "...",
  "data": {}
}
```

### 8.1. `GET /api/events`
Mengambil daftar event terfilter.
- **Akses**: Terautentikasi (`requireAuth`, filter query berdasarkan role pemanggil).
- **Query Params**:
  - `page` (number, default: 1)
  - `limit` (number, default: 20)
  - `status` (`scheduled`, `active`, `closed`, `cancel`)
  - `event_type_id` (cuid string)
  - `month` (`YYYY-MM`)
- **Response 200 OK**:
  ```json
  {
    "status": "success",
    "code": 200,
    "message": "Events retrieved successfully",
    "data": [
      {
        "id": "evt_abc123",
        "title": "Kebaktian Minggu Pagi",
        "description": "Kebaktian rutin dan sharing dhamma.",
        "location": "Dhammasala Utama",
        "event_date": "2026-10-25T09:00:00.000Z",
        "status": "scheduled",
        "visibility": "all",
        "event_type": {
          "id": "typ_rutin_01",
          "code": "regular-service",
          "label": "Regular Service",
          "color": "#4262FF"
        }
      }
    ]
  }
  ```

### 8.2. `GET /api/events/:id`
Mengambil detail satu event.
- **Akses**: Terautentikasi (`requireAuth` + server-side visibility check).

### 8.3. `POST /api/events`
Membuat event baru dengan status awal `scheduled`.
- **Akses**: `organizer`, `admin` (`requireRole("organizer", "admin")`).
- **Validasi Server-Side**:
  - `event_date`: Wajib DateTime ISO dan harus **`event_date >= current date`** (waktu server saat request diterima). Jika `event_date < current date`, server mengembalikan `400 Bad Request` dengan pesan error: `"Event date cannot be in the past"`.
- **Request Body**:
  ```json
  {
    "title": "Kebaktian Remaja",
    "description": "Kebaktian dan meditasi bersama.",
    "location": "Gedung Sekkha Lt. 2",
    "event_date": "2026-10-25T09:00:00.000Z",
    "event_type_id": "typ_rutin_01",
    "visibility": "all"
  }
  ```
- **Response 201 Created**: Objek event tersimpan dengan `status: "scheduled"`.
- **Error 400 Bad Request**:
  ```json
  {
    "status": "error",
    "code": 400,
    "message": "Event date cannot be in the past"
  }
  ```

### 8.4. `PATCH /api/events/:id/status` (Action Button Endpoint)
Mengubah status siklus event secara aman. Mendukung transisi status termasuk pembatalan dan **reschedule** event yang dibatalkan.
- **Akses**: `organizer`, `admin` (`requireRole("organizer", "admin")`).
- **Request Body (Standar)**:
  ```json
  {
    "status": "closed"
  }
  ```
- **Request Body (Reschedule Event dari `cancel` ke `scheduled`)**:
  ```json
  {
    "status": "scheduled",
    "event_date": "2026-11-01T09:00:00.000Z"
  }
  ```
  *(Status tujuan valid: `active`, `closed`, `cancel`, atau `scheduled` khusus jika status saat ini `cancel`).*
  - **Validasi Transisi ke `active`**: Transisi status menjadi `active` hanya diizinkan jika waktu sekarang sudah mencapai atau melewati jadwal event (**`event.event_date <= current date`**). Jika panitia mencoba mengaktifkan event sebelum jadwalnya tiba (`event.event_date > current date`), server menolak dengan `400 Bad Request` dan pesan error: `"Event cannot be started before its scheduled date and time"`.
  - **Validasi Reschedule**: Saat mengubah status dari `cancel` ke `scheduled`, field `event_date` wajib disertakan dan harus **`event_date >= current date`**.
- **Response 200 OK (Start Event)**:
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
- **Error 400 Bad Request (Start Event Prematur)**:
  ```json
  {
    "status": "error",
    "code": 400,
    "message": "Event cannot be started before its scheduled date and time"
  }
  ```
- **Response 200 OK (Close Event)**:
  ```json
  {
    "status": "success",
    "code": 200,
    "message": "Event closed successfully and attendance points distributed",
    "data": {
      "id": "evt_abc123",
      "status": "closed",
      "total_attendees": 42,
      "points_distributed": true
    }
  }
  ```
- **Response 200 OK (Reschedule Event)**:
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

### 8.5. `POST /api/events/:id/attendances`
Mencatat presensi jemaat oleh pengurus di lokasi selama event berstatus `active`.
- **Akses**: **Eksklusif `organizer` dan `admin`** (`requireRole("organizer", "admin")`).
- **Aturan**: Event harus berstatus `active`. Poin jemaat belum bertambah (`is_finalized: false`).
- **Request Body**:
  ```json
  {
    "method": "qr",
    "user_id": "usr_9b1deb4d"
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
      "points_earned": 50,
      "is_finalized": false,
      "scanned_at": "2026-10-25T09:15:00.000Z"
    }
  }
  ```
- **Error 409 Conflict**: Peserta sudah tercatat hadir dalam sesi ini.
- **Error 403 Forbidden**: Akses ditolak jika role pemanggil bukan `organizer` atau `admin`.

### 8.6. `GET /api/events/:id/attendances` (Rekap Kehadiran)
Mengambil daftar seluruh peserta hadir.
- **Akses**: **Hanya `organizer` dan `admin`** (`requireRole("organizer", "admin")`).
- **Perlindungan Role**: Jika `activist` atau `member` memanggil endpoint ini, sistem mengembalikan `403 Forbidden`.
- **Response 200 OK**:
  ```json
  {
    "status": "success",
    "code": 200,
    "message": "Daftar kehadiran berhasil diambil",
    "data": {
      "event_id": "evt_abc123",
      "total_attended": 42,
      "is_finalized": false,
      "attendances": [
        {
          "user_id": "usr_9b1deb4d",
          "name": "Hendra Santoso",
          "user_number": "202610230001",
          "role": "member",
          "school": "SMA Negeri 1 Jakarta",
          "method": "qr",
          "scanned_at": "2026-10-25T09:15:00.000Z"
        }
      ]
    }
  }
  ```

### 8.7. `DELETE /api/events/:id/attendances/:userId`
Membatalkan / menghapus kehadiran peserta selama event belum berstatus `closed`.
- **Akses**: `organizer`, `admin`.

### 8.8. `DELETE /api/events/:id`
Menghapus event permanen.
- **Akses**: `organizer`, `admin`.

---

## 9. Domain Events (EventBus Integration)

| Event | Publisher | Subscriber | Payload | Efek Samping |
| --- | --- | --- | --- | --- |
| `event.closed` | Events module | Users/Stats module | `{ eventId, pointReward, attendeeUserIds: string[] }` | Menandai `isFinalized = true` pada seluruh `Attendance`, menambah saldo poin di `UserStats`, membuat catatan `PointTransaction`, memperbarui streak mingguan jemaat, dan menginvalidasi cache leaderboard/profil. |

---

## 10. Matrix Kriteria Penerimaan (Acceptance Criteria)

| ID | Skenario Pengujian | Hasil yang Diharapkan |
| --- | --- | --- |
| **AC-EVT-01** | `activist` mencoba mengakses `/events/:id/scan` atau POST absensi | Server menolak dengan `403 Forbidden`. Hak operasional scanner eksklusif untuk organizer/admin. |
| **AC-EVT-02** | `activist` mencoba mengakses `/events/:id/attendances` (Rekap Presensi) | Server menolak dengan `403 Forbidden`. UI tidak menampilkan menu rekap pada role aktivis. |
| **AC-EVT-03** | `organizer` membuka rekap presensi di `/events/:id/attendances` | Berhasil menampilkan total kehadiran, daftar peserta, nomor anggota, dan tombol hapus/ekspor. |
| **AC-EVT-04** | Form create/edit event dibuka oleh organizer | Field status **tidak ada** berupa dropdown. Event baru otomatis tersimpan sebagai `scheduled`. |
| **AC-EVT-05** | Organizer mengklik tombol action "Start Event" pada event `scheduled` saat jadwal sudah tiba (`event_date <= current date`) | Status event berubah menjadi `active` via `PATCH /api/events/:id/status`. Scanner presensi aktif. Data kehadiran disimpan berstatus draft dan poin belum dikreditkan. |
| **AC-EVT-06** | Organizer mengklik tombol action "Close & Finalize Event" pada event `active` | Status event berubah menjadi `closed`. Sesi scanner ditutup dan poin seluruh jemaat hadir langsung dikreditkan secara batch. |
| **AC-EVT-07** | Organizer mengklik tombol action "Cancel Event" | Menampilkan modal konfirmasi, setelah disetujui status berubah menjadi `cancel`. Tidak ada pembagian poin. |
| **AC-EVT-08** | Pemilihan Event Type saat membuat event baru | Pilihan diambil dari master data `event_types`. Field poin default terisi otomatis sesuai `default_point_reward`. |
| **AC-EVT-09** | `member` membuka daftar `/events` | Hanya melihat event dengan visibilitas `all` atau `member`. Event `organizer` tersembunyi. |
| **AC-EVT-10** | `member` mengakses langsung URL event yang berstatus visibilitas `organizer` | Server mengembalikan `404 Not Found` (mencegah information leakage). |
| **AC-EVT-11** | Presensi QR ganda terhadap user yang sama pada satu event | Mengembalikan error `409 Conflict` dengan pesan "Peserta sudah tercatat hadir". |
| **AC-EVT-12** | Organizer membuat event baru dengan tanggal lampau (`event_date < current date`) | Validasi frontend & backend menolak dengan `400 Bad Request` dan pesan error "Event date cannot be in the past". Event hanya tersimpan jika `event_date >= current date`. |
| **AC-EVT-13** | Organizer menekan tombol action "Reschedule Event" pada event `cancel` | Menampilkan modal pemilihan tanggal baru (`event_date >= current date`). Setelah disimpan, status event berubah kembali menjadi `scheduled` via `PATCH /api/events/:id/status`. |
| **AC-EVT-14** | Organizer mencoba menekan "Start Event" sebelum jadwal kegiatan tiba (`event_date > current date`) | Tombol di UI disabled / request `PATCH status: active` ditolak oleh backend dengan `400 Bad Request` dan pesan "Event cannot be started before its scheduled date and time". |


