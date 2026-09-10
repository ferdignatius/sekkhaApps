import { randomInt } from "crypto"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { eventbus, DomainEvents } from "../../../core/eventbus"
import type { UserRegisteredPayload } from "../../../core/eventbus"
import { redis } from "../../../lib/redis"
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
} from "./otpStore"
import { sendRegisterOtpEmail, sendForgotPasswordOtpEmail } from "./email"
import { revokeToken, isTokenRevoked } from "./tokenRevocation"

// ─── Service ─────────────────────────────────────────────────────────────────
// Business logic layer. Orchestrates repository calls + publishes domain events.

export interface AuthResult {
  accessToken: string
  user: { id: string; email: string; username?: string | null; name: string; role: string }
}

const DEFAULT_JWT_EXPIRY = process.env.JWT_EXPIRES_IN || "1d"
const SESSION_TTL_SECONDS = 24 * 60 * 60 // 1 day matching JWT expiration

async function cacheUserSession(token: string, userData: any) {
  try {
    await redis.set(`auth:token:${token}`, JSON.stringify(userData), "EX", SESSION_TTL_SECONDS)
  } catch {
    // Non-blocking fallback if Redis is offline
  }
}

async function getCachedUserSession(token: string) {
  try {
    const raw = await redis.get(`auth:token:${token}`)
    if (raw) {
      return JSON.parse(raw)
    }
  } catch {
    // Fallback on Redis error
  }
  return null
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
    expiresIn: DEFAULT_JWT_EXPIRY as any,
  })
}

/**
 * Initiates user registration by validating input and sending a 6-digit OTP to email.
 */
export async function requestRegisterOtp(input: RequestRegisterOtpInput) {
  const normalizedEmail = input.email.toLowerCase().trim()

  // 1. Check if email already registered
  const emailExists = await repo.findUserByEmail(normalizedEmail)
  if (emailExists) {
    const err = new Error("Email sudah terdaftar. Silakan masuk ke akun Anda.") as Error & { status: number }
    err.status = 409
    throw err
  }

  // 2. Check if username already taken (if provided)
  if (input.username) {
    const usernameExists = await repo.findUserByUsername(input.username)
    if (usernameExists) {
      const err = new Error("Username sudah digunakan. Pilih username lain.") as Error & { status: number }
      err.status = 409
      throw err
    }
  }

  // 3. Generate 6-digit OTP code with CSPRNG & password hash
  const otp = randomInt(100000, 1000000).toString()
  const passwordHash = await bcrypt.hash(input.password, 10)
  const name = input.name || normalizedEmail.split("@")[0]

  // 4. Save to OTP cache store (TTL 5 minutes)
  await saveRegistrationOtp(normalizedEmail, {
    otp,
    email: normalizedEmail,
    passwordHash,
    name,
    username: input.username || null,
    createdAt: Date.now(),
    attempts: 0,
  })

  // 5. Send OTP email via Resend
  await sendRegisterOtpEmail({
    to: normalizedEmail,
    otp,
    name,
  })

  return {
    success: true,
    message: `Kode verifikasi OTP telah dikirim ke ${normalizedEmail}`,
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

  if (payload.otp !== input.otp.trim()) {
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
  const userData = {
    id: user.id,
    email: user.email || "",
    username: user.username,
    name: user.name,
    role: user.role,
  }

  await cacheUserSession(token, userData)

  // Publish domain event
  eventbus.publish<UserRegisteredPayload>(DomainEvents.USER_REGISTERED, {
    userId: user.id,
    email: user.email || "",
    name: user.name,
  })

  return {
    accessToken: token,
    user: userData,
  }
}

/**
 * Resends a new 6-digit OTP code to the user's email.
 */
export async function resendRegisterOtp(input: ResendOtpInput) {
  const normalizedEmail = input.email.toLowerCase().trim()

  // 1. Check if user already registered
  const emailExists = await repo.findUserByEmail(normalizedEmail)
  if (emailExists) {
    const err = new Error("Email sudah terdaftar. Silakan masuk ke akun Anda.") as Error & { status: number }
    err.status = 409
    throw err
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
  payload.otp = newOtp
  payload.attempts = 0
  payload.createdAt = Date.now()

  await saveRegistrationOtp(normalizedEmail, payload)

  await sendRegisterOtpEmail({
    to: normalizedEmail,
    otp: newOtp,
    name: payload.name,
  })

  return {
    success: true,
    message: `Kode OTP baru telah dikirim ke ${normalizedEmail}`,
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

  const hashedPassword = await bcrypt.hash(input.password, 10)
  const user = await repo.createUser({
    email: input.email,
    username: input.username ?? undefined,
    name: input.name,
    password: hashedPassword,
  })

  const token = generateToken(user.id, user.role, user.name, user.passwordChangedAt)
  const userData = {
    id: user.id,
    email: user.email || "",
    username: user.username,
    name: user.name,
    role: user.role,
  }

  await cacheUserSession(token, userData)

  // ── Publish domain event ──────────────────────────────────────────────
  eventbus.publish<UserRegisteredPayload>(DomainEvents.USER_REGISTERED, {
    userId: user.id,
    email: user.email || "",
    name: user.name,
  })

  return {
    accessToken: token,
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
    const err = new Error("Email/Username atau password salah") as Error & { status: number }
    err.status = 401
    throw err
  }

  const valid = await bcrypt.compare(input.password, user.password)
  if (!valid) {
    const err = new Error("Email/Username atau password salah") as Error & { status: number }
    err.status = 401
    throw err
  }

  const token = generateToken(user.id, user.role, user.name, user.passwordChangedAt)
  const userData = {
    id: user.id,
    email: user.email || "",
    username: user.username,
    name: user.name,
    role: user.role,
  }

  await cacheUserSession(token, userData)

  return {
    accessToken: token,
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

  // 2. Fallback to JWT verification & DB lookup
  const payload = jwt.verify(token, getJwtSecret()) as {
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
    role: user.role, // Fresh from DB
  }

  return userData
}

/**
 * Logs out a user by revoking their token in Redis / memory.
 */
export async function logoutUser(token: string) {
  await revokeToken(token)
}

/**
 * Step 1: Initiates forgot password request by validating email and sending a 6-digit OTP.
 */
export async function forgotPasswordRequest(input: ForgotPasswordRequestInput) {
  const normalizedEmail = input.email.toLowerCase().trim()
  const user = await repo.findUserByEmail(normalizedEmail)

  if (!user) {
    const err = new Error("Email tidak terdaftar di sistem Sekkha.") as Error & { status: number }
    err.status = 404
    throw err
  }

  const otp = randomInt(100000, 1000000).toString()

  await saveForgotPasswordOtp(normalizedEmail, {
    otp,
    email: normalizedEmail,
    userId: user.id,
    name: user.name,
    createdAt: Date.now(),
    attempts: 0,
  })

  await sendForgotPasswordOtpEmail({
    to: normalizedEmail,
    otp,
    name: user.name,
  })

  return {
    success: true,
    message: `Kode OTP pemulihan kata sandi telah dikirim ke ${normalizedEmail}`,
    email: normalizedEmail,
  }
}

/**
 * Step 2: Verifies the 6-digit OTP before allowing password change.
 */
export async function forgotPasswordVerifyOtp(input: ForgotPasswordVerifyOtpInput) {
  const normalizedEmail = input.email.toLowerCase().trim()
  const payload = await getForgotPasswordOtp(normalizedEmail)

  if (!payload) {
    const err = new Error("Kode OTP telah kedaluwarsa atau belum diminta. Silakan ajukan ulang.") as Error & { status: number }
    err.status = 400
    throw err
  }

  if (payload.otp !== input.otp.trim()) {
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

  return {
    success: true,
    message: "Kode OTP valid.",
  }
}

/**
 * Step 3: Sets a new password after verifying OTP.
 */
export async function resetPassword(input: ResetPasswordInput) {
  const normalizedEmail = input.email.toLowerCase().trim()
  const payload = await getForgotPasswordOtp(normalizedEmail)

  if (!payload) {
    const err = new Error("Sesi pemulihan telah kedaluwarsa. Silakan ajukan ulang dari awal.") as Error & { status: number }
    err.status = 400
    throw err
  }

  if (payload.otp !== input.otp.trim()) {
    const attempts = await incrementForgotPasswordOtpAttempts(normalizedEmail)
    if (attempts >= 5) {
      const err = new Error(
        "Kode OTP salah sebanyak 5 kali. Sesi pemulihan kata sandi telah dibatalkan demi keamanan. Silakan ajukan ulang dari awal."
      ) as Error & { status: number }
      err.status = 400
      throw err
    }
    const remaining = 5 - attempts
    const err = new Error(
      `Kode OTP tidak cocok. Sisa percobaan: ${remaining} kali.`
    ) as Error & { status: number }
    err.status = 400
    throw err
  }

  const hashedPassword = await bcrypt.hash(input.newPassword, 10)
  await repo.updateUserPassword(payload.userId, hashedPassword)

  // Delete consumed OTP
  await deleteForgotPasswordOtp(normalizedEmail)

  return {
    success: true,
    message: "Kata sandi Anda berhasil diperbarui. Silakan masuk dengan kata sandi baru Anda.",
  }
}

/**
 * Legacy forgot password handler (backward compatibility).
 */
export async function forgotPassword(input: ForgotPasswordInput) {
  const user = await repo.findUserByIdentifier(input.identifier)
  return {
    success: true,
    userFound: Boolean(user),
    message: "Permintaan pemulihan kata sandi telah diproses. Silakan hubungi admin/pengurus vihara atau cek email Anda.",
  }
}
