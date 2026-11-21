import { randomInt, randomBytes } from "crypto"
import {
  hashPassword,
  verifyPassword,
  DEFAULT_BCRYPT_COST,
  VALID_DUMMY_BCRYPT_HASH,
} from "../../lib/password"
import jwt from "jsonwebtoken"
import { eventbus, DomainEvents } from "../../core/eventbus"
import type { UserRegisteredPayload } from "../../core/eventbus"
import { auditLogger } from "../../lib/auditLogger"
import { AppError } from "../../lib/AppError"
import { isValidGmailEmail, GMAIL_ERROR_MESSAGE } from "../../lib/emailValidation"
import * as repo from "./models"
import type {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  RequestRegisterOtpInput,
  VerifyRegisterOtpInput,
  ResendOtpInput,
  ForgotPasswordRequestInput,
  ForgotPasswordVerifyOtpInput,
  ResetPasswordInput,
} from "./internal/validation"
import {
  saveRegistrationOtp,
  getRegistrationOtp,
  consumeRegistrationOtp,
  deleteRegistrationOtp,
  incrementRegistrationOtpAttempts,
  saveForgotPasswordOtp,
  getForgotPasswordOtp,
  consumeForgotPasswordOtp,
  deleteForgotPasswordOtp,
  incrementForgotPasswordOtpAttempts,
  savePasswordResetToken,
  verifyAndConsumePasswordResetToken,
  OTP_RESEND_COOLDOWN_MS,
} from "./internal/otpStore"
import {
  saveRefreshToken,
  verifyAndRotateRefreshTokenRecord,
  revokeRefreshToken,
  revokeTokenFamily,
  revokeAllUserRefreshTokens,
  getRefreshTokenTtlSeconds,
  parseDurationToSeconds,
  hashRefreshToken,
  acquireRefreshTokenLock,
  releaseRefreshTokenLock,
  peekRefreshTokenStatus,
  commitRefreshTokenRotation,
} from "./internal/refreshTokenStore"
import { sendRegisterOtpEmail, sendForgotPasswordOtpEmail } from "./internal/email"
import { revokeToken, isTokenRevoked } from "./internal/tokenRevocation"

// Dummy bcrypt hash used only to equalize response timing when a user identifier does not exist (OWASP timing-oracle mitigation)
const DUMMY_BCRYPT_HASH = process.env.DUMMY_BCRYPT_HASH || VALID_DUMMY_BCRYPT_HASH

// ─── Service ─────────────────────────────────────────────────────────────────
// Business logic layer. Orchestrates repository calls + publishes domain events.

export interface AuthUserSummary {
  id: string
  user_number?: bigint | number | null
  email: string
  username?: string | null
  name: string
  role: string
  onboarding_completed: boolean
  is_claimed: boolean
  requires_password_change: boolean
}

export interface AuthResult {
  accessToken: string
  expiresInSeconds: number
  refreshToken?: string
  onboarding_completed: boolean
  is_claimed: boolean
  requires_password_change: boolean
  user: AuthUserSummary
}

function getJwtExpiry(): string {
  return process.env.JWT_EXPIRES_IN || "15m" // 15m short-lived access token
}

export function getAccessTokenTtlSeconds(): number {
  return parseDurationToSeconds(process.env.JWT_EXPIRES_IN, 15 * 60)
}

export { getRefreshTokenTtlSeconds }

function extractClaimStatus(user: {
  onboardingCompleted?: boolean | null
  isClaimed?: boolean | null
  passwordChangedByUser?: boolean | null
}) {
  const isClaimed = (user as any).isClaimed !== undefined ? Boolean((user as any).isClaimed) : true
  const requiresPasswordChange = Boolean(
    (user as any).isClaimed === false && (user as any).passwordChangedByUser === false
  )
  return {
    onboarding_completed: Boolean(user.onboardingCompleted),
    is_claimed: isClaimed,
    requires_password_change: requiresPasswordChange,
  }
}

function buildAuthResult(
  user: {
    id: string
    userNumber?: bigint | number | null
    email?: string | null
    username?: string | null
    name: string
    role: string
    onboardingCompleted?: boolean | null
    isClaimed?: boolean | null
    passwordChangedByUser?: boolean | null
  },
  accessToken: string,
  refreshToken: string
): AuthResult {
  const claimStatus = extractClaimStatus(user)
  const userData: AuthUserSummary = {
    id: user.id,
    user_number: user.userNumber,
    email: user.email || "",
    username: user.username,
    name: user.name,
    role: user.role,
    ...claimStatus,
  }

  return {
    accessToken,
    expiresInSeconds: getAccessTokenTtlSeconds(),
    refreshToken,
    ...claimStatus,
    user: userData,
  }
}

async function assertAndConsumeOtp<T extends object>(
  normalizedEmail: string,
  otp: string,
  consumeFn: (email: string, code: string) => Promise<T | false | null>,
  incrementAttemptsFn: (email: string) => Promise<number>
): Promise<T> {
  const consumed = await consumeFn(normalizedEmail, otp)

  if (consumed === null) {
    throw new AppError("Invalid or expired OTP", 400, "INVALID_OR_EXPIRED_OTP")
  }

  if (consumed === false) {
    const attempts = await incrementAttemptsFn(normalizedEmail)
    if (attempts >= 5) {
      throw new AppError(
        "Too many failed OTP attempts. Challenge invalidated.",
        400,
        "OTP_MAX_ATTEMPTS_EXCEEDED"
      )
    }
    throw new AppError("Invalid or expired OTP", 400, "INVALID_OR_EXPIRED_OTP")
  }

  return consumed
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error("JWT_SECRET is not configured in environment variables")
  }
  return secret
}

export function generateToken(
  userId: string,
  role: string,
  name?: string,
  passwordChangedAt?: Date | null
): string {
  const payload: any = { userId, role, name }
  if (passwordChangedAt) {
    const changedAtMs = new Date(passwordChangedAt).getTime()
    payload.passwordChangedAt = Math.floor(changedAtMs / 1000)
    payload.passwordChangedAtMs = changedAtMs
  }
  return jwt.sign(payload, getJwtSecret(), {
    algorithm: "HS256",
    issuer: "sekkha-api",
    audience: "sekkha-app",
    expiresIn: getJwtExpiry() as any,
  })
}

/**
 * Initiates user registration by validating input and sending a 6-digit OTP to email.
 */
export async function requestRegisterOtp(input: RequestRegisterOtpInput) {
  const normalizedEmail = input.email.toLowerCase().trim()
  if (!isValidGmailEmail(normalizedEmail)) {
    throw new AppError(GMAIL_ERROR_MESSAGE, 400, "INVALID_EMAIL_DOMAIN")
  }

  // 1. Check if email already registered (TC-AUTH-02: Throw 409 Conflict per PRD)
  const emailExists = await repo.findUserByEmail(normalizedEmail)
  if (emailExists) {
    throw new AppError("Email already registered", 409, "EMAIL_ALREADY_REGISTERED")
  }

  // 2. Check if username already taken (if provided)
  if (input.username) {
    const usernameExists = await repo.findUserByUsername(input.username)
    if (usernameExists) {
      throw new AppError("Username already taken", 409, "USERNAME_ALREADY_TAKEN")
    }
  }

  // 3. Generate 6-digit OTP code with CSPRNG & password hash
  const otp = randomInt(100000, 1000000).toString()
  const passwordHash = await hashPassword(input.password, DEFAULT_BCRYPT_COST)
  const name = input.name || normalizedEmail.split("@")[0]

  // 4. Save to OTP cache store (TTL 10 minutes)
  await saveRegistrationOtp(normalizedEmail, {
    otp,
    email: normalizedEmail,
    passwordHash,
    name,
    username: input.username || null,
    createdAt: Date.now(),
  })

  // 5. Send OTP email via SMTP / Resend
  const mailResult = await sendRegisterOtpEmail({
    to: normalizedEmail,
    otp,
    name,
  })
  if (!mailResult.success) {
    await deleteRegistrationOtp(normalizedEmail)
    throw new AppError("Failed to send verification email. Please try again shortly.", 503, "EMAIL_SEND_FAILED")
  }

  return {
    success: true,
    message: "Registration OTP sent",
    email: normalizedEmail,
  }
}

/**
 * Verifies 6-digit OTP and creates the user account in database.
 */
export async function verifyRegisterOtp(input: VerifyRegisterOtpInput): Promise<AuthResult> {
  const normalizedEmail = input.email.toLowerCase().trim()
  const payload = await assertAndConsumeOtp(
    normalizedEmail,
    input.otp,
    consumeRegistrationOtp,
    incrementRegistrationOtpAttempts
  )

  // Double check if account was registered concurrently
  const emailExists = await repo.findUserByEmail(normalizedEmail)
  if (emailExists) {
    await deleteRegistrationOtp(normalizedEmail)
    throw new AppError("Email already registered", 409, "EMAIL_ALREADY_REGISTERED")
  }

  if (payload.username) {
    const usernameExists = await repo.findUserByUsername(payload.username)
    if (usernameExists) {
      await deleteRegistrationOtp(normalizedEmail)
      throw new AppError("Username already taken", 409, "USERNAME_ALREADY_TAKEN")
    }
  }

  // Create user in database
  let user: Awaited<ReturnType<typeof repo.createUser>>
  try {
    user = await repo.createUser({
      email: payload.email,
      username: payload.username ?? undefined,
      name: payload.name,
      password: payload.passwordHash,
    })
  } catch (err) {
    if (err instanceof AppError && err.status === 409) {
      await deleteRegistrationOtp(normalizedEmail)
    }
    throw err
  }

  // Delete consumed OTP attempt counter
  await deleteRegistrationOtp(normalizedEmail)

  const token = generateToken(user.id, user.role, user.name, user.passwordChangedAt)
  const refreshToken = randomBytes(32).toString("hex")
  await saveRefreshToken(user.id, refreshToken, getRefreshTokenTtlSeconds())

  auditLogger.log({
    actorId: user.id,
    actorRole: user.role,
    action: "AUTH_LOGIN_SUCCESS",
    status: "SUCCESS",
    details: { method: "otp_registration" },
  })

  // Publish domain event
  eventbus.publish<UserRegisteredPayload>(DomainEvents.USER_REGISTERED, {
    userId: user.id,
    email: user.email || "",
    name: user.name,
  })

  return buildAuthResult(user, token, refreshToken)
}

/**
 * Resends a new 6-digit OTP code to the user's email with 60s cooldown enforcement.
 */
export async function resendRegisterOtp(input: ResendOtpInput) {
  const normalizedEmail = input.email.toLowerCase().trim()

  const emailExists = await repo.findUserByEmail(normalizedEmail)
  const payload = await getRegistrationOtp(normalizedEmail)
  if (emailExists || !payload) {
    throw new AppError(
      "Registration session not found or expired. Please sign up again.",
      400,
      "REGISTRATION_SESSION_EXPIRED"
    )
  }

  const elapsedMs = Date.now() - payload.createdAt
  if (elapsedMs < OTP_RESEND_COOLDOWN_MS) {
    const retryAfterSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsedMs) / 1000)
    throw new AppError(
      `Please wait ${retryAfterSeconds} seconds before requesting a new OTP.`,
      429,
      "OTP_RESEND_COOLDOWN"
    )
  }

  const newOtp = randomInt(100000, 1000000).toString()

  const mailResult = await sendRegisterOtpEmail({
    to: normalizedEmail,
    otp: newOtp,
    name: payload.name,
  })
  if (!mailResult.success) {
    throw new AppError("Failed to send verification email. Please try again shortly.", 503, "EMAIL_SEND_FAILED")
  }

  await saveRegistrationOtp(normalizedEmail, {
    otp: newOtp,
    email: payload.email,
    passwordHash: payload.passwordHash,
    name: payload.name,
    username: payload.username,
    createdAt: Date.now(),
  })

  return {
    success: true,
    message: "If the email is eligible, a new OTP code has been sent",
  }
}

/**
 * Legacy/Direct Register an existing user (internal helper; HTTP endpoint disabled).
 */
export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  const normalizedEmail = input.email.toLowerCase().trim()
  if (!isValidGmailEmail(normalizedEmail)) {
    throw new AppError(GMAIL_ERROR_MESSAGE, 400, "INVALID_EMAIL_DOMAIN")
  }

  const emailExists = await repo.findUserByEmail(normalizedEmail)
  if (emailExists) {
    throw new AppError("Email already registered", 409, "EMAIL_ALREADY_REGISTERED")
  }

  if (input.username) {
    const usernameExists = await repo.findUserByUsername(input.username)
    if (usernameExists) {
      throw new AppError("Username already taken", 409, "USERNAME_ALREADY_TAKEN")
    }
  }

  const hashedPassword = await hashPassword(input.password, DEFAULT_BCRYPT_COST)
  const user = await repo.createUser({
    email: input.email,
    username: input.username ?? undefined,
    name: input.name,
    password: hashedPassword,
  })

  const token = generateToken(user.id, user.role, user.name, user.passwordChangedAt)
  const refreshToken = randomBytes(32).toString("hex")
  await saveRefreshToken(user.id, refreshToken, getRefreshTokenTtlSeconds())

  auditLogger.log({
    actorId: user.id,
    actorRole: user.role,
    action: "AUTH_LOGIN_SUCCESS",
    status: "SUCCESS",
    details: { method: "direct_registration" },
  })

  eventbus.publish<UserRegisteredPayload>(DomainEvents.USER_REGISTERED, {
    userId: user.id,
    email: user.email || "",
    name: user.name,
  })

  return buildAuthResult(user, token, refreshToken)
}

/**
 * Login an existing user with email or username.
 */
export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const identifier = input.identifier
  const user = await repo.findUserByIdentifier(identifier)
  if (!user || !user.password || (user as any).anonymizedAt) {
    await verifyPassword(input.password, DUMMY_BCRYPT_HASH)
    auditLogger.log({
      actorId: "unknown",
      action: "AUTH_LOGIN_FAILED",
      status: "FAILURE",
      details: { identifier },
    })
    throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS")
  }

  const valid = await verifyPassword(input.password, user.password)
  if (!valid) {
    auditLogger.log({
      actorId: user.id,
      action: "AUTH_LOGIN_FAILED",
      status: "FAILURE",
      details: { identifier },
    })
    throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS")
  }

  // Transparent background upgrade for legacy 12-round bcrypt hashes
  if (user.password.startsWith("$2a$12$") || user.password.startsWith("$2b$12$")) {
    hashPassword(input.password, DEFAULT_BCRYPT_COST)
      .then((newHash) => repo.upgradePasswordHash(user.id, newHash))
      .catch(() => {})
  }

  const token = generateToken(user.id, user.role, user.name, user.passwordChangedAt)
  const refreshToken = randomBytes(32).toString("hex")

  await saveRefreshToken(user.id, refreshToken, getRefreshTokenTtlSeconds())

  repo.touchLastActiveAt(user.id).catch(() => {})

  auditLogger.log({
    actorId: user.id,
    actorRole: user.role,
    action: "AUTH_LOGIN_SUCCESS",
    status: "SUCCESS",
    details: { method: "password" },
  })

  return buildAuthResult(user, token, refreshToken)
}

/**
 * Verify a JWT token and return the associated user with fresh DB data.
 * Checks token revocation, signature, and passwordChangedAt invalidation.
 */
export async function verifyToken(token: string) {
  // 1. Check if token was revoked (logged out)
  const revoked = await isTokenRevoked(token)
  if (revoked) {
    throw new AppError("Session has expired or been revoked", 401, "SESSION_REVOKED")
  }

  // 2. JWT verification with pinned algorithm & claims
  const payload = jwt.verify(token, getJwtSecret(), {
    algorithms: ["HS256"],
    issuer: "sekkha-api",
    audience: "sekkha-app",
  }) as {
    userId: string
    role: string
    name?: string
    passwordChangedAt?: number
    passwordChangedAtMs?: number
  }

  const user = await repo.findUserById(payload.userId)
  if (!user || (user as any).anonymizedAt) {
    throw new AppError("User not found", 401, "USER_NOT_FOUND")
  }

  // 3. Invalidate if password was changed after token issuance
  if (user.passwordChangedAt) {
    const dbTimeMs = user.passwordChangedAt.getTime()
    const dbTimeSeconds = Math.floor(dbTimeMs / 1000)
    const isStale =
      typeof payload.passwordChangedAtMs === "number"
        ? dbTimeMs > payload.passwordChangedAtMs
        : !payload.passwordChangedAt || dbTimeSeconds > payload.passwordChangedAt
    if (isStale) {
      throw new AppError("Password has been updated. Please sign in again.", 401, "PASSWORD_UPDATED")
    }
  }

  const claimStatus = extractClaimStatus(user)
  const userData = {
    id: user.id,
    user_number: user.userNumber,
    email: user.email,
    username: user.username,
    name: user.name,
    role: user.role,
    ...claimStatus,
  }

  return {
    ...userData,
    user: { ...userData },
  }
}

/**
 * Refreshes an existing session via distributed-locked single-use refresh token rotation.
 * Persists the new token before consuming the old token to prevent irrecoverable session loss,
 * returns 409 REFRESH_CONCURRENT on lock contention, and revokes the token family on confirmed reuse.
 */
export async function refreshSession(refreshToken: string): Promise<AuthResult> {
  const cleanRefreshToken = refreshToken?.trim()
  if (!cleanRefreshToken) {
    throw new AppError("Invalid or expired refresh token", 401, "INVALID_REFRESH_TOKEN")
  }

  const tokenHash = hashRefreshToken(cleanRefreshToken)
  const lockOwner = randomBytes(16).toString("hex")
  const acquired = await acquireRefreshTokenLock(tokenHash, lockOwner)
  if (!acquired) {
    throw new AppError("Concurrent refresh already in progress", 409, "REFRESH_CONCURRENT")
  }

  try {
    const status = await peekRefreshTokenStatus(cleanRefreshToken)

    if (status.status === "reused") {
      await revokeTokenFamily(status.used.familyId, status.used.userId)
      auditLogger.log({
        actorId: status.used.userId,
        action: "AUTH_REFRESH_REUSE_DETECTED",
        status: "FAILURE",
        details: { familyId: status.used.familyId },
      })
      throw new AppError("Invalid or expired refresh token", 401, "INVALID_REFRESH_TOKEN")
    }

    if (status.status !== "active") {
      throw new AppError("Invalid or expired refresh token", 401, "INVALID_REFRESH_TOKEN")
    }

    const record = status.record
    const user = await repo.findUserById(record.userId)
    if (!user || (user as any).anonymizedAt) {
      await revokeRefreshToken(cleanRefreshToken, record.userId)
      throw new AppError("User not found", 401, "USER_NOT_FOUND")
    }

    if (user.passwordChangedAt && record.createdAt < user.passwordChangedAt.getTime()) {
      await revokeTokenFamily(record.familyId, user.id)
      throw new AppError("Password has been updated. Please sign in again.", 401, "PASSWORD_UPDATED")
    }

    const newAccessToken = generateToken(user.id, user.role, user.name, user.passwordChangedAt)
    const newRefreshToken = randomBytes(32).toString("hex")
    const ttlSeconds = getRefreshTokenTtlSeconds()

    const committed = await commitRefreshTokenRotation(
      cleanRefreshToken,
      newRefreshToken,
      record,
      ttlSeconds
    )
    if (!committed) {
      throw new AppError("Concurrent refresh already in progress", 409, "REFRESH_CONCURRENT")
    }

    repo.touchLastActiveAt(user.id).catch(() => {})

    return buildAuthResult(user, newAccessToken, newRefreshToken)
  } finally {
    await releaseRefreshTokenLock(tokenHash, lockOwner).catch(() => {})
  }
}

/**
 * Logs out a user by revoking their token and refresh token in Redis / memory.
 */
export async function logoutUser(token?: string, userId?: string, refreshToken?: string) {
  let verifiedUserId = userId
  if (!verifiedUserId && token) {
    try {
      const payload = jwt.verify(token.trim(), getJwtSecret(), {
        algorithms: ["HS256"],
      }) as { userId?: string; iss?: string; aud?: string } | null
      const issValid = !payload?.iss || payload.iss === "sekkha-api"
      const audValid = !payload?.aud || payload.aud === "sekkha-app"
      if (issValid && audValid && typeof payload?.userId === "string" && payload.userId.trim()) {
        verifiedUserId = payload.userId
      }
    } catch {
      // Never trust claims from an unverified or invalid token
    }
  }

  if (token) {
    await revokeToken(token)
  }

  const cleanRefreshToken = refreshToken?.trim() || undefined
  if (cleanRefreshToken) {
    await revokeRefreshToken(cleanRefreshToken, verifiedUserId)
  }

  if (verifiedUserId || cleanRefreshToken) {
    auditLogger.log({
      actorId: verifiedUserId || "authenticated_user",
      action: "AUTH_LOGOUT",
      status: "SUCCESS",
    })
  }
}

/**
 * Step 1: Initiates forgot password request by validating email and sending a 6-digit OTP.
 */
export async function forgotPasswordRequest(input: ForgotPasswordRequestInput) {
  const normalizedEmail = input.email.toLowerCase().trim()
  if (!isValidGmailEmail(normalizedEmail)) {
    throw new AppError(GMAIL_ERROR_MESSAGE, 400, "INVALID_EMAIL_DOMAIN")
  }

  const existingOtp = await getForgotPasswordOtp(normalizedEmail)
  if (existingOtp) {
    const elapsedMs = Date.now() - existingOtp.createdAt
    if (elapsedMs < OTP_RESEND_COOLDOWN_MS) {
      const retryAfterSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsedMs) / 1000)
      throw new AppError(
        `Please wait ${retryAfterSeconds} seconds before requesting a new OTP.`,
        429,
        "OTP_RESEND_COOLDOWN"
      )
    }
  }

  const user = await repo.findUserByEmail(normalizedEmail)

  if (!user || (user as any).emailVerifiedAt === null || (user as any).isClaimed === false) {
    // Anti-Enumeration: equalize timing and return generic success without leaking account eligibility
    await verifyPassword("anti_enum_padding", DUMMY_BCRYPT_HASH)
    return {
      success: true,
      message: "If the email is registered, a password recovery code has been sent",
      email: normalizedEmail,
    }
  }

  const otp = randomInt(100000, 1000000).toString()

  await saveForgotPasswordOtp(normalizedEmail, {
    otp,
    email: normalizedEmail,
    userId: user.id,
    name: user.name,
    createdAt: Date.now(),
  })

  const mailResult = await sendForgotPasswordOtpEmail({
    to: normalizedEmail,
    otp,
    name: user.name,
  })
  if (!mailResult.success) {
    await deleteForgotPasswordOtp(normalizedEmail)
    throw new AppError(
      "Failed to send password recovery email. Please try again shortly.",
      503,
      "EMAIL_SEND_FAILED"
    )
  }

  return {
    success: true,
    message: "If the email is registered, a password recovery code has been sent",
    email: normalizedEmail,
  }
}

async function verifyAndConsumeForgotOtpChallenge(normalizedEmail: string, otp: string): Promise<string> {
  const consumed = await assertAndConsumeOtp(
    normalizedEmail,
    otp,
    consumeForgotPasswordOtp,
    incrementForgotPasswordOtpAttempts
  )
  await deleteForgotPasswordOtp(normalizedEmail)
  return consumed.userId
}

/**
 * Step 2: Verifies the 6-digit OTP before allowing password change.
 * F-05 Remediation: Deletes OTP and issues single-use reset token.
 */
export async function forgotPasswordVerifyOtp(input: ForgotPasswordVerifyOtpInput) {
  const normalizedEmail = input.email.toLowerCase().trim()
  const userId = await verifyAndConsumeForgotOtpChallenge(normalizedEmail, input.otp)

  // Generate one-time cryptographically random reset token
  const resetToken = randomBytes(32).toString("hex")
  await savePasswordResetToken(normalizedEmail, userId, resetToken)

  return {
    success: true,
    message: "OTP verified. You may now set a new password.",
    reset_token: resetToken,
    expires_in_seconds: 600,
  }
}

/**
 * Step 3: Sets a new password using one-time reset token (or verified OTP fallback).
 */
export async function resetPassword(input: ResetPasswordInput) {
  const normalizedEmail = input.email.toLowerCase().trim()
  let targetUserId: string | null = null

  if (input.reset_token) {
    targetUserId = await verifyAndConsumePasswordResetToken(normalizedEmail, input.reset_token)
    if (!targetUserId) {
      throw new AppError("Invalid or expired reset token", 400, "INVALID_RESET_TOKEN")
    }
  } else if (input.otp) {
    // Backwards-compatible fallback enforcing the same 5-attempt OTP lockout
    targetUserId = await verifyAndConsumeForgotOtpChallenge(normalizedEmail, input.otp)
  } else {
    throw new AppError("Reset token or OTP is required", 400, "RESET_TOKEN_REQUIRED")
  }

  const hashedPassword = await hashPassword(input.newPassword, DEFAULT_BCRYPT_COST)
  await repo.updateUserPassword(targetUserId, hashedPassword)
  await revokeAllUserRefreshTokens(targetUserId)

  auditLogger.log({
    actorId: targetUserId,
    action: "AUTH_PASSWORD_RESET",
    status: "SUCCESS",
  })

  return {
    success: true,
    message: "Password reset successfully",
  }
}

/**
 * Legacy forgot password handler (backward compatibility).
 * F-11 Remediation: Does not leak userFound boolean
 */
export async function forgotPassword(input: ForgotPasswordInput) {
  await repo.findUserByIdentifier(input.identifier)
  return {
    success: true,
    message: "Password recovery request processed. Please check your email.",
  }
}
