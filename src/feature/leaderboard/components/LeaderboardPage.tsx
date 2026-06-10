// feature/leaderboard/components/LeaderboardPage
// Season-based leaderboard (6 months per season).
// Layout:
//  1. Title
//  2. Metric filter pills (Poin / Streak / Kehadiran)
//  3. Podium top 3 (crown on #1, #2 left, #3 right)
//  4. Season navigator ← Season 2 · Jul–Des 2025 →
//  5. Ranked list — user's row highlighted with accent border + bg

import { useState, useMemo } from "react"
import {
  TrophyIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  StarIcon,
  FlameIcon,
  CheckSquareIcon,
  CrownIcon,
} from "lucide-react"
import { useAuth } from "@/feature/auth"
import { getLeaderboardData } from "../data/leaderboardDummy"
import {
  getCurrentSeason,
  seasonLabel,
  prevSeason,
  nextSeason,
} from "../types"
import type { LeaderboardMetric, LeaderboardFilter, LeaderboardEntry, Season } from "../types"

// ─── Constants ─────────────────────────────────────────────────────────────────

const METRIC_OPTIONS: { value: LeaderboardMetric; label: string; icon: React.ReactNode }[] = [
  { value: "points",     label: "Poin",      icon: <StarIcon className="size-3.5" />        },
  { value: "streak",     label: "Streak",    icon: <FlameIcon className="size-3.5" />       },
  { value: "attendance", label: "Kehadiran", icon: <CheckSquareIcon className="size-3.5" /> },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ initials, size = "md" }: { initials: string; size?: "sm" | "md" | "lg" }) {
  const sz = size === "lg" ? "h-16 w-16 text-heading-4" : size === "md" ? "h-11 w-11 text-body-sm-medium" : "h-8 w-8 text-caption-bold"
  return (
    <div className={`${sz} flex shrink-0 items-center justify-center rounded-full bg-sekkha-brand-yellow font-semibold text-sekkha-ink ring-2 ring-sekkha-hairline-soft`}>
      {initials}
    </div>
  )
}

function PodiumEntry({ entry, position }: { entry: LeaderboardEntry; position: 1 | 2 | 3 }) {
  const isFirst = position === 1
  const heightClass = position === 1 ? "h-20" : position === 2 ? "h-14" : "h-10"
  const badgeColors = position === 1 ? "bg-yellow-400 text-white" : position === 2 ? "bg-slate-400 text-white" : "bg-orange-400 text-white"

  return (
    <div className="flex flex-1 flex-col items-center gap-1">
      {isFirst && <CrownIcon className="size-6 text-yellow-500" aria-hidden="true" />}
      <div className="relative">
        <Avatar initials={entry.initials} size={isFirst ? "lg" : "md"} />
        <span className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-micro font-bold ${badgeColors}`}>
          {position}
        </span>
      </div>
      <p className={`mt-1 w-full truncate text-center ${isFirst ? "text-body-sm-medium" : "text-caption"} text-sekkha-ink`}>
        {entry.name.split(" ")[0]}
      </p>
      <p className="text-caption text-sekkha-slate">{entry.value.toLocaleString("id-ID")}</p>
      <div className={`${heightClass} w-full rounded-t-xl ${
        position === 1 ? "border border-yellow-300 bg-yellow-100" :
        position === 2 ? "border border-slate-200 bg-slate-100" :
        "border border-orange-200 bg-orange-50"
      }`} />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function LeaderboardPage() {
  const { authState } = useAuth()
  const myId = authState.status === "authenticated" ? (authState.userId ?? "me") : "me"

  const [season, setSeason] = useState<Season>(getCurrentSeason())
  const [metric, setMetric] = useState<LeaderboardMetric>("points")

  const filter: LeaderboardFilter = useMemo(() => ({ season, metric }), [season, metric])
  const data = useMemo(() => getLeaderboardData(filter, myId), [filter, myId])

  const next = nextSeason(season)

  function handlePrev() { setSeason(prevSeason(season)) }
  function handleNext() { if (next) setSeason(next) }

  const podium = data.entries.slice(0, 3)
  const rest = data.entries.slice(3)
  const myEntry = data.my_rank

  return (
    <main className="px-4 py-6 pb-24 md:px-8 md:pb-8 lg:px-12">
      <div className="mx-auto max-w-3xl space-y-4">

        {/* ── Title ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          <TrophyIcon className="size-5 text-sekkha-brand-yellow" aria-hidden="true" />
          <h1 className="text-heading-5 text-sekkha-ink">Leaderboard</h1>
        </div>

        {/* ── Metric filter pills ───────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          {METRIC_OPTIONS.map(m => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMetric(m.value)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-caption-bold transition-colors ${
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

        {/* ── Podium top 3 ──────────────────────────────────────────────── */}
        {podium.length >= 3 && (
          <div className="flex items-end justify-center gap-2 pt-4 pb-2">
            <PodiumEntry entry={podium[1]} position={2} />
            <PodiumEntry entry={podium[0]} position={1} />
            <PodiumEntry entry={podium[2]} position={3} />
          </div>
        )}

        {/* ── Season navigator ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas px-4 py-2.5">
          <button type="button" onClick={handlePrev} aria-label="Season sebelumnya" className="rounded-full p-1 text-sekkha-slate hover:bg-sekkha-surface">
            <ChevronLeftIcon className="size-5" />
          </button>
          <span className="text-body-sm-medium text-sekkha-ink">{seasonLabel(season)}</span>
          <button type="button" onClick={handleNext} disabled={!next} aria-label="Season berikutnya" className="rounded-full p-1 text-sekkha-slate hover:bg-sekkha-surface disabled:opacity-30">
            <ChevronRightIcon className="size-5" />
          </button>
        </div>

        {/* ── Ranked list ───────────────────────────────────────────────── */}
        {rest.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas">
            <ul role="list">
              {rest.map((entry, idx) => {
                const isMe = entry.user_id === myId
                return (
                  <li
                    key={entry.user_id}
                    className={[
                      "flex items-center gap-3 px-4 py-3",
                      idx < rest.length - 1 ? "border-b border-sekkha-hairline-soft" : "",
                      isMe ? "border-l-4 border-l-sekkha-brand-blue bg-sekkha-teal-light" : "",
                    ].join(" ")}
                  >
                    <span className={`w-6 shrink-0 text-center text-caption-bold ${isMe ? "text-sekkha-brand-blue" : "text-sekkha-muted"}`}>{entry.rank}</span>
                    <Avatar initials={entry.initials} size="sm" />
                    <p className={`min-w-0 flex-1 truncate text-body-sm ${isMe ? "font-semibold text-sekkha-brand-blue" : "text-sekkha-ink"}`}>
                      {entry.name}{isMe ? " (kamu)" : ""}
                    </p>
                    <span className={`shrink-0 text-body-sm-medium ${isMe ? "text-sekkha-brand-blue" : "text-sekkha-slate"}`}>{entry.value.toLocaleString("id-ID")}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* ── My rank if not in top ─────────────────────────────────────── */}
        {!myEntry.is_in_top && (
          <div className="overflow-hidden rounded-xl border-l-4 border-sekkha-brand-blue bg-sekkha-teal-light">
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="w-6 shrink-0 text-center text-caption-bold text-sekkha-brand-blue">{myEntry.rank}</span>
              <Avatar initials="AK" size="sm" />
              <p className="min-w-0 flex-1 text-body-sm font-semibold text-sekkha-brand-blue">Kamu</p>
              <span className="text-body-sm-medium text-sekkha-brand-blue">{myEntry.value.toLocaleString("id-ID")}</span>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
