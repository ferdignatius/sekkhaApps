// feature/profile/components/StatsHero
// Prominent stats display — rank, points, level, total events, favorite event.
// Designed to be the "pride" section for gamification — big numbers, fun colors.

import { TrophyIcon, StarIcon, ZapIcon, CalendarIcon, HeartIcon } from "lucide-react"

interface StatsHeroProps {
  rank: number
  totalPoints: number
  level: number
  levelLabel: string
  totalEvents: number
  favoriteEvent: string
}

export function StatsHero({
  rank,
  totalPoints,
  level,
  levelLabel,
  totalEvents,
  favoriteEvent,
}: StatsHeroProps) {
  return (
    <div className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-5">
      {/* Big numbers row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Rank */}
        <div className="flex flex-col items-center gap-1 rounded-xl bg-sekkha-teal-light p-4">
          <TrophyIcon className="size-5 text-sekkha-brand-blue" aria-hidden="true" />
          <p className="text-heading-3 font-semibold text-sekkha-brand-blue">#{rank}</p>
          <p className="text-caption text-sekkha-slate">Peringkat</p>
        </div>

        {/* Points */}
        <div className="flex flex-col items-center gap-1 rounded-xl bg-sekkha-surface-yellow p-4">
          <StarIcon className="size-5 text-sekkha-brand-yellow-deep" aria-hidden="true" />
          <p className="text-heading-3 font-semibold text-sekkha-ink">{totalPoints.toLocaleString("id-ID")}</p>
          <p className="text-caption text-sekkha-slate">Total Poin</p>
        </div>

        {/* Level */}
        <div className="flex flex-col items-center gap-1 rounded-xl bg-sekkha-surface p-4">
          <ZapIcon className="size-5 text-amber-500" aria-hidden="true" />
          <p className="text-heading-3 font-semibold text-sekkha-ink">Lv.{level}</p>
          <p className="text-caption text-sekkha-slate">{levelLabel}</p>
        </div>

        {/* Total events attended */}
        <div className="flex flex-col items-center gap-1 rounded-xl bg-sekkha-surface p-4">
          <CalendarIcon className="size-5 text-sekkha-brand-blue" aria-hidden="true" />
          <p className="text-heading-3 font-semibold text-sekkha-ink">{totalEvents}</p>
          <p className="text-caption text-sekkha-slate">Event Dihadiri</p>
        </div>
      </div>

      {/* Favorite event */}
      <div className="mt-4 flex items-center gap-2 rounded-lg bg-sekkha-rose-light px-4 py-2.5">
        <HeartIcon className="size-4 text-pink-500" aria-hidden="true" />
        <p className="text-body-sm text-sekkha-ink">
          Event favorit: <span className="font-medium">{favoriteEvent}</span>
        </p>
      </div>
    </div>
  )
}
