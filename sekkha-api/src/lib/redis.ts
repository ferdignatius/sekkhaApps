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

redis.on("connect", () => console.log("🔴 Redis connected"))
redis.on("error", () => {
  // Silent error handling: fallback gracefully if Redis is offline
})

