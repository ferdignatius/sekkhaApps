# PRD: Configure (Master Data & Rules) — Sekkha Apps

| Metadata | Detail |
| --- | --- |
| **Dokumen** | Product Requirement Document (PRD) |
| **Fitur** | Configure — Master Data, Gamification Rules, Early Warning |
| **Aplikasi** | Sekkha Apps (Frontend & Backend) |
| **Versi** | 1.0.0 |
| **Status** | Approved / Ready for Development |

---

## 1. Ringkasan Eksekutif & Tujuan

Halaman **Configure** (`/configure/*`) adalah pusat **master data & aturan** sistem. Di sinilah admin/pengurus mengonfigurasi semua hal yang bersifat *foundational*: jenis event, badge, level, season, poin, threshold peringatan.

### 🎯 Tujuan Utama
1. **Sentralisasi aturan**: semua rule sistem ada di satu tempat, bukan hardcode.
2. **Read-only untuk pengurus**: pengurus bisa lihat tapi tidak bisa edit (kecuali admin).
3. **Full CRUD untuk admin**: satu-satunya role yang bisa tambah/edit/hapus master data.
4. **Tersembunyi untuk umat & aktivis**: tidak ada di sidebar mereka.

---

## 2. Target Pengguna & Role

| Role | Akses |
| --- | --- |
| `umat` | ❌ Menu Configure **tidak ditampilkan** |
| `aktivis` | ❌ Menu Configure **tidak ditampilkan** |
| `pengurus` | ✅ Read-only (lihat tapi tidak edit) |
| `admin` | ✅ Full CRUD |

Lihat `shell/registry.ts` — `configureModule` memiliki `configureSections` yang dirender di sidebar pengurus/admin.

---

## 3. Section & Sub-Menu

Berdasarkan `sekkha-frontend/src/modules/configure/internal/components/` dan `sekkha-frontend/src/modules/configure/index.ts`:

### 3.1. Master Data

| Halaman | Komponen | Isi |
| --- | --- | --- |
| `/configure/master/school` | `SchoolPage` | Direktori sekolah (lihat PRD `masterdata/schools.md`) |
| `/configure/master/event-type` | `EventTypePage` | Jenis event (kebaktian, retreat, meditasi, sosial) |
| `/configure/master/event-time` | `EventTimePage` | Preset waktu (Senin 18:00, Minggu 09:00, dll) |
| `/configure/master/attendance-badge` | `AttendanceBadgePage` | Badge yang diberikan saat presensi |

### 3.2. Gamification

| Halaman | Komponen | Isi |
| --- | --- | --- |
| `/configure/master/achievement` | `AchievementPage` | Master achievement (kondisi + hadiah) |
| `/configure/master/badge` | `BadgePage` | Master badge visual (icon, warna, kategori) |
| `/configure/master/level` | `LevelPage` | Threshold level (level N butuh X poin) |

### 3.3. Rules

| Halaman | Komponen | Isi |
| --- | --- | --- |
| `/configure/rules/season` | `SeasonPage` | Definisi season (nama, tanggal, aktif/tidak) |
| `/configure/rules/points` | `PointsRulesPage` | Aturan poin per event_type + multiplier |

### 3.4. Early Warning

| Halaman | Komponen | Isi |
| --- | --- | --- |
| `/configure/early-warning/threshold` | `ThresholdPage` | Threshold peringatan anggota berisiko (minggu tidak hadir, dsb) |

> Detail per sub-domain lihat PRD terkait di `prd-sekkha/masterdata/`.

---

## 4. User Stories

| ID | Sebagai | Saya ingin | Supaya |
| --- | --- | --- | --- |
| US-01 | Admin | Membuat event type baru | Tambah kategori kegiatan |
| US-02 | Admin | Edit poin untuk event "Retreat" | Sesuaikan reward untuk event berat |
| US-03 | Admin | Membuat season baru | Mulai periode leaderboard baru |
| US-04 | Admin | Edit threshold peringatan (3 minggu tidak hadir = risiko) | Atur sensitivitas early warning |
| US-05 | Pengurus | Melihat semua master data | Tahu aturan sistem, bantu jawab pertanyaan anggota |
| US-06 | Umat / Aktivis | (tidak punya akses) | Menu Configure tidak muncul di sidebar |

---

## 5. Functional Requirements

### 5.1. CRUD Generic

Setiap sub-halaman mengikuti pola:

- **List**: tabel dengan kolom sesuai entitas + filter + search + pagination.
- **Create**: modal/form dengan field sesuai schema + Zod validation.
- **Edit**: modal/prefill dengan data existing.
- **Delete**: konfirmasi dialog + soft-delete (field `deleted_at`) atau hard-delete sesuai kasus.

### 5.2. Permission Gate

Backend wajib enforce di setiap endpoint:

```ts
router.post("/master/event-type", requireAuth, requireRole("admin"), createEventType)
router.patch("/master/event-type/:id", requireAuth, requireRole("admin"), updateEventType)
router.delete("/master/event-type/:id", requireAuth, requireRole("admin"), deleteEventType)

// Read boleh pengurus:
router.get("/master/event-type", requireAuth, requireRole("pengurus", "admin"), listEventTypes)
```

Frontend hide tombol edit/delete untuk pengurus (defense in depth).

### 5.3. Audit Trail

Setiap perubahan master data **wajib** simpan audit log:

```
audit_logs:
  id, entity_type, entity_id, action, changed_by, changed_at, diff (JSONB)
```

Berguna untuk rollback dan compliance. Lihat skill `observability-and-instrumentation`.

### 5.4. Validasi Lintas Entitas

Contoh:
- Tidak bisa delete `EventType` kalau masih ada `Event` yang reference.
- Tidak bisa set `Season` baru `is_active=true` kalau sudah ada yang aktif (harus nonaktifkan dulu).

---

## 6. API Contract (Generic)

Tiap entitas master data mengikuti pola REST:

```
GET    /api/configure/<entity>          # list (auth + pengurus/admin)
GET    /api/configure/<entity>/:id      # detail
POST   /api/configure/<entity>          # create (admin only)
PATCH  /api/configure/<entity>/:id      # update (admin only)
DELETE /api/configure/<entity>/:id      # delete (admin only, soft/hard per entity)
```

Contoh payload (event-type):

```json
POST /api/configure/event-type
{
  "name": "Retreat",
  "description": "Retreat harian / mingguan",
  "base_points": 50,
  "color": "#4262ff",
  "icon": "Sparkles"
}
```

Response 201:
```json
{
  "status": "success",
  "data": { "id": "et_001", "name": "Retreat", /* ... */ }
}
```

---

## 7. UI/UX & NFR

1. **Layout konsisten**: tiap sub-halaman pakai shell yang sama (header + breadcrumb + table + action button).
2. **Konfirmasi destruktif**: delete pakai AlertDialog dengan required typed confirmation (mis. ketik "DELETE" untuk confirm).
3. **Empty state**: ilustrasi + CTA "Tambah [Entity] pertama".
4. **Loading**: skeleton table row.
5. **Aksesibilitas**: table semantic + sortable header (button dengan `aria-sort`).
6. **Responsive**: di mobile, table jadi card list.

---

## 8. Acceptance Criteria

| ID | Skenario | Hasil yang Diharapkan |
| --- | --- | --- |
| **AC-01** | Admin buka `/configure/master/event-type` | Tabel list event type tampil + tombol "Tambah Event Type" |
| **AC-02** | Admin klik "Tambah Event Type" | Modal form muncul dengan field name, description, base_points, color, icon |
| **AC-03** | Admin submit form valid | Event type baru tersimpan, muncul di list, toast "Berhasil disimpan" |
| **AC-04** | Admin submit form invalid (mis. base_points negatif) | Validasi inline muncul, submit dicegah |
| **AC-05** | Admin klik delete pada event type | Dialog konfirmasi muncul, required ketik "DELETE" untuk confirm |
| **AC-06** | Admin delete event type yang masih di-referensi oleh event | Backend return 400 dengan pesan, frontend tampil error toast |
| **AC-07** | Pengurus buka `/configure/master/event-type` | Tabel tampil tapi tombol Add/Edit/Delete **tidak ada** |
| **AC-08** | Umat login → lihat sidebar | Menu Configure **tidak muncul** |
| **AC-09** | Aktivis login → lihat sidebar | Menu Configure **tidak muncul** |
| **AC-10** | Setiap perubahan master data | Tercatat di `audit_logs` (lihat NFR §5.3) |
| **AC-11** | User tidak login coba akses `/configure/*` | Redirect ke `/login` |

---

## 9. Out of Scope

- Bulk import (CSV) untuk master data (bisa iterasi berikutnya).
- Versioning master data (rollback ke versi sebelumnya).
- Per-admin permission customization (semua admin punya hak setara).

---

## 10. Open Questions

1. Apakah perlu approval workflow untuk perubahan master data (mis. pengurus request → admin approve)?
2. Apakah perlu "draft mode" untuk perubahan yang di-schedule (mis. season baru aktif mulai tanggal X)?

---

## 11. Referensi

- `sekkha-frontend/src/modules/configure/` — implementasi frontend
- `sekkha-api/src/modules/configure/internal/router.ts` — endpoint
- `prd-sekkha/masterdata/badgePresensiEvent.md` — poin calculation
- `prd-sekkha/masterdata/eventType.md` — event type schema
- `prd-sekkha/masterdata/schools.md` — school directory (master data)
- `prd-sekkha/leaderboard/leaderboard.md` — season usage
- Skill `security-and-hardening` — role enforcement
- Skill `observability-and-instrumentation` — audit log