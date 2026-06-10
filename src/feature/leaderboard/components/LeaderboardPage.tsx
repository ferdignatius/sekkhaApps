// feature/leaderboard/components/LeaderboardPage
// Leaderboard page:
//  - period toggle: Bulanan / Tahunan
//  - period navigator: prev/next month (or year)
//  - metric selector: Poin / Streak / Kehadiran
//  - ranked list: top 3 podium + rows 4–N
//  - "posisiku" sticky card when user is outside top N

import { useState, useMemo } from "react"
import {
  TrophyIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  StarIcon,
  FlameIcon,
  CheckSquareIcon,
} from "lucide-react"
import { useAuth } from "@/feature/auth"
import { getLeaderboardData } from "../data/leaderboardDummy"
import type { LeaderboardMetric, LeaderboardPeriod, LeaderboardFilter } from "../types"

// ─── Constants ─────────────────────────────────────────────────────────────────

const METRIC_CONFIG: Record<LeaderboardMetric, { label: string; icon: React.ReactNode; unit: string }> = {
  points:     { label: "Poin",      icon: <StarIcon className="size-4" />,        unit: "poin"     },
  streak:     { label: "Streak",    icon: <FlameIcon className="size-4" />,       unit: "minggu"   },
  attendance: { label: "Kehadiran", icon: <CheckSquareIcon className="size-4" />, unit: "hadir"    },
}

const MONTHS_ID = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
]

const RANK_MEDAL: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: "bg-yellow-50 border-yellow-300",   text: "text-yellow-600", label: "🥇" },
  2: { bg: "bg-slate-50  border-slate-300",    text: "text-slate-500",  label: "🥈" },
  3: { bg: "bg-orange-50 border-orange-300",   text: "text-orange-600", label: "🥉" },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function periodLabel(period: LeaderboardPeriod, year: number, month: number): string {
  if (period === "yearly") return `${year}`
  return `${MONTHS_ID[month - 1]} ${year}`
}

function prevPeriod(period: LeaderboardPeriod, year: number, month: number) {
  if (period === "yearly") return { year: year - 1, month }
  if (month === 1) return { year: year - 1, month: 12 }
  return { year, month: month - 1 }
}

function nextPeriod(period: LeaderboardPeriod, year: number, month: number) {
  const now = new Date()
  if (period === "yearly") {
    if (year >= now.getFullYear()) return null
    return { year: year + 1, month }
  }
  if (year === now.getFullYear() && month === now.getMonth() + 1) return null
  if (month === 12) return { year: year + 1, month: 1 }
  return { year, month: month + 1 }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AvatarBubble({ initials, size = "md" }: { initials: string; size?: "sm" | "md" | "lg" }) {
  const sz = size === "lg" ? "h-12 w-12 text-body-sm-medium" : size === "md" ? "h-9 w-9 text-caption-bold" : "h-7 w-7 text-micro"
  return (
    <div className={`${sz} flex shrink-0 items-center justify-center rounded-full bg-sekkha-brand-yellow font-semibold text-sekkha-ink`}>
      {initials}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function LeaderboardPage() {
  const { authState } = useAuth()
  const myId = authState.status === "authenticated" ? (authState.userId ?? "me") : "me"

  const now = new Date()
  const [period, setPeriod]   = useState<LeaderboardPeriod>("monthly")
  const [metric, setMetric]   = useState<LeaderboardMetric>("points")
  const [year, setYear]       = useState(now.getFullYear())
  const [month, setMonth]     = useState(now.getMonth() + 1)

  const filter: LeaderboardFilter = useMemo(() => ({ period, metric, year, month }), [period, metric, year, month])

  const data = useMemo(() => getLeaderboardData(filter, myId), [filter, myId])

  const next = nextPeriod(period, year, month)

  function handlePrev() {
    const p = prevPeriod(period, year, month)
    setYear(p.year); setMonth(p.month)
  }
  function handleNext() {
    if (!next) return
    setYear(next.year); setMonth(next.month)
  }

  const podium = data.entries.slice(0, 3)
  const rest   = data.entries.slice(3)
  const myEntry = data.my_rank

  return (
    <main className="px-4 py-6 pb-24 md:px-8 md:pb-8 lg:px-12">
      <div className="mx-auto max-w-3xl space-y-5">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          <TrophyIcon className="size-5 text-sekkha-brand-yellow" aria-hidden="true" />
          <h1 className="text-heading-5 text-sekkha-ink">Leaderboard</h1>
        </div>

        {/* ── Period toggle ─────────────────────────────────────────────── */}
        <div className="flex gap-1 rounded-full bg-sekkha-surface p-1">
          {(["monthly", "yearly"] as LeaderboardPeriod[]).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`flex-1 rounded-full py-2 text-body-sm-medium transition-colors ${
                period === p
                  ? "bg-sekkha-canvas text-sekkha-ink shadow-sm"
                  : "text-sekkha-muted"
              }`}
            >
              {p === "monthly" ? "Bulanan" : "Tahunan"}
            </button>
          ))}
        </div>

        {/* ── Period navigator ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas px-4 py-3">
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Periode sebelumnya"
            className="rounded-full p-1.5 text-sekkha-slate hover:bg-sekkha-surface"
          >
            <ChevronLeftIcon className="size-5" />
          </button>
          <span className="text-body-sm-medium text-sekkha-ink">
            {periodLabel(period, year, month)}
          </span>
          <button
            type="button"
            onClick={handleNext}
            disabled={!next}
            aria-label="Periode berikutnya"
            className="rounded-full p-1.5 text-sekkha-slate hover:bg-sekkha-surface disabled:opacity-30"
          >
            <ChevronRightIcon className="size-5" />
          </button>
        </div>

        {/* ── Metric selector ───────────────────────────────────────────── */}
        <div className="flex gap-2">
          {(Object.entries(METRIC_CONFIG) as [LeaderboardMetric, typeof METRIC_CONFIG[LeaderboardMetric]][]).map(
            ([m, cfg]) => (
              <button
                key={m}
                type="button"
                onClick={() => setMetric(m)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-caption-bold transition-colors ${
                  metric === m
                    ? "bg-sekkha-primary text-white"
                    : "border border-sekkha-hairline-strong text-sekkha-slate"
                }`}
              >
                {cfg.icon}
                {cfg.label}
              </button>
            ),
          )}
        </div>

        {/* ── My rank card (always visible) ─────────────────────────────── */}
        <div className="flex items-center gap-3 rounded-xl border-2 border-sekkha-brand-blue bg-sekkha-surface px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sekkha-brand-blue text-body-sm-medium text-white font-semibold">
            #{myEntry.rank}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-body-sm-medium text-sekkha-ink">Posisiku</p>
            <p className="text-caption text-sekkha-slate">{myEntry.label}</p>
          </div>
          {myEntry.is_in_top && (
            <span className="text-caption text-sekkha-brand-blue">Masuk Top {data.entries.length}</span>
          )}
        </div>

        {/* ── Podium top 3 ──────────────────────────────────────────────── */}
        {podium.length > 0 && (
          <div className="flex items-end justify-center gap-3">
            {/* #2 */}
            {podium[1] && (
              <div className="flex flex-1 flex-col items-center gap-2">
                <AvatarBubble initials={podium[1].initials} size="md" />
                <p className="w-full truncate text-center text-caption text-sekkha-ink">{podium[1].name.split(" ")[0]}</p>
                <p className="text-caption-bold text-sekkha-slate">{podium[1].label}</p>
                <div className="flex h-14 w-full items-center justify-center rounded-t-xl border border-slate-200 bg-slate-50 text-xl">
                  🥈
                </div>
              </div>
            )}
            {/* #1 */}
            {podium[0] && (
              <div className="flex flex-1 flex-col items-center gap-2">
                <AvatarBubble initials={podium[0].initials} size="lg" />
                <TrophyIcon className="size-5 text-yellow-500" aria-hidden="true" />
                <p className="w-full truncate text-center text-caption-bold text-sekkha-ink">{podium[0].name.split(" ")[0]}</p>
                <p className="text-caption-bold text-yellow-600">{podium[0].label}</p>
                <div className="flex h-20 w-full items-center justify-center rounded-t-xl border border-yellow-300 bg-yellow-50 text-2xl">
                  🥇
                </div>
              </div>
            )}
            {/* #3 */}
            {podium[2] && (
              <div className="flex flex-1 flex-col items-center gap-2">
                <AvatarBubble initials={podium[2].initials} size="md" />
                <p className="w-full truncate text-center text-caption text-sekkha-ink">{podium[2].name.split(" ")[0]}</p>
                <p className="text-caption-bold text-sekkha-slate">{podium[2].label}</p>
                <div className="flex h-10 w-full items-center justify-center rounded-t-xl border border-orange-200 bg-orange-50 text-lg">
                  🥉
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Rows 4–N ──────────────────────────────────────────────────── */}
        {rest.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas">
            <ul role="list">
              {rest.map((entry, idx) => {
                const isMe = entry.user_id === myId
                return (
                  <li
                    key={entry.user_id}
                    className={`flex items-center gap-3 px-4 py-3 ${
                      idx < rest.length - 1 ? "border-b border-sekkha-hairline-soft" : ""
                    } ${isMe ? "bg-sekkha-teal-light" : ""}`}
                  >
                    {/* Rank number */}
                    <span className="w-6 shrink-0 text-center text-caption-bold text-sekkha-muted">
                      {entry.rank}
                    </span>

                    <AvatarBubble initials={entry.initials} size="sm" />

                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-body-sm ${isMe ? "font-medium text-sekkha-ink" : "text-sekkha-ink"}`}>
                        {entry.name}{isMe ? " (kamu)" : ""}
                      </p>
                    </div>

                    <span className="shrink-0 text-body-sm-medium text-sekkha-slate">
                      {entry.label}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* ── My rank row (if not in top list at all) ───────────────────── */}
        {!myEntry.is_in_top && (
          <div className="overflow-hidden rounded-xl border-2 border-dashed border-sekkha-brand-blue bg-sekkha-canvas">
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="w-6 shrink-0 text-center text-caption-bold text-sekkha-brand-blue">
                {myEntry.rank}
              </span>
              <AvatarBubble initials="AK" size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-body-sm-medium text-sekkha-ink">Kamu</p>
              </div>
              <span className="text-body-sm-medium text-sekkha-slate">{myEntry.label}</span>
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
