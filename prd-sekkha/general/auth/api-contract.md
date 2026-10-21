# API Contract: Authentication Domain

All endpoints use base route `/api/auth`.

## Standard envelope

Every response uses:

```json
{
  "status": "success",
  "code": 200,
  "message": "Request completed successfully",
  "data": {}
}
```

`status` is `success` or `fail`. `code` equals HTTP status. `message` is always a string. `data` contains payload or `null` on failure.

## `POST /api/auth/register-request`

Sends sign-up OTP. Does not create an active account.

Request:

```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "name": "Budi Santoso",
  "username": "budisantoso"
}
```

Success `200`:

```json
{
  "status": "success",
  "code": 200,
  "message": "Registration OTP sent",
  "data": { "expires_in_seconds": 600 }
}
```

## `POST /api/auth/register-verify-otp`

Verifies sign-up OTP, creates account with role `member`, and starts session.

```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

Success `201`:

```json
{
  "status": "success",
  "code": 201,
  "message": "Registration successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresInSeconds": 900,
    "onboarding_completed": false,
    "user": {
      "id": "usr_123",
      "email": "user@example.com",
      "username": "budisantoso",
      "name": "Budi Santoso",
      "role": "member"
    }
  }
}
```

## `POST /api/auth/resend-otp`

Resends sign-up OTP. Same envelope as `register-request`.

## `POST /api/auth/login`

Password login. No OTP is sent or requested.

```json
{
  "identifier": "user@example.com",
  "password": "Password123!"
}
```

Success `200`:

```json
{
  "status": "success",
  "code": 200,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresInSeconds": 900,
    "onboarding_completed": true,
    "user": {
      "id": "usr_123",
      "email": "user@example.com",
      "username": "budisantoso",
      "name": "Budi Santoso",
      "role": "member"
    }
  }
}
```

## `POST /api/auth/refresh`

Rotates refresh token from HttpOnly cookie and returns the standard envelope. Refresh token is never returned outside `data`.

## `POST /api/auth/logout`

Requires `Authorization: Bearer <accessToken>`. Returns `200` with `data: null` after invalidating session and clearing cookie.

## `GET /api/auth/verify`

Requires bearer token. Returns user and `onboarding_completed` inside `data`.

## Forgot password

### `POST /api/auth/forgot-password/request`

Request:

```json
{ "email": "user@example.com" }
```

Always return generic success to prevent email enumeration:

```json
{
  "status": "success",
  "code": 200,
  "message": "If the email exists, a password reset OTP has been sent",
  "data": null
}
```

### `POST /api/auth/forgot-password/verify-otp`

```json
{
  "email": "user@example.com",
  "otp": "654321"
}
```

Success `200` returns `{ "reset_token": "...", "expires_in_seconds": 600 }` in `data`.

### `POST /api/auth/forgot-password/reset`

```json
{
  "email": "user@example.com",
  "reset_token": "rst_random_token_string",
  "newPassword": "NewStrongPassword123!"
}
```

Success `200` returns `data: null`. All existing sessions must be invalidated.

## Error example

```json
{
  "status": "fail",
  "code": 401,
  "message": "Invalid credentials",
  "data": null
}
```

Roles must use only `member`, `activist`, `organizer`, or `admin`.
