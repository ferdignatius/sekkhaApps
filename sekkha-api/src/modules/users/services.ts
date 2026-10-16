import { userModels } from "./models"
import { cached, invalidate, CacheKeys } from "../../lib/cache"
import { encrypt, decrypt } from "../../lib/crypto"
import { hashPassword, verifyPassword, DEFAULT_BCRYPT_COST } from "../../lib/password"
import { generateUniqueUserNumber } from "../../lib/userNumber"
import { prisma } from "../../lib/prisma"
import { redis } from "../../lib/redis"
import { revokeToken } from "../auth"
import { calculateWeeklyStreak } from "./internal/utils"

export interface UpdateProfileInput {
  name?: string
  username?: string | null
  school?: string | null
  school_id?: string | null
  class_grade?: string | null
  phone?: string | null
  birth_date?: string | null
  gender?: string | null
}

export const userServices = {
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

    return {
      id: user.id,
      username: user.username,
      email: decrypt(user.email) || user.email,
      name: user.profile?.name || "",
      school: user.profile?.school?.name || null,
      school_id: user.profile?.schoolId || null,
      class_grade: decrypt(user.profile?.classGrade) || null,
      phone: decrypt(user.profile?.phone) || null,
      birth_date: decrypt(user.profile?.birthDate) || null,
      gender: decrypt(user.profile?.gender) || null,
      avatar_url: user.profile?.avatarUrl || null,
      role: user.role,
      user_number: uNum,
      points: user.stats?.points ?? 0,
      created_at: user.createdAt,
    }
  },

  async getBadges(userId: string) {
    return cached(CacheKeys.userBadges(userId), 60, async () => {
      const { allBadges, userBadges } = await userModels.findActiveBadgesWithUserBadges(userId)
      const userBadgeMap = new Map(userBadges.map((ub) => [ub.badgeId, ub.earnedAt.toISOString()]))
      return allBadges.map((b) => ({
        badge_id: b.id,
        name: b.name,
        icon_url: b.iconUrl,
        description: b.description,
        earned_at: userBadgeMap.get(b.id) || null,
      }))
    })
  },

  async getAttendances(userId: string) {
    return cached(CacheKeys.userAttendances(userId), 60, async () => {
      const result = await userModels.findUserAttendances(userId, 20)
      return result.map((a) => ({
        event_id: a.eventId,
        event_title: a.event.title,
        event_date: a.event.eventDate
          ? typeof a.event.eventDate === "string"
            ? a.event.eventDate
            : new Date(a.event.eventDate).toISOString()
          : new Date().toISOString(),
        method: a.method,
        scanned_at: a.scannedAt
          ? typeof a.scannedAt === "string"
            ? a.scannedAt
            : new Date(a.scannedAt).toISOString()
          : new Date().toISOString(),
      }))
    })
  },

  async updateProfile(userId: string, body: UpdateProfileInput, authHeader?: string) {
    const existing = await userModels.findUserWithProfileAndStats(userId)
    if (!existing) {
      throw new Error("User not found")
    }

    let userNumber = existing.userNumber
    if (!userNumber) {
      userNumber = await generateUniqueUserNumber(prisma)
    }

    if (body.username && body.username.toLowerCase().trim() !== existing.username) {
      const targetUsername = body.username.toLowerCase().trim()
      const usernameTaken = await userModels.findUserByUsername(targetUsername)
      if (usernameTaken && usernameTaken.id !== userId) {
        const error = new Error(`Username @${targetUsername} is already taken by another account.`) as any
        error.statusCode = 409
        throw error
      }
    }

    let resolvedSchoolId: string | null | undefined = undefined
    if (body.school_id !== undefined) {
      resolvedSchoolId = body.school_id
    } else if (body.school) {
      const trimmedSchool = body.school.trim()
      const existingSchool = await userModels.findSchoolByName(trimmedSchool)
      if (existingSchool) {
        resolvedSchoolId = existingSchool.id
      } else {
        const newSchool = await userModels.createSchool(trimmedSchool, "Lainnya")
        resolvedSchoolId = newSchool.id
      }
    } else if (body.school === null) {
      resolvedSchoolId = null
    }

    // Update User core
    const user = await userModels.updateUser(userId, {
      ...(body.username !== undefined && { username: body.username ? body.username.toLowerCase().trim() : null }),
      userNumber,
    })

    // Upsert UserProfile
    const profile = await userModels.upsertUserProfile(
      userId,
      {
        ...(body.name && { name: body.name.trim() }),
        ...(resolvedSchoolId !== undefined && { schoolId: resolvedSchoolId }),
        ...(body.class_grade !== undefined && { classGrade: body.class_grade ? encrypt(body.class_grade.trim()) : null }),
        ...(body.phone !== undefined && { phone: body.phone ? encrypt(body.phone.trim()) : null }),
        ...(body.birth_date !== undefined && {
          birthDate: body.birth_date ? encrypt(new Date(body.birth_date).toISOString()) : null,
        }),
        ...(body.gender !== undefined && { gender: body.gender ? encrypt(body.gender.trim()) : null }),
      },
      {
        userId,
        name: body.name ? body.name.trim() : existing.username || "Anggota",
        schoolId: resolvedSchoolId || null,
        classGrade: body.class_grade ? encrypt(body.class_grade.trim()) : null,
        phone: body.phone ? encrypt(body.phone.trim()) : null,
        birthDate: body.birth_date ? encrypt(new Date(body.birth_date).toISOString()) : null,
        gender: body.gender ? encrypt(body.gender.trim()) : null,
        avatarUrl: null,
      }
    )

    // Invalidate profile cache
    await invalidate(CacheKeys.userProfile(userId))

    // Update Redis session cache so /auth/verify returns the new name immediately
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null
    const decryptedEmail = decrypt(user.email) || user.email
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

    const decryptedBirthDate = decrypt(profile.birthDate) || null

    return {
      id: user.id,
      username: user.username,
      name: profile.name,
      email: decryptedEmail,
      school: profile.school?.name || null,
      school_id: profile.schoolId,
      class_grade: decrypt(profile.classGrade) || null,
      phone: decrypt(profile.phone) || null,
      birth_date: decryptedBirthDate ? new Date(decryptedBirthDate).toISOString() : null,
      gender: decrypt(profile.gender) || null,
      avatar_url: null,
      user_number: user.userNumber,
      role: user.role,
    }
  },

  async getStreak(userId: string) {
    const attendances = await userModels.findUserAttendancesForStreak(userId)
    return calculateWeeklyStreak(attendances)
  },

  async getLevel(userId: string) {
    const stats = await userModels.findUserStatsWithLevel(userId)
    const attendanceCount = await userModels.countUserAttendances(userId)
    const totalPoints = stats?.points ?? attendanceCount * 50

    const levels = await userModels.findLevelsOrderedDesc()
    const currentLevel = levels.find((l) => totalPoints >= l.minPoints) ?? { level: 1, label: "Beginner", minPoints: 0 }

    return {
      level: stats?.level?.level ?? currentLevel.level,
      level_label: stats?.level?.label ?? currentLevel.label,
      total_points: totalPoints,
    }
  },

  async getPointTransactions(userId: string) {
    return userModels.findUserPointTransactions(userId, 20)
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
      const error = new Error("Incorrect current password") as any
      error.statusCode = 400
      throw error
    }

    const hashedPassword = await hashPassword(newPass, DEFAULT_BCRYPT_COST)
    await userModels.updateUser(userId, {
      password: hashedPassword,
      passwordChangedByUser: true,
      passwordChangedAt: new Date(),
    })

    return { success: true, message: "Password updated successfully" }
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
        user_number: user.userNumber,
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
        gender: decrypt(user.profile?.gender) || null,
        birth_date: decrypt(user.profile?.birthDate) || null,
        class_grade: decrypt(user.profile?.classGrade) || null,
        school: user.profile?.school?.name ?? null,
      },
      stats: {
        points: user.stats?.points ?? 0,
        total_attendances: user.stats?.totalAttendances ?? 0,
        current_streak: user.stats?.currentStreak ?? 0,
        level: user.stats?.level?.level ?? 1,
        level_label: user.stats?.level?.label ?? "Beginner",
        last_activity_at: user.stats?.lastActivityAt ?? null,
      },
      badges: user.badges.map((ub) => ({
        badge_name: ub.badge.name,
        description: ub.badge.description,
        icon: ub.badge.iconUrl,
        earned_at: ub.earnedAt,
      })),
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
      success: true,
      message: "Akun dan seluruh data pribadi Anda telah berhasil dihapus secara permanen.",
    }
  },
}
