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

---

## 7. User Stories

| ID | As a | I want to | So that |
| --- | --- | --- | --- |
| US-PENG-01 | Organizer | View real-time Community Vitality KPI summary cards (active members, delta percentage, avg attendance, retention rate, total seva sessions) | I can assess the overall macro health and engagement trends of the youth community |
| US-PENG-02 | Organizer | Filter community analytics by time unit (monthly/yearly), event category, and school institution | I can analyze targeted demographic and activity segment performance |
| US-PENG-03 | Organizer | Compare attendance trends with prior time periods (MoM / YoY comparison) | I can measure community growth or contraction over consecutive cycles |
| US-PENG-04 | Organizer | View the Seva & Contributor Board with top volunteers and role distribution | I can acknowledge high-contributing volunteers and balance service duties across members |
| US-PENG-05 | Organizer | Filter youth members by consecutive missed attendance count (>= 2 events for warning, >= 4 events for high-risk pastoral care) | I can proactively reach out to drifting youth members before silent churn occurs |
| US-PENG-06 | Organizer | Download analytics summaries and pastoral care lists as CSV or PDF exports | I can present operational reports to vihara elders and maintain offline records |
| US-PENG-07 | Member / Activist | Be restricted from accessing `/insight` and `/api/pengurus/*` endpoints | Sensitive aggregated operational community metrics remain confidential to leadership |

---

## 8. Acceptance Criteria

| ID | Scenario | Expected result |
| --- | --- | --- |
| AC-PENG-01 | Organizer opens `/insight` dashboard | Real-time KPI summary cards display active members, attendance averages, retention rate, and duty session totals within standard response envelope. |
| AC-PENG-02 | Organizer switches time unit or applies event/school filter | Trend charts and category distribution re-render dynamically matching selected filter criteria. |
| AC-PENG-03 | Organizer enables comparison mode | Attendance trend graph displays current period series alongside previous period comparison series. |
| AC-PENG-04 | Organizer switches to Seva & Contributor Board tab | Displays top 3 volunteer podium, total duties, badge points earned, and role breakdown (MC, Puja Leader, Musician). |
| AC-PENG-05 | Organizer filters members by consecutive missed count (>= 2 or >= 4) | System returns filtered pastoral member list displaying last attendance date, missed event count, contact number, and school. |
| AC-PENG-06 | Organizer clicks export button (CSV / PDF) | System generates downloadable report file containing aggregated metrics and pastoral member data with proper MIME type headers. |
| AC-PENG-07 | Non-privileged user (`member` or `activist`) navigates to `/insight` or calls `/api/pengurus/*` | Server returns HTTP `403 Forbidden` envelope; client redirects to unauthorized or dashboard view. |
| AC-PENG-08 | Unauthenticated guest accesses pengurus routes | Server returns HTTP `401 Unauthorized`; client redirects to `/login`. |

---

## 9. Test Cases

| Test Case ID | Category | Scenario / Description | Preconditions | Test Steps | Expected Result | Type |
| --- | --- | --- | --- | --- | --- | --- |
| **TC-PENG-01** | KPI Dashboard | Retrieve community vitality summary metrics | User logged in as `organizer` or `admin` | Send `GET /api/pengurus/insight?timeUnit=month&primaryYear=2026&primaryMonth=10`. | HTTP 200 envelope with `summary` payload (`active_members`, `active_members_change_pct`, `avg_attendance_per_event`, `retention_rate_pct`, `total_seva_sessions`). | Positive |
| **TC-PENG-02** | Time & Filter | Filter analytics by category and school demographics | User logged in as `organizer` | Send `GET /api/pengurus/insight` with `eventCategoryFilter=regular-puja` and `segmentFilter=member`. | HTTP 200 with filtered attendance trend and category distribution matching selected filters. | Positive |
| **TC-PENG-03** | Trend Comparison | Compare current period with prior period (MoM / YoY) | Historical attendance data exists across periods | Send `GET /api/pengurus/insight` with `isComparisonEnabled=true`. | HTTP 200; `attendance_trend` items contain both current `attendance` and `previous_attendance` values. | Positive |
| **TC-PENG-04** | Seva Leadership | View Seva & Contributor Board podium and role distribution | Event attendances with badge activities recorded | Inspect `data.seva_contributors` in `/api/pengurus/insight` response or click Tab 2 in UI. | Top volunteers listed with `total_duties` and `points_earned`; duty breakdown totals match assigned badge activities. | Positive |
| **TC-PENG-05** | Pastoral Care | Filter pastoral members with warning tier (consecutive missed >= 2) | Members with varying missed attendance records exist | Query pastoral care member list with filter `consecutive_missed_min=2`. | HTTP 200 returning members who missed 2 or 3 consecutive events marked with warning tier status. | Positive / Functional |
| **TC-PENG-06** | Pastoral Care | Filter high-risk pastoral members (consecutive missed >= 4) | Members who missed 4 or more consecutive events exist | Query pastoral care member list with filter `consecutive_missed_min=4`. | HTTP 200 returning members with `consecutiveMissed >= 4` flagged for critical outreach / visit. | Positive / Functional |
| **TC-PENG-07** | Report Export | Download analytics and pastoral care list as CSV | Authenticated as `organizer` or `admin` | Trigger export action with format `csv` (`GET /api/pengurus/export?format=csv`). | HTTP 200 with `Content-Type: text/csv` and valid `Content-Disposition: attachment; filename="pengurus-insights-*.csv"`. Valid CSV format. | Positive |
| **TC-PENG-08** | Report Export | Download analytics summary report as PDF | Authenticated as `organizer` or `admin` | Trigger export action with format `pdf` (`GET /api/pengurus/export?format=pdf`). | HTTP 200 with `Content-Type: application/pdf` containing formatted analytics summary tables. | Positive |
| **TC-PENG-09** | RBAC Guard | Unauthorized access by `member` or `activist` | Logged in as `member` or `activist` | 1. Navigate to `/insight`.<br>2. Call `GET /api/pengurus/insight`. | Frontend displays 403 or redirects away; API returns HTTP 403 Forbidden envelope (`Access denied: insufficient permissions`). | Security / RBAC |
| **TC-PENG-10** | Auth Guard | Unauthenticated guest access | No valid session token | Call `GET /api/pengurus/insight` without Authorization header. | HTTP 401 Unauthorized envelope. No community data leaked. | Security |
| **TC-PENG-11** | Empty Data | Query insights for period with zero events / attendances | Period with no scheduled or closed events | Query `GET /api/pengurus/insight` for empty future month. | HTTP 200 envelope with zeroed counters (`0`), empty trend arrays `[]`, and graceful UI empty state without crash. | Edge Case |
| **TC-PENG-12** | Extreme Outlier | Handling high duty load volunteers (Burnout indicator) | A volunteer assigned to > 10 duties in single period | Query insights Seva board. | Contributor board correctly computes volunteer duties without integer overflow, highlighting burnout status. | Edge Case |
