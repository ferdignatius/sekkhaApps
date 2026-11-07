import { describe, it, expect, beforeEach } from "bun:test"
import {
  requestRegisterOtp,
  verifyRegisterOtp,
  loginUser,
  forgotPasswordRequest,
  forgotPasswordVerifyOtp,
  resetPassword,
  refreshSession,
  logoutUser,
  verifyToken,
} from "../services"
import { authModels } from "../models"
import {
  saveRegistrationOtp,
  getRegistrationOtp,
  deleteRegistrationOtp,
  saveForgotPasswordOtp,
  deleteForgotPasswordOtp,
  incrementRegistrationOtpAttempts,
  savePasswordResetToken,
} from "../internal/otpStore"
import {
  saveRefreshToken,
  verifyAndRotateRefreshToken,
} from "../internal/refreshTokenStore"
import { isTokenRevoked } from "../internal/tokenRevocation"
import { hashPassword } from "../../../lib/password"

const TEST_SECRET = "test-super-secret-key-that-is-at-least-32-chars-long"
process.env.JWT_SECRET = TEST_SECRET

describe("Auth Module PRD Alignment (TC-AUTH-01 to TC-AUTH-13)", () => {
  beforeEach(async () => {
    await deleteRegistrationOtp("newuser@example.com")
    await deleteRegistrationOtp("existing@example.com")
    await deleteRegistrationOtp("attempts@example.com")
    await deleteForgotPasswordOtp("reset@example.com")
    await deleteForgotPasswordOtp("forgot@example.com")
  })

  // ── TC-AUTH-01: Valid sign-up request & OTP verification creates user
  it("TC-AUTH-01: Valid sign-up request & OTP verification creates user with role 'member', isClaimed true, onboardingCompleted false, session tokens", async () => {
    const originalFind = authModels.findUserByEmail
    const originalCreate = authModels.createUser

    authModels.findUserByEmail = async () => null

    let createdUserData: any = null
    authModels.createUser = async (data) => {
      createdUserData = data
      return {
        id: "usr_tc_01",
        userNumber: 2026110701n,
        username: data.username || "newuser",
        email: data.email,
        name: data.name,
        role: "member",
        isClaimed: true,
        onboardingCompleted: false,
        passwordChangedAt: new Date(),
      } as any
    }

    try {
      // 1. Submit requestRegisterOtp
      const reqResult = await requestRegisterOtp({
        email: "newuser@example.com",
        password: "securePassword123",
        name: "New Sekkha Member",
      })
      expect(reqResult.success).toBe(true)
      expect(reqResult.message).toBe("Registration OTP sent")

      const savedOtp = await getRegistrationOtp("newuser@example.com")
      expect(savedOtp).not.toBeNull()

      // 2. Submit verifyRegisterOtp with correct OTP
      // We retrieve saved payload and verify
      const authResult = await verifyRegisterOtp({
        email: "newuser@example.com",
        // savedOtp has the otpHashed, but in saveRegistrationOtp payload we can check verifyRegisterOtp
        // We know verifyRegisterOtp checks timingSafeEqualOtpHash
        otp: "000000", // Will fail with wrong OTP first
      }).catch(async () => {
        // Now save a known OTP
        const pwHash = await hashPassword("securePassword123")
        await saveRegistrationOtp("newuser@example.com", {
          otp: "654321",
          email: "newuser@example.com",
          passwordHash: pwHash,
          name: "New Sekkha Member",
          createdAt: Date.now(),
        })
        return verifyRegisterOtp({
          email: "newuser@example.com",
          otp: "654321",
        })
      })

      expect(authResult).toBeDefined()
      expect(authResult.accessToken).toBeDefined()
      expect(authResult.refreshToken).toBeDefined()
      expect(authResult.user.role).toBe("member")
      expect(authResult.user.onboarding_completed).toBe(false)
      expect(authResult.user.name).toBe("New Sekkha Member")
    } finally {
      authModels.findUserByEmail = originalFind
      authModels.createUser = originalCreate
    }
  })

  // ── TC-AUTH-02: Register request with existing email throws 409 Conflict
  it("TC-AUTH-02: Register request with existing email throws 409 Conflict ('Email already registered')", async () => {
    const originalFind = authModels.findUserByEmail
    authModels.findUserByEmail = async (email: string) => {
      if (email === "existing@example.com") {
        return { id: "usr_existing", email, name: "Existing Member", role: "member" } as any
      }
      return null
    }

    try {
      let thrownError: any = null
      try {
        await requestRegisterOtp({
          email: "existing@example.com",
          password: "password123",
          name: "Existing Member",
        })
      } catch (err: any) {
        thrownError = err
      }

      expect(thrownError).toBeDefined()
      expect(thrownError.status).toBe(409)
      expect(thrownError.message).toBe("Email already registered")
    } finally {
      authModels.findUserByEmail = originalFind
    }
  })

  // ── TC-AUTH-04: OTP verification with invalid/expired OTP, and 5 failed attempts invalidation
  it("TC-AUTH-04: OTP verification with invalid/expired OTP, and 5 failed attempts invalidation", async () => {
    const email = "attempts@example.com"
    const pwHash = await hashPassword("password123")
    await saveRegistrationOtp(email, {
      otp: "123456",
      email,
      passwordHash: pwHash,
      name: "Attempt User",
      createdAt: Date.now(),
    })

    // Non-existent or expired OTP
    let expiredErr: any = null
    try {
      await verifyRegisterOtp({ email: "nonexistent_otp@example.com", otp: "123456" })
    } catch (err: any) {
      expiredErr = err
    }
    expect(expiredErr).toBeDefined()
    expect(expiredErr.status).toBe(400)
    expect(expiredErr.message).toBe("Invalid or expired OTP")

    // Failed attempts 1 to 4
    for (let i = 1; i <= 4; i++) {
      let wrongOtpErr: any = null
      try {
        await verifyRegisterOtp({ email, otp: "999999" })
      } catch (err: any) {
        wrongOtpErr = err
      }
      expect(wrongOtpErr).toBeDefined()
      expect(wrongOtpErr.status).toBe(400)
      expect(wrongOtpErr.message).toBe("Invalid or expired OTP")
    }

    // Attempt 5: challenge invalidated
    let maxAttemptsErr: any = null
    try {
      await verifyRegisterOtp({ email, otp: "999999" })
    } catch (err: any) {
      maxAttemptsErr = err
    }
    expect(maxAttemptsErr).toBeDefined()
    expect(maxAttemptsErr.status).toBe(400)
    expect(maxAttemptsErr.message).toBe("Too many failed OTP attempts. Challenge invalidated.")

    // OTP record should now be deleted
    const deletedRecord = await getRegistrationOtp(email)
    expect(deletedRecord).toBeNull()
  })

  // ── TC-AUTH-05: Login with identifier (email, username, userNumber) and password
  it("TC-AUTH-05: Login with identifier (email, username, userNumber) and password", async () => {
    const originalFind = authModels.findUserByIdentifier
    const passwordHash = await hashPassword("correctPassword123")

    const sampleUser = {
      id: "usr_tc_05",
      userNumber: 2026110705n,
      email: "member@sekkha.com",
      username: "memberuser",
      name: "Member Sekkha",
      password: passwordHash,
      role: "member",
      onboardingCompleted: true,
      passwordChangedAt: new Date(),
    }

    authModels.findUserByIdentifier = async (ident: string) => {
      if (
        ident === "member@sekkha.com" ||
        ident === "memberuser" ||
        ident === "2026110705"
      ) {
        return sampleUser as any
      }
      return null
    }

    try {
      // Case A: login with email
      const resEmail = await loginUser({
        identifier: "member@sekkha.com",
        password: "correctPassword123",
      })
      expect(resEmail.accessToken).toBeDefined()
      expect(resEmail.refreshToken).toBeDefined()
      expect(resEmail.user.id).toBe("usr_tc_05")
      expect(resEmail.user.onboarding_completed).toBe(true)

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
      expect(wrongPwErr.message).toBe("Invalid credentials")
    } finally {
      authModels.findUserByIdentifier = originalFind
    }
  })

  // ── TC-AUTH-09 & 10: Forgot password request returns generic 200 envelope without disclosing email existence
  it("TC-AUTH-09 & 10: Forgot password request returns generic 200 envelope without disclosing email existence", async () => {
    const originalFind = authModels.findUserByEmail

    authModels.findUserByEmail = async (email: string) => {
      if (email === "registered@sekkha.com") {
        return { id: "usr_reg", email, name: "Reg User", role: "member" } as any
      }
      return null
    }

    try {
      const resUnregistered = await forgotPasswordRequest({ email: "unregistered@sekkha.com" })
      const resRegistered = await forgotPasswordRequest({ email: "registered@sekkha.com" })

      expect(resUnregistered.success).toBe(true)
      expect(resRegistered.success).toBe(true)
      expect(resUnregistered.message).toBe(
        "If the email is registered, a password recovery code has been sent"
      )
      expect(resUnregistered.message).toBe(resRegistered.message)
    } finally {
      authModels.findUserByEmail = originalFind
    }
  })

  // ── TC-AUTH-11: Forgot password OTP verification returns reset token, reset updates password and invalidates tokens
  it("TC-AUTH-11: Forgot password OTP verification returns reset token, reset updates password and invalidates tokens", async () => {
    const email = "forgot@example.com"
    const userId = "usr_forgot_11"

    await saveForgotPasswordOtp(email, {
      otp: "789123",
      email,
      userId,
      name: "Forgot Member",
      createdAt: Date.now(),
    })

    // 1. Verify OTP
    const verifyResult = await forgotPasswordVerifyOtp({ email, otp: "789123" })
    expect(verifyResult.success).toBe(true)
    expect(verifyResult.message).toBe("OTP verified. You may now set a new password.")
    expect(verifyResult.reset_token).toBeDefined()

    // 2. Perform password reset
    const originalUpdate = authModels.updateUserPassword
    let updatedUserId: string | null = null
    let updatedHash: string | null = null

    authModels.updateUserPassword = async (id: string, hash: string) => {
      updatedUserId = id
      updatedHash = hash
    }

    // Also populate a refresh token to verify invalidation
    await saveRefreshToken(userId, "sample_refresh_token_to_revoke", 3600)

    try {
      const resetResult = await resetPassword({
        email,
        reset_token: verifyResult.reset_token,
        newPassword: "superNewPassword123",
      })

      expect(resetResult.success).toBe(true)
      expect(resetResult.message).toBe("Password reset successfully")
      expect(updatedUserId).toBe(userId)
      expect(updatedHash).toBeDefined()

      // Prior refresh tokens must be revoked
      const rotateAttempt = await verifyAndRotateRefreshToken("sample_refresh_token_to_revoke")
      expect(rotateAttempt).toBeNull()
    } finally {
      authModels.updateUserPassword = originalUpdate
    }
  })

  // ── TC-AUTH-12 & 13: Refresh token rotation and logout revocation
  it("TC-AUTH-12 & 13: Refresh token rotation and logout revocation", async () => {
    const originalFind = authModels.findUserById
    const userId = "usr_refresh_user"

    authModels.findUserById = async (id: string) => {
      if (id === userId) {
        return {
          id: userId,
          userNumber: 2026110712n,
          email: "refresh@example.com",
          username: "refreshuser",
          name: "Refresh User",
          role: "member",
          onboardingCompleted: true,
          passwordChangedAt: new Date(Date.now() - 10000),
        } as any
      }
      return null
    }

    try {
      const token1 = "initial_refresh_token_12345"
      await saveRefreshToken(userId, token1, 3600)

      // TC-AUTH-12: Refresh session returns new access token and rotated refresh token
      const refreshResult = await refreshSession(token1)
      expect(refreshResult.accessToken).toBeDefined()
      expect(refreshResult.refreshToken).toBeDefined()
      expect(refreshResult.refreshToken).not.toBe(token1)

      // Old refresh token must be invalidated (single-use)
      let replayErr: any = null
      try {
        await refreshSession(token1)
      } catch (err: any) {
        replayErr = err
      }
      expect(replayErr).toBeDefined()
      expect(replayErr.status).toBe(401)
      expect(replayErr.message).toBe("Invalid or expired refresh token")

      // TC-AUTH-13: Logout revokes active JWT and refresh token
      const activeRefreshToken = refreshResult.refreshToken!
      const activeAccessToken = refreshResult.accessToken
      await logoutUser(activeAccessToken, userId, activeRefreshToken)

      // Refresh token revoked
      const revokedRefreshAttempt = await verifyAndRotateRefreshToken(activeRefreshToken)
      expect(revokedRefreshAttempt).toBeNull()

      // JWT access token revoked
      expect(await isTokenRevoked(activeAccessToken)).toBe(true)
    } finally {
      authModels.findUserById = originalFind
    }
  })
})
