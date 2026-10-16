# Spesifikasi Kontrak API: Domain Acara & Presensi (`event`)

Dokumen ini mendefinisikan kontrak komunikasi resmi untuk manajemen acara vihara, penjadwalan, otorisasi pemindaian QR code presensi, dan *streaming* kehadiran real-time via Server-Sent Events (SSE).

---

## 1. Ikhtisar Modul
- **Base Route**: `/api/events`
- **Tingkat Akses & Otorisasi**:
  - `GET /api/events` & `GET /api/events/:id`: Terbuka untuk seluruh pengguna terautentikasi (`umat`, `aktivis`, `pengurus`, `admin`), namun difilter berdasarkan status event dan visibilitas (event `draft`/`cancelled` dan event khusus panitia tersembunyi dari `umat`).
  - `POST /api/events`, `PUT /:id`, `PATCH /:id/status`, `DELETE /:id`: Dibatasi khusus untuk **`pengurus`** dan **`admin`**.
  - `POST /:id/attendances` & `GET /:id/live-attendance`: Dibatasi khusus untuk panitia (**`aktivis`**, **`pengurus`**, dan **`admin`**). Anggota biasa tidak dapat memindai event secara mandiri.
- **Real-Time Feed**: Menggunakan standard **Server-Sent Events (SSE)** via endpoint `GET /api/events/:id/live-attendance`.

---

## 2. Rincian Endpoint

### 2.1. `GET /api/events`
Mengambil daftar acara mendatang dan berlangsung.

- **Headers**: `Authorization: Bearer <accessToken>`
- **Query Parameters**:
  - `page` (number, default: 1)
  - `limit` (number, default: 20, max: 50)
- **Response (200 OK)**:
  ```json
  [
    {
      "id": "evt_sunday_puja_01",
      "title": "Kebaktian Remaja Minggu Pagi",
      "description": "Kebaktian rutin mingguan dan sharing dhamma.",
      "location": "Dhammasala Utama",
      "event_date": "2026-09-20T09:00:00.000Z",
      "event_type": "rutin",
      "event_type_id": "typ_rutin_01",
      "season_id": "sea_2026_q3",
      "tag": "Remaja",
      "status": "published",
      "visibility": "all",
      "qr_code": {
        "code": "EVT-2026-ABC123XYZ",
        "expires_at": null
      }
    }
  ]
  ```
  *Catatan: Objek `qr_code` hanya disertakan jika peminta memiliki role `pengurus` atau `admin`.*

---

### 2.2. `GET /api/events/:id`
Mengambil detail satu acara secara spesifik.

- **Headers**: `Authorization: Bearer <accessToken>`
- **Response (200 OK)**:
  ```json
  {
    "id": "evt_sunday_puja_01",
    "title": "Kebaktian Remaja Minggu Pagi",
    "description": "Kebaktian rutin mingguan dan sharing dhamma.",
    "location": "Dhammasala Utama",
    "event_date": "2026-09-20T09:00:00.000Z",
    "event_type": "rutin",
    "event_type_id": "typ_rutin_01",
    "season_id": "sea_2026_q3",
    "tag": "Remaja",
    "status": "active",
    "visibility": "all",
    "qr_code": {
      "code": "EVT-2026-ABC123XYZ",
      "expires_at": null
    }
  }
  ```
- **Errors**:
  - `404 Not Found`: Event tidak ditemukan.
  - `403 Forbidden`: Event dalam status draft/batal atau visibility khusus yang tidak berhak diakses oleh role pengguna saat ini.

---

### 2.3. `POST /api/events`
Membuat jadwal acara baru (Pengurus / Admin).

- **Security**: `requireRole("pengurus", "admin")`
- **Request Body**:
  ```json
  {
    "title": "Pekan Penghayatan Dhamma 2026",
    "description": "Retreat meditasi dan pendalaman sutta 3 hari.",
    "location": "Bhavana Center",
    "event_date": "2026-10-15T08:00:00.000Z",
    "event_type_id": "typ_khusus_02",
    "season_id": "sea_2026_q4",
    "tag": "Retreat",
    "visibility": "all"
  }
  ```
- **Response (201 Created)**: Objek data acara yang berhasil dibuat.

---

### 2.4. `PUT /api/events/:id`
Memperbarui informasi acara yang sudah ada.

- **Security**: `requireRole("pengurus", "admin")`
- **Request Body**: Sama seperti `POST /api/events` (dengan data yang diperbarui).
- **Response (200 OK)**: Objek data acara yang telah diperbarui.

---

### 2.5. `PATCH /api/events/:id/status`
Mengubah siklus hidup acara (`draft` → `published` → `active` → `closed` → `cancelled`).

- **Security**: `requireRole("pengurus", "admin")`
- **Request Body**:
  ```json
  {
    "status": "active"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "id": "evt_sunday_puja_01",
    "status": "active"
  }
  ```

---

### 2.6. `POST /api/events/:id/attendances` (atau `POST /api/events/:id/attendance`)
Mencatat presensi kehadiran peserta oleh panitia atau pengurus.

- **Security**: `requireRole("pengurus", "admin", "aktivis")`
- **Aturan Bisnis**: Event harus berstatus `active` atau `published`.
- **Request Body (Mode Pindai QR Anggota atau Input User ID)**:
  ```json
  {
    "method": "qr",
    "user_id": "usr_clexample123"
  }
  ```
  ATAU pencarian manual berdasarkan nomor anggota / email / kode:
  ```json
  {
    "method": "manual",
    "user_id": "usr_clexample123"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "user_id": "usr_clexample123",
    "name": "Budi Santoso",
    "user_number": "NV-2026-0042",
    "method": "qr",
    "points_earned": 25,
    "scanned_at": "2026-09-20T09:12:45.000Z",
    "status": "staged"
  }
  ```
- **Errors**:
  - `400 Bad Request`: Event belum dibuka / tidak berstatus aktif (`"Presensi hanya dapat dicatat saat acara berstatus active"`).
  - `409 Conflict`: Kehadiran duplikat (`"DUPLICATE_ATTENDANCE: Peserta sudah tercatat hadir pada acara ini"`).
  - `403 Forbidden`: Pengguna biasa (`umat`) dilarang memanggil endpoint ini secara mandiri.

---

### 2.7. `GET /api/events/:id/live-attendance` (Server-Sent Events)
Koneksi stream real-time untuk dashboard scanner panitia, menyiarkan peserta yang baru saja dipindai di lokasi secara instan.

- **Security**: `requireRole("pengurus", "admin", "aktivis")`
- **Protokol**: HTTP SSE (`text/event-stream`). Mendukung query param `?token=<jwt>` untuk autentikasi browser `EventSource`.
- **Event Message Types**:
  1. Koneksi Inisial:
     ```
     data: {"type":"CONNECTED","eventId":"evt_sunday_puja_01"}
     ```
  2. Presensi Masuk (Broadcast Real-Time):
     ```
     event: attendance
     data: {"type":"ATTENDANCE_RECORDED","eventId":"evt_sunday_puja_01","attendance":{"userId":"usr_123","name":"Budi Santoso","userNumber":"NV-2026-0042","scannedAt":"2026-09-20T09:12:45.000Z","points":25}}
     ```

---

### 2.8. `GET /api/events/:id/attendances`
Mengambil daftar seluruh peserta yang telah tercatat hadir pada acara bersangkutan.

- **Security**: `requireRole("pengurus", "admin", "aktivis")`
- **Query Parameters**:
  - `page` (default: 1)
  - `limit` (default: 50, max: 100)
- **Response (200 OK)**:
  ```json
  [
    {
      "user_id": "usr_clexample123",
      "name": "Budi Santoso",
      "role": "umat",
      "user_number": "NV-2026-0042",
      "avatar_url": null,
      "method": "qr",
      "scanned_at": "2026-09-20T09:12:45.000Z"
    }
  ]
  ```

---

### 2.9. `DELETE /api/events/:id/attendances/:userId`
Membatalkan atau mencabut catatan presensi peserta dari acara tertentu.

- **Security**: `requireRole("pengurus", "admin")`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Presensi peserta berhasil dibatalkan."
  }
  ```

---

### 2.10. `DELETE /api/events/:id`
Menghapus acara dari sistem beserta seluruh relasi presensi terkait.

- **Security**: `requireRole("pengurus", "admin")`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Event berhasil dihapus."
  }
  ```
