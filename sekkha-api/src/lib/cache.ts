// lib/cache — Redis caching utilities with circuit-breaker fallback
// Simple get/set with TTL and cache invalidation helpers.
// F-17 Remediation: Redis failures never crash API requests

import Redis from "ioredis"
import { redis } from "./redis"

let lastFailureLog = 0

function logRedisError(action: string, err: unknown) {
  const now = Date.now()
  // Throttle warning log to once every 30 seconds to prevent log flood
  if (now - lastFailureLog > 30_000) {
    console.warn(
      `⚠️ [Cache] Redis operation failed during ${action} (falling back to direct DB fetcher):`,
      (err as Error)?.message || err
    )
    lastFailureLog = now
  }
}

function canReadRedis(): boolean {
  return redis.status === "ready" || redis.get !== Redis.prototype.get
}

function canWriteRedis(): boolean {
  return redis.status === "ready" || redis.set !== Redis.prototype.set
}

function canDeleteRedis(): boolean {
  return redis.status === "ready" || redis.del !== Redis.prototype.del
}

function canScanRedis(): boolean {
  return redis.status === "ready" || redis.scanStream !== Redis.prototype.scanStream
}

function serializeCacheValue(data: unknown): string | undefined {
  return JSON.stringify(data, (_key, value) => {
    if (typeof value === "bigint") {
      return Number(value) <= Number.MAX_SAFE_INTEGER ? Number(value) : value.toString()
    }
    return value
  })
}

/**
 * Get cached data or fetch from source and cache it.
 * @param key - Redis key
 * @param ttlSeconds - Time-to-live in seconds
 * @param fetcher - Async function to get fresh data if cache miss
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  // 1. Try cache first if Redis is ready (or monkey-patched in tests)
  if (canReadRedis()) {
    try {
      const cachedData = await redis.get(key)
      if (cachedData) {
        return JSON.parse(cachedData) as T
      }
    } catch (err) {
      logRedisError(`get("${key}")`, err)
    }
  }

  // 2. Cache miss or Redis unavailable — fetch fresh data directly
  const data = await fetcher()

  // 3. Best-effort write to cache (never cache null or undefined)
  if (canWriteRedis() && data !== undefined && data !== null) {
    try {
      const serialized = serializeCacheValue(data)
      if (serialized !== undefined) {
        await redis.set(key, serialized, "EX", ttlSeconds)
      }
    } catch (err) {
      logRedisError(`set("${key}")`, err)
    }
  }

  return data
}

/**
 * Invalidate a single cache key safely
 */
export async function invalidate(key: string): Promise<void> {
  if (!canDeleteRedis()) return
  try {
    await redis.del(key)
  } catch (err) {
    logRedisError(`invalidate("${key}")`, err)
  }
}

/**
 * Invalidate all keys matching a pattern (e.g., "events:*") using non-blocking SCAN
 */
export async function invalidatePattern(pattern: string): Promise<void> {
  if (!canScanRedis()) return
  try {
    const stream = redis.scanStream({
      match: pattern,
      count: 100,
    })

    const keysToDelete: string[] = []

    stream.on("data", (resultKeys: string[]) => {
      for (const k of resultKeys) {
        keysToDelete.push(k)
      }
    })

    await new Promise<void>((resolve) => {
      stream.on("end", async () => {
        try {
          if (keysToDelete.length > 0 && canDeleteRedis()) {
            for (let i = 0; i < keysToDelete.length; i += 100) {
              const batch = keysToDelete.slice(i, i + 100)
              await redis.del(...batch)
            }
          }
        } catch (err) {
          logRedisError(`invalidatePattern("${pattern}") batch delete`, err)
        }
        resolve()
      })
      stream.on("error", (err) => {
        logRedisError(`invalidatePattern("${pattern}") scan stream`, err)
        resolve()
      })
    })
  } catch (err) {
    logRedisError(`invalidatePattern("${pattern}")`, err)
  }
}

// ─── Common cache key builders ───────────────────────────────────────────────

export const CacheKeys = {
  events: (roleScope = "all", queryKey = "") =>
    queryKey ? `events:list:${roleScope}:${queryKey}` : `events:list:${roleScope}`,
  eventDetail: (id: string, role = "all") => `events:detail:${id}:${role}`,
  leaderboard: (metric: string, season: string) => `leaderboard:${metric}:${season}`,
  userProfile: (userId: string) => `user:${userId}:profile`,
  userAttendances: (userId: string) => `user:${userId}:attendances`,
  userStreak: (userId: string) => `user:${userId}:streak`,
  home: (userId: string, role: string) => `user:${userId}:home:${role}`,
  communityGoal: () => "community:goal",
  configureEventTypes: (queryKey = "all") => `configure:event-types:${queryKey}`,
  configureBadgeActivities: (queryKey = "all") => `configure:badge-activities:${queryKey}`,
  configurePointRules: (queryKey = "all") => `configure:point-rules:${queryKey}`,
  configureSeasons: () => "configure:seasons",
  schoolsList: (queryKey = "all") => `schools:list:${queryKey}`,
  schoolStats: (school: string) => `schools:stats:${school.toLowerCase()}`,
  peopleDirectory: (queryKey = "all") => `people:list:${queryKey}`,
} as const
