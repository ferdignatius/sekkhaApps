import { prisma } from "../../lib/prisma"

export const pengurusModels = {

  findUsersForInsights() {
    return prisma.user.findMany({
      where: { anonymizedAt: null },
      select: {
        id: true,
        role: true,
        createdAt: true,
        profile: {
          select: { name: true },
        },
        stats: {
          select: {
            points: true,
            currentStreak: true,
          },
        },
      },
    })
  },

  findEventTypesForInsights() {
    return prisma.eventType.findMany({
      where: { isActive: true },
      select: {
        code: true,
        label: true,
        color: true,
      },
      orderBy: { label: "asc" },
    })
  },

  findEventsWithAttendancesForInsights() {
    return prisma.event.findMany({
      where: {
        status: { in: ["scheduled", "active", "closed"] },
      },
      include: {
        type: { select: { code: true, label: true, color: true } },
        attendances: {
          select: {
            id: true,
            userId: true,
            pointsEarned: true,
            scannedAt: true,
            badgeActivityId: true,
          },
        },
      },
      orderBy: { eventDate: "asc" },
    })
  },
}
