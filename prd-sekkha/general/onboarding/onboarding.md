# PRD: User Onboarding - Sekkha Apps

| Metadata | Detail |
| --- | --- |
| **Document** | Product Requirement Document (PRD) |
| **Feature** | Post-registration onboarding |
| **Domain** | Authentication |
| **Version** | 1.0.0 |
| **Status** | Approved / Ready for Development |

## 1. Purpose

Onboarding introduces newly registered users to Sekkha, collects useful profile data, and explains core navigation before Home. It starts after successful sign-up OTP verification.

Onboarding must be short, skippable where stated, mobile-friendly, and resumable after refresh.

## 2. Entry and exit rules

- New sign-up users enter `/onboarding` after `register-verify-otp` succeeds.
- Backend stores `onboarding_completed: false` until completion or explicit skip.
- Authenticated users with `onboarding_completed: false` are redirected to `/onboarding` when opening protected routes.
- Completed users go to `/home` after sign-in.
- Completion or skip sets `onboarding_completed: true` and redirects to `/home` or a safe internal `redirectTo`.
- Onboarding never appears during sign-in when completion is already true.

## 3. Steps

### Step 1: Welcome

Show user name and short explanation of Sekkha. Provide `Continue` and `Skip onboarding` actions.

### Step 2: Profile information

Collect optional profile data:

- `phone`
- `school_id` or school selection
- `class_grade`
- `birth_date`
- `gender`

Name and email are read-only in this step. User may skip all optional fields. Submit through the authenticated profile endpoint.

### Step 3: Product tour

Show no more than four short highlights:

1. Home and personal activity.
2. Events and attendance.
3. Points, streaks, badges, and leaderboard.
4. Profile and account settings.

Every step has `Back`, `Next`, and `Skip tour`. Use accessible spotlight or plain cards when the target is unavailable.

## 4. API contract

All responses use the standard envelope:

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

### `PATCH /api/users/me`

Updates optional profile data.

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

Completes or skips onboarding.

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

Errors use the same envelope with `data: null`.

## 5. Functional requirements

- Keep progress in local component state and recover current step after refresh when practical.
- Save profile data only when user presses `Save and continue`; skip sends no profile update.
- Completion request must be idempotent.
- Double-clicking buttons must not create duplicate requests.
- Show inline validation for invalid phone, date, or school values.
- Show retry action when API request fails. Do not discard entered data.
- Keep touch targets at least 44px.
- Provide keyboard navigation, visible focus, labels, and screen-reader status for step changes.
- Do not expose password, OTP, access token, or reset token in onboarding state or URL.

## 6. Acceptance criteria

| ID | Scenario | Expected result |
| --- | --- | --- |
| ONB-01 | User verifies sign-up OTP | User enters `/onboarding`, not `/home`. |
| ONB-02 | User refreshes onboarding | Session remains valid and current onboarding state can resume. |
| ONB-03 | User saves profile fields | Valid fields persist through `PATCH /api/users/me`. |
| ONB-04 | User skips optional profile fields | No profile update request; user can edit profile later. |
| ONB-05 | User completes tour | Completion endpoint called once; redirect to `/home`. |
| ONB-06 | User skips onboarding or tour | Completion endpoint sets `onboarding_completed: true`; redirect to `/home`. |
| ONB-07 | Incomplete user opens protected route | Router redirects to `/onboarding`. |
| ONB-08 | Completed user signs in | Router bypasses onboarding and opens `/home`. |
| ONB-09 | API fails while saving | Error shown, form values retained, retry available. |
| ONB-10 | Any onboarding response | Contains `status`, `code`, `message`, and `data`. |
