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
import { fetchRecencyAlerts, fetchMemberRecencyDetail } from "../api/recencyApi"
import type {
  MemberRecency,
  RecencySummary,
  AlertLevel,
  MemberDetailResponse,
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
    badgeBg:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    cardBorder: "border-sekkha-hairline-soft",
    cardHoverBorder: "hover:border-emerald-400/60",
    dotColor: "bg-emerald-500",
    desc: "Active & consistent attendance (missed < 2 events)",
    recommendation: "Appreciate member participation periodically.",
  },
  mulai_jarang: {
    label: "Warning",
    shortLabel: "🟡 Warning",
    badgeBg:
      "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
    cardBorder: "border-amber-200 dark:border-amber-900/40",
    cardHoverBorder: "hover:border-amber-400/80",
    dotColor: "bg-amber-500",
    desc: "Missed 2 consecutive events",
    recommendation: "Send friendly reminders for upcoming routine events.",
  },
  at_risk: {
    label: "At Risk",
    shortLabel: "🟠 At Risk",
    badgeBg:
      "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30",
    cardBorder: "border-orange-200 dark:border-orange-900/40",
    cardHoverBorder: "hover:border-orange-400/80",
    dotColor: "bg-orange-500",
    desc: "Missed 3 consecutive events",
    recommendation:
      "Reach out personally to understand obstacles or challenges.",
  },
  kemungkinan_hilang: {
    label: "Lost",
    shortLabel: "🔴 Lost",
    badgeBg:
      "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30",
    cardBorder: "border-rose-200 dark:border-rose-900/40",
    cardHoverBorder: "hover:border-rose-400/80",
    dotColor: "bg-rose-500",
    desc: "Missed 4+ consecutive events",
    recommendation:
      "Direct contact by organizers or schedule pastoral care visit.",
  },
  churned: {
    label: "Lost",
    shortLabel: "🔴 Lost",
    badgeBg:
      "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30",
    cardBorder: "border-rose-200 dark:border-rose-900/40",
    cardHoverBorder: "hover:border-rose-400/80",
    dotColor: "bg-rose-500",
    desc: "Absent > 60 consecutive days without notice",
    recommendation:
      "Execute dedicated outreach before member completely disengages.",
  },
}

const ACTION_STATUS_OPTIONS = [
  {
    id: "none",
    label: "No Action Yet",
    icon: "⏳",
    color: "text-amber-700 bg-amber-500/10 border-amber-500/30",
  },
  {
    id: "sapa_wa",
    label: "WhatsApp Sent",
    icon: "💬",
    color: "text-emerald-700 bg-emerald-500/10 border-emerald-500/30",
  },
  {
    id: "kunjungan",
    label: "Pastoral Visit",
    icon: "🏠",
    color: "text-emerald-700 bg-emerald-500/10 border-emerald-500/30",
  },
  {
    id: "izin",
    label: "On Leave / Away",
    icon: "✈️",
    color: "text-blue-700 bg-blue-500/10 border-blue-500/30",
  },
  {
    id: "reengaged",
    label: "Re-engaged Active",
    icon: "✅",
    color: "text-emerald-700 bg-emerald-500/10 border-emerald-500/30",
  },
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
  const [memberDetail, setMemberDetail] = useState<MemberDetailResponse | null>(
    null
  )
  const [isDetailLoading, setIsDetailLoading] = useState(false)

  // Pengurus Manual Take Action & Override Saved State
  const [followedUpUserIds, setFollowedUpUserIds] = useState<
    Record<string, boolean>
  >({})
  const [userActionStatuses, setUserActionStatuses] = useState<
    Record<string, string>
  >({})
  const [userStatusOverrides, setUserStatusOverrides] = useState<
    Record<string, AlertLevel>
  >({})

  // Modal Draft States (Not applied until "Simpan Perubahan" is clicked)
  const [draftActionId, setDraftActionId] = useState<string>("none")
  const [draftOverrideLevel, setDraftOverrideLevel] = useState<
    AlertLevel | "auto"
  >("auto")
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
    setDraftActionId(
      userActionStatuses[userId] ||
        (followedUpUserIds[userId] ? "sapa_wa" : "none")
    )
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

  const getWhatsAppUrl = (name: string, phone?: string | null) => {
    const cleanPhone = (phone || "").replace(/\D/g, "")
    const formattedPhone = cleanPhone.startsWith("0")
      ? `62${cleanPhone.slice(1)}`
      : cleanPhone
    const msg = `Hello ${name}, hope you are doing well! If you have time, let's connect at the Vihara again soon 😊`
    return formattedPhone
      ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`
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
      <PageBreadcrumb
        items={[{ label: "Organizer" }, { label: "Recency Alerts" }]}
      />

      <div className="px-3.5 py-4 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
          {/* Header Banner */}
          <div className="flex flex-col gap-3.5 rounded-2xl border border-sekkha-hairline-soft bg-gradient-to-br from-sekkha-canvas via-sekkha-surface to-sekkha-canvas p-4 shadow-2xs sm:rounded-3xl sm:p-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex size-8.5 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 sm:size-9">
                  <UserXIcon className="size-4.5 sm:size-5" />
                </span>
                <h1 className="text-heading-5 sm:text-heading-4 font-bold text-sekkha-ink">
                  Recency Alerts
                </h1>
              </div>
              <p className="text-caption sm:text-body-sm max-w-2xl leading-relaxed text-sekkha-slate">
                Pastoral care and early intervention system. Identify and
                reconnect with members missing community gatherings.
              </p>
            </div>
          </div>

          {/* Mini Dashboard — 4 Cards Ordered: Normal, Warning, At Risk, Lost */}
          {summary && (
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
              {/* 1. Normal */}
              <div
                onClick={() =>
                  setActiveLevel(activeLevel === "normal" ? "all" : "normal")
                }
                className={`cursor-pointer rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 ${
                  activeLevel === "normal"
                    ? "border-emerald-500 bg-emerald-500/10 shadow-sm ring-2 ring-emerald-500/20"
                    : "border-sekkha-hairline-soft bg-sekkha-canvas hover:border-emerald-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-caption-bold font-bold text-emerald-700 dark:text-emerald-400">
                    🟢 Normal
                  </span>
                  <span className="text-caption-bold rounded-full bg-emerald-500/20 px-2 py-0.5 font-bold text-emerald-700 dark:text-emerald-400">
                    {summary.normalCount}
                  </span>
                </div>
                <p className="text-heading-3 mt-2.5 font-extrabold text-sekkha-ink">
                  {summary.normalCount}
                </p>
                <p className="text-caption mt-0.5 text-sekkha-slate">
                  Active presence
                </p>
              </div>

              {/* 2. Warning */}
              <div
                onClick={() =>
                  setActiveLevel(activeLevel === "warning" ? "all" : "warning")
                }
                className={`cursor-pointer rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 ${
                  activeLevel === "warning"
                    ? "border-amber-500 bg-amber-500/10 shadow-sm ring-2 ring-amber-500/20"
                    : "border-sekkha-hairline-soft bg-sekkha-canvas hover:border-amber-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-caption-bold font-bold text-amber-700 dark:text-amber-400">
                    🟡 Warning
                  </span>
                  <span className="text-caption-bold rounded-full bg-amber-500/20 px-2 py-0.5 font-bold text-amber-700 dark:text-amber-400">
                    {summary.warningCount}
                  </span>
                </div>
                <p className="text-heading-3 mt-2.5 font-extrabold text-sekkha-ink">
                  {summary.warningCount}
                </p>
                <p className="text-caption mt-0.5 text-sekkha-slate">
                  Missed 2 events
                </p>
              </div>

              {/* 3. At Risk */}
              <div
                onClick={() =>
                  setActiveLevel(activeLevel === "at_risk" ? "all" : "at_risk")
                }
                className={`cursor-pointer rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 ${
                  activeLevel === "at_risk"
                    ? "border-orange-500 bg-orange-500/10 shadow-sm ring-2 ring-orange-500/20"
                    : "border-sekkha-hairline-soft bg-sekkha-canvas hover:border-orange-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-caption-bold font-bold text-orange-700 dark:text-orange-400">
                    🟠 At Risk
                  </span>
                  <span className="text-caption-bold rounded-full bg-orange-500/20 px-2 py-0.5 font-bold text-orange-700 dark:text-orange-400">
                    {summary.atRiskCount}
                  </span>
                </div>
                <p className="text-heading-3 mt-2.5 font-extrabold text-sekkha-ink">
                  {summary.atRiskCount}
                </p>
                <p className="text-caption mt-0.5 text-sekkha-slate">
                  Missed 3 events
                </p>
              </div>

              {/* 4. Lost */}
              <div
                onClick={() =>
                  setActiveLevel(activeLevel === "lost" ? "all" : "lost")
                }
                className={`cursor-pointer rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 ${
                  activeLevel === "lost"
                    ? "border-rose-500 bg-rose-500/10 shadow-sm ring-2 ring-rose-500/20"
                    : "border-sekkha-hairline-soft bg-sekkha-canvas hover:border-rose-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-caption-bold font-bold text-rose-700 dark:text-rose-400">
                    🔴 Lost
                  </span>
                  <span className="text-caption-bold rounded-full bg-rose-500/20 px-2 py-0.5 font-bold text-rose-700 dark:text-rose-400">
                    {summary.lostCount}
                  </span>
                </div>
                <p className="text-heading-3 mt-2.5 font-extrabold text-sekkha-ink">
                  {summary.lostCount}
                </p>
                <p className="text-caption mt-0.5 text-sekkha-slate">
                  Missed 4+ / &gt; 60 days
                </p>
              </div>
            </div>
          )}

          {/* Controls Bar: Search Input (Left), View Toggle & Filters (Right) */}
          <div className="flex flex-col gap-2.5 rounded-2xl border border-sekkha-hairline-soft bg-sekkha-canvas p-3 sm:p-4 md:flex-row md:items-center md:justify-between">
            {/* Left: Search Input */}
            <div className="relative w-full md:max-w-md">
              <SearchIcon className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-sekkha-muted" />
              <input
                type="text"
                placeholder="Search member name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-body-sm w-full rounded-xl border border-sekkha-hairline-soft bg-sekkha-surface py-2 pr-9 pl-9 text-sekkha-ink transition outline-none focus:border-sekkha-brand-blue"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-sekkha-slate hover:text-sekkha-ink"
                >
                  <XIcon className="size-4" />
                </button>
              )}
            </div>

            {/* Right: Controls Group (View Toggle + Sort Dropdown + Refresh Button + Reset Filter) */}
            <div className="flex w-full flex-col gap-2 md:w-auto">
              <div className="flex w-full items-center justify-between gap-2">
                {/* 1. View Mode Toggle */}
                <div className="flex shrink-0 items-center rounded-xl border border-sekkha-hairline-soft bg-sekkha-surface p-1 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={`text-caption-bold flex cursor-pointer items-center justify-center rounded-lg p-1.5 transition sm:px-2.5 sm:py-1.5 ${
                      viewMode === "grid"
                        ? "bg-white font-bold text-sekkha-ink shadow-2xs"
                        : "text-sekkha-slate hover:text-sekkha-ink"
                    }`}
                    title="Grid View (Cards)"
                  >
                    <LayoutGridIcon className="size-4" />
                    <span className="ml-1 hidden sm:inline">Grid</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={`text-caption-bold flex cursor-pointer items-center justify-center rounded-lg p-1.5 transition sm:px-2.5 sm:py-1.5 ${
                      viewMode === "list"
                        ? "bg-white font-bold text-sekkha-ink shadow-2xs"
                        : "text-sekkha-slate hover:text-sekkha-ink"
                    }`}
                    title="List View (Table)"
                  >
                    <ListIcon className="size-4" />
                    <span className="ml-1 hidden sm:inline">List</span>
                  </button>
                </div>

                {/* 2. Sort Dropdown */}
                <div className="text-caption-bold flex min-w-0 flex-1 items-center gap-1 rounded-xl border border-sekkha-hairline-soft bg-sekkha-surface px-2.5 py-1.5 text-sekkha-ink sm:flex-none">
                  <ArrowUpDownIcon className="size-3.5 shrink-0 text-sekkha-muted" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="text-caption-bold w-full cursor-pointer truncate bg-transparent text-sekkha-ink outline-none"
                  >
                    <option value="longest_absence">Longest Absent</option>
                    <option value="consecutive_missed">
                      Consecutive Missed
                    </option>
                    <option value="name">Name (A-Z)</option>
                  </select>
                </div>

                {/* 3. Refresh Button */}
                <button
                  onClick={() => loadData(true)}
                  disabled={isRefreshing}
                  className="text-caption-bold flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-sekkha-hairline-soft bg-sekkha-surface p-2 font-bold text-sekkha-ink transition hover:bg-sekkha-hairline-soft disabled:opacity-50 sm:px-3 sm:py-1.5"
                  title="Refresh Data"
                >
                  <RefreshCwIcon
                    className={`size-4 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>

              {/* Reset Level Filter Badge (If filter is active) */}
              {activeLevel !== "all" && (
                <div className="flex items-center justify-end">
                  <button
                    onClick={() => setActiveLevel("all")}
                    className="text-micro-bold inline-flex cursor-pointer items-center gap-1 rounded-lg bg-sekkha-brand-blue/10 px-2.5 py-1 font-bold text-sekkha-brand-blue transition hover:bg-sekkha-brand-blue/20"
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
                <p className="text-body-sm font-medium">
                  Loading member recency data...
                </p>
              </div>
            </div>
          ) : members.length === 0 ? (
            <div className="flex h-56 flex-col items-center justify-center rounded-2xl border border-sekkha-hairline-soft bg-sekkha-canvas text-center">
              <UserCheckIcon className="size-10 text-sekkha-muted/60" />
              <p className="text-body-sm-medium mt-2 font-bold text-sekkha-ink">
                No members found
              </p>
              <p className="text-caption text-sekkha-slate">
                Try changing search keywords or click a card above to filter.
              </p>
            </div>
          ) : viewMode === "grid" ? (
            /* ── GRID VIEW ── */
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {paginatedMembers.map((m) => {
                const overrideLevel = userStatusOverrides[m.userId]
                const effectiveLevel = overrideLevel || m.level
                const config = LEVEL_CONFIG[effectiveLevel]

                const actionId =
                  userActionStatuses[m.userId] ||
                  (followedUpUserIds[m.userId] ? "sapa_wa" : "none")
                const actionConfig =
                  ACTION_STATUS_OPTIONS.find((a) => a.id === actionId) ||
                  ACTION_STATUS_OPTIONS[0]

                return (
                  <div
                    key={m.userId}
                    className={`group relative flex flex-col justify-between rounded-2xl border bg-sekkha-canvas p-4 shadow-xs transition-all duration-200 ${config.cardBorder} ${config.cardHoverBorder} hover:shadow-md`}
                  >
                    <div>
                      {/* Avatar, Name, Email, Status Badge */}
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className="text-caption-bold relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-sekkha-brand-blue/20 to-sekkha-brand-blue/5 font-extrabold text-sekkha-brand-blue shadow-xs">
                            {m.avatarUrl ? (
                              <img
                                src={m.avatarUrl}
                                alt={m.name}
                                className="size-full object-cover"
                              />
                            ) : (
                              m.name.slice(0, 2).toUpperCase()
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 truncate">
                              <h3 className="text-caption-bold truncate font-bold text-sekkha-ink transition group-hover:text-sekkha-brand-blue">
                                {m.name}
                              </h3>
                              <span className="shrink-0 rounded-md bg-sekkha-surface px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-sekkha-slate uppercase">
                                {m.role}
                              </span>
                            </div>
                            <p className="truncate text-[11px] text-sekkha-slate">
                              {m.email}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span
                            className={`inline-flex items-center gap-1 rounded-xl border px-2 py-0.5 text-[11px] font-bold ${config.badgeBg}`}
                          >
                            {config.shortLabel}
                          </span>
                          {overrideLevel && (
                            <span className="py-0.2 rounded-md bg-sekkha-brand-blue/10 px-1.5 text-[9px] font-extrabold text-sekkha-brand-blue">
                              Override
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Streamlined Metric: Missed Events */}
                      <div className="my-3 flex items-center justify-between rounded-xl border border-sekkha-hairline-soft bg-sekkha-surface px-3 py-2">
                        <span className="text-[11px] text-sekkha-slate">
                          Missed Events:
                        </span>
                        <span className="text-caption-bold font-extrabold text-sekkha-ink">
                          {m.consecutiveMissedEvents}x Events
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
                    <div className="space-y-3 border-t border-sekkha-hairline-soft pt-1">
                      <div className="text-caption flex items-center justify-between text-sekkha-slate">
                        <span className="text-[11px]">4-Week Trend:</span>
                        {(() => {
                          const missedCount = Math.min(
                            4,
                            Math.max(0, m.consecutiveMissedEvents)
                          )
                          const attendedCount = 4 - missedCount
                          return (
                            <div
                              className="flex items-center gap-1.5"
                              title="4-Week Attendance Snapshot (1 Month)"
                            >
                              {Array.from({ length: attendedCount }).map(
                                (_, i) => (
                                  <span
                                    key={`att-${i}`}
                                    title={`Week ${i + 1}: Attended`}
                                    className="size-2.5 rounded-full bg-emerald-500 shadow-xs"
                                  />
                                )
                              )}
                              {Array.from({ length: missedCount }).map(
                                (_, i) => (
                                  <span
                                    key={`miss-${i}`}
                                    title={`Week ${attendedCount + i + 1}: Absent`}
                                    className="size-2.5 rounded-full bg-rose-400 opacity-80"
                                  />
                                )
                              )}
                            </div>
                          )
                        })()}
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={getWhatsAppUrl(m.name, m.phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDirectWA(m.userId)
                          }}
                          className={`text-caption-bold inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 font-bold transition ${
                            actionId !== "none"
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500 hover:text-white dark:text-emerald-400"
                          }`}
                        >
                          <MessageCircleIcon className="size-4" />
                          {actionId !== "none" ? "✓ Actioned" : "WhatsApp"}
                        </a>

                        <button
                          type="button"
                          onClick={() => handleOpenDetail(m.userId)}
                          className="text-caption-bold inline-flex cursor-pointer items-center justify-center gap-1 rounded-xl border border-sekkha-hairline-soft bg-sekkha-surface px-3 py-2 font-bold text-sekkha-ink transition hover:bg-sekkha-hairline-soft"
                        >
                          Details <ChevronRightIcon className="size-4" />
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
              <table className="w-full min-w-[660px] border-collapse text-left">
                <thead>
                  <tr className="text-micro border-b border-sekkha-hairline-soft bg-sekkha-surface/60 font-extrabold tracking-wider text-sekkha-slate uppercase">
                    <th className="px-4 py-3.5">Member</th>
                    <th className="px-4 py-3.5">Risk Level</th>
                    <th className="px-4 py-3.5 text-center">Missed Events</th>
                    <th className="px-4 py-3.5">Action Status</th>
                    <th className="px-4 py-3.5 text-center">4-Week Trend</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-body-sm divide-y divide-sekkha-hairline-soft/80">
                  {paginatedMembers.map((m) => {
                    const overrideLevel = userStatusOverrides[m.userId]
                    const effectiveLevel = overrideLevel || m.level
                    const config = LEVEL_CONFIG[effectiveLevel]

                    const actionId =
                      userActionStatuses[m.userId] ||
                      (followedUpUserIds[m.userId] ? "sapa_wa" : "none")
                    const actionConfig =
                      ACTION_STATUS_OPTIONS.find((a) => a.id === actionId) ||
                      ACTION_STATUS_OPTIONS[0]

                    const missedCount = Math.min(
                      4,
                      Math.max(0, m.consecutiveMissedEvents)
                    )
                    const attendedCount = 4 - missedCount

                    return (
                      <tr
                        key={m.userId}
                        className="transition-colors hover:bg-sekkha-surface/50"
                      >
                        {/* Member Info */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="text-caption-bold relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-sekkha-brand-blue/10 font-bold text-sekkha-brand-blue shadow-2xs">
                              {m.avatarUrl ? (
                                <img
                                  src={m.avatarUrl}
                                  alt={m.name}
                                  className="size-full object-cover"
                                />
                              ) : (
                                m.name.slice(0, 2).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="truncate font-bold text-sekkha-ink">
                                  {m.name}
                                </p>
                                <span className="py-0.2 rounded-md bg-sekkha-surface px-1.5 text-[9px] font-bold tracking-wider text-sekkha-slate uppercase">
                                  {m.role}
                                </span>
                              </div>
                              <p className="text-micro truncate text-sekkha-slate">
                                {m.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Status Risk Level */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-micro-bold inline-flex items-center gap-1 rounded-xl border px-2 py-0.5 font-bold ${config.badgeBg}`}
                            >
                              {config.shortLabel}
                            </span>
                            {overrideLevel && (
                              <span className="py-0.2 rounded-md bg-sekkha-brand-blue/10 px-1.5 text-[9px] font-extrabold text-sekkha-brand-blue">
                                Override
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Missed Events */}
                        <td className="px-4 py-3 text-center">
                          <span className="text-caption-bold inline-flex items-center rounded-lg border border-sekkha-hairline-soft bg-sekkha-surface px-2.5 py-1 font-extrabold text-sekkha-ink">
                            {m.consecutiveMissedEvents}x Events
                          </span>
                        </td>

                        {/* Action Status */}
                        <td className="px-4 py-3">
                          <span
                            className={`text-micro-bold inline-flex items-center gap-1 rounded-xl border px-2.5 py-1 font-bold ${actionConfig.color}`}
                          >
                            <span>{actionConfig.icon}</span>
                            <span>{actionConfig.label}</span>
                          </span>
                        </td>

                        {/* 4-Week Trend */}
                        <td className="px-4 py-3">
                          <div
                            className="flex items-center justify-center gap-1"
                            title="4-Week Attendance Snapshot (1 Month)"
                          >
                            {Array.from({ length: attendedCount }).map(
                              (_, i) => (
                                <span
                                  key={`att-${i}`}
                                  title={`Week ${i + 1}: Attended`}
                                  className="size-2.5 rounded-full bg-emerald-500 shadow-xs"
                                />
                              )
                            )}
                            {Array.from({ length: missedCount }).map((_, i) => (
                              <span
                                key={`miss-${i}`}
                                title={`Week ${attendedCount + i + 1}: Absent`}
                                className="size-2.5 rounded-full bg-rose-400 opacity-80"
                              />
                            ))}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <a
                              href={getWhatsAppUrl(m.name, m.phone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDirectWA(m.userId)
                              }}
                              className={`text-micro-bold inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 font-bold transition ${
                                actionId !== "none"
                                  ? "border-emerald-600 bg-emerald-600 text-white"
                                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500 hover:text-white dark:text-emerald-400"
                              }`}
                            >
                              <MessageCircleIcon className="size-3.5" />
                              <span>
                                {actionId !== "none" ? "Done" : "WhatsApp"}
                              </span>
                            </a>

                            <button
                              type="button"
                              onClick={() => handleOpenDetail(m.userId)}
                              className="text-micro-bold inline-flex cursor-pointer items-center gap-1 rounded-lg border border-sekkha-hairline-soft bg-sekkha-surface px-2.5 py-1.5 font-bold text-sekkha-ink hover:bg-sekkha-hairline-soft"
                            >
                              <span>Details</span>
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
            <div className="text-caption flex flex-col gap-2.5 rounded-2xl border border-sekkha-hairline-soft bg-sekkha-canvas p-3 text-sekkha-slate shadow-2xs sm:flex-row sm:items-center sm:justify-between sm:p-4">
              {/* Left: Range Info & Page Size Select */}
              <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-start">
                <span className="text-micro sm:text-caption">
                  Showing{" "}
                  <strong className="text-sekkha-ink">{startIndex + 1}</strong>–
                  <strong className="text-sekkha-ink">{endIndex}</strong> of{" "}
                  <strong className="text-sekkha-ink">{totalItems}</strong>{" "}
                  members
                </span>

                <div className="flex items-center gap-1.5 sm:border-l sm:border-sekkha-hairline-soft sm:pl-3">
                  <span className="text-micro hidden text-sekkha-slate sm:inline">
                    Show:
                  </span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value))
                      setCurrentPage(1)
                    }}
                    className="text-micro-bold cursor-pointer rounded-lg border border-sekkha-hairline-soft bg-sekkha-surface px-2 py-1 text-sekkha-ink outline-none"
                  >
                    <option value={12}>12 / page</option>
                    <option value={24}>24 / page</option>
                    <option value={48}>48 / page</option>
                  </select>
                </div>
              </div>

              {/* Right: Page Navigation Buttons */}
              <div className="flex w-full items-center justify-center gap-1 overflow-x-auto py-0.5 sm:w-auto sm:justify-end">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={validCurrentPage === 1}
                  className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-sekkha-hairline-soft bg-sekkha-surface text-sekkha-slate transition hover:bg-sekkha-hairline-soft disabled:cursor-not-allowed disabled:opacity-40"
                  title="First Page"
                >
                  <ChevronsLeftIcon className="size-4" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={validCurrentPage === 1}
                  className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-sekkha-hairline-soft bg-sekkha-surface text-sekkha-slate transition hover:bg-sekkha-hairline-soft disabled:cursor-not-allowed disabled:opacity-40"
                  title="Previous Page"
                >
                  <ChevronLeftIcon className="size-4" />
                </button>

                {/* Page Numbers */}
                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`text-micro-bold flex size-8 cursor-pointer items-center justify-center rounded-lg transition ${
                          page === validCurrentPage
                            ? "bg-sekkha-brand-blue font-bold text-white shadow-2xs"
                            : "border border-sekkha-hairline-soft bg-sekkha-surface text-sekkha-slate hover:bg-sekkha-hairline-soft"
                        }`}
                      >
                        {page}
                      </button>
                    )
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={validCurrentPage === totalPages}
                  className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-sekkha-hairline-soft bg-sekkha-surface text-sekkha-slate transition hover:bg-sekkha-hairline-soft disabled:cursor-not-allowed disabled:opacity-40"
                  title="Next Page"
                >
                  <ChevronRightIcon className="size-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={validCurrentPage === totalPages}
                  className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-sekkha-hairline-soft bg-sekkha-surface text-sekkha-slate transition hover:bg-sekkha-hairline-soft disabled:cursor-not-allowed disabled:opacity-40"
                  title="Last Page"
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
        <div className="animate-fadeIn fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md transition-all">
          <div className="relative max-h-[92vh] w-full max-w-2xl space-y-6 overflow-y-auto rounded-3xl border border-sekkha-hairline-soft bg-sekkha-canvas p-6.5 shadow-2xl">
            <button
              onClick={handleCloseDetail}
              className="absolute top-5 right-5 flex size-9 items-center justify-center rounded-full border border-sekkha-hairline-soft bg-sekkha-surface text-sekkha-slate transition hover:bg-sekkha-hairline-soft hover:text-sekkha-ink"
            >
              <XIcon className="size-5" />
            </button>

            {isDetailLoading || !memberDetail ? (
              <div className="flex h-64 flex-col items-center justify-center gap-2">
                <RefreshCwIcon className="size-7 animate-spin text-sekkha-brand-blue" />
                <p className="text-body-sm font-semibold text-sekkha-slate">
                  Loading member details & history...
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Header Banner Member */}
                <div className="flex flex-col gap-4 rounded-3xl border border-sekkha-hairline-soft bg-gradient-to-br from-sekkha-surface via-sekkha-canvas to-sekkha-surface p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-heading-4 relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-sekkha-brand-blue/20 to-sekkha-brand-blue/5 font-bold text-sekkha-brand-blue shadow-xs">
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
                        <h2 className="text-heading-4 font-extrabold text-sekkha-ink">
                          {memberDetail.member.name}
                        </h2>
                        <span className="text-caption-bold rounded-md bg-sekkha-brand-blue/10 px-2 py-0.5 font-bold tracking-wider text-sekkha-brand-blue uppercase">
                          {memberDetail.member.role}
                        </span>
                      </div>
                      <p className="text-body-sm text-sekkha-slate">
                        {memberDetail.member.email}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                    {(() => {
                      const curLevel =
                        draftOverrideLevel === "auto"
                          ? memberDetail.member.level
                          : draftOverrideLevel
                      const cfg = LEVEL_CONFIG[curLevel]
                      return (
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`text-caption-bold inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 font-bold ${cfg.badgeBg}`}
                          >
                            {cfg.shortLabel}
                          </span>
                          {draftOverrideLevel !== "auto" && (
                            <span className="rounded-md bg-sekkha-brand-blue/10 px-2 py-0.5 text-[10px] font-extrabold text-sekkha-brand-blue">
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
                  <div className="text-body-sm animate-fadeIn flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 font-bold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2Icon className="size-5 shrink-0" />
                    Member status changes saved successfully!
                  </div>
                )}

                {/* 🛠 PENGURUS TAKE ACTION & MANUAL OVERRIDE BOX (DRAFT STATE) */}
                <div className="space-y-5 rounded-3xl border border-sekkha-brand-blue/30 bg-gradient-to-br from-sekkha-brand-blue/5 via-sekkha-canvas to-sekkha-surface p-5.5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-sekkha-brand-blue/20 pb-3">
                    <div className="text-body-sm-medium flex items-center gap-2 font-bold text-sekkha-brand-blue">
                      <WrenchIcon className="size-4.5" />
                      Organizer Action & Status Override
                    </div>
                    <span className="text-[11px] font-semibold text-sekkha-slate">
                      Select & Click Save
                    </span>
                  </div>

                  {/* 1. Status Action Selector Pills */}
                  <div className="space-y-2">
                    <label className="text-caption-bold block font-bold text-sekkha-ink">
                      Follow-up / Action Status
                    </label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {ACTION_STATUS_OPTIONS.map((opt) => {
                        const isSelected = draftActionId === opt.id

                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setDraftActionId(opt.id)}
                            className={`text-caption-bold flex items-center gap-2 rounded-2xl border p-2.5 text-left transition-all ${
                              isSelected
                                ? "border-sekkha-brand-blue bg-sekkha-brand-blue/10 text-sekkha-brand-blue shadow-xs ring-2 ring-sekkha-brand-blue/20"
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
                  <div className="space-y-2 border-t border-sekkha-hairline-soft pt-1">
                    <label className="text-caption-bold block font-bold text-sekkha-ink">
                      Override Member Alert Status
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      {[
                        {
                          id: "auto",
                          label: `Auto System (${memberDetail.member.level})`,
                        },
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
                            onClick={() =>
                              setDraftOverrideLevel(
                                item.id as AlertLevel | "auto"
                              )
                            }
                            className={`text-caption-bold rounded-xl border px-3 py-1.5 font-bold transition-all ${
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

                  {/* Actions Footer: Direct WA Button + SAVE BUTTON */}
                  <div className="flex flex-col gap-2 border-t border-sekkha-brand-blue/20 pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <a
                      href={getWhatsAppUrl(
                        memberDetail.member.name,
                        memberDetail.member.phone
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setDraftActionId("sapa_wa")}
                      className="text-caption-bold inline-flex items-center justify-center gap-1.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 font-bold text-emerald-700 transition hover:bg-emerald-500 hover:text-white dark:text-emerald-400"
                    >
                      <MessageCircleIcon className="size-4" />
                      Direct WhatsApp Outreach
                      <ExternalLinkIcon className="size-3.5" />
                    </a>

                    <button
                      type="button"
                      onClick={handleSaveModalChanges}
                      className="text-caption-bold inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-sekkha-brand-blue px-6 py-2.5 font-bold text-white shadow-md transition hover:bg-sekkha-brand-blue/90 active:scale-95"
                    >
                      <SaveIcon className="size-4" />
                      Save Changes
                    </button>
                  </div>
                </div>

                {/* Past Timeline — Exactly 4 Most Recent Events */}
                <div className="space-y-3">
                  <h3 className="text-body-sm-medium flex items-center gap-2 font-bold text-sekkha-ink">
                    <CalendarIcon className="size-4 text-sekkha-brand-blue" />
                    Attendance History (Last 4 Events)
                  </h3>
                  <div className="divide-y divide-sekkha-hairline-soft overflow-hidden rounded-2xl border border-sekkha-hairline-soft bg-sekkha-canvas">
                    {memberDetail.eventTimeline.length === 0 ? (
                      <p className="text-caption p-4 text-center text-sekkha-slate">
                        No completed routine events yet.
                      </p>
                    ) : (
                      memberDetail.eventTimeline.slice(0, 4).map((ev) => (
                        <div
                          key={ev.eventId}
                          className="flex items-center justify-between p-3.5 transition hover:bg-sekkha-surface"
                        >
                          <div>
                            <p className="text-body-sm font-semibold text-sekkha-ink">
                              {ev.title}
                            </p>
                            <p className="text-caption text-sekkha-slate">
                              {new Date(ev.eventDate).toLocaleDateString(
                                "en-US",
                                {
                                  weekday: "long",
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                }
                              )}
                            </p>
                          </div>
                          <div>
                            {ev.attended ? (
                              <span className="text-caption-bold inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 font-bold text-emerald-700 dark:text-emerald-400">
                                <UserCheckIcon className="size-3.5" /> Present
                              </span>
                            ) : (
                              <span className="text-caption-bold inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-3 py-1 font-bold text-rose-700 dark:text-rose-400">
                                <UserXIcon className="size-3.5" /> Absent
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
