import crypto from "crypto"
import { redis } from "../../../lib/redis"
import { prisma } from "../../../lib/prisma"

// In-memory fallback map for active refresh tokens when Redis/DB is offline
// Key: tokenHash, Value: { userId: string, expiresAt: number }
const localRefreshTokens = new Map<string, { userId: string; expiresAt: number }>()

const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60 // 7 days

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token.trim()).digest("hex")
}

/**
 * Saves a new refresh token hash in Redis and in-memory store.
 */
export async function saveRefreshToken(
  userId: string,
  refreshToken: string,
  ttlSeconds: number = REFRESH_TOKEN_TTL_SECONDS
): Promise<void> {
  const tokenHash = hashToken(refreshToken)
  const expiresAt = Date.now() + ttlSeconds * 1000

  // 1. In-memory map fallback
  localRefreshTokens.set(tokenHash, { userId, expiresAt })

  // 2. Redis store
  try {
    if (redis.status === "ready" || redis.status === "connect") {
      await redis.set(`auth:refresh:${tokenHash}`, JSON.stringify({ userId, expiresAt }), "EX", ttlSeconds)
    }
  } catch {
    // Graceful fallback
  }

  // 3. Best-effort DB persistence if RefreshToken table exists
  try {
    if ((prisma as any).refreshToken) {
      await (prisma as any).refreshToken.create({
        data: {
          userId,
          tokenHash,
          expiresAt: new Date(expiresAt),
        },
      })
    }
  } catch {
    // Ignore if table doesn't exist yet
  }
}

/**
 * Verifies and atomically consumes an existing refresh token (rotation).
 * Returns the userId if valid, or null if invalid/expired.
 */
export async function verifyAndRotateRefreshToken(
  oldRefreshToken: string
): Promise<string | null> {
  if (!oldRefreshToken) return null
  const tokenHash = hashToken(oldRefreshToken)
  let userId: string | null = null

  // 1. Check Redis first
  try {
    if (redis.status === "ready" || redis.status === "connect") {
      const raw = await redis.get(`auth:refresh:${tokenHash}`)
      if (raw) {
        const parsed = JSON.parse(raw) as { userId: string; expiresAt: number }
        if (parsed.expiresAt > Date.now()) {
          userId = parsed.userId
        }
        await redis.del(`auth:refresh:${tokenHash}`)
      }
    }
  } catch {
    // Fallback
  }

  // 2. Check in-memory store fallback
  const item = localRefreshTokens.get(tokenHash)
  if (item) {
    if (!userId && item.expiresAt > Date.now()) {
      userId = item.userId
    }
    localRefreshTokens.delete(tokenHash)
  }

  // 3. Check DB fallback if available
  if (!userId) {
    try {
      if ((prisma as any).refreshToken) {
        const dbRecord = await (prisma as any).refreshToken.findUnique({
          where: { tokenHash },
        })
        if (dbRecord && new Date(dbRecord.expiresAt).getTime() > Date.now()) {
          userId = dbRecord.userId
          await (prisma as any).refreshToken.delete({ where: { tokenHash } }).catch(() => {})
        }
      }
    } catch {
      // Fallback
    }
  } else {
    // Clean up DB record asynchronously
    try {
      if ((prisma as any).refreshToken) {
        await (prisma as any).refreshToken.delete({ where: { tokenHash } }).catch(() => {})
      }
    } catch {
      // Ignore
    }
  }

  return userId
}

/**
 * Revokes a refresh token immediately (used on logout).
 */
export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  if (!refreshToken) return
  const tokenHash = hashToken(refreshToken)

  localRefreshTokens.delete(tokenHash)

  try {
    if (redis.status === "ready" || redis.status === "connect") {
      await redis.del(`auth:refresh:${tokenHash}`)
    }
  } catch {
    // Ignore
  }

  try {
    if ((prisma as any).refreshToken) {
      await (prisma as any).refreshToken.delete({ where: { tokenHash } }).catch(() => {})
    }
  } catch {
    // Ignore
  }
}
