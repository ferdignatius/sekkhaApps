# PRD: Home Dashboard — Sekkha Apps

| Metadata | Detail |
| --- | --- |
| **Dokumen** | Product Requirement Document (PRD) |
| **Fitur** | Personal Home Dashboard (Ringkasan Komunitas, Kartu Anggota, Streak, & Event Terdekat) |
| **Domain** | `home` / `dashboard` |
| **Aplikasi** | Sekkha Apps (Frontend & Backend) |
| **Versi** | 2.0.0 (Unified & Gamification-Sanitized) |
| **Status** | Approved / Ready for Development |
| **Referensi Terkait** | `prd-sekkha/event/event.md`, `prd-sekkha/configure/seasons.md`, `prd-sekkha/general/users/profile-and-settings.md` |

---

## 1. Ringkasan Eksekutif & Tujuan

Dashboard Home (`/home`) adalah beranda utama yang pertama kali dilihat pengguna setelah masuk ke Sekkha Apps. Berfungsi sebagai **pusat keterlibatan personal jemaat** (*personal community hub*):
1. **Penyambutan Hangat & Kartu Anggota Digital**: Salam waktu dinamis (*"Good morning/afternoon/evening, [Name]"*), kartu digital ringkas yang menampilkan `userNumber` dan tombol cepat membuka QR Presensi.
2. **Keterlibatan Konsistensi (Weekly Streak)**: Menampilkan jumlah minggu berturut-turut jemaat hadir di vihara untuk menjaga komitmen spiritual pemuda.
3. **Event Terdekat (Upcoming Event)**: Menyoroti kegiatan kebaktian, meditasi, atau bakti sosial terdekat dengan countdown timer dan detail lokasi.
4. **Progres Musim Aktif (Season Progress)**: Menampilkan pencapaian poin jemaat dalam musim kompetisi sehat yang sedang berjalan (mis. Vassa / Semester) serta sisa hari musim.
5. **Kutipan Dhamma Harian (Daily Dhamma Wisdom)**: Kutipan kebijaksanaan harian untuk menginspirasi hari anggota.
6. **Eliminasi Gamifikasi Artifisial**: Fitur level numerik (Level 1-99) dan badge koleksi telah **dieliminasi total** sesuai filosofi Buddhis kesederhanaan dan nilai guna nyata.

---

## 2. Target Pengguna & Role

| Role | Tampilan & Akses Khusus di Home Dashboard |
| --- | --- |
| `member` | Dashboard personal jemaat: Kartu QR anggota, streak mingguan, event terdekat, musim aktif, dan kutipan Dhamma. |
| `activist` | Sama dengan member + badge status aktivis. |
| `organizer` | Sama dengan jemaat + **Quick Operator Card**: Pintasan langsung ke live QR scanner event aktif (`/events/scan`) dan ringkasan jemaat hadir hari ini. |
| `admin` | Sama dengan organizer. |

---

## 3. Komponen Antarmuka & Layout (Clay Design System)

Mengadopsi layout grid responsif 12 kolom (`max-w-7xl mx-auto`) dengan estetika Clay hangat:

```
┌────────────────────────────────────────────────────────┐
│  1. Hero Welcome & Digital Member Quick ID Card        │
│     (Salam, QR Presensi, Streak Counter, Poin Musim)   │
└────────────────────────────────────────────────────────┘
┌─────────────────────────────────┬──────────────────────┐
│  2. Next Upcoming Event Card    │ 3. Active Season Card│
│     (Judul, Waktu, Lokasi, CTA) │    (Progress Bar)    │
├─────────────────────────────────┴──────────────────────┤
│  4. Recent Activity & Points History Ledger            │
│     (Catatan presensi & poin masuk terakhir)           │
├────────────────────────────────────────────────────────┤
│  5. Daily Dhamma Quote Widget                          │
└────────────────────────────────────────────────────────┘
```

### 3.1. Hero Welcome & Digital Member Quick Card
* **Salam Waktu Dinamis (Local Time Greeting)**:
  * Pagi (04:00 - 11:59): *"Good morning, [Name]"*
  * Siang (12:00 - 16:59): *"Good afternoon, [Name]"*
  * Malam (17:00 - 03:59): *"Good evening, [Name]"*
* **Statistik Cepat**:
  * **Current Streak**: Jumlah minggu berturut-turut hadir (`🔥 N Weeks Streak`).
  * **Season Points**: Poin yang diperoleh dalam musim yang sedang aktif.
  * **Member ID**: Nomor anggota resmi `userNumber` (mis. `2026102401`).
* **Tombol Cepat QR Presensi**: Tombol *"Show Member QR"* yang langsung menampilkan modal QR code statis layar penuh dengan kecerahan tinggi untuk mempermudah pemindaian oleh petugas pintu masuk vihara.

### 3.2. Next Upcoming Event Card
* Menampilkan event terdekat yang berstatus `scheduled` atau `active`:
  * Badge Status: *"Live Today"* (hijau berkedip jika hari ini) atau *"Upcoming"*.
  * Tag Kategori Event dari master data: Routine Puja, Chanting, Meditation, dll.
  * Countdown Waktu: *"Starts in 2 hours"* atau *"Tomorrow at 09:00 AM"*.
  * Nama Lokasi: Dhammasala Utama / Vihara Sekkha.
  * CTA Button: *"View Event Details"*, mengarahkan ke `/events?eventId=:id`.

### 3.3. Active Season Progress Card
* Terintegrasi dengan modul Season aktif (`prd-sekkha/configure/seasons.md`):
  * Nama Musim Aktif: e.g. *"Vassa Season 2026"*.
  * Sisa Waktu: e.g. *"42 Days Remaining"*.
  * Progress Bar: Poin jemaat terhadap target komunitas atau pencapaian semester.
  * CTA: *"View Leaderboard"*, mengarahkan ke tab musim di `/leaderboard`.

### 3.4. Operator Shortcut Banner (Khusus Organizer & Admin)
* Ditampilkan hanya jika ada event berstatus `active` saat ini:
  * Banner Amber Emas: *"Live Attendance Session Active: [Judul Event]"*.
  * Tombol CTA: *"Launch Camera QR Scanner"*, langsung membuka `/events/scan?eventId=:id`.

---

## 4. Spesifikasi Teknis & API Contract

Dashboard Home menggabungkan data dari endpoint efisien tanpa overhead query:
1. `GET /api/users/me`: Profil, streak, total points, dan nomor anggota.
2. `GET /api/events?limit=1&upcoming=true`: Event terdekat yang relevan.
3. `GET /api/configure/seasons?active=true`: Metadata musim aktif dan rentang tanggal.
4. `GET /api/users/me/points-history?limit=3`: 3 riwayat perolehan poin kehadiran terakhir.

---

## 5. UI/UX & Non-Functional Requirements

1. **Aesthetic Tokens**: Clay Card `rounded-[24px]`, border `#e5e5e5`, background warm canvas `#fffaf0`, ambient glow backdrop mesh.
2. **Skeleton Shimmer**: Tidak ada spinner layar penuh. Setiap kartu memiliki skeleton loader mandiri saat inisialisasi data.
3. **100% Bahasa Inggris**: Seluruh label dan dialog menggunakan Bahasa Inggris.

---

## 6. User Stories

| ID | As a | I want to | So that |
| --- | --- | --- | --- |
| **US-HOME-01** | Community Member | View my personal dashboard with dynamic time greeting, streak, points, and digital member card | I feel warmly welcomed and have immediate access to my community identity and attendance status |
| **US-HOME-02** | Community Member | Open a high-contrast full-screen digital member QR modal via "Show Member QR" | Temple gatekeepers or event operators can scan my attendance quickly and reliably |
| **US-HOME-03** | Community Member | View the nearest upcoming event with countdown timer, category tag, location, and quick action | I never miss scheduled services, meditations, or temple gatherings |
| **US-HOME-04** | Community Member | View active season progress, community target milestone, and days remaining | I am motivated to participate consistently in the healthy spiritual community journey |
| **US-HOME-05** | Community Member | Read daily Dhamma wisdom verses with refresh and copy/share capabilities | I receive daily spiritual inspiration grounded in the Dhammapada teachings |
| **US-HOME-06** | Community Member | View my recent attendance logs and karma points ledger | I can track my spiritual activities and points earned with full transparency |
| **US-HOME-07** | Organizer / Admin | View a dedicated live operator shortcut banner when an event is active | I can instantly launch the camera QR scanner (`/events/scan`) without navigating complex menus |
| **US-HOME-08** | Member / Activist | Not see administrative or operator controls meant strictly for organizers | My dashboard remains clean, simple, and free of unauthorized operational actions |

---

## 7. Acceptance Criteria

| ID | Scenario | Expected result |
| --- | --- | --- |
| **AC-HOME-01** | User accesses `/home` while authenticated | Dashboard loads profile, streak, season progress, upcoming events, and recent activities in English. |
| **AC-HOME-02** | User accesses `/home` without valid session / expired token | User is immediately intercepted by auth guard and redirected to `/login` with valid internal redirect path. |
| **AC-HOME-03** | Dynamic greeting based on user local time | 04:00-11:59 shows *"Good morning"*, 12:00-16:59 shows *"Good afternoon"*, 17:00-03:59 shows *"Good evening"*. |
| **AC-HOME-04** | User clicks "Show Member QR" button | High-contrast full-screen modal pops up displaying static QR encoded with `userNumber` and member name. |
| **AC-HOME-05** | Upcoming event available | Next event card displays title, location, countdown, category tag, and "View Event Details" CTA. |
| **AC-HOME-06** | No upcoming event scheduled | Card displays graceful empty state: *"No upcoming events scheduled. Check back later!"*. |
| **AC-HOME-07** | Active season configured | Active season card displays season name, remaining days, and attendance progress bar against target. |
| **AC-HOME-08** | No active season | Season section hides or renders neutral offseason banner without crashing or showing broken progress. |
| **AC-HOME-09** | Daily Dhamma quote widget | Displays Dhammapada verse in English and Pali with functional random refresh and copy/share buttons. |
| **AC-HOME-10** | Live event active + user is Organizer/Admin | Quick Operator Card / amber banner appears with CTA *"Launch Camera QR Scanner"* (`/events/scan?eventId=:id`). |
| **AC-HOME-11** | Live event active + user is Member/Activist | Quick Operator Card / amber banner is strictly hidden. |
| **AC-HOME-12** | Backend API response envelope | `GET /api/home` adheres to standard envelope `{ status: "success", code: 200, message: "...", data: {...} }`. |
| **AC-HOME-13** | Backend caching & latency | Home dashboard response is cached (e.g. 5-30s in-memory/Redis) scoped by `userId:role` to optimize high concurrent loads. |

---

## 8. Test Cases (Matriks Pengujian Terinci)

| Test Case ID | Category | Scenario / Description | Preconditions | Test Steps | Expected Result | Type |
| --- | --- | --- | --- | --- | --- | --- |
| **TC-HOME-01** | Authentication & Guard | Unauthenticated user navigates to `/home` | No token in `localStorage` | Open `http://localhost:3000/home`. | Frontend auth guard catches route; user is redirected to `/login?redirectTo=%2Fhome`. Home dashboard is not rendered. | Security |
| **TC-HOME-02** | Profile & Greeting | Successful dashboard loading for authenticated member | User `member` logged in with name "Siddhartha" | 1. Navigate to `/home`.<br>2. Observe local time header and member card. | HTTP 200 envelope from `GET /api/home`. Greeting matches client time (e.g. "Good morning, Siddhartha"). Displays `userNumber`, streak count, and Karma Points. | Positive |
| **TC-HOME-03** | Digital Member QR Modal | Member clicks "Show Member QR" button | On `/home` page | 1. Click "Show Member QR" on hero card.<br>2. Inspect QR code modal overlay. | High-contrast modal opens with QR code representing user's `userNumber`. Screen brightness hint active, modal dismissible via close button or backdrop click. | Positive |
| **TC-HOME-04** | Upcoming Event Display | Display upcoming event when scheduled event exists | An event exists with status `scheduled`, `event_date >= now`, `visibility: "all"` | Navigate to `/home`. | Next upcoming event card renders event title, category badge, formatted date/time, location, and active "View Event Details" link. | Positive |
| **TC-HOME-05** | Upcoming Event Visibility | Member does not see organizer-only upcoming event | Event `evt_secret` has `visibility: "organizer"`, user is `member` | 1. Log in as member.<br>2. Fetch `GET /api/home`. | In `events` array, `evt_secret` is excluded. If no other event exists, card displays empty state. | Security / RBAC |
| **TC-HOME-06** | Upcoming Event Empty State | No upcoming event in database | Zero events with `event_date >= now` | Log in and view `/home`. | Upcoming event card displays clean empty state message (*"No upcoming events scheduled"*), CTA disabled or redirects to past events archive. | Edge Case |
| **TC-HOME-07** | Active Season Progress | Active season in progress with attendance target | Active season configured (e.g., target 12 attendances, ends in 30 days) | View Active Season widget on `/home`. | Shows season title (e.g. "Vassa Season 2026"), "30 Days Remaining", and progress bar matching user's attendance count against target. | Positive |
| **TC-HOME-08** | Offseason State | No active season exists in master data | All seasons have `isActive: false` | Log in and view `/home`. | `GET /api/home` returns `season: null`. Frontend displays offseason banner without throwing null pointer error; progress bar is gracefully hidden. | Edge Case |
| **TC-HOME-09** | Operator Banner (Organizer/Admin) | Organizer views active event banner | User has role `organizer` or `admin`, an event has status `active` | 1. Log in as organizer.<br>2. Navigate to `/home`. | Amber banner *"Live Attendance Session Active: [Event Title]"* is prominently displayed with CTA *"Launch Camera QR Scanner"*, navigating to `/events/scan?eventId=:id`. | Positive / RBAC |
| **TC-HOME-10** | Operator Banner Access Isolation | Regular member views dashboard during active event | User has role `member`, an event has status `active` | 1. Log in as member.<br>2. Navigate to `/home`. | No operator banner or camera scanner CTA is rendered. Member only sees the event in the upcoming/live list as an attendee. | Security / RBAC |
| **TC-HOME-11** | Daily Dhamma Widget | Verse display, refresh, and share | On `/home` page | 1. Verify verse text, chapter, and verse number.<br>2. Click refresh icon button.<br>3. Click copy/share icon button. | 1. Random Dhammapada verse rendered with English translation and Pali source.<br>2. New random verse loaded smoothly.<br>3. Verse text copied to clipboard with success toast notification. | Positive |
| **TC-HOME-12** | Recent Activities Ledger | Display recent attendances and point transactions | User attended 2 events recently | Check Recent Activity section on `/home`. | Displays list of last 3 attendances with event title, attendance method (`qr` / `manual`), timestamp, and points credited. | Positive |
| **TC-HOME-13** | Streak Counter Display | User has consecutive weekly attendances | User attended services for 4 consecutive weeks | Observe streak counter badge on hero card. | Displays `🔥 4 Weeks Streak`. Counter matches `calculateWeeklyStreak` backend algorithm accurately. | Positive |
| **TC-HOME-14** | API Envelope & Status Code | Validate `GET /api/home` standard envelope | Authenticated request with Bearer token | Send `GET /api/home` via curl or API client. | Response matches `{ status: "success", code: 200, message: "...", data: { profile, streak, season, events, activities } }`. No top-level leaks outside `data`. | Contract / Compliance |
| **TC-HOME-15** | Token Expiry / 401 Silent Refresh | Access token expires while viewing `/home` | Access token lifetime 15m passed, valid refresh cookie present | Trigger dashboard refresh or background re-fetch after token expiration. | Client interceptor transparently issues `POST /api/auth/refresh`, obtains new access token, and retries `/home` without session termination. | Security / Edge Case |
| **TC-HOME-16** | Server Error / Offline Fallback | Backend service down or 500 Internal Error | Backend API unreachable or returns HTTP 500 | Open `/home`. | Skeleton loader stops; error banner displays *"Failed to load dashboard. Please try again."* with a functional "Retry" button. No white-screen crash. | Negative / Resilience |
| **TC-HOME-17** | Performance / Cache TTL | Rapid consecutive dashboard requests | Multiple requests within 5 seconds | Send 5 requests to `GET /api/home` within 2 seconds for same user. | Cached response returned within < 50ms without executing redundant Prisma database queries. | Performance |
| **TC-HOME-18** | Mobile Responsiveness & Touch Targets | Access `/home` on mobile viewport (375px width) | Mobile device viewport | 1. View layout on 375px width screen.<br>2. Tap "Show Member QR", "Events", and quick links. | Single-column layout renders cleanly; all touch targets meet minimum 44x44px; QR modal fits comfortably within screen boundaries without horizontal scroll. | UI/UX / Responsive |
