// feature/events/types.ts
// Shared types for the events feature, shaped after the API contract.

export type EventType = "rutin" | "special"
export type EventStatus = "scheduled" | "active" | "cancelled" | "closed"

export type AttendanceMethod = "qr" | "manual"
export type UserRole = "member" | "activist" | "organizer" | "admin"

// ─── Tag system — dynamic from master data, fallback hardcoded ────────────────

export type EventTag = string // dynamic from master data

export interface TagColors {
  dot: string
  bg: string
  text: string
}

// Fallback colors — pastel & soft youth-friendly aesthetic
export const DEFAULT_EVENT_TAG_COLORS: Record<string, TagColors> = {
  rutin: {
    dot: "bg-sky-400",
    bg: "bg-sky-50/80 border border-sky-200/60",
    text: "text-sky-700",
  },
  special: {
    dot: "bg-amber-400",
    bg: "bg-amber-50/80 border border-amber-200/60",
    text: "text-amber-800",
  },
  retreat: {
    dot: "bg-purple-400",
    bg: "bg-purple-50/80 border border-purple-200/60",
    text: "text-purple-700",
  },
  meditasi: {
    dot: "bg-emerald-400",
    bg: "bg-emerald-50/80 border border-emerald-200/60",
    text: "text-emerald-700",
  },
  sosial: {
    dot: "bg-rose-400",
    bg: "bg-rose-50/80 border border-rose-200/60",
    text: "text-rose-700",
  },
}

// Re-export as EVENT_TAG_COLORS for backward compatibility
export const EVENT_TAG_COLORS = DEFAULT_EVENT_TAG_COLORS

/**
 * Convert a hex color to tailwind-compatible inline style approach.
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
  description?: string | null
  location: string
  event_date: string // ISO 8601
  event_type: any
  tag?: EventTag
  status: EventStatus
  visibility?: "all" | "member" | "activist" | "organizer"
  point_reward?: number
  max_late_minutes?: number
  late_penalty_points?: number
  total_attendees?: number
  qr_code?: QrCode | null
}

// ─── QR Code ──────────────────────────────────────────────────────────────────

export interface QrCode {
  code: string
  expires_at: string | null
}

// ─── Attendance record & Badge Activity System ────────────────────────────────

export interface AttendanceBadge {
  id: string
  name: string
  points: number
  color?: string
  is_active?: boolean
}

export interface AttendanceRecord {
  attendance_id?: string
  user_id: string
  name: string
  user_number?: string | null
  role?: string
  school?: string
  method: AttendanceMethod
  scanned_at: string
  points_earned?: number
  is_late?: boolean
  late_penalty_applied?: number
  badge_activity_id?: string | null
  badge_activity?: string | null
  badge_bonus_points?: number
  is_finalized?: boolean
  base_points?: number
  badges?: AttendanceBadge[]
}

// ─── POST /events (create) ────────────────────────────────────────────────────

export interface CreateEventPayload {
  title: string
  description?: string
  location: string
  event_date: string
  event_type?: EventType
  event_type_id?: string
  tag?: string
  visibility?: "all" | "member" | "activist" | "organizer"
  point_reward?: number
  max_late_minutes?: number
  late_penalty_points?: number
}
