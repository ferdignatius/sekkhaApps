import { Router } from "express"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { prisma } from "../../../lib/prisma"
import { requireAuth, requireRole } from "../../../middleware/auth"
import { generateUniqueUsername } from "../../auth/internal/repository"
import { invalidate, CacheKeys } from "../../../lib/cache"

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
        { username: { contains: searchQuery, mode: "insensitive" } },
        { email: { contains: searchQuery, mode: "insensitive" } },
        { userNumber: { contains: searchQuery, mode: "insensitive" } },
        { school: { contains: searchQuery, mode: "insensitive" } },
        { phone: { contains: searchQuery, mode: "insensitive" } },
      ]
    }

    const limitParam = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined
    const pageParam = req.query.page ? parseInt(req.query.page as string, 10) : undefined
    const skip = pageParam && limitParam ? (pageParam - 1) * limitParam : undefined

    const rawMembers = await (prisma.user as any).findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limitParam,
      skip,
      select: {
        id: true,
        name: true,
        username: true,
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
        claimPin: true,
        points: true,
        createdAt: true,
        _count: {
          select: {
            attendances: true,
          },
        },
      },
    })

    const members = rawMembers.map((m: any) => ({
      id: m.id,
      name: m.name,
      username: m.username || null,
      email: m.email,
      phone: m.phone,
      school: m.school,
      birth_date: m.birthDate ? new Date(m.birthDate).toISOString() : null,
      gender: m.gender,
      role: m.role,
      avatar_url: m.avatarUrl,
      user_number: m.userNumber || null,
      is_claimed: m.isClaimed ?? true,
      claimed_at: m.claimedAt ? new Date(m.claimedAt).toISOString() : null,
      claim_pin: m.claimPin || null,
      total_attendance: m._count?.attendances ?? 0,
      points: m.points ?? 0,
      created_at: new Date(m.createdAt).toISOString(),
    }))

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
      res.status(404).json({ error: "Member not found" })
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
  birth_date: z.string().optional().or(z.literal("")),
  gender: z.string().optional().or(z.literal("")),
  role: z.enum(["umat", "aktivis", "pengurus", "admin"]).default("umat"),
  default_password: z.string().min(6).optional(),
})

teamsRouter.post("/members", requireAuth, requireRole("pengurus", "admin"), async (req, res, next) => {
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

    const defaultPassword = data.default_password || "sekkha123"
    const hashedPassword = await bcrypt.hash(defaultPassword, 10)
    const userNumber = await generateUserNumber()

    const newMember = await (prisma.user as any).create({
      data: {
        name: data.name.trim(),
        username,
        password: hashedPassword,
        email: data.email ? data.email.toLowerCase().trim() : null,
        phone: data.phone ? data.phone.trim() : null,
        school: data.school ? data.school.trim() : null,
        birthDate: data.birth_date ? new Date(data.birth_date) : null,
        gender: data.gender ? data.gender.trim() : null,
        role: data.role,
        userNumber,
        isClaimed: true,
        points: 0,
      },
    })

    res.status(201).json({
      id: newMember.id,
      name: newMember.name,
      username: newMember.username,
      email: newMember.email,
      phone: newMember.phone,
      school: newMember.school,
      birth_date: newMember.birthDate ? new Date(newMember.birthDate).toISOString() : null,
      gender: newMember.gender,
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
      res.status(404).json({ error: "Member not found" })
      return
    }

    if (data.email && data.email !== existing.email) {
      const emailInUse = await (prisma.user as any).findUnique({ where: { email: data.email.toLowerCase().trim() } })
      if (emailInUse) {
        res.status(400).json({ error: "Email is already used by another member." })
        return
      }
    }

    if (data.username && data.username !== existing.username) {
      const usernameInUse = await (prisma.user as any).findUnique({ where: { username: data.username.toLowerCase().trim() } })
      if (usernameInUse) {
        res.status(400).json({ error: "Username is already used by another member." })
        return
      }
    }

    const updated = await (prisma.user as any).update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.username !== undefined && { username: data.username ? data.username.toLowerCase().trim() : null }),
        ...(data.email !== undefined && { email: data.email ? data.email.toLowerCase().trim() : null }),
        ...(data.phone !== undefined && { phone: data.phone ? data.phone.trim() : null }),
        ...(data.school !== undefined && { school: data.school ? data.school.trim() : null }),
        ...(data.birth_date !== undefined && {
          birthDate: data.birth_date ? new Date(data.birth_date) : null,
        }),
        ...(data.gender !== undefined && { gender: data.gender ? data.gender.trim() : null }),
        ...(data.role && { role: data.role }),
      },
    })

    await invalidate(CacheKeys.userProfile(id))

    res.json({
      id: updated.id,
      name: updated.name,
      username: updated.username,
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
      res.status(400).json({ error: "You cannot delete your own account." })
      return
    }

    const member = await (prisma.user as any).findUnique({ where: { id } })
    if (!member) {
      res.status(404).json({ error: "Member not found" })
      return
    }

    if (member.role === "admin" && req.user!.role !== "admin") {
      res.status(403).json({ error: "Only Admins can delete another Admin." })
      return
    }

    await (prisma.user as any).delete({ where: { id } })

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

// 10. POST /api/teams/members/:id/reset-password — Pengurus/Admin resets a member's password to default
teamsRouter.post("/members/:id/reset-password", requireAuth, requireRole("pengurus", "admin"), async (req, res, next) => {
  try {
    const id = req.params.id as string
    const targetUser = await (prisma.user as any).findUnique({
      where: { id },
    })

    if (!targetUser) {
      res.status(404).json({ error: "Member not found." })
      return
    }

    const defaultPassword = "sekkha123"
    const hashedPassword = await bcrypt.hash(defaultPassword, 10)

    await (prisma.user as any).update({
      where: { id },
      data: {
        password: hashedPassword,
      },
    })

    await invalidate(CacheKeys.userProfile(id))

    res.json({
      success: true,
      user_number: targetUser.userNumber,
      username: targetUser.username,
      name: targetUser.name,
      default_password: defaultPassword,
      message: `Password for ${targetUser.name} (${targetUser.username ? `@${targetUser.username}` : "member"}) successfully reset to: ${defaultPassword}`,
    })
  } catch (err) {
    next(err)
  }
})


