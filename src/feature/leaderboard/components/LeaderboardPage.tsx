// feature/leaderboard/components/LeaderboardPage
// Redesigned per feedback:
//  - Podium: filled bars with rank number + poin inside, exponential height, medal-colored avatars
//  - Typography: larger bold poin text, WCAG-compliant season label
//  - List: neutral avatar colors (rank 4+), more gap between elements
//  - Sidebar: badges + mini stats below "my rank" card
//  - Sidebar nav spacing fix delegated to app-sidebar (separate)

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
  { value: "points",     label: "Poin",      icon: <StarIcon className="size-3.5" />        },
  { value: "streak",     label: "Streak",    icon: <FlameIcon className="size-3.5" />       },
  { value: "attendance", label: "Kehadiran", icon: <CheckSquareIcon className="size-3.5" /> },
]

// Medal-based avatar colors per DESIGN.md brand palette
const PODIUM_AVATAR_COLORS: Record<1 | 2 | 3, string> = {
  1: "bg-sekkha-brand-yellow text-sekkha-ink",         // Gold
  2: "bg-sekkha-hairline text-sekkha-slate",           // Silver
  3: "bg-orange-200 text-orange-800",                  // Bronze
}

const PODIUM_BAR_STYLES: Record<1 | 2 | 3, { height: string; bg: string; text: string }> = {
  1: { height: "h-28", bg: "bg-yellow-50 border-yellow-300",  text: "text-yellow-400" },
  2: { height: "h-16", bg: "bg-slate-50 border-slate-200",    text: "text-slate-300"  },
  3: { height: "h-10", bg: "bg-orange-50 border-orange-200",  text: "text-orange-300" },
}

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
      {/* Crown for #1 */}
      {isFirst && <CrownIcon className="size-7 text-yellow-500 drop-shadow-sm" aria-hidden="true" />}

      {/* Avatar */}
      <PodiumAvatar initials={entry.initials} position={position} />

      {/* Name */}
      <p className={`mt-1 w-full truncate text-center ${isFirst ? "text-body-sm-medium text-sekkha-ink" : "text-caption text-sekkha-ink"}`}>
        {entry.name.split(" ")[0]}
      </p>

      {/* Poin — LARGER and BOLD per feedback */}
      <p className={`${isFirst ? "text-body-md-medium text-sekkha-ink" : "text-body-sm-medium text-sekkha-charcoal"}`}>
        {entry.value.toLocaleString("id-ID")}
      </p>

      {/* Podium bar — filled with rank number at low opacity */}
      <div className={`${bar.height} relative w-full overflow-hidden rounded-t-xl border ${bar.bg}`}>
        {/* Large rank number as decorative fill */}
        <span className={`absolute inset-0 flex items-center justify-center text-stat-display font-bold opacity-20 ${bar.text}`}>
          {position}
        </span>
      </div>
    </div>
  )
}

function ListAvatar({ initials }: { initials: string }) {
  // Neutral color for rank 4+ per feedback — soft surface bg, slate text
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sekkha-surface text-caption-bold font-semibold text-sekkha-slate ring-1 ring-sekkha-hairline-soft">
      {initials}
    </div>
  )
}

function SidebarAvatar({ initials }: { initials: string }) {
  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-sekkha-brand-yellow text-heading-4 font-semibold text-sekkha-ink ring-3 ring-sekkha-hairline-soft">
      {initials}
    </div>
  )
}

// ─── Dummy badges for sidebar ─────────────────────────────────────────────────

const RECENT_BADGES = [
  { icon: "🔥", name: "Streak 5" },
  { icon: "⭐", name: "100 Poin" },
  { icon: "🎯", name: "Hadir" },
]

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

          {/* ── Title + season (full width, above columns) ────────────────── */}
        <div>
          <div className="flex items-center gap-2">
            <TrophyIcon className="size-5 text-sekkha-brand-yellow" aria-hidden="true" />
            <h1 className="text-heading-5 text-sekkha-ink">Leaderboard</h1>
          </div>
          <p className="mt-1 text-body-sm text-sekkha-slate">{seasonLabel(season)}</p>
        </div>

        {/* Metric filter pills (full width) */}
        <div className="flex flex-wrap gap-2">
          {METRIC_OPTIONS.map(m => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMetric(m.value)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-caption-bold transition-colors ${
                metric === m.value
                  ? "bg-sekkha-primary text-white"
                  : "border border-sekkha-hairline-strong text-sekkha-slate"
              }`}
            >
              {m.icon}
              {m.label}
            </button>
          ))}
        </div>

        {/* ── Two-column layout starts here ─────────────────────────────── */}
        <div className="md:flex md:gap-6">

        {/* ── Left column ───────────────────────────────────────────────── */}
        <div className="flex-1 space-y-5">

          {/* Card wrapping podium + list */}
          <div className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-5">

            {/* Podium top 3 — exponential height difference */}
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

            {/* Ranked list 4+ — improved spacing per feedback */}
            {rest.length > 0 && (
              <ul role="list" className="space-y-1">
                {rest.map(entry => {
                  const isMe = entry.user_id === myId
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
                      <p className={`min-w-0 flex-1 truncate text-body-sm ${isMe ? "font-semibold text-sekkha-brand-blue" : "text-sekkha-ink"}`}>
                        {entry.name}{isMe ? " (kamu)" : ""}
                      </p>
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

        {/* ── Right sidebar: My Rank + extras (desktop) ─────────────────── */}
        <aside className="hidden w-72 shrink-0 md:block">
          <div className="sticky top-6 space-y-4">

            {/* My rank card */}
            <div className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-5">
              <div className="flex flex-col items-center gap-3 text-center">
                <SidebarAvatar initials="AK" />
                <div>
                  <p className="text-body-md-medium text-sekkha-ink">Kamu</p>
                  <p className="text-caption text-sekkha-slate">{seasonLabel(season)}</p>
                </div>
                <div className="flex w-full items-center justify-center gap-5 rounded-xl bg-sekkha-surface py-4">
                  <div className="text-center">
                    <p className="text-heading-3 font-semibold text-sekkha-brand-blue">#{myEntry.rank}</p>
                    <p className="text-caption text-sekkha-slate">Rank</p>
                  </div>
                  <div className="h-10 w-px bg-sekkha-hairline" />
                  <div className="text-center">
                    <p className="text-heading-3 font-semibold text-sekkha-ink">{myEntry.value.toLocaleString("id-ID")}</p>
                    <p className="text-caption text-sekkha-slate capitalize">{metricUnit}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent badges — fills whitespace per feedback */}
            <div className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-5">
              <div className="mb-3 flex items-center gap-2">
                <AwardIcon className="size-4 text-sekkha-brand-yellow" aria-hidden="true" />
                <h3 className="text-caption-bold text-sekkha-ink">Badge Terbaru</h3>
              </div>
              <div className="flex justify-center gap-4">
                {RECENT_BADGES.map(b => (
                  <div key={b.name} className="flex flex-col items-center gap-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sekkha-surface text-lg ring-1 ring-sekkha-hairline-soft">
                      {b.icon}
                    </div>
                    <p className="text-micro text-sekkha-slate">{b.name}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Mini stat hint */}
            <div className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-surface p-4 text-center">
              <p className="text-caption text-sekkha-slate">
                Terus hadir untuk naik peringkat! 🚀
              </p>
            </div>
          </div>
        </aside>
      </div>
      </div>

      {/* ── Floating My Rank (mobile) ──────────────────────────────────── */}
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
      </div>
    </main>
  )
}
