import { prisma } from "../../lib/prisma"
import type { Prisma } from "@prisma/client"

export const userModels = {
  findUserWithProfileAndStats(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        userNumber: true,
        createdAt: true,
        profile: {
          select: {
            name: true,
            schoolId: true,
            classGrade: true,
            phone: true,
            birthDate: true,
            gender: true,
            school: { select: { name: true } },
          },
        },
        stats: {
          select: { points: true },
        },
        _count: {
          select: { attendances: true },
        },
      },
    })
  },

  findUserById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
    })
  },

  findUserByUsername(username: string) {
    return prisma.user.findUnique({
      where: { username },
    })
  },

  updateUser(userId: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({
      where: { id: userId },
      data,
    })
  },

  completeOnboarding(userId: string) {
    return prisma.$executeRaw`UPDATE "users" SET "onboarding_completed" = true WHERE "id" = ${userId}`
  },

  findSchoolByName(name: string) {
    return prisma.school.findUnique({
      where: { name },
    })
  },

  createSchool(name: string, type: string = "Lainnya") {
    return prisma.school.create({
      data: { name, type },
    })
  },

  upsertUserProfile(
    userId: string,
    updateData: Prisma.UserProfileUncheckedUpdateInput,
    createData: Prisma.UserProfileUncheckedCreateInput
  ) {
    return prisma.userProfile.upsert({
      where: { userId },
      update: updateData,
      create: createData,
      include: { school: true },
    })
  },

  updateUserAndProfile(
    userId: string,
    userData: Prisma.UserUpdateInput,
    profileUpdateData: Prisma.UserProfileUncheckedUpdateInput,
    profileCreateData: Prisma.UserProfileUncheckedCreateInput
  ) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: userData,
      })
      const profile = await tx.userProfile.upsert({
        where: { userId },
        update: profileUpdateData,
        create: profileCreateData,
        include: { school: true },
      })
      return { user, profile }
    })
  },

  async findActiveBadgesWithUserBadges(userId: string) {
    const allBadges = await prisma.badge.findMany({
      where: { isActive: true },
      orderBy: { conditionValue: "asc" },
    })
    const userBadges = await prisma.userBadge.findMany({
      where: { userId },
    })
    return { allBadges, userBadges }
  },

  findUserAttendances(userId: string, take: number = 20) {
    return prisma.attendance.findMany({
      where: { userId },
      include: { event: { select: { title: true, eventDate: true } } },
      orderBy: { scannedAt: "desc" },
      take,
    })
  },

  findUserAttendancesForStreak(userId: string) {
    return prisma.attendance.findMany({
      where: { userId },
      orderBy: { scannedAt: "desc" },
      select: { scannedAt: true },
    })
  },

  findUserStatsWithLevel(userId: string) {
    return prisma.userStats.findUnique({
      where: { userId },
      include: { level: true },
    })
  },

  findLevelsOrderedDesc() {
    return prisma.level.findMany({
      orderBy: { minPoints: "desc" },
    })
  },

  countUserAttendances(userId: string) {
    return prisma.attendance.count({
      where: { userId },
    })
  },

  findUserPointTransactions(userId: string, take: number = 20) {
    return prisma.pointTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take,
    })
  },

  findUserFullExport(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: { include: { school: true } },
        stats: { include: { level: true } },
        badges: { include: { badge: true } },
        attendances: {
          include: { event: { select: { title: true, eventDate: true, location: true } } },
          orderBy: { scannedAt: "desc" },
        },
        pointTransactions: {
          orderBy: { createdAt: "desc" },
          take: 100,
        },
      },
    })
  },

  deleteUserById(userId: string) {
    return prisma.user.delete({
      where: { id: userId },
    })
  },
}
