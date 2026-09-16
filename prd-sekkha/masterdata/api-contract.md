# Spesifikasi Kontrak API: Domain Master Data (`masterdata`)

Modul **Master Data** mencakup pengelolaan seluruh entitas referensi utama aplikasi Sekkha Apps, termasuk Kategori Acara (*Event Types*), Lencana Presensi (*Attendance Badges*), Jenjang Poin/Level, Waktu Acara, dan Sekolah.

Kontrak API teknis dibagi ke dalam modul berikut:
1. **[Master Konfigurasi, Lencana, Level, & Acara (`prd-sekkha/configure/api-contract.md`)](../configure/api-contract.md)**
   - `/api/configure/badges` & `/api/configure/achievements`
   - `/api/configure/levels`
   - `/api/configure/event-types`
   - `/api/configure/event-times`
   - `/api/configure/seasons`
   - `/api/configure/points-rules`
   - `/api/configure/threshold`
2. **[Master Data Sekolah & Institusi (`prd-sekkha/schools/api-contract.md`)](../schools/api-contract.md)**
   - `/api/schools` (Daftar & pencarian sekolah)
   - `/api/schools/stats` (Statistik distribusi jemaat per sekolah)
