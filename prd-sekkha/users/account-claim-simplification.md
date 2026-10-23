# PRD: Penyederhanaan Alur Klaim Akun (Option B - Username & Password Sementara)

**Status**: Draft / Pending Review  
**Domain**: `users` / `peoples` / `auth`  
**Target**: Penyederhanaan skema database dan alur onboarding jemaat pra-registrasi.

---

## 1. Latar Belakang & Masalah

Sekkha memiliki mekanisme pra-registrasi. Pengurus menambahkan jemaat secara manual agar jemaat dapat langsung diabsenkan dengan nomor anggota (`userNumber`).

Claim PIN terlalu kompleks karena membutuhkan PIN sementara, expiry, dan menu penerbitan khusus.

---

## 2. Solusi: Username/User Number & Password Sementara

Aktivasi akun memakai pola **Temporary Password & First-Time Login Claim**.

Identitas login:

- `userNumber`: nomor anggota bisnis, unik dan immutable. Dipakai sebagai username awal.
- `username`: identifier login unik. Nilai awal sama dengan `userNumber`.
- `email`: identifier login tambahan dan kontak. Nullable saat pre-provisioning.

Login menerima `username` atau email terverifikasi sebagai identifier.

### User Journey

1. **Pendaftaran oleh Pengurus**:
   - Sistem membuat `userNumber` unik, `username` dari `userNumber`, dan password sementara acak.
   - Email boleh kosong (`null`) sampai jemaat melengkapi profil.
   - Akun tersimpan dengan `isClaimed: false` dan `passwordChangedByUser: false`.
2. **Jemaat Mengakses Aplikasi**:
   - Jemaat login menggunakan `username` atau `userNumber` + password sementara.
3. **Pemberitahuan Wajib Ganti Password**:
   - Sistem mendeteksi `isClaimed === false` atau `passwordChangedByUser === false`.
   - Token sementara hanya boleh mengakses onboarding dan ganti password.
4. **Pelengkapan Identitas**:
   - Jemaat membuat password baru dan mengisi email jika belum ada.
   - Email diverifikasi sebelum dapat dipakai untuk login.
5. **Klaim Akun Berhasil**:
   - Backend mengatur `isClaimed = true`, `claimedAt = new Date()`, `passwordChangedByUser = true`, dan menyimpan hash password baru.
   - Riwayat presensi dan poin sebelumnya tetap melekat pada akun.

---

## 3. Rencana Perubahan Skema Database

### Kolom yang Dihapus

- `claimPin`
- `claimPinExpiresAt`
- `failedClaimAttempts`
- `claimedByUserId`

### Kolom yang Dipertahankan

- `userNumber` (nomor anggota unik dan immutable)
- `username` (unik, default dari `userNumber`)
- `email` (nullable saat pre-provisioning, unique jika diisi)
- `isClaimed` (default `true` untuk registrasi mandiri, `false` untuk pre-provisioning Pengurus)
- `claimedAt` (waktu klaim pertama)
- `passwordChangedByUser` (penanda password sementara sudah diganti)

---

## 4. Endpoint yang Terpengaruh

| Method | Endpoint | Perubahan |
| :--- | :--- | :--- |
| `POST` | `/api/teams/members/:id/generate-claim-pin` | Dihapus / deprecated |
| `POST` | `/api/auth/claim-account` | Dihapus, digantikan login + change-password |
| `POST` | `/api/auth/login` | Menerima `username`, `userNumber`, atau email terverifikasi sebagai identifier |
| `POST` | `/api/users/change-password` | Mengubah akun pre-provisioning menjadi claimed |
| `POST` | `/api/users/verify-email` | Memverifikasi email sebelum dipakai untuk login |

---

## 5. Aturan Identitas & Collision

- `userNumber` wajib unik dan tidak berubah setelah dibuat.
- `username` wajib unik dan default-nya sama dengan `userNumber`.
- `email` nullable sebelum klaim, tetapi wajib unik jika diisi.
- Identifier duplikat harus ditolak database dan ditangani API sebagai validation error.
- Email tidak boleh dipakai untuk login sebelum verifikasi berhasil.

## 6. Next Steps

- [ ] Review alur oleh user / developer.
- [ ] Tambahkan login dengan `username` atau email.
- [ ] Implementasi endpoint `/api/users/change-password`.
- [ ] Implementasi verifikasi email.
- [ ] Drop kolom PIN di `prisma/schema.prisma` dan migrasi database.
