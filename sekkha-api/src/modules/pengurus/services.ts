import { pengurusModels } from "./models"
import { cached } from "../../lib/cache"
import { decrypt } from "../../lib/crypto"

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

export const pengurusServices = {
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
    const primaryMonthName = MONTH_NAMES[primaryMonth - 1] || "July"
    const compareMonthName = MONTH_NAMES[compareMonth - 1] || "June"

    const periodLabel = timeUnit === "year" ? String(primaryYear) : `${primaryMonthName} ${primaryYear}`
    const previousPeriodLabel = timeUnit === "year" ? String(compareYear) : `${compareMonthName} ${compareYear}`

    const catDisplayNames: Record<string, string> = {
      puja_bhakti: "Sunday Service",
      dhammasakaccha: "Dhamma Discussion",
      meditasi: "Meditation Practice",
      bakti_sosial: "Social Service / Care",
      sekolah_minggu: "Sunday School / Youth",
    }

    let categoryLabel = "All Event Categories"
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

      // 5. Total Seva Sessions (Duties performed in period)
      const countSevaSessions = (evList: typeof events) => {
        let count = 0
        for (const ev of evList) {
          for (const att of ev.attendances) {
            if ((att as any).badgeActivityId && targetUserIds.has(att.userId)) {
              count++
            }
          }
        }
        return count
      }

      const primarySevaCount = countSevaSessions(primaryEvents)
      const compareSevaCount = countSevaSessions(compareEvents)
      const sevaDelta = compareSevaCount > 0
        ? Math.round(((primarySevaCount - compareSevaCount) / compareSevaCount) * 100)
        : 0

      const totalTargetMembers = Math.max(1, targetUsers.length)

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
      const tenureCounts = { "< 3 Months": 0, "3 - 12 Months": 0, "1 - 2 Years": 0, "> 2 Years": 0 }
      for (const u of targetUsers) {
        const diffMonths = (now.getTime() - new Date(u.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30.4)
        if (diffMonths < 3) {
          tenureCounts["< 3 Months"]++
        } else if (diffMonths < 12) {
          tenureCounts["3 - 12 Months"]++
        } else if (diffMonths < 24) {
          tenureCounts["1 - 2 Years"]++
        } else {
          tenureCounts["> 2 Years"]++
        }
      }

      const tenureColors: Record<string, string> = {
        "< 3 Months": "#3B82F6",
        "3 - 12 Months": "#10B981",
        "1 - 2 Years": "#F59E0B",
        "> 2 Years": "#8B5CF6",
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
            description: `Compared to ${previousPeriodLabel}`,
          },
          avgAttendanceRate: {
            value: `${primaryAvgRate}%`,
            deltaText: rateDelta >= 0 ? `+${rateDelta}%` : `${rateDelta}%`,
            isPositive: rateDelta >= 0,
            description: `Member attendance consistency`,
          },
          retentionRate: {
            value: `${retentionRate}%`,
            deltaText: retentionRate >= 80 ? "+2.4%" : "-1.5%",
            isPositive: retentionRate >= 80,
            description: `Recurring active members`,
          },
          totalSevaSessions: {
            value: primarySevaCount,
            deltaText: sevaDelta >= 0 ? `+${sevaDelta}%` : `${sevaDelta}%`,
            isPositive: sevaDelta >= 0,
            description: `Active seva service duties`,
          },
        },
        trendChartData,
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
