# PRD: Landing Page — Sekkha Apps

| Metadata | Detail |
| --- | --- |
| **Dokumen** | Product Requirement Document (PRD) |
| **Fitur** | Landing Page (Halaman Publik Pra-Login) |
| **Aplikasi** | Sekkha Apps (Frontend) |
| **Versi** | 2.0.0 |
| **Status** | Approved / Ready for Development |

---

## 1. Ringkasan Eksekutif & Tujuan

Halaman **Landing Page** (`/`) adalah **halaman publik utama** di Sekkha Apps (bersama `/privacy`, `/login`, `/sign-up`, `/forgot-password`) — ditampilkan kepada pengunjung yang **belum login**. Tujuannya adalah memperkenalkan komunitas pemuda Vihara Tri Maha Dharma, menampilkan preview fitur-fitur aktual Sekkha Apps v2.x secara **100% statis (tanpa koneksi ke backend API)**, dan mengarahkan calon anggota untuk sign up atau sign in.

### Tujuan Utama
1. **First impression & Brand Alignment:** Menampilkan value proposition dengan visual Clay Design System (`#fffaf0` cream canvas, `#0a0a0a` primary ink, permukaan datar dengan hairline border) sesuai [DESIGN.md](../../DESIGN.md) v2.0.
2. **Product Accuracy (Sekkha v2.x):** Merepresentasikan fitur yang benar-benar ada di aplikasi (**Digital Member QR Card**, **Quick-Scan & Manual Attendance**, **Weekly Attendance Streak**, **Season-Based Leaderboard & Seva Service Duties**, **Daily Dhamma Wisdom**, dan **Verified Gmail OTP / Account Claim**) tanpa gamifikasi artifisial yang telah dieliminasi (`Level`, `XP`, `Badge Collection`, `Streak Shield`).
3. **Konversi sign-up & auth-gated exploration:** Mengarahkan pengunjung baru ke `/sign-up` atau `/login`, serta menjaga CTA *"View all upcoming events →"* tetap mengarah ke `/events` (terproteksi auth guard → mengarahkan pengunjung yang belum login ke `/login`).
4. **Static-Only Isolation:** Seluruh konten showcase (`landingContent.ts` dan `DashboardMockup.tsx`) bersifat statis lokal dan tidak pernah memicu request API ke backend database.
5. **Aksesibilitas & Bahasa UI:** 100% UI dan label aksesibilitas (`aria-label`, `sr-only`, toast error) menggunakan bahasa Inggris (`AGENTS.md`), memenuhi WCAG AA & Apple HIG (`≥ 44px` touch targets, `prefers-reduced-motion`).

---

## 2. Target Pengguna & Role

| Role | Akses |
| --- | --- |
| `Visitor (Unauthenticated)` | View landing page (`/`) & privacy policy (`/privacy`) |
| `member / activist / organizer / admin` (Authenticated) | Otomatis di-redirect ke `/home` (atau `/onboarding` jika `onboarding_completed === false`) oleh `IndexRouteComponent` |

---

## 3. Arsitektur Komponen

Berdasarkan `sekkha-frontend/src/modules/landing-page/`:

| Komponen / File | Tujuan |
| --- | --- |
| `LandingPage` | Root component — membungkus tree dengan `<MotionConfig reducedMotion="user">`, skip link, toast error English, dan mengorkestrasi semua section |
| `LandingNavbar` | Sticky top nav dengan logo + anchor links (`Events`, `Community`, `Leaderboard`) + `Sign In` / `Join for Free` + mobile drawer (`Escape` + focus trap) |
| `HeroSection` | Headline besar + subheadline + CTA (`Join for Free` → `/sign-up`, `Explore Events` → `#events`) + container `DashboardMockup` |
| `DashboardMockup` | Preview interaktif **Sekkha Workspace v2.x** (Digital Member Quick Card + QR ID, Active Season Progress & Weekly Streak, Interactive Check-In & Seva Duty simulator, Season Top 3 usernames, Daily Dhamma Wisdom, dan whiteboard sticky notes) |
| `FeatureSection` & `FeatureCard` | Grid simetris **6 feature cards** (`3×2` di desktop, `2×3` tablet, `1` kolom mobile) menggunakan Clay semantic color tokens |
| `StatsSection` | 4 stat angka komunitas statis (template/placeholder komunitas) dengan border hairline & `sr-only` heading berbahasa Inggris |
| `EventsSection` | 4 sample/dummy event dengan **jadwal evergreen** (bukan tanggal lampau), filter kategori interaktif (`≥ 44px`), radius `16px`, dan CTA langsung ke `/events` (auth-gated) |
| `LeaderboardSection` | 5 sample top member berbasis **Active Season** (`username` tanpa `Level` numerik/nama lengkap), memakai radius Clay & CTA ke `/leaderboard` |
| `CTABanner` | Banner ajakan sign up dengan kutipan Dhamma & tombol `Join for Free` |
| `LandingFooter` | Footer hangat berlatar `sekkha-surface` dengan 3 kolom nav; route yang belum tersedia sementara berstatus **disabled** (non-clickable, `aria-disabled="true"`), sedangkan anchor & `/privacy` tetap aktif |
| `PrivacyPolicyPage` & `PrivacyPolicyDocument` | Halaman publik `/privacy` (kepatuhan UU PDP No. 27/2022) |
| `useAuthState` & `useScrollPosition` | Hook deteksi status auth lokal & posisi scroll sticky navbar |
| `landingContent.ts` | Single source data statis landing page (hero, 6 features, 4 stats, evergreen events, season leaderboard, footer columns) |

---

## 4. User Stories

| ID | As a | I want to | So that |
| --- | --- | --- | --- |
| **US-LAND-01** | Unauthenticated Visitor | Access `/` and view the hero section and interactive workspace preview | I quickly understand Sekkha Apps' actual features (QR member card, weekly streaks, seasonal leaderboard, and Seva duties) |
| **US-LAND-02** | Unauthenticated Visitor | Explore the 6 core feature cards matching the live product | I clearly understand what members and organizers can do inside Sekkha |
| **US-LAND-03** | Unauthenticated Visitor | View static community statistics | I gain confidence in community vitality without waiting on backend queries |
| **US-LAND-04** | Unauthenticated Visitor | Filter sample upcoming/recurring events and preview the seasonal leaderboard | I see the rhythm of temple fellowship and click through to sign in before accessing `/events` or `/leaderboard` |
| **US-LAND-05** | Unauthenticated Visitor | Click "Join for Free" or "Sign In" from the navbar, hero, or CTA banner | I navigate cleanly to `/sign-up` or `/login` |
| **US-LAND-06** | Unauthenticated Visitor | Browse footer links cleanly without hitting broken 404 routes | Working links (`/privacy`, section anchors) work properly while unbuilt future pages are visibly disabled |
| **US-LAND-07** | Authenticated User | Visit `/` while logged in | I am automatically redirected to `/home` (or `/onboarding` if incomplete) |
| **US-LAND-08** | Mobile / Keyboard / Reduced-Motion User | Navigate on mobile, via keyboard, or with `prefers-reduced-motion` | Touch targets meet `≥ 44px`, mobile drawer traps focus, and motion animations respect OS reduced-motion settings |

---

## 5. Functional Requirements

### 5.1. Section Ordering

```
LandingNavbar (sticky)
↓
HeroSection (+ interactive DashboardMockup v2.x)
↓
FeatureSection (6 cards, 3x2 grid)
↓
StatsSection (4 static community stats)
↓
EventsSection (4 dummy evergreen events, CTA -> /events [auth-gated])
↓
LeaderboardSection (5 dummy season entries by @username, CTA -> /leaderboard [auth-gated])
↓
CTABanner (Dhamma quote + Join for Free)
↓
LandingFooter (3 columns; unimplemented links disabled)
```

### 5.2. Content Source (100% Static Isolation)

| Section | Data Source | Aturan |
| --- | --- | --- |
| Hero, Features, Stats, CTA | `landingContent.ts` (static) | Zero API request; 100% bundled client-side |
| Events Showcase | `landingContent.ts` (dummy/mock evergreen) | Zero API call; CTA *"View all upcoming events →"* mengarah langsung ke `/events` (terproteksi auth guard `_authenticated`) |
| Leaderboard Preview | `landingContent.ts` (dummy/mock season) | Zero API call; menggunakan `@username` (bukan nama lengkap/level numerik); CTA mengarah ke `/leaderboard` (auth-gated) |
| Workspace Preview | `DashboardMockup.tsx` (local interactive state) | Simulasi client-side check-in & Seva point preview tanpa hit API |
| Footer Navigation | `landingContent.ts` + `LandingFooter.tsx` | Anchor `#features`/`#events`/`#leaderboard` dan `/privacy` aktif; link halaman yang belum dibangun (`/about`, `/retreat`, `/social`, `/forum`, `/resources`, `/contact`, `/terms`, `/faq`) diberi flag `disabled: true` agar tidak menghasilkan 404 |

### 5.3. Auth Redirect & CTA Behavior

- Authenticated visitor di `/` → `IndexRouteComponent` mengarahkan ke `/home` (atau `/onboarding`).
- Unauthenticated visitor:
  - **Navbar**: `Sign In` (`/login`), `Join for Free` (`/sign-up`), atau pada viewport mobile inline `Sign In` + menu drawer.
  - **Events CTA**: `href="/events"` — user terautentikasi langsung masuk `/events`; user belum login otomatis dialihkan ke `/login?redirectTo=%2Fevents` oleh guard `_authenticated`.
  - **Leaderboard CTA**: `href="/leaderboard"` — perilaku auth guard identik dengan `/events`.
  - **Error toast**: Jika navigasi `/sign-up` gagal di `LandingPage`, tampilkan toast berbahasa Inggris: `"Sign-up page is currently unavailable."`.

### 5.4. Accessibility, Design System & UI Language

1. **100% English UI & A11y Labels:** Seluruh copy, error toast, `sr-only` heading (`"Youth Community Statistics"`), dan `aria-label` (`"Sekkha — Back to home"`, `"Open navigation menu"`, `"Close navigation menu"`) wajib berbahasa Inggris.
2. **DESIGN.md v2.0 Tokens:** Gunakan semantic tokens di `src/styles.css` (`bg-sekkha-canvas`, `bg-sekkha-surface`, `text-sekkha-ink`, `text-sekkha-slate`, `border-sekkha-hairline`, `bg-clay-*`), permukaan datar default tanpa glassmorphism berlebih (blur hanya untuk navbar scroll `> 64px` & overlay/drawer), radius `12px` (tombol) / `16px` (content card) / `24px` (feature card & banner).
3. **Touch Targets (`≥ 44px`):** Filter pill kategori event, CTA buttons, dan hamburger/drawer buttons memenuhi area sentuh minimum `44px`.
4. **Reduced Motion:** `LandingPage` menggunakan `<MotionConfig reducedMotion="user">` agar preferensi OS `prefers-reduced-motion: reduce` dipatuhi oleh semua animasi `motion/react`.

---

## 6. API Contract

**Landing page tidak memanggil endpoint API baru atau endpoint konten publik.** Satu-satunya cek auth dilakukan melalui state context auth (`sekkha_access_token`) tanpa fetch event, leaderboard, atau statistik dari database.

---

## 7. Acceptance Criteria

| ID | Scenario | Expected result |
| --- | --- | --- |
| **AC-LAND-01** | Unauthenticated visitor opens `/` | Complete static landing page renders (Navbar, Hero + v2.x DashboardMockup, 6 Features, Stats, Events Showcase, Seasonal Leaderboard, CTA Banner, Footer) in English with zero backend API calls. |
| **AC-LAND-02** | Interactive DashboardMockup showcase | Visitor can simulate QR attendance check-in / Seva duty (`+30 pts`) and see season progress update; no eliminated Level, XP, Badge Collection, or Streak Shield items appear. |
| **AC-LAND-03** | Events showcase CTA | Dummy events show evergreen schedules, category filter pills (`≥ 44px`) filter cards locally, and *"View all upcoming events →"* links directly to `/events` (auth-gated). |
| **AC-LAND-04** | Leaderboard preview privacy & accuracy | Displays `@username` entries and season points without numeric `Level` subtitles or full personal names. |
| **AC-LAND-05** | Disabled placeholder footer links | Unimplemented footer routes (`/about`, `/retreat`, `/social`, `/forum`, `/resources`, `/contact`, `/terms`, `/faq`) render as non-clickable disabled items (`aria-disabled="true"`), while `/privacy` and section anchors remain clickable. |
| **AC-LAND-06** | Navbar sticky scroll & mobile drawer | Scroll `0` = flat header without blur; `1–64px` = hairline border; `> 64px` = `backdrop-blur-md`; mobile drawer traps focus and closes on `Escape`. |
| **AC-LAND-07** | Language & DESIGN.md compliance | All visible copy and `aria-label` / `sr-only` strings are English; styling follows Clay tokens & flat surfaces; `<MotionConfig reducedMotion="user">` wraps animations. |

---

## 8. Out of Scope

- Endpoint API publik untuk event, leaderboard, atau statistik live pada landing page.
- Halaman baru untuk `/about`, `/retreat`, `/social`, `/forum`, `/resources`, `/contact`, `/terms`, atau `/faq` (tetap di-disable di footer sampai dibangun).
- Multi-language toggle UI (ID/EN).

---

## 9. Referensi

- `sekkha-frontend/src/modules/landing-page/` — implementasi modul frontend
- `sekkha-frontend/src/styles.css` — token Clay & Sekkha
- `DESIGN.md` — panduan visual & Apple HIG
- `AGENTS.md` — modular monolith, bahasa UI Inggris, TDD workflow
- `prd-sekkha/home/home.md` & `prd-sekkha/leaderboard/leaderboard.md` — aturan eliminasi gamifikasi artifisial & privasi username
