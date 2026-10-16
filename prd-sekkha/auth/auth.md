# PRD: Authentication System — Sekkha Apps

| Metadata | Detail |
| --- | --- |
| **Dokumen** | Product Requirement Document (PRD) |
| **Fitur** | Authentication (Manual Auth, Google OAuth 2.0) |
| **Aplikasi** | Sekkha Apps (Frontend & Backend) |
| **Versi** | 1.4.0 |
| **Status** | Approved / Ready for Development |

---

## 1. Ringkasan Eksekutif & Tujuan

**Authentication System** merupakan alur autentikasi yang mendukung registrasi & login **Manual (Email & Password)** serta **Autentikasi Sosial (Google OAuth 2.0)** untuk pengguna aplikasi Sekkha.

Proses **registrasi & login** dirancang sesederhana dan secepat mungkin — setelah berhasil login/daftar, pengguna langsung diarahkan ke halaman utama (**Dashboard / Home**). Pengisian data tambahan (sekolah, kelas, no HP, dll.) dapat dilengkapi kapan saja secara mandiri melalui halaman **Profil**.

### 🎯 Tujuan Utama
1. **Keamanan & Privasi**: Enkripsi password yang aman di backend (Bcrypt/Argon2), integrasi Google OAuth 2.0 Authorization Code Flow, serta pengelolaan sesi berbasis **JSON Web Token (JWT)**.
2. **Fleksibilitas Log In**: Memberikan pilihan registrasi/login cepat 1-klik menggunakan akun Google atau login manual berbasis email & password.
3. **Akses Cepat & Tanpa Hambatan**: Langsung masuk ke fitur utama tanpa terhalang alur onboarding bertahap.
4. **Integrasi Seamless**: Terhubung erat dengan TanStack Router (`_authenticated` layout) di frontend dan API Contract terstandarisasi di backend.

---

## 2. Target Pengguna & Role System

Sistem Sekkha mendukung 4 (empat) tingkatan role pengguna:

| Role | Deskripsi | Hak Akses Auth & Fitur Utama |
| --- | --- | --- |
| `umat` | Pengguna umum / jemaat (default role saat registrasi). | Akses halaman personal, profil, jadwal event, pendaftaran event, & reward/badge. |
| `aktivis` | Relawan / anggota aktif yang membantu kegiatan tertentu. | Akses fitur operasional seperti pemindaian absensi (scanner), penanganan event, & bantuan tugas lapangan. |
| `pengurus` | Pengurus vihara / organisasi yang mengelola kegiatan. | Akses fitur manajemen event, persetujuan absensi, laporan, & analitik kontribusi. |
| `admin` | Superuser / Pengelola sistem utama. | Akses penuh ke konfigurasi master data, manajemen role pengguna, & pengaturan sistem. |

> **Catatan Role**: Saat pengguna mendaftar melalui Manual Registration atau Google OAuth, role default yang diberikan secara otomatis adalah **`umat`**. Perubahan role menjadi `aktivis`, `pengurus`, atau `admin` dilakukan oleh **Admin/Pengurus** melalui panel manajemen pengguna (`/users`).

---

## 3. Spesifikasi Fitur Utama & Functional Requirements

### 3.1. Registrasi Akun Manual (`/sign-up`)

> **Prinsip Desain**: Registrasi dibuat **seminimal mungkin** — hanya meminta data yang benar-benar wajib. Data tambahan (sekolah, kelas, dll.) dikumpulkan di tahap onboarding atau bisa dilengkapi di halaman Profil.

* **Endpoint Backend**: `POST /v1/auth/register`
* **Form Inputs** *(hanya 4 field)*:
  * `name` (string, wajib) — Nama Lengkap. **Default kosong** (tidak ada placeholder, tidak ada prefilled dari Google/Autofill); user wajib mengetik sendiri.
  * `email` (string, wajib)
  * `password` (string, wajib)
  * `confirm_password` (string, wajib — validasi khusus frontend, tidak dikirim ke backend)

#### Aturan Validasi Frontend (Client-Side):
1. **Nama Lengkap**:
   * Wajib diisi (tidak boleh kosong — error: `"Nama lengkap wajib diisi"`).
   * Default state field **kosong** (tidak ada placeholder, tidak ada default value, tidak auto-fill dari Google/Autofill browser).
   * Minimal 2 karakter (`"Nama terlalu pendek"`).
   * **Alasan**: data nama harus explicit input oleh user untuk akurasi & konsistensi di database.
2. **Email**:
   * Tidak boleh kosong (`"Email wajib diisi"`).
   * Harus memenuhi regex format email standar (`"Format email tidak valid"`).
3. **Password**:
   * Tidak boleh kosong (`"Password wajib diisi"`).
   * Minimal 8 karakter (`"Password minimal 8 karakter"`).
4. **Konfirmasi Password**:
   * Harus identik dengan nilai field password (`"Konfirmasi password tidak cocok"`).

#### Alur & Response Server:
* **Status 201 (Created)**:
  * Server membuat user baru dengan `role: "umat"`, `status: "active"`.
  * Mengembalikan token JWT (`accessToken`) dan data user.
  * Frontend menyimpan token di `localStorage` (`key: sekkha_access_token`), memperbarui `AuthState` menjadi `authenticated`.
  * **Redirect**: Pengguna langsung diarahkan ke halaman utama / Dashboard (`/home` atau `/dashboard`).
* **Status 409 (Conflict)**:
  * Email sudah terdaftar. Frontend menampilkan Auth Error Banner: `"Email sudah digunakan. Silakan gunakan email lain atau masuk ke akun Anda."`

#### Opsi Login di Halaman Sign-Up:
* Tersedia **tombol Google OAuth** (`"Daftar dengan Google"`) sebagai alternatif registrasi cepat — lihat §3.3.
* Tersedia link navigasi ke halaman **Login** untuk pengguna yang sudah punya akun.

---

### 3.2. Login (`/login`)

Halaman Login menyediakan **dua metode autentikasi**:

#### Metode A: Login Manual (Email & Password)

* **Endpoint Backend**: `POST /v1/auth/login`
* **Form Inputs**:
  * `email` (string, wajib)
  * `password` (string, wajib)

##### Aturan Validasi Frontend:
1. **Email**: Wajib diisi & format valid.
2. **Password**: Wajib diisi.

##### Alur & Response Server:
* **Status 200 (OK)**:
  * Mengembalikan user object dan JWT `token`.
  * Frontend menyimpan token di `localStorage` (`key: sekkha_access_token`), memperbarui `AuthState` menjadi `authenticated`.
  * **Redirect Logic**:
    * Jika terdapat query param `redirectTo` yang valid (misal `/login?redirectTo=/insight`) → navigasi ke path tersebut.
    * Default → navigasi ke `/home` atau `/dashboard`.
* **Status 401 (Unauthorized)**:
  * Kredensial tidak cocok. Tampilkan Auth Error Banner: `"Email atau password salah. Silakan coba lagi."`

#### Metode B: Login dengan Google OAuth 2.0

* **Tombol**: `"Lanjutkan dengan Google"` — tersedia di halaman `/login` dan `/sign-up`.
* **Alur lengkap** → lihat §3.3 (Autentikasi Sosial Google OAuth 2.0).
* Pengguna yang belum punya akun Sekkha dan login via Google untuk **pertama kali** akan otomatis dibuatkan akun baru dan langsung diarahkan ke Dashboard.

#### Komponen UI Halaman Login:
* **Tombol Google OAuth** berada di **atas** form (primary CTA visual).
* **Visual Separator** garis horizontal dengan label `"atau"` memisahkan OAuth dan form manual.
* **Form manual** (email + password) berada di bawah separator.
* Tersedia link **"Lupa password?"** dan link navigasi ke halaman **Sign-Up**.

---

### 3.3. Autentikasi Sosial (Google OAuth 2.0)

* **Endpoints Backend**:
  * `GET /v1/auth/google` (Initiate OAuth flow)
  * `GET /v1/auth/google/callback` (OAuth authorization code callback)

#### Komponen UI & Visual:
1. **Tombol OAuth (`Social_Auth_Button`)**:
   * Teks: `"Lanjutkan dengan Google"`.
   * Variasi tombol: `button-secondary` dengan ikon Google (lebar ikon 20px).
   * Ditampilkan pada halaman `/login` dan `/sign-up`.
2. **Visual Separator**:
   * Garis horizontal dengan teks `"atau"` di tengah (typography `caption`, warna `{colors.muted}`).

#### Alur Autentikasi Google OAuth 2.0:
1. **Inisiasi**: Pengguna mengklik tombol `"Lanjutkan dengan Google"`. Frontend mengarahkan browser ke `GET /v1/auth/google`.
2. **Redirect Server Authorization**: Backend meredirect pengguna ke Google Authorization Server.
3. **Callback & Exchange**:
   * Google meredirect kembali ke backend callback (`/v1/auth/google/callback?code=...`).
   * Backend menukar `code` dengan OAuth Token ke Google, mengambil profil pengguna (`email`, `name`, `photo_url`, `google_id`).
   * Backend mencari user berdasarkan email/google_id:
     * Jika **belum ada**: Buat user baru (`role: "umat"`, `status: "active"`, `is_new_user: true`).
     * Jika **sudah ada**: Hubungkan akun (`is_new_user: false`).
   * Backend menerbitkan JWT `accessToken` Sekkha dan meredirect browser kembali ke frontend: `/login?token=<JWT_TOKEN>`.
4. **Handling Frontend**:
   * Aplikasi frontend mendeteksi parameter `token` di URL query string.
   * Simpan token ke `localStorage["sekkha_access_token"]`.
   * Bersihkan parameter URL tanpa refresh (`window.history.replaceState`).
   * Set `AuthState = authenticated`, arahkan ke `/home` atau `/dashboard` (atau path `redirectTo`).

---

### 3.4. Kelengkapan Data Diri di Halaman Profil

Pengisian data sekunder (nama sekolah, jenjang kelas, nomor HP, tanggal lahir, dll.) dilakukan langsung secara fleksibel melalui menu **Profil → Edit Profil (`/home/profile` atau `/profile/edit`)** kapan saja pengguna menginginkannya tanpa mengganggu alur masuk awal.

---

### 3.5. Inisialisasi & Verifikasi Sesi (`App Initialization`)

* **Endpoint Backend**: `GET /v1/auth/verify` (atau `GET /v1/users/me`)
* **Headers**: `Authorization: Bearer <token>`

#### Alur Sesi:
1. Ketika aplikasi pertama kali dimuat (atau di-refresh):
   * Cek keberadaan `localStorage["sekkha_access_token"]`.
   * Jika **tidak ada**: `AuthState = unauthenticated`.
   * Jika **ada**: Kirim request `GET /auth/verify` dengan timeout **3000ms**.
2. **Hasil Verifikasi**:
   * **200 OK**: Token valid ➔ `AuthState = authenticated`.
   * **401 / 403 / Timeout / Error**: Token kadaluarsa / tidak valid ➔ Hapus `sekkha_access_token` dari `localStorage`, set `AuthState = unauthenticated`.

---

### 3.6. Logout (`/auth/logout`)

* **Endpoint Backend**: `POST /v1/auth/logout`
* **Headers**: `Authorization: Bearer <token>`
* **Alur**:
  * Mengirim request ke backend untuk mem-blacklist / invalidate token.
  * Hapus `sekkha_access_token` dari `localStorage`.
  * Reset `AuthState` ke `unauthenticated`.
  * Redirect pengguna ke halaman `/login`.

---

### 3.7. Ganti Password (`/auth/change-password`)

* **Endpoint Backend**: `PATCH /v1/auth/change-password`
* **Headers**: `Authorization: Bearer <token>`
* **Form Inputs**: `old_password`, `new_password` (min. 8 karakter).

---

### 3.5. Format Standar User ID & Nomor Unik (`YYYYMMDDuniqNum`)

Setiap user yang terdaftar (baik via manual registrasi, Google OAuth, maupun pre-provisioned oleh pengurus) memiliki format identitas terstandarisasi:
* **Format**: `YYYYMMDDuniqNum`
  * `YYYY`: 4 digit tahun pendaftaran (contoh: `2026`)
  * `MM`: 2 digit bulan (contoh: `08`)
  * `DD`: 2 digit tanggal (contoh: `20`)
  * `uniqNum`: Nomor urut sekuensial unik harian / prefix counter (contoh: `0001`, `0002` dst.)
* **Contoh Hasil**: `202608200001`

---

## 4. Spesifikasi API Contract

### 4.1. `POST /v1/auth/register`

**Request Body:**
```json
{
  "name": "Budi Santoso",
  "email": "budi@example.com",
  "password": "mypassword123"
}
```

> **Catatan**: `confirm_password` hanya divalidasi di sisi frontend dan **tidak dikirim** ke backend.

**Response 201:**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "202608200001",
      "name": "Budi Santoso",
      "email": "budi@example.com",
      "role": "umat",
      "status": "active",
      "school_name": null,
      "school_level": null,
      "class_grade": null
    },
    "token": "eyJhbGciOiJIUzI1NiIsIn..."
  },
  "message": "Registration successful",
  "meta": null
}
```

---

### 4.2. `PATCH /v1/users/me` (Update Profil)
**Headers**: `Authorization: Bearer <token>`

**Request Payload** *(semua field optional — kirim hanya field yang ingin diupdate)*:
```json
{
  "school_name": "SMA Dharma Widya",
  "school_level": "SMA/SMK",
  "class_grade": "Kelas 11",
  "phone": "081234567890",
  "birth_date": "2000-05-12"
}
```

**Response 200:**
```json
{
  "status": "success",
  "data": {
    "id": "202608200001",
    "name": "Budi Santoso",
    "email": "budi@example.com",
    "school_name": "SMA Dharma Widya",
    "school_level": "SMA/SMK",
    "class_grade": "Kelas 11",
    "phone": "081234567890",
    "birth_date": "2000-05-12",
    "role": "umat",
    "status": "active"
  },
  "message": "Profile updated successfully",
  "meta": null
}
```

---

## 5. UI/UX & Non-Functional Requirements (NFR)

### 🎨 Design System & Visual Layout
1. **Desktop & Tablet (≥ 768px)**:
   * Form Auth & Modal Lengkapi Data dibungkus dalam Card terpusat secara vertikal & horizontal (`min-height: 100vh`). Lebar maksimal card: **480px** (atau **560px** untuk modal onboarding).
2. **Mobile (< 768px)**:
   * Layout `width: 100%`, padding horizontal `16px`, touch target minimum **44px**.
3. **Onboarding Tooltip / Overlay**:
   * Menggunakan backdrop semi-transparan (`bg-black/60`), animasi popover yang halus (`motion`), serta kontras tinggi untuk teks penjelas.

### 🔒 Keamanan & Sesi
1. **Persistence Status Onboarding**: Server menyimpan status `onboarding_completed` di database pengguna.
2. **Sanitasi Data Input**: Data profil yang diisi pada onboarding disanitasi sebelum dikirim ke endpoint `PATCH /v1/users/me`.

---

## 6. Matrix Kriteria Penerimaan (Acceptance Criteria)

| ID | Skenario Pengujian | Hasil yang Diharapkan |
| --- | --- | --- |
| **AC-01** | Pengguna mengisi form Sign-Up (nama, email, password, confirm password) & submit | Akun dibuat dengan `onboarding_completed: false`, token tersimpan di localStorage, pengguna diarahkan ke `/onboarding`. |
| **AC-02** | Pengguna mendaftar via Google OAuth untuk pertama kali | Akun baru dibuat secara otomatis (`is_new_user: true`), pengguna diarahkan ke Alur Onboarding. |
| **AC-03** | Pengguna mengisi `school_name`, `school_level`, `class_grade` di Tahap 1 & klik "Simpan & Lanjutkan" | Data akademik tersimpan via `PATCH /v1/users/me`, pengguna lanjut ke Product Tour (Tahap 2). |
| **AC-04** | Pengguna mengklik "Lewati untuk Sekarang" di Tahap 1 (Data Akademik) | Tidak ada request ke backend, pengguna langsung masuk ke Tahap 2 (Tour). Field sekolah/kelas tetap `null` & dapat diisi di Profil. |
| **AC-05** | Pengguna mengikuti Product Tour hingga langkah terakhir & klik "Mulai Jelajahi Sekkha" | Setiap spotlight menyoroti elemen UI yang sesuai. Request `{ onboarding_completed: true }` dikirim, redirect ke `/dashboard`. |
| **AC-06** | Pengguna mengklik "Lewati Tour" di tengah-tengah tur | Tur langsung ditutup, request `{ onboarding_completed: true }` dikirim, pengguna masuk ke `/dashboard`. |
| **AC-07** | Pengguna yang sudah menyelesaikan onboarding login kembali | Pengguna tidak melihat onboarding lagi, langsung ke `/dashboard`. |
| **AC-08** | Pengguna yang skip onboarding membuka halaman Profil → Edit Profil | Terdapat bagian "Data Akademik" yang dapat diisi (school_name, school_level, class_grade). |
| **AC-09** | Login manual dengan email/password salah | Menampilkan Auth Error Banner "Email atau password salah". Tombol login aktif kembali. |
| **AC-10** | Login via Google OAuth (akun sudah ada) | Pengguna langsung masuk tanpa onboarding, redirect ke `/dashboard` atau `redirectTo`. |
| **AC-11** | Mengakses protected route (`/insight`) tanpa token | System otomatis meredirect pengguna ke `/login?redirectTo=/insight`. |
| **AC-12** | Pengguna menekan tombol "Logout" | Token dihapus dari storage, state reset ke `unauthenticated`, redirect ke `/login`. |
| **AC-13** | `confirm_password` berbeda dari `password` saat sign-up | Validasi frontend mencegah submit, tampilkan pesan `"Konfirmasi password tidak cocok"`. |
| **AC-14** | Form sign-up dibuka (baik manual maupun setelah pre-fill OAuth/Autofill browser) | Field `name` **kosong** (tidak ada nilai default, tidak ada placeholder, tidak auto-terisi) — user wajib mengetik manual |
