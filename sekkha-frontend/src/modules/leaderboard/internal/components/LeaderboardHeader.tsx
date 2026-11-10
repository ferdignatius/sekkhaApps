import {
  RefreshCwIcon,
  SparklesIcon,
  TimerIcon,
  TrophyIcon,
} from "lucide-react"

export interface SeasonPeriodOption {
  id: string
  key: "custom" | "semester" | "annual"
  name: string
  code?: string | null
  start_date: string
  end_date: string
  days_left: number
  target_attendance: number
  is_active: boolean
  is_custom: boolean
  description?: string | null
}

export interface SeasonSummary {
  id?: string
  name: string
  code?: string | null
  start_date: string
  end_date: string
  days_left: number
  target_attendance: number
  description?: string | null
}

export interface LeaderboardHeaderProps {
  seasonData: SeasonSummary | null
  availablePeriods: SeasonPeriodOption[]
  selectedPeriodKey: string
  onSelectPeriod: (key: string) => void
  isLoading: boolean
  onRefresh: () => void
}

/**
 * Unified compact hero header combining season metadata, countdown,
 * refresh action, and period tabs in a single cohesive card.
 */
export function LeaderboardHeader({
  seasonData,
  availablePeriods,
  selectedPeriodKey,
  onSelectPeriod,
  isLoading,
  onRefresh,
}: LeaderboardHeaderProps) {
  const dateRangeLabel =
    seasonData?.start_date && seasonData?.end_date
      ? `${new Date(seasonData.start_date).toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
        })} – ${new Date(seasonData.end_date).toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}`
      : null

  return (
    <header className="relative overflow-hidden rounded-xl bg-ink p-4 text-white shadow-md sm:p-5">
      <div className="pointer-events-none absolute -top-8 -right-8 size-36 rounded-full bg-clay-ochre/20 blur-2xl" />

      <div className="relative space-y-3">
        {/* Top Row: Trophy, Title, Countdown + Refresh */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-clay-ochre text-ink shadow-xs sm:size-11">
              <TrophyIcon className="size-5 sm:size-6" aria-hidden="true" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-bold tracking-tight text-white sm:text-xl">
                  Leaderboard
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white/90">
                  <TimerIcon
                    className="size-3 shrink-0 text-clay-ochre"
                    aria-hidden="true"
                  />
                  <span>{seasonData?.days_left ?? 14}d left</span>
                </span>
              </div>

              <p className="mt-0.5 truncate text-[11px] text-white/70 sm:text-xs">
                {dateRangeLabel ||
                  seasonData?.name ||
                  "Earn karma through verified attendance and duties."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            aria-label="Refresh leaderboard"
            title="Refresh leaderboard"
            className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-clay-ochre focus-visible:outline-none disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCwIcon
              className={`size-4 ${isLoading ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
          </button>
        </div>

        {/* Integrated Season Period Switcher */}
        {availablePeriods.length > 0 && (
          <div
            role="group"
            aria-label="Season period filter"
            className="flex scrollbar-none items-center gap-1.5 overflow-x-auto border-t border-white/10 pt-3"
          >
            {availablePeriods.map((period, idx) => {
              const isSelected =
                selectedPeriodKey === period.key ||
                selectedPeriodKey === period.id ||
                (selectedPeriodKey === "default" && idx === 0)

              return (
                <button
                  key={period.id}
                  type="button"
                  onClick={() => onSelectPeriod(period.key)}
                  aria-pressed={isSelected}
                  className={`inline-flex min-h-[36px] shrink-0 cursor-pointer items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-bold transition-colors ${
                    isSelected
                      ? "bg-white text-ink shadow-xs"
                      : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
                  }`}
                >
                  {period.is_custom && (
                    <SparklesIcon
                      className={`size-3.5 ${isSelected ? "text-clay-ochre" : "text-clay-ochre"}`}
                      aria-hidden="true"
                    />
                  )}
                  <span>{period.name}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </header>
  )
}

