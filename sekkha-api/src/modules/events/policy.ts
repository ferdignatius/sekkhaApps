import type { EventStatus, EventVisibility } from "@prisma/client"

export function canManageEvent(role: string): boolean {
  return role === "organizer" || role === "admin"
}

export function canRecordAttendance(role: string): boolean {
  // Exclusive to organizer and admin per PRD AC-EVT-01 & AC-ATT-03
  return role === "organizer" || role === "admin"
}

export function canViewEvent(
  role: string,
  status: EventStatus,
  visibility: EventVisibility
): boolean {
  if (canManageEvent(role)) return true
  // Cancelled events are invisible to regular members and activists
  if (status === "cancel") return false
  // Organizer visibility is hidden from non-managers
  if (visibility === "organizer") return false
  // Activist visibility is hidden from regular members
  return !(visibility === "activist" && role === "member")
}
