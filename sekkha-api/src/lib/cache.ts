// lib/cache — Redis caching utilities
// Simple get/set with TTL and cache invalidation helpers.

import { redis } from "./redis"

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
  // Try cache first
  const cached = await redis.get(key)
  if (cached) {
    return JSON.parse(cached) as T
  }

  // Cache miss — fetch fresh data
  const data = await fetcher()
  await redis.set(key, JSON.stringify(data), "EX", ttlSeconds)
  return data
}

/**
 * Invalidate a single cache key
 */
export async function invalidate(key: string): Promise<void> {
  await redis.del(key)
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

    await new Promise<void>((resolve, reject) => {
      stream.on("end", async () => {
        try {
          if (keysToDelete.length > 0) {
            // Delete in batches of 100
            for (let i = 0; i < keysToDelete.length; i += 100) {
              const batch = keysToDelete.slice(i, i + 100)
              await redis.del(...batch)
            }
          }
          resolve()
        } catch (err) {
          reject(err)
        }
      })
      stream.on("error", (err) => reject(err))
    })
  } catch (err) {
    console.warn("⚠️ Cache pattern invalidation error:", err)
  }
}

// ─── Common cache key builders ───────────────────────────────────────────────

export const CacheKeys = {
  events: () => "events:list",
  eventDetail: (id: string) => `events:${id}`,
  leaderboard: (metric: string, season: string) => `leaderboard:${metric}:${season}`,
  userProfile: (userId: string) => `user:${userId}:profile`,
  userBadges: (userId: string) => `user:${userId}:badges`,
  userAttendances: (userId: string) => `user:${userId}:attendances`,
  communityGoal: () => "community:goal",
} as const
