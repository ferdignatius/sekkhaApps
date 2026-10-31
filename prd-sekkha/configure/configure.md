# PRD: Configure (Master Data & Rules) — Sekkha Apps

| Metadata | Detail |
| --- | --- |
| **Dokumen** | Product Requirement Document (PRD) |
| **Fitur** | Configure — Master Data & Gamification Rules |
| **Aplikasi** | Sekkha Apps (Frontend & Backend) |
| **Versi** | 2.0.0 |
| **Status** | Approved / Ready for Development |

---

## 1. Ringkasan Eksekutif & Tujuan

Halaman **Configure** (`/configure/*`) adalah pusat **master data & aturan** sistem. Di sinilah `admin` dan `organizer` mengelola serta meninjau konfigurasi fondasi sistem: direktori sekolah, kategori kegiatan (*event types*), peran pelayanan (*badge activities*), periode musim (*seasons*), dan aturan poin (*point rules*).

### Tujuan Utama
1. **Sentralisasi aturan**: semua rule sistem ada di satu tempat, bukan hardcode.
2. **Read-only untuk `organizer`**: `organizer` bisa melihat seluruh master data namun tidak bisa menambah/mengedit/menghapus.
3. **Full CRUD untuk `admin`**: satu-satunya role yang bisa tambah/edit/hapus master data.
4. **Tersembunyi untuk `member` & `activist`**: tidak ada di sidebar mereka dan dilindungi oleh role guard.

---

## 2. Target Pengguna & Role

Menggunakan terminologi role Bahasa Inggris resmi: `member`, `activist`, `organizer`, `admin`.

| Role | Akses |
| --- | --- |
| `member` | ❌ Menu Configure **tidak ditampilkan** (`403 Forbidden`) |
| `activist` | ❌ Menu Configure **tidak ditampilkan** (`403 Forbidden`) |
| `organizer` | ✅ Read-only (lihat daftar & detail, tanpa aksi tambah/edit/hapus) |
| `admin` | ✅ Full CRUD |

Lihat `shell/registry.ts` — `configureModule` memiliki `configureSections` yang dirender di sidebar untuk `organizer` dan `admin`.

---

## 3. Section & Sub-Menu

Berdasarkan `sekkha-frontend/src/modules/configure/internal/components/` dan `sekkha-frontend/src/modules/configure/index.ts`:

### 3.1. Master Data

| Halaman | Komponen | Isi |
| --- | --- | --- |
| `/configure/master/school` | `SchoolPage` | Direktori sekolah & persetujuan pengajuan sekolah (lihat PRD `configure/masterdata/schools.md`) |
| `/configure/master/event-type` | `EventTypePage` | Kategori kegiatan vihara (kebaktian rutin, retreat, hari besar, sosial — lihat PRD `configure/masterdata/eventType.md`) |
| `/configure/master/badge-activity` | `BadgeActivityListPage` | Peran pelayanan kegiatan vihara (MC, Puja Leader, Musician, dll. — lihat PRD `configure/masterdata/badgeActivity.md`) |

### 3.2. Rules

| Halaman | Komponen | Isi |
| --- | --- | --- |
| `/configure/rules/season` | `SeasonPage` | Definisi periode musim papan peringkat (nama, tanggal, target absensi, aktif/tidak — lihat PRD `configure/seasons.md`) |
| `/configure/rules/points` | `PointsRulesPage` | Aturan perolehan poin per kategori aktivitas (lihat PRD `configure/pointRules.md`) |

---

## 4. User Stories

| ID | Sebagai | Saya ingin | Supaya |
| --- | --- | --- | --- |
| US-01 | `admin` | Membuat event type baru | Menambah kategori kegiatan vihara |
| US-02 | `admin` | Mengatur peran *Badge Activity* & bonus poin | Memberikan apresiasi poin tambahan bagi pelayan kebaktian |
| US-03 | `admin` | Membuat & mengaktifkan season baru | Memulai periode leaderboard baru |
| US-04 | `admin` | Mengedit nilai aturan poin (`point-rules`) | Menyesuaikan reward poin kegiatan secara dinamis |
| US-05 | `organizer` | Melihat semua master data & aturan poin | Mengetahui aturan sistem dan membantu menjawab pertanyaan anggota |
| US-06 | `member` / `activist` | (Tidak memiliki akses) | Menu Configure tidak muncul di sidebar |

---

## 5. Functional Requirements

### 5.1. CRUD Generic & Standar Desain Responsif

Setiap sub-halaman Master Data mengikuti pola arsitektur antarmuka Clay:

- **List View Responsif (Card Grid)**: Menggunakan **Responsive Clay Card Grid Layout (`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`)** menggantikan tabel statis konvensional. Desain ini memastikan:
  - Mobile (`< 640px`): Menumpuk vertikal 1 kolom (`grid-cols-1`), bebas clipping horizontal, dan memiliki target sentuh minimal 44px.
  - Tablet (`640px - 1024px`): 2 kolom (`sm:grid-cols-2`).
  - Desktop (`> 1024px`): 3 kolom (`lg:grid-cols-3`).
  - Setiap kartu memuat identitas visual entitas (aksen warna/badge), judul/nama jelas, parameter sistem, dan tombol aksi cepat di bagian bawah.
- **Pencarian & Filter**: Debounced search bar + horizontal chips filter kategori.
- **Create**: Formulir terstandarisasi dengan validasi Zod (`code` di-generate otomatis sistem dalam format kebab-case dari label tanpa membebani input manual pengguna).
- **Edit**: Halaman/modal prefill data existing dengan `code` berstatus read-only yang otomatis tersinkronisasi menyesuaikan perubahan nama/label (relasi database tetap terjaga karena berpegang pada Primary Key `id`).
- **Delete**: Konfirmasi dialog + validasi integritas relasi (pencegahan hard-delete dengan HTTP 409 Conflict jika entitas telah memiliki relasi aktif di sistem).

### 5.2. Permission Gate

Backend wajib enforce di setiap endpoint:

```ts
router.post("/event-types", requireAuth, requireRole("admin"), createEventType)
router.put("/event-types/:id", requireAuth, requireRole("admin"), updateEventType)
router.delete("/event-types/:id", requireAuth, requireRole("admin"), deleteEventType)

// Read boleh diakses oleh organizer & admin:
router.get("/event-types", requireAuth, requireRole("organizer", "admin"), listEventTypes)
```

Frontend menyembunyikan tombol tambah/edit/hapus untuk `organizer` (defense in depth).

### 5.3. Audit Trail

Setiap perubahan master data **wajib** simpan audit log:

```
audit_logs:
  id, entity_type, entity_id, action, changed_by, changed_at, diff (JSONB)
```

Berguna untuk rollback dan compliance. Lihat skill `observability-and-instrumentation`.

### 5.4. Validasi Lintas Entitas

Contoh:
- Tidak bisa delete `EventType` kalau masih ada `Event` yang mereferensikannya.
- Mengaktifkan satu `Season` (`POST /api/configure/seasons/:id/activate`) otomatis menonaktifkan `Season` aktif lainnya dalam satu transaksi.

---

## 6. API Contract (Generic)

Tiap entitas master data mengikuti pola REST di bawah `/api/configure`:

```
GET    /api/configure/<entity>          # list (auth + organizer/admin)
GET    /api/configure/<entity>/:id      # detail (auth + organizer/admin)
POST   /api/configure/<entity>          # create (admin only)
PUT    /api/configure/<entity>/:id      # update (admin only)
DELETE /api/configure/<entity>/:id      # delete (admin only)
```

Contoh payload (`event-types`):

```json
POST /api/configure/event-types
{
  "name": "Workshop & Pelatihan",
  "description": "Kelas keterampilan dan kepemimpinan pemuda",
  "default_point_reward": 75,
  "default_max_late_minutes": 30,
  "default_late_penalty_points": 15,
  "is_active": true
}
```

Response 201:
```json
{
  "status": "success",
  "code": 201,
  "data": { "id": "typ_001", "code": "workshop-pelatihan", "name": "Workshop & Pelatihan" }
}
```

---

## 7. UI/UX & NFR

1. **Layout konsisten**: tiap sub-halaman memakai shell yang sama (header + filter bar + responsive Clay card grid + action button).
2. **Konfirmasi destruktif**: delete memakai dialog konfirmasi.
3. **Empty state**: ilustrasi + CTA "Add First [Entity]".
4. **Loading**: skeleton card grid.
5. **Aksesibilitas**: elemen interaktif memiliki focus ring dan label ARIA yang jelas.
6. **Responsive**: card grid beradaptasi dari 1 kolom (mobile) hingga 3 kolom (desktop).

---

## 8. Acceptance Criteria

| ID | Skenario | Hasil yang Diharapkan |
| --- | --- | --- |
| **AC-01** | `admin` buka `/configure/master/event-type` | Daftar event type tampil + tombol "Add Event Category" |
| **AC-02** | `admin` klik "Add Event Category" | Form muncul dengan field name, description, default_point_reward, color, dll. |
| **AC-03** | `admin` submit form valid | Event type baru tersimpan, muncul di list, toast sukses tampil |
| **AC-04** | `admin` submit form invalid (mis. poin negatif) | Validasi inline muncul, submit dicegah |
| **AC-05** | `admin` klik delete pada entitas master data | Dialog konfirmasi muncul sebelum penghapusan |
| **AC-06** | `admin` delete event type yang masih direferensikan oleh event | Backend mengembalikan error, frontend menampilkan error toast |
| **AC-07** | `organizer` buka `/configure/master/event-type` | Daftar tampil dalam mode read-only tanpa tombol Add/Edit/Delete |
| **AC-08** | `member` login → lihat sidebar | Menu Configure **tidak muncul** |
| **AC-09** | `activist` login → lihat sidebar | Menu Configure **tidak muncul** |
| **AC-10** | Setiap perubahan master data | Tercatat di `audit_logs` (lihat NFR §5.3) |
| **AC-11** | User tidak login coba akses `/configure/*` | Redirect ke `/login` |

---

## 9. Out of Scope

- Bulk import (CSV) untuk master data.
- Versioning master data (rollback ke versi sebelumnya).
- Per-admin permission customization (semua `admin` punya hak setara).

---

## 10. Referensi

- `sekkha-frontend/src/modules/configure/` — implementasi frontend
- `sekkha-api/src/modules/configure/routes.ts` — endpoint backend
- `prd-sekkha/configure/masterdata/eventType.md` — spesifikasi kategori event
- `prd-sekkha/configure/masterdata/badgeActivity.md` — spesifikasi badge activity pelayanan
- `prd-sekkha/configure/masterdata/schools.md` — spesifikasi direktori sekolah
- `prd-sekkha/configure/pointRules.md` — spesifikasi aturan poin
- `prd-sekkha/configure/seasons.md` — spesifikasi season leaderboard
- `prd-sekkha/api-contract.md` — Master API Contract
