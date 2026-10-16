import type { EventStatus, EventVisibility } from "@prisma/client"

export function canManageEvent(role: string): boolean {
  return role === "organizer" || role === "admin"
}

export function canRecordAttendance(role: string): boolean {
  return role === "organizer" || role === "admin" || role === "activist"
}

export function canViewEvent(
  role: string,
  status: EventStatus,
  visibility: EventVisibility
): boolean {
  if (canManageEvent(role)) return true
  if (status === "draft" || status === "cancelled") return false
  if (visibility === "organizer") return false
  return !(visibility === "activist" && role === "member")
}
