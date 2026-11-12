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
2. **Manajemen Data Pribadi (In-Page Inline Form)**: Jemaat dapat memperbarui profil langsung di halaman (*in-place inline editing* tanpa modal popup), mencakup nama lengkap, **username unik**, dan sekolah almamater (terhubung langsung ke `GET /api/schools`). *(Nomor telepon/WhatsApp dan tanggal lahir ditiadakan untuk prinsip minimisasi data UU PDP.)*
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
[ Tab 1: Pass / Member Pass ]  |  [ Tab 2: Profile / Personal Profile ]  |  [ Tab 3: Security / Security & Settings ]
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
    * *"Print Card"* / *"Print"*: Membuka dialog cetak siap pakai browser (`window.print()`) untuk mencetak kartu anggota.
    * **Tombol Responsif Satu Baris (`grid-cols-3`)**: `Copy ID`, `Enlarge QR` (CTA primary), dan `Print` tampil sejajar satu baris di mobile tanpa terpotong.
    * *"Enlarge QR"*: Modal fullscreen QR Code kontras tinggi dengan kecerahan optimal untuk kemudahan pemindaian di pintu masuk kebaktian.
* **Riwayat Poin Transparan (Points History)**:
  * Menampilkan daftar transaksi poin dari endpoint `GET /api/users/me/points-history`.
  * Setiap entri memuat: Nama Kegiatan / Event, Waktu & Tanggal, Tag Kategori, dan Badge Perubahan Poin (`+50 Pts` hijau atau `-15 Pts` merah jika penalti terlambat).

### 3.2. Tab 2: Personal Profile (In-Page Inline Edit Form)
* **Desain Interaksi Tanpa Modal (*No Popup Dialog*)**:
  * Tab profil **TIDAK menggunakan modal atau drawer popup**. Pengeditan data dilakukan langsung di tempat (*in-place inline editing*) pada halaman `/profile`.
  * **State 1: View Mode (Default / Read-Only)**:
    * Menampilkan kartu ringkasan informasi data diri jemaat dalam layout dua kolom yang rapi dan terstruktur.
    * Memuat info: Full Name, Username (`@username`), Email (read-only), dan School / University Almamater.
    * Tombol *"Edit Profile"* di pojok kanan atas kartu dengan ikon pensil.
  * **State 2: Edit Mode (Inline Form Transition)**:
    * Saat user mengklik *"Edit Profile"*, kartu data profil langsung bertransformasi menjadi form interaktif di halaman yang sama (animasi transisi halus fade/slide tanpa layout shift).
    * **Field Input Form**:
      * **Full Name** *(Input teks, wajib, min 1 karakter)*.
      * **Username** *(Input teks dengan prefix `@`, wajib, min 3 s.d. 30 karakter, format regex `[a-z0-9._]`, divalidasi keunikan oleh server)*.
      * **School / University** *(Dropdown infinite-scroll dari master data `GET /api/configure/schools` / `GET /api/schools`: dimuat secara lazy saat Edit Profile dengan batch awal 5 institusi [`page=1&limit=5&paginated=true`], memuat 5 item berikutnya saat di-scroll, dan tetap menjaga tampilan nama sekolah terpilih jika belum ada di halaman pertama)*.
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
    username: z.string().trim().min(3).max(30).optional(),
    school_id: z.string().cuid().optional().nullable(),
  })
  ```

### 5.3. `POST /api/users/email-verification/request`
Meminta pengiriman kode OTP ke email baru. Hanya menerima alamat `@gmail.com` dengan format local-part valid (tanpa titik ganda/awal/akhir) di frontend dan backend untuk mencegah spam.
* **Request Body**:
  ```json
  {
    "email": "budi.new@gmail.com"
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

* **Tata Letak Responsif Halaman `/profile`**:
  * **Desktop 2-Kolom (`lg:grid-cols-12`)**: Kolom kiri (`lg:col-span-4`, sticky) berisi *Lean Hero Identity Card* (avatar inisial, nama, badge role, `@username`, `Karma Points`, dan `Weekly Streak` tanpa duplikasi email/telepon/member ID). Kolom kanan (`lg:col-span-8`) menampilkan tab tersegmen dan konten aktif.
  * **3 Tab Responsif**: Label ringkas pada mobile (`Pass`, `Profile`, `Security`) agar tidak terpotong (`min-h-[44px]`), serta label lengkap pada desktop (`Member Pass`, `Personal Profile`, `Security & Settings`).
  * **Sign Out Terjangkau di Bagian Bawah**: Kartu aksi **Session & Sign Out** ditempatkan secara konsisten di bagian paling bawah `/profile` (lintas tab, dilengkapi safe-area padding di atas MobileDock) dengan dialog konfirmasi aksesibel (`ConfirmDialog`), sementara Tab 3 fokus penuh pada Password OTP, Verifikasi Email, dan Danger Zone (Radix `Dialog` dengan dukungan tombol Escape).
* **Progressive Points Ledger & Lazy Schools Loading**:
  * `PointsLedger` menampilkan **10** transaksi mutasi terbaru secara default dengan tombol *"Show More"* untuk memuat sisa riwayat serta banner error dengan tombol *"Try Again"*, tanpa kotak ringkasan *"Current Balance"* yang duplikatif.
  * Daftar sekolah (`GET /api/configure/schools?page=1&limit=5&paginated=true`) dimuat secara *lazy* hanya ketika user menekan *"Edit Profile"* di tab `Personal Profile` menggunakan pagination bertahap (`limit=5` + *infinite scroll* saat menu dropdown digulir). Field email pada View Mode bersifat *read-only* dengan tautan pintas langsung ke tab `Security & Settings`.
* **Prinsip HIG pada Digital Member Card**:
  * **Clarity & Visual Focus**: Informasi terpenting (Nama Jemaat, Nomor Anggota `userNumber`, QR Code, dan Role) memiliki kontras visual tinggi tanpa elemen dekoratif sekunder atau ticker statistik yang mengaburkan fungsi utama identitas fisik-digital.
  * **3 Aksi Kartu Satu Baris (`grid-cols-3`)**: Tombol `Copy ID` (`Copy Member ID`), `Enlarge QR` (CTA utama kontras tinggi `filled`), dan `Print` (`Print Card`) tersusun sejajar satu baris tanpa wrapping canggung di layar mobile.
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
* **Semua Label Bahasa Inggris**: *"Member Pass"*, *"Personal Information"*, *"Edit Profile"*, *"Save Changes"*, *"Cancel"*, *"Security & Settings"*, *"Change Account Password"*, *"Verify New Email"*, *"Enter 6-Digit OTP"*, *"Karma Points History"*, *"Session & Sign Out"*.

---

## 7. User Stories

| ID | Sebagai | Saya ingin | Supaya |
| --- | --- | --- | --- |
| **US-PROF-01** | Jemaat terdaftar | Melihat Kartu Anggota Digital berdesain HIG dengan QR Code statis permanen | Saya dapat menunjukkan identitas anggota dan melakukan presensi kebaktian dengan mudah |
| **US-PROF-02** | Jemaat terdaftar | Mencetak kartu digital (`Print Card`) dan memperbesar tampilan QR Code (`Enlarge QR`) | Saya tetap bisa melakukan presensi meski tidak membawa smartphone fisik atau saat offline |
| **US-PROF-03** | Jemaat terdaftar | Mengedit nama, username, dan almamater sekolah secara inline tanpa modal popup | Data personal saya selalu akurat dengan pengalaman UI yang mulus tanpa disrupsi konteks |
| **US-PROF-04** | Jemaat terdaftar | Melihat riwayat mutasi Karma Points saya secara bertahap (10 terbaru + *"Show More"*) | Halaman tetap ringan namun saya tetap mengetahui rincian perolehan poin secara detail |
| **US-PROF-05** | Jemaat terdaftar | Mengganti kata sandi dengan perlindungan 2-Faktor OTP email | Akun saya tetap terlindungi dari penyalahgunaan pihak tidak bertanggung jawab |
| **US-PROF-06** | Jemaat yang mengganti kata sandi | Mendapatkan token sesi baru langsung di respons tanpa logout paksa | Sesi saya di perangkat yang sedang dipakai tetap berjalan lancar tanpa mengalami 401 error |
| **US-PROF-07** | Jemaat terdaftar | Memperbarui alamat email dengan verifikasi kode OTP 6 digit di email baru | Akun saya terhindar dari pembajakan email (*account takeover*) dan email baru sah terverifikasi |
| **US-PROF-08** | Jemaat terdaftar | Menemukan aksi **Sign Out** di bagian bawah halaman `/profile` dengan konfirmasi dialog | Saya tidak perlu mencari tombol keluar jauh di dalam sub-tab keamanan |

---

## 8. Matrix Kriteria Penerimaan (Acceptance Criteria)

| ID | Skenario Pengujian | Hasil yang Diharapkan |
| --- | --- | --- |
| **AC-PROF-01** | User membuka `/profile` Tab Pass | Menampilkan Lean Hero Card (tanpa duplikasi ID/email), 3 label tab unclipped (`Pass`/`Profile`/`Security`), kartu anggota digital per role, serta 10 transaksi terbaru di `PointsLedger`. |
| **AC-PROF-02** | User mengklik "Enlarge QR" | Modal dialog kontras tinggi fullscreen muncul menampilkan QR Code dan nomor anggota dengan kecerahan optimal. |
| **AC-PROF-03** | User mengklik "Print Card" / "Print" | Membuka dialog cetak siap pakai browser (`window.print()`) untuk mencetak kartu identitas anggota. |
| **AC-PROF-04** | User membuka tab Personal Profile dalam mode baca | Data diri (termasuk email *read-only* dengan pintasan ke tab Security) tampil rapi dalam View Mode tanpa form input aktif dan tanpa fetch daftar sekolah sebelum mode Edit dibuka. |
| **AC-PROF-05** | User mengklik "Edit Profile" lalu "Cancel" | Form inline berubah ke Edit Mode dan me-load daftar sekolah secara *lazy*. Saat cancel diklik, form kembali ke View Mode tanpa menyimpan perubahan. |
| **AC-PROF-06** | User menyimpan perubahan profil valid | Memanggil `PUT /api/users/me/profile` (atau `PATCH /api/users/me`), menampilkan toast notifikasi sukses, dan kembali ke View Mode dengan data terbaru. |
| **AC-PROF-07** | User meminta OTP ganti password dengan password lama salah | Ditolak HTTP 400 Bad Request ("Kata sandi lama tidak cocok"). Kode OTP tidak dikirim ke email. |
| **AC-PROF-08** | User meminta OTP ganti password dengan password lama benar | HTTP 200. Kode OTP 6 digit dikirim ke email terdaftar. Tampilan otomatis beralih ke form input 6-digit OTP dengan timer 60 detik. |
| **AC-PROF-09** | User memasukkan OTP ganti password yang benar | HTTP 200. Password diperbarui, sesi lain di-revoke, `accessToken` baru dikembalikan di response dan langsung disimpan di `localStorage` tanpa 401 redirect. |
| **AC-PROF-10** | User mengganti email ke email baru | Kode OTP dikirim ke email baru. Setelah diverifikasi dengan kode yang valid, kolom `email` (dienkripsi AES-256-GCM) dan `emailBindex` di-update. |
| **AC-PROF-11** | User menekan tombol Sign Out di bagian bawah `/profile` | Membuka dialog konfirmasi `ConfirmDialog` berbahasa Inggris (*"Confirm Sign Out"*); konfirmasi mengeksekusi logout sesi dengan aman. |

---

## 9. Test Cases (Matriks Pengujian Terinci)

| Test Case ID | Kategori | Skenario / Deskripsi | Kondisi Awal (Preconditions) | Langkah Pengujian | Hasil yang Diharapkan | Tipe |
| --- | --- | --- | --- | --- | --- | --- |
| **TC-PROF-01** | Digital Card | Render Digital Member ID Card sesuai tema role | User login dengan role `activist` | 1. Buka tab `/profile` Tab 1.<br>2. Periksa palet warna kartu dan role chip. | Kartu dirender dengan tema Emerald Seva (`from-[#064E3B] to-[#022C22]`), teks putih, role chip activist. QR code putih bersih kontras tinggi. | Positive |
| **TC-PROF-02** | Digital Card QR | Pemindaian QR code statis permanen | User kartu anggota ditampilkan | 1. Scan QR code menggunakan barcode reader / kamera panitia. | Nilai terbaca adalah string persis `userNumber` (misal `"2026102401"`). Tidak ada kedaluwarsa atau rolling token. | Positive |
| **TC-PROF-03** | Digital Card Action | Cetak kartu anggota (`Print Card`) & perbesar QR (`Enlarge QR`) | Di halaman Tab 1 | 1. Periksa 3 tombol aksi sejajar satu baris (`Copy ID`, `Enlarge QR` primary, `Print`).<br>2. Klik `Print Card`. | Dialog cetak browser terbuka (`window.print()`) dengan layout kartu tetap utuh; klik `Enlarge QR` membuka modal QR kontras tinggi. | Positive |
| **TC-PROF-04** | Inline Edit | Transisi mulus View Mode ke Edit Mode (Lazy School Load) dan Cancel | Di Tab 2 Personal Profile | 1. Buka Tab Profile (pastikan dropdown sekolah belum di-fetch).<br>2. Klik "Edit Profile".<br>3. Ubah field Full Name lalu klik "Cancel". | Saat klik "Edit Profile", daftar sekolah di-fetch sekali secara *lazy*. Saat cancel diklik, form kembali ke View Mode tanpa request simpan. | Positive |
| **TC-PROF-05** | Inline Edit | Update profil dengan data valid | Di Tab 2 Edit Mode | 1. Ubah `name: "Upasaka Budi"`.<br>2. Ubah `username: "upasaka.budi"`.<br>3. Pilih sekolah dari dropdown `GET /api/schools`.<br>4. Klik "Save Changes". | HTTP 200 envelope. Data tersimpan di DB, toast sukses muncul, form kembali ke View Mode dengan data terbaru. | Positive |
| **TC-PROF-06** | Inline Edit | Update username dengan format tidak valid | Di Tab 2 Edit Mode | 1. Masukkan `username: "bu di@!"` (mengandung spasi dan simbol terlarang).<br>2. Klik "Save Changes". | Validasi client Zod memblokir submit ("Username can only contain lowercase letters, numbers, dots, and underscores"). | Negative |
| **TC-PROF-07** | Inline Edit | Update username yang sudah dipakai pengguna lain | Username `budi.santoso` sudah ada di akun lain | 1. Masukkan `username: "budi.santoso"`.<br>2. Klik "Save Changes". | HTTP 409 Conflict envelope ("Username already in use"). Pesan error muncul di field username. | Negative |
| **TC-PROF-08** | Points Ledger | Menampilkan riwayat transaksi poin transparan | User memiliki riwayat mutasi poin | 1. Buka Tab 1 bagian Points History. | Riwayat perolehan poin dari `GET /api/users/me/points-history` tampil urut waktu: nama kegiatan, jenis transaksi, delta poin (+/-), dan running balance. | Positive |
| **TC-PROF-09** | Change Password | Request OTP ganti password dengan password lama salah | Akun user aktif | 1. Buka Tab 3 Security.<br>2. Masukkan password lama yang salah.<br>3. Masukkan password baru (10 karakter).<br>4. Klik "Lanjutkan & Minta Kode OTP". | HTTP 400 Bad Request ("Kata sandi lama yang Anda masukkan tidak cocok"). Kode OTP TIDAK dikirim ke email. Form tidak berpindah ke step 2. | Negative / Security |
| **TC-PROF-10** | Change Password | Request OTP ganti password dengan password baru < 8 karakter | Password lama benar | 1. Masukkan password baru `rahasia` (7 karakter).<br>2. Klik request OTP. | Validasi form memblokir submit ("Password must be at least 8 characters"). | Negative |
| **TC-PROF-11** | Change Password | Request OTP ganti password valid (Step 1) | Password lama benar, baru valid | 1. Masukkan password lama dan baru valid.<br>2. Klik "Lanjutkan & Minta Kode OTP". | HTTP 200 envelope. Server generate 6-digit OTP kriptografis, simpan di cache (TTL 600s), kirim email ke user. UI berpindah ke Step 2 dengan countdown 60 detik. | Positive |
| **TC-PROF-12** | Change Password | Verifikasi OTP ganti password benar (Step 2 & Auto-Refresh) | OTP 6 digit diterima di email | 1. Masukkan 6 digit OTP valid.<br>2. Klik konfirmasi perubahan kata sandi. | HTTP 200. Password di-hash bcrypt, `passwordChangedAt` di-update, token sesi lama dicabut, `accessToken` baru dikirim di body. Client auto-update `localStorage` tanpa ter-logout. | Positive / Security |
| **TC-PROF-13** | Change Password | Verifikasi OTP ganti password dengan kode salah >= 5 kali | Challenge aktif di Step 2 | 1. Masukkan kode OTP salah berturut-turut hingga 5 kali. | Pada kesalahan ke-5, challenge OTP otomatis dibatalkan/dihapus dari cache. Percobaan ke-6 ditolak HTTP 400/429. User harus mengulang dari Step 1. | Security |
| **TC-PROF-14** | Email Change | Request ganti email ke alamat yang sudah terdaftar (Blind Index) | Email target sudah dipakai user lain | 1. Buka form ganti email.<br>2. Masukkan email yang sudah dipakai.<br>3. Klik kirim OTP. | Server mencari `emailBindex` ($O(1)$) dan merespons HTTP 409 Conflict. OTP tidak dikirim. | Negative / Security |
| **TC-PROF-15** | Email Change | Verifikasi ganti email sukses | Email baru belum pernah terdaftar | 1. Request OTP ke email baru.<br>2. Masukkan kode OTP 6 digit valid dari kotak masuk email baru. | HTTP 200. Email di database dienkripsi AES-256-GCM, `emailBindex` dihitung ulang, `emailVerifiedAt` terisi waktu sekarang. Sesi audit log mencatat perubahan. | Positive / Security |
