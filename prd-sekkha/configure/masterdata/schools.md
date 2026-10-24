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

## 9. Acceptance Criteria

| ID | Skenario | Hasil yang Diharapkan |
| --- | --- | --- |
| **AC-01** | Umat mencari sekolah saat onboarding | Hanya sekolah berstatus `active` dan `is_active = true` yang muncul di dropdown. |
| **AC-02** | Umat memilih sekolah tipe `SMA/SMK` | Dropdown tingkatan kelas menampilkan pilihan: `Grade 10`, `Grade 11`, dan `Grade 12`. |
| **AC-03** | Umat memilih sekolah tipe `Universitas` atau `Umum` | Input tingkatan kelas otomatis disembunyikan/dibersihkan dari form. |
| **AC-04** | Umat mengajukan sekolah baru dengan tipe `SMA/SMK` | Data tersimpan di database dengan `status = "pending"` dan `requested_by = userId`. Umat dapat langsung menyelesaikan onboarding. |
| **AC-05** | Umat mengajukan sekolah yang namanya sudah terdaftar | API menolak dengan status HTTP `409 Conflict` atau pesan bahwa sekolah sudah ada. |
| **AC-06** | Pengurus menyetujui pengajuan sekolah (`approve`) | Status sekolah berubah menjadi `active`, `reviewed_by` tercatat, dan sekolah langsung muncul di autocomplete publik. |
| **AC-07** | Admin mencoba menghapus sekolah yang sudah memiliki anggota | Operasi ditolak dengan HTTP `409 Conflict`; Admin diarahkan menonaktifkan (`is_active = false`). |
| **AC-08** | Role `member` mencoba mengakses antrean review sekolah | Server menolak dengan HTTP `403 Forbidden`. |
