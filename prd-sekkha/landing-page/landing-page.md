# PRD: Landing Page — Sekkha Apps

| Metadata | Detail |
| --- | --- |
| **Dokumen** | Product Requirement Document (PRD) |
| **Fitur** | Landing Page (Halaman Publik Pra-Login) |
| **Aplikasi** | Sekkha Apps (Frontend) |
| **Versi** | 1.0.0 |
| **Status** | Approved / Ready for Development |

---

## 1. Ringkasan Eksekutif & Tujuan

Halaman **Landing Page** (`/`) adalah **satu-satunya halaman publik** di Sekkha Apps — ditampilkan kepada pengunjung yang **belum login**. Tujuannya adalah memperkenalkan Vihara Tri Maha Dharma, fitur-fitur utama aplikasi, dan mengarahkan calon anggota untuk sign up.

### 🎯 Tujuan Utama
1. **First impression**: tampilkan value proposition dengan visual yang menarik, warna brand Sekkha (lihat `DESIGN.md`).
2. **Konversi sign-up**: arahkan user ke `/sign-up` lewat CTA banner dan navbar.
3. **Trust building**: tampilkan statistik komunitas (jumlah anggota, event per tahun) dan sample leaderboard.
4. **Aksesibilitas tinggi**: page ini publik (termasuk di-crawl Google), W3C compliant.

---

## 2. Target Pengguna & Role

| Role | Akses |
| --- | --- |
| `Visitor (Unauthenticated)` | ✅ View landing page |
| `member / activist / organizer / admin` (Authenticated) | Otomatis di-redirect ke `/home` |

Lihat `useAuthState` — hook cek token di localStorage; jika ada, di-redirect.

---

## 3. Komponen

Berdasarkan `sekkha-frontend/src/modules/landing-page/internal/components/`:

| Komponen | Tujuan |
| --- | --- |
| `LandingPage` | Root component — orchestrates semua section |
| `LandingNavbar` | Sticky top nav dengan logo + nav links + login/signup button + mobile drawer |
| `HeroSection` | Headline besar + subheadline + CTA utama |
| `FeatureSection` | Grid 5 feature cards (attendance, points, retreat, social, dhamma) |
| `StatsSection` | 4 stat angka besar (500+ anggota, 120+ event, dsb) |
| `EventsSection` | 4 sample event yang akan datang |
| `LeaderboardSection` | 5 sample top member (mock data) |
| `CTABanner` | Banner ajakan sign up di bagian bawah |
| `LandingFooter` | Footer dengan 3 kolom nav (Community, Programs, Information) |
| `useAuthState` | Hook deteksi status auth dari localStorage |
| `useScrollPosition` | Hook untuk efek navbar sticky/berubah saat scroll |
| `landingContent.ts` | Static data (headline, features, stats, events, leaderboard) — bukan dari API |

---

## 4. User Stories

| ID | As a | I want to | So that |
| --- | --- | --- | --- |
| **US-LAND-01** | Unauthenticated Visitor | Access `/` and view the hero section with core value proposition | I quickly understand what Sekkha Apps is and how it empowers Buddhist youth communities |
| **US-LAND-02** | Unauthenticated Visitor | Explore core features (attendance, karma points, retreats, dhamma quotes) | I recognize the practical and spiritual benefits of joining the community |
| **US-LAND-03** | Unauthenticated Visitor | View community milestone statistics (active members, annual events, streak records) | I gain trust and social proof regarding community vitality |
| **US-LAND-04** | Unauthenticated Visitor | Preview sample upcoming events and leaderboard showcase | I can see concrete ongoing activities and friendly competition within the temple |
| **US-LAND-05** | Unauthenticated Visitor | Click "Sign Up" or "Join Now" in the navbar, hero, or bottom CTA banner | I am directed seamlessly to `/sign-up` to create my account |
| **US-LAND-06** | Unauthenticated Visitor | Click "Sign In" / "Login" in the top navbar | I am directed directly to `/login` to access my existing account |
| **US-LAND-07** | Authenticated User | Navigate to `/` while logged in | I am automatically and instantly redirected to `/home` without viewing the public landing page |
| **US-LAND-08** | Mobile Visitor | Access `/` on mobile screen sizes | I experience a responsive layout with a smooth drawer navigation and tap-friendly touch targets |
| **US-LAND-09** | Assistive Tech User | Navigate the page using a keyboard or screen reader | I can skip directly to main content and navigate semantic landmarks smoothly |

---

## 5. Functional Requirements

### 5.1. Section Ordering

Susunan section di `LandingPage.tsx` (dipertahankan sebagai "official"):

```
Navbar (sticky)
↓
HeroSection
↓
FeatureSection
↓
StatsSection
↓
EventsSection
↓
LeaderboardSection
↓
CTABanner
↓
LandingFooter
```

### 5.2. Content Source (Static vs API)

| Section | Data Source | Alasan |
| --- | --- | --- |
| Hero, Features, Stats, CTA | `landingContent.ts` (static) | Marketing copy tidak berubah per request |
| Events, Leaderboard | `landingContent.ts` (mock) | TIDAK hit API di landing — sample untuk showcase |
| Footer | `landingContent.ts` (static) | Nav links + info vihara |

> **Penting**: halaman ini **tidak query ke API** untuk menghindari beban server & loading state. Semuanya hard-coded di `landingContent.ts`. Real event/leaderboard ada di `/events` dan `/leaderboard` setelah login.

### 5.3. Auth Redirect

- **Landing page** = route `/` (di TanStack Router config).
- `useAuthState` cek `localStorage.getItem('sekkha_access_token')`:
  - Ada token → status `authenticated` → redirect ke `/home`.
  - Tidak ada token → status `unauthenticated` → tetap di landing.
  - Token invalid (verify gagal) → status `unauthenticated` (perilaku ini bisa di-handle di router/loader).

### 5.4. CTA Behavior

- **Navbar CTA**:
  - Belum login: tombol "Masuk" (→ `/login`) + "Daftar" (→ `/sign-up`).
  - Sudah login: tombol "Buka Dashboard" (→ `/home`).
- **Hero CTA**: tombol "Daftar Sekarang" (→ `/sign-up`).
- **CTABanner**: tombol besar "Gabung Sekarang" (→ `/sign-up`).
- Jika route `/sign-up` tidak ada (404), tampilkan toast error via `setErrorMessage` di `LandingPage` (lihat existing code).

### 5.5. Accessibility (W3C)

1. **Skip to main content** link di paling atas (sr-only, muncul saat focus).
2. **Semantic HTML**: `<header>`, `<main>`, `<footer>`, `<nav>`, `<section>` dengan `aria-labelledby` ke heading.
3. **Color contrast**: minimal 4.5:1 untuk body text, 3:1 untuk heading (sesuai WCAG AA).
4. **Keyboard nav**: semua interaksi (CTA, nav link, mobile drawer) bisa diakses via Tab + Enter.
5. **Mobile drawer**: focus trap + Escape untuk close + return focus.
6. **Reduced motion**: hormati `prefers-reduced-motion` untuk animasi navbar/section.

### 5.6. SEO

- `<title>` dinamis: "Sekkha — Komunitas Remaja Vihara Tri Maha Dharma".
- Meta description sesuai subheadline.
- OpenGraph tag untuk share ke social media.
- `robots.txt` di `public/` (lihat PRD `prd-sekkha/general/users/profile-and-settings.md` untuk pattern).
- Lazy load images di bawah fold.

### 5.7. Internationalization (Future)

- Copy saat ini **English** di `landingContent.ts` (untuk audience English-speaking Buddhists).
- Struktur data siap i18n: semua string di data file, bukan hard-coded di JSX.
- Iterasi berikutnya: ekstrak ke dictionary untuk multi-bahasa (ID/EN).

---

## 6. API Contract

**Landing page tidak butuh endpoint baru.** Hanya reuses:
- `/api/auth/me` (untuk cek apakah token valid) — dipanggil via auth context, BUKAN langsung dari landing.

---

## 7. UI/UX & NFR

1. **Performance budget**: First Contentful Paint < 1.5s, Total Blocking Time < 200ms.
2. **Bundle size**: page ini jadi entry; gunakan code-split untuk section yang di bawah fold.
3. **Image optimization**: pakai `sekkha_logo.svg` (vector) untuk logo; lazy load untuk ilustrasi.
4. **Smooth scroll**: anchor links (`#features`, `#events`, `#leaderboard`) smooth scroll ke section.
5. **Sticky navbar**: berubah style (background solid + shadow) setelah scrollY > threshold (`useScrollPosition`).
6. **Responsive breakpoints**:
   - Mobile: < 768px (1 column, hamburger menu)
   - Tablet: 768–1024px (2 column grid untuk features)
   - Desktop: > 1024px (3 column grid untuk features)
7. **Test coverage**: ada unit test (LandingNavbar, FeatureSection, HeroSection, LandingFooter, StatsSection) dan PBT (LandingPage, LandingNavbar, getFeatureCardColor, truncateDescription).

---

## 8. Acceptance Criteria

| ID | Scenario | Expected result |
| --- | --- | --- |
| **AC-LAND-01** | Unauthenticated visitor opens `/` | Complete landing page renders: sticky navbar, hero section, features, stats, events showcase, sample leaderboard, CTA banner, and footer. |
| **AC-LAND-02** | Visitor scrolls down the page | Navbar remains sticky and dynamically transitions to a solid background with drop shadow when scrolled past threshold. |
| **AC-LAND-03** | Visitor clicks "Sign Up" CTA | Navigates to `/sign-up`; if missing, user receives non-blocking feedback. |
| **AC-LAND-04** | Visitor clicks "Sign In" in navbar | Navigates to `/login`. |
| **AC-LAND-05** | Authenticated user visits `/` | Automatically redirected to `/home` without landing page flicker. |
| **AC-LAND-06** | Mobile viewport (width < 768px) | Responsive single-column layout renders; hamburger button toggles accessible mobile drawer; touch targets ≥ 44px. |
| **AC-LAND-07** | Keyboard navigation | Pressing Tab initially focuses on sr-only "Skip to main content" link; all interactive elements reachable sequentially. |
| **AC-LAND-08** | In-page anchor navigation | Clicking navbar anchor links (`#features`, `#events`, `#leaderboard`) triggers smooth scrolling to designated sections. |
| **AC-LAND-09** | Static data isolation | Landing page executes zero backend database queries or heavy API calls; all showcase data is bundled in static content files. |
| **AC-LAND-10** | Route registration | Route `/` is registered in `routeTree.gen.ts` pointing to `LandingPage`. |

---

## 9. Test Cases (Matriks Pengujian Terinci)

| Test Case ID | Category | Scenario / Description | Preconditions | Test Steps | Expected Result | Type |
| --- | --- | --- | --- | --- | --- | --- |
| **TC-LAND-01** | Page Rendering | Unauthenticated visitor opens landing page root | No token in `localStorage` | Open `http://localhost:3000/`. | HTTP 200. Landing page renders fully with all sections (Hero, Features, Stats, Events, Leaderboard, CTA, Footer) in English. | Positive |
| **TC-LAND-02** | Auth Redirection | Authenticated member visits landing page root | Valid `sekkha_access_token` in `localStorage` | Open `http://localhost:3000/`. | `useAuthState` detects active session; user is immediately redirected to `/home` without flashing unauthenticated landing copy. | Security / Positive |
| **TC-LAND-03** | Corrupted Session Token | Visitor has malformed token string in `localStorage` | `sekkha_access_token` contains invalid/expired JWT string | 1. Set malformed token in `localStorage`.<br>2. Open `/`. | Auth check safely marks status as unauthenticated; visitor remains on landing page without uncaught runtime exception. | Edge Case / Resilience |
| **TC-LAND-04** | Navbar Sticky Scroll | Navbar transition on scroll | On landing page | 1. View initial navbar at top of page (`scrollY = 0`).<br>2. Scroll down past threshold (`scrollY > 20px`). | At top, navbar has transparent/translucent background. Past threshold, `useScrollPosition` applies solid background and subtle drop shadow. | UI/UX |
| **TC-LAND-05** | Primary CTAs (Sign Up) | Visitor clicks "Sign Up" from Navbar, Hero, and Bottom CTA Banner | Unauthenticated session | 1. Click "Sign Up" in navbar.<br>2. Click "Get Started" in Hero.<br>3. Click "Join Now" in CTABanner. | In all cases, client routes cleanly to `/sign-up`. | Positive |
| **TC-LAND-06** | Primary CTA (Sign In) | Visitor clicks "Sign In" in Navbar | Unauthenticated session | Click "Sign In" button in top navbar. | Client routes cleanly to `/login`. | Positive |
| **TC-LAND-07** | In-Page Anchor Smooth Scroll | Visitor clicks in-page section links | On desktop or mobile | 1. Click "Features" link.<br>2. Click "Events" link.<br>3. Click "Leaderboard" link. | Viewport scrolls smoothly to the corresponding section element with matched ID (`#features`, `#events`, `#leaderboard`). | Positive / UI |
| **TC-LAND-08** | Mobile Drawer Toggle | Mobile visitor opens and closes hamburger navigation menu | Mobile viewport (width 375px) | 1. Tap hamburger menu icon.<br>2. Observe drawer menu items.<br>3. Tap close icon or backdrop. | Drawer opens with smooth slide animation; menu links and Sign In/Sign Up buttons are displayed; tapping close dismisses the drawer cleanly. | Responsive / UI |
| **TC-LAND-09** | Mobile Touch Targets | Check touch targets on mobile screen | Viewport 375px width | Inspect touch target heights and paddings of buttons, links, and drawer items. | All interactive targets have minimum tap dimensions of 44x44px per WCAG guidelines. | Accessibility / Responsive |
| **TC-LAND-10** | Accessibility: Skip Link | Screen reader / keyboard user presses Tab at page load | Initial page load | Press Tab key immediately after page load. | "Skip to main content" link becomes visible with clear focus indicator; pressing Enter moves focus directly to `<main id="main-content">`. | Accessibility (a11y) |
| **TC-LAND-11** | Accessibility: Keyboard Traversal | Full keyboard traversal through interactive controls | On landing page | Press Tab key repeatedly through entire page. | Focus ring moves sequentially through logo, nav links, CTA buttons, feature cards, and footer links with no focus trap or lost focus state. | Accessibility (a11y) |
| **TC-LAND-12** | Mobile Drawer Esc Key & Focus Trap | Press Escape key while mobile drawer is open | Mobile drawer open | 1. Open mobile drawer via keyboard.<br>2. Press `Escape` key. | Drawer closes immediately; keyboard focus returns smoothly to the hamburger trigger button. | Accessibility / Edge Case |
| **TC-LAND-13** | Performance & Static Isolation | Verify no backend API requests initiated by landing page | Network tab open | Load landing page root `/`. | Zero calls made to backend database or dynamic endpoints (`/api/events`, `/api/leaderboard`). All content served statically from bundle. | Performance |
| **TC-LAND-14** | Content Cycle & Color Utility | Feature cards color cycling and text truncation | On landing page | 1. Inspect feature cards color accents.<br>2. Inspect descriptions with varying character lengths. | Colors cycle predictably through Sekkha brand palette; text truncation utilities prevent layout breaks on long text strings. | Robustness / PBT |
| **TC-LAND-15** | SEO Meta & Title Tags | Inspect HTML document metadata | In browser page head | Inspect `<title>` and `<meta>` elements. | Title contains community brand ("Sekkha — Komunitas Remaja Vihara Tri Maha Dharma"), meta description present, OpenGraph tags configured. | SEO |
| **TC-LAND-16** | Reduced Motion Mode | User enables `prefers-reduced-motion` in OS/browser | OS setting `prefers-reduced-motion: reduce` | Load landing page and scroll. | Animations and smooth scrolling transitions are suppressed or replaced with instant appearance. | Accessibility / NFR |

---

## 10. Out of Scope

- Form sign up / login di dalam landing page (menggunakan halaman dedicated).
- Akses ke data API real (event/leaderboard) — semua mock di `landingContent.ts`.
- Blog / news section.
- Testimonial carousel (bisa ditambah iterasi berikutnya).
- Multi-language toggle UI (string extraction ke dictionary).

---

## 11. Open Questions

1. Apakah perlu A/B testing framework untuk headline / CTA copy?
2. Apakah perlu integrasi analytics (Plausible/Umami) untuk tracking conversion?
3. Apakah perlu section "Pengurus Kami" (tim pengurus vihara)?

---

## 12. Referensi

- `sekkha-frontend/src/modules/landing-page/` — implementasi frontend
- `sekkha-frontend/src/routeTree.gen.ts` — route registration
- `sekkha-frontend/public/sekkha_logo.svg` — logo
- `DESIGN.md` (root) — design tokens (warna brand: Yellow #ffd02f, Blue #4262ff, Teal #0fbcb0)
- `RULES.md` (root) — modular boundary rules (LandingPage = modul independen, `navItems: []`)
- `prd-sekkha/general/auth/auth.md` — login/sign-up flow
- `prd-sekkha/home/home.md` — tujuan redirect setelah login
- Skill `frontend-ui-engineering` — a11y & performance
- Skill `browser-testing-with-devtools` — visual QA
