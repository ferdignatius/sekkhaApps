import { useEffect, useState, useRef } from "react"
import { Link } from "@tanstack/react-router"
import {
  UsersIcon,
  AlertTriangleIcon,
  BarChart3Icon,
  ChevronRightIcon,
  CalendarIcon,
  ShieldCheckIcon,
  RefreshCwIcon,
  LineChartIcon,
  ArrowRightLeftIcon,
  CheckIcon,
  TagIcon,
  TrendingUpIcon,
  ChevronDownIcon,
} from "lucide-react"
import { CartesianGrid, Dot, Line, LineChart, BarChart, Bar, XAxis, YAxis } from "recharts"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  fetchInsightMetricsParams,
  MASTER_EVENT_CATEGORIES,
  type InsightMetricsResponse,
  type RoleSegmentFilter,
  type EventCategoryFilter,
  type TimeUnit,
} from "../api/insightApi"

const SERIES_COLORS = ["#1F75FE", "#94A3B8", "#F59E0B", "#10B981", "#8B5CF6"]
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

export function InsightPage() {
  // Period & Category Controls
  const [timeUnit, setTimeUnit] = useState<TimeUnit>("year") // "year" | "month"

  // Multi-Select Selected Event Categories State
  const [selectedCategories, setSelectedCategories] = useState<EventCategoryFilter[]>(["all"])
  const [isCategorySelectOpen, setIsCategorySelectOpen] = useState(false)
  const dropdownCategoryRef = useRef<HTMLDivElement>(null)

  // Multi-Select Selected Periods State
  const availablePeriodOptions =
    timeUnit === "year"
      ? ["2026", "2025", "2024"]
      : ["July 2026", "June 2026", "May 2026", "March 2026"]

  const [selectedPeriods, setSelectedPeriods] = useState<string[]>(["2026"])
  const [isMultiSelectOpen, setIsMultiSelectOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [segmentFilter, setSegmentFilter] = useState<RoleSegmentFilter>("all") // "all" | "umat" | "aktivis" | "pengurus"
  const [chartType, setChartType] = useState<"line" | "bar">("line") // Default line chart

  const [data, setData] = useState<InsightMetricsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Reset selected periods when timeUnit changes
  useEffect(() => {
    if (timeUnit === "year") {
      setSelectedPeriods(["2026"])
    } else {
      setSelectedPeriods(["July 2026"])
    }
  }, [timeUnit])

  // Click outside listener for both dropdown popovers
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsMultiSelectOpen(false)
      }
      if (dropdownCategoryRef.current && !dropdownCategoryRef.current.contains(e.target as Node)) {
        setIsCategorySelectOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const togglePeriodSelection = (period: string) => {
    if (selectedPeriods.includes(period)) {
      if (selectedPeriods.length > 1) {
        setSelectedPeriods(selectedPeriods.filter((p) => p !== period))
      }
    } else {
      setSelectedPeriods([...selectedPeriods, period])
    }
  }

  const toggleCategorySelection = (catId: EventCategoryFilter) => {
    if (catId === "all") {
      if (selectedCategories.includes("all")) {
        setSelectedCategories(["puja_bhakti"])
      } else {
        setSelectedCategories(["all"])
      }
      return
    }

    const currentWithoutAll = selectedCategories.filter((c) => c !== "all")
    let updated: EventCategoryFilter[] = []

    if (currentWithoutAll.includes(catId)) {
      if (currentWithoutAll.length > 1) {
        updated = currentWithoutAll.filter((c) => c !== catId)
      } else {
        updated = currentWithoutAll
      }
    } else {
      updated = [...currentWithoutAll, catId]
    }

    if (updated.length === 5) {
      setSelectedCategories(["all"])
    } else {
      setSelectedCategories(updated)
    }
  }

  const getCategoryDropdownLabel = (cats: EventCategoryFilter[]) => {
    if (cats.includes("all") || cats.length === 5) {
      return "All Categories"
    }
    if (cats.length === 1) {
      const found = MASTER_EVENT_CATEGORIES.find((c) => c.id === cats[0])
      return found ? found.label : "1 Category"
    }
    return `${cats.length} Categories`
  }

  const loadMetrics = async () => {
    setIsLoading(true)
    try {
      const primaryPeriod = selectedPeriods[0] || (timeUnit === "year" ? "2026" : "July 2026")
      let primaryYear = 2026
      let primaryMonth = 7
      if (timeUnit === "year") {
        primaryYear = parseInt(primaryPeriod, 10) || 2026
      } else {
        const parts = primaryPeriod.split(" ")
        primaryYear = parseInt(parts[1], 10) || 2026
        const mIdx = MASTER_EVENT_CATEGORIES ? MONTH_NAMES.findIndex((mn) => mn.toLowerCase() === (parts[0] || "").toLowerCase()) : -1
        primaryMonth = mIdx >= 0 ? mIdx + 1 : 7
      }

      let compareYear = primaryYear - 1
      let compareMonth = primaryMonth === 1 ? 12 : primaryMonth - 1
      if (selectedPeriods.length > 1) {
        const comparePeriod = selectedPeriods[1]
        if (timeUnit === "year") {
          compareYear = parseInt(comparePeriod, 10) || primaryYear - 1
        } else {
          const parts = comparePeriod.split(" ")
          compareYear = parseInt(parts[1], 10) || primaryYear
          const mIdx = MONTH_NAMES.findIndex((mn) => mn.toLowerCase() === (parts[0] || "").toLowerCase())
          compareMonth = mIdx >= 0 ? mIdx + 1 : compareMonth
        }
      }

      const res = await fetchInsightMetricsParams({
        timeUnit,
        primaryYear,
        primaryMonth,
        isComparisonEnabled: selectedPeriods.length > 1,
        compareYear,
        compareMonth,
        segmentFilter,
        selectedCategories,
        selectedPeriods,
      })
      setData(res)
    } catch (err) {
      console.error("Failed to load insight metrics", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadMetrics()
  }, [timeUnit, segmentFilter, selectedCategories, selectedPeriods])

  // Dynamic Chart Config for active selected periods
  const chartConfig = selectedPeriods.reduce<ChartConfig>((acc, periodKey, idx) => {
    acc[periodKey] = {
      label: periodKey,
      color: SERIES_COLORS[idx % SERIES_COLORS.length],
    }
    return acc
  }, {})

  return (
    <main className="min-h-screen pb-24 md:pb-12">
      <PageBreadcrumb items={[{ label: "Organizer" }, { label: "Analytics & Insights" }]} />

      <div className="px-3.5 py-4 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
          {/* Header Banner */}
          <div className="flex flex-col gap-3.5 rounded-2xl sm:rounded-3xl border border-sekkha-hairline-soft bg-gradient-to-br from-sekkha-canvas via-sekkha-surface to-sekkha-canvas p-4 sm:p-6 shadow-2xs md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex size-8.5 sm:size-9 items-center justify-center rounded-xl bg-sekkha-brand-blue/10 text-sekkha-brand-blue shrink-0">
                  <BarChart3Icon className="size-4.5 sm:size-5" />
                </span>
                <h1 className="text-heading-5 sm:text-heading-4 font-bold text-sekkha-ink">Community Insights</h1>
              </div>
              <p className="text-caption sm:text-body-sm text-sekkha-slate max-w-2xl leading-relaxed">
                Interactive macro analytics dashboard. Track attendance rates and absence patterns across Members, Activists, and Organizers.
              </p>
            </div>

            {/* Refresh Button */}
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <button
                type="button"
                onClick={loadMetrics}
                className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-sekkha-hairline-soft bg-sekkha-surface px-3.5 py-2 text-caption-bold font-bold text-sekkha-ink hover:bg-sekkha-hairline-soft transition cursor-pointer shadow-2xs"
                title="Refresh Data"
              >
                <RefreshCwIcon className={`size-4 ${isLoading ? "animate-spin text-sekkha-brand-blue" : ""}`} />
                <span>Refresh Data</span>
              </button>
            </div>
          </div>

          {/* ── INTERACTIVE PERIOD & CATEGORY CONTROL PANEL ── */}
          <div className="flex flex-col gap-3.5 rounded-2xl sm:rounded-3xl border border-sekkha-hairline-soft bg-sekkha-canvas p-3.5 sm:p-5 shadow-xs">
            {/* Top Row: Dropdowns for Basis Waktu + Multi-Select Kategori Event + Multi-Select Comparison Dropdown */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 border-b border-sekkha-hairline-soft pb-3.5 sm:pb-4">
              <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
                {/* 1. Dropdown Basis Waktu */}
                <div className="flex items-center gap-1.5 rounded-xl border border-sekkha-hairline-soft bg-sekkha-surface px-3 py-2 text-caption-bold font-bold text-sekkha-ink shadow-2xs w-full sm:w-auto">
                  <CalendarIcon className="size-4 text-sekkha-brand-blue shrink-0" />
                  <select
                    value={timeUnit}
                    onChange={(e) => setTimeUnit(e.target.value as TimeUnit)}
                    className="w-full bg-transparent font-bold text-sekkha-ink outline-none cursor-pointer text-caption sm:text-caption-bold"
                  >
                    <option value="year">Scale: Yearly (12 Months)</option>
                    <option value="month">Scale: Monthly (Weekly)</option>
                  </select>
                </div>

                {/* 2. MULTI-SELECT KATEGORI EVENT DROPDOWN */}
                <div className="relative w-full sm:w-auto" ref={dropdownCategoryRef}>
                  <button
                    type="button"
                    onClick={() => setIsCategorySelectOpen(!isCategorySelectOpen)}
                    className={`flex w-full sm:w-auto items-center justify-between sm:justify-start gap-2 rounded-xl px-3.5 sm:px-4 py-2 text-caption-bold transition cursor-pointer shadow-2xs ${
                      selectedCategories.length > 0 && !selectedCategories.includes("all")
                        ? "border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold shadow-xs"
                        : "border border-sekkha-hairline-soft bg-sekkha-surface text-sekkha-ink hover:bg-sekkha-hairline-soft"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <TagIcon className="size-4 text-amber-500 shrink-0" />
                      <span className="truncate">
                        Category:{" "}
                        <strong className="font-extrabold">
                          {getCategoryDropdownLabel(selectedCategories)}
                        </strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {selectedCategories.length > 1 && !selectedCategories.includes("all") && (
                        <span className="rounded-md bg-amber-500/20 px-1.5 py-0.5 text-micro font-bold text-amber-800 dark:text-amber-300">
                          {selectedCategories.length}
                        </span>
                      )}
                      <ChevronDownIcon className="size-4 opacity-70" />
                    </div>
                  </button>

                  {/* Dropdown Menu Popover with Checkboxes */}
                  {isCategorySelectOpen && (
                    <div className="absolute left-0 right-0 sm:right-auto top-full mt-2 w-full sm:w-72 rounded-2xl border border-sekkha-hairline-soft bg-white p-3 shadow-xl backdrop-blur-md z-30 space-y-1.5 animate-fadeIn">
                      <div className="text-micro-bold font-extrabold text-sekkha-slate uppercase tracking-wider px-2 pb-1 border-b border-sekkha-hairline-soft">
                        Select Event Categories:
                      </div>
                      {MASTER_EVENT_CATEGORIES.map((cat) => {
                        const isSelected =
                          cat.id === "all"
                            ? selectedCategories.includes("all") || selectedCategories.length === 5
                            : selectedCategories.includes(cat.id)

                        return (
                          <label
                            key={cat.id}
                            onClick={(e) => {
                              e.preventDefault()
                              toggleCategorySelection(cat.id)
                            }}
                            className="flex items-center justify-between rounded-xl px-2.5 py-2 text-caption-bold text-sekkha-ink hover:bg-sekkha-surface cursor-pointer transition select-none"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`flex size-4.5 items-center justify-center rounded-md border transition shrink-0 ${
                                  isSelected
                                    ? "border-amber-500 bg-amber-500 text-white"
                                    : "border-sekkha-hairline-soft bg-sekkha-canvas"
                                }`}
                              >
                                {isSelected && <CheckIcon className="size-3 stroke-[3]" />}
                              </div>
                              <span className="font-bold truncate">{cat.label}</span>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* 3. MULTI-SELECT BANDINGKAN PERIODE DROPDOWN */}
              <div className="relative w-full sm:w-auto" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsMultiSelectOpen(!isMultiSelectOpen)}
                  className={`flex w-full sm:w-auto items-center justify-between sm:justify-start gap-2 rounded-xl px-3.5 sm:px-4 py-2 text-caption-bold transition cursor-pointer shadow-2xs ${
                    selectedPeriods.length > 1
                      ? "bg-sekkha-brand-blue font-bold text-white shadow-xs"
                      : "border border-sekkha-hairline-soft bg-sekkha-surface text-sekkha-ink hover:bg-sekkha-hairline-soft"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ArrowRightLeftIcon className="size-4 shrink-0" />
                    <span className="truncate">
                      Compare:{" "}
                      <strong className="font-extrabold">
                        {selectedPeriods.join(", ")}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {selectedPeriods.length > 1 && (
                      <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-micro font-bold">
                        {selectedPeriods.length}
                      </span>
                    )}
                    <ChevronDownIcon className="size-4 opacity-70" />
                  </div>
                </button>

                {/* Dropdown Menu Popover with Checkboxes */}
                {isMultiSelectOpen && (
                  <div className="absolute left-0 sm:left-auto right-0 top-full mt-2 w-full sm:w-64 rounded-2xl border border-sekkha-hairline-soft bg-white p-3 shadow-xl backdrop-blur-md z-30 space-y-1.5 animate-fadeIn">
                    <div className="text-micro-bold font-extrabold text-sekkha-slate uppercase tracking-wider px-2 pb-1 border-b border-sekkha-hairline-soft">
                      Select Active Periods:
                    </div>
                    {availablePeriodOptions.map((periodKey) => {
                      const isSelected = selectedPeriods.includes(periodKey)
                      return (
                        <label
                          key={periodKey}
                          onClick={(e) => {
                            e.preventDefault()
                            togglePeriodSelection(periodKey)
                          }}
                          className="flex items-center justify-between rounded-xl px-2.5 py-2 text-caption-bold text-sekkha-ink hover:bg-sekkha-surface cursor-pointer transition select-none"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`flex size-4.5 items-center justify-center rounded-md border transition shrink-0 ${
                                isSelected
                                  ? "border-sekkha-brand-blue bg-sekkha-brand-blue text-white"
                                  : "border-sekkha-hairline-soft bg-sekkha-canvas"
                              }`}
                            >
                              {isSelected && <CheckIcon className="size-3 stroke-[3]" />}
                            </div>
                            <span className="font-bold truncate">{periodKey}</span>
                          </div>
                          {isSelected && (
                            <span
                              className="size-2.5 rounded-full shrink-0"
                              style={{
                                backgroundColor:
                                  SERIES_COLORS[
                                    selectedPeriods.indexOf(periodKey) % SERIES_COLORS.length
                                  ],
                              }}
                            />
                          )}
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Row: Role Segment Filter & Active Comparison Notice */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="text-micro text-sekkha-slate">
                {selectedPeriods.length > 1 ? (
                  <span className="font-semibold text-sekkha-brand-blue">
                    *Comparing charts: <strong>{selectedPeriods.join(" vs ")}</strong> ({getCategoryDropdownLabel(selectedCategories)})
                  </span>
                ) : (
                  <span>*Use dropdowns above to compare multiple periods & event categories.</span>
                )}
              </div>

              {/* Role Segment Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
                <span className="text-micro font-extrabold uppercase tracking-wider text-sekkha-slate mr-1 shrink-0">Role:</span>
                {[
                  { id: "all", label: "All (260)" },
                  { id: "umat", label: "Members (210)" },
                  { id: "aktivis", label: "Activists (38)" },
                  { id: "pengurus", label: "Organizers (12)" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSegmentFilter(tab.id as RoleSegmentFilter)}
                    className={`rounded-lg px-2.5 py-1 text-micro-bold font-bold transition cursor-pointer shrink-0 ${
                      segmentFilter === tab.id
                        ? "bg-sekkha-brand-blue text-white shadow-xs"
                        : "border border-sekkha-hairline-soft bg-sekkha-surface text-sekkha-slate hover:text-sekkha-ink"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {isLoading || !data ? (
            <div className="flex h-64 items-center justify-center rounded-3xl border border-sekkha-hairline-soft bg-sekkha-canvas">
              <div className="flex flex-col items-center gap-2 text-sekkha-muted">
                <RefreshCwIcon className="size-7 animate-spin text-sekkha-brand-blue" />
                <p className="text-body-sm font-semibold">Loading Member & Organizer insights...</p>
              </div>
            </div>
          ) : (
            <>
              {/* ── 1. KPI STATS CARDS GRID ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                {/* Card 1: Total Active Members */}
                <div className="flex flex-col justify-between rounded-2xl border border-sekkha-hairline-soft bg-sekkha-canvas p-4 sm:p-4.5 shadow-xs transition hover:shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-caption text-sekkha-slate font-medium">Total Active Members</p>
                      <h3 className="mt-1 text-heading-4 sm:text-heading-3 font-extrabold text-sekkha-ink">
                        {data.summary.totalActiveMembers.value}
                      </h3>
                    </div>
                    <span className="flex size-9 sm:size-10 items-center justify-center rounded-2xl bg-blue-500/10 text-sekkha-brand-blue shrink-0">
                      <UsersIcon className="size-4.5 sm:size-5" />
                    </span>
                  </div>
                  <div className="mt-3.5 sm:mt-4 flex items-center justify-between border-t border-sekkha-hairline-soft/80 pt-2.5 text-micro">
                    <span className="inline-flex items-center gap-0.5 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                      {data.summary.totalActiveMembers.deltaText}
                    </span>
                    <span className="text-sekkha-slate truncate max-w-[130px]">{data.summary.totalActiveMembers.description}</span>
                  </div>
                </div>

                {/* Card 2: Average Attendance Rate */}
                <div className="flex flex-col justify-between rounded-2xl border border-sekkha-hairline-soft bg-sekkha-canvas p-4 sm:p-4.5 shadow-xs transition hover:shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-caption text-sekkha-slate font-medium">Avg Attendance Rate</p>
                      <h3 className="mt-1 text-heading-4 sm:text-heading-3 font-extrabold text-sekkha-ink">
                        {data.summary.avgAttendanceRate.value}
                      </h3>
                    </div>
                    <span className="flex size-9 sm:size-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 shrink-0">
                      <TrendingUpIcon className="size-4.5 sm:size-5" />
                    </span>
                  </div>
                  <div className="mt-3.5 sm:mt-4 flex items-center justify-between border-t border-sekkha-hairline-soft/80 pt-2.5 text-micro">
                    <span className="inline-flex items-center gap-0.5 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                      {data.summary.avgAttendanceRate.deltaText}
                    </span>
                    <span className="text-sekkha-slate truncate max-w-[130px]">{data.summary.avgAttendanceRate.description}</span>
                  </div>
                </div>

                {/* Card 3: Routine Retention Rate */}
                <div className="flex flex-col justify-between rounded-2xl border border-sekkha-hairline-soft bg-sekkha-canvas p-4 sm:p-4.5 shadow-xs transition hover:shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-caption text-sekkha-slate font-medium">Routine Retention Rate</p>
                      <h3 className="mt-1 text-heading-4 sm:text-heading-3 font-extrabold text-sekkha-ink">
                        {data.summary.retentionRate.value}
                      </h3>
                    </div>
                    <span className="flex size-9 sm:size-10 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 shrink-0">
                      <ShieldCheckIcon className="size-4.5 sm:size-5" />
                    </span>
                  </div>
                  <div className="mt-3.5 sm:mt-4 flex items-center justify-between border-t border-sekkha-hairline-soft/80 pt-2.5 text-micro">
                    <span className="inline-flex items-center gap-0.5 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                      {data.summary.retentionRate.deltaText}
                    </span>
                    <span className="text-sekkha-slate truncate max-w-[130px]">{data.summary.retentionRate.description}</span>
                  </div>
                </div>

                {/* Card 4: Silent-Churn At-Risk Members */}
                <div className="flex flex-col justify-between rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 sm:p-4.5 shadow-xs transition hover:shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-caption text-rose-700 dark:text-rose-400 font-semibold">At-Risk Members (Churn)</p>
                      <h3 className="mt-1 text-heading-4 sm:text-heading-3 font-extrabold text-rose-700 dark:text-rose-400">
                        {data.summary.atRiskMembersCount.value} <span className="text-caption font-normal text-rose-600">Members</span>
                      </h3>
                    </div>
                    <span className="flex size-9 sm:size-10 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-600 shrink-0">
                      <AlertTriangleIcon className="size-4.5 sm:size-5" />
                    </span>
                  </div>
                  <div className="mt-3.5 sm:mt-4 flex items-center justify-between border-t border-rose-500/20 pt-2.5 text-micro">
                    <span className="inline-flex items-center gap-0.5 font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                      {data.summary.atRiskMembersCount.deltaText}
                    </span>
                    <span className="text-rose-700/80 dark:text-rose-400/80 truncate">{data.summary.atRiskMembersCount.description}</span>
                  </div>
                </div>
              </div>

              {/* ── 2. SHADCN RECHARTS ANALYTICAL CHART CARD (Multi-Select Comparison Support) ── */}
              <Card className="p-0 overflow-hidden">
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 sm:p-6 pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-body-sm sm:text-body-sm-medium font-bold text-sekkha-ink flex items-center gap-2 flex-wrap">
                      <span>Community Attendance Trend</span>
                      <span className="rounded-lg bg-amber-500/10 px-2 py-0.5 text-micro-bold font-bold text-amber-700 dark:text-amber-400">
                        {data.categoryLabel}
                      </span>
                      <span className="rounded-lg bg-sekkha-brand-blue/10 px-2 py-0.5 text-micro-bold text-sekkha-brand-blue">
                        {selectedPeriods.join(" vs ")}
                      </span>
                    </CardTitle>
                    <CardDescription className="text-caption text-sekkha-slate">
                      {timeUnit === "year"
                        ? `12-month attendance trend (January - December) by active period comparison.`
                        : `Weekly attendance trend by active period comparison.`}
                    </CardDescription>
                  </div>

                  <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                    {/* Dynamic Legend for Active Periods */}
                    <div className="flex flex-wrap items-center gap-2.5 text-micro font-bold">
                      {selectedPeriods.map((periodKey, idx) => {
                        const color = SERIES_COLORS[idx % SERIES_COLORS.length]
                        return (
                          <div key={periodKey} className="flex items-center gap-1.5">
                            <span
                              className="size-2.5 sm:size-3 rounded-full shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-sekkha-ink">{periodKey}</span>
                          </div>
                        )
                      })}
                    </div>

                    {/* Chart Type Switcher */}
                    <div className="flex items-center rounded-xl border border-sekkha-hairline-soft bg-sekkha-surface p-1 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setChartType("line")}
                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-caption-bold transition cursor-pointer ${
                          chartType === "line"
                            ? "bg-white font-bold text-sekkha-ink shadow-2xs"
                            : "text-sekkha-slate hover:text-sekkha-ink"
                        }`}
                        title="Line Chart View"
                      >
                        <LineChartIcon className="size-3.5 sm:size-4" />
                        <span className="text-micro font-bold">Line</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setChartType("bar")}
                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-caption-bold transition cursor-pointer ${
                          chartType === "bar"
                            ? "bg-white font-bold text-sekkha-ink shadow-2xs"
                            : "text-sekkha-slate hover:text-sekkha-ink"
                        }`}
                        title="Bar Chart View"
                      >
                        <BarChart3Icon className="size-3.5 sm:size-4" />
                        <span className="text-micro font-bold">Bar</span>
                      </button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-2 sm:p-6 pt-2">
                  {chartType === "line" ? (
                    <ChartContainer config={chartConfig} className="h-60 sm:h-72 w-full">
                      <LineChart
                        accessibilityLayer
                        data={data.trendChartData}
                        margin={{
                          top: 20,
                          left: 12,
                          right: 12,
                          bottom: 8,
                        }}
                      >
                        <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#E2E8F0" />
                        <XAxis
                          dataKey="label"
                          tickLine={false}
                          tickMargin={8}
                          axisLine={false}
                          interval={0}
                          padding={{ left: 16, right: 16 }}
                          tick={{ fontSize: 10, fill: "#64748B" }}
                        />
                        <YAxis
                          domain={[
                            0,
                            (dataMax: number) => Math.ceil(dataMax * 1.5),
                          ]}
                          hide
                        />
                        <ChartTooltip
                          cursor={false}
                          content={<ChartTooltipContent indicator="line" />}
                        />
                        {selectedPeriods.map((periodKey, idx) => {
                          const color = SERIES_COLORS[idx % SERIES_COLORS.length]
                          return (
                            <Line
                              key={periodKey}
                              dataKey={periodKey}
                              name={periodKey}
                              type="natural"
                              stroke={color}
                              strokeWidth={idx === 0 ? 3 : 2.5}
                              strokeDasharray={idx === 0 ? undefined : "5 5"}
                              dot={({ payload, cx, cy }) => (
                                <Dot
                                  key={`${periodKey}-dot-${payload?.label || Math.random()}`}
                                  r={idx === 0 ? 4.5 : 3.5}
                                  cx={cx}
                                  cy={cy}
                                  fill={color}
                                  stroke="#FFFFFF"
                                  strokeWidth={1.5}
                                />
                              )}
                            />
                          )
                        })}
                      </LineChart>
                    </ChartContainer>
                  ) : (
                    <ChartContainer config={chartConfig} className="h-60 sm:h-72 w-full">
                      <BarChart
                        accessibilityLayer
                        data={data.trendChartData}
                        margin={{
                          top: 20,
                          left: 12,
                          right: 12,
                          bottom: 8,
                        }}
                      >
                        <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#E2E8F0" />
                        <XAxis
                          dataKey="label"
                          tickLine={false}
                          tickMargin={8}
                          axisLine={false}
                          interval={0}
                          padding={{ left: 16, right: 16 }}
                          tick={{ fontSize: 10, fill: "#64748B" }}
                        />
                        <YAxis
                          domain={[
                            0,
                            (dataMax: number) => Math.ceil(dataMax * 1.5),
                          ]}
                          hide
                        />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                        {selectedPeriods.map((periodKey, idx) => {
                          const color = SERIES_COLORS[idx % SERIES_COLORS.length]
                          return (
                            <Bar
                              key={periodKey}
                              dataKey={periodKey}
                              name={periodKey}
                              fill={color}
                              radius={6}
                            />
                          )
                        })}
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>

              {/* ── 3. STRATEGIC INTEGRATION WIDGET: SILENT-CHURN HEALTH OVERVIEW ── */}
              <div className="rounded-2xl sm:rounded-3xl border border-sekkha-brand-blue/20 bg-gradient-to-br from-sekkha-brand-blue/5 via-sekkha-canvas to-sekkha-surface p-4 sm:p-6 shadow-xs space-y-3.5 sm:space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="flex size-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 shrink-0">
                        <AlertTriangleIcon className="size-4" />
                      </span>
                      <h2 className="text-caption-bold sm:text-body-sm-medium font-bold text-sekkha-ink">
                        Community Engagement Health (Silent-Churn)
                      </h2>
                    </div>
                    <p className="text-micro sm:text-caption text-sekkha-slate max-w-xl">
                      Macro data integrated with <strong>Silent-Churn Alert</strong>. Track member activity segmentation to prevent long-term dropouts.
                    </p>
                  </div>

                  {/* Direct Link to /recency-alerts */}
                  <Link
                    to="/recency-alerts"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-sekkha-brand-blue px-3.5 py-2.5 text-caption-bold font-bold text-white shadow-xs transition hover:bg-blue-600 active:scale-95 shrink-0 cursor-pointer w-full sm:w-auto"
                  >
                    <span>Manage in Silent-Churn Alert</span>
                    <ChevronRightIcon className="size-4" />
                  </Link>
                </div>

                {/* Combined Progress Bar */}
                <div className="space-y-2">
                  <div className="flex h-3.5 sm:h-4 w-full overflow-hidden rounded-full bg-sekkha-surface border border-sekkha-hairline-soft p-0.5">
                    <div
                      style={{ width: `${data.silentChurnHealth.normalPercent}%` }}
                      className="bg-emerald-500 rounded-l-full transition-all duration-500"
                      title={`Normal: ${data.silentChurnHealth.normalCount} (${data.silentChurnHealth.normalPercent}%)`}
                    />
                    <div
                      style={{ width: `${data.silentChurnHealth.warningPercent}%` }}
                      className="bg-amber-400 transition-all duration-500"
                      title={`Warning: ${data.silentChurnHealth.warningCount} (${data.silentChurnHealth.warningPercent}%)`}
                    />
                    <div
                      style={{ width: `${data.silentChurnHealth.atRiskPercent}%` }}
                      className="bg-amber-600 transition-all duration-500"
                      title={`At Risk: ${data.silentChurnHealth.atRiskCount} (${data.silentChurnHealth.atRiskPercent}%)`}
                    />
                    <div
                      style={{ width: `${data.silentChurnHealth.lostPercent}%` }}
                      className="bg-rose-500 rounded-r-full transition-all duration-500"
                      title={`Lost: ${data.silentChurnHealth.lostCount} (${data.silentChurnHealth.lostPercent}%)`}
                    />
                  </div>

                  {/* Health Level Badges Grid */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 pt-1 text-micro">
                    <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1.5 sm:py-2 font-bold text-emerald-700 dark:text-emerald-400">
                      <span>🟢 Normal</span>
                      <span>{data.silentChurnHealth.normalCount}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/10 px-2.5 py-1.5 sm:py-2 font-bold text-amber-700 dark:text-amber-400">
                      <span>🟡 Warning</span>
                      <span>{data.silentChurnHealth.warningCount}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-orange-500/20 bg-orange-500/10 px-2.5 py-1.5 sm:py-2 font-bold text-orange-700 dark:text-orange-400">
                      <span>🟠 At Risk</span>
                      <span>{data.silentChurnHealth.atRiskCount}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-rose-500/20 bg-rose-500/10 px-2.5 py-1.5 sm:py-2 font-bold text-rose-700 dark:text-rose-400">
                      <span>🔴 Lost</span>
                      <span>{data.silentChurnHealth.lostCount}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── 4. SEGMENT ANALYTICS: PERBANDINGAN ROLE UMAT, AKTIVIS, & PENGURUS ── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                {/* 1. ROLE UMAT Card */}
                <div className="rounded-2xl sm:rounded-3xl border border-sekkha-hairline-soft bg-sekkha-canvas p-4 sm:p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-sekkha-brand-blue/10 px-2.5 py-1 text-caption-bold font-extrabold text-sekkha-brand-blue">
                      ROLE MEMBERS
                    </span>
                    <span className="text-caption-bold font-extrabold text-sekkha-ink">
                      {data.roleComparison.umat.totalCount} People
                    </span>
                  </div>
                  <div className="space-y-2 text-micro text-sekkha-slate pt-2 border-t border-sekkha-hairline-soft">
                    <div className="flex justify-between">
                      <span>Avg Attendance:</span>
                      <strong className="text-sekkha-ink">{data.roleComparison.umat.avgAttendancePercent}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg Absence:</span>
                      <strong className="text-amber-600 font-bold">{data.roleComparison.umat.avgAbsenceRate}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Events / Month:</span>
                      <strong className="text-sekkha-ink">{data.roleComparison.umat.avgMonthlyEvents}x Events</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Attendance Streak:</span>
                      <strong className="text-emerald-600 font-bold">{data.roleComparison.umat.topStreak}x Weeks</strong>
                    </div>
                  </div>
                </div>

                {/* 2. ROLE AKTIVIS Card */}
                <div className="rounded-2xl sm:rounded-3xl border border-sekkha-hairline-soft bg-sekkha-canvas p-4 sm:p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-amber-500/10 px-2.5 py-1 text-caption-bold font-extrabold text-amber-600">
                      ROLE ACTIVISTS
                    </span>
                    <span className="text-caption-bold font-extrabold text-sekkha-ink">
                      {data.roleComparison.aktivis.totalCount} People
                    </span>
                  </div>
                  <div className="space-y-2 text-micro text-sekkha-slate pt-2 border-t border-sekkha-hairline-soft">
                    <div className="flex justify-between">
                      <span>Avg Attendance:</span>
                      <strong className="text-sekkha-ink">{data.roleComparison.aktivis.avgAttendancePercent}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg Absence:</span>
                      <strong className="text-amber-600 font-bold">{data.roleComparison.aktivis.avgAbsenceRate}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Events / Month:</span>
                      <strong className="text-sekkha-ink">{data.roleComparison.aktivis.avgMonthlyEvents}x Events</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Attendance Streak:</span>
                      <strong className="text-emerald-600 font-bold">{data.roleComparison.aktivis.topStreak}x Weeks</strong>
                    </div>
                  </div>
                </div>

                {/* 3. ROLE PENGURUS Card */}
                <div className="rounded-2xl sm:rounded-3xl border border-purple-500/30 bg-purple-500/5 p-4 sm:p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-purple-500/20 px-2.5 py-1 text-caption-bold font-extrabold text-purple-700 dark:text-purple-400">
                      ROLE ORGANIZERS
                    </span>
                    <span className="text-caption-bold font-extrabold text-sekkha-ink">
                      {data.roleComparison.pengurus.totalCount} People
                    </span>
                  </div>
                  <div className="space-y-2 text-micro text-sekkha-slate pt-2 border-t border-purple-500/20">
                    <div className="flex justify-between">
                      <span>Avg Attendance:</span>
                      <strong className="text-sekkha-ink">{data.roleComparison.pengurus.avgAttendancePercent}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg Absence:</span>
                      <strong className="text-emerald-600 font-bold">{data.roleComparison.pengurus.avgAbsenceRate}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Events / Month:</span>
                      <strong className="text-sekkha-ink">{data.roleComparison.pengurus.avgMonthlyEvents}x Events</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Attendance Streak:</span>
                      <strong className="text-purple-700 dark:text-purple-400 font-bold">{data.roleComparison.pengurus.topStreak}x Weeks</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── 5. EVENT CATEGORY BREAKDOWN ── */}
              <div className="rounded-2xl sm:rounded-3xl border border-sekkha-hairline-soft bg-sekkha-canvas p-4 sm:p-6 shadow-xs space-y-3.5 sm:space-y-4">
                <h2 className="text-caption-bold sm:text-body-sm-medium font-bold text-sekkha-ink flex items-center gap-2">
                  <CalendarIcon className="size-4 text-sekkha-brand-blue" />
                  <span>Attendance & Absence Rate by Event Category</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {data.eventCategories.map((cat, i) => (
                    <div key={i} className="space-y-1.5 rounded-2xl border border-sekkha-hairline-soft bg-sekkha-surface p-3 sm:p-3.5">
                      <div className="flex items-center justify-between text-micro font-bold">
                        <span className="text-sekkha-ink truncate max-w-[180px]">{cat.categoryName} ({cat.eventCount}x Events)</span>
                        <span className="text-sekkha-slate shrink-0">Avg {cat.avgAttendance} Attended</span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-sekkha-canvas overflow-hidden border border-sekkha-hairline-soft">
                        <div
                          style={{ width: `${Math.min(100, Math.round((cat.avgAttendance / 180) * 100))}%` }}
                          className={`h-full rounded-full ${cat.engagementColor}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
