# PRD: User Onboarding - Sekkha Apps

| Metadata | Detail |
| --- | --- |
| **Document** | Product Requirement Document (PRD) |
| **Feature** | Post-registration onboarding |
| **Domain** | Authentication and Profile |
| **Version** | 2.0.0 |
| **Status** | Approved / Ready for Development |

## 1. Purpose

Onboarding introduces newly registered users to Sekkha, collects profile data, and explains core navigation before Home. It starts after successful sign-up OTP verification.

Onboarding stays short, mobile-friendly, resumable, and skippable where stated. School selection is integrated with School master data. If school is not listed, user can submit a school request without leaving onboarding.

## 2. Entry and exit rules

- New sign-up users enter `/onboarding` after `register-verify-otp` succeeds.
- Backend stores `onboarding_completed: false` until completion or explicit skip.
- Authenticated users with `onboarding_completed: false` are redirected to `/onboarding` on protected routes.
- Completed users go to `/home` after sign-in.
- Completion or skip sets `onboarding_completed: true` and redirects to `/home` or safe internal `redirectTo`.
- Onboarding never appears during sign-in when completion is already true.

## 3. Steps

### Step 1: Welcome

Show user name and short explanation of Sekkha. Provide `Continue` and `Skip onboarding`.

### Step 2: Profile information

Collect optional profile data:

- `phone`
- `school_id`
- `class_grade`
- `birth_date`
- `gender`

Name and email are read-only. User may skip all optional fields. Submit through the authenticated profile endpoint.

### Step 3: School selection

- Load active schools from `GET /api/configure/schools`.
- Search by school name, type, and city.
- Show `School not listed` when no suitable result exists.
- User submits `requested_name`, `requested_type`, and `requested_city` to create a pending school request.
- Show request status in onboarding: `pending`, `accepted`, or `rejected`.
- Pending request does not become a `school_id` until organizer or admin accepts it.
- User may continue onboarding while request is pending.
- After acceptance, user can select the linked school in profile. Do not silently alter profile data.
- Prevent duplicate pending requests for same normalized name, type, and city.

### Step 4: Product tour

Show no more than four highlights:

1. Home and personal activity.
2. Events and attendance.
3. Points, streaks, badges, and leaderboard.
4. Profile and account settings.

Every step has `Back`, `Next`, and `Skip tour`. Use accessible spotlight or plain cards when target unavailable.

## 4. API contract

All responses use:

```json
{
  "status": "success",
  "code": 200,
  "message": "Request completed successfully",
  "data": {}
}
```

Errors use same envelope with `data: null`. Pagination belongs inside `data.pagination`.

### `GET /api/configure/schools`

Requires authentication. Returns active schools for onboarding. Supports `page`, `page_size`, `search`, `type`, and `city`. Maximum page size is 100.

### `POST /api/configure/school-requests`

Requires authentication. Creates pending request from onboarding.

```json
{
  "requested_name": "SMA Buddha Tzu Chi Bandung",
  "requested_type": "SMA",
  "requested_city": "Bandung"
}
```

Returns `201`:

```json
{
  "status": "success",
  "code": 201,
  "message": "School request submitted",
  "data": {
    "id": "req_001",
    "status": "pending",
    "requested_name": "SMA Buddha Tzu Chi Bandung"
  }
}
```

Returns `409` for duplicate pending request or existing matching school. On `409`, client should offer existing school selection instead of creating another request.

### `GET /api/configure/school-requests/me`

Requires authentication. Returns current user's school requests with pagination.

### `PATCH /api/users/me`

Updates optional profile data. `school_id` must reference an active school. A pending school request cannot be used as `school_id`.

```json
{
  "phone": "081234567890",
  "school_id": "school_123",
  "class_grade": "11",
  "birth_date": "2008-05-12",
  "gender": "male"
}
```

### `PATCH /api/users/me/onboarding`

Completes or skips onboarding. Completion is idempotent and does not require school selection.

Request:

```json
{
  "onboarding_completed": true,
  "skipped": false
}
```

Response:

```json
{
  "status": "success",
  "code": 200,
  "message": "Onboarding completed",
  "data": {
    "onboarding_completed": true
  }
}
```

## 5. Functional requirements

- Keep progress in local component state and recover current step after refresh when practical.
- Load schools lazily with server-side search. Do not load unbounded master data.
- Save profile data only on `Save and continue`; skip sends no profile update.
- School request submit is separate from profile update.
- Completion request is idempotent.
- Disable buttons while requests are processing.
- Show inline validation for phone, date, school, and school request fields.
- Show retry action when API fails. Preserve entered data.
- Do not expose password, OTP, access token, or reset token in onboarding state or URL.
- Touch targets minimum 44px. Provide keyboard navigation, visible focus, labels, and screen-reader status.

## 6. Acceptance criteria

| ID | Scenario | Expected result |
| --- | --- | --- |
| ONB-01 | User verifies sign-up OTP | User enters `/onboarding`, not `/home`. |
| ONB-02 | User refreshes onboarding | Session remains valid and progress can resume. |
| ONB-03 | User searches school | Active schools return in standard envelope with pagination. |
| ONB-04 | User selects existing school | `school_id` saves through `PATCH /api/users/me`. |
| ONB-05 | User submits school not listed | Pending school request is created without leaving onboarding. |
| ONB-06 | User submits duplicate request | API returns `409`; no duplicate request is created. |
| ONB-07 | User continues while request pending | Onboarding can complete; profile school remains unset. |
| ONB-08 | Organizer accepts request later | School becomes available; requester sees accepted status. |
| ONB-09 | User skips optional profile fields | No profile update request; user can edit profile later. |
| ONB-10 | User completes or skips onboarding | Completion endpoint called once; redirect to `/home`. |
| ONB-11 | Incomplete user opens protected route | Router redirects to `/onboarding`. |
| ONB-12 | API fails while saving | Error shown, values retained, retry available. |
| ONB-13 | Any onboarding response | Contains `status`, `code`, `message`, and `data`. |
