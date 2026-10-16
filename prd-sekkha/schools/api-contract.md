# Spesifikasi Kontrak API: Domain Sekolah (`schools`)

Dokumen ini mendefinisikan kontrak komunikasi resmi untuk manajemen master data sekolah, statistik persebaran institusi pendidikan jemaat remaja vihara, serta konfigurasi CRUD sekolah.

---

## 1. Ikhtisar Modul
- **Base Route**: `/api/schools`
- **Tingkat Akses & Otorisasi**:
  - `GET /api/schools`: Publik / Terbuka (digunakan pada dropdown form registrasi & profil pengguna).
  - `GET /api/schools/stats`: Terbuka dengan rate limit khusus (30 req/menit per IP) dan cache 300 detik untuk mencegah beban dekripsi massal (DoS).
  - `POST /api/schools` & `PUT /:id`: Dibatasi **`pengurus`** dan **`admin`**.
  - `DELETE /:id`: Dibatasi khusus **`admin`**.

---

## 2. Rincian Endpoint

### 2.1. `GET /api/schools`
Mengambil daftar sekolah master yang dapat dicari berdasarkan nama, kota, atau jenjang.

- **Query Parameters**:
  - `search` (string, opsional): Pencarian nama sekolah, kota, atau tipe (`SMA`, `SMK`, `SMP`).
  - `limit` (number, default: 100, max: 200)
- **Response (200 OK)**:
  ```json
  [
    {
      "id": "sch_12345",
      "name": "SMA Negeri 1 Jakarta",
      "type": "SMA",
      "city": "Jakarta Pusat",
      "student_count": 28
    },
    {
      "id": "sch_67890",
      "name": "SMK Negeri 26 Jakarta",
      "type": "SMK",
      "city": "Jakarta Timur",
      "student_count": 14
    }
  ]
  ```

---

### 2.2. `GET /api/schools/stats`
Mengambil ringkasan statistik persebaran jemaat remaja per sekolah, total kehadiran gabungan, dan peringkat sekolah teraktif.

- **Rate Limit**: 30 permintaan per menit per IP.
- **Cache**: 300 detik (5 menit).
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
        "city": "Jakarta Pusat",
        "student_count": 28,
        "total_points": 1450,
        "total_attendances": 85
      }
    ]
  }
  ```

---

### 2.3. `POST /api/schools`
Menambahkan sekolah baru ke dalam master data.

- **Security**: `requireRole("admin", "pengurus")`
- **Request Body**:
  ```json
  {
    "name": "SMA Kristen 1 Penabur",
    "type": "SMA",
    "city": "Jakarta Barat"
  }
  ```
- **Response (201 Created)**: Objek data sekolah yang berhasil dibuat.

---

### 2.4. `PUT /api/schools/:id`
Memperbarui informasi nama, kota, atau jenis sekolah.

- **Security**: `requireRole("admin", "pengurus")`
- **Response (200 OK)**: Objek data sekolah yang telah diperbarui.

---

### 2.5. `DELETE /api/schools/:id`
Menghapus sekolah dari daftar master data.

- **Security**: `requireRole("admin")`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Sekolah berhasil dihapus."
  }
  ```
