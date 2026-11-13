import { prisma } from "../../lib/prisma"
import { generateUniqueUserNumber } from "../../lib/userNumber"

export const peopleModels = {
  count(where?: any) {
    return prisma.user.count({ where: { ...(where || {}), anonymizedAt: null } })
  },

  countByRole() {
    return prisma.user.groupBy({
      by: ["role"],
      where: { anonymizedAt: null },
      _count: { _all: true },
    })
  },

  countByClaimStatus() {
    return prisma.user.groupBy({
      by: ["isClaimed"],
      where: { anonymizedAt: null },
      _count: { _all: true },
    })
  },

  findMany(where: any, take: number, skip: number) {
    return prisma.user.findMany({
      where: { ...(where || {}), anonymizedAt: null },
      orderBy: { createdAt: "desc" },
      take,
      skip,
      select: {
        id: true,
        username: true,
        role: true,
        userNumber: true,
        isClaimed: true,
        createdAt: true,
        profile: {
          select: {
            name: true,
          },
        },
      },
    })
  },

  findMemberDetail(id: string) {
    return prisma.user.findFirst({
      where: { id, anonymizedAt: null },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        userNumber: true,
        isClaimed: true,
        createdAt: true,
        profile: {
          select: {
            name: true,
            schoolId: true,
            school: { select: { id: true, name: true, status: true } },
          },
        },
        stats: {
          select: {
            points: true,
            totalAttendances: true,
            lastActivityAt: true,
          },
        },
        _count: {
          select: {
            attendances: true,
          },
        },
        attendances: {
          select: {
            id: true,
            method: true,
            pointsEarned: true,
            scannedAt: true,
            event: {
              select: {
                title: true,
                eventDate: true,
              },
            },
          },
          orderBy: { scannedAt: "desc" },
          take: 5,
        },
      },
    })
  },

  findUserWithProfile(id: string) {
    return prisma.user.findFirst({
      where: { id, anonymizedAt: null },
      include: { profile: { include: { school: true } } },
    })
  },

  findUserById(id: string) {
    return prisma.user.findFirst({ where: { id, anonymizedAt: null } })
  },

  findUserByUsername(username: string) {
    return prisma.user.findFirst({ where: { username, anonymizedAt: null } })
  },

  findUserByEmailBindex(emailBindex: string) {
    return prisma.user.findFirst({ where: { emailBindex, anonymizedAt: null } })
  },

  create(data: any, include?: any) {
    return prisma.user.create({ data, include })
  },

  update(id: string, data: any) {
    return prisma.user.update({ where: { id }, data })
  },

  delete(id: string) {
    return prisma.user.delete({ where: { id } })
  },

  findSchoolByName(name: string) {
    return prisma.school.findUnique({ where: { name } })
  },

  findSchoolById(id: string) {
    return prisma.school.findUnique({ where: { id } })
  },

  findSimilarNameCandidates(probes: string[], take = 25) {
    if (probes.length === 0) return Promise.resolve([])
    return prisma.user.findMany({
      where: {
        anonymizedAt: null,
        profile: {
          is: {
            OR: probes.map((probe) => ({
              name: { contains: probe, mode: "insensitive" as const },
            })),
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        username: true,
        role: true,
        userNumber: true,
        isClaimed: true,
        profile: {
          select: {
            name: true,
            school: {
              select: { name: true },
            },
          },
        },
      },
    })
  },

  generateUserNumber(client?: any) {
    return generateUniqueUserNumber(client || prisma)
  },

  transaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn)
  },
}
