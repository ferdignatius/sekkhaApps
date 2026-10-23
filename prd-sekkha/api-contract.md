# Master API Contract: Sekkha Apps

Dokumen ini adalah **sumber kebenaran tunggal (*Single Source of Truth*)** untuk seluruh kontrak antarmuka API (REST & SSE) backend `sekkha-api` yang dikonsumsi oleh `sekkha-frontend`.

---

## 1. Konvensi & Standar Global

### 1.1. Base URL & Versioning
- **Base URL**: `http://localhost:4000/api` (Development) / `/api` (Production melalui reverse proxy).
- **Protokol**: JSON over HTTP/HTTPS, dan Server-Sent Events (SSE) untuk real-time stream.
- **Tanpa URL Prefix `/v1`**: Rute langsung dipasang di bawah domain fungsional `/api/<modul>`.

### 1.2. Format Respons Standar (*Standard Envelope*)
Setiap endpoint API mengembalikan format JSON standar:

```json
{
  "status": "success",
  "code": 200,
  "message": "Request completed successfully",
  "data": {}
}
```

- `status`: `"success"` atau `"fail"`.
- `code`: Nilai integer kode status HTTP (misal: 200, 201, 400, 401, 403, 404, 409, 429, 500).
- `message`: Kalimat deskriptif dalam Bahasa Indonesia atau Inggris.
- `data`: Objek payload hasil query/mutasi saat sukses, atau `null` saat terjadi kegagalan. Untuk endpoint paginasi, metadata diletakkan di `data.pagination` atau bersama payload array.

### 1.3. Matriks Peran Pengguna (*Role Matrix*)
Sistem menggunakan 4 tingkatan peran (*role*) resmi:
| Role (Kode) | Label | Hak Akses Utama |
|---|---|---|
| `member` / `umat` | Umat Remaja | Akses profil pribadi, presensi via panitia, melihat jadwal acara publik, papan peringkat. |
| `activist` / `aktivis` | Aktivis Panitia | Seluruh hak `member` + pemindaian QR presensi jemaat (`POST /events/:id/attendances`) & live SSE stream. |
| `organizer` / `pengurus` | Pengurus Vihara | Seluruh hak `activist` + manajemen event, direktori jemaat, recency alert, analitik insight vihara, dan konfigurasi master data (read-only). |
| `admin` | Super Administrator | Akses penuh (*bypass* semua role guard), manajemen akun, reset password, CRUD konfigurasi master data, season activation, audit log. |

### 1.4. Keamanan & Proteksi Rate Limiting
1. **Autentikasi**:
   - **Access Token**: JWT berdurasi 15 menit dikirim via header `Authorization: Bearer <accessToken>`.
   - **Refresh Token**: Disimpan dalam `HttpOnly`, `SameSite=Lax`, `Secure` cookie bernama `sekkha_refresh_token` dengan rotasi token saat `/api/auth/refresh`.
2. **Perlindungan Data Pribadi (UU PDP / GDPR)**:
   - Field PII (Nomor Telepon, Tanggal Lahir, Gender) dienkripsi di level database (*at-rest*) dengan algoritma **AES-256-GCM**.
   - Pencarian email menggunakan **HMAC-SHA256 Blind Index** (`emailBindex`) sehingga pencarian $O(1)$ tetap aman tanpa mengekspos data mentah.
3. **Batas Frekuensi Permintaan (*Rate Limiting*)**:
   - **Global**: 300 req/menit per IP.
   - **Autentikasi (`/login`, `/register`, `/refresh`)**: 30 req/15 menit per IP.
   - **OTP (`/register-request`, `/forgot-password/request`)**: 5 req/15 menit per IP.
   - **Account Linking (`/link-legacy-account`)**: 5 req/15 menit per IP.
   - **Statistik Sekolah (`/schools/stats`)**: 30 req/menit per IP.

---

## 2. Daftar Isi Modul
1. [Modul 1: Autentikasi (`/api/auth`)](#modul-1-autentikasi-apiauth)
2. [Modul 2: Pengguna & Profil Pribadi (`/api/users`)](#modul-2-pengguna--profil-pribadi-apiusers)
3. [Modul 3: Beranda / Dashboard (`/api/home`)](#modul-3-beranda--dashboard-apihome)
4. [Modul 4: Acara & Presensi Real-Time (`/api/events`)](#modul-4-acara--presensi-real-time-apievents)
5. [Modul 5: Papan Peringkat / Leaderboard (`/api/leaderboard`)](#modul-5-papan-peringkat--leaderboard-apileaderboard)
6. [Modul 6: Manajemen Umat & Tim (`/api/people`)](#modul-6-manajemen-umat--tim-apipeople)
7. [Modul 7: Analitik Pengurus & Early Warning Alerts (`/api/pengurus`)](#modul-7-analitik-pengurus--early-warning-alerts-apipengurus)
8. [Modul 8: Master Data Sekolah (`/api/schools`)](#modul-8-master-data-sekolah-apischools)
9. [Modul 9: Konfigurasi & Gamifikasi Master (`/api/configure`)](#modul-9-konfigurasi--gamifikasi-master-apiconfigure)

---

## Modul 1: Autentikasi (`/api/auth`)

Mengelola registrasi akun berbasis OTP, login password, refresh sesi, dan alur lupa password 3-tahap.

### 1. `POST /api/auth/register-request`
Mengirimkan 6 digit kode OTP registrasi ke email calon pengguna.
- **Akses**: Publik
- **Request Body**:
  ```json
  {
    "email": "budi@example.com",
    "password": "Password123!",
    "name": "Budi Santoso",
    "username": "budisantoso"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "status": "success",
    "code": 200,
    "message": "Kode OTP registrasi telah dikirim ke email Anda",
    "data": { "expires_in_seconds": 600 }
  }
  ```

### 2. `POST /api/auth/register-verify-otp`
Memverifikasi kode OTP registrasi, membuat akun pengguna baru di database dengan role default `member`, dan langsung menerbitkan sesi aktif.
- **Akses**: Publik
- **Request Body**:
  ```json
  {
    "email": "budi@example.com",
    "otp": "123456"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "status": "success",
    "code": 201,
    "message": "Registrasi akun berhasil",
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
      "expiresInSeconds": 900,
      "onboarding_completed": false,
      "user": {
        "id": "usr_abc123",
        "email": "budi@example.com",
        "username": "budisantoso",
        "name": "Budi Santoso",
        "role": "member"
      }
    }
  }
  ```

### 3. `POST /api/auth/resend-otp`
Mengirim ulang OTP registrasi jika kode kedaluwarsa atau belum diterima.
- **Akses**: Publik
- **Request Body**:
  ```json
  { "email": "budi@example.com" }
  ```
- **Response (200 OK)**: Sama seperti `POST /register-request`.

### 4. `POST /api/auth/login`
Masuk dengan kredensial password.
- **Akses**: Publik
- **Request Body**:
  ```json
  {
    "identifier": "budi@example.com",
    "password": "Password123!"
  }
  ```
  *(Catatan: `identifier` menerima email, username, atau nomor telepon).*
- **Response (200 OK)**:
  ```json
  {
    "status": "success",
    "code": 200,
    "message": "Login berhasil",
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
      "expiresInSeconds": 900,
      "onboarding_completed": true,
      "user": {
        "id": "usr_abc123",
        "email": "budi@example.com",
        "username": "budisantoso",
        "name": "Budi Santoso",
        "role": "member"
      }
    }
  }
  ```
  *(Header set-cookie: `sekkha_refresh_token=...; HttpOnly; SameSite=Lax`)*

### 5. `POST /api/auth/refresh`
Memperbarui Access Token menggunakan token dari HttpOnly cookie.
- **Akses**: Publik (memerlukan cookie `sekkha_refresh_token`)
- **Response (200 OK)**:
  ```json
  {
    "status": "success",
    "code": 200,
    "message": "Sesi token berhasil diperbarui",
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
      "expiresInSeconds": 900
    }
  }
  ```

### 6. `POST /api/auth/logout`
Mencabut sesi saat ini dan menghapus cookie refresh token.
- **Akses**: Terautentikasi (`requireAuth`)
- **Headers**: `Authorization: Bearer <accessToken>`
- **Response (200 OK)**:
  ```json
  {
    "status": "success",
    "code": 200,
    "message": "Logout berhasil",
    "data": null
  }
  ```

### 7. `GET /api/auth/verify`
Memverifikasi keabsahan JWT saat booting aplikasi web.
- **Akses**: Terautentikasi (`requireAuth`)
- **Response (200 OK)**:
  ```json
  {
    "status": "success",
    "code": 200,
    "message": "Sesi valid",
    "data": {
      "user": {
        "id": "usr_abc123",
        "email": "budi@example.com",
        "name": "Budi Santoso",
        "role": "member"
      },
      "onboarding_completed": true
    }
  }
  ```

### 8. `POST /api/auth/forgot-password/request`
Meminta pengiriman OTP reset kata sandi (Anti Email-Enumeration: selalu mengembalikan respons sukses meskipun email belum terdaftar).
- **Akses**: Publik
- **Request Body**:
  ```json
  { "email": "budi@example.com" }
  ```
- **Response (200 OK)**:
  ```json
  {
    "status": "success",
    "code": 200,
    "message": "Jika email terdaftar, instruksi dan kode OTP reset password telah dikirim",
    "data": null
  }
  ```

### 9. `POST /api/auth/forgot-password/verify-otp`
Memvalidasi OTP reset password dan mendapatkan `reset_token`.
- **Akses**: Publik
- **Request Body**:
  ```json
  {
    "email": "budi@example.com",
    "otp": "654321"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "status": "success",
    "code": 200,
    "message": "OTP valid",
    "data": {
      "reset_token": "rst_token_string_here",
      "expires_in_seconds": 600
    }
  }
  ```

### 10. `POST /api/auth/forgot-password/reset`
Menetapkan password baru menggunakan `reset_token`. Seluruh sesi login lama otomatis dibatalkan.
- **Akses**: Publik
- **Request Body**:
  ```json
  {
    "email": "budi@example.com",
    "reset_token": "rst_token_string_here",
    "newPassword": "NewStrongPassword123!"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "status": "success",
    "code": 200,
    "message": "Password berhasil diperbarui. Silakan login kembali.",
    "data": null
  }
  ```

---

## Modul 2: Pengguna & Profil Pribadi (`/api/users`)

Mengelola profil mandiri, riwayat presensi, mutasi poin, streak, lencana, dan hak kepatuhan privasi data pribadi (UU PDP).

### 1. `GET /api/users/me`
Mengambil detail profil akun yang sedang login.
- **Akses**: Terautentikasi (`requireAuth`)
- **Response (200 OK)**:
  ```json
  {
    "id": "usr_abc123",
    "username": "budisantoso",
    "email": "budi@example.com",
    "role": "member",
    "user_number": "NV-2026-0042",
    "name": "Budi Santoso",
    "school": "SMA Negeri 1 Jakarta",
    "school_id": "sch_12345",
    "class_grade": "11",
    "phone": "081234567890",
    "birth_date": "2008-05-14T00:00:00.000Z",
    "gender": "male",
    "avatar_url": null,
    "points": 350
  }
  ```

### 2. `PATCH /api/users/me`
Memperbarui profil mandiri pengguna.
- **Akses**: Terautentikasi (`requireAuth`)
- **Request Body** *(semua opsional)*:
  ```json
  {
    "name": "Budi Santoso",
    "username": "budisantoso",
    "school_id": "sch_12345",
    "school": "SMA Negeri 1 Jakarta",
    "class_grade": "11",
    "phone": "081234567890",
    "birth_date": "2008-05-14",
    "gender": "male"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "user": {
      "id": "usr_abc123",
      "name": "Budi Santoso",
      "username": "budisantoso",
      "email": "budi@example.com",
      "role": "member",
      "school_id": "sch_12345",
      "school": "SMA Negeri 1 Jakarta",
      "class_grade": "11",
      "phone": "081234567890",
      "birth_date": "2008-05-14",
      "gender": "male",
      "avatar_url": null
    }
  }
  ```

### 3. `PATCH /api/users/me/onboarding`
Menyelesaikan tahap awal perkenalan/onboarding profil pengguna.
- **Akses**: Terautentikasi (`requireAuth`)
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Onboarding completed"
  }
  ```

### 4. `GET /api/users/me/streak`
Mengambil status keaktifan beruntun mingguan (*weekly attendance streak*).
- **Akses**: Terautentikasi (`requireAuth`)
- **Response (200 OK)**:
  ```json
  {
    "current_streak": 4,
    "longest_streak": 12,
    "last_attended": "2026-09-13T09:30:00.000Z",
    "history": [
      {
        "event_id": "evt_sunday_01",
        "title": "Kebaktian Remaja Minggu",
        "date": "2026-09-13T09:00:00.000Z"
      }
    ]
  }
  ```

### 5. `GET /api/users/me/attendances`
Mengambil riwayat absensi acara yang pernah dihadiri.
- **Akses**: Terautentikasi (`requireAuth`)
- **Query Parameters**: `limit` (default: 20, max: 50)
- **Response (200 OK)**:
  ```json
  [
    {
      "id": "att_123",
      "event_id": "evt_456",
      "event_title": "Kebaktian Remaja",
      "event_date": "2026-09-13T09:00:00.000Z",
      "method": "qr",
      "points_earned": 25,
      "scanned_at": "2026-09-13T09:15:22.000Z"
    }
  ]
  ```

### 6. `GET /api/users/me/point-transactions`
Mengambil riwayat mutasi penambahan/pengurangan poin.
- **Akses**: Terautentikasi (`requireAuth`)
- **Response (200 OK)**:
  ```json
  [
    {
      "id": "tx_789",
      "points": 50,
      "type": "event_attendance",
      "description": "Presensi Acara: Kebaktian Remaja",
      "created_at": "2026-09-13T09:15:22.000Z"
    }
  ]
  ```

### 7. `POST /api/users/change-password`
Mengubah kata sandi akun secara mandiri.
- **Akses**: Terautentikasi (`requireAuth`)
- **Request Body**:
  ```json
  {
    "currentPassword": "OldPassword123!",
    "newPassword": "NewStrongPassword456!"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Password berhasil diubah. Seluruh sesi lain telah dikeluarkan."
  }
  ```

### 8. `GET /api/users/me/export` (Kepatuhan UU PDP)
Mengunduh salinan arsip data pribadi dalam format JSON terenkripsi/terbaca.
- **Akses**: Terautentikasi (`requireAuth`)
- **Response (200 OK)**: Seluruh metadata profil, relasi kehadiran, dan poin.

### 9. `POST /api/users/me/delete-account` (Hak Penghapusan Akun)
Menghapus permanen akun atas permintaan mandiri.
- **Akses**: Terautentikasi (`requireAuth`)
- **Request Body**:
  ```json
  {
    "password": "Password123!",
    "confirmation": "DELETE"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Akun Anda telah berhasil dihapus secara permanen."
  }
  ```

---

## Modul 3: Beranda / Dashboard (`/api/home`)

Pusat komando terpadu yang menggabungkan informasi profil ringkas, streak mingguan, acara terdekat sesuai visibilitas role, dan mutasi aktivitas terakhir dalam satu request berkecepatan tinggi.

### 1. `GET /api/home`
- **Akses**: Terautentikasi (`requireAuth`)
- **Response (200 OK)**:
  ```json
  {
    "profile": {
      "id": "usr_abc123",
      "name": "Budi Santoso",
      "avatar_url": null,
      "role": "member",
      "user_number": "NV-2026-0042",
      "points": 350
    },
    "streak": {
      "current_streak": 4,
      "longest_streak": 12,
      "last_attended": "2026-09-13T09:30:00.000Z"
    },
    "events": [
      {
        "id": "evt_sunday_01",
        "title": "Kebaktian Remaja Minggu Pagi",
        "location": "Dhammasala Utama",
        "event_date": "2026-09-20T09:00:00.000Z",
        "event_type": "rutin"
      }
    ],
    "activities": [
      {
        "event_id": "evt_sunday_prev",
        "event_title": "Kebaktian Remaja Minggu Lalu",
        "scanned_at": "2026-09-13T09:15:22.000Z",
        "points": 50
      }
    ]
  }
  ```

---

## Modul 4: Acara & Presensi Real-Time (`/api/events`)

Manajemen siklus acara vihara, penjadwalan, otorisasi QR scanner panitia, dan broadcast presensi real-time via Server-Sent Events (SSE).

### 1. `GET /api/events`
Mengambil daftar acara. Umat biasa hanya melihat acara berstatus `published` atau `active` dengan visibilitas `all` / `member`.
- **Akses**: Terautentikasi (`requireAuth`)
- **Query Parameters**:
  - `page` (number, default: 1)
  - `limit` (number, default: 20, max: 50)
- **Response (200 OK)**:
  ```json
  [
    {
      "id": "evt_sunday_01",
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
  *(Catatan: Field `qr_code` hanya disertakan jika peminta memiliki role `organizer` atau `admin`).*

### 2. `GET /api/events/:id`
Mengambil detail satu acara secara lengkap.
- **Akses**: Terautentikasi (`requireAuth`, dengan guard visibilitas role)
- **Response (200 OK)**: Objek acara lengkap.

### 3. `POST /api/events`
Membuat acara baru.
- **Akses**: Pengurus & Admin (`requireRole("organizer", "admin")`)
- **Request Body**:
  ```json
  {
    "title": "Pekan Penghayatan Dhamma 2026",
    "description": "Retreat meditasi dan pendalaman sutta 3 hari.",
    "location": "Bhavana Center",
    "event_date": "2026-10-15T08:00:00.000Z",
    "event_type_id": "typ_khusus_02",
    "season_id": "sea_2026_q4",
    "visibility": "all"
  }
  ```
  *(Catatan: `event_type_id` bersifat wajib / mandatory. Field `tag` tidak lagi disimpan di database).*
- **Response (201 Created)**: Objek acara baru yang berhasil dibuat.

### 4. `PUT /api/events/:id`
Memperbarui informasi acara yang telah ada.
- **Akses**: Pengurus & Admin (`requireRole("organizer", "admin")`)
- **Response (200 OK)**: Objek acara yang diperbarui.

### 5. `PATCH /api/events/:id/status`
Memperbarui status siklus hidup acara (`draft` → `published` → `active` → `closed` → `cancelled`).
- **Akses**: Pengurus & Admin (`requireRole("organizer", "admin")`)
- **Request Body**:
  ```json
  { "status": "active" }
  ```
- **Response (200 OK)**:
  ```json
  {
    "id": "evt_sunday_01",
    "status": "active"
  }
  ```

### 6. `POST /api/events/:id/attendances` (Alias: `POST /api/events/:id/attendance`)
Mencatat presensi jemaat oleh panitia/pengurus di lokasi via pemindaian QR code kartu jemaat atau input ID/nomor anggota manual.
- **Akses**: Aktivis, Pengurus, Admin (`requireRole("organizer", "admin", "activist")`)
- **Aturan**: Acara harus berstatus `active` atau `published`.
- **Request Body**:
  ```json
  {
    "method": "qr",
    "user_id": "usr_abc123"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "user_id": "usr_abc123",
    "name": "Budi Santoso",
    "user_number": "NV-2026-0042",
    "method": "qr",
    "points_earned": 50,
    "scanned_at": "2026-09-20T09:12:45.000Z",
    "status": "staged"
  }
  ```
- **Error Khusus**:
  - `400 Bad Request`: Event tidak aktif.
  - `409 Conflict`: Peserta sudah tercatat hadir pada event ini (*Duplicate Attendance*).

### 7. `GET /api/events/:id/live-attendance` (Server-Sent Events)
Stream koneksi real-time untuk monitor scanner panitia di meja registrasi.
- **Akses**: Aktivis, Pengurus, Admin (`requireRole("organizer", "admin", "activist")`)
- **Header**: `Accept: text/event-stream` (Mendukung parameter query `?token=<jwt>`)
- **Format Pesan SSE**:
  ```
  event: attendance
  data: {"type":"ATTENDANCE_RECORDED","eventId":"evt_sunday_01","attendance":{"userId":"usr_abc123","name":"Budi Santoso","userNumber":"NV-2026-0042","scannedAt":"2026-09-20T09:12:45.000Z","points":50}}
  ```

### 8. `GET /api/events/:id/attendances`
Mengambil daftar seluruh peserta yang hadir pada acara tertentu.
- **Akses**: Aktivis, Pengurus, Admin (`requireRole("organizer", "admin", "activist")`)
- **Query Parameters**: `page` (default: 1), `limit` (default: 50, max: 100)
- **Response (200 OK)**:
  ```json
  [
    {
      "user_id": "usr_abc123",
      "name": "Budi Santoso",
      "role": "member",
      "user_number": "NV-2026-0042",
      "avatar_url": null,
      "method": "qr",
      "scanned_at": "2026-09-20T09:12:45.000Z"
    }
  ]
  ```

### 9. `DELETE /api/events/:id/attendances/:userId`
Membatalkan / menghapus catatan presensi peserta tertentu dari suatu event.
- **Akses**: Pengurus & Admin (`requireRole("organizer", "admin")`)
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Presensi peserta berhasil dibatalkan."
  }
  ```

### 10. `DELETE /api/events/:id`
Menghapus acara secara permanen dari sistem.
- **Akses**: Pengurus & Admin (`requireRole("organizer", "admin")`)
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Event berhasil dihapus."
  }
  ```

---

## Modul 5: Papan Peringkat / Leaderboard (`/api/leaderboard`)

Sistem peringkat gamifikasi komunitas vihara berbasis snapshot berkecepatan tinggi ($O(1)$) untuk mencegah beban komputasi berlebih.

### 1. `GET /api/leaderboard`
Mengambil data papan peringkat komunitas berdasarkan metrik tertentu.
- **Akses**: Opsional / Terautentikasi (`optionalAuth` / `requireAuth`)
- **Query Parameters**:
  - `metric` (`points` | `streak` | `attendance`, default: `points`)
  - `refresh` (`true` | `false`, opsional): Khusus pengurus/admin untuk memicu kalkulasi ulang snapshot secara paksa.
- **Response (200 OK)**:
  ```json
  {
    "entries": [
      {
        "rank": 1,
        "user_id": "usr_abc123",
        "name": "Budi Santoso",
        "initials": "BS",
        "user_number": "NV-2026-0042",
        "value": 450,
        "level": 3,
        "badge_count": 5
      },
      {
        "rank": 2,
        "user_id": "usr_def456",
        "name": "Dewi Lestari",
        "initials": "DL",
        "user_number": "NV-2026-0012",
        "value": 420,
        "level": 3,
        "badge_count": 4
      }
    ],
    "my_rank": {
      "rank": 1,
      "value": 450,
      "is_in_top": true,
      "name": "Budi Santoso",
      "initials": "BS"
    },
    "season": {
      "id": "sea_2026_q3",
      "name": "Musim Vassa 2026",
      "start_date": "2026-07-01T00:00:00.000Z",
      "end_date": "2026-09-30T23:59:59.000Z",
      "target_attendance": 500
    },
    "community_goal": {
      "current": 385,
      "target": 500,
      "label": "Target Absensi Komunitas Vihara"
    },
    "calculated_at": "2026-09-13T20:00:00.000Z"
  }
  ```

### 2. `GET /api/leaderboard/debug`
Melihat status agregasi database pengguna dan cache snapshot (Khusus audit sistem).
- **Akses**: Khusus Super Administrator (`requireRole("admin")`)
- **Response (200 OK)**: Status dump penghitungan leaderboard.

---

## Modul 6: Manajemen Umat & Tim (`/api/people`)

Direktori keanggotaan jemaat (*People Management*), prapendaftaran anggota (*pre-provisioning*), aktivasi akun, dan integrasi riwayat akun lama (*account linking*).

### 1. `GET /api/people/members`
Mencari dan menampilkan daftar anggota jemaat komunitas.
- **Akses**: Pengurus & Admin (`requireRole("organizer", "admin")`)
- **Query Parameters**:
  - `search` (string): Pencarian nama, username, nomor anggota (NV-XXXX), sekolah, atau email.
  - `claimed_status` (`all` | `claimed` | `unclaimed`, default: `all`)
  - `role` (`all` | `member` | `activist` | `organizer` | `admin`, default: `all`)
  - `page` (number, default: 1)
  - `limit` (number, default: 20, max: 100)
- **Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "usr_abc123",
        "name": "Budi Santoso",
        "username": "budisantoso",
        "user_number": "NV-2026-0042",
        "role": "member",
        "school": "SMA Negeri 1 Jakarta",
        "class_grade": "11",
        "is_claimed": true,
        "points": 350,
        "streak": 4,
        "avatar_url": null,
        "created_at": "2026-08-01T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 142,
      "totalPages": 8
    }
  }
  ```

### 2. `GET /api/people/members/:id`
Mengambil rekam jejak mendalam dari salah satu jemaat.
- **Akses**: Pengurus & Admin (`requireRole("organizer", "admin")`)
- **Response (200 OK)**: Objek profil anggota lengkap dengan riwayat absensi terbaru.

### 3. `POST /api/people/members`
Menambahkan data profil jemaat baru secara pra-registrasi (*pre-provisioning*) oleh pengurus.
- **Akses**: Pengurus & Admin (`requireRole("organizer", "admin")`)
- **Request Body**:
  ```json
  {
    "name": "Siti Rahma",
    "email": "siti@example.com",
    "school_id": "sch_12345",
    "class_grade": "10",
    "phone": "081987654321",
    "role": "member"
  }
  ```
- **Response (201 Created)**: Objek anggota baru dengan nomor anggota yang telah digenerate (misal: `NV-2026-0050`).

### 4. `PUT /api/people/members/:id`
Memperbarui data anggota jemaat.
- **Akses**: Pengurus & Admin (`requireRole("organizer", "admin")`)
  *(Catatan: Perubahan peran/role ke `activist`/`organizer`/`admin` mewajibkan otorisasi `admin`).*
- **Response (200 OK)**: Objek anggota yang telah diperbarui.

### 5. `DELETE /api/people/members/:id`
Menghapus akun anggota dari database.
- **Akses**: Khusus Super Administrator (`requireRole("admin")`)
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Anggota berhasil dihapus."
  }
  ```

### 6. `POST /api/people/members/:id/reset-password`
Mereset kata sandi anggota oleh administrator.
- **Akses**: Khusus Super Administrator (`requireRole("admin")`)
- **Request Body**:
  ```json
  { "newPassword": "TemporaryPassword123!" }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Password anggota berhasil direset."
  }
  ```

### 7. `POST /api/people/members/:id/generate-claim-pin`
Menerbitkan PIN 6-digit sementara untuk mengklaim/menautkan data historis anggota.
- **Akses**: Pengurus & Admin (`requireRole("organizer", "admin")`)
- **Response (200 OK)**:
  ```json
  {
    "pin": "748291",
    "expires_at": "2026-09-22T23:59:59.000Z"
  }
  ```

### 8. `POST /api/people/link-legacy-account`
Menautkan dan menggabungkan akun terdaftar saat ini dengan rekam data jemaat lama menggunakan PIN klaim.
- **Akses**: Terautentikasi (`requireAuth`)
- **Rate Limit**: 5 percobaan per 15 menit per IP.
- **Request Body**:
  ```json
  {
    "user_number": "NV-2026-0019",
    "claim_pin": "748291"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Akun berhasil ditautkan. Seluruh poin dan riwayat presensi telah digabungkan."
  }
  ```

---

## Modul 7: Analitik Pengurus & Early Warning Alerts (`/api/pengurus`)

Deteksi risiko ketidakhadiran jemaat (*Silent Churn*), tindak lanjut pastoral (*Recency Alerts*), dan metrik tren kesehatan vihara.

### 1. `GET /api/pengurus/recency-alerts`
Mengambil daftar jemaat yang berisiko pasif berdasarkan frekuensi ketidakhadiran beruntun (*consecutive missed events*).
- **Akses**: Pengurus & Admin (`requireRole("organizer", "admin")`)
- **Query Parameters**:
  - `level` (`all` | `normal` | `warning` | `at_risk` | `lost`, default: `all`)
    - `normal`: Bolos 0-1 kali.
    - `warning`: Bolos 2 kali berturut-turut.
    - `at_risk`: Bolos 3 kali berturut-turut (butuh perhatian pastoral).
    - `lost`: Tidak hadir 4+ kali berturut-turut.
  - `search` (string): Pencarian nama, nomor anggota, atau telepon.
  - `sortBy` (`longest_absence` | `name` | `consecutive_missed`, default: `longest_absence`)
- **Response (200 OK)**:
  ```json
  {
    "summary": {
      "total_members": 142,
      "normal_count": 110,
      "warning_count": 18,
      "at_risk_count": 9,
      "lost_count": 5
    },
    "members": [
      {
        "user_id": "usr_ghi789",
        "name": "Kevin Wijaya",
        "user_number": "NV-2026-0019",
        "role": "member",
        "school": "SMA Tarakanita 1",
        "phone": "08129876543",
        "level": "at_risk",
        "consecutive_missed": 3,
        "days_since_last_attendance": 21,
        "last_attended_date": "2026-08-23T09:00:00.000Z",
        "attendance_rate": 45
      }
    ]
  }
  ```

### 2. `GET /api/pengurus/recency-alerts/:userId`
Detail presensi dan metrik ketidakhadiran seorang jemaat untuk keperluan konseling.
- **Akses**: Pengurus & Admin (`requireRole("organizer", "admin")`)
- **Response (200 OK)**:
  ```json
  {
    "user": {
      "id": "usr_ghi789",
      "name": "Kevin Wijaya",
      "email": "kevin@example.com",
      "user_number": "NV-2026-0019",
      "phone": "08129876543",
      "school": "SMA Tarakanita 1",
      "joined_at": "2026-01-10T00:00:00.000Z"
    },
    "metrics": {
      "consecutive_missed": 3,
      "days_since_last": 21,
      "attendance_rate": 45,
      "status": "at_risk"
    },
    "attendance_history": [
      {
        "event_id": "evt_sunday_01",
        "event_title": "Kebaktian Remaja",
        "event_date": "2026-08-23T09:00:00.000Z",
        "status": "present"
      }
    ]
  }
  ```

### 3. `GET /api/pengurus/insight`
Mengambil data analitik komprehensif kehadiran vihara, tren periode, retensi jemaat, perbandingan tahunan, serta segmentasi masa keanggotaan (*tenure*).
- **Akses**: Pengurus & Admin (`requireRole("organizer", "admin")`)
- **Query Parameters**:
  - `timeUnit` (`year` | `month`, default: `year`)
  - `primaryYear` (number, default: tahun berjalan)
  - `primaryMonth` (number, default: bulan berjalan)
  - `isComparisonEnabled` (`true` | `false`)
  - `compareYear` (number, opsional)
  - `segmentFilter` (`all` | `member` | `activist` | `organizer`, default: `all`)
  - `eventCategoryFilter` (string, default: `all`)
- **Response (200 OK)**:
  ```json
  {
    "timeUnit": "year",
    "isComparisonEnabled": false,
    "segmentFilter": "all",
    "summary": {
      "totalActiveMembers": {
        "value": 115,
        "deltaText": "+8%",
        "isPositive": true,
        "description": "Dibandingkan Tahun Lalu"
      },
      "avgAttendanceRate": {
        "value": "78%",
        "deltaText": "+5%",
        "isPositive": true,
        "description": "Konsistensi kehadiran umat"
      },
      "retentionRate": {
        "value": "86%",
        "deltaText": "+2.4%",
        "isPositive": true,
        "description": "Umat aktif berulang"
      },
      "atRiskMembersCount": {
        "value": 9,
        "deltaText": "-2 org",
        "isPositive": true,
        "description": "Perlu intervensi & follow-up"
      }
    },
    "trendChartData": [
      { "label": "Jan", "2026": 85 },
      { "label": "Feb", "2026": 92 },
      { "label": "Mar", "2026": 105 }
    ],
    "silentChurnHealth": {
      "totalMembers": 142,
      "normalCount": 110,
      "warningCount": 18,
      "atRiskCount": 9,
      "lostCount": 5,
      "normalPercent": 77
    },
    "tenureBreakdown": [
      { "label": "< 3 Bulan", "count": 25, "percentage": 18, "color": "#3B82F6" },
      { "label": "3 - 12 Bulan", "count": 65, "percentage": 46, "color": "#10B981" },
      { "label": "1 - 2 Tahun", "count": 35, "percentage": 25, "color": "#F59E0B" },
      { "label": "> 2 Tahun", "count": 17, "percentage": 11, "color": "#8B5CF6" }
    ]
  }
  ```

---

## Modul 8: Master Data Sekolah (`/api/schools`)

Manajemen master institusi pendidikan jemaat remaja serta statistik persebaran siswa.

### 1. `GET /api/schools`
Mencari dan menampilkan daftar sekolah master aktif (status `approved`).
- **Akses**: Publik
- **Query Parameters**:
  - `search` (string, opsional): Pencarian nama sekolah atau jenjang (`SMA`, `SMK`, `SMP`).
  - `limit` (number, default: 100, max: 200)
- **Response (200 OK)**:
  ```json
  [
    {
      "id": "sch_12345",
      "name": "SMA Negeri 1 Jakarta",
      "type": "SMA",
      "status": "approved",
      "student_count": 28
    },
    {
      "id": "sch_67890",
      "name": "SMK Negeri 26 Jakarta",
      "type": "SMK",
      "status": "approved",
      "student_count": 14
    }
  ]
  ```

### 2. `GET /api/schools/stats`
Mengambil ringkasan statistik persebaran jemaat remaja per sekolah dan total kehadiran gabungan.
- **Akses**: Publik (Rate Limit: 30 req/menit per IP, Cache: 300 detik)
- **Response (200 OK)**:
  ```json
  {
    "total_schools": 35,
    "total_students": 142,
    "schools": [
      {
        "id": "sch_12345",
        "name": "SMA Negeri 1 Jakarta",
        "type": "SMA",
        "status": "approved",
        "student_count": 28,
        "total_points": 1450,
        "total_attendances": 85
      }
    ]
  }
  ```

### 3. `POST /api/schools`
Menambahkan sekolah baru ke master data.
- **Akses**: Pengurus & Admin (`requireRole("organizer", "admin")`)
- **Request Body**:
  ```json
  {
    "name": "SMA Kristen 1 Penabur",
    "type": "SMA"
  }
  ```
- **Response (201 Created)**: Objek sekolah baru (`status: approved`).

### 4. `PUT /api/schools/:id`
Memperbarui data nama atau jenjang sekolah.
- **Akses**: Pengurus & Admin (`requireRole("organizer", "admin")`)
- **Response (200 OK)**: Objek sekolah yang diperbarui.

### 5. `DELETE /api/schools/:id`
Menghapus sekolah dari master data.
- **Akses**: Khusus Super Administrator (`requireRole("admin")`)
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Sekolah berhasil dihapus."
  }
  ```

---

## Modul 9: Konfigurasi & Master Data (`/api/configure`)

Manajemen konfigurasi sistem master vihara: kategori acara (*event types*), ambang batas (*thresholds*), musim (*seasons*), dan aturan poin (*point rules*).

> **Hak Akses Khusus Modul Configure:**
> - Seluruh endpoint `GET`: Dapat diakses oleh **`organizer`** dan **`admin`**.
> - Seluruh endpoint mutasi (`POST`, `PUT`, `DELETE`): Dibatasi khusus untuk **`admin`**. Permintaan dari `organizer` akan menghasilkan error `403 Forbidden`.

---

### 9.1. Kategori Acara (`/api/configure/event-types`)

#### `GET /api/configure/event-types`
- **Response (200 OK)**:
  ```json
  [
    {
      "id": "typ_rutin_01",
      "code": "rutin",
      "label": "Kebaktian Rutin Remaja",
      "description": "Kegiatan rutin kebaktian hari Minggu",
      "default_point_reward": 50,
      "is_active": true
    },
    {
      "id": "typ_khusus_02",
      "code": "special",
      "label": "Perayaan Hari Besar / Retreat",
      "description": "Waisak, Kathina, Asadha, atau Retreat",
      "default_point_reward": 100,
      "is_active": true
    }
  ]
  ```

#### `POST /api/configure/event-types`
- **Request Body**:
  ```json
  {
    "code": "workshop",
    "label": "Workshop & Pelatihan",
    "description": "Kelas keterampilan dan kepemimpinan pemuda",
    "default_point_reward": 75,
    "is_active": true
  }
  ```
- **Response (201 Created)**: `{ "id": "typ_03", "code": "workshop" }`

#### `PUT /api/configure/event-types/:id`
- **Request Body**: Field yang ingin diperbarui.
- **Response (200 OK)**: `{ "id": "typ_03", "code": "workshop" }`

#### `DELETE /api/configure/event-types/:id`
- **Response (200 OK)**: `{ "success": true }`

---

### 9.2. Ambang Batas / Thresholds (`/api/configure/threshold`)

Mengatur ambang batas parameter peringatan dini *consecutive missed events* dan deteksi jemaat pasif (*churned*).

#### `GET /api/configure/threshold`
- **Response (200 OK)**:
  ```json
  {
    "warningConsecutiveMissed": 2,
    "atRiskConsecutiveMissed": 3,
    "lostConsecutiveMissed": 4,
    "churnedDaysThreshold": 60
  }
  ```

#### `PUT /api/configure/threshold`
- **Request Body**:
  ```json
  {
    "warningConsecutiveMissed": 2,
    "atRiskConsecutiveMissed": 3,
    "lostConsecutiveMissed": 4,
    "churnedDaysThreshold": 45
  }
  ```
- **Response (200 OK)**: Objek threshold yang diperbarui.

---

### 9.3. Musim Papan Peringkat / Seasons (`/api/configure/seasons`)

#### `GET /api/configure/seasons`
- **Response (200 OK)**:
  ```json
  [
    {
      "id": "sea_2026_q3",
      "name": "Musim Vassa 2026",
      "start_date": "2026-07-01T00:00:00.000Z",
      "end_date": "2026-09-30T23:59:59.000Z",
      "target_attendance": 500,
      "is_active": true,
      "total_attendances": 385
    }
  ]
  ```

#### `POST /api/configure/seasons`
- **Request Body**:
  ```json
  {
    "name": "Musim Kathina 2026",
    "start_date": "2026-10-01T00:00:00.000Z",
    "end_date": "2026-12-31T23:59:59.000Z",
    "target_attendance": 600,
    "is_active": false
  }
  ```
- **Response (201 Created)**: Objek season baru yang berhasil dibuat.

#### `PUT /api/configure/seasons/:id`
- **Request Body**: Field season yang ingin diperbarui.
- **Response (200 OK)**: Objek season yang diperbarui.

#### `DELETE /api/configure/seasons/:id`
- **Response (200 OK)**: `{ "success": true }`

#### `POST /api/configure/seasons/:id/activate`
Mengaktifkan season bersangkutan dan otomatis menonaktifkan season aktif lainnya. Papan peringkat komunitas akan beralih merujuk ke rentang tanggal season ini.
- **Response (200 OK)**:
  ```json
  {
    "id": "sea_2026_q4",
    "name": "Musim Kathina 2026",
    "is_active": true
  }
  ```

---

### 9.4. Aturan Poin Master (`/api/configure/point-rules`)

Mengatur alokasi poin reward dinamis untuk setiap kategori aktivitas.

#### `GET /api/configure/point-rules`
- **Response (200 OK)**:
  ```json
  [
    {
      "id": "rul_01",
      "code": "attendance_rutin",
      "label": "Poin Presensi Kegiatan Rutin",
      "points": 50,
      "category": "attendance",
      "description": "Poin standar yang didapatkan umat saat melakukan presensi pada kebaktian rutin mingguan.",
      "is_active": true
    },
    {
      "id": "rul_02",
      "code": "attendance_special",
      "label": "Poin Presensi Kegiatan Khusus",
      "points": 100,
      "category": "attendance",
      "description": "Poin untuk kehadiran pada acara spesial seperti perayaan hari besar atau retreat.",
      "is_active": true
    },
    {
      "id": "rul_03",
      "code": "streak_weekly_bonus",
      "label": "Bonus Konsistensi (Streak Mingguan)",
      "points": 30,
      "category": "streak",
      "description": "Bonus poin tambahan yang diberikan saat umat mempertahankan kehadiran berturut-turut tanpa terputus.",
      "is_active": true
    },
    {
      "id": "rul_04",
      "code": "first_attendance_bonus",
      "label": "Bonus Presensi Pertama Kali",
      "points": 25,
      "category": "general",
      "description": "Poin sambutan perdana bagi umat baru yang baru pertama kali mencatatkan presensi di vihara.",
      "is_active": true
    }
  ]
  ```

#### `PUT /api/configure/point-rules/:id`
- **Request Body**:
  ```json
  {
    "points": 60,
    "label": "Poin Presensi Rutin Minggu",
    "is_active": true
  }
  ```
- **Response (200 OK)**: Objek point rule yang telah diperbarui.
