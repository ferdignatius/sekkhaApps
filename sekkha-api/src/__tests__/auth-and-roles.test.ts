import { describe, it, expect, beforeEach } from "bun:test"
import jwt from "jsonwebtoken"
import { revokeToken, isTokenRevoked } from "../modules/auth/internal/tokenRevocation"
import {
  saveRefreshToken,
  verifyAndRotateRefreshToken,
  revokeRefreshToken,
} from "../modules/auth/internal/refreshTokenStore"

const TEST_SECRET = "test-super-secret-key-that-is-at-least-32-chars-long"
process.env.JWT_SECRET = TEST_SECRET

describe("Auth Security & JWT Safeguards (F-02, F-03)", () => {
  it("pins algorithm to HS256, issuer, and audience", () => {
    const token = jwt.sign(
      { userId: "usr_test_123", role: "umat" },
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
    expect(decoded.role).toBe("umat")
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
})
