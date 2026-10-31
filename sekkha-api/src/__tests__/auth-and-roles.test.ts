import { describe, it, expect, beforeEach } from "bun:test"
import jwt from "jsonwebtoken"
import {
  revokeToken,
  isTokenRevoked,
  saveRefreshToken,
  verifyAndRotateRefreshToken,
  verifyAndRotateRefreshTokenRecord,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
  savePasswordResetToken,
  verifyAndConsumePasswordResetToken,
  timingSafeEqualOtpHash,
  hashOtp,
} from "../modules/auth"
import { eventbus } from "../core/eventbus"
import { generateUniqueUserNumber } from "../lib/userNumber"
import { filterAndRankLeaderboardEntries } from "../modules/leaderboard/services"

const TEST_SECRET = "test-super-secret-key-that-is-at-least-32-chars-long"
process.env.JWT_SECRET = TEST_SECRET

describe("Auth Security & JWT Safeguards (F-02, F-03)", () => {
  it("pins algorithm to HS256, issuer, and audience", () => {
    const token = jwt.sign(
      { userId: "usr_test_123", role: "member" },
      TEST_SECRET,
      {
        algorithm: "HS256",
        issuer: "sekkha-api",
        audience: "sekkha-app",
        expiresIn: "15m",
      }
    )

    const decoded = jwt.verify(token, TEST_SECRET, {
      algorithms: ["HS256"],
      issuer: "sekkha-api",
      audience: "sekkha-app",
    }) as any

    expect(decoded.userId).toBe("usr_test_123")
    expect(decoded.role).toBe("member")
    expect(decoded.iss).toBe("sekkha-api")
    expect(decoded.aud).toBe("sekkha-app")
  })

  it("rejects token signed with wrong algorithm or wrong secret", () => {
    const token = jwt.sign({ userId: "hacker" }, "wrong-secret-key-32-characters-minimum")
    expect(() => {
      jwt.verify(token, TEST_SECRET, {
        algorithms: ["HS256"],
        issuer: "sekkha-api",
        audience: "sekkha-app",
      })
    }).toThrow()
  })

  it("hashes raw token when revoking and identifies revoked token (F-03)", async () => {
    const validToken = jwt.sign(
      { userId: "usr_logout_test" },
      TEST_SECRET,
      { algorithm: "HS256", expiresIn: "1h" }
    )

    expect(await isTokenRevoked(validToken)).toBe(false)
    await revokeToken(validToken)
    expect(await isTokenRevoked(validToken)).toBe(true)
  })

  it("rejects revocation of unverified invalid tokens to prevent garbage injection", async () => {
    const fakeToken = "invalid.token.signature"
    await revokeToken(fakeToken)
    // Revocation is rejected, so unverified fake token is not stored in revocation list
    expect(await isTokenRevoked(fakeToken)).toBe(false)
  })
})

describe("Refresh Token Lifecycle & Rotation (F-23, XF-02)", () => {
  const userId = "usr_session_rotation_test"
  const refreshToken = "crypto_random_hex_sample_token_1234567890abcdef"

  it("saves and rotates refresh token atomically (single-use)", async () => {
    await saveRefreshToken(userId, refreshToken, 3600)

    // First use: successfully returns userId and consumes token
    const rotatedUserId = await verifyAndRotateRefreshToken(refreshToken)
    expect(rotatedUserId).toBe(userId)

    // Replay attack / second use: must fail because token was rotated
    const replayUserId = await verifyAndRotateRefreshToken(refreshToken)
    expect(replayUserId).toBeNull()
  })

  it("revokes refresh token on explicit logout", async () => {
    const logoutToken = "logout_test_refresh_token_abcdef"
    await saveRefreshToken("usr_logout", logoutToken, 3600)

    await revokeRefreshToken(logoutToken)
    const result = await verifyAndRotateRefreshToken(logoutToken)
    expect(result).toBeNull()
  })

  it("stores createdAt in refresh token record and revokes all user refresh tokens on password change", async () => {
    const targetUser = "usr_pwd_change_test"
    const token1 = "refresh_token_pwd_change_1"
    const before = Date.now()
    await saveRefreshToken(targetUser, token1, 3600)

    const record = await verifyAndRotateRefreshTokenRecord(token1)
    expect(record).not.toBeNull()
    expect(record?.userId).toBe(targetUser)
    expect(record?.createdAt).toBeGreaterThanOrEqual(before)

    const token2 = "refresh_token_pwd_change_2"
    await saveRefreshToken(targetUser, token2, 3600)
    await revokeAllUserRefreshTokens(targetUser)
    expect(await verifyAndRotateRefreshToken(token2)).toBeNull()
  })

  it("verifies and consumes password reset token atomically with timingSafeEqual", async () => {
    const email = "reset-test@sekkha.local"
    const resetToken = "secure_reset_token_1234567890"
    await savePasswordResetToken(email, "usr_reset_1", resetToken)

    expect(await verifyAndConsumePasswordResetToken(email, "wrong_token")).toBeNull()
    expect(await verifyAndConsumePasswordResetToken(email, resetToken)).toBe("usr_reset_1")
    // Single-use: second attempt must return null
    expect(await verifyAndConsumePasswordResetToken(email, resetToken)).toBeNull()

    const hashed = hashOtp("123456")
    expect(timingSafeEqualOtpHash(hashed, "123456")).toBe(true)
    expect(timingSafeEqualOtpHash(hashed, "654321")).toBe(false)
  })
})

describe("EventBus, UserNumber Overflow & Leaderboard Role Filtering", () => {
  it("unsubscribes handlers properly and catches synchronous throws in EventBus", () => {
    let count = 0
    const handler = () => {
      count++
    }
    const throwingHandler = () => {
      throw new Error("sync boom")
    }

    eventbus.subscribe("test.event", throwingHandler)
    eventbus.subscribe("test.event", handler)
    expect(() => eventbus.publish("test.event", { ok: true })).not.toThrow()
    expect(count).toBe(1)

    eventbus.unsubscribe("test.event", handler)
    eventbus.unsubscribe("test.event", throwingHandler)
    eventbus.publish("test.event", { ok: true })
    expect(count).toBe(1)
  })

  it("generates standard 10-digit YYYYMMDDnn userNumber and enforces 99/day cap", async () => {
    const testDate = new Date(2026, 9, 28) // 2026-10-28
    const mockClient98 = {
      user: {
        findFirst: async () => ({ userNumber: 2026102898n }),
      },
    }
    const num99 = await generateUniqueUserNumber(mockClient98, testDate)
    expect(num99).toBe(2026102899n)

    const mockClient99 = {
      user: {
        findFirst: async () => ({ userNumber: 2026102899n }),
      },
    }
    await expect(generateUniqueUserNumber(mockClient99, testDate)).rejects.toThrow(
      "Kuota pembuatan nomor anggota harian"
    )
  })

  it("filters and ranks leaderboard entries across English and Indonesian role aliases", () => {
    const sampleEntries = [
      { user_id: "u1", name: "Admin One", initials: "AO", rank: 1, value: 300, attendances_count: 5, role: "admin" },
      { user_id: "u2", name: "Pengurus Two", initials: "PT", rank: 2, value: 200, attendances_count: 4, role: "organizer" },
      { user_id: "u3", name: "Aktivis Three", initials: "AT", rank: 3, value: 150, attendances_count: 3, role: "activist" },
      { user_id: "u4", name: "Umat Four", initials: "UF", rank: 4, value: 100, attendances_count: 2, role: "member" },
    ]

    const umatOnly = filterAndRankLeaderboardEntries(sampleEntries, "umat", 10, "u4")
    expect(umatOnly.visibleEntries.map((e) => e.user_id)).toEqual(["u4"])
    expect(umatOnly.visibleEntries[0].rank).toBe(1)
    expect(umatOnly.myRank?.rank).toBe(1)

    const aktivisOnly = filterAndRankLeaderboardEntries(sampleEntries, "aktivis", 10)
    expect(aktivisOnly.visibleEntries.map((e) => e.user_id)).toEqual(["u3"])

    const pengurusAndAdmin = filterAndRankLeaderboardEntries(sampleEntries, "pengurus", 10)
    expect(pengurusAndAdmin.visibleEntries.map((e) => e.user_id)).toEqual(["u1", "u2"])

    const adminExplicit = filterAndRankLeaderboardEntries(sampleEntries, "admin", 10)
    expect(adminExplicit.visibleEntries.map((e) => e.user_id)).toEqual(["u1"])
  })
})
