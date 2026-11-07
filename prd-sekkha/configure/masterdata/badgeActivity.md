# PRD: Master Data - Badge Activity (Lencana Aktivitas & Pelayanan)

| Metadata | Detail |
| --- | --- |
| **Document** | Product Requirement Document (PRD) |
| **Feature** | Master Data Badge Activity (Peran Pelayanan & Aktivitas Jemaat) |
| **Application** | Sekkha Apps - Configure Module & Events Module |
| **Version** | 1.0.0 |
| **Status** | Approved / Synchronized with Architecture |

---

## 1. Deskripsi

**Badge Activity (Lencana Aktivitas)** adalah master data klasifikasi peran pelayanan sukarela dan aktivitas jemaat dalam operasional kegiatan komunitas vihara (misalnya: Pemimpin Kebaktian/Puja, Pembawa Acara/MC, Pemain Musik/Organis, Operator Multimedia/Sound, Penerima Tamu/Usher, dan Relawan Lapangan).

Tujuan Badge Activity:
1. Menstandarisasi penugasan peran aktivitas dan pelayanan di vihara.
2. Menyediakan nilai apresiasi poin tambahan (**`bonus_points`**, acuan standar: `+30 Poin`) yang akan ditambahkan ke poin kehadiran standar saat jemaat bertugas.
3. Mempermudah organizer di layar rekap presensi acara untuk menetapkan badge peran jemaat cukup dengan memilih dari daftar master data.
4. Memberikan rekaman riwayat pelayanan jemaat untuk evaluasi keaktifan dan pastoral care pengurus.

Manajemen Master Data Badge Activity:
- `admin`: Kontrol penuh CRUD (Create, Read, Update, Delete/Deactivate).
- `organizer`: Hak baca (Read-only) untuk memilih peran saat presensi event.
- `activist` & `member`: Tidak memiliki akses ke konfigurasi master data ini.

---

## 2. Roles and Permissions

| Action | `admin` | `organizer` | `activist` | `member` |
| --- | :---: | :---: | :---: | :---: |
| View list and detail | Yes | Yes | No | No |
| Create new Badge Activity | Yes | No | No | No |
| Update (label, description, bonus points) | Yes | No | No | No |
| Activate or deactivate (`is_active`) | Yes | No | No | No |
| Delete (Unused only, tolak 409 jika in-use) | Yes | No | No | No |

---

## 3. Default Master Data (Seeding)

Berikut 3 peran aktivitas resmi yang di-seed saat inisialisasi sistem database:

| Code | Label | Default Bonus Points | Keterangan Operasional di Vihara |
| --- | --- | :---: | --- |
| `mc` | Master of Ceremony (MC) | 30 | Memandu jalannya susunan acara kebaktian / seminar / gathering. |
| `puja-leader` | Puja Leader | 30 | Memimpin pembacaan paritta, gatha, sutra, dan persembahan altar. |
| `musician` | Musician  | 30 | Mengiringi lagu Buddhis / meditasi dengan alat musik / keyboard. |

---

## 4. Data Model

### 4.1 Prisma Schema (`model BadgeActivity`)

```prisma
model BadgeActivity {
  id          String   @id @default(cuid())
  code        String   @unique
  label       String
  description String?
  bonusPoints Int      @default(30) @map("bonus_points")
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  attendances Attendance[]

  @@map("badge_activities")
}
```

### 4.2 Field Specification

| Field | Database Column | Type | Required | Rules & Constraints |
| --- | --- | --- | :---: | --- |
| `id` | `id` | `String (cuid)` | Yes | Primary Key, server-generated CUID. |
| `code` | `code` | `String` | Yes | Unique, lowercase kebab-case (`^[a-z0-9]+(?:-[a-z0-9]+)*$`). Dihasilkan otomatis oleh sistem dari nilai `label` (kebab-case otomatis) dan ditampilkan secara read-only di form. Tidak immutable: kode otomatis menyesuaikan dan tersinkronisasi saat label/nama peran diperbarui (dengan resolusi duplikasi otomatis). Relasi presensi tetap aman karena mengacu pada Primary Key `id`. |
| `label` | `label` | `String` | Yes | 1-100 karakter, nama peran aktivitas (misal: "Master of Ceremony"). |
| `description` | `description` | `String?` | No | Deskripsi tugas opsional, maksimal 500 karakter. |
| `bonus_points` | `bonus_points` | `Int` | Yes | Nilai integer antara 0 s/d 100, default `30`. |
| `is_active` | `is_active` | `Boolean` | Yes | Default `true`. Mengontrol ketersediaan opsi saat organizer memilih peran di event. |
| `created_at` | `created_at` | `DateTime` | Yes | Waktu pembuatan data (`now()`). |
| `updated_at` | `updated_at` | `DateTime` | Yes | Waktu pembaruan data (`updatedAt`). |

---

## 5. UI Requirements (Configure Module)

- **Route**: `/configure/master/badge-activity`
- **Menu Label di Sidebar**: **Badge Activity** (di bawah grup menu Master Data).
- **Tampilan**: **Responsive Clay Card Grid Layout** (`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`). Bebas tabel untuk fleksibilitas mobile, tablet, dan desktop.
- **Komponen Kartu**:
  - Judul / Nama Peran Aktivitas (`label`).
  - Badge Nilai Bonus: `+30 Pts` (warna amber/emas mencolok).
  - Badge Status: `Active` (hijau) atau `Inactive` (abu-abu).
  - Deskripsi tugas singkat.
  - Tombol aksi *"View Details / Edit"*.
- **Formulir Tambah & Edit (`/configure/master/badge-activity/new` & `/:id`)**:
  - Input `Label` (wajib).
  - Field `Code` (auto-generate kebab-case dari label, read-only; otomatis tersinkronisasi mengikuti perubahan label pada form edit).
  - Input `Bonus Points` (slider/input angka 0 s/d 100, default 30).
  - Textarea `Description` (opsional).
  - Switch Toggle `Active Status`.
  - Proteksi Hapus: Jika Badge Activity sudah pernah digunakan pada riwayat presensi jemaat (`attendances`), tombol hapus dinonaktifkan atau server menolak dengan HTTP `409 Conflict` (Admin diarahkan menonaktifkan status `is_active = false`).

---

## 6. API Contract

Base URL: `/api/configure/badge-activities`

### 6.1 Endpoints

| Method | Endpoint | Access Role | Description |
| --- | --- | --- | --- |
| `GET` | `/api/configure/badge-activities` | `organizer`, `admin` | Mengambil daftar Badge Activity aktif (dukungan filter `is_active`) |
| `GET` | `/api/configure/badge-activities/:id` | `organizer`, `admin` | Mengambil detail satu Badge Activity |
| `POST` | `/api/configure/badge-activities` | `admin` | Menambahkan Badge Activity baru (auto-code) |
| `PUT` / `PATCH` | `/api/configure/badge-activities/:id` | `admin` | Memperbarui label (otomatis menyesuaikan code), deskripsi, bonus points, atau status |
| `DELETE` | `/api/configure/badge-activities/:id` | `admin` | Menghapus Badge Activity (tolak 409 jika sudah in-use) |

---

## 7. User Stories

| ID | As a | I want to | So that |
| --- | --- | --- | --- |
| US-BA-01 | Admin | Create a new Badge Activity with auto-generated code, label, description, and bonus points | The community can formalize new service duty roles (e.g. Usher or Sound Engineer) |
| US-BA-02 | Admin | Update an existing Badge Activity's label, bonus points, or toggle active status | Master service duties stay aligned with community operational needs |
| US-BA-03 | Admin | Be prevented from deleting Badge Activities that are linked to attendance records | Past liturgy service history and earned bonus points remain immutable |
| US-BA-04 | Organizer | Select from active Badge Activities when recording event attendances | Serving members receive their role title and bonus karma points (+30 Pts) upon event closure |
| US-BA-05 | Member | View my earned service roles and bonus points in my attendance history | My seva contributions to the vihara are recognized and appreciated |
| US-BA-06 | Member / Activist | Be blocked from accessing master Badge Activity administrative endpoints | Liturgy service configuration cannot be tampered with by unauthorized roles |

---

## 8. Acceptance Criteria

| ID | Scenario | Expected result |
| --- | --- | --- |
| AC-BA-01 | Admin creates new Badge Activity with label "Audio Operator" | Code auto-generated as `"audio-operator"` in lowercase kebab-case; entity saved with bonus points (default 30); HTTP 201 returned. |
| AC-BA-02 | Organizer selects Badge Activity in event attendance form | Dropdown lists only records where `is_active = true`; deactivated roles are excluded. |
| AC-BA-03 | Admin deletes Badge Activity linked to attendance records | Server returns HTTP 409 Conflict with explanation; deletion blocked; admin guided to toggle `is_active = false`. |
| AC-BA-04 | Admin deletes unreferenced Badge Activity | Entity deleted from database successfully; returns HTTP 200/204 envelope. |
| AC-BA-05 | Admin updates label from "Audio Operator" to "Sound Engineer" | Live preview syncs code to `"sound-engineer"`; save updates DB record without breaking foreign key relations in `attendances`. |
| AC-BA-06 | User with role `member` or `activist` accesses master data endpoint | Request is rejected with HTTP 403 Forbidden envelope. |

---

## 9. Test Cases

| Test Case ID | Category | Scenario / Description | Preconditions | Test Steps | Expected Result | Type |
| --- | --- | --- | --- | --- | --- | --- |
| **TC-BA-01** | Create Badge | Create new badge activity with valid label and points | Authenticated as `admin` | Send `POST /api/configure/badge-activities` with `{ "label": "Multimedia Operator", "bonusPoints": 35 }`. | HTTP 201 envelope; `code` automatically set to `"multimedia-operator"`; saved with `isActive: true`. | Positive |
| **TC-BA-02** | Validation | Submit duplicate label / code | Badge with code `"mc"` already exists | Send `POST /api/configure/badge-activities` with `{ "label": "MC" }`. | HTTP 400 Bad Request or HTTP 409 Conflict envelope indicating duplicate code/name. | Negative / Integrity |
| **TC-BA-03** | Validation | Submit bonus points outside allowed range [0, 100] | Authenticated as `admin` | Send `POST /api/configure/badge-activities` with `{ "label": "Test Role", "bonusPoints": 150 }`. | HTTP 400 Bad Request envelope with Zod validation error (`bonusPoints must be <= 100`). | Negative / Boundary |
| **TC-BA-04** | Update & Sync | Update badge activity label and bonus points | Badge exists in DB | Send `PUT /api/configure/badge-activities/:id` with `{ "label": "Lead Musician", "bonusPoints": 40 }`. | HTTP 200 envelope; label and code updated to `"lead-musician"`; `attendances` foreign keys preserved via CUID ID. | Positive |
| **TC-BA-05** | Safe Deletion | Attempt deleting in-use badge activity | Badge activity is linked to >= 1 record in `attendances` | Send `DELETE /api/configure/badge-activities/:id`. | HTTP 409 Conflict envelope ("Badge activity cannot be deleted because it is already linked to attendance records. Deactivate it instead."). | Negative / Integrity |
| **TC-BA-06** | Safe Deletion | Delete unreferenced badge activity | Badge activity has 0 linked attendance records | Send `DELETE /api/configure/badge-activities/:id`. | HTTP 200 envelope; record removed from DB. | Positive |
| **TC-BA-07** | Soft Deactivation | Deactivate badge activity (`isActive: false`) | Active badge exists | Send `PATCH /api/configure/badge-activities/:id` with `{ "isActive": false }`. | HTTP 200 envelope; badge marked inactive. Dropped from event attendance selection query `?is_active=true`. | Positive |
| **TC-BA-08** | RBAC Guard | Organizer attempts to create or delete badge activity | Authenticated as `organizer` | Send `POST /api/configure/badge-activities` or `DELETE /api/configure/badge-activities/:id`. | HTTP 403 Forbidden envelope. No mutations applied. | Security / RBAC |
| **TC-BA-09** | RBAC Guard | Member or activist attempts to access badge activity list | Authenticated as `member` or `activist` | Send `GET /api/configure/badge-activities`. | HTTP 403 Forbidden envelope (`Access denied`). | Security / RBAC |
