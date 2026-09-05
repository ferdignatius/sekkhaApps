# PRD: Leaderboard — Sekkha Apps

| Metadata | Detail |
| --- | --- |
| **Dokumen** | Product Requirement Document (PRD) |
| **Fitur** | Leaderboard (Season-based Ranking) |
| **Aplikasi** | Sekkha Apps (Frontend & Backend) |
| **Versi** | 1.0.0 |
| **Status** | Approved / Ready for Development |

---

## 1. Ringkasan Eksekutif & Tujuan

Leaderboard adalah **kompetisi sehat berbasis poin** yang di-reset per **musim (season)**. Tujuannya adalah memotivasi anggota untuk aktif mengikuti kegiatan vihara melalui gamifikasi — tanpa menghapus jejak sejarah.

### 🎯 Tujuan Utama
1. **Kompetisi sehat**: tampilkan ranking Top 3 dengan podium visual.
2. **Musim (Season)**: periode waktu (mis. 3 bulan) yang membatasi kompetisi. Setelah season berakhir, snapshot disimpan dan member mulai dari 0 lagi.
3. **Streak shield**: perlindungan streak untuk user yang konsisten hadir.
4. **Community goals**: target kolektif (mis. "1000 kehadiran bulan ini") yang memperkuat rasa kebersamaan.
5. **Transparansi**: tampilkan poin, urutan, dan delta (naik/turun) dibanding minggu lalu.

---

## 2. Target Pengguna & Role

| Role | Akses | Tampilan |
| --- | --- | --- |
| `umat` | ✅ | Lihat ranking global + posisi sendiri |
| `aktivis` | ✅ | Sama + filter "aktivis only" |
| `pengurus` | ✅ | + filter role + lihat distribusi poin |
| `admin` | ✅ | Sama dengan pengurus |

Private data (nomor HP, email) **tidak** ditampilkan. Hanya nama + avatar + poin + urutan.

---

## 3. Komponen & Alur

Berdasarkan `sekkha-frontend/src/modules/leaderboard/internal/components/LeaderboardPage.tsx` dan `sekkha-api/src/modules/leaderboard/internal/`:

### 3.1. Halaman Leaderboard (`/leaderboard`)

Layout:
- **Header**: judul "Leaderboard Musim [Nama]" + sisa waktu musim + progress bar community goal
- **Podium Top 3**: visual (avatar + nama + poin) — juara di tengah, juara 2/3 di kiri-kanan
- **Tabel Ranking 4-100**: list dengan avatar, nama, poin, delta (▲/▼ dibanding periode sebelumnya)
- **Posisi sendiri**: floating card di mobile ("Kamu di posisi #42 dengan 250 poin")

### 3.2. Backend Service

`internal/service.ts`:
- Hitung poin dari `attendances` + `badges` dalam window season aktif
- Ranking di-cache di Redis (lihat `internal/cron.ts` — recompute periodik)

---

## 4. User Stories

| ID | Sebagai | Saya ingin | Supaya |
| --- | --- | --- | --- |
| US-01 | Umat | Melihat posisi saya di ranking musim ini | Tahu seberapa aktif saya dibanding komunitas |
| US-02 | Umat | Melihat Top 3 podium | Terinspirasi untuk masuk Top 3 |
| US-03 | Umat | Melihat sisa waktu musim | Tahu deadline untuk push poin |
| US-04 | Umat | Melihat community goal | Merasa bagian dari target kolektif |
| US-05 | Umat | Melihat delta (naik/turun) minggu ini | Tahu tren saya |
| US-06 | Pengurus | Filter ranking berdasarkan role (umat/aktivis) | Analisis kontribusi tiap segmen |

---

## 5. Functional Requirements

### 5.1. Definisi Season

- Season dikonfigurasi di master data (`/configure/rules/season`).
- Field: `name`, `start_date`, `end_date`, `is_active`.
- Hanya 1 season `is_active=true` pada satu waktu.
- Cron job (lihat `internal/cron.ts`) mengecek periodik; saat `end_date` lewat, sistem:
  1. Snapshot ranking final ke tabel historis
  2. Tandai season `is_active=false`
  3. (Manual) Admin membuat season baru dan aktivasi

### 5.2. Perhitungan Poin

Formula (lihat `prd-sekkha/masterdata/badgePresensiEvent.md`):

```
poin_event_hadir  = base_points[event_type] × attendance_streak_multiplier
poin_badge_earned = badge.point_value (flat)
total_poin_user   = Σ poin_event_hadir (dalam window season) + Σ poin_badge_earned
```

- **`attendance_streak_multiplier`**: 1.0 (streak 0), 1.1 (streak 3-6), 1.25 (streak 7-13), 1.5 (streak ≥14)
- Perhitungan TIDAK real-time: recompute via cron tiap 5 menit.

### 5.3. Streak Shield

- Jika user **hadir event di 3 minggu terakhir secara berturut-turut**, streak dianggap **protected**.
- Saat user absen 1x karena alasan apapun, streak tidak reset (shield aktif 1x per musim).

### 5.4. Community Goals

- Target kolektif yang dikonfigurasi admin (mis. "500 kehadiran bulan ini").
- Progress = Σ semua attendance bulan ini / target.
- Ditampilkan sebagai progress bar di header leaderboard.

---

## 6. API Contract (Ringkas)

### 6.1. `GET /api/leaderboard`

**Query Params**:
- `season?` — slug season (default: active season)
- `role?` — filter role (`umat` / `aktivis` / `all`)
- `limit?` — default 100, max 200

**Response 200:**
```json
{
  "status": "success",
  "data": {
    "season": {
      "name": "Musim Semi 2026",
      "start_date": "2026-03-01",
      "end_date": "2026-05-31",
      "remaining_days": 42
    },
    "community_goal": {
      "label": "500 kehadiran bulan ini",
      "current": 287,
      "target": 500,
      "unit": "kehadiran"
    },
    "top_three": [
      { "rank": 1, "user_id": "...", "name": "Budi", "avatar_url": "...", "points": 1240, "delta": 0 },
      { "rank": 2, "user_id": "...", "name": "Sari", "points": 1180, "delta": 1 },
      { "rank": 3, "user_id": "...", "name": "Hendra", "points": 1050, "delta": -1 }
    ],
    "ranking": [ /* rank 4..N: { rank, user_id, name, points, delta, streak_weeks } */ ],
    "me": {
      "rank": 42,
      "points": 250,
      "delta": 3,
      "streak_shield_active": false
    }
  }
}
```

---

## 7. UI/UX & NFR

1. **Podium Top 3**: gunakan warna medali (emas/perak/perunggu) dari DESIGN.md.
2. **Delta indicator**: panah hijau ▲ untuk naik, merah ▼ untuk turun, gray — untuk tetap.
3. **Mobile**: podium stack vertikal (juara 1 di atas, 2/3 di bawah), tabel ranking bisa di-scroll.
4. **Aksesibilitas**: gunakan `<table>` semantic untuk ranking (bukan div soup).
5. **Performance**: response di-cache Redis selama 5 menit (lihat cron job).

---

## 8. Acceptance Criteria

| ID | Skenario | Hasil yang Diharapkan |
| --- | --- | --- |
| **AC-01** | User buka `/leaderboard` (season aktif ada) | Header menampilkan nama season + sisa hari + progress community goal |
| **AC-02** | Top 3 podium tampil | Juara 1 di tengah (lebih tinggi), Juara 2 & 3 di kiri-kanan |
| **AC-03** | Ranking 4-100 tampil | Tabel dengan avatar + nama + poin + delta |
| **AC-04** | User yang sedang login muncul di ranking | Card floating "Kamu di posisi #X dengan Y poin" |
| **AC-05** | User diurutkan naik-turun minggu ini | Indikator ▲/▼/— di samping poin |
| **AC-06** | Streak user ≥3 minggu berturut-turut | Badge "Streak Shield Active" di samping namanya |
| **AC-07** | User dengan role filter `aktivis` (admin/pengurus) | Ranking hanya menampilkan aktivis |
| **AC-08** | Belum ada season aktif | Halaman tampil empty state: "Musim baru segera dimulai" |
| **AC-09** | User tidak login coba buka `/leaderboard` | Redirect ke `/login?redirectTo=/leaderboard` |

---

## 9. Out of Scope

- Friend-to-friend challenge / private leaderboard.
- Pembelian poin / premium currency.
- Pencarian user di ranking.
- Notifikasi "kamu naik ke posisi X" (bisa jadi iterasi berikutnya via `notificationsModule`).

---

## 10. Open Questions

1. Apakah delta dihitung mingguan atau per-update cron (5 menit)?
2. Apakah ada konsep "Wild Card" — event di akhir musim yang poin-nya dobel?
3. Apakah perlu export ranking ke CSV untuk pengurus?

---

## 11. Referensi

- `sekkha-frontend/src/modules/leaderboard/` — implementasi frontend
- `sekkha-api/src/modules/leaderboard/internal/service.ts` — kalkulasi poin
- `sekkha-api/src/modules/leaderboard/internal/cron.ts` — recompute periodik
- `prd-sekkha/masterdata/badgePresensiEvent.md` — rumus poin
- `prd-sekkha/event/event.md` — data attendance