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

- `userNumber`: nomor anggota unik hasil generate sistem.
- `username`: identifier login unik hasil generate dari nama dan angka random.
- `email`: identifier login tambahan dan kontak. Nullable saat pre-provisioning.

Login menerima `username`, `userNumber`, atau email terverifikasi sebagai identifier.

Format `userNumber` adalah integer numerik `yyyymmddnn` (10 digit, misalnya `2026102301`). Nilai terdiri dari tanggal pembuatan (`yyyymmdd`) dan 2 digit nomor urut pendaftaran (`nn`), tanpa prefix atau separator. Disimpan sebagai BigInt/Integer di database.

### User Journey

1. **Pendaftaran oleh Pengurus**:
   - Sistem membuat `userNumber` unik, `username` dari nama + angka random, dan password dummy berformat `sekkha` + 5 angka random + `puggala`.
   - Email boleh kosong (`null`) sampai jemaat melengkapi profil.
   - Akun tersimpan dengan `isClaimed: false` dan `passwordChangedByUser: false`.
2. **Jemaat Mengakses Aplikasi**:
   - Jemaat login menggunakan `username` atau `userNumber` + password dummy.
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

- `userNumber` (nomor anggota unik hasil generate sistem)
- `username` (identifier login unik dari nama + angka random)
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
- `userNumber` hanya berisi angka dengan format `yyyymmddnum`.
- `username` wajib unik dan dihasilkan dari nama + angka random.
- `email` nullable sebelum klaim, tetapi wajib unik jika diisi.
- Identifier duplikat harus ditolak database dan ditangani API sebagai validation error.
- Email tidak boleh dipakai untuk login sebelum verifikasi berhasil.

## 6. Next Steps

- [ ] Review alur oleh user / developer.
- [ ] Tambahkan login dengan `username`, `userNumber`, atau email.
- [ ] Implementasi endpoint `/api/users/change-password`.
- [ ] Implementasi verifikasi email.
- [ ] Drop kolom PIN di `prisma/schema.prisma` dan migrasi database.
