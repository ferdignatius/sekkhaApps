// feature/leaderboard/components/LeaderboardPage
// Full gamification leaderboard:
//  - Highlighted "Kamu" row, solid podium colors, medal icons
//  - Season countdown, competition hints
//  - Streak Shield feature, Community Goals progress
//  - Badge section with locked/unlocked

import { useState, useMemo } from "react"
import {
  TrophyIcon,
  StarIcon,
  FlameIcon,
  CheckSquareIcon,
  CrownIcon,
  AwardIcon,
  ShieldIcon,
  UsersIcon,
  TimerIcon,
} from "lucide-react"
import { useAuth } from "@/modules/auth"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { getLeaderboardData } from "../data/leaderboardDummy"
import { getCurrentSeason, seasonLabel } from "../types"
import type { LeaderboardMetric, LeaderboardFilter, LeaderboardEntry } from "../types"

// ─── Constants ─────────────────────────────────────────────────────────────────

const METRIC_OPTIONS: { value: LeaderboardMetric; label: string; icon: React.ReactNode }[] = [
  { value: "points",     label: "Poin",      icon: <StarIcon className="size-4" />        },
  { value: "streak",     label: "Streak",    icon: <FlameIcon className="size-4" />       },
  { value: "attendance", label: "Kehadiran", icon: <CheckSquareIcon className="size-4" /> },
]

const PODIUM_AVATAR_COLORS: Record<1 | 2 | 3, string> = {
  1: "bg-yellow-400 text-yellow-900",
  2: "bg-slate-300 text-slate-700",
  3: "bg-orange-300 text-orange-800",
}

// Solid medal colors for podium bars
const PODIUM_BAR_STYLES: Record<1 | 2 | 3, { height: string; bg: string; rankColor: string }> = {
  1: { height: "h-28", bg: "bg-gradient-to-t from-yellow-400 to-yellow-200 border border-yellow-500", rankColor: "text-yellow-700" },
  2: { height: "h-16", bg: "bg-gradient-to-t from-slate-300 to-slate-100 border border-slate-400", rankColor: "text-slate-600" },
  3: { height: "h-10", bg: "bg-gradient-to-t from-orange-300 to-orange-100 border border-orange-400", rankColor: "text-orange-600" },
}

// Dummy community goal
const COMMUNITY_GOAL = { target: 500, current: 342, label: "Absensi Komunitas Bulan Ini" }

// Dummy streak shield
const STREAK_SHIELD = { owned: 1, cost: 200 }

// Sidebar badges
interface SidebarBadge { icon: string; name: string; earned: boolean; hint?: string }
const SIDEBAR_BADGES: SidebarBadge[] = [
  { icon: "🔥", name: "Streak 5", earned: true },
  { icon: "⭐", name: "100 Poin", earned: true },
  { icon: "🎯", name: "Hadir", earned: true },
  { icon: "💎", name: "Streak 20", earned: false, hint: "Hadir 20 minggu berturut-turut" },
  { icon: "🏆", name: "500 Poin", earned: false, hint: "Kumpulkan 500 poin total" },
]

// Season countdown (dummy)
const SEASON_DAYS_LEFT = 12

// ─── Sub-components ───────────────────────────────────────────────────────────

function PodiumAvatar({ initials, position }: { initials: string; position: 1 | 2 | 3 }) {
  const isFirst = position === 1
  const sz = isFirst ? "h-16 w-16 text-heading-4" : "h-12 w-12 text-body-md-medium"
  const colors = PODIUM_AVATAR_COLORS[position]

  return (
    <div className="relative">
      {/* Medal icon above avatar */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
        {position === 1 && <span className="text-lg">🥇</span>}
        {position === 2 && <span className="text-lg">🥈</span>}
        {position === 3 && <span className="text-lg">🥉</span>}
      </div>
      <div className={`${sz} flex shrink-0 items-center justify-center rounded-full font-semibold ring-3 ring-white ${colors}`}>
        {initials}
      </div>
    </div>
  )
}

function PodiumEntry({ entry, position }: { entry: LeaderboardEntry; position: 1 | 2 | 3 }) {
  const isFirst = position === 1
  const bar = PODIUM_BAR_STYLES[position]

  return (
    <div className="flex flex-1 flex-col items-center gap-2">
      {isFirst && <CrownIcon className="size-7 text-yellow-500 drop-shadow-sm" aria-hidden="true" />}
      <PodiumAvatar initials={entry.initials} position={position} />
      <p className={`mt-1 w-full truncate text-center ${isFirst ? "text-body-sm-medium text-sekkha-ink" : "text-caption text-sekkha-ink"}`}>
        {entry.name.split(" ")[0]}
      </p>
      <p className={`${isFirst ? "text-body-md-medium text-sekkha-ink" : "text-body-sm-medium text-sekkha-charcoal"}`}>
        {entry.value.toLocaleString("id-ID")}
      </p>
      {/* Solid podium bar */}
      <div className={`${bar.height} relative w-full overflow-hidden rounded-t-xl ${bar.bg}`}>
        <span className={`absolute inset-0 flex items-center justify-center text-stat-display font-bold opacity-70 ${bar.rankColor}`}>
          {position}
        </span>
      </div>
    </div>
  )
}

function ListAvatar({ initials }: { initials: string }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sekkha-surface text-caption-bold font-semibold text-sekkha-slate ring-1 ring-sekkha-hairline-soft">
      {initials}
    </div>
  )
}

function getCompetitionHint(
  entry: LeaderboardEntry,
  allEntries: LeaderboardEntry[],
  metricUnit: string,
): string | null {
  const idx = allEntries.findIndex(e => e.user_id === entry.user_id)
  if (idx <= 0) return null
  const above = allEntries[idx - 1]
  const diff = above.value - entry.value
  if (diff <= 0) return null
  return `${diff} ${metricUnit} lagi untuk menyalip ${above.name.split(" ")[0]}!`
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function LeaderboardPage() {
  const { authState } = useAuth()
  const myId = authState.status === "authenticated" ? (authState.userId ?? "me") : "me"

  const season = getCurrentSeason()
  const [metric, setMetric] = useState<LeaderboardMetric>("points")

  const filter: LeaderboardFilter = useMemo(() => ({ season, metric }), [season, metric])
  const data = useMemo(() => getLeaderboardData(filter, myId), [filter, myId])

  const podium = data.entries.slice(0, 3)
  const rest = data.entries.slice(3)
  const myEntry = data.my_rank
  const metricUnit = metric === "points" ? "poin" : metric === "streak" ? "minggu" : "hadir"

  const communityPct = Math.round((COMMUNITY_GOAL.current / COMMUNITY_GOAL.target) * 100)

  return (
    <main className="relative">
      <PageBreadcrumb items={[{ label: "Leaderboard" }]} />
      <div className="px-4 py-6 pb-32 md:px-8 md:pb-8 lg:px-12">
        <div className="mx-auto max-w-8xl space-y-5">

          {/* Title + Season countdown */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <TrophyIcon className="size-5 text-sekkha-brand-yellow" aria-hidden="true" />
                <h1 className="text-heading-5 text-sekkha-ink">Leaderboard</h1>
              </div>
              <p className="mt-1 text-body-sm text-sekkha-slate">{seasonLabel(season)}</p>
            </div>
            {/* Season countdown — urgency (fix) */}
            <div className="flex items-center gap-2 rounded-full bg-sekkha-coral-light px-4 py-2 border border-sekkha-brand-red-dark/20">
              <TimerIcon className="size-4 text-sekkha-ink" aria-hidden="true" />
              <span className="text-caption-bold text-sekkha-ink">
                ⏳ {SEASON_DAYS_LEFT} Hari Lagi Season Selesai!
              </span>
            </div>
          </div>

          {/* Community Goal (new feature #2) */}
          <div className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-4">
            <div className="flex items-center gap-2 mb-2">
              <UsersIcon className="size-4 text-sekkha-brand-blue" aria-hidden="true" />
              <p className="text-body-sm-medium text-sekkha-ink">{COMMUNITY_GOAL.label}</p>
              <span className="ml-auto text-caption-bold text-sekkha-brand-blue">{COMMUNITY_GOAL.current}/{COMMUNITY_GOAL.target}</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-sekkha-surface">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sekkha-brand-blue to-blue-400 transition-all"
                style={{ width: `${communityPct}%` }}
              />
            </div>
            <p className="mt-2 text-caption text-sekkha-slate">
              🎁 Target tercapai = semua anggota dapat <span className="font-semibold text-sekkha-brand-blue">+100 Poin Bonus</span>!
            </p>
          </div>

          {/* Metric filter pills */}
          <div className="flex flex-wrap gap-2">
            {METRIC_OPTIONS.map(m => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMetric(m.value)}
                className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-body-sm-medium transition-colors ${
                  metric === m.value
                    ? "bg-sekkha-primary text-white shadow-sm"
                    : "border border-sekkha-hairline-strong text-sekkha-slate hover:bg-sekkha-surface"
                }`}
              >
                <span className={metric === m.value ? "text-white" : "text-sekkha-muted"}>{m.icon}</span>
                {m.label}
              </button>
            ))}
          </div>

          {/* Two-column layout */}
          <div className="md:flex md:gap-6">

            {/* Left column */}
            <div className="flex-1 space-y-5">
              <div className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-5">

                {/* Podium top 3 — solid colors + medal icons */}
                {podium.length >= 3 && (
                  <div className="flex items-end justify-center gap-3 pb-5 pt-4">
                    <PodiumEntry entry={podium[1]} position={2} />
                    <PodiumEntry entry={podium[0]} position={1} />
                    <PodiumEntry entry={podium[2]} position={3} />
                  </div>
                )}

                {podium.length >= 3 && rest.length > 0 && (
                  <div className="mb-4 h-px bg-sekkha-hairline-soft" aria-hidden="true" />
                )}

                {/* Ranked list — highlighted "Kamu" row (fix) */}
                {rest.length > 0 && (
                  <ul role="list" className="space-y-1">
                    {rest.map(entry => {
                      const isMe = entry.user_id === myId
                      const hint = isMe ? getCompetitionHint(entry, data.entries, metricUnit) : null

                      return (
                        <li
                          key={entry.user_id}
                          className={[
                            "flex items-center gap-4 rounded-lg px-4 py-3 transition-colors",
                            isMe
                              ? "border-2 border-sekkha-brand-blue bg-sekkha-brand-blue/10 shadow-sm"
                              : "hover:bg-sekkha-surface",
                          ].join(" ")}
                        >
                          <span className={`w-7 shrink-0 text-center text-body-sm-medium ${isMe ? "text-sekkha-brand-blue font-bold" : "text-sekkha-muted"}`}>
                            {entry.rank}
                          </span>
                          <ListAvatar initials={entry.initials} />
                          <div className="min-w-0 flex-1">
                            <p className={`truncate text-body-sm ${isMe ? "font-bold text-sekkha-brand-blue" : "text-sekkha-ink"}`}>
                              {entry.name}{isMe ? " ← Ini Kamu!" : ""}
                            </p>
                            {hint && (
                              <p className="mt-0.5 text-caption text-sekkha-brand-blue">
                                🚀 {hint}
                              </p>
                            )}
                          </div>
                          <span className={`shrink-0 text-body-sm-medium ${isMe ? "text-sekkha-brand-blue font-bold" : "text-sekkha-ink"}`}>
                            {entry.value.toLocaleString("id-ID")}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}

                {/* My rank if not in top */}
                {!myEntry.is_in_top && (
                  <div className="mt-2 flex items-center gap-4 rounded-lg border-2 border-sekkha-brand-blue bg-blue-50 px-4 py-3 shadow-sm">
                    <span className="w-7 shrink-0 text-center text-body-sm-medium font-bold text-sekkha-brand-blue">{myEntry.rank}</span>
                    <ListAvatar initials="AK" />
                    <p className="min-w-0 flex-1 text-body-sm font-bold text-sekkha-brand-blue">← Ini Kamu!</p>
                    <span className="text-body-sm-medium font-bold text-sekkha-brand-blue">{myEntry.value.toLocaleString("id-ID")}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right sidebar (desktop) */}
            <aside className="hidden w-80 shrink-0 md:block">
              <div className="sticky top-6 max-h-[calc(100vh-4rem)] space-y-4 overflow-y-auto">

                {/* My rank card */}
                <div className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sekkha-brand-yellow text-body-md-medium font-semibold text-sekkha-ink ring-2 ring-sekkha-hairline-soft">
                      AK
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-body-sm-medium text-sekkha-ink">Kamu</p>
                      <p className="text-caption text-sekkha-slate">{seasonLabel(season)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-center gap-5 rounded-lg bg-sekkha-surface py-3">
                    <div className="text-center">
                      <p className="text-heading-4 font-semibold text-sekkha-brand-blue">#{myEntry.rank}</p>
                      <p className="text-caption text-sekkha-slate">Rank</p>
                    </div>
                    <div className="h-8 w-px bg-sekkha-hairline" />
                    <div className="text-center">
                      <p className="text-heading-4 font-semibold text-sekkha-ink">{myEntry.value.toLocaleString("id-ID")}</p>
                      <p className="text-caption text-sekkha-slate capitalize">{metricUnit}</p>
                    </div>
                  </div>
                </div>

                {/* Streak Shield (new feature #1) */}
                <div className="rounded-xl border border-sekkha-hairline-soft bg-gradient-to-br from-blue-50 to-sekkha-canvas p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sekkha-brand-blue/10">
                      <ShieldIcon className="size-5 text-sekkha-brand-blue" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-body-sm-medium text-sekkha-ink">Streak Shield</p>
                      <p className="text-caption text-sekkha-slate">Milik kamu: <span className="font-semibold text-sekkha-brand-blue">{STREAK_SHIELD.owned}x</span></p>
                    </div>
                  </div>
                  <p className="mt-2 text-caption text-sekkha-slate">
                    🛡️ Lindungi streak-mu dari putus! Tukar {STREAK_SHIELD.cost} poin untuk 1 shield.
                  </p>
                  <button
                    type="button"
                    className="mt-3 w-full rounded-full bg-sekkha-brand-blue py-2 text-body-sm-medium text-white transition-opacity hover:opacity-90"
                  >
                    Tukar {STREAK_SHIELD.cost} Poin → 1 Shield
                  </button>
                </div>

                {/* Badges */}
                <div className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <AwardIcon className="size-5 text-sekkha-brand-yellow" aria-hidden="true" />
                    <h3 className="text-body-sm-medium text-sekkha-ink">Badge</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {SIDEBAR_BADGES.map(b => (
                      <div key={b.name} className="flex flex-col items-center gap-1.5" title={b.earned ? b.name : b.hint ?? ""}>
                        <div className={`flex h-11 w-11 items-center justify-center rounded-full text-lg ring-2 transition-transform ${
                          b.earned ? "bg-sekkha-surface-yellow ring-sekkha-brand-yellow/40 hover:scale-110" : "bg-sekkha-surface opacity-40 ring-sekkha-hairline-soft grayscale"
                        }`}>
                          {b.earned ? b.icon : "🔒"}
                        </div>
                        <p className={`w-full truncate text-center text-micro ${b.earned ? "text-sekkha-ink" : "text-sekkha-muted"}`}>{b.name}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Season end motivator */}
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-center">
                  <p className="text-body-sm font-medium text-orange-700">
                    ⏳ {SEASON_DAYS_LEFT} hari lagi! Ayo kejar peringkatmu! 🔥
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* Floating My Rank (mobile) */}
      <div className="fixed bottom-16 left-4 right-4 z-40 md:hidden">
        <div className="flex items-center gap-3 rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas px-4 py-3 shadow-lg">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sekkha-brand-yellow text-caption-bold font-semibold text-sekkha-ink">
            AK
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-body-sm-medium text-sekkha-ink">Posisimu</p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-body-sm-medium text-sekkha-brand-blue">#{myEntry.rank}</p>
            <div className="h-5 w-px bg-sekkha-hairline" />
            <div className="text-right">
              <p className="text-body-sm-medium text-sekkha-ink">{myEntry.value.toLocaleString("id-ID")}</p>
              <p className="text-micro text-sekkha-muted">{metricUnit}</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
