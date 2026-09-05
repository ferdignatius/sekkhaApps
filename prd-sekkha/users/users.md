# PRD: Users (Profil, Badge, Attendance, Streak, Level) — Sekkha Apps

| Metadata | Detail |
| --- | --- |
| **Dokumen** | Product Requirement Document (PRD) |
| **Fitur** | User Profile, Badges, Attendance History, Streak, Level |
| **Aplikasi** | Sekkha Apps (Frontend & Backend) |
| **Versi** | 1.0.0 |
| **Status** | Approved / Ready for Development |

---

## 1. Ringkasan Eksekutif & Tujuan

Modul **Users** adalah pusat **data personal** anggota: profil, badge yang dimiliki, attendance history, streak mingguan, dan level progres. Modul ini menyediakan endpoint **read** yang dipakai banyak halaman lain (Dashboard, Leaderboard, Profile).

### 🎯 Tujuan Utama
1. **Single source of user data**: satu service yang jadi referensi untuk semua data personal.
2. **Privacy**: hanya pemilik data yang bisa lihat field sensitif (email, phone, birth_date).
4. **Performance**: query di-cache (Redis) untuk data yang sering dibaca (level, streak).

---

## 2. Target Pengguna & Role

| Role | Akses |
| --- | --- |
| `umat` | ✅ Read data sendiri (full), Read data orang lain (publik only) |
| `aktivis` | ✅ Sama |
| `pengurus` | ✅ + read field internal (poin, streak, attendance count) anggota lain |
| `admin` | ✅ + edit data anggota lain (lihat `prd-sekkha/pengurus/peopleManagementAndAccountLinking.md`) |

---

## 3. Endpoint yang Disediakan

Berdasarkan `sekkha-api/src/modules/users/internal/router.ts` dan kontrak di `sekkha-api-contract.md`:

### 3.1. Profil Sendiri

| Method | Path | Deskripsi |
| --- | --- | --- |
| `GET` | `/api/users/me` | Ambil profil user yang sedang login |
| `PATCH` | `/api/users/me` | Update profil sendiri (field akademik, phone, dll) |

### 3.2. Badge, Attendance, Streak, Level

| Method | Path | Deskripsi |
| --- | --- | --- |
| `GET` | `/api/users/me/badges` | List badge yang dimiliki |
| `GET` | `/api/users/me/attendances` | Riwayat kehadiran (pagination) |
| `GET` | `/api/users/me/streak` | Data streak mingguan |
| `GET` | `/api/users/me/level` | Data level + progress ke level berikutnya |

---

## 4. User Stories

| ID | Sebagai | Saya ingin | Supaya |
| --- | --- | --- | --- |
| US-01 | Umat | Edit data akademik (sekolah, kelas) di profil | Lengkapi informasi personal |
| US-02 | Umat | Lihat koleksi badge saya | Bangga dengan achievement |
| US-03 | Umat | Lihat riwayat kehadiran | Tracking partisipasi |
| US-04 | Umat | Lihat progress level (current/next) | Motivasi untuk aktif |
| US-05 | Umat | Lihat streak minggu ini | Tahu apakah harus hadir minggu ini untuk pertahankan |
| US-06 | Pengurus | Lihat badge kolektif anggota (untuk rekap) | Statistik komunitas |

---

## 5. Functional Requirements

### 5.1. Field Kategorisasi

- **Publik**: `user_id`, `name`, `avatar_url`, `role`, `school_name`, `school_level`, `class_grade`, `joined_at`
- **Privat (owner only)**: `email`, `phone`, `birth_date`
- **Internal (pengurus/admin only)**: `points_total`, `streak_weeks`, `attendance_count_30d`, `badges_count`

Backend wajib strip field sesuai role pemanggil (lihat PRD `teams.md` §5.3 dan skill `security-and-hardening`).

### 5.2. Update Profil Sendiri

- User bisa update: `school_name`, `school_level`, `class_grade`, `phone`, `birth_date`, `avatar_url`.
- User **tidak bisa** update sendiri: `email` (butuh flow khusus), `role`, `status`.
- Validasi: `phone` format Indonesia (08xxx), `birth_date` parse ISO date.

### 5.3. Badge Display

- Response berisi badge yang sudah di-claim oleh user, plus **locked** badges (yang belum di-unlock) untuk motivasi.
- Tiap badge: `id`, `name`, `description`, `icon_url`, `color`, `category`, `is_earned`, `earned_at?`.

### 5.4. Attendance History

- Default 10 terakhir, bisa pakai cursor pagination.
- Tiap entry: `event_id`, `event_title`, `event_type`, `date`, `points_earned`.

### 5.5. Streak

- `current_weeks`: jumlah minggu berturut-turut user hadir ≥1 event.
- `best_weeks`: streak tertinggi sepanjang masa.
- `is_shield_active`: lihat PRD `leaderboard.md` §5.3.
- `last_attendance_date`: kapan terakhir hadir.

### 5.6. Level

- `current_level`: integer.
- `current_points`: total poin season aktif (atau sepanjang masa — perlu konfirmasi).
- `points_to_next_level`: sisa poin untuk naik.
- `next_level_info`: `{ level, points_required }` (null kalau sudah max level).

---

## 6. API Contract (Ringkas)

### 6.1. `GET /api/users/me`

**Response 200:**
```json
{
  "status": "success",
  "data": {
    "user_id": "202608200001",
    "name": "Budi Santoso",
    "email": "budi@sekkha.local",
    "avatar_url": "https://...",
    "role": "umat",
    "status": "active",
    "school_name": "SMA Dharma Widya",
    "school_level": "SMA/SMK",
    "class_grade": "Kelas 11",
    "phone": "081234567890",
    "birth_date": "2005-05-12",
    "joined_at": "2025-12-01T00:00:00Z"
  }
}
```

### 6.2. `PATCH /api/users/me`

**Request** (semua field optional):
```json
{
  "school_name": "SMA Dharma Widya",
  "school_level": "SMA/SMK",
  "class_grade": "Kelas 11",
  "phone": "081234567890",
  "birth_date": "2005-05-12",
  "avatar_url": "https://..."
}
```

**Response 200** (data user setelah update).

### 6.3. `GET /api/users/me/badges`

**Response 200:**
```json
{
  "status": "success",
  "data": {
    "earned": [
      { "id": "b001", "name": "First Step", "icon_url": "...", "color": "#ffd02f", "earned_at": "2026-01-15T..." }
    ],
    "locked": [
      { "id": "b042", "name": "Marathon", "description": "Hadir 10x berturut-turut" }
    ]
  }
}
```

### 6.4. `GET /api/users/me/attendances?limit=10&cursor=...`

**Response 200:**
```json
{
  "status": "success",
  "data": [
    { "event_id": "evt_123", "event_title": "Retreat Dhamma", "event_type": "retreat", "date": "2026-09-01", "points_earned": 50 }
  ],
  "meta": { "next_cursor": null, "total": 42 }
}
```

### 6.5. `GET /api/users/me/streak`

**Response 200:**
```json
{
  "status": "success",
  "data": {
    "current_weeks": 3,
    "best_weeks": 7,
    "is_shield_active": false,
    "last_attendance_date": "2026-09-01"
  }
}
```

### 6.6. `GET /api/users/me/level`

**Response 200:**
```json
{
  "status": "success",
  "data": {
    "current_level": 4,
    "current_points": 250,
    "points_to_next_level": 50,
    "next_level_info": { "level": 5, "points_required": 300 }
  }
}
```

---

## 7. UI/UX & NFR

1. **Cache level & streak** di Redis 5 menit (jarang berubah real-time).
2. **Caching invalidation** saat ada event baru (lihat `eventbus.subscribe("attendance.recorded", invalidate)`).
3. **Privacy UI**: di profil orang lain (lihat `teams.md`), field sensitif di-hide.

---

## 8. Acceptance Criteria

| ID | Skenario | Hasil yang Diharapkan |
| --- | --- | --- |
| **AC-01** | User login → GET `/api/users/me` | Response berisi data diri lengkap (termasuk email/phone untuk owner) |
| **AC-02** | User PATCH `/api/users/me` dengan field valid | Data ter-update, response 200 dengan data baru |
| **AC-03** | User PATCH `/api/users/me` dengan field invalid (phone format salah) | Response 400 dengan error message jelas |
| **AC-04** | User coba PATCH `/api/users/me` dengan `role` atau `email` | Backend tolak (403 atau 400, "field not editable") |
| **AC-05** | User GET `/api/users/me/badges` | Response berisi `earned` + `locked` |
| **AC-06** | User GET `/api/users/me/attendances` | Response berisi 10 entry terakhir + pagination cursor |
| **AC-07** | User GET `/api/users/me/streak` | Response berisi current/best weeks + shield status |
| **AC-08** | User tidak login | Semua endpoint return 401 |
| **AC-09** | Backend publish `attendance.recorded` event | Cache level/streak user ter-invalidate dalam 5 detik |

---

## 9. Out of Scope

- Privacy settings (user control field mana yang visible ke publik).
- Account deletion / soft-delete (lihat PRD `prd-sekkha/pengurus/peopleManagementAndAccountLinking.md`).
- Avatar upload (saat ini pakai URL eksternal; upload bisa jadi iterasi berikutnya).

---

## 10. Open Questions

1. `current_points` di level endpoint — apakah season-based atau all-time?
2. Apakah perlu endpoint `GET /api/users/:userId/badges` (publik) untuk lihat badge orang lain di halaman profil mereka?

---

## 11. Referensi

- `sekkha-api/src/modules/users/internal/router.ts` — endpoint
- `sekkha-frontend/src/modules/profile/` — UI consumption
- `prd-sekkha/profile/profile.md` — halaman profil UI
- `prd-sekkha/teams/teams.md` — view public data
- `prd-sekkha/leaderboard/leaderboard.md` — poin calculation
- `prd-sekkha/auth/auth.md` — registration & ID format
- Skill `security-and-hardening` — field stripping