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
2. User submits `name`, `email`, `password`, and frontend-only `confirm_password` (all is mandatory).
3. Backend validates input and sends OTP. Account is not active yet.
4. User submits OTP.
5. Backend creates or activates account with `role: "member"`, `is_claimed: true`, `onboarding_completed: false`, and returns session tokens.
6. Frontend stores the access token and redirects to `/onboarding`.
7. User may not reach Home until onboarding completes or is explicitly skipped.

### 4.2 Sign-in

1. User submits `identifier` and `password` to `POST /api/auth/login` (all mandatory).
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

## 8. User Stories

| ID | As a | I want to | So that |
| --- | --- | --- | --- |
| US-AUTH-01 | Unregistered Guest | Sign up using my name, email, and password with email OTP verification | I can create an authentic Sekkha member account securely |
| US-AUTH-02 | Registered Member | Sign in directly using my identifier (email/username/userNumber) and password without OTP | I can access my account quickly and without friction |
| US-AUTH-03 | Registered User | Reset my forgotten password via email OTP verification | I can regain access to my account safely if I lose my credentials |
| US-AUTH-04 | Authenticated User | Maintain a seamless session via automatic refresh token rotation | I stay logged in securely without frequent credential re-entry |
| US-AUTH-05 | Authenticated User | Log out securely across devices or from my current device | My session is terminated and cannot be reused by unauthorized parties |
| US-AUTH-06 | Newly Registered User | Be automatically routed to onboarding before accessing Home | I can complete my initial profile setup before exploring the app |

---

## 9. Acceptance Criteria

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

---

## 10. Test Cases

| Test Case ID | Category | Scenario / Description | Preconditions | Test Steps | Expected Result | Type |
| --- | --- | --- | --- | --- | --- | --- |
| **TC-AUTH-01** | Sign-up | Successful registration with valid data and OTP | Email is not registered | 1. Submit `POST /api/auth/register-request` with valid `name`, `email`, `password`.<br>2. Receive 6-digit OTP via email.<br>3. Submit `POST /api/auth/register-verify-otp` with valid OTP. | HTTP 201/200, account created with `role: "member"`, `isClaimed: true`, `onboardingCompleted: false`. Session tokens returned, user redirected to `/onboarding`. | Positive |
| **TC-AUTH-02** | Sign-up | Registration with already registered email | Email already exists in DB | Submit `POST /api/auth/register-request` with existing email. | HTTP 409 Conflict envelope ("Email already registered"). No OTP sent. | Negative |
| **TC-AUTH-03** | Sign-up | Submit invalid password (< 8 chars) or mismatched confirmation | On `/sign-up` page | 1. Enter password with 7 characters.<br>2. Frontend blocks submit.<br>3. If bypassed to API, send password `< 8 chars`. | HTTP 400 Bad Request envelope with field validation errors. | Negative |
| **TC-AUTH-04** | Sign-up OTP | Submit invalid or expired OTP code | Registration initiated, OTP sent | 1. Submit wrong 6-digit OTP code.<br>2. Submit after 10 minutes expiry. | HTTP 400 Bad Request ("Invalid OTP" or "OTP expired"). After 5 failed attempts, challenge is invalidated (HTTP 429/400). | Negative / Security |
| **TC-AUTH-05** | Sign-in | Successful login with email, username, or 10-digit userNumber | User account is active and verified | Submit `POST /api/auth/login` with:<br>Case A: `email` + password<br>Case B: `username` + password<br>Case C: `userNumber` + password | HTTP 200 with standard envelope. `accessToken` in body, `refreshToken` in HttpOnly cookie. No OTP requested or sent. If `onboarding_completed: false` redirect to `/onboarding`, else `/home`. | Positive |
| **TC-AUTH-06** | Sign-in | Sign-in with wrong password | User exists in DB | Submit `POST /api/auth/login` with correct identifier and incorrect password. | HTTP 401 Unauthorized ("Invalid credentials"). No OTP sent. Password failure counter tracks rate limit. | Negative |
| **TC-AUTH-07** | Sign-in | Sign-in with non-existent user identifier (Timing attack prevention) | Identifier does not exist in DB | Submit `POST /api/auth/login` with non-existent identifier and random password. | HTTP 401 Unauthorized ("Invalid credentials"). Server runs dummy bcrypt comparison to equalize response time, preventing user enumeration. | Security |
| **TC-AUTH-08** | Sign-in Rate Limit | Exceed login rate limit (30 requests per 15 min per IP) | Active client session | Send 31 consecutive login requests within 15 minutes. | 31st request returns HTTP 429 Too Many Requests envelope with retry-after header. | Security |
| **TC-AUTH-09** | Forgot Password | Request password reset with registered email | User exists with verified email | Submit `POST /api/auth/forgot-password/request` with valid email. | HTTP 200 generic success envelope. 6-digit OTP sent to user email (expires in 10 minutes). | Positive |
| **TC-AUTH-10** | Forgot Password | Request reset with unregistered email (Anti-Enumeration) | Email does not exist in DB | Submit `POST /api/auth/forgot-password/request` with unknown email. | HTTP 200 identical generic success envelope. No OTP sent, no internal error leaked, response does not disclose email non-existence. | Security |
| **TC-AUTH-11** | Forgot Password | Verify reset OTP and reset password | Reset OTP received | 1. Submit `POST /api/auth/forgot-password/verify-otp` with valid OTP.<br>2. Receive short-lived reset token.<br>3. Submit `POST /api/auth/forgot-password/reset` with token & new password. | HTTP 200 envelope. Password updated (bcrypt hashed). All prior refresh tokens and active sessions invalidated. User must sign in with new password. | Positive / Security |
| **TC-AUTH-12** | Session & Refresh | Silent token refresh and rotation | Valid refresh token in HttpOnly cookie | Call `POST /api/auth/refresh`. | HTTP 200 envelope with new `accessToken`. New `refreshToken` rotated in HttpOnly cookie. Old refresh token immediately invalidated. | Positive |
| **TC-AUTH-13** | Logout | User logs out from application | Authenticated session active | Call `POST /api/auth/logout`. | HTTP 200 envelope. Server deletes refresh token session from DB/cache. Client clears `sekkha_access_token` and browser clears HttpOnly refresh cookie. | Positive |
| **TC-AUTH-14** | Route Guarding | Unauthenticated user accesses protected route (`/home`, `/profile`) | No token / expired token | User navigates directly to `http://localhost:3000/home`. | Frontend auth guard intercepts request and redirects to `/login` with valid internal `redirectTo` query parameter. External redirect URLs rejected. | Security |
| **TC-AUTH-15** | Resend OTP | Resend sign-up OTP with cooldown check | Sign-up OTP request sent | 1. Submit `POST /api/auth/resend-otp` within 60 seconds (cooldown).<br>2. Submit `POST /api/auth/resend-otp` after 60 seconds. | Step 1 returns HTTP 429 Too Many Requests. Step 2 returns HTTP 200 envelope and invalidates earlier OTP with a fresh 6-digit code. | Edge / Security |
