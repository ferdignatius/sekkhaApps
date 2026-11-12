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
3. **Keamanan, Privasi & Retensi Data (UU PDP No. 27/2022)**: Perlindungan data pribadi (enkripsi at-rest Tier 2 AES-256-GCM pada `email`, minimisasi data tanpa menyimpan nomor telepon/tanggal lahir, pembatasan field publik vs internal, serta anonimisasi otomatis akun tidak aktif > 2 tahun kalender berturut-turut dengan tetap menjaga arsip statistik kehadiran agregat).
4. **Verifikasi Perubahan Email**: User dapat mengganti alamat email mandiri kapan saja, dengan keharusan verifikasi kode 6 digit sebelum email baru dapat digunakan untuk login atau pemulihan akun.

---

## 2. Definisi Peran (Roles)

Role resmi sistem menggunakan standar Bahasa Inggris:

| Role | Hak Akses Modul Users |
| --- | --- |
| `member` | Membaca dan memperbarui profil pribadi, meminta verifikasi perubahan email, membaca riwayat presensi sendiri, streak, dan mutasi poin. |
| `activist` | Hak akses setara `member` pada modul Users. (Aktivis memiliki izin scan presensi di modul Event, namun tidak memiliki hak khusus di data profil jemaat lain). |
| `organizer` | Seluruh akses `activist` + melihat metrik agregat internal anggota lain (`points`, `streak`), melihat direktori People, membuat People manual (*pre-provisioning*), dan mereset password sementara khusus akun `member`/`activist` yang belum ter-claim. (Tidak dapat mengubah data/role atau menghapus akun). |
| `admin` | Seluruh akses `organizer` + mengubah data/role, menghapus akun user lain, dan audit sistem penuh (dilarang mengubah role/data maupun menghapus akun sendiri via modul People). |

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
  * Berfungsi sebagai nomor identitas anggota (kartu anggota/presensi) dan **dapat digunakan sebagai identifier login** (10-digit Member ID) selain `username` dan `email` terverifikasi.

### 3.2. Nama Pengguna (`username`)

* Dibuat otomatis oleh sistem saat registrasi/pre-provisioning dari nama yang dinormalisasi (lowercase, alfanumerik) + angka random (contoh: `budi48291`).
* Unik, berfungsi sebagai identifier login alternatif selain email dan `userNumber`, serta **dapat diperbarui secara mandiri oleh pengguna** melalui pengaturan profil (`/profile`, format `[a-z0-9._]`, 3–30 karakter, divalidasi keunikannya oleh server).

### 3.3. Email & Status Verifikasi (`email`, `email_verified`, `pending_email`)

* **Akun Pre-provisioning (Manual People)**: `email: null` saat dibuat oleh Organizer sampai jemaat melakukan claim account.
* **Akun Registrasi Mandiri**: `email` langsung berstatus terverifikasi (`email_verified: true`) karena berhasil melalui alur OTP awal.
* **Pergantian Email**: Email baru masuk ke `pending_email` dan tidak menggantikan `email` lama sebelum kode verifikasi valid dimasukkan.

### 3.4. Login Identifier (`username`, `userNumber`, & `email`)

Endpoint `POST /api/auth/login` menerima salah satu dari 3 kredensial sebagai field `identifier`:
1. `username`
2. `userNumber` (10-digit Member ID, misal `2026102301`)
3. `email` (hanya email yang sudah berstatus terverifikasi)

---

## 4. Alur Claim Akun Pra-Registrasi (Account Claim)

Saat Organizer membuat jemaat manual via `POST /api/people/members` (atau `POST /api/people`), sistem menerbitkan:
- `userNumber` otomatis format integer numerik `yyyymmddnn` (contoh: `2026102301`).
- `username` otomatis (misal: `siti73104`).
- Password dummy sementara (`sekkha` + 5 angka random + `puggala`, misal: `sekkha73104puggala`), disimpan ter-hash.

**Proses Claim Mandiri**:
1. Jemaat login pertama kali menggunakan `username` atau `userNumber` (10 digit) dengan password dummy.
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
  `email`, `email_verified`, `pending_email`, `username`, `user_number`.
* **Data Internal Pengurus (`organizer` / `admin` only)**:
  `points`, `streak`, `consecutive_missed`, `total_attendances`.
* **Field Dihapus (Out of Scope / Data Minimization)**:
  `avatar_url`, `school_level`, `attendance_count_30d`, `badges_count`, `level`, `badges`, `phone`, `birth_date`.

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
      "points": 350,
      "joined_at": "2026-10-23T00:00:00.000Z"
    }
  }
  ```

### 7.2. `PATCH /api/users/me` (dan `PUT /api/users/me/profile`)
Memperbarui informasi profil mandiri pengguna (termasuk `username` yang dapat diedit di pengaturan profil).
- **Akses**: Terautentikasi (`requireAuth`).
- **Field yang Dilarang di Update via Endpoint Ini**: `email` (gunakan alur verifikasi), `user_number`, `role`, `points`. Jika dikirim, API mengembalikan error `400 Bad Request`.
- **Request Body (Semua Opsional)**:
  ```json
  {
    "name": "Budi Santoso",
    "username": "budi.santoso",
    "school_id": "sch_12345",
    "class_grade": "11"
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

### 7.6. `POST /api/users/change-password/request-otp` & `POST /api/users/change-password`
Mengganti password akun sendiri (lihat detail 2FA OTP di `prd-sekkha/general/users/profile-and-settings.md` dan alur claim di `prd-sekkha/general/users/email-verification-for-account-claim.md`).
- **Akses**: Terautentikasi (`requireAuth`, termasuk token onboarding).
- **Langkah 1 (`POST /api/users/change-password/request-otp`)**: Memverifikasi password lama (`current_password` / `currentPassword`) dan mengirim kode OTP 6 digit ke email terverifikasi (untuk akun yang sudah memiliki email terverifikasi).
- **Langkah 2 (`POST /api/users/change-password`)**:
  - **Request Body**:
    ```json
    {
      "current_password": "OldPassword123!",
      "new_password": "NewStrongPassword456!",
      "otp": "123456"
    }
    ```
    *(Catatan: Mendukung alias camelCase `currentPassword` / `newPassword`; untuk akun pre-provisioned yang belum memiliki email terverifikasi pada langkah pertama claim account, penggantian password dummy dilakukan sebelum langkah verifikasi email).*
  - **Response 200 OK**:
    ```json
    {
      "status": "success",
      "code": 200,
      "message": "Password berhasil diubah. Seluruh sesi lain telah dikeluarkan.",
      "data": {
        "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "password_changed_by_user": true,
        "is_claimed": true
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

### 7.12. `GET /api/users/me/card` (Kartu Anggota Digital & QR Presensi)
Mengambil data kartu anggota digital jemaat beserta representasi QR Code statis permanen.
- **Akses**: Terautentikasi (`requireAuth`).
- **Karakteristik QR Code**:
  - Meng-encode string statis unik nomor anggota: **`userNumber`** (misal: `"2026102301"`).
  - **Permanen & Tanpa Kedaluwarsa (*No Rolling Expiry*)**: QR Code tidak berubah, dapat dicetak di kartu fisik/lanyard, disimpan sebagai gambar galeri, dan tetap dapat dipindai saat smartphone jemaat offline / tanpa kuota data.
- **Response 200 OK**:
  ```json
  {
    "status": "success",
    "code": 200,
    "message": "Member card retrieved successfully",
    "data": {
      "user_number": 2026102301,
      "name": "Budi Santoso",
      "role": "member",
      "school": "SMA Negeri 1 Jakarta",
      "qr_payload": "2026102301",
      "joined_at": "2026-10-23T00:00:00.000Z"
    }
  }
  ```

---

---

## 8. User Stories

| ID | Sebagai | Saya ingin | Supaya |
| --- | --- | --- | --- |
| **US-USR-01** | Jemaat baru / Pengurus | Memperoleh `userNumber` 10-digit format numerik `yyyymmddnn` secara otomatis dari sistem | Setiap anggota memiliki nomor induk unik permanen tanpa repot menginput manual |
| **US-USR-02** | Pengguna terdaftar | Menggunakan salah satu dari `userNumber`, `username`, atau `email` terverifikasi untuk masuk aplikasi | Saya memiliki fleksibilitas login saat lupa salah satu pengenal akun saya |
| **US-USR-03** | Pengguna terdaftar | Melihat profil lengkap, almamater sekolah, status keanggotaan, dan metrik gamifikasi diri sendiri | Saya mengetahui data pribadi yang tersimpan dan progres keaktifan saya di vihara |
| **US-USR-04** | Pengguna terdaftar | Memperbarui nama lengkap, username, dan data almamater secara mandiri | Data profil saya selalu terbarui tanpa harus menghubungi pengurus vihara |
| **US-USR-05** | Pengguna terdaftar | Memperbarui alamat email dengan perlindungan OTP verifikasi 6-digit | Keamanan akun saya terjamin dari pengambilalihan akun sepihak |
| **US-USR-06** | Pengguna terdaftar | Melihat riwayat kehadiran kebaktian beserta metode presensi dan perolehan poin per acara | Saya dapat mengevaluasi konsistensi kehadiran ibadah saya secara transparan |
| **US-USR-07** | Pengguna terdaftar | Memantau capaian *weekly streak* kehadiran rutin saya | Saya termotivasi untuk hadir kebaktian pemuda vihara secara konsisten setiap minggu |
| **US-USR-08** | Pengguna terdaftar | Mengunduh salinan seluruh data pribadi saya dalam format JSON (UU PDP) | Saya memiliki hak akses penuh terhadap transparansi data pribadi saya |

### Otomatisasi Masa Retensi & Anonimisasi Data (UU PDP Pasal 43 & Pasal 44)
- **Tracking Aktivitas (`lastActiveAt`)**: Diperbarui secara otomatis saat pengguna login, refresh token, registrasi, atau tercatat presensi kehadiran (`ATTENDANCE_RECORDED`).
- **Cron Retensi Harian (`retentionCron.ts`)**: Berjalan setiap hari pukul `02:30 WIB` (`"30 2 * * *"` `Asia/Jakarta`).
- **Aturan 2 Tahun Kalender**: Akun yang belum pernah dianonimkan (`anonymizedAt IS NULL`) dan tidak aktif lebih dari **2 tahun kalender berturut-turut** (`lastActiveAt < cutoff` maupun `stats.lastActivityAt < cutoff`) secara otomatis dianonimkan:
  - Menghapus identitas langsung (`email = null`, `emailBindex = null`, `emailVerifiedAt = null`, `password = null`, `username = null`, `userNumber = null`, `profile.name = "Former Member"`, `profile.schoolId = null`, `anonymizedAt = now()`).
  - Mencabut seluruh token refresh & cache sesi, serta mencatat audit log `USER_RETENTION_ANONYMIZED`.
  - **Tetap mempertahankan** baris historis agregat `Attendance` dan `PointTransaction` (tanpa identitas pribadi aktif) demi arsip sejarah & laporan statistik tahunan vihara.

---

## 9. Matrix Kriteria Penerimaan (Acceptance Criteria)

| ID | Skenario Pengujian | Hasil yang Diharapkan |
| --- | --- | --- |
| **AC-USR-01** | Pengurus membuat People manual via `POST /api/people/members` | Sistem otomatis men-generate `userNumber` integer format numerik `yyyymmddnn` tanpa input client. |
| **AC-USR-02** | Calon jemaat mendaftar mandiri via alur register OTP | Sistem otomatis men-generate `userNumber` integer format numerik `yyyymmddnn` yang persis sama. |
| **AC-USR-03** | Dua akun dibuat pada tanggal yang sama | Nomor urut `num` bertambah berurutan (`...0001`, `...0002`) tanpa benturan duplikasi. |
| **AC-USR-04** | User memanggil `GET /api/users/me` | Respons tidak memuat field `avatar_url`, `school_level`, `attendance_count_30d`, `badges_count`, `level`, `badges`, `phone`, maupun `birth_date`. |
| **AC-USR-05** | User mencoba mengirim `email`, `user_number`, atau `role` ke `PATCH /api/users/me` | Request ditolak dengan error 400 Bad Request / 403 Forbidden (`username` diperbolehkan untuk diubah selama unik dan valid). |
| **AC-USR-06** | User meminta ganti email ke `POST /api/users/email-verification/request` | Kode OTP dikirim ke email baru, email baru dicatat sebagai `pendingEmail`, email lama tetap aktif. |
| **AC-USR-07** | User memasukkan kode verifikasi email yang benar ke `POST /api/users/email-verification/confirm` | Email aktif berubah ke email baru, `pendingEmail` di-reset `null`, `emailVerifiedAt` terisi waktu sekarang. |
| **AC-USR-08** | Percobaan input kode verifikasi salah hingga 5 kali | Challenge terkunci/batal, percobaan ke-6 ditolak dengan kode error `429 Too Many Requests` / `400 Challenge Expired`. |
| **AC-USR-09** | User mengakses `/api/users/me/badges` atau `/api/users/me/level` | Mengembalikan respons `404 Not Found` (endpoint ditiadakan). |
| **AC-USR-10** | User membuka kartu anggota di `/profile/qr` | Menampilkan kartu anggota dengan QR statis berisi `userNumber`, nama, dan sekolah yang dapat di-scan panitia offline. |
| **AC-USR-11** | Cron retensi mengevaluasi akun tidak aktif > 2 tahun kalender | Data PII langsung dihapus/dianonimkan (`anonymizedAt` terisi), token sesi dicabut, audit log `USER_RETENTION_ANONYMIZED` tercatat, sementara statistik kehadiran agregat tetap tersimpan. |

---

## 10. Test Cases (Matriks Pengujian Terinci)

| Test Case ID | Kategori | Skenario / Deskripsi | Kondisi Awal (Preconditions) | Langkah Pengujian | Hasil yang Diharapkan | Tipe |
| --- | --- | --- | --- | --- | --- | --- |
| **TC-USR-01** | UserNumber Gen | Auto-generate `userNumber` pada registrasi mandiri | Tanggal sistem `2026-10-23`, belum ada pendaftaran | Register akun mandiri via OTP. | User tersimpan dengan `userNumber = 2026102301` (10 digit numerik integer murni). | Positive |
| **TC-USR-02** | UserNumber Gen | Auto-generate urutan berikutnya pada hari yang sama | Akun `2026102301` sudah ada di sistem | Buat akun kedua pada tanggal `2026-10-23`. | Akun kedua otomatis menerima `userNumber = 2026102302`. Tidak ada tabrakan nomor urut. | Positive |
| **TC-USR-03** | UserNumber Immutability | Mencegah modifikasi `userNumber` via update profil | Akun user aktif | Submit `PATCH /api/users/me` dengan payload `{ "user_number": 9999999999 }`. | HTTP 400 Bad Request envelope. Nilai `userNumber` tetap tidak berubah di database. | Security |
| **TC-USR-04** | Login Identifier | Login menggunakan 10-digit `userNumber` | Akun aktif dengan userNumber `2026102301` | Submit `POST /api/auth/login` dengan `identifier: "2026102301"` dan password benar. | HTTP 200 envelope. Login berhasil dan token sesi diterbitkan. | Positive |
| **TC-USR-05** | Get Profile | Ambil data profil pribadi user (`GET /api/users/me`) | User login terautentikasi | Panggil `GET /api/users/me`. | HTTP 200 envelope. Data memuat `user_number`, `username`, `name`, `email`, data profil terdekripsi, `stats`, dan almamater sekolah. Tidak ada field terlarang (`avatar_url`, `badges`). | Positive |
| **TC-USR-06** | Update Profile | Update nama lengkap dan username valid | User login terautentikasi | Submit `PATCH /api/users/me` dengan `name: "Ananda Budi"`, `username: "ananda.budi"`. | HTTP 200 envelope. Data nama dan username diperbarui di DB. | Positive |
| **TC-USR-07** | Privilege Guard | User mencoba mengubah `role` atau `points` via update profil | User role `member` | Submit `PATCH /api/users/me` dengan payload `{ "role": "admin", "points": 10000 }`. | HTTP 400 Bad Request / parameter diabaikan. `role` tetap `member` dan `points` tidak bertambah. | Security |
| **TC-USR-08** | Email Request | Permintaan ganti email mencatat `pendingEmail` | Email lama `lama@example.com` aktif | Submit `POST /api/users/email-verification/request` dengan `email: "baru@example.com"`. | HTTP 200 generic success. `lama@example.com` tetap aktif untuk login. `baru@example.com` tercatat di `pendingEmail`. Kode OTP 6 digit terkirim. | Positive |
| **TC-USR-09** | Email Confirm | Konfirmasi ganti email dengan OTP valid | Request ganti email aktif | Submit `POST /api/users/email-verification/confirm` dengan kode OTP valid. | HTTP 200 envelope. `email` resmi berubah menjadi `baru@example.com`, `emailBindex` dihitung ulang, `pendingEmail` di-reset ke `null`, `emailVerifiedAt` terisi. | Positive |
| **TC-USR-10** | Email Brute Force | Salah memasukkan OTP ganti email 5 kali | Request OTP aktif | Submit kode OTP salah sebanyak 5 kali berturut-turut. | Percobaan ke-5 gagal. Challenge OTP hangus/dihapus. Percobaan ke-6 ditolak HTTP 400/429. Email lama tetap tidak berubah. | Security |
| **TC-USR-11** | Attendances History | Mengambil daftar riwayat kehadiran jemaat | User memiliki riwayat absensi event | Panggil `GET /api/users/me/attendances?limit=10`. | HTTP 200 envelope. Menampilkan array entri presensi (`event_title`, `event_date`, `method`, `points_earned`, `scanned_at`) dengan pagination cursor. | Positive |
| **TC-USR-12** | Weekly Streak | Mengambil data streak mingguan jemaat | User rajin hadir 4 minggu berturut-turut | Panggil `GET /api/users/me/streak`. | HTTP 200 envelope. `current_streak = 4`, `longest_streak` terhitung benar, `last_attended` mengembalikan timestamp presensi terakhir. | Positive |
| **TC-USR-13** | Point Transactions | Mengambil buku besar riwayat mutasi poin | User memiliki riwayat transaksi poin | Panggil `GET /api/users/me/point-transactions`. | HTTP 200 envelope. Menampilkan log riwayat mutasi poin berurutan dengan jenis transaksi (`attendance`, `service_duty`, `bonus`) dan running balance. | Positive |
| **TC-USR-14** | Data Export | Ekspor data lengkap privasi pengguna (UU PDP) | User login terautentikasi | Panggil `GET /api/users/me/export`. | HTTP 200 envelope dengan payload arsip JSON berisi seluruh data profil terdekripsi, riwayat kehadiran, dan mutasi poin milik pengguna yang bersangkutan. | Positive / Compliance |
| **TC-USR-15** | Digital Card QR | Pengambilan payload QR Code kartu anggota | User login terautentikasi | Panggil `GET /api/users/me/card`. | HTTP 200 envelope. `qr_payload` mengembalikan string persis `userNumber` tanpa tanggal kedaluwarsa. | Positive |
| **TC-USR-16** | Deprecated Endpoints | Mengakses endpoint badge atau level yang sudah dihapus | Sistem versi terkini | Panggil `GET /api/users/me/badges` atau `GET /api/users/me/level`. | HTTP 404 Not Found envelope. Sistem bersih dari legacy gamification abstractions. | Negative / Deprecation |
| **TC-USR-17** | Retention Anonymization | Anonimisasi otomatis akun tidak aktif > 2 tahun kalender | Akun dengan `lastActiveAt` > 2 tahun lalu & `stats.lastActivityAt` kedaluwarsa | Jalankan `runInactiveAccountRetentionCleanup`. | PII dihapus/dianonimkan (`email=null`, `name="Former Member"`, `anonymizedAt != null`), token sesi dicabut, login ditolak, riwayat agregat `Attendance` tetap terjaga. | Compliance / Security |
