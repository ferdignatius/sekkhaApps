# PRD: Penyederhanaan Alur Klaim Akun (Option B - Cara 1)

**Status**: Draft / Pending Review  
**Domain**: `users` / `peoples` / `auth`  
**Target Target**: Penyederhanaan skema database dan alur onboarding jemaat pra-registrasi.

---

## 1. Latar Belakang & Masalah

Saat ini, Sekkha memiliki mekanisme pra-registrasi di mana Pengurus dapat menambahkan jemaat secara manual (*pre-provisioning*) agar jemaat dapat langsung diabsenkan saat kebaktian dengan nomor anggota (`userNumber`).

Namun, alur klaim akun saat ini menggunakan mekanisme **Claim PIN 6-digit** yang membebani arsitektur:
- Tabel `users` dipenuhi kolom transaksi sementara: `claimPin`, `claimPinExpiresAt`, `failedClaimAttempts`, dan `claimedByUserId`.
- Pengurus harus membuka menu khusus untuk menerbitkan PIN (berlaku 15 menit).
- Jemaat harus meminta PIN secara langsung kepada pengurus dan memasukkannya ke aplikasi.

Alur ini terlalu kompleks untuk kebutuhan komunitas remaja vihara.

---

## 2. Solusi: Option B - Cara 1 (Password Sementara & Auto-Claim Login Pertama)

Alih-alih menggunakan sistem PIN sementara, aktivasi akun menggunakan pola **Temporary Password & First-Time Login Claim**:

### User Journey
1. **Pendaftaran oleh Pengurus**:
   - Pengurus membuat data jemaat baru di menu Pengurus / People.
   - Sistem men-generate:
     - `userNumber` unik (misal: `NV-2026-0012`).
     - Password sementara acak atau default terstandarisasi (misal: `sekkha2026!`).
   - Akun tersimpan dengan status:
     - `isClaimed: false`
     - `passwordChangedByUser: false`
2. **Jemaat Mengakses Aplikasi**:
   - Jemaat login menggunakan `userNumber` (atau `email` / `username`) + Password Sementara.
3. **Pemberitahuan Wajib Ganti Password**:
   - Begitu login berhasil, sistem mendeteksi `isClaimed === false` atau `passwordChangedByUser === false`.
   - Token sementara diterbitkan dengan scope terbatas (hanya bisa mengakses endpoint ganti password).
   - Aplikasi menampilkan modal/halaman: *"Selamat Datang! Silakan buat password baru untuk mengamankan akun Anda."*
4. **Klaim Akun Berhasil**:
   - Jemaat memasukkan password baru.
   - Backend melakukan update:
     - `isClaimed = true`
     - `claimedAt = new Date()`
     - `passwordChangedByUser = true`
     - `password = hash(newPassword)`
   - Akun resmi aktif sepenuhnya. Seluruh riwayat presensi dan poin sebelumnya otomatis melekat pada akun jemaat.

---

## 3. Rencana Perubahan Skema Database

Dengan solusi ini, kolom-kolom yang tidak diperlukan dapat dihapus dari tabel `users`:

### Kolom yang Dihapus:
- ❌ `claimPin`
- ❌ `claimPinExpiresAt`
- ❌ `failedClaimAttempts`
- ❌ `claimedByUserId`

### Kolom yang Dipertahankan:
- ✅ `isClaimed` (Boolean, default: `true` untuk registrasi mandiri, `false` untuk pre-provisioning pengurus)
- ✅ `claimedAt` (DateTime?, waktu pertama kali klaim/ganti password)
- ✅ `passwordChangedByUser` (Boolean, penanda apakah user sudah mengganti password default)

---

## 4. Endpoint yang Terpengaruh

| Method | Endpoint | Perubahan |
| :--- | :--- | :--- |
| `POST` | `/api/teams/members/:id/generate-claim-pin` | **Dihapus / Deprecated** |
| `POST` | `/api/auth/claim-account` | **Dihapus / Digantikan** oleh alur normal `login` + `change-password` |
| `POST` | `/api/users/change-password` | Saat user dengan `isClaimed: false` berhasil ganti password, otomatis set `isClaimed = true` dan `claimedAt = now()` |

---

## 5. Next Steps

- [ ] Review alur oleh user / developer.
- [ ] Implementasi update endpoint `/api/users/change-password` atau endpoint aktivasi.
- [ ] Drop kolom-kolom PIN di `prisma/schema.prisma` dan migrasi database.
