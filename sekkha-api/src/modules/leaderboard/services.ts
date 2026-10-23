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
  bonus_points: number
  description?: string | null
}

export interface LeaderboardSnapshot {
  entries: LeaderboardUserEntry[]
  community_total: number
  season: SeasonInfo
  calculated_at: string
}

const METRICS = ["points", "streak", "attendance"] as const
export type MetricType = (typeof METRICS)[number]

function leaderboardCacheKey(metric: MetricType, season: { id: string; updatedAt: Date }) {
  return CacheKeys.leaderboard(
    metric,
    `${season.id}:${season.updatedAt.getTime()}`
  )
}

let leaderboardComputation: Promise<void> | null = null

/**
 * Single source of truth for the active leaderboard season.
 * The most recently updated active season wins if old data contains more than
 * one active row; date-range fallback is only used when no row is flagged.
 */
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
    bonusPoints: 100,
    description: `Season kuartal ${q} tahun ${year}`,
  })
}

/**
 * Coalesces concurrent refreshes into one database computation.
 * Without this guard, a cache miss or admin refresh burst can start many
 * identical full-season calculations at the same time.
 */
export function computeAndCacheLeaderboard(): Promise<void> {
  if (leaderboardComputation) return leaderboardComputation

  const computation = computeAndCacheLeaderboardInternal()
  leaderboardComputation = computation
  void computation
    .finally(() => {
      if (leaderboardComputation === computation) leaderboardComputation = null
    })
    .catch(() => {
      // Preserves the error
    })
  return computation
}

/** Computes a fresh snapshot for each supported metric. */
async function computeAndCacheLeaderboardInternal(): Promise<void> {
  try {
    const now = new Date()

    // 1. Resolve the same active season used by configuration and events.
    const activeSeason = await resolveActiveSeason(now)

    // Fetch lean user rows plus grouped attendances and points
    const [users, attendanceCounts, totalAttendances, pointTotals] = await Promise.all([
      leaderboardModels.findLeaderboardUsers(),
      leaderboardModels.findAttendanceCountsByUser(activeSeason.startDate, activeSeason.endDate),
      leaderboardModels.countTotalAttendances(activeSeason.startDate, activeSeason.endDate),
      leaderboardModels.findPointTotalsByUser(activeSeason.startDate, activeSeason.endDate),
    ])

    const attendanceByUser = new Map(
      attendanceCounts.map((row) => [row.userId, row._count._all])
    )
    const pointsByUser = new Map(
      pointTotals.map((row) => [row.userId, row._sum.amount ?? 0])
    )

    const nowIso = now.toISOString()
    const daysLeft = Math.max(
      0,
      Math.ceil((activeSeason.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    )

    const seasonInfo: SeasonInfo = {
      id: activeSeason.id,
      name: activeSeason.name,
      code: activeSeason.code,
      start_date: activeSeason.startDate.toISOString(),
      end_date: activeSeason.endDate.toISOString(),
      days_left: daysLeft,
      target_attendance: activeSeason.targetAttendance,
      bonus_points: activeSeason.bonusPoints,
      description: activeSeason.description,
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
              ? pointsByUser.get(u.id) ?? attendanceCount * 50
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
        calculated_at: nowIso,
      }

      const cacheKey = leaderboardCacheKey(metric, activeSeason)
      await redis.set(cacheKey, JSON.stringify(snapshot), "EX", 60 * 60 * 24 * 7)
    }
  } catch (err) {
    console.error("❌ Failed to compute leaderboard snapshot:", err)
    throw err
  }
}

/**
 * Gets the pre-computed snapshot for a given metric. If missing or stale, computes immediately.
 */
export async function getLeaderboardSnapshot(
  metric: MetricType,
  forceRefresh = false
): Promise<LeaderboardSnapshot> {
  const activeSeason = await resolveActiveSeason()
  const cacheKey = leaderboardCacheKey(metric, activeSeason)
  if (!forceRefresh) {
    try {
      const raw = await redis.get(cacheKey)
      if (raw) {
        const parsed = JSON.parse(raw) as LeaderboardSnapshot
        const isStale = parsed.entries?.some((e) => !e.role)
        if (!isStale) {
          return parsed
        }
      }
    } catch (err) {
      console.warn("⚠️ Redis cache read error:", err)
    }
  }

  // Cold start or stale cache fallback: compute and cache now
  await computeAndCacheLeaderboard()
  const raw = await redis.get(cacheKey).catch(() => null)
  if (raw) {
    return JSON.parse(raw) as LeaderboardSnapshot
  }

  // In-memory minimal fallback if Redis is down
  return {
    entries: [],
    community_total: 0,
    season: {
      name: "Musim Berjalan",
      start_date: new Date().toISOString(),
      end_date: new Date().toISOString(),
      days_left: 0,
      target_attendance: 500,
      bonus_points: 100,
    },
    calculated_at: new Date().toISOString(),
  }
}
