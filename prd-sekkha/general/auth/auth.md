# PRD: Authentication System - Sekkha Apps

| Metadata | Detail |
| --- | --- |
| **Document** | Product Requirement Document (PRD) |
| **Feature** | Manual Authentication |
| **Application** | Sekkha Apps |
| **Version** | 2.0.0 |
| **Status** | Approved / Ready for Development |

## 1. Scope and goals

Sekkha uses manual authentication only: email or username plus password. No Google OAuth, social login, or passwordless sign-in.

Goals:
1. Secure account registration with email OTP verification.
2. Password login without OTP.
3. Password recovery with email OTP.
4. Send newly registered users to onboarding before Home.
5. Use English role values consistently in API, database, JWT, and UI mapping.
6. Use one response envelope for every API endpoint.

## 2. Roles

| API role | Meaning | Default |
| --- | --- | --- |
| `member` | Regular community member. | Yes |
| `activist` | Active volunteer supporting activities. | No |
| `organizer` | Temple or organization manager. | No |
| `admin` | System administrator with full access. | No |

New accounts always receive `member`. Only authorized administration may change role.

## 3. Authentication rules

- Sign-up requires email OTP.
- Sign-in requires identifier and password only. Sign-in must not send or request OTP.
- Forgot password requires email OTP before password reset.
- OTP is six digits, expires after 10 minutes, and allows at most 5 failed attempts.
- OTP request endpoints are rate-limited to 5 requests per 15 minutes per IP.
- Login endpoints are rate-limited to 30 requests per 15 minutes per IP.
- Password minimum length is 8 characters. Store passwords using Argon2id or bcrypt.
- Access token uses JWT. Refresh token uses an HttpOnly cookie with rotation.
- Never reveal whether an email exists during forgot-password request.

## 4. User flows

### 4.1 Sign-up

1. User opens `/sign-up`.
2. User submits `name`, `email`, `password`, and frontend-only `confirm_password`.
3. Backend validates input and sends OTP. Account is not active yet.
4. User submits OTP.
5. Backend creates or activates account with `role: "member"`, `onboarding_completed: false`, and returns session tokens.
6. Frontend stores the access token and redirects to `/onboarding`.
7. User may not reach Home until onboarding completes or is explicitly skipped.

### 4.2 Sign-in

1. User submits `identifier` and `password` to `POST /api/auth/login`.
2. Backend verifies credentials and account status.
3. Backend returns session tokens. No OTP is sent.
4. If `onboarding_completed` is false, redirect to `/onboarding`; otherwise redirect to `/home` or validated `redirectTo`.

### 4.3 Forgot password

1. User submits email to `POST /api/auth/forgot-password/request`.
2. Backend always returns generic success and sends OTP only when email exists.
3. User submits OTP to `/verify-otp`.
4. Backend returns short-lived reset token.
5. User submits reset token and new password to `/reset`.
6. Backend changes password, invalidates old sessions, and requires a new sign-in.

### 4.4 Session

- `GET /api/auth/verify` validates access token.
- `POST /api/auth/refresh` rotates refresh token.
- `POST /api/auth/logout` invalidates current session and clears refresh cookie.

## 5. Onboarding handoff

`POST /api/auth/register-verify-otp` returns `onboarding_completed: false` for new users. Frontend redirects to `/onboarding`, not `/home`.

Existing users with `onboarding_completed: true` go directly to `/home` after sign-in. Users who skip onboarding may complete profile data later.

## 6. Validation

- `name`: required, at least 2 characters.
- `email`: required, valid email format.
- `password`: required, at least 8 characters.
- `confirm_password`: required, equal to password, never sent to API.
- `identifier`: required; accepts registered email or username.
- `otp`: exactly 6 numeric digits.
- `redirectTo`: allow only internal application paths. Reject external URLs.

## 7. API response contract

Every API response, success or failure, uses exactly this envelope:

```json
{
  "status": "success",
  "code": 200,
  "message": "Request completed successfully",
  "data": {}
}
```

Rules:
- `status` is `success` or `fail`.
- `code` equals HTTP status code.
- `message` is always a string.
- `data` contains payload on success and may be `null` on failure.
- Do not return top-level `user`, `accessToken`, `valid`, `success`, or `meta` outside `data`.

Failure example:

```json
{
  "status": "fail",
  "code": 401,
  "message": "Invalid credentials",
  "data": null
}
```

## 8. Acceptance criteria

| ID | Scenario | Expected result |
| --- | --- | --- |
| AC-01 | User starts sign-up | OTP sent; account not usable before verification. |
| AC-02 | User verifies sign-up OTP | Account receives `member`, session issued, redirect to `/onboarding`. |
| AC-03 | User signs in with valid password | Login succeeds without OTP. |
| AC-04 | User signs in with invalid password | `401` envelope; no OTP sent. |
| AC-05 | User requests forgot password | Generic `200` envelope; OTP sent only for existing email. |
| AC-06 | User verifies forgot-password OTP | Short-lived reset token returned in `data`. |
| AC-07 | User resets password | Old sessions invalidated; new sign-in required. |
| AC-08 | New user opens protected route | Redirect to `/onboarding`. |
| AC-09 | Completed user signs in | Redirect to `/home` or safe internal `redirectTo`. |
| AC-10 | Any endpoint returns response | Envelope contains `status`, `code`, `message`, and `data`. |
| AC-11 | API emits role | Role is one of `member`, `activist`, `organizer`, `admin`. |
