import Redis from "ioredis"

export const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: 1,
  enableOfflineQueue: true,
  retryStrategy(times) {
    if (times > 5) {
      return null // stop retrying after 5 attempts if Redis is offline
    }
    return Math.min(times * 200, 1000)
  },
})

/**
 * Checks whether the Redis connection is currently usable using ioredis status & queue config.
 */
export function isRedisReady(): boolean {
  return redis.status === "ready"
}

/**
 * Centralized Redis readiness check for distributed auth stores.
 * Allows queued commands while connecting/reconnecting only when strict shared storage is required
 * and offline queuing is enabled on the Redis client.
 */
export function canUseRedisStore(allowOfflineQueue = process.env.NODE_ENV === "production"): boolean {
  if (redis.status === "ready") {
    return true
  }
  if (!allowOfflineQueue) {
    return false
  }
  const offlineQueueEnabled = (redis as { options?: { enableOfflineQueue?: boolean } }).options?.enableOfflineQueue !== false
  return offlineQueueEnabled && (redis.status === "connecting" || redis.status === "reconnecting")
}

let lastRedisErrorLog = 0

redis.on("connect", () => console.log("🔴 Redis connected"))
redis.on("error", (err) => {
  if (process.env.NODE_ENV === "test") return
  const now = Date.now()
  if (now - lastRedisErrorLog > 30_000) {
    lastRedisErrorLog = now
    console.warn("⚠️ [Redis] Connection error (falling back gracefully):", (err as Error)?.message || err)
  }
})
