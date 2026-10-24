# PRD: Home Dashboard — Sekkha Apps

| Metadata | Detail |
| --- | --- |
| **Dokumen** | Product Requirement Document (PRD) |
| **Fitur** | Personal Home Dashboard (Ringkasan Komunitas, Kartu Anggota, Streak, & Event Terdekat) |
| **Domain** | `home` / `dashboard` |
| **Aplikasi** | Sekkha Apps (Frontend & Backend) |
| **Versi** | 2.0.0 (Unified & Gamification-Sanitized) |
| **Status** | Approved / Ready for Development |
| **Referensi Terkait** | `prd-sekkha/event/event.md`, `prd-sekkha/configure/seasons.md`, `prd-sekkha/general/users/profile-and-settings.md` |

---

## 1. Ringkasan Eksekutif & Tujuan

Dashboard Home (`/home`) adalah beranda utama yang pertama kali dilihat pengguna setelah masuk ke Sekkha Apps. Berfungsi sebagai **pusat keterlibatan personal jemaat** (*personal community hub*):
1. **Penyambutan Hangat & Kartu Anggota Digital**: Salam waktu dinamis (*"Good morning/afternoon/evening, [Name]"*), kartu digital ringkas yang menampilkan `userNumber` dan tombol cepat membuka QR Presensi.
2. **Keterlibatan Konsistensi (Weekly Streak)**: Menampilkan jumlah minggu berturut-turut jemaat hadir di vihara untuk menjaga komitmen spiritual pemuda.
3. **Event Terdekat (Upcoming Event)**: Menyoroti kegiatan kebaktian, meditasi, atau bakti sosial terdekat dengan countdown timer dan detail lokasi.
4. **Progres Musim Aktif (Season Progress)**: Menampilkan pencapaian poin jemaat dalam musim kompetisi sehat yang sedang berjalan (mis. Vassa / Semester) serta sisa hari musim.
5. **Kutipan Dhamma Harian (Daily Dhamma Wisdom)**: Kutipan kebijaksanaan harian untuk menginspirasi hari anggota.
6. **Eliminasi Gamifikasi Artifisial**: Fitur level numerik (Level 1-99) dan badge koleksi telah **dieliminasi total** sesuai filosofi Buddhis kesederhanaan dan nilai guna nyata.

---

## 2. Target Pengguna & Role

| Role | Tampilan & Akses Khusus di Home Dashboard |
| --- | --- |
| `member` | Dashboard personal jemaat: Kartu QR anggota, streak mingguan, event terdekat, musim aktif, dan kutipan Dhamma. |
| `activist` | Sama dengan member + badge status aktivis. |
| `organizer` | Sama dengan jemaat + **Quick Operator Card**: Pintasan langsung ke live QR scanner event aktif (`/events/scan`) dan ringkasan jemaat hadir hari ini. |
| `admin` | Sama dengan organizer. |

---

## 3. Komponen Antarmuka & Layout (Clay Design System)

Mengadopsi layout grid responsif 12 kolom (`max-w-7xl mx-auto`) dengan estetika Clay hangat:

```
┌────────────────────────────────────────────────────────┐
│  1. Hero Welcome & Digital Member Quick ID Card        │
│     (Salam, QR Presensi, Streak Counter, Poin Musim)   │
└────────────────────────────────────────────────────────┘
┌─────────────────────────────────┬──────────────────────┐
│  2. Next Upcoming Event Card    │ 3. Active Season Card│
│     (Judul, Waktu, Lokasi, CTA) │    (Progress Bar)    │
├─────────────────────────────────┴──────────────────────┤
│  4. Recent Activity & Points History Ledger            │
│     (Catatan presensi & poin masuk terakhir)           │
├────────────────────────────────────────────────────────┤
│  5. Daily Dhamma Quote Widget                          │
└────────────────────────────────────────────────────────┘
```

### 3.1. Hero Welcome & Digital Member Quick Card
* **Salam Waktu Dinamis (Local Time Greeting)**:
  * Pagi (04:00 - 11:59): *"Good morning, [Name]"*
  * Siang (12:00 - 16:59): *"Good afternoon, [Name]"*
  * Malam (17:00 - 03:59): *"Good evening, [Name]"*
* **Statistik Cepat**:
  * **Current Streak**: Jumlah minggu berturut-turut hadir (`🔥 N Weeks Streak`).
  * **Season Points**: Poin yang diperoleh dalam musim yang sedang aktif.
  * **Member ID**: Nomor anggota resmi `userNumber` (mis. `2026102401`).
* **Tombol Cepat QR Presensi**: Tombol *"Show Member QR"* yang langsung menampilkan modal QR code statis layar penuh dengan kecerahan tinggi untuk mempermudah pemindaian oleh petugas pintu masuk vihara.

### 3.2. Next Upcoming Event Card
* Menampilkan event terdekat yang berstatus `scheduled` atau `active`:
  * Badge Status: *"Live Today"* (hijau berkedip jika hari ini) atau *"Upcoming"*.
  * Tag Kategori Event dari master data: Routine Puja, Chanting, Meditation, dll.
  * Countdown Waktu: *"Starts in 2 hours"* atau *"Tomorrow at 09:00 AM"*.
  * Nama Lokasi: Dhammasala Utama / Vihara Sekkha.
  * CTA Button: *"View Event Details"*, mengarahkan ke `/events?eventId=:id`.

### 3.3. Active Season Progress Card
* Terintegrasi dengan modul Season aktif (`prd-sekkha/configure/seasons.md`):
  * Nama Musim Aktif: e.g. *"Vassa Season 2026"*.
  * Sisa Waktu: e.g. *"42 Days Remaining"*.
  * Progress Bar: Poin jemaat terhadap target komunitas atau pencapaian semester.
  * CTA: *"View Leaderboard"*, mengarahkan ke tab musim di `/leaderboard`.

### 3.4. Operator Shortcut Banner (Khusus Organizer & Admin)
* Ditampilkan hanya jika ada event berstatus `active` saat ini:
  * Banner Amber Emas: *"Live Attendance Session Active: [Judul Event]"*.
  * Tombol CTA: *"Launch Camera QR Scanner"*, langsung membuka `/events/scan?eventId=:id`.

---

## 4. Spesifikasi Teknis & API Contract

Dashboard Home menggabungkan data dari endpoint efisien tanpa overhead query:
1. `GET /api/users/me`: Profil, streak, total points, dan nomor anggota.
2. `GET /api/events?limit=1&upcoming=true`: Event terdekat yang relevan.
3. `GET /api/configure/seasons?active=true`: Metadata musim aktif dan rentang tanggal.
4. `GET /api/users/me/points-history?limit=3`: 3 riwayat perolehan poin kehadiran terakhir.

---

## 5. UI/UX & Non-Functional Requirements

1. **Aesthetic Tokens**: Clay Card `rounded-[24px]`, border `#e5e5e5`, background warm canvas `#fffaf0`, ambient glow backdrop mesh.
2. **Skeleton Shimmer**: Tidak ada spinner layar penuh. Setiap kartu memiliki skeleton loader mandiri saat inisialisasi data.
3. **100% Bahasa Inggris**: Seluruh label dan dialog menggunakan Bahasa Inggris.
