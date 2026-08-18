import Redis from "ioredis"

export const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: 1,
  lazyConnect: true,
  enableOfflineQueue: false,
})

redis.on("connect", () => console.log("🔴 Redis connected"))
redis.on("error", () => {
  // Silent error handling: fallback gracefully if Redis is offline
})

