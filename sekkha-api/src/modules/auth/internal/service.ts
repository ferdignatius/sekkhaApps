import { randomInt, randomBytes, createHash } from "crypto"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { eventbus, DomainEvents } from "../../../core/eventbus"
import type { UserRegisteredPayload } from "../../../core/eventbus"
import { redis } from "../../../lib/redis"
import { auditLogger } from "../../../lib/auditLogger"
import * as repo from "./repository"
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
} from "./validation"
import {
  saveRegistrationOtp,
  getRegistrationOtp,
  deleteRegistrationOtp,
  incrementRegistrationOtpAttempts,
  saveForgotPasswordOtp,
  getForgotPasswordOtp,
  deleteForgotPasswordOtp,
  incrementForgotPasswordOtpAttempts,
  savePasswordResetToken,
  verifyAndConsumePasswordResetToken,
  hashOtp,
} from "./otpStore"
import {
  saveRefreshToken,
  verifyAndRotateRefreshToken,
  revokeRefreshToken,
} from "./refreshTokenStore"
import { sendRegisterOtpEmail, sendForgotPasswordOtpEmail } from "./email"
import { revokeToken, isTokenRevoked } from "./tokenRevocation"

// ─── Service ─────────────────────────────────────────────────────────────────
// Business logic layer. Orchestrates repository calls + publishes domain events.

export interface AuthResult {
  accessToken: string
  expiresInSeconds: number
  refreshToken?: string
  user: { id: string; email: string; username?: string | null; name: string; role: string }
}

function getJwtExpiry(): string {
  return process.env.JWT_EXPIRES_IN || "15m" // 15m short-lived access token
}

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60 // 15 minutes
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60 // 7 days

function hashSessionKey(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex")
}

async function cacheUserSession(token: string, userData: any) {
  try {
    const key = `auth:session:${hashSessionKey(token)}`
    await redis.set(key, JSON.stringify(userData), "EX", ACCESS_TOKEN_TTL_SECONDS)
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

function generateToken(
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

  // 1. Check if email already registered (Anti-Enumeration: return generic message)
  const emailExists = await repo.findUserByEmail(normalizedEmail)
  if (emailExists) {
    return {
      success: true,
      message: `Jika data pendaftaran valid, kode verifikasi OTP telah dikirimkan ke ${normalizedEmail}`,
      email: normalizedEmail,
    }
  }

  // 2. Check if username already taken (if provided)
  if (input.username) {
    const usernameExists = await repo.findUserByUsername(input.username)
    if (usernameExists) {
      return {
        success: true,
        message: `Jika data pendaftaran valid, kode verifikasi OTP telah dikirimkan ke ${normalizedEmail}`,
        email: normalizedEmail,
      }
    }
  }

  // 3. Generate 6-digit OTP code with CSPRNG & password hash
  const otp = randomInt(100000, 1000000).toString()
  const passwordHash = await bcrypt.hash(input.password, 12)
  const name = input.name || normalizedEmail.split("@")[0]

  // 4. Save to OTP cache store (TTL 5 minutes)
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
    message: `Jika data pendaftaran valid, kode verifikasi OTP telah dikirimkan ke ${normalizedEmail}`,
    email: normalizedEmail,
  }
}

/**
 * Verifies 6-digit OTP and creates the user account in database.
 */
export async function verifyRegisterOtp(input: VerifyRegisterOtpInput): Promise<AuthResult> {
  const normalizedEmail = input.email.toLowerCase().trim()
  const payload = await getRegistrationOtp(normalizedEmail)

  if (!payload) {
    const err = new Error("Kode OTP telah kedaluwarsa atau belum diminta. Silakan daftar kembali.") as Error & { status: number }
    err.status = 400
    throw err
  }

  if (payload.otpHashed !== hashOtp(input.otp)) {
    const attempts = await incrementRegistrationOtpAttempts(normalizedEmail)
    if (attempts >= 5) {
      const err = new Error(
        "Kode OTP salah sebanyak 5 kali. Kode OTP telah dibatalkan demi keamanan akun Anda. Silakan daftar kembali."
      ) as Error & { status: number }
      err.status = 400
      throw err
    }
    const remaining = 5 - attempts
    const err = new Error(
      `Kode OTP tidak cocok. Sisa percobaan: ${remaining} kali. Periksa kembali email Anda.`
    ) as Error & { status: number }
    err.status = 400
    throw err
  }

  // Double check if account was registered concurrently
  const emailExists = await repo.findUserByEmail(normalizedEmail)
  if (emailExists) {
    await deleteRegistrationOtp(normalizedEmail)
    const err = new Error("Email sudah terdaftar. Silakan masuk ke akun Anda.") as Error & { status: number }
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
  await saveRefreshToken(user.id, refreshToken, REFRESH_TOKEN_TTL_SECONDS)

  const userData = {
    id: user.id,
    email: user.email || "",
    username: user.username,
    name: user.name,
    role: user.role,
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
    expiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
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
      message: `Jika email belum terdaftar, kode OTP telah dikirim ulang ke ${normalizedEmail}`,
    }
  }

  const payload = await getRegistrationOtp(normalizedEmail)
  if (!payload) {
    const err = new Error(
      "Sesi pendaftaran tidak ditemukan atau telah kedaluwarsa. Silakan lakukan pendaftaran dari awal."
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
    message: `Jika email belum terdaftar, kode OTP telah dikirim ulang ke ${normalizedEmail}`,
  }
}

/**
 * Legacy/Direct Register an existing user (backward compatibility).
 */
export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  const emailExists = await repo.findUserByEmail(input.email)
  if (emailExists) {
    const err = new Error("Email sudah terdaftar") as Error & { status: number }
    err.status = 409
    throw err
  }

  if (input.username) {
    const usernameExists = await repo.findUserByUsername(input.username)
    if (usernameExists) {
      const err = new Error("Username sudah digunakan") as Error & { status: number }
      err.status = 409
      throw err
    }
  }

  const hashedPassword = await bcrypt.hash(input.password, 12)
  const user = await repo.createUser({
    email: input.email,
    username: input.username ?? undefined,
    name: input.name,
    password: hashedPassword,
  })

  const token = generateToken(user.id, user.role, user.name, user.passwordChangedAt)
  const refreshToken = randomBytes(32).toString("hex")
  await saveRefreshToken(user.id, refreshToken, REFRESH_TOKEN_TTL_SECONDS)

  const userData = {
    id: user.id,
    email: user.email || "",
    username: user.username,
    name: user.name,
    role: user.role,
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
    expiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
    refreshToken,
    user: userData,
  }
}

/**
 * Login an existing user with email or username.
 */
export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const identifier = input.identifier || input.email || input.username || ""
  const user = await repo.findUserByIdentifier(identifier)
  if (!user || !user.password) {
    auditLogger.log({
      actorId: "unknown",
      action: "AUTH_LOGIN_FAILED",
      status: "FAILURE",
      details: { identifier },
    })
    const err = new Error("Email/Username atau password salah") as Error & { status: number }
    err.status = 401
    throw err
  }

  const valid = await bcrypt.compare(input.password, user.password)
  if (!valid) {
    auditLogger.log({
      actorId: user.id,
      action: "AUTH_LOGIN_FAILED",
      status: "FAILURE",
      details: { identifier },
    })
    const err = new Error("Email/Username atau password salah") as Error & { status: number }
    err.status = 401
    throw err
  }

  const token = generateToken(user.id, user.role, user.name, user.passwordChangedAt)
  const refreshToken = randomBytes(32).toString("hex")
  await saveRefreshToken(user.id, refreshToken, REFRESH_TOKEN_TTL_SECONDS)

  const userData = {
    id: user.id,
    email: user.email || "",
    username: user.username,
    name: user.name,
    role: user.role,
  }

  await cacheUserSession(token, userData)

  auditLogger.log({
    actorId: user.id,
    actorRole: user.role,
    action: "AUTH_LOGIN_SUCCESS",
    status: "SUCCESS",
    details: { method: "password" },
  })

  return {
    accessToken: token,
    expiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
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
    const err = new Error("Sesi telah berakhir atau dibatalkan") as Error & { status: number }
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
    const err = new Error("User tidak ditemukan") as Error & { status: number }
    err.status = 401
    throw err
  }

  // 3. Invalidate if password was changed after token issuance
  if (user.passwordChangedAt) {
    const dbTimeSeconds = Math.floor(user.passwordChangedAt.getTime() / 1000)
    if (!payload.passwordChangedAt || dbTimeSeconds > payload.passwordChangedAt) {
      const err = new Error("Kata sandi telah diperbarui. Silakan masuk kembali.") as Error & { status: number }
      err.status = 401
      throw err
    }
  }

  const userData = {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    role: user.role,
  }

  return userData
}

/**
 * Refreshes an existing session via refresh token rotation (F-23 & FE-01 Remediation).
 */
export async function refreshSession(refreshToken: string): Promise<AuthResult> {
  const userId = await verifyAndRotateRefreshToken(refreshToken)
  if (!userId) {
    const err = new Error("Sesi telah kedaluwarsa atau token tidak valid. Silakan login kembali.") as Error & { status: number }
    err.status = 401
    throw err
  }

  const user = await repo.findUserById(userId)
  if (!user) {
    const err = new Error("Akun pengguna tidak ditemukan") as Error & { status: number }
    err.status = 401
    throw err
  }

  const newAccessToken = generateToken(user.id, user.role, user.name, user.passwordChangedAt)
  const newRefreshToken = randomBytes(32).toString("hex")
  await saveRefreshToken(user.id, newRefreshToken, REFRESH_TOKEN_TTL_SECONDS)

  const userData = {
    id: user.id,
    email: user.email || "",
    username: user.username,
    name: user.name,
    role: user.role,
  }

  await cacheUserSession(newAccessToken, userData)

  return {
    accessToken: newAccessToken,
    expiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
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
      message: `Jika email terdaftar di sistem kami, kode pemulihan kata sandi telah dikirim ke ${normalizedEmail}`,
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
    message: `Jika email terdaftar di sistem kami, kode pemulihan kata sandi telah dikirim ke ${normalizedEmail}`,
    email: normalizedEmail,
  }
}

/**
 * Step 2: Verifies the 6-digit OTP before allowing password change.
 * F-05 Remediation: Deletes OTP and issues single-use reset token.
 */
export async function forgotPasswordVerifyOtp(input: ForgotPasswordVerifyOtpInput) {
  const normalizedEmail = input.email.toLowerCase().trim()
  const payload = await getForgotPasswordOtp(normalizedEmail)

  if (!payload) {
    const err = new Error("Kode OTP telah kedaluwarsa atau belum diminta. Silakan ajukan ulang.") as Error & { status: number }
    err.status = 400
    throw err
  }

  if (payload.otpHashed !== hashOtp(input.otp)) {
    const attempts = await incrementForgotPasswordOtpAttempts(normalizedEmail)
    if (attempts >= 5) {
      const err = new Error(
        "Kode OTP salah sebanyak 5 kali. Kode OTP telah dibatalkan demi keamanan akun Anda. Silakan ajukan pemulihan kata sandi ulang."
      ) as Error & { status: number }
      err.status = 400
      throw err
    }
    const remaining = 5 - attempts
    const err = new Error(
      `Kode OTP tidak cocok. Sisa percobaan: ${remaining} kali. Periksa kembali email Anda.`
    ) as Error & { status: number }
    err.status = 400
    throw err
  }

  // Consume OTP and generate one-time cryptographically random reset token
  await deleteForgotPasswordOtp(normalizedEmail)
  const resetToken = randomBytes(32).toString("hex")
  await savePasswordResetToken(normalizedEmail, payload.userId, resetToken)

  return {
    success: true,
    message: "Kode OTP valid. Silakan atur kata sandi baru Anda.",
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
      const err = new Error("Token pemulihan kata sandi tidak valid atau telah kedaluwarsa. Silakan ajukan ulang.") as Error & { status: number }
      err.status = 400
      throw err
    }
  } else if (input.otp) {
    // Backwards-compatible fallback
    const payload = await getForgotPasswordOtp(normalizedEmail)
    if (!payload || payload.otpHashed !== hashOtp(input.otp)) {
      const err = new Error("Kode OTP salah atau sesi telah kedaluwarsa.") as Error & { status: number }
      err.status = 400
      throw err
    }
    targetUserId = payload.userId
    await deleteForgotPasswordOtp(normalizedEmail)
  } else {
    const err = new Error("Token pemulihan atau kode OTP wajib disertakan.") as Error & { status: number }
    err.status = 400
    throw err
  }

  const hashedPassword = await bcrypt.hash(input.newPassword, 12)
  await repo.updateUserPassword(targetUserId, hashedPassword)

  auditLogger.log({
    actorId: targetUserId,
    action: "AUTH_PASSWORD_RESET",
    status: "SUCCESS",
  })

  return {
    success: true,
    message: "Kata sandi Anda berhasil diperbarui. Silakan masuk dengan kata sandi baru Anda.",
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
    message: "Permintaan pemulihan kata sandi telah diproses. Silakan cek email Anda.",
  }
}
