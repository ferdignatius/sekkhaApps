# PRD: Verifikasi Email untuk User Claim Account

**Status**: Draft / Pending Review  
**Domain**: `auth` / `users`  
**Related PRD**: `prd-sekkha/peoples/people-management.md`, `prd-sekkha/general/users/profile-and-settings.md`

---

## 1. Tujuan

Menambahkan verifikasi email sebagai bagian dari alur **user claim account**.

User hasil pre-provisioning login pertama kali menggunakan `username` atau `userNumber` dan password dummy. Setelah itu user mengganti password, memasukkan email, lalu memverifikasi email sebelum email dapat dipakai sebagai identifier login atau pemulihan akun.

Email belum menjadi syarat untuk login awal.

---

## 2. Alur User Claim

1. Pengurus membuat data People.
2. Sistem membuat `User` dengan:
   - `userNumber` unik.
   - `userNumber` sebagai nomor anggota integer numerik format `yyyymmddnn` (10 digit, e.g. `2026102301`) hasil generate sistem.
   - `username` sebagai identifier login dari nama dan angka random.
   - `email: null`.
   - `isClaimed: false`.
   - `passwordChangedByUser: false`.
3. User login memakai `username` atau `userNumber` + password dummy.
4. Sistem memberi token onboarding terbatas.
5. User mengganti password.
6. User mengirim email baru.
7. Sistem memvalidasi email dan mengirim kode verifikasi.
8. User mengirim kode verifikasi.
9. Sistem menandai email verified.
10. Sistem menyelesaikan claim account.

Password baru dan email verified tidak boleh diproses sebagai operasi bebas dengan token onboarding yang sudah kedaluwarsa.

---

## 3. Model Data

Tambahkan atau pertahankan field berikut pada `User`:

- `email String?`: email yang sudah disimpan setelah validasi format.
- `emailVerifiedAt DateTime?`: waktu email berhasil diverifikasi.
- `pendingEmail String?`: email baru yang belum diverifikasi.
- `emailVerificationCodeHash String?`: hash kode verifikasi, bukan kode asli.
- `emailVerificationExpiresAt DateTime?`: waktu kedaluwarsa kode.
- `emailVerificationAttempts Int`: jumlah percobaan kode pada challenge aktif.
- `emailVerificationSentAt DateTime?`: waktu pengiriman kode terakhir.

Aturan:

- `email` nullable sebelum claim account.
- `email` unique jika terisi.
- `pendingEmail` tidak boleh dianggap sebagai email login.
- `emailVerifiedAt` hanya diisi setelah kode valid.
- Kode asli tidak disimpan di database.
- Setelah verifikasi berhasil, pindahkan `pendingEmail` ke `email`, set `emailVerifiedAt`, lalu hapus field challenge.

Jika schema database memakai satu `email` field tanpa `pendingEmail`, email lama tidak boleh diganti sampai email baru verified. Rekomendasi: gunakan `pendingEmail` agar email verified lama tetap aman.

---

## 4. API Contract

### 4.1 Request Verification

`POST /api/users/email-verification/request`

Request:

```json
{
  "email": "user@example.com"
}
```

Behavior:

- Membutuhkan authenticated onboarding token atau access token user sendiri.
- Validasi format email.
- Normalisasi email, minimal trim dan lowercase.
- Tolak jika email sudah dipakai user lain.
- Simpan email sebagai `pendingEmail`.
- Generate kode numerik 6 digit menggunakan secure random.
- Simpan hash kode dan expiry 10 menit.
- Kirim email verifikasi.
- Terapkan cooldown pengiriman 60 detik.

Response sukses tidak mengungkap apakah email sudah terdaftar pada user lain. Gunakan response generik untuk mencegah email enumeration.

### 4.2 Confirm Verification

`POST /api/users/email-verification/confirm`

Request:

```json
{
  "code": "123456"
}
```

Behavior:

- Membutuhkan token user yang sama.
- Tolak kode yang expired, sudah dipakai, atau melebihi batas percobaan.
- Bandingkan kode dengan hash secara aman.
- Pastikan `pendingEmail` masih unik dalam transaksi.
- Pindahkan `pendingEmail` menjadi `email`.
- Set `emailVerifiedAt = now()`.
- Hapus hash, expiry, dan counter challenge.
- Set `isClaimed = true` hanya jika password sudah diganti.

### 4.3 Resend Verification

Gunakan endpoint request yang sama. Request baru mengganti challenge lama setelah cooldown terpenuhi.

Tidak perlu endpoint terpisah kecuali UI membutuhkan semantic route khusus.

---

## 5. Security Requirements

- Kode verifikasi hanya disimpan sebagai hash.
- Kode berlaku maksimal 10 menit.
- Maksimal 5 percobaan per challenge.
- Cooldown kirim ulang minimal 60 detik.
- Terapkan rate limit per user, email, IP, dan endpoint.
- Kode lama langsung invalid saat kode baru dibuat.
- Jangan log kode, token, atau email verification secret.
- Response tidak boleh membocorkan apakah email terdaftar.
- Email verified hanya boleh diubah melalui alur verifikasi baru.
- Perubahan email harus tercatat pada audit log.

---

## 6. Claim State

| Kondisi | Login username | Login email | Status claim |
| :--- | :---: | :---: | :---: |
| Pre-provisioned, belum login | Ya | Tidak | `false` |
| Password sudah diganti, email belum verified | Ya | Tidak | `false` |
| Password dan email sudah verified | Ya | Ya | `true` |
| User registrasi mandiri dengan email verified | Ya | Ya | `true` |

Email verified bukan satu-satunya syarat claim. Password sementara harus sudah diganti.

---

## 7. UX Requirements

- Tampilkan status email: belum diisi, menunggu verifikasi, atau verified.
- Setelah request sukses, tampilkan email tujuan dengan masking sebagian.
- Sediakan input kode 6 digit.
- Tampilkan sisa waktu expiry.
- Tampilkan cooldown resend.
- Jangan tampilkan kode di UI atau response API.
- User tetap dapat memakai `username` saat email belum verified.
- Jika email gagal diverifikasi, user tetap dapat mengulang request setelah cooldown.

---

---

## 8. User Stories

| ID | Sebagai | Saya ingin | Supaya |
| --- | --- | --- | --- |
| **US-CLM-01** | Jemaat hasil pre-provisioning | Login pertama kali menggunakan `username` atau `userNumber` dan password sementara | Saya dapat memulai proses klaim akun pribadi saya |
| **US-CLM-02** | Jemaat yang sedang klaim akun | Wajib mengganti password sementara dengan kata sandi pribadi yang aman | Akun saya terlindungi dari akses pihak lain yang mengetahui password sementara |
| **US-CLM-03** | Jemaat yang telah mengganti password | Mendaftarkan alamat email pribadi dan menerima kode OTP 6 digit | Email saya terverifikasi secara sah sebagai identitas pemulihan dan login |
| **US-CLM-04** | Jemaat yang menerima kode verifikasi | Memasukkan kode OTP 6 digit untuk menyelesaikan klaim akun (`isClaimed: true`) | Akun saya aktif penuh dan seluruh riwayat kehadiran sebelumnya terhubung permanen |
| **US-CLM-05** | Jemaat yang belum menerima kode | Meminta kirim ulang kode verifikasi setelah jeda cooldown 60 detik | Saya tetap dapat menyelesaikan verifikasi jika email pertama tidak sampai atau kedaluwarsa |

---

## 9. Matrix Kriteria Penerimaan (Acceptance Criteria)

| ID | Skenario Pengujian | Hasil yang Diharapkan |
| --- | --- | --- |
| **AC-CLM-01** | Jemaat pre-provisioning login awal tanpa email | Login berhasil dengan `username` atau `userNumber`, mengembalikan `requires_password_change: true` dan token onboarding terbatas. |
| **AC-CLM-02** | Jemaat mengganti password sementara | Password berhasil diperbarui (`passwordChangedByUser: true`), sesi onboarding diperbarui untuk tahap verifikasi email. |
| **AC-CLM-03** | Jemaat mengirim email untuk verifikasi klaim | Email dinormalisasi, disimpan sebagai `pendingEmail`, kode 6 digit di-hash, dan email dikirim dengan expiry 10 menit. |
| **AC-CLM-04** | Jemaat mengonfirmasi kode verifikasi valid | `pendingEmail` dipindahkan ke `email`, `emailVerifiedAt` terisi, dan `isClaimed = true` (karena password sudah diganti). |
| **AC-CLM-05** | Jemaat mencoba memakai email yang belum terverifikasi untuk login | Login ditolak. Email hanya dapat dipakai login setelah verifikasi selesai. |
| **AC-CLM-06** | Kode salah dimasukkan hingga 5 kali | Challenge dibatalkan otomatis; percobaan berikutnya ditolak. |
| **AC-CLM-07** | Permintaan resend kode sebelum 60 detik | Ditolak dengan status rate-limit cooldown. |
| **AC-CLM-08** | Email yang didaftarkan sudah dipakai user lain | Server merespons generik anti-enumeration, namun proses klaim tidak menimpa akun lain. |

---

## 10. Test Cases (Matriks Pengujian Terinci)

| Test Case ID | Kategori | Skenario / Deskripsi | Kondisi Awal (Preconditions) | Langkah Pengujian | Hasil yang Diharapkan | Tipe |
| --- | --- | --- | --- | --- | --- | --- |
| **TC-CLM-01** | Initial Sign-in | Login pertama jemaat pre-provisioned dengan dummy password | User dibuat via People pre-provisioning (`isClaimed: false`, `email: null`) | Submit `POST /api/auth/login` dengan `userNumber` / `username` dan temporary password. | HTTP 200 envelope dengan token terbatas, payload menandai `requires_password_change: true` dan `is_claimed: false`. | Positive |
| **TC-CLM-02** | Password Change | Ganti password sementara dengan password baru (>= 8 karakter) | Login claim berhasil | Submit `POST /api/users/change-password` dengan password lama dan password baru valid. | HTTP 200 envelope. `passwordChangedByUser: true`. Sesi diizinkan lanjut ke verifikasi email. | Positive |
| **TC-CLM-03** | Password Change | Submit password baru < 8 karakter saat claim | Tahap ganti password claim | Submit `POST /api/users/change-password` dengan password 6 karakter. | HTTP 400 Bad Request ("Password must be at least 8 characters"). Password tidak berubah. | Negative |
| **TC-CLM-04** | Email Request | Request verifikasi email untuk klaim akun | Password dummy sudah diganti | Submit `POST /api/users/email-verification/request` dengan `email: "jemaat@example.com"`. | HTTP 200 envelope generik. Kode OTP 6 digit dibuat, di-hash di DB/cache, email terkirim, expiry 10 menit. | Positive |
| **TC-CLM-05** | Anti-Enumeration | Request verifikasi email dengan alamat yang sudah terdaftar di akun lain | Email `budi@example.com` sudah dipakai user lain | Submit `POST /api/users/email-verification/request` dengan `budi@example.com`. | HTTP 200 envelope generik (pesan sama persis). Kode OTP tidak dikirimkan ke email korban dan DB tidak terpengaruh. | Security |
| **TC-CLM-06** | OTP Confirm | Konfirmasi kode verifikasi yang valid | Kode OTP aktif terkirim | Submit `POST /api/users/email-verification/confirm` dengan 6-digit kode valid. | HTTP 200 envelope. `email` terisi, `emailVerifiedAt` tercatat `now()`, `isClaimed = true`. User diarahkan ke `/onboarding`. | Positive |
| **TC-CLM-07** | OTP Confirm | Konfirmasi dengan kode OTP salah (< 5 kali) | Challenge aktif | Submit `POST /api/users/email-verification/confirm` dengan kode salah (`"000000"`). | HTTP 400 Bad Request ("Invalid verification code"). Counter percobaan bertambah. | Negative |
| **TC-CLM-08** | Brute Force Lock | Percobaan kode salah mencapai batas 5 kali | Percobaan salah sudah 4 kali | Submit kode salah untuk ke-5 dan ke-6 kalinya. | Percobaan ke-5 gagal, challenge langsung di-invalidasi. Percobaan ke-6 mengembalikan HTTP 400 / 429 ("Challenge expired or locked"). | Security |
| **TC-CLM-09** | OTP Expiry | Konfirmasi kode setelah melewati 10 menit | Kode diterbitkan > 10 menit lalu | Submit `POST /api/users/email-verification/confirm` dengan kode asli. | HTTP 400 Bad Request ("Verification code has expired"). User harus meminta kode baru. | Edge Case |
| **TC-CLM-10** | Resend Cooldown | Permintaan kirim ulang kode dalam masa cooldown 60 detik | Kode baru saja dikirim (< 60 detik) | Submit `POST /api/users/email-verification/request` ulang. | HTTP 429 Too Many Requests ("Please wait 60 seconds before requesting a new code"). | Edge Case |
| **TC-CLM-11** | Resend Success | Kirim ulang kode setelah melewati 60 detik | Cooldown 60 detik telah lewat | Submit `POST /api/users/email-verification/request` dengan email yang sama. | HTTP 200 envelope. Kode lama dibatalkan segera, kode OTP 6 digit baru di-generate dan dikirimkan. | Positive |
| **TC-CLM-12** | Post-Claim Login | Login setelah klaim selesai menggunakan email baru | Akun sudah `isClaimed: true` dan email terverifikasi | Submit `POST /api/auth/login` dengan `email` dan password baru. | HTTP 200 envelope. Login berhasil menggunakan email. Riwayat presensi lama tetap terhubung utuh. | Positive |
