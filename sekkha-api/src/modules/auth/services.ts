import { randomInt, randomBytes, createHash } from "crypto"
import { hashPassword, verifyPassword, DEFAULT_BCRYPT_COST } from "../../lib/password"
import jwt from "jsonwebtoken"
import { eventbus, DomainEvents } from "../../core/eventbus"
import type { UserRegisteredPayload } from "../../core/eventbus"
import { redis } from "../../lib/redis"
import { auditLogger } from "../../lib/auditLogger"
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
  timingSafeEqualOtpHash,
} from "./internal/otpStore"
import {
  saveRefreshToken,
  verifyAndRotateRefreshTokenRecord,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
  getRefreshTokenTtlSeconds,
  parseDurationToSeconds,
} from "./internal/refreshTokenStore"
import { sendRegisterOtpEmail, sendForgotPasswordOtpEmail } from "./internal/email"
import { revokeToken, isTokenRevoked } from "./internal/tokenRevocation"

// Dummy bcrypt hash used only to equalize response timing when a user identifier does not exist (OWASP timing-oracle mitigation)
const DUMMY_BCRYPT_HASH =
  process.env.DUMMY_BCRYPT_HASH || "$2b$10$CwTycUXWue0Thq9StjUM0uJ8D0R6V7W8X9Y0Z1a2b3c4d5e6f7g8h"

// ─── Service ─────────────────────────────────────────────────────────────────
// Business logic layer. Orchestrates repository calls + publishes domain events.

export interface AuthResult {
  accessToken: string
  expiresInSeconds: number
  refreshToken?: string
  user: { id: string; email: string; username?: string | null; name: string; role: string; onboarding_completed?: boolean }
}

function getJwtExpiry(): string {
  return process.env.JWT_EXPIRES_IN || "15m" // 15m short-lived access token
}

export function getAccessTokenTtlSeconds(): number {
  return parseDurationToSeconds(process.env.JWT_EXPIRES_IN, 15 * 60)
}

export { getRefreshTokenTtlSeconds }

function hashSessionKey(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex")
}

async function cacheUserSession(token: string, userData: any) {
  try {
    const key = `auth:session:${hashSessionKey(token)}`
    await redis.set(key, JSON.stringify(userData), "EX", getAccessTokenTtlSeconds())
  } catch {
    // Non-blocking fallback if Redis is offline
  }
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
    payload.passwordChangedAt = Math.floor(new Date(passwordChangedAt).getTime() / 1000)
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

  // 1. Check if email already registered (TC-AUTH-02: Throw 409 Conflict per PRD)
  const emailExists = await repo.findUserByEmail(normalizedEmail)
  if (emailExists) {
    const err = new Error("Email already registered") as Error & { status: number }
    err.status = 409
    throw err
  }

  // 2. Check if username already taken (if provided)
  if (input.username) {
    const usernameExists = await repo.findUserByUsername(input.username)
    if (usernameExists) {
      const err = new Error("Username already taken") as Error & { status: number }
      err.status = 409
      throw err
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
  await sendRegisterOtpEmail({
    to: normalizedEmail,
    otp,
    name,
  })

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
  const consumed = await consumeRegistrationOtp(normalizedEmail, input.otp)
  const payload = consumed || await getRegistrationOtp(normalizedEmail)

  if (!payload) {
    const err = new Error("Invalid or expired OTP") as Error & { status: number }
    err.status = 400
    throw err
  }

  if (!consumed && !timingSafeEqualOtpHash(payload.otpHashed, input.otp)) {
    const attempts = await incrementRegistrationOtpAttempts(normalizedEmail)
    if (attempts >= 5) {
      const err = new Error(
        "Too many failed OTP attempts. Challenge invalidated."
      ) as Error & { status: number }
      err.status = 400
      throw err
    }
    const err = new Error("Invalid or expired OTP") as Error & { status: number }
    err.status = 400
    throw err
  }

  // Double check if account was registered concurrently
  const emailExists = await repo.findUserByEmail(normalizedEmail)
  if (emailExists) {
    await deleteRegistrationOtp(normalizedEmail)
    const err = new Error("Email already registered") as Error & { status: number }
    err.status = 409
    throw err
  }

  // Create user in database
  const user = await repo.createUser({
    email: payload.email,
    username: payload.username ?? undefined,
    name: payload.name,
    password: payload.passwordHash,
  })

  // Delete consumed OTP
  await deleteRegistrationOtp(normalizedEmail)

  const token = generateToken(user.id, user.role, user.name, user.passwordChangedAt)
  const refreshToken = randomBytes(32).toString("hex")
  await saveRefreshToken(user.id, refreshToken, getRefreshTokenTtlSeconds())

  const userData = {
    id: user.id,
    user_number: user.userNumber,
    email: user.email || "",
    username: user.username,
    name: user.name,
    role: user.role,
    onboarding_completed: false,
  }

  await cacheUserSession(token, userData)

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

  return {
    accessToken: token,
    expiresInSeconds: getAccessTokenTtlSeconds(),
    refreshToken,
    user: userData,
  }
}

/**
 * Resends a new 6-digit OTP code to the user's email.
 * F-11 Remediation: Uniform response, prevents account enumeration
 */
export async function resendRegisterOtp(input: ResendOtpInput) {
  const normalizedEmail = input.email.toLowerCase().trim()

  const emailExists = await repo.findUserByEmail(normalizedEmail)
  if (emailExists) {
    return {
      success: true,
      message: "If the email is eligible, a new OTP code has been sent",
    }
  }

  const payload = await getRegistrationOtp(normalizedEmail)
  if (!payload) {
    const err = new Error(
      "Registration session not found or expired. Please sign up again."
    ) as Error & { status: number }
    err.status = 400
    throw err
  }

  const newOtp = randomInt(100000, 1000000).toString()

  await saveRegistrationOtp(normalizedEmail, {
    otp: newOtp,
    email: payload.email,
    passwordHash: payload.passwordHash,
    name: payload.name,
    username: payload.username,
    createdAt: Date.now(),
  })

  await sendRegisterOtpEmail({
    to: normalizedEmail,
    otp: newOtp,
    name: payload.name,
  })

  return {
    success: true,
    message: "If the email is eligible, a new OTP code has been sent",
  }
}

/**
 * Legacy/Direct Register an existing user (backward compatibility).
 */
export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  const emailExists = await repo.findUserByEmail(input.email)
  if (emailExists) {
    const err = new Error("Email already registered") as Error & { status: number }
    err.status = 409
    throw err
  }

  if (input.username) {
    const usernameExists = await repo.findUserByUsername(input.username)
    if (usernameExists) {
      const err = new Error("Username already taken") as Error & { status: number }
      err.status = 409
      throw err
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

  const userData = {
    id: user.id,
    email: user.email || "",
    username: user.username,
    name: user.name,
    role: user.role,
    onboarding_completed: false,
  }

  await cacheUserSession(token, userData)

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

  return {
    accessToken: token,
    expiresInSeconds: getAccessTokenTtlSeconds(),
    refreshToken,
    user: userData,
  }
}

/**
 * Login an existing user with email or username.
 */
export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const identifier = input.identifier
  const user = await repo.findUserByIdentifier(identifier)
  if (!user || !user.password) {
    await verifyPassword(input.password, DUMMY_BCRYPT_HASH)
    auditLogger.log({
      actorId: "unknown",
      action: "AUTH_LOGIN_FAILED",
      status: "FAILURE",
      details: { identifier },
    })
    const err = new Error("Invalid credentials") as Error & { status: number }
    err.status = 401
    throw err
  }

  const valid = await verifyPassword(input.password, user.password)
  if (!valid) {
    auditLogger.log({
      actorId: user.id,
      action: "AUTH_LOGIN_FAILED",
      status: "FAILURE",
      details: { identifier },
    })
    const err = new Error("Invalid credentials") as Error & { status: number }
    err.status = 401
    throw err
  }

  // Transparent background upgrade for legacy 12-round bcrypt hashes
  if (user.password.startsWith("$2a$12$") || user.password.startsWith("$2b$12$")) {
    hashPassword(input.password, DEFAULT_BCRYPT_COST)
      .then((newHash) => repo.updateUserPassword(user.id, newHash))
      .catch(() => {})
  }

  const token = generateToken(user.id, user.role, user.name, user.passwordChangedAt)
  const refreshToken = randomBytes(32).toString("hex")

  const userData = {
    id: user.id,
    user_number: user.userNumber,
    email: user.email || "",
    username: user.username,
    name: user.name,
    role: user.role,
    onboarding_completed: Boolean(user.onboardingCompleted),
  }

  await Promise.all([
    saveRefreshToken(user.id, refreshToken, getRefreshTokenTtlSeconds()),
    cacheUserSession(token, userData),
  ])

  auditLogger.log({
    actorId: user.id,
    actorRole: user.role,
    action: "AUTH_LOGIN_SUCCESS",
    status: "SUCCESS",
    details: { method: "password" },
  })

  return {
    accessToken: token,
    expiresInSeconds: getAccessTokenTtlSeconds(),
    refreshToken,
    user: userData,
  }
}

/**
 * Verify a JWT token and return the associated user with fresh DB data.
 * Checks token revocation, signature, and passwordChangedAt invalidation.
 */
export async function verifyToken(token: string) {
  // 1. Check if token was revoked (logged out)
  const revoked = await isTokenRevoked(token)
  if (revoked) {
    const err = new Error("Session has expired or been revoked") as Error & { status: number }
    err.status = 401
    throw err
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
  }

  const user = await repo.findUserById(payload.userId)
  if (!user) {
    const err = new Error("User not found") as Error & { status: number }
    err.status = 401
    throw err
  }

  // 3. Invalidate if password was changed after token issuance
  if (user.passwordChangedAt) {
    const dbTimeSeconds = Math.floor(user.passwordChangedAt.getTime() / 1000)
    if (!payload.passwordChangedAt || dbTimeSeconds > payload.passwordChangedAt) {
      const err = new Error("Password has been updated. Please sign in again.") as Error & { status: number }
      err.status = 401
      throw err
    }
  }

  const userData = {
    id: user.id,
    user_number: user.userNumber,
    email: user.email,
    username: user.username,
    name: user.name,
    role: user.role,
    onboarding_completed: Boolean(user.onboardingCompleted),
  }

  return userData
}

/**
 * Refreshes an existing session via refresh token rotation (F-23 & FE-01 Remediation).
 */
export async function refreshSession(refreshToken: string): Promise<AuthResult> {
  const record = await verifyAndRotateRefreshTokenRecord(refreshToken)
  if (!record) {
    const err = new Error("Invalid or expired refresh token") as Error & { status: number }
    err.status = 401
    throw err
  }

  const user = await repo.findUserById(record.userId)
  if (!user) {
    const err = new Error("User not found") as Error & { status: number }
    err.status = 401
    throw err
  }

  if (user.passwordChangedAt && record.createdAt < user.passwordChangedAt.getTime()) {
    const err = new Error("Password has been updated. Please sign in again.") as Error & { status: number }
    err.status = 401
    throw err
  }

  const newAccessToken = generateToken(user.id, user.role, user.name, user.passwordChangedAt)
  const newRefreshToken = randomBytes(32).toString("hex")
  await saveRefreshToken(user.id, newRefreshToken, getRefreshTokenTtlSeconds())

  const userData = {
    id: user.id,
    email: user.email || "",
    username: user.username,
    name: user.name,
    role: user.role,
    onboarding_completed: Boolean(user.onboardingCompleted),
  }

  await cacheUserSession(newAccessToken, userData)

  return {
    accessToken: newAccessToken,
    expiresInSeconds: getAccessTokenTtlSeconds(),
    refreshToken: newRefreshToken,
    user: userData,
  }
}

/**
 * Logs out a user by revoking their token and refresh token in Redis / memory.
 */
export async function logoutUser(token?: string, userId?: string, refreshToken?: string) {
  if (token) {
    await revokeToken(token)
  }
  if (refreshToken) {
    await revokeRefreshToken(refreshToken)
  }
  auditLogger.log({
    actorId: userId || "authenticated_user",
    action: "AUTH_LOGOUT",
    status: "SUCCESS",
  })
}

/**
 * Step 1: Initiates forgot password request by validating email and sending a 6-digit OTP.
 */
export async function forgotPasswordRequest(input: ForgotPasswordRequestInput) {
  const normalizedEmail = input.email.toLowerCase().trim()
  const user = await repo.findUserByEmail(normalizedEmail)

  if (!user) {
    // Anti-Enumeration: Return generic success without revealing that email does not exist
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

  await sendForgotPasswordOtpEmail({
    to: normalizedEmail,
    otp,
    name: user.name,
  })

  return {
    success: true,
    message: "If the email is registered, a password recovery code has been sent",
    email: normalizedEmail,
  }
}

/**
 * Step 2: Verifies the 6-digit OTP before allowing password change.
 * F-05 Remediation: Deletes OTP and issues single-use reset token.
 */
export async function forgotPasswordVerifyOtp(input: ForgotPasswordVerifyOtpInput) {
  const normalizedEmail = input.email.toLowerCase().trim()
  const consumed = await consumeForgotPasswordOtp(normalizedEmail, input.otp)
  const payload = consumed || (await getForgotPasswordOtp(normalizedEmail))

  if (!payload) {
    const err = new Error("Invalid or expired OTP") as Error & { status: number }
    err.status = 400
    throw err
  }

  if (!consumed && !timingSafeEqualOtpHash(payload.otpHashed, input.otp)) {
    const attempts = await incrementForgotPasswordOtpAttempts(normalizedEmail)
    if (attempts >= 5) {
      const err = new Error(
        "Too many failed OTP attempts. Challenge invalidated."
      ) as Error & { status: number }
      err.status = 400
      throw err
    }
    const err = new Error("Invalid or expired OTP") as Error & { status: number }
    err.status = 400
    throw err
  }

  // Consume OTP and generate one-time cryptographically random reset token
  await deleteForgotPasswordOtp(normalizedEmail)
  const resetToken = randomBytes(32).toString("hex")
  await savePasswordResetToken(normalizedEmail, payload.userId, resetToken)

  return {
    success: true,
    message: "OTP verified. You may now set a new password.",
    reset_token: resetToken,
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
      const err = new Error("Invalid or expired reset token") as Error & { status: number }
      err.status = 400
      throw err
    }
  } else if (input.otp) {
    // Backwards-compatible fallback
    const consumed = await consumeForgotPasswordOtp(normalizedEmail, input.otp)
    const payload = consumed || (await getForgotPasswordOtp(normalizedEmail))
    if (!payload || (!consumed && !timingSafeEqualOtpHash(payload.otpHashed, input.otp))) {
      const err = new Error("Invalid or expired OTP") as Error & { status: number }
      err.status = 400
      throw err
    }
    targetUserId = payload.userId
    await deleteForgotPasswordOtp(normalizedEmail)
  } else {
    const err = new Error("Reset token or OTP is required") as Error & { status: number }
    err.status = 400
    throw err
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
