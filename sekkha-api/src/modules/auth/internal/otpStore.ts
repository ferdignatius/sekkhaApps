import crypto from "crypto"
import { redis } from "../../../lib/redis"

export interface RegistrationOtpPayload {
  otpHashed: string
  email: string
  passwordHash: string
  name: string
  username?: string | null
  createdAt: number
}

export interface ForgotPasswordOtpPayload {
  otpHashed: string
  email: string
  userId: string
  name: string
  createdAt: number
}

const memoryStore = new Map<string, { payload: RegistrationOtpPayload; timer: NodeJS.Timeout; attempts: number }>()
const forgotMemoryStore = new Map<string, { payload: ForgotPasswordOtpPayload; timer: NodeJS.Timeout; attempts: number }>()
const resetTokenStore = new Map<string, { userId: string; tokenHashed: string; timer: NodeJS.Timeout }>()

const OTP_TTL_SECONDS = 300 // 5 minutes
const RESET_TOKEN_TTL_SECONDS = 600 // 10 minutes
export const MAX_OTP_ATTEMPTS = 5

export function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp.trim()).digest("hex")
}

// ─── Registration OTP Store ──────────────────────────────────────────────────

export async function saveRegistrationOtp(
  email: string,
  payload: Omit<RegistrationOtpPayload, "otpHashed"> & { otp: string }
): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim()
  const key = `otp:register:${normalizedEmail}`
  const attemptsKey = `otp:attempts:register:${normalizedEmail}`
  const otpHashed = hashOtp(payload.otp)

  const securePayload: RegistrationOtpPayload = {
    otpHashed,
    email: payload.email,
    passwordHash: payload.passwordHash,
    name: payload.name,
    username: payload.username,
    createdAt: payload.createdAt,
  }

  // 1. Try Redis
  try {
    if (redis.status === "ready" || redis.status === "connect") {
      await redis.set(key, JSON.stringify(securePayload), "EX", OTP_TTL_SECONDS)
      await redis.del(attemptsKey)
      return
    }
  } catch {
    // Non-blocking fallback to memory store
  }

  // 2. Memory Store fallback
  const existing = memoryStore.get(normalizedEmail)
  if (existing?.timer) {
    clearTimeout(existing.timer)
  }

  const timer = setTimeout(() => {
    memoryStore.delete(normalizedEmail)
  }, OTP_TTL_SECONDS * 1000)

  memoryStore.set(normalizedEmail, { payload: securePayload, timer, attempts: 0 })
}

export async function getRegistrationOtp(email: string): Promise<RegistrationOtpPayload | null> {
  const normalizedEmail = email.toLowerCase().trim()
  const key = `otp:register:${normalizedEmail}`

  try {
    if (redis.status === "ready" || redis.status === "connect") {
      const raw = await redis.get(key)
      if (raw) {
        return JSON.parse(raw) as RegistrationOtpPayload
      }
    }
  } catch {
    // Fallback to memory store
  }

  const item = memoryStore.get(normalizedEmail)
  return item ? item.payload : null
}

export async function incrementRegistrationOtpAttempts(email: string): Promise<number> {
  const normalizedEmail = email.toLowerCase().trim()
  const attemptsKey = `otp:attempts:register:${normalizedEmail}`

  try {
    if (redis.status === "ready" || redis.status === "connect") {
      const attempts = await redis.incr(attemptsKey)
      if (attempts === 1) {
        await redis.expire(attemptsKey, OTP_TTL_SECONDS)
      }
      if (attempts >= MAX_OTP_ATTEMPTS) {
        await deleteRegistrationOtp(normalizedEmail)
      }
      return attempts
    }
  } catch {
    // Fallback to memory store
  }

  const item = memoryStore.get(normalizedEmail)
  if (!item) return 0
  item.attempts += 1
  if (item.attempts >= MAX_OTP_ATTEMPTS) {
    await deleteRegistrationOtp(normalizedEmail)
  }
  return item.attempts
}

export async function deleteRegistrationOtp(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim()
  const key = `otp:register:${normalizedEmail}`
  const attemptsKey = `otp:attempts:register:${normalizedEmail}`

  try {
    if (redis.status === "ready" || redis.status === "connect") {
      await redis.del(key, attemptsKey)
    }
  } catch {
    // Ignore
  }

  const item = memoryStore.get(normalizedEmail)
  if (item?.timer) {
    clearTimeout(item.timer)
  }
  memoryStore.delete(normalizedEmail)
}

// ─── Forgot Password OTP Store ────────────────────────────────────────────────

export async function saveForgotPasswordOtp(
  email: string,
  payload: Omit<ForgotPasswordOtpPayload, "otpHashed"> & { otp: string }
): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim()
  const key = `otp:forgot:${normalizedEmail}`
  const attemptsKey = `otp:attempts:forgot:${normalizedEmail}`
  const otpHashed = hashOtp(payload.otp)

  const securePayload: ForgotPasswordOtpPayload = {
    otpHashed,
    email: payload.email,
    userId: payload.userId,
    name: payload.name,
    createdAt: payload.createdAt,
  }

  try {
    if (redis.status === "ready" || redis.status === "connect") {
      await redis.set(key, JSON.stringify(securePayload), "EX", OTP_TTL_SECONDS)
      await redis.del(attemptsKey)
      return
    }
  } catch {
    // Non-blocking fallback
  }

  const existing = forgotMemoryStore.get(normalizedEmail)
  if (existing?.timer) {
    clearTimeout(existing.timer)
  }

  const timer = setTimeout(() => {
    forgotMemoryStore.delete(normalizedEmail)
  }, OTP_TTL_SECONDS * 1000)

  forgotMemoryStore.set(normalizedEmail, { payload: securePayload, timer, attempts: 0 })
}

export async function getForgotPasswordOtp(email: string): Promise<ForgotPasswordOtpPayload | null> {
  const normalizedEmail = email.toLowerCase().trim()
  const key = `otp:forgot:${normalizedEmail}`

  try {
    if (redis.status === "ready" || redis.status === "connect") {
      const raw = await redis.get(key)
      if (raw) {
        return JSON.parse(raw) as ForgotPasswordOtpPayload
      }
    }
  } catch {
    // Fallback
  }

  const item = forgotMemoryStore.get(normalizedEmail)
  return item ? item.payload : null
}

export async function incrementForgotPasswordOtpAttempts(email: string): Promise<number> {
  const normalizedEmail = email.toLowerCase().trim()
  const attemptsKey = `otp:attempts:forgot:${normalizedEmail}`

  try {
    if (redis.status === "ready" || redis.status === "connect") {
      const attempts = await redis.incr(attemptsKey)
      if (attempts === 1) {
        await redis.expire(attemptsKey, OTP_TTL_SECONDS)
      }
      if (attempts >= MAX_OTP_ATTEMPTS) {
        await deleteForgotPasswordOtp(normalizedEmail)
      }
      return attempts
    }
  } catch {
    // Fallback
  }

  const item = forgotMemoryStore.get(normalizedEmail)
  if (!item) return 0
  item.attempts += 1
  if (item.attempts >= MAX_OTP_ATTEMPTS) {
    await deleteForgotPasswordOtp(normalizedEmail)
  }
  return item.attempts
}

export async function deleteForgotPasswordOtp(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim()
  const key = `otp:forgot:${normalizedEmail}`
  const attemptsKey = `otp:attempts:forgot:${normalizedEmail}`

  try {
    if (redis.status === "ready" || redis.status === "connect") {
      await redis.del(key, attemptsKey)
    }
  } catch {
    // Ignore
  }

  const item = forgotMemoryStore.get(normalizedEmail)
  if (item?.timer) {
    clearTimeout(item.timer)
  }
  forgotMemoryStore.delete(normalizedEmail)
}

// ─── Single-Use Password Reset Token Store ───────────────────────────────────

export async function savePasswordResetToken(email: string, userId: string, token: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim()
  const tokenHashed = hashOtp(token)
  const key = `auth:reset-token:${normalizedEmail}`

  try {
    if (redis.status === "ready" || redis.status === "connect") {
      await redis.set(key, JSON.stringify({ userId, tokenHashed }), "EX", RESET_TOKEN_TTL_SECONDS)
      return
    }
  } catch {
    // Fallback
  }

  const existing = resetTokenStore.get(normalizedEmail)
  if (existing?.timer) {
    clearTimeout(existing.timer)
  }
  const timer = setTimeout(() => {
    resetTokenStore.delete(normalizedEmail)
  }, RESET_TOKEN_TTL_SECONDS * 1000)

  resetTokenStore.set(normalizedEmail, { userId, tokenHashed, timer })
}

export async function verifyAndConsumePasswordResetToken(email: string, token: string): Promise<string | null> {
  const normalizedEmail = email.toLowerCase().trim()
  const tokenHashed = hashOtp(token)
  const key = `auth:reset-token:${normalizedEmail}`

  try {
    if (redis.status === "ready" || redis.status === "connect") {
      const raw = await redis.get(key)
      if (raw) {
        const parsed = JSON.parse(raw) as { userId: string; tokenHashed: string }
        if (parsed.tokenHashed === tokenHashed) {
          await redis.del(key)
          return parsed.userId
        }
      }
    }
  } catch {
    // Fallback
  }

  const item = resetTokenStore.get(normalizedEmail)
  if (item && item.tokenHashed === tokenHashed) {
    clearTimeout(item.timer)
    resetTokenStore.delete(normalizedEmail)
    return item.userId
  }

  return null
}
