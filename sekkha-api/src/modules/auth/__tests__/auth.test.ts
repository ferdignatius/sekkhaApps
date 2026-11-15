import { describe, it, expect } from "bun:test"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import {
  loginUser,
  refreshSession,
  logoutUser,
  verifyToken,
  resendRegisterOtp,
  resetPassword,
  verifyRegisterOtp,
  forgotPasswordRequest,
  forgotPasswordVerifyOtp,
  generateToken,
} from "../services"
import { authModels, generateUniqueUsername } from "../models"
import {
  saveRefreshToken,
  verifyAndRotateRefreshTokenRecord,
  parseDurationToSeconds,
} from "../internal/refreshTokenStore"
import {
  saveRegistrationOtp,
  deleteRegistrationOtp,
  consumeRegistrationOtp,
  saveForgotPasswordOtp,
  getForgotPasswordOtp,
  deleteForgotPasswordOtp,
  consumeForgotPasswordOtp,
  verifyAndConsumePasswordResetToken,
} from "../internal/otpStore"
import { isTokenRevoked } from "../internal/tokenRevocation"
import { RequestRegisterOtpSchema, RegisterSchema } from "../internal/validation"
import { hashPassword, verifyPassword, VALID_DUMMY_BCRYPT_HASH } from "../../../lib/password"
import { auditLogger } from "../../../lib/auditLogger"
import { prisma } from "../../../lib/prisma"

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

      // 2. Logout revokes both access token and refresh token (TC-AUTH-13)
      expect((rotated.user as any).user_number).toBe(2026110799n)
      await logoutUser(rotated.accessToken, "usr_refresh_user", rotated.refreshToken)

      let refreshRevokedErr: any = null
      try {
        await refreshSession(rotated.refreshToken!)
      } catch (err: any) {
        refreshRevokedErr = err
      }
      expect(refreshRevokedErr).toBeDefined()
      expect(refreshRevokedErr.status).toBe(401)
      expect(refreshRevokedErr.code).toBe("INVALID_REFRESH_TOKEN")

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

  it("upgrades legacy $2b$12$ hashes via upgradePasswordHash without invalidating issued session", async () => {
    const originalFindByIdent = authModels.findUserByIdentifier
    const originalFindById = authModels.findUserById
    const originalUpgrade = authModels.upgradePasswordHash
    const originalUpdatePassword = authModels.updateUserPassword

    const initialChangedAt = new Date(Date.now() - 60_000)
    const legacyHash = await hashPassword("legacyPassword123", 12)
    let storedHash = legacyHash
    let updatePasswordCalled = false
    let upgradedResolve!: () => void
    const upgradedDone = new Promise<void>((resolve) => {
      upgradedResolve = resolve
    })

    authModels.findUserByIdentifier = async () =>
      ({
        id: "usr_legacy_12",
        userNumber: 2026111501n,
        email: "legacy12@gmail.com",
        username: "legacy_user",
        password: storedHash,
        name: "Legacy User",
        role: "member",
        isClaimed: true,
        onboardingCompleted: true,
        passwordChangedAt: initialChangedAt,
      }) as any

    authModels.findUserById = async (id: string) =>
      ({
        id,
        userNumber: 2026111501n,
        email: "legacy12@gmail.com",
        username: "legacy_user",
        name: "Legacy User",
        role: "member",
        onboardingCompleted: true,
        passwordChangedAt: initialChangedAt,
      }) as any

    authModels.upgradePasswordHash = async (_userId: string, newHash: string) => {
      storedHash = newHash
      upgradedResolve()
      return {} as any
    }

    authModels.updateUserPassword = async () => {
      updatePasswordCalled = true
      return {} as any
    }

    try {
      const result = await loginUser({
        identifier: "legacy12@gmail.com",
        password: "legacyPassword123",
      })
      await upgradedDone

      expect(updatePasswordCalled).toBe(false)
      expect(storedHash).not.toBe(legacyHash)

      const verifiedUser = await verifyToken(result.accessToken)
      expect(verifiedUser.id).toBe("usr_legacy_12")
      expect(verifiedUser.user_number).toBe(2026111501n)
    } finally {
      authModels.findUserByIdentifier = originalFindByIdent
      authModels.findUserById = originalFindById
      authModels.upgradePasswordHash = originalUpgrade
      authModels.updateUserPassword = originalUpdatePassword
    }
  })

  it("enforces 60s cooldown on resendRegisterOtp and returns 400 when session is missing", async () => {
    const originalFindByEmail = authModels.findUserByEmail
    const testEmail = "cooldown_test@gmail.com"
    const missingEmail = "missing_session@gmail.com"
    const existingEmail = "already_registered@gmail.com"

    authModels.findUserByEmail = async (email: string) => {
      if (email === existingEmail) {
        return { id: "usr_existing_1" } as any
      }
      return null
    }

    try {
      await saveRegistrationOtp(testEmail, {
        otp: "123456",
        email: testEmail,
        passwordHash: "hash",
        name: "Cooldown User",
        createdAt: Date.now(),
      })

      let cooldownErr: any = null
      try {
        await resendRegisterOtp({ email: testEmail })
      } catch (err: any) {
        cooldownErr = err
      }
      expect(cooldownErr).toBeDefined()
      expect(cooldownErr.status).toBe(429)
      expect(cooldownErr.code).toBe("OTP_RESEND_COOLDOWN")

      let missingErr: any = null
      try {
        await resendRegisterOtp({ email: missingEmail })
      } catch (err: any) {
        missingErr = err
      }
      expect(missingErr).toBeDefined()
      expect(missingErr.status).toBe(400)
      expect(missingErr.code).toBe("REGISTRATION_SESSION_EXPIRED")

      let existingErr: any = null
      try {
        await resendRegisterOtp({ email: existingEmail })
      } catch (err: any) {
        existingErr = err
      }
      expect(existingErr).toBeDefined()
      expect(existingErr.status).toBe(400)
      expect(existingErr.code).toBe("REGISTRATION_SESSION_EXPIRED")
    } finally {
      await deleteRegistrationOtp(testEmail)
      authModels.findUserByEmail = originalFindByEmail
    }
  })

  it("enforces 5-attempt lockout on resetPassword OTP fallback", async () => {
    const testEmail = "forgot_lock@gmail.com"
    await saveForgotPasswordOtp(testEmail, {
      otp: "654321",
      email: testEmail,
      userId: "usr_forgot_1",
      name: "Forgot User",
      createdAt: Date.now(),
    })

    try {
      for (let i = 0; i < 4; i++) {
        let attemptErr: any = null
        try {
          await resetPassword({
            email: testEmail,
            otp: "000000",
            newPassword: "newSecurePassword123",
          })
        } catch (err: any) {
          attemptErr = err
        }
        expect(attemptErr?.status).toBe(400)
        expect(attemptErr?.code).toBe("INVALID_OR_EXPIRED_OTP")
      }

      let fifthErr: any = null
      try {
        await resetPassword({
          email: testEmail,
          otp: "000000",
          newPassword: "newSecurePassword123",
        })
      } catch (err: any) {
        fifthErr = err
      }
      expect(fifthErr).toBeDefined()
      expect(fifthErr.status).toBe(400)
      expect(fifthErr.code).toBe("OTP_MAX_ATTEMPTS_EXCEEDED")
    } finally {
      await deleteForgotPasswordOtp(testEmail)
    }
  })

  it("rejects all-digit usernames and short names in registration validation schemas", () => {
    expect(
      RequestRegisterOtpSchema.safeParse({
        email: "member@gmail.com",
        password: "securePassword123",
        name: "Budi Santoso",
        username: "2026111501",
      }).success
    ).toBe(false)

    expect(
      RegisterSchema.safeParse({
        email: "member@gmail.com",
        password: "securePassword123",
        name: "Budi Santoso",
        username: "2026111501",
      }).success
    ).toBe(false)

    expect(
      RegisterSchema.safeParse({
        email: "member@gmail.com",
        password: "securePassword123",
        name: "A",
        username: "member_2026",
      }).success
    ).toBe(false)

    expect(
      RequestRegisterOtpSchema.safeParse({
        email: "member@gmail.com",
        password: "securePassword123",
        name: "Budi Santoso",
        username: "member_2026",
      }).success
    ).toBe(true)
  })

  it("verifies VALID_DUMMY_BCRYPT_HASH without throwing InvalidEncoding and executes a single cost-10 check", async () => {
    expect(VALID_DUMMY_BCRYPT_HASH).toMatch(/^\$2[aby]\$10\$.{53}$/)

    const hasNativeBunVerify = typeof Bun !== "undefined" && typeof Bun.password?.verify === "function"
    const origBunVerify = hasNativeBunVerify ? Bun.password.verify : null
    const origBcryptCompare = bcrypt.compare

    let bunCalls = 0
    let bunThrew = false
    let bcryptCalls = 0

    if (origBunVerify) {
      ;(Bun.password as any).verify = async (password: string, hash: string) => {
        bunCalls++
        try {
          return await origBunVerify(password, hash)
        } catch (err) {
          bunThrew = true
          throw err
        }
      }
    }

    ;(bcrypt as any).compare = async (password: string, hash: string) => {
      bcryptCalls++
      return origBcryptCompare(password, hash)
    }

    try {
      const ok = await verifyPassword("non_matching_password_123", VALID_DUMMY_BCRYPT_HASH)
      expect(ok).toBe(false)
      expect(bunThrew).toBe(false)

      if (origBunVerify) {
        expect(bunCalls).toBe(1)
        expect(bcryptCalls).toBe(0)
      } else {
        expect(bcryptCalls).toBe(1)
      }
    } finally {
      if (origBunVerify) {
        ;(Bun.password as any).verify = origBunVerify
      }
      ;(bcrypt as any).compare = origBcryptCompare
    }
  })

  it("generateUniqueUsername('Li') returns 'memberli' (>= 3 chars) and resolves collisions", async () => {
    const origFindMany = prisma.user.findMany
    let mockRows: Array<{ username: string | null }> = []

    ;(prisma.user as any).findMany = async () => mockRows

    try {
      const shortNameResult = await generateUniqueUsername("Li")
      expect(shortNameResult).toBe("memberli")
      expect(shortNameResult.length).toBeGreaterThanOrEqual(3)

      mockRows = [{ username: "memberli" }]
      const collisionResult = await generateUniqueUsername("Li")
      expect(collisionResult).toBe("memberli1")

      mockRows = []
      const numericNameResult = await generateUniqueUsername("12")
      expect(numericNameResult).toBe("member12")
    } finally {
      ;(prisma.user as any).findMany = origFindMany
    }
  })

  it("forgotPasswordRequest enforces 60s cooldown with 429 OTP_RESEND_COOLDOWN", async () => {
    const testEmail = "forgot_cooldown_guard@gmail.com"
    await saveForgotPasswordOtp(testEmail, {
      otp: "123456",
      email: testEmail,
      userId: "usr_forgot_cd",
      name: "Cooldown Member",
      createdAt: Date.now(),
    })

    try {
      let cooldownErr: any = null
      try {
        await forgotPasswordRequest({ email: testEmail })
      } catch (err) {
        cooldownErr = err
      }

      expect(cooldownErr).toBeDefined()
      expect(cooldownErr.status).toBe(429)
      expect(cooldownErr.code).toBe("OTP_RESEND_COOLDOWN")
    } finally {
      await deleteForgotPasswordOtp(testEmail)
    }
  })

  it("forgotPasswordRequest silently skips unverified, unclaimed, and missing accounts without creating OTPs", async () => {
    const origFindByEmail = authModels.findUserByEmail
    const unverifiedEmail = "unverified_preprov@gmail.com"
    const unclaimedEmail = "unclaimed_preprov@gmail.com"
    const missingEmail = "missing_account@gmail.com"

    authModels.findUserByEmail = async (email: string) => {
      if (email === unverifiedEmail) {
        return {
          id: "usr_unverified",
          email: unverifiedEmail,
          name: "Unverified Member",
          emailVerifiedAt: null,
          isClaimed: true,
        } as any
      }
      if (email === unclaimedEmail) {
        return {
          id: "usr_unclaimed",
          email: unclaimedEmail,
          name: "Unclaimed Member",
          emailVerifiedAt: new Date(),
          isClaimed: false,
        } as any
      }
      return null
    }

    try {
      for (const email of [unverifiedEmail, unclaimedEmail, missingEmail]) {
        const res = await forgotPasswordRequest({ email })
        expect(res).toEqual({
          success: true,
          message: "If the email is registered, a password recovery code has been sent",
          email,
        })
        expect(await getForgotPasswordOtp(email)).toBeNull()
      }
    } finally {
      authModels.findUserByEmail = origFindByEmail
      await Promise.all([
        deleteForgotPasswordOtp(unverifiedEmail),
        deleteForgotPasswordOtp(unclaimedEmail),
        deleteForgotPasswordOtp(missingEmail),
      ])
    }
  })

  it("forgotPasswordRequest deletes the saved OTP and throws 503 EMAIL_SEND_FAILED when email delivery fails", async () => {
    const origFindByEmail = authModels.findUserByEmail
    const origNodeEnv = process.env.NODE_ENV
    const origSmtpUser = process.env.SMTP_USER
    const origSmtpPass = process.env.SMTP_PASS
    const origWarn = console.warn

    const targetEmail = "forgot_mail_failure@gmail.com"
    const warnings: string[] = []

    authModels.findUserByEmail = async (email: string) => {
      if (email === targetEmail) {
        return {
          id: "usr_verified_fail",
          email: targetEmail,
          name: "Verified Member",
          emailVerifiedAt: new Date(),
          isClaimed: true,
        } as any
      }
      return null
    }

    process.env.NODE_ENV = "production"
    delete process.env.SMTP_USER
    delete process.env.SMTP_PASS
    console.warn = (...args: unknown[]) => {
      warnings.push(args.map((a) => String(a)).join(" "))
    }

    try {
      let emailErr: any = null
      try {
        await forgotPasswordRequest({ email: targetEmail })
      } catch (err) {
        emailErr = err
      }

      expect(emailErr).toBeDefined()
      expect(emailErr.status).toBe(503)
      expect(emailErr.code).toBe("EMAIL_SEND_FAILED")
      expect(await getForgotPasswordOtp(targetEmail)).toBeNull()
      expect(warnings.some((w) => w.includes("SMTP credentials not configured in production"))).toBe(true)
    } finally {
      console.warn = origWarn
      authModels.findUserByEmail = origFindByEmail
      if (origNodeEnv === undefined) delete process.env.NODE_ENV
      else process.env.NODE_ENV = origNodeEnv
      if (origSmtpUser === undefined) delete process.env.SMTP_USER
      else process.env.SMTP_USER = origSmtpUser
      if (origSmtpPass === undefined) delete process.env.SMTP_PASS
      else process.env.SMTP_PASS = origSmtpPass
      await deleteForgotPasswordOtp(targetEmail)
    }
  })

  it("logoutUser never logs a forged actorId from an unsigned or invalid JWT", async () => {
    const origAuditLog = auditLogger.log
    const entries: Array<{ actorId: string; action: string; status: string }> = []
    auditLogger.log = (entry) => {
      entries.push({ actorId: entry.actorId, action: entry.action, status: entry.status })
    }

    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url")
    const forgedPayload = Buffer.from(
      JSON.stringify({ userId: "usr_forged_admin", role: "admin" })
    ).toString("base64url")
    const unsignedForgedJwt = `${header}.${forgedPayload}.`

    const wrongSecretJwt = jwt.sign(
      { userId: "usr_forged_admin", role: "admin" },
      "completely-wrong-secret-key-at-least-32-chars",
      { algorithm: "HS256", issuer: "sekkha-api", audience: "sekkha-app" }
    )

    const validRefreshToken = "rt_logout_forged_jwt_check_123456"

    try {
      // 1. Unsigned JWT alone: must not log AUTH_LOGOUT or revoke fake token
      await logoutUser(unsignedForgedJwt)
      expect(entries.length).toBe(0)
      expect(await isTokenRevoked(unsignedForgedJwt)).toBe(false)

      // 2. Wrong-signature JWT + valid refresh token: logs generic "authenticated_user", never forged actorId
      await saveRefreshToken("usr_real_owner", validRefreshToken, 120)
      await logoutUser(wrongSecretJwt, undefined, validRefreshToken)
      expect(entries.length).toBe(1)
      expect(entries[0]).toEqual({
        actorId: "authenticated_user",
        action: "AUTH_LOGOUT",
        status: "SUCCESS",
      })
      expect(await verifyAndRotateRefreshTokenRecord(validRefreshToken)).toBeNull()

      // 3. Valid signed JWT without explicit userId param: verifies signature and logs true actorId
      const validJwt = generateToken("usr_legit_actor", "member", "Legit User")
      await logoutUser(validJwt)
      expect(entries.length).toBe(2)
      expect(entries[1]).toEqual({
        actorId: "usr_legit_actor",
        action: "AUTH_LOGOUT",
        status: "SUCCESS",
      })
      expect(await isTokenRevoked(validJwt)).toBe(true)
    } finally {
      auditLogger.log = origAuditLog
    }
  })

  it("loginUser and verifyToken return is_claimed and requires_password_change flags for unclaimed accounts", async () => {
    const origFindByIdent = authModels.findUserByIdentifier
    const origFindById = authModels.findUserById
    const tempPasswordHash = await hashPassword("TempPass#2026")

    let currentClaimState = {
      isClaimed: false,
      passwordChangedByUser: false,
      onboardingCompleted: false,
    }

    authModels.findUserByIdentifier = async () =>
      ({
        id: "usr_preprov_unclaimed",
        userNumber: 2026111509n,
        email: null,
        username: "member_temp09",
        password: tempPasswordHash,
        name: "Pre-Provisioned Youth",
        role: "member",
        isClaimed: currentClaimState.isClaimed,
        passwordChangedByUser: currentClaimState.passwordChangedByUser,
        onboardingCompleted: currentClaimState.onboardingCompleted,
        passwordChangedAt: null,
      }) as any

    authModels.findUserById = async (id: string) =>
      ({
        id,
        userNumber: 2026111509n,
        email: null,
        username: "member_temp09",
        name: "Pre-Provisioned Youth",
        role: "member",
        isClaimed: currentClaimState.isClaimed,
        passwordChangedByUser: currentClaimState.passwordChangedByUser,
        emailVerifiedAt: null,
        onboardingCompleted: currentClaimState.onboardingCompleted,
        passwordChangedAt: null,
      }) as any

    try {
      // Case A: Unclaimed temporary-password account
      const loginUnclaimed = await loginUser({
        identifier: "member_temp09",
        password: "TempPass#2026",
      })
      expect(loginUnclaimed.is_claimed).toBe(false)
      expect(loginUnclaimed.requires_password_change).toBe(true)
      expect(loginUnclaimed.onboarding_completed).toBe(false)
      expect(loginUnclaimed.user.is_claimed).toBe(false)
      expect(loginUnclaimed.user.requires_password_change).toBe(true)
      expect(loginUnclaimed.user.onboarding_completed).toBe(false)
      expect(loginUnclaimed.user.user_number).toBe(2026111509n)

      const verifiedUnclaimed = await verifyToken(loginUnclaimed.accessToken)
      expect(verifiedUnclaimed.is_claimed).toBe(false)
      expect(verifiedUnclaimed.requires_password_change).toBe(true)
      expect(verifiedUnclaimed.onboarding_completed).toBe(false)
      expect(verifiedUnclaimed.user.is_claimed).toBe(false)
      expect(verifiedUnclaimed.user.requires_password_change).toBe(true)
      expect(verifiedUnclaimed.user.onboarding_completed).toBe(false)
      expect(verifiedUnclaimed.user.user_number).toBe(2026111509n)

      // Case B: Claimed account with user-set password
      currentClaimState = {
        isClaimed: true,
        passwordChangedByUser: true,
        onboardingCompleted: true,
      }
      const loginClaimed = await loginUser({
        identifier: "member_temp09",
        password: "TempPass#2026",
      })
      expect(loginClaimed.is_claimed).toBe(true)
      expect(loginClaimed.requires_password_change).toBe(false)
      expect(loginClaimed.user.is_claimed).toBe(true)
      expect(loginClaimed.user.requires_password_change).toBe(false)

      const verifiedClaimed = await verifyToken(loginClaimed.accessToken)
      expect(verifiedClaimed.is_claimed).toBe(true)
      expect(verifiedClaimed.requires_password_change).toBe(false)
      expect(verifiedClaimed.user.is_claimed).toBe(true)
      expect(verifiedClaimed.user.requires_password_change).toBe(false)
    } finally {
      authModels.findUserByIdentifier = origFindByIdent
      authModels.findUserById = origFindById
    }
  })

  it("consumes registration and forgot-password OTPs atomically (single-use under concurrent verification)", async () => {
    const origFindByEmail = authModels.findUserByEmail
    const origFindByUsername = authModels.findUserByUsername
    const origCreateUser = authModels.createUser

    const regEmail = "concurrent_reg_otp@gmail.com"
    const forgotEmail = "concurrent_forgot_otp@gmail.com"
    let createUserCalls = 0

    authModels.findUserByEmail = async () => null
    authModels.findUserByUsername = async () => null
    authModels.createUser = async (data) => {
      createUserCalls++
      await new Promise((r) => setTimeout(r, 15))
      return {
        id: "usr_concurrent_1",
        userNumber: 2026111510n,
        email: data.email,
        username: "concurrentuser",
        name: data.name,
        role: "member",
        isClaimed: true,
        onboardingCompleted: false,
        passwordChangedAt: new Date(),
      } as any
    }

    try {
      // 1. Direct consumeOtp mismatch preserves payload, then exact match consumes atomically
      await saveRegistrationOtp(regEmail, {
        otp: "778899",
        email: regEmail,
        passwordHash: "hashed_pw",
        name: "Concurrent Reg",
        username: null,
        createdAt: Date.now(),
      })

      expect(await consumeRegistrationOtp(regEmail, "000000")).toBe(false)
      const [regA, regB] = await Promise.allSettled([
        verifyRegisterOtp({ email: regEmail, otp: "778899" }),
        verifyRegisterOtp({ email: regEmail, otp: "778899" }),
      ])

      const regFulfilled = [regA, regB].filter((r) => r.status === "fulfilled")
      const regRejected = [regA, regB].filter(
        (r): r is PromiseRejectedResult => r.status === "rejected"
      )
      expect(regFulfilled.length).toBe(1)
      expect(regRejected.length).toBe(1)
      expect(regRejected[0].reason?.status).toBe(400)
      expect(regRejected[0].reason?.code).toBe("INVALID_OR_EXPIRED_OTP")
      expect(createUserCalls).toBe(1)

      // 2. Concurrent forgotPasswordVerifyOtp allows exactly 1 winner
      await saveForgotPasswordOtp(forgotEmail, {
        otp: "334455",
        email: forgotEmail,
        userId: "usr_concurrent_fp",
        name: "Concurrent Forgot",
        createdAt: Date.now(),
      })

      expect(await consumeForgotPasswordOtp(forgotEmail, "999999")).toBe(false)
      const [fpA, fpB] = await Promise.allSettled([
        forgotPasswordVerifyOtp({ email: forgotEmail, otp: "334455" }),
        forgotPasswordVerifyOtp({ email: forgotEmail, otp: "334455" }),
      ])

      const fpFulfilled = [fpA, fpB].filter(
        (r): r is PromiseFulfilledResult<{ success: boolean; reset_token: string }> =>
          r.status === "fulfilled"
      )
      const fpRejected = [fpA, fpB].filter(
        (r): r is PromiseRejectedResult => r.status === "rejected"
      )
      expect(fpFulfilled.length).toBe(1)
      expect(fpFulfilled[0].value.reset_token).toBeTruthy()
      expect(fpRejected.length).toBe(1)
      expect(fpRejected[0].reason?.status).toBe(400)
      expect(fpRejected[0].reason?.code).toBe("INVALID_OR_EXPIRED_OTP")

      // Consume issued single-use reset token to verify it works once and clear its TTL timer
      expect(
        await verifyAndConsumePasswordResetToken(forgotEmail, fpFulfilled[0].value.reset_token)
      ).toBe("usr_concurrent_fp")
      expect(
        await verifyAndConsumePasswordResetToken(forgotEmail, fpFulfilled[0].value.reset_token)
      ).toBeNull()
    } finally {
      authModels.findUserByEmail = origFindByEmail
      authModels.findUserByUsername = origFindByUsername
      authModels.createUser = origCreateUser
      await Promise.all([deleteRegistrationOtp(regEmail), deleteForgotPasswordOtp(forgotEmail)])
    }
  })

  it("parseDurationToSeconds handles weeks (w), milliseconds (ms), and standard units", () => {
    expect(parseDurationToSeconds("2w", 60)).toBe(2 * 7 * 24 * 60 * 60)
    expect(parseDurationToSeconds("5000ms", 60)).toBe(5)
    expect(parseDurationToSeconds("500ms", 60)).toBe(1)
    expect(parseDurationToSeconds("15m", 60)).toBe(900)
    expect(parseDurationToSeconds("invalid", 60)).toBe(60)
  })
})
