export type StreakStatus = "active" | "paused" | "inactive" | "expired"

export interface StreakCalculationResult {
  current_streak: number
  longest_streak: number
  status: StreakStatus
}

// Convert dates into ISO week strings "YYYY-WXX" (UTC-normalized)
export function toWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`
}

// Convert dates into UTC calendar month key "YYYY-MM"
export function toMonthKey(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

// Return Monday 00:00:00 UTC of the ISO week containing `date`
export function getIsoWeekMondayUtc(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() - (dayNum - 1))
  return d
}

/**
 * TikTok-style 3-state weekly streak engine with Vihara Bye-Week support:
 * - Attending any official event in an ISO week marks that week active.
 * - Missing 1..3 consecutive active weeks transitions status to "paused" (count preserved).
 * - Attending while "paused" re-activates status to "active" without incrementing count.
 * - Attending the subsequent active week increments current_streak (+1).
 * - Missing >= 4 consecutive active weeks (~1 full calendar month) expires streak to 0.
 * - Weeks in `activeCommunityWeeks` that had 0 events are skipped cleanly (Bye-Week freeze).
 */
export function calculateWeeklyStreak(
  attendances: { scannedAt: Date | string }[],
  referenceDate: Date = new Date(),
  activeCommunityWeeks?: Iterable<string>
): StreakCalculationResult {
  if (attendances.length === 0) {
    return { current_streak: 0, longest_streak: 0, status: "inactive" }
  }

  const attendedWeeks = new Set<string>()
  let minDate: Date | null = null

  for (const a of attendances) {
    const dt = new Date(a.scannedAt)
    if (Number.isNaN(dt.getTime())) continue
    attendedWeeks.add(toWeekKey(dt))
    if (!minDate || dt < minDate) {
      minDate = dt
    }
  }

  if (!minDate || attendedWeeks.size === 0) {
    return { current_streak: 0, longest_streak: 0, status: "inactive" }
  }

  const communityWeeks = activeCommunityWeeks ? new Set(activeCommunityWeeks) : null
  const startMonday = getIsoWeekMondayUtc(minDate)
  const endMonday = getIsoWeekMondayUtc(referenceDate)

  if (endMonday < startMonday) {
    return { current_streak: 0, longest_streak: 0, status: "inactive" }
  }

  const refWeekKey = toWeekKey(referenceDate)

  let currentStreak = 0
  let longestStreak = 0
  let status: StreakStatus = "inactive"
  let consecutiveMissed = 0

  const cursor = new Date(startMonday)
  while (cursor <= endMonday) {
    const wKey = toWeekKey(cursor)
    const isRefWeek = wKey === refWeekKey

    if (attendedWeeks.has(wKey)) {
      consecutiveMissed = 0
      if (status === "inactive" || status === "expired") {
        currentStreak = 1
        status = "active"
      } else if (status === "paused") {
        // Re-activation preserves currentStreak; next active week will increment
        status = "active"
      } else {
        currentStreak += 1
      }
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak
      }
    } else {
      // Vihara Bye-Week: 0 community events this week -> freeze state without penalty
      if (communityWeeks && communityWeeks.size > 0 && !communityWeeks.has(wKey)) {
        cursor.setUTCDate(cursor.getUTCDate() + 7)
        continue
      }

      // Ongoing current week grace period: do not pause during the current week before service happens
      if (isRefWeek && consecutiveMissed === 0) {
        cursor.setUTCDate(cursor.getUTCDate() + 7)
        continue
      }

      consecutiveMissed += 1
      if (consecutiveMissed >= 4) {
        currentStreak = 0
        status = "expired"
      } else if (currentStreak > 0) {
        status = "paused"
      }
    }

    cursor.setUTCDate(cursor.getUTCDate() + 7)
  }

  return {
    current_streak: currentStreak,
    longest_streak: longestStreak,
    status,
  }
}

export function evaluatePerfectMonthBonus(params: {
  userId: string
  userAttendances: { scannedAt: Date | string }[]
  monthEventDates: (Date | string)[]
  referenceEventDate: Date
  hasFutureUnclosedWeeksInMonth?: boolean
}): {
  eligible: boolean
  yearMonth: string
  activeWeeksCount: number
  referenceId: string
} {
  const yearMonth = toMonthKey(params.referenceEventDate)

  const activeMonthWeeks = new Set<string>()
  activeMonthWeeks.add(toWeekKey(params.referenceEventDate))
  for (const rawDate of params.monthEventDates) {
    const dt = new Date(rawDate)
    if (Number.isNaN(dt.getTime())) continue
    if (toMonthKey(dt) === yearMonth) {
      activeMonthWeeks.add(toWeekKey(dt))
    }
  }

  const userWeeks = new Set<string>()
  for (const a of params.userAttendances) {
    const dt = new Date(a.scannedAt)
    if (Number.isNaN(dt.getTime())) continue
    if (toMonthKey(dt) === yearMonth) {
      userWeeks.add(toWeekKey(dt))
    }
  }

  const allAttended =
    activeMonthWeeks.size > 0 && Array.from(activeMonthWeeks).every((w) => userWeeks.has(w))
  const eligible =
    !params.hasFutureUnclosedWeeksInMonth && activeMonthWeeks.size >= 3 && allAttended

  return {
    eligible,
    yearMonth,
    activeWeeksCount: activeMonthWeeks.size,
    referenceId: `monthly_streak:${params.userId}:${yearMonth}`,
  }
}
