import { prisma } from "../../lib/prisma"
import type { Prisma } from "@prisma/client"

export const eventModels = {
  findEvents(whereClause: Prisma.EventWhereInput, skip: number, take: number) {
    return prisma.event.findMany({
      where: whereClause,
      include: {
        type: true,
        season: true,
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
      },
    })
  },

  findEventBasic(id: string) {
    return prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        type: { select: { code: true } },
        status: true,
        qrCode: true,
      },
    })
  },

  findUserForAttendance(identifier: string) {
    const isNum = /^\d+$/.test(identifier)
    return prisma.user.findFirst({
      where: {
        OR: [
          { id: identifier },
          ...(isNum ? [{ userNumber: parseInt(identifier, 10) }] : []),
          { username: identifier.toLowerCase() },
        ],
      },
      select: {
        id: true,
        userNumber: true,
        role: true,
        profile: { select: { name: true } },
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
      select: { id: true, scannedAt: true, pointsEarned: true },
    })
  },

  createAttendance(data: {
    userId: string
    eventId: string
    method: "qr" | "manual"
    pointsEarned: number
  }) {
    return prisma.attendance.create({
      data: {
        userId: data.userId,
        eventId: data.eventId,
        method: data.method,
        pointsEarned: data.pointsEarned,
      },
    })
  },

  findEventAttendances(eventId: string, skip = 0, take = 50) {
    return prisma.attendance.findMany({
      where: { eventId },
      include: {
        user: {
          select: {
            id: true,
            userNumber: true,
            profile: { select: { name: true } },
          },
        },
      },
      orderBy: { scannedAt: "desc" },
      skip,
      take,
    })
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
}
