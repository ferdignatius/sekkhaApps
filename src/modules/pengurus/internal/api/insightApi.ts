// modules/pengurus/internal/api/insightApi.ts
// Mock API & Data definitions for Insight Umat dashboard with custom period, role segment & event category filters

export type TimeUnit = "year" | "month"
export type RoleSegmentFilter = "all" | "umat" | "aktivis" | "pengurus"
export type EventCategoryFilter = "all" | "puja_bhakti" | "dhammasakaccha" | "meditasi" | "bakti_sosial" | "sekolah_minggu"

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

export const MASTER_EVENT_CATEGORIES: { id: EventCategoryFilter; label: string }[] = [
  { id: "all", label: "Semua Kategori Event" },
  { id: "puja_bhakti", label: "Puja Bhakti Minggu" },
  { id: "dhammasakaccha", label: "Dhammasakaccha" },
  { id: "meditasi", label: "Latihan Meditasi" },
  { id: "bakti_sosial", label: "Bakti Sosial / Umat Care" },
  { id: "sekolah_minggu", label: "Sekolah Minggu / Pemuda" },
]

export interface MetricDelta {
  value: number | string
  deltaText: string
  isPositive: boolean
  description: string
}

export interface TrendChartPoint {
  label: string
  [key: string]: number | string
}

export interface SilentChurnHealth {
  totalMembers: number
  normalCount: number
  warningCount: number
  atRiskCount: number
  lostCount: number
  normalPercent: number
  warningPercent: number
  atRiskPercent: number
  lostPercent: number
}

export interface RoleDetailMetric {
  totalCount: number
  avgAttendancePercent: number
  avgMonthlyEvents: number
  topStreak: number
  avgAbsenceRate: string
}

export interface RoleComparisonData {
  umat: RoleDetailMetric
  aktivis: RoleDetailMetric
  pengurus: RoleDetailMetric
}

export interface EventCategoryMetric {
  categoryName: string
  eventCount: number
  avgAttendance: number
  engagementColor: string
}

export interface TenureSegment {
  label: string
  count: number
  percentage: number
  color: string
}

export interface InsightMetricsRequestParams {
  timeUnit: TimeUnit
  primaryYear: number
  primaryMonth: number // 1-12
  isComparisonEnabled: boolean
  compareYear: number
  compareMonth: number // 1-12
  segmentFilter: RoleSegmentFilter
  eventCategoryFilter?: EventCategoryFilter
  selectedCategories?: EventCategoryFilter[]
}

export interface InsightMetricsResponse {
  timeUnit: TimeUnit
  isComparisonEnabled: boolean
  segmentFilter: RoleSegmentFilter
  eventCategoryFilter: EventCategoryFilter
  periodLabel: string
  previousPeriodLabel: string
  categoryLabel: string
  summary: {
    totalActiveMembers: MetricDelta
    avgAttendanceRate: MetricDelta
    retentionRate: MetricDelta
    atRiskMembersCount: MetricDelta
  }
  trendChartData: TrendChartPoint[]
  silentChurnHealth: SilentChurnHealth
  roleComparison: RoleComparisonData
  eventCategories: EventCategoryMetric[]
  tenureBreakdown: TenureSegment[]
}

// Data generator helper function
export async function fetchInsightMetricsParams(
  params: InsightMetricsRequestParams
): Promise<InsightMetricsResponse> {
  await new Promise((res) => setTimeout(res, 180))

  const {
    timeUnit,
    primaryYear,
    primaryMonth,
    isComparisonEnabled,
    compareYear,
    compareMonth,
    segmentFilter,
    eventCategoryFilter = "all",
    selectedCategories = ["all"],
  } = params

  const primaryMonthName = MONTH_NAMES[primaryMonth - 1] || "Juli"
  const compareMonthName = MONTH_NAMES[compareMonth - 1] || "Maret"

  const periodLabel =
    timeUnit === "year"
      ? `Tahun ${primaryYear}`
      : `${primaryMonthName} ${primaryYear}`

  const previousPeriodLabel =
    timeUnit === "year"
      ? `Tahun ${compareYear}`
      : `${compareMonthName} ${compareYear}`

  // Category Label Computation
  let categoryLabel = "Semua Kategori Event"
  if (selectedCategories.length > 0 && !selectedCategories.includes("all")) {
    if (selectedCategories.length === 1) {
      const catObj = MASTER_EVENT_CATEGORIES.find((c) => c.id === selectedCategories[0])
      categoryLabel = catObj ? catObj.label : "1 Kategori"
    } else {
      categoryLabel = `${selectedCategories.length} Kategori Event`
    }
  } else {
    const categoryObj = MASTER_EVENT_CATEGORIES.find((c) => c.id === eventCategoryFilter)
    categoryLabel = categoryObj ? categoryObj.label : "Semua Kategori Event"
  }

  // Category multiplier based on active categories count
  const activeCount = selectedCategories.includes("all") ? 5 : selectedCategories.length
  const catMult = Math.min(1.0, 0.3 + activeCount * 0.15)

  // Segment multiplier
  const mult =
    segmentFilter === "umat"
      ? 0.85
      : segmentFilter === "aktivis"
      ? 0.15
      : segmentFilter === "pengurus"
      ? 0.05
      : 1.0

  let trendChartData: TrendChartPoint[] = []

  if (timeUnit === "year") {
    // 12 Months Data for 2026, 2025, 2024
    const base2026 = [165, 172, 180, 192, 198, 210, 224, 232, 238, 242, 245, 248]
    const base2025 = [142, 148, 155, 160, 165, 172, 185, 190, 196, 202, 208, 215]
    const base2024 = [120, 128, 134, 140, 145, 152, 160, 166, 172, 178, 184, 190]

    trendChartData = [
      "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"
    ].map((lbl, idx) => ({
      label: lbl,
      "2026": Math.round(Math.max(15, base2026[idx] * catMult * mult)),
      "2025": Math.round(Math.max(10, base2025[idx] * catMult * mult)),
      "2024": Math.round(Math.max(10, base2024[idx] * catMult * mult)),
    }))
  } else {
    // 4 Weeks Data for Months
    trendChartData = [
      { label: "Minggu 1", "Juli 2026": Math.round(210 * catMult * mult), "Juni 2026": Math.round(195 * catMult * mult), "Mei 2026": Math.round(180 * catMult * mult), "Maret 2026": Math.round(165 * catMult * mult) },
      { label: "Minggu 2", "Juli 2026": Math.round(225 * catMult * mult), "Juni 2026": Math.round(208 * catMult * mult), "Mei 2026": Math.round(192 * catMult * mult), "Maret 2026": Math.round(174 * catMult * mult) },
      { label: "Minggu 3", "Juli 2026": Math.round(238 * catMult * mult), "Juni 2026": Math.round(219 * catMult * mult), "Mei 2026": Math.round(205 * catMult * mult), "Maret 2026": Math.round(188 * catMult * mult) },
      { label: "Minggu 4", "Juli 2026": Math.round(248 * catMult * mult), "Juni 2026": Math.round(230 * catMult * mult), "Mei 2026": Math.round(215 * catMult * mult), "Maret 2026": Math.round(198 * catMult * mult) },
    ]
  }

  return {
    timeUnit,
    isComparisonEnabled,
    segmentFilter,
    eventCategoryFilter,
    periodLabel,
    previousPeriodLabel,
    categoryLabel,
    summary: {
      totalActiveMembers: {
        value: Math.round(260 * mult * catMult),
        deltaText: isComparisonEnabled ? "+14 (+5.9%)" : "Presensi Aktif",
        isPositive: true,
        description: isComparisonEnabled ? `vs ${previousPeriodLabel}` : periodLabel,
      },
      avgAttendanceRate: {
        value: "78.4%",
        deltaText: isComparisonEnabled ? "+4.2%" : "Tren Positif",
        isPositive: true,
        description: `Rata-rata presensi (${primaryMonthName})`,
      },
      retentionRate: {
        value: segmentFilter === "pengurus" ? "98.5%" : segmentFilter === "aktivis" ? "92.5%" : "86.2%",
        deltaText: isComparisonEnabled ? "+1.8%" : "Keaktifan Rutin",
        isPositive: true,
        description: "Umat yang konsisten hadir kembali setiap bulan",
      },
      atRiskMembersCount: {
        value: Math.round(9 * mult),
        deltaText: isComparisonEnabled ? "-3 member" : "Risk Level",
        isPositive: true,
        description: "Membutuhkan Sapa WA",
      },
    },
    trendChartData,
    silentChurnHealth: {
      totalMembers: Math.round(260 * mult),
      normalCount: Math.round(180 * mult),
      warningCount: Math.round(45 * mult),
      atRiskCount: Math.round(26 * mult),
      lostCount: Math.round(9 * mult),
      normalPercent: 69.2,
      warningPercent: 17.3,
      atRiskPercent: 10.0,
      lostPercent: 3.5,
    },
    roleComparison: {
      umat: {
        totalCount: 210,
        avgAttendancePercent: 74.2,
        avgMonthlyEvents: 3.8,
        topStreak: 16,
        avgAbsenceRate: "18 Orang Absen / Event",
      },
      aktivis: {
        totalCount: 38,
        avgAttendancePercent: 92.5,
        avgMonthlyEvents: 7.2,
        topStreak: 28,
        avgAbsenceRate: "3 Orang Absen / Event",
      },
      pengurus: {
        totalCount: 12,
        avgAttendancePercent: 96.8,
        avgMonthlyEvents: 8.5,
        topStreak: 36,
        avgAbsenceRate: "1 Orang Absen / Event",
      },
    },
    eventCategories: [
      { categoryName: "Puja Bhakti Minggu", eventCount: 48, avgAttendance: Math.round(142 * catMult), engagementColor: "bg-emerald-500" },
      { categoryName: "Dhammasakaccha", eventCount: 24, avgAttendance: Math.round(68 * catMult), engagementColor: "bg-blue-500" },
      { categoryName: "Latihan Meditasi", eventCount: 48, avgAttendance: Math.round(45 * catMult), engagementColor: "bg-amber-500" },
      { categoryName: "Bakti Sosial / Umat Care", eventCount: 12, avgAttendance: Math.round(95 * catMult), engagementColor: "bg-purple-500" },
    ],
    tenureBreakdown: [
      { label: "< 3 Bulan (Anggota Baru)", count: 32, percentage: 12.9, color: "bg-sky-500" },
      { label: "3 - 12 Bulan (Reguler)", count: 124, percentage: 50.0, color: "bg-brand-blue" },
      { label: "> 1 Tahun (Senior / Setia)", count: 92, percentage: 37.1, color: "bg-emerald-500" },
    ],
  }
}
