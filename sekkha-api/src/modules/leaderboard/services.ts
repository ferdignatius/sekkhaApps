import { leaderboardModels } from "./models"
import { redis } from "../../lib/redis"
import { CacheKeys } from "../../lib/cache"

export interface LeaderboardUserEntry {
  user_id: string
  name: string
  initials: string
  rank: number
  value: number
  attendances_count: number
  avatar_url?: string | null
  role: string
}

export interface SeasonInfo {
  id?: string
  name: string
  code?: string | null
  start_date: string
  end_date: string
  days_left: number
  target_attendance: number
  description?: string | null
}

export interface LeaderboardPeriod {
  id: string
  key: "custom" | "semester" | "annual"
  name: string
  code?: string | null
  start_date: string
  end_date: string
  days_left: number
  target_attendance: number
  is_active: boolean
  is_custom: boolean
  description?: string | null
}

export interface LeaderboardSnapshot {
  entries: LeaderboardUserEntry[]
  community_total: number
  season: SeasonInfo
  available_periods: LeaderboardPeriod[]
  active_period: LeaderboardPeriod
  calculated_at: string
}

const METRICS = ["points", "streak", "attendance"] as const
export type MetricType = (typeof METRICS)[number]

function leaderboardCacheKey(metric: MetricType, periodKey: string, identifier: string) {
  return CacheKeys.leaderboard(metric, `${periodKey}:${identifier}`)
}

/**
 * Resolves standard calendar periods and active custom seasons.
 * Dynamic tab priority:
 * 1. If active custom season exists: [ Custom, Semester, Annual ]
 * 2. If no active custom season: [ Semester, Annual ]
 */
export async function resolveLeaderboardPeriods(now = new Date()): Promise<{
  periods: LeaderboardPeriod[]
  activeCustom: any | null
}> {
  const year = now.getFullYear()
  const month = now.getMonth() // 0-indexed: 0-5 = Sem 1, 6-11 = Sem 2
  const sem = month < 6 ? 1 : 2

  const semStart = new Date(year, sem === 1 ? 0 : 6, 1, 0, 0, 0, 0)
  const semEnd = new Date(year, sem === 1 ? 5 : 11, sem === 1 ? 30 : 31, 23, 59, 59, 999)
  const semDaysLeft = Math.max(0, Math.ceil((semEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

  const annualStart = new Date(year, 0, 1, 0, 0, 0, 0)
  const annualEnd = new Date(year, 11, 31, 23, 59, 59, 999)
  const annualDaysLeft = Math.max(0, Math.ceil((annualEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

  // Check for an active custom season in database
  const activeCustom = await leaderboardModels.findActiveSeason()
  const isCustomReal =
    activeCustom &&
    !activeCustom.code?.startsWith(`S${year}-SEM`) &&
    !activeCustom.code?.startsWith(`S${year}-ANNUAL`)

  const periods: LeaderboardPeriod[] = []

  if (activeCustom && isCustomReal) {
    const customDaysLeft = Math.max(
      0,
      Math.ceil((activeCustom.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    )
    periods.push({
      id: activeCustom.id,
      key: "custom",
      name: activeCustom.name,
      code: activeCustom.code,
      start_date: activeCustom.startDate.toISOString(),
      end_date: activeCustom.endDate.toISOString(),
      days_left: customDaysLeft,
      target_attendance: activeCustom.targetAttendance,
      is_active: true,
      is_custom: true,
      description: activeCustom.description,
    })
  }

  periods.push({
    id: `sem-${year}-${sem}`,
    key: "semester",
    name: `Semester ${sem} · ${year}`,
    code: `S${year}-SEM${sem}`,
    start_date: semStart.toISOString(),
    end_date: semEnd.toISOString(),
    days_left: semDaysLeft,
    target_attendance: 500,
    is_active: periods.length === 0,
    is_custom: false,
    description: `Auto-active semester period (${sem === 1 ? "1 Jan - 30 Jun" : "1 Jul - 31 Dec"})`,
  })

  periods.push({
    id: `annual-${year}`,
    key: "annual",
    name: `Annual · ${year}`,
    code: `S${year}-ANNUAL`,
    start_date: annualStart.toISOString(),
    end_date: annualEnd.toISOString(),
    days_left: annualDaysLeft,
    target_attendance: 1000,
    is_active: false,
    is_custom: false,
    description: `Auto-active full year evaluation period (${year})`,
  })

  return { periods, activeCustom: isCustomReal ? activeCustom : null }
}

export async function resolveActiveSeason(now = new Date()) {
  const activeSeason = await leaderboardModels.findActiveSeason()
  if (activeSeason) {
    await leaderboardModels.deactivateOtherSeasons(activeSeason.id)
    return activeSeason
  }

  const scheduledSeason = await leaderboardModels.findScheduledSeason(now)
  if (scheduledSeason) {
    await leaderboardModels.deactivateAllSeasons()
    return leaderboardModels.activateSeason(scheduledSeason.id)
  }

  const year = now.getFullYear()
  const q = Math.floor(now.getMonth() / 3) + 1
  return leaderboardModels.createSeason({
    name: `Season ${q} · ${year}`,
    code: `S${year}-Q${q}`,
    startDate: new Date(year, (q - 1) * 3, 1),
    endDate: new Date(year, q * 3, 0, 23, 59, 59),
    isActive: true,
    targetAttendance: 500,
    description: `Season kuartal ${q} tahun ${year}`,
  })
}

const activeComputations = new Map<string, Promise<void>>()

/**
 * Coalesces concurrent refreshes into one database computation per period.
 */
const memoryLeaderboardCache = new Map<string, LeaderboardSnapshot>()

export function computeAndCacheLeaderboard(periodTarget?: LeaderboardPeriod): Promise<void> {
  const periodKey = periodTarget ? `${periodTarget.key}:${periodTarget.code || periodTarget.id}` : "default"
  const existing = activeComputations.get(periodKey)
  if (existing) return existing

  const computation = computeAndCacheLeaderboardInternal(periodTarget)
  activeComputations.set(periodKey, computation)
  void computation
    .finally(() => {
      if (activeComputations.get(periodKey) === computation) {
        activeComputations.delete(periodKey)
      }
    })
    .catch(() => {
      // Preserves the error
    })
  return computation
}

/** Computes a fresh snapshot for each supported metric within the period's date bounds. */
async function computeAndCacheLeaderboardInternal(periodTarget?: LeaderboardPeriod): Promise<void> {
  try {
    const now = new Date()
    const { periods } = await resolveLeaderboardPeriods(now)
    const activePeriod = periodTarget || periods[0]

    const startDate = new Date(activePeriod.start_date)
    const endDate = new Date(activePeriod.end_date)

    // Fetch lean user rows plus grouped attendances and points strictly within date range
    const [users, attendanceCounts, totalAttendances, pointTotals] = await Promise.all([
      leaderboardModels.findLeaderboardUsers(),
      leaderboardModels.findAttendanceCountsByUser(startDate, endDate),
      leaderboardModels.countTotalAttendances(startDate, endDate),
      leaderboardModels.findPointTotalsByUser(startDate, endDate),
    ])

    const attendanceByUser = new Map(
      attendanceCounts.map((row) => [row.userId, row._count._all])
    )
    const pointsByUser = new Map(
      pointTotals.map((row) => [row.userId, row._sum.amount ?? 0])
    )

    const nowIso = now.toISOString()
    const seasonInfo: SeasonInfo = {
      id: activePeriod.id,
      name: activePeriod.name,
      code: activePeriod.code,
      start_date: activePeriod.start_date,
      end_date: activePeriod.end_date,
      days_left: activePeriod.days_left,
      target_attendance: activePeriod.target_attendance,
      description: activePeriod.description,
    }

    for (const metric of METRICS) {
      const list: LeaderboardUserEntry[] = users
        .map((u) => {
          const safeName = u.profile?.name || "Anggota Sekkha"
          const initials =
            safeName
              .split(" ")
              .slice(0, 2)
              .map((w) => (w && w[0] ? w[0].toUpperCase() : ""))
              .join("") || "AS"
          const attendanceCount = attendanceByUser.get(u.id) ?? 0
          const val =
            metric === "points"
              ? pointsByUser.get(u.id) ?? 0
              : metric === "streak"
                ? Math.min(attendanceCount, 12)
                : attendanceCount

          return {
            user_id: u.id,
            name: safeName,
            initials,
            rank: 0,
            value: val,
            attendances_count: attendanceCount,
            avatar_url: null,
            role: u.role || "member",
          }
        })
        .sort((a, b) => b.value - a.value)
        .map((entry, idx) => ({
          ...entry,
          rank: idx + 1,
        }))

      const snapshot: LeaderboardSnapshot = {
        entries: list,
        community_total: totalAttendances,
        season: seasonInfo,
        available_periods: periods,
        active_period: activePeriod,
        calculated_at: nowIso,
      }

      const cacheKey = leaderboardCacheKey(metric, activePeriod.key, activePeriod.code || activePeriod.id)
      memoryLeaderboardCache.set(cacheKey, snapshot)
      try {
        if (redis.status === "ready" || redis.status === "connect") {
          await redis.set(cacheKey, JSON.stringify(snapshot), "EX", 60 * 60 * 24 * 7)
        }
      } catch {
        // Fall back cleanly to memoryLeaderboardCache
      }
    }
  } catch (err: any) {
    console.warn("⚠️ Failed to compute leaderboard snapshot:", err?.message || err)
    throw err
  }
}

/**
 * Gets the pre-computed snapshot for a given metric and period. If missing or stale, computes immediately.
 */
export async function getLeaderboardSnapshot(
  metric: MetricType,
  periodKey?: string,
  forceRefresh = false
): Promise<LeaderboardSnapshot> {
  const now = new Date()
  const { periods } = await resolveLeaderboardPeriods(now)

  // Find requested period or fallback to default highest-priority period (index 0)
  const targetPeriod = periodKey
    ? periods.find(
        (p) =>
          p.key.toLowerCase() === periodKey.toLowerCase() ||
          p.id === periodKey ||
          (p.code && p.code.toLowerCase() === periodKey.toLowerCase())
      ) || periods[0]
    : periods[0]

  const cacheKey = leaderboardCacheKey(metric, targetPeriod.key, targetPeriod.code || targetPeriod.id)
  if (!forceRefresh) {
    try {
      if (redis.status === "ready" || redis.status === "connect") {
        const raw = await redis.get(cacheKey)
        if (raw) {
          const parsed = JSON.parse(raw) as LeaderboardSnapshot
          const isStale = parsed.entries?.some((e) => !e.role)
          if (!isStale) {
            // Always ensure available_periods are updated to real-time status
            parsed.available_periods = periods
            parsed.active_period = targetPeriod
            return parsed
          }
        }
      }
    } catch (err) {
      console.warn("⚠️ Redis cache read error:", err)
    }

    const cachedMem = memoryLeaderboardCache.get(cacheKey)
    if (cachedMem) {
      const isStale = cachedMem.entries?.some((e) => !e.role)
      if (!isStale) {
        cachedMem.available_periods = periods
        cachedMem.active_period = targetPeriod
        return cachedMem
      }
    }
  }

  // Cold start or stale cache fallback: compute and cache now
  try {
    await computeAndCacheLeaderboard(targetPeriod)
  } catch {
    // Graceful error recovery
  }

  try {
    if (redis.status === "ready" || redis.status === "connect") {
      const raw = await redis.get(cacheKey).catch(() => null)
      if (raw) {
        const parsed = JSON.parse(raw) as LeaderboardSnapshot
        parsed.available_periods = periods
        parsed.active_period = targetPeriod
        return parsed
      }
    }
  } catch {}

  const cachedMem = memoryLeaderboardCache.get(cacheKey)
  if (cachedMem) {
    cachedMem.available_periods = periods
    cachedMem.active_period = targetPeriod
    return cachedMem
  }

  // In-memory minimal fallback if DB / Redis is empty or down
  return {
    entries: [],
    community_total: 0,
    season: {
      id: targetPeriod.id,
      name: targetPeriod.name,
      code: targetPeriod.code,
      start_date: targetPeriod.start_date,
      end_date: targetPeriod.end_date,
      days_left: targetPeriod.days_left,
      target_attendance: targetPeriod.target_attendance,
      description: targetPeriod.description,
    },
    available_periods: periods,
    active_period: targetPeriod,
    calculated_at: new Date().toISOString(),
  }
}
