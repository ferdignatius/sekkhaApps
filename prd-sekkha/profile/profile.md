# PRD: Halaman Profil — Sekkha Apps

| Metadata | Detail |
| --- | --- |
| **Dokumen** | Product Requirement Document (PRD) |
| **Fitur** | Profil Pengguna (Data Diri, Streak & Poin, Log History) |
| **Aplikasi** | Sekkha Apps (Frontend & Backend) |
| **Versi** | 1.0.0 |
| **Status** | Draft / Ready for Review |
| **Referensi** | `prd-sekkha/auth/auth.md`, `prd-sekkha/event/abensiEvent.md` |

---

## 1. Ringkasan Eksekutif

Halaman **Profil** adalah representasi diri pengguna di dalam ekosistem Sekkha. Halaman ini menggabungkan:

1. **Data Diri** — informasi personal yang dapat diedit
2. **Streak & Poin** — total poin, streak aktif, streak terpanjang, dan kalender kehadiran
3. **Log History** — rekam jejak semua aktivitas sejak bergabung

Halaman profil bersifat **personal** — setiap user hanya bisa melihat profil dirinya sendiri. Pengurus/admin dapat melihat profil orang lain melalui panel manajemen user (bukan dari halaman ini).

---

## 2. Struktur Halaman & Navigasi

### 2.1. Route

| Route | Deskripsi |
| --- | --- |
| `/profile` | Halaman profil user yang sedang login |
| `/profile/edit` | Form edit data diri |
| `/profile/qr` | QR Code absensi personal |

### 2.2. Layout Umum

Halaman profil dibagi menjadi **3 section utama** yang disusun vertikal:

```
┌─────────────────────────────────────┐
│  [1] HERO PROFIL                    │
│      Foto · Nama · Role · Level     │
│      Total Poin · Streak saat ini   │
│      [Edit Profil]  [QR Code Saya]  │
├─────────────────────────────────────┤
│  [2] STREAK & POIN                  │
│      Poin total · Streak aktif      │
│      Streak Calendar (12 minggu)    │
├─────────────────────────────────────┤
│  [3] LOG HISTORY                    │
│      Timeline aktivitas sejak join  │
└─────────────────────────────────────┘
```

---

## 3. Section 1: Hero Profil

### 3.1. Konten

| Elemen | Deskripsi |
| --- | --- |
| **Foto Profil** | Avatar bulat, bisa diubah. Fallback: inisial nama dengan warna generated dari `user_id` |
| **Nama Lengkap** | `user.name` |
| **Role Badge** | Chip kecil: Umat / Aktivis / Pengurus / Admin |
| **Level** | Nama level saat ini (dari master data Level) + nomor level. Contoh: *"Level 3 · Pejalan Dhamma"* |
| **Level Progress Bar** | Progress poin ke level berikutnya. Contoh: *"750 / 1.000 poin"* |
| **Bergabung Sejak** | Tanggal join. Contoh: *"Bergabung sejak Januari 2026"* |
| **Sekolah & Kelas** | Tampil jika sudah diisi di onboarding/edit profil. Contoh: *"SMA Dharma · Kelas 11"* |

### 3.2. Tombol Aksi

| Tombol | Aksi |
| --- | --- |
| **Edit Profil** | Navigasi ke `/profile/edit` |
| **QR Code Saya** | Navigasi ke `/profile/qr` |

### 3.3. Ringkasan Cepat (Summary Pill)

Di bawah foto profil, tampilkan 2 pill statistik utama secara horizontal:

```
[ 🔥 12  Streak ]  [ ⭐ 1.250  Poin ]
```

---

## 4. Section 2: Streak & Poin

### 4.1. Stat Card

Tampilkan 3 angka ringkasan dalam bentuk card horizontal:

| Card | Nilai | Label |
| --- | --- | --- |
| ⭐ **Total Poin** | `user.total_points` | Total poin yang dikumpulkan |
| 🔥 **Streak Aktif** | `user.current_streak` | Streak kehadiran berturut-turut saat ini |
| 🏆 **Streak Terpanjang** | `user.longest_streak` | Streak terpanjang yang pernah dicapai |

### 4.2. Streak Calendar

Visualisasi kehadiran **12 minggu terakhir** seperti GitHub contribution graph:

```
     M  S  R  K  J  S  M
Mg1  ●  ○  ●  ○  ○  ●  ●
Mg2  ●  ●  ○  ●  ○  ●  ○
Mg3  ●  ○  ○  ○  ○  ●  ●
...
```

* ● = ada event yang dihadiri di hari itu
* ○ = tidak ada kehadiran
* Warna ● semakin gelap jika lebih banyak event dihadiri dalam satu hari

---

## 5. Section 3: Log History

### 6.1. Deskripsi

Timeline kronologis dari semua aktivitas pengguna **sejak pertama kali bergabung**, diurutkan terbaru di atas. Ini adalah rekam jejak digital perjalanan pengguna di komunitas Sekkha.

### 6.2. Tipe Log

| Tipe | Ikon | Contoh Label |
| --- | --- | --- |
| `join` | 🎉 | *"Bergabung di komunitas Sekkha"* |
| `attendance` | ✅ | *"Hadir di Kebaktian Minggu Pagi"* |
| `badge_earned` | 🏅 | *"Mendapatkan badge Peserta Perdana"* |
| `level_up` | ⬆️ | *"Naik ke Level 3 · Pejalan Dhamma"* |
| `rsvp` | 📅 | *"Mendaftar ke Retreat Akhir Tahun 2026"* |
| `profile_updated` | ✏️ | *"Memperbarui data profil"* |

### 6.3. Tampilan Per Item Log

```
  🏅  [3 Agt 2026, 08:15]
      Mendapatkan badge "Peserta Perdana"
      +100 poin
      ─────────────────────────────────
  ✅  [3 Agt 2026, 08:15]
      Hadir di Kebaktian Minggu Pagi
      +50 poin
```

* Setiap item: ikon tipe + tanggal & waktu + deskripsi + delta poin (jika ada)
* Dikelompokkan per **bulan** (sticky header tanggal bulan)
* **Infinite scroll** — load 20 item per halaman

### 6.4. Filter

* **Semua** (default) — semua tipe log
* **Kehadiran** — hanya tipe `attendance`
* **Milestone** — tipe `level_up` + `join`

---

## 6. Halaman Edit Profil (`/profile/edit`)

### 7.1. Field yang Dapat Diedit

| Field | Label | Tipe | Keterangan |
| --- | --- | --- | --- |
| `photo_url` | Foto Profil | Upload / ambil dari Google | Maks. 5MB, format JPG/PNG |
| `name` | Nama Lengkap | Text input | Wajib, 2–60 karakter |
| `school_name` | Nama Sekolah | Text input + autocomplete | Opsional |
| `school_level` | Jenjang | Dropdown | SD / SMP / SMA/SMK / Universitas / Lainnya |
| `class_grade` | Kelas / Semester | Dropdown dinamis | Opsional |

### 7.2. Field yang TIDAK Dapat Diedit di Sini

| Field | Keterangan |
| --- | --- |
| `email` | Tidak bisa diubah langsung — butuh flow verifikasi (future feature) |
| `role` | Hanya bisa diubah oleh Admin |
| `total_points`, `streak` | Read-only — dihitung otomatis oleh sistem |

### 7.3. Simpan

* `PATCH /v1/users/me` dengan payload field yang berubah
* Toast sukses: *"Profil berhasil diperbarui"*
* Redirect kembali ke `/profile`

---

## 7. Halaman QR Code (`/profile/qr`)

* QR image besar (auto-refresh token setiap kali halaman dibuka)
* Nama lengkap + foto profil user di bawah QR
* Label: *"Tunjukkan QR ini kepada pengurus saat event berlangsung"*
* Token berlaku 24 jam (ditampilkan: *"Berlaku hingga 04 Agt 2026, 08:00"*)
* Tombol **Download** untuk simpan ke galeri *(opsional — future feature)*

---

## 8. API Contract

### 8.1. Ambil Data Profil Sendiri

#### `GET /v1/users/me/profile`

**Headers:** `Authorization: Bearer <token>`

**Response 200:**
```json
{
  "status": "success",
  "data": {
    "id": "usr_9b1deb4d",
    "name": "Hendra Santoso",
    "email": "hendra@example.com",
    "photo_url": "https://cdn.sekkha.app/photos/usr_9b1d.jpg",
    "role": "umat",
    "school_name": "SMA Dharma",
    "school_level": "SMA/SMK",
    "class_grade": "Kelas 11",
    "joined_at": "2026-01-15T07:00:00Z",
    "onboarding_completed": true,

    "gamification": {
      "total_points": 1250,
      "current_streak": 12,
      "longest_streak": 15,
      "level": {
        "number": 3,
        "name": "Pejalan Dhamma",
        "color": "#34D399",
        "min_points": 500,
        "next_level_min_points": 1000
      }
    }
  }
}
```

---

### 8.2. Ambil Log History

#### `GET /v1/users/me/history`

**Query Params:** `?page=1&limit=20&type=attendance`

**Response 200:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "log_001",
      "type": "attendance",
      "label": "Hadir di Kebaktian Minggu Pagi",
      "detail": {
        "event_id": "evt_xyz789",
        "event_title": "Kebaktian Minggu Pagi"
      },
      "point_delta": 50,
      "created_at": "2026-08-03T08:15:00Z"
    },
    {
      "id": "log_002",
      "type": "badge_earned",
      "label": "Mendapatkan badge \"Peserta Perdana\"",
      "detail": {
        "badge_id": "badge_001",
        "badge_name": "Peserta Perdana"
      },
      "point_delta": 100,
      "created_at": "2026-08-03T08:15:00Z"
    },
    {
      "id": "log_003",
      "type": "join",
      "label": "Bergabung di komunitas Sekkha",
      "detail": null,
      "point_delta": 0,
      "created_at": "2026-01-15T07:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "has_next": true
  }
}
```

---

### 8.4. Ambil Streak Calendar

#### `GET /v1/users/me/streak-calendar`

**Query Params:** `?weeks=12`

**Response 200:**
```json
{
  "status": "success",
  "data": {
    "current_streak": 12,
    "longest_streak": 15,
    "weeks": [
      {
        "week_start": "2026-07-21",
        "days": [
          { "date": "2026-07-21", "attended_count": 1 },
          { "date": "2026-07-22", "attended_count": 0 },
          { "date": "2026-07-23", "attended_count": 2 },
          { "date": "2026-07-24", "attended_count": 0 },
          { "date": "2026-07-25", "attended_count": 0 },
          { "date": "2026-07-26", "attended_count": 1 },
          { "date": "2026-07-27", "attended_count": 1 }
        ]
      }
    ]
  }
}
```

---

### 8.5. Edit Profil

#### `PATCH /v1/users/me`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Hendra Santoso",
  "school_name": "SMA Dharma",
  "school_level": "SMA/SMK",
  "class_grade": "Kelas 11"
}
```

**Response 200:**
```json
{
  "status": "success",
  "data": {
    "id": "usr_9b1deb4d",
    "name": "Hendra Santoso",
    "school_name": "SMA Dharma",
    "school_level": "SMA/SMK",
    "class_grade": "Kelas 11"
  },
  "message": "Profil berhasil diperbarui"
}
```

---

## 9. Database Schema (Prisma)

```prisma
model User {
  id                   String   @id @default(cuid())
  name                 String
  email                String   @unique
  password_hash        String?
  photo_url            String?
  role                 String   @default("umat")
  school_name          String?
  school_level         String?
  class_grade          String?
  total_points         Int      @default(0)
  current_streak       Int      @default(0)
  longest_streak       Int      @default(0)
  onboarding_completed Boolean  @default(false)
  joined_at            DateTime @default(now())
  updated_at           DateTime @updatedAt

  attendances     Attendance[]
  rsvps           Rsvp[]
  activity_logs   ActivityLog[]
}

// Log semua aktivitas user untuk history timeline
model ActivityLog {
  id          String   @id @default(cuid())
  user_id     String
  type        String   // 'join' | 'attendance' | 'badge_earned' | 'level_up' | 'rsvp' | 'profile_updated'
  label       String   // Deskripsi siap tampil
  detail      Json?    // Data tambahan (event_id, badge_id, dll.)
  point_delta Int      @default(0)
  created_at  DateTime @default(now())

  user User @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id, created_at(sort: Desc)])
  @@index([user_id, type])
}
```

---

## 10. Domain Events (EventBus — Trigger Log)

Setiap event di bawah ini akan men-trigger pembuatan record `ActivityLog`:

| Domain Event | Log Type | Label Template |
| --- | --- | --- |
| `user.registered` | `join` | *"Bergabung di komunitas Sekkha"* |
| `attendance.batch_recorded` (per user) | `attendance` | *"Hadir di [event.title]"* |
| `level.up` | `level_up` | *"Naik ke Level [level.number] · [level.name]"* |
| `rsvp.created` | `rsvp` | *"Mendaftar ke [event.title]"* |
| `user.profile_updated` | `profile_updated` | *"Memperbarui data profil"* |

---

## 11. Acceptance Criteria

| ID | Skenario | Hasil yang Diharapkan |
| --- | --- | --- |
| **AC-01** | User buka `/profile` | Tampil 3 section: Hero, Streak & Poin, Log History |
| **AC-02** | User yang belum isi data sekolah buka profil | Section sekolah/kelas tidak tampil di hero, muncul prompt *"Lengkapi data"* |
| **AC-03** | User scroll ke Log History | Timeline tampil terbaru di atas, dikelompokkan per bulan |
| **AC-04** | User filter Log History ke "Kehadiran" | Hanya tampil item bertipe `attendance` |
| **AC-05** | User buka `/profile/edit` dan ubah nama + kelas | Data tersimpan, redirect ke `/profile` dengan toast sukses |
| **AC-06** | User buka `/profile/qr` | QR Code segar ditampilkan dengan nama dan info masa berlaku |
| **AC-07** | User hadir di event → buka profil | Poin bertambah di hero pill, log entry "Hadir di [nama event] +X poin" muncul di History |
| **AC-08** | User naik level → buka profil | Level bar di hero update, log entry `level_up` muncul di History |
| **AC-09** | Streak Calendar ditampilkan | 12 minggu terakhir tervisualisasi, hari dengan kehadiran ditandai |
| **AC-10** | User pertama kali join (0 aktivitas) | Semua nilai = 0/minimum, tidak ada error rendering |
