# Spesifikasi Kontrak API: Domain Notifikasi (`notifications`)

Dokumen ini mendefinisikan kontrak komunikasi resmi untuk sistem notifikasi dalam aplikasi, penandaan status pesan terbaca, dan pengiriman notifikasi berbasis aktivitas jemaat.

---

## 1. Ikhtisar Modul
- **Base Route**: `/api/notifications`
- **Keamanan**: `requireAuth` (setiap pengguna hanya dapat membaca dan memodifikasi notifikasi milik akunnya sendiri).
- **Jenis Notifikasi**:
  - `event_reminder`: Pengingat jadwal acara yang akan datang.
  - `streak_alert`: Peringatan mempertahankan streak mingguan.
  - `badge_unlocked`: Pemberitahuan pencapaian lencana baru.
  - `points_awarded`: Informasi penambahan poin dari presensi / aktivitas.

---

## 2. Rincian Endpoint

### 2.1. `GET /api/notifications`
Mengambil daftar notifikasi pengguna yang sedang login (diurutkan dari yang terbaru).

- **Headers**: `Authorization: Bearer <accessToken>`
- **Query Parameters**:
  - `page` (number, default: 1)
  - `limit` (number, default: 20, max: 50)
- **Response (200 OK)**:
  ```json
  [
    {
      "id": "notif_cl12345",
      "title": "Lencana Baru Terbuka! 🎖️",
      "message": "Selamat! Anda mendapatkan lencana 'Langkah Pertama' atas kehadiran kebaktian.",
      "type": "badge_unlocked",
      "status": "unread",
      "data": {
        "badge_id": "bdg_first_attendance"
      },
      "created_at": "2026-09-13T09:15:22.000Z"
    }
  ]
  ```

---

### 2.2. `PATCH /api/notifications/:id/read`
Menandai satu notifikasi sebagai sudah dibaca (`status: "read"`).

- **Headers**: `Authorization: Bearer <accessToken>`
- **Path Parameters**:
  - `id`: ID notifikasi
- **Response (200 OK)**:
  ```json
  {
    "success": true
  }
  ```
- **Errors**:
  - `404 Not Found`: Notifikasi tidak ditemukan.
  - `403 Forbidden`: Mencoba mengubah notifikasi milik pengguna lain.
