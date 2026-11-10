import { prisma } from "../../lib/prisma"
import type { Prisma } from "@prisma/client"

export const schoolModels = {
  countSchools() {
    return prisma.school.count()
  },

  upsertSchool(name: string, type?: string) {
    return prisma.school.upsert({
      where: { name },
      update: { type },
      create: { name, type, status: "active", isActive: true },
    })
  },

  findSchools(whereClause: Prisma.SchoolWhereInput, limit: number) {
    return prisma.school.findMany({
      where: whereClause,
      include: {
        _count: {
          select: { profiles: true },
        },
      },
      orderBy: [{ name: "asc" }],
      take: limit,
    })
  },

  countProfilesBySchoolName(schoolName: string) {
    return prisma.userProfile.count({
      where: {
        school: { name: { equals: schoolName, mode: "insensitive" } },
      },
    })
  },

  findSchoolByName(name: string) {
    return prisma.school.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    })
  },

  findSchoolById(id: string) {
    return prisma.school.findUnique({
      where: { id },
      include: {
        _count: {
          select: { profiles: true },
        },
      },
    })
  },

  createSchool(data: { name: string; type?: string }) {
    return prisma.school.create({
      data: {
        name: data.name,
        type: data.type,
        status: "active",
        isActive: true,
      },
    })
  },

  createSchoolRequest(data: { name: string; type?: string; requestedBy: string }) {
    return prisma.school.create({
      data: {
        name: data.name,
        type: data.type || "Umum",
        status: "pending",
        isActive: false,
        requestedBy: data.requestedBy,
      },
    })
  },

  updateSchool(id: string, data: { name?: string; type?: string; isActive?: boolean }) {
    return prisma.school.update({
      where: { id },
      data,
      include: {
        _count: { select: { profiles: true } },
      },
    })
  },

  countProfilesBySchoolId(schoolId: string) {
    return prisma.userProfile.count({
      where: { schoolId },
    })
  },

  deleteSchool(id: string) {
    return prisma.school.delete({
      where: { id },
    })
  },

  linkUserProfileToSchool(userId: string, schoolId: string) {
    return prisma.userProfile.updateMany({
      where: { userId },
      data: { schoolId },
    })
  },

  async backfillApprovedSchoolRequesters() {
    try {
      const orphanSchools = await prisma.school.findMany({
        where: {
          status: "active",
          requestedBy: { not: null },
        },
        select: { id: true, requestedBy: true },
      })
      for (const s of orphanSchools) {
        if (s.requestedBy) {
          await prisma.userProfile.updateMany({
            where: { userId: s.requestedBy, schoolId: null },
            data: { schoolId: s.id },
          })
        }
      }
    } catch {
      // Non-blocking backfill
    }
  },

  findPendingRequests() {
    return prisma.school.findMany({
      where: { status: "pending" },
      include: {
        _count: {
          select: { profiles: true },
        },
        requester: {
          select: {
            id: true,
            username: true,
            email: true,
            profile: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  },

  async approveSchool(id: string, reviewerId: string, requestedBy?: string | null) {
    return prisma.$transaction(async (tx) => {
      if (requestedBy) {
        await tx.userProfile.updateMany({
          where: {
            userId: requestedBy,
            schoolId: null,
          },
          data: {
            schoolId: id,
          },
        })
      }

      return tx.school.update({
        where: { id },
        data: {
          status: "active",
          isActive: true,
          reviewedBy: reviewerId,
        },
        include: {
          _count: { select: { profiles: true } },
        },
      })
    })
  },

  async rejectSchool(id: string, reviewerId: string) {
    return prisma.$transaction(async (tx) => {
      await tx.userProfile.updateMany({
        where: { schoolId: id },
        data: { schoolId: null },
      })

      return tx.school.update({
        where: { id },
        data: {
          status: "cancel",
          isActive: false,
          reviewedBy: reviewerId,
        },
        include: {
          _count: { select: { profiles: true } },
        },
      })
    })
  },
}
