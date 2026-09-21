import { prisma } from "../../lib/prisma"
import type { Prisma } from "@prisma/client"

export const schoolModels = {
  countSchools() {
    return prisma.school.count()
  },

  upsertSchool(name: string, type?: string, city?: string) {
    return prisma.school.upsert({
      where: { name },
      update: { type, city },
      create: { name, type, city },
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
    return prisma.school.findUnique({
      where: { name },
    })
  },

  findSchoolById(id: string) {
    return prisma.school.findUnique({
      where: { id },
    })
  },

  createSchool(data: { name: string; type?: string; city?: string }) {
    return prisma.school.create({
      data,
    })
  },

  updateSchool(id: string, data: { name?: string; type?: string; city?: string }) {
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
}
