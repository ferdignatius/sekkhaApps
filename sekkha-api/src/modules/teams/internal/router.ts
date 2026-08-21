import { Router } from "express"
import { z } from "zod"
import { prisma } from "../../../lib/prisma"
import { requireAuth, requireRole } from "../../../middleware/auth"

export const teamsRouter = Router()

// Helper: Generate standardized user number format YYYYMMDDxxxx
async function generateUserNumber(date: Date = new Date()): Promise<string> {
  const yy = date.getFullYear().toString()
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  const prefix = `${yy}${mm}${dd}`
  const count = await prisma.user.count({
    where: { userNumber: { startsWith: prefix } },
  })
  return `${prefix}${String(count + 1).padStart(4, "0")}`
}

// 1. GET /api/teams/members — List all members with filtering
teamsRouter.get("/members", requireAuth, async (req, res, next) => {
  try {
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
      where.role = roleFilter
    }

    if (searchQuery) {
      where.OR = [
        { name: { contains: searchQuery, mode: "insensitive" } },
        { email: { contains: searchQuery, mode: "insensitive" } },
        { userNumber: { contains: searchQuery, mode: "insensitive" } },
        { school: { contains: searchQuery, mode: "insensitive" } },
        { phone: { contains: searchQuery, mode: "insensitive" } },
      ]
    }

    const rawMembers = await (prisma.user as any).findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        school: true,
        birthDate: true,
        gender: true,
        role: true,
        avatarUrl: true,
        userNumber: true,
        isClaimed: true,
        claimedAt: true,
        points: true,
        createdAt: true,
        _count: {
          select: {
            attendances: true,
          },
        },
      },
      orderBy: [{ isClaimed: "asc" }, { createdAt: "desc" }],
    })

    const members = await Promise.all(
      rawMembers.map(async (m: any) => {
        let uNum = m.userNumber
        if (!uNum) {
          uNum = await generateUserNumber(m.createdAt)
          await (prisma.user as any).update({ where: { id: m.id }, data: { userNumber: uNum } }).catch(() => {})
        }
        return {
          id: m.id,
          name: m.name,
          email: m.email,
          phone: m.phone,
          school: m.school,
          birth_date: m.birthDate ? new Date(m.birthDate).toISOString() : null,
          gender: m.gender,
          role: m.role,
          avatar_url: m.avatarUrl,
          user_number: uNum,
          is_claimed: m.isClaimed ?? true,
          claimed_at: m.claimedAt ? new Date(m.claimedAt).toISOString() : null,
          claim_pin: m.claimPin || null,
          total_attendance: m._count?.attendances ?? 0,
          points: m.points ?? 0,
          created_at: new Date(m.createdAt).toISOString(),
        }
      })
    )

    res.json(members)
  } catch (err) {
    next(err)
  }
})

// 2. GET /api/teams/members/:id — Get member detail
teamsRouter.get("/members/:id", requireAuth, async (req, res, next) => {
  try {
    const member = await (prisma.user as any).findUnique({
      where: { id: req.params.id as string },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        school: true,
        birthDate: true,
        gender: true,
        role: true,
        avatarUrl: true,
        userNumber: true,
        isClaimed: true,
        claimedAt: true,
        points: true,
        createdAt: true,
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
      res.status(404).json({ error: "Anggota tidak ditemukan" })
      return
    }

    res.json({
      id: member.id,
      name: member.name,
      email: member.email,
      phone: member.phone,
      school: member.school,
      birth_date: member.birthDate ? new Date(member.birthDate).toISOString() : null,
      gender: member.gender,
      role: member.role,
      avatar_url: member.avatarUrl,
      user_number: member.userNumber,
      is_claimed: member.isClaimed ?? true,
      claimed_at: member.claimedAt ? new Date(member.claimedAt).toISOString() : null,
      points: member.points ?? 0,
      created_at: new Date(member.createdAt).toISOString(),
      attendances: (member.attendances || []).map((a: any) => ({
        id: a.id,
        event_title: a.event?.title || "Event",
        event_date: a.event?.eventDate ? new Date(a.event.eventDate).toISOString() : new Date().toISOString(),
        location: a.event?.location || "—",
        method: a.method,
        points_earned: a.pointsEarned || 50,
        scanned_at: new Date(a.scannedAt).toISOString(),
      })),
      badges: (member.badges || []).map((b: any) => ({
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

// 3. POST /api/teams/members — Pengurus/Admin adds a new pre-provisioned member
const CreateMemberSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  email: z.string().email("Email tidak valid").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  school: z.string().optional().or(z.literal("")),
  birth_date: z.string().optional().or(z.literal("")),
  gender: z.string().optional().or(z.literal("")),
  role: z.enum(["umat", "aktivis", "pengurus", "admin"]).default("umat"),
})

teamsRouter.post("/members", requireAuth, requireRole("pengurus", "admin"), async (req, res, next) => {
  try {
    const data = CreateMemberSchema.parse(req.body)

    if (data.email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email: data.email },
      })
      if (existingEmail) {
        res.status(400).json({ error: "Email sudah terdaftar pada pengguna lain." })
        return
      }
    }

    const userNumber = await generateUserNumber()

    const newMember = await (prisma.user as any).create({
      data: {
        name: data.name.trim(),
        email: data.email ? data.email.trim() : null,
        phone: data.phone ? data.phone.trim() : null,
        school: data.school ? data.school.trim() : null,
        birthDate: data.birth_date ? new Date(data.birth_date) : null,
        gender: data.gender ? data.gender.trim() : null,
        role: data.role,
        userNumber,
        isClaimed: false,
        points: 0,
      },
    })

    res.status(201).json({
      id: newMember.id,
      name: newMember.name,
      email: newMember.email,
      phone: newMember.phone,
      school: newMember.school,
      birth_date: newMember.birthDate ? new Date(newMember.birthDate).toISOString() : null,
      gender: newMember.gender,
      role: newMember.role,
      user_number: newMember.userNumber,
      is_claimed: false,
      created_at: new Date(newMember.createdAt).toISOString(),
      message: "Data umat berhasil ditambahkan",
    })
  } catch (err) {
    next(err)
  }
})

// 4. PUT /api/teams/members/:id — Edit member data
const UpdateMemberSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable(),
  school: z.string().optional().nullable(),
  birth_date: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  role: z.enum(["umat", "aktivis", "pengurus", "admin"]).optional(),
})

teamsRouter.put("/members/:id", requireAuth, requireRole("pengurus", "admin"), async (req, res, next) => {
  try {
    const id = req.params.id as string
    const data = UpdateMemberSchema.parse(req.body)

    const existing = await (prisma.user as any).findUnique({ where: { id } })
    if (!existing) {
      res.status(404).json({ error: "Anggota tidak ditemukan" })
      return
    }

    if (data.email && data.email !== existing.email) {
      const emailInUse = await (prisma.user as any).findUnique({ where: { email: data.email } })
      if (emailInUse) {
        res.status(400).json({ error: "Email sudah digunakan oleh anggota lain." })
        return
      }
    }

    const updated = await (prisma.user as any).update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.email !== undefined && { email: data.email ? data.email.trim() : null }),
        ...(data.phone !== undefined && { phone: data.phone ? data.phone.trim() : null }),
        ...(data.school !== undefined && { school: data.school ? data.school.trim() : null }),
        ...(data.birth_date !== undefined && {
          birthDate: data.birth_date ? new Date(data.birth_date) : null,
        }),
        ...(data.gender !== undefined && { gender: data.gender ? data.gender.trim() : null }),
        ...(data.role && { role: data.role }),
      },
    })

    const { invalidate, CacheKeys } = await import("../../../lib/cache")
    await invalidate(CacheKeys.userProfile(id))

    res.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      school: updated.school,
      birth_date: updated.birthDate ? new Date(updated.birthDate).toISOString() : null,
      gender: updated.gender,
      role: updated.role,
      user_number: updated.userNumber,
      is_claimed: updated.isClaimed,
      points: updated.points,
      updated_at: new Date(updated.updatedAt).toISOString(),
    })
  } catch (err) {
    next(err)
  }
})

// 5. DELETE /api/teams/members/:id — Delete member
teamsRouter.delete("/members/:id", requireAuth, requireRole("pengurus", "admin"), async (req, res, next) => {
  try {
    const id = req.params.id as string
    const currentUserId = req.user!.userId

    if (id === currentUserId) {
      res.status(400).json({ error: "Tidak dapat menghapus akun Anda sendiri." })
      return
    }

    const member = await (prisma.user as any).findUnique({ where: { id } })
    if (!member) {
      res.status(404).json({ error: "Anggota tidak ditemukan" })
      return
    }

    if (member.role === "admin" && req.user!.role !== "admin") {
      res.status(403).json({ error: "Hanya Admin yang dapat menghapus sesama Admin." })
      return
    }

    await (prisma.user as any).delete({ where: { id } })

    const { invalidate, CacheKeys } = await import("../../../lib/cache")
    await invalidate(CacheKeys.userProfile(id))

    res.json({ success: true, message: "Data anggota berhasil dihapus." })
  } catch (err) {
    next(err)
  }
})

// 6. GET /api/teams/invitations — Get sent invitations (requires pengurus or admin)
teamsRouter.get("/invitations", requireAuth, requireRole("pengurus", "admin"), async (req, res, next) => {
  try {
    const invitations = await prisma.roleInvitation.findMany({
      include: {
        invitedBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })
    res.json(
      invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        status: inv.status,
        created_at: inv.createdAt.toISOString(),
        invited_by: inv.invitedBy,
      }))
    )
  } catch (err) {
    next(err)
  }
})

// 7. POST /api/teams/invitations — Invite a user to a role (requires admin)
const InviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["pengurus", "aktivis"]),
})

teamsRouter.post("/invitations", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { email, role } = InviteSchema.parse(req.body)

    const existing = await prisma.roleInvitation.findFirst({
      where: { email, role, status: "pending" },
    })
    if (existing) {
      res.status(400).json({ error: "Undangan serupa masih pending untuk email ini." })
      return
    }

    const invitation = await prisma.roleInvitation.create({
      data: {
        email,
        role,
        status: "pending",
        invitedById: req.user!.userId,
      },
    })

    const targetUser = await prisma.user.findUnique({
      where: { email },
    })

    if (targetUser) {
      await prisma.notification.create({
        data: {
          userId: targetUser.id,
          title: "Undangan Peran Baru",
          message: `Anda diundang untuk bergabung sebagai ${role === "pengurus" ? "Pengurus" : "Aktivis"}.`,
          type: "role_invitation",
          status: "unread",
          data: { invitationId: invitation.id },
        },
      })
    }

    res.status(201).json({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
    })
  } catch (err) {
    next(err)
  }
})

// 8. POST /api/teams/invitations/:id/accept — Accept role invitation (requires auth)
teamsRouter.post("/invitations/:id/accept", requireAuth, async (req, res, next) => {
  try {
    const invitation = await prisma.roleInvitation.findUnique({
      where: { id: req.params.id as string },
    })

    if (!invitation) {
      res.status(404).json({ error: "Undangan tidak ditemukan" })
      return
    }

    if (invitation.status !== "pending") {
      res.status(400).json({ error: "Undangan sudah tidak aktif" })
      return
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
    })

    if (!user || user.email !== invitation.email) {
      res.status(403).json({ error: "Email Anda tidak cocok dengan undangan ini" })
      return
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { role: invitation.role },
    })

    await prisma.roleInvitation.update({
      where: { id: invitation.id },
      data: { status: "accepted" },
    })

    const notification = await prisma.notification.findFirst({
      where: {
        userId: user.id,
        type: "role_invitation",
        status: "unread",
      },
    })

    if (notification && (notification.data as any)?.invitationId === invitation.id) {
      await prisma.notification.update({
        where: { id: notification.id },
        data: { status: "read" },
      })
    }

    const { invalidate, CacheKeys } = await import("../../../lib/cache")
    await invalidate(CacheKeys.userProfile(user.id))

    res.json({ success: true, role: invitation.role })
  } catch (err) {
    next(err)
  }
})

// 9. POST /api/teams/invitations/:id/reject — Reject role invitation (requires auth)
teamsRouter.post("/invitations/:id/reject", requireAuth, async (req, res, next) => {
  try {
    const invitation = await prisma.roleInvitation.findUnique({
      where: { id: req.params.id as string },
    })

    if (!invitation) {
      res.status(404).json({ error: "Undangan tidak ditemukan" })
      return
    }

    if (invitation.status !== "pending") {
      res.status(400).json({ error: "Undangan sudah tidak aktif" })
      return
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
    })

    if (!user || user.email !== invitation.email) {
      res.status(403).json({ error: "Email Anda tidak cocok dengan undangan ini" })
      return
    }

    await prisma.roleInvitation.update({
      where: { id: invitation.id },
      data: { status: "rejected" },
    })

    const notification = await prisma.notification.findFirst({
      where: {
        userId: user.id,
        type: "role_invitation",
        status: "unread",
      },
    })

    if (notification && (notification.data as any)?.invitationId === invitation.id) {
      await prisma.notification.update({
        where: { id: notification.id },
        data: { status: "read" },
      })
    }

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

// 10. POST /api/teams/members/:id/generate-claim-pin — Generate 6-digit PIN for pre-provisioned member (requires pengurus or admin)
teamsRouter.post("/members/:id/generate-claim-pin", requireAuth, requireRole("pengurus", "admin"), async (req, res, next) => {
  try {
    const id = req.params.id as string
    const targetUser = await (prisma.user as any).findUnique({
      where: { id },
    })

    if (!targetUser) {
      res.status(404).json({ error: "Anggota tidak ditemukan." })
      return
    }

    if (targetUser.isClaimed) {
      res.status(400).json({ error: "Akun anggota ini sudah diklaim / tertaut dengan email aktif." })
      return
    }

    // Generate secure random 6-digit numeric PIN
    const generatedPin = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Valid for 30 days

    await (prisma.user as any).update({
      where: { id },
      data: {
        claimPin: generatedPin,
        claimPinExpiresAt: expiresAt,
      },
    })

    const { invalidate, CacheKeys } = await import("../../../lib/cache")
    await invalidate(CacheKeys.userProfile(id))

    res.json({
      success: true,
      claim_pin: generatedPin,
      user_number: targetUser.userNumber,
      name: targetUser.name,
      phone: targetUser.phone,
      expires_at: expiresAt.toISOString(),
      message: `PIN Aktivasi 6-digit untuk ${targetUser.name} berhasil dibuat: ${generatedPin}`,
    })
  } catch (err) {
    next(err)
  }
})

// 11. POST /api/teams/link-legacy-account — Link pre-provisioned account using 6-digit PIN
teamsRouter.post("/link-legacy-account", requireAuth, async (req, res, next) => {
  try {
    const { z } = await import("zod")
    const { claim_pin, target_user_id } = z.object({
      claim_pin: z.string().min(6, "PIN aktivasi harus 6 digit").max(8),
      target_user_id: z.string().optional(),
    }).parse(req.body)

    const cleanPin = claim_pin.replace(/[^0-9]/g, "").trim()
    const currentUserId = req.user!.userId

    // Find pre-provisioned member by PIN
    const targetUser = await (prisma.user as any).findFirst({
      where: {
        claimPin: cleanPin,
        isClaimed: false,
        ...(target_user_id ? {
          OR: [
            { userNumber: target_user_id },
            { id: target_user_id },
          ],
        } : {}),
      },
      include: {
        attendances: true,
        badges: true,
        rsvps: true,
        pointTransactions: true,
      },
    })

    if (!targetUser) {
      res.status(404).json({
        error: "PIN aktivasi tidak valid atau sudah pernah digunakan. Silakan periksa kembali PIN 6-digit Anda.",
      })
      return
    }

    if (targetUser.id === currentUserId) {
      res.status(400).json({ error: "Tidak dapat menautkan akun ke akun yang sedang Anda gunakan." })
      return
    }

    if (targetUser.claimPinExpiresAt && new Date(targetUser.claimPinExpiresAt) < new Date()) {
      res.status(400).json({ error: "PIN aktivasi sudah kedaluwarsa. Silakan minta PIN baru ke pengurus." })
      return
    }

    // Merge attendances
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

    // Merge badges
    let mergedBadges = 0
    for (const b of targetUser.badges) {
      const exists = await prisma.userBadge.findUnique({
        where: { userId_badgeId: { userId: currentUserId, badgeId: b.badgeId } },
      })
      if (!exists) {
        await prisma.userBadge.create({
          data: {
            userId: currentUserId,
            badgeId: b.badgeId,
            earnedAt: b.earnedAt,
          },
        })
        mergedBadges++
      }
    }

    // Merge points
    const legacyPoints = targetUser.points || (targetUser.attendances.length * 50)
    const currentUser = await prisma.user.findUnique({ where: { id: currentUserId } })
    const newTotalPoints = (currentUser?.points || 0) + legacyPoints

    await (prisma.user as any).update({
      where: { id: currentUserId },
      data: {
        points: newTotalPoints,
        ...(targetUser.phone && !currentUser?.phone ? { phone: targetUser.phone } : {}),
        ...(targetUser.school && !currentUser?.school ? { school: targetUser.school } : {}),
        ...(targetUser.birthDate && !currentUser?.birthDate ? { birthDate: targetUser.birthDate } : {}),
        ...(targetUser.gender && !currentUser?.gender ? { gender: targetUser.gender } : {}),
      },
    })

    if (legacyPoints > 0) {
      await prisma.pointTransaction.create({
        data: {
          userId: currentUserId,
          amount: legacyPoints,
          type: "manual",
          description: `Penggabungan data kartu lama (${targetUser.userNumber || targetUser.name}) via PIN Aktivasi`,
        },
      })
    }

    // Mark pre-provisioned user as claimed & clear PIN
    await (prisma.user as any).update({
      where: { id: targetUser.id },
      data: {
        isClaimed: true,
        claimedAt: new Date(),
        claimPin: null,
        claimPinExpiresAt: null,
      },
    })

    const { invalidate, CacheKeys } = await import("../../../lib/cache")
    await invalidate(CacheKeys.userProfile(currentUserId))
    await invalidate(CacheKeys.userAttendances(currentUserId))
    await invalidate(CacheKeys.userBadges(currentUserId))
    await invalidate(CacheKeys.userProfile(targetUser.id))

    res.json({
      success: true,
      message: `Akun data lama (${targetUser.name}) berhasil ditautkan!`,
      data: {
        merged_user_name: targetUser.name,
        merged_user_number: targetUser.userNumber,
        merged_attendances_count: mergedAttendances,
        merged_badges_count: mergedBadges,
        new_total_points: newTotalPoints,
      },
    })
  } catch (err) {
    next(err)
  }
})

