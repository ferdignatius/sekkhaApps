# PRD: Master Data — Event Type

| Metadata | Detail |
| --- | --- |
| **Dokumen** | Product Requirement Document (PRD) |
| **Fitur** | Master Data Event Type |
| **Aplikasi** | Sekkha Apps — Modul Configure |
| **Versi** | 1.0.0 |
| **Status** | Approved / Ready for Development |
| **Referensi** | `prd-sekkha/event/event.md` |

---

## 1. Deskripsi

**Event Type** adalah kategori yang digunakan untuk mengklasifikasikan jenis kegiatan. Digunakan saat membuat event dan sebagai filter di halaman daftar event.

Dikelola melalui modul **Configure** yang bersifat **internal operasional** — tidak terlihat oleh `umat` dan `aktivis`.

---

## 2. Hak Akses

| Aksi | `admin` | `pengurus` | `aktivis` | `umat` |
| --- | :---: | :---: | :---: | :---: |
| Lihat daftar & detail | v | v | x | x |
| Buat (Create) | v | x | x | x |
| Edit (Update) | v | x | x | x |
| Hapus (Delete) | v | x | x | x |

> **Catatan**: `pengurus` hanya dapat **membaca** daftar event type (misal: memilih tipe saat membuat event), namun tidak bisa mengubah data master. Seluruh perubahan dilakukan oleh `admin`.

---

## 3. Data Default (Seed)

| Nama | Warna | Deskripsi | Poin Default |
| --- | --- | --- | --- |
| Kebaktian | `#4262FF` | Kebaktian rutin atau khusus | 50 |

> **Catatan**: Data seed di atas adalah 1 default awal. Tipe lainnya (retreat, meditasi, sosial, rapat, pelatihan, dll.) dapat ditambahkan oleh admin melalui halaman Configure.
>
> **Poin Default**: Nilai `point_reward` yang otomatis terisi saat pengurus memilih event type di form buat event. Pengurus tetap bisa override nilai ini per event.

---

## 4. Atribut

| Field | Tipe | Wajib | Keterangan |
| --- | --- | :---: | --- |
| `id` | `cuid` | Ya | Auto-generated |
| `name` | `string` | Ya | Nama jenis kegiatan. Maks. 50 karakter |
| `color` | `string` (hex) | Ya | Warna representasi untuk kalender & badge UI. Format: `#RRGGBB` |
| `description` | `string` | Tidak | Deskripsi singkat jenis kegiatan |
| `default_point_reward` | `int` | Ya | Poin default yang di-autofill saat event type dipilih. Min: 0 |
| `is_active` | `boolean` | Ya | Jika `false`, tidak muncul di dropdown form buat event. Default: `true` |
| `created_at` | `DateTime` | Ya | Auto |
| `updated_at` | `DateTime` | Ya | Auto |

---

## 5. Aturan Validasi & Operasional

1. `name`: Wajib, 2–50 karakter.
2. `color`: Wajib, format hex 6 digit (`#RRGGBB`), dipilih menggunakan **Wheel Color Picker**.
3. `default_point_reward`: Wajib, angka >= 0.
4. Event Type dengan `is_active: false` tidak dapat dipilih di form buat event baru, namun event yang sudah ada tetap terhubung.
5. Event Type **tidak bisa dihapus** jika sudah digunakan oleh minimal 1 event (`soft delete` via `is_active: false`).

---

## 6. UI: Halaman Manajemen

* **Route**: `/configure/event-types`
* **Komponen utama**:
  * Tabel daftar event type dengan kolom: Nama, Warna (color swatch), Deskripsi, Poin Default, Status (aktif/nonaktif), Aksi
  * Tombol **"+ Tambah Event Type"** (admin only)
  * Toggle aktif/nonaktif langsung dari tabel
* **Form Buat/Edit**:
  * Input Nama, Deskripsi, dan Poin Default
  * Selection warna menggunakan **Wheel Color Picker** interaktif dengan live preview color badge

---

## 7. API Contract

#### `GET /v1/configure/event-types`
**Headers:** `Authorization: Bearer <token>` (role: `pengurus` / `admin`)

**Response 200:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "evt_type_001",
      "name": "Kebaktian",
      "color": "#4262FF",
      "description": "Kebaktian rutin atau khusus",
      "default_point_reward": 50,
      "is_active": true,
      "created_at": "2026-01-01T00:00:00Z"
    }
  ],
  "meta": { "total": 1 }
}
```

#### `POST /v1/configure/event-types`
**Headers:** `Authorization: Bearer <token>` (role: `admin` only)

**Request Body:**
```json
{
  "name": "Dhamma Talk",
  "color": "#F97316",
  "description": "Ceramah atau diskusi Dhamma",
  "default_point_reward": 40,
  "is_active": true
}
```

#### `PUT /v1/configure/event-types/:id`
**Headers:** `Authorization: Bearer <token>` (role: `admin` only)

Partial update didukung.

#### `DELETE /v1/configure/event-types/:id`
Mengembalikan `409 Conflict` jika event type sudah digunakan oleh minimal 1 event. Gunakan `is_active: false` sebagai gantinya.

---

## 8. Database Schema (Prisma)

```prisma
model EventType {
  id                   String   @id @default(cuid())
  name                 String
  color                String
  description          String?
  default_point_reward Int      @default(0)
  is_active            Boolean  @default(true)
  created_at           DateTime @default(now())
  updated_at           DateTime @updatedAt

  events Event[]
}
```

---

## 9. Acceptance Criteria

| ID | Skenario Pengujian | Hasil yang Diharapkan |
| --- | --- | --- |
| **AC-01** | Admin menambah Event Type baru dengan warna via Wheel Color Picker | Event Type tersimpan dan muncul di pilihan dropdown form buat event |
| **AC-02** | Admin menonaktifkan Event Type yang sudah dipakai | Event Type tidak muncul di dropdown buat event baru, event lama tetap aman |
| **AC-03** | Admin mencoba menghapus Event Type yang masih digunakan event | Server mengembalikan `409 Conflict` |
| **AC-04** | `umat` mencoba akses `GET /v1/configure/event-types` | Backend mengembalikan `403 Forbidden` |
