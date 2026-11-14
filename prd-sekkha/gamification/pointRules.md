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
| **1. Kehadiran Kebaktian / Acara** | **`Sesuai Event`** | **Master Data Event Types** | Dikelola 100% terpusat di Event Categories (`defaultPointReward`), dapat di-override per sesi event. |
| **2. Petugas Pelayanan (*Service Duty Bonus*)** | **`+30 Poin`** | Master Data `BadgeActivity` | Bonus untuk MC, Pemimpin Puja/Chanting, Musician, Operator, dll. dikelola terpusat di **Badge Activities**. |
| **3. Konsistensi 4 Minggu (4-Week Attendance Streak Appreciation)** | **`+50 Poin`** | `PointRule: streak_monthly_bonus` | Evaluasi dinamis via Gamification Streak Engine setiap kali jemaat mencapai kelipatan 4 minggu berturut-turut (rolling 4-week window), berlandaskan tanggal event (`eventDate` anchor). |
| **4. Penyambutan Akun Terklaim (*Claimed Welcome*)** | **`+50 Poin`** | `PointRule: first_attendance_bonus` | Bonus satu kali saat kehadiran perdana yang terverifikasi khusus bagi jemaat yang telah mengklaim akunnya (`isClaimed: true`). |

### 2.2 Batas Maksimal Perolehan Harian (*Daily Point Cap*) & Pengecualian Milestone
- **Maksimal 150 Poin per Hari per Pengguna (Khusus Poin Aktivitas Harian)**:
  Bahkan jika dalam satu hari ada beberapa sesi acara sekaligus di vihara, akumulasi poin aktivitas harian jemaat (presensi event dan tugas pelayanan kebaktian / `badge_activities`) dibatasi maksimal 150 poin per hari.
- **Tujuan**: Mencegah eksploitasi scan ganda dan lonjakan poin ekstrem dalam satu hari yang membuat kesenjangan antar jemaat menjadi tidak wajar.
- **Pengecualian Milestone Sistem (*System Milestone Immunity*)**:
  Poin apresiasi pencapaian sistem jangka panjang yaitu **`streak_monthly_bonus`** (konsistensi 4 minggu berturut-turut) dan **`first_attendance_bonus`** (bonus selamat datang satu kali) **dikecualikan dari batasan Daily Point Cap harian**.
  - *Justifikasi*: Poin milestone bukanlah spam harian melainkan hasil akumulasi komitmen mingguan selama berminggu-minggu. Poin ini telah dilindungi secara deterministik oleh `referenceId` unik di database (`streak_{N}w:{userId}:{weekKey}`), sehingga tidak dapat diduplikasi dan tidak akan hangus meskipun jemaat menghadiri acara bernilai poin tinggi di hari yang sama.

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
1. `streak_monthly_bonus` ➔ Dipicu secara otomatis oleh background engine evaluasi streak per 4 minggu.
2. `first_attendance_bonus` ➔ Dipicu satu kali seumur hidup khusus untuk pengguna yang sudah menyelesaikan klaim akun (`isClaimed: true`).
*(Catatan: Poin presensi event dikelola langsung secara dinamis per kategori di Event Types tanpa melalui hardcoded point rule).*

> [!IMPORTANT]
> **Prinsip Arsitektur (Anti-Dead-Data)**: Menambahkan entitas aturan poin baru dari antarmuka UI tanpa kode pemroses (*engine handler*) hanya akan menghasilkan data mati (*dead data*) yang tidak pernah dieksekusi oleh sistem. Oleh karena itu, master data Point Rules bersifat **Fixed / Predefined via Database Seed (`seed.ts`)**.

### 3.2 Pemisahan Tanggung Jawab (*Separation of Concerns*):
- Ingin membuat kegiatan ibadah / workshop / baksos baru yang berpoin? ➔ Buat di **[Master Data: Event Types](/configure/master/event-types)** dengan nilai `defaultPointReward`.
- Ingin membuat tugas kepengurusan / relawan baru yang berpoin? ➔ Buat di **[Master Data: Badge Activities](/configure/master/badge-activities)** dengan nilai `bonusPoints`.
- Ingin menyetel bobot poin atau mematikan aturan sistem? ➔ Lakukan di **Point Rules (Policy Tuning)**.

### 3.3 Ketahanan & Spesifikasi Gamification Streak Engine (`streak_monthly_bonus`)
Agar evaluasi streak adil, akurat, dan tahan terhadap kendala operasional vihara, Gamification Streak Engine memberlakukan 3 prinsip arsitektur:
1. **Event Date Anchor (Anti-Hangus akibat Keterlambatan Admin)**:
   Kalkulasi streak mingguan jemaat (`calculateWeeklyStreak`) dievaluasi relatif terhadap tanggal pelaksanaan acara yang sedang difinalisasi (`currentEvent.eventDate`), bukan waktu eksekusi server saat ini (`new Date()`). Dengan demikian, keterlambatan pengurus dalam menutup acara (misal baru sempat ditutup 1–2 minggu setelah acara selesai) tidak akan pernah mereset atau menghanguskan streak jemaat.
2. **Catch-Up Milestone (Anti-Bonus Terlewat saat Batch Close)**:
   Evaluasi kelipatan milestone menggunakan perbandingan interval:
   $$\lfloor \text{newStreak} / 4 \rfloor > \lfloor \text{prevStreak} / 4 \rfloor$$
   Jika penutupan beberapa acara secara serentak membuat streak jemaat melompat (misal dari 3 langsung ke 5), sistem tetap mendeteksi bahwa milestone minggu ke-4 telah tercapai dan secara otomatis mengkreditkan bonus 50 poin yang menjadi hak jemaat.
3. **Rolling 4-Week Window (Non-Calendar-Bound)**:
   Streak dihitung berbasis kelipatan 4 minggu kehadiran berturut-turut (minggu 4, 8, 12, dst.), bukan berdasarkan tanggal 1 s/d akhir bulan kalender. Jemaat yang hadir 2 minggu di akhir bulan A dan 2 minggu di awal bulan B tetap berhak mendapatkan bonus saat mencapai minggu ke-4.
4. **Auto-Close Event Kadaluarsa (Fallback Background Safety)**:
   Jika pengurus lupa mengklik *"Close & Finalize Event"* dan tanggal pelaksanaan acara sudah terlewat (`current date > event_date` dalam WIB), background cron job (`00:05 WIB`) serta lazy evaluation saat akses/scan secara otomatis memicu penutupan & finalisasi event untuk mengkreditkan poin dan memperbarui streak jemaat.

---

## 4. Data Model (PointRule & PointTransaction)

### 4.1 Skema Tabel `point_rules`
Tabel konfigurasi master data aturan poin:

```prisma
model PointRule {
  id          String   @id @default(cuid())
  code        String   @unique // e.g. "streak_monthly_bonus", "first_attendance_bonus"
  label       String   // e.g. "Monthly Attendance Consistency"
  points      Int      @default(50) // Dibatasi min 0, max 100
  description String?
  category    String   @default("streak") // "streak" | "general"
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
  - Section 1: *Core Gamification & Engagement Rules* (`streak_monthly_bonus` & `first_attendance_bonus`)
  *(Catatan: Poin presensi event dikelola terpusat di menu Event Types).*
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

## 8. User Stories

| ID | As a | I want to | So that |
| --- | --- | --- | --- |
| US-RULE-01 | Admin | View all predefined system Point Rules (`streak_monthly_bonus`, `first_attendance_bonus`) | I can understand current gamification policies and baseline rewards |
| US-RULE-02 | Admin | Tune rule point values within the strict anti-inflation range [0, 100] | I can adjust incentive balance without devaluing points |
| US-RULE-03 | Admin | Toggle rule activation status (`isActive`) | I can suspend or resume specific automatic point bonuses |
| US-RULE-04 | Member | Earn points under the 150 points/day strict cap regardless of how many events occur in one day | The community economy remains fair and prevents point hoarding |
| US-RULE-05 | Member | View my personal point transaction ledger with complete references | I have 100% transparency into how my points were earned and credited |
| US-RULE-06 | Organizer | Inspect point rules in read-only mode without ability to modify values | I can explain point policies to youth members while preserving system integrity |
| US-RULE-07 | Member | Earn my 4-week streak bonus reliably based on event dates regardless of daily point caps or delayed event closures | My long-term attendance commitment is appreciated fairly and never lost due to administrative delays |

---

## 9. Acceptance Criteria

| ID | Scenario | Expected result |
| --- | --- | --- |
| AC-RULE-01 | Admin opens `/configure/rules/points` | Predefined system rules display with current points, code, and active switch. Add/Delete actions are absent. |
| AC-RULE-02 | Admin updates rule points to value within [0, 100] | Point value updates in DB, returns HTTP 200, and immediately applies to subsequent transactions. |
| AC-RULE-03 | Admin updates rule points to value > 100 or < 0 | Form blocks submission with inline error; API responds with HTTP 400 Bad Request. |
| AC-RULE-04 | Admin toggles rule active state | Rule `isActive` flag updates; inactive rules do not award points upon event closure. |
| AC-RULE-05 | User earns points across multiple events in a single day | Daily total is capped at 150 points; any excess amount is truncated or rejected. |
| AC-RULE-06 | User scans QR code multiple times for the same event | Database unique constraint `[userId, eventId, type]` prevents duplicate credit (*Anti-Double Scan*). |
| AC-RULE-07 | First attendance bonus evaluated | Bonus (+50 Pts) awarded only if user account is claimed (`isClaimed: true`) and it is their 1st attendance. Immune to daily cap. |
| AC-RULE-08 | 4-Week streak bonus evaluated | Bonus (+50 Pts) awarded automatically whenever user reaches or passes multiples of 4 consecutive weekly attendances (rolling 4-week window). Evaluated against eventDate and immune to daily point cap. |
| AC-RULE-09 | Non-admin user attempts to PATCH `/api/configure/point-rules/:id` | Server returns HTTP 403 Forbidden. |
| AC-RULE-10 | Catch-up milestone evaluation | If batch event closures cause streak to jump past a milestone (e.g. from 3 to 5), the milestone reward (+50 Pts for 4 weeks) is still successfully credited without being skipped. |

---

## 10. Test Cases

| Test Case ID | Category | Scenario / Description | Preconditions | Test Steps | Expected Result | Type |
| --- | --- | --- | --- | --- | --- | --- |
| **TC-RULE-01** | Rule Listing | Retrieve all predefined system point rules | Logged in as `organizer` or `admin` | Send `GET /api/configure/point-rules`. | HTTP 200 envelope returning `streak_monthly_bonus` and `first_attendance_bonus`. | Positive |
| **TC-RULE-02** | Rule Tuning | Successfully tune point rule value within [0, 100] | Logged in as `admin` | Send `PATCH /api/configure/point-rules/:id` with `{ "points": 60, "label": "Regular Service Baseline" }`. | HTTP 200 envelope; `points` updated to 60; subsequent event closures credit 60 points. | Positive |
| **TC-RULE-03** | Boundary Validation | Submit point value > 100 (Anti-Inflation Guardrail) | Logged in as `admin` | Send `PATCH /api/configure/point-rules/:id` with `{ "points": 105 }`. | HTTP 400 Bad Request envelope with Zod validation error (`Points must be <= 100`). | Negative / Boundary |
| **TC-RULE-04** | Boundary Validation | Submit negative point value (< 0) | Logged in as `admin` | Send `PATCH /api/configure/point-rules/:id` with `{ "points": -10 }`. | HTTP 400 Bad Request envelope (`Points must be >= 0`). | Negative / Boundary |
| **TC-RULE-05** | Rule Toggling | Deactivate point rule via `isActive` toggle | Logged in as `admin` | Send `PATCH /api/configure/point-rules/:id` with `{ "isActive": false }`. | HTTP 200 envelope; `isActive` set to `false`; engine skips this rule on future triggers. | Positive |
| **TC-RULE-06** | Daily Point Cap | Enforce 150 points/day limit per user | User has already earned 120 points on current day | Finalize event attendance awarding 50 base points. | System credits only 30 points to hit 150 ceiling, or rejects excess according to cap policy. Total earned today <= 150. | Security / Rule Engine |
| **TC-RULE-07** | Anti-Double Scan | Prevent duplicate attendance point transactions | User already has finalized attendance for event X | Attempt to create second attendance point transaction for same `userId` and `eventId`. | Database blocks via `@@unique([userId, referenceId, type])`; returns error or ignores duplicate. User balance increases once. | Security / Integrity |
| **TC-RULE-08** | Welcome Bonus | Claimed vs Unclaimed user first attendance bonus | Event closed with 2 first-time attendees: User A (`isClaimed: true`), User B (`isClaimed: false`) | Finalize attendance via event closure. | User A receives base + 50 welcome bonus; User B receives only base attendance points. | Positive / Functional |
| **TC-RULE-09** | Fixed Policy Guard | Prevent creating arbitrary new point rules (Anti-Dead-Data) | Logged in as `admin` | Attempt `POST /api/configure/point-rules` with arbitrary rule data. | HTTP 404 Not Found or HTTP 405 Method Not Allowed (endpoint does not exist). | Security / Architectural |
| **TC-RULE-10** | Fixed Policy Guard | Prevent deleting fixed system point rules | Logged in as `admin` | Attempt `DELETE /api/configure/point-rules/:id`. | HTTP 404 Not Found or HTTP 405 Method Not Allowed (deletion endpoint disabled). | Security / Architectural |
| **TC-RULE-11** | RBAC Protection | Organizer attempts to tune point rules | Logged in as `organizer` | Send `PATCH /api/configure/point-rules/:id` with `{ "points": 50 }`. | HTTP 403 Forbidden envelope (`Access denied`). Points remain unchanged. | Security / RBAC |
| **TC-RULE-12** | Streak Anchor Resilience | Event closed with administrative delay (> 7 days) computes streak based on eventDate | User attended weeks 41-44; event closed in week 46 | Organizer closes week 44 event. | Streak calculates relative to week 44; returns 4 weeks streak and awards 4-week streak bonus (+50 Pts). Streak does not drop to 0. | Positive / Algorithm |
| **TC-RULE-13** | Milestone Daily Cap Immunity | 4-week streak bonus awarded when user has already reached 150 daily cap | User already earned 150 points today from high-value events | Finalize attendance achieving 4-week streak milestone. | Base attendance points capped at 0 remaining; system milestone bonus (+50 Pts) successfully credited in full with unique referenceId. Total points increase by 50. | Positive / Rule Engine |
