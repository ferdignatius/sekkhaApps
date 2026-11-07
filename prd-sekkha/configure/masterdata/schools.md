# PRD: Master Data - Schools

| Metadata | Detail |
| --- | --- |
| **Document** | Product Requirement Document (PRD) |
| **Feature** | Master Data Schools & School Request Workflow |
| **Application** | Sekkha Apps - Configure Module & Onboarding |
| **Version** | 2.1.0 |
| **Status** | Approved / Synchronized with Schema & Combined SMA/SMK Type |

---

## 1. Description

Master Data School (Sekolah / Kampus / Almamater) digunakan untuk identitas profil anggota (`UserProfile.schoolId`), proses registrasi onboarding, pencarian alumni/teman sebaya (peer community), serta analitik keaktifan umat berdasarkan institusi pendidikan.

Sistem Sekkha menggunakan **arsitektur tabel tunggal terintegrasi (`schools`)**:
1. Sekolah terverifikasi aktif memiliki status `approved` dan `is_active = true`. Sekolah ini langsung muncul pada input autocomplete/combobox di onboarding.
2. Ketika umat tidak menemukan sekolahnya, mereka dapat mengajukan permohonan pendaftaran sekolah baru saat onboarding. Pengajuan ini otomatis tercatat di tabel `schools` dengan status `pending` dan referensi `requested_by`.
3. Pengurus (`organizer` atau `admin`) dapat meninjau (review), menyetujui (`approve`), atau menolak (`reject`) sekolah yang diajukan.
4. Sekolah yang disetujui (`approved`) langsung aktif dan tersedia untuk dipilih oleh seluruh umat lainnya.

### Penggabungan Tipe SMA dan SMK (`SMA/SMK`)
Berdasarkan evaluasi demografi pemuda vihara, kategori **SMA** dan **SMK** disatukan menjadi satu tipe: **`SMA/SMK`**.
- **Alasan**: Jenjang pendidikan SMA dan SMK berada pada tingkatan setara (K-10 s/d K-12, rentang usia 15–18 tahun). Keduanya memiliki struktur kelas yang identik (Kelas 10, Kelas 11, Kelas 12).
- **Manfaat**: Menyederhanakan pilihan bagi umat saat onboarding, mencegah duplikasi entri institusi yayasan yang memiliki unit SMA dan SMK dalam satu kampus, serta memudahkan segmentasi kegiatan pemuda tingkat menengah atas.

---

## 2. Roles and Permissions

| Action | `admin` | `organizer` | `activist` | `member` |
| --- | :---: | :---: | :---: | :---: |
| Read active & approved schools (Onboarding & Profile) | Yes | Yes | Yes | Yes |
| Submit school request (Onboarding modal) | Yes | Yes | Yes | Yes |
| Read pending school requests queue | Yes | Yes | No | No |
| Approve pending school request | Yes | Yes | No | No |
| Reject pending school request | Yes | Yes | No | No |
| Create school directly (Master Data CRUD) | Yes | No | No | No |
| Update school (Name, Type, Status) | Yes | No | No | No |
| Activate or deactivate (`is_active`) | Yes | No | No | No |
| Delete school (Unreferenced only) | Yes | No | No | No |

*Catatan: Organizer hanya memiliki wewenang meninjau antrean pengajuan (Approve / Reject), sedangkan modifikasi langsung master data (Create/Edit/Delete) adalah hak eksklusif Admin.*

---

## 3. Supported School Types

Berikut 4 kategori tipe institusi resmi yang didukung:

| Code / Value | Display Label | Tingkat / Grade Level yang Berlaku |
| --- | --- | --- |
| `SMP` | Junior High School (SMP) | Kelas 7, Kelas 8, Kelas 9 |
| `SMA/SMK` | Senior & Vocational High (SMA/SMK) | Kelas 10, Kelas 11, Kelas 12 |
| `Universitas` | University / College | *Tidak ada pilihan kelas* |
| `Umum` | General / Other Institution | *Tidak ada pilihan kelas* |

---

## 4. Default Master Data

Sistem melakukan seeding awal pada database via `bun run db:seed` secara idempotens:

| Name | Type | Status | Is Active |
| --- | --- | --- | --- |
| SMP Strada Bakti Mulia | `SMP` | `active` | `true` |
| SMP Negeri 1 | `SMP` | `active` | `true` |
| SMK Bina Mandiri | `SMA/SMK` | `active` | `true` |
| Umum | `Umum` | `active` | `true` |
| Universitas Bunda Mulia | `Universitas` | `active` | `true` |
| Universitas Bina Nusantara | `Universitas` | `active` | `true` |
| Universitas Buddhi Dharma | `Universitas` | `active` | `true` |

---

## 5. Data Model

### 5.1 Prisma Schema (`model School`)

Skema database terintegrasi menggunakan enum `SchoolStatus` dan tabel `schools`:

```prisma
enum SchoolStatus {
  pending
  active
  cancel
}

model School {
  id          String       @id @default(cuid())
  name        String       @unique
  type        String?      // "SMP" | "SMA/SMK" | "Universitas" | "Umum"
  status      SchoolStatus @default(active)
  isActive    Boolean      @default(true) @map("is_active")
  requestedBy String?      @map("requested_by")
  reviewedBy  String?      @map("reviewed_by")
  createdAt   DateTime     @default(now()) @map("created_at")
  updatedAt   DateTime     @updatedAt @map("updated_at")

  profiles    UserProfile[]
  requester   User?        @relation("SchoolRequester", fields: [requestedBy], references: [id], onDelete: SetNull)
  reviewer    User?        @relation("SchoolReviewer", fields: [reviewedBy], references: [id], onDelete: SetNull)

  @@index([status])
  @@map("schools")
}
```

### 5.2 Field Specification

| Field | Column DB | Type | Required | Rules & Constraints |
| --- | --- | --- | :---: | --- |
| `id` | `id` | `String (cuid)` | Yes | Primary Key, server-generated CUID. |
| `name` | `name` | `String` | Yes | 2-100 karakter, unik case-insensitive (`@unique`). |
| `type` | `type` | `String?` | No | Pilihan resmi: `"SMP"`, `"SMA/SMK"`, `"Universitas"`, `"Umum"`. |
| `status` | `status` | `SchoolStatus` | Yes | Nilai enum: `pending`, `active`, `cancel`. Default: `active` (untuk master seeding/admin). |
| `is_active` | `is_active` | `Boolean` | Yes | Default `true`. Mengontrol kemunculan di autocomplete onboarding. |
| `requested_by` | `requested_by` | `String?` | No | ID User yang mengajukan jika berasal dari alur permohonan onboarding. |
| `reviewed_by` | `reviewed_by` | `String?` | No | ID Pengurus (Organizer/Admin) yang menyetujui atau menolak. |
| `created_at` | `created_at` | `DateTime` | Yes | Tanggal & waktu pembuatan data (`now()`). |
| `updated_at` | `updated_at` | `DateTime` | Yes | Tanggal & waktu pembaruan terakhir (`updatedAt`). |

### 5.3 Relasi Terkait

- **`UserProfile.schoolId`** $\rightarrow$ Menyimpan referensi CUID ke sekolah yang dipilih.
- **`UserProfile.school`** $\rightarrow$ Disediakan secara virtual di API response (`profile.school?.name`) untuk backward compatibility.
- **`School.profiles`** $\rightarrow$ Menghubungkan satu sekolah ke banyak profil anggota (`1:N`).

---

## 6. Request & Approval Flow

```text
Umat di Step 3 Onboarding
  │
  ├─► Mencari sekolah di SchoolCombobox
  │     └─► Sekolah ditemukan ──► Pilih & Simpan (Langsung terhubung)
  │
  └─► Sekolah tidak ditemukan
        └─► Klik "Request New School"
              └─► Mengisi Nama Sekolah & Tipe (Pilihan: SMP, SMA/SMK, Universitas, Umum)
                    └─► POST /api/configure/school-requests
                          └─► Data tersimpan di tabel `schools` (status = "pending")
                                │
                                ├─► Umat dapat langsung melanjutkan onboarding tanpa terblokir
                                │
                                └─► Masuk ke Antrean Review Pengurus (Organizer/Admin)
                                      ├─► ACCEPT ──► status = "approved", is_active = true
                                      │              (Sekolah kini muncul di pencarian publik)
                                      └─► REJECT ──► status = "rejected", is_active = false
```

### Aturan Bisnis Alur Pengajuan:
1. **Tidak Memblokir Registrasi**: Umat yang mengajukan sekolah baru tidak perlu menunggu persetujuan pengurus untuk menyelesaikan onboarding. Mereka dapat langsung masuk ke dashboard `/home`.
2. **Pengecekan Duplikasi**: Sebelum membuat entri `pending`, server memeriksa apakah nama sekolah (case-insensitive trimmed) sudah terdaftar. Jika sudah ada, sistem mengembalikan notifikasi bahwa sekolah telah terdaftar.
3. **Penyatuan SMA/SMK**: Jika pengguna mengetik nama sekolah kejuruan (misal: "SMK Cinta Kasih") atau umum (misal: "SMA 1"), pengguna memilih kategori `SMA/SMK`. Pilihan kelas yang muncul tetap Kelas 10, 11, dan 12.
4. **Perlindungan Integritas Data Relasional**:
   - Sekolah yang sudah memiliki anggota terhubung (`UserProfile.schoolId`) **dilarang di-hard delete** (API mengembalikan `409 Conflict`).
   - Admin hanya diperkenankan menonaktifkan sekolah (`is_active = false`). Sekolah yang dinonaktifkan tidak akan muncul di pencarian onboarding baru, tetapi histori anggota lama tetap terjaga utuh.

---

## 7. UI Requirements

### 7.1 Onboarding Component (`SchoolCombobox` & Modal)
- **SchoolCombobox**:
  - Mengambil daftar sekolah dengan `status = "active"` dan `is_active = true`.
  - Filter pencarian debounce (250ms) berbasis query string server-side.
  - Menampilkan badge tipe sekolah (`SMP`, `SMA/SMK`, `Universitas`, `Umum`).
  - Menampilkan badge social proof (jumlah umat dari almamater tersebut).
  - Empty state menampilkan tombol **"Request New School"**.
- **Modal "Request New School"**:
  - Input teks Nama Sekolah / Kampus (min. 2 karakter).
  - Dropdown pilihan tipe sekolah:
    - `Junior High (SMP)` $\rightarrow$ value: `"SMP"`
    - `Senior & Vocational High (SMA/SMK)` $\rightarrow$ value: `"SMA/SMK"`
    - `University` $\rightarrow$ value: `"Universitas"`
    - `General / Other` $\rightarrow$ value: `"Umum"`
  - Catatan informatif: *"Pengajuan akan berstatus Pending sampai diverifikasi oleh pengurus. Anda dapat melanjutkan proses onboarding sekarang tanpa menunggu persetujuan."*
  - Tombol aksi: `"Cancel"` dan `"Submit Request"`.

### 7.2 Configure Module Component (Admin & Organizer)
- **Route**: `/configure/master/school`
- **Responsive Layout**: Menggunakan **Responsive Clay Card Grid Layout** (`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`) menggantikan tabel konvensional untuk memastikan tampilan adaptif di mobile, tablet, dan desktop tanpa clipping horizontal atau scroll menyamping.
- **Kartu Direktori Sekolah**:
  - Judul/Nama Sekolah (bold, tautan ke detail sekolah `/configure/master/school/:id`).
  - Badge kategori jenjang (`SMP`, `SMA/SMK`, `Universitas`, `Umum`).
  - Indikator sosial proof: jumlah umat terhubung dari almamater tersebut dengan icon `Users`.
  - Status keaktifan (`Active` / `Inactive`) dan tombol aksi *"View Details"*.
- **Filter & Search**:
  - Filter jenjang menggunakan chip horizontal: `All`, `SMP`, `SMA/SMK`, `Universitas`, `Umum`.
  - Search bar interaktif dengan debounced search.
- **Tab Antrean Pengajuan (Pending Queue)**:
  - Tersedia bagi role `organizer` dan `admin`.
  - Card layout menampilkan nama sekolah yang diajukan umat, tipe almamater, requester name, dan tanggal pengajuan.
  - Aksi verifikasi: Tombol **Approve** (centang hijau) dan **Reject** (silang merah).
- **Master Data CRUD (Active Schools)**:
  - CRUD penuh eksklusif bagi role `admin`.
  - Tombol aksi *"Add School"* (`/configure/master/school/new`).

---

## 8. API Contract

Base URL: `/api/configure` (atau endpoint modular `/api/schools`)

### 8.1 Daftar Endpoint

| Method | Endpoint | Access Role | Description |
| --- | --- | --- | --- |
| `GET` | `/api/configure/schools` | All Authenticated | Pencarian daftar sekolah aktif untuk dropdown onboarding |
| `POST` | `/api/configure/school-requests` | All Authenticated | Mengajukan pendaftaran sekolah baru (status: `pending`) |
| `GET` | `/api/configure/schools/pending` | `organizer`, `admin` | Mengambil daftar permohonan sekolah berstatus `pending` |
| `POST` | `/api/configure/schools/:id/approve` | `organizer`, `admin` | Menyetujui pengajuan sekolah menjadi `active` |
| `POST` | `/api/configure/schools/:id/reject` | `organizer`, `admin` | Membatalkan/menolak pengajuan sekolah (`cancel`) |
| `POST` | `/api/configure/schools` | `admin` | Menambahkan master sekolah secara langsung |
| `PATCH` | `/api/configure/schools/:id` | `admin` | Mengubah data sekolah (Nama, Tipe `SMA/SMK`, dll.) |
| `DELETE` | `/api/configure/schools/:id` | `admin` | Menghapus sekolah (hanya jika belum ada relasi profil) |

### 8.2 Contoh Payload & Response

#### `POST /api/configure/school-requests` (Pengajuan Sekolah dari Onboarding)
**Request Body**:
```json
{
  "name": "SMK Bina Mandiri",
  "type": "SMA/SMK"
}
```

**Response (201 Created)**:
```json
{
  "status": "success",
  "code": 201,
  "message": "Pengajuan sekolah berhasil dikirim dan menunggu persetujuan",
  "data": {
    "id": "clysch001abc",
    "name": "SMK Bina Mandiri",
    "type": "SMA/SMK",
    "status": "pending",
    "is_active": true
  }
}
```

#### `GET /api/configure/schools?search=mandiri`
**Response (200 OK)**:
```json
{
  "status": "success",
  "code": 200,
  "message": "Schools retrieved successfully",
  "data": [
    {
      "id": "clysch001abc",
      "name": "SMK Bina Mandiri",
      "type": "SMA/SMK",
      "userCount": 14
    }
  ],
  "total": 1
}
```

---

## 9. User Stories

| ID | As a | I want to | So that |
| --- | --- | --- | --- |
| US-SCH-01 | Member | Search active schools via autocomplete or submit a request for an unlisted school during onboarding | I can complete my youth profile accurately without being blocked |
| US-SCH-02 | Member | Select my class grade (Grades 10–12) when selecting a school of type `SMA/SMK` | My academic demographic details are recorded for peer grouping |
| US-SCH-03 | Organizer / Admin | View the pending school request queue and approve or reject submissions | Crowdsourced institutions are verified before being exposed to all members |
| US-SCH-04 | Admin | Directly create, edit, or toggle school active status in the master directory | The institution directory remains clean, standardized, and up-to-date |
| US-SCH-05 | Admin | Be prevented from deleting schools that have linked member profiles | Existing youth profiles retain their academic institutional references without orphaned keys |
| US-SCH-06 | Member / Activist | Be restricted from administrative school review and master data modification endpoints | The institutional directory cannot be modified by regular members |

---

## 10. Acceptance Criteria

| ID | Scenario | Expected result |
| --- | --- | --- |
| AC-SCH-01 | Member searches schools in onboarding combobox | Dropdown returns only institutions with `status = "active"` and `is_active = true`. |
| AC-SCH-02 | Member selects `SMA/SMK` school type | Grade selector displays Grade 10, Grade 11, and Grade 12 options. |
| AC-SCH-03 | Member selects `Universitas` or `Umum` school type | Grade level selector is hidden and cleared from submission payload. |
| AC-SCH-04 | Member submits unlisted school request | Record saved in `schools` table with `status = "pending"` and `requestedBy = userId`; user proceeds without blockage. |
| AC-SCH-05 | Member submits duplicate school name (case-insensitive) | API returns HTTP 409 Conflict indicating school is already registered. |
| AC-SCH-06 | Organizer or admin approves pending school request | School `status` updates to `"active"`, `reviewedBy` recorded, school becomes available in public combobox. |
| AC-SCH-07 | Organizer or admin rejects pending school request | School `status` updates to `"cancel"`, `is_active` set to `false`, excluded from public combobox. |
| AC-SCH-08 | Admin attempts hard delete on school linked to user profiles | API returns HTTP 409 Conflict ("Cannot delete school linked to user profiles"); admin guided to soft deactivate. |
| AC-SCH-09 | Non-privileged user (`member` or `activist`) accesses pending review queue | Server returns HTTP 403 Forbidden envelope. |

---

## 11. Test Cases

| Test Case ID | Category | Scenario / Description | Preconditions | Test Steps | Expected Result | Type |
| --- | --- | --- | --- | --- | --- | --- |
| **TC-SCH-01** | Combobox Search | Search active verified schools by name substring | Schools with status `active` and `pending` exist | Call `GET /api/configure/schools?search=Bina`. | HTTP 200 envelope; only returns matching schools with `status = "active"` and `is_active = true`. | Positive |
| **TC-SCH-02** | School Request | Member submits new school request during onboarding | Authenticated as `member` | Send `POST /api/configure/school-requests` with `{ "name": "SMA Kristen 1", "type": "SMA/SMK" }`. | HTTP 201 envelope; school created with `status: "pending"`, `requestedBy` populated with caller ID. User can finish onboarding. | Positive |
| **TC-SCH-03** | Duplicate Name | Submit school request with existing name (case-insensitive) | School "SMA Kristen 1" already exists | Send `POST /api/configure/school-requests` with `{ "name": "sma kristen 1", "type": "SMA/SMK" }`. | HTTP 409 Conflict envelope ("School already registered"). Duplicate record prevented. | Negative / Integrity |
| **TC-SCH-04** | Review Queue | Organizer retrieves pending school requests | Authenticated as `organizer` or `admin` | Send `GET /api/configure/schools/pending`. | HTTP 200 envelope returning pending school requests with requester details. | Positive |
| **TC-SCH-05** | Approval Flow | Organizer approves pending school request | Pending school exists | Send `POST /api/configure/schools/:id/approve`. | HTTP 200 envelope; school `status` updated to `"active"`, `reviewedBy` recorded. Immediately searchable in onboarding. | Positive |
| **TC-SCH-06** | Rejection Flow | Organizer rejects pending school request | Pending school exists | Send `POST /api/configure/schools/:id/reject`. | HTTP 200 envelope; school `status` updated to `"cancel"`, `isActive` updated to `false`. | Positive |
| **TC-SCH-07** | Safe Deletion | Attempt hard delete on school linked to user profiles | School has linked records in `user_profiles` | Send `DELETE /api/configure/schools/:id`. | HTTP 409 Conflict envelope ("Cannot delete school because it is linked to user profiles. Please deactivate it instead."). | Negative / Integrity |
| **TC-SCH-08** | Safe Deletion | Delete unreferenced school | School has 0 linked user profiles | Send `DELETE /api/configure/schools/:id`. | HTTP 200 envelope; school deleted from DB. | Positive |
| **TC-SCH-09** | Soft Deactivation | Deactivate school via `isActive` toggle | School exists in DB | Send `PATCH /api/configure/schools/:id` with `{ "isActive": false }`. | HTTP 200 envelope; `isActive` set to `false`. Hidden from onboarding dropdown while existing user profiles remain intact. | Positive |
| **TC-SCH-10** | RBAC Review Queue | Member attempts to view pending review queue | Authenticated as `member` | Send `GET /api/configure/schools/pending`. | HTTP 403 Forbidden envelope (`Access denied`). | Security / RBAC |
| **TC-SCH-11** | RBAC Direct CRUD | Organizer attempts direct school creation / update | Authenticated as `organizer` | Send `POST /api/configure/schools` or `PATCH /api/configure/schools/:id`. | HTTP 403 Forbidden envelope (Direct master mutation restricted to `admin`). | Security / RBAC |
