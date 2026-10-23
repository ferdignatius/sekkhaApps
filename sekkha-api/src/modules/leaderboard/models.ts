import { prisma } from "../../lib/prisma"
import type { Prisma } from "@prisma/client"

export const leaderboardModels = {
  findActiveSeason() {
    return prisma.season.findFirst({
      where: { isActive: true },
      orderBy: [{ updatedAt: "desc" }, { startDate: "desc" }],
    })
  },

  findScheduledSeason(now: Date) {
    return prisma.season.findFirst({
      where: {
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: [{ startDate: "desc" }, { updatedAt: "desc" }],
    })
  },

  deactivateOtherSeasons(excludeId: string) {
    return prisma.season.updateMany({
      where: { isActive: true, id: { not: excludeId } },
      data: { isActive: false },
    })
  },

  deactivateAllSeasons() {
    return prisma.season.updateMany({
      data: { isActive: false },
    })
  },

  activateSeason(id: string) {
    return prisma.season.update({
      where: { id },
      data: { isActive: true },
    })
  },

  createSeason(data: Prisma.SeasonCreateInput) {
    return prisma.season.create({ data })
  },

  findLeaderboardUsers() {
    return prisma.user.findMany({
      select: {
        id: true,
        role: true,
        profile: {
          select: {
            name: true,
          },
        },
      },
    })
  },

  findAttendanceCountsByUser(startDate: Date, endDate: Date) {
    return prisma.attendance.groupBy({
      by: ["userId"],
      where: {
        scannedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: { _all: true },
    })
  },

  countTotalAttendances(startDate: Date, endDate: Date) {
    return prisma.attendance.count({
      where: {
        scannedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    })
  },

  findPointTotalsByUser(startDate: Date, endDate: Date) {
    return prisma.pointTransaction.groupBy({
      by: ["userId"],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: { amount: true },
    })
  },

  findDebugUsers() {
    return prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        isClaimed: true,
        userNumber: true,
        profile: { select: { name: true } },
        stats: { select: { points: true } },
      },
    })
  },
}
