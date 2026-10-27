# PRD: User Profile, Account Settings, & OTP Verification System — Sekkha Apps

| Metadata | Detail |
| --- | --- |
| **Dokumen** | Product Requirement Document (PRD) |
| **Fitur** | Profil Pribadi, Kartu Anggota Digital, Pengaturan Akun, Ganti Password, & OTP Email |
| **Domain** | `users` / `profile` / `auth` |
| **Aplikasi** | Sekkha Apps (Frontend & Backend) |
| **Versi** | 2.3.0 (2-Factor OTP Authentication on Change Password) |
| **Status** | Approved / Ready for Development |
| **Referensi Terkait** | `prd-sekkha/general/users/users.md`, `prd-sekkha/general/users/email-verification-for-account-claim.md`, `prd-sekkha/configure/masterdata/schools.md` |

---

## 1. Ringkasan Eksekutif & Tujuan

Profil dan Pengaturan Akun adalah pusat identitas mandiri bagi setiap jemaat vihara yang telah terdaftar di Sekkha Apps (`/profile`). Modul ini menggabungkan:
1. **Identitas Komunitas (Digital Member Card) & Hero Header**: Kartu identitas permanen berdesain minimalis sesuai standar HIG (Apple Human Interface Guidelines) yang menampilkan Nama Lengkap, Nomor Anggota (`userNumber`), Almamater Sekolah/Institusi, Tanggal Bergabung, Role Badge dengan tema warna unik per role, serta **QR Code Statis Permanen** berkontras tinggi untuk presensi event. Hero header profil menampilkan ringkasan **Karma Points** dan **Weekly Streak** (dengan ikon api aktif).
2. **Manajemen Data Pribadi (In-Page Inline Form)**: Jemaat dapat memperbarui profil langsung di halaman (*in-place inline editing* tanpa modal popup), mencakup nama lengkap, **username unik**, nomor WhatsApp, tanggal lahir, dan sekolah almamater (terhubung langsung ke `GET /api/schools`).
3. **Buku Besar Poin Transparan (*Points Ledger / History*)**: Riwayat mutasi perolehan poin yang transparan (`/api/users/me/points-history`) mencakup tanggal kegiatan, jenis transaksi (kehadiran rutin, tugas pelayanan ibadah, bonus streak, dll.), poin masuk/keluar, dan saldo akhir.
4. **Keamanan Akun & Pengaturan (*Account Security & 2FA*)**:
   - **Ganti Password Mandiri dengan Proteksi 2-Faktor (OTP 6-Digit)**: Verifikasi password lama, pengiriman 6-digit OTP ke email terdaftar, dan verifikasi kode sebelum kata sandi diperbarui. Menerbitkan token sesi baru secara otomatis sehingga sesi aktif tidak terputus (anti-401 loop).
   - **Ganti Email Mandiri dengan OTP 6-Digit**: Dilindungi oleh **Sistem OTP 6-Digit Kriptografis** anti-pembajakan akun (*anti-takeover*) dan *blind index hashing*.
5. **Navigasi Tunggal & Layout Standard**:
   - Menghapus modal pop-up "Settings & Goals" yang duplikat di sidebar. Seluruh konfigurasi profil dan pengaturan akun terpusat di `/profile`.
   - Rute resmi profil adalah `/profile` (seluruh navigasi, dock mobile, dan menu user langsung mengarah ke `/profile`).
   - Lebar kontainer halaman distandarisasi ke `max-w-7xl` selaras dengan halaman utama lainnya (Home, Community Insights, Events).
6. **Standarisasi Bahasa**: 100% Bahasa Inggris di seluruh antarmuka profil dan pengaturan.

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

Halaman `/profile` menggunakan kontainer standar `max-w-7xl` dengan 3 tab terorganisir sesuai Clay & HIG Design System:

```
[ Tab 1: Member Card & Points ]  |  [ Tab 2: Personal Profile ]  |  [ Tab 3: Security & Settings ]
```

### 3.1. Tab 1: Digital Member ID Card & Points History
* **Hero Stats Counter**: Di bagian header profil, sistem menampilkan dua indikator statistik utama secara berdampingan:
  * **Karma Points**: Total akumulasi poin kebaikan saat ini (`{totalPoints} Pts`).
  * **Weekly Streak**: Jumlah minggu berturut-turut kehadiran jemaat dengan ikon api bernyawa (`{currentStreak} Minggu`).
* **Kartu Anggota Digital (HIG-Compliant Minimalist Design)**:
  * **Filosofi Desain**: Mengikuti standar Apple Human Interface Guidelines (HIG) untuk digital pass / identity card — bersih, minimalis, proporsional, dan bebas dari clutter. Kartu memuat chip ringkasan poin dan streak secara harmonis tanpa mengganggu fungsi QR code.
  * **Aspek Rasio & Bentuk**: Standar ID-1 ISO/IEC 7810 rasio ~1.586 : 1 (`aspect-[1.586/1]` responsif), dengan sudut melengkung halus squircle (`rounded-[20px]` atau `rounded-[22px]`).
  * **Layering & Depth**: Hairline border specular halus (`border border-white/25` atau `border border-black/10`), depth shadow ambient occlusion (`shadow-md`).
  * **Diferensiasi Tema Warna Kartu Tiap Role**:
    * **`member` (Warm Pearl / Sand Ivory)**: Background krem hangat bergradasi lembut (`from-[#FDFBF7] to-[#F4EFE6]`), teks arang gelap (`#1A1A1A`), border aksen emas pasir (`#E8DCC4`), role chip netral elegan.
    * **`activist` (Emerald Seva / Fresh Jade)**: Background gradasi hijau zamrud segar (`from-[#064E3B] to-[#022C22]`), teks putih jernih (`#FFFFFF`), border aksen mint emerald (`#10B981`), role chip kontras hijau terang melambangkan energi pelayanan.
    * **`organizer` (Royal Sapphire / Indigo Navy)**: Background biru safir mendalam (`from-[#1E293B] to-[#0F172A]`), teks putih bersih (`#FFFFFF`), border aksen sapphire metallic (`#3B82F6` / `#E8B94A`), role chip biru royal tegas melambangkan tata kelola kepengurusan.
    * **`admin` (Obsidian Titanium / Midnight Gold)**: Background monolitik hitam obsidian elegan (`from-[#18181B] to-[#09090B]`), teks putih kristal (`#FAFAFA`), hairline accent champagne gold (`#E8B94A` / `#D4AF37`), role chip emas mewah melambangkan otoritas sistem.
  * **Elemen Kartu Minimalis**:
    * **Top Header**: Logo Vihara Sekkha + Label Subheading `"SEKKHA DHAMMA COMMUNITY"` + Role Badge pill di pojok kanan atas.
    * **Center Body**: Nama lengkap jemaat (headline bold `text-lg` s.d. `text-xl`), Nomor Anggota dalam format monospace terpisah (`font-mono tracking-widest text-sm font-semibold`), dan Institusi / Almamater Sekolah.
    * **High-Contrast QR Code Container**: Kotak putih bersih kontras tinggi (`bg-white p-2.5 rounded-[14px] shadow-sm`) memuat QR Code statis permanen berbasis teks `userNumber` (mis. `2026102401`), menjamin keterbacaan instan kamera scanner presensi dalam kondisi pencahayaan vihara apa pun.
    * **Footer**: Tanggal bergabung (*"Member since [Month Year]"*).
  * **Tombol Aksi**:
    * *"Download Card"*: Simpan kartu ke galeri/perangkat sebagai format gambar (PNG) beresolusi tinggi.
    * *"Enlarge QR"*: Modal fullscreen QR Code kontras tinggi dengan kecerahan optimal untuk kemudahan pemindaian di pintu masuk kebaktian.
* **Riwayat Poin Transparan (Points History)**:
  * Menampilkan daftar transaksi poin dari endpoint `GET /api/users/me/points-history`.
  * Setiap entri memuat: Nama Kegiatan / Event, Waktu & Tanggal, Tag Kategori, dan Badge Perubahan Poin (`+50 Pts` hijau atau `-15 Pts` merah jika penalti terlambat).

### 3.2. Tab 2: Personal Profile (In-Page Inline Edit Form)
* **Desain Interaksi Tanpa Modal (*No Popup Dialog*)**:
  * Tab profil **TIDAK menggunakan modal atau drawer popup**. Pengeditan data dilakukan langsung di tempat (*in-place inline editing*) pada halaman `/profile`.
  * **State 1: View Mode (Default / Read-Only)**:
    * Menampilkan kartu ringkasan informasi data diri jemaat dalam layout dua kolom yang rapi dan terstruktur.
    * Memuat info: Full Name, Username (`@username`), Phone Number (WhatsApp), School / University Almamater, dan Date of Birth.
    * Tombol *"Edit Profile"* di pojok kanan atas kartu dengan ikon pensil.
  * **State 2: Edit Mode (Inline Form Transition)**:
    * Saat user mengklik *"Edit Profile"*, kartu data profil langsung bertransformasi menjadi form interaktif di halaman yang sama (animasi transisi halus fade/slide tanpa layout shift).
    * **Field Input Form**:
      * **Full Name** *(Input teks, wajib, min 1 karakter)*.
      * **Username** *(Input teks dengan prefix `@`, wajib, min 3 s.d. 30 karakter, format regex `[a-z0-9._]`, divalidasi keunikan oleh server)*.
      * **Phone Number / WhatsApp** *(Input nomor telepon, e.g. `08123456789`)*.
      * **School / University** *(Dropdown interaktif dari master data `GET /api/schools`, menampilkan institusi terverifikasi aktif)*.
      * **Date of Birth** *(Input tanggal / Datepicker `YYYY-MM-DD`)*.
    * **Tombol Aksi Bawah Form**:
      * Tombol *"Cancel"*: Mengembalikan form ke View Mode tanpa menyimpan perubahan (reset ke data sebelumnya).
      * Tombol *"Save Changes"*: Memvalidasi payload dan memanggil `PUT /api/users/me/profile` (atau fallback `PATCH /api/users/me`). Menampilkan indikator loading saat proses penyimpanan dan notifikasi toast sukses, lalu otomatis kembali ke View Mode dengan data terbaru.

### 3.3. Tab 3: Account Security & OTP Verification (Two-Factor Protection)

#### A. Ganti Password Mandiri dengan Verifikasi 2FA (OTP 6-Digit)
1. **Langkah 1: Input Kata Sandi & Request OTP (`POST /api/users/change-password/request-otp`)**
   - User memasukkan:
     - Current Password *(Wajib)*
     - New Password *(Wajib, min 8 karakter)*
     - Confirm New Password *(Wajib, harus sama)*
   - User menekan tombol *"Lanjutkan & Minta Kode OTP"*.
   - Server memvalidasi hash `bcrypt` password lama user. Jika password lama salah, server langsung menolak dengan `400 Bad Request` ("Kata sandi lama yang Anda masukkan tidak cocok") tanpa mengirim OTP (mencegah spam/penyalahgunaan email).
   - Jika password lama valid:
     - Server memeriksa cooldown permintaan OTP (maksimal 1 request per 60 detik). Jika masih cooldown, server merespons `429 Too Many Requests`.
     - Server menghasilkan kode 6 digit numerik acak kriptografis (`crypto.randomInt(100000, 1000000)`).
     - Server menyimpan challenge di cache/Redis dengan key `otp:change-password:<userId>` dan waktu kedaluwarsa **10 menit** (600 detik).
     - Server mengirimkan email keamanan resmi ke alamat email terdaftar user.
     - Frontend beralih secara mulus ke tampilan **Langkah 2 (Input 6-Digit OTP)**.

2. **Langkah 2: Verifikasi OTP & Update Kata Sandi (`POST /api/users/change-password`)**
   - User memasukkan 6 digit kode OTP pada input box khusus (mendukung auto-focus antar digit dan paste clipboard).
   - Terdapat tombol *"Kirim Ulang Kode"* dengan hitung mundur timer 60 detik (*resend cooldown*).
   - User dapat menekan tombol *"Kembali / Ubah Sandi"* jika ingin mengoreksi password sebelum finalisasi.
   - Saat submit, server memverifikasi:
     - Kesesuaian kode OTP (maksimal 5 kali percobaan salah, setelah itu challenge dibatalkan otomatis demi keamanan).
     - Validitas password lama & syarat minimal 8 karakter password baru.
   - Jika verifikasi berhasil:
     - Server meng-hash password baru, memperbarui `passwordChangedAt = new Date()`, dan **menerbitkan `accessToken` baru** di response body.
     - Client langsung memperbarui token akses di `localStorage` dan mereset in-memory cache API sehingga sesi user yang sedang aktif tetap berjalan mulus tanpa terkena blokir `401 Unauthorized`.
     - Seluruh sesi login di perangkat lain secara otomatis dikeluarkan (*session revocation*).
     - Tampilan kembali ke form utama dengan notifikasi sukses.

#### B. Ganti Email Mandiri dengan OTP 6-Digit (Anti-Account-Takeover)
Alur penggantian email dirancang dengan standar keamanan perbankan/fintech:
1. **Langkah 1: Request OTP (`POST /api/users/email-verification/request`)**
   - User memasukkan alamat email baru.
   - Server memeriksa apakah email baru sudah terdaftar via **HMAC-SHA256 Blind Index** ($O(1)$). Jika sudah dipakai akun lain, server menolak dengan `409 Conflict`.
   - Server membuat OTP 6 digit acak numerik (mis. `482910`).
   - Server mengenkripsi OTP dengan hashing (SHA-256) dan menyimpan di redis/cache/database dengan waktu kedaluwarsa **10 menit**.
   - Server mengirimkan email resmi berisi kode OTP ke alamat email baru.
2. **Langkah 2: Verifikasi OTP (`POST /api/users/email-verification/confirm`)**
   - User diarahkan ke dialog input OTP 6 digit (input otomatis berpindah fokus antar kotak digit).
   - User memasukkan kode 6 digit.
   - Server memvalidasi kode OTP:
     - Jika salah: counter kesalahan bertambah (maksimal 5 kali percobaan salah, setelah itu OTP diblokir/hangus).
     - Jika benar & belum kedaluwarsa: Server meng-update kolom `email` (dienkripsi AES-256-GCM) dan `emailBindex` di database `User`, mengisi `emailVerifiedAt: new Date()`, dan menghapus cache OTP.
   - Antarmuka menampilkan notifikasi sukses dan email akun resmi berubah.

---

## 4. Spesifikasi Sistem OTP (One-Time Password)

Untuk menjamin keamanan maksimal tanpa risiko eksploitasi brute-force:
1. **Format Kode**: 6 digit numerik (`crypto.randomInt(100000, 1000000)`).
2. **Masa Berlaku (TTL)**: Tepat **10 menit** (600 detik).
3. **Penyimpanan Cache/Redis**:
   - Ganti Email: `otp:email-verify:<userId>`
   - Ganti Password: `otp:change-password:<userId>`
   - Cooldown: `otp:email-verify:cooldown:<userId>` dan `otp:change-password:cooldown:<userId>` (60 detik)
   - Percobaan Salah: `otp:email-verify:attempts:<userId>` dan `otp:change-password:attempts:<userId>` (maksimal 5 kali percobaan gagal berturut-turut).
4. **Rate Limiting & Anti-Abuse**:
   - Maksimal request kirim OTP: **1 kali per 60 detik** (cooldown resend).
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
        "date_of_birth": "2005-04-12",
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
    date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
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

### 5.5. `POST /api/users/change-password/request-otp`
Meminta 6-digit kode OTP ke email terdaftar untuk mengonfirmasi perubahan kata sandi.
* **Headers**: `Authorization: Bearer <accessToken>`
* **Request Body (Opsional untuk pre-verifikasi)**:
  ```json
  {
    "current_password": "currentPassword123"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "status": "success",
    "code": 200,
    "message": "Kode OTP telah dikirim ke email terdaftar Anda",
    "data": {
      "expires_in_seconds": 600,
      "resend_after_seconds": 60,
      "masked_email": "bu***@gmail.com"
    }
  }
  ```

### 5.6. `POST /api/users/change-password`
Verifikasi OTP dan eksekusi ganti kata sandi mandiri.
* **Headers**: `Authorization: Bearer <accessToken>`
* **Request Body**:
  ```typescript
  export const ChangePasswordSchema = z.object({
    current_password: z.string().min(1, "Current password is required"),
    new_password: z.string().min(8, "New password must be at least 8 characters"),
    otp: z.string().trim().length(6, "6-digit verification code (OTP) is required")
  })
  ```
* **Response (200 OK)**:
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

### 5.7. `GET /api/users/me/points-history`
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

## 6. Antarmuka Pengguna & Standar Human Interface Guidelines (HIG)

* **Prinsip HIG pada Digital Member Card**:
  * **Clarity & Visual Focus**: Informasi terpenting (Nama Jemaat, Nomor Anggota `userNumber`, QR Code, dan Role) memiliki kontras visual tinggi tanpa elemen dekoratif sekunder atau ticker statistik yang mengaburkan fungsi utama identitas fisik-digital.
  * **Standard Aspect Ratio (ID-1 / ISO 7810)**: Rasio 1.586 : 1 yang natural menyerupai kartu fisik pada Apple Wallet / Google Wallet (`aspect-[1.586/1]`).
  * **Continuous Curve Squircle**: Sudut `rounded-[20px]` / `rounded-[22px]` dengan specular hairline border (`ring-1 ring-black/5` atau `border-white/20`) dan ambient elevation shadow yang halus (`shadow-md`).
  * **Diferensiasi Palet Warna Per Role**:
    * `member`: Warm Pearl Ivory (`#FDFBF7` -> `#F4EFE6`), teks `#1A1A1A`, border `#E8DCC4`.
    * `activist`: Emerald Seva (`#064E3B` -> `#022C22`), teks `#FFFFFF`, aksen `#10B981`.
    * `organizer`: Royal Sapphire (`#1E293B` -> `#0F172A`), teks `#FFFFFF`, aksen `#3B82F6` / `#E8B94A`.
    * `admin`: Obsidian Titanium (`#18181B` -> `#09090B`), teks `#FAFAFA`, aksen `#E8B94A` / `#D4AF37`.
  * **QR Code Scanner-Ready**: QR code statis ditempatkan pada background putih murni (`#FFFFFF`) beradius `rounded-[14px]` agar pantulan cahaya latar tidak mengganggu sensor scanner optik kamera saat presensi di vihara.
* **Inline In-Page Form Interaction (No Modal Popup)**:
  * Mengeliminasi disrupsi konteks modal popup. User mengedit data profil langsung di halaman `/profile` dengan transisi in-place.
  * Focus ring aksesibel (`focus-visible:ring-2 focus-visible:ring-[#0a0a0a]`), touch target minimal 44x44px sesuai pedoman HIG accessibility.
* **OTP Input Component**: Menggunakan 6 kotak input terpisah dengan transisi fokus otomatis, paste clipboard support, dan hitung mundur timer 60 detik untuk tombol *"Resend OTP"*.
* **Semua Label Bahasa Inggris**: *"Digital Member ID"*, *"Personal Information"*, *"Edit Profile"*, *"Save Changes"*, *"Cancel"*, *"Account Security"*, *"Change Password"*, *"Verify New Email"*, *"Enter 6-Digit OTP"*, *"Points Ledger"*.
