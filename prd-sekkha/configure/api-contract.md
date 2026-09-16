# Spesifikasi Kontrak API: Domain Konfigurasi Sistem (`configure`)

Dokumen ini mendefinisikan kontrak komunikasi resmi untuk manajemen konfigurasi master data vihara, sistem lencana (*badges* / *achievements*), level gamifikasi (*levels*), kategori acara (*event-types*), waktu kebaktian (*event-times*), musim papan peringkat (*seasons*), aturan perolehan poin (*points-rules*), dan batas peringatan dini (*early warning thresholds*).

---

## 1. Ikhtisar Modul
- **Base Route**: `/api/configure`
- **Aturan Otorisasi Bertingkat**:
  - `GET` (Read-only): Terbuka untuk role **`pengurus`** dan **`admin`**.
  - `POST`, `PUT`, `PATCH`, `DELETE` (Mutasi Data): Dibatasi khusus untuk **`admin`** saja. Percobaan mutasi oleh role selain admin menghasilkan `403 Forbidden: Only admin can modify configuration settings`.
- **Dampak Lintas Modul**:
  - Perubahan musim (`/seasons`) atau aktivasi musim otomatis memicu sinkronisasi dan kalkulasi ulang papan peringkat (`computeAndCacheLeaderboard()`).

---

## 2. Rincian Endpoint per Sub-Fitur

### 2.1. Lencana & Pencapaian (`/api/configure/badges` & `/api/configure/achievements`)
- `GET /api/configure/badges`: Mengambil daftar seluruh lencana master.
- `POST /api/configure/badges`: Membuat master lencana baru (`condition_type: streak | attendance | points | event_count | manual`).
- `PUT /api/configure/badges/:id`: Memperbarui nama, deskripsi, icon URL, atau syarat nilai.
- `DELETE /api/configure/badges/:id`: Menghapus lencana.
- Endpoint `/api/configure/achievements` memiliki signature dan perilaku yang identik untuk kebutuhan master data achievement.

---

### 2.2. Level Gamifikasi (`/api/configure/levels`)
- `GET /api/configure/levels`: Mengambil tangga level beserta ambang batas minimum poin (`min_points`).
- `POST /api/configure/levels`: Menambahkan level baru.
  ```json
  {
    "level": 4,
    "label": "Viriya (Semangat)",
    "min_points": 750
  }
  ```
- `PUT /api/configure/levels/:id`: Memperbarui nama level atau syarat poin.
- `DELETE /api/configure/levels/:id`: Menghapus level.

---

### 2.3. Kategori & Waktu Acara (`/api/configure/event-types` & `/api/configure/event-times`)
- `GET /api/configure/event-types`: Mengambil daftar kategori kegiatan (`rutin`, `khusus`, `sharing`, `pelatihan`).
- `POST /api/configure/event-types`: Menambah kategori acara dengan kode warna unik.
- `PUT /api/configure/event-types/:id`: Memperbarui kode atau label.
- `DELETE /api/configure/event-types/:id`: Menghapus kategori.
- `GET /api/configure/event-times`: Mengambil template jam kebaktian standar vihara (misal: "Pagi 09:00 - 11:00").
- `POST /api/configure/event-times`: Menambahkan template waktu.
- `PUT /api/configure/event-times/:id` & `DELETE /:id`: Pengelolaan template waktu.

---

### 2.4. Musim Papan Peringkat (`/api/configure/seasons`)
- `GET /api/configure/seasons`: Mengambil daftar seluruh musim (Semester 6 Bulan, Kuartal 3 Bulan, Tahunan), beserta status aktif dan total presensi terkumpul.
- `POST /api/configure/seasons`: Membuat musim baru:
  ```json
  {
    "name": "Season Kuartal IV 2026",
    "code": "quarterly_2026_q4",
    "start_date": "2026-10-01T00:00:00.000Z",
    "end_date": "2026-12-31T23:59:59.000Z",
    "is_active": false,
    "target_attendance": 300,
    "bonus_points": 50,
    "description": "Evaluasi presensi kuartal akhir tahun."
  }
  ```
- `PUT /api/configure/seasons/:id`: Memperbarui tanggal atau target musim.
- `POST /api/configure/seasons/:id/activate`: Mengaktifkan musim tertentu sebagai musim utama aktif saat ini (otomatis menonaktifkan musim lain).
- `DELETE /api/configure/seasons/:id`: Menghapus musim.

---

### 2.5. Aturan Poin (`/api/configure/points-rules`)
- `GET /api/configure/points-rules`: Mengambil master aturan nilai poin (misal: `attendance_rutin` = 50 poin, `attendance_special` = 100 poin, `streak_weekly_bonus` = 30 poin).
- `PUT /api/configure/points-rules`: Mengubah besaran poin untuk setiap kode aksi.
  ```json
  {
    "rules": [
      {
        "code": "attendance_rutin",
        "points": 60
      }
    ]
  }
  ```

---

### 2.6. Batas Peringatan Dini Absensi (`/api/configure/threshold`)
- `GET /api/configure/threshold`: Mengambil ambang batas saat ini untuk kalkulasi resiko jemaat pasif.
  ```json
  {
    "warningConsecutiveMissed": 2,
    "atRiskConsecutiveMissed": 3,
    "lostConsecutiveMissed": 4,
    "churnedDaysThreshold": 60
  }
  ```
- `PUT /api/configure/threshold`: Mengubah ambang batas deteksi dini (*strict validation*).
  ```json
  {
    "warningConsecutiveMissed": 2,
    "atRiskConsecutiveMissed": 3,
    "lostConsecutiveMissed": 4,
    "churnedDaysThreshold": 60
  }
  ```
