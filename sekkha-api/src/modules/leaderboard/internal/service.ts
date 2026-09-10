import { prisma } from "../../../lib/prisma"
import { redis } from "../../../lib/redis"
import { CacheKeys } from "../../../lib/cache"

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

/**
 * Computes leaderboard snapshot from PostgreSQL strictly filtered by active Season range and caches in Redis for 7 days.
 */
export async function computeAndCacheLeaderboard(): Promise<void> {
  try {
    const now = new Date()

    // 1. Determine active season
    let activeSeason = await prisma.season.findFirst({
      where: { isActive: true },
    })

    if (!activeSeason) {
      activeSeason = await prisma.season.findFirst({
        where: {
          startDate: { lte: now },
          endDate: { gte: now },
        },
        orderBy: { startDate: "desc" },
      })
    }

    // Default season if database has no seasons yet
    if (!activeSeason) {
      const year = now.getFullYear()
      const q = Math.floor(now.getMonth() / 3) + 1
      const qStart = new Date(year, (q - 1) * 3, 1)
      const qEnd = new Date(year, q * 3, 0, 23, 59, 59)

      activeSeason = await prisma.season.create({
        data: {
          name: `Season ${q} · ${year}`,
          code: `S${year}-Q${q}`,
          startDate: qStart,
          endDate: qEnd,
          isActive: true,
          targetAttendance: 500,
          bonusPoints: 100,
          description: `Season kuartal ${q} tahun ${year}`,
        },
      })
    }

    const attendanceWhere = {
      scannedAt: {
        gte: activeSeason.startDate,
        lte: activeSeason.endDate,
      },
    }

    // 2. Fetch users and only their attendances within season date range
    const [users, totalAttendances] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          role: true,
          userNumber: true,
          profile: {
            select: {
              name: true,
              avatarUrl: true,
            },
          },
          stats: {
            select: {
              points: true,
            },
          },
          attendances: {
            where: attendanceWhere,
            select: { scannedAt: true, eventId: true },
            orderBy: { scannedAt: "asc" },
          },
        },
      }),
      prisma.attendance.count({
        where: attendanceWhere,
      }),
    ])

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
          const initials = safeName
            .split(" ")
            .slice(0, 2)
            .map((w) => (w && w[0] ? w[0].toUpperCase() : ""))
            .join("") || "AS"
          const attendanceCount = u.attendances.length
          const val =
            metric === "points"
              ? (u.stats?.points ?? attendanceCount * 50)
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
            avatar_url: u.profile?.avatarUrl,
            role: u.role || "umat",
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

      const cacheKey = CacheKeys.leaderboard(metric, "weekly_snapshot")
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
export async function getLeaderboardSnapshot(metric: MetricType, forceRefresh = false): Promise<LeaderboardSnapshot> {
  const cacheKey = CacheKeys.leaderboard(metric, "weekly_snapshot")
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
