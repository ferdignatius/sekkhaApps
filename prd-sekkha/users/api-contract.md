# Spesifikasi Kontrak API: Domain Pengguna & Profil (`users` / `profile`)

Dokumen ini mendefinisikan kontrak komunikasi resmi untuk manajemen profil pengguna, statistik gamifikasi pribadi, preferensi, serta hak privasi data pengguna (UU PDP / GDPR).

---

## 1. Ikhtisar Modul
- **Base Route**: `/api/users`
- **Keamanan**: Seluruh endpoint mewajibkan autentikasi JWT (`requireAuth`). Pengguna hanya dapat mengakses dan memanipulasi data akun mereka sendiri (`/me`).
- **Enkripsi Data Sensitif (At-Rest)**: Field PII seperti no HP (`phone`), tanggal lahir (`birthDate`), dan jenis kelamin (`gender`) dienkripsi dengan AES-256-GCM di level database.
- **Caching**: Profil pengguna di-cache selama 120 detik di Redis dengan pembatalan otomatis saat ada pembaruan (`PATCH /me`).

---

## 2. Rincian Endpoint

### 2.1. `GET /api/users/me`
Mengambil detail profil lengkap pengguna yang sedang terautentikasi.

- **Headers**: `Authorization: Bearer <accessToken>`
- **Response (200 OK)**:
  ```json
  {
    "id": "usr_clexample123",
    "username": "budisantoso",
    "email": "user@example.com",
    "role": "umat",
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

---

### 2.2. `PATCH /api/users/me`
Memperbarui data profil mandiri pengguna.

- **Request Body** *(semua opsional)*:
  ```json
  {
    "name": "Budi Santoso",
    "username": "budisantoso_new",
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
      "id": "usr_clexample123",
      "name": "Budi Santoso",
      "username": "budisantoso_new",
      "email": "user@example.com",
      "role": "umat",
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
- **Errors**:
  - `400 Bad Request`: Validasi data gagal (misal format nomor telepon atau tanggal lahir salah).
  - `409 Conflict`: Username telah digunakan oleh akun lain.

---

### 2.3. `GET /api/users/me/streak`
Mengambil status keaktifan beruntun (*attendance streak*) pengguna.

- **Response (200 OK)**:
  ```json
  {
    "current_streak": 4,
    "longest_streak": 12,
    "last_attended": "2026-09-13T09:30:00.000Z",
    "history": [
      {
        "event_id": "evt_sunday_puja_01",
        "title": "Kebaktian Remaja Minggu",
        "date": "2026-09-13T09:00:00.000Z"
      }
    ]
  }
  ```

---

### 2.4. `GET /api/users/me/level`
Mengambil level gamifikasi, total poin, dan progres menuju level berikutnya.

- **Response (200 OK)**:
  ```json
  {
    "level": 3,
    "title": "Saddhā (Keyakinan)",
    "current_points": 350,
    "next_level_points": 500,
    "progress_percent": 70
  }
  ```

---

### 2.5. `GET /api/users/me/badges`
Mengambil daftar seluruh lencana (*badges*) yang telah diraih oleh pengguna.

- **Response (200 OK)**:
  ```json
  [
    {
      "id": "bdg_first_attendance",
      "name": "Langkah Pertama",
      "description": "Menghadiri kebaktian untuk pertama kali",
      "icon_url": "/badges/first.svg",
      "unlocked_at": "2026-08-01T10:00:00.000Z"
    }
  ]
  ```

---

### 2.6. `GET /api/users/me/attendances`
Mengambil riwayat presensi acara yang pernah dihadiri pengguna (dibatasi 50 riwayat terakhir).

- **Query Parameters**:
  - `limit` (number, default: 20, max: 50)
- **Response (200 OK)**:
  ```json
  [
    {
      "id": "att_123",
      "event_id": "evt_456",
      "event_title": "Mingguan Remaja Vihara",
      "event_date": "2026-09-13T09:00:00.000Z",
      "method": "qr",
      "points_earned": 25,
      "scanned_at": "2026-09-13T09:15:22.000Z"
    }
  ]
  ```

---

### 2.7. `GET /api/users/me/point-transactions`
Mengambil riwayat mutasi poin (perolehan dari presensi, bonus streak, pengurangan, dll.).

- **Response (200 OK)**:
  ```json
  [
    {
      "id": "tx_789",
      "points": 25,
      "type": "event_attendance",
      "description": "Presensi Acara: Mingguan Remaja Vihara",
      "created_at": "2026-09-13T09:15:22.000Z"
    }
  ]
  ```

---

### 2.8. `POST /api/users/change-password`
Mengganti password akun mandiri dan mencabut seluruh sesi JWT lama.

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
- **Errors**:
  - `400 Bad Request`: Password saat ini salah atau password baru tidak memenuhi syarat keamanan.

---

### 2.9. `GET /api/users/me/export` (Kepatuhan UU PDP / GDPR)
Mengunduh seluruh data pribadi, riwayat presensi, transaksi poin, dan lencana dalam format arsip JSON.

- **Response (200 OK)**:
  Objek JSON lengkap data pengguna bersangkutan.

---

### 2.10. `POST /api/users/me/delete-account` (Hak Penghapusan Akun)
Menghapus akun pengguna secara permanen atas permintaan pengguna mandiri.

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
