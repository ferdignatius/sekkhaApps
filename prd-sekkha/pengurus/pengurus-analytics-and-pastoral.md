# PRD: Community & Contributor Insights (Pengurus Analytics Dashboard) — Sekkha Apps

| Metadata | Detail |
| --- | --- |
| **Dokumen** | Product Requirement Document (PRD) |
| **Fitur** | Community Insights & Contributor Seva Leadership Dashboard |
| **Domain** | `pengurus` / `analytics` |
| **Aplikasi** | Sekkha Apps (Frontend & Backend) |
| **Versi** | 2.1.0 (Unified & Consolidated) |
| **Status** | Approved / Ready for Development |
| **Referensi Terkait** | `prd-sekkha/event/event.md`, `prd-sekkha/configure/masterdata/badgeActivity.md`, `prd-sekkha/peoples/people-management.md` |

---

## 1. Ringkasan Eksekutif & Tujuan

Dashboard Pengurus adalah pusat kecerdasan operasional komunitas vihara yang disatukan dalam satu halaman analitik terpadu: **`/insight`**. 

Modul ini menyatukan dua kebutuhan analitik yang sebelumnya terpisah:
1. **Analitik Vitalitas Komunitas (*Community Vitality & Trends*)**: Memantau kesehatan komunitas secara makro (anggota aktif, rata-rata kehadiran per event, rasio retensi jemaat, tren kehadiran mingguan/bulanan, perbandingan periode YoY / MoM, serta komposisi peserta berdasarkan kategori event dan institusi sekolah).
2. **Papan Kontributor & Beban Pelayanan (*Seva & Contributor Board*)**: Melacak dan mengapresiasi keaktifan petugas ibadah (MC, Pemimpin Puja / *Chanting Leader*, Pengiring Musik / *Musician*) yang terintegrasi langsung dengan master data `badge_activities`.

> **Catatan Arsitektur & YAGNI**:
> - Rute terpisah `/pengurus-contribution` dilebur menjadi Tab 2 pada halaman `/insight` guna memangkas redundansi navigasi dan memberikan satu *single pane of glass* bagi pengurus.
> - Fitur *Pastoral Care Early Warning System (Recency Alerts)* ditangguhkan dan dipindahkan ke **Rencana Pengembangan Masa Depan (Post-MVP Roadmap)** pada Bagian 6 agar tim fokus membangun pondasi data analitik inti yang kokoh terlebih dahulu.

---

## 2. Definisi Role & Matriks Hak Akses

Halaman analitik `/insight` memuat data performa agregat komunitas dan bertugas untuk kebutuhan internal kepengurusan vihara.

| Role | Akses Dashboard Analitik Terpadu (`/insight`) | Tindakan / Izin |
| --- | :---: | --- |
| `member` | x (403 Forbidden) | Akses ditolak server |
| `activist` | x (403 Forbidden) | Akses ditolak server |
| `organizer` | v (Full Access) | Melihat tren kehadiran jemaat & rekap pelayanan seva |
| `admin` | v (Full Access) | Melihat tren kehadiran jemaat & rekap pelayanan seva |

> **Prinsip Keamanan**: Request dari role `member` atau `activist` ke `/insight` atau endpoint `/api/pengurus/insight` otomatis ditolak dengan **`403 Forbidden`**.

---

## 3. Spesifikasi Halaman Analitik Terpadu (`/insight`)

Halaman `/insight` menyajikan antarmuka visual berbasis Clay Design System dengan 2 tab terorganisir:

```
[ Tab 1: Community Vitality & Trends ]   |   [ Tab 2: Seva & Contributor Board ]
```

### 3.1. Tab 1: Community Vitality & Trends

* **Kartu Metrik Vitalitas Utama (Hero Stat Cards)**:
  * *Active Members*: Jumlah jemaat unik yang hadir minimal 1 kali dalam 30 hari terakhir (dilengkapi indikator % kenaikan/penurunan dibanding bulan sebelumnya).
  * *Average Attendance per Event*: Rata-rata peserta yang hadir pada setiap sesi kegiatan kebaktian.
  * *Community Retention Rate %*: Persentase jemaat yang konsisten hadir kembali bulan ini.
  * *Total Seva Duty Sessions*: Total sesi tugas pelayanan ibadah yang telah terlaksana.
* **Filter Analisis Multidimensi**:
  * Unit Waktu: *Monthly* atau *Yearly*.
  * Pembanding Periode (*Comparison Mode*): Perbandingan langsung dengan periode sebelumnya.
  * Filter Kategori Event: Berdasarkan master data `event_types` (Routine Puja, Meditation, Social Volunteer, dll.).
  * Filter Demografi Almamater: Berdasarkan master data `schools` (SMA/SMK, SMP, Universitas, Umum).
* **Visualisasi Grafik Responsif (Clay Chart Canvas)**:
  * Grafik Tren Kehadiran Waktu Nyata (*Line/Bar Chart* responsif).
  * Distribusi Kehadiran menurut Tipe Event (*Donut / Bar Chart*).
  * Komposisi Jemaat Berdasarkan Institusi Sekolah (*Stacked Bar Chart*).

---

### 3.2. Tab 2: Seva & Contributor Board (Eks Contributor Insights)

Menyajikan metrik kontribusi dan pembagian beban tugas aktivis/relawan (*Seva Volunteers*):
* **Papan Kepemimpinan Pelayanan (Seva Leadership Podium)**:
  * Menampilkan peringkat 3 besar relawan yang paling aktif bertugas melayani ibadah dalam musim aktif (Seasons).
  * Menampilkan total poin bonus pelayanan yang diraih relawan dari `badge_activities`.
* **Rincian Peran Pelayanan (*Duty Breakdown*)**:
  * Rekap total sesi bertugas sebagai MC (*Master of Ceremony*).
  * Rekap total sesi bertugas sebagai Pemimpin Puja (*Chanting Leader*).
  * Rekap total sesi bertugas sebagai Pengiring Musik / Ghaṇṭā (*Musician*).
* **Indeks Keseimbangan Tugas (*Fair Load Distribution & Burnout Prevention*)**:
  * Menyoroti jemaat yang bertugas terlalu sering agar terhindar dari kejenuhan (*volunteer burnout*).
  * Memberikan rekomendasi jemaat aktivis potensial yang siap dilatih untuk giliran penugasan berikutnya.

---

## 4. Spesifikasi Teknis & API Contract

### 4.1. `GET /api/pengurus/insight`
Mengambil data agregat analitik komunitas dan kontribusi seva.
* **Akses**: `requireAuth`, `requireRole("organizer", "admin")`.
* **Query Params**:
  * `timeUnit` (`month` | `year`)
  * `primaryYear` (number, e.g. `2026`)
  * `primaryMonth` (number, e.g. `10`)
  * `isComparisonEnabled` (boolean)
  * `segmentFilter` (`all` | `member` | `activist` | `organizer`)
  * `eventCategoryFilter` (string)
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
        "total_seva_sessions": 48
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
      ],
      "seva_contributors": {
        "top_volunteers": [
          { "user_id": "u_01", "name": "Handy Susanto", "total_duties": 14, "points_earned": 420 },
          { "user_id": "u_02", "name": "Dewi Lestari", "total_duties": 11, "points_earned": 330 },
          { "user_id": "u_03", "name": "Vicky Prasetya", "total_duties": 9, "points_earned": 270 }
        ],
        "duty_breakdown": {
          "mc_count": 18,
          "puja_leader_count": 18,
          "musician_count": 12
        }
      }
    }
  }
  ```

---

## 5. UI/UX Design System (Clay Design System)

1. **Card Container HIG & Clay**: Menggunakan `rounded-[20px]`, subtle depth shadow, dan border hairline specular.
2. **Tab Switcher Bersih**: Tab `[ Community Vitality & Trends ]` dan `[ Seva & Contributor Board ]` berada di atas konten dengan transisi cepat tanpa refresh halaman.
3. **100% Bahasa Inggris**: Seluruh label antarmuka menggunakan Bahasa Inggris standar (*"Community Insights"*, *"Active Members"*, *"Retention Rate"*, *"Seva Leadership Board"*, *"Duty Distribution"*).

---

## 6. Rencana Pengembangan Masa Depan (Future Development Roadmap / Post-MVP)

> [!NOTE]
> Fitur di bawah ini merupakan rancangan matang sistem pastoral care yang sengaja **ditangguhkan dari fase saat ini** agar tim dapat berfokus pada stabilitas modul utama. Spesifikasi ini disimpan sebagai acuan saat fase analitik lanjutan dimulai.

### 6.1. Pastoral Care Early Warning System (`/recency-alerts`)
Sistem peringatan dini berbasis algoritma statistik cerdas untuk mendeteksi penurunan frekuensi kehadiran jemaat (*recency decay*) sebelum terjadi *silent churn*.

#### A. Formula Deteksi Keterlambatan (*Recency Decay Formula*)
1. `daysSinceLastAttendance`: Selisih hari sejak kehadiran event terakhir anggota hingga saat ini.
2. `consecutiveMissedEvents`: Jumlah event resmi berturut-turut yang dilewati anggota.
3. `personalBaselineDays`: Rata-rata interval kedatangan historis anggota (default: 7 hari).
4. `gapRatio`: Rasio keterlambatan = `daysSinceLastAttendance / personalBaselineDays`.

#### B. Tingkat Peringatan Pastoral (*Alert Tiers*)

| Tingkat Alert | Label UI | Kondisi Pemicu Formula | Tindakan Rekomendasi Pastoral |
| --- | --- | --- | --- |
| `normal` | Active (Sehat) | `gapRatio <= 2.0` dan `consecutiveMissed <= 1` | Tidak ada tindakan khusus. Kehadiran rutin normal. |
| `mulai_jarang` | Warning (Mulai Jarang) | `consecutiveMissed === 2` atau `gapRatio > 2.0` | Sapaan santai via WhatsApp atau mention saat pengumuman event. |
| `at_risk` | At Risk (Perlu Perhatian) | `consecutiveMissed === 3` atau `gapRatio > 3.0` | Kontak personal oleh pengurus / teman sebangku vihara. |
| `kemungkinan_hilang` | High Risk (Kritis) | `consecutiveMissed >= 4` atau `gapRatio > 4.0` | Kunjungan pastoral (*Anukampa Visit*) atau panggilan telepon hangat. |
| `churned` | Inactive (Non-Aktif) | `daysSinceLastAttendance > 60` atau `consecutiveMissed >= 6` | Sapaan hari raya keagamaan / penawaran konseling pastoral. |

#### C. Alur Kerja Pastoral Care (*Pastoral Action Pipeline*)
1. Pengurus menyaring jemaat bertanda `At Risk` atau `High Risk`.
2. Pengurus membuka **Pastoral Detail Sheet** (timeline 15 event terakhir, nomor WhatsApp, almamater sekolah).
3. Pencatatan **Outreach Log** (*Pastoral Notes*): Status penanganan (`Pending`, `Contacted`, `In Care`, `Resolved`) dan catatan follow-up.
