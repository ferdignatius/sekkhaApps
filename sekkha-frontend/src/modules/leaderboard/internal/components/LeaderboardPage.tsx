// feature/leaderboard/components/LeaderboardPage
// Top 10 responsive Leaderboard with Podium (1-3), List (4-10), and inline bottom rank (>10).

import { useState, useEffect, useRef, useMemo } from "react"
import {
  StarIcon,
  CheckSquareIcon,
  TrophyIcon,
  UserIcon,
  ShieldCheckIcon,
  AwardIcon,
  RefreshCwIcon,
  AlertCircleIcon,
  CheckIcon,
} from "lucide-react"
import { useAuth } from "@/modules/auth"
import { api } from "@/lib/api"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { Tabs, TabsList, TabsTrigger } from "@/components/base"
import type { LeaderboardMetric, LeaderboardEntry } from "../types"
import { LeaderboardHeader } from "./LeaderboardHeader"
import type { SeasonPeriodOption, SeasonSummary } from "./LeaderboardHeader"
import { LeaderboardPodium, formatDisplayHandle } from "./LeaderboardPodium"
import { LeaderboardList } from "./LeaderboardList"
import { CommunityGoalWidget } from "./CommunityGoalWidget"

const LEADERBOARD_LIMIT = 10

const METRIC_OPTIONS: {
  value: LeaderboardMetric
  label: string
  shortLabel: string
  icon: React.ReactNode
}[] = [
  {
    value: "points",
    label: "Total Points",
    shortLabel: "Points",
    icon: <StarIcon className="size-4" aria-hidden="true" />,
  },
  {
    value: "attendance",
    label: "Attendance",
    shortLabel: "Check-ins",
    icon: <CheckSquareIcon className="size-4" aria-hidden="true" />,
  },
]

export type RoleCheckboxKey = "umat" | "aktivis" | "pengurus"

const PENGURUS_ROLE_CHECKBOXES: {
  id: RoleCheckboxKey
  label: string
  icon: React.ReactNode
}[] = [
  {
    id: "umat",
    label: "Members",
    icon: <UserIcon className="size-3.5" aria-hidden="true" />,
  },
  {
    id: "aktivis",
    label: "Activists",
    icon: <AwardIcon className="size-3.5" aria-hidden="true" />,
  },
  {
    id: "pengurus",
    label: "Organizers",
    icon: <ShieldCheckIcon className="size-3.5" aria-hidden="true" />,
  },
]

const AKTIVIS_ROLE_CHECKBOXES: {
  id: RoleCheckboxKey
  label: string
  icon: React.ReactNode
}[] = [
  {
    id: "umat",
    label: "Members",
    icon: <UserIcon className="size-3.5" aria-hidden="true" />,
  },
  {
    id: "aktivis",
    label: "Activists",
    icon: <AwardIcon className="size-3.5" aria-hidden="true" />,
  },
]

export function LeaderboardPage() {
  const { authState } = useAuth()
  const myId =
    authState.status === "authenticated" ? (authState.userId ?? "") : ""
  const userRole =
    authState.status === "authenticated" ? authState.role : "member"
  const isPengurusOrAdmin =
    userRole === "admin" ||
    userRole === "organizer" ||
    (userRole as string) === "pengurus"
  const isAktivis =
    userRole === "activist" || (userRole as string) === "aktivis"
  const isUmatOnly = !isPengurusOrAdmin && !isAktivis

  const [metric, setMetric] = useState<LeaderboardMetric>("points")

  const [selectedRoles, setSelectedRoles] = useState<RoleCheckboxKey[]>(() =>
    isAktivis ? ["umat", "aktivis"] : ["umat", "aktivis", "pengurus"]
  )

  useEffect(() => {
    if (isAktivis) {
      setSelectedRoles((prev) => {
        const next = prev.filter(
          (r): r is RoleCheckboxKey => r === "umat" || r === "aktivis"
        )
        return next.length === prev.length
          ? prev
          : next.length > 0
            ? next
            : ["umat", "aktivis"]
      })
    }
  }, [isAktivis])

  function toggleRole(role: RoleCheckboxKey) {
    setSelectedRoles((prev) => {
      const base = isAktivis
        ? prev.filter(
            (r): r is RoleCheckboxKey => r === "umat" || r === "aktivis"
          )
        : prev
      if (base.includes(role)) {
        if (base.length === 1) return base
        return base.filter((r) => r !== role)
      }
      return [...base, role]
    })
  }

  const activeRoles: RoleCheckboxKey[] = useMemo(() => {
    if (isUmatOnly) return ["umat"]
    if (isAktivis) {
      const filtered = selectedRoles.filter(
        (r): r is RoleCheckboxKey => r === "umat" || r === "aktivis"
      )
      return filtered.length > 0 ? filtered : ["umat", "aktivis"]
    }
    return selectedRoles
  }, [isUmatOnly, isAktivis, selectedRoles])
  const roleScope = activeRoles.join(",")

  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [myRankData, setMyRankData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const forceRefreshRef = useRef(false)
  const [seasonData, setSeasonData] = useState<SeasonSummary | null>(null)
  const [availablePeriods, setAvailablePeriods] = useState<SeasonPeriodOption[]>(
    []
  )
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string>("default")
  const [communityGoal, setCommunityGoal] = useState({
    current: 0,
    target: 500,
    label: "Community Attendance Target",
  })

  const leaderboardCacheRef = useRef(
    new Map<
      string,
      {
        entries: LeaderboardEntry[]
        myRankData: any
        seasonData: SeasonSummary | null
        communityGoal: { current: number; target: number; label: string }
        availablePeriods: SeasonPeriodOption[]
      }
    >()
  )

  useEffect(() => {
    let cancelled = false

    async function fetchLeaderboard() {
      const cacheKey = `${metric}:${roleScope}:${selectedPeriodKey}`
      const cached = leaderboardCacheRef.current.get(cacheKey)
      if (cached && !forceRefreshRef.current) {
        setEntries(cached.entries)
        setMyRankData(cached.myRankData)
        setSeasonData(cached.seasonData)
        setCommunityGoal(cached.communityGoal)
        setAvailablePeriods(cached.availablePeriods)
        setIsLoading(false)
        return
      }

      setIsLoading(!cached)
      setLoadError(null)

      try {
        const refreshParam = forceRefreshRef.current ? "&refresh=true" : ""
        const periodParam =
          selectedPeriodKey !== "default"
            ? `&period=${encodeURIComponent(selectedPeriodKey)}`
            : ""
        forceRefreshRef.current = false
        const res = await api.get<{
          entries: LeaderboardEntry[]
          my_rank: any
          season?: any
          available_periods?: SeasonPeriodOption[]
          community_goal?: { current: number; target: number; label: string }
        }>(
          `/leaderboard?metric=${metric}${periodParam}&roles=${encodeURIComponent(roleScope)}&limit=${LEADERBOARD_LIMIT}${refreshParam}`,
          { noCache: true }
        )

        if (cancelled) return
        setEntries(res.entries ?? [])
        setMyRankData(res.my_rank ?? null)
        if (res.season) setSeasonData(res.season)
        if (res.available_periods) setAvailablePeriods(res.available_periods)
        if (res.community_goal) setCommunityGoal(res.community_goal)
        leaderboardCacheRef.current.set(cacheKey, {
          entries: res.entries ?? [],
          myRankData: res.my_rank ?? null,
          seasonData: res.season ?? null,
          communityGoal: res.community_goal ?? {
            current: 0,
            target: 500,
            label: "Community Attendance Target",
          },
          availablePeriods: res.available_periods ?? [],
        })
      } catch (err) {
        if (cancelled) return
        console.error("Failed to load leaderboard:", err)
        setEntries([])
        setMyRankData(null)
        setLoadError(
          "Leaderboard could not be loaded. Please check your connection and try again."
        )
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void fetchLeaderboard()
    return () => {
      cancelled = true
    }
  }, [metric, selectedPeriodKey, reloadToken, roleScope, authState.status])

  function handleRetry() {
    forceRefreshRef.current = true
    setReloadToken((token) => token + 1)
  }

  const validEntries = useMemo(
    () =>
      (Array.isArray(entries) ? entries : []).filter(
        (e): e is LeaderboardEntry =>
          Boolean(e) && typeof e === "object" && typeof e.value === "number"
      ),
    [entries]
  )

  const filteredEntries = useMemo(
    () =>
      validEntries
        .filter((entry) => {
          const rawRole = (entry.role || "umat").toLowerCase()
          const normalizedRole: RoleCheckboxKey =
            rawRole === "admin" ||
            rawRole === "organizer" ||
            rawRole === "pengurus"
              ? "pengurus"
              : rawRole === "activist" || rawRole === "aktivis"
                ? "aktivis"
                : "umat"
          return activeRoles.includes(normalizedRole)
        })
        .slice(0, LEADERBOARD_LIMIT)
        .map((entry, idx) => ({
          ...entry,
          rank: idx + 1,
        })),
    [validEntries, activeRoles]
  )

  const podium = filteredEntries.slice(0, 3)
  const rest = filteredEntries.slice(3, 10)

  const myFilteredIdx = useMemo(
    () => filteredEntries.findIndex((e) => e.user_id === myId),
    [filteredEntries, myId]
  )

  const metricUnit = metric === "points" ? "points" : "attendances"

  // Show personal card cleanly at the bottom below Rank #10 when user ranks > 10
  const outsideTop10Entry: LeaderboardEntry | null = useMemo(() => {
    if (!myId || myFilteredIdx >= 0) return null
    if (
      !myRankData ||
      typeof myRankData.rank !== "number" ||
      myRankData.rank <= 10 ||
      typeof myRankData.value !== "number"
    ) {
      return null
    }
    return {
      user_id: myId,
      username: myRankData.username || authState.username || undefined,
      name: formatDisplayHandle(
        myRankData.username || authState.username,
        myRankData.name || authState.name || "You"
      ),
      initials: myRankData.initials || "YO",
      value: myRankData.value,
      rank: myRankData.rank,
      label: `${myRankData.value} ${metricUnit}`,
      role: (myRankData.role || userRole || "member") as any,
    }
  }, [
    myId,
    myFilteredIdx,
    myRankData,
    authState.username,
    authState.name,
    metricUnit,
    userRole,
  ])

  const roleGroupLabel =
    activeRoles.length === 3
      ? "All Members"
      : activeRoles
          .map((r) =>
            r === "umat"
              ? "Members"
              : r === "aktivis"
                ? "Activists"
                : "Organizers"
          )
          .join(" & ")

  const roleFilterList = isPengurusOrAdmin
    ? PENGURUS_ROLE_CHECKBOXES
    : isAktivis
      ? AKTIVIS_ROLE_CHECKBOXES
      : []

  return (
    <main className="relative min-h-screen bg-canvas text-left font-sans antialiased">
      <PageBreadcrumb items={[{ label: "Leaderboard" }]} />

      <div className="px-3.5 py-4 pb-32 sm:px-6 sm:py-6 md:px-8 md:pb-12 lg:px-12">
        <div className="mx-auto max-w-7xl space-y-4">
          {/* ── Unified Hero Header + Period Tabs ── */}
          <LeaderboardHeader
            seasonData={seasonData}
            availablePeriods={availablePeriods}
            selectedPeriodKey={selectedPeriodKey}
            onSelectPeriod={setSelectedPeriodKey}
            isLoading={isLoading}
            onRefresh={handleRetry}
          />

          {/* ── Streamlined Filter Row ── */}
          <div className="flex flex-col justify-between gap-2.5 md:flex-row md:items-center">
            <Tabs
              value={metric}
              onValueChange={(val) => setMetric(val as LeaderboardMetric)}
              variant="pill"
              aria-label="Leaderboard metric"
            >
              <TabsList className="w-full md:w-auto">
                {METRIC_OPTIONS.map((m) => (
                  <TabsTrigger
                    key={m.value}
                    value={m.value}
                    className="min-h-[44px] flex-1 px-2 text-xs sm:px-3.5 sm:text-sm md:flex-none"
                  >
                    {m.icon}
                    <span className="sm:hidden">{m.shortLabel}</span>
                    <span className="hidden sm:inline">{m.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {roleFilterList.length > 0 && (
              <div
                role="group"
                aria-label="Role visibility filter"
                className="flex w-full scrollbar-none flex-nowrap items-center gap-1.5 overflow-x-auto pb-0.5 md:w-auto md:flex-wrap md:overflow-visible md:pb-0"
              >
                <span className="hidden px-1 text-[10px] font-bold tracking-wider text-text-muted uppercase sm:inline">
                  Show:
                </span>
                {roleFilterList.map((r) => {
                  const isChecked = selectedRoles.includes(r.id)
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleRole(r.id)}
                      aria-pressed={isChecked}
                      aria-label={`${isChecked ? "Hide" : "Show"} ${r.label}`}
                      className={`inline-flex min-h-[38px] shrink-0 cursor-pointer items-center gap-1.5 rounded-sm border px-3 py-1.5 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none ${
                        isChecked
                          ? "border-ink/40 bg-surface-card font-bold text-ink shadow-2xs"
                          : "border-hairline bg-canvas font-medium text-text-muted hover:text-ink"
                      }`}
                    >
                      {isChecked ? (
                        <CheckIcon
                          className="size-3.5 stroke-[2.5] text-clay-teal"
                          aria-hidden="true"
                        />
                      ) : (
                        r.icon
                      )}
                      <span>{r.label}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {isUmatOnly && (
              <div className="inline-flex items-center gap-1.5 self-start rounded-sm border border-hairline bg-surface-soft px-3 py-1.5 text-xs font-semibold text-text-muted">
                <UserIcon className="size-3.5 text-ink" aria-hidden="true" />
                <span>
                  Rankings:{" "}
                  <strong className="text-ink">Fellow Members</strong>
                </span>
              </div>
            )}
          </div>

          {/* ── Responsive Two-Column Layout (Top 10 + Bottom Self Rank) ── */}
          <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-12 lg:gap-6">
            <div className="space-y-4 md:col-span-8">
              <div className="space-y-4 sm:rounded-xl sm:border sm:border-hairline sm:bg-surface-soft/50 sm:p-5">
                {isLoading ? (
                  <div
                    role="status"
                    aria-live="polite"
                    className="space-y-3 py-2"
                  >
                    <span className="sr-only">Loading leaderboard…</span>
                    <div className="flex items-end justify-center gap-3 rounded-lg bg-surface-soft p-5 sm:gap-5">
                      <div className="h-20 w-20 animate-pulse rounded-md bg-surface-strong" />
                      <div className="h-28 w-24 animate-pulse rounded-md bg-clay-ochre/40" />
                      <div className="h-16 w-20 animate-pulse rounded-md bg-surface-strong" />
                    </div>
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={index}
                        className="flex min-h-[60px] items-center gap-3 rounded-lg border border-hairline bg-surface-soft/70 p-3"
                      >
                        <div className="size-6 animate-pulse rounded bg-surface-strong" />
                        <div className="size-10 animate-pulse rounded-sm bg-surface-strong" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 w-2/5 animate-pulse rounded bg-surface-strong" />
                          <div className="h-2.5 w-1/4 animate-pulse rounded bg-surface-strong" />
                        </div>
                        <div className="h-4 w-12 animate-pulse rounded bg-surface-strong" />
                      </div>
                    ))}
                  </div>
                ) : loadError ? (
                  <div
                    role="alert"
                    className="flex flex-col items-center justify-center gap-4 rounded-xl border border-hairline bg-surface-soft px-4 py-14 text-center"
                  >
                    <div className="flex size-12 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                      <AlertCircleIcon className="size-6" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-ink">
                        Unable to load leaderboard
                      </h3>
                      <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-text-muted">
                        {loadError}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRetry}
                      className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-md bg-ink px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-clay-primary-active focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:outline-none"
                    >
                      <RefreshCwIcon className="size-4" aria-hidden="true" />
                      Try again
                    </button>
                  </div>
                ) : filteredEntries.length === 0 ? (
                  <div className="space-y-3 rounded-xl border border-dashed border-hairline bg-canvas px-4 py-12 text-center">
                    <div className="mx-auto flex size-12 items-center justify-center rounded-md border border-hairline bg-surface-soft text-clay-ochre">
                      <TrophyIcon className="size-6" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-ink">
                        No Ranking Data Found
                      </h3>
                      <p className="mx-auto mt-1 max-w-sm text-xs text-text-muted">
                        No members found in <strong>{roleGroupLabel}</strong>{" "}
                        category for this season.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <LeaderboardPodium podium={podium} myId={myId} />

                    <LeaderboardList
                      rest={rest}
                      allEntries={filteredEntries}
                      outsideTop10Entry={outsideTop10Entry}
                      myId={myId}
                      metricUnit={metricUnit}
                      roleGroupLabel={roleGroupLabel}
                    />
                  </>
                )}
              </div>
            </div>

            <CommunityGoalWidget
              current={communityGoal.current}
              target={communityGoal.target}
              label={communityGoal.label}
              seasonTargetOverride={seasonData?.target_attendance}
            />
          </div>
        </div>
      </div>
    </main>
  )
}
