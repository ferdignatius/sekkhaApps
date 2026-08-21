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
}

export interface LeaderboardSnapshot {
  entries: LeaderboardUserEntry[]
  community_total: number
  calculated_at: string
}

const METRICS = ["points", "streak", "attendance"] as const
export type MetricType = (typeof METRICS)[number]

/**
 * Computes weekly leaderboard snapshot from PostgreSQL and caches in Redis for 7 days.
 */
export async function computeAndCacheLeaderboard(): Promise<void> {
  try {
    const [users, totalAttendances] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          userNumber: true,
          _count: { select: { attendances: true } },
        },
        orderBy: { attendances: { _count: "desc" } },
      }),
      prisma.attendance.count(),
    ])

    const nowIso = new Date().toISOString()

    for (const metric of METRICS) {
      const list: LeaderboardUserEntry[] = users
        .map((u) => {
          const safeName = u.name || "Anggota Sekkha"
          const initials = safeName
            .split(" ")
            .slice(0, 2)
            .map((w) => (w && w[0] ? w[0].toUpperCase() : ""))
            .join("") || "AS"
          const attendanceCount = u._count?.attendances ?? 0
          const val =
            metric === "points"
              ? attendanceCount * 50
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
            avatar_url: u.avatarUrl,
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
 * Gets the pre-computed snapshot for a given metric. If missing, computes immediately.
 */
export async function getLeaderboardSnapshot(metric: MetricType): Promise<LeaderboardSnapshot> {
  const cacheKey = CacheKeys.leaderboard(metric, "weekly_snapshot")
  try {
    const raw = await redis.get(cacheKey)
    if (raw) {
      return JSON.parse(raw) as LeaderboardSnapshot
    }
  } catch (err) {
    console.warn("⚠️ Redis cache read error:", err)
  }

  // Cold start fallback: compute and cache now
  await computeAndCacheLeaderboard()
  const raw = await redis.get(cacheKey).catch(() => null)
  if (raw) {
    return JSON.parse(raw) as LeaderboardSnapshot
  }

  // In-memory minimal fallback if Redis is down
  const total = await prisma.attendance.count().catch(() => 0)
  return {
    entries: [],
    community_total: total,
    calculated_at: new Date().toISOString(),
  }
}
