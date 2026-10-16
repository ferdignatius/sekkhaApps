# PRD: Notifications — Sekkha Apps

| Metadata | Detail |
| --- | --- |
| **Dokumen** | Product Requirement Document (PRD) |
| **Fitur** | In-App Notifications |
| **Aplikasi** | Sekkha Apps (Frontend & Backend) |
| **Versi** | 1.0.0 |
| **Status** | Approved / Ready for Development |

---

## 1. Ringkasan Eksekutif & Tujuan

Sistem notifikasi in-app adalah **komunikasi server-ke-user** dalam aplikasi. Berbeda dengan email/SMS, notifikasi in-app muncul sebagai bell icon di sidebar + halaman khusus `/notifications`.

### 🎯 Tujuan Utama
1. **Real-time awareness**: event baru, broadcast pengurus, badge earned, RSVP reminder.
2. **Tidak mengganggu**: tidak pakai push notification OS (di luar scope) — fokus in-app.
3. **History**: user bisa lihat kembali notifikasi yang sudah lewat.
4. **Read state**: pisahkan read vs unread, dengan badge counter di bell icon.

---

## 2. Target Pengguna & Role

| Role | Akses |
| --- | --- |
| `umat` | ✅ Lihat notifikasi personal |
| `aktivis` | ✅ + notifikasi tugas kepanitiaan |
| `pengurus` | ✅ + notifikasi sistem (approval request, dll) |
| `admin` | ✅ |

**Privilege**: user hanya bisa baca notifikasi miliknya sendiri.

---

## 3. Komponen

Berdasarkan `sekkha-frontend/src/modules/notifications/internal/components/`:

| Komponen | Tujuan |
| --- | --- |
| `NotificationBell` | Bell icon di sidebar + badge unread count + dropdown ringkas 5 terakhir |
| `useUnreadNotificationsCount` | Hook untuk polling unread count (dipakai sidebar) |
| `NotificationsPage` | Halaman `/notifications` — list lengkap + filter |

Backend: `sekkha-api/src/modules/notifications/internal/router.ts`

---

## 4. User Stories

| ID | Sebagai | Saya ingin | Supaya |
| --- | --- | --- | --- |
| US-01 | Umat | Melihat badge "3" di bell icon | Tahu ada notifikasi baru |
| US-02 | Umat | Klik bell → melihat 5 notifikasi terakhir | Quick preview tanpa pindah halaman |
| US-03 | Umat | Buka halaman /notifications | Lihat semua notifikasi, baik yang read maupun unread |
| US-04 | Umat | Klik notifikasi "Event Besok" | Pindah ke detail event + otomatis tandai read |
| US-05 | Umat | Filter "Unread saja" | Fokus ke hal yang belum ditindaklanjuti |
| US-06 | Umat | Mark all as read | Reset badge counter |

---

## 5. Functional Requirements

### 5.1. Jenis Notifikasi

| Tipe | Trigger | Payload |
| --- | --- | --- |
| `event.created` | Pengurus buat event baru | `{ event_id, title, date }` |
| `event.reminder` | H-1 event yang user RSVP | `{ event_id, title }` |
| `attendance.recorded` | Presensi user dicatat | `{ event_id, event_title, points_earned }` |
| `badge.earned` | User unlock badge | `{ badge_id, badge_name, points }` |
| `rsvp.confirmed` | User RSVP event | `{ event_id, event_title }` |
| `announcement` | Pengurus broadcast | `{ announcement_id, title, preview }` |
| `level.up` | User naik level | `{ new_level, points_total }` |
| `streak.shield.activated` | Streak shield trigger | `{ weeks }` |

### 5.2. Polling vs Push

- **MVP**: Polling setiap 60 detik via `useUnreadNotificationsCount`. Tidak butuh WebSocket.
- Trade-off: latency bisa sampai 60 detik, tapi infrastruktur sederhana.

### 5.3. Persistence

- Notifikasi disimpan di DB (bukan hanya in-memory).
- Retention: 90 hari, lalu auto-archive (lihat skill `observability-and-instrumentation`).

### 5.4. Read State

- Field `is_read` (boolean) per notifikasi.
- `read_at` (timestamp) — kapan ditandai read.
- "Mark all as read" → set `is_read=true, read_at=now()` untuk semua unread milik user.

---

## 6. API Contract (Ringkas)

### 6.1. `GET /api/notifications`

**Query Params**:
- `filter?` — `all` (default) | `unread` | `read`
- `type?` — filter per jenis (opsional)
- `limit?` — default 50, max 100
- `cursor?` — pagination cursor

**Response 200:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "notif_001",
      "type": "event.reminder",
      "title": "Besok: Retreat Dhamma",
      "body": "Retreat Dhamma di Vihara. Jam 08:00.",
      "link": "/events/evt_123",
      "is_read": false,
      "created_at": "2026-09-04T20:00:00Z"
    }
  ],
  "meta": { "next_cursor": null, "unread_count": 5 }
}
```

### 6.2. `GET /api/notifications/unread-count`

**Response 200:**
```json
{ "status": "success", "data": { "count": 5 } }
```

Dipakai oleh `useUnreadNotificationsCount` untuk polling sidebar bell.

### 6.3. `PATCH /api/notifications/:id/read`

Tandai 1 notifikasi sebagai read. Response 204.

### 6.4. `PATCH /api/notifications/read-all`

Tandai semua notifikasi user sebagai read. Response 204.

---

## 7. UI/UX & NFR

1. **Bell badge**: angka unread count, max "9+" untuk ≥10.
2. **Dropdown preview** (max height 400px, scrollable), item: icon per tipe + title + waktu relatif ("2 jam lalu").
3. **Empty state** di `/notifications`: ilustrasi + "Tidak ada notifikasi".
4. **Optimistic update** saat user klik "mark as read" — langsung hilang dari UI, sinkron di background.
5. **Aksesibilitas**: bell icon punya `aria-label="Notifikasi, 3 belum dibaca"`.

---

## 8. Acceptance Criteria

| ID | Skenario | Hasil yang Diharapkan |
| --- | --- | --- |
| **AC-01** | User punya 5 notifikasi unread | Bell icon di sidebar tampil badge "5" |
| **AC-02** | User klik bell | Dropdown muncul dengan 5 notifikasi terbaru, masing-masing dengan icon tipe + title + waktu |
| **AC-03** | User klik "Lihat semua" di dropdown | Pindah ke `/notifications` |
| **AC-04** | User buka `/notifications` | List lengkap notifikasi tampil (default: all) |
| **AC-05** | User klik salah satu notifikasi "Event Besok" | Navigasi ke `/events/:id`, notifikasi otomatis `is_read=true` |
| **AC-06** | User klik filter "Unread" | Hanya tampil notifikasi yang `is_read=false` |
| **AC-07** | User klik "Mark all as read" | Semua unread ditandai read, bell badge hilang, ada toast konfirmasi |
| **AC-08** | Polling 60 detik | Unread count ter-update otomatis tanpa refresh |
| **AC-09** | User tidak login | Endpoint return 401 |

---

## 9. Out of Scope

- Push notification OS (FCM/APNs).
- Email digest.
- Notifikasi ke WhatsApp/Telegram.
- Notification preferences per user (mute per tipe).

---

## 10. Open Questions

1. Apakah perlu notification grouping (mis. 3 event baru dalam sehari → 1 notif "3 event baru")?
2. Apakah pengurus butuh broadcast UI untuk kirim announcement ke semua user?

---

## 11. Referensi

- `sekkha-frontend/src/modules/notifications/` — implementasi frontend
- `sekkha-api/src/modules/notifications/internal/router.ts` — endpoint
- `prd-sekkha/auth/auth.md` — user identity untuk ownership check
- Skill `observability-and-instrumentation` — untuk retention/archival