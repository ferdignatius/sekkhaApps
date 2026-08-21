// feature/leaderboard/components/LeaderboardPage
// Overhauled UI/UX with Rich Glassmorphism Aesthetics & Clear User Rank Indicator:
// - Ambient background blur glow effects
// - Dedicated My Rank Indicator Banner & Right Sidebar Widget
// - Clean desktop padding with no empty bottom gap
// - Frosted glass cards with backdrop-blur-2xl & subtle borders.

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
} from "lucide-react"
import { useAuth } from "@/modules/auth"
import { api } from "@/lib/api"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { getCurrentSeason, seasonLabel } from "../types"
import type { LeaderboardMetric, LeaderboardEntry } from "../types"

// ─── Constants ─────────────────────────────────────────────────────────────────

const METRIC_OPTIONS: { value: LeaderboardMetric; label: string; icon: React.ReactNode }[] = [
  { value: "points",     label: "Total Poin",  icon: <StarIcon className="size-3.5 sm:size-4 text-amber-400" /> },
  { value: "streak",     label: "Streak",       icon: <FlameIcon className="size-3.5 sm:size-4 text-orange-500" /> },
  { value: "attendance", label: "Hadir",        icon: <CheckSquareIcon className="size-3.5 sm:size-4 text-emerald-500" /> },
]

// Solid & Gradient Medal Colors for Podium
const PODIUM_CONFIG: Record<1 | 2 | 3, {
  height: string
  barBg: string
  border: string
  avatarRing: string
  avatarBg: string
  crownColor: string
  badgeBg: string
  rankText: string
  medalEmoji: string
}> = {
  1: {
    height: "h-32 sm:h-40",
    barBg: "bg-gradient-to-t from-amber-500 via-amber-400 to-yellow-300 shadow-amber-200",
    border: "border-amber-400/80 ring-2 ring-amber-300/50",
    avatarRing: "ring-3 sm:ring-4 ring-amber-300 shadow-lg shadow-amber-300/40",
    avatarBg: "bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 text-amber-950 font-black",
    crownColor: "text-amber-400 drop-shadow-md animate-bounce duration-1000",
    badgeBg: "bg-amber-500 text-amber-950",
    rankText: "text-amber-950 font-black",
    medalEmoji: "🥇",
  },
  2: {
    height: "h-20 sm:h-28",
    barBg: "bg-gradient-to-t from-slate-400 via-slate-300 to-slate-200 shadow-slate-200",
    border: "border-slate-300/80 ring-2 ring-slate-200/50",
    avatarRing: "ring-3 sm:ring-4 ring-slate-300 shadow-md",
    avatarBg: "bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 text-slate-900 font-bold",
    crownColor: "text-slate-400",
    badgeBg: "bg-slate-400 text-slate-950",
    rankText: "text-slate-800 font-extrabold",
    medalEmoji: "🥈",
  },
  3: {
    height: "h-14 sm:h-20",
    barBg: "bg-gradient-to-t from-amber-700 via-amber-600 to-orange-400 shadow-orange-200",
    border: "border-amber-600/80 ring-2 ring-orange-300/40",
    avatarRing: "ring-3 sm:ring-4 ring-amber-500/60 shadow-md",
    avatarBg: "bg-gradient-to-br from-orange-400 via-amber-600 to-amber-700 text-amber-950 font-bold",
    crownColor: "text-amber-600",
    badgeBg: "bg-amber-600 text-amber-950",
    rankText: "text-amber-950 font-bold",
    medalEmoji: "🥉",
  },
}

// Season countdown
const SEASON_DAYS_LEFT = 12

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
  const aboveName = above.name ? above.name.split(" ")[0] : "peringkat atas"
  return `${diff.toLocaleString("id-ID")} ${metricUnit} lagi untuk menyalip ${aboveName}!`
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function PodiumEntry({ entry, position, myId }: { entry?: LeaderboardEntry; position: 1 | 2 | 3; myId?: string }) {
  if (!entry) return null
  const isFirst = position === 1
  const isMe = entry.user_id === myId
  const cfg = PODIUM_CONFIG[position]
  const avatarSize = isFirst ? "h-14 w-14 sm:h-20 sm:w-20 text-caption-bold sm:text-body-lg font-black" : "h-11 w-11 sm:h-14 sm:w-14 text-micro-bold sm:text-body-base font-bold"

  return (
    <div className={`flex flex-1 flex-col items-center gap-1 sm:gap-1.5 min-w-0 transition-all duration-300 relative ${
      isMe ? "scale-102 z-20" : ""
    }`}>
      {/* Crown or Medal Emoji for top 3 */}
      {isFirst ? (
        <CrownIcon className={`size-6 sm:size-8 ${cfg.crownColor}`} aria-hidden="true" />
      ) : (
        <span className="text-base sm:text-xl leading-none">{cfg.medalEmoji}</span>
      )}

      {/* Avatar Container */}
      <div className="relative shrink-0">
        {isMe && (
          <div className="absolute -inset-1 rounded-2xl bg-sekkha-brand-blue/30 blur-sm animate-pulse" />
        )}
        <div className={`relative ${avatarSize} flex shrink-0 items-center justify-center rounded-2xl shadow-md ${
          isMe
            ? "ring-4 ring-sekkha-brand-blue ring-offset-2 ring-offset-white shadow-lg shadow-sekkha-brand-blue/30 bg-gradient-to-br from-blue-600 via-sekkha-brand-blue to-indigo-700 text-white"
            : `${cfg.avatarRing} ${cfg.avatarBg}`
        }`}>
          {entry.initials}
        </div>
        <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow-xs ${
          isMe ? "bg-sekkha-brand-blue text-white ring-2 ring-white" : cfg.badgeBg
        }`}>
          #{position}
        </div>
      </div>

      {/* User Name & Score */}
      <div className="mt-1.5 text-center w-full px-0.5 min-w-0">
        <div className="flex items-center justify-center gap-1">
          <p className={`truncate font-black ${isMe ? "text-sekkha-brand-blue text-caption-bold" : "text-sekkha-ink"} ${isFirst ? "text-micro-bold sm:text-body-sm" : "text-[11px] sm:text-caption"}`}>
            {entry.name.split(" ")[0]}
          </p>
          {isMe && (
            <span className="rounded-md bg-sekkha-brand-blue text-white px-1.5 py-0.5 text-[8px] sm:text-[9px] font-black uppercase shrink-0 shadow-2xs">
              Kamu
            </span>
          )}
        </div>
        <p className="text-[10px] sm:text-micro font-black text-sekkha-brand-blue flex items-center justify-center gap-0.5 sm:gap-1 mt-0.5">
          <ZapIcon className="size-2.5 sm:size-3 text-amber-500 fill-amber-400 shrink-0" />
          <span className="truncate">{entry.value.toLocaleString("id-ID")}</span>
        </p>
      </div>

      {/* Clean Metallic Podium Pillar Bar */}
      <div className={`${cfg.height} relative w-full overflow-hidden rounded-t-2xl border-t border-x ${
        isMe
          ? "border-sekkha-brand-blue ring-2 ring-sekkha-brand-blue/30 shadow-md shadow-sekkha-brand-blue/10"
          : cfg.border
      } ${cfg.barBg} flex items-center justify-center shadow-md`}>
        <span className={`text-body-lg sm:text-stat-display opacity-40 select-none ${cfg.rankText}`}>
          {position}
        </span>
      </div>
    </div>
  )
}

function ListAvatar({ initials, isMe }: { initials: string; isMe?: boolean }) {
  return (
    <div className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl text-micro-bold sm:text-caption-bold font-bold transition-transform ${
      isMe
        ? "bg-sekkha-brand-blue text-white shadow-xs"
        : "bg-sekkha-surface/90 text-sekkha-slate ring-1 ring-sekkha-hairline-soft"
    }`}>
      {initials}
    </div>
  )
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export function LeaderboardPage() {
  const { authState } = useAuth()
  const myId = authState.status === "authenticated" ? authState.userId ?? "" : ""

  const season = getCurrentSeason()
  const [metric, setMetric] = useState<LeaderboardMetric>("points")
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [myRankData, setMyRankData] = useState<any>(null)
  const [communityGoal, setCommunityGoal] = useState({
    current: 0,
    target: 500,
    label: "Target Absensi Komunitas Vihara",
  })

  useEffect(() => {
    loadLeaderboard()
  }, [metric])

  async function loadLeaderboard() {
    try {
      const res = await api.get<{
        entries: LeaderboardEntry[]
        my_rank: any
        community_goal?: { current: number; target: number; label: string }
      }>(`/leaderboard?metric=${metric}`)
      setEntries(res.entries ?? [])
      setMyRankData(res.my_rank ?? null)
      if (res.community_goal) {
        setCommunityGoal(res.community_goal)
      }
    } catch (err) {
      console.error("Gagal memuat leaderboard:", err)
      setEntries([])
    }
  }

  const validEntries = (Array.isArray(entries) ? entries : []).filter(
    (e): e is LeaderboardEntry => Boolean(e) && typeof e === "object" && typeof e.value === "number"
  )
  const podium = validEntries.slice(0, 3)
  const rest = validEntries.slice(3)
  const myEntry = myRankData
  const myRank = myEntry?.rank ?? "-"
  const myValue = myEntry?.value ?? 0
  const metricUnit = metric === "points" ? "poin" : metric === "streak" ? "minggu" : "kehadiran"

  const communityPct = Math.min(100, Math.round(((communityGoal.current || 0) / (communityGoal.target || 500)) * 100))

  return (
    <main className="relative font-sans overflow-hidden">
      {/* ── Glassmorphism Ambient Glow Backdrops ── */}
      <div className="pointer-events-none absolute -top-20 left-1/4 h-96 w-96 rounded-full bg-sekkha-brand-blue/15 blur-3xl" />
      <div className="pointer-events-none absolute top-40 right-10 h-80 w-80 rounded-full bg-amber-400/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-40 left-10 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />

      {/* ── Page Breadcrumb (No redundant H1 header below as per user request) ── */}
      <PageBreadcrumb items={[{ label: "Leaderboard" }]} />

      <div className="relative px-3.5 py-4 pb-24 md:pb-8 lg:pb-10 sm:px-6 md:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl space-y-4 sm:space-y-5">

          {/* ── Top Header Banner: Season Badge & Countdown Urgency ── */}
          <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-r from-sekkha-brand-blue/15 via-white/80 to-amber-400/15 backdrop-blur-2xl p-4 sm:p-6 shadow-xl shadow-sekkha-brand-blue/5">
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-amber-950 shadow-md">
                  <TrophyIcon className="size-5 sm:size-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-amber-400/20 border border-amber-400/40 px-2.5 py-0.5 text-micro-bold text-amber-900 font-extrabold">
                      {seasonLabel(season)}
                    </span>
                  </div>
                  <h1 className="text-body-base sm:text-heading-5 font-black text-sekkha-ink mt-0.5">
                    Papan Peringkat Komunitas
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto rounded-full bg-white/80 border border-white/90 px-3 py-1 text-micro-bold text-sekkha-slate shadow-xs backdrop-blur-md">
                <TimerIcon className="size-3.5 text-sekkha-brand-blue shrink-0 animate-pulse" />
                <span>Berakhir dalam <strong>{SEASON_DAYS_LEFT} hari</strong></span>
              </div>
            </div>
          </div>

          {/* ── Glassmorphic My Rank Status Indicator Hero Card (Mobile & Tablet only to avoid desktop sidebar redundancy) ── */}
          <div className="lg:hidden rounded-2xl border border-sekkha-brand-blue/30 bg-gradient-to-r from-sekkha-brand-blue/15 via-blue-50/60 to-amber-500/10 backdrop-blur-xl p-3.5 sm:p-4 shadow-md shadow-sekkha-brand-blue/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sekkha-brand-blue text-caption-bold font-black text-white shadow-xs">
                AS
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-caption-bold font-extrabold text-sekkha-ink">Anggota Sekkha</span>
                  <span className="rounded-md bg-sekkha-brand-blue text-white px-1.5 py-0.5 text-[9px] font-black uppercase shadow-2xs">
                    Kamu
                  </span>
                </div>
                <p className="text-micro font-extrabold text-sekkha-brand-blue mt-0.5 flex items-center gap-1">
                  <TrophyIcon className="size-3.5 text-amber-500 fill-amber-400" />
                  <span>Peringkat #{myRank} dari {entries.length} Anggota</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-caption-bold font-black text-sekkha-brand-blue bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/90 shadow-2xs shrink-0 self-center">
              <ZapIcon className="size-3.5 text-amber-500 fill-amber-400 shrink-0" />
              <span>{myValue.toLocaleString("id-ID")}</span>
              <span className="text-micro font-bold text-sekkha-slate capitalize">{metricUnit}</span>
            </div>
          </div>

          {/* ── Glassmorphic Metric Filter Segmented Tabs ── */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-white/60 backdrop-blur-lg rounded-2xl border border-white/80 shadow-xs sm:flex sm:bg-transparent sm:p-0 sm:border-none sm:gap-2.5">
            {METRIC_OPTIONS.map(m => {
              const isActive = metric === m.value
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMetric(m.value)}
                  className={`flex items-center justify-center gap-1.5 sm:gap-2.5 rounded-xl sm:rounded-2xl px-2 sm:px-5 py-2 sm:py-2.5 text-micro sm:text-caption font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-sekkha-brand-blue text-white shadow-md shadow-sekkha-brand-blue/20 ring-2 ring-sekkha-brand-blue/30 scale-102"
                      : "bg-white/80 sm:bg-white/80 backdrop-blur-md text-sekkha-slate border border-white/70 hover:bg-white hover:text-sekkha-ink"
                  }`}
                >
                  {m.icon}
                  <span className="truncate">{m.label}</span>
                </button>
              )
            })}
          </div>

          {/* ── Two-Column Responsive Layout ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">

            {/* Main Content Area (Left 8 Cols) */}
            <div className="lg:col-span-8 space-y-5">
              
              {/* Glassmorphic Leaderboard Card Container */}
              <div className="rounded-3xl border border-white/70 bg-white/85 backdrop-blur-2xl p-4 sm:p-6 shadow-xl shadow-slate-200/50 ring-1 ring-black/5 space-y-5 sm:space-y-6">

                {/* Empty State when no entries found */}
                {validEntries.length === 0 ? (
                  <div className="py-12 px-4 text-center space-y-3">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 shadow-sm">
                      <TrophyIcon className="size-7" />
                    </div>
                    <div>
                      <h3 className="text-body-base font-bold text-sekkha-ink">Data Peringkat Tidak Ditemukan</h3>
                      <p className="text-caption text-sekkha-slate mt-1 max-w-sm mx-auto">
                        Belum ada data presensi atau poin anggota untuk season ini. Presensi kegiatan Vihara akan otomatis memperbarui leaderboard.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* 3D Metallic Podium for Top 3 Champions */}
                    {podium.length >= 3 && (
                      <div className="pt-2 pb-2 px-1 border-b border-sekkha-hairline-soft/80 bg-gradient-to-b from-white/60 via-slate-50/40 to-white/60 backdrop-blur-md rounded-2xl">
                        <div className="flex items-end justify-center gap-2 sm:gap-5 max-w-lg mx-auto">
                          <PodiumEntry entry={podium[1]} position={2} myId={myId} />
                          <PodiumEntry entry={podium[0]} position={1} myId={myId} />
                          <PodiumEntry entry={podium[2]} position={3} myId={myId} />
                        </div>
                      </div>
                    )}

                    {/* Partial Podium (if 1 or 2 entries exist) */}
                    {podium.length > 0 && podium.length < 3 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2 border-b border-sekkha-hairline-soft/80">
                        {podium.map((entry, idx) => (
                          <div key={entry.user_id} className="flex items-center gap-3 p-3 rounded-2xl border border-white/80 bg-white/70 backdrop-blur-md">
                            <span className="text-caption-bold font-black text-sekkha-brand-blue">#{idx + 1}</span>
                            <ListAvatar initials={entry.initials} isMe={entry.user_id === myId} />
                            <div className="min-w-0 flex-1">
                              <p className="text-caption-bold font-bold text-sekkha-ink truncate">{entry.name}</p>
                              <p className="text-micro font-bold text-sekkha-brand-blue">{entry.value.toLocaleString("id-ID")} {metricUnit}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Ranked List (Rank 4+) */}
                    {rest.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest text-sekkha-slate/70 px-1">
                          Peringkat Anggota (4+)
                        </p>
                        <ul role="list" className="space-y-2">
                          {rest.map(entry => {
                            const isMe = entry.user_id === myId
                            const hint = isMe ? getCompetitionHint(entry, validEntries, metricUnit) : null

                            return (
                              <li
                                key={entry.user_id}
                                className={`flex items-center gap-2.5 sm:gap-3.5 rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 transition-all ${
                                  isMe
                                    ? "border-2 border-sekkha-brand-blue bg-sekkha-brand-blue/15 backdrop-blur-xl shadow-lg shadow-sekkha-brand-blue/10 ring-1 ring-sekkha-brand-blue/30"
                                    : "border border-white/80 bg-white/70 backdrop-blur-md hover:bg-white/95 hover:border-sekkha-hairline hover:shadow-md"
                                }`}
                              >
                                {/* Rank Number */}
                                <span className={`w-6 sm:w-8 shrink-0 text-center text-micro-bold sm:text-caption-bold font-extrabold ${
                                  isMe ? "text-sekkha-brand-blue" : "text-sekkha-slate"
                                }`}>
                                  #{entry.rank}
                                </span>

                                {/* Avatar */}
                                <ListAvatar initials={entry.initials} isMe={isMe} />

                                {/* Name & Motivational Hint */}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <p className={`truncate text-caption-bold font-extrabold ${
                                      isMe ? "text-sekkha-brand-blue" : "text-sekkha-ink"
                                    }`}>
                                      {entry.name}
                                    </p>
                                    {isMe && (
                                      <span className="rounded-md bg-sekkha-brand-blue text-white px-1.5 py-0.5 text-[9px] font-black uppercase shrink-0 shadow-2xs">
                                        Kamu
                                      </span>
                                    )}
                                  </div>

                                  {hint && (
                                    <p className="mt-0.5 text-[10px] sm:text-micro font-extrabold text-sekkha-brand-blue flex items-center gap-1 line-clamp-1">
                                      <span>🚀</span>
                                      <span>{hint}</span>
                                    </p>
                                  )}
                                </div>

                                {/* Score Value */}
                                <div className="text-right shrink-0">
                                  <span className={`text-caption-bold font-black ${
                                    isMe ? "text-sekkha-brand-blue" : "text-sekkha-ink"
                                  }`}>
                                    {entry.value.toLocaleString("id-ID")}
                                  </span>
                                  <span className="block text-[9px] sm:text-[10px] font-medium text-sekkha-slate capitalize">
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

            {/* Right Sidebar Glassmorphic Widgets (Right 4 Cols on Desktop) */}
            <aside className="lg:col-span-4 space-y-4 sm:space-y-5">
              
              {/* Glassmorphic My Rank Sidebar Widget (Desktop only to prevent mobile duplication with top Hero Card) */}
              <div className="hidden lg:block rounded-3xl border border-sekkha-brand-blue/30 bg-gradient-to-br from-sekkha-brand-blue/10 via-white/80 to-blue-50/50 backdrop-blur-2xl p-4 sm:p-5 shadow-xl shadow-sekkha-brand-blue/5 ring-1 ring-sekkha-brand-blue/20 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sekkha-brand-blue text-caption-bold font-black text-white shadow-md">
                    {myEntry?.initials || "AS"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-caption-bold font-extrabold text-sekkha-ink truncate">
                        {myEntry?.name || "Anggota Sekkha"}
                      </span>
                      <span className="rounded-md bg-sekkha-brand-blue text-white px-1.5 py-0.5 text-[9px] font-black uppercase shrink-0">
                        Kamu
                      </span>
                    </div>
                    <p className="text-micro text-sekkha-slate font-medium">{seasonLabel(season)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-4 rounded-2xl bg-white/90 backdrop-blur-md p-3 border border-white/80 shadow-2xs">
                  <div className="text-center flex-1">
                    <p className="text-body-lg font-black text-sekkha-brand-blue">#{myRank}</p>
                    <p className="text-[10px] font-bold text-sekkha-slate">Peringkat</p>
                  </div>
                  <div className="h-7 w-px bg-sekkha-hairline" />
                  <div className="text-center flex-1">
                    <p className="text-body-lg font-black text-sekkha-ink">{myValue.toLocaleString("id-ID")}</p>
                    <p className="text-[10px] font-bold text-sekkha-slate capitalize">{metricUnit}</p>
                  </div>
                </div>
              </div>

              {/* Glassmorphic Community Goal Progress Card */}
              <div className="rounded-3xl border border-white/70 bg-white/85 backdrop-blur-2xl p-4 sm:p-5 shadow-xl shadow-slate-200/50 ring-1 ring-black/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sekkha-brand-blue/10 text-sekkha-brand-blue">
                      <UsersIcon className="size-4" aria-hidden="true" />
                    </div>
                    <h3 className="text-caption-bold font-extrabold text-sekkha-ink">{communityGoal.label}</h3>
                  </div>
                  <span className="text-micro-bold font-black text-sekkha-brand-blue bg-sekkha-brand-blue/10 px-2 py-0.5 rounded-lg">
                    {communityPct}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-micro font-bold text-sekkha-slate">
                    <span>Tercapai: {communityGoal.current}</span>
                    <span>Target: {communityGoal.target} Absensi</span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-sekkha-surface border border-sekkha-hairline-soft">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sekkha-brand-blue via-indigo-500 to-amber-400 transition-all duration-500 shadow-xs"
                      style={{ width: `${communityPct}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3 text-micro font-bold text-amber-900 flex items-start gap-2">
                  <SparklesIcon className="size-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>Jika target 500 absensi tercapai, seluruh umat Vihara akan mendapat bonus <strong className="text-amber-950">+100 Poin ekstra</strong>!</span>
                </div>
              </div>

            </aside>

          </div>

        </div>
      </div>
    </main>
  )
}
