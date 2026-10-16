# Spesifikasi Kontrak API: Domain Tim & Komunitas (`teams`)

Dokumen ini mendefinisikan kontrak komunikasi resmi untuk manajemen direktori anggota jemaat (*People / Community Directory*), penambahan anggota pra-registrasi (*pre-provisioning*), penerbitan Claim PIN aktivasi, dan penggabungan riwayat presensi/poin akun lama.

---

## 1. Ikhtisar Modul
- **Base Route**: `/api/teams`
- **Hak Akses & Otorisasi**:
  - `GET /api/teams/members` & `GET /api/teams/members/:id`: Dibatasi khusus role **`pengurus`** dan **`admin`**.
  - `POST /api/teams/members`, `DELETE /:id`, `POST /:id/reset-password`: Dibatasi khusus **`admin`**.
  - `POST /api/teams/members/:id/generate-claim-pin`: Dibatasi **`pengurus`** dan **`admin`**.
  - `POST /api/teams/link-legacy-account`: Terbuka untuk seluruh pengguna terautentikasi (`requireAuth`) yang ingin mengklaim data historis jemaat mereka.
- **Perlindungan Data (PII Blind Index)**: Pencarian berdasarkan email menggunakan HMAC-SHA256 blind-index (`emailBindex`), sehingga data email tersimpan terenkripsi di database namun tetap dapat dicari dengan efisiensi $O(1)$.

---

## 2. Rincian Endpoint

### 2.1. `GET /api/teams/members`
Mengambil direktori seluruh anggota komunitas dengan fitur pencarian dan filter status klaim akun.

- **Security**: `requireRole("pengurus", "admin")`
- **Query Parameters**:
  - `search` (string): Pencarian nama, username, nomor anggota (NV-XXXX), nama sekolah, atau email.
  - `claimed_status` (`all` | `claimed` | `unclaimed`, default: `all`)
  - `role` (`all` | `umat` | `aktivis` | `pengurus`, default: `all`)
  - `page` (number, default: 1)
  - `limit` (number, default: 20, max: 100)
- **Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "usr_clexample123",
        "name": "Budi Santoso",
        "username": "budisantoso",
        "user_number": "NV-2026-0042",
        "role": "umat",
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

---

### 2.2. `GET /api/teams/members/:id`
Mengambil profil mendalam salah satu anggota, termasuk statistik presensi dan kontribusi.

- **Security**: `requireRole("pengurus", "admin")`
- **Response (200 OK)**:
  ```json
  {
    "id": "usr_clexample123",
    "name": "Budi Santoso",
    "username": "budisantoso",
    "email": "user@example.com",
    "user_number": "NV-2026-0042",
    "role": "umat",
    "school": "SMA Negeri 1 Jakarta",
    "class_grade": "11",
    "phone": "081234567890",
    "birth_date": "2008-05-14T00:00:00.000Z",
    "gender": "male",
    "is_claimed": true,
    "points": 350,
    "current_streak": 4,
    "longest_streak": 12,
    "total_attendances": 18,
    "recent_attendances": []
  }
  ```

---

### 2.3. `POST /api/teams/members`
Membuat profil anggota baru secara langsung oleh administrator (misalnya jemaat offline).

- **Security**: `requireRole("admin")`
- **Request Body**:
  ```json
  {
    "name": "Siti Rahma",
    "email": "siti@example.com",
    "school_id": "sch_12345",
    "class_grade": "10",
    "phone": "081987654321",
    "birth_date": "2009-02-20",
    "gender": "female",
    "role": "umat"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "member": {
      "id": "usr_siti456",
      "name": "Siti Rahma",
      "user_number": "NV-2026-0043",
      "role": "umat",
      "is_claimed": false
    }
  }
  ```

---

### 2.4. `PUT /api/teams/members/:id`
Memperbarui data profil atau penugasan role anggota oleh pengurus/admin.

- **Security**: `requireRole("pengurus", "admin")`
- **Request Body**:
  ```json
  {
    "name": "Siti Rahmawati",
    "role": "aktivis",
    "school_id": "sch_12345",
    "class_grade": "10",
    "phone": "081987654321"
  }
  ```
- **Response (200 OK)**: Objek data anggota yang telah diperbarui.

---

### 2.5. `DELETE /api/teams/members/:id`
Menghapus akun anggota dari database.

- **Security**: `requireRole("admin")`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Anggota berhasil dihapus."
  }
  ```

---

### 2.6. `POST /api/teams/members/:id/generate-claim-pin`
Membuat kode PIN aktivasi 6-digit (berlaku 30 hari) untuk anggota yang didaftarkan secara offline/legacy agar dapat mengklaim datanya saat registrasi online.

- **Security**: `requireRole("pengurus", "admin")`
- **Keamanan Kriptografi**: PIN di-generate menggunakan CSPRNG (`crypto.randomInt`) dan disimpan dalam bentuk hash Bcrypt (12 rounds) di database. Plaintext PIN hanya ditampilkan 1 kali dalam respons API untuk dicatat/diberikan ke anggota.
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "claim_pin": "583921",
    "user_number": "NV-2026-0043",
    "name": "Siti Rahmawati",
    "expires_at": "2026-10-16T17:30:00.000Z",
    "message": "PIN klaim 6-digit untuk Siti Rahmawati berhasil dibuat: 583921. Berikan PIN ini ke anggota terkait."
  }
  ```

---

### 2.7. `POST /api/teams/link-legacy-account`
Menautkan akun online saat ini dengan data anggota offline/lama menggunakan nomor anggota dan PIN klaim.

- **Security**: `requireAuth`
- **Rate Limit**: 5 percobaan per 15 menit per IP (mencegah *brute-force* PIN).
- **Request Body**:
  ```json
  {
    "user_number": "NV-2026-0043",
    "claim_pin": "583921"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Akun berhasil ditautkan! Riwayat presensi dan poin sebelumnya telah digabungkan ke akun Anda.",
    "user_number": "NV-2026-0043",
    "merged_points": 120,
    "merged_attendances": 8
  }
  ```
- **Errors**:
  - `400 Bad Request`: PIN salah, akun sudah pernah diklaim, atau menautkan ke diri sendiri.
  - `404 Not Found`: Nomor anggota tidak ditemukan.
  - `429 Too Many Requests`: Melebihi kuota percobaan PIN.
