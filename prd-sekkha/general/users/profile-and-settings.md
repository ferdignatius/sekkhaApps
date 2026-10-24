# PRD: User Profile, Account Settings, & OTP Verification System — Sekkha Apps

| Metadata | Detail |
| --- | --- |
| **Dokumen** | Product Requirement Document (PRD) |
| **Fitur** | Profil Pribadi, Kartu Anggota Digital, Pengaturan Akun, Ganti Password, & OTP Email |
| **Domain** | `users` / `profile` / `auth` |
| **Aplikasi** | Sekkha Apps (Frontend & Backend) |
| **Versi** | 2.0.0 (Unified Specification) |
| **Status** | Approved / Ready for Development |
| **Referensi Terkait** | `prd-sekkha/general/users/users.md`, `prd-sekkha/general/users/email-verification-for-account-claim.md`, `prd-sekkha/configure/masterdata/schools.md` |

---

## 1. Ringkasan Eksekutif & Tujuan

Profil dan Pengaturan Akun adalah pusat identitas mandiri bagi setiap jemaat vihara yang telah terdaftar di Sekkha Apps (`/home/profile`). Modul ini menggabungkan:
1. **Identitas Komunitas (Digital Member Card)**: Kartu identitas permanen berdesain Clay premium yang menampilkan Nama Lengkap, Nomor Anggota (`userNumber`), Almamater Sekolah/Institusi, Tanggal Bergabung, serta **QR Code Statis Permanen** yang digunakan saat presensi event di vihara.
2. **Manajemen Data Pribadi**: Jemaat dapat memperbarui nama panggilan, nomor telepon, tanggal lahir, jenis kelamin, alamat, dan sekolah almamater.
3. **Buku Besar Poin Transparan (*Points Ledger / History*)**: Riwayat mutasi perolehan poin yang transparan (`/api/users/me/points-history`) mencakup tanggal kegiatan, jenis transaksi (kehadiran rutin, tugas pelayanan ibadah, bonus streak, dll.), poin masuk/keluar, dan saldo akhir.
4. **Keamanan Akun & Pengaturan (*Account Settings*)**:
   - Ganti Password mandiri dengan verifikasi password lama.
   - Ganti Email mandiri yang dilindungi oleh **Sistem OTP 6-Digit Kriptografis** anti-pembajakan akun (*anti-takeover*) dan *blind index hashing*.
5. **Standarisasi Bahasa**: 100% Bahasa Inggris di seluruh antarmuka profil dan pengaturan.

---

## 2. Definisi Role & Hak Akses

Fitur Profil & Pengaturan Akun berlaku universal untuk seluruh role jemaat dan pengurus: `member`, `activist`, `organizer`, `admin`.

| Role | Lihat Profil Sendiri & Kartu Anggota | Edit Data Pribadi Sendiri | Ganti Password & Email Sendiri | Akses Riwayat Poin Sendiri |
| --- | :---: | :---: | :---: | :---: |
| `member` | v | v | v (via OTP) | v |
| `activist` | v | v | v (via OTP) | v |
| `organizer` | v | v | v (via OTP) | v |
| `admin` | v | v | v (via OTP) | v |

> **Prinsip Privasi**: Setiap user **hanya dapat mengakses dan mengedit data miliknya sendiri** (`/api/users/me/*`). Server menolak request yang mencoba memanipulasi ID user lain dengan `403 Forbidden`.

---

## 3. Komponen Utama & Alur Pengguna (User Flows)

Halaman `/home/profile` memiliki 3 tab terorganisir dengan Clay Design System:

```
[ Tab 1: Member Card & ID ]  |  [ Tab 2: Personal Profile ]  |  [ Tab 3: Security & Settings ]
```

### 3.1. Tab 1: Digital Member ID Card & Points History
* **Kartu Anggota Digital**:
  * Desain elegan Clay Card dengan gradasi emas hangat (`#e8b94a` dan `#faf5e8`).
  * Header: Logo Vihara Sekkha + Label *"Official Community Member"*.
  * QR Code Statis Permanen berbasis teks `userNumber` (mis. `2026102401`).
  * Nama lengkap jemaat dan role badge.
  * Ticker ringkasan: *Total Points Earned*, *Current Streak (Weeks)*, dan *School Almamater*.
  * Tombol aksi: *"Download Member Card"* (simpan sebagai gambar) dan *"Enlarge QR"* (tampilan QR Code layar penuh untuk di-scan oleh pengurus di pintu masuk ibadah).
* **Riwayat Poin Transparan (Points History)**:
  * Menampilkan daftar transaksi poin dari endpoint `GET /api/users/me/points-history`.
  * Setiap entri memuat: Nama Kegiatan / Event, Waktu & Tanggal, Tag Kategori, dan Badge Perubahan Poin (`+50 Pts` hijau atau `-15 Pts` merah jika penalti terlambat).

### 3.2. Tab 2: Edit Personal Profile
* Form data profil:
  * **Full Name** *(Wajib)*.
  * **Phone Number / WhatsApp** *(Opsional, e.g. `08123456789`)*.
  * **School / University** *(Dropdown interaktif dari master data `/configure/schools`, memungkinkan jemaat memilih almamater verified)*.
  * **Date of Birth** *(Datepicker)*.
  * **Gender** *(Radio toggle: Male / Female)*.
  * **Bio / Spiritual Motto** *(Textarea singkat)*.
  * **Address** *(Opsional)*.
* Saat ditekan *"Save Changes"*, memanggil `PUT /api/users/me/profile`. Data langsung ter-update secara real-time.

### 3.3. Tab 3: Account Security & OTP Email Verification

#### A. Ganti Password Mandiri
1. User memasukkan:
   - Current Password *(Wajib)*
   - New Password *(Wajib, min 8 karakter, kombinasi huruf & angka)*
   - Confirm New Password *(Wajib, harus sama)*
2. Saat submit (`POST /api/users/change-password`):
   - Server memvalidasi hash `bcrypt` password lama.
   - Jika valid, server meng-hash password baru dan meng-update database.
   - Sesi lama di-refresh dan notifikasi sukses ditampilkan.

#### B. Ganti Email Mandiri dengan OTP 6-Digit (Anti-Account-Takeover)
Alur penggantian email dirancang dengan standar keamanan perbankan/fintech:
1. **Langkah 1: Request OTP (`POST /api/users/email-verification/request`)**
   - User memasukkan alamat email baru.
   - Server memeriksa apakah email baru sudah terdaftar via **HMAC-SHA256 Blind Index** ($O(1)$). Jika sudah dipakai akun lain, server menolak dengan `409 Conflict`.
   - Server membuat OTP 6 digit acak numerik (mis. `482910`).
   - Server mengenkripsi OTP dengan hashing (SHA-256) dan menyimpan di redis/cache/database dengan waktu kedaluwarsa **10 menit**.
   - Server mengirimkan email resmi berisi kode OTP ke alamat email baru.
2. **Langkah 2: Verifikasi OTP (`POST /api/users/email-verification/verify`)**
   - User diarahkan ke dialog input OTP 6 digit (input otomatis berpindah fokus antar kotak digit).
   - User memasukkan kode 6 digit.
   - Server memvalidasi kode OTP:
     - Jika salah: counter kesalahan bertambah (maksimal 5 kali percobaan salah, setelah itu OTP diblokir/hangus).
     - Jika benar & belum kedaluwarsa: Server meng-update kolom `email` (dienkripsi AES-256-GCM) dan `emailBindex` di database `User`, mengisi `emailVerifiedAt: new Date()`, dan menghapus cache OTP.
   - Antarmuka menampilkan notifikasi sukses dan email akun resmi berubah.

---

## 4. Spesifikasi Sistem OTP (One-Time Password)

Untuk menjamin keamanan maksimal tanpa risiko eksploitasi brute-force:
1. **Format Kode**: 6 digit numerik (`crypto.randomInt(100000, 999999)`).
2. **Masa Berlaku (TTL)**: Tepat **10 menit** (600 detik).
3. **Penyimpanan**: Disimpan di cache/Redis dengan key `otp:email_change:<userId>` yang memuat hash kode OTP, new email bindex, counter percobaan, dan timestamp.
4. **Rate Limiting & Anti-Abuse**:
   - Maksimal request kirim OTP: **1 kali per 60 detik** (cooldown resend).
   - Maksimal permintaan per user: **3 kali per 1 jam**.
   - Maksimal salah input kode OTP: **5 kali berturut-turut**. Jika gagal 5 kali, sesi verifikasi otomatis dibatalkan (*invalidated*).
5. **Anti-Enumeration & Privacy**:
   - Kolom email jemaat dienkripsi menggunakan AES-256-GCM saat istirahat (*at rest*).
   - Pencarian keunikan email menggunakan Blind Index HMAC-SHA256 (`emailBindex`).

---

## 5. Spesifikasi Teknis & API Contract

### 5.1. `GET /api/users/me`
Mengambil data profil lengkap, metadata akun, dan almamater user yang sedang login.
* **Headers**: `Authorization: Bearer <accessToken>`
* **Response Envelope (200 OK)**:
  ```json
  {
    "status": "success",
    "code": 200,
    "message": "User profile retrieved successfully",
    "data": {
      "id": "cuid_001",
      "user_number": 2026102401,
      "username": "budi.santoso",
      "email": "budi.santoso@gmail.com",
      "email_verified": true,
      "role": "member",
      "is_claimed": true,
      "created_at": "2026-08-10T12:00:00.000Z",
      "profile": {
        "name": "Budi Santoso",
        "phone": "08123456789",
        "gender": "male",
        "date_of_birth": "2005-04-12",
        "address": "Jl. Kemenangan No. 12, Jakarta",
        "bio": "Keep cultivating loving-kindness and mindfulness.",
        "school": {
          "id": "sch_12",
          "name": "SMA Tri Ratna",
          "type": "SMA/SMK"
        }
      },
      "stats": {
        "total_points": 850,
        "current_streak": 6,
        "total_attendances": 17
      }
    }
  }
  ```

### 5.2. `PUT /api/users/me/profile`
Memperbarui data diri pribadi.
* **Request Body (Zod Validation)**:
  ```typescript
  export const UpdateProfileSchema = z.object({
    name: z.string().trim().min(2).max(100).optional(),
    phone: z.string().trim().max(20).optional().nullable(),
    school_id: z.string().cuid().optional().nullable(),
    gender: z.enum(["male", "female"]).optional().nullable(),
    date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    address: z.string().max(255).optional().nullable(),
    bio: z.string().max(300).optional().nullable(),
  })
  ```

### 5.3. `POST /api/users/email-verification/request`
Meminta pengiriman kode OTP ke email baru.
* **Request Body**:
  ```json
  {
    "new_email": "budi.new@gmail.com"
  }
  ```
* **Response**: `200 OK` (Message: *"Verification OTP sent to your new email"*).

### 5.4. `POST /api/users/email-verification/verify`
Memvalidasi kode OTP 6 digit dan meng-update email resmi.
* **Request Body**:
  ```json
  {
    "new_email": "budi.new@gmail.com",
    "otp_code": "482910"
  }
  ```
* **Response**: `200 OK` (Message: *"Email updated and verified successfully"*).

### 5.5. `POST /api/users/change-password`
Ganti password akun mandiri.
* **Request Body**:
  ```typescript
  export const ChangePasswordSchema = z.object({
    current_password: z.string().min(1, "Current password is required"),
    new_password: z.string().min(8, "New password must be at least 8 characters"),
  })
  ```

### 5.6. `GET /api/users/me/points-history`
Mengambil buku besar catatan mutasi poin pengguna yang login.
* **Response Envelope**:
  ```json
  {
    "status": "success",
    "code": 200,
    "message": "Points history retrieved successfully",
    "data": [
      {
        "id": "pt_1",
        "created_at": "2026-10-24T11:00:00.000Z",
        "type": "attendance",
        "description": "Sunday Youth Fellowship — Regular Attendance",
        "points_delta": 50,
        "running_balance": 850
      },
      {
        "id": "pt_2",
        "created_at": "2026-10-24T11:00:00.000Z",
        "type": "service_duty",
        "description": "Service Role Bonus: Puja Leader (Chanting)",
        "points_delta": 30,
        "running_balance": 800
      }
    ]
  }
  ```

---

## 6. Antarmuka Pengguna & Clay Aesthetics

* **Desain Kartu Anggota**: Sudut melengkung `rounded-[24px]`, shadow halus `shadow-sm`, ring kontras tipis, dan backdrop hangat `#fffaf0`.
* **OTP Input Component**: Menggunakan 6 kotak input terpisah dengan transisi fokus otomatis, paste clipboard support, dan hitung mundur timer 60 detik untuk tombol *"Resend OTP"*.
* **Semua Label Bahasa Inggris**: *"Digital Member ID"*, *"Personal Information"*, *"Account Security"*, *"Change Password"*, *"Verify New Email"*, *"Enter 6-Digit OTP"*, *"Points Ledger"*.
