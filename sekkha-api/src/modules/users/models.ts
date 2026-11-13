import { prisma } from "../../lib/prisma"
import { generateUniqueUserNumber } from "../../lib/userNumber"
import type { Prisma } from "@prisma/client"

export const userModels = {
  generateUserNumber(client?: any, date?: Date) {
    return generateUniqueUserNumber(client || prisma, date)
  },
  findUserWithProfileAndStats(userId: string) {
    return prisma.user.findFirst({
      where: { id: userId, anonymizedAt: null },
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
            school: { select: { id: true, name: true, status: true } },
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
    return prisma.user.findFirst({
      where: { id: userId, anonymizedAt: null },
    })
  },

  findUserByUsername(username: string) {
    return prisma.user.findFirst({
      where: { username, anonymizedAt: null },
    })
  },

  findUserByEmailBindex(emailBindex: string) {
    return prisma.user.findFirst({
      where: { emailBindex, anonymizedAt: null },
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

  async updateUserEmail(userId: string, emailCipher: string, emailBindex: string) {
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { isClaimed: true, passwordChangedByUser: true },
    })
    const shouldClaim = Boolean(existing?.isClaimed || existing?.passwordChangedByUser)
    return prisma.user.update({
      where: { id: userId },
      data: {
        email: emailCipher,
        emailBindex,
        emailVerifiedAt: new Date(),
        isClaimed: shouldClaim,
        ...(shouldClaim && !existing?.isClaimed ? { claimedAt: new Date() } : {}),
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

  touchLastActiveAt(userId: string, at: Date = new Date()) {
    return prisma.user.updateMany({
      where: { id: userId, anonymizedAt: null },
      data: { lastActiveAt: at },
    })
  },

  findRetentionCandidates(cutoffDate: Date, take: number = 100) {
    return prisma.user.findMany({
      where: {
        anonymizedAt: null,
        OR: [
          { lastActiveAt: { lt: cutoffDate } },
          { lastActiveAt: null, createdAt: { lt: cutoffDate } },
        ],
        AND: [
          {
            OR: [
              { stats: { is: null } },
              { stats: { is: { lastActivityAt: null } } },
              { stats: { is: { lastActivityAt: { lt: cutoffDate } } } },
            ],
          },
        ],
      },
      orderBy: [{ lastActiveAt: "asc" }, { createdAt: "asc" }],
      take,
      select: { id: true },
    })
  },

  async anonymizeUserForRetention(userId: string, anonymizedAt: Date = new Date()): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const result = await tx.user.updateMany({
        where: { id: userId, anonymizedAt: null },
        data: {
          email: null,
          emailBindex: null,
          emailVerifiedAt: null,
          password: null,
          username: null,
          userNumber: null,
          isClaimed: false,
          onboardingCompleted: false,
          passwordChangedAt: anonymizedAt,
          anonymizedAt,
        },
      })

      if (result.count === 0) {
        return false
      }

      // Erase direct profile PII while leaving Attendance & PointTransaction intact
      // for aggregated historical community archives and annual temple reporting.
      await tx.userProfile.upsert({
        where: { userId },
        update: {
          name: "Former Member",
          schoolId: null,
        },
        create: {
          userId,
          name: "Former Member",
          schoolId: null,
        },
      })

      return true
    })
  },
}
