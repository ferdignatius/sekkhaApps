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

---

## 6. User Stories

| ID | As a | I want to | So that |
| --- | --- | --- | --- |
| US-LEAD-01 | Community Member | View the leaderboard ranked by Seasonal (Custom / Semester / Annual) and Lifetime karma points | I can track my growth and healthy competition across different timeframes |
| US-LEAD-02 | Community Member | See a dedicated visual podium for the Top 3 members and a floating sticky card with my personal rank and points | I immediately recognize high achievers and know where I stand relative to the next rank |
| US-LEAD-03 | Privacy-conscious Member | Keep sensitive PII hidden and only display my public member info (or anonymous alias if toggled) on the public board | My personal contact details stay secure and private while participating in gamification |
| US-LEAD-04 | Community Member | Have consistent tie-breakers applied fairly when members share identical points (higher streak, higher attendances, then earlier activity) | Ranks remain deterministic, clear, and undisputed during ties |
| US-LEAD-05 | Community Member | View collective season target progress (e.g. 500 total attendances) with real-time percentage indicators | I feel inspired to participate together toward the shared temple community goal |
| US-LEAD-06 | Organizer / Admin | Trigger a manual cache refresh for leaderboard metrics | I can ensure displayed rankings reflect recent event closures immediately if needed |

---

## 7. Acceptance Criteria

| ID | Scenario | Expected result |
| --- | --- | --- |
| AC-LEAD-01 | View seasonal vs lifetime tabs | UI offers dynamic tabs: Custom season (if active), Semester, Annual, and Lifetime. Changing tabs recalibrates metrics starting from 0 for seasons without affecting lifetime history. |
| AC-LEAD-02 | Top 3 podium display | Rank #1 (Gold), Rank #2 (Silver), Rank #3 (Bronze) render elevated cards with distinct styling, full names, school, and points. |
| AC-LEAD-03 | Floating self-rank card | Authenticated user sees fixed bottom card showing personal rank, current points, and distance in points to the next rank. |
| AC-LEAD-04 | Tie-breaker resolution | If two or more users have identical points, tie-breaking evaluates: 1) higher current streak, 2) higher attendance count in period, 3) earlier latest point transaction. If still tied, sort by ascending userNumber. |
| AC-LEAD-05 | Privacy & PII protection | Public leaderboard endpoint never returns phone number, email, class grade, or date of birth. If user enables anonymity toggle, public display masks name to "Member #userNumber" or custom alias while keeping score. |
| AC-LEAD-06 | Collective season progress | Header displays active season attendance progress bar `total_attendances / target_attendance` with percentage and days remaining. |
| AC-LEAD-07 | Cache invalidation on event close | When an event status transitions to `closed`, active leaderboard Redis/memory cache is invalidated and fresh ranks compute on next request. |

---

## 8. Test Cases

| Test Case ID | Category | Scenario / Description | Preconditions | Test Steps | Expected Result | Type |
| --- | --- | --- | --- | --- | --- | --- |
| **TC-LEAD-01** | Navigation & Tabs | Switch between dynamic season tabs (Custom Season, Semester, Annual, Lifetime) | Active custom season (e.g. Vassa 2026) exists in DB alongside default semester/annual periods | 1. Open `/leaderboard`.<br>2. Verify tab order: `[Vassa 2026]` `[Semester]` `[Annual]` `[Lifetime]`.<br>3. Click each tab and observe data request. | `GET /api/leaderboard?period=<tab>` succeeds with HTTP 200. Tab 1 computes points inside custom date range. Lifetime reflects all-time aggregated points. | Positive |
| **TC-LEAD-02** | Reset Zero | Seasonal reset verification upon new season start | Transition into new season where user has 0 attendances in range | 1. Query leaderboard for new active season.<br>2. Check user rank and points. | User displays 0 seasonal points on seasonal tab while all-time lifetime points in `UserStats` remain intact. | Positive / Functional |
| **TC-LEAD-03** | Visual Podium | Render Top 3 podium with gold, silver, bronze cards | Leaderboard returns >= 3 ranked users | 1. Open `/leaderboard`.<br>2. Inspect DOM for Top 3 Clay cards. | Rank 1 displays gold crown accent and highest elevation. Rank 2 displays silver card on left. Rank 3 displays bronze card on right. Ranks 4+ render in standard list below. | UI / Positive |
| **TC-LEAD-04** | Floating Rank Card | Display logged-in user position in sticky bottom bar | User is logged in as `member` with rank #14 (380 Pts) and #13 has 400 Pts | 1. Scroll down past row 20 on `/leaderboard`.<br>2. Observe bottom sticky bar. | Sticky bar remains visible, displaying: *"Your Ranking: #14 • 380 Pts"* and *"20 Pts to reach #13"*. | UI / Functional |
| **TC-LEAD-05** | Tie-Breaker | Deterministic ranking when multiple users share identical point totals | User A and User B both have 500 points in active season. User A has streak 4, User B has streak 2 | 1. Trigger leaderboard calculation for period.<br>2. Compare ranks of User A and User B. | User A is ranked ahead of User B based on secondary metric (streak). If streaks match, evaluate total attendances. If still tied, sort by earlier timestamp/userNumber. No indeterminate random shifts. | Positive / Algorithm |
| **TC-LEAD-06** | Privacy Protection | PII exclusion and anonymity toggle validation | User has sensitive PII (encrypted phone, email, birth date) in `UserProfile` | 1. Call `GET /api/leaderboard`.<br>2. Inspect JSON response fields for all entries.<br>3. Inspect user with privacy/anonymity enabled. | Response never leaks phone, email, or raw ciphertext. Anonymized users display masked name `Member #...` or alias; public score remains verifiable. | Security / Privacy |
| **TC-LEAD-07** | Season Target | Display collective season attendance progress bar | Season has `targetAttendance: 500`, community attended 380 times | 1. Open `/leaderboard`.<br>2. Inspect season header progress bar. | Displays `"380 / 500 Attendances (76%)"` and remaining days countdown. If target reached (>= 100%), visual milestone unlocked banner is presented. | Positive / Functional |
| **TC-LEAD-08** | Cache Performance | Sub-50ms response from Redis/memory cache on repeated hits | Leaderboard computed and cached | 1. Send first request `GET /api/leaderboard`.<br>2. Send 10 concurrent requests within TTL (60s). | First request caches snapshot. Subsequent requests resolve directly from Redis/memory in $< 50\text{ ms}$ without running full table aggregations. | Performance |
| **TC-LEAD-09** | Cache Invalidation | Auto invalidation when event is finalized and closed | Active event with attendances is marked `closed` | 1. Organizer closes event (`POST /api/events/:id/close`).<br>2. EventBus emits `EVENT_CLOSED`.<br>3. Query `GET /api/leaderboard`. | Cache key `leaderboard:*` is purged. Query re-aggregates fresh points earned from closed event. | Integration / Positive |
| **TC-LEAD-10** | Empty State | Season with zero point transactions | Newly created season with no finalized events | 1. Open `/leaderboard?season_id=<empty_season>`. | HTTP 200 with empty `rankings: []`, `top_three: []`, and friendly empty state: *"No points recorded for this season yet. Attend events to make the board!"* | Edge / Negative |
| **TC-LEAD-11** | Unauthenticated Access | Unauthenticated request to leaderboard endpoint | No bearer token provided | Send `GET /api/leaderboard` without Authorization header. | HTTP 401 Unauthorized with standard error envelope. | Security |
| **TC-LEAD-12** | Max Limit Enforcement | Pagination parameter exceeding limit (`limit=500`) | Authenticated session | Send `GET /api/leaderboard?limit=500`. | Request automatically clamped to max limit (100) or rejected with HTTP 400 validation error; prevents memory exhaustion. | Security / Boundary |
