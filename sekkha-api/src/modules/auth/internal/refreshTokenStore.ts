import crypto from "crypto"
import { canUseRedisStore, redis } from "../../../lib/redis"

export interface RefreshTokenRecord {
  userId: string
  familyId: string
  createdAt: number
  expiresAt: number
}

export interface UsedRefreshTokenRecord {
  userId: string
  familyId: string
  usedAt: number
  expiresAt: number
}

export type RefreshTokenStatus =
  | { status: "active"; record: RefreshTokenRecord }
  | { status: "reused"; used: UsedRefreshTokenRecord }
  | { status: "missing" }

const localRefreshTokens = new Map<string, RefreshTokenRecord>()
const localUsedTokens = new Map<string, UsedRefreshTokenRecord>()
const localRefreshLocks = new Map<string, { owner: string; expiresAt: number }>()
const localFamilyTokens = new Map<string, Set<string>>()

export function parseDurationToSeconds(raw: string | undefined, fallbackSeconds: number): number {
  if (!raw) return fallbackSeconds
  const match = raw.trim().match(/^(\d+)\s*(ms|[smhdw])?$/i)
  if (!match) return fallbackSeconds
  const val = parseInt(match[1], 10)
  if (isNaN(val) || val <= 0) return fallbackSeconds
  const unit = (match[2] || "s").toLowerCase()
  if (unit === "w") return val * 7 * 24 * 60 * 60
  if (unit === "d") return val * 24 * 60 * 60
  if (unit === "h") return val * 60 * 60
  if (unit === "m") return val * 60
  if (unit === "ms") return Math.max(1, Math.floor(val / 1000))
  return val
}

export function getRefreshTokenTtlSeconds(): number {
  return parseDurationToSeconds(
    process.env.REFRESH_TOKEN_EXPIRES_IN || process.env.REFRESH_TOKEN_TTL,
    7 * 24 * 60 * 60 // Default: 7 days
  )
}

// Hash-tagged keys so multi-key Lua scripts stay in the exact same Redis Cluster slot.
export function refreshRecordKey(tokenHash: string): string {
  return `{auth:refresh:${tokenHash}}`
}

export function refreshLockKey(tokenHash: string): string {
  return `{auth:refresh:${tokenHash}}:lock`
}

export function refreshUsedKey(tokenHash: string): string {
  return `{auth:refresh:${tokenHash}}:used`
}

export function userRefreshSetKey(userId: string): string {
  return `auth:user_refresh:${userId}`
}

export function familyRefreshSetKey(familyId: string): string {
  return `auth:refresh_family:${familyId}`
}

const RELEASE_LOCK_SCRIPT = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
`

const CONSUME_ACTIVE_AND_MARK_USED_SCRIPT = `
local val = redis.call('GET', KEYS[1])
if not val then
  return nil
end
redis.call('DEL', KEYS[1])
redis.call('SET', KEYS[2], ARGV[1], 'PX', tonumber(ARGV[2]))
return val
`

const REFRESH_CONSUME_SCRIPT = `
local value = redis.call('GET', KEYS[1])
if value then redis.call('DEL', KEYS[1]) end
return value
`

function requireSharedStore(): boolean {
  return process.env.NODE_ENV === "production"
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token.trim()).digest("hex")
}

function assertRedisAvailableWhenRequired(): boolean {
  const useRedis = canUseRedisStore()
  if (requireSharedStore() && !useRedis) {
    console.error(
      `⚠️ [Auth] Cannot access refresh token store in production: Redis status is "${redis.status}"`
    )
    throw new Error("Refresh token store unavailable")
  }
  return useRedis
}

function trackLocalFamilyToken(familyId: string, tokenHash: string) {
  let set = localFamilyTokens.get(familyId)
  if (!set) {
    set = new Set<string>()
    localFamilyTokens.set(familyId, set)
  }
  set.add(tokenHash)
}

function untrackLocalFamilyToken(familyId: string | undefined, tokenHash: string) {
  if (!familyId) return
  const set = localFamilyTokens.get(familyId)
  if (!set) return
  set.delete(tokenHash)
  if (set.size === 0) {
    localFamilyTokens.delete(familyId)
  }
}

/**
 * Acquires a short atomic distributed lock scoped to a specific refresh token hash
 * so concurrent refresh attempts do not race or trigger false-positive reuse detection.
 */
export async function acquireRefreshTokenLock(
  tokenHash: string,
  lockOwner: string,
  ttlMs = 5_000
): Promise<boolean> {
  const useRedis = assertRedisAvailableWhenRequired()

  if (useRedis) {
    try {
      const res = await redis.set(refreshLockKey(tokenHash), lockOwner, "PX", ttlMs, "NX")
      if (res !== "OK") return false
    } catch (err) {
      if (requireSharedStore()) {
        console.error("⚠️ [Auth] Failed to acquire refresh lock in Redis:", (err as Error)?.message || err)
        throw new Error("Refresh token store unavailable")
      }
      return false
    }
  }

  if (!requireSharedStore()) {
    const now = Date.now()
    const existing = localRefreshLocks.get(tokenHash)
    if (existing && existing.expiresAt > now) {
      if (useRedis) {
        await redis.eval(RELEASE_LOCK_SCRIPT, 1, refreshLockKey(tokenHash), lockOwner).catch(() => {})
      }
      return false
    }
    localRefreshLocks.set(tokenHash, { owner: lockOwner, expiresAt: now + ttlMs })
  }

  return true
}

/**
 * Releases the distributed per-token refresh lock only if still owned by `lockOwner`.
 */
export async function releaseRefreshTokenLock(tokenHash: string, lockOwner: string): Promise<void> {
  if (!requireSharedStore()) {
    const existing = localRefreshLocks.get(tokenHash)
    if (existing?.owner === lockOwner) {
      localRefreshLocks.delete(tokenHash)
    }
  }

  if (canUseRedisStore()) {
    try {
      await redis.eval(RELEASE_LOCK_SCRIPT, 1, refreshLockKey(tokenHash), lockOwner)
    } catch {
      // Lock has short PX expiry as safety net
    }
  }
}

/**
 * Saves a new refresh token hash in Redis (with user & family indexes) and in-memory fallback.
 */
export async function saveRefreshToken(
  userId: string,
  refreshToken: string,
  ttlSeconds: number = getRefreshTokenTtlSeconds(),
  familyId: string = crypto.randomUUID()
): Promise<string> {
  const tokenHash = hashRefreshToken(refreshToken)
  const createdAt = Date.now()
  const expiresAt = createdAt + ttlSeconds * 1000
  const record: RefreshTokenRecord = { userId, familyId, createdAt, expiresAt }

  if (!requireSharedStore()) {
    for (const [key, item] of localRefreshTokens.entries()) {
      if (item.expiresAt <= createdAt) {
        localRefreshTokens.delete(key)
        untrackLocalFamilyToken(item.familyId, key)
      }
    }
    localRefreshTokens.set(tokenHash, record)
    trackLocalFamilyToken(familyId, tokenHash)
  }

  const useRedis = assertRedisAvailableWhenRequired()
  if (useRedis) {
    try {
      await Promise.all([
        redis.set(refreshRecordKey(tokenHash), JSON.stringify(record), "EX", ttlSeconds),
        redis.sadd(userRefreshSetKey(userId), tokenHash),
        redis.expire(userRefreshSetKey(userId), ttlSeconds),
        redis.sadd(familyRefreshSetKey(familyId), tokenHash),
        redis.expire(familyRefreshSetKey(familyId), ttlSeconds),
      ])
    } catch (err) {
      if (requireSharedStore()) {
        console.error("⚠️ [Auth] Failed to save refresh token in Redis:", (err as Error)?.message || err)
        throw new Error("Refresh token store unavailable")
      }
    }
  }

  return familyId
}

/**
 * Reads refresh token state non-destructively so caller can validate DB/persistence
 * and distinguish active tokens vs confirmed reuse attacks vs missing tokens.
 */
export async function peekRefreshTokenStatus(refreshToken: string): Promise<RefreshTokenStatus> {
  if (!refreshToken) return { status: "missing" }
  const tokenHash = hashRefreshToken(refreshToken)
  const now = Date.now()
  const useRedis = assertRedisAvailableWhenRequired()

  if (useRedis) {
    try {
      const [rawActive, rawUsed] = await Promise.all([
        redis.get(refreshRecordKey(tokenHash)),
        redis.get(refreshUsedKey(tokenHash)),
      ])
      if (rawActive) {
        const parsed = JSON.parse(rawActive) as Partial<RefreshTokenRecord>
        if (parsed.userId && parsed.expiresAt && parsed.expiresAt > now) {
          return {
            status: "active",
            record: {
              userId: parsed.userId,
              familyId: parsed.familyId || "legacy-family",
              createdAt: parsed.createdAt ?? 0,
              expiresAt: parsed.expiresAt,
            },
          }
        }
      }
      if (rawUsed) {
        const parsedUsed = JSON.parse(rawUsed) as Partial<UsedRefreshTokenRecord>
        if (parsedUsed.userId && parsedUsed.expiresAt && parsedUsed.expiresAt > now) {
          return {
            status: "reused",
            used: {
              userId: parsedUsed.userId,
              familyId: parsedUsed.familyId || "legacy-family",
              usedAt: parsedUsed.usedAt ?? now,
              expiresAt: parsedUsed.expiresAt,
            },
          }
        }
      }
    } catch {
      if (requireSharedStore()) {
        throw new Error("Refresh token store unavailable")
      }
    }
  }

  if (!requireSharedStore()) {
    const active = localRefreshTokens.get(tokenHash)
    if (active) {
      if (active.expiresAt > now) {
        return { status: "active", record: active }
      }
      localRefreshTokens.delete(tokenHash)
      untrackLocalFamilyToken(active.familyId, tokenHash)
    }

    const used = localUsedTokens.get(tokenHash)
    if (used) {
      if (used.expiresAt > now) {
        return { status: "reused", used }
      }
      localUsedTokens.delete(tokenHash)
    }
  }

  return { status: "missing" }
}

/**
 * Safe rotation helper that persists the new refresh token FIRST, then atomically consumes
 * the old token and records a `:used` marker for reuse detection.
 *
 * If saving the new token fails, the old token remains untouched so the session is recoverable.
 * If consuming the old token fails (e.g. missing/already consumed), the orphan new token is rolled back.
 */
export async function commitRefreshTokenRotation(
  oldRefreshToken: string,
  newRefreshToken: string,
  oldRecord: RefreshTokenRecord,
  ttlSeconds: number = getRefreshTokenTtlSeconds()
): Promise<boolean> {
  const oldHash = hashRefreshToken(oldRefreshToken)
  const now = Date.now()
  const usedMarker: UsedRefreshTokenRecord = {
    userId: oldRecord.userId,
    familyId: oldRecord.familyId,
    usedAt: now,
    expiresAt: Math.max(oldRecord.expiresAt, now + 60_000),
  }
  const usedTtlMs = Math.max(60_000, usedMarker.expiresAt - now)

  // 1. Persist new token first — if this fails, old token is NOT yet consumed.
  await saveRefreshToken(oldRecord.userId, newRefreshToken, ttlSeconds, oldRecord.familyId)

  // 2. Atomically consume old token & write reuse-detection marker (same Cluster hash-tag).
  const useRedis = assertRedisAvailableWhenRequired()
  let consumedInRedis = false
  if (useRedis) {
    try {
      const raw = (await redis.eval(
        CONSUME_ACTIVE_AND_MARK_USED_SCRIPT,
        2,
        refreshRecordKey(oldHash),
        refreshUsedKey(oldHash),
        JSON.stringify(usedMarker),
        String(usedTtlMs)
      )) as string | null

      if (raw) {
        consumedInRedis = true
        await Promise.all([
          redis.srem(userRefreshSetKey(oldRecord.userId), oldHash),
          redis.srem(familyRefreshSetKey(oldRecord.familyId), oldHash),
        ]).catch(() => {})
      }
    } catch {
      await revokeRefreshToken(newRefreshToken, oldRecord.userId).catch(() => {})
      if (requireSharedStore()) {
        throw new Error("Refresh token store unavailable")
      }
      return false
    }
  }

  let consumedLocally = false
  if (!requireSharedStore()) {
    const existing = localRefreshTokens.get(oldHash)
    if (existing && existing.expiresAt > now) {
      localRefreshTokens.delete(oldHash)
      untrackLocalFamilyToken(existing.familyId, oldHash)
      localUsedTokens.set(oldHash, usedMarker)
      consumedLocally = true
    }
  }

  const consumed = requireSharedStore() ? consumedInRedis : consumedInRedis || consumedLocally
  if (!consumed) {
    // Old token disappeared between peek and consume — roll back orphan new token cleanly
    await revokeRefreshToken(newRefreshToken, oldRecord.userId).catch(() => {})
    return false
  }

  return true
}

/**
 * Legacy helper preserved for backwards-compatibility with direct unit tests (TC-AUTH / XF-02).
 * Atomically consumes an existing refresh token and marks it as used for reuse detection.
 */
export async function verifyAndRotateRefreshTokenRecord(
  oldRefreshToken: string
): Promise<RefreshTokenRecord | null> {
  if (!oldRefreshToken) return null
  const tokenHash = hashRefreshToken(oldRefreshToken)
  let record: RefreshTokenRecord | null = null
  const useRedis = assertRedisAvailableWhenRequired()
  const now = Date.now()

  if (useRedis) {
    try {
      const raw = (await redis.eval(
        REFRESH_CONSUME_SCRIPT,
        1,
        refreshRecordKey(tokenHash)
      )) as string | null
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<RefreshTokenRecord>
        const familyId = parsed.familyId || "legacy-family"
        if (parsed.userId) {
          await Promise.all([
            redis.srem(userRefreshSetKey(parsed.userId), tokenHash),
            redis.srem(familyRefreshSetKey(familyId), tokenHash),
          ]).catch(() => {})
        }
        if (parsed.userId && parsed.expiresAt && parsed.expiresAt > now) {
          record = {
            userId: parsed.userId,
            familyId,
            createdAt: parsed.createdAt ?? 0,
            expiresAt: parsed.expiresAt,
          }
          const usedMarker: UsedRefreshTokenRecord = {
            userId: parsed.userId,
            familyId,
            usedAt: now,
            expiresAt: parsed.expiresAt,
          }
          await redis
            .set(refreshUsedKey(tokenHash), JSON.stringify(usedMarker), "PX", Math.max(60_000, parsed.expiresAt - now))
            .catch(() => {})
        }
      }
    } catch {
      if (requireSharedStore()) throw new Error("Refresh token store unavailable")
    }
  }

  if (!requireSharedStore()) {
    const item = localRefreshTokens.get(tokenHash)
    if (item) {
      if (!record && item.expiresAt > now) {
        record = item
        localUsedTokens.set(tokenHash, {
          userId: item.userId,
          familyId: item.familyId,
          usedAt: now,
          expiresAt: item.expiresAt,
        })
      }
      localRefreshTokens.delete(tokenHash)
      untrackLocalFamilyToken(item.familyId, tokenHash)
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
 * Revokes all active refresh tokens belonging to a specific token family (device/login lineage),
 * without disturbing other healthy device sessions of the same user.
 * Uses per-key deletes to stay compatible with Redis Cluster key-slot constraints.
 */
export async function revokeTokenFamily(familyId: string, userId?: string): Promise<void> {
  if (!familyId) return

  if (!requireSharedStore()) {
    const hashes = localFamilyTokens.get(familyId)
    if (hashes) {
      for (const h of hashes) {
        localRefreshTokens.delete(h)
      }
      localFamilyTokens.delete(familyId)
    }
  }

  const useRedis = assertRedisAvailableWhenRequired()
  if (useRedis) {
    try {
      const fKey = familyRefreshSetKey(familyId)
      const tokenHashes = await redis.smembers(fKey)
      if (tokenHashes.length > 0) {
        await Promise.all([
          ...tokenHashes.map((h) => redis.del(refreshRecordKey(h))),
          ...(userId ? [redis.srem(userRefreshSetKey(userId), ...tokenHashes)] : []),
        ])
      }
      await redis.del(fKey)
    } catch (err) {
      if (requireSharedStore()) {
        console.error("⚠️ [Auth] Failed to revoke refresh token family in Redis:", (err as Error)?.message || err)
        throw new Error("Refresh token store unavailable")
      }
    }
  }
}

/**
 * Revokes all in-memory and Redis refresh tokens belonging to a user across all devices
 * (e.g., on password change, reset, or account disable).
 * Uses per-key deletes instead of multi-key cross-slot DEL so it is Redis Cluster safe.
 */
export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
  if (!userId) return

  if (!requireSharedStore()) {
    for (const [tokenHash, item] of localRefreshTokens.entries()) {
      if (item.userId === userId) {
        localRefreshTokens.delete(tokenHash)
        untrackLocalFamilyToken(item.familyId, tokenHash)
      }
    }
  }

  const useRedis = assertRedisAvailableWhenRequired()
  if (useRedis) {
    try {
      const userSetKey = userRefreshSetKey(userId)
      const tokenHashes = await redis.smembers(userSetKey)
      if (tokenHashes.length > 0) {
        const rawRecords = await Promise.all(tokenHashes.map((h) => redis.get(refreshRecordKey(h))))
        const familyIds = new Set<string>()
        for (const raw of rawRecords) {
          if (!raw) continue
          try {
            const parsed = JSON.parse(raw) as { familyId?: string }
            if (parsed.familyId) familyIds.add(parsed.familyId)
          } catch {
            // Ignore malformed JSON
          }
        }
        await Promise.all([
          ...tokenHashes.map((h) => redis.del(refreshRecordKey(h))),
          ...[...familyIds].map((fid) => redis.srem(familyRefreshSetKey(fid), ...tokenHashes)),
          redis.del(userSetKey),
        ])
      } else {
        await redis.del(userSetKey)
      }
    } catch (err) {
      if (requireSharedStore()) {
        console.error("⚠️ [Auth] Failed to revoke all user refresh tokens in Redis:", (err as Error)?.message || err)
        throw new Error("Refresh token store unavailable")
      }
    }
  }
}

/**
 * Revokes a single refresh token immediately (used on logout or rollback).
 * Recovers `userId` and `familyId` from the consumed Redis record when `userId` is absent
 * (e.g. logout when access JWT has already expired) and propagates Redis errors in production.
 */
export async function revokeRefreshToken(refreshToken: string, userId?: string): Promise<void> {
  if (!refreshToken) return
  const tokenHash = hashRefreshToken(refreshToken)

  let resolvedUserId = userId
  let resolvedFamilyId: string | undefined

  if (!requireSharedStore()) {
    const item = localRefreshTokens.get(tokenHash)
    resolvedUserId = resolvedUserId || item?.userId
    resolvedFamilyId = item?.familyId
    localRefreshTokens.delete(tokenHash)
    untrackLocalFamilyToken(resolvedFamilyId, tokenHash)
  }

  const useRedis = assertRedisAvailableWhenRequired()
  if (useRedis) {
    try {
      const raw = (await redis.eval(
        REFRESH_CONSUME_SCRIPT,
        1,
        refreshRecordKey(tokenHash)
      )) as string | null

      if (raw) {
        try {
          const parsed = JSON.parse(raw) as { userId?: string; familyId?: string }
          resolvedUserId = resolvedUserId || parsed.userId
          resolvedFamilyId = resolvedFamilyId || parsed.familyId
        } catch {
          // Ignore malformed JSON
        }
      }

      const cleanupOps: Promise<unknown>[] = []
      if (resolvedUserId) {
        cleanupOps.push(redis.srem(userRefreshSetKey(resolvedUserId), tokenHash))
      }
      if (resolvedFamilyId) {
        cleanupOps.push(redis.srem(familyRefreshSetKey(resolvedFamilyId), tokenHash))
      }
      if (cleanupOps.length > 0) {
        await Promise.all(cleanupOps)
      }
    } catch (err) {
      if (requireSharedStore()) {
        console.error("⚠️ [Auth] Failed to revoke refresh token in Redis:", (err as Error)?.message || err)
        throw new Error("Refresh token store unavailable")
      }
    }
  }
}
