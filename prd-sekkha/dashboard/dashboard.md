# PRD: Dashboard / Home — Sekkha Apps

| Metadata | Detail |
| --- | --- |
| **Dokumen** | Product Requirement Document (PRD) |
| **Fitur** | Dashboard (Home) — Gamifikasi Personal |
| **Aplikasi** | Sekkha Apps (Frontend & Backend) |
| **Versi** | 1.0.0 |
| **Status** | Approved / Ready for Development |

---

## 1. Ringkasan Eksekutif & Tujuan

Dashboard adalah halaman **Home** yang pertama kali dilihat pengguna setelah login (`/home`). Halaman ini berfungsi sebagai pusat **gamifikasi personal**: menampilkan progres, aktivitas terkini, ajakan bertindak, dan "rasa memiliki" terhadap komunitas.

Berbeda dari halaman fitur (Events, Leaderboard, Profile), Dashboard bersifat **ringkasan cepat** — pengguna bisa melihat "apa yang penting hari ini" tanpa harus menavigasi ke banyak halaman.

### 🎯 Tujuan Utama
1. **Engagement harian**: mendorong user kembali ke aplikasi setiap hari via streak, event berikutnya, aktivitas terbaru.
2. **Visualisasi progres**: menunjukkan poin, level, badge secara ringkas dan memotivasi.
3. **Personal touch**: salam + nama user, avatar, ringkasan personal.
4. **Spiritual touch**: kutipan Dhamma acak untuk mengingatkan nilai-nilai vihara.
5. **Akses cepat**: pintasan ke fitur utama tanpa harus menggali menu.

---

## 2. Target Pengguna & Role

Semua role yang sudah login dapat mengakses Dashboard:

| Role | Akses | Tampilan Spesifik |
| --- | --- | --- |
| `umat` | ✅ Default landing | Gamifikasi personal lengkap |
| `aktivis` | ✅ | + highlight tugas kepanitiaan / scanner shortcut |
| `pengurus` | ✅ | + analytics ringkas (jumlah event minggu ini, anggota baru) |
| `admin` | ✅ | Sama dengan pengurus (admin tidak punya halaman khusus di sini) |

Dashboard **tidak menampilkan** data sensitif user lain secara default. Privacy: data hanya milik user yang login.

---

## 3. Komponen Utama (Berdasarkan Implementasi)

Berdasarkan struktur `src/modules/dashboard/internal/components/`:

| Komponen | Tujuan |
| --- | --- |
| `DashboardPage` | Layout utama, grid komponen di bawah ini |
| `ProfileSummaryCard` | Avatar + nama + salam "Selamat pagi/siang/malam" + ringkasan level/poin |
| `NextEventCard` | Event terdekat yang user RSVP, dengan CTA "Lihat Detail" |
| `LatestActivityCard` | 3-5 aktivitas terbaru (badge earned, attendance recorded, dll.) |
| `AnnouncementCard` | Pengumuman broadcast dari pengurus |
| `DhammaWidget` | Kutipan Dhamma acak dari `public/dhammapada.json` |

---

## 4. User Stories

| ID | Sebagai | Saya ingin | Supaya |
| --- | --- | --- | --- |
| US-01 | Umat | Melihat ringkasan streak, poin, level saya di satu tempat | Tidak perlu buka banyak halaman untuk tahu progres |
| US-02 | Umat | Melihat event berikutnya yang sudah saya RSVP | Tidak lupa hadir |
| US-03 | Umat | Melihat aktivitas terbaru saya (badge, presensi) | Merasakan progres |
| US-04 | Umat | Membaca kutipan Dhamma acak | Mendapat pengingat nilai spiritual |
| US-05 | Aktivis | Pintasan ke fitur scan QR presensi | Cepat absen saat event |
| US-06 | Pengurus | Melihat ringkas jumlah event minggu ini | Manage prioritas |

---

## 5. Functional Requirements

### 5.1. Data Source

Dashboard **tidak membuat endpoint baru**. Data digabung dari endpoint existing:

| Kartu | Endpoint (existing) |
| --- | --- |
| `ProfileSummaryCard` | `GET /api/users/me`, `GET /api/users/me/level` |
| `NextEventCard` | `GET /api/events?upcoming=true&userRsvp=true` |
| `LatestActivityCard` | `GET /api/users/me/attendances?limit=5` + `GET /api/users/me/badges?limit=5` |
| `AnnouncementCard` | `GET /api/notifications?type=announcement&limit=3` |
| `DhammaWidget` | Static fetch dari `public/dhammapada.json` (client-side random) |

### 5.2. Personalisasi

- **Salam berdasarkan jam lokal** (pagi < 11, siang < 15, sore < 18, malam setelahnya).
- **DhammaWidget**: ambil 1 quote random per hari (berdasarkan `Date.now()` modulo) supaya konsisten dalam 1 hari tapi beda tiap hari.

### 5.3. Loading & Error State

- Setiap card memiliki skeleton state (`skeleton.tsx`) saat loading.
- Error pada 1 card **tidak boleh** meruntuhkan seluruh dashboard — tampilkan empty state + retry per card.
- Stale data: gunakan data terakhir yang sukses + tampilkan badge "Updated X minutes ago".

### 5.4. Responsive

- **Desktop**: grid 2 kolom (kiri: profil + next event; kanan: activity + announcement + dhamma).
- **Mobile**: stack vertikal, Next Event paling atas (CTA terkuat).

---

## 6. UI/UX & NFR

1. **Hero Card** (ProfileSummaryCard) menggunakan warna brand Sekkha (Yellow/Blue gradient halus dari DESIGN.md).
2. **Skeleton shimmer** untuk setiap card (bukan spinner global).
3. **First-paint time**: target < 1.5s di 4G (lihat skill `performance-optimization`).
4. **Aksesibilitas**: heading hierarchy benar (h1 = salam, h2 = section, h3 = card title).

---

## 7. Acceptance Criteria

| ID | Skenario | Hasil yang Diharapkan |
| --- | --- | --- |
| **AC-01** | User login pertama kali (umat) → buka `/home` | ProfileSummary menampilkan nama + level 1 + poin 0. Salam: "Selamat [waktu], [Nama]" |
| **AC-02** | User yang punya RSVP event hari ini | NextEventCard menampilkan judul event + waktu + lokasi + CTA "Lihat Detail" |
| **AC-03** | User yang belum RSVP event apapun | NextEventCard menampilkan empty state: "Belum ada event terdekat. Cek Events" |
| **AC-04** | User yang punya 3 presensi dalam 7 hari terakhir | LatestActivityCard menampilkan 3 entry terakhir (event title + tanggal) |
| **AC-05** | DhammaWidget muncul | 1 kutipan Dhamma acak tampil, konsisten sepanjang hari yang sama untuk user yang sama |
| **AC-06** | User pengurus login | AnnouncementCard menampilkan 1 pengumuman aktif (kalau ada) |
| **AC-07** | Backend down saat buka dashboard | Skeleton muncul, setelah timeout setiap card tampil empty state + tombol retry; tidak ada error overlay global |
| **AC-08** | Buka `/home` di mobile (375px) | Layout stack vertikal, tap target minimal 44px, NextEventCard di paling atas |
| **AC-09** | User tanpa auth coba buka `/home` | Auto-redirect ke `/login?redirectTo=/home` |

---

## 8. Out of Scope

- Drag-and-drop / reorder kartu (bisa jadi iterasi berikutnya).
- Custom widget per user (semua user lihat layout sama).
- Notifikasi real-time di dashboard (push via `notificationsModule` saja).
- Personalisasi layout berdasarkan machine learning.

---

## 9. Open Questions

1. Apakah pengurus butuh widget khusus "tugas pengurus yang belum selesai" di dashboard?
2. Apakah ada konsep "Daily Check-in" (tap tombol → dapat poin) yang akan ditambahkan ke ProfileSummaryCard?
3. Apakah DhammaWidget perlu bisa di-share ke media sosial?

---

## 10. Referensi

- `sekkha-frontend/src/modules/dashboard/` — implementasi existing
- `sekkha-frontend/public/dhammapada.json` — sumber kutipan Dhamma
- `DESIGN.md` — design tokens (warna brand, typography)
- `sekkha-api-contract.md` — kontrak endpoint yang dipakai