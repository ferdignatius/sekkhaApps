# PRD: Master Data - Event Attendance Badge

| Metadata | Detail |
| --- | --- |
| **Document** | Product Requirement Document (PRD) |
| **Feature** | Event Attendance Badge Master Data |
| **Application** | Sekkha Apps - Configure Module |
| **Version** | 2.0.0 |
| **Status** | Approved / Ready for Development |

## 1. Description

Event Attendance Badge is a visual reward granted when a user attends an event. An organizer selects an active badge while creating or editing an event. Each eligible attendance can unlock the badge once, and its `point_value` is added to the user's points through the declared EventBus flow.

Badge management is internal configuration. `member` and `activist` cannot access it.

## 2. Roles and permissions

| Action | `admin` | `organizer` | `activist` | `member` |
| --- | :---: | :---: | :---: | :---: |
| View list and detail | Yes | Yes | No | No |
| Create | Yes | No | No | No |
| Update | Yes | No | No | No |
| Activate or deactivate | Yes | No | No | No |
| Delete | Yes | No | No | No |

`organizer` may read active badges to select one for an event. Only `admin` changes badge master data.

## 3. Default seed

| Code | Name | Color | Points | Description |
| --- | --- | --- | ---: | --- |
| `first-attendance` | First Attendance | `#10B981` | 100 | Reward for a user's first event attendance |

Admin may create additional badges for retreats, training, service, or special events.

## 4. Data model

| Field | Type | Required | Rules |
| --- | --- | :---: | --- |
| `id` | `cuid` | Yes | Server generated |
| `code` | string | Yes | Unique, lowercase kebab-case, immutable |
| `name` | string | Yes | 3-80 chars |
| `color` | string | Yes | Hex `#RRGGBB` |
| `description` | string | Yes | Maximum 500 chars |
| `point_value` | integer | Yes | 0-10000 |
| `is_active` | boolean | Yes | Default `true` |
| `created_at` | DateTime | Yes | Server generated |
| `updated_at` | DateTime | Yes | Server generated |

## 5. Event attendance reward flow

```text
attendance.recorded
  -> Events module reads event.badge_id
  -> if badge_id exists, create unique user_badge record
  -> publish badge.earned { user_id, badge_id, point_value, event_id }
  -> gamification subscriber adds point_value once
```

Rules:

1. Badge unlock is idempotent per user and badge.
2. Duplicate attendance or event retries must not duplicate badge or points.
3. Inactive badges cannot be assigned to new events.
4. Existing event assignments and earned badges remain readable after deactivation.
5. Badge deletion is rejected when referenced by an event or earned by a user. Deactivate instead.
6. `point_value` changes affect future unlocks only. Existing point transactions never change.

## 6. Validation

- `code`: unique lowercase kebab-case, 2-50 chars.
- `name`: trimmed, 3-80 chars.
- `color`: `^#[0-9A-Fa-f]{6}$`.
- `description`: trimmed, maximum 500 chars.
- `point_value`: integer from 0 through 10000.
- Validate all input on the server. Client validation is convenience only.

## 7. UI requirements

- **Route**: `/configure/master/badge`
- Table or card grid shows Code, Name, Color, Description, Point Value, Status, Updated At, and Actions.
- Admin sees create, edit, activate, deactivate, and delete actions.
- Organizer sees read-only active badge list.
- Form includes code, name, description, point value, color picker, and active status.
- Show live badge preview and point value.
- Explain why referenced or earned badges cannot be deleted.
- Use pagination or server-side filtering for large lists.
- Touch targets minimum 44px. Labels, focus state, and status announcements required.

## 8. API contract

Base route: `/api/configure`.

No `/v1` prefix. Versioning is unnecessary while this is one internal API. Add `/v2` only for a future breaking contract that must coexist with an older public contract.

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
- No top-level `meta`, `error`, `success`, or resource fields outside `data`.

### `GET /api/configure/badges`

Requires `organizer` or `admin`. Supports `page`, `page_size`, `search`, and `is_active`. Maximum page size is 100.

Success `200`:

```json
{
  "status": "success",
  "code": 200,
  "message": "Badges retrieved",
  "data": {
    "items": [
      {
        "id": "badge_001",
        "code": "first-attendance",
        "name": "First Attendance",
        "color": "#10B981",
        "description": "Reward for a user's first event attendance",
        "point_value": 100,
        "is_active": true,
        "created_at": "2026-01-01T00:00:00.000Z",
        "updated_at": "2026-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 50,
      "total": 1,
      "total_pages": 1
    }
  }
}
```

### `GET /api/configure/badges/:id`

Requires `organizer` or `admin`. Returns one badge in `data`.

### `POST /api/configure/badges`

Requires `admin`.

```json
{
  "code": "retreat-2026",
  "name": "Retreat 2026",
  "color": "#8B5CF6",
  "description": "Attendance reward for Retreat 2026",
  "point_value": 250,
  "is_active": true
}
```

Returns `201` with created badge in `data`.

### `PATCH /api/configure/badges/:id`

Requires `admin`. `code` cannot change. All other fields are optional. Returns updated badge in `data`.

### `DELETE /api/configure/badges/:id`

Requires `admin`. Returns `409` when badge is referenced or earned. Use `PATCH` with `is_active: false`.

Success `200`:

```json
{
  "status": "success",
  "code": 200,
  "message": "Badge deleted",
  "data": null
}
```

### Error example

```json
{
  "status": "fail",
  "code": 403,
  "message": "Forbidden",
  "data": null
}
```

## 9. Database model reference

```prisma
model Badge {
  id          String   @id @default(cuid())
  code        String   @unique
  name        String
  color       String
  description String
  pointValue  Int      @default(0) @map("point_value")
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  users UserBadge[]
}
```

## 10. Acceptance criteria

| ID | Scenario | Expected result |
| --- | --- | --- |
| AC-01 | Admin creates badge with color and points | Badge persists and appears in event reward selection. |
| AC-02 | Organizer reads badges | Active badges return in standard envelope. |
| AC-03 | Member or activist reads badges | API returns `403` envelope. |
| AC-04 | Attendance uses assigned badge | Badge unlocks once and points are added once. |
| AC-05 | Admin changes point value | Future unlocks use new value; historical transactions remain unchanged. |
| AC-06 | Admin deactivates badge | New events cannot assign it; earned badges remain visible. |
| AC-07 | Admin deletes referenced or earned badge | API returns `409` envelope; data remains intact. |
| AC-08 | Invalid color or points submitted | API returns `400` envelope; no partial write. |
| AC-09 | Any API response is returned | Contains `status`, `code`, `message`, and `data`. |
