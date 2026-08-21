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
      school: z.string().optional().nullable(),
      phone: z.string().optional().nullable(),
      birth_date: z.string().optional().nullable(),
      gender: z.string().optional().nullable(),
      avatar_url: z.string().url().optional().nullable(),
    }).parse(req.body)

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

    const user = await (prisma.user as any).update({
      where: { id: userId },
      data: {
        ...(body.name && { name: body.name.trim() }),
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
    const { invalidate, CacheKeys } = await import("../../../lib/cache")
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

// POST /api/users/link-legacy-account — Claim pre-provisioned data from Profil
usersRouter.post("/link-legacy-account", requireAuth, async (req, res, next) => {
  try {
    const { z } = await import("zod")
    const { target_user_id, verification_value } = z.object({
      target_user_id: z.string().min(1, "Nomor Unik Anggota wajib diisi"),
      verification_value: z.string().min(1, "Nilai verifikasi (Nama atau No HP) wajib diisi"),
    }).parse(req.body)

    const currentUserId = req.user!.userId

    // 1. Find target pre-provisioned user
    const targetUser = await (prisma.user as any).findFirst({
      where: {
        OR: [
          { userNumber: target_user_id },
          { id: target_user_id },
        ],
      },
      include: {
        attendances: true,
        badges: true,
        rsvps: true,
        pointTransactions: true,
      },
    })

    if (!targetUser) {
      res.status(404).json({ error: "Nomor Anggota tidak ditemukan dalam data umat." })
      return
    }

    if (targetUser.id === currentUserId) {
      res.status(400).json({ error: "Tidak dapat menautkan akun ke akun yang sedang Anda gunakan." })
      return
    }

    if (targetUser.isClaimed) {
      res.status(400).json({ error: "Data anggota tersebut sudah diklaim atau ditautkan oleh pengguna lain." })
      return
    }

    // 2. Verification Security Check
    const cleanVerif = verification_value.trim().toLowerCase().replace(/[^a-z0-9]/g, "")
    const targetNameClean = targetUser.name.toLowerCase().replace(/[^a-z0-9]/g, "")
    const targetPhoneClean = (targetUser.phone || "").replace(/[^0-9]/g, "")

    const nameMatches = targetNameClean.includes(cleanVerif) || cleanVerif.includes(targetNameClean)
    const phoneMatches = targetPhoneClean.length >= 4 && targetPhoneClean.endsWith(cleanVerif)

    if (!nameMatches && !phoneMatches) {
      res.status(400).json({
        error: "Verifikasi gagal. Pastikan nama lengkap atau 4 digit nomor HP sesuai dengan data pendaftaran pengurus.",
      })
      return
    }

    // 3. Data Merging
    let mergedAttendances = 0
    for (const att of targetUser.attendances) {
      const exists = await prisma.attendance.findUnique({
        where: { userId_eventId: { userId: currentUserId, eventId: att.eventId } },
      })
      if (!exists) {
        await prisma.attendance.create({
          data: {
            userId: currentUserId,
            eventId: att.eventId,
            method: att.method,
            pointsEarned: att.pointsEarned,
            scannedAt: att.scannedAt,
          },
        })
        mergedAttendances++
      }
    }

    let mergedBadges = 0
    for (const bg of targetUser.badges) {
      const exists = await prisma.userBadge.findUnique({
        where: { userId_badgeId: { userId: currentUserId, badgeId: bg.badgeId } },
      })
      if (!exists) {
        await prisma.userBadge.create({
          data: {
            userId: currentUserId,
            badgeId: bg.badgeId,
            earnedAt: bg.earnedAt,
          },
        })
        mergedBadges++
      }
    }

    for (const pt of targetUser.pointTransactions) {
      await prisma.pointTransaction.create({
        data: {
          userId: currentUserId,
          amount: pt.amount,
          type: pt.type,
          description: `[Transfer Data Lama] ${pt.description || "Poin Historis"}`,
          referenceId: pt.referenceId,
          createdAt: pt.createdAt,
        },
      })
    }

    // Recalculate total points for current user
    const allAttendances = await prisma.attendance.findMany({
      where: { userId: currentUserId },
      select: { pointsEarned: true },
    })
    const calculatedPoints = allAttendances.reduce((acc, a) => acc + (a.pointsEarned || 50), 0)

    await (prisma.user as any).update({
      where: { id: currentUserId },
      data: {
        points: calculatedPoints,
        lastActivityAt: new Date(),
      },
    })

    // Mark target user as claimed
    await (prisma.user as any).update({
      where: { id: targetUser.id },
      data: {
        isClaimed: true,
        claimedAt: new Date(),
        name: `${targetUser.name} (Terklaim)`,
      },
    })

    // Invalidate caches
    const { invalidate, CacheKeys } = await import("../../../lib/cache")
    await invalidate(CacheKeys.userProfile(currentUserId))
    await invalidate(CacheKeys.userAttendances(currentUserId))
    await invalidate(CacheKeys.userBadges(currentUserId))

    res.json({
      status: "success",
      data: {
        merged_attendances_count: mergedAttendances,
        merged_badges_count: mergedBadges,
        new_total_points: calculatedPoints,
        claimed_user_number: targetUser.userNumber,
      },
      message: `Selamat! ${mergedAttendances} riwayat kehadiran dan ${mergedBadges} lencana berhasil digabungkan ke akun Anda.`,
    })
  } catch (err) {
    next(err)
  }
})
