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

const METRIC_OPTIONS: { value: LeaderboardMetric; label: string; icon: React.ReactNode }[] = [
  { value: "points",     label: "Total Points", icon: <StarIcon className="size-4" /> },
  { value: "streak",     label: "Streak",       icon: <FlameIcon className="size-4" /> },
  { value: "attendance", label: "Attendance",   icon: <CheckSquareIcon className="size-4" /> },
]

export type RoleCheckboxKey = "umat" | "aktivis" | "pengurus"

const PENGURUS_ROLE_CHECKBOXES: { id: RoleCheckboxKey; label: string; icon: React.ReactNode }[] = [
  { id: "umat", label: "Members", icon: <UserIcon className="size-3.5" /> },
  { id: "aktivis", label: "Activists", icon: <AwardIcon className="size-3.5" /> },
  { id: "pengurus", label: "Organizers", icon: <ShieldCheckIcon className="size-3.5" /> },
]

const AKTIVIS_ROLE_CHECKBOXES: { id: RoleCheckboxKey; label: string; icon: React.ReactNode }[] = [
  { id: "umat", label: "Members", icon: <UserIcon className="size-3.5" /> },
  { id: "aktivis", label: "Activists", icon: <AwardIcon className="size-3.5" /> },
]

// Podium Configuration adhering to Clay Design Tokens
const PODIUM_CONFIG: Record<1 | 2 | 3, {
  height: string
  barBg: string
  border: string
  avatarRing: string
  avatarBg: string
  crownColor: string
  badgeBg: string
  badgeText: string
  rankText: string
}> = {
  1: {
    height: "h-32 sm:h-38",
    barBg: "bg-gradient-to-b from-[#e8b94a] to-[#d49e28]",
    border: "border-t border-x border-[#c28e20]",
    avatarRing: "ring-4 ring-[#e8b94a]/30 shadow-md",
    avatarBg: "bg-[#e8b94a] text-[#0a0a0a] font-black",
    crownColor: "text-[#e8b94a] fill-[#e8b94a]",
    badgeBg: "bg-[#0a0a0a]",
    badgeText: "text-white",
    rankText: "text-[#0a0a0a]/50 font-black",
  },
  2: {
    height: "h-22 sm:h-26",
    barBg: "bg-gradient-to-b from-[#e5e5e5] to-[#d0d0d0]",
    border: "border-t border-x border-[#bfbfbf]",
    avatarRing: "ring-3 ring-[#e5e5e5] shadow-xs",
    avatarBg: "bg-[#e5e5e5] text-[#0a0a0a] font-bold",
    crownColor: "text-[#a0a0a0] fill-[#a0a0a0]",
    badgeBg: "bg-[#6a6a6a]",
    badgeText: "text-white",
    rankText: "text-[#0a0a0a]/40 font-extrabold",
  },
  3: {
    height: "h-16 sm:h-20",
    barBg: "bg-gradient-to-b from-[#d9a07a] to-[#c2845c]",
    border: "border-t border-x border-[#a86e49]",
    avatarRing: "ring-3 ring-[#d9a07a]/40 shadow-xs",
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
  metricUnit: string,
): string | null {
  if (!entry || !allEntries || allEntries.length === 0) return null
  const idx = allEntries.findIndex(e => e && e.user_id === entry.user_id)
  if (idx <= 0) return null
  const above = allEntries[idx - 1]
  if (!above || typeof above.value !== "number" || typeof entry.value !== "number") return null
  const diff = above.value - entry.value
  if (diff <= 0) return null
  const aboveName = above.name ? above.name.split(" ")[0] : "the rank above"
  return `${diff.toLocaleString("en-US")} more ${metricUnit} to overtake ${aboveName}!`
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function PodiumEntry({ entry, position, myId }: { entry?: LeaderboardEntry; position: 1 | 2 | 3; myId?: string }) {
  if (!entry) return null
  const isFirst = position === 1
  const isMe = entry.user_id === myId
  const cfg = PODIUM_CONFIG[position]
  const avatarSize = isFirst ? "size-14 sm:size-18 text-sm sm:text-base font-black" : "size-11 sm:size-13 text-xs sm:text-sm font-bold"

  return (
    <div className={`flex flex-1 flex-col items-center gap-1 sm:gap-1.5 min-w-0 transition-all duration-200 relative ${
      isMe ? "scale-102 z-20" : ""
    }`}>
      {/* Crown Icon for top 3 */}
      {isFirst ? (
        <CrownIcon className={`size-6 sm:size-7 ${cfg.crownColor}`} aria-hidden="true" />
      ) : (
        <span className="text-xs font-bold text-[#6a6a6a]">#{position}</span>
      )}

      {/* Avatar Container */}
      <div className="relative shrink-0">
        <div className={`relative ${avatarSize} flex shrink-0 items-center justify-center rounded-[14px] sm:rounded-[16px] uppercase ${
          isMe
            ? "ring-4 ring-[#0a0a0a] shadow-md bg-[#0a0a0a] text-white"
            : `${cfg.avatarRing} ${cfg.avatarBg}`
        }`}>
          {entry.initials}
        </div>
        <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full px-1.5 sm:px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider shadow-xs ${cfg.badgeBg} ${cfg.badgeText}`}>
          #{position}
        </div>
      </div>

      {/* User Name & Score */}
      <div className="mt-1 text-center w-full px-0.5 min-w-0">
        <div className="flex items-center justify-center gap-1">
          <p className={`truncate font-bold text-xs sm:text-sm ${isMe ? "text-[#0a0a0a]" : "text-[#0a0a0a]"}`}>
            {entry.name.split(" ")[0]}
          </p>
          {isMe && (
            <span className="rounded-[4px] bg-[#0a0a0a] text-white px-1 py-0.2 text-[8px] font-extrabold uppercase shrink-0">
              You
            </span>
          )}
        </div>
        <p className="text-xs font-extrabold text-[#0a0a0a] flex items-center justify-center gap-0.5 mt-0.5">
          <ZapIcon className="size-3 text-[#e8b94a] fill-[#e8b94a] shrink-0" />
          <span className="truncate">{entry.value.toLocaleString("en-US")}</span>
        </p>
      </div>

      {/* Solid Clay Podium Pillar Bar */}
      <div className={`${cfg.height} relative w-full overflow-hidden rounded-t-[14px] sm:rounded-t-[18px] ${cfg.border} ${cfg.barBg} flex items-center justify-center shadow-xs`}>
        <span className={`text-2xl sm:text-3xl font-black select-none ${cfg.rankText}`}>
          {position}
        </span>
      </div>
    </div>
  )
}

function ListAvatar({ initials, isMe }: { initials: string; isMe?: boolean }) {
  return (
    <div className={`flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-[10px] text-xs font-bold uppercase transition-transform ${
      isMe
        ? "bg-[#0a0a0a] text-white shadow-xs"
        : "bg-[#e8b94a] text-[#0a0a0a] shadow-2xs"
    }`}>
      {initials}
    </div>
  )
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export function LeaderboardPage() {
  const { authState } = useAuth()
  const myId = authState.status === "authenticated" ? authState.userId ?? "" : ""
  const userRole = authState.status === "authenticated" ? authState.role : "umat"
  const isPengurusOrAdmin = userRole === "admin" || userRole === "pengurus"
  const isAktivis = userRole === "aktivis"
  const isUmatOnly = !isPengurusOrAdmin && !isAktivis

  const season = getCurrentSeason()
  const [metric, setMetric] = useState<LeaderboardMetric>("points")
  
  // Multi-select role checkboxes (default: all checked for pengurus/admin)
  const [selectedRoles, setSelectedRoles] = useState<RoleCheckboxKey[]>(["umat", "aktivis", "pengurus"])

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
    (e): e is LeaderboardEntry => Boolean(e) && typeof e === "object" && typeof e.value === "number"
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
  const rest = filteredEntries.slice(3)

  const myFilteredIdx = filteredEntries.findIndex(e => e.user_id === myId)
  const myRank = myFilteredIdx >= 0 ? myFilteredIdx + 1 : "-"
  const myValue = myFilteredIdx >= 0 ? filteredEntries[myFilteredIdx]?.value ?? 0 : myRankData?.value ?? 0
  const metricUnit = metric === "points" ? "points" : metric === "streak" ? "weeks" : "attendances"
  const roleGroupLabel =
    activeRoles.length === 3
      ? "All Members"
      : activeRoles
          .map((r) => (r === "umat" ? "Members" : r === "aktivis" ? "Activists" : "Organizers"))
          .join(" & ")

  const communityPct = Math.min(100, Math.round(((communityGoal.current || 0) / (communityGoal.target || 500)) * 100))

  return (
    <main className="relative font-sans bg-[#fffaf0] min-h-screen text-left">
      {/* ── Page Breadcrumb ── */}
      <PageBreadcrumb items={[{ label: "Leaderboard" }]} />

      <div className="relative px-3.5 py-4 pb-32 md:pb-12 sm:px-6 md:px-8 max-w-6xl mx-auto">
        <div className="space-y-4 sm:space-y-5">

          {/* ── Top Header Banner: Warm Clay Style ── */}
          <div className="rounded-[20px] sm:rounded-[24px] border border-[#e5e5e5] bg-[#faf5e8] p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-11 sm:size-12 shrink-0 items-center justify-center rounded-[12px] bg-[#0a0a0a] text-white shadow-xs">
                  <TrophyIcon className="size-5 sm:size-6 text-[#e8b94a]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-[8px] bg-[#e8b94a]/20 border border-[#e8b94a]/40 px-2.5 py-0.5 text-xs font-extrabold text-[#0a0a0a]">
                      {seasonData?.name || seasonLabel(season)}
                    </span>
                    {seasonData?.start_date && seasonData?.end_date && (
                      <span className="hidden sm:inline text-xs text-[#6a6a6a] font-medium">
                        ({new Date(seasonData.start_date).toLocaleDateString("en-US", { day: "numeric", month: "short" })} — {new Date(seasonData.end_date).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })})
                      </span>
                    )}
                  </div>
                  <h1 className="text-base sm:text-xl font-bold text-[#0a0a0a] mt-0.5">
                    Leaderboard
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-1.5 self-start sm:self-auto rounded-[10px] bg-[#fffaf0] border border-[#e5e5e5] px-3 py-1.5 text-xs font-bold text-[#6a6a6a] shadow-xs">
                <TimerIcon className="size-3.5 text-[#0a0a0a] shrink-0" />
                <span>Ends in <strong className="text-[#0a0a0a]">{seasonData?.days_left ?? 14} days</strong></span>
              </div>
            </div>
          </div>

          {/* ── My Rank Status Hero Card (Mobile & Tablet) ── */}
          <div className="lg:hidden rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-3.5 sm:p-4 shadow-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-[#0a0a0a] text-xs font-bold text-white shadow-xs uppercase">
                {myRankData?.initials || "AS"}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-xs sm:text-sm text-[#0a0a0a] truncate">
                    {myRankData?.name || "Sekkha Member"}
                  </span>
                  <span className="rounded-[6px] bg-[#e8b94a] text-[#0a0a0a] px-1.5 py-0.5 text-[10px] font-extrabold uppercase shadow-2xs">
                    You
                  </span>
                </div>
                <p className="text-xs font-medium text-[#6a6a6a] mt-0.5 flex items-center gap-1">
                  <TrophyIcon className="size-3.5 text-[#e8b94a]" />
                  <span>Rank #{myRank} of {filteredEntries.length} {roleGroupLabel}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#0a0a0a] bg-[#faf5e8] px-3 py-1.5 rounded-[10px] border border-[#e5e5e5] shadow-2xs shrink-0 self-center">
              <ZapIcon className="size-3.5 text-[#e8b94a] fill-[#e8b94a] shrink-0" />
              <span>{myValue.toLocaleString("en-US")}</span>
              <span className="text-[11px] font-medium text-[#6a6a6a] capitalize">{metricUnit}</span>
            </div>
          </div>

          {/* ── Filters Bar: Metric & Role Filters ── */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Metric Filter Tabs */}
            <div className="flex items-center gap-1 rounded-[12px] bg-[#faf5e8] p-1 border border-[#e5e5e5] w-full md:w-auto">
              {METRIC_OPTIONS.map(m => {
                const isActive = metric === m.value
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMetric(m.value)}
                    className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 rounded-[8px] px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
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
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6a6a6a] px-1 hidden sm:inline">
                  Show:
                </span>
                {PENGURUS_ROLE_CHECKBOXES.map(r => {
                  const isChecked = selectedRoles.includes(r.id)
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleRole(r.id)}
                      className={`flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-xs font-bold cursor-pointer transition-all border select-none ${
                        isChecked
                          ? "bg-[#0a0a0a] text-white border-[#0a0a0a] shadow-xs"
                          : "bg-[#fffaf0] text-[#6a6a6a] border-[#e5e5e5] hover:bg-[#faf5e8] hover:text-[#0a0a0a]"
                      }`}
                    >
                      {isChecked && <CheckIcon className="size-3 stroke-[3]" />}
                      <span>{r.label}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {isAktivis && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6a6a6a] px-1 hidden sm:inline">
                  Show:
                </span>
                {AKTIVIS_ROLE_CHECKBOXES.map(r => {
                  const isChecked = selectedRoles.includes(r.id)
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleRole(r.id)}
                      className={`flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-xs font-bold cursor-pointer transition-all border select-none ${
                        isChecked
                          ? "bg-[#0a0a0a] text-white border-[#0a0a0a] shadow-xs"
                          : "bg-[#fffaf0] text-[#6a6a6a] border-[#e5e5e5] hover:bg-[#faf5e8] hover:text-[#0a0a0a]"
                      }`}
                    >
                      {isChecked && <CheckIcon className="size-3 stroke-[3]" />}
                      <span>{r.label}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {isUmatOnly && (
              <div className="flex items-center gap-1.5 rounded-[10px] bg-[#faf5e8] border border-[#e5e5e5] px-3 py-1.5 text-xs font-semibold text-[#6a6a6a]">
                <UserIcon className="size-3.5 text-[#0a0a0a]" />
                <span>Rankings: <strong className="text-[#0a0a0a]">Fellow Members</strong></span>
              </div>
            )}
          </div>

          {/* ── Two-Column Responsive Layout ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">

            {/* Main Content Area (Left 8 Cols) */}
            <div className="lg:col-span-8 space-y-4">
              
              {/* Leaderboard Card Container */}
              <div className="rounded-[20px] sm:rounded-[24px] border border-[#e5e5e5] bg-[#fffaf0] p-4 sm:p-6 shadow-xs space-y-5">

                {/* Empty State */}
                {filteredEntries.length === 0 ? (
                  <div className="py-12 px-4 text-center space-y-3">
                    <div className="mx-auto flex size-12 items-center justify-center rounded-[12px] bg-[#faf5e8] border border-[#e5e5e5] text-[#6a6a6a]">
                      <TrophyIcon className="size-6 text-[#e8b94a]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#0a0a0a]">No Ranking Data Found</h3>
                      <p className="text-xs text-[#6a6a6a] mt-1 max-w-sm mx-auto">
                        No members found in <strong>{roleGroupLabel}</strong> category for this season.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Champions Podium Pillars (Supports 1, 2, or 3+ entries) */}
                    {podium.length > 0 && (
                      <div className="pt-3 pb-2 px-2 border-b border-[#e5e5e5] bg-[#faf5e8] rounded-[16px]">
                        <div className={`flex items-end justify-center gap-2 sm:gap-4 mx-auto ${
                          podium.length === 1 ? "max-w-[160px]" : podium.length === 2 ? "max-w-xs" : "max-w-md"
                        }`}>
                          {podium.length >= 2 && <PodiumEntry entry={podium[1]} position={2} myId={myId} />}
                          <PodiumEntry entry={podium[0]} position={1} myId={myId} />
                          {podium.length >= 3 && <PodiumEntry entry={podium[2]} position={3} myId={myId} />}
                        </div>
                      </div>
                    )}

                    {/* Ranked List (Rank 4+) */}
                    {rest.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#6a6a6a] px-1">
                          Rankings: {roleGroupLabel} (4+)
                        </p>
                        <ul role="list" className="space-y-2">
                          {rest.map(entry => {
                            const isMe = entry.user_id === myId
                            const hint = isMe ? getCompetitionHint(entry, filteredEntries, metricUnit) : null

                            return (
                              <li
                                key={entry.user_id}
                                className={`flex items-center gap-2.5 sm:gap-3.5 rounded-[14px] px-3.5 py-3 transition-all border ${
                                  isMe
                                    ? "border-[#0a0a0a] bg-[#faf5e8] shadow-xs"
                                    : "border-[#e5e5e5] bg-[#fffaf0] hover:bg-[#faf5e8]"
                                }`}
                              >
                                {/* Rank Number */}
                                <span className={`w-7 shrink-0 text-center text-xs font-bold ${
                                  isMe ? "text-[#0a0a0a]" : "text-[#6a6a6a]"
                                }`}>
                                  #{entry.rank}
                                </span>

                                {/* Avatar */}
                                <ListAvatar initials={entry.initials} isMe={isMe} />

                                {/* Name, Role Badge & Motivational Hint */}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className={`truncate font-bold text-xs sm:text-sm ${
                                      isMe ? "text-[#0a0a0a]" : "text-[#0a0a0a]"
                                    }`}>
                                      {entry.name}
                                    </p>
                                    {isMe && (
                                      <span className="rounded-[4px] bg-[#0a0a0a] text-white px-1.5 py-0.2 text-[9px] font-extrabold uppercase shrink-0">
                                        You
                                      </span>
                                    )}
                                    {entry.role && entry.role !== "umat" && (
                                      <span className="rounded-full bg-[#1a3a3a]/10 text-[#1a3a3a] border border-[#1a3a3a]/20 px-2 py-0.2 text-[9px] font-bold capitalize shrink-0">
                                        {entry.role === "admin" ? "Admin" : entry.role === "pengurus" ? "Organizer" : "Activist"}
                                      </span>
                                    )}
                                  </div>

                                  {hint && (
                                    <p className="mt-0.5 text-[11px] font-semibold text-[#0a0a0a] flex items-center gap-1 line-clamp-1">
                                      <span>🚀</span>
                                      <span>{hint}</span>
                                    </p>
                                  )}
                                </div>

                                {/* Score Value */}
                                <div className="text-right shrink-0">
                                  <span className="font-bold text-xs sm:text-sm text-[#0a0a0a]">
                                    {entry.value.toLocaleString("en-US")}
                                  </span>
                                  <span className="block text-[10px] font-medium text-[#6a6a6a] capitalize">
                                    {metricUnit}
                                  </span>
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    )}
                  </>
                )}

              </div>
            </div>

            {/* Right Sidebar Widgets (Desktop) */}
            <aside className="lg:col-span-4 space-y-4">
              
              {/* My Rank Sidebar Widget (Desktop) */}
              <div className="hidden lg:block rounded-[20px] border border-[#e5e5e5] bg-[#faf5e8] p-4 sm:p-5 shadow-xs space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-[#0a0a0a] text-xs font-bold text-white shadow-xs uppercase">
                    {myRankData?.initials || "AS"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-[#0a0a0a] truncate">
                        {myRankData?.name || "Sekkha Member"}
                      </span>
                      <span className="rounded-[4px] bg-[#0a0a0a] text-white px-1.5 py-0.2 text-[9px] font-extrabold uppercase shrink-0">
                        You
                      </span>
                    </div>
                    <p className="text-xs text-[#6a6a6a] font-medium">{seasonData?.name || seasonLabel(season)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-4 rounded-[12px] bg-[#fffaf0] p-3 border border-[#e5e5e5] shadow-2xs">
                  <div className="text-center flex-1">
                    <p className="text-base font-black text-[#0a0a0a]">#{myRank}</p>
                    <p className="text-[10px] font-bold text-[#6a6a6a]">Rank ({roleGroupLabel})</p>
                  </div>
                  <div className="h-7 w-px bg-[#e5e5e5]" />
                  <div className="text-center flex-1">
                    <p className="text-base font-black text-[#0a0a0a]">{myValue.toLocaleString("en-US")}</p>
                    <p className="text-[10px] font-bold text-[#6a6a6a] capitalize">{metricUnit}</p>
                  </div>
                </div>
              </div>

              {/* Community Goal Progress Card */}
              <div className="rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-4 sm:p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-[8px] bg-[#faf5e8] text-[#0a0a0a]">
                      <UsersIcon className="size-4" aria-hidden="true" />
                    </div>
                    <h3 className="text-xs font-bold text-[#0a0a0a]">
                      {communityGoal.label && communityGoal.label.toLowerCase().includes("absensi")
                        ? "Vihara Community Attendance Target"
                        : communityGoal.label || "Vihara Community Attendance Target"}
                    </h3>
                  </div>
                  <span className="text-xs font-extrabold text-[#0a0a0a] bg-[#faf5e8] border border-[#e5e5e5] px-2 py-0.5 rounded-[6px]">
                    {communityPct}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[#6a6a6a]">
                    <span>Achieved: {communityGoal.current}</span>
                    <span>Target: {communityGoal.target} Check-Ins</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#f5f0e0] border border-[#e5e5e5]">
                    <div
                      className="h-full rounded-full bg-[#0a0a0a] transition-all duration-500 shadow-xs"
                      style={{ width: `${communityPct}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-[12px] bg-[#faf5e8] border border-[#e5e5e5] p-3 text-xs font-medium text-[#6a6a6a] flex items-start gap-2">
                  <SparklesIcon className="size-4 text-[#e8b94a] shrink-0 mt-0.5" />
                  <span>When the target of {seasonData?.target_attendance ?? communityGoal.target} check-ins is met, all community members will receive an extra <strong className="text-[#0a0a0a]">+{seasonData?.bonus_points ?? 100} bonus points</strong>!</span>
                </div>
              </div>

            </aside>

          </div>

        </div>
      </div>
    </main>
  )
}
