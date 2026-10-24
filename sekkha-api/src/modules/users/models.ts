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
        emailBindex: true,
        emailVerifiedAt: true,
        role: true,
        userNumber: true,
        isClaimed: true,
        onboardingCompleted: true,
        createdAt: true,
        profile: {
          select: {
            name: true,
            schoolId: true,
            classGrade: true,
            phone: true,
            birthDate: true,
            school: { select: { id: true, name: true } },
          },
        },
        stats: {
          select: { points: true, currentStreak: true, totalAttendances: true },
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

  findUserByEmailBindex(emailBindex: string) {
    return prisma.user.findUnique({
      where: { emailBindex },
    })
  },

  updateUser(userId: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({
      where: { id: userId },
      data,
    })
  },

  completeOnboarding(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { onboardingCompleted: true },
    })
  },

  updateUserEmail(userId: string, emailCipher: string, emailBindex: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        email: emailCipher,
        emailBindex,
        emailVerifiedAt: new Date(),
        isClaimed: true,
        claimedAt: new Date(),
      },
    })
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

  findUserAttendances(userId: string, take: number = 10, cursor?: string) {
    return prisma.attendance.findMany({
      where: { userId },
      select: {
        id: true,
        eventId: true,
        method: true,
        pointsEarned: true,
        scannedAt: true,
        event: { select: { title: true, eventDate: true } },
      },
      orderBy: { scannedAt: "desc" },
      take: Math.min(Math.max(take, 1), 50),
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    })
  },

  findUserAttendancesForStreak(userId: string) {
    return prisma.attendance.findMany({
      where: { userId },
      orderBy: { scannedAt: "desc" },
      select: { scannedAt: true },
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
      select: {
        id: true,
        amount: true,
        type: true,
        description: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(take, 1), 50),
    })
  },

  findUserFullExport(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: { include: { school: true } },
        stats: true,
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
