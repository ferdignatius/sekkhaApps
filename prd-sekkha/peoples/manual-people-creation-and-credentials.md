# PRD: Manual People Creation & Generated Login Credentials

**Status**: Draft / Pending Review  
**Domain**: `pengurus` / `users` / `auth`  
**Related PRD**:
- `prd-sekkha/general/users/account-claim-simplification.md`
- `prd-sekkha/general/users/email-verification-for-account-claim.md`
- `prd-sekkha/pengurus/peopleManagementAndAccountLinking.md`

---

## 1. Tujuan

Memungkinkan Pengurus membuat data People secara manual sebelum user memiliki akun aplikasi. Sistem otomatis menghasilkan `userNumber`, `username`, dan password dummy untuk login awal.

People dapat langsung dipakai untuk absensi dan pencatatan poin. User kemudian claim account memakai credential tersebut tanpa membuat record baru atau kehilangan riwayat.

`userNumber` dan `username` adalah dua identifier berbeda. `userNumber` menjadi nomor anggota, sedangkan `username` menjadi identifier login yang mudah dibaca.

---

## 2. Scope

### In scope

- Form tambah People oleh Pengurus atau Admin.
- Generate `userNumber` unik.
- Generate `username` dari nama dan angka random.
- Generate password dummy dengan format `sekkha` + 5 angka random + `puggala`.
- Penyimpanan password dalam bentuk hash.
- Distribusi credential secara aman kepada user.
- Login pertama dengan `username` atau `userNumber` dan password dummy.
- Wajib ganti password dan verifikasi email saat claim account.
- Status People: belum diklaim atau sudah diklaim.

### Out of scope

- Pengurus melihat password setelah record dibuat.
- Password default bersama untuk semua People.
- Pengiriman password melalui URL atau log.
- Pembuatan kolom `username` baru.
- Penggabungan dua user yang sama-sama sudah claimed.

---

## 3. User Flow

### 3.1 Pengurus membuat People

1. Pengurus membuka `Pengurus > People`.
2. Pengurus memilih `Tambah People`.
3. Pengurus mengisi:
   - Nama lengkap, wajib.
   - Email, opsional.
   - Nomor telepon, opsional.
   - Tanggal lahir, opsional.
   - Jenis kelamin, opsional.
   - Sekolah dan kelas, opsional.
   - Role, default `umat`.
4. Sistem membuat `userNumber` unik.
5. Sistem membuat `username` dari nama normalized dan angka random.
6. Sistem membuat password dummy dengan format `sekkha#####puggala`.
7. Sistem menyimpan hash password, bukan password asli.
8. Sistem menyimpan user dengan:
   - `isClaimed: false`.
   - `passwordChangedByUser: false`.
   - `emailVerifiedAt: null` jika email belum diverifikasi.
9. Sistem menampilkan credential satu kali kepada Pengurus:
   - `userNumber`.
   - `username`.
   - Password dummy.
10. Pengurus menyerahkan credential kepada user melalui kanal aman.

### 3.2 User login pertama

1. User memasukkan `userNumber` dan password sementara.
2. Sistem memvalidasi credential.
3. Sistem menerbitkan token onboarding terbatas.
4. User wajib membuat password baru.
5. User mengisi email jika belum tersedia.
6. User menyelesaikan verifikasi email.
7. Sistem mengatur `isClaimed: true` dan `claimedAt`.
8. User masuk ke onboarding aplikasi.

### 3.3 Credential hilang

Pengurus tidak dapat melihat password lama. Pengurus dapat memilih `Generate New Temporary Password` hanya jika user belum claimed.

Saat password baru dibuat:

- Hash password lama diganti.
- Password sementara lama langsung invalid.
- Sistem menghasilkan credential baru satu kali.
- Aktivitas dicatat dalam audit log.

Setelah user claimed, reset password memakai alur reset password biasa. Pengurus tidak boleh generate password onboarding baru untuk user claimed.

---

## 4. Aturan Generate Credential

### `userNumber`

- Dihasilkan sistem.
- Unik secara database.
- Tidak berubah setelah dibuat.
- Tidak memakai nama, email, atau nomor telepon user.
- Dipakai sebagai nomor anggota dan identifier login alternatif.
- Format integer numerik `yyyymmddnn` (10 digit), misalnya `2026102301`.
- `yyyy` adalah tahun pembuatan, `mm` bulan, `dd` tanggal, dan `nn` nomor urut pada tanggal tersebut (2 digit: `01` - `99`).
- Tidak memakai prefix huruf atau separator.
- Collision ditangani dengan retry dan unique constraint database.

### `username`

- Dibuat dari nama normalized ditambah angka random.
- Unik secara database.

### Password dummy

- Dibuat dengan cryptographically secure random generator.
- Format: `sekkha` + 5 angka random + `puggala`.
- Contoh: `sekkha48291puggala`.
- Minimal mengikuti policy password aplikasi.
- Tidak disimpan plaintext.
- Tidak ditulis ke log, analytics, URL, atau response setelah kesempatan pertama.
- Wajib diganti saat login pertama.

Password sementara tidak perlu expiry berbasis waktu karena dapat diganti oleh Pengurus atau invalid setelah user mengubah password. Rate limit login tetap wajib berlaku.

---

## 5. Data Model

Gunakan field `User` yang sudah ada atau disepakati pada PRD terkait:

| Field | Type | Constraint | Saat dibuat Pengurus |
| --- | --- | --- | --- |
| `id` | `String` | Primary key | Generated |
| `userNumber` | `String` | Required, unique, immutable | Nomor anggota hasil generate sistem |
| `username` | `String` | Required, unique | Nama normalized + angka random |
| `email` | `String?` | Nullable, unique jika diisi | Optional |
| `emailVerifiedAt` | `DateTime?` | Nullable | `null` |
| `password` | `String` | Required, hashed | Hash password sementara |
| `passwordChangedByUser` | `Boolean` | Default `false` | `false` |
| `isClaimed` | `Boolean` | Default `false` | `false` |
| `claimedAt` | `DateTime?` | Nullable | `null` |
| `role` | `Role` | Required | `umat` |
| `name` | `String` | Required | Input Pengurus |

`username` dan `userNumber` wajib disimpan sebagai field terpisah.

---

## 6. API Contract

### `POST /api/pengurus/people`

Auth: `requireAuth` + `requireRole("pengurus", "admin")`.

Request:

```json
{
  "name": "Budi Santoso",
  "email": null,
  "phone": "081234567890",
  "birth_date": "2008-04-15",
  "gender": "male",
  "school_id": "school_123",
  "class_grade": "11",
  "role": "umat"
}
```

Response pertama dan satu-satunya yang memuat password sementara:

```json
{
  "status": "success",
  "code": 201,
  "message": "People created",
  "data": {
    "id": "user_123",
    "user_number": "NV-2026-0012",
    "username": "budi48291",
    "temporary_password": "sekkha48291puggala",
    "is_claimed": false,
    "password_changed_by_user": false
  }
}
```

Jika UI tidak aman untuk menampilkan password, API harus mengembalikan credential melalui endpoint/session khusus yang hanya dapat diakses sekali oleh Pengurus pembuat record.

### `POST /api/pengurus/people/:id/regenerate-credentials`

Auth: Pengurus/Admin.

Rules:

- Hanya untuk user dengan `isClaimed: false`.
- Invalidate password lama.
- Return `userNumber` dan password baru satu kali.
- Catat actor, target user, waktu, dan alasan pada audit log.
- Return `409` jika user sudah claimed.

### `POST /api/auth/login`

Request:

```json
{
  "identifier": "budi48291",
  "password": "sekkha48291puggala"
}
```

Untuk user pre-provisioned, response harus menandai onboarding claim:

```json
{
  "status": "success",
  "code": 200,
  "data": {
    "requires_password_change": true,
    "requires_email_verification": true,
    "onboarding_token": "short-lived-token"
  }
}
```

Token onboarding hanya boleh mengakses change password, email verification, dan endpoint onboarding yang diperlukan.

---

## 7. Security & Privacy

- Terapkan unique constraint pada `userNumber` dan `username`.
- Hash password menggunakan password hashing library yang sudah dipakai aplikasi.
- Jangan gunakan password default yang sama.
- Jangan tampilkan password lagi setelah response pertama.
- Masking `userNumber` tidak diperlukan saat credential memang dibagikan kepada user, tetapi akses daftar People tetap role-protected.
- Rate limit login dan regenerate credentials.
- Audit log untuk create People dan regenerate credential.
- Jangan kirim password melalui email biasa secara otomatis.
- Hapus atau invalidate temporary credential setelah password baru berhasil disimpan.
- Jangan izinkan Pengurus mengklaim akun atas nama user.

---

## 8. Acceptance Criteria

- [ ] Pengurus dapat membuat People tanpa email.
- [ ] Sistem membuat `userNumber` unik.
- [ ] Sistem membuat `username` dari nama + angka random.
- [ ] Sistem membuat password dummy berformat `sekkha` + 5 angka + `puggala`.
- [ ] Database hanya menyimpan hash password.
- [ ] Response credential hanya menampilkan password satu kali.
- [ ] People langsung dapat dipakai untuk absensi.
- [ ] User dapat login dengan `username` dan password dummy.
- [ ] User wajib mengganti password.
- [ ] User wajib menyelesaikan verifikasi email untuk claim account.
- [ ] User claimed mempertahankan riwayat absensi, poin, dan badge.
- [ ] Pengurus tidak dapat regenerate credential untuk user claimed.
- [ ] Password lama invalid setelah regenerate.
- [ ] Collision `userNumber` tidak menghasilkan duplicate record.
- [ ] Audit log mencatat create People dan regenerate credential.

---

## 9. Next Steps

- [ ] Samakan endpoint dengan module `pengurus` yang berjalan.
- [ ] Pastikan generator `userNumber` dan `username` memakai unique constraint dan retry.
- [ ] Finalisasi generator password dummy.
- [ ] Implementasi response credential satu kali.
- [ ] Implementasi regenerate credential untuk unclaimed user.
- [ ] Tambah test create People, login pertama, regenerate, collision, dan claimed guard.
