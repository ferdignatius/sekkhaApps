import { Router } from "express"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { prisma } from "../../../lib/prisma"
import { cached, invalidate, CacheKeys } from "../../../lib/cache"
import { requireAuth } from "../../../middleware/auth"

export const usersRouter: Router = Router()

// GET /api/users/me (cached 120s)
usersRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId
    const user = await cached(CacheKeys.userProfile(userId), 120, async () => {
      return prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          school: true,
          phone: true,
          birthDate: true,
          gender: true,
          avatarUrl: true,
          role: true,
          userNumber: true,
          points: true,
          createdAt: true,
        },
      })
    })
    if (!user) {
      res.status(404).json({ error: "User not found" })
      return
    }

    let uNum = user.userNumber
    if (!uNum) {
      const d = new Date(user.createdAt)
      const yy = d.getFullYear().toString().slice(2)
      const mm = String(d.getMonth() + 1).padStart(2, "0")
      const dd = String(d.getDate()).padStart(2, "0")
      const prefix = `${yy}${mm}${dd}`
      const count = await prisma.user.count({ where: { userNumber: { startsWith: prefix } } })
      uNum = `${prefix}${String(count + 1).padStart(2, "0")}`
      await prisma.user.update({ where: { id: user.id }, data: { userNumber: uNum } }).catch(() => {})
    }

    res.json({
      ...user,
      birth_date: user.birthDate ? new Date(user.birthDate).toISOString() : null,
      user_number: uNum,
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
  phone: z.string().optional().nullable(),
  birth_date: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  avatar_url: z.string().url().optional().nullable(),
})

usersRouter.patch("/me", requireAuth, async (req, res, next) => {
  try {
    const body = UpdateProfileSchema.parse(req.body)
    const userId = req.user!.userId

    const existing = await (prisma.user as any).findUnique({ where: { id: userId } })
    let userNumber = existing?.userNumber
    if (!userNumber) {
      const now = new Date()
      const yy = now.getFullYear().toString()
      const mm = String(now.getMonth() + 1).padStart(2, "0")
      const dd = String(now.getDate()).padStart(2, "0")
      const prefix = `${yy}${mm}${dd}`
      const count = await prisma.user.count({ where: { userNumber: { startsWith: prefix } } })
      userNumber = `${prefix}${String(count + 1).padStart(4, "0")}`
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

    const user = await (prisma.user as any).update({
      where: { id: userId },
      data: {
        ...(body.name && { name: body.name.trim() }),
        ...(body.username !== undefined && { username: body.username ? body.username.toLowerCase().trim() : null }),
        ...(body.school !== undefined && { school: body.school ? body.school.trim() : null }),
        ...(body.phone !== undefined && { phone: body.phone ? body.phone.trim() : null }),
        ...(body.birth_date !== undefined && {
          birthDate: body.birth_date ? new Date(body.birth_date) : null,
        }),
        ...(body.gender !== undefined && { gender: body.gender ? body.gender.trim() : null }),
        ...(body.avatar_url !== undefined && { avatarUrl: body.avatar_url }),
        userNumber,
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        school: true,
        phone: true,
        birthDate: true,
        gender: true,
        avatarUrl: true,
        userNumber: true,
        role: true,
      },
    })

    // Invalidate profile cache
    await invalidate(CacheKeys.userProfile(userId))

    res.json({
      ...user,
      birth_date: user.birthDate ? new Date(user.birthDate).toISOString() : null,
      user_number: user.userNumber,
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

    // Check consecutive weeks backwards from now
    let checkDate = new Date(now)
    let currentWeekKey = toWeekKey(checkDate)

    // If user hasn't checked in this week yet, check if last week was attended
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
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { points: true },
    })
    const attendanceCount = await prisma.attendance.count({ where: { userId } })
    const totalPoints = user?.points ?? (attendanceCount * 50)

    const levels = await prisma.level.findMany({ orderBy: { minPoints: "desc" } })
    const currentLevel = levels.find(l => totalPoints >= l.minPoints) ?? { level: 1, label: "Beginner", minPoints: 0 }

    res.json({
      level: currentLevel.level,
      level_label: currentLevel.label,
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
  new_password: z.string().min(6, "New password must be at least 6 characters"),
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

    const hashedPassword = await bcrypt.hash(body.new_password, 10)
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    })

    res.json({ success: true, message: "Password updated successfully" })
  } catch (err) {
    next(err)
  }
})

