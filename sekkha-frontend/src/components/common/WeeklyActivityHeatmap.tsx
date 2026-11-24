import { useMemo, useState } from "react"
import { CalendarDaysIcon } from "lucide-react"
import { Badge, Card } from "@/components/base"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
  activeMonth?: number // retained for API compatibility
  weeks: WeeklyActivityBucket[]
  isLoading?: boolean
  className?: string
}

const TOTAL_WEEKS = 52

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
  "bg-[#f2ede0] border-black/[0.06]",
  "bg-[#b8eae0] border-teal-700/15",
  "bg-[#6fd6c4] border-teal-700/25",
  "bg-[#1ea896] border-teal-800/30",
  "bg-[#0f766e] border-teal-900/40",
] as const

function getLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0
  if (count === 1) return 1
  if (count === 2) return 2
  if (count === 3) return 3
  return 4
}

function formatWeekRangeWithYear(startIso: string, endIso: string): string {
  const start = new Date(`${startIso}T00:00:00Z`)
  const end = new Date(`${endIso}T00:00:00Z`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${startIso} – ${endIso}`
  }
  const sMonth = MONTHS_SHORT[start.getUTCMonth()] ?? ""
  const eMonth = MONTHS_SHORT[end.getUTCMonth()] ?? ""
  const endYear = end.getUTCFullYear()
  if (sMonth === eMonth) {
    return `${sMonth} ${start.getUTCDate()}–${end.getUTCDate()}, ${endYear}`
  }
  return `${sMonth} ${start.getUTCDate()} – ${eMonth} ${end.getUTCDate()}, ${endYear}`
}

function buildFiftyTwoWeeks(
  weeks: WeeklyActivityBucket[],
  year: number
): WeeklyActivityBucket[] {
  if (weeks.length >= TOTAL_WEEKS) {
    return weeks.slice(-TOTAL_WEEKS)
  }

  const byStart = new Map(weeks.map((w) => [w.week_start, w]))
  const jan1 = new Date(Date.UTC(year, 0, 1))
  const jan1Day = jan1.getUTCDay()
  const diffToMon = jan1Day === 0 ? -6 : 1 - jan1Day
  const firstMonday = new Date(jan1.getTime() + diffToMon * 86_400_000)

  const filled: WeeklyActivityBucket[] = []
  for (let i = 0; i < TOTAL_WEEKS; i++) {
    const start = new Date(firstMonday.getTime() + i * 7 * 86_400_000)
    const end = new Date(start.getTime() + 6 * 86_400_000)
    const startIso = start.toISOString().slice(0, 10)
    const endIso = end.toISOString().slice(0, 10)
    const existing = byStart.get(startIso)
    if (existing) {
      filled.push(existing)
    } else {
      const month = start.getUTCMonth()
      filled.push({
        week_start: startIso,
        week_end: endIso,
        month,
        week_of_month: Math.ceil(start.getUTCDate() / 7),
        count: 0,
      })
    }
  }
  return filled
}

/**
 * 52-week contribution graph (13x4 grid, 1 square = 1 week).
 * Clicking any square opens an anchored popover with the week's date range and activity count.
 */
export function WeeklyActivityHeatmap({
  year,
  weeks,
  isLoading = false,
  className,
}: WeeklyActivityHeatmapProps) {
  const [openWeekKey, setOpenWeekKey] = useState<string | null>(null)

  const gridWeeks = useMemo(
    () => buildFiftyTwoWeeks(weeks, year),
    [weeks, year]
  )

  const yearTotal = useMemo(
    () => gridWeeks.reduce((sum, w) => sum + w.count, 0),
    [gridWeeks]
  )

  return (
    <Card
      variant="canvas"
      data-testid="weekly-activity-heatmap"
      className={cn(
        "border-hairline p-4 shadow-2xs sm:rounded-[20px] sm:p-5",
        className
      )}
    >
      {/* Header Summary */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-teal-50 text-clay-teal">
            <CalendarDaysIcon className="size-3.5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-ink">
              {isLoading ? (
                "Loading activity..."
              ) : (
                <>
                  <span className="font-mono font-extrabold text-clay-teal tabular-nums">
                    {yearTotal}
                  </span>{" "}
                  {yearTotal === 1 ? "activity" : "activities"} in {year}
                </>
              )}
            </p>
          </div>
        </div>

        <Badge
          variant="secondary"
          size="sm"
          className="shrink-0 px-2 py-0.5 font-mono text-[10px]"
        >
          52 Weeks
        </Badge>
      </div>

      {/* 52-Week Contribution Grid (13 columns x 4 rows) */}
      {isLoading ? (
        <div
          aria-busy="true"
          className="mt-3 grid grid-cols-13 gap-1.5 sm:gap-2"
        >
          {Array.from({ length: TOTAL_WEEKS }).map((_, idx) => (
            <div
              key={idx}
              className="aspect-square w-full animate-pulse rounded-[5px] bg-[#f2ede0] sm:rounded-[6px]"
            />
          ))}
        </div>
      ) : (
        <div
          role="group"
          aria-label={`52-week activity contribution graph for ${year}`}
          data-testid="contribution-grid-52"
          className="mt-3 grid grid-cols-13 gap-1.5 sm:gap-2"
        >
          {gridWeeks.map((wk) => {
            const level = getLevel(wk.count)
            const weekRange = formatWeekRangeWithYear(
              wk.week_start,
              wk.week_end
            )
            const key = wk.week_start
            const isOpen = openWeekKey === key

            return (
              <Popover
                key={key}
                open={isOpen}
                onOpenChange={(nextOpen) =>
                  setOpenWeekKey(nextOpen ? key : null)
                }
              >
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label={`${weekRange}: ${wk.count} ${wk.count === 1 ? "activity" : "activities"}`}
                    className={cn(
                      "aspect-square w-full cursor-pointer rounded-[5px] border transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none active:scale-95 sm:rounded-[6px]",
                      LEVEL_CLASSES[level],
                      isOpen && "ring-2 ring-ink ring-offset-1"
                    )}
                  />
                </PopoverTrigger>
                <PopoverContent
                  side="top"
                  sideOffset={6}
                  className="w-auto min-w-[170px] gap-1 rounded-[14px] border border-hairline bg-canvas px-3.5 py-2.5 text-left text-xs text-ink shadow-lg"
                >
                  <p className="font-bold text-ink">{weekRange}</p>
                  <p className="font-mono text-[11px] font-semibold text-clay-teal tabular-nums">
                    {wk.count} {wk.count === 1 ? "activity" : "activities"}
                  </p>
                </PopoverContent>
              </Popover>
            )
          })}
        </div>
      )}

      {/* Compact Intensity Legend */}
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] font-medium text-text-muted">
        <span>Less</span>
        {LEVEL_CLASSES.map((cls, idx) => (
          <span
            key={idx}
            aria-hidden="true"
            className={cn("size-2.5 rounded-[3px] border", cls)}
          />
        ))}
        <span>More</span>
      </div>
    </Card>
  )
}
