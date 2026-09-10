import { redis } from "../../../lib/redis"

export interface RegistrationOtpPayload {
  otp: string
  email: string
  passwordHash: string
  name: string
  username?: string | null
  createdAt: number
  attempts?: number
}

// In-memory fallback map if Redis is not running
const memoryStore = new Map<string, { payload: RegistrationOtpPayload; timer: NodeJS.Timeout }>()

const OTP_TTL_SECONDS = 300 // 5 minutes
export const MAX_OTP_ATTEMPTS = 5

/**
 * Saves pending registration data with OTP.
 */
export async function saveRegistrationOtp(email: string, payload: RegistrationOtpPayload): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim()
  const key = `otp:register:${normalizedEmail}`
  payload.attempts = payload.attempts ?? 0

  // 1. Try Redis first
  try {
    if (redis.status === "ready" || redis.status === "connect") {
      await redis.set(key, JSON.stringify(payload), "EX", OTP_TTL_SECONDS)
      return
    }
  } catch (err) {
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

  memoryStore.set(normalizedEmail, { payload, timer })
}

/**
 * Retrieves pending registration data with OTP.
 */
export async function getRegistrationOtp(email: string): Promise<RegistrationOtpPayload | null> {
  const normalizedEmail = email.toLowerCase().trim()
  const key = `otp:register:${normalizedEmail}`

  // 1. Try Redis first
  try {
    if (redis.status === "ready" || redis.status === "connect") {
      const raw = await redis.get(key)
      if (raw) {
        return JSON.parse(raw) as RegistrationOtpPayload
      }
    }
  } catch (err) {
    // Fallback to memory store
  }

  // 2. Check Memory Store
  const item = memoryStore.get(normalizedEmail)
  return item ? item.payload : null
}

/**
 * Increments failed OTP verification attempts for registration.
 * If attempts reach MAX_OTP_ATTEMPTS (5), the OTP is immediately deleted to prevent brute-force.
 * Returns the updated attempt count.
 */
export async function incrementRegistrationOtpAttempts(email: string): Promise<number> {
  const normalizedEmail = email.toLowerCase().trim()
  const key = `otp:register:${normalizedEmail}`

  const payload = await getRegistrationOtp(normalizedEmail)
  if (!payload) return 0

  payload.attempts = (payload.attempts ?? 0) + 1

  if (payload.attempts >= MAX_OTP_ATTEMPTS) {
    await deleteRegistrationOtp(normalizedEmail)
    return payload.attempts
  }

  // Update in Redis preserving remaining TTL
  try {
    if (redis.status === "ready" || redis.status === "connect") {
      const ttl = await redis.ttl(key)
      if (ttl > 0) {
        await redis.set(key, JSON.stringify(payload), "EX", ttl)
      } else {
        await redis.set(key, JSON.stringify(payload), "EX", OTP_TTL_SECONDS)
      }
    }
  } catch (err) {
    // Fallback
  }

  // Update in Memory Store preserving existing timer
  const existing = memoryStore.get(normalizedEmail)
  if (existing) {
    memoryStore.set(normalizedEmail, { payload, timer: existing.timer })
  }

  return payload.attempts
}

/**
 * Deletes OTP entry upon successful verification.
 */
export async function deleteRegistrationOtp(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim()
  const key = `otp:register:${normalizedEmail}`

  try {
    if (redis.status === "ready" || redis.status === "connect") {
      await redis.del(key)
    }
  } catch (err) {
    // Ignore
  }

  const item = memoryStore.get(normalizedEmail)
  if (item?.timer) {
    clearTimeout(item.timer)
  }
  memoryStore.delete(normalizedEmail)
}

// ─── Forgot Password OTP Store ────────────────────────────────────────────────

export interface ForgotPasswordOtpPayload {
  otp: string
  email: string
  userId: string
  name: string
  createdAt: number
  attempts?: number
}

const forgotMemoryStore = new Map<string, { payload: ForgotPasswordOtpPayload; timer: NodeJS.Timeout }>()

export async function saveForgotPasswordOtp(email: string, payload: ForgotPasswordOtpPayload): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim()
  const key = `otp:forgot:${normalizedEmail}`
  payload.attempts = payload.attempts ?? 0

  try {
    if (redis.status === "ready" || redis.status === "connect") {
      await redis.set(key, JSON.stringify(payload), "EX", OTP_TTL_SECONDS)
      return
    }
  } catch (err) {
    // Non-blocking fallback
  }

  const existing = forgotMemoryStore.get(normalizedEmail)
  if (existing?.timer) {
    clearTimeout(existing.timer)
  }

  const timer = setTimeout(() => {
    forgotMemoryStore.delete(normalizedEmail)
  }, OTP_TTL_SECONDS * 1000)

  forgotMemoryStore.set(normalizedEmail, { payload, timer })
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
  } catch (err) {
    // Fallback
  }

  const item = forgotMemoryStore.get(normalizedEmail)
  return item ? item.payload : null
}

/**
 * Increments failed OTP verification attempts for forgot password.
 * If attempts reach MAX_OTP_ATTEMPTS (5), the OTP is immediately deleted to prevent brute-force.
 * Returns the updated attempt count.
 */
export async function incrementForgotPasswordOtpAttempts(email: string): Promise<number> {
  const normalizedEmail = email.toLowerCase().trim()
  const key = `otp:forgot:${normalizedEmail}`

  const payload = await getForgotPasswordOtp(normalizedEmail)
  if (!payload) return 0

  payload.attempts = (payload.attempts ?? 0) + 1

  if (payload.attempts >= MAX_OTP_ATTEMPTS) {
    await deleteForgotPasswordOtp(normalizedEmail)
    return payload.attempts
  }

  // Update in Redis preserving remaining TTL
  try {
    if (redis.status === "ready" || redis.status === "connect") {
      const ttl = await redis.ttl(key)
      if (ttl > 0) {
        await redis.set(key, JSON.stringify(payload), "EX", ttl)
      } else {
        await redis.set(key, JSON.stringify(payload), "EX", OTP_TTL_SECONDS)
      }
    }
  } catch (err) {
    // Fallback
  }

  // Update in Memory Store preserving existing timer
  const existing = forgotMemoryStore.get(normalizedEmail)
  if (existing) {
    forgotMemoryStore.set(normalizedEmail, { payload, timer: existing.timer })
  }

  return payload.attempts
}

export async function deleteForgotPasswordOtp(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim()
  const key = `otp:forgot:${normalizedEmail}`

  try {
    if (redis.status === "ready" || redis.status === "connect") {
      await redis.del(key)
    }
  } catch (err) {
    // Ignore
  }

  const item = forgotMemoryStore.get(normalizedEmail)
  if (item?.timer) {
    clearTimeout(item.timer)
  }
  forgotMemoryStore.delete(normalizedEmail)
}

