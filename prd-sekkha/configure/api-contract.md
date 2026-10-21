# API Contract: Configure Domain

## 1. Scope

Configure API exposes master data used by event creation, attendance rewards, and onboarding.

Base route:

```text
/api/configure
```

No `/v1` prefix. Add versioning only when breaking contract must coexist with older public contract.

Master data:

- Event Types
- Event Attendance Badges
- Schools
- School Requests

## 2. Standard response envelope

Every response uses:

```json
{
  "status": "success",
  "code": 200,
  "message": "Request completed successfully",
  "data": {}
}
```

Rules:

- `status`: `success` or `fail`.
- `code`: HTTP status code as a number.
- `message`: always a string.
- `data`: payload on success, `null` on failure.
- Pagination belongs inside `data.pagination`.
- No resource or `meta` fields outside `data`.

Error example:

```json
{
  "status": "fail",
  "code": 403,
  "message": "Forbidden",
  "data": null
}
```

## 3. Authorization

- Require `requireAuth` for all non-public Configure endpoints.
- Roles use English values exactly: `member`, `activist`, `organizer`, `admin`.
- Enforce roles on the server. Never trust client-provided role.
- `admin` bypasses role-specific read restrictions.
- Validation errors return `400`.
- Authentication errors return `401`.
- Authorization errors return `403`.
- Conflicts and protected deletes return `409`.

## 4. Shared pagination

List endpoints support:

```text
page=1&page_size=50&search=&is_active=
```

Maximum `page_size`: 100.

```json
{
  "items": [],
  "pagination": {
    "page": 1,
    "page_size": 50,
    "total": 0,
    "total_pages": 0
  }
}
```

## 5. Event Types

Read: `organizer`, `admin`. Mutation: `admin`.

### `GET /api/configure/event-types`

Query: `page`, `page_size`, `search`, `is_active`.

Returns paginated Event Types in `data`.

### `GET /api/configure/event-types/:id`

Requires `organizer` or `admin`. Returns one Event Type in `data`.

### `POST /api/configure/event-types`

Requires `admin`.

```json
{
  "code": "regular-service",
  "name": "Regular Service",
  "color": "#4262FF",
  "description": "Regular or special temple service",
  "default_point_reward": 50,
  "is_active": true
}
```

Returns `201`. `code` is unique, lowercase kebab-case, and immutable. `default_point_reward` accepts `0-10000`.

### `PATCH /api/configure/event-types/:id`

Requires `admin`. Partial update. `code` cannot change. Default point changes affect new events only.

### `DELETE /api/configure/event-types/:id`

Requires `admin`. Returns `409` when referenced by an event. Deactivate instead.

## 6. Event Attendance Badges

Read: `organizer`, `admin`. Mutation: `admin`.

### `GET /api/configure/badges`

Query: `page`, `page_size`, `search`, `is_active`.

Returns paginated badges in `data`.

### `GET /api/configure/badges/:id`

Requires `organizer` or `admin`. Returns one badge in `data`.

### `POST /api/configure/badges`

Requires `admin`.

```json
{
  "code": "first-attendance",
  "name": "First Attendance",
  "color": "#10B981",
  "description": "Reward for a user's first event attendance",
  "point_value": 100,
  "is_active": true
}
```

Returns `201`. Validate `color` as `#RRGGBB`, `point_value` as integer `0-10000`, and `code` as unique lowercase kebab-case.

### `PATCH /api/configure/badges/:id`

Requires `admin`. Partial update. `code` cannot change. Point changes affect future unlocks only.

### `DELETE /api/configure/badges/:id`

Requires `admin`. Returns `409` when referenced by an event or earned by a user. Deactivate instead.

Badge unlock and point reward must be idempotent per user and badge.

## 7. Schools

Active school reads: authenticated users. Detailed inactive reads: `organizer`, `admin`. Direct school CRUD: `admin` only.

### `GET /api/configure/schools`

Query: `page`, `page_size`, `search`, `type`, `city`, `is_active`.

Active schools are available to all roles for onboarding and profile selection. Returns paginated schools in `data`.

### `GET /api/configure/schools/:id`

Requires `organizer` or `admin` for inactive or detailed records. Returns one school in `data`.

### `POST /api/configure/schools`

Requires `admin`.

```json
{
  "name": "SMA Buddha Tzu Chi Bandung",
  "type": "SMA",
  "city": "Bandung",
  "is_active": true
}
```

Returns `201`. Name duplicate checks are case-insensitive.

### `PATCH /api/configure/schools/:id`

Requires `admin`. Partial update. Rename propagation updates legacy `User.school` references in one transaction.

### `PATCH /api/configure/schools/:id/status`

Requires `admin`.

```json
{
  "is_active": false
}
```

### `DELETE /api/configure/schools/:id`

Requires `admin`. Returns `409` when referenced by users, events, or accepted requests. Deactivate instead.

## 8. School Requests

Submit: authenticated users. Review and decision: `organizer`, `admin`. No direct school CRUD for `organizer`.

### `POST /api/configure/school-requests`

Requires authentication. Used by onboarding and profile flows.

```json
{
  "requested_name": "SMA Buddha Tzu Chi Bandung",
  "requested_type": "SMA",
  "requested_city": "Bandung"
}
```

Returns `201` with `pending` request in `data`. Returns `409` for duplicate pending request or existing matching school.

### `GET /api/configure/school-requests/me`

Requires authentication. Returns current user's requests with pagination.

### `GET /api/configure/school-requests`

Requires `organizer` or `admin`. Query: `page`, `page_size`, `status`, `search`, `created_from`, `created_to`.

### `GET /api/configure/school-requests/:id`

Requester can read own request. `organizer` and `admin` can read reviewable requests.

### `POST /api/configure/school-requests/:id/accept`

Requires `organizer` or `admin`.

```json
{
  "review_note": "Verified and added to school master data"
}
```

Accept runs atomically. Existing matching school is linked. Otherwise, new school is created. Returns `409` when request is no longer `pending`.

### `POST /api/configure/school-requests/:id/reject`

Requires `organizer` or `admin`.

```json
{
  "review_note": "Please submit the official school name"
}
```

Returns updated request with `rejected` status in `data`.

## 9. Cross-domain rules

- All mutations validate at API boundary.
- Normalize school name and city before duplicate checks.
- Accepted school requests do not silently change requester profile unless onboarding explicitly selects the accepted school.
- Inactive master data remains readable where needed for historical records.
- Deactivation preferred over deletion when records are referenced.
- Event attendance reward emits `badge.earned` with `{ user_id, badge_id, point_value, event_id }`.
