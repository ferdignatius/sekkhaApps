import { useState } from "react"
import {
  ArchiveIcon,
  ChevronDownIcon,
  RefreshCwIcon,
  SparklesIcon,
  TimerIcon,
  TrophyIcon,
} from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

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
  is_archived?: boolean
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
  archivedPeriods?: SeasonPeriodOption[]
  activePeriod?: SeasonPeriodOption | null
  selectedPeriodKey: string
  onSelectPeriod: (key: string) => void
  isLoading: boolean
  onRefresh: () => void
}

function formatShortRange(startIso?: string, endIso?: string): string | null {
  if (!startIso || !endIso) return null
  return `${new Date(startIso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  })} – ${new Date(endIso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`
}

/**
 * Unified compact hero header combining season metadata, countdown,
 * refresh action, active period tabs, and past seasons selector.
 */
export function LeaderboardHeader({
  seasonData,
  availablePeriods,
  archivedPeriods = [],
  activePeriod = null,
  selectedPeriodKey,
  onSelectPeriod,
  isLoading,
  onRefresh,
}: LeaderboardHeaderProps) {
  const [pastMenuOpen, setPastMenuOpen] = useState(false)

  const dateRangeLabel = formatShortRange(
    seasonData?.start_date,
    seasonData?.end_date
  )

  const selectedArchived = archivedPeriods.find(
    (p) =>
      p.id === selectedPeriodKey ||
      (p.code && p.code.toLowerCase() === selectedPeriodKey.toLowerCase())
  )
  const isArchivedView = Boolean(activePeriod?.is_archived || selectedArchived)
  const effectiveArchived =
    selectedArchived || (activePeriod?.is_archived ? activePeriod : null)

  return (
    <header className="relative overflow-hidden rounded-xl bg-ink p-4 text-white shadow-md sm:p-5">
      <div className="pointer-events-none absolute -top-8 -right-8 size-36 rounded-full bg-clay-ochre/20 blur-2xl" />

      <div className="relative space-y-3">
        {/* Top Row: Trophy, Title, Countdown / Archived Badge + Refresh */}
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
                {isArchivedView ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-clay-ochre/20 px-2.5 py-0.5 text-[11px] font-semibold text-clay-ochre">
                    <ArchiveIcon className="size-3 shrink-0" aria-hidden="true" />
                    <span>Archived Season · Final Standings</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white/90">
                    <TimerIcon
                      className="size-3 shrink-0 text-clay-ochre"
                      aria-hidden="true"
                    />
                    <span>{seasonData?.days_left ?? 14}d left</span>
                  </span>
                )}
              </div>

              <p className="mt-0.5 truncate text-[11px] text-white/70 sm:text-xs">
                {effectiveArchived ? `${effectiveArchived.name} · ` : ""}
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

        {/* Integrated Season Period Switcher + Past Seasons Selector */}
        {(availablePeriods.length > 0 || archivedPeriods.length > 0) && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
            <div
              role="group"
              aria-label="Season period filter"
              className="flex scrollbar-none items-center gap-1.5 overflow-x-auto"
            >
              {availablePeriods.map((period, idx) => {
                const isSelected =
                  !isArchivedView &&
                  (selectedPeriodKey === period.key ||
                    selectedPeriodKey === period.id ||
                    (selectedPeriodKey === "default" && idx === 0))

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
                        className="size-3.5 text-clay-ochre"
                        aria-hidden="true"
                      />
                    )}
                    <span>{period.name}</span>
                  </button>
                )
              })}
            </div>

            {archivedPeriods.length > 0 && (
              <Popover open={pastMenuOpen} onOpenChange={setPastMenuOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-expanded={pastMenuOpen}
                    className={`inline-flex min-h-[36px] shrink-0 cursor-pointer items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-bold transition-colors ${
                      isArchivedView
                        ? "bg-clay-ochre text-ink shadow-xs"
                        : "border border-white/15 bg-white/10 text-white/90 hover:bg-white/20"
                    }`}
                  >
                    <ArchiveIcon className="size-3.5" aria-hidden="true" />
                    <span>
                      {selectedArchived
                        ? selectedArchived.name
                        : "Past Seasons"}
                    </span>
                    <ChevronDownIcon className="size-3.5 opacity-80" aria-hidden="true" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="z-50 w-72 rounded-xl border border-hairline bg-canvas p-2 text-ink shadow-xl"
                >
                  <p className="px-2 py-1 text-[11px] font-bold tracking-wider text-text-muted uppercase">
                    Archived Seasons
                  </p>
                  <div className="mt-1 max-h-60 space-y-1 overflow-y-auto">
                    {archivedPeriods.map((arch) => {
                      const active =
                        selectedPeriodKey === arch.id ||
                        (arch.code &&
                          selectedPeriodKey.toLowerCase() ===
                            arch.code.toLowerCase())
                      const range = formatShortRange(arch.start_date, arch.end_date)
                      return (
                        <button
                          key={arch.id}
                          type="button"
                          onClick={() => {
                            onSelectPeriod(arch.id)
                            setPastMenuOpen(false)
                          }}
                          className={`flex w-full cursor-pointer items-start justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                            active
                              ? "bg-ink text-canvas"
                              : "hover:bg-surface-soft text-ink"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-bold">{arch.name}</p>
                            {range && (
                              <p
                                className={`mt-0.5 text-[11px] ${
                                  active ? "text-canvas/75" : "text-text-muted"
                                }`}
                              >
                                {range}
                              </p>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        )}
      </div>
    </header>
  )
}

