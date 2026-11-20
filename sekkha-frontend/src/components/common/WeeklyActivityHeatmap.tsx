import { useMemo, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { CalendarDaysIcon, ChevronDownIcon } from "lucide-react"
import { Badge, Card } from "@/components/base"
import { motionTokens } from "@/components/ui/activity-heatmap-utils/motion-tokens"
import { cn } from "@/lib/utils"

export interface WeeklyActivityBucket {
  week_start: string
  week_end: string
  month: number // 0..11
  week_of_month: number // 1..5
  count: number
}

export interface WeeklyActivityHeatmapProps {
  year: number
  activeMonth: number // 0..11
  weeks: WeeklyActivityBucket[]
  isLoading?: boolean
  className?: string
}

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const

const LEVEL_CLASSES = [
  "bg-[#f2ede0] border-black/[0.06] text-text-muted",
  "bg-[#b8eae0] border-teal-700/15 text-teal-950",
  "bg-[#6fd6c4] border-teal-700/25 text-teal-950",
  "bg-[#1ea896] border-teal-800/30 text-white",
  "bg-[#0f766e] border-teal-900/40 text-white",
] as const

function getLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0
  if (count === 1) return 1
  if (count === 2) return 2
  if (count === 3) return 3
  return 4
}

function formatWeekRange(startIso: string, endIso: string): string {
  const start = new Date(`${startIso}T00:00:00Z`)
  const end = new Date(`${endIso}T00:00:00Z`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${startIso} – ${endIso}`
  }
  const sMonth = MONTHS_SHORT[start.getUTCMonth()] ?? ""
  const eMonth = MONTHS_SHORT[end.getUTCMonth()] ?? ""
  if (sMonth === eMonth) {
    return `${sMonth} ${start.getUTCDate()}–${end.getUTCDate()}`
  }
  return `${sMonth} ${start.getUTCDate()} – ${eMonth} ${end.getUTCDate()}`
}

/**
 * Weekly Activity Heatmap for ProfilePage:
 * 1 box = 1 week (Event Check-ins). Defaults to the active month (4–5 weekly boxes)
 * and expands smoothly to show all 12 months of the year.
 */
export function WeeklyActivityHeatmap({
  year,
  activeMonth,
  weeks,
  isLoading = false,
  className,
}: WeeklyActivityHeatmapProps) {
  const reduced = useReducedMotion()
  const [expanded, setExpanded] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState<WeeklyActivityBucket | null>(
    null
  )

  const activeMonthWeeks = useMemo(
    () => weeks.filter((w) => w.month === activeMonth),
    [weeks, activeMonth]
  )

  const weeksByMonth = useMemo(() => {
    const grouped: WeeklyActivityBucket[][] = Array.from(
      { length: 12 },
      () => []
    )
    for (const wk of weeks) {
      if (wk.month >= 0 && wk.month < 12) {
        grouped[wk.month].push(wk)
      }
    }
    return grouped
  }, [weeks])

  const activeMonthTotal = useMemo(
    () => activeMonthWeeks.reduce((sum, w) => sum + w.count, 0),
    [activeMonthWeeks]
  )
  const yearTotal = useMemo(
    () => weeks.reduce((sum, w) => sum + w.count, 0),
    [weeks]
  )

  const activeMonthLabel = MONTHS_SHORT[activeMonth] ?? "Month"
  const displayedTotal = expanded ? yearTotal : activeMonthTotal
  const displayedPeriod = expanded
    ? String(year)
    : `${activeMonthLabel} ${year}`

  const inspectedWeek =
    selectedWeek ??
    activeMonthWeeks[activeMonthWeeks.length - 1] ??
    weeks[weeks.length - 1] ??
    null

  return (
    <Card
      variant="canvas"
      data-testid="weekly-activity-heatmap"
      className={cn(
        "border-hairline p-3.5 shadow-2xs sm:rounded-[18px] sm:p-4",
        className
      )}
    >
      {/* Compact Header Row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-teal-50 text-clay-teal">
            <CalendarDaysIcon className="size-3.5" aria-hidden="true" />
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <h2 className="truncate text-xs font-bold text-ink">
              Weekly Activity
            </h2>
            <Badge variant="secondary" size="sm" className="px-1.5 py-0 font-mono text-[10px]">
              {displayedPeriod}
            </Badge>
            <span aria-hidden="true" className="text-[11px] text-text-muted">
              ·
            </span>
            <span className="text-[11px] font-medium text-text-muted tabular-nums">
              {isLoading
                ? "Loading..."
                : `${displayedTotal} ${displayedTotal === 1 ? "check-in" : "check-ins"}`}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          className="inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-full border border-hairline bg-surface-soft px-2.5 text-[11px] font-bold text-ink transition-colors hover:bg-surface-card"
        >
          <span>{expanded ? "Active Month" : "Full Year"}</span>
          <ChevronDownIcon
            className={cn(
              "size-3 text-text-muted transition-transform duration-200",
              expanded && "rotate-180 text-ink"
            )}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Active Month View (Default: 1 box = 1 week, full-width flex row) */}
      {!expanded && (
        <div className="mt-2.5">
          <div
            role="group"
            aria-label={`Weekly check-ins for ${activeMonthLabel} ${year}`}
            className="flex w-full gap-1.5"
          >
            {activeMonthWeeks.map((wk, idx) => {
              const level = getLevel(wk.count)
              const isSelected = inspectedWeek?.week_start === wk.week_start
              const rangeLabel = formatWeekRange(wk.week_start, wk.week_end)
              return (
                <motion.button
                  key={wk.week_start}
                  type="button"
                  initial={reduced ? false : { opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: 0.18,
                    delay: reduced ? 0 : idx * 0.03,
                    ease: [...motionTokens.ease.enter],
                  }}
                  onClick={() => setSelectedWeek(wk)}
                  onMouseEnter={() => setSelectedWeek(wk)}
                  onFocus={() => setSelectedWeek(wk)}
                  aria-pressed={isSelected}
                  aria-label={`Week ${wk.week_of_month} (${rangeLabel}): ${wk.count} ${wk.count === 1 ? "check-in" : "check-ins"}`}
                  className={cn(
                    "flex h-9 min-w-0 flex-1 cursor-pointer items-center justify-center gap-1 rounded-[8px] border text-center transition-all outline-none",
                    LEVEL_CLASSES[level],
                    isSelected
                      ? "ring-1.5 ring-ink ring-offset-1"
                      : "hover:scale-[1.02]"
                  )}
                >
                  <span className="text-[10px] font-bold opacity-75">
                    W{wk.week_of_month}
                  </span>
                  <span className="font-mono text-xs font-extrabold tabular-nums">
                    {wk.count}
                  </span>
                </motion.button>
              )
            })}
          </div>
        </div>
      )}

      {/* Expanded Full-Year View: Borderless 2-Column Inline Matrix (Jan–Jun left, Jul–Dec right) */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={reduced ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reduced ? undefined : { opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [...motionTokens.ease.enter] }}
            className="overflow-hidden"
          >
            <div
              role="group"
              aria-label={`Weekly check-ins for ${year}`}
              className="mt-2.5 grid grid-flow-col grid-rows-6 gap-x-4 gap-y-1.5"
            >
              {MONTHS_SHORT.map((monthLabel, monthIdx) => {
                const monthWeeks = weeksByMonth[monthIdx] ?? []
                const isCurrentMonth = monthIdx === activeMonth
                return (
                  <div
                    key={monthLabel}
                    className="flex items-center gap-2 py-0.5"
                  >
                    <span
                      className={cn(
                        "w-7 shrink-0 text-[10px] font-bold tracking-wider uppercase",
                        isCurrentMonth
                          ? "text-clay-teal underline decoration-clay-teal/60 underline-offset-2"
                          : "text-text-muted"
                      )}
                    >
                      {monthLabel}
                    </span>
                    <div className="flex flex-1 items-center gap-1">
                      {monthWeeks.map((wk) => {
                        const level = getLevel(wk.count)
                        const isSelected =
                          inspectedWeek?.week_start === wk.week_start
                        const rangeLabel = formatWeekRange(
                          wk.week_start,
                          wk.week_end
                        )
                        return (
                          <button
                            key={wk.week_start}
                            type="button"
                            onClick={() => setSelectedWeek(wk)}
                            onMouseEnter={() => setSelectedWeek(wk)}
                            onFocus={() => setSelectedWeek(wk)}
                            aria-label={`${monthLabel} W${wk.week_of_month} (${rangeLabel}): ${wk.count} ${wk.count === 1 ? "check-in" : "check-ins"}`}
                            className={cn(
                              "h-3.5 min-w-0 flex-1 cursor-pointer rounded-[3px] border transition-transform outline-none",
                              LEVEL_CLASSES[level],
                              isSelected
                                ? "scale-105 ring-1.5 ring-ink ring-offset-1"
                                : "hover:scale-105"
                            )}
                          />
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compact Footer: Inspected Week Readout + Clay Teal Scale Legend */}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-2 text-[11px]">
        <span className="font-medium text-ink tabular-nums">
          {inspectedWeek ? (
            <>
              <span className="font-bold">
                W{inspectedWeek.week_of_month}
              </span>{" "}
              <span className="text-text-muted">
                ({formatWeekRange(inspectedWeek.week_start, inspectedWeek.week_end)})
              </span>{" "}
              ·{" "}
              <span className="font-bold text-clay-teal">
                {inspectedWeek.count}{" "}
                {inspectedWeek.count === 1 ? "check-in" : "check-ins"}
              </span>
            </>
          ) : (
            <span className="text-text-muted">Tap a week to inspect</span>
          )}
        </span>

        <span
          className="inline-flex items-center gap-1 text-[10px] font-semibold text-text-muted"
          aria-hidden="true"
        >
          <span>Less</span>
          {LEVEL_CLASSES.map((cls, idx) => (
            <span
              key={idx}
              className={cn("size-2.5 rounded-[3px] border", cls)}
            />
          ))}
          <span>More</span>
        </span>
      </div>
    </Card>
  )
}
