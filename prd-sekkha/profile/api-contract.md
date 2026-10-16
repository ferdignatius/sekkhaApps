# Spesifikasi Kontrak API: Modul Profil (`profile`)

Modul **Profile** di frontend (`src/modules/profile/`) mengonsumsi endpoint pengguna (`/api/users/me/*`) dari backend `sekkha-api`.

Untuk rincian lengkap kontrak teknis request/response schema, kode status, dan header keamanan, lihat:
👉 **[Spesifikasi Lengkap Kontrak API Pengguna (`prd-sekkha/users/api-contract.md`)](../users/api-contract.md)**

### Endpoint Utama yang Dikonsumsi Modul Profil:
1. `GET /api/users/me`: Profil biodata, nomor anggota (NV-XXXX-XXXX), poin, dan sekolah.
2. `PATCH /api/users/me`: Pembaruan profil mandiri (nama, no HP, sekolah, kelas, tanggal lahir).
3. `GET /api/users/me/streak`: Status keaktifan beruntun (minggu berturut-turut).
4. `GET /api/users/me/level`: Level gamifikasi & progress bar ke level berikutnya.
5. `GET /api/users/me/badges`: Daftar lencana yang telah dikumpulkan.
6. `GET /api/users/me/attendances`: Riwayat presensi acara yang dihadiri.
7. `GET /api/users/me/point-transactions`: Riwayat mutasi perolehan poin.
8. `POST /api/users/change-password`: Ganti kata sandi.
9. `GET /api/users/me/export`: Ekspor data pribadi (UU PDP).
10. `POST /api/users/me/delete-account`: Hapus akun secara mandiri.
