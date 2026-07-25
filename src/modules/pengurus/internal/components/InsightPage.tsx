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
import { CartesianGrid, Dot, Line, LineChart, BarChart, Bar, XAxis } from "recharts"
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
      : ["Juli 2026", "Juni 2026", "Mei 2026", "Maret 2026"]

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
      setSelectedPeriods(["Juli 2026"])
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
      return "Semua Kategori Event"
    }
    if (cats.length === 1) {
      const found = MASTER_EVENT_CATEGORIES.find((c) => c.id === cats[0])
      return found ? found.label : "1 Kategori"
    }
    return `${cats.length} Kategori Event`
  }

  const loadMetrics = async () => {
    setIsLoading(true)
    try {
      const res = await fetchInsightMetricsParams({
        timeUnit,
        primaryYear: 2026,
        primaryMonth: 7,
        isComparisonEnabled: selectedPeriods.length > 1,
        compareYear: 2025,
        compareMonth: 3,
        segmentFilter,
        selectedCategories,
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
      <PageBreadcrumb items={[{ label: "Pengurus" }, { label: "Insight" }]} />

      <div className="px-4 py-6 md:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header Banner */}
          <div className="flex flex-col gap-4 rounded-3xl border border-sekkha-hairline-soft bg-gradient-to-br from-sekkha-canvas via-sekkha-surface to-sekkha-canvas p-5 sm:p-6 shadow-2xs md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-xl bg-sekkha-brand-blue/10 text-sekkha-brand-blue">
                  <BarChart3Icon className="size-5" />
                </span>
                <h1 className="text-heading-4 font-bold text-sekkha-ink">Insight</h1>
              </div>
              <p className="text-body-sm text-sekkha-slate max-w-2xl">
                Dashboard analitis makro interaktif. Memantau tingkat presensi dan rata-rata absensi Umat, Aktivis, serta Pengurus Vihara per event.
              </p>
            </div>

            {/* Refresh Button */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={loadMetrics}
                className="flex items-center gap-2 rounded-xl border border-sekkha-hairline-soft bg-sekkha-surface px-3 py-2 text-caption-bold font-bold text-sekkha-ink hover:bg-sekkha-hairline-soft transition cursor-pointer shadow-2xs"
                title="Refresh Data"
              >
                <RefreshCwIcon className={`size-4 ${isLoading ? "animate-spin text-sekkha-brand-blue" : ""}`} />
                <span>Refresh Data</span>
              </button>
            </div>
          </div>

          {/* ── INTERACTIVE PERIOD & CATEGORY CONTROL PANEL ── */}
          <div className="flex flex-col gap-4 rounded-3xl border border-sekkha-hairline-soft bg-sekkha-canvas p-4 sm:p-5 shadow-xs">
            {/* Top Row: Dropdowns for Basis Waktu + Multi-Select Kategori Event + Multi-Select Comparison Dropdown */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sekkha-hairline-soft pb-4">
              <div className="flex flex-wrap items-center gap-2.5">
                {/* 1. Dropdown Basis Waktu */}
                <div className="flex items-center gap-1.5 rounded-xl border border-sekkha-hairline-soft bg-sekkha-surface px-3 py-2 text-caption-bold font-bold text-sekkha-ink shadow-2xs">
                  <CalendarIcon className="size-4 text-sekkha-brand-blue" />
                  <select
                    value={timeUnit}
                    onChange={(e) => setTimeUnit(e.target.value as TimeUnit)}
                    className="bg-transparent font-bold text-sekkha-ink outline-none cursor-pointer"
                  >
                    <option value="year">Basis Waktu: Per Tahun (12 Bulan)</option>
                    <option value="month">Basis Waktu: Per Bulan (Per Minggu)</option>
                  </select>
                </div>

                {/* 2. MULTI-SELECT KATEGORI EVENT DROPDOWN */}
                <div className="relative" ref={dropdownCategoryRef}>
                  <button
                    type="button"
                    onClick={() => setIsCategorySelectOpen(!isCategorySelectOpen)}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-caption-bold transition cursor-pointer shadow-2xs ${
                      selectedCategories.length > 0 && !selectedCategories.includes("all")
                        ? "border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold shadow-xs"
                        : "border border-sekkha-hairline-soft bg-sekkha-surface text-sekkha-ink hover:bg-sekkha-hairline-soft"
                    }`}
                  >
                    <TagIcon className="size-4 text-amber-500" />
                    <span>
                      Kategori:{" "}
                      <strong className="font-extrabold">
                        {getCategoryDropdownLabel(selectedCategories)}
                      </strong>
                    </span>
                    {selectedCategories.length > 1 && !selectedCategories.includes("all") && (
                      <span className="rounded-md bg-amber-500/20 px-1.5 py-0.5 text-micro font-bold text-amber-800 dark:text-amber-300">
                        {selectedCategories.length} Aktif
                      </span>
                    )}
                    <ChevronDownIcon className="size-4 opacity-70 ml-1" />
                  </button>

                  {/* Dropdown Menu Popover with Checkboxes */}
                  {isCategorySelectOpen && (
                    <div className="absolute left-0 top-full mt-2 w-72 rounded-2xl border border-sekkha-hairline-soft bg-white p-3 shadow-xl backdrop-blur-md z-30 space-y-1.5 animate-fadeIn">
                      <div className="text-micro-bold font-extrabold text-sekkha-slate uppercase tracking-wider px-2 pb-1 border-b border-sekkha-hairline-soft">
                        Pilih Kategori Event:
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
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`flex size-4.5 items-center justify-center rounded-md border transition ${
                                  isSelected
                                    ? "border-amber-500 bg-amber-500 text-white"
                                    : "border-sekkha-hairline-soft bg-sekkha-canvas"
                                }`}
                              >
                                {isSelected && <CheckIcon className="size-3 stroke-[3]" />}
                              </div>
                              <span className="font-bold">{cat.label}</span>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* 3. MULTI-SELECT BANDINGKAN PERIODE DROPDOWN */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsMultiSelectOpen(!isMultiSelectOpen)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-caption-bold transition cursor-pointer shadow-2xs ${
                    selectedPeriods.length > 1
                      ? "bg-sekkha-brand-blue font-bold text-white shadow-xs"
                      : "border border-sekkha-hairline-soft bg-sekkha-surface text-sekkha-ink hover:bg-sekkha-hairline-soft"
                  }`}
                >
                  <ArrowRightLeftIcon className="size-4" />
                  <span>
                    Bandingkan Periode:{" "}
                    <strong className="font-extrabold">
                      {selectedPeriods.join(", ")}
                    </strong>
                  </span>
                  {selectedPeriods.length > 1 && (
                    <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-micro font-bold">
                      {selectedPeriods.length} Aktif
                    </span>
                  )}
                  <ChevronDownIcon className="size-4 opacity-70 ml-1" />
                </button>

                {/* Dropdown Menu Popover with Checkboxes */}
                {isMultiSelectOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-sekkha-hairline-soft bg-white p-3 shadow-xl backdrop-blur-md z-30 space-y-1.5 animate-fadeIn">
                    <div className="text-micro-bold font-extrabold text-sekkha-slate uppercase tracking-wider px-2 pb-1 border-b border-sekkha-hairline-soft">
                      Pilih Periode Aktif:
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
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`flex size-4.5 items-center justify-center rounded-md border transition ${
                                isSelected
                                  ? "border-sekkha-brand-blue bg-sekkha-brand-blue text-white"
                                  : "border-sekkha-hairline-soft bg-sekkha-canvas"
                              }`}
                            >
                              {isSelected && <CheckIcon className="size-3 stroke-[3]" />}
                            </div>
                            <span className="font-bold">{periodKey}</span>
                          </div>
                          {isSelected && (
                            <span
                              className="size-2.5 rounded-full"
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
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="text-micro text-sekkha-slate">
                {selectedPeriods.length > 1 ? (
                  <span className="font-semibold text-sekkha-brand-blue">
                    *Membandingkan data grafik aktif: <strong>{selectedPeriods.join(" vs ")}</strong> ({getCategoryDropdownLabel(selectedCategories)})
                  </span>
                ) : (
                  <span>*Gunakan dropdown multi-select untuk memilih beberapa periode & kategori event sekaligus.</span>
                )}
              </div>

              {/* Role Segment Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <span className="text-micro font-extrabold uppercase tracking-wider text-sekkha-slate mr-1">Segmen Role:</span>
                {[
                  { id: "all", label: "Semua (260)" },
                  { id: "umat", label: "Role Umat (210)" },
                  { id: "aktivis", label: "Role Aktivis (38)" },
                  { id: "pengurus", label: "Role Pengurus (12)" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSegmentFilter(tab.id as RoleSegmentFilter)}
                    className={`rounded-lg px-3 py-1 text-micro-bold font-bold transition cursor-pointer shrink-0 ${
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
                <p className="text-body-sm font-semibold">Memuat data insight Umat & Pengurus...</p>
              </div>
            </div>
          ) : (
            <>
              {/* ── 1. KPI STATS CARDS GRID ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: Total Active Members */}
                <div className="flex flex-col justify-between rounded-2xl border border-sekkha-hairline-soft bg-sekkha-canvas p-4.5 shadow-xs transition hover:shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-caption text-sekkha-slate font-medium">Total Member Aktif</p>
                      <h3 className="mt-1 text-heading-3 font-extrabold text-sekkha-ink">
                        {data.summary.totalActiveMembers.value}
                      </h3>
                    </div>
                    <span className="flex size-10 items-center justify-center rounded-2xl bg-blue-500/10 text-sekkha-brand-blue">
                      <UsersIcon className="size-5" />
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-sekkha-hairline-soft/80 pt-2.5 text-micro">
                    <span className="inline-flex items-center gap-0.5 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                      {data.summary.totalActiveMembers.deltaText}
                    </span>
                    <span className="text-sekkha-slate truncate max-w-[130px]">{data.summary.totalActiveMembers.description}</span>
                  </div>
                </div>

                {/* Card 2: Rata-rata Kehadiran Bulan Ini */}
                <div className="flex flex-col justify-between rounded-2xl border border-sekkha-hairline-soft bg-sekkha-canvas p-4.5 shadow-xs transition hover:shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-caption text-sekkha-slate font-medium">Rata-rata Kehadiran Bulan Ini</p>
                      <h3 className="mt-1 text-heading-3 font-extrabold text-sekkha-ink">
                        {data.summary.avgAttendanceRate.value}
                      </h3>
                    </div>
                    <span className="flex size-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                      <TrendingUpIcon className="size-5" />
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-sekkha-hairline-soft/80 pt-2.5 text-micro">
                    <span className="inline-flex items-center gap-0.5 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                      {data.summary.avgAttendanceRate.deltaText}
                    </span>
                    <span className="text-sekkha-slate truncate max-w-[130px]">{data.summary.avgAttendanceRate.description}</span>
                  </div>
                </div>

                {/* Card 3: Tingkat Keaktifan Rutin */}
                <div className="flex flex-col justify-between rounded-2xl border border-sekkha-hairline-soft bg-sekkha-canvas p-4.5 shadow-xs transition hover:shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-caption text-sekkha-slate font-medium">Tingkat Keaktifan Rutin</p>
                      <h3 className="mt-1 text-heading-3 font-extrabold text-sekkha-ink">
                        {data.summary.retentionRate.value}
                      </h3>
                    </div>
                    <span className="flex size-10 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600">
                      <ShieldCheckIcon className="size-5" />
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-sekkha-hairline-soft/80 pt-2.5 text-micro">
                    <span className="inline-flex items-center gap-0.5 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                      {data.summary.retentionRate.deltaText}
                    </span>
                    <span className="text-sekkha-slate truncate max-w-[130px]">{data.summary.retentionRate.description}</span>
                  </div>
                </div>

                {/* Card 4: Silent-Churn At-Risk Members */}
                <div className="flex flex-col justify-between rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4.5 shadow-xs transition hover:shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-caption text-rose-700 dark:text-rose-400 font-semibold">Member Butuh Sapa (Risk)</p>
                      <h3 className="mt-1 text-heading-3 font-extrabold text-rose-700 dark:text-rose-400">
                        {data.summary.atRiskMembersCount.value} <span className="text-caption font-normal text-rose-600">Orang</span>
                      </h3>
                    </div>
                    <span className="flex size-10 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-600">
                      <AlertTriangleIcon className="size-5" />
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-rose-500/20 pt-2.5 text-micro">
                    <span className="inline-flex items-center gap-0.5 font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                      {data.summary.atRiskMembersCount.deltaText}
                    </span>
                    <span className="text-rose-700/80 dark:text-rose-400/80 truncate">{data.summary.atRiskMembersCount.description}</span>
                  </div>
                </div>
              </div>

              {/* ── 2. SHADCN RECHARTS ANALYTICAL CHART CARD (Multi-Select Comparison Support) ── */}
              <Card>
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-body-sm-medium font-bold text-sekkha-ink flex items-center gap-2 flex-wrap">
                      <span>Tren Presensi Komunitas</span>
                      <span className="rounded-lg bg-amber-500/10 px-2 py-0.5 text-micro-bold font-bold text-amber-700 dark:text-amber-400">
                        {data.categoryLabel}
                      </span>
                      <span className="rounded-lg bg-sekkha-brand-blue/10 px-2 py-0.5 text-micro-bold text-sekkha-brand-blue">
                        {selectedPeriods.join(" vs ")}
                      </span>
                    </CardTitle>
                    <CardDescription className="text-caption text-sekkha-slate">
                      {timeUnit === "year"
                        ? `Tren presensi 12 bulan (Januari - Desember) per perbandingan periode aktif.`
                        : `Tren presensi mingguan per perbandingan periode aktif.`}
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Chart Type Switcher */}
                    <div className="flex items-center rounded-xl border border-sekkha-hairline-soft bg-sekkha-surface p-1 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setChartType("line")}
                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-caption-bold transition cursor-pointer ${
                          chartType === "line"
                            ? "bg-white font-bold text-sekkha-ink shadow-2xs"
                            : "text-sekkha-slate hover:text-sekkha-ink"
                        }`}
                        title="Tampilan Line Chart (Grafik Garis)"
                      >
                        <LineChartIcon className="size-4" />
                        <span className="text-micro font-bold">Line</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setChartType("bar")}
                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-caption-bold transition cursor-pointer ${
                          chartType === "bar"
                            ? "bg-white font-bold text-sekkha-ink shadow-2xs"
                            : "text-sekkha-slate hover:text-sekkha-ink"
                        }`}
                        title="Tampilan Bar Chart (Grafik Batang)"
                      >
                        <BarChart3Icon className="size-4" />
                        <span className="text-micro font-bold">Bar</span>
                      </button>
                    </div>

                    {/* Dynamic Legend for Active Periods */}
                    <div className="hidden sm:flex items-center gap-3 text-micro font-bold">
                      {selectedPeriods.map((periodKey, idx) => {
                        const color = SERIES_COLORS[idx % SERIES_COLORS.length]
                        return (
                          <div key={periodKey} className="flex items-center gap-1.5">
                            <span
                              className="size-3 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-sekkha-ink">{periodKey}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-4">
                  {chartType === "line" ? (
                    <ChartContainer config={chartConfig} className="h-72 w-full">
                      <LineChart
                        accessibilityLayer
                        data={data.trendChartData}
                        margin={{
                          top: 24,
                          left: 12,
                          right: 12,
                          bottom: 12,
                        }}
                      >
                        <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#E2E8F0" />
                        <XAxis
                          dataKey="label"
                          tickLine={false}
                          tickMargin={10}
                          axisLine={false}
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
                                  r={idx === 0 ? 5 : 4}
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
                    <ChartContainer config={chartConfig} className="h-72 w-full">
                      <BarChart
                        accessibilityLayer
                        data={data.trendChartData}
                        margin={{
                          top: 24,
                          left: 12,
                          right: 12,
                          bottom: 12,
                        }}
                      >
                        <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#E2E8F0" />
                        <XAxis
                          dataKey="label"
                          tickLine={false}
                          tickMargin={10}
                          axisLine={false}
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
                              radius={8}
                            />
                          )
                        })}
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>

              {/* ── 3. STRATEGIC INTEGRATION WIDGET: SILENT-CHURN HEALTH OVERVIEW ── */}
              <div className="rounded-3xl border border-sekkha-brand-blue/20 bg-gradient-to-br from-sekkha-brand-blue/5 via-sekkha-canvas to-sekkha-surface p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="flex size-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600">
                        <AlertTriangleIcon className="size-4" />
                      </span>
                      <h2 className="text-body-sm-medium font-bold text-sekkha-ink">
                        Distribusi Kesehatan Komunitas (Silent-Churn Health)
                      </h2>
                    </div>
                    <p className="text-caption text-sekkha-slate max-w-xl">
                      Integrasi data makro dengan <strong>Silent-Churn Alert</strong>. Memantau segmentasi keaktifan Umat untuk mencegah kepasifan berkepanjangan.
                    </p>
                  </div>

                  {/* Direct Link to /recency-alerts */}
                  <Link
                    to="/recency-alerts"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-sekkha-brand-blue px-4 py-2.5 text-caption-bold font-bold text-white shadow-xs transition hover:bg-blue-600 active:scale-95 shrink-0 cursor-pointer"
                  >
                    <span>Kelola di Silent-Churn Alert</span>
                    <ChevronRightIcon className="size-4" />
                  </Link>
                </div>

                {/* Combined Progress Bar */}
                <div className="space-y-2">
                  <div className="flex h-4 w-full overflow-hidden rounded-full bg-sekkha-surface border border-sekkha-hairline-soft p-0.5">
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
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 pt-1 text-micro">
                    <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 font-bold text-emerald-700 dark:text-emerald-400">
                      <span>🟢 Normal</span>
                      <span>{data.silentChurnHealth.normalCount} ({data.silentChurnHealth.normalPercent}%)</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 font-bold text-amber-700 dark:text-amber-400">
                      <span>🟡 Warning</span>
                      <span>{data.silentChurnHealth.warningCount} ({data.silentChurnHealth.warningPercent}%)</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-orange-500/20 bg-orange-500/10 px-3 py-2 font-bold text-orange-700 dark:text-orange-400">
                      <span>🟠 At Risk</span>
                      <span>{data.silentChurnHealth.atRiskCount} ({data.silentChurnHealth.atRiskPercent}%)</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 font-bold text-rose-700 dark:text-rose-400">
                      <span>🔴 Lost</span>
                      <span>{data.silentChurnHealth.lostCount} ({data.silentChurnHealth.lostPercent}%)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── 4. SEGMENT ANALYTICS: PERBANDINGAN ROLE UMAT, AKTIVIS, & PENGURUS ── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* 1. ROLE UMAT Card */}
                <div className="rounded-3xl border border-sekkha-hairline-soft bg-sekkha-canvas p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-sekkha-brand-blue/10 px-2.5 py-1 text-caption-bold font-extrabold text-sekkha-brand-blue">
                      ROLE UMAT
                    </span>
                    <span className="text-caption-bold font-extrabold text-sekkha-ink">
                      {data.roleComparison.umat.totalCount} Orang
                    </span>
                  </div>
                  <div className="space-y-2 text-micro text-sekkha-slate pt-2 border-t border-sekkha-hairline-soft">
                    <div className="flex justify-between">
                      <span>Rata-rata Presensi:</span>
                      <strong className="text-sekkha-ink">{data.roleComparison.umat.avgAttendancePercent}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Rata-rata Absensi:</span>
                      <strong className="text-amber-600 font-bold">{data.roleComparison.umat.avgAbsenceRate}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Event / Bulan:</span>
                      <strong className="text-sekkha-ink">{data.roleComparison.umat.avgMonthlyEvents}x Event</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Streak Presensi:</span>
                      <strong className="text-emerald-600 font-bold">{data.roleComparison.umat.topStreak}x Minggu</strong>
                    </div>
                  </div>
                </div>

                {/* 2. ROLE AKTIVIS Card */}
                <div className="rounded-3xl border border-sekkha-hairline-soft bg-sekkha-canvas p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-amber-500/10 px-2.5 py-1 text-caption-bold font-extrabold text-amber-600">
                      ROLE AKTIVIS
                    </span>
                    <span className="text-caption-bold font-extrabold text-sekkha-ink">
                      {data.roleComparison.aktivis.totalCount} Orang
                    </span>
                  </div>
                  <div className="space-y-2 text-micro text-sekkha-slate pt-2 border-t border-sekkha-hairline-soft">
                    <div className="flex justify-between">
                      <span>Rata-rata Presensi:</span>
                      <strong className="text-sekkha-ink">{data.roleComparison.aktivis.avgAttendancePercent}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Rata-rata Absensi:</span>
                      <strong className="text-amber-600 font-bold">{data.roleComparison.aktivis.avgAbsenceRate}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Event / Bulan:</span>
                      <strong className="text-sekkha-ink">{data.roleComparison.aktivis.avgMonthlyEvents}x Event</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Streak Presensi:</span>
                      <strong className="text-emerald-600 font-bold">{data.roleComparison.aktivis.topStreak}x Minggu</strong>
                    </div>
                  </div>
                </div>

                {/* 3. ROLE PENGURUS Card */}
                <div className="rounded-3xl border border-purple-500/30 bg-purple-500/5 p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-purple-500/20 px-2.5 py-1 text-caption-bold font-extrabold text-purple-700 dark:text-purple-400">
                      ROLE PENGURUS
                    </span>
                    <span className="text-caption-bold font-extrabold text-sekkha-ink">
                      {data.roleComparison.pengurus.totalCount} Orang
                    </span>
                  </div>
                  <div className="space-y-2 text-micro text-sekkha-slate pt-2 border-t border-purple-500/20">
                    <div className="flex justify-between">
                      <span>Rata-rata Presensi:</span>
                      <strong className="text-sekkha-ink">{data.roleComparison.pengurus.avgAttendancePercent}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Rata-rata Absensi:</span>
                      <strong className="text-emerald-600 font-bold">{data.roleComparison.pengurus.avgAbsenceRate}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Event / Bulan:</span>
                      <strong className="text-sekkha-ink">{data.roleComparison.pengurus.avgMonthlyEvents}x Event</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Streak Presensi:</span>
                      <strong className="text-purple-700 dark:text-purple-400 font-bold">{data.roleComparison.pengurus.topStreak}x Minggu</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── 5. EVENT CATEGORY BREAKDOWN ── */}
              <div className="rounded-3xl border border-sekkha-hairline-soft bg-sekkha-canvas p-5 sm:p-6 shadow-xs space-y-4">
                <h2 className="text-body-sm-medium font-bold text-sekkha-ink flex items-center gap-2">
                  <CalendarIcon className="size-4 text-sekkha-brand-blue" />
                  <span>Tingkat Presensi & Absensi per Kategori Event</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {data.eventCategories.map((cat, i) => (
                    <div key={i} className="space-y-1.5 rounded-2xl border border-sekkha-hairline-soft bg-sekkha-surface p-3.5">
                      <div className="flex items-center justify-between text-micro font-bold">
                        <span className="text-sekkha-ink">{cat.categoryName} ({cat.eventCount}x Event)</span>
                        <span className="text-sekkha-slate">Rata-rata {cat.avgAttendance} Hadir</span>
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
