import { describe, expect, it } from "bun:test"
import { EventEmitter } from "events"
import Redis from "ioredis"
import { redis } from "../../../lib/redis"
import { cached, CacheKeys } from "../../../lib/cache"
import { encrypt, safeDecrypt } from "../../../lib/crypto"
import { auditLogger } from "../../../lib/auditLogger"
import { eventbus, DomainEvents } from "../../../core/eventbus"
import { emailVerificationStore } from "../internal/emailVerificationStore"
import { passwordChangeOtpStore } from "../internal/passwordChangeOtpStore"
import { userServices } from "../services"
import { userModels } from "../models"
import { hashPassword } from "../../../lib/password"

interface SavedRedisMethods {
  status: string
  get: typeof redis.get
  set: typeof redis.set
  del: typeof redis.del
  ttl: typeof redis.ttl
  eval: typeof redis.eval
  scanStream: typeof redis.scanStream
  smembers: typeof redis.smembers
}

function createFakeRedisHarness() {
  const store = new Map<string, string>()
  const sets = new Map<string, Set<string>>()
  const attempts = new Map<string, number>()
  const ttls = new Map<string, number>()
  const ops = { gets: 0, sets: 0, dels: [] as string[], patterns: [] as string[] }

  const saved: SavedRedisMethods = {
    status: redis.status,
    get: redis.get,
    set: redis.set,
    del: redis.del,
    ttl: redis.ttl,
    eval: redis.eval,
    scanStream: redis.scanStream,
    smembers: redis.smembers,
  }

  Object.defineProperty(redis, "status", {
    value: "ready",
    writable: true,
    configurable: true,
  })
  ;(redis as any).get = async (key: string) => {
    ops.gets += 1
    return store.get(key) ?? null
  }
  ;(redis as any).set = async (key: string, value: string, _exFlag?: string, exSeconds?: number) => {
    ops.sets += 1
    store.set(key, value)
    if (typeof exSeconds === "number") {
      ttls.set(key, exSeconds)
    }
    return "OK"
  }
  ;(redis as any).del = async (...keys: string[]) => {
    let deleted = 0
    for (const k of keys) {
      ops.dels.push(k)
      if (store.delete(k)) deleted += 1
      if (sets.delete(k)) deleted += 1
      if (attempts.delete(k)) deleted += 1
      ttls.delete(k)
    }
    return deleted
  }
  ;(redis as any).smembers = async (key: string) => {
    return [...(sets.get(key) ?? [])]
  }
  ;(redis as any).ttl = async (key: string) => {
    return ttls.get(key) ?? -2
  }
  ;(redis as any).eval = async (
    _script: string,
    _numKeys: number,
    challengeKey: string,
    attemptsKey: string,
    expectedHash: string,
    maxAttemptsRaw: string
  ) => {
    const raw = store.get(challengeKey)
    if (!raw) return null
    const marker = `"otpHashed":"${expectedHash}"`
    if (raw.includes(marker)) {
      store.delete(challengeKey)
      attempts.delete(attemptsKey)
      return raw
    }
    const next = (attempts.get(attemptsKey) ?? 0) + 1
    attempts.set(attemptsKey, next)
    const maxAttempts = Number(maxAttemptsRaw)
    if (next >= maxAttempts) {
      store.delete(challengeKey)
      attempts.delete(attemptsKey)
      return "__MAX_ATTEMPTS__"
    }
    return `__MISMATCH__:${next}`
  }
  ;(redis as any).scanStream = ({ match }: { match: string }) => {
    ops.patterns.push(match)
    const regex = new RegExp(`^${match.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`)
    const matching = [...store.keys()].filter((k) => regex.test(k))
    const stream = new EventEmitter()
    queueMicrotask(() => {
      if (matching.length > 0) {
        stream.emit("data", matching)
      }
      stream.emit("end")
    })
    return stream
  }

  return {
    store,
    attempts,
    ttls,
    ops,
    restore() {
      Object.defineProperty(redis, "status", {
        value: saved.status,
        writable: true,
        configurable: true,
      })
      ;(redis as any).get = saved.get
      ;(redis as any).set = saved.set
      ;(redis as any).del = saved.del
      ;(redis as any).ttl = saved.ttl
      ;(redis as any).eval = saved.eval
      ;(redis as any).scanStream = saved.scanStream
      ;(redis as any).smembers = saved.smembers
    },
  }
}

describe("Shared Cache & Crypto Contracts (Slice 1)", () => {
  it("builds consistent CacheKeys across all domain builders", () => {
    expect(CacheKeys.events("admin", "page=1")).toBe("events:list:admin:page=1")
    expect(CacheKeys.events("member", "")).toBe("events:list:member")
    expect(CacheKeys.eventDetail("evt_1", "organizer")).toBe("events:detail:evt_1:organizer")
    expect(CacheKeys.userStreak("usr_1")).toBe("user:usr_1:streak")
    expect(CacheKeys.configureEventTypes("active")).toBe("configure:event-types:active")
    expect(CacheKeys.configureBadgeActivities()).toBe("configure:badge-activities:all")
    expect(CacheKeys.configurePointRules()).toBe("configure:point-rules:all")
    expect(CacheKeys.configureSeasons()).toBe("configure:seasons")
    expect(CacheKeys.schoolsList("all")).toBe("schools:list:all")
    expect(CacheKeys.schoolStats("SMA Sekkha")).toBe("schools:stats:sma sekkha")
    expect(CacheKeys.peopleDirectory("q=a")).toBe("people:list:q=a")
  })

  it("never caches null or undefined, supports BigInt serialization, and honors offline/monkey-patch guards", async () => {
    const savedStatus = redis.status
    const origGet = redis.get
    const origSet = redis.set

    try {
      // 1. Offline Redis without monkey-patches skips redis.get/set cleanly
      Object.defineProperty(redis, "status", { value: "wait", writable: true, configurable: true })
      let fetches = 0
      const offlineVal = await cached("test:offline", 60, async () => {
        fetches += 1
        return { ok: true }
      })
      expect(offlineVal).toEqual({ ok: true })
      expect(fetches).toBe(1)

      // 2. Monkey-patched get/set runs even when status !== "ready", but never caches null/undefined
      let setCalls = 0
      const mem = new Map<string, string>()
      ;(redis as any).get = async (k: string) => mem.get(k) ?? null
      ;(redis as any).set = async (k: string, v: string) => {
        setCalls += 1
        mem.set(k, v)
        return "OK"
      }
      expect(redis.get).not.toBe(Redis.prototype.get)

      expect(await cached("test:null", 60, async () => null)).toBeNull()
      expect(await cached("test:undef", 60, async () => undefined)).toBeUndefined()
      expect(setCalls).toBe(0)

      // 3. BigInt serializes safely (safe ints as JSON number, >MAX_SAFE_INTEGER as string)
      const withBigInt = await cached("test:bigint", 60, async () => ({
        userNumber: 2026102801n,
        huge: 9007199254740999n,
        name: "Tester",
      }))
      expect(withBigInt).toEqual({
        userNumber: 2026102801n,
        huge: 9007199254740999n,
        name: "Tester",
      })
      expect(setCalls).toBe(1)
      expect(JSON.parse(mem.get("test:bigint")!)).toEqual({
        userNumber: 2026102801,
        huge: "9007199254740999",
        name: "Tester",
      })
    } finally {
      Object.defineProperty(redis, "status", {
        value: savedStatus,
        writable: true,
        configurable: true,
      })
      ;(redis as any).get = origGet
      ;(redis as any).set = origSet
    }
  })

  it("safeDecrypt returns fallback on null/empty, corrupt ciphertexts, and hex triplets while supporting encrypted & legacy strings", () => {
    expect(safeDecrypt(null)).toBeNull()
    expect(safeDecrypt(undefined, "fb")).toBe("fb")
    expect(safeDecrypt("", "fb")).toBe("fb")
    expect(safeDecrypt("aabbccdd0011223344556677:00112233445566778899aabbccddeeff:deadbeef", "fb")).toBe(
      "fb"
    )
    expect(safeDecrypt("deadbeef:cafe:1234", "fb")).toBe("fb")
    expect(safeDecrypt("legacy@gmail.com")).toBe("legacy@gmail.com")

    const cipher = encrypt("member@gmail.com")
    expect(cipher).toBeTruthy()
    expect(safeDecrypt(cipher)).toBe("member@gmail.com")
  })
})

describe("Users OTP Stores (Atomic Lua, Fallback Cleanup & Production Shared Store Guard)", () => {
  it("throws 503 SHARED_STORE_UNAVAILABLE in production when Redis is not ready", async () => {
    const prevEnv = process.env.NODE_ENV
    const prevStatus = redis.status
    try {
      process.env.NODE_ENV = "production"
      Object.defineProperty(redis, "status", { value: "connect", writable: true, configurable: true })

      await expect(emailVerificationStore.getCooldownRemaining("usr_prod")).rejects.toMatchObject({
        status: 503,
        code: "SHARED_STORE_UNAVAILABLE",
      })
      await expect(emailVerificationStore.saveChallenge("usr_prod", "a@gmail.com", "123456")).rejects.toMatchObject({
        status: 503,
        code: "SHARED_STORE_UNAVAILABLE",
      })
      await expect(emailVerificationStore.verifyAndConsume("usr_prod", "123456")).rejects.toMatchObject({
        status: 503,
        code: "SHARED_STORE_UNAVAILABLE",
      })

      await expect(passwordChangeOtpStore.getCooldownRemaining("usr_prod")).rejects.toMatchObject({
        status: 503,
        code: "SHARED_STORE_UNAVAILABLE",
      })
      await expect(passwordChangeOtpStore.saveChallenge("usr_prod", "123456")).rejects.toMatchObject({
        status: 503,
        code: "SHARED_STORE_UNAVAILABLE",
      })
      await expect(passwordChangeOtpStore.verifyAndConsume("usr_prod", "123456")).rejects.toMatchObject({
        status: 503,
        code: "SHARED_STORE_UNAVAILABLE",
      })
    } finally {
      process.env.NODE_ENV = prevEnv
      Object.defineProperty(redis, "status", {
        value: prevStatus,
        writable: true,
        configurable: true,
      })
    }
  })

  it("consumes in-memory OTP atomically once and cancels after 5 failed attempts", async () => {
    const prevStatus = redis.status
    try {
      Object.defineProperty(redis, "status", { value: "wait", writable: true, configurable: true })

      await emailVerificationStore.saveChallenge("usr_mem_email", "user@gmail.com", "654321")
      expect(await emailVerificationStore.getPendingEmail("usr_mem_email")).toBe("user@gmail.com")
      expect(await emailVerificationStore.getCooldownRemaining("usr_mem_email")).toBeGreaterThan(0)

      // 4 mismatches then 5th cancels challenge
      for (let i = 1; i <= 4; i++) {
        const res = await emailVerificationStore.verifyAndConsume("usr_mem_email", "000000")
        expect(res.success).toBe(false)
        expect(res.remainingAttempts).toBe(5 - i)
      }
      const fifth = await emailVerificationStore.verifyAndConsume("usr_mem_email", "000000")
      expect(fifth.success).toBe(false)
      expect(fifth.remainingAttempts).toBe(0)
      expect(await emailVerificationStore.getPendingEmail("usr_mem_email")).toBeNull()

      // Concurrent consume on valid OTP only succeeds once
      await passwordChangeOtpStore.saveChallenge("usr_mem_pw", "112233")
      const [firstConsume, secondConsume] = await Promise.all([
        passwordChangeOtpStore.verifyAndConsume("usr_mem_pw", "112233"),
        passwordChangeOtpStore.verifyAndConsume("usr_mem_pw", "112233"),
      ])
      expect([firstConsume.success, secondConsume.success].filter(Boolean)).toHaveLength(1)
    } finally {
      await emailVerificationStore.clearChallenge("usr_mem_email")
      await passwordChangeOtpStore.clearChallenge("usr_mem_pw")
      Object.defineProperty(redis, "status", {
        value: prevStatus,
        writable: true,
        configurable: true,
      })
    }
  })

  it("clears stale memory maps when Redis is ready, uses Lua verifyAndConsume, and never falls back to memory", async () => {
    const prevStatus = redis.status
    const harness = createFakeRedisHarness()
    try {
      // Seed memory while Redis is offline
      Object.defineProperty(redis, "status", { value: "wait", writable: true, configurable: true })
      await emailVerificationStore.saveChallenge("usr_stale", "old@gmail.com", "111111")

      // Bring Redis ready
      Object.defineProperty(redis, "status", { value: "ready", writable: true, configurable: true })
      await emailVerificationStore.saveChallenge("usr_stale", "new@gmail.com", "222222")

      // Switching back offline proves memory was cleared upon Redis save
      Object.defineProperty(redis, "status", { value: "wait", writable: true, configurable: true })
      expect(await emailVerificationStore.getPendingEmail("usr_stale")).toBeNull()

      // Ready again: verify wrong then right via Lua
      Object.defineProperty(redis, "status", { value: "ready", writable: true, configurable: true })
      const bad = await emailVerificationStore.verifyAndConsume("usr_stale", "999999")
      expect(bad.success).toBe(false)
      expect(bad.remainingAttempts).toBe(4)

      const good = await emailVerificationStore.verifyAndConsume("usr_stale", "222222")
      expect(good).toEqual({ success: true, newEmail: "new@gmail.com" })

      // Re-using consumed OTP returns expired/missing without checking memory
      const replay = await emailVerificationStore.verifyAndConsume("usr_stale", "222222")
      expect(replay.success).toBe(false)
    } finally {
      harness.restore()
      Object.defineProperty(redis, "status", {
        value: prevStatus,
        writable: true,
        configurable: true,
      })
      await emailVerificationStore.clearChallenge("usr_stale")
    }
  })
})

describe("userServices Caching, Rollback, Audit & EventBus", () => {
  it("getProfile coerces cached string userNumber to BigInt and invalidates cache on lazy backfill", async () => {
    const harness = createFakeRedisHarness()
    const origFind = userModels.findUserWithProfileAndStats
    const origGen = userModels.generateUserNumber
    const origUpdate = userModels.updateUser

    try {
      // Cached profile payload returning serialized string userNumber
      harness.store.set(
        CacheKeys.userProfile("usr_cached"),
        JSON.stringify({
          id: "usr_cached",
          userNumber: "2026102805",
          username: "cached_user",
          email: null,
          role: "member",
          isClaimed: false,
          onboardingCompleted: true,
          createdAt: "2026-10-28T00:00:00.000Z",
          profile: { name: "Cached User", schoolId: null, school: null },
          stats: { points: 10, currentStreak: 2, totalAttendances: 1 },
        })
      )
      const cachedProfile = await userServices.getProfile("usr_cached")
      expect(cachedProfile?.user_number).toBe(2026102805)

      // Lazy userNumber backfill triggers cache invalidation
      userModels.findUserWithProfileAndStats = (async () => ({
        id: "usr_backfill",
        userNumber: null,
        username: "backfill_user",
        email: null,
        emailVerifiedAt: null,
        role: "member",
        isClaimed: false,
        onboardingCompleted: false,
        createdAt: new Date("2026-10-28T00:00:00.000Z"),
        profile: { name: "Backfill User", schoolId: null, school: null },
        stats: { points: 0, currentStreak: 0, totalAttendances: 0 },
      })) as any
      userModels.generateUserNumber = (async () => 2026102807n) as any
      userModels.updateUser = (async () => ({ id: "usr_backfill", userNumber: 2026102807n })) as any

      const backfilled = await userServices.getProfile("usr_backfill")
      expect(backfilled?.user_number).toBe(2026102807)
      expect(harness.ops.dels).toContain(CacheKeys.userProfile("usr_backfill"))
    } finally {
      userModels.findUserWithProfileAndStats = origFind
      userModels.generateUserNumber = origGen
      userModels.updateUser = origUpdate
      harness.restore()
    }
  })

  it("getStreak caches results under CacheKeys.userStreak and skips repeat DB hits", async () => {
    const harness = createFakeRedisHarness()
    const origAtt = userModels.findUserAttendancesForStreak
    const origClosed = userModels.findClosedEventDates
    let dbCalls = 0

    try {
      userModels.findUserAttendancesForStreak = (async () => {
        dbCalls += 1
        return [{ scannedAt: new Date("2026-10-25T10:00:00.000Z") }]
      }) as any
      userModels.findClosedEventDates = (async () => [
        { eventDate: new Date("2026-10-25T10:00:00.000Z") },
      ]) as any

      const first = await userServices.getStreak("usr_streak_1")
      const second = await userServices.getStreak("usr_streak_1")
      expect(first).toEqual(second)
      expect(dbCalls).toBe(1)
      expect(harness.store.has(CacheKeys.userStreak("usr_streak_1"))).toBe(true)
    } finally {
      userModels.findUserAttendancesForStreak = origAtt
      userModels.findClosedEventDates = origClosed
      harness.restore()
    }
  })

  it("rolls back OTP challenge & cooldown and throws 503 EMAIL_SEND_FAILED when SMTP fails in production", async () => {
    const harness = createFakeRedisHarness()
    const prevEnv = process.env.NODE_ENV
    const prevSmtpUser = process.env.SMTP_USER
    const prevSmtpPass = process.env.SMTP_PASS
    const origFindBindex = userModels.findUserByEmailBindex
    const origFindProfile = userModels.findUserWithProfileAndStats
    const origFindById = userModels.findUserById

    try {
      process.env.NODE_ENV = "production"
      process.env.SMTP_USER = ""
      process.env.SMTP_PASS = ""

      userModels.findUserByEmailBindex = (async () => null) as any
      userModels.findUserWithProfileAndStats = (async () => ({
        id: "usr_mail_fail",
        username: "mailuser",
        email: encrypt("mailuser@gmail.com"),
        profile: { name: "Mail User" },
      })) as any
      userModels.findUserById = (async () => ({
        id: "usr_mail_fail",
        username: "mailuser",
        password: "hashed_password",
        email: encrypt("mailuser@gmail.com"),
        passwordChangedByUser: true,
      })) as any

      await expect(
        userServices.requestEmailVerification("usr_mail_fail", "mailuser@gmail.com")
      ).rejects.toMatchObject({ status: 503, code: "EMAIL_SEND_FAILED" })

      expect(await emailVerificationStore.getPendingEmail("usr_mail_fail")).toBeNull()
      expect(await emailVerificationStore.getCooldownRemaining("usr_mail_fail")).toBe(0)

      await expect(
        userServices.requestChangePasswordOtp("usr_mail_fail")
      ).rejects.toMatchObject({ status: 503, code: "EMAIL_SEND_FAILED" })

      expect(await passwordChangeOtpStore.getCooldownRemaining("usr_mail_fail")).toBe(0)
    } finally {
      process.env.NODE_ENV = prevEnv
      process.env.SMTP_USER = prevSmtpUser
      process.env.SMTP_PASS = prevSmtpPass
      userModels.findUserByEmailBindex = origFindBindex
      userModels.findUserWithProfileAndStats = origFindProfile
      userModels.findUserById = origFindById
      harness.restore()
    }
  })

  it("invalidates derived caches, records audit logs, and publishes USER_UPDATED / USER_DELETED events", async () => {
    const harness = createFakeRedisHarness()
    const origFindProfile = userModels.findUserWithProfileAndStats
    const origFindByUsername = userModels.findUserByUsername
    const origUpdateProfile = userModels.updateUserAndProfile
    const origFindById = userModels.findUserById
    const origUpdateUser = userModels.updateUser
    const origDeleteUser = userModels.deleteUserById
    const origAuditLog = auditLogger.log

    const auditActions: string[] = []
    const publishedEvents: Array<{ event: string; payload: any }> = []
    const onUpdated = (p: any) => {
      publishedEvents.push({ event: DomainEvents.USER_UPDATED, payload: p })
    }
    const onDeleted = (p: any) => {
      publishedEvents.push({ event: DomainEvents.USER_DELETED, payload: p })
    }
    eventbus.subscribe(DomainEvents.USER_UPDATED, onUpdated)
    eventbus.subscribe(DomainEvents.USER_DELETED, onDeleted)

    try {
      const pwHash = await hashPassword("OldPass123!")
      auditLogger.log = (entry) => {
        auditActions.push(entry.action)
      }
      userModels.findUserWithProfileAndStats = (async () => ({
        id: "usr_evt_1",
        userNumber: 2026102810n,
        username: "oldname",
        email: null,
        emailVerifiedAt: null,
        role: "member",
        isClaimed: false,
        onboardingCompleted: true,
        createdAt: new Date("2026-10-28T00:00:00.000Z"),
        profile: { name: "Old Name", schoolId: null, school: null },
        stats: { points: 0, currentStreak: 0, totalAttendances: 0 },
      })) as any
      userModels.findUserByUsername = (async () => null) as any
      userModels.updateUserAndProfile = (async () => ({})) as any
      userModels.findUserById = (async () => ({
        id: "usr_evt_1",
        username: "oldname",
        role: "member",
        email: null,
        password: pwHash,
        passwordChangedByUser: false,
        isClaimed: false,
      })) as any
      userModels.updateUser = (async () => ({})) as any
      userModels.deleteUserById = (async () => ({})) as any

      harness.store.set("user:usr_evt_1:home:dashboard", '{"ok":true}')
      harness.store.set("leaderboard:current", '{"entries":[]}')
      harness.store.set("people:list:all", '{"items":[]}')

      await userServices.updateProfile("usr_evt_1", { name: "New Name" })
      expect(harness.store.has("user:usr_evt_1:home:dashboard")).toBe(false)
      expect(harness.store.has("leaderboard:current")).toBe(false)
      expect(harness.store.has("people:list:all")).toBe(false)
      expect(harness.ops.patterns).toContain("user:usr_evt_1:home:*")
      expect(harness.ops.patterns).toContain("leaderboard:*")
      expect(harness.ops.patterns).toContain("pengurus:insight:*")
      expect(harness.ops.patterns).toContain("schools:stats:*")
      expect(harness.ops.patterns).toContain("schools:list:*")
      expect(harness.ops.patterns).toContain("people:list:*")
      expect(harness.ops.dels).toContain(CacheKeys.userStreak("usr_evt_1"))

      const origCompleteOnboarding = userModels.completeOnboarding
      const origFindBindex = userModels.findUserByEmailBindex
      const origUpdateEmail = userModels.updateUserEmail
      try {
        userModels.completeOnboarding = (async () => ({})) as any
        userModels.findUserByEmailBindex = (async () => null) as any
        userModels.updateUserEmail = (async () => ({ id: "usr_evt_1", isClaimed: true })) as any

        await userServices.completeOnboarding("usr_evt_1", false)
        await emailVerificationStore.saveChallenge("usr_evt_1", "verified@gmail.com", "334455")
        const verified = await userServices.confirmEmailVerification("usr_evt_1", "334455")
        expect(verified).toEqual({
          email: "verified@gmail.com",
          email_verified: true,
          is_claimed: true,
        })
        expect(auditActions).toContain("SYSTEM_SECURITY_ALERT")
      } finally {
        userModels.completeOnboarding = origCompleteOnboarding
        userModels.findUserByEmailBindex = origFindBindex
        userModels.updateUserEmail = origUpdateEmail
      }

      await userServices.changePassword("usr_evt_1", "OldPass123!", "NewPass123!")
      expect(auditActions).toContain("AUTH_PASSWORD_CHANGED")

      const delResult = await userServices.deleteAccount("usr_evt_1", "OldPass123!")
      expect(delResult.message).toBe(
        "Your account and all personal data have been permanently deleted."
      )
      expect(auditActions).toContain("USER_DELETED")
      expect(harness.ops.dels).toContain("auth:user_refresh:usr_evt_1")
      expect(harness.ops.dels.some((k) => k.startsWith("auth:token:"))).toBe(false)

      await new Promise((r) => setTimeout(r, 15))
      expect(publishedEvents.some((e) => e.event === DomainEvents.USER_UPDATED)).toBe(true)
      expect(publishedEvents.some((e) => e.event === DomainEvents.USER_DELETED)).toBe(true)
    } finally {
      eventbus.unsubscribe(DomainEvents.USER_UPDATED, onUpdated)
      eventbus.unsubscribe(DomainEvents.USER_DELETED, onDeleted)
      userModels.findUserWithProfileAndStats = origFindProfile
      userModels.findUserByUsername = origFindByUsername
      userModels.updateUserAndProfile = origUpdateProfile
      userModels.findUserById = origFindById
      userModels.updateUser = origUpdateUser
      userModels.deleteUserById = origDeleteUser
      auditLogger.log = origAuditLog
      harness.restore()
    }
  })
})
