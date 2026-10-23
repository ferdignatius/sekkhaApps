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

**Event Management System** adalah modul operasional inti Sekkha Apps yang memungkinkan **organizer** dan **admin** mengelola seluruh siklus kegiatan komunitas vihara (kebaktian, retreat, meditasi, pelatihan, dll.). Modul ini mendukung pengaturan visibilitas audiens berbasis peran (*role-based visibility*) serta pencatatan presensi di lokasi (*on-site attendance*) secara instan menggunakan QR Code kartu jemaat atau input manual.

Alur utama:
1. **Organizer / Admin** membuat event, memilih jenis kegiatan dari master data `event_types`, menentukan jadwal, lokasi, kapasitas, dan target audiens (`visibility`). Poin kehadiran otomatis terisi dari `default_point_reward` Event Type terpilih dan dapat disesuaikan.
2. **Member / Activist** (sesuai target audiens) melihat jadwal dan informasi detail event melalui kalender atau daftar acara.
3. **Transisi Status Event**: Perubahan status (`scheduled`, `active`, `done`, `canceled`) **tidak dapat diedit melalui dropdown form**, melainkan dikendalikan secara ketat melalui **Action Buttons** pada antarmuka detail event.
4. **Presensi di Lokasi**: Saat event berstatus `active`, panitia (`activist`, `organizer`, `admin`) memindai QR Code jemaat.
   - **Perhatian Hak Akses**: `activist` **bisa melakukan pemindaian (scan QR)** tetapi **TIDAK BISA melihat / mengelola rekap absensi**. Rekap kehadiran hanya dapat diakses oleh `organizer` dan `admin`.
5. Presensi otomatis memberikan penambahan poin dan mempertahankan streak mingguan jemaat. Fitur badge dan level **dihapus** dari seluruh sistem event.

---

## 2. Definisi Role & Hak Akses

Role dalam seluruh sistem Sekkha menggunakan terminologi Bahasa Inggris resmi: `member`, `activist`, `organizer`, dan `admin`.

| Role | Lihat Event | Buat / Edit / Hapus Event | Ubah Status (Action Button) | Scan Presensi QR | Lihat & Ekspor Rekap Kehadiran |
| --- | :---: | :---: | :---: | :---: | :---: |
| `member` | v (sesuai `visibility`) | x | x | x | x |
| `activist` | v (sesuai `visibility`) | x | x | v | x |
| `organizer` | v (semua visibilitas) | v | v | v | v |
| `admin` | v (semua visibilitas) | v | v | v | v |

> **Catatan Otorisasi Rekap Presensi**:
> - Endpoint pencatatan presensi (`POST /api/events/:id/attendances`) dan live stream SSE (`GET /api/events/:id/live-attendance`) dapat diakses oleh `activist`, `organizer`, dan `admin`.
> - Endpoint daftar & rekap kehadiran (`GET /api/events/:id/attendances`) serta pembatalan presensi (`DELETE /api/events/:id/attendances/:userId`) **dibatasi ketat hanya untuk `organizer` dan `admin`**. Request dari `activist` akan ditolak dengan `403 Forbidden`.

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
| `scheduled` | Terjadwal | Event telah dibuat, dijadwalkan, dan terkonfirmasi. Siap dipublikasikan ke audiens. |
| `active` | Berlangsung (Aktif) | Event sedang berjalan di lokasi. Scanner presensi dibuka untuk pemindaian. |
| `done` | Selesai | Event telah selesai dilaksanakan. Presensi ditutup dan rekap terkunci. |
| `canceled` | Dibatalkan | Event dibatalkan karena suatu alasan. Presensi tidak dapat dilakukan. |

---

## 4. Mekanisme Perubahan Status: Action Buttons (Bukan Dropdown)

Status event **tidak dapat diedit melalui input `<select>` / dropdown pada form create maupun edit**. Hal ini untuk mencegah inkonsistensi data serta menjaga integritas audit presensi.

Perubahan status dilakukan secara eksplisit melalui **Action Buttons** kontekstual di halaman Detail Event (`/events/:id`) oleh role berwenang (`organizer` atau `admin`):

```
       [Buat Event Baru]
               │
               ▼
        ┌──────────────┐
        │  scheduled   │
        └──────┬───────┘
               │
     ┌─────────┴─────────┐
     │ [Mulai Acara]     │ [Batalkan Acara]
     ▼                   ▼
┌──────────────┐   ┌──────────────┐
│    active    │   │   canceled   │
└──────┬───────┘   └──────────────┘
       │                 ▲
       │ [Selesaikan]    │ [Batalkan Acara]
       ▼                 │
┌──────────────┐         │
│     done     │─────────┘ (Hanya jika belum ada transaksi)
└──────────────┘
```

### Aturan Transisi Action Button:
1. **Status `scheduled`**:
   - Tombol **"Mulai Acara" (Activate)**: Mengubah status menjadi `active`. Scanner presensi aktif dan dapat menerima data QR.
   - Tombol **"Batalkan Acara" (Cancel)**: Membuka modal konfirmasi pembatalan. Jika dikonfirmasi, status berubah menjadi `canceled`.
2. **Status `active`**:
   - Tombol **"Selesaikan Acara" (Complete / Mark as Done)**: Mengubah status menjadi `done`. Sesi scanner otomatis ditutup.
   - Tombol **"Batalkan Acara" (Cancel)**: Membuka modal konfirmasi darurat pembatalan event berjalan.
3. **Status `done` & `canceled`**:
   - Status bersifat final (*terminal state*). Tidak ada tombol transisi status lanjutan.
4. **Implementasi API**:
   - Transisi status dieksekusi melalui endpoint mutasi khusus `PATCH /api/events/:id/status` dengan payload `{ "status": "<target_status>" }`. Form edit umum (`PUT /api/events/:id`) menolak perubahan field `status`.

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
  * Status Event: `scheduled`, `active`, `done`, `canceled` (default filter: `scheduled` dan `active`).
  * Bulan / Periode tanggal.
* **Visibilitas Server-Side**:
  * `member`: hanya mengambil event dengan `visibility IN ('all', 'member')` dan status `scheduled`, `active`, atau `done`.
  * `activist`: hanya mengambil event dengan `visibility IN ('all', 'activist')`.
  * `organizer` / `admin`: melihat seluruh event tanpa batasan visibilitas.

### 6.2. Detail Event (`GET /api/events/:id`)
* **Route**: `/events/:id`
* **Komponen Tampilan**:
  * Header: Judul, badge tipe kegiatan (warna dinamis), tanggal, waktu, dan lokasi.
  * Status badge (`scheduled`, `active`, `done`, `canceled`).
  * Panel Action Buttons:
    * Tombol status transition ("Mulai Acara", "Selesaikan Acara", "Batalkan Acara") sesuai status berjalan (hanya `organizer`/`admin`).
    * Tombol **"Buka Scanner Presensi"**: Tampil saat event `active` untuk role `activist`, `organizer`, dan `admin`.
    * Tombol **"Lihat Rekap Kehadiran"**: Tampil saat event `active` atau `done` **khusus untuk `organizer` dan `admin`** (tidak terlihat oleh `activist`).
    * Tombol **"Edit Event"** dan **"Hapus Event"**: Khusus `organizer` dan `admin`.

### 6.3. Buat & Edit Event
* **Route**: `/events/new` dan `/events/:id/edit`
* **Akses**: Hanya `organizer` dan `admin`.
* **Field Form**:
  * `title`: Nama Acara (wajib, min 3 karakter).
  * `description`: Deskripsi lengkap kegiatan (opsional).
  * `event_type_id`: Dropdown pilihan dari Master Data Event Type (wajib). Saat dipilih, otomatis mengisi nilai `point_reward`.
  * `visibility`: Radio pilihan `all`, `member`, `activist`, `organizer` (wajib, default: `all`).
  * `event_date`: Tanggal dan jam pelaksanaan (wajib, DateTime ISO).
  * `location`: Lokasi kegiatan (wajib, teks).
  * `point_reward`: Poin presensi jemaat (angka positif, default mengikuti master data).
  * `capacity`: Kapasitas kuota peserta (opsional).
  *(Catatan: Input status **ditiadakan** dari form create/edit; status baru selalu default `scheduled`).*

### 6.4. Presensi di Lokasi (QR Scanner & Manual)
* **Route**: `/events/:id/scan`
* **Akses**: `activist`, `organizer`, `admin`.
* **Kamera Scanner**:
  * Membaca QR Code kartu anggota user (berisi `userId` atau payload token presensi).
  * Validasi duplikasi presensi instan: jika peserta sudah hadir, menampilkan notifikasi "Sudah Tercatat Hadir" tanpa menambah poin ganda.
  * Menampilkan ringkasan peserta yang baru saja di-scan (nama, nomor anggota, waktu scan).
* **Absensi Manual (Fallback)**:
  * Input manual nama atau nomor anggota jemaat (`userNumber`) untuk jemaat yang tidak membawa smartphone atau kartu fisik.

### 6.5. Rekap Kehadiran Event
* **Route**: `/events/:id/attendances`
* **Akses**: **Hanya `organizer` dan `admin`** (`activist` dilarang).
* **Konten**:
  * Metrik ringkasan: Total kehadiran jemaat, persentase kapasitas, perincian metode scan (QR vs Manual).
  * Tabel data presensi: Nama Jemaat, Nomor Anggota (`userNumber`), Role, Sekolah, Waktu Presensi, dan Metode.
  * Pembatalan presensi: Tombol hapus kehadiran peserta tertentu (`DELETE /api/events/:id/attendances/:userId`).
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
  done
  canceled
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
  id          String          @id @default(cuid())
  title       String
  description String?
  location    String
  eventDate   DateTime        @map("event_date")
  eventTypeId String?         @map("event_type_id")
  seasonId    String?         @map("season_id")
  status      EventStatus     @default(scheduled)
  visibility  EventVisibility @default(all)
  qrCode      String?         @map("qr_code")
  createdAt   DateTime        @default(now()) @map("created_at")
  updatedAt   DateTime        @updatedAt @map("updated_at")

  // Relations
  type        EventType?   @relation(fields: [eventTypeId], references: [id], onDelete: SetNull)
  season      Season?      @relation(fields: [seasonId], references: [id], onDelete: SetNull)
  attendances Attendance[]

  @@index([status, eventDate])
  @@index([status, visibility])
  @@index([visibility, eventDate])
  @@index([eventTypeId])
  @@map("events")
}

model Attendance {
  id           String           @id @default(cuid())
  userId       String           @map("user_id")
  eventId      String           @map("event_id")
  method       AttendanceMethod @default(qr)
  pointsEarned Int              @default(50) @map("points_earned")
  scannedAt    DateTime         @default(now()) @map("scanned_at")

  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  event Event @relation(fields: [eventId], references: [id], onDelete: Cascade)

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
  - `status` (`scheduled`, `active`, `done`, `canceled`)
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
        "event_type_id": "typ_rutin_01",
        "status": "scheduled",
        "visibility": "all",
        "type": {
          "id": "typ_rutin_01",
          "code": "regular-service",
          "name": "Regular Service",
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

### 8.4. `PATCH /api/events/:id/status` (Action Button Endpoint)
Mengubah status siklus event secara aman.
- **Akses**: `organizer`, `admin` (`requireRole("organizer", "admin")`).
- **Request Body**:
  ```json
  {
    "status": "active"
  }
  ```
  *(Status tujuan valid: `active`, `done`, `canceled`).*
- **Response 200 OK**:
  ```json
  {
    "status": "success",
    "code": 200,
    "message": "Status acara berhasil diperbarui",
    "data": {
      "id": "evt_abc123",
      "status": "active"
    }
  }
  ```

### 8.5. `POST /api/events/:id/attendances`
Mencatat presensi jemaat oleh panitia di lokasi.
- **Akses**: `activist`, `organizer`, `admin` (`requireRole("activist", "organizer", "admin")`).
- **Aturan**: Event harus berstatus `active`.
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
    "message": "Presensi berhasil dicatat",
    "data": {
      "attendance_id": "att_001",
      "user_id": "usr_9b1deb4d",
      "name": "Hendra Santoso",
      "user_number": "202610230001",
      "points_earned": 50,
      "scanned_at": "2026-10-25T09:15:00.000Z"
    }
  }
  ```
- **Error 409 Conflict**: Peserta sudah tercatat hadir.

### 8.6. `GET /api/events/:id/attendances` (Rekap Kehadiran)
Mengambil daftar seluruh peserta hadir.
- **Akses**: **Hanya `organizer` dan `admin`** (`requireRole("organizer", "admin")`).
- **Perlindungan Role**: Jika `activist` memanggil endpoint ini, sistem mengembalikan `403 Forbidden`.
- **Response 200 OK**:
  ```json
  {
    "status": "success",
    "code": 200,
    "message": "Daftar kehadiran berhasil diambil",
    "data": {
      "event_id": "evt_abc123",
      "total_attended": 42,
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
Membatalkan kehadiran salah satu peserta.
- **Akses**: `organizer`, `admin`.

### 8.8. `DELETE /api/events/:id`
Menghapus event permanen.
- **Akses**: `organizer`, `admin`.

---

## 9. Domain Events (EventBus Integration)

| Event | Publisher | Subscriber | Payload | Efek Samping |
| --- | --- | --- | --- | --- |
| `attendance.recorded` | Events module | Users/Stats module | `{ eventId, userId, pointsEarned }` | Tambah poin di `UserStats`, mutasi `PointTransaction`, perbarui streak, invalidasi cache profil. |

---

## 10. Matrix Kriteria Penerimaan (Acceptance Criteria)

| ID | Skenario Pengujian | Hasil yang Diharapkan |
| --- | --- | --- |
| **AC-EVT-01** | `activist` melakukan scan QR jemaat di `/events/:id/scan` | Presensi berhasil dicatat (`201 Created`), poin bertambah, dan toast konfirmasi muncul. |
| **AC-EVT-02** | `activist` mencoba mengakses `/events/:id/attendances` (Rekap Presensi) | Akses ditolak (`403 Forbidden`). UI tidak menampilkan link atau tombol rekap pada menu aktivis. |
| **AC-EVT-03** | `organizer` membuka rekap presensi di `/events/:id/attendances` | Berhasil menampilkan total kehadiran, daftar peserta, nomor anggota, dan tombol hapus/ekspor. |
| **AC-EVT-04** | Form create/edit event dibuka oleh organizer | Field status **tidak ada** berupa dropdown. Event baru otomatis tersimpan sebagai `scheduled`. |
| **AC-EVT-05** | Organizer mengklik tombol action "Mulai Acara" pada event `scheduled` | Status event berubah menjadi `active` via `PATCH /api/events/:id/status`. Tombol scanner aktif. |
| **AC-EVT-06** | Organizer mengklik tombol action "Selesaikan Acara" pada event `active` | Status event berubah menjadi `done`. Presensi baru tidak lagi diperbolehkan. |
| **AC-EVT-07** | Organizer mengklik tombol action "Batalkan Acara" | Menampilkan modal konfirmasi, setelah disetujui status berubah menjadi `canceled`. |
| **AC-EVT-08** | Pemilihan Event Type saat membuat event baru | Pilihan diambil dari master data `event_types`. Field poin default terisi otomatis sesuai `default_point_reward`. |
| **AC-EVT-09** | `member` membuka daftar `/events` | Hanya melihat event dengan visibilitas `all` atau `member`. Event `organizer` tersembunyi. |
| **AC-EVT-10** | `member` mengakses langsung URL event yang berstatus visibilitas `organizer` | Server mengembalikan `404 Not Found` (mencegah information leakage). |
| **AC-EVT-11** | Presensi QR ganda terhadap user yang sama pada satu event | Mengembalikan error `409 Conflict` dengan pesan "Peserta sudah tercatat hadir". |
