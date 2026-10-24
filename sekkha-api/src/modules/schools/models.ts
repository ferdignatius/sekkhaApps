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

  findClassGradesBySchoolName(schoolName: string) {
    return prisma.userProfile.findMany({
      where: {
        school: { name: { equals: schoolName, mode: "insensitive" } },
      },
      select: { classGrade: true },
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

  findPendingRequests() {
    return prisma.school.findMany({
      where: { status: "pending" },
      include: {
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

  approveSchool(id: string, reviewerId: string) {
    return prisma.school.update({
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
  },

  rejectSchool(id: string, reviewerId: string) {
    return prisma.school.update({
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
  },
}
