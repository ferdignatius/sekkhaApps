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

## 7. Acceptance Criteria

| ID | Skenario | Hasil yang Diharapkan |
| --- | --- | --- |
| **AC-BA-01** | Admin membuat Badge Activity baru dengan label "Audio Operator" | Sistem otomatis mengisi code `"audio-operator"` secara read-only dan menyimpannya dengan bonus points default 30. |
| **AC-BA-02** | Organizer membuka dropdown Badge Activity di halaman presensi event | Hanya Badge Activity dengan `is_active = true` yang muncul dalam daftar pilihan. |
| **AC-BA-03** | Admin mencoba menghapus Badge Activity yang sudah pernah dipakai jemaat | Server menolak dengan HTTP `409 Conflict` dan pesan "Badge activity cannot be deleted because it is already linked to attendance records. Deactivate it instead." |
| **AC-BA-04** | Role `member` atau `activist` mencoba mengakses endpoint master data | Server menolak dengan HTTP `403 Forbidden`. |
| **AC-BA-05** | Admin memperbarui label peran dari "Audio Operator" menjadi "Sound Engineer" | Field `code` di form secara live menampilkan preview `"sound-engineer"` (read-only), dan saat disimpan backend mengupdate `code` ke `"sound-engineer"` tanpa merusak riwayat presensi jemaat. |
