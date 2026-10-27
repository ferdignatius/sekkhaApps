import { prisma } from "../../lib/prisma"

export const pengurusModels = {

  findUsersForInsights() {
    return prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        profile: {
          select: { name: true },
        },
        stats: {
          select: {
            points: true,
            consecutiveMissed: true,
          },
        },
      },
    })
  },

  findEventsWithAttendancesForInsights() {
    return prisma.event.findMany({
      where: {
        status: { in: ["scheduled", "active", "closed"] },
      },
      include: {
        type: { select: { code: true } },
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
