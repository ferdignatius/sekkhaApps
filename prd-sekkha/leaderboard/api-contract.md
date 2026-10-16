# Spesifikasi Kontrak API: Domain Papan Peringkat (`leaderboard`)

Dokumen ini mendefinisikan kontrak komunikasi resmi untuk sistem papan peringkat (*leaderboard*), metrik pemeringkatan (poin, streak, kehadiran), ranking personal pengguna, dan progres target komunitas vihara (*community goal*).

---

## 1. Ikhtisar Modul
- **Base Route**: `/api/leaderboard`
- **Keamanan**: `requireAuth` (seluruh anggota terdaftar berhak melihat peringkat komunitas).
- **Arsitektur Performa (F-17 Snapshot Caching)**:
  - Peringkat dikalkulasi secara otomatis oleh cron job setiap Minggu malam jam 03:00 WIB (`Asia/Jakarta`) dan disimpan sebagai snapshot berkecepatan tinggi di memory/Redis.
  - Pengguna biasa selalu disajikan hasil snapshot siap pakai ($O(1)$ latency).
  - Parameter `refresh=true` (paksa kalkulasi ulang) dibatasi khusus untuk **`pengurus`** dan **`admin`** guna mencegah DoS / kelebihan beban komputasi.

---

## 2. Rincian Endpoint

### 2.1. `GET /api/leaderboard`
Mengambil data papan peringkat berdasarkan metrik tertentu, peringkat pengguna saat ini (`my_rank`), informasi musim (*season*), dan pencapaian target komunitas.

- **Headers**: `Authorization: Bearer <accessToken>`
- **Query Parameters**:
  - `metric` (`points` | `streak` | `attendance`, default: `points`)
  - `refresh` (`true` | `false`, opsional): Khusus pengurus/admin untuk memicu pembaruan kalkulasi instan.
- **Response (200 OK)**:
  ```json
  {
    "entries": [
      {
        "rank": 1,
        "user_id": "usr_clexample123",
        "name": "Budi Santoso",
        "initials": "BS",
        "user_number": "NV-2026-0042",
        "value": 450,
        "level": 3,
        "badge_count": 5
      },
      {
        "rank": 2,
        "user_id": "usr_clexample456",
        "name": "Dewi Lestari",
        "initials": "DL",
        "user_number": "NV-2026-0012",
        "value": 420,
        "level": 3,
        "badge_count": 4
      }
    ],
    "my_rank": {
      "rank": 1,
      "value": 450,
      "is_in_top": true,
      "name": "Budi Santoso",
      "initials": "BS"
    },
    "season": {
      "id": "sea_2026_q3",
      "name": "Musim Vassa 2026",
      "start_date": "2026-07-01T00:00:00.000Z",
      "end_date": "2026-09-30T23:59:59.000Z",
      "target_attendance": 500
    },
    "community_goal": {
      "current": 385,
      "target": 500,
      "label": "Target Absensi Komunitas Vihara"
    },
    "calculated_at": "2026-09-13T20:00:00.000Z"
  }
  ```

---

### 2.2. `GET /api/leaderboard/debug`
Melihat status agregasi data pengguna di database dan verifikasi snapshot (khusus Administrator).

- **Security**: `requireRole("admin")`
- **Response (200 OK)**:
  ```json
  {
    "db_users_count": 150,
    "db_users": [
      {
        "id": "usr_123",
        "name": "Budi Santoso",
        "email": "user@example.com",
        "role": "umat",
        "points": 450,
        "isClaimed": true,
        "userNumber": "NV-2026-0042"
      }
    ],
    "computed_snapshot_entries": []
  }
  ```
