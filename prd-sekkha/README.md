# `prd-sekkha/` — Product Requirements Documents (PRD)

Kumpulan PRD yang menjadi **sumber kebenaran kebutuhan produk** sebelum implementasi kode dimulai. Setiap folder di sini berisi PRD untuk satu domain/fitur.

## Daftar PRD & Kontrak API

| Folder | Topik | Dokumen Kebutuhan (PRD) | Kontrak API Resmi | Status |
|--------|-------|-------------------------|-------------------|--------|
| `auth/` | Sistem autentikasi (manual + OTP + JWT session), role matrix | `auth.md` | [`api-contract.md`](auth/api-contract.md) | Approved (v1.4.1) |
| `event/` | Event kebaktian + sistem presensi QR & SSE live stream | `event.md`, `abensiEvent.md` | [`api-contract.md`](event/api-contract.md) | Approved (v1.4.1) |
| `dashboard/` | Halaman dashboard gamifikasi (streak, poin, event, dhamma) | `dashboard.md` | [`api-contract.md`](dashboard/api-contract.md) | Approved (v1.4.1) |
| `leaderboard/` | Season-based ranking + podium + snapshot kalkulasi | `leaderboard.md` | [`api-contract.md`](leaderboard/api-contract.md) | Approved (v1.4.1) |
| `notifications/` | In-app notification bell + riwayat notifikasi | `notifications.md` | [`api-contract.md`](notifications/api-contract.md) | Approved (v1.4.1) |
| `teams/` | Direktori anggota (People) + claim PIN akun legacy | `teams.md` | [`api-contract.md`](teams/api-contract.md) | Approved (v1.4.1) |
| `profile/` | Halaman profil user & gamifikasi personal | `profile.md` | [`api-contract.md`](profile/api-contract.md) | Approved (v1.4.1) |
| `users/` | API user: profil, badge, attendance, streak, level, privasi | `users.md` | [`api-contract.md`](users/api-contract.md) | Approved (v1.4.1) |
| `masterdata/` | Master data (badge presensi, event type, sekolah) | `badgePresensiEvent.md`, `eventType.md`, `schools.md` | [`api-contract.md`](masterdata/api-contract.md) | Approved (v1.4.1) |
| `schools/` | Master sekolah & statistik distribusi jemaat | `schools.md` | [`api-contract.md`](schools/api-contract.md) | Approved (v1.4.1) |
| `configure/` | Master data UI, aturan poin, season, threshold | `configure.md` | [`api-contract.md`](configure/api-contract.md) | Approved (v1.4.1) |
| `landing-page/` | Halaman publik pra-login (hero, features, CTA) | `landing-page.md` | — | Approved (v1.0.0) |
| `pengurus/` | Recency alerts (early warning), analitik vihara | `peopleManagementAndAccountLinking.md` | [`api-contract.md`](pengurus/api-contract.md) | Approved (v1.4.1) |

## Tujuan Folder Ini

1. **Single source of truth** untuk Product Owner / stakeholders + engineer
2. **Beku** sebelum implementasi dimulai — perubahan harus lewat review PRD dulu
3. **Traceable** — setiap PR kode harus refer ke PRD/section tertentu (lihat skill `spec-driven-development`)
4. **Bukan dokumentasi teknis** — cara kerja API / struktur database ada di `sekkha-api-contract.md` dan `sekkha-frontend/`

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
sekkha-api-contract.md         → kontrak API (HOW - interface)
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

Lihat juga: skill `spec-driven-development` di `.agents/skills/`, root `README.md`, `sekkha-api-contract.md`.