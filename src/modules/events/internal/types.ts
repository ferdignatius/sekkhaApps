// feature/events/types.ts
// Shared types for the events feature, shaped after the API contract.

export type EventType = "rutin" | "special"
export type EventStatus = "draft" | "published" | "done" | "cancelled"
export type RsvpStatus = "hadir" | "tidak_hadir"
export type AttendanceMethod = "qr" | "manual"
export type UserRole = "umat" | "pengurus" | "admin"

// ─── Tag system — dynamic from master data, fallback hardcoded ────────────────

export type EventTag = string // dynamic from master data

export interface TagColors {
  dot: string
  bg: string
  text: string
}

// Fallback colors — used when API is not available
export const DEFAULT_EVENT_TAG_COLORS: Record<string, TagColors> = {
  rutin:    { dot: "bg-sekkha-brand-blue",   bg: "bg-sekkha-teal-light", text: "text-sekkha-brand-blue" },
  special:  { dot: "bg-sekkha-brand-yellow", bg: "bg-yellow-50",         text: "text-yellow-700"         },
  retreat:  { dot: "bg-purple-500",          bg: "bg-purple-50",         text: "text-purple-700"         },
  meditasi: { dot: "bg-emerald-500",         bg: "bg-emerald-50",        text: "text-emerald-700"        },
  sosial:   { dot: "bg-orange-400",          bg: "bg-orange-50",         text: "text-orange-700"         },
}

// Re-export as EVENT_TAG_COLORS for backward compatibility
// This will be replaced at runtime by useEventTags hook
export const EVENT_TAG_COLORS = DEFAULT_EVENT_TAG_COLORS

/**
 * Convert a hex color to tailwind-compatible inline style approach.
 * Since master data stores hex colors, we generate CSS classes dynamically.
 */
export function hexToTagColors(hex: string): TagColors {
  return {
    dot: `bg-[${hex}]`,
    bg: `bg-[${hex}]/10`,
    text: `text-[${hex}]`,
  }
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
  qr_code?: QrCode | null
}

// ─── QR Code ──────────────────────────────────────────────────────────────────

export interface QrCode {
  code: string
  expires_at: string | null
}

// ─── Attendance record ────────────────────────────────────────────────────────

export interface AttendanceRecord {
  user_id: string
  name: string
  method: AttendanceMethod
  scanned_at: string
}

// ─── POST /events (create) ────────────────────────────────────────────────────

export interface CreateEventPayload {
  title: string
  description: string
  location: string
  event_date: string
  event_type: EventType
  tag?: string
}
