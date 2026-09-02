import { redis } from "../../../lib/redis"

export interface RegistrationOtpPayload {
  otp: string
  email: string
  passwordHash: string
  name: string
  username?: string | null
  createdAt: number
}

// In-memory fallback map if Redis is not running
const memoryStore = new Map<string, { payload: RegistrationOtpPayload; timer: NodeJS.Timeout }>()

const OTP_TTL_SECONDS = 300 // 5 minutes

/**
 * Saves pending registration data with OTP.
 */
export async function saveRegistrationOtp(email: string, payload: RegistrationOtpPayload): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim()
  const key = `otp:register:${normalizedEmail}`

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
}

const forgotMemoryStore = new Map<string, { payload: ForgotPasswordOtpPayload; timer: NodeJS.Timeout }>()

export async function saveForgotPasswordOtp(email: string, payload: ForgotPasswordOtpPayload): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim()
  const key = `otp:forgot:${normalizedEmail}`

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

