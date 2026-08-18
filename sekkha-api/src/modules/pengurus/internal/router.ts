import { Router } from "express"
import { prisma } from "../../../lib/prisma"
import { requireAuth, requireRole } from "../../../middleware/auth"

export const pengurusRouter = Router()

/**
 * Interface for Recency Calculation Result
 */
export type AlertLevel = "normal" | "mulai_jarang" | "at_risk" | "kemungkinan_hilang" | "churned"

export interface MemberRecency {
  userId: string
  name: string
  email: string
  avatarUrl: string | null
  role: string
  createdAt: string
  lastAttendedDate: string | null
  daysSinceLastAttendance: number
  consecutiveMissedEvents: number
  level: AlertLevel
  attendanceCount: number
  recentAttendances: Array<{
    eventId: string
    title: string
    eventDate: string
    scannedAt: string
  }>
}

interface AttendanceItem {
  id: string
  scannedAt: Date
  method?: string
  event: {
    id: string
    title: string
    eventDate: Date
    status: string
    location?: string
  }
}

// ─── GET /api/pengurus/recency-alerts ─────────────────────────────────────────
pengurusRouter.get(
  "/recency-alerts",
  requireAuth,
  requireRole("pengurus", "admin"),
  async (req, res, next) => {
    try {
      const levelFilter = (req.query.level as string) || "all"
      const searchQuery = ((req.query.search as string) || "").toLowerCase().trim()
      const sortBy = (req.query.sortBy as string) || "longest_absence"

      const now = new Date()

      // 1. Fetch closed/past published events (eventDate <= now)
      const pastEvents = await prisma.event.findMany({
        where: {
          status: "published",
          eventDate: { lte: now },
        },
        orderBy: { eventDate: "asc" },
        select: {
          id: true,
          title: true,
          eventDate: true,
        },
      })

      // 2. Fetch all users with attendances
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          role: true,
          lastActivityAt: true,
          consecutiveMissed: true,
          createdAt: true,
          attendances: {
            select: {
              id: true,
              scannedAt: true,
              event: {
                select: {
                  id: true,
                  title: true,
                  eventDate: true,
                  status: true,
                },
              },
            },
          },
        },
      })

      // 3. Process recency for each user
      const calculatedMembers: MemberRecency[] = users.map((u) => {
        const attendances = (u.attendances || []) as AttendanceItem[]
        const validAttendances = attendances
          .filter((att) => att.event && att.event.status === "published" && new Date(att.event.eventDate) <= now)
          .sort((a, b) => new Date(a.event.eventDate).getTime() - new Date(b.event.eventDate).getTime())

        const attendanceCount = validAttendances.length

        let lastAttendedDate: string | null = null
        let daysSinceLastAttendance = 0
        let personalBaselineDays = 7

        if (attendanceCount > 0) {
          const lastAtt = validAttendances[validAttendances.length - 1]
          lastAttendedDate = new Date(lastAtt.event.eventDate).toISOString()
          const diffMs = now.getTime() - new Date(lastAtt.event.eventDate).getTime()
          daysSinceLastAttendance = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))

          if (attendanceCount >= 2) {
            let totalIntervalDays = 0
            let intervalCount = 0
            for (let i = 1; i < validAttendances.length; i++) {
              const prevDate = new Date(validAttendances[i - 1].event.eventDate).getTime()
              const currDate = new Date(validAttendances[i].event.eventDate).getTime()
              const gap = (currDate - prevDate) / (1000 * 60 * 60 * 24)
              if (gap > 0) {
                totalIntervalDays += gap
                intervalCount++
              }
            }
            if (intervalCount > 0) {
              personalBaselineDays = Math.max(7, Math.round(totalIntervalDays / intervalCount))
            }
          }
        } else {
          const regDiffMs = now.getTime() - new Date(u.createdAt).getTime()
          daysSinceLastAttendance = Math.max(0, Math.floor(regDiffMs / (1000 * 60 * 60 * 24)))
        }

        let consecutiveMissedEvents = 0
        if (attendanceCount > 0 && lastAttendedDate) {
          const lastAttendedTime = new Date(lastAttendedDate).getTime()
          consecutiveMissedEvents = pastEvents.filter(
            (ev) => new Date(ev.eventDate).getTime() > lastAttendedTime
          ).length
        } else {
          const userRegTime = new Date(u.createdAt).getTime()
          consecutiveMissedEvents = pastEvents.filter(
            (ev) => new Date(ev.eventDate).getTime() >= userRegTime
          ).length
        }

        let level: AlertLevel = "normal"
        if (daysSinceLastAttendance > 60 || consecutiveMissedEvents >= 6) {
          level = "churned"
        } else if (consecutiveMissedEvents >= 4) {
          level = "kemungkinan_hilang"
        } else if (consecutiveMissedEvents === 3) {
          level = "at_risk"
        } else if (consecutiveMissedEvents === 2) {
          level = "mulai_jarang"
        } else {
          level = "normal"
        }

        const recentAttendances = validAttendances
          .slice(-5)
          .map((att) => ({
            eventId: att.event.id,
            title: att.event.title,
            eventDate: new Date(att.event.eventDate).toISOString(),
            scannedAt: new Date(att.scannedAt).toISOString(),
          }))
          .reverse()

        return {
          userId: u.id,
          name: u.name,
          email: u.email,
          avatarUrl: u.avatarUrl,
          role: u.role,
          createdAt: new Date(u.createdAt).toISOString(),
          lastAttendedDate,
          daysSinceLastAttendance,
          consecutiveMissedEvents,
          level,
          attendanceCount,
          recentAttendances,
        }
      })

      const summary = {
        totalMembers: calculatedMembers.length,
        normalCount: calculatedMembers.filter((m) => m.level === "normal").length,
        mulaiJarangCount: calculatedMembers.filter((m) => m.level === "mulai_jarang").length,
        atRiskCount: calculatedMembers.filter((m) => m.level === "at_risk").length,
        kemungkinanHilangCount: calculatedMembers.filter((m) => m.level === "kemungkinan_hilang").length,
        churnedCount: calculatedMembers.filter((m) => m.level === "churned").length,
        totalClosedEvents: pastEvents.length,
      }

      let filteredMembers = calculatedMembers
      if (levelFilter !== "all") {
        filteredMembers = filteredMembers.filter((m) => m.level === levelFilter)
      }
      if (searchQuery) {
        filteredMembers = filteredMembers.filter(
          (m) => m.name.toLowerCase().includes(searchQuery) || m.email.toLowerCase().includes(searchQuery)
        )
      }

      filteredMembers.sort((a, b) => {
        if (sortBy === "longest_absence") {
          return b.daysSinceLastAttendance - a.daysSinceLastAttendance
        }
        if (sortBy === "consecutive_missed") {
          return b.consecutiveMissedEvents - a.consecutiveMissedEvents
        }
        if (sortBy === "name") {
          return a.name.localeCompare(b.name)
        }
        return b.daysSinceLastAttendance - a.daysSinceLastAttendance
      })

      res.json({
        summary,
        members: filteredMembers,
      })
    } catch (err) {
      next(err)
    }
  }
)

// ─── GET /api/pengurus/recency-alerts/:userId ─────────────────────────────────
pengurusRouter.get(
  "/recency-alerts/:userId",
  requireAuth,
  requireRole("pengurus", "admin"),
  async (req, res, next) => {
    try {
      const userId = req.params.userId as string
      const now = new Date()

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          role: true,
          createdAt: true,
          attendances: {
            select: {
              id: true,
              scannedAt: true,
              method: true,
              event: {
                select: {
                  id: true,
                  title: true,
                  location: true,
                  eventDate: true,
                  eventType: true,
                  status: true,
                },
              },
            },
          },
        },
      })

      if (!user) {
        res.status(404).json({ error: "Member tidak ditemukan" })
        return
      }

      const pastEvents = await prisma.event.findMany({
        where: {
          status: "published",
          eventDate: { lte: now },
        },
        orderBy: { eventDate: "desc" },
        select: {
          id: true,
          title: true,
          eventDate: true,
          location: true,
        },
      })

      const attendances = (user.attendances || []) as AttendanceItem[]
      const validAttendances = attendances
        .filter((att) => att.event && att.event.status === "published" && new Date(att.event.eventDate) <= now)
        .sort((a, b) => new Date(a.event.eventDate).getTime() - new Date(b.event.eventDate).getTime())

      const attendanceCount = validAttendances.length
      let lastAttendedDate: string | null = null
      let daysSinceLastAttendance = 0
      let personalBaselineDays = 7

      if (attendanceCount > 0) {
        const lastAtt = validAttendances[validAttendances.length - 1]
        lastAttendedDate = new Date(lastAtt.event.eventDate).toISOString()
        const diffMs = now.getTime() - new Date(lastAtt.event.eventDate).getTime()
        daysSinceLastAttendance = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))

        if (attendanceCount >= 2) {
          let totalIntervalDays = 0
          let intervalCount = 0
          for (let i = 1; i < validAttendances.length; i++) {
            const prevDate = new Date(validAttendances[i - 1].event.eventDate).getTime()
            const currDate = new Date(validAttendances[i].event.eventDate).getTime()
            const gap = (currDate - prevDate) / (1000 * 60 * 60 * 24)
            if (gap > 0) {
              totalIntervalDays += gap
              intervalCount++
            }
          }
          if (intervalCount > 0) {
            personalBaselineDays = Math.max(7, Math.round(totalIntervalDays / intervalCount))
          }
        }
      } else {
        const regDiffMs = now.getTime() - new Date(user.createdAt).getTime()
        daysSinceLastAttendance = Math.max(0, Math.floor(regDiffMs / (1000 * 60 * 60 * 24)))
      }

      let consecutiveMissedEvents = 0
      if (attendanceCount > 0 && lastAttendedDate) {
        const lastAttendedTime = new Date(lastAttendedDate).getTime()
        consecutiveMissedEvents = pastEvents.filter(
          (ev) => new Date(ev.eventDate).getTime() > lastAttendedTime
        ).length
      } else {
        const userRegTime = new Date(user.createdAt).getTime()
        consecutiveMissedEvents = pastEvents.filter(
          (ev) => new Date(ev.eventDate).getTime() >= userRegTime
        ).length
      }

      const gapRatio = Number((daysSinceLastAttendance / personalBaselineDays).toFixed(2))

      let level: AlertLevel = "normal"
      if (daysSinceLastAttendance > 60 || consecutiveMissedEvents >= 6) {
        level = "churned"
      } else if (consecutiveMissedEvents >= 4 || gapRatio > 4.0) {
        level = "kemungkinan_hilang"
      } else if (consecutiveMissedEvents === 3 || gapRatio > 3.0) {
        level = "at_risk"
      } else if (consecutiveMissedEvents === 2 || gapRatio > 2.0) {
        level = "mulai_jarang"
      } else {
        level = "normal"
      }

      const eventTimeline = pastEvents.slice(0, 15).map((ev) => {
        const attended = validAttendances.find((att) => att.event.id === ev.id)
        return {
          eventId: ev.id,
          title: ev.title,
          eventDate: new Date(ev.eventDate).toISOString(),
          location: ev.location,
          attended: !!attended,
          scannedAt: attended ? new Date(attended.scannedAt).toISOString() : null,
          method: attended ? attended.method : null,
        }
      })

      res.json({
        member: {
          userId: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          role: user.role,
          createdAt: new Date(user.createdAt).toISOString(),
          lastAttendedDate,
          daysSinceLastAttendance,
          personalBaselineDays,
          consecutiveMissedEvents,
          gapRatio,
          level,
          attendanceCount,
        },
        eventTimeline,
      })
    } catch (err) {
      next(err)
    }
  }
)
