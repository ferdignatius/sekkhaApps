import crypto from "crypto"
import { redis } from "../../../lib/redis"

export interface PasswordChangeChallenge {
  otpHashed: string
  userId: string
  createdAt: number
}

interface MemoryEntry {
  challenge: PasswordChangeChallenge
  attempts: number
  timer: NodeJS.Timeout
}

const memoryStore = new Map<string, MemoryEntry>()
const cooldownMemoryStore = new Map<string, number>()

const OTP_TTL_SECONDS = 600 // 10 minutes
const COOLDOWN_SECONDS = 60 // 60 seconds
export const MAX_VERIFY_ATTEMPTS = 5

function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp.trim()).digest("hex")
}

export const passwordChangeOtpStore = {
  /**
   * Checks if user is currently in cooldown period.
   * Returns remaining seconds if in cooldown, or 0 if allowed.
   */
  async getCooldownRemaining(userId: string): Promise<number> {
    const key = `otp:change-password:cooldown:${userId}`
    try {
      if (redis.status === "ready" || redis.status === "connect") {
        const ttl = await redis.ttl(key)
        if (ttl > 0) return ttl
      }
    } catch {}

    const expiresAt = cooldownMemoryStore.get(userId)
    if (expiresAt) {
      const remaining = Math.ceil((expiresAt - Date.now()) / 1000)
      if (remaining > 0) return remaining
      cooldownMemoryStore.delete(userId)
    }
    return 0
  },

  /**
   * Saves a new password change challenge.
   */
  async saveChallenge(userId: string, otp: string): Promise<void> {
    const challengeKey = `otp:change-password:${userId}`
    const cooldownKey = `otp:change-password:cooldown:${userId}`
    const attemptsKey = `otp:change-password:attempts:${userId}`
    const otpHashed = hashOtp(otp)

    const challenge: PasswordChangeChallenge = {
      otpHashed,
      userId,
      createdAt: Date.now(),
    }

    try {
      if (redis.status === "ready" || redis.status === "connect") {
        await redis.set(challengeKey, JSON.stringify(challenge), "EX", OTP_TTL_SECONDS)
        await redis.set(cooldownKey, "1", "EX", COOLDOWN_SECONDS)
        await redis.del(attemptsKey)
        return
      }
    } catch {}

    // Fallback to in-memory store
    const existing = memoryStore.get(userId)
    if (existing?.timer) {
      clearTimeout(existing.timer)
    }

    const timer = setTimeout(() => {
      memoryStore.delete(userId)
    }, OTP_TTL_SECONDS * 1000)

    memoryStore.set(userId, { challenge, attempts: 0, timer })
    cooldownMemoryStore.set(userId, Date.now() + COOLDOWN_SECONDS * 1000)
  },

  /**
   * Verifies the 6-digit OTP code against the stored challenge.
   * Enforces max 5 attempts with automatic challenge cancellation on 5th failure.
   */
  async verifyAndConsume(
    userId: string,
    inputOtp: string
  ): Promise<{ success: boolean; error?: string; remainingAttempts?: number }> {
    const challengeKey = `otp:change-password:${userId}`
    const attemptsKey = `otp:change-password:attempts:${userId}`
    const inputHash = hashOtp(inputOtp)

    let challenge: PasswordChangeChallenge | null = null
    let currentAttempts = 0

    try {
      if (redis.status === "ready" || redis.status === "connect") {
        const raw = await redis.get(challengeKey)
        if (!raw) {
          return {
            success: false,
            error: "Verification code has expired or was not requested. Please request a new code.",
          }
        }
        challenge = JSON.parse(raw) as PasswordChangeChallenge
        currentAttempts = parseInt((await redis.get(attemptsKey)) || "0", 10)

        if (challenge.otpHashed !== inputHash) {
          currentAttempts += 1
          if (currentAttempts >= MAX_VERIFY_ATTEMPTS) {
            await redis.del(challengeKey)
            await redis.del(attemptsKey)
            return {
              success: false,
              error:
                "Verification code was incorrect 5 times. The password change request was canceled for security. Please request a new code.",
              remainingAttempts: 0,
            }
          }
          await redis.set(attemptsKey, currentAttempts.toString(), "EX", OTP_TTL_SECONDS)
          const remaining = MAX_VERIFY_ATTEMPTS - currentAttempts
          return {
            success: false,
            error: `Verification code does not match. Remaining attempts: ${remaining}.`,
            remainingAttempts: remaining,
          }
        }

        // OTP Valid: consume challenge
        await redis.del(challengeKey)
        await redis.del(attemptsKey)
        return { success: true }
      }
    } catch {}

    // Fallback: Memory store
    const entry = memoryStore.get(userId)
    if (!entry) {
      return {
        success: false,
        error: "Verification code has expired or was not requested. Please request a new code.",
      }
    }

    if (entry.challenge.otpHashed !== inputHash) {
      entry.attempts += 1
      if (entry.attempts >= MAX_VERIFY_ATTEMPTS) {
        clearTimeout(entry.timer)
        memoryStore.delete(userId)
        return {
          success: false,
          error:
            "Verification code was incorrect 5 times. The password change request was canceled for security. Please request a new code.",
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
    return { success: true }
  },
}
