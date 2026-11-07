import { describe, it, expect } from "bun:test"
import {
  loginUser,
  refreshSession,
  logoutUser,
  verifyToken,
} from "../services"
import { authModels } from "../models"
import {
  saveRefreshToken,
} from "../internal/refreshTokenStore"
import { hashPassword } from "../../../lib/password"

const TEST_SECRET = "test-super-secret-key-that-is-at-least-32-chars-long"
process.env.JWT_SECRET = TEST_SECRET

describe("Auth Module (Non-OTP PRD Verification)", () => {
  // ── TC-AUTH-05: Login with identifier (email, username, userNumber) and password
  it("TC-AUTH-05: Login with identifier (email, username, userNumber) and password", async () => {
    const originalFind = authModels.findUserByIdentifier
    const passwordHash = await hashPassword("correctPassword123")

    authModels.findUserByIdentifier = async (ident: string) => {
      return {
        id: "usr_tc_05",
        userNumber: 2026110705n,
        email: "member@sekkha.com",
        username: "memberuser",
        password: passwordHash,
        name: "Active Member",
        role: "member",
        isClaimed: true,
        onboardingCompleted: true,
        passwordChangedAt: new Date(),
      } as any
    }

    try {
      // Case A: login with email
      const resEmail = await loginUser({
        identifier: "member@sekkha.com",
        password: "correctPassword123",
      })
      expect(resEmail.accessToken).toBeDefined()
      expect(resEmail.refreshToken).toBeDefined()
      expect(resEmail.user.email).toBe("member@sekkha.com")
      expect(resEmail.user.role).toBe("member")

      // Case B: login with username
      const resUsername = await loginUser({
        identifier: "memberuser",
        password: "correctPassword123",
      })
      expect(resUsername.accessToken).toBeDefined()
      expect(resUsername.user.username).toBe("memberuser")

      // Case C: login with 10-digit userNumber
      const resUserNum = await loginUser({
        identifier: "2026110705",
        password: "correctPassword123",
      })
      expect(resUserNum.accessToken).toBeDefined()
      expect(resUserNum.user.id).toBe("usr_tc_05")
    } finally {
      authModels.findUserByIdentifier = originalFind
    }
  })

  // ── TC-AUTH-06 & 07: Invalid password and non-existent identifier returns 401 'Invalid credentials'
  it("TC-AUTH-06 & 07: Invalid password and non-existent identifier returns 401 'Invalid credentials' and runs dummy bcrypt check", async () => {
    const originalFind = authModels.findUserByIdentifier
    const passwordHash = await hashPassword("validPassword123")

    authModels.findUserByIdentifier = async (ident: string) => {
      if (ident === "exists@sekkha.com") {
        return {
          id: "usr_exists",
          email: "exists@sekkha.com",
          username: "existsuser",
          password: passwordHash,
          name: "Existing",
          role: "member",
          onboardingCompleted: true,
        } as any
      }
      return null
    }

    try {
      // TC-AUTH-07: Non-existent identifier
      let nonExistentErr: any = null
      try {
        await loginUser({
          identifier: "nobody@sekkha.com",
          password: "somePassword123",
        })
      } catch (err: any) {
        nonExistentErr = err
      }
      expect(nonExistentErr).toBeDefined()
      expect(nonExistentErr.status).toBe(401)
      expect(nonExistentErr.code).toBe("INVALID_CREDENTIALS")
      expect(nonExistentErr.message).toBe("Invalid credentials")

      // TC-AUTH-06: Wrong password
      let wrongPwErr: any = null
      try {
        await loginUser({
          identifier: "exists@sekkha.com",
          password: "incorrectPassword",
        })
      } catch (err: any) {
        wrongPwErr = err
      }
      expect(wrongPwErr).toBeDefined()
      expect(wrongPwErr.status).toBe(401)
      expect(wrongPwErr.code).toBe("INVALID_CREDENTIALS")
      expect(wrongPwErr.message).toBe("Invalid credentials")
    } finally {
      authModels.findUserByIdentifier = originalFind
    }
  })

  // ── TC-AUTH-12 & 13: Refresh token rotation and logout revocation
  it("TC-AUTH-12 & 13: Refresh token rotation and logout revocation", async () => {
    const originalFindById = authModels.findUserById
    authModels.findUserById = async (id: string) => ({
      id,
      userNumber: 2026110799n,
      email: "refresh@sekkha.com",
      username: "refreshuser",
      name: "Refresh User",
      role: "member",
      onboardingCompleted: true,
      passwordChangedAt: null,
    } as any)

    try {
      const rawRefreshToken = "test_raw_refresh_token_tc12"
      await saveRefreshToken("usr_refresh_user", rawRefreshToken, 600)

      // 1. Rotate refresh token (TC-AUTH-12)
      const rotated = await refreshSession(rawRefreshToken)
      expect(rotated.accessToken).toBeDefined()
      expect(rotated.refreshToken).toBeDefined()
      expect(rotated.refreshToken).not.toBe(rawRefreshToken)

      // Old refresh token must be invalidated (single-use)
      let replayErr: any = null
      try {
        await refreshSession(rawRefreshToken)
      } catch (err: any) {
        replayErr = err
      }
      expect(replayErr).toBeDefined()
      expect(replayErr.status).toBe(401)
      expect(replayErr.code).toBe("INVALID_REFRESH_TOKEN")

      // 2. Logout revokes token (TC-AUTH-13)
      await logoutUser(rotated.accessToken, rotated.refreshToken)

      // Re-verifying revoked access token fails with 401
      let verifyErr: any = null
      try {
        await verifyToken(rotated.accessToken)
      } catch (err: any) {
        verifyErr = err
      }
      expect(verifyErr).toBeDefined()
      expect(verifyErr.status).toBe(401)
      expect(verifyErr.code).toBe("SESSION_REVOKED")
    } finally {
      authModels.findUserById = originalFindById
    }
  })
})
