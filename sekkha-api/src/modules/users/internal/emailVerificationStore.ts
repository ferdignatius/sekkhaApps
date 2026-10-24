import crypto from "crypto"
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

function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp.trim()).digest("hex")
}

export const emailVerificationStore = {
  /**
   * Checks if user is currently in cooldown period.
   * Returns remaining seconds if in cooldown, or 0 if allowed.
   */
  async getCooldownRemaining(userId: string): Promise<number> {
    const key = `otp:email-verify:cooldown:${userId}`
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
   * Saves a new email verification challenge.
   */
  async saveChallenge(userId: string, newEmail: string, otp: string): Promise<void> {
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

    try {
      if (redis.status === "ready" || redis.status === "connect") {
        await redis.set(challengeKey, JSON.stringify(challenge), "EX", OTP_TTL_SECONDS)
        await redis.set(cooldownKey, "1", "EX", COOLDOWN_SECONDS)
        await redis.del(attemptsKey)
        return
      }
    } catch {}

    // Fallback to memory
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
   * Retrieves pending email for user if challenge is still active.
   */
  async getPendingEmail(userId: string): Promise<string | null> {
    const challengeKey = `otp:email-verify:${userId}`
    try {
      if (redis.status === "ready" || redis.status === "connect") {
        const raw = await redis.get(challengeKey)
        if (raw) {
          const parsed = JSON.parse(raw) as EmailVerificationChallenge
          return parsed.newEmail
        }
      }
    } catch {}

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
    const challengeKey = `otp:email-verify:${userId}`
    const attemptsKey = `otp:email-verify:attempts:${userId}`
    const inputHash = hashOtp(inputOtp)

    let challenge: EmailVerificationChallenge | null = null
    let currentAttempts = 0

    try {
      if (redis.status === "ready" || redis.status === "connect") {
        const raw = await redis.get(challengeKey)
        if (!raw) {
          return { success: false, error: "Kode verifikasi telah kedaluwarsa atau belum pernah diminta." }
        }
        challenge = JSON.parse(raw) as EmailVerificationChallenge
        currentAttempts = parseInt((await redis.get(attemptsKey)) || "0", 10)

        if (challenge.otpHashed !== inputHash) {
          currentAttempts += 1
          if (currentAttempts >= MAX_VERIFY_ATTEMPTS) {
            await redis.del(challengeKey)
            await redis.del(attemptsKey)
            return {
              success: false,
              error: "Kode verifikasi salah sebanyak 5 kali. Permintaan verifikasi email dibatalkan demi keamanan akun Anda. Silakan minta kode baru.",
              remainingAttempts: 0,
            }
          }
          await redis.set(attemptsKey, currentAttempts.toString(), "EX", OTP_TTL_SECONDS)
          const remaining = MAX_VERIFY_ATTEMPTS - currentAttempts
          return {
            success: false,
            error: `Kode verifikasi tidak cocok. Sisa percobaan: ${remaining} kali.`,
            remainingAttempts: remaining,
          }
        }

        // OTP Valid: consume challenge
        await redis.del(challengeKey)
        await redis.del(attemptsKey)
        return { success: true, newEmail: challenge.newEmail }
      }
    } catch {}

    // Fallback: Memory store
    const entry = memoryStore.get(userId)
    if (!entry) {
      return { success: false, error: "Kode verifikasi telah kedaluwarsa atau belum pernah diminta." }
    }

    if (entry.challenge.otpHashed !== inputHash) {
      entry.attempts += 1
      if (entry.attempts >= MAX_VERIFY_ATTEMPTS) {
        clearTimeout(entry.timer)
        memoryStore.delete(userId)
        return {
          success: false,
          error: "Kode verifikasi salah sebanyak 5 kali. Permintaan verifikasi email dibatalkan demi keamanan akun Anda. Silakan minta kode baru.",
          remainingAttempts: 0,
        }
      }
      const remaining = MAX_VERIFY_ATTEMPTS - entry.attempts
      return {
        success: false,
        error: `Kode verifikasi tidak cocok. Sisa percobaan: ${remaining} kali.`,
        remainingAttempts: remaining,
      }
    }

    clearTimeout(entry.timer)
    memoryStore.delete(userId)
    return { success: true, newEmail: entry.challenge.newEmail }
  },
}
