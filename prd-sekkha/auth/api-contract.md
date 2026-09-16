# Spesifikasi Kontrak API: Domain Autentikasi (`auth`)

Dokumen ini mendefinisikan kontrak komunikasi resmi antara backend `sekkha-api` dan antarmuka client untuk domain **Autentikasi**.

---

## 1. Ikhtisar Modul
- **Base Route**: `/api/auth`
- **Tingkat Akses**: Publik (dengan perlindungan Rate Limiting & Brute-force Prevention) dan Terproteksi (khusus `/logout` & `/verify`).
- **Penyimpanan Sesi**:
  - `accessToken`: JWT berumur pendek (15 menit / 900 detik), algoritma HS256, disimpan di memory client/storage.
  - `refreshToken`: Token berkekuatan tinggi (rotasi sekali pakai, TTL 7 hari), disimpan dalam cookie `HttpOnly` (`sekkha_refresh_token`) dan didukung via body request.

---

## 2. Rincian Endpoint

### 2.1. `POST /api/auth/register-request`
Menginisiasi pendaftaran pengguna baru dengan mengirimkan kode OTP ke email.

- **Rate Limit**: 5 per 15 menit per IP.
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "Password123!",
    "name": "Budi Santoso",
    "username": "budisantoso"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "message": "Kode OTP pendaftaran telah dikirim ke email Anda. Silakan periksa kotak masuk."
  }
  ```
- **Errors**:
  - `400 Bad Request`: Format email tidak valid, password kurang dari 8 karakter, atau username mengandung karakter ilegal.
  - `409 Conflict`: Email sudah terdaftar di sistem.
  - `429 Too Many Requests`: Melebihi kuota permintaan OTP.

---

### 2.2. `POST /api/auth/register-verify-otp`
Memverifikasi 6-digit kode OTP dan menyelesaikan proses pendaftaran.

- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "otp": "123456"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "message": "Pendaftaran berhasil",
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresInSeconds": 900,
    "user": {
      "id": "usr_clexample123",
      "email": "user@example.com",
      "username": "budisantoso",
      "name": "Budi Santoso",
      "role": "umat"
    }
  }
  ```
- **Cookie Diterbitkan**:
  `sekkha_refresh_token=<token>; Path=/api/auth; HttpOnly; SameSite=Lax; Max-Age=604800`
- **Errors**:
  - `400 Bad Request`: Kode OTP salah atau format salah (setelah 5 kali salah, OTP dibatalkan).
  - `410 Gone`: Kode OTP telah kedaluwarsa (TTL 10 menit).

---

### 2.3. `POST /api/auth/resend-otp`
Mengirim ulang kode OTP pendaftaran baru.

- **Request Body**:
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "message": "Kode OTP baru telah dikirim."
  }
  ```

---

### 2.4. `POST /api/auth/login`
Autentikasi akun pengguna menggunakan identifier (email/username) dan password.

- **Rate Limit**: 30 per 15 menit per IP.
- **Request Body**:
  ```json
  {
    "identifier": "user@example.com",
    "password": "Password123!"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresInSeconds": 900,
    "refreshToken": "7f9a2b...",
    "user": {
      "id": "usr_clexample123",
      "email": "user@example.com",
      "username": "budisantoso",
      "name": "Budi Santoso",
      "role": "umat"
    }
  }
  ```
- **Cookie Diterbitkan**:
  `sekkha_refresh_token=<token>; Path=/api/auth; HttpOnly; SameSite=Lax; Max-Age=604800`
- **Errors**:
  - `401 Unauthorized`: Kredensial tidak cocok atau pengguna tidak ditemukan.
  - `429 Too Many Requests`: Terlalu banyak percobaan autentikasi.

---

### 2.5. `POST /api/auth/refresh`
Memperpanjang sesi autentikasi dengan merotasi refresh token secara atomik (*single-use rotation*).

- **Headers / Cookies**:
  - Cookie: `sekkha_refresh_token=<token>` (otomatis dikirim browser)
  - ATAU Header: `X-Refresh-Token: <token>`
  - ATAU Body: `{ "refresh_token": "<token>" }`
- **Response (200 OK)**:
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresInSeconds": 900,
    "refreshToken": "new_hex_token_string",
    "user": {
      "id": "usr_clexample123",
      "email": "user@example.com",
      "username": "budisantoso",
      "name": "Budi Santoso",
      "role": "umat"
    }
  }
  ```
- **Cookie Diperbarui**:
  `sekkha_refresh_token=<new_token>; Path=/api/auth; HttpOnly; SameSite=Lax; Max-Age=604800`
- **Errors**:
  - `401 Unauthorized`: Refresh token tidak ditemukan, kedaluwarsa, atau terdeteksi serangan *replay* (token bekas).

---

### 2.6. `POST /api/auth/logout`
Mengakhiri sesi aktif dan memasukkan token ke daftar blacklist.

- **Security**: `requireAuth`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Berhasil keluar (logout)"
  }
  ```
- **Cookie Dicabut**:
  `sekkha_refresh_token=; Path=/api/auth; Max-Age=0`

---

### 2.7. `GET /api/auth/verify`
Memvalidasi keabsahan access token saat ini dan mengambil profil singkat pengguna.

- **Headers**: `Authorization: Bearer <accessToken>`
- **Response (200 OK)**:
  ```json
  {
    "valid": true,
    "user": {
      "id": "usr_clexample123",
      "email": "user@example.com",
      "username": "budisantoso",
      "name": "Budi Santoso",
      "role": "umat"
    }
  }
  ```
- **Errors**:
  - `401 Unauthorized`: Token kedaluwarsa, signature salah, atau token telah di-blacklist.

---

### 2.8. Alur Lupa Password (3 Langkah Aman)

#### A. `POST /api/auth/forgot-password/request`
- **Rate Limit**: 5 per 15 menit per IP. Anti-enumeration: selalu merespons sukses generik.
- **Request Body**:
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "message": "Jika email terdaftar, kode OTP pemulihan telah dikirim."
  }
  ```

#### B. `POST /api/auth/forgot-password/verify-otp`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "otp": "654321"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "valid": true,
    "reset_token": "rst_random_token_string",
    "message": "Kode OTP terverifikasi."
  }
  ```

#### C. `POST /api/auth/forgot-password/reset`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "reset_token": "rst_random_token_string",
    "newPassword": "NewStrongPassword123!"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Password berhasil diubah. Silakan login kembali."
  }
  ```
