import { Router } from "express"
import { prisma } from "../../../lib/prisma"
import { cached, CacheKeys } from "../../../lib/cache"
import { requireAuth } from "../../../middleware/auth"

export const usersRouter = Router()

// GET /api/users/me (cached 120s)
usersRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId
    const user = await cached(CacheKeys.userProfile(userId), 120, async () => {
      return prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          school: true,
          avatarUrl: true,
          role: true,
          userNumber: true,
          points: true,
          createdAt: true,
        },
      })
    })
    if (!user) {
      res.status(404).json({ error: "User tidak ditemukan" })
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
      user_number: uNum,
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/users/me/badges (cached 300s)
usersRouter.get("/me/badges", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId
    const badges = await cached(CacheKeys.userBadges(userId), 300, async () => {
      const result = await prisma.userBadge.findMany({
        where: { userId },
        include: { badge: true },
        orderBy: { earnedAt: "desc" },
      })
      return result.map(ub => ({
        badge_id: ub.badge.id,
        name: ub.badge.name,
        icon_url: ub.badge.iconUrl,
        description: ub.badge.description,
        earned_at: ub.earnedAt.toISOString(),
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
      return result.map(a => ({
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
usersRouter.patch("/me", requireAuth, async (req, res, next) => {
  try {
    const { z } = await import("zod")
    const body = z.object({
      name: z.string().min(1).optional(),
      school: z.string().optional(),
      avatar_url: z.string().url().optional(),
    }).parse(req.body)

    const userId = req.user!.userId
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.school !== undefined && { school: body.school }),
        ...(body.avatar_url !== undefined && { avatarUrl: body.avatar_url }),
      },
      select: { id: true, name: true, school: true, avatarUrl: true },
    })

    // Invalidate profile cache
    const { invalidate, CacheKeys } = await import("../../../lib/cache")
    await invalidate(CacheKeys.userProfile(userId))

    res.json(user)
  } catch (err) {
    next(err)
  }
})

// GET /api/users/me/streak
usersRouter.get("/me/streak", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId
    // Simple streak calculation: count consecutive weeks with attendance
    const attendances = await prisma.attendance.findMany({
      where: { userId },
      orderBy: { scannedAt: "desc" },
      select: { scannedAt: true },
    })

    let currentStreak = 0
    let longestStreak = 0
    let streak = 0
    const now = new Date()

    // Group by week number
    const weeks = new Set<string>()
    for (const a of attendances) {
      const d = new Date(a.scannedAt)
      const weekKey = `${d.getFullYear()}-W${Math.ceil((d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7)}-${d.getMonth()}`
      weeks.add(weekKey)
    }

    currentStreak = weeks.size // simplified for MVP
    longestStreak = currentStreak

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
    const currentLevel = levels.find(l => totalPoints >= l.minPoints) ?? { level: 1, label: "Pemula", minPoints: 0 }

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
