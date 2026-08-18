# PRD: Master Data — Badge Presensi Event

| Metadata | Detail |
| --- | --- |
| **Dokumen** | Product Requirement Document (PRD) |
| **Fitur** | Master Data Badge Presensi Event |
| **Aplikasi** | Sekkha Apps — Modul Configure |
| **Versi** | 1.0.0 |
| **Status** | Approved / Ready for Development |
| **Referensi** | `prd-sekkha/event/event.md`, `prd-sekkha/masterdata/eventType.md` |

---

## 1. Deskripsi

**Badge Presensi Event** adalah badge visual khusus yang diberikan kepada pengguna sebagai bentuk apresiasi/reward saat berhasil melakukan **presensi/absensi pada event tertentu**. Badge ini dikaitkan dengan event saat pengurus membuat atau mengedit event — setiap peserta yang presensinya tercatat akan otomatis mendapatkan badge tersebut.

Dikelola melalui modul **Configure** yang bersifat **internal operasional** — tidak terlihat oleh `umat` dan `aktivis`.

---

## 2. Hak Akses

| Aksi | `admin` | `pengurus` | `aktivis` | `umat` |
| --- | :---: | :---: | :---: | :---: |
| Lihat daftar & detail | v | v | x | x |
| Buat (Create) | v | x | x | x |
| Edit (Update) | v | x | x | x |
| Hapus (Delete) | v | x | x | x |

> **Catatan**: `pengurus` hanya dapat **membaca** daftar badge (misal: memilih badge reward saat membuat event), namun tidak bisa mengubah data master. Seluruh perubahan dilakukan oleh `admin`.

---

## 3. Data Default (Seed)

| Nama | Warna | Poin | Deskripsi |
| --- | --- | --- | --- |
| Peserta Perdana | `#10B981` | 100 | Badge apresiasi untuk kehadiran event pertama kali |

> **Catatan**: Badge di atas adalah 1 data seed awal. Badge presensi event lainnya ditambahkan oleh admin sesuai kebutuhan program/event komunitas.

---

## 4. Atribut

| Field | Tipe | Wajib | Keterangan |
| --- | --- | :---: | --- |
| `id` | `cuid` | Ya | Auto-generated |
| `name` | `string` | Ya | Nama badge presensi. Maks. 80 karakter. Contoh: `"Peserta Perdana"` |
| `color` | `string` (hex) | Ya | Warna aksen/tema badge. Format: `#RRGGBB`. Dipilih via Wheel Color Picker |
| `description` | `string` | Ya | Deskripsi singkat badge |
| `point_value` | `int` | Ya | Poin bonus yang diberikan saat badge di-unlock. Min: 0 |
| `is_active` | `boolean` | Ya | Jika `false`, tidak bisa di-assign ke event baru. Default: `true` |
| `created_at` | `DateTime` | Ya | Auto |
| `updated_at` | `DateTime` | Ya | Auto |

---

## 5. Relasi ke Event & Alur Reward Presensi

Saat pengurus membuat atau mengedit event, mereka dapat memilih **1 Badge Presensi Event** sebagai reward kehadiran.

```
Event.badge_id --> Badge.id  (nullable — event boleh tidak memilih badge reward)
```

Alur reward presensi:
```
attendance.recorded (EventBus)
      |
Events Module: cek event.badge_id
      |
Jika badge_id tidak null:
      |
INSERT INTO user_badges (user_id, badge_id, event_id, earned_at)
      |
EventBus: publish("badge.earned", { user_id, badge_id, point_value, event_id })
      |
Dashboard Module: tambah point_value ke total poin user
```

---

## 6. Aturan Validasi & Operasional

1. `name`: Wajib, 3–80 karakter.
2. `color`: Wajib, format hex 6 digit (`#RRGGBB`), dipilih menggunakan **Wheel Color Picker**.
3. `point_value`: Wajib, angka >= 0.
4. Badge dengan `is_active: false` tidak bisa di-assign ke event baru, namun badge yang sudah didapat pengguna tetap tersimpan di profil.
5. Badge **tidak bisa dihapus** jika sudah pernah di-unlock oleh minimal 1 pengguna — hanya bisa di-nonaktifkan (`is_active: false`).

---

## 7. UI: Halaman Manajemen

* **Route**: `/configure/badges`
* **Tampilan**: Card Grid / Tabel Manajemen Badge dengan elemen visual warna badge
* **Form Buat/Edit Badge**:
  * Input Nama Badge, Deskripsi, dan Poin Value
  * Pemilihan Warna menggunakan **Wheel Color Picker** interaktif (dengan preview visual badge card)
  * Toggle Aktif/Nonaktif

---

## 8. API Contract

#### `GET /v1/configure/badges`
**Headers:** `Authorization: Bearer <token>` (role: `pengurus` / `admin`)

**Response 200:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "badge_001",
      "name": "Peserta Perdana",
      "color": "#10B981",
      "description": "Badge apresiasi untuk kehadiran event pertama kali",
      "point_value": 100,
      "is_active": true,
      "created_at": "2026-01-01T00:00:00Z"
    }
  ],
  "meta": { "total": 1 }
}
```

#### `POST /v1/configure/badges`
**Headers:** `Authorization: Bearer <token>` (role: `admin` only)

**Request Body:**
```json
{
  "name": "Peserta Retreat 2026",
  "color": "#8B5CF6",
  "description": "Hadir di event Retreat Akhir Tahun 2026",
  "point_value": 250,
  "is_active": true
}
```

#### `PUT /v1/configure/badges/:id`
Partial update didukung.

#### `DELETE /v1/configure/badges/:id`
Mengembalikan `409 Conflict` jika badge sudah didapat oleh minimal 1 pengguna.

---

## 9. Database Schema (Prisma)

```prisma
model Badge {
  id          String   @id @default(cuid())
  name        String
  color       String
  description String
  point_value Int      @default(0)
  is_active   Boolean  @default(true)
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  events      Event[]
  user_badges UserBadge[]
}

model UserBadge {
  id        String   @id @default(cuid())
  user_id   String
  badge_id  String
  event_id  String?
  earned_at DateTime @default(now())

  user  User  @relation(fields: [user_id], references: [id])
  badge Badge @relation(fields: [badge_id], references: [id])

  @@unique([user_id, badge_id])
}
```

---

## 10. Domain Events (EventBus Integration)

| Event | Publisher | Subscriber | Payload | Keterangan |
| --- | --- | --- | --- | --- |
| `badge.earned` | Events module | Dashboard, Notif | `{ user_id, badge_id, point_value, event_id }` | Tambah poin presensi + notifikasi ke user |

---

## 11. Acceptance Criteria

| ID | Skenario Pengujian | Hasil yang Diharapkan |
| --- | --- | --- |
| **AC-01** | Admin membuat Badge Presensi Event baru dengan Wheel Color Picker & poin reward | Badge tersimpan dan muncul di pilihan reward saat pengurus membuat event |
| **AC-02** | Pengurus memilih Badge Presensi pada event, user melakukan absensi | Badge otomatis ter-unlock di profil user & poin bonus bertambah |
| **AC-03** | Admin mencoba menghapus Badge yang sudah pernah didapatkan user | Server mengembalikan `409 Conflict`, menyarankan `is_active: false` |
| **AC-04** | Badge di-nonaktifkan (`is_active: false`) | Badge tidak muncul di pilihan saat buat event baru, badge yang sudah didapat user tetap ada |
| **AC-05** | `umat` mencoba akses `GET /v1/configure/badges` | Backend mengembalikan `403 Forbidden` |
