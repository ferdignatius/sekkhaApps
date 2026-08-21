// modules/pengurus/internal/api/insightApi.ts
// Real API & Data definitions for Insight Umat dashboard with custom period, role segment & event category filters

import { api } from "@/lib/api"

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
  primaryYear?: number
  primaryMonth?: number // 1-12
  isComparisonEnabled?: boolean
  compareYear?: number
  compareMonth?: number // 1-12
  segmentFilter: RoleSegmentFilter
  eventCategoryFilter?: EventCategoryFilter
  selectedCategories?: EventCategoryFilter[]
  selectedPeriods?: string[]
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

export async function fetchInsightMetricsParams(
  params: InsightMetricsRequestParams
): Promise<InsightMetricsResponse> {
  try {
    const query = new URLSearchParams()
    query.set("timeUnit", params.timeUnit)
    if (params.primaryYear) query.set("primaryYear", String(params.primaryYear))
    if (params.primaryMonth) query.set("primaryMonth", String(params.primaryMonth))
    if (params.compareYear) query.set("compareYear", String(params.compareYear))
    if (params.compareMonth) query.set("compareMonth", String(params.compareMonth))
    if (params.isComparisonEnabled !== undefined) query.set("isComparisonEnabled", String(params.isComparisonEnabled))
    query.set("segmentFilter", params.segmentFilter || "all")
    query.set("eventCategoryFilter", params.eventCategoryFilter || "all")

    if (params.selectedCategories && params.selectedCategories.length > 0) {
      query.set("selectedCategories", params.selectedCategories.join(","))
    }
    if (params.selectedPeriods && params.selectedPeriods.length > 0) {
      query.set("selectedPeriods", params.selectedPeriods.join(","))
    }

    const res = await api.get<InsightMetricsResponse>(`/pengurus/insight?${query.toString()}`)
    return res
  } catch (err) {
    console.error("API /pengurus/insight error:", err)
    throw err
  }
}
