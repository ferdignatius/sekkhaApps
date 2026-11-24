const DAY_MS = 86_400_000

function pad2(n: number): string {
  return String(n).padStart(2, "0")
}

function toIsoDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`
}

export interface ActivityHeatmapRecord {
  scannedAt: Date | string
  event?: { eventDate?: Date | string | null } | null
}

export interface WeeklyActivityBucket {
  week_start: string
  week_end: string
  month: number
  week_of_month: number
  count: number
}

export interface YearlyActivityHeatmap {
  year: number
  active_month: number
  total_checkins: number
  weeks: WeeklyActivityBucket[]
}

/** Returns padded UTC query bounds covering all ISO boundary weeks of `targetYear`. */
export function getHeatmapQueryRange(targetYear: number): {
  queryStart: Date
  queryEnd: Date
} {
  return {
    queryStart: new Date(Date.UTC(targetYear, 0, 1) - 7 * DAY_MS),
    queryEnd: new Date(
      Date.UTC(targetYear, 11, 31, 23, 59, 59, 999) + 7 * DAY_MS
    ),
  }
}

/**
 * Buckets attendance records into Monday-start weekly counts across `targetYear`
 * using WIB (UTC+7) calendar date boundaries.
 */
export function buildYearlyWeeklyHeatmap(
  records: ActivityHeatmapRecord[],
  targetYear: number,
  now = new Date()
): YearlyActivityHeatmap {
  const getWeekStartIso = (d: Date) => {
    const wib = new Date(d.getTime() + 7 * 3600_000)
    const day = wib.getUTCDay()
    const diffToMonday = day === 0 ? -6 : 1 - day
    const monday = new Date(
      Date.UTC(
        wib.getUTCFullYear(),
        wib.getUTCMonth(),
        wib.getUTCDate() + diffToMonday
      )
    )
    return toIsoDate(monday)
  }

  const countsByWeekStart = new Map<string, number>()
  for (const rec of records) {
    const refDate = rec.event?.eventDate
      ? new Date(rec.event.eventDate)
      : new Date(rec.scannedAt)
    if (Number.isNaN(refDate.getTime())) continue
    const wkKey = getWeekStartIso(refDate)
    countsByWeekStart.set(wkKey, (countsByWeekStart.get(wkKey) ?? 0) + 1)
  }

  const jan1 = new Date(Date.UTC(targetYear, 0, 1))
  const jan1Day = jan1.getUTCDay()
  const firstMonday = new Date(
    Date.UTC(targetYear, 0, 1 + (jan1Day === 0 ? -6 : 1 - jan1Day))
  )

  const weeks: WeeklyActivityBucket[] = []
  const monthWeekCounter = new Array<number>(12).fill(0)
  let totalCheckins = 0

  for (let i = 0; i < 55; i++) {
    const mon = new Date(firstMonday.getTime() + i * 7 * DAY_MS)
    const thu = new Date(mon.getTime() + 3 * DAY_MS)
    const sun = new Date(mon.getTime() + 6 * DAY_MS)
    const thuYear = thu.getUTCFullYear()
    if (thuYear < targetYear) continue
    if (thuYear > targetYear) break

    const month = thu.getUTCMonth()
    monthWeekCounter[month] += 1
    const weekStart = toIsoDate(mon)
    const count = countsByWeekStart.get(weekStart) ?? 0
    totalCheckins += count

    weeks.push({
      week_start: weekStart,
      week_end: toIsoDate(sun),
      month,
      week_of_month: monthWeekCounter[month],
      count,
    })
  }

  const wibNow = new Date(now.getTime() + 7 * 3600_000)
  const activeMonth =
    wibNow.getUTCFullYear() === targetYear ? wibNow.getUTCMonth() : 0

  return {
    year: targetYear,
    active_month: activeMonth,
    total_checkins: totalCheckins,
    weeks,
  }
}
