# PRD: Pengurus Analytics, Community Insights, & Pastoral Care Early Warning System — Sekkha Apps

| Metadata | Detail |
| --- | --- |
| **Dokumen** | Product Requirement Document (PRD) |
| **Fitur** | Community Insights, Contributor Seva Leaderboard, & Sistem Peringatan Dini Pastoral Care (Recency Alerts) |
| **Domain** | `pengurus` / `analytics` / `pastoral` |
| **Aplikasi** | Sekkha Apps (Frontend & Backend) |
| **Versi** | 2.0.0 (Unified & Standardized) |
| **Status** | Approved / Ready for Development |
| **Referensi Terkait** | `prd-sekkha/event/event.md`, `prd-sekkha/configure/masterdata/badgeActivity.md`, `prd-sekkha/peoples/people-management.md` |

---

## 1. Ringkasan Eksekutif & Latar Belakang Masalah

Keberlangsungan komunitas pemuda vihara bergantung pada **keterlibatan aktif jemaat** dan **kepekaan pengurus** terhadap anggota yang mulai jarang hadir. Seringkali pengurus baru menyadari seorang jemaat menghilang setelah berbulan-bulan tidak datang (*silent churn*).

Untuk mengatasi hal tersebut, modul Pengurus menyediakan 3 pilar analitik berbasis data:
1. **Community Insights (`/insight`)**: Dashboard analitik makro untuk memantau vitalitas komunitas, retensi jemaat, tren kehadiran mingguan/bulanan, perbandingan periode (YoY / MoM), serta distribusi kehadiran berdasarkan kategori event dan institusi sekolah.
2. **Contributor Insights (`/pengurus-contribution`)**: Papan apresiasi dan metrik kontribusi pelayanan ibadah (*seva*). Melacak keaktifan petugas kebaktian (MC, Puja Leader, Musisi) yang terintegrasi dengan master data `badge_activities`.
3. **Pastoral Care Early Warning System (`/recency-alerts`)**: Sistem peringatan dini berbasis algoritma statistik cerdas yang mendeteksi penurunan frekuensi kehadiran jemaat (*recency decay*) sebelum mereka benar-benar hilang dari komunitas, dilengkapi dengan alur tindak lanjut pastoral (*outreach care*).

---

## 2. Definisi Role & Matriks Hak Akses

Fitur analitik dan pastoral care ini memuat data agregat komunitas dan status perhatian jemaat yang **bersifat internal pengurus**.

| Role | Akses Community Insights (`/insight`) | Akses Contributor Insights (`/pengurus-contribution`) | Akses Recency Alerts & Catatan Pastoral (`/recency-alerts`) |
| --- | :---: | :---: | :---: |
| `member` | x (403 Forbidden) | x (403 Forbidden) | x (403 Forbidden) |
| `activist` | x (403 Forbidden) | x (403 Forbidden) | x (403 Forbidden) |
| `organizer` | v (Full Access) | v (Full Access) | v (Full Access & Input Pastoral Notes) |
| `admin` | v (Full Access) | v (Full Access) | v (Full Access & Input Pastoral Notes) |

> **Perlindungan Privasi**: Request dari `member` atau `activist` ke seluruh rute `/insight`, `/recency-alerts`, dan `/pengurus-contribution` otomatis ditolak oleh server dengan **`403 Forbidden`**.

---

## 3. Spesifikasi Fitur Utama

### 3.1. Community Insights (`/insight`)

Dashboard visual komprehensif untuk pengurus memantau denyut keaktifan vihara:
* **Kartu Metrik Vitalitas Utama (Hero Stat Cards)**:
  * *Active Members*: Jumlah anggota unik yang hadir minimal 1 kali dalam 30 hari terakhir (dengan indikator % perubahan dibanding bulan lalu).
  * *Average Attendance per Event*: Rata-rata peserta yang hadir pada setiap sesi kegiatan ibadah.
  * *Community Retention Rate*: Persentase jemaat yang konsisten hadir kembali bulan ini.
  * *Total Seva Duty Hours*: Total jam dan sesi tugas pelayanan yang diselesaikan oleh relawan.
* **Filter Analisis Multidimensi**:
  * Unit Waktu: *Monthly* atau *Yearly*.
  * Pembanding Periode (*Comparison Mode*): Perbandingan langsung dengan bulan lalu atau tahun lalu.
  * Filter Kategori Event: Berdasarkan master data `event_types` (Routine Puja, Meditation, Social Volunteer, dll.).
  * Filter Demografi Almamater: Berdasarkan master data `schools` (SMA/SMK, SMP, Universitas, Umum).
* **Visualisasi Grafik Responsif (Clay Chart Canvas)**:
  * Grafik Tren Kehadiran Waktu Nyata (*Line/Bar Chart*).
  * Distribusi Kehadiran menurut Tipe Event (*Donut Chart*).
  * Komposisi Jemaat Berdasarkan Sekolah (*Stacked Bar Chart*).

---

### 3.2. Contributor Insights (`/pengurus-contribution`)

Modul apresiasi dan pelacakan beban tugas pelayanan jemaat aktif (*Seva Volunteers*):
* **Papan Kepemimpinan Pelayanan (Seva Leadership Board)**:
  * Menampilkan peringkat relawan jemaat yang paling aktif bertugas melayani ibadah dalam musim aktif (Seasons).
  * Data terintegrasi langsung dengan relasi `badge_activities` pada absensi event.
* **Rincian Peran Pelayanan (*Duty Breakdown*)**:
  * Total sesi MC (Master of Ceremony).
  * Total sesi Pemimpin Puja (Chanting Leader).
  * Total sesi Pengiring Musik / Ghaṇṭā (Musician).
* **Indeks Keseimbangan Tugas (*Fair Load Distribution*)**:
  * Menyoroti jemaat yang bertugas terlalu sering agar terhindar dari kejenuhan (*volunteer burnout*).
  * Memberikan rekomendasi jemaat potensial yang siap dilatih untuk tugas pelayanan berikutnya.

---

### 3.3. Pastoral Care Early Warning System (`/recency-alerts`)

Algoritma pendeteksi dini jemaat yang berisiko keluar (*churn risk*):

#### A. Formula Deteksi Keterlambatan (*Recency Decay Algorithm*)
Sistem menghitung metrik setiap anggota secara berkala (di-cache di Redis selama 60 detik):
1. `daysSinceLastAttendance`: Selisih hari sejak kehadiran event terakhir anggota hingga saat ini.
2. `consecutiveMissedEvents`: Jumlah event resmi berturut-turut yang dilewati anggota sejak terakhir hadir.
3. `personalBaselineDays`: Rata-rata interval hari kedatangan historis anggota bersangkutan (default baseline: 7 hari).
4. `gapRatio`: Rasio keterlambatan anggota = `daysSinceLastAttendance / personalBaselineDays`.

#### B. Tingkat Peringatan Pastoral (*Alert Tiers*)

| Tingkat Alert | Label UI | Kondisi Pemicu Formula | Tindakan Rekomendasi Pastoral |
| --- | --- | --- | --- |
| `normal` | Active (Sehat) | `gapRatio <= 2.0` dan `consecutiveMissed <= 1` | Tidak ada tindakan khusus. Kehadiran rutin normal. |
| `mulai_jarang` | Warning (Mulai Jarang) | `consecutiveMissed === 2` atau `gapRatio > 2.0` | Sapaan santai via WhatsApp atau mention saat pengumuman event. |
| `at_risk` | At Risk (Perlu Perhatian) | `consecutiveMissed === 3` atau `gapRatio > 3.0` | Kontak personal oleh pengurus / teman sebangku vihara. |
| `kemungkinan_hilang` | High Risk (Kritis) | `consecutiveMissed >= 4` atau `gapRatio > 4.0` | Kunjungan pastoral (*Anukampa Visit*) atau panggilan telepon hangat. |
| `churned` | Inactive (Non-Aktif) | `daysSinceLastAttendance > 60` atau `consecutiveMissed >= 6` | Sapaan hari raya keagamaan / penawaran bantuan konseling pastoral. |

#### C. Alur Kerja Pastoral Care (*Pastoral Action Pipeline*)
1. Pengurus membuka daftar `/recency-alerts` dan menyaring jemaat bertanda `At Risk` atau `High Risk`.
2. Pengurus mengklik nama jemaat untuk membuka **Pastoral Detail Sheet**:
   - Menampilkan riwayat kehadiran 15 event terakhir (*Event Timeline*).
   - Menampilkan nomor WhatsApp (didekripsi on-the-fly untuk kontak langsung).
   - Menampilkan sekolah dan teman satu komunitas.
3. **Pencatatan Outreach Log (*Pastoral Notes*)**:
   - Status penanganan: `Pending`, `Contacted`, `In Care`, `Resolved`.
   - Input catatan pastoral (mis. *"Sedang ujian akhir sekolah di SMA Tri Ratna, akan kembali hadir 2 minggu lagi"*).
   - Catatan tersimpan dengan timestamp dan identitas pengurus yang menangani.

---

## 4. Spesifikasi Teknis & API Contract

### 4.1. `GET /api/pengurus/insight`
Mengambil data agregat analitik komunitas.
* **Akses**: `requireAuth`, `requireRole("organizer", "admin")`.
* **Query Params**: `timeUnit` (`month` | `year`), `primaryYear`, `primaryMonth`, `isComparisonEnabled`, `segmentFilter`, `eventCategoryFilter`.
* **Response Envelope**:
  ```json
  {
    "status": "success",
    "code": 200,
    "message": "Insights data retrieved successfully",
    "data": {
      "summary": {
        "active_members": 84,
        "active_members_change_pct": 12.5,
        "avg_attendance_per_event": 42.8,
        "retention_rate_pct": 78.4,
        "total_seva_hours": 160
      },
      "attendance_trend": [
        { "period": "2026-10-04", "attendance": 38, "previous_attendance": 32 },
        { "period": "2026-10-11", "attendance": 45, "previous_attendance": 40 },
        { "period": "2026-10-18", "attendance": 41, "previous_attendance": 35 }
      ],
      "category_distribution": [
        { "category": "Routine Puja", "count": 120, "percentage": 55 },
        { "category": "Meditation", "count": 60, "percentage": 27 },
        { "category": "Social Volunteer", "count": 38, "percentage": 18 }
      ]
    }
  }
  ```

### 4.2. `GET /api/pengurus/recency-alerts`
Mengambil daftar jemaat dengan klasifikasi alert tingkat kehadiran.
* **Akses**: `requireAuth`, `requireRole("organizer", "admin")`.
* **Query Params**: `level` (`all`, `warning`, `at_risk`, `lost`), `search`, `sortBy` (`longest_absence`, `consecutive_missed`, `name`).
* **Response Envelope**:
  ```json
  {
    "status": "success",
    "code": 200,
    "message": "Recency alerts retrieved successfully",
    "data": {
      "summary": {
        "total_members": 150,
        "normal_count": 95,
        "warning_count": 25,
        "at_risk_count": 18,
        "lost_count": 12
      },
      "members": [
        {
          "user_id": "cuid_88",
          "name": "Kevin Wijaya",
          "user_number": 2026090102,
          "role": "member",
          "school": "Universitas Indonesia",
          "phone": "08129876543",
          "last_attended_date": "2026-09-20T10:00:00.000Z",
          "days_since_last_attendance": 34,
          "consecutive_missed_events": 4,
          "level": "kemungkinan_hilang",
          "attendance_count": 12,
          "pastoral_status": "pending"
        }
      ]
    }
  }
  ```

### 4.3. `GET /api/pengurus/recency-alerts/:userId`
Melihat detail profil jemaat, timeline 15 event terakhir, dan histori kontak pastoral.

### 4.4. `POST /api/pengurus/recency-alerts/:userId/notes`
Menambahkan catatan pastoral dan memperbarui status outreach care.
* **Request Body**:
  ```json
  {
    "status": "contacted",
    "notes": "Sudah dihubungi via WA. Sedang sakit tipes, titip salam untuk teman-teman vihara."
  }
  ```

---

## 5. UI/UX Design System (Clay Design System)

1. **Skema Warna Alert Tiers yang Bersahabat**:
   - `normal`: Emerald soft pill (`bg-emerald-50 text-emerald-700`).
   - `mulai_jarang`: Amber soft pill (`bg-amber-50 text-amber-700`).
   - `at_risk`: Orange soft pill (`bg-orange-50 text-orange-700`).
   - `kemungkinan_hilang` / `churned`: Rose soft pill (`bg-rose-50 text-rose-700`).
2. **Apple HIG Sheet Modal untuk Detail Pastoral**: Slide-over sheet yang bersih, menampilkan nomor WhatsApp dengan tombol 1-klik buka WhatsApp Web (`https://wa.me/62...`).
3. **100% Bahasa Inggris**: Seluruh header, metrik, tombol aksi, dan status menggunakan Bahasa Inggris (*"Community Health Index"*, *"Pastoral Care Alerts"*, *"Contacted via WhatsApp"*, *"Resolve Care"*).
