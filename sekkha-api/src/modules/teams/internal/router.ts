import { randomBytes, randomInt } from "crypto"
import { Router } from "express"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { prisma } from "../../../lib/prisma"
import { requireAuth, requireRole } from "../../../middleware/auth"
import { generateUniqueUsername } from "../../auth/internal/repository"
import { sendTemporaryPasswordEmail } from "../../auth/internal/email"
import { invalidate, CacheKeys } from "../../../lib/cache"
import { generateUniqueUserNumber } from "../../../lib/userNumber"
import { encrypt, decrypt, generateBlindIndex } from "../../../lib/crypto"

export const teamsRouter: Router = Router()

// Helper: Generate high-entropy default password using CSPRNG (e.g. Sekkha-7f8a1b2c3d4e-Puggala)
export function generateDefaultPassword(): string {
  const randHex = randomBytes(6).toString("hex")
  return `Sekkha-${randHex}-Puggala`
}

// 1. GET /api/teams/members — List all members with filtering (pengurus/admin only)
teamsRouter.get("/members", requireAuth, requireRole("pengurus", "admin"), async (req, res, next) => {
  try {
    const isPrivileged = req.user?.role === "pengurus" || req.user?.role === "admin"
    const searchQuery = ((req.query.search as string) || "").toLowerCase().trim()
    const claimedStatus = (req.query.claimed_status as string) || "all"
    const roleFilter = (req.query.role as string) || "all"

    const where: any = {}

    if (claimedStatus === "claimed") {
      where.isClaimed = true
    } else if (claimedStatus === "unclaimed") {
      where.isClaimed = false
    }

    if (roleFilter !== "all") {
      if (roleFilter === "pengurus") {
        where.role = { in: ["pengurus", "admin"] }
      } else {
        where.role = roleFilter
      }
    }

    if (searchQuery) {
      const searchConditions: any[] = [
        { profile: { name: { contains: searchQuery, mode: "insensitive" } } },
        { username: { contains: searchQuery, mode: "insensitive" } },
        { userNumber: { contains: searchQuery, mode: "insensitive" } },
        { profile: { school: { name: { contains: searchQuery, mode: "insensitive" } } } },
      ]
      // Only privileged roles can search by private PII (email via blind index)
      if (isPrivileged) {
        const emailBindex = generateBlindIndex(searchQuery.trim().toLowerCase())
        if (emailBindex) {
          searchConditions.push({ emailBindex })
        }
      }
      where.OR = searchConditions
    }

    const limitParam = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined
    const pageParam = req.query.page ? parseInt(req.query.page as string, 10) : undefined
    const isPaginated = pageParam !== undefined || limitParam !== undefined
    const limit = limitParam && limitParam > 0 ? limitParam : 15
    const page = pageParam && pageParam > 0 ? pageParam : 1
    const skip = isPaginated ? (page - 1) * limit : undefined
    const take = isPaginated ? limit : undefined

    const [totalMatching, rawMembers, totalAll, umatCount, aktivisCount, pengurusCount] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        skip,
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          userNumber: true,
          isClaimed: true,
          createdAt: true,
          profile: {
            include: { school: true },
          },
          stats: {
            select: { points: true },
          },
          _count: {
            select: {
              attendances: true,
            },
          },
        },
      }),
      prisma.user.count(),
      prisma.user.count({ where: { role: "umat" } }),
      prisma.user.count({ where: { role: "aktivis" } }),
      prisma.user.count({ where: { role: { in: ["pengurus", "admin"] } } }),
    ])

    const members = rawMembers.map((m) => {
      const isSelf = req.user?.userId === m.id
      const canViewSensitive = isPrivileged || isSelf

      return {
        id: m.id,
        name: m.profile?.name || m.username || "Anggota",
        username: m.username || null,
        email: canViewSensitive ? (decrypt(m.email) || m.email) : null,
        phone: canViewSensitive ? (decrypt(m.profile?.phone) || null) : null,
        school: m.profile?.school?.name || null,
        school_id: m.profile?.schoolId || null,
        birth_date: canViewSensitive ? (decrypt(m.profile?.birthDate) || null) : null,
        gender: canViewSensitive ? (decrypt(m.profile?.gender) || null) : null,
        role: m.role,
        avatar_url: m.profile?.avatarUrl || null,
        user_number: m.userNumber || null,
        is_claimed: m.isClaimed ?? true,
        total_attendance: m._count?.attendances ?? 0,
        points: canViewSensitive ? (m.stats?.points ?? 0) : 0,
        created_at: new Date(m.createdAt).toISOString(),
      }
    })

    if (isPaginated) {
      const totalPages = Math.max(1, Math.ceil(totalMatching / limit))
      return res.json({
        items: members,
        members,
        page,
        limit,
        total: totalMatching,
        totalPages,
        stats: {
          total: totalAll,
          umat: umatCount,
          aktivis: aktivisCount,
          pengurus: pengurusCount,
        },
      })
    }

    res.json(members)
  } catch (err) {
    next(err)
  }
})

// 2. GET /api/teams/members/:id — Get member detail (pengurus/admin only)
teamsRouter.get("/members/:id", requireAuth, requireRole("pengurus", "admin"), async (req, res, next) => {
  try {
    const isPrivileged = req.user?.role === "pengurus" || req.user?.role === "admin"
    const isSelf = req.user?.userId === req.params.id
    const canViewSensitive = isPrivileged || isSelf

    const member = await prisma.user.findUnique({
      where: { id: req.params.id as string },
      include: {
        profile: {
          include: { school: true },
        },
        stats: true,
        attendances: {
          include: {
            event: {
              select: {
                id: true,
                title: true,
                eventDate: true,
                location: true,
              },
            },
          },
          orderBy: { scannedAt: "desc" },
          take: 20,
        },
        badges: {
          include: {
            badge: true,
          },
        },
      },
    })

    if (!member) {
      res.status(404).json({ error: "Member not found" })
      return
    }

    res.json({
      id: member.id,
      name: member.profile?.name || member.username || "Anggota",
      username: member.username,
      email: canViewSensitive ? (decrypt(member.email) || member.email) : null,
      phone: canViewSensitive ? (decrypt(member.profile?.phone) || null) : null,
      school: member.profile?.school?.name || null,
      school_id: member.profile?.schoolId || null,
      birth_date: canViewSensitive ? (decrypt(member.profile?.birthDate) || null) : null,
      gender: canViewSensitive ? (decrypt(member.profile?.gender) || null) : null,
      role: member.role,
      avatar_url: member.profile?.avatarUrl || null,
      user_number: member.userNumber,
      is_claimed: member.isClaimed ?? true,
      points: canViewSensitive ? (member.stats?.points ?? 0) : 0,
      created_at: new Date(member.createdAt).toISOString(),
      attendances: (member.attendances || []).map((a) => ({
        id: a.id,
        event_title: a.event?.title || "Event",
        event_date: a.event?.eventDate ? new Date(a.event.eventDate).toISOString() : new Date().toISOString(),
        location: a.event?.location || "—",
        method: a.method,
        points_earned: canViewSensitive ? (a.pointsEarned || 50) : 0,
        scanned_at: new Date(a.scannedAt).toISOString(),
      })),
      badges: (member.badges || []).map((b) => ({
        id: b.id,
        name: b.badge?.name,
        icon_url: b.badge?.iconUrl,
        earned_at: new Date(b.earnedAt).toISOString(),
      })),
    })
  } catch (err) {
    next(err)
  }
})

// 3. POST /api/teams/members — Pengurus/Admin adds a new member with auto-generated username & password
const CreateMemberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30)
    .regex(/^[a-zA-Z0-9_.]+$/, "Username may only contain letters, numbers, dots, or underscores")
    .optional()
    .or(z.literal("")),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  school: z.string().optional().or(z.literal("")),
  school_id: z.string().optional().or(z.literal("")),
  birth_date: z
    .string()
    .refine((v) => !v || !isNaN(Date.parse(v)), "Format birth_date tidak valid, gunakan format tanggal ISO")
    .optional()
    .or(z.literal("")),
  gender: z.string().optional().or(z.literal("")),
  role: z.enum(["umat", "aktivis", "pengurus", "admin"]).default("umat"),
  default_password: z.string().min(8).optional(),
})

teamsRouter.post("/members", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const data = CreateMemberSchema.parse(req.body)

    if (data.email) {
      const emailBindex = generateBlindIndex(data.email)
      const existingEmail = await prisma.user.findUnique({
        where: { emailBindex: emailBindex || undefined },
      })
      if (existingEmail) {
        res.status(400).json({ error: "Email is already registered with another user." })
        return
      }
    }

    const username = data.username ? data.username.toLowerCase().trim() : await generateUniqueUsername(data.name)
    const existingUsername = await prisma.user.findUnique({
      where: { username },
    })
    if (existingUsername) {
      res.status(400).json({ error: `Username @${username} is already taken. Please choose another username.` })
      return
    }

    const defaultPassword = data.default_password || generateDefaultPassword()
    const hashedPassword = await bcrypt.hash(defaultPassword, 12)

    let resolvedSchoolId = data.school_id
    if (!resolvedSchoolId && data.school) {
      const s = await prisma.school.findUnique({ where: { name: data.school.trim() } })
      if (s) {
        resolvedSchoolId = s.id
      } else {
        const createdS = await prisma.school.create({ data: { name: data.school.trim(), type: "Lainnya" } })
        resolvedSchoolId = createdS.id
      }
    }

    const level1 = await prisma.level.findFirst({ where: { level: 1 } })

    let newMember: any = null
    let attempts = 0
    while (attempts < 5) {
      attempts++
      const userNumber = await generateUniqueUserNumber(prisma)
      try {
        newMember = await prisma.user.create({
          data: {
            username,
            password: hashedPassword,
            email: data.email ? encrypt(data.email.toLowerCase().trim()) : null,
            emailBindex: data.email ? generateBlindIndex(data.email.toLowerCase().trim()) : null,
            role: data.role,
            userNumber,
            isClaimed: true,
            profile: {
              create: {
                name: data.name.trim(),
                phone: data.phone ? encrypt(data.phone.trim()) : null,
                schoolId: resolvedSchoolId || null,
                birthDate: data.birth_date ? encrypt(new Date(data.birth_date).toISOString()) : null,
                gender: data.gender ? encrypt(data.gender.trim()) : null,
              },
            },
            stats: {
              create: {
                points: 0,
                levelId: level1?.id,
              },
            },
          },
          include: {
            profile: { include: { school: true } },
          },
        })
        break
      } catch (err: any) {
        if (err.code === "P2002" && err.meta?.target?.includes("user_number") && attempts < 5) {
          continue
        }
        throw err
      }
    }

    if (!newMember) {
      res.status(500).json({ error: "Failed to generate unique user number after multiple attempts." })
      return
    }

    await invalidate(CacheKeys.userProfile(newMember.id))

    res.status(201).json({
      id: newMember.id,
      name: newMember.profile.name,
      username: newMember.username,
      email: data.email || null,
      phone: data.phone || null,
      school: newMember.profile.school?.name || null,
      birth_date: data.birth_date || null,
      gender: data.gender || null,
      role: newMember.role,
      user_number: newMember.userNumber,
      is_claimed: true,
      default_password: defaultPassword,
      created_at: new Date(newMember.createdAt).toISOString(),
      message: `Member ${newMember.profile.name} created successfully with default password: ${defaultPassword}`,
    })
  } catch (err) {
    next(err)
  }
})

// 4. PUT /api/teams/members/:id — Edit member data
const UpdateMemberSchema = z.object({
  name: z.string().min(1).optional(),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30)
    .regex(/^[a-zA-Z0-9_.]+$/, "Username may only contain letters, numbers, dots, or underscores")
    .optional()
    .nullable()
    .or(z.literal("")),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable(),
  school: z.string().optional().nullable(),
  school_id: z.string().optional().nullable(),
  birth_date: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  role: z.enum(["umat", "aktivis", "pengurus", "admin"]).optional(),
})

teamsRouter.put("/members/:id", requireAuth, requireRole("pengurus", "admin"), async (req, res, next) => {
  try {
    const id = req.params.id as string
    const data = UpdateMemberSchema.parse(req.body)

    // Only admin can change member role
    if (data.role && req.user?.role !== "admin") {
      res.status(403).json({ error: "Only admin can change member role." })
      return
    }

    const existing = await prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    })
    if (!existing) {
      res.status(404).json({ error: "Member not found" })
      return
    }

    if (data.email) {
      const cleanEmail = data.email.toLowerCase().trim()
      const emailBindex = generateBlindIndex(cleanEmail)
      const emailInUse = await prisma.user.findUnique({ where: { emailBindex: emailBindex || undefined } })
      if (emailInUse && emailInUse.id !== id) {
        res.status(400).json({ error: "Email is already used by another member." })
        return
      }
    }

    if (data.username && data.username !== existing.username) {
      const usernameInUse = await prisma.user.findUnique({ where: { username: data.username.toLowerCase().trim() } })
      if (usernameInUse && usernameInUse.id !== id) {
        res.status(400).json({ error: "Username is already used by another member." })
        return
      }
    }

    let resolvedSchoolId = data.school_id
    if (!resolvedSchoolId && data.school) {
      const s = await prisma.school.findUnique({ where: { name: data.school.trim() } })
      if (s) {
        resolvedSchoolId = s.id
      } else {
        const createdS = await prisma.school.create({ data: { name: data.school.trim(), type: "Lainnya" } })
        resolvedSchoolId = createdS.id
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(data.username !== undefined && { username: data.username ? data.username.toLowerCase().trim() : null }),
        ...(data.email !== undefined && {
          email: data.email ? encrypt(data.email.toLowerCase().trim()) : null,
          emailBindex: data.email ? generateBlindIndex(data.email.toLowerCase().trim()) : null,
        }),
        ...(data.role && { role: data.role }),
      },
    })

    const updatedProfile = await prisma.userProfile.upsert({
      where: { userId: id },
      update: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.phone !== undefined && { phone: data.phone ? encrypt(data.phone.trim()) : null }),
        ...(resolvedSchoolId !== undefined && { schoolId: resolvedSchoolId }),
        ...(data.birth_date !== undefined && {
          birthDate: data.birth_date ? encrypt(new Date(data.birth_date).toISOString()) : null,
        }),
        ...(data.gender !== undefined && { gender: data.gender ? encrypt(data.gender.trim()) : null }),
      },
      create: {
        userId: id,
        name: data.name ? data.name.trim() : existing.username || "Anggota",
        phone: data.phone ? encrypt(data.phone.trim()) : null,
        schoolId: resolvedSchoolId || null,
        birthDate: data.birth_date ? encrypt(new Date(data.birth_date).toISOString()) : null,
        gender: data.gender ? encrypt(data.gender.trim()) : null,
      },
      include: { school: true },
    })

    await invalidate(CacheKeys.userProfile(id))

    res.json({
      id: updatedUser.id,
      name: updatedProfile.name,
      username: updatedUser.username,
      email: data.email !== undefined ? data.email : (decrypt(updatedUser.email) || updatedUser.email),
      phone: data.phone !== undefined ? data.phone : (decrypt(updatedProfile.phone) || null),
      school: updatedProfile.school?.name || null,
      birth_date: data.birth_date !== undefined ? data.birth_date : (decrypt(updatedProfile.birthDate) || null),
      gender: data.gender !== undefined ? data.gender : (decrypt(updatedProfile.gender) || null),
      role: updatedUser.role,
      user_number: updatedUser.userNumber,
      is_claimed: updatedUser.isClaimed,
      updated_at: new Date(updatedUser.updatedAt).toISOString(),
    })
  } catch (err) {
    next(err)
  }
})

// 5. DELETE /api/teams/members/:id — Delete member
teamsRouter.delete("/members/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const id = req.params.id as string
    const currentUserId = req.user!.userId

    if (id === currentUserId) {
      res.status(400).json({ error: "You cannot delete your own account." })
      return
    }

    const member = await prisma.user.findUnique({ where: { id } })
    if (!member) {
      res.status(404).json({ error: "Member not found" })
      return
    }

    if (member.role === "admin" && req.user!.role !== "admin") {
      res.status(403).json({ error: "Only Admins can delete another Admin." })
      return
    }

    await prisma.user.delete({ where: { id } })

    await invalidate(CacheKeys.userProfile(id))

    res.json({ success: true, message: "Member deleted successfully." })
  } catch (err) {
    next(err)
  }
})

// 6. POST /api/teams/members/:id/reset-password — Admin resets a member's password to default
teamsRouter.post("/members/:id/reset-password", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const id = req.params.id as string
    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    })

    if (!targetUser) {
      res.status(404).json({ error: "Member not found." })
      return
    }

    // Respect passwordChangedByUser flag: admin cannot reset password if user has set/changed their password
    if (targetUser.passwordChangedByUser) {
      res.status(403).json({
        error: "Akun ini telah mengubah kata sandi sendiri. Admin tidak dapat mereset kata sandi demi keamanan dan privasi pengguna.",
      })
      return
    }

    const defaultPassword = generateDefaultPassword()
    const hashedPassword = await bcrypt.hash(defaultPassword, 12)

    await prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        passwordChangedByUser: false,
        passwordChangedAt: new Date(),
      },
    })

    await invalidate(CacheKeys.userProfile(id))

    const memberName = targetUser.profile?.name || targetUser.username || "member"

    // If member has email, dispatch temporary password to their email directly
    const decryptedEmail = decrypt(targetUser.email) || targetUser.email
    if (decryptedEmail) {
      await sendTemporaryPasswordEmail({
        to: decryptedEmail,
        tempPassword: defaultPassword,
        name: memberName,
      })

      res.json({
        success: true,
        user_number: targetUser.userNumber,
        username: targetUser.username,
        name: memberName,
        email_sent: true,
        message: `Kata sandi sementara untuk ${memberName} berhasil dibuat dan dikirimkan ke email terdaftar (${decryptedEmail}).`,
      })
      return
    }

    // If member has no email (offline registration), provide temporary password with explicit change flag
    res.json({
      success: true,
      user_number: targetUser.userNumber,
      username: targetUser.username,
      name: memberName,
      default_password: defaultPassword,
      requires_change_on_login: true,
      message: `Kata sandi sementara untuk ${memberName} berhasil diatur. Harap minta member segera mengubah kata sandi saat masuk.`,
    })
  } catch (err) {
    next(err)
  }
})

// 7. POST /api/teams/members/:id/generate-claim-pin — Generate secure claim PIN for pre-provisioned member (pengurus/admin)
teamsRouter.post("/members/:id/generate-claim-pin", requireAuth, requireRole("pengurus", "admin"), async (req, res, next) => {
  try {
    const id = req.params.id as string
    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    })

    if (!targetUser) {
      res.status(404).json({ error: "Anggota tidak ditemukan." })
      return
    }

    if (targetUser.isClaimed) {
      res.status(400).json({ error: "Akun anggota ini sudah diklaim / aktif." })
      return
    }

    // Tier 1: Generate 6-digit numeric PIN using CSPRNG
    const rawPin = randomInt(100000, 1000000).toString()
    // Tier 1: Hash with bcrypt (12 rounds) before saving to DB
    const hashedPin = await bcrypt.hash(rawPin, 12)
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Valid for 30 days

    await prisma.user.update({
      where: { id },
      data: {
        claimPin: hashedPin,
        claimPinExpiresAt: expiresAt,
      },
    })

    await invalidate(CacheKeys.userProfile(id))

    const memberName = targetUser.profile?.name || targetUser.username || "Anggota"

    // One-time response to admin/pengurus (PIN is never stored plaintext and never shown in GET list)
    res.json({
      success: true,
      claim_pin: rawPin,
      user_number: targetUser.userNumber,
      name: memberName,
      expires_at: expiresAt.toISOString(),
      message: `PIN klaim 6-digit untuk ${memberName} berhasil dibuat: ${rawPin}. Berikan PIN ini ke anggota terkait.`,
    })
  } catch (err) {
    next(err)
  }
})

// 8. POST /api/teams/link-legacy-account — Link pre-provisioned legacy account using claim PIN (requires auth)
const LinkLegacyAccountSchema = z.object({
  user_number: z.string().min(1, "Nomor anggota target wajib diisi"),
  claim_pin: z.string().min(6, "PIN aktivasi minimal 6 karakter"),
})

teamsRouter.post("/link-legacy-account", requireAuth, async (req, res, next) => {
  try {
    const { user_number, claim_pin } = LinkLegacyAccountSchema.parse(req.body)
    const cleanPin = claim_pin.replace(/[^0-9]/g, "").trim()
    const currentUserId = req.user!.userId

    // Find pre-provisioned target member
    const targetUser = await prisma.user.findFirst({
      where: {
        userNumber: user_number.trim(),
        isClaimed: false,
      },
      include: {
        stats: true,
      },
    })

    if (!targetUser || !targetUser.claimPin) {
      res.status(404).json({ error: "Akun dengan nomor anggota tersebut tidak ditemukan atau sudah diklaim." })
      return
    }

    if (targetUser.id === currentUserId) {
      res.status(400).json({ error: "Tidak dapat menautkan akun ke diri sendiri." })
      return
    }

    if (targetUser.claimPinExpiresAt && targetUser.claimPinExpiresAt < new Date()) {
      res.status(400).json({ error: "PIN aktivasi sudah kedaluwarsa. Silakan minta PIN baru ke pengurus." })
      return
    }

    // Tier 1: verify using bcrypt.compare against the stored hash
    const isPinValid = await bcrypt.compare(cleanPin, targetUser.claimPin)
    if (!isPinValid) {
      res.status(400).json({ error: "PIN aktivasi salah." })
      return
    }

    // Transfer attendances to current user
    const existingAttendances = await prisma.attendance.findMany({
      where: { userId: currentUserId },
      select: { eventId: true },
    })
    const existingEventIds = new Set(existingAttendances.map((a) => a.eventId))

    const targetAttendances = await prisma.attendance.findMany({
      where: { userId: targetUser.id },
    })

    for (const att of targetAttendances) {
      if (!existingEventIds.has(att.eventId)) {
        await prisma.attendance.update({
          where: { id: att.id },
          data: { userId: currentUserId },
        })
      }
    }

    // Transfer badges
    const existingBadges = await prisma.userBadge.findMany({
      where: { userId: currentUserId },
      select: { badgeId: true },
    })
    const existingBadgeIds = new Set(existingBadges.map((b) => b.badgeId))

    const targetBadges = await prisma.userBadge.findMany({
      where: { userId: targetUser.id },
    })

    for (const b of targetBadges) {
      if (!existingBadgeIds.has(b.badgeId)) {
        await prisma.userBadge.update({
          where: { id: b.id },
          data: { userId: currentUserId },
        })
      }
    }

    // Merge points from target stats
    const legacyPoints = targetUser.stats?.points || 0
    if (legacyPoints > 0) {
      await prisma.userStats.upsert({
        where: { userId: currentUserId },
        update: { points: { increment: legacyPoints } },
        create: { userId: currentUserId, points: legacyPoints },
      })

      await prisma.pointTransaction.create({
        data: {
          userId: currentUserId,
          amount: legacyPoints,
          type: "system",
          description: `Penggabungan data akun lama (${targetUser.userNumber}) via PIN Aktivasi`,
        },
      })
    }

    // Mark pre-provisioned user as claimed and wipe claimPin
    await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        isClaimed: true,
        claimedAt: new Date(),
        claimPin: null,
        claimPinExpiresAt: null,
      },
    })

    await invalidate(CacheKeys.userProfile(currentUserId))
    await invalidate(CacheKeys.userProfile(targetUser.id))

    res.json({
      success: true,
      message: `Akun lama (${targetUser.userNumber}) berhasil ditautkan. Riwayat absensi dan poin telah digabungkan.`,
    })
  } catch (err) {
    next(err)
  }
})

