import type { EventListItem } from "../types"

const WIB_TIMEZONE = "Asia/Jakarta"

export function toWibDateKey(iso?: string): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: WIB_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d)
  const values = Object.fromEntries(parts.map((p) => [p.type, p.value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function formatMonthParam(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

/**
 * Formats a "YYYY-MM-DD" date key into "day, date month year"
 * (e.g. "Wednesday, 11 November 2026" or "Wed, 11 Nov 2026").
 */
export function formatSelectedDate(
  key: string,
  style: "long" | "short" = "long"
): string {
  const isDateKey = /^\d{4}-\d{2}-\d{2}$/.test(key)
  const d = new Date(isDateKey ? `${key}T00:00:00Z` : key)
  if (Number.isNaN(d.getTime())) return key
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: isDateKey ? "UTC" : WIB_TIMEZONE,
    weekday: style,
    day: "numeric",
    month: style,
    year: "numeric",
  }).formatToParts(d)
  const values = Object.fromEntries(parts.map((p) => [p.type, p.value]))
  return `${values.weekday}, ${values.day} ${values.month} ${values.year}`
}

/**
 * Resolves the active calendar day when switching months:
 * - Current WIB calendar month -> returns Today ("YYYY-MM-DD")
 * - Any other month -> returns the 1st day of that month ("YYYY-MM-01")
 */
export function getDefaultSelectedDateForMonth(
  targetMonth: Date,
  now: Date = new Date()
): string {
  const todayKey = toWibDateKey(now.toISOString())
  const monthKey = formatMonthParam(targetMonth)
  if (todayKey.startsWith(monthKey)) {
    return todayKey
  }
  return `${monthKey}-01`
}

const STATUS_PRIORITY: Record<string, number> = {
  active: 0,
  scheduled: 1,
  closed: 2,
  cancel: 3,
}

/**
 * Deterministic display ordering (PRD Section 6.1):
 * 1. `active` (ascending by time)
 * 2. `scheduled` (ascending by time)
 * 3. `closed` (descending by time)
 * 4. `cancel` (descending by time)
 */
export function sortEventsForDisplay(events: EventListItem[]): EventListItem[] {
  return [...events].sort((a, b) => {
    const statusA = (a.status ?? "scheduled").toLowerCase()
    const statusB = (b.status ?? "scheduled").toLowerCase()
    const prioA = STATUS_PRIORITY[statusA] ?? 4
    const prioB = STATUS_PRIORITY[statusB] ?? 4
    if (prioA !== prioB) return prioA - prioB

    const timeA = new Date(a.event_date).getTime() || 0
    const timeB = new Date(b.event_date).getTime() || 0
    if (statusA === "closed" || statusA === "cancel") {
      return timeB - timeA
    }
    return timeA - timeB
  })
}

