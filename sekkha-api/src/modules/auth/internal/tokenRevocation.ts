import jwt from "jsonwebtoken"
import { redis } from "../../../lib/redis"

/**
 * In-memory fallback map for revoked tokens when Redis is offline or unavailable.
 * Key: token, Value: expiry timestamp in milliseconds
 */
const localRevokedTokens = new Map<string, number>()

// Periodic sweep to clean up expired in-memory blacklist tokens
const cleanupInterval = setInterval(() => {
  const now = Date.now()
  for (const [token, expiry] of localRevokedTokens.entries()) {
    if (expiry <= now) {
      localRevokedTokens.delete(token)
    }
  }
}, 60_000)

// Allow Node/Bun process to exit cleanly without being kept alive by the interval
if (cleanupInterval && typeof cleanupInterval.unref === "function") {
  cleanupInterval.unref()
}

/**
 * Revokes a token by marking it as terminated in Redis and in-memory fallback.
 * Uses the remaining JWT TTL (or default 24h) for key expiration.
 */
export async function revokeToken(token: string): Promise<void> {
  if (!token) return
  const cleanToken = token.trim()
  let ttlSeconds = 86400 // Default 24 hours

  try {
    const decoded = jwt.decode(cleanToken) as { exp?: number } | null
    if (decoded?.exp) {
      const remaining = decoded.exp - Math.floor(Date.now() / 1000)
      if (remaining > 0) {
        ttlSeconds = remaining
      }
    }
  } catch {
    // Keep default TTL if decoding fails
  }

  // 1. Store in memory map
  localRevokedTokens.set(cleanToken, Date.now() + ttlSeconds * 1000)

  // 2. Store in Redis blacklist if available & remove any cached session
  try {
    await redis.set(`auth:revoked:${cleanToken}`, "1", "EX", ttlSeconds)
    await redis.del(`auth:token:${cleanToken}`)
  } catch {
    // Graceful fallback if Redis is offline
  }
}

/**
 * Checks if a token has been revoked (e.g. user logged out or session terminated).
 */
export async function isTokenRevoked(token: string): Promise<boolean> {
  if (!token) return true
  const cleanToken = token.trim()

  // 1. Check in-memory map
  const localExpiry = localRevokedTokens.get(cleanToken)
  if (localExpiry) {
    if (localExpiry > Date.now()) {
      return true
    }
    localRevokedTokens.delete(cleanToken)
  }

  // 2. Check Redis blacklist
  try {
    const exists = await redis.get(`auth:revoked:${cleanToken}`)
    if (exists) {
      return true
    }
  } catch {
    // Fallback on Redis error
  }

  return false
}
