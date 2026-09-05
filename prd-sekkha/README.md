# `prd-sekkha/` — Product Requirements Documents (PRD)

Kumpulan PRD yang menjadi **sumber kebenaran kebutuhan produk** sebelum implementasi kode dimulai. Setiap folder di sini berisi PRD untuk satu domain/fitur.

## Daftar PRD

| Folder | Topik | File | Status |
|--------|-------|------|--------|
| `auth/` | Sistem autentikasi (manual + Google OAuth), role matrix | `auth.md` | Approved (v1.4.0) |
| `event/` | Event kebaktian + sistem absensi | `event.md`, `abensiEvent.md` | Approved |
| `dashboard/` | Halaman dashboard gamifikasi (streak, poin, event, dhamma) | `dashboard.md` | Approved (v1.0.0) |
| `leaderboard/` | Season-based ranking + podium + community goals | `leaderboard.md` | Approved (v1.0.0) |
| `notifications/` | In-app notification bell + halaman notifikasi | `notifications.md` | Approved (v1.0.0) |
| `teams/` | Direktori anggota (People) + detail profil publik | `teams.md` | Approved (v1.0.0) |
| `profile/` | Halaman profil user | `profile.md` | Approved |
| `users/` | API user: profil, badge, attendance, streak, level | `users.md` | Approved (v1.0.0) |
| `masterdata/` | Master data (badge presensi, event type, sekolah) | `badgePresensiEvent.md`, `eventType.md`, `schools.md` | Approved |
| `schools/` | ⚠️ Direktori master sekolah — **DEPRECATED**, pindah ke `masterdata/schools.md` | `schools.md` (stub) | Deprecated → `masterdata/schools.md` |
| `configure/` | Master data UI, gamification rules, early warning (admin/pengurus) | `configure.md` | Approved (v1.0.0) |
| `landing-page/` | Halaman publik pra-login (hero, features, CTA) | `landing-page.md` | Approved (v1.0.0) |
| `pengurus/` | People management + account linking | `peopleManagementAndAccountLinking.md` | Approved |

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