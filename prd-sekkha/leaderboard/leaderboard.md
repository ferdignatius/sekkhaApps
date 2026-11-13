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
2. **Tab Navigasi Musim Dinamis & Arsip Riwayat Musim (*Past Seasons*)**: Antarmuka menyajikan tab periode aktif berurutan:
   - `[ Custom Season (e.g. Vassa 2026) ] [ Semester ] [ Annual ]` (jika ada custom season aktif), atau
   - `[ Semester ] [ Annual ]` (jika tidak ada custom season aktif).
   - Selain periode aktif, musim yang telah berakhir (`endDate < now` atau musim lampau nonaktif) **tetap tersimpan sebagai arsip (`archived_periods`)** dan dapat diakses melalui dropdown **"Past Seasons"** di sebelah tab periode aktif untuk melihat klasemen final musim tersebut.
3. **Penghargaan Podium Visual Top 3 & Top 10 Ringkas**: Desain Clay Card visual untuk juara 1, 2, dan 3 diikuti daftar peringkat 4–10.
4. **Posisi Pribadi Inline di Bawah Rank #10**: Jika peringkat pribadi user berada di Top 10 (`#1–#10`), baris/pilar user langsung disorot dengan kartu emas dan badge **`YOU`**. Jika berada di luar Top 10 (`#11+`), sistem menampilkan pemisah `• • •` dan kartu peringkat pribadi user tepat di bawah Rank `#10` tanpa bar melayang agar tidak bertabrakan dengan `MobileDock`. Role ditampilkan sebagai teks subtitle halus agar badge **`YOU`** tidak ambigu.
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

> **Perlindungan Privasi**: Informasi identitas sensitif jemaat (email) serta **nama panjang jemaat tidak dimunculkan** di papan peringkat publik. Demi privasi dan budaya gamifikasi komunitas, leaderboard secara eksklusif menggunakan **Username** (contoh: `@siddhartha`, `@ananda`), Nomor Anggota (`userNumber`), Almamater Sekolah, dan Poin Musim.

---

## 3. Komponen Antarmuka & UX (Clay Design System)

Halaman `/leaderboard` memiliki tata letak responsif:

### 3.1. Header Terpadu, Metrik Switcher & Dynamic Season Tabs
* Header ringkas menampilkan judul *"Leaderboard"*, rentang tanggal musim aktif, chip sisa hari (*"52d left"*), dan tombol refresh `44px`.
* **Metrik Leaderboard (Points & Attendance Saja)**:
  * **Points (Default)**: Akumulasi perolehan poin karma kebaktian dan pelayanan jemaat dalam rentang waktu season bersangkutan (`[start_date, end_date]`).
  * **Attendance**: Total jumlah kehadiran event terverifikasi jemaat dalam rentang waktu season bersangkutan.
  * *(Catatan Arsitektur: Tab metrik `Streak` **dihapus sepenuhnya** dari tampilan Leaderboard. Streak berfokus pada personal journey jemaat di Dashboard Home, Profil, dan Kartu Anggota, serta berperan di balik layar Leaderboard sebagai **Primary Tie-Breaker** ketika poin sama).*
* **Interaksi Metrik dengan Dynamic Season Tabs**:
  * Baik metrik `Points` maupun `Attendance` dievaluasi murni dalam batasan season aktif (`season-based zero reset`):
    * Tab 1: **Custom Active Season** (mis. *Vassa Season*) — jika statusnya `is_active: true`.
    * Tab 2: **Semester Period** (mis. *Semester 2 - 2026*).
    * Tab 3: **Annual Period** (mis. *Year 2026*).
    * Di setiap season baru, skor kompetisi dihitung murni dari awal `[start_date, end_date]` (reset ke 0).
  * **Peran Streak di Balik Layar (Primary Tie-Breaker)**:
    Jika dua atau lebih anggota memiliki total perolehan poin musim yang sama persis di tab `Points`, maka sistem otomatis memeringkatkan anggota dengan angka streak (`current_streak`) tertinggi di atasnya sebelum mengevaluasi jumlah kehadiran.
* **Inspeksi Musim Lampau (*Past / Archived Seasons Selector*)**:
  * Saat terdapat musim yang sudah selesai (`archived_periods.length > 0`), header menampilkan tombol dropdown **"Past Seasons"** yang berisi daftar musim lampau (diurutkan terbaru berdasarkan `endDate`, disertai ringkasan tanggal).
  * Ketika pengguna memilih salah satu musim arsip:
    * Chip sisa hari diganti dengan badge **`Archived Season · Final Standings`**, sementara podium & daftar Top 10 memuat klasemen historis musim tersebut.

### 3.2. Podium Visual Top 3
* Tiga pilar Clay bersih di bagian atas tanpa badge peringkat berulang yang menimpa avatar:
  * **Juara 1 (Gold)**: Kartu tengah tertinggi dengan mahkota juara, aksen emas (`#e8b94a`), avatar inisial, **username jemaat** (`@siddhartha_tan`), tag `You` bila milik sendiri, skor, dan angka pilar `1`.
  * **Juara 2 (Silver)**: Pilar sebelah kiri dengan aksen perak halus, username jemaat, skor, dan angka pilar `2`.
  * **Juara 3 (Bronze)**: Pilar sebelah kanan dengan aksen perunggu hangat, username jemaat, skor, dan angka pilar `3`.

### 3.3. Daftar Peringkat Anggota (Strict Top 10: Podium 1–3 & List 4–10)
* Leaderboard menampilkan **10 peringkat teratas** (`limit=10`): Podium untuk peringkat `#1–#3` dan daftar baris ringkas maksimal 7 baris untuk peringkat `#4–#10`:
  * Nomor Peringkat (#4 – #10).
  * Avatar inisial + **Username jemaat** (misal: `@moggallana_deni`, bukan nama panjang).
  * Peran (`Member`, `Activist`, `Organizer`, `Admin`) ditampilkan sebagai **teks subtitle muted** (bukan badge pill) agar tidak menimbulkan ambiguitas visual dengan badge **`YOU`**.
  * Jika baris milik user sendiri: latar `surface-soft`, border emas (`clay-ochre`), dan satu-satunya pill badge eksklusif **`YOU`** (`bg-clay-ochre text-ink`), plus hint selisih poin ke peringkat di atasnya.
  * Skor metrik periode aktif.

### 3.4. Kartu Posisi Diri Sendiri di Bawah Rank #10 (`rank > 10`)
* Tidak menggunakan floating sticky bottom bar agar tidak menumpuk di atas `MobileDock`.
* Bila user berada pada peringkat `#1–#10`, posisinya disorot langsung di dalam Podium atau daftar `#4–#10` (tanpa kartu ganda).
* Bila user berada di luar Top 10 (`#11+`), tepat setelah Rank `#10` ditampilkan pemisah `• • •` dan 1 kartu posisi pribadi dengan nomor peringkat aslinya (`#15`, `#24`, dst.), highlight emas + badge **`YOU`**, teks role subtitle, serta skornya.

---

## 4. Spesifikasi Teknis & API Contract

### 4.1. `GET /api/leaderboard`
Mengambil data peringkat leaderboard untuk periode tertentu.
* **Akses**: `requireAuth`.
* **Query Parameters**:
  * `metric` (string: `points` | `attendance`, default: `points`): Metrik pemeringkatan leaderboard musiman.
  * `period` (string, opsional): Dapat berupa periode aktif (`custom` | `semester` | `annual`) maupun `id` / `code` dari musim arsip (`archived_periods`) untuk menginspeksi klasemen & pemenang historis.
  * `limit` (number, default: 10, max: 100).
* **Field Tambahan Periode & Arsip dalam Response**:
  * `available_periods`: Daftar tab periode aktif (`custom` / `semester` / `annual`).
  * `archived_periods`: Daftar musim yang telah berakhir dengan `is_archived: true` agar pengguna tetap dapat membuka dan melihat klasemen leaderboard musim sebelumnya.
  * `active_period`: Periode yang sedang ditampilkan (aktif atau arsip).
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
        "rank": 15,
        "user_id": "cuid_my_user",
        "user_number": 2026102401,
        "username": "budi_santoso",
        "name": "Budi Santoso",
        "role": "member",
        "is_in_top": false,
        "points": 120
      },
      "top_three": [
        {
          "rank": 1,
          "user_id": "cuid_1",
          "user_number": 2026010101,
          "username": "siddhartha_tan",
          "name": "Siddhartha Tan",
          "school": "SMA Tri Ratna",
          "points": 750
        },
        {
          "rank": 2,
          "user_id": "cuid_2",
          "user_number": 2026010202,
          "username": "ananda_surya",
          "name": "Ananda Surya",
          "school": "Universitas Indonesia",
          "points": 680
        },
        {
          "rank": 3,
          "user_id": "cuid_3",
          "user_number": 2026010303,
          "username": "sariputta_h",
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
          "username": "moggallana_deni",
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
| US-LEAD-02 | Community Member | See a clean Top 10 board (Top 3 podium + Ranks 4–10 list) with my own rank highlighted inline or directly below Rank #10 when outside Top 10 | I immediately recognize achievers and know my exact rank without floating UI clutter over navigation |
| US-LEAD-03 | Privacy-conscious Member | Keep sensitive PII hidden and only display my public member info (or anonymous alias if toggled) on the public board | My personal contact details stay secure and private while participating in gamification |
| US-LEAD-04 | Community Member | Have consistent tie-breakers applied fairly when members share identical points (higher streak, higher attendances, then earlier activity) | Ranks remain deterministic, clear, and undisputed during ties |
| US-LEAD-05 | Community Member | View collective season target progress (e.g. 500 total attendances) with real-time percentage indicators | I feel inspired to participate together toward the shared temple community goal |
| US-LEAD-06 | Organizer / Admin | Trigger a manual cache refresh for leaderboard metrics | I can ensure displayed rankings reflect recent event closures immediately if needed |
| US-LEAD-07 | Community Member | Browse past/archived seasons via a Past Seasons selector and view final standings | Historical leaderboard standings remain discoverable after a season ends |

---

## 7. Acceptance Criteria

| ID | Scenario | Expected result |
| --- | --- | --- |
| AC-LEAD-01 | View seasonal vs lifetime tabs | UI offers dynamic tabs: Custom season (if active), Semester, Annual, and Lifetime. Changing tabs recalibrates metrics starting from 0 for seasons without affecting lifetime history. |
| AC-LEAD-02 | Top 3 podium display | Rank #1 (Gold), Rank #2 (Silver), Rank #3 (Bronze) render elevated cards with distinct styling, usernames (@username), school, and points without exposing full names. |
| AC-LEAD-03 | Self-rank placement & role distinction | Top 10 ranks (#1–#10) highlight the user directly in place using a gold `YOU` pill, while roles render as muted subtitle text to avoid visual ambiguity. If user ranks > 10, a separator (`•••`) and their highlighted rank card render cleanly below Rank #10 without a floating bar. |
| AC-LEAD-04 | Tie-breaker resolution | If two or more users have identical points, tie-breaking evaluates: 1) higher current streak, 2) higher attendance count in period, 3) earlier latest point transaction. If still tied, sort by ascending userNumber. |
| AC-LEAD-05 | Privacy & PII protection | Public leaderboard endpoint never returns email or class grade (nor any direct contact/birth fields, which have been removed under UU PDP data minimization). Leaderboard strictly uses usernames (@username) instead of full real names to protect privacy, and excludes permanently anonymized former accounts (`anonymizedAt != null`). |
| AC-LEAD-06 | Collective season progress | Header displays active season attendance progress bar `total_attendances / target_attendance` with percentage and days remaining. |
| AC-LEAD-07 | Cache invalidation on event close | When an event status transitions to `closed`, active leaderboard Redis/memory cache is invalidated and fresh ranks compute on next request. |
| AC-LEAD-08 | Past / Archived Seasons browsing | `GET /api/leaderboard` returns ended seasons in `archived_periods` (`is_archived: true`) and supports querying them by season `id` or `code`. UI renders a **"Past Seasons"** selector and displays `"Archived Season · Final Standings"` alongside final standings. |

---

## 8. Test Cases

| Test Case ID | Category | Scenario / Description | Preconditions | Test Steps | Expected Result | Type |
| --- | --- | --- | --- | --- | --- | --- |
| **TC-LEAD-01** | Navigation & Tabs | Switch between dynamic season tabs (Custom Season, Semester, Annual, Lifetime) | Active custom season (e.g. Vassa 2026) exists in DB alongside default semester/annual periods | 1. Open `/leaderboard`.<br>2. Verify tab order: `[Vassa 2026]` `[Semester]` `[Annual]` `[Lifetime]`.<br>3. Click each tab and observe data request. | `GET /api/leaderboard?period=<tab>` succeeds with HTTP 200. Tab 1 computes points inside custom date range. Lifetime reflects all-time aggregated points. | Positive |
| **TC-LEAD-02** | Reset Zero | Seasonal reset verification upon new season start | Transition into new season where user has 0 attendances in range | 1. Query leaderboard for new active season.<br>2. Check user rank and points. | User displays 0 seasonal points on seasonal tab while all-time lifetime points in `UserStats` remain intact. | Positive / Functional |
| **TC-LEAD-03** | Visual Podium | Render Top 3 podium with gold, silver, bronze cards | Leaderboard returns >= 3 ranked users | 1. Open `/leaderboard`.<br>2. Inspect DOM for Top 3 Clay cards. | Rank 1 displays gold crown accent, username (@username), and highest elevation. Rank 2 displays silver card on left with @username. Rank 3 displays bronze card on right with @username. Real long names are never shown. Ranks 4+ render in standard list below with @username. | UI / Positive |
| **TC-LEAD-04** | Self Rank Placement | Render Top 10 (#1–#10) cleanly and place user's rank below #10 only when > 10 | User is logged in as `member` with rank #15 (120 Pts) | 1. Open `/leaderboard`.<br>2. Inspect podium (#1–#3), list (#4–#10), and bottom row. | No floating bottom bar obscures the screen or `MobileDock`. Ranks #4–#10 display muted role captions (`Member`, `Organizer`), while after Rank #10 a dotted divider and the user's gold-highlighted `#15` row (`YOU` badge, score) are displayed. | UI / Functional |
| **TC-LEAD-05** | Tie-Breaker | Deterministic ranking when multiple users share identical point totals | User A and User B both have 500 points in active season. User A has streak 4, User B has streak 2 | 1. Trigger leaderboard calculation for period.<br>2. Compare ranks of User A and User B. | User A is ranked ahead of User B based on secondary metric (streak). If streaks match, evaluate total attendances. If still tied, sort by earlier timestamp/userNumber. No indeterminate random shifts. | Positive / Algorithm |
| **TC-LEAD-06** | Privacy Protection | PII exclusion and username privacy validation | User has sensitive PII (encrypted email, full name) in DB / `UserProfile` | 1. Call `GET /api/leaderboard`.<br>2. Inspect JSON response fields for all entries.<br>3. Inspect UI rendering. | Response includes username. UI strictly renders @username rather than full real name. Endpoint never leaks email or raw ciphertext. Anonymized accounts (`anonymizedAt != null`) are excluded from active leaderboard standings. | Security / Privacy |
| **TC-LEAD-07** | Season Target | Display collective season attendance progress bar | Season has `targetAttendance: 500`, community attended 380 times | 1. Open `/leaderboard`.<br>2. Inspect season header progress bar. | Displays `"380 / 500 Attendances (76%)"` and remaining days countdown. If target reached (>= 100%), visual milestone unlocked banner is presented. | Positive / Functional |
| **TC-LEAD-08** | Cache Performance | Sub-50ms response from Redis/memory cache on repeated hits | Leaderboard computed and cached | 1. Send first request `GET /api/leaderboard`.<br>2. Send 10 concurrent requests within TTL (60s). | First request caches snapshot. Subsequent requests resolve directly from Redis/memory in $< 50\text{ ms}$ without running full table aggregations. | Performance |
| **TC-LEAD-09** | Cache Invalidation | Auto invalidation when event is finalized and closed | Active event with attendances is marked `closed` | 1. Organizer closes event (`POST /api/events/:id/close`).<br>2. EventBus emits `EVENT_CLOSED`.<br>3. Query `GET /api/leaderboard`. | Cache key `leaderboard:*` is purged. Query re-aggregates fresh points earned from closed event. | Integration / Positive |
| **TC-LEAD-10** | Empty State | Season with zero point transactions | Newly created season with no finalized events | 1. Open `/leaderboard?season_id=<empty_season>`. | HTTP 200 with empty `rankings: []`, `top_three: []`, and friendly empty state: *"No points recorded for this season yet. Attend events to make the board!"* | Edge / Negative |
| **TC-LEAD-11** | Unauthenticated Access | Unauthenticated request to leaderboard endpoint | No bearer token provided | Send `GET /api/leaderboard` without Authorization header. | HTTP 401 Unauthorized with standard error envelope. | Security |
| **TC-LEAD-12** | Max Limit Enforcement | Pagination parameter exceeding limit (`limit=500`) | Authenticated session | Send `GET /api/leaderboard?limit=500`. | Request automatically clamped to max limit (100) or rejected with HTTP 400 validation error; prevents memory exhaustion. | Security / Boundary |
| **TC-LEAD-13** | Archived Season History | View past season leaderboard standings | At least one ended season (`endDate < now`) exists in DB | 1. Open `/leaderboard` and click **"Past Seasons"** dropdown.<br>2. Select `"Vassa Retreat 2025"`. | Request calls `GET /api/leaderboard?metric=points&period=<archived_id>`; UI shows `"Archived Season · Final Standings"` badge and historical Top 10 podium/list. | Positive / Functional |
