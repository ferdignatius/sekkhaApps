// Convert dates into ISO week strings "YYYY-WXX"
export function toWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`
}

export function calculateWeeklyStreak(attendances: { scannedAt: Date | string }[]) {
  if (attendances.length === 0) {
    return { current_streak: 0, longest_streak: 0 }
  }

  const attendedWeeks = new Set<string>()
  for (const a of attendances) {
    attendedWeeks.add(toWeekKey(new Date(a.scannedAt)))
  }

  // 1. Calculate current consecutive weekly streak
  const now = new Date()
  let currentStreak = 0

  let checkDate = new Date(now)
  let currentWeekKey = toWeekKey(checkDate)

  if (!attendedWeeks.has(currentWeekKey)) {
    checkDate.setUTCDate(checkDate.getUTCDate() - 7)
    currentWeekKey = toWeekKey(checkDate)
  }

  while (attendedWeeks.has(currentWeekKey)) {
    currentStreak++
    checkDate.setUTCDate(checkDate.getUTCDate() - 7)
    currentWeekKey = toWeekKey(checkDate)
  }

  // 2. F-25 Remediation: Calculate true longest historical consecutive weekly streak
  const sortedWeeks = Array.from(attendedWeeks).sort()
  let longestStreak = 0
  let runningStreak = 0
  let prevYear: number | null = null
  let prevWeekNum: number | null = null

  for (const wKey of sortedWeeks) {
    const [yearStr, weekPart] = wKey.split("-W")
    const year = parseInt(yearStr, 10)
    const week = parseInt(weekPart, 10)

    if (prevYear === null || prevWeekNum === null) {
      runningStreak = 1
    } else {
      const isNextWeek =
        (year === prevYear && week === prevWeekNum + 1) ||
        (year === prevYear + 1 && prevWeekNum >= 52 && week === 1)
      if (isNextWeek) {
        runningStreak++
      } else {
        runningStreak = 1
      }
    }
    prevYear = year
    prevWeekNum = week
    if (runningStreak > longestStreak) {
      longestStreak = runningStreak
    }
  }

  longestStreak = Math.max(longestStreak, currentStreak)

  return { current_streak: currentStreak, longest_streak: longestStreak }
}
