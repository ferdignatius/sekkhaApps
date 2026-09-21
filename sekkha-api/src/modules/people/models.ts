import { prisma } from "../../lib/prisma"

export const peopleModels = {
  count(where?: any) {
    return prisma.user.count({ where })
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
        email: true,
        role: true,
        userNumber: true,
        isClaimed: true,
        createdAt: true,
        profile: {
          include: { school: true },
        },
        stats: {
          select: { points: true },
        },
        _count: {
          select: {
            attendances: true,
          },
        },
      },
    })
  },

  findMemberDetail(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        profile: {
          include: { school: true },
        },
        stats: true,
        attendances: {
          include: {
            event: {
              select: {
                id: true,
                title: true,
                eventDate: true,
                location: true,
              },
            },
          },
          orderBy: { scannedAt: "desc" },
          take: 20,
        },
        badges: {
          include: {
            badge: true,
          },
        },
      },
    })
  },

  findUserWithProfile(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: { profile: true },
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

  findUnclaimedMemberForLinking(userNumber: string) {
    return prisma.user.findFirst({
      where: {
        userNumber,
        isClaimed: false,
      },
      include: {
        stats: true,
      },
    })
  },

  create(data: any, include?: any) {
    return prisma.user.create({ data, include })
  },

  update(id: string, data: any) {
    return prisma.user.update({ where: { id }, data })
  },

  upsertProfile(userId: string, update: any, create: any, include?: any) {
    return prisma.userProfile.upsert({
      where: { userId },
      update,
      create,
      include,
    })
  },

  upsertProfileWithSchool(userId: string, update: any, create: any) {
    return prisma.userProfile.upsert({
      where: { userId },
      update,
      create,
      include: { school: true },
    })
  },

  delete(id: string) {
    return prisma.user.delete({ where: { id } })
  },

  findSchoolByName(name: string) {
    return prisma.school.findUnique({ where: { name } })
  },

  createSchool(name: string, type: string = "Lainnya") {
    return prisma.school.create({ data: { name, type } })
  },

  findLevelByLevel(level: number) {
    return prisma.level.findFirst({ where: { level } })
  },

  transaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn)
  },
}
