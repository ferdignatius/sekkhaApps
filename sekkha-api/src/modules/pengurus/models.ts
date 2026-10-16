import { prisma } from "../../lib/prisma"

export const pengurusModels = {
  findPastEvents(beforeDate: Date) {
    return prisma.event.findMany({
      where: {
        status: "scheduled",
        eventDate: { lte: beforeDate },
      },
      orderBy: { eventDate: "asc" },
      select: {
        id: true,
        title: true,
        eventDate: true,
      },
    })
  },

  findPastEventsDesc(beforeDate: Date) {
    return prisma.event.findMany({
      where: {
        status: "scheduled",
        eventDate: { lte: beforeDate },
      },
      orderBy: { eventDate: "desc" },
      select: {
        id: true,
        title: true,
        eventDate: true,
        location: true,
      },
    })
  },

  findAllUsersWithAttendancesAndProfile() {
    return prisma.user.findMany({
      select: {
        id: true,
        email: true,
        userNumber: true,
        role: true,
        createdAt: true,
        profile: {
          select: {
            name: true,
            phone: true,
            avatarUrl: true,
          },
        },
        stats: {
          select: {
            lastActivityAt: true,
            consecutiveMissed: true,
          },
        },
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
  },

  findUserWithAttendancesById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        userNumber: true,
        profile: {
          select: {
            name: true,
            phone: true,
            avatarUrl: true,
          },
        },
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
                type: { select: { code: true } },
                status: true,
              },
            },
          },
        },
      },
    })
  },

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
          },
        },
      },
      orderBy: { eventDate: "asc" },
    })
  },
}
