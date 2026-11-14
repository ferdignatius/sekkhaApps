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

| Role | Lihat Event | Buat / Edit / Hapus Event | Ubah Status (Action Button) | Take Presensi QR / Manual | Lihat Rekap Kehadiran |
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
     - **Validasi Waktu Mulai**: Event **tidak boleh diaktifkan jika tanggal saat ini sudah melewati tanggal yang ditetapkan pada event (`current date > event_date`)**. Aktivasi diizinkan selama tanggal saat ini berada pada atau sebelum jadwal pelaksanaan (`current date <= event_date`). Apabila jadwal event sudah terlewat (`current date > event_date`), tombol "Start Event" berstatus disabled / request ditolak dengan `400 Bad Request`, sehingga event tersebut harus dijadwalkan ulang (*reschedule*) atau dibatalkan (*cancel*).
     - **Anchor Waktu Mulai Sesi (`event_date = now`)**: Ketika **"Start Event"** diklik (baik lebih awal maupun lebih lambat di hari yang sama selama masih `current date <= event_date`), sistem otomatis meng-update `event_date` ke **timestamp aktual saat acara di-start (`now`)** (kecuali tanggal baru disuplai secara eksplisit). Dengan demikian, batas toleransi keterlambatan (`max_late_minutes`) selalu dihitung sejak sesi presensi benar-benar dimulai, bukan dari jam jadwal awal.
   - Tombol **"Cancel Event" (Batalkan Acara)**: Membuka modal konfirmasi pembatalan. Jika dikonfirmasi, status berubah menjadi `cancel`.
2. **Status `active`**:
   - Tombol **"Close & Finalize Event" (Tutup & Finalisasi Poin)**: Mengubah status menjadi `closed`. Sesi scanner ditutup, rekap kehadiran dikunci, dan sistem secara otomatis mengeksekusi pembagian poin ke seluruh jemaat hadir serta memperbarui streak mingguan jemaat.
   - **Auto-Close Melewati Tanggal Start (`current date > event_date`)**: Apabila event yang sudah berstatus `active` telah melewati hari tanggal mulainya (`current date > event_date` berdasarkan kalender WIB), sistem **otomatis menutup dan memfinalisasi event (`active` → `closed`)** — baik melalui cron harian pukul `00:05 WIB` maupun secara lazy saat data event diakses / saat percobaan scan presensi.
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
* **Tampilan**: Dukungan tampilan Kalender dan List View berbasis tanggal aktif.
* **Aturan Tanggal Aktif (*Always-Active Date* — Default Today)**:
  * Daftar event di sisi kalender **selalu memiliki satu tanggal yang aktif** (tidak ada lagi mode "tanpa tanggal terpilih" / *Full Month* / *Show All* yang menumpuk seluruh event sebulan dalam satu list).
  * **Default Initial Load**: Saat halaman `/events` pertama kali dibuka, `selectedDate` otomatis mengarah ke **Today** (tanggal hari ini, zona waktu WIB / `Asia/Jakarta`).
  * **Interaksi Kalender & Navigasi Bulan**:
    * Mengklik tanggal di `EventCalendar` memindahkan tanggal aktif ke tanggal tersebut. Mengklik ulang tanggal yang sedang aktif **tidak me-reset / men-deselect tanggal** (tanggal tetap aktif).
    * Tombol **Full Month** dan **Show All** dihapus.
    * Tombol **Today** mengarahkan kalender dan tanggal aktif kembali ke hari ini.
    * Saat berpindah bulan (**Prev / Next month**), tanggal aktif otomatis berpindah ke tanggal 1 bulan target (atau ke **Today** jika kembali ke bulan berjalan saat ini) sehingga selalu ada tanggal aktif.
  * **Pengecualian Search Global**: Saat user mengetik kata kunci di **Search Bar**, list beralih ke mode pencarian lintas semua tanggal & bulan (tanpa dibatasi tanggal aktif). Ketika Search Bar dibersihkan (`Clear Search`), tampilan kembali ke event pada tanggal aktif.
* **Urutan Event dalam Tanggal Aktif**:
  * Di dalam tanggal aktif, event tetap diurutkan berdasarkan prioritas status & waktu (`active` di posisi teratas -> `scheduled` urut jam `event_date ASC` -> `closed` -> `cancel`) dengan highlight visual tegas antara `Live Attendance` (`active`), `Scheduled` / `Today`, dan `Closed` / `Cancelled` (*muted*).
* **Perilaku Setelah Create Event & Toast Feedback CRUD**:
  * Setelah Pengurus berhasil membuat event baru (`POST /api/events`), UI otomatis mengarahkan kalender (`activeMonth`) dan tanggal aktif (`selectedDate`) langsung ke tanggal pelaksanaan event yang baru dibuat, sehingga event baru langsung terlihat di daftar tanpa tertumpuk event lama.
  * Seluruh aksi CRUD event dan presensi menampilkan notifikasi toast non-blocking berbahasa Inggris (hilang otomatis dalam 3.5 detik): `"Event created successfully!"`, `"Event updated successfully!"`, `"Event duplicated successfully!"`, toast transisi status (`active`, `closed`, `cancel`, `planned`), `"Attendance record removed."`, `"Event deleted successfully."`, serta toast error yang menggantikan browser `alert()`.
* **Filter Lainnya**:
  * Jenis Event (`event_type_id`) berdasarkan master data aktif.
  * Bulan / Periode tanggal kalender (`activeMonth`).
* **Visibilitas Server-Side**:
  * `member`: hanya mengambil event dengan `visibility IN ('all', 'member')` dan status `scheduled`, `active`, atau `closed`.
  * `activist`: hanya mengambil event dengan `visibility IN ('all', 'activist')`.
  * `organizer` / `admin`: melihat seluruh event tanpa batasan visibilitas.

### 6.2. Detail Event (`GET /api/events/:id`)
* **Route**: `/events/:id`
* **Desain & Token Visual (`DESIGN.md`)**: Seluruh kontainer kartu, tab segment, dialog konfirmasi, dan modal reschedule menggunakan semantic design tokens (`bg-canvas`, `bg-surface-soft`, `bg-surface-card`, `text-ink`, `text-text-muted`, `border-hairline`) serta radius standar (`rounded-xl`, `rounded-2xl`) tanpa nilai hex mentah.
* **Komponen Tampilan**:
  * Header: Judul, tanggal squircle, badge tipe kegiatan (warna dinamis), status badge (`scheduled`, `active`, `closed`, `cancel`), dan tombol Share. *(Tombol **Export / Add to Google Calendar** telah dihapus sepenuhnya dari dropdown header, kartu tanggal, dan baris non-pengurus).*
  * **Overview Bento Grid**:
    * **Date & Time**: Hari, tanggal, jam WIB, dan keterangan zona waktu `"Western Indonesia Time (WIB · UTC+7)"`.
    * **Venue & Location (Smart Location Context)**: Menghapus teks hardcoded lama dan menentukan konteks lokasi otomatis:
      * Untuk lokasi virtual (kata kunci seperti `zoom`, `online`, `meet`, `teams`, `discord`, `virtual` atau berupa URL `https://`): menampilkan subjudul `"Online Virtual Session"`. Jika berupa URL valid menampilkan tautan `"Join Virtual Session"`, jika hanya nama platform tanpa URL menampilkan keterangan `"Link shared by event organizers"` tanpa tautan Google Maps yang membingungkan.
      * Untuk ruangan fisik vihara: menampilkan subjudul `"Vihara Sekkha Community Center"` dengan tautan Google Maps menggunakan query `"Vihara Sekkha <location>"`.
    * **Seva Reward & Event Rules**: Menampilkan reward poin dan kebijakan keterlambatan; apabila `late_penalty_points === 0`, baris **Late Penalty** menampilkan `"No Penalty (0 Pts)"` alih-alih angka penalti minus.
  * Panel Action Buttons:
    * Tombol status transition ("Start Event", "Finalize Event", "Cancel Event", "Reschedule Event") sesuai status berjalan (khusus `organizer`/`admin`). Saat event `cancel`, muncul tombol **"Reschedule Event"** untuk mengatur tanggal baru dan mengembalikan status ke `scheduled`.
    * Tombol **"Live Scanner"**: Tampil saat event `active` **khusus untuk role `organizer` dan `admin`** (`activist` tidak memiliki akses).
    * Tombol **"Manage Attendance List"**: Tampil pada tab Attendance **khusus untuk `organizer` dan `admin`**.
    * Tombol **"Edit Event"**, **"Duplicate Event"**, dan **"Delete Event"**: Khusus `organizer` dan `admin`.

### 6.3. Buat & Edit Event
* **Route**: `/events/new` dan `/events/:id/edit`
* **Akses**: Hanya `organizer` dan `admin`.
* **Struktur Form 3 Bagian & UX Enhancements**:
  1. **Section 1 — Basic Details**: `Event name` (`title`), `Description` (textarea opsional yang **selalu tampil** tanpa tersembunyi di balik toggle), `Event Type` (`event_type_id` dari Master Data), dan `Visibility` radio (`all`, `member`, `activist`, `organizer`).
  2. **Section 2 — Schedule & Venue**:
     * `DateTimePickerPopover`: menggunakan semantic token `DESIGN.md` (`z-[120]`), chip pilihan tanggal cepat (**`Today`**, **`Tomorrow`**, **`Next Sun`**), preset waktu cepat (**`08:00`**, **`09:00`**, **`13:00`**, **`17:00`**, **`19:00`**) + custom time input, serta menonaktifkan tanggal masa lampau (`disablePastDates`) saat membuat event baru.
     * `Location`: input teks bebas (*free-text*) dilengkapi dropdown **"Recent Locations"** yang menampilkan maksimal **3 lokasi berbeda terakhir** yang pernah digunakan oleh event sebelumnya (tanpa chip/autofill lokasi hardcode).
  3. **Section 3 — Attendance & Late Policy**:
     * **Apply Late Penalty Toggle (`<Switch>`)**: Mengontrol penerapan potongan poin keterlambatan per event.
       * Saat **OFF**: `max_late_minutes` dan `late_penalty_points` diset ke `0` dan input detail disembunyikan. Jika `late_penalty_points === 0`, deteksi keterlambatan dinonaktifkan sepenuhnya sehingga peserta tidak pernah ditandai `is_late: true` dan tidak dikenakan penalti poin meski hadir berjam-jam setelah acara dimulai.
       * Saat **ON**: Menampilkan input `Grace Period (minutes)` (`max_late_minutes`) dan `Late Penalty (points)` (`late_penalty_points`) yang dapat diedit, dengan default awal mengikuti master data Event Type (misal 15 menit & 15 poin).
* **Field Form & Validasi Inti**:
  * `title`: Nama Acara (wajib, min 3 karakter).
  * `description`: Deskripsi lengkap kegiatan (opsional).
  * `event_type_id`: Dropdown pilihan dari Master Data Event Type (wajib). Saat dipilih, otomatis mengisi nilai `point_reward`, serta default `max_late_minutes` dan `late_penalty_points` apabila toggle penalti aktif.
  * `visibility`: Radio pilihan `all`, `member`, `activist`, `organizer` (wajib, default: `all`).
  * `event_date`: Tanggal dan jam pelaksanaan (wajib, DateTime ISO).
    * **Validasi Pembuatan Event Baru**: **`event_date >= current date`** (waktu saat request dibuat). Form menolak tanggal di masa lampau dan menampilkan pesan error validasi.
  * `location`: Lokasi kegiatan (wajib, teks).
  * `point_reward`: Poin presensi jemaat (angka positif, default mengikuti master data).
  * `max_late_minutes`: Batas menit toleransi keterlambatan (`0` jika toggle Late Penalty dimatikan).
  * `late_penalty_points`: Jumlah potongan poin jika terlambat (`0` jika toggle Late Penalty dimatikan).
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
  * **Deteksi Keterlambatan Otomatis**: Jika `late_penalty_points > 0` dan waktu scan `scanned_at > event_date (waktu mulai aktif) + max_late_minutes`, sistem otomatis menandai `is_late: true` dan mencatat `late_penalty_applied = event.late_penalty_points`. Sebaliknya, apabila `late_penalty_points === 0` (kebijakan keterlambatan dinonaktifkan), `is_late` **selalu bernilai `false`** dan `late_penalty_applied = 0` meski jemaat melakukan check-in berjam-jam setelah acara dimulai.
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
    * Organizer dapat menetapkan peran pelayanan jemaat melalui dropdown/picker Badge Activity (`GET /api/configure/badge-activities?is_active=true&page=1&limit=5&paginated=true`, initial load 5 item + *infinite scroll* saat daftar peran digulir ke bawah).
    * Filter kategori pada halaman `/events` juga memuat kategori aktif secara bertahap (`limit=5` per fetch + *infinite scroll* saat menu filter kategori digulir).
    * Saat dipilih, tampil badge **"Badge Activity: +30 Pts"** di samping nama jemaat.
  * **Badge Keterlambatan (*Late Badge*)**:
    * Muncul otomatis sebagai badge **"Late (-15 Pts)"** di samping nama jemaat jika jemaat di-scan melewati batas toleransi `max_late_minutes`.
  * Pembatalan presensi: Tombol hapus kehadiran peserta tertentu (`DELETE /api/events/:id/attendances/:userId`) selama event belum berstatus `closed`.

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
  - `search` (string — pencarian lintas bulan pada judul, lokasi, deskripsi)
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
  - **Validasi Transisi ke `active`**: Transisi status menjadi `active` **tidak diizinkan jika tanggal saat ini sudah melewati tanggal pelaksanaan event (`current date > event.event_date`)** — acara yang sudah terlewat jadwalnya wajib di-*reschedule* atau di-*cancel*. Aktivasi diizinkan pada atau sebelum tanggal pelaksanaan (`current date <= event.event_date`). Jika panitia mencoba mengaktifkan event yang tanggalnya sudah terlewat (`current date > event.event_date`), server menolak dengan `400 Bad Request` dan pesan error: `"Event cannot be activated because its scheduled date has already passed"`.
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
- **Error 400 Bad Request (Start Event Kadaluwarsa / Tanggal Terlewati)**:
  ```json
  {
    "status": "error",
    "code": 400,
    "message": "Event cannot be activated because its scheduled date has already passed"
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
| **AC-EVT-03** | `organizer` membuka rekap presensi di `/events/:id/attendances` | Berhasil menampilkan total kehadiran, daftar peserta, nomor anggota, dan tombol hapus (selama status `active`). |
| **AC-EVT-04** | Form create/edit event dibuka oleh organizer | Field status **tidak ada** berupa dropdown. Event baru otomatis tersimpan sebagai `scheduled`. |
| **AC-EVT-05** | Organizer mengklik tombol action "Start Event" pada event `scheduled` pada atau sebelum tanggal jadwalnya (`current date <= event_date`) | Status event berubah menjadi `active` via `PATCH /api/events/:id/status` dan `event_date` ditambatkan ke waktu start aktual (`now`) bila tidak ada reschedule eksplisit. Scanner presensi aktif dan masa toleransi keterlambatan dihitung dari waktu sesi dimulai. Data kehadiran disimpan berstatus draft dan poin belum dikreditkan. |
| **AC-EVT-06** | Organizer mengklik tombol action "Close & Finalize Event" pada event `active`, atau hari berganti melewati tanggal mulai (`current date > event_date` WIB) | Status event berubah menjadi `closed` (secara manual maupun auto-close). Sesi scanner ditutup dan poin seluruh jemaat hadir langsung dikreditkan secara batch. |
| **AC-EVT-07** | Organizer mengklik tombol action "Cancel Event" | Menampilkan modal konfirmasi, setelah disetujui status berubah menjadi `cancel`. Tidak ada pembagian poin. |
| **AC-EVT-08** | Pemilihan Event Type saat membuat event baru | Pilihan diambil dari master data `event_types`. Field poin default terisi otomatis sesuai `default_point_reward`. |
| **AC-EVT-09** | `member` membuka daftar `/events` | Hanya melihat event dengan visibilitas `all` atau `member`. Event `organizer` tersembunyi. |
| **AC-EVT-10** | `member` mengakses langsung URL event yang berstatus visibilitas `organizer` | Server mengembalikan `404 Not Found` (mencegah information leakage). |
| **AC-EVT-11** | Presensi QR ganda terhadap user yang sama pada satu event | Mengembalikan error `409 Conflict` dengan pesan "Peserta sudah tercatat hadir". |
| **AC-EVT-12** | Organizer membuat event baru dengan tanggal lampau (`event_date < current date`) | Validasi frontend & backend menolak dengan `400 Bad Request` dan pesan error "Event date cannot be in the past". Event hanya tersimpan jika `event_date >= current date`. |
| **AC-EVT-13** | Organizer menekan tombol action "Reschedule Event" pada event `cancel` | Menampilkan modal pemilihan tanggal baru (`event_date >= current date`). Setelah disimpan, status event berubah kembali menjadi `scheduled` via `PATCH /api/events/:id/status`. |
| **AC-EVT-14** | Organizer mencoba menekan "Start Event" ketika tanggal saat ini sudah melewati jadwal pelaksanaan event (`current date > event_date`) | Tombol di UI disabled / request `PATCH status: active` ditolak oleh backend dengan `400 Bad Request` dan pesan "Event cannot be activated because its scheduled date has already passed" (event harus di-reschedule atau di-cancel). |
| **AC-EVT-15** | User membuka halaman `/events` | Kalender langsung menyorot tanggal **Today** sebagai tanggal aktif dan hanya menampilkan event pada tanggal tersebut (`active` -> `scheduled` -> `closed` -> `cancel`). Tidak ada tombol "Full Month" / "Show All" atau kondisi tanpa tanggal terpilih; event di hari lain terlihat dari *dot* kalender dan dapat diklik langsung. |
| **AC-EVT-16** | Organizer baru saja membuat event untuk tanggal mendatang (di bulan ini maupun bulan depan) | Setelah submit sukses, kalender (`activeMonth`) dan tanggal aktif (`selectedDate`) otomatis berpindah ke tanggal pelaksanaan event baru tersebut sehingga langsung tampil di daftar. |
| **AC-EVT-17** | Organizer menggunakan form Create/Edit Event dan toggle Late Penalty | Form tertata dalam 3 bagian terstruktur dengan deskripsi selalu terlihat, chip lokasi cepat, `DateTimePickerPopover` ber-preset tanggal/waktu (menonaktifkan tanggal lampau saat create), dan toggle `<Switch>` **"Apply Late Penalty"** yang mengirim `0` jika dimatikan. |
| **AC-EVT-18** | Organizer mengeksekusi aksi CRUD Event (Create, Update, Duplicate, Delete, Status, Remove Attendance) | Muncul banner toast berbahasa Inggris yang informatif (sukses atau error) tanpa memakai browser `alert()`. |
| **AC-EVT-19** | Pengguna membuka halaman Detail Event | Seluruh tampilan memakai token semantik `DESIGN.md`, tidak menampilkan tombol/link Google Calendar export maupun teks hardcoded Vihara Tri Maha Dharma, menampilkan lokasi pintar (virtual vs ruangan Vihara Sekkha), serta menampilkan `"No Penalty (0 Pts)"` bila penalti bernilai 0. |

---

## 11. User Stories

| ID | Sebagai | Saya ingin | Supaya |
| --- | --- | --- | --- |
| **US-EVT-01** | Jemaat (`member` / `activist`) | Melihat daftar jadwal acara vihara yang relevan dengan hak akses peran saya | Saya dapat merencanakan kehadiran dan berpartisipasi aktif dalam kegiatan komunitas vihara |
| **US-EVT-02** | Organizer / Admin | Membuat acara baru dengan memilih jenis kegiatan dari Master Data Event Type yang otomatis mengisi poin dan aturan keterlambatan | Konfigurasi acara konsisten, terstandarisasi, dan hemat waktu tanpa pengisian manual berulang |
| **US-EVT-03** | Organizer / Admin | Sistem memvalidasi tanggal acara baru agar tidak berada di masa lampau (`event_date >= current date`) | Jadwal kegiatan vihara selalu valid dan logis |
| **US-EVT-04** | Organizer / Admin | Mengendalikan transisi status acara menggunakan Action Button kontekstual (bukan dropdown form biasa) | Status acara terkelola secara aman, berurutan, dan terhindar dari ketidaksengajaan manipulasi data |
| **US-EVT-05** | Organizer / Admin | Mengaktifkan sesi acara ("Start Event") pada atau sebelum tanggal jadwalnya | Sesi absensi dibuka secara tepat waktu dan acara yang sudah kadaluwarsa tidak diaktifkan tanpa rescheduling |
| **US-EVT-06** | Organizer / Admin | Menutup acara yang sedang berjalan ("Close & Finalize Event") dengan satu klik | Data presensi terkunci dan perolehan poin kehadiran serta streak mingguan jemaat dikreditkan secara otomatis |
| **US-EVT-07** | Organizer / Admin | Membatalkan acara yang berhalangan hadir atau batal dilaksanakan melalui modal konfirmasi terarah | Acara yang batal tercatat jelas dalam sistem tanpa ada kredit poin atau data presensi liar |
| **US-EVT-08** | Organizer / Admin | Menjadwalkan ulang acara yang dibatalkan ("Reschedule Event") ke tanggal masa depan | Acara yang tertunda dapat dilanjutkan kembali tanpa perlu membuat data acara baru dari nol |
| **US-EVT-09** | Organizer / Admin | Mengakses scanner presensi dan rekapitulasi kehadiran secara eksklusif | Operasional presensi dan data kehadiran jemaat terproteksi dari akses yang tidak berwenang |
| **US-EVT-10** | Jemaat (`member`) | Menerima respons `404 Not Found` jika mengakses URL acara dengan visibilitas internal pengurus | Informasi kegiatan internal vihara tidak bocor ke pihak yang tidak memiliki hak akses (*information disclosure prevention*) |

---

## 12. Test Cases (Matriks Pengujian Terinci)

| Test Case ID | Kategori | Skenario / Deskripsi | Kondisi Awal (Preconditions) | Langkah Pengujian | Hasil yang Diharapkan | Tipe |
| --- | --- | --- | --- | --- | --- | --- |
| **TC-EVT-01** | Visibility Filtering | Member membuka daftar acara `/events` | Akun ber-role `member` login aktif | Kirim `GET /api/events` dengan token member. | HTTP 200 envelope. Daftar acara hanya memuat event dengan `visibility: "all"` atau `"member"`. Event `visibility: "organizer"` atau `"activist"` tidak muncul. | Positive |
| **TC-EVT-02** | Visibility Filtering | Activist membuka daftar acara `/events` | Akun ber-role `activist` login aktif | Kirim `GET /api/events` dengan token activist. | HTTP 200 envelope. Daftar acara hanya memuat event dengan `visibility: "all"` atau `"activist"`. Event khusus `member` atau `organizer` tidak muncul. | Positive |
| **TC-EVT-03** | Visibility Filtering | Organizer / Admin membuka daftar acara `/events` | Akun ber-role `organizer` atau `admin` login aktif | Kirim `GET /api/events` dengan token organizer/admin. | HTTP 200 envelope. Seluruh acara tampil tanpa batasan visibilitas (`all`, `member`, `activist`, `organizer`). | Positive |
| **TC-EVT-04** | Security / Visibility | Member mengakses detail acara internal pengurus secara langsung | Event `evt_priv` dibuat dengan `visibility: "organizer"`, user ber-role `member` | Kirim `GET /api/events/evt_priv` dengan token member. | HTTP 404 Not Found envelope ("Event tidak ditemukan"). Mencegah user mengidentifikasi keberadaan acara internal via status 403. | Security |
| **TC-EVT-05** | Event Creation | Organizer membuat acara baru dengan tanggal masa depan | Role `organizer`, master data `event_types` aktif tersedia | Kirim `POST /api/events` dengan `title`, `event_type_id`, `event_date: now + 3 hari`, `location`, `visibility: "all"`. | HTTP 201 Created envelope. Event tersimpan dengan status `scheduled`, `point_reward` dan `max_late_minutes` terisi otomatis dari master data. | Positive |
| **TC-EVT-06** | Event Creation | Organizer membuat acara baru dengan tanggal masa lalu | Role `organizer` | Kirim `POST /api/events` dengan `event_date: now - 1 hari`. | HTTP 400 Bad Request envelope ("Event date cannot be in the past"). Event tidak tersimpan di database. | Negative |
| **TC-EVT-07** | Event Creation | Organizer membuat acara baru tanpa memilih jenis acara (`event_type_id`) | Role `organizer` | Kirim `POST /api/events` tanpa field `event_type_id`. | HTTP 400 Bad Request envelope ("Jenis event (event_type_id) wajib dipilih"). | Negative |
| **TC-EVT-08** | Role Authorization | Member atau Activist mencoba membuat acara baru | Akun ber-role `member` atau `activist` | Kirim `POST /api/events` dengan payload acara lengkap. | HTTP 403 Forbidden envelope ("Forbidden: Insufficient permissions"). Pembuatan ditolak oleh role guard. | Security |
| **TC-EVT-09** | Status Transition | Organizer memulai acara pada tanggal jadwalnya ("Start Event") | Event berstatus `scheduled`, `current date <= event_date` (baik lebih awal atau lebih lambat jamnya di hari H) | Kirim `PATCH /api/events/:id/status` dengan `{ "status": "active" }`. | HTTP 200 envelope. Status event berubah menjadi `active` dan `event_date` diperbarui ke waktu start aktual (`now`) agar toleransi keterlambatan dihitung dari sesi dimulai. Scanner presensi terbuka, data kehadiran siap dicatat berstatus draft. | Positive |
| **TC-EVT-10** | Status Transition | Organizer mencoba memulai acara yang tanggalnya sudah lampau | Event berstatus `scheduled`, `now > event_date` (misal terlewat 1 hari) | Kirim `PATCH /api/events/:id/status` dengan `{ "status": "active" }`. | HTTP 400 Bad Request envelope ("Event cannot be activated because its scheduled date has already passed"). Event wajib di-reschedule atau di-cancel. | Negative / Edge Case |
| **TC-EVT-11** | Status Transition | Organizer menutup acara ("Close & Finalize Event") atau sistem auto-close saat `current date > start event_date` | Event berstatus `active`, beberapa peserta sudah tercatat draft | Kirim `PATCH /api/events/:id/status` dengan `{ "status": "closed" }` atau jalankan `autoCloseExpiredActiveEvents` / akses event ketika tanggal berganti (`current date > event_date` WIB). | HTTP 200 / auto-close tereksekusi. Status event berubah menjadi `closed`. Presensi ditandai `isFinalized: true`, poin jemaat dikreditkan batch, streak diperbarui, event `event.closed` terbit ke EventBus. | Positive |
| **TC-EVT-12** | Status Transition | Organizer mencoba menutup acara yang masih berstatus `scheduled` | Event berstatus `scheduled` | Kirim `PATCH /api/events/:id/status` dengan `{ "status": "closed" }`. | HTTP 400 Bad Request envelope ("Only active events can be closed and finalized"). Transisi status harus melalui `active`. | Negative |
| **TC-EVT-13** | Status Transition | Organizer membatalkan acara berjalan ("Cancel Event") | Event berstatus `active` atau `scheduled` | Kirim `PATCH /api/events/:id/status` dengan `{ "status": "cancel" }`. | HTTP 200 envelope. Status event berubah menjadi `cancel`. Sesi scanner ditutup dan tidak ada distribusi poin ke peserta. | Positive |
| **TC-EVT-14** | Reschedule Event | Organizer menjadwalkan ulang acara yang telah dibatalkan | Event berstatus `cancel` | Kirim `PATCH /api/events/:id/status` dengan `{ "status": "scheduled", "event_date": now + 7 hari }`. | HTTP 200 envelope. Status event kembali menjadi `scheduled` dengan tanggal baru yang telah diperbarui. | Positive |
| **TC-EVT-15** | Reschedule Event | Organizer mencoba reschedule acara yang dibatalkan ke tanggal masa lalu | Event berstatus `cancel` | Kirim `PATCH /api/events/:id/status` dengan `{ "status": "scheduled", "event_date": now - 2 jam }`. | HTTP 400 Bad Request envelope ("Rescheduled event date cannot be in the past."). Tanggal dan status tidak berubah. | Negative |
| **TC-EVT-16** | Data Integrity | Form edit umum mencoba memanipulasi status event | Event berstatus `scheduled` | Kirim `PUT /api/events/:id` dengan payload menyertakan `{ "status": "closed" }`. | Server mengabaikan field `status` pada endpoint `PUT`. Status event tetap `scheduled` (perubahan status hanya diizinkan via `PATCH /status`). | Security |
| **TC-EVT-17** | Data Immutability | Organizer mencoba mengedit data acara yang sudah berstatus `closed` | Event berstatus `closed` | Kirim `PUT /api/events/:id` dengan judul baru. | HTTP 400 Bad Request envelope ("Event yang sudah ditutup tidak dapat diubah."). Data event yang sudah difinalisasi bersifat terkunci (*immutable*). | Negative / Edge Case |
| **TC-EVT-18** | Data Deletion | Organizer mencoba menghapus acara yang sudah ditutup | Event berstatus `closed` | Kirim `DELETE /api/events/:id` dengan token organizer. | HTTP 400 Bad Request envelope ("Event yang sudah ditutup tidak dapat dihapus."). Integritas riwayat kehadiran dan audit poin tetap terjaga. | Negative / Security |
| **TC-EVT-19** | Always-Active Date (Default Today) | Halaman `/events` selalu memilih tanggal aktif secara default tanpa menampilkan list sebulan penuh | Bulan aktif memiliki event `closed` tgl 2, `active` hari ini, dan `scheduled` tgl 24 | 1. Buka `/events`.<br>2. Klik ulang tanggal hari ini di kalender.<br>3. Klik tgl 24 di kalender. | Saat dibuka, `selectedDate` otomatis terpilih ke **Today** (menampilkan event hari ini). Mengklik ulang tanggal yang aktif tidak membuatnya kosong/unselected, dan tombol `Full Month` / `Show All` tidak ada. Mengklik tgl 24 memindahkan list ke event tgl 24 (urut `active` -> `scheduled` -> `closed` -> `cancel`). | Positive |
| **TC-EVT-20** | Calendar Month Nav & Global Search | Pindah bulan tetap menjaga tanggal aktif, sementara Search menampilkan hasil lintas tanggal | Berada di `/events` dengan tanggal aktif hari ini | 1. Klik Next month lalu klik Today.<br>2. Ketik kata kunci judul event di Search Bar, lalu hapus. | Saat pindah bulan, tanggal aktif otomatis memilih tgl 1 bulan target (atau `Today` saat tombol Today / kembali ke bulan berjalan). Saat Search terisi, hasil tampil lintas tanggal/bulan; setelah dibersihkan kembali menampilkan event tanggal aktif. | Positive |
| **TC-EVT-21** | Post-Create Navigation | Organizer membuat event baru untuk tanggal mendatang | Tanggal aktif di Today (11 Nov); event baru dijadwalkan untuk 24 Nov atau 3 Des | Submit form Create Event. | Kalender (`activeMonth`) dan tanggal aktif (`selectedDate`) otomatis berpindah ke 24 Nov / 3 Des sehingga event baru langsung tampil di layar. | Positive |
| **TC-EVT-22** | Late Penalty Toggle & Presets | Organizer membuat event tanpa penalti keterlambatan dengan preset jadwal/lokasi | Organizer membuka Create New Event | 1. Pilih preset tanggal `Tomorrow` & jam `09:00` serta chip `Main Hall`.<br>2. Matikan toggle **"Apply Late Penalty"**.<br>3. Submit form. | Input Grace Period/Penalty tersembunyi saat OFF; payload mengirim `max_late_minutes: 0` dan `late_penalty_points: 0`; kalender tanggal lampau nonaktif saat create. | Positive / UX |
| **TC-EVT-23** | CRUD Action Toasts | Organizer membuat, menduplikasi, mengubah status, dan menghapus event | Role `organizer` di halaman `/events` | Jalankan Create, Update, Duplicate, Start/Close Event, dan Delete Event. | Setiap aksi menampilkan toast feedback English yang sesuai (`Event created successfully!`, `Event duplicated successfully!`, `Event deleted successfully.`, dll.) dan tidak memanggil `window.alert()`. | Positive / UX |
| **TC-EVT-24** | Smart Location & No Calendar Export | Pengguna membuka Detail Event fisik maupun virtual | Tersedia event berlokasi `"Main Hall"` dan event berlokasi `"Online (Zoom)"` | Buka tab Overview kedua event. | Tidak ada tombol Google Calendar export; lokasi `"Online (Zoom)"` menampilkan subjudul `"Online Virtual Session"` tanpa query Maps palsu, sedangkan `"Main Hall"` menampilkan `"Vihara Sekkha Community Center"` + tautan Maps `"Vihara Sekkha Main Hall"`. | Positive / UX |
| **TC-EVT-25** | Design Tokens & Zero Penalty Label | Memverifikasi token warna dan penalti 0 di Detail Event | Event memiliki `late_penalty_points: 0` | Buka Detail Event tab Overview. | Komponen memakai semantic tokens `DESIGN.md` (`bg-canvas`, `bg-surface-soft`, `border-hairline`, `text-ink`) dan baris Late Penalty menampilkan `"No Penalty (0 Pts)"`. | Positive / UI |



