// lib/cache — Redis caching utilities with circuit-breaker fallback
// Simple get/set with TTL and cache invalidation helpers.
// F-17 Remediation: Redis failures never crash API requests

import { redis } from "./redis"

let isRedisFailing = false
let lastFailureLog = 0

function logRedisError(action: string, err: unknown) {
  const now = Date.now()
  isRedisFailing = true
  // Throttle warning log to once every 30 seconds to prevent log flood
  if (now - lastFailureLog > 30_000) {
    console.warn(`⚠️ [Cache] Redis operation failed during ${action} (falling back to direct DB fetcher):`, (err as Error)?.message || err)
    lastFailureLog = now
  }
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
  fetcher: () => Promise<T>,
): Promise<T> {
  // 1. Try cache first if Redis is healthy
  try {
    const cachedData = await redis.get(key)
    if (cachedData) {
      isRedisFailing = false
      return JSON.parse(cachedData) as T
    }
  } catch (err) {
    logRedisError(`get("${key}")`, err)
  }

  // 2. Cache miss or Redis error — fetch fresh data directly
  const data = await fetcher()

  // 3. Best-effort async write to cache
  try {
    await redis.set(key, JSON.stringify(data), "EX", ttlSeconds)
    isRedisFailing = false
  } catch (err) {
    logRedisError(`set("${key}")`, err)
  }

  return data
}

/**
 * Invalidate a single cache key safely
 */
export async function invalidate(key: string): Promise<void> {
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
          if (keysToDelete.length > 0) {
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
  events: (roleScope = "all") => `events:list:${roleScope}`,
  eventDetail: (id: string) => `events:${id}`,
  leaderboard: (metric: string, season: string) => `leaderboard:${metric}:${season}`,
  userProfile: (userId: string) => `user:${userId}:profile`,
  userBadges: (userId: string) => `user:${userId}:badges`,
  userAttendances: (userId: string) => `user:${userId}:attendances`,
  communityGoal: () => "community:goal",
} as const
