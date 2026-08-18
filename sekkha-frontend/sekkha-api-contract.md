# Sekkha Apps — API Contract (MVP)

**Base URL:** `https://api.sekkha.app/v1`
**Auth:** Bearer Token (JWT) via `Authorization: Bearer <token>`
**Content-Type:** `application/json`

---

## Conventions

| Method | Semantics |
|--------|-----------|
| GET | Read data |
| POST | Create resource |
| PUT | Replace resource |
| PATCH | Partial update |
| DELETE | Remove resource |

### Standard Response Envelope

Semua response — sukses maupun gagal — menggunakan shape yang sama:

```json
{
  "status": "success",
  "data": { },
  "message": "OK",
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 100
  }
}
```

| Field | Type | Keterangan |
|-------|------|------------|
| status | string | `"success"` atau `"fail"` |
| data | object / array / null | payload utama response |
| message | string | human-readable message |
| meta | object / null | pagination atau info tambahan, null jika tidak relevan |

### Success Response

```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "name": "Budi Santoso"
  },
  "message": "User retrieved successfully",
  "meta": null
}
```

### Fail Response

```json
{
  "status": "fail",
  "data": null,
  "message": "Email already registered",
  "meta": {
    "code": "DUPLICATE_EMAIL",
    "field": "email"
  }
}
```

> Error detail (code, field) dimasukkan ke `meta`, bukan field terpisah.

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request / Validation Error |
| 401 | Unauthenticated |
| 403 | Forbidden (role tidak cukup) |
| 404 | Not Found |
| 409 | Conflict (duplicate) |
| 422 | Unprocessable Entity |
| 500 | Internal Server Error |

### Role Enum
`umat` | `pengurus` | `admin`

---

## 1. AUTH

### POST /auth/register
Daftarkan akun baru.

**Request Body**
```json
{
  "name": "Budi Santoso",
  "email": "budi@example.com",
  "password": "Min8Char!",
  "phone": "081234567890",
  "birth_date": "2000-05-12"
}
```

**Response 201**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "name": "Budi Santoso",
      "email": "budi@example.com",
      "role": "umat",
      "status": "new"
    },
    "token": "eyJhbGci..."
  }
}
```

**Errors**
- `409` — Email sudah terdaftar

---

### POST /auth/login
Login dengan email dan password.

**Request Body**
```json
{
  "email": "budi@example.com",
  "password": "Min8Char!"
}
```

**Response 200**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "name": "Budi Santoso",
      "role": "umat",
      "status": "active"
    },
    "token": "eyJhbGci...",
    "expires_at": "2025-07-01T00:00:00Z"
  }
}
```

**Errors**
- `401` — Email atau password salah

---

### POST /auth/logout
Invalidate token aktif.

**Headers:** `Authorization: Bearer <token>`

**Response 200**
```json
{ "status": "success", "data": null, "message": "Logged out", "meta": null }
```

---

### PATCH /auth/change-password
Ganti password.

**Request Body**
```json
{
  "old_password": "OldPass!",
  "new_password": "NewPass!"
}
```

**Response 200**
```json
{ "status": "success", "data": null, "message": "Password updated", "meta": null }
```

---

## 2. USERS (Profil)

### GET /users/me
Ambil profil user yang sedang login.

**Response 200**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "name": "Budi Santoso",
    "email": "budi@example.com",
    "phone": "081234567890",
    "photo_url": "https://cdn.sekkha.app/photos/uuid.jpg",
    "birth_date": "2000-05-12",
    "role": "umat",
    "status": "active",
    "joined_at": "2024-01-15",
    "last_seen_at": "2025-06-01T10:00:00Z"
  }
}
```

---

### PATCH /users/me
Update profil sendiri.

**Request Body** *(semua field optional)*
```json
{
  "name": "Budi S.",
  "phone": "081234567890",
  "birth_date": "2000-05-12",
  "photo_url": "https://cdn.sekkha.app/photos/new.jpg"
}
```

**Response 200**
```json
{
  "status": "success",
  "data": { "...updated user object..." }
}
```

---

### GET /users
*[PENGURUS/ADMIN only]* List semua umat.

**Query Params**

| Param | Type | Description |
|-------|------|-------------|
| status | string | `new`, `active`, `inactive`, `alumni` |
| role | string | `umat`, `pengurus`, `admin` |
| search | string | cari berdasarkan nama / email |
| page | int | default: 1 |
| per_page | int | default: 20 |

**Response 200**
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "name": "Budi Santoso",
      "email": "budi@example.com",
      "role": "umat",
      "status": "active",
      "last_seen_at": "2025-06-01T10:00:00Z"
    }
  ],
  "meta": { "page": 1, "per_page": 20, "total": 87 }
}
```

---

### GET /users/:id
*[PENGURUS/ADMIN only]* Detail satu user.

**Response 200**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "name": "Budi Santoso",
    "email": "budi@example.com",
    "phone": "081234567890",
    "birth_date": "2000-05-12",
    "role": "umat",
    "status": "active",
    "joined_at": "2024-01-15",
    "last_seen_at": "2025-06-01T10:00:00Z",
    "streak": {
      "current_streak": 4,
      "longest_streak": 8
    },
    "level": {
      "level": 3,
      "total_points": 230
    }
  }
}
```

---

### PATCH /users/:id/role
*[ADMIN only]* Update role user.

**Request Body**
```json
{ "role": "pengurus" }
```

**Response 200**
```json
{ "status": "success", "data": { "id": "uuid", "role": "pengurus" } }
```

---

### PATCH /users/:id/status
*[PENGURUS/ADMIN only]* Update status umat.

**Request Body**
```json
{ "status": "inactive" }
```

**Response 200**
```json
{ "status": "success", "data": { "id": "uuid", "status": "inactive" } }
```

---

## 3. EVENTS

### POST /events
*[PENGURUS/ADMIN only]* Buat event baru.

**Request Body**
```json
{
  "title": "Kebaktian Minggu",
  "description": "Kebaktian rutin setiap Minggu pagi",
  "location": "Vihara Dharma Bhakti",
  "event_date": "2025-07-06T08:00:00Z",
  "event_type": "rutin"
}
```

**event_type:** `rutin` | `special`

**Response 201**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "title": "Kebaktian Minggu",
    "event_date": "2025-07-06T08:00:00Z",
    "event_type": "rutin",
    "status": "published",
    "created_by": "uuid-pengurus"
  }
}
```

---

### GET /events
List semua event (semua role bisa akses).

**Query Params**

| Param | Type | Description |
|-------|------|-------------|
| status | string | `draft`, `published`, `done`, `cancelled` |
| event_type | string | `rutin`, `special` |
| from | date | filter tanggal mulai (YYYY-MM-DD) |
| to | date | filter tanggal akhir (YYYY-MM-DD) |
| page | int | default: 1 |
| per_page | int | default: 20 |

**Response 200**
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "title": "Kebaktian Minggu",
      "location": "Vihara Dharma Bhakti",
      "event_date": "2025-07-06T08:00:00Z",
      "event_type": "rutin",
      "status": "published",
      "rsvp_count": 23
    }
  ],
  "meta": { "page": 1, "per_page": 20, "total": 40 }
}
```

---

### GET /events/:id
Detail satu event.

**Response 200**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "title": "Kebaktian Minggu",
    "description": "Kebaktian rutin setiap Minggu pagi",
    "location": "Vihara Dharma Bhakti",
    "event_date": "2025-07-06T08:00:00Z",
    "event_type": "rutin",
    "status": "published",
    "rsvp_count": 23,
    "attendance_count": 18,
    "my_rsvp": "hadir",
    "qr_code": {
      "code": "EVT-ABC123",
      "expires_at": null
    }
  }
}
```

> `my_rsvp` dan `qr_code` hanya muncul sesuai role. `qr_code` hanya untuk pengurus/admin.

---

### PATCH /events/:id
*[PENGURUS/ADMIN only]* Update event.

**Request Body** *(semua field optional)*
```json
{
  "title": "Kebaktian Minggu Spesial",
  "location": "Gedung Serbaguna",
  "status": "cancelled"
}
```

**Response 200**
```json
{ "status": "success", "data": { "...updated event object..." } }
```

---

### DELETE /events/:id
*[ADMIN only]* Hapus event.

**Response 200**
```json
{ "status": "success", "data": null, "message": "Event deleted", "meta": null }
```

---

## 4. RSVP

### POST /events/:id/rsvp
Umat RSVP ke event.

**Request Body**
```json
{ "status": "hadir" }
```

**status:** `hadir` | `tidak_hadir`

**Response 201**
```json
{
  "status": "success",
  "data": {
    "event_id": "uuid",
    "user_id": "uuid",
    "status": "hadir",
    "created_at": "2025-06-30T12:00:00Z"
  }
}
```

**Errors**
- `409` — Sudah RSVP sebelumnya (gunakan PATCH untuk update)

---

### PATCH /events/:id/rsvp
Update RSVP yang sudah ada.

**Request Body**
```json
{ "status": "tidak_hadir" }
```

**Response 200**
```json
{ "status": "success", "data": { "...updated rsvp..." } }
```

---

### GET /events/:id/rsvps
*[PENGURUS/ADMIN only]* List semua RSVP untuk satu event.

**Response 200**
```json
{
  "status": "success",
  "data": [
    {
      "user_id": "uuid",
      "name": "Budi Santoso",
      "status": "hadir",
      "created_at": "2025-06-30T12:00:00Z"
    }
  ],
  "meta": { "total_hadir": 20, "total_tidak_hadir": 3 }
}
```

---

## 5. ABSENSI (QR)

### POST /events/:id/qr
*[PENGURUS/ADMIN only]* Generate atau regenerate QR code untuk event.

**Request Body** *(optional)*
```json
{ "expires_at": "2025-07-06T10:00:00Z" }
```

**Response 201**
```json
{
  "status": "success",
  "data": {
    "event_id": "uuid",
    "code": "EVT-ABC123",
    "expires_at": "2025-07-06T10:00:00Z",
    "qr_image_url": "https://cdn.sekkha.app/qr/EVT-ABC123.png"
  }
}
```

---

### POST /attendances/scan
Umat scan QR → otomatis catat kehadiran.

**Request Body**
```json
{ "code": "EVT-ABC123" }
```

**Response 201**
```json
{
  "status": "success",
  "data": {
    "event_id": "uuid",
    "event_title": "Kebaktian Minggu",
    "user_id": "uuid",
    "method": "qr",
    "scanned_at": "2025-07-06T08:15:00Z",
    "streak_updated": true,
    "current_streak": 5,
    "points_earned": 10
  }
}
```

**Errors**
- `404` — QR code tidak ditemukan
- `410` — QR code sudah expired
- `409` — User sudah absen di event ini

---

### POST /events/:id/attendances/manual
*[PENGURUS/ADMIN only]* Catat kehadiran manual.

**Request Body**
```json
{ "user_id": "uuid" }
```

**Response 201**
```json
{
  "status": "success",
  "data": {
    "event_id": "uuid",
    "user_id": "uuid",
    "method": "manual",
    "scanned_at": "2025-07-06T09:00:00Z"
  }
}
```

---

### GET /events/:id/attendances
*[PENGURUS/ADMIN only]* List kehadiran di satu event.

**Response 200**
```json
{
  "status": "success",
  "data": [
    {
      "user_id": "uuid",
      "name": "Budi Santoso",
      "method": "qr",
      "scanned_at": "2025-07-06T08:15:00Z"
    }
  ],
  "meta": { "total": 18 }
}
```

---

### GET /users/me/attendances
Riwayat kehadiran milik user sendiri.

**Query Params**

| Param | Type | Description |
|-------|------|-------------|
| from | date | filter mulai |
| to | date | filter akhir |
| page | int | default: 1 |

**Response 200**
```json
{
  "status": "success",
  "data": [
    {
      "event_id": "uuid",
      "event_title": "Kebaktian Minggu",
      "event_date": "2025-07-06T08:00:00Z",
      "method": "qr",
      "scanned_at": "2025-07-06T08:15:00Z"
    }
  ],
  "meta": { "total": 24 }
}
```

---

## 6. GAMIFIKASI

### GET /users/me/streak
Ambil data streak milik user sendiri.

**Response 200**
```json
{
  "status": "success",
  "data": {
    "current_streak": 5,
    "longest_streak": 8,
    "last_attendance_date": "2025-07-06",
    "next_milestone": 7,
    "points_to_next_level": 70
  }
}
```

---

### GET /users/:id/streak
*[PENGURUS/ADMIN only]* Lihat streak umat tertentu.

**Response 200**
```json
{
  "status": "success",
  "data": {
    "user_id": "uuid",
    "current_streak": 3,
    "longest_streak": 10,
    "last_attendance_date": "2025-06-29"
  }
}
```

---

### GET /users/me/level
Ambil data level dan poin milik user sendiri.

**Response 200**
```json
{
  "status": "success",
  "data": {
    "level": 3,
    "total_points": 230,
    "points_to_next_level": 70,
    "level_label": "Umat Setia"
  }
}
```

---

### GET /badges
List semua badge yang tersedia.

**Response 200**
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "name": "Pertama Kali Hadir",
      "description": "Berhasil scan QR pertama kalinya",
      "icon_url": "https://cdn.sekkha.app/badges/first.png",
      "condition_type": "total_attendance",
      "condition_value": 1
    },
    {
      "id": "uuid",
      "name": "Streak 5",
      "description": "Hadir 5 minggu berturut-turut",
      "icon_url": "https://cdn.sekkha.app/badges/streak5.png",
      "condition_type": "streak",
      "condition_value": 5
    }
  ]
}
```

---

### GET /users/me/badges
Ambil badge yang sudah didapat user sendiri.

**Response 200**
```json
{
  "status": "success",
  "data": [
    {
      "badge_id": "uuid",
      "name": "Pertama Kali Hadir",
      "icon_url": "https://cdn.sekkha.app/badges/first.png",
      "earned_at": "2025-01-19T08:15:00Z"
    }
  ]
}
```

---

### GET /leaderboard
Leaderboard top umat berdasarkan poin atau streak.

**Query Params**

| Param | Type | Description |
|-------|------|-------------|
| type | string | `points` (default), `streak` |
| limit | int | default: 10, max: 50 |

**Response 200**
```json
{
  "status": "success",
  "data": [
    {
      "rank": 1,
      "user_id": "uuid",
      "name": "Budi Santoso",
      "photo_url": "https://cdn.sekkha.app/photos/uuid.jpg",
      "value": 530,
      "label": "530 poin"
    }
  ]
}
```

---

## 7. PRIVATE CHANNEL (Threads)

### POST /threads
Umat buka thread baru ke pengurus.

**Request Body**
```json
{
  "subject": "Pertanyaan tentang jadwal meditasi",
  "message": "Halo kak, apakah ada kelas meditasi untuk pemula?"
}
```

**Response 201**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "subject": "Pertanyaan tentang jadwal meditasi",
    "status": "open",
    "created_at": "2025-07-01T10:00:00Z",
    "messages": [
      {
        "id": "uuid",
        "sender_id": "uuid-umat",
        "sender_name": "Budi Santoso",
        "content": "Halo kak, apakah ada kelas meditasi untuk pemula?",
        "created_at": "2025-07-01T10:00:00Z"
      }
    ]
  }
}
```

---

### GET /threads
List semua thread milik user sendiri (umat) atau semua thread (pengurus/admin).

**Query Params**

| Param | Type | Description |
|-------|------|-------------|
| status | string | `open`, `in_progress`, `closed` |
| assigned_to | UUID | *[PENGURUS]* filter by pengurus yang handle |
| page | int | default: 1 |

**Response 200**
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "subject": "Pertanyaan tentang jadwal meditasi",
      "status": "open",
      "assigned_to": null,
      "last_message": "Halo kak, apakah ada kelas meditasi...",
      "last_message_at": "2025-07-01T10:00:00Z",
      "unread_count": 1
    }
  ],
  "meta": { "page": 1, "per_page": 20, "total": 5 }
}
```

---

### GET /threads/:id
Detail thread beserta semua pesan.

**Response 200**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "subject": "Pertanyaan tentang jadwal meditasi",
    "status": "in_progress",
    "assigned_to": {
      "id": "uuid-pengurus",
      "name": "Kakak Pengurus"
    },
    "created_at": "2025-07-01T10:00:00Z",
    "messages": [
      {
        "id": "uuid",
        "sender_id": "uuid-umat",
        "sender_name": "Budi Santoso",
        "sender_role": "umat",
        "content": "Halo kak, apakah ada kelas meditasi untuk pemula?",
        "created_at": "2025-07-01T10:00:00Z"
      },
      {
        "id": "uuid",
        "sender_id": "uuid-pengurus",
        "sender_name": "Kakak Pengurus",
        "sender_role": "pengurus",
        "content": "Halo! Ada kok, setiap Sabtu jam 7 pagi.",
        "created_at": "2025-07-01T11:00:00Z"
      }
    ]
  }
}
```

---

### POST /threads/:id/messages
Kirim pesan baru dalam thread.

**Request Body**
```json
{ "content": "Wah oke, makasih kak!" }
```

**Response 201**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "thread_id": "uuid",
    "sender_id": "uuid",
    "content": "Wah oke, makasih kak!",
    "created_at": "2025-07-01T11:30:00Z"
  }
}
```

---

### PATCH /threads/:id
*[PENGURUS/ADMIN only]* Update status thread atau assign ke pengurus.

**Request Body** *(semua optional)*
```json
{
  "status": "in_progress",
  "assigned_to": "uuid-pengurus"
}
```

**Response 200**
```json
{ "status": "success", "data": { "...updated thread..." } }
```

---

## 8. DASHBOARD PENGURUS

### GET /dashboard/stats
*[PENGURUS/ADMIN only]* Ringkasan statistik keseluruhan.

**Response 200**
```json
{
  "status": "success",
  "data": {
    "users": {
      "total": 87,
      "active": 54,
      "inactive": 20,
      "new": 8,
      "alumni": 5
    },
    "events": {
      "total_this_month": 4,
      "avg_attendance": 32,
      "upcoming": 2
    },
    "engagement": {
      "avg_streak": 3.2,
      "top_streak": 12,
      "threads_open": 5
    }
  }
}
```

---

### GET /dashboard/inactive-users
*[PENGURUS/ADMIN only]* List umat yang tidak aktif berdasarkan threshold hari.

**Query Params**

| Param | Type | Description |
|-------|------|-------------|
| days | int | default: 30 (tidak hadir X hari terakhir) |
| page | int | default: 1 |
| per_page | int | default: 20 |

**Response 200**
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "name": "Budi Santoso",
      "email": "budi@example.com",
      "phone": "081234567890",
      "last_seen_at": "2025-04-12T08:00:00Z",
      "days_inactive": 50,
      "total_attendance_all_time": 15
    }
  ],
  "meta": { "total": 20, "threshold_days": 30 }
}
```

---

### GET /dashboard/attendance-chart
*[PENGURUS/ADMIN only]* Data kehadiran per event untuk chart.

**Query Params**

| Param | Type | Description |
|-------|------|-------------|
| from | date | filter mulai (YYYY-MM-DD) |
| to | date | filter akhir (YYYY-MM-DD) |
| event_type | string | `rutin`, `special` |

**Response 200**
```json
{
  "status": "success",
  "data": [
    {
      "event_id": "uuid",
      "event_title": "Kebaktian Minggu",
      "event_date": "2025-07-06",
      "rsvp_count": 23,
      "attendance_count": 18,
      "attendance_rate": 78.3
    }
  ]
}
```

---

### GET /dashboard/top-members
*[PENGURUS/ADMIN only]* Umat paling aktif berdasarkan poin, streak, atau kehadiran.

**Query Params**

| Param | Type | Description |
|-------|------|-------------|
| by | string | `points`, `streak`, `attendance` (default: `points`) |
| limit | int | default: 10 |

**Response 200**
```json
{
  "status": "success",
  "data": [
    {
      "rank": 1,
      "user_id": "uuid",
      "name": "Budi Santoso",
      "photo_url": "https://cdn.sekkha.app/photos/uuid.jpg",
      "value": 530,
      "metric": "points"
    }
  ]
}
```

---

## Summary Endpoint Index

| Method | Endpoint | Role | Deskripsi |
|--------|----------|------|-----------|
| POST | /auth/register | Public | Daftar akun |
| POST | /auth/login | Public | Login |
| POST | /auth/logout | All | Logout |
| PATCH | /auth/change-password | All | Ganti password |
| GET | /users/me | All | Profil sendiri |
| PATCH | /users/me | All | Update profil sendiri |
| GET | /users | Pengurus+ | List semua umat |
| GET | /users/:id | Pengurus+ | Detail satu umat |
| PATCH | /users/:id/role | Admin | Update role |
| PATCH | /users/:id/status | Pengurus+ | Update status |
| POST | /events | Pengurus+ | Buat event |
| GET | /events | All | List events |
| GET | /events/:id | All | Detail event |
| PATCH | /events/:id | Pengurus+ | Update event |
| DELETE | /events/:id | Admin | Hapus event |
| POST | /events/:id/rsvp | All | RSVP event |
| PATCH | /events/:id/rsvp | All | Update RSVP |
| GET | /events/:id/rsvps | Pengurus+ | List RSVP |
| POST | /events/:id/qr | Pengurus+ | Generate QR |
| POST | /attendances/scan | All | Scan QR absensi |
| POST | /events/:id/attendances/manual | Pengurus+ | Absensi manual |
| GET | /events/:id/attendances | Pengurus+ | List kehadiran event |
| GET | /users/me/attendances | All | Riwayat hadir sendiri |
| GET | /users/me/streak | All | Streak sendiri |
| GET | /users/:id/streak | Pengurus+ | Streak umat tertentu |
| GET | /users/me/level | All | Level & poin sendiri |
| GET | /badges | All | List semua badge |
| GET | /users/me/badges | All | Badge yang sudah earned |
| GET | /leaderboard | All | Leaderboard |
| POST | /threads | All | Buka thread baru |
| GET | /threads | All | List thread |
| GET | /threads/:id | All | Detail thread |
| POST | /threads/:id/messages | All | Kirim pesan |
| PATCH | /threads/:id | Pengurus+ | Update status/assign thread |
| GET | /dashboard/stats | Pengurus+ | Statistik overview |
| GET | /dashboard/inactive-users | Pengurus+ | Umat tidak aktif |
| GET | /dashboard/attendance-chart | Pengurus+ | Chart kehadiran |
| GET | /dashboard/top-members | Pengurus+ | Top umat |
