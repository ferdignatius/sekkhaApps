import { userModels } from "./models"
import type { Prisma } from "@prisma/client"
import { cached, invalidate, invalidatePattern, CacheKeys } from "../../lib/cache"
import { encrypt, decrypt, generateBlindIndex } from "../../lib/crypto"
import { hashPassword, verifyPassword, DEFAULT_BCRYPT_COST } from "../../lib/password"
import { generateUniqueUserNumber } from "../../lib/userNumber"
import { prisma } from "../../lib/prisma"
import { redis } from "../../lib/redis"
import { revokeToken } from "../auth"
import { calculateWeeklyStreak } from "./internal/utils"
import { emailVerificationStore } from "./internal/emailVerificationStore"
import { sendEmailVerificationOtpEmail } from "../auth/internal/email"
import crypto from "crypto"

export interface UpdateProfileInput {
  username?: string
  name?: string
  school?: string | null
  school_id?: string | null
  phone?: string | null
  date_of_birth?: string | null
  birth_date?: string | null
  class_grade?: string | null
}

export const userServices = {
  async completeOnboarding(userId: string, skipped: boolean = false) {
    await userModels.completeOnboarding(userId)
    await invalidate(CacheKeys.userProfile(userId))
    return { onboarding_completed: true, skipped }
  },

  async getProfile(userId: string) {
    const user = await cached(CacheKeys.userProfile(userId), 120, async () => {
      return userModels.findUserWithProfileAndStats(userId)
    })
    if (!user) {
      return null
    }

    let uNum = user.userNumber
    if (!uNum) {
      uNum = await generateUniqueUserNumber(prisma, new Date(user.createdAt))
      await userModels.updateUser(user.id, { userNumber: uNum }).catch(() => {})
    }

    const decryptedEmail = decrypt(user.email) || user.email || ""
    const decryptedPhone = decrypt(user.profile?.phone) || null
    const rawBirthDate = decrypt(user.profile?.birthDate) || null
    const decryptedBirthDate = rawBirthDate ? new Date(rawBirthDate).toISOString().split("T")[0] : null
    const decryptedClassGrade = decrypt(user.profile?.classGrade) || null
    return {
      id: user.id,
      user_number: Number(uNum),
      username: user.username || "",
      name: user.profile?.name || "",
      email: decryptedEmail,
      email_verified: Boolean(user.emailVerifiedAt),
      role: user.role,
      is_claimed: user.isClaimed,
      onboarding_completed: user.onboardingCompleted,
      school_id: user.profile?.schoolId || null,
      school: user.profile?.school?.name || null,
      class_grade: decryptedClassGrade,
      phone: decryptedPhone,
      date_of_birth: decryptedBirthDate,
      birth_date: decryptedBirthDate,
      stats: {
        total_points: user.stats?.points ?? 0,
        current_streak: user.stats?.currentStreak ?? 0,
        total_attendances: user.stats?.totalAttendances ?? user._count?.attendances ?? 0,
      },
      joined_at: new Date(user.createdAt).toISOString(),
    }
  },

  async updateProfile(userId: string, body: UpdateProfileInput, authHeader?: string) {
    const existing = await userModels.findUserWithProfileAndStats(userId)
    if (!existing) {
      const err = new Error("User not found") as any
      err.statusCode = 404
      throw err
    }

    let resolvedSchoolId: string | null | undefined = undefined
    if (body.school_id !== undefined) {
      if (body.school_id) {
        const school = await prisma.school.findUnique({ where: { id: body.school_id } })
        if (!school || school.status !== "active" || !school.isActive) {
          const error = new Error("Selected school is not approved or inactive.") as any
          error.statusCode = 400
          throw error
        }
        resolvedSchoolId = school.id
      } else {
        resolvedSchoolId = null
      }
    } else if (body.school) {
      const trimmedSchool = body.school.trim()
      const existingSchool = await userModels.findSchoolByName(trimmedSchool)
      if (existingSchool && existingSchool.status === "active" && existingSchool.isActive) {
        resolvedSchoolId = existingSchool.id
      } else {
        resolvedSchoolId = null
      }
    } else if (body.school === null) {
      resolvedSchoolId = null
    }

    const userData: Prisma.UserUpdateInput = {}

    if (body.username !== undefined) {
      const cleanUsername = body.username.trim().toLowerCase()
      if (cleanUsername !== existing.username) {
        const taken = await userModels.findUserByUsername(cleanUsername)
        if (taken && taken.id !== userId) {
          const err = new Error("Username sudah digunakan") as any
          err.statusCode = 409
          err.status = 409
          throw err
        }
        userData.username = cleanUsername
      }
    }

    const birthDateVal = body.birth_date !== undefined ? body.birth_date : body.date_of_birth
    const classGradeVal = body.class_grade

    const profileUpdateData = {
      ...(body.name && { name: body.name.trim() }),
      ...(resolvedSchoolId !== undefined && { schoolId: resolvedSchoolId }),
      ...(body.phone !== undefined && { phone: body.phone ? encrypt(body.phone.trim()) : null }),
      ...(classGradeVal !== undefined && {
        classGrade: classGradeVal ? encrypt(classGradeVal.trim()) : null,
      }),
      ...(birthDateVal !== undefined && {
        birthDate: birthDateVal ? encrypt(new Date(birthDateVal).toISOString()) : null,
      }),
    }

    const profileCreateData = {
      userId,
      name: body.name ? body.name.trim() : (userData.username as string) || existing.username || "Member",
      schoolId: resolvedSchoolId || null,
      classGrade: classGradeVal ? encrypt(classGradeVal.trim()) : null,
      phone: body.phone ? encrypt(body.phone.trim()) : null,
      birthDate: birthDateVal ? encrypt(new Date(birthDateVal).toISOString()) : null,
    }

    const { user, profile } = await userModels.updateUserAndProfile(
      userId,
      userData,
      profileUpdateData,
      profileCreateData
    )

    // Invalidate caches
    await invalidate(CacheKeys.userProfile(userId))
    await invalidatePattern(`user:${userId}:home:*`)

    // Update Redis session cache if active
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null
    const decryptedEmail = decrypt(user.email) || user.email || ""
    if (token) {
      const updatedSession = {
        id: user.id,
        email: decryptedEmail,
        username: user.username,
        name: profile.name,
        role: user.role,
      }
      await redis.set(`auth:token:${token}`, JSON.stringify(updatedSession), "EX", 30 * 24 * 60 * 60).catch(() => {})
    }

    return this.getProfile(userId)
  },

  async requestEmailVerification(userId: string, targetEmail: string) {
    const normalizedEmail = targetEmail.trim().toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(normalizedEmail)) {
      const err = new Error("Format alamat email tidak valid") as any
      err.statusCode = 400
      throw err
    }

    // Check cooldown (60 seconds)
    const cooldownRemaining = await emailVerificationStore.getCooldownRemaining(userId)
    if (cooldownRemaining > 0) {
      const err = new Error(`Silakan tunggu ${cooldownRemaining} detik sebelum meminta kode verifikasi baru.`) as any
      err.statusCode = 429
      throw err
    }

    // O(1) Blind Index check: is email already used by another user?
    const bindex = generateBlindIndex(normalizedEmail)
    const existingWithEmail = bindex ? await userModels.findUserByEmailBindex(bindex) : null

    if (existingWithEmail && existingWithEmail.id !== userId) {
      // Anti-enumeration protection: return generic 200 without sending code
      return {
        expires_in_seconds: 600,
        resend_after_seconds: 60,
      }
    }

    // Generate secure 6-digit OTP
    const otp = crypto.randomInt(100000, 1000000).toString()

    // Save challenge
    await emailVerificationStore.saveChallenge(userId, normalizedEmail, otp)

    // Fetch user name for polite email greeting
    const user = await userModels.findUserWithProfileAndStats(userId)
    const userName = user?.profile?.name || user?.username || "Sahabat Sekkha"

    // Dispatch email
    await sendEmailVerificationOtpEmail({
      to: normalizedEmail,
      otp,
      name: userName,
    })

    return {
      expires_in_seconds: 600,
      resend_after_seconds: 60,
    }
  },

  async confirmEmailVerification(userId: string, otpCode: string) {
    if (!otpCode || otpCode.trim().length !== 6) {
      const err = new Error("Kode verifikasi harus berupa 6 digit angka") as any
      err.statusCode = 400
      throw err
    }

    const result = await emailVerificationStore.verifyAndConsume(userId, otpCode)
    if (!result.success || !result.newEmail) {
      const err = new Error(result.error || "Kode verifikasi tidak valid") as any
      err.statusCode = result.remainingAttempts === 0 ? 429 : 400
      throw err
    }

    const newEmail = result.newEmail
    const emailCipher = encrypt(newEmail)
    const bindex = generateBlindIndex(newEmail)
    if (!emailCipher || !bindex) {
      const err = new Error("Gagal memproses enkripsi dan blind index email") as any
      err.statusCode = 500
      throw err
    }

    await userModels.updateUserEmail(userId, emailCipher, bindex)
    await invalidate(CacheKeys.userProfile(userId))
    await invalidatePattern(`user:${userId}:home:*`)

    return {
      email: newEmail,
      email_verified: true,
      is_claimed: true,
    }
  },

  async getAttendances(userId: string, limit: number = 10, cursor?: string) {
    const take = Math.min(Math.max(limit, 1), 50)
    const [attendances, total] = await Promise.all([
      userModels.findUserAttendances(userId, take, cursor),
      userModels.countUserAttendances(userId),
    ])

    const items = attendances.map((a) => ({
      id: a.id,
      event_id: a.eventId,
      event_title: a.event.title,
      event_date: a.event.eventDate
        ? new Date(a.event.eventDate).toISOString()
        : new Date().toISOString(),
      method: a.method,
      points_earned: a.pointsEarned ?? 0,
      scanned_at: a.scannedAt
        ? new Date(a.scannedAt).toISOString()
        : new Date().toISOString(),
    }))

    const nextCursor = items.length === take ? items[items.length - 1].id : null

    return {
      items,
      pagination: {
        next_cursor: nextCursor,
        total,
      },
    }
  },

  async getStreak(userId: string) {
    const attendances = await userModels.findUserAttendancesForStreak(userId)
    const streak = calculateWeeklyStreak(attendances)
    const lastAttended = attendances.length > 0 && attendances[0].scannedAt
      ? new Date(attendances[0].scannedAt).toISOString()
      : null

    return {
      current_streak: streak.current_streak,
      longest_streak: streak.longest_streak,
      last_attended: lastAttended,
    }
  },

  async getPointTransactions(userId: string, limit: number = 20) {
    const raw = await userModels.findUserPointTransactions(userId, limit)
    const stats = await prisma.userStats.findUnique({ where: { userId } })
    let currentBalance = stats?.points ?? 0

    const items = raw.map((pt) => {
      const balance = currentBalance
      currentBalance -= pt.amount
      return {
        id: pt.id,
        points: pt.amount,
        points_delta: pt.amount,
        type: pt.type,
        description: pt.description || "",
        running_balance: balance,
        created_at: new Date(pt.createdAt).toISOString(),
      }
    })
    return { items }
  },

  async changePassword(userId: string, currentPass: string, newPass: string) {
    const user = await userModels.findUserById(userId)
    if (!user || !user.password) {
      const error = new Error("Account does not have a valid password set") as any
      error.statusCode = 400
      throw error
    }

    const isValid = await verifyPassword(currentPass, user.password)
    if (!isValid) {
      const error = new Error("Kata sandi lama yang Anda masukkan tidak cocok") as any
      error.statusCode = 400
      throw error
    }

    if (newPass.length < 8) {
      const error = new Error("Kata sandi baru minimal 8 karakter") as any
      error.statusCode = 400
      throw error
    }

    const hashedPassword = await hashPassword(newPass, DEFAULT_BCRYPT_COST)
    await userModels.updateUser(userId, {
      password: hashedPassword,
      passwordChangedByUser: true,
      passwordChangedAt: new Date(),
    })

    return {
      password_changed_by_user: true,
      is_claimed: user.isClaimed,
    }
  },

  async exportUserData(userId: string) {
    const user = await userModels.findUserFullExport(userId)
    if (!user) {
      return null
    }

    return {
      exported_at: new Date().toISOString(),
      account: {
        id: user.id,
        user_number: user.userNumber ? Number(user.userNumber) : null,
        username: user.username,
        email: decrypt(user.email) || user.email,
        role: user.role,
        is_claimed: user.isClaimed,
        created_at: user.createdAt,
        updated_at: user.updatedAt,
      },
      profile: {
        name: user.profile?.name ?? null,
        phone: decrypt(user.profile?.phone) || null,
        birth_date: decrypt(user.profile?.birthDate) || null,
        class_grade: decrypt(user.profile?.classGrade) || null,
        school: user.profile?.school?.name ?? null,
      },
      stats: {
        points: user.stats?.points ?? 0,
        total_attendances: user.stats?.totalAttendances ?? user.attendances?.length ?? 0,
        current_streak: user.stats?.currentStreak ?? 0,
        last_activity_at: user.stats?.lastActivityAt ?? null,
      },
      attendances: user.attendances.map((a) => ({
        event_title: a.event.title,
        event_date: a.event.eventDate,
        location: a.event.location,
        method: a.method,
        points_earned: a.pointsEarned,
        scanned_at: a.scannedAt,
      })),
      point_transactions: user.pointTransactions.map((pt) => ({
        type: pt.type,
        points: pt.amount,
        description: pt.description,
        created_at: pt.createdAt,
      })),
    }
  },

  async deleteAccount(userId: string, passwordConfirm: string, authHeader?: string) {
    const user = await userModels.findUserById(userId)
    if (!user || !user.password) {
      const error = new Error("Akun tidak valid atau tidak memiliki kata sandi") as any
      error.statusCode = 400
      throw error
    }

    const isValid = await verifyPassword(passwordConfirm, user.password)
    if (!isValid) {
      const error = new Error("Kata sandi konfirmasi salah") as any
      error.statusCode = 403
      throw error
    }

    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null
    if (token) {
      await revokeToken(token).catch(() => {})
      await redis.del(`auth:token:${token}`).catch(() => {})
    }

    await invalidate(CacheKeys.userProfile(userId))
    await userModels.deleteUserById(userId)

    return {
      message: "Akun dan seluruh data pribadi Anda telah berhasil dihapus secara permanen.",
    }
  },
}
