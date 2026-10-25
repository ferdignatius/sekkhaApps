import { prisma } from "../../lib/prisma"

export const peopleModels = {
  count(where?: any) {
    return prisma.user.count({ where })
  },

  countByRole() {
    return prisma.user.groupBy({
      by: ["role"],
      _count: { _all: true },
    })
  },

  countByClaimStatus() {
    return prisma.user.groupBy({
      by: ["isClaimed"],
      _count: { _all: true },
    })
  },

  findMany(where: any, take: number, skip: number) {
    return prisma.user.findMany({
      where,
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
    return prisma.user.findUnique({
      where: { id },
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
            phone: true,
            schoolId: true,
            birthDate: true,
            school: { select: { id: true, name: true } },
          },
        },
        stats: {
          select: {
            points: true,
            lastActivityAt: true,
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
          take: 30,
        },
      },
    })
  },

  findUserWithProfile(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: { profile: { include: { school: true } } },
    })
  },

  findUserById(id: string) {
    return prisma.user.findUnique({ where: { id } })
  },

  findUserByUsername(username: string) {
    return prisma.user.findUnique({ where: { username } })
  },

  findUserByEmailBindex(emailBindex: string) {
    return prisma.user.findUnique({ where: { emailBindex } })
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

  transaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn)
  },
}
