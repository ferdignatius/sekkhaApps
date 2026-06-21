// feature/leaderboard/components/LeaderboardPage
// Gamification-focused leaderboard with:
//  - High-contrast podium (Gold/Silver/Bronze)
//  - Competition hints ("X poin lagi untuk menyalip Y!")
//  - Prominent badge section with locked/unlocked states
//  - Icon-first filter pills

import { useState, useMemo } from "react"
import {
  TrophyIcon,
  StarIcon,
  FlameIcon,
  CheckSquareIcon,
  CrownIcon,
  AwardIcon,
} from "lucide-react"
import { useAuth } from "@/feature/auth"
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

// Medal-based avatar colors
const PODIUM_AVATAR_COLORS: Record<1 | 2 | 3, string> = {
  1: "bg-sekkha-brand-yellow text-sekkha-ink",
  2: "bg-sekkha-hairline text-sekkha-slate",
  3: "bg-orange-200 text-orange-800",
}

// HIGH-CONTRAST podium bar styles (fix #1)
const PODIUM_BAR_STYLES: Record<1 | 2 | 3, { height: string; bg: string; rankColor: string }> = {
  1: { height: "h-28", bg: "bg-gradient-to-t from-yellow-200 to-yellow-50 border border-yellow-300", rankColor: "text-yellow-600" },
  2: { height: "h-16", bg: "bg-gradient-to-t from-slate-200 to-slate-50 border border-slate-300", rankColor: "text-slate-500" },
  3: { height: "h-10", bg: "bg-gradient-to-t from-orange-200 to-orange-50 border border-orange-300", rankColor: "text-orange-500" },
}

// ─── Dummy badges with locked state (fix #3) ─────────────────────────────────

interface SidebarBadge {
  icon: string
  name: string
  earned: boolean
  hint?: string
}

const SIDEBAR_BADGES: SidebarBadge[] = [
  { icon: "🔥", name: "Streak 5", earned: true },
  { icon: "⭐", name: "100 Poin", earned: true },
  { icon: "🎯", name: "Hadir", earned: true },
  { icon: "💎", name: "Streak 20", earned: false, hint: "Hadir 20 minggu berturut-turut" },
  { icon: "🏆", name: "500 Poin", earned: false, hint: "Kumpulkan 500 poin total" },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function PodiumAvatar({ initials, position }: { initials: string; position: 1 | 2 | 3 }) {
  const isFirst = position === 1
  const sz = isFirst ? "h-18 w-18 text-heading-4" : "h-12 w-12 text-body-md-medium"
  const colors = PODIUM_AVATAR_COLORS[position]
  const badgeColors = position === 1 ? "bg-yellow-500 text-white" : position === 2 ? "bg-slate-400 text-white" : "bg-orange-500 text-white"

  return (
    <div className="relative">
      <div className={`${sz} flex shrink-0 items-center justify-center rounded-full font-semibold ring-3 ring-white ${colors}`}>
        {initials}
      </div>
      <span className={`absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full text-micro font-bold shadow-sm ${badgeColors}`}>
        {position}
      </span>
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
      {/* Podium bar — HIGH CONTRAST rank number (fix #1) */}
      <div className={`${bar.height} relative w-full overflow-hidden rounded-t-xl ${bar.bg}`}>
        <span className={`absolute inset-0 flex items-center justify-center text-stat-display font-bold opacity-60 ${bar.rankColor}`}>
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

// ─── Helper: competition hint (fix #2) ───────────────────────────────────────

function getCompetitionHint(
  entry: LeaderboardEntry,
  allEntries: LeaderboardEntry[],
  metricUnit: string,
): string | null {
  const idx = allEntries.findIndex(e => e.user_id === entry.user_id)
  if (idx <= 0) return null // already first or not found
  const above = allEntries[idx - 1]
  const diff = above.value - entry.value
  if (diff <= 0) return null
  const firstName = above.name.split(" ")[0]
  return `${diff} ${metricUnit} lagi untuk menyalip ${firstName}!`
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

  return (
    <main className="relative">
      <PageBreadcrumb items={[{ label: "Beranda", href: "/dashboard" }, { label: "Leaderboard" }]} />
      <div className="px-4 py-6 pb-32 md:px-8 md:pb-8 lg:px-12">
        <div className="mx-auto max-w-8xl space-y-5">

          {/* Title + season */}
          <div>
            <div className="flex items-center gap-2">
              <TrophyIcon className="size-5 text-sekkha-brand-yellow" aria-hidden="true" />
              <h1 className="text-heading-5 text-sekkha-ink">Leaderboard</h1>
            </div>
            <p className="mt-1 text-body-sm text-sekkha-slate">{seasonLabel(season)}</p>
          </div>

          {/* Metric filter pills with icons (fix #4) */}
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

                {/* Podium top 3 */}
                {podium.length >= 3 && (
                  <div className="flex items-end justify-center gap-3 pb-5">
                    <PodiumEntry entry={podium[1]} position={2} />
                    <PodiumEntry entry={podium[0]} position={1} />
                    <PodiumEntry entry={podium[2]} position={3} />
                  </div>
                )}

                {/* Divider */}
                {podium.length >= 3 && rest.length > 0 && (
                  <div className="mb-4 h-px bg-sekkha-hairline-soft" aria-hidden="true" />
                )}

                {/* Ranked list 4+ with competition hints (fix #2) */}
                {rest.length > 0 && (
                  <ul role="list" className="space-y-1">
                    {rest.map(entry => {
                      const isMe = entry.user_id === myId
                      const hint = isMe ? getCompetitionHint(entry, data.entries, metricUnit) : null

                      return (
                        <li
                          key={entry.user_id}
                          className={[
                            "flex items-center gap-4 rounded-lg px-4 py-3",
                            isMe ? "border-l-4 border-l-sekkha-brand-blue bg-sekkha-teal-light" : "hover:bg-sekkha-surface",
                          ].join(" ")}
                        >
                          <span className={`w-7 shrink-0 text-center text-body-sm-medium ${isMe ? "text-sekkha-brand-blue" : "text-sekkha-muted"}`}>
                            {entry.rank}
                          </span>
                          <ListAvatar initials={entry.initials} />
                          <div className="min-w-0 flex-1">
                            <p className={`truncate text-body-sm ${isMe ? "font-semibold text-sekkha-brand-blue" : "text-sekkha-ink"}`}>
                              {entry.name}{isMe ? " (kamu)" : ""}
                            </p>
                            {/* Competition hint (fix #2) */}
                            {hint && (
                              <p className="mt-0.5 text-caption text-sekkha-brand-blue">
                                🚀 {hint}
                              </p>
                            )}
                          </div>
                          <span className={`shrink-0 text-body-sm-medium ${isMe ? "text-sekkha-brand-blue" : "text-sekkha-ink"}`}>
                            {entry.value.toLocaleString("id-ID")}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}

                {/* My rank if not in top */}
                {!myEntry.is_in_top && (
                  <div className="mt-2 flex items-center gap-4 rounded-lg border-l-4 border-l-sekkha-brand-blue bg-sekkha-teal-light px-4 py-3">
                    <span className="w-7 shrink-0 text-center text-body-sm-medium text-sekkha-brand-blue">{myEntry.rank}</span>
                    <ListAvatar initials="AK" />
                    <p className="min-w-0 flex-1 text-body-sm font-semibold text-sekkha-brand-blue">Kamu</p>
                    <span className="text-body-sm-medium text-sekkha-brand-blue">{myEntry.value.toLocaleString("id-ID")}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right sidebar (desktop) */}
            <aside className="hidden w-80 shrink-0 md:block">
              <div className="sticky top-6 max-h-[calc(100vh-4rem)] space-y-4 overflow-y-auto">

                {/* My rank card — compact */}
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

                {/* Badges — PROMINENT with locked/unlocked (fix #3) */}
                <div className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <AwardIcon className="size-5 text-sekkha-brand-yellow" aria-hidden="true" />
                    <h3 className="text-body-sm-medium text-sekkha-ink">Badge</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {SIDEBAR_BADGES.map(b => (
                      <div
                        key={b.name}
                        className="flex flex-col items-center gap-1.5"
                        title={b.earned ? b.name : b.hint ?? ""}
                      >
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-full text-xl ring-2 transition-transform ${
                            b.earned
                              ? "bg-sekkha-surface-yellow ring-sekkha-brand-yellow/40 hover:scale-110"
                              : "bg-sekkha-surface opacity-40 ring-sekkha-hairline-soft grayscale"
                          }`}
                        >
                          {b.earned ? b.icon : "🔒"}
                        </div>
                        <p className={`w-full truncate text-center text-micro ${b.earned ? "text-sekkha-ink" : "text-sekkha-muted"}`}>
                          {b.name}
                        </p>
                      </div>
                    ))}
                  </div>
                  {/* Locked hint */}
                  <p className="mt-3 text-center text-caption text-sekkha-muted">
                    Badge abu-abu = belum didapatkan. Terus aktif! 💪
                  </p>
                </div>

                {/* Motivational hint */}
                <div className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-surface-yellow p-4 text-center">
                  <p className="text-body-sm text-sekkha-charcoal">
                    🚀 Terus hadir untuk naik peringkat dan buka badge baru!
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
