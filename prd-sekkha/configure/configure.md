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

| ID | As a | I want to | So that |
| --- | --- | --- | --- |
| US-CONF-01 | Admin | Create, update, and manage Event Types with default points, late penalties, and colors | I can standardize activity categories across the youth community schedule |
| US-CONF-02 | Admin | Configure Badge Activities with bonus points for seva service roles | Volunteers serving in liturgy roles (MC, Puja Leader, Musician) receive fair gamification rewards |
| US-CONF-03 | Admin | Create and activate seasons with collective community attendance targets | The community has structured competition cycles and reset milestones |
| US-CONF-04 | Admin | Tune predefined Point Rules within allowable bounds (0–100 points) and toggle active status | I can balance the points economy without code deployments or point inflation |
| US-CONF-05 | Admin | Manage school master data directory and approve or reject community school requests | Youth members can associate their profiles with verified educational institutions |
| US-CONF-06 | Organizer | Browse master data and system rules in read-only mode | I understand the community gamification policies without risking accidental configuration mutation |
| US-CONF-07 | Member / Activist | Be restricted from accessing `/configure/*` routes and administrative APIs | Master data configurations and gamification rules remain tamper-proof |

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

| ID | Scenario | Expected result |
| --- | --- | --- |
| AC-CONF-01 | Admin opens `/configure/master/event-type` | Event types list renders with "Add Event Category" button; read-only for organizer. |
| AC-CONF-02 | Admin creates master data with valid payload | Entity is saved to DB, unique code generated/validated, audit log recorded, HTTP 201 returned. |
| AC-CONF-03 | Admin submits invalid payload (negative point reward or duplicate unique code) | API returns HTTP 400 Bad Request; inline field validation errors displayed. |
| AC-CONF-04 | Admin toggles entity active status (`is_active = false`) | Soft deactivation succeeds; entity excluded from active dropdown selectors without breaking existing relations. |
| AC-CONF-05 | Admin attempts to hard delete entity referenced by existing events/attendances/profiles | API returns HTTP 409 Conflict error; deletion blocked to preserve relational integrity. |
| AC-CONF-06 | Admin activates a new custom season | In a database transaction, all other custom seasons are deactivated (`isActive = false`) ensuring at most 1 active season. |
| AC-CONF-07 | Organizer accesses configure sub-pages | Directory and rules display in read-only mode; Add/Edit/Delete actions hidden and blocked by server. |
| AC-CONF-08 | Member or activist accesses configure routes | Sidebar omits Configure; direct URL or API call receives HTTP 403 Forbidden. |
| AC-CONF-09 | Unauthenticated user opens `/configure/*` | Client redirects to `/login`; API responds with HTTP 401 Unauthorized. |

---

## 9. Test Cases

| Test Case ID | Category | Scenario / Description | Preconditions | Test Steps | Expected Result | Type |
| --- | --- | --- | --- | --- | --- | --- |
| **TC-CONF-01** | Navigation & RBAC | Admin accesses Configure navigation and sub-modules | Authenticated as `admin` | 1. Navigate to `/configure/master/school`.<br>2. Navigate to `/configure/rules/season`. | Both pages render full controls with creation, editing, and activation buttons visible. | Positive |
| **TC-CONF-02** | RBAC Read-Only | Organizer accesses Configure module | Authenticated as `organizer` | Navigate to `/configure/master/event-type` and `/configure/rules/points`. | Pages render in read-only mode; action buttons (Add, Edit, Delete, Toggle) hidden; direct API mutations return HTTP 403. | Security / RBAC |
| **TC-CONF-03** | RBAC Guard | Unauthorized member/activist access | Authenticated as `member` or `activist` | Navigate directly to `/configure/master/event-type` or send `GET /api/configure/event-types`. | Frontend redirects to `/home` or displays 403; API returns HTTP 403 Forbidden envelope. | Security / RBAC |
| **TC-CONF-04** | Master Data Deletion | Attempt hard delete on in-use master entity | Entity has linked foreign key records in `events` or `attendances` | Send `DELETE /api/configure/event-types/:id` on referenced entity. | HTTP 409 Conflict ("Cannot delete because entity is in use. Please deactivate it instead."). No data deleted. | Negative / Integrity |
| **TC-CONF-05** | Master Data Deletion | Hard delete unreferenced master entity | Entity has 0 linked records | Send `DELETE /api/configure/event-types/:id` on unreferenced entity. | HTTP 200/204 envelope; entity removed from DB; audit log recorded. | Positive |
| **TC-CONF-06** | Status Toggle | Soft delete / toggle active status (`is_active`) | Existing active entity | Send `PATCH /api/configure/event-types/:id` with `{ "is_active": false }`. | HTTP 200 envelope; `is_active` updated to `false`; entity hidden from creation dropdowns but preserved in historical reports. | Positive |
| **TC-CONF-07** | Unique Validation | Create master entity with duplicate unique name or code | Entity with same name/code exists | Send `POST /api/configure/event-types` with duplicate name/code. | HTTP 400 Bad Request or HTTP 409 Conflict envelope indicating duplicate identifier. | Negative |
| **TC-CONF-08** | Season Mutex | Activate custom season while another season is active | Season A is currently `is_active: true` | Send `POST /api/configure/seasons/:idB/activate`. | Season A updated to `is_active: false` and Season B updated to `is_active: true` in single Prisma `$transaction`. | Positive / Integrity |
| **TC-CONF-09** | Point Rules Tuning | Tune system point rule within allowed bounds (0–100) | Valid rule exists | Send `PATCH /api/configure/point-rules/:id` with `{ "points": 60 }`. | HTTP 200 envelope; rule points updated to 60. | Positive |
| **TC-CONF-10** | Point Rules Boundary | Attempt tuning point rule outside 0–100 bounds | Valid rule exists | Send `PATCH /api/configure/point-rules/:id` with `{ "points": 150 }`. | HTTP 400 Bad Request envelope with Zod validation error ("Points must be between 0 and 100"). | Negative / Security |
| **TC-CONF-11** | Unauthenticated | Guest calls configure endpoints | No session token | Send `GET /api/configure/schools`. | HTTP 401 Unauthorized envelope. | Security |

---

## 10. Out of Scope

- Bulk import (CSV) untuk master data.
- Versioning master data (rollback ke versi sebelumnya).
- Per-admin permission customization (semua `admin` punya hak setara).

---

## 11. Referensi

- `sekkha-frontend/src/modules/configure/` — implementasi frontend
- `sekkha-api/src/modules/configure/routes.ts` — endpoint backend
- `prd-sekkha/configure/masterdata/eventType.md` — spesifikasi kategori event
- `prd-sekkha/configure/masterdata/badgeActivity.md` — spesifikasi badge activity pelayanan
- `prd-sekkha/configure/masterdata/schools.md` — spesifikasi direktori sekolah
- `prd-sekkha/configure/pointRules.md` — spesifikasi aturan poin
- `prd-sekkha/configure/seasons.md` — spesifikasi season leaderboard
- `prd-sekkha/api-contract.md` — Master API Contract
