# PRD: Users (Profil, Account Claim, Email Change, Attendance History, Streak, Points) - Sekkha Apps

| Metadata | Detail |
| --- | --- |
| **Dokumen** | Product Requirement Document (PRD) |
| **Fitur** | User Profile, Auto UserNumber, Account Claim, Email Change & Verification, Attendance History, Streak, Points |
| **Aplikasi** | Sekkha Apps (Frontend & Backend) |
| **Versi** | 2.1.0 |
| **Status** | Approved / Ready for Development |

---

## 1. Ringkasan & Tujuan

Modul **Users** adalah pusat data personal anggota: profil, identitas login, registrasi mandiri, account claim, perubahan email terverifikasi, riwayat presensi acara, streak mingguan, dan poin.

> **Pemberitahuan Penghapusan Fitur**:
> 1. Fitur **badge**, **level**, dan **achievement** telah **dihapus tuntas** dari seluruh sistem (database, API, dan UI).
> 2. Field profil **`avatar_url`**, **`school_level`**, **`attendance_count_30d`**, dan **`badges_count`** telah **ditiadakan/dihapus**.
> 3. Identitas **`userNumber`** dibuat **secara otomatis langsung oleh sistem** dengan spesifikasi dan format identik (`yyyymmddnum`), baik untuk akun hasil registrasi mandiri maupun akun pra-registrasi (*pre-provisioning*) yang dibuat secara manual oleh Pengurus.

Tujuan utama:
1. **Single Source of User Identity**: Mengelola data personal, kredensial login, dan nomor anggota terstandardisasi.
2. **Konsistensi Penomoran Anggota**: `userNumber` selalu otomatis di-generate oleh sistem, unik, dan tidak dapat diubah oleh siapapun.
3. **Keamanan & Privasi (UU PDP / GDPR)**: Perlindungan data pribadi (enkripsi at-rest Tier 2 pada kolom PII seperti telepon, tanggal lahir, dan gender) serta pembatasan field publik vs internal.
4. **Verifikasi Perubahan Email**: User dapat mengganti alamat email mandiri kapan saja, dengan keharusan verifikasi kode 6 digit sebelum email baru dapat digunakan untuk login atau pemulihan akun.

---

## 2. Definisi Peran (Roles)

Role resmi sistem menggunakan standar Bahasa Inggris:

| Role | Hak Akses Modul Users |
| --- | --- |
| `member` | Membaca dan memperbarui profil pribadi, meminta verifikasi perubahan email, membaca riwayat presensi sendiri, streak, dan mutasi poin. |
| `activist` | Hak akses setara `member` pada modul Users. (Aktivis memiliki izin scan presensi di modul Event, namun tidak memiliki hak khusus di data profil jemaat lain). |
| `organizer` | Seluruh akses `activist` + melihat metrik agregat internal anggota lain (`points`, `streak`) dan membuat People manual (*pre-provisioning*). |
| `admin` | Seluruh akses `organizer` + mengubah role, mereset password jemaat, dan audit sistem penuh. |

---

## 3. Identitas Akun & Pembuatan Otomatis

### 3.1. Penomoran Anggota Otomatis (`userNumber`)

`userNumber` adalah nomor anggota resmi komunitas vihara yang bersifat unik dan permanen.

* **Aturan Pembuatan Otomatis**: Baik saat dibuat manual oleh Organizer via People management maupun saat user registrasi mandiri via OTP, **sistem otomatis langsung membuatkan `userNumber`**. Client atau input form dilarang mengirimkan `userNumber`.
* **Format & Tipe Data**: Integer numerik murni `yyyymmddnn` (10 digit, disimpan sebagai `BigInt` di database dan diserialisasi sebagai integer/number di API).
  * `yyyy`: Tahun pembuatan akun (4 digit, contoh: `2026`).
  * `mm`: Bulan pembuatan akun (2 digit, contoh: `10`).
  * `dd`: Tanggal pembuatan akun (2 digit, contoh: `23`).
  * `nn`: Nomor urut pendaftaran pada tanggal tersebut (2 digit berurutan: `01`–`99`).
  * Contoh hasil: `2026102301`.
* **Karakteristik**:
  * Efisien, murni numerik, dan hemat ruang penyimpanan.
  * Bersifat *immutable* (tidak dapat diedit atau diperbarui setelah diterbitkan).
  * Divalidasi dengan database *unique constraint* dan penanganan retry transaksi jika terjadi benturan nomor urut (*race condition*).
  * Dapat digunakan langsung sebagai identifier login pada `POST /api/auth/login`.

### 3.2. Nama Pengguna Otomatis (`username`)

* Dibuat otomatis oleh sistem dari nama yang dinormalisasi (lowercase, alfanumerik) + angka random (contoh: `budi48291`).
* Unik dan berfungsi sebagai identifier login alternatif.

### 3.3. Email & Status Verifikasi (`email`, `email_verified`, `pending_email`)

* **Akun Pre-provisioning (Manual People)**: `email: null` saat dibuat oleh Organizer sampai jemaat melakukan claim account.
* **Akun Registrasi Mandiri**: `email` langsung berstatus terverifikasi (`email_verified: true`) karena berhasil melalui alur OTP awal.
* **Pergantian Email**: Email baru masuk ke `pending_email` dan tidak menggantikan `email` lama sebelum kode verifikasi valid dimasukkan.

### 3.4. Login Identifier Multi-Akses

Endpoint `POST /api/auth/login` menerima salah satu dari 3 kredensial sebagai field `identifier`:
1. `username`
2. `userNumber` (atau `user_number`)
3. `email` (hanya email yang sudah berstatus terverifikasi)

---

## 4. Alur Claim Akun Pra-Registrasi (Account Claim)

Saat Organizer membuat jemaat manual via `POST /api/people/members`, sistem menerbitkan:
- `userNumber` otomatis format integer numerik `yyyymmddnn` (contoh: `2026102301`).
- `username` otomatis (misal: `siti73104`).
- Password dummy sementara (`sekkha` + 5 angka random + `puggala`, misal: `sekkha73104puggala`), disimpan ter-hash.

**Proses Claim Mandiri**:
1. Jemaat login pertama kali menggunakan `username` atau `userNumber` dengan password dummy.
2. Respons login mengembalikan flag `requires_password_change: true` dan token onboarding terbatas.
3. Jemaat wajib mengganti password via `POST /api/users/change-password`.
4. Jemaat memasukkan email via `POST /api/users/email-verification/request`.
5. Jemaat memvalidasi kode OTP 6 digit via `POST /api/users/email-verification/confirm`.
6. Sistem menandai `is_claimed = true` dan `claimed_at = now()`. Semua riwayat presensi lama yang pernah dicatat tetap utuh.

---

## 5. Fitur Perubahan Email Mandiri

User yang telah memiliki akun dapat memperbarui alamat email mereka kapan saja melalui alur keamanan anti-takeover:

1. **Permintaan Ubah Email**:
   - User memanggil `POST /api/users/email-verification/request` dengan payload `{ "email": "emailbaru@example.com" }`.
   - Sistem menormalisasi email (trim, lowercase).
   - Sistem memvalidasi apakah email sudah digunakan oleh user lain.
   - Sistem menyimpan alamat baru pada kolom `pendingEmail` (atau token challenge terisolasi). Email lama **tetap aktif dan tetap digunakan untuk login** selama proses verifikasi belum selesai.
   - Sistem men-generate kode OTP numerik 6 digit (disimpan secara secure hash, berlaku 10 menit, cooldown kirim ulang 60 detik) dan mengirimkan ke email baru.
   - Respons API bersifat generik untuk mencegah penyingkapan keberadaan email (*anti email-enumeration*).
2. **Konfirmasi Kode Verifikasi**:
   - User memasukkan kode ke `POST /api/users/email-verification/confirm` dengan payload `{ "code": "123456" }`.
   - Sistem mencocokkan kode dengan hash, memverifikasi masa aktif (maksimal 5 kali percobaan gagal).
   - Setelah valid:
     - `pendingEmail` disalin menjadi `email` resmi.
     - `pendingEmail` dibersihkan (`null`).
     - `emailVerifiedAt` dicatat waktu saat ini.
     - Sesi audit log mencatat pergantian email.
   - Jika kode salah 5 kali atau melewati 10 menit, challenge dibatalkan dan user wajib meminta kode baru.

---

## 6. Spesifikasi Data Model & Kategorisasi Field

### 6.1. Kategorisasi Visibilitas Field Profil

* **Data Publik (Tampil pada profil jemaat lain)**:
  `id`, `name`, `role`, `school`, `class_grade`, `joined_at`.
* **Data Privat (Hanya terlihat oleh pemilik akun)**:
  `email`, `email_verified`, `pending_email`, `phone`, `birth_date`, `gender`, `username`, `user_number`.
* **Data Internal Pengurus (`organizer` / `admin` only)**:
  `points`, `streak`, `consecutive_missed`, `total_attendances`.
* **Field Dihapus (Out of Scope)**:
  `avatar_url`, `school_level`, `attendance_count_30d`, `badges_count`, `level`, `badges`.

---

## 7. Spesifikasi API Contract Modul Users

Seluruh respons mengikuti format standar Envelope Sekkha:
```json
{
  "status": "success",
  "code": 200,
  "message": "...",
  "data": {}
}
```

### 7.1. `GET /api/users/me`
Mengambil data lengkap profil pengguna yang sedang login.
- **Akses**: Terautentikasi (`requireAuth`).
- **Response 200 OK**:
  ```json
  {
    "status": "success",
    "code": 200,
    "message": "Request completed successfully",
    "data": {
      "id": "usr_abc123",
      "user_number": 2026102301,
      "username": "budi48291",
      "name": "Budi Santoso",
      "email": "budi@example.com",
      "email_verified": true,
      "pending_email": null,
      "role": "member",
      "is_claimed": true,
      "onboarding_completed": true,
      "school_id": "sch_12345",
      "school": "SMA Negeri 1 Jakarta",
      "class_grade": "11",
      "phone": "081234567890",
      "birth_date": "2008-05-14",
      "gender": "male",
      "points": 350,
      "joined_at": "2026-10-23T00:00:00.000Z"
    }
  }
  ```

### 7.2. `PATCH /api/users/me`
Memperbarui informasi profil mandiri pengguna.
- **Akses**: Terautentikasi (`requireAuth`).
- **Field yang Dilarang di Update via Endpoint Ini**: `email` (gunakan alur verifikasi), `user_number`, `username`, `role`, `points`. Jika dikirim, API mengembalikan error `400 Bad Request`.
- **Request Body (Semua Opsional)**:
  ```json
  {
    "name": "Budi Santoso",
    "school_id": "sch_12345",
    "class_grade": "11",
    "phone": "081234567890",
    "birth_date": "2008-05-14",
    "gender": "male"
  }
  ```
- **Response 200 OK**: Envelope standar dengan payload data profil terbaru (format identik `GET /api/users/me`).

### 7.3. `PATCH /api/users/me/onboarding`
Menandai penyelesaian tahap pengenalan aplikasi / onboarding.
- **Akses**: Terautentikasi (`requireAuth`).
- **Response 200 OK**:
  ```json
  {
    "status": "success",
    "code": 200,
    "message": "Onboarding completed",
    "data": {
      "onboarding_completed": true
    }
  }
  ```

### 7.4. `POST /api/users/email-verification/request`
Meminta pengiriman kode verifikasi 6 digit untuk pendaftaran email baru atau perubahan alamat email.
- **Akses**: Terautentikasi (`requireAuth`, termasuk token onboarding claim).
- **Rate Limit**: 5 request per 15 menit per user & IP. Cooldown kirim ulang 60 detik.
- **Request Body**:
  ```json
  {
    "email": "baru@example.com"
  }
  ```
- **Response 200 OK** (Generik / Anti-Enumeration):
  ```json
  {
    "status": "success",
    "code": 200,
    "message": "Verification code sent if the email is available",
    "data": {
      "expires_in_seconds": 600,
      "resend_after_seconds": 60
    }
  }
  ```

### 7.5. `POST /api/users/email-verification/confirm`
Mengonfirmasi 6 digit kode OTP verifikasi email.
- **Akses**: Terautentikasi (`requireAuth`, termasuk token onboarding claim).
- **Request Body**:
  ```json
  {
    "code": "123456"
  }
  ```
- **Response 200 OK**:
  ```json
  {
    "status": "success",
    "code": 200,
    "message": "Email verified successfully",
    "data": {
      "email": "baru@example.com",
      "email_verified": true,
      "is_claimed": true
    }
  }
  ```

### 7.6. `POST /api/users/change-password`
Mengganti password akun sendiri. Digunakan pada menu pengaturan akun serta langkah wajib pertama saat claim account pra-registrasi.
- **Akses**: Terautentikasi (`requireAuth`, termasuk token onboarding).
- **Request Body**:
  ```json
  {
    "currentPassword": "OldPassword123!",
    "newPassword": "NewStrongPassword456!"
  }
  ```
- **Response 200 OK**:
  ```json
  {
    "status": "success",
    "code": 200,
    "message": "Password berhasil diubah. Seluruh sesi lain telah dikeluarkan.",
    "data": {
      "password_changed_by_user": true,
      "is_claimed": false
    }
  }
  ```

### 7.7. `GET /api/users/me/attendances`
Mengambil riwayat kehadiran acara yang pernah dihadiri jemaat.
- **Akses**: Terautentikasi (`requireAuth`).
- **Query Params**: `limit` (default: 10, max: 50), `cursor` (string pagination).
- **Response 200 OK**:
  ```json
  {
    "status": "success",
    "code": 200,
    "message": "Request completed successfully",
    "data": {
      "items": [
        {
          "id": "att_123",
          "event_id": "evt_456",
          "event_title": "Kebaktian Remaja Minggu Pagi",
          "event_date": "2026-10-25T09:00:00.000Z",
          "method": "qr",
          "points_earned": 50,
          "scanned_at": "2026-10-25T09:15:22.000Z"
        }
      ],
      "pagination": {
        "next_cursor": null,
        "total": 18
      }
    }
  }
  ```

### 7.8. `GET /api/users/me/streak`
Mengambil status keaktifan beruntun jemaat (*weekly streak*).
- **Akses**: Terautentikasi (`requireAuth`).
- **Response 200 OK**:
  ```json
  {
    "status": "success",
    "code": 200,
    "message": "Request completed successfully",
    "data": {
      "current_streak": 4,
      "longest_streak": 12,
      "last_attended": "2026-10-25T09:15:22.000Z"
    }
  }
  ```

### 7.9. `GET /api/users/me/point-transactions`
Mengambil riwayat transaksi perolehan atau penggunaan poin jemaat.
- **Akses**: Terautentikasi (`requireAuth`).
- **Response 200 OK**:
  ```json
  {
    "status": "success",
    "code": 200,
    "message": "Request completed successfully",
    "data": {
      "items": [
        {
          "id": "tx_789",
          "points": 50,
          "type": "attendance",
          "description": "Presensi Acara: Kebaktian Remaja Minggu Pagi",
          "created_at": "2026-10-25T09:15:22.000Z"
        }
      ]
    }
  }
  ```

### 7.10. `GET /api/users/me/export`
Mengekspor seluruh data pribadi pengguna dalam format JSON (Kepatuhan UU PDP).
- **Akses**: Terautentikasi (`requireAuth`).

### 7.11. `POST /api/users/me/delete-account`
Permintaan mandiri penghapusan akun secara permanen.
- **Akses**: Terautentikasi (`requireAuth`).
- **Request Body**:
  ```json
  {
    "password": "Password123!",
    "confirmation": "DELETE"
  }
  ```

---

## 8. Matrix Kriteria Penerimaan (Acceptance Criteria)

| ID | Skenario Pengujian | Hasil yang Diharapkan |
| --- | --- | --- |
| **AC-USR-01** | Pengurus membuat People manual via `POST /api/people/members` | Sistem otomatis men-generate `userNumber` integer format numerik `yyyymmddnn` tanpa input client. |
| **AC-USR-02** | Calon jemaat mendaftar mandiri via alur register OTP | Sistem otomatis men-generate `userNumber` integer format numerik `yyyymmddnn` yang persis sama. |
| **AC-USR-03** | Dua akun dibuat pada tanggal yang sama | Nomor urut `num` bertambah berurutan (`...0001`, `...0002`) tanpa benturan duplikasi. |
| **AC-USR-04** | User memanggil `GET /api/users/me` | Respons tidak memuat field `avatar_url`, `school_level`, `attendance_count_30d`, `badges_count`, `level`, maupun badge. |
| **AC-USR-05** | User mencoba mengirim `email`, `user_number`, `username`, atau `role` ke `PATCH /api/users/me` | Request ditolak dengan error 400 Bad Request / 403 Forbidden. |
| **AC-USR-06** | User meminta ganti email ke `POST /api/users/email-verification/request` | Kode OTP dikirim ke email baru, email baru dicatat sebagai `pendingEmail`, email lama tetap aktif. |
| **AC-USR-07** | User memasukkan kode verifikasi email yang benar ke `POST /api/users/email-verification/confirm` | Email aktif berubah ke email baru, `pendingEmail` di-reset `null`, `emailVerifiedAt` terisi waktu sekarang. |
| **AC-USR-08** | Percobaan input kode verifikasi salah hingga 5 kali | Challenge terkunci/batal, percobaan ke-6 ditolak dengan kode error `429 Too Many Requests` / `400 Challenge Expired`. |
| **AC-USR-09** | User mengakses `/api/users/me/badges` atau `/api/users/me/level` | Mengembalikan respons `404 Not Found` (endpoint ditiadakan). |
