# PRD: People Management & Pre-Provisioning System — Sekkha Apps

| Metadata | Detail |
| --- | --- |
| **Dokumen** | Product Requirement Document (PRD) |
| **Fitur** | Direktori Anggota, Pre-provisioning Jemaat, Kredensial Sementara, & Profil Jemaat |
| **Domain** | `people` / `users` / `pengurus` |
| **Aplikasi** | Sekkha Apps (Frontend & Backend) |
| **Versi** | 2.0.0 (Unified & Standardized) |
| **Status** | Approved / Ready for Development |
| **Referensi Terkait** | `prd-sekkha/general/users/users.md`, `prd-sekkha/general/users/profile-and-settings.md`, `prd-sekkha/configure/masterdata/schools.md` |

---

## 1. Ringkasan Eksekutif & Latar Belakang Masalah

Di komunitas vihara pemuda, banyak jemaat dan pemuda yang rutin hadir di kebaktian atau kegiatan sosial **sebelum mereka mengunduh aplikasi Sekkha**. Pengurus vihara membutuhkan mekanisme untuk:
1. **Mendaftarkan Jemaat Terlebih Dahulu (*Pre-provisioning*)**: Pengurus (`organizer` atau `admin`) dapat mendaftarkan jemaat baru secara langsung di sistem dengan data dasar (nama lengkap, kontak, almamater sekolah, tanggal lahir).
2. **Kredensial Login Mandiri Otomatis**: Sistem secara otomatis meng-generate nomor anggota resmi (`userNumber` format `yyyymmddnn`), `username` yang mudah dibaca, serta password sementara (*temporary password* berformat `sekkha#####puggala`) yang disimpan dalam bentuk hash `bcrypt`.
3. **Pencatatan Presensi Langsung**: Profil jemaat pre-provisioned langsung memiliki kartu identitas digital dan `userNumber` aktif yang dapat langsung di-scan saat absensi event tanpa menunggu user melakukan aktivasi akun.
4. **Klaim Akun Tanpa Kehilangan Data**: Ketika jemaat siap menggunakan aplikasi, mereka cukup login pertama kali menggunakan `userNumber` / `username` dan password sementara tersebut, kemudian dipandu mengganti password dan memverifikasi email tanpa kehilangan riwayat poin atau streak.
5. **Manajemen Direktori Anggota**: Direktori `/people` yang responsif, mudah dicari, difilter berdasarkan status klaim, role, atau sekolah, serta detail profil jemaat.

---

## 2. Definisi Role & Matriks Hak Akses

Menggunakan terminologi role Bahasa Inggris resmi: `member`, `activist`, `organizer`, `admin`.

| Role | Lihat Direktori People (`GET /api/people`) | Lihat Detail Jemaat (`GET /api/people/:id`) | Tambah Jemaat Baru (`POST /api/people`) | Edit Profil Jemaat (`PUT /api/people/:id`) | Generate Ulang Password Sementara |
| --- | :---: | :---: | :---: | :---: | :---: |
| `member` | x (403 Forbidden) | x (Hanya profil sendiri di `/home/profile`) | x | x | x |
| `activist` | v (View-only direktori) | v (View-only profil dasar) | x | x | x |
| `organizer` | v (Semua data) | v (Semua data & riwayat) | v | v | v (Khusus `isClaimed = false`) |
| `admin` | v (Semua data) | v (Semua data & riwayat) | v | v | v (Khusus `isClaimed = false`) |

---

## 3. Alur Pengguna (User Flows)

### 3.1. Alur Tambah Jemaat Baru (Pre-provisioning) oleh Organizer/Admin
1. Pengurus membuka halaman **People** (`/people`) dan menekan tombol **"Add Member"**.
2. Pengurus mengisi modal/form pendaftaran:
   - **Full Name** *(Wajib, min 2 karakter)*.
   - **Role** *(Default: `member`, pilihan: `member` atau `activist`)*.
   - **School / Institution** *(Opsional, dropdown dari master data verified schools `SMA/SMK`, `SMP`, `Universitas`, `Umum`)*.
   - **Phone Number / WhatsApp** *(Opsional, format nomor telepon Indonesia e.g. `08...` atau `+62...`)*.
   - **Gender** *(Opsional: `male` / `female`)*.
   - **Date of Birth** *(Opsional, YYYY-MM-DD)*.
   - **Address / Notes** *(Opsional)*.
3. Saat form disubmit (`POST /api/people`):
   - Sistem secara atomik meng-generate `userNumber` integer `yyyymmddnn` (contoh: `2026102401`).
   - Sistem men-generate `username` unik: **First name (lowercase, huruf saja) + 4 digit angka acak** (contoh: "Budi Santoso" -> `budi1492`). Jika first name kurang dari 3 karakter, gunakan nama lengkap tanpa spasi + 4 digit angka acak.
   - Sistem men-generate temporary password: `sekkha` + 5 digit angka acak + `puggala` (contoh: `sekkha48291puggala`).
   - Password di-hash menggunakan `bcrypt` (salt rounds 10) dan disimpan ke database dengan `isClaimed = false`.
4. Response mengembalikan kredensial sementara **hanya satu kali**.
5. Antarmuka menampilkan **Credentials Modal** yang memuat:
   - Nomor Anggota (`userNumber`)
   - Username
   - Password Sementara
   - Tombol **"Copy WhatsApp Invitation"** (format teks pesan ramah siap kirim via WhatsApp, sehingga pengurus tidak perlu mengetik ulang kredensial) dan tombol **"Done"**.

### 3.2. Alur Klaim Akun oleh Jemaat (First-time Login)
1. Jemaat menerima kredensial dari pengurus via WhatsApp/pesan pribadi.
2. Jemaat membuka aplikasi Sekkha di `/login` dan memasukkan `username` atau `userNumber` beserta password sementara.
3. Backend memvalidasi password `bcrypt` dan mendeteksi bahwa akun belum diklaim (`isClaimed = false`).
4. Sistem menerbitkan JWT sesi login dan **secara otomatis mengarahkan jemaat ke halaman Onboarding yang sudah ada (`/onboarding`)**:
   - *Catatan Arsitektur*: Tidak ada rute claim terpisah; proses klaim akun terintegrasi langsung di rute `/onboarding` standar aplikasi.
   - Di `/onboarding`, jemaat memasukkan Password Baru (min 8 karakter, huruf + angka).
   - Memasukkan Email pribadi dan menyelesaikan verifikasi OTP 6 digit.
5. Setelah verifikasi email selesai:
   - Flag `isClaimed` diubah menjadi `true`.
   - `emailVerifiedAt` terisi timestamp sekarang.
   - Sesi dialihkan ke dashboard utama (`/home`). Semua poin dan riwayat kehadiran event sebelumnya tetap utuh.

### 3.3. Alur Regenerasi Password Sementara (Jika Kredensial Hilang Sebelum Klaim)
1. Jika jemaat belum mengklaim akun (`isClaimed = false`) dan kehilangan kredensialnya:
2. Pengurus membuka halaman detail jemaat (`/people/:id`).
3. Pengurus menekan tombol **"Reset Temporary Password"**.
4. Sistem membuat password sementara baru `sekkha#####puggala`, meng-update hash DB, dan mencatat audit log.
5. Kredensial baru ditampilkan di modal satu kali untuk disalin dan dibagikan ke jemaat.
6. **Proteksi Keamanan Akun Terklaim**:
   - Jika akun **sudah diklaim (`isClaimed = true`)**, tombol *"Reset Temporary Password"* **wajib di-DISABLE** (berwarna abu-abu, tidak dapat diklik) dan dilengkapi tooltip: *"Account has been claimed by the member. For security and privacy, members must reset their own password via Forgot Password."*
   - Di sisi backend: Endpoint `POST /api/people/:id/reset-temporary-password` wajib menolak permintaan dengan `HTTP 400 Bad Request` (`ACCOUNT_ALREADY_CLAIMED`) jika `isClaimed === true`. Pengurus tidak boleh dapat mereset akun yang sudah aktif milik anggota.

---

## 4. Spesifikasi Teknis & API Contract

### 4.1. Endpoint Backend (`sekkha-api`)

#### 1. `GET /api/people`
Mengambil daftar anggota komunitas dengan pagination, search, dan filter.
* **Akses**: `requireAuth`, `requireRole("activist", "organizer", "admin")`.
* **Query Parameters**:
  * `page` (number, default: 1)
  * `limit` (number, default: 20, max: 100)
  * `search` (string, opsional — mencari pada `name`, `username`, string `userNumber`)
  * `role` (string: `member`, `activist`, `organizer`, `admin`)
  * `status` (string: `all`, `claimed`, `unclaimed`)
  * `school_id` (string, opsional)
* **Response Envelope (200 OK)**:
  ```json
  {
    "status": "success",
    "code": 200,
    "message": "People list retrieved successfully",
    "data": {
      "items": [
        {
          "id": "cuid_123",
          "user_number": 2026102401,
          "username": "budi1492",
          "name": "Budi Santoso",
          "role": "member",
          "is_claimed": false,
          "school": {
            "id": "sch_1",
            "name": "SMA Tri Ratna"
          },
          "phone": "08123456789",
          "created_at": "2026-10-24T08:00:00.000Z",
          "last_attended_at": "2026-10-20T10:00:00.000Z"
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 20,
        "total": 128,
        "total_pages": 7
      }
    }
  }
  ```
  *(Catatan YAGNI: `total_attendances` dan `total_points` sengaja DIHAPUS dari list view `/people` untuk efisiensi query DB tanpa agregasi berat. Metrik performa kehadiran telah memiliki modul khusus di `/insight` dan `/leaderboard`).*

#### 2. `POST /api/people`
Mendaftarkan anggota baru dan men-generate temporary credentials.
* **Akses**: `requireAuth`, `requireRole("organizer", "admin")`.
* **Request Body (Zod Validation)**:
  ```typescript
  export const CreatePeopleSchema = z.object({
    name: z.string().trim().min(2, "Full name must be at least 2 characters").max(100),
    role: z.enum(["member", "activist"]).default("member"),
    school_id: z.string().cuid().optional().nullable(),
    phone: z.string().trim().max(20).optional().nullable(),
    gender: z.enum(["male", "female"]).optional().nullable(),
    date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)").optional().nullable(),
    address: z.string().max(255).optional().nullable(),
  })
  ```
* **Response Envelope (201 Created)**:
  ```json
  {
    "status": "success",
    "code": 201,
    "message": "Member registered successfully with temporary credentials",
    "data": {
      "id": "cuid_123",
      "user_number": 2026102401,
      "username": "budi1492",
      "name": "Budi Santoso",
      "role": "member",
      "is_claimed": false,
      "temporary_password": "sekkha48291puggala",
      "whatsapp_invite_message": "Namaste Budi Santoso,\nAkun Sekkha Apps Anda telah dibuat oleh pengurus vihara.\n\nBerikut kredensial login sementara Anda:\n• Member ID: 2026102401\n• Username: budi1492\n• Password Sementara: sekkha48291puggala\n\nSilakan login di https://sekkha.app/login untuk menyelesaikan aktivasi akun dan membuat password pribadi Anda. Terima kasih!"
    }
  }
  ```

#### 3. `GET /api/people/:id`
Melihat detail profil anggota, data almamater, status pastoral, dan riwayat presensi.
* **Akses**: `requireAuth`, `requireRole("activist", "organizer", "admin")`.

#### 4. `PUT /api/people/:id`
Memperbarui data profil jemaat oleh Organizer / Admin.
* **Akses**: `requireAuth`, `requireRole("organizer", "admin")`.
* **Editable Fields**: `name`, `role`, `school_id`, `phone`, `gender`, `date_of_birth`, `address`.

#### 5. `POST /api/people/:id/reset-temporary-password`
Men-generate ulang password sementara jika user belum diklaim (`isClaimed = false`).
* **Akses**: `requireAuth`, `requireRole("organizer", "admin")`.
* **Guard**: Mengembalikan `400 Bad Request` (`ACCOUNT_ALREADY_CLAIMED`) jika `isClaimed === true`.

---

## 5. Desain Antarmuka & UX (Clay Design System)

1. **Direktori Anggota (`/people`)**:
   - Clay Card Grid Responsif (`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`).
   - Stat Cards di bagian atas: *Total Members*, *Claimed Accounts*, *Unclaimed Accounts*, *Active This Month*.
   - Filter Bar: Input pencarian dengan *debounce 250ms*, pill filter status klaim (`All`, `Claimed`, `Unclaimed`), dan dropdown filter role.
   - Kartu Anggota menampilkan:
     - Avatar inisial dengan badge warna role (`member`, `activist`, `organizer`, `admin`).
     - Nama lengkap, `userNumber`, dan `username`.
     - Badge status: Hijau *"Claimed"* atau Kuning *"Unclaimed"*.
     - Almamater sekolah, nomor WhatsApp/telepon, dan info kehadiran terakhir (`last_attended_at`).
2. **Modal Kredensial Baru (One-Time Modal)**:
   - Kartu kontras tinggi yang menampilkan Nomor Anggota, Username, dan Password Sementara.
   - Tombol *"Copy WhatsApp Message"* yang menyalin teks ramah jemaat (`whatsapp_invite_message`) langsung ke clipboard sehingga pengurus tidak perlu mengetik ulang kredensial satu per satu.
3. **Detail & Reset Password Action**:
   - Jika `isClaimed === true`: Tombol *"Reset Temporary Password"* **di-disable** dengan pesan: *"Account claimed by user. User must use self-service forgot password."*
4. **Bahasa UI**: 100% Bahasa Inggris di seluruh label, placeholder, dialog, dan pesan sukses/error.

---

## 6. Non-Functional Requirements & Optimasi Performa

1. **Optimasi Pencarian `userNumber` ($O(\log N)$ B-Tree Index & In-Memory Cache)**:
   - **B-Tree Indexing**: PostgreSQL `UNIQUE INDEX` pada kolom numerik `BigInt user_number` secara matematis beroperasi pada kompleksitas $O(\log N)$. Dengan tinggi B-Tree hanya 2–3 kedalaman halaman disk, latensi pencarian B-Tree adalah $< 0.2\text{ ms}$ (praktis instan).
   - **Query Branching Strategy (Anti-Table Scan)**:
     - Saat user mengetik di search bar `q`:
       * Jika input **murni digit angka** (`/^\d+$/`): Backend langsung mengeksekusi exact match `WHERE user_number = BigInt(q)`. Ini menjamin B-Tree Index Scan langsung terpakai tanpa type-casting `user_number::text` yang merusak indeks!
       * Jika input **mengandung huruf**: Backend mencari ke `name` dan `username` menggunakan `ILIKE` dengan bantuan Trigram Index (`gin (name gin_trgm_ops, username gin_trgm_ops)`).
   - **Zero Heap Fetch (Covering Index)**:
     - Dapat ditambahkan `CREATE UNIQUE INDEX idx_users_user_number_covering ON users (user_number) INCLUDE (id, name, username, is_claimed);` sehingga lookup absensi dan direktori nomor anggota dilayani 100% dari cache RAM indeks tanpa membaca heap disk.
   - **Redis Cache untuk Live Event Scanner**:
     - Saat sesi event aktif dibuka, key `sekkha:cache:userNumber:<number>` dapat di-cache di Redis dengan TTL 24 jam untuk menghasilkan pencarian murni $O(1)$ di memori saat scanner presensi beroperasi terus-menerus.
2. **Password Security**:
   - Password sementara tidak pernah disimpan dalam plain text. Disimpan menggunakan `bcrypt` salt rounds 10.
   - Temporary password hanya dikembalikan satu kali saat pembuatan atau reset.
3. **Audit Trail**:
   - Setiap registrasi jemaat dan reset temporary password dicatat ke `audit_logs` (`PEOPLE_CREATED`, `TEMPORARY_PASSWORD_RESET`).
