import { prisma } from "../../lib/prisma"
import type { Prisma } from "@prisma/client"

export const eventModels = {
  findEvents(whereClause: Prisma.EventWhereInput, skip: number, take: number) {
    return prisma.event.findMany({
      where: whereClause,
      include: {
        type: true,
        season: true,
        _count: {
          select: { attendances: true },
        },
      },
      orderBy: { eventDate: "asc" },
      skip,
      take,
    })
  },

  findEventById(id: string) {
    return prisma.event.findUnique({
      where: { id },
      include: {
        type: true,
        season: true,
        _count: {
          select: { attendances: true },
        },
      },
    })
  },

  findEventBasic(id: string) {
    return prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        eventDate: true,
        pointReward: true,
        maxLateMinutes: true,
        latePenaltyPoints: true,
        status: true,
        qrCode: true,
        type: { select: { code: true, label: true, defaultPointReward: true } },
      },
    })
  },

  findUserForAttendance(identifier: string) {
    const isNum = /^\d+$/.test(identifier)
    return prisma.user.findFirst({
      where: {
        OR: [
          { id: identifier },
          ...(isNum ? [{ userNumber: BigInt(identifier) }] : []),
          { username: identifier.toLowerCase() },
        ],
      },
      select: {
        id: true,
        userNumber: true,
        role: true,
        profile: {
          select: {
            name: true,
            school: { select: { name: true } },
          },
        },
      },
    })
  },

  findExistingAttendance(eventId: string, userId: string) {
    return prisma.attendance.findUnique({
      where: {
        userId_eventId: {
          userId,
          eventId,
        },
      },
      select: {
        id: true,
        userId: true,
        eventId: true,
        pointsEarned: true,
        isLate: true,
        latePenaltyApplied: true,
        badgeBonusPoints: true,
        isFinalized: true,
        scannedAt: true,
        badgeActivity: { select: { label: true } },
      },
    })
  },

  createAttendance(data: {
    userId: string
    eventId: string
    method: "qr" | "manual"
    pointsEarned: number
    isLate?: boolean
    latePenaltyApplied?: number
    badgeActivityId?: string | null
    badgeBonusPoints?: number
    isFinalized?: boolean
  }) {
    return prisma.attendance.create({
      data: {
        userId: data.userId,
        eventId: data.eventId,
        method: data.method,
        pointsEarned: data.pointsEarned,
        isLate: data.isLate ?? false,
        latePenaltyApplied: data.latePenaltyApplied ?? 0,
        badgeActivityId: data.badgeActivityId || null,
        badgeBonusPoints: data.badgeBonusPoints ?? 0,
        isFinalized: data.isFinalized ?? false,
      },
      include: {
        badgeActivity: { select: { label: true } },
      },
    })
  },

  updateAttendance(
    id: string,
    data: {
      badgeActivityId?: string | null
      badgeBonusPoints?: number
    }
  ) {
    return prisma.attendance.update({
      where: { id },
      data: {
        badgeBonusPoints: data.badgeBonusPoints,
        badgeActivity:
          data.badgeActivityId !== undefined
            ? data.badgeActivityId
              ? { connect: { id: data.badgeActivityId } }
              : { disconnect: true }
            : undefined,
      },
      include: {
        badgeActivity: { select: { label: true, bonusPoints: true } },
      },
    })
  },

  findEventAttendances(eventId: string, skip = 0, take = 100) {
    return prisma.attendance.findMany({
      where: { eventId },
      include: {
        user: {
          select: {
            id: true,
            userNumber: true,
            role: true,
            profile: {
              select: {
                name: true,
                school: { select: { name: true } },
              },
            },
          },
        },
        badgeActivity: {
          select: {
            id: true,
            code: true,
            label: true,
            bonusPoints: true,
          },
        },
      },
      orderBy: { scannedAt: "desc" },
      skip,
      take,
    })
  },

  countEventAttendances(eventId: string) {
    return prisma.attendance.count({ where: { eventId } })
  },

  createEvent(data: Prisma.EventCreateInput) {
    return prisma.event.create({
      data,
      include: { type: true },
    })
  },

  updateEvent(id: string, data: Prisma.EventUpdateInput) {
    return prisma.event.update({
      where: { id },
      data,
      include: { type: true },
    })
  },

  deleteEvent(id: string) {
    return prisma.event.delete({
      where: { id },
    })
  },

  deleteAttendance(eventId: string, userId: string) {
    return prisma.attendance.delete({
      where: {
        userId_eventId: {
          userId,
          eventId,
        },
      },
    })
  },

  findEventTypeById(id: string) {
    return prisma.eventType.findUnique({ where: { id } })
  },

  findBadgeActivityById(id: string) {
    return prisma.badgeActivity.findUnique({ where: { id } })
  },
}
