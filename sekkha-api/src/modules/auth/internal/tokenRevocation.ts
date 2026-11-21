import crypto from "crypto"
import jwt from "jsonwebtoken"
import { canUseRedisStore } from "../../../lib/redis"
import { AppError } from "../../../lib/AppError"

/**
 * In-memory fallback map for revoked tokens when Redis is offline or unavailable (non-production).
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

function isProductionStoreRequired(): boolean {
  return process.env.NODE_ENV === "production"
}

/**
 * Revokes a verified token by marking its SHA-256 hash as terminated in Redis and in-memory fallback.
 * Uses the remaining JWT TTL (or default 24h) for key expiration.
 * In production, propagates Redis failures instead of silently succeeding.
 */
export async function revokeToken(token: string): Promise<void> {
  if (!token) return
  const cleanToken = token.trim()
  const secret = process.env.JWT_SECRET
  if (!secret) return

  let ttlSeconds = 86400 // Default 24 hours

  try {
    // Only revoke if the token has a valid signature & unexpired claims
    const verified = jwt.verify(cleanToken, secret, { algorithms: ["HS256"] }) as { exp?: number }
    if ((verified as any)?.iss && (verified as any).iss !== "sekkha-api") return
    if ((verified as any)?.aud && (verified as any).aud !== "sekkha-app") return
    if (verified?.exp) {
      const remaining = verified.exp - Math.floor(Date.now() / 1000)
      if (remaining > 0) {
        ttlSeconds = remaining
      }
    }
  } catch {
    // Expired or invalid signature: expired JWTs already fail signature/exp verification
    return
  }

  const tokenHash = hashToken(cleanToken)

  if (!isProductionStoreRequired()) {
    localRevokedTokens.set(tokenHash, Date.now() + ttlSeconds * 1000)
  }

  const useRedis = canUseRedisStore()
  if (isProductionStoreRequired() && !useRedis) {
    throw new AppError("Revocation store unavailable", 503, "REVOCATION_STORE_UNAVAILABLE")
  }

  if (useRedis) {
    try {
      await Promise.all([
        (await import("../../../lib/redis")).redis.set(`auth:revoked:${tokenHash}`, "1", "EX", ttlSeconds),
        (await import("../../../lib/redis")).redis.del(`auth:token:${tokenHash}`, `auth:session:${tokenHash}`),
      ])
    } catch (err) {
      if (isProductionStoreRequired()) {
        throw new AppError("Revocation store unavailable", 503, "REVOCATION_STORE_UNAVAILABLE")
      }
    }
  }
}

/**
 * Checks if a token has been revoked (e.g. user logged out or session terminated).
 * In production, fails closed (throws 503) if Redis cannot be queried.
 */
export async function isTokenRevoked(token: string): Promise<boolean> {
  if (!token) return true
  const cleanToken = token.trim()
  const tokenHash = hashToken(cleanToken)

  if (!isProductionStoreRequired()) {
    const localExpiry = localRevokedTokens.get(tokenHash)
    if (localExpiry) {
      if (localExpiry > Date.now()) {
        return true
      }
      localRevokedTokens.delete(tokenHash)
    }
  }

  const useRedis = canUseRedisStore()
  if (isProductionStoreRequired() && !useRedis) {
    throw new AppError("Revocation store unavailable", 503, "REVOCATION_STORE_UNAVAILABLE")
  }

  if (useRedis) {
    try {
      const { redis } = await import("../../../lib/redis")
      const exists = await redis.get(`auth:revoked:${tokenHash}`)
      if (exists) {
        return true
      }
    } catch {
      if (isProductionStoreRequired()) {
        throw new AppError("Revocation store unavailable", 503, "REVOCATION_STORE_UNAVAILABLE")
      }
    }
  }

  return false
}
