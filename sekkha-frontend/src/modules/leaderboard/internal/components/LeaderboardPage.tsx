// feature/leaderboard/components/LeaderboardPage
// Overhauled UI/UX strictly aligned with Clay Design System (DESIGN.md)

import { useState, useEffect } from "react"
import {
  TrophyIcon,
  StarIcon,
  FlameIcon,
  CheckSquareIcon,
  CrownIcon,
  UsersIcon,
  TimerIcon,
  SparklesIcon,
  ZapIcon,
  UserIcon,
  ShieldCheckIcon,
  AwardIcon,
  CheckIcon,
} from "lucide-react"
import { useAuth } from "@/modules/auth"
import { api } from "@/lib/api"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { getCurrentSeason, seasonLabel } from "../types"
import type { LeaderboardMetric, LeaderboardEntry } from "../types"

// ─── Constants ─────────────────────────────────────────────────────────────────

const METRIC_OPTIONS: {
  value: LeaderboardMetric
  label: string
  icon: React.ReactNode
}[] = [
  {
    value: "points",
    label: "Total Points",
    icon: <StarIcon className="size-4" />,
  },
  { value: "streak", label: "Streak", icon: <FlameIcon className="size-4" /> },
  {
    value: "attendance",
    label: "Attendance",
    icon: <CheckSquareIcon className="size-4" />,
  },
]

export type RoleCheckboxKey = "umat" | "aktivis" | "pengurus"

const PENGURUS_ROLE_CHECKBOXES: {
  id: RoleCheckboxKey
  label: string
  icon: React.ReactNode
}[] = [
  { id: "umat", label: "Members", icon: <UserIcon className="size-3.5" /> },
  {
    id: "aktivis",
    label: "Activists",
    icon: <AwardIcon className="size-3.5" />,
  },
  {
    id: "pengurus",
    label: "Organizers",
    icon: <ShieldCheckIcon className="size-3.5" />,
  },
]

const AKTIVIS_ROLE_CHECKBOXES: {
  id: RoleCheckboxKey
  label: string
  icon: React.ReactNode
}[] = [
  { id: "umat", label: "Members", icon: <UserIcon className="size-3.5" /> },
  {
    id: "aktivis",
    label: "Activists",
    icon: <AwardIcon className="size-3.5" />,
  },
]

// Podium Configuration adhering to Clay Design Tokens
const PODIUM_CONFIG: Record<
  1 | 2 | 3,
  {
    height: string
    barBg: string
    border: string
    avatarRing: string
    avatarBg: string
    crownColor: string
    badgeBg: string
    badgeText: string
    rankText: string
  }
> = {
  1: {
    height: "h-20 sm:h-38",
    barBg: "bg-gradient-to-b from-[#e8b94a] to-[#d49e28]",
    border: "border-t border-x border-[#c28e20]",
    avatarRing: "ring-3 sm:ring-4 ring-[#e8b94a]/30 shadow-md",
    avatarBg: "bg-[#e8b94a] text-[#0a0a0a] font-black",
    crownColor: "text-[#e8b94a] fill-[#e8b94a]",
    badgeBg: "bg-[#0a0a0a]",
    badgeText: "text-white",
    rankText: "text-[#0a0a0a]/50 font-black",
  },
  2: {
    height: "h-14 sm:h-26",
    barBg: "bg-gradient-to-b from-[#e5e5e5] to-[#d0d0d0]",
    border: "border-t border-x border-[#bfbfbf]",
    avatarRing: "ring-2 sm:ring-3 ring-[#e5e5e5] shadow-xs",
    avatarBg: "bg-[#e5e5e5] text-[#0a0a0a] font-bold",
    crownColor: "text-[#a0a0a0] fill-[#a0a0a0]",
    badgeBg: "bg-[#6a6a6a]",
    badgeText: "text-white",
    rankText: "text-[#0a0a0a]/40 font-extrabold",
  },
  3: {
    height: "h-10 sm:h-20",
    barBg: "bg-gradient-to-b from-[#d9a07a] to-[#c2845c]",
    border: "border-t border-x border-[#a86e49]",
    avatarRing: "ring-2 sm:ring-3 ring-[#d9a07a]/40 shadow-xs",
    avatarBg: "bg-[#d9a07a] text-white font-bold",
    crownColor: "text-[#c2845c] fill-[#c2845c]",
    badgeBg: "bg-[#8c5230]",
    badgeText: "text-white",
    rankText: "text-white/50 font-bold",
  },
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function getCompetitionHint(
  entry: LeaderboardEntry,
  allEntries: LeaderboardEntry[],
  metricUnit: string
): string | null {
  if (!entry || !allEntries || allEntries.length === 0) return null
  const idx = allEntries.findIndex((e) => e && e.user_id === entry.user_id)
  if (idx <= 0) return null
  const above = allEntries[idx - 1]
  if (
    !above ||
    typeof above.value !== "number" ||
    typeof entry.value !== "number"
  )
    return null
  const diff = above.value - entry.value
  if (diff <= 0) return null
  const aboveName = above.name ? above.name.split(" ")[0] : "the rank above"
  return `${diff.toLocaleString("en-US")} more ${metricUnit} to overtake ${aboveName}!`
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function PodiumEntry({
  entry,
  position,
  myId,
}: {
  entry?: LeaderboardEntry
  position: 1 | 2 | 3
  myId?: string
}) {
  if (!entry) return null
  const isFirst = position === 1
  const isMe = entry.user_id === myId
  const cfg = PODIUM_CONFIG[position]
  const avatarSize = isFirst
    ? "size-11 sm:size-18 text-xs sm:text-base font-black"
    : "size-9 sm:size-13 text-[10px] sm:text-sm font-bold"

  return (
    <div
      className={`relative flex min-w-0 flex-1 flex-col items-center gap-1 transition-all duration-200 sm:gap-1.5 ${
        isMe ? "z-20 scale-102" : ""
      }`}
    >
      {/* Crown Icon for top 3 */}
      {isFirst ? (
        <CrownIcon
          className={`size-5 sm:size-7 ${cfg.crownColor}`}
          aria-hidden="true"
        />
      ) : (
        <span className="text-[10px] font-bold text-[#6a6a6a] sm:text-xs">
          #{position}
        </span>
      )}

      {/* Avatar Container */}
      <div className="relative shrink-0">
        <div
          className={`relative ${avatarSize} flex shrink-0 items-center justify-center rounded-[12px] uppercase sm:rounded-[16px] ${
            isMe
              ? "bg-[#0a0a0a] text-white shadow-md ring-3 ring-[#0a0a0a] sm:ring-4"
              : `${cfg.avatarRing} ${cfg.avatarBg}`
          }`}
        >
          {entry.initials}
        </div>
        <div
          className={`py-0.2 absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full px-1.5 text-[8px] font-extrabold tracking-wider uppercase shadow-xs sm:px-2 sm:py-0.5 sm:text-[9px] ${cfg.badgeBg} ${cfg.badgeText}`}
        >
          #{position}
        </div>
      </div>

      {/* User Name & Score */}
      <div className="mt-0.5 w-full min-w-0 px-0.5 text-center sm:mt-1">
        <div className="flex items-center justify-center gap-1">
          <p className="truncate text-[11px] font-bold text-[#0a0a0a] sm:text-sm">
            {entry.name.split(" ")[0]}
          </p>
          {isMe && (
            <span className="py-0.2 shrink-0 rounded-[4px] bg-[#0a0a0a] px-1 text-[8px] font-extrabold text-white uppercase">
              You
            </span>
          )}
        </div>
        <p className="mt-0.5 flex items-center justify-center gap-0.5 text-[11px] font-extrabold text-[#0a0a0a] sm:text-xs">
          <ZapIcon className="size-2.5 shrink-0 fill-[#e8b94a] text-[#e8b94a] sm:size-3" />
          <span className="truncate">
            {entry.value.toLocaleString("en-US")}
          </span>
        </p>
      </div>

      {/* Solid Clay Podium Pillar Bar */}
      <div
        className={`${cfg.height} relative w-full overflow-hidden rounded-t-[12px] sm:rounded-t-[18px] ${cfg.border} ${cfg.barBg} flex items-center justify-center shadow-xs`}
      >
        <span
          className={`text-xl font-black select-none sm:text-3xl ${cfg.rankText}`}
        >
          {position}
        </span>
      </div>
    </div>
  )
}

function ListAvatar({ initials, isMe }: { initials: string; isMe?: boolean }) {
  return (
    <div
      className={`flex size-9 shrink-0 items-center justify-center rounded-[10px] text-xs font-bold uppercase transition-transform sm:size-10 ${
        isMe
          ? "bg-[#0a0a0a] text-white shadow-xs"
          : "bg-[#e8b94a] text-[#0a0a0a] shadow-2xs"
      }`}
    >
      {initials}
    </div>
  )
}

function LeaderboardRow({
  entry,
  isMe,
  metricUnit,
  allEntries,
}: {
  entry: LeaderboardEntry
  isMe: boolean
  metricUnit: string
  allEntries: LeaderboardEntry[]
}) {
  const hint = isMe ? getCompetitionHint(entry, allEntries, metricUnit) : null

  return (
    <li
      className={`flex items-center gap-2.5 rounded-[14px] border px-3.5 py-3 transition-all sm:gap-3.5 ${
        isMe
          ? "border-[#0a0a0a] bg-[#faf5e8] shadow-xs"
          : "border-[#e5e5e5] bg-[#fffaf0] hover:bg-[#faf5e8]"
      }`}
    >
      {/* Rank Number */}
      <span
        className={`w-7 shrink-0 text-center text-xs font-bold ${
          isMe ? "text-[#0a0a0a]" : "text-[#6a6a6a]"
        }`}
      >
        #{entry.rank}
      </span>

      {/* Avatar */}
      <ListAvatar initials={entry.initials} isMe={isMe} />

      {/* Name, Role Badge & Motivational Hint */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate text-xs font-bold text-[#0a0a0a] sm:text-sm">
            {entry.name}
          </p>
          {isMe && (
            <span className="py-0.2 shrink-0 rounded-[4px] bg-[#0a0a0a] px-1.5 text-[9px] font-extrabold text-white uppercase">
              You
            </span>
          )}
          {entry.role && entry.role !== "umat" && (
            <span className="py-0.2 shrink-0 rounded-full border border-[#1a3a3a]/20 bg-[#1a3a3a]/10 px-2 text-[9px] font-bold text-[#1a3a3a] capitalize">
              {entry.role === "admin"
                ? "Admin"
                : entry.role === "pengurus"
                  ? "Organizer"
                  : "Activist"}
            </span>
          )}
        </div>

        {hint && (
          <p className="mt-0.5 line-clamp-1 flex items-center gap-1 text-[11px] font-semibold text-[#0a0a0a]">
            <span>🚀</span>
            <span>{hint}</span>
          </p>
        )}
      </div>

      {/* Score Value */}
      <div className="shrink-0 text-right">
        <span className="text-xs font-bold text-[#0a0a0a] sm:text-sm">
          {entry.value.toLocaleString("en-US")}
        </span>
        <span className="block text-[10px] font-medium text-[#6a6a6a] capitalize">
          {metricUnit}
        </span>
      </div>
    </li>
  )
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export function LeaderboardPage() {
  const { authState } = useAuth()
  const myId =
    authState.status === "authenticated" ? (authState.userId ?? "") : ""
  const userRole =
    authState.status === "authenticated" ? authState.role : "umat"
  const isPengurusOrAdmin = userRole === "admin" || userRole === "pengurus"
  const isAktivis = userRole === "aktivis"
  const isUmatOnly = !isPengurusOrAdmin && !isAktivis

  const season = getCurrentSeason()
  const [metric, setMetric] = useState<LeaderboardMetric>("points")

  // Multi-select role checkboxes (default: all checked for pengurus/admin)
  const [selectedRoles, setSelectedRoles] = useState<RoleCheckboxKey[]>([
    "umat",
    "aktivis",
    "pengurus",
  ])

  function toggleRole(role: RoleCheckboxKey) {
    setSelectedRoles((prev) => {
      if (prev.includes(role)) {
        if (prev.length === 1) return prev // keep at least 1 checked
        return prev.filter((r) => r !== role)
      } else {
        return [...prev, role]
      }
    })
  }

  const activeRoles: RoleCheckboxKey[] = isUmatOnly ? ["umat"] : selectedRoles

  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [myRankData, setMyRankData] = useState<any>(null)
  const [seasonData, setSeasonData] = useState<{
    name: string
    code?: string | null
    start_date: string
    end_date: string
    days_left: number
    target_attendance: number
    bonus_points: number
    description?: string | null
  } | null>(null)
  const [communityGoal, setCommunityGoal] = useState({
    current: 0,
    target: 500,
    label: "Community Attendance Target",
  })

  useEffect(() => {
    loadLeaderboard()
  }, [metric])

  async function loadLeaderboard() {
    try {
      const res = await api.get<{
        entries: LeaderboardEntry[]
        my_rank: any
        season?: any
        community_goal?: { current: number; target: number; label: string }
      }>(`/leaderboard?metric=${metric}&refresh=true`)
      setEntries(res.entries ?? [])
      setMyRankData(res.my_rank ?? null)
      if (res.season) {
        setSeasonData(res.season)
      }
      if (res.community_goal) {
        setCommunityGoal(res.community_goal)
      }
    } catch (err) {
      console.error("Failed to load leaderboard:", err)
      setEntries([])
    }
  }

  const validEntries = (Array.isArray(entries) ? entries : []).filter(
    (e): e is LeaderboardEntry =>
      Boolean(e) && typeof e === "object" && typeof e.value === "number"
  )

  // Dynamic filter by role with recalculation of ranks
  const filteredEntries = validEntries
    .filter((entry) => {
      const rawRole = (entry.role || "umat").toLowerCase()
      const normalizedRole: RoleCheckboxKey =
        rawRole === "admin" || rawRole === "pengurus"
          ? "pengurus"
          : rawRole === "aktivis"
            ? "aktivis"
            : "umat"
      return activeRoles.includes(normalizedRole)
    })
    .map((entry, idx) => ({
      ...entry,
      rank: idx + 1,
    }))

  const podium = filteredEntries.slice(0, 3)
  // Show ranks 4 through 10 in the main list
  const rest = filteredEntries.slice(3, 10)

  const myFilteredIdx = filteredEntries.findIndex((e) => e.user_id === myId)
  const isUserInTop10 = myFilteredIdx >= 0 && myFilteredIdx < 10

  const metricUnit =
    metric === "points"
      ? "points"
      : metric === "streak"
        ? "weeks"
        : "attendances"

  // If current user is outside Top 10, display as 11th entry
  const userEntryOutsideTop10: LeaderboardEntry | null =
    !isUserInTop10 && myId
      ? myFilteredIdx >= 10
        ? filteredEntries[myFilteredIdx]
        : myRankData && typeof myRankData.value === "number"
          ? {
              user_id: myId,
              name: myRankData.name || authState.name || "You",
              initials: myRankData.initials || "YOU",
              value: myRankData.value ?? 0,
              rank: typeof myRankData.rank === "number" ? myRankData.rank : 11,
              label:
                myRankData.label || `${myRankData.value ?? 0} ${metricUnit}`,
              role: (userRole || "umat") as any,
            }
          : null
      : null

  const myRank =
    myFilteredIdx >= 0 ? myFilteredIdx + 1 : (myRankData?.rank ?? "-")
  const myValue =
    myFilteredIdx >= 0
      ? (filteredEntries[myFilteredIdx]?.value ?? 0)
      : (myRankData?.value ?? 0)
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

  const communityPct = Math.min(
    100,
    Math.round(
      ((communityGoal.current || 0) / (communityGoal.target || 500)) * 100
    )
  )

  return (
    <main className="relative min-h-screen bg-[#fffaf0] text-left font-sans">
      {/* ── Page Breadcrumb ── */}
      <PageBreadcrumb items={[{ label: "Leaderboard" }]} />

      <div className="relative mx-auto max-w-6xl px-3.5 py-4 pb-32 sm:px-6 md:px-8 md:pb-12">
        <div className="space-y-4 sm:space-y-5">
          {/* ── Top Header Banner: Compact & Sleek Clay Style ── */}
          <div className="rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] p-3 shadow-xs sm:rounded-[24px] sm:p-5">
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#0a0a0a] text-white shadow-xs sm:size-12 sm:rounded-[12px]">
                  <TrophyIcon className="size-4.5 text-[#e8b94a] sm:size-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h1 className="truncate text-sm font-bold tracking-tight text-[#0a0a0a] sm:text-xl">
                      Leaderboard
                    </h1>
                    <span className="py-0.2 shrink-0 rounded-[6px] border border-[#e8b94a]/40 bg-[#e8b94a]/20 px-2 text-[10px] font-extrabold text-[#0a0a0a] sm:rounded-[8px] sm:px-2.5 sm:py-0.5 sm:text-xs">
                      {seasonData?.name || seasonLabel(season)}
                    </span>
                  </div>
                  {seasonData?.start_date && seasonData?.end_date && (
                    <span className="hidden text-xs font-medium text-[#6a6a6a] sm:inline">
                      (
                      {new Date(seasonData.start_date).toLocaleDateString(
                        "en-US",
                        { day: "numeric", month: "short" }
                      )}{" "}
                      —{" "}
                      {new Date(seasonData.end_date).toLocaleDateString(
                        "en-US",
                        { day: "numeric", month: "short", year: "numeric" }
                      )}
                      )
                    </span>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1 rounded-[8px] border border-[#e5e5e5] bg-[#fffaf0] px-2.5 py-1 text-[11px] font-bold text-[#6a6a6a] shadow-xs sm:rounded-[10px] sm:text-xs">
                <TimerIcon className="size-3.5 shrink-0 text-[#0a0a0a]" />
                <span>
                  Ends in{" "}
                  <strong className="text-[#0a0a0a]">
                    {seasonData?.days_left ?? 14}d
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* ── Filters Bar: Metric & Role Filters ── */}
          <div className="flex flex-col justify-between gap-2.5 sm:gap-3 md:flex-row md:items-center">
            {/* Metric Filter Tabs */}
            <div className="flex w-full items-center gap-1 rounded-[10px] border border-[#e5e5e5] bg-[#faf5e8] p-1 sm:rounded-[12px] md:w-auto">
              {METRIC_OPTIONS.map((m) => {
                const isActive = metric === m.value
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMetric(m.value)}
                    className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[7px] px-2.5 py-1.5 text-xs font-bold transition-all sm:rounded-[8px] sm:px-3.5 sm:py-2 md:flex-none ${
                      isActive
                        ? "bg-[#0a0a0a] text-white shadow-xs"
                        : "text-[#6a6a6a] hover:text-[#0a0a0a]"
                    }`}
                  >
                    {m.icon}
                    <span>{m.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Role Filter Buttons */}
            {isPengurusOrAdmin && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="hidden px-1 text-[10px] font-bold tracking-wider text-[#6a6a6a] uppercase sm:inline">
                  Show:
                </span>
                {PENGURUS_ROLE_CHECKBOXES.map((r) => {
                  const isChecked = selectedRoles.includes(r.id)
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleRole(r.id)}
                      className={`flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-all select-none ${
                        isChecked
                          ? "border-[#0a0a0a] bg-[#faf5e8] font-bold text-[#0a0a0a] shadow-2xs"
                          : "border-[#e5e5e5] bg-transparent text-[#8a8a8a] hover:border-[#bfbfbf] hover:text-[#0a0a0a]"
                      }`}
                    >
                      {isChecked && (
                        <CheckIcon className="size-3 stroke-[2.5] text-[#0a0a0a]" />
                      )}
                      <span>{r.label}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {isAktivis && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="hidden px-1 text-[10px] font-bold tracking-wider text-[#6a6a6a] uppercase sm:inline">
                  Show:
                </span>
                {AKTIVIS_ROLE_CHECKBOXES.map((r) => {
                  const isChecked = selectedRoles.includes(r.id)
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleRole(r.id)}
                      className={`flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-all select-none ${
                        isChecked
                          ? "border-[#0a0a0a] bg-[#faf5e8] font-bold text-[#0a0a0a] shadow-2xs"
                          : "border-[#e5e5e5] bg-transparent text-[#8a8a8a] hover:border-[#bfbfbf] hover:text-[#0a0a0a]"
                      }`}
                    >
                      {isChecked && (
                        <CheckIcon className="size-3 stroke-[2.5] text-[#0a0a0a]" />
                      )}
                      <span>{r.label}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {isUmatOnly && (
              <div className="flex items-center gap-1.5 rounded-[10px] border border-[#e5e5e5] bg-[#faf5e8] px-3 py-1.5 text-xs font-semibold text-[#6a6a6a]">
                <UserIcon className="size-3.5 text-[#0a0a0a]" />
                <span>
                  Rankings:{" "}
                  <strong className="text-[#0a0a0a]">Fellow Members</strong>
                </span>
              </div>
            )}
          </div>

          {/* ── Two-Column Responsive Layout ── */}
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12 lg:gap-6">
            {/* Main Content Area (Left 8 Cols) */}
            <div className="space-y-4 lg:col-span-8">
              {/* Leaderboard Card Container */}
              <div className="space-y-3.5 rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-3 shadow-xs sm:space-y-5 sm:rounded-[24px] sm:p-6">
                {/* Empty State */}
                {filteredEntries.length === 0 ? (
                  <div className="space-y-3 px-4 py-12 text-center">
                    <div className="mx-auto flex size-12 items-center justify-center rounded-[12px] border border-[#e5e5e5] bg-[#faf5e8] text-[#6a6a6a]">
                      <TrophyIcon className="size-6 text-[#e8b94a]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#0a0a0a]">
                        No Ranking Data Found
                      </h3>
                      <p className="mx-auto mt-1 max-w-sm text-xs text-[#6a6a6a]">
                        No members found in <strong>{roleGroupLabel}</strong>{" "}
                        category for this season.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Champions Podium Pillars (Supports 1, 2, or 3+ entries) */}
                    {podium.length > 0 && (
                      <div className="rounded-[14px] border-b border-[#e5e5e5] bg-[#faf5e8] px-1.5 pt-2 pb-1.5 sm:rounded-[16px] sm:px-2 sm:pt-3 sm:pb-2">
                        <div
                          className={`mx-auto flex items-end justify-center gap-2 sm:gap-4 ${
                            podium.length === 1
                              ? "max-w-[160px]"
                              : podium.length === 2
                                ? "max-w-xs"
                                : "max-w-md"
                          }`}
                        >
                          {podium.length >= 2 && (
                            <PodiumEntry
                              entry={podium[1]}
                              position={2}
                              myId={myId}
                            />
                          )}
                          <PodiumEntry
                            entry={podium[0]}
                            position={1}
                            myId={myId}
                          />
                          {podium.length >= 3 && (
                            <PodiumEntry
                              entry={podium[2]}
                              position={3}
                              myId={myId}
                            />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Ranked List (Rank 4-10 + 11th entry if user is outside Top 10) */}
                    {(rest.length > 0 || userEntryOutsideTop10) && (
                      <div className="space-y-2">
                        <p className="px-1 text-[11px] font-bold tracking-wider text-[#6a6a6a] uppercase">
                          Rankings: {roleGroupLabel}{" "}
                          {rest.length > 0
                            ? `(4–${Math.min(10, filteredEntries.length)})`
                            : ""}
                        </p>
                        <ul role="list" className="space-y-2">
                          {rest.map((entry) => (
                            <LeaderboardRow
                              key={entry.user_id}
                              entry={entry}
                              isMe={entry.user_id === myId}
                              metricUnit={metricUnit}
                              allEntries={filteredEntries}
                            />
                          ))}

                          {/* 11th Entry: Shown when user is outside Top 10 */}
                          {userEntryOutsideTop10 && (
                            <>
                              <li
                                className="flex items-center justify-center py-1 select-none"
                                aria-hidden="true"
                              >
                                <div className="flex items-center gap-1.5 rounded-full border border-[#e5e5e5] bg-[#faf5e8] px-3 py-0.5 text-[10px] font-bold text-[#8a8a8a]">
                                  <span className="size-1 rounded-full bg-[#8a8a8a]" />
                                  <span className="size-1 rounded-full bg-[#8a8a8a]" />
                                  <span className="size-1 rounded-full bg-[#8a8a8a]" />
                                </div>
                              </li>
                              <LeaderboardRow
                                key={`outside-${userEntryOutsideTop10.user_id}`}
                                entry={userEntryOutsideTop10}
                                isMe={true}
                                metricUnit={metricUnit}
                                allEntries={filteredEntries}
                              />
                            </>
                          )}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Right Sidebar Widgets (Desktop) */}
            <aside className="space-y-4 lg:col-span-4">
              {/* My Rank Sidebar Widget (Desktop) */}
              <div className="hidden space-y-3 rounded-[20px] border border-[#e5e5e5] bg-[#faf5e8] p-4 shadow-xs sm:p-5 lg:block">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-[#0a0a0a] text-xs font-bold text-white uppercase shadow-xs">
                    {myRankData?.initials || "AS"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-bold text-[#0a0a0a]">
                        {myRankData?.name || "Sekkha Member"}
                      </span>
                      <span className="py-0.2 shrink-0 rounded-[4px] bg-[#0a0a0a] px-1.5 text-[9px] font-extrabold text-white uppercase">
                        You
                      </span>
                    </div>
                    <p className="text-xs font-medium text-[#6a6a6a]">
                      {seasonData?.name || seasonLabel(season)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-4 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] p-3 shadow-2xs">
                  <div className="flex-1 text-center">
                    <p className="text-base font-black text-[#0a0a0a]">
                      #{myRank}
                    </p>
                    <p className="text-[10px] font-bold text-[#6a6a6a]">
                      Rank ({roleGroupLabel})
                    </p>
                  </div>
                  <div className="h-7 w-px bg-[#e5e5e5]" />
                  <div className="flex-1 text-center">
                    <p className="text-base font-black text-[#0a0a0a]">
                      {myValue.toLocaleString("en-US")}
                    </p>
                    <p className="text-[10px] font-bold text-[#6a6a6a] capitalize">
                      {metricUnit}
                    </p>
                  </div>
                </div>
              </div>

              {/* Community Goal Progress Card */}
              <div className="space-y-3 rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-4 shadow-xs sm:p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-[8px] bg-[#faf5e8] text-[#0a0a0a]">
                      <UsersIcon className="size-4" aria-hidden="true" />
                    </div>
                    <h3 className="text-xs font-bold text-[#0a0a0a]">
                      {communityGoal.label &&
                      communityGoal.label.toLowerCase().includes("absensi")
                        ? "Vihara Community Attendance Target"
                        : communityGoal.label ||
                          "Vihara Community Attendance Target"}
                    </h3>
                  </div>
                  <span className="rounded-[6px] border border-[#e5e5e5] bg-[#faf5e8] px-2 py-0.5 text-xs font-extrabold text-[#0a0a0a]">
                    {communityPct}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[#6a6a6a]">
                    <span>Achieved: {communityGoal.current}</span>
                    <span>Target: {communityGoal.target} Check-Ins</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full border border-[#e5e5e5] bg-[#f5f0e0]">
                    <div
                      className="h-full rounded-full bg-[#0a0a0a] shadow-xs transition-all duration-500"
                      style={{ width: `${communityPct}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-start gap-2 rounded-[12px] border border-[#e5e5e5] bg-[#faf5e8] p-3 text-xs font-medium text-[#6a6a6a]">
                  <SparklesIcon className="mt-0.5 size-4 shrink-0 text-[#e8b94a]" />
                  <span>
                    When the target of{" "}
                    {seasonData?.target_attendance ?? communityGoal.target}{" "}
                    check-ins is met, all community members will receive an
                    extra{" "}
                    <strong className="text-[#0a0a0a]">
                      +{seasonData?.bonus_points ?? 100} bonus points
                    </strong>
                    !
                  </span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </main>
  )
}
