// feature/events/types.ts
// Shared types for the events feature, shaped after the API contract.

export type EventType = "rutin" | "special"
export type EventStatus = "draft" | "published" | "done" | "cancelled"
export type RsvpStatus = "hadir" | "tidak_hadir"

// ─── GET /events (list item) ──────────────────────────────────────────────────

export interface EventListItem {
  id: string
  title: string
  description?: string
  location: string
  event_date: string  // ISO 8601
  event_type: EventType
  status: EventStatus
  rsvp_count: number
  /** Present for authenticated user's own RSVP status */
  my_rsvp?: RsvpStatus | null
}

// ─── POST /events (create) ────────────────────────────────────────────────────

export interface CreateEventPayload {
  title: string
  description: string
  location: string
  event_date: string  // ISO 8601
  event_type: EventType
}
