import { useMemo, useState } from "react"
import {
  ArchiveIcon,
  CheckIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  SearchIcon,
  SparklesIcon,
  TimerIcon,
  TrophyIcon,
} from "lucide-react"
import { ResponsiveFormModal } from "@/components/common/ResponsiveFormModal"

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
  const [pastSearch, setPastSearch] = useState("")
  const [selectedYear, setSelectedYear] = useState<string>("all")

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

  const archivedYears = useMemo(() => {
    const years = new Set<string>()
    for (const p of archivedPeriods) {
      const endYear = new Date(p.end_date).getUTCFullYear()
      if (!Number.isNaN(endYear)) years.add(String(endYear))
    }
    return Array.from(years).sort((a, b) => Number(b) - Number(a))
  }, [archivedPeriods])

  const filteredArchivedPeriods = useMemo(() => {
    const q = pastSearch.trim().toLowerCase()
    return archivedPeriods.filter((p) => {
      if (selectedYear !== "all") {
        const endYear = String(new Date(p.end_date).getUTCFullYear())
        if (endYear !== selectedYear) return false
      }
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        (p.code?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [archivedPeriods, pastSearch, selectedYear])

  function handleOpenPastModal(nextOpen: boolean) {
    if (nextOpen) {
      setPastSearch("")
      setSelectedYear("all")
    }
    setPastMenuOpen(nextOpen)
  }

  return (
    <header className="relative overflow-hidden rounded-2xl bg-ink p-4 text-white shadow-md sm:p-5">
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

          <div className="flex shrink-0 items-center gap-2">
            {archivedPeriods.length > 0 && (
              <button
                type="button"
                onClick={() => handleOpenPastModal(true)}
                aria-label={
                  selectedArchived
                    ? `Past Seasons: ${selectedArchived.name}`
                    : "Past Seasons"
                }
                aria-expanded={pastMenuOpen}
                className={`inline-flex min-h-10 max-w-[140px] cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors sm:max-w-[200px] sm:px-3.5 ${isArchivedView
                  ? "bg-clay-ochre text-ink shadow-xs"
                  : "border border-white/15 bg-white/10 text-white/90 hover:bg-white/20"
                  }`}
              >
                <ArchiveIcon className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate sm:hidden">
                  {selectedArchived ? selectedArchived.name : "Past"}
                </span>
                <span className="hidden truncate sm:inline">
                  {selectedArchived ? selectedArchived.name : "Past Seasons"}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              aria-label="Refresh leaderboard"
              title="Refresh leaderboard"
              className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-clay-ochre focus-visible:outline-none disabled:cursor-wait disabled:opacity-60 sm:size-11"
            >
              <RefreshCwIcon
                className={`size-4 ${isLoading ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>

        {/* Active Season Period Switcher (cleanly wraps on mobile without clipping) */}
        {availablePeriods.length > 0 && (
          <div
            role="group"
            aria-label="Season period filter"
            className="flex flex-wrap items-center gap-1.5 border-t border-white/10 pt-3"
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
                  className={`inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors sm:min-h-[38px] ${isSelected
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
        )}
      </div>

      {/* Responsive Past Seasons Browser (Bottom Sheet on mobile, Dialog on desktop) */}
      {archivedPeriods.length > 0 && (
        <ResponsiveFormModal
          open={pastMenuOpen}
          onOpenChange={handleOpenPastModal}
          title="Past Seasons"
          description="Browse archived seasons by year or name to view final standings."
          maxWidth="max-w-md"
        >
          <div className="space-y-3 text-left font-sans">
            {isArchivedView && availablePeriods.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  onSelectPeriod(availablePeriods[0].key)
                  setPastMenuOpen(false)
                }}
                className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-hairline bg-surface-soft px-3 py-2 text-xs font-bold text-ink transition-colors hover:bg-surface-card"
              >
                <RotateCcwIcon className="size-3.5 text-clay-teal" aria-hidden="true" />
                <span>Back to Current Season ({availablePeriods[0].name})</span>
              </button>
            )}

            {/* Search Input */}
            <div className="relative">
              <SearchIcon
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted"
                aria-hidden="true"
              />
              <input
                type="search"
                value={pastSearch}
                onChange={(e) => setPastSearch(e.target.value)}
                placeholder="Search past seasons..."
                aria-label="Search past seasons"
                className="h-10 w-full rounded-xl border border-hairline bg-canvas pr-3 pl-9 text-xs text-ink outline-none placeholder:text-text-muted/70 focus:border-ink focus:ring-1 focus:ring-ink sm:text-sm"
              />
            </div>

            {/* Year Filter Pills */}
            {archivedYears.length > 1 && (
              <div
                role="group"
                aria-label="Filter past seasons by year"
                className="scrollbar-none flex flex-nowrap gap-1.5 overflow-x-auto pb-0.5"
              >
                <button
                  type="button"
                  aria-pressed={selectedYear === "all"}
                  onClick={() => setSelectedYear("all")}
                  className={`shrink-0 cursor-pointer rounded-full px-3 py-1 text-xs font-bold transition-colors ${selectedYear === "all"
                    ? "bg-ink text-canvas"
                    : "border border-hairline bg-canvas text-text-muted hover:text-ink"
                    }`}
                >
                  All ({archivedPeriods.length})
                </button>
                {archivedYears.map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    aria-pressed={selectedYear === yr}
                    onClick={() => setSelectedYear(yr)}
                    className={`shrink-0 cursor-pointer rounded-full px-3 py-1 font-mono text-xs font-bold transition-colors ${selectedYear === yr
                      ? "bg-ink text-canvas"
                      : "border border-hairline bg-canvas text-text-muted hover:text-ink"
                      }`}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            )}

            {/* Filtered Seasons List */}
            <div className="max-h-[50vh] space-y-1.5 overflow-y-auto pr-0.5">
              {filteredArchivedPeriods.length === 0 ? (
                <p className="rounded-xl border border-dashed border-hairline py-6 text-center text-xs text-text-muted">
                  No archived seasons match &ldquo;{pastSearch}&rdquo;.
                </p>
              ) : (
                filteredArchivedPeriods.map((arch) => {
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
                      className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-xs transition-colors ${active
                        ? "border-ink bg-ink text-canvas"
                        : "border-hairline bg-canvas text-ink hover:bg-surface-soft"
                        }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold">{arch.name}</p>
                        {range && (
                          <p
                            className={`mt-0.5 text-[11px] ${active ? "text-canvas/75" : "text-text-muted"
                              }`}
                          >
                            {range}
                          </p>
                        )}
                      </div>
                      {active && (
                        <CheckIcon className="size-4 shrink-0 text-clay-ochre" aria-hidden="true" />
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </ResponsiveFormModal>
      )}
    </header>
  )
}

