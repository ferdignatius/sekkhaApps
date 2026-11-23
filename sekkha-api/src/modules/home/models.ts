import { prisma } from "../../lib/prisma"
import type { Prisma } from "@prisma/client"

export const homeModels = {
  findProfile(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        role: true,
        userNumber: true,
        profile: {
          select: { name: true },
        },
        stats: {
          select: {
            points: true,
          },
        },
      },
    })
  },

  findUpcomingEvents(where: Prisma.EventWhereInput) {
    return prisma.event.findMany({
      where,
      select: {
        id: true,
        title: true,
        location: true,
        eventDate: true,
        status: true,
        type: { select: { code: true } },
      },
      orderBy: { eventDate: "asc" },
      take: 3,
    })
  },

  findRecentActivity(userId: string) {
    return prisma.attendance.findMany({
      where: { userId },
      select: {
        eventId: true,
        method: true,
        scannedAt: true,
        event: { select: { title: true, eventDate: true } },
      },
      orderBy: { scannedAt: "desc" },
      take: 5,
    })
  },

  findAttendanceWeeks(userId: string) {
    return prisma.$queryRaw<Array<{ week: Date; last_attended: Date }>>`
      SELECT DATE_TRUNC('week', a."scanned_at") AS week,
             MAX(a."scanned_at") AS last_attended
      FROM "attendances" a
      INNER JOIN "events" e ON e."id" = a."event_id"
      WHERE a."user_id" = ${userId}
        AND a."is_finalized" = true
        AND e."counts_toward_streak" = true
      GROUP BY DATE_TRUNC('week', a."scanned_at")
      ORDER BY week DESC
    `
  },

  findClosedStreakEventDates() {
    return prisma.event.findMany({
      where: { status: "closed", countsTowardStreak: true },
      orderBy: { eventDate: "desc" },
      select: { eventDate: true },
      take: 500,
    })
  },

  findActiveSeason() {
    return prisma.season.findFirst({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        startDate: true,
        endDate: true,
        targetAttendance: true,
        description: true,
      },
      orderBy: [{ updatedAt: "desc" }, { startDate: "desc" }],
    })
  },
}
