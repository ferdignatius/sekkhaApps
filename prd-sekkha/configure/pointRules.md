# PRD: Configure - Point Rules (Aturan Poin & Pencegahan Inflasi)

| Metadata | Detail |
| --- | --- |
| **Dokumen** | Product Requirement Document (PRD) |
| **Fitur** | Point Rules, Anti-Inflation Economy & Gamification Engine |
| **Modul** | Configure (`/configure/rules/points`) & Gamification Engine |
| **Versi** | 2.2.0 |
| **Status** | Approved / Synchronized with Balanced Point Economy |

---

## 1. Pendahuluan & Filosofi: Menjaga Nilai Poin (*Point Scarcity & Respect*)

Poin di Sekkha **bukan sekadar angka kosmetik tanpa arti (*vanity metric*)**. Jika poin diobral terlalu mudah dan dalam jumlah besar, akan terjadi **inflasi poin (*point inflation*)** yang membuat poin kehilangan nilainya, terasa murahan, dan membuat anggota tidak lagi menghargainya.

### 💎 Prinsip Kelangkaan & Respek Poin (*Scarcity Mindset*):
1. **Earned, Not Given (Poin Diperoleh dari Usaha Riil)**:
   - Poin hanya bisa didapatkan melalui aksi nyata (kehadiran fisik, pelayanan kebaktian, dan kontribusi sosial).
   - Tidak ada poin gratis cuma-cuma tanpa kehadiran/kontribusi.
2. **Plafon Ketat (Strict Point Ceiling / Anti-Inflation)**:
   - Angka poin dijaga dalam skala yang terukur, terkendali, dan realistis (skala puluhan, bukan ribuan).
   - Pembatasan maksimal perolehan poin per hari (*daily point cap*) untuk mencegah eksploitasi dan spam.
3. **Akuntabilitas & Audit Trail (Buku Besar Transaksi)**:
   - Setiap poin yang masuk atau keluar tercatat di buku besar `point_transactions` dengan referensi event yang jelas, menjamin transparansi 100%.

---

## 2. Aturan Pencegahan Inflasi Poin (*Anti-Inflation Guardrails*)

Untuk menjaga nilai kelangkaan poin, sistem memberlakukan 5 aturan ketat (*hard constraints*):

### 2.1 Skala Nilai Poin yang Terkendali & Proporsional (Controlled Point Scale)
Poin tidak boleh diberikan dalam nominal ratusan ribu atau jutaan. Standar nilai poin dikunci pada rentang yang proporsional sesuai tingkat usaha (*effort*):

| Kategori Kegiatan | Nilai Poin | Rasio Terhadap Baseline | Catatan Operasional di Vihara |
|---|:---:|:---:|---|
| **1. Kehadiran Kebaktian Standar** | **`50 Poin`** | 100% (*Baseline*) | **Termasuk rangkaian Chanting/Paritta** yang menjadi satu kesatuan ritual kebaktian rutin. |
| **2. Sesi Meditasi / Workshop / Dhamma Class** | **`70 Poin`** | 140% | Sesi hening batin (Bhavana), workshop pemuda, atau Dhamma Class terpandu intensif. |
| **3. Petugas Pelayanan (*Service Duty Bonus*)** | **`+30 Poin`** | +60% (*Total: 80 Poin*) | Apresiasi untuk MC, Pemimpin Puja / Chanting, Organis, Operator Slide/Audio, dan Usher. |
| **4. Aksi Sosial Akbar / Baksos / Donor Darah** | **`100 Poin`** | 200% | Partisipasi kerja fisik dan kemanusiaan di luar kebaktian formal (misal baksos panti, donor darah). |

### 2.2 Batas Maksimal Perolehan Harian (*Daily Point Cap*)
- **Maksimal 150 Poin per Hari per Pengguna**:
  Bahkan jika dalam satu hari ada 3-4 sesi acara sekaligus di vihara, total perolehan poin seorang anggota dibatasi maksimal 150 poin per hari.
- **Tujuan**: Mencegah lonjakan poin ekstrem dalam satu hari yang membuat jarak antar anggota menjadi tidak adil.

### 2.3 Pencegahan Presensi Ganda (*Anti-Double Scan*)
- Database menerapkan *unique constraint*: `@@unique([userId, eventId])` pada tabel `attendances` dan `point_transactions`.
- Seorang anggota hanya dapat memperoleh poin presensi **satu kali per event**, tidak peduli berapa kali QR code dipindai.

### 2.4 Tidak Ada Poin Instan Musiman (*No Season Dump Bonus*)
- Tidak ada pembagian poin instan massal di akhir musim (*season dump*).
- Kemenangan season dihargai dengan **Peringkat Kehormatan (Badge of Honor / Hall of Fame)**, bukan dengan menyuntikkan ribuan poin tambahan yang memperparah kesenjangan dengan anggota baru.

### 2.5 Batas Maksimal Nilai Master Rule di Admin
- Pada form admin `/configure/rules/points`, nilai poin dibatasi secara ketat oleh validasi schema:
  $$\text{Nilai Poin per Rule} \in [0, 100]$$
  Admin tidak dapat memasukkan angka sembarangan (maksimal 100 poin per rule, setara dengan bobot kegiatan tertinggi seperti baksos akbar) yang dapat merusak ekonomi poin sistem.

---

## 3. Kategori Sumber Perolehan Poin

Aturan poin diklasifikasikan ke dalam 4 kategori terstruktur:

### 3.1 Presensi Kegiatan (Attendance Points)
Poin dasar yang diperoleh saat melakukan scan QR presensi di kegiatan vihara:
- **Kebaktian Rutin Mingguan (`attendance_rutin`)**: `50 Poin` (sudah mencakup ritual pembacaan Paritta / Chanting bersama).
- **Sesi Meditasi / Dhamma Class Khusus (`attendance_special`)**: `70 Poin` (khusus sesi latihan meditasi batin terpandu atau pendalaman materi dhamma).

### 3.2 Pelayanan & Petugas Kebaktian (Service Duty Bonus)
Mendorong pemuda untuk aktif mengambil tanggung jawab pelayanan vihara dengan reward proporsional:
- **Petugas Kebaktian (`duty_service_bonus`)**: `+30 Poin` (sehingga total yang diterima petugas adalah $50 + 30 =$ `80 Poin`). Diberikan kepada MC, Pemimpin Puja/Chanting, Organis, Operator Slide/Audio, dan Usher yang bertugas.

### 3.3 Konsistensi Kehadiran (Streak Appreciation)
Mengapresiasi konsistensi kehadiran pemuda secara bulanan tanpa meledakkan jumlah poin:
- **Konsistensi Bulanan (`streak_monthly_bonus`)**: `+50 Poin` (flat bonus, tidak berlipat ganda) jika berhasil menjaga *streak* kehadiran secara konsisten selama 1 bulan penuh (4 minggu berturut-turut). *Hanya ada reward untuk konsistensi bulanan ini guna menjaga eksklusivitas reward konsistensi.*

### 3.4 Penyambutan Umat Baru (Welcome First Visit)
- **First-Time Attendee (`first_attendance_bonus`)**: `+50 Poin` untuk kunjungan pertama kali seumur hidup, memberikan apresiasi awal yang bersahabat tanpa merusak keseimbangan klasemen.

---

## 4. Data Model (PointRule & PointTransaction)

### 4.1 Skema Tabel `point_rules`
Tabel konfigurasi master data aturan poin:

```prisma
model PointRule {
  id          String   @id @default(cuid())
  code        String   @unique // e.g. "attendance_rutin", "duty_service_bonus"
  label       String   // e.g. "Kebaktian Rutin Mingguan"
  points      Int      @default(50) // Dibatasi min 0, max 100
  description String?
  category    String   @default("attendance") // "attendance" | "streak" | "service" | "general"
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  transactions PointTransaction[]

  @@map("point_rules")
}
```

### 4.2 Skema Tabel `point_transactions`
Buku besar (*ledger*) yang mencatat setiap riwayat pertambahan/pengurangan poin:

```prisma
model PointTransaction {
  id          String               @id @default(cuid())
  userId      String               @map("user_id")
  ruleId      String?              @map("rule_id")
  amount      Int                  // Nilai transaksi (+50, +30, dll)
  type        PointTransactionType @default(attendance) // attendance, manual, reward, system
  description String?
  referenceId String?              @map("reference_id") // eventId atau attendanceId
  createdAt   DateTime             @default(now()) @map("created_at")

  user User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  rule PointRule? @relation(fields: [ruleId], references: [id], onDelete: SetNull)

  @@unique([userId, referenceId, type])
  @@index([userId, createdAt(sort: Desc)])
  @@map("point_transactions")
}
```

---

## 5. Hak Akses (Role & Permissions)

| Aksi | `admin` | `organizer` | `activist` | `member` |
| --- | :---: | :---: | :---: | :---: |
| Melihat daftar Point Rules | ✅ | ✅ (Read-only) | ❌ | ❌ |
| Mengubah nilai poin pada rule (Maks 100) | ✅ | ❌ | ❌ | ❌ |
| Mengaktifkan / Menonaktifkan rule | ✅ | ❌ | ❌ | ❌ |
| Melihat riwayat poin pribadi (*Points History*) | ✅ | ✅ | ✅ | ✅ |
| Penyesuaian poin manual (Koreksi kesalahan) | ✅ | ❌ | ❌ | ❌ |

---

## 6. UI Requirements (`/configure/rules/points`)

- **Tampilan Terkelompok per Kategori**:
  - Section 1: *Attendance Rules* (Poin Kehadiran)
  - Section 2: *Service Duty Rules* (Poin Petugas & Pelayanan)
  - Section 3: *Streak & Engagement Rules* (Poin Konsistensi Bulanan & Sambutan)
- **Kartu Nilai Poin**:
  - Menampilkan nama aturan, kode teknis semantik, besaran poin saat ini (e.g. `+50 Poin`), badge kategori, dan status aktif.
  - Quick Edit Modal untuk Admin dengan validasi rentang nilai angka 0 s/d 100.
- **Pesan Panduan Ekonomi Poin bagi Admin**:
  - Banner informasi di atas halaman: *"Menjaga nilai poin tetap seimbang sangat penting. Batas maksimal nilai per aturan adalah 100 poin agar poin tetap bernilai tinggi dan dihormati oleh seluruh umat."*

---

## 7. Spesifikasi API

Base URL: `/api/configure`

| Method | Endpoint | Akses | Keterangan |
| --- | --- | --- | --- |
| `GET` | `/api/configure/point-rules` | `organizer`, `admin` | Mengambil seluruh daftar aturan poin |
| `PATCH` | `/api/configure/point-rules/:code` | `admin` | Memperbarui nilai poin (Zod validasi: min 0, max 100) |
| `GET` | `/api/users/me/points-history` | All Roles | Mengambil riwayat transaksi poin transparan pengguna |

---

## 8. Kriteria Penerimaan (Acceptance Criteria)

- [ ] **AC-01**: Sesi kebaktian standar bernilai 50 poin dan sudah mencakup rangkaian ritual chanting/paritta.
- [ ] **AC-02**: Bonus petugas kebaktian (*Service Duty*) bernilai +30 poin (sehingga total kehadiran + tugas adalah 80 poin).
- [ ] **AC-03**: Sesi meditasi atau Dhamma Class terpandu bernilai 70 poin.
- [ ] **AC-04**: Aksi sosial kemanusiaan bernilai 100 poin sebagai batas capaian kegiatan tertinggi.
- [ ] **AC-05**: Konsistensi kehadiran hanya memberikan reward untuk streak bulanan (`+50 Poin` untuk 4 minggu berturut-turut tanpa bonus mingguan).
- [ ] **AC-06**: Sistem memberlakukan batas maksimal akumulasi harian (Daily Cap 150 poin) per user.
- [ ] **AC-07**: Form edit point rules di admin membatasi nilai poin maksimal sebesar 100 poin (`[0, 100]`) untuk mencegah inflasi angka.
- [ ] **AC-08**: Scanning QR presensi lebih dari satu kali pada event yang sama tidak menghasilkan penambahan poin ganda.
- [ ] **AC-09**: Setiap penambahan poin tercatat transparan di tabel `point_transactions` dengan timestamp dan referensi kegiatan.
