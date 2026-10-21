import { prisma } from "../../lib/prisma"
import type { Prisma } from "@prisma/client"

export const homeModels = {
  findProfile(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        userNumber: true,
        profile: {
          select: { name: true, avatarUrl: true },
        },
        stats: {
          select: {
            points: true,
            level: { select: { level: true, label: true } },
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
      SELECT DATE_TRUNC('week', "scanned_at") AS week,
             MAX("scanned_at") AS last_attended
      FROM "attendances"
      WHERE "user_id" = ${userId}
      GROUP BY DATE_TRUNC('week', "scanned_at")
      ORDER BY week DESC
    `
  },
}
