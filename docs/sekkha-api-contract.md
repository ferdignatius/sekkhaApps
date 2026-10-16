# Kontrak Spesifikasi API Resmi: Sekkha Monorepo

Dokumen ini adalah single source of truth untuk kontrak komunikasi antara `sekkha-api` (backend Express + Prisma) dan `sekkha-frontend` (TanStack Start + React 19).

---

## 1. Konvensi Umum

* **Base URL**: `/api` (default development: `http://localhost:4000/api`)
* **Content-Type**: `application/json`
* **Credentials**: Cookie HttpOnly `sekkha_refresh_token` didukung lintas origin dengan `credentials: "include"` dan konfigurasi CORS eksplisit.
* **Format Timestamp**: ISO 8601 UTC (`YYYY-MM-DDTHH:mm:ss.sssZ`).
* **Error Envelope**:
  ```json
  {
    "error": "Pesan deskriptif dalam Bahasa Indonesia",
    "code": "ERROR_CODE",
    "details": []
  }
  ```
  * `details` hanya disertakan pada environment `development` (Zod issues list).

---

## 2. Modul Autentikasi (`/api/auth`)

### 2.1 POST `/api/auth/login`
* **Request**:
  ```json
  {
    "identifier": "string (email or username, max 255)",
    "password": "string (min 1, max 128)"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "accessToken": "jwt_token_string",
    "expiresInSeconds": 900,
    "refreshToken": "hex_token_string",
    "user": {
      "id": "string",
      "email": "string",
      "username": "string | null",
      "name": "string",
      "role": "umat | aktivis | pengurus | admin"
    }
  }
  ```
  * **Set-Cookie**: `sekkha_refresh_token=<token>; Path=/api/auth; HttpOnly; SameSite=Lax; Max-Age=604800`

### 2.2 POST `/api/auth/refresh`
* **Request Headers/Cookies**:
  * Cookie: `sekkha_refresh_token` (Browser)
  * OR Body: `{ "refresh_token": "..." }`
  * OR Header: `X-Refresh-Token: ...`
* **Response (200 OK)**:
  Sama dengan response login (menerbitkan access token baru dan refresh token baru via rotasi).
  * **Set-Cookie**: Memperbarui cookie `sekkha_refresh_token`.
* **Response (401 Unauthorized)**:
  `{ "error": "Sesi telah kedaluwarsa atau token tidak valid. Silakan login kembali.", "code": "UNAUTHORIZED" }`

### 2.3 POST `/api/auth/logout`
* **Headers**: `Authorization: Bearer <accessToken>`
* **Cookies**: `sekkha_refresh_token`
* **Response (200 OK)**:
  `{ "success": true, "message": "Berhasil keluar (logout)" }`
  * **Set-Cookie**: `sekkha_refresh_token=; Path=/api/auth; Max-Age=0`

### 2.4 GET `/api/auth/verify`
* **Headers**: `Authorization: Bearer <accessToken>`
* **Response (200 OK)**:
  ```json
  {
    "valid": true,
    "user": {
      "id": "string",
      "email": "string",
      "username": "string | null",
      "name": "string",
      "role": "umat | aktivis | pengurus | admin"
    }
  }
  ```

---

## 3. Modul Profil Pengguna (`/api/users`)

### 3.1 GET `/api/users/me`
* **Headers**: `Authorization: Bearer <accessToken>`
* **Response (200 OK)**:
  ```json
  {
    "id": "string",
    "username": "string | null",
    "email": "string",
    "name": "string",
    "school": "string | null",
    "school_id": "string | null",
    "class_grade": "string | null",
    "phone": "string | null",
    "birth_date": "string (YYYY-MM-DD) | null",
    "gender": "pria | wanita | null",
    "avatar_url": "string | null",
    "role": "umat | aktivis | pengurus | admin",
    "user_number": "string",
    "points": 100,
    "created_at": "ISO_DATE"
  }
  ```

### 3.2 GET `/api/users/me/streak`
* **Response (200 OK)**:
  ```json
  {
    "current_streak": 3,
    "longest_streak": 8
  }
  ```

---

## 4. Modul Events & Presensi (`/api/events`)

### 4.1 GET `/api/events`
* **Query Params**:
  * `page`: integer (default: 1)
  * `limit`: integer (default: 20, max: 50)
* **Visibility Filtering**:
  * Role `umat`: hanya event dengan `visibility` in `["all", "umat"]` dan `status` in `["published", "active", "closed"]`.
  * Role `aktivis`: `visibility` in `["all", "umat", "aktivis"]`.
  * Role `pengurus` / `admin`: melihat seluruh event.
* **Response (200 OK)**: Array of Event objects.

### 4.2 POST `/api/events/:id/attendances`
* **Access**: Restricted to `pengurus`, `admin`, `aktivis`.
* **Request**:
  ```json
  {
    "user_id": "string (user_id / user_number / username)",
    "method": "qr | manual"
  }
  ```
* **Response (201 Created)**:
  ```json
  {
    "id": "att_cuid",
    "user_id": "usr_cuid",
    "event_id": "evt_cuid",
    "method": "qr | manual",
    "points_earned": 10,
    "scanned_at": "ISO_DATE",
    "name": "Hendra Santoso",
    "user_number": "SKH-2026-0001"
  }
  ```

### 4.3 GET `/api/events/:id/attendances`
* **Access**: Restricted to `pengurus`, `admin`, `aktivis`.
* **Query Params**: `page` (default: 1), `limit` (default: 50, max: 100).
