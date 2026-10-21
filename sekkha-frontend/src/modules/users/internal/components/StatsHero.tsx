// feature/profile/components/StatsHero
// Prominent stats display — rank, total points, attended events, active streak.
// Pure points-based gamification system.

import {
  TrophyIcon,
  StarIcon,
  CalendarIcon,
  HeartIcon,
  FlameIcon,
} from "lucide-react"

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
    <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-br from-sekkha-canvas/95 via-white/90 to-blue-50/30 p-5 shadow-xs backdrop-blur-md transition-all hover:shadow-md sm:p-6">
      {/* Decorative Glow */}
      <div className="pointer-events-none absolute -top-10 -left-10 size-36 rounded-full bg-sekkha-brand-blue/10 blur-2xl" />

      {/* Big numbers row */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        {/* Total Points */}
        <div className="flex flex-col items-center gap-1 rounded-2xl border border-amber-200/70 bg-amber-50/80 p-4 shadow-2xs">
          <StarIcon className="size-5 text-amber-600" aria-hidden="true" />
          <p className="text-heading-3 font-extrabold text-amber-950">
            {totalPoints.toLocaleString("id-ID")}
          </p>
          <p className="text-caption-bold text-amber-800">Total Poin</p>
        </div>

        {/* Rank */}
        <div className="flex flex-col items-center gap-1 rounded-2xl border border-blue-200/70 bg-blue-50/80 p-4 shadow-2xs">
          <TrophyIcon
            className="size-5 text-sekkha-brand-blue"
            aria-hidden="true"
          />
          <p className="text-heading-3 font-extrabold text-sekkha-brand-blue">
            #{rank}
          </p>
          <p className="text-caption-bold text-blue-900">Peringkat</p>
        </div>

        {/* Total events attended */}
        <div className="flex flex-col items-center gap-1 rounded-2xl border border-indigo-200/70 bg-indigo-50/80 p-4 shadow-2xs">
          <CalendarIcon className="size-5 text-indigo-600" aria-hidden="true" />
          <p className="text-heading-3 font-extrabold text-indigo-950">
            {totalEvents}
          </p>
          <p className="text-caption-bold text-indigo-800">Event Hadir</p>
        </div>

        {/* Streak */}
        <div className="flex flex-col items-center gap-1 rounded-2xl border border-orange-200/70 bg-orange-50/80 p-4 shadow-2xs">
          <FlameIcon className="size-5 text-orange-500" aria-hidden="true" />
          <p className="text-heading-3 font-extrabold text-orange-950">
            {streakWeeks} Mg
          </p>
          <p className="text-caption-bold text-orange-800">Streak Aktif</p>
        </div>
      </div>

      {/* Favorite event row */}
      {favoriteEvent && (
        <div className="mt-3.5 flex items-center gap-2 rounded-xl border border-pink-200/60 bg-pink-50/70 px-4 py-2.5">
          <HeartIcon
            className="size-4 shrink-0 text-pink-500"
            aria-hidden="true"
          />
          <p className="text-body-sm text-pink-950">
            Aktivitas favorit:{" "}
            <span className="font-bold">{favoriteEvent}</span>
          </p>
        </div>
      )}
    </div>
  )
}
