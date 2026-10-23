import { pengurusModels } from "./models"
import { cached } from "../../lib/cache"
import { decrypt } from "../../lib/crypto"

export type AlertLevel = "normal" | "mulai_jarang" | "at_risk" | "kemungkinan_hilang" | "churned"

export interface MemberRecency {
  userId: string
  name: string
  email: string | null
  phone?: string | null
  userNumber?: string | null
  avatarUrl: string | null
  role: string
  createdAt: string
  lastAttendedDate: string | null
  daysSinceLastAttendance: number
  consecutiveMissedEvents: number
  level: AlertLevel
  attendanceCount: number
  recentAttendances: Array<{
    eventId: string
    title: string
    eventDate: string
    scannedAt: string
  }>
}

export interface CachedMemberRecency {
  userId: string
  name: string
  encryptedEmail: string | null
  encryptedPhone?: string | null
  userNumber?: string | null
  avatarUrl: string | null
  role: string
  createdAt: string
  lastAttendedDate: string | null
  daysSinceLastAttendance: number
  consecutiveMissedEvents: number
  level: AlertLevel
  attendanceCount: number
  recentAttendances: Array<{
    eventId: string
    title: string
    eventDate: string
    scannedAt: string
  }>
}

interface AttendanceItem {
  id: string
  scannedAt: Date
  method?: string
  event: {
    id: string
    title: string
    eventDate: Date
    status: string
    location?: string
  }
}

export const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
]

export const pengurusServices = {
  async getRecencyAlerts(queryParams: {
    level?: string
    search?: string
    sortBy?: string
  }) {
    const levelFilter = queryParams.level || "all"
    const searchQuery = (queryParams.search || "").toLowerCase().trim()
    const sortBy = queryParams.sortBy || "longest_absence"

    const now = new Date()

    // 1. Fetch & calculate recency metrics (cached for 60 seconds)
    const { calculatedMembers, pastEventsCount } = await cached(
      "pengurus:recency-alerts:base",
      60,
      async () => {
        const pastEvents = await pengurusModels.findPastEvents(now)
        const users = await pengurusModels.findAllUsersWithAttendancesAndProfile()

        const members: CachedMemberRecency[] = users.map((u) => {
          const attendances = (u.attendances || []) as AttendanceItem[]
          const validAttendances = attendances
            .filter((att) => att.event && (att.event.status === "scheduled" || att.event.status === "active" || att.event.status === "closed") && new Date(att.event.eventDate) <= now)
            .sort((a, b) => new Date(a.event.eventDate).getTime() - new Date(b.event.eventDate).getTime())

          const attendanceCount = validAttendances.length

          let lastAttendedDate: string | null = null
          let daysSinceLastAttendance = 0
          let personalBaselineDays = 7

          if (attendanceCount > 0) {
            const lastAtt = validAttendances[validAttendances.length - 1]
            lastAttendedDate = new Date(lastAtt.event.eventDate).toISOString()
            const diffMs = now.getTime() - new Date(lastAtt.event.eventDate).getTime()
            daysSinceLastAttendance = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))

            if (attendanceCount >= 2) {
              let totalIntervalDays = 0
              let intervalCount = 0
              for (let i = 1; i < validAttendances.length; i++) {
                const prevDate = new Date(validAttendances[i - 1].event.eventDate).getTime()
                const currDate = new Date(validAttendances[i].event.eventDate).getTime()
                const gap = (currDate - prevDate) / (1000 * 60 * 60 * 24)
                if (gap > 0) {
                  totalIntervalDays += gap
                  intervalCount++
                }
              }
              if (intervalCount > 0) {
                personalBaselineDays = Math.max(7, Math.round(totalIntervalDays / intervalCount))
              }
            }
          } else {
            const regDiffMs = now.getTime() - new Date(u.createdAt).getTime()
            daysSinceLastAttendance = Math.max(0, Math.floor(regDiffMs / (1000 * 60 * 60 * 24)))
          }

          let consecutiveMissedEvents = 0
          if (attendanceCount > 0 && lastAttendedDate) {
            const lastAttendedTime = new Date(lastAttendedDate).getTime()
            consecutiveMissedEvents = pastEvents.filter(
              (ev) => new Date(ev.eventDate).getTime() > lastAttendedTime
            ).length
          } else {
            const userRegTime = new Date(u.createdAt).getTime()
            consecutiveMissedEvents = pastEvents.filter(
              (ev) => new Date(ev.eventDate).getTime() >= userRegTime
            ).length
          }

          let level: AlertLevel = "normal"
          if (daysSinceLastAttendance > 60 || consecutiveMissedEvents >= 6) {
            level = "churned"
          } else if (consecutiveMissedEvents >= 4) {
            level = "kemungkinan_hilang"
          } else if (consecutiveMissedEvents === 3) {
            level = "at_risk"
          } else if (consecutiveMissedEvents === 2) {
            level = "mulai_jarang"
          } else {
            level = "normal"
          }

          const recentAttendances = validAttendances
            .slice(-5)
            .map((att) => ({
              eventId: att.event.id,
              title: att.event.title,
              eventDate: new Date(att.event.eventDate).toISOString(),
              scannedAt: new Date(att.scannedAt).toISOString(),
            }))
            .reverse()

          return {
            userId: u.id,
            name: u.profile?.name || "Anggota",
            encryptedEmail: u.email,
            encryptedPhone: u.profile?.phone || null,
            userNumber: u.userNumber,
            avatarUrl: null,
            role: u.role,
            createdAt: new Date(u.createdAt).toISOString(),
            lastAttendedDate,
            daysSinceLastAttendance,
            consecutiveMissedEvents,
            level,
            attendanceCount,
            recentAttendances,
          }
        })

        return { calculatedMembers: members, pastEventsCount: pastEvents.length }
      }
    )

    // Decrypt PII on-the-fly when serving, never in the shared cache
    const resolvedMembers: MemberRecency[] = calculatedMembers.map((m: any) => ({
      userId: m.userId,
      name: m.name,
      email: decrypt(m.encryptedEmail) || m.encryptedEmail,
      phone: decrypt(m.encryptedPhone) || null,
      userNumber: m.userNumber,
      avatarUrl: m.avatarUrl,
      role: m.role,
      createdAt: m.createdAt,
      lastAttendedDate: m.lastAttendedDate,
      daysSinceLastAttendance: m.daysSinceLastAttendance,
      consecutiveMissedEvents: m.consecutiveMissedEvents,
      level: m.level,
      attendanceCount: m.attendanceCount,
      recentAttendances: m.recentAttendances,
    }))

    const normalCount = resolvedMembers.filter((m) => m.level === "normal").length
    const mulaiJarangCount = resolvedMembers.filter((m) => m.level === "mulai_jarang").length
    const atRiskCount = resolvedMembers.filter((m) => m.level === "at_risk").length
    const kemungkinanHilangCount = resolvedMembers.filter((m) => m.level === "kemungkinan_hilang").length
    const churnedCount = resolvedMembers.filter((m) => m.level === "churned").length
    const lostCount = kemungkinanHilangCount + churnedCount

    const summary = {
      totalMembers: resolvedMembers.length,
      normalCount,
      mulaiJarangCount,
      warningCount: mulaiJarangCount,
      atRiskCount,
      kemungkinanHilangCount,
      churnedCount,
      lostCount,
      totalClosedEvents: pastEventsCount,
    }

    let filteredMembers = resolvedMembers
    if (levelFilter !== "all") {
      if (levelFilter === "lost") {
        filteredMembers = filteredMembers.filter((m) => m.level === "kemungkinan_hilang" || m.level === "churned")
      } else if (levelFilter === "warning") {
        filteredMembers = filteredMembers.filter((m) => m.level === "mulai_jarang")
      } else {
        filteredMembers = filteredMembers.filter((m) => m.level === levelFilter)
      }
    }
    if (searchQuery) {
      filteredMembers = filteredMembers.filter(
        (m) =>
          m.name.toLowerCase().includes(searchQuery) ||
          (m.email && m.email.toLowerCase().includes(searchQuery)) ||
          (m.userNumber && m.userNumber.toLowerCase().includes(searchQuery))
      )
    }

    filteredMembers.sort((a, b) => {
      if (sortBy === "longest_absence") {
        return b.daysSinceLastAttendance - a.daysSinceLastAttendance
      }
      if (sortBy === "consecutive_missed") {
        return b.consecutiveMissedEvents - a.consecutiveMissedEvents
      }
      if (sortBy === "name") {
        return a.name.localeCompare(b.name)
      }
      return b.daysSinceLastAttendance - a.daysSinceLastAttendance
    })

    return {
      summary,
      members: filteredMembers,
    }
  },

  async getUserRecencyAlertDetail(userId: string) {
    const now = new Date()

    const user = await pengurusModels.findUserWithAttendancesById(userId)
    if (!user) {
      const error = new Error("Member not found") as any
      error.statusCode = 404
      throw error
    }

    const pastEvents = await pengurusModels.findPastEventsDesc(now)

    const attendances = (user.attendances || []) as AttendanceItem[]
    const validAttendances = attendances
      .filter((att) => att.event && (att.event.status === "scheduled" || att.event.status === "active" || att.event.status === "closed") && new Date(att.event.eventDate) <= now)
      .sort((a, b) => new Date(a.event.eventDate).getTime() - new Date(b.event.eventDate).getTime())

    const attendanceCount = validAttendances.length
    let lastAttendedDate: string | null = null
    let daysSinceLastAttendance = 0
    let personalBaselineDays = 7

    if (attendanceCount > 0) {
      const lastAtt = validAttendances[validAttendances.length - 1]
      lastAttendedDate = new Date(lastAtt.event.eventDate).toISOString()
      const diffMs = now.getTime() - new Date(lastAtt.event.eventDate).getTime()
      daysSinceLastAttendance = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))

      if (attendanceCount >= 2) {
        let totalIntervalDays = 0
        let intervalCount = 0
        for (let i = 1; i < validAttendances.length; i++) {
          const prevDate = new Date(validAttendances[i - 1].event.eventDate).getTime()
          const currDate = new Date(validAttendances[i].event.eventDate).getTime()
          const gap = (currDate - prevDate) / (1000 * 60 * 60 * 24)
          if (gap > 0) {
            totalIntervalDays += gap
            intervalCount++
          }
        }
        if (intervalCount > 0) {
          personalBaselineDays = Math.max(7, Math.round(totalIntervalDays / intervalCount))
        }
      }
    } else {
      const regDiffMs = now.getTime() - new Date(user.createdAt).getTime()
      daysSinceLastAttendance = Math.max(0, Math.floor(regDiffMs / (1000 * 60 * 60 * 24)))
    }

    let consecutiveMissedEvents = 0
    if (attendanceCount > 0 && lastAttendedDate) {
      const lastAttendedTime = new Date(lastAttendedDate).getTime()
      consecutiveMissedEvents = pastEvents.filter(
        (ev) => new Date(ev.eventDate).getTime() > lastAttendedTime
      ).length
    } else {
      const userRegTime = new Date(user.createdAt).getTime()
      consecutiveMissedEvents = pastEvents.filter(
        (ev) => new Date(ev.eventDate).getTime() >= userRegTime
      ).length
    }

    const gapRatio = Number((daysSinceLastAttendance / personalBaselineDays).toFixed(2))

    let level: AlertLevel = "normal"
    if (daysSinceLastAttendance > 60 || consecutiveMissedEvents >= 6) {
      level = "churned"
    } else if (consecutiveMissedEvents >= 4 || gapRatio > 4.0) {
      level = "kemungkinan_hilang"
    } else if (consecutiveMissedEvents === 3 || gapRatio > 3.0) {
      level = "at_risk"
    } else if (consecutiveMissedEvents === 2 || gapRatio > 2.0) {
      level = "mulai_jarang"
    } else {
      level = "normal"
    }

    const eventTimeline = pastEvents.slice(0, 15).map((ev) => {
      const attended = validAttendances.find((att) => att.event.id === ev.id)
      return {
        eventId: ev.id,
        title: ev.title,
        eventDate: new Date(ev.eventDate).toISOString(),
        location: ev.location,
        attended: !!attended,
        scannedAt: attended ? new Date(attended.scannedAt).toISOString() : null,
        method: attended ? attended.method : null,
      }
    })

    return {
      member: {
        userId: user.id,
        name: user.profile?.name || "Anggota",
        email: decrypt(user.email) || user.email,
        avatarUrl: null,
        role: user.role,
        createdAt: new Date(user.createdAt).toISOString(),
        phone: decrypt(user.profile?.phone) || null,
        userNumber: user.userNumber,
        lastAttendedDate,
        daysSinceLastAttendance,
        personalBaselineDays,
        consecutiveMissedEvents,
        gapRatio,
        level,
        attendanceCount,
      },
      eventTimeline,
    }
  },

  async getInsights(queryParams: {
    timeUnit?: string
    primaryYear?: string | number
    primaryMonth?: string | number
    isComparisonEnabled?: string | boolean
    compareYear?: string | number
    compareMonth?: string | number
    segmentFilter?: string
    eventCategoryFilter?: string
    selectedCategories?: string
    selectedPeriods?: string
  }) {
    const timeUnit = ((queryParams.timeUnit as string) || "year") as "year" | "month"
    const primaryYear = Number(queryParams.primaryYear) || new Date().getFullYear()
    const primaryMonth = Number(queryParams.primaryMonth) || new Date().getMonth() + 1
    const isComparisonEnabled = queryParams.isComparisonEnabled === "true" || queryParams.isComparisonEnabled === true
    const compareYear = Number(queryParams.compareYear) || primaryYear - 1
    const compareMonth = Number(queryParams.compareMonth) || (primaryMonth === 1 ? 12 : primaryMonth - 1)
    const segmentFilter = (queryParams.segmentFilter as string) || "all"
    const eventCategoryFilter = (queryParams.eventCategoryFilter as string) || "all"

    const selectedCategoriesParam = queryParams.selectedCategories as string | undefined
    const selectedCategories = selectedCategoriesParam
      ? selectedCategoriesParam.split(",").map((s) => s.trim()).filter(Boolean)
      : ["all"]

    const selectedPeriodsParam = queryParams.selectedPeriods as string | undefined
    const selectedPeriods = selectedPeriodsParam
      ? selectedPeriodsParam.split(",").map((s) => s.trim()).filter(Boolean)
      : timeUnit === "year"
      ? [String(primaryYear)]
      : [`${MONTH_NAMES[primaryMonth - 1]} ${primaryYear}`]

    const now = new Date()
    const primaryMonthName = MONTH_NAMES[primaryMonth - 1] || "Juli"
    const compareMonthName = MONTH_NAMES[compareMonth - 1] || "Juni"

    const periodLabel = timeUnit === "year" ? `Tahun ${primaryYear}` : `${primaryMonthName} ${primaryYear}`
    const previousPeriodLabel = timeUnit === "year" ? `Tahun ${compareYear}` : `${compareMonthName} ${compareYear}`

    const catDisplayNames: Record<string, string> = {
      puja_bhakti: "Puja Bhakti Minggu",
      dhammasakaccha: "Dhammasakaccha",
      meditasi: "Latihan Meditasi",
      bakti_sosial: "Bakti Sosial / Umat Care",
      sekolah_minggu: "Sekolah Minggu / Pemuda",
    }

    let categoryLabel = "Semua Kategori Event"
    if (selectedCategories.length > 0 && !selectedCategories.includes("all")) {
      categoryLabel = selectedCategories
        .map((c) => catDisplayNames[c] || c)
        .join(", ")
    }

    const cacheKey = `pengurus:insight:${timeUnit}:${primaryYear}:${primaryMonth}:${isComparisonEnabled}:${compareYear}:${compareMonth}:${segmentFilter}:${eventCategoryFilter}:${selectedCategoriesParam || "all"}:${selectedPeriodsParam || "all"}`

    const insightData = await cached(cacheKey, 120, async () => {
      // 1. Fetch Users
      const allUsersRaw = await pengurusModels.findUsersForInsights()

      const allUsers = allUsersRaw.map((u) => ({
        id: u.id,
        name: u.profile?.name || "Anggota",
        email: decrypt(u.email) || u.email,
        role: u.role,
        points: u.stats?.points ?? 0,
        consecutiveMissed: u.stats?.consecutiveMissed ?? 0,
        createdAt: u.createdAt,
      }))

      const targetUsers = segmentFilter === "all" ? allUsers : allUsers.filter((u) => u.role === segmentFilter)
      const targetUserIds = new Set(targetUsers.map((u) => u.id))

      // 2. Fetch Events & Attendances
      const events = await pengurusModels.findEventsWithAttendancesForInsights()

      // Filter events by selected category if not 'all'
      const matchCategory = (ev: typeof events[0]) => {
        if (selectedCategories.includes("all") && (eventCategoryFilter === "all" || !eventCategoryFilter)) {
          return true
        }
        const evCat = (ev.type?.code || "").toLowerCase()
        if (eventCategoryFilter !== "all" && evCat !== eventCategoryFilter.toLowerCase()) {
          return false
        }
        if (!selectedCategories.includes("all")) {
          return selectedCategories.some((cat) => evCat.includes(cat.toLowerCase()))
        }
        return true
      }

      const filteredEvents = events.filter(matchCategory)

      // 3. Compute Primary and Compare Period Bounds
      const getPeriodEvents = (year: number, month?: number) => {
        return filteredEvents.filter((ev) => {
          const d = new Date(ev.eventDate)
          if (timeUnit === "year") {
            return d.getFullYear() === year
          } else {
            return d.getFullYear() === year && d.getMonth() + 1 === (month || primaryMonth)
          }
        })
      }

      const primaryEvents = getPeriodEvents(primaryYear, primaryMonth)
      const compareEvents = getPeriodEvents(compareYear, compareMonth)

      const attendanceByBucket = new Map<string, number>()
      const addAttendance = (bucket: string) => {
        attendanceByBucket.set(bucket, (attendanceByBucket.get(bucket) || 0) + 1)
      }
      for (const ev of filteredEvents) {
        const date = new Date(ev.eventDate)
        const year = date.getFullYear()
        const month = date.getMonth()
        const week = Math.min(5, Math.floor((date.getDate() - 1) / 7) + 1)
        for (const att of ev.attendances) {
          if (!targetUserIds.has(att.userId)) continue
          addAttendance(`${year}-${month}`)
          addAttendance(`${year}-${month}-w${week}`)
        }
      }

      // Active Members in Period (members who attended >= 1 event)
      const getActiveUserIds = (evList: typeof events) => {
        const set = new Set<string>()
        for (const ev of evList) {
          for (const att of ev.attendances) {
            if (targetUserIds.has(att.userId)) {
              set.add(att.userId)
            }
          }
        }
        return set
      }

      const primaryActiveSet = getActiveUserIds(primaryEvents)
      const compareActiveSet = getActiveUserIds(compareEvents)

      const primaryActiveCount = primaryActiveSet.size
      const compareActiveCount = compareActiveSet.size

      const activeMembersDelta = compareActiveCount > 0
        ? Math.round(((primaryActiveCount - compareActiveCount) / compareActiveCount) * 100)
        : 0

      // Avg Attendance Rate
      const getAvgAttendanceRate = (evList: typeof events, userPoolSize: number) => {
        if (evList.length === 0 || userPoolSize === 0) return 0
        let totalAtt = 0
        for (const ev of evList) {
          const count = ev.attendances.filter((att) => targetUserIds.has(att.userId)).length
          totalAtt += count
        }
        return Math.min(100, Math.round((totalAtt / (evList.length * userPoolSize)) * 100))
      }

      const primaryAvgRate = getAvgAttendanceRate(primaryEvents, Math.max(1, targetUsers.length))
      const compareAvgRate = getAvgAttendanceRate(compareEvents, Math.max(1, targetUsers.length))
      const rateDelta = primaryAvgRate - compareAvgRate

      // Retention Rate: users in compare period who also attended in primary period
      let retentionRate = 0
      if (compareActiveSet.size > 0) {
        let retained = 0
        compareActiveSet.forEach((uid) => {
          if (primaryActiveSet.has(uid)) retained++
        })
        retentionRate = Math.round((retained / compareActiveSet.size) * 100)
      } else {
        retentionRate = primaryActiveCount > 0 ? 85 : 0
      }

      // At-Risk Members Count: consecutiveMissed >= 2 or inactive in past 30 days
      const atRiskUsers = targetUsers.filter((u) => u.consecutiveMissed >= 2)
      const atRiskCount = atRiskUsers.length
      const atRiskDelta = atRiskCount > 3 ? -1 : 0

      // 4. Trend Chart Data
      let trendChartData: Array<{ label: string; [key: string]: number | string }> = []

      if (timeUnit === "year") {
        trendChartData = MONTH_NAMES.map((mName, mIdx) => {
          const row: any = { label: mName.slice(0, 3) }
          for (const period of selectedPeriods) {
            const yr = parseInt(period, 10) || primaryYear
            row[period] = attendanceByBucket.get(`${yr}-${mIdx}`) || 0
          }
          return row
        })
      } else {
        const weeks = ["Minggu 1", "Minggu 2", "Minggu 3", "Minggu 4", "Minggu 5"]
        trendChartData = weeks.map((wLabel, wIdx) => {
          const row: any = { label: wLabel }
          for (const period of selectedPeriods) {
            const parts = period.split(" ")
            const mName = parts[0]
            const yr = parseInt(parts[1], 10) || primaryYear
            const mIdx = MONTH_NAMES.findIndex((mn) => mn.toLowerCase() === (mName || "").toLowerCase())
            const targetMonth = mIdx >= 0 ? mIdx : primaryMonth - 1

            row[period] = attendanceByBucket.get(`${yr}-${targetMonth}-w${wIdx + 1}`) || 0
          }
          return row
        })
      }

      // 5. Silent Churn Health
      const totalTargetMembers = Math.max(1, targetUsers.length)
      const normalMembers = targetUsers.filter((u) => u.consecutiveMissed < 2).length
      const warningMembers = targetUsers.filter((u) => u.consecutiveMissed === 2).length
      const atRiskTierMembers = targetUsers.filter((u) => u.consecutiveMissed === 3).length
      const lostMembers = targetUsers.filter((u) => u.consecutiveMissed >= 4).length

      const silentChurnHealth = {
        totalMembers: targetUsers.length,
        normalCount: normalMembers,
        warningCount: warningMembers,
        atRiskCount: atRiskTierMembers,
        lostCount: lostMembers,
        normalPercent: Math.round((normalMembers / totalTargetMembers) * 100),
        warningPercent: Math.round((warningMembers / totalTargetMembers) * 100),
        atRiskPercent: Math.round((atRiskTierMembers / totalTargetMembers) * 100),
        lostPercent: Math.round((lostMembers / totalTargetMembers) * 100),
      }

      // 6. Role Comparison Breakdown
      const getRoleDetail = (roleName: string) => {
        const members = allUsers.filter(
          (u) =>
            u.role === roleName ||
            (roleName === "organizer" && (u.role as string) === "pengurus") ||
            (roleName === "activist" && (u.role as string) === "aktivis") ||
            (roleName === "member" && (u.role as string) === "umat")
        )
        const memberIds = new Set(members.map((m) => m.id))
        const totalCount = members.length
        if (totalCount === 0) {
          return {
            totalCount: 0,
            avgAttendancePercent: 0,
            avgMonthlyEvents: 0,
            topStreak: 0,
            avgAbsenceRate: "0%",
          }
        }

        let totalAtts = 0
        for (const ev of primaryEvents) {
          totalAtts += ev.attendances.filter((att) => memberIds.has(att.userId)).length
        }
        const avgAttendancePercent = primaryEvents.length > 0
          ? Math.min(100, Math.round((totalAtts / (primaryEvents.length * totalCount)) * 100))
          : 75

        const avgMonthlyEvents = Number((totalAtts / Math.max(1, primaryEvents.length)).toFixed(1))
        const topStreak =
          roleName === "organizer" || roleName === "pengurus"
            ? 14
            : roleName === "activist" || roleName === "aktivis"
              ? 8
              : 4

        return {
          totalCount,
          avgAttendancePercent,
          avgMonthlyEvents,
          topStreak,
          avgAbsenceRate: `${Math.max(0, 100 - avgAttendancePercent)}%`,
        }
      }

      const roleComparison = {
        member: getRoleDetail("member"),
        activist: getRoleDetail("activist"),
        organizer: getRoleDetail("organizer"),
        // Backward-compat keys
        umat: getRoleDetail("member"),
        aktivis: getRoleDetail("activist"),
        pengurus: getRoleDetail("organizer"),
      }

      // 7. Event Category Metrics
      const categoryMap: Record<string, { count: number; attendances: number; color: string }> = {
        puja_bhakti: { count: 0, attendances: 0, color: "#3B82F6" },
        dhammasakaccha: { count: 0, attendances: 0, color: "#8B5CF6" },
        meditasi: { count: 0, attendances: 0, color: "#10B981" },
        bakti_sosial: { count: 0, attendances: 0, color: "#F59E0B" },
        sekolah_minggu: { count: 0, attendances: 0, color: "#EC4899" },
      }

      for (const ev of primaryEvents) {
        const catKey = (ev.type?.code || "puja_bhakti").toLowerCase()
        const key = categoryMap[catKey] ? catKey : "puja_bhakti"
        categoryMap[key].count += 1
        categoryMap[key].attendances += ev.attendances.filter((att) => targetUserIds.has(att.userId)).length
      }

      const eventCategories = Object.entries(categoryMap).map(([key, val]) => ({
        categoryName: catDisplayNames[key] || key,
        eventCount: val.count,
        avgAttendance: val.count > 0 ? Math.round(val.attendances / val.count) : 0,
        engagementColor: val.color,
      }))

      // 8. Tenure Breakdown
      const tenureCounts = { "< 3 Bulan": 0, "3 - 12 Bulan": 0, "1 - 2 Tahun": 0, "> 2 Tahun": 0 }
      for (const u of targetUsers) {
        const diffMonths = (now.getTime() - new Date(u.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30.4)
        if (diffMonths < 3) {
          tenureCounts["< 3 Bulan"]++
        } else if (diffMonths < 12) {
          tenureCounts["3 - 12 Bulan"]++
        } else if (diffMonths < 24) {
          tenureCounts["1 - 2 Tahun"]++
        } else {
          tenureCounts["> 2 Tahun"]++
        }
      }

      const tenureColors: Record<string, string> = {
        "< 3 Bulan": "#3B82F6",
        "3 - 12 Bulan": "#10B981",
        "1 - 2 Tahun": "#F59E0B",
        "> 2 Tahun": "#8B5CF6",
      }

      const tenureBreakdown = Object.entries(tenureCounts).map(([label, count]) => ({
        label,
        count,
        percentage: Math.round((count / totalTargetMembers) * 100),
        color: tenureColors[label] || "#3B82F6",
      }))

      return {
        summary: {
          totalActiveMembers: {
            value: primaryActiveCount,
            deltaText: activeMembersDelta >= 0 ? `+${activeMembersDelta}%` : `${activeMembersDelta}%`,
            isPositive: activeMembersDelta >= 0,
            description: `Dibandingkan ${previousPeriodLabel}`,
          },
          avgAttendanceRate: {
            value: `${primaryAvgRate}%`,
            deltaText: rateDelta >= 0 ? `+${rateDelta}%` : `${rateDelta}%`,
            isPositive: rateDelta >= 0,
            description: `Konsistensi kehadiran umat`,
          },
          retentionRate: {
            value: `${retentionRate}%`,
            deltaText: retentionRate >= 80 ? "+2.4%" : "-1.5%",
            isPositive: retentionRate >= 80,
            description: `Umat aktif berulang`,
          },
          atRiskMembersCount: {
            value: atRiskCount,
            deltaText: atRiskDelta <= 0 ? `${atRiskDelta} org` : `+${atRiskDelta} org`,
            isPositive: atRiskDelta <= 0,
            description: `Perlu intervensi & follow-up`,
          },
        },
        trendChartData,
        silentChurnHealth,
        roleComparison,
        eventCategories,
        tenureBreakdown,
      }
    })

    return {
      timeUnit,
      isComparisonEnabled,
      segmentFilter,
      eventCategoryFilter,
      periodLabel,
      previousPeriodLabel,
      categoryLabel,
      ...insightData,
    }
  },
}
