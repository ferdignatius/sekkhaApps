import { useEffect, useState } from "react"
import {
  SearchIcon,
  RefreshCwIcon,
  UserXIcon,
  UserCheckIcon,
  ArrowUpDownIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  XIcon,
  MessageCircleIcon,
  CalendarIcon,
  WrenchIcon,
  ExternalLinkIcon,
  SaveIcon,
  CheckCircle2Icon,
  LayoutGridIcon,
  ListIcon,
} from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import {
  fetchRecencyAlerts,
  fetchMemberRecencyDetail,
  type MemberRecency,
  type RecencySummary,
  type AlertLevel,
  type MemberDetailResponse,
} from "../api/recencyApi"

// ─── Streamlined Alert Level Design Tokens ────────────────────────────────────

interface TierDesign {
  label: string
  shortLabel: string
  badgeBg: string
  cardBorder: string
  cardHoverBorder: string
  dotColor: string
  desc: string
  recommendation: string
}

const LEVEL_CONFIG: Record<AlertLevel, TierDesign> = {
  normal: {
    label: "Normal",
    shortLabel: "🟢 Normal",
    badgeBg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    cardBorder: "border-sekkha-hairline-soft",
    cardHoverBorder: "hover:border-emerald-400/60",
    dotColor: "bg-emerald-500",
    desc: "Presensi aktif & lancar (absen < 2 event)",
    recommendation: "Apresiasi keaktifan member secara berkala.",
  },
  mulai_jarang: {
    label: "Warning",
    shortLabel: "🟡 Warning",
    badgeBg: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
    cardBorder: "border-amber-200 dark:border-amber-900/40",
    cardHoverBorder: "hover:border-amber-400/80",
    dotColor: "bg-amber-500",
    desc: "Absen 2 event berturut-turut",
    recommendation: "Kirim pengingat ramah untuk event rutin berikutnya.",
  },
  at_risk: {
    label: "At Risk",
    shortLabel: "🟠 At Risk",
    badgeBg: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30",
    cardBorder: "border-orange-200 dark:border-orange-900/40",
    cardHoverBorder: "hover:border-orange-400/80",
    dotColor: "bg-orange-500",
    desc: "Absen 3 event berturut-turut",
    recommendation: "Tanyakan kabar personal untuk mengidentifikasi kendala member.",
  },
  kemungkinan_hilang: {
    label: "Lost",
    shortLabel: "🔴 Lost",
    badgeBg: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30",
    cardBorder: "border-rose-200 dark:border-rose-900/40",
    cardHoverBorder: "hover:border-rose-400/80",
    dotColor: "bg-rose-500",
    desc: "Absen 4+ event berturut-turut",
    recommendation: "Kontak langsung oleh pengurus atau jadwalkan kunjungan perhatian.",
  },
  churned: {
    label: "Lost",
    shortLabel: "🔴 Lost",
    badgeBg: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30",
    cardBorder: "border-rose-200 dark:border-rose-900/40",
    cardHoverBorder: "hover:border-rose-400/80",
    dotColor: "bg-rose-500",
    desc: "Absen > 60 hari berturut-turut tanpa kabar",
    recommendation: "Lakukan tindakan pengjangkauan khusus sebelum member hilang total.",
  },
}

const ACTION_STATUS_OPTIONS = [
  { id: "none", label: "Belum Action", icon: "⏳", color: "text-amber-700 bg-amber-500/10 border-amber-500/30" },
  { id: "sapa_wa", label: "Sudah Sapa WA", icon: "💬", color: "text-emerald-700 bg-emerald-500/10 border-emerald-500/30" },
  { id: "kunjungan", label: "Kunjungan Perhatian", icon: "🏠", color: "text-emerald-700 bg-emerald-500/10 border-emerald-500/30" },
  { id: "izin", label: "Izin / Luar Kota", icon: "✈️", color: "text-blue-700 bg-blue-500/10 border-blue-500/30" },
  { id: "reengaged", label: "Member Aktif Kembali", icon: "✅", color: "text-emerald-700 bg-emerald-500/10 border-emerald-500/30" },
]

export function RecencyAlertsPage() {
  const [summary, setSummary] = useState<RecencySummary | null>(null)
  const [members, setMembers] = useState<MemberRecency[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Filters & Search
  const [activeLevel, setActiveLevel] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("longest_absence")

  // View Mode & Pagination State
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(12) // Default 12 card

  // Modal Detail State
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [memberDetail, setMemberDetail] = useState<MemberDetailResponse | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)

  // Pengurus Manual Take Action & Override Saved State
  const [followedUpUserIds, setFollowedUpUserIds] = useState<Record<string, boolean>>({})
  const [userActionStatuses, setUserActionStatuses] = useState<Record<string, string>>({})
  const [userStatusOverrides, setUserStatusOverrides] = useState<Record<string, AlertLevel>>({})

  // Modal Draft States (Not applied until "Simpan Perubahan" is clicked)
  const [draftActionId, setDraftActionId] = useState<string>("none")
  const [draftOverrideLevel, setDraftOverrideLevel] = useState<AlertLevel | "auto">("auto")
  const [saveSuccessToast, setSaveSuccessToast] = useState(false)

  const loadData = async (showSpin = true) => {
    if (showSpin) setIsLoading(true)
    setIsRefreshing(true)
    try {
      const res = await fetchRecencyAlerts({
        level: activeLevel,
        search: searchQuery,
        sortBy,
      })
      setSummary(res.summary)
      setMembers(res.members)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    setCurrentPage(1)
    loadData(true)
  }, [activeLevel, sortBy])

  useEffect(() => {
    setCurrentPage(1)
    const timer = setTimeout(() => {
      loadData(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleOpenDetail = async (userId: string) => {
    setSelectedUserId(userId)
    setIsDetailLoading(true)
    // Initialize draft state with currently saved settings for this user
    setDraftActionId(userActionStatuses[userId] || (followedUpUserIds[userId] ? "sapa_wa" : "none"))
    setDraftOverrideLevel(userStatusOverrides[userId] || "auto")
    setSaveSuccessToast(false)

    try {
      const res = await fetchMemberRecencyDetail(userId)
      setMemberDetail(res)
    } catch (err) {
      console.error(err)
    } finally {
      setIsDetailLoading(false)
    }
  }

  const handleCloseDetail = () => {
    setSelectedUserId(null)
    setMemberDetail(null)
    setSaveSuccessToast(false)
  }

  // Save changes explicitly when Pengurus clicks "Simpan Perubahan"
  const handleSaveModalChanges = () => {
    if (!selectedUserId) return

    // 1. Commit action status
    setUserActionStatuses((prev) => ({
      ...prev,
      [selectedUserId]: draftActionId,
    }))
    setFollowedUpUserIds((prev) => ({
      ...prev,
      [selectedUserId]: draftActionId !== "none",
    }))

    // 2. Commit override level
    setUserStatusOverrides((prev) => {
      const copy = { ...prev }
      if (draftOverrideLevel === "auto") {
        delete copy[selectedUserId]
      } else {
        copy[selectedUserId] = draftOverrideLevel
      }
      return copy
    })

    setSaveSuccessToast(true)
    setTimeout(() => {
      setSaveSuccessToast(false)
    }, 2500)
  }

  const handleDirectWA = (userId: string) => {
    // Set draft action to sapa_wa
    setDraftActionId("sapa_wa")
    // Commit action status immediately
    setUserActionStatuses((prev) => ({
      ...prev,
      [userId]: "sapa_wa",
    }))
    setFollowedUpUserIds((prev) => ({
      ...prev,
      [userId]: true,
    }))
  }

  // Pagination Calculations
  const totalItems = members.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const validCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = totalItems > 0 ? (validCurrentPage - 1) * pageSize : 0
  const endIndex = Math.min(startIndex + pageSize, totalItems)
  const paginatedMembers = members.slice(startIndex, endIndex)

  return (
    <main className="min-h-screen pb-24 md:pb-12">
      <PageBreadcrumb items={[{ label: "Pengurus" }, { label: "Silent-Churn Alert" }]} />

      <div className="px-4 py-6 md:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl space-y-6">

          {/* Mini Dashboard — 4 Cards Ordered: Normal, Warning, At Risk, Lost */}
          {summary && (
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
              {/* 1. Normal */}
              <div
                onClick={() => setActiveLevel(activeLevel === "normal" ? "all" : "normal")}
                className={`cursor-pointer rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 ${
                  activeLevel === "normal"
                    ? "border-emerald-500 bg-emerald-500/10 shadow-sm ring-2 ring-emerald-500/20"
                    : "border-sekkha-hairline-soft bg-sekkha-canvas hover:border-emerald-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-caption-bold font-bold text-emerald-700 dark:text-emerald-400">🟢 Normal</span>
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-caption-bold font-bold text-emerald-700 dark:text-emerald-400">
                    {summary.normalCount}
                  </span>
                </div>
                <p className="mt-2.5 text-heading-3 font-extrabold text-sekkha-ink">{summary.normalCount}</p>
                <p className="mt-0.5 text-caption text-sekkha-slate">Presensi aktif</p>
              </div>

              {/* 2. Warning */}
              <div
                onClick={() => setActiveLevel(activeLevel === "warning" ? "all" : "warning")}
                className={`cursor-pointer rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 ${
                  activeLevel === "warning"
                    ? "border-amber-500 bg-amber-500/10 shadow-sm ring-2 ring-amber-500/20"
                    : "border-sekkha-hairline-soft bg-sekkha-canvas hover:border-amber-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-caption-bold font-bold text-amber-700 dark:text-amber-400">🟡 Warning</span>
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-caption-bold font-bold text-amber-700 dark:text-amber-400">
                    {summary.warningCount}
                  </span>
                </div>
                <p className="mt-2.5 text-heading-3 font-extrabold text-sekkha-ink">{summary.warningCount}</p>
                <p className="mt-0.5 text-caption text-sekkha-slate">Absen 2x event</p>
              </div>

              {/* 3. At Risk */}
              <div
                onClick={() => setActiveLevel(activeLevel === "at_risk" ? "all" : "at_risk")}
                className={`cursor-pointer rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 ${
                  activeLevel === "at_risk"
                    ? "border-orange-500 bg-orange-500/10 shadow-sm ring-2 ring-orange-500/20"
                    : "border-sekkha-hairline-soft bg-sekkha-canvas hover:border-orange-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-caption-bold font-bold text-orange-700 dark:text-orange-400">🟠 At Risk</span>
                  <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-caption-bold font-bold text-orange-700 dark:text-orange-400">
                    {summary.atRiskCount}
                  </span>
                </div>
                <p className="mt-2.5 text-heading-3 font-extrabold text-sekkha-ink">{summary.atRiskCount}</p>
                <p className="mt-0.5 text-caption text-sekkha-slate">Absen 3x event</p>
              </div>

              {/* 4. Lost */}
              <div
                onClick={() => setActiveLevel(activeLevel === "lost" ? "all" : "lost")}
                className={`cursor-pointer rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 ${
                  activeLevel === "lost"
                    ? "border-rose-500 bg-rose-500/10 shadow-sm ring-2 ring-rose-500/20"
                    : "border-sekkha-hairline-soft bg-sekkha-canvas hover:border-rose-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-caption-bold font-bold text-rose-700 dark:text-rose-400">🔴 Lost</span>
                  <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-caption-bold font-bold text-rose-700 dark:text-rose-400">
                    {summary.lostCount}
                  </span>
                </div>
                <p className="mt-2.5 text-heading-3 font-extrabold text-sekkha-ink">{summary.lostCount}</p>
                <p className="mt-0.5 text-caption text-sekkha-slate">Absen 4x+ / &gt; 60 hr</p>
              </div>
            </div>
          )}

          {/* Controls Bar: Search Input (Left), View Toggle & Filters (Right) */}
          <div className="flex flex-col gap-2.5 rounded-2xl border border-sekkha-hairline-soft bg-sekkha-canvas p-3 sm:p-4 md:flex-row md:items-center md:justify-between">
            {/* Left: Search Input */}
            <div className="relative w-full md:max-w-md">
              <SearchIcon className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-sekkha-muted" />
              <input
                type="text"
                placeholder="Cari nama member..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-sekkha-hairline-soft bg-sekkha-surface pl-9 pr-9 py-2 text-body-sm text-sekkha-ink outline-none transition focus:border-sekkha-brand-blue"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sekkha-slate hover:text-sekkha-ink cursor-pointer"
                >
                  <XIcon className="size-4" />
                </button>
              )}
            </div>

            {/* Right: Controls Group (View Toggle + Sort Dropdown + Refresh Button + Reset Filter) */}
            <div className="flex flex-col gap-2 w-full md:w-auto">
              <div className="flex items-center gap-2 w-full justify-between">
                {/* 1. View Mode Toggle */}
                <div className="flex items-center rounded-xl border border-sekkha-hairline-soft bg-sekkha-surface p-1 shadow-2xs shrink-0">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={`flex items-center justify-center p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-caption-bold transition cursor-pointer ${
                      viewMode === "grid"
                        ? "bg-white font-bold text-sekkha-ink shadow-2xs"
                        : "text-sekkha-slate hover:text-sekkha-ink"
                    }`}
                    title="Tampilan Grid (Kartu)"
                  >
                    <LayoutGridIcon className="size-4" />
                    <span className="hidden sm:inline ml-1">Grid</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={`flex items-center justify-center p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-caption-bold transition cursor-pointer ${
                      viewMode === "list"
                        ? "bg-white font-bold text-sekkha-ink shadow-2xs"
                        : "text-sekkha-slate hover:text-sekkha-ink"
                    }`}
                    title="Tampilan Daftar (Tabel)"
                  >
                    <ListIcon className="size-4" />
                    <span className="hidden sm:inline ml-1">Daftar</span>
                  </button>
                </div>

                {/* 2. Sort Dropdown */}
                <div className="flex items-center gap-1 rounded-xl border border-sekkha-hairline-soft bg-sekkha-surface px-2.5 py-1.5 text-caption-bold text-sekkha-ink min-w-0 flex-1 sm:flex-none">
                  <ArrowUpDownIcon className="size-3.5 text-sekkha-muted shrink-0" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full bg-transparent text-caption-bold text-sekkha-ink outline-none cursor-pointer truncate"
                  >
                    <option value="longest_absence">Paling Lama Absen</option>
                    <option value="consecutive_missed">Absen Berturut-turut</option>
                    <option value="name">Nama (A-Z)</option>
                  </select>
                </div>

                {/* 3. Refresh Button */}
                <button
                  onClick={() => loadData(true)}
                  disabled={isRefreshing}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-sekkha-hairline-soft bg-sekkha-surface p-2 sm:px-3 sm:py-1.5 text-caption-bold font-bold text-sekkha-ink transition hover:bg-sekkha-hairline-soft disabled:opacity-50 cursor-pointer shrink-0"
                  title="Muat ulang data"
                >
                  <RefreshCwIcon className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>

              {/* Reset Level Filter Badge (If filter is active) */}
              {activeLevel !== "all" && (
                <div className="flex items-center justify-end">
                  <button
                    onClick={() => setActiveLevel("all")}
                    className="inline-flex items-center gap-1 rounded-lg bg-sekkha-brand-blue/10 px-2.5 py-1 text-micro-bold font-bold text-sekkha-brand-blue transition hover:bg-sekkha-brand-blue/20 cursor-pointer"
                  >
                    <span>Reset Filter ({activeLevel})</span>
                    <XIcon className="size-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Member Content (Grid / List View) */}
          {isLoading ? (
            <div className="flex h-64 items-center justify-center rounded-2xl border border-sekkha-hairline-soft bg-sekkha-canvas">
              <div className="flex flex-col items-center gap-2 text-sekkha-muted">
                <RefreshCwIcon className="size-6 animate-spin text-sekkha-brand-blue" />
                <p className="text-body-sm font-medium">Memuat data recency member...</p>
              </div>
            </div>
          ) : members.length === 0 ? (
            <div className="flex h-56 flex-col items-center justify-center rounded-2xl border border-sekkha-hairline-soft bg-sekkha-canvas text-center">
              <UserCheckIcon className="size-10 text-sekkha-muted/60" />
              <p className="mt-2 text-body-sm-medium font-bold text-sekkha-ink">Tidak ada member ditemukan</p>
              <p className="text-caption text-sekkha-slate">Coba ubah kata kunci pencarian atau klik kartu mini dashboard untuk memfilter.</p>
            </div>
          ) : viewMode === "grid" ? (
            /* ── GRID VIEW ── */
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {paginatedMembers.map((m) => {
                const overrideLevel = userStatusOverrides[m.userId]
                const effectiveLevel = overrideLevel || m.level
                const config = LEVEL_CONFIG[effectiveLevel]

                const actionId = userActionStatuses[m.userId] || (followedUpUserIds[m.userId] ? "sapa_wa" : "none")
                const actionConfig = ACTION_STATUS_OPTIONS.find((a) => a.id === actionId) || ACTION_STATUS_OPTIONS[0]

                return (
                  <div
                    key={m.userId}
                    className={`group relative flex flex-col justify-between rounded-2xl border bg-sekkha-canvas p-4 shadow-xs transition-all duration-200 ${config.cardBorder} ${config.cardHoverBorder} hover:shadow-md`}
                  >
                    <div>
                      {/* Avatar, Name, Email, Status Badge */}
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sekkha-brand-blue/20 to-sekkha-brand-blue/5 text-caption-bold font-extrabold text-sekkha-brand-blue overflow-hidden shadow-xs">
                            {m.avatarUrl ? (
                              <img src={m.avatarUrl} alt={m.name} className="size-full object-cover" />
                            ) : (
                              m.name.slice(0, 2).toUpperCase()
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 truncate">
                              <h3 className="text-caption-bold font-bold text-sekkha-ink group-hover:text-sekkha-brand-blue transition truncate">
                                {m.name}
                              </h3>
                              <span className="rounded-md bg-sekkha-surface px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sekkha-slate shrink-0">
                                {m.role}
                              </span>
                            </div>
                            <p className="text-[11px] text-sekkha-slate truncate">{m.email}</p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span
                            className={`inline-flex items-center gap-1 rounded-xl border px-2 py-0.5 text-[11px] font-bold ${config.badgeBg}`}
                          >
                            {config.shortLabel}
                          </span>
                          {overrideLevel && (
                            <span className="text-[9px] font-extrabold text-sekkha-brand-blue bg-sekkha-brand-blue/10 px-1.5 py-0.2 rounded-md">
                              Override
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Streamlined Metric: Event Dilewati Only */}
                      <div className="my-3 flex items-center justify-between rounded-xl border border-sekkha-hairline-soft bg-sekkha-surface px-3 py-2">
                        <span className="text-[11px] text-sekkha-slate">Event Dilewati:</span>
                        <span className="text-caption-bold font-extrabold text-sekkha-ink">
                          {m.consecutiveMissedEvents}x Event
                        </span>
                      </div>

                      {/* Action Status Indicator Banner */}
                      <div
                        className={`mb-3 flex items-center justify-between rounded-xl border px-2.5 py-1 text-[11px] font-bold ${actionConfig.color}`}
                      >
                        <span className="flex items-center gap-1 truncate">
                          <span>{actionConfig.icon}</span>
                          <span>{actionConfig.label}</span>
                        </span>
                      </div>
                    </div>

                    {/* Footer Actions & 4 Trend Dots for 4 Weeks in 1 Month */}
                    <div className="space-y-3 pt-1 border-t border-sekkha-hairline-soft">
                      <div className="flex items-center justify-between text-caption text-sekkha-slate">
                        <span className="text-[11px]">Tren 4 Minggu:</span>
                        {(() => {
                          const missedCount = Math.min(4, Math.max(0, m.consecutiveMissedEvents))
                          const attendedCount = 4 - missedCount
                          return (
                            <div className="flex items-center gap-1.5" title="Kilas Presensi 4 Minggu (1 Bulan)">
                              {Array.from({ length: attendedCount }).map((_, i) => (
                                <span
                                  key={`att-${i}`}
                                  title={`Minggu ${i + 1}: Hadir`}
                                  className="size-2.5 rounded-full bg-emerald-500 shadow-xs"
                                />
                              ))}
                              {Array.from({ length: missedCount }).map((_, i) => (
                                <span
                                  key={`miss-${i}`}
                                  title={`Minggu ${attendedCount + i + 1}: Absen`}
                                  className="size-2.5 rounded-full bg-rose-400 opacity-80"
                                />
                              ))}
                            </div>
                          )
                        })()}
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(
                            `Halo Kak ${m.name}, semoga sehat selalu! Kapan-kapan kalau sempat, yuk kumpul lagi di Vihara 😊`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDirectWA(m.userId)
                          }}
                          className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-caption-bold font-bold transition ${
                            actionId !== "none"
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white"
                          }`}
                        >
                          <MessageCircleIcon className="size-4" />
                          {actionId !== "none" ? "✓ Actioned" : "Sapa WA"}
                        </a>

                        <button
                          type="button"
                          onClick={() => handleOpenDetail(m.userId)}
                          className="inline-flex items-center justify-center gap-1 rounded-xl border border-sekkha-hairline-soft bg-sekkha-surface px-3 py-2 text-caption-bold font-bold text-sekkha-ink transition hover:bg-sekkha-hairline-soft cursor-pointer"
                        >
                          Detail <ChevronRightIcon className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* ── LIST VIEW (TABEL DAFTAR BARIS) ── */
            <div className="overflow-x-auto rounded-2xl border border-sekkha-hairline-soft bg-sekkha-canvas shadow-xs">
              <table className="w-full text-left border-collapse min-w-[660px]">
                <thead>
                  <tr className="border-b border-sekkha-hairline-soft bg-sekkha-surface/60 text-micro font-extrabold uppercase tracking-wider text-sekkha-slate">
                    <th className="px-4 py-3.5">Member</th>
                    <th className="px-4 py-3.5">Status Risk</th>
                    <th className="px-4 py-3.5 text-center">Event Dilewati</th>
                    <th className="px-4 py-3.5">Status Action</th>
                    <th className="px-4 py-3.5 text-center">Tren 4 Minggu</th>
                    <th className="px-4 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sekkha-hairline-soft/80 text-body-sm">
                  {paginatedMembers.map((m) => {
                    const overrideLevel = userStatusOverrides[m.userId]
                    const effectiveLevel = overrideLevel || m.level
                    const config = LEVEL_CONFIG[effectiveLevel]

                    const actionId = userActionStatuses[m.userId] || (followedUpUserIds[m.userId] ? "sapa_wa" : "none")
                    const actionConfig = ACTION_STATUS_OPTIONS.find((a) => a.id === actionId) || ACTION_STATUS_OPTIONS[0]

                    const missedCount = Math.min(4, Math.max(0, m.consecutiveMissedEvents))
                    const attendedCount = 4 - missedCount

                    return (
                      <tr key={m.userId} className="hover:bg-sekkha-surface/50 transition-colors">
                        {/* Member Info */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-sekkha-brand-blue/10 text-caption-bold font-bold text-sekkha-brand-blue overflow-hidden shadow-2xs">
                              {m.avatarUrl ? (
                                <img src={m.avatarUrl} alt={m.name} className="size-full object-cover" />
                              ) : (
                                m.name.slice(0, 2).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-sekkha-ink truncate">{m.name}</p>
                                <span className="rounded-md bg-sekkha-surface px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider text-sekkha-slate">
                                  {m.role}
                                </span>
                              </div>
                              <p className="text-micro text-sekkha-slate truncate">{m.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Status Risk Level */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-flex items-center gap-1 rounded-xl border px-2 py-0.5 text-micro-bold font-bold ${config.badgeBg}`}>
                              {config.shortLabel}
                            </span>
                            {overrideLevel && (
                              <span className="text-[9px] font-extrabold text-sekkha-brand-blue bg-sekkha-brand-blue/10 px-1.5 py-0.2 rounded-md">
                                Override
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Event Dilewati */}
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center rounded-lg bg-sekkha-surface border border-sekkha-hairline-soft px-2.5 py-1 text-caption-bold font-extrabold text-sekkha-ink">
                            {m.consecutiveMissedEvents}x Event
                          </span>
                        </td>

                        {/* Status Action */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1 text-micro-bold font-bold ${actionConfig.color}`}>
                            <span>{actionConfig.icon}</span>
                            <span>{actionConfig.label}</span>
                          </span>
                        </td>

                        {/* Tren 4 Minggu */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1" title="Kilas Presensi 4 Minggu (1 Bulan)">
                            {Array.from({ length: attendedCount }).map((_, i) => (
                              <span
                                key={`att-${i}`}
                                title={`Minggu ${i + 1}: Hadir`}
                                className="size-2.5 rounded-full bg-emerald-500 shadow-xs"
                              />
                            ))}
                            {Array.from({ length: missedCount }).map((_, i) => (
                              <span
                                key={`miss-${i}`}
                                title={`Minggu ${attendedCount + i + 1}: Absen`}
                                className="size-2.5 rounded-full bg-rose-400 opacity-80"
                              />
                            ))}
                          </div>
                        </td>

                        {/* Aksi */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <a
                              href={`https://wa.me/?text=${encodeURIComponent(
                                `Halo Kak ${m.name}, semoga sehat selalu! Kapan-kapan kalau sempat, yuk kumpul lagi di Vihara 😊`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDirectWA(m.userId)
                              }}
                              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-micro-bold font-bold transition ${
                                actionId !== "none"
                                  ? "bg-emerald-600 text-white border-emerald-600"
                                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white"
                              }`}
                            >
                              <MessageCircleIcon className="size-3.5" />
                              <span>{actionId !== "none" ? "Done" : "Sapa WA"}</span>
                            </a>

                            <button
                              type="button"
                              onClick={() => handleOpenDetail(m.userId)}
                              className="inline-flex items-center gap-1 rounded-lg border border-sekkha-hairline-soft bg-sekkha-surface px-2.5 py-1.5 text-micro-bold font-bold text-sekkha-ink hover:bg-sekkha-hairline-soft cursor-pointer"
                            >
                              <span>Detail</span>
                              <ChevronRightIcon className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── PAGINATION CONTROLS BAR ── */}
          {!isLoading && members.length > 0 && (
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-sekkha-hairline-soft bg-sekkha-canvas p-3 sm:p-4 text-caption text-sekkha-slate shadow-2xs">
              {/* Left: Range Info & Page Size Select */}
              <div className="flex items-center justify-between gap-2 w-full sm:w-auto sm:justify-start">
                <span className="text-micro sm:text-caption">
                  Menampilkan <strong className="text-sekkha-ink">{startIndex + 1}</strong>–<strong className="text-sekkha-ink">{endIndex}</strong> dari <strong className="text-sekkha-ink">{totalItems}</strong> member
                </span>

                <div className="flex items-center gap-1.5 sm:border-l sm:border-sekkha-hairline-soft sm:pl-3">
                  <span className="hidden sm:inline text-micro text-sekkha-slate">Tampilkan:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value))
                      setCurrentPage(1)
                    }}
                    className="rounded-lg border border-sekkha-hairline-soft bg-sekkha-surface px-2 py-1 text-micro-bold text-sekkha-ink outline-none cursor-pointer"
                  >
                    <option value={12}>12 / hal</option>
                    <option value={24}>24 / hal</option>
                    <option value={48}>48 / hal</option>
                  </select>
                </div>
              </div>

              {/* Right: Page Navigation Buttons */}
              <div className="flex items-center justify-center sm:justify-end gap-1 w-full sm:w-auto overflow-x-auto py-0.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={validCurrentPage === 1}
                  className="flex size-8 items-center justify-center rounded-lg border border-sekkha-hairline-soft bg-sekkha-surface text-sekkha-slate hover:bg-sekkha-hairline-soft disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  title="Halaman Pertama"
                >
                  <ChevronsLeftIcon className="size-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={validCurrentPage === 1}
                  className="flex size-8 items-center justify-center rounded-lg border border-sekkha-hairline-soft bg-sekkha-surface text-sekkha-slate hover:bg-sekkha-hairline-soft disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeftIcon className="size-4" />
                </button>

                {/* Page Numbers */}
                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`flex size-8 items-center justify-center rounded-lg text-micro-bold transition cursor-pointer ${
                        page === validCurrentPage
                          ? "bg-sekkha-brand-blue font-bold text-white shadow-2xs"
                          : "border border-sekkha-hairline-soft bg-sekkha-surface text-sekkha-slate hover:bg-sekkha-hairline-soft"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={validCurrentPage === totalPages}
                  className="flex size-8 items-center justify-center rounded-lg border border-sekkha-hairline-soft bg-sekkha-surface text-sekkha-slate hover:bg-sekkha-hairline-soft disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  title="Halaman Selanjutnya"
                >
                  <ChevronRightIcon className="size-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={validCurrentPage === totalPages}
                  className="flex size-8 items-center justify-center rounded-lg border border-sekkha-hairline-soft bg-sekkha-surface text-sekkha-slate hover:bg-sekkha-hairline-soft disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  title="Halaman Terakhir"
                >
                  <ChevronsRightIcon className="size-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Member Detail Drawer / Modal with Save Changes Button */}
      {selectedUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md transition-all animate-fadeIn">
          <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-sekkha-hairline-soft bg-sekkha-canvas p-6.5 shadow-2xl space-y-6">
            <button
              onClick={handleCloseDetail}
              className="absolute right-5 top-5 flex size-9 items-center justify-center rounded-full border border-sekkha-hairline-soft bg-sekkha-surface text-sekkha-slate transition hover:bg-sekkha-hairline-soft hover:text-sekkha-ink"
            >
              <XIcon className="size-5" />
            </button>

            {isDetailLoading || !memberDetail ? (
              <div className="flex h-64 flex-col items-center justify-center gap-2">
                <RefreshCwIcon className="size-7 animate-spin text-sekkha-brand-blue" />
                <p className="text-body-sm font-semibold text-sekkha-slate">Memuat detail member & histori...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Header Banner Member */}
                <div className="flex flex-col gap-4 rounded-3xl border border-sekkha-hairline-soft bg-gradient-to-br from-sekkha-surface via-sekkha-canvas to-sekkha-surface p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sekkha-brand-blue/20 to-sekkha-brand-blue/5 text-heading-4 font-bold text-sekkha-brand-blue shadow-xs overflow-hidden">
                      {memberDetail.member.avatarUrl ? (
                        <img
                          src={memberDetail.member.avatarUrl}
                          alt={memberDetail.member.name}
                          className="size-full object-cover"
                        />
                      ) : (
                        memberDetail.member.name.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-heading-4 font-extrabold text-sekkha-ink">{memberDetail.member.name}</h2>
                        <span className="rounded-md bg-sekkha-brand-blue/10 px-2 py-0.5 text-caption-bold font-bold text-sekkha-brand-blue uppercase tracking-wider">
                          {memberDetail.member.role}
                        </span>
                      </div>
                      <p className="text-body-sm text-sekkha-slate">{memberDetail.member.email}</p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                    {(() => {
                      const curLevel = draftOverrideLevel === "auto" ? memberDetail.member.level : draftOverrideLevel
                      const cfg = LEVEL_CONFIG[curLevel]
                      return (
                        <div className="flex flex-col items-end gap-1">
                          <span className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-caption-bold font-bold ${cfg.badgeBg}`}>
                            {cfg.shortLabel}
                          </span>
                          {draftOverrideLevel !== "auto" && (
                            <span className="text-[10px] font-extrabold text-sekkha-brand-blue bg-sekkha-brand-blue/10 px-2 py-0.5 rounded-md">
                              Draft Override
                            </span>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                </div>

                {/* Success Toast when Save is clicked */}
                {saveSuccessToast && (
                  <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-body-sm font-bold text-emerald-700 dark:text-emerald-400 animate-fadeIn">
                    <CheckCircle2Icon className="size-5 shrink-0" />
                    Perubahan status member berhasil disimpan!
                  </div>
                )}

                {/* 🛠 PENGURUS TAKE ACTION & MANUAL OVERRIDE BOX (DRAFT STATE) */}
                <div className="rounded-3xl border border-sekkha-brand-blue/30 bg-gradient-to-br from-sekkha-brand-blue/5 via-sekkha-canvas to-sekkha-surface p-5.5 space-y-5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-sekkha-brand-blue/20 pb-3">
                    <div className="flex items-center gap-2 text-body-sm-medium font-bold text-sekkha-brand-blue">
                      <WrenchIcon className="size-4.5" />
                      Aksi & Override Status Pengurus
                    </div>
                    <span className="text-[11px] font-semibold text-sekkha-slate">Pilih & Klik Simpan</span>
                  </div>

                  {/* 1. Status Action Selector Pills */}
                  <div className="space-y-2">
                    <label className="block text-caption-bold font-bold text-sekkha-ink">
                      Status Tindakan / Follow-Up
                    </label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {ACTION_STATUS_OPTIONS.map((opt) => {
                        const isSelected = draftActionId === opt.id

                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setDraftActionId(opt.id)}
                            className={`flex items-center gap-2 rounded-2xl border p-2.5 text-caption-bold transition-all text-left ${
                              isSelected
                                ? "border-sekkha-brand-blue bg-sekkha-brand-blue/10 text-sekkha-brand-blue ring-2 ring-sekkha-brand-blue/20 shadow-xs"
                                : "border-sekkha-hairline-soft bg-sekkha-canvas text-sekkha-slate hover:border-sekkha-brand-blue/40 hover:text-sekkha-ink"
                            }`}
                          >
                            <span className="text-base">{opt.icon}</span>
                            <span className="truncate">{opt.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* 2. Manual Alert Status Override Buttons */}
                  <div className="space-y-2 pt-1 border-t border-sekkha-hairline-soft">
                    <label className="block text-caption-bold font-bold text-sekkha-ink">
                      Override Status Alert Member
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      {[
                        { id: "auto", label: `Otomatis System (${memberDetail.member.level})` },
                        { id: "normal", label: "🟢 Normal" },
                        { id: "mulai_jarang", label: "🟡 Warning" },
                        { id: "at_risk", label: "🟠 At Risk" },
                        { id: "lost", label: "🔴 Lost" },
                      ].map((item) => {
                        const isSel = draftOverrideLevel === item.id

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setDraftOverrideLevel(item.id as AlertLevel | "auto")}
                            className={`rounded-xl border px-3 py-1.5 text-caption-bold font-bold transition-all ${
                              isSel
                                ? "border-sekkha-brand-blue bg-sekkha-brand-blue text-white shadow-xs"
                                : "border-sekkha-hairline-soft bg-sekkha-canvas text-sekkha-slate hover:bg-sekkha-surface hover:text-sekkha-ink"
                            }`}
                          >
                            {item.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Actions Footer: Direct WA Button + SIMPAN PERUBAHAN BUTTON */}
                  <div className="pt-3 border-t border-sekkha-brand-blue/20 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(
                        `Halo Kak ${memberDetail.member.name}, semoga sehat selalu! Kapan-kapan kalau sempat, yuk kumpul lagi di Vihara 😊`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setDraftActionId("sapa_wa")}
                      className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-caption-bold font-bold text-emerald-700 dark:text-emerald-400 transition hover:bg-emerald-500 hover:text-white"
                    >
                      <MessageCircleIcon className="size-4" />
                      Sapa WhatsApp Direct
                      <ExternalLinkIcon className="size-3.5" />
                    </a>

                    <button
                      type="button"
                      onClick={handleSaveModalChanges}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sekkha-brand-blue px-6 py-2.5 text-caption-bold font-bold text-white shadow-md transition hover:bg-sekkha-brand-blue/90 active:scale-95 cursor-pointer"
                    >
                      <SaveIcon className="size-4" />
                      Simpan Perubahan
                    </button>
                  </div>
                </div>

                {/* Past Timeline — Exactly 4 Most Recent Events */}
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 text-body-sm-medium font-bold text-sekkha-ink">
                    <CalendarIcon className="size-4 text-sekkha-brand-blue" />
                    Histori Presensi (4 Event Terakhir)
                  </h3>
                  <div className="rounded-2xl border border-sekkha-hairline-soft bg-sekkha-canvas divide-y divide-sekkha-hairline-soft overflow-hidden">
                    {memberDetail.eventTimeline.length === 0 ? (
                      <p className="p-4 text-center text-caption text-sekkha-slate">Belum ada event rutin selesai.</p>
                    ) : (
                      memberDetail.eventTimeline.slice(0, 4).map((ev) => (
                        <div key={ev.eventId} className="flex items-center justify-between p-3.5 transition hover:bg-sekkha-surface">
                          <div>
                            <p className="text-body-sm font-semibold text-sekkha-ink">{ev.title}</p>
                            <p className="text-caption text-sekkha-slate">
                              {new Date(ev.eventDate).toLocaleDateString("id-ID", {
                                weekday: "long",
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                          <div>
                            {ev.attended ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-caption-bold font-bold text-emerald-700 dark:text-emerald-400">
                                <UserCheckIcon className="size-3.5" /> Hadir
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-3 py-1 text-caption-bold font-bold text-rose-700 dark:text-rose-400">
                                <UserXIcon className="size-3.5" /> Absen
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
