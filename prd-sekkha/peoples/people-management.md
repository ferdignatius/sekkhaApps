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
   - **Date of Birth** *(Opsional, YYYY-MM-DD)*.
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
    date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)").optional().nullable(),
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
* **Editable Fields**: `name`, `role`, `school_id`, `phone`, `date_of_birth`.

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

---

## 7. User Stories

| ID | As a | I want to | So that |
| --- | --- | --- | --- |
| US-PEOP-01 | Organizer / Admin | Pre-provision new temple members with essential info (name, school, phone, birth date) and receive temporary credentials | Unregistered youth can receive official member IDs and participate in event attendance immediately |
| US-PEOP-02 | Organizer / Admin | View a paginated directory of community members with debounce search by name, username, or member ID | I can quickly find members without experiencing UI lag or loading unneeded records |
| US-PEOP-03 | Organizer / Admin | Filter directory members by claimed status (`all`, `claimed`, `unclaimed`), assigned role (`member`, `activist`, etc.), and school institution | I can audit community engagement, onboarding progress, and target pastoral outreach |
| US-PEOP-04 | Organizer / Admin | View detailed member profiles with authorized on-the-fly PII decryption (phone, birth date, class grade) | I can review contact and pastoral data without storing or displaying unencrypted PII in public endpoints |
| US-PEOP-05 | Organizer / Admin | Reset temporary passwords exclusively for unclaimed accounts (`isClaimed = false`) with one-click copyable WhatsApp templates | I can assist members who lost credentials before first login while preventing unauthorized overrides on active accounts |
| US-PEOP-06 | Admin | Update member profiles and change assigned roles with strict RBAC guardrails (only Admin can upgrade/downgrade roles; Organizers can edit standard profile fields) | Role elevation stays strictly governed and accidental privilege escalations are prevented |
| US-PEOP-07 | Activist | View read-only directory and basic member profile information without access to editing or credential generation | I can assist temple logistics and verify attendee identity without administrative write privileges |

---

## 8. Acceptance Criteria

| ID | Scenario | Expected result |
| --- | --- | --- |
| AC-PEOP-01 | Pre-provision member creation | System atomically generates unique 10-digit `userNumber` (`yyyymmddnn`), human-readable `username`, bcrypt-hashed `temporary_password` (`sekkha#####puggala`), sets `isClaimed = false`, and returns credentials modal with WhatsApp invite message. |
| AC-PEOP-02 | Directory pagination & search | `GET /api/people` accepts `page`, `limit` (max 100), `search`, `role`, and `status`. Numeric search executes exact B-Tree lookup on `userNumber`; text search matches name/username via trigram index scan. |
| AC-PEOP-03 | Claimed vs unclaimed filtering | Setting `status=claimed` filters for `isClaimed = true`; `status=unclaimed` filters for `isClaimed = false`. Summary stat cards display accurate counts. |
| AC-PEOP-04 | Secure PII decryption on detail view | `GET /api/people/:id` decrypts AES-256-GCM ciphertext on the fly for authorized roles (`activist`, `organizer`, `admin`). Plaintext returned to client; decryption errors gracefully return fallback indicator without leaking ciphertext. |
| AC-PEOP-05 | Temporary password reset guardrail | `POST /api/people/:id/reset-temporary-password` succeeds with HTTP 200 and audit log when `isClaimed === false`. If `isClaimed === true`, server returns HTTP 400 (`ACCOUNT_ALREADY_CLAIMED`) and UI disables reset button. |
| AC-PEOP-06 | Role upgrade/downgrade RBAC guardrail | Changing `role` via `PUT /api/people/:id` is permitted only for `admin`. If non-admin (`organizer` or `activist`) attempts to pass `role`, request is rejected with HTTP 403 Forbidden. Admin cannot delete or downgrade their own active account. |
| AC-PEOP-07 | Activist read-only view | `activist` role can access `GET /api/people` and `GET /api/people/:id`, but encounters HTTP 403 on `POST /api/people`, `PUT /api/people/:id`, `DELETE /api/people/:id`, and reset credentials endpoints. |

---

## 9. Test Cases

| Test Case ID | Category | Scenario / Description | Preconditions | Test Steps | Expected Result | Type |
| --- | --- | --- | --- | --- | --- | --- |
| **TC-PEOP-01** | Pre-provisioning | Create new member with valid payload by Organizer | Authenticated as `organizer` or `admin` | Submit `POST /api/people` with `name: "Budi Santoso"`, `role: "member"`, valid `school_id`, `phone: "08123456789"`. | HTTP 201 Created. Returns `user_number` (10 digits), `username` (`budi####`), `temporary_password` (`sekkha#####puggala`), `is_claimed: false`, and `whatsapp_invite_message`. Audit log `PEOPLE_CREATED` recorded. | Positive |
| **TC-PEOP-02** | Validation | Create member with empty name or invalid role | Authenticated as `organizer` | Submit `POST /api/people` with `name: ""` and `role: "admin"`. | HTTP 400 Bad Request envelope with Zod validation errors. No user created. | Negative |
| **TC-PEOP-03** | Pagination & Search | Search people by 10-digit userNumber vs text search | Directory populated with >= 25 members | 1. Query `GET /api/people?search=2026102401`.<br>2. Query `GET /api/people?search=Budi&page=1&limit=10`. | Step 1 executes $O(\log N)$ B-Tree lookup matching exact userNumber in $< 1\text{ ms}$. Step 2 returns paginated results matching `Budi` with pagination metadata (`page: 1`, `limit: 10`, `total`, `total_pages`). | Positive / Performance |
| **TC-PEOP-04** | Status Filter | Filter by claimed vs unclaimed members | Mixed claimed and unclaimed users exist | 1. Send `GET /api/people?status=claimed`.<br>2. Send `GET /api/people?status=unclaimed`. | Step 1 returns only users where `is_claimed === true`. Step 2 returns only users where `is_claimed === false`. | Positive / Functional |
| **TC-PEOP-05** | Role Filter | Filter directory by role | Users with `member`, `activist`, `organizer` exist | Send `GET /api/people?role=activist`. | Returns list filtered exclusively to users with `role: "activist"`. | Positive / Functional |
| **TC-PEOP-06** | Detail & PII Decryption | Authorized access to member detail view with encrypted PII | Target user has encrypted phone and birthDate in `UserProfile` | Send `GET /api/people/:id` as `organizer`. | HTTP 200 with standard envelope. PII fields decrypted on the fly to plaintext phone and ISO date. No raw AES ciphertext leaked. | Security / Positive |
| **TC-PEOP-07** | Reset Temp Password | Reset temporary password on unclaimed user account | User exists with `isClaimed: false` | Organizer submits `POST /api/people/:id/reset-temporary-password`. | HTTP 200. New `temporary_password` and invite message returned once. DB bcrypt hash updated. Audit log `TEMPORARY_PASSWORD_RESET` logged. | Positive / Security |
| **TC-PEOP-08** | Reset Temp Password Guardrail | Attempt to reset temporary password on already claimed user account | Target user has `isClaimed: true` | Organizer submits `POST /api/people/:id/reset-temporary-password`. | HTTP 400 Bad Request (`ACCOUNT_ALREADY_CLAIMED`). Temporary password is NOT overwritten. UI displays disabled button with explanatory tooltip. | Negative / Security |
| **TC-PEOP-09** | Role Upgrade Guardrail | Non-admin organizer attempts to upgrade user role to activist/organizer | Authenticated as `organizer` | Submit `PUT /api/people/:id` with body `{ "role": "activist" }`. | HTTP 403 Forbidden envelope ("Only admin can change member role."). Role remains unchanged in database. | Security / RBAC |
| **TC-PEOP-10** | Admin Role Change | Admin updates user role from member to activist | Authenticated as `admin` | Admin submits `PUT /api/people/:id` with `{ "role": "activist" }`. | HTTP 200 envelope. Role updated in DB. Profile cache invalidated. | Positive / RBAC |
| **TC-PEOP-11** | Self-Deletion Guardrail | Admin attempts to delete their own account | Authenticated as `admin` | Admin submits `DELETE /api/people/:own_user_id`. | HTTP 400 Bad Request ("You cannot delete your own account."). Deletion blocked. | Negative / Safety |
| **TC-PEOP-12** | Activist Permissions | Activist attempts administrative write actions on people directory | Authenticated as `activist` | 1. Submit `GET /api/people` (Read).<br>2. Submit `POST /api/people` (Create).<br>3. Submit `PUT /api/people/:id` (Update). | Step 1 succeeds with HTTP 200. Steps 2 & 3 return HTTP 403 Forbidden. Activists have strictly read-only access. | Security / RBAC |
| **TC-PEOP-13** | Member Access Denial | Regular member attempts to access people directory endpoint | Authenticated as `member` | Member submits `GET /api/people`. | HTTP 403 Forbidden envelope. Members are blocked from viewing community directory. | Security |
| **TC-PEOP-14** | One-Time Credentials Display | Temporary password omitted from subsequent detail fetches | User created via pre-provisioning | Query `GET /api/people/:id` or subsequent list `GET /api/people`. | Response contains user profile, but never exposes `temporary_password` field after initial creation/reset response. | Security |
