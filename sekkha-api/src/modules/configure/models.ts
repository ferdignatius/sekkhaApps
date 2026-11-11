import { prisma } from "../../lib/prisma"

function buildEventTypeWhere(where?: { isActive?: boolean; search?: string }) {
  const trimmedSearch = where?.search?.trim()
  if (where?.isActive === undefined && !trimmedSearch) {
    return undefined
  }
  return {
    ...(where?.isActive !== undefined ? { isActive: where.isActive } : {}),
    ...(trimmedSearch
      ? {
          OR: [
            { label: { contains: trimmedSearch, mode: "insensitive" as const } },
            { code: { contains: trimmedSearch, mode: "insensitive" as const } },
            { description: { contains: trimmedSearch, mode: "insensitive" as const } },
          ],
        }
      : {}),
  }
}

function buildBadgeActivityWhere(where?: { isActive?: boolean; search?: string }) {
  const trimmedSearch = where?.search?.trim()
  if (where?.isActive === undefined && !trimmedSearch) {
    return undefined
  }
  return {
    ...(where?.isActive !== undefined ? { isActive: where.isActive } : {}),
    ...(trimmedSearch
      ? {
          OR: [
            { label: { contains: trimmedSearch, mode: "insensitive" as const } },
            { description: { contains: trimmedSearch, mode: "insensitive" as const } },
          ],
        }
      : {}),
  }
}

export const configureModels = {

  // Event Types
  countEventTypes(where?: { isActive?: boolean; search?: string }) {
    return prisma.eventType.count({
      where: buildEventTypeWhere(where),
    })
  },
  findEventTypes(where?: {
    isActive?: boolean
    search?: string
    skip?: number
    take?: number
  }) {
    return prisma.eventType.findMany({
      where: buildEventTypeWhere(where),
      orderBy: [{ isActive: "desc" }, { label: "asc" }],
      ...(where?.skip !== undefined ? { skip: where.skip } : {}),
      ...(where?.take !== undefined ? { take: where.take } : {}),
    })
  },
  findEventTypeById(id: string) {
    return prisma.eventType.findUnique({ where: { id } })
  },
  findEventTypeByCode(code: string) {
    return prisma.eventType.findUnique({ where: { code } })
  },
  countEventsByEventTypeId(id: string) {
    return prisma.event.count({ where: { eventTypeId: id } })
  },
  createEventType(data: any) {
    return prisma.eventType.create({ data })
  },
  updateEventType(id: string, data: any) {
    return prisma.eventType.update({ where: { id }, data })
  },
  deleteEventType(id: string) {
    return prisma.eventType.delete({ where: { id } })
  },

  // Seasons
  findSeasons() {
    return prisma.season.findMany({
      orderBy: [{ isActive: "desc" }, { startDate: "desc" }, { createdAt: "asc" }],
    })
  },
  countSeasonAttendances(startDate: Date, endDate: Date) {
    return prisma.attendance.count({
      where: {
        scannedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    })
  },
  findSeasonById(id: string) {
    return prisma.season.findUnique({ where: { id } })
  },
  findSeasonByCode(code: string) {
    return prisma.season.findUnique({ where: { code } })
  },
  countEventsBySeasonId(seasonId: string) {
    return prisma.event.count({ where: { seasonId } })
  },
  deactivateOtherSeasons(excludeId?: string) {
    return prisma.season.updateMany({
      where: excludeId ? { id: { not: excludeId } } : undefined,
      data: { isActive: false },
    })
  },
  createSeason(data: any) {
    if (data.isActive) {
      return prisma.$transaction(async (tx) => {
        await tx.season.updateMany({
          where: { isActive: true },
          data: { isActive: false },
        })
        return tx.season.create({ data })
      })
    }
    return prisma.season.create({ data })
  },
  updateSeason(id: string, data: any) {
    if (data.isActive) {
      return prisma.$transaction(async (tx) => {
        await tx.season.updateMany({
          where: { id: { not: id }, isActive: true },
          data: { isActive: false },
        })
        return tx.season.update({ where: { id }, data })
      })
    }
    return prisma.season.update({ where: { id }, data })
  },
  activateSeason(id: string) {
    return prisma.$transaction(async (tx) => {
      await tx.season.updateMany({
        where: { id: { not: id }, isActive: true },
        data: { isActive: false },
      })
      return tx.season.update({
        where: { id },
        data: { isActive: true },
      })
    })
  },
  deleteSeason(id: string) {
    return prisma.season.delete({ where: { id } })
  },

  // Point Rules
  findPointRules(where?: { isActive?: boolean; category?: string; search?: string }) {
    return prisma.pointRule.findMany({
      where: {
        ...(where?.isActive !== undefined ? { isActive: where.isActive } : {}),
        ...(where?.category ? { category: where.category } : {}),
        ...(where?.search
          ? {
              OR: [
                { label: { contains: where.search, mode: "insensitive" } },
                { code: { contains: where.search, mode: "insensitive" } },
                { description: { contains: where.search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ category: "asc" }, { points: "desc" }, { code: "asc" }],
    })
  },
  findPointRuleById(id: string) {
    return prisma.pointRule.findUnique({ where: { id } })
  },
  findPointRuleByCode(code: string) {
    return prisma.pointRule.findUnique({ where: { code } })
  },
  findPointRuleByIdOrCode(identifier: string) {
    return prisma.pointRule.findFirst({
      where: {
        OR: [{ id: identifier }, { code: identifier }],
      },
    })
  },
  countTransactionsByPointRuleId(ruleId: string) {
    return prisma.pointTransaction.count({ where: { ruleId } })
  },
  async updatePointRule(identifier: string, data: any) {
    const existing = await prisma.pointRule.findFirst({
      where: {
        OR: [{ id: identifier }, { code: identifier }],
      },
    })
    if (!existing) {
      return null
    }
    return prisma.pointRule.update({
      where: { id: existing.id },
      data,
    })
  },

  // Badge Activities (Master Data)
  countBadgeActivities(where?: { isActive?: boolean; search?: string }) {
    return prisma.badgeActivity.count({
      where: buildBadgeActivityWhere(where),
    })
  },
  findBadgeActivities(where?: {
    isActive?: boolean
    search?: string
    skip?: number
    take?: number
  }) {
    return prisma.badgeActivity.findMany({
      where: buildBadgeActivityWhere(where),
      orderBy: [{ isActive: "desc" }, { label: "asc" }],
      ...(where?.skip !== undefined ? { skip: where.skip } : {}),
      ...(where?.take !== undefined ? { take: where.take } : {}),
    })
  },
  findBadgeActivityById(id: string) {
    return prisma.badgeActivity.findUnique({
      where: { id },
      include: {
        _count: {
          select: { attendances: true },
        },
      },
    })
  },
  findBadgeActivityByCode(code: string) {
    return prisma.badgeActivity.findUnique({ where: { code } })
  },
  countAttendancesByBadgeActivityId(id: string) {
    return prisma.attendance.count({ where: { badgeActivityId: id } })
  },
  createBadgeActivity(data: {
    code: string
    label: string
    description?: string | null
    bonusPoints?: number
    isActive?: boolean
  }) {
    return prisma.badgeActivity.create({ data })
  },
  updateBadgeActivity(
    id: string,
    data: {
      code?: string
      label?: string
      description?: string | null
      bonusPoints?: number
      isActive?: boolean
    }
  ) {
    return prisma.badgeActivity.update({ where: { id }, data })
  },
  deleteBadgeActivity(id: string) {
    return prisma.badgeActivity.delete({ where: { id } })
  },
}

