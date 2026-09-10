import { randomInt } from "crypto"
import { Router } from "express"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { prisma } from "../../../lib/prisma"
import { requireAuth, requireRole } from "../../../middleware/auth"
import { generateUniqueUsername } from "../../auth/internal/repository"
import { invalidate, CacheKeys } from "../../../lib/cache"

export const teamsRouter: Router = Router()

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

// Helper: Generate default password with format Sekkha(num random 4)Puggala using CSPRNG
export function generateDefaultPassword(): string {
  const random4 = randomInt(1000, 10000).toString()
  return `Sekkha${random4}Puggala`
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
      // Only privileged roles can search by private PII (email, phone)
      if (isPrivileged) {
        searchConditions.push(
          { email: { contains: searchQuery, mode: "insensitive" } },
          { profile: { phone: { contains: searchQuery, mode: "insensitive" } } },
        )
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
        email: canViewSensitive ? m.email : null,
        phone: canViewSensitive ? (m.profile?.phone || null) : null,
        school: m.profile?.school?.name || null,
        school_id: m.profile?.schoolId || null,
        birth_date: canViewSensitive && m.profile?.birthDate ? new Date(m.profile.birthDate).toISOString() : null,
        gender: canViewSensitive ? (m.profile?.gender || null) : null,
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
      email: canViewSensitive ? member.email : null,
      phone: canViewSensitive ? (member.profile?.phone || null) : null,
      school: member.profile?.school?.name || null,
      school_id: member.profile?.schoolId || null,
      birth_date: canViewSensitive && member.profile?.birthDate ? new Date(member.profile.birthDate).toISOString() : null,
      gender: canViewSensitive ? (member.profile?.gender || null) : null,
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
  birth_date: z.string().optional().or(z.literal("")),
  gender: z.string().optional().or(z.literal("")),
  role: z.enum(["umat", "aktivis", "pengurus", "admin"]).default("umat"),
  default_password: z.string().min(6).optional(),
})

teamsRouter.post("/members", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const data = CreateMemberSchema.parse(req.body)

    if (data.email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase().trim() },
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
    const hashedPassword = await bcrypt.hash(defaultPassword, 10)
    const userNumber = await generateUserNumber()

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

    const newMember = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        email: data.email ? data.email.toLowerCase().trim() : null,
        role: data.role,
        userNumber,
        isClaimed: true,
        profile: {
          create: {
            name: data.name.trim(),
            phone: data.phone ? data.phone.trim() : null,
            schoolId: resolvedSchoolId || null,
            birthDate: data.birth_date ? new Date(data.birth_date) : null,
            gender: data.gender ? data.gender.trim() : null,
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

    res.status(201).json({
      id: newMember.id,
      name: newMember.profile?.name || data.name,
      username: newMember.username,
      email: newMember.email,
      phone: newMember.profile?.phone,
      school: newMember.profile?.school?.name || null,
      school_id: newMember.profile?.schoolId,
      birth_date: newMember.profile?.birthDate ? new Date(newMember.profile.birthDate).toISOString() : null,
      gender: newMember.profile?.gender,
      role: newMember.role,
      user_number: newMember.userNumber,
      default_password: defaultPassword,
      is_claimed: true,
      created_at: new Date(newMember.createdAt).toISOString(),
      message: "Member added successfully",
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

    if (data.email && data.email !== existing.email) {
      const emailInUse = await prisma.user.findUnique({ where: { email: data.email.toLowerCase().trim() } })
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
        ...(data.email !== undefined && { email: data.email ? data.email.toLowerCase().trim() : null }),
        ...(data.role && { role: data.role }),
      },
    })

    const updatedProfile = await prisma.userProfile.upsert({
      where: { userId: id },
      update: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.phone !== undefined && { phone: data.phone ? data.phone.trim() : null }),
        ...(resolvedSchoolId !== undefined && { schoolId: resolvedSchoolId }),
        ...(data.birth_date !== undefined && {
          birthDate: data.birth_date ? new Date(data.birth_date) : null,
        }),
        ...(data.gender !== undefined && { gender: data.gender ? data.gender.trim() : null }),
      },
      create: {
        userId: id,
        name: data.name ? data.name.trim() : existing.username || "Anggota",
        phone: data.phone ? data.phone.trim() : null,
        schoolId: resolvedSchoolId || null,
        birthDate: data.birth_date ? new Date(data.birth_date) : null,
        gender: data.gender ? data.gender.trim() : null,
      },
      include: { school: true },
    })

    await invalidate(CacheKeys.userProfile(id))

    res.json({
      id: updatedUser.id,
      name: updatedProfile.name,
      username: updatedUser.username,
      email: updatedUser.email,
      phone: updatedProfile.phone,
      school: updatedProfile.school?.name || null,
      birth_date: updatedProfile.birthDate ? new Date(updatedProfile.birthDate).toISOString() : null,
      gender: updatedProfile.gender,
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

// 6. GET /api/teams/invitations — Get sent invitations (requires pengurus or admin)
teamsRouter.get("/invitations", requireAuth, requireRole("pengurus", "admin"), async (req, res, next) => {
  try {
    const invitations = await prisma.roleInvitation.findMany({
      include: {
        invitedBy: {
          select: {
            id: true,
            profile: { select: { name: true } },
          },
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
        invited_by: {
          id: inv.invitedBy.id,
          name: inv.invitedBy.profile?.name || "Admin",
        },
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
      res.status(400).json({ error: "A similar invitation is already pending for this email." })
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
          title: "New Role Invitation",
          message: `You have been invited to join as ${role === "pengurus" ? "Organizer" : "Activist"}.`,
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
      res.status(404).json({ error: "Invitation not found" })
      return
    }

    if (invitation.status !== "pending") {
      res.status(400).json({ error: "Invitation is no longer active" })
      return
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
    })

    if (!user || user.email !== invitation.email) {
      res.status(403).json({ error: "Your email does not match this invitation" })
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
      res.status(404).json({ error: "Invitation not found" })
      return
    }

    if (invitation.status !== "pending") {
      res.status(400).json({ error: "Invitation is no longer active" })
      return
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
    })

    if (!user || user.email !== invitation.email) {
      res.status(403).json({ error: "Your email does not match this invitation" })
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

// 10. POST /api/teams/members/:id/reset-password — Admin resets a member's password to default
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

    // NEW LOGIC PER USER REQUIREMENT:
    // Jika akun sudah ter-claim atau password diubah oleh user, admin tidak boleh mereset password
    if (targetUser.isClaimed && targetUser.passwordChangedByUser) {
      res.status(403).json({
        error: "Akun ini telah diklaim dan diatur oleh user. Admin tidak dapat mereset password demi keamanan dan privasi pengguna.",
      })
      return
    }

    const defaultPassword = generateDefaultPassword()
    const hashedPassword = await bcrypt.hash(defaultPassword, 10)

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

    res.json({
      success: true,
      user_number: targetUser.userNumber,
      username: targetUser.username,
      name: memberName,
      default_password: defaultPassword,
      message: `Password for ${memberName} (${targetUser.username ? `@${targetUser.username}` : "member"}) successfully reset to: ${defaultPassword}`,
    })
  } catch (err) {
    next(err)
  }
})
