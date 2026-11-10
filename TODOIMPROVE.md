# TODO & Improvement: Gamification Streak & Monthly Consistency Architecture

Dokumen ini mencatat analisis masalah, usulan solusi arsitektur, dan poin keputusan terkait perhitungan **Streak Kehadiran (`currentStreak`)**, **Bonus Bulanan (`streak_monthly_bonus`)**, serta **Klasifikasi Kegiatan Wajib vs Non-Wajib** di Sekkha Apps.

---

## 1. Latar Belakang & Identifikasi Masalah

Saat ini di Sekkha:
1. **Konflik "4-Week Streak" vs "Bulan Kalender"**:
   - Dalam 1 tahun kalender ada 52 minggu, dan terdapat 4 bulan yang memiliki 5 hari Minggu (misal Jan, Mar, Mei, Agt, Nov).
   - Jika bonus bulanan dihitung berbasis kelipatan 4 minggu rolling (`4, 8, 12, ... 52`), jemaat yang rajin hadir tiap minggu akan menerima **13x bonus dalam setahun** (*calendar drift*), dan tanggal pencairan bonus akan bergeser terus (bisa cair di pertengahan bulan atau dua kali di bulan yang sama).
2. **Ketiadaan Pembeda Kegiatan Wajib vs Non-Wajib (Opsional)**:
   - Di database saat ini (`prisma/schema.prisma`), seluruh kehadiran di event apapun (`Regular Puja`, `Chanting`, `Volunteer`, baksos, rapat pengurus) diperlakukan sama dalam menghitung streak mingguan.
   - Padahal secara operasional komunitas vihara:
     - **Kegiatan Wajib (Routine Fellowship)**: Misal kebaktian mingguan (*Regular Puja*).
     - **Kegiatan Non-Wajib / Opsional**: Misal *Chanting*, kelas meditasi tambahan, aksi kerelawanan (*Volunteer*), atau rapat kerja.
   - Jika jemaat tidak hadir di kegiatan non-wajib (misal tidak ikut baksos di hari Sabtu), jemaat **tidak seharusnya kehilangan streak** kebaktian minggunya.
   - Sebaliknya, jika jemaat hadir di beberapa kegiatan non-wajib, kegiatan tersebut seharusnya memberi poin aktivitas dan total kehadiran, bukan memompa angka streak mingguan secara tidak wajar.
3. **Minggu Libur Vihara (Holiday Weeks)**:
   - Jika vihara meliburkan kebaktian pada minggu tertentu (misal libur Imlek, Tahun Baru, atau jeda retreat), evaluasi kalender mingguan murni (`toWeekKey`) akan menganggap jemaat bolos dan mereset streak ke `0`, padahal vihara memang tidak menyelenggarakan acara.
4. **Stale Streak pada Anggota yang Absen**:
   - Di backend saat ini, pembaruan `UserStats.currentStreak` hanya dievaluasi bagi jemaat yang tercatat di daftar kehadiran event yang ditutup (`attendees`).
   - Jemaat yang **absen** tidak pernah di-reset streak-nya ke `0` saat event ditutup, sehingga angka streak lama tetap menggantung (*stale*) di Leaderboard sampai jemaat tersebut hadir di event berikutnya.

---

## 2. Usulan Solusi Arsitektur

### A. Klasifikasi Event Wajib vs Non-Wajib (`countsTowardStreak`)
- Menambahkan boolean flag `countsTowardStreak` pada:
  1. **Master Data `EventType`**: Nilai baku sistem.
     - `Regular Puja` ➔ `countsTowardStreak: true` (Wajib / Core Streak)
     - `Chanting` ➔ `countsTowardStreak: false` (Opsional / Poin Saja)
     - `Volunteer` ➔ `countsTowardStreak: false` (Opsional / Poin Saja)
  2. **Model `Event`**: Otomatis terisi dari `EventType` saat pembuatan event, namun dapat di-override secara fleksibel oleh Organizer/Admin per-sesi (misal ada Puja Khusus Hari Raya yang dijadikan wajib, atau kebaktian rutin yang diubah menjadi opsional).
- **Dampak Logika Bisnis**:
  - **Event Wajib**: Menentukan kelanjutan streak beruntun dan progres bonus bulanan. Absen = streak terputus.
  - **Event Non-Wajib**: Memberikan reward poin aktivitas (`pointReward`) dan menambah `totalAttendances`, namun **tidak menambah dan tidak memutus streak wajib**.
- **Penyelarasan UI**: Komponen [`EventDetailSheet.tsx`](sekkha-frontend/src/modules/events/internal/components/EventDetailSheet.tsx#L725) yang saat ini menampilkan teks statis *"Counts toward streak tier"* dapat terhubung secara dinamis dan jujur dengan badge:
  - `"Mandatory Streak"` vs `"Optional Activity (Streak Safe)"`.

---

### B. Event-Driven Streak vs Calendar-Week Streak
Mengubah paradigma perhitungan `currentStreak` dari berbasis "minggu kalender buta" menjadi **urutan kronologis Event Wajib yang terlaksana (`countsTowardStreak = true`, `status = 'closed'`)**:

```
[Puja Wajib 1 (Closed)] ➔ Hadir (Streak = 1)
[Volunteer (Non-Wajib)] ➔ Hadir (Dapat +80 Poin, Streak tetap 1)
[Puja Wajib 2 (Closed)] ➔ Hadir (Streak = 2)
[Minggu Libur Vihara]   ➔ Tidak ada event wajib closed (Streak tetap 2, TIDAK PUTUS)
[Puja Wajib 3 (Closed)] ➔ Absen (Streak RESET ke 0)
```

**Keuntungan**:
- Hari libur vihara atau event yang di-cancel tidak akan pernah merusak streak jemaat.
- Saat event wajib ditutup (`active` ➔ `closed`), sistem dapat mereset streak user yang absen secara batch, menyelesaikan bug *stale streak* di Leaderboard.

---

### C. Opsi Formula Bonus Bulanan (`streak_monthly_bonus`)

Bonus bulanan dikunci deterministik menggunakan `referenceId: streak_monthly:{userId}:{YYYY-MM}` di tabel `point_transactions`, sehingga dijamin **maksimal 1x per bulan kalender (12x setahun)**.

| Opsi | Mekanisme | Kelebihan | Kekurangan |
|---|---|---|---|
| **Opsi 1: Target Maksimal 4 Event Wajib / Bulan (Rekomendasi)** | Target = $\min(\text{totalEventWajibBulanIni}, 4)$.<br>• Bulan 4 Minggu ➔ Wajib 4/4.<br>• Bulan 5 Minggu ➔ Cukup 4/5 (ada 1x toleransi izin/sakit).<br>• Bulan Libur ($\le 3$ event) ➔ Wajib 100% dari event yang ada. | Langsung cair seketika di kehadiran wajib ke-4. Memberi toleransi manusiawi di bulan 5-minggu. Maksimal 12x setahun. | Memerlukan cron safety net di tgl 1 bulan berikutnya khusus untuk bulan yang total event-nya $< 4$. |
| **Opsi 2: Strict 100% Seluruh Event Wajib Bulan Tersebut** | Jemaat wajib hadir di **seluruh** event wajib berstatus `closed` di bulan tersebut (4/4 di bulan 4-minggu, 5/5 di bulan 5-minggu, 3/3 di bulan libur). | Sangat ketat dan presisi merefleksikan kehadiran penuh satu bulan tanpa celah. | Tidak ada toleransi di bulan 5-minggu. Reward tidak bisa cair instan di minggu ke-4; harus menunggu bulan berakhir (cron tgl 1 jam 00:05 WIB). |
| **Opsi 3: Rolling 4-Week Window (Status Saat Ini)** | Murni kelipatan 4 minggu berturut-turut (4, 8, 12, ...). Tidak terikat bulan kalender. | Sederhana secara kalkulasi algoritma tunggal. | Terjadi *calendar drift* (13x setahun). Tidak mencerminkan konsep "bonus bulanan" secara mentalitas kalender. |

---

### D. Perlakuan Hak Akses & Visibilitas (`visibility`)
Jika ada event wajib khusus internal (`visibility: "activist"` atau `"organizer"`, misal rapat wajib kepengurusan):
- Query event wajib yang dibebankan kepada seorang user **wajib memfilter visibilitas sesuai role pengguna**:
  - `member` ➔ Hanya memperhitungkan event wajib dengan `visibility IN ('all', 'member')`.
  - `activist` ➔ Memperhitungkan `visibility IN ('all', 'member', 'activist')`.
  - `organizer` / `admin` ➔ Memperhitungkan seluruh visibilitas.
- **Tujuan**: Memastikan anggota biasa (`member`) tidak pernah dikenakan sanksi patah streak atau gagal bonus bulanan akibat tidak hadir pada acara internal pengurus yang bahkan tidak dapat mereka lihat di kalender.

---

## 3. Poin Keputusan yang Perlu Dikonfirmasi (Open Decisions)

Sebelum memulai perubahan kode dan migrasi skema database, konfirmasikan hal-hal berikut:

1. **[ ] Perilaku Kehadiran di Event Non-Wajib**:
   - *Rekomendasi*: Hadir di event non-wajib (Chanting, Volunteer) hanya memberikan **Poin Aktivitas + Total Kehadiran**, **tidak menambah angka `currentStreak`** agar streak murni mencerminkan kebaktian rutin.
   - *Alternatif*: Hadir di event non-wajib juga menambah angka streak.

2. **[ ] Pilihan Aturan Bonus Bulanan (`streak_monthly_bonus`)**:
   - *Rekomendasi*: **Opsi 1** (Target maksimal 4 event wajib per bulan; instan cair di kehadiran ke-4; toleransi 1x di bulan 5-minggu).
   - *Alternatif*: **Opsi 2** (Strict 100% seluruh event wajib bulan tersebut; cair awal bulan berikutnya via cron).

3. **[ ] Persyaratan Minimal Usia Akun (*Join Date Guard*) untuk Bonus Bulanan**:
   - Jika ada jemaat baru mendaftar di minggu terakhir bulan (misal tgl 28 November) dan hadir di 1 event wajib terakhir:
     - Apakah jemaat baru tersebut berhak langsung mendapat bonus bulanan jika syarat bulan itu hanya menghitung event sejak akun dibuat?
     - *Rekomendasi*: Bonus bulanan hanya berlaku jika user sudah terdaftar sebelum/pada saat event wajib pertama di bulan tersebut diselenggarakan (atau minimal hadir $\ge 3$–$4$ event).

---

## 4. Rencana Kerja Implementasi (Implementation Roadmap)

Setelah keputusan di atas dikonfirmasi:

1. **Prisma Database Schema**:
   - Tambahkan `countsTowardStreak Boolean @default(true) @map("counts_toward_streak")` pada tabel `event_types`.
   - Tambahkan `countsTowardStreak Boolean @default(true) @map("counts_toward_streak")` pada tabel `events`.
   - Jalankan `bun run db:generate` & `bun run db:push` / migration.
2. **Backend Seed & Services**:
   - Update `prisma/seed.ts` master data Event Types (`regular-puja`: true; `chanting`: false; `volunteer`: false).
   - Perbarui `createEvent` & `updateEvent` di `sekkha-api/src/modules/events/services.ts`.
   - Perbarui logika penutupan event di `updateEventStatus(..., 'closed')` untuk mengevaluasi event-driven mandatory streak, batch reset streak user yang absen, dan penerbitan `streak_monthly:{userId}:{YYYY-MM}`.
   - Tambahkan / sesuaikan cron bulanan di `sekkha-api/src/modules/leaderboard/internal/cron.ts` atau modul events untuk rekonsiliasi akhir bulan.
3. **PRD Alignment**:
   - Perbarui `prd-sekkha/configure/pointRules.md`, `prd-sekkha/configure/masterdata/eventType.md`, `prd-sekkha/event/abensiEvent.md`, dan `prd-sekkha/api-contract.md`.
4. **Frontend UI Integration**:
   - Update form Create/Edit Event di `sekkha-frontend` untuk toggle `countsTowardStreak`.
   - Update `EventDetailSheet.tsx` agar label *"Counts toward streak"* menyesuaikan nilai riil event.
5. **Testing & Verification**:
   - Buat unit test komprehensif di `sekkha-api` mencakup: event wajib vs non-wajib, bulan 4 vs 5 minggu, hari libur vihara, dan batch reset saat absen.

