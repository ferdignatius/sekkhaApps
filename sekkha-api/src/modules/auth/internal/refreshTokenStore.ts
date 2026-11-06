import crypto from "crypto"
import { redis } from "../../../lib/redis"

// Development-only fallback. Production must use shared Redis storage.
// Key: tokenHash, Value: { userId: string, createdAt: number, expiresAt: number }
export interface RefreshTokenRecord {
  userId: string
  createdAt: number
  expiresAt: number
}

const localRefreshTokens = new Map<string, RefreshTokenRecord>()

export function parseDurationToSeconds(raw: string | undefined, fallbackSeconds: number): number {
  if (!raw) return fallbackSeconds
  const match = raw.trim().match(/^(\d+)\s*([smhd])?$/i)
  if (!match) return fallbackSeconds
  const val = parseInt(match[1], 10)
  if (isNaN(val) || val <= 0) return fallbackSeconds
  const unit = (match[2] || "s").toLowerCase()
  if (unit === "d") return val * 24 * 60 * 60
  if (unit === "h") return val * 60 * 60
  if (unit === "m") return val * 60
  return val
}

export function getRefreshTokenTtlSeconds(): number {
  return parseDurationToSeconds(
    process.env.REFRESH_TOKEN_EXPIRES_IN || process.env.REFRESH_TOKEN_TTL,
    7 * 24 * 60 * 60 // Default: 7 days
  )
}

const REFRESH_CONSUME_SCRIPT = `
local value = redis.call('GET', KEYS[1])
if value then redis.call('DEL', KEYS[1]) end
return value
`

function requireSharedStore(): boolean {
  return process.env.NODE_ENV === "production"
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token.trim()).digest("hex")
}

/**
 * Saves a new refresh token hash in Redis and in-memory store.
 */
export async function saveRefreshToken(
  userId: string,
  refreshToken: string,
  ttlSeconds: number = getRefreshTokenTtlSeconds()
): Promise<void> {
  const tokenHash = hashToken(refreshToken)
  const createdAt = Date.now()
  const expiresAt = createdAt + ttlSeconds * 1000
  const record: RefreshTokenRecord = { userId, createdAt, expiresAt }

  // 1. In-memory map fallback
  if (!requireSharedStore()) {
    localRefreshTokens.set(tokenHash, record)
  }

  // 2. Redis store
  try {
    if (redis.status === "ready" || redis.status === "connect") {
      await Promise.all([
        redis.set(`auth:refresh:${tokenHash}`, JSON.stringify(record), "EX", ttlSeconds),
        redis.sadd(`auth:user_refresh:${userId}`, tokenHash),
        redis.expire(`auth:user_refresh:${userId}`, ttlSeconds),
      ])
    }
  } catch {
    if (requireSharedStore()) throw new Error("Refresh token store unavailable")
  }
}

/**
 * Verifies and atomically consumes an existing refresh token (rotation).
 * Returns the full RefreshTokenRecord if valid, or null if invalid/expired.
 */
export async function verifyAndRotateRefreshTokenRecord(
  oldRefreshToken: string
): Promise<RefreshTokenRecord | null> {
  if (!oldRefreshToken) return null
  const tokenHash = hashToken(oldRefreshToken)
  let record: RefreshTokenRecord | null = null

  // 1. Check Redis first
  try {
    if (redis.status === "ready" || redis.status === "connect") {
      const raw = (await redis.eval(
        REFRESH_CONSUME_SCRIPT,
        1,
        `auth:refresh:${tokenHash}`
      )) as string | null
      if (raw) {
        const parsed = JSON.parse(raw) as { userId: string; createdAt?: number; expiresAt: number }
        if (parsed.expiresAt > Date.now()) {
          record = {
            userId: parsed.userId,
            createdAt: parsed.createdAt ?? 0,
            expiresAt: parsed.expiresAt,
          }
        }
      }
    }
  } catch {
    if (requireSharedStore()) throw new Error("Refresh token store unavailable")
  }

  // 2. Development-only fallback
  if (!requireSharedStore()) {
    const item = localRefreshTokens.get(tokenHash)
    if (item) {
      if (!record && item.expiresAt > Date.now()) {
        record = item
      }
      localRefreshTokens.delete(tokenHash)
    }
  }

  if (!record && requireSharedStore()) return null
  return record
}

/**
 * Verifies and atomically consumes an existing refresh token (rotation).
 * Returns the userId if valid, or null if invalid/expired.
 */
export async function verifyAndRotateRefreshToken(
  oldRefreshToken: string
): Promise<string | null> {
  const record = await verifyAndRotateRefreshTokenRecord(oldRefreshToken)
  return record ? record.userId : null
}

/**
 * Revokes all in-memory and Redis refresh tokens belonging to a user (e.g. on password change/reset).
 */
export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
  if (!userId) return
  for (const [tokenHash, item] of localRefreshTokens.entries()) {
    if (item.userId === userId) {
      localRefreshTokens.delete(tokenHash)
    }
  }

  try {
    if (redis.status === "ready" || redis.status === "connect") {
      const userSetKey = `auth:user_refresh:${userId}`
      const tokenHashes = await redis.smembers(userSetKey)
      if (tokenHashes && tokenHashes.length > 0) {
        const keysToDelete = tokenHashes.map((h) => `auth:refresh:${h}`)
        await redis.del(...keysToDelete, userSetKey)
      } else {
        await redis.del(userSetKey)
      }
    }
  } catch {
    // Ignore
  }
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
}
