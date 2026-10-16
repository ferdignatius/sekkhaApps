# Spesifikasi Kontrak API: Domain Dashboard Beranda (`dashboard`)

Halaman Beranda / Dashboard (`src/modules/dashboard/`) berfungsi sebagai pusat kendali (*command center*) bagi pengguna yang menampilkan rangkuman data secara terpadu melalui agregasi beberapa endpoint backend `sekkha-api`.

---

## 1. Arsitektur Agregasi Data Dashboard
Dashboard mengonsumsi data secara paralel (*concurrent fetching*) menggunakan endpoint resmi:

| Komponen Dashboard | Endpoint yang Dipanggil | Data yang Digunakan |
|---|---|---|
| **Profil Ringkas & Kartu QR** | `GET /api/users/me` | Nama, Nomor Anggota (`user_number`), Role, Poin, Level |
| **Widget Streak Konsistensi** | `GET /api/users/me/streak` | `current_streak`, `longest_streak`, tanggal kebaktian terakhir |
| **Acara Mendatang (Next Event)** | `GET /api/events?limit=3` | Jadwal acara terdekat berikutnya, judul, lokasi, tanggal |
| **Papan Peringkat Kilat** | `GET /api/leaderboard` | Peringkat pribadi (`my_rank`), Top 3 jemaat, Progres target komunitas vihara |
| **Notifikasi & Aktivitas Terkini** | `GET /api/notifications?limit=5` | Pengumuman vihara terbaru, reward lencana yang baru diraih |

---

## 2. Kontrak Data per Komponen

### 2.1. Profil Ringkas & Status Gamifikasi
- **Endpoint**: `GET /api/users/me` (Auth: `requireAuth`)
- **Struktur Data Terpakai**:
  ```json
  {
    "id": "usr_clexample123",
    "name": "Budi Santoso",
    "user_number": "NV-2026-0042",
    "role": "umat",
    "points": 350,
    "school": "SMA Negeri 1 Jakarta"
  }
  ```

### 2.2. Pelacak Keaktifan (Streak)
- **Endpoint**: `GET /api/users/me/streak` (Auth: `requireAuth`)
- **Struktur Data Terpakai**:
  ```json
  {
    "current_streak": 4,
    "longest_streak": 12,
    "last_attended": "2026-09-13T09:30:00.000Z"
  }
  ```

### 2.3. Acara Terdekat (Next Upcoming Event)
- **Endpoint**: `GET /api/events`
- **Struktur Data Terpakai**:
  ```json
  [
    {
      "id": "evt_sunday_01",
      "title": "Kebaktian Remaja Minggu Pagi",
      "location": "Dhammasala Utama",
      "event_date": "2026-09-20T09:00:00.000Z",
      "status": "published"
    }
  ]
  ```

### 2.4. Ringkasan Papan Peringkat Komunitas
- **Endpoint**: `GET /api/leaderboard?metric=points`
- **Struktur Data Terpakai**:
  ```json
  {
    "my_rank": {
      "rank": 1,
      "value": 350
    },
    "community_goal": {
      "current": 385,
      "target": 500,
      "label": "Target Absensi Komunitas Vihara"
    }
  }
  ```
