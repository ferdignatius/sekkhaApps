# PRD: Verifikasi Email untuk User Claim Account

**Status**: Draft / Pending Review  
**Domain**: `auth` / `users`  
**Related PRD**: `prd-sekkha/users/account-claim-simplification.md`

---

## 1. Tujuan

Menambahkan verifikasi email sebagai bagian dari alur **user claim account**.

User hasil pre-provisioning login pertama kali menggunakan `userNumber` atau `username` dan password sementara. Setelah itu user mengganti password, memasukkan email, lalu memverifikasi email sebelum email dapat dipakai sebagai identifier login atau pemulihan akun.

Email belum menjadi syarat untuk login awal.

---

## 2. Alur User Claim

1. Pengurus membuat data People.
2. Sistem membuat `User` dengan:
   - `userNumber` unik.
   - `username` default dari `userNumber`.
   - `email: null`.
   - `isClaimed: false`.
   - `passwordChangedByUser: false`.
3. User login memakai `username` atau `userNumber` + password sementara.
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

## 8. Acceptance Criteria

- [ ] User pre-provisioning dapat login tanpa email.
- [ ] User wajib mengganti password saat login pertama.
- [ ] User dapat mengirim email untuk verification.
- [ ] Email tidak dapat dipakai login sebelum verified.
- [ ] Kode disimpan hashed dan expired setelah 10 menit.
- [ ] Kode salah dibatasi maksimal 5 percobaan.
- [ ] Kode lama invalid setelah resend.
- [ ] Email duplicate tidak dapat diverifikasi.
- [ ] Verifikasi sukses mengisi `emailVerifiedAt`.
- [ ] Claim menjadi `true` hanya setelah password baru dan email verified selesai.
- [ ] Email lama tetap aktif sampai email baru verified.
- [ ] Audit log tercatat untuk perubahan email.
- [ ] Test mencakup happy path, expired code, wrong code, resend, duplicate email, dan rate limit.

---

## 9. Next Steps

- [ ] Review state claim dan kebutuhan email wajib.
- [ ] Finalisasi field Prisma.
- [ ] Implementasi email verification service.
- [ ] Implementasi provider pengiriman email.
- [ ] Tambah endpoint request dan confirm.
- [ ] Tambah rate limit dan audit log.
- [ ] Tambah test auth dan user claim.
