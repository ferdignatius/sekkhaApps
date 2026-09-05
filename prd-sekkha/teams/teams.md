# PRD: People / Teams Directory — Sekkha Apps

| Metadata | Detail |
| --- | --- |
| **Dokumen** | Product Requirement Document (PRD) |
| **Fitur** | Direktori People (Anggota Komunitas) |
| **Aplikasi** | Sekkha Apps (Frontend & Backend) |
| **Versi** | 1.0.0 |
| **Status** | Approved / Ready for Development |

---

## 1. Ringkasan Eksekutif & Tujuan

Halaman **People** (`/teams`, label menu "People") adalah direktori anggota komunitas. Tujuannya adalah membantu anggota saling mengenal satu sama lain dan pengurus memonitor struktur organisasi.

### 🎯 Tujuan Utama
1. **Saling mengenal**: anggota bisa lihat profil singkat anggota lain (nama, avatar, role, sekolah).
2. **Transparansi struktur**: pengurus bisa lihat distribusi role dan keaktifan anggota.
3. **Akses cepat ke profil**: dari daftar, klik untuk lihat detail (`MemberDetailPage` / `MemberDetailSheet`).

---

## 2. Target Pengguna & Role

| Role | Akses |
| --- | --- |
| `umat` | ✅ Lihat daftar anggota (read-only) |
| `aktivis` | ✅ |
| `pengurus` | ✅ + lihat info internal (poin, streak, dsb) |
| `admin` | ✅ + edit data anggota |

**Privasi**:
- Field sensitif (email, phone, birth_date) **tidak ditampilkan** ke `umat` / `aktivis`.
- Hanya profil publik yang ditampilkan: nama, avatar, role, school_name, school_level, class_grade.

---

## 3. Komponen

Berdasarkan `sekkha-frontend/src/modules/teams/internal/components/`:

| Komponen | Tujuan |
| --- | --- |
| `TeamsPage` | Halaman `/teams` — grid/list anggota dengan search bar + filter role |
| `MemberDetailSheet` | Bottom-sheet (mobile) / side-panel (desktop) untuk detail singkat |
| `MemberDetailPage` | Halaman detail anggota lengkap (`/teams/:userId`) |

Backend: `sekkha-api/src/modules/teams/internal/router.ts`

---

## 4. User Stories

| ID | Sebagai | Saya ingin | Supaya |
| --- | --- | --- | --- |
| US-01 | Umat | Melihat daftar anggota komunitas | Kenal anggota lain |
| US-02 | Umat | Mencari anggota berdasarkan nama | Cari teman sekelas / se-vihara |
| US-03 | Umat | Filter anggota berdasarkan role | Lihat aktivis atau pengurus |
| US-04 | Umat | Klik salah satu anggota | Lihat profil publik singkat |
| US-05 | Pengurus | Melihat poin & streak tiap anggota | Analisis keaktifan |
| US-06 | Admin | Mengedit data anggota dari halaman ini | Kelola data tanpa masuk DB |

---

## 5. Functional Requirements

### 5.1. Daftar (`TeamsPage`)

- **Grid card** di desktop (3-4 kolom), **list** di mobile.
- Tiap card: avatar + nama + role badge + school_name.
- **Search bar**: filter by name (case-insensitive, partial match).
- **Filter chips**: All / Umat / Aktivis / Pengurus / Admin.
- **Pagination**: 20 per halaman (cursor-based).

### 5.2. Detail

- **Mobile**: bottom sheet dari daftar (`MemberDetailSheet`).
- **Desktop**: side panel dari daftar, atau halaman `/teams/:userId` (`MemberDetailPage`).
- Isi detail (publik): avatar (besar), nama, role, school, class_grade, tanggal join.
- Isi detail (internal pengurus/admin): + poin, streak, attendance count bulan ini, badge count.

### 5.3. Privacy Boundary

Backend **wajib** strip field sensitif saat query oleh `umat` / `aktivis`. Lihat skill `security-and-hardening` — defense in depth (jangan percaya frontend untuk hide field).

---

## 6. API Contract (Ringkas)

### 6.1. `GET /api/teams/members`

**Query Params**:
- `search?` — partial match nama
- `role?` — filter (`umat` / `aktivis` / `pengurus` / `admin`)
- `limit?` — default 20
- `cursor?` — pagination

**Response 200:**
```json
{
  "status": "success",
  "data": [
    {
      "user_id": "202608200001",
      "name": "Budi Santoso",
      "avatar_url": "https://...",
      "role": "umat",
      "school_name": "SMA Dharma Widya",
      "school_level": "SMA/SMK",
      "class_grade": "Kelas 11"
    }
  ],
  "meta": { "next_cursor": null, "total": 124 }
}
```

### 6.2. `GET /api/teams/members/:userId`

**Response 200 (publik):**
```json
{
  "status": "success",
  "data": {
    "user_id": "...",
    "name": "Budi Santoso",
    "avatar_url": "...",
    "role": "umat",
    "school_name": "...",
    "school_level": "...",
    "class_grade": "...",
    "joined_at": "2025-12-01"
  }
}
```

**Response 200 (internal — pengurus/admin):**
```json
{
  "status": "success",
  "data": {
    /* semua field publik + */
    "email": "...",
    "phone": "...",
    "points_total": 250,
    "streak_weeks": 3,
    "attendance_count_30d": 8,
    "badges_count": 5
  }
}
```

---

## 7. UI/UX & NFR

1. **Avatar fallback**: initial nama di lingkaran dengan warna deterministik (hash nama → palette).
2. **Skeleton** saat loading, **empty state** saat search tidak ketemu.
3. **Aksesibilitas**: card clickable punya `role="button"`, navigasi keyboard support.
4. **Privacy UX**: untuk umat/aktivis, UI sembunyikan field sensitif (bukan cuma strip di backend).

---

## 8. Acceptance Criteria

| ID | Skenario | Hasil yang Diharapkan |
| --- | --- | --- |
| **AC-01** | User buka `/teams` | Grid card anggota tampil (max 20 per halaman) + search bar + filter chips |
| **AC-02** | User ketik "Budi" di search bar | List ter-filter real-time ke anggota dengan nama mengandung "Budi" |
| **AC-03** | User klik filter "Aktivis" | Hanya aktivis tampil |
| **AC-04** | User (umat) klik card "Budi" | Bottom sheet (mobile) / side panel (desktop) tampil dengan field publik saja (no email/phone) |
| **AC-05** | User (pengurus) klik card "Budi" | Side panel tampil + section "Aktivitas" dengan poin/streak |
| **AC-06** | User coba GET `/api/teams/members/:userId` via API untuk field sensitif (sebagai umat) | Backend return field publik only (email/phone di-strip) |
| **AC-07** | Search dengan keyword tidak ketemu | Empty state: "Tidak ada anggota yang cocok" |
| **AC-08** | Admin klik tombol "Edit" di MemberDetailPage | Form edit muncul (lihat PRD `prd-sekkha/pengurus/peopleManagementAndAccountLinking.md`) |
| **AC-09** | User tidak login coba akses `/teams` | Redirect ke `/login?redirectTo=/teams` |

---

## 9. Out of Scope

- Direct message / chat antar user.
- Follow / friend graph.
- Activity feed per user (bisa pakai `notificationsModule`).
- Export daftar ke CSV.

---

## 10. Open Questions

1. Apakah perlu fitur "anggota terdekat" (berdasarkan school / class_grade yang sama)?
2. Apakah pengurus butuh grouping custom (mis. "Kelompok Meditasi Selasa") yang bukan team built-in?

---

## 11. Referensi

- `sekkha-frontend/src/modules/teams/` — implementasi frontend
- `sekkha-api/src/modules/teams/internal/router.ts` — endpoint
- `prd-sekkha/profile/profile.md` — schema profil publik
- `prd-sekkha/pengurus/peopleManagementAndAccountLinking.md` — admin edit flow
- Skill `security-and-hardening` — field stripping di backend