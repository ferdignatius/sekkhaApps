# PRD: Master Data — Sekolah

| Metadata | Detail |
| --- | --- |
| **Dokumen** | Product Requirement Document (PRD) |
| **Fitur** | Master Data Sekolah |
| **Aplikasi** | Sekkha Apps — Modul Configure |
| **Versi** | 1.0.0 |
| **Status** | Approved / Ready for Development |
| **Referensi** | `prd-sekkha/auth/auth.md`, `prd-sekkha/users/users.md` |

---

## 1. Deskripsi

**Sekolah** adalah master data yang digunakan untuk **mengklasifikasikan** data akademik anggota komunitas (field `User.school`, `User.school_level`, `User.class_grade`). Dipakai sebagai:

- Pilihan di combobox form sign-up (lihat `prd-sekkha/auth/auth.md`).
- Pilihan di combobox edit profil (lihat `prd-sekkha/users/users.md` §5.2).
- Filter/analitik di halaman Insight & People (lihat PRD terkait).

Dikelola melalui modul **Configure** yang bersifat **internal operasional** — tidak terlihat oleh `umat` dan `aktivis`.

> **Catatan**: `User.school` saat ini disimpan sebagai **string** (bukan foreign key) untuk backward compatibility dengan data legacy. Lihat PRD `users.md` §5.1 untuk detail field kategorisasi.

---

## 2. Hak Akses

| Aksi | `admin` | `pengurus` | `aktivis` | `umat` |
| --- | :---: | :---: | :---: | :---: |
| Lihat daftar & detail | v | v | x | x |
| Buat (Create) | v | v | x | x |
| Edit (Update) | v | v | x | x |
| Hapus (Delete) | v | x | x | x |

> **Catatan**:
> - `pengurus` dapat **membaca** dan **menambah/mengedit** sekolah (untuk akomodasi anggota baru yang sekolahnya belum ada di master), namun **tidak dapat menghapus**.
> - `admin` memiliki hak penuh termasuk delete.
> - User biasa (`umat`/`aktivis`) **tidak** melihat halaman manajemen ini di sidebar.

---

## 3. Data Default (Seed)

Saat backend boot pertama kali (DB kosong), sistem auto-seed dengan daftar sekolah Buddhis favorit + sekolah umum Indonesia. Lihat `sekkha-api/src/modules/schools/internal/schoolsData.ts` (~60 entri, contoh):

| Nama | Tipe | Kota |
| --- | --- | --- |
| SMA Tri Maha Dharma | SMA | Jakarta Barat |
| SMA Dharma Widya | SMA | Tangerang |
| SMA Cinta Kasih Tzu Chi | SMA | Jakarta Barat |
| SMA Negeri 1 Jakarta | SMA | Jakarta Pusat |
| Universitas Indonesia | Universitas | Depok |
| Universitas Bina Nusantara (BINUS) | Universitas | Jakarta Barat |
| Umum | Umum | Nasional |

> **Catatan**: Data di atas adalah **default awal** — admin/pengurus dapat menambahkan sekolah lain sesuai kebutuhan. Seed dilakukan sekali via `ensureMasterSchoolsSeeded()` saat `School` table kosong, dan bersifat **idempotent** (tidak duplikat saat boot ulang).

---

## 4. Atribut

| Field | Tipe | Wajib | Keterangan |
| --- | --- | :---: | --- |
| `id` | `cuid` | Ya | Auto-generated |
| `name` | `string` | Ya | Nama sekolah. Maks. 100 karakter. Unique (case-insensitive) |
| `type` | `enum` | Ya | Jenjang: `SMP`, `SMA`, `SMK`, `Universitas`, `Umum` |
| `city` | `string` | Ya | Kota domisili sekolah. Min. 2 karakter |
| `created_at` | `DateTime` | Ya | Auto |
| `updated_at` | `DateTime` | Ya | Auto |

---

## 5. Aturan Validasi & Operasional

1. `name`: Wajib, 2–100 karakter, **unique case-insensitive** ("SMA Dharma Widya" = "SMA DHARMA WIDYA").
2. `type`: Wajib, salah satu dari enum yang ditentukan. Default: `"SMA"`.
3. `city`: Wajib, minimal 2 karakter.
4. **Rename propagation**: jika admin/pengurus mengubah `name` sekolah, semua `User.school` yang reference nama lama **otomatis ter-update** ke nama baru (sinkron).
5. **Hapus constraint**: sekolah hanya bisa dihapus oleh `admin` **jika** belum ada user yang reference (`user_count = 0`).

---

## 6. UI: Halaman Manajemen

* **Route**: `/configure/master/school`
* **Komponen utama** (lihat `sekkha-frontend/src/modules/configure/internal/components/SchoolPage.tsx`):
  * Tabel daftar sekolah dengan kolom: Nama, Tipe, Kota, Jumlah User, Aksi
  * Search bar (filter by name/city, case-insensitive)
  * Tombol **"+ Tambah Sekolah"** (admin/pengurus)
  * Tombol Edit per row (admin/pengurus)
  * Tombol Delete per row (admin only) + konfirmasi dialog

---

## 7. API Contract

#### `GET /api/schools`
Publik (tidak perlu auth). Mendukung query `search?` dan `limit?` (default 100, max 200).

**Response 200:**
```json
{
  "total": 60,
  "schools": [
    {
      "id": "sch_001",
      "name": "SMA Dharma Widya",
      "type": "SMA",
      "city": "Tangerang",
      "userCount": 12
    }
  ]
}
```

#### `POST /api/schools`
**Headers:** `Authorization: Bearer <token>` (role: `pengurus` / `admin`)

**Request Body:**
```json
{
  "name": "SMA Buddha Tzu Chi Bandung",
  "type": "SMA",
  "city": "Bandung"
}
```

**Response 201** atau **409** (nama duplikat case-insensitive).

#### `PUT /api/schools/:id`
**Headers:** `Authorization: Bearer <token>` (role: `pengurus` / `admin`)

Partial update didukung. Jika `name` diubah, **otomatis propagate** ke semua `User.school` yang reference nama lama.

#### `DELETE /api/schools/:id`
**Headers:** `Authorization: Bearer <token>` (role: `admin` only)

Mengembalikan **400** jika masih ada user yang reference sekolah tersebut.

---

## 8. Database Schema (Prisma)

```prisma
enum SchoolType {
  SMP
  SMA
  SMK
  Universitas
  Umum
}

model School {
  id        String     @id @default(cuid())
  name      String     @unique
  type      SchoolType @default(SMA)
  city      String
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
}
```

> **Catatan**: Relasi `User → School` saat ini adalah **string reference** (`User.school: String`), bukan foreign key. Lihat `prd-sekkha/users/users.md` §5.1 untuk alasan.

---

## 9. Acceptance Criteria

| ID | Skenario Pengujian | Hasil yang Diharapkan |
| --- | --- | --- |
| **AC-01** | Backend boot pertama kali (DB kosong) | `ensureMasterSchoolsSeeded()` jalan, ~60 sekolah ter-insert |
| **AC-02** | Backend boot kedua kali (DB sudah ada data) | `ensureMasterSchoolsSeeded()` no-op, tidak ada duplikat |
| **AC-03** | Admin/Pengurus membuka `/configure/master/school` | Tabel daftar sekolah tampil dengan search bar |
| **AC-04** | Pengurus menambahkan sekolah baru dengan data valid | Sekolah tersimpan dan muncul di combobox form sign-up |
| **AC-05** | Pengurus menambahkan sekolah dengan nama duplikat (case-insensitive) | Server mengembalikan `409 Conflict` dengan pesan jelas |
| **AC-06** | Pengurus mengubah `name` sekolah | Data `School` ter-update, **semua `User.school` lama** otomatis ter-update ke nama baru |
| **AC-07** | Admin menghapus sekolah dengan `userCount = 0` | Sekolah terhapus, response `200 OK` |
| **AC-08** | Admin menghapus sekolah dengan `userCount > 0` | Server mengembalikan `400 Bad Request` dengan pesan jumlah user |
| **AC-09** | Pengurus mencoba menghapus sekolah | Server mengembalikan `403 Forbidden` (admin only) |
| **AC-10** | `umat`/`aktivis` mencoba akses endpoint sekolah | Server mengembalikan `403 Forbidden` |
| **AC-11** | User membuka combobox sekolah di form sign-up/edit profil | List sekolah tampil dengan search, lazy load, keyboard navigable |

---

## 10. Out of Scope

- Geolocation (cari sekolah terdekat).
- Integrasi dengan database sekolah nasional (kemdikbud).
- Multiple branch / alma mater per user.
- Logo / branding sekolah di UI.
- History rename (audit trail) — lihat PRD `prd-sekkha/configure/configure.md` §5.3 untuk audit log generic.

---

## 11. Referensi

- `sekkha-api/src/modules/schools/internal/router.ts` — endpoint CRUD
- `sekkha-api/src/modules/schools/internal/schoolsData.ts` — `INITIAL_SCHOOLS` (~60 entri)
- `sekkha-frontend/src/modules/configure/internal/components/SchoolPage.tsx` — admin UI
- `prd-sekkha/auth/auth.md` — sign-up combobox consumption
- `prd-sekkha/users/users.md` §5.1, §5.2 — field kategorisasi & edit profil
- `prd-sekkha/configure/configure.md` §3.1 — sub-halaman School di Configure
- `sekkha-api/prisma/schema.prisma` — `School` model + `SchoolType` enum
- Skill `security-and-hardening` — role enforcement (`requireRole`)
