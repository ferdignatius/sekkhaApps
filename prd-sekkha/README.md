# `prd-sekkha/` — Product Requirements Documents (PRD)

Kumpulan PRD yang menjadi **sumber kebenaran kebutuhan produk** sebelum implementasi kode dimulai. Setiap folder di sini berisi PRD untuk satu domain/fitur.

## Daftar PRD & Kontrak API

> 📌 **Master API Contract Terpadu**: Seluruh spesifikasi kontrak antarmuka API backend terintegrasi dalam satu dokumen tunggal di: **[`api-contract.md`](api-contract.md)**.

| Folder | Topik | Dokumen Kebutuhan (PRD) | Kontrak API Resmi (Master) | Status |
|--------|-------|-------------------------|----------------------------|--------|
| `general/auth/` | Sistem autentikasi (manual + OTP + JWT session), role matrix | `auth.md` | [`api-contract.md#modul-1-autentikasi-apiauth`](api-contract.md#modul-1-autentikasi-apiauth) | Approved (v1.4.1) |
| `event/` | Event kebaktian + sistem presensi QR & SSE live stream | `event.md`, `abensiEvent.md` | [`api-contract.md#modul-4-acara--presensi-real-time-apievents`](api-contract.md#modul-4-acara--presensi-real-time-apievents) | Approved (v1.4.1) |
| `dashboard/` | Halaman dashboard gamifikasi (streak, poin, event, dhamma) | `dashboard.md` | [`api-contract.md#modul-3-beranda--dashboard-apihome`](api-contract.md#modul-3-beranda--dashboard-apihome) | Approved (v1.4.1) |
| `leaderboard/` | Season-based ranking + podium + snapshot kalkulasi | `leaderboard.md` | [`api-contract.md#modul-5-papan-peringkat--leaderboard-apileaderboard`](api-contract.md#modul-5-papan-peringkat--leaderboard-apileaderboard) | Approved (v1.4.1) |
| `teams/` | Direktori anggota (People) + claim PIN akun legacy | `teams.md` | [`api-contract.md#modul-6-manajemen-umat--tim-apipeople`](api-contract.md#modul-6-manajemen-umat--tim-apipeople) | Approved (v1.4.1) |
| `profile/` | Halaman profil user & gamifikasi personal | `profile.md` | [`api-contract.md#modul-2-pengguna--profil-pribadi-apiusers`](api-contract.md#modul-2-pengguna--profil-pribadi-apiusers) | Approved (v1.4.1) |
| `users/` | API user: profil, badge, attendance, streak, level, privasi | `users.md` | [`api-contract.md#modul-2-pengguna--profil-pribadi-apiusers`](api-contract.md#modul-2-pengguna--profil-pribadi-apiusers) | Approved (v1.4.1) |
| `schools/` | Master sekolah & statistik distribusi jemaat | `schools.md` | [`api-contract.md#modul-8-master-data-sekolah-apischools`](api-contract.md#modul-8-master-data-sekolah-apischools) | Approved (v1.4.1) |
| `configure/` | Master data UI, aturan poin, season, threshold | `configure.md` | [`api-contract.md#modul-9-konfigurasi--gamifikasi-master-apiconfigure`](api-contract.md#modul-9-konfigurasi--gamifikasi-master-apiconfigure) | Approved (v1.4.1) |
| `landing-page/` | Halaman publik pra-login (hero, features, CTA) | `landing-page.md` | — | Approved (v1.0.0) |
| `pengurus/` | Community insights & Seva contributor leadership dashboard | `pengurus-analytics-and-pastoral.md` | [`api-contract.md#modul-7-analitik-pengurus--early-warning-alerts-apipengurus`](api-contract.md#modul-7-analitik-pengurus--early-warning-alerts-apipengurus) | Approved (v2.1.0) |

## Tujuan Folder Ini

1. **Single source of truth** untuk Product Owner / stakeholders + engineer
2. **Beku** sebelum implementasi dimulai — perubahan harus lewat review PRD dulu
3. **Traceable** — setiap PR kode harus refer ke PRD/section tertentu (lihat skill `spec-driven-development`)
4. **Bukan dokumentasi teknis** — cara kerja API / struktur database ada di `prd-sekkha/api-contract.md` dan `sekkha-frontend/`

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
prd-sekkha/auth/auth.md        → kebutuhan (WHAT)
        ↓
prd-sekkha/api-contract.md     → master kontrak API (HOW - interface)
        ↓
sekkha-api/src/modules/auth/   → implementasi (HOW - code)
sekkha-frontend/src/modules/auth/
        ↓
tasks/plan.md                  → task breakdown (WORK)
```

## Konvensi Status

| Status | Arti |
|--------|------|
| `Draft` | Masih iterated, belum final |
| `Approved` | Disetujui, siap jadi acuan implementasi |
| `In Progress` | Sedang diimplementasi |
| `Shipped` | Sudah live |
| `Deprecated` | Tidak relevan lagi, tapi disimpan untuk audit |

Lihat juga: skill `spec-driven-development` di `.agents/skills/`, root `README.md`, `prd-sekkha/api-contract.md`.
