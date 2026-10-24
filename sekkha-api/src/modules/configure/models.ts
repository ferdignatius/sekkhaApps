import { prisma } from "../../lib/prisma"

export const configureModels = {

  // Event Types
  findEventTypes(where?: { isActive?: boolean }) {
    return prisma.eventType.findMany({
      where: where?.isActive !== undefined ? { isActive: where.isActive } : undefined,
      orderBy: [{ isActive: "desc" }, { label: "asc" }],
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
    return prisma.season.create({ data })
  },
  updateSeason(id: string, data: any) {
    return prisma.season.update({ where: { id }, data })
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
  findBadgeActivities(where?: { isActive?: boolean; search?: string }) {
    return prisma.badgeActivity.findMany({
      where: {
        ...(where?.isActive !== undefined ? { isActive: where.isActive } : {}),
        ...(where?.search
          ? {
              OR: [
                { label: { contains: where.search, mode: "insensitive" } },
                { description: { contains: where.search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ isActive: "desc" }, { label: "asc" }],
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

