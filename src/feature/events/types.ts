// feature/events/types.ts
// Shared types for the events feature, shaped after the API contract.

export type EventType = "rutin" | "special"
export type EventStatus = "draft" | "published" | "done" | "cancelled"
export type RsvpStatus = "hadir" | "tidak_hadir"
export type AttendanceMethod = "qr" | "manual"
export type UserRole = "umat" | "pengurus" | "admin"

// ─── Tag system (hardcoded for now, later from API) ───────────────────────────

export type EventTag = "rutin" | "special" | "retreat" | "meditasi" | "sosial"

export const EVENT_TAG_COLORS: Record<EventTag, { dot: string; bg: string; text: string }> = {
  rutin:    { dot: "bg-sekkha-brand-blue",   bg: "bg-sekkha-teal-light", text: "text-sekkha-brand-blue" },
  special:  { dot: "bg-sekkha-brand-yellow", bg: "bg-yellow-50",         text: "text-yellow-700"         },
  retreat:  { dot: "bg-purple-500",          bg: "bg-purple-50",         text: "text-purple-700"         },
  meditasi: { dot: "bg-emerald-500",         bg: "bg-emerald-50",        text: "text-emerald-700"        },
  sosial:   { dot: "bg-orange-400",          bg: "bg-orange-50",         text: "text-orange-700"         },
}

// ─── GET /events (list item) ──────────────────────────────────────────────────

export interface EventListItem {
  id: string
  title: string
  description?: string
  location: string
  event_date: string     // ISO 8601
  event_type: EventType
  tag?: EventTag
  status: EventStatus
  rsvp_count: number
  my_rsvp?: RsvpStatus | null
  /** QR code attached to this event — auto-generated on creation */
  qr_code?: QrCode | null
}

// ─── QR Code (POST /events/:id/qr) ───────────────────────────────────────────

export interface QrCode {
  /** Unique scan code, e.g. "EVT-ABC123" */
  code: string
  expires_at: string | null
}

// ─── Attendance record (GET /events/:id/attendances) ─────────────────────────

export interface AttendanceRecord {
  user_id: string
  name: string
  method: AttendanceMethod
  scanned_at: string  // ISO 8601
}

// ─── POST /events (create) ────────────────────────────────────────────────────

export interface CreateEventPayload {
  title: string
  description: string
  location: string
  event_date: string  // ISO 8601
  event_type: EventType
}
