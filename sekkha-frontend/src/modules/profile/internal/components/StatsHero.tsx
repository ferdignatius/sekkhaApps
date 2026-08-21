// feature/profile/components/StatsHero
// Prominent stats display — rank, total points, attended events, active streak.
// Pure points-based gamification system.

import { TrophyIcon, StarIcon, CalendarIcon, HeartIcon, FlameIcon } from "lucide-react"

interface StatsHeroProps {
  rank: number
  totalPoints: number
  totalEvents: number
  streakWeeks?: number
  favoriteEvent?: string
}

export function StatsHero({
  rank,
  totalPoints,
  totalEvents,
  streakWeeks = 1,
  favoriteEvent = "Kebaktian Minggu",
}: StatsHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-br from-sekkha-canvas/95 via-white/90 to-blue-50/30 backdrop-blur-md p-5 sm:p-6 shadow-xs transition-all hover:shadow-md">
      {/* Decorative Glow */}
      <div className="absolute -top-10 -left-10 size-36 rounded-full bg-sekkha-brand-blue/10 blur-2xl pointer-events-none" />

      {/* Big numbers row */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        {/* Total Points */}
        <div className="flex flex-col items-center gap-1 rounded-2xl bg-amber-50/80 border border-amber-200/70 p-4 shadow-2xs">
          <StarIcon className="size-5 text-amber-600" aria-hidden="true" />
          <p className="text-heading-3 font-extrabold text-amber-950">{totalPoints.toLocaleString("id-ID")}</p>
          <p className="text-caption-bold text-amber-800">Total Poin</p>
        </div>

        {/* Rank */}
        <div className="flex flex-col items-center gap-1 rounded-2xl bg-blue-50/80 border border-blue-200/70 p-4 shadow-2xs">
          <TrophyIcon className="size-5 text-sekkha-brand-blue" aria-hidden="true" />
          <p className="text-heading-3 font-extrabold text-sekkha-brand-blue">#{rank}</p>
          <p className="text-caption-bold text-blue-900">Peringkat</p>
        </div>

        {/* Total events attended */}
        <div className="flex flex-col items-center gap-1 rounded-2xl bg-indigo-50/80 border border-indigo-200/70 p-4 shadow-2xs">
          <CalendarIcon className="size-5 text-indigo-600" aria-hidden="true" />
          <p className="text-heading-3 font-extrabold text-indigo-950">{totalEvents}</p>
          <p className="text-caption-bold text-indigo-800">Event Hadir</p>
        </div>

        {/* Streak */}
        <div className="flex flex-col items-center gap-1 rounded-2xl bg-orange-50/80 border border-orange-200/70 p-4 shadow-2xs">
          <FlameIcon className="size-5 text-orange-500" aria-hidden="true" />
          <p className="text-heading-3 font-extrabold text-orange-950">{streakWeeks} Mg</p>
          <p className="text-caption-bold text-orange-800">Streak Aktif</p>
        </div>
      </div>

      {/* Favorite event row */}
      {favoriteEvent && (
        <div className="mt-3.5 flex items-center gap-2 rounded-xl bg-pink-50/70 border border-pink-200/60 px-4 py-2.5">
          <HeartIcon className="size-4 text-pink-500 shrink-0" aria-hidden="true" />
          <p className="text-body-sm text-pink-950">
            Aktivitas favorit: <span className="font-bold">{favoriteEvent}</span>
          </p>
        </div>
      )}
    </div>
  )
}

