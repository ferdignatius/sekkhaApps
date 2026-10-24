import { prisma } from "../../lib/prisma"

export const DEFAULT_POINT_RULES = [
  {
    code: "attendance_rutin",
    label: "Poin Presensi Kegiatan Rutin",
    points: 50,
    category: "attendance",
    description: "Poin standar yang didapatkan umat saat melakukan presensi pada kebaktian rutin mingguan.",
  },
  {
    code: "attendance_special",
    label: "Poin Presensi Kegiatan Khusus",
    points: 100,
    category: "attendance",
    description: "Poin untuk kehadiran pada acara spesial seperti perayaan hari besar (Waisak, Kathina, Asadha) atau retreat.",
  },
  {
    code: "streak_weekly_bonus",
    label: "Bonus Konsistensi (Streak Mingguan)",
    points: 30,
    category: "streak",
    description: "Bonus poin tambahan yang diberikan saat umat mempertahankan kehadiran berturut-turut tanpa terputus.",
  },
  {
    code: "first_attendance_bonus",
    label: "Bonus Presensi Pertama Kali",
    points: 25,
    category: "general",
    description: "Poin sambutan perdana bagi umat baru yang baru pertama kali mencatatkan presensi di vihara.",
  },
]

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
  async findPointRules() {
    const pointRuleModel = (prisma as any).pointRule
    let rules = await pointRuleModel.findMany({ orderBy: { category: "asc" } })
    if (rules.length === 0) {
      for (const def of DEFAULT_POINT_RULES) {
        await pointRuleModel.upsert({
          where: { code: def.code },
          update: {},
          create: def,
        })
      }
      rules = await pointRuleModel.findMany({ orderBy: { category: "asc" } })
    }
    return rules
  },
  updatePointRule(id: string, data: any) {
    return (prisma as any).pointRule.update({ where: { id }, data })
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

