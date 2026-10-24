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

| Kategori Kegiatan | Nilai Poin | Dikelola Di | Catatan Operasional di Vihara |
|---|:---:|:---:|---|
| **1. Kehadiran Kebaktian Standar** | **`50 Poin`** | `PointRule: attendance_rutin` / `EventType` | Baseline kehadiran mingguan jemaat. Nilai spesifik per jenis kegiatan dapat disesuaikan di **Master Data Event Types**. |
| **2. Petugas Pelayanan (*Service Duty Bonus*)** | **`+30 Poin`** | Master Data `BadgeActivity` | Bonus untuk MC, Pemimpin Puja/Chanting, Musician, Operator, dll. dikelola terpusat di **Badge Activities**. |
| **3. Konsistensi Bulanan (Streak Appreciation)** | **`+50 Poin`** | `PointRule: streak_monthly_bonus` | Evaluasi otomatis via Gamification Streak Engine setiap 4 minggu kehadiran berturut-turut. |
| **4. Penyambutan Akun Terklaim (*Claimed Welcome*)** | **`+50 Poin`** | `PointRule: first_attendance_bonus` | Bonus satu kali saat kehadiran perdana yang terverifikasi khusus bagi jemaat yang telah mengklaim akunnya (`isClaimed: true`). |

### 2.2 Batas Maksimal Perolehan Harian (*Daily Point Cap*)
- **Maksimal 150 Poin per Hari per Pengguna**:
  Bahkan jika dalam satu hari ada beberapa sesi acara sekaligus di vihara, total perolehan poin seorang anggota dibatasi maksimal 150 poin per hari.
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

## 3. Filosofi Aturan Tetap Mesin (*Fixed System Engine Policies*)

### 3.1 Mengapa Point Rules Tidak Memiliki Fitur "Add New" & "Delete"?
Setiap aturan poin di Sekkha terhubung erat dengan **logika trigger eksekusi khusus (*business logic trigger*)** di backend:
1. `attendance_rutin` ➔ Dipicu saat scanning QR absensi dan penutupan event kebaktian (`events/services.ts`).
2. `streak_monthly_bonus` ➔ Dipicu secara otomatis oleh background engine evaluasi streak per 4 minggu.
3. `first_attendance_bonus` ➔ Dipicu satu kali seumur hidup khusus untuk pengguna yang sudah menyelesaikan klaim akun (`isClaimed: true`).

> [!IMPORTANT]
> **Prinsip Arsitektur (Anti-Dead-Data)**: Menambahkan entitas aturan poin baru dari antarmuka UI tanpa kode pemroses (*engine handler*) hanya akan menghasilkan data mati (*dead data*) yang tidak pernah dieksekusi oleh sistem. Oleh karena itu, master data Point Rules bersifat **Fixed / Predefined via Database Seed (`seed.ts`)**.

### 3.2 Pemisahan Tanggung Jawab (*Separation of Concerns*):
- Ingin membuat kegiatan ibadah / workshop / baksos baru yang berpoin? ➔ Buat di **[Master Data: Event Types](/configure/master/event-types)** dengan nilai `defaultPointReward`.
- Ingin membuat tugas kepengurusan / relawan baru yang berpoin? ➔ Buat di **[Master Data: Badge Activities](/configure/master/badge-activities)** dengan nilai `bonusPoints`.
- Ingin menyetel bobot poin atau mematikan aturan sistem? ➔ Lakukan di **Point Rules (Policy Tuning)**.

---

## 4. Data Model (PointRule & PointTransaction)

### 4.1 Skema Tabel `point_rules`
Tabel konfigurasi master data aturan poin:

```prisma
model PointRule {
  id          String   @id @default(cuid())
  code        String   @unique // e.g. "attendance_rutin", "streak_monthly_bonus", "first_attendance_bonus"
  label       String   // e.g. "Weekly Regular Puja"
  points      Int      @default(50) // Dibatasi min 0, max 100
  description String?
  category    String   @default("attendance") // "attendance" | "streak" | "general"
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

| Aksi | `admin` | `pengurus` | `aktivis` | `umat` |
| --- | :---: | :---: | :---: | :---: |
| Melihat daftar Point Rules | ✅ | ✅ (Read-only) | ❌ | ❌ |
| Melakukan Tuning Poin (Edit bobot 0–100, label, deskripsi) | ✅ | ❌ | ❌ | ❌ |
| Mengaktifkan / Menonaktifkan status rule (`isActive`) | ✅ | ❌ | ❌ | ❌ |
| Menambah Rule Baru (*Create New*) | ❌ (Disabled/YAGNI) | ❌ | ❌ | ❌ |
| Menghapus Rule (*Delete*) | ❌ (Protected/Fixed) | ❌ | ❌ | ❌ |
| Melihat riwayat poin pribadi (*Points History*) | ✅ | ✅ | ✅ | ✅ |

---

## 6. UI Requirements (`/configure/rules/points`)

- **Tampilan Terkelompok per Kategori Sistem**:
  - Section 1: *Global Attendance Rules* (`attendance_rutin` - Baseline kehadiran)
  - Section 2: *Streak & Member Engagement Rules* (`streak_monthly_bonus` & `first_attendance_bonus`)
- **Kartu Nilai Poin & Parameter Tuning**:
  - Menampilkan nama aturan, kode teknis semantik, besaran poin saat ini (e.g. `+50 Pts`), badge kategori, dan toggle status aktif.
  - Tombol **Edit Policy** untuk Admin guna membuka modal tuning dengan validasi rentang nilai angka `0` s/d `100`.
- **Banner Panduan Ekonomi Poin bagi Admin**:
  - Memberikan edukasi terkait batas maksimal plafon transaksi 100 poin dan batas harian 150 poin, serta informasi navigasi cepat ke *Event Types* dan *Badge Activities* jika ingin menambahkan item kegiatan baru.

---

## 7. Spesifikasi API

Base URL: `/api/configure`

| Method | Endpoint | Akses | Keterangan |
| --- | --- | --- | --- |
| `GET` | `/api/configure/point-rules` | `pengurus`, `admin` | Mengambil seluruh daftar aturan poin |
| `GET` | `/api/configure/point-rules/:id` | `pengurus`, `admin` | Mengambil detail aturan poin beserta riwayat pemakaian |
| `PATCH` | `/api/configure/point-rules/:id` | `admin` | Melakukan tuning parameter rule (Zod validasi: points `[0, 100]`, `label`, `description`, `isActive`) |
| `GET` | `/api/users/me/points-history` | All Roles | Mengambil riwayat audit transaksi poin pengguna |

---

## 8. Kriteria Penerimaan (Acceptance Criteria)

- [ ] **AC-01**: Master rules disediakan melalui `seed.ts` dan tidak menyediakan tombol Add New / Delete di UI maupun endpoint create/delete publik.
- [ ] **AC-02**: Admin dapat mengatur (tune) besaran poin per rule dengan validasi batas rentang 0 s/d 100 poin.
- [ ] **AC-03**: Admin dapat menonaktifkan atau mengaktifkan rule sewaktu-waktu (`isActive`).
- [ ] **AC-04**: Sesi kebaktian standar bernilai 50 poin sebagai baseline universal jika event tidak menentukan poin khusus.
- [ ] **AC-05**: Konsistensi kehadiran memberikan reward untuk streak bulanan (`+50 Pts` per 4 minggu berturut-turut).
- [ ] **AC-06**: Penyambutan jemaat baru (`+50 Pts`) hanya berlaku bagi anggota yang akunnya telah diklaim (`isClaimed: true`).
- [ ] **AC-07**: Scanning QR presensi lebih dari satu kali pada event yang sama tidak menghasilkan penambahan poin ganda (*Anti-Double Scan*).
- [ ] **AC-08**: Setiap penambahan poin tercatat transparan di tabel `point_transactions` dengan timestamp dan referensi kegiatan.
