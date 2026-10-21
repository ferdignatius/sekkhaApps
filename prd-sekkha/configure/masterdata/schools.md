# PRD: Master Data - Schools

| Metadata | Detail |
| --- | --- |
| **Document** | Product Requirement Document (PRD) |
| **Feature** | School Master Data and School Requests |
| **Application** | Sekkha Apps - Configure Module and Onboarding |
| **Version** | 2.0.0 |
| **Status** | Approved / Ready for Development |

## 1. Description

School is master data used by member profiles, onboarding, school filters, and analytics. Existing schools appear in the onboarding combobox. When a member cannot find their school, they can submit a school request during onboarding.

A request is not immediately added to master data. An `organizer` reviews and accepts valid requests. Accepted requests create or match a school record, then become available in onboarding. An `admin` owns master-data CRUD and can manage all request states.

`User.school` remains a string for backward compatibility. New code must store the selected school ID and display name consistently when the user model is migrated to a relation.

## 2. Roles and permissions

| Action | `admin` | `organizer` | `activist` | `member` |
| --- | :---: | :---: | :---: | :---: |
| Read active schools | Yes | Yes | Yes | Yes |
| Read all schools and details | Yes | Yes | No | No |
| Submit school request | Yes | Yes | Yes | Yes |
| Review pending requests | Yes | Yes | No | No |
| Accept request | Yes | Yes | No | No |
| Reject request | Yes | Yes | No | No |
| Create school directly | Yes | No | No | No |
| Update school directly | Yes | No | No | No |
| Activate or deactivate school | Yes | No | No | No |
| Delete school | Yes | No | No | No |

`organizer` has no school CRUD permission. `organizer` can only review, accept, or reject requests. `member` can submit requests, including from onboarding, but cannot approve their own request.

## 3. Default data

Backend seeds initial schools when the table is empty. Seed operation is idempotent.

| Name | Type | City |
| --- | --- | --- |
| SMA Tri Maha Dharma | SMA | Jakarta Barat |
| SMA Dharma Widya | SMA | Tangerang |
| SMA Cinta Kasih Tzu Chi | SMA | Jakarta Barat |
| SMA Negeri 1 Jakarta | SMA | Jakarta Pusat |
| Universitas Indonesia | Universitas | Depok |
| Universitas Bina Nusantara (BINUS) | Universitas | Jakarta Barat |
| Umum | Umum | Nasional |

## 4. Data model

### School

| Field | Type | Required | Rules |
| --- | --- | :---: | --- |
| `id` | `cuid` | Yes | Server generated |
| `name` | string | Yes | 2-100 chars, unique case-insensitive |
| `type` | enum | Yes | `SMP`, `SMA`, `SMK`, `Universitas`, `Umum` |
| `city` | string | Yes | Minimum 2 chars |
| `is_active` | boolean | Yes | Default `true` |
| `created_at` | DateTime | Yes | Server generated |
| `updated_at` | DateTime | Yes | Server generated |

### School request

| Field | Type | Required | Rules |
| --- | --- | :---: | --- |
| `id` | `cuid` | Yes | Server generated |
| `requested_name` | string | Yes | 2-100 chars, trimmed |
| `requested_type` | enum | Yes | Same values as `School.type` |
| `requested_city` | string | Yes | Minimum 2 chars, trimmed |
| `status` | enum | Yes | `pending`, `accepted`, `rejected`, `cancelled` |
| `requested_by` | `cuid` | Yes | Requesting user ID |
| `reviewed_by` | `cuid` | No | Reviewer ID |
| `reviewed_at` | DateTime | No | Set on review |
| `review_note` | string | No | Maximum 500 chars |
| `school_id` | `cuid` | No | Matched or created school after acceptance |
| `created_at` | DateTime | Yes | Server generated |
| `updated_at` | DateTime | Yes | Server generated |

## 5. Request and approval flow

```text
Member opens onboarding school selector
  -> searches active schools
  -> selects "School not listed"
  -> submits school request
  -> request status = pending
  -> organizer reviews pending requests
  -> organizer accepts or rejects
  -> accepted request matches existing school or creates new school
  -> school becomes available in onboarding
```

Rules:

1. Only `pending` requests can be accepted or rejected.
2. Acceptance must run in one transaction: match or create school, update request, and return result.
3. Before creating a school, re-check case-insensitive name and city to prevent duplicates.
4. If matching school exists, link request to it instead of creating a duplicate.
5. Accepted request does not automatically change the requester's profile unless onboarding explicitly selected that request as the user's school.
6. A user may not create duplicate pending requests for the same normalized name, type, and city.
7. A requester can view their own request status. Review notes are visible to requester.
8. Rejection must include a reviewer note when practical. Rejected requests can be resubmitted as a new request.
9. Deactivated schools do not appear in new onboarding selections, but existing profile references remain readable.
10. School rename propagation updates legacy `User.school` values in one transaction.
11. A school cannot be deleted when referenced by users, events, or accepted requests. Deactivate instead.

## 6. Validation and security

- Normalize names and cities by trimming and case-folding for duplicate checks.
- Validate all input at the API boundary. Client validation is convenience only.
- Reject unknown enum values and oversized fields with `400` envelope.
- Enforce `requireAuth` before request endpoints.
- Enforce role checks server-side. Never trust role sent by client.
- Rate-limit school request creation per user.
- Do not expose private reviewer data to other members.

## 7. UI requirements

### Onboarding

- Search active schools with server-side search.
- Show `School not listed` action.
- Request form includes name, type, and city.
- Show pending request status after submission.
- Prevent duplicate submit while request is processing.

### Configure

- **Route**: `/configure/master/school`
- Admin sees school list, create, edit, activate, deactivate, and delete.
- Organizer sees pending request queue and request details only.
- Organizer sees Accept and Reject actions, not school CRUD actions.
- List supports search, status filter, type filter, city filter, and pagination.
- Display user count and request count.
- Explain deletion restrictions and deactivation alternative.
- Use accessible labels, focus states, status announcements, and 44px minimum touch targets.

## 8. API contract

Base route: `/api/configure`. No `/v1` prefix.

Every response uses:

```json
{
  "status": "success",
  "code": 200,
  "message": "Request completed successfully",
  "data": {}
}
```

`status` is `success` or `fail`. `code` equals HTTP status. `message` is always a string. `data` contains payload or `null` on failure. Pagination belongs inside `data`.

### School read endpoints

#### `GET /api/configure/schools`

Authenticated users. Active schools are available to all roles. Supports `page`, `page_size`, `search`, `type`, `city`, and `is_active`. Maximum page size is 100.

#### `GET /api/configure/schools/:id`

Requires `organizer` or `admin` for inactive or detailed records. Returns school in `data`.

### School request endpoints

#### `POST /api/configure/school-requests`

Requires authentication. Used by onboarding and profile flows.

```json
{
  "requested_name": "SMA Buddha Tzu Chi Bandung",
  "requested_type": "SMA",
  "requested_city": "Bandung"
}
```

Returns `201` with pending request in `data`. Returns `409` for duplicate pending request or existing matching school.

#### `GET /api/configure/school-requests/me`

Requires authentication. Returns requesting user's own requests with pagination.

#### `GET /api/configure/school-requests`

Requires `organizer` or `admin`. Supports `page`, `page_size`, `status`, `search`, and date filters. Organizer may see only request review data needed for approval.

#### `GET /api/configure/school-requests/:id`

Requester may read their own request. `organizer` and `admin` may read requests available for review.

#### `POST /api/configure/school-requests/:id/accept`

Requires `organizer` or `admin`.

```json
{
  "review_note": "Verified and added to school master data"
}
```

Returns `200` with accepted request and linked or created school in `data`. Returns `409` if request is no longer pending or a conflicting school is detected.

#### `POST /api/configure/school-requests/:id/reject`

Requires `organizer` or `admin`.

```json
{
  "review_note": "Please submit the official school name"
}
```

Returns `200` with rejected request in `data`.

### Admin school CRUD

#### `POST /api/configure/schools`

Requires `admin`. Creates a school directly. Returns `201` or `409` for case-insensitive duplicate.

#### `PATCH /api/configure/schools/:id`

Requires `admin`. Supports partial update. `name` changes propagate to legacy user string references in one transaction.

#### `PATCH /api/configure/schools/:id/status`

Requires `admin`.

```json
{
  "is_active": false
}
```

#### `DELETE /api/configure/schools/:id`

Requires `admin`. Returns `409` when referenced. Use deactivation instead.

### Success example

```json
{
  "status": "success",
  "code": 200,
  "message": "School request accepted",
  "data": {
    "request": {
      "id": "req_001",
      "status": "accepted",
      "school_id": "sch_001"
    },
    "school": {
      "id": "sch_001",
      "name": "SMA Buddha Tzu Chi Bandung",
      "type": "SMA",
      "city": "Bandung",
      "is_active": true
    }
  }
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
enum SchoolType {
  SMP
  SMA
  SMK
  Universitas
  Umum
}

enum SchoolRequestStatus {
  pending
  accepted
  rejected
  cancelled
}

model School {
  id        String     @id @default(cuid())
  name      String
  type      SchoolType @default(SMA)
  city      String
  isActive  Boolean    @default(true) @map("is_active")
  createdAt DateTime   @default(now()) @map("created_at")
  updatedAt DateTime   @updatedAt @map("updated_at")

  requests SchoolRequest[]
  @@index([isActive, name])
}

model SchoolRequest {
  id             String              @id @default(cuid())
  requestedName  String              @map("requested_name")
  requestedType  SchoolType          @map("requested_type")
  requestedCity  String              @map("requested_city")
  status         SchoolRequestStatus @default(pending)
  requestedById  String              @map("requested_by_id")
  reviewedById   String?             @map("reviewed_by_id")
  reviewedAt    DateTime?           @map("reviewed_at")
  reviewNote    String?             @map("review_note")
  schoolId      String?             @map("school_id")
  createdAt     DateTime            @default(now()) @map("created_at")
  updatedAt     DateTime            @updatedAt @map("updated_at")

  school School? @relation(fields: [schoolId], references: [id])
  @@index([status, createdAt])
  @@index([requestedById, status])
}
```

Existing `User.school` remains a string until the user migration is approved.

## 10. Acceptance criteria

| ID | Scenario | Expected result |
| --- | --- | --- |
| AC-01 | Member searches schools during onboarding | Active schools return in standard envelope. |
| AC-02 | Member submits school not in list | Pending request is created and shown to requester. |
| AC-03 | Member submits duplicate pending request | API returns `409` envelope; no duplicate request. |
| AC-04 | Organizer opens request queue | Pending requests appear; no school CRUD controls appear. |
| AC-05 | Organizer accepts valid request | Existing school is matched or new school is created atomically. |
| AC-06 | Organizer rejects request | Status becomes `rejected`, reviewer note is stored, requester can see result. |
| AC-07 | Organizer attempts direct school CRUD | API returns `403` envelope. |
| AC-08 | Admin creates, updates, deactivates, or deletes school | Operation follows admin permission and reference constraints. |
| AC-09 | Member or activist accesses review queue | API returns `403` envelope. |
| AC-10 | Accepted request conflicts with existing school | Existing school is linked, no duplicate is created. |
| AC-11 | Any API response is returned | Contains `status`, `code`, `message`, and `data`. |
| AC-12 | Invalid request fields submitted | API returns `400` envelope; no partial write. |

## 11. Out of scope

- National education database integration.
- Geolocation and nearest-school search.
- School logos and branding.
- Multiple schools per user.
- Automated external verification.
