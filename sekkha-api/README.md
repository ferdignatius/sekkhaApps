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
docker exec -it sekkha-api npx prisma db push
docker exec -it sekkha-api npm run db:seed
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

### 5. Konfigurasi di Nginx Proxy Manager (NPM)
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

### 6. Inisialisasi Database & Seed Data di Container
Jalankan push schema Prisma dan seeding data awal langsung di dalam container yang berjalan:

```bash
# Sync Schema Prisma ke PostgreSQL (menggunakan Prisma 6 terpasang)
docker compose exec sekkha-api bun run db:push
# atau eksplisit versi: docker compose exec sekkha-api bunx prisma@6.9.0 db push

# Run Seed Akun Test & Master Data (Home, Event, Leaderboard)
docker compose exec -e ALLOW_PROD_SEED=true sekkha-api bun run db:seed
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
# 1. Jalankan PostgreSQL & Redis Lokal (opsional)
docker compose up -d

# 2. Install Dependencies
npm install

# 3. Setup Database & Seed
npm run db:push
npm run db:seed

# 4. Run Dev Server
npm run dev
```

Server lokal berjalan di `http://localhost:4000/api`.


