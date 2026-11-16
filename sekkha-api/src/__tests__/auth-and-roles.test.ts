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
import { z } from "zod"
import { eventbus } from "../core/eventbus"
import { generateUniqueUserNumber } from "../lib/userNumber"
import { filterAndRankLeaderboardEntries } from "../modules/leaderboard/services"
import { errorHandler } from "../middleware/errorHandler"
import { requireAuth } from "../middleware/auth"
import { prisma } from "../lib/prisma"

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
      "Daily member number generation quota (maximum 99/day) has been reached."
    )
  })

  it("filters and ranks leaderboard entries across English and Indonesian role aliases", () => {
    const sampleEntries = [
      { user_id: "u1", username: "admin_one", name: "Admin One", initials: "AO", rank: 1, value: 300, attendances_count: 5, role: "admin" },
      { user_id: "u2", username: "pengurus_two", name: "Pengurus Two", initials: "PT", rank: 2, value: 200, attendances_count: 4, role: "organizer" },
      { user_id: "u3", username: "aktivis_three", name: "Aktivis Three", initials: "AT", rank: 3, value: 150, attendances_count: 3, role: "activist" },
      { user_id: "u4", username: "umat_four", name: "Umat Four", initials: "UF", rank: 4, value: 100, attendances_count: 2, role: "member" },
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

  it("uses WIB (UTC+7) date boundary when generating userNumber", async () => {
    const wibNextDayUtc = new Date("2026-10-27T18:30:00.000Z") // 01:30 WIB on 2026-10-28
    const mockEmptyClient = {
      user: {
        findFirst: async () => null,
      },
    }
    const generated = await generateUniqueUserNumber(mockEmptyClient, wibNextDayUtc)
    expect(generated).toBe(2026102801n)
  })

  it("returns 400 on ZodError in errorHandler without logging 500 INTERNAL_ERROR", () => {
    const parsed = z.object({ title: z.string() }).safeParse({ title: 123 })
    expect(parsed.success).toBe(false)
    if (parsed.success) return

    const logged: string[] = []
    const originalError = console.error
    console.error = (...args: any[]) => {
      logged.push(args.map((a) => String(a)).join(" "))
    }

    let statusCode = 0
    let jsonBody: any = null
    const req = { header: () => "req-zod-test", path: "/api/test" } as any
    const res = {
      status(code: number) {
        statusCode = code
        return this
      },
      json(body: any) {
        jsonBody = body
        return this
      },
    } as any

    try {
      errorHandler(parsed.error, req, res, (() => { }) as any)
    } finally {
      console.error = originalError
    }

    expect(statusCode).toBe(400)
    expect(jsonBody?.status).toBe("fail")
    expect(jsonBody?.code).toBe(400)
    expect(logged.join("\n")).not.toContain("INTERNAL_ERROR")
    expect(logged.join("\n")).not.toContain('"status":500')
  })

  it("forwards DB errors in requireAuth to next(err) (500 via errorHandler) instead of returning 401", async () => {
    const origFindUnique = prisma.user.findUnique
    const dbFailure = new Error("Database connection terminated unexpectedly")
      ; (prisma.user as any).findUnique = async () => {
        throw dbFailure
      }

    const validToken = jwt.sign(
      { userId: "usr_db_err_test", role: "member" },
      TEST_SECRET,
      {
        algorithm: "HS256",
        issuer: "sekkha-api",
        audience: "sekkha-app",
        expiresIn: "15m",
      }
    )

    const makeRes = () => {
      let code = 0
      let body: any = null
      return {
        getStatus: () => code,
        getBody: () => body,
        res: {
          status(c: number) {
            code = c
            return this
          },
          json(b: any) {
            body = b
            return this
          },
        } as any,
      }
    }

    try {
      // 1. Valid JWT + Prisma failure -> passes DB error to next(err) without returning 401
      const reqDbErr = {
        headers: { authorization: `Bearer ${validToken}` },
        path: "/api/users/me",
        originalUrl: "/api/users/me",
        query: {},
        header: () => "req-db-err",
      } as any
      const resDbWrapper = makeRes()
      let capturedNextErr: any = undefined
      await requireAuth(reqDbErr, resDbWrapper.res, ((err?: any) => {
        capturedNextErr = err
      }) as any)

      expect(resDbWrapper.getStatus()).toBe(0)
      expect(capturedNextErr).toBe(dbFailure)

      // Passing forwarded DB error into errorHandler yields 500 (not 401)
      const origConsoleError = console.error
      console.error = () => { }
      const errHandlerRes = makeRes()
      try {
        errorHandler(capturedNextErr, reqDbErr, errHandlerRes.res, (() => { }) as any)
      } finally {
        console.error = origConsoleError
      }
      expect(errHandlerRes.getStatus()).toBe(500)
      expect(errHandlerRes.getBody()?.code).toBe(500)

      // 2. Invalid JWT -> returns 401 directly and does NOT call next
      const reqBadJwt = {
        headers: { authorization: "Bearer invalid.jwt.token" },
        path: "/api/users/me",
        originalUrl: "/api/users/me",
        query: {},
      } as any
      const resBadWrapper = makeRes()
      let badNextCalled = false
      await requireAuth(reqBadJwt, resBadWrapper.res, (() => {
        badNextCalled = true
      }) as any)

      expect(badNextCalled).toBe(false)
      expect(resBadWrapper.getStatus()).toBe(401)
      expect(resBadWrapper.getBody()?.code).toBe(401)
    } finally {
      ; (prisma.user as any).findUnique = origFindUnique
    }
  })
})
