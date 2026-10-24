# PRD: Configure - Seasons (Manajemen Musim & Periode Leaderboard)

| Metadata | Detail |
| --- | --- |
| **Dokumen** | Product Requirement Document (PRD) |
| **Fitur** | Season Management (Konfigurasi Periode & Reset Leaderboard) |
| **Modul** | Configure (`/configure/rules/season`) & Leaderboard (`/leaderboard`) |
| **Versi** | 2.2.0 |
| **Status** | Approved / Synchronized with User Feedback |

---

## 1. Ringkasan & Filosofi Desain

Season dirancang murni sebagai **pengatur batas waktu (timeframe filtering) bagi Leaderboard**, dengan prinsip keadilan dan transparansi bagi seluruh umat:

### 🎯 Prinsip Utama Season:
1. **Reset Peringkat ke Nol di Setiap Season Baru**:
   - Di awal season baru, **semua orang memulai kompetisi dari 0 poin di leaderboard season tersebut**.
   - Ini memastikan umat baru yang bergabung di tengah tahun memiliki peluang yang sama dan tidak merasa mustahil mengejar peringkat teratas.
   - *Catatan Penting*: Akumulasi poin seumur hidup di profil umat (`UserStats.points`) tetap tersimpan sebagai rekaman historis dedikasi, namun poin kompetisi musiman dihitung murni dari transaksi dalam rentang season berjalan.
2. **Auto-Active Default Periods (Semester & Annual Selalu Aktif)**:
   - Sistem secara default dan otomatis menyediakan dua periode standar kalender:
     - **Semester**: Periode 6 bulan berjalan (Semester 1: 1 Jan - 30 Jun & Semester 2: 1 Jul - 31 Des).
     - **Annual**: Periode 1 tahun kalender berjalan (1 Jan - 31 Des).
   - Pengguna di Leaderboard dapat langsung beralih melihat klasemen Semester atau Annual tanpa konfigurasi manual berulang kali.
3. **Periode Khusus (Custom Season) & Aturan Urutan Tab di Leaderboard**:
   - Admin dapat mengaktifkan **maksimal 1 periode khusus (Custom Season)** pada satu waktu (misal: *Vassa 2026*, *Intensif Waisak*, atau *Youth Camp*).
   - Ketika periode khusus aktif, sistem memunculkan tab khusus tersebut di Leaderboard dengan urutan prioritas:
     $$\mathbf{[ \text{Custom (e.g. Vassa)} ] \quad [ \text{Semester} ] \quad [ \text{Annual} ]}$$
     *Periode khusus diletakkan di paling kiri karena merupakan event yang sedang hangat/berlangsung saat ini.*
   - Jika tidak ada periode khusus yang aktif, urutan tab kembali standar: `[ Semester ]  [ Annual ]`.
4. **Penghapusan Bonus Points & Penguatan Target Attendance**:
   - Field `bonus_points` **dihapus**, karena pembagian poin instan di akhir season merusak kompetisi dan menimbulkan inflasi poin.
   - Field `target_attendance` dipertahankan sebagai **Target Kolektif Komunitas (Gotong Royong)**.

---

## 2. Hak Akses & Peran (Role & Permissions)

| Aksi | `admin` | `organizer` | `activist` | `member` |
| --- | :---: | :---: | :---: | :---: |
| Mengakses menu `/configure/rules/season` | ✅ | ✅ (Read-only) | ❌ | ❌ |
| Membuat season baru (Preset / Custom) | ✅ | ❌ | ❌ | ❌ |
| Mengedit nama, tanggal, & target kehadiran | ✅ | ❌ | ❌ | ❌ |
| Mengaktifkan periode khusus (Maks 1 aktif) | ✅ | ❌ | ❌ | ❌ |
| Melihat tab periode & peringkat di Leaderboard | ✅ | ✅ | ✅ | ✅ |

---

## 3. Logika Bisnis & Mekanisme Periode Season

### 3.1 Struktur Periode & Tab Leaderboard

| Tipe Periode | Logika Rentang Waktu | Perilaku & Posisi di Tab Leaderboard |
| --- | --- | --- |
| **Periode Khusus (Custom)** *(Maksimal 1 Aktif)* | Rentang tanggal bebas (`start_date` s/d `end_date`) yang diinput Admin (misal: Vassa 3 bulan) | **Posisi Paling Kiri (Urutan 1)**: Muncul tab khusus berlabel nama season (e.g., `[ Vassa 2026 ]`). Hanya menghitung poin kegiatan selama periode khusus tersebut. |
| **Semester** *(Auto-Active)* | Semester 1: 1 Jan s/d 30 Jun<br>Semester 2: 1 Jul s/d 31 Des | **Posisi Tengah (Urutan 2)**: Menampilkan klasemen 6 bulan berjalan. Tiap pergantian semester, poin musiman di-reset mulai dari 0. |
| **Annual** *(Auto-Active)* | 1 Januari s/d 31 Desember | **Posisi Paling Kanan (Urutan 3)**: Menampilkan klasemen akumulasi 1 tahun kalender berjalan. Tiap 1 Januari jam 00:00 di-reset ke 0. |

> **Aturan Invarian**: Sistem membatasi hanya boleh ada **maksimal satu (1) custom season yang berstatus `is_active = true`**. Jika admin mengaktifkan custom season baru, custom season aktif sebelumnya otomatis diarsipkan/dinonaktifkan.

### 3.2 Reset Poin Musiman ke Nol
- Perhitungan poin untuk leaderboard season $S$ dihitung menggunakan query transaksi:
  $$\text{Seasonal Points} = \sum \text{amount} \quad \text{dimana } \text{created\_at} \in [\text{start\_date}_S, \text{end\_date}_S]$$
- Begitu tanggal berpindah ke season baru, query otomatis menghasilkan 0 bagi semua umat sampai mereka menghadiri kegiatan di season yang baru.
- Tidak ada umat yang "start duluan" membawa ratusan poin dari musim lalu ke dalam musim baru.

### 3.3 Target Attendance & Future Celebration UI Plan

#### A. Target Attendance (Community Collective Goal)
- **Fungsi**: Sebagai target gotong royong komunitas vihara (contoh: target 500 total kehadiran gabungan seluruh pemuda dalam satu season).
- **Indikator Progres**: Progress bar real-time `"380 / 500 Kehadiran Tercapai (76%)"`.

#### B. Plan Feature: Celebration UI (Post-Release Roadmap)
Ketika target kehadiran komunitas berhasil dicapai sebelum atau di akhir season:
1. **Confetti & Celebration Banner**: Animasi selebrasi otomatis muncul di dashboard utama dan leaderboard seluruh anggota.
2. **Community Milestone Unlocked Card**: Kartu perayaan khusus *"Target 500 Kehadiran Pemuda Tercapai! Terima kasih atas dedikasi dan kebersamaan seluruh pemuda Vihara Sekkha."*
3. **Event Offline / Syukuran Announcement**: Pengumuman agenda perayaan offline bersama (makan bersama / syukuran vihara).

---

## 4. Skema Data (Data Model)

Sesuai tabel `seasons` pada Prisma Schema (field `bonus_points` dihilangkan):

```prisma
model Season {
  id               String   @id @default(cuid())
  name             String   // e.g. "Semester 1 · 2026", "Vassa 2026"
  code             String?  @unique // e.g. "S2026-SEM1", "S2026-ANNUAL", "VASSA-2026"
  startDate        DateTime @map("start_date")
  endDate          DateTime @map("end_date")
  isActive         Boolean  @default(false) @map("is_active")
  targetAttendance Int      @default(500) @map("target_attendance") // Target kolektif komunitas
  description      String?
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  events Event[]

  @@index([isActive, updatedAt(sort: Desc), startDate(sort: Desc)])
  @@index([startDate(sort: Desc), endDate])
  @@map("seasons")
}
```

---

## 5. Antarmuka Pengguna (UI Requirements)

### 5.1 Halaman Konfigurasi (`/configure/rules/season`)
- **Tampilan Daftar Season**:
  - Menampilkan status periode bawaan (*Semester* & *Annual*) serta tabel riwayat *Custom Seasons*.
- **Form Tambah / Edit Custom Season (Admin)**:
  - Input: Nama Season Khusus (e.g. `Vassa 2026`).
  - Input: Tanggal Mulai & Tanggal Selesai.
  - Input: Target Kehadiran Kolektif (*Target Attendance*).
  - Toggle Switch: `Aktifkan sebagai Periode Khusus Berjalan` (otomatis menonaktifkan custom season lain).

### 5.2 Tampilan di Layar Leaderboard (`/leaderboard`)
- **Urutan Tab Navigasi Dinamis**:
  - **Skenario A (Ada Custom Season Aktif)**:
    ```text
    ┌────────────────┬────────────┬───────────┐
    │  Vassa 2026    │  Semester  │  Annual   │
    └────────────────┴────────────┴───────────┘
       (Custom)         (6 Bulan)    (1 Tahun)
    ```
  - **Skenario B (Tidak Ada Custom Season Aktif)**:
    ```text
    ┌────────────┬───────────┐
    │  Semester  │  Annual   │
    └────────────┴───────────┘
       (6 Bulan)    (1 Tahun)
    ```
- **Reset Indikator**:
  - Menampilkan countdown penutupan musim dan pengingat reset awal periode.

---

## 6. Spesifikasi API

Base Route: `/api/configure/seasons`

| Method | Endpoint | Akses | Keterangan |
| --- | --- | --- | --- |
| `GET` | `/api/configure/seasons` | `organizer`, `admin` | Mengambil seluruh daftar season yang dikonfigurasi |
| `POST` | `/api/configure/seasons` | `admin` | Membuat custom season baru |
| `PATCH` | `/api/configure/seasons/:id` | `admin` | Mengubah nama, target kehadiran, atau rentang tanggal |
| `PATCH` | `/api/configure/seasons/:id/activate` | `admin` | Mengaktifkan custom season (hanya 1 yang boleh aktif) |
| `DELETE` | `/api/configure/seasons/:id` | `admin` | Menghapus custom season (yang belum memiliki relasi event) |

---

## 7. Kriteria Penerimaan (Acceptance Criteria)

- [ ] **AC-01**: Poin musiman setiap pengguna dihitung murni dari transaksi dalam rentang tanggal season dan otomatis mulai dari 0 saat season berganti.
- [ ] **AC-02**: Leaderboard secara default memiliki tab `Semester` dan `Annual`.
- [ ] **AC-03**: Ketika ada custom season yang aktif, tab custom tersebut muncul di **posisi paling kiri**, diikuti oleh `Semester` dan `Annual`.
- [ ] **AC-04**: Sistem membatasi hanya **maksimal satu (1) custom season** yang berstatus aktif dalam waktu yang sama.
- [ ] **AC-05**: Field `bonus_points` tidak lagi digunakan dalam mekanisme kompetisi season.
- [ ] **AC-06**: Target kehadiran berfungsi sebagai sasaran gotong royong komunitas dengan rencana UI perayaan setelah target tercapai.
