import { Router } from "express"
import { z } from "zod"
import { prisma } from "../../../lib/prisma"
import { requireAuth, requireRole } from "../../../middleware/auth"

export const teamsRouter = Router()

// 1. GET /api/teams/members — Get all users in the system (accessible to all authenticated users for People page)
teamsRouter.get("/members", requireAuth, async (req, res, next) => {
  try {
    const rawMembers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        school: true,
        avatarUrl: true,
        userNumber: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    })

    const members = await Promise.all(
      rawMembers.map(async m => {
        let uNum = m.userNumber
        if (!uNum) {
          const d = new Date(m.createdAt)
          const yy = d.getFullYear().toString().slice(2)
          const mm = String(d.getMonth() + 1).padStart(2, "0")
          const dd = String(d.getDate()).padStart(2, "0")
          const prefix = `${yy}${mm}${dd}`
          const count = await prisma.user.count({ where: { userNumber: { startsWith: prefix } } })
          uNum = `${prefix}${String(count + 1).padStart(2, "0")}`
          await prisma.user.update({ where: { id: m.id }, data: { userNumber: uNum } }).catch(() => {})
        }
        return {
          id: m.id,
          name: m.name,
          email: m.email,
          role: m.role,
          school: m.school,
          avatar_url: m.avatarUrl,
          user_number: uNum,
          created_at: m.createdAt.toISOString(),
        }
      })
    )

    res.json(members)
  } catch (err) {
    next(err)
  }
})

// 2. GET /api/teams/invitations — Get sent invitations (requires pengurus or admin)
teamsRouter.get("/invitations", requireAuth, requireRole("pengurus", "admin"), async (req, res, next) => {
  try {
    const invitations = await prisma.roleInvitation.findMany({
      include: {
        invitedBy: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: "desc" },
    })
    res.json(invitations.map(inv => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      status: inv.status,
      created_at: inv.createdAt.toISOString(),
      invited_by: inv.invitedBy,
    })))
  } catch (err) {
    next(err)
  }
})

// 3. POST /api/teams/invitations — Invite a user to a role (requires admin)
const InviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["pengurus", "aktivis"]),
})

teamsRouter.post("/invitations", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { email, role } = InviteSchema.parse(req.body)

    // Check if there is already a pending invitation for this email and role
    const existing = await prisma.roleInvitation.findFirst({
      where: { email, role, status: "pending" },
    })
    if (existing) {
      res.status(400).json({ error: "Undangan serupa masih pending untuk email ini." })
      return
    }

    // Create the invitation
    const invitation = await prisma.roleInvitation.create({
      data: {
        email,
        role,
        status: "pending",
        invitedById: req.user!.userId,
      },
    })

    // Find if the target user exists to send an in-app notification
    const targetUser = await prisma.user.findUnique({
      where: { email },
    })

    if (targetUser) {
      // Create notification
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

// 4. POST /api/teams/invitations/:id/accept — Accept role invitation (requires auth)
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

    // Verify the user email matches the invitation email
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
    })

    if (!user || user.email !== invitation.email) {
      res.status(403).json({ error: "Email Anda tidak cocok dengan undangan ini" })
      return
    }

    // Update target user's role
    await prisma.user.update({
      where: { id: user.id },
      data: { role: invitation.role },
    })

    // Update invitation status
    await prisma.roleInvitation.update({
      where: { id: invitation.id },
      data: { status: "accepted" },
    })

    // Mark corresponding notification as read if any
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

    // Clear caches
    const { invalidate, CacheKeys } = await import("../../../lib/cache")
    await invalidate(CacheKeys.userProfile(user.id))

    res.json({ success: true, role: invitation.role })
  } catch (err) {
    next(err)
  }
})

// 5. POST /api/teams/invitations/:id/reject — Reject role invitation (requires auth)
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

    // Verify user email matches
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
    })

    if (!user || user.email !== invitation.email) {
      res.status(403).json({ error: "Email Anda tidak cocok dengan undangan ini" })
      return
    }

    // Update invitation status
    await prisma.roleInvitation.update({
      where: { id: invitation.id },
      data: { status: "rejected" },
    })

    // Mark corresponding notification as read
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
