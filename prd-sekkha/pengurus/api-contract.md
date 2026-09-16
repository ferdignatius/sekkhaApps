# Spesifikasi Kontrak API: Domain Pengurus & Analitik (`pengurus`)

Dokumen ini mendefinisikan kontrak komunikasi resmi untuk sistem analitik vihara, sistem peringatan dini presensi (*Recency / Early Warning Alerts*), deteksi resiko jemaat pasif (*silent churn*), dan statistik kesehatan komunitas.

---

## 1. Ikhtisar Modul
- **Base Route**: `/api/pengurus`
- **Keamanan**: Seluruh endpoint mewajibkan role **`pengurus`** atau **`admin`** (`requireRole("pengurus", "admin")`).
- **Caching**:
  - `recency-alerts`: Di-cache selama 60 detik di level memory/Redis untuk efisiensi beban query kalkulasi ketidakhadiran beruntun (*consecutive missed events*).
  - `insight`: Di-cache selama 60 detik per kombinasi query parameter filter waktu & segmen.

---

## 2. Rincian Endpoint

### 2.1. `GET /api/pengurus/recency-alerts`
Mengambil daftar jemaat yang memerlukan tindak lanjut (*follow-up*) pastoral berdasarkan tren absensi berturut-turut.

- **Security**: `requireRole("pengurus", "admin")`
- **Query Parameters**:
  - `level` (`all` | `normal` | `warning` | `at_risk` | `lost`, default: `all`)
    - `normal`: Bolos 0-1 kali
    - `warning`: Bolos 2 kali berturut-turut
    - `at_risk`: Bolos 3 kali berturut-turut (perlu intervensi langsung)
    - `lost`: Tidak hadir 4+ kali berturut-turut
  - `search` (string, opsional): Pencarian nama, nomor anggota, atau kontak.
  - `sortBy` (`longest_absence` | `name` | `consecutive_missed`, default: `longest_absence`)
- **Response (200 OK)**:
  ```json
  {
    "summary": {
      "total_members": 142,
      "normal_count": 110,
      "warning_count": 18,
      "at_risk_count": 9,
      "lost_count": 5
    },
    "members": [
      {
        "user_id": "usr_clexample789",
        "name": "Kevin Wijaya",
        "user_number": "NV-2026-0019",
        "role": "umat",
        "school": "SMA Tarakanita 1",
        "phone": "08129876543",
        "level": "at_risk",
        "consecutive_missed": 3,
        "days_since_last_attendance": 21,
        "last_attended_date": "2026-08-23T09:00:00.000Z",
        "attendance_rate": 45
      }
    ]
  }
  ```

---

### 2.2. `GET /api/pengurus/recency-alerts/:userId`
Mengambil rekam jejak detail presensi seorang jemaat untuk keperluan konseling atau pendekatan panitia.

- **Security**: `requireRole("pengurus", "admin")`
- **Response (200 OK)**:
  ```json
  {
    "user": {
      "id": "usr_clexample789",
      "name": "Kevin Wijaya",
      "email": "kevin@example.com",
      "user_number": "NV-2026-0019",
      "phone": "08129876543",
      "school": "SMA Tarakanita 1",
      "joined_at": "2026-01-10T00:00:00.000Z"
    },
    "metrics": {
      "consecutive_missed": 3,
      "days_since_last": 21,
      "attendance_rate": 45,
      "status": "at_risk"
    },
    "attendance_history": [
      {
        "event_id": "evt_sunday_01",
        "event_title": "Kebaktian Remaja",
        "event_date": "2026-08-23T09:00:00.000Z",
        "status": "present"
      },
      {
        "event_id": "evt_sunday_02",
        "event_title": "Kebaktian Remaja",
        "event_date": "2026-08-30T09:00:00.000Z",
        "status": "absent"
      }
    ]
  }
  ```

---

### 2.3. `GET /api/pengurus/insight`
Mengambil data analitik komprehensif kehadiran vihara, tren bulanan/tahunan, retensi jemaat, perbandingan periode, serta segmentasi masa keanggotaan (*tenure*).

- **Security**: `requireRole("pengurus", "admin")`
- **Query Parameters**:
  - `timeUnit` (`year` | `month`, default: `year`)
  - `primaryYear` (number, default: tahun berjalan)
  - `primaryMonth` (number, default: bulan berjalan)
  - `isComparisonEnabled` (`true` | `false`)
  - `compareYear` (number, opsional)
  - `segmentFilter` (`all` | `umat` | `aktivis` | `pengurus`, default: `all`)
  - `eventCategoryFilter` (string, default: `all`)
- **Response (200 OK)**:
  ```json
  {
    "timeUnit": "year",
    "isComparisonEnabled": false,
    "segmentFilter": "all",
    "summary": {
      "totalActiveMembers": {
        "value": 115,
        "deltaText": "+8%",
        "isPositive": true,
        "description": "Dibandingkan Tahun Lalu"
      },
      "avgAttendanceRate": {
        "value": "78%",
        "deltaText": "+5%",
        "isPositive": true,
        "description": "Konsistensi kehadiran umat"
      },
      "retentionRate": {
        "value": "86%",
        "deltaText": "+2.4%",
        "isPositive": true,
        "description": "Umat aktif berulang"
      },
      "atRiskMembersCount": {
        "value": 9,
        "deltaText": "-2 org",
        "isPositive": true,
        "description": "Perlu intervensi & follow-up"
      }
    },
    "trendChartData": [
      { "label": "Jan", "2026": 85 },
      { "label": "Feb", "2026": 92 },
      { "label": "Mar", "2026": 105 }
    ],
    "silentChurnHealth": {
      "totalMembers": 142,
      "normalCount": 110,
      "warningCount": 18,
      "atRiskCount": 9,
      "lostCount": 5,
      "normalPercent": 77
    },
    "tenureBreakdown": [
      { "label": "< 3 Bulan", "count": 25, "percentage": 18, "color": "#3B82F6" },
      { "label": "3 - 12 Bulan", "count": 65, "percentage": 46, "color": "#10B981" },
      { "label": "1 - 2 Tahun", "count": 35, "percentage": 25, "color": "#F59E0B" },
      { "label": "> 2 Tahun", "count": 17, "percentage": 11, "color": "#8B5CF6" }
    ]
  }
  ```
