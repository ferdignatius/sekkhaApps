import crypto from "crypto"
import jwt from "jsonwebtoken"
import { redis } from "../../../lib/redis"

/**
 * In-memory fallback map for revoked tokens when Redis is offline or unavailable.
 * Key: sha256(token), Value: expiry timestamp in milliseconds
 */
const localRevokedTokens = new Map<string, number>()

// Periodic sweep to clean up expired in-memory blacklist tokens
const cleanupInterval = setInterval(() => {
  const now = Date.now()
  for (const [tokenHash, expiry] of localRevokedTokens.entries()) {
    if (expiry <= now) {
      localRevokedTokens.delete(tokenHash)
    }
  }
}, 60_000)

if (cleanupInterval && typeof cleanupInterval.unref === "function") {
  cleanupInterval.unref()
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token.trim()).digest("hex")
}

/**
 * Revokes a verified token by marking its SHA-256 hash as terminated in Redis and in-memory fallback.
 * Uses the remaining JWT TTL (or default 24h) for key expiration.
 * F-03 Remediation: Hashes token, prevents raw bearer token leakage, validates signature.
 */
export async function revokeToken(token: string): Promise<void> {
  if (!token) return
  const cleanToken = token.trim()
  const secret = process.env.JWT_SECRET
  if (!secret) return

  let ttlSeconds = 86400 // Default 24 hours

  try {
    // Only revoke if the token has a valid signature
    const verified = jwt.verify(cleanToken, secret, { algorithms: ["HS256"] }) as { exp?: number }
    if (verified?.exp) {
      const remaining = verified.exp - Math.floor(Date.now() / 1000)
      if (remaining > 0) {
        ttlSeconds = remaining
      }
    }
  } catch {
    // If token signature is invalid, reject revocation to prevent garbage injection
    return
  }

  const tokenHash = hashToken(cleanToken)

  // 1. Store in memory map
  localRevokedTokens.set(tokenHash, Date.now() + ttlSeconds * 1000)

  // 2. Store in Redis blacklist if available & remove any cached session
  try {
    await redis.set(`auth:revoked:${tokenHash}`, "1", "EX", ttlSeconds)
    await redis.del(`auth:token:${tokenHash}`)
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
  const tokenHash = hashToken(cleanToken)

  // 1. Check in-memory map
  const localExpiry = localRevokedTokens.get(tokenHash)
  if (localExpiry) {
    if (localExpiry > Date.now()) {
      return true
    }
    localRevokedTokens.delete(tokenHash)
  }

  // 2. Check Redis blacklist
  try {
    const exists = await redis.get(`auth:revoked:${tokenHash}`)
    if (exists) {
      return true
    }
  } catch {
    // Fallback on Redis error
  }

  return false
}
