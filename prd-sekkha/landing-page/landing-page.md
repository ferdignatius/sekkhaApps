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
| `pengunjung (belum login)` | ✅ Lihat landing page |
| `umat / aktivis / pengurus / admin` (sudah login) | Otomatis di-redirect ke `/home` |

Lihat `useAuthState` — hook cek token di localStorage; jika ada, di-redirect.

---

## 3. Komponen

Berdasarkan `sekkha-frontend/src/modules/landing-page/internal/components/`:

| Komponen | Tujuan |
| --- | --- |
| `LandingPage` | Root component — orchestrates semua section |
| `LandingNavbar` | Sticky top nav dengan logo + nav links + login/signup button + mobile drawer |
| `HeroSection` | Headline besar + subheadline + CTA utama |
| `FeatureSection` | Grid 6 feature cards (attendance, points, retreat, social, dhamma, notifications) |
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

| ID | Sebagai | Saya ingin | Supaya |
| --- | --- | --- | --- |
| US-01 | Pengunjung baru | Mengakses `/` dan melihat hero dengan penjelasan singkat | Tahu apa itu Sekkha |
| US-02 | Pengunjung baru | Melihat fitur-fitur utama (attendance, points, retreat) | Paham manfaat gabung |
| US-03 | Pengunjung baru | Melihat statistik komunitas | Trust — banyak orang sudah gabung |
| US-04 | Pengunjung baru | Melihat sample event & top member | Paham aktivitas nyata di vihara |
| US-05 | Pengunjung baru | Klik "Daftar" di navbar / CTA banner | Pindah ke halaman sign up |
| US-06 | Pengunjung baru | Klik "Login" di navbar | Pindah ke halaman login |
| US-07 | User yang sudah login | Buka `/` | Otomatis redirect ke `/home` |
| US-08 | User di mobile | Buka `/` | Tampil rapi, hamburger menu, tap-friendly |
| US-09 | User dengan screen reader | Navigasi halaman | Bisa skip to main content (a11y) |

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
- `robots.txt` di `public/` (lihat PRD `prd-sekkha/profile/profile.md` §5.4 untuk pattern).
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

| ID | Skenario | Hasil yang Diharapkan |
| --- | --- | --- |
| **AC-01** | Pengunjung buka `/` (belum login) | Tampil landing page lengkap: navbar, hero, features, stats, events, leaderboard, CTA, footer |
| **AC-02** | Pengunjung scroll ke bawah | Navbar tetap visible (sticky) dan berubah style (background solid) |
| **AC-03** | Pengunjung klik "Daftar" di navbar | Pindah ke `/sign-up` |
| **AC-04** | Pengunjung klik "Masuk" di navbar | Pindah ke `/login` |
| **AC-05** | Pengunjung scroll ke CTA banner, klik "Gabung Sekarang" | Pindah ke `/sign-up` |
| **AC-06** | User yang sudah login buka `/` | Otomatis redirect ke `/home` (tanpa flash konten landing) |
| **AC-07** | Pengunjung di mobile (lebar 375px) | Tampil 1-column, hamburger menu, tap target ≥ 44px |
| **AC-08** | Pengunjung tekan Tab di awal page | Fokus pertama ke "Skip to main content" link |
| **AC-09** | Pengunjung tekan Tab dari keyboard | Semua CTA dan nav link bisa di-reach dengan Tab |
| **AC-10** | Pengunjung klik smooth scroll link (`#events`) | Scroll smooth ke EventsSection |
| **AC-11** | Test bundle | `pnpm test` (atau `npm test`) lulus untuk semua test landing-page (unit + PBT) |
| **AC-12** | `routeTree.gen.ts` | Route `/` terdaftar, mengarah ke `LandingPage` |
| **AC-13** | Pengunjung dengan JavaScript disabled | Lihat fallback minimal (hero text + link ke `/login`) — *optional, nice-to-have* |

---

## 9. Out of Scope

- Form sign up / login di dalam landing page (menggunakan halaman dedicated).
- Akses ke data API real (event/leaderboard) — semua mock di `landingContent.ts`.
- Blog / news section.
- Testimonial carousel (bisa ditambah iterasi berikutnya).
- Multi-language toggle UI (string extraction ke dictionary).

---

## 10. Open Questions

1. Apakah perlu A/B testing framework untuk headline / CTA copy?
2. Apakah perlu integrasi analytics (Plausible/Umami) untuk tracking conversion?
3. Apakah perlu section "Pengurus Kami" (tim pengurus vihara)?

---

## 11. Referensi

- `sekkha-frontend/src/modules/landing-page/` — implementasi frontend
- `sekkha-frontend/src/routeTree.gen.ts` — route registration
- `sekkha-frontend/public/sekkha_logo.svg` — logo
- `DESIGN.md` (root) — design tokens (warna brand: Yellow #ffd02f, Blue #4262ff, Teal #0fbcb0)
- `RULES.md` (root) — modular boundary rules (LandingPage = modul independen, `navItems: []`)
- `prd-sekkha/auth/auth.md` — login/sign-up flow
- `prd-sekkha/dashboard/dashboard.md` — tujuan redirect setelah login
- Skill `frontend-ui-engineering` — a11y & performance
- Skill `browser-testing-with-devtools` — visual QA