# PRD: Master Data - Event Type

| Metadata | Detail |
| --- | --- |
| **Document** | Product Requirement Document (PRD) |
| **Feature** | Master Data Event Type |
| **Application** | Sekkha Apps - Configure Module & Events Module |
| **Version** | 2.1.0 |
| **Status** | Approved / Synchronized with Schema & Implementation |

---

## 1. Description

Event Type mengklasifikasikan jenis kegiatan di komunitas pemuda Vihara Sekkha (misalnya kebaktian rutin, meditasi, retreat, bakti sosial, rapat panitia, dan pelatihan).

Event Type berfungsi untuk:
1. Mengelompokkan acara pada kalender dan daftar event.
2. Menyediakan nilai dasar poin kehadiran (`default_point_reward`) yang otomatis terisi saat organizer membuat event baru.
3. Menjadi acuan logika sistem gamifikasi (seperti perhitungan streak kehadiran kebaktian).
4. Memberikan identitas visual melalui warna tema badge (`color`).

Manajemen Event Type merupakan konfigurasi internal vihara:
- `admin`: Memiliki kontrol penuh CRUD (Create, Read, Update, Delete/Deactivate).
- `organizer`: Memiliki hak baca (Read-only) untuk memilih tipe event saat membuat kegiatan.
- `activist` & `member`: Tidak memiliki akses ke manajemen konfigurasi master data ini.

---

## 2. Roles and Permissions

| Action | `admin` | `organizer` | `activist` | `member` |
| --- | :---: | :---: | :---: | :---: |
| View list and detail | Yes | Yes | No | No |
| Create new Event Type | Yes | No | No | No |
| Update (label, color, points, etc.) | Yes | No | No | No |
| Activate or deactivate (`is_active`) | Yes | No | No | No |
| Delete (Unused only) | Yes | No | No | No |

*Catatan: API wajib menggunakan nilai string role resmi: `"admin"`, `"organizer"`, `"activist"`, `"member"`.*

---

## 3. Default Master Data

Berikut data default yang di-seed saat inisialisasi sistem:

| Code | Label | Color | Description | Default Points |
| --- | --- | --- | --- | ---: |
| `regular-puja` | Regular Puja | `#4262FF` | Kebaktian rutin mingguan pemuda vihara | 50 |
| `chanting` | Chanting | `#0D9488` | Sesi pelafalan paritta dan sutra kebajikan | 60 |
| `volunteer` | Volunteer | `#EC4899` | Kegiatan bakti sosial dan aksi kerelawanan pemuda | 80 |

Saat organizer memilih Event Type ketika membuat event baru:
1. `default_point_reward` otomatis mengisi nilai poin reward event tersebut.
2. Organizer dapat menyesuaikan nilai poin jika diizinkan aturan kegiatan.
3. Perubahan nilai default poin di master data tidak akan mengubah nilai poin pada event yang sudah dibuat sebelumnya (historical immutability).

---

## 4. Data Model

### 4.1 Prisma Schema (`model EventType`)

Tabel database menggunakan penamaan jamak `event_types`:

```prisma
model EventType {
  id                 String   @id @default(cuid())
  code               String   @unique
  label              String
  description        String?
  defaultPointReward Int      @default(0) @map("default_point_reward")
  isActive           Boolean  @default(true) @map("is_active")
  color              String
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("updated_at")

  events Event[]

  @@map("event_types")
}
```

### 4.2 Field Specification

| Field | Database Column | Type | Required | Rules & Constraints |
| --- | --- | --- | :---: | --- |
| `id` | `id` | `String (cuid)` | Yes | Primary Key, server-generated CUID. |
| `code` | `code` | `String` | Yes | Unique, lowercase kebab-case (`^[a-z0-9]+(?:-[a-z0-9]+)*$`), 2-50 chars. Dihasilkan otomatis oleh sistem dari nilai label (kebab-case otomatis) dan ditampilkan secara read-only di form. Terkunci & immutable setelah dibuat. |
| `label` | `label` | `String` | Yes | 1-100 chars, nama tampilan yang ramah pengguna (misal: "Regular Puja"). |
| `color` | `color` | `String` | Yes | Hex code warna CSS, validasi regex `^#[0-9A-Fa-f]{6}$`. |
| `description` | `description` | `String?` | No | Keterangan opsional, maksimal 500 karakter. |
| `default_point_reward` | `default_point_reward` | `Int` | Yes | Nilai integer antara 0 s/d 10.000, default `0`. |
| `is_active` | `is_active` | `Boolean` | Yes | Default `true`. Mengontrol ketersediaan opsi di form event. |
| `created_at` | `created_at` | `DateTime` | Yes | Otomatis dibuat oleh server (`now()`). |
| `updated_at` | `updated_at` | `DateTime` | Yes | Otomatis diperbarui saat mutasi data (`updatedAt`). |

---

## 5. Mengapa Perlu Field `code`? (Use Cases & Penjelasan Arsitektural)

Field `code` adalah **identifikator semantik permanen berbasis string (kebab-case)** yang terpisah dari `id` (teknis CUID) dan `label` (nama tampilan). Berikut use case nyata kegunaan `code` di Sekkha Apps:

### Case 1: Decoupling Antara Logika Sistem dan Nama Tampilan (Label)
- **Masalah**: Pengurus vihara sewaktu-waktu ingin mengganti nama tampilan acara di UI (misal: `"Regular Service"` diubah menjadi `"Kebaktian Pemuda Sekkha"` atau disesuaikan untuk kebutuhan bilingual).
- **Solusi dengan `code`**: Jika kode bisnis bergantung pada nama tampilan, penggantian nama akan merusak logika aplikasi. Dengan field `code` (`"regular-service"`), admin bebas mengubah `label` kapan saja tanpa merusak integrasi backend atau frontend.

### Case 2: Aturan Bisnis Gamifikasi & Streak Attendance yang Deterministik
- **Masalah**: Tidak semua event di vihara menambah streak mingguan kehadiran anggota. Rapat panitia, kelas pelatihan, atau gladi bersih tidak boleh dihitung sebagai kebaktian rutin mingguan.
- **Solusi dengan `code`**: Logika bisnis streak cukup mengecek secara aman:
  ```typescript
  if (event.type?.code === "regular-service") {
    // Jalankan kalkulasi penambahan streak & streak milestone badge
    await evaluateUserAttendanceStreak(userId)
  }
  ```
  Ini jauh lebih aman, bersih, dan cepat daripada mencocokkan ID CUID dinamis atau teks label yang rawan typo.

### Case 3: Integrasi API, Batch Import & Fallback Event Creation
- **Implementasi**: Di `sekkha-api/src/modules/events/services.ts`, saat membuat event baru, sistem mengizinkan klien mengirim `event_type_id` (CUID) ATAU `event_type` (`code`):
  ```typescript
  if (!eventTypeId && body.event_type) {
    const typeByCode = await prisma.eventType.findUnique({
      where: { code: body.event_type },
    })
    if (typeByCode) eventTypeId = typeByCode.id
  }
  ```
- **Manfaat**: Script integrasi eksternal, webhook form, atau batch CSV import tidak perlu melakukan round-trip query untuk mencari CUID internal database; mereka cukup menyertakan kode semantik seperti `"regular-service"` atau `"meditation"`.

### Case 4: Idempotent Database Seeding Antar Environment (Dev, Staging, Prod)
- **Masalah**: Server lokal, staging, dan production membuat ID CUID yang berbeda-beda saat diinisialisasi (`clx01...`, `clx99...`).
- **Solusi dengan `code`**: Script seed `prisma/seed.ts` dapat menggunakan operasi `upsert` yang aman dan idempotens:
  ```typescript
  await prisma.eventType.upsert({
    where: { code: "regular-service" },
    update: {},
    create: { code: "regular-service", label: "Regular Service", color: "#4262FF", defaultPointReward: 50 },
  })
  ```
  Data master selalu konsisten di semua lingkungan deployment.

### Case 5: Frontend Theming, Dynamic Badges & Icon Mapping
- **Implementasi**: Frontend dapat menggunakan `code` untuk memetakan styling visual dan icon khusus:
  ```typescript
  const EVENT_ICONS: Record<string, LucideIcon> = {
    "regular-service": FlameIcon,
    "meditation": HeartHandshakeIcon,
    "training": GraduationCapIcon,
    "social-charity": GiftIcon,
  }
  ```
  Komponen UI cukup merender icon yang sesuai dengan membaca `eventType.code`.

### Case 6: Human-Readable & Clean URL Query Filtering
- **Manfaat UX**: Di halaman kalender atau daftar event, parameter URL filter menjadi bersih dan mudah dibagikan:
  - Bagus: `/events?type=regular-service&season=2026-q1`
  - Buruk/Sulit dibaca: `/events?type=cly98zxc0001a1b2c3d4e5f6`

---

## 6. Validation and Business Rules

1. **Boundary Validation**: Validasi semua payload mutasi pada boundary controller menggunakan Zod `EventTypeSchema`.
2. **Immutability of `code`**: Setelah Event Type dibuat, nilai `code` tidak boleh diubah (read-only) untuk mencegah broken reference pada histori event dan logika streak.
3. **Regex Format**:
   - `code`: Wajib huruf kecil, angka, dan tanda hubung kebab-case: `^[a-z0-9]+(?:-[a-z0-9]+)*$`.
   - `color`: Wajib format warna hex 6 digit valid: `^#[0-9A-Fa-f]{6}$`.
4. **Soft Delete / Deactivation vs Hard Delete**:
   - Jika suatu Event Type sudah pernah digunakan oleh minimal satu data `Event`, maka **dilarang melakukan hard delete** (akan mengembalikan HTTP `409 Conflict` atau `400 Bad Request`).
   - Admin wajib menonaktifkannya (`is_active = false`).
5. **Daftar Pilihan Event Baru**: Event Type yang berstatus `is_active = false` otomatis disembunyikan dari daftar pilihan dropdown saat membuat event baru.
6. **Integritas Histori**: Event yang telah dibuat sebelumnya tetap menyimpan referensi ke Event Type meskipun Event Type tersebut kemudian dinonaktifkan.

---

## 7. UI Requirements

- **Route Administrasi**: `/configure/master/event-type`
- **Responsive Layout**: Menggunakan **Card Grid Layout Responsif** (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`) menggantikan tabel konvensional demi pengalaman pengguna yang ramah mobile, tablet, dan desktop tanpa clipping horizontal atau scroll menyamping:
  - Setiap kartu memuat:
    - Garis aksen visual warna tema di bagian atas kartu.
    - Status badge (`Active` / `Inactive`) di sudut kanan atas.
    - Judul/Label kegiatan dalam font tebal.
    - Kode semantik otomatis dalam format chip monospace.
    - Default poin reward dengan icon koin.
    - Deskripsi singkat kegiatan (maksimal 2 baris).
    - Footer aksi: tombol toggle status cepat, tombol edit (`/configure/master/event-type/:id`), dan tombol hapus (dengan konfirmasi).
- **Form Create**:
  - Input `label` (wajib).
  - Field `code` (read-only): Ditampilkan dalam keadaan terkunci (disabled) dengan live preview otomatis format kebab-case saat pengguna mengetik nama `label`. Pengguna tidak dapat mengedit field ini secara manual.
  - Color Picker murni (native color input) dengan preview swatch dan kode Hex (tanpa tombol preset warna statis).
  - Input `default_point_reward` (numeric spinner/input, min 0, max 10.000).
  - Toggle Switch `is_active`.
  - Textarea `description`.
- **Form Edit**:
  - Menampilkan `code` dalam keadaan terkunci permanen (disabled/read-only) dengan icon gembok dan penjelasan integritas data.
  - Memperbarui `label`, `color`, `default_point_reward`, `is_active`, dan `description`.
  - Color Picker murni (tanpa preset statis).
- **Aksi Hapus**: Tombol hapus dicegah dan memunculkan modal dialog penjelasan jika data sudah terhubung ke event yang ada (HTTP 409 Conflict), merekomendasikan opsi nonaktifkan saja.
- **Standar Aksesibilitas**: Minimum touch target 44px, kontras warna label memenuhi rasio WCAG AA.

---

## 8. API Contract

Base route: `/api/configure/event-types`

### 8.1 Endpoints

| Method | Endpoint | Access Role | Description |
| --- | --- | --- | --- |
| `GET` | `/api/configure/event-types` | `organizer`, `admin` | Mengambil seluruh daftar Event Type (opsional query `?is_active=true`) |
| `POST` | `/api/configure/event-types` | `admin` | Membuat Event Type baru (`code` otomatis digenerate jika kosong) |
| `PUT` | `/api/configure/event-types/:id` | `admin` | Mengubah label, color, points, is_active |
| `PATCH` | `/api/configure/event-types/:id` | `admin` | Alias parsial update untuk PUT |
| `DELETE` | `/api/configure/event-types/:id` | `admin` | Menghapus Event Type (jika belum pernah dipakai) |

### 8.2 Payload & Response Examples

#### `GET /api/configure/event-types`
**Response (200 OK)**:
```json
[
  {
    "id": "cly1a2b3c0000abcde",
    "code": "regular-puja",
    "label": "Regular Puja",
    "color": "#4262FF",
    "description": "Kebaktian rutin mingguan pemuda vihara",
    "default_point_reward": 50,
    "is_active": true
  },
  {
    "id": "cly1a2b3c0001abcde",
    "code": "chanting",
    "label": "Chanting",
    "color": "#0D9488",
    "description": "Sesi pelafalan paritta dan sutra kebajikan",
    "default_point_reward": 60,
    "is_active": true
  }
]
```

#### `POST /api/configure/event-types`
**Request Body**:
```json
{
  "label": "Volunteer",
  "color": "#EC4899",
  "description": "Kegiatan bakti sosial dan aksi kerelawanan pemuda",
  "default_point_reward": 80,
  "is_active": true
}
```
*Catatan: Parameter `code` bersifat opsional saat POST; jika tidak dikirimkan, server akan otomatis mengubah `label` menjadi kebab-case unik (`volunteer`).*

**Response (201 Created)**:
```json
{
  "id": "cly1a2b3c0002abcde",
  "code": "volunteer",
  "label": "Volunteer"
}
```

---

## 9. Acceptance Criteria

| ID | Skenario | Hasil yang Diharapkan |
| --- | --- | --- |
| **AC-01** | Admin membuat Event Type baru dengan `code` unik dan format hex valid | Data berhasil tersimpan ke tabel `event_types` dengan kode status HTTP `201 Created`. |
| **AC-02** | Pengguna mengirimkan `code` duplikat atau format tidak kebab-case | API menolak dengan HTTP `400` dan pesan validasi yang jelas. |
| **AC-03** | Admin mengubah nilai `default_point_reward` pada Event Type | Event Type terupdate; event baru otomatis menggunakan poin baru, event lama tidak terpengaruh. |
| **AC-04** | Admin menonaktifkan Event Type (`is_active = false`) | Event Type tidak lagi muncul di pilihan dropdown form pembuatan event baru; event lama tetap valid. |
| **AC-05** | Admin mencoba menghapus Event Type yang sudah memiliki relasi event | Operasi ditolak atau diblokir untuk menjaga integritas data relasional. |
| **AC-06** | Organizer membaca daftar Event Type | API mengembalikan list data Event Type untuk dipilih pada form event. |
| **AC-07** | Akun dengan role `member` atau `activist` mencoba mengakses endpoint konfigurasi | API mengembalikan HTTP `403 Forbidden`. |
