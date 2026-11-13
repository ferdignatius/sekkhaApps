# `prd-sekkha/` — Product Requirements Documents (PRD)

Kumpulan PRD yang menjadi **sumber kebenaran kebutuhan produk** sebelum implementasi kode dimulai. Setiap folder di sini berisi PRD untuk satu domain/fitur.

## Daftar PRD & Kontrak API

> 📌 **Master API Contract Terpadu**: Seluruh spesifikasi kontrak antarmuka API backend terintegrasi dalam satu dokumen tunggal di: **[`api-contract.md`](api-contract.md)**.

| Folder | Topik | Dokumen Kebutuhan (PRD) | Kontrak API Resmi (Master) | Status |
|--------|-------|-------------------------|----------------------------|--------|
| `general/auth/` | Sistem autentikasi (manual + OTP + JWT session), role matrix, & onboarding | [`general/auth/auth.md`](general/auth/auth.md), [`general/auth/onboarding.md`](general/auth/onboarding.md) | [`api-contract.md#modul-1-autentikasi-apiauth`](api-contract.md#modul-1-autentikasi-apiauth) | Approved (v2.1.0) |
| `general/users/` | Profil user, Digital Member Card, keamanan akun (2FA OTP), & verifikasi email claim | [`general/users/users.md`](general/users/users.md), [`general/users/profile-and-settings.md`](general/users/profile-and-settings.md), [`general/users/email-verification-for-account-claim.md`](general/users/email-verification-for-account-claim.md) | [`api-contract.md#modul-2-pengguna--profil-pribadi-apiusers`](api-contract.md#modul-2-pengguna--profil-pribadi-apiusers) | Approved (v2.3.0) |
| `home/` | Halaman beranda / dashboard gamifikasi (streak, poin, event terdekat, aktivitas) | [`home/home.md`](home/home.md) | [`api-contract.md#modul-3-beranda--dashboard-apihome`](api-contract.md#modul-3-beranda--dashboard-apihome) | Approved (v2.0.0) |
| `event/` | Event kebaktian + sistem presensi QR & batch point finalization | [`event/event.md`](event/event.md), [`event/abensiEvent.md`](event/abensiEvent.md) | [`api-contract.md#modul-4-acara--presensi-apievents`](api-contract.md#modul-4-acara--presensi-apievents) | Approved (v2.1.0) |
| `leaderboard/` | Season-based ranking + podium + snapshot kalkulasi | [`leaderboard/leaderboard.md`](leaderboard/leaderboard.md) | [`api-contract.md#modul-5-papan-peringkat--leaderboard-apileaderboard`](api-contract.md#modul-5-papan-peringkat--leaderboard-apileaderboard) | Approved (v2.0.0) |
| `peoples/` | Direktori anggota (People) + pre-provisioning & kredensial sementara | [`peoples/people-management.md`](peoples/people-management.md) | [`api-contract.md#modul-6-manajemen-umat--tim-apipeople`](api-contract.md#modul-6-manajemen-umat--tim-apipeople) | Approved (v2.0.0) |
| `pengurus/` | Community insights & Seva contributor leadership dashboard | [`pengurus/pengurus-analytics-and-pastoral.md`](pengurus/pengurus-analytics-and-pastoral.md) | [`api-contract.md#modul-7-analitik-pengurus--contributor-insights-apipengurus`](api-contract.md#modul-7-analitik-pengurus--contributor-insights-apipengurus) | Approved (v2.1.0) |
| `configure/masterdata/` | Master sekolah & statistik distribusi jemaat (`configure/schools.md`) | [`configure/masterdata/schools.md`](configure/masterdata/schools.md) | [`api-contract.md#modul-8-master-data-sekolah-apischools`](api-contract.md#modul-8-master-data-sekolah-apischools) | Approved (v2.0.0) |
| `configure/` | Master data UI, kategori event (`configure/masterdata/eventType.md`), & peran pelayanan (`configure/masterdata/badgeActivity.md`) | [`configure/configure.md`](configure/configure.md), [`configure/masterdata/eventType.md`](configure/masterdata/eventType.md), [`configure/masterdata/badgeActivity.md`](configure/masterdata/badgeActivity.md) | [`api-contract.md#modul-9-konfigurasi--master-data-apiconfigure`](api-contract.md#modul-9-konfigurasi--master-data-apiconfigure) | Approved (v2.0.0) |
| `gamification/` | Gamifikasi komunitas: aturan poin (`pointRules.md`), manajemen musim (`seasons.md`), & sistem streak keaktifan (`streak.md`) | [`gamification/pointRules.md`](gamification/pointRules.md), [`gamification/seasons.md`](gamification/seasons.md), [`gamification/streak.md`](gamification/streak.md) | [`api-contract.md#4-get-apiusersmestreak`](api-contract.md#4-get-apiusersmestreak) | Approved (v2.3.0) |
| `landing-page/` | Halaman publik pra-login (hero, features, CTA) | [`landing-page/landing-page.md`](landing-page/landing-page.md) | — | Approved (v2.0.0) |

## Tujuan Folder Ini

1. **Single source of truth** untuk Product Owner / stakeholders + engineer
2. **Beku** sebelum implementasi dimulai — perubahan harus lewat review PRD dulu
3. **Traceable** — setiap PR kode harus refer ke PRD/section tertentu (lihat skill `spec-driven-development`)
4. **Bukan dokumentasi teknis** — cara kerja API / struktur database ada di [`api-contract.md`](api-contract.md) dan `sekkha-frontend/`

## Format Standar Setiap PRD

PRD di repo ini mengikuti pola:

```md
# PRD: <Judul>

| Metadata | Detail |
| --- | --- |
| **Dokumen** | Product Requirement Document |
| **Fitur** | <nama fitur> |
| **Aplikasi** | Sekkha Apps |
| **Versi** | x.y.z |
| **Status** | Draft / Approved / Deprecated |

## 1. Ringkasan Eksekutif & Tujuan
## 2. Target Pengguna & Role System
## 3. User Stories / Use Cases
## 4. Functional Requirements
## 5. Non-Functional Requirements
## 6. Acceptance Criteria
## 7. Out of Scope
## 8. Open Questions
```

(Versi final setiap PRD boleh beda, tapi umumnya mengikuti pola di atas.)

## Cara Pakai

- **Sebelum mulai fitur**: baca PRD-nya dulu. Kalau belum ada, tulis PRD dengan format di atas (lihat skill `spec-driven-development`).
- **Saat implementasi**: pakai PRD sebagai acceptance criteria. Setiap task di `tasks/plan.md` harus trace ke PRD section.
- **Saat review**: PRD adalah acuan "apakah kita membangun hal yang benar".
- **Saat deprecation**: tandai status `Deprecated`, jangan hapus (lihat skill `deprecation-and-migration`).

## Hubungan dengan File Lain

```
prd-sekkha/general/auth/auth.md → kebutuhan (WHAT)
        ↓
prd-sekkha/api-contract.md      → master kontrak API (HOW - interface)
        ↓
sekkha-api/src/modules/auth/    → implementasi (HOW - code)
sekkha-frontend/src/modules/auth/
        ↓
tasks/plan.md                   → task breakdown (WORK)
```

## Konvensi Status

| Status | Arti |
|--------|------|
| `Draft` | Masih iterated, belum final |
| `Approved` | Disetujui, siap jadi acuan implementasi |
| `In Progress` | Sedang diimplementasi |
| `Shipped` | Sudah live |
| `Deprecated` | Tidak relevan lagi, tapi disimpan untuk audit |

Lihat juga: skill `spec-driven-development` di `.agents/skills/`, root `README.md`, [`prd-sekkha/api-contract.md`](api-contract.md).
