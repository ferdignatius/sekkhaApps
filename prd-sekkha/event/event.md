# PRD: Event Management System — Sekkha Apps

| Metadata | Detail |
| --- | --- |
| **Dokumen** | Product Requirement Document (PRD) |
| **Fitur** | Event Management (Buat Event, Planning, Absensi QR, Visibility Berbasis Role) |
| **Aplikasi** | Sekkha Apps (Frontend & Backend) |
| **Versi** | 1.1.0 |
| **Status** | Draft / Ready for Review |

---

## 1. Ringkasan Eksekutif & Tujuan

**Event Management System** adalah fitur inti Sekkha Apps yang memungkinkan **pengurus** mengelola kegiatan komunitas vihara — mulai dari membuat event pasti (*confirmed*), hingga menyusun **rencana/planning** kegiatan yang masih tentative. Fitur ini mendukung visibilitas berbasis role sehingga konten yang relevan ditampilkan kepada audiens yang tepat tanpa memerlukan proses RSVP pra-kegiatan.

Alur utama:
1. **Pengurus / Admin** membuat event atau planning kegiatan, memilih **target audiens** (siapa yang boleh melihat jadwal kegiatan).
2. **Umat / Aktivis** (sesuai target audiens) melihat jadwal dan informasi detail event, lalu langsung hadir pada waktu kegiatan.
3. **Absensi** dicatat langsung di lokasi melalui **QR Code** (di-scan oleh aktivis/pengurus) atau secara manual.
4. Kehadiran terintegrasi dengan sistem **poin & gamifikasi** (badge, level, streak).

---

## 2. Definisi Role & Hak Akses

Mengikuti role system dari PRD Auth (lihat `prd/auth/auth.md`):

| Role | Lihat Event | Buat / Edit / Hapus Event | Scan Absensi | Lihat Rekap Kehadiran |
| --- | :---: | :---: | :---: | :---: |
| `umat` | v (sesuai target audiens) | x | x | x |
| `aktivis` | v (sesuai target audiens) | x | v | x |
| `pengurus` | v (semua, termasuk internal) | v | v | v |
| `admin` | v (semua) | v | v | v |

---

## 3. Konsep: Event Type & Status

### 3.1. Tipe Event (`event_type`)

| Tipe | Label UI | Deskripsi |
| --- | --- | --- |
| `kebaktian` | Kebaktian | Kebaktian rutin atau khusus |
| `retreat` | Retreat | Kegiatan retreat / pendalaman Dhamma |
| `meditasi` | Meditasi | Sesi meditasi reguler atau tematik |
| `sosial` | Sosial | Kegiatan bakti sosial / komunitas |
| `rapat` | Rapat | Rapat internal pengurus / aktivis |
| `pelatihan` | Pelatihan | Workshop, pelatihan, atau diskusi |
| `lainnya` | Lainnya | Event di luar kategori di atas |

### 3.2. Status Event (`event_status`)

| Status | Label UI | Deskripsi |
| --- | --- | --- |
| `planning` | Planning | Rencana kegiatan — masih tentative, belum pasti |
| `upcoming` | Akan Datang | Event sudah terkonfirmasi & terjadwal |
| `ongoing` | Berlangsung | Event sedang berlangsung |
| `completed` | Selesai | Event sudah selesai dilaksanakan |
| `cancelled` | Dibatalkan | Event dibatalkan |

> **Catatan Planning**: Event berstatus `planning` bersifat *draft publik* (atau internal, tergantung target audiens). Pengurus dapat mempromosikan status dari `planning` ke `upcoming` saat sudah terkonfirmasi.

---

## 4. Konsep: Target Audiens (`visibility`)

Setiap event memiliki pengaturan **target audiens** yang menentukan siapa yang dapat melihat jadwal event tersebut.

| Nilai `visibility` | Label UI | Siapa yang bisa melihat |
| --- | --- | --- |
| `all` | Semua | Semua role (`umat`, `aktivis`, `pengurus`, `admin`) |
| `umat` | Umat | Hanya `umat`, `pengurus`, `admin` |
| `aktivis` | Aktivis | Hanya `aktivis`, `pengurus`, `admin` |
| `pengurus_only` | Internal Pengurus | Hanya `pengurus` & `admin` — tidak terlihat oleh `umat` & `aktivis` |

> **Aturan Penting**: Event dengan `visibility: "pengurus_only"` **tidak muncul sama sekali** di daftar event yang dilihat oleh `umat` dan `aktivis`, baik di list maupun detail view. Backend memvalidasi ini di query level.

---

## 5. Spesifikasi Fitur

### 5.1. Melihat Daftar Event (`GET /events`)

#### Tampilan & Filter
* **Halaman**: `/events`
* **Tampilan default**: Kalender bulanan + daftar upcoming events di bawahnya
* **Toggle view**: Kalender vs List view
* **Filter yang tersedia**:
  * Berdasarkan `event_type` (multi-select chip)
  * Berdasarkan `event_status` (default: tampilkan `upcoming` + `ongoing`)
  * Berdasarkan bulan (navigasi kalender)
* **Badge status** di setiap event card: warna berbeda per status

#### Visibility Logic (Backend)

Query ke database otomatis difilter berdasarkan role user:
* `umat` — tampilkan event dengan `visibility IN ('all', 'umat')` DAN `event_status != 'planning'`
* `aktivis` — tampilkan event dengan `visibility IN ('all', 'aktivis')`
* `pengurus` / `admin` — tampilkan semua event tanpa filter visibility

> **Planning untuk umat**: Event berstatus `planning` **tetap disembunyikan dari `umat`** meskipun `visibility: 'all'`. Umat hanya melihat event yang sudah `upcoming`, `ongoing`, atau `completed`.

#### Event Card (UI)

Setiap event card menampilkan:
* Nama event + ikon tipe
* Tanggal & waktu
* Lokasi (singkat)
* Badge status (Planning, Akan Datang, dll.)
* Badge audiens (hanya terlihat oleh pengurus: Internal, Semua, dll.)
* Reward Poin (jika ada)

---

### 5.2. Detail Event (`GET /events/:id`)

* **Halaman**: `/events/:id`
* **Konten**:
  * Header: nama event, tipe, tanggal & waktu, lokasi (dengan link maps jika ada)
  * Deskripsi lengkap event (support rich text / markdown)
  * Status badge + badge audiens (khusus pengurus)
  * Catatan planning (jika status `planning`): *"Kegiatan ini masih dalam tahap perencanaan. Detail dapat berubah."*
  * Poin reward & badge yang bisa diperoleh
  * Tombol aksi sesuai role & status:

| Kondisi | Tombol Tersedia |
| --- | --- |
| `ongoing` (aktivis/pengurus) | **Buka Scanner Absensi** |
| `completed` (pengurus/admin) | **Lihat Rekap Kehadiran** |
| Pengurus/Admin (semua status) | **Edit Event** dan **Hapus Event** |

---

### 5.3. Buat / Edit Event (Pengurus & Admin)

* **Halaman**: `/events/new` (buat) dan `/events/:id/edit` (edit)
* **Akses**: Hanya `pengurus` & `admin`

#### Form Fields:

| Field | Label UI | Tipe | Wajib | Keterangan |
| --- | --- | --- | :---: | --- |
| `title` | Nama Event | Text input | Ya | Maks. 100 karakter |
| `description` | Deskripsi | Rich text / Textarea | Tidak | Penjelasan detail event |
| `event_type` | Jenis Kegiatan | Dropdown/Select | Ya | Lihat pasal 3.1 |
| `event_status` | Status | Dropdown/Select | Ya | `planning` atau `upcoming` saat buat. Default: `upcoming` |
| `visibility` | Target Audiens | Radio / Select | Ya | Lihat pasal 4. Default: `all` |
| `start_datetime` | Tanggal & Waktu Mulai | DateTime picker | Kondisional | Wajib jika status `upcoming`. Opsional untuk `planning` |
| `end_datetime` | Tanggal & Waktu Selesai | DateTime picker | Tidak | Opsional |
| `location_name` | Lokasi | Text input | Tidak | Nama tempat |
| `location_url` | Link Maps | URL input | Tidak | Google Maps / Waze link |
| `capacity` | Kapasitas Peserta | Number input | Tidak | Estimasi kapasitas / batas kuota (opsional) |
| `planning_notes` | Catatan Planning | Textarea | Tidak | Khusus status `planning`. Hanya terlihat oleh pengurus |
| `point_reward` | Poin Kehadiran | Number input | Tidak | Poin yang diberikan saat hadir. Default: 0 |
| `badge_id` | Badge Reward | Select (dari master data) | Tidak | Badge yang unlock otomatis saat hadir |

#### Aturan Validasi:
1. `title`: Wajib, minimal 3 karakter.
2. `start_datetime`: Wajib jika `event_status = 'upcoming'`. Boleh kosong untuk `planning`.
3. `end_datetime`: Jika diisi, harus setelah `start_datetime`.
4. `capacity`: Jika diisi, harus angka positif >= 1.
5. `visibility`: Wajib dipilih.

#### Promosi Status Planning ke Upcoming:

Di halaman edit event berstatus `planning`, tersedia **banner/callout** dengan tombol **"Konfirmasi & Jadwalkan Event"** yang secara otomatis:
* Mengubah `event_status` ke `upcoming`
* Mewajibkan pengisian `start_datetime` jika belum ada
* Mengirim notifikasi (future feature) ke audiens yang dituju

---

### 5.4. Hapus Event

* **Akses**: Hanya `pengurus` & `admin`
* **Behavior**:
  * Event dengan status `upcoming` / `planning` dapat dihapus langsung.
  * Event dengan status `completed` / `ongoing` memerlukan konfirmasi dengan dialog modal.
  * Jika event dihapus, data absensi terkait ikut terhapus (cascade delete).
* **UX**: Setelah hapus, redirect ke `/events` dengan toast success.

---

### 5.5. Absensi via QR Code

Sistem absensi menggunakan QR Code yang di-scan oleh **aktivis** atau **pengurus** saat event berlangsung di lokasi.

#### Alur Absensi:

```
User hadir di event
      |
Aktivis/Pengurus buka halaman Scanner (/events/:id/scan)
      |
Kamera membaca QR Code milik user
      |
POST /v1/events/:id/attendance { qr_token: "..." }
      |
Backend validasi token, catat kehadiran
      |
EventBus: publish("attendance.recorded", { event_id, user_id, point_reward })
      |
Dashboard module: tambah poin, cek badge/level
```

#### QR Code User:
* Setiap user memiliki **QR Code unik** yang ter-generate dari `user_id` + secret dengan masa berlaku 24 jam per sesi.
* QR Code dapat diakses di halaman **Profil -> QR Saya** (`/profile/qr`).
* QR Code menampilkan nama & foto profil user untuk verifikasi visual.

#### Halaman Scanner (`/events/:id/scan`):
* **Akses**: Hanya `aktivis`, `pengurus`, `admin`
* **Fitur**:
  * Live camera feed dengan overlay frame QR scanner
  * Feedback sukses / duplikat / error secara real-time (toast + suara beep opsional)
  * Counter real-time: total orang yang sudah hadir
  * Daftar absensi (nama + waktu scan) scrollable di bawah kamera
  * Tombol **Absensi Manual** untuk fallback tanpa QR

#### Absensi Manual (Fallback):
* **Endpoint**: `POST /v1/events/:id/attendance/manual`
* Field: `user_id` (search/autocomplete dari data umat/pengguna)
* Hanya `pengurus` & `admin` yang dapat melakukan absensi manual

---

### 5.6. Rekap Kehadiran Event (Pengurus & Admin)

* **Halaman**: `/events/:id/attendances`
* **Akses**: Hanya `pengurus` & `admin`
* **Konten**:
  * Ringkasan: total peserta hadir & kapasitas (jika diisi)
  * Tabel: Nama, Foto, Waktu Hadir, Via (QR / Manual)
  * Export ke CSV (future feature)

---

## 6. Fitur Planning (Khusus Pengurus)

Pengurus dapat membuat **rencana kegiatan** yang belum dikonfirmasi sebagai event resmi. Fitur ini berfungsi sebagai **internal calendar pengurus** dan alat koordinasi awal.

### Karakteristik Planning:
* Status event = `planning`
* `start_datetime` **opsional** — bisa dikosongkan jika tanggal belum pasti
* Field `planning_notes` tersedia untuk catatan internal (hanya terlihat pengurus)
* Planning **tidak muncul di list event `umat`** meskipun `visibility: 'all'`
* Planning dengan `visibility: 'all'` atau `'umat'` akan **otomatis muncul di kalender umat** setelah status diubah ke `upcoming`

### Tampilan Planning di Halaman Pengurus:
* Di halaman `/events`, pengurus melihat section terpisah **"Rencana Kegiatan"** di atas list event upcoming
* Planning card dibedakan secara visual: background berbeda, badge "Planning" yang menonjol
* Tombol cepat: **"Jadwalkan"** (promosi ke `upcoming`) dan **"Edit"**

### Filter Khusus Pengurus:
* Toggle **"Tampilkan Planning"** / **"Sembunyikan Planning"** di halaman events

---

## 7. Spesifikasi API Contract

### 7.1. `GET /v1/events`

**Query Params:**

| Param | Tipe | Default | Keterangan |
| --- | --- | --- | --- |
| `status` | string (enum, multi) | `upcoming,ongoing` | Filter status. Contoh: `?status=upcoming,planning` |
| `type` | string (enum, multi) | — | Filter tipe event |
| `month` | string `YYYY-MM` | bulan ini | Filter bulan |
| `visibility` | string | — | (Admin/Pengurus only) filter berdasarkan visibility |

**Headers:** `Authorization: Bearer <token>`

**Response 200:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "evt_xyz789",
      "title": "Kebaktian Minggu Pagi",
      "event_type": "kebaktian",
      "event_status": "upcoming",
      "visibility": "all",
      "start_datetime": "2026-08-03T08:00:00Z",
      "end_datetime": "2026-08-03T10:00:00Z",
      "location_name": "Vihara Vimala Chanda",
      "location_url": "https://maps.app.goo.gl/example",
      "capacity": 100,
      "point_reward": 50,
      "planning_notes": null
    }
  ],
  "meta": {
    "total": 5,
    "month": "2026-08"
  }
}
```

---

### 7.2. `GET /v1/events/:id`

**Response 200:**
```json
{
  "status": "success",
  "data": {
    "id": "evt_xyz789",
    "title": "Kebaktian Minggu Pagi",
    "description": "Kebaktian rutin setiap Minggu pagi...",
    "event_type": "kebaktian",
    "event_status": "upcoming",
    "visibility": "all",
    "start_datetime": "2026-08-03T08:00:00Z",
    "end_datetime": "2026-08-03T10:00:00Z",
    "location_name": "Vihara Vimala Chanda",
    "location_url": "https://maps.app.goo.gl/example",
    "capacity": 100,
    "attendance_count": 38,
    "is_user_attended": false,
    "point_reward": 50,
    "badge_id": null,
    "planning_notes": null,
    "created_by": {
      "id": "usr_abc",
      "name": "Budi Pengurus"
    },
    "created_at": "2026-07-25T10:00:00Z",
    "updated_at": "2026-07-25T10:00:00Z"
  }
}
```

---

### 7.3. `POST /v1/events`

**Headers:** `Authorization: Bearer <token>` (role: `pengurus` / `admin`)

**Request Body:**
```json
{
  "title": "Rencana Retreat Akhir Tahun",
  "description": "Retreat tahunan untuk semua anggota aktif.",
  "event_type": "retreat",
  "event_status": "planning",
  "visibility": "all",
  "start_datetime": null,
  "end_datetime": null,
  "location_name": "Masih direncanakan",
  "location_url": null,
  "capacity": null,
  "point_reward": 200,
  "badge_id": null,
  "planning_notes": "Rencana: pertengahan Desember 2026. Koordinasi dengan pengurus Surabaya."
}
```

**Response 201:**
```json
{
  "status": "success",
  "data": {
    "id": "evt_new123",
    "title": "Rencana Retreat Akhir Tahun",
    "event_status": "planning"
  },
  "message": "Event berhasil dibuat"
}
```

---

### 7.4. `PUT /v1/events/:id`

**Headers:** `Authorization: Bearer <token>` (role: `pengurus` / `admin`)

Partial update didukung — kirim hanya field yang ingin diubah.

**Contoh: Promosi Planning ke Upcoming:**
```json
{
  "event_status": "upcoming",
  "start_datetime": "2026-12-15T08:00:00Z",
  "end_datetime": "2026-12-17T17:00:00Z",
  "location_name": "Puncak, Jawa Barat"
}
```

**Response 200:**
```json
{
  "status": "success",
  "data": {},
  "message": "Event berhasil diperbarui"
}
```

---

### 7.5. `DELETE /v1/events/:id`

**Response 200:**
```json
{
  "status": "success",
  "data": null,
  "message": "Event berhasil dihapus"
}
```

---

### 7.6. `POST /v1/events/:id/attendance`

**Headers:** `Authorization: Bearer <token>` (role: `aktivis` / `pengurus` / `admin`)

**Request Body:**
```json
{
  "qr_token": "eyJhbGciOiJIUzI1NiJ9..."
}
```

**Response 200:**
```json
{
  "status": "success",
  "data": {
    "attendance_id": "att_789xyz",
    "event_id": "evt_xyz789",
    "user": {
      "id": "usr_9b1deb4d",
      "name": "Hendra Santoso",
      "photo_url": "https://cdn.sekkha.app/photos/usr_9b1d.jpg"
    },
    "attended_at": "2026-08-03T08:15:00Z",
    "point_awarded": 50
  },
  "message": "Kehadiran Hendra Santoso berhasil dicatat"
}
```

**Response 409 (Sudah Hadir):**
```json
{
  "status": "error",
  "message": "Hendra Santoso sudah tercatat hadir",
  "code": "ALREADY_ATTENDED"
}
```

---

### 7.7. `GET /v1/events/:id/attendances`

**Headers:** `Authorization: Bearer <token>` (role: `pengurus` / `admin`)

**Response 200:**
```json
{
  "status": "success",
  "data": {
    "event_id": "evt_xyz789",
    "total_attended": 38,
    "attendances": [
      {
        "user": {
          "id": "usr_9b1deb4d",
          "name": "Hendra Santoso",
          "photo_url": "..."
        },
        "attended_at": "2026-08-03T08:15:00Z",
        "method": "qr"
      }
    ]
  },
  "meta": { "total": 38 }
}
```

---

## 8. Domain Events (EventBus Integration)

| Event | Publisher | Subscriber | Payload | Keterangan |
| --- | --- | --- | --- | --- |
| `event.created` | Events module | (future: notif) | `{ event_id, title, visibility }` | Trigger notifikasi ke audiens |
| `event.status_changed` | Events module | (future: notif) | `{ event_id, old_status, new_status }` | Notif saat planning ke upcoming |
| `attendance.recorded` | Events module | Dashboard/Gamification | `{ event_id, user_id, point_reward, badge_id }` | Trigger poin + badge |
| `event.cancelled` | Events module | (future: notif) | `{ event_id, title }` | Notif pembatalan kegiatan ke audiens |

---

## 9. Database Schema (Prisma)

```prisma
enum EventType {
  kebaktian
  retreat
  meditasi
  sosial
  rapat
  pelatihan
  lainnya
}

enum EventStatus {
  planning
  upcoming
  ongoing
  completed
  cancelled
}

enum EventVisibility {
  all
  umat
  aktivis
  pengurus_only
}

model Event {
  id             String          @id @default(cuid())
  title          String
  description    String?
  event_type     EventType
  event_status   EventStatus     @default(upcoming)
  visibility     EventVisibility @default(all)
  start_datetime DateTime?
  end_datetime   DateTime?
  location_name  String?
  location_url   String?
  capacity       Int?
  point_reward   Int             @default(0)
  planning_notes String?
  badge_id       String?
  created_by_id  String
  created_at     DateTime        @default(now())
  updated_at     DateTime        @updatedAt

  created_by  User         @relation(fields: [created_by_id], references: [id])
  badge       Badge?       @relation(fields: [badge_id], references: [id])
  attendances Attendance[]

  @@index([event_status, visibility])
  @@index([start_datetime])
}

model Attendance {
  id          String   @id @default(cuid())
  event_id    String
  user_id     String
  method      String   @default("qr")
  attended_at DateTime @default(now())

  event Event @relation(fields: [event_id], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@unique([event_id, user_id])
}
```

---

## 10. UI/UX & Non-Functional Requirements

### Halaman & Route

| Halaman | Route | Akses |
| --- | --- | --- |
| Daftar Event | `/events` | Semua (filtered by role) |
| Detail Event | `/events/:id` | Semua (filtered by role) |
| Buat Event | `/events/new` | `pengurus`, `admin` |
| Edit Event | `/events/:id/edit` | `pengurus`, `admin` |
| Scanner Absensi | `/events/:id/scan` | `aktivis`, `pengurus`, `admin` |
| Rekap Kehadiran | `/events/:id/attendances` | `pengurus`, `admin` |
| QR Code Saya | `/profile/qr` | Semua |

### Responsive Layout
* **Desktop (>= 1024px)**: Kalender + sidebar daftar event
* **Tablet (768px-1023px)**: Kalender full width, daftar di bawah
* **Mobile (< 768px)**: Hanya daftar (kalender dapat di-toggle), touch-friendly card

### Performance
* Event list: Pagination / infinite scroll (20 item per page)
* Scanner absensi: Debounce 500ms agar tidak double-scan
* QR token: Otomatis expire & refresh setiap 24 jam

### Keamanan
* Endpoint buat/edit/hapus event: middleware `requireRole(['pengurus', 'admin'])`
* Endpoint scan absensi: middleware `requireRole(['aktivis', 'pengurus', 'admin'])`
* Filter visibility diterapkan di **query database** (server-side), bukan hanya di frontend
* Event `pengurus_only` mengembalikan `404 Not Found` (bukan `403`) saat diakses langsung oleh `umat` agar tidak membocorkan eksistensi event

---

## 11. Matrix Kriteria Penerimaan (Acceptance Criteria)

| ID | Skenario Pengujian | Hasil yang Diharapkan |
| --- | --- | --- |
| **AC-01** | `umat` membuka `/events` | Hanya melihat event dengan `visibility IN ('all', 'umat')` dan `status != 'planning'` |
| **AC-02** | Event `pengurus_only` dibuat, kemudian `umat` membuka `/events` | Event tersebut **tidak muncul** di list. Akses langsung via URL mengembalikan 404 |
| **AC-03** | Pengurus membuat event berstatus `planning` tanpa `start_datetime` | Event tersimpan, muncul di section "Rencana Kegiatan" halaman pengurus |
| **AC-04** | Pengurus mengklik "Jadwalkan" pada event planning & mengisi tanggal | Status berubah ke `upcoming`, event muncul di kalender semua audiens yang sesuai |
| **AC-05** | Event planning dengan `visibility: 'all'` dibuat oleh pengurus | Event **tidak muncul** di list umat, hanya terlihat di section planning pengurus |
| **AC-06** | Aktivis membuka scanner, scan QR user yang belum hadir | Kehadiran tercatat, toast sukses, counter hadir bertambah |
| **AC-07** | Aktivis scan QR user yang sudah hadir | Muncul pesan "Sudah tercatat hadir", absensi tidak diduplikasi |
| **AC-08** | Absensi berhasil dicatat | EventBus publish `attendance.recorded`, poin user bertambah sesuai `point_reward` |
| **AC-09** | Pengurus membuka rekap kehadiran event selesai | Menampilkan daftar hadir + total kehadiran |
| **AC-10** | `umat` mencoba `POST /v1/events` | Mengembalikan `403 Forbidden` |
| **AC-11** | `umat` mencoba `GET /v1/events/:id` untuk event `pengurus_only` | Mengembalikan `404 Not Found` |
| **AC-12** | Pengurus menghapus event yang sudah `completed` | Dialog konfirmasi muncul. Setelah konfirmasi, event + absensi terhapus |
| **AC-13** | Event diubah statusnya ke `cancelled` | Badge "Dibatalkan" muncul di card & detail |
