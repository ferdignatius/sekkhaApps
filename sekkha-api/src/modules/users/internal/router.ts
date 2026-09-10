import { Router } from "express"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { prisma } from "../../../lib/prisma"
import { cached, invalidate, CacheKeys } from "../../../lib/cache"
import { requireAuth } from "../../../middleware/auth"
import { redis } from "../../../lib/redis"
import { generateUniqueUserNumber } from "../../../lib/userNumber"
import { revokeToken } from "../../auth/internal/tokenRevocation"

export const usersRouter: Router = Router()

// GET /api/users/me (cached 120s)
usersRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId
    const user = await cached(CacheKeys.userProfile(userId), 120, async () => {
      return prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: {
            include: { school: true },
          },
          stats: true,
        },
      })
    })
    if (!user) {
      res.status(404).json({ error: "User not found" })
      return
    }

    let uNum = user.userNumber
    if (!uNum) {
      uNum = await generateUniqueUserNumber(prisma, new Date(user.createdAt))
      await prisma.user.update({ where: { id: user.id }, data: { userNumber: uNum } }).catch(() => {})
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.profile?.name || "",
      school: user.profile?.school?.name || null,
      school_id: user.profile?.schoolId || null,
      class_grade: user.profile?.classGrade || null,
      phone: user.profile?.phone || null,
      birth_date: user.profile?.birthDate ? new Date(user.profile.birthDate).toISOString() : null,
      gender: user.profile?.gender || null,
      avatar_url: null,
      role: user.role,
      user_number: uNum,
      points: user.stats?.points ?? 0,
      created_at: user.createdAt,
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/users/me/badges (cached 60s)
usersRouter.get("/me/badges", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId
    const badges = await cached(CacheKeys.userBadges(userId), 60, async () => {
      const allBadges = await prisma.badge.findMany({
        where: { isActive: true },
        orderBy: { conditionValue: "asc" },
      })
      const userBadges = await prisma.userBadge.findMany({
        where: { userId },
      })
      const userBadgeMap = new Map(userBadges.map((ub) => [ub.badgeId, ub.earnedAt.toISOString()]))
      return allBadges.map((b) => ({
        badge_id: b.id,
        name: b.name,
        icon_url: b.iconUrl,
        description: b.description,
        earned_at: userBadgeMap.get(b.id) || null,
      }))
    })
    res.json(badges)
  } catch (err) {
    next(err)
  }
})

// GET /api/users/me/attendances (cached 60s)
usersRouter.get("/me/attendances", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId
    const attendances = await cached(CacheKeys.userAttendances(userId), 60, async () => {
      const result = await prisma.attendance.findMany({
        where: { userId },
        include: { event: { select: { title: true, eventDate: true } } },
        orderBy: { scannedAt: "desc" },
        take: 20,
      })
      return result.map((a) => ({
        event_id: a.eventId,
        event_title: a.event.title,
        event_date: a.event.eventDate ? (typeof a.event.eventDate === "string" ? a.event.eventDate : new Date(a.event.eventDate).toISOString()) : new Date().toISOString(),
        method: a.method,
        scanned_at: a.scannedAt ? (typeof a.scannedAt === "string" ? a.scannedAt : new Date(a.scannedAt).toISOString()) : new Date().toISOString(),
      }))
    })
    res.json(attendances)
  } catch (err) {
    next(err)
  }
})

// PATCH /api/users/me — update profile
const UpdateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username maximum 30 characters")
    .regex(/^[a-zA-Z0-9_.]+$/, "Username may only contain letters, numbers, dots, or underscores")
    .optional()
    .nullable(),
  school: z.string().optional().nullable(),
  school_id: z.string().optional().nullable(),
  class_grade: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  birth_date: z
    .string()
    .refine((v) => !v || !isNaN(Date.parse(v)), "Format birth_date tidak valid, gunakan format tanggal ISO (YYYY-MM-DD)")
    .optional()
    .nullable(),
  gender: z.string().optional().nullable(),
})

usersRouter.patch("/me", requireAuth, async (req, res, next) => {
  try {
    const body = UpdateProfileSchema.parse(req.body)
    const userId = req.user!.userId

    const existing = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    })

    let userNumber = existing?.userNumber
    if (!userNumber) {
      userNumber = await generateUniqueUserNumber(prisma)
    }

    if (body.username && body.username.toLowerCase().trim() !== existing?.username) {
      const targetUsername = body.username.toLowerCase().trim()
      const usernameTaken = await prisma.user.findUnique({
        where: { username: targetUsername },
      })
      if (usernameTaken && usernameTaken.id !== userId) {
        res.status(409).json({ error: `Username @${targetUsername} is already taken by another account.` })
        return
      }
    }

    let resolvedSchoolId: string | null | undefined = undefined
    if (body.school_id !== undefined) {
      resolvedSchoolId = body.school_id
    } else if (body.school) {
      const trimmedSchool = body.school.trim()
      const existingSchool = await prisma.school.findUnique({
        where: { name: trimmedSchool },
      })
      if (existingSchool) {
        resolvedSchoolId = existingSchool.id
      } else {
        const newSchool = await prisma.school.create({
          data: { name: trimmedSchool, type: "Lainnya" },
        })
        resolvedSchoolId = newSchool.id
      }
    } else if (body.school === null) {
      resolvedSchoolId = null
    }

    // Update User core
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(body.username !== undefined && { username: body.username ? body.username.toLowerCase().trim() : null }),
        userNumber,
      },
    })

    // Upsert UserProfile
    const profile = await prisma.userProfile.upsert({
      where: { userId },
      update: {
        ...(body.name && { name: body.name.trim() }),
        ...(resolvedSchoolId !== undefined && { schoolId: resolvedSchoolId }),
        ...(body.class_grade !== undefined && { classGrade: body.class_grade ? body.class_grade.trim() : null }),
        ...(body.phone !== undefined && { phone: body.phone ? body.phone.trim() : null }),
        ...(body.birth_date !== undefined && {
          birthDate: body.birth_date ? new Date(body.birth_date) : null,
        }),
        ...(body.gender !== undefined && { gender: body.gender ? body.gender.trim() : null }),
      },
      create: {
        userId,
        name: body.name ? body.name.trim() : existing?.username || "Anggota",
        schoolId: resolvedSchoolId || null,
        classGrade: body.class_grade ? body.class_grade.trim() : null,
        phone: body.phone ? body.phone.trim() : null,
        birthDate: body.birth_date ? new Date(body.birth_date) : null,
        gender: body.gender ? body.gender.trim() : null,
        avatarUrl: null,
      },
      include: { school: true },
    })

    // Invalidate profile cache
    await invalidate(CacheKeys.userProfile(userId))

    // Update Redis session cache so /auth/verify returns the new name immediately
    const authHeader = req.headers.authorization
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null
    if (token) {
      const updatedSession = {
        id: user.id,
        email: user.email,
        username: user.username,
        name: profile.name,
        role: user.role,
      }
      await redis.set(`auth:token:${token}`, JSON.stringify(updatedSession), "EX", 30 * 24 * 60 * 60).catch(() => {})
    }

    res.json({
      id: user.id,
      username: user.username,
      name: profile.name,
      email: user.email,
      school: profile.school?.name || null,
      school_id: profile.schoolId,
      class_grade: profile.classGrade,
      phone: profile.phone,
      birth_date: profile.birthDate ? new Date(profile.birthDate).toISOString() : null,
      gender: profile.gender,
      avatar_url: null,
      user_number: user.userNumber,
      role: user.role,
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/users/me/streak — true consecutive weekly streak
usersRouter.get("/me/streak", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId
    const attendances = await prisma.attendance.findMany({
      where: { userId },
      orderBy: { scannedAt: "desc" },
      select: { scannedAt: true },
    })

    if (attendances.length === 0) {
      return res.json({ current_streak: 0, longest_streak: 0 })
    }

    // Convert dates into ISO week strings "YYYY-WXX"
    function toWeekKey(date: Date): string {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
      const dayNum = d.getUTCDay() || 7
      d.setUTCDate(d.getUTCDate() + 4 - dayNum)
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
      const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
      return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`
    }

    const attendedWeeks = new Set<string>()
    for (const a of attendances) {
      attendedWeeks.add(toWeekKey(new Date(a.scannedAt)))
    }

    const now = new Date()
    let currentStreak = 0

    let checkDate = new Date(now)
    let currentWeekKey = toWeekKey(checkDate)

    if (!attendedWeeks.has(currentWeekKey)) {
      checkDate.setUTCDate(checkDate.getUTCDate() - 7)
      currentWeekKey = toWeekKey(checkDate)
    }

    while (attendedWeeks.has(currentWeekKey)) {
      currentStreak++
      checkDate.setUTCDate(checkDate.getUTCDate() - 7)
      currentWeekKey = toWeekKey(checkDate)
    }

    const longestStreak = Math.max(currentStreak, attendances.length > 0 ? currentStreak : 0)

    res.json({ current_streak: currentStreak, longest_streak: longestStreak })
  } catch (err) {
    next(err)
  }
})

// GET /api/users/me/level
usersRouter.get("/me/level", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId
    const stats = await prisma.userStats.findUnique({
      where: { userId },
      include: { level: true },
    })
    const attendanceCount = await prisma.attendance.count({ where: { userId } })
    const totalPoints = stats?.points ?? (attendanceCount * 50)

    const levels = await prisma.level.findMany({ orderBy: { minPoints: "desc" } })
    const currentLevel = levels.find(l => totalPoints >= l.minPoints) ?? { level: 1, label: "Beginner", minPoints: 0 }

    res.json({
      level: stats?.level?.level ?? currentLevel.level,
      level_label: stats?.level?.label ?? currentLevel.label,
      total_points: totalPoints,
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/users/me/point-transactions — list recent point mutation transactions
usersRouter.get("/me/point-transactions", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId
    const transactions = await prisma.pointTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    })
    res.json(transactions)
  } catch (err) {
    next(err)
  }
})

const ChangePasswordSchema = z.object({
  current_password: z.string().min(1, "Current password is required"),
  new_password: z.string().min(8, "New password must be at least 8 characters"),
})

// POST /api/users/change-password — User updates their password
usersRouter.post("/change-password", requireAuth, async (req, res, next) => {
  try {
    const body = ChangePasswordSchema.parse(req.body)
    const userId = req.user!.userId
    const user = await prisma.user.findUnique({ where: { id: userId } })

    if (!user || !user.password) {
      res.status(400).json({ error: "Account does not have a valid password set" })
      return
    }

    const isValid = await bcrypt.compare(body.current_password, user.password)
    if (!isValid) {
      res.status(400).json({ error: "Incorrect current password" })
      return
    }

    const hashedPassword = await bcrypt.hash(body.new_password, 12)
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        passwordChangedByUser: true,
        passwordChangedAt: new Date(),
      },
    })

    res.json({ success: true, message: "Password updated successfully" })
  } catch (err) {
    next(err)
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// DATA PRIVACY: EXPORT & ERASURE (GDPR / UU PDP)
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/users/me/export — Export all personal data in JSON format
usersRouter.get("/me/export", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: { include: { school: true } },
        stats: { include: { level: true } },
        badges: { include: { badge: true } },
        attendances: {
          include: { event: { select: { title: true, eventDate: true, location: true } } },
          orderBy: { scannedAt: "desc" },
        },
        pointTransactions: {
          orderBy: { createdAt: "desc" },
          take: 100,
        },
        notifications: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    })

    if (!user) {
      res.status(404).json({ error: "Pengguna tidak ditemukan" })
      return
    }

    const exportData = {
      exported_at: new Date().toISOString(),
      account: {
        id: user.id,
        user_number: user.userNumber,
        username: user.username,
        email: user.email,
        role: user.role,
        is_claimed: user.isClaimed,
        created_at: user.createdAt,
        updated_at: user.updatedAt,
      },
      profile: {
        name: user.profile?.name ?? null,
        phone: user.profile?.phone ?? null,
        gender: user.profile?.gender ?? null,
        birth_date: user.profile?.birthDate ? new Date(user.profile.birthDate).toISOString() : null,
        class_grade: user.profile?.classGrade ?? null,
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

    res.setHeader("Content-Type", "application/json")
    res.setHeader("Content-Disposition", `attachment; filename="sekkha-data-${user.userNumber || userId}.json"`)
    res.json(exportData)
  } catch (err) {
    next(err)
  }
})

// POST /api/users/me/delete-account — Delete user account & personal data permanently
const DeleteAccountSchema = z.object({
  password: z.string().min(1, "Konfirmasi kata sandi diperlukan"),
})

usersRouter.post("/me/delete-account", requireAuth, async (req, res, next) => {
  try {
    const { password } = DeleteAccountSchema.parse(req.body)
    const userId = req.user!.userId

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || !user.password) {
      res.status(400).json({ error: "Akun tidak valid atau tidak memiliki kata sandi" })
      return
    }

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      res.status(403).json({ error: "Kata sandi konfirmasi salah" })
      return
    }

    // Revoke token immediately
    const authHeader = req.headers.authorization
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null
    if (token) {
      await revokeToken(token).catch(() => {})
      await redis.del(`auth:token:${token}`).catch(() => {})
    }

    // Invalidate cache
    await invalidate(CacheKeys.userProfile(userId))

    // Cascade delete user and all associated personal data
    await prisma.user.delete({ where: { id: userId } })

    res.json({
      success: true,
      message: "Akun dan seluruh data pribadi Anda telah berhasil dihapus secara permanen.",
    })
  } catch (err) {
    next(err)
  }
})
