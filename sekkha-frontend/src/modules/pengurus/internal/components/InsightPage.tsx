import { useEffect, useState, useRef, useMemo } from "react"
import {
  UsersIcon,
  BarChart3Icon,
  CalendarIcon,
  ShieldCheckIcon,
  RefreshCwIcon,
  LineChartIcon,
  ArrowRightLeftIcon,
  CheckIcon,
  TagIcon,
  TrendingUpIcon,
  ChevronDownIcon,
  AwardIcon,
} from "lucide-react"
import {
  CartesianGrid,
  Dot,
  Line,
  LineChart,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from "recharts"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Chip,
} from "@/components/base"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"
import {
  fetchInsightMetricsParams,
  MASTER_EVENT_CATEGORIES,
} from "../api/insightApi"
import type {
  InsightMetricsResponse,
  RoleSegmentFilter,
  EventCategoryFilter,
  TimeUnit,
} from "../api/insightApi"

const SERIES_COLORS = ["#1F75FE", "#94A3B8", "#F59E0B", "#10B981", "#8B5CF6"]
const MONTH_NAMES = [
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

export function InsightPage() {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonthIdx = now.getMonth()
  const defaultYearOption = String(currentYear)
  const defaultMonthOption = `${MONTH_NAMES[currentMonthIdx]} ${currentYear}`

  // Period & Category Controls
  const [timeUnit, setTimeUnit] = useState<TimeUnit>("year") // "year" | "month"

  // Multi-Select Selected Event Categories State
  const [selectedCategories, setSelectedCategories] = useState<
    EventCategoryFilter[]
  >(["all"])
  const [isCategorySelectOpen, setIsCategorySelectOpen] = useState(false)
  const dropdownCategoryRef = useRef<HTMLDivElement>(null)

  // Multi-Select Selected Periods State (dynamically generated from current year)
  const availablePeriodOptions = useMemo(() => {
    if (timeUnit === "year") {
      return [
        String(currentYear),
        String(currentYear - 1),
        String(currentYear - 2),
      ]
    }
    const months: string[] = []
    for (let i = 0; i < 6; i++) {
      const d = new Date(currentYear, currentMonthIdx - i, 1)
      months.push(`${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`)
    }
    return months
  }, [timeUnit, currentYear, currentMonthIdx])

  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([
    defaultYearOption,
  ])
  const [isMultiSelectOpen, setIsMultiSelectOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [segmentFilter, setSegmentFilter] = useState<RoleSegmentFilter>("all") // "all" | "umat" | "aktivis" | "pengurus"
  const [chartType, setChartType] = useState<"line" | "bar">("line") // Default line chart

  const [data, setData] = useState<InsightMetricsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Reset selected periods when timeUnit changes
  useEffect(() => {
    if (timeUnit === "year") {
      setSelectedPeriods([defaultYearOption])
    } else {
      setSelectedPeriods([defaultMonthOption])
    }
  }, [timeUnit, defaultYearOption, defaultMonthOption])

  // Click outside listener for both dropdown popovers
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsMultiSelectOpen(false)
      }
      if (
        dropdownCategoryRef.current &&
        !dropdownCategoryRef.current.contains(e.target as Node)
      ) {
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
      const primaryPeriod =
        selectedPeriods[0] ||
        (timeUnit === "year" ? defaultYearOption : defaultMonthOption)
      let primaryYear = currentYear
      let primaryMonth = currentMonthIdx + 1
      if (timeUnit === "year") {
        primaryYear = parseInt(primaryPeriod, 10) || currentYear
      } else {
        const parts = primaryPeriod.split(" ")
        primaryYear = parseInt(parts[1], 10) || currentYear
        const mIdx = MASTER_EVENT_CATEGORIES
          ? MONTH_NAMES.findIndex(
              (mn) => mn.toLowerCase() === (parts[0] || "").toLowerCase()
            )
          : -1
        primaryMonth = mIdx >= 0 ? mIdx + 1 : currentMonthIdx + 1
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
          const mIdx = MONTH_NAMES.findIndex(
            (mn) => mn.toLowerCase() === (parts[0] || "").toLowerCase()
          )
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
    void loadMetrics()
  }, [timeUnit, segmentFilter, selectedCategories, selectedPeriods])

  // Dynamic role counts from loaded data
  const roleFilterTabs = useMemo(() => {
    const umatCount = data?.roleComparison?.umat?.totalCount
    const aktivisCount = data?.roleComparison?.aktivis?.totalCount
    const pengurusCount = data?.roleComparison?.pengurus?.totalCount
    const totalCount =
      umatCount !== undefined &&
      aktivisCount !== undefined &&
      pengurusCount !== undefined
        ? umatCount + aktivisCount + pengurusCount
        : typeof data?.summary?.totalActiveMembers?.value === "number"
          ? data.summary.totalActiveMembers.value
          : undefined

    return [
      {
        id: "all" as RoleSegmentFilter,
        label: totalCount !== undefined ? `All (${totalCount})` : "All",
      },
      {
        id: "umat" as RoleSegmentFilter,
        label: umatCount !== undefined ? `Members (${umatCount})` : "Members",
      },
      {
        id: "aktivis" as RoleSegmentFilter,
        label:
          aktivisCount !== undefined
            ? `Activists (${aktivisCount})`
            : "Activists",
      },
      {
        id: "pengurus" as RoleSegmentFilter,
        label:
          pengurusCount !== undefined
            ? `Organizers (${pengurusCount})`
            : "Organizers",
      },
    ]
  }, [data])

  // Dynamic Chart Config for active selected periods
  const chartConfig = selectedPeriods.reduce<ChartConfig>(
    (acc, periodKey, idx) => {
      acc[periodKey] = {
        label: periodKey,
        color: SERIES_COLORS[idx % SERIES_COLORS.length],
      }
      return acc
    },
    {}
  )

  return (
    <main className="min-h-screen bg-canvas pb-24 text-left font-sans md:pb-12">
      <PageBreadcrumb
        items={[{ label: "Community Insights" }]}
        showBack={false}
      />

      <div className="px-3.5 py-4 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
          {/* Header Banner */}
          <div className="flex flex-col gap-3.5 rounded-2xl border border-hairline bg-surface-soft p-4 shadow-2xs sm:rounded-3xl sm:p-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex size-8.5 shrink-0 items-center justify-center rounded-xl bg-[#1a3a3a] text-[#e8b94a] sm:size-9">
                  <BarChart3Icon className="size-4.5 sm:size-5" />
                </span>
                <h1 className="text-heading-5 sm:text-heading-4 font-bold text-ink">
                  Community Insights
                </h1>
              </div>
              <p className="text-caption sm:text-body-sm max-w-2xl leading-relaxed text-text-muted">
                Macro analytics dashboard, attendance trends & role comparison
                for community organizers.
              </p>
            </div>

            {/* Refresh Button */}
            <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
              <button
                type="button"
                onClick={loadMetrics}
                className="text-caption-bold flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-hairline bg-canvas px-3.5 py-2 font-bold text-ink shadow-2xs transition hover:bg-surface-card sm:w-auto"
                title="Refresh Data"
              >
                <RefreshCwIcon
                  className={`size-4 ${isLoading ? "animate-spin text-[#1a3a3a]" : ""}`}
                />
                <span>Refresh Data</span>
              </button>
            </div>
          </div>

          {/* ── INTERACTIVE PERIOD & CATEGORY CONTROL PANEL ── */}
          <div className="flex flex-col gap-3.5 rounded-2xl border border-hairline bg-surface-soft p-3.5 shadow-xs sm:rounded-3xl sm:p-5">
            {/* Top Row: Dropdowns for Basis Waktu + Multi-Select Kategori Event + Multi-Select Comparison Dropdown */}
            <div className="flex flex-col items-stretch justify-between gap-2.5 border-b border-hairline pb-3.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:pb-4">
              <div className="flex w-full flex-col items-stretch gap-2.5 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
                {/* 1. Dropdown Basis Waktu */}
                <div className="text-caption-bold flex w-full items-center gap-1.5 rounded-xl border border-hairline bg-canvas px-3 py-2 font-bold text-ink shadow-2xs sm:w-auto">
                  <CalendarIcon className="size-4 shrink-0 text-[#1a3a3a]" />
                  <select
                    value={timeUnit}
                    onChange={(e) => setTimeUnit(e.target.value as TimeUnit)}
                    className="text-caption sm:text-caption-bold w-full cursor-pointer bg-transparent font-bold text-ink outline-none"
                  >
                    <option value="year">Scale: Yearly (12 Months)</option>
                    <option value="month">Scale: Monthly (Weekly)</option>
                  </select>
                </div>

                {/* 2. MULTI-SELECT KATEGORI EVENT DROPDOWN */}
                <div
                  className="relative w-full sm:w-auto"
                  ref={dropdownCategoryRef}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setIsCategorySelectOpen(!isCategorySelectOpen)
                    }
                    className={`text-caption-bold flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-3.5 py-2 shadow-2xs transition sm:w-auto sm:justify-start sm:px-4 ${
                      selectedCategories.length > 0 &&
                      !selectedCategories.includes("all")
                        ? "border border-[#1a3a3a] bg-[#1a3a3a] font-bold text-[#e8b94a] shadow-xs"
                        : "border border-hairline bg-canvas text-ink hover:bg-surface-card"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <TagIcon className="size-4 shrink-0 text-[#e8b94a]" />
                      <span className="truncate">
                        Category:{" "}
                        <strong className="font-extrabold">
                          {getCategoryDropdownLabel(selectedCategories)}
                        </strong>
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {selectedCategories.length > 1 &&
                        !selectedCategories.includes("all") && (
                          <span className="text-micro rounded-md bg-white/20 px-1.5 py-0.5 font-bold text-white">
                            {selectedCategories.length}
                          </span>
                        )}
                      <ChevronDownIcon className="size-4 opacity-70" />
                    </div>
                  </button>

                  {/* Dropdown Menu Popover with Checkboxes */}
                  {isCategorySelectOpen && (
                    <div className="animate-fadeIn absolute top-full right-0 left-0 z-30 mt-2 w-full space-y-1.5 rounded-2xl border border-hairline bg-canvas p-3 shadow-xl backdrop-blur-md sm:right-auto sm:w-72">
                      <div className="text-micro-bold border-b border-hairline px-2 pb-1 font-extrabold tracking-wider text-text-muted uppercase">
                        Select Event Categories:
                      </div>
                      {MASTER_EVENT_CATEGORIES.map((cat) => {
                        const isSelected =
                          cat.id === "all"
                            ? selectedCategories.includes("all") ||
                              selectedCategories.length === 5
                            : selectedCategories.includes(cat.id)

                        return (
                          <label
                            key={cat.id}
                            onClick={(e) => {
                              e.preventDefault()
                              toggleCategorySelection(cat.id)
                            }}
                            className="text-caption-bold flex cursor-pointer items-center justify-between rounded-xl px-2.5 py-2 text-ink transition select-none hover:bg-surface-soft"
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              <div
                                className={`flex size-4.5 shrink-0 items-center justify-center rounded-md border transition ${
                                  isSelected
                                    ? "border-[#1a3a3a] bg-[#1a3a3a] text-[#e8b94a]"
                                    : "border-hairline bg-surface-soft"
                                }`}
                              >
                                {isSelected && (
                                  <CheckIcon className="size-3 stroke-[3]" />
                                )}
                              </div>
                              <span className="truncate font-bold">
                                {cat.label}
                              </span>
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
                  className={`text-caption-bold flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-3.5 py-2 shadow-2xs transition sm:w-auto sm:justify-start sm:px-4 ${
                    selectedPeriods.length > 1
                      ? "border border-[#1a3a3a] bg-[#1a3a3a] font-bold text-[#e8b94a] shadow-xs"
                      : "border border-hairline bg-canvas text-ink hover:bg-surface-card"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <ArrowRightLeftIcon className="size-4 shrink-0" />
                    <span className="truncate">
                      Compare:{" "}
                      <strong className="font-extrabold">
                        {selectedPeriods.join(", ")}
                      </strong>
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {selectedPeriods.length > 1 && (
                      <span className="text-micro rounded-md bg-white/20 px-1.5 py-0.5 font-bold text-white">
                        {selectedPeriods.length}
                      </span>
                    )}
                    <ChevronDownIcon className="size-4 opacity-70" />
                  </div>
                </button>

                {/* Dropdown Menu Popover with Checkboxes */}
                {isMultiSelectOpen && (
                  <div className="animate-fadeIn absolute top-full right-0 left-0 z-30 mt-2 w-full space-y-1.5 rounded-2xl border border-hairline bg-canvas p-3 shadow-xl backdrop-blur-md sm:left-auto sm:w-64">
                    <div className="text-micro-bold border-b border-hairline px-2 pb-1 font-extrabold tracking-wider text-text-muted uppercase">
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
                          className="text-caption-bold flex cursor-pointer items-center justify-between rounded-xl px-2.5 py-2 text-ink transition select-none hover:bg-surface-soft"
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div
                              className={`flex size-4.5 shrink-0 items-center justify-center rounded-md border transition ${
                                isSelected
                                  ? "border-[#1a3a3a] bg-[#1a3a3a] text-[#e8b94a]"
                                  : "border-hairline bg-surface-soft"
                              }`}
                            >
                              {isSelected && (
                                <CheckIcon className="size-3 stroke-[3]" />
                              )}
                            </div>
                            <span className="truncate font-bold">
                              {periodKey}
                            </span>
                          </div>
                          {isSelected && (
                            <span
                              className="size-2.5 shrink-0 rounded-full"
                              style={{
                                backgroundColor:
                                  SERIES_COLORS[
                                    selectedPeriods.indexOf(periodKey) %
                                      SERIES_COLORS.length
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
            <div className="flex flex-col justify-between gap-3 pt-1 sm:flex-row sm:items-center">
              <div className="text-micro text-text-muted">
                {selectedPeriods.length > 1 ? (
                  <span className="font-semibold text-[#1a3a3a]">
                    *Comparing charts:{" "}
                    <strong>{selectedPeriods.join(" vs ")}</strong> (
                    {getCategoryDropdownLabel(selectedCategories)})
                  </span>
                ) : (
                  <span>
                    *Use dropdowns above to compare multiple periods & event
                    categories.
                  </span>
                )}
              </div>

              {/* Role Segment Tabs */}
              <div className="flex w-full scrollbar-none items-center gap-1.5 overflow-x-auto pb-1 sm:w-auto sm:pb-0">
                <span className="text-micro mr-1 shrink-0 font-extrabold tracking-wider text-text-muted uppercase">
                  Role:
                </span>
                {roleFilterTabs.map((tab) => (
                  <Chip
                    key={tab.id}
                    variant="filter"
                    selected={segmentFilter === tab.id}
                    onClick={() => setSegmentFilter(tab.id)}
                  >
                    {tab.label}
                  </Chip>
                ))}
              </div>
            </div>
          </div>

          {isLoading || !data ? (
            <div className="flex h-64 items-center justify-center rounded-3xl border border-hairline bg-surface-soft">
              <div className="flex flex-col items-center gap-2 text-text-muted">
                <RefreshCwIcon className="size-7 animate-spin text-[#1a3a3a]" />
                <p className="text-body-sm font-semibold">
                  Loading Member & Organizer insights...
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* ── 1. KPI STATS CARDS GRID ── */}
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
                {/* Card 1: Total Active Members */}
                <div className="flex flex-col justify-between rounded-2xl border border-hairline bg-surface-soft p-4 shadow-xs transition hover:shadow-md sm:p-4.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-caption font-medium text-text-muted">
                        Total Active Members
                      </p>
                      <h3 className="text-heading-4 sm:text-heading-3 mt-1 font-extrabold text-ink">
                        {data.summary.totalActiveMembers.value}
                      </h3>
                    </div>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[#1a3a3a] text-[#e8b94a] sm:size-10">
                      <UsersIcon className="size-4.5 sm:size-5" />
                    </span>
                  </div>
                  <div className="text-micro mt-3.5 flex items-center justify-between border-t border-hairline pt-2.5 sm:mt-4">
                    <span className="inline-flex items-center gap-0.5 rounded-lg bg-emerald-500/10 px-2 py-0.5 font-bold text-emerald-700">
                      {data.summary.totalActiveMembers.deltaText}
                    </span>
                    <span className="max-w-[130px] truncate text-text-muted">
                      {data.summary.totalActiveMembers.description}
                    </span>
                  </div>
                </div>

                {/* Card 2: Average Attendance Rate */}
                <div className="flex flex-col justify-between rounded-2xl border border-hairline bg-surface-soft p-4 shadow-xs transition hover:shadow-md sm:p-4.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-caption font-medium text-text-muted">
                        Avg Attendance Rate
                      </p>
                      <h3 className="text-heading-4 sm:text-heading-3 mt-1 font-extrabold text-ink">
                        {data.summary.avgAttendanceRate.value}
                      </h3>
                    </div>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-700 sm:size-10">
                      <TrendingUpIcon className="size-4.5 sm:size-5" />
                    </span>
                  </div>
                  <div className="text-micro mt-3.5 flex items-center justify-between border-t border-hairline pt-2.5 sm:mt-4">
                    <span className="inline-flex items-center gap-0.5 rounded-lg bg-emerald-500/10 px-2 py-0.5 font-bold text-emerald-700">
                      {data.summary.avgAttendanceRate.deltaText}
                    </span>
                    <span className="max-w-[130px] truncate text-text-muted">
                      {data.summary.avgAttendanceRate.description}
                    </span>
                  </div>
                </div>

                {/* Card 3: Routine Retention Rate */}
                <div className="flex flex-col justify-between rounded-2xl border border-hairline bg-surface-soft p-4 shadow-xs transition hover:shadow-md sm:p-4.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-caption font-medium text-text-muted">
                        Routine Retention Rate
                      </p>
                      <h3 className="text-heading-4 sm:text-heading-3 mt-1 font-extrabold text-ink">
                        {data.summary.retentionRate.value}
                      </h3>
                    </div>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-700 sm:size-10">
                      <ShieldCheckIcon className="size-4.5 sm:size-5" />
                    </span>
                  </div>
                  <div className="text-micro mt-3.5 flex items-center justify-between border-t border-hairline pt-2.5 sm:mt-4">
                    <span className="inline-flex items-center gap-0.5 rounded-lg bg-emerald-500/10 px-2 py-0.5 font-bold text-emerald-700">
                      {data.summary.retentionRate.deltaText}
                    </span>
                    <span className="max-w-[130px] truncate text-text-muted">
                      {data.summary.retentionRate.description}
                    </span>
                  </div>
                </div>

                {/* Card 4: Total Seva Duty Sessions */}
                <div className="flex flex-col justify-between rounded-2xl border border-hairline bg-surface-soft p-4 shadow-xs transition hover:shadow-md sm:p-4.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-caption font-medium text-text-muted">
                        Total Seva Duties
                      </p>
                      <h3 className="text-heading-4 sm:text-heading-3 mt-1 font-extrabold text-ink">
                        {data.summary.totalSevaSessions?.value ?? 0}
                      </h3>
                    </div>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-700 sm:size-10">
                      <AwardIcon className="size-4.5 sm:size-5" />
                    </span>
                  </div>
                  <div className="text-micro mt-3.5 flex items-center justify-between border-t border-hairline pt-2.5 sm:mt-4">
                    <span className="inline-flex items-center gap-0.5 rounded-lg bg-emerald-500/10 px-2 py-0.5 font-bold text-emerald-700">
                      {data.summary.totalSevaSessions?.deltaText ?? "+0%"}
                    </span>
                    <span className="max-w-[130px] truncate text-text-muted">
                      {data.summary.totalSevaSessions?.description ??
                        "Active volunteer duties"}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── 2. SHADCN RECHARTS ANALYTICAL CHART CARD (Multi-Select Comparison Support) ── */}
              <Card className="overflow-hidden p-0">
                <CardHeader className="flex flex-col gap-3 p-4 pb-2 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                  <div className="space-y-1">
                    <CardTitle className="text-body-sm sm:text-body-sm-medium flex flex-wrap items-center gap-2 font-bold text-ink">
                      <span>Community Attendance Trend</span>
                      <span className="text-micro-bold rounded-lg bg-amber-500/10 px-2 py-0.5 font-bold text-amber-800">
                        {data.categoryLabel}
                      </span>
                      <span className="text-micro-bold rounded-lg bg-[#1a3a3a] px-2 py-0.5 text-[#e8b94a]">
                        {selectedPeriods.join(" vs ")}
                      </span>
                    </CardTitle>
                    <CardDescription className="text-caption text-text-muted">
                      {timeUnit === "year"
                        ? `12-month attendance trend (January - December) by active period comparison.`
                        : `Weekly attendance trend by active period comparison.`}
                    </CardDescription>
                  </div>

                  <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:justify-end">
                    {/* Dynamic Legend for Active Periods */}
                    <div className="text-micro flex flex-wrap items-center gap-2.5 font-bold">
                      {selectedPeriods.map((periodKey, idx) => {
                        const color = SERIES_COLORS[idx % SERIES_COLORS.length]
                        return (
                          <div
                            key={periodKey}
                            className="flex items-center gap-1.5"
                          >
                            <span
                              className="size-2.5 shrink-0 rounded-full sm:size-3"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-ink">{periodKey}</span>
                          </div>
                        )
                      })}
                    </div>

                    {/* Chart Type Switcher */}
                    <div className="flex items-center rounded-xl border border-hairline bg-surface-soft p-1 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setChartType("line")}
                        className={`text-caption-bold flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1 transition ${
                          chartType === "line"
                            ? "bg-primary font-bold text-primary-foreground shadow-2xs"
                            : "text-text-muted hover:text-ink"
                        }`}
                        title="Line Chart View"
                      >
                        <LineChartIcon className="size-3.5 sm:size-4" />
                        <span className="text-micro font-bold">Line</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setChartType("bar")}
                        className={`text-caption-bold flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1 transition ${
                          chartType === "bar"
                            ? "bg-primary font-bold text-primary-foreground shadow-2xs"
                            : "text-text-muted hover:text-ink"
                        }`}
                        title="Bar Chart View"
                      >
                        <BarChart3Icon className="size-3.5 sm:size-4" />
                        <span className="text-micro font-bold">Bar</span>
                      </button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-2 pt-2 sm:p-6">
                  {chartType === "line" ? (
                    <ChartContainer
                      config={chartConfig}
                      className="h-60 w-full sm:h-72"
                    >
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
                        <CartesianGrid
                          vertical={false}
                          strokeDasharray="4 4"
                          stroke="#E2E8F0"
                        />
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
                          const color =
                            SERIES_COLORS[idx % SERIES_COLORS.length]
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
                    <ChartContainer
                      config={chartConfig}
                      className="h-60 w-full sm:h-72"
                    >
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
                        <CartesianGrid
                          vertical={false}
                          strokeDasharray="4 4"
                          stroke="#E2E8F0"
                        />
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
                          content={<ChartTooltipContent />}
                        />
                        {selectedPeriods.map((periodKey, idx) => {
                          const color =
                            SERIES_COLORS[idx % SERIES_COLORS.length]
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

              {/* ── 3. SEGMENT ANALYTICS: PERBANDINGAN ROLE UMAT, AKTIVIS, & PENGURUS ── */}
              <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-3">
                {/* 1. ROLE UMAT Card */}
                <div className="space-y-3 rounded-2xl border border-hairline bg-surface-soft p-4 shadow-xs sm:rounded-3xl sm:p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-caption-bold rounded-md bg-[#1a3a3a] px-2.5 py-1 font-extrabold text-[#e8b94a]">
                      ROLE MEMBERS
                    </span>
                    <span className="text-caption-bold font-extrabold text-ink">
                      {data.roleComparison.umat.totalCount} People
                    </span>
                  </div>
                  <div className="text-micro space-y-2 border-t border-hairline pt-2 text-text-muted">
                    <div className="flex justify-between">
                      <span>Avg Attendance:</span>
                      <strong className="text-ink">
                        {data.roleComparison.umat.avgAttendancePercent}%
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg Absence:</span>
                      <strong className="font-bold text-amber-700">
                        {data.roleComparison.umat.avgAbsenceRate}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Events / Month:</span>
                      <strong className="text-ink">
                        {data.roleComparison.umat.avgMonthlyEvents}x Events
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Attendance Streak:</span>
                      <strong className="font-bold text-emerald-700">
                        {data.roleComparison.umat.topStreak}x Weeks
                      </strong>
                    </div>
                  </div>
                </div>

                {/* 2. ROLE AKTIVIS Card */}
                <div className="space-y-3 rounded-2xl border border-hairline bg-surface-soft p-4 shadow-xs sm:rounded-3xl sm:p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-caption-bold rounded-md bg-amber-500/15 px-2.5 py-1 font-extrabold text-amber-800">
                      ROLE ACTIVISTS
                    </span>
                    <span className="text-caption-bold font-extrabold text-ink">
                      {data.roleComparison.aktivis.totalCount} People
                    </span>
                  </div>
                  <div className="text-micro space-y-2 border-t border-hairline pt-2 text-text-muted">
                    <div className="flex justify-between">
                      <span>Avg Attendance:</span>
                      <strong className="text-ink">
                        {data.roleComparison.aktivis.avgAttendancePercent}%
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg Absence:</span>
                      <strong className="font-bold text-amber-700">
                        {data.roleComparison.aktivis.avgAbsenceRate}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Events / Month:</span>
                      <strong className="text-ink">
                        {data.roleComparison.aktivis.avgMonthlyEvents}x Events
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Attendance Streak:</span>
                      <strong className="font-bold text-emerald-700">
                        {data.roleComparison.aktivis.topStreak}x Weeks
                      </strong>
                    </div>
                  </div>
                </div>

                {/* 3. ROLE PENGURUS Card */}
                <div className="space-y-3 rounded-2xl border border-purple-500/30 bg-purple-500/5 p-4 shadow-xs sm:rounded-3xl sm:p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-caption-bold rounded-md bg-purple-500/20 px-2.5 py-1 font-extrabold text-purple-800">
                      ROLE ORGANIZERS
                    </span>
                    <span className="text-caption-bold font-extrabold text-ink">
                      {data.roleComparison.pengurus.totalCount} People
                    </span>
                  </div>
                  <div className="text-micro space-y-2 border-t border-purple-500/20 pt-2 text-text-muted">
                    <div className="flex justify-between">
                      <span>Avg Attendance:</span>
                      <strong className="text-ink">
                        {data.roleComparison.pengurus.avgAttendancePercent}%
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg Absence:</span>
                      <strong className="font-bold text-emerald-700">
                        {data.roleComparison.pengurus.avgAbsenceRate}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Events / Month:</span>
                      <strong className="text-ink">
                        {data.roleComparison.pengurus.avgMonthlyEvents}x Events
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Attendance Streak:</span>
                      <strong className="font-bold text-purple-800">
                        {data.roleComparison.pengurus.topStreak}x Weeks
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── 5. EVENT CATEGORY BREAKDOWN ── */}
              <div className="space-y-3.5 rounded-2xl border border-hairline bg-surface-soft p-4 shadow-xs sm:space-y-4 sm:rounded-3xl sm:p-6">
                <h2 className="text-caption-bold sm:text-body-sm-medium flex items-center gap-2 font-bold text-ink">
                  <CalendarIcon className="size-4 text-[#1a3a3a]" />
                  <span>Attendance & Absence Rate by Event Category</span>
                </h2>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                  {data.eventCategories.map((cat, i) => (
                    <div
                      key={i}
                      className="space-y-1.5 rounded-2xl border border-hairline bg-canvas p-3 sm:p-3.5"
                    >
                      <div className="text-micro flex items-center justify-between font-bold">
                        <span className="max-w-[180px] truncate text-ink">
                          {cat.categoryName} ({cat.eventCount}x Events)
                        </span>
                        <span className="shrink-0 text-text-muted">
                          Avg {cat.avgAttendance} Attended
                        </span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full border border-hairline bg-surface-soft">
                        <div
                          style={{
                            width: `${Math.min(100, Math.round((cat.avgAttendance / 180) * 100))}%`,
                          }}
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
