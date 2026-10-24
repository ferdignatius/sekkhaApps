# PRD: Season-Based Leaderboard System — Sekkha Apps

| Metadata | Detail |
| --- | --- |
| **Dokumen** | Product Requirement Document (PRD) |
| **Fitur** | Papan Peringkat Musiman (Seasonal Leaderboard & Seva Appreciation) |
| **Domain** | `leaderboard` / `gamification` / `seasons` |
| **Aplikasi** | Sekkha Apps (Frontend & Backend) |
| **Versi** | 2.0.0 (Unified & Seasons-Integrated) |
| **Status** | Approved / Ready for Development |
| **Referensi Terkait** | `prd-sekkha/configure/seasons.md`, `prd-sekkha/configure/pointRules.md`, `prd-sekkha/configure/masterdata/badgeActivity.md` |

---

## 1. Ringkasan Eksekutif & Tujuan

Leaderboard adalah wadah **kompetisi sehat dan apresiasi dedikasi jemaat** berbasis perolehan poin kehadiran dan pelayanan kebaktian. Sistem leaderboard dirancang dengan prinsip:
1. **Berbasis Musim (Season-Based Zero Reset)**: Peringkat dihitung murni berdasarkan transaksi poin yang terjadi dalam rentang tanggal musim bersangkutan `[start_date, end_date]`. Setiap musim baru dimulai, semua jemaat berkompetisi kembali dari 0 poin tanpa menghapus catatan historis sebelumnya.
2. **Tab Navigasi Musim Dinamis**: Antarmuka secara otomatis menyajikan tab periode berurutan:
   - `[ Custom Season (e.g. Vassa 2026) ] [ Semester ] [ Annual ]` (jika ada custom season aktif), atau
   - `[ Semester ] [ Annual ]` (jika tidak ada custom season aktif).
3. **Penghargaan Podium Visual Top 3**: Desain Clay Card visual untuk juara 1, 2, dan 3 yang menonjolkan apresiasi komunitas.
4. **Posisi Pribadi Mengambang (*Floating Self-Rank Card*)**: Jemaat selalu dapat melihat posisi peringkat dan perolehan poin pribadinya di layar mobile/desktop tanpa harus mencari-cari di dalam tabel.
5. **Anti-Inflasi & Tanpa Pengali Badge**: Poin didasarkan secara murni pada presensi terverifikasi (50-70 Pts) dan tugas pelayanan ibadah resmi (+30 Pts per `badge_activities`). Seluruh gamifikasi badge dan level artifisial telah dieliminasi.

---

## 2. Definisi Role & Aksesibilitas

Leaderboard dapat diakses oleh seluruh jemaat dan pengurus yang telah login: `member`, `activist`, `organizer`, `admin`.

| Role | Akses Leaderboard | Tampilan Khusus |
| --- | :---: | --- |
| `member` | v | Melihat peringkat global komunitas + posisi peringkat diri sendiri. |
| `activist` | v | Sama dengan jemaat. |
| `organizer` | v | Sama dengan jemaat + tombol sinkronisasi ulang cache leaderboard. |
| `admin` | v | Sama dengan organizer. |

> **Perlindungan Privasi**: Informasi kontak sensitif jemaat (nomor telepon, alamat, email) **tidak pernah dimunculkan** di papan peringkat publik. Hanya menampilkan: Nama, Nomor Anggota (`userNumber`), Almamater Sekolah, dan Poin Musim.

---

## 3. Komponen Antarmuka & UX (Clay Design System)

Halaman `/leaderboard` memiliki tata letak responsif:

### 3.1. Header & Dynamic Season Tabs
* Judul Halaman: *"Community Leaderboard"*.
* Subtitle: Menampilkan nama musim yang sedang dipilih, rentang tanggal, dan sisa waktu (*"Vassa Season 2026 • 32 Days Remaining"*).
* Dynamic Tabs: Mengambil data musim dari `GET /api/configure/seasons`:
  * Tab 1: **Custom Active Season** (mis. *Vassa Season*) — jika statusnya `is_active: true`.
  * Tab 2: **Semester Period** (mis. *Semester 2 - 2026*).
  * Tab 3: **Annual Period** (mis. *Year 2026*).

### 3.2. Podium Visual Top 3
* Tiga kartu Clay terangkat (*Clay Elevation*) di bagian atas:
  * **Juara 1 (Gold)**: Kartu tengah berukuran paling tinggi dengan aksen emas (`#e8b94a`), avatar inisial besar, mahkota juara, nama jemaat, sekolah, dan total poin musim.
  * **Juara 2 (Silver)**: Kartu sebelah kiri dengan aksen perak halus.
  * **Juara 3 (Bronze)**: Kartu sebelah kanan dengan aksen perunggu hangat.

### 3.3. Daftar Peringkat Anggota (Ranks 4-100)
* Menampilkan daftar baris kartu jemaat berurutan:
  * Nomor Peringkat (#4, #5, #6...).
  * Avatar inisial dengan badge role (`member` / `activist`).
  * Nama lengkap dan almamater sekolah.
  * Badge total poin yang dicapai di musim tersebut.

### 3.4. Kartu Posisi Diri Sendiri (Floating Sticky Bottom Bar)
* Bar mengambang di bagian bawah layar yang menunjukkan posisi jemaat yang sedang login:
  * *"Your Ranking: #14 • Budi Santoso • 380 Pts"*
  * Sisa poin untuk mencapai peringkat di atasnya (*"20 Pts to reach #13"*).

---

## 4. Spesifikasi Teknis & API Contract

### 4.1. `GET /api/leaderboard`
Mengambil data peringkat leaderboard untuk periode tertentu.
* **Akses**: `requireAuth`.
* **Query Parameters**:
  * `season_id` (string cuid, opsional): ID musim spesifik.
  * `period` (string: `semester`, `annual`, `custom`, default: `semester`).
  * `limit` (number, default: 50, max: 100).
* **Response Envelope (200 OK)**:
  ```json
  {
    "status": "success",
    "code": 200,
    "message": "Leaderboard retrieved successfully",
    "data": {
      "season": {
        "id": "season_vassa_2026",
        "code": "VASSA-2026",
        "name": "Vassa Season 2026",
        "start_date": "2026-07-15T00:00:00.000Z",
        "end_date": "2026-10-31T23:59:59.000Z",
        "days_remaining": 7
      },
      "my_rank": {
        "rank": 8,
        "user_id": "cuid_my_user",
        "user_number": 2026102401,
        "name": "Budi Santoso",
        "points": 420
      },
      "top_three": [
        {
          "rank": 1,
          "user_id": "cuid_1",
          "user_number": 2026010101,
          "name": "Siddhartha Tan",
          "school": "SMA Tri Ratna",
          "points": 750
        },
        {
          "rank": 2,
          "user_id": "cuid_2",
          "user_number": 2026010202,
          "name": "Ananda Surya",
          "school": "Universitas Indonesia",
          "points": 680
        },
        {
          "rank": 3,
          "user_id": "cuid_3",
          "user_number": 2026010303,
          "name": "Sariputta Hendra",
          "school": "SMK Buddhis",
          "points": 610
        }
      ],
      "rankings": [
        {
          "rank": 4,
          "user_id": "cuid_4",
          "user_number": 2026020101,
          "name": "Moggallana Deni",
          "school": "SMA Negeri 1",
          "points": 540
        }
      ]
    }
  }
  ```

---

## 5. Kinerja & Caching (Redis Strategy)

1. **Big-O Aggregation**:
   - Kalkulasi poin musiman diagregasi langsung dari tabel `point_transactions` dengan filter rentang waktu:
     ```sql
     SELECT user_id, SUM(points) as total_points
     FROM point_transactions
     WHERE created_at >= season.start_date AND created_at <= season.end_date
     GROUP BY user_id
     ORDER BY total_points DESC
     LIMIT 100;
     ```
2. **Redis In-Memory Caching**:
   - Hasil kalkulasi disimpan di Redis dengan key `leaderboard:<period>:<seasonId>` dan TTL **60 detik**.
   - Event invalidasi: Ketika sebuah event ditutup (`EVENT_CLOSED` dipancarkan di EventBus), cache leaderboard musim aktif otomatis di-invalidate secara asinkron.
