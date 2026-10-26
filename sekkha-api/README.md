# Sekkha API

Backend API Service untuk platform digital komunitas remaja vihara Sekkha.

## Tech Stack
- **Node.js** + TypeScript (`tsx`)
- **Express.js** Monolith Modular Architecture
- **Prisma ORM** + PostgreSQL
- **Redis** (Token Session Caching & Performance)
- **JWT** Authentication
- **Docker** (Production Container Image & Deployment)

---

## Opsi A: Standalone Docker Compose (Untuk Server Baru / Fresh Server)

Jika Anda ingin mendeploy seluruh stack (Database PostgreSQL, Redis, pgAdmin, dan Sekkha API) sekaligus dalam 1 komando pada server baru, gunakan file `docker-compose.yml` yang sudah disediakan:

### 1. Jalankan Seluruh Service
Di folder `sekkha-api`, jalankan:
```bash
docker compose up -d --build
```

Ini akan menyalakan secara otomatis:
- **`sekkha-api`**: `http://localhost:4000`
- **`sekkha-postgres`**: `localhost:5432` (`database: sekkha_db`, `user: sekkha`)
- **`sekkha-redis`**: `localhost:6379`

### 2. Inisialisasi Database & Seeding di Server Baru
```bash
# Eksekusi migrasi production (aman, menggunakan prisma migrate deploy)
docker compose exec sekkha-api bun run db:migrate:deploy

# Jalankan Seeding Akun & Master Data (khusus fresh setup pertama kali)
docker compose exec -e ALLOW_PROD_SEED=true sekkha-api bun run db:seed
```

---

## Opsi B: Deployment ke Existing VPS (Cloudflare, NPM & Existing Postgres/Redis)

Berikut adalah panduan jika Anda mendeploy `sekkha-api` ke server yang **sudah memiliki container PostgreSQL Master, Redis, dan Nginx Proxy Manager (NPM)** tersendiri:

### 1. Buat Database `sekkha_db` di PostgreSQL Container
Jalankan perintah berikut di VPS untuk membuat database baru di container PostgreSQL master:

```bash
docker exec -it core-postgres-master-1 psql -U ferdipostgree -d postgres
```

Di dalam prompt `psql`, jalankan query:
```sql
CREATE DATABASE sekkha_db;
\l  -- Cek daftar database untuk memastikan sekkha_db sudah dibuat
\q  -- Keluar dari psql
```

---

### 2. Atur Route di Cloudflare
Buat DNS / Tunnel Route baru di Cloudflare:
- **Subdomain**: `api-sekkha` *(atau `sekkha-api`)*
- **Domain**: `ferdignatius.my.id`
- **Type**: `CNAME` / Tunnel
- **Service Type**: `HTTP`
- **URL / Target**: `http://nginx-proxy-manager:80`

---

### 3. Deploy dengan Docker Compose
Cukup siapkan file `.env` di folder `sekkha-api` yang mengarah ke container PostgreSQL & Redis Anda (lihat `.env.example`), lalu jalankan:

```bash
docker compose up -d --build
```

Compose akan otomatis:
- Mem-build image `sekkha-api`
- Menghubungkan container ke network `data-tier` (akses PostgreSQL & Redis)
- Menghubungkan container ke network `proxy-tier` (akses Nginx Proxy Manager)
- Menerapkan batasan resource CPU/Memory dan logging

---

### 4. Konfigurasi di Nginx Proxy Manager (NPM)
1. Buka dasbor NPM di browser.
2. Masuk ke **Hosts** ➔ **Proxy Hosts** ➔ Klik **Add Proxy Host**.
3. Di tab **Details**:
   - **Domain Names**: `api-sekkha.ferdignatius.my.id`
   - **Scheme**: `http`
   - **Forward Hostname / IP**: `sekkha-api`
   - **Forward Port**: `4000`
   - **Centang Opsi**:
     - ✅ **Websockets Support**
     - ✅ **Block Common Exploits**
     - ✅ **Cache Assets**
4. Di tab **SSL**:
   - Sertifikat: **Request a new SSL Certificate** (Let's Encrypt)
   - Centang **Force SSL** & **HTTP/2 Support**
   - Klik **Save**.

---

### 5. Inisialisasi Database & Seed Data di Container
Jalankan migrasi database resmi dan seeding data awal di container:

```bash
# Terapkan migrasi skema ke PostgreSQL production
docker compose exec sekkha-api bun run db:migrate:deploy

# Cek status migrasi yang telah diterapkan
docker compose exec sekkha-api bun run db:migrate:status

# Run Seed Akun Master & Initial Data (hanya jika database masih kosong)
docker compose exec -e ALLOW_PROD_SEED=true sekkha-api bun run db:seed
```

---

## Manajemen Migrasi Database (Prisma Migration Workflow)

Sekkha API menggunakan alur **Prisma Migrate** resmi untuk menjamin integritas data dan zero downtime di lingkungan production.

### Perintah Script Database

| Script | Command | Kapan Digunakan |
| :--- | :--- | :--- |
| `bun run db:generate` | `prisma generate` | Menghasilkan TypeScript client setelah schema diubah. |
| `bun run db:migrate` | `prisma migrate dev` | **Hanya di Local/Dev**: membuat file migrasi SQL baru dan menerapkan ke DB lokal. |
| `bun run db:migrate:deploy` | `prisma migrate deploy` | **Production Only**: mengeksekusi migrasi yang belum terpasang secara non-interaktif. |
| `bun run db:migrate:status` | `prisma migrate status` | Memeriksa apakah ada migrasi yang belum dieksekusi di database target. |
| `bun run db:seed` | `bun prisma/seed.ts` | Mengisi data master dan akun default ke database. |
| `bun run db:studio` | `prisma studio` | Membuka GUI Prisma Studio di browser untuk inspeksi data. |

### Alur Migrasi Jika Ada Perubahan Schema Pasca-Production

Jika di masa mendatang ada perubahan struktur tabel atau kolom setelah sistem live di production:

1. **Di Komputer Development (Lokal):**
   * Modifikasi file `prisma/schema.prisma` sesuai kebutuhan baru.
   * Buat file migrasi SQL terkomit:
     ```bash
     bunx prisma migrate dev --name <deskripsi_singkat>
     # Contoh: bunx prisma migrate dev --name add_bio_to_user_profile
     ```
   * Periksa isi file SQL yang dihasilkan di folder `prisma/migrations/<timestamp>_<nama>/migration.sql`.
   * Jalankan pengujian di lokal (`bun run build` dan test).
   * Commit file `schema.prisma` dan folder `prisma/migrations/` ke branch Git (`main` / `production`).

2. **Di Server Production:**
   * Pull perubahan kode terbaru:
     ```bash
     git pull origin production
     ```
   * Eksekusi migrasi ke PostgreSQL production:
     ```bash
     bun run db:migrate:deploy
     # Jika menggunakan Docker:
     docker compose exec sekkha-api bun run db:migrate:deploy
     ```
   * *`prisma migrate deploy` membaca tabel internal `_prisma_migrations`, mendeteksi file SQL baru, dan menjalankannya secara atomik (transaksional) tanpa mereset data.*

### Aturan Keamanan Database Production:
* ⚠️ **JANGAN PERNAH** menjalankan `prisma db push` atau `prisma migrate dev` di server production.
* Menambah kolom baru yang bersifat `NOT NULL` wajib menyertakan nilai `@default(...)` agar tidak ditolak oleh baris data yang sudah ada.
* Sebelum migrasi skala besar (misal me-rename tabel/kolom), lakukan backup database terlebih dahulu:
  ```bash
  docker compose exec postgres pg_dump -U sekkha sekkha_db > backup_$(date +%Y%m%d).sql
  ```

---

## Akun Test Kredensial

| Role | Email | Password | Hak Akses Utama |
|---|---|---|---|
| **Umat** | `umat@sekkha.com` | `password123` | Akses publik, RSVP event, presensi QR, leaderboard |
| **Aktivis** | `aktivis@sekkha.com` | `password123` | Umat + hak khusus panitia & bantuan kegiatan |
| **Pengurus** | `pengurus@sekkha.com` | `password123` | Manajemen event, broadcast, analytics |
| **Admin** | `admin@sekkha.com` | `password123` | Full master data, manajemen pengguna & role |

---

## Pengembangan Lokal (Local Development)

Jika ingin menjalankan backend secara lokal tanpa VPS:

```bash
# 1. Jalankan PostgreSQL & Redis Lokal
docker compose up -d postgres redis

# 2. Install Dependencies
bun install

# 3. Setup Database (Generate Client + Migrate Dev + Seed)
bun run db:generate
bun run db:migrate
bun run db:seed

# 4. Jalankan Dev Server
bun run dev
```

Server lokal berjalan di `http://localhost:4000/api`.


