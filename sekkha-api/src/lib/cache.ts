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
 * Invalidate all keys matching a pattern (e.g., "events:*")
 */
export async function invalidatePattern(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern)
  if (keys.length > 0) {
    await redis.del(...keys)
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
