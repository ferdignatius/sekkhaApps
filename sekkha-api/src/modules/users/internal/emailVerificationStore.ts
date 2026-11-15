import crypto from "crypto"
import { AppError } from "../../../lib/AppError"
import { redis } from "../../../lib/redis"

export interface EmailVerificationChallenge {
  otpHashed: string
  newEmail: string
  userId: string
  createdAt: number
}

interface MemoryEntry {
  challenge: EmailVerificationChallenge
  attempts: number
  timer: NodeJS.Timeout
}

const memoryStore = new Map<string, MemoryEntry>()
const cooldownMemoryStore = new Map<string, number>()

const OTP_TTL_SECONDS = 600 // 10 minutes
const COOLDOWN_SECONDS = 60 // 60 seconds
export const MAX_VERIFY_ATTEMPTS = 5

const VERIFY_AND_CONSUME_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then return nil end
local expected = ARGV[1]
local marker = '"otpHashed":"' .. expected .. '"'
if string.find(raw, marker, 1, true) then
  redis.call('DEL', KEYS[1], KEYS[2])
  return raw
end
local attempts = redis.call('INCR', KEYS[2])
if attempts == 1 then
  redis.call('EXPIRE', KEYS[2], tonumber(ARGV[3]))
end
local maxAttempts = tonumber(ARGV[2])
if attempts >= maxAttempts then
  redis.call('DEL', KEYS[1], KEYS[2])
  return "__MAX_ATTEMPTS__"
end
return "__MISMATCH__:" .. tostring(attempts)
`

function requireSharedStore(): void {
  if (process.env.NODE_ENV === "production" && redis.status !== "ready") {
    throw new AppError(
      "Shared OTP store is temporarily unavailable.",
      503,
      "SHARED_STORE_UNAVAILABLE"
    )
  }
}

function clearMemoryEntries(userId: string): void {
  const existing = memoryStore.get(userId)
  if (existing?.timer) {
    clearTimeout(existing.timer)
  }
  memoryStore.delete(userId)
  cooldownMemoryStore.delete(userId)
}

function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp.trim()).digest("hex")
}

function timingSafeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8")
  const bufB = Buffer.from(b, "utf8")
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

export const emailVerificationStore = {
  /**
   * Checks if user is currently in cooldown period.
   * Returns remaining seconds if in cooldown, or 0 if allowed.
   */
  async getCooldownRemaining(userId: string): Promise<number> {
    requireSharedStore()
    const key = `otp:email-verify:cooldown:${userId}`

    if (redis.status === "ready") {
      try {
        const ttl = await redis.ttl(key)
        return ttl > 0 ? ttl : 0
      } catch {
        if (process.env.NODE_ENV === "production") {
          throw new AppError(
            "Shared OTP store is temporarily unavailable.",
            503,
            "SHARED_STORE_UNAVAILABLE"
          )
        }
        return 0
      }
    }

    const expiresAt = cooldownMemoryStore.get(userId)
    if (expiresAt) {
      const remaining = Math.ceil((expiresAt - Date.now()) / 1000)
      if (remaining > 0) return remaining
      cooldownMemoryStore.delete(userId)
    }
    return 0
  },

  /**
   * Saves a new email verification challenge.
   */
  async saveChallenge(userId: string, newEmail: string, otp: string): Promise<void> {
    requireSharedStore()
    const challengeKey = `otp:email-verify:${userId}`
    const cooldownKey = `otp:email-verify:cooldown:${userId}`
    const attemptsKey = `otp:email-verify:attempts:${userId}`
    const otpHashed = hashOtp(otp)

    const challenge: EmailVerificationChallenge = {
      otpHashed,
      newEmail: newEmail.toLowerCase().trim(),
      userId,
      createdAt: Date.now(),
    }

    if (redis.status === "ready") {
      try {
        await redis.set(challengeKey, JSON.stringify(challenge), "EX", OTP_TTL_SECONDS)
        await redis.set(cooldownKey, "1", "EX", COOLDOWN_SECONDS)
        await redis.del(attemptsKey)
        clearMemoryEntries(userId)
        return
      } catch {
        if (process.env.NODE_ENV === "production") {
          throw new AppError(
            "Shared OTP store is temporarily unavailable.",
            503,
            "SHARED_STORE_UNAVAILABLE"
          )
        }
      }
    }

    // Development/test fallback to memory
    const existing = memoryStore.get(userId)
    if (existing?.timer) {
      clearTimeout(existing.timer)
    }

    const timer = setTimeout(() => {
      memoryStore.delete(userId)
    }, OTP_TTL_SECONDS * 1000)
    timer.unref?.()

    memoryStore.set(userId, { challenge, attempts: 0, timer })
    cooldownMemoryStore.set(userId, Date.now() + COOLDOWN_SECONDS * 1000)
  },

  /**
   * Clears challenge, attempt counter, and cooldown state for rollback on delivery failure.
   */
  async clearChallenge(userId: string): Promise<void> {
    clearMemoryEntries(userId)
    if (redis.status === "ready") {
      const challengeKey = `otp:email-verify:${userId}`
      const cooldownKey = `otp:email-verify:cooldown:${userId}`
      const attemptsKey = `otp:email-verify:attempts:${userId}`
      await redis.del(challengeKey, cooldownKey, attemptsKey).catch(() => {})
    }
  },

  /**
   * Retrieves pending email for user if challenge is still active.
   */
  async getPendingEmail(userId: string): Promise<string | null> {
    requireSharedStore()
    const challengeKey = `otp:email-verify:${userId}`

    if (redis.status === "ready") {
      try {
        const raw = await redis.get(challengeKey)
        if (!raw) return null
        const parsed = JSON.parse(raw) as EmailVerificationChallenge
        return parsed.newEmail
      } catch {
        if (process.env.NODE_ENV === "production") {
          throw new AppError(
            "Shared OTP store is temporarily unavailable.",
            503,
            "SHARED_STORE_UNAVAILABLE"
          )
        }
        return null
      }
    }

    const entry = memoryStore.get(userId)
    return entry ? entry.challenge.newEmail : null
  },

  /**
   * Verifies the 6-digit OTP code against the stored challenge.
   * Enforces max 5 attempts with automatic challenge cancellation on 5th failure.
   */
  async verifyAndConsume(
    userId: string,
    inputOtp: string
  ): Promise<{ success: boolean; newEmail?: string; error?: string; remainingAttempts?: number }> {
    requireSharedStore()
    const challengeKey = `otp:email-verify:${userId}`
    const attemptsKey = `otp:email-verify:attempts:${userId}`
    const inputHash = hashOtp(inputOtp)

    if (redis.status === "ready") {
      try {
        const raw = (await redis.eval(
          VERIFY_AND_CONSUME_SCRIPT,
          2,
          challengeKey,
          attemptsKey,
          inputHash,
          String(MAX_VERIFY_ATTEMPTS),
          String(OTP_TTL_SECONDS)
        )) as string | null

        if (!raw) {
          return {
            success: false,
            error: "Verification code has expired or was not requested. Please request a new code.",
          }
        }

        if (raw === "__MAX_ATTEMPTS__") {
          return {
            success: false,
            error:
              "Verification code was incorrect 5 times. The email verification request was canceled for security. Please request a new code.",
            remainingAttempts: 0,
          }
        }

        if (raw === "__MISMATCH__" || raw.startsWith("__MISMATCH__:")) {
          const attempts = raw.includes(":") ? parseInt(raw.split(":")[1] || "", 10) : NaN
          if (!Number.isNaN(attempts) && attempts > 0) {
            const remaining = Math.max(0, MAX_VERIFY_ATTEMPTS - attempts)
            return {
              success: false,
              error: `Verification code does not match. Remaining attempts: ${remaining}.`,
              remainingAttempts: remaining,
            }
          }
          return {
            success: false,
            error: "Verification code does not match.",
          }
        }

        const challenge = JSON.parse(raw) as EmailVerificationChallenge
        if (!challenge?.otpHashed || !timingSafeEqualHex(challenge.otpHashed, inputHash)) {
          return {
            success: false,
            error: "Verification code does not match.",
          }
        }

        return { success: true, newEmail: challenge.newEmail }
      } catch {
        if (process.env.NODE_ENV === "production") {
          throw new AppError(
            "Shared OTP store is temporarily unavailable.",
            503,
            "SHARED_STORE_UNAVAILABLE"
          )
        }
        return {
          success: false,
          error: "Verification code has expired or was not requested. Please request a new code.",
        }
      }
    }

    // Synchronous atomic fallback: Memory store
    const entry = memoryStore.get(userId)
    if (!entry) {
      return {
        success: false,
        error: "Verification code has expired or was not requested. Please request a new code.",
      }
    }

    if (!timingSafeEqualHex(entry.challenge.otpHashed, inputHash)) {
      entry.attempts += 1
      if (entry.attempts >= MAX_VERIFY_ATTEMPTS) {
        clearTimeout(entry.timer)
        memoryStore.delete(userId)
        return {
          success: false,
          error:
            "Verification code was incorrect 5 times. The email verification request was canceled for security. Please request a new code.",
          remainingAttempts: 0,
        }
      }
      const remaining = MAX_VERIFY_ATTEMPTS - entry.attempts
      return {
        success: false,
        error: `Verification code does not match. Remaining attempts: ${remaining}.`,
        remainingAttempts: remaining,
      }
    }

    clearTimeout(entry.timer)
    memoryStore.delete(userId)
    return { success: true, newEmail: entry.challenge.newEmail }
  },
}
